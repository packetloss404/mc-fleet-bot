import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r10c_b09_summit_passive_lighting.mjs',
);
const BASENAME = 'combined-zones-r10c-b09-summit-passive-lighting';
const PACKAGE_KEY = 'b09-summit-passive-ceiling-lights';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r10c-b09-summit-passive-lighting-offline-20260821T233000Z',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r10c-summit-lighting-'),
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
    '--generated-at', '2026-08-21T23:30:00Z',
    '--snapshot', 'data/worldsnap-combined-zones-r10b-post-20260821T230936Z',
    '--intake-audit',
    'data/world-review/combined-zones-r10b-live-20260821T230936Z/post-complete-save-intake.json',
    '--source-ledger',
    'data/world-review/combined-zones-r10b-live-20260821T230936Z/evidence-ledger.json',
    '--out-dir', temporaryDirectory,
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstCompile = artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R10C B09 summit passive lighting compiler', () => {
  it('regenerates every guarded artifact byte-for-byte', () => {
    expect(artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstCompile);
  });

  it('binds the accepted R10B post and exact B09 state', () => {
    expect(readManifest()).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R10B_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT',
      scopeIds: ['P1-B09-SUMMIT-HEADHOUSE-PASSIVE-LIGHTING', 'Z11-SUMMIT-FITOUT'],
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r10b-post-20260821T230936Z',
        completeSaveSha256:
          'e77efef8ec56286435edce99986425028176d40b4737259e4bfc60d1c01eab80',
        regionSnapshotSha256:
          'a693c537107f172adeb54e170f20448c26c783484a9affc1c0426c12eabb9138',
        predecessor: {
          transactionId: 'combined-zones-r10b-b09-summit-internal-approach',
          completedReleaseIdentitySha256:
            '3694fbd41a7312501e54940f7d46a362219706a6759950fa2d1f539963bf7474',
          postQaPayloadSha256:
            '8340189fce3197684041859f91113c791f79992c8d0e681e1ceb84576d4f8e0c',
        },
        b09SourceState: {
          accommodation: { cellCount: 7800 },
          blockStateSetSha256:
            '23f8adaf3b2035ef88d1445168783f1a60f615597483e061768f4ce2c024c873',
        },
      },
    });
  });

  it('selects three full-cube ceiling fixtures with a two-index maximum cadence', () => {
    expect(readManifest().scope).toMatchObject({
      canonicalOwner: 'Z11-SUMMIT-FITOUT',
      material: 'minecraft:sea_lantern',
      geometry: {
        acceptedSummitInterior: { cellCount: 18 },
        acceptedSummitHeadhouseShell: { cellCount: 162 },
        ceilingCandidateLine: { cellCount: 9 },
        passiveCeilingFixtures: {
          cellCount: 3,
          coordinateSetSha256:
            'b06b4450bff0ddef846731cdad037966d32b4ff9819763cf93015a805e10bfe6',
        },
      },
      fixtureCadence: {
        centerlineIndices: [552, 556, 560],
        firstStationCenterlineIndex: 552,
        lastStationCenterlineIndex: 560,
        maximumStationIndexDistanceToFixture: 2,
        photometricOrEmergencyLightingCommissioningClaimed: false,
      },
    });
  });

  it('emits three exact one-cell guards and their reverse-order inverse', () => {
    const manifest = readManifest();
    const pkg = manifest.packages[0];
    const forward = parseOperations(path.join(ROOT, pkg.forward));
    const rollback = parseOperations(path.join(ROOT, pkg.rollback));
    expect(forward).toEqual([
      { point: [2048, 298, -820], fromState: 'minecraft:polished_diorite', toState: 'minecraft:sea_lantern' },
      { point: [2048, 302, -824], fromState: 'minecraft:polished_diorite', toState: 'minecraft:sea_lantern' },
      { point: [2048, 306, -828], fromState: 'minecraft:polished_diorite', toState: 'minecraft:sea_lantern' },
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

  it('preserves route clearance, both retained caps, and all unowned prior cells', () => {
    expect(readManifest()).toMatchObject({
      scope: {
        geometry: {
          retainedApproachCollar: { cellCount: 10 },
          retainedExternalZ11Cap: {
            cellCount: 12,
            coordinateSetSha256:
              'd1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093',
          },
        },
        ownership: {
          exactReviewedPriorMigration: {
            r07eTargetIntersectionCount: 3,
            otherPriorTargetIntersectionCount: 0,
          },
        },
        operationalBoundary: {
          routeVoidChanged: false,
          enclosureOpened: false,
          externalZ11InterfaceOpened: false,
          externalZ11CapClosed: true,
        },
      },
      preservation: {
        undeclaredPriorReleaseIntersectionCount: 0,
      },
    });
  });

  it('contains static hazards and does not claim an active transport design', () => {
    expect(readManifest()).toMatchObject({
      safetyAudit: {
        halo: { cellCount: 21 },
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
});
