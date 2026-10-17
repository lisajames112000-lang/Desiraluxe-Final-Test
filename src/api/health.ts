import type { VercelRequest, VercelResponse } from '../types/vercel.js';
import { adminDb } from '../services/firebase/adminServer.js';
import { isCloudinaryConfigured } from '../services/cloudinary/server.js';
import { requireMethod, serverErrorMessage, setPrivateHeaders } from '../services/server/http.js';

const VERSION = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || '1.0.0';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  setPrivateHeaders(response);
  if (!requireMethod(request, response, 'GET')) return;
  try {
    await adminDb().collection('siteSettings').doc('public').get();
    return response.status(200).json({
      ok: true,
      service: 'desiraluxe-api',
      version: VERSION,
      projectId: 'e-commerce-711c0',
      databaseId: '(default)',
      firestore: 'reachable',
      media: isCloudinaryConfigured() ? 'cloudinary-configured' : 'cloudinary-unconfigured'
    });
  } catch (error) {
    const failure = serverErrorMessage(error);
    return response.status(failure.status).json({
      ok: false,
      service: 'desiraluxe-api',
      version: VERSION,
      firestore: 'unavailable',
      error: failure.message,
      media: isCloudinaryConfigured() ? 'cloudinary-configured' : 'cloudinary-unconfigured'
    });
  }
}