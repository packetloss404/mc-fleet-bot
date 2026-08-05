import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const COMMITTED_JSON = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-proposed-ownership-interface-registry.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-proposed-ownership-interface-registry.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-owner-interface-'));
const regeneratedJson = path.join(tempDir, 'registry.json');
const regeneratedMarkdown = path.join(tempDir, 'registry.md');

interface Binding {
  path: string;
  bytes: number;
  sha256: string;
}

interface OwnerRecord {
  ownerId: string;
  scope: string;
  proposedCellCount: number | null;
  proposedCoordinateSetSha256: string | null;
  proposalStatus: string;
  exactCellAssignmentAccepted: boolean;
  acceptedBy: null;
}

interface Adjudication {
  adjudicationId: string;
  scope: string;
  winningOwnerId: string;
  yieldingOwnerIds: string[];
  exactConflictCellSet: { cellCount: number; coordinateSetSha256: string };
  accepted: boolean;
  status: string;
}

interface InterfaceContract {
  contractId: string;
  scope: string;
  fromOwnerId: string;
  toOwnerId: string | null;
  direction: string;
  interfaceCellSet: { cellCount: number; coordinateSetSha256: string } | null;
  transitionPairCount: number | null;
  transitionPairManifestSha256: string | null;
  ownershipSemantics: string;
  defaultDeny: boolean;
  wildcardAllowed: boolean;
  lastWriterWinsAllowed: boolean;
  accepted: boolean;
  acceptedBy: null;
  status: string;
}

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  canonicalPayloadSha256: string;
  reportIdentitySha256: string;
  sourceBindings: Record<string, Binding>;
  authorityBoundary: Record<string, boolean | string>;
  registryContract: {
    ownerRegistryManifestSha256: string;
    interfaceRegistryManifestSha256: string;
    adjudicationRegistryManifestSha256: string;
    forbidden: string[];
  };
  proposedOwnerRegistry: {
    proposedOwnerRecordCount: number;
    ownerRecords: OwnerRecord[];
    knownProposedCellCount: number;
    acceptedOwnerRecordCount: number;
    acceptedOwnerCellCount: number;
    canonicalOwnerAcceptanceRecorded: boolean;
  };
  proposedOwnershipAdjudications: {
    recordCount: number;
    records: Adjudication[];
    acceptedRecordCount: number;
    wildcardRecordCount: number;
    lastWriterWinsRecordCount: number;
  };
  proposedDirectionalInterfaceRegistry: {
    contractCount: number;
    exactInterfaceCellSetCount: number;
    exactTransitionPairManifestCount: number;
    nullInterfaceCellSetCount: number;
    contracts: InterfaceContract[];
    acceptedContractCount: number;
    wildcardContractCount: number;
    bidirectionalContractCount: number;
    lastWriterWinsContractCount: number;
  };
  proposalAccounting: Record<string, Record<string, number> | number>;
  crossScopeDisjointProof: Record<string, unknown>;
  sourceHoldRegistry: {
    status: string;
    sourceGroupCount: number;
    sourceHoldRecordCount: number;
    sourceHoldManifestSha256: string;
  };
  remainingEvidenceHolds: Array<{ id: string; status: string; requirement: string }>;
  passHoldMatrix: Array<{ id: string; status: string; result: string }>;
  disposition: Record<string, boolean>;
  safetyBoundary: Record<string, boolean | number | unknown[]>;
}

function readReport(filename = COMMITTED_JSON): Report {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as Report;
}

