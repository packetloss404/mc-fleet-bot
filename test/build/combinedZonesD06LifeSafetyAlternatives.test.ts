import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_d06_life_safety_alternatives.mjs',
);
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-d06-life-safety-'));
const regeneratedJson = path.join(tempDir, 'alternatives.json');
const regeneratedMarkdown = path.join(tempDir, 'alternatives.md');

interface CellSet {
  cellCount: number;
  coordinateSetSha256: string;
}

interface IntersectionRecord {
  subjectId: string;
  intersection: CellSet;
}

interface StateCensus {
  waterCellCount: number;
  waterloggedCellCount: number;
  lavaCellCount: number;
}

interface B07Candidate {
  id: string;
  westOffsetBlocks: number;
  recommendedForSoleAuthorityReview: boolean;
  centerline: {
    pointCount: number;
    orderedSha256: string;
  };
  exactCellSets: {
    excavationReservation: CellSet;
    interactionUnion: CellSet;
  };
  geometryChecks: {
    allAnchorsAppearExactlyOnce: boolean;
    centerlineCardinalAndConnected: boolean;
    authoredCrossSectionPreserved: boolean;
  };
  immutableSnapshotAudit: {
    excavationStateCensus: StateCensus;
    interactionStateCensus: StateCensus;
    generatedStructureExcavationIntersections: IntersectionRecord[];
    generatedStructureInteractionIntersections: IntersectionRecord[];
    protectedRelicInteractionIntersections: unknown[];
    candidateRelicBufferInteractionIntersections: unknown[];
    blockEntityInteractionIntersections: unknown[];
  };
}

interface VentRiser {
  id: string;
  surveyedSurface: {
    landingY: number;
    dryColumnCount: number;
    columnCount: number;
  };
  riserReservation: CellSet;
  immutableSnapshotAudit: {
    stateCensus: StateCensus;
    generatedStructureExcavationIntersections: unknown[];
    generatedStructureInteractionIntersections: unknown[];
    blockEntityInteractionIntersections: unknown[];
  };
  exteriorOutletOpened: boolean;
  commissioned: boolean;
}

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  authority: {
    offlineOnly: boolean;
    executable: boolean;
    worldEditAuthorized: boolean;
    constructionAuthorized: boolean;
    codeComplianceClaimed: boolean;
    expertCommissioningClaimed: boolean;
    operationCellCount: number;
    materialCellCount: number;
  };
  sourceBindings: Record<string, {
    path: string;
    sha256: string;
    regionFileCount?: number;
  }>;
  b07PublicShaftTransfer: {
    status: string;
    recommendedCandidateId: string;
    candidates: B07Candidate[];
    blockerClosed: boolean;
  };
  d06EmptyEightLifeSafety: {
    status: string;
    protectedEgressCoreLayouts: Array<{
      id: string;
      combinedProtectedCoreReservation: CellSet;
      layoutAlternatives: Array<{
        id: string;
        recommendedForSoleAuthorityReview: boolean;
        stairReservation: CellSet;
        accessibleLiftReservation: CellSet;
      }>;
      retainedRoofTransitionCap: CellSet;
      retainedSurfaceOutletCap: CellSet;
      commissionedEgress: boolean;
      commissionedAccessibleRoute: boolean;
    }>;
    ventilationOutletAlternatives: {
      recommendedAlternativeId: string;
      alternatives: Array<{
        id: string;
        recommendedForSoleAuthorityReview: boolean;
        risers?: VentRiser[];
        combinedReservation: CellSet;
      }>;
      exteriorOutletCountOpened: number;
      smokeModelValidated: boolean;
      mechanismSelected: boolean;
      commissioned: boolean;
    };
    failClosedBarriersAndSmokeInterfaces: {
      platformBarriers: Array<{
        staticGateBayCap: CellSet;
        completeFailClosedBarrier: CellSet;
        poweredGateMechanism: null;
        operationallyAuthorized: boolean;
      }>;
      smokeBoundaries: Array<{
        staticOpeningCaps: CellSet;
        completeFailClosedBoundary: CellSet;
        smokeDoorMechanism: null;
        operationallyAuthorized: boolean;
      }>;
      totals: {
        platformStaticGateCapCells: number;
        smokeOpeningCapCells: number;
      };
    };
    drainageAlternatives: {
      recommendedAlternativeId: string;
      alternatives: Array<{
        id: string;
        recommendedForSoleAuthorityReview: boolean;
        capUnion?: CellSet;
        localSumpInterfaceCaps?: Array<{ cap: CellSet }>;
        interfaceSetsPairwiseDisjoint?: boolean;
      }>;
      externalDischargePoint: null;
      pumpMechanismSelected: boolean;
      hydraulicModelValidated: boolean;
      commissioned: boolean;
    };
    fireServiceAccessAlternatives: {
      recommendedAlternativeId: string;
      alternatives: Array<{
        id: string;
        recommendedForSoleAuthorityReview: boolean;
        internalTransferReservation: CellSet;
        normallyClosedSpineInterfaceCap: CellSet;
        externalApproachRoute: null;
      }>;
      emergencyServiceAcceptance: boolean;
      externalApproachRouteProven: boolean;
      commissioned: boolean;
    };
    independenceProof: Record<string, boolean | number>;
    commissioned: boolean;
    codeComplianceClaimed: boolean;
  };
  overallDisposition: {
    holdIds: string[];
    closedIds: string[];
    recommendationsRequireSoleAuthorityAcceptance: boolean;
  };
}

