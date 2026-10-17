import type { FulfillmentState, OrderItem, PaymentState, TrackingInfo } from './order';

export interface PublicOrder {
  id: string;
  reference: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  currency: 'PKR';
  shipping: {fullName: string;city: string;country: string;};
  paymentState: PaymentState;
  reviewDeadline: string;
  fulfillmentState: FulfillmentState;
  tracking?: TrackingInfo | null;
  createdAt: string;
  updatedAt: string;
}