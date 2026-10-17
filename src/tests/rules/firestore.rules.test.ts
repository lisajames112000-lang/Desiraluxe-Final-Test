import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { readFile } from 'node:fs/promises';

let environment: RulesTestEnvironment;

const validProduct = {
  id: 'admin-product',
  name: 'Admin product',
  slug: 'admin-product',
  sku: 'ADMIN-PRODUCT',
  categorySlugs: ['published-category'],
  description: 'Rule test product',
  price: 100,
  currency: 'PKR',
  stock: 1,
  variantOptions: [],
  variants: [],
  specifications: [],
  images: [],
  isFeatured: false,
  isNewArrival: false,
  isSample: false,
  isPublished: true,
  isVerified: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    // "demo-" projects are emulator-only and can never reach the live e-commerce-711c0 project.
    projectId: 'demo-desiraluxe-rules',
    firestore: { rules: await readFile('firestore.rules', 'utf8') }
  });
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
    setDoc(doc(db, 'products', 'published'), { ...validProduct, id: 'published', slug: 'published', sku: 'PUB' }),
    setDoc(doc(db, 'products', 'draft'), { ...validProduct, id: 'draft', slug: 'draft', sku: 'DRF', isPublished: false }),
    setDoc(doc(db, 'categories', 'published-category'), { id: 'published-category', isPublished: true, displayOrder: 1 }),
    setDoc(doc(db, 'categories', 'draft-category'), { id: 'draft-category', isPublished: false, displayOrder: 2 }),
    setDoc(doc(db, 'heroSlides', 'visible-hero'), { id: 'visible-hero', isVisible: true, order: 1 }),
    setDoc(doc(db, 'heroSlides', 'hidden-hero'), { id: 'hidden-hero', isVisible: false, order: 2 }),
    setDoc(doc(db, 'popups', 'enabled-popup'), { id: 'enabled-popup', isEnabled: true }),
    setDoc(doc(db, 'popups', 'disabled-popup'), { id: 'disabled-popup', isEnabled: false }),
    setDoc(doc(db, 'cmsPages', 'published-page'), { id: 'published-page', isPublished: true }),
    setDoc(doc(db, 'cmsPages', 'draft-page'), { id: 'draft-page', isPublished: false }),
    setDoc(doc(db, 'paymentMethodsPublic', 'enabled-payment'), { id: 'enabled-payment', enabled: true }),
    setDoc(doc(db, 'paymentMethodsPublic', 'disabled-payment'), { id: 'disabled-payment', enabled: false }),
    setDoc(doc(db, 'siteSettings', 'public'), { storeName: 'Desiraluxe' }),
    setDoc(doc(db, 'siteSettings', 'private'), { internal: true }),
    setDoc(doc(db, 'productPrivate', 'published'), { productId: 'published', costPrice: 50 }),
    setDoc(doc(db, 'orders', 'order-1'), { customerAddress: 'private' }),
    setDoc(doc(db, 'auditLogs', 'audit-1'), { action: 'private' })]
    );
  });
});

afterAll(async () => environment.cleanup());

describe('Firestore public storefront boundaries', () => {
  it('allows signed-out customers to run the exact published storefront queries', async () => {
    const db = environment.unauthenticatedContext().firestore();
    const snapshots = await Promise.all([
    assertSucceeds(getDocs(query(collection(db, 'products'), where('isPublished', '==', true)))),
    assertSucceeds(getDocs(query(collection(db, 'categories'), where('isPublished', '==', true)))),
    assertSucceeds(getDocs(query(collection(db, 'heroSlides'), where('isVisible', '==', true)))),
    assertSucceeds(getDocs(query(collection(db, 'popups'), where('isEnabled', '==', true)))),
    assertSucceeds(getDocs(query(collection(db, 'cmsPages'), where('isPublished', '==', true)))),
    assertSucceeds(getDocs(query(collection(db, 'paymentMethodsPublic'), where('enabled', '==', true))))]
    );
    expect(snapshots.map((snapshot) => snapshot.size)).toEqual([1, 1, 1, 1, 1, 1]);
    await assertSucceeds(getDoc(doc(db, 'siteSettings', 'public')));
  });

  it('denies queries that could return drafts because rules are not filters', async () => {
    const db = environment.unauthenticatedContext().firestore();
    await assertFails(getDocs(collection(db, 'products')));
    await assertFails(getDocs(collection(db, 'categories')));
    await assertFails(getDoc(doc(db, 'products', 'draft')));
    await assertFails(getDoc(doc(db, 'categories', 'draft-category')));
  });

  it('denies signed-out private reads and catalog writes', async () => {
    const db = environment.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'productPrivate', 'published')));
    await assertFails(getDoc(doc(db, 'siteSettings', 'private')));
    await assertFails(getDoc(doc(db, 'orders', 'order-1')));
    await assertFails(getDoc(doc(db, 'auditLogs', 'audit-1')));
    await assertFails(updateDoc(doc(db, 'products', 'published'), { name: 'Unauthorized change' }));
  });

  it('does not treat an ordinary authenticated user as an admin', async () => {
    const db = environment.authenticatedContext('customer').firestore();
    await assertFails(setDoc(doc(db, 'categories', 'customer-write'), { id: 'customer-write', isPublished: true }));
    await assertFails(getDoc(doc(db, 'orders', 'order-1')));
  });

  it('never lets customers write orders, read order access tokens, or touch admin-only collections', async () => {
    const guest = environment.unauthenticatedContext().firestore();
    const customer = environment.authenticatedContext('customer').firestore();
    for (const db of [guest, customer]) {
      await assertFails(setDoc(doc(db, 'orders', 'self-created'), { paymentState: 'approved', total: 0 }));
      await assertFails(updateDoc(doc(db, 'orders', 'order-1'), { paymentState: 'approved' }));
      await assertFails(getDocs(collection(db, 'orders')));
      await assertFails(getDoc(doc(db, 'orderAccess', 'any-token-hash')));
      await assertFails(setDoc(doc(db, 'siteSettings', 'public'), { storeName: 'Hijacked' }));
      await assertFails(setDoc(doc(db, 'system', 'orderCounter'), { value: 0 }));
      await assertFails(setDoc(doc(db, 'auditLogs', 'forged'), { action: 'grant_admin' }));
      await assertFails(getDoc(doc(db, 'unlisted', 'anything')));
    }
  });

  it('allows claim-authorized admin reads but requires trusted server APIs for writes', async () => {
    const admin = environment.authenticatedContext('admin', { admin: true }).firestore();
    await assertSucceeds(getDoc(doc(admin, 'products', 'draft')));
    await assertSucceeds(getDoc(doc(admin, 'productPrivate', 'published')));
    await assertSucceeds(getDoc(doc(admin, 'orders', 'order-1')));
    await assertFails(setDoc(doc(admin, 'categories', 'admin-category'), { id: 'admin-category', isPublished: true, displayOrder: 3 }));
    await assertFails(setDoc(doc(admin, 'products', validProduct.id), validProduct));
    await assertFails(updateDoc(doc(admin, 'siteSettings', 'public'), { storeName: 'Changed in browser' }));
    await assertFails(updateDoc(doc(admin, 'contactMessages', 'missing'), { status: 'resolved' }));
  });
});