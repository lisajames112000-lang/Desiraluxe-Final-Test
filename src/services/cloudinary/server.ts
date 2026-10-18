import { z } from 'zod';
import { cloudinarySignature, signaturesMatch, type SignatureAlgorithm } from './signature.js';

// Server-only Cloudinary adapter. Credentials are read from process.env and never returned to callers.

export type CloudinaryResourceType = 'image' | 'video';

export interface SignedCloudinaryUpload {
  uploadUrl: string;
  fields: Record<string, string>;
  expiresInSeconds: number;
}

export interface CloudinaryResource {
  publicId: string;
  version: number;
  format: string;
  resourceType: string;
  deliveryType: string;
  bytes: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  secureUrl: string;
}

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  algorithm: SignatureAlgorithm;
}

export const CLOUDINARY_MEDIA_ROOT = 'desiraluxe';
const API_ORIGIN = 'https://api.cloudinary.com/v1_1';
const REQUEST_TIMEOUT_MS = 15_000;
const SIGNATURE_LIFETIME_SECONDS = 3600;
const CLOUD_NAME_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const FORMAT_BY_CONTENT_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'video/mp4': 'mp4',
  'video/webm': 'webm'
};

const resourceSchema = z.object({
  public_id: z.string(),
  version: z.number().int(),
  format: z.string(),
  resource_type: z.string(),
  type: z.string(),
  bytes: z.number().int().nonnegative(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  duration: z.number().nonnegative().optional(),
  secure_url: z.string().url()
}).passthrough();

function readConfig(): CloudinaryConfig | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() || '';
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim() || '';
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim() || '';
  const algorithm = process.env.CLOUDINARY_SIGNATURE_ALGORITHM?.trim().toLowerCase() || 'sha1';
  if (!CLOUD_NAME_PATTERN.test(cloudName) || !/^\d{6,24}$/.test(apiKey) || apiSecret.length < 10) return null;
  if (algorithm !== 'sha1' && algorithm !== 'sha256') return null;
  return { cloudName, apiKey, apiSecret, algorithm };
}

function requireConfig(): CloudinaryConfig {
  const config = readConfig();
  if (!config) throw new Error('CLOUDINARY_NOT_CONFIGURED');
  return config;
}

function timestamp(): string {
  return String(Math.floor(Date.now() / 1000));
}

export function isCloudinaryConfigured(): boolean {
  return readConfig() !== null;
}

export function cloudinaryFormat(contentType: string): string | null {
  return FORMAT_BY_CONTENT_TYPE[contentType] ?? null;
}

export function normalizeFormat(format: string): string {
  const value = format.toLowerCase();
  return value === 'jpeg' ? 'jpg' : value;
}

export function mediaPublicId(role: string, entityId: string, mediaId: string): string {
  return `${CLOUDINARY_MEDIA_ROOT}/${role}/${entityId}/${mediaId}`;
}

/** Returns the Firestore media id for a delivery URL that this store uploaded to Cloudinary. */
export function managedMediaIdFromUrl(url: string): string | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() || '';
  if (!CLOUD_NAME_PATTERN.test(cloudName)) return null;
  const pattern = new RegExp(`^https://res\\.cloudinary\\.com/${cloudName}/(?:image|video)/upload/(?:v\\d+/)?${CLOUDINARY_MEDIA_ROOT}/[A-Za-z]+/[A-Za-z0-9_-]+/([a-f0-9]{32})\\.[a-z0-9]+$`);
  return url.match(pattern)?.[1] ?? null;
}

export function createSignedUpload(input: {publicId: string;resourceType: CloudinaryResourceType;allowedFormats: string[];deliveryType?: 'authenticated';}): SignedCloudinaryUpload {
  const config = requireConfig();
  const params = {
    ...(input.deliveryType ? { type: input.deliveryType } : {}),
    allowed_formats: input.allowedFormats.join(','),
    overwrite: 'false',
    public_id: input.publicId,
    timestamp: timestamp()
  };
  const signature = cloudinarySignature(params, config.apiSecret, config.algorithm);
  return {
    uploadUrl: `${API_ORIGIN}/${config.cloudName}/${input.resourceType}/upload`,
    fields: { ...params, api_key: config.apiKey, signature },
    expiresInSeconds: SIGNATURE_LIFETIME_SECONDS
  };
}

/** Verifies the signature Cloudinary attaches to every upload response. */
export function verifyUploadResponseSignature(publicId: string, version: number, signature: string): boolean {
  const config = requireConfig();
  const expected = cloudinarySignature({ public_id: publicId, version }, config.apiSecret, config.algorithm);
  return signaturesMatch(expected, signature);
}

/** Reads authoritative asset metadata from the Cloudinary Admin API. Returns null when the asset does not exist. */
export async function fetchResource(publicId: string, resourceType: CloudinaryResourceType, deliveryType = 'upload'): Promise<CloudinaryResource | null> {
  const config = requireConfig();
  const path = publicId.split('/').map(encodeURIComponent).join('/');
  const authorization = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');
  const response = await fetch(`${API_ORIGIN}/${config.cloudName}/resources/${resourceType}/${deliveryType}/${path}`, {
    headers: { Authorization: `Basic ${authorization}` },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('CLOUDINARY_REQUEST_FAILED');
  const parsed = resourceSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error('CLOUDINARY_REQUEST_FAILED');
  const value = parsed.data;
  return {
    publicId: value.public_id,
    version: value.version,
    format: normalizeFormat(value.format),
    resourceType: value.resource_type,
    deliveryType: value.type,
    bytes: value.bytes,
    width: value.width ?? null,
    height: value.height ?? null,
    duration: value.duration ?? null,
    secureUrl: value.secure_url
  };
}

/** Permanently deletes an asset and invalidates CDN copies. A missing asset counts as deleted. */
export async function destroyAsset(publicId: string, resourceType: CloudinaryResourceType): Promise<void> {
  const config = requireConfig();
  const params = { invalidate: 'true', public_id: publicId, timestamp: timestamp() };
  const body = new URLSearchParams({ ...params, api_key: config.apiKey, signature: cloudinarySignature(params, config.apiSecret, config.algorithm) });
  const response = await fetch(`${API_ORIGIN}/${config.cloudName}/${resourceType}/destroy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  if (!response.ok) throw new Error('CLOUDINARY_REQUEST_FAILED');
  const payload: unknown = await response.json();
  const result = typeof payload === 'object' && payload !== null && 'result' in payload ? String((payload as {result: unknown;}).result) : '';
  if (result !== 'ok' && result !== 'not found') throw new Error('CLOUDINARY_REQUEST_FAILED');
}

export function resourceTypeFor(value: unknown): CloudinaryResourceType {
  return value === 'video' ? 'video' : 'image';
}
export function receiptDownloadUrl(publicId: string, format: string): string {
 const config = requireConfig();
 // Cloudinary download signatures require timestamp as well as expires_at.
 const now = timestamp();
 const params = { timestamp: now, public_id: publicId, format, type: 'authenticated', expires_at: String(Number(now) + 300), attachment: 'false' };
 return `${API_ORIGIN}/${config.cloudName}/image/download?${new URLSearchParams({...params, api_key:config.apiKey, signature:cloudinarySignature(params,config.apiSecret,config.algorithm)})}`;
}
