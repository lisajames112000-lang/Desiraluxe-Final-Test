import { createHash, randomBytes } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '../../../../types/vercel.js';
import { adminDb, requireAdmin } from '../../../../services/firebase/adminServer.js';
import { requireMethod, serverErrorMessage, setPrivateHeaders } from '../../../../services/server/http.js';
import type { PaymentState } from '../../../../types/order.js';

const schema = z.object({
  amount: z.number().int().positive().max(1_000_000_000),
  note: z.string().trim().min(2).max(1000),
  reference: z.string().trim().min(2).max(180),
  requestId: z.string().uuid(),
  expectedUpdatedAt: z.string().datetime()
}).strict();

export default async function handler(request: VercelRequest, response: VercelResponse) {
  setPrivateHeaders(response);
  if (!requireMethod(request, response, 'POST')) return;
  try {
    const admin = await requireAdmin(request.headers.authorization);
    const input = schema.parse(request.body);
    const id = String(request.query.id || '');
    const db = adminDb();
    const ledgerId = createHash('sha256').update(`${id}:${input.requestId}`).digest('hex');
    let committedUpdatedAt = '';

    await db.runTransaction(async (transaction) => {
      const orderRef = db.collection('orders').doc(id);
      const ledgerRef = db.collection('refundLedger').doc(ledgerId);
      const [orderSnapshot, existingLedger] = await Promise.all([transaction.get(orderRef), transaction.get(ledgerRef)]);
      if (!orderSnapshot.exists) throw new Error('NOT_FOUND');
      if (existingLedger.exists) {
        committedUpdatedAt = String(existingLedger.data()?.orderUpdatedAt || input.expectedUpdatedAt);
        return;
      }
      const order = orderSnapshot.data() as {total?: number;currency?: string;paymentState?: PaymentState;refundAmount?: number;updatedAt?: string;auditLog?: unknown[];};
      if (order.updatedAt !== input.expectedUpdatedAt) throw new Error('CONFLICT');
      if (order.paymentState !== 'refund_required') throw new Error('REFUND_STATE');
      const total = Number(order.total || 0);
      const alreadyRefunded = Number(order.refundAmount || 0);
      if (!Number.isSafeInteger(total) || input.amount > total - alreadyRefunded) throw new Error('REFUND_AMOUNT');
      const cumulative = alreadyRefunded + input.amount;
      const now = new Date().toISOString();
      committedUpdatedAt = now;
      const nextPaymentState: PaymentState = cumulative === total ? 'refunded' : 'refund_required';
      const entry = { id: ledgerId, amount: input.amount, currency: 'PKR', reference: input.reference, note: input.note, actor: admin.uid, at: now };

      transaction.update(orderRef, {
        refundAmount: cumulative,
        paymentState: nextPaymentState,
        updatedAt: now,
        serverUpdatedAt: FieldValue.serverTimestamp(),
        auditLog: [...(order.auditLog || []), { id: randomBytes(12).toString('hex'), at: now, actor: admin.uid, action: `Refund recorded: PKR ${input.amount}`, details: `${input.reference} — ${input.note}` }]
      });
      transaction.create(ledgerRef, { ...entry, orderId: id, requestId: input.requestId, orderUpdatedAt: now, createdAt: FieldValue.serverTimestamp() });
      transaction.set(db.collection('auditLogs').doc(), { actor: admin.uid, action: 'order_refund_recorded', entityId: id, ledgerId, amount: input.amount, currency: 'PKR', createdAt: FieldValue.serverTimestamp() });
    });

    return response.status(200).json({ saved: true, id, updatedAt: committedUpdatedAt });
  } catch (error) {
    if (error instanceof z.ZodError) return response.status(400).json({ error: 'Refund amount, reference, note, or request identity is invalid.' });
    const code = error instanceof Error ? error.message : '';
    if (code === 'NOT_FOUND') return response.status(404).json({ error: 'Order not found.' });
    if (code === 'CONFLICT') return response.status(409).json({ error: 'This order changed in another session. Review it before recording the refund.' });
    if (code === 'REFUND_STATE') return response.status(409).json({ error: 'Move the payment state to refund required before recording a refund.' });
    if (code === 'REFUND_AMOUNT') return response.status(409).json({ error: 'The refund exceeds the order amount remaining to be refunded.' });
    const failure = serverErrorMessage(error);
    return response.status(failure.status).json({ error: failure.message });
  }
}