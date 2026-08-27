import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r08_pf01_partitioned_fluid_liner.mjs',
);
const BASENAME = 'combined-zones-r08-empty-eight-platform-01-partitioned-fluid-liner';
const LAVA_KEY = 'ee-pf-01-stable-lava-source-liner';
const WATER_KEY = 'ee-pf-01-flow-ordered-water-boundary-liner';
const SNAPSHOT = 'data/worldsnap-combined-zones-r11b-post-20260821T173605Z';
const INTAKE =
  'data/world-review/combined-zones-r11b-live-20260821T173605Z/post-complete-save-intake.json';
const DIRECTORY = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-r08-pf01-liner-'));
const MANIFEST = path.join(DIRECTORY, `${BASENAME}.release-manifest.json`);
const LAVA_FORWARD = path.join(DIRECTORY, `${BASENAME}.${LAVA_KEY}.forward.txt`);
const LAVA_ROLLBACK = path.join(DIRECTORY, `${BASENAME}.${LAVA_KEY}.rollback.txt`);
const WATER_FORWARD = path.join(DIRECTORY, `${BASENAME}.${WATER_KEY}.forward.txt`);
const WATER_ROLLBACK = path.join(DIRECTORY, `${BASENAME}.${WATER_KEY}.rollback.txt`);
const CANONICAL_MANIFEST = path.join(ROOT, 'data/buildops', `${BASENAME}.release-manifest.json`);
const EXPECTED_WATER_ORDER = [
  '1745,40,55',
  '1746,40,55',
  '1747,40,55',
  '1748,40,55',
  '1749,40,55',
];

let firstArtifacts: Buffer[] = [];

function operationLines(filename: string): string[] {
  return fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line.startsWith('REPL '));
}

function exactReverse(forward: string[]): string[] {
  return forward.slice().reverse().map((line) => {
    const fields = line.split(' ');
    return [...fields.slice(0, 7), fields[8], fields[7]].join(' ');
  });
}

