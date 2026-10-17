// Order, payment, and fulfillment domain types.

export type PaymentState =
'awaiting_proof' |
'under_review' |
'approved' |
'rejected' |
'refund_required' |
'refunded';

export type FulfillmentState =
'pending' |
'processing' |
'dispatched' |
'in_transit' |
'delivered' |
'cancelled';

export type PaymentMethodType =
'jazzcash' |
'easypaisa' |
'payoneer' |
'paypal' |
'bank_transfer' |
'crypto';

export interface OrderItem {
  productId: string;
  variantId?: string;
  name: string;
  slug: string;
  image: string;
  sku: string;
  variantLabel?: string;
  unitPrice: number;
  quantity: number;
}

export interface ShippingDetails {
  fullName: string;
  whatsapp: string;
  address: string;
  city: string;
  postalCode?: string;
  country: string;
  note?: string;
}

export interface PaymentSubmission {
  methodId: string;
  methodType: PaymentMethodType | null;
  methodLabel: string;
  transactionReference: string;
  submittedAt: string;
}

export interface TrackingInfo {
  carrier?: string;
  trackingId?: string;
  trackingUrl?: string;
  statusNote?: string;
  updatedAt?: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  details?: string;
}

export interface RefundRecord {
  id: string;
  orderId: string;
  amount: number;
  currency: 'PKR';
  reference: string;
  note: string;
  actor: string;
  at: string;
}

export interface Order {
  id: string;
  reference: string;
  accessToken?: string;
  items: OrderItem[];
  productIds?: string[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  currency: 'PKR';
  shipping: ShippingDetails;
  payment: PaymentSubmission;
  paymentState: PaymentState;
  reviewDeadline: string;
  fulfillmentState: FulfillmentState;
  tracking?: TrackingInfo;
  refundAmount?: number;
  internalNotes?: string;
  contactedViaWhatsapp?: boolean;
  isSampleOrder: boolean;
  createdAt: string;
  updatedAt: string;
  auditLog: AuditEntry[];
}