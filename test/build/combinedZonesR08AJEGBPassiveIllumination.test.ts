import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r08aj_empty_eight_eg_b_passive_illumination.mjs',
);
const WRAPPER = path.join(ROOT, 'scripts/run_combined_zones_scoped_release.mjs');
const BASE = 'combined-zones-r08aj-empty-eight-eg-b-passive-illumination';
const KEY = 'ee-eg-b-passive-illumination';
const MANIFEST = path.join(ROOT, `data/buildops/${BASE}.release-manifest.json`);
const EVIDENCE = path.join(ROOT, `data/world-review/${BASE}-offline`);
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'r08aj-'));
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const artifacts = (directory: string) => [
  `${BASE}.${KEY}.forward.txt`,
  `${BASE}.${KEY}.rollback.txt`,
  `${BASE}.release-manifest.json`,
].map((filename) => path.join(directory, filename));
let first: Buffer[] = [];

beforeAll(() => {
  execFileSync(process.execPath, [SCRIPT, '--out-dir', temporaryDirectory, '--basename', BASE], {
    cwd: ROOT,
    stdio: 'pipe',
  });
  first = artifacts(temporaryDirectory).map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, [SCRIPT, '--out-dir', temporaryDirectory, '--basename', BASE], {
    cwd: ROOT,
    stdio: 'pipe',
  });
}, 30_000);

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('R08AJ EG-B passive illumination', () => {
  it('is deterministic and canonical', () => {
    expect(artifacts(temporaryDirectory).map((filename) => fs.readFileSync(filename))).toEqual(first);
    expect(first).toEqual(artifacts(path.join(ROOT, 'data/buildops')).map(
      (filename) => fs.readFileSync(filename),
    ));
  });

  it('derives the exact closed-cap P11 fixture grid', () => {
    expect(readJson(MANIFEST)).toMatchObject({
      status: 'COMPILED_FROM_ACCEPTED_R08AI_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      mvpScope: true,
      scope: {
        geometry: {
          roofCap: { cellCount: 49 },
          passiveFixtureGrid: {
            cellCount: 9,
            coordinateSetSha256: '0c6494129a5b5bc3d6ad65e3f2d5fec4d54c822438abf0f7ff584dc8e1071be3',
          },
          retainedRoofCap: { cellCount: 40 },
          interactionHalo: {
            cellCount: 42,
            coordinateSetSha256: '0407aec1d4eaa2715c8b19e8dc30d4b26033e1a8c0202ed89eb51e681b8b6a9f',
          },
        },
        material: { paletteId: 'EE-P11', block: 'minecraft:sea_lantern', fixtureCount: 9 },
        operationalBoundary: {
          passiveNormalIlluminationAccepted: true,
          roofCapRemainsClosed: true,
          photometricValidationClaimed: false,
          emergencyPowerOrLightingCommissioned: false,
          egressCommissioned: false,
          accessibleRouteCommissioned: false,
          externalContinuationAuthorized: false,
          spineOpeningAuthorized: false,
        },
      },
    });
  });

  it('preserves every hazard and prior-release exclusion', () => {
    expect(readJson(MANIFEST)).toMatchObject({
      isolation: {
        targetFluidIntersectionCount: 0,
        targetGravityIntersectionCount: 0,
        interactionHaloFluidCount: 0,
        interactionHaloGravityCount: 0,
        blockEntityInteractionEnvelopeIntersectionCount: 0,
        savedEntityInteractionEnvelopeIntersectionCount: 0,
        protectedRelicInteractionEnvelopeIntersectionCount: 0,
        deferredFutureLineSealInteractionEnvelopeIntersectionCount: 0,
        northSmokeResidualInteractionEnvelopeIntersectionCount: 0,
        isolatedN06Exception: { exactBlockedCellCount: 4, interactionEnvelopeIntersectionCount: 0 },
        r02RoofCapSupersession: { cellCount: 9, smoothStoneCells: 9 },
        checkedPriorManifestCount: 59,
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
    expect(forward).toHaveLength(9);
    expect(rollback).toEqual(forward.slice().reverse().map((line: string) => {
      const fields = line.split(/\s+/);
      return [...fields.slice(0, 7), fields[8], fields[7]].join(' ');
    }));
  });

  it('passes offline and real wrapper plan gates', () => {
    expect(readJson(path.join(EVIDENCE, 'manifest-qa.json'))).toMatchObject({
      status: 'PASS', totals: { uniqueTargetCells: 9 },
    });
    for (const filename of ['forward-source-preflight.json', 'projected-rollback-preflight.json']) {
      expect(readJson(path.join(EVIDENCE, filename))).toMatchObject({
        status: 'PASS', passed: 9, failed: 0,
      });
    }
    for (const filename of ['forward-strict-dry-run.json', 'rollback-strict-dry-run.json']) {
      expect(readJson(path.join(EVIDENCE, filename))).toMatchObject({
        status: 'dry_run', strictNoop: true, worldEditLeftoverCount: 0,
      });
    }
    expect(readJson(path.join(EVIDENCE, 'block-entity-clearance.json')))
      .toMatchObject({ status: 'PASS', operationCount: 9, blockingBlockEntityCount: 0 });
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
      .toBe('ca665afef01803f8fd35a4c07bd660c9a1e9bf8434bd6cab5e2a822d3566201f');
  });
});
