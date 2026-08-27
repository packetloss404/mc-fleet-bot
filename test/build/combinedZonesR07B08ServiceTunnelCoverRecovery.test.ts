import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r07_b08_service_tunnel_cover.mjs',
);
const BASENAME =
  'combined-zones-r07c-b08-service-tunnel-cover-recovery-20260821T161200Z';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r07c-b08-recovery-'),
);

interface Operation {
  point: string;
  fromState: string;
  toState: string;
}

interface RecoveryManifest {
  transactionId: string;
  status: string;
  manifestIdentity: string;
  packages: Array<{ key: string; forward: string; rollback: string }>;
  source: {
    stage: string;
    snapshotRoot: string;
    completeSaveSha256: string;
    packageSourceStateCensus: Record<string, Record<string, number>>;
    recoveryComparison: {
      priorSnapshotRoot: string;
      exactDesignCellCountCompared: number;
      sourceDifferenceIdentity: {
        cellCount: number;
        coordinateSetSha256: string;
      };
      sourceDifferences: Array<{
        x: number;
        y: number;
        z: number;
        priorState: string;
        recoveryState: string;
        designClass: string;
      }>;
      oneLayerSnowOrAirTransitionCount: number;
      nonSnowTransitionCount: number;
      noOtherTargetOrDesignDrift: boolean;
    };
  };
  target: {
    operatedUnion: { cellCount: number; coordinateSetSha256: string };
    packageTargetsDisjoint: boolean;
  };
  operations: Record<string, {
    forwardSha256: string;
    rollbackSha256: string;
    forwardCommandCount: number;
    rollbackCommandCount: number;
    exactInverse: boolean;
  }>;
  isolation: {
    protectedRelicCoreIntersectionCount: number;
    blockEntityTargetIntersectionCount: number;
    savedEntityHaloIntersectionCount: number;
    priorReleaseIntersections: Array<{
      packageId: string;
      cellCount: number;
      coordinateSetSha256: string;
      everyPriorTargetWasClearedToAir: boolean;
    }>;
    intentionalRecoveryPriorReleaseOverlap: {
      packageId: string;
      cellCount: number;
      coordinateSetSha256: string;
    };
    undeclaredPriorReleaseIntersectionCount: number;
  };
  compileGuards: Record<string, number>;
  safetyBoundary: {
    liveCallsPerformed: boolean;
    worldEditsPerformed: boolean;
    executionAuthorizedByThisManifest: boolean;
  };
}

function readManifest(): RecoveryManifest {
  return JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as RecoveryManifest;
}

function parseOperations(filename: string): Operation[] {
  return fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line.startsWith('REPL '))
    .map((line) => {
      const fields = line.split(/\s+/);
      expect(fields).toHaveLength(9);
      expect(fields.slice(1, 4)).toEqual(fields.slice(4, 7));
      return {
        point: fields.slice(1, 4).join(','),
        fromState: fields[7],
        toState: fields[8],
      };
    });
}

function artifactPaths(directory: string) {
  return [
    `${BASENAME}.b08-cover-shell.forward.txt`,
    `${BASENAME}.b08-cover-shell.rollback.txt`,
    `${BASENAME}.b08-route-openings.forward.txt`,
    `${BASENAME}.b08-route-openings.rollback.txt`,
    `${BASENAME}.release-manifest.json`,
  ].map((filename) => path.join(directory, filename));
}

let firstCompile: Buffer[] = [];

