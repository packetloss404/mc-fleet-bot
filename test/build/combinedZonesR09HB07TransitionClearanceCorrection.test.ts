import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r09h_b07_transition_clearance_correction.mjs',
);
const BASENAME = 'combined-zones-r09h-b07-transition-clearance-correction';
const PACKAGE_KEY = 'b07-r09e-r09f-transition-clearance-correction';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r09h-b07-transition-clearance-correction-offline-20260822T021500Z',
);
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-r09h-clearance-'));

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
  scope: Record<string, any>;
  operations: Record<string, Record<string, unknown>>;
  preservation: Record<string, unknown>;
  safetyAudit: Record<string, any>;
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
    '--generated-at', '2026-08-22T02:15:00Z',
    '--snapshot', 'data/worldsnap-r09g-post-20260822T020232Z',
    '--intake-audit',
    'data/world-review/combined-zones-r09g-live-20260822T020232Z/post-complete-save-intake.json',
    '--source-ledger',
    'data/world-review/combined-zones-r09g-live-20260822T020232Z/evidence-ledger.json',
    '--source-qa',
    'data/world-review/combined-zones-r09g-live-20260822T020232Z/r09g-post-release-qa.json',
    '--out-dir', temporaryDirectory,
    '--entity-report', path.join(temporaryDirectory, 'immutable-entity-clearance.json'),
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstCompile = artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('CZ-R09H B07 transition-clearance correction compiler', () => {
  it('regenerates all guarded artifacts byte-for-byte', () => {
    expect(artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstCompile);
  });

  it('binds the accepted R09G post and independent QA', () => {
    expect(readManifest()).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R09G_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT',
      mvpScope: true,
      source: {
        snapshotRoot: 'data/worldsnap-r09g-post-20260822T020232Z',
        completeSaveSha256:
          '123df9eb90e212c7de7497b189f28b41ee5ca03603d4f4dee2ba6c0895dd1e00',
        regionSnapshotSha256:
          'a8ac3a94c0b5ec5167857abdabf212a8b4539b3f9ce675c3527a27fa5eec4379',
        predecessor: {
          completedReleaseIdentitySha256:
            '6777fdf8c9629c32de06ef11348da49976fa8a9143560f34b7a0890645d18bf1',
          postQaPayloadSha256:
            '601a83d4ed8bed0e5e26abd28bb7b0f44fba99554f80223a94e7f0f3ae585fe0',
        },
      },
    });
  });

  it('emits exactly two guarded air corrections and their reverse-order inverse', () => {
    const manifest = readManifest();
    const pkg = manifest.packages[0];
    const forward = parseOperations(path.join(ROOT, pkg.forward));
    const rollback = parseOperations(path.join(ROOT, pkg.rollback));
    expect(forward).toEqual([
      { point: [2108, 62, -395], fromState: 'minecraft:polished_diorite', toState: 'minecraft:air' },
      { point: [2109, 62, -395], fromState: 'minecraft:polished_diorite', toState: 'minecraft:air' },
    ]);
    expect(rollback).toEqual(forward.slice().reverse().map((operation) => ({
      point: operation.point,
      fromState: operation.toState,
      toState: operation.fromState,
    })));
    expect(manifest.target.operatedUnion).toMatchObject({
      cellCount: 2,
      coordinateSetSha256:
        '9562e3cdffe2ee63305486391b4b5758feb3bc7652e32b1e1f86f2d7a7c74e10',
    });
    expect(bodySha256(path.join(ROOT, pkg.forward)))
      .toBe(manifest.operations[PACKAGE_KEY].forwardSha256);
    expect(bodySha256(path.join(ROOT, pkg.rollback)))
      .toBe(manifest.operations[PACKAGE_KEY].rollbackSha256);
  });

  it('projects complete headroom and a floor-backed safe internal transition', () => {
    expect(readManifest().scope).toMatchObject({
      geometry: {
        projectedCompleteHeadClearance: { cellCount: 222, projectedAirCellCount: 222 },
        projectedFallBoundary: {
          cellCount: 216,
          retainedCollisionBarrierCellCount: 214,
          exactFloorBackedInternalApertureCellCount: 2,
        },
        transitionBackingFloors: { cellCount: 2 },
        transitionLowerVoid: { cellCount: 2 },
        retainedTransitionCeiling: { cellCount: 2 },
      },
      transitionSafety: {
        orderedPrimarySeamRiseHalfBlocks: 1,
        maximumFloorBackedLateralSurfaceDropBlocks: 1,
        everyClearedCellHasExactTopSlabFloorTwoBlocksBelow: true,
        everyClearedCellHasExactAirLowerVoid: true,
        everyClearedCellHasRetainedFullCubeCeiling: true,
        fallToUnflooredVoidCreated: false,
        exteriorOpeningCreated: false,
      },
    });
  });

  it('proves the narrow gravity halo without weakening safety', () => {
    expect(readManifest().safetyAudit).toMatchObject({
      halo: {
        cellCount: 36,
        coordinateSetSha256:
          '843679588329dfac67017d5e95cb3b1f401ad1605f041a5ebd72bcca497eb7a5',
      },
      targetFluidCount: 0,
      haloFluidCount: 0,
      haloGravityCount: 6,
      supportedHaloGravityCount: 6,
      unsupportedHaloGravityCount: 0,
      gravitySupportRemovalCount: 0,
      haloActiveMechanismCount: 0,
      haloBlockEntityCount: 0,
      haloSavedEntityCount: 0,
      haloProtectedRelicCount: 0,
    });
  });

  it('binds reviewed ownership and preserves every operational hold', () => {
    expect(readManifest()).toMatchObject({
      scope: {
        ownership: {
          reviewedR09fContainmentCorrectionCellCount: 2,
          reviewedR02ExcavationRestorationCellCount: 2,
          unreviewedPriorTargetIntersectionCount: 0,
        },
        operationalBoundary: {
          exactTwoCellClearanceConflictResolved: true,
          lowerWetInterfaceOpened: false,
          exteriorOpeningCreated: false,
          mechanismOrFixtureChanged: false,
          publicRouteCommissioned: false,
          fireServiceRouteCommissioned: false,
          routeCommissioningRequiresSeparateFunctionalPostAcceptance: true,
        },
      },
      preservation: { undeclaredPriorReleaseIntersectionCount: 0 },
    });
    const priorProof = readManifest().preservation.acceptedPriorReleaseTargetProof as Array<{
      transactionId: string;
    }>;
    expect(priorProof).toHaveLength(74);
    expect(priorProof.some(({ transactionId }) => (
      transactionId === 'combined-zones-r12h-b09-next-maximal-isolated-four-cell-graded-passive-rail'
    ))).toBe(false);
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

  it('seals twelve independent offline readiness checks', () => {
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'offline-qa.json'), 'utf8')))
      .toMatchObject({
        status: 'PASS_R09H_B07_TRANSITION_CLEARANCE_CORRECTION_OFFLINE_RELEASE_READY',
        manifestIdentity: readManifest().manifestIdentity,
        targetCellCount: 2,
        projectedClearanceAirCellCount: 222,
        projectedCollisionBarrierCellCount: 214,
        backedInternalApertureCellCount: 2,
        supportedHaloGravityCellCount: 6,
        summary: { checkCount: 12, passCount: 12, failCount: 0 },
        liveCallsPerformed: false,
        worldMutationPerformed: false,
      });
  });
});
