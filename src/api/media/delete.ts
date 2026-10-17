import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '../../types/vercel.js';
import { adminDb, requireAdmin } from '../../services/firebase/adminServer.js';
import { destroyAsset, resourceTypeFor, type CloudinaryResourceType } from '../../services/cloudinary/server.js';
import { requireMethod, serverErrorMessage, setPrivateHeaders } from '../../services/server/http.js';

const schema = z.object({ mediaId: z.string().regex(/^[a-f0-9]{32}$/) }).strict();

export default async function handler(request: VercelRequest, response: VercelResponse) {
  setPrivateHeaders(response);
  if (!requireMethod(request, response, 'POST')) return;
  try {
    await requireAdmin(request.headers.authorization);
    const input = schema.parse(request.body);
    const db = adminDb();
    const ref = db.collection('media').doc(input.mediaId);
    let publicId = '';
    let resourceType: CloudinaryResourceType = 'image';
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const media = snapshot.data();
      if (!snapshot.exists) throw new Error('NOT_FOUND');
      if (media?.provider !== 'cloudinary') throw new Error('LEGACY_MEDIA');
      resourceType = resourceTypeFor(media.resourceType);
      if (media.status === 'deleting') {publicId = String(media.publicId || '');return;}
      if (media.status !== 'ready' && media.status !== 'rejected' && media.status !== 'pending') throw new Error('DELETE_STATE');
      if (Array.isArray(media.references) && media.references.length) throw new Error('MEDIA_REFERENCED');
      const url = typeof media.url === 'string' ? media.url : null;
      if (url) {
        const [productImages, productVideos, categories, heroes, popups, payments, settings] = await Promise.all([
        transaction.get(db.collection('products').where('images', 'array-contains', url).limit(1)),
        transaction.get(db.collection('products').where('videoUrl', '==', url).limit(1)),
        transaction.get(db.collection('categories').where('image', '==', url).limit(1)),
        transaction.get(db.collection('heroSlides').where('image', '==', url).limit(1)),
        transaction.get(db.collection('popups').where('image', '==', url).limit(1)),
        transaction.get(db.collection('paymentMethodsPublic').where('qrImage', '==', url).limit(1)),
        transaction.get(db.collection('siteSettings').where('logoUrl', '==', url).limit(1))]
        );
        const mobileHeroes = await transaction.get(db.collection('heroSlides').where('mobileImage', '==', url).limit(1));
        if ([productImages, productVideos, categories, heroes, mobileHeroes, popups, payments, settings].some((result) => !result.empty)) throw new Error('MEDIA_REFERENCED');
      }
      publicId = String(media.publicId || '');
      if (!publicId) throw new Error('DELETE_STATE');
      transaction.update(ref, { status: 'deleting', updatedAt: FieldValue.serverTimestamp() });
    });
    if (!publicId) throw new Error('DELETE_STATE');
    await destroyAsset(publicId, resourceType);
    await ref.delete();
    return response.status(200).json({ deleted: true, id: input.mediaId });
  } catch (error) {
    if (error instanceof z.ZodError) return response.status(400).json({ error: 'Media deletion request is invalid.' });
    const code = error instanceof Error ? error.message : '';
    if (code === 'NOT_FOUND') return response.status(404).json({ error: 'Media record was not found.' });
    if (code === 'LEGACY_MEDIA') return response.status(409).json({ error: 'This media record predates Cloudinary storage and was left unchanged.' });
    if (code === 'MEDIA_REFERENCED') return response.status(409).json({ error: 'This media is still used by an active record. Remove every reference before deletion.' });
    if (code === 'DELETE_STATE') return response.status(409).json({ error: 'This media cannot be deleted from its current lifecycle state.' });
    const failure = serverErrorMessage(error);
    return response.status(failure.status).json({ error: failure.message });
  }
}