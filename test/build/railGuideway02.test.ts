import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'rail-guideway-02';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rail-guideway-02-'));

type Manifest = {
  manifestIdentity: string;
  mvpScope: boolean;
  scopeIds: string[];
  packages: Array<{ key: string; forward: string; rollback: string }>;
  scope: {
    releaseId: string;
    guidewayEnvelope: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
    built: { cellCount: number };
    preservedCells: { cellCount: number };
    held: { cellCount: number; byReason: Record<string, number> };
    routeCommissioned: boolean;
    tubes: Array<{ key: string; direction: string; cellCount: number }>;
    separation: { spineBetweenTubes: { minZ: number; maxZ: number; preserved: boolean } };
    segments: Array<{ key: string; corridor: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }; guidewayBed: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }; tubeBedCellCount: number; preservedBedCellCount: number }>;
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

const TUBE_N = { key: 'tube-n', direction: 'westbound/north tube bed', minZ: -461, maxZ: -460 };
const TUBE_S = { key: 'tube-s', direction: 'eastbound/south tube bed', minZ: -455, maxZ: -454 };
const SEGMENTS = [
  { key: 'seg02', minX: -235, maxX: -216, built: 80 },
  { key: 'seg03', minX: -215, maxX: -196, built: 76 },
  { key: 'seg04', minX: -195, maxX: -176, built: 65 },
  { key: 'seg05', minX: -175, maxX: -156, built: 79 },
  { key: 'seg06', minX: -155, maxX: -136, built: 80 },
];
const EXPECTED_TOTAL = 380;
const EXPECTED_HELD = 20;

let manifest: Manifest;

