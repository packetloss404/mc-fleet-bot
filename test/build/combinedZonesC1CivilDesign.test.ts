import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const GENERATED_AT = '2026-08-04T16:22:57Z';
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-c1-civil-design.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-c1-civil-'));
const regeneratedJson = path.join(tempDir, 'civil-design.json');
const regeneratedMarkdown = path.join(tempDir, 'civil-design.md');

interface Point {
  x: number;
  y?: number;
  z: number;
}

interface CivilDesign {
  schemaVersion: number;
  id: string;
  status: string;
  offlineSafetyBoundary: {
    localInputsOnly: boolean;
    immutableCopiedAnvilOnly: boolean;
    liveCallsPerformed: unknown[];
    operationCells: unknown[];
    materialCells: unknown[];
    worldEditAuthorized: boolean;
    physicalBuildAuthorized: boolean;
  };
  sourceBindings: Array<{ path: string; sha256: string }>;
  immutableSnapshot: {
    sha256: string;
    regionFileCount: number;
    bytes: number;
  };
  horizontalAlignment: {
    method: string;
    authoredCurveStaircaseIntent: string;
    curves: Array<{
      id: string;
      radiusBlocks: number;
      rasterPointCount: number;
      rasterColumnSetSha256: string;
    }>;
    referencePointCount: number;
    referenceRasterTraversalLengthBlocks: number;
    continuousFilletLengthBlocks: number;
    referenceCenterlineColumnSetSha256: string;
    endpoints: { start: Point; end: Point };
    stations: Array<Point & {
      station: number;
      railFormationY: number;
      highwayReferenceY: number;
      highwayNorthEdgeY: number;
      highwaySouthEdgeY: number;
    }>;
  };
  verticalProfiles: {
    rail: {
      maximumStepGrade: number;
      minimumRunBetweenChanges: number;
      startY: number;
      endY: number;
      profileSha256: string;
    };
    highway: {
      independentFromRail: boolean;
      maximumStepGrade: number;
      minimumRunBetweenChanges: number;
      startY: number;
      endY: number;
      profileSha256: string;
    };
  };
  crossSection: {
    reservation: { offsetFrom: number; offsetTo: number; uniqueColumnCount: number };
    totalLandTake: { offsetFrom: number; offsetTo: number; uniqueColumnCount: number };
    reservedRailStrip: {
      offsetFrom: number;
      offsetTo: number;
      widthOffsetsInclusive: number;
      staging: string;
      materialCells: unknown[];
    };
    track1Eastbound: { offset: number; pointCount: number; points: Point[] };
    track2Westbound: { offset: number; pointCount: number; points: Point[] };
    highway: {
      offsetsInclusive: number[];
      singleSouthwardCrossfall: Array<{ adjustmentFromReferenceY: number }>;
    };
  };
  diagnosticEarthworkVolumes: {
    units: string;
    highway: { cutColumnBlocks: number; fillColumnBlocks: number };
    railStrip: { cutColumnBlocks: number; fillColumnBlocks: number };
    totalLandTakeDatum: { cutColumnBlocks: number; fillColumnBlocks: number };
  };
  drainage: { status: string; approvedOutfalls: unknown[] };
  interfaces: {
    c01: Array<{
      feature: string;
      exactLandTakeOverlapColumnCount: number;
      minimumSurfaceDatumSeparationAboveFeatureTop: number | null;
      structuralLoadingAcceptance: boolean;
      ownershipStatus: string;
    }>;
    dataDistrictCrossroad: {
      railStripWidthOffsetsInclusive: number;
      pierOrMaterialCellsInsideRailStrip: unknown[];
      status: string;
    };
  };
  decisionD02: {
    status: string;
    blockers: Array<{ id: string }>;
    resolutionBoundary: {
      scope: string;
      requiresPhysicalPilot: boolean;
      requiresForwardRollbackOperations: boolean;
      requiresPostStateQa: boolean;
    };
    subsequentReleaseValidation: {
      releaseId: string;
      prerequisiteReleaseId: string;
      requiredBeforeReleaseId: string;
      validationRole: string;
    };
  };
  finalGate: { status: string; worldEditAuthorized: boolean };
}

