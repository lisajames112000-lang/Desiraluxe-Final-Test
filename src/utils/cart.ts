import type { CartItem } from '../types/cart';
import type { Product, ProductVariant } from '../types/catalog';

export function cartItemKey(item: Pick<CartItem, 'productId' | 'variantId'>): string {
  return `${item.productId}:${item.variantId || 'default'}`;
}

function selectedVariant(product: Product, variantId?: string): ProductVariant | undefined {
  return variantId ? product.variants.find((variant) => variant.id === variantId) : undefined;
}

export function createCartItem(product: Product, quantity: number, variantId?: string): CartItem | null {
  if (!product.isPublished || !Number.isInteger(quantity) || quantity <= 0) return null;
  if (product.variants.length > 0 && !variantId) return null;
  const variant = selectedVariant(product, variantId);
  if (variantId && !variant) return null;
  const maxStock = variant?.stock ?? product.stock;
  if (!Number.isInteger(maxStock) || maxStock <= 0) return null;
  return {
    productId: product.id,
    name: product.name,
    slug: product.slug,
    image: product.images[0] || '',
    sku: variant?.sku ?? product.sku,
    price: variant?.priceOverride ?? product.price,
    quantity: Math.min(quantity, maxStock),
    variantId: variant?.id,
    variantLabel: variant?.label,
    maxStock
  };
}

export function addOrMergeCartItem(cart: CartItem[], next: CartItem): CartItem[] {
  const key = cartItemKey(next);
  const existing = cart.find((item) => cartItemKey(item) === key);
  if (!existing) return [...cart, next];
  return cart.map((item) => cartItemKey(item) === key ? { ...item, ...next, quantity: Math.min(next.maxStock, item.quantity + next.quantity) } : item);
}

export function changeCartVariant(cart: CartItem[], key: string, product: Product, variantId: string): CartItem[] {
  const variant = product.variants.find((candidate) => candidate.id === variantId);
  if (!variant || variant.stock <= 0) return cart;
  const source = cart.find((item) => cartItemKey(item) === key);
  if (!source) return cart;
  const changed: CartItem = {
    ...source,
    variantId: variant.id,
    variantLabel: variant.label,
    sku: variant.sku,
    price: variant.priceOverride ?? product.price,
    maxStock: variant.stock,
    quantity: Math.min(source.quantity, variant.stock)
  };
  const withoutSource = cart.filter((item) => cartItemKey(item) !== key);
  return addOrMergeCartItem(withoutSource, changed);
}

export function reconcileCart(cart: CartItem[], products: Product[]): {cart: CartItem[];changed: boolean;} {
  const productMap = new Map(products.map((product) => [product.id, product]));
  const next: CartItem[] = [];
  let changed = false;
  for (const item of cart) {
    const product = productMap.get(item.productId);
    if (!product?.isPublished) {changed = true;continue;}
    const refreshed = createCartItem(product, item.quantity, item.variantId);
    if (!refreshed) {changed = true;continue;}
    if (refreshed.price !== item.price || refreshed.maxStock !== item.maxStock || refreshed.quantity !== item.quantity || refreshed.name !== item.name || refreshed.image !== item.image) changed = true;
    const beforeLength = next.length;
    const existingQuantity = next.find((candidate) => cartItemKey(candidate) === cartItemKey(refreshed))?.quantity;
    const merged = addOrMergeCartItem(next, refreshed);
    const mergedLine = merged.find((candidate) => cartItemKey(candidate) === cartItemKey(refreshed));
    if (beforeLength === merged.length && existingQuantity !== undefined) changed = true;
    if (mergedLine && mergedLine.quantity !== (existingQuantity ?? 0) + refreshed.quantity) changed = true;
    next.splice(0, next.length, ...merged);
  }
  return { cart: next, changed };
}