import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const COMMITTED_JSON = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-protected-relic-clearance.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-relic-clearance-'));
const regeneratedJson = path.join(tempDir, 'clearance.json');
const regeneratedMarkdown = path.join(tempDir, 'clearance.md');

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

interface Comparison {
  envelopeId: string;
  relationship: string;
  protectedCoreIntersection: {
    cellCount: number;
    coordinateSetSha256: string;
  };
  observedPresentCellIntersection: {
    cellCount: number;
  };
}

interface Relic {
  key: string;
  declaredInclusiveBounds: Bounds;
  declaredVolumeCellCount: number;
  observedSnapshotCensus: {
    status: string;
    finding: string;
    totalCellCount: number;
    presentCellCount: number;
    airCellCount: number;
    materialCounts: Record<string, number>;
    presentCoordinateSetSha256: string;
    presentBlockStateSetSha256: string;
    fullVolumeBlockStateSetSha256: string;
  };
  evidenceBackedDefaultDenyCore: {
    status: string;
    positiveMarginBlocks: number;
    cellCount: number;
    coordinateSetSha256: string;
    operationOwnership: boolean;
  };
  positiveMarginBuffer: {
    status: string;
  };
  coordinationEnvelopeComparisons: Comparison[];
}

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  worldEditAuthorized: boolean;
  operationCellCount: number;
  materialCellCount: number;
  sourceBindings: Record<string, {
    path: string;
    sha256: string;
    regionFileCount?: number;
    bytes: number;
  }>;
  relics: Relic[];
  coordinationSummary: {
    frozenEnvelopeCountCompared: number;
    overlappingComparisons: Array<{
      relicKey: string;
      envelopeId: string;
      protectedCoreCellCount: number;
      observedPresentCellCount: number;
    }>;
    interpretation: string;
  };
  preservationFindings: {
    declaredRelicCount: number;
    relicBoundsWithPresentCells: number;
    relicBoundsWithoutPresentCells: string[];
    status: string;
  };
  g06Disposition: {
    status: string;
    passedSubgates: string[];
    holdSubgates: string[];
    passRule: string;
    releaseLifecycleValidation: { gateRange: string; resolvesG06ForR00: boolean };
  };
}

function readReport(filename: string): Report {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as Report;
}

