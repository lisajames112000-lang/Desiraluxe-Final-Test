import { randomBytes } from 'node:crypto';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { releaseOrderInventory, type ReleasableOrder } from './releaseOrderInventory.js';

export interface ExpiryResult {
  processed: number;
  expired: number;
  blocked: number;
}

/**
 * Cancels unpaid reservations whose review deadline has passed and returns their stock.
 * Each order is re-checked inside its own transaction, so running this from several
 * places at once (daily cron and checkout) can never release the same stock twice.
 */
export async function expireOverdueReservations(db: Firestore, maxOrders: number): Promise<ExpiryResult> {
  const now = new Date();
  const candidates = await db.collection('orders').
  where('paymentState', '==', 'awaiting_proof').
  where('reviewDeadline', '<=', now.toISOString()).
  limit(maxOrders).
  get();
  let expired = 0;
  let blocked = 0;
  for (const candidate of candidates.docs) {
    try {
      const changed = await db.runTransaction(async (transaction) => {
        const currentSnapshot = await transaction.get(candidate.ref);
        if (!currentSnapshot.exists) return false;
        const current = currentSnapshot.data() as ReleasableOrder & {reviewDeadline?: string;};
        if (current.paymentState !== 'awaiting_proof' || current.fulfillmentState !== 'pending' || !current.reviewDeadline || Date.parse(current.reviewDeadline) > Date.now()) return false;
        await releaseOrderInventory(db, transaction, candidate.id, current, 'reservation-expiry', 'reservation_expired');
        const updatedAt = new Date().toISOString();
        transaction.update(candidate.ref, {
          paymentState: 'rejected',
          fulfillmentState: 'cancelled',
          expiredAt: updatedAt,
          updatedAt,
          serverUpdatedAt: FieldValue.serverTimestamp(),
          auditLog: [...(current.auditLog || []), { id: randomBytes(12).toString('hex'), at: updatedAt, actor: 'reservation-expiry', action: 'Unpaid reservation expired — inventory released' }]
        });
        return true;
      });
      if (changed) expired += 1;
    } catch (error) {
      if (error instanceof Error && error.message === 'INVENTORY_RESTORE_BLOCKED') blocked += 1;else
      throw error;
    }
  }
  return { processed: candidates.size, expired, blocked };
}