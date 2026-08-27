import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/compile_town_expansion_rest_suite_lighting.mjs');
const BASE = 'town-expansion-r1-rest-suite-lighting';
const KEY = 'rest-suite-ceiling-lighting';
const MANIFEST = path.join(ROOT, `data/buildops/${BASE}.release-manifest.json`);
const EVIDENCE = path.join(ROOT, 'data/world-review/te-next-live-20260825T073500Z');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'te-next-'));
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

describe('TE-NEXT-01 Town Expansion owner rest-suite ceiling lighting', () => {
  it('is deterministic and canonical', () => {
    expect(artifacts(temporaryDirectory).map((filename) => fs.readFileSync(filename))).toEqual(first);
    expect(first).toEqual(artifacts(path.join(ROOT, 'data/buildops')).map(
      (filename) => fs.readFileSync(filename),
    ));
  });

  it('derives the exact 21 ceiling lights across the seven rest suites', () => {
    expect(readJson(MANIFEST)).toMatchObject({
      status: 'COMPILED_FROM_ACCEPTED_R08AM_POST_OFFLINE_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-TOWN-EXPANSION-R1',
      mvpScope: false,
      scopeIds: ['TE-GILDED-RAVEN-OWNER-ROUTE'],
      scope: {
        releaseId: 'TE-NEXT-01',
        ceilingLights: { cellCount: 21 },
        perSuite: {
          'OWNER-REST-A': 3,
          'OWNER-REST-B': 3,
          'OWNER-REST-C': 3,
          'OWNER-REST-D': 3,
          'OWNER-REST-E': 3,
          'OWNER-REST-F': 3,
          'OWNER-REST-G': 3,
        },
        commissions: 'PASSIVE_WARM_CEILING_ILLUMINATION_ONLY',
        routeCommissioned: false,
      },
      target: {
        operatedUnion: { cellCount: 21 },
        desiredStateCensus: {
          'minecraft:ochre_froglight[axis=y]': 21,
        },
        sourceStateCensus: {
          'minecraft:deepslate_bricks': 21,
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

  it('emits exactly one light per suite grid with no duplicates and no copper overlap', () => {
    const manifest = readJson(MANIFEST);
    const forward = fs.readFileSync(path.join(ROOT, manifest.packages[0].forward), 'utf8')
      .split(/\r?\n/).filter((line: string) => line.startsWith('REPL '));
    expect(forward).toHaveLength(21);
    const seen = new Set<string>();
    for (const line of forward) {
      const fields = line.split(/\s+/);
      const key = `${fields[1]},${fields[2]},${fields[3]}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      // All targets are the y=-34 ceiling slab of an owner rest suite.
      expect(Number(fields[2])).toBe(-34);
      expect(fields[7]).toBe('minecraft:deepslate_bricks');
      expect(fields[8]).toBe('minecraft:ochre_froglight[axis=y]');
    }
    // Disjoint from the natural copper rollback-only policy points.
    const policy = readJson(path.join(
      ROOT,
      'data/buildops/town-expansion-r1-2026-07-28.rollback-natural-transition-policy-carpet-recovered-logical-source.json',
    ));
    const copperPoints = new Set<string>();
    for (const rule of policy.rules) {
      for (const point of rule.points) copperPoints.add(`${point[0]},${point[1]},${point[2]}`);
    }
    for (const key of seen) expect(copperPoints.has(key)).toBe(false);
  });

  it('emits the exact reverse inverse', () => {
    const manifest = readJson(MANIFEST);
    const forward = fs.readFileSync(path.join(ROOT, manifest.packages[0].forward), 'utf8')
      .split(/\r?\n/).filter((line: string) => line.startsWith('REPL '));
    const rollback = fs.readFileSync(path.join(ROOT, manifest.packages[0].rollback), 'utf8')
      .split(/\r?\n/).filter((line: string) => line.startsWith('REPL '));
    expect(forward).toHaveLength(21);
    expect(rollback).toHaveLength(21);
    expect(rollback).toEqual(forward.slice().reverse().map((line: string) => {
      const fields = line.split(/\s+/);
      return [...fields.slice(0, 7), fields[8], fields[7]].join(' ');
    }));
  });

  it('passed the live hard-safety kernel', () => {
    expect(readJson(path.join(EVIDENCE, 'forward-source-preflight.json'))).toMatchObject({
      status: 'PASS', passed: 21, failed: 0,
    });
    expect(readJson(path.join(EVIDENCE, 'rollback-poststate-preflight.json'))).toMatchObject({
      status: 'PASS', passed: 21, failed: 0,
    });
    expect(readJson(path.join(EVIDENCE, 'block-entity-clearance.json')))
      .toMatchObject({ status: 'PASS', operationCount: 21, blockingBlockEntityCount: 0 });
    expect(readJson(path.join(EVIDENCE, 'live-entity-clearance.json')))
      .toMatchObject({ status: 'PASS' });
    expect(readJson(path.join(EVIDENCE, 'rest-suite-ceiling-lighting.forward-execution.json')))
      .toMatchObject({ status: 'complete', successfulCommands: 21, noopCommands: 0, failedCommands: 0 });
    expect(readJson(path.join(EVIDENCE, 'evidence-ledger.json'))).toMatchObject({
      status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
    });
  });

  it('verifies the immutable post-state read-only', () => {
    const qa = readJson(path.join(EVIDENCE, 'post-state-verification.json'));
    expect(qa).toMatchObject({
      status: 'PASS',
      checks: {
        exactPostStateCount: 21,
        exactPostStateMismatchCount: 0,
        targetState: 'minecraft:ochre_froglight[axis=y]',
      },
    });
    expect(qa.checks.perSuite).toEqual({
      'OWNER-REST-A': 3,
      'OWNER-REST-B': 3,
      'OWNER-REST-C': 3,
      'OWNER-REST-D': 3,
      'OWNER-REST-E': 3,
      'OWNER-REST-F': 3,
      'OWNER-REST-G': 3,
    });
  });

  it('binds the manifest payload identity', () => {
    const manifest = readJson(MANIFEST);
    const { manifestIdentity, ...payload } = manifest;
    expect(crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'))
      .toBe(manifestIdentity);
    expect(manifestIdentity)
      .toBe('93d9107c618c7d30b369143c2ea8dd6ce5df869b18c45acac0207bc96a3107e7');
  });
});
