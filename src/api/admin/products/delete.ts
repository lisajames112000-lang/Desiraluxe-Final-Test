import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '../../../types/vercel.js';
import { adminDb, requireAdmin } from '../../../services/firebase/adminServer.js';
import { requireMethod, serverErrorMessage, setPrivateHeaders } from '../../../services/server/http.js';
import { syncMediaReferences } from '../../../services/server/mediaAssociations.js';

const schema = z.object({ id: z.string().min(1).max(120) }).strict();
function key(value: string) {return value.trim().toLowerCase();}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  setPrivateHeaders(response);
  if (!requireMethod(request, response, 'POST')) return;
  try {
    const admin = await requireAdmin(request.headers.authorization);
    const { id } = schema.parse(request.body);
    const db = adminDb();
    const references = await db.collection('orders').where('productIds', 'array-contains', id).limit(1).get();
    if (!references.empty) return response.status(409).json({ error: 'This product is referenced by an order. Archive it instead.' });
    // Preserve deletion protection for owner data created before productIds was added.
    const legacyReferences = await db.collection('orders').get();
    if (legacyReferences.docs.some((entry) => !Array.isArray(entry.data().productIds) && Array.isArray(entry.data().items) && entry.data().items.some((item: {productId?: string;}) => item.productId === id))) return response.status(409).json({ error: 'This product is referenced by an order. Archive it instead.' });
    await db.runTransaction(async (transaction) => {
      const ref = db.collection('products').doc(id);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new Error('NOT_FOUND');
      const product = snapshot.data()!;
      const media = [...(Array.isArray(product.images) ? product.images : []), ...(typeof product.videoUrl === 'string' ? [product.videoUrl] : [])];
      await syncMediaReferences(db, transaction, `products/${id}`, media, []);
      transaction.delete(ref);
      transaction.delete(db.collection('productPrivate').doc(id));
      transaction.delete(db.collection('uniqueKeys').doc(`product-slug:${key(product.slug)}`));
      transaction.delete(db.collection('uniqueKeys').doc(`product-sku:${key(product.sku)}`));
      transaction.set(db.collection('auditLogs').doc(), { actor: admin.uid, action: 'product_deleted', entityId: id, createdAt: FieldValue.serverTimestamp() });
    });
    return response.status(200).json({ deleted: true, id });
  } catch (error) {
    if (error instanceof z.ZodError) return response.status(400).json({ error: 'Product deletion request is invalid.' });
    if (error instanceof Error && error.message === 'NOT_FOUND') return response.status(404).json({ error: 'Product not found.' });
    const failure = serverErrorMessage(error);
    return response.status(failure.status).json({ error: failure.message });
  }
}