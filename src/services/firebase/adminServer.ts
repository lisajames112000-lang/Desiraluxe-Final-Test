import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function privateKey(): string | undefined {
  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
}

export function getAdminApp(): App {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const existing = getApps().find((app) => app.name === '[DEFAULT]');
  if (existing) {
    if (existing.options.projectId && existing.options.projectId !== 'e-commerce-711c0') {
      throw new Error('Firebase Admin project does not match e-commerce-711c0.');
    }
    return existing;
  }
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const key = privateKey();
  if (!projectId || !clientEmail || !key) throw new Error('Firebase Admin credentials are not configured.');
  if (projectId !== 'e-commerce-711c0') throw new Error('Firebase Admin project does not match e-commerce-711c0.');
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey: key }), projectId });
}

export function adminAuth() {return getAuth(getAdminApp());}
export function adminDb() {return getFirestore(getAdminApp());}

export async function requireAdmin(authorization?: string) {
  const match = authorization?.match(/^Bearer (.+)$/);
  if (!match) throw new Error('UNAUTHORIZED');
  const token = await adminAuth().verifyIdToken(match[1], true);
  if (token.admin !== true) throw new Error('FORBIDDEN');
  return token;
}
