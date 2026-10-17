import { randomBytes } from 'node:crypto';
import { FieldValue, type DocumentData } from 'firebase-admin/firestore';
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '../../../../types/vercel.js';
import { adminDb, requireAdmin } from '../../../../services/firebase/adminServer.js';
import { requireMethod, serverErrorMessage, setPrivateHeaders } from '../../../../services/server/http.js';

const trackingSchema = z.object({
  carrier: z.string().trim().max(120).optional(),
  trackingId: z.string().trim().min(1).max(180),
  trackingUrl: z.string().trim().url().or(z.literal('')).optional(),
  statusNote: z.string().trim().max(1000).optional()
}).strict();

const schema = z.object({
  internalNotes: z.string().max(5000).optional(),
  contactedViaWhatsapp: z.boolean().optional(),
  tracking: trackingSchema.optional(),
  expectedUpdatedAt: z.string().datetime()
}).strict().refine((value) => value.internalNotes !== undefined || value.contactedViaWhatsapp !== undefined || value.tracking !== undefined);

export default async function handler(request: VercelRequest, response: VercelResponse) {
  setPrivateHeaders(response);
  if (!requireMethod(request, response, 'POST')) return;
  try {
    const admin = await requireAdmin(request.headers.authorization);
    const input = schema.parse(request.body);
    const id = String(request.query.id || '');
    const db = adminDb();
    let committedUpdatedAt = '';
    await db.runTransaction(async (transaction) => {
      const ref = db.collection('orders').doc(id);
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) throw new Error('NOT_FOUND');
      const current = snapshot.data() as {updatedAt?: string;auditLog?: unknown[];};
      if (current.updatedAt && current.updatedAt !== input.expectedUpdatedAt) throw new Error('CONFLICT');
      const now = new Date().toISOString();
      committedUpdatedAt = now;
      const patch: DocumentData = { updatedAt: now, serverUpdatedAt: FieldValue.serverTimestamp() };
      const changes: string[] = [];
      if (input.internalNotes !== undefined) {patch.internalNotes = input.internalNotes;changes.push('internal notes');}
      if (input.contactedViaWhatsapp !== undefined) {patch.contactedViaWhatsapp = input.contactedViaWhatsapp;changes.push('contact marker');}
      if (input.tracking) {patch.tracking = { ...input.tracking, updatedAt: now };changes.push('tracking');}
      patch.auditLog = [...(current.auditLog || []), { id: randomBytes(12).toString('hex'), at: now, actor: admin.uid, action: `Updated ${changes.join(', ')}` }];
      transaction.update(ref, patch);
    });
    return response.status(200).json({ saved: true, id, updatedAt: committedUpdatedAt });
  } catch (error) {
    if (error instanceof z.ZodError) return response.status(400).json({ error: 'Order update details are invalid.' });
    const code = error instanceof Error ? error.message : '';
    if (code === 'NOT_FOUND') return response.status(404).json({ error: 'Order not found.' });
    if (code === 'CONFLICT') return response.status(409).json({ error: 'This order changed in another session. Review the latest values and retry.' });
    const failure = serverErrorMessage(error);
    return response.status(failure.status).json({ error: failure.message });
  }
}