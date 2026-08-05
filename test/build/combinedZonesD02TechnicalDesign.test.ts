import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const JSON_PATH = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d02-technical-design.json',
);
const MARKDOWN_PATH = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d02-technical-design.md',
);
const S04_PATH = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d02-s04-closed-drainage-alternatives.json',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-d02-technical-'));
const regeneratedJson = path.join(tempDir, 'technical.json');
const regeneratedMarkdown = path.join(tempDir, 'technical.md');

interface Manifest {
  cellCount: number;
  coordinateSetSha256: string;
  roleStreamSha256: string;
  bounds: Record<string, number>;
  cells?: Array<{ x: number; y: number; z: number; roles: string[] }>;
}

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  executable: boolean;
  sourceBindings: Record<string, { path: string; sha256: string; bytes: number }>;
  technicalDevelopmentPayload: {
    acceptedPlanningIdentity: {
      ownerAcceptanceFileSha256: string;
      ownerAcceptancePayloadSha256: string;
      planningPolicyAccepted: boolean;
      technicalHoldPassedCount: number;
      technicalAcceptanceRecorded: boolean;
    };
    selectedBasis: {
      alternativeId: string;
      exactAggregateCandidateCellManifest: Manifest;
      cappedSumpCandidateCount: number;
      noBuildPreservationHoldCount: number;
      overflowCandidateCellCount: number;
      outfallCandidateCellCount: number;
      receiverId: null;
    };
    exactAssetDesigns: Array<{
      assetId: string;
      lowRunId: string;
      selectedAnchorStation: number;
      gravityLow: { startStation: number; endStation: number };
      exactCandidateCellManifest: Manifest;
      envelopeRoleCounts: {
        excavationEnvelopeCellCount: number;
        sealedCapEnvelopeCellCount: number;
      };
      capacityAndStorage: Record<string, unknown>;
      failureAndRecovery: Record<string, unknown>;
      ownershipAndInterfaces: Record<string, unknown>;
      acceptedConstructionCellCount: number;
      acceptedMaterialCellCount: number;
      technicalAcceptanceClaimed: boolean;
    }>;
    roadLow001NoBuildHold: {
      exactPreservationCellManifest: Manifest;
      rejectedChamberEvidence: {
        exactCandidateCellManifest: Manifest;
        currentWaterFamilyCellCount: number;
        faceAdjacentCurrentFluidCellCount: number;
        strictNoCurrentFluidInteraction: boolean;
        planningGeometryClear: boolean;
      };
      selectedDrainageAssetId: null;
      receiverId: null;
      disposition: string;
    };
    hydraulicStorageFailureRecoveryContract: {
      domain: string;
      realWorldHydraulicOrCodeComplianceClaimed: boolean;
      currentAcceptedValues: Record<string, unknown>;
      proposedAcceptanceRules: string[];
      currentResult: string;
    };
    sourceAndFutureFluidAccountingContract: {
      currentEvidence: Record<string, unknown>;
      requiredExactSetFamilies: string[];
      acceptedFutureFluidCellCount: number;
      acceptedReceiverCount: number;
      dischargeExceptionCount: number;
      interpretation: string;
      currentResult: string;
    };
    structureGeotechnicalLoadingQuantityContract: {
      exactPlanningQuantities: Record<string, number>;
      acceptedMaterialPalette: null;
      acceptedExcavationCellCount: number;
      acceptedPlacementCellCount: number;
      realWorldStructuralOrGeotechnicalComplianceClaimed: boolean;
      currentResult: string;
    };
    ownershipInterfaceContract: Record<string, unknown>;
    completeSaveDependency: {
      auditedCopiedSaveCandidateCount: number;
      completeCopiedSaveCandidateCount: number;
      requiredComponents: string[];
      currentResult: string;
    };
    acceptanceMatrix: Array<{
      id: string;
      result: 'PASS' | 'HOLD';
      scope: string;
    }>;
  };
  technicalDevelopmentPayloadSha256: string;
  summary: Record<string, unknown>;
  safetyBoundary: Record<string, unknown>;
}

