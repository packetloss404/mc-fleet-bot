import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/compile_combined_zones_r08_empty_eight_fitout.mjs');
const BASENAME = 'combined-zones-r08-empty-eight-platform-01-fitout';
const ENCLOSURE_KEY = 'ee-pf-01-enclosure-finish';
const CLEARANCE_KEY = 'ee-pf-01-interior-clearance';
const SNAPSHOT = 'data/worldsnap-combined-zones-r08l-liner-post-20260821T174037Z';
const INTAKE =
  'data/world-review/combined-zones-r08l-liner-live-20260821T174037Z/post-complete-save-intake.json';
const LEDGER =
  'data/world-review/combined-zones-r08l-liner-live-20260821T174037Z/evidence-ledger.json';
const SUPPORT_LINER = 'data/buildops/combined-zones-r06-support-liner.release-manifest.json';
const PF01_LINER =
  'data/buildops/combined-zones-r08-empty-eight-platform-01-partitioned-fluid-liner.release-manifest.json';
const DIRECTORY = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-r08-pf01-fitout-'));
const MANIFEST = path.join(DIRECTORY, `${BASENAME}.release-manifest.json`);
const ENCLOSURE_FORWARD = path.join(DIRECTORY, `${BASENAME}.${ENCLOSURE_KEY}.forward.txt`);
const ENCLOSURE_ROLLBACK = path.join(DIRECTORY, `${BASENAME}.${ENCLOSURE_KEY}.rollback.txt`);
const CLEARANCE_FORWARD = path.join(DIRECTORY, `${BASENAME}.${CLEARANCE_KEY}.forward.txt`);
const CLEARANCE_ROLLBACK = path.join(DIRECTORY, `${BASENAME}.${CLEARANCE_KEY}.rollback.txt`);
const CANONICAL_MANIFEST = path.join(ROOT, 'data/buildops', `${BASENAME}.release-manifest.json`);

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

function compileArgs(outDir: string): string[] {
  return [
    SCRIPT,
    '--generated-at', '2026-08-21T17:42:00Z',
    '--snapshot', SNAPSHOT,
    '--intake-audit', INTAKE,
    '--source-release-ledger', LEDGER,
    '--platform-id', 'EE-PF-01',
    '--package-release-id', 'CZ-R08M-EE-PF-01-ENCLOSED-FITOUT',
    '--manifest-status',
    'COMPILED_FROM_ACCEPTED_R08L_LINER_POST_AWAITING_FRESH_EXECUTION_KERNEL',
    '--source-liner-manifest', SUPPORT_LINER,
    '--source-liner-manifest', PF01_LINER,
    '--out-dir', outDir,
  ];
}

