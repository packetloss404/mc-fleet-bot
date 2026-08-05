import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const COMMITTED_JSON = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d05-owner-acceptance-packet.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d05-owner-acceptance-packet.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-d05-owner-'));
const regeneratedJson = path.join(tempDir, 'owner-packet.json');
const regeneratedMarkdown = path.join(tempDir, 'owner-packet.md');

interface SourceBinding {
  path: string;
  bytes: number;
  sha256: string;
}

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  worldEditAuthorized: boolean;
  constructionOwnershipAuthorized: boolean;
  futureStateAuthorized: boolean;
  ownerAcceptanceRecorded: boolean;
  expertAcceptanceRecorded: boolean;
  executable: boolean;
  operationCellCount: number;
  materialCellCount: number;
  futureCellCount: number;
  constructionCellCount: number;
  sourceBindings: Record<string, SourceBinding>;
  claimRegister: { allowedClasses: string[]; claims: Array<{ classification: string }> };
  selectedFm01PlanningBasis: {
    modelId: string;
    directlyModelledColumnCount: number;
    candidateAddedSolidIntervals: {
      candidateAddedSolidCellCount: number;
      canonicalMaterialState: null;
      constructionOwnership: boolean;
    };
    acceptedFutureCellCount: number;
    acceptedConstructionCellCount: number;
  };
  canonicalMaterialStatePlan: {
    architecturalTransitionWorldStudyY: number;
    stateClasses: Array<{
      id: string;
      futureCanonicalState: string | null;
      status: string;
    }>;
    acceptedRecordCount: number;
    ownerPolicyAcceptanceDoesNotAssignCells: boolean;
  };
  constructionAndInfluenceCellSetMethod: {
    requiredSetFamilies: Array<{ id: string; status: string }>;
    currentDisposition: Record<string, number | boolean>;
  };
  belowCoordinationSupportGapPlan: {
    status: string;
    exactGap: { cellCount: number; columnCount: number; intervalManifestSha256: string };
    permittedTreatmentClasses: Array<{ id: string }>;
  };
  hydrologyAndGeotechnicalAcceptancePlan: {
    status: string;
    boundCurrentFacts: {
      fullHeightFamilies: Record<string, { cellCount: number }>;
    };
  };
  protectedRelicInfluencePlan: {
    minimumPlanningKernel: {
      integerOffsets: Array<{ x: number; y: number; z: number }>;
      offsetSetSha256: string;
      expertInfluenceClaimed: boolean;
    };
    exactPreserveCurrentStateUnion: { cellCount: number; coordinateSetSha256: string };
    expertKernelRegistry: { acceptedKernelCount: number; status: string };
  };
  b09B10SystemPlan: {
    b09Route: {
      pointCount: number;
      horizontalStepCount: number;
      orderedCenterlineSha256: string;
      minimumPlanningAccommodation: { cellCount: number; constructionOwnership: boolean };
      technicalAcceptanceClaimed: boolean;
    };
    stations: Array<{ exactStationCellSet: null; status: string }>;
    interfaces: Array<{ id: string; planningIntersection?: { cellCount: number }; status: string }>;
    maintenanceAndEgress: { status: string };
    mechanisms: { status: string; exactMechanismCellSet: null };
  };
  ownershipAndInterfacePlan: {
    ownerRoles: Array<{ ownerId: string; exactCellAssignmentsAccepted: boolean }>;
    currentDisposition: {
      exactCellAssignmentCount: number;
      exactInterfaceContractCount: number;
      accepted: boolean;
    };
  };
  passHoldMatrix: Array<{ id: string; status: string }>;
  ownerAcceptanceRecordTemplate: {
    status: string;
    policyIdentitySha256: string;
    acceptancePayload: Record<string, unknown>;
    acceptancePayloadSha256: string;
    copyableSoleOwnerAcceptanceStatement: string;
    allowedDecisions: string[];
    acceptanceNeverImplies: string[];
    currentRecord: null;
  };
  disposition: {
    ownerPolicyAccepted: boolean;
    technicalInputsComplete: boolean;
    d05Resolved: boolean;
    r00G02Passed: boolean;
    physicalWorkMayStart: boolean;
  };
}

function readReport(filename = COMMITTED_JSON): Report {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as Report;
}

