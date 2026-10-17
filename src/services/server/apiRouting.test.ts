import { describe, expect, it } from 'vitest';
import { apiRoutePaths, resolveApiRoute } from './apiRouting';
import vercelConfig from '../../vercel.json';

describe('shared API routing', () => {
  it('deploys exactly one Node function', () => {
    expect(vercelConfig.builds.filter((build) => build.use === '@vercel/node')).toEqual([
      { src: 'api/dispatch.ts', use: '@vercel/node' }
    ]);
  });

  it('rewrites APIs and sitemap to the exact explicit function output', () => {
    expect(vercelConfig.rewrites[0]).toEqual({
      source: '/api/:path*', destination: '/api/dispatch.ts?__route=:path*'
    });
    expect(vercelConfig.rewrites[1]).toEqual({
      source: '/sitemap.xml', destination: '/api/dispatch.ts?__route=sitemap'
    });
  });

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
