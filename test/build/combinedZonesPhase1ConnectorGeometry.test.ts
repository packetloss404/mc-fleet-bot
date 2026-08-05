import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/compile_combined_zones_phase1_connector_geometry.mjs');
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-connector-geometry.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-connectors-'));
const regeneratedJson = path.join(tempDir, 'connectors.json');
const regeneratedMarkdown = path.join(tempDir, 'connectors.md');

interface Point {
  index: number;
  x: number;
  y: number;
  z: number;
  kind: string;
  orientations?: string[];
}

interface CellSet {
  cellCount: number;
  coordinateSetSha256: string;
  constructionOwnership?: boolean;
}

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  worldEditAuthorized: boolean;
  constructionOwnershipAuthorized: boolean;
  executable: boolean;
  operationCellCount: number;
  materialCellCount: number;
  sourceBindings: Record<string, {
    path: string;
    sha256: string;
    regionFileCount?: number;
  }>;
  publicShaftDogleg: {
    blockerId: string;
    status: string;
    centerline: {
      pointCount: number;
      orderedSha256: string;
      points: Point[];
    };
    exactCellSets: {
      excavationReservation: CellSet;
      westEmergencyStairReservation: CellSet;
      innerLiftCoreReservation: CellSet;
      eastServiceChaseReservation: CellSet;
      interactionUnion: CellSet;
    };
    geometryChecks: Record<string, unknown>;
    snapshotAndIntersectionAudit: {
      immutableInteractionStateCensus: {
        waterCellCount: number;
        waterloggedCellCount: number;
        lavaCellCount: number;
      };
      generatedStructureExcavationIntersections: Array<{
        subjectId: string;
        intersection: CellSet;
      }>;
      protectedCoreIntersections: unknown[];
      unreviewedOneCellBufferCandidateIntersections: unknown[];
      blockEntityIntersections: unknown[];
    };
    disposition: { blockerClosed: boolean };
  };
  serviceTunnelCenterline: {
    blockerId: string;
    status: string;
    centerline: {
      pointCount: number;
      horizontalStepCount: number;
      orderedSha256: string;
      contactAnchorIndex: number;
      curveIndices: number[];
      points: Point[];
    };
    railConstraintAudit: Record<string, number | boolean | string>;
    poweredRailSchedule: {
      poweredRailCellSet: CellSet;
      orderedIndices: number[];
      curvePoweredRailCount: number;
    };
    exactCellSets: {
      excavationReservation: CellSet;
      railCenterline: CellSet;
      rotatedCurveRoleOverlap: CellSet;
      interactionUnion: CellSet;
    };
    snapshotAndIntersectionAudit: {
      immutableInteractionStateCensus: {
        waterCellCount: number;
        waterloggedCellCount: number;
        lavaCellCount: number;
      };
      generatedStructureExcavationIntersections: unknown[];
      protectedCoreIntersections: unknown[];
      unreviewedOneCellBufferCandidateIntersections: unknown[];
      blockEntityIntersections: unknown[];
    };
    disposition: { blockerClosed: boolean };
  };
  funicularFaceComparison: {
    blockerId: string;
    status: string;
    faceSelection: null;
    immutableEndpointSurfaceComparison: {
      portal: { designMinusSurfaceY: number };
      summit: { designMinusSurfaceY: number };
    };
    minimumRailGeometry: { transformedRiseBlocks: number };
    candidates: Array<{
      id: string;
      horizontalStepCount: number;
      orderedSampleCount: number;
      currentSurface: {
        minimumY: number;
        maximumY: number;
      };
      protectedRelicPlanIntersections: unknown[];
    }>;
    comparison: {
      existingTerrainCanProveFutureMountainFace: boolean;
    };
    disposition: {
      exactRailCenterlineFrozen: boolean;
      blockerClosed: boolean;
    };
  };
  overallDisposition: {
    blockerIdsClosed: string[];
    blockersRemainingHold: string[];
  };
}

function readReport(): Report {
  return JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as Report;
}

