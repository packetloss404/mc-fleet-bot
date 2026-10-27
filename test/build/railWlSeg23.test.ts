import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'rail-wl-seg-23-liner';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rail-wl-seg23-'));

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
    segments: Array<{ key: string; corridor: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }; builtCellCount: number; interiorFluidBefore: number; westWall: string }>;
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

describe('RAIL-S2-WL-SEGMENT-02-03 Westlight rail-corridor water containment', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_rail_wl_seg23_liner.mjs',
      '--out-dir', temporaryDirectory,
      '--generated-at', '2026-08-25T05:47:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 120_000 });
    manifest = JSON.parse(
      fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.release-manifest.json`), 'utf8'),
    ) as Manifest;
  });

  afterAll(() => {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('reproduces the canonical build artifacts byte-for-byte', () => {
    for (const pkg of ['seg02', 'seg03']) {
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
    expect(manifest.scope.releaseId).toBe('RAIL-S2-WL-SEGMENT-02-03');
    expect(manifest.packages.map(({ key }) => key)).toEqual(['seg02', 'seg03']);
  });

  it('emits the exact executed scope: 1032 targets, 0 held', () => {
    expect(manifest.operations['seg02'].forwardCommandCount).toBe(516);
    expect(manifest.operations['seg02'].rollbackCommandCount).toBe(516);
    expect(manifest.operations['seg03'].forwardCommandCount).toBe(516);
    expect(manifest.operations['seg03'].rollbackCommandCount).toBe(516);
    expect(manifest.operations['seg02'].exactInverse).toBe(true);
    expect(manifest.operations['seg03'].exactInverse).toBe(true);
    expect(manifest.scope.built.cellCount).toBe(1032);
    expect(manifest.scope.linerFaceCells.cellCount).toBe(1032);
    expect(manifest.scope.interiorFloorFluidDisplaced.count).toBe(0);
    expect(manifest.scope.held.cellCount).toBe(0);
  });

  it('binds the exact segment-02 and segment-03 corridor envelopes', () => {
    expect(manifest.scope.corridorEnvelope).toEqual({
      minX: -235, maxX: -196, minY: 18, maxY: 23, minZ: -462, maxZ: -457,
    });
    expect(manifest.scope.segments.map(({ key, corridor, builtCellCount, interiorFluidBefore }) => ({
      key, corridor, builtCellCount, interiorFluidBefore,
    }))).toEqual([
      { key: 'seg02', corridor: { minX: -235, maxX: -216, minY: 18, maxY: 23, minZ: -462, maxZ: -457 }, builtCellCount: 516, interiorFluidBefore: 0 },
      { key: 'seg03', corridor: { minX: -215, maxX: -196, minY: 18, maxY: 23, minZ: -462, maxZ: -457 }, builtCellCount: 516, interiorFluidBefore: 0 },
    ]);
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

  it('seals exactly the 4 face fluid cells (north-wall lava pocket)', () => {
    expect(manifest.isolation.sealedFluidDisplacementCount).toBe(4);
    expect(manifest.isolation.interiorFloorFluidDisplacementCount).toBe(0);
  });

  it('proves the forward and rollback REPL files are exact inverses', () => {
    for (const pkg of ['seg02', 'seg03']) {
      const forward = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.${pkg}.forward.txt`), 'utf8')
        .split('\n').filter((l) => l.startsWith('REPL'));
      const rollback = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.${pkg}.rollback.txt`), 'utf8')
        .split('\n').filter((l) => l.startsWith('REPL'));
      expect(forward.length).toBe(516);
      expect(rollback.length).toBe(516);
      const forwardSet = new Set(forward);
      for (const line of rollback) {
        const f = line.split(/\s+/);
        const inverted = `REPL ${f[1]} ${f[2]} ${f[3]} ${f[4]} ${f[5]} ${f[6]} ${f[8]} ${f[7]}`;
        expect(forwardSet.has(inverted)).toBe(true);
      }
    }
  });

  it('targets every liner cell to polished_deepslate and seals fluid sources', () => {
    let lavaSources = 0;
    for (const pkg of ['seg02', 'seg03']) {
      const forward = fs.readFileSync(
        path.join(BUILDOPS, `${BASENAME}.${pkg}.forward.txt`), 'utf8',
      ).split('\n').filter((l) => l.startsWith('REPL'));
      for (const line of forward) {
        const f = line.split(/\s+/);
        expect(f[8]).toBe('minecraft:polished_deepslate');
        expect(f[1]).toBe(f[4]);
        expect(f[2]).toBe(f[5]);
        expect(f[3]).toBe(f[6]);
        if (f[7].startsWith('minecraft:lava')) lavaSources += 1;
      }
    }
    // 4 north-wall lava seals at segment-02
    expect(lavaSources).toBe(4);
  });

  it('never targets a cell outside the segment-02/03 liner boxes and is disjoint', () => {
    const segBoxes = [
      { minX: -235, maxX: -216, minY: 17, maxY: 24, minZ: -463, maxZ: -456 },
      { minX: -215, maxX: -196, minY: 17, maxY: 24, minZ: -463, maxZ: -456 },
    ];
    const seen = new Set();
    for (const pkg of ['seg02', 'seg03']) {
      const forward = fs.readFileSync(
        path.join(BUILDOPS, `${BASENAME}.${pkg}.forward.txt`), 'utf8',
      ).split('\n').filter((l) => l.startsWith('REPL'));
      for (const line of forward) {
        const f = line.split(/\s+/);
        const x = Number(f[1]);
        const y = Number(f[2]);
        const z = Number(f[3]);
        const boxIndex = pkg === 'seg02' ? 0 : 1;
        const box = segBoxes[boxIndex];
        const inBox =
          (y === 17 && x >= box.minX && x <= box.maxX && z >= -462 && z <= -457)
          || (y === 24 && x >= box.minX && x <= box.maxX && z >= -462 && z <= -457)
          || (z === -463 && x >= box.minX && x <= box.maxX && y >= 18 && y <= 23)
          || (z === -456 && x >= box.minX && x <= box.maxX && y >= 18 && y <= 23)
          || (x === box.maxX + 1 && y >= 18 && y <= 23 && z >= -462 && z <= -457);
        expect(inBox).toBe(true);
        const key = `${x},${y},${z}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
    expect(seen.size).toBe(1032);
  });
});
