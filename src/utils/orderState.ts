import type { FulfillmentState, PaymentState } from '../types/order';

export const paymentTransitions: Record<PaymentState, PaymentState[]> = {
  awaiting_proof: ['under_review', 'rejected'],
  under_review: ['approved', 'rejected'],
  approved: ['refund_required'],
  rejected: ['under_review'],
  refund_required: ['refunded'],
  refunded: []
};

export const fulfillmentTransitions: Record<FulfillmentState, FulfillmentState[]> = {
  pending: ['processing', 'cancelled'],
  processing: ['dispatched', 'cancelled'],
  dispatched: ['in_transit', 'delivered'],
  in_transit: ['delivered'],
  delivered: [],
  cancelled: []
};

export function canTransitionPayment(from: PaymentState, to: PaymentState): boolean {
  return from === to || paymentTransitions[from].includes(to);
}

export function canTransitionFulfillment(from: FulfillmentState, to: FulfillmentState): boolean {
  return from === to || fulfillmentTransitions[from].includes(to);
}