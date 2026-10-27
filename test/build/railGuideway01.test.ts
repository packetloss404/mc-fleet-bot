import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'rail-guideway-01';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const SNAPSHOT = 'data/worldsnap-rail-guideway-source1-20260825T170000Z';
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rail-guideway-01-'));

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

const TUBE_N = { key: 'tube-n', direction: 'westbound/north tube bed', minZ: -461, maxZ: -460, cellCount: 38 };
const TUBE_S = { key: 'tube-s', direction: 'eastbound/south tube bed', minZ: -455, maxZ: -454, cellCount: 38 };
const SEGMENT = { key: 'seg01', minX: -254, maxX: -236, bedY: 12, built: 76 };

let manifest: Manifest;

describe('RAIL-S3-GUIDEWAY-01 Cobalt passenger guideway track-tube beds (first slice)', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_rail_guideway_01.mjs',
      '--snapshot', SNAPSHOT,
      '--out-dir', temporaryDirectory,
      '--generated-at', '2026-08-25T17:10:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 120_000 });
    manifest = JSON.parse(
      fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.release-manifest.json`), 'utf8'),
    ) as Manifest;
  });

  afterAll(() => {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('reproduces the canonical build artifacts byte-for-byte', () => {
    for (const dir of ['forward', 'rollback']) {
      expect(fs.readFileSync(path.join(temporaryDirectory, `${BASENAME}.${dir}.txt`)))
        .toEqual(fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.${dir}.txt`)));
    }
  });

  it('emits a valid manifest under the PASSENGER-RAILWAY scope', () => {
    expect(manifest.manifestIdentity).toMatch(/^[0-9a-f]{64}$/);
    expect(manifest.mvpScope).toBe(false);
    expect(manifest.scopeIds).toEqual(['PASSENGER-RAILWAY']);
    expect(manifest.scope.releaseId).toBe('RAIL-S3-GUIDEWAY-01');
    expect(manifest.packages.map(({ key }) => key)).toEqual([SEGMENT.key]);
  });

  it('emits the exact executed scope: 76 targets, 0 preserved, 0 held', () => {
    expect(manifest.operations.seg01.forwardCommandCount).toBe(SEGMENT.built);
    expect(manifest.operations.seg01.rollbackCommandCount).toBe(SEGMENT.built);
    expect(manifest.operations.seg01.exactInverse).toBe(true);
    expect(manifest.scope.built.cellCount).toBe(SEGMENT.built);
    expect(manifest.scope.preservedCells.cellCount).toBe(0);
    expect(manifest.scope.held.cellCount).toBe(0);
  });

  it('binds the guideway envelope and tube-bed counts', () => {
    expect(manifest.scope.guidewayEnvelope).toEqual({
      minX: -254, maxX: -236, minY: 12, maxY: 12, minZ: -461, maxZ: -454,
    });
    expect(manifest.scope.tubes).toEqual([
      { key: TUBE_N.key, direction: TUBE_N.direction, cellCount: TUBE_N.cellCount, bounds: { minX: -254, maxX: -236, minY: 12, maxY: 12, minZ: TUBE_N.minZ, maxZ: TUBE_N.maxZ } },
      { key: TUBE_S.key, direction: TUBE_S.direction, cellCount: TUBE_S.cellCount, bounds: { minX: -254, maxX: -236, minY: 12, maxY: 12, minZ: TUBE_S.minZ, maxZ: TUBE_S.maxZ } },
    ]);
    expect(manifest.scope.separation.spineBetweenTubes).toEqual({ minZ: -459, maxZ: -458, cells: 2, preserved: true });
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
    const forward = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.forward.txt`), 'utf8')
      .split('\n').filter((l) => l.startsWith('REPL'));
    const rollback = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.rollback.txt`), 'utf8')
      .split('\n').filter((l) => l.startsWith('REPL'));
    expect(forward.length).toBe(SEGMENT.built);
    expect(rollback.length).toBe(SEGMENT.built);
    const forwardSet = new Set(forward);
    for (const line of rollback) {
      const f = line.split(/\s+/);
      const inverted = `REPL ${f[1]} ${f[2]} ${f[3]} ${f[4]} ${f[5]} ${f[6]} ${f[8]} ${f[7]}`;
      expect(forwardSet.has(inverted)).toBe(true);
    }
  });

  it('targets every tube-bed cell to polished_deepslate at exactly y=12', () => {
    const forward = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.forward.txt`), 'utf8')
      .split('\n').filter((l) => l.startsWith('REPL'));
    for (const line of forward) {
      const f = line.split(/\s+/);
      expect(Number(f[2])).toBe(12);
      expect(f[8]).toBe('minecraft:polished_deepslate');
      expect(f[1]).toBe(f[4]);
      expect(f[2]).toBe(f[5]);
      expect(f[3]).toBe(f[6]);
    }
  });

  it('keeps every target inside a tube bed and the tube beds are disjoint', () => {
    const seen = new Set();
    for (const tube of [TUBE_N, TUBE_S]) {
      const zz = new Set();
      for (let z = tube.minZ; z <= tube.maxZ; z += 1) zz.add(z);
      for (const line of fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.forward.txt`), 'utf8')
        .split('\n').filter((l) => l.startsWith('REPL'))) {
        const f = line.split(/\s+/);
        const x = Number(f[1]);
        const y = Number(f[2]);
        const z = Number(f[3]);
        if (!zz.has(z)) continue;
        expect(x).toBeGreaterThanOrEqual(SEGMENT.minX);
        expect(x).toBeLessThanOrEqual(SEGMENT.maxX);
        expect(y).toBe(SEGMENT.bedY);
        const key = `${x},${y},${z}`;
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
    expect(seen.size).toBe(SEGMENT.built);
  });

  it('never targets the spine between the two tube beds', () => {
    const forward = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.forward.txt`), 'utf8')
      .split('\n').filter((l) => l.startsWith('REPL'));
    for (const line of forward) {
      const f = line.split(/\s+/);
      const z = Number(f[3]);
      expect(z === -459 || z === -458).toBe(false);
    }
  });
});