function readReport(): Report {
  return JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as Report;
}

function sha256File(filename: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      SCRIPT,
      '--out',
      regeneratedJson,
      '--markdown',
      regeneratedMarkdown,
    ],
    { cwd: ROOT, stdio: 'pipe', maxBuffer: 10 * 1024 * 1024 },
  );
}, 120_000);

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones D06/B07 fail-closed life-safety alternatives', () => {
  it('regenerates byte-identical recommendation evidence from acyclic sources', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));

    const report = readReport();
    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-d06-life-safety-alternatives',
      status: 'PARTIAL_PASS_FAIL_CLOSED_B07_D06_ALTERNATIVES_FROZEN_ALL_RELEASE_AND_COMMISSIONING_HOLD',
      authority: {
        offlineOnly: true,
        executable: false,
        worldEditAuthorized: false,
        constructionAuthorized: false,
        codeComplianceClaimed: false,
        expertCommissioningClaimed: false,
        operationCellCount: 0,
        materialCellCount: 0,
      },
    });
    for (const binding of Object.values(report.sourceBindings)) {
      if (binding.regionFileCount !== undefined) continue;
      expect(sha256File(path.join(ROOT, binding.path)), binding.path).toBe(binding.sha256);
      expect(binding.path).not.toMatch(/phase1-(autonomous-design-selections|r00-readiness-audit)/);
    }
    const serialized = fs.readFileSync(COMMITTED_JSON, 'utf8');
    expect(serialized).not.toContain('"selectedForPlanning"');
    expect(serialized).not.toContain('"selectedAlternativeId"');
    expect(serialized).not.toContain('"selectedCandidateId"');
  });

  it('recommends the first 7x7 B07 dogleg that clears both excavation and interaction', () => {
    const b07 = readReport().b07PublicShaftTransfer;
    expect(b07).toMatchObject({
      status: 'PARTIAL_PASS_WEST_TWO_OFFLINE_RECOMMENDATION_B07_AND_LIFE_SAFETY_HOLD',
      recommendedCandidateId: 'B07-C-WEST-2',
      blockerClosed: false,
    });
    expect(b07.candidates.map(({ id }) => id)).toEqual([
      'B07-A-CENTERED',
      'B07-B-WEST-1',
      'B07-C-WEST-2',
    ]);
    expect(b07.candidates.every((candidate) => (
      candidate.geometryChecks.allAnchorsAppearExactlyOnce
        && candidate.geometryChecks.centerlineCardinalAndConnected
        && candidate.geometryChecks.authoredCrossSectionPreserved
    ))).toBe(true);

    const [centered, westOne, westTwo] = b07.candidates;
    expect(centered).toMatchObject({
      westOffsetBlocks: 0,
      recommendedForSoleAuthorityReview: false,
      centerline: { pointCount: 159 },
      exactCellSets: {
        excavationReservation: {
          cellCount: 7_791,
          coordinateSetSha256: 'e3cbfdae04cce83a25c24b2cd982836428c78befe46d357687d0273bd7aefc86',
        },
      },
    });
    expect(centered.immutableSnapshotAudit.generatedStructureExcavationIntersections)
      .toMatchObject([{ subjectId: 'minecraft:mineshaft@135,-26#27', intersection: { cellCount: 217 } }]);

    expect(westOne).toMatchObject({
      westOffsetBlocks: 1,
      recommendedForSoleAuthorityReview: false,
      centerline: { pointCount: 161 },
      exactCellSets: { excavationReservation: { cellCount: 8_036 } },
    });
    expect(westOne.immutableSnapshotAudit.generatedStructureExcavationIntersections).toEqual([]);
    expect(westOne.immutableSnapshotAudit.generatedStructureInteractionIntersections)
      .toMatchObject([{ subjectId: 'minecraft:mineshaft@135,-26#27', intersection: { cellCount: 279 } }]);

    expect(westTwo).toMatchObject({
      westOffsetBlocks: 2,
      recommendedForSoleAuthorityReview: true,
      centerline: {
        pointCount: 163,
        orderedSha256: '58ad6b7fe2de1a24717d0d495b2530047866d5611cc5e20f945c87eabeff133e',
      },
      exactCellSets: {
        excavationReservation: {
          cellCount: 8_134,
          coordinateSetSha256: 'd58f20c6ad6581487e2a6ba72754d40ce22d49981da7450b44ad5e37325e5e59',
        },
      },
    });
    expect(westTwo.immutableSnapshotAudit).toMatchObject({
      excavationStateCensus: { waterCellCount: 38, waterloggedCellCount: 1, lavaCellCount: 0 },
      interactionStateCensus: { waterCellCount: 109, waterloggedCellCount: 2, lavaCellCount: 0 },
      generatedStructureExcavationIntersections: [],
      generatedStructureInteractionIntersections: [],
      protectedRelicInteractionIntersections: [],
      candidateRelicBufferInteractionIntersections: [],
      blockEntityInteractionIntersections: [],
    });
  });

  it('preserves protected stair/lift layouts and recommends four independent capped vent risers', () => {
    const d06 = readReport().d06EmptyEightLifeSafety;
    expect(d06.protectedEgressCoreLayouts.map(({ id }) => id)).toEqual(['EG-A', 'EG-B']);
    expect(d06.protectedEgressCoreLayouts.map(({ combinedProtectedCoreReservation }) => (
      combinedProtectedCoreReservation.cellCount
    ))).toEqual([1_911, 1_470]);
    for (const core of d06.protectedEgressCoreLayouts) {
      expect(core.layoutAlternatives.map(({ recommendedForSoleAuthorityReview }) => (
        recommendedForSoleAuthorityReview
      ))).toEqual([true, false]);
      expect(core.retainedRoofTransitionCap.cellCount).toBe(49);
      expect(core.retainedSurfaceOutletCap.cellCount).toBe(49);
      expect(core.commissionedEgress).toBe(false);
      expect(core.commissionedAccessibleRoute).toBe(false);
    }

    const vents = d06.ventilationOutletAlternatives;
    expect(vents).toMatchObject({
      recommendedAlternativeId: 'VENT-A-FOUR-INDEPENDENT-LOCAL-RISERS',
      exteriorOutletCountOpened: 0,
      smokeModelValidated: false,
      mechanismSelected: false,
      commissioned: false,
    });
    expect(vents.alternatives.map(({ recommendedForSoleAuthorityReview }) => (
      recommendedForSoleAuthorityReview
    ))).toEqual([true, false]);
    expect(vents.alternatives.map(({ combinedReservation }) => combinedReservation.cellCount))
      .toEqual([900, 2_538]);
    const local = vents.alternatives[0].risers ?? [];
    expect(local.map(({ id }) => id)).toEqual([
      'EE-VENT-NW',
      'EE-VENT-NE',
      'EE-VENT-SW',
      'EE-VENT-SE',
    ]);
    expect(local.map(({ surveyedSurface }) => surveyedSurface.landingY)).toEqual([85, 102, 65, 64]);
    expect(local.map(({ riserReservation }) => riserReservation.cellCount)).toEqual([279, 432, 99, 90]);
    for (const riser of local) {
      expect(riser.surveyedSurface.dryColumnCount).toBe(riser.surveyedSurface.columnCount);
      expect(riser.immutableSnapshotAudit).toMatchObject({
        stateCensus: { waterCellCount: 0, waterloggedCellCount: 0, lavaCellCount: 0 },
        generatedStructureExcavationIntersections: [],
        generatedStructureInteractionIntersections: [],
        blockEntityInteractionIntersections: [],
      });
      expect(riser.exteriorOutletOpened).toBe(false);
      expect(riser.commissioned).toBe(false);
    }
  });

  it('keeps barriers, smoke doors, drainage, and fire-service interfaces fail-closed', () => {
    const d06 = readReport().d06EmptyEightLifeSafety;
    const barriers = d06.failClosedBarriersAndSmokeInterfaces;
    expect(barriers.totals).toEqual({
      platformStaticGateCapCells: 192,
      smokeOpeningCapCells: 72,
    });
    expect(barriers.platformBarriers).toHaveLength(8);
    expect(barriers.platformBarriers.every((item) => (
      item.staticGateBayCap.cellCount === 24
        && item.completeFailClosedBarrier.cellCount === 202
        && item.poweredGateMechanism === null
        && !item.operationallyAuthorized
    ))).toBe(true);
    expect(barriers.smokeBoundaries).toHaveLength(2);
    expect(barriers.smokeBoundaries.every((item) => (
      item.staticOpeningCaps.cellCount === 36
        && item.completeFailClosedBoundary.cellCount === 1_372
        && item.smokeDoorMechanism === null
        && !item.operationallyAuthorized
    ))).toBe(true);

    const drainage = d06.drainageAlternatives;
    expect(drainage).toMatchObject({
      recommendedAlternativeId: 'DRAIN-A-EIGHT-INDEPENDENT-LOCAL-CAPS',
      externalDischargePoint: null,
      pumpMechanismSelected: false,
      hydraulicModelValidated: false,
      commissioned: false,
    });
    const localCaps = drainage.alternatives[0];
    expect(localCaps).toMatchObject({
      recommendedForSoleAuthorityReview: true,
      capUnion: { cellCount: 24 },
      interfaceSetsPairwiseDisjoint: true,
    });
    expect(localCaps.localSumpInterfaceCaps).toHaveLength(8);
    expect(localCaps.localSumpInterfaceCaps?.every(({ cap }) => cap.cellCount === 3)).toBe(true);

    const fire = d06.fireServiceAccessAlternatives;
    expect(fire).toMatchObject({
      recommendedAlternativeId: 'FIRE-EG-B',
      emergencyServiceAcceptance: false,
      externalApproachRouteProven: false,
      commissioned: false,
    });
    expect(fire.alternatives).toMatchObject([
      {
        id: 'FIRE-EG-A',
        recommendedForSoleAuthorityReview: false,
        internalTransferReservation: { cellCount: 4_750 },
        normallyClosedSpineInterfaceCap: { cellCount: 35 },
        externalApproachRoute: null,
      },
      {
        id: 'FIRE-EG-B',
        recommendedForSoleAuthorityReview: true,
        internalTransferReservation: { cellCount: 0 },
        normallyClosedSpineInterfaceCap: { cellCount: 35 },
        externalApproachRoute: null,
      },
    ]);
  });

  it('leaves B07, D06, and G02 open for sole-authority and expert gates', () => {
    const report = readReport();
    expect(report.d06EmptyEightLifeSafety).toMatchObject({
      status: 'PARTIAL_PASS_EXACT_FAIL_CLOSED_RESERVATIONS_D06_AND_G02_HOLD',
      commissioned: false,
      codeComplianceClaimed: false,
    });
    expect(report.overallDisposition).toEqual(expect.objectContaining({
      holdIds: ['P1-B07-PUBLIC-SHAFT-DOGLEG', 'D06', 'G02'],
      closedIds: [],
      recommendationsRequireSoleAuthorityAcceptance: true,
    }));
  });
});
