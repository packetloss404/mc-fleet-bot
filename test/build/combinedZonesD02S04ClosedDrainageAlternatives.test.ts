import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const GENERATED_AT = '2026-08-04T22:44:00Z';
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-d02-s04-closed-drainage-alternatives.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-d02-s04-closed-drainage-alternatives.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-d02-s04-'));
const regeneratedJson = path.join(tempDir, 'alternatives.json');
const regeneratedMarkdown = path.join(tempDir, 'alternatives.md');

interface Cell {
  x: number;
  y: number;
  z: number;
  roles: string[];
}

interface Manifest {
  cellCount: number;
  coordinateSetSha256: string;
  roleStreamSha256: string;
  cells?: Cell[];
}

interface RegionAudit {
  waterFamilyCells: number;
  lavaCells: number;
  gravitySensitiveCells: number;
  faceAdjacentCurrentFluidCellCount: number;
  blockEntityIntersectionCount: number;
  generatedStructureBoundsIntersectionCount: number;
  civilThreeDimensionalInterfaceIntersectionCount: number;
  dataDistrictCrossroadForbiddenCellCount: number;
  outsideExactLandTakeCellCount: number;
  strictNoCurrentFluidInteraction: boolean;
  planningGeometryClear: boolean;
}

interface Alternative {
  id: string;
  lowRunsCovered?: number;
  lowRunDispositionCount?: number;
  sumpCount: number;
  noBuildPreservationHoldCount?: number;
  pumpSocketCount: number;
  forceMainCount: number;
  terminalTankCount: number;
  culvertCandidateCells: unknown[];
  overflowCandidateCells: unknown[];
  outfallCandidateCells: unknown[];
  candidateCellManifest?: Manifest;
  preservationCellManifest?: Manifest;
  heldLowRunPreservationCellManifest?: Manifest;
  currentRegionAudit: RegionAudit;
  lowRunDispositions?: Array<{
    lowRunId: string;
    disposition: string;
    currentFluidSameCellCount: number;
    currentFluidFaceAdjacentCellCount: number;
  }>;
  ownershipAndInterfaces?: Array<{
    ownerStatus: string;
    interfaces: {
      collectionInlet: { cellManifest: Manifest };
      overflow: { cellManifest: Manifest; receiverId: null; status: string };
      outfall: { cellManifest: Manifest; receiverId: null; ownerId: null; status: string };
    };
  }>;
  technicalAcceptanceClaimed: boolean;
}

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  safetyBoundary: {
    immutableRegionReadOnly: boolean;
    mutableProseDependencies: unknown[];
    r00Dependencies: unknown[];
    liveCallsPerformed: unknown[];
    databasesOpened: unknown[];
    operationCells: unknown[];
    materialCells: unknown[];
    operationCellCount: number;
    candidateCellsAreOperations: boolean;
    diversionAuthorized: boolean;
    constructionAuthorized: boolean;
    worldEditAuthorized: boolean;
    technicalAcceptanceClaimed: boolean;
    d02Resolved: boolean;
  };
  sourceBindings: Array<{ path: string; sha256: string; bytes: number }>;
  immutableEvidenceIdentity: {
    regionSnapshot: { sha256: string };
    s03FluidTopology: { acceptedReceiverCount: number; selectedOutfall: null };
    selectedNoDiversionRule: {
      selectionId: string;
      selection: string;
      technicalAcceptanceClaimed: boolean;
    };
  };
  exactLowRunBasis: {
    lowRunCount: number;
    roadLowRunCount: number;
    railLowRunCount: number;
    anchorSelectionEvidence: Array<{
      lowRunId: string;
      strictClearAnchorCount: number;
      selectedAudit: RegionAudit;
    }>;
  };
  candidateOwnershipInterfaceSchema: {
    schemaVersion: number;
    requiredFields: string[];
    defaultNoDiversionInvariant: string;
  };
  alternatives: Alternative[];
  defaultNoDiversionProof: {
    preferredAlternativeId: string;
    exactOutfallCandidateCellCount: number;
    exactOverflowCandidateCellCount: number;
    exactCulvertCandidateCellCount: number;
    currentFluidSameCellCount: number;
    currentFluidFaceAdjacentCellCount: number;
    heldLowRunCount: number;
    receiverId: null;
    diversionInterfacePresent: boolean;
    futureFluidTopologyClaimed: boolean;
    physicalNoDiversionAcceptanceClaimed: boolean;
  };
  preferredPlanningAlternative: {
    alternativeId: string;
    status: string;
    technicalAcceptanceClaimed: boolean;
    worldEditAuthorized: boolean;
  };
  evidenceImpact: Record<string, boolean>;
  remainingBlockers: string[];
  finalGate: { status: string; worldEditAuthorized: boolean; d02Resolved: boolean };
}

