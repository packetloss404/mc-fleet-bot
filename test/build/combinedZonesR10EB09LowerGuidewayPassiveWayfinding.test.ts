import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r10e_b09_lower_guideway_passive_wayfinding.mjs',
);
const BASENAME = 'combined-zones-r10e-b09-lower-guideway-passive-wayfinding';
const PACKAGE_KEY = 'b09-lower-guideway-passive-ceiling-wayfinding';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r10e-b09-lower-guideway-passive-wayfinding-offline-20260822T001500Z',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r10e-lower-guideway-wayfinding-'),
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
  operations: Record<string, Record<string, number | string | boolean>>;
  preservation: Record<string, unknown>;
  safetyAudit: Record<string, unknown>;
  activeTransportBlocker: Record<string, unknown>;
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
    '--generated-at', '2026-08-22T00:15:00Z',
    '--snapshot', 'data/worldsnap-combined-zones-r10d-post-20260821T235524Z',
    '--intake-audit',
    'data/world-review/combined-zones-r10d-live-20260821T235524Z/post-complete-save-intake.json',
    '--source-ledger',
    'data/world-review/combined-zones-r10d-live-20260821T235524Z/evidence-ledger.json',
    '--out-dir', temporaryDirectory,
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstCompile = artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R10E B09 lower-guideway passive wayfinding compiler', () => {
  it('regenerates every guarded artifact byte-for-byte', () => {
    expect(artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstCompile);
  });

  it('binds the accepted R10D post and exact B09 source state', () => {
    expect(readManifest()).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R10D_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT',
      scopeIds: ['P1-B09-LOWER-GUIDEWAY-PASSIVE-WAYFINDING', 'Z11-SUMMIT-FITOUT'],
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r10d-post-20260821T235524Z',
        completeSaveSha256:
          'f3bdba213805aa601b8bed7f9cb58b75a44a84f27ef643a80a8e0bf6d53672cb',
        regionSnapshotSha256:
          '5ab0829c8d4a5e5b88f7b3b494b36ddc5461cc52cc902fa7223fa2b440ea1284',
        predecessor: {
          transactionId: 'combined-zones-r10d-b09-lower-station-passive-lighting',
          completedReleaseIdentitySha256:
            'f8d324f9adc05de99090c6e511479b13e703f3202bda51c3a1157ea7958e6ff7',
          postQaPayloadSha256:
            'e6e78f778774bb1bb6b0df6bf1bd594bc39fc50f9cddb1304e118f81f94eff03',
        },
        b09SourceState: {
          accommodation: { cellCount: 7800 },
          blockStateSetSha256:
            '085b77456806ea0496343cd9eb47107da9c37872a67632ebb630a563914937ca',
        },
      },
    });
  });

  it('selects the complete lower-straight route and exact 16-index cadence', () => {
    expect(readManifest().scope).toMatchObject({
      canonicalOwner: 'Z11-SUMMIT-FITOUT',
      material: 'minecraft:sea_lantern',
      geometry: {
        acceptedLowerStationAndStraightRoute: {
          cellCount: 474,
          coordinateSetSha256:
            '33c4566c2030f7e9f5d7cac5a65bb5579a551a2e848a3354f543ef566e969eb1',
        },
        acceptedLowerRouteFaceBoundary: {
          cellCount: 1426,
          coordinateSetSha256:
            '131169b3d54c7781fccd906c83c68d6c90ce50c8e3c0da3cd21f407dfb07b758',
        },
        passiveCeilingWayfindingFixtures: {
          cellCount: 15,
          coordinateSetSha256:
            '81625f2011e725b624a699ad7176ee2c3d85f065f3f9e1589ec3cd96f1cb705f',
        },
      },
      fixtureCadence: {
        centerlineIndices: [15, 31, 47, 63, 79, 95, 111, 127, 143, 159, 175, 191, 207, 223, 239],
        acceptedPredecessorFixtureIndices: [4, 7],
        maximumRouteIndexDistanceToAcceptedFixture: 8,
        maximumNewFixtureSpacingInIndices: 16,
        photometricEmergencyOrLifeSafetyLightingClaimed: false,
      },
    });
  });

  it('emits fifteen exact one-cell guards and their reverse-order inverse', () => {
    const manifest = readManifest();
    const pkg = manifest.packages[0];
    const forward = parseOperations(path.join(ROOT, pkg.forward));
    const rollback = parseOperations(path.join(ROOT, pkg.rollback));
    expect(forward).toHaveLength(15);
    expect(forward.map(({ point }) => point)).toEqual(
      Array.from({ length: 15 }, (_, index) => [2063 + index * 16, 132, -748]),
    );
    expect(forward.every(({ fromState, toState }) => (
      fromState === 'minecraft:polished_diorite' && toState === 'minecraft:sea_lantern'
    ))).toBe(true);
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

  it('preserves the B08 cap and the complete R07I curve aperture/collar', () => {
    expect(readManifest()).toMatchObject({
      scope: {
        geometry: {
          retainedB08WestCap: { cellCount: 12 },
          retainedR07iCurveAperture: {
            cellCount: 4,
            coordinateSetSha256:
              '9991feda6e953dd4e66585d7e23a61723c3319cb59c22782196fab028f2c08bb',
          },
          retainedCurveApertureCollar: { cellCount: 8 },
        },
        ownership: {
          exactReviewedPriorMigration: {
            r07fTargetIntersectionCount: 1,
            r07hTargetIntersectionCount: 14,
            otherPriorTargetIntersectionCount: 0,
          },
        },
        operationalBoundary: {
          routeVoidChanged: false,
          enclosureOpened: false,
          b08ExternalInterfaceOpened: false,
          curveApertureChanged: false,
        },
      },
      preservation: { undeclaredPriorReleaseIntersectionCount: 0 },
    });
  });

  it('contains every static hazard and makes no active-system claim', () => {
    expect(readManifest()).toMatchObject({
      safetyAudit: {
        halo: {
          cellCount: 105,
          coordinateSetSha256:
            'd474cf24909f624368a26bd7daf38536375fe4936e19513f835c9b5a6a20383a',
        },
        targetFluidCount: 0,
        haloFluidCount: 0,
        haloGravityCount: 0,
        haloActiveMechanismCount: 0,
        haloBlockEntityCount: 0,
        haloSavedEntityCount: 0,
        haloProtectedRelicCount: 0,
        routeClearancePreserved: true,
        enclosureContinuityPreserved: true,
      },
      activeTransportBlocker: {
        status: 'LOCAL_HOLD_NO_EXACT_ACCEPTED_MECHANISM_GEOMETRY',
        doesNotBlockThisStaticPassiveWayfindingScope: true,
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
