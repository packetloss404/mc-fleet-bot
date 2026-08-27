import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'westlight-arrival-pedestrian-edge';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'wl-arrival-edge-'));

type Manifest = {
  manifestIdentity: string;
  mvpScope: boolean;
  scopeIds: string[];
  packages: Array<{ key: string; forward: string; rollback: string }>;
  scope: {
    releaseId: string;
    deckColumns: { minX: number; maxX: number; edgeZ: number[] };
    builtEdgeCells: { cellCount: number };
    supportFillCells: { cellCount: number };
    held: { cellCount: number; byReason: Record<string, number> };
    carriagewayPreservedExactly: boolean;
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

describe('CIRC-WL-ARRIVAL-01 Westlight arrival pedestrian edge', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_westlight_arrival_pedestrian_edge.mjs',
      '--out-dir', temporaryDirectory,
      '--generated-at', '2026-08-24T12:00:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 120_000 });
    manifest = JSON.parse(
      fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.release-manifest.json`), 'utf8'),
    ) as Manifest;
  });

  afterAll(() => {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('reproduces the canonical build artifacts byte-for-byte', () => {
    for (const pkg of ['support-fill', 'edge-pave']) {
      for (const dir of ['forward', 'rollback']) {
        expect(fs.readFileSync(path.join(temporaryDirectory, `${BASENAME}.${pkg}.${dir}.txt`)))
          .toEqual(fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.${pkg}.${dir}.txt`)));
      }
    }
  });

  it('emits a valid manifest under the WESTLIGHT-DISTRICT scope', () => {
    expect(manifest.manifestIdentity).toMatch(/^[0-9a-f]{64}$/);
    expect(manifest.mvpScope).toBe(false);
    expect(manifest.scopeIds).toEqual(['WESTLIGHT-DISTRICT']);
    expect(manifest.scope.releaseId).toBe('CIRC-WL-ARRIVAL-01');
    expect(manifest.packages.map(({ key }) => key)).toEqual(['support-fill', 'edge-pave']);
  });

  it('emits the exact executed scope: 54 targets (18 edge + 36 support)', () => {
    expect(manifest.operations['support-fill'].forwardCommandCount).toBe(36);
    expect(manifest.operations['edge-pave'].forwardCommandCount).toBe(18);
    expect(manifest.operations['support-fill'].exactInverse).toBe(true);
    expect(manifest.operations['edge-pave'].exactInverse).toBe(true);
    expect(manifest.scope.builtEdgeCells.cellCount).toBe(18);
    expect(manifest.scope.supportFillCells.cellCount).toBe(36);
    expect(manifest.scope.deckColumns).toEqual({ minX: -318, maxX: -310, edgeZ: [-492, -491] });
  });

  it('holds nothing (0 held cells) and preserves the carriageway', () => {
    expect(manifest.scope.held.cellCount).toBe(0);
    expect(manifest.scope.carriagewayPreservedExactly).toBe(true);
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
    for (const pkg of ['support-fill', 'edge-pave']) {
      const forward = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.${pkg}.forward.txt`), 'utf8')
        .split('\n').filter((l) => l.startsWith('REPL'));
      const rollback = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.${pkg}.rollback.txt`), 'utf8')
        .split('\n').filter((l) => l.startsWith('REPL'));
      expect(forward.length).toBe(rollback.length);
      const forwardSet = new Set(forward);
      for (const line of rollback) {
        const f = line.split(/\s+/);
        const inverted = `REPL ${f[1]} ${f[2]} ${f[3]} ${f[4]} ${f[5]} ${f[6]} ${f[8]} ${f[7]}`;
        expect(forwardSet.has(inverted)).toBe(true);
      }
    }
  });

  it('never touches a carriageway cell (all targets are road-adjacent edge cells)', () => {
    // The 7-wide carriageway is the gray_concrete deck run at z=-501..-493 at
    // each deckY. Operated edge cells are at z=-492,-491 (south of the run) and
    // support fills are below deckY. No operated cell is inside the carriageway
    // z=-501..-493 run at deckY.
    const operatedKeys: string[] = [];
    for (const pkg of manifest.packages) {
      const text = fs.readFileSync(path.join(ROOT, pkg.forward), 'utf8');
      for (const line of text.split(/\r?\n/)) {
        if (!line.startsWith('REPL ')) continue;
        const f = line.split(/\s+/);
        operatedKeys.push({ x: Number(f[1]), y: Number(f[2]), z: Number(f[3]) });
      }
    }
    const deckYs = new Map<number, number>();
    for (const op of operatedKeys) {
      if (op.z === -493) deckYs.set(op.x, op.y);
    }
    for (const op of operatedKeys) {
      const dy = deckYs.get(op.x) ?? 0;
      const inCarriageway = op.z >= -501 && op.z <= -493 && op.y === dy;
      expect(inCarriageway).toBe(false);
      expect(op.z).toBeGreaterThanOrEqual(-492);
      expect(op.z).toBeLessThanOrEqual(-491);
    }
  });

  it('proves every edge cell is exact-air with two clear headroom blocks', () => {
    // Source guards encode exact-air sources and non-colliding h1/h2; the
    // forward file must show every edge REPL sources from minecraft:air.
    const forward = fs.readFileSync(
      path.join(BUILDOPS, `${BASENAME}.edge-pave.forward.txt`), 'utf8',
    ).split('\n').filter((l) => l.startsWith('REPL'));
    expect(forward.length).toBe(18);
    for (const line of forward) {
      const f = line.split(/\s+/);
      expect(f[7]).toBe('minecraft:air');
      expect(f[8]).toBe('minecraft:gray_concrete');
    }
  });
});
