import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const GENERATED_AT = '2026-08-04T23:55:00Z';
const COMMITTED_JSON = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d02-owner-acceptance-packet.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d02-owner-acceptance-packet.md',
);
const CLOSED_DRAINAGE_JSON = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d02-s04-closed-drainage-alternatives.json',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-d02-owner-'));
const regeneratedJson = path.join(tempDir, 'owner-acceptance.json');
const regeneratedMarkdown = path.join(tempDir, 'owner-acceptance.md');

interface SourceBinding {
  key: string;
  path: string;
  sha256: string;
  bytes: number;
}

interface ClassifiedItem {
  id: string;
  category: string;
  status: string;
  technicalAcceptanceClaimed?: boolean;
  values?: Record<string, unknown>;
}

interface AcceptanceCriterion {
  id: string;
  category: string;
  disposition: string;
  evidenceDisposition: string;
  blockingGapIds: string[];
}

interface AcceptanceGate {
  id: string;
  disposition: string;
  blockingGapIds?: string[];
}

interface Manifest {
  cellCount: number;
  coordinateSetSha256: string;
  roleStreamSha256: string;
}

interface SelectedSumpCandidate {
  lowRunId: string;
  system: string;
  assetId: string;
  anchorStation: number;
  disposition: string;
  exactAssetCellManifest: Manifest;
  presentStateAudit: {
    currentFluidSameCellCount: number;
    currentFluidFaceAdjacentCellCount: number;
  };
  ownership: {
    ownerStatus: string;
  };
  collectionInlet: {
    acceptanceStatus: string;
    cellManifest: Manifest;
  };
  overflow: { cellCount: number; receiverId: null; status: string };
  outfall: { cellCount: number; receiverId: null; ownerId: null; status: string };
  technicalAcceptanceClaimed: boolean;
}

interface EvidenceGap {
  id: string;
  category: string;
  status: string;
  missing: string;
  closesWhen: string;
}

interface OwnerAcceptancePacket {
  schemaVersion: number;
  id: string;
  status: string;
  authorityBoundary: {
    delegatedPlanningSelectionsMayPass: boolean;
    agentMayInventTechnicalEvidence: boolean;
    agentMayClaimExpertAcceptance: boolean;
    currentPacketMayResolveD02: boolean;
    currentPacketMayPassR00G02: boolean;
  };
  safetyBoundary: {
    liveCallsPerformed: unknown[];
    databasesOpened: unknown[];
    operationCells: unknown[];
    materialCells: unknown[];
    operationCellCount: number;
    candidateCellsAreOperations: boolean;
    constructionAuthorized: boolean;
    worldEditAuthorized: boolean;
    technicalAcceptanceClaimed: boolean;
    d02Resolved: boolean;
    r00G02Passed: boolean;
  };
  sourceGraph: {
    direction: string;
    packetPath: string;
    directInputs: SourceBinding[];
    prohibitedDownstreamInputs: string[];
    cycleFree: boolean;
  };
  acceptanceBasisIdentity: {
    algorithm: string;
    sha256: string;
    payload: Record<string, unknown>;
  };
  copyableSoleOwnerAcceptance: {
    status: string;
    statement: string;
    scope: string;
    technicalAcceptanceClaimed: boolean;
    d02Resolved: boolean;
    r00G02Passed: boolean;
    worldEditAuthorized: boolean;
  };
  evidenceTaxonomy: Record<string, string>;
  facts: ClassifiedItem[];
  derivations: ClassifiedItem[];
  planningAssumptions: ClassifiedItem[];
  selectedClosedDrainageBasis: {
    alternativeId: string;
    aggregateCandidateCellManifest: Manifest;
    selectedSumpCandidates: SelectedSumpCandidate[];
    heldLowRun: {
      lowRunId: string;
      disposition: string;
      strictClearAnchorCount: number;
      rejectedAnchorStation: number;
      rejectedCandidateCellCount: number;
      rejectedCandidateWaterFamilyCellCount: number;
      rejectedCandidateFaceAdjacentFluidCellCount: number;
      ownerStatus: string;
      drainageAssetId: null;
      status: string;
      acceptanceMeaning: string;
    };
    technicalAcceptanceClaimed: boolean;
  };
  closedDrainageAcceptanceGates: AcceptanceGate[];
  acceptanceCriteria: AcceptanceCriterion[];
  evidenceGaps: EvidenceGap[];
  ownerDecisionRegister: Array<{
    id: string;
    status: string;
    technicalAcceptanceClaimed: boolean;
  }>;
  acceptanceSummary: {
    factPassCount: number;
    derivationPassCount: number;
    d02BlockerPassIds: string[];
    d02BlockerHoldIds: string[];
    closedDrainagePassGateIds: string[];
    closedDrainageHoldGateIds: string[];
    openEvidenceGapCount: number;
    d02Status: string;
    r00G02Status: string;
  };
  finalGate: {
    status: string;
    operationCellCount: number;
    worldEditAuthorized: boolean;
    technicalAcceptanceClaimed: boolean;
    d02Resolved: boolean;
    r00G02Passed: boolean;
  };
}

