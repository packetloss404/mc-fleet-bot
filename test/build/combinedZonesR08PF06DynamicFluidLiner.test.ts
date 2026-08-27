import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r08_pf06_dynamic_fluid_liner.mjs',
);
const BASENAME = 'combined-zones-r08-empty-eight-platform-06-dynamic-fluid-liner';
const FLUID_KEY = 'ee-pf-06-dynamic-fluid-liner';
const SUPPORT_KEY = 'ee-pf-06-lichen-support-anchor';
const SNAPSHOT = 'data/worldsnap-combined-zones-r08g-post-20260821T170100Z';
const INTAKE =
  'data/world-review/combined-zones-r08g-live-20260821T170100Z/post-complete-save-intake.json';
const DIRECTORY = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-r08-pf06-liner-'));
const MANIFEST = path.join(DIRECTORY, `${BASENAME}.release-manifest.json`);
const FLUID_FORWARD = path.join(DIRECTORY, `${BASENAME}.${FLUID_KEY}.forward.txt`);
const FLUID_ROLLBACK = path.join(DIRECTORY, `${BASENAME}.${FLUID_KEY}.rollback.txt`);
const SUPPORT_FORWARD = path.join(DIRECTORY, `${BASENAME}.${SUPPORT_KEY}.forward.txt`);
const SUPPORT_ROLLBACK = path.join(DIRECTORY, `${BASENAME}.${SUPPORT_KEY}.rollback.txt`);
const CANONICAL_MANIFEST = path.join(ROOT, 'data/buildops', `${BASENAME}.release-manifest.json`);
const LICHEN_STATE =
  'minecraft:glow_lichen[down=false,east=false,north=false,south=true,up=false,waterlogged=true,west=false]';

let firstArtifacts: Buffer[] = [];

function operationLines(filename: string): string[] {
  return fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line.startsWith('REPL '));
}

