import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'cobalt-rr-access-01';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cobalt-rr-access-01-'));

type Manifest = {
  manifestIdentity: string;
  mvpScope: boolean;
  scopeIds: string[];
  packages: Array<{ key: string; forward: string; rollback: string }>;
  scope: {
    releaseId: string;
    clearVolume: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
    sleeveBox: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
    waterBand: { minY: number; maxY: number };
    built: { cellCount: number };
    sleeveFaceCells: { cellCount: number };
    sealedFluidDisplacementCells: { count: number };
    waterBandShaftInteriorDisplaced: { count: number };
    held: { cellCount: number; byReason: Record<string, number> };
    shaftDry: boolean;
    preservedWaterBodyBehindSleeve: boolean;
    routeCommissioned: boolean;
  };
  operations: Record<string, {
    forwardCommandCount: number;
    rollbackCommandCount: number;
    exactInverse: boolean;
  }>;
  isolation: {
    sourceHazardCount: number;
    sealedFluidDisplacementCount: number;
    waterBandShaftInteriorDisplacementCount: number;
    operatedHaloForbiddenBlockCount: number;
    blockEntityIntersectionCount: number;
    savedEntityIntersectionCount: number;
  };
};

let manifest: Manifest;

describe('COBALT-RR-ACCESS-01 Ravensreach station access shaft with sealed water sleeve', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_cobalt_rr_access_01.mjs',
      '--out-dir', temporaryDirectory,
      '--generated-at', '2026-08-25T06:12:00Z',
      '--snapshot', 'data/worldsnap-cobalt-rr-source-20260825T061214',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 180_000 });
    manifest = JSON.parse(
      fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.release-manifest.json`), 'utf8'),
    ) as Manifest;
  });

  afterAll(() => {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('reproduces the canonical build artifacts byte-for-byte', () => {
    for (const pkg of ['sleeve']) {
      for (const dir of ['forward', 'rollback']) {
        expect(fs.readFileSync(path.join(temporaryDirectory, `${BASENAME}.${pkg}.${dir}.txt`)))
          .toEqual(fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.${pkg}.${dir}.txt`)));
      }
    }
  });

  it('emits a valid manifest under the PASSENGER-RAILWAY scope', () => {
    expect(manifest.manifestIdentity).toMatch(/^[0-9a-f]{64}$/);
    expect(manifest.mvpScope).toBe(false);
    expect(manifest.scopeIds).toEqual(['PASSENGER-RAILWAY']);
    expect(manifest.scope.releaseId).toBe('COBALT-RR-ACCESS-01');
    expect(manifest.packages.map(({ key }) => key)).toEqual(['sleeve']);
  });

  it('emits the exact executed scope: 711 targets, 0 held', () => {
    expect(manifest.operations['sleeve'].forwardCommandCount).toBe(711);
    expect(manifest.operations['sleeve'].rollbackCommandCount).toBe(711);
    expect(manifest.operations['sleeve'].exactInverse).toBe(true);
    expect(manifest.scope.built.cellCount).toBe(711);
    expect(manifest.scope.sleeveFaceCells.cellCount).toBe(690);
    expect(manifest.scope.waterBandShaftInteriorDisplaced.count).toBe(21);
    expect(manifest.scope.held.cellCount).toBe(0);
  });

  it('binds the exact clear volume, sleeve box, and water band', () => {
    expect(manifest.scope.clearVolume).toEqual({
      minX: -159, maxX: -157, minY: 23, maxY: 62, minZ: -391, maxZ: -389,
    });
    expect(manifest.scope.sleeveBox).toEqual({
      minX: -160, maxX: -156, minY: 22, maxY: 63, minZ: -392, maxZ: -388,
    });
    expect(manifest.scope.waterBand).toEqual({ minY: 33, maxY: 39 });
  });

  it('declares the shaft dry, water preserved behind the sleeve, route uncommissioned', () => {
    expect(manifest.scope.shaftDry).toBe(true);
    expect(manifest.scope.preservedWaterBodyBehindSleeve).toBe(true);
    expect(manifest.scope.routeCommissioned).toBe(false);
  });

  it('isolates all targets from containers, block entities, and saved entities', () => {
    expect(manifest.isolation.sourceHazardCount).toBe(0);
    expect(manifest.isolation.operatedHaloForbiddenBlockCount).toBe(0);
    expect(manifest.isolation.blockEntityIntersectionCount).toBe(0);
    expect(manifest.isolation.savedEntityIntersectionCount).toBe(0);
  });

  it('seals exactly the 33 face fluid cells and 21 water-band interior cells', () => {
    expect(manifest.isolation.sealedFluidDisplacementCount).toBe(33);
    expect(manifest.isolation.waterBandShaftInteriorDisplacementCount).toBe(21);
  });

  it('proves the forward and rollback REPL files are exact inverses', () => {
    const forward = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.sleeve.forward.txt`), 'utf8')
      .split('\n').filter((l) => l.startsWith('REPL'));
    const rollback = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.sleeve.rollback.txt`), 'utf8')
      .split('\n').filter((l) => l.startsWith('REPL'));
    expect(forward.length).toBe(711);
    expect(rollback.length).toBe(711);
    const forwardSet = new Set(forward);
    for (const line of rollback) {
      const f = line.split(/\s+/);
      const inverted = `REPL ${f[1]} ${f[2]} ${f[3]} ${f[4]} ${f[5]} ${f[6]} ${f[8]} ${f[7]}`;
      expect(forwardSet.has(inverted)).toBe(true);
    }
  });

  it('targets every sleeve cell to polished_deepslate and seals the water sources', () => {
    const forward = fs.readFileSync(
      path.join(BUILDOPS, `${BASENAME}.sleeve.forward.txt`), 'utf8',
    ).split('\n').filter((l) => l.startsWith('REPL'));
    let waterSources = 0;
    for (const line of forward) {
      const f = line.split(/\s+/);
      expect(f[8]).toBe('minecraft:polished_deepslate');
      expect(f[1]).toBe(f[4]);
      expect(f[2]).toBe(f[5]);
      expect(f[3]).toBe(f[6]);
      if (f[7].startsWith('minecraft:water')) waterSources += 1;
    }
    // 33 face water + 21 interior water-band water = 54 water-source seals
    expect(waterSources).toBe(54);
  });

  it('never targets a cell outside the sleeve box', () => {
    const forward = fs.readFileSync(
      path.join(BUILDOPS, `${BASENAME}.sleeve.forward.txt`), 'utf8',
    ).split('\n').filter((l) => l.startsWith('REPL'));
    for (const line of forward) {
      const f = line.split(/\s+/);
      const x = Number(f[1]);
      const y = Number(f[2]);
      const z = Number(f[3]);
      const inBox =
        (y === 22 && x >= -160 && x <= -156 && z >= -392 && z <= -388)
        || (y === 63 && x >= -160 && x <= -156 && z >= -392 && z <= -388)
        || (x === -160 && y >= 23 && y <= 62 && z >= -392 && z <= -388)
        || (x === -156 && y >= 23 && y <= 62 && z >= -392 && z <= -388)
        || (z === -392 && x >= -159 && x <= -157 && y >= 23 && y <= 62)
        || (z === -388 && x >= -159 && x <= -157 && y >= 23 && y <= 62)
        || (y >= 33 && y <= 39 && x >= -159 && x <= -157 && z >= -391 && z <= -389);
      expect(inBox).toBe(true);
    }
  });
});