function sha256File(filename: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function orderedCenterlineHash(points: Point[]): string {
  const digest = crypto.createHash('sha256');
  digest.update('combined-zones-ordered-centerline-v1\n');
  for (const point of points) {
    digest.update(`${point.index}:${point.x},${point.y},${point.z}:${point.kind}\n`);
  }
  return digest.digest('hex');
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

describe('Combined Zones Phase 1 connector geometry', () => {
  it('regenerates byte-identical artifacts from upstream immutable evidence', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));

    const report = readReport();
    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-connector-geometry',
      status: 'PARTIAL_PASS_EXACT_B07_B08_CANDIDATES_B09_PROFILE_ALL_CONSTRUCTION_HOLD',
      worldEditAuthorized: false,
      constructionOwnershipAuthorized: false,
      executable: false,
      operationCellCount: 0,
      materialCellCount: 0,
    });
    for (const binding of Object.values(report.sourceBindings)) {
      if (binding.regionFileCount !== undefined) continue;
      expect(sha256File(path.join(ROOT, binding.path)), binding.path).toBe(binding.sha256);
      expect(binding.path).not.toMatch(/phase1-(autonomous-design-selections|r00-readiness-audit)/);
    }
  });

  it('freezes an exact 7x7 public-shaft dogleg without claiming egress closure', () => {
    const shaft = readReport().publicShaftDogleg;
    expect(shaft).toMatchObject({
      blockerId: 'P1-B07-PUBLIC-SHAFT-DOGLEG',
      status: 'PARTIAL_PASS_EXACT_OFFLINE_GEOMETRY_B07_LIFE_SAFETY_HOLD',
      geometryChecks: {
        allAnchorsAppearExactlyOnce: true,
        centerlineCardinalAndConnected: true,
        independentEgressProof: false,
      },
      disposition: { blockerClosed: false },
    });
    expect(shaft.centerline.pointCount).toBe(159);
    expect(shaft.centerline.orderedSha256).toBe(orderedCenterlineHash(shaft.centerline.points));
    expect(shaft.centerline.orderedSha256)
      .toBe('df905caccdd0593845b36b1aac2b75db5a64caa85da76981bfa78334dc8399e8');
    expect(shaft.exactCellSets.excavationReservation).toMatchObject({
      cellCount: 7_791,
      coordinateSetSha256: '1cf518d7b62044349356926bb1a0902c9955c19f456d8ab4806ae38fe0bfa5f1',
      constructionOwnership: false,
    });
    expect(shaft.exactCellSets.westEmergencyStairReservation.cellCount
      + shaft.exactCellSets.innerLiftCoreReservation.cellCount
      + shaft.exactCellSets.eastServiceChaseReservation.cellCount)
      .toBe(shaft.exactCellSets.excavationReservation.cellCount);

    const audit = shaft.snapshotAndIntersectionAudit;
    expect(audit.generatedStructureExcavationIntersections).toHaveLength(1);
    expect(audit.generatedStructureExcavationIntersections[0]).toMatchObject({
      subjectId: 'minecraft:mineshaft@135,-26#27',
      intersection: { cellCount: 217 },
    });
    expect(audit.protectedCoreIntersections).toEqual([]);
    expect(audit.unreviewedOneCellBufferCandidateIntersections).toEqual([]);
    expect(audit.blockEntityIntersections).toEqual([]);
    expect(audit.immutableInteractionStateCensus).toMatchObject({
      waterCellCount: 90,
      waterloggedCellCount: 2,
      lavaCellCount: 0,
    });
  });

  it('freezes a rail-buildable B08 candidate through every anchor and keeps review open', () => {
    const service = readReport().serviceTunnelCenterline;
    expect(service).toMatchObject({
      blockerId: 'P1-B08-SERVICE-TUNNEL-CENTERLINE',
      status: 'PARTIAL_PASS_EXACT_RAIL_BUILDABLE_CANDIDATE_B08_REVIEW_HOLD',
      disposition: { blockerClosed: false },
    });
    expect(service.centerline).toMatchObject({
      pointCount: 221,
      horizontalStepCount: 220,
      contactAnchorIndex: 120,
      curveIndices: [60, 180],
    });
    expect(service.centerline.orderedSha256)
      .toBe(orderedCenterlineHash(service.centerline.points));
    expect(service.centerline.orderedSha256)
      .toBe('822293ad9f30cabf7211fe652c8a15ef6e6afae2943775c01861afa4f33a9903');
    expect(service.railConstraintAudit).toMatchObject({
      connectedCardinalStepCount: 220,
      ascendingStepCount: 58,
      levelStepCount: 162,
      descendingStepCount: 0,
      maximumAbsoluteRisePerHorizontalStep: 1,
      maximumGrade: '1:1',
      everyStepCardinalAndRailBuildable: true,
      everyCurveLevel: true,
      contactAnchorStraightAndLevel: true,
    });
    expect(service.poweredRailSchedule).toMatchObject({
      poweredRailCellSet: {
        cellCount: 34,
        coordinateSetSha256: 'b8ee82ad2a21f174981d4e520a8a807b646239f634dadbe23f3748b396c17ac1',
      },
      curvePoweredRailCount: 0,
    });
    expect(service.poweredRailSchedule.orderedIndices).not.toContain(60);
    expect(service.poweredRailSchedule.orderedIndices).not.toContain(180);
    expect(service.exactCellSets.excavationReservation).toMatchObject({
      cellCount: 7_878,
      coordinateSetSha256: '967a9ddd39775cfc4cbc851fd51abc4726a1e20ab632b433b45d386393254882',
      constructionOwnership: false,
    });
    const audit = service.snapshotAndIntersectionAudit;
    expect(audit.generatedStructureExcavationIntersections).toEqual([]);
    expect(audit.protectedCoreIntersections).toEqual([]);
    expect(audit.unreviewedOneCellBufferCandidateIntersections).toEqual([]);
    expect(audit.blockEntityIntersections).toEqual([]);
    expect(audit.immutableInteractionStateCensus).toMatchObject({
      waterCellCount: 0,
      waterloggedCellCount: 0,
      lavaCellCount: 0,
    });
  });

  it('compares both B09 faces but refuses to infer the missing future mountain', () => {
    const funicular = readReport().funicularFaceComparison;
    expect(funicular).toMatchObject({
      blockerId: 'P1-B09-FUNICULAR-CENTERLINE',
      status: 'PARTIAL_PASS_READ_ONLY_EAST_WEST_PROFILE_B09_FACE_SELECTION_HOLD',
      faceSelection: null,
      minimumRailGeometry: { transformedRiseBlocks: 174 },
      comparison: { existingTerrainCanProveFutureMountainFace: false },
      disposition: {
        exactRailCenterlineFrozen: false,
        blockerClosed: false,
      },
    });
    expect(funicular.immutableEndpointSurfaceComparison).toMatchObject({
      portal: { designMinusSurfaceY: 47 },
      summit: { designMinusSurfaceY: 223 },
    });
    expect(funicular.candidates.map((candidate) => ({
      id: candidate.id,
      horizontalStepCount: candidate.horizontalStepCount,
      orderedSampleCount: candidate.orderedSampleCount,
      protectedRelicIntersections: candidate.protectedRelicPlanIntersections.length,
    }))).toEqual([
      {
        id: 'east-envelope-edge-profile',
        horizontalStepCount: 878,
        orderedSampleCount: 879,
        protectedRelicIntersections: 0,
      },
      {
        id: 'west-envelope-edge-profile',
        horizontalStepCount: 880,
        orderedSampleCount: 881,
        protectedRelicIntersections: 0,
      },
    ]);
  });

  it('keeps every blocker held and emits no construction authority', () => {
    const report = readReport();
    expect(report.overallDisposition).toEqual(expect.objectContaining({
      blockerIdsClosed: [],
      blockersRemainingHold: [
        'P1-B07-PUBLIC-SHAFT-DOGLEG',
        'P1-B08-SERVICE-TUNNEL-CENTERLINE',
        'P1-B09-FUNICULAR-CENTERLINE',
      ],
    }));
    expect(report.operationCellCount).toBe(0);
    expect(report.materialCellCount).toBe(0);
    expect(report.worldEditAuthorized).toBe(false);
    expect(report.constructionOwnershipAuthorized).toBe(false);
  });
});
