import { randomBytes } from 'node:crypto';
import { FieldValue, type Firestore, type Transaction } from 'firebase-admin/firestore';
import type { FulfillmentState, PaymentState } from '../../types/order.js';

export interface ReleasableOrder {
  paymentState: PaymentState;
  fulfillmentState: FulfillmentState;
  auditLog?: unknown[];
  items?: Array<{productId: string;variantId?: string;quantity: number;}>;
}

export async function releaseOrderInventory(
db: Firestore,
transaction: Transaction,
orderId: string,
order: ReleasableOrder,
actor: string,
reason: 'order_cancelled' | 'reservation_expired')
: Promise<void> {
  const productIds = Array.from(new Set((order.items || []).map((item) => item.productId)));
  const productSnapshots = await Promise.all(productIds.map((productId) => transaction.get(db.collection('products').doc(productId))));
  productSnapshots.forEach((productSnapshot) => {
    if (!productSnapshot.exists) throw new Error('INVENTORY_RESTORE_BLOCKED');
    const product = productSnapshot.data();
    if (!product) throw new Error('INVENTORY_RESTORE_BLOCKED');
    const lines = (order.items || []).filter((item) => item.productId === productSnapshot.id);
    let variants = Array.isArray(product.variants) ? product.variants as Array<Record<string, unknown>> : [];
    let stock = Number(product.stock || 0);
    lines.forEach((line) => {
      if (line.variantId) {
        if (!variants.length || !variants.some((variant) => variant.id === line.variantId)) throw new Error('INVENTORY_RESTORE_BLOCKED');
        variants = variants.map((variant) => variant.id === line.variantId ? { ...variant, stock: Number(variant.stock || 0) + line.quantity } : variant);
      } else stock += line.quantity;
    });
    if (variants.length) stock = variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
    transaction.update(productSnapshot.ref, { stock, ...(variants.length ? { variants } : {}), updatedAt: new Date().toISOString(), serverUpdatedAt: FieldValue.serverTimestamp() });
  });
  (order.items || []).forEach((item) => transaction.set(db.collection('inventoryMovements').doc(), {
    orderId,
    productId: item.productId,
    variantId: item.variantId || null,
    quantity: item.quantity,
    reason,
    actor,
    movementId: randomBytes(12).toString('hex'),
    createdAt: FieldValue.serverTimestamp()
  }));
}
