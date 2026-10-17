import { createHash } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '../../../types/vercel.js';
import { adminDb, requireAdmin } from '../../../services/firebase/adminServer.js';
import { requireMethod, serverErrorMessage, setPrivateHeaders } from '../../../services/server/http.js';

const schema = z.object({ label: z.string().trim().min(2).max(100) }).strict();

export default async function handler(request: VercelRequest, response: VercelResponse) {
  setPrivateHeaders(response);
  if (!requireMethod(request, response, 'POST')) return;
  try {
    const admin = await requireAdmin(request.headers.authorization);
    const input = schema.parse(request.body);
    const db = adminDb();
    const dayKey = new Date().toISOString().slice(0, 10);
    const id = createHash('sha256').update(`${admin.uid}:${dayKey}:${input.label}`).digest('hex').slice(0, 32);
    const ref = db.collection('accountingPeriods').doc(id);
    await db.runTransaction(async (transaction) => {
      if ((await transaction.get(ref)).exists) return;
      const openPeriods = await db.collection('accountingPeriods').where('endedAt', '==', null).get();
      const now = new Date().toISOString();
      openPeriods.docs.forEach((period) => transaction.update(period.ref, { endedAt: now, updatedAt: FieldValue.serverTimestamp() }));
      transaction.set(ref, { id, label: input.label, startedAt: now, endedAt: null, createdBy: admin.uid, createdAt: FieldValue.serverTimestamp() });
    });
    return response.status(201).json({ id });
  } catch (error) {
    if (error instanceof z.ZodError) return response.status(400).json({ error: 'Enter an accounting period label.' });
    const failure = serverErrorMessage(error);
    return response.status(failure.status).json({ error: failure.message });
  }
}