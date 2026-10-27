import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'wlv-egress-field-lighting';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'wlv-egress-'));

type Manifest = {
  manifestIdentity: string;
  mvpScope: boolean;
  scopeIds: string[];
  packages: Array<{ key: string; forward: string; rollback: string }>;
  scope: {
    releaseId: string;
    rimY: number;
    fieldFloorCellCount: number;
    existingFieldLanternCount: number;
    minimumSpacing: number;
    built: { cellCount: number };
    cadenceSelection: Array<{ x: number; y: number; z: number; dir: string }>;
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

describe('WLV-EGRESS-01 Westlight venue field-rim lighting cadence', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_wlv_egress_field_lighting.mjs',
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
    for (const dir of ['forward', 'rollback']) {
      expect(fs.readFileSync(path.join(temporaryDirectory, `${BASENAME}.cadence.${dir}.txt`)))
        .toEqual(fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.cadence.${dir}.txt`)));
    }
  });

  it('emits a valid manifest under the WESTLIGHT-VENUE scope', () => {
    expect(manifest.manifestIdentity).toMatch(/^[0-9a-f]{64}$/);
    expect(manifest.mvpScope).toBe(false);
    expect(manifest.scopeIds).toEqual(['WESTLIGHT-VENUE']);
    expect(manifest.scope.releaseId).toBe('WLV-EGRESS-01');
    expect(manifest.packages.map(({ key }) => key)).toEqual(['cadence']);
  });

  it('emits the exact executed scope: 18 cadence sea_lanterns, 0 hazards', () => {
    expect(manifest.operations['cadence'].forwardCommandCount).toBe(18);
    expect(manifest.operations['cadence'].rollbackCommandCount).toBe(18);
    expect(manifest.operations['cadence'].exactInverse).toBe(true);
    expect(manifest.scope.built.cellCount).toBe(18);
    expect(manifest.scope.rimY).toBe(59);
    expect(manifest.scope.fieldFloorCellCount).toBe(952);
    expect(manifest.scope.existingFieldLanternCount).toBe(3);
    expect(manifest.scope.egressGeometryChanged).toBe(false);
    expect(manifest.scope.routeCommissioned).toBe(false);
  });

  it('has zero isolation hazards', () => {
    expect(manifest.isolation.sourceHazardCount).toBe(0);
    expect(manifest.isolation.operatedHaloFluidCount).toBe(0);
    expect(manifest.isolation.operatedHaloForbiddenBlockCount).toBe(0);
    expect(manifest.isolation.blockEntityIntersectionCount).toBe(0);
    expect(manifest.isolation.savedEntityIntersectionCount).toBe(0);
  });

  it('targets only y59 rim wall cells, never the field floor or entrance stair', () => {
    const forward = fs.readFileSync(
      path.join(BUILDOPS, `${BASENAME}.cadence.forward.txt`), 'utf8',
    );
    const lines = forward.split(/\r?\n/).filter((line) => line.startsWith('REPL '));
    expect(lines.length).toBe(18);
    for (const line of lines) {
      const fields = line.split(/\s+/);
      const x = Number(fields[1]);
      const y = Number(fields[2]);
      const z = Number(fields[3]);
      expect(y).toBe(59);
      // never inside the entrance stair envelope
      expect(x >= -365 && x <= -353 && z >= -509 && z <= -503).toBe(false);
      // every target replaces a full-opaque wall block with sea_lantern
      expect(['minecraft:smooth_stone', 'minecraft:polished_andesite']).toContain(fields[7]);
      expect(fields[8]).toBe('minecraft:sea_lantern');
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
    expect(forward.size).toBe(18);
    expect(rollback.size).toBe(18);
    for (const [key, { source, target }] of forward) {
      expect(rollback.get(key)?.source).toBe(target);
      expect(rollback.get(key)?.target).toBe(source);
    }
  });

  it('maintains the minimum cadence spacing (>=6) along each face', () => {
    const selection = manifest.scope.cadenceSelection;
    expect(selection.length).toBe(18);
    // group by authoritative face direction from the compiler
    const byFace = new Map();
    for (const cell of selection) {
      if (!byFace.has(cell.dir)) byFace.set(cell.dir, []);
      byFace.get(cell.dir).push(cell);
    }
    // dir is the direction FROM field floor TO wall cell; along each face sort by the tangent
    for (const [dir, list] of byFace) {
      const isX = dir === '1,0' || dir === '-1,0';
      const sorted = list.slice().sort((a, b) => (isX ? a.z - b.z : a.x - b.x));
      for (let index = 1; index < sorted.length; index += 1) {
        const distance = isX
          ? sorted[index].z - sorted[index - 1].z
          : sorted[index].x - sorted[index - 1].x;
        expect(distance).toBeGreaterThanOrEqual(6);
      }
    }
  });
});
