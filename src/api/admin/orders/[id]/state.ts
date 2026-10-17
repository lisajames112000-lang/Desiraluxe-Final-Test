import { randomBytes } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '../../../../types/vercel.js';
import { adminDb, requireAdmin } from '../../../../services/firebase/adminServer.js';
import { requireMethod, serverErrorMessage, setPrivateHeaders } from '../../../../services/server/http.js';
import { releaseOrderInventory } from '../../../../services/server/releaseOrderInventory.js';
import { canTransitionFulfillment, canTransitionPayment } from '../../../../utils/orderState.js';
import type { FulfillmentState, PaymentState } from '../../../../types/order.js';

const schema = z.object({ paymentState: z.enum(['awaiting_proof', 'under_review', 'approved', 'rejected', 'refund_required', 'refunded']).optional(), fulfillmentState: z.enum(['pending', 'processing', 'dispatched', 'in_transit', 'delivered', 'cancelled']).optional() }).strict().refine((value) => value.paymentState || value.fulfillmentState);

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
      const current = snapshot.data() as {paymentState: PaymentState;fulfillmentState: FulfillmentState;auditLog?: unknown[];items?: Array<{productId: string;variantId?: string;quantity: number;}>;};
      if (input.paymentState && !canTransitionPayment(current.paymentState, input.paymentState)) throw new Error('INVALID_TRANSITION');
      if (input.fulfillmentState && !canTransitionFulfillment(current.fulfillmentState, input.fulfillmentState)) throw new Error('INVALID_TRANSITION');
      const nextFulfillment = input.fulfillmentState || current.fulfillmentState;
      const cancelling = current.fulfillmentState !== 'cancelled' && nextFulfillment === 'cancelled';
      const nextPayment: PaymentState = input.paymentState || (cancelling && current.paymentState === 'approved' ? 'refund_required' : current.paymentState);
      if (nextPayment === 'refunded' && current.paymentState !== 'refunded') throw new Error('REFUND_RECORD_REQUIRED');
      if (['dispatched', 'in_transit', 'delivered'].includes(nextFulfillment) && nextPayment !== 'approved') throw new Error('CROSS_STATE_INVALID');
      if (cancelling) await releaseOrderInventory(db, transaction, id, current, admin.uid, 'order_cancelled');
      const now = new Date().toISOString();
      committedUpdatedAt = now;
      transaction.update(ref, { paymentState: nextPayment, fulfillmentState: nextFulfillment, updatedAt: now, serverUpdatedAt: FieldValue.serverTimestamp(), auditLog: [...(current.auditLog || []), { id: randomBytes(12).toString('hex'), at: now, actor: admin.uid, action: `State updated: ${nextPayment} / ${nextFulfillment}${cancelling ? ' — inventory released' : ''}` }] });
    });
    return response.status(200).json({ saved: true, id, updatedAt: committedUpdatedAt });
  } catch (error) {
    if (error instanceof z.ZodError) return response.status(400).json({ error: 'The requested state change is invalid.' });
    const code = error instanceof Error ? error.message : '';
    if (code === 'NOT_FOUND') return response.status(404).json({ error: 'Order not found.' });
    if (code === 'INVALID_TRANSITION') return response.status(409).json({ error: 'That order transition is not allowed.' });
    if (code === 'CROSS_STATE_INVALID') return response.status(409).json({ error: 'Dispatch and delivery require approved payment under the current manual-payment policy.' });
    if (code === 'REFUND_RECORD_REQUIRED') return response.status(409).json({ error: 'Record the confirmed refund amount and reference instead of changing directly to refunded.' });
    if (code === 'INVENTORY_RESTORE_BLOCKED') return response.status(409).json({ error: 'Cancellation was blocked because an ordered product or variant can no longer be restored safely.' });
    const failure = serverErrorMessage(error);
    return response.status(failure.status).json({ error: failure.message });
  }
}