import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'combined-zones-r11k-c1-west-disjoint-at-grade-batch-1142-1145-1172';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const MANIFEST = path.join(BUILDOPS, `${BASENAME}.release-manifest.json`);
const INVENTORY = path.join(
  ROOT,
  'data/world-review/combined-zones-r11k-west-at-grade-closure-inventory-20260822T044500Z.json',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r11k-offline-20260822T050000Z',
);
const CANONICAL_QA = path.join(EVIDENCE, 'r11k-offline-qa.json');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-r11k-'));
const artifactNames = [
  `${BASENAME}.release-manifest.json`,
  `${BASENAME}.c1-west-at-grade-1142-1145.forward.txt`,
  `${BASENAME}.c1-west-at-grade-1142-1145.rollback.txt`,
  `${BASENAME}.c1-west-at-grade-1172.forward.txt`,
  `${BASENAME}.c1-west-at-grade-1172.rollback.txt`,
];

type Manifest = {
  manifestIdentity: string;
  mvpScope: boolean;
  releaseNodeId: string;
  packages: Array<{ key: string }>;
  controlBindings: { releaseContract: { sha256: string } };
  scope: {
    includedScopes: Array<Record<string, unknown>>;
    combinedPavementSurface: { cellCount: number };
    combinedFullTwoBlockHeadroom: { cellCount: number };
    combinedInteractionHalo: { cellCount: number };
    interactionDisjointness: Record<string, unknown>;
    routeCommissioned: boolean;
  };
  target: {
    operatedUnion: { cellCount: number; coordinateSetSha256: string };
    interactionHalo: { cellCount: number; coordinateSetSha256: string };
  };
};

let manifest: Manifest;

