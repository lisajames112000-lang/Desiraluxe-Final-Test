import type { Product, ProductSpec, ProductVariant, ProductVariantOption } from '../types/catalog';

// Read-only normalization of Firestore product documents. It never writes back
// to Firestore and never invents publication state: missing flags stay false.
// It exists so that one older or partially-shaped document (for example a
// Firestore Timestamp in `updatedAt`, a missing `variants` array, or an image
// stored as an object) cannot crash the whole catalog subscription.

type RawRecord = Record<string, unknown>;

function isRecord(value: unknown): value is RawRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return fallback;
}

function amount(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function toIsoString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === 'number' && Number.isFinite(value)) return new Date(value).toISOString();
  if (isRecord(value)) {
    if (typeof value.toDate === 'function') {
      const date = (value.toDate as () => Date)();
      if (date instanceof Date && !Number.isNaN(date.getTime())) return date.toISOString();
    }
    const seconds = typeof value.seconds === 'number' ? value.seconds : typeof value._seconds === 'number' ? value._seconds : undefined;
    if (seconds !== undefined) return new Date(seconds * 1000).toISOString();
  }
  return fallback;
}

function imageUrl(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (isRecord(value)) return text(value.secure_url) || text(value.secureUrl) || text(value.url) || text(value.src);
  return '';
}

function images(raw: RawRecord): string[] {
  const list = Array.isArray(raw.images) ? raw.images.map(imageUrl) : [];
  const single = [raw.image, raw.imageUrl, raw.mainImage, raw.thumbnail].map(imageUrl);
  return Array.from(new Set([...list, ...single].filter(Boolean)));
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((entry) => text(entry)).filter(Boolean) : [];
}

function variants(value: unknown): ProductVariant[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((entry, index) => {
    const optionValues = isRecord(entry.optionValues) ?
    Object.fromEntries(Object.entries(entry.optionValues).map(([key, option]) => [key, text(option)])) :
    {};
    const priceOverride = entry.priceOverride === undefined || entry.priceOverride === null ? NaN : amount(entry.priceOverride, NaN);
    return {
      id: text(entry.id, `variant-${index + 1}`),
      label: text(entry.label) || text(entry.name) || `Option ${index + 1}`,
      optionValues,
      sku: text(entry.sku),
      stock: amount(entry.stock),
      ...(Number.isFinite(priceOverride) ? { priceOverride } : {})
    };
  });
}

function variantOptions(value: unknown): ProductVariantOption[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((entry) => ({ name: text(entry.name), values: stringList(entry.values) }));
}

function specifications(value: unknown): ProductSpec[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).map((entry) => ({ label: text(entry.label), value: text(entry.value) }));
}

function categorySlugs(raw: RawRecord): string[] {
  const list = stringList(raw.categorySlugs);
  if (list.length) return list;
  return [text(raw.categorySlug), text(raw.category)].filter(Boolean);
}

export function normalizeProduct(raw: unknown): Product {
  const record = isRecord(raw) ? raw : {};
  const id = text(record.id);
  const createdAt = toIsoString(record.createdAt);
  const updatedAt = toIsoString(record.updatedAt) || toIsoString(record.serverUpdatedAt) || createdAt;
  const price = amount(record.price);
  const compareAtPrice = record.compareAtPrice === undefined || record.compareAtPrice === null ? undefined : amount(record.compareAtPrice, 0);
  const productVariants = variants(record.variants);
  const name = text(record.name) || text(record.title);
  const product: Product = {
    id,
    name: name || id,
    slug: text(record.slug) || id,
    sku: text(record.sku),
    categorySlugs: categorySlugs(record),
    description: text(record.description),
    price,
    ...(compareAtPrice ? { compareAtPrice } : {}),
    ...(typeof record.costPrice === 'number' ? { costPrice: record.costPrice } : {}),
    currency: 'PKR',
    stock: amount(record.stock, productVariants.reduce((sum, variant) => sum + variant.stock, 0)),
    variantOptions: variantOptions(record.variantOptions),
    variants: productVariants,
    specifications: specifications(record.specifications),
    images: images(record),
    ...(imageUrl(record.videoUrl) ? { videoUrl: imageUrl(record.videoUrl) } : {}),
    seoTitle: text(record.seoTitle),
    seoDescription: text(record.seoDescription),
    isFeatured: record.isFeatured === true,
    isNewArrival: record.isNewArrival === true,
    isSample: record.isSample === true,
    isPublished: record.isPublished === true,
    isVerified: record.isVerified === true,
    createdAt,
    updatedAt
  };
  return product;
}

export function compareByUpdatedDesc(a: Pick<Product, 'updatedAt'>, b: Pick<Product, 'updatedAt'>): number {
  return (b.updatedAt || '').localeCompare(a.updatedAt || '');
}