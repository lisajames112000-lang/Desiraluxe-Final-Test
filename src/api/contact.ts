import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '../types/vercel.js';
import { adminDb } from '../services/firebase/adminServer.js';
import { allowOrigin, enforceRateLimit, hashIdentifier, requestIp, requireMethod, serverErrorMessage, setPrivateHeaders } from '../services/server/http.js';

const schema = z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(240), subject: z.string().trim().min(2).max(180), message: z.string().trim().min(10).max(4000), company: z.string().max(0).optional() }).strict();

export default async function handler(request: VercelRequest, response: VercelResponse) {
  setPrivateHeaders(response);
  if (!requireMethod(request, response, 'POST')) return;
  if (!allowOrigin(request)) return response.status(403).json({ error: 'Request origin is not allowed.' });
  try {
    if (JSON.stringify(request.body || {}).length > 10_000) return response.status(413).json({ error: 'Message is too large.' });
    const input = schema.parse(request.body);
    await enforceRateLimit(`contact:${hashIdentifier(requestIp(request))}`, 5, 60 * 60);
    const record = await adminDb().collection('contactMessages').add({ name: input.name, email: input.email, subject: input.subject, message: input.message, status: 'new', createdAt: FieldValue.serverTimestamp(), updatedAt: new Date().toISOString(), serverUpdatedAt: FieldValue.serverTimestamp() });
    return response.status(201).json({ recorded: true, id: record.id });
  } catch (error) {
    if (error instanceof z.ZodError) return response.status(400).json({ error: 'Check the highlighted contact details and message.' });
    const failure = serverErrorMessage(error);
    return response.status(failure.status).json({ error: failure.message });
  }
}