import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const COMMITTED_JSON = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d05-relic-condition-access-survey.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d05-relic-condition-access-survey.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-d05-s01-'));
const regeneratedJson = path.join(tempDir, 'survey.json');
const regeneratedMarkdown = path.join(tempDir, 'survey.md');

interface RouteCandidate {
  status: string;
  reason?: string;
  pathCellCount?: number;
  orderedPathSha256?: string;
  pathStateSha256?: string;
  maximumRiseBlocks?: number;
  maximumDropBlocks?: number;
  minimumHorizontalDistanceFromPlanningExclusionBlocks?: number;
  entersPlanningExclusion?: boolean;
  authorization?: boolean;
}

interface SurveyRelic {
  relicKey: string;
  surveyCellCount: number;
  recordedCore: { fullStateSetSha256: string };
  presentFabricCondition: {
    status: string;
    presentCellCount: number;
    sixConnectedComponentCount: number;
    airExposedPresentCellCount: number;
    fluidAdjacentPresentCellCount: number;
    presentCoordinateSetSha256: string;
    presentStateSetSha256: string;
  };
  directBelowContactCensus: {
    footprintColumnCount: number;
    presentBelowCellCount: number;
    airBelowCellCount: number;
    fluidBelowCellCount: number;
  };
  recordedFootprintUnderlayContext: {
    footprintColumnCount: number;
    presentUnderlayCellCount: number;
    airUnderlayCellCount: number;
    fluidUnderlayCellCount: number;
    nearestPresentBelowColumnCount: number;
    columnsWithoutPresentBelowInSurvey: number;
    clearBlocksBelowCore: { minimum: number; maximum: number } | null;
  };
  localVoidCensus: {
    airCellCount: number;
    sixConnectedComponentCount: number;
    coreIntersectingComponentCount: number;
    boundaryConnectedCoreVoidCellCount: number;
  };
  protectedInventoryCensus: {
    coreBlockEntityCount: number;
    coreBlockEntities: Array<{ id: string; x: number; y: number; z: number }>;
    nbtPayloadInspected: boolean;
  };
  entranceCandidateCensus: {
    exactDoorGateTrapdoorCellCount: number;
    twoBlockClearBoundaryThresholdCount: number;
    entranceEstablished: boolean;
  };
  observationCandidateCensus: {
    standableCellCountOutsidePlanningExclusion: number;
    nearestStandableContext: {
      point: { x: number; y: number; z: number };
      horizontalDistanceFromRecordedCoreBlocks: number;
      verticalDeltaFromCoreMinimumY: number;
    } | null;
    geometricStandableCandidateCount: number;
    exactAirSightlineCandidateCount: number;
    route: RouteCandidate;
    observationAccessAuthorized: boolean;
  };
}

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  worldEditAuthorized: boolean;
  constructionOwnershipAuthorized: boolean;
  observationAccessAuthorized: boolean;
  operationCellCount: number;
  materialCellCount: number;
  sourceBindings: Record<string, {
    path: string;
    bytes?: number;
    sha256: string;
    regionFileCount?: number;
  }>;
  relics: SurveyRelic[];
  d05S01Disposition: {
    surveyId: string;
    status: string;
    completedRelicRecords: string[];
    exactObservationRouteCandidateCount: number;
    remainingEvidence: string[];
    d05Resolved: boolean;
    g02Passed: boolean;
    g06Passed: boolean;
    g07Passed: boolean;
    worldEditAuthorized: boolean;
    constructionOwnershipAuthorized: boolean;
    observationAccessAuthorized: boolean;
    operationCellCount: number;
    materialCellCount: number;
  };
}

function readReport(): Report {
  return JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as Report;
}

