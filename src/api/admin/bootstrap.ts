import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '../../types/vercel.js';
import { adminAuth } from '../../services/firebase/adminServer.js';
import { requireMethod, serverErrorMessage, setPrivateHeaders } from '../../services/server/http.js';

// This endpoint does not accept or reset passwords and does not create users.
// It grants the admin custom claim only to an already-authenticated, allowlisted
// owner account. Configure ADMIN_BOOTSTRAP_EMAIL in Vercel when possible.
const DEFAULT_OWNER_EMAIL = 'admin@desiraluxe.com';
const schema = z.object({}).strict();

export default async function handler(request: VercelRequest, response: VercelResponse) {
  setPrivateHeaders(response);
  if (!requireMethod(request, response, 'POST')) return;

  try {
    schema.parse(request.body ?? {});
    const match = request.headers.authorization?.match(/^Bearer (.+)$/i);
    if (!match) return response.status(401).json({ error: 'Sign in with Firebase before requesting admin authorization.' });

    // Verify the Firebase ID token server-side. Revoked/invalid tokens are rejected.
    const auth = adminAuth();
    const decoded = await auth.verifyIdToken(match[1], true);
    const ownerEmail = (process.env.ADMIN_BOOTSTRAP_EMAIL || DEFAULT_OWNER_EMAIL).trim().toLowerCase();
    const ownerUid = process.env.ADMIN_BOOTSTRAP_UID?.trim();

    if (!decoded.email || decoded.email.toLowerCase() !== ownerEmail) {
      return response.status(403).json({ error: 'This Firebase account is not the configured DesiraLuxe owner account.' });
    }
    if (ownerUid && decoded.uid !== ownerUid) {
      return response.status(403).json({ error: 'This Firebase account UID does not match the configured owner UID.' });
    }

    const user = await auth.getUser(decoded.uid);
    await auth.setCustomUserClaims(user.uid, { ...(user.customClaims || {}), admin: true });
    return response.status(200).json({ ready: true });
  } catch (error) {
    if (error instanceof z.ZodError) return response.status(400).json({ error: 'Invalid admin setup request.' });
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    if (code.startsWith('auth/')) return response.status(401).json({ error: 'Firebase could not verify this sign-in. Sign in again and retry.' });
    if (error instanceof Error && error.message.startsWith('Firebase Admin')) {
      return response.status(503).json({ error: 'Firebase Admin server credentials are missing or invalid. Configure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in Vercel, then redeploy.' });
    }
    const failure = serverErrorMessage(error);
    return response.status(failure.status).json({ error: failure.message });
  }
}
