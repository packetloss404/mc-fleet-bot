import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r09g_b07_upper_route_passive_wayfinding.mjs',
);
const WRAPPER = path.join(ROOT, 'scripts/run_combined_zones_scoped_release.mjs');
const QA_SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r09g_b07_upper_route_passive_wayfinding_offline.mjs',
);
const BASENAME = 'combined-zones-r09g-b07-upper-route-passive-wayfinding';
const PACKAGE_KEY = 'b07-upper-route-passive-wall-wayfinding';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r09g-b07-upper-route-passive-wayfinding-offline-20260822T015500Z',
);
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-r09g-wayfinding-'));

interface Operation {
  point: [number, number, number];
  fromState: string;
  toState: string;
}

interface ReleaseManifest {
  schemaVersion: number;
  transactionId: string;
  status: string;
  releaseNodeId: string;
  mvpScope: boolean;
  packages: Array<{ key: string; forward: string; rollback: string }>;
  scope: {
    canonicalOwner: string;
    material: string;
    geometry: Record<string, Record<string, unknown>>;
    fixtureCadence: Record<string, unknown>;
    ownership: Record<string, unknown>;
    operationalBoundary: Record<string, boolean>;
  };
  source: Record<string, unknown> & { predecessor: Record<string, unknown> };
  target: { operatedUnion: Record<string, unknown>; desiredStateCensus: Record<string, number> };
  operations: Record<string, Record<string, unknown>>;
  preservation: Record<string, unknown>;
  safetyAudit: Record<string, unknown>;
  manifestIdentity: string;
}

const readManifest = (): ReleaseManifest => (
  JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as ReleaseManifest
);

function parseOperations(filename: string): Operation[] {
  return fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line.startsWith('REPL '))
    .map((line) => {
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
    'immutable-entity-clearance.json',
  ].map((filename) => path.join(directory, filename));
}

let firstCompile: Buffer[] = [];

