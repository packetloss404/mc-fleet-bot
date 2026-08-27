import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r10b_b09_summit_internal_approach.mjs',
);
const BASENAME = 'combined-zones-r10b-b09-summit-internal-approach';
const PACKAGE_KEY = 'b09-summit-internal-approach-aperture';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r10b-b09-summit-internal-approach-offline-20260821T201500Z',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r10b-summit-approach-'),
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
    geometry: Record<string, ExactSet>;
    ownership: Record<string, unknown>;
    operationalBoundary: Record<string, boolean>;
  };
  source: {
    snapshotRoot: string;
    completeSaveSha256: string;
    regionSnapshotSha256: string;
    predecessor: Record<string, unknown>;
    b09DisjointRebaseProof: Record<string, unknown>;
  };
  target: { operatedUnion: ExactSet; desiredStateCensus: Record<string, number> };
  operations: Record<string, Record<string, number | string | boolean>>;
  preservation: Record<string, unknown>;
  safetyAudit: Record<string, unknown>;
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
    '--generated-at', '2026-08-21T20:15:00Z',
    '--snapshot', 'data/worldsnap-combined-zones-r08u-post-20260821T201019Z',
    '--intake-audit',
    'data/world-review/combined-zones-r08u-live-20260821T201019Z/post-complete-save-intake.json',
    '--source-ledger',
    'data/world-review/combined-zones-r08u-live-20260821T201019Z/evidence-ledger.json',
    '--out-dir', temporaryDirectory,
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstCompile = artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R10B B09 summit internal approach compiler', () => {
  it('regenerates every guarded artifact byte-for-byte', () => {
    expect(artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstCompile);
  });

  it('binds the accepted R08U post and exact unchanged B09 accommodation', () => {
    expect(readManifest()).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      status: 'COMPILED_FROM_LATEST_ACCEPTED_R08U_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT',
      scopeIds: [
        'P1-B09-INTERNAL-SUMMIT-APPROACH',
        'Z11-SUMMIT-FITOUT-INTERNAL-THRESHOLD',
      ],
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r08u-post-20260821T201019Z',
        completeSaveSha256:
          '6a1c3c12b900f3e646b4930c282ff9da81f213b8b5f49dbfd73233536c0b2f59',
        regionSnapshotSha256:
          'dd4e62a6f74c5ce8427313a8fd1a470994926fb1270b3e34170ead06f4026217',
        predecessor: {
          transactionId: 'combined-zones-r08u-empty-eight-internal-vent-caps',
          completedReleaseIdentitySha256:
            'a1e608b0a3a52da11a65f6d87f20f39d292f2ef801bdab3a25fb39f26885ab91',
        },
        b09DisjointRebaseProof: {
          baseline: 'R07I_POST',
          terminal: 'R08U_POST',
          accommodation: { cellCount: 7800 },
          baselineBlockStateSetSha256:
            'c9ab509e6e14bd267d4c509808be87677a7e36033e9bda53f69611d02aa46635',
          terminalBlockStateSetSha256:
            'c9ab509e6e14bd267d4c509808be87677a7e36033e9bda53f69611d02aa46635',
          mismatchCount: 0,
        },
      },
    });
  });

  it('opens only the exact two-cell retained internal seam', () => {
    const manifest = readManifest();
    expect(manifest.scope).toMatchObject({
      canonicalOwner: 'Z11-SUMMIT-FITOUT',
      geometry: {
        ownedInternalSeam: {
          cellCount: 2,
          coordinateSetSha256:
            '8100289cadea36a33df57d789c17b6972124bdc65101ffa2dc439967c8ba8f75',
        },
        retainedApproachCollar: { cellCount: 10 },
      },
      ownership: {
        exactReviewedPriorMigration: {
          priorOwner: 'P1-B09-FUNICULAR-FRAMEWORK/R07E',
          r07eTargetIntersectionCount: 2,
          otherPriorTargetIntersectionCount: 0,
        },
      },
    });
    expect(manifest.target).toMatchObject({
      operatedUnion: { cellCount: 2 },
      desiredStateCensus: { 'minecraft:air': 2 },
    });
  });

  it('proves the seam is necessary and sufficient for internal connectivity', () => {
    expect(readManifest().scope.geometry).toMatchObject({
      acceptedGuidewayVoid: { cellCount: 1096, componentCount: 1 },
      acceptedSummitInterior: { cellCount: 18, componentCount: 1 },
      negativeWithoutSeam: {
        cellCount: 1114,
        componentCount: 2,
        componentSizes: [1096, 18],
      },
      projectedConnectedInternalVoid: {
        cellCount: 1116,
        coordinateSetSha256:
          'c0e162baf89a1e57db122facfaed2d11ea7ca3263716841caeb8684b8297c4b6',
        componentCount: 1,
        componentSizes: [1116],
      },
    });
  });

  it('retains the external Z11 cap and installs or commissions no mechanism', () => {
    expect(readManifest().scope).toMatchObject({
      geometry: {
        retainedExternalZ11Cap: {
          cellCount: 12,
          coordinateSetSha256:
            'd1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093',
        },
      },
      operationalBoundary: {
        externalZ11InterfaceOpened: false,
        externalZ11CapClosed: true,
        activeMechanismInstalled: false,
        railInstalled: false,
        driveBrakeVehicleControlsPowerDrainageInstalled: false,
        funicularCommissioned: false,
        pedestrianRouteCommissioned: false,
      },
    });
  });

  it('emits two exact guards and their reverse-order inverse', () => {
    const manifest = readManifest();
    const pkg = manifest.packages[0];
    const forward = parseOperations(path.join(ROOT, pkg.forward));
    const rollback = parseOperations(path.join(ROOT, pkg.rollback));
    expect(forward).toEqual([
      {
        point: [2048, 295, -819],
        fromState: 'minecraft:polished_diorite',
        toState: 'minecraft:air',
      },
      {
        point: [2048, 296, -819],
        fromState: 'minecraft:polished_diorite',
        toState: 'minecraft:air',
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

  it('records clear static hazards and complete offline execution gates', () => {
    expect(readManifest()).toMatchObject({
      safetyAudit: {
        targetFluidCount: 0,
        haloFluidCount: 0,
        haloGravityCount: 0,
        haloActiveMechanismCount: 0,
        haloBlockEntityCount: 0,
        haloSavedEntityCount: 0,
        haloProtectedRelicCount: 0,
        routeConnectedAfterOpening: true,
        routeDisconnectedWithoutOpening: true,
      },
      safetyBoundary: {
        liveCallsPerformed: false,
        worldEditsPerformed: false,
        executionAuthorizedByThisManifest: false,
      },
    });
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
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'manifest-qa.json'), 'utf8')).status)
      .toBe('PASS');
    expect(JSON.parse(fs.readFileSync(
      path.join(EVIDENCE, `${PACKAGE_KEY}.forward-source-preflight.json`),
      'utf8',
    )).status).toBe('PASS');
    expect(JSON.parse(fs.readFileSync(
      path.join(EVIDENCE, `${PACKAGE_KEY}.projected-rollback-preflight.json`),
      'utf8',
    )).status).toBe('PASS');
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'block-entity-clearance.json'), 'utf8')).status)
      .toBe('PASS');
  });
});
