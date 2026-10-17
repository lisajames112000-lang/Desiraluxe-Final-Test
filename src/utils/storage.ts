// Thin browser-storage repository layer. Every read/write to localStorage flows through here
// so the persistence mechanism can be swapped for a real backend without touching feature code.
// IMPORTANT: this is browser-local, per-device, preview-only persistence — not a production database.

export const SCHEMA_VERSION = 2;

export const STORAGE_KEYS = {
  schemaVersion: 'desiraluxe.schemaVersion',
  categories: 'desiraluxe.categories.v1',
  products: 'desiraluxe.products.v1',
  heroSlides: 'desiraluxe.heroSlides.v1',
  paymentMethods: 'desiraluxe.paymentMethods.v1',
  popups: 'desiraluxe.popups.v1',
  cmsPages: 'desiraluxe.cmsPages.v1',
  brandSettings: 'desiraluxe.brandSettings.v1',
  orders: 'desiraluxe.orders.v1',
  cart: 'desiraluxe.cart.v1',
  adminSession: 'desiraluxe.adminSession.v1',
  auditLog: 'desiraluxe.auditLog.v1',
  accountingPeriods: 'desiraluxe.accountingPeriods.v1',
  popupSeen: 'desiraluxe.popupSeen.v1'
} as const;

export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    window.dispatchEvent(new Event('desiraluxe-storage-error'));
    return false;
  }
}

export function removeKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {

    // ignore
  }}

export function clearAllDesiraluxeData(): void {
  Object.values(STORAGE_KEYS).forEach(removeKey);
}