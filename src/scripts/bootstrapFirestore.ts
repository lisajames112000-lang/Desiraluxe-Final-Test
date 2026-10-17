import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '../services/firebase/adminServer';
import { categories } from '../data/categories';
import { initialProducts } from '../data/products';
import { heroSlides } from '../data/heroSlides';
import { popups } from '../data/popups';
import { cmsPages } from '../data/cmsPages';
import { paymentMethods } from '../data/paymentMethods';
import { brandSettings } from '../data/brandSettings';

const MIGRATION_ID = 'v3-firestore-baseline';
const BASELINE_REVISION = '2026-10-01T00:00:00.000Z';

function removeUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removeUndefined);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined).map(([key, entry]) => [key, removeUndefined(entry)]));
  }
  return value;
}

async function createMissing(path: string, records: Array<{id: string;}>) {
  const db = adminDb();
  let created = 0;
  for (let offset = 0; offset < records.length; offset += 350) {
    const slice = records.slice(offset, offset + 350);
    const snapshots = await db.getAll(...slice.map((record) => db.collection(path).doc(record.id)));
    const batch = db.batch();
    snapshots.forEach((snapshot, index) => {
      if (snapshot.exists) return;
      batch.create(snapshot.ref, { ...(removeUndefined(slice[index]) as Record<string, unknown>), serverUpdatedAt: FieldValue.serverTimestamp() });
      created += 1;
    });
    await batch.commit();
    console.log(`${path}: processed ${Math.min(offset + slice.length, records.length)}/${records.length}`);
  }
  return created;
}

async function main() {
  const uid = process.env.ADMIN_BOOTSTRAP_UID?.trim();
  if (!uid) throw new Error('Set ADMIN_BOOTSTRAP_UID to the already-authorized owner before initialization.');
  const user = await adminAuth().getUser(uid);
  if (user.customClaims?.admin !== true) throw new Error('The bootstrap user does not have the admin custom claim. Run authorize:admin first.');
  const preview = {
    categories: categories.length,
    products: initialProducts.length,
    heroSlides: heroSlides.length,
    popups: popups.length,
    cmsPages: cmsPages.length,
    paymentMethods: paymentMethods.length,
    publication: 'All imported samples remain unpublished, unverified, or disabled.'
  };
  console.log('Staged import preview:', JSON.stringify(preview, null, 2));
  if (process.env.APPROVE_STAGED_IMPORT !== 'yes') throw new Error('Review the import preview, then set APPROVE_STAGED_IMPORT=yes to create only missing staged documents.');
  const db = adminDb();
  const migrationRef = db.collection('system').doc(`migration-${MIGRATION_ID}`);
  const existingMigration = await migrationRef.get();
  if (existingMigration.data()?.status === 'completed') {
    console.log(`Initialization ${MIGRATION_ID} was already completed. No data was changed.`);
    return;
  }
  await migrationRef.set({ id: MIGRATION_ID, status: 'running', startedAt: FieldValue.serverTimestamp(), startedBy: uid }, { merge: true });
  try {
    const stagedProducts = initialProducts.map((product) => ({ ...product, isPublished: false, isVerified: false, isSample: true }));
    const publicProducts = stagedProducts.map(({ costPrice: _costPrice, ...product }) => product);
    const privateProducts = stagedProducts.map((product) => ({ id: product.id, productId: product.id, costPrice: product.costPrice ?? null }));
    const uniqueKeys = stagedProducts.flatMap((product) => [
    { id: `product-slug:${product.slug.toLowerCase()}`, kind: 'productSlug', value: product.slug, entityId: product.id },
    { id: `product-sku:${product.sku.toLowerCase()}`, kind: 'productSku', value: product.sku, entityId: product.id }]
    );
    const results = {
      categories: await createMissing('categories', categories.map((category) => ({ ...category, updatedAt: category.updatedAt || BASELINE_REVISION, isPublished: false, isSample: true }))),
      products: await createMissing('products', publicProducts),
      productPrivate: await createMissing('productPrivate', privateProducts),
      uniqueKeys: await createMissing('uniqueKeys', uniqueKeys),
      heroSlides: await createMissing('heroSlides', heroSlides.map((slide) => ({ ...slide, updatedAt: slide.updatedAt || BASELINE_REVISION, isVisible: false }))),
      popups: await createMissing('popups', popups.map((popup) => ({ ...popup, updatedAt: popup.updatedAt || BASELINE_REVISION, isEnabled: false }))),
      cmsPages: await createMissing('cmsPages', cmsPages.map((page) => ({ ...page, isPublished: false }))),
      paymentMethods: await createMissing('paymentMethodsPublic', paymentMethods.map((method) => ({ ...method, updatedAt: method.updatedAt || BASELINE_REVISION, enabled: false })))
    };
    const publicSettings = db.collection('siteSettings').doc('public');
    if (!(await publicSettings.get()).exists) await publicSettings.create({ ...brandSettings, updatedAt: brandSettings.updatedAt || BASELINE_REVISION, shippingFee: 500, freeShippingThreshold: 10000, timezone: 'Asia/Karachi', initializedAt: FieldValue.serverTimestamp() });
    const orderCounter = db.collection('system').doc('orderCounter');
    if (!(await orderCounter.get()).exists) await orderCounter.create({ value: 0, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    await migrationRef.set({ status: 'completed', completedAt: FieldValue.serverTimestamp(), results }, { merge: true });
    console.log('Initialization completed. Demo catalog remains staged and unpublished until owner review.');
  } catch (error) {
    await migrationRef.set({ status: 'failed', failedAt: FieldValue.serverTimestamp(), error: error instanceof Error ? error.message.slice(0, 500) : 'Unknown failure' }, { merge: true });
    throw error;
  }
}

main().catch((error: unknown) => {console.error(error instanceof Error ? error.message : 'Initialization failed.');process.exitCode = 1;});