import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { parserOptions: { ecmaVersion: 'latest', sourceType: 'module' }, globals: { window: 'readonly', document: 'readonly', navigator: 'readonly', crypto: 'readonly', sessionStorage: 'readonly', Blob: 'readonly', URL: 'readonly', File: 'readonly', FormData: 'readonly', XMLHttpRequest: 'readonly', Image: 'readonly' } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: { ...reactHooks.configs.recommended.rules, 'react-refresh/only-export-components': ['warn', { allowConstantExport: true }], '@typescript-eslint/no-explicit-any': 'error' }
  }
);