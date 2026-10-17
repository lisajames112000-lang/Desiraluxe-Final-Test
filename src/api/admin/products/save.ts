import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '../../../types/vercel.js';
import { adminDb, requireAdmin } from '../../../services/firebase/adminServer.js';
import { requireMethod, serverErrorMessage, setPrivateHeaders } from '../../../services/server/http.js';
import { syncMediaReferences } from '../../../services/server/mediaAssociations.js';
import { safeMediaUrlSchema } from '../../../utils/mediaUrl.js';

const safeString = (maximum: number) => z.string().trim().max(maximum);
const variant = z.object({ id: safeString(120).min(1), label: safeString(180).min(1), optionValues: z.record(safeString(120), safeString(180)), sku: safeString(120).min(1), stock: z.number().int().min(0).max(1000000), priceOverride: z.number().int().min(0).max(1000000000).optional() }).strict();
const productSchema = z.object({
  id: safeString(120).min(1), name: safeString(180).min(1), slug: safeString(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), sku: safeString(120).min(1), categorySlugs: z.array(safeString(180)).min(1).max(20), description: safeString(10000), price: z.number().int().min(0).max(1000000000), compareAtPrice: z.number().int().min(0).max(1000000000).optional(), costPrice: z.number().int().min(0).max(1000000000).nullable().optional(), currency: z.literal('PKR'), stock: z.number().int().min(0).max(1000000), variantOptions: z.array(z.object({ name: safeString(120), values: z.array(safeString(180)).max(100) }).strict()).max(10), variants: z.array(variant).max(500), specifications: z.array(z.object({ label: safeString(180), value: safeString(1000) }).strict()).max(200), images: z.array(safeMediaUrlSchema).max(30), videoUrl: safeMediaUrlSchema.optional(), seoTitle: safeString(180), seoDescription: safeString(320), isFeatured: z.boolean(), isNewArrival: z.boolean(), isSample: z.boolean(), isPublished: z.boolean(), isVerified: z.boolean(), createdAt: z.string().datetime(), updatedAt: z.string().datetime()
}).strict().superRefine((product, context) => {
  if (product.compareAtPrice !== undefined && product.compareAtPrice <= product.price) context.addIssue({ code: z.ZodIssueCode.custom, path: ['compareAtPrice'], message: 'Compare-at price must exceed price.' });
  if (product.variants.length && product.stock !== product.variants.reduce((sum, item) => sum + item.stock, 0)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['stock'], message: 'Stock must equal the sum of variant stock.' });
  if (new Set(product.variants.map((item) => item.sku.toLowerCase())).size !== product.variants.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['variants'], message: 'Variant SKUs must be unique.' });
  if (product.isPublished && (product.isSample || !product.isVerified || !product.images[0])) context.addIssue({ code: z.ZodIssueCode.custom, path: ['isPublished'], message: 'Published products must be verified, non-sample, and have media.' });
});
const schema = z.object({ product: productSchema, expectedUpdatedAt: z.string().datetime().optional() }).strict();