beforeAll(() => {
  execFileSync(process.execPath, [
    'scripts/compile_combined_zones_r11k_c1_west_disjoint_at_grade_batch.mjs',
    '--out-dir', temporaryDirectory,
    '--generated-at', '2026-08-22T04:55:00Z',
  ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
  manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as Manifest;
});

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('CZ-R11K C1 west disjoint at-grade batch', () => {
  it('reproduces all five artifacts byte-for-byte under the doc-locked contract', () => {
    for (const name of artifactNames) {
      expect(fs.readFileSync(path.join(temporaryDirectory, name)))
        .toEqual(fs.readFileSync(path.join(BUILDOPS, name)));
    }
    expect(crypto.createHash('sha256').update(fs.readFileSync(MANIFEST)).digest('hex'))
      .toBe('626492caa4467beae7240f6dae106adebe4618c7e0fa74cd03361920ec81295f');
    expect(manifest.manifestIdentity)
      .toBe('2ca63578e12f18b1f3086403bae522b7fac16fc7da43b92c88309fa97759182d');
    expect(manifest.controlBindings.releaseContract.sha256)
      .toBe('0e13f4ca6a66eb5e61cb51f8845acfb0b0e7194480adeb813c2e474d2e8faa47');
  });

  it('reproduces the source-bound whole-west inventory byte-for-byte', () => {
    const out = path.join(temporaryDirectory, 'inventory.json');
    execFileSync(process.execPath, [
      'scripts/inventory_combined_zones_r11k_c1_west_at_grade_closures.mjs',
      '--out', out,
      '--generated-at', '2026-08-22T04:45:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
    expect(fs.readFileSync(out)).toEqual(fs.readFileSync(INVENTORY));
    expect(JSON.parse(fs.readFileSync(out, 'utf8'))).toMatchObject({
      status: 'SOURCE_PROVEN_DISJOINT_BATCH_SELECTED',
      inventoryPayloadSha256:
        '70824c8a344f73ef4072f5e6057d4c14adedc614524431fc503ed0303c740b2d',
      scope: {
        recommendedBatch: {
          operatedUnion: { cellCount: 336 },
          haloUnion: { cellCount: 1_883 },
          exactInteractionDisjoint: true,
          targetIntersectionCount: 0,
          haloIntersectionCount: 0,
        },
      },
    });
  }, 30_000);

  it('freezes the exact two-scope physical geometry and exclusions', () => {
    expect(manifest).toMatchObject({
      mvpScope: true,
      releaseNodeId: 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR',
      scope: {
        includedScopes: [
          {
            stations: { start: 1142, end: 1145, count: 4 },
            pavementSurface: { cellCount: 84 },
            exactFoundationFill: { cellCount: 105 },
            exactHeadroomCuts: { cellCount: 31 },
            fullTwoBlockHeadroom: { cellCount: 168 },
            leafStabilizationTransitions: { cellCount: 49 },
            operatedUnion: { cellCount: 269 },
            interactionHalo: { cellCount: 1_370 },
          },
          {
            stations: { start: 1172, end: 1172, count: 1 },
            pavementSurface: { cellCount: 27 },
            exactFoundationFill: { cellCount: 0 },
            exactHeadroomCuts: { cellCount: 40 },
            fullTwoBlockHeadroom: { cellCount: 54 },
            leafStabilizationTransitions: { cellCount: 0 },
            operatedUnion: { cellCount: 67 },
            interactionHalo: { cellCount: 513 },
          },
        ],
        combinedPavementSurface: { cellCount: 111 },
        combinedFullTwoBlockHeadroom: { cellCount: 222 },
        combinedInteractionHalo: { cellCount: 1_883 },
        routeCommissioned: false,
      },
      target: {
        operatedUnion: {
          cellCount: 336,
          coordinateSetSha256:
            'fa399c790649c52c8d7b7051be63a72f50bbe662184023a596751e60e3683005',
        },
        interactionHalo: {
          cellCount: 1_883,
          coordinateSetSha256:
            '5b548cad659c5292ff23743a8110f31a9b93d8881624f4937f6fe990e6cf73a8',
        },
      },
    });
    expect(manifest.packages).toHaveLength(2);
  }, 30_000);

  it('reproduces independent offline QA and all substantive claims', () => {
    const out = path.join(temporaryDirectory, 'qa.json');
    const md = path.join(temporaryDirectory, 'qa.md');
    execFileSync(process.execPath, [
      'scripts/qa_combined_zones_r11k_c1_west_disjoint_at_grade_batch_offline.mjs',
      '--manifest', MANIFEST,
      '--evidence-dir', EVIDENCE,
      '--out', out,
      '--md-out', md,
      '--generated-at', '2026-08-22T05:00:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
    expect(fs.readFileSync(out)).toEqual(fs.readFileSync(CANONICAL_QA));
    expect(JSON.parse(fs.readFileSync(out, 'utf8'))).toMatchObject({
      status: 'PASS',
      qaPayloadSha256:
        '1c3719acf3239ea1696c347212d7513aa8831f910e7873fce5f8a19b89b33a8f',
      checks: {
        exactSourceGuardMatchCount: 336,
        exactInverseRecordCount: 336,
        pavementSurfaceCellCount: 111,
        walkableSurfaceComponentCountPerScope: [1, 1],
        maximumWalkableSurfaceStepPerScope: [1, 1],
        routeSpineCellCountPerScope: [9, 3],
        routeSpineComponentCountPerScope: [1, 1],
        stationCenterlineCellCountPerScope: [4, 1],
        stationCenterlineMaximumStepPerScope: [1, 0],
        rawPlanAdjacentElevationDeltaPerScope: [2, 1],
        nonRouteTwoBlockLateralContactCountPerScope: [1, 0],
        stableSurfaceCellCount: 111,
        exactFoundationFillCount: 105,
        headroomCutCount: 71,
        fullHeadroomAirCount: 222,
        leafStabilizationTransitionCount: 49,
        interactionHaloCellCount: 1_883,
        crossPackageTargetIntersectionCount: 0,
        crossPackageHaloIntersectionCount: 0,
        haloFluidCount: 0,
        haloForbiddenBlockCount: 0,
        savedEntityConflictCount: 0,
        priorIntersectionCount: 0,
        reservationIntersectionCount: 0,
      },
      routeUsability: {
        proof: 'SUCCESSIVE_STATION_CENTERLINE_AND_THREE_CELL_SPINE_MAX_STEP_ONE',
        excludedRawPlanAdjacencies: [{
          left: { x: 1475, y: 67, z: -197, station: 1142, offset: -5 },
          right: { x: 1476, y: 65, z: -198, station: 1144, offset: -4 },
          stationDelta: 2,
          offsetDelta: 1,
          classification: 'CURVE_GENERATED_NON_ROUTE_LATERAL_CONTACT',
          bothOutsideThreeCellRouteSpine: true,
          successiveStationProgression: false,
        }],
      },
    });
  });

  it('passes manifest, preflight, parser, block-entity, and wrapper contracts', () => {
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'manifest-qa.json'), 'utf8')))
      .toMatchObject({ status: 'PASS', totals: { packages: 2, uniqueTargetCells: 336 } });
    for (const name of [
      'west-1142-1145-forward-source-preflight.json',
      'west-1172-forward-source-preflight.json',
      'west-1172-projected-rollback-preflight.json',
      'west-1142-1145-projected-rollback-preflight.json',
    ]) expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, name), 'utf8')))
      .toMatchObject({ status: 'PASS' });
    for (const name of [
      'west-1142-1145-forward-strict-dry-run.json',
      'west-1172-forward-strict-dry-run.json',
      'west-1172-rollback-strict-dry-run.json',
      'west-1142-1145-rollback-strict-dry-run.json',
    ]) expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, name), 'utf8')))
      .toMatchObject({ status: 'dry_run', strictNoop: true });
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'block-entity-clearance.json'), 'utf8')))
      .toMatchObject({ status: 'PASS', blockingBlockEntityCount: 0 });
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'wrapper-print-plan.json'), 'utf8')))
      .toMatchObject({
        mode: 'PREPARE_ONLY', globalGateDependency: 'NONE',
        packageOrder: manifest.packages.map(({ key }) => key),
      });
  });
});
