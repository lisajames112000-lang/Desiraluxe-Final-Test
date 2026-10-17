import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '../../../types/vercel.js';
import { adminDb, requireAdmin } from '../../../services/firebase/adminServer.js';
import { contentResourceSchema } from '../../../services/server/adminContentSchemas.js';
import { requireMethod, serverErrorMessage, setPrivateHeaders } from '../../../services/server/http.js';
import { contentMediaUrls, syncMediaReferences } from '../../../services/server/mediaAssociations.js';

const schema = z.object({ resource: contentResourceSchema, id: z.string().min(1).max(120).regex(/^[A-Za-z0-9_-]+$/) }).strict();

export default async function handler(request: VercelRequest, response: VercelResponse) {
  setPrivateHeaders(response);
  if (!requireMethod(request, response, 'POST')) return;
  try {
    const admin = await requireAdmin(request.headers.authorization);
    const input = schema.parse(request.body);
    const db = adminDb();
    await db.runTransaction(async (transaction) => {
      const ref = db.collection(input.resource).doc(input.id);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new Error('NOT_FOUND');
      const record = snapshot.data()!;
      if (input.resource === 'cmsPages' && record.isSystem === true) throw new Error('SYSTEM_PAGE');
      if (input.resource === 'categories') {
        const [products, children] = await Promise.all([
        transaction.get(db.collection('products').where('categorySlugs', 'array-contains', record.slug).limit(1)),
        transaction.get(db.collection('categories').where('parentSlug', '==', record.slug).limit(1))]
        );
        if (!products.empty) throw new Error('CATEGORY_PRODUCTS');
        if (!children.empty) throw new Error('CATEGORY_CHILDREN');
      }
      await syncMediaReferences(db, transaction, `${input.resource}/${input.id}`, contentMediaUrls(input.resource, record), []);
      transaction.delete(ref);
      transaction.set(db.collection('auditLogs').doc(), { actor: admin.uid, action: `${input.resource}_deleted`, entityId: input.id, createdAt: FieldValue.serverTimestamp() });
    });
    return response.status(200).json({ deleted: true, id: input.id });
  } catch (error) {
    if (error instanceof z.ZodError) return response.status(400).json({ error: 'Content deletion request is invalid.' });
    const code = error instanceof Error ? error.message : '';
    if (code === 'NOT_FOUND') return response.status(404).json({ error: 'The record no longer exists.' });
    if (code === 'SYSTEM_PAGE') return response.status(409).json({ error: 'System pages cannot be deleted.' });
    if (code === 'CATEGORY_PRODUCTS') return response.status(409).json({ error: 'Products still reference this category. Reassign them before deletion.' });
    if (code === 'CATEGORY_CHILDREN') return response.status(409).json({ error: 'Child categories still reference this category. Reassign them before deletion.' });
    const failure = serverErrorMessage(error);
    return response.status(failure.status).json({ error: failure.message });
  }
}