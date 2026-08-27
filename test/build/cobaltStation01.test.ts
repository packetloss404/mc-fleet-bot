import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'cobalt-wl-platform-01';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cobalt-wl-platform-01-'));

type Manifest = {
  manifestIdentity: string;
  mvpScope: boolean;
  scopeIds: string[];
  packages: Array<{ key: string; forward: string; rollback: string }>;
  scope: {
    releaseId: string;
    clearVolume: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
    deckSurfaceCells: { cellCount: number };
    built: { cellCount: number };
    sealedFluidDisplacementCells: { count: number };
    held: { cellCount: number; byReason: Record<string, number> };
    deckDry: boolean;
    preservedWaterBodyBehindLiner: boolean;
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
    operatedHaloForbiddenBlockCount: number;
    blockEntityIntersectionCount: number;
    savedEntityIntersectionCount: number;
  };
};

let manifest: Manifest;

describe('COBALT-STATION-01 Westlight platform deck with sealed liner', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_cobalt_wl_platform_01.mjs',
      '--out-dir', temporaryDirectory,
      '--generated-at', '2026-08-25T08:00:00Z',
      '--snapshot', 'data/worldsnap-cobalt-rr-post-20260825T061750',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 180_000 });
    manifest = JSON.parse(
      fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.release-manifest.json`), 'utf8'),
    ) as Manifest;
  });

  afterAll(() => {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('reproduces the canonical build artifacts byte-for-byte', () => {
    for (const pkg of ['platform']) {
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
    expect(manifest.scope.releaseId).toBe('COBALT-WL-PLATFORM-01');
    expect(manifest.packages.map(({ key }) => key)).toEqual(['platform']);
  });

  it('emits the exact executed scope: 550 targets, 0 held', () => {
    expect(manifest.operations['platform'].forwardCommandCount).toBe(550);
    expect(manifest.operations['platform'].rollbackCommandCount).toBe(550);
    expect(manifest.operations['platform'].exactInverse).toBe(true);
    expect(manifest.scope.built.cellCount).toBe(550);
    expect(manifest.scope.deckSurfaceCells.cellCount).toBe(68);
    expect(manifest.scope.sealedFluidDisplacementCells.count).toBe(25);
    expect(manifest.scope.held.cellCount).toBe(0);
  });

  it('binds the exact clear deck volume', () => {
    expect(manifest.scope.clearVolume).toEqual({
      minX: -253, maxX: -237, minY: 18, maxY: 23, minZ: -444, maxZ: -441,
    });
  });

  it('declares the deck dry, lake water preserved behind the liner, route uncommissioned', () => {
    expect(manifest.scope.deckDry).toBe(true);
    expect(manifest.scope.preservedWaterBodyBehindLiner).toBe(true);
    expect(manifest.scope.routeCommissioned).toBe(false);
  });

  it('isolates all targets from containers, block entities, and saved entities', () => {
    expect(manifest.isolation.sourceHazardCount).toBe(0);
    expect(manifest.isolation.operatedHaloForbiddenBlockCount).toBe(0);
    expect(manifest.isolation.blockEntityIntersectionCount).toBe(0);
    expect(manifest.isolation.savedEntityIntersectionCount).toBe(0);
  });

  it('seals exactly 25 fluid cells (23 face + 2 crown-fluid in the clear volume)', () => {
    expect(manifest.isolation.sealedFluidDisplacementCount).toBe(25);
  });

  it('proves the forward and rollback REPL files are exact inverses', () => {
    const forward = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.platform.forward.txt`), 'utf8')
      .split('\n').filter((l) => l.startsWith('REPL'));
    const rollback = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.platform.rollback.txt`), 'utf8')
      .split('\n').filter((l) => l.startsWith('REPL'));
    expect(forward.length).toBe(550);
    expect(rollback.length).toBe(550);
    const forwardSet = new Set(forward);
    for (const line of rollback) {
      const f = line.split(/\s+/);
      const inverted = `REPL ${f[1]} ${f[2]} ${f[3]} ${f[4]} ${f[5]} ${f[6]} ${f[8]} ${f[7]}`;
      expect(forwardSet.has(inverted)).toBe(true);
    }
  });

  it('targets the 68 deck cells to polished_andesite and all other cells to polished_deepslate', () => {
    const forward = fs.readFileSync(
      path.join(BUILDOPS, `${BASENAME}.platform.forward.txt`), 'utf8',
    ).split('\n').filter((l) => l.startsWith('REPL'));
    let deck = 0;
    let liner = 0;
    let waterSources = 0;
    for (const line of forward) {
      const f = line.split(/\s+/);
      expect(f[1]).toBe(f[4]);
      expect(f[2]).toBe(f[5]);
      expect(f[3]).toBe(f[6]);
      const x = Number(f[1]);
      const y = Number(f[2]);
      const z = Number(f[3]);
      const isDeck = y === 18 && z >= -444 && z <= -441 && x >= -253 && x <= -237;
      if (isDeck) {
        deck += 1;
        expect(f[8]).toBe('minecraft:polished_andesite');
      } else {
        liner += 1;
        expect(f[8]).toBe('minecraft:polished_deepslate');
      }
      if (f[7].startsWith('minecraft:water')) waterSources += 1;
    }
    expect(deck).toBe(68);
    expect(liner).toBe(482);
    // 23 face water + 2 crown water = 25 water-source seals
    expect(waterSources).toBe(25);
  });

  it('never targets a cell outside the platform box', () => {
    const forward = fs.readFileSync(
      path.join(BUILDOPS, `${BASENAME}.platform.forward.txt`), 'utf8',
    ).split('\n').filter((l) => l.startsWith('REPL'));
    for (const line of forward) {
      const f = line.split(/\s+/);
      const x = Number(f[1]);
      const y = Number(f[2]);
      const z = Number(f[3]);
      const inBox =
        (y === 18 && x >= -253 && x <= -237 && z >= -444 && z <= -441) // deck
        || (y === 17 && x >= -253 && x <= -237 && z >= -445 && z <= -440) // subfloor
        || (y === 24 && x >= -253 && x <= -237 && z >= -445 && z <= -440) // ceiling
        || (z === -445 && x >= -253 && x <= -237 && y >= 18 && y <= 23) // north
        || (z === -440 && x >= -253 && x <= -237 && y >= 18 && y <= 23) // south
        || (x === -254 && y >= 18 && y <= 23 && z >= -445 && z <= -440) // west
        || (x === -236 && y >= 18 && y <= 23 && z >= -445 && z <= -440) // east
        || (y === 23 && x === -253 && z >= -442 && z <= -441); // crown fluid
      expect(inBox).toBe(true);
    }
  });
});
