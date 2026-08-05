import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-b09-funicular-technical-system.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-b09-funicular-technical-system.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-b09-technical-'));
const regeneratedJson = path.join(tempDir, 'b09-technical.json');
const regeneratedMarkdown = path.join(tempDir, 'b09-technical.md');

interface Binding {
  path: string;
  bytes: number;
  sha256: string;
}

interface CellSet {
  cellCount: number;
  bounds: Record<string, number> | null;
  coordinateSetSha256: string;
  proposalAccepted: boolean;
  acceptedCellCount: number;
  proposalRole?: string;
}

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  reportIdentitySha256: string;
  sourceBindings: Record<string, Binding>;
  authorityBoundary: Record<string, boolean | string>;
  deterministicGeometryContract: {
    selectedModelIdentitySha256: string;
    selectedModelFormulaSha256: string;
    orderedCenterlineSha256: string;
    centerlinePointCount: number;
    horizontalStepCount: number;
    curveIndices: number[];
    throat: Record<string, number>;
    stationSeedPointCountPerEnd: number;
    minimumPlanningAccommodation: CellSet;
    technicalReservationManifestSha256: string;
  };
  exactTechnicalReservationProposals: {
    proposalLayerCount: number;
    proposalLayers: Record<string, CellSet>;
    proposalEnvelopeUniqueCellCount: number;
    acceptedTechnicalCellCount: number;
    acceptedOwnerAssignmentCount: number;
  };
  exactSealedInterfaceProposals: {
    exactInterfaceCount: number;
    interfaces: Array<{
      interfaceId: string;
      direction: string;
      defaultDeny: boolean;
      wildcard: boolean;
      lastWriterWins: boolean;
      sealedByDefault: boolean;
      exactCellSet: CellSet;
      interfaceAccepted: boolean;
      acceptedInterfaceCellCount: number;
    }>;
    acceptedInterfaceCount: number;
    acceptedInterfaceCellCount: number;
  };
  conflictAudit: {
    b08: Record<string, unknown> & {
      exactIntersection: CellSet;
      proposedRoleIntersectionCounts: Record<string, number>;
    };
    d05MountainAndSupport: Record<string, unknown> & {
      rawFutureMountainFillConflictCellCount: number;
      selectedFutureMountainCandidateConflictAfterWithholdingCellCount: number;
      supportGapIntersectionCellCount: number;
    };
    d06Egress: Record<string, unknown> & { exactIntersection: CellSet };
    protectedRelicCores: Record<string, unknown> & {
      comparedCoreCount: number;
      comparedCoreCellCount: number;
      exactIntersection: CellSet;
    };
    observedGeneratedStarts: Record<string, unknown> & {
      comparedStartRecordCount: number;
      overlappingStartRecordCount: number;
      completeSaveAllStartCensusAccepted: boolean;
    };
  };
  nullHeldSystemsAndInterfaces: Array<{
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

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      'scripts/compile_combined_zones_b09_funicular_technical_system.mjs',
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

describe('Combined Zones B09 funicular technical-system proposal', () => {
  it('regenerates byte-identically and binds all consumed exact evidence', () => {
    expect(fs.readFileSync(regeneratedJson).equals(fs.readFileSync(COMMITTED_JSON))).toBe(true);
    expect(fs.readFileSync(regeneratedMarkdown).equals(fs.readFileSync(COMMITTED_MARKDOWN)))
      .toBe(true);
    const report = readReport();
    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-b09-funicular-technical-system-proposal',
      status:
        'PARTIAL_PASS_EXACT_B09_TECHNICAL_RESERVATION_PROPOSAL_MECHANISMS_AND_ACCEPTANCE_HOLD',
      reportIdentitySha256:
        'e8738f3932f2afc3ba71e35ccdebf0d5ef444ca7389e81ec31a18e48517d3eba',
    });
    expect(Object.keys(report.sourceBindings)).toHaveLength(8);
    for (const source of Object.values(report.sourceBindings)) {
      const filename = path.join(ROOT, source.path);
      expect(fs.statSync(filename).size).toBe(source.bytes);
      expect(sha256File(filename)).toBe(source.sha256);
    }
  });

  it('reproduces the selected centerline and minimum accommodation exactly', () => {
    const contract = readReport().deterministicGeometryContract;
    expect(contract).toMatchObject({
      selectedModelIdentitySha256:
        '735b69b38c5c2ea840388039b5beb957671fe3e243ec7943c440649edcff36a6',
      selectedModelFormulaSha256:
        'cd8f6d396f477407263aee4984a50766dff0298a046bb1f348a2c6d139cf6cd6',
      orderedCenterlineSha256:
        'e8905742a77148d13d799362da7d65e9b02bcf96455d580fbee27367b2d24221',
      centerlinePointCount: 561,
      horizontalStepCount: 560,
      curveIndices: [240, 260, 500],
      throat: { x: 2288, y: 130, z: -748, climbZ: -768 },
      stationSeedPointCountPerEnd: 9,
      minimumPlanningAccommodation: {
        cellCount: 7800,
        coordinateSetSha256:
          'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
        proposalAccepted: false,
        acceptedCellCount: 0,
      },
      technicalReservationManifestSha256:
        'ccaa3493bd0da9dfbec88d010232f760ff37c62a87ae4c1de0f512f519882d41',
    });
  });

  it('freezes exact functional proposal layers without accepting technical cells', () => {
    const proposals = readReport().exactTechnicalReservationProposals;
    expect(proposals).toMatchObject({
      proposalLayerCount: 9,
      proposalEnvelopeUniqueCellCount: 7800,
      acceptedTechnicalCellCount: 0,
      acceptedOwnerAssignmentCount: 0,
    });
    expect(proposals.proposalLayers).toMatchObject({
      lowerStationEnvelope: {
        cellCount: 132,
        coordinateSetSha256:
          'd13426cafb5f9cb53de702653532111ef18588af1c28c0f3d8e7cb2956e0801b',
      },
      summitStationEnvelope: {
        cellCount: 180,
        coordinateSetSha256:
          '99d28f072ae6055d394a9690c125b4e0de58b09192cc3fd166302060f3bb9599',
      },
      combinedStationEnvelope: {
        cellCount: 312,
        coordinateSetSha256:
          '0b6e428af369217693c25da890328d0abfe06489443587822cc7fb520cf16f3f',
      },
      runningGuidewayAndSupportEnvelope: {
        cellCount: 7488,
        coordinateSetSha256:
          'd9de4b923a8002dbd302116f4c928b6794d824ea616811d0ab2a3988ad32bb1f',
      },
      railDatumReservation: {
        cellCount: 561,
        coordinateSetSha256:
          '91b5174e01bde419175c68997f199f01b04ee38cbde13304ab4dd9a0d0d979b8',
      },
      maintenanceAndEgressReservation: {
        cellCount: 2250,
        coordinateSetSha256:
          '352ad477cd96fc6ff9d460847c1e756d448bda4c899e77ade258d4dc63a5a4d5',
      },
      rescueTransferReservation: { cellCount: 312 },
      powerAndControlCarrierReservation: { cellCount: 561 },
      drainageCarrierReservation: { cellCount: 561 },
    });
    expect(Object.values(proposals.proposalLayers).every((item) => (
      item.proposalAccepted === false && item.acceptedCellCount === 0
    ))).toBe(true);
  });

  it('isolates known conflicts and keeps both exact interfaces sealed', () => {
    const report = readReport();
    expect(report.conflictAudit.b08.exactIntersection).toMatchObject({
      cellCount: 36,
      coordinateSetSha256:
        'b28a975b44296fc43739a8af0743066ca58a2c33a99e13da6c2edf89142b33e3',
    });
    expect(report.conflictAudit.d05MountainAndSupport).toMatchObject({
      rawFutureMountainFillConflictCellCount: 4245,
      selectedFutureMountainCandidateConflictAfterWithholdingCellCount: 0,
      supportGapIntersectionCellCount: 0,
    });
    expect(report.conflictAudit.d06Egress.exactIntersection.cellCount).toBe(0);
    expect(report.conflictAudit.protectedRelicCores).toMatchObject({
      comparedCoreCount: 3,
      comparedCoreCellCount: 2828,
      exactIntersection: { cellCount: 0 },
    });
    expect(report.conflictAudit.observedGeneratedStarts).toMatchObject({
      comparedStartRecordCount: 114,
      overlappingStartRecordCount: 0,
      completeSaveAllStartCensusAccepted: false,
    });
    expect(report.exactSealedInterfaceProposals).toMatchObject({
      exactInterfaceCount: 2,
      acceptedInterfaceCount: 0,
      acceptedInterfaceCellCount: 0,
    });
    expect(report.exactSealedInterfaceProposals.interfaces).toEqual([
      expect.objectContaining({
        interfaceId: 'IF-B08-B09-PORTAL',
        direction: 'B08_TO_B09',
        defaultDeny: true,
        sealedByDefault: true,
        exactCellSet: expect.objectContaining({ cellCount: 36 }),
        interfaceAccepted: false,
      }),
      expect.objectContaining({
        interfaceId: 'IF-B09-Z11-SUMMIT',
        direction: 'B09_TO_Z11',
        defaultDeny: true,
        sealedByDefault: true,
        exactCellSet: expect.objectContaining({
          cellCount: 12,
          coordinateSetSha256:
            'd1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093',
        }),
        interfaceAccepted: false,
      }),
    ]);
  });

  it('retains genuine technical holds and zero acceptance or operation authority', () => {
    const report = readReport();
    expect(report.nullHeldSystemsAndInterfaces).toHaveLength(8);
    expect(report.nullHeldSystemsAndInterfaces.every((item) => (
      item.exactCellSet === null && item.status.startsWith('HOLD_')
    ))).toBe(true);
    expect(report.passHoldMatrix).toHaveLength(9);
    expect(report.disposition).toMatchObject({
      exactCenterlineReproduced: true,
      exactMinimumAccommodationReproduced: true,
      exactTechnicalReservationLayersCompiled: true,
      currentExactConflictAuditPassed: true,
      completeSaveAllStartGatePassed: false,
      geotechnicalAndHydrologyAccepted: false,
      mechanismsAccepted: false,
      lifeSafetyAndRescueAccepted: false,
      ownerAndInterfacesAccepted: false,
      b09TechnicallyAccepted: false,
      b09ConstructionReady: false,
      r00Passed: false,
    });
    expect(report.safetyBoundary).toMatchObject({
      operationCellCount: 0,
      materialCellCount: 0,
      futureCellCount: 0,
      constructionCellCount: 0,
      acceptedCellCount: 0,
      acceptedOwnerAssignmentCount: 0,
      acceptedInterfaceCellCount: 0,
      acceptedMechanismCellCount: 0,
      worldEditAuthorized: false,
      physicalBuildAuthorized: false,
      executable: false,
    });
  });
});
