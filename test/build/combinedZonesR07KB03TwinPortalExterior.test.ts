import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r07k_b03_twin_portal_exterior.mjs',
);
const BASENAME = 'combined-zones-r07k-b03-twin-portal-exterior';
const PACKAGE_KEY = 'b03-twin-portal-collars';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r07k-portal-exterior-'),
);

interface ExactSet {
  cellCount: number;
  coordinateSetSha256: string;
  componentCount?: number;
  componentSizes?: number[];
}

interface ReleaseManifest {
  schemaVersion: number;
  transactionId: string;
  status: string;
  releaseNodeId: string;
  scopeIds: string[];
  packages: Array<{ key: string; forward: string; rollback: string }>;
  scope: {
    canonicalOwner: string;
    material: string;
    geometry: Record<string, ExactSet & Record<string, unknown>>;
    ownership: Record<string, unknown> & {
      historicalB03ConstructionIntersectionCount: number;
      historicalB03InteractionIntersectionCount: number;
      namedReviewedExtension: Record<string, unknown> & {
        id: string;
        operatedCells: ExactSet;
        priorTargetIntersectionCount: number;
        everyTargetFaceConnectedToAcceptedPortalFabric: boolean;
      };
    };
    operationalBoundary: Record<string, boolean>;
  };
  source: Record<string, unknown> & {
    snapshotRoot: string;
    completeSaveSha256: string;
    regionSnapshotSha256: string;
    predecessor: Record<string, unknown>;
    disjointRebaseProof: Record<string, number | string | ExactSet>;
  };
  target: {
    operatedUnion: ExactSet;
    sourceStateCensus: Record<string, number>;
    desiredStateCensus: Record<string, number>;
  };
  operations: Record<string, {
    forwardSha256: string;
    rollbackSha256: string;
    forwardCommandCount: number;
    rollbackCommandCount: number;
    targetCellCount: number;
    targetCoordinateSetSha256: string;
    exactInverse: boolean;
    oneCellGuards: boolean;
  }>;
  preservation: Record<string, unknown> & {
    acceptedPriorReleaseTargetIntersectionCount: number;
    acceptedPriorReleaseTargetProof: Array<{ targetIntersectionCount: number }>;
  };
  safetyAudit: Record<string, number | boolean | ExactSet>;
  safetyBoundary: Record<string, boolean>;
  manifestIdentity: string;
}

interface Operation {
  point: [number, number, number];
  fromState: string;
  toState: string;
}

const readManifest = (filename = MANIFEST): ReleaseManifest => (
  JSON.parse(fs.readFileSync(filename, 'utf8')) as ReleaseManifest
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
  ].map((filename) => path.join(directory, filename));
}

let firstCompile: Buffer[] = [];

