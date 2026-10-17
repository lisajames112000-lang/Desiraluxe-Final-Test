import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CartItem } from '../types/cart';
import type { Category, Product, ProductMutation } from '../types/catalog';
import type { Order, FulfillmentState, PaymentState, ShippingDetails, TrackingInfo } from '../types/order';
import type { AccountingPeriod, BrandSettings, CmsPage, HeroSlide, PaymentMethodConfig, PromoPopup } from '../types/settings';
import type { BackendStatus, FirestoreAuthenticationState, MutationResult, PublicResourceName, PublicResourceStatus } from '../types/backend';
import { brandSettings as initialBrandSettings, initialAccountingPeriods } from '../data/brandSettings';
import { categories as initialCategories } from '../data/categories';
import { cmsPages as initialCmsPages } from '../data/cmsPages';
import { heroSlides as initialHeroSlides } from '../data/heroSlides';
import { paymentMethods as initialPaymentMethods } from '../data/paymentMethods';
import { popups as initialPopups } from '../data/popups';
import { initialProducts } from '../data/products';
import { calcSubtotal } from '../utils/money';
import { STORAGE_KEYS, readJSON, writeJSON } from '../utils/storage';
import { addOrMergeCartItem, cartItemKey, changeCartVariant, createCartItem, reconcileCart } from '../utils/cart';
import { canTransitionFulfillment, canTransitionPayment } from '../utils/orderState';
import { firebaseClient } from '../services/firebase/client';
import { subscribeAdminCollection } from '../services/firebase/adminStore';
import { publicQueries, publicQueryDescriptions, subscribeCollection, subscribePublicDocument, type FirestoreReadFailure } from '../services/firebase/publicStore';
import { apiRequest, isDeleteAcknowledgement, isWriteAcknowledgement } from '../services/api';
import { isCheckoutResponse, isIdResponse, type CheckoutResponse } from '../services/apiContracts';
import { compareByUpdatedDesc, normalizeProduct } from '../utils/productNormalize';
import { useAdminAuth } from './AdminAuthContext';

export interface CreateOrderInput {
  shipping: ShippingDetails;
  paymentMethodId: string;
  transactionReference: string;
  idempotencyKey: string;
}

export interface StoreState {
  categories: Category[];
  products: Product[];
  heroSlides: HeroSlide[];
  paymentMethods: PaymentMethodConfig[];
  popups: PromoPopup[];
  cmsPages: CmsPage[];
  brandSettings: BrandSettings;
  orders: Order[];
  cart: CartItem[];
  accountingPeriods: AccountingPeriod[];
  initialized: boolean;
  isPreviewMode: boolean;
  backendStatus: BackendStatus;
  resourceStatuses: Record<PublicResourceName, PublicResourceStatus>;
  cartCount: number;
  cartSubtotal: number;
  cartNotice: string;
  dismissCartNotice: () => void;
  addToCart: (product: Product, quantity?: number, variantId?: string) => MutationResult;
  updateCartQuantity: (key: string, quantity: number) => void;
  updateCartVariant: (key: string, variantId?: string) => MutationResult;
  removeFromCart: (key: string) => void;
  clearCart: () => void;
  createOrder: (input: CreateOrderInput) => Promise<CheckoutResponse>;
  updateProduct: (product: ProductMutation) => Promise<MutationResult>;
  addProduct: (product: ProductMutation) => Promise<MutationResult>;
  archiveProduct: (id: string) => Promise<MutationResult>;
  deleteProduct: (id: string) => Promise<MutationResult>;
  updateCategory: (category: Category) => Promise<MutationResult>;
  addCategory: (category: Category) => Promise<MutationResult>;
  archiveCategory: (id: string) => Promise<MutationResult>;
  deleteCategory: (id: string) => Promise<MutationResult>;
  updateHeroSlide: (slide: HeroSlide) => Promise<MutationResult>;
  addHeroSlide: (slide: HeroSlide) => Promise<MutationResult>;
  deleteHeroSlide: (id: string) => Promise<MutationResult>;
  updatePaymentMethod: (method: PaymentMethodConfig) => Promise<MutationResult>;
  updatePopup: (popup: PromoPopup) => Promise<MutationResult>;
  addPopup: (popup: PromoPopup) => Promise<MutationResult>;
  deletePopup: (id: string) => Promise<MutationResult>;
  updateCmsPage: (page: CmsPage) => Promise<MutationResult>;
  addCmsPage: (page: CmsPage) => Promise<MutationResult>;
  deleteCmsPage: (page: CmsPage) => Promise<MutationResult>;
  updateBrandSettings: (settings: BrandSettings) => Promise<MutationResult>;
  updateOrderState: (id: string, paymentState?: PaymentState, fulfillmentState?: FulfillmentState) => Promise<MutationResult>;
  recordRefund: (id: string, amount: number, reference: string, note: string, requestId: string, expectedUpdatedAt: string) => Promise<MutationResult>;
  updateOrder: (order: Order) => Promise<MutationResult>;
  updateTracking: (id: string, tracking: TrackingInfo) => Promise<MutationResult>;
  markContacted: (id: string) => Promise<MutationResult>;
  startAccountingPeriod: (label: string) => Promise<MutationResult>;
  restoreSamplePreview: () => Promise<MutationResult>;
  exportData: () => string;
  importData: (json: string) => Promise<MutationResult>;
}

