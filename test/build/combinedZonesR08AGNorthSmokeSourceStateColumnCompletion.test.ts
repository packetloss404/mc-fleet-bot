import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT,
  'scripts/compile_combined_zones_r08ag_north_smoke_source_state_column_completion.mjs');
const WRAPPER = path.join(ROOT, 'scripts/run_combined_zones_scoped_release.mjs');
const BASE = 'combined-zones-r08ag-empty-eight-north-smoke-source-state-column-completion';
const KEY = 'ee-smoke-n-source-state-column-completion';
const MANIFEST = path.join(ROOT, `data/buildops/${BASE}.release-manifest.json`);
const EVIDENCE = path.join(ROOT,
  'data/world-review/combined-zones-r08ag-north-smoke-source-state-column-completion-offline');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'r08ag-'));
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const artifactPaths = (directory: string) => [
  `${BASE}.${KEY}.forward.txt`,
  `${BASE}.${KEY}.rollback.txt`,
  `${BASE}.release-manifest.json`,
].map((filename) => path.join(directory, filename));
let firstGeneration: Buffer[] = [];

beforeAll(() => {
  execFileSync(process.execPath, [SCRIPT, '--out-dir', temporaryDirectory, '--basename', BASE], {
    cwd: ROOT,
    stdio: 'pipe',
  });
  firstGeneration = artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, [SCRIPT, '--out-dir', temporaryDirectory, '--basename', BASE], {
    cwd: ROOT,
    stdio: 'pipe',
  });
}, 30_000);

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('R08AG north-smoke source-state column completion', () => {
  it('is deterministic and byte-identical to the canonical artifacts', () => {
    expect(artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstGeneration);
    expect(firstGeneration)
      .toEqual(artifactPaths(path.join(ROOT, 'data/buildops')).map((filename) => fs.readFileSync(filename)));
  });

  it('selects the unique exact dry source-state residual', () => {
    expect(readJson(MANIFEST)).toMatchObject({
      status: 'COMPILED_FROM_ACCEPTED_R08AF_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      mvpScope: true,
      scope: {
        geometry: {
          selectedSourceStateColumnCompletion: {
            cellCount: 7,
            width: 1,
            height: 7,
            componentCount: 1,
          },
          interactionHalo: { cellCount: 30 },
        },
      },
      source: {
        exactTargetStateCensus: {
          'minecraft:air': 6,
          'minecraft:stone': 1,
        },
      },
      isolation: {
        targetFluidIntersectionCount: 0,
        targetGravityIntersectionCount: 0,
        interactionHaloFluidCount: 0,
        interactionHaloGravityCount: 0,
        checkedPriorManifestCount: 56,
        undeclaredPriorReleaseIntersectionCount: 0,
      },
    });
  });

  it('emits the exact reverse inverse', () => {
    const manifest = readJson(MANIFEST);
    const forward = fs.readFileSync(path.join(ROOT, manifest.packages[0].forward), 'utf8')
      .split(/\r?\n/).filter((line: string) => line.startsWith('REPL '));
    const rollback = fs.readFileSync(path.join(ROOT, manifest.packages[0].rollback), 'utf8')
      .split(/\r?\n/).filter((line: string) => line.startsWith('REPL '));
    expect(forward).toHaveLength(7);
    expect(rollback).toEqual(forward.slice().reverse().map((line: string) => {
      const fields = line.split(/\s+/);
      return [...fields.slice(0, 7), fields[8], fields[7]].join(' ');
    }));
  });

  it('passes all offline and real wrapper plan gates', () => {
    expect(readJson(path.join(EVIDENCE, 'manifest-qa.json'))).toMatchObject({
      status: 'PASS',
      totals: { uniqueTargetCells: 7 },
    });
    for (const filename of ['forward-source-preflight.json', 'projected-rollback-preflight.json']) {
      expect(readJson(path.join(EVIDENCE, filename))).toMatchObject({ status: 'PASS', passed: 7, failed: 0 });
    }
    for (const filename of ['forward-strict-dry-run.json', 'rollback-strict-dry-run.json']) {
      expect(readJson(path.join(EVIDENCE, filename))).toMatchObject({
        status: 'dry_run',
        strictNoop: true,
        worldEditLeftoverCount: 0,
      });
    }
    expect(readJson(path.join(EVIDENCE, 'block-entity-clearance.json'))).toMatchObject({
      status: 'PASS',
      blockingBlockEntityCount: 0,
    });
    const plan = JSON.parse(execFileSync(process.execPath, [
      WRAPPER,
      '--manifest', path.relative(ROOT, MANIFEST),
      '--release-node', 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8' }));
    expect(plan).toMatchObject({
      mode: 'PREPARE_ONLY',
      globalGateDependency: 'NONE',
      packageOrder: [KEY],
    });
  });

  it('binds the manifest payload identity', () => {
    const manifest = readJson(MANIFEST);
    const { manifestIdentity, ...payload } = manifest;
    expect(crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'))
      .toBe(manifestIdentity);
    expect(manifestIdentity)
      .toBe('197ac7f5c7a7973996d87ab9196138bd2d4a1ed33b3871d0807cc87f6d22b553');
  });
});