beforeAll(() => {
  const args = compileArgs(DIRECTORY);
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstArtifacts = [
    MANIFEST,
    ENCLOSURE_FORWARD,
    ENCLOSURE_ROLLBACK,
    CLEARANCE_FORWARD,
    CLEARANCE_ROLLBACK,
  ].map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => fs.rmSync(DIRECTORY, { recursive: true, force: true }));

describe('Combined Zones R08M PF01 permanent fitout', () => {
  it('regenerates all guarded artifacts byte-for-byte', () => {
    expect([
      MANIFEST,
      ENCLOSURE_FORWARD,
      ENCLOSURE_ROLLBACK,
      CLEARANCE_FORWARD,
      CLEARANCE_ROLLBACK,
    ].map((filename) => fs.readFileSync(filename))).toEqual(firstArtifacts);
  });

  it('binds the accepted R08L liner ledger and complete post save', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    expect(manifest).toMatchObject({
      releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      mvpScope: true,
      status: 'COMPILED_FROM_ACCEPTED_R08L_LINER_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      scope: {
        releaseId: 'CZ-R08M-EE-PF-01-ENCLOSED-FITOUT',
        platformId: 'EE-PF-01',
        assignedTrack: 1,
      },
      source: {
        snapshotRoot: SNAPSHOT,
        completeSaveSha256:
          '26e69865759ae13ceb5397b0bdcc92e226c4f7d0ddb4b3e2c77da9e8e2b3b84b',
        sourceReleaseLedger: {
          path: LEDGER,
          status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
          completedReleaseIdentitySha256:
            '12fc8040c9b40f7579e4c394b562526723ebf8c8314977776cd2d658b102178d',
        },
      },
    });
    expect(manifest.upstreamIdentities.sourceLinerManifests).toEqual([
      {
        path: SUPPORT_LINER,
        manifestIdentity:
          'b671d1f88137951ca0b1e25cf3e2c93e7db4d87b30db614223925af28e12bf07',
      },
      {
        path: PF01_LINER,
        manifestIdentity:
          '4748da1d7c16200420a599173a5a8693c03aa134edef74d360bb5d5b50217434',
      },
    ]);
  });

  it('preserves chamber geometry, carriers, lights, barrier, and sealed interfaces', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    expect(manifest.scope.geometry).toMatchObject({
      chamberPrism: { cellCount: 4242 },
      floor: { cellCount: 707 },
      clearInterior: { cellCount: 2432 },
      ceiling: { cellCount: 707 },
      completeFailClosedBarrier: { cellCount: 202 },
      retainedBarrier: { cellCount: 178 },
      staticGateCaps: { cellCount: 24 },
      existingLightingFixtures: { cellCount: 7 },
      preservedR02Mechanisms: { cellCount: 201 },
      preservedR02CarrierBands: { cellCount: 194 },
      exactDryHalo: {
        fluidCellCount: 0,
        observedFluidCellCount: 0,
        containedExternalFluidCellCount: 0,
      },
    });
    expect(manifest.scope.transportBoundary).toEqual({
      trackCenterlineZ: 54,
      trackCommissioned: false,
      poweredGateMechanismInstalled: false,
      futureLineSealCellCount: 200,
      futureLineSealIntersectionCount: 0,
      nearestFutureLineSealX: 1872,
      fitoutMaxX: 1752,
      minimumXSeparationBlocks: 120,
      futureLineOpeningsDeferred: true,
    });
  });

  it('preserves exact outer lava containment, water boundary, feeds, and source edge', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    expect(manifest.isolation.retainedSourceLinerBoundary).toEqual({
      cellCount: 21,
      bounds: { minX: 1700, maxX: 1749, minY: 40, maxY: 43, minZ: 55, maxZ: 63 },
      coordinateSetSha256:
        '258c990049ba981fb5cfd964dbe140b3197d24d1fdb84d84fd1f008cb8dc4ddc',
    });
    expect(manifest.isolation.pf01RetentionContract).toEqual({
      status: 'PASS_EXACT_RETAINED_CONTAINMENT_AND_FEEDS',
      retainedOuterLavaContainment: expect.objectContaining({
        cellCount: 16,
        coordinateSetSha256:
          'f2c4f3af192ab6bf28db101c46e2a0282075244dac182334cd406e128772ca54',
      }),
      retainedWaterBoundaryLiner: expect.objectContaining({
        cellCount: 5,
        coordinateSetSha256:
          '057314836ffcdfde085252a093305265de6b3fd31a19f14695841739ad4e533f',
      }),
      retainedDirectWaterFeed: expect.objectContaining({
        cellCount: 5,
        coordinateSetSha256:
          'd9824289b273ef811fed46fe6a57edac06e7ec01ff5c88dd3c764ce078d69d88',
      }),
      retainedWaterRoot: {
        cell: { x: 1750, y: 40, z: 54 },
        state: 'minecraft:water[level=8]',
      },
      retainedExternalLavaSources: expect.objectContaining({
        cellCount: 16,
        coordinateSetSha256:
          'a3f6aec2442f9495c37489700bc1a8bcee15dd79f11a2e802d226dbb11672368',
      }),
      fitoutTargetIntersectionCount: 0,
    });
  });

  it('emits 3,859 disjoint transitions with exact reverse package order', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    expect(manifest.executionOrder).toMatchObject({
      forward: [ENCLOSURE_KEY, CLEARANCE_KEY],
      rollback: [CLEARANCE_KEY, ENCLOSURE_KEY],
    });
    expect(manifest.target).toMatchObject({
      operatedUnion: {
        cellCount: 3859,
        coordinateSetSha256:
          '36d587b7cb1ace89e869f832d7e0b75eb92f5ac30c589db7468cbc8bbe95c6f1',
      },
      packageTargetsDisjoint: true,
    });
    const allPoints: string[] = [];
    for (const [key, forwardPath, rollbackPath, count] of [
      [ENCLOSURE_KEY, ENCLOSURE_FORWARD, ENCLOSURE_ROLLBACK, 1609],
      [CLEARANCE_KEY, CLEARANCE_FORWARD, CLEARANCE_ROLLBACK, 2250],
    ] as const) {
      const forward = operationLines(forwardPath);
      const rollback = operationLines(rollbackPath);
      expect(forward).toHaveLength(count);
      expect(rollback).toEqual(exactReverse(forward));
      expect(manifest.operations[key]).toMatchObject({
        forwardCommandCount: count,
        rollbackCommandCount: count,
        exactInverse: true,
      });
      allPoints.push(...forward.map((line) => line.split(' ').slice(1, 4).join(',')));
    }
    expect(new Set(allPoints).size).toBe(3859);
  });

  it('fails closed when the prerequisite liner order is reversed', () => {
    const reversed = compileArgs(path.join(DIRECTORY, 'reversed'));
    const firstLiner = reversed.indexOf('--source-liner-manifest');
    reversed[firstLiner + 1] = PF01_LINER;
    const secondLiner = reversed.indexOf('--source-liner-manifest', firstLiner + 2);
    reversed[secondLiner + 1] = SUPPORT_LINER;
    expect(() => execFileSync(process.execPath, reversed, {
      cwd: ROOT,
      stdio: 'pipe',
    })).toThrow();
    expect(fs.existsSync(path.join(DIRECTORY, 'reversed'))).toBe(false);
  });

  it('passes manifest QA and exact ordered source/rollback preflights', () => {
    const qa = path.join(DIRECTORY, 'manifest-qa.json');
    execFileSync(process.execPath, [
      'scripts/qa_guarded_release_manifest.mjs',
      '--manifest', MANIFEST,
      '--out', qa,
    ], { cwd: ROOT, stdio: 'pipe' });
    expect(JSON.parse(fs.readFileSync(qa, 'utf8'))).toMatchObject({
      status: 'PASS',
      totals: {
        packages: 2,
        passedPackages: 2,
        uniqueTargetCells: 3859,
        crossPackageIntersectionCells: 0,
      },
    });

    const preflight = (ops: string, report: string, overlays: string[] = []) => {
      execFileSync(process.execPath, [
        'scripts/preflight_guarded_ops.mjs',
        ops,
        '--regions', `${SNAPSHOT}/region`,
        ...overlays.flatMap((overlay) => ['--source-overlay-ops', overlay]),
        '--report', report,
      ], { cwd: ROOT, stdio: 'pipe' });
      return JSON.parse(fs.readFileSync(report, 'utf8'));
    };
    expect(preflight(ENCLOSURE_FORWARD, path.join(DIRECTORY, 'enclosure-forward.json')))
      .toMatchObject({ status: 'PASS', passed: 1609, failed: 0 });
    expect(preflight(
      CLEARANCE_FORWARD,
      path.join(DIRECTORY, 'clearance-forward.json'),
      [ENCLOSURE_FORWARD],
    )).toMatchObject({ status: 'PASS', passed: 2250, failed: 0 });
    expect(preflight(
      CLEARANCE_ROLLBACK,
      path.join(DIRECTORY, 'clearance-projected-rollback.json'),
      [ENCLOSURE_FORWARD, CLEARANCE_FORWARD],
    )).toMatchObject({ status: 'PASS', passed: 2250, failed: 0 });
    expect(preflight(
      ENCLOSURE_ROLLBACK,
      path.join(DIRECTORY, 'enclosure-projected-rollback.json'),
      [ENCLOSURE_FORWARD, CLEARANCE_FORWARD, CLEARANCE_ROLLBACK],
    )).toMatchObject({ status: 'PASS', passed: 1609, failed: 0 });
  }, 30_000);

  it('passes all four strict-noop parser dry-runs without invoking the wrapper', () => {
    for (const [filename, role, count] of [
      [ENCLOSURE_FORWARD, 'forward', 1609],
      [ENCLOSURE_ROLLBACK, 'rollback', 1609],
      [CLEARANCE_FORWARD, 'forward', 2250],
      [CLEARANCE_ROLLBACK, 'rollback', 2250],
    ] as const) {
      const report = `${filename}.dry-run.json`;
      execFileSync('python3', [
        'scripts/rcon_runner.py',
        filename,
        '--dry-run',
        '--strict-noop',
        '--operation-role', role,
        '--report', report,
      ], { cwd: ROOT, stdio: 'pipe' });
      expect(JSON.parse(fs.readFileSync(report, 'utf8'))).toMatchObject({
        status: 'dry_run',
        strictNoop: true,
        operationRole: role,
        sourceGroupCount: count,
        failedGroups: 0,
        worldEditLeftoverCount: 0,
      });
    }
    expect(JSON.parse(fs.readFileSync(CANONICAL_MANIFEST, 'utf8')).manifestIdentity)
      .toBe('2e339c92c7505d0a1321263a6ef2d8dc1047868a74fd037b7e4659fc79d69add');
  });
});
