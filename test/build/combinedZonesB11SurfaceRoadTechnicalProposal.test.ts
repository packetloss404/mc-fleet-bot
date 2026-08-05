import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_b11_surface_road_technical_proposal.mjs',
);
const COMMITTED_JSON = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-b11-surface-road-technical-proposal.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-b11-surface-road-technical-proposal.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-b11-road-'));
const regeneratedJson = path.join(tempDir, 'proposal.json');
const regeneratedMarkdown = path.join(tempDir, 'proposal.md');

interface CellSet {
  cellCount: number;
  bounds: Record<string, number> | null;
  coordinateSetSha256: string;
  accepted: boolean;
  operationAuthorization: boolean;
}

interface Census {
  cellCount: number;
  airCellCount: number;
  presentCellCount: number;
  waterCellCount: number;
  waterloggedCellCount: number;
  lavaCellCount: number;
  gravitySensitiveCellCount: number;
}

interface Hold {
  id: string;
  status: string;
  [key: string]: unknown;
}

interface Report {
  status: string;
  authorityBoundary: Record<string, boolean | string>;
  safetyBoundary: {
    offlineOnly: boolean;
    liveCallsPerformed: unknown[];
    proposedBlockStatePalette: unknown[];
    proposedFutureStateRecords: unknown[];
    operations: unknown[];
    acceptedFutureStateCellCount: number;
    acceptedConstructionCellCount: number;
    acceptedMaterialCellCount: number;
    acceptedInfluenceCellCount: number;
    operationCellCount: number;
    executable: boolean;
    constructionAuthorized: boolean;
    worldEditAuthorized: boolean;
  };
  sourceBindings: Record<string, {
    path: string;
    sha256: string;
    bytes: number;
    role?: string;
    regionFileCount?: number;
  }>;
  exactAcceptedReferenceProfile: {
    pointCount: number;
    start: Record<string, number>;
    end: Record<string, number>;
    orderedCoordinateSha256: string;
    riseStations: Array<Record<string, number>>;
    crossSectionBlocks: number;
    acceptedProfileAmendedByThisArtifact: boolean;
  };
  proposedEightWideSetout: {
    referenceLatticePosition: string;
    roadZOffsetsInclusive: { min: number; max: number };
    extraCellSide: string;
    materialOrBlockStateSelected: boolean;
    formationDepthSelected: boolean;
    accepted: boolean;
  };
  exactCellSets: Record<string, CellSet>;
  reservationDesign: {
    roadLoad: Record<string, unknown>;
    drainage: Record<string, unknown>;
    utilities: Record<string, unknown>;
    expertConstructionInfluenceKernel: null;
    expertConstructionInfluenceAccepted: boolean;
  };
  exactCurrentStateCensus: {
    requiredChunkCount: number;
    missingChunkCount: number;
    sets: Record<string, Census>;
    fluidFinding: Record<string, number | boolean>;
  };
  generatedStructureAudit: {
    sourceRecordCount: number;
    evaluatedRecordCount: number;
    recordsWithCandidateInteractionIntersection: number;
    records: Array<{ candidateInteractionIntersection: CellSet }>;
    exactPresentFabricClearanceAccepted: boolean;
    constructionInfluenceMarginAccepted: boolean;
  };
  protectedRelicAudit: {
    sourceCoreCount: number;
    evaluatedCoreCount: number;
    coresWithCandidateInteractionIntersection: number;
    records: Array<{
      positiveMarginStatus: string;
      candidateInteractionIntersection: CellSet;
    }>;
    finalPositiveMarginClearanceAccepted: boolean;
  };
  p1B12Coordination: {
    b12CandidateAccepted: boolean;
    exactRoadLoadSetsIdentical: boolean;
    roadLoadCellCount: number;
    b12BoundRoadLoadCoordinateSetSha256: string;
    proposedRoadConstructionVsB12OuterEnvelope: CellSet;
    candidateInteractionVsB12Influence: CellSet;
    roadSurfaceToB12UpperLoadLayer: {
      transitionPairCount: number;
      transitionPairSha256: string;
      accepted: boolean;
    };
    canonicalSharedOwnerAccepted: boolean;
    structuralTransferAccepted: boolean;
    physicalSeamAccepted: boolean;
  };
  houstonZ03Z05Coordination: {
    exactHalfOpenHoustonSampleEnvelope: Record<string, number>;
    exactCellSets: Record<string, CellSet>;
    sameCoordinateOverlapRequiresCanonicalOwnerAdjudication: boolean;
    physicalSeamAccepted: boolean;
    connectionOpened: boolean;
  };
  c1AndOtherScopeAudit: {
    c1: {
      classification: string;
      clearIntermediateXColumnCount: number;
    };
    g03OtherScopes: Array<{
      scopeId: string;
      classification: string;
      exactCandidateInteractionIntersection?: CellSet;
    }>;
    knownBoundsIntersectionRequiringExactFollowupCount: number;
    unknownCanonicalScopeCount: number;
  };
  g03ProposalImpact: {
    currentCommittedG03ArtifactModified: boolean;
    currentCommittedG03Result: string;
    currentCommittedUnresolvedRequiredDomainCount: number;
    p1B11GeometryNullDomainsBefore: string[];
    p1B11GeometryNullDomainsRemovedByThisProposal: string[];
    proposalGeometryNullDomainRemovalCount: number;
    projectedRemainingGeometryNullDomainsIfConsumedByNextG03Compilation: number;
    p1B11AcceptedDomainCount: number;
    canonicalG03Passed: boolean;
  };
  nullTechnicalDesignAndRetainedHolds: Hold[];
  decision: Record<string, boolean>;
}

