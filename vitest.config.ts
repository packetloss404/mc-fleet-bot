import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['src/**/*.test.ts', 'test/**/*.test.ts'], exclude: ['test/world-ops/**'], environment: 'node', maxWorkers: 2, testTimeout: 10000 } });
