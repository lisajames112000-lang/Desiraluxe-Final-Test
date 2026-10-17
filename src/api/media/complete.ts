import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '../../types/vercel.js';
import { mediaRequirements } from '../../config/media.js';
import { adminDb, requireAdmin } from '../../services/firebase/adminServer.js';
import { destroyAsset, fetchResource, managedMediaIdFromUrl, resourceTypeFor, verifyUploadResponseSignature } from '../../services/cloudinary/server.js';
import { requireMethod, serverErrorMessage, setPrivateHeaders } from '../../services/server/http.js';

const schema = z.object({
  mediaId: z.string().regex(/^[a-f0-9]{32}$/),
  publicId: z.string().min(1).max(300),
  version: z.number().int().positive(),
  signature: z.string().regex(/^[a-f0-9]{40,64}$/i),
  width: z.number().int().positive().max(20000).optional(),
  height: z.number().int().positive().max(20000).optional()
}).strict();

export default async function handler(request: VercelRequest, response: VercelResponse) {
  setPrivateHeaders(response);
  if (!requireMethod(request, response, 'POST')) return;
  try {
    await requireAdmin(request.headers.authorization);
    const input = schema.parse(request.body);
    const db = adminDb();
    const ref = db.collection('media').doc(input.mediaId);
    const snapshot = await ref.get();
    const media = snapshot.data();
    if (snapshot.exists && media?.status === 'ready' && typeof media.url === 'string') return response.status(200).json({ mediaId: input.mediaId, url: media.url, key: media.key });
    if (!snapshot.exists || media?.status !== 'pending' || media?.provider !== 'cloudinary') return response.status(404).json({ error: 'Pending upload was not found.' });

    const publicId = String(media.publicId || '');
    const resourceType = resourceTypeFor(media.resourceType);
    if (input.publicId !== publicId || !verifyUploadResponseSignature(publicId, input.version, input.signature)) {
      return response.status(422).json({ error: 'The upload confirmation could not be verified. Start a new upload.' });
    }

    const resource = await fetchResource(publicId, resourceType);
    if (!resource) return response.status(404).json({ error: 'Cloudinary has not stored this upload yet. Retry in a moment.' });

    const requirement = mediaRequirements[media.role as keyof typeof mediaRequirements];
    const valid = !!requirement &&
    resource.publicId === publicId &&
    resource.resourceType === resourceType &&
    resource.deliveryType === 'upload' &&
    resource.version === input.version &&
    resource.format === media.expectedFormat &&
    resource.bytes > 0 &&
    resource.bytes <= requirement.maxBytes &&
    managedMediaIdFromUrl(resource.secureUrl) === input.mediaId;
    if (!valid) {
      await destroyAsset(publicId, resourceType);
      await ref.set({ status: 'rejected', rejectionReason: 'Stored asset did not match the authorized upload.', verifiedAt: FieldValue.serverTimestamp() }, { merge: true });
      return response.status(422).json({ error: 'The uploaded file did not match the authorized type or size and was removed.' });
    }

    await db.runTransaction(async (transaction) => {
      const current = await transaction.get(ref);
      if (!current.exists || current.data()?.status !== 'pending' || current.data()?.publicId !== publicId) throw new Error('UPLOAD_STATE_CHANGED');
      transaction.update(ref, {
        status: 'ready', size: resource.bytes, format: resource.format, contentType: media.contentType, version: resource.version,
        width: resource.width ?? input.width ?? null, height: resource.height ?? input.height ?? null, duration: resource.duration,
        url: resource.secureUrl, verifiedAt: FieldValue.serverTimestamp(), expiresAt: FieldValue.delete()
      });
    });
    return response.status(200).json({ mediaId: input.mediaId, url: resource.secureUrl, key: publicId });
  } catch (error) {
    if (error instanceof z.ZodError) return response.status(400).json({ error: 'Upload completion request is invalid.' });
    if (error instanceof Error && error.message === 'UPLOAD_STATE_CHANGED') return response.status(409).json({ error: 'The pending upload changed while it was being verified. Start a new upload.' });
    const failure = serverErrorMessage(error);
    return response.status(failure.status).json({ error: failure.message });
  }
}