# Desiraluxe owner setup

The source now contains production integration paths, but credentials, provider permissions, domains, deployed rules, and live network behavior cannot be created or verified from the design workspace. The authoritative collection/query/mutation contract and preserved source checkpoint are documented in `SCHEMA_CONTRACT.md`.

## 1. Firebase public Web configuration

The browser adapter in `services/firebase/config.ts` does not read `import.meta.env` or assume any environment object exists. Vite compiles `VITE_FIREBASE_*` values through `vite.config.ts`; confirmed Desiraluxe project identifiers provide preview-compatible defaults.

The owner supplied the exact public Firebase Web configuration for `e-commerce-711c0` (the retired `desiraluxe-web` project is rejected), and it is wired as the preview fallback while `VITE_FIREBASE_*` deployment values remain supported. This public browser configuration is not an admin credential and does not bypass Firestore Rules. A rebuild is still required after changing deployment values.

For local/deployed setup:

1. Copy `.env.example` to `.env.local`.
2. Keep the exact Desiraluxe public Web values together; do not substitute values from another Firebase project.
3. Add the preview and production hostnames to Firebase Authentication authorized domains.
4. Add server-only Firebase Admin service-account credentials (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`). All three are required.
5. Add the Cloudinary credentials (section 4) only to server function environments. Never prefix server secrets with `VITE_` or place them in `services/firebase/config.ts`.
6. Set `ALLOWED_ORIGINS` to the exact local, preview, and production browser origins.
7. Set a long random `SERVER_HASH_SECRET` in server environment variables.

## 2. Provision the owner account

On a trusted owner machine with protected Firebase Admin credentials configured for `e-commerce-711c0`:

1. Enable the Email/Password provider in Firebase Authentication.
2. Set `ADMIN_BOOTSTRAP_EMAIL` to the owner account email and set `ADMIN_BOOTSTRAP_PASSWORD` only in the protected local/server environment. Never commit the password or prefix it with `VITE_`.
3. Run `npm run provision:admin`. It creates the account when missing and grants only that UID the `admin: true` claim. For an intentional password change, set `ADMIN_RESET_PASSWORD=yes` for that one run, then return it to `no`.
4. If the account already exists and only needs authorization, `npm run authorize:admin` remains available with `ADMIN_BOOTSTRAP_UID` and `ADMIN_BOOTSTRAP_EMAIL` as a cross-check.
5. Sign out of `/admin`, then sign back in. The client refreshes the ID token and rejects the session unless it contains `admin: true`.

No admin email or password is embedded in code; the password is never embedded in client code. Do not place Admin SDK credentials, passwords, ID tokens, or service-account private keys in browser files.

## 3. Initialize Firestore safely

1. Review `firestore.rules` and `firestore.indexes.json`, authenticate the Firebase CLI as the legitimate project owner, then run `npm run deploy:firestore`. This executes `firebase deploy --only firestore:rules,firestore:indexes --project e-commerce-711c0`.
2. Confirm the CLI reports deployment to project `e-commerce-711c0`; local file edits alone do not change live permissions.
3. Run `npm run bootstrap:firebase` once with `APPROVE_STAGED_IMPORT=no`. It prints the exact import summary and exits without writing.
4. Review that summary, set `APPROVE_STAGED_IMPORT=yes`, and run `npm run bootstrap:firebase` again with the authorized owner UID.
5. Check `system/migration-v3-firestore-baseline`. The process is resumable, exits unchanged after completion, and only creates missing records; the order counter is never reset.
6. Review staged products, categories, pages, heroes, and popups in Admin. Imported demo catalog records are unpublished, unverified, and marked as samples. Publish only real, reviewed inventory.

Firestore creates a collection when its first legitimate document is written. No placeholder customer orders are created; production orders start empty.

## 4. Configure Cloudinary (only image and video storage provider)

Cloudinary is the sole media provider. All values are read from `process.env` inside `/api` functions only (`services/cloudinary/server.ts`); none are compiled into the browser bundle.

| Environment variable | Where to find the value | Secret? |
| --- | --- | --- |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Console → **Settings** (gear icon) → **API Keys** → "Cloud name" at the top of the page (also shown on the Console **Dashboard**). Expected value: `desiraluxe`. | No (appears in public delivery URLs) |
| `CLOUDINARY_API_KEY` | Same page, **API Keys** table → "API Key" column. | Low (sent with signed uploads) — still server-configured only |
| `CLOUDINARY_API_SECRET` | Same page, **API Keys** table → "API Secret" column → click the eye/reveal icon (may require your Cloudinary password). | **Yes — never commit, never share, never prefix with `VITE_`** |
| `CLOUDINARY_SIGNATURE_ALGORITHM` | Optional. Leave `sha1` unless **Settings → Security** shows SHA-256 signatures are enabled for the product environment. | No |

Direct page: `https://console.cloudinary.com/settings/api-keys`.

Steps:

1. In Vercel → Project → **Settings → Environment Variables**, add the four variables above for **Production** and **Preview**. Mark `CLOUDINARY_API_SECRET` as **Sensitive**. Redeploy after saving.
2. For local `vercel dev`, put the same values in `.env.local` (git-ignored). Never put them in `.env.example`.
3. If an API secret has ever been pasted into chat, email, or a ticket, rotate it: on the API Keys page choose **Generate New API Key**, update Vercel, redeploy, then deactivate the old key.
4. No CORS or bucket configuration is required. Cloudinary's upload API accepts signed browser uploads from any origin; the signature is what authorizes them.
5. Product/category images accept JPEG, PNG, WebP, and AVIF. Product videos accept MP4/WebM up to 30 MB (within Cloudinary's 100 MB single-request video limit) and use the first product image as their poster.
6. Keep payment proofs disabled until authenticated/private Cloudinary delivery and customer/order-authorized proof endpoints are deployed. Assets uploaded by this flow are public `upload` delivery type.

Upload lifecycle:

1. `POST /api/media/sign-upload` (admin ID token required) validates role, type, and size, creates a `media/{id}` record in `pending`, and returns a signed parameter set: fixed `public_id` (`desiraluxe/{role}/{entityId}/{mediaId}`), `allowed_formats`, `overwrite=false`, and a timestamp. Cloudinary rejects the signature after one hour.
2. The browser posts the file directly to `https://api.cloudinary.com/v1_1/{cloud}/{image|video}/upload` with progress and cancel support.
3. `POST /api/media/complete` verifies Cloudinary's response signature, then fetches the asset from the Cloudinary Admin API and checks public ID, resource type, detected format, byte size, and delivery URL. Mismatches are destroyed and marked `rejected`; valid assets become `ready` with the `secure_url`.
4. `POST /api/media/delete` refuses referenced media, then calls the signed `destroy` endpoint with CDN invalidation before removing the record.
5. `/api/cron/cleanup-media` destroys expired pending, rejected, and failed-cleanup assets. Media records created before the Cloudinary migration (no `provider: "cloudinary"`) are never modified automatically.

## 5. Vercel and preview runtime boundary

Magic Patterns preview runs this Vite client. The current `vite.config.ts` has no API middleware or proxy, so it does **not** execute the authored Vercel functions under `api/`. Creating those files does not make `/api/*` operational in Magic Patterns or `vite preview`.

Direct Firebase browser operations in preview are intentionally read-only: Authentication, claim verification, and live Firestore subscriptions can run after the public Web config, authorized domain, rules, and indexes are active. Every business mutation—including product, category, banner, popup, CMS, settings, payment, order, contact, media, and enquiry changes—uses a claim-checked server API and therefore requires either a Vercel deployment or a separately running `vercel dev` backend with protected Firebase Admin credentials.

For deployment:

1. Add public `VITE_*` values to Preview and Production. Public values require a rebuild after changes.
2. Add Firebase Admin, Cloudinary, `SERVER_HASH_SECRET`, `CRON_SECRET`, and other server-only values only to protected function environments.
3. Add preview and production hosts to Firebase Authentication authorized domains and `ALLOWED_ORIGINS`.
4. Set `PUBLIC_SITE_URL` to the exact HTTPS production origin so `/sitemap.xml` contains truthful absolute URLs.
5. Deploy using `vercel.json`; API routes and the dynamic sitemap are excluded from the SPA fallback.
6. Use a hosting plan whose terms permit commercial use. Vercel Hobby should not be represented as suitable for a commercial store.
7. Scheduled jobs are Hobby-compatible (each runs once per day; Vercel may start Hobby jobs at any minute within the scheduled hour):
   - `/api/cron/expire-orders` at 21:00 UTC (02:00 Pakistan time). Every checkout also expires up to 10 overdue unpaid orders before reserving stock, so held stock is released between daily runs.
   - `/api/cron/cleanup-media` at 22:30 UTC. Removes only unreferenced, expired, rejected, or failed Cloudinary uploads.
   Both require `CRON_SECRET`; Vercel sends it automatically as a bearer token when the variable is set.
8. Server functions use ES modules (`"type": "module"`), so every relative import reachable from `api/` uses an explicit `.js` extension (TypeScript resolves it to the `.ts` file). Keep this convention when adding server code.

Lockfile: this workspace has no package installer, so a genuine `package-lock.json` (with registry integrity hashes) cannot be produced here, and a hand-written one would be unsafe. On a trusted machine with Node 22 / npm 10 run `npm install`, then `npm run typecheck && npm run build`, and commit the generated `package-lock.json`. `vercel.json` automatically uses `npm ci` (strict, lockfile-synchronized) once that file exists, and falls back to `npm install` only while it is absent. The AWS SDK packages were removed; Cloudinary uses Node's built-in `crypto` and `fetch`, so no new dependency was added.

## 6. Verification commands

Run on a trusted machine after installing dependencies:

- `npm run typecheck`
- `npm run lint`
- `npm run test`
- `npm run test:rules`
- `npm run build`
- `npm run preview`
- `npm run test:e2e`

Provider-backed acceptance tests require deployed rules, authorized admin credentials, exact origins, and configured Cloudinary server variables (`GET /api/health` reports `media: "cloudinary-configured"` without revealing values). Until those are supplied and the commands are actually executed, their status is **not executed**, not passed.

Live acceptance checklist:

1. Open `/admin`; confirm configuration, loading, permission-denied, and authentication errors are distinct.
2. Sign in with the existing owner account after its `admin` custom claim is established; sign out/in after changing claims.
3. In a deployed backend environment, save one reviewed category/content record and wait for the acknowledged success result.
4. Reload the admin session and confirm the Firestore value persists.
5. Open an independent signed-out customer session and publish/update that record; confirm its `onSnapshot` subscriber updates without reload.
6. Exercise one `/api` mutation only against the deployed Vercel backend, never the plain Vite preview.
7. Inspect browser/server logs for `permission-denied` (rules/claim), `failed-precondition` (indexes), unauthorized-domain Auth errors, and API 404s (backend not running).

## Exact external blockers

- Public Firebase Web configuration: the exact owner-supplied values are present in the build fallback and `.env.example`; authorized-domain and live Auth behavior remain unverified until deployed/tested.
- Firestore rules/indexes: reviewed locally, including refund-ledger and maintenance-query contracts, but deployment status is unknown; run `npm run deploy:firestore` from a trusted authenticated owner machine before live acceptance.
- Admin claim: the existing Auth user must already exist and receive `admin: true` through `npm run authorize:admin` with trusted Admin SDK credentials.
- Bootstrap: run only after authorization and explicit `APPROVE_STAGED_IMPORT=yes`; it creates missing records, stages samples unpublished, never resets the order counter, and never creates sample orders.
- Server APIs: unavailable in Magic Patterns/Vite preview; deploy to Vercel or run `vercel dev` separately. Admin business saves are intentionally disabled without these APIs.
- Server Firebase credentials: required for API routes/bootstrap and must remain in protected server environments.
- Cloudinary: uploads, verification, and deletion return a 503 "not configured" error until `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` are set in Vercel server environments.
- Public API protection: `ALLOWED_ORIGINS`, `SERVER_HASH_SECRET`, `CRON_SECRET`, and production/preview origins must be configured on the backend. Cross-origin JSON/Auth requests use exact-origin preflight responses; wildcards are not accepted.

## 7. Cost and platform limits

No billing was enabled. Before production, verify current Firebase, Cloudinary (storage, bandwidth, and transformation credits), Authentication, and hosting quotas/terms directly with each provider. Quotas can change, overage may be billed, and alerts are not hard spending caps. The implementation uses bounded subscriptions, direct-to-Cloudinary uploads, no eager transformations, and no paid search service, but it does not claim unlimited or permanently free commercial capacity.

## Remaining deliberate limitations

- Search is a bounded in-browser search over the subscribed published catalog, not unlimited full-text search.
- Metadata is client-side for this Vite SPA; it is not server-rendered SEO. Add a verified prerender service or server metadata layer before relying on rich crawler coverage.
- The dynamic sitemap returns an unavailable response until `PUBLIC_SITE_URL`, Firebase Admin credentials, and published Firestore records are configured.
- No live integration, deployment, Lighthouse result, two-second update measurement, secret scan, or provider connection is claimed from this workspace.
