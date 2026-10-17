import type { ProductMutation } from '../types/catalog';
import type { Order } from '../types/order';
import type { PublicOrder } from '../types/publicOrder';
import type { ApiResponseValidator } from './api';

export interface CheckoutResponse {
  order: Pick<Order, 'id' | 'reference' | 'total' | 'currency'>;
  accessToken: string;
}

export interface PrivateProductResponse {
  id: string;
  costPrice: number | null;
}

export interface SignedUploadResponse {
  mediaId: string;
  uploadUrl: string;
  fields: Record<string, string>;
}

export interface CloudinaryUploadResult {
  public_id: string;
  version: number;
  signature: string;
}

export interface CompletedUploadResponse {
  mediaId: string;
  url: string;
  key: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export const isCheckoutResponse: ApiResponseValidator<CheckoutResponse> = (payload): payload is CheckoutResponse => {
  if (!isRecord(payload) || !isRecord(payload.order) || !isString(payload.accessToken)) return false;
  return isString(payload.order.id) &&
  isString(payload.order.reference) &&
  isNumber(payload.order.total) &&
  payload.order.currency === 'PKR';
};

export const isPrivateProductResponse: ApiResponseValidator<PrivateProductResponse> = (payload): payload is PrivateProductResponse =>
isRecord(payload) &&
isString(payload.id) && (
payload.costPrice === null || Number.isSafeInteger(payload.costPrice) && Number(payload.costPrice) >= 0);

export const isSignedUploadResponse: ApiResponseValidator<SignedUploadResponse> = (payload): payload is SignedUploadResponse =>
isRecord(payload) &&
isString(payload.mediaId) &&
isString(payload.uploadUrl) &&
/^https:\/\/api\.cloudinary\.com\/v1_1\/[A-Za-z0-9_-]+\/(image|video)\/upload$/.test(payload.uploadUrl) &&
isRecord(payload.fields) &&
Object.values(payload.fields).every((value) => typeof value === 'string') &&
isString(payload.fields.signature) &&
isString(payload.fields.api_key) &&
isString(payload.fields.timestamp);

export function isCloudinaryUploadResult(payload: unknown): payload is CloudinaryUploadResult {
  return isRecord(payload) && isString(payload.public_id) && Number.isSafeInteger(payload.version) && isString(payload.signature);
}

export const isCompletedUploadResponse: ApiResponseValidator<CompletedUploadResponse> = (payload): payload is CompletedUploadResponse =>
isRecord(payload) && isString(payload.mediaId) && isString(payload.url) && isString(payload.key) && /^https:\/\//.test(payload.url);

export const isPublicOrderResponse: ApiResponseValidator<PublicOrder> = (payload): payload is PublicOrder => {
  if (!isRecord(payload) || !Array.isArray(payload.items) || !isRecord(payload.shipping)) return false;
  return isString(payload.id) &&
  isString(payload.reference) &&
  isNumber(payload.total) &&
  payload.currency === 'PKR' &&
  isString(payload.shipping.fullName) &&
  isString(payload.shipping.city) &&
  isString(payload.shipping.country) &&
  isString(payload.createdAt) &&
  isString(payload.updatedAt);
};

export const isIdResponse: ApiResponseValidator<{id: string;}> = (payload): payload is {id: string;} =>
isRecord(payload) && isString(payload.id);

export function productWithPrivateCost(product: ProductMutation, costPrice: number | null | undefined): ProductMutation {
  if (costPrice === undefined) {
    const { costPrice: _omitted, ...publicProduct } = product;
    return publicProduct;
  }
  return { ...product, costPrice };
}