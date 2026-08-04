import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const GENERATED_AT = '2026-08-04T22:12:00Z';
const COMMITTED_JSON = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d02-s03-hydrology-outfalls.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d02-s03-hydrology-outfalls.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-d02-s03-'));
const regeneratedJson = path.join(tempDir, 'hydrology.json');
const regeneratedMarkdown = path.join(tempDir, 'hydrology.md');

interface ProfileEvidence {
  stationCount: number;
  minimumY: number;
  maximumY: number;
  riseEdges: number;
  fallEdges: number;
  levelEdges: number;
  localMinimumRuns: Array<{
    startStation: number;
    endStation: number;
    datumY: number;
    kind: string;
  }>;
  continuousOneWayGravityOutlet: boolean;
}

interface CollectionSystem {
  offsetsInclusive: number[];
  columnCount: number;
  columnSetSha256: string;
  profile: ProfileEvidence;
  datumEvidence: {
    datumCellCount: number;
    datumCellSetSha256: string;
    currentStateSetSha256: string;
    currentWaterFamilyCells: number;
    currentLavaCells: number;
    sameOrFaceAdjacentComponentIds: string[];
  };
  gravityLowInterfaces: Array<{
    id: string;
    interfaceCellCount: number;
    sameOrFaceAdjacentComponentIds: string[];
  }>;
  status: string;
}

interface HydrologyReport {
  schemaVersion: number;
  id: string;
  status: string;
  safetyBoundary: {
    mutableProseDependencies: unknown[];
    r00Dependencies: unknown[];
    liveCallsPerformed: unknown[];
    databasesOpened: unknown[];
    operationCells: unknown[];
    materialCells: unknown[];
    operationCellCount: number;
    worldEditAuthorized: boolean;
    diversionAuthorized: boolean;
    d02Resolved: boolean;
    d02B03Resolved: boolean;
  };
  sourceBindings: Array<{ path: string; sha256: string; bytes: number }>;
  immutableEvidenceIdentity: {
    regionSnapshot: { sha256: string; regionFileCount: number; bytes: number };
    regionOnly: boolean;
    completeCopiedSaveAvailable: boolean;
    c1LandTake: { columnCount: number; columnSetSha256: string };
    selectedNoDiversionRule: {
      selectionId: string;
      selection: string;
      technicalAcceptanceClaimed: boolean;
      criteria: string[];
    };
  };
  studyDomain: {
    coreTouchedChunkCount: number;
    haloChunkCount: number;
    haloChunkSetSha256: string;
    surveyedCellCount: number;
    missingChunkCount: number;
    topologyBoundary: string;
  };
  currentFluidComponents: {
    water: {
      componentCount: number;
      cellCount: number;
      manifestSha256: string;
      boundaryTruncatedComponentCount: number;
    };
    lava: {
      componentCount: number;
      cellCount: number;
      manifestSha256: string;
      boundaryTruncatedComponentCount: number;
    };
    landTakeIntersections: {
      componentCount: number;
      waterComponentCount: number;
      lavaComponentCount: number;
      waterCellCount: number;
      lavaCellCount: number;
      components: Array<{
        id: string;
        family: string;
        landTakeCellCount: number;
        coordinateSetSha256: string;
      }>;
    };
  };
  collectionSystems: {
    roadSouthDrain: CollectionSystem;
    railNorthCess: CollectionSystem;
    interpretation: string;
  };
  receiverEvaluation: {
    candidateCount: number;
    candidates: unknown[];
    acceptedReceiverCount: number;
    acceptedReceivers: unknown[];
    selectedOutfall: unknown;
    decision: string;
    reasons: string[];
  };
  d05Interface: {
    c1LandTakeMaxX: number;
    mountainHydrologyPrismMinX: number;
    clearPlanColumns: number;
    directPlanContact: boolean;
    currentMountainWaterComponentCount: number;
    currentMountainWaterComponentManifestSha256: string;
    status: string;
  };
  evidenceImpact: {
    exactCurrentC1FluidTopologyFrozen: boolean;
    exactCollectionCoordinationDatumsFrozen: boolean;
    acceptableOutfallFrozen: boolean;
    rainfallCapacityClaimed: boolean;
    groundwaterClaimed: boolean;
    snowmeltCapacityClaimed: boolean;
    consentClaimed: boolean;
    diversionAuthorized: boolean;
    d02B03Status: string;
    d02Resolved: boolean;
    r00Ready: boolean;
  };
  remainingBlockers: string[];
  finalGate: { status: string; worldEditAuthorized: boolean };
}

function readReport(filename: string): HydrologyReport {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as HydrologyReport;
}

