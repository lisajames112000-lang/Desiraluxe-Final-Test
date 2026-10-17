import { FieldValue } from 'firebase-admin/firestore';
import type { VercelRequest, VercelResponse } from '../../types/vercel.js';
import { adminDb } from '../../services/firebase/adminServer.js';
import { destroyAsset, isCloudinaryConfigured, resourceTypeFor, type CloudinaryResourceType } from '../../services/cloudinary/server.js';
import { requireMethod, serverErrorMessage, setPrivateHeaders } from '../../services/server/http.js';

// Runs once per day (Vercel Hobby limit). Unused uploads are only storage clutter, so a
// daily sweep is sufficient; nothing referenced by the store is ever deleted.

function authorized(request: VercelRequest): boolean {
  const secret = process.env.CRON_SECRET;
  return !!secret && request.headers.authorization === `Bearer ${secret}`;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  setPrivateHeaders(response);
  if (!requireMethod(request, response, 'GET')) return;
  if (!authorized(request)) return response.status(401).json({ error: 'Cron authorization is required.' });
  if (!isCloudinaryConfigured()) return response.status(503).json({ error: 'Cloudinary media storage is not configured on the server.' });
  try {
    const db = adminDb();
    const [pending, failed, deleting, rejected] = await Promise.all([
    db.collection('media').where('status', '==', 'pending').where('expiresAt', '<=', new Date()).limit(50).get(),
    db.collection('media').where('status', '==', 'cleanup_failed').limit(25).get(),
    db.collection('media').where('status', '==', 'deleting').limit(25).get(),
    db.collection('media').where('status', '==', 'rejected').limit(25).get()]
    );
    const candidates = new Map([...pending.docs, ...failed.docs, ...deleting.docs, ...rejected.docs].map((entry) => [entry.id, entry]));
    const retryBefore = Date.now() - 15 * 60_000;
    let deleted = 0;
    let skipped = 0;
    let failures = 0;
    for (const candidate of candidates.values()) {
      let publicId = '';
      let resourceType: CloudinaryResourceType = 'image';
      const claimed = await db.runTransaction(async (transaction) => {
        const current = await transaction.get(candidate.ref);
        const data = current.data();
        // Records created before the Cloudinary migration are never touched automatically.
        if (!current.exists || data?.provider !== 'cloudinary') return false;
        const status = String(data.status);
        if (!['pending', 'cleanup_failed', 'deleting', 'rejected'].includes(status)) return false;
        const expiresAt = data.expiresAt?.toDate?.().getTime?.() ?? Number.POSITIVE_INFINITY;
        const lastAttemptAt = (data.cleanupErrorAt || data.cleanupStartedAt)?.toDate?.().getTime?.() ?? 0;
        if (status === 'pending' && expiresAt > Date.now()) return false;
        if (['cleanup_failed', 'deleting'].includes(status) && lastAttemptAt > retryBefore) return false;
        if (Array.isArray(data.references) && data.references.length) return false;
        publicId = String(data.publicId || '');
        resourceType = resourceTypeFor(data.resourceType);
        if (!publicId) return false;
        transaction.update(candidate.ref, { status: 'deleting', cleanupStartedAt: FieldValue.serverTimestamp() });
        return true;
      });
      if (!claimed) {skipped += 1;continue;}
      try {
        await destroyAsset(publicId, resourceType);
        await candidate.ref.delete();
        deleted += 1;
      } catch {
        await candidate.ref.set({ status: 'cleanup_failed', cleanupErrorAt: FieldValue.serverTimestamp() }, { merge: true });
        failures += 1;
      }
    }
    return response.status(200).json({ processed: candidates.size, deleted, skipped, failures });
  } catch (error) {
    const failure = serverErrorMessage(error);
    return response.status(failure.status).json({ error: failure.message });
  }
}