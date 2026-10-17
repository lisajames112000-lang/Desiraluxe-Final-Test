import { afterEach, describe, expect, it, vi } from 'vitest';
import { EXPECTED_FIREBASE_PROJECT_ID, resolveFirebaseConfig, type FirebasePublicConfig } from './config';

const ownerConfig: FirebasePublicConfig = {
  apiKey: 'AIzaSyBMCNh_3p9SjalAAi2D0eD6GcTCrey87Ok',
  authDomain: 'e-commerce-711c0.firebaseapp.com',
  projectId: 'e-commerce-711c0',
  storageBucket: 'e-commerce-711c0.firebasestorage.app',
  messagingSenderId: '716202350085',
  appId: '1:716202350085:web:934d877819f7c4da706e6c'
};

describe('resolveFirebaseConfig', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('targets the e-commerce-711c0 project', () => {
    expect(EXPECTED_FIREBASE_PROJECT_ID).toBe('e-commerce-711c0');
  });

  it('uses the exact owner-supplied public Web configuration in preview', () => {
    const result = resolveFirebaseConfig();

    expect(result.config).toEqual(ownerConfig);
    expect(result.source).toBe('preview-fallback');
    expect(result.error).toBeNull();
  });

  it('reads the native Vite API key without a custom build define', () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', '  current-public-web-api-key  ');

    const result = resolveFirebaseConfig();

    expect(result.config).toEqual({ ...ownerConfig, apiKey: 'current-public-web-api-key' });
    expect(result.source).toBe('vite-env');
    expect(result.error).toBeNull();
  });

  it('does not let blank native env values erase the verified fallback', () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', '   ');

    expect(resolveFirebaseConfig().config).toEqual(ownerConfig);
    expect(resolveFirebaseConfig().source).toBe('preview-fallback');
  });

  it('rejects a mismatched project from native Vite env', () => {
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'desiraluxe-web');

    expect(resolveFirebaseConfig().config).toBeNull();
    expect(resolveFirebaseConfig().error).toContain('projectId');
  });

  it('lets an explicit config override native env for deterministic checks', () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'another-public-web-api-key');

    expect(resolveFirebaseConfig(ownerConfig).config).toEqual(ownerConfig);
  });

  it('accepts a Vite apiKey while preserving confirmed identifiers', () => {
    const result = resolveFirebaseConfig({ apiKey: 'public-web-api-key' });

    expect(result.config).toEqual({ ...ownerConfig, apiKey: 'public-web-api-key' });
    expect(result.source).toBe('vite-env');
    expect(result.error).toBeNull();
  });

  it('accepts the complete deployment configuration', () => {
    const result = resolveFirebaseConfig(ownerConfig);

    expect(result.config).toEqual(ownerConfig);
    expect(result.source).toBe('vite-env');
    expect(result.error).toBeNull();
  });

  it('rejects the retired desiraluxe-web project', () => {
    const result = resolveFirebaseConfig({ ...ownerConfig, projectId: 'desiraluxe-web' });

    expect(result.config).toBeNull();
    expect(result.error).toContain('projectId');
  });

  it.each([
  ['authDomain', 'desiraluxe-web.firebaseapp.com'],
  ['messagingSenderId', '697347106860'],
  ['appId', '1:697347106860:web:4413e954708d6dbdd30989']] as
  const)('rejects an unexpected Web app %s', (key, value) => {
    const result = resolveFirebaseConfig({ ...ownerConfig, [key]: value });

    expect(result.config).toBeNull();
    expect(result.error).toContain(key);
  });
});