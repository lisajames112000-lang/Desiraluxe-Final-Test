import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '../../../types/vercel.js';
import { adminDb, requireAdmin } from '../../../services/firebase/adminServer.js';
import { requireMethod, serverErrorMessage, setPrivateHeaders } from '../../../services/server/http.js';

const schema = z.object({ id: z.string().min(1).max(120).regex(/^[A-Za-z0-9_-]+$/) }).strict();

export default async function handler(request: VercelRequest, response: VercelResponse) {
  setPrivateHeaders(response);
  if (!requireMethod(request, response, 'POST')) return;
  try {
    await requireAdmin(request.headers.authorization);
    const { id } = schema.parse(request.body);
    const snapshot = await adminDb().collection('productPrivate').doc(id).get();
    const value = snapshot.data()?.costPrice;
    const costPrice = Number.isSafeInteger(value) && value >= 0 ? Number(value) : null;
    return response.status(200).json({ id, costPrice });
  } catch (error) {
    if (error instanceof z.ZodError) return response.status(400).json({ error: 'Product id is invalid.' });
    const failure = serverErrorMessage(error);
    return response.status(failure.status).json({ error: failure.message });
  }
}