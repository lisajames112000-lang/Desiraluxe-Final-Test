import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '../../../types/vercel.js';
import { adminDb, requireAdmin } from '../../../services/firebase/adminServer.js';
import { brandSettingsSchema } from '../../../services/server/adminContentSchemas.js';
import { requireMethod, serverErrorMessage, setPrivateHeaders } from '../../../services/server/http.js';
import { syncMediaReferences } from '../../../services/server/mediaAssociations.js';

const schema = z.object({ settings: brandSettingsSchema, expectedUpdatedAt: z.string().datetime().optional() }).strict();

export default async function handler(request: VercelRequest, response: VercelResponse) {
  setPrivateHeaders(response);
  if (!requireMethod(request, response, 'POST')) return;
  try {
    const admin = await requireAdmin(request.headers.authorization);
    const input = schema.parse(request.body);
    const db = adminDb();
    let committedUpdatedAt = '';
    await db.runTransaction(async (transaction) => {
      const ref = db.collection('siteSettings').doc('public');
      const current = await transaction.get(ref);
      if (current.exists && !input.expectedUpdatedAt) throw new Error('REVISION_REQUIRED');
      if (input.expectedUpdatedAt && current.exists && current.data()?.updatedAt !== input.expectedUpdatedAt) throw new Error('CONFLICT');
      const previousLogo = typeof current.data()?.logoUrl === 'string' ? [current.data()!.logoUrl] : [];
      const nextLogo = input.settings.logoUrl ? [input.settings.logoUrl] : [];
      await syncMediaReferences(db, transaction, 'siteSettings/public', previousLogo, nextLogo);
      const now = new Date().toISOString();
      committedUpdatedAt = now;
      transaction.set(ref, { ...input.settings, updatedAt: now, serverUpdatedAt: FieldValue.serverTimestamp() });
      transaction.set(db.collection('auditLogs').doc(), { actor: admin.uid, action: 'site_settings_updated', entityId: 'public', createdAt: FieldValue.serverTimestamp() });
    });
    return response.status(200).json({ saved: true, id: 'public', updatedAt: committedUpdatedAt });
  } catch (error) {
    if (error instanceof z.ZodError) return response.status(400).json({ error: error.issues[0]?.message || 'Store settings are invalid.' });
    if (error instanceof Error && error.message === 'REVISION_REQUIRED') return response.status(409).json({ error: 'Reload store settings before saving this draft.' });
    if (error instanceof Error && error.message === 'CONFLICT') return response.status(409).json({ error: 'Store settings changed in another session. Review the latest version and retry.' });
    if (error instanceof Error && error.message === 'MEDIA_NOT_READY') return response.status(409).json({ error: 'The managed logo is not verified and ready.' });
    const failure = serverErrorMessage(error);
    return response.status(failure.status).json({ error: failure.message });
  }
}