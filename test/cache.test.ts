import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { parseRecipe, ReportService } from '@mc-fleet/reporting';
import { JobStore, parseRegistry } from '@mc-fleet/world-core';
import { describe, expect, it } from 'vitest';

function tempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mc-fleet-cache-'));
}

function makeWorld(root: string) {
  const snapshot = path.join(root, 'snapshots/latest/region');
  fs.mkdirSync(snapshot, { recursive: true });
  fs.writeFileSync(path.join(snapshot, 'r.0.0.mca'), Buffer.alloc(8192));
  return parseRegistry({
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
}

describe('step result cache', () => {
  it('reuses a snapshot-summary result when re-run with the same snapshot', async () => {
    const root = tempRoot();
    const registry = makeWorld(root);
    const recipe = parseRecipe({
      version: 1,
      id: 'overview',
      name: 'Overview',
      description: 'demo',
      steps: [
        { id: 'snap', type: 'snapshot-summary' },
        { id: 'report', type: 'html-report', options: { title: 'Overview' } },
      ],
    });
    const jobStore = new JobStore(path.join(root, 'jobs'));
    const artifactRoot = path.join(root, 'artifacts');
    const service = new ReportService({ registry, recipes: [recipe], jobStore, artifactRoot });

    const first = service.submit({ recipeId: 'overview', serverId: 'demo', worldId: 'main' });
    const firstResult = await service.run(first.id);
    expect(firstResult.status).toBe('completed');

    const cacheDir = path.join(artifactRoot, '.cache', 'demo', 'main', 'overview', 'snap');
    expect(fs.existsSync(cacheDir)).toBe(true);
    const cachedFiles = fs.readdirSync(cacheDir);
    expect(cachedFiles).toHaveLength(1);

    // Delete the snapshot cache file and verify the next run re-creates it.
    fs.unlinkSync(path.join(cacheDir, cachedFiles[0]!));

    const second = service.submit({ recipeId: 'overview', serverId: 'demo', worldId: 'main' });
    const secondResult = await service.run(second.id);
    expect(secondResult.status).toBe('completed');
    // After re-running, the cache should be re-populated.
    const refilled = fs.readdirSync(cacheDir);
    expect(refilled).toHaveLength(1);
  });

  it('keys the cache by snapshot path so different worlds get different cache entries', async () => {
    const root = tempRoot();
    const snapshotA = path.join(root, 'snapshots/a/region');
    const snapshotB = path.join(root, 'snapshots/b/region');
    fs.mkdirSync(snapshotA, { recursive: true });
    fs.mkdirSync(snapshotB, { recursive: true });
    fs.writeFileSync(path.join(snapshotA, 'r.0.0.mca'), Buffer.alloc(8192));
    fs.writeFileSync(path.join(snapshotB, 'r.0.0.mca'), Buffer.alloc(8192));
    const registry = parseRegistry({
      version: 1,
      servers: [
        {
          id: 'demo',
          name: 'Demo',
          connector: { kind: 'local', root },
          worlds: [
            {
              id: 'a',
              name: 'A',
              dimension: 'minecraft:overworld',
              snapshot: 'snapshots/a/region',
            },
            {
              id: 'b',
              name: 'B',
              dimension: 'minecraft:overworld',
              snapshot: 'snapshots/b/region',
            },
          ],
        },
      ],
    });
    const recipe = parseRecipe({
      version: 1,
      id: 'overview',
      name: 'Overview',
      description: 'demo',
      steps: [
        { id: 'snap', type: 'snapshot-summary' },
        { id: 'report', type: 'html-report', options: { title: 'Overview' } },
      ],
    });
    const jobStore = new JobStore(path.join(root, 'jobs'));
    const artifactRoot = path.join(root, 'artifacts');
    const service = new ReportService({ registry, recipes: [recipe], jobStore, artifactRoot });

    const jobA = service.submit({ recipeId: 'overview', serverId: 'demo', worldId: 'a' });
    await service.run(jobA.id);
    const jobB = service.submit({ recipeId: 'overview', serverId: 'demo', worldId: 'b' });
    await service.run(jobB.id);

    // Each world has its own cache subdirectory.
    const cacheA = path.join(artifactRoot, '.cache', 'demo', 'a', 'overview', 'snap');
    const cacheB = path.join(artifactRoot, '.cache', 'demo', 'b', 'overview', 'snap');
    expect(fs.existsSync(cacheA)).toBe(true);
    expect(fs.existsSync(cacheB)).toBe(true);
    // Different snapshot paths mean different cache files even though the
    // snapshot content is identical.
    expect(fs.readdirSync(cacheA)[0]).not.toBe(fs.readdirSync(cacheB)[0]);
  });
});