function key(value: string) {return value.trim().toLowerCase();}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  setPrivateHeaders(response);
  if (!requireMethod(request, response, 'POST')) return;
  try {
    const admin = await requireAdmin(request.headers.authorization);
    const { product, expectedUpdatedAt } = schema.parse(request.body);
    const db = adminDb();
    let committedUpdatedAt = '';
    await db.runTransaction(async (transaction) => {
      const productRef = db.collection('products').doc(product.id);
      const privateRef = db.collection('productPrivate').doc(product.id);
      const slugRef = db.collection('uniqueKeys').doc(`product-slug:${key(product.slug)}`);
      const skuRef = db.collection('uniqueKeys').doc(`product-sku:${key(product.sku)}`);
      const categoryRefs = product.categorySlugs.map((slug) => db.collection('categories').where('slug', '==', slug).limit(1));
      const [current, privateSnapshot, slugReservation, skuReservation, ...categorySnapshots] = await Promise.all([
      transaction.get(productRef), transaction.get(privateRef), transaction.get(slugRef), transaction.get(skuRef), ...categoryRefs.map((categoryQuery) => transaction.get(categoryQuery))]
      );
      if (current.exists && !expectedUpdatedAt) throw new Error('CREATE_EXISTS');
      if (!current.exists && expectedUpdatedAt) throw new Error('NOT_FOUND');
      if (expectedUpdatedAt && current.data()?.updatedAt !== expectedUpdatedAt) throw new Error('CONFLICT');
      if (slugReservation.exists && slugReservation.data()?.entityId !== product.id) throw new Error('SLUG_CONFLICT');
      if (skuReservation.exists && skuReservation.data()?.entityId !== product.id) throw new Error('SKU_CONFLICT');
      if (categorySnapshots.some((snapshot) => snapshot.empty)) throw new Error('CATEGORY_MISSING');
      const previous = current.data();
      const previousMedia = [...(Array.isArray(previous?.images) ? previous.images : []), ...(typeof previous?.videoUrl === 'string' ? [previous.videoUrl] : [])];
      const nextMedia = [...product.images, ...(product.videoUrl ? [product.videoUrl] : [])];
      await syncMediaReferences(db, transaction, `products/${product.id}`, previousMedia, nextMedia);
      const { costPrice, ...publicProduct } = product;
      const now = new Date().toISOString();
      committedUpdatedAt = now;
      transaction.set(productRef, { ...publicProduct, createdAt: previous?.createdAt || publicProduct.createdAt, updatedAt: now, serverUpdatedAt: FieldValue.serverTimestamp() });
      if (!current.exists || costPrice !== undefined) {
        transaction.set(privateRef, { productId: product.id, costPrice: costPrice ?? null, updatedAt: FieldValue.serverTimestamp() }, { merge: privateSnapshot.exists });
      }
      transaction.set(slugRef, { kind: 'productSlug', value: product.slug, entityId: product.id, updatedAt: FieldValue.serverTimestamp() });
      transaction.set(skuRef, { kind: 'productSku', value: product.sku, entityId: product.id, updatedAt: FieldValue.serverTimestamp() });
      if (previous && key(previous.slug) !== key(product.slug)) transaction.delete(db.collection('uniqueKeys').doc(`product-slug:${key(previous.slug)}`));
      if (previous && key(previous.sku) !== key(product.sku)) transaction.delete(db.collection('uniqueKeys').doc(`product-sku:${key(previous.sku)}`));
      transaction.set(db.collection('auditLogs').doc(), { actor: admin.uid, action: current.exists ? 'product_updated' : 'product_created', entityId: product.id, createdAt: FieldValue.serverTimestamp() });
    });
    return response.status(200).json({ saved: true, id: product.id, updatedAt: committedUpdatedAt });
  } catch (error) {
    if (error instanceof z.ZodError) return response.status(400).json({ error: error.issues[0]?.message || 'Product data is invalid.' });
    const code = error instanceof Error ? error.message : '';
    if (code === 'CREATE_EXISTS') return response.status(409).json({ error: 'A product with this id already exists. Reload it instead of creating over it.' });
    if (code === 'NOT_FOUND') return response.status(404).json({ error: 'The product no longer exists.' });
    if (code === 'CONFLICT') return response.status(409).json({ error: 'This product changed in another session. Review the latest version and retry.' });
    if (code === 'SLUG_CONFLICT') return response.status(409).json({ error: 'Another product already uses this slug.' });
    if (code === 'SKU_CONFLICT') return response.status(409).json({ error: 'Another product already uses this SKU.' });
    if (code === 'CATEGORY_MISSING') return response.status(409).json({ error: 'One or more selected categories no longer exist.' });
    if (code === 'MEDIA_NOT_READY') return response.status(409).json({ error: 'One or more managed media files are not verified and ready.' });
    const failure = serverErrorMessage(error);
    return response.status(failure.status).json({ error: failure.message });
  }
}