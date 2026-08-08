import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { DevtoolsError, parseRegistry, resolveWorld } from '@mc-fleet/world-core';
import { describe, expect, it } from 'vitest';

describe('fleet registry', () => {
  it('resolves registered world resources inside a server root', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-fleet-registry-'));
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
              snapshot: 'snapshots/main/region',
              databases: { world: 'data/world.db' },
            },
          ],
        },
      ],
    });
    const resolved = resolveWorld(registry, 'demo', 'main');
    expect(resolved.snapshotDirectory).toBe(path.join(root, 'snapshots/main/region'));
    expect(resolved.databases.world).toBe(path.join(root, 'data/world.db'));
  });

  it('refuses resource paths that escape the registered root', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-fleet-registry-'));
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
              snapshot: '../outside/region',
            },
          ],
        },
      ],
    });
    expect(() => resolveWorld(registry, 'demo', 'main')).toThrowError(DevtoolsError);
  });
});
