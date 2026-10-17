import { randomBytes } from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import type { VercelRequest, VercelResponse } from '../../types/vercel.js';
import { mediaRequirements } from '../../config/media.js';
import { adminDb, requireAdmin } from '../../services/firebase/adminServer.js';
import { cloudinaryFormat, createSignedUpload, mediaPublicId } from '../../services/cloudinary/server.js';
import { requireMethod, serverErrorMessage, setPrivateHeaders } from '../../services/server/http.js';

const schema = z.object({
  role: z.enum(['product', 'category', 'heroDesktop', 'heroMobile', 'popup', 'logo', 'favicon', 'paymentQr', 'video']),
  fileName: z.string().min(1).max(240),
  contentType: z.string().min(1).max(100),
  size: z.number().int().positive(),
  entityId: z.string().min(1).max(120).regex(/^[A-Za-z0-9_-]+$/)
}).strict();

export default async function handler(request: VercelRequest, response: VercelResponse) {
  setPrivateHeaders(response);
  if (!requireMethod(request, response, 'POST')) return;
  try {
    const admin = await requireAdmin(request.headers.authorization);
    const input = schema.parse(request.body);
    const requirement = mediaRequirements[input.role];
    const format = cloudinaryFormat(input.contentType);
    if (!format || !requirement.accept.includes(input.contentType) || input.size > requirement.maxBytes) return response.status(400).json({ error: `Use ${requirement.accept.join(', ')} up to ${Math.round(requirement.maxBytes / 1_000_000)} MB.` });
    const resourceType = input.role === 'video' ? 'video' : 'image';
    const allowedFormats = requirement.accept.map(cloudinaryFormat).filter((value): value is string => !!value);
    const mediaId = randomBytes(16).toString('hex');
    const publicId = mediaPublicId(input.role, input.entityId, mediaId);
    const signed = createSignedUpload({ publicId, resourceType, allowedFormats });
    await adminDb().collection('media').doc(mediaId).set({
      id: mediaId, provider: 'cloudinary', key: publicId, publicId, resourceType, role: input.role, entityId: input.entityId,
      originalName: input.fileName, contentType: input.contentType, expectedFormat: format, expectedSize: input.size,
      status: 'pending', references: [], createdBy: admin.uid, createdAt: FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + (signed.expiresInSeconds + 3600) * 1000)
    });
    return response.status(201).json({ mediaId, key: publicId, resourceType, uploadUrl: signed.uploadUrl, fields: signed.fields, expiresInSeconds: signed.expiresInSeconds });
  } catch (error) {
    if (error instanceof z.ZodError) return response.status(400).json({ error: 'Upload request is invalid.' });
    const failure = serverErrorMessage(error);
    return response.status(failure.status).json({ error: failure.message });
  }
}