function sha256File(filename: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function coreCoordinateHash(bounds: Bounds): string {
  const digest = crypto.createHash('sha256');
  digest.update('combined-zones-coordinate-cell-set-v1\n');
  for (let x = bounds.minX; x <= bounds.maxX; x++) {
    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      for (let z = bounds.minZ; z <= bounds.maxZ; z++) {
        digest.update(`${x},${y},${z}\n`);
      }
    }
  }
  return digest.digest('hex');
}

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      'scripts/audit_combined_zones_protected_relic_clearance.mjs',
      '--out',
      regeneratedJson,
      '--markdown',
      regeneratedMarkdown,
    ],
    { cwd: ROOT, stdio: 'pipe' },
  );
});

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones protected-relic clearance evidence', () => {
  it('regenerates byte-identical JSON and Markdown from the immutable Phase 0 snapshot', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));

    const report = readReport(COMMITTED_JSON);
    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-protected-relic-clearance',
      status: 'PARTIAL_PASS_G06_REMAINS_HOLD',
      worldEditAuthorized: false,
      operationCellCount: 0,
      materialCellCount: 0,
    });
    for (const binding of Object.values(report.sourceBindings)) {
      if (binding.regionFileCount !== undefined) continue;
      expect(sha256File(path.join(ROOT, binding.path)), binding.path).toBe(binding.sha256);
    }
  });

  it('hashes complete zero-margin default-deny cores without claiming ownership', () => {
    const report = readReport(COMMITTED_JSON);
    expect(report.relics.map((relic) => relic.key)).toEqual([
      'igloo-east',
      'igloo-west',
      'shipwreck',
    ]);

    for (const relic of report.relics) {
      const bounds = relic.declaredInclusiveBounds;
      const volume = (bounds.maxX - bounds.minX + 1)
        * (bounds.maxY - bounds.minY + 1)
        * (bounds.maxZ - bounds.minZ + 1);
      expect(relic.declaredVolumeCellCount).toBe(volume);
      expect(relic.observedSnapshotCensus.totalCellCount).toBe(volume);
      expect(relic.observedSnapshotCensus.presentCellCount
        + relic.observedSnapshotCensus.airCellCount).toBe(volume);
      expect(relic.evidenceBackedDefaultDenyCore).toMatchObject({
        status: 'FROZEN_OFFLINE_CONSTRAINT',
        positiveMarginBlocks: 0,
        cellCount: volume,
        operationOwnership: false,
      });
      expect(relic.evidenceBackedDefaultDenyCore.coordinateSetSha256)
        .toBe(coreCoordinateHash(bounds));
      expect(relic.positiveMarginBuffer.status).toBe('HOLD_NOT_FROZEN');
    }
  });

  it('records the exact preservation finding instead of inferring three intact relics', () => {
    const report = readReport(COMMITTED_JSON);
    const byKey = Object.fromEntries(report.relics.map((relic) => [relic.key, relic]));

    expect(byKey['igloo-east'].observedSnapshotCensus).toMatchObject({
      status: 'PASS_EXACT_BOUNDING_VOLUME_CENSUS',
      finding: 'NO_PRESENT_CELLS_IN_DECLARED_BOUNDING_VOLUME',
      totalCellCount: 280,
      presentCellCount: 0,
      airCellCount: 280,
      materialCounts: {},
    });
    expect(byKey['igloo-west'].observedSnapshotCensus).toMatchObject({
      finding: 'PRESENT_CELLS_OBSERVED_IN_DECLARED_BOUNDING_VOLUME',
      totalCellCount: 280,
      presentCellCount: 187,
      airCellCount: 93,
    });
    expect(byKey.shipwreck.observedSnapshotCensus).toMatchObject({
      finding: 'PRESENT_CELLS_OBSERVED_IN_DECLARED_BOUNDING_VOLUME',
      totalCellCount: 2268,
      presentCellCount: 1118,
      airCellCount: 1150,
      materialCounts: expect.objectContaining({
        'minecraft:chest': 3,
        'minecraft:dark_oak_planks': 116,
        'minecraft:spruce_planks': 219,
      }),
    });
    expect(report.preservationFindings).toEqual({
      declaredRelicCount: 3,
      relicBoundsWithPresentCells: 2,
      relicBoundsWithoutPresentCells: ['igloo-east'],
      status: 'HOLD_ONE_OR_MORE_DECLARED_RELIC_BOUNDS_EMPTY',
      interpretation: expect.any(String),
    });
  });

  it('treats envelope overlap as a veto, never as operation ownership', () => {
    const report = readReport(COMMITTED_JSON);
    expect(report.coordinationSummary.frozenEnvelopeCountCompared).toBe(6);
    expect(report.coordinationSummary.overlappingComparisons).toEqual([
      {
        relicKey: 'igloo-east',
        envelopeId: 'continuous-mountain',
        protectedCoreCellCount: 280,
        observedPresentCellCount: 0,
      },
      {
        relicKey: 'shipwreck',
        envelopeId: 'continuous-mountain',
        protectedCoreCellCount: 1512,
        observedPresentCellCount: 698,
      },
    ]);
    expect(report.coordinationSummary.interpretation).toContain('do not own');
    expect(report.operationCellCount).toBe(0);
    expect(report.materialCellCount).toBe(0);
  });

  it('keeps G06 fail-closed with explicit passed and held subgates', () => {
    const report = readReport(COMMITTED_JSON);
    expect(report.g06Disposition.status).toBe('HOLD');
    expect(report.g06Disposition.passedSubgates).toHaveLength(6);
    expect(report.g06Disposition.holdSubgates).toEqual(expect.arrayContaining([
      expect.stringContaining('positive-margin'),
      expect.stringContaining('igloo-east has zero present cells'),
      expect.stringContaining('no exact proposed construction and interaction cell set'),
      expect.stringContaining('remaining 47'),
    ]));
    expect(report.g06Disposition.passRule).not.toMatch(
      /\b(operations?|rollbacks?|post[- ]state|post-construction)\b/i,
    );
    expect(report.g06Disposition.releaseLifecycleValidation).toMatchObject({
      gateRange: 'G16-G19',
      resolvesG06ForR00: false,
    });
    expect(report.worldEditAuthorized).toBe(false);
  });
});