beforeAll(() => {
  const args = [
    SCRIPT,
    '--generated-at',
    '2026-08-21T17:32:00Z',
    '--snapshot',
    SNAPSHOT,
    '--intake-audit',
    INTAKE,
    '--out-dir',
    DIRECTORY,
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstArtifacts = [MANIFEST, LAVA_FORWARD, LAVA_ROLLBACK, WATER_FORWARD, WATER_ROLLBACK]
    .map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => fs.rmSync(DIRECTORY, { recursive: true, force: true }));

describe('Combined Zones R08L PF01 partitioned fluid liner', () => {
  it('regenerates both guarded packages and the manifest byte-for-byte', () => {
    expect([MANIFEST, LAVA_FORWARD, LAVA_ROLLBACK, WATER_FORWARD, WATER_ROLLBACK]
      .map((filename) => fs.readFileSync(filename))).toEqual(firstArtifacts);
  });

  it('binds the exact R11B terminal PF01 fluid split and leaves future interfaces sealed', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    expect(manifest).toMatchObject({
      releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      mvpScope: true,
      scope: {
        releaseId: 'CZ-R08L-EE-PF-01-PARTITIONED-FLUID-LINER',
        platformId: 'EE-PF-01',
        assignedTrack: 1,
        geometry: {
          fluidTargets: {
            cellCount: 78,
            coordinateSetSha256:
              'ced3a061ff951b1091130b0a0cab95076dc3408ffd867e8e2e5dd1ce236693f2',
          },
          stableLavaTargets: {
            cellCount: 73,
            coordinateSetSha256:
              '352b745a87b9ff224c987ae68f8f4d2b05ae40bbe1883b0aab6c5374d0cc1aed',
          },
          temporaryInteriorLavaLiner: { cellCount: 57 },
          retainedOuterLavaContainmentLiner: { cellCount: 16 },
          retainedExternalLavaSources: { cellCount: 16 },
          flowOrderedWaterBoundaryTargets: {
            cellCount: 5,
            coordinateSetSha256:
              '057314836ffcdfde085252a093305265de6b3fd31a19f14695841739ad4e533f',
          },
          retainedDirectWaterFeed: { cellCount: 5 },
          minimumFluidComponentManhattanSeparation: 42,
        },
        operationalBoundary: {
          futureLineOpeningCreated: false,
          nearestDeferredFutureLineSealX: 1872,
          targetMaximumX: 1749,
          minimumXSeparationFromDeferredFutureLineSeal: 123,
          retainedExternalLavaSourcesModified: false,
          retainedExternalWaterFeedModified: false,
        },
      },
      source: {
        snapshotRoot: SNAPSHOT,
        completeSaveSha256:
          '857271dc24e4558a28e647c83f006744785d73fb45614b1c3c6c72c43b6f9757',
        sourceStateCensus: {
          'minecraft:lava[level=0]': 73,
          'minecraft:water[level=2]': 1,
          'minecraft:water[level=3]': 1,
          'minecraft:water[level=4]': 1,
          'minecraft:water[level=5]': 1,
          'minecraft:water[level=6]': 1,
        },
      },
      target: {
        operatedUnion: { cellCount: 78 },
        desiredStateCensus: { 'minecraft:deepslate_tiles': 78 },
        packageTargetsDisjoint: true,
      },
      isolation: {
        fluidComponentCount: 2,
        undeclaredFluidStateCount: 0,
        forbiddenContainerOrControlInteractionCount: 0,
        blockEntityInteractionCount: 0,
        savedEntityInteractionCount: 0,
        protectedRelicCoreIntersectionCount: 0,
        undeclaredPriorReleaseIntersectionCount: 0,
      },
    });
  });

  it('closes stable lava interior-first and restores it in exact reverse order', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    expect(manifest.lavaSourceContract).toMatchObject({
      status: 'PASS_STABLE_SOURCES_INTERIOR_FIRST_CONTAINMENT_LAST',
      targetCount: 73,
      allTargetsExactLevelZeroSources: true,
      externalAdjacentSourceCount: 16,
      forwardOrder: {
        semantic: 'chamber-interior-first-outer-containment-row-last',
        orderedCellKeySha256:
          '35714d9c46bbdc4ddf7136091d836c737d61d36b21cce6762f56856227ffadd6',
        firstCell: { x: 1704, y: 43, z: 57 },
        lastCell: { x: 1707, y: 42, z: 63 },
      },
      rollbackOrder: {
        semantic: 'outer-containment-row-first-then-chamber-interior',
        exactReverseOfForward: true,
      },
    });
    const forward = operationLines(LAVA_FORWARD);
    const rollback = operationLines(LAVA_ROLLBACK);
    expect(forward).toHaveLength(73);
    expect(forward.slice(-16).every((line) => line.split(' ')[3] === '63')).toBe(true);
    expect(forward.every((line) => line.endsWith(
      'minecraft:lava[level=0] minecraft:deepslate_tiles',
    ))).toBe(true);
    expect(rollback).toEqual(exactReverse(forward));
  });

  it('removes the water tail downstream-first from five retained direct feeds', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    expect(manifest.waterFlowDependencyContract).toEqual({
      status: 'PASS_ACYCLIC_FIVE_RETAINED_DIRECT_FEEDS',
      targetCount: 5,
      edgeCount: 4,
      edgeSetSha256:
        'c02998a5b65facf57a628b45f47e3300dae9211cd567ad32ae93bc74c0171c77',
      retainedDirectFeedCount: 5,
      forwardOrder: {
        semantic: 'downstream-to-upstream',
        orderedCellKeySha256:
          'a77890eb7cefd6d991d5622280a66d31ac8ebbbc9733cd5684a8e14cef956b53',
        firstCell: { x: 1745, y: 40, z: 55 },
        lastCell: { x: 1749, y: 40, z: 55 },
      },
      rollbackOrder: {
        semantic: 'upstream-to-downstream',
        exactReverseOfForward: true,
        firstCell: { x: 1749, y: 40, z: 55 },
        lastCell: { x: 1745, y: 40, z: 55 },
      },
    });
    expect(manifest.source.retainedWaterFeed.map((entry: { observedState: string }) => (
      entry.observedState
    ))).toEqual([
      'minecraft:water[level=5]',
      'minecraft:water[level=4]',
      'minecraft:water[level=3]',
      'minecraft:water[level=2]',
      'minecraft:water[level=1]',
    ]);
    expect(manifest.source.retainedWaterRoot).toMatchObject({
      cell: { x: 1750, y: 40, z: 54 },
      observedState: 'minecraft:water[level=8]',
    });
    const forward = operationLines(WATER_FORWARD);
    const rollback = operationLines(WATER_ROLLBACK);
    expect(forward.map((line) => line.split(' ').slice(1, 4).join(',')))
      .toEqual(EXPECTED_WATER_ORDER);
    expect(rollback).toEqual(exactReverse(forward));
  });

  it('uses exact reverse package order and has no irreducibly unsafe component', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    expect(manifest.executionOrder).toMatchObject({
      forward: [LAVA_KEY, WATER_KEY],
      rollback: [WATER_KEY, LAVA_KEY],
    });
    expect(manifest.physicsContract).toMatchObject({
      status: 'PASS_PARTITIONED_STABLE_LAVA_AND_ACYCLIC_WATER',
      irreducibleUnsafeComponentCount: 0,
      irreduciblePhysicsRisk: 'NONE_BEYOND_SOURCE_DRIFT_CAUGHT_BY_EXACT_STRICT_GUARDS',
    });
  });

  it('keeps the generic source-only compiler fail-closed for PF01', () => {
    const genericDirectory = path.join(DIRECTORY, 'generic-reject');
    expect(() => execFileSync(process.execPath, [
      'scripts/compile_combined_zones_r08_wet_platform_liner.mjs',
      '--snapshot',
      SNAPSHOT,
      '--intake-audit',
      INTAKE,
      '--platform-id',
      'EE-PF-01',
      '--out-dir',
      genericDirectory,
    ], { cwd: ROOT, stdio: 'pipe' })).toThrow();
    expect(fs.existsSync(genericDirectory)).toBe(false);
  });

  it('refuses a complete-save intake that is not bound to the selected snapshot', () => {
    expect(() => execFileSync(process.execPath, [
      SCRIPT,
      '--snapshot',
      SNAPSHOT,
      '--intake-audit',
      'data/world-review/combined-zones-r08i-live-20260821T171300Z/post-complete-save-intake.json',
      '--out-dir',
      path.join(DIRECTORY, 'mismatched-intake'),
    ], { cwd: ROOT, stdio: 'pipe' })).toThrow();
  });

  it('passes manifest QA, exact source guards, and ordered projected rollback', () => {
    const qa = path.join(DIRECTORY, 'manifest-qa.json');
    execFileSync(process.execPath, [
      'scripts/qa_guarded_release_manifest.mjs',
      '--manifest',
      MANIFEST,
      '--out',
      qa,
    ], { cwd: ROOT, stdio: 'pipe' });
    expect(JSON.parse(fs.readFileSync(qa, 'utf8'))).toMatchObject({
      status: 'PASS',
      totals: {
        packages: 2,
        passedPackages: 2,
        uniqueTargetCells: 78,
        crossPackageIntersectionCells: 0,
      },
    });

    const preflight = (ops: string, report: string, overlays: string[] = []) => {
      execFileSync(process.execPath, [
        'scripts/preflight_guarded_ops.mjs',
        ops,
        '--regions',
        `${SNAPSHOT}/region`,
        ...overlays.flatMap((overlay) => ['--source-overlay-ops', overlay]),
        '--report',
        report,
      ], { cwd: ROOT, stdio: 'pipe' });
      return JSON.parse(fs.readFileSync(report, 'utf8'));
    };
    expect(preflight(LAVA_FORWARD, path.join(DIRECTORY, 'lava-forward.json')))
      .toMatchObject({ status: 'PASS', passed: 73, failed: 0 });
    expect(preflight(WATER_FORWARD, path.join(DIRECTORY, 'water-forward.json')))
      .toMatchObject({ status: 'PASS', passed: 5, failed: 0 });
    expect(preflight(
      WATER_ROLLBACK,
      path.join(DIRECTORY, 'water-projected-rollback.json'),
      [LAVA_FORWARD, WATER_FORWARD],
    )).toMatchObject({ status: 'PASS', passed: 5, failed: 0 });
    expect(preflight(
      LAVA_ROLLBACK,
      path.join(DIRECTORY, 'lava-projected-rollback.json'),
      [LAVA_FORWARD, WATER_FORWARD, WATER_ROLLBACK],
    )).toMatchObject({ status: 'PASS', passed: 73, failed: 0 });
  }, 30_000);

  it('passes strict-noop parser checks', () => {
    for (const [filename, role, groupCount] of [
      [LAVA_FORWARD, 'forward', 73],
      [LAVA_ROLLBACK, 'rollback', 73],
      [WATER_FORWARD, 'forward', 5],
      [WATER_ROLLBACK, 'rollback', 5],
    ] as const) {
      const report = `${filename}.dry-run.json`;
      execFileSync('python3', [
        'scripts/rcon_runner.py',
        filename,
        '--dry-run',
        '--strict-noop',
        '--operation-role',
        role,
        '--report',
        report,
      ], { cwd: ROOT, stdio: 'pipe' });
      expect(JSON.parse(fs.readFileSync(report, 'utf8'))).toMatchObject({
        status: 'dry_run',
        strictNoop: true,
        operationRole: role,
        sourceGroupCount: groupCount,
        failedGroups: 0,
        worldEditLeftoverCount: 0,
      });
    }

  });

  it('retains scoped wrapper print-plan compatibility', () => {
    const canonical = JSON.parse(fs.readFileSync(CANONICAL_MANIFEST, 'utf8'));
    expect(canonical.manifestIdentity)
      .toBe('4748da1d7c16200420a599173a5a8693c03aa134edef74d360bb5d5b50217434');
    const plan = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_combined_zones_scoped_release.mjs',
      '--manifest',
      `data/buildops/${BASENAME}.release-manifest.json`,
      '--release-node',
      'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8' }));
    expect(plan).toMatchObject({
      mode: 'PREPARE_ONLY',
      globalGateDependency: 'NONE',
      packageOrder: [LAVA_KEY, WATER_KEY],
    });
  });
});
