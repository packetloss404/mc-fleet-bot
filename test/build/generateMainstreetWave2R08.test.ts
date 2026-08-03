import fs from 'fs';
import path from 'path';
import { beforeAll, describe, expect, it } from 'vitest';

interface GateTarget {
  point: [number, number, number];
  snapshotExactState: string;
  runtimeGuard: string;
  allowedExactSources: string[];
  guardMode: string;
}

interface ReactiveFenceCell {
  point: [number, number, number];
  changedConnection: string;
  snapshotExactState: string;
  projectedForwardExactState: string;
  rollbackExactState: string;
}

interface R08Report {
  liveWorldMutated: boolean;
  source: {
    snapshot: {
      directory: string;
      sha256: string;
      regionFileCount: number;
      bytes: number;
      algorithm: string;
    };
  };
  geometry: {
    roadCellCount: number;
    width: number;
    grade: {
      minimumSurfaceY: number;
      maximumSurfaceY: number;
      maximumAdjacentStep: number;
    };
    routeDirections: Array<{ id: string; connected: boolean }>;
    connectionProof: {
      west: { r1CellRetargeted: boolean };
      east: { r1CellRetargeted: boolean };
      r01: { disconnected: boolean };
    };
  };
  operations: {
    guardedReplacements: number;
    commands: number;
    finiteExactStateUnionGuarded: number;
    roles: Record<string, number>;
  };
  runtimeSafety: {
    reactiveNeighborHazardCount: number;
    allReactiveOperationsBeforeSupportMutations: boolean;
    materialOnlyFiniteUnionGuards: unknown[];
    gatePhysics: {
      exactFenceTargets: GateTarget[];
      adjacentReactiveFenceCells: ReactiveFenceCell[];
    };
  };
  protection: {
    r1TargetOverlaps: unknown[];
    protectedBboxOverlaps: unknown[];
    garageBboxOverlaps: unknown[];
    exactFenceTargets: number;
    undeclaredFenceTargets: unknown[];
    targetedTrees: unknown[];
    targetedBlockEntities: unknown[];
    collisions: unknown[];
  };
  wayfinding: {
    pylons: Array<{ id: string; lines: string[] }>;
    guardedCommands: Array<{ command: string }>;
    namingDecision: string;
  };
  databaseFeatures: {
    mutationPerformed: boolean;
    proposedCount: number;
    existingIdConflicts: unknown[];
    features: Array<{ external_id: string }>;
  };
  media: { cameraCount: number };
  acceptanceChecks: Record<string, boolean | number>;
  failedAcceptance: string[];
  releaseDecision: {
    offlineEngineering: string;
    liveExecution: string;
  };
}

interface PreflightReport {
  operationCount: number;
  passed: number;
  failed: number;
  partialMasks: unknown[];
}

interface DryRunReport {
  sourceOperationCount: number;
  sourceGroupCount: number;
  commandCount: number;
  finiteUnionGroupCount: number;
  worldEditLeftoverCount: number;
  status: string;
}

const BASE = path.resolve(
  'data/buildops/mainstreet-wave2-r08-2026-07-28',
);
const REPORT_PATH = `${BASE}.report.json`;
const FORWARD_PATH = `${BASE}.txt`;
const ROLLBACK_PATH = `${BASE}.rollback.txt`;
const PREFLIGHT_PATH = `${BASE}.preflight.json`;
const FORWARD_DRY_RUN_PATH = `${BASE}.forward-dry-run.json`;
const ROLLBACK_DRY_RUN_PATH = `${BASE}.rollback-dry-run.json`;
const CAMERA_PATH = path.resolve(
  'data/exports/redevelopment-wave2-2026-07-28/mainstreet-r08/'
    + 'same-camera-manifest.json',
);

let report: R08Report;
let preflight: PreflightReport;
let forwardDryRun: DryRunReport;
let rollbackDryRun: DryRunReport;
let forwardLines: string[][];
let rollbackLines: string[][];

function operationLines(filename: string): string[][] {
  return fs.readFileSync(filename, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.startsWith('REPL '))
    .map((line) => line.split(' '));
}

function splitBlockMask(mask: string): string[] {
  const values: string[] = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < mask.length; index += 1) {
    if (mask[index] === '[') depth += 1;
    else if (mask[index] === ']') depth -= 1;
    else if (mask[index] === ',' && depth === 0) {
      values.push(mask.slice(start, index));
      start = index + 1;
    }
  }
  values.push(mask.slice(start));
  return values;
}

