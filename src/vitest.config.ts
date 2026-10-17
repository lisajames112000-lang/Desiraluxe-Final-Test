import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', 'dist', 'tests/rules/**', 'tests/e2e/**'],
    coverage: { reporter: ['text', 'html'] }
  }
});