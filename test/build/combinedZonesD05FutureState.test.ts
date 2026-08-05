import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const COMMITTED_JSON = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d05-future-state.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d05-future-state.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-d05-future-state-'));
const regeneratedJson = path.join(tempDir, 'future-state.json');
const regeneratedMarkdown = path.join(tempDir, 'future-state.md');

interface Binding {
  path: string;
  bytes: number;
  sha256: string;
  regionFileCount?: number;
}

interface TypedFamily {
  familyId: string;
  proposalCellCount: number | null;
  acceptedCellCount: number;
  acceptedCoordinateSetSha256: string | null;
  acceptedTypedFamilySha256: string | null;
  proposalSparseManifestSha256?: string;
  proposalCanonicalStateCounts?: Record<string, number>;
  status: string;
}

interface SupportFamily {
  id: string;
  cellCount: number;
  columnCount: number;
  coordinateSetSha256: string;
  sparseIntervalManifestSha256: string;
  proposedTreatmentClass: string | null;
  treatmentAccepted: boolean;
  canonicalFutureState: null;
  exactOwnerAssignmentAccepted: boolean;
  status: string;
}

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  reportIdentitySha256: string;
  sourceBindings: Record<string, Binding>;
  authorityBoundary: Record<string, boolean | string>;
  selectedPlanningIdentity: {
    modelId: string;
    modelIdentitySha256: string;
    directlyModelledColumnCount: number;
    designSurface: { columnManifestSha256: string };
    boundCandidateAddedSolidIntervals: {
      candidateAddedSolidCellCount: number;
      intervalManifestSha256: string;
    };
    boundSupportGap: {
      cellCount: number;
      columnCount: number;
      intervalManifestSha256: string;
    };
  };
  deterministicSparseProposalContract: Record<string, unknown>;
  sparseCanonicalFutureStateProposal: {
    candidateAddedSolidCellCount: number;
    exactProposalPartitionCellCount: number;
    partitionComplete: boolean;
    canonicalCandidateStateCounts: Record<string, number>;
    acceptedFutureCellCount: number;
    acceptedConstructionCellCount: number;
    acceptedFutureStateManifestSha256: null;
    acceptedOwnershipManifestSha256: null;
    proposalAccepted: boolean;
  };
  typedDirectAndInfluenceFamilies: TypedFamily[];
  supportGapStatusLedger: {
    cellCount: number;
    columnCount: number;
    coordinateSetSha256: string;
    classifiedCellCount: number;
    unclassifiedCellCount: number;
    multiplyClassifiedCellCount: number;
    families: SupportFamily[];
    rawReservationOverlapDiagnosticsBeforePrecedence: Record<string, number>;
    treatmentAcceptance: Record<string, number | string>;
  };
  hydrologyAndRelicBoundary: {
    preservationPolicy: string;
    currentWaterLavaFrozenSnowCellsDirectlyReplacedByProposal: number;
    noDiversionTechnicallyAccepted: boolean;
    influenceUnknownIsNotZero: boolean;
    protectedRelicMinimumPlanningExclusion: {
      cellCount: number;
      coordinateSetSha256: string;
      excludedFromCandidateFill: boolean;
      acceptedAsExpertInfluenceDistance: boolean;
    };
  };
  exactReservationsAndInterfaces: {
    b08Interaction: { cellCount: number; coordinateSetSha256: string };
    b09MinimumPlanningAccommodation: { cellCount: number; coordinateSetSha256: string };
    d06ExternalContinuations: Array<{
      id: string;
      cellCount: number;
      coordinateSetSha256: string;
      fm01SupportGapIntersectionCellCount: number;
      physicalOpeningAuthorized: boolean;
      mechanismCommissioned: boolean;
    }>;
  };
  ownersAndInterfacesRequired: Record<string, number | boolean | null | unknown[]>;
  passHoldMatrix: Array<{ id: string; status: string; result: string }>;
  disposition: Record<string, boolean | number>;
  safetyBoundary: Record<string, boolean | number | unknown[]>;
}

