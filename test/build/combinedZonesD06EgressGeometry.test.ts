import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const GENERATED_AT = '2026-08-04T20:10:00Z';
const COMMITTED_JSON = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d06-egress-geometry-design.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d06-egress-geometry-design.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-d06-egress-'));
const regeneratedJson = path.join(tempDir, 'd06-egress.json');
const regeneratedMarkdown = path.join(tempDir, 'd06-egress.md');

interface EgressDesign {
  id: string;
  surveyedSurfaceEndpoint: {
    x: number;
    y: number;
    z: number;
    naturalTerrainY: number;
    biome: string;
    dry: boolean;
  };
  sevenBySevenSurfaceReview: {
    columnCount: number;
    minimumTerrainY: number;
    maximumTerrainY: number;
    reliefBlocks: number;
    waterColumnCount: number;
    lavaColumnCount: number;
    surfaceDry: boolean;
  };
  externalContinuationDesign: {
    bounds: Record<string, number>;
    cellCount: number;
    coordinateSetSha256: string;
    stairReservation: { cellCount: number; coordinateSetSha256: string };
    accessibleLiftReservation: { cellCount: number; coordinateSetSha256: string };
    routeGraph: { nodes: Array<{ id: string; x: number; y: number; z: number }> };
  };
  immutableSourceCensus: {
    cellCount: number;
    waterCellCount: number;
    lavaCellCount: number;
    structureIntersections: unknown[];
  };
  designGate: {
    status: string;
    physicalOpeningAuthorized: boolean;
    mechanismCommissioned: boolean;
  };
}

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  authority: {
    offlineOnly: boolean;
    executable: boolean;
    worldEditAuthorized: boolean;
    operationCellCount: number;
  };
  sourceBindings: Array<{ path: string; sha256: string; bytes: number }>;
  immutableSnapshot: {
    path: string;
    sha256: string;
    regionFileCount: number;
    bytes: number;
  };
  egressDesigns: EgressDesign[];
  independenceProof: {
    routeCount: number;
    horizontalSeparationBlocks: number;
    exactExternalContinuationSetsDisjoint: boolean;
    independentSurfaceEndpoints: boolean;
  };
  soleAuthorityRecommendations: {
    d06: Record<string, string>;
    geometry: Array<{ blockerId: string; recommendation: string; disposition: string }>;
  };
  remainingHoldGates: string[];
  releaseBoundary: {
    physicalOpeningAuthorized: boolean;
    operationsEmitted: boolean;
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
      'scripts/compile_combined_zones_d06_egress_geometry.mjs',
      '--generated-at', GENERATED_AT,
      '--out', regeneratedJson,
      '--markdown', regeneratedMarkdown,
    ],
    { cwd: ROOT, stdio: 'pipe' },
  );
});

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones D06 egress and geometry design', () => {
  it('regenerates the committed JSON and Markdown byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
  });

  it('binds the immutable survey and every current source exactly', () => {
    const report = readReport();
    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-d06-egress-geometry-design',
      status: 'PARTIAL_PASS_D06_SURFACE_ENDPOINTS_AND_ROUTE_RESERVATIONS_FROZEN',
      immutableSnapshot: {
        path: 'data/worldsnap-combined-zones-phase0-rerun-post-20260804T021358Z/region',
        sha256: '05eebe12ba419abd75b80033c265daf452b652a575c912f6df497735e00d271b',
        regionFileCount: 51,
        bytes: 290_946_492,
      },
    });
    expect(report.sourceBindings).toHaveLength(4);
    for (const source of report.sourceBindings) {
      const filename = path.join(ROOT, source.path);
      expect(fs.statSync(filename).size, source.path).toBe(source.bytes);
      expect(sha256File(filename), source.path).toBe(source.sha256);
    }
  });

  it('freezes two dry, structure-clear, independently routed surface endpoints', () => {
    const report = readReport();
    expect(report.egressDesigns.map((design) => ({
      id: design.id,
      endpoint: design.surveyedSurfaceEndpoint,
      review: design.sevenBySevenSurfaceReview,
      continuationCells: design.externalContinuationDesign.cellCount,
      stairCells: design.externalContinuationDesign.stairReservation.cellCount,
      liftCells: design.externalContinuationDesign.accessibleLiftReservation.cellCount,
    }))).toEqual([
      {
        id: 'EG-A',
        endpoint: expect.objectContaining({
          x: 1652,
          y: 80,
          z: 148,
          naturalTerrainY: 72,
          biome: 'minecraft:plains',
          dry: true,
        }),
        review: expect.objectContaining({
          columnCount: 49,
          minimumTerrainY: 66,
          maximumTerrainY: 79,
          reliefBlocks: 13,
          waterColumnCount: 0,
          lavaColumnCount: 0,
          surfaceDry: true,
        }),
        continuationCells: 1274,
        stairCells: 546,
        liftCells: 234,
      },
      {
        id: 'EG-B',
        endpoint: expect.objectContaining({
          x: 1852,
          y: 71,
          z: 148,
          naturalTerrainY: 62,
          biome: 'minecraft:plains',
          dry: true,
        }),
        review: expect.objectContaining({
          columnCount: 49,
          minimumTerrainY: 62,
          maximumTerrainY: 70,
          reliefBlocks: 8,
          waterColumnCount: 0,
          lavaColumnCount: 0,
          surfaceDry: true,
        }),
        continuationCells: 833,
        stairCells: 357,
        liftCells: 153,
      },
    ]);

    for (const design of report.egressDesigns) {
      expect(design.immutableSourceCensus).toMatchObject({
        cellCount: design.externalContinuationDesign.cellCount,
        waterCellCount: 0,
        lavaCellCount: 0,
        structureIntersections: [],
      });
      expect(design.designGate).toEqual({
        status: 'PASS_EXACT_DRY_SURFACE_ENDPOINT_AND_DISJOINT_ROUTE_RESERVATION',
        physicalOpeningAuthorized: false,
        mechanismCommissioned: false,
      });
      expect(design.externalContinuationDesign.coordinateSetSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(design.externalContinuationDesign.stairReservation.coordinateSetSha256)
        .toMatch(/^[a-f0-9]{64}$/);
      expect(design.externalContinuationDesign.accessibleLiftReservation.coordinateSetSha256)
        .toMatch(/^[a-f0-9]{64}$/);
    }
    expect(report.independenceProof).toEqual({
      routeCount: 2,
      horizontalSeparationBlocks: 193,
      exactExternalContinuationSetsDisjoint: true,
      independentSurfaceEndpoints: true,
    });
  });

  it('covers every geometry blocker with a conservative recommendation', () => {
    const report = readReport();
    expect(report.soleAuthorityRecommendations.geometry.map(({ blockerId }) => blockerId)).toEqual([
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
    expect(report.soleAuthorityRecommendations.geometry).toHaveLength(11);
    for (const item of report.soleAuthorityRecommendations.geometry) {
      expect(item.recommendation.length).toBeGreaterThan(30);
      expect(item.disposition).toMatch(
        /READY_FOR_SOLE_AUTHORITY_ACCEPTANCE|OFFLINE_DESIGN_REQUIRED|READ_ONLY_SURVEY_REQUIRED|D05_DESIGN_REQUIRED|PARTIAL_D06_SURVEY_PASS/,
      );
    }
    expect(Object.keys(report.soleAuthorityRecommendations.d06)).toHaveLength(10);
  });

  it('remains an offline, fail-closed design package with zero operations', () => {
    const report = readReport();
    expect(report.authority).toMatchObject({
      offlineOnly: true,
      executable: false,
      worldEditAuthorized: false,
      operationCellCount: 0,
    });
    expect(report.remainingHoldGates.length).toBeGreaterThanOrEqual(5);
    expect(report.releaseBoundary).toEqual({
      physicalOpeningAuthorized: false,
      operationsEmitted: false,
      releaseEvidenceRequiredUnder: 'G03-G19',
    });
  });
});
