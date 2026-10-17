import { createHash, randomBytes } from 'node:crypto';
import { FieldValue, type DocumentData, type DocumentReference } from 'firebase-admin/firestore';
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '../../types/vercel.js';
import { adminDb } from '../../services/firebase/adminServer.js';
import { expireOverdueReservations } from '../../services/server/expireOrders.js';
import { allowOrigin, enforceRateLimit, hashIdentifier, requestIp, requireMethod, serverErrorMessage, setPrivateHeaders } from '../../services/server/http.js';
import { syncMediaReferences } from '../../services/server/mediaAssociations.js';

import { receiptBelongsToCheckout } from '../../services/server/receiptPolicy.js';

// Small enough to keep checkout fast; the daily cron handles any larger backlog.
const CHECKOUT_EXPIRY_BATCH = 10;

const itemSchema = z.object({ productId: z.string().min(1).max(120), variantId: z.string().min(1).max(120).optional(), quantity: z.number().int().min(1).max(99) }).strict();
const schema = z.object({
  idempotencyKey: z.string().min(20).max(120),
  items: z.array(itemSchema).min(1).max(50),
  paymentMethodId: z.string().min(1).max(120),
  transactionReference: z.string().trim().max(160).optional().default(''),
  receiptId: z.string().regex(/^[a-f0-9]{32}$/),
  receiptOwnerToken: z.string().min(32).max(200),
  shipping: z.object({ fullName: z.string().trim().min(2).max(120), whatsapp: z.string().trim().regex(/^\+\d[\d\s-]{7,20}$/), address: z.string().trim().min(8).max(500), city: z.string().trim().min(2).max(120), country: z.literal('Pakistan'), postalCode: z.string().trim().max(30).optional(), note: z.string().trim().max(800).optional() }).strict()
}).strict();

