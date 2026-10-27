import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT,
  'scripts/compile_combined_zones_r08ad_north_smoke_supported_gravity_east_segment.mjs');
const WRAPPER = path.join(ROOT, 'scripts/run_combined_zones_scoped_release.mjs');
const BASENAME = 'combined-zones-r08ad-empty-eight-north-smoke-supported-gravity-east-segment';
const KEY = 'ee-smoke-n-supported-gravity-east-compartment-wall';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(ROOT,
  'data/world-review/combined-zones-r08ad-north-smoke-supported-gravity-east-segment-offline');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'r08ad-supported-gravity-'));
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const artifacts = (directory: string) => [
  `${BASENAME}.${KEY}.forward.txt`, `${BASENAME}.${KEY}.rollback.txt`,
  `${BASENAME}.release-manifest.json`,
].map((name) => path.join(directory, name));
const compileArgs = [SCRIPT, '--out-dir', temp, '--basename', BASENAME];
let first: Buffer[] = [];

beforeAll(() => {
  execFileSync(process.execPath, compileArgs, { cwd: ROOT, stdio: 'pipe' });
  first = artifacts(temp).map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, compileArgs, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('Combined Zones CZ-R08AD supported-gravity east segment', () => {
  it('regenerates all canonical artifacts byte-for-byte', () => {
    expect(artifacts(temp).map((filename) => fs.readFileSync(filename))).toEqual(first);
    expect(first).toEqual(artifacts(path.join(ROOT, 'data/buildops')).map(
      (filename) => fs.readFileSync(filename)));
  });

  it('selects the unique accepted-post maximal 2x7 run', () => {
    expect(readJson(MANIFEST)).toMatchObject({
      status: 'COMPILED_FROM_ACCEPTED_R08AC_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT', mvpScope: true,
      scope: { geometry: { selectedSupportedGravityEastSegment: {
        cellCount: 14, widthCells: 2, heightCells: 7,
        bounds: { minX: 1796, maxX: 1797, minY: 48, maxY: 54, minZ: 50, maxZ: 50 },
        topology: { componentCount: 1, largestComponentCellCount: 14 },
      }, interactionHalo: { cellCount: 46 } } },
      scopeSelection: { rankedSupportedGravityRuns: [
        { minX: 1796, maxX: 1797, widthCells: 2 },
      ], selectedRun: { minX: 1796, maxX: 1797, widthCells: 2 } },
      source: { snapshotRoot: 'data/worldsnap-combined-zones-r08ac-post-20260822T011245Z',
        completeSaveSha256: 'ae8ae28474c3b3c21d8c39c8cbf3550f80124ddbfe822324965054789c60d3b9',
        regionSnapshotSha256: '4436f48cf759066df1a22cfe578719603e2149788fd2ecd79a4badfea988f4c7' },
    });
  });

  it('proves the eight-cell durable gravity closure and all exclusions', () => {
    expect(readJson(MANIFEST)).toMatchObject({ isolation: {
      targetFluidIntersectionCount: 0, targetGravityIntersectionCount: 0,
      interactionHaloFluidCount: 0, interactionHaloGravityCount: 8,
      retainedGravitySupportClosure: { sourceGravityCellSet: { cellCount: 8 },
        dependencyGravityCellSet: { cellCount: 8 }, closureCount: 8,
        durableTerminalSupportCount: 8, targetOrOperationIntersectionCount: 0 },
      blockEntityInteractionEnvelopeIntersectionCount: 0,
      savedEntityInteractionEnvelopeIntersectionCount: 0,
      protectedRelicInteractionEnvelopeIntersectionCount: 0,
      isolatedN06Exception: { exactBlockedCellCount: 4, interactionEnvelopeIntersectionCount: 0 },
      checkedPriorManifestCount: 53, undeclaredPriorReleaseIntersectionCount: 0,
    } });
  });

  it('emits 14 exact forward guards and their reverse inverse', () => {
    const release = readJson(MANIFEST);
    const forward = fs.readFileSync(path.join(ROOT, release.packages[0].forward), 'utf8')
      .split(/\r?\n/).filter((line: string) => line.startsWith('REPL '));
    const rollback = fs.readFileSync(path.join(ROOT, release.packages[0].rollback), 'utf8')
      .split(/\r?\n/).filter((line: string) => line.startsWith('REPL '));
    expect(forward).toHaveLength(14);
    expect(rollback).toEqual(forward.slice().reverse().map((line: string) => {
      const fields = line.split(/\s+/);
      return [...fields.slice(0, 7), fields[8], fields[7]].join(' ');
    }));
  });

  it('passes offline gates and the real wrapper plan', () => {
    expect(readJson(path.join(EVIDENCE, 'manifest-qa.json'))).toMatchObject({
      status: 'PASS', totals: { packages: 1, uniqueTargetCells: 14 },
    });
    for (const filename of [
      `${KEY}.forward-source-preflight.json`, `${KEY}.projected-rollback-preflight.json`,
    ]) expect(readJson(path.join(EVIDENCE, filename))).toMatchObject({
      status: 'PASS', operationCount: 14, passed: 14, failed: 0,
    });
    expect(readJson(path.join(EVIDENCE, 'block-entity-clearance.json'))).toMatchObject({
      status: 'PASS', operationCount: 14, blockingBlockEntityCount: 0,
    });
    const plan = JSON.parse(execFileSync(process.execPath, [WRAPPER, '--manifest',
      path.relative(ROOT, MANIFEST), '--release-node', 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      '--print-plan'], { cwd: ROOT, encoding: 'utf8' }));
    expect(plan).toMatchObject({ mode: 'PREPARE_ONLY', globalGateDependency: 'NONE',
      packageOrder: [KEY] });
    expect(readJson(path.join(EVIDENCE, 'r08ad-offline-readiness.json'))).toMatchObject({
      status: 'PASS_R08AD_NORTH_SMOKE_SUPPORTED_GRAVITY_EAST_SEGMENT_OFFLINE_READY',
      scope: { targetCellCount: 14, halo: { cellCount: 46 } },
      gravityClosure: { sourceCellCount: 8, dependencyCellCount: 8,
        durableTerminalCount: 8, operationIntersectionCount: 0 },
      projectedResidual: { cellCount: 218, wetCellCount: 147,
        gravityCellCount: 56, sourceStateCellCount: 15 },
      executionAuthorizedByThisArtifact: false, liveCallsPerformed: false,
      worldEditsPerformed: false,
    });
  });

  it('binds its deterministic payload identity', () => {
    const release = readJson(MANIFEST);
    const { manifestIdentity, ...payload } = release;
    expect(crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'))
      .toBe(manifestIdentity);
    expect(manifestIdentity).toBe('98c5766a634bbf68b6dd005c0ca50299c017276738be839cf91a9ea6505e9c9e');
  });
});
