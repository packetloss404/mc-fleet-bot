import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const GENERATED_AT = '2026-08-04T15:56:00Z';
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-c1-pilot-coordination.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-c1-pilot-coordination.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-c1-pilot-'));
const regeneratedJson = path.join(tempDir, 'coordination.json');
const regeneratedMarkdown = path.join(tempDir, 'coordination.md');

interface Gate {
  id: string;
  status: string;
  basis: string;
}

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  authority: {
    offlineOnly: boolean;
    worldEditAuthorized: boolean;
    constructionPackageExists: boolean;
  };
  candidate: {
    id: string;
    sourceSampleRangeInclusive: { start: number; end: number };
    chainage: { start: number; end: number; length: number };
    outsideDeclaredPhase0Atlas: boolean;
  };
  integerSetout: {
    referenceCenterline: {
      pointCount: number;
      bounds: Record<string, number>;
      cellSetSha256: string;
      points: Array<{ x: number; y: number; z: number }>;
    };
    verticalChanges: {
      minimumHorizontalRunBetweenChanges: number;
      maximumAbsoluteSingleChange: number;
    };
    reservedRailCenterlines: {
      staging: string;
      trackConstructionAuthorized: boolean;
      zCoordinates: number[];
      pointCount: number;
    };
    independentHighwayProfile: null;
  };
  exactPlanCoordination: {
    sets: Record<string, {
      bounds: Record<string, number>;
      columnCount: number;
      columnSetSha256: string;
    }>;
    physicalTargetCellSet: null;
    interactionCellSet: null;
  };
  immutableSnapshotCensus: {
    touchedChunkCount: number;
    allTouchedChunksFull: boolean;
    columns: number;
    terrain: { minY: number; maxY: number; biomeCounts: Record<string, number> };
    fluids: {
      surfaceWaterColumns: number;
      surfaceLavaColumns: number;
      waterCells: number;
      lavaCells: number;
      groundToRailDatumSpan: { waterCells: number; lavaCells: number };
      hydrologyDesignComplete: boolean;
    };
    naturalAndOrganicFeatures: {
      sensitiveBlockCounts: Record<string, number>;
      organicCellsInGroundToRailDatumSpan: number;
      preservationAndClearancePolicyFrozen: boolean;
    };
    crossSectionAgainstRailDatum: {
      maximumObservedCutBlocks: number;
      maximumObservedFillBlocks: number;
    };
    blockEntities: { count: number; records: Array<{ id: string }> };
    generatedStructures: { completeClearance: boolean };
  };
  gates: Gate[];
  decision: {
    sequencingBoundary: {
      prerequisiteReleaseId: string;
      requiresAcceptedR00: boolean;
      resolvesD02: boolean;
      resolvesG02: boolean;
      requiredBeforeReleaseId: string;
      validationRole: string;
    };
    coordinationEnvelopeMayBeFrozen: boolean;
    reservedRailSetoutMayBeFrozenForCoordination: boolean;
    independentHighwayProfileFrozen: boolean;
    physicalPilotTargetCellSetMayBeFrozen: boolean;
    operationCellCount: number;
    operationsEmitted: boolean;
    phase1R01Status: string;
    liveBuildMayProceed: boolean;
  };
}

function readReport(filename: string): Report {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as Report;
}

function gate(report: Report, id: string): Gate {
  const found = report.gates.find((candidate) => candidate.id === id);
  if (!found) throw new Error(`missing gate ${id}`);
  return found;
}

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      'scripts/audit_combined_zones_c1_pilot.mjs',
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

