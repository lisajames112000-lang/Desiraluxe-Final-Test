import receiptHandler from './orders/receipt.js';
import handler0 from './admin/accounting/periods.js';
import handler1 from './admin/bootstrap.js';
import handler2 from './admin/content/delete.js';
import handler3 from './admin/content/save.js';
import handler4 from './admin/enquiries/[id]/status.js';
import handler5 from './admin/orders/[id]/refund.js';
import handler6 from './admin/orders/[id]/state.js';
import handler7 from './admin/orders/[id]/update.js';
import handler8 from './admin/products/delete.js';
import handler9 from './admin/products/private.js';
import handler10 from './admin/products/save.js';
import handler11 from './admin/settings/save.js';
import handler12 from './contact.js';
import handler13 from './cron/cleanup-media.js';
import handler14 from './cron/expire-orders.js';
import handler15 from './health.js';
import handler16 from './media/complete.js';
import handler17 from './media/delete.js';
import handler18 from './media/sign-upload.js';
import handler19 from './orders/create.js';
import handler20 from './orders/track.js';
import handler21 from './sitemap.js';
import type { VercelRequest, VercelResponse } from '../types/vercel.js';
import { resolveApiRoute } from '../services/server/apiRouting.js';

type Handler = (request: VercelRequest, response: VercelResponse) => unknown;
const handlers: Record<string, Handler> = {
  'admin/accounting/periods': handler0,
  'admin/bootstrap': handler1,
  'admin/content/delete': handler2,
  'admin/content/save': handler3,
  'admin/enquiries/[id]/status': handler4,
  'admin/orders/[id]/refund': handler5,
  'admin/orders/[id]/state': handler6,
  'admin/orders/[id]/update': handler7,
  'admin/products/delete': handler8,
  'admin/products/private': handler9,
  'admin/products/save': handler10,
  'admin/settings/save': handler11,
  'contact': handler12,
  'cron/cleanup-media': handler13,
  'cron/expire-orders': handler14,
  'health': handler15,
  'media/complete': handler16,
  'media/delete': handler17,
  'media/sign-upload': handler18,
  'orders/create': handler19,
  'orders/receipt': receiptHandler,
  'orders/track': handler20,
  'sitemap': handler21
};

// Explicitly deployed as one function to fit Vercel Hobby. Original handlers
// retain all method checks, authentication, validation, and transaction logic.
export default async function dispatch(request: VercelRequest, response: VercelResponse) {
  const path = request.query.__route;
  const route = resolveApiRoute(Array.isArray(path) ? path.join('/') : path || '');
  if (!route) {
    response.setHeader('Cache-Control', 'no-store');
    return response.status(404).json({ error: 'API route not found.' });
  }
  const { __route: _internalRoute, ...query } = request.query;
  request.query = { ...query, ...route.params };
  return handlers[route.key](request, response);
}