beforeAll(() => {
  const args = [
    SCRIPT,
    '--generated-at', '2026-08-22T01:55:00Z',
    '--snapshot', 'data/worldsnap-combined-zones-r09f-post-20260822T013916Z',
    '--intake-audit',
    'data/world-review/combined-zones-r09f-live-20260822T013916Z/post-complete-save-intake.json',
    '--source-ledger',
    'data/world-review/combined-zones-r09f-live-20260822T013916Z/evidence-ledger.json',
    '--source-qa',
    'data/world-review/combined-zones-r09f-live-20260822T013916Z/r09f-post-release-qa.json',
    '--out-dir', temporaryDirectory,
    '--entity-report', path.join(temporaryDirectory, 'immutable-entity-clearance.json'),
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstCompile = artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R09G B07 upper-route passive wayfinding compiler', () => {
  it('regenerates all guarded artifacts byte-for-byte', () => {
    expect(artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstCompile);
  });

  it('binds the accepted R09F post, QA, release node, and MVP scope', () => {
    expect(readManifest()).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R09F_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT',
      mvpScope: true,
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r09f-post-20260822T013916Z',
        completeSaveSha256:
          'df6b887176e00a708d55e9022058781a0909df02603f91e482ed78234e1627d0',
        regionSnapshotSha256:
          'a99bf9398a1fdeb24ee9f32afc337ebac8551f5224e8387728e7e427180789f8',
        predecessor: {
          completedReleaseIdentitySha256:
            '3b9b5c0836b5c42a1e05c7b6a5efd9195015355a33bfad9697473ea5a18059f1',
          postQaPayloadSha256:
            '01c22b585864d130d3e1840d234923a6f66fbdf0fd0263ee9e13de21b47d5ed0',
        },
      },
    });
  });

  it('selects eight exact non-corner core faces at the bounded cadence', () => {
    expect(readManifest().scope).toMatchObject({
      canonicalOwner: 'Z06-PUBLIC-SHAFT-FITOUT',
      material: 'minecraft:sea_lantern',
      geometry: {
        acceptedOrderedUpperStairConstruction: {
          cellCount: 111,
          coordinateSetSha256:
            'd28444dc36da803dc74c78b363d0f8249223802f68e9883ec1e07f3f78eda894',
          cardinallyHalfStepContiguous: true,
        },
        passiveCoreFaceFixtures: {
          cellCount: 8,
          coordinateSetSha256:
            '2daad521ed5e94bea26f765fb19c394d460355315fe01e27b9b586c6e0898e87',
        },
      },
      fixtureCadence: {
        routeIndices: [1, 17, 33, 49, 65, 81, 97, 104],
        regularSixteenIndexCadence: [1, 17, 33, 49, 65, 81, 97],
        terminalSupplementIndex: 104,
        maximumRouteIndexDistanceToFixture: 8,
        maximumFixtureSpacingInIndices: 16,
        eachFixtureFacesExactClearanceCell: true,
      },
    });
  });

  it('emits eight exact core-to-light guards and their reverse-order inverse', () => {
    const manifest = readManifest();
    const pkg = manifest.packages[0];
    const forward = parseOperations(path.join(ROOT, pkg.forward));
    const rollback = parseOperations(path.join(ROOT, pkg.rollback));
    expect(forward.map(({ point }) => point)).toEqual([
      [2106, 20, -400], [2106, 28, -396], [2110, 36, -398], [2106, 44, -400],
      [2106, 52, -396], [2110, 60, -398], [2107, 66, -399], [2108, 70, -397],
    ]);
    expect(forward.every(({ fromState, toState }) => (
      fromState === 'minecraft:polished_andesite' && toState === 'minecraft:sea_lantern'
    ))).toBe(true);
    expect(rollback).toEqual(forward.slice().reverse().map((operation) => ({
      point: operation.point,
      fromState: operation.toState,
      toState: operation.fromState,
    })));
    expect(bodySha256(path.join(ROOT, pkg.forward)))
      .toBe(manifest.operations[PACKAGE_KEY].forwardSha256);
    expect(bodySha256(path.join(ROOT, pkg.rollback)))
      .toBe(manifest.operations[PACKAGE_KEY].rollbackSha256);
  });

  it('preserves enclosure, wet deck, clearance state, and the inherited two-cell hold', () => {
    expect(readManifest()).toMatchObject({
      scope: {
        geometry: {
          preservedRouteHeadClearance: {
            cellCount: 222,
            exactAirCellCount: 220,
            retainedR09fTransitionHoldCellCount: 2,
            retainedR09fTransitionHold: {
              coordinateSetSha256:
                '9562e3cdffe2ee63305486391b4b5758feb3bc7652e32b1e1f86f2d7a7c74e10',
            },
          },
          retainedOuterFallBarrier: { cellCount: 216 },
          retainedLowerWetContainmentDeck: { cellCount: 49 },
          retainedDoorlessHeadhouseWalls: { cellCount: 72 },
          retainedHeadhouseRoof: { cellCount: 49 },
          retainedFiveCellR07jInternalSeam: { cellCount: 5 },
        },
        operationalBoundary: {
          routeOrHeadroomChanged: false,
          lowerWetInterfaceOpened: false,
          exteriorOpeningCreated: false,
          publicRouteCommissioned: false,
          r09fTwoCellTransitionClearanceConflictResolved: false,
        },
      },
    });
  });

  it('proves exact reviewed ownership and a clean static halo', () => {
    expect(readManifest()).toMatchObject({
      scope: {
        ownership: {
          reviewedMigration: {
            r02ExcavationToR09eCoreCellCount: 6,
            r09eCoreToPassiveFixtureCellCount: 6,
            r09fCoreToPassiveFixtureCellCount: 2,
            unreviewedPriorTargetIntersectionCount: 0,
          },
        },
      },
      preservation: { undeclaredPriorReleaseIntersectionCount: 0 },
      safetyAudit: {
        halo: {
          cellCount: 216,
          coordinateSetSha256:
            '8cfb658c4eb8a69c13bee8af410772b2eb45c9ac074bf8738413f8d7f0d2361e',
        },
        haloFluidCount: 0,
        haloGravityCount: 0,
        haloActiveMechanismCount: 0,
        haloWoodyCount: 0,
        haloBlockEntityCount: 0,
        haloSavedEntityCount: 0,
        haloProtectedRelicCount: 0,
      },
    });
  });

  it('passes every offline gate and the real wrapper print-plan contract', () => {
    for (const [filename, status] of [
      ['manifest-qa.json', 'PASS'],
      ['forward-source-preflight.json', 'PASS'],
      ['projected-rollback-preflight.json', 'PASS'],
      ['block-entity-clearance.json', 'PASS'],
      ['immutable-entity-clearance.json', 'PASS'],
    ]) {
      expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, filename), 'utf8')))
        .toMatchObject({ status });
    }
    for (const [filename, role] of [
      ['forward-strict-dry-run.json', 'forward'],
      ['rollback-strict-dry-run.json', 'rollback'],
    ]) {
      expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, filename), 'utf8')))
        .toMatchObject({
          status: 'dry_run', strictNoop: true, operationRole: role,
          sourceOperationCount: 8, worldEditLeftoverCount: 0,
        });
    }
    const plan = JSON.parse(execFileSync(process.execPath, [
      WRAPPER,
      '--manifest', `data/buildops/${BASENAME}.release-manifest.json`,
      '--release-node', 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT',
      '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8' })) as Record<string, unknown>;
    expect(plan).toEqual(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'wrapper-plan.json'), 'utf8')));
  });

  it('seals a deterministic 12/12 offline release-ready result', () => {
    const result = JSON.parse(execFileSync(process.execPath, [QA_SCRIPT], {
      cwd: ROOT,
      encoding: 'utf8',
    })) as Record<string, unknown>;
    expect(result).toMatchObject({
      status: 'PASS_R09G_B07_UPPER_STAIR_PASSIVE_WAYFINDING_OFFLINE_RELEASE_READY',
      checks: { checkCount: 12, passCount: 12, failCount: 0 },
    });
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'offline-qa.json'), 'utf8')))
      .toMatchObject({
        manifestIdentity: '4df5a9df25c56e4c0145e0a566354ecbd8d489fdde00cd585000c8328ebc67bb',
        targetCellCount: 8,
        clearanceCellCount: 222,
        clearanceAirCellCount: 220,
        inheritedTransitionHoldCellCount: 2,
        liveCallsPerformed: false,
        worldMutationPerformed: false,
      });
  });
});
