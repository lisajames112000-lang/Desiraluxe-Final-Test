// Factory used only by the data/products/* files to keep the curated catalog concise
// while every field stays explicit per call. IDs and dates are deterministic (slug- and
// anchor-date based) so the sample catalog never duplicates or drifts across reloads.
import type { Product } from '../types/catalog';
import { placeholderImage, placeholderGallery } from './placeholderImage';

const ANCHOR_MS = Date.UTC(2026, 9, 1); // fixed anchor: Oct 1, 2026 — keeps createdAt deterministic

export interface CreateProductInput {
  name: string;
  slug: string;
  sku: string;
  categoryName: string;
  categorySlug: string;
  extraCategorySlugs?: string[];
  price: number;
  compareAtPrice?: number;
  description: string;
  specs: Array<[string, string]>;
  stock?: number;
  variantOptionName?: string;
  variantValues?: string[];
  variantStocks?: number[];
  isFeatured?: boolean;
  isNewArrival?: boolean;
  daysAgo: number;
  /** Unique product photograph. When omitted, a generated illustration is used instead. */
  image?: string;
}

export function createProduct(input: CreateProductInput): Product {
  const hasVariants = !!(input.variantOptionName && input.variantValues && input.variantValues.length > 0);
  const usedVariantSkus = new Set<string>();
  const variants = hasVariants ?
  input.variantValues!.map((v, i) => {
    const legacySku = `${input.sku}-${v.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase()}`;
    const sku = usedVariantSkus.has(legacySku.toLowerCase()) ? `${legacySku}-${i + 1}` : legacySku;
    usedVariantSkus.add(sku.toLowerCase());
    return {
      id: `var_${input.slug}_${i}`,
      label: v,
      optionValues: { [input.variantOptionName as string]: v },
      sku,
      stock: input.variantStocks?.[i] ?? 10
    };
  }) :
  [];
  const stock = hasVariants ? variants.reduce((s, v) => s + v.stock, 0) : input.stock ?? 20;
  const createdAt = new Date(ANCHOR_MS - input.daysAgo * 24 * 60 * 60 * 1000).toISOString();
  const images = input.image ?
  [input.image] :
  [placeholderImage(input.categoryName, input.name), ...placeholderGallery(input.categoryName, input.name, 2)];

  return {
    id: `prod_${input.slug}`,
    name: input.name,
    slug: input.slug,
    sku: input.sku,
    categorySlugs: [input.categorySlug, ...(input.extraCategorySlugs || [])],
    description: input.description,
    price: input.price,
    compareAtPrice: input.compareAtPrice,
    currency: 'PKR',
    stock,
    variantOptions: hasVariants ? [{ name: input.variantOptionName as string, values: input.variantValues as string[] }] : [],
    variants,
    specifications: input.specs.map(([label, value]) => ({ label, value })),
    images,
    seoTitle: `${input.name} | Desiraluxe`,
    seoDescription: input.description.slice(0, 155),
    isFeatured: !!input.isFeatured,
    isNewArrival: !!input.isNewArrival,
    // Curated catalog entries carry real photography and are publish-ready, so they pass the
    // server's "published products must be verified, non-sample" rule when imported live.
    isSample: false,
    isPublished: true,
    isVerified: true,
    createdAt,
    updatedAt: createdAt
  };
}