describe('Combined Zones bounded C1 pilot coordination', () => {
  it('regenerates both committed evidence artifacts exactly', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
  });

  it('freezes only the exact x=814..878, z=32..111 coordination envelope', () => {
    const report = readReport(COMMITTED_JSON);

    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-c1-pilot-coordination',
      status: 'COORDINATION_CANDIDATE_FROZEN_PHYSICAL_PILOT_HOLD',
      authority: {
        offlineOnly: true,
        worldEditAuthorized: false,
        constructionPackageExists: false,
      },
      candidate: {
        id: 'C1-R01-TANGENT-A-S24-S28',
        sourceSampleRangeInclusive: { start: 24, end: 28 },
        chainage: { start: 384, end: 448, length: 64 },
        outsideDeclaredPhase0Atlas: true,
      },
    });

    expect(report.exactPlanCoordination.sets.totalLandTake).toMatchObject({
      bounds: { minX: 814, maxX: 878, minZ: 32, maxZ: 111 },
      columnCount: 5200,
    });
    expect(report.exactPlanCoordination.sets.reservation).toMatchObject({
      bounds: { minX: 814, maxX: 878, minZ: 44, maxZ: 99 },
      columnCount: 3640,
    });
    expect(report.exactPlanCoordination.sets.reservedRailStrip).toMatchObject({
      bounds: { minX: 814, maxX: 878, minZ: 50, maxZ: 62 },
      columnCount: 845,
    });
    expect(report.exactPlanCoordination.physicalTargetCellSet).toBeNull();
    expect(report.exactPlanCoordination.interactionCellSet).toBeNull();
  });

  it('sets out the dry sampled rail span deterministically without inventing a highway profile', () => {
    const report = readReport(COMMITTED_JSON);

    expect(report.integerSetout.referenceCenterline).toMatchObject({
      pointCount: 65,
      bounds: { minX: 814, maxX: 878, minY: 109, maxY: 113, minZ: 80, maxZ: 80 },
    });
    expect(report.integerSetout.referenceCenterline.points[0]).toEqual({ x: 814, y: 113, z: 80 });
    expect(report.integerSetout.referenceCenterline.points.at(-1)).toEqual({ x: 878, y: 110, z: 80 });
    expect(report.integerSetout.verticalChanges).toMatchObject({
      minimumHorizontalRunBetweenChanges: 8,
      maximumAbsoluteSingleChange: 1,
    });
    expect(report.integerSetout.reservedRailCenterlines).toEqual(expect.objectContaining({
      staging: 'RESERVE_FIRST_FULLY_CLEAR_SPANNED_RAIL_STRIP',
      trackConstructionAuthorized: false,
      zCoordinates: [52, 56],
      pointCount: 130,
    }));
    expect(report.integerSetout.independentHighwayProfile).toBeNull();
  });

  it('records the exact snapshot blockers and keeps every physical result on HOLD', () => {
    const report = readReport(COMMITTED_JSON);
    const census = report.immutableSnapshotCensus;

    expect(census).toMatchObject({
      touchedChunkCount: 25,
      allTouchedChunksFull: true,
      columns: 5200,
      terrain: {
        minY: 92,
        maxY: 127,
        biomeCounts: { 'minecraft:pale_garden': 4844 },
      },
      fluids: {
        surfaceWaterColumns: 0,
        surfaceLavaColumns: 0,
        waterCells: 2671,
        lavaCells: 126,
        groundToRailDatumSpan: { waterCells: 0, lavaCells: 0 },
        hydrologyDesignComplete: false,
      },
      naturalAndOrganicFeatures: {
        sensitiveBlockCounts: { 'minecraft:creaking_heart': 2 },
        organicCellsInGroundToRailDatumSpan: 3115,
        preservationAndClearancePolicyFrozen: false,
      },
      crossSectionAgainstRailDatum: {
        maximumObservedCutBlocks: 17,
        maximumObservedFillBlocks: 17,
      },
      blockEntities: { count: 6 },
      generatedStructures: { completeClearance: false },
    });

    expect(census.blockEntities.records.filter(({ id }) => id === 'minecraft:mob_spawner')).toHaveLength(2);
    expect(gate(report, 'limited-fluid-observation').status).toBe('PASS_LIMITED');
    expect(gate(report, 'pale-garden-and-live-entity-clearance').status).toBe('HOLD');
    expect(gate(report, 'block-entity-and-dungeon-clearance').status).toBe('HOLD');
    expect(gate(report, 'hydrology-and-drainage-design').status).toBe('HOLD');
    expect(gate(report, 'ownership-and-interface-contracts').status).toBe('HOLD');
  });

  it('emits zero operations and cannot advance R01', () => {
    const report = readReport(COMMITTED_JSON);

    expect(report.decision).toEqual({
      sequencingBoundary: {
        prerequisiteReleaseId: 'CZ-R00-PHASE1-DESIGN-FREEZE',
        requiresAcceptedR00: true,
        resolvesD02: false,
        resolvesG02: false,
        requiredBeforeReleaseId: 'CZ-R02-PHASE2-EMPTY-EIGHT-DEEP-SHELL',
        validationRole: 'POST_R00_VALIDATION_NOT_D02_OR_G02_CLOSURE_EVIDENCE',
      },
      coordinationEnvelopeMayBeFrozen: true,
      reservedRailSetoutMayBeFrozenForCoordination: true,
      independentHighwayProfileFrozen: false,
      physicalPilotTargetCellSetMayBeFrozen: false,
      operationCellCount: 0,
      operationsEmitted: false,
      phase1R01Status: 'HOLD',
      liveBuildMayProceed: false,
    });
  });
});
