import { describe, expect, it } from 'vitest';
import { createProduct } from './productFactory';

const base = {
  name: 'Collision-safe product',
  slug: 'collision-safe-product',
  sku: 'SAFE-001',
  categoryName: 'Shoes',
  categorySlug: 'shoes',
  price: 1000,
  description: 'A deterministic fixture for compatibility-safe variant SKUs.',
  specs: [] as Array<[string, string]>,
  variantOptionName: 'Color',
  variantValues: ['Black', 'Blue', 'Blush'],
  variantStocks: [1, 1, 1],
  daysAgo: 1
};

describe('product factory variant SKU mapping', () => {
  it('preserves the first legacy SKU and adds stable suffixes only for collisions', () => {
    const product = createProduct(base);
    expect(product.variants.map((variant) => variant.id)).toEqual([
    'var_collision-safe-product_0',
    'var_collision-safe-product_1',
    'var_collision-safe-product_2']
    );
    expect(product.variants.map((variant) => variant.sku)).toEqual(['SAFE-001-BL', 'SAFE-001-BL-2', 'SAFE-001-BL-3']);
    expect(new Set(product.variants.map((variant) => variant.sku)).size).toBe(3);
  });
});