import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_grand_avenue_subsurface_alternatives.mjs',
);
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-grand-avenue-subsurface-alternatives.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-grand-avenue-subsurface-alternatives.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-grand-avenue-'));
const regeneratedJson = path.join(tempDir, 'subsurface-alternatives.json');
const regeneratedMarkdown = path.join(tempDir, 'subsurface-alternatives.md');

interface FileBinding {
  path: string;
  sha256: string;
  bytes: number;
  role: string;
}

interface SnapshotBinding {
  path: string;
  sha256: string;
  regionFileCount: number;
  bytes: number;
  algorithm: string;
}

interface CellCensus {
  minY: number;
  maxY: number;
  cellCount: number;
  coordinateSetSha256: string;
  blockStateSetSha256: string;
  airCellCount: number;
  presentCellCount: number;
  gravitySensitiveCellCount: number;
  fluidCells: {
    water: number;
    lava: number;
    waterlogged: number;
  };
}

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  authorityBoundary: {
    planningRecommendationPreparedAutonomously: boolean;
    soleOwnerApprovalRecordedHere: boolean;
    b11OwnerApprovalStatus: string;
  };
  safetyBoundary: {
    offlineOnly: boolean;
    immutableCopiedAnvilOnly: boolean;
    liveCallsPerformed: unknown[];
    proposedFutureStateRecords: unknown[];
    operationCells: unknown[];
    materialCells: unknown[];
    operationCellCount: number;
    materialCellCount: number;
    constructionCellCount: number;
    acceptedFutureCellCount: number;
    canonicalOwnersAssigned: number;
    acceptedInterfaceContracts: number;
    executable: boolean;
    constructionAuthorized: boolean;
    worldEditAuthorized: boolean;
  };
  sourceBindings: Record<string, FileBinding | SnapshotBinding>;
  b11SurfaceControl: {
    owner: string;
    pointCount: number;
    horizontalStepCount: number;
    start: { station: number; x: number; y: number; z: number };
    end: { station: number; x: number; y: number; z: number };
    riseStations: Array<{ station: number; x: number; y: number; z: number }>;
    crossSectionBlocks: number;
    exactCrossSectionSideBiasAvailable: boolean;
    centerlineSha256: string;
  };
  exactRouteSpecificScreening: {
    chunkCoverage: { requiredChunkCount: number; missingChunkCount: number };
    conservativeFootprint: {
      radiusBlocks: number;
      columnCount: number;
      bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
      coordinateSetSha256: string;
      exactConstructionFootprintAccepted: boolean;
    };
    fullHeightCurrentStateCensus: CellCensus;
    centerlineTerrainProfile: {
      pointCount: number;
      minimumTerrainY: number;
      maximumTerrainY: number;
      minimumRoadMinusTerrain: number;
      maximumRoadMinusTerrain: number;
      fillReferencePointCount: number;
      atTerrainReferencePointCount: number;
      cutReferencePointCount: number;
      fullHeightCenterlineWaterCellCount: number;
      fullHeightCenterlineLavaCellCount: number;
      manifestSha256: string;
      endpoints: Array<{
        station: number;
        y: number;
        terrainY: number;
        roadMinusTerrain: number;
      }>;
    };
    shallowHoustonCompatibleScreeningBand: CellCensus & {
      bounds: {
        minX: number;
        maxX: number;
        minZ: number;
        maxZ: number;
        minY: number;
        maxY: number;
      };
      columnsWithCandidateRoofAtOrAboveTerrain: number;
      exactShellGeometryAccepted: boolean;
      acceptedFutureStateCellCount: number;
    };
    houstonSampleCoordination: {
      centerlinePointCountInsideXZ: number;
      centerlineStationRange: { first: number; last: number };
      shallowScreeningBandIntersectionCellCount: number;
      intersectionCoordinateSetSha256: string;
      intersectionBlockStateSetSha256: string;
      exactPhysicalSeamAccepted: boolean;
    };
    generatedStructureScreening: {
      phase0GeneratedStartCount: number;
      reportedNearOrIntersectingStartCount: number;
      shallowBandBoundingIntersectionCellCount: number;
      records: Array<{
        id: string;
        footprintColumnIntersectionCount: number;
        shallowScreeningBandIntersectionCellCount: number;
      }>;
      exactPresentFabricClearanceAccepted: boolean;
    };
    protectedRelicScreening: {
      declaredRelicCount: number;
      screeningFootprintIntersectionColumnCount: number;
      records: Array<{
        key: string;
        positiveMarginStatus: string;
        screeningFootprintIntersectionColumnCount: number;
        nearestCenterlinePlanDistanceBlocks: number;
      }>;
      finalConstructionInfluenceClearanceAccepted: boolean;
    };
  };
  futureNetworkAndInterfaceContext: {
    c4: {
      nearestGrandAvenueCenterline: { distance: number };
      nearestGrandAvenueToPortal: { distance: number };
      openingState: string;
    };
    emptyEight: {
      nearestPlanDistanceFromGrandAvenueBlocks: number;
      nearestSealedFutureWall: { nearest: { distance: number } };
      futureInterfaceState: string;
    };
    passageWay: {
      passageWayEndpoint: null;
      proposedRouteCellCount: number;
      state: string;
    };
  };
  inheritedTechnicalLimitations: {
    d02: { status: string; openEvidenceGapCount: number; openEvidenceGaps: unknown[] };
    d06: { status: string; holdCriterionCount: number; holdCriteria: unknown[] };
    completeSaveAvailable: boolean;
    copiedRegionIncludesEntitiesPoiAndLevelDat: boolean;
  };
  alternatives: Array<{
    id: string;
    status: string;
    operationCellCount: number;
    worldEditAuthorized: boolean;
    exactShellGeometryAccepted?: boolean;
    acceptedFutureStateCellCount?: number;
  }>;
  controllingPlanningRecommendation: {
    reserveCorridorNow: boolean;
    roughShellDuringAvenueWorks: string;
    fullyFitOutNow: boolean;
    ifEvidenceIsNotReady: string;
  };
  passHoldMatrix: Array<{ id: string; status: string }>;
}

