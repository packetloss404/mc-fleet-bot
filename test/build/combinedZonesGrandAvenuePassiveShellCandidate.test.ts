import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_grand_avenue_passive_shell_candidate.mjs',
);
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-grand-avenue-passive-shell-candidate.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-grand-avenue-passive-shell-candidate.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-passive-shell-'));
const regeneratedJson = path.join(tempDir, 'candidate.json');
const regeneratedMarkdown = path.join(tempDir, 'candidate.md');

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
}

interface CellSet {
  cellCount: number;
  bounds: Record<string, number> | null;
  coordinateSetSha256: string;
  componentCount: number;
  largestComponentCellCount: number;
}

interface Census {
  cellCount: number;
  coordinateSetSha256: string;
  blockStateSetSha256: string;
  airCellCount: number;
  presentCellCount: number;
  waterCellCount: number;
  waterloggedCellCount: number;
  lavaCellCount: number;
  gravitySensitiveCellCount: number;
}

interface InterfaceContract {
  id: string;
  fromOwner: string;
  toOwner: string | null;
  direction: string;
  accepted: boolean;
  transitionPairCount?: number;
  transitionPairSha256?: string;
  exactCandidateInfluenceOverlap?: CellSet;
  exactCandidateOuterEnvelopeOverlap?: CellSet;
  exactProposedMaterialGeometryOverlap?: CellSet;
  exactClosureOverlap?: CellSet;
  exactCap?: CellSet;
  openingCells?: unknown[];
}

interface Report {
  schemaVersion: number;
  id: string;
  candidateId: string;
  status: string;
  authorityBoundary: Record<string, boolean>;
  safetyBoundary: {
    offlineOnly: boolean;
    immutableCopiedRegionOnly: boolean;
    liveCallsPerformed: unknown[];
    proposedBlockStatePalette: unknown[];
    proposedFutureStateRecords: unknown[];
    operations: unknown[];
    acceptedFutureStateCellCount: number;
    acceptedConstructionCellCount: number;
    acceptedMaterialCellCount: number;
    operationCellCount: number;
    canonicalOwnerAssignmentCount: number;
    acceptedInterfaceContractCount: number;
    executable: boolean;
    constructionAuthorized: boolean;
    materialSelectionAuthorized: boolean;
    worldEditAuthorized: boolean;
  };
  sourceBindings: Record<string, FileBinding | SnapshotBinding>;
  exactReferenceLine: {
    pointCount: number;
    start: { station: number; x: number; y: number; z: number; controllingRoadY: number };
    end: { station: number; x: number; y: number; z: number; controllingRoadY: number };
    b11SurfaceCenterlineSha256: string;
    referenceLineSha256: string;
    sparseRunCount: number;
    sparseRuns: unknown[];
  };
  exactSection: {
    evenWidthSideBias: Record<string, unknown>;
    evenHeightSideBias: Record<string, unknown>;
    outerSection: Record<string, number>;
    innerSectionBeforeClosures: Record<string, number>;
    oneCellBoundary: { materialOrBlockStateSelected: boolean };
    roadLoadSeparation: { retainedLayers: number; relationship: string };
  };
  exactCellSets: Record<string, CellSet>;
  passiveClosures: {
    westCapStation: number;
    eastCapStation: number;
    periodicBulkheadIntervalStations: number;
    periodicBulkheadStations: number[];
    doorOrOpeningCells: unknown[];
    openingCellCount: number;
    allClosuresProposedSolidAndSealed: boolean;
    materialOrMechanismSelected: boolean;
  };
  internalSegregationAndAccessReservations: {
    dryWetCellSetsDisjoint: boolean;
    dryWetReferenceLineSeparationBlocks: number;
    allReservationsExcludeEndCapsAndBulkheads: boolean;
    occupiableUseAuthorized: boolean;
    utilityServiceAuthorized: boolean;
    drainageDischargePoint: null;
    pumpOrPassiveOutfallSelected: boolean;
    reservations: Record<string, CellSet>;
  };
  exactCurrentStateCensus: {
    requiredChunkCount: number;
    missingChunkCount: number;
    candidateInfluenceUnion: Census;
    outerEnvelope: Census;
    proposedMaterialGeometry: Census;
    roadLoadSeparation: Census;
    exactZ03Z05HoustonCoordinationOverlap: Census;
  };
  generatedStructureAudit: {
    sourceRecordCount: number;
    sourceRegistrySha256: string;
    evaluatedRecordCount: number;
    recordsWithCandidateInfluenceIntersection: number;
    allRecords: Array<{
      sourceIndex: number;
      candidateOuterEnvelopeIntersection: CellSet;
      candidateInfluenceUnionIntersection: CellSet;
    }>;
    exactPresentFabricClearanceAccepted: boolean;
    constructionInfluenceMarginAccepted: boolean;
  };
  protectedCoreAudit: {
    sourceCoreCount: number;
    evaluatedCoreCount: number;
    coresWithCandidateInfluenceIntersection: number;
    records: Array<{
      positiveMarginStatus: string;
      candidateInfluenceIntersection: CellSet;
    }>;
    finalPositiveMarginClearanceAccepted: boolean;
  };
  houstonZ03Z05Coordination: {
    exactHalfOpenHoustonSampleEnvelope: Record<string, number>;
    exactCellSets: Record<string, CellSet>;
    sameCoordinateOverlapRequiresCanonicalOwnerAdjudication: boolean;
    physicalSeamAccepted: boolean;
    connectionOpened: boolean;
  };
  proposedSeparateOwnerRegistry: {
    status: string;
    records: Array<{
      proposedOwnerId: string;
      proposedScope: CellSet;
      sameCoordinateHoustonConflict?: CellSet;
      accepted: boolean;
    }>;
    canonicalOwnerAssignments: unknown[];
    canonicalOwnerAssignmentCount: number;
  };
  proposedInterfaceRegistry: {
    status: string;
    contracts: InterfaceContract[];
    acceptedContracts: unknown[];
    acceptedInterfaceContractCount: number;
  };
  exactGeometricQuantities: Record<string, number>;
  retainedHolds: Array<{ id: string; status: string; basis: string }>;
  decision: Record<string, boolean | string>;
}

