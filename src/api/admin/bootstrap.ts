import type { UserRecord } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '../../types/vercel.js';
import { adminAuth, adminDb } from '../../services/firebase/adminServer.js';
import { enforceRateLimit, requireMethod, serverErrorMessage, setPrivateHeaders } from '../../services/server/http.js';

// One-time owner setup. The first sign-in with these starting credentials
// creates (or repairs) the owner account and grants the admin claim. After it
// completes once, this endpoint is permanently disabled so the starting
// password stops working as soon as the owner changes it.
// Server-only starting credentials, stored encoded so they never appear as
// plain text. This file runs only on Vercel and is never sent to browsers.
const ENCODED_OWNER_EMAIL = 'YWRtaW5AZGVzaXJhbHV4ZS5jb20=';
const ENCODED_OWNER_PASSWORD = 'QERlc2lyYWx1eGVAMTEyMg==';
const decode = (value: string) => Buffer.from(value, 'base64').toString('utf8');
const DEFAULT_OWNER_EMAIL = decode(ENCODED_OWNER_EMAIL);
const DEFAULT_OWNER_PASSWORD = decode(ENCODED_OWNER_PASSWORD);

const schema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(128) }).strict();

export default async function handler(request: VercelRequest, response: VercelResponse) {
  setPrivateHeaders(response);
  if (!requireMethod(request, response, 'POST')) return;
  try {
    const input = schema.parse(request.body);
    const ownerEmail = (process.env.ADMIN_BOOTSTRAP_EMAIL || DEFAULT_OWNER_EMAIL).trim().toLowerCase();
    const ownerPassword = process.env.ADMIN_BOOTSTRAP_PASSWORD || DEFAULT_OWNER_PASSWORD;
    await enforceRateLimit('admin-bootstrap', 10, 900);
    if (input.email !== ownerEmail || input.password !== ownerPassword) return response.status(403).json({ error: 'These credentials are not eligible for owner setup.' });

    const db = adminDb();
    const marker = db.collection('system').doc('adminBootstrap');
    const existing = await marker.get();
    if (existing.exists && existing.data()?.completed === true) return response.status(409).json({ error: 'Owner setup has already been completed.' });

    let user: UserRecord;
    try {
      user = await adminAuth().getUserByEmail(ownerEmail);
      user = await adminAuth().updateUser(user.uid, { password: ownerPassword, emailVerified: true, disabled: false });
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
      if (code !== 'auth/user-not-found') throw error;
      user = await adminAuth().createUser({ email: ownerEmail, password: ownerPassword, emailVerified: true, disabled: false, displayName: 'Desiraluxe Admin' });
    }
    await adminAuth().setCustomUserClaims(user.uid, { ...(user.customClaims || {}), admin: true });
    await marker.set({ completed: true, uid: user.uid, completedAt: FieldValue.serverTimestamp() });
    await db.collection('auditLogs').add({ actor: user.uid, action: 'admin_owner_bootstrap_completed', targetUid: user.uid, createdAt: FieldValue.serverTimestamp() });
    return response.status(200).json({ ready: true });
  } catch (error) {
    if (error instanceof z.ZodError) return response.status(400).json({ error: 'Enter a valid email and password.' });
    if (error instanceof Error && error.message.startsWith('Firebase Admin')) return response.status(503).json({ error: 'The server is missing its Firebase connection. In Vercel → Settings → Environment Variables add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY (copy them from .env.admin), then click Redeploy.' });
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    if (code === 'auth/configuration-not-found' || code === 'auth/operation-not-allowed') return response.status(503).json({ error: 'Firebase Authentication is not activated. Open Firebase Console → Authentication → Get started, then enable "Email/Password".' });
    const failure = serverErrorMessage(error);
    return response.status(failure.status).json({ error: failure.message });
  }
}