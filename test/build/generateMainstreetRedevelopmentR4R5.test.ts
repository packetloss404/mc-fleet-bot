import fs from 'fs';
import path from 'path';
import { beforeAll, describe, expect, it } from 'vitest';

type RedevelopmentModule = typeof import(
  '../../scripts/generate_mainstreet_redevelopment_r4_r5.mjs'
);

interface ReportGarage {
  garageId: string;
  buildingId: string;
  accessRoute: string;
  rearSetback: number | null;
  frontGardenPreserved: boolean;
  usable: boolean;
}

interface DatabaseFeature {
  externalId: string;
  parentExternalId: string;
  kind: string;
  geometry: {
    type: string;
    minX?: number;
    minY?: number;
    minZ?: number;
    maxX?: number;
    maxY?: number;
    maxZ?: number;
    points?: Array<{ x: number; y: number; z: number }>;
    width?: number;
  };
  quality: {
    functional: { status: string };
    legibility: { status: string };
    media: { status: string };
  };
  attributes: Record<string, unknown>;
}

interface GeneratedReport {
  source: { snapshot: { sha256: string } };
  releaseDecision: { offlineGeneration: string; liveExecution: string };
  garages: {
    requested: number;
    usable: number;
    skipped: number;
    matrix: ReportGarage[];
  };
  sharedAlleys: {
    requested: number;
    complete: number;
    publicConnectionsRequired: number;
    publicConnectionsComplete: number;
    matrix: Array<{
      id: string;
      width: number;
      maximumAdjacentStep: number;
      gradeAnalysis: {
        elevationChangeCount: number;
        signReversalCount: number;
        adjacentOpposingStepPairs: number;
        oneCellPeaksOrTroughs: number;
        minimumReversalPlateauRows: number | null;
      };
      complete: boolean;
    }>;
  };
  diagnostics: {
    collisions: unknown[];
    skips: unknown[];
    operationConflicts: unknown[];
    runtimeRebase: {
      failedSequenceHazards: {
        support_dependent_plants: number;
        connected_fences: number;
        total: number;
      };
      rollbackSnapshotDivergences: {
        already_desired_air_clearance_omitted: number;
        structural_targets_rebased_from_plants_to_air: number;
        stable_spruce_leaves_distance_7: number;
        total: number;
      };
      operationCountReconciliation: {
        failedSequenceOperations: number;
        runtimeSafeOperations: number;
        omittedAlreadyDesiredAirClearance: number;
        omittedAlreadyDesiredStableScreen: number;
        netOperationReduction: number;
      };
      mitigation: {
        reactiveNeighborHazardCount: number;
      };
    };
  };
  protection: { targetedBlockEntities: unknown[] };
  acceptanceChecks: Record<string, boolean>;
  operations: {
    count: number;
    exactStateGuarded: number;
    neighborDerivedExactStateGuarded: number;
    neighborValidatedExactStateGuarded: number;
    neighborNormalizedMaterialGuarded: number;
    unguarded: number;
    alreadyDesiredNoOps: number;
    alreadyDesiredNoOpsByRole: Record<string, number>;
    runtimeSafety: {
      firstSupportMutationIndex: number;
      lastReactiveOperationIndex: number;
      allReactiveOperationsBeforeSupportMutations: boolean;
      reactiveNeighborHazardCount: number;
      reactiveNeighborHazards: unknown[];
      finiteExactStateUnionGuards: Array<{
        desired: string;
        sourceMaterial: string;
        blockEntityCapable: boolean;
        cellCount: number;
        cells: Array<{
          point: [number, number, number];
          snapshotExactSource: string;
          allowedExactSources: string[];
        }>;
      }>;
    };
  };
  rollback: { operationCount: number; exactInverse: boolean };
  databaseFeatures: DatabaseFeature[];
}

let redevelopment: RedevelopmentModule;
let plan: ReturnType<RedevelopmentModule['loadPlan']>;
let report: GeneratedReport;

