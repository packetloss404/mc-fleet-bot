import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-d06-detailed-mechanism-setout.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-d06-detailed-mechanism-setout.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-d06-setout-'));
const regeneratedJson = path.join(tempDir, 'd06-setout.json');
const regeneratedMarkdown = path.join(tempDir, 'd06-setout.md');

interface Binding {
  path: string;
  bytes: number;
  sha256: string;
}

interface CellSet {
  cellCount: number;
  coordinateSetSha256: string;
  proposalAccepted: boolean;
  acceptedCellCount: number;
  acceptedMechanismCellCount: number;
}

interface ProposalLayer {
  layerId: string;
  priority: number;
  group: string;
  proposedFunction: string;
  basis: string;
  rawProposalCellSet: CellSet;
  canonicalProposalCellSetAfterPrecedence: CellSet;
  proposalAccepted: boolean;
  acceptedMechanismCellCount: number;
  acceptedMaterialCellCount: number;
  acceptedConstructionCellCount: number;
}

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  reportIdentitySha256: string;
  sourceBindings: Record<string, Binding>;
  deterministicSetoutContract: {
    exactSourceReferenceCount: number;
    exactSourceReferencePassCount: number;
    proposalLayerCount: number;
    priority: string[];
    setoutManifestSha256: string;
    precedenceManifestSha256: string;
  };
  exactDetailedProposalLayers: {
    rawProposalMembershipCount: number;
    uniqueRawProposalCellCount: number;
    duplicateCoordinateCount: number;
    extraMembershipCount: number;
    canonicalProposalCellCountAfterPrecedence: number;
    proposalLayers: Record<string, ProposalLayer>;
    acceptedMechanismCellCount: number;
    acceptedMaterialCellCount: number;
    acceptedConstructionCellCount: number;
  };
  internalDuplicateAndPrecedenceAudit: {
    duplicateCoordinateCount: number;
    extraMembershipCount: number;
    precedenceRecordCount: number;
    precedenceRecords: Array<{
      precedenceId: string;
      winningLayerId: string;
      yieldingLayerId: string;
      exactConflictCellSet: CellSet;
      accepted: boolean;
    }>;
    wildcardPrecedenceCount: number;
    lastWriterWinsCount: number;
    sharedCanonicalAssignmentCount: number;
    acceptedPrecedenceRecordCount: number;
  };
  exactCanonicalOwnerAdjacency: {
    status: string;
    canonicalOwnerCellCount: number;
    contractCount: number;
    transitionPairCount: number;
    records: Array<{
      interfaceId: string;
      fromOwnerId: string;
      toOwnerId: string;
      direction: string;
      exactInterfaceCellSet: CellSet;
      transitionPairCount: number;
      transitionPairManifestSha256: string;
      defaultDeny: boolean;
      accepted: boolean;
    }>;
    acceptedContractCount: number;
    acceptedInterfaceCellCount: number;
  };
  crossScopeAudit: {
    status: string;
    d06DetailedProposalUnion: CellSet;
    comparedExternalScopeCount: number;
    comparedExternalComponentCount: number;
    comparedExternalScopes: string[];
    separateB07ComponentCompared: boolean;
    observedKnownCrossScopeConflictCellCount: number;
  };
  nullHeldSystems: Array<{
    id: string;
    exactCellSet: null;
    status: string;
    requirement: string;
  }>;
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

