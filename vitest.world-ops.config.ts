import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['test/world-ops/importTownExpansionRelease.test.ts'], environment: 'node', maxWorkers: 1, testTimeout: 10000 } });
