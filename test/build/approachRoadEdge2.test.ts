import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'approach-road-edge2-pedestrian-edge';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const LIVE = path.join(ROOT, 'data/world-review/approach-road-edge2-live-20260825T071000Z');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'approach-edge2-'));

type Manifest = {
  manifestIdentity: string;
  mvpScope: boolean;
  scopeIds: string[];
  packages: Array<{ key: string; forward: string; rollback: string }>;
  scope: {
    releaseId: string;
    baseRelease: string;
    blockedSegments: {
      blockedBoth: string[];
      blockedNorthOnly: string[];
      blockedSouthOnly: string[];
    };
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

describe('CIRC-WL-ARRIVAL-ROAD-01-B Approach Road pedestrian edge (blocked-segment remainder)', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_approach_road_edge2.mjs',
      '--out-dir', temporaryDirectory,
      '--generated-at', '2026-08-25T07:12:00Z',
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

  it('emits a valid manifest under the TE-REGIONAL-APPROACH-ROAD scope', () => {
    expect(manifest.manifestIdentity).toMatch(/^[0-9a-f]{64}$/);
    expect(manifest.mvpScope).toBe(false);
    expect(manifest.scopeIds).toEqual(['TE-REGIONAL-APPROACH-ROAD']);
    expect(manifest.scope.releaseId).toBe('CIRC-WL-ARRIVAL-ROAD-01-B');
    expect(manifest.scope.baseRelease).toBe('CIRC-WL-ARRIVAL-ROAD-01');
    expect(manifest.packages.map(({ key }) => key)).toEqual(['support-fill', 'edge-pave']);
  });

  it('focuses only on the survey blocked segments (113 blocked columns)', () => {
    expect(manifest.scope.blockedSegments.blockedBoth).toContain('-264..-252');
    expect(manifest.scope.blockedSegments.blockedNorthOnly).toContain('-341..-336');
    expect(manifest.scope.blockedSegments.blockedSouthOnly).toContain('-316..-302');
  });

  it('emits the exact executed scope: 182 targets (78 edge + 104 support)', () => {
    expect(manifest.operations['support-fill'].forwardCommandCount).toBe(104);
    expect(manifest.operations['edge-pave'].forwardCommandCount).toBe(78);
    expect(manifest.operations['support-fill'].exactInverse).toBe(true);
    expect(manifest.operations['edge-pave'].exactInverse).toBe(true);
    expect(manifest.scope.builtEdgeCells.cellCount).toBe(78);
    expect(manifest.scope.supportFillCells.cellCount).toBe(104);
  });

  it('records 374 held blocked-segment cells with exact reasons', () => {
    expect(manifest.scope.held.cellCount).toBe(374);
    const reasons = Object.values(manifest.scope.held.byReason).reduce((sum, n) => sum + n, 0);
    expect(reasons).toBe(374);
  });

  it('only ever overwrites replaceable non-paved surface sources', () => {
    // Every target source was air/plants/grass/dirt — never a paved road cell.
    const edges = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.edge-pave.forward.txt`), 'utf8')
      .split('\n').filter((l) => l.startsWith('REPL'));
    const support = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.support-fill.forward.txt`), 'utf8')
      .split('\n').filter((l) => l.startsWith('REPL'));
    const allowed = new Set([
      'minecraft:air', 'minecraft:cave_air', 'minecraft:void_air',
      'minecraft:short_grass', 'minecraft:tall_grass', 'minecraft:poppy',
      'minecraft:dandelion', 'minecraft:azure_bluet', 'minecraft:cornflower',
      'minecraft:bush', 'minecraft:fern', 'minecraft:large_fern',
      'minecraft:grass_block', 'minecraft:dirt', 'minecraft:sand',
      'minecraft:gravel', 'minecraft:dirt_path',
    ]);
    for (const line of [...edges, ...support]) {
      const src = line.split(/\s+/)[7];
      const name = src.split('[', 1)[0];
      expect(allowed.has(name)).toBe(true);
    }
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
        // rollback: REPL x y z x y z to from -> inverse REPL x y z x y z from to
        const inverted = `REPL ${f[1]} ${f[2]} ${f[3]} ${f[4]} ${f[5]} ${f[6]} ${f[8]} ${f[7]}`;
        expect(forwardSet.has(inverted)).toBe(true);
      }
    }
  });

  it('verifies the executed evidence ledger is post-state verified and reversible', () => {
    const ledger = JSON.parse(fs.readFileSync(path.join(LIVE, 'evidence-ledger.json'), 'utf8'));
    expect(ledger.status).toBe('EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE');
    expect(ledger.targetCellCount).toBe(182);
    expect(ledger.execution.supportFill.executedCommandCount).toBe(104);
    expect(ledger.execution.supportFill.failedGroups).toBe(0);
    expect(ledger.execution.edgePave.executedCommandCount).toBe(78);
    expect(ledger.execution.edgePave.failedGroups).toBe(0);
    expect(ledger.hardSafetyKernel.liveExecution).toBe('PASS (182/182 changed, 0 failed, 0 no-op)');
    expect(ledger.hardSafetyKernel.rollbackPoststatePreflight).toBe('PASS (78/78 + 104/104)');
    expect(ledger.hardSafetyKernel.postStateVerify).toContain('182/182 targets match');
  });

  it('verifies the post-state verification report and carriageway preservation', () => {
    const verify = JSON.parse(fs.readFileSync(path.join(LIVE, 'approach-road-edge2.post-state-verify.json'), 'utf8'));
    expect(verify.status).toBe('PASS');
    expect(verify.targetCheck.matched).toBe(182);
    expect(verify.targetCheck.failed).toBe(0);
    expect(verify.carriagewayPreservation.changed).toBe(0);
    expect(verify.carriagewayPreservation.pavedDeckCellsChecked).toBeGreaterThan(2000);
  });
});
