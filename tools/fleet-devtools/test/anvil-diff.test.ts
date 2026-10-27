import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { diffSnapshots, summarizeSnapshot } from '@mc-fleet/anvil';
import { describe, expect, it } from 'vitest';

import { buildRegion } from './fixtures/anvil-region.js';

function tempDirectory(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mc-fleet-diff-'));
}

function writeRegion(directory: string, name: string, fill: number): void {
  const region = buildRegion({
    sections: [{ y: 0, palette: [{ Name: 'minecraft:stone' }] }],
  });
  // Mutate the first few bytes deterministically so different `fill` values
  // produce different per-region SHA-256s.
  region[16] = fill & 0xff;
  region[17] = (fill >> 8) & 0xff;
  fs.writeFileSync(path.join(directory, name), region);
}

describe('snapshot diff', () => {
  it('reports two identical snapshots as identical with zero added/removed/changed', () => {
    const a = tempDirectory();
    const b = tempDirectory();
    writeRegion(a, 'r.0.0.mca', 1);
    writeRegion(b, 'r.0.0.mca', 1);
    const diff = diffSnapshots(a, b);
    expect(diff.identical).toBe(true);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.changed).toEqual([]);
    expect(diff.unchanged).toBe(1);
    expect(diff.thisSnapshot.sha256).toBe(diff.otherSnapshot.sha256);
  });

  it('classifies per-region changes into added, removed, and changed', () => {
    const a = tempDirectory();
    const b = tempDirectory();
    writeRegion(a, 'r.0.0.mca', 1);
    writeRegion(a, 'r.1.0.mca', 1);
    writeRegion(b, 'r.0.0.mca', 2); // changed
    writeRegion(b, 'r.2.0.mca', 1); // added in b
    const diff = diffSnapshots(a, b);
    expect(diff.identical).toBe(false);
    expect(diff.added.map((region) => region.filename)).toEqual(['r.2.0.mca']);
    expect(diff.removed.map((region) => region.filename)).toEqual(['r.1.0.mca']);
    expect(diff.changed.map((region) => region.filename)).toEqual(['r.0.0.mca']);
    expect(diff.unchanged).toBe(0);
    expect(diff.thisSnapshot.sha256).not.toBe(diff.otherSnapshot.sha256);
  });

  it('exposes the per-region SHA-256 of the changed region', () => {
    const a = tempDirectory();
    const b = tempDirectory();
    writeRegion(a, 'r.0.0.mca', 1);
    writeRegion(b, 'r.0.0.mca', 2);
    const aSummary = summarizeSnapshot(a);
    const bSummary = summarizeSnapshot(b);
    const diff = diffSnapshots(a, b);
    expect(diff.changed).toHaveLength(1);
    expect(diff.changed[0]?.thisSha256).toBe(aSummary.members[0]?.sha256);
    expect(diff.changed[0]?.otherSha256).toBe(bSummary.members[0]?.sha256);
  });
});