beforeAll(() => {
  const args = [
    SCRIPT,
    '--generated-at', '2026-08-21T19:48:00Z',
    '--snapshot', 'data/worldsnap-combined-zones-r08t-post-20260821T194152Z',
    '--intake-audit',
    'data/world-review/combined-zones-r08t-live-20260821T194152Z/post-complete-save-intake.json',
    '--source-ledger',
    'data/world-review/combined-zones-r08t-live-20260821T194152Z/evidence-ledger.json',
    '--out-dir', temporaryDirectory,
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstCompile = artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R07K B03 twin portal exterior', () => {
  it('regenerates its guarded package and manifest deterministically', () => {
    expect(artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstCompile);
  });

  it('binds the latest accepted R08T post and proves the R07J portal prism unchanged', () => {
    expect(readManifest()).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      status: 'COMPILED_FROM_LATEST_ACCEPTED_R08T_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
      scopeIds: ['P1-B03-PORTAL-EXTERIOR'],
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r08t-post-20260821T194152Z',
        completeSaveSha256:
          'fcde819dd413b3ec9920d56c81c797d56a92b7f66c0f4216cdbcad23451adbec',
        regionSnapshotSha256:
          '42001ae747a852e64aead34dcdcfa67b5c22dd45ba25cd49385b633b40155023',
        predecessor: {
          transactionId: 'combined-zones-r08t-empty-eight-south-smoke-boundary',
          completedReleaseIdentitySha256:
            '0ad2b587ea12f84e1490ce7b32d4a2946e9c593544d05994e9b6dd476630ed8f',
        },
        disjointRebaseProof: {
          baseline: 'R07J_POST',
          terminal: 'R08T_POST',
          reviewPrism: { cellCount: 1560 },
          baselineBlockStateSetSha256:
            '1e5832df51ffa74b75d476ffd65d04ba4a0306cd574a7eea4241674dd62fa5bf',
          terminalBlockStateSetSha256:
            '1e5832df51ffa74b75d476ffd65d04ba4a0306cd574a7eea4241674dd62fa5bf',
          mismatchCount: 0,
        },
      },
    });
  });

  it('builds two supported connected 36-cell collars around two preserved apertures', () => {
    const manifest = readManifest();
    expect(manifest.scope.geometry).toMatchObject({
      northPortalCollar: { cellCount: 36, componentCount: 1, componentSizes: [36] },
      southPortalCollar: { cellCount: 36, componentCount: 1, componentSizes: [36] },
      twinPortalCollars: {
        cellCount: 72,
        coordinateSetSha256:
          'a2ce627591b2e58dd4f20bd28d24e975aaf517ec30a5ac540ebc7617f0358e0b',
        componentCount: 2,
        componentSizes: [36, 36],
      },
      preservedRouteApertures: {
        cellCount: 80,
        componentCount: 2,
        componentSizes: [40, 40],
        stateCensus: { 'minecraft:air': 80 },
      },
      supportContacts: {
        cellCount: 8,
        sourceStateCensus: { 'minecraft:polished_diorite': 8 },
      },
      polishedDioriteFaceContacts: { cellCount: 60 },
    });
    expect(manifest.safetyAudit).toMatchObject({
      frameComponentCount: 2,
      routeApertureComponentCount: 2,
      supportContactCount: 8,
      allSupportsExactPolishedDiorite: true,
      allAperturesClearAir: true,
      routeClearancePreserved: true,
    });
  });

  it('binds an exact portal-exterior ownership extension with no accepted-target overlap', () => {
    const manifest = readManifest();
    expect(manifest.scope).toMatchObject({
      canonicalOwner: 'P1-B03',
      material: 'minecraft:stone_bricks',
      ownership: {
        historicalB03ConstructionIntersectionCount: 0,
        historicalB03InteractionIntersectionCount: 0,
        namedReviewedExtension: {
          id: 'P1-B03-TWIN-PORTAL-EXTERIOR-COLLAR-EXTENSION-R07K',
          operatedCells: { cellCount: 72 },
          priorTargetIntersectionCount: 0,
          everyTargetFaceConnectedToAcceptedPortalFabric: true,
        },
      },
      operationalBoundary: {
        routeApertureChanged: false,
        tubeShellChanged: false,
        mountainSeamChanged: false,
        viaductChanged: false,
        railPowerBrakeControlsInstalled: false,
        drainageOrFluidChanged: false,
        routeCommissioned: false,
      },
    });
    expect(manifest.preservation.acceptedPriorReleaseTargetIntersectionCount).toBe(0);
    expect(manifest.preservation.acceptedPriorReleaseTargetProof
      .every(({ targetIntersectionCount }) => targetIntersectionCount === 0)).toBe(true);
  });

  it('emits 72 exact one-cell guards and their exact reverse-order inverse', () => {
    const manifest = readManifest();
    const pkg = manifest.packages[0];
    const forward = parseOperations(path.join(ROOT, pkg.forward));
    const rollback = parseOperations(path.join(ROOT, pkg.rollback));
    expect(forward).toHaveLength(72);
    expect(rollback).toHaveLength(72);
    expect(new Set(forward.map(({ point }) => point.join(','))).size).toBe(72);
    expect(forward.every(({ fromState, toState }) => (
      fromState === 'minecraft:air' && toState === 'minecraft:stone_bricks'
    ))).toBe(true);
    expect(rollback).toEqual(forward.slice().reverse().map((operation) => ({
      point: operation.point,
      fromState: operation.toState,
      toState: operation.fromState,
    })));
    expect(manifest.operations[PACKAGE_KEY]).toMatchObject({
      forwardCommandCount: 72,
      rollbackCommandCount: 72,
      targetCellCount: 72,
      targetCoordinateSetSha256:
        'a2ce627591b2e58dd4f20bd28d24e975aaf517ec30a5ac540ebc7617f0358e0b',
      exactInverse: true,
      oneCellGuards: true,
    });
    expect(bodySha256(path.join(ROOT, pkg.forward)))
      .toBe(manifest.operations[PACKAGE_KEY].forwardSha256);
    expect(bodySha256(path.join(ROOT, pkg.rollback)))
      .toBe(manifest.operations[PACKAGE_KEY].rollbackSha256);
  });

  it('hard-aborts fluid, gravity, entity, block-entity, relic, and commissioning hazards', () => {
    const manifest = readManifest();
    expect(manifest.target).toMatchObject({
      operatedUnion: { cellCount: 72 },
      sourceStateCensus: { 'minecraft:air': 72 },
      desiredStateCensus: { 'minecraft:stone_bricks': 72 },
    });
    expect(manifest.safetyAudit).toMatchObject({
      targetFluidCount: 0,
      targetGravityCount: 0,
      targetForbiddenContainerOrControlCount: 0,
      haloFluidCount: 0,
      haloGravityCount: 0,
      haloBlockEntityCount: 0,
      haloSavedEntityCount: 0,
      haloProtectedRelicCount: 0,
    });
    expect(manifest.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      executionAuthorizedByThisManifest: false,
      routeCommissioned: false,
    });
  });
});
