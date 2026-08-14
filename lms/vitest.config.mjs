import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vitest UI / component test layer.
 *
 * Separate from Playwright E2E (`tests/e2e/**`, `playwright.config.ts`).
 * Playwright remains the browser E2E suite and is not discovered here.
 *
 * Pool notes (Windows / pre-push):
 * - `forks` can hit "Timeout waiting for worker to respond" when spawning the
 *   next jsdom worker after heavy suites.
 * - `threads` avoids child-process spawn stalls; keep isolate true so mocks
 *   do not leak across files.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': rootDir,
      // `server-only` throws outside a Next.js server build; stub it for jsdom.
      'server-only': path.join(rootDir, 'tests/stubs/empty-module.ts'),
    },
  },
  test: {
    pool: 'threads',
    maxWorkers: 1,
    fileParallelism: false,
    isolate: true,
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./tests/setup/vitest.setup.ts'],
    include: [
      'tests/unit/**/*.test.tsx',
      'tests/integration/**/*.test.{ts,tsx}',
    ],
    exclude: [
      'tests/e2e/**',
      'node_modules/**',
      '.next/**',
      'playwright-report/**',
      'test-results/**',
    ],
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    teardownTimeout: 60_000,
    css: false,
  },
});
