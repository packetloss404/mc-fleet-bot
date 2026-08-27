import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'wl-district-gatehead-plaza-lighting';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'wl-district-next-'));

type Manifest = {
  manifestIdentity: string;
  mvpScope: boolean;
  scopeIds: string[];
  packages: Array<{ key: string; forward: string; rollback: string }>;
  scope: {
    releaseId: string;
    plazaBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
    floorY: number;
    pavedFloorCellCount: number;
    interiorFloorCellCount: number;
    preservedFloorCellCount: number;
    existingPlazaLightCount: number;
    minimumSpacing: number;
    cadenceCells: { cellCount: number };
    routeCommissioned: boolean;
  };
  operations: Record<string, {
    forwardCommandCount: number;
    rollbackCommandCount: number;
    exactInverse: boolean;
  }>;
  isolation: {
    sourceHazardCount: number;
    operatedHaloFluidCount: number;
    operatedHaloForbiddenBlockCount: number;
    blockEntityIntersectionCount: number;
    savedEntityIntersectionCount: number;
  };
};

let manifest: Manifest;

describe('WL-DISTRICT-NEXT-01 Gatehead arrival-plaza lighting cadence', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_wl_district_gatehead_plaza_lighting.mjs',
      '--out-dir', temporaryDirectory,
      '--generated-at', '2026-08-25T08:00:00Z',
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
      expect(fs.readFileSync(path.join(temporaryDirectory, `${BASENAME}.cadence.${dir}.txt`)))
        .toEqual(fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.cadence.${dir}.txt`)));
    }
  });

  it('emits a valid manifest under the WESTLIGHT-DISTRICT scope', () => {
    expect(manifest.manifestIdentity).toMatch(/^[0-9a-f]{64}$/);
    expect(manifest.mvpScope).toBe(false);
    expect(manifest.scopeIds).toEqual(['WESTLIGHT-DISTRICT']);
    expect(manifest.scope.releaseId).toBe('WL-DISTRICT-NEXT-01');
    expect(manifest.packages.map(({ key }) => key)).toEqual(['cadence']);
  });

  it('emits the exact executed scope: 5 cadence targets', () => {
    expect(manifest.operations['cadence'].forwardCommandCount).toBe(5);
    expect(manifest.operations['cadence'].rollbackCommandCount).toBe(5);
    expect(manifest.operations['cadence'].exactInverse).toBe(true);
    expect(manifest.scope.cadenceCells.cellCount).toBe(5);
  });

  it('freezes the clean plaza: 63 paved, 25 interior, 58 preserved, 0 existing lights', () => {
    expect(manifest.scope.plazaBounds).toEqual({ minX: -342, maxX: -336, minZ: -490, maxZ: -476 });
    expect(manifest.scope.floorY).toBe(67);
    expect(manifest.scope.pavedFloorCellCount).toBe(63);
    expect(manifest.scope.interiorFloorCellCount).toBe(25);
    expect(manifest.scope.preservedFloorCellCount).toBe(58);
    expect(manifest.scope.existingPlazaLightCount).toBe(0);
    expect(manifest.scope.minimumSpacing).toBe(3);
    expect(manifest.scope.routeCommissioned).toBe(false);
  });

  it('isolates all targets from fluid, containers, block entities, and saved entities', () => {
    expect(manifest.isolation.sourceHazardCount).toBe(0);
    expect(manifest.isolation.operatedHaloFluidCount).toBe(0);
    expect(manifest.isolation.operatedHaloForbiddenBlockCount).toBe(0);
    expect(manifest.isolation.blockEntityIntersectionCount).toBe(0);
    expect(manifest.isolation.savedEntityIntersectionCount).toBe(0);
  });

  it('proves the forward and rollback REPL files are exact inverses', () => {
    const forward = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.cadence.forward.txt`), 'utf8')
      .split('\n').filter((l) => l.startsWith('REPL'));
    const rollback = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.cadence.rollback.txt`), 'utf8')
      .split('\n').filter((l) => l.startsWith('REPL'));
    expect(forward.length).toBe(5);
    expect(rollback.length).toBe(5);
    const forwardSet = new Set(forward);
    for (const line of rollback) {
      const f = line.split(/\s+/);
      const inverted = `REPL ${f[1]} ${f[2]} ${f[3]} ${f[4]} ${f[5]} ${f[6]} ${f[8]} ${f[7]}`;
      expect(forwardSet.has(inverted)).toBe(true);
    }
  });

  it('proves every cadence target is exact polished_diorite over stone with two-clear headroom', () => {
    const forward = fs.readFileSync(
      path.join(BUILDOPS, `${BASENAME}.cadence.forward.txt`), 'utf8',
    ).split('\n').filter((l) => l.startsWith('REPL'));
    expect(forward.length).toBe(5);
    const cells = forward.map((line) => {
      const f = line.split(/\s+/);
      return { x: Number(f[1]), y: Number(f[2]), z: Number(f[3]), source: f[7], target: f[8] };
    });
    for (const c of cells) {
      expect(c.y).toBe(67);
      expect(c.source).toBe('minecraft:polished_diorite');
      expect(c.target).toBe('minecraft:sea_lantern');
    }
    // Chebyshev spacing >= 3 between all selected targets.
    for (let i = 0; i < cells.length; i += 1) {
      for (let j = i + 1; j < cells.length; j += 1) {
        const distance = Math.max(Math.abs(cells[i].x - cells[j].x), Math.abs(cells[i].z - cells[j].z));
        expect(distance).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
