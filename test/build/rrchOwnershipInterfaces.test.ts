import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/survey_rrch_ownership_interfaces.mjs');
const EVIDENCE = path.join(ROOT, 'data/world-review/rrch-ownership-interfaces-20260825');
const CANONICAL_JSON = path.join(EVIDENCE, 'rrch-ownership-interfaces.json');
const CANONICAL_MARKDOWN = path.join(EVIDENCE, 'rrch-ownership-interfaces.md');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rrch-ownership-interfaces-'));
const temporaryJson = path.join(temporaryDirectory, 'rrch-ownership-interfaces.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'rrch-ownership-interfaces.md');

interface InterfaceRecord {
  id: string;
  label: string;
  owner: string;
  neighbor: string;
  bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
  surveyedBounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
  cellCount: number;
  coordinateSetSha256: string;
  census: Record<string, number>;
  hazards: {
    air: number;
    fluid: number;
    gravity: number;
    forbidden: number;
    containerControlBlockCount: number;
  };
}

interface SurveyReport {
  status: string;
  payloadSha256: string;
  source: {
    snapshotRoot: string;
    snapshotRegionSha256: string;
    snapshotCompleteSaveSha256: string;
    capturedAtUtc: string;
  };
  district: {
    projectId: string;
    districtBounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
  };
  crossAreaReleaseHold: {
    reference: string;
    rule: string;
  };
  interfaces: InterfaceRecord[];
  census: {
    totalSurveyedCells: number;
    blockEntities: number;
    blockEntityDetails: Array<{ id: string | null; cell: { x: number; y: number; z: number } }>;
    savedEntities: number;
    savedEntityDetails: Array<{ id: string | null; position: number[] }>;
    containersOrControls: number;
  };
  checks: Array<{ id: string; status: string }>;
  interpretation: string;
}

function readReport(filename = CANONICAL_JSON): SurveyReport {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as SurveyReport;
}

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--generated-at',
    '2026-08-25T12:00:00.000Z',
    '--out',
    temporaryJson,
    '--markdown',
    temporaryMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 120_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Ravensreach ownership-interface survey', () => {
  it('regenerates the sealed survey reports byte-for-byte', () => {
    expect(fs.readFileSync(temporaryJson)).toEqual(fs.readFileSync(CANONICAL_JSON));
    expect(fs.readFileSync(temporaryMarkdown)).toEqual(fs.readFileSync(CANONICAL_MARKDOWN));
  });

  it('binds the accepted immutable r08am snapshot and stable payload identity', () => {
    expect(readReport()).toMatchObject({
      status: 'PASS_RRCH_OWNERSHIP_INTERFACES_READONLY',
      payloadSha256: '8d5a4b7fbf26a57fdadd69673081c029d3247195c78a9e47f178178837412219',
      source: {
        snapshotRoot: 'data/worldsnap-r08am-post-20260822T161818Z',
        snapshotRegionSha256: '30f5c3394c4080d74156a59deb613290366c130e72a859261625117b8276541f',
        snapshotCompleteSaveSha256: '0bcbba4fad530b8a5c22bbef295978cc4864270de652acba18372e445b584699',
      },
    });
  });

  it('documents the district and all eight ownership interfaces', () => {
    const report = readReport();
    expect(report.district).toMatchObject({
      projectId: 'ravensreach',
      districtBounds: { minX: -147, maxX: -40, minY: 24, maxY: 110, minZ: -451, maxZ: -324 },
    });
    expect(report.interfaces).toHaveLength(8);
    expect(report.interfaces.map(({ id }) => id)).toEqual([
      'IF-RRCH-LIBRARY-LOGGIA',
      'IF-RRCH-TERRACE-SOUTH-EDGE',
      'IF-RRCH-TEREM-EAST-SURFACE',
      'IF-RRCH-GUILDHALL-WEST',
      'IF-RRCH-STOREHOUSE-NORTH',
      'IF-RRCH-MOOT-NORTH',
      'IF-RRCH-MOOT-MARKET-GAP',
      'IF-RRCH-TOWNHALL-SHELL',
    ]);
  });

  it('captures the exact interface cell counts and coordinate hashes', () => {
    const report = readReport();
    const expectedCounts: Record<string, number> = {
      'IF-RRCH-LIBRARY-LOGGIA': 165,
      'IF-RRCH-TERRACE-SOUTH-EDGE': 85,
      'IF-RRCH-TEREM-EAST-SURFACE': 184,
      'IF-RRCH-GUILDHALL-WEST': 1960,
      'IF-RRCH-STOREHOUSE-NORTH': 105,
      'IF-RRCH-MOOT-NORTH': 217,
      'IF-RRCH-MOOT-MARKET-GAP': 728,
      'IF-RRCH-TOWNHALL-SHELL': 1092,
    };
    for (const record of report.interfaces) {
      expect(record.cellCount).toBe(expectedCounts[record.id]);
      expect(record.coordinateSetSha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('records one owner per interface and every cross-area neighbor', () => {
    const report = readReport();
    for (const record of report.interfaces) {
      expect(record.owner.length).toBeGreaterThan(0);
      expect(record.neighbor.length).toBeGreaterThan(0);
    }
    const neighbors = report.interfaces.map(({ neighbor }) => neighbor).join(' ');
    expect(neighbors).toContain('TE-RUSSIAN-TEREM-PAVILION');
    expect(neighbors).toContain('TE-GUILDHALL-01');
    expect(neighbors).toContain('TE-LIBRARY-TERRACE');
    expect(neighbors).toContain('RG-LOGGIA');
    expect(report.crossAreaReleaseHold.reference).toContain('docs/masterplans/10-ravensreach/MASTERPLAN.md');
  });

  it('captures the exact surveyed volume with zero fluid and zero saved entities', () => {
    const report = readReport();
    expect(report.census).toMatchObject({
      totalSurveyedCells: 4309,
      blockEntities: 7,
      savedEntities: 0,
    });
    expect(report.census.blockEntityDetails).toHaveLength(7);
    for (const record of report.interfaces) {
      expect(record.hazards.fluid).toBe(0);
    }
  });

  it('documents the container/control block entities at the interface boundaries', () => {
    const report = readReport();
    const ids = report.census.blockEntityDetails.map(({ id }) => id);
    expect(ids).toContain('minecraft:barrel');
    expect(ids).toContain('minecraft:chest');
    expect(ids).toContain('minecraft:lectern');
    expect(report.census.containersOrControls).toBe(5);
  });

  it('passes all read-only checks and makes no live calls', () => {
    const report = readReport();
    expect(report.checks.every((check) => check.status === 'PASS')).toBe(true);
    expect(report.interpretation).toContain('authorizes no world edit');
    expect(report.worldMutationPerformed).toBe(false);
    expect(report.rconCallsPerformed).toBe(false);
  });
});