beforeAll(() => {
  const args = [
    SCRIPT,
    '--generated-at',
    '2026-08-21T17:03:00Z',
    '--snapshot',
    SNAPSHOT,
    '--intake-audit',
    INTAKE,
    '--out-dir',
    DIRECTORY,
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstArtifacts = [
    MANIFEST,
    FLUID_FORWARD,
    FLUID_ROLLBACK,
    SUPPORT_FORWARD,
    SUPPORT_ROLLBACK,
  ].map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => fs.rmSync(DIRECTORY, { recursive: true, force: true }));

describe('Combined Zones R08H PF06 dynamic-fluid liner', () => {
  it('regenerates all five guarded artifacts byte-for-byte', () => {
    expect([
      MANIFEST,
      FLUID_FORWARD,
      FLUID_ROLLBACK,
      SUPPORT_FORWARD,
      SUPPORT_ROLLBACK,
    ].map((filename) => fs.readFileSync(filename))).toEqual(firstArtifacts);
  });

  it('accepts only the reviewed exact waterlogged point and owns its support', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    expect(manifest).toMatchObject({
      releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      mvpScope: true,
      executionOrder: {
        forward: [FLUID_KEY, SUPPORT_KEY],
        rollback: [SUPPORT_KEY, FLUID_KEY],
      },
      scope: {
        releaseId: 'CZ-R08H-EE-PF-06-DYNAMIC-FLUID-LINER',
        platformId: 'EE-PF-06',
        assignedTrack: 6,
        geometry: {
          dynamicFluidTargets: {
            cellCount: 100,
            coordinateSetSha256:
              '99e9ce70744b295160fa12cdeea18f111d8c6c5e3623b6711597f34ebc6e7d07',
          },
          temporaryInteriorLiner: { cellCount: 58 },
          retainedContainmentLiner: { cellCount: 42 },
          lichenSupportAnchor: {
            cellCount: 1,
            coordinateSetSha256:
              'd452602a77bdcccd5bf16cfb0a240fe6dc05151b8784f8161a035cd5404d0996',
          },
          operatedUnion: {
            cellCount: 101,
            coordinateSetSha256:
              'f538295faccb85ea0d35a57be3e11db29a406a41dbe25d482b3082656924c0e5',
          },
        },
        materialDoctrine: {
          stableSourceWaterAccepted: true,
          flowingWaterAccepted: false,
          broadWaterloggedStateAccepted: false,
          exactWaterloggedException: {
            cell: { x: 1658, y: 46, z: 128 },
            sourceState: LICHEN_STATE,
            supportDirection: 'south',
            supportCell: { x: 1658, y: 46, z: 129 },
            supportSourceState: 'minecraft:granite',
            exceptionCount: 1,
          },
        },
      },
      source: {
        completeSaveSha256:
          'c405342d83f0c4ae8d97a82667542e1d5c22a893cdc9ee2bb0c8b9bfc9f03d8d',
        fluidSourceStateCensus: {
          'minecraft:water[level=0]': 99,
          [LICHEN_STATE]: 1,
        },
        supportSourceState: 'minecraft:granite',
      },
      target: {
        operatedUnion: { cellCount: 101 },
        desiredStateCensus: { 'minecraft:deepslate_tiles': 101 },
        packageTargetsDisjoint: true,
      },
      isolation: {
        undeclaredDynamicFluidStateCount: 0,
        forbiddenContainerOrControlInteractionCount: 0,
        blockEntityInteractionCount: 0,
        savedEntityInteractionCount: 0,
        protectedRelicCoreIntersectionCount: 0,
        undeclaredPriorReleaseIntersectionCount: 0,
      },
      physicsContract: {
        status: 'PASS_EXACT_ORDERED_WATERLOGGED_POINT_WITH_OWNED_SUPPORT',
        otherDynamicStatesAccepted: false,
      },
    });
  });

  it('emits exact reverse inverses with support-safe package order', () => {
    const fluidForward = operationLines(FLUID_FORWARD);
    const fluidRollback = operationLines(FLUID_ROLLBACK);
    const supportForward = operationLines(SUPPORT_FORWARD);
    const supportRollback = operationLines(SUPPORT_ROLLBACK);
    expect(fluidForward).toHaveLength(100);
    expect(fluidRollback).toHaveLength(100);
    expect(supportForward).toEqual([
      'REPL 1658 46 129 1658 46 129 minecraft:granite minecraft:deepslate_tiles',
    ]);
    expect(supportRollback).toEqual([
      'REPL 1658 46 129 1658 46 129 minecraft:deepslate_tiles minecraft:granite',
    ]);
    expect(fluidForward).toContain(
      `REPL 1658 46 128 1658 46 128 ${LICHEN_STATE} minecraft:deepslate_tiles`,
    );
    expect(fluidRollback).toContain(
      `REPL 1658 46 128 1658 46 128 minecraft:deepslate_tiles ${LICHEN_STATE}`,
    );
    const expectedFluidRollback = fluidForward.slice().reverse().map((line) => {
      const fields = line.split(' ');
      return [...fields.slice(0, 7), fields[8], fields[7]].join(' ');
    });
    expect(fluidRollback).toEqual(expectedFluidRollback);
  });

  it('keeps the generic wet-liner compiler fail-closed for PF06', () => {
    const genericDirectory = path.join(DIRECTORY, 'generic-reject');
    expect(() => execFileSync(process.execPath, [
      'scripts/compile_combined_zones_r08_wet_platform_liner.mjs',
      '--snapshot',
      SNAPSHOT,
      '--intake-audit',
      INTAKE,
      '--platform-id',
      'EE-PF-06',
      '--out-dir',
      genericDirectory,
    ], { cwd: ROOT, stdio: 'pipe' })).toThrow();
    expect(fs.existsSync(genericDirectory)).toBe(false);
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
        uniqueTargetCells: 101,
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
    expect(preflight(FLUID_FORWARD, path.join(DIRECTORY, 'fluid-forward.json')))
      .toMatchObject({ status: 'PASS', passed: 100, failed: 0 });
    expect(preflight(SUPPORT_FORWARD, path.join(DIRECTORY, 'support-forward.json')))
      .toMatchObject({ status: 'PASS', passed: 1, failed: 0 });
    expect(preflight(
      SUPPORT_ROLLBACK,
      path.join(DIRECTORY, 'support-projected-rollback.json'),
      [FLUID_FORWARD, SUPPORT_FORWARD],
    )).toMatchObject({ status: 'PASS', passed: 1, failed: 0 });
    expect(preflight(
      FLUID_ROLLBACK,
      path.join(DIRECTORY, 'fluid-projected-rollback.json'),
      [FLUID_FORWARD, SUPPORT_FORWARD, SUPPORT_ROLLBACK],
    )).toMatchObject({ status: 'PASS', passed: 100, failed: 0 });
  }, 30_000);

  it('passes all strict-noop parser checks and the scoped wrapper contract', () => {
    for (const [filename, role] of [
      [FLUID_FORWARD, 'forward'],
      [FLUID_ROLLBACK, 'rollback'],
      [SUPPORT_FORWARD, 'forward'],
      [SUPPORT_ROLLBACK, 'rollback'],
    ]) {
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
        failedGroups: 0,
        worldEditLeftoverCount: 0,
      });
    }

    const canonical = JSON.parse(fs.readFileSync(CANONICAL_MANIFEST, 'utf8'));
    expect(canonical.manifestIdentity)
      .toBe('e4626dace762469f5f2ab4e450c345a214b379d503bc9f77e1db7dad6974d435');
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
      packageOrder: [FLUID_KEY, SUPPORT_KEY],
    });
  });
});
