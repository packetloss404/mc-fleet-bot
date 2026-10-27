import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/commission_combined_zones_r12a_cheyenne_gallery_hold_point.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r12a-cheyenne-gallery-commissioning-20260821T165900Z',
);
const CANONICAL_JSON = path.join(EVIDENCE, 'r12a-commissioning.json');
const CANONICAL_MARKDOWN = path.join(EVIDENCE, 'r12a-commissioning.md');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r12a-commissioning-'),
);
const temporaryJson = path.join(temporaryDirectory, 'r12a-commissioning.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'r12a-commissioning.md');

interface ExactSet {
  cellCount: number;
  coordinateSetSha256: string;
}

interface CommissioningReport {
  status: string;
  commissioningPayloadSha256: string;
  release: {
    releaseNodeId: string;
    commissioningScopeId: string;
    mvpScope: boolean;
    functionalDisposition: string;
  };
  bindings: {
    latestLedger: { sha256: string };
    sourceLedger: { sha256: string };
    sourcePostQa: { sha256: string };
    latestPhysicalState: {
      completeSaveSha256: string;
      regionSnapshotSha256: string;
    };
    sourceAsBuiltQaPayloadSha256: string;
  };
  geometry: {
    centerline: { stationCount: number; longitudinalStepCount: number };
    route: ExactSet;
    upstreamPlane: ExactSet;
    routeWithUpstream: ExactSet;
    pedestrianClearance: ExactSet;
    liner: ExactSet;
    floor: ExactSet;
    ceiling: ExactSet;
    terminusCap: ExactSet;
  };
  observedState: {
    liner: { matchingCellCount: number; mismatchCellCount: number; stateCensus: Record<string, number> };
    route: { matchingCellCount: number; mismatchCellCount: number; stateCensus: Record<string, number> };
    upstreamPlane: { matchingCellCount: number; mismatchCellCount: number };
    terminusCap: { matchingCellCount: number; mismatchCellCount: number };
    routeConnectivity: { componentCount: number; largestComponentCellCount: number };
    pedestrianClearance: { matchingCellCount: number; mismatchCellCount: number };
    walkingSurface: { cellCount: number; acceptedContinuousSurface: boolean };
    ceiling: { cellCount: number; acceptedContinuousEnclosure: boolean };
    lighting: {
      fixtureCount: number;
      longitudinalGaps: number[];
      maximumLongitudinalSpacing: number;
    };
    haloClearance: {
      fluidIntersections: unknown[];
      containerOrControlIntersections: unknown[];
      blockEntityIntersections: unknown[];
      savedEntityIntersections: unknown[];
    };
  };
  rollbackReadiness: {
    status: string;
    operationCount: number;
    passedGuards: number;
    failedGuards: number;
    regionSnapshotSha256: string;
    exactLatestPostState: boolean;
  };
  boundary: {
    explicitlyNotCommissioned: string[];
    chamberExcavatedOrOpened: boolean;
    accessControlMechanismCommissioned: boolean;
    prohibitedDirectTerminalLinkOpened: boolean;
  };
  checks: Array<{ id: string; status: string }>;
  summary: {
    passed: boolean;
    checkCount: number;
    passCount: number;
    failCount: number;
  };
  safetyBoundary: {
    liveCallsPerformed: boolean;
    worldEditsPerformed: boolean;
    serviceMutationsPerformed: boolean;
    readOnlyImmutableAnvilInputs: boolean;
  };
}

function readReport(filename = CANONICAL_JSON): CommissioningReport {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as CommissioningReport;
}

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--generated-at',
    '2026-08-21T16:59:00Z',
    '--out',
    temporaryJson,
    '--markdown',
    temporaryMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones CZ-R12A Cheyenne gallery hold-point commissioning', () => {
  it('regenerates the sealed reports byte-for-byte', () => {
    expect(fs.readFileSync(temporaryJson)).toEqual(fs.readFileSync(CANONICAL_JSON));
    expect(fs.readFileSync(temporaryMarkdown)).toEqual(fs.readFileSync(CANONICAL_MARKDOWN));
  });

  it('binds a named R12 scope to the latest accepted physical state and R10A as-built seal', () => {
    expect(readReport()).toMatchObject({
      status: 'PASS_R12A_CHEYENNE_GALLERY_HOLD_POINT_CIRCULATION_COMMISSIONED',
      commissioningPayloadSha256:
        'a83dcfbf9971c896d12841588bec51699c77bd83665491f1ba090e4ec7b90dd1',
      release: {
        releaseNodeId: 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING',
        commissioningScopeId: 'CZ-R12A-Z10-CHEYENNE-GALLERY-HOLD-POINT-CIRCULATION',
        mvpScope: true,
        functionalDisposition: 'PASSIVE_PEDESTRIAN_CIRCULATION_TO_FAIL_CLOSED_HOLD_POINT',
      },
      bindings: {
        latestLedger: {
          sha256: 'abe19a3b54bab135be81b550838060b6e6f52c3cd3f6f4f316a34e783e1b76df',
        },
        sourceLedger: {
          sha256: '84ddf28bc2127850eaf77546715feac3a3644d40571bc6b170f817b821091058',
        },
        sourcePostQa: {
          sha256: 'ab865fa7729e315f4e58804cbaf98f999e84e7bb3f13aa7b494025091543a0b2',
        },
        latestPhysicalState: {
          completeSaveSha256:
            'c405342d83f0c4ae8d97a82667542e1d5c22a893cdc9ee2bb0c8b9bfc9f03d8d',
          regionSnapshotSha256:
            '1064385570cec59ba3ef62d455664ad84bf23a7074bfd26cfc133dd25b8e52d1',
        },
        sourceAsBuiltQaPayloadSha256:
          '88db997f951847d624608eba8a0a20800c9bb5631b4334ff23bf2f56323ee60a',
      },
    });
  });

  it('proves exact route, finish, pedestrian clearance, and endpoint geometry', () => {
    const report = readReport();
    expect(report.geometry).toMatchObject({
      centerline: { stationCount: 33, longitudinalStepCount: 32 },
      route: {
        cellCount: 660,
        coordinateSetSha256:
          'eaeb38e78705d7ef7643fa24bb73ad4fa8cf6db2cbf17aaf39db4707e1656e67',
      },
      upstreamPlane: {
        cellCount: 20,
        coordinateSetSha256:
          'a81b847db2f772e829db60d99ef4b6160007c0a734073964ff72cdff4926c0f9',
      },
      routeWithUpstream: {
        cellCount: 680,
        coordinateSetSha256:
          '57651955a2b69a260803ab3563bb33ffe4e9d75424c80286b5c64f6100938074',
      },
      pedestrianClearance: {
        cellCount: 297,
        coordinateSetSha256:
          '4a2cc697298fc4402bdcfa34e65512db6288d4277fab6df43c3180281ca0f462',
      },
      liner: {
        cellCount: 594,
        coordinateSetSha256:
          'ff2aa8d4b508943a2f65c86559dbb800bf5758835f455a62cf764f2ca67519e8',
      },
      terminusCap: {
        cellCount: 20,
        coordinateSetSha256:
          'd769b5ca3cea821d9a9d5ea12270cf0946e179ba05d65b3bd312ed41e083db4b',
      },
    });
    expect(report.observedState).toMatchObject({
      liner: {
        matchingCellCount: 594,
        mismatchCellCount: 0,
        stateCensus: {
          'minecraft:polished_granite': 398,
          'minecraft:smooth_stone': 155,
          'minecraft:polished_blackstone_bricks': 36,
          'minecraft:sea_lantern': 5,
        },
      },
      route: {
        matchingCellCount: 660,
        mismatchCellCount: 0,
        stateCensus: { 'minecraft:air': 660 },
      },
      upstreamPlane: { matchingCellCount: 20, mismatchCellCount: 0 },
      terminusCap: { matchingCellCount: 20, mismatchCellCount: 0 },
      routeConnectivity: { componentCount: 1, largestComponentCellCount: 680 },
      pedestrianClearance: { matchingCellCount: 297, mismatchCellCount: 0 },
    });
  });

  it('verifies the walking surface, enclosure, deterministic light cadence, and clean halo', () => {
    const observed = readReport().observedState;
    expect(observed.walkingSurface).toMatchObject({
      cellCount: 165,
      acceptedContinuousSurface: true,
    });
    expect(observed.ceiling).toMatchObject({
      cellCount: 165,
      acceptedContinuousEnclosure: true,
    });
    expect(observed.lighting).toEqual(expect.objectContaining({
      fixtureCount: 5,
      longitudinalGaps: [2, 6, 6, 6, 6, 6],
      maximumLongitudinalSpacing: 6,
    }));
    expect(observed.haloClearance).toEqual({
      fluidIntersections: [],
      containerOrControlIntersections: [],
      blockEntityIntersections: [],
      savedEntityIntersections: [],
    });
  });

  it('keeps the direct-terminal interface fail-closed and proves latest-post rollback readiness', () => {
    const report = readReport();
    expect(report.rollbackReadiness).toEqual({
      status: 'PASS',
      operationCount: 594,
      passedGuards: 594,
      failedGuards: 0,
      regionSnapshotSha256:
        '1064385570cec59ba3ef62d455664ad84bf23a7074bfd26cfc133dd25b8e52d1',
      exactLatestPostState: true,
    });
    expect(report.boundary).toMatchObject({
      chamberExcavatedOrOpened: false,
      accessControlMechanismCommissioned: false,
      prohibitedDirectTerminalLinkOpened: false,
    });
    expect(report.boundary.explicitlyNotCommissioned).toContain(
      'Cheyenne secure circulation direct terminal link',
    );
  });

  it('passes every acceptance check without a live call or mutation', () => {
    const report = readReport();
    expect(report.summary).toEqual({
      passed: true,
      checkCount: 12,
      passCount: 12,
      failCount: 0,
      routeAirCellCount: 660,
      upstreamAirCellCount: 20,
      pedestrianClearanceAirCellCount: 297,
      linerExactCellCount: 594,
      holdPointStoneCellCount: 20,
      rollbackGuardPassCount: 594,
    });
    expect(report.checks).toHaveLength(12);
    expect(report.checks.every(({ status }) => status === 'PASS')).toBe(true);
    expect(report.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      serviceMutationsPerformed: false,
      readOnlyImmutableAnvilInputs: true,
    });
  });
});
