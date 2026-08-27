import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/survey_msa_external_seams.mjs');
const EVIDENCE = path.join(ROOT, 'data/world-review/msa-seam-register-20260825');
const CANONICAL_JSON = path.join(EVIDENCE, 'msa-external-seam-register.json');
const CANONICAL_MARKDOWN = path.join(EVIDENCE, 'msa-external-seam-register.md');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'msa-seam-register-'));
const temporaryJson = path.join(temporaryDirectory, 'msa-external-seam-register.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'msa-external-seam-register.md');

interface SeamRecord {
  id: string;
  label: string;
  owner: string;
  bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
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
    siteEnvelope: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
  };
  seams: SeamRecord[];
  census: {
    totalSurveyedCells: number;
    blockEntities: number;
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
    '2026-08-25T00:30:00.000Z',
    '--out',
    temporaryJson,
    '--markdown',
    temporaryMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 120_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('MainStreet America external seam register', () => {
  it('regenerates the sealed survey reports byte-for-byte', () => {
    expect(fs.readFileSync(temporaryJson)).toEqual(fs.readFileSync(CANONICAL_JSON));
    expect(fs.readFileSync(temporaryMarkdown)).toEqual(fs.readFileSync(CANONICAL_MARKDOWN));
  });

  it('binds the accepted immutable r08am snapshot and stable payload identity', () => {
    expect(readReport()).toMatchObject({
      status: 'PASS_MSA_EXTERNAL_SEAM_REGISTER_READONLY',
      payloadSha256: '6ea1500f3f748289a79070b6204e5bf7c2641c72659e0e78073c423d22cb47e9',
      source: {
        snapshotRoot: 'data/worldsnap-r08am-post-20260822T161818Z',
        snapshotRegionSha256: '30f5c3394c4080d74156a59deb613290366c130e72a859261625117b8276541f',
        snapshotCompleteSaveSha256: '0bcbba4fad530b8a5c22bbef295978cc4864270de652acba18372e445b584699',
      },
    });
  });

  it('documents the district SITE envelope and all eight external seams', () => {
    const report = readReport();
    expect(report.district).toMatchObject({
      projectId: 'mainstreet-america',
      siteEnvelope: { minX: -300, maxX: 300, minY: 62, maxY: 319, minZ: -300, maxZ: 300 },
    });
    expect(report.seams).toHaveLength(8);
    expect(report.seams.map(({ id }) => id)).toEqual([
      'mountain-west-face',
      'mountain-south-face',
      'road-west-terminus',
      'road-r07-south-edge',
      'south-arrival',
      'rail-anchor',
      'property-west',
      'property-north',
    ]);
  });

  it('captures the exact seam cell counts and coordinate hashes', () => {
    const report = readReport();
    const expectedCounts: Record<string, number> = {
      'mountain-west-face': 2121,
      'mountain-south-face': 4431,
      'road-west-terminus': 2448,
      'road-r07-south-edge': 1540,
      'south-arrival': 3523,
      'rail-anchor': 1377,
      'property-west': 15626,
      'property-north': 15626,
    };
    for (const seam of report.seams) {
      expect(seam.cellCount).toBe(expectedCounts[seam.id]);
      expect(seam.coordinateSetSha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('reports the rail anchor reservation with zero built rail', () => {
    const seam = readReport().seams.find(({ id }) => id === 'rail-anchor');
    expect(seam).toBeDefined();
    const railStates = Object.keys(seam!.census).filter((state) => state.includes('_rail'));
    expect(railStates).toHaveLength(0);
  });

  it('finds no containers/controls and no block entities in the surveyed volume', () => {
    const report = readReport();
    expect(report.census).toMatchObject({
      totalSurveyedCells: 46687,
      blockEntities: 0,
      containersOrControls: 0,
    });
    expect(report.census.savedEntities).toBe(2);
    expect(report.census.savedEntityDetails).toHaveLength(2);
  });

  it('passes all read-only checks and makes no live calls', () => {
    const report = readReport();
    expect(report.checks.every((check) => check.status === 'PASS')).toBe(true);
    expect(report.checks.some((check) => check.id === 'SEAM-05-SURVEYED-VOLUME-ENTITY-CENSUS-CAPTURED' && check.status === 'PASS')).toBe(true);
    expect(report.interpretation).toContain('authorizes no world edit');
  });
});