const StoreContext = createContext<StoreState | null>(null);

function safeMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message && error.message.length < 220) return error.message;
  return fallback;
}

function withoutServerFields<T extends object>(value: T): T {
  const clean = { ...value } as T & Record<string, unknown>;
  delete clean.serverUpdatedAt;
  delete clean.createdBy;
  delete clean.initializedAt;
  if (!('createdAt' in value && typeof value.createdAt === 'string')) delete clean.createdAt;
  return clean;
}

const PUBLIC_RESOURCE_NAMES: PublicResourceName[] = [
'products',
'categories',
'heroSlides',
'popups',
'cmsPages',
'paymentMethodsPublic',
'siteSettings'];


function initialResourceStatuses(state: PublicResourceStatus['state']): Record<PublicResourceName, PublicResourceStatus> {
  const message = state === 'loading' ? 'Loading from the live store…' : 'Sample preview content is shown.';
  return {
    products: { state, message },
    categories: { state, message },
    heroSlides: { state, message },
    popups: { state, message },
    cmsPages: { state, message },
    paymentMethodsPublic: { state, message },
    siteSettings: { state, message }
  };
}

export function StoreProvider({ children }: {children: React.ReactNode;}) {
  const { isAdmin, state: adminAuthState } = useAdminAuth();
  const demoMode = !firebaseClient.configured;
  const [initialized, setInitialized] = useState(false);
  // Sample catalog content is only used when Firebase is not configured at all.
  // When a live project is configured, collections start empty so a failed or
  // pending Firestore read is never disguised by sample products.
  const [categories, setCategories] = useState<Category[]>(demoMode ? initialCategories : []);
  const [products, setProducts] = useState<Product[]>(demoMode ? initialProducts : []);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(demoMode ? initialHeroSlides : []);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>(demoMode ? initialPaymentMethods : []);
  const [popups, setPopups] = useState<PromoPopup[]>(demoMode ? initialPopups : []);
  const [cmsPages, setCmsPages] = useState<CmsPage[]>(demoMode ? initialCmsPages : []);
  // Brand settings keep the built-in store identity (name, layout defaults) until
  // siteSettings/public is loaded; they contain no catalog or customer data.
  const [brandSettings, setBrandSettings] = useState<BrandSettings>(initialBrandSettings);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => readJSON<CartItem[]>(STORAGE_KEYS.cart, []));
  const [accountingPeriods, setAccountingPeriods] = useState<AccountingPeriod[]>(demoMode ? initialAccountingPeriods : []);
  const [cartNotice, setCartNotice] = useState('');
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({
    state: demoMode ? 'demo' : 'loading',
    message: demoMode ?
    `${firebaseClient.configurationError || 'Firebase is not configured.'} Sample preview content is shown; shared saving and checkout are disabled.` :
    'Connecting to the live store…',
    hasPendingWrites: false
  });
  const [resourceStatuses, setResourceStatuses] = useState<Record<PublicResourceName, PublicResourceStatus>>(
    () => initialResourceStatuses(demoMode ? 'ready' : 'loading')
  );

  useEffect(() => {
    writeJSON(STORAGE_KEYS.cart, cart);
  }, [cart]);

  useEffect(() => {
    if (demoMode) {
      setInitialized(true);
      return;
    }
    const db = firebaseClient.db;
    if (!db) return;
    const authentication: FirestoreAuthenticationState = isAdmin ?
    'verified-admin' :
    firebaseClient.auth?.currentUser ?
    'authenticated-unverified' :
    'signed-out';
    const unsubscribes: Array<() => void> = [];
    const completed = new Set<PublicResourceName>();
    const serverConfirmed = new Set<PublicResourceName>();
    const cached = new Map<PublicResourceName, boolean>();
    const diagnostics = new Map<PublicResourceName, FirestoreReadFailure>();
    let pendingWrites = false;
    setInitialized(false);
    setResourceStatuses(initialResourceStatuses('loading'));
    setBackendStatus((current) => ({
      state: 'loading',
      message: 'Connecting to the live store…',
      hasPendingWrites: false,
      lastConfirmedAt: current.lastConfirmedAt
    }));

    const refreshBackendStatus = () => {
      const finished = new Set([...completed, ...diagnostics.keys()]).size;
      setInitialized(finished === PUBLIC_RESOURCE_NAMES.length);
      if (diagnostics.size > 0) {
        const failures = [...diagnostics.values()];
        const offline = failures.some((failure) => ['unavailable', 'deadline-exceeded'].includes(failure.diagnostic.code)) && !navigator.onLine;
        setBackendStatus((current) => ({
          state: offline ? 'offline' : 'error',
          message: `${failures.length} live resource${failures.length === 1 ? '' : 's'} could not be loaded from Firestore. No sample content is substituted.`,
          hasPendingWrites: false,
          lastConfirmedAt: current.lastConfirmedAt,
          diagnostics: failures.map((failure) => failure.diagnostic)
        }));
        return;
      }
      if (completed.size < PUBLIC_RESOURCE_NAMES.length) {
        setBackendStatus((current) => ({
          state: 'loading',
          message: `Loading live data (${completed.size}/${PUBLIC_RESOURCE_NAMES.length})…`,
          hasPendingWrites: pendingWrites,
          lastConfirmedAt: current.lastConfirmedAt
        }));
        return;
      }
      const fromCache = [...cached.values()].some(Boolean);
      setBackendStatus((current) => ({
        state: fromCache ? 'cached' : 'live',
        message: fromCache ? 'Verified data is retained while Firestore reconnects.' : 'All public live resources are verified and connected.',
        hasPendingWrites: pendingWrites,
        lastConfirmedAt: fromCache ? current.lastConfirmedAt : new Date().toISOString()
      }));
    };

    // Shoppers always see the curated catalog when the live store has nothing published yet
    // (or cannot be read). Admins always see the exact live records so edits stay accurate.
    const applyCuratedFallback = (resource: PublicResourceName): boolean => {
      if (isAdmin) return false;
      if (resource === 'products') setProducts(initialProducts);else
      if (resource === 'categories') setCategories(initialCategories);else
      if (resource === 'heroSlides') setHeroSlides(initialHeroSlides);else
      return false;
      return true;
    };

    const onError = (resource: PublicResourceName) => (failure: FirestoreReadFailure) => {
      const connectionFailure = ['unavailable', 'deadline-exceeded', 'resource-exhausted'].includes(failure.diagnostic.code);
      const state: PublicResourceStatus['state'] = failure.diagnostic.code === 'permission-denied' ?
      'permission-denied' :
      connectionFailure ?
      'connection-error' :
      'error';
      diagnostics.set(resource, failure);
      completed.delete(resource);
      cached.delete(resource);
      const curated = applyCuratedFallback(resource);
      setResourceStatuses((current) => ({
        ...current,
        [resource]: curated ?
        { state: 'ready', message: 'The curated collection is shown while the live store is unavailable.' } :
        { state, message: failure.message, diagnostic: failure.diagnostic }
      }));
      refreshBackendStatus();
    };
    const updateStatus = (resource: PublicResourceName, count: number, fromCache: boolean, hasPendingWrites: boolean) => {
      if (!fromCache) {
        serverConfirmed.add(resource);
        completed.add(resource);
        diagnostics.delete(resource);
      }
      cached.set(resource, fromCache);
      pendingWrites = pendingWrites || hasPendingWrites;
      setResourceStatuses((current) => ({
        ...current,
        [resource]: fromCache && !serverConfirmed.has(resource) ?
        { state: 'loading', message: 'A cache snapshot was found; waiting for server verification.' } :
        { state: count > 0 ? 'ready' : 'empty', message: count > 0 ? 'Published records loaded.' : 'No published records exist.' }
      }));
      refreshBackendStatus();
    };
    const shouldApply = (resource: PublicResourceName, fromCache: boolean) => !fromCache || serverConfirmed.has(resource);
    const descriptor = <K extends keyof typeof publicQueryDescriptions,>(resource: K) => isAdmin ?
    { filters: [], orderBy: [], authentication } :
    { ...publicQueryDescriptions[resource], authentication };

    unsubscribes.push(subscribeCollection<unknown>(db, 'products', isAdmin ? [] : publicQueries.products, descriptor('products'), (snapshot) => {const curated = !isAdmin && snapshot.data.length === 0;if (shouldApply('products', snapshot.fromCache)) setProducts(curated ? initialProducts : snapshot.data.map(normalizeProduct).sort(compareByUpdatedDesc));updateStatus('products', curated ? initialProducts.length : snapshot.data.length, snapshot.fromCache, snapshot.hasPendingWrites);}, onError('products')));
    unsubscribes.push(subscribeCollection<Category>(db, 'categories', isAdmin ? [] : publicQueries.categories, descriptor('categories'), (snapshot) => {const curated = !isAdmin && snapshot.data.length === 0;if (shouldApply('categories', snapshot.fromCache)) setCategories(curated ? initialCategories : [...snapshot.data].sort((a, b) => a.displayOrder - b.displayOrder));updateStatus('categories', curated ? initialCategories.length : snapshot.data.length, snapshot.fromCache, snapshot.hasPendingWrites);}, onError('categories')));
    unsubscribes.push(subscribeCollection<HeroSlide>(db, 'heroSlides', isAdmin ? [] : publicQueries.heroSlides, descriptor('heroSlides'), (snapshot) => {const curated = !isAdmin && snapshot.data.length === 0;if (shouldApply('heroSlides', snapshot.fromCache)) setHeroSlides(curated ? initialHeroSlides : [...snapshot.data].sort((a, b) => a.order - b.order));updateStatus('heroSlides', curated ? initialHeroSlides.length : snapshot.data.length, snapshot.fromCache, snapshot.hasPendingWrites);}, onError('heroSlides')));
    unsubscribes.push(subscribeCollection<PromoPopup>(db, 'popups', isAdmin ? [] : publicQueries.popups, descriptor('popups'), (snapshot) => {if (shouldApply('popups', snapshot.fromCache)) setPopups(snapshot.data);updateStatus('popups', snapshot.data.length, snapshot.fromCache, snapshot.hasPendingWrites);}, onError('popups')));
    unsubscribes.push(subscribeCollection<CmsPage>(db, 'cmsPages', isAdmin ? [] : publicQueries.cmsPages, descriptor('cmsPages'), (snapshot) => {if (shouldApply('cmsPages', snapshot.fromCache)) setCmsPages(snapshot.data);updateStatus('cmsPages', snapshot.data.length, snapshot.fromCache, snapshot.hasPendingWrites);}, onError('cmsPages')));
    unsubscribes.push(subscribeCollection<PaymentMethodConfig>(db, 'paymentMethodsPublic', isAdmin ? [] : publicQueries.paymentMethodsPublic, descriptor('paymentMethodsPublic'), (snapshot) => {if (shouldApply('paymentMethodsPublic', snapshot.fromCache)) setPaymentMethods(snapshot.data);updateStatus('paymentMethodsPublic', snapshot.data.length, snapshot.fromCache, snapshot.hasPendingWrites);}, onError('paymentMethodsPublic')));
    unsubscribes.push(subscribePublicDocument<BrandSettings>(db, 'siteSettings', 'public', authentication, (snapshot) => {if (snapshot.data && shouldApply('siteSettings', snapshot.fromCache)) setBrandSettings({ ...initialBrandSettings, ...snapshot.data });updateStatus('siteSettings', snapshot.data ? 1 : 0, snapshot.fromCache, snapshot.hasPendingWrites);}, onError('siteSettings')));

    const onAdminError = (message: string) => setBackendStatus({ state: navigator.onLine ? 'error' : 'offline', message, hasPendingWrites: false });
    if (isAdmin) {
      unsubscribes.push(subscribeAdminCollection<Order>(db, 'orders', setOrders, onAdminError));
      unsubscribes.push(subscribeAdminCollection<AccountingPeriod>(db, 'accountingPeriods', setAccountingPeriods, onAdminError));
    } else {
      setOrders([]);
      setAccountingPeriods([]);
    }
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [adminAuthState, demoMode, isAdmin]);

  useEffect(() => {
    if (!products.length || !cart.length) return;
    setCart((current) => {
      const result = reconcileCart(current, products);
      if (result.changed) setCartNotice('Your cart was updated to match current prices, publication, and availability.');
      return result.changed ? result.cart : current;
    });
  }, [products]);

  const mutation = useCallback(async (action: () => Promise<void>, success: string): Promise<MutationResult> => {
    try {
      await action();
      return { ok: true, message: success };
    } catch (error) {
      return { ok: false, message: safeMessage(error, 'The change could not be saved. Check your connection and retry.') };
    }
  }, []);

  const addToCart = useCallback((product: Product, quantity = 1, variantId?: string): MutationResult => {
    const item = createCartItem(product, quantity, variantId);
    if (!item) return { ok: false, message: product.variants.length && !variantId ? 'Choose an available variant first.' : 'This item is unavailable.' };
    setCart((current) => addOrMergeCartItem(current, item));
    return { ok: true, message: 'Added to cart.' };
  }, []);

  const updateCartQuantity = useCallback((key: string, quantity: number) => {
    if (!Number.isInteger(quantity) || quantity <= 0) return;
    setCart((current) => current.map((item) => cartItemKey(item) === key ? { ...item, quantity: Math.min(item.maxStock, quantity) } : item));
  }, []);

  const updateCartVariant = useCallback((key: string, variantId?: string): MutationResult => {
    if (!variantId) return { ok: false, message: 'Choose an available variant.' };
    const item = cart.find((candidate) => cartItemKey(candidate) === key);
    const product = products.find((candidate) => candidate.id === item?.productId);
    if (!product) return { ok: false, message: 'This product is no longer available.' };
    const variant = product.variants.find((candidate) => candidate.id === variantId);
    if (!variant || variant.stock <= 0) return { ok: false, message: 'That variant is unavailable.' };
    setCart((current) => changeCartVariant(current, key, product, variantId));
    return { ok: true, message: 'Cart variant updated.' };
  }, [cart, products]);

  const removeFromCart = useCallback((key: string) => setCart((current) => current.filter((item) => cartItemKey(item) !== key)), []);
  const clearCart = useCallback(() => setCart([]), []);

  const createOrder = useCallback(async (input: CreateOrderInput) => {
    if (backendStatus.state !== 'live') throw new Error('Checkout remains disabled until all live catalog resources are verified.');
    const response = await apiRequest('/api/orders/create', {
      method: 'POST',
      body: JSON.stringify({ ...input, items: cart.map((item) => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity })) })
    }, false, isCheckoutResponse, 20_000);
    setCart([]);
    return response;
  }, [backendStatus.state, cart]);

  const updateProduct = useCallback((product: ProductMutation) => mutation(() => apiRequest('/api/admin/products/save', { method: 'POST', body: JSON.stringify({ product: withoutServerFields(product), expectedUpdatedAt: product.updatedAt }) }, true, isWriteAcknowledgement).then(() => undefined), 'Product saved.'), [mutation]);
  const addProduct = useCallback((product: ProductMutation) => mutation(() => apiRequest('/api/admin/products/save', { method: 'POST', body: JSON.stringify({ product: withoutServerFields(product) }) }, true, isWriteAcknowledgement).then(() => undefined), 'Product created.'), [mutation]);
  const archiveProduct = useCallback((id: string) => {
    const product = products.find((item) => item.id === id);
    return product ? updateProduct({ ...product, isPublished: false }) : Promise.resolve({ ok: false, message: 'Product not found.' });
  }, [products, updateProduct]);
  const deleteProduct = useCallback((id: string) => mutation(() => apiRequest('/api/admin/products/delete', { method: 'POST', body: JSON.stringify({ id }) }, true, isDeleteAcknowledgement).then(() => undefined), 'Product deleted.'), [mutation]);

  const saveContent = useCallback(<T extends {id: string;updatedAt?: string;},>(resource: string, value: T, success: string) => mutation(
    () => apiRequest('/api/admin/content/save', { method: 'POST', body: JSON.stringify({ resource, item: withoutServerFields(value), expectedUpdatedAt: value.updatedAt }) }, true, isWriteAcknowledgement).then(() => undefined),
    success
  ), [mutation]);
  const deleteContent = useCallback((resource: string, id: string, success: string) => mutation(
    () => apiRequest('/api/admin/content/delete', { method: 'POST', body: JSON.stringify({ resource, id }) }, true, isDeleteAcknowledgement).then(() => undefined),
    success
  ), [mutation]);

  const updateCategory = useCallback((value: Category) => saveContent('categories', value, 'Category saved.'), [saveContent]);
  const addCategory = updateCategory;
  const archiveCategory = useCallback((id: string) => {
    const category = categories.find((item) => item.id === id);
    return category ? updateCategory({ ...category, isPublished: false }) : Promise.resolve({ ok: false, message: 'Category not found.' });
  }, [categories, updateCategory]);
  const deleteCategory = useCallback((id: string) => deleteContent('categories', id, 'Category deleted.'), [deleteContent]);

  const updateHeroSlide = useCallback((value: HeroSlide) => saveContent('heroSlides', value, 'Hero slide saved.'), [saveContent]);
  const addHeroSlide = updateHeroSlide;
  const deleteHeroSlide = useCallback((id: string) => deleteContent('heroSlides', id, 'Hero slide deleted.'), [deleteContent]);
  const updatePaymentMethod = useCallback((value: PaymentMethodConfig) => saveContent('paymentMethodsPublic', value, 'Payment method saved.'), [saveContent]);
  const updatePopup = useCallback((value: PromoPopup) => saveContent('popups', value, 'Popup saved.'), [saveContent]);
  const addPopup = updatePopup;
  const deletePopup = useCallback((id: string) => deleteContent('popups', id, 'Popup deleted.'), [deleteContent]);
  const updateCmsPage = useCallback((value: CmsPage) => saveContent('cmsPages', value, 'Page saved.'), [saveContent]);
  const addCmsPage = updateCmsPage;
  const deleteCmsPage = useCallback((page: CmsPage) => page.isSystem ? Promise.resolve({ ok: false, message: 'System pages cannot be deleted.' }) : deleteContent('cmsPages', page.id, 'Page deleted.'), [deleteContent]);
  const updateBrandSettings = useCallback((settings: BrandSettings) => mutation(
    () => apiRequest('/api/admin/settings/save', { method: 'POST', body: JSON.stringify({ settings: withoutServerFields(settings), expectedUpdatedAt: settings.updatedAt }) }, true, isWriteAcknowledgement).then(() => undefined),
    'Store settings saved.'
  ), [mutation]);

  const updateOrderState = useCallback((id: string, paymentState?: PaymentState, fulfillmentState?: FulfillmentState) => {
    const current = orders.find((order) => order.id === id);
    if (!current) return Promise.resolve({ ok: false, message: 'Order not found.' });
    if (paymentState && !canTransitionPayment(current.paymentState, paymentState)) return Promise.resolve({ ok: false, message: `Payment cannot move from ${current.paymentState} to ${paymentState}.` });
    if (fulfillmentState && !canTransitionFulfillment(current.fulfillmentState, fulfillmentState)) return Promise.resolve({ ok: false, message: `Fulfillment cannot move from ${current.fulfillmentState} to ${fulfillmentState}.` });
    return mutation(() => apiRequest(`/api/admin/orders/${encodeURIComponent(id)}/state`, { method: 'POST', body: JSON.stringify({ paymentState, fulfillmentState }) }, true, isWriteAcknowledgement).then(() => undefined), 'Order state saved.');
  }, [mutation, orders]);
  const recordRefund = useCallback((id: string, amount: number, reference: string, note: string, requestId: string, expectedUpdatedAt: string) => mutation(
    () => apiRequest(`/api/admin/orders/${encodeURIComponent(id)}/refund`, { method: 'POST', body: JSON.stringify({ amount, reference, note, requestId, expectedUpdatedAt }) }, true, isWriteAcknowledgement).then(() => undefined),
    'Refund record saved. This records owner-confirmed financial activity; it does not initiate provider settlement.'
  ), [mutation]);
  const updateOrder = useCallback((order: Order) => mutation(() => apiRequest(`/api/admin/orders/${encodeURIComponent(order.id)}/update`, { method: 'POST', body: JSON.stringify({ internalNotes: order.internalNotes || '', expectedUpdatedAt: order.updatedAt }) }, true, isWriteAcknowledgement).then(() => undefined), 'Order details saved.'), [mutation]);
  const updateTracking = useCallback((id: string, tracking: TrackingInfo) => {
    const order = orders.find((item) => item.id === id);
    return order ? mutation(() => apiRequest(`/api/admin/orders/${encodeURIComponent(id)}/update`, { method: 'POST', body: JSON.stringify({ tracking, expectedUpdatedAt: order.updatedAt }) }, true, isWriteAcknowledgement).then(() => undefined), 'Tracking saved.') : Promise.resolve({ ok: false, message: 'Order not found.' });
  }, [mutation, orders]);
  const markContacted = useCallback((id: string) => {
    const order = orders.find((item) => item.id === id);
    return order ? mutation(() => apiRequest(`/api/admin/orders/${encodeURIComponent(id)}/update`, { method: 'POST', body: JSON.stringify({ contactedViaWhatsapp: true, expectedUpdatedAt: order.updatedAt }) }, true, isWriteAcknowledgement).then(() => undefined), 'Contact marker saved.') : Promise.resolve({ ok: false, message: 'Order not found.' });
  }, [mutation, orders]);
  const startAccountingPeriod = useCallback((label: string) => mutation(() => apiRequest('/api/admin/accounting/periods', { method: 'POST', body: JSON.stringify({ label }) }, true, isIdResponse).then(() => undefined), 'Accounting period started.'), [mutation]);
  const restoreSamplePreview = useCallback(async () => ({ ok: false, message: 'Sample restore is disabled for live business data.' }), []);

  const exportData = useCallback(() => JSON.stringify({ schemaVersion: 3, exportedAt: new Date().toISOString(), categories, products, heroSlides, paymentMethods, popups, cmsPages, brandSettings, accountingPeriods }, null, 2), [accountingPeriods, brandSettings, categories, cmsPages, heroSlides, paymentMethods, popups, products]);
  const importData = useCallback(async (json: string): Promise<MutationResult> => {
    try {
      const parsed: unknown = JSON.parse(json);
      if (!parsed || typeof parsed !== 'object' || !('products' in parsed) || !('categories' in parsed)) return { ok: false, message: 'Backup is missing required products or categories.' };
      return { ok: false, message: 'Import requires dry-run review. Use the server migration command after validating the backup.' };
    } catch {
      return { ok: false, message: 'That file is not valid JSON.' };
    }
  }, []);

  const value = useMemo<StoreState>(() => ({
    categories, products, heroSlides, paymentMethods, popups, cmsPages, brandSettings, orders, cart, accountingPeriods, initialized, isPreviewMode: demoMode || backendStatus.state !== 'live', backendStatus, resourceStatuses,
    cartCount: cart.reduce((sum, item) => sum + item.quantity, 0), cartSubtotal: calcSubtotal(cart), cartNotice, dismissCartNotice: () => setCartNotice(''),
    addToCart, updateCartQuantity, updateCartVariant, removeFromCart, clearCart, createOrder,
    updateProduct, addProduct, archiveProduct, deleteProduct, updateCategory, addCategory, archiveCategory, deleteCategory,
    updateHeroSlide, addHeroSlide, deleteHeroSlide, updatePaymentMethod, updatePopup, addPopup, deletePopup, updateCmsPage, addCmsPage, deleteCmsPage, updateBrandSettings,
    updateOrderState, recordRefund, updateOrder, updateTracking, markContacted, startAccountingPeriod, restoreSamplePreview, exportData, importData
  }), [accountingPeriods, addCategory, addCmsPage, addHeroSlide, addPopup, addProduct, addToCart, archiveCategory, archiveProduct, backendStatus, brandSettings, cart, cartNotice, categories, clearCart, cmsPages, createOrder, deleteCategory, deleteCmsPage, deleteHeroSlide, deletePopup, deleteProduct, demoMode, exportData, heroSlides, importData, initialized, markContacted, orders, paymentMethods, popups, products, recordRefund, removeFromCart, resourceStatuses, restoreSamplePreview, startAccountingPeriod, updateBrandSettings, updateCartQuantity, updateCartVariant, updateCategory, updateCmsPage, updateHeroSlide, updateOrder, updateOrderState, updatePaymentMethod, updatePopup, updateProduct, updateTracking]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreState {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used inside StoreProvider');
  return context;
}

export function getCartItemKey(item: Pick<CartItem, 'productId' | 'variantId'>): string {
  return cartItemKey(item);
}