import { firebaseClient } from './firebase/client';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export type ApiResponseValidator<T> = (payload: unknown) => payload is T;

export interface WriteAcknowledgement {
  saved: true;
  id: string;
  updatedAt: string;
}

export interface DeleteAcknowledgement {
  deleted: true;
  id: string;
}

export interface RecordedAcknowledgement {
  recorded: true;
  id: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export const isWriteAcknowledgement: ApiResponseValidator<WriteAcknowledgement> = (payload): payload is WriteAcknowledgement =>
isRecord(payload) && payload.saved === true && isNonEmptyString(payload.id) && isNonEmptyString(payload.updatedAt);

export const isDeleteAcknowledgement: ApiResponseValidator<DeleteAcknowledgement> = (payload): payload is DeleteAcknowledgement =>
isRecord(payload) && payload.deleted === true && isNonEmptyString(payload.id);

export const isRecordedAcknowledgement: ApiResponseValidator<RecordedAcknowledgement> = (payload): payload is RecordedAcknowledgement =>
isRecord(payload) && payload.recorded === true && isNonEmptyString(payload.id);

export function hasStringFields<T>(...fields: string[]): ApiResponseValidator<T> {
  return (payload: unknown): payload is T => isRecord(payload) && fields.every((field) => isNonEmptyString(payload[field]));
}

async function authHeader(): Promise<Record<string, string>> {
  const token = await firebaseClient.auth?.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function endpoint(path: string): string {
  const base = import.meta.env.VITE_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, '');
  return base ? `${base}${path.startsWith('/') ? path : `/${path}`}` : path;
}

function responseError(payload: unknown, fallback: string): string {
  return isRecord(payload) && isNonEmptyString(payload.error) ? payload.error : fallback;
}

export async function apiRequest<T>(
path: string,
init: RequestInit,
authenticated: boolean,
validate: ApiResponseValidator<T>,
timeoutMs = 15_000)
: Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body !== undefined && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (authenticated) Object.entries(await authHeader()).forEach(([key, value]) => headers.set(key, value));

  const controller = new AbortController();
  const onAbort = () => controller.abort(init.signal?.reason);
  if (init.signal?.aborted) onAbort();else
  init.signal?.addEventListener('abort', onAbort, { once: true });
  const timeout = globalThis.setTimeout(() => controller.abort(new DOMException('Request timed out.', 'TimeoutError')), timeoutMs);

  try {
    const response = await fetch(endpoint(path), { ...init, headers, cache: 'no-store', signal: controller.signal });
    const contentType = response.headers.get('content-type')?.toLowerCase() || '';
    if (!contentType.includes('json')) {
      throw new ApiError(response.ok ? 'The server returned an unexpected non-JSON response.' : 'The request could not be completed.', response.status);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ApiError('The server returned malformed JSON.', response.status);
    }

    if (!response.ok) {
      throw new ApiError(responseError(payload, `The request failed with status ${response.status}.`), response.status);
    }
    if (!validate(payload)) {
      throw new ApiError('The server response did not confirm the requested operation.', response.status);
    }
    return payload;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) {
      if (init.signal?.aborted) throw new ApiError('The request was cancelled.', 0);
      throw new ApiError('The request timed out before the server confirmed the operation.', 0);
    }
    throw new ApiError('The server could not be reached. Your changes were not confirmed.', 0);
  } finally {
    globalThis.clearTimeout(timeout);
    init.signal?.removeEventListener('abort', onAbort);
  }
}