beforeAll(() => {
  report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8')) as R08Report;
  preflight = JSON.parse(
    fs.readFileSync(PREFLIGHT_PATH, 'utf8'),
  ) as PreflightReport;
  forwardDryRun = JSON.parse(
    fs.readFileSync(FORWARD_DRY_RUN_PATH, 'utf8'),
  ) as DryRunReport;
  rollbackDryRun = JSON.parse(
    fs.readFileSync(ROLLBACK_DRY_RUN_PATH, 'utf8'),
  ) as DryRunReport;
  forwardLines = operationLines(FORWARD_PATH);
  rollbackLines = operationLines(ROLLBACK_PATH);
});

describe('MainStreet Wave 2 R08 engineering package', () => {
  it('is bound to the immutable Wave 2 baseline and remains offline-only', () => {
    expect(report.source.snapshot).toEqual({
      directory:
        'data/worldsnap-wave2-baseline-4fca1ff3-20260728/region',
      sha256:
        '4fca1ff3c40ae9c24c9338483b0780678aa5966bb570a642f0d0277885331a2b',
      regionFileCount: 26,
      bytes: 122744700,
      algorithm:
        'sha256(filename + NUL + bytes + NUL, sorted by filename)',
    });
    expect(report.liveWorldMutated).toBe(false);
    expect(report.releaseDecision).toEqual({
      offlineEngineering: 'GO',
      liveExecution: 'NOT_AUTHORIZED_OFFLINE_PACKAGE_ONLY',
      rationale: expect.any(String),
    });
    expect(report.failedAcceptance).toEqual([]);
  });

  it('defines a connected three-wide, flat route in both directions', () => {
    expect(report.geometry.roadCellCount).toBe(354);
    expect(report.geometry.width).toBe(3);
    expect(report.geometry.grade).toEqual({
      minimumSurfaceY: 64,
      maximumSurfaceY: 64,
      maximumAdjacentStep: 0,
    });
    expect(report.geometry.routeDirections).toEqual([
      expect.objectContaining({ id: 'west-to-east', connected: true }),
      expect.objectContaining({ id: 'east-to-west', connected: true }),
    ]);
    expect(report.geometry.connectionProof.west.r1CellRetargeted).toBe(false);
    expect(report.geometry.connectionProof.east.r1CellRetargeted).toBe(false);
    expect(report.geometry.connectionProof.r01.disconnected).toBe(false);
  });

  it('does not enter protected buildings, rooms, garages, driveways, landscape, trees, block entities, or R1 targets', () => {
    expect(report.protection.r1TargetOverlaps).toEqual([]);
    expect(report.protection.protectedBboxOverlaps).toEqual([]);
    expect(report.protection.garageBboxOverlaps).toEqual([]);
    expect(report.protection.targetedTrees).toEqual([]);
    expect(report.protection.targetedBlockEntities).toEqual([]);
    expect(report.protection.collisions).toEqual([]);
    expect(report.protection.undeclaredFenceTargets).toEqual([]);
  });

  it('models all six declared gate cells and both reactive neighbors with full exact states', () => {
    expect(report.protection.exactFenceTargets).toBe(6);
    expect(report.runtimeSafety.gatePhysics.exactFenceTargets).toHaveLength(6);
    expect(
      report.runtimeSafety.gatePhysics.adjacentReactiveFenceCells,
    ).toHaveLength(2);

    for (const target of report.runtimeSafety.gatePhysics.exactFenceTargets) {
      expect(target.snapshotExactState).toContain('minecraft:birch_fence[');
      expect(target.allowedExactSources.length).toBeGreaterThanOrEqual(1);
      for (const source of target.allowedExactSources) {
        expect(source).toContain('east=');
        expect(source).toContain('north=');
        expect(source).toContain('south=');
        expect(source).toContain('waterlogged=');
        expect(source).toContain('west=');
      }
      expect(['exact-state', 'finite-exact-state-union']).toContain(
        target.guardMode,
      );
    }
    for (
      const reactive
      of report.runtimeSafety.gatePhysics.adjacentReactiveFenceCells
    ) {
      expect(reactive.snapshotExactState).not.toBe(
        reactive.projectedForwardExactState,
      );
      expect(reactive.rollbackExactState).toBe(reactive.snapshotExactState);
    }
    expect(report.runtimeSafety.materialOnlyFiniteUnionGuards).toEqual([]);
    expect(report.runtimeSafety.reactiveNeighborHazardCount).toBe(0);
    expect(
      report.runtimeSafety.allReactiveOperationsBeforeSupportMutations,
    ).toBe(true);
  });

  it('emits exact guarded forward and inverse operations', () => {
    expect(forwardLines).toHaveLength(736);
    expect(rollbackLines).toHaveLength(736);
    expect(report.operations.guardedReplacements).toBe(736);
    expect(report.operations.commands).toBe(4);
    expect(report.operations.finiteExactStateUnionGuarded).toBe(4);

    for (let index = 0; index < forwardLines.length; index += 1) {
      const forward = forwardLines[index];
      const rollback = rollbackLines[rollbackLines.length - 1 - index];
      expect(rollback.slice(1, 7)).toEqual(forward.slice(1, 7));
      expect(rollback[7]).toBe(forward[8]);
      expect(rollback[8]).toBe(splitBlockMask(forward[7])[0]);
      if (forward[7].includes('birch_fence')) {
        for (const source of splitBlockMask(forward[7])) {
          expect(source).toMatch(
            /^minecraft:birch_fence\[east=(?:true|false),north=(?:true|false),south=(?:true|false),waterlogged=false,west=(?:true|false)\]$/,
          );
        }
      }
    }
  });

  it('passes exact preflight and both parser dry-runs without leftovers', () => {
    expect(preflight).toMatchObject({
      operationCount: 736,
      passed: 736,
      failed: 0,
      partialMasks: [],
    });
    expect(forwardDryRun).toMatchObject({
      status: 'dry_run',
      sourceOperationCount: 740,
      sourceGroupCount: 740,
      commandCount: 744,
      finiteUnionGroupCount: 4,
      worldEditLeftoverCount: 0,
    });
    expect(rollbackDryRun).toMatchObject({
      status: 'dry_run',
      sourceOperationCount: 736,
      sourceGroupCount: 736,
      commandCount: 736,
      finiteUnionGroupCount: 0,
      worldEditLeftoverCount: 0,
    });
  });

  it('keeps C01 and Westlight distinct and supplies a complete media/database crosswalk', () => {
    expect(report.wayfinding.pylons).toHaveLength(4);
    expect(report.wayfinding.guardedCommands).toHaveLength(4);
    expect(report.wayfinding.namingDecision).toContain('cannot be confused');
    expect(
      report.wayfinding.pylons.flatMap((pylon) => pylon.lines),
    ).toEqual(expect.arrayContaining([
      'C01 VIA E ALLEY',
      'WESTLIGHT VENUE',
      'N RAVENSREACH',
      'THEN RAVENSGATE',
      'W APPROACH RD',
    ]));
    for (const command of report.wayfinding.guardedCommands) {
      expect(command.command).toMatch(/^CMD execute if block /);
    }

    expect(report.databaseFeatures.mutationPerformed).toBe(false);
    expect(report.databaseFeatures.proposedCount).toBe(10);
    expect(report.databaseFeatures.existingIdConflicts).toEqual([]);
    expect(
      new Set(
        report.databaseFeatures.features.map((feature) => feature.external_id),
      ).size,
    ).toBe(10);

    const cameraManifest = JSON.parse(
      fs.readFileSync(CAMERA_PATH, 'utf8'),
    ) as {
      cameras: Array<{
        mode?: string;
        visibilityValidation: {
          passed: boolean;
          eyeClear?: boolean;
          visibilityRay?: { unobstructed: boolean };
        };
      }>;
    };
    expect(report.media.cameraCount).toBe(8);
    expect(cameraManifest.cameras).toHaveLength(8);
    expect(
      cameraManifest.cameras
        .filter((camera) => (camera.mode ?? 'persp') !== 'map')
        .every((camera) =>
          camera.visibilityValidation.passed
          && camera.visibilityValidation.eyeClear
          && camera.visibilityValidation.visibilityRay?.unobstructed),
    ).toBe(true);
  });

  it('records every acceptance check as passing', () => {
    const booleanChecks = Object.entries(report.acceptanceChecks)
      .filter(([, value]) => typeof value === 'boolean');
    expect(booleanChecks.length).toBeGreaterThan(15);
    expect(booleanChecks.filter(([, value]) => value === false)).toEqual([]);
  });
});