interface ClosedDrainageSource {
  alternatives: Array<{
    id: string;
    candidateCellManifest: Manifest;
    ownershipAndInterfaces?: Array<{
      lowRunId: string;
      assetId: string;
      exactAssetCellManifest: Manifest;
    }>;
  }>;
}

function readPacket(filename = COMMITTED_JSON): OwnerAcceptancePacket {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as OwnerAcceptancePacket;
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
      'scripts/generate_combined_zones_d02_owner_acceptance_packet.mjs',
      '--out', regeneratedJson,
      '--markdown', regeneratedMarkdown,
      '--generated-at', GENERATED_AT,
    ],
    { cwd: ROOT, stdio: 'pipe' },
  );
});

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones D02 owner-acceptance evidence packet', () => {
  it('regenerates the committed JSON and Markdown byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
  });

  it('binds an acyclic source-only evidence graph by exact file identity', () => {
    const report = readPacket();

    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-d02-owner-acceptance-packet',
      status: 'PARTIAL_PASS_CLASSIFIED_EVIDENCE_D02_G02_HOLD',
      sourceGraph: {
        direction: 'BOUND_SOURCE_TO_PACKET_ONLY',
        packetPath: 'masterplans/05-combined-zones/phase1-d02-owner-acceptance-packet.json',
        cycleFree: true,
      },
    });
    expect(report.sourceGraph.directInputs.map((item) => item.key)).toEqual([
      'authorityReconciliation',
      'designDecisions',
      'c1CivilDesign',
      'civilAuthorityPacket',
      'regionEvidence',
      'hydrologyOutfalls',
      'closedDrainage',
      'delegatedSelections',
    ]);
    expect(report.sourceGraph.directInputs.every((item) => (
      !item.path.includes('r00-readiness')
      && !item.path.includes('owner-acceptance-packet')
    ))).toBe(true);
    expect(report.sourceGraph.prohibitedDownstreamInputs.join(' ')).toContain(
      'phase1-r00-readiness-audit.json',
    );
    for (const source of report.sourceGraph.directInputs) {
      expect(sha256File(source.path)).toBe(source.sha256);
      expect(fs.statSync(path.join(ROOT, source.path)).size).toBe(source.bytes);
    }
  });

  it('keeps facts, derivations, assumptions, criteria, and gaps distinct', () => {
    const report = readPacket();
    const classified = [
      ...report.facts,
      ...report.derivations,
      ...report.planningAssumptions,
      ...report.acceptanceCriteria,
      ...report.evidenceGaps,
    ];

    expect(Object.keys(report.evidenceTaxonomy)).toEqual([
      'FACT',
      'DERIVATION',
      'PLANNING_ASSUMPTION',
      'ACCEPTANCE_CRITERION',
      'EVIDENCE_GAP',
    ]);
    expect(new Set(classified.map((item) => item.id)).size).toBe(classified.length);
    expect(report.facts.every((item) => item.category === 'FACT' && item.status === 'PASS'))
      .toBe(true);
    expect(report.derivations.every((item) => (
      item.category === 'DERIVATION' && item.status === 'PASS'
    ))).toBe(true);
    expect(report.planningAssumptions.every((item) => (
      item.category === 'PLANNING_ASSUMPTION'
      && item.technicalAcceptanceClaimed === false
    ))).toBe(true);
    expect(report.acceptanceCriteria.every((item) => item.category === 'ACCEPTANCE_CRITERION'))
      .toBe(true);
    expect(report.evidenceGaps.every((item) => (
      item.category === 'EVIDENCE_GAP'
      && item.status === 'OPEN'
      && item.missing.length > 50
      && item.closesWhen.length > 50
    ))).toBe(true);

    const numericCriteria = report.planningAssumptions.find(
      (item) => item.id === 'ASSUMPTION-D02-004-NUMERIC-DESIGN-CRITERIA',
    );
    expect(numericCriteria?.status).toBe('UNSET_HOLD');
    expect(Object.values(numericCriteria?.values ?? {}).every((item) => item === null))
      .toBe(true);
  });

  it('freezes ten exact selected sump assets and the ROAD-LOW-001 no-build hold', () => {
    const report = readPacket();
    const source = JSON.parse(
      fs.readFileSync(CLOSED_DRAINAGE_JSON, 'utf8'),
    ) as ClosedDrainageSource;
    const preferredSource = source.alternatives.find(
      (item) => item.id === report.selectedClosedDrainageBasis.alternativeId,
    );
    const candidates = report.selectedClosedDrainageBasis.selectedSumpCandidates;

    expect(candidates.map((item) => [item.lowRunId, item.anchorStation, item.exactAssetCellManifest.cellCount]))
      .toEqual([
        ['RAIL-LOW-001', 3, 54],
        ['RAIL-LOW-002', 455, 42],
        ['RAIL-LOW-003', 551, 42],
        ['RAIL-LOW-004', 1064, 36],
        ['RAIL-LOW-005', 1144, 36],
        ['RAIL-LOW-006', 1213, 48],
        ['ROAD-LOW-002', 551, 42],
        ['ROAD-LOW-003', 1073, 36],
        ['ROAD-LOW-004', 1150, 48],
        ['ROAD-LOW-005', 1182, 48],
      ]);
    expect(candidates.reduce(
      (total, item) => total + item.exactAssetCellManifest.cellCount,
      0,
    )).toBe(432);
    expect(report.selectedClosedDrainageBasis.aggregateCandidateCellManifest)
      .toEqual(expect.objectContaining({
        cellCount: 432,
        coordinateSetSha256: 'd43dca6357175d4802658e32bdf3c8c1617ab642919ac74e169a389140108a98',
      }));
    expect(preferredSource?.candidateCellManifest.coordinateSetSha256)
      .toBe(report.selectedClosedDrainageBasis.aggregateCandidateCellManifest.coordinateSetSha256);
    for (const candidate of candidates) {
      const sourceAsset = preferredSource?.ownershipAndInterfaces?.find(
        (item) => item.lowRunId === candidate.lowRunId,
      );
      expect(sourceAsset?.assetId).toBe(candidate.assetId);
      expect(sourceAsset?.exactAssetCellManifest.coordinateSetSha256)
        .toBe(candidate.exactAssetCellManifest.coordinateSetSha256);
      expect(candidate.presentStateAudit).toEqual({
        currentFluidSameCellCount: 0,
        currentFluidFaceAdjacentCellCount: 0,
      });
      expect(candidate.ownership.ownerStatus)
        .toBe('UNASSIGNED_REQUIRES_SOLE_AUTHORITY_ACCEPTANCE');
      expect(candidate.collectionInlet.acceptanceStatus).toBe('UNACCEPTED_PLANNING_INTERFACE');
      expect(candidate.overflow).toMatchObject({ cellCount: 0, receiverId: null });
      expect(candidate.outfall).toMatchObject({ cellCount: 0, receiverId: null, ownerId: null });
      expect(candidate.technicalAcceptanceClaimed).toBe(false);
    }

    expect(report.selectedClosedDrainageBasis.heldLowRun).toMatchObject({
      lowRunId: 'ROAD-LOW-001',
      disposition: 'NO_BUILD_PRESERVATION_HOLD_CURRENT_FLUID_INTERACTION',
      strictClearAnchorCount: 0,
      rejectedAnchorStation: 0,
      rejectedCandidateCellCount: 36,
      rejectedCandidateWaterFamilyCellCount: 6,
      rejectedCandidateFaceAdjacentFluidCellCount: 16,
      ownerStatus: 'UNASSIGNED_NO_ASSET_SELECTED',
      drainageAssetId: null,
      status: 'NO_BUILD_PRESERVATION_HOLD',
    });
    expect(report.selectedClosedDrainageBasis.heldLowRun.acceptanceMeaning)
      .toContain('does not mean the low run is served');
    expect(report.selectedClosedDrainageBasis.technicalAcceptanceClaimed).toBe(false);
  });

  it('passes only predicates supported now and holds every missing technical acceptance', () => {
    const report = readPacket();

    expect(report.acceptanceCriteria.map((item) => [item.id, item.disposition])).toEqual([
      ['D02-B01', 'HOLD'],
      ['D02-B02', 'HOLD'],
      ['D02-B03', 'HOLD'],
      ['D02-B04', 'HOLD'],
      ['D02-B05', 'PASS_DELEGATED_PLANNING_ACCEPTANCE'],
      ['D02-B06', 'HOLD'],
    ]);
    expect(report.acceptanceSummary).toMatchObject({
      factPassCount: 5,
      derivationPassCount: 4,
      d02BlockerPassIds: ['D02-B05'],
      d02BlockerHoldIds: ['D02-B01', 'D02-B02', 'D02-B03', 'D02-B04', 'D02-B06'],
      closedDrainagePassGateIds: [
        'S04-G01-PLANNING-SELECTION',
        'S04-G02-EXACT-ASSET-MANIFESTS',
        'S04-G03-PRESENT-STATE-CLEARANCE',
        'S04-G04-ROAD-LOW-001-PRESERVATION',
      ],
      closedDrainageHoldGateIds: [
        'S04-G05-COMPLETE-SAVE-CLEARANCE',
        'S04-G06-HYDRAULIC-CAPACITY-FAILURE',
        'S04-G07-FUTURE-STATE-ACCOUNTING',
        'S04-G08-STRUCTURE-GEOTECHNICAL',
        'S04-G09-OWNERSHIP-INTERFACES',
        'S04-G10-TECHNICAL-ACCEPTANCE',
      ],
      openEvidenceGapCount: 8,
      d02Status: 'HOLD',
      r00G02Status: 'HOLD',
    });
    for (const criterion of report.acceptanceCriteria.filter(
      (item) => item.disposition === 'HOLD',
    )) {
      expect(criterion.blockingGapIds.length).toBeGreaterThan(0);
    }
    for (const gate of report.closedDrainageAcceptanceGates.filter(
      (item) => item.disposition === 'HOLD',
    )) {
      expect(gate.blockingGapIds?.length).toBeGreaterThan(0);
    }
  });

  it('provides a hash-bound copyable owner statement without converting HOLD to PASS', () => {
    const report = readPacket();
    const recalculatedBasisSha256 = crypto.createHash('sha256')
      .update(JSON.stringify(report.acceptanceBasisIdentity.payload))
      .digest('hex');

    expect(report.acceptanceBasisIdentity.algorithm)
      .toBe('sha256(JSON.stringify(acceptanceBasisPayload))');
    expect(recalculatedBasisSha256).toBe(report.acceptanceBasisIdentity.sha256);
    expect(report.copyableSoleOwnerAcceptance).toMatchObject({
      status: 'TEMPLATE_NOT_EXECUTED',
      scope: 'PLANNING_BASIS_AND_ACCEPTANCE_CRITERIA_ONLY',
      technicalAcceptanceClaimed: false,
      d02Resolved: false,
      r00G02Passed: false,
      worldEditAuthorized: false,
    });
    expect(report.copyableSoleOwnerAcceptance.statement)
      .toContain(report.acceptanceBasisIdentity.sha256);
    expect(report.copyableSoleOwnerAcceptance.statement).toContain('ROAD-LOW-001');
    expect(report.copyableSoleOwnerAcceptance.statement).toContain('Every item marked HOLD remains HOLD');
    expect(report.ownerDecisionRegister.map((item) => item.status)).toEqual([
      'RECORDED_BY_DELEGATED_SELECTION',
      'RECORDED_BY_DELEGATED_SELECTION',
      'NOT_ACCEPTABLE_FROM_CURRENT_EVIDENCE',
    ]);
    expect(report.ownerDecisionRegister.every((item) => item.technicalAcceptanceClaimed === false))
      .toBe(true);
  });

  it('keeps all physical actions, D02, and R00 G02 fail-closed', () => {
    const report = readPacket();

    expect(report.authorityBoundary).toMatchObject({
      delegatedPlanningSelectionsMayPass: true,
      agentMayInventTechnicalEvidence: false,
      agentMayClaimExpertAcceptance: false,
      currentPacketMayResolveD02: false,
      currentPacketMayPassR00G02: false,
    });
    expect(report.safetyBoundary).toEqual(expect.objectContaining({
      liveCallsPerformed: [],
      databasesOpened: [],
      operationCells: [],
      materialCells: [],
      operationCellCount: 0,
      candidateCellsAreOperations: false,
      constructionAuthorized: false,
      worldEditAuthorized: false,
      technicalAcceptanceClaimed: false,
      d02Resolved: false,
      r00G02Passed: false,
    }));
    expect(report.finalGate).toEqual(expect.objectContaining({
      status: 'HOLD_D02_AND_R00_G02_NO_WORLD_EDITS',
      operationCellCount: 0,
      worldEditAuthorized: false,
      technicalAcceptanceClaimed: false,
      d02Resolved: false,
      r00G02Passed: false,
    }));
  });
});
