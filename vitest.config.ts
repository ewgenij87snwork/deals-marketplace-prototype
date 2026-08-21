import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { 'server-only': new URL('./src/test/server-only.ts', import.meta.url).pathname },
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    fileParallelism: false,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'tests/integration/**/*.test.ts'],
  },
});
