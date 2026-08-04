import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const GENERATED_AT = '2026-08-04T04:30:00.000Z';
const COMMITTED = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-geometry-coordination.json',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-phase1-geometry-'));
const regeneratedPath = path.join(tempDir, 'phase1-geometry-coordination.json');

interface Bounds {
  minXInclusive: number;
  maxXExclusive: number;
  minYInclusive: number;
  maxYExclusive: number;
  minZInclusive: number;
  maxZExclusive: number;
}

interface CoordinationBox {
  id: string;
  sourceSemantics: string;
  exactCoordinationCellSet: {
    bounds: Bounds;
    dimensions: { x: number; y: number; z: number };
    cellCount: number;
    purpose: string;
  };
}

interface Report {
  schemaVersion: number;
  id: string;
  generatedAtUtc: string;
  status: string;
  authority: {
    role: string;
    offlineOnly: boolean;
    worldEditAuthorized: boolean;
    constructionPackageExists: boolean;
  };
  sourceBindings: Array<{ id: string; path: string; sha256: string }>;
  coordinateContract: {
    topDown: {
      rotationDegrees: number;
      localOriginInWorld: { x: number; y: number; z: number };
    };
    vertical: {
      belowOrAtStreet: { formula: string };
      aboveOrAtStreet: { formula: string };
      pointRounding: string;
      lowerBoundaryRounding: string;
      upperExclusiveBoundaryRounding: string;
      nullYRule: string;
      activeForBuild: boolean;
    };
    scopeSemantics: {
      normalized04Envelopes: string;
      emptyEight: string;
    };
  };
  decisions: Array<{ id: string; status: string }>;
  compiledCoordinationGeometry: {
    operationCellCount: number;
    materialCellCount: number;
    normalized04EnvelopeCellSets: CoordinationBox[];
    emptyEightShellCoordinationCellSet: {
      sourceSemantics: string;
      bounds: Bounds;
      dimensions: { x: number; y: number; z: number };
      cellCount: number;
    };
    normalizedChildGeometry: {
      masterplan01: { status: string; blockerIds: string[] };
      masterplan02: {
        status: string;
        pillarCoordinateCounts: {
          xValues: number;
          zValues: number;
          cartesianIntersections: number;
          declaredEstimateMin: number;
          declaredEstimateMax: number;
        };
        blockerIds: string[];
      };
      masterplan03: {
        status: string;
        childToNormalized04: Record<string, string | number | boolean>;
        proof: Record<string, unknown>;
        unresolved: string[];
      };
    };
    transformedInterfaceAnchors: Array<{
      id: string;
      compiled: {
        exact: { x: number; y: { expression: string; decimal: number }; z: number };
        setout: { x: number; y: number; z: number };
      };
    }>;
  };
  centerlineCoordination: {
    publicShaft: { status: string; blockerId: string };
    serviceTunnel: {
      status: string;
      totalHorizontalEuclidean: number;
      sourceClaimedLengthBlocks: number;
      blockerId: string;
    };
    funicular: {
      status: string;
      direct: { horizontalEuclidean: number; absoluteRise: number };
      minimumHorizontalRunAtAbsoluteMaximumRailGrade: number;
      faceSelection: null;
      intermediatePoints: unknown[];
      candidateFamiliesForSurveyOnly: string[];
      blockerId: string;
    };
  };
  blockerMatrix: Array<{
    id: string;
    status: string;
    conservativeDefault: string;
    closureEvidenceRequired: string;
  }>;
  gates: {
    sourceHashesMatch: boolean;
    perScopeBoundSemanticsFrozen: boolean;
    operationCompilationAllowed: boolean;
    worldEditAuthorized: boolean;
    passed: boolean;
  };
}

function readReport(filename: string): Report {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as Report;
}