function sha256File(filename: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function relic(report: Report, relicKey: string): SurveyRelic {
  const item = report.relics.find((candidate) => candidate.relicKey === relicKey);
  if (!item) throw new Error(`missing relic ${relicKey}`);
  return item;
}

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      '--max-old-space-size=4096',
      'scripts/audit_combined_zones_d05_relic_condition_access.mjs',
      '--out',
      regeneratedJson,
      '--markdown',
      regeneratedMarkdown,
    ],
    { cwd: ROOT, stdio: 'pipe', maxBuffer: 4 * 1024 * 1024 },
  );
}, 60_000);

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones D05-S01 relic condition and access survey', () => {
  it('regenerates byte-identical evidence bound to the immutable source chain', () => {
    expect(fs.readFileSync(regeneratedJson).equals(fs.readFileSync(COMMITTED_JSON))).toBe(true);
    expect(fs.readFileSync(regeneratedMarkdown).equals(fs.readFileSync(COMMITTED_MARKDOWN)))
      .toBe(true);

    const report = readReport();
    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-d05-relic-condition-access-survey',
      status: 'D05_S01_OFFLINE_SURVEY_COMPLETE_D05_G06_HOLD',
      worldEditAuthorized: false,
      constructionOwnershipAuthorized: false,
      observationAccessAuthorized: false,
      operationCellCount: 0,
      materialCellCount: 0,
    });
    for (const source of Object.values(report.sourceBindings)) {
      if (source.regionFileCount !== undefined) continue;
      const filename = path.join(ROOT, source.path);
      expect(fs.statSync(filename).size, source.path).toBe(source.bytes);
      expect(sha256File(filename), source.path).toBe(source.sha256);
    }
    expect(report.sourceBindings.immutablePhase0PostRegionSnapshot).toMatchObject({
      path: 'data/worldsnap-combined-zones-phase0-rerun-post-20260804T021358Z/region',
      sha256: '05eebe12ba419abd75b80033c265daf452b652a575c912f6df497735e00d271b',
      regionFileCount: 51,
    });
  });

  it('freezes exact present-fabric and direct-contact facts', () => {
    const report = readReport();
    expect(report.relics.map((item) => ({
      key: item.relicKey,
      surveyCells: item.surveyCellCount,
      status: item.presentFabricCondition.status,
      present: item.presentFabricCondition.presentCellCount,
      components: item.presentFabricCondition.sixConnectedComponentCount,
      exposed: item.presentFabricCondition.airExposedPresentCellCount,
      fluidAdjacent: item.presentFabricCondition.fluidAdjacentPresentCellCount,
      footprint: item.directBelowContactCensus.footprintColumnCount,
      below: [
        item.directBelowContactCensus.presentBelowCellCount,
        item.directBelowContactCensus.airBelowCellCount,
        item.directBelowContactCensus.fluidBelowCellCount,
      ],
    }))).toEqual([
      {
        key: 'igloo-east',
        surveyCells: 70_200,
        status: 'NO_PRESENT_FABRIC_IN_RECORDED_CORE',
        present: 0,
        components: 0,
        exposed: 0,
        fluidAdjacent: 0,
        footprint: 0,
        below: [0, 0, 0],
      },
      {
        key: 'igloo-west',
        surveyCells: 70_200,
        status: 'PRESENT_FABRIC_EXACT_LOCAL_CONDITION_CENSUS',
        present: 187,
        components: 1,
        exposed: 117,
        fluidAdjacent: 0,
        footprint: 56,
        below: [56, 0, 0],
      },
      {
        key: 'shipwreck',
        surveyCells: 120_540,
        status: 'PRESENT_FABRIC_EXACT_LOCAL_CONDITION_CENSUS',
        present: 1_118,
        components: 1,
        exposed: 606,
        fluidAdjacent: 0,
        footprint: 212,
        below: [96, 116, 0],
      },
    ]);
    expect(relic(report, 'igloo-west').presentFabricCondition).toMatchObject({
      presentCoordinateSetSha256:
        '960dc310f44bdcc24af2fea84a7c4424e4c62f176adc07857aac4f87e4c9b5c9',
      presentStateSetSha256:
        '7dc51fa6d179d11beb8f69000f18b13f8a93d018b6ae172bca691ba8910c9955',
    });
    expect(relic(report, 'shipwreck').presentFabricCondition).toMatchObject({
      presentCoordinateSetSha256:
        '87c356ae6562eb2deca5d30c0ac414c39969e91f77a9761f265f023c52fafc1b',
      presentStateSetSha256:
        '9214943e9ef3bf1ee6cd73201b6d06916194ca03ea76a2cb10e26f075c6bb9ac',
    });
  });

  it('confirms the absent east site and exact local terrain/void context', () => {
    const east = relic(readReport(), 'igloo-east');
    expect(east.recordedCore.fullStateSetSha256)
      .toBe('07f62b685669b3c23441c2867483cdf632defd3aaf1854d0ffe3a631841d71ea');
    expect(east.recordedFootprintUnderlayContext).toMatchObject({
      footprintColumnCount: 56,
      presentUnderlayCellCount: 0,
      airUnderlayCellCount: 56,
      fluidUnderlayCellCount: 0,
      nearestPresentBelowColumnCount: 0,
      columnsWithoutPresentBelowInSurvey: 56,
      clearBlocksBelowCore: null,
    });
    expect(east.localVoidCensus).toMatchObject({
      airCellCount: 70_139,
      sixConnectedComponentCount: 1,
      coreIntersectingComponentCount: 1,
      boundaryConnectedCoreVoidCellCount: 70_139,
    });
    expect(east.observationCandidateCensus).toMatchObject({
      standableCellCountOutsidePlanningExclusion: 46,
      nearestStandableContext: {
        point: { x: 2323, y: 74, z: -1007 },
        horizontalDistanceFromRecordedCoreBlocks: 13,
        verticalDeltaFromCoreMinimumY: -16,
      },
      geometricStandableCandidateCount: 0,
      exactAirSightlineCandidateCount: 0,
      route: {
        status: 'NO_CANDIDATE',
        reason: 'NO_AIR_SIGHTLINE_OBSERVATION_CELLS',
      },
      observationAccessAuthorized: false,
    });
  });

  it('binds local protected inventory and labels thresholds as candidates only', () => {
    const report = readReport();
    expect(relic(report, 'igloo-west').protectedInventoryCensus).toMatchObject({
      coreBlockEntityCount: 3,
      coreBlockEntities: [
        { id: 'minecraft:furnace', x: 1793, y: 63, z: -921 },
        { id: 'minecraft:bed', x: 1794, y: 63, z: -925 },
        { id: 'minecraft:bed', x: 1795, y: 63, z: -925 },
      ],
      nbtPayloadInspected: false,
    });
    expect(relic(report, 'shipwreck').protectedInventoryCensus).toMatchObject({
      coreBlockEntityCount: 3,
      coreBlockEntities: [
        { id: 'minecraft:chest', x: 2075, y: 71, z: -659 },
        { id: 'minecraft:chest', x: 2082, y: 74, z: -658 },
        { id: 'minecraft:chest', x: 2091, y: 74, z: -657 },
      ],
      nbtPayloadInspected: false,
    });
    expect(report.relics.map((item) => ({
      key: item.relicKey,
      mechanismCells: item.entranceCandidateCensus.exactDoorGateTrapdoorCellCount,
      thresholds: item.entranceCandidateCensus.twoBlockClearBoundaryThresholdCount,
      entrance: item.entranceCandidateCensus.entranceEstablished,
    }))).toEqual([
      { key: 'igloo-east', mechanismCells: 0, thresholds: 0, entrance: false },
      { key: 'igloo-west', mechanismCells: 0, thresholds: 28, entrance: false },
      { key: 'shipwreck', mechanismCells: 14, thresholds: 8, entrance: false },
    ]);
  });

  it('keeps observation routes outside the exclusion and every project gate closed', () => {
    const report = readReport();
    const westRoute = relic(report, 'igloo-west').observationCandidateCensus.route;
    const shipwreckRoute = relic(report, 'shipwreck').observationCandidateCensus.route;
    expect(westRoute).toMatchObject({
      status: 'EXACT_OFFLINE_OBSERVATION_ROUTE_CANDIDATE',
      pathCellCount: 14,
      orderedPathSha256:
        '8f936a251b265e63bc087dc2c292e8e1a9a7c9131b8567b7439495dbe39e26e1',
      pathStateSha256:
        'f033deff781943b013bae972f3d7572b39cf196c3d884add6686515d1a814051',
      maximumRiseBlocks: 1,
      maximumDropBlocks: 1,
      minimumHorizontalDistanceFromPlanningExclusionBlocks: 2,
      entersPlanningExclusion: false,
      authorization: false,
    });
    expect(shipwreckRoute).toMatchObject({
      status: 'EXACT_OFFLINE_OBSERVATION_ROUTE_CANDIDATE',
      pathCellCount: 19,
      orderedPathSha256:
        '09a9fb115fbcf2c19d8a9a522f5c9d1e4099829a023c6ea3dfc9317213ba3800',
      pathStateSha256:
        '81f011737677d9070297eaa754609ca7dfa64fc3e93d41d715ce811c68d5945d',
      maximumRiseBlocks: 1,
      maximumDropBlocks: 1,
      minimumHorizontalDistanceFromPlanningExclusionBlocks: 4,
      entersPlanningExclusion: false,
      authorization: false,
    });
    expect(report.d05S01Disposition).toEqual(expect.objectContaining({
      surveyId: 'D05-S01-RELIC-CONDITION-AND-ACCESS',
      status: 'PASS_OFFLINE_SURVEY_EVIDENCE',
      completedRelicRecords: ['igloo-east', 'igloo-west', 'shipwreck'],
      exactObservationRouteCandidateCount: 2,
      d05Resolved: false,
      g02Passed: false,
      g06Passed: false,
      g07Passed: false,
      worldEditAuthorized: false,
      constructionOwnershipAuthorized: false,
      observationAccessAuthorized: false,
      operationCellCount: 0,
      materialCellCount: 0,
    }));
    expect(report.d05S01Disposition.remainingEvidence).toHaveLength(5);
  });
});
