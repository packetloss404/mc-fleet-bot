import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r08_pf05_flow_ordered_liner.mjs',
);
const BASENAME = 'combined-zones-r08-empty-eight-platform-05-flow-ordered-liner';
const PACKAGE_KEY = 'ee-pf-05-flow-ordered-liner';
const SNAPSHOT = 'data/worldsnap-combined-zones-r08i-post-20260821T171300Z';
const INTAKE =
  'data/world-review/combined-zones-r08i-live-20260821T171300Z/post-complete-save-intake.json';
const DIRECTORY = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-r08-pf05-liner-'));
const MANIFEST = path.join(DIRECTORY, `${BASENAME}.release-manifest.json`);
const FORWARD = path.join(DIRECTORY, `${BASENAME}.${PACKAGE_KEY}.forward.txt`);
const ROLLBACK = path.join(DIRECTORY, `${BASENAME}.${PACKAGE_KEY}.rollback.txt`);
const CANONICAL_MANIFEST = path.join(ROOT, 'data/buildops', `${BASENAME}.release-manifest.json`);
const EXPECTED_ORDER = [
  '1694,46,110', '1694,46,109', '1695,46,111', '1695,46,110', '1695,46,109',
  '1696,46,112', '1696,46,111', '1696,46,110', '1696,46,109', '1696,46,108',
  '1697,46,107', '1697,46,111', '1697,46,110', '1697,46,109', '1697,46,108',
  '1698,46,107', '1698,46,110', '1698,46,109', '1698,46,108', '1699,46,109',
  '1699,46,108', '1699,47,108', '1700,47,108', '1701,47,108', '1702,47,108',
];

let firstArtifacts: Buffer[] = [];

function operationLines(filename: string): string[] {
  return fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line.startsWith('REPL '));
}

