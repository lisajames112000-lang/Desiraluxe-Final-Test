import {
  collection,
  doc,
  limit,
  onSnapshot,
  query,
  where,
  type Firestore,
  type QueryConstraint,
  type Unsubscribe } from
'firebase/firestore';
import type { FirestoreAuthenticationState, FirestoreDiagnostic } from '../../types/backend';

export interface LiveSnapshot<T> {
  data: T;
  fromCache: boolean;
  hasPendingWrites: boolean;
}

interface ReadDescriptor {
  filters: string[];
  orderBy: string[];
  authentication: FirestoreAuthenticationState;
}

export interface FirestoreReadFailure {
  message: string;
  diagnostic: FirestoreDiagnostic;
}

export type LiveErrorHandler = (failure: FirestoreReadFailure) => void;

// Full canonical Firestore error-code set so no real cause is collapsed into "unknown".
const knownErrorCodes = new Set([
'cancelled',
'unknown',
'invalid-argument',
'deadline-exceeded',
'not-found',
'already-exists',
'permission-denied',
'resource-exhausted',
'failed-precondition',
'aborted',
'out-of-range',
'unimplemented',
'internal',
'unavailable',
'data-loss',
'unauthenticated']
);

function sanitizedCode(error: unknown): string {
  const raw = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'unknown';
  const code = raw.startsWith('firestore/') ? raw.slice('firestore/'.length) : raw;
  return knownErrorCodes.has(code) ? code : 'unknown';
}

function errorMessage(code: string): string {
  if (code === 'permission-denied') return 'Access to live store data was denied. The deployed Firestore rules do not permit this operation.';
  if (code === 'failed-precondition') return 'A required Firestore index is missing. Deploy firestore.indexes.json.';
  if (code === 'resource-exhausted') return 'Firestore quota is temporarily exhausted. Please retry later.';
  if (['unavailable', 'deadline-exceeded'].includes(code)) return 'Live store data is temporarily unavailable. Check your connection.';
  if (code === 'unauthenticated') return 'Firebase rejected the authentication state for this operation.';
  if (code === 'not-found') return 'The Firestore (default) database was not found for this project. Create it in the Firebase console.';
  if (code === 'invalid-argument') return 'Firestore rejected the query shape for this read.';
  return 'Live store data could not be loaded.';
}

function readFailure(error: unknown, diagnostic: Omit<FirestoreDiagnostic, 'code'>): FirestoreReadFailure {
  const code = sanitizedCode(error);
  const details = [
  `code=${code}`,
  `operation=${diagnostic.operation}`,
  `path=${diagnostic.path}`,
  `filters=${diagnostic.filters.length ? diagnostic.filters.join(' AND ') : 'none'}`,
  `orderBy=${diagnostic.orderBy.length ? diagnostic.orderBy.join(', ') : 'none'}`,
  diagnostic.limit ? `limit=${diagnostic.limit}` : '',
  `auth=${diagnostic.authentication}`].
  filter(Boolean).join('; ');
  return { message: `${errorMessage(code)} (${details})`, diagnostic: { ...diagnostic, code } };
}

export function subscribeCollection<T>(
db: Firestore,
path: string,
constraints: QueryConstraint[],
descriptor: ReadDescriptor,
onData: (snapshot: LiveSnapshot<T[]>) => void,
onError: LiveErrorHandler)
: Unsubscribe {
  const queryLimit = 500;
  const boundedQuery = query(collection(db, path), ...constraints, limit(queryLimit));
  const diagnostic = { path, operation: 'list' as const, filters: descriptor.filters, orderBy: descriptor.orderBy, limit: queryLimit, authentication: descriptor.authentication };
  return onSnapshot(boundedQuery, { includeMetadataChanges: true }, (snapshot) => {
    // Fall back to the Firestore document id when a record has no `id` field.
    onData({ data: snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }) as T), fromCache: snapshot.metadata.fromCache, hasPendingWrites: snapshot.metadata.hasPendingWrites });
  }, (error) => onError(readFailure(error, diagnostic)));
}

export function subscribePublicDocument<T>(
db: Firestore,
collectionPath: string,
documentId: string,
authentication: FirestoreAuthenticationState,
onData: (snapshot: LiveSnapshot<T | null>) => void,
onError: LiveErrorHandler)
: Unsubscribe {
  const path = `${collectionPath}/${documentId}`;
  const diagnostic = { path, operation: 'get' as const, filters: [], orderBy: [], authentication };
  return onSnapshot(doc(db, collectionPath, documentId), { includeMetadataChanges: true }, (snapshot) => {
    onData({ data: snapshot.exists() ? snapshot.data() as T : null, fromCache: snapshot.metadata.fromCache, hasPendingWrites: snapshot.metadata.hasPendingWrites });
  }, (error) => onError(readFailure(error, diagnostic)));
}

// Keep public reads to a single publication filter so they work on a new Spark
// project without waiting for composite indexes. Display ordering is applied to
// the verified snapshots in StoreContext.
export const publicQueries = {
  products: [where('isPublished', '==', true)],
  categories: [where('isPublished', '==', true)],
  heroSlides: [where('isVisible', '==', true)],
  popups: [where('isEnabled', '==', true)],
  cmsPages: [where('isPublished', '==', true)],
  paymentMethodsPublic: [where('enabled', '==', true)]
};

export const publicQueryDescriptions = {
  products: { filters: ['isPublished == true'], orderBy: [] },
  categories: { filters: ['isPublished == true'], orderBy: [] },
  heroSlides: { filters: ['isVisible == true'], orderBy: [] },
  popups: { filters: ['isEnabled == true'], orderBy: [] },
  cmsPages: { filters: ['isPublished == true'], orderBy: [] },
  paymentMethodsPublic: { filters: ['enabled == true'], orderBy: [] }
};