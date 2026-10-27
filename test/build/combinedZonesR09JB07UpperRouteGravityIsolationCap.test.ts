import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r09j_b07_upper_route_gravity_isolation_cap.mjs',
);
const BASENAME = 'combined-zones-r09j-b07-upper-route-gravity-isolation-cap';
const PACKAGE_KEY = 'b07-upper-route-gravity-isolation-cap';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r09j-b07-upper-route-gravity-isolation-cap-offline-20260822T023500Z',
);
const BLOCKER = path.join(
  ROOT,
  'data/world-review/combined-zones-r09h-live-20260822T022248Z/r09i-b07-enclosed-dry-upper-route-commissioning-blocker.json',
);
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-r09j-cap-'));

interface Operation {
  point: [number, number, number];
  fromState: string;
  toState: string;
}

interface Manifest {
  schemaVersion: number;
  transactionId: string;
  status: string;
  releaseNodeId: string;
  mvpScope: boolean;
  packages: Array<{ key: string; forward: string; rollback: string }>;
  source: Record<string, unknown> & { predecessor: Record<string, unknown> };
  target: { operatedUnion: Record<string, unknown>; desiredStateCensus: Record<string, number> };
  scope: Record<string, Record<string, unknown> | unknown>;
  operations: Record<string, Record<string, unknown>>;
  preservation: Record<string, unknown>;
  safetyAudit: Record<string, unknown>;
  manifestIdentity: string;
}