function readReport(filename: string): CivilDesign {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as CivilDesign;
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
      'scripts/compile_combined_zones_c1_civil_design.mjs',
      '--out', regeneratedJson,
      '--markdown', regeneratedMarkdown,
      '--generated-at', GENERATED_AT,
    ],
    { cwd: ROOT, stdio: 'pipe' },
  );
}, 30_000);

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones exact C1 civil design', () => {
  it('regenerates the committed JSON and Markdown byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
  });

  it('binds the immutable inputs and freezes a contiguous exact-radius C1 setout', () => {
    const report = readReport(COMMITTED_JSON);

    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-c1-civil-design',
      status: 'PARTIAL_PASS_D02_HOLD',
      immutableSnapshot: {
        sha256: '05eebe12ba419abd75b80033c265daf452b652a575c912f6df497735e00d271b',
        regionFileCount: 51,
        bytes: 290946492,
      },
    });
    for (const binding of report.sourceBindings) {
      expect(sha256File(binding.path)).toBe(binding.sha256);
    }
    expect(report.horizontalAlignment.curves.map((curve) => [curve.id, curve.radiusBlocks]))
      .toEqual([['PI-1', 140], ['PI-2', 120], ['PI-3', 140]]);
    expect(report.horizontalAlignment.authoredCurveStaircaseIntent)
      .toBe('spiral-arc-spiral staircase 1:16 -> 1:12 -> 1:8 -> 1:6 -> 1:8 -> 1:12 -> 1:16');
    expect(report.horizontalAlignment.endpoints).toEqual({
      start: { x: 430, z: 80 },
      end: { x: 1550, z: -250 },
    });
    expect(report.horizontalAlignment.referencePointCount)
      .toBe(report.horizontalAlignment.stations.length);
    expect(report.horizontalAlignment.continuousFilletLengthBlocks).toBeLessThan(1244.303);

    report.horizontalAlignment.stations.slice(1).forEach((point, index) => {
      const previous = report.horizontalAlignment.stations[index];
      expect(Math.abs(point.x - previous.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(point.z - previous.z)).toBeLessThanOrEqual(1);
      expect(point.station).toBe(index + 1);
    });
  });

  it('freezes independent grade-constrained rail and highway profiles', () => {
    const report = readReport(COMMITTED_JSON);
    const stations = report.horizontalAlignment.stations;
    const rail = stations.map((station) => station.railFormationY);
    const highway = stations.map((station) => station.highwayReferenceY);

    expect(report.verticalProfiles.rail).toMatchObject({
      startY: 68,
      endY: 68,
      minimumRunBetweenChanges: 8,
      maximumStepGrade: 0.125,
    });
    expect(report.verticalProfiles.highway).toMatchObject({
      independentFromRail: true,
      startY: 68,
      endY: 68,
      minimumRunBetweenChanges: 12,
      maximumStepGrade: 0.083333,
    });
    expect(highway).not.toEqual(rail);
    expect(sha256FileFromString(`${rail.join(',')}\n`))
      .toBe(report.verticalProfiles.rail.profileSha256);
    expect(sha256FileFromString(`${highway.join(',')}\n`))
      .toBe(report.verticalProfiles.highway.profileSha256);
    expect(stations.every((station) => (
      station.highwayNorthEdgeY === station.highwayReferenceY + 1
      && station.highwaySouthEdgeY === station.highwayReferenceY - 1
    ))).toBe(true);
  });

  it('preserves the empty 13-block D04 strip and evaluates C01 interfaces fail-closed', () => {
    const report = readReport(COMMITTED_JSON);

    expect(report.crossSection.reservation).toMatchObject({ offsetFrom: -36, offsetTo: 19 });
    expect(report.crossSection.totalLandTake).toMatchObject({ offsetFrom: -48, offsetTo: 31 });
    expect(report.crossSection.reservedRailStrip).toEqual(expect.objectContaining({
      offsetFrom: -30,
      offsetTo: -18,
      widthOffsetsInclusive: 13,
      staging: 'EMPTY_RESERVE_FIRST',
      materialCells: [],
    }));
    expect(report.crossSection.track1Eastbound.offset).toBe(-28);
    expect(report.crossSection.track2Westbound.offset).toBe(-24);
    expect(report.crossSection.track1Eastbound.pointCount)
      .toBe(report.horizontalAlignment.referencePointCount);
    expect(report.crossSection.track2Westbound.pointCount)
      .toBe(report.horizontalAlignment.referencePointCount);
    expect(report.crossSection.highway.offsetsInclusive).toEqual([-14, 14]);
    expect(report.crossSection.highway.singleSouthwardCrossfall
      .map((band) => band.adjustmentFromReferenceY)).toEqual([1, 0, -1]);

    const ownerTunnel = report.interfaces.c01.find((item) => (
      item.feature === 'C01 Owner Tunnel Detour'
    ));
    expect(ownerTunnel).toEqual(expect.objectContaining({
      exactLandTakeOverlapColumnCount: 7803,
      minimumSurfaceDatumSeparationAboveFeatureTop: 105,
      structuralLoadingAcceptance: false,
      ownershipStatus: 'HOLD_CONTESTED_ISSUE_002',
    }));
    expect(report.interfaces.c01.every((item) => (
      !item.structuralLoadingAcceptance && item.ownershipStatus === 'HOLD_CONTESTED_ISSUE_002'
    ))).toBe(true);
    expect(report.interfaces.dataDistrictCrossroad).toEqual(expect.objectContaining({
      railStripWidthOffsetsInclusive: 13,
      pierOrMaterialCellsInsideRailStrip: [],
      status: 'COORDINATION_ENVELOPE_PASS_STRUCTURAL_DESIGN_HOLD',
    }));
  });

  it('reports diagnostic quantities and all unresolved D02 blockers without authorizing edits', () => {
    const report = readReport(COMMITTED_JSON);

    expect(report.diagnosticEarthworkVolumes.units).toContain('coordination estimate only');
    for (const scope of [
      report.diagnosticEarthworkVolumes.highway,
      report.diagnosticEarthworkVolumes.railStrip,
      report.diagnosticEarthworkVolumes.totalLandTakeDatum,
    ]) {
      expect(scope.cutColumnBlocks).toBeGreaterThan(0);
      expect(scope.fillColumnBlocks).toBeGreaterThan(0);
    }
    expect(report.drainage).toMatchObject({
      status: 'COLLECTION_GEOMETRY_PASS_OUTFALL_HOLD',
      approvedOutfalls: [],
    });
    expect(report.decisionD02.status).toBe('PARTIAL_PASS_HOLD');
    expect(report.decisionD02.blockers.map((blocker) => blocker.id))
      .toEqual(['D02-B01', 'D02-B02', 'D02-B03', 'D02-B04', 'D02-B05', 'D02-B06']);
    expect(report.decisionD02.resolutionBoundary).toMatchObject({
      scope: 'PRE_R00_DESIGN_AND_EXTERNAL_ACCEPTANCE_ONLY',
      requiresPhysicalPilot: false,
      requiresForwardRollbackOperations: false,
      requiresPostStateQa: false,
    });
    expect(report.decisionD02.subsequentReleaseValidation).toEqual({
      releaseId: 'CZ-R01-PHASE1-BOUNDED-VISUAL-PILOT',
      prerequisiteReleaseId: 'CZ-R00-PHASE1-DESIGN-FREEZE',
      requiredBeforeReleaseId: 'CZ-R02-PHASE2-EMPTY-EIGHT-DEEP-SHELL',
      validationRole: 'POST_R00_VALIDATION_NOT_D02_OR_G02_CLOSURE_EVIDENCE',
    });
    expect(report.offlineSafetyBoundary).toEqual(expect.objectContaining({
      localInputsOnly: true,
      immutableCopiedAnvilOnly: true,
      liveCallsPerformed: [],
      operationCells: [],
      materialCells: [],
      worldEditAuthorized: false,
      physicalBuildAuthorized: false,
    }));
    expect(report.finalGate).toMatchObject({
      status: 'PARTIAL_PASS_D02_HOLD_NO_WORLD_EDITS',
      worldEditAuthorized: false,
    });
  });
});

function sha256FileFromString(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
