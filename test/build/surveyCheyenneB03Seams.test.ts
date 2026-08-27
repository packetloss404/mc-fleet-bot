import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/survey_cheyenne_b03_seams.mjs');
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/cheyenne-b03-seam-survey-20260824',
);
const CANONICAL_JSON = path.join(EVIDENCE, 'cheyenne-b03-seam-survey.json');
const CANONICAL_MARKDOWN = path.join(EVIDENCE, 'cheyenne-b03-seam-survey.md');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'cheyenne-b03-seam-survey-'),
);
const temporaryJson = path.join(temporaryDirectory, 'cheyenne-b03-seam-survey.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'cheyenne-b03-seam-survey.md');

interface ObstructionRecord {
  index: number | null;
  cell: { x: number; y: number; z: number };
  state: string;
  classification: { removable: boolean; mustStay: boolean; reason: string };
  b09Overlap: { owner: string; present: boolean };
}

interface SurveyReport {
  status: string;
  payloadSha256: string;
  source: {
    snapshotRoot: string;
    completeSaveSha256: string;
    regionSha256: string;
  };
  indices0to187: {
    obstructions: {
      expectedCount: number;
      verifiedCount: number;
      removableCount: number;
      mustStayCount: number;
      list: ObstructionRecord[];
      b09Attribution: {
        lowerStationShellCount: number;
        guidewaySegment01Count: number;
        guidewaySegment02Count: number;
        unattributedCount: number;
      };
    };
    railInfrastructure: {
      totalRailCells: number;
      byY: Record<string, number>;
      stateCensus: Record<string, number>;
    };
    floorAir: {
      expectedCount: number;
      verifiedCount: number;
      list: Array<{ cell: { x: number; y: number; z: number }; below: string; belowIsAir: boolean }>;
    };
  };
  retainedCap: {
    verifiedCellCount: number;
    allStone: boolean;
    failClosed: boolean;
  };
  z10TerminalInterface: {
    cellCount: number;
    route: { airCellCount: number; mismatchCount: number };
  };
  seams: Array<{ id: string; cellCount: number }>;
  occupancyOwnerCensus: {
    surveyedVolumeCellCount: number;
    blockEntityCount: number;
    savedEntityCount: number;
    containerControlCellCount: number;
    fluidCellCount: number;
    gravityCellCount: number;
  };
  checks: Array<{ id: string; status: string }>;
  summary: {
    passed: boolean;
    checkCount: number;
    passCount: number;
    failCount: number;
    obstructionCountVerified: number | null;
    obstructionRemovableCount: number;
    obstructionMustStayCount: number;
    obstructionB09AttributedCount: number;
    railInfrastructureCellCount: number;
    floorAirCountVerified: number | null;
    seamCount: number;
    retainedCapStoneVerified: boolean;
    z10RouteAirVerified: boolean;
  };
  safetyBoundary: {
    liveCallsPerformed: boolean;
    worldEditsPerformed: boolean;
    serviceMutationsPerformed: boolean;
    readOnlyImmutableAnvilInputs: boolean;
  };
}

function readReport(filename = CANONICAL_JSON): SurveyReport {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as SurveyReport;
}

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--generated-at',
    '2026-08-24T22:12:25.219Z',
    '--out',
    temporaryJson,
    '--markdown',
    temporaryMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 120_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('MP01 Cheyenne B03/Z10 seam survey', () => {
  it('regenerates the sealed survey reports byte-for-byte', () => {
    expect(fs.readFileSync(temporaryJson)).toEqual(fs.readFileSync(CANONICAL_JSON));
    expect(fs.readFileSync(temporaryMarkdown)).toEqual(fs.readFileSync(CANONICAL_MARKDOWN));
  });

  it('binds the accepted immutable r08am snapshot and stable payload identity', () => {
    expect(readReport()).toMatchObject({
      status: 'PASS_MP01_CHEYENNE_B03_Z10_SURVEY_READONLY',
      payloadSha256: '1f1e5515715dd22478fa41f3edc2fe8b035b095dd41ebd2dac17f66453a426f6',
      source: {
        snapshotRoot: 'data/worldsnap-r08am-post-20260822T161818Z',
        completeSaveSha256: '0bcbba4fad530b8a5c22bbef295978cc4864270de652acba18372e445b584699',
        regionSha256: '30f5c3394c4080d74156a59deb613290366c130e72a859261625117b8276541f',
      },
    });
  });

  it('verifies the 63 obstructions and 14 floor-air cells with exact B09 attribution', () => {
    const report = readReport();
    expect(report.indices0to187.obstructions).toMatchObject({
      expectedCount: 63,
      verifiedCount: 63,
      removableCount: 0,
      mustStayCount: 63,
      b09Attribution: {
        lowerStationShellCount: 48,
        guidewaySegment01Count: 15,
        guidewaySegment02Count: 0,
        unattributedCount: 0,
      },
    });
    expect(report.indices0to187.obstructions.list).toHaveLength(63);
    expect(
      report.indices0to187.obstructions.list.every((record) => record.b09Overlap.present),
    ).toBe(true);
    expect(report.indices0to187.floorAir).toMatchObject({
      expectedCount: 14,
      verifiedCount: 14,
    });
    expect(report.indices0to187.floorAir.list).toHaveLength(14);
  });

  it('captures the commissioned B09 rail census in the shared portal corridor', () => {
    const rail = readReport().indices0to187.railInfrastructure;
    expect(rail.totalRailCells).toBe(199);
    expect(rail.byY['130']).toBe(182);
    expect(rail.stateCensus['minecraft:powered_rail[powered=false,shape=east_west,waterlogged=false]']).toBe(15);
  });

  it('proves the retained cap, Z10 interface, and all six sealed seams', () => {
    const report = readReport();
    expect(report.retainedCap).toMatchObject({
      verifiedCellCount: 20,
      allStone: true,
      failClosed: true,
    });
    expect(report.z10TerminalInterface).toMatchObject({
      cellCount: 144,
      route: { airCellCount: 160, mismatchCount: 0 },
    });
    expect(report.seams).toHaveLength(6);
    expect(report.seams.map(({ id }) => id)).toEqual([
      'seam-cheyenne-terminus-cap',
      'seam-z10-upstream',
      'seam-north-liner-wall',
      'seam-south-liner-wall',
      'seam-ceiling',
      'seam-floor',
    ]);
  });

  it('finds no occupancy, containers, fluids, or saved entities in the surveyed volume', () => {
    expect(readReport().occupancyOwnerCensus).toMatchObject({
      blockEntityCount: 0,
      savedEntityCount: 0,
      containerControlCellCount: 0,
      fluidCellCount: 0,
      gravityCellCount: 0,
    });
  });

  it('passes every survey check without a live call or mutation', () => {
    const report = readReport();
    expect(report.summary).toEqual({
      passed: true,
      checkCount: 11,
      passCount: 11,
      failCount: 0,
      obstructionCountVerified: 63,
      obstructionRemovableCount: 0,
      obstructionMustStayCount: 63,
      obstructionB09AttributedCount: 63,
      railInfrastructureCellCount: 199,
      floorAirCountVerified: 14,
      seamCount: 6,
      retainedCapStoneVerified: true,
      z10RouteAirVerified: true,
    });
    expect(report.checks).toHaveLength(11);
    expect(report.checks.every(({ status }) => status === 'PASS')).toBe(true);
    expect(report.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      serviceMutationsPerformed: false,
      readOnlyImmutableAnvilInputs: true,
    });
  });
});