const readReport = (): Report => (
  JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as Report
);

beforeAll(() => {
  execFileSync(
    process.execPath,
    [SCRIPT, '--out', regeneratedJson, '--markdown', regeneratedMarkdown],
    { cwd: ROOT, stdio: 'pipe', maxBuffer: 8 * 1024 * 1024 },
  );
}, 60_000);

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones exact Grand Avenue sealed passive-shell candidate', () => {
  it('regenerates the committed JSON and Markdown byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
  });

  it('binds all controlling evidence and the immutable region identity', () => {
    const report = readReport();
    expect(Object.keys(report.sourceBindings)).toEqual([
      'alternatives',
      'b11',
      'phase0',
      'geometry',
      'protectedRelics',
      'd02',
      'd06',
      'ownerReview',
      'siteGate',
      'immutablePhase0PostRegionSnapshot',
    ]);
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

  it('fixes an exact integer profile, even-section bias, lining, and road separation', () => {
    const report = readReport();
    expect(report.exactReferenceLine).toMatchObject({
      pointCount: 299,
      start: { station: 0, x: 1750, y: 62, z: -300, controllingRoadY: 68 },
      end: { station: 298, x: 2048, y: 66, z: -328, controllingRoadY: 72 },
      b11SurfaceCenterlineSha256: 'e63b7779674ad46fd7ad9c4ae0aea8f618afa8b656d3a24aa4367057cf103ff4',
      referenceLineSha256: '800738bca8b3f4c93f4b4a8ef4069a9b03e3a20d1c648bebe3c85be7cb007170',
      sparseRunCount: 57,
    });
    expect(report.exactReferenceLine.sparseRuns).toHaveLength(57);
    expect(report.exactSection).toMatchObject({
      evenWidthSideBias: {
        outerZOffsetsInclusive: { min: -3, max: 4 },
        innerZOffsetsInclusive: { min: -2, max: 3 },
        bias: 'one additional cell on positive-Z side',
      },
      evenHeightSideBias: {
        outerYOffsetsInclusive: { min: -2, max: 3 },
        innerYOffsetsInclusive: { min: -1, max: 2 },
        bias: 'one additional cell on positive-Y side',
      },
      outerSection: { widthBlocks: 8, heightBlocks: 6, cellsPerStation: 48 },
      innerSectionBeforeClosures: { widthBlocks: 6, heightBlocks: 4, cellsPerStation: 24 },
      oneCellBoundary: { materialOrBlockStateSelected: false },
      roadLoadSeparation: { retainedLayers: 2 },
    });
  });

  it('emits exact sparse cell sets, sealed closures, and segregated internal reservations', () => {
    const report = readReport();
    const sets = report.exactCellSets;
    expect({
      outer: sets.outerEnvelope.cellCount,
      inner: sets.innerEnvelopeBeforeClosures.cellCount,
      lining: sets.liningBoundary.cellCount,
      closures: sets.allSealedClosures.cellCount,
      proposedMaterial: sets.proposedMaterialGeometry.cellCount,
      retainedVoid: sets.retainedInternalVoid.cellCount,
      roadSeparation: sets.twoLayerRoadLoadSeparation.cellCount,
      influence: sets.candidateInfluenceUnion.cellCount,
    }).toEqual({
      outer: 14352,
      inner: 7176,
      lining: 7176,
      closures: 264,
      proposedMaterial: 7440,
      retainedVoid: 6912,
      roadSeparation: 4784,
      influence: 19136,
    });
    expect(sets.candidateInfluenceUnion).toMatchObject({
      coordinateSetSha256: '5624f283c56d3782c7ff67bf1a6a86f572b2d9f52e598010146a6549b7ae9a99',
      componentCount: 1,
      largestComponentCellCount: 19136,
    });
    expect(report.passiveClosures).toEqual({
      westCapStation: 0,
      eastCapStation: 298,
      periodicBulkheadIntervalStations: 32,
      periodicBulkheadStations: [32, 64, 96, 128, 160, 192, 224, 256, 288],
      doorOrOpeningCells: [],
      openingCellCount: 0,
      allClosuresProposedSolidAndSealed: true,
      materialOrMechanismSelected: false,
    });
    const reservations = report.internalSegregationAndAccessReservations;
    expect(reservations).toMatchObject({
      dryWetCellSetsDisjoint: true,
      dryWetReferenceLineSeparationBlocks: 5,
      allReservationsExcludeEndCapsAndBulkheads: true,
      occupiableUseAuthorized: false,
      utilityServiceAuthorized: false,
      drainageDischargePoint: null,
      pumpOrPassiveOutfallSelected: false,
    });
    expect(Object.fromEntries(Object.entries(reservations.reservations).map(
      ([id, set]) => [id, set.cellCount],
    ))).toEqual({
      dryUtility: 288,
      wetUtility: 288,
      drainageInvert: 288,
      maintenanceWalkway: 1152,
      clearInspectionEnvelope: 3456,
      programmedUnion: 5472,
      unprogrammedInternalVoid: 1440,
      sealedUtilityEndpointCaps: 6,
    });
  });

  it('binds exact current blocks and fluids while screening all starts and protected cores', () => {
    const report = readReport();
    expect(report.exactCurrentStateCensus).toMatchObject({
      requiredChunkCount: 31,
      missingChunkCount: 0,
      candidateInfluenceUnion: {
        cellCount: 19136,
        presentCellCount: 14443,
        airCellCount: 4693,
        waterCellCount: 11,
        waterloggedCellCount: 0,
        lavaCellCount: 0,
        gravitySensitiveCellCount: 423,
        blockStateSetSha256: 'ead67cf05c5a3864621477578bb6d9b6e25c3a0c34e44fcf483774f6f9e6192c',
      },
      outerEnvelope: {
        cellCount: 14352,
        presentCellCount: 11099,
        airCellCount: 3253,
        waterCellCount: 11,
        lavaCellCount: 0,
        blockStateSetSha256: 'acf62d0655ca8fe8b5bab5c524adfe6b112ae79660f3c187f810301d4edb3313',
      },
    });
    expect(report.generatedStructureAudit).toMatchObject({
      sourceRecordCount: 114,
      evaluatedRecordCount: 114,
      recordsWithCandidateInfluenceIntersection: 0,
      sourceRegistrySha256: '077cef4df8c8e02011da5fd082453eeda89331b2900cada8b5c2ab6acaf136f4',
      exactPresentFabricClearanceAccepted: false,
      constructionInfluenceMarginAccepted: false,
    });
    expect(report.generatedStructureAudit.allRecords).toHaveLength(114);
    expect(report.generatedStructureAudit.allRecords.every((record) => (
      record.candidateOuterEnvelopeIntersection.cellCount === 0
      && record.candidateInfluenceUnionIntersection.cellCount === 0
    ))).toBe(true);
    expect(report.protectedCoreAudit).toMatchObject({
      sourceCoreCount: 3,
      evaluatedCoreCount: 3,
      coresWithCandidateInfluenceIntersection: 0,
      finalPositiveMarginClearanceAccepted: false,
    });
    expect(report.protectedCoreAudit.records.every((record) => (
      record.positiveMarginStatus === 'HOLD_NOT_FROZEN'
      && record.candidateInfluenceIntersection.cellCount === 0
    ))).toBe(true);
  });

  it('publishes the exact Z03/Z05 overlap and proposed owner/interfaces without acceptance', () => {
    const report = readReport();
    expect(report.houstonZ03Z05Coordination).toMatchObject({
      exactHalfOpenHoustonSampleEnvelope: {
        minXInclusive: 2036,
        maxXExclusive: 2060,
        minYInclusive: 64,
        maxYExclusive: 72,
        minZInclusive: -340,
        maxZExclusive: -316,
      },
      sameCoordinateOverlapRequiresCanonicalOwnerAdjudication: true,
      physicalSeamAccepted: false,
      connectionOpened: false,
    });
    const houston = report.houstonZ03Z05Coordination.exactCellSets;
    expect(Object.fromEntries(Object.entries(houston).map(
      ([id, set]) => [id, { count: set.cellCount, hash: set.coordinateSetSha256 }],
    ))).toEqual({
      candidateOuterEnvelopeOverlap: {
        count: 624,
        hash: '96c1f649562f9a23b80f868b49c203d1fcdf6735d5ef210b0c49e7275dbfb4b3',
      },
      proposedMaterialGeometryOverlap: {
        count: 360,
        hash: '1c1b70ae36ecf28ca5e0861f8f1441405d2ccbe964b281708c68124061071035',
      },
      roadLoadSeparationOverlap: {
        count: 208,
        hash: 'cedfb034226c321189527f506816859119ddfd294dcb709841f6606b06463e59',
      },
      exactZ03Z05CoordinationOverlap: {
        count: 832,
        hash: '86195fda69bbe53bdc114641e7a64680962dae83543d3732661862c2d468a317',
      },
      closureOverlap: {
        count: 48,
        hash: '4c0f103bfa8e9d4a24e27c11c6efb56f65d0730eaf8e4ed2b896f60435418f8d',
      },
    });
    expect(report.proposedSeparateOwnerRegistry).toMatchObject({
      status: 'PROPOSED_NOT_CANONICAL_NOT_ACCEPTED',
      canonicalOwnerAssignments: [],
      canonicalOwnerAssignmentCount: 0,
    });
    expect(report.proposedSeparateOwnerRegistry.records.map(({ proposedOwnerId, accepted }) => ({
      proposedOwnerId,
      accepted,
    }))).toEqual([
      {
        proposedOwnerId: 'OWN-Z03-GRAND-AVENUE-PASSIVE-SHELL-CANDIDATE',
        accepted: false,
      },
      {
        proposedOwnerId: 'OWN-P1-B12-GA-PASSIVE-SHELL-RESERVATIONS',
        accepted: false,
      },
    ]);
    const contracts = report.proposedInterfaceRegistry.contracts;
    expect(contracts.map(({ id }) => id)).toEqual([
      'IF-P1-B12-PASSIVE-SHELL-ROOF-TO-Z03-SURFACE',
      'IF-P1-B12-Z03-Z05-HOUSTON-SAME-COORDINATE-OVERLAP',
      'IF-P1-B12-WEST-CAP-SEALED',
      'IF-P1-B12-EAST-CAP-HOUSTON-SEALED',
      'IF-P1-B12-UTILITY-ENDPOINTS-SEALED',
    ]);
    expect(contracts[0]).toMatchObject({
      transitionPairCount: 2392,
      transitionPairSha256: '45cb61796f1991259e9ddfb45cafb56ca9111aeddb5b3dc4213871dd3d575aa1',
      accepted: false,
    });
    expect(contracts.every(({ accepted }) => accepted === false)).toBe(true);
    expect(report.proposedInterfaceRegistry.acceptedContracts).toEqual([]);
    expect(report.proposedInterfaceRegistry.acceptedInterfaceContractCount).toBe(0);
  });

  it('retains every technical/global HOLD and stays zero-operation and non-executable', () => {
    const report = readReport();
    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-grand-avenue-passive-shell-candidate',
      candidateId: 'P1-B12-GA-PASSIVE-SHELL-CANDIDATE-01',
      status: 'EXACT_PASSIVE_SHELL_CANDIDATE_READY_FOR_REVIEW_ALL_TECHNICAL_AND_PHYSICAL_GATES_HOLD',
      authorityBoundary: {
        thisCandidateAcceptedByOwner: false,
        thisCandidateTechnicallyAccepted: false,
        canonicalOwnershipAccepted: false,
        interfaceContractsAccepted: false,
        globalAuditPassed: false,
        physicalReleaseAuthorized: false,
      },
      safetyBoundary: {
        offlineOnly: true,
        immutableCopiedRegionOnly: true,
        liveCallsPerformed: [],
        proposedBlockStatePalette: [],
        proposedFutureStateRecords: [],
        operations: [],
        acceptedFutureStateCellCount: 0,
        acceptedConstructionCellCount: 0,
        acceptedMaterialCellCount: 0,
        operationCellCount: 0,
        canonicalOwnerAssignmentCount: 0,
        acceptedInterfaceContractCount: 0,
        executable: false,
        constructionAuthorized: false,
        materialSelectionAuthorized: false,
        worldEditAuthorized: false,
      },
      decision: {
        exactCandidateGeometryPrepared: true,
        retainNoForeclosureReservation: true,
        conditionalShellCandidateSelectedForReview: true,
        constructNow: false,
        fitOutNow: false,
        openAnyCapBulkheadUtilityOrHoustonInterface: false,
      },
    });
    expect(report.retainedHolds.map(({ id, status }) => ({ id, status }))).toEqual([
      { id: 'P1-B12-H01-COMPLETE-SAVE', status: 'HOLD' },
      { id: 'P1-B12-H02-GEOTECHNICAL-STRUCTURAL-ROAD-LOAD', status: 'HOLD' },
      { id: 'P1-B12-H03-HYDROLOGY-DRAINAGE', status: 'HOLD' },
      { id: 'P1-B12-H04-UTILITIES', status: 'HOLD' },
      { id: 'P1-B12-H05-D06-OCCUPIABLE-USE', status: 'HOLD' },
      { id: 'P1-B12-H06-OWNER-INTERFACE-ACCEPTANCE', status: 'HOLD' },
      { id: 'P1-B12-H07-GLOBAL-CROSS-SCOPE-AUDIT', status: 'HOLD' },
      { id: 'P1-B12-H08-PHYSICAL-COMPILER-RELEASE', status: 'HOLD' },
    ]);
    expect(report.exactGeometricQuantities).toMatchObject({
      acceptedConstructionCells: 0,
      acceptedMaterialCells: 0,
      operationCells: 0,
    });
  });
});