function readReport(): Report {
  return JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as Report;
}

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

describe('Combined Zones P1-B11 surface-road technical proposal', () => {
  it('regenerates the committed JSON and Markdown byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
  });

  it('preserves the accepted profile and resolves the eight-wide bias only as a proposal', () => {
    const report = readReport();
    expect(report.exactAcceptedReferenceProfile).toMatchObject({
      pointCount: 299,
      start: { station: 0, x: 1750, y: 68, z: -300 },
      end: { station: 298, x: 2048, y: 72, z: -328 },
      orderedCoordinateSha256: 'e63b7779674ad46fd7ad9c4ae0aea8f618afa8b656d3a24aa4367057cf103ff4',
      crossSectionBlocks: 8,
      acceptedProfileAmendedByThisArtifact: false,
    });
    expect(report.exactAcceptedReferenceProfile.riseStations.map(({ station }) => station))
      .toEqual([38, 112, 187, 261]);
    expect(report.proposedEightWideSetout).toMatchObject({
      referenceLatticePosition: 'lower-Z central lattice column',
      roadZOffsetsInclusive: { min: -3, max: 4 },
      extraCellSide: 'positive-Z',
      materialOrBlockStateSelected: false,
      formationDepthSelected: false,
      accepted: false,
    });
    expect(report.authorityBoundary).toMatchObject({
      b11PlanningProfileAcceptedBySoleOwner: true,
      b11AcceptancePayloadSha256: 'd1bcd9aa70fb5374407013cf87b6396083341057e61a45764f42622cc2706d28',
      acceptedProfileAmended: false,
      eightWideSideBiasAcceptedByOwner: false,
      technicalDesignAccepted: false,
    });
  });

  it('binds exact construction, interaction, drainage, utility, and load reservations', () => {
    const report = readReport();
    expect(report.exactCellSets.proposedRoadConstruction).toMatchObject({
      cellCount: 2392,
      bounds: { minX: 1750, maxX: 2048, minY: 68, maxY: 72, minZ: -331, maxZ: -296 },
      coordinateSetSha256: 'dc75445cbbb40c951ee65e476c2be271412ef5682439394e29ce7370a323d80c',
      accepted: false,
    });
    expect(report.exactCellSets.candidateInteractionUnion.cellCount).toBe(11960);
    expect(report.exactCellSets.interactionShellExcludingConstruction.cellCount).toBe(9568);
    expect(report.exactCellSets.roadLoadInfluenceReservation.cellCount).toBe(4784);
    expect(report.exactCellSets.bilateralDrainageReservation.cellCount).toBe(598);
    expect(report.exactCellSets.dryUtilityReservation.cellCount).toBe(299);
    expect(report.exactCellSets.wetUtilityReservation.cellCount).toBe(299);
    expect(report.exactCellSets.utilityReservationUnion.cellCount).toBe(598);
    expect(report.exactCellSets.candidateInfluenceReservationUnion).toMatchObject({
      cellCount: 5980,
      bounds: { minX: 1750, maxX: 2048, minY: 66, maxY: 71, minZ: -332, maxZ: -295 },
      coordinateSetSha256: 'c4a6c43350246703545cfeab7f4a896baea666f6cc010e173a576180aabfb401',
      accepted: false,
      operationAuthorization: false,
    });
    expect(report.reservationDesign.roadLoad).toMatchObject({
      exactMatchToB12TwoLayerRoadLoadSeparation: true,
      structuralLoadModel: null,
      accepted: false,
    });
    expect(report.reservationDesign.drainage).toMatchObject({
      crossfall: null,
      capacity: null,
      receiver: null,
      outfall: null,
      accepted: false,
    });
    expect(report.reservationDesign.utilities).toMatchObject({
      serviceTypes: null,
      capacities: null,
      crossingDetails: null,
      accepted: false,
    });
    expect(report.reservationDesign.expertConstructionInfluenceKernel).toBeNull();
    expect(report.reservationDesign.expertConstructionInfluenceAccepted).toBe(false);
  });

  it('audits immutable current state, fluids, structures, relics, C1, and other scopes', () => {
    const report = readReport();
    expect(report.exactCurrentStateCensus).toMatchObject({
      requiredChunkCount: 34,
      missingChunkCount: 0,
    });
    expect(report.exactCurrentStateCensus.sets.proposedRoadConstruction).toMatchObject({
      cellCount: 2392,
      presentCellCount: 1601,
      airCellCount: 791,
      waterCellCount: 0,
      lavaCellCount: 0,
    });
    expect(report.exactCurrentStateCensus.sets.candidateInteractionUnion).toMatchObject({
      cellCount: 11960,
      presentCellCount: 8073,
      airCellCount: 3887,
      waterCellCount: 0,
      waterloggedCellCount: 0,
      lavaCellCount: 0,
    });
    expect(report.generatedStructureAudit).toMatchObject({
      sourceRecordCount: 114,
      evaluatedRecordCount: 114,
      recordsWithCandidateInteractionIntersection: 0,
      exactPresentFabricClearanceAccepted: false,
      constructionInfluenceMarginAccepted: false,
    });
    expect(report.generatedStructureAudit.records).toHaveLength(114);
    expect(report.generatedStructureAudit.records.every(
      ({ candidateInteractionIntersection }) => candidateInteractionIntersection.cellCount === 0,
    )).toBe(true);
    expect(report.protectedRelicAudit).toMatchObject({
      sourceCoreCount: 3,
      evaluatedCoreCount: 3,
      coresWithCandidateInteractionIntersection: 0,
      finalPositiveMarginClearanceAccepted: false,
    });
    expect(report.protectedRelicAudit.records.every((record) => (
      record.positiveMarginStatus === 'HOLD_NOT_FROZEN'
      && record.candidateInteractionIntersection.cellCount === 0
    ))).toBe(true);
    expect(report.c1AndOtherScopeAudit.c1).toEqual({
      sourceExactColumnSetSha256: 'a236f24b9371f8fdedca66416109aacd11a2101ffe1c1a1b80117ab027909d70',
      sourceBounds2d: { minX: 430, maxX: 1572, minZ: -291, maxZ: 111 },
      b11CandidateInteractionBounds3d: {
        minX: 1750, maxX: 2048, minY: 66, maxY: 73, minZ: -332, maxZ: -295,
      },
      classification: 'BOUNDS_DISJOINT',
      clearIntermediateXColumnCount: 177,
      physicalSeamAccepted: false,
    });
    expect(report.c1AndOtherScopeAudit.knownBoundsIntersectionRequiringExactFollowupCount).toBe(0);
    expect(report.c1AndOtherScopeAudit.unknownCanonicalScopeCount).toBe(2);
  });

  it('discloses the exact B12 and Houston seams without accepting either', () => {
    const report = readReport();
    expect(report.p1B12Coordination).toMatchObject({
      b12CandidateAccepted: false,
      exactRoadLoadSetsIdentical: true,
      roadLoadCellCount: 4784,
      b12BoundRoadLoadCoordinateSetSha256: 'bd510ae1e1fdd4888aaed37290700c0edde54fb2cf041835d79d857d6d106df6',
      proposedRoadConstructionVsB12OuterEnvelope: { cellCount: 0 },
      candidateInteractionVsB12Influence: { cellCount: 4784 },
      roadSurfaceToB12UpperLoadLayer: {
        transitionPairCount: 2392,
        transitionPairSha256: '4b6290b6e32d7e0999f54e47b27f1c13d75ab8f8d50c7ead886ff2039ea213b1',
        accepted: false,
      },
      canonicalSharedOwnerAccepted: false,
      structuralTransferAccepted: false,
      physicalSeamAccepted: false,
    });
    expect(report.houstonZ03Z05Coordination.exactCellSets).toMatchObject({
      proposedRoadConstructionOverlap: { cellCount: 0 },
      candidateInteractionOverlap: { cellCount: 260 },
      candidateInfluenceReservationOverlap: { cellCount: 260 },
      roadLoadReservationOverlap: { cellCount: 208 },
      drainageReservationOverlap: { cellCount: 26 },
      utilityReservationOverlap: { cellCount: 26 },
    });
    expect(report.houstonZ03Z05Coordination).toMatchObject({
      sameCoordinateOverlapRequiresCanonicalOwnerAdjudication: true,
      physicalSeamAccepted: false,
      connectionOpened: false,
    });
    const b12Scope = report.c1AndOtherScopeAudit.g03OtherScopes.find(
      ({ scopeId }) => scopeId === 'P1-B12',
    );
    expect(b12Scope).toMatchObject({
      classification: 'EXACT_INTERSECTION_COMPILED',
      exactCandidateInteractionIntersection: { cellCount: 4784 },
    });
  });

  it('removes three proposal geometry nulls while retaining every technical and release HOLD', () => {
    const report = readReport();
    expect(report.g03ProposalImpact).toEqual({
      currentCommittedG03ArtifactModified: false,
      currentCommittedG03Result: 'HOLD',
      currentCommittedUnresolvedRequiredDomainCount: 19,
      p1B11GeometryNullDomainsBefore: ['construction', 'interaction', 'influence'],
      p1B11GeometryNullDomainsRemovedByThisProposal: ['construction', 'interaction', 'influence'],
      proposalGeometryNullDomainRemovalCount: 3,
      projectedRemainingGeometryNullDomainsIfConsumedByNextG03Compilation: 16,
      p1B11AcceptedDomainCount: 0,
      canonicalG03Passed: false,
      reason: expect.any(String),
    });
    expect(report.nullTechnicalDesignAndRetainedHolds).toHaveLength(9);
    expect(report.nullTechnicalDesignAndRetainedHolds.every(({ status }) => status === 'HOLD'))
      .toBe(true);
    const requiredNulls: Record<string, string[]> = {
      'P1-B11-H01-MATERIAL-AND-FUTURE-STATE': ['selectedMaterialPalette', 'acceptedFutureStateManifest'],
      'P1-B11-H02-EARTHWORK-AND-RETAINING': ['excavationManifest', 'fillManifest', 'retainingManifest'],
      'P1-B11-H03-DRAINAGE': ['hydraulicDesign', 'receiverAndOutfall'],
      'P1-B11-H04-UTILITIES': ['utilityDesign'],
      'P1-B11-H05-STRUCTURAL-AND-ROAD-LOAD': ['structuralDesign', 'loadModel'],
      'P1-B11-H06-GEOTECHNICAL': ['geotechnicalDesignBasis'],
      'P1-B11-H07-COMPLETE-SAVE-AND-ENTITY-CLEARANCE': ['completeSameMomentSave', 'exactEntityClearance'],
      'P1-B11-H08-OWNERSHIP-INTERFACES-AND-TECHNICAL-ACCEPTANCE': ['canonicalOwnership', 'acceptedInterfaceContracts', 'independentTechnicalAcceptance'],
      'P1-B11-H09-PHYSICAL-COMPILER-AND-RELEASE': ['operationPlan', 'rollbackPlan', 'preflight', 'releaseLedger'],
    };
    for (const hold of report.nullTechnicalDesignAndRetainedHolds) {
      for (const key of requiredNulls[hold.id]) expect(hold[key], `${hold.id}.${key}`).toBeNull();
    }
  });

  it('binds every source and remains non-executable with zero accepted or operation cells', () => {
    const report = readReport();
    expect(Object.keys(report.sourceBindings)).toEqual([
      'b11',
      'ownerAcceptance',
      'b12',
      'houstonGeometry',
      'currentRegionEvidence',
      'phase0',
      'protectedRelics',
      'c1',
      'g03',
      'completeSave',
      'immutableSelectedRegionSnapshot',
    ]);
    for (const binding of Object.values(report.sourceBindings)) {
      if (!binding.role) continue;
      const filename = path.join(ROOT, binding.path);
      expect(fs.statSync(filename).size, binding.path).toBe(binding.bytes);
      expect(crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex'))
        .toBe(binding.sha256);
    }
    expect(report.sourceBindings.immutableSelectedRegionSnapshot).toMatchObject({
      path: 'data/worldsnap-combined-zones-phase0-rerun-post-20260804T021358Z/region',
      sha256: '05eebe12ba419abd75b80033c265daf452b652a575c912f6df497735e00d271b',
      regionFileCount: 51,
      bytes: 290946492,
    });
    expect(report.safetyBoundary).toMatchObject({
      offlineOnly: true,
      liveCallsPerformed: [],
      proposedBlockStatePalette: [],
      proposedFutureStateRecords: [],
      operations: [],
      acceptedFutureStateCellCount: 0,
      acceptedConstructionCellCount: 0,
      acceptedMaterialCellCount: 0,
      acceptedInfluenceCellCount: 0,
      operationCellCount: 0,
      executable: false,
      constructionAuthorized: false,
      worldEditAuthorized: false,
    });
    expect(report.decision).toMatchObject({
      exactSurfaceRoadSetoutPreparedForReview: true,
      acceptedB11ProfilePreservedByteForByte: true,
      sideBiasResolvedAsProposalOnly: true,
      materialOrFutureStateAccepted: false,
      technicalDesignAccepted: false,
      buildNow: false,
      emitOperations: false,
    });
  });
});
