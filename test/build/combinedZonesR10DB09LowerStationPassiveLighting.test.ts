import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r10d_b09_lower_station_passive_lighting.mjs',
);
const BASENAME = 'combined-zones-r10d-b09-lower-station-passive-lighting';
const PACKAGE_KEY = 'b09-lower-station-passive-ceiling-lights';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r10d-b09-lower-station-passive-lighting-offline-20260821T235500Z',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r10d-lower-station-lighting-'),
);

interface ExactSet {
  cellCount: number;
  coordinateSetSha256: string;
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
    geometry: Record<string, ExactSet>;
    fixtureCadence: Record<string, number | number[] | boolean>;
    ownership: Record<string, unknown>;
    operationalBoundary: Record<string, boolean>;
  };
  source: Record<string, unknown> & {
    snapshotRoot: string;
    completeSaveSha256: string;
    regionSnapshotSha256: string;
    predecessor: Record<string, unknown>;
    b09SourceState: Record<string, unknown>;
  };
  target: { operatedUnion: ExactSet; desiredStateCensus: Record<string, number> };
  operations: Record<string, Record<string, number | string | boolean>>;
  preservation: Record<string, unknown>;
  safetyAudit: Record<string, unknown>;
  activeTransportBlocker: Record<string, unknown>;
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
    '--generated-at', '2026-08-21T23:55:00Z',
    '--snapshot', 'data/worldsnap-combined-zones-r10c-post-20260821T233530Z',
    '--intake-audit',
    'data/world-review/combined-zones-r10c-live-20260821T233530Z/post-complete-save-intake.json',
    '--source-ledger',
    'data/world-review/combined-zones-r10c-live-20260821T233530Z/evidence-ledger.json',
    '--out-dir', temporaryDirectory,
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstCompile = artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R10D B09 lower-station passive lighting compiler', () => {
  it('regenerates every guarded artifact byte-for-byte', () => {
    expect(artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstCompile);
  });

  it('binds the accepted R10C post and exact B09 state', () => {
    expect(readManifest()).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R10C_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT',
      scopeIds: ['P1-B09-LOWER-STATION-PASSIVE-LIGHTING', 'Z11-SUMMIT-FITOUT'],
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r10c-post-20260821T233530Z',
        completeSaveSha256:
          'e2ff106a2fc19ae8a175dc31e646eb4cd8e85ff8c5262e98ce0faecbde81b2d7',
        regionSnapshotSha256:
          '3a9089869493c48a0f9dea501044b88c6bc5c271c82a03d3517e4bbd5bc46986',
        predecessor: {
          transactionId: 'combined-zones-r10c-b09-summit-passive-lighting',
          completedReleaseIdentitySha256:
            'e3ac73231d641952e4c4bae22f5f54173626b15ee26dfbf2841bf9e776c3eb14',
          postQaPayloadSha256:
            '0c3e390a7b1b4a2e9907c50f2a527b6fc2e74eceeaf007d9bfe4a595fe6704cd',
        },
        b09SourceState: {
          accommodation: { cellCount: 7800 },
          blockStateSetSha256:
            '8516c1ffb69c6f9ca7eed5aa46e99491042501352289392129e1f8260ff44a79',
        },
      },
    });
  });

  it('selects two inset lower-station ceiling fixtures with one-index cadence', () => {
    expect(readManifest().scope).toMatchObject({
      canonicalOwner: 'Z11-SUMMIT-FITOUT',
      material: 'minecraft:sea_lantern',
      geometry: {
        acceptedLowerStationInterior: { cellCount: 12 },
        acceptedLowerStationShell: { cellCount: 84 },
        ceilingCandidateLine: { cellCount: 6 },
        passiveCeilingFixtures: {
          cellCount: 2,
          coordinateSetSha256:
            '07a255938e33df38d4a3b8381e0aacc5b024a26f8fc38019452ec6f75cd93d73',
        },
      },
      fixtureCadence: {
        centerlineIndices: [4, 7],
        firstStationCenterlineIndex: 3,
        lastStationCenterlineIndex: 8,
        maximumStationIndexDistanceToFixture: 1,
        photometricOrEmergencyLightingCommissioningClaimed: false,
      },
    });
  });

  it('emits two exact one-cell guards and their reverse-order inverse', () => {
    const manifest = readManifest();
    const pkg = manifest.packages[0];
    const forward = parseOperations(path.join(ROOT, pkg.forward));
    const rollback = parseOperations(path.join(ROOT, pkg.rollback));
    expect(forward).toEqual([
      {
        point: [2052, 132, -748],
        fromState: 'minecraft:polished_diorite',
        toState: 'minecraft:sea_lantern',
      },
      {
        point: [2055, 132, -748],
        fromState: 'minecraft:polished_diorite',
        toState: 'minecraft:sea_lantern',
      },
    ]);
    expect(rollback).toEqual(forward.slice().reverse().map((operation) => ({
      point: operation.point,
      fromState: operation.toState,
      toState: operation.fromState,
    })));
    expect(bodySha256(path.join(ROOT, pkg.forward)))
      .toBe(String(manifest.operations[PACKAGE_KEY].forwardSha256));
    expect(bodySha256(path.join(ROOT, pkg.rollback)))
      .toBe(String(manifest.operations[PACKAGE_KEY].rollbackSha256));
  });

  it('preserves the route, B08 cap, guideway seam/collar, and unowned prior cells', () => {
    expect(readManifest()).toMatchObject({
      scope: {
        geometry: {
          retainedB08WestCap: {
            cellCount: 12,
            coordinateSetSha256:
              'a422d177fb7f1571b8a6243fcbf014fda17a910e60e7c03f7c21051f697a3e96',
          },
          retainedGuidewayInternalSeam: { cellCount: 2 },
          retainedGuidewaySeamCollar: { cellCount: 10 },
        },
        ownership: {
          exactReviewedPriorMigration: {
            r07dTargetIntersectionCount: 2,
            otherPriorTargetIntersectionCount: 0,
          },
        },
        operationalBoundary: {
          routeVoidChanged: false,
          enclosureOpened: false,
          b08ExternalInterfaceOpened: false,
          b08WestCapClosed: true,
          guidewayInternalSeamChanged: false,
        },
      },
      preservation: {
        undeclaredPriorReleaseIntersectionCount: 0,
      },
    });
  });

  it('contains static hazards and makes no active-system claim', () => {
    expect(readManifest()).toMatchObject({
      safetyAudit: {
        halo: {
          cellCount: 14,
          coordinateSetSha256:
            '4f125eced5c23f2f1d937831d12e6448fc5fdaefc1b41b5d7956ee9896f89fc2',
        },
        targetFluidCount: 0,
        haloFluidCount: 0,
        haloGravityCount: 0,
        haloActiveMechanismCount: 0,
        haloBlockEntityCount: 0,
        haloSavedEntityCount: 0,
        haloProtectedRelicCount: 0,
        targetMaterialFullCubeNonGravityNonBlockEntity: true,
        routeClearancePreserved: true,
        enclosureContinuityPreserved: true,
      },
      activeTransportBlocker: {
        status: 'LOCAL_HOLD_NO_EXACT_ACCEPTED_MECHANISM_GEOMETRY',
        doesNotBlockThisStaticPassiveFixtureScope: true,
      },
      scope: {
        operationalBoundary: {
          activeMechanismInstalled: false,
          railInstalled: false,
          driveBrakeVehicleControlsPowerDrainageInstalled: false,
          photometricOrEmergencyLightingCommissioned: false,
          funicularCommissioned: false,
          pedestrianRouteCommissioned: false,
        },
      },
    });
  });

  it('records every offline execution gate as PASS', () => {
    const expected = [
      'manifest-qa.json',
      `${PACKAGE_KEY}.forward-source-preflight.json`,
      `${PACKAGE_KEY}.projected-rollback-preflight.json`,
      `${PACKAGE_KEY}.forward-strict-dry-run.json`,
      `${PACKAGE_KEY}.rollback-strict-dry-run.json`,
      'block-entity-clearance.json',
      'wrapper-plan.json',
    ];
    for (const filename of expected) expect(fs.existsSync(path.join(EVIDENCE, filename))).toBe(true);
    for (const filename of [
      'manifest-qa.json',
      `${PACKAGE_KEY}.forward-source-preflight.json`,
      `${PACKAGE_KEY}.projected-rollback-preflight.json`,
      'block-entity-clearance.json',
    ]) {
      expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, filename), 'utf8')).status).toBe('PASS');
    }
  });

  it('is accepted as MVP scope by the real wrapper print-plan path', () => {
    const output = execFileSync(process.execPath, [
      'scripts/run_combined_zones_scoped_release.mjs',
      '--manifest', `data/buildops/${BASENAME}.release-manifest.json`,
      '--release-node', 'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT',
      '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    expect(JSON.parse(output)).toMatchObject({
      mode: 'PREPARE_ONLY',
      globalGateDependency: 'NONE',
      packageOrder: [PACKAGE_KEY],
      stages: [
        'standing-authorization',
        'exact-release-manifest-qa',
        'fresh-source-complete-save',
        'source-complete-save-intake-and-coverage',
        'forward-source-preflight',
        'strict-forward-parser-check',
        'strict-rollback-parser-check',
        'projected-rollback-preflight',
        'block-entity-clearance',
        'live-entity-clearance',
      ],
    });
  });
});
