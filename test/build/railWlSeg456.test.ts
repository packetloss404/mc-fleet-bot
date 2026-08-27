import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'rail-wl-seg-456-liner';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rail-wl-seg456-'));

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

describe('RAIL-S2-WL-SEGMENT-04-06 Westlight rail-corridor water containment', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_rail_wl_seg456_liner.mjs',
      '--out-dir', temporaryDirectory,
      '--generated-at', '2026-08-25T06:12:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 120_000 });
    manifest = JSON.parse(
      fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.release-manifest.json`), 'utf8'),
    ) as Manifest;
  });

  afterAll(() => {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('reproduces the canonical build artifacts byte-for-byte', () => {
    for (const pkg of ['seg04', 'seg05', 'seg06']) {
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
    expect(manifest.scope.releaseId).toBe('RAIL-S2-WL-SEGMENT-04-06');
    expect(manifest.packages.map(({ key }) => key)).toEqual(['seg04', 'seg05', 'seg06']);
  });

  it('emits the exact executed scope: 1548 targets, 0 held', () => {
    for (const pkg of ['seg04', 'seg05', 'seg06']) {
      expect(manifest.operations[pkg].forwardCommandCount).toBe(516);
      expect(manifest.operations[pkg].rollbackCommandCount).toBe(516);
      expect(manifest.operations[pkg].exactInverse).toBe(true);
    }
    expect(manifest.scope.built.cellCount).toBe(1548);
    expect(manifest.scope.linerFaceCells.cellCount).toBe(1548);
    expect(manifest.scope.interiorFloorFluidDisplaced.count).toBe(0);
    expect(manifest.scope.held.cellCount).toBe(0);
  });

  it('binds the exact segment-04/05/06 corridor envelopes', () => {
    expect(manifest.scope.corridorEnvelope).toEqual({
      minX: -195, maxX: -136, minY: 18, maxY: 23, minZ: -462, maxZ: -457,
    });
    expect(manifest.scope.segments.map(({ key, corridor, builtCellCount, interiorFluidBefore }) => ({
      key, corridor, builtCellCount, interiorFluidBefore,
    }))).toEqual([
      { key: 'seg04', corridor: { minX: -195, maxX: -176, minY: 18, maxY: 23, minZ: -462, maxZ: -457 }, builtCellCount: 516, interiorFluidBefore: 0 },
      { key: 'seg05', corridor: { minX: -175, maxX: -156, minY: 18, maxY: 23, minZ: -462, maxZ: -457 }, builtCellCount: 516, interiorFluidBefore: 0 },
      { key: 'seg06', corridor: { minX: -155, maxX: -136, minY: 18, maxY: 23, minZ: -462, maxZ: -457 }, builtCellCount: 516, interiorFluidBefore: 0 },
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

  it('seals exactly the gravity cells with zero fluid displacement', () => {
    expect(manifest.isolation.sealedFluidDisplacementCount).toBe(0);
    expect(manifest.isolation.interiorFloorFluidDisplacementCount).toBe(0);
  });

  it('proves the forward and rollback REPL files are exact inverses', () => {
    for (const pkg of ['seg04', 'seg05', 'seg06']) {
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

  it('targets every liner cell to polished_deepslate and seals gravity sources', () => {
    let gravitySources = 0;
    for (const pkg of ['seg04', 'seg05', 'seg06']) {
      const forward = fs.readFileSync(
        path.join(BUILDOPS, `${BASENAME}.${pkg}.forward.txt`), 'utf8',
      ).split('\n').filter((l) => l.startsWith('REPL'));
      for (const line of forward) {
        const f = line.split(/\s+/);
        expect(f[8]).toBe('minecraft:polished_deepslate');
        expect(f[1]).toBe(f[4]);
        expect(f[2]).toBe(f[5]);
        expect(f[3]).toBe(f[6]);
        if (['minecraft:sand', 'minecraft:gravel', 'minecraft:red_sand'].some(
          (g) => f[7].startsWith(g),
        )) gravitySources += 1;
      }
    }
    expect(gravitySources).toBe(11);
  });

  it('never targets a cell outside the segment-04/05/06 liner boxes and is disjoint', () => {
    const segBoxes = [
      { minX: -195, maxX: -176, minY: 17, maxY: 24, minZ: -463, maxZ: -456 },
      { minX: -175, maxX: -156, minY: 17, maxY: 24, minZ: -463, maxZ: -456 },
      { minX: -155, maxX: -136, minY: 17, maxY: 24, minZ: -463, maxZ: -456 },
    ];
    const seen = new Set();
    for (const pkg of ['seg04', 'seg05', 'seg06']) {
      const forward = fs.readFileSync(
        path.join(BUILDOPS, `${BASENAME}.${pkg}.forward.txt`), 'utf8',
      ).split('\n').filter((l) => l.startsWith('REPL'));
      for (const line of forward) {
        const f = line.split(/\s+/);
        const x = Number(f[1]);
        const y = Number(f[2]);
        const z = Number(f[3]);
        const boxIndex = pkg === 'seg04' ? 0 : pkg === 'seg05' ? 1 : 2;
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
    expect(seen.size).toBe(1548);
  });
});
