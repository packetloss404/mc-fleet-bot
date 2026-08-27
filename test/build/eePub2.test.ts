import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_ee_pub2_empty_eight_arrival_confirmation_and_light_cadence.mjs',
);
const BASE = 'combined-zones-ee-pub2-empty-eight-arrival-confirmation-and-light-cadence';
const KEY = 'arrival-confirmation-and-light-cadence';
const MANIFEST = path.join(ROOT, `data/buildops/${BASE}.release-manifest.json`);
const EVIDENCE = path.join(ROOT, 'data/world-review/ee-pub2-live-20260825T060000Z');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ee-pub2-'));
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

describe('CZ-EE-PUB2 Empty Eight south gallery arrival confirmation and light cadence', () => {
  it('is deterministic and canonical', () => {
    expect(artifacts(temporaryDirectory).map((filename) => fs.readFileSync(filename))).toEqual(first);
    expect(first).toEqual(artifacts(path.join(ROOT, 'data/buildops')).map(
      (filename) => fs.readFileSync(filename),
    ));
  });

  it('derives the exact stair markers and ceiling cadence', () => {
    expect(readJson(MANIFEST)).toMatchObject({
      status: 'COMPILED_FROM_ACCEPTED_R08AW_POST_OFFLINE_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      mvpScope: false,
      scopeIds: ['Z02-U1-CONCOURSE-MALL'],
      scope: {
        stairArrivalMarkers: {
          cellCount: 6,
          bounds: { minX: 1727, maxX: 1753, minY: 50, maxY: 50, minZ: 143, maxZ: 143 },
        },
        ceilingCadenceLights: {
          cellCount: 10,
          bounds: { minX: 1656, maxX: 1829, minY: 53, maxY: 53, minZ: 147, maxZ: 147 },
        },
        commissions: 'PASSIVE_ORIENTATION_AND_NORMAL_ILLUMINATION_ONLY',
        publicAccess: {
          surfaceEgressOrAccessibilityClaimed: false,
          emergencyLightingCommissioned: false,
          routeCommissioningClaimed: false,
        },
      },
      target: {
        operatedUnion: { cellCount: 16 },
        desiredStateCensus: {
          'minecraft:blue_glazed_terracotta[facing=south]': 6,
          'minecraft:sea_lantern': 10,
        },
        sourceStateCensus: {
          'minecraft:andesite': 6,
          'minecraft:smooth_stone': 10,
        },
        packageTargetsDisjoint: true,
      },
      isolation: {
        sourceHazardCount: 0,
        operatedHaloFluidCount: 0,
      },
      safetyBoundary: {
        liveCallsPerformed: false,
        worldEditsPerformed: false,
        executionAuthorizedByThisManifest: false,
      },
    });
  });

  it('excludes N06 bulkhead, north-smoke, and prior markers', () => {
    const manifest = readJson(MANIFEST);
    const targets = manifest.target.operatedUnion;
    expect(targets.cellCount).toBe(16);
    // N06 bulkhead is x=1736..1747 z=144..149; no target inside.
    const n06 = { minX: 1736, maxX: 1747, minZ: 144, maxZ: 149 };
    // North-smoke plane is z=50; no target there.
    // No duplicate with the existing R08AW band (y=49,z=145) or datums (y=50,z=144).
    // Read target cells from the ops file for precision.
    const forward = fs.readFileSync(path.join(ROOT, manifest.packages[0].forward), 'utf8')
      .split(/\r?\n/).filter((line: string) => line.startsWith('REPL '));
    expect(forward).toHaveLength(16);
    for (const line of forward) {
      const [, x, y, z] = line.split(/\s+/).map(Number);
      expect(x >= n06.minX && x <= n06.maxX && z >= n06.minZ && z <= n06.maxZ).toBe(false);
      expect(z).not.toBe(50);
      expect(z).not.toBe(144); // R08AW datum band
      expect(z).not.toBe(145); // R08AW orientation band (y=49)
      expect(y).not.toBe(49);
    }
  });

  it('emits the exact reverse inverse', () => {
    const manifest = readJson(MANIFEST);
    const forward = fs.readFileSync(path.join(ROOT, manifest.packages[0].forward), 'utf8')
      .split(/\r?\n/).filter((line: string) => line.startsWith('REPL '));
    const rollback = fs.readFileSync(path.join(ROOT, manifest.packages[0].rollback), 'utf8')
      .split(/\r?\n/).filter((line: string) => line.startsWith('REPL '));
    expect(forward).toHaveLength(16);
    expect(rollback).toHaveLength(16);
    expect(rollback).toEqual(forward.slice().reverse().map((line: string) => {
      const fields = line.split(/\s+/);
      return [...fields.slice(0, 7), fields[8], fields[7]].join(' ');
    }));
  });

  it('passed the live hard-safety kernel', () => {
    expect(readJson(path.join(EVIDENCE, 'forward-source-preflight.json'))).toMatchObject({
      status: 'PASS', passed: 16, failed: 0,
    });
    expect(readJson(path.join(EVIDENCE, 'rollback-poststate-preflight.json'))).toMatchObject({
      status: 'PASS', passed: 16, failed: 0,
    });
    expect(readJson(path.join(EVIDENCE, 'block-entity-clearance.json')))
      .toMatchObject({ status: 'PASS', operationCount: 16, blockingBlockEntityCount: 0 });
    expect(readJson(path.join(EVIDENCE, 'live-entity-clearance.json')))
      .toMatchObject({ status: 'PASS' });
    expect(readJson(path.join(EVIDENCE, 'evidence-ledger.json'))).toMatchObject({
      status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
      postStateVerification: { total: { count: 16, passed: 16 } },
    });
    expect(readJson(path.join(EVIDENCE, 'forward-execution.json')))
      .toMatchObject({ status: 'complete', successfulCommands: 16, noopCommands: 0, failedCommands: 0 });
  });

  it('verifies the immutable post-state read-only', () => {
    const qa = readJson(path.join(EVIDENCE, 'post-state-verification.json'));
    expect(qa).toMatchObject({
      status: 'PASS',
      transactionId: BASE,
      targetCellCount: 16,
      targets: { passed: 16, failed: 0 },
      preservedInterfaces: { passed: 12, failed: 0 },
    });
    expect(qa.conclusions).toMatchObject({
      stairArrivalMarkersConfirmed: true,
      ceilingCadenceLightsConfirmed: true,
      preservedInterfacesConfirmed: true,
      n06BulkheadUntouched: true,
      r08anWidenedStairsPreserved: true,
    });
  });

  it('binds the manifest payload identity', () => {
    const manifest = readJson(MANIFEST);
    const { manifestIdentity, ...payload } = manifest;
    expect(crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'))
      .toBe(manifestIdentity);
    expect(manifestIdentity)
      .toBe('7d0383eec37d02a179309236bb186b0581fd2a3ef377c7b85a284510e0ce02c3');
  });
});
