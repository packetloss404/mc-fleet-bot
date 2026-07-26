import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { SchematicStore } from '../../src/build/SchematicStore';

/**
 * Regression test for the silent zero-size schematic.
 *
 * `getSchematicInfo` returns `size: {x:0,y:0,z:0}` when a schematic cannot be
 * parsed. Those zeros are indistinguishable from a measurement: `{x:0,y:0,z:0}`
 * is a truthy object, so guards of the form `if (!info.size)` pass and callers
 * treat the failure as a zero-sized building. The consequence is not cosmetic —
 * TownBrain wrote the zeros onto the town registry row, SiteSelector derives its
 * avoidRects from those rows, and zero-area rects make siting blind (a well was
 * placed fully inside the town hall). `parseFailed` makes the distinction
 * explicit so callers can refuse instead of guessing.
 *
 * Real case: 'small medieval town hall.schem' is 15,496 bytes, which is under the
 * 50,000-byte file-size-estimation threshold, so it takes the real parse path —
 * and that parse fails, yielding the fabricated zeros.
 */
let dir: string;
let store: SchematicStore;

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'schem-store-'));
  // Not a valid gzipped NBT schematic — parsing must fail.
  fs.writeFileSync(path.join(dir, 'corrupt.schem'), 'this is not a schematic');
  store = new SchematicStore(dir);
});

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('SchematicStore.getSchematicInfo on an unparseable schematic', () => {
  it('flags parseFailed so zeros cannot be mistaken for measurements', async () => {
    const info = await store.getSchematicInfo('corrupt.schem');
    expect(info).not.toBeNull();
    expect(info!.parseFailed).toBe(true);
  });

  it('still returns placeholder zeros (shape preserved for the listing UI)', async () => {
    const info = await store.getSchematicInfo('corrupt.schem');
    expect(info!.size).toEqual({ x: 0, y: 0, z: 0 });
    expect(info!.blockCount).toBe(0);
  });

  it('demonstrates why the flag is needed: the zero size is TRUTHY', async () => {
    const info = await store.getSchematicInfo('corrupt.schem');
    // This is the trap. Every `if (!info.size) return` guard in the codebase
    // sails straight past a failed parse, which is why an explicit flag is the
    // only safe signal.
    expect(!info!.size).toBe(false);
    expect(Boolean(info!.size)).toBe(true);
  });

  it('returns null for a file that does not exist (distinct from a failed parse)', async () => {
    expect(await store.getSchematicInfo('nope.schem')).toBeNull();
  });
});