const PLAN_PATH = path.resolve(
  'mainstreet-america/planning/redevelopment-r4-r5.yaml',
);
const REPORT_PATH = path.resolve(
  'data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.report.json',
);
const FORWARD_PATH = path.resolve(
  'data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.txt',
);
const ROLLBACK_PATH = path.resolve(
  'data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.rollback.txt',
);

function replLines(filename: string): string[][] {
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

beforeAll(async () => {
  redevelopment = await import(
    '../../scripts/generate_mainstreet_redevelopment_r4_r5.mjs'
  );
  plan = redevelopment.loadPlan(PLAN_PATH);
  report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8')) as GeneratedReport;
});

describe('MainStreet R4/R5 rear-alley redevelopment', () => {
  it('validates the 18-garage plan without a front-garden placement', () => {
    expect(redevelopment.validatePlan(plan)).toEqual([]);
    expect(plan.garages).toHaveLength(18);

    const protectedById = new Map(
      plan.protected_buildings.map(
        (building: { id: string; bounds: number[] }) => [
          building.id,
          building.bounds,
        ],
      ),
    );
    for (const garage of plan.garages.filter(
      (candidate: { building: string }) => candidate.building.startsWith('H'),
    )) {
      const building = protectedById.get(garage.building)!;
      expect(garage.access_route).toMatch(/^ALLEY-[WE]$/);
      if (garage.side === 'west') {
        expect(garage.bounds[1]).toBeLessThan(building[0]);
      } else {
        expect(garage.bounds[0]).toBeGreaterThan(building[1]);
      }
    }
  });

  it('defines continuous three-wide rear alleys and all five public connections', () => {
    expect(plan.shared_alleys).toHaveLength(2);
    expect(
      plan.shared_alleys.flatMap(
        (alley: { public_connections: string[] }) => alley.public_connections,
      ),
    ).toHaveLength(5);

    for (const alley of plan.shared_alleys) {
      const rows = redevelopment.expandAlleyCenterline(alley);
      expect(alley.width).toBe(3);
      expect(rows).toHaveLength(alley.z_range[1] - alley.z_range[0] + 1);
      for (let index = 1; index < rows.length; index += 1) {
        expect(rows[index].z - rows[index - 1].z).toBe(1);
        expect(
          Math.abs(rows[index].centerX - rows[index - 1].centerX),
        ).toBeLessThanOrEqual(1);
      }
    }
  });

  it('solves alley grades with no adjacent step larger than one', () => {
    const rows = [
      { z: 0, centerX: 0, surfaces: [{ y: 64 }, { y: 64 }, { y: 64 }] },
      { z: 1, centerX: 0, surfaces: [{ y: 66 }, { y: 66 }, { y: 66 }] },
      { z: 2, centerX: 0, surfaces: [{ y: 66 }, { y: 66 }, { y: 66 }] },
    ];
    const profile = redevelopment.solveAlleyGrade(
      rows,
      [{ z: 0, target_y: 64 }, { z: 2, target_y: 66 }],
      3,
      3,
    )!;

    expect(profile.map((row) => row.targetY)).toEqual([64, 65, 66]);

    const deliberateProfile = [64, 65, 65, 65, 64].map((targetY, z) => ({
      z,
      targetY,
    }));
    expect(redevelopment.analyzeGradeProfile(deliberateProfile)).toMatchObject({
      elevationChangeCount: 2,
      signReversalCount: 1,
      adjacentOpposingStepPairs: 0,
      oneCellPeaksOrTroughs: 0,
      minimumReversalPlateauRows: 2,
    });
  });

  it('records an implementation-ready GO with 18/18 garages and complete alleys', () => {
    expect(report.source.snapshot.sha256).toBe(
      '64829086424cde6f0bbf8db9166a152daf753ae2c3cf5652ba165dddc8229142',
    );
    expect(report.releaseDecision.offlineGeneration).toBe('GO');
    expect(report.releaseDecision.liveExecution).toBe(
      'IMPLEMENTATION_READY_PENDING_FRESH_SNAPSHOT_ENTITY_AND_LIVE_QA',
    );
    expect(report.garages).toMatchObject({
      requested: 18,
      usable: 18,
      skipped: 0,
    });
    expect(report.garages.matrix.every((garage) => garage.usable)).toBe(true);
    expect(
      report.garages.matrix.every((garage) => garage.frontGardenPreserved),
    ).toBe(true);
    expect(
      report.garages.matrix
        .filter((garage) => garage.buildingId.startsWith('H'))
        .every((garage) => (
          garage.accessRoute.startsWith('ALLEY-')
          && garage.rearSetback !== null
          && garage.rearSetback >= 2
        )),
    ).toBe(true);
    expect(report.sharedAlleys).toMatchObject({
      requested: 2,
      complete: 2,
      publicConnectionsRequired: 5,
      publicConnectionsComplete: 5,
    });
    expect(
      report.sharedAlleys.matrix.every((alley) => (
        alley.complete
        && alley.width === 3
        && alley.maximumAdjacentStep <= 1
        && alley.gradeAnalysis.signReversalCount <= 3
        && alley.gradeAnalysis.adjacentOpposingStepPairs === 0
        && alley.gradeAnalysis.oneCellPeaksOrTroughs === 0
        && (
          alley.gradeAnalysis.minimumReversalPlateauRows === null
          || alley.gradeAnalysis.minimumReversalPlateauRows >= 2
        )
      )),
    ).toBe(true);
    expect(report.diagnostics.collisions).toEqual([]);
    expect(report.diagnostics.skips).toEqual([]);
    expect(report.diagnostics.operationConflicts).toEqual([]);
    expect(report.protection.targetedBlockEntities).toEqual([]);
    expect(
      Object.values(report.acceptanceChecks).every((passed) => passed),
    ).toBe(true);
    expect(report.operations).toMatchObject({
      count: 5561,
      exactStateGuarded: 5561,
      neighborNormalizedMaterialGuarded: 0,
      unguarded: 0,
      alreadyDesiredNoOps: 116,
      alreadyDesiredNoOpsByRole: {
        service_screen: 116,
      },
      runtimeSafety: {
        firstSupportMutationIndex: 398,
        lastReactiveOperationIndex: 397,
        allReactiveOperationsBeforeSupportMutations: true,
        reactiveNeighborHazardCount: 0,
        reactiveNeighborHazards: [],
      },
    });
    expect(report.operations.neighborDerivedExactStateGuarded).toBeGreaterThan(0);
    expect(report.diagnostics.runtimeRebase).toMatchObject({
      failedSequenceHazards: {
        support_dependent_plants: 311,
        connected_fences: 27,
        total: 338,
      },
      rollbackSnapshotDivergences: {
        already_desired_air_clearance_omitted: 189,
        structural_targets_rebased_from_plants_to_air: 33,
        stable_spruce_leaves_distance_7: 116,
        total: 338,
      },
      operationCountReconciliation: {
        failedSequenceOperations: 5981,
        runtimeSafeOperations: 5561,
        omittedAlreadyDesiredAirClearance: 189,
        omittedAlreadyDesiredStableScreen: 116,
        netOperationReduction: 420,
      },
      mitigation: {
        reactiveNeighborHazardCount: 0,
      },
    });
  });

  it('has a unique exact-state target set and a bijective reverse-order rollback', () => {
    const forward = replLines(FORWARD_PATH);
    const rollback = replLines(ROLLBACK_PATH);
    const targetKeys = new Set(
      forward.map((parts) => parts.slice(1, 7).join(',')),
    );
    const finiteUnions = report.operations.runtimeSafety
      .finiteExactStateUnionGuards;

    expect(forward).toHaveLength(report.operations.count);
    expect(rollback).toHaveLength(forward.length);
    expect(targetKeys.size).toBe(forward.length);
    expect(report.rollback).toMatchObject({
      operationCount: forward.length,
      exactInverse: true,
    });

    for (let index = 0; index < forward.length; index += 1) {
      const source = forward[forward.length - 1 - index];
      const inverse = rollback[index];
      expect(inverse.slice(1, 7)).toEqual(source.slice(1, 7));
      expect(inverse[7]).toBe(source[8]);
      expect(splitBlockMask(source[7])).toContain(inverse[8]);
    }

    expect(
      forward.some((parts) => parts[7].includes('tall_grass')),
    ).toBe(false);
    expect(
      rollback.some((parts) => parts[8].includes('tall_grass')),
    ).toBe(false);
    expect(finiteUnions).toHaveLength(1);
    expect(finiteUnions[0]).toMatchObject({
      desired: 'minecraft:air',
      sourceMaterial: 'minecraft:birch_fence',
      blockEntityCapable: false,
      cellCount: 27,
    });
    expect(finiteUnions[0].cells).toHaveLength(27);
    const forwardByPoint = new Map(forward.map((parts) => [
      `${parts[1]},${parts[2]},${parts[3]}`,
      parts,
    ]));
    for (const cell of finiteUnions[0].cells) {
      expect(cell.allowedExactSources).toHaveLength(2);
      expect(new Set(cell.allowedExactSources).size).toBe(2);
      expect(cell.allowedExactSources).toContain(cell.snapshotExactSource);
      expect(cell.allowedExactSources.every(
        (state) => state.startsWith('minecraft:birch_fence['),
      )).toBe(true);
      const operation = forwardByPoint.get(cell.point.join(','))!;
      expect(new Set(splitBlockMask(operation[7]))).toEqual(
        new Set(cell.allowedExactSources),
      );
      const inverse = rollback.find(
        (parts) => `${parts[1]},${parts[2]},${parts[3]}`
          === cell.point.join(','),
      )!;
      expect(inverse[8]).toBe(cell.snapshotExactSource);
    }
  });

  it('exports import-ready features with exact garage parents and honest statuses', () => {
    const garages = report.databaseFeatures.filter(
      (feature) => feature.attributes.featureClass === 'garage',
    );
    const alleys = report.databaseFeatures.filter(
      (feature) => feature.attributes.featureClass === 'rear-alley',
    );

    expect(report.databaseFeatures).toHaveLength(31);
    expect(
      new Set(report.databaseFeatures.map((feature) => feature.externalId)).size,
    ).toBe(31);
    expect(
      report.databaseFeatures.every((feature) => (
        feature.geometry
        && feature.quality.functional.status.length > 0
        && feature.quality.legibility.status.length > 0
        && feature.quality.media.status.length > 0
        && !JSON.stringify(feature.quality).includes('100')
      )),
    ).toBe(true);
    expect(garages).toHaveLength(18);
    expect(alleys).toHaveLength(2);
    expect(new Set(garages.map((feature) => feature.parentExternalId)).size).toBe(18);
    for (const feature of garages) {
      expect(feature.geometry).toMatchObject({
        type: 'bounds',
      });
      expect(feature.geometry.minX).toBeLessThanOrEqual(feature.geometry.maxX!);
      expect(feature.geometry.minY).toBeLessThanOrEqual(feature.geometry.maxY!);
      expect(feature.geometry.minZ).toBeLessThanOrEqual(feature.geometry.maxZ!);
      expect(feature.quality.functional.status).toContain('live-use-pending');
      expect(feature.quality.legibility.status.length).toBeGreaterThan(0);
      expect(feature.quality.media.status).toContain('capture');
      expect(
        JSON.stringify(feature.quality).includes('100'),
      ).toBe(false);
    }
    for (const feature of alleys) {
      expect(feature.kind).toBe('road');
      expect(feature.geometry.type).toBe('path');
      expect(feature.geometry.width).toBe(3);
      expect(feature.geometry.points!.length).toBeGreaterThan(250);
    }
  });
});
