import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'ravensgate-north-plaza-lighting';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const LIVE = path.join(ROOT, 'data/world-review/ravensgate-next-live-20260825T074559Z');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ravensgate-next-'));

const MANIFEST_IDENTITY = 'ecbd477e21649d05c1808131482786f7e5fdfe143157f031eb36b7c2e60ee2cd';
const TARGET_CELLS = [
  [-129, 67, -450], [-126, 67, -450], [-123, 67, -450], [-120, 67, -450],
  [-117, 67, -450], [-114, 67, -450], [-111, 67, -450], [-108, 67, -450],
];
const TARGET_KEY = new Set(TARGET_CELLS.map(([x, y, z]) => `${x},${y},${z}`));

type Manifest = {
  manifestIdentity: string;
  mvpScope: boolean;
  scopeIds: string[];
  packages: Array<{ key: string; forward: string; rollback: string }>;
  scope: {
    releaseId: string;
    cadenceCells: { cellCount: number };
    pavedFloorCellCount: number;
    preservedFloorCellCount: number;
    existingPlazaLightCount: number;
    ownership: {
      arrivalPadContest: boolean;
    };
  };
  operations: Record<string, {
    forwardCommandCount: number;
    rollbackCommandCount: number;
    exactInverse: boolean;
  }>;
  isolation: {
    targetFluidOrWaterloggedCount?: number;
    targetForbiddenBlockCount?: number;
    operatedHaloFluidCount: number;
    operatedHaloForbiddenBlockCount: number;
    blockEntityIntersectionCount: number;
    savedEntityIntersectionCount: number;
  };
};

let manifest: Manifest;

describe('RAVENSGATE-NEXT-01 NW Garth arrival-pad lighting cadence', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_ravensgate_north_plaza_lighting.mjs',
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

  it('emits a valid manifest under the ravensgate scope', () => {
    expect(manifest.manifestIdentity).toBe(MANIFEST_IDENTITY);
    expect(manifest.manifestIdentity).toMatch(/^[0-9a-f]{64}$/);
    expect(manifest.mvpScope).toBe(false);
    expect(manifest.scopeIds).toEqual(['RAVENSGATE']);
    expect(manifest.scope.releaseId).toBe('RAVENSGATE-NEXT-01');
    expect(manifest.packages.map(({ key }) => key)).toEqual(['cadence']);
  });

  it('emits the exact executed 8-cell cadence as sea_lantern', () => {
    expect(manifest.scope.cadenceCells.cellCount).toBe(8);
    expect(manifest.scope.pavedFloorCellCount).toBe(183);
    expect(manifest.scope.preservedFloorCellCount).toBe(175);
    expect(manifest.scope.existingPlazaLightCount).toBe(0);
    expect(manifest.scope.ownership.arrivalPadContest).toBe(false);
    expect(manifest.operations.cadence.forwardCommandCount).toBe(8);
    expect(manifest.operations.cadence.rollbackCommandCount).toBe(8);
    expect(manifest.operations.cadence.exactInverse).toBe(true);
  });

  it('confines the cadence to the exact 8 z=-450 arrival-pad targets at y=67', () => {
    for (const pkg of manifest.packages) {
      const text = fs.readFileSync(path.join(ROOT, pkg.forward), 'utf8');
      const lines = text.split(/\r?\n/).filter((l) => l.startsWith('REPL '));
      expect(lines.length).toBe(8);
      for (const line of lines) {
        const f = line.split(/\s+/);
        const x = Number(f[1]);
        const y = Number(f[2]);
        const z = Number(f[3]);
        expect(y).toBe(67);
        expect(z).toBe(-450);
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
    expect(forward.length).toBe(8);
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
    expect(ledger.targetCellCount).toBe(8);
    expect(ledger.execution.cadence.executedCommandCount).toBe(8);
    expect(ledger.execution.cadence.successfulCommands).toBe(8);
    expect(ledger.execution.cadence.noopCommands).toBe(0);
    expect(ledger.execution.cadence.failedGroups).toBe(0);
    expect(ledger.hardSafetyKernel.liveExecution).toBe('PASS (8/8 changed, 0 failed, 0 no-op)');
    expect(ledger.hardSafetyKernel.rollbackPoststatePreflight).toBe('PASS (8/8 against post snapshot)');
    expect(ledger.hardSafetyKernel.postStateVerify).toContain('8/8 cadence cells exact sea_lantern');
  });

  it('proves the post-release QA confirms the cadence and preserves boundaries', () => {
    const qa = JSON.parse(fs.readFileSync(path.join(LIVE, 'ravensgate-next-post-release-qa.json'), 'utf8'));
    expect(qa.status).toBe('PASS_RAVENSGATE_NEXT_01_ARRIVAL_PAD_LIGHTING_POSTSTATE_VERIFIED_REVERSIBLE');
    expect(qa.checks.exactPostStateCount).toBe(8);
    expect(qa.checks.exactPostStateMismatchCount).toBe(0);
    expect(qa.checks.haloFluidCount).toBe(0);
    expect(qa.checks.haloForbiddenCount).toBe(0);
    expect(qa.checks.haloOffTargetDriftCount).toBe(0);
    expect(qa.checks.preservedFloorDriftCount).toBe(0);
    expect(qa.checks.cadenceCellsFlush).toBe(true);
    expect(qa.checks.contestedInterfaceBandDriftCount).toBe(0);
    expect(qa.routeProof.plazaWalkingSurfacePreserved).toBe(true);
    expect(qa.routeProof.contestedInterfaceBandUntouched).toBe(true);
    expect(qa.routeProof.routeCommissioned).toBe(false);
  });
});
