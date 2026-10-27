import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'wlv-crown-walk-lighting';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'wlv-crown-walk-'));

type Manifest = {
  manifestIdentity: string;
  mvpScope: boolean;
  scopeIds: string[];
  packages: Array<{ key: string; forward: string; rollback: string }>;
  scope: {
    releaseId: string;
    walkY: number;
    ringWalkCellCount: number;
    existingCrownLightCount: number;
    minimumSpacing: number;
    built: { cellCount: number };
    cadenceCells: { cellCount: number };
    cadenceSelection: Array<{ x: number; y: number; z: number }>;
    preBuildDistanceProof: {
      meanDistanceToNearestLight: number;
      maxDistanceToNearestLight: number;
      cellsOverMinimumSpacing: number;
    };
    walkSurfaceChanged: boolean;
    headroomChanged: boolean;
    egressGeometryChanged: boolean;
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

describe('WLV-CROWN-01 Westlight venue bowl crown-walk floor lighting cadence', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_wlv_crown_walk_lighting.mjs',
      '--out-dir', temporaryDirectory,
      '--generated-at', '2026-08-25T18:00:00Z',
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

  it('emits a valid manifest under the WESTLIGHT-VENUE scope', () => {
    expect(manifest.manifestIdentity).toMatch(/^[0-9a-f]{64}$/);
    expect(manifest.mvpScope).toBe(false);
    expect(manifest.scopeIds).toEqual(['WESTLIGHT-VENUE']);
    expect(manifest.scope.releaseId).toBe('WLV-CROWN-01');
    expect(manifest.packages.map(({ key }) => key)).toEqual(['cadence']);
  });

  it('emits a substantial continuous cadence at the y82 crown-walk surface', () => {
    const count = manifest.scope.cadenceCells.cellCount;
    expect(count).toBeGreaterThanOrEqual(30);
    expect(manifest.operations['cadence'].forwardCommandCount).toBe(count);
    expect(manifest.operations['cadence'].rollbackCommandCount).toBe(count);
    expect(manifest.operations['cadence'].exactInverse).toBe(true);
    expect(manifest.scope.built.cellCount).toBe(count);
    expect(manifest.scope.walkY).toBe(82);
    expect(manifest.scope.ringWalkCellCount).toBeGreaterThanOrEqual(600);
    expect(manifest.scope.walkSurfaceChanged).toBe(false);
    expect(manifest.scope.headroomChanged).toBe(false);
    expect(manifest.scope.egressGeometryChanged).toBe(false);
    expect(manifest.scope.routeCommissioned).toBe(false);
  });

  it('documents that the crown walk was genuinely under-lit before the build', () => {
    const proof = manifest.scope.preBuildDistanceProof;
    expect(proof.meanDistanceToNearestLight).toBeGreaterThan(20);
    expect(proof.maxDistanceToNearestLight).toBeGreaterThan(50);
    expect(proof.cellsOverMinimumSpacing).toBeGreaterThan(
      manifest.scope.ringWalkCellCount * 0.5,
    );
  });

  it('has zero isolation hazards', () => {
    expect(manifest.isolation.sourceHazardCount).toBe(0);
    expect(manifest.isolation.operatedHaloFluidCount).toBe(0);
    expect(manifest.isolation.operatedHaloForbiddenBlockCount).toBe(0);
    expect(manifest.isolation.blockEntityIntersectionCount).toBe(0);
    expect(manifest.isolation.savedEntityIntersectionCount).toBe(0);
  });

  it('targets only y82 crown-walk cells, replacing walk blocks with sea_lantern', () => {
    const forward = fs.readFileSync(
      path.join(BUILDOPS, `${BASENAME}.cadence.forward.txt`), 'utf8',
    );
    const lines = forward.split(/\r?\n/).filter((line) => line.startsWith('REPL '));
    expect(lines.length).toBe(manifest.scope.cadenceCells.cellCount);
    const sources = new Set();
    for (const line of lines) {
      const fields = line.split(/\s+/);
      const y = Number(fields[2]);
      expect(y).toBe(82);
      sources.add(fields[7]);
      expect(fields[8]).toBe('minecraft:sea_lantern');
    }
    // every source is a crown-walk surface block
    for (const source of sources) {
      expect(['minecraft:polished_andesite', 'minecraft:deepslate_tiles']).toContain(source);
    }
  });

  it('forward and rollback are exact per-cell inverses', () => {
    const forward = new Map(
      fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.cadence.forward.txt`), 'utf8')
        .split(/\r?\n/).filter((line) => line.startsWith('REPL '))
        .map((line) => {
          const f = line.split(/\s+/);
          return [`${f[1]},${f[2]},${f[3]}`, { source: f[7], target: f[8] }];
        }),
    );
    const rollback = new Map(
      fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.cadence.rollback.txt`), 'utf8')
        .split(/\r?\n/).filter((line) => line.startsWith('REPL '))
        .map((line) => {
          const f = line.split(/\s+/);
          return [`${f[1]},${f[2]},${f[3]}`, { source: f[7], target: f[8] }];
        }),
    );
    expect(forward.size).toBe(manifest.scope.cadenceCells.cellCount);
    expect(rollback.size).toBe(manifest.scope.cadenceCells.cellCount);
    for (const [key, { source, target }] of forward) {
      expect(rollback.get(key)?.source).toBe(target);
      expect(rollback.get(key)?.target).toBe(source);
    }
  });

  it('maintains the minimum cadence spacing (>=6 Chebyshev)', () => {
    const selection = manifest.scope.cadenceSelection;
    expect(selection.length).toBe(manifest.scope.cadenceCells.cellCount);
    for (let i = 0; i < selection.length; i += 1) {
      for (let j = i + 1; j < selection.length; j += 1) {
        const distance = Math.max(
          Math.abs(selection[i].x - selection[j].x),
          Math.abs(selection[i].z - selection[j].z),
        );
        expect(distance).toBeGreaterThanOrEqual(manifest.scope.minimumSpacing);
      }
    }
  });

  it('is disjoint from the prior WLV lighting releases (field-rim y59, concourse y72)', () => {
    const forward = fs.readFileSync(
      path.join(BUILDOPS, `${BASENAME}.cadence.forward.txt`), 'utf8',
    );
    const lines = forward.split(/\r?\n/).filter((line) => line.startsWith('REPL '));
    for (const line of lines) {
      const fields = line.split(/\s+/);
      const y = Number(fields[2]);
      expect(y).toBe(82);
    }
  });
});