beforeAll(() => {
  const args = [
    SCRIPT,
    '--generated-at', '2026-08-21T16:20:00Z',
    '--snapshot', 'data/worldsnap-combined-zones-r07c-post-20260821T161200Z',
    '--intake-audit',
    'data/world-review/combined-zones-r07c-live-20260821T161200Z/rollback-recovery-complete-save-intake.json',
    '--basename', BASENAME,
    '--source-stage', 'rollback-recovery',
    '--comparison-snapshot',
    'data/worldsnap-combined-zones-r07a-post-20260821T154500Z',
    '--expected-operated-union-sha256',
    '4c1cd124726032c338de14bcce68d83a4f8f17c6de6e794318439df61d9a9944',
    '--out-dir', temporaryDirectory,
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstCompile = artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones CZ-R07C B08 rollback-recovery compiler', () => {
  it('regenerates the additive recovery package byte-for-byte', () => {
    const secondCompile = artifactPaths(temporaryDirectory)
      .map((filename) => fs.readFileSync(filename));
    expect(secondCompile).toEqual(firstCompile);
  });

  it('binds the complete recovery save without overwriting the original transaction', () => {
    const manifest = readManifest();
    expect(manifest).toMatchObject({
      transactionId: BASENAME,
      status: 'COMPILED_FROM_COMPLETE_ROLLBACK_RECOVERY_SAVE_AWAITING_FRESH_LIVE_KERNEL',
      source: {
        stage: 'rollback-recovery',
        snapshotRoot: 'data/worldsnap-combined-zones-r07c-post-20260821T161200Z',
        completeSaveSha256:
          '8fc24683f41d938d58cad06dc2e8b0c83f491ca7cc4f2cc940f66c21b41498bb',
      },
    });
    expect(manifest.transactionId).not.toBe('combined-zones-r07c-b08-service-tunnel-cover');
  });

  it('proves all recovery drift is exactly eight one-layer-snow transitions', () => {
    const comparison = readManifest().source.recoveryComparison;
    expect(comparison).toMatchObject({
      priorSnapshotRoot: 'data/worldsnap-combined-zones-r07a-post-20260821T154500Z',
      exactDesignCellCountCompared: 13185,
      sourceDifferenceIdentity: {
        cellCount: 8,
        coordinateSetSha256:
          'fe28c3b64ce7fe2c1c38a76eb61096eb5cc8afc363934dc07e43794de9730d2b',
      },
      oneLayerSnowOrAirTransitionCount: 8,
      nonSnowTransitionCount: 0,
      noOtherTargetOrDesignDrift: true,
    });
    expect(comparison.sourceDifferences).toContainEqual({
      x: 2009,
      y: 128,
      z: -653,
      priorState: 'minecraft:air',
      recoveryState: 'minecraft:snow[layers=1]',
      designClass: 'cover-shell',
    });
    expect(comparison.sourceDifferences).toContainEqual({
      x: 2011,
      y: 128,
      z: -653,
      priorState: 'minecraft:air',
      recoveryState: 'minecraft:snow[layers=1]',
      designClass: 'cover-shell',
    });
    expect(comparison.sourceDifferences.every(({ priorState, recoveryState }) => (
      [priorState, recoveryState].every((state) => (
        state === 'minecraft:air' || state === 'minecraft:snow[layers=1]'
      ))
    ))).toBe(true);
  });

  it('re-guards all 5,280 operations from the recovery source', () => {
    const manifest = readManifest();
    expect(manifest.source.packageSourceStateCensus).toEqual({
      'b08-cover-shell': {
        'minecraft:air': 5237,
        'minecraft:snow[layers=1]': 15,
      },
      'b08-route-openings': {
        'minecraft:snow[layers=1]': 22,
        'minecraft:grass_block[snowy=true]': 2,
        'minecraft:short_grass': 2,
        'minecraft:dirt': 1,
        'minecraft:grass_block[snowy=false]': 1,
      },
    });
    expect(manifest.target).toMatchObject({
      operatedUnion: {
        cellCount: 5280,
        coordinateSetSha256:
          '4c1cd124726032c338de14bcce68d83a4f8f17c6de6e794318439df61d9a9944',
      },
      packageTargetsDisjoint: true,
    });
    expect(manifest.operations).toMatchObject({
      'b08-cover-shell': {
        forwardSha256:
          '531e664c901daba901c4b65ba1cfa16f23a86968e6296465b63a5e51b8e6d8b6',
        rollbackSha256:
          'ff814b6ff84fa57c65d54eee7c70ea62187c9826870dd796f242c27d748aa114',
        forwardCommandCount: 5252,
        rollbackCommandCount: 5252,
        exactInverse: true,
      },
      'b08-route-openings': {
        forwardSha256:
          '8d36be0d29528e2f4a44a8ad24544a7350482cc23583a6b18f2f1b2c3d231c04',
        rollbackSha256:
          '99c784e3575bad9542dcdd990406305a5e6ddd25c9f6abaf320096f0acfe38dd',
        forwardCommandCount: 28,
        rollbackCommandCount: 28,
        exactInverse: true,
      },
    });
  });

  it('keeps exact inverse rollback after the dynamic source rebind', () => {
    const manifest = readManifest();
    for (const pkg of manifest.packages) {
      const forward = parseOperations(path.join(ROOT, pkg.forward));
      const rollback = parseOperations(path.join(ROOT, pkg.rollback));
      expect(rollback).toEqual(forward.map(({ point, fromState, toState }) => ({
        point,
        fromState: toState,
        toState: fromState,
      })));
    }
  });

  it('allows only the exact three-cell transient-snow R03 overlap', () => {
    const manifest = readManifest();
    expect(manifest.isolation).toMatchObject({
      protectedRelicCoreIntersectionCount: 0,
      blockEntityTargetIntersectionCount: 0,
      savedEntityHaloIntersectionCount: 0,
      intentionalRecoveryPriorReleaseOverlap: {
        packageId: 'combined-zones-r03-tunnels-v2/b08-service-tunnel',
        cellCount: 3,
        coordinateSetSha256:
          '57e73520da779b7926d91941d8edc40058b234fae7d3b4a55553c65902ed374d',
      },
      undeclaredPriorReleaseIntersectionCount: 0,
    });
    expect(manifest.isolation.priorReleaseIntersections).toHaveLength(1);
    expect(manifest.isolation.priorReleaseIntersections[0]).toMatchObject({
      everyPriorTargetWasClearedToAir: true,
    });
    expect(manifest.compileGuards).toMatchObject({
      unexpectedSourceStateViolationCount: 0,
      fluidSourceStateViolationCount: 0,
      gravitySourceStateViolationCount: 0,
      forbiddenContainerSourceStateViolationCount: 0,
    });
    expect(manifest.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      executionAuthorizedByThisManifest: false,
    });
  });
});
