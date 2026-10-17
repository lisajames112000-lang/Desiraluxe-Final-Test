export type ConnectionState = 'demo' | 'loading' | 'live' | 'cached' | 'offline' | 'error';

export type PublicResourceName = 'products' | 'categories' | 'heroSlides' | 'popups' | 'cmsPages' | 'paymentMethodsPublic' | 'siteSettings';
export type PublicResourceState = 'loading' | 'ready' | 'empty' | 'permission-denied' | 'connection-error' | 'error';
export type FirestoreAuthenticationState = 'signed-out' | 'authenticated-unverified' | 'verified-admin';

export interface FirestoreDiagnostic {
  path: string;
  operation: 'get' | 'list';
  filters: string[];
  orderBy: string[];
  limit?: number;
  authentication: FirestoreAuthenticationState;
  code: string;
}

export interface PublicResourceStatus {
  state: PublicResourceState;
  message: string;
  diagnostic?: FirestoreDiagnostic;
}

export interface BackendStatus {
  state: ConnectionState;
  message: string;
  hasPendingWrites: boolean;
  lastConfirmedAt?: string;
  diagnostics?: FirestoreDiagnostic[];
}

export interface MutationResult {
  ok: boolean;
  message: string;
}