function sha256(filename: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function box(report: Report, id: string): CoordinationBox {
  const result = report.compiledCoordinationGeometry.normalized04EnvelopeCellSets
    .find((candidate) => candidate.id === id);
  if (!result) throw new Error(`missing coordination box ${id}`);
  return result;
}

function anchor(report: Report, id: string) {
  const result = report.compiledCoordinationGeometry.transformedInterfaceAnchors
    .find((candidate) => candidate.id === id);
  if (!result) throw new Error(`missing transformed anchor ${id}`);
  return result;
}

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      'scripts/compile_combined_zones_phase1_geometry.mjs',
      '--out',
      regeneratedPath,
      '--generated-at',
      GENERATED_AT,
    ],
    { cwd: ROOT, stdio: 'pipe' },
  );
});

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones Phase 1 geometry coordination', () => {
  it('regenerates the committed artifact exactly from hash-bound authority inputs', () => {
    const committed = readReport(COMMITTED);
    const regenerated = readReport(regeneratedPath);

    expect(regenerated).toEqual(committed);
    expect(committed).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-geometry-coordination',
      generatedAtUtc: GENERATED_AT,
      status: 'PHASE1_COORDINATION_PARTIAL_PASS_OPERATION_COMPILATION_BLOCKED',
      authority: {
        role: 'derived-phase1-coordination-not-a-successor-authority-and-not-a-build-package',
        offlineOnly: true,
        worldEditAuthorized: false,
        constructionPackageExists: false,
      },
    });

    expect(committed.sourceBindings.map(({ id }) => id)).toEqual([
      'child01',
      'child02',
      'child03',
      'normalized04',
      'contractor04',
      'reconciliation',
      'registry05',
      'phase0Evidence',
    ]);
    for (const binding of committed.sourceBindings) {
      expect(binding.sha256, binding.path).toBe(sha256(path.join(ROOT, binding.path)));
    }
  });

  it('freezes per-scope boundary semantics without turning planning envelopes into operations', () => {
    const report = readReport(COMMITTED);

    expect(report.coordinateContract.scopeSemantics).toEqual({
      normalized04Envelopes: 'continuous-boundary-planes-min-inclusive-max-exclusive',
      emptyEight: 'inclusive-integer-block-centers-converted-to-half-open-storage',
      allOtherPublished05Bounds: 'planning-references-until-explicitly-classified-by-a-successor-scope-record',
    });
    expect(box(report, 'houston-city').exactCoordinationCellSet).toMatchObject({
      bounds: {
        minXInclusive: 1979,
        maxXExclusive: 2117,
        minYInclusive: 72,
        maxYExclusive: 96,
        minZInclusive: -397,
        maxZExclusive: -259,
      },
      dimensions: { x: 138, y: 24, z: 138 },
      cellCount: 457056,
      purpose: 'ownership-and-fit-coordination-only-not-a-material-or-operation-set',
    });
    expect(box(report, 'subtropolis').exactCoordinationCellSet).toMatchObject({
      dimensions: { x: 200, y: 128, z: 200 },
      cellCount: 5120000,
    });
    expect(box(report, 'continuous-mountain').exactCoordinationCellSet).toMatchObject({
      dimensions: { x: 800, y: 232, z: 600 },
      cellCount: 111360000,
    });
    expect(box(report, 'cheyenne-chamber').exactCoordinationCellSet).toMatchObject({
      bounds: { minYInclusive: 144, maxYExclusive: 188 },
      dimensions: { x: 80, y: 44, z: 80 },
      cellCount: 281600,
    });

    expect(report.compiledCoordinationGeometry.emptyEightShellCoordinationCellSet)
      .toMatchObject({
        sourceSemantics: 'inclusive-integer-block-centers',
        bounds: {
          minXInclusive: 1632,
          maxXExclusive: 1873,
          minYInclusive: 38,
          maxYExclusive: 55,
          minZInclusive: 40,
          maxZExclusive: 161,
        },
        dimensions: { x: 241, y: 17, z: 121 },
        cellCount: 495737,
      });
    expect(report.compiledCoordinationGeometry).toMatchObject({
      operationCellCount: 0,
      materialCellCount: 0,
    });
  });

  it('uses exact rational vertical mapping and deterministic setout rounding', () => {
    const report = readReport(COMMITTED);

    expect(report.coordinateContract.topDown).toMatchObject({
      rotationDegrees: 0,
      localOriginInWorld: { x: 2048, y: 72, z: -328 },
    });
    expect(report.coordinateContract.vertical).toMatchObject({
      belowOrAtStreet: { formula: 'worldY = 72 + (32/25) * localY' },
      aboveOrAtStreet: { formula: 'worldY = 72 + (29/100) * localY' },
      pointRounding: 'nearest-integer-ties-to-positive-infinity',
      lowerBoundaryRounding: 'floor',
      upperExclusiveBoundaryRounding: 'ceiling',
      nullYRule: 'fail-closed-never-substitute-surveyed-terrain',
      activeForBuild: false,
    });
    expect(anchor(report, 'public-shaft-observation-landing').compiled).toMatchObject({
      exact: { x: 2108, y: { expression: '8/1', decimal: 8 }, z: -398 },
      setout: { x: 2108, y: 8, z: -398 },
    });
    expect(anchor(report, 'cheyenne-chamber-center').compiled).toMatchObject({
      exact: { x: 2048, y: { expression: '665/4', decimal: 166.25 }, z: -868 },
      setout: { x: 2048, y: 166, z: -868 },
    });
  });

  it('normalizes only explicit Houston geometry and holds conflicting child placements', () => {
    const report = readReport(COMMITTED);
    const children = report.compiledCoordinationGeometry.normalizedChildGeometry;

    expect(children.masterplan03).toMatchObject({
      status: 'FROZEN_FOR_NAMED_AND_EXPLICIT_03_GEOMETRY',
      childToNormalized04: {
        localX: 'childX - 69',
        localY: 'childY - 64',
        localZ: 'childZ + 69',
        rotationDegrees: 0,
        reflection: false,
      },
      proof: {
        childStreetY: 64,
        normalizedStreetY: 0,
        childTunnelFloorY: 58,
        normalizedTunnelFloorY: -6,
      },
    });
    expect(children.masterplan03.unresolved).toHaveLength(3);
    expect(children.masterplan01.status).toBe('BLOCKED_EXACT_CANDIDATES_ONLY');
    expect(children.masterplan02).toMatchObject({
      status: 'BLOCKED_TRANSFORM_AND_INSTANCE_REGISTRY_REQUIRED',
      pillarCoordinateCounts: {
        xValues: 7,
        zValues: 5,
        cartesianIntersections: 35,
        declaredEstimateMin: 60,
        declaredEstimateMax: 80,
      },
    });
  });

  it('keeps unresolved centerlines on HOLD with exact closure requirements', () => {
    const report = readReport(COMMITTED);

    expect(report.centerlineCoordination.publicShaft).toMatchObject({
      status: 'ANCHORS_FROZEN_CENTERLINE_BLOCKED',
      blockerId: 'P1-B07-PUBLIC-SHAFT-DOGLEG',
    });
    expect(report.centerlineCoordination.serviceTunnel).toMatchObject({
      status: 'THREE_ANCHOR_CONTROL_POLYLINE_ONLY',
      totalHorizontalEuclidean: 156.96384,
      sourceClaimedLengthBlocks: 120,
      blockerId: 'P1-B08-SERVICE-TUNNEL-CENTERLINE',
    });
    expect(report.centerlineCoordination.funicular).toMatchObject({
      status: 'ENDPOINTS_FROZEN_CENTERLINE_HOLD',
      direct: { horizontalEuclidean: 80, absoluteRise: 174 },
      minimumHorizontalRunAtAbsoluteMaximumRailGrade: 174,
      faceSelection: null,
      intermediatePoints: [],
      candidateFamiliesForSurveyOnly: [
        'east-face-switchback',
        'west-face-switchback',
      ],
      blockerId: 'P1-B09-FUNICULAR-CENTERLINE',
    });

    expect(report.blockerMatrix.map(({ id }) => id)).toEqual([
      'P1-B01-VERTICAL-AUTHORITY-ACTIVATION',
      'P1-B02-CHEYENNE-INTERNAL-FIT',
      'P1-B03-CHEYENNE-JCURVE',
      'P1-B04-SUBTROPOLIS-NORMALIZATION',
      'P1-B05-SUBTROPOLIS-PILLARS',
      'P1-B06-HOUSTON-GENERIC-PLACEMENT',
      'P1-B07-PUBLIC-SHAFT-DOGLEG',
      'P1-B08-SERVICE-TUNNEL-CENTERLINE',
      'P1-B09-FUNICULAR-CENTERLINE',
      'P1-B10-MOUNTAIN-SOLID-AND-RELIC-VOIDS',
      'P1-B11-EXTERNAL-INTERFACES',
    ]);
    for (const blocker of report.blockerMatrix) {
      expect(blocker.status, blocker.id).toMatch(/^BLOCKING_/);
      expect(blocker.conservativeDefault, blocker.id).not.toBe('');
      expect(blocker.closureEvidenceRequired, blocker.id).not.toBe('');
    }
  });

  it('passes coordination QA while denying operation compilation and world edits', () => {
    const report = readReport(COMMITTED);

    expect(report.gates).toEqual({
      sourceHashesMatch: true,
      authorityChainMatch: true,
      topDownTransformExact: true,
      verticalRationalsExact: true,
      perScopeBoundSemanticsFrozen: true,
      operationCompilationAllowed: false,
      worldEditAuthorized: false,
      passed: true,
      interpretation: 'PASS means the coordination artifact is internally exact and fail-closed; it does not mean the build is construction-ready.',
    });
    expect(report.decisions.find(({ id }) => id === 'P1-D05-FUNICULAR-HOLD'))
      .toMatchObject({ status: 'HOLD_NO_EXACT_PLACEMENT_INFERRED' });
  });
});
