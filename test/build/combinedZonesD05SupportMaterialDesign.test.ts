import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const JSON_PATH = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d05-support-material-design.json',
);
const MARKDOWN_PATH = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d05-support-material-design.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-d05-support-material-'));
const regeneratedJson = path.join(tempDir, 'design.json');
const regeneratedMarkdown = path.join(tempDir, 'design.md');

interface OverlayManifest {
  preamble: string;
  recordCount: number;
  sha256: string;
}

interface DirectFamily {
  id: string;
  sourceFamilyId: string;
  sourceProposalSparseManifestSha256: string;
  exactProposalCellCount: number;
  proposedTreatmentClass: string;
  proposedCanonicalStateCounts: Record<string, number>;
  proposedMaterialClassIds: string[];
  proposedOwnerClass: string;
  influenceAssumptionId: string;
  maintenanceAccessAssumptionId: string;
  referenceIndexedOverlayRecordSha256: string;
  acceptedCellCount: number;
  acceptedMaterialStateManifestSha256: null;
  status: string;
}

interface SupportFamily {
  id: string;
  sourceSupportStatusFamilyId: string;
  exactCellCount: number;
  exactColumnCount: number;
  exactCoordinateSetSha256: string;
  sourceSparseIntervalManifestSha256: string;
  proposedTreatmentClass: string | null;
  proposedMaterialClassId: string;
  proposedCanonicalState: null;
  proposalDecision: string;
  influenceAssumptionId: string;
  maintenanceAccessAssumptionId: string;
  referenceIndexedOverlayRecordSha256: string;
  acceptedTreatment: boolean;
  acceptedCellCount: number;
  acceptedCanonicalStateManifestSha256: null;
  acceptedOwnerAssignmentCount: number;
}

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  executable: boolean;
  sourceBindings: Record<string, { path: string; sha256: string; bytes: number }>;
  supportMaterialDesignPayload: {
    acceptedPlanningIdentity: Record<string, unknown>;
    immutableEvidenceIdentity: Record<string, unknown>;
    referenceIndexedSparseOverlayContract: {
      directMaterialOverlayManifest: OverlayManifest;
      supportTreatmentOverlayManifest: OverlayManifest;
    };
    directMaterialFamilies: DirectFamily[];
    proposedMaterialRegistry: Record<string, unknown>;
    supportGapTreatmentLedger: {
      sourceBoundIntervalManifestSha256: string;
      sourceCoordinateSetSha256: string;
      exactCellCount: number;
      exactColumnCount: number;
      familyCount: number;
      classifiedCellCount: number;
      unclassifiedCellCount: number;
      multiplyClassifiedCellCount: number;
      treatmentClassProposedCellCount: number;
      treatmentClassNullCellCount: number;
      proposedCanonicalStateCellCount: number;
      acceptedTreatmentCellCount: number;
      acceptedMaterialStateCellCount: number;
      families: SupportFamily[];
    };
    influenceAndMaintenanceAccessAssumptions: {
      influenceAssumptions: Array<{
        id: string;
        exactInfluenceCellManifest: null;
        status: string;
      }>;
      maintenanceAndStagingAccess: Record<string, unknown>;
      acceptedInfluenceCellCount: number;
      acceptedMaintenanceAccessCellCount: number;
    };
    protectedRelics: Record<string, unknown>;
    preservationAndNoDiversionContract: Record<string, unknown>;
    conflictAndReservationChecks: Array<Record<string, unknown> & {
      id: string;
      result: string;
      proposedDirectConflictCellCount: number;
    }>;
    completeSaveDependency: Record<string, unknown>;
    technicalAmbiguityDisposition: {
      removedByThisArtifact: string[];
      genuinelyRequiresCompleteSave: string[];
      genuinelyRequiresEngineeringAcceptance: string[];
    };
    acceptanceMatrix: Array<{
      id: string;
      result: string;
      scope: string;
    }>;
  };
  supportMaterialDesignPayloadSha256: string;
  summary: Record<string, unknown>;
  safetyBoundary: Record<string, unknown>;
}

