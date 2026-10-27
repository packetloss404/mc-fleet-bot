import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/commission_combined_zones_r12b_b09_static_enclosure_readiness.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r12b-b09-static-readiness-r10e-20260822T002500Z',
);
const CANONICAL_JSON = path.join(EVIDENCE, 'r12b-readiness.json');
const CANONICAL_MARKDOWN = path.join(EVIDENCE, 'r12b-readiness.md');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r12b-readiness-'),
);
const temporaryJson = path.join(temporaryDirectory, 'r12b-readiness.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'r12b-readiness.md');

interface ExactSet {
  cellCount: number;
  coordinateSetSha256: string;
}

interface ReadinessReport {
  status: string;
  commissioningPayloadSha256: string;
  terminalState: {
    ledger: { sha256: string };
    postReleaseQa: { sha256: string };
    completedReleaseIdentitySha256: string;
    postCompleteSaveSha256: string;
    postRegionSha256: string;
    r10eTarget: ExactSet;
    r10eB09TargetIntersectionCount: number;
  };
  geometry: {
    acceptedGuidewayRoute: ExactSet;
    connectedLowerToSummitVoid: ExactSet & {
      componentCount: number;
      exactAirCellCount: number;
    };
    completeFaceBoundary: ExactSet & {
      stateCensus: Record<string, number>;
      nonSolidCellCount: number;
    };
    minimumAccommodation: ExactSet & {
      stateCensus: Record<string, number>;
      baselineBlockStateSetSha256: string;
      latestBlockStateSetSha256: string;
      baselineToLatestMismatchCount: number;
      exactDeclaredR10eMismatchCount: number;
      mismatchCoordinateSetSha256: string;
    };
    passiveStationFixtures: ExactSet & {
      centerlineIndices: number[];
      exactSeaLanternCount: number;
    };
    retainedLowerB08Cap: ExactSet;
    retainedSummitZ11Cap: ExactSet;
  };
  safetyAndReadiness: Record<string, boolean | number>;
  rollbackReadiness: {
    status: string;
    releaseCount: number;
    totalRollbackOperationGroupCount: number;
    globalReverseOrder: string[];
    chain: Array<{
      id: string;
      rollbackOrder: number;
      precedingRollbackOperationCount: number;
    }>;
  };
  commissioningBoundary: Record<string, boolean | string>;
  safetyBoundary: Record<string, boolean>;
}

function readReport(filename = CANONICAL_JSON): ReadinessReport {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as ReadinessReport;
}

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--generated-at',
    '2026-08-22T00:25:00Z',
    '--out',
    temporaryJson,
    '--markdown',
    temporaryMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones CZ-R12B B09 static enclosure readiness', () => {
  it('regenerates the canonical R10E-bound seal byte-for-byte', () => {
    expect(fs.readFileSync(temporaryJson)).toEqual(fs.readFileSync(CANONICAL_JSON));
    expect(fs.readFileSync(temporaryMarkdown)).toEqual(fs.readFileSync(CANONICAL_MARKDOWN));
  });

  it('binds the accepted R10E terminal ledger and independent post QA', () => {
    expect(readReport()).toMatchObject({
      status: 'PASS_B09_STATIC_ENCLOSURE_AND_MECHANISM_INSTALLATION_READINESS_ACCEPTED',
      commissioningPayloadSha256:
        'bf2a1a6a93ca51c2a2ba3e6bbdbb95ec7ff3a8f97434205abaa899edd9269044',
      terminalState: {
        ledger: {
          sha256: 'dc97d41cce9f162920fb76813061de071f387a16a1c19672595190399dda180c',
        },
        postReleaseQa: {
          sha256: '6c28d303646407e9590aa61b3aa5ff86550820443d60ff03b8c232f20ebdc6ee',
        },
        completedReleaseIdentitySha256:
          '6c40b77e68ae455330eab4658c0c859132f3e60570b1a98c97decd4134c192f5',
        postRegionSha256:
          '8c41238e78e061a7ac3aafd58712f81fb7c66e9a6b41b2afdaa2ac3d26848443',
        r10eB09TargetIntersectionCount: 15,
      },
    });
  });

  it('proves the complete connected air void, solid boundary, and closed caps', () => {
    const geometry = readReport().geometry;
    expect(geometry.acceptedGuidewayRoute).toMatchObject({ cellCount: 1_096 });
    expect(geometry.connectedLowerToSummitVoid).toMatchObject({
      cellCount: 1_116,
      componentCount: 1,
      exactAirCellCount: 1_116,
      coordinateSetSha256:
        'c0e162baf89a1e57db122facfaed2d11ea7ca3263716841caeb8684b8297c4b6',
    });
    expect(geometry.completeFaceBoundary).toMatchObject({
      cellCount: 3_346,
      stateCensus: {
        'minecraft:polished_diorite': 3_326,
        'minecraft:sea_lantern': 20,
      },
      nonSolidCellCount: 0,
    });
    expect(geometry.retainedLowerB08Cap.cellCount).toBe(12);
    expect(geometry.retainedSummitZ11Cap.cellCount).toBe(12);
  });

  it('classifies the only R10D-to-R10E accommodation delta exactly', () => {
    const geometry = readReport().geometry;
    expect(geometry.minimumAccommodation).toMatchObject({
      cellCount: 7_800,
      stateCensus: {
        'minecraft:air': 1_155,
        'minecraft:polished_diorite': 6_625,
        'minecraft:sea_lantern': 20,
      },
      baselineToLatestMismatchCount: 15,
      exactDeclaredR10eMismatchCount: 15,
      mismatchCoordinateSetSha256:
        '81625f2011e725b624a699ad7176ee2c3d85f065f3f9e1589ec3cd96f1cb705f',
    });
    expect(geometry.passiveStationFixtures.exactSeaLanternCount).toBe(20);
    expect(geometry.passiveStationFixtures.centerlineIndices).toHaveLength(20);
  });

  it('proves clean static readiness and the complete projected reverse chain', () => {
    const report = readReport();
    expect(report.safetyAndReadiness).toMatchObject({
      routeObstructionCount: 0,
      boundaryNonSolidCount: 0,
      fluidCellCount: 0,
      activeMechanismCellCount: 0,
      containerOrControlCellCount: 0,
      blockEntityHaloIntersectionCount: 0,
      savedEntityHaloIntersectionCount: 0,
      lowerExternalInterfaceOpen: false,
      summitExternalInterfaceOpen: false,
      staticEnclosureAccepted: true,
      futureMechanismInstallationEnvelopeReady: true,
    });
    expect(report.rollbackReadiness).toMatchObject({
      status: 'PASS_COMPLETE_GLOBAL_REVERSE_ORDER_PROJECTED_PREFLIGHT',
      releaseCount: 9,
      totalRollbackOperationGroupCount: 6_604,
      globalReverseOrder: [
        'R10E', 'R10D', 'R10C', 'R10B', 'R07I', 'R07H', 'R07F', 'R07E', 'R07D',
      ],
    });
    expect(report.rollbackReadiness.chain.at(-1)?.precedingRollbackOperationCount).toBe(6_598);
  });

  it('does not overclaim operational commissioning or perform mutation', () => {
    const report = readReport();
    expect(report.commissioningBoundary).toMatchObject({
      funicularCommissioned: false,
      vehicleOrRailInstalled: false,
      passengerTransportCommissioned: false,
      pedestrianOrRescueRouteCommissioned: false,
      powerOrControlsCommissioned: false,
      photometricOrEmergencyLightingCommissioned: false,
      drainageOrOutfallCommissioned: false,
      b08OrZ11ExternalInterfaceOpened: false,
    });
    expect(report.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      apiCallsPerformed: false,
      rconCallsPerformed: false,
      serviceMutationsPerformed: false,
      worldEditsPerformed: false,
    });
  });
});