function sha256(data: crypto.BinaryLike): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function readReport(filename = JSON_PATH): Report {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as Report;
}

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      'scripts/compile_combined_zones_d02_technical_design.mjs',
      '--generated-at', '2026-08-05T01:10:00Z',
      '--out', regeneratedJson,
      '--markdown', regeneratedMarkdown,
    ],
    { cwd: ROOT, stdio: 'pipe' },
  );
});

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones D02 technical-development design', () => {
  it('regenerates the committed JSON and Markdown byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(JSON_PATH));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(MARKDOWN_PATH));
  });

  it('binds every direct source and hashes the complete technical payload', () => {
    const report = readReport();
    expect(Object.keys(report.sourceBindings)).toEqual([
      'ownerAcceptance',
      'd02OwnerPacket',
      'c1CivilDesign',
      'd02RegionEvidence',
      'd02HydrologyOutfalls',
      'd02ClosedDrainage',
    ]);
    for (const source of Object.values(report.sourceBindings)) {
      const filename = path.join(ROOT, source.path);
      expect(source.sha256, source.path).toBe(sha256(fs.readFileSync(filename)));
      expect(source.bytes, source.path).toBe(fs.statSync(filename).size);
    }
    expect(report.technicalDevelopmentPayloadSha256).toBe(sha256(
      `${JSON.stringify(report.technicalDevelopmentPayload)}\n`,
    ));
    expect(report.technicalDevelopmentPayload.acceptedPlanningIdentity).toMatchObject({
      ownerAcceptanceFileSha256: report.sourceBindings.ownerAcceptance.sha256,
      planningPolicyAccepted: true,
      technicalHoldPassedCount: 0,
      technicalAcceptanceRecorded: false,
    });
  });

  it('preserves the ten exact sump manifests and aggregate role partition', () => {
    const report = readReport();
    const payload = report.technicalDevelopmentPayload;
    const s04 = JSON.parse(fs.readFileSync(S04_PATH, 'utf8')) as {
      alternatives: Array<{
        id: string;
        candidateCellManifest: Manifest;
        ownershipAndInterfaces: Array<{
          lowRunId: string;
          exactAssetCellManifest: Manifest;
        }>;
      }>;
    };
    const preferred = s04.alternatives.find(({ id }) => (
      id === 'ALT-D02-S04-D-HYBRID-CAPPED-SUMPS-WITH-AQUATIC-NO-BUILD-HOLD'
    ));
    expect(preferred).toBeDefined();
    expect(payload.selectedBasis).toMatchObject({
      alternativeId: 'ALT-D02-S04-D-HYBRID-CAPPED-SUMPS-WITH-AQUATIC-NO-BUILD-HOLD',
      cappedSumpCandidateCount: 10,
      noBuildPreservationHoldCount: 1,
      overflowCandidateCellCount: 0,
      outfallCandidateCellCount: 0,
      receiverId: null,
    });
    expect(payload.selectedBasis.exactAggregateCandidateCellManifest)
      .toEqual(preferred?.candidateCellManifest);
    expect(payload.selectedBasis.exactAggregateCandidateCellManifest.cells).toHaveLength(432);
    expect(payload.exactAssetDesigns).toHaveLength(10);

    const sourceAssets = new Map(preferred?.ownershipAndInterfaces.map((asset) => [
      asset.lowRunId,
      asset.exactAssetCellManifest,
    ]));
    for (const asset of payload.exactAssetDesigns) {
      expect(asset.exactCandidateCellManifest).toEqual(sourceAssets.get(asset.lowRunId));
      expect(asset.selectedAnchorStation).toBeGreaterThanOrEqual(asset.gravityLow.startStation);
      expect(asset.selectedAnchorStation).toBeLessThanOrEqual(asset.gravityLow.endStation);
      expect(asset.envelopeRoleCounts.excavationEnvelopeCellCount
        + asset.envelopeRoleCounts.sealedCapEnvelopeCellCount)
        .toBe(asset.exactCandidateCellManifest.cellCount);
      expect(asset.acceptedConstructionCellCount).toBe(0);
      expect(asset.acceptedMaterialCellCount).toBe(0);
      expect(asset.technicalAcceptanceClaimed).toBe(false);
    }
    expect(payload.exactAssetDesigns.reduce(
      (sum, asset) => sum + asset.exactCandidateCellManifest.cellCount,
      0,
    )).toBe(432);
    expect(payload.exactAssetDesigns.reduce(
      (sum, asset) => sum + asset.envelopeRoleCounts.excavationEnvelopeCellCount,
      0,
    )).toBe(360);
    expect(payload.exactAssetDesigns.reduce(
      (sum, asset) => sum + asset.envelopeRoleCounts.sealedCapEnvelopeCellCount,
      0,
    )).toBe(72);
  });

  it('keeps ROAD-LOW-001 exact, unserved, and fail-closed', () => {
    const hold = readReport().technicalDevelopmentPayload.roadLow001NoBuildHold;
    expect(hold).toMatchObject({
      selectedDrainageAssetId: null,
      receiverId: null,
      disposition: 'PASS_NO_BUILD_PRESERVATION_CONTROL_DRAINAGE_SERVICE_UNRESOLVED',
      exactPreservationCellManifest: { cellCount: 24 },
      rejectedChamberEvidence: {
        exactCandidateCellManifest: { cellCount: 36 },
        currentWaterFamilyCellCount: 6,
        faceAdjacentCurrentFluidCellCount: 16,
        strictNoCurrentFluidInteraction: false,
        planningGeometryClear: false,
      },
    });
    expect(hold.exactPreservationCellManifest.cells).toHaveLength(24);
  });

  it('defines capacity and future-fluid acceptance rules without inventing values', () => {
    const payload = readReport().technicalDevelopmentPayload;
    expect(payload.hydraulicStorageFailureRecoveryContract).toMatchObject({
      domain: 'MINECRAFT_DISCRETE_BLOCK_STATE_AND_TICK_MODEL_ONLY',
      realWorldHydraulicOrCodeComplianceClaimed: false,
      currentResult: 'HOLD_NUMERIC_INFLOW_STORAGE_FREEBOARD_FAILURE_AND_RECOVERY_INPUTS_UNACCEPTED',
      currentAcceptedValues: {
        catchmentCellManifest: null,
        currentSourceFluidCellManifest: null,
        futureSourceFluidCellManifest: null,
        acceptedPeakInflowWaterBlocksPerTick: null,
        acceptedEvaluationTickCount: null,
        acceptedInteriorStorageCellManifest: null,
        acceptedWorkingStorageWaterBlockCount: null,
        acceptedFreeboardBlocks: null,
      },
    });
    expect(payload.hydraulicStorageFailureRecoveryContract.proposedAcceptanceRules)
      .toEqual(expect.arrayContaining([
        expect.stringContaining('source block is persistent'),
        expect.stringContaining('excavation-envelope cell is never counted as accepted storage'),
        expect.stringContaining('No overflow, discharge'),
      ]));
    expect(payload.sourceAndFutureFluidAccountingContract).toMatchObject({
      acceptedFutureFluidCellCount: 0,
      acceptedReceiverCount: 0,
      dischargeExceptionCount: 0,
      currentResult: 'HOLD_FUTURE_DIRECT_INFLUENCE_AND_COMPONENT_ACCOUNTING_NOT_COMPILED',
    });
    expect(payload.sourceAndFutureFluidAccountingContract.interpretation)
      .toContain('not proof that the proposed design has no fluid effect');
  });

  it('passes only supported controls and retains all technical closure HOLDs', () => {
    const report = readReport();
    const matrix = report.technicalDevelopmentPayload.acceptanceMatrix;
    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-d02-technical-design',
      status: 'PARTIAL_PASS_EXACT_D02_TECHNICAL_DEVELOPMENT_D02_G02_HOLD',
      executable: false,
      summary: {
        acceptanceCriterionCount: 17,
        passCount: 6,
        holdCount: 11,
        exactCandidateEnvelopeCellCount: 432,
        acceptedInteriorStorageCellCount: 0,
        acceptedReceiverCount: 0,
        acceptedOutfallCellCount: 0,
        completeCopiedSaveCandidateCount: 0,
        acceptedConstructionCellCount: 0,
        acceptedMaterialCellCount: 0,
        d02Resolved: false,
        r00G02Passed: false,
        technicalAcceptanceClaimed: false,
        realWorldComplianceClaimed: false,
      },
    });
    expect(matrix.filter(({ result }) => result === 'PASS').map(({ id }) => id)).toEqual([
      'D02-TD-01-SOURCE-BINDINGS',
      'D02-TD-02-OWNER-PLANNING-ACCEPTANCE',
      'D02-TD-03-EXACT-ASSET-PARTITION',
      'D02-TD-04-CURRENT-REGION-CLEARANCE',
      'D02-TD-05-ROAD-LOW-001-NO-BUILD',
      'D02-TD-06-DEFAULT-NO-DIVERSION',
    ]);
    expect(matrix.filter(({ result }) => result === 'HOLD')).toHaveLength(11);
    expect(report.technicalDevelopmentPayload.completeSaveDependency).toMatchObject({
      auditedCopiedSaveCandidateCount: 56,
      completeCopiedSaveCandidateCount: 0,
      requiredComponents: ['region/', 'entities/', 'poi/', 'level.dat'],
      currentResult: 'HOLD_NO_COMPLETE_SAME_MOMENT_COPIED_SAVE',
    });
  });

  it('cannot authorize construction, diversion, compliance, or world edits', () => {
    const report = readReport();
    expect(report.technicalDevelopmentPayload
      .structureGeotechnicalLoadingQuantityContract).toMatchObject({
      acceptedMaterialPalette: null,
      acceptedExcavationCellCount: 0,
      acceptedPlacementCellCount: 0,
      realWorldStructuralOrGeotechnicalComplianceClaimed: false,
      currentResult: 'HOLD_CURRENT_REGION_CLEARANCE_IS_NOT_STRUCTURE_GEOTECHNICAL_LOADING_OR_QUANTITY_ACCEPTANCE',
    });
    expect(report.safetyBoundary).toEqual({
      offlineOnly: true,
      liveCallsPerformed: [],
      databasesOpened: [],
      operations: [],
      operationCellCount: 0,
      materialCells: [],
      materialCellCount: 0,
      receiverInvented: false,
      outfallInvented: false,
      diversionAuthorized: false,
      constructionAuthorized: false,
      physicalBuildAuthorized: false,
      worldEditAuthorized: false,
    });
  });
});
