import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const GENERATED_AT = '2026-08-04T21:56:58Z';
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-d02-s01-s02-region-evidence.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-d02-s01-s02-region-evidence.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-d02-s01-s02-'));
const regeneratedJson = path.join(tempDir, 'region-evidence.json');
const regeneratedMarkdown = path.join(tempDir, 'region-evidence.md');

interface SnapshotCandidate {
  root: string;
  region: { present: boolean; mcaFileCount: number };
  entities: { present: boolean; mcaFileCount: number };
  poi: { present: boolean; mcaFileCount: number };
  levelDat: { present: boolean };
  complete: boolean;
}

interface RegionEvidence {
  schemaVersion: number;
  id: string;
  status: string;
  safetyBoundary: {
    liveCallsPerformed: unknown[];
    databasesOpened: unknown[];
    operationCells: unknown[];
    materialCells: unknown[];
    operationCellCount: number;
    worldEditAuthorized: boolean;
    physicalBuildAuthorized: boolean;
    d02Resolved: boolean;
    s01Complete: boolean;
    s02Complete: boolean;
  };
  sourceBindings: Array<{ path: string; sha256: string; bytes: number }>;
  copiedSaveCompletenessAudit: {
    candidateCount: number;
    completeCandidateCount: number;
    inventorySha256: string;
    candidates: SnapshotCandidate[];
    conclusion: string;
  };
  selectedRegionOnlyEvidence: {
    identity: { sha256: string; regionFileCount: number; bytes: number };
    completeness: {
      region: boolean;
      entities: boolean;
      poi: boolean;
      levelDat: boolean;
      status: string;
    };
    prohibitedInferences: string[];
  };
  d02S01: {
    status: string;
    c1FullHeight: {
      scope: {
        columnCount: number;
        columnSetSha256: string;
        surveyedCellCount: number;
        touchedChunkCount: number;
        missingChunkCount: number;
      };
      stateCensus: {
        stateStreamSha256: string;
        uniqueBlockNameCount: number;
        uniqueExactStateCount: number;
        airLikeCells: number;
        nonAirCells: number;
        waterCells: number;
        waterloggedCells: number;
        lavaCells: number;
        gravitySensitiveCandidateCells: number;
      };
      blockEntities: {
        count: number;
        byType: Array<{ id: string; count: number }>;
        nbtSetSha256: string;
        nbtContentsPublished: boolean;
      };
    };
    relevantGeneratedStructureStarts: {
      count: number;
      records: Array<{ id: string; exactLandTakePlanOverlapColumnCount: number }>;
      interpretation: string;
    };
    remainingBlockers: string[];
  };
  d02S02: {
    status: string;
    c01CatalogFeatureVolumes: Array<{
      feature: string;
      exactLandTakePlanOverlapColumnCount: number;
      regionVolume: { nonAirCells: number; blockEntities: { count: number } };
      acceptance: string;
    }>;
    issue002RegionEvidence: {
      oldC01SourceVolume: { nonAirCells: number; blockEntities: { count: number } };
      oldSourceRegionFinding: string;
      portalStudyVolume: { waterCells: number; blockEntities: { count: number } };
      p01Surface: {
        columnCount: number;
        minimumTopY: number;
        maximumTopY: number;
        waterTopColumns: number;
        uniqueTopBlockNameCount: number;
      };
      roadStudy: { exactAcceptedRoadCellSetAvailable: boolean; status: string };
      authoritativeReleaseTruth: {
        railwayCloseoutIssue: string;
        independentAuditFinding: string;
        undergroundInventoryTruthBoundary: string;
      };
    };
    remainingBlockers: string[];
  };
  decisionImpact: { d02Resolved: boolean; r00Ready: boolean };
  finalGate: { status: string; worldEditAuthorized: boolean };
}

