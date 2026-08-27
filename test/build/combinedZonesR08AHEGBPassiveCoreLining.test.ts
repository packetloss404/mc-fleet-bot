import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT,
  'scripts/compile_combined_zones_r08ah_empty_eight_eg_b_passive_core_lining.mjs');
const WRAPPER = path.join(ROOT, 'scripts/run_combined_zones_scoped_release.mjs');
const BASE = 'combined-zones-r08ah-empty-eight-eg-b-passive-core-lining';
const KEY = 'ee-eg-b-passive-core-lining';
const MANIFEST = path.join(ROOT, `data/buildops/${BASE}.release-manifest.json`);
const EVIDENCE = path.join(ROOT,
  'data/world-review/combined-zones-r08ah-empty-eight-eg-b-passive-core-lining-offline');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'r08ah-'));
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const artifacts = (directory: string) => [
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
  firstGeneration = artifacts(temporaryDirectory).map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, [SCRIPT, '--out-dir', temporaryDirectory, '--basename', BASE], {
    cwd: ROOT,
    stdio: 'pipe',
  });
}, 30_000);

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('R08AH EG-B passive internal-core lining', () => {
  it('is deterministic and byte-identical to the canonical artifacts', () => {
    expect(artifacts(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstGeneration);
    expect(firstGeneration)
      .toEqual(artifacts(path.join(ROOT, 'data/buildops')).map((filename) => fs.readFileSync(filename)));
  });

  it('selects the exact dry EG-B vertical boundary and retains its closure', () => {
    expect(readJson(MANIFEST)).toMatchObject({
      status: 'COMPILED_FROM_ACCEPTED_R08AG_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      mvpScope: true,
      scope: {
        geometry: {
          internalCoreReservation: { cellCount: 637 },
          verticalLining: { cellCount: 264 },
          retainedFloor: { cellCount: 49 },
          retainedRoofCap: { cellCount: 49 },
          retainedAirInterior: { cellCount: 275 },
          interactionHalo: { cellCount: 532 },
        },
        operationalBoundary: {
          passiveInternalCoreLiningAccepted: true,
          egressCommissioned: false,
          accessibleRouteCommissioned: false,
          stairsOrLiftAuthorized: false,
          externalContinuationAuthorized: false,
          spineOpeningAuthorized: false,
        },
      },
      source: {
        exactTargetStateCensus: {
          'minecraft:air': 229,
          'minecraft:polished_deepslate': 35,
        },
        retainedFloorStateCensus: {
          'minecraft:polished_deepslate': 30,
          'minecraft:smooth_stone': 19,
        },
        retainedRoofCapStateCensus: { 'minecraft:smooth_stone': 49 },
        retainedInteriorStateCensus: { 'minecraft:air': 275 },
      },
    });
  });

  it('proves exact isolation and declared R02 reservation supersession', () => {
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
        r02ReservationSupersession: {
          cellCount: 264,
          airReservationCells: 229,
          polishedDeepslateReservationCells: 35,
        },
        checkedPriorManifestCount: 57,
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
    expect(forward).toHaveLength(264);
    expect(rollback).toEqual(forward.slice().reverse().map((line: string) => {
      const fields = line.split(/\s+/);
      return [...fields.slice(0, 7), fields[8], fields[7]].join(' ');
    }));
  });

  it('passes offline and real wrapper plan gates', () => {
    expect(readJson(path.join(EVIDENCE, 'manifest-qa.json'))).toMatchObject({
      status: 'PASS', totals: { uniqueTargetCells: 264 },
    });
    for (const filename of ['forward-source-preflight.json', 'projected-rollback-preflight.json']) {
      expect(readJson(path.join(EVIDENCE, filename))).toMatchObject({
        status: 'PASS', passed: 264, failed: 0,
      });
    }
    for (const filename of ['forward-strict-dry-run.json', 'rollback-strict-dry-run.json']) {
      expect(readJson(path.join(EVIDENCE, filename))).toMatchObject({
        status: 'dry_run', strictNoop: true, worldEditLeftoverCount: 0,
      });
    }
    expect(readJson(path.join(EVIDENCE, 'block-entity-clearance.json')))
      .toMatchObject({ status: 'PASS', blockingBlockEntityCount: 0 });
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
      .toBe('bc4be457f3dc659b485fd1757280cee6f7ff6add45ee1fc1e27b8d1c14f00d2f');
  });
});