describe('RAIL-S3-GUIDEWAY-02 Cobalt passenger guideway track-tube beds (slices 2-6)', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_rail_guideway_02.mjs',
      '--snapshot', 'data/worldsnap-rail-guideway-source2-20260825T165000Z',
      '--out-dir', temporaryDirectory,
      '--generated-at', '2026-08-25T16:50:00Z',
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
    expect(manifest.scope.releaseId).toBe('RAIL-S3-GUIDEWAY-02');
    expect(manifest.packages.map(({ key }) => key)).toEqual(SEGMENTS.map((s) => s.key));
  });

  it('emits the exact executed scope: 380 targets, 20 held (natural cave air/water)', () => {
    for (const seg of SEGMENTS) {
      expect(manifest.operations[seg.key].forwardCommandCount).toBe(seg.built);
      expect(manifest.operations[seg.key].rollbackCommandCount).toBe(seg.built);
      expect(manifest.operations[seg.key].exactInverse).toBe(true);
    }
    expect(manifest.scope.built.cellCount).toBe(EXPECTED_TOTAL);
    expect(manifest.scope.preservedCells.cellCount).toBe(0);
    expect(manifest.scope.held.cellCount).toBe(EXPECTED_HELD);
    expect(manifest.scope.held.byReason['air-source;air-support']).toBe(8);
    expect(manifest.scope.held.byReason['air-support']).toBe(8);
    expect(manifest.scope.held.byReason['air-source']).toBe(3);
    expect(manifest.scope.held.byReason['fluid-source;fluid-support']).toBe(1);
  });

  it('binds the guideway envelope, tube-bed counts, and segment beds', () => {
    expect(manifest.scope.guidewayEnvelope).toEqual({
      minX: -235, maxX: -136, minY: 12, maxY: 12, minZ: -461, maxZ: -454,
    });
    expect(manifest.scope.tubes).toEqual([
      { key: TUBE_N.key, direction: TUBE_N.direction, cellCount: 200, bounds: { minX: -235, maxX: -136, minY: 12, maxY: 12, minZ: TUBE_N.minZ, maxZ: TUBE_N.maxZ } },
      { key: TUBE_S.key, direction: TUBE_S.direction, cellCount: 180, bounds: { minX: -235, maxX: -136, minY: 12, maxY: 12, minZ: TUBE_S.minZ, maxZ: TUBE_S.maxZ } },
    ]);
    expect(manifest.scope.separation.spineBetweenTubes).toEqual({ minZ: -459, maxZ: -458, cells: 2, preserved: true });
    expect(manifest.scope.segments.map(({ key, guidewayBed, tubeBedCellCount, preservedBedCellCount }) => ({
      key, guidewayBed, tubeBedCellCount, preservedBedCellCount,
    }))).toEqual(SEGMENTS.map((seg) => ({
      key: seg.key,
      guidewayBed: { minX: seg.minX, maxX: seg.maxX, minY: 12, maxY: 12, minZ: -461, maxZ: -454 },
      tubeBedCellCount: seg.built,
      preservedBedCellCount: 0,
    })));
  });

  it('declares the route uncommissioned and the tube beds civil-only', () => {
    expect(manifest.scope.routeCommissioned).toBe(false);
  });

  it('isolates all targets from containers, block entities, and saved entities', () => {
    expect(manifest.isolation.sourceHazardCount).toBe(0);
    expect(manifest.isolation.sealedFluidDisplacementCount).toBe(0);
    expect(manifest.isolation.operatedHaloForbiddenBlockCount).toBe(0);
    expect(manifest.isolation.blockEntityIntersectionCount).toBe(0);
    expect(manifest.isolation.savedEntityIntersectionCount).toBe(0);
  });

  it('proves the forward and rollback REPL files are exact inverses', () => {
    for (const seg of SEGMENTS) {
      const forward = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.${seg.key}.forward.txt`), 'utf8')
        .split('\n').filter((l) => l.startsWith('REPL'));
      const rollback = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.${seg.key}.rollback.txt`), 'utf8')
        .split('\n').filter((l) => l.startsWith('REPL'));
      expect(forward.length).toBe(seg.built);
      expect(rollback.length).toBe(seg.built);
      const forwardSet = new Set(forward);
      for (const line of rollback) {
        const f = line.split(/\s+/);
        const inverted = `REPL ${f[1]} ${f[2]} ${f[3]} ${f[4]} ${f[5]} ${f[6]} ${f[8]} ${f[7]}`;
        expect(forwardSet.has(inverted)).toBe(true);
      }
    }
  });

  it('targets every tube-bed cell to polished_deepslate at exactly y=12', () => {
    for (const seg of SEGMENTS) {
      const forward = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.${seg.key}.forward.txt`), 'utf8')
        .split('\n').filter((l) => l.startsWith('REPL'));
      for (const line of forward) {
        const f = line.split(/\s+/);
        expect(Number(f[2])).toBe(12);
        expect(f[8]).toBe('minecraft:polished_deepslate');
        expect(f[1]).toBe(f[4]);
        expect(f[2]).toBe(f[5]);
        expect(f[3]).toBe(f[6]);
      }
    }
  });

  it('keeps every target inside a slice bed and the packages are disjoint', () => {
    const seen = new Set();
    for (const seg of SEGMENTS) {
      for (const line of fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.${seg.key}.forward.txt`), 'utf8')
        .split('\n').filter((l) => l.startsWith('REPL'))) {
        const f = line.split(/\s+/);
        const x = Number(f[1]);
        const y = Number(f[2]);
        const z = Number(f[3]);
        expect(x).toBeGreaterThanOrEqual(seg.minX);
        expect(x).toBeLessThanOrEqual(seg.maxX);
        expect(y).toBe(12);
        expect(z === -461 || z === -460 || z === -455 || z === -454).toBe(true);
        const key = `${x},${y},${z}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
    expect(seen.size).toBe(EXPECTED_TOTAL);
  });

  it('never targets the spine between the two tube beds', () => {
    for (const seg of SEGMENTS) {
      const forward = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.${seg.key}.forward.txt`), 'utf8')
        .split('\n').filter((l) => l.startsWith('REPL'));
      for (const line of forward) {
        const f = line.split(/\s+/);
        const z = Number(f[3]);
        expect(z === -459 || z === -458).toBe(false);
      }
    }
  });
});