function readReport(filename = COMMITTED_JSON): Report {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as Report;
}

function sha256File(relativePath: string): string {
  return crypto.createHash('sha256')
    .update(fs.readFileSync(path.join(ROOT, relativePath)))
    .digest('hex');
}

function hashManifest(manifest: Manifest, preamble: string): {
  coordinates: string;
  roles: string;
} {
  const cells = [...(manifest.cells ?? [])].sort((left, right) => (
    left.x - right.x || left.y - right.y || left.z - right.z
  ));
  const coordinates = crypto.createHash('sha256');
  const roles = crypto.createHash('sha256');
  coordinates.update(`${preamble}-coordinates\n`);
  roles.update(`${preamble}-roles\n`);
  for (const cell of cells) {
    coordinates.update(`${cell.x},${cell.y},${cell.z}\n`);
    roles.update(`${cell.x},${cell.y},${cell.z},${[...cell.roles].sort().join('+')}\n`);
  }
  return { coordinates: coordinates.digest('hex'), roles: roles.digest('hex') };
}

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      '--max-old-space-size=4096',
      'scripts/compile_combined_zones_d02_s04_closed_drainage_alternatives.mjs',
      '--out', regeneratedJson,
      '--markdown', regeneratedMarkdown,
      '--generated-at', GENERATED_AT,
    ],
    { cwd: ROOT, stdio: 'pipe', maxBuffer: 1024 * 1024 },
  );
}, 60_000);

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones D02-S04 closed drainage planning alternatives', () => {
  it('regenerates the committed JSON and Markdown byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
  }, 30_000);

  it('binds only immutable machine inputs with no mutable prose or R00 dependency', () => {
    const report = readReport();

    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-d02-s04-closed-drainage-alternatives',
      status: 'PARTIAL_PASS_PREFERRED_CLOSED_SUMP_PLANNING_GEOMETRY_D02_HOLD',
      immutableEvidenceIdentity: {
        regionSnapshot: {
          sha256: '05eebe12ba419abd75b80033c265daf452b652a575c912f6df497735e00d271b',
        },
        s03FluidTopology: { acceptedReceiverCount: 0, selectedOutfall: null },
        selectedNoDiversionRule: {
          selectionId: 'SEL-D05-ZERO-UNDECLARED-CHANGE',
          selection: 'ADOPT_ZERO_UNDECLARED_CHANGE_AND_DEFAULT_NO_DIVERSION',
          technicalAcceptanceClaimed: false,
        },
      },
    });
    expect(report.sourceBindings.map((binding) => binding.path)).toEqual([
      'docs/masterplans/05-combined-zones/phase1-d02-s03-hydrology-outfalls.json',
      'docs/masterplans/05-combined-zones/phase1-d02-s01-s02-region-evidence.json',
      'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json',
      'docs/masterplans/05-combined-zones/phase1-d05-conservative-defaults.json',
    ]);
    expect(report.sourceBindings.every((binding) => (
      binding.path.endsWith('.json')
      && !binding.path.toLowerCase().includes('r00')
      && !binding.path.includes('release-contract')
    ))).toBe(true);
    for (const binding of report.sourceBindings) {
      expect(sha256File(binding.path)).toBe(binding.sha256);
      expect(fs.statSync(path.join(ROOT, binding.path)).size).toBe(binding.bytes);
    }
  });

  it('compiles all low runs and rejects the water-interacting road terminal chamber', () => {
    const report = readReport();

    expect(report.exactLowRunBasis).toMatchObject({
      lowRunCount: 11,
      roadLowRunCount: 5,
      railLowRunCount: 6,
    });
    expect(report.exactLowRunBasis.anchorSelectionEvidence).toHaveLength(11);
    const roadTerminal = report.exactLowRunBasis.anchorSelectionEvidence
      .find((record) => record.lowRunId === 'ROAD-LOW-001');
    expect(roadTerminal).toMatchObject({
      strictClearAnchorCount: 0,
      selectedAudit: {
        waterFamilyCells: 6,
        lavaCells: 0,
        faceAdjacentCurrentFluidCellCount: 16,
        planningGeometryClear: false,
      },
    });
    expect(report.exactLowRunBasis.anchorSelectionEvidence
      .filter((record) => record.lowRunId !== 'ROAD-LOW-001')
      .every((record) => record.strictClearAnchorCount > 0 && record.selectedAudit.planningGeometryClear))
      .toBe(true);
  });

  it('freezes exact alternative manifests and selects the strict-clear hybrid only as planning geometry', () => {
    const report = readReport();

    expect(report.alternatives).toHaveLength(4);
    const altA = report.alternatives.find((alternative) => alternative.id.includes('-A-DISTRIBUTED'))!;
    const altB = report.alternatives.find((alternative) => alternative.id.includes('-B-PUMPED'))!;
    const altC = report.alternatives.find((alternative) => alternative.id.includes('-C-NO-BUILD'))!;
    const altD = report.alternatives.find((alternative) => alternative.id.includes('-D-HYBRID'))!;
    expect(altA.candidateCellManifest?.cellCount).toBe(468);
    expect(altA.currentRegionAudit).toMatchObject({
      waterFamilyCells: 6,
      faceAdjacentCurrentFluidCellCount: 16,
      planningGeometryClear: false,
    });
    expect(altB.candidateCellManifest?.cellCount).toBe(11680);
    expect(altB.currentRegionAudit.planningGeometryClear).toBe(false);
    expect(altC.preservationCellManifest?.cellCount).toBe(229);
    expect(altD).toMatchObject({
      lowRunDispositionCount: 11,
      sumpCount: 10,
      noBuildPreservationHoldCount: 1,
      pumpSocketCount: 0,
      forceMainCount: 0,
      terminalTankCount: 0,
      currentRegionAudit: {
        waterFamilyCells: 0,
        lavaCells: 0,
        gravitySensitiveCells: 0,
        faceAdjacentCurrentFluidCellCount: 0,
        blockEntityIntersectionCount: 0,
        generatedStructureBoundsIntersectionCount: 0,
        civilThreeDimensionalInterfaceIntersectionCount: 0,
        dataDistrictCrossroadForbiddenCellCount: 0,
        outsideExactLandTakeCellCount: 0,
        strictNoCurrentFluidInteraction: true,
        planningGeometryClear: true,
      },
    });
    expect(altD.candidateCellManifest).toMatchObject({
      cellCount: 432,
      coordinateSetSha256: 'd43dca6357175d4802658e32bdf3c8c1617ab642919ac74e169a389140108a98',
      roleStreamSha256: 'ec3dc5bf4d6bec30d470c1412780e80872e5ffd67f4a5f14623d7614cdf24303',
    });
    const recomputed = hashManifest(altD.candidateCellManifest!, 'combined-zones-d02-s04-alt-d');
    expect(recomputed.coordinates).toBe(altD.candidateCellManifest?.coordinateSetSha256);
    expect(recomputed.roles).toBe(altD.candidateCellManifest?.roleStreamSha256);
    expect(new Set(altD.candidateCellManifest?.cells?.map((cell) => `${cell.x},${cell.y},${cell.z}`)).size)
      .toBe(altD.candidateCellManifest?.cellCount);
    expect(altD.lowRunDispositions?.filter((record) => record.disposition.startsWith('NO_BUILD')))
      .toEqual([expect.objectContaining({
        lowRunId: 'ROAD-LOW-001',
        currentFluidSameCellCount: 6,
        currentFluidFaceAdjacentCellCount: 16,
      })]);
    expect(report.preferredPlanningAlternative).toMatchObject({
      alternativeId: altD.id,
      status: 'PREFERRED_FOR_FURTHER_OFFLINE_TECHNICAL_DEVELOPMENT_ONLY',
      technicalAcceptanceClaimed: false,
      worldEditAuthorized: false,
    });
  });

  it('instantiates fail-closed ownership and exact empty diversion interfaces', () => {
    const report = readReport();
    const altD = report.alternatives.find((alternative) => alternative.id.includes('-D-HYBRID'))!;

    expect(report.candidateOwnershipInterfaceSchema).toMatchObject({
      schemaVersion: 1,
    });
    expect(report.candidateOwnershipInterfaceSchema.requiredFields).toContain('interfaces.outfall');
    expect(report.candidateOwnershipInterfaceSchema.defaultNoDiversionInvariant).toContain('zero cells');
    expect(altD.ownershipAndInterfaces).toHaveLength(10);
    for (const instance of altD.ownershipAndInterfaces ?? []) {
      expect(instance.ownerStatus).toBe('UNASSIGNED_REQUIRES_SOLE_AUTHORITY_ACCEPTANCE');
      expect(new Set(instance.interfaces.collectionInlet.cellManifest.cells?.map(
        (cell) => `${cell.x},${cell.y},${cell.z}`,
      )).size).toBe(instance.interfaces.collectionInlet.cellManifest.cellCount);
      expect(instance.interfaces.overflow).toMatchObject({
        cellManifest: { cellCount: 0 },
        receiverId: null,
        status: 'PROHIBITED_UNDER_DEFAULT_NO_DIVERSION',
      });
      expect(instance.interfaces.outfall).toMatchObject({
        cellManifest: { cellCount: 0 },
        receiverId: null,
        ownerId: null,
        status: 'PROHIBITED_UNDER_DEFAULT_NO_DIVERSION',
      });
    }
    expect(report.defaultNoDiversionProof).toEqual(expect.objectContaining({
      preferredAlternativeId: altD.id,
      exactOutfallCandidateCellCount: 0,
      exactOverflowCandidateCellCount: 0,
      exactCulvertCandidateCellCount: 0,
      currentFluidSameCellCount: 0,
      currentFluidFaceAdjacentCellCount: 0,
      heldLowRunCount: 1,
      receiverId: null,
      diversionInterfacePresent: false,
      futureFluidTopologyClaimed: false,
      physicalNoDiversionAcceptanceClaimed: false,
    }));
  });

  it('remains fail-closed with D02 unresolved and no operation authority', () => {
    const report = readReport();

    expect(report.safetyBoundary).toEqual(expect.objectContaining({
      immutableRegionReadOnly: true,
      mutableProseDependencies: [],
      r00Dependencies: [],
      liveCallsPerformed: [],
      databasesOpened: [],
      operationCells: [],
      materialCells: [],
      operationCellCount: 0,
      candidateCellsAreOperations: false,
      diversionAuthorized: false,
      constructionAuthorized: false,
      worldEditAuthorized: false,
      technicalAcceptanceClaimed: false,
      d02Resolved: false,
    }));
    expect(report.evidenceImpact).toEqual(expect.objectContaining({
      exactClosedAlternativesCompiled: true,
      exactCandidateCellManifestsFrozen: true,
      exactOwnershipInterfaceSchemaFrozen: true,
      capacityClaimed: false,
      pumpPerformanceClaimed: false,
      hydraulicAcceptanceClaimed: false,
      geotechnicalAcceptanceClaimed: false,
      structuralAcceptanceClaimed: false,
      ownershipAccepted: false,
      d02Resolved: false,
    }));
    expect(report.remainingBlockers.length).toBeGreaterThanOrEqual(8);
    expect(report.finalGate).toEqual({
      status: 'HOLD_D02_CLOSED_DRAINAGE_GEOMETRY_IS_PLANNING_ONLY_NO_WORLD_EDITS',
      worldEditAuthorized: false,
      d02Resolved: false,
      reason: expect.any(String),
    });
  });
});