function tokenHash(token: string): string {return createHash('sha256').update(token).digest('hex');}
function requestFingerprint(input: z.infer<typeof schema>, items: Array<{productId: string;variantId?: string;quantity: number;}>): string {
  const canonical = {
    items: items.slice().sort((left, right) => `${left.productId}:${left.variantId || ''}`.localeCompare(`${right.productId}:${right.variantId || ''}`)),
    paymentMethodId: input.paymentMethodId,
    transactionReference: input.transactionReference,
    receiptId: input.receiptId, receiptOwnerToken: input.receiptOwnerToken,
    shipping: {
      fullName: input.shipping.fullName,
      whatsapp: input.shipping.whatsapp,
      address: input.shipping.address,
      city: input.shipping.city,
      country: input.shipping.country,
      postalCode: input.shipping.postalCode || '',
      note: input.shipping.note || ''
    }
  };
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  setPrivateHeaders(response);
  if (!requireMethod(request, response, 'POST')) return;
  if (!allowOrigin(request)) return response.status(403).json({ error: 'Request origin is not allowed.' });
  try {
    if (JSON.stringify(request.body || {}).length > 40_000) return response.status(413).json({ error: 'Checkout request is too large.' });
    const input = schema.parse(request.body);
    const grouped = new Map<string, {productId: string;variantId?: string;quantity: number;}>();
    input.items.forEach((item) => {const key = `${item.productId}:${item.variantId || 'default'}`;const current = grouped.get(key);grouped.set(key, { ...item, quantity: (current?.quantity || 0) + item.quantity });});
    const requestedItems = Array.from(grouped.values());
    if (requestedItems.some((item) => item.quantity > 99)) return response.status(400).json({ error: 'An item quantity exceeds the checkout limit.' });
    const fingerprint = requestFingerprint(input, requestedItems);
    const requestedByProduct = Array.from(requestedItems.reduce((map, item) => {
      const lines = map.get(item.productId) || [];
      lines.push(item);
      map.set(item.productId, lines);
      return map;
    }, new Map<string, typeof requestedItems>()).entries());
    await enforceRateLimit(`checkout:${hashIdentifier(requestIp(request))}`, 12, 60 * 60);
    const db = adminDb();
    // Release stock held by overdue unpaid orders before reserving new stock. Best effort:
    // a failure here must never block a customer's checkout.
    await expireOverdueReservations(db, CHECKOUT_EXPIRY_BATCH).catch(() => undefined);
    const idempotencyRef = db.collection('uniqueKeys').doc(`checkout-${createHash('sha256').update(input.idempotencyKey).digest('hex')}`);
    const existing = await idempotencyRef.get();
    if (existing.exists) {
      if (existing.data()?.fingerprint !== fingerprint) return response.status(409).json({ error: 'This checkout retry key was already used for different order details. Review the cart and submit again.' });
      return response.status(200).json(existing.data()?.response);
    }

    const accessToken = randomBytes(32).toString('base64url');
    const accessRef = db.collection('orderAccess').doc(tokenHash(accessToken));
    const orderRef = db.collection('orders').doc();
    const counterRef = db.collection('system').doc('orderCounter');
    const methodRef = db.collection('paymentMethodsPublic').doc(input.paymentMethodId);
    const settingsRef = db.collection('siteSettings').doc('public');
    const receiptRef = db.collection('paymentReceipts').doc(input.receiptId);
    const productRefs = requestedByProduct.map(([productId]) => db.collection('products').doc(productId));

    const result = await db.runTransaction(async (transaction) => {
      const [repeated, receiptSnapshot, methodSnapshot, settingsSnapshot, counterSnapshot, ...productSnapshots] = await Promise.all([
      transaction.get(idempotencyRef), transaction.get(receiptRef), transaction.get(methodRef), transaction.get(settingsRef), transaction.get(counterRef), ...productRefs.map((ref) => transaction.get(ref))]
      );
      if (repeated.exists) {
        if (repeated.data()?.fingerprint !== fingerprint) throw new Error('IDEMPOTENCY_MISMATCH');
        return repeated.data()?.response as Record<string, unknown>;
      }
      if (!receiptBelongsToCheckout(receiptSnapshot.data(), input.receiptOwnerToken)) throw new Error('RECEIPT_INVALID');
      const method = methodSnapshot.data();
      if (!methodSnapshot.exists || method?.enabled !== true || !method.accountTitle || !method.accountNumber || !method.instructions) throw new Error('PAYMENT_UNAVAILABLE');

      let subtotal = 0;
      const orderItems: Array<Record<string, unknown>> = [];
      const inventoryWrites: Array<{ref: DocumentReference;patch: DocumentData;}> = [];
      requestedByProduct.forEach(([, requestedLines], index) => {
        const snapshot = productSnapshots[index];
        const product = snapshot.data();
        if (!snapshot.exists || product?.isPublished !== true || product?.isVerified !== true || product?.isSample === true) throw new Error('PRODUCT_UNAVAILABLE');
        const originalVariants = Array.isArray(product.variants) ? product.variants as Array<Record<string, unknown>> : [];
        let nextVariants = originalVariants.map((variant) => ({ ...variant }));
        let parentStock = Number(product.stock);
        requestedLines.forEach((requested) => {
          const variant = requested.variantId ? nextVariants.find((candidate) => candidate.id === requested.variantId) : undefined;
          if (nextVariants.length && !variant) throw new Error('VARIANT_UNAVAILABLE');
          const stock = Number(variant?.stock ?? parentStock);
          const price = Number(variant?.priceOverride ?? product.price);
          if (!Number.isSafeInteger(stock) || stock < requested.quantity || !Number.isSafeInteger(price) || price < 0) throw new Error('STOCK_UNAVAILABLE');
          subtotal += price * requested.quantity;
          orderItems.push({ productId: snapshot.id, name: product.name, slug: product.slug, image: Array.isArray(product.images) ? product.images[0] || '' : '', sku: variant?.sku || product.sku, variantId: variant?.id || null, variantLabel: variant?.label || null, unitPrice: price, quantity: requested.quantity });
          if (variant) nextVariants = nextVariants.map((candidate) => candidate.id === variant.id ? { ...candidate, stock: stock - requested.quantity } : candidate);else
          parentStock = stock - requested.quantity;
        });
        const nextStock = nextVariants.length ? nextVariants.reduce((sum, candidate) => sum + Number(candidate.stock || 0), 0) : parentStock;
        inventoryWrites.push({ ref: snapshot.ref, patch: { ...(nextVariants.length ? { variants: nextVariants } : {}), stock: nextStock, updatedAt: new Date().toISOString(), serverUpdatedAt: FieldValue.serverTimestamp() } });
      });

      const settings = settingsSnapshot.data() || {};
      const freeThreshold = Number.isSafeInteger(settings.freeShippingThreshold) ? Number(settings.freeShippingThreshold) : 10000;
      const shippingFee = subtotal >= freeThreshold ? 0 : Number.isSafeInteger(settings.shippingFee) ? Number(settings.shippingFee) : 500;
      const sequence = Number(counterSnapshot.data()?.value || 0) + 1;
      const now = new Date();
      const reference = `DLX-${now.getUTCFullYear()}-${String(sequence).padStart(7, '0')}`;
      const order = {
        id: orderRef.id, reference, items: orderItems, productIds: Array.from(new Set(orderItems.map((item) => item.productId))), subtotal, shippingFee, discount: 0, total: subtotal + shippingFee, currency: 'PKR', shipping: input.shipping,
        payment: { methodId: methodSnapshot.id, methodType: method.type || null, methodLabel: method.label, receiptId: input.receiptId, transactionReference: input.transactionReference, submittedAt: now.toISOString(), instructionSnapshot: { accountTitle: method.accountTitle, accountNumber: method.accountNumber, instructions: method.instructions, qrImage: method.qrImage || null, cryptoAsset: method.cryptoAsset || null, cryptoNetwork: method.cryptoNetwork || null } },
        paymentState: 'under_review', reviewDeadline: new Date(now.getTime() + Number(settings.reviewCountdownMinutes || 30) * 60_000).toISOString(), fulfillmentState: 'pending', isSampleOrder: false, createdAt: now.toISOString(), updatedAt: now.toISOString(),
        auditLog: [{ id: randomBytes(12).toString('hex'), at: now.toISOString(), actor: 'checkout', action: 'Order created through trusted checkout' }]
      };
      const safeResponse = { order: { id: order.id, reference, total: order.total, currency: order.currency }, accessToken };
      const historicalMedia = [...orderItems.map((item) => String(item.image || '')).filter(Boolean), typeof method.qrImage === 'string' ? method.qrImage : ''].filter(Boolean);
      await syncMediaReferences(db, transaction, `orders/${order.id}`, [], historicalMedia);
      inventoryWrites.forEach(({ ref, patch }) => transaction.update(ref, patch));
      transaction.update(receiptRef, { orderId: order.id, associatedAt: now.toISOString() });
      transaction.set(orderRef, order);
      transaction.set(accessRef, { orderId: order.id, createdAt: FieldValue.serverTimestamp(), lastUsedAt: null });
      transaction.set(counterRef, { value: sequence, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      transaction.set(idempotencyRef, { kind: 'checkout', fingerprint, response: safeResponse, orderId: order.id, createdAt: FieldValue.serverTimestamp() });
      orderItems.forEach((item) => transaction.set(db.collection('inventoryMovements').doc(), { orderId: order.id, productId: item.productId, variantId: item.variantId, quantity: -Number(item.quantity), reason: 'order_created', idempotencyKey: input.idempotencyKey, createdAt: FieldValue.serverTimestamp() }));
      return safeResponse;
    });
    return response.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) return response.status(400).json({ error: 'Checkout details are invalid or incomplete.' });
    const code = error instanceof Error ? error.message : '';
    if (code === 'RECEIPT_INVALID') return response.status(409).json({ error: 'Upload and verify your own receipt image before placing the order. Select the image again if it expired.' });
    if (code === 'PAYMENT_UNAVAILABLE') return response.status(409).json({ error: 'The selected payment method is no longer available.' });
    if (code === 'IDEMPOTENCY_MISMATCH') return response.status(409).json({ error: 'This checkout retry key was already used for different order details. Review the cart and submit again.' });
    if (['PRODUCT_UNAVAILABLE', 'VARIANT_UNAVAILABLE', 'STOCK_UNAVAILABLE'].includes(code)) return response.status(409).json({ error: 'One or more cart items changed or are unavailable. Review the cart and retry.' });
    const failure = serverErrorMessage(error);
    return response.status(failure.status).json({ error: failure.message });
  }
}