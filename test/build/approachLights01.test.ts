import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'approach-lights-cadence';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const LIVE = path.join(ROOT, 'data/world-review/approach-lights-live-20260825T154047Z');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'approach-lights-'));

const MANIFEST_IDENTITY = '818dae5c281f68f17ef355d5b9c552aab796324f48592fed46615a3f9bc5a8be';
const TARGET_CELLS = [
  [-322, 68, -511], [-251, 71, -490], [-221, 70, -491],
  [-182, 71, -509], [-163, 71, -509], [-148, 69, -506],
];
const TARGET_KEY = new Set(TARGET_CELLS.map(([x, y, z]) => `${x},${y},${z}`));

type Manifest = {
  manifestIdentity: string;
  mvpScope: boolean;
  scopeIds: string[];
  packages: Array<{ key: string; forward: string; rollback: string }>;
  scope: {
    releaseId: string;
    builtEdgeCellCount: number;
    preservedEdgeCellCount: number;
    lightingRhythmBlocks: number;
    cadence: { cellCount: number };
    carriagewayPreservedExactly: boolean;
    routeCommissioned: boolean;
  };
  operations: Record<string, {
    forwardCommandCount: number;
    rollbackCommandCount: number;
    exactInverse: boolean;
  }>;
  isolation: {
    operatedHaloFluidCount: number;
    operatedHaloForbiddenBlockCount: number;
    blockEntityIntersectionCount: number;
    savedEntityIntersectionCount: number;
  };
};

let manifest: Manifest;

describe('APPROACH-LIGHTS-01 Approach Road pedestrian-edge lighting cadence', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_approach_lights_cadence.mjs',
      '--out-dir', temporaryDirectory,
      '--generated-at', '2026-08-25T15:41:00Z',
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

  it('emits a valid manifest under the TE-REGIONAL-APPROACH-ROAD scope', () => {
    expect(manifest.manifestIdentity).toBe(MANIFEST_IDENTITY);
    expect(manifest.manifestIdentity).toMatch(/^[0-9a-f]{64}$/);
    expect(manifest.mvpScope).toBe(false);
    expect(manifest.scopeIds).toEqual(['TE-REGIONAL-APPROACH-ROAD']);
    expect(manifest.scope.releaseId).toBe('APPROACH-LIGHTS-01');
    expect(manifest.packages.map(({ key }) => key)).toEqual(['cadence']);
  });

  it('emits the exact executed 6-cell cadence as sea_lantern inlays', () => {
    expect(manifest.scope.cadence.cellCount).toBe(6);
    expect(manifest.scope.builtEdgeCellCount).toBe(145);
    expect(manifest.scope.preservedEdgeCellCount).toBe(139);
    expect(manifest.scope.lightingRhythmBlocks).toBe(12);
    expect(manifest.scope.carriagewayPreservedExactly).toBe(true);
    expect(manifest.scope.routeCommissioned).toBe(false);
    expect(manifest.operations.cadence.forwardCommandCount).toBe(6);
    expect(manifest.operations.cadence.rollbackCommandCount).toBe(6);
    expect(manifest.operations.cadence.exactInverse).toBe(true);
  });

  it('confines the cadence to the exact 6 pedestrian-edge targets', () => {
    for (const pkg of manifest.packages) {
      const text = fs.readFileSync(path.join(ROOT, pkg.forward), 'utf8');
      const lines = text.split(/\r?\n/).filter((l) => l.startsWith('REPL '));
      expect(lines.length).toBe(6);
      for (const line of lines) {
        const f = line.split(/\s+/);
        const x = Number(f[1]);
        const y = Number(f[2]);
        const z = Number(f[3]);
        // every target is a gray_concrete pedestrian-edge cell inlayed with sea_lantern
        expect(f[7]).toBe('minecraft:gray_concrete');
        expect(f[8]).toBe('minecraft:sea_lantern');
        expect(TARGET_KEY.has(`${x},${y},${z}`)).toBe(true);
      }
    }
  });

  it('isolates all targets from fluid, containers, block entities, and saved entities', () => {
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
    expect(forward.length).toBe(rollback.length);
    expect(forward.length).toBe(6);
    const forwardSet = new Set(forward);
    for (const line of rollback) {
      const f = line.split(/\s+/);
      const inverted = `REPL ${f[1]} ${f[2]} ${f[3]} ${f[4]} ${f[5]} ${f[6]} ${f[8]} ${f[7]}`;
      expect(forwardSet.has(inverted)).toBe(true);
    }
  });

  it('verifies the executed evidence ledger is post-state verified and reversible', () => {
    const ledger = JSON.parse(fs.readFileSync(path.join(LIVE, 'evidence-ledger.json'), 'utf8'));
    expect(ledger.status).toBe('EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE');
    expect(ledger.targetCellCount).toBe(6);
    expect(ledger.execution.cadence.executedCommandCount).toBe(6);
    expect(ledger.execution.cadence.successfulCommands).toBe(6);
    expect(ledger.execution.cadence.noopCommands).toBe(0);
    expect(ledger.execution.cadence.failedGroups).toBe(0);
    expect(ledger.hardSafetyKernel.liveExecution).toBe('PASS (6/6 changed, 0 failed, 0 no-op)');
    expect(ledger.hardSafetyKernel.rollbackPoststatePreflight).toBe('PASS (6/6 against post snapshot)');
    expect(ledger.hardSafetyKernel.postStateVerify).toContain('6/6 cadence cells exact sea_lantern');
  });

  it('proves the post-state verification confirms the cadence and preserves boundaries', () => {
    const verify = JSON.parse(fs.readFileSync(path.join(LIVE, 'approach-lights-post-state-verify.json'), 'utf8'));
    expect(verify.status).toBe('PASS_APPROACH_LIGHTS_01_PEDESTRIAN_EDGE_LIGHTING_POSTSTATE_VERIFIED_REVERSIBLE');
    expect(verify.checks.exactPostStateCount).toBe(6);
    expect(verify.checks.exactPostStateMismatchCount).toBe(0);
    expect(verify.checks.haloFluidCount).toBe(0);
    expect(verify.checks.haloForbiddenCount).toBe(0);
    expect(verify.checks.haloOffTargetDriftCount).toBe(0);
    expect(verify.checks.builtEdgeCellCount).toBe(145);
    expect(verify.checks.preservedEdgeDriftCount).toBe(0);
    expect(verify.checks.carriagewayChangedCount).toBe(0);
    expect(verify.checks.carriagewayDeckCellsChecked).toBeGreaterThan(900);
    expect(verify.routeProof.pedestrianEdgePreserved).toBe(true);
    expect(verify.routeProof.carriagewayPreserved).toBe(true);
    expect(verify.routeProof.routeCommissioned).toBe(false);
  });
});
