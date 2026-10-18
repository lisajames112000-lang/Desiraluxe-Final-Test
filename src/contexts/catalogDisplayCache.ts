// Public display-only cache. It never marks data live or authorizes checkout.
// Orders, customer data, payment accounts and admin-only documents are excluded.
export type CatalogCacheResource = 'products' | 'categories' | 'heroSlides' | 'siteSettings';
const MAX_AGE_MS = 10 * 60 * 1000;
const PREFIX = 'desiraluxe.public-display.v1';

const PUBLIC_FIELDS: Record<CatalogCacheResource, string[]> = {
  products: ['id', 'name', 'slug', 'sku', 'categorySlugs', 'description', 'price', 'compareAtPrice', 'currency', 'stock', 'variantOptions', 'variants', 'specifications', 'images', 'videoUrl', 'seoTitle', 'seoDescription', 'isFeatured', 'isNewArrival', 'isSample', 'isPublished', 'isVerified', 'createdAt', 'updatedAt'],
  categories: ['id', 'name', 'slug', 'description', 'image', 'parentSlug', 'displayOrder', 'isFeatured', 'isSample', 'isPublished', 'updatedAt'],
  heroSlides: ['id', 'order', 'eyebrow', 'headline', 'subheadline', 'ctaLabel', 'ctaHref', 'image', 'mobileImage', 'mediaFit', 'focalPoint', 'overlayStrength', 'textAlign', 'theme', 'isVisible', 'startAt', 'endAt', 'updatedAt'],
  siteSettings: ['logoText', 'logoTagline', 'logoUrl', 'logoAlt', 'logoDesktopHeight', 'logoMobileHeight', 'logoFooterHeight', 'announcementText', 'announcementEnabled', 'contactEmail', 'contactPhone', 'contactWhatsapp', 'contactAddress', 'socialLinks', 'currency', 'reviewCountdownMinutes', 'shippingFee', 'freeShippingThreshold', 'timezone', 'homepageSectionOrder', 'homepageSectionsEnabled', 'updatedAt']
};

function publicDisplayCopy(resource: CatalogCacheResource, data: unknown): unknown {
  const pick = (record: Record<string, unknown>) => Object.fromEntries(PUBLIC_FIELDS[resource].filter((key) => key in record).map((key) => [key, record[key]]));
  return resource === 'siteSettings' ? pick(data as Record<string, unknown>) : (data as Record<string, unknown>[]).map(pick);
}

interface CacheStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function validDisplayData(resource: CatalogCacheResource, data: unknown): boolean {
  if (resource === 'siteSettings') {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
    const settings = data as Record<string, unknown>;
    return (!settings.homepageSectionOrder || Array.isArray(settings.homepageSectionOrder)) &&
      (!settings.homepageSectionsEnabled || typeof settings.homepageSectionsEnabled === 'object');
  }
  if (!Array.isArray(data) || data.length > 500) return false;
  return data.every((item: unknown) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    const record = item as Record<string, unknown>;
    if (typeof record.id !== 'string' || typeof record.slug !== 'string' && resource !== 'heroSlides') return false;
    if (resource === 'products' || resource === 'categories') return record.isPublished === true && typeof record.name === 'string';
    return record.isVisible === true;
  });
}

export function readCatalogDisplayCache(projectId: string, resource: CatalogCacheResource, storage?: CacheStorage, now = Date.now()): unknown {
  if (!projectId) return undefined;
  try {
    const browserStorage = storage ?? window.localStorage;
    const raw = browserStorage.getItem(`${PREFIX}.${projectId}.${resource}`);
    if (!raw) return undefined;
    const entry: unknown = JSON.parse(raw);
    if (!entry || typeof entry !== 'object') return undefined;
    const cache = entry as { savedAt?: unknown; data?: unknown };
    if (typeof cache.savedAt !== 'number' || now < cache.savedAt || now - cache.savedAt > MAX_AGE_MS) return undefined;
    return validDisplayData(resource, cache.data) ? publicDisplayCopy(resource, cache.data) : undefined;
  } catch {
    return undefined;
  }
}

export function writeCatalogDisplayCache(projectId: string, resource: CatalogCacheResource, data: unknown, storage?: CacheStorage, now = Date.now()): void {
  if (!projectId || !validDisplayData(resource, data)) return;
  try {
    (storage ?? window.localStorage).setItem(`${PREFIX}.${projectId}.${resource}`, JSON.stringify({ savedAt: now, data: publicDisplayCopy(resource, data) }));
  } catch {
    // Browsing and checkout must still work if this optional cache is full/blocked.
  }
}