function sha256File(relativePath: string): string {
  return crypto.createHash('sha256')
    .update(fs.readFileSync(path.join(ROOT, relativePath)))
    .digest('hex');
}

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      '--max-old-space-size=4096',
      'scripts/audit_combined_zones_d02_s03_hydrology_outfalls.mjs',
      '--out', regeneratedJson,
      '--markdown', regeneratedMarkdown,
      '--generated-at', GENERATED_AT,
    ],
    { cwd: ROOT, stdio: 'pipe', maxBuffer: 1024 * 1024 },
  );
}, 90_000);

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones D02-S03 C1 hydrology and outfalls', () => {
  it('regenerates the committed JSON and Markdown byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
  });

  it('binds only finalized machine evidence and the selected no-diversion rule', () => {
    const report = readReport(COMMITTED_JSON);

    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-d02-s03-hydrology-outfalls',
      status: 'PARTIAL_PASS_EXACT_CURRENT_COMPONENTS_NO_ACCEPTABLE_OUTFALL_D02_HOLD',
      immutableEvidenceIdentity: {
        regionSnapshot: {
          sha256: '05eebe12ba419abd75b80033c265daf452b652a575c912f6df497735e00d271b',
          regionFileCount: 51,
          bytes: 290946492,
        },
        regionOnly: true,
        completeCopiedSaveAvailable: false,
        c1LandTake: {
          columnCount: 80363,
          columnSetSha256: 'a236f24b9371f8fdedca66416109aacd11a2101ffe1c1a1b80117ab027909d70',
        },
        selectedNoDiversionRule: {
          selectionId: 'SEL-D05-ZERO-UNDECLARED-CHANGE',
          selection: 'ADOPT_ZERO_UNDECLARED_CHANGE_AND_DEFAULT_NO_DIVERSION',
          technicalAcceptanceClaimed: false,
        },
      },
    });
    expect(report.sourceBindings).toHaveLength(5);
    expect(report.sourceBindings.map((binding) => binding.path)).toEqual([
      'masterplans/05-combined-zones/phase1-d02-s01-s02-region-evidence.json',
      'masterplans/05-combined-zones/phase1-c1-civil-design.json',
      'masterplans/05-combined-zones/phase1-d05-hydrology-relic-buffer-design.json',
      'masterplans/05-combined-zones/phase1-d05-conservative-defaults.json',
      'masterplans/05-combined-zones/phase0-survey-evidence.json',
    ]);
    expect(report.sourceBindings.every((binding) => (
      !binding.path.endsWith('.md')
      && !binding.path.includes('r00')
      && !binding.path.includes('release-contract')
    ))).toBe(true);
    for (const binding of report.sourceBindings) {
      expect(sha256File(binding.path)).toBe(binding.sha256);
      expect(fs.statSync(path.join(ROOT, binding.path)).size).toBe(binding.bytes);
    }
    expect(report.immutableEvidenceIdentity.selectedNoDiversionRule.criteria.length)
      .toBeGreaterThan(4);
  });

  it('freezes exact current components in the complete region study domain', () => {
    const report = readReport(COMMITTED_JSON);

    expect(report.studyDomain).toEqual(expect.objectContaining({
      coreTouchedChunkCount: 437,
      haloChunkCount: 639,
      haloChunkSetSha256: '62661469d94029e3674554b6846ba48c10a967ac32055794a0cc941e1ecde288',
      surveyedCellCount: 62816256,
      missingChunkCount: 0,
    }));
    expect(report.studyDomain.topologyBoundary).toContain('boundary-truncated');
    expect(report.currentFluidComponents.water).toEqual({
      componentCount: 1458,
      cellCount: 175220,
      manifestSha256: '84f9ae4a53b04c9d61dcc2cc687a8fbc2465e38e8bf07415765a8c72c0437964',
      boundaryTruncatedComponentCount: 107,
    });
    expect(report.currentFluidComponents.lava).toEqual({
      componentCount: 269,
      cellCount: 19518,
      manifestSha256: '97502606ef28dde3993d4c9b6a1dfddab3c52db015b0f5b9bc3a2af9fa1969b7',
      boundaryTruncatedComponentCount: 39,
    });
    expect(report.currentFluidComponents.landTakeIntersections).toEqual(expect.objectContaining({
      componentCount: 864,
      waterComponentCount: 709,
      lavaComponentCount: 155,
      waterCellCount: 70569,
      lavaCellCount: 11178,
    }));
    expect(report.currentFluidComponents.landTakeIntersections.components).toHaveLength(864);
    expect(report.currentFluidComponents.landTakeIntersections.components.every((component) => (
      component.landTakeCellCount > 0 && /^[0-9a-f]{64}$/.test(component.coordinateSetSha256)
    ))).toBe(true);

    const s01 = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'masterplans/05-combined-zones/phase1-d02-s01-s02-region-evidence.json'),
      'utf8',
    )) as { d02S01: { c1FullHeight: { stateCensus: { waterCells: number; waterloggedCells: number; lavaCells: number } } } };
    expect(report.currentFluidComponents.landTakeIntersections.waterCellCount)
      .toBe(s01.d02S01.c1FullHeight.stateCensus.waterCells
        + s01.d02S01.c1FullHeight.stateCensus.waterloggedCells);
    expect(report.currentFluidComponents.landTakeIntersections.lavaCellCount)
      .toBe(s01.d02S01.c1FullHeight.stateCensus.lavaCells);
  });

  it('proves the frozen collection datums do not form one-way gravity outlets', () => {
    const report = readReport(COMMITTED_JSON);
    const road = report.collectionSystems.roadSouthDrain;
    const rail = report.collectionSystems.railNorthCess;

    expect(road).toMatchObject({
      offsetsInclusive: [18, 19],
      columnCount: 1994,
      columnSetSha256: '043f60589073811018474ef23e69c9f90dea7d5a7dd9ef8f62c2838278e60deb',
      profile: {
        stationCount: 1216,
        minimumY: 62,
        maximumY: 106,
        riseEdges: 49,
        fallEdges: 49,
        levelEdges: 1117,
        continuousOneWayGravityOutlet: false,
      },
      datumEvidence: {
        datumCellCount: 1994,
        currentWaterFamilyCells: 0,
        currentLavaCells: 0,
      },
    });
    expect(road.profile.localMinimumRuns).toHaveLength(5);
    expect(road.gravityLowInterfaces).toHaveLength(5);
    expect(road.datumEvidence.sameOrFaceAdjacentComponentIds).toEqual(['water-01297']);
    expect(road.gravityLowInterfaces.every((sink) => sink.sameOrFaceAdjacentComponentIds.length === 0))
      .toBe(true);

    expect(rail).toMatchObject({
      offsetsInclusive: [-30, -29],
      columnCount: 2001,
      columnSetSha256: 'cc28922e8c29bc79e53762377bbc86efa371dcc441ea461261b0fa050170da03',
      profile: {
        stationCount: 1216,
        minimumY: 63,
        maximumY: 114,
        riseEdges: 59,
        fallEdges: 59,
        levelEdges: 1097,
        continuousOneWayGravityOutlet: false,
      },
      datumEvidence: {
        datumCellCount: 2001,
        currentWaterFamilyCells: 0,
        currentLavaCells: 0,
        sameOrFaceAdjacentComponentIds: [],
      },
    });
    expect(rail.profile.localMinimumRuns).toHaveLength(6);
    expect(rail.gravityLowInterfaces).toHaveLength(6);
    expect(rail.gravityLowInterfaces.every((sink) => sink.sameOrFaceAdjacentComponentIds.length === 0))
      .toBe(true);
    expect(report.collectionSystems.interpretation).toContain('internal low runs');
  });

  it('rejects receiver selection and preserves all hydrology truth boundaries', () => {
    const report = readReport(COMMITTED_JSON);

    expect(report.receiverEvaluation).toEqual(expect.objectContaining({
      candidateCount: 0,
      candidates: [],
      acceptedReceiverCount: 0,
      acceptedReceivers: [],
      selectedOutfall: null,
      decision: 'NO_ACCEPTABLE_RECEIVER_CAN_BE_SELECTED_UNDER_CURRENT_DEFAULT_NO_DIVERSION',
    }));
    expect(report.receiverEvaluation.reasons.join(' ')).toContain('No rainfall');
    expect(report.d05Interface).toEqual({
      c1LandTakeMaxX: 1572,
      mountainHydrologyPrismMinX: 1648,
      clearPlanColumns: 75,
      directPlanContact: false,
      currentMountainWaterComponentCount: 5234,
      currentMountainWaterComponentManifestSha256: '827aa11b7e8b583949ad9d2f86bb8457417e3d46b2d4a58de0174bedf5018105',
      status: 'NO_DIRECT_C1_TO_D05_RECEIVER_INTERFACE; ANY LINK_REQUIRES_NEW_EXACT_PATH_OWNER_AND_EXCEPTION',
    });
    expect(report.evidenceImpact).toEqual({
      exactCurrentC1FluidTopologyFrozen: true,
      exactCollectionCoordinationDatumsFrozen: true,
      acceptableOutfallFrozen: false,
      rainfallCapacityClaimed: false,
      groundwaterClaimed: false,
      snowmeltCapacityClaimed: false,
      consentClaimed: false,
      diversionAuthorized: false,
      d02B03Status: 'HOLD_NO_ACCEPTED_OUTFALL_OR_HYDRAULIC_MODEL',
      d02Resolved: false,
      r00Ready: false,
    });
    expect(report.remainingBlockers).toHaveLength(6);
  });

  it('emits no physical work and keeps D02-B03 fail-closed', () => {
    const report = readReport(COMMITTED_JSON);

    expect(report.safetyBoundary).toEqual(expect.objectContaining({
      mutableProseDependencies: [],
      r00Dependencies: [],
      liveCallsPerformed: [],
      databasesOpened: [],
      operationCells: [],
      materialCells: [],
      operationCellCount: 0,
      worldEditAuthorized: false,
      diversionAuthorized: false,
      d02Resolved: false,
      d02B03Resolved: false,
    }));
    expect(report.finalGate).toEqual(expect.objectContaining({
      status: 'HOLD_D02_B03_NO_ACCEPTED_OUTFALL_NO_WORLD_EDITS',
      worldEditAuthorized: false,
    }));
  });
});
