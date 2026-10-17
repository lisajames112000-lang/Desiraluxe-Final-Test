import { describe, expect, it } from 'vitest';
import { apiRoutePaths, resolveApiRoute } from './apiRouting';

describe('shared API routing', () => {
  it.each(apiRoutePaths)('preserves the existing %s endpoint', (key) => {
    const path = key.replace('[id]', 'test-id');
    expect(resolveApiRoute(path)).toEqual({
      key, params: key.includes('[id]') ? { id: 'test-id' } : {}
    });
  });

  it.each(['', 'missing', 'admin/orders//state', 'admin/orders/../state', 'admin/orders/id/state/extra'])('rejects unknown or malformed route %s', (path) => {
    expect(resolveApiRoute(path)).toBeNull();
  });
});
