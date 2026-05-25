import { defineConfig } from 'vitest/config';

// Standalone config so vitest doesn't load vite.config.ts (the Cloudflare
// Worker plugin sets resolve.external, which the plugin rejects under test).
// The generic-tier logic is pure and only needs the node environment.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
