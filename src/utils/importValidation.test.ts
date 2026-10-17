import { describe, expect, it } from 'vitest';
import { validateBackup } from './importValidation';

describe('backup import validation', () => {
  it('rejects malformed nested data without throwing during schema construction', () => {
    const result = validateBackup({ schemaVersion: 3, exportedAt: new Date().toISOString(), categories: [], products: [{ id: '__proto__' }] });
    expect(result.ok).toBe(false);
  });

  it('accepts an exported category revision and a preserved root-relative asset', () => {
    const result = validateBackup({
      schemaVersion: 3,
      exportedAt: '2026-10-13T10:00:00.000Z',
      categories: [{ id: 'cat_test', name: 'Test', slug: 'test', description: '', image: '/media/category.webp', displayOrder: 1, isFeatured: false, isSample: false, isPublished: true, updatedAt: '2026-10-13T09:00:00.000Z' }],
      products: []
    });
    expect(result.ok).toBe(true);
  });

  it('rejects traversal and unsafe media schemes', () => {
    const category = { id: 'cat_test', name: 'Test', slug: 'test', description: '', displayOrder: 1, isFeatured: false, isSample: false, isPublished: true };
    expect(validateBackup({ schemaVersion: 3, exportedAt: new Date().toISOString(), categories: [{ ...category, image: '/../secret' }], products: [] }).ok).toBe(false);
    expect(validateBackup({ schemaVersion: 3, exportedAt: new Date().toISOString(), categories: [{ ...category, image: 'javascript:alert(1)' }], products: [] }).ok).toBe(false);
  });

  it('accepts an empty catalog backup', () => {
    const result = validateBackup({ schemaVersion: 3, exportedAt: new Date().toISOString(), categories: [], products: [] });
    expect(result.ok).toBe(true);
  });
});