import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/compile_combined_zones_r08_wet_platform_liner.mjs');
const BASENAME = 'combined-zones-r08-empty-eight-platform-04-wet-liner';
const DIRECTORY = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-r08-wet-liner-'));
const MANIFEST = path.join(DIRECTORY, `${BASENAME}.release-manifest.json`);
const FORWARD = path.join(
  DIRECTORY,
  `${BASENAME}.ee-pf-04-source-fluid-liner.forward.txt`,
);
const ROLLBACK = path.join(
  DIRECTORY,
  `${BASENAME}.ee-pf-04-source-fluid-liner.rollback.txt`,
);

let firstArtifacts: Buffer[] = [];

beforeAll(() => {
  const args = [
    SCRIPT,
    '--generated-at',
    '2026-08-21T16:46:00Z',
    '--snapshot',
    'data/worldsnap-combined-zones-r10a-post-20260821T163935Z',
    '--intake-audit',
    'data/world-review/combined-zones-r10a-live-20260821T163935Z/post-complete-save-intake.json',
    '--out-dir',
    DIRECTORY,
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstArtifacts = [MANIFEST, FORWARD, ROLLBACK].map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => fs.rmSync(DIRECTORY, { recursive: true, force: true }));

describe('Combined Zones R08 wet-platform source-fluid liner', () => {
  it('regenerates all guarded artifacts byte-for-byte', () => {
    expect([MANIFEST, FORWARD, ROLLBACK].map((filename) => fs.readFileSync(filename)))
      .toEqual(firstArtifacts);
  });

  it('partitions the exact 120-cell PF-04 source-water pocket', () => {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    expect(manifest).toMatchObject({
      releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      scope: {
        platformId: 'EE-PF-04',
        assignedTrack: 4,
        geometry: {
          fluidSourceTargets: { cellCount: 120 },
          temporaryInteriorLiner: { cellCount: 86 },
          retainedContainmentLiner: { cellCount: 34 },
        },
      },
      source: {
        completeSaveSha256:
          'bb667794a20a2a580ba322eef19e60ac50bf51ff81ba5537702b26036c829486',
        sourceStateCensus: { 'minecraft:water[level=0]': 120 },
      },
      target: {
        operatedUnion: { cellCount: 120 },
        desiredStateCensus: { 'minecraft:deepslate_tiles': 120 },
      },
      isolation: {
        unstableFluidStateCount: 0,
        forbiddenContainerOrControlHaloCount: 0,
        blockEntityHaloIntersectionCount: 0,
        savedEntityHaloIntersectionCount: 0,
        protectedRelicCoreIntersectionCount: 0,
      },
    });
  });

  it('emits 120 exact point guards and their reverse-order inverse', () => {
    const forward = fs.readFileSync(FORWARD, 'utf8').split(/\r?\n/)
      .filter((line) => line.startsWith('REPL '));
    const rollback = fs.readFileSync(ROLLBACK, 'utf8').split(/\r?\n/)
      .filter((line) => line.startsWith('REPL '));
    expect(forward).toHaveLength(120);
    expect(rollback).toHaveLength(120);
    expect(forward.every((line) => (
      line.endsWith('minecraft:water[level=0] minecraft:deepslate_tiles')
    ))).toBe(true);
    const expectedRollback = forward.slice().reverse().map((line) => (
      line.replace(
        'minecraft:water[level=0] minecraft:deepslate_tiles',
        'minecraft:deepslate_tiles minecraft:water[level=0]',
      )
    ));
    expect(rollback).toEqual(expectedRollback);
  });

  it('passes manifest QA and the scoped wrapper contract', () => {
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
      totals: { passedPackages: 1, uniqueTargetCells: 120 },
    });
    const plan = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_combined_zones_scoped_release.mjs',
      '--manifest',
      `data/buildops/${BASENAME}.release-manifest.json`,
      '--release-node',
      'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8' }));
    expect(plan.packageOrder).toEqual(['ee-pf-04-source-fluid-liner']);
    expect(plan.globalGateDependency).toBe('NONE');
  });
});
