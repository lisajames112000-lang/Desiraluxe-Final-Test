import { createHash, timingSafeEqual } from 'node:crypto';

export type SignatureAlgorithm = 'sha1' | 'sha256';
export type SignatureParams = Record<string, string | number | undefined>;

// Cloudinary never includes these parameters in the signed payload.
const EXCLUDED_PARAMS = new Set(['file', 'cloud_name', 'resource_type', 'api_key', 'signature']);

export function cloudinarySignaturePayload(params: SignatureParams): string {
  return Object.keys(params).
  filter((key) => !EXCLUDED_PARAMS.has(key) && params[key] !== undefined && params[key] !== '').
  sort().
  map((key) => `${key}=${params[key]}`).
  join('&');
}

export function cloudinarySignature(params: SignatureParams, apiSecret: string, algorithm: SignatureAlgorithm = 'sha1'): string {
  return createHash(algorithm).update(`${cloudinarySignaturePayload(params)}${apiSecret}`).digest('hex');
}

export function signaturesMatch(expected: string, received: string): boolean {
  if (!/^[a-f0-9]+$/i.test(received) || expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected.toLowerCase(), 'hex'), Buffer.from(received.toLowerCase(), 'hex'));
}