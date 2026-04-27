/// <reference types='vitest' />
import { defineConfig } from 'vite';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/packages/config-manager',
  plugins: [],
  test: {
    name: '@tkottke90/config-manager',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
    coverage: {
      reportsDirectory: './coverage',
      provider: 'v8' as const,
      reporter: ['html', 'lcov', 'json', 'text'],
      exclude: ['node_modules/', 'dist', '**/*.spec.ts', '**/*.test.ts'],
    },
  },
}));