beforeAll(() => {
  const args = [
    SCRIPT,
    '--generated-at',
    '2026-08-21T17:18:00Z',
    '--snapshot',
    SNAPSHOT,
    '--intake-audit',
    INTAKE,
    '--out-dir',
    DIRECTORY,
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstArtifacts = [MANIFEST, FORWARD, ROLLBACK]
    .map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => fs.rmSync(DIRECTORY, { recursive: true, force: true }));

describe('Combined Zones R08J PF05 flow-ordered liner', () => {
  it('regenerates all guarded artifacts byte-for-byte', () => {
    expect([MANIFEST, FORWARD, ROLLBACK].map((filename) => fs.readFileSync(filename)))
      .toEqual(firstArtifacts);
  });

  it('binds the exact 25-cell flow fan and its retained source chain', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    expect(manifest).toMatchObject({
      releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      mvpScope: true,
      scope: {
        releaseId: 'CZ-R08J-EE-PF-05-FLOW-ORDERED-LINER',
        platformId: 'EE-PF-05',
        assignedTrack: 5,
        geometry: {
          flowTargets: {
            cellCount: 25,
            coordinateSetSha256:
              '27dfe6936a03a2a6120d54a8c07b6b5c93f4fac2e04da94deaaf7f774a9807f0',
          },
          temporaryInteriorLiner: { cellCount: 19 },
          retainedContainmentLiner: { cellCount: 6 },
          retainedUpstreamFeed: { cellCount: 3 },
        },
        sourceStateDoctrine: {
          sourceWaterTargeted: false,
          flowingWaterLevelsAccepted: [1, 2, 3, 4, 5, 6, 7, 8],
          waterloggedStateAccepted: false,
          lavaAccepted: false,
          undeclaredFluidStateAccepted: false,
        },
      },
      source: {
        completeSaveSha256:
          '2ba805086b28a95abd2b277019a9ad5b5a73f53027a94dccd156b5d3f756c061',
        sourceStateCensus: {
          'minecraft:water[level=3]': 5,
          'minecraft:water[level=2]': 4,
          'minecraft:water[level=1]': 3,
          'minecraft:water[level=5]': 3,
          'minecraft:water[level=6]': 3,
          'minecraft:water[level=7]': 3,
          'minecraft:water[level=4]': 2,
          'minecraft:water[level=8]': 2,
        },
        retainedFeed: [
          expect.objectContaining({
            cell: { x: 1702, y: 48, z: 108 },
            observedState: 'minecraft:water[level=8]',
          }),
          expect.objectContaining({
            cell: { x: 1702, y: 49, z: 108 },
            observedState: 'minecraft:water[level=1]',
          }),
          expect.objectContaining({
            cell: { x: 1702, y: 49, z: 109 },
            observedState: 'minecraft:water[level=0]',
          }),
        ],
      },
      target: {
        operatedUnion: { cellCount: 25 },
        desiredStateCensus: { 'minecraft:deepslate_tiles': 25 },
      },
    });
  });

  it('proves an acyclic downstream-first order and exact reverse rollback', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    expect(manifest.flowDependencyContract).toEqual({
      status: 'PASS_ACYCLIC_SINGLE_RETAINED_FEED',
      targetCount: 25,
      edgeCount: 34,
      edgeSetSha256:
        'a2abb19c912d844b53f1eb0af93eb18599a9170022b9e202c2c6ed71686d5b11',
      externalUpstreamTargetBoundaryCount: 1,
      forwardOrder: {
        semantic: 'downstream-to-upstream',
        orderedCellKeySha256:
          '8e4a3c5c8901d59412ee5c521287b0ac631b2c11be8b725dcdb6c0a69236e46b',
        firstCell: { x: 1694, y: 46, z: 110 },
        lastCell: { x: 1702, y: 47, z: 108 },
      },
      rollbackOrder: {
        semantic: 'upstream-to-downstream',
        exactReverseOfForward: true,
        firstCell: { x: 1702, y: 47, z: 108 },
        lastCell: { x: 1694, y: 46, z: 110 },
      },
    });
    expect(manifest.physicsContract).toMatchObject({
      status: 'PASS_FAIL_CLOSED_TOPOLOGICAL_FLOW_ORDER',
      irreducibleUnsafeTickRace: false,
    });

    const forward = operationLines(FORWARD);
    const rollback = operationLines(ROLLBACK);
    expect(forward.map((line) => line.split(' ').slice(1, 4).join(',')))
      .toEqual(EXPECTED_ORDER);
    const expectedRollback = forward.slice().reverse().map((line) => {
      const fields = line.split(' ');
      return [...fields.slice(0, 7), fields[8], fields[7]].join(' ');
    });
    expect(rollback).toEqual(expectedRollback);
  });

  it('keeps the generic source-only compiler fail-closed for PF05', () => {
    const genericDirectory = path.join(DIRECTORY, 'generic-reject');
    expect(() => execFileSync(process.execPath, [
      'scripts/compile_combined_zones_r08_wet_platform_liner.mjs',
      '--snapshot',
      SNAPSHOT,
      '--intake-audit',
      INTAKE,
      '--platform-id',
      'EE-PF-05',
      '--out-dir',
      genericDirectory,
    ], { cwd: ROOT, stdio: 'pipe' })).toThrow();
    expect(fs.existsSync(genericDirectory)).toBe(false);
  });

  it('passes manifest QA, exact source preflight, and projected rollback', () => {
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
      totals: { packages: 1, passedPackages: 1, uniqueTargetCells: 25 },
    });

    const forwardReport = path.join(DIRECTORY, 'forward-preflight.json');
    execFileSync(process.execPath, [
      'scripts/preflight_guarded_ops.mjs',
      FORWARD,
      '--regions',
      `${SNAPSHOT}/region`,
      '--report',
      forwardReport,
    ], { cwd: ROOT, stdio: 'pipe' });
    expect(JSON.parse(fs.readFileSync(forwardReport, 'utf8')))
      .toMatchObject({ status: 'PASS', passed: 25, failed: 0 });

    const rollbackReport = path.join(DIRECTORY, 'rollback-preflight.json');
    execFileSync(process.execPath, [
      'scripts/preflight_guarded_ops.mjs',
      ROLLBACK,
      '--regions',
      `${SNAPSHOT}/region`,
      '--source-overlay-ops',
      FORWARD,
      '--report',
      rollbackReport,
    ], { cwd: ROOT, stdio: 'pipe' });
    expect(JSON.parse(fs.readFileSync(rollbackReport, 'utf8')))
      .toMatchObject({ status: 'PASS', passed: 25, failed: 0 });
  }, 30_000);

  it('passes strict-noop parser checks and the scoped wrapper contract', () => {
    for (const [filename, role] of [
      [FORWARD, 'forward'],
      [ROLLBACK, 'rollback'],
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
        sourceGroupCount: 25,
        failedGroups: 0,
        worldEditLeftoverCount: 0,
      });
    }

    const canonical = JSON.parse(fs.readFileSync(CANONICAL_MANIFEST, 'utf8'));
    expect(canonical.manifestIdentity)
      .toBe('ad8534752e90c22bfc053b7051fce1a86e1cd606455625a7eeb2a92b3f43f1a2');
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
      packageOrder: [PACKAGE_KEY],
    });
  });
});
