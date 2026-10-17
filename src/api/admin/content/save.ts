import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '../../../types/vercel.js';
import { adminDb, requireAdmin } from '../../../services/firebase/adminServer.js';
import { categorySchema, cmsPageSchema, contentResourceSchema, parseContentItem } from '../../../services/server/adminContentSchemas.js';
import { requireMethod, serverErrorMessage, setPrivateHeaders } from '../../../services/server/http.js';
import { contentMediaUrls, syncMediaReferences } from '../../../services/server/mediaAssociations.js';

const schema = z.object({
  resource: contentResourceSchema,
  item: z.unknown(),
  expectedUpdatedAt: z.string().datetime().optional()
}).strict();

function key(value: string) {return value.trim().toLowerCase();}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  setPrivateHeaders(response);
  if (!requireMethod(request, response, 'POST')) return;
  try {
    const admin = await requireAdmin(request.headers.authorization);
    const input = schema.parse(request.body);
    const item = parseContentItem(input.resource, input.item);
    const db = adminDb();
    let committedUpdatedAt = '';
    await db.runTransaction(async (transaction) => {
      const ref = db.collection(input.resource).doc(item.id);
      const current = await transaction.get(ref);
      if (current.exists && !input.expectedUpdatedAt) throw new Error('CREATE_EXISTS');
      if (!current.exists && input.expectedUpdatedAt) throw new Error('NOT_FOUND');
      if (input.expectedUpdatedAt && current.data()?.updatedAt !== input.expectedUpdatedAt) throw new Error('CONFLICT');

      if (input.resource === 'categories') {
        const category = item as z.infer<typeof categorySchema>;
        const categories = await transaction.get(db.collection('categories').limit(500));
        if (current.exists && current.data()?.slug !== category.slug) throw new Error('CATEGORY_SLUG_IMMUTABLE');
        if (categories.docs.some((entry) => entry.id !== category.id && key(String(entry.data().slug)) === key(category.slug))) throw new Error('SLUG_CONFLICT');
        if (category.parentSlug && !categories.docs.some((entry) => key(String(entry.data().slug)) === key(category.parentSlug!))) throw new Error('PARENT_MISSING');
        let cursor = category.parentSlug;
        const seen = new Set([category.slug]);
        while (cursor) {
          if (seen.has(cursor)) throw new Error('CATEGORY_CYCLE');
          seen.add(cursor);
          const parent = categories.docs.find((entry) => entry.data().slug === cursor)?.data();
          cursor = typeof parent?.parentSlug === 'string' ? parent.parentSlug : undefined;
        }
      }

      if (input.resource === 'cmsPages') {
        const page = item as z.infer<typeof cmsPageSchema>;
        const duplicate = await transaction.get(db.collection('cmsPages').where('slug', '==', page.slug).limit(2));
        if (duplicate.docs.some((entry) => entry.id !== page.id)) throw new Error('SLUG_CONFLICT');
        if (current.exists && current.data()?.isSystem === true && current.data()?.slug !== page.slug) throw new Error('SYSTEM_PAGE_SLUG');
        if (current.exists && current.data()?.isSystem === true && page.isSystem !== true) throw new Error('SYSTEM_PAGE_IDENTITY');
      }

      await syncMediaReferences(db, transaction, `${input.resource}/${item.id}`, contentMediaUrls(input.resource, current.data()), contentMediaUrls(input.resource, item));
      const now = new Date().toISOString();
      committedUpdatedAt = now;
      transaction.set(ref, { ...item, updatedAt: now, serverUpdatedAt: FieldValue.serverTimestamp() });
      transaction.set(db.collection('auditLogs').doc(), {
        actor: admin.uid,
        action: `${input.resource}_${current.exists ? 'updated' : 'created'}`,
        entityId: item.id,
        createdAt: FieldValue.serverTimestamp()
      });
    });
    return response.status(200).json({ saved: true, id: item.id, updatedAt: committedUpdatedAt });
  } catch (error) {
    if (error instanceof z.ZodError) return response.status(400).json({ error: error.issues[0]?.message || 'Content data is invalid.' });
    const code = error instanceof Error ? error.message : '';
    if (code === 'CREATE_EXISTS') return response.status(409).json({ error: 'A record with this id already exists. Reload it instead of creating over it.' });
    if (code === 'NOT_FOUND') return response.status(404).json({ error: 'The record no longer exists.' });
    if (code === 'CONFLICT') return response.status(409).json({ error: 'This record changed in another session. Review the latest version and retry.' });
    if (code === 'SLUG_CONFLICT') return response.status(409).json({ error: 'Another record already uses this slug.' });
    if (code === 'CATEGORY_SLUG_IMMUTABLE') return response.status(409).json({ error: 'Existing category slugs are stable identifiers and cannot be renamed. Create a new category and deliberately reassign references instead.' });
    if (code === 'PARENT_MISSING') return response.status(409).json({ error: 'The selected parent category no longer exists.' });
    if (code === 'CATEGORY_CYCLE') return response.status(409).json({ error: 'That parent relationship would create a category cycle.' });
    if (code === 'SYSTEM_PAGE_SLUG') return response.status(409).json({ error: 'System page slugs cannot be changed.' });
    if (code === 'SYSTEM_PAGE_IDENTITY') return response.status(409).json({ error: 'System page identity cannot be removed.' });
    if (code === 'MEDIA_NOT_READY') return response.status(409).json({ error: 'Managed media must be verified before it can be associated with this record.' });
    const failure = serverErrorMessage(error);
    return response.status(failure.status).json({ error: failure.message });
  }
}