# Desiraluxe schema contract

This document is the shared contract for Firestore documents, storefront queries, trusted mutations, initialization, Rules, and tests. It does not authorize access; `firestore.rules` and server-side custom-claim checks do that.

## Preserved source checkpoint

The recoverable baseline remains in versioned source and is not regenerated during backend setup:

- 61 curated imported products across 12 category data modules in `data/products/`, each with a unique photograph.
- 12 categories in `data/categories.ts`.
- 5 hero slides in `data/heroSlides.ts`.
- 1 preview popup in `data/popups.ts`.
- 5 system CMS pages in `data/cmsPages.ts`.
- Store settings and accounting preview data in `data/brandSettings.ts`.
- Disabled, unconfigured payment methods in `data/paymentMethods.ts`.

Stable document IDs, slugs, SKUs, category slugs, product media URLs, and relationships are imported unchanged. Bootstrap is create-missing-only; it does not overwrite existing documents, create sample orders, reset datasets, or reset the order counter.

## Public collections and exact query contract

| Path | Public query/read requirement | Trusted writes |
| --- | --- | --- |
| `products/{id}` | `isPublished == true`, ordered by `updatedAt desc`, max 500 | `/api/admin/products/*` only |
| `categories/{id}` | `isPublished == true`, ordered by `displayOrder asc`, max 500 | `/api/admin/content/*` only |
| `heroSlides/{id}` | `isVisible == true`, ordered by `order asc`, max 500 | `/api/admin/content/*` only |
| `popups/{id}` | `isEnabled == true`, max 500 | `/api/admin/content/*` only |
| `cmsPages/{id}` | `isPublished == true`, max 500 | `/api/admin/content/*` only |
| `paymentMethodsPublic/{id}` | `enabled == true`, max 500 | `/api/admin/content/*` only |
| `siteSettings/public` | direct public document read | `/api/admin/settings/save` only |

Rules are not filters: signed-out list queries must include the stated publication constraint. A successful empty query is a verified empty collection, not a permission failure.

## Private collections

`productPrivate`, `orders`, `contactMessages`, `media`, `inventoryMovements`, `accountingPeriods`, `auditLogs`, `uniqueKeys`, `rateLimits`, `orderAccess`, `siteSettings/private`, `paymentMethodsPrivate`, and `system` are never publicly readable. Browser writes are denied. Trusted server APIs use the Firebase Admin SDK after verifying `admin === true`, except public checkout/contact endpoints which validate and constrain their own server writes.

Private product cost is stored in `productPrivate/{productId}` and is never copied into public `products` documents. Customer/order capabilities are stored as hashes and are not listable by browsers.

## Product invariants

- `id`, `slug`, and SKU relationships are stable; slug/SKU reservations use `uniqueKeys`.
- Public products never include `costPrice`, supplier data, or internal notes.
- `isPublished: true` requires `isVerified: true`, `isSample: false`, and a main image.
- Variant stock is authoritative when variants exist; parent stock equals the variant-stock sum.
- Money and stock values are bounded non-negative integers.
- `updatedAt` is an ISO string used for ordering and optimistic concurrency; `serverUpdatedAt` is a server timestamp used for audit timing.

## Content and settings invariants

Strict schemas live in `services/server/adminContentSchemas.ts` and are used by every trusted content/settings mutation. Category and CMS slugs are unique. Category parents must exist and cannot form cycles. System CMS page slugs and documents are protected. Enabled payment methods require complete account and instruction fields. Schedules use ISO timestamps with start before end; storefront eligibility is recalculated at schedule boundaries in Asia/Karachi display time.

## Initialization contract

`scripts/bootstrapFirestore.ts`:

1. verifies the intended existing owner has the `admin` custom claim;
2. prints the preserved import counts;
3. requires `APPROVE_STAGED_IMPORT=yes` before any writes;
4. creates only missing documents in batches of at most 350 while preserving source IDs and ISO product creation dates;
5. stages sample products/categories unpublished and unverified and disables sample content/payment methods;
6. never creates sample orders or overwrites existing valid documents;
7. records running/completed/failed migration state and safely resumes after interruption;
8. exits without changes after completion; and
9. creates the order counter only when absent.

A multi-batch import is resumable, not globally atomic. Review the printed summary before approval and review staged records before publication.
