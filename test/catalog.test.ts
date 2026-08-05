import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { catalogDatabase, exportWorldFeatures } from '@mc-fleet/catalog';
import Database from 'better-sqlite3';
import { DevtoolsError } from '@mc-fleet/world-core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-fleet-catalog-'));
});

afterEach(() => {
  // better-sqlite3 may keep file handles for a moment after close(); use
  // best-effort cleanup and ignore lock errors on Windows.
  try {
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
  } catch {
    // OS will reclaim the temp dir eventually.
  }
});

function seedDatabase(): string {
  const filename = path.join(tempDir, 'world.db');
  const database = new Database(filename);
  database.exec(`
    CREATE TABLE world_features (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      payload BLOB,
      rank INTEGER
    );
    CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT);
  `);
  const insert = database.prepare(
    'INSERT INTO world_features (id, name, kind, payload, rank) VALUES (?, ?, ?, ?, ?)',
  );
  for (let i = 0; i < 5; i += 1) {
    insert.run(`f-${i}`, `Feature ${i}`, 'tunnel', Buffer.from([i, i + 1, i + 2]), BigInt(100 + i));
  }
  database.close();
  return filename;
}

describe('read-only database catalog', () => {
  it('counts tables and exports durable world features', () => {
    const filename = seedDatabase();
    const catalog = catalogDatabase(filename);
    expect(catalog.quickCheck).toEqual(['ok']);
    expect(catalog.tableCounts.world_features).toBe(5);
    expect(catalog.tableCounts.notes).toBe(0);
    expect(catalog.bytes).toBeGreaterThan(0);
    expect(catalog.sha256).toMatch(/^[a-f0-9]{64}$/);

    const features = exportWorldFeatures(filename);
    expect(features.total).toBe(5);
    expect(features.truncated).toBe(false);
    expect(features.records[0]).toMatchObject({
      id: 'f-0',
      name: 'Feature 0',
      kind: 'tunnel',
    });
  });

  it('serialises Buffer and bigint fields into a JSON-safe form', () => {
    const filename = seedDatabase();
    const features = exportWorldFeatures(filename);
    const first = features.records[0]!;
    expect(first['payload']).toEqual({
      encoding: 'base64',
      bytes: 3,
      value: expect.any(String),
    });
    // Safe integers are enabled globally, so SQLite INTEGER columns
    // come back as `bigint` and the catalog stringifies them.
    expect(typeof first['rank']).toBe('string');
    expect(BigInt(first['rank'] as string)).toBe(100n);
  });

  it('flags truncated exports when the limit is below the row count', () => {
    const filename = seedDatabase();
    const features = exportWorldFeatures(filename, 2);
    expect(features.records).toHaveLength(2);
    expect(features.total).toBe(5);
    expect(features.truncated).toBe(true);
  });

  it('refuses limits outside the supported range', () => {
    const filename = seedDatabase();
    expect(() => exportWorldFeatures(filename, 0)).toThrow(DevtoolsError);
    expect(() => exportWorldFeatures(filename, 1_000_001)).toThrow(/Feature export limit/);
    expect(() => exportWorldFeatures(filename, 1.5)).toThrow(DevtoolsError);
  });

  it('refuses to catalog a database without a world_features table', () => {
    const filename = path.join(tempDir, 'no-features.db');
    const database = new Database(filename);
    database.exec('CREATE TABLE only_other (id INTEGER PRIMARY KEY)');
    database.close();
    expect(() => exportWorldFeatures(filename)).toThrow(/world_features/);
    const catalog = catalogDatabase(filename);
    expect(catalog.tableCounts.only_other).toBe(0);
    expect(catalog.tableCounts.world_features).toBeUndefined();
  });

  it('refuses to catalog a missing database file', () => {
    expect(() => catalogDatabase(path.join(tempDir, 'missing.db'))).toThrow(/Database not found/);
  });
});
