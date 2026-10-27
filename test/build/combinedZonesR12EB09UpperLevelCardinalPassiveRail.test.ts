import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const COMPILER = path.join(
  ROOT,
  'scripts/compile_combined_zones_r12e_b09_upper_level_cardinal_passive_rail.mjs',
);
const QA = path.join(
  ROOT,
  'scripts/qa_combined_zones_r12e_b09_upper_level_cardinal_passive_rail_offline.mjs',
);
const WRAPPER = path.join(ROOT, 'scripts/run_combined_zones_scoped_release.mjs');
const BASENAME = 'combined-zones-r12e-b09-isolated-upper-level-cardinal-passive-rail';
const PACKAGE_KEY = 'b09-isolated-upper-level-cardinal-passive-rail';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r12e-b09-upper-level-cardinal-passive-rail-offline-20260822T011000Z',
);
const CANONICAL_QA = path.join(EVIDENCE, 'r12e-offline-readiness.json');
const CANONICAL_QA_MD = path.join(EVIDENCE, 'r12e-offline-readiness.md');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-r12e-rail-'));
const temporaryQa = path.join(temporaryDirectory, 'r12e-offline-readiness.json');
const temporaryQaMarkdown = path.join(temporaryDirectory, 'r12e-offline-readiness.md');

interface Manifest {
  manifestIdentity: string;
  status: string;
  releaseNodeId: string;
  mvpScope: boolean;
  packages: Array<{ key: string; forward: string; rollback: string }>;
  scope: Record<string, unknown> & {
    geometry: Record<string, { cellCount: number; coordinateSetSha256: string }>;
    selection: Record<string, number | string | boolean>;
    failSafeState: Record<string, boolean | string>;
  };
  source: Record<string, unknown> & { predecessor: Record<string, unknown> };
  operations: Record<string, Record<string, number | string | boolean>>;
  remainingRailDatumInventory: Record<string, unknown> & {
    turnCells: { cellCount: number; coordinateSetSha256: string };
    verticalTransitionLowerCells: { cellCount: number; coordinateSetSha256: string };
    remainingMultiCellLevelRuns: Array<Record<string, number | string | boolean>>;
    selectedUniqueLargestRun: Record<string, number | string | boolean>;
  };
  preservation: Record<string, unknown>;
  safetyAudit: Record<string, unknown>;
  blockedRailClasses: Record<string, unknown>;
}

interface Operation {
  point: [number, number, number];
  fromState: string;
  toState: string;
}

