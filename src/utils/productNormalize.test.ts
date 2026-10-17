import { describe, expect, it } from 'vitest';
import { compareByUpdatedDesc, normalizeProduct, toIsoString } from './productNormalize';

describe('normalizeProduct', () => {
  it('keeps a contract-shaped product unchanged', () => {
    const product = {
      id: 'prod_1', name: 'Silk Dress', slug: 'silk-dress', sku: 'DLX-1', categorySlugs: ['fashion'], description: 'd', price: 100, compareAtPrice: 150,
      currency: 'PKR' as const, stock: 3, variantOptions: [], variants: [], specifications: [], images: ['https://res.cloudinary.com/demo/image/upload/a.jpg'],
      seoTitle: 's', seoDescription: 'sd', isFeatured: true, isNewArrival: false, isSample: false, isPublished: true, isVerified: true,
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-02-01T00:00:00.000Z'
    };
    expect(normalizeProduct(product)).toEqual(product);
  });

  it('tolerates Timestamps, missing arrays, and image objects without inventing publication', () => {
    const result = normalizeProduct({
      id: 'legacy', title: 'Legacy item', price: '2500', updatedAt: { seconds: 1_700_000_000, nanoseconds: 0 },
      images: [{ secure_url: 'https://res.cloudinary.com/demo/image/upload/b.jpg' }]
    });
    expect(result.name).toBe('Legacy item');
    expect(result.price).toBe(2500);
    expect(result.variants).toEqual([]);
    expect(result.categorySlugs).toEqual([]);
    expect(result.images).toEqual(['https://res.cloudinary.com/demo/image/upload/b.jpg']);
    expect(result.updatedAt).toBe(new Date(1_700_000_000_000).toISOString());
    expect(result.isPublished).toBe(false);
    expect(result.isVerified).toBe(false);
  });

  it('sorts safely when updatedAt is empty', () => {
    const list = [{ updatedAt: '' }, { updatedAt: '2026-03-01T00:00:00.000Z' }].sort(compareByUpdatedDesc);
    expect(list[0].updatedAt).toBe('2026-03-01T00:00:00.000Z');
    expect(toIsoString(undefined)).toBe('');
  });
});