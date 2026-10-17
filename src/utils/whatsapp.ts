import type { Order } from '../types/order';

export function buildWhatsappLink(phone: string, message: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildOrderStatusMessage(order: Order): string {
  const lines = [
  `Hi ${order.shipping.fullName}, this is Desiraluxe.`,
  `Order ${order.reference} status: payment ${order.paymentState.replace('_', ' ')}, fulfillment ${order.fulfillmentState.replace('_', ' ')}.`,
  `Amount: PKR ${order.total.toLocaleString('en-US')}`];

  if (order.tracking?.carrier) lines.push(`Carrier: ${order.tracking.carrier}${order.tracking.trackingId ? ` (${order.tracking.trackingId})` : ''}`);
  lines.push('Use the private tracking link sent at checkout, or reply here with questions.');
  lines.push('Thank you for shopping with Desiraluxe.');
  return lines.join('\n');
}