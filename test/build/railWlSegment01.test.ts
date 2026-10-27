import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'rail-wl-seg-01-liner';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rail-wl-seg01-'));

type Manifest = {
  manifestIdentity: string;
  mvpScope: boolean;
  scopeIds: string[];
  packages: Array<{ key: string; forward: string; rollback: string }>;
  scope: {
    releaseId: string;
    corridorEnvelope: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
    built: { cellCount: number };
    linerFaceCells: { cellCount: number };
    sealedFluidDisplacementCells: { count: number };
    interiorFloorFluidDisplaced: { count: number };
    held: { cellCount: number; byReason: Record<string, number> };
    interiorDry: boolean;
    preservedWaterBodyOutsideLiner: boolean;
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
    interiorFloorFluidDisplacementCount: number;
    operatedHaloForbiddenBlockCount: number;
    blockEntityIntersectionCount: number;
    savedEntityIntersectionCount: number;
  };
};

let manifest: Manifest;

describe('RAIL-S2-WL-SEGMENT-01 Westlight rail-corridor water containment', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_rail_wl_seg01_liner.mjs',
      '--out-dir', temporaryDirectory,
      '--generated-at', '2026-08-25T00:00:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 120_000 });
    manifest = JSON.parse(
      fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.release-manifest.json`), 'utf8'),
    ) as Manifest;
  });

  afterAll(() => {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('reproduces the canonical build artifacts byte-for-byte', () => {
    for (const pkg of ['liner']) {
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
    expect(manifest.scope.releaseId).toBe('RAIL-S2-WL-SEGMENT-01');
    expect(manifest.packages.map(({ key }) => key)).toEqual(['liner']);
  });

  it('emits the exact executed scope: 540 targets, 0 held', () => {
    expect(manifest.operations['liner'].forwardCommandCount).toBe(540);
    expect(manifest.operations['liner'].rollbackCommandCount).toBe(540);
    expect(manifest.operations['liner'].exactInverse).toBe(true);
    expect(manifest.scope.built.cellCount).toBe(540);
    expect(manifest.scope.linerFaceCells.cellCount).toBe(528);
    expect(manifest.scope.interiorFloorFluidDisplaced.count).toBe(12);
    expect(manifest.scope.held.cellCount).toBe(0);
  });

  it('binds the exact first-segment corridor envelope', () => {
    expect(manifest.scope.corridorEnvelope).toEqual({
      minX: -254, maxX: -236, minY: 18, maxY: 23, minZ: -462, maxZ: -457,
    });
  });

  it('declares the corridor dry, water preserved, route uncommissioned', () => {
    expect(manifest.scope.interiorDry).toBe(true);
    expect(manifest.scope.preservedWaterBodyOutsideLiner).toBe(true);
    expect(manifest.scope.routeCommissioned).toBe(false);
  });

  it('isolates all targets from containers, block entities, and saved entities', () => {
    expect(manifest.isolation.sourceHazardCount).toBe(0);
    expect(manifest.isolation.operatedHaloForbiddenBlockCount).toBe(0);
    expect(manifest.isolation.blockEntityIntersectionCount).toBe(0);
    expect(manifest.isolation.savedEntityIntersectionCount).toBe(0);
  });

  it('seals exactly the 6 face fluid + 12 interior floor fluid cells', () => {
    expect(manifest.isolation.sealedFluidDisplacementCount).toBe(18);
    expect(manifest.isolation.interiorFloorFluidDisplacementCount).toBe(12);
  });

  it('proves the forward and rollback REPL files are exact inverses', () => {
    const forward = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.liner.forward.txt`), 'utf8')
      .split('\n').filter((l) => l.startsWith('REPL'));
    const rollback = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.liner.rollback.txt`), 'utf8')
      .split('\n').filter((l) => l.startsWith('REPL'));
    expect(forward.length).toBe(540);
    expect(rollback.length).toBe(540);
    const forwardSet = new Set(forward);
    for (const line of rollback) {
      const f = line.split(/\s+/);
      const inverted = `REPL ${f[1]} ${f[2]} ${f[3]} ${f[4]} ${f[5]} ${f[6]} ${f[8]} ${f[7]}`;
      expect(forwardSet.has(inverted)).toBe(true);
    }
  });

  it('targets every liner cell to polished_deepslate and seals fluid sources', () => {
    const forward = fs.readFileSync(
      path.join(BUILDOPS, `${BASENAME}.liner.forward.txt`), 'utf8',
    ).split('\n').filter((l) => l.startsWith('REPL'));
    let lavaSources = 0;
    for (const line of forward) {
      const f = line.split(/\s+/);
      expect(f[8]).toBe('minecraft:polished_deepslate');
      expect(f[1]).toBe(f[4]);
      expect(f[2]).toBe(f[5]);
      expect(f[3]).toBe(f[6]);
      if (f[7].startsWith('minecraft:lava')) lavaSources += 1;
    }
    // 6 face lava + 12 interior floor lava = 18 lava-source seals
    expect(lavaSources).toBe(18);
  });

  it('never targets a cell outside the first-segment liner box', () => {
    const forward = fs.readFileSync(
      path.join(BUILDOPS, `${BASENAME}.liner.forward.txt`), 'utf8',
    ).split('\n').filter((l) => l.startsWith('REPL'));
    for (const line of forward) {
      const f = line.split(/\s+/);
      const x = Number(f[1]);
      const y = Number(f[2]);
      const z = Number(f[3]);
      const inBox =
        (y === 17 && x >= -254 && x <= -236 && z >= -462 && z <= -457)
        || (y === 24 && x >= -254 && x <= -236 && z >= -462 && z <= -457)
        || (z === -463 && x >= -254 && x <= -236 && y >= 18 && y <= 23)
        || (z === -456 && x >= -254 && x <= -236 && y >= 18 && y <= 23)
        || (x === -255 && y >= 18 && y <= 23 && z >= -462 && z <= -457)
        || (x === -235 && y >= 18 && y <= 23 && z >= -462 && z <= -457)
        || (y === 18 && x >= -254 && x <= -236 && z >= -462 && z <= -457 && f[7].startsWith('minecraft:lava'));
      expect(inBox).toBe(true);
    }
  });
});
