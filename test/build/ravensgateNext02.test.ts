import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'ravensgate-garth-plaza-lighting';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const LIVE = path.join(ROOT, 'data/world-review/sweep3-live-20260825T164707Z');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ravensgate-garth-'));

const MANIFEST_IDENTITY = 'b2dad98b2f1ff65876cf6ef3502dd8abc389091043ff2eb9042fef0e086f2c00';
const TARGET_CELLS = [
  [-92, 67, -440], [-92, 67, -434], [-89, 67, -443], [-89, 67, -440], [-89, 67, -434],
  [-88, 67, -437], [-83, 67, -443], [-83, 67, -439], [-83, 67, -436], [-80, 67, -443],
  [-80, 67, -440], [-80, 67, -437], [-80, 67, -434], [-77, 67, -443], [-77, 67, -440],
  [-77, 67, -434], [-74, 67, -443], [-74, 67, -440], [-74, 67, -437], [-74, 67, -434],
  [-71, 67, -440], [-71, 67, -436],
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
    interiorFloorCellCount: number;
    pavedInteriorCellCount: number;
    preservedFloorCellCount: number;
    existingPlazaLightCount: number;
    ownership: {
      interfaceIF_RG_GARTH_STATUES: string;
    };
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

describe('RAVENSGATE-NEXT-02 Garth statue plaza lighting cadence', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_ravensgate_garth_plaza_lighting.mjs',
      '--out-dir', temporaryDirectory,
      '--generated-at', '2026-08-25T17:00:00Z',
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
    expect(manifest.scope.releaseId).toBe('RAVENSGATE-NEXT-02');
    expect(manifest.packages.map(({ key }) => key)).toEqual(['cadence']);
  });

  it('emits the exact executed 22-cell cadence as sea_lantern', () => {
    expect(manifest.scope.cadenceCells.cellCount).toBe(22);
    expect(manifest.scope.pavedFloorCellCount).toBe(301);
    expect(manifest.scope.interiorFloorCellCount).toBe(201);
    expect(manifest.scope.pavedInteriorCellCount).toBe(171);
    expect(manifest.scope.preservedFloorCellCount).toBe(279);
    expect(manifest.scope.existingPlazaLightCount).toBe(8);
    expect(manifest.scope.ownership.interfaceIF_RG_GARTH_STATUES).toContain('IN_DISTRICT_PUBLIC_REALM');
    expect(manifest.operations.cadence.forwardCommandCount).toBe(22);
    expect(manifest.operations.cadence.rollbackCommandCount).toBe(22);
    expect(manifest.operations.cadence.exactInverse).toBe(true);
  });

  it('confines the cadence to the exact 22 stone_bricks plaza targets at y=67', () => {
    for (const pkg of manifest.packages) {
      const text = fs.readFileSync(path.join(ROOT, pkg.forward), 'utf8');
      const lines = text.split(/\r?\n/).filter((l) => l.startsWith('REPL '));
      expect(lines.length).toBe(22);
      for (const line of lines) {
        const f = line.split(/\s+/);
        const x = Number(f[1]);
        const y = Number(f[2]);
        const z = Number(f[3]);
        expect(y).toBe(67);
        expect(TARGET_KEY.has(`${x},${y},${z}`)).toBe(true);
        expect(f[7]).toBe('minecraft:stone_bricks');
        expect(f[8]).toBe('minecraft:sea_lantern');
      }
    }
  });

  it('keeps the cadence away from every authored statue plinth halo', () => {
    const STATUES = [
      [-92, -443], [-92, -429], [-69, -443], [-69, -429],
      [-91, -437], [-77, -437],
    ];
    for (const [x, z] of TARGET_CELLS.map(([cx, , cz]) => [cx, cz])) {
      const nearStatue = STATUES.some(([sx, sz]) => (
        Math.max(Math.abs(x - sx), Math.abs(z - sz)) <= 2
      ));
      expect(nearStatue).toBe(false);
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
    expect(forward.length).toBe(22);
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
    expect(ledger.targetCellCount).toBe(22);
    expect(ledger.execution.cadence.executedCommandCount).toBe(22);
    expect(ledger.execution.cadence.successfulCommands).toBe(22);
    expect(ledger.execution.cadence.noopCommands).toBe(0);
    expect(ledger.execution.cadence.failedGroups).toBe(0);
    expect(ledger.hardSafetyKernel.liveExecution).toBe('PASS (22/22 changed, 0 failed, 0 no-op)');
    expect(ledger.hardSafetyKernel.rollbackPoststatePreflight).toBe('PASS (22/22 against post snapshot)');
    expect(ledger.hardSafetyKernel.postStateVerify).toContain('22/22 cadence cells exact sea_lantern');
  });

  it('proves the post-release QA confirms the cadence and preserves boundaries', () => {
    const qa = JSON.parse(fs.readFileSync(path.join(LIVE, 'ravensgate-garth-plaza-lighting.post-release-qa.json'), 'utf8'));
    expect(qa.status).toBe('PASS_RAVENSGATE_NEXT_02_GARTH_STATUE_PLAZA_LIGHTING_POSTSTATE_VERIFIED_REVERSIBLE');
    expect(qa.checks.exactPostStateCount).toBe(22);
    expect(qa.checks.exactPostStateMismatchCount).toBe(0);
    expect(qa.checks.haloFluidCount).toBe(0);
    expect(qa.checks.haloForbiddenCount).toBe(0);
    expect(qa.checks.haloOffTargetDriftCount).toBe(0);
    expect(qa.checks.preservedFloorDriftCount).toBe(0);
    expect(qa.checks.statuePlinthDriftCount).toBe(0);
    expect(qa.checks.exactInversePairCount).toBe(22);
    expect(qa.checks.cadenceCellsFlush).toBe(true);
    expect(qa.routeProof.plazaWalkingSurfacePreserved).toBe(true);
    expect(qa.routeProof.statuesPreserved).toBe(true);
    expect(qa.routeProof.contestedInterfaceBandUntouched).toBe(true);
    expect(qa.routeProof.routeCommissioned).toBe(false);
  });
});