function sha256(data: crypto.BinaryLike): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).sort().map((key) => (
    `${JSON.stringify(key)}:${canonicalJson(object[key])}`
  )).join(',')}}`;
}

function manifestHash(preamble: string, records: unknown[]): string {
  return sha256(`${preamble}${records.map((record) => `${canonicalJson(record)}\n`).join('')}`);
}

function readReport(filename = JSON_PATH): Report {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as Report;
}

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      'scripts/compile_combined_zones_d05_support_material_design.mjs',
      '--generated-at', '2026-08-05T02:30:00Z',
      '--out', regeneratedJson,
      '--markdown', regeneratedMarkdown,
    ],
    { cwd: ROOT, stdio: 'pipe' },
  );
});

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones D05 support-treatment and material proposal', () => {
  it('regenerates the committed JSON and Markdown byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(JSON_PATH));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(MARKDOWN_PATH));
  });

  it('binds eleven direct sources, one future-state identity, and the complete payload', () => {
    const report = readReport();
    expect(Object.keys(report.sourceBindings)).toEqual([
      'ownerAcceptance',
      'd05FutureState',
      'd05OwnerPacket',
      'd05FutureMountain',
      'd05HydrologyRelic',
      'd05ConservativeDefaults',
      'd05RelicSurvey',
      'connectorGeometry',
      'd06Egress',
      'd06Mechanisms',
      'completeSaveAudit',
    ]);
    for (const source of Object.values(report.sourceBindings)) {
      const filename = path.join(ROOT, source.path);
      expect(source.sha256, source.path).toBe(sha256(fs.readFileSync(filename)));
      expect(source.bytes, source.path).toBe(fs.statSync(filename).size);
    }
    expect(report.supportMaterialDesignPayloadSha256).toBe(sha256(
      `${JSON.stringify(report.supportMaterialDesignPayload)}\n`,
    ));
    expect(report.supportMaterialDesignPayload.acceptedPlanningIdentity).toMatchObject({
      d05PlanningPolicyAccepted: true,
      technicalHoldPassedCount: 0,
      d05FutureStateReportIdentitySha256:
        'acf06949a267b2cc3e4da25a0aab3267dc18149fa373534389230d2961b5de2f',
      modelId: 'FM-01-COMPACT-EAST-FACE',
      modelIdentitySha256:
        '735b69b38c5c2ea840388039b5beb957671fe3e243ec7943c440649edcff36a6',
      independentTechnicalAcceptanceRecorded: false,
    });
    expect(report.supportMaterialDesignPayload.immutableEvidenceIdentity).toEqual({
      regionOnlySha256:
        '05eebe12ba419abd75b80033c265daf452b652a575c912f6df497735e00d271b',
      completeSameMomentSavedWorldAvailable: false,
    });
  });

  it('preserves exact bulk and exposed material proposals through reproducible overlay hashes', () => {
    const payload = readReport().supportMaterialDesignPayload;
    expect(payload.directMaterialFamilies).toHaveLength(2);
    expect(payload.directMaterialFamilies[0]).toMatchObject({
      id: 'D05-MAT-BULK-STRUCTURAL-FILL-PROPOSAL',
      sourceFamilyId: 'fill-direct',
      sourceProposalSparseManifestSha256:
        '5fc31ddc0e2d85297430534857ba78d1c7dc824a4168608d9dbef80d006ae350',
      exactProposalCellCount: 14_580_291,
      proposedTreatmentClass: 'MOUNTAIN-BULK-FILL',
      proposedCanonicalStateCounts: { 'minecraft:stone': 14_580_291 },
      proposedMaterialClassIds: ['MAT-BULK-STRUCTURAL-FILL-CANDIDATE'],
      acceptedCellCount: 0,
      acceptedMaterialStateManifestSha256: null,
    });
    expect(payload.directMaterialFamilies[1]).toMatchObject({
      id: 'D05-MAT-EXPOSED-SURFACE-FINISH-PROPOSAL',
      sourceFamilyId: 'surface-finish-direct',
      sourceProposalSparseManifestSha256:
        '942f7a83c7f360309d68c27d3c7f56bec78eb4ad2d4716f0a1024908529be567',
      exactProposalCellCount: 188_262,
      proposedTreatmentClass: 'MOUNTAIN-EXPOSED-ARCHITECTURAL-FINISH',
      proposedCanonicalStateCounts: {
        'minecraft:smooth_stone': 77_395,
        'minecraft:polished_diorite': 110_867,
      },
      proposedMaterialClassIds: [
        'MAT-LOWER-ARCHITECTURAL-FINISH-CANDIDATE',
        'MAT-UPPER-ARCHITECTURAL-FINISH-CANDIDATE',
      ],
      acceptedCellCount: 0,
      acceptedMaterialStateManifestSha256: null,
    });
    const records = payload.directMaterialFamilies.map((family) => ({
      familyId: family.id,
      sourceFamilyId: family.sourceFamilyId,
      sourceProposalSparseManifestSha256: family.sourceProposalSparseManifestSha256,
      exactProposalCellCount: family.exactProposalCellCount,
      proposedTreatmentClass: family.proposedTreatmentClass,
      proposedCanonicalStateCounts: family.proposedCanonicalStateCounts,
      proposedMaterialClassIds: family.proposedMaterialClassIds,
      influenceAssumptionId: family.influenceAssumptionId,
      maintenanceAccessAssumptionId: family.maintenanceAccessAssumptionId,
    }));
    const overlay = payload.referenceIndexedSparseOverlayContract
      .directMaterialOverlayManifest;
    expect(overlay.recordCount).toBe(2);
    expect(overlay.sha256).toBe(manifestHash(overlay.preamble, records));
    for (let index = 0; index < records.length; index += 1) {
      expect(payload.directMaterialFamilies[index].referenceIndexedOverlayRecordSha256)
        .toBe(sha256(`${overlay.preamble}${canonicalJson(records[index])}\n`));
    }
    expect(payload.proposedMaterialRegistry).toMatchObject({
      canonicalDirectProposalStateCounts: {
        'minecraft:stone': 14_580_291,
        'minecraft:smooth_stone': 77_395,
        'minecraft:polished_diorite': 110_867,
      },
      supportCanonicalStateCount: 0,
      acceptedMaterialClassCount: 0,
      acceptedStateRecordCount: 0,
      acceptedCoordinateSetSha256: null,
      acceptedBlockStateSetSha256: null,
    });
  });

  it('accounts for all support cells exactly once while keeping every support state null', () => {
    const ledger = readReport().supportMaterialDesignPayload.supportGapTreatmentLedger;
    expect(ledger).toMatchObject({
      sourceBoundIntervalManifestSha256:
        '31664bc00e7a1d361567fb878e8653c2a4018045169d54900ca9ad15bddd7171',
      sourceCoordinateSetSha256:
        'f007560fafa7eceed438c4ade36981fe16461c7dad35b55f4f29bf729e86bde6',
      exactCellCount: 754_224,
      exactColumnCount: 107_345,
      familyCount: 9,
      classifiedCellCount: 754_224,
      unclassifiedCellCount: 0,
      multiplyClassifiedCellCount: 0,
      treatmentClassProposedCellCount: 17_997,
      treatmentClassNullCellCount: 736_227,
      proposedCanonicalStateCellCount: 0,
      acceptedTreatmentCellCount: 0,
      acceptedMaterialStateCellCount: 0,
    });
    expect(ledger.families.map((family) => [
      family.sourceSupportStatusFamilyId,
      family.exactCellCount,
      family.proposedTreatmentClass,
    ])).toEqual([
      ['SUPPORT-STATUS-RELIC-PRESERVE', 363, 'SUPPORT-RETAIN-VOID'],
      ['SUPPORT-STATUS-B08-RESERVATION', 0, 'SUPPORT-RETAIN-VOID'],
      ['SUPPORT-STATUS-B09-RESERVATION', 0, 'SUPPORT-RETAIN-VOID'],
      ['SUPPORT-STATUS-D06-RESERVATION', 0, 'SUPPORT-RETAIN-VOID'],
      ['SUPPORT-STATUS-WATER-ADJACENT', 63_368, null],
      ['SUPPORT-STATUS-LAVA-ADJACENT', 0, null],
      ['SUPPORT-STATUS-FROZEN-ADJACENT', 384_445, null],
      ['SUPPORT-STATUS-SNOW-ADJACENT', 288_414, null],
      ['SUPPORT-STATUS-OTHER-SURFACE', 17_634, 'SUPPORT-ENGINEERED-FILL'],
    ]);
    expect(ledger.families.reduce((sum, family) => sum + family.exactCellCount, 0))
      .toBe(754_224);
    for (const family of ledger.families) {
      expect(family.proposedCanonicalState).toBeNull();
      expect(family.acceptedTreatment).toBe(false);
      expect(family.acceptedCellCount).toBe(0);
      expect(family.acceptedCanonicalStateManifestSha256).toBeNull();
      expect(family.acceptedOwnerAssignmentCount).toBe(0);
    }
    const records = ledger.families.map((family) => ({
      familyId: family.id,
      sourceSupportStatusFamilyId: family.sourceSupportStatusFamilyId,
      sourceSparseIntervalManifestSha256: family.sourceSparseIntervalManifestSha256,
      exactCoordinateSetSha256: family.exactCoordinateSetSha256,
      exactCellCount: family.exactCellCount,
      proposedTreatmentClass: family.proposedTreatmentClass,
      proposedMaterialClassId: family.proposedMaterialClassId,
      proposedCanonicalState: family.proposedCanonicalState,
      influenceAssumptionId: family.influenceAssumptionId,
      maintenanceAccessAssumptionId: family.maintenanceAccessAssumptionId,
    }));
    const overlay = readReport().supportMaterialDesignPayload
      .referenceIndexedSparseOverlayContract.supportTreatmentOverlayManifest;
    expect(overlay.recordCount).toBe(9);
    expect(overlay.sha256).toBe(manifestHash(overlay.preamble, records));
    for (let index = 0; index < records.length; index += 1) {
      expect(ledger.families[index].referenceIndexedOverlayRecordSha256)
        .toBe(sha256(`${overlay.preamble}${canonicalJson(records[index])}\n`));
    }
  });

  it('keeps relic, B08, B09, D06, fluid, and cryosphere conflicts fail-closed', () => {
    const payload = readReport().supportMaterialDesignPayload;
    expect(payload.conflictAndReservationChecks.map(({ id, result }) => ({ id, result })))
      .toEqual([
        {
          id: 'CONFLICT-D05-PROTECTED-RELIC-EXCLUSION',
          result: 'PASS_PLANNING_SUBTRACTION_ONLY',
        },
        {
          id: 'CONFLICT-D05-B08-RESERVATION',
          result: 'PASS_PLANNING_SUBTRACTION_ONLY',
        },
        {
          id: 'CONFLICT-D05-B09-RESERVATION',
          result: 'PASS_PLANNING_SUBTRACTION_ONLY',
        },
        {
          id: 'CONFLICT-D05-D06-EGRESS-AND-PROTECTED-CORES',
          result: 'PASS_EXACT_DISJOINT_BOUNDS_AND_ZERO_SUPPORT_INTERSECTION',
        },
        {
          id: 'CONFLICT-D05-CURRENT-FLUID-CRYOSPHERE-DIRECT-REPLACEMENT',
          result: 'PASS_ZERO_DIRECT_REPLACEMENT_ONLY',
        },
      ]);
    expect(payload.conflictAndReservationChecks.every(({ proposedDirectConflictCellCount }) => (
      proposedDirectConflictCellCount === 0
    ))).toBe(true);
    expect(payload.conflictAndReservationChecks[0]).toMatchObject({
      exactProtectedCoreCount: 3,
      exactMinimumPlanningExclusionCellCount: 4890,
      withheldCandidateFillCellCount: 1977,
      classifiedSupportPreserveCellCount: 363,
    });
    expect(payload.conflictAndReservationChecks[2]).toMatchObject({
      exactReservationCellCount: 7800,
      withheldCandidateFillCellCount: 4245,
      supportGapIntersectionCellCount: 0,
      connectorConstructionAuthorized: false,
    });
    expect(payload.conflictAndReservationChecks[3]).toMatchObject({
      d06ExternalContinuationCount: 2,
      d06FullProtectedCoreCount: 2,
      supportGapIntersectionCellCount: 0,
      physicalOpeningAuthorized: false,
    });
    expect(payload.conflictAndReservationChecks[4]).toMatchObject({
      currentWaterLavaFrozenSnowCellsDirectlyReplacedByProposal: 0,
      topSurfaceAdjacencyDiagnostic: {
        water: 7046,
        lava: 78,
        frozen: 44_441,
        snow: 134_645,
      },
      noDiversionTechnicallyAccepted: false,
    });
    expect(payload.preservationAndNoDiversionContract).toMatchObject({
      policy: 'ZERO_UNDECLARED_CHANGE_AND_DEFAULT_NO_DIVERSION',
      currentWaterLavaFrozenSnowCellsDirectlyReplacedByProposal: 0,
      noDiversionTechnicallyAccepted: false,
      acceptedReceiverCount: 0,
      acceptedOutfallCount: 0,
      acceptedDischargeExceptionCellCount: 0,
      futureComponentAccountingManifest: null,
      futureSnowIceLandscapeCapManifest: null,
    });
  });

  it('states exactly what ambiguity is removed and what still needs complete-save or engineering acceptance', () => {
    const payload = readReport().supportMaterialDesignPayload;
    expect(payload.technicalAmbiguityDisposition.removedByThisArtifact).toHaveLength(6);
    expect(payload.technicalAmbiguityDisposition.genuinelyRequiresCompleteSave).toHaveLength(2);
    expect(payload.technicalAmbiguityDisposition.genuinelyRequiresEngineeringAcceptance)
      .toHaveLength(6);
    expect(payload.completeSaveDependency).toMatchObject({
      status: 'HOLD_INCOMPLETE_OR_UNBOUND_SAVE',
      regionFileCount: 51,
      entityFileCount: 0,
      poiFileCount: 0,
      levelDatPresent: false,
      captureManifestValid: false,
      completeSaveSha256: null,
      currentResult: 'HOLD_NO_COMPLETE_SAME_MOMENT_SAVED_WORLD_IDENTITY',
    });
    expect(payload.influenceAndMaintenanceAccessAssumptions.influenceAssumptions)
      .toHaveLength(3);
    expect(payload.influenceAndMaintenanceAccessAssumptions.influenceAssumptions.every(
      ({ exactInfluenceCellManifest, status }) => (
        exactInfluenceCellManifest === null && status.startsWith('HOLD_')
      ),
    )).toBe(true);
    expect(payload.influenceAndMaintenanceAccessAssumptions).toMatchObject({
      maintenanceAndStagingAccess: {
        exactMaintenanceAccessCellManifest: null,
        exactConstructionStagingCellManifest: null,
        exactEquipmentSweptVolumeManifest: null,
        exactRestorationCellManifest: null,
        widthOrRouteInferencePermitted: false,
        relicObservationAccessAuthorized: false,
        b09MaintenanceAndRescueSystemAccepted: false,
        status: 'HOLD_NO_EXACT_MAINTENANCE_STAGING_EQUIPMENT_OR_RESTORATION_SETS',
      },
      acceptedInfluenceCellCount: 0,
      acceptedMaintenanceAccessCellCount: 0,
    });
    expect(payload.acceptanceMatrix).toHaveLength(19);
    expect(payload.acceptanceMatrix.filter(({ result }) => result.startsWith('PASS')))
      .toHaveLength(9);
    expect(payload.acceptanceMatrix.filter(({ result }) => result === 'HOLD'))
      .toHaveLength(10);
    expect(payload.acceptanceMatrix.slice(9).every(({ result }) => result === 'HOLD'))
      .toBe(true);
  });

  it('cannot authorize accepted cells, materials, operations, world edits, or compliance', () => {
    const report = readReport();
    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-d05-support-material-design',
      status: 'PARTIAL_PASS_EXACT_D05_SUPPORT_MATERIAL_PROPOSAL_UNRESOLVED_TREATMENTS_D05_G02_HOLD',
      executable: false,
      summary: {
        acceptanceCriterionCount: 19,
        passCount: 9,
        holdCount: 10,
        directProposalCellCount: 14_768_553,
        bulkStructuralFillProposalCellCount: 14_580_291,
        exposedFinishProposalCellCount: 188_262,
        smoothStoneProposalCellCount: 77_395,
        polishedDioriteProposalCellCount: 110_867,
        supportGapCellCount: 754_224,
        supportStatusFamilyCount: 9,
        supportTreatmentClassProposedCellCount: 17_997,
        supportTreatmentClassNullCellCount: 736_227,
        supportCanonicalStateProposedCellCount: 0,
        hydrologyCryosphereAdjacentSupportCellCount: 736_227,
        relicPreserveSupportCellCount: 363,
        otherSurfaceSupportCellCount: 17_634,
        proposedDirectConflictCellCount: 0,
        acceptedTreatmentCellCount: 0,
        acceptedMaterialStateCellCount: 0,
        acceptedInfluenceCellCount: 0,
        acceptedMaintenanceAccessCellCount: 0,
        acceptedFutureCellCount: 0,
        acceptedConstructionCellCount: 0,
        operationCellCount: 0,
        materialCellCount: 0,
        acceptedOwnerAssignmentCount: 0,
        acceptedInterfaceContractCount: 0,
        completeSavedWorldAccepted: false,
        d05Resolved: false,
        r00G02Passed: false,
        realWorldEngineeringOrComplianceClaimed: false,
      },
    });
    expect(report.safetyBoundary).toEqual({
      offlineOnly: true,
      liveCallsPerformed: [],
      databasesOpened: [],
      operations: [],
      operationCellCount: 0,
      materialCells: [],
      materialCellCount: 0,
      acceptedFutureCells: [],
      acceptedFutureCellCount: 0,
      acceptedConstructionCells: [],
      acceptedConstructionCellCount: 0,
      receiverInvented: false,
      outfallInvented: false,
      dischargeInvented: false,
      hydrologyAccepted: false,
      geotechnicalAccepted: false,
      constructionAuthorized: false,
      physicalBuildAuthorized: false,
      worldEditAuthorized: false,
    });
  });
});
