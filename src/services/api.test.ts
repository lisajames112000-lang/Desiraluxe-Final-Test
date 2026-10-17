import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest, isWriteAcknowledgement } from './api';

function response(body: string | null, status = 200, contentType = 'application/json'): Response {
  return new Response(body, { status, headers: { 'content-type': contentType } });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('apiRequest', () => {
  it.each([
  ['HTML SPA fallback', response('<!doctype html><html></html>', 200, 'text/html')],
  ['empty body', response('', 200)],
  ['malformed JSON', response('{', 200)],
  ['null response', response('null', 200)],
  ['wrong acknowledgement', response(JSON.stringify({ saved: true }), 200)]]
  )('rejects a successful HTTP status with %s', async (_label, mockedResponse) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockedResponse);
    await expect(apiRequest('/api/admin/example', { method: 'POST' }, false, isWriteAcknowledgement)).rejects.toBeInstanceOf(ApiError);
  });

  it.each([401, 403, 404, 409, 429, 500])('preserves HTTP status %s', async (status) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response(JSON.stringify({ error: `failure-${status}` }), status));
    await expect(apiRequest('/api/example', { method: 'POST' }, false, isWriteAcknowledgement)).rejects.toMatchObject({ status, message: `failure-${status}` });
  });

  it('rejects a network failure without claiming success', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('network down'));
    await expect(apiRequest('/api/example', { method: 'POST' }, false, isWriteAcknowledgement)).rejects.toMatchObject({ status: 0 });
  });

  it('aborts after the configured timeout', async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    }));
    const request = apiRequest('/api/example', { method: 'POST' }, false, isWriteAcknowledgement, 25);
    await vi.advanceTimersByTimeAsync(25);
    await expect(request).rejects.toMatchObject({ status: 0, message: expect.stringContaining('timed out') });
  });

  it('returns only a validated authoritative acknowledgement', async () => {
    const acknowledgement = { saved: true as const, id: 'prod_1', updatedAt: '2026-10-13T10:00:00.000Z' };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response(JSON.stringify(acknowledgement)));
    await expect(apiRequest('/api/admin/example', { method: 'POST' }, false, isWriteAcknowledgement)).resolves.toEqual(acknowledgement);
  });
});