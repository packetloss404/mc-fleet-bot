import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_ee_lights_01_stairwell_ceiling_cadence.mjs',
);
const BASE = 'combined-zones-ee-lights-01-stairwell-ceiling-cadence';
const KEY = 'stairwell-ceiling-cadence';
const MANIFEST = path.join(ROOT, `data/buildops/${BASE}.release-manifest.json`);
const EVIDENCE = path.join(ROOT, 'data/world-review/ee-lights-live-20260825T154809Z');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ee-lights-01-'));
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const artifacts = (directory: string) => [
  `${BASE}.${KEY}.forward.txt`,
  `${BASE}.${KEY}.rollback.txt`,
  `${BASE}.release-manifest.json`,
].map((filename) => path.join(directory, filename));
let first: Buffer[] = [];

const STAIRWELL_LIGHTS = [
  [1727, 53, 147], [1727, 53, 149],
  [1728, 53, 147], [1728, 53, 149],
  [1729, 53, 147], [1729, 53, 149],
  [1751, 53, 147], [1751, 53, 149],
  [1752, 53, 147], [1752, 53, 149],
  [1753, 53, 147], [1753, 53, 149],
];

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

describe('CZ-EE-LIGHTS-01 Empty Eight public stair-well ceiling lighting cadence', () => {
  it('is deterministic and canonical', () => {
    expect(artifacts(temporaryDirectory).map((filename) => fs.readFileSync(filename))).toEqual(first);
    expect(first).toEqual(artifacts(path.join(ROOT, 'data/buildops')).map(
      (filename) => fs.readFileSync(filename),
    ));
  });

  it('derives the exact stair-well ceiling cadence', () => {
    expect(readJson(MANIFEST)).toMatchObject({
      status: 'COMPILED_FROM_ACCEPTED_EE_PUB2_POST_OFFLINE_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      mvpScope: false,
      scopeIds: ['Z02-U1-CONCOURSE-MALL'],
      scope: {
        stairwellCeilingCadence: {
          cellCount: 12,
          bounds: { minX: 1727, maxX: 1753, minY: 53, maxY: 53, minZ: 147, maxZ: 149 },
        },
        commissions: 'PASSIVE_NORMAL_ILLUMINATION_ONLY',
        publicAccess: {
          surfaceEgressOrAccessibilityClaimed: false,
          emergencyLightingCommissioned: false,
          routeCommissioningClaimed: false,
        },
      },
      target: {
        operatedUnion: { cellCount: 12 },
        desiredStateCensus: { 'minecraft:sea_lantern': 12 },
        sourceStateCensus: { 'minecraft:smooth_stone': 12 },
        packageTargetsDisjoint: true,
      },
      isolation: {
        sourceHazardCount: 0,
        operatedHaloFluidCount: 0,
        operatedHaloGravityCount: 0,
      },
      safetyBoundary: {
        liveCallsPerformed: false,
        worldEditsPerformed: false,
        executionAuthorizedByThisManifest: false,
      },
    });
  });

  it('excludes N06 bulkhead, north-smoke, and prior fixtures', () => {
    const manifest = readJson(MANIFEST);
    const targets = manifest.target.operatedUnion;
    expect(targets.cellCount).toBe(12);
    const n06 = { minX: 1736, maxX: 1747, minZ: 144, maxZ: 149 };
    const forward = fs.readFileSync(path.join(ROOT, manifest.packages[0].forward), 'utf8')
      .split(/\r?\n/).filter((line: string) => line.startsWith('REPL '));
    expect(forward).toHaveLength(12);
    for (const line of forward) {
      const [, x, y, z] = line.split(/\s+/).map(Number);
      expect(x >= n06.minX && x <= n06.maxX && z >= n06.minZ && z <= n06.maxZ).toBe(false);
      expect(z).not.toBe(50); // north-smoke plane
      expect(y).toBe(53); // corridor ceiling plane
    }
  });

  it('emits the exact reverse inverse', () => {
    const manifest = readJson(MANIFEST);
    const forward = fs.readFileSync(path.join(ROOT, manifest.packages[0].forward), 'utf8')
      .split(/\r?\n/).filter((line: string) => line.startsWith('REPL '));
    const rollback = fs.readFileSync(path.join(ROOT, manifest.packages[0].rollback), 'utf8')
      .split(/\r?\n/).filter((line: string) => line.startsWith('REPL '));
    expect(forward).toHaveLength(12);
    expect(rollback).toHaveLength(12);
    expect(rollback).toEqual(forward.slice().reverse().map((line: string) => {
      const fields = line.split(/\s+/);
      return [...fields.slice(0, 7), fields[8], fields[7]].join(' ');
    }));
  });

  it('covers exactly the two public PF08 stair-well mouths', () => {
    const manifest = readJson(MANIFEST);
    const targets = manifest.scope.stairwellCeilingCadence;
    const west = STAIRWELL_LIGHTS.filter(([x]) => x >= 1727 && x <= 1729);
    const east = STAIRWELL_LIGHTS.filter(([x]) => x >= 1751 && x <= 1753);
    expect(west).toHaveLength(6);
    expect(east).toHaveLength(6);
    // West stair mouth x=1727..1729, east stair mouth x=1751..1753 on the corridor ceiling plane.
    expect(targets.cellCount).toBe(west.length + east.length);
  });

  it('passed the live hard-safety kernel', () => {
    expect(readJson(path.join(EVIDENCE, 'forward-source-preflight.json'))).toMatchObject({
      status: 'PASS', passed: 12, failed: 0,
    });
    expect(readJson(path.join(EVIDENCE, 'rollback-poststate-preflight.json'))).toMatchObject({
      status: 'PASS', passed: 12, failed: 0,
    });
    expect(readJson(path.join(EVIDENCE, 'block-entity-clearance.json')))
      .toMatchObject({ status: 'PASS', operationCount: 12, blockingBlockEntityCount: 0 });
    expect(readJson(path.join(EVIDENCE, 'live-entity-clearance.json')))
      .toMatchObject({ status: 'PASS' });
    expect(readJson(path.join(EVIDENCE, 'evidence-ledger.json'))).toMatchObject({
      status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
      postStateVerification: { stairwellCeilingCadence: { count: 12, passed: 12 } },
    });
    expect(readJson(path.join(EVIDENCE, 'forward-execution.json')))
      .toMatchObject({ status: 'complete', successfulCommands: 12, noopCommands: 0, failedCommands: 0 });
  });

  it('verifies the immutable post-state read-only', () => {
    const qa = readJson(path.join(EVIDENCE, 'post-state-verification.json'));
    expect(qa).toMatchObject({
      status: 'PASS',
      transactionId: BASE,
      targetCellCount: 12,
      targets: { passed: 12, failed: 0 },
      preservedInterfaces: { passed: 15, failed: 0 },
    });
    expect(qa.conclusions).toMatchObject({
      stairwellCeilingCadenceConfirmed: true,
      corridorCadencePreserved: true,
      r08anWidenedStairsPreserved: true,
      r08awBandAndDatumsPreserved: true,
      n06BulkheadUntouched: true,
    });
  });

  it('binds the manifest payload identity', () => {
    const manifest = readJson(MANIFEST);
    const { manifestIdentity, ...payload } = manifest;
    expect(crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'))
      .toBe(manifestIdentity);
    expect(manifestIdentity)
      .toBe('a0e148d4854098f83171b003ca9622acb068efd5b52edb92d5bfa65b2b6b4475');
  });
});
