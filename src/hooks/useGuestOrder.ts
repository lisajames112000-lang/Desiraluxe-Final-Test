import { useCallback, useEffect, useState } from 'react';
import type { PublicOrder } from '../types/publicOrder';
import { apiRequest } from '../services/api';
import { isPublicOrderResponse } from '../services/apiContracts';

export function useGuestOrder(initialToken = '') {
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (token: string) => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      setOrder(await apiRequest('/api/orders/track', { method: 'POST', body: JSON.stringify({ token }) }, false, isPublicOrderResponse));
    } catch (cause) {
      setOrder(null);
      setError(cause instanceof Error ? cause.message : 'Order tracking is temporarily unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {if (initialToken) void load(initialToken);}, [initialToken, load]);
  return { order, loading, error, load };
}