function sha256File(filename: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function owner(report: Report, ownerId: string): OwnerRecord {
  const result = report.proposedOwnerRegistry.ownerRecords.find((item) => item.ownerId === ownerId);
  if (!result) throw new Error(`missing owner ${ownerId}`);
  return result;
}

function contract(report: Report, contractId: string): InterfaceContract {
  const result = report.proposedDirectionalInterfaceRegistry.contracts
    .find((item) => item.contractId === contractId);
  if (!result) throw new Error(`missing contract ${contractId}`);
  return result;
}

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      'scripts/compile_combined_zones_proposed_ownership_interface_registry.mjs',
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

describe('Combined Zones proposed ownership and interface registry', () => {
  it('regenerates byte-identically and binds all exact input artifacts', () => {
    expect(fs.readFileSync(regeneratedJson).equals(fs.readFileSync(COMMITTED_JSON))).toBe(true);
    expect(fs.readFileSync(regeneratedMarkdown).equals(fs.readFileSync(COMMITTED_MARKDOWN)))
      .toBe(true);
    const report = readReport();
    expect(report).toMatchObject({
      schemaVersion: 2,
      id: 'combined-zones-phase1-proposed-ownership-interface-registry',
      status:
        'PARTIAL_PASS_EXACT_PROPOSED_OWNERSHIP_AND_DIRECTIONAL_INTERFACES_FINAL_ACCEPTANCE_HOLD',
      canonicalPayloadSha256:
        '233fd08f0b9a1884447a50fb03c4600726c77db838d9016e163f867d513fb55b',
      reportIdentitySha256: '969627cd61d1a98b905213ee5819456e6cdb1bb733ecfa28d74ac2022c626245',
      registryContract: {
        ownerRegistryManifestSha256:
          '2d77b74a0ce8048471e6355e794bdc26474328ebd1e57d607efa2dd434951244',
        interfaceRegistryManifestSha256:
          '8774ad1483309dd4906787411d1e91094ef14562d4e5582566cc95a4d76dfc0c',
        adjudicationRegistryManifestSha256:
          '40f165f16820ec12b4fb1950ef42fd02d4a9c2acc86c5323bceab9cb57671803',
      },
    });
    expect(Object.keys(report.sourceBindings)).toHaveLength(15);
    for (const source of Object.values(report.sourceBindings)) {
      const filename = path.join(ROOT, source.path);
      expect(fs.statSync(filename).size).toBe(source.bytes);
      expect(sha256File(filename)).toBe(source.sha256);
    }
  });

  it('assigns every known proposal cell once while keeping final owner acceptance false', () => {
    const report = readReport();
    expect(report.proposedOwnerRegistry).toMatchObject({
      proposedOwnerRecordCount: 27,
      knownProposedCellCount: 16_542_566,
      acceptedOwnerRecordCount: 0,
      acceptedOwnerCellCount: 0,
      canonicalOwnerAcceptanceRecorded: false,
    });
    expect(report.proposalAccounting).toMatchObject({
      'D02/C01': {
        proposedOwnerCount: 9,
        knownProposedCellCount: 952_479,
        loadingSeparationCellCount: 944_298,
        d02CandidateCellCountAfterLoadingPrecedence: 387,
        loadingPrecedenceCellCount: 45,
      },
      D05: { proposedOwnerCount: 5, knownProposedCellCount: 15_550_164 },
      D06: {
        proposedOwnerCount: 9,
        detailedRawProposalMembershipCount: 9_464,
        detailedDuplicateCoordinateCount: 242,
        detailedExtraMembershipCount: 399,
        detailedPrecedenceRecordCount: 21,
        detailedCanonicalProposalCellCount: 9_065,
        detailedCanonicalAdjacencyStatus:
          'PASS_EXACT_FOUR_GROUPS_SEALED_TECHNICAL_ACCEPTANCE_HOLD',
        detailedCanonicalAdjacencyGroupCount: 4,
        detailedCanonicalAdjacencyPairCount: 59,
        b07CellCount: 8_134,
        knownProposedCellCount: 17_199,
      },
      'P1-B11/P1-B12': {
        proposedOwnerCount: 4,
        knownProposedCellCount: 22_724,
        b11B12SharedRoadLoadCellCount: 4_784,
        b11UniqueConstructionCellCount: 2_392,
        b11UniqueInfluenceIncrementCellCount: 1_196,
        HoustonPrecedenceCellCount: 884,
      },
      knownCrossScopeProposedCellCount: 16_542_566,
      acceptedOwnerCellCount: 0,
    });
    expect(owner(report, 'OWN-D02-C1-DRAINAGE-CONTROL').proposedCellCount).toBe(387);
    expect(owner(report, 'OWN-C01-C1-LOADING-SEPARATION-RESERVATION-CONTROL')
      .proposedCellCount).toBe(944_298);
    expect(owner(report, 'CZ05-SCOPE-CONSTRUCTION-CONTROL').proposedCellCount)
      .toBe(14_786_187);
    expect(owner(report, 'OWN-D06-EG-A').proposedCellCount).toBe(1_227);
    expect(owner(report, 'OWN-D06-FIRE').proposedCellCount).toBe(3_081);
    expect(owner(report, 'OWN-Z03-GRAND-AVENUE-SURFACE-ROAD-CONTROL')
      .proposedCellCount).toBe(8_112);
    expect(owner(report, 'OWN-Z05-HOUSTON-CONTROL').proposedCellCount).toBe(884);
    expect(owner(report, 'OWN-C1-RAIL-CESS-CONTROL')).toMatchObject({
      proposedCellCount: 572,
      proposalStatus: 'PROPOSED_LOGICAL_OWNER_EXACT_ASSIGNMENT_NOT_ACCEPTED',
    });
    expect(report.proposedOwnerRegistry.ownerRecords.every((item) => (
      item.exactCellAssignmentAccepted === false && item.acceptedBy === null
    ))).toBe(true);
  });

  it('uses exact precedence records instead of shared or last-writer-wins ownership', () => {
    const report = readReport();
    expect(report.proposedOwnershipAdjudications).toMatchObject({
      recordCount: 26,
      acceptedRecordCount: 0,
      wildcardRecordCount: 0,
      lastWriterWinsRecordCount: 0,
    });
    const d05 = report.proposedOwnershipAdjudications.records.find(({ adjudicationId }) => (
      adjudicationId === 'OA-D05-B08-PRECEDENCE-OVER-B09-PORTAL'
    ));
    expect(d05).toMatchObject({
      winningOwnerId: 'OWN-D05-B08-SERVICE-TUNNEL-CONTROL',
      yieldingOwnerIds: ['CZ05-Z11-FUNICULAR-CONTROL'],
      exactConflictCellSet: {
        cellCount: 36,
        coordinateSetSha256:
          '459b08229cf9ef9e085ee02ebdae3a931692c37cda148060b390035c5eba622c',
      },
      accepted: false,
    });
    expect(report.proposedOwnershipAdjudications.records
      .filter(({ scope }) => scope === 'D06')
      .reduce((sum, item) => sum + item.exactConflictCellSet.cellCount, 0)).toBe(399);
    expect(report.proposedOwnershipAdjudications.records
      .filter(({ scope }) => scope === 'P1-B12')
      .reduce((sum, item) => sum + item.exactConflictCellSet.cellCount, 0)).toBe(884);
    expect(report.proposedOwnershipAdjudications.records
      .filter(({ scope }) => scope === 'D02/C01')
      .reduce((sum, item) => sum + item.exactConflictCellSet.cellCount, 0)).toBe(45);
    expect(report.crossScopeDisjointProof).toMatchObject({
      status: 'PASS_KNOWN_PROPOSAL_SCOPES_DISJOINT_BY_EXACT_COMPONENT_BOUNDS',
      observedCrossScopeOverlapPairCount: 0,
    });
  });

  it('emits only directional/default-deny contracts and leaves missing geometry null+HOLD', () => {
    const report = readReport();
    const registry = report.proposedDirectionalInterfaceRegistry;
    expect(registry).toMatchObject({
      contractCount: 78,
      exactInterfaceCellSetCount: 64,
      exactTransitionPairManifestCount: 25,
      nullInterfaceCellSetCount: 14,
      acceptedContractCount: 0,
      wildcardContractCount: 0,
      bidirectionalContractCount: 0,
      lastWriterWinsContractCount: 0,
    });
    expect(new Set(registry.contracts.map(({ contractId }) => contractId)).size).toBe(78);
    expect(registry.contracts.every((item) => (
      item.direction.length > 0
      && !item.direction.includes('BIDIRECTIONAL')
      && item.defaultDeny
      && !item.wildcardAllowed
      && !item.lastWriterWinsAllowed
      && !item.accepted
      && item.acceptedBy === null
    ))).toBe(true);
    expect(contract(report, 'IF-D05-B08-TO-B09-PORTAL')).toMatchObject({
      fromOwnerId: 'OWN-D05-B08-SERVICE-TUNNEL-CONTROL',
      toOwnerId: 'CZ05-Z11-FUNICULAR-CONTROL',
      direction: 'B08_SERVICE_TUNNEL_TO_B09_STATION',
      interfaceCellSet: { cellCount: 36 },
      defaultDeny: true,
      accepted: false,
    });
    expect(contract(report, 'IF-D02-MAINTENANCE-ACCESS')).toMatchObject({
      interfaceCellSet: null,
      transitionPairManifestSha256: null,
      status: 'HOLD_INTERFACE_GEOMETRY_MISSING_DEFAULT_DENY',
    });
    expect(contract(report, 'IF-C01-OWNER-TUNNEL-TO-C1-LOADING-SEPARATION'))
      .toMatchObject({
        direction: 'POSITIVE_Y',
        interfaceCellSet: { cellCount: 15_606 },
        transitionPairCount: 7_803,
        accepted: false,
      });
    expect(contract(report, 'IF-D05-B09-TO-Z11-SUMMIT')).toMatchObject({
      interfaceCellSet: { cellCount: 12 },
      defaultDeny: true,
      accepted: false,
    });
    expect(contract(report, 'IF-P1-B11-ROAD-TO-B12-UPPER-LOAD')).toMatchObject({
      fromOwnerId: 'OWN-Z03-GRAND-AVENUE-SURFACE-ROAD-CONTROL',
      toOwnerId: 'OWN-Z03-GRAND-AVENUE-SURFACE-ROAD-CONTROL',
      direction: 'B12_UPPER_LOAD_POSITIVE_Y_TO_ROAD_SURFACE',
      interfaceCellSet: { cellCount: 4_576 },
      transitionPairCount: 2_288,
      defaultDeny: true,
      accepted: false,
    });
    expect(contract(report, 'IF-P1-B12-ADJ-12')).toMatchObject({
      fromOwnerId: 'OWN-Z05-HOUSTON-CONTROL',
      toOwnerId: 'OWN-Z03-GRAND-AVENUE-SURFACE-ROAD-CONTROL',
      direction: 'POSITIVE_Y',
      interfaceCellSet: { cellCount: 208 },
      transitionPairCount: 104,
      transitionPairManifestSha256:
        'c148651ae1734865d506856f89ef0ea72cdb64718ccc829d6160d3ed1bfe2367',
      defaultDeny: true,
      accepted: false,
    });
    const d06DetailedAdjacency = registry.contracts.filter(({ contractId }) => (
      /^IF-D06-ADJ-0[1-4]$/.test(contractId)
    ));
    expect(d06DetailedAdjacency).toHaveLength(4);
    expect(d06DetailedAdjacency.reduce((sum, item) => (
      sum + (item.transitionPairCount ?? 0)
    ), 0)).toBe(59);
    expect(d06DetailedAdjacency.map(({ transitionPairManifestSha256 }) => (
      transitionPairManifestSha256
    ))).toEqual([
      'efaffb09850d450d56778f32a6f0921e9c9d64accf320aee5db7ea7da81cb469',
      'a8ec9c372e1e00fa4f9d9b945bea80471541505a2b4eac6ab98610b312f3fb9b',
      '86fa8755867325fc1bea7e602d3d2eab536c5702a5a24ec111d2cf7907ea7915',
      '57c8a5ca4de6ae9c6bd923aa695249d3f71c663a9ace35331d6fac614295800e',
    ]);
    const d06CoarseCaps = registry.contracts.filter(({ scope, fromOwnerId }) => (
      scope === 'D06'
      && ['OWN-D06-SMOKE', 'OWN-D06-BARRIER'].includes(fromOwnerId)
    ));
    expect(d06CoarseCaps.length).toBeGreaterThan(0);
    expect(d06CoarseCaps.every(({ ownershipSemantics }) => (
      ownershipSemantics === 'SOURCE_BOUNDARY_STEWARD_NOT_DETAILED_CANONICAL_OCCUPANCY_CLAIM'
    ))).toBe(true);
    expect(registry.contracts.filter(({ interfaceCellSet }) => interfaceCellSet === null)
      .every(({ status }) => status === 'HOLD_INTERFACE_GEOMETRY_MISSING_DEFAULT_DENY'))
      .toBe(true);
  });

  it('retains technical, complete-save, final-acceptance, release, and safety holds', () => {
    const report = readReport();
    expect(report.remainingEvidenceHolds).toHaveLength(9);
    expect(report.remainingEvidenceHolds.every(({ status }) => status === 'HOLD')).toBe(true);
    expect(report.sourceHoldRegistry).toMatchObject({
      status: 'HOLD_ALL_SOURCE_BLOCKERS_PRESERVED',
      sourceGroupCount: 6,
      sourceHoldRecordCount: 58,
      sourceHoldManifestSha256:
        '1f6e1b477532383ead3e468b2364a131e0c71490b6244bb053b528a4a1fa3ad8',
    });
    expect(report.disposition).toEqual({
      exactProposalOwnerRegistryCompiled: true,
      exactKnownConflictPrecedenceCompiled: true,
      directionalDefaultDenyInterfaceRegistryCompiled: true,
      p1B12GlobalProposalAuditCompiled: true,
      allKnownProposalCellsHaveOneProposedOwner: true,
      allInterfacesExact: false,
      finalOwnerAcceptanceRecorded: false,
      finalInterfaceAcceptanceRecorded: false,
      completeSavedWorldAccepted: false,
      technicalInputsComplete: false,
      globalR00InterfaceGatePassed: false,
      r00Passed: false,
    });
    expect(report.safetyBoundary).toEqual({
      offlineOnly: true,
      liveCallsPerformed: [],
      operations: [],
      operationCellCount: 0,
      materialCellCount: 0,
      futureCellCount: 0,
      constructionCellCount: 0,
      mechanismCellCount: 0,
      worldEditAuthorized: false,
      physicalBuildAuthorized: false,
      executable: false,
    });
    expect(fs.statSync(COMMITTED_JSON).size).toBeLessThan(300_000);
  });
});
