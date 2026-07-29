import fs from 'node:fs';
import path from 'node:path';

import { DevtoolsError, sha256File } from '@mc-fleet/world-core';
import Database from 'better-sqlite3';

import type {
  DatabaseCatalog,
  DatabaseObjectSchema,
  WorldFeatureExport,
} from './types.js';

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function openReadOnly(filename: string): Database.Database {
  const resolved = path.resolve(filename);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    throw new DevtoolsError(`Database not found: ${resolved}`, 'DATABASE_NOT_FOUND');
  }
  const database = new Database(resolved, {
    readonly: true,
    fileMustExist: true,
  });
  database.pragma('query_only = ON');
  return database;
}

function jsonValue(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (Buffer.isBuffer(value)) {
    return {
      encoding: 'base64',
      bytes: value.length,
      value: value.toString('base64'),
    };
  }
  return value;
}

export function catalogDatabase(filename: string): DatabaseCatalog {
  const resolved = path.resolve(filename);
  const database = openReadOnly(resolved);
  try {
    const schema = database.prepare(`
      SELECT name, type, sql
      FROM sqlite_master
      WHERE type IN ('table', 'view')
        AND name NOT LIKE 'sqlite_%'
      ORDER BY type, name
    `).all() as DatabaseObjectSchema[];
    const tableCounts: Record<string, number> = {};
    for (const item of schema) {
      if (item.type !== 'table') continue;
      const row = database.prepare(
        `SELECT COUNT(*) AS count FROM ${quoteIdentifier(item.name)}`,
      ).get() as { count: number | bigint };
      tableCounts[item.name] = Number(row.count);
    }
    const checks = database.pragma('quick_check') as Array<Record<string, unknown>>;
    return {
      filename: resolved,
      bytes: fs.statSync(resolved).size,
      sha256: sha256File(resolved),
      quickCheck: checks.map((row) => String(Object.values(row)[0] ?? 'unknown')),
      tableCounts,
      schema,
    };
  } finally {
    database.close();
  }
}

export function exportWorldFeatures(
  filename: string,
  limit = 100_000,
): WorldFeatureExport {
  if (!Number.isInteger(limit) || limit < 1 || limit > 1_000_000) {
    throw new DevtoolsError(
      'Feature export limit must be an integer from 1 to 1,000,000',
      'INVALID_LIMIT',
    );
  }
  const resolved = path.resolve(filename);
  const database = openReadOnly(resolved);
  try {
    const exists = database.prepare(`
      SELECT 1 AS present
      FROM sqlite_master
      WHERE type = 'table' AND name = 'world_features'
    `).get() as { present: number } | undefined;
    if (!exists) {
      throw new DevtoolsError(
        'Database does not contain a world_features table',
        'WORLD_FEATURES_NOT_FOUND',
      );
    }
    const columnRows = database.pragma('table_info(world_features)') as Array<{
      name: string;
    }>;
    const columns = columnRows.map((row) => row.name);
    const count = database.prepare(
      'SELECT COUNT(*) AS count FROM world_features',
    ).get() as { count: number | bigint };
    const total = Number(count.count);
    const rows = database.prepare(
      'SELECT * FROM world_features ORDER BY rowid LIMIT ?',
    ).all(limit) as Array<Record<string, unknown>>;
    return {
      database: resolved,
      table: 'world_features',
      limit,
      total,
      truncated: total > rows.length,
      columns,
      records: rows.map((row) => Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key, jsonValue(value)]),
      )),
    };
  } finally {
    database.close();
  }
}
