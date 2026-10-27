import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'bkr-rr-z5-01-repair';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const LIVE = path.join(ROOT, 'data/world-review/rr-z5-repair-live-20260824T185730Z');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'bkr-rr-z5-01-'));
const artifactNames = [
  `${BASENAME}.shaft-lighting.forward.txt`,
  `${BASENAME}.shaft-lighting.rollback.txt`,
  `${BASENAME}.shaft-signs.forward.txt`,
  `${BASENAME}.shaft-signs.rollback.txt`,
];

type Manifest = {
  manifestIdentity: string;
  mvpScope: boolean;
  scopeIds: string[];
  packages: Array<{ key: string }>;
  scope: {
    releaseId: string;
    repair: {
      lanternCount: number;
      signCount: number;
      retainedTopSign: boolean;
    };
    geometry: {
      targets: { cellCount: number };
    };
    retainedBoundaries: {
      existingContainersPreserved: boolean;
      existingBlockEntitiesPreserved: boolean;
      topSignPreserved: boolean;
      structureUntouched: boolean;
      shaftNotWidened: boolean;
      staysNonPublicServiceShaft: boolean;
    };
  };
  isolation: {
    targetFluidOrWaterloggedCount: number;
    targetForbiddenBlockCount: number;
    blockEntityIntersectionCount: number;
    savedEntityIntersectionCount: number;
  };
};

let manifest: Manifest;

describe('BKR-RR-Z5-01 Raven Rock RR-Z5 shaft repair', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_bkr_rr_z5_01_repair.mjs',
      '--out-dir', temporaryDirectory,
      '--generated-at', '2026-08-24T18:16:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 60_000 });
    manifest = JSON.parse(
      fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.release-manifest.json`), 'utf8'),
    ) as Manifest;
  });

  afterAll(() => {
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  });

  it('reproduces all four executable build artifacts byte-for-byte', () => {
    for (const name of artifactNames) {
      expect(fs.readFileSync(path.join(temporaryDirectory, name)))
        .toEqual(fs.readFileSync(path.join(BUILDOPS, name)));
    }
  });

  it('emits a valid manifest under the raven-rock scope', () => {
    expect(manifest.manifestIdentity).toMatch(/^[0-9a-f]{64}$/);
    expect(manifest.mvpScope).toBe(true);
    expect(manifest.scopeIds).toEqual(['raven-rock']);
    expect(manifest.scope.releaseId).toBe('BKR-RR-Z5-01');
    expect(manifest.packages.map(({ key }) => key)).toEqual([
      'shaft-lighting',
      'shaft-signs',
    ]);
  });

  it('adds exactly 16 landing lanterns and 1 bottom return sign', () => {
    expect(manifest.scope.repair.lanternCount).toBe(16);
    expect(manifest.scope.repair.signCount).toBe(1);
    expect(manifest.scope.repair.retainedTopSign).toBe(true);
  });

  it('emits the exact target count (16 lanterns + 1 sign)', () => {
    expect(manifest.scope.geometry.targets.cellCount).toBe(17);
  });

  it('keeps the shaft non-public, un-widened, and top sign preserved', () => {
    expect(manifest.scope.retainedBoundaries.shaftNotWidened).toBe(true);
    expect(manifest.scope.retainedBoundaries.staysNonPublicServiceShaft).toBe(true);
    expect(manifest.scope.retainedBoundaries.topSignPreserved).toBe(true);
    expect(manifest.scope.retainedBoundaries.existingBlockEntitiesPreserved).toBe(true);
  });

  it('isolates all targets from fluid, containers, block entities, and saved entities', () => {
    expect(manifest.isolation.targetFluidOrWaterloggedCount).toBe(0);
    expect(manifest.isolation.targetForbiddenBlockCount).toBe(0);
    expect(manifest.isolation.blockEntityIntersectionCount).toBe(0);
    expect(manifest.isolation.savedEntityIntersectionCount).toBe(0);
  });

  it('proves the forward and rollback REPL files are exact inverses', () => {
    for (const pkg of ['shaft-lighting', 'shaft-signs']) {
      const forward = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.${pkg}.forward.txt`), 'utf8')
        .split('\n').filter((l) => l.startsWith('REPL'));
      const rollback = fs.readFileSync(path.join(BUILDOPS, `${BASENAME}.${pkg}.rollback.txt`), 'utf8')
        .split('\n').filter((l) => l.startsWith('REPL'));
      expect(forward.length).toBe(rollback.length);
      const forwardSet = new Set(forward);
      for (const line of rollback) {
        const f = line.split(/\s+/);
        const inverted = `REPL ${f[1]} ${f[2]} ${f[3]} ${f[4]} ${f[5]} ${f[6]} ${f[8]} ${f[7]}`;
        expect(forwardSet.has(inverted)).toBe(true);
      }
    }
  });

  it('appends a guarded sign-text CMD to the sign forward only', () => {
    const signForward = fs.readFileSync(
      path.join(BUILDOPS, `${BASENAME}.shaft-signs.forward.txt`), 'utf8');
    const signRollback = fs.readFileSync(
      path.join(BUILDOPS, `${BASENAME}.shaft-signs.rollback.txt`), 'utf8');
    expect(signForward.includes('CMD execute if block 201 -11 -14 minecraft:spruce_wall_sign[facing=west,waterlogged=false] run data merge block')).toBe(true);
    expect(signForward.includes('SURFACE / UP')).toBe(true);
    expect(signRollback.includes('CMD ')).toBe(false);
  });

  it('verifies the executed evidence ledger is post-state verified and reversible', () => {
    const ledger = JSON.parse(fs.readFileSync(path.join(LIVE, 'evidence-ledger.json'), 'utf8'));
    expect(ledger.status).toBe('EXECUTED_AND_VERIFIED');
    expect(ledger.execution.totalChanged).toBe(18);
    expect(ledger.execution.totalFailed).toBe(0);
    expect(ledger.execution.totalNoop).toBe(0);
    expect(ledger.gates.rollbackPoststatePreflight).toBe('PASS (16/16 + 1/1)');
    expect(ledger.gates.postStateVerification).toContain('16/16 lanterns');
    expect(ledger.boundariesRetained.staysNonPublicServiceShaft).toBe(true);
  });

  it('verifies the post-state snapshot contains the built targets and preserved top sign', () => {
    const postVerify = JSON.parse(
      fs.readFileSync(path.join(LIVE, 'post-state-verification.json'), 'utf8'));
    expect(postVerify.lanternPass).toBe(16);
    expect(postVerify.signPass).toBe(true);
    expect(postVerify.signText).toEqual(['SURFACE / UP', 'RAVEN ROCK', 'SHAFT Z5', 'STAIRS ABOVE']);
    expect(postVerify.topSignPreserved).toBe(true);
    expect(postVerify.postStatePass).toBe(true);
  });
});
