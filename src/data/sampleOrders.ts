import type { Order } from '../types/order';

// Clearly labelled sample records used to populate admin reporting.
export const sampleOrders: Order[] = [
{
  id: 'order_sample_001',
  reference: 'DLX-SAMPLE-1001',
  accessToken: 'samplePreviewAccessA1',
  items: [{ productId: 'prod_emerald-structured-tote', name: 'Emerald Structured Tote', slug: 'emerald-structured-tote', image: '', sku: 'DLX-BAG-001', unitPrice: 17800, quantity: 1 }],
  subtotal: 17800, shippingFee: 0, discount: 0, total: 17800, currency: 'PKR',
  shipping: { fullName: 'Sample Customer', whatsapp: '+92 300 000 0000', address: 'Sample address', city: 'Lahore', country: 'Pakistan' },
  payment: { methodId: 'preview', methodType: null, methodLabel: 'Preview — no payment', transactionReference: 'TEST-ONLY', submittedAt: '2026-10-08T10:00:00.000Z' },
  paymentState: 'under_review', reviewDeadline: '2026-10-08T10:30:00.000Z', fulfillmentState: 'pending',
  isSampleOrder: true, createdAt: '2026-10-08T10:00:00.000Z', updatedAt: '2026-10-08T10:00:00.000Z',
  auditLog: [{ id: 'audit_s1', at: '2026-10-08T10:00:00.000Z', actor: 'Preview system', action: 'Sample order created' }]
},
{
  id: 'order_sample_002',
  reference: 'DLX-SAMPLE-1002',
  accessToken: 'samplePreviewAccessB2',
  items: [{ productId: 'prod_sculpted-ceramic-vase', name: 'Sculpted Ceramic Vase', slug: 'sculpted-ceramic-vase', image: '', sku: 'DLX-HOM-001', unitPrice: 4800, quantity: 2 }],
  subtotal: 9600, shippingFee: 500, discount: 0, total: 10100, currency: 'PKR',
  shipping: { fullName: 'Demo Buyer', whatsapp: '+92 300 000 0000', address: 'Sample address', city: 'Karachi', country: 'Pakistan' },
  payment: { methodId: 'preview', methodType: null, methodLabel: 'Preview — no payment', transactionReference: 'TEST-ONLY', submittedAt: '2026-10-06T12:00:00.000Z' },
  paymentState: 'approved', reviewDeadline: '2026-10-06T12:30:00.000Z', fulfillmentState: 'delivered',
  tracking: { carrier: 'Sample carrier', trackingId: 'NOT-A-REAL-TRACKING-ID', statusNote: 'Sample order delivered', updatedAt: '2026-10-07T12:00:00.000Z' },
  contactedViaWhatsapp: false, isSampleOrder: true, createdAt: '2026-10-06T12:00:00.000Z', updatedAt: '2026-10-07T12:00:00.000Z',
  auditLog: [{ id: 'audit_s2', at: '2026-10-06T12:00:00.000Z', actor: 'Preview system', action: 'Sample order created' }, { id: 'audit_s3', at: '2026-10-07T12:00:00.000Z', actor: 'Preview system', action: 'Marked sample as delivered' }]
}];