# Desiraluxe implementation status

## Completed in source

- [x] Added a preview-safe Firebase configuration adapter with no direct environment-object read, one-time Firebase initialization, runtime/build/fallback precedence, and non-throwing configuration errors.
- [x] Replaced local preview admin bypass with Firebase email/password authentication, refresh-safe auth loading, logout, password reset, explicit configuration/loading/permission/error states, and `admin` custom-claim checks.
- [x] Added deny-by-default Firestore rules, composite indexes, emulator configuration, owner authorization script, reviewed-import approval gate, and resumable create-missing-only bootstrap migration that never resets the order counter.
- [x] Recorded the recoverable 200-product/20-category source checkpoint and shared query/document/security contract in `SCHEMA_CONTRACT.md` without duplicating or regenerating the catalog.
- [x] Removed shared business/order persistence from localStorage. Local storage is limited to cart drafts and popup-frequency preferences.
- [x] Added bounded live Firestore storefront subscriptions with cache/offline/pending-write status and listener cleanup.
- [x] Added claim-checked server-only admin mutations with strict schemas, audit entries, conflict handling, duplicate-submit guards, explicit failure results, and draft preservation across product/category/settings/content/banner/popup/payment/enquiry workflows.
- [x] Added transactional product slug/SKU reservations, public/private product separation, publication safeguards, variant-authoritative stock, safe archive/delete behavior, and immutable order item snapshots.
- [x] Repaired cart variant selection, zero-stock handling, initial/merged quantity clamps, duplicate line merging, stale cart reconciliation, and price/availability notices.
- [x] Added trusted, idempotent guest checkout with server-side totals, enabled-payment validation, sequential order references, transactional inventory deduction, hashed guest capabilities, and redacted POST-based tracking.
- [x] Added trusted order state enforcement, payment/fulfillment cross-state checks, idempotent cancellation stock release, audit entries, tracking/internal-note updates, and CSV formula-injection protection.
- [x] Replaced Cloudflare R2 with Cloudinary as the only media provider: server-signed image/video uploads, direct browser upload with progress/cancel, response-signature plus Admin API verification, immutable public IDs, reference-aware signed deletion with CDN invalidation, legacy-record protection, and central media requirements. Credentials are server-only `process.env` reads.
- [x] Added real contact-message persistence with honeypot, request limits, Firestore-backed rate limiting, and an admin enquiries view.
- [x] Applied homepage section ordering/enabling, hero and popup schedule eligibility, route/frequency/priority handling, Asia/Karachi daily behavior, and automatic boundary reevaluation.
- [x] Repaired search URL synchronization, mobile drawer closing, image fallback reset, explicit labels, tracking cancellation timeline, dynamic logo sizing, CMS deletion protection, and actual duplicate/reference/empty-category diagnostics without fixed-count validation.
- [x] Added Vite/TypeScript/Tailwind/ESLint/Vitest/Playwright/Firebase Emulator/Vercel configuration, unit tests, rule tests, E2E specs, environment placeholders, robots directives, and deployment/setup documentation.

- [x] Made scheduled jobs Vercel Hobby-compatible: both crons run once daily, and checkout opportunistically expires up to 10 overdue unpaid reservations (transactional, idempotent, best-effort) so held stock is released between runs.
- [x] Added explicit `.js` extensions to every relative import reachable from `api/` so Node ES-module resolution works under `"type": "module"` on Vercel (not yet verified by a deployment).

## Deliberately blocked or incomplete

- [ ] The full public Firebase Web configuration for `e-commerce-711c0` is present in `.env.example` and the preview fallback; authorized domains and live Auth behavior remain unverified until deployed.
- [ ] Rules/index deployment, existing-user admin claim, and Firestore initialization: authored securely but require trusted owner execution and Firebase Admin credentials outside the frontend. The current live deployment status is unknown.
- [ ] Vercel API operations in Magic Patterns/Vite preview: unsupported by the current preview runtime. All business mutations require a deployed or separately running backend; preview remains read-only/Legacy Preview without it.
- [ ] Live Cloudinary upload/verification/deletion: blocked until `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` are set in Vercel server environments and an admin upload is exercised on the deployed backend.
- [ ] Private customer payment-proof uploads: deliberately disabled until authenticated Cloudinary delivery and a customer/order-authorized access path are configured.
- [ ] External source-control tag/export checkpoint: this workspace exposes file editing but no Git/version-export operation. Original catalog/data modules remain intact and are inventoried in `SCHEMA_CONTRACT.md`; create a repository tag or exported archive before provider deployment.
- [ ] Package lockfile: cannot be generated without a package installer/command runner. Run `npm install` on a trusted machine and commit `package-lock.json`; `vercel.json` switches to `npm ci` automatically once it exists.
- [ ] Automated command results: typecheck, lint, unit, rules, build, and E2E suites are authored but **not executed** in this workspace.
- [ ] Real independent admin/customer browser acceptance, live-update timing, concurrent last-stock verification, upload interruption tests, responsive browser matrix, Lighthouse/Core Web Vitals, and built-bundle secret scan are **not executed**.
- [ ] Full-text search remains a bounded client-side published-catalog strategy; no external search engine is claimed.
- [ ] Metadata remains client-side SPA metadata; no server-rendered/prerendered SEO is claimed. Dynamic sitemap output remains blocked until a real canonical domain and Firebase Admin environment are configured.
- [ ] Favicon artwork was not added. Magic Patterns requires favicon upload through **PUBLISH** after owner-approved square artwork is available.

See `SETUP.md` for the exact owner steps and verification commands.
