import { describe, expect, it } from 'vitest';
import type { Product } from '../types/catalog';
import { addOrMergeCartItem, changeCartVariant, createCartItem, reconcileCart } from './cart';

const product: Product = { id: 'p1', name: 'Product', slug: 'product', sku: 'BASE', categorySlugs: ['cat'], description: '', price: 1000, currency: 'PKR', stock: 3, variantOptions: [{ name: 'Size', values: ['S', 'M'] }], variants: [{ id: 's', label: 'S', optionValues: { Size: 'S' }, sku: 'S-SKU', stock: 0 }, { id: 'm', label: 'M', optionValues: { Size: 'M' }, sku: 'M-SKU', stock: 2, priceOverride: 1200 }], specifications: [], images: ['https://example.com/image.jpg'], seoTitle: '', seoDescription: '', isFeatured: false, isNewArrival: false, isSample: false, isPublished: true, isVerified: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };

describe('cart correctness', () => {
  it('requires an explicit variant and rejects zero stock', () => {
    expect(createCartItem(product, 1)).toBeNull();
    expect(createCartItem(product, 1, 's')).toBeNull();
    expect(createCartItem(product, 1, 'm')?.price).toBe(1200);
  });
  it('clamps initial and merged quantities', () => {
    const item = createCartItem(product, 10, 'm');
    expect(item?.quantity).toBe(2);
    expect(addOrMergeCartItem(item ? [item] : [], { ...item!, quantity: 1 })[0].quantity).toBe(2);
  });
  it('merges lines when changing variants', () => {
    const base = createCartItem(product, 1, 'm')!;
    expect(changeCartVariant([base], 'p1:m', product, 'm')).toHaveLength(1);
  });
  it('reconciles changed prices and availability', () => {
    const item = createCartItem(product, 1, 'm')!;
    const result = reconcileCart([item], [{ ...product, variants: product.variants.map((variant) => variant.id === 'm' ? { ...variant, priceOverride: 1500 } : variant) }]);
    expect(result.changed).toBe(true);
    expect(result.cart[0].price).toBe(1500);
  });
  it('marks duplicate persisted lines as changed and clamps their merged quantity', () => {
    const item = createCartItem(product, 2, 'm')!;
    const result = reconcileCart([item, item], [product]);
    expect(result.changed).toBe(true);
    expect(result.cart).toHaveLength(1);
    expect(result.cart[0].quantity).toBe(2);
  });
});