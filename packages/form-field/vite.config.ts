/// <reference types='vitest' />
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/packages/form-field',
  plugins: [],
  alias: {
    '@': path.resolve(__dirname, './src'),
    // Optional: Add the react aliases if you're using preact/compat
    react: 'preact/compat',
    'react-dom': 'preact/compat',
  },
  test: {
    name: '@tkottke-js-helpers/form-field',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: './test-output/vitest/coverage',
      provider: 'v8' as const,
    },
  },
}));
