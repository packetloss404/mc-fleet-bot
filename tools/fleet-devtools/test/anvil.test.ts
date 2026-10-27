import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { censusSnapshot, summarizeSnapshot } from '@mc-fleet/anvil';
import { describe, expect, it } from 'vitest';

function emptyRegion(directory: string, filename: string): void {
  fs.writeFileSync(path.join(directory, filename), Buffer.alloc(8192));
}

describe('read-only Anvil inspection', () => {
  it('creates a deterministic snapshot identity and region extent', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-fleet-anvil-'));
    emptyRegion(directory, 'r.1.-2.mca');
    emptyRegion(directory, 'r.-3.4.mca');
    const first = summarizeSnapshot(directory);
    const second = summarizeSnapshot(directory);
    expect(first.sha256).toBe(second.sha256);
    expect(first.regionFileCount).toBe(2);
    expect(first.regionBounds).toEqual({
      minRegionX: -3,
      maxRegionX: 1,
      minRegionZ: -2,
      maxRegionZ: 4,
    });
  });

  it('reports an empty synthetic region as a complete zero-block census', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-fleet-anvil-'));
    emptyRegion(directory, 'r.0.0.mca');
    const result = await censusSnapshot(directory);
    expect(result.complete).toBe(true);
    expect(result.chunksVisited).toBe(0);
    expect(result.blocksCounted).toBe(0);
  });
});