function readReport(filename: string): RegionEvidence {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as RegionEvidence;
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
      '--max-old-space-size=4096',
      'scripts/audit_combined_zones_d02_s01_s02_region_evidence.mjs',
      '--out', regeneratedJson,
      '--markdown', regeneratedMarkdown,
      '--generated-at', GENERATED_AT,
      '--historical-inventory-replay',
      '--exclude-post-generation-candidate',
      'data/worldsnap-combined-zones-complete-save-20260806T014133Z',
    ],
    { cwd: ROOT, stdio: 'pipe', maxBuffer: 1024 * 1024 },
  );
}, 120_000);

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones D02-S01/S02 region-only evidence', () => {
  it('replays the historical pre-capture inventory byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
  });

  it('binds current planning evidence and proves no complete copied save is available', () => {
    const report = readReport(COMMITTED_JSON);

    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-d02-s01-s02-region-evidence',
      status: 'PARTIAL_PASS_REGION_FACTS_COMPLETE_SAVE_MISSING_D02_HOLD',
      copiedSaveCompletenessAudit: {
        candidateCount: 56,
        completeCandidateCount: 0,
        conclusion: 'NO_COMPLETE_COPIED_SAVE_AVAILABLE_UNDER_DATA',
      },
      selectedRegionOnlyEvidence: {
        identity: {
          sha256: '05eebe12ba419abd75b80033c265daf452b652a575c912f6df497735e00d271b',
          regionFileCount: 51,
          bytes: 290946492,
        },
        completeness: {
          region: true,
          entities: false,
          poi: false,
          levelDat: false,
          status: 'INCOMPLETE_REGION_ONLY_TERRAIN_AND_BLOCK_ENTITY_EVIDENCE',
        },
      },
    });
    expect(report.copiedSaveCompletenessAudit.inventorySha256).toMatch(/^[0-9a-f]{64}$/);
    expect(report.copiedSaveCompletenessAudit.candidates).toHaveLength(56);
    expect(report.copiedSaveCompletenessAudit.candidates.every((candidate) => (
      candidate.region.mcaFileCount > 0
      && candidate.entities.mcaFileCount === 0
      && candidate.poi.mcaFileCount === 0
      && !candidate.levelDat.present
      && !candidate.complete
    ))).toBe(true);
    for (const binding of report.sourceBindings) {
      expect(sha256File(binding.path)).toBe(binding.sha256);
      expect(fs.statSync(path.join(ROOT, binding.path)).size).toBe(binding.bytes);
    }
  });

  it('seals the complete full-height region census over the exact C1 land take', () => {
    const report = readReport(COMMITTED_JSON);
    const census = report.d02S01.c1FullHeight;

    expect(report.d02S01.status)
      .toBe('PARTIAL_PASS_EXACT_REGION_CENSUS_COMPLETE_SAVE_COMPONENTS_MISSING');
    expect(census.scope).toEqual(expect.objectContaining({
      columnCount: 80363,
      columnSetSha256: 'a236f24b9371f8fdedca66416109aacd11a2101ffe1c1a1b80117ab027909d70',
      surveyedCellCount: 30859392,
      touchedChunkCount: 437,
      missingChunkCount: 0,
    }));
    expect(census.stateCensus).toEqual(expect.objectContaining({
      stateStreamSha256: 'f8de755a2ef320c0611420a8e857f77b9476509df03bf694749a1f4dd64e63eb',
      uniqueBlockNameCount: 115,
      uniqueExactStateCount: 384,
      airLikeCells: 18800690,
      nonAirCells: 12058702,
      waterCells: 70032,
      waterloggedCells: 537,
      lavaCells: 11178,
      gravitySensitiveCandidateCells: 179658,
    }));
    expect(census.stateCensus.airLikeCells + census.stateCensus.nonAirCells)
      .toBe(census.scope.surveyedCellCount);
    expect(census.blockEntities).toMatchObject({
      count: 33,
      nbtSetSha256: '980227c3b44559c0b8bc0899666c5e70cbdca478992c3afbbf6e8339fe5ba98c',
      nbtContentsPublished: false,
    });
    expect(census.blockEntities.byType).toContainEqual({ id: 'minecraft:chest', count: 13 });
    expect(report.d02S01.relevantGeneratedStructureStarts.count).toBe(4);
    expect(report.d02S01.relevantGeneratedStructureStarts.records.map((record) => record.id))
      .toEqual([
        'minecraft:trial_chambers',
        'minecraft:mineshaft',
        'minecraft:mineshaft',
        'minecraft:mineshaft',
      ]);
    expect(report.d02S01.relevantGeneratedStructureStarts.interpretation)
      .toContain('not an occupied-cell or clearance result');
  });

  it('records exact C01 region volumes while preserving ISSUE-002 truth boundaries', () => {
    const report = readReport(COMMITTED_JSON);
    const s02 = report.d02S02;

    expect(s02.status).toBe('PARTIAL_PASS_REGION_INTERFACE_FACTS_ISSUE_002_REMAINS_OPEN');
    expect(s02.c01CatalogFeatureVolumes).toHaveLength(8);
    expect(s02.c01CatalogFeatureVolumes.every((feature) => (
      feature.regionVolume.nonAirCells > 0
      && feature.acceptance.includes('OWNERSHIP_LOADING_AND_USABILITY_HOLD')
    ))).toBe(true);
    expect(s02.c01CatalogFeatureVolumes.find((feature) => (
      feature.feature === 'C01 Owner Tunnel Detour'
    ))).toEqual(expect.objectContaining({
      exactLandTakePlanOverlapColumnCount: 7803,
      regionVolume: expect.objectContaining({
        nonAirCells: 319514,
        blockEntities: expect.objectContaining({ count: 4 }),
      }),
    }));
    expect(s02.issue002RegionEvidence.oldC01SourceVolume).toMatchObject({
      nonAirCells: 1287514,
      blockEntities: { count: 3505 },
    });
    expect(s02.issue002RegionEvidence.oldSourceRegionFinding)
      .toBe('NONEMPTY_WITH_BLOCK_ENTITIES_CONSISTENT_WITH_OLD_SOURCE_NOT_RETIRED');
    expect(s02.issue002RegionEvidence.portalStudyVolume).toMatchObject({
      waterCells: 0,
      blockEntities: { count: 0 },
    });
    expect(s02.issue002RegionEvidence.p01Surface).toMatchObject({
      columnCount: 33634,
      minimumTopY: 60,
      maximumTopY: 112,
      waterTopColumns: 1280,
      uniqueTopBlockNameCount: 46,
    });
    expect(s02.issue002RegionEvidence.roadStudy).toEqual(expect.objectContaining({
      exactAcceptedRoadCellSetAvailable: false,
      status: 'HOLD_NO_EXACT_ACCEPTED_ROAD_SET',
    }));
    expect(s02.issue002RegionEvidence.authoritativeReleaseTruth.railwayCloseoutIssue)
      .toContain('were not delivered');
    expect(s02.issue002RegionEvidence.authoritativeReleaseTruth.independentAuditFinding)
      .toContain('old C01 is not actually moved');
    expect(s02.issue002RegionEvidence.authoritativeReleaseTruth.undergroundInventoryTruthBoundary)
      .toContain('contested under ISSUE-002');
  });

  it('fails closed without operations, world authorization, or false completion', () => {
    const report = readReport(COMMITTED_JSON);

    expect(report.safetyBoundary).toEqual(expect.objectContaining({
      liveCallsPerformed: [],
      databasesOpened: [],
      operationCells: [],
      materialCells: [],
      operationCellCount: 0,
      worldEditAuthorized: false,
      physicalBuildAuthorized: false,
      d02Resolved: false,
      s01Complete: false,
      s02Complete: false,
    }));
    expect(report.selectedRegionOnlyEvidence.prohibitedInferences)
      .toContain('semantic commissioning, ownership, loading permission, or usable arrival');
    expect(report.d02S01.remainingBlockers.length).toBeGreaterThan(2);
    expect(report.d02S02.remainingBlockers.length).toBeGreaterThan(3);
    expect(report.decisionImpact).toMatchObject({ d02Resolved: false, r00Ready: false });
    expect(report.finalGate).toEqual(expect.objectContaining({
      status: 'HOLD_D02_S01_S02_INCOMPLETE_NO_WORLD_EDITS',
      worldEditAuthorized: false,
    }));
  });
});
