import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@mc-fleet/world-core': path.join(root, 'packages/world-core/src/index.ts'),
      '@mc-fleet/anvil': path.join(root, 'packages/anvil/src/index.ts'),
      '@mc-fleet/catalog': path.join(root, 'packages/catalog/src/index.ts'),
      '@mc-fleet/reporting': path.join(root, 'packages/reporting/src/index.ts'),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
    testTimeout: 20_000,
  },
});
