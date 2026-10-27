import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'rail-trackbed-02';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const SNAPSHOT = 'data/worldsnap-rail-trackbed2-source-20260825T090000Z';
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rail-trackbed-02-'));

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

const SEGMENTS = [
  { key: 'seg02', minX: -235, maxX: -216, built: 114, preserved: 6 },
  { key: 'seg03', minX: -215, maxX: -196, built: 114, preserved: 6 },
  { key: 'seg04', minX: -195, maxX: -176, built: 114, preserved: 6 },
  { key: 'seg05', minX: -175, maxX: -156, built: 102, preserved: 18 },
  { key: 'seg06', minX: -155, maxX: -136, built: 82, preserved: 38 },
];
const TOTAL_BUILT = SEGMENTS.reduce((sum, s) => sum + s.built, 0);
const TOTAL_PRESERVED = SEGMENTS.reduce((sum, s) => sum + s.preserved, 0);

let manifest: Manifest;

describe('RAIL-S3-TRACKBED-02 Cobalt corridor track-bed preparation (slices 2-6)', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_rail_trackbed_02.mjs',
      '--snapshot', SNAPSHOT,
      '--out-dir', temporaryDirectory,
      '--generated-at', '2026-08-25T09:00:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 120_000 });
    manifest = JSON.parse(
      fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.release-manifest.json`), 'utf8'),
    ) as Manifest;
  });

  afterAll(() => {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('reproduces the canonical build artifacts byte-for-byte', () => {
    for (const pkg of SEGMENTS.map((s) => s.key)) {
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
    expect(manifest.scope.releaseId).toBe('RAIL-S3-TRACKBED-02');
    expect(manifest.packages.map(({ key }) => key)).toEqual(SEGMENTS.map((s) => s.key));
  });

  it('emits the exact executed scope: 526 targets, 74 preserved, 0 held', () => {
    for (const segment of SEGMENTS) {
      expect(manifest.operations[segment.key].forwardCommandCount).toBe(segment.built);
      expect(manifest.operations[segment.key].rollbackCommandCount).toBe(segment.built);
      expect(manifest.operations[segment.key].exactInverse).toBe(true);
    }
    expect(manifest.scope.built.cellCount).toBe(TOTAL_BUILT);
    expect(manifest.scope.trackBedCells.cellCount).toBe(TOTAL_BUILT);
    expect(manifest.scope.preservedFloorCells.cellCount).toBe(TOTAL_PRESERVED);
    expect(manifest.scope.sealedFluidDisplacementCells.count).toBe(0);
    expect(manifest.scope.held.cellCount).toBe(0);
    expect(manifest.scope.interiorAboveFloorFluid.count).toBe(0);
  });

  it('binds the corridor envelope and per-segment track-bed counts', () => {
    expect(manifest.scope.corridorEnvelope).toEqual({
      minX: -235, maxX: -136, minY: 18, maxY: 23, minZ: -462, maxZ: -457,
    });
    expect(manifest.scope.segments).toEqual(SEGMENTS.map((segment) => ({
      key: segment.key,
      corridor: { minX: segment.minX, maxX: segment.maxX, minY: 18, maxY: 23, minZ: -462, maxZ: -457 },
      trackBedCellCount: segment.built,
      preservedFloorCellCount: segment.preserved,
      interiorAboveFloorFluidBefore: 0,
    })));
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
    for (const segment of SEGMENTS) {
      const forward = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.${segment.key}.forward.txt`), 'utf8')
        .split('\n').filter((l) => l.startsWith('REPL'));
      const rollback = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.${segment.key}.rollback.txt`), 'utf8')
        .split('\n').filter((l) => l.startsWith('REPL'));
      expect(forward.length).toBe(segment.built);
      expect(rollback.length).toBe(segment.built);
      const forwardSet = new Set(forward);
      for (const line of rollback) {
        const f = line.split(/\s+/);
        const inverted = `REPL ${f[1]} ${f[2]} ${f[3]} ${f[4]} ${f[5]} ${f[6]} ${f[8]} ${f[7]}`;
        expect(forwardSet.has(inverted)).toBe(true);
      }
    }
  });

  it('targets every track-bed cell to polished_deepslate at exactly y=18', () => {
    for (const segment of SEGMENTS) {
      const forward = fs.readFileSync(
        path.join(BUILDOPS, `${BASENAME}.${segment.key}.forward.txt`), 'utf8',
      ).split('\n').filter((l) => l.startsWith('REPL'));
      for (const line of forward) {
        const f = line.split(/\s+/);
        expect(Number(f[2])).toBe(18);
        expect(f[8]).toBe('minecraft:polished_deepslate');
        expect(f[1]).toBe(f[4]);
        expect(f[2]).toBe(f[5]);
        expect(f[3]).toBe(f[6]);
      }
    }
  });

  it('never targets a cell outside its segment track-bed envelope and is disjoint', () => {
    const seen = new Set();
    for (const segment of SEGMENTS) {
      const box = { minX: segment.minX, maxX: segment.maxX, minY: 18, maxY: 18, minZ: -462, maxZ: -457 };
      const forward = fs.readFileSync(
        path.join(BUILDOPS, `${BASENAME}.${segment.key}.forward.txt`), 'utf8',
      ).split('\n').filter((l) => l.startsWith('REPL'));
      expect(forward.length).toBe(segment.built);
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
    }
    expect(seen.size).toBe(TOTAL_BUILT);
  });
});
