import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r10f_b09_curve_summit_passive_wayfinding.mjs',
);
const BASENAME = 'combined-zones-r10f-b09-curve-summit-passive-wayfinding';
const PACKAGE_KEY = 'b09-curve-summit-passive-ceiling-wayfinding';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r10f-b09-curve-summit-passive-wayfinding-offline-20260822T003500Z',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r10f-curve-summit-wayfinding-'),
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
  mvpScope: boolean;
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
    '--generated-at', '2026-08-22T00:35:00Z',
    '--snapshot', 'data/worldsnap-combined-zones-r10e-post-20260822T001339Z',
    '--intake-audit',
    'data/world-review/combined-zones-r10e-live-20260822T001339Z/post-complete-save-intake.json',
    '--source-ledger',
    'data/world-review/combined-zones-r10e-live-20260822T001339Z/evidence-ledger.json',
    '--out-dir', temporaryDirectory,
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstCompile = artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R10F B09 curve/summit passive wayfinding compiler', () => {
  it('regenerates every guarded artifact byte-for-byte', () => {
    expect(artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstCompile);
  });

  it('binds the accepted R10E post and exact B09 source state', () => {
    expect(readManifest()).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R10E_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT',
      mvpScope: true,
      scopeIds: ['P1-B09-CURVE-SUMMIT-PASSIVE-WAYFINDING', 'Z11-SUMMIT-FITOUT'],
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r10e-post-20260822T001339Z',
        completeSaveSha256:
          '4705f8c8b5e25de25af862071f117573bc7c0aff9dd0edb0e0c4b7fd369c0cf0',
        regionSnapshotSha256:
          '8c41238e78e061a7ac3aafd58712f81fb7c66e9a6b41b2afdaa2ac3d26848443',
        predecessor: {
          transactionId: 'combined-zones-r10e-b09-lower-guideway-passive-wayfinding',
          completedReleaseIdentitySha256:
            '6c40b77e68ae455330eab4658c0c859132f3e60570b1a98c97decd4134c192f5',
          postQaPayloadSha256:
            '4a5baf32340813da6979d4bb4741e42edb214f54229c57d1743c4a4e4c6cca2e',
        },
        b09SourceState: {
          accommodation: { cellCount: 7800 },
          blockStateSetSha256:
            'c35c3de3dcfa24e3f588749aef0f8bfa09e26d6e9235a0a93c1b36afb5a4deef',
        },
      },
    });
  });

  it('selects the complete curve/summit return and exact 16-index cadence', () => {
    expect(readManifest().scope).toMatchObject({
      canonicalOwner: 'Z11-SUMMIT-FITOUT',
      material: 'minecraft:sea_lantern',
      geometry: {
        acceptedCurveAndSummitReturnRoute: {
          cellCount: 622,
          coordinateSetSha256:
            '6297d5963c2209e0d63d0735c7991922c4273da239189ff3e3ebe34c2839f528',
        },
        acceptedCurveAndSummitReturnFaceBoundary: {
          cellCount: 1866,
          coordinateSetSha256:
            'c9b496f220f312afa540155ae80f03e2df311d502f2467dd51da835ddb32346a',
        },
        acceptedCompleteB09Route: {
          cellCount: 1116,
          coordinateSetSha256:
            'c0e162baf89a1e57db122facfaed2d11ea7ca3263716841caeb8684b8297c4b6',
        },
        passiveCeilingWayfindingFixtures: {
          cellCount: 19,
          coordinateSetSha256:
            'aff71953450823749a57f808f119ef333712418eb5be1755066c7bc643df61e4',
        },
      },
      fixtureCadence: {
        centerlineIndices: [
          255, 271, 287, 303, 319, 335, 351, 367, 383, 399,
          415, 431, 447, 463, 479, 495, 511, 527, 543,
        ],
        acceptedSuccessorFixtureIndices: [552, 556, 560],
        maximumCompleteRouteIndexDistanceToAcceptedFixture: 8,
        maximumNewFixtureSpacingInIndices: 16,
        photometricEmergencyOrLifeSafetyLightingClaimed: false,
      },
    });
  });

  it('emits nineteen exact one-cell guards and their reverse-order inverse', () => {
    const manifest = readManifest();
    const pkg = manifest.packages[0];
    const forward = parseOperations(path.join(ROOT, pkg.forward));
    const rollback = parseOperations(path.join(ROOT, pkg.rollback));
    expect(forward).toHaveLength(19);
    expect(forward.map(({ point }) => point)).toEqual([
      [2048, 258, -779], [2048, 274, -795], [2048, 289, -811],
      [2053, 248, -768], [2069, 248, -768], [2085, 248, -768],
      [2101, 248, -768], [2117, 248, -768], [2133, 244, -768],
      [2149, 232, -768], [2165, 221, -768], [2181, 209, -768],
      [2197, 197, -768], [2213, 186, -768], [2229, 174, -768],
      [2245, 163, -768], [2261, 151, -768], [2277, 139, -768],
      [2288, 132, -763],
    ]);
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

  it('keeps both external interfaces sealed and owns only exact R07I fabric', () => {
    expect(readManifest()).toMatchObject({
      scope: {
        geometry: {
          retainedB08WestCap: { cellCount: 12 },
          retainedSummitExternalCap: {
            cellCount: 12,
            coordinateSetSha256:
              'd1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093',
          },
        },
        ownership: {
          exactReviewedPriorMigration: {
            r07iTargetIntersectionCount: 19,
            otherPriorTargetIntersectionCount: 0,
          },
        },
        operationalBoundary: {
          routeVoidChanged: false,
          enclosureOpened: false,
          b08ExternalInterfaceOpened: false,
          summitExternalInterfaceOpened: false,
        },
      },
      preservation: { undeclaredPriorReleaseIntersectionCount: 0 },
    });
  });

  it('contains every static hazard and makes no active-system claim', () => {
    expect(readManifest()).toMatchObject({
      safetyAudit: {
        halo: {
          cellCount: 133,
          coordinateSetSha256:
            'e0af06050c1878668889aa107aa13c321b8a6b37838f38dc869b3754bd352779',
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