const readReport = (): Report => (
  JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as Report
);

beforeAll(() => {
  execFileSync(
    process.execPath,
    [SCRIPT, '--out', regeneratedJson, '--markdown', regeneratedMarkdown],
    { cwd: ROOT, stdio: 'pipe', maxBuffer: 4 * 1024 * 1024 },
  );
}, 60_000);

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones Grand Avenue subsurface no-foreclosure alternatives', () => {
  it('regenerates the committed JSON and Markdown byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
  });

  it('binds every controlling source and the immutable Phase 0 region identity', () => {
    const report = readReport();
    const snapshot = report.sourceBindings.immutablePhase0PostRegionSnapshot as SnapshotBinding;
    expect(snapshot).toMatchObject({
      path: 'data/worldsnap-combined-zones-phase0-rerun-post-20260804T021358Z/region',
      sha256: '05eebe12ba419abd75b80033c265daf452b652a575c912f6df497735e00d271b',
      regionFileCount: 51,
      bytes: 290946492,
    });

    for (const binding of Object.values(report.sourceBindings)) {
      if (!('role' in binding)) continue;
      const filename = path.join(ROOT, binding.path);
      expect(fs.statSync(filename).size, binding.path).toBe(binding.bytes);
      expect(crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex'))
        .toBe(binding.sha256);
    }
  });

  it('reproduces B11 exactly while keeping the unresolved lateral convention fail-closed', () => {
    const report = readReport();
    expect(report.b11SurfaceControl).toMatchObject({
      owner: 'Z03-GRAND-AVENUE',
      pointCount: 299,
      horizontalStepCount: 298,
      start: { station: 0, x: 1750, y: 68, z: -300 },
      end: { station: 298, x: 2048, y: 72, z: -328 },
      crossSectionBlocks: 8,
      exactCrossSectionSideBiasAvailable: false,
      centerlineSha256: 'e63b7779674ad46fd7ad9c4ae0aea8f618afa8b656d3a24aa4367057cf103ff4',
    });
    expect(report.b11SurfaceControl.riseStations.map(({ station }) => station))
      .toEqual([38, 112, 187, 261]);
    expect(report.exactRouteSpecificScreening.conservativeFootprint).toMatchObject({
      radiusBlocks: 4,
      columnCount: 2987,
      bounds: { minX: 1746, maxX: 2052, minZ: -332, maxZ: -296 },
      coordinateSetSha256: '5310b4bd3143d8eb7653b6ce87126f91de8f3256d20b12face0fcbe105d1a837',
      exactConstructionFootprintAccepted: false,
    });
  });

  it('records exact terrain, block, fluid, and shallow-band screening without accepting a shell', () => {
    const screen = readReport().exactRouteSpecificScreening;
    expect(screen.chunkCoverage).toEqual({
      requiredChunkCount: 33,
      missingChunkCount: 0,
      missingChunks: [],
    });
    expect(screen.fullHeightCurrentStateCensus).toMatchObject({
      minY: -64,
      maxY: 319,
      cellCount: 1147008,
      coordinateSetSha256: '644522074d77d913d7de7d77156b9b0b50b3bb07358cabe273b2610b03c9ab1a',
      blockStateSetSha256: 'f831f3da242ee8704517634bd6c496155eda16e38c2f9e5c432c75136b485364',
      airCellCount: 767317,
      presentCellCount: 379691,
      gravitySensitiveCellCount: 6610,
      fluidCells: { water: 5197, lava: 227, waterlogged: 1 },
    });
    expect(screen.fullHeightCurrentStateCensus.airCellCount
      + screen.fullHeightCurrentStateCensus.presentCellCount).toBe(1147008);
    expect(screen.centerlineTerrainProfile).toMatchObject({
      pointCount: 299,
      minimumTerrainY: 52,
      maximumTerrainY: 94,
      minimumRoadMinusTerrain: -23,
      maximumRoadMinusTerrain: 16,
      fillReferencePointCount: 101,
      atTerrainReferencePointCount: 22,
      cutReferencePointCount: 176,
      fullHeightCenterlineWaterCellCount: 576,
      fullHeightCenterlineLavaCellCount: 23,
      manifestSha256: '1b04c38736289585653851c4ff47d793072ab4b55c44b0de8329596f5e152edb',
    });
    expect(screen.centerlineTerrainProfile.endpoints).toMatchObject([
      { station: 0, y: 68, terrainY: 62, roadMinusTerrain: 6 },
      { station: 298, y: 72, terrainY: 88, roadMinusTerrain: -16 },
    ]);
    expect(screen.shallowHoustonCompatibleScreeningBand).toMatchObject({
      minY: 60,
      maxY: 71,
      cellCount: 23896,
      coordinateSetSha256: '040c0cf059f13bd409c4c2c969f23438da8dfe56b029a635eb38dc66335039f2',
      blockStateSetSha256: '8e0e6499049848b039e7bc83cc39d1d085ced7c1149d75d55aa5e7d562053518',
      airCellCount: 5621,
      presentCellCount: 18275,
      gravitySensitiveCellCount: 534,
      fluidCells: { water: 11, lava: 0, waterlogged: 0 },
      columnsWithCandidateRoofAtOrAboveTerrain: 1047,
      exactShellGeometryAccepted: false,
      acceptedFutureStateCellCount: 0,
    });
  });

  it('treats Houston, structures, relics, and future networks as constraints, never approvals', () => {
    const report = readReport();
    const screen = report.exactRouteSpecificScreening;
    expect(screen.houstonSampleCoordination).toMatchObject({
      centerlinePointCountInsideXZ: 13,
      centerlineStationRange: { first: 286, last: 298 },
      shallowScreeningBandIntersectionCellCount: 1296,
      intersectionCoordinateSetSha256: '8840f4d7bc4bf01231eb25853a327691c004b245a6b91927fa6b12ca5c66586f',
      intersectionBlockStateSetSha256: '80e9f6299a16e5746a6e021d066e90387a69fc5f68b5018efeb6b2fe1b18c73d',
      exactPhysicalSeamAccepted: false,
    });
    expect(screen.generatedStructureScreening).toMatchObject({
      phase0GeneratedStartCount: 114,
      reportedNearOrIntersectingStartCount: 3,
      shallowBandBoundingIntersectionCellCount: 0,
      exactPresentFabricClearanceAccepted: false,
    });
    expect(screen.generatedStructureScreening.records.map(({ id }) => id))
      .toEqual(['minecraft:mineshaft', 'minecraft:trial_chambers', 'minecraft:mineshaft']);
    expect(screen.protectedRelicScreening).toMatchObject({
      declaredRelicCount: 3,
      screeningFootprintIntersectionColumnCount: 0,
      finalConstructionInfluenceClearanceAccepted: false,
    });
    expect(screen.protectedRelicScreening.records.every(
      ({ positiveMarginStatus }) => positiveMarginStatus === 'HOLD_NOT_FROZEN',
    )).toBe(true);
    expect(report.futureNetworkAndInterfaceContext).toMatchObject({
      c4: {
        nearestGrandAvenueCenterline: { distance: 52.153619 },
        nearestGrandAvenueToPortal: { distance: 87.464278 },
        openingState: 'SEALED',
      },
      emptyEight: {
        nearestPlanDistanceFromGrandAvenueBlocks: 340,
        nearestSealedFutureWall: { nearest: { distance: 363.411612 } },
        futureInterfaceState: 'sealed-owned-interface-walls',
      },
      passageWay: {
        passageWayEndpoint: null,
        proposedRouteCellCount: 0,
        state: 'DEFAULT_DENY_UNEVIDENCED',
      },
    });
  });

  it('selects reserve-now, conditions any pre-road shell, and rejects fit-out', () => {
    const report = readReport();
    expect(report.inheritedTechnicalLimitations).toMatchObject({
      d02: { status: 'HOLD', openEvidenceGapCount: 8 },
      d06: { status: 'HOLD', holdCriterionCount: 9 },
      completeSaveAvailable: false,
      copiedRegionIncludesEntitiesPoiAndLevelDat: false,
    });
    expect(report.inheritedTechnicalLimitations.d02.openEvidenceGaps).toHaveLength(8);
    expect(report.inheritedTechnicalLimitations.d06.holdCriteria).toHaveLength(9);
    expect(report.alternatives.map(({ id, status }) => ({ id, status }))).toEqual([
      {
        id: 'GA-U0-RESERVE-ONLY-NO-FORECLOSURE',
        status: 'SELECTED_CONTROLLING_RECOMMENDATION_NOW',
      },
      {
        id: 'GA-U1-SEALED-ROUGH-SHELL-BEFORE-ROAD',
        status: 'CONDITIONAL_HOLD_NOT_AUTHORIZED',
      },
      {
        id: 'GA-U2-FULL-FITOUT-NOW',
        status: 'NOT_RECOMMENDED_HOLD',
      },
    ]);
    expect(report.controllingPlanningRecommendation).toMatchObject({
      reserveCorridorNow: true,
      roughShellDuringAvenueWorks: 'CONDITIONAL_ONLY_IF_COMPLETE_TECHNICAL_ACCEPTANCE_PRECEDES_THE_ROAD',
      fullyFitOutNow: false,
    });
    expect(report.controllingPlanningRecommendation.ifEvidenceIsNotReady).toContain('Build no tunnel');
  });

  it('remains a zero-operation planning recommendation with every physical gate held', () => {
    const report = readReport();
    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-grand-avenue-subsurface-alternatives',
      status: 'RESERVE_NOW_CONDITIONAL_SEALED_SHELL_BEFORE_ROAD_NO_FITOUT_ZERO_OPERATIONS',
      authorityBoundary: {
        planningRecommendationPreparedAutonomously: true,
        soleOwnerApprovalRecordedHere: false,
        b11OwnerApprovalStatus: 'PENDING',
      },
      safetyBoundary: {
        offlineOnly: true,
        immutableCopiedAnvilOnly: true,
        liveCallsPerformed: [],
        proposedFutureStateRecords: [],
        operationCells: [],
        materialCells: [],
        operationCellCount: 0,
        materialCellCount: 0,
        constructionCellCount: 0,
        acceptedFutureCellCount: 0,
        canonicalOwnersAssigned: 0,
        acceptedInterfaceContracts: 0,
        executable: false,
        constructionAuthorized: false,
        worldEditAuthorized: false,
      },
    });
    expect(report.alternatives.every(
      ({ operationCellCount, worldEditAuthorized }) => (
        operationCellCount === 0 && worldEditAuthorized === false
      ),
    )).toBe(true);
    expect(report.passHoldMatrix.map(({ status }) => status)).toEqual([
      'PASS',
      'PASS_QUALIFIED_REGION_ONLY',
      'PASS_RECOMMENDATION_ONLY',
      'HOLD',
      'HOLD',
      'HOLD',
      'HOLD',
      'HOLD',
    ]);
  });
});