const readManifest = (): Manifest => JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as Manifest;
const readQa = (): Record<string, unknown> => JSON.parse(fs.readFileSync(CANONICAL_QA, 'utf8')) as Record<string, unknown>;
function parseOperations(filename: string): Operation[] {
  return fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line.startsWith('REPL ')).map((line) => {
      const fields = line.split(/\s+/);
      expect(fields).toHaveLength(9);
      const point = fields.slice(1, 4).map(Number) as [number, number, number];
      expect(fields.slice(4, 7).map(Number)).toEqual(point);
      return { point, fromState: fields[7], toState: fields[8] };
    });
}
function bodySha256(filename: string): string {
  const body = `${fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
  return crypto.createHash('sha256').update(body).digest('hex');
}
function artifactPaths(directory: string): string[] {
  return [
    `${BASENAME}.${PACKAGE_KEY}.forward.txt`,
    `${BASENAME}.${PACKAGE_KEY}.rollback.txt`,
    `${BASENAME}.release-manifest.json`,
  ].map((filename) => path.join(directory, filename));
}

let firstCompile: Buffer[] = [];
beforeAll(() => {
  const args = [
    COMPILER, '--generated-at', '2026-08-22T01:10:00Z',
    '--snapshot', 'data/worldsnap-combined-zones-r12d-post-20260822T005835Z',
    '--intake-audit',
    'data/world-review/combined-zones-r12d-live-20260822T005835Z/post-complete-save-intake.json',
    '--source-ledger',
    'data/world-review/combined-zones-r12d-live-20260822T005835Z/evidence-ledger.json',
    '--out-dir', temporaryDirectory,
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstCompile = artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  execFileSync(process.execPath, [
    QA, '--generated-at', '2026-08-22T01:10:00Z',
    '--out', temporaryQa, '--markdown', temporaryQaMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);
afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('CZ-R12E isolated upper level-cardinal passive rail', () => {
  it('regenerates compiler and QA artifacts deterministically', () => {
    expect(artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstCompile);
    expect(fs.readFileSync(temporaryQa)).toEqual(fs.readFileSync(CANONICAL_QA));
    expect(fs.readFileSync(temporaryQaMarkdown)).toEqual(fs.readFileSync(CANONICAL_QA_MD));
  });

  it('binds the accepted R12D terminal and post QA', () => {
    expect(readManifest()).toMatchObject({
      manifestIdentity: 'e70ac090697d8741c82ed445dd02f26d39255b523d49048bc8d80d2106d5d576',
      status:
        'COMPILED_R12E_ISOLATED_UPPER_LEVEL_CARDINAL_PASSIVE_RAIL_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING',
      mvpScope: true,
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r12d-post-20260822T005835Z',
        completeSaveSha256:
          '87966eef0a9e3ca695820f521ca2311c01ad7d6b199ee6ef57c6201cc97ee804',
        regionSnapshotSha256:
          '28ccb2dd338522e98e2a734d91670c3eb5f52a1adfc695584ba3286f6d8a90f6',
        predecessor: {
          completedReleaseIdentitySha256:
            '97ff44527f857241316f425e563f639bea1c96b52b9b839f1e77089a04b225b2',
          postQaPayloadSha256:
            '56aceba3fa84b1a6508398daf2a34269aee2a992e3fc205dbc0306ad73ac1a4a',
        },
      },
    });
  });

  it('enumerates the remaining datum and selects its unique largest isolated run', () => {
    expect(readManifest()).toMatchObject({
      remainingRailDatumInventory: {
        turnCells: {
          cellCount: 3,
          coordinateSetSha256:
            'e7a5d7a677a739f95f4ed7f07bcd30b272b60d487f3888a43a120545be072151',
        },
        verticalTransitionLowerCells: {
          cellCount: 174,
          coordinateSetSha256:
            'b40a9549a923bbcc832732f522cb03d790980090636a9c0758fbcf8f1741bb16',
        },
        independentlyIsolatedRunCount: 1,
        selectedUniqueLargestRun: {
          firstCenterlineIndex: 420,
          lastCenterlineIndex: 499,
          cellCount: 80,
          axis: 'X',
          y: 246,
          hasLeftAirGap: true,
          hasRightAirGap: true,
        },
        rejectedLowerStationRun: {
          firstCenterlineIndex: 0,
          lastCenterlineIndex: 8,
          cellCount: 9,
          hasLeftAirGap: false,
          hasRightAirGap: false,
        },
      },
      blockedRailClasses: {
        nontrivialIsolatedLevelCardinalRunRemainingAfterThisPackage: false,
      },
    });
  });

  it('emits 80 exact east-west guards and their reverse-order inverse', () => {
    const manifest = readManifest();
    const pkg = manifest.packages[0];
    const forward = parseOperations(path.join(ROOT, pkg.forward));
    const rollback = parseOperations(path.join(ROOT, pkg.rollback));
    expect(forward.map(({ point }) => point)).toEqual(
      Array.from({ length: 80 }, (_, index) => [2049 + index, 246, -768]),
    );
    expect(forward.every(({ fromState, toState }) => fromState === 'minecraft:air'
      && toState === 'minecraft:rail[shape=east_west,waterlogged=false]')).toBe(true);
    expect(rollback).toEqual(forward.slice().reverse().map((operation) => ({
      point: operation.point, fromState: operation.toState, toState: operation.fromState,
    })));
    expect(bodySha256(path.join(ROOT, pkg.forward)))
      .toBe(String(manifest.operations[PACKAGE_KEY].forwardSha256));
    expect(bodySha256(path.join(ROOT, pkg.rollback)))
      .toBe(String(manifest.operations[PACKAGE_KEY].rollbackSha256));
  });

  it('proves support, isolation, hazard/entity clearance, and prior preservation', () => {
    expect(readManifest()).toMatchObject({
      scope: {
        geometry: {
          selectedUpperLevelCardinalRail: {
            cellCount: 80,
            coordinateSetSha256:
              '71956640b587c6e2b749b168a8c6fe39638c766f323aac657c2f3e95d367456f',
          },
          exactSupport: { cellCount: 80 },
          retainedHeadroom: { cellCount: 80 },
          retainedIsolationGaps: { cellCount: 2 },
          preservedR12cRail: { cellCount: 231 },
          preservedR12dRail: { cellCount: 19 },
        },
        selection: {
          firstCenterlineIndex: 420,
          lastCenterlineIndex: 499,
          excludedVerticalTransitionLowerIndex: 419,
          excludedTurnIndex: 500,
        },
      },
      safetyAudit: {
        halo: { cellCount: 738 },
        haloFluidCount: 0,
        haloGravityCount: 0,
        haloExistingMechanismCount: 0,
        haloContainerOrControlCount: 0,
        haloBlockEntityCount: 0,
        haloSavedEntityCount: 0,
        haloProtectedRelicCount: 0,
        exactSolidSupportCount: 80,
        exactAirHeadroomCount: 80,
        railUpdateDeterminism: {
          straightSingleAxis: true,
          branchCount: 0,
          cardinalAdjacencyToPriorRailCount: 0,
        },
      },
      preservation: { undeclaredPriorReleaseIntersectionCount: 0 },
    });
  });

  it('passes every offline gate and the real wrapper prepare-only path', () => {
    expect(readQa()).toMatchObject({
      status: 'PASS_R12E_ISOLATED_UPPER_LEVEL_CARDINAL_PASSIVE_RAIL_OFFLINE_READY',
      readinessPayloadSha256:
        'bee7699cbae40d5e2575bb220db884e113fad8f112000b843b9a37dc8689c6a1',
      result: {
        targetCellCount: 80,
        forwardPreflightPassed: 80,
        projectedRollbackPreflightPassed: 80,
        savedEntityIntersectionCount: 0,
        blockEntityIntersectionCount: 0,
        wrapperMode: 'PREPARE_ONLY',
      },
      railDatumDisposition: {
        nontrivialIsolatedLevelCardinalRunRemainingAfterPackage: false,
      },
      summary: { passed: true, checkCount: 15, passCount: 15, failCount: 0 },
    });
    const plan = JSON.parse(execFileSync(process.execPath, [
      WRAPPER, '--manifest', MANIFEST,
      '--release-node', 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING', '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })) as {
      mode: string; globalGateDependency: string; packageOrder: string[]; stages: string[];
    };
    expect(plan).toMatchObject({
      mode: 'PREPARE_ONLY', globalGateDependency: 'NONE', packageOrder: [PACKAGE_KEY],
    });
    expect(plan.stages).toHaveLength(10);
  });
});