function layer(report: Report, id: string): ProposalLayer {
  const result = report.exactDetailedProposalLayers.proposalLayers[id];
  if (!result) throw new Error(`missing proposal layer ${id}`);
  return result;
}

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      'scripts/compile_combined_zones_d06_detailed_mechanism_setout.mjs',
      '--out',
      regeneratedJson,
      '--markdown',
      regeneratedMarkdown,
    ],
    { cwd: ROOT, stdio: 'pipe', maxBuffer: 8 * 1024 * 1024 },
  );
}, 30_000);

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones D06 detailed mechanism/circuit setout proposal', () => {
  it('regenerates byte-identically and binds the exact source chain', () => {
    expect(fs.readFileSync(regeneratedJson).equals(fs.readFileSync(COMMITTED_JSON))).toBe(true);
    expect(fs.readFileSync(regeneratedMarkdown).equals(fs.readFileSync(COMMITTED_MARKDOWN)))
      .toBe(true);
    const report = readReport();
    expect(report).toMatchObject({
      schemaVersion: 2,
      id: 'combined-zones-phase1-d06-detailed-mechanism-circuit-setout-proposal',
      status:
        'PARTIAL_PASS_EXACT_D06_DETAILED_MECHANISM_CIRCUIT_SETOUT_FUNCTIONAL_ACCEPTANCE_HOLD',
      reportIdentitySha256:
        '55eaab99b53aac1de53e81128026ff509de7a6efb9614b7e390c4f9cbe37c12f',
    });
    expect(Object.keys(report.sourceBindings)).toHaveLength(4);
    for (const source of Object.values(report.sourceBindings)) {
      const filename = path.join(ROOT, source.path);
      expect(fs.statSync(filename).size).toBe(source.bytes);
      expect(sha256File(filename)).toBe(source.sha256);
    }
    expect(report.deterministicSetoutContract).toMatchObject({
      exactSourceReferenceCount: 73,
      exactSourceReferencePassCount: 73,
      proposalLayerCount: 31,
      setoutManifestSha256:
        '697a9b522789e557185ec1855e037fe81b3f96af1b93b78eae22d01d38c6ac80',
      precedenceManifestSha256:
        '4b3cc766d11185cd9ec8be9c11ac359452def3ec94bf016545ebfccbee3a2663',
    });
    expect(new Set(report.deterministicSetoutContract.priority).size).toBe(31);
  });

  it('sets out exact egress, vent, smoke-door, and platform-gate proposal layers', () => {
    const report = readReport();
    expect(layer(report, 'egaStairEnvelope').rawProposalCellSet).toMatchObject({
      cellCount: 819,
      coordinateSetSha256:
        'a33e2ca05e93da0f96bc0a6da14decc80a18e0b2257e217600e3b11f59da6e40',
    });
    expect(layer(report, 'egaLiftEnvelope').rawProposalCellSet.cellCount).toBe(351);
    expect(layer(report, 'egbStairEnvelope').rawProposalCellSet.cellCount).toBe(630);
    expect(layer(report, 'egbLiftEnvelope').rawProposalCellSet.cellCount).toBe(270);
    expect(layer(report, 'egaTransferLandings').rawProposalCellSet.cellCount).toBe(147);
    expect(layer(report, 'egbTransferLandings').rawProposalCellSet.cellCount).toBe(147);
    expect(layer(report, 'egaLiftEquipmentCaps').rawProposalCellSet.cellCount).toBe(18);
    expect(layer(report, 'egbStairEquipmentCaps').rawProposalCellSet.cellCount).toBe(42);
    expect(layer(report, 'ventDuctEnvelopes').rawProposalCellSet).toMatchObject({
      cellCount: 828,
      coordinateSetSha256:
        'd2164e53bc3d3bb3f0e1704928800ab7e06ce7ea92b1a22d453f233df3af1e30',
    });
    expect(layer(report, 'ventFanEquipmentBays').rawProposalCellSet.cellCount).toBe(36);
    expect(layer(report, 'ventOutletCaps').rawProposalCellSet.cellCount).toBe(36);
    expect(layer(report, 'smokeDoorMechanismBays').rawProposalCellSet).toMatchObject({
      cellCount: 72,
      coordinateSetSha256:
        'eb353fdc0ee1b8bb957fcd5a94d56c5b1c249005b93356c432e4e103692f1584',
    });
    expect(layer(report, 'platformGateMechanismBays').rawProposalCellSet).toMatchObject({
      cellCount: 192,
      coordinateSetSha256:
        'fa344e75b978961fc2c914e34f01e90cb8243a16be83f090999ba941c4b3e2b5',
    });
  });

  it('sets out separated circuit carriers plus drainage and internal controls', () => {
    const report = readReport();
    expect(layer(report, 'lightingFixtureReservations').rawProposalCellSet.cellCount).toBe(56);
    expect(layer(report, 'normalCircuitCarrier').rawProposalCellSet).toMatchObject({
      cellCount: 827,
      coordinateSetSha256:
        '711107dd2fa9b434fe1fc10077702de3642097d52d121b8d5b46decc1f71bacb',
    });
    expect(layer(report, 'emergencyCircuitACarrier').rawProposalCellSet).toMatchObject({
      cellCount: 827,
      coordinateSetSha256:
        '860bda8c43c2c06c95d2f70fb0d7efa1b2a37d2ed299dc104668f5f53089f1a2',
    });
    expect(layer(report, 'emergencyCircuitBCarrier').rawProposalCellSet).toMatchObject({
      cellCount: 827,
      coordinateSetSha256:
        '8ff70324bb9c59ccde82c4a5048390f919b7d2aae91f9b8e1372ce0a6a031578',
    });
    for (const id of [
      'normalCircuitEquipment',
      'emergencyCircuitAEquipment',
      'emergencyCircuitBEquipment',
    ]) expect(layer(report, id).rawProposalCellSet.cellCount).toBe(9);
    expect(layer(report, 'localDrainageInterfaceCaps').rawProposalCellSet).toMatchObject({
      cellCount: 24,
      coordinateSetSha256:
        '13d7cb94e6425be2d777f9aaea7f4d93ccddca180e64509624e2cb498773af8c',
    });
    expect(layer(report, 'localSumpPumpEquipmentBays').rawProposalCellSet.cellCount).toBe(72);
    expect(layer(report, 'externalDrainBoundaryCap').rawProposalCellSet.cellCount).toBe(9);
    expect(layer(report, 'fireServiceSpineReservation').rawProposalCellSet.cellCount).toBe(3025);
    expect(layer(report, 'fireServiceControlPanels').rawProposalCellSet).toMatchObject({
      cellCount: 8,
      coordinateSetSha256:
        '91afbdec47cdb08b97114e7d54cf7f3a2459a6206325ee083ae0cc4b95d208d6',
    });
  });

  it('adjudicates every duplicate explicitly and remains clear of known cross-scope geometry', () => {
    const report = readReport();
    expect(report.exactDetailedProposalLayers).toMatchObject({
      rawProposalMembershipCount: 9464,
      uniqueRawProposalCellCount: 9065,
      duplicateCoordinateCount: 242,
      extraMembershipCount: 399,
      canonicalProposalCellCountAfterPrecedence: 9065,
      acceptedMechanismCellCount: 0,
      acceptedMaterialCellCount: 0,
      acceptedConstructionCellCount: 0,
    });
    expect(report.internalDuplicateAndPrecedenceAudit).toMatchObject({
      duplicateCoordinateCount: 242,
      extraMembershipCount: 399,
      precedenceRecordCount: 21,
      wildcardPrecedenceCount: 0,
      lastWriterWinsCount: 0,
      sharedCanonicalAssignmentCount: 0,
      acceptedPrecedenceRecordCount: 0,
    });
    expect(report.internalDuplicateAndPrecedenceAudit.precedenceRecords.every((record) => (
      record.exactConflictCellSet.cellCount > 0 && record.accepted === false
    ))).toBe(true);
    expect(report.exactCanonicalOwnerAdjacency).toMatchObject({
      status: 'PASS_EXACT_FOUR_GROUPS_SEALED_TECHNICAL_ACCEPTANCE_HOLD',
      canonicalOwnerCellCount: 9_065,
      contractCount: 4,
      transitionPairCount: 59,
      acceptedContractCount: 0,
      acceptedInterfaceCellCount: 0,
    });
    expect(report.exactCanonicalOwnerAdjacency.records.map((item) => ({
      id: item.interfaceId,
      pairs: item.transitionPairCount,
      hash: item.transitionPairManifestSha256,
    }))).toEqual([
      { id: 'IF-D06-ADJ-01', pairs: 10,
        hash: 'efaffb09850d450d56778f32a6f0921e9c9d64accf320aee5db7ea7da81cb469' },
      { id: 'IF-D06-ADJ-02', pairs: 7,
        hash: 'a8ec9c372e1e00fa4f9d9b945bea80471541505a2b4eac6ab98610b312f3fb9b' },
      { id: 'IF-D06-ADJ-03', pairs: 35,
        hash: '86fa8755867325fc1bea7e602d3d2eab536c5702a5a24ec111d2cf7907ea7915' },
      { id: 'IF-D06-ADJ-04', pairs: 7,
        hash: '57c8a5ca4de6ae9c6bd923aa695249d3f71c663a9ace35331d6fac614295800e' },
    ]);
    expect(report.exactCanonicalOwnerAdjacency.records.every((item) => (
      item.defaultDeny && !item.accepted
    ))).toBe(true);
    expect(report.crossScopeAudit).toMatchObject({
      status: 'PASS_KNOWN_CROSS_SCOPE_AND_B07_COMPONENTS_DISJOINT_BY_EXACT_BOUNDS',
      d06DetailedProposalUnion: {
        cellCount: 9065,
        coordinateSetSha256:
          '1ff4f48f25578769d5cafe2f1348903f54e562a6133680fa959087ad9bf4130b',
      },
      comparedExternalScopeCount: 3,
      comparedExternalComponentCount: 6,
      comparedExternalScopes: ['D02/C01', 'D05', 'P1-B11/P1-B12'],
      separateB07ComponentCompared: true,
      observedKnownCrossScopeConflictCellCount: 0,
    });
  });

  it('retains functional blockers and zero accepted mechanism or release authority', () => {
    const report = readReport();
    expect(report.nullHeldSystems).toHaveLength(9);
    expect(report.nullHeldSystems.every((item) => (
      item.exactCellSet === null && item.status.startsWith('HOLD_')
    ))).toBe(true);
    expect(report.passHoldMatrix).toHaveLength(10);
    expect(report.disposition).toMatchObject({
      exactG03D06SetoutProposalCompiled: true,
      exactInternalDuplicatePrecedenceCompiled: true,
      exactCanonicalOwnerAdjacencyCompiled: true,
      knownCrossScopeConflictAuditPassed: true,
      externalRoutesAccepted: false,
      acceptedReceiverOrDischargePresent: false,
      functionalMechanismStatesAccepted: false,
      circuitsFunctionallyAccepted: false,
      controlsAndFailureLogicAccepted: false,
      completeSaveAccepted: false,
      technicalAcceptanceRecorded: false,
      commissioningPassed: false,
      d06Resolved: false,
      g03Accepted: false,
      r00Passed: false,
    });
    expect(report.safetyBoundary).toMatchObject({
      operationCellCount: 0,
      acceptedMechanismCellCount: 0,
      acceptedMaterialCellCount: 0,
      acceptedFutureCellCount: 0,
      acceptedConstructionCellCount: 0,
      acceptedOwnerAssignmentCount: 0,
      acceptedInterfaceCellCount: 0,
      worldEditAuthorized: false,
      physicalBuildAuthorized: false,
      executable: false,
    });
    expect(Object.values(report.exactDetailedProposalLayers.proposalLayers).every((item) => (
      item.proposalAccepted === false
      && item.acceptedMechanismCellCount === 0
      && item.acceptedMaterialCellCount === 0
      && item.acceptedConstructionCellCount === 0
    ))).toBe(true);
  });
});