function readReport(filename = COMMITTED_JSON): Report {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as Report;
}

function sha256File(filename: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function typedFamily(report: Report, id: string): TypedFamily {
  const result = report.typedDirectAndInfluenceFamilies.find(({ familyId }) => familyId === id);
  if (!result) throw new Error(`missing typed family ${id}`);
  return result;
}

function supportFamily(report: Report, id: string): SupportFamily {
  const result = report.supportGapStatusLedger.families.find((family) => family.id === id);
  if (!result) throw new Error(`missing support family ${id}`);
  return result;
}

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      'scripts/compile_combined_zones_d05_future_state.mjs',
      '--out',
      regeneratedJson,
      '--markdown',
      regeneratedMarkdown,
    ],
    { cwd: ROOT, stdio: 'pipe', maxBuffer: 4 * 1024 * 1024 },
  );
}, 30_000);

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones D05 sparse future-state engineering ledger', () => {
  it('regenerates byte-identically and binds every file input and immutable snapshot', () => {
    expect(fs.readFileSync(regeneratedJson).equals(fs.readFileSync(COMMITTED_JSON))).toBe(true);
    expect(fs.readFileSync(regeneratedMarkdown).equals(fs.readFileSync(COMMITTED_MARKDOWN)))
      .toBe(true);

    const report = readReport();
    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-d05-future-state',
      status:
        'PARTIAL_PASS_EXACT_SPARSE_FUTURE_STATE_PROPOSAL_AND_SUPPORT_CLASSIFICATION_D05_G02_HOLD',
      reportIdentitySha256: 'acf06949a267b2cc3e4da25a0aab3267dc18149fa373534389230d2961b5de2f',
    });
    for (const [name, source] of Object.entries(report.sourceBindings)) {
      if (name === 'immutablePhase0PostRegionSnapshot') {
        expect(source).toMatchObject({
          path: 'data/worldsnap-combined-zones-phase0-rerun-post-20260804T021358Z/region',
          sha256: '05eebe12ba419abd75b80033c265daf452b652a575c912f6df497735e00d271b',
          regionFileCount: 51,
          bytes: 290_946_492,
        });
        continue;
      }
      const filename = path.join(ROOT, source.path);
      expect(fs.statSync(filename).size).toBe(source.bytes);
      expect(sha256File(filename)).toBe(source.sha256);
    }
  });

  it('reproduces FM-01 and exactly partitions every candidate cell into sparse proposals', () => {
    const report = readReport();
    expect(report.selectedPlanningIdentity).toMatchObject({
      modelId: 'FM-01-COMPACT-EAST-FACE',
      modelIdentitySha256: '735b69b38c5c2ea840388039b5beb957671fe3e243ec7943c440649edcff36a6',
      directlyModelledColumnCount: 202_501,
      designSurface: {
        columnManifestSha256: '18f8a7eab678b862758bdb71733b0b91a5ba31a85bcb6d4920866461a4888f90',
      },
      boundCandidateAddedSolidIntervals: {
        candidateAddedSolidCellCount: 14_768_553,
        intervalManifestSha256: 'ed95837647ab5f13699e93fcc17de691d4da5f08115c4be34734e238b19b4196',
      },
    });
    expect(report.sparseCanonicalFutureStateProposal).toMatchObject({
      candidateAddedSolidCellCount: 14_768_553,
      exactProposalPartitionCellCount: 14_768_553,
      partitionComplete: true,
      canonicalCandidateStateCounts: {
        'minecraft:stone': 14_580_291,
        'minecraft:smooth_stone': 77_395,
        'minecraft:polished_diorite': 110_867,
      },
      acceptedFutureCellCount: 0,
      acceptedConstructionCellCount: 0,
      acceptedFutureStateManifestSha256: null,
      acceptedOwnershipManifestSha256: null,
      proposalAccepted: false,
    });
    expect(typedFamily(report, 'fill-direct')).toMatchObject({
      proposalCellCount: 14_580_291,
      acceptedCellCount: 0,
      acceptedCoordinateSetSha256: null,
      acceptedTypedFamilySha256: null,
      proposalSparseManifestSha256:
        '5fc31ddc0e2d85297430534857ba78d1c7dc824a4168608d9dbef80d006ae350',
    });
    expect(typedFamily(report, 'surface-finish-direct')).toMatchObject({
      proposalCellCount: 188_262,
      acceptedCellCount: 0,
      proposalSparseManifestSha256:
        '942f7a83c7f360309d68c27d3c7f56bec78eb4ad2d4716f0a1024908529be567',
    });
    expect(report.typedDirectAndInfluenceFamilies).toHaveLength(12);
    expect(report.typedDirectAndInfluenceFamilies.every(({ acceptedCellCount }) => (
      acceptedCellCount === 0
    ))).toBe(true);
  });

  it('classifies all 754,224 support-gap cells once without inventing acceptance', () => {
    const report = readReport();
    const ledger = report.supportGapStatusLedger;
    expect(report.selectedPlanningIdentity.boundSupportGap).toEqual({
      status: 'HOLD_EXACT_UNSUPPORTED_BELOW_Y72',
      columnCount: 107_345,
      cellCount: 754_224,
      intervalManifestSha256:
        '31664bc00e7a1d361567fb878e8653c2a4018045169d54900ca9ad15bddd7171',
      treatment: null,
      reason: expect.any(String),
    });
    expect(ledger).toMatchObject({
      cellCount: 754_224,
      columnCount: 107_345,
      coordinateSetSha256: 'f007560fafa7eceed438c4ade36981fe16461c7dad35b55f4f29bf729e86bde6',
      classifiedCellCount: 754_224,
      unclassifiedCellCount: 0,
      multiplyClassifiedCellCount: 0,
      treatmentAcceptance: {
        acceptedTreatmentRecordCount: 0,
        acceptedNoChangeRecordCount: 0,
        acceptedCanonicalStateCount: 0,
        acceptedOwnerAssignmentCount: 0,
        status: 'HOLD',
      },
    });
    expect(ledger.families.reduce((sum, family) => sum + family.cellCount, 0))
      .toBe(754_224);
    expect(supportFamily(report, 'SUPPORT-STATUS-RELIC-PRESERVE')).toMatchObject({
      cellCount: 363,
      coordinateSetSha256: '00d700cbfc8347081dd3f1aa1e5fa4f561c86de2ee2a776953c54826549c197f',
      proposedTreatmentClass: 'SUPPORT-RETAIN-VOID',
      treatmentAccepted: false,
      canonicalFutureState: null,
      exactOwnerAssignmentAccepted: false,
    });
    expect(supportFamily(report, 'SUPPORT-STATUS-WATER-ADJACENT').cellCount).toBe(63_368);
    expect(supportFamily(report, 'SUPPORT-STATUS-FROZEN-ADJACENT').cellCount).toBe(384_445);
    expect(supportFamily(report, 'SUPPORT-STATUS-SNOW-ADJACENT').cellCount).toBe(288_414);
    expect(supportFamily(report, 'SUPPORT-STATUS-OTHER-SURFACE')).toMatchObject({
      cellCount: 17_634,
      proposedTreatmentClass: 'SUPPORT-ENGINEERED-FILL',
      treatmentAccepted: false,
    });
    expect(ledger.rawReservationOverlapDiagnosticsBeforePrecedence).toMatchObject({
      relic: 363,
      b08: 0,
      b09: 0,
      d06: 0,
      threeOrMore: 0,
    });
  });

  it('preserves hydrology, relic, interface, D06, and complete-save holds', () => {
    const report = readReport();
    expect(report.hydrologyAndRelicBoundary).toMatchObject({
      preservationPolicy: 'ZERO_UNDECLARED_CHANGE_AND_DEFAULT_NO_DIVERSION',
      currentWaterLavaFrozenSnowCellsDirectlyReplacedByProposal: 0,
      noDiversionTechnicallyAccepted: false,
      influenceUnknownIsNotZero: true,
      protectedRelicMinimumPlanningExclusion: {
        cellCount: 4_890,
        coordinateSetSha256:
          '5dcbcaca22ee39ee9309e1fc5139eb3fbff052bb114ae00d20a723c045eab26b',
        excludedFromCandidateFill: true,
        acceptedAsExpertInfluenceDistance: false,
      },
    });
    for (const id of [
      'dewatering-and-sump-influence',
      'drainage-and-discharge-influence',
      'groundwater-infiltration-and-erosion-influence',
    ]) {
      expect(typedFamily(report, id)).toMatchObject({
        proposalCellCount: null,
        acceptedCellCount: 0,
        status: 'HOLD_UNKNOWN_INFLUENCE_NOT_COERCED_TO_EMPTY_SET',
      });
    }
    expect(report.exactReservationsAndInterfaces.b08Interaction).toMatchObject({
      cellCount: 15_096,
      coordinateSetSha256: 'ea3124fc7925dfb77b491c9685dbdad62714276a8a6c88fa3a60b35d20886f8e',
    });
    expect(report.exactReservationsAndInterfaces.b09MinimumPlanningAccommodation).toMatchObject({
      cellCount: 7_800,
      coordinateSetSha256: 'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
    });
    expect(report.exactReservationsAndInterfaces.d06ExternalContinuations).toEqual([
      expect.objectContaining({
        id: 'EG-A',
        cellCount: 1_274,
        coordinateSetSha256:
          'da0d3c3a2db61ea29efe64b55e13a977cc5c36a8773c1030af8cd91e856b2213',
        fm01SupportGapIntersectionCellCount: 0,
        physicalOpeningAuthorized: false,
        mechanismCommissioned: false,
      }),
      expect.objectContaining({
        id: 'EG-B',
        cellCount: 833,
        coordinateSetSha256:
          '8c5e784edcafe9355e0a4986616e5289264112b455e0b280962895a1a036c70a',
        fm01SupportGapIntersectionCellCount: 0,
        physicalOpeningAuthorized: false,
        mechanismCommissioned: false,
      }),
    ]);
    expect(report.passHoldMatrix.find(({ id }) => id === 'D05-FS-11-COMPLETE-SAVED-WORLD'))
      .toMatchObject({ status: 'HOLD' });
    expect(report.disposition).toMatchObject({
      ownerPolicyAccepted: true,
      supportGapStatusClassificationComplete: true,
      supportGapTreatmentAccepted: false,
      canonicalFutureStateAccepted: false,
      ownershipAndInterfacesAccepted: false,
      completeSavedWorldAccepted: false,
      acceptedFutureCellCount: 0,
      acceptedConstructionCellCount: 0,
      d05Resolved: false,
      r00G02Passed: false,
    });
  });

  it('stays compact, non-executable, and zero-operation', () => {
    const report = readReport();
    expect(fs.statSync(COMMITTED_JSON).size).toBeLessThan(100_000);
    expect(report.safetyBoundary).toEqual({
      offlineOnly: true,
      liveCallsPerformed: [],
      operations: [],
      operationCellCount: 0,
      materialCellCount: 0,
      futureCellCount: 0,
      constructionCellCount: 0,
      worldEditAuthorized: false,
      physicalBuildAuthorized: false,
      executable: false,
    });
    const serialized = fs.readFileSync(COMMITTED_JSON, 'utf8');
    expect(serialized).not.toContain('"cellRecords"');
    expect(serialized).not.toContain('"accepted": true');
  });
});
