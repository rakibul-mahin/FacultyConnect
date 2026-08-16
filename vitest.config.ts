import { defineConfig } from 'vitest/config';
import path from 'path';
import { loadEnv } from 'vite';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 20000,
    hookTimeout: 30000,
    env: loadEnv('test', process.cwd(), ''),
    // Integration tests share one Postgres test database and truncate it in
    // beforeEach; running test files in parallel would race those resets
    // against each other, so force sequential execution across files.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      // Outside Next's bundler, `server-only` throws unconditionally on
      // import. Alias it to its own no-op stub, exactly like Next does for
      // server-side RSC bundles, so lib modules can be unit/integration
      // tested directly with vitest.
      'server-only': path.resolve(__dirname, './node_modules/server-only/empty.js'),
    },
  },
});
