import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { censusSnapshot, summarizeSnapshot } from '@mc-fleet/anvil';
import nbt from 'prismarine-nbt';
import { describe, expect, it } from 'vitest';
import zlib from 'node:zlib';

import { buildRegion } from './fixtures/anvil-region.js';

function tempSnapshotDirectory(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mc-fleet-anvil-census-'));
}

describe('anvil census decoder', () => {
  it('decodes a 2-palette section with alternating block indices', async () => {
    const directory = tempSnapshotDirectory();
    const blocks: number[] = [];
    for (let index = 0; index < 4096; index += 1) blocks.push(index % 2);
    fs.writeFileSync(
      path.join(directory, 'r.0.0.mca'),
      buildRegion({
        sections: [{
          y: 0,
          palette: [{ Name: 'minecraft:stone' }, { Name: 'minecraft:dirt' }],
          blocks,
        }],
      }),
    );
    const summary = summarizeSnapshot(directory);
    expect(summary.regionFileCount).toBe(1);
    const census = await censusSnapshot(directory);
    expect(census.chunksVisited).toBe(1);
    expect(census.chunksDecoded).toBe(1);
    expect(census.sectionsDecoded).toBe(1);
    expect(census.blocksCounted).toBe(4096);
    expect(census.uniqueBlockStates).toBe(2);
    expect(census.complete).toBe(true);
    const byBlock = Object.fromEntries(census.blocks.map((entry) => [entry.block, entry.count]));
    expect(byBlock['minecraft:stone']).toBe(2048);
    expect(byBlock['minecraft:dirt']).toBe(2048);
  });

  it('honors inclusive bounds and reports the truncated chunk count', async () => {
    const directory = tempSnapshotDirectory();
    fs.writeFileSync(
      path.join(directory, 'r.0.0.mca'),
      buildRegion({
        sections: [{
          y: 4,
          palette: [{ Name: 'minecraft:stone' }],
        }],
      }),
    );
    // Chunk is at (0,0), so its world XZ range is 0..15. With bounds
    // X [-5, 5] and Z [-5, 5] the intersection is 6 × 16 × 6 = 576.
    const census = await censusSnapshot(directory, {
      minX: -5, minY: 0, minZ: -5,
      maxX: 5, maxY: 200, maxZ: 5,
    });
    expect(census.complete).toBe(true);
    expect(census.sectionsDecoded).toBe(1);
    expect(census.blocksCounted).toBe(576);
  });

  it('skips a section whose Y range is fully outside the requested bounds', async () => {
    const directory = tempSnapshotDirectory();
    fs.writeFileSync(
      path.join(directory, 'r.0.0.mca'),
      buildRegion({
        sections: [{
          y: 0,
          palette: [{ Name: 'minecraft:stone' }],
        }],
      }),
    );
    const census = await censusSnapshot(directory, {
      minX: -100, minY: 200, minZ: -100,
      maxX: 100, maxY: 300, maxZ: 100,
    });
    expect(census.sectionsDecoded).toBe(0);
    expect(census.blocksCounted).toBe(0);
  });

  it('surfaces a snapshot sha256 bound to the census result', async () => {
    const directory = tempSnapshotDirectory();
    fs.writeFileSync(
      path.join(directory, 'r.0.0.mca'),
      buildRegion({
        sections: [{ y: 0, palette: [{ Name: 'minecraft:stone' }] }],
      }),
    );
    const summary = summarizeSnapshot(directory);
    const census = await censusSnapshot(directory);
    expect(census.snapshotSha256).toBe(summary.sha256);
  });

  it('round-trips the section NBT through prismarine-nbt', async () => {
    // Sanity check: the fixture writer and the parser agree on the section
    // layout. This guards against future NBT writer drift.
    const region = buildRegion({
      sections: [{ y: 0, palette: [{ Name: 'minecraft:stone' }] }],
    });
    const length = region.readUInt32BE(8192);
    const compressionByte = region[8192 + 4];
    expect(compressionByte).toBe(2); // zlib
    const payload = region.subarray(8192 + 5, 8192 + 5 + length - 1);
    const raw = zlib.unzipSync(payload);
    const parsed = await nbt.parse(raw);
    const simplified = nbt.simplify(parsed.parsed) as {
      Level: { Sections: Array<{ Y: number; block_states: { palette: Array<{ Name: string }> } }> };
    };
    expect(simplified.Level.Sections).toHaveLength(1);
    expect(simplified.Level.Sections[0]?.Y).toBe(0);
    expect(simplified.Level.Sections[0]?.block_states.palette[0]?.Name).toBe('minecraft:stone');
  });
});
