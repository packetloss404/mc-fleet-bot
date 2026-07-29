import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { DevtoolsError } from '@mc-fleet/world-core';

import type { SnapshotMember, SnapshotSummary } from './types.js';

const REGION_PATTERN = /^r\.(-?\d+)\.(-?\d+)\.mca$/;

function declaredChunkCount(buffer: Buffer): number {
  if (buffer.length < 4096) return 0;
  let count = 0;
  for (let offset = 0; offset < 4096; offset += 4) {
    if (buffer.readUInt32BE(offset) !== 0) count += 1;
  }
  return count;
}

export function summarizeSnapshot(directory: string): SnapshotSummary {
  const resolved = path.resolve(directory);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new DevtoolsError(
      `Snapshot region directory not found: ${resolved}`,
      'SNAPSHOT_NOT_FOUND',
    );
  }
  const filenames = fs.readdirSync(resolved)
    .filter((filename) => REGION_PATTERN.test(filename))
    .sort();
  if (filenames.length === 0) {
    throw new DevtoolsError(
      `Snapshot has no Anvil region files: ${resolved}`,
      'EMPTY_SNAPSHOT',
    );
  }
  const aggregate = crypto.createHash('sha256');
  const members: SnapshotMember[] = [];
  for (const filename of filenames) {
    const match = REGION_PATTERN.exec(filename);
    if (!match) continue;
    const fullPath = path.join(resolved, filename);
    const content = fs.readFileSync(fullPath);
    const stat = fs.statSync(fullPath);
    aggregate.update(filename);
    aggregate.update('\0');
    aggregate.update(content);
    aggregate.update('\0');
    members.push({
      filename,
      bytes: content.length,
      modifiedAt: stat.mtime.toISOString(),
      sha256: crypto.createHash('sha256').update(content).digest('hex'),
      regionX: Number(match[1]),
      regionZ: Number(match[2]),
      declaredChunks: declaredChunkCount(content),
    });
  }
  const xs = members.map((member) => member.regionX);
  const zs = members.map((member) => member.regionZ);
  return {
    directory: resolved,
    algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
    sha256: aggregate.digest('hex'),
    regionFileCount: members.length,
    declaredChunkCount: members.reduce((sum, member) => sum + member.declaredChunks, 0),
    bytes: members.reduce((sum, member) => sum + member.bytes, 0),
    regionBounds: members.length > 0
      ? {
          minRegionX: Math.min(...xs),
          maxRegionX: Math.max(...xs),
          minRegionZ: Math.min(...zs),
          maxRegionZ: Math.max(...zs),
        }
      : null,
    members,
  };
}
