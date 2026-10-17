import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '../../../../types/vercel.js';
import { adminDb, requireAdmin } from '../../../../services/firebase/adminServer.js';
import { requireMethod, serverErrorMessage, setPrivateHeaders } from '../../../../services/server/http.js';

const schema = z.object({ status: z.enum(['new', 'in_progress', 'resolved']) }).strict();

export default async function handler(request: VercelRequest, response: VercelResponse) {
  setPrivateHeaders(response);
  if (!requireMethod(request, response, 'POST')) return;
  try {
    const admin = await requireAdmin(request.headers.authorization);
    const id = Array.isArray(request.query.id) ? request.query.id[0] : request.query.id;
    if (!id || !/^[A-Za-z0-9_-]{1,120}$/.test(id)) return response.status(400).json({ error: 'Enquiry id is invalid.' });
    const { status } = schema.parse(request.body);
    const db = adminDb();
    let committedUpdatedAt = '';
    await db.runTransaction(async (transaction) => {
      const ref = db.collection('contactMessages').doc(id);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new Error('NOT_FOUND');
      committedUpdatedAt = new Date().toISOString();
      transaction.update(ref, { status, updatedAt: committedUpdatedAt, serverUpdatedAt: FieldValue.serverTimestamp() });
      transaction.set(db.collection('auditLogs').doc(), { actor: admin.uid, action: 'enquiry_status_updated', entityId: id, status, createdAt: FieldValue.serverTimestamp() });
    });
    return response.status(200).json({ saved: true, id, updatedAt: committedUpdatedAt });
  } catch (error) {
    if (error instanceof z.ZodError) return response.status(400).json({ error: 'Enquiry status is invalid.' });
    if (error instanceof Error && error.message === 'NOT_FOUND') return response.status(404).json({ error: 'Enquiry not found.' });
    const failure = serverErrorMessage(error);
    return response.status(failure.status).json({ error: failure.message });
  }
}