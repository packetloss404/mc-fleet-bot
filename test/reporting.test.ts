import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { parseRecipe, ReportService } from '@mc-fleet/reporting';
import { JobStore, parseRegistry } from '@mc-fleet/world-core';
import { describe, expect, it } from 'vitest';

describe('recipe-driven reports', () => {
  it('runs a snapshot report into a fresh, hash-bound artifact directory', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-fleet-report-'));
    const snapshot = path.join(root, 'snapshots/latest/region');
    fs.mkdirSync(snapshot, { recursive: true });
    fs.writeFileSync(path.join(snapshot, 'r.0.0.mca'), Buffer.alloc(8192));
    const registry = parseRegistry({
      version: 1,
      servers: [
        {
          id: 'demo',
          name: 'Demo',
          connector: { kind: 'local', root },
          worlds: [
            {
              id: 'main',
              name: 'Main',
              dimension: 'minecraft:overworld',
              snapshot: 'snapshots/latest/region',
            },
          ],
        },
      ],
    });
    const recipe = parseRecipe({
      version: 1,
      id: 'overview',
      name: 'Overview',
      description: 'Test report',
      steps: [
        { id: 'snapshot', type: 'snapshot-summary' },
        { id: 'report', type: 'html-report', options: { title: 'Overview' } },
      ],
    });
    const jobStore = new JobStore(path.join(root, 'jobs'));
    const service = new ReportService({
      registry,
      recipes: [recipe],
      jobStore,
      artifactRoot: path.join(root, 'artifacts'),
    });
    const submitted = service.submit({
      recipeId: 'overview',
      serverId: 'demo',
      worldId: 'main',
    });
    const completed = await service.run(submitted.id);
    expect(completed.status).toBe('completed');
    expect(completed.artifacts).toContain('report.html');
    expect(completed.artifacts).toContain('artifact-manifest.json');
    const manifest = JSON.parse(
      fs.readFileSync(path.join(completed.outputDirectory, 'artifact-manifest.json'), 'utf8'),
    ) as { source: { snapshotSha256: string }; artifacts: unknown[] };
    expect(manifest.source.snapshotSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(manifest.artifacts.length).toBeGreaterThan(1);
  });

  it('records the active step when a report fails', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-fleet-report-fail-'));
    const snapshot = path.join(root, 'snapshots/latest/region');
    fs.mkdirSync(snapshot, { recursive: true });
    fs.writeFileSync(path.join(snapshot, 'r.0.0.mca'), Buffer.alloc(8192));
    const registry = parseRegistry({
      version: 1,
      servers: [
        {
          id: 'demo',
          name: 'Demo',
          connector: { kind: 'local', root },
          worlds: [
            {
              id: 'main',
              name: 'Main',
              dimension: 'minecraft:overworld',
              snapshot: 'snapshots/latest/region',
              databases: { world: 'missing.db' },
            },
          ],
        },
      ],
    });
    const recipe = parseRecipe({
      version: 1,
      id: 'failing',
      name: 'Failing',
      description: 'Failure logging test',
      steps: [
        {
          id: 'catalog',
          type: 'database-catalog',
          options: { database: 'world' },
        },
      ],
    });
    const jobStore = new JobStore(path.join(root, 'jobs'));
    const service = new ReportService({
      registry,
      recipes: [recipe],
      jobStore,
      artifactRoot: path.join(root, 'artifacts'),
    });
    const submitted = service.submit({
      recipeId: 'failing',
      serverId: 'demo',
      worldId: 'main',
    });
    const failed = await service.run(submitted.id);

    expect(failed.status).toBe('failed');
    expect(failed.currentStep).toBeUndefined();
    expect(failed.logs.at(-1)).toMatchObject({
      level: 'error',
      stepId: 'catalog',
    });
  });
});
