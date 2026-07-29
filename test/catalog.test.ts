import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { catalogDatabase, exportWorldFeatures } from '@mc-fleet/catalog';
import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';

describe('read-only database catalog', () => {
  it('counts tables and exports durable world features', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-fleet-db-'));
    const filename = path.join(directory, 'world.db');
    const database = new Database(filename);
    database.exec(`
      CREATE TABLE world_features (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        kind TEXT NOT NULL
      );
      INSERT INTO world_features (id, name, kind)
      VALUES ('one', 'Test Tunnel', 'tunnel');
    `);
    database.close();

    const catalog = catalogDatabase(filename);
    expect(catalog.quickCheck).toEqual(['ok']);
    expect(catalog.tableCounts.world_features).toBe(1);

    const features = exportWorldFeatures(filename);
    expect(features.total).toBe(1);
    expect(features.records[0]).toMatchObject({
      id: 'one',
      name: 'Test Tunnel',
      kind: 'tunnel',
    });
  });
});
