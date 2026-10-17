// Existing URL contracts, shared by the one Vercel entry point and tests.
export const apiRoutePaths = [
  "admin/accounting/periods",
  "admin/bootstrap",
  "admin/content/delete",
  "admin/content/save",
  "admin/enquiries/[id]/status",
  "admin/orders/[id]/refund",
  "admin/orders/[id]/state",
  "admin/orders/[id]/update",
  "admin/products/delete",
  "admin/products/private",
  "admin/products/save",
  "admin/settings/save",
  "contact",
  "cron/cleanup-media",
  "cron/expire-orders",
  "health",
  "media/complete",
  "media/delete",
  "media/sign-upload",
  "orders/create",
  "orders/receipt",
  "orders/track",
  "sitemap"
] as const;

export function resolveApiRoute(path: string): { key: string; params: Record<string, string> } | null {
  for (const key of apiRoutePaths) {
    const expected = key.split('/');
    const actual = path.split('/');
    if (actual.length !== expected.length) continue;
    const params: Record<string, string> = {};
    const matches = expected.every((segment, index) => {
      const value = actual[index];
      if (segment.startsWith('[') && segment.endsWith(']')) {
        if (!value || value === '.' || value === '..') return false;
        params[segment.slice(1, -1)] = value;
        return true;
      }
      return value === segment;
    });
    if (matches) return { key, params };
  }
  return null;
}