const readManifest = (): Manifest => JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as Manifest;

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
    '--generated-at', '2026-08-22T02:35:00Z',
    '--snapshot', 'data/worldsnap-r09h-post-20260822T022248Z',
    '--intake-audit',
    'data/world-review/combined-zones-r09h-live-20260822T022248Z/post-complete-save-intake.json',
    '--source-ledger',
    'data/world-review/combined-zones-r09h-live-20260822T022248Z/evidence-ledger.json',
    '--source-qa',
    'data/world-review/combined-zones-r09h-live-20260822T022248Z/r09h-post-release-qa.json',
    '--commissioning-blocker',
    'data/world-review/combined-zones-r09h-live-20260822T022248Z/r09i-b07-enclosed-dry-upper-route-commissioning-blocker.json',
    '--out-dir', temporaryDirectory,
    '--entity-report', path.join(temporaryDirectory, 'immutable-entity-clearance.json'),
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstCompile = artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('CZ-R09J B07 upper-route gravity-isolation cap compiler', () => {
  it('regenerates every guarded artifact byte-for-byte', () => {
    expect(artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstCompile);
  });

  it('binds accepted R09H post QA and the exact R09I blocker', () => {
    expect(readManifest()).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R09H_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT',
      mvpScope: true,
      source: {
        snapshotRoot: 'data/worldsnap-r09h-post-20260822T022248Z',
        completeSaveSha256:
          'ed08a563a3cbe2d450db735b21e0d8b644938f8044e2773fd71a61b20eaff684',
        regionSnapshotSha256:
          'e3690299faa02ae153600028e1b276e1b6bdd844aff0a6037798be3b13484b8b',
        predecessor: {
          completedReleaseIdentitySha256:
            'dd404c710c3f05caa1908afd5f8c38ca95360c8e03a9612f97199329d152dfd5',
          postQaPayloadSha256:
            '798da0552e482a230f98047b36be294b936ae96d8c3ef1c29ee2a36038ef1a47',
          commissioningBlockerIdentitySha256:
            'e05264b91ddf7dbeb5b4247a443ca22b94907bbacf12a602e67c2e81f31b751b',
        },
      },
    });
    expect(JSON.parse(fs.readFileSync(BLOCKER, 'utf8'))).toMatchObject({
      status: 'BLOCKED_R09I_FULL_B07_UPPER_ROUTE_UNSUPPORTED_GRAVITY_BOUNDARY',
      exactBlocker: {
        class: 'INHERITED_FLOATING_GRAVEL_IN_ROUTE_FALL_BOUNDARY',
        affectedStairIndex: 19,
        fullRouteCommissioned: false,
      },
    });
  });

  it('emits exactly two air-to-diorite guards and their reverse-order inverse', () => {
    const manifest = readManifest();
    const pkg = manifest.packages[0];
    const forward = parseOperations(path.join(ROOT, pkg.forward));
    const rollback = parseOperations(path.join(ROOT, pkg.rollback));
    expect(forward).toEqual([
      { point: [2105, 30, -397], fromState: 'minecraft:air', toState: 'minecraft:polished_diorite' },
      { point: [2105, 31, -397], fromState: 'minecraft:air', toState: 'minecraft:polished_diorite' },
    ]);
    expect(rollback).toEqual(forward.slice().reverse().map((operation) => ({
      point: operation.point,
      fromState: operation.toState,
      toState: operation.fromState,
    })));
    expect(manifest.target).toMatchObject({
      operatedUnion: {
        cellCount: 2,
        coordinateSetSha256:
          '6433ef6a7b50624b39806d156a25bb11fdfe9beef03c494136b5d5fd2d1d163b',
      },
      desiredStateCensus: { 'minecraft:polished_diorite': 2 },
    });
    expect(bodySha256(path.join(ROOT, pkg.forward)))
      .toBe(manifest.operations[PACKAGE_KEY].forwardSha256);
    expect(bodySha256(path.join(ROOT, pkg.rollback)))
      .toBe(manifest.operations[PACKAGE_KEY].rollbackSha256);
  });

  it('proves the cap partitions a supported 91-surface upper segment', () => {
    expect(readManifest().scope).toMatchObject({
      geometry: {
        blockedStairIndex: 20,
        excludedUnsupportedBoundaryStairIndex: 19,
        retainedUpperStairIndexRange: { min: 21, max: 110, stairCellCount: 90 },
        retainedUpperRouteWithHeadhouseHold: { cellCount: 91 },
        retainedUpperHeadClearance: { cellCount: 182 },
        retainedUpperFallBoundary: { cellCount: 174 },
      },
      isolationProof: {
        reachableUpperSurfaceCount: 91,
        reachableExcludedLowerSurfaceCount: 0,
        capTargetIntersectionWithUpperClearanceCount: 0,
        upperBoundaryGravityCellCount: 8,
        unsupportedUpperBoundaryGravityCellCount: 0,
      },
    });
  });

  it('leaves the floating gravel and every gravity support untouched', () => {
    expect(readManifest()).toMatchObject({
      preservation: {
        reviewedR02AirReservationRestoration: { cellCount: 2 },
        undeclaredPriorReleaseIntersectionCount: 0,
        unsupportedGravityTargetIntersectionCount: 0,
        unsupportedGravitySupportCellTargetIntersectionCount: 0,
        faceAdjacentGravityCellCount: 0,
      },
      safetyAudit: {
        halo: { cellCount: 36 },
        targetFluidCount: 0,
        haloFluidCount: 0,
        haloGravityCount: 3,
        faceAdjacentGravityCount: 0,
        gravitySupportRemovalCount: 0,
        haloActiveMechanismCount: 0,
        haloBlockEntityCount: 0,
        haloSavedEntityCount: 0,
        targetProtectedRelicCount: 0,
        exactAirToFullCubeContainmentOnly: true,
        rollbackRestoresAirWithoutRemovingGravitySupport: true,
      },
    });
    expect(readManifest().preservation.inheritedUnsupportedBoundaryCells)
      .toHaveLength(2);
  });

  it('retains every operational hold until post-release functional acceptance', () => {
    expect(readManifest().scope).toMatchObject({
      operationalBoundary: {
        fullUpperRouteCommissioned: false,
        retainedUpperSegmentCommissioned: false,
        postReleaseFunctionalCommissioningRequired: true,
        lowerWetInterfaceOpened: false,
        exteriorOpeningCreated: false,
        publicRouteCommissioned: false,
        fireServiceRouteCommissioned: false,
        mechanismOrFixtureChanged: false,
        unsupportedGravityTouchedOrSupported: false,
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
    const manifestQa = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'manifest-qa.json'), 'utf8'));
    expect(manifestQa.manifest.sha256)
      .toBe(crypto.createHash('sha256').update(fs.readFileSync(MANIFEST)).digest('hex'));
    for (const filename of ['forward-strict-dry-run.json', 'rollback-strict-dry-run.json']) {
      expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, filename), 'utf8')))
        .toMatchObject({ status: 'dry_run', strictNoop: true, sourceOperationCount: 2 });
    }
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'wrapper-plan.json'), 'utf8')))
      .toMatchObject({
        mode: 'PREPARE_ONLY',
        packageOrder: [PACKAGE_KEY],
        globalGateDependency: 'NONE',
      });
  });

  it('seals all twelve readiness checks without a premature commissioning claim', () => {
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'offline-qa.json'), 'utf8')))
      .toMatchObject({
        status: 'PASS_R09J_B07_UPPER_ROUTE_GRAVITY_ISOLATION_CAP_OFFLINE_RELEASE_READY',
        manifestIdentity: readManifest().manifestIdentity,
        targetCellCount: 2,
        retainedUpperSurfaceCount: 91,
        retainedUpperClearanceCellCount: 182,
        retainedUpperBoundaryCellCount: 174,
        supportedUpperBoundaryGravityCellCount: 8,
        summary: { checkCount: 12, passCount: 12, failCount: 0 },
        operationalBoundary: {
          fullUpperRouteCommissioned: false,
          retainedUpperSegmentCommissioned: false,
        },
        liveCallsPerformed: false,
        worldMutationPerformed: false,
      });
  });
});
