import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'combined-zones-r11f-c1-early-dry-at-grade-islands';
const CANONICAL_MANIFEST = path.join(ROOT, 'data/buildops', `${BASENAME}.release-manifest.json`);
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-r11f-'));
const temporaryManifest = path.join(temporaryDirectory, `${BASENAME}.release-manifest.json`);
const temporaryQa = path.join(temporaryDirectory, 'offline-qa.json');
const temporaryExactQa = path.join(temporaryDirectory, 'exact-qa.json');

type Manifest = {
  manifestIdentity: string;
  transactionId: string;
  packages: Array<{ key: string; forward: string; rollback: string }>;
  scope: {
    includedIslands: Array<{ key: string }>;
    excludedEarlyAtGradeRange: { key: string; sourceHazardCount: number; haloHazardCount: number };
    preservedR11EExclusions: {
      omittedEntityInterfaceIslands: unknown[];
      excludedAtGradeRanges: unknown[];
    };
    corridorConnectivityClaimed: boolean;
  };
  target: { operatedUnion: { cellCount: number; coordinateSetSha256: string } };
};

let manifest: Manifest;
let firstCompile: Buffer;

beforeAll(() => {
  execFileSync(process.execPath, [
    'scripts/compile_combined_zones_r11f_c1_early_dry_at_grade_islands.mjs',
    '--out-dir', temporaryDirectory,
    '--generated-at', '2026-08-21T23:55:00Z',
  ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
  firstCompile = fs.readFileSync(temporaryManifest);
  manifest = JSON.parse(firstCompile.toString()) as Manifest;
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R11F C1 early dry at-grade islands', () => {
  it('compiles deterministically and freezes the canonical identity', () => {
    execFileSync(process.execPath, [
      'scripts/compile_combined_zones_r11f_c1_early_dry_at_grade_islands.mjs',
      '--out-dir', temporaryDirectory,
      '--generated-at', '2026-08-21T23:55:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
    expect(fs.readFileSync(temporaryManifest)).toEqual(firstCompile);
    expect(crypto.createHash('sha256').update(fs.readFileSync(CANONICAL_MANIFEST)).digest('hex'))
      .toBe('96dba501a6376f2e5bafde87519138cd3ffd05c75f96fee8395d4edc424ab584');
    const canonical = JSON.parse(fs.readFileSync(CANONICAL_MANIFEST, 'utf8')) as Manifest;
    expect(canonical.manifestIdentity)
      .toBe('dac26f1c94dd1abb7f00ecf18e99d88dda5d8184b290d2fb06986a4c25b5bbd2');
  });

  it('selects only the two safe dry ranges and preserves every hold', () => {
    expect(manifest.transactionId).toBe(BASENAME);
    expect(manifest.packages.map(({ key }) => key)).toEqual([
      'c1-island-46-47-dependencies',
      'c1-island-46-47-pavement',
      'c1-island-75-91-pavement',
    ]);
    expect(manifest.scope.includedIslands.map(({ key }) => key))
      .toEqual(['island-46-47', 'island-75-91']);
    expect(manifest.scope.excludedEarlyAtGradeRange).toEqual(expect.objectContaining({
      key: 'island-0-10', sourceHazardCount: 80, haloHazardCount: 106,
    }));
    expect(manifest.scope.preservedR11EExclusions.omittedEntityInterfaceIslands).toHaveLength(1);
    expect(manifest.scope.preservedR11EExclusions.excludedAtGradeRanges).toHaveLength(2);
    expect(manifest.scope.corridorConnectivityClaimed).toBe(false);
    expect(manifest.target.operatedUnion).toEqual({
      cellCount: 1_639,
      bounds: { minX: 476, maxX: 521, minY: 63, maxY: 78, minZ: 66, maxZ: 94 },
      coordinateSetSha256:
        '2b4e2ee530e848107f993db8138f027b75fb6074a186c46a91d16c01ddc277b6',
    });
  });

  it('passes independent source, inverse, geometry, and generic QA', () => {
    execFileSync(process.execPath, [
      'scripts/qa_combined_zones_r11f_c1_early_dry_at_grade_islands_offline.mjs',
      '--manifest', temporaryManifest,
      '--out', temporaryQa,
      '--generated-at', '2026-08-22T00:00:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
    execFileSync(process.execPath, [
      'scripts/qa_guarded_release_manifest.mjs',
      '--manifest', temporaryManifest,
      '--out', temporaryExactQa,
    ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
    expect(JSON.parse(fs.readFileSync(temporaryQa, 'utf8'))).toMatchObject({
      status: 'PASS',
      checks: {
        packageCount: 3,
        includedIslandCount: 2,
        exactSourceGuardMatchCount: 1_639,
        exactInverseRecordCount: 1_639,
        connectedSurfaceCellCount: 551,
        connectedSurfaceComponentCount: 2,
        interactionHaloCellCount: 4_419,
        includedSourceHazardCount: 0,
        includedHaloHazardCount: 0,
        includedSavedEntityConflictCount: 0,
        includedPriorReleaseIntersectionCount: 0,
        preservedSheepIslandCount: 1,
        preservedWetRangeCount: 2,
        corridorConnectivityClaimed: false,
      },
    });
    expect(JSON.parse(fs.readFileSync(temporaryExactQa, 'utf8'))).toMatchObject({
      status: 'PASS', totals: { packages: 3, uniqueTargetCells: 1_639 },
    });
  });

  it('passes guarded wrapper print-plan compatibility', () => {
    const plan = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_combined_zones_scoped_release.mjs',
      '--manifest', CANONICAL_MANIFEST,
      '--release-node', 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR',
      '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8', timeout: 30_000 })) as {
      mode: string; globalGateDependency: string; packageOrder: string[];
    };
    expect(plan).toEqual(expect.objectContaining({
      mode: 'PREPARE_ONLY',
      globalGateDependency: 'NONE',
      packageOrder: manifest.packages.map(({ key }) => key),
    }));
  });
});
