import type { Category, Product } from '../types/catalog';

export interface CatalogValidationResult {
  valid: boolean;
  categoryCount: number;
  productCount: number;
  duplicateIds: string[];
  duplicateSkus: string[];
  duplicateSlugs: string[];
  duplicateImages: string[];
  missingMedia: string[];
  emptyCategories: string[];
  missingCategoryReferences: string[];
  invalidProducts: string[];
}

function duplicates(values: string[]): string[] {const normalized = values.map((value) => value.trim().toLowerCase());return Array.from(new Set(normalized.filter((value, index) => value && normalized.indexOf(value) !== index)));}

export function validateCatalog(categories: Category[], products: Product[]): CatalogValidationResult {
  const categorySlugs = new Set(categories.map((category) => category.slug));
  const duplicateIds = duplicates([...products.map((product) => product.id), ...categories.map((category) => category.id)]);
  const duplicateSkus = duplicates([...products.map((product) => product.sku), ...products.flatMap((product) => product.variants.map((variant) => variant.sku))]);
  const duplicateSlugs = duplicates([...products.map((product) => product.slug), ...categories.map((category) => category.slug)]);
  const duplicateImages = duplicates([...categories.map((category) => category.image), ...products.flatMap((product) => product.images)]);
  const missingMedia = products.filter((product) => !product.images?.[0]).map((product) => product.id);
  const emptyCategories = categories.filter((category) => !products.some((product) => product.categorySlugs.includes(category.slug))).map((category) => category.id);
  const missingCategoryReferences = products.flatMap((product) => product.categorySlugs.filter((slug) => !categorySlugs.has(slug)).map((slug) => `${product.id}:${slug}`));
  const invalidProducts = products.filter((product) => !product.name.trim() || !product.slug.trim() || !product.sku.trim() || !Number.isSafeInteger(product.price) || product.price < 0 || !Number.isSafeInteger(product.stock) || product.stock < 0 || product.compareAtPrice !== undefined && product.compareAtPrice <= product.price || product.variants.some((variant) => !Number.isSafeInteger(variant.stock) || variant.stock < 0)).map((product) => product.id);
  const valid = duplicateIds.length === 0 && duplicateSkus.length === 0 && duplicateSlugs.length === 0 && duplicateImages.length === 0 && missingMedia.length === 0 && emptyCategories.length === 0 && missingCategoryReferences.length === 0 && invalidProducts.length === 0;
  return { valid, categoryCount: categories.length, productCount: products.length, duplicateIds, duplicateSkus, duplicateSlugs, duplicateImages, missingMedia, emptyCategories, missingCategoryReferences, invalidProducts };
}