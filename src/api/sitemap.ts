import type { VercelRequest, VercelResponse } from '../types/vercel.js';
import { adminDb } from '../services/firebase/adminServer.js';

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, (character) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[character] || character);
}

export default async function handler(_request: VercelRequest, response: VercelResponse) {
  const base = process.env.PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (!base || !/^https:\/\//.test(base)) return response.status(503).send('Canonical production site URL is not configured.');
  try {
    const db = adminDb();
    const [products, categories, pages] = await Promise.all([
    db.collection('products').where('isPublished', '==', true).get(),
    db.collection('categories').where('isPublished', '==', true).get(),
    db.collection('cmsPages').where('isPublished', '==', true).get()]
    );
    const paths = ['/', '/shop', '/categories', '/about', '/contact', '/shipping', '/returns', '/privacy', '/terms'];
    categories.docs.forEach((entry) => paths.push(`/category/${encodeURIComponent(String(entry.data().slug))}`));
    products.docs.forEach((entry) => paths.push(`/product/${encodeURIComponent(String(entry.data().slug))}`));
    pages.docs.filter((entry) => !entry.data().isSystem).forEach((entry) => paths.push(`/pages/${encodeURIComponent(String(entry.data().slug))}`));
    const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${Array.from(new Set(paths)).map((path) => `  <url><loc>${escapeXml(`${base}${path}`)}</loc></url>`).join('\n')}\n</urlset>`;
    response.setHeader('Content-Type', 'application/xml; charset=utf-8');
    response.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600');
    return response.status(200).send(body);
  } catch {
    return response.status(500).send('Sitemap could not be generated.');
  }
}