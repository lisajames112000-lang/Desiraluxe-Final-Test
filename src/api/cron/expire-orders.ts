import type { VercelRequest, VercelResponse } from '../../types/vercel.js';
import { adminDb } from '../../services/firebase/adminServer.js';
import { expireOverdueReservations } from '../../services/server/expireOrders.js';
import { requireMethod, serverErrorMessage, setPrivateHeaders } from '../../services/server/http.js';

// Runs once per day (Vercel Hobby limit). Checkout also expires a small batch of overdue
// reservations on every order, so held stock is released between daily runs.
const DAILY_BATCH_LIMIT = 200;

function authorized(request: VercelRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.authorization;
  return !!secret && authorization === `Bearer ${secret}`;
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  setPrivateHeaders(response);
  if (!requireMethod(request, response, 'GET')) return;
  if (!authorized(request)) return response.status(401).json({ error: 'Cron authorization is required.' });
  try {
    const result = await expireOverdueReservations(adminDb(), DAILY_BATCH_LIMIT);
    return response.status(200).json(result);
  } catch (error) {
    const failure = serverErrorMessage(error);
    return response.status(failure.status).json({ error: failure.message });
  }
}