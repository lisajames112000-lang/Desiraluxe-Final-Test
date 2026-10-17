import { describe, expect, it } from 'vitest';
import { categories } from './categories';
import { initialProducts } from './products';
import { validateCatalog } from '../utils/catalogValidation';

describe('catalog validation', () => {
  it('preserves the reviewed source baseline while live collections remain free to expand', () => {
    const result = validateCatalog(categories, initialProducts);
    expect(result.categoryCount).toBe(12);
    expect(result.productCount).toBe(61);
    expect(result.duplicateIds).toEqual([]);
    expect(result.duplicateSkus).toEqual([]);
    expect(result.duplicateSlugs).toEqual([]);
    expect(result.duplicateImages).toEqual([]);
    expect(result.emptyCategories).toEqual([]);
    expect(result.missingMedia).toEqual([]);
    expect(result.missingCategoryReferences).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('reports actual broken category references', () => {
    const result = validateCatalog(categories, [{ ...initialProducts[0], categorySlugs: ['missing-category'] }]);
    expect(result.valid).toBe(false);
    expect(result.missingCategoryReferences[0]).toContain('missing-category');
  });
});