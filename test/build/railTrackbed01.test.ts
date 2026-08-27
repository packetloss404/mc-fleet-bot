import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'rail-trackbed-01';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rail-trackbed-01-'));

type Manifest = {
  manifestIdentity: string;
  mvpScope: boolean;
  scopeIds: string[];
  packages: Array<{ key: string; forward: string; rollback: string }>;
  scope: {
    releaseId: string;
    corridorEnvelope: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
    built: { cellCount: number };
    trackBedCells: { cellCount: number };
    preservedFloorCells: { cellCount: number };
    sealedFluidDisplacementCells: { count: number };
    held: { cellCount: number; byReason: Record<string, number> };
    interiorAboveFloorFluid: { count: number };
    routeCommissioned: boolean;
    segments: Array<{ key: string; corridor: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }; trackBedCellCount: number; preservedFloorCellCount: number; interiorAboveFloorFluidBefore: number }>;
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

describe('RAIL-S3-TRACKBED-01 Cobalt corridor track-bed preparation (first slice)', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_rail_trackbed_01.mjs',
      '--out-dir', temporaryDirectory,
      '--generated-at', '2026-08-25T08:21:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 120_000 });
    manifest = JSON.parse(
      fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.release-manifest.json`), 'utf8'),
    ) as Manifest;
  });

  afterAll(() => {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('reproduces the canonical build artifacts byte-for-byte', () => {
    for (const pkg of ['seg01']) {
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
    expect(manifest.scope.releaseId).toBe('RAIL-S3-TRACKBED-01');
    expect(manifest.packages.map(({ key }) => key)).toEqual(['seg01']);
  });

  it('emits the exact executed scope: 102 targets, 12 preserved, 0 held', () => {
    expect(manifest.operations.seg01.forwardCommandCount).toBe(102);
    expect(manifest.operations.seg01.rollbackCommandCount).toBe(102);
    expect(manifest.operations.seg01.exactInverse).toBe(true);
    expect(manifest.scope.built.cellCount).toBe(102);
    expect(manifest.scope.trackBedCells.cellCount).toBe(102);
    expect(manifest.scope.preservedFloorCells.cellCount).toBe(12);
    expect(manifest.scope.sealedFluidDisplacementCells.count).toBe(0);
    expect(manifest.scope.held.cellCount).toBe(0);
    expect(manifest.scope.interiorAboveFloorFluid.count).toBe(0);
  });

  it('binds the exact segment-01 corridor envelope and track-bed counts', () => {
    expect(manifest.scope.corridorEnvelope).toEqual({
      minX: -254, maxX: -236, minY: 18, maxY: 23, minZ: -462, maxZ: -457,
    });
    expect(manifest.scope.segments).toEqual([
      {
        key: 'seg01',
        corridor: { minX: -254, maxX: -236, minY: 18, maxY: 23, minZ: -462, maxZ: -457 },
        trackBedCellCount: 102,
        preservedFloorCellCount: 12,
        interiorAboveFloorFluidBefore: 0,
      },
    ]);
  });

  it('declares the route uncommissioned and the track bed civil-only', () => {
    expect(manifest.scope.routeCommissioned).toBe(false);
  });

  it('isolates all targets from containers, block entities, and saved entities', () => {
    expect(manifest.isolation.sourceHazardCount).toBe(0);
    expect(manifest.isolation.operatedHaloForbiddenBlockCount).toBe(0);
    expect(manifest.isolation.blockEntityIntersectionCount).toBe(0);
    expect(manifest.isolation.savedEntityIntersectionCount).toBe(0);
  });

  it('proves the forward and rollback REPL files are exact inverses', () => {
    const forward = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.seg01.forward.txt`), 'utf8')
      .split('\n').filter((l) => l.startsWith('REPL'));
    const rollback = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.seg01.rollback.txt`), 'utf8')
      .split('\n').filter((l) => l.startsWith('REPL'));
    expect(forward.length).toBe(102);
    expect(rollback.length).toBe(102);
    const forwardSet = new Set(forward);
    for (const line of rollback) {
      const f = line.split(/\s+/);
      const inverted = `REPL ${f[1]} ${f[2]} ${f[3]} ${f[4]} ${f[5]} ${f[6]} ${f[8]} ${f[7]}`;
      expect(forwardSet.has(inverted)).toBe(true);
    }
  });

  it('targets every track-bed cell to polished_deepslate at exactly y=18', () => {
    const forward = fs.readFileSync(
      path.join(BUILDOPS, `${BASENAME}.seg01.forward.txt`), 'utf8',
    ).split('\n').filter((l) => l.startsWith('REPL'));
    for (const line of forward) {
      const f = line.split(/\s+/);
      expect(Number(f[2])).toBe(18);
      expect(f[8]).toBe('minecraft:polished_deepslate');
      expect(f[1]).toBe(f[4]);
      expect(f[2]).toBe(f[5]);
      expect(f[3]).toBe(f[6]);
    }
  });

  it('never targets a cell outside the segment-01 track-bed envelope and is disjoint', () => {
    const box = { minX: -254, maxX: -236, minY: 18, maxY: 18, minZ: -462, maxZ: -457 };
    const seen = new Set();
    const forward = fs.readFileSync(
      path.join(BUILDOPS, `${BASENAME}.seg01.forward.txt`), 'utf8',
    ).split('\n').filter((l) => l.startsWith('REPL'));
    for (const line of forward) {
      const f = line.split(/\s+/);
      const x = Number(f[1]);
      const y = Number(f[2]);
      const z = Number(f[3]);
      const inBox = x >= box.minX && x <= box.maxX && y === box.minY && z >= box.minZ && z <= box.maxZ;
      expect(inBox).toBe(true);
      const key = `${x},${y},${z}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
    expect(seen.size).toBe(102);
  });
});
