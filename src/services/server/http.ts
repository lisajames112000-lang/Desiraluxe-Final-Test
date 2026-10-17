import { createHash } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import type { VercelRequest, VercelResponse } from '../../types/vercel.js';
import { adminDb } from '../firebase/adminServer.js';

export function setPrivateHeaders(response: VercelResponse): void {
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Content-Type-Options', 'nosniff');
}

function allowedOrigins(): string[] {
  return (process.env.ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean);
}

function applyCors(request: VercelRequest, response: VercelResponse, method: string): boolean {
  const origin = request.headers.origin;
  if (!origin || !allowedOrigins().includes(origin)) return false;
  response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Access-Control-Allow-Methods', `${method}, OPTIONS`);
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  response.setHeader('Access-Control-Max-Age', '600');
  response.setHeader('Vary', 'Origin');
  return true;
}

export function requireMethod(request: VercelRequest, response: VercelResponse, method: string): boolean {
  const corsAllowed = applyCors(request, response, method);
  if (request.method === 'OPTIONS') {
    if (!corsAllowed) response.status(403).json({ error: 'Request origin is not allowed.' });else
    response.status(204).send('');
    return false;
  }
  if (request.method === method) return true;
  response.setHeader('Allow', `${method}, OPTIONS`);
  response.status(405).json({ error: 'Method not allowed.' });
  return false;
}

function isSameOrigin(request: VercelRequest): boolean {
  const origin = request.headers.origin;
  if (!origin) return false;
  const forwarded = request.headers['x-forwarded-host'];
  const host = (Array.isArray(forwarded) ? forwarded[0] : forwarded) || request.headers.host;
  try {
    return !!host && new URL(origin).host === host.split(',')[0].trim();
  } catch {
    return false;
  }
}

// Requests from the website's own domain are always allowed, so the live
// Vercel site works without listing its domain in ALLOWED_ORIGINS.
export function allowOrigin(request: VercelRequest): boolean {
  const origin = request.headers.origin;
  return !!origin && (allowedOrigins().includes(origin) || isSameOrigin(request));
}

export function requestIp(request: VercelRequest): string {
  const forwarded = request.headers['x-forwarded-for'];
  return (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0])?.trim() || 'unknown';
}

export function hashIdentifier(value: string): string {
  // Falls back to a value derived from the server-only Firebase key so the
  // store works even when SERVER_HASH_SECRET was not added in Vercel.
  const secret = process.env.SERVER_HASH_SECRET || (process.env.FIREBASE_PRIVATE_KEY ? createHash('sha256').update(`desiraluxe:${process.env.FIREBASE_PRIVATE_KEY}`).digest('hex') : '');
  if (!secret) throw new Error('Server hash secret is not configured.');
  return createHash('sha256').update(`${secret}:${value}`).digest('hex');
}

export async function enforceRateLimit(key: string, maximum: number, windowSeconds: number): Promise<void> {
  const db = adminDb();
  const ref = db.collection('rateLimits').doc(key);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const now = Date.now();
    const data = snapshot.data() as {count?: number;windowStartedAt?: number;} | undefined;
    const reset = !data?.windowStartedAt || now - data.windowStartedAt >= windowSeconds * 1000;
    const count = reset ? 1 : (data.count || 0) + 1;
    if (count > maximum) throw new Error('RATE_LIMITED');
    transaction.set(ref, { count, windowStartedAt: reset ? now : data?.windowStartedAt, expiresAt: new Date(now + windowSeconds * 2000), updatedAt: FieldValue.serverTimestamp() });
  });
}

export function serverErrorMessage(error: unknown): {status: number;message: string;} {
  const code = error instanceof Error ? error.message : '';
  if (code === 'UNAUTHORIZED') return { status: 401, message: 'Authentication is required.' };
  if (code === 'FORBIDDEN') return { status: 403, message: 'Administrator authorization is required.' };
  if (code === 'RATE_LIMITED') return { status: 429, message: 'Too many requests. Please wait and try again.' };
  if (code === 'CLOUDINARY_NOT_CONFIGURED') return { status: 503, message: 'Cloudinary media storage is not configured on the server.' };
  if (code === 'CLOUDINARY_REQUEST_FAILED') return { status: 502, message: 'Cloudinary could not complete the media request. Try again shortly.' };
  return { status: 500, message: 'The operation could not be completed.' };
}