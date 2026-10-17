import { describe, expect, it } from 'vitest';
import { canTransitionFulfillment, canTransitionPayment } from './orderState';

describe('order state transitions', () => {
  it('allows configured payment transitions and idempotency', () => {
    expect(canTransitionPayment('under_review', 'approved')).toBe(true);
    expect(canTransitionPayment('approved', 'approved')).toBe(true);
    expect(canTransitionPayment('approved', 'under_review')).toBe(false);
  });

  it('prevents terminal fulfillment states moving backwards', () => {
    expect(canTransitionFulfillment('processing', 'dispatched')).toBe(true);
    expect(canTransitionFulfillment('delivered', 'processing')).toBe(false);
    expect(canTransitionFulfillment('cancelled', 'pending')).toBe(false);
  });
});