function sha256File(filename: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function stateClass(report: Report, id: string) {
  const result = report.canonicalMaterialStatePlan.stateClasses.find((item) => item.id === id);
  if (!result) throw new Error(`missing material state class ${id}`);
  return result;
}

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      'scripts/compile_combined_zones_d05_owner_acceptance_packet.mjs',
      '--out',
      regeneratedJson,
      '--markdown',
      regeneratedMarkdown,
    ],
    { cwd: ROOT, stdio: 'pipe', maxBuffer: 4 * 1024 * 1024 },
  );
});

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones D05 owner-acceptance packet', () => {
  it('regenerates byte-identically and binds every input by SHA-256', () => {
    expect(fs.readFileSync(regeneratedJson).equals(fs.readFileSync(COMMITTED_JSON))).toBe(true);
    expect(fs.readFileSync(regeneratedMarkdown).equals(fs.readFileSync(COMMITTED_MARKDOWN)))
      .toBe(true);

    const report = readReport();
    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-d05-owner-acceptance-packet',
      status: 'OWNER_ACCEPTANCE_PACKET_READY_POLICY_AND_TECHNICAL_D05_G02_HOLD',
    });
    for (const source of Object.values(report.sourceBindings)) {
      const filename = path.join(ROOT, source.path);
      expect(fs.statSync(filename).size).toBe(source.bytes);
      expect(sha256File(filename)).toBe(source.sha256);
    }
  });

  it('keeps FM-01 and all material choices as zero-cell conditional planning policy', () => {
    const report = readReport();
    expect(report.selectedFm01PlanningBasis).toMatchObject({
      modelId: 'FM-01-COMPACT-EAST-FACE',
      directlyModelledColumnCount: 202_501,
      candidateAddedSolidIntervals: {
        candidateAddedSolidCellCount: 14_768_553,
        canonicalMaterialState: null,
        constructionOwnership: false,
      },
      acceptedFutureCellCount: 0,
      acceptedConstructionCellCount: 0,
    });
    expect(report.canonicalMaterialStatePlan.architecturalTransitionWorldStudyY).toBe(130);
    expect(stateClass(report, 'MAT-BULK-STRUCTURAL-FILL-CANDIDATE'))
      .toMatchObject({ futureCanonicalState: 'minecraft:stone', status: 'PROPOSED_NOT_ASSIGNABLE' });
    expect(stateClass(report, 'MAT-LOWER-ARCHITECTURAL-FINISH-CANDIDATE'))
      .toMatchObject({ futureCanonicalState: 'minecraft:smooth_stone', status: 'PROPOSED_NOT_ASSIGNABLE' });
    expect(stateClass(report, 'MAT-UPPER-ARCHITECTURAL-FINISH-CANDIDATE'))
      .toMatchObject({ futureCanonicalState: 'minecraft:polished_diorite', status: 'PROPOSED_NOT_ASSIGNABLE' });
    expect(stateClass(report, 'MAT-SUPPORT-LINER-RETAINING').futureCanonicalState).toBeNull();
    expect(report.canonicalMaterialStatePlan).toMatchObject({
      acceptedRecordCount: 0,
      ownerPolicyAcceptanceDoesNotAssignCells: true,
    });
    expect(report.constructionAndInfluenceCellSetMethod.requiredSetFamilies).toHaveLength(12);
    expect(report.constructionAndInfluenceCellSetMethod.requiredSetFamilies
      .every((item) => item.status === 'HOLD_NO_ACCEPTED_SET')).toBe(true);
  });

  it('freezes exact support, hydrology, relic, and B09 facts without accepting systems', () => {
    const report = readReport();
    expect(report.belowCoordinationSupportGapPlan.exactGap).toEqual({
      status: 'HOLD_EXACT_UNSUPPORTED_BELOW_Y72',
      columnCount: 107_345,
      cellCount: 754_224,
      intervalManifestSha256: '31664bc00e7a1d361567fb878e8653c2a4018045169d54900ca9ad15bddd7171',
      treatment: null,
      reason: expect.any(String),
    });
    expect(report.belowCoordinationSupportGapPlan.permittedTreatmentClasses).toHaveLength(4);
    expect(report.hydrologyAndGeotechnicalAcceptancePlan.boundCurrentFacts.fullHeightFamilies)
      .toMatchObject({
        water: { cellCount: 1_929_621 },
        lava: { cellCount: 85_088 },
        frozen: { cellCount: 182_791 },
        snow: { cellCount: 359_830 },
      });
    expect(report.protectedRelicInfluencePlan.minimumPlanningKernel.integerOffsets).toHaveLength(27);
    expect(report.protectedRelicInfluencePlan.minimumPlanningKernel.expertInfluenceClaimed)
      .toBe(false);
    expect(report.protectedRelicInfluencePlan.exactPreserveCurrentStateUnion).toEqual({
      cellCount: 4_890,
      bounds: expect.any(Object),
      coordinateSetSha256: '5dcbcaca22ee39ee9309e1fc5139eb3fbff052bb114ae00d20a723c045eab26b',
    });
    expect(report.protectedRelicInfluencePlan.expertKernelRegistry)
      .toMatchObject({ acceptedKernelCount: 0, status: 'HOLD' });

    expect(report.b09B10SystemPlan.b09Route).toMatchObject({
      pointCount: 561,
      horizontalStepCount: 560,
      orderedCenterlineSha256: 'e8905742a77148d13d799362da7d65e9b02bcf96455d580fbee27367b2d24221',
      minimumPlanningAccommodation: { cellCount: 7_800, constructionOwnership: false },
      technicalAcceptanceClaimed: false,
    });
    expect(report.b09B10SystemPlan.stations.every((item) => (
      item.exactStationCellSet === null && item.status === 'HOLD'
    ))).toBe(true);
    expect(report.b09B10SystemPlan.interfaces.find((item) => item.id === 'IF-B08-B09-PORTAL'))
      .toMatchObject({ planningIntersection: { cellCount: 36 }, status: 'HOLD' });
    expect(report.b09B10SystemPlan.maintenanceAndEgress.status).toContain('HOLD');
    expect(report.b09B10SystemPlan.mechanisms).toMatchObject({
      status: expect.stringContaining('HOLD'),
      exactMechanismCellSet: null,
    });
  });

  it('provides a hash-bound copyable sole-owner statement that cannot pass technical gates', () => {
    const report = readReport();
    const template = report.ownerAcceptanceRecordTemplate;
    const payloadHash = crypto.createHash('sha256')
      .update(JSON.stringify(template.acceptancePayload))
      .digest('hex');
    expect(payloadHash).toBe(template.acceptancePayloadSha256);
    expect(template.allowedDecisions).toEqual([
      'ACCEPT_CONDITIONAL_PLANNING_POLICY',
      'RETURN_FOR_REVISION',
    ]);
    expect(template.copyableSoleOwnerAcceptanceStatement).toContain(payloadHash);
    expect(template.copyableSoleOwnerAcceptanceStatement).toContain('[SOLE OWNER NAME]');
    expect(template.copyableSoleOwnerAcceptanceStatement).toContain('[FINAL PACKET SHA-256]');
    expect(template.copyableSoleOwnerAcceptanceStatement).toContain('I do not accept any future');
    expect(template.currentRecord).toBeNull();
    expect(report.ownerAcceptanceRecorded).toBe(false);
    expect(report.expertAcceptanceRecorded).toBe(false);

    expect(report.passHoldMatrix.filter((gate) => gate.status === 'PASS').map((gate) => gate.id))
      .toEqual(['D05-OA-01-SOURCE-CHAIN', 'D05-OA-02-FM01-PLANNING-SELECTION']);
    expect(report.passHoldMatrix.filter((gate) => gate.status === 'HOLD')).toHaveLength(8);
    expect(report.ownershipAndInterfacePlan.ownerRoles
      .every((owner) => owner.exactCellAssignmentsAccepted === false)).toBe(true);
    expect(report.ownershipAndInterfacePlan.currentDisposition).toMatchObject({
      exactCellAssignmentCount: 0,
      exactInterfaceContractCount: 0,
      accepted: false,
    });
  });

  it('classifies claims and keeps every execution/closure authority false', () => {
    const report = readReport();
    expect(new Set(report.claimRegister.claims.map((item) => item.classification)))
      .toEqual(new Set(['BOUND_FACT', 'DETERMINISTIC_DERIVATION', 'OWNER_POLICY_CHOICE', 'TECHNICAL_GAP']));
    expect(report).toMatchObject({
      worldEditAuthorized: false,
      constructionOwnershipAuthorized: false,
      futureStateAuthorized: false,
      ownerAcceptanceRecorded: false,
      expertAcceptanceRecorded: false,
      executable: false,
      operationCellCount: 0,
      materialCellCount: 0,
      futureCellCount: 0,
      constructionCellCount: 0,
      disposition: {
        ownerPolicyAccepted: false,
        technicalInputsComplete: false,
        d05Resolved: false,
        r00G02Passed: false,
        physicalWorkMayStart: false,
      },
    });
  });
});
