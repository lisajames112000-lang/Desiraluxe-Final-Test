import { createHash } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '../../types/vercel.js';
import { adminDb } from '../../services/firebase/adminServer.js';
import { allowOrigin, enforceRateLimit, hashIdentifier, requestIp, requireMethod, serverErrorMessage, setPrivateHeaders } from '../../services/server/http.js';

const schema = z.object({ token: z.string().min(32).max(200) }).strict();

export default async function handler(request: VercelRequest, response: VercelResponse) {
  setPrivateHeaders(response);
  if (!requireMethod(request, response, 'POST')) return;
  if (!allowOrigin(request)) return response.status(403).json({ error: 'Request origin is not allowed.' });
  try {
    const { token } = schema.parse(request.body);
    await enforceRateLimit(`tracking:${hashIdentifier(requestIp(request))}`, 30, 60 * 60);
    const db = adminDb();
    const accessRef = db.collection('orderAccess').doc(createHash('sha256').update(token).digest('hex'));
    const access = await accessRef.get();
    const orderId = access.data()?.orderId;
    if (!access.exists || typeof orderId !== 'string') return response.status(404).json({ error: 'No order was found for this access token.' });
    const order = await db.collection('orders').doc(orderId).get();
    if (!order.exists) return response.status(404).json({ error: 'This order is no longer available.' });
    await accessRef.set({ lastUsedAt: FieldValue.serverTimestamp() }, { merge: true });
    const data = order.data() || {};
    return response.status(200).json({
      id: order.id, reference: data.reference, items: data.items, subtotal: data.subtotal, shippingFee: data.shippingFee, discount: data.discount, total: data.total, currency: data.currency,
      shipping: { fullName: data.shipping?.fullName, city: data.shipping?.city, country: data.shipping?.country },
      paymentState: data.paymentState, reviewDeadline: data.reviewDeadline, fulfillmentState: data.fulfillmentState, tracking: data.tracking || null, createdAt: data.createdAt, updatedAt: data.updatedAt
    });
  } catch (error) {
    if (error instanceof z.ZodError) return response.status(400).json({ error: 'Enter the complete order access token.' });
    const failure = serverErrorMessage(error);
    return response.status(failure.status).json({ error: failure.message });
  }
}