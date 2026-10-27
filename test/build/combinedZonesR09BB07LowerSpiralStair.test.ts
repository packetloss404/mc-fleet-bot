import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r09b_b07_lower_spiral_stair.mjs',
);
const BASENAME = 'combined-zones-r09b-b07-lower-spiral-stair';
const PACKAGE_KEY = 'b07-lower-spiral-stair';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r09b-b07-lower-spiral-stair-'),
);

interface ExactSet {
  cellCount: number;
  coordinateSetSha256: string;
}

interface Manifest {
  schemaVersion: number;
  transactionId: string;
  status: string;
  releaseNodeId: string;
  mvpScope: boolean;
  packages: Array<{ key: string; forward: string; rollback: string }>;
  scope: {
    canonicalOwner: string;
    geometry: {
      dryLowerShaftEnvelope: ExactSet;
      staticCore: ExactSet;
      slabHelixAndLanding: ExactSet;
      upperHoldCap: ExactSet;
      operatedUnion: ExactSet;
      stairPath: {
        orderedCellCount: number;
        maximumRiseHalfBlocks: number;
        cardinallyContiguous: boolean;
      };
    };
    operationalBoundary: Record<string, boolean>;
  };
  source: {
    snapshotRoot: string;
    completeSaveSha256: string;
    sourceLedgerCompletedReleaseIdentitySha256: string;
  };
  target: {
    operatedCellCount: number;
    operatedCoordinateSetSha256: string;
    sourceStateCensus: Record<string, number>;
    desiredStateCensus: Record<string, number>;
  };
  operations: Record<string, {
    forwardSha256: string;
    rollbackSha256: string;
    forwardCommandCount: number;
    rollbackCommandCount: number;
    targetCellCount: number;
    exactInverse: boolean;
    reverseOrderInverse: boolean;
    oneCellGuards: boolean;
  }>;
  safetyBoundary: Record<string, number>;
  manifestIdentity: string;
}

interface Operation {
  point: [number, number, number];
  fromState: string;
  toState: string;
}

const readManifest = (filename = MANIFEST): Manifest => (
  JSON.parse(fs.readFileSync(filename, 'utf8')) as Manifest
);

function parseOperations(filename: string): Operation[] {
  return fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line.startsWith('REPL '))
    .map((line) => {
      const fields = line.split(/\s+/);
      expect(fields).toHaveLength(9);
      expect(fields.slice(1, 4)).toEqual(fields.slice(4, 7));
      return {
        point: fields.slice(1, 4).map(Number) as [number, number, number],
        fromState: fields[7],
        toState: fields[8],
      };
    });
}

function bodySha256(filename: string): string {
  const body = `${fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .join('\n')}\n`;
  return crypto.createHash('sha256').update(body).digest('hex');
}

function artifactPaths(directory: string): string[] {
  return [
    `${BASENAME}.${PACKAGE_KEY}.forward.txt`,
    `${BASENAME}.${PACKAGE_KEY}.rollback.txt`,
    `${BASENAME}.release-manifest.json`,
  ].map((filename) => path.join(directory, filename));
}

let firstCompile: Buffer[] = [];

beforeAll(() => {
  const args = [
    SCRIPT,
    '--generated-at',
    '2026-08-21T17:26:00Z',
    '--snapshot',
    'data/worldsnap-combined-zones-r07f-post-20260821T172700Z',
    '--intake-audit',
    'data/world-review/combined-zones-r07f-live-20260821T172700Z/post-complete-save-intake.json',
    '--source-ledger',
    'data/world-review/combined-zones-r07f-live-20260821T172700Z/evidence-ledger.json',
    '--out-dir',
    temporaryDirectory,
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstCompile = artifactPaths(temporaryDirectory)
    .map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones CZ-R09B B07 lower spiral stair compiler', () => {
  it('regenerates every guarded artifact byte-for-byte', () => {
    expect(artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstCompile);
  });

  it('binds the accepted terminal source and authorized R09 node', () => {
    expect(readManifest()).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      status: 'COMPILED_FROM_LATEST_ACCEPTED_POST_STATE_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT',
      mvpScope: true,
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r07f-post-20260821T172700Z',
        completeSaveSha256:
          'b7f0ec5a7712dd1b7252f0adb755ae8d8374bf2f63740f089ec79f15f03c7410',
        sourceLedgerCompletedReleaseIdentitySha256:
          '15facdcd036fdfba27ef0e76a0167b00e1acf118804415da159167e46b4a806e',
      },
    });
  });

  it('freezes the 5x5 core, half-step helix, landing, and closed upper hold', () => {
    expect(readManifest().scope).toMatchObject({
      canonicalOwner: 'Z06-PUBLIC-SHAFT-FITOUT',
      geometry: {
        dryLowerShaftEnvelope: { cellCount: 3087 },
        staticCore: {
          cellCount: 1575,
          coordinateSetSha256:
            '4c2f3f77b25cab4d3cd007a2fdf8c99443a016913c9dd582beccd1981bd937f1',
        },
        slabHelixAndLanding: {
          cellCount: 128,
          coordinateSetSha256:
            'cd994ef33913e8565b11c59e0e89155bdac015266a9d3ac006af3b68b28d2640',
        },
        upperHoldCap: { cellCount: 2 },
        operatedUnion: {
          cellCount: 1705,
          coordinateSetSha256:
            '7397619da80fe765bffa55e4698f327597d9f6c2adf8e65ac20b171cd352799c',
        },
        stairPath: {
          orderedCellCount: 128,
          maximumRiseHalfBlocks: 1,
          cardinallyContiguous: true,
        },
      },
      operationalBoundary: {
        lowerLobbyFloorTouched: false,
        upperWetZoneTouched: false,
        upperShaftOpened: false,
        liftInstalledOrCommissioned: false,
        pedestrianRouteCommissionedBeyondHoldCap: false,
        exactRollbackRestoresAllTargetAir: true,
      },
    });
  });

  it('emits 1,705 exact point guards with a complete reverse-order inverse', () => {
    const manifest = readManifest();
    const pkg = manifest.packages[0];
    const forwardPath = path.join(ROOT, pkg.forward);
    const rollbackPath = path.join(ROOT, pkg.rollback);
    const forward = parseOperations(forwardPath);
    const rollback = parseOperations(rollbackPath);

    expect(forward).toHaveLength(1705);
    expect(new Set(forward.map(({ point }) => point.join(','))).size).toBe(1705);
    expect(forward.every(({ fromState }) => fromState === 'minecraft:air')).toBe(true);
    expect(rollback).toEqual(forward.slice().reverse().map((operation) => ({
      point: operation.point,
      fromState: operation.toState,
      toState: operation.fromState,
    })));
    expect(bodySha256(forwardPath)).toBe(manifest.operations[PACKAGE_KEY].forwardSha256);
    expect(bodySha256(rollbackPath)).toBe(manifest.operations[PACKAGE_KEY].rollbackSha256);
    expect(manifest.operations[PACKAGE_KEY]).toMatchObject({
      forwardCommandCount: 1705,
      rollbackCommandCount: 1705,
      targetCellCount: 1705,
      exactInverse: true,
      reverseOrderInverse: true,
      oneCellGuards: true,
    });
    expect(manifest.target).toMatchObject({
      operatedCellCount: 1705,
      sourceStateCensus: { 'minecraft:air': 1705 },
      desiredStateCensus: {
        'minecraft:polished_andesite': 1575,
        'minecraft:smooth_stone_slab[type=top,waterlogged=false]': 66,
        'minecraft:smooth_stone_slab[type=bottom,waterlogged=false]': 62,
        'minecraft:polished_diorite': 2,
      },
    });
  });

  it('passes structural manifest QA and leaves hazards outside the operated set', () => {
    const report = path.join(temporaryDirectory, 'manifest-qa.json');
    execFileSync(process.execPath, [
      'scripts/qa_guarded_release_manifest.mjs',
      '--manifest',
      `data/buildops/${BASENAME}.release-manifest.json`,
      '--out',
      report,
    ], { cwd: ROOT, stdio: 'pipe' });
    expect(JSON.parse(fs.readFileSync(report, 'utf8'))).toMatchObject({
      status: 'PASS',
      passed: true,
      totals: {
        packages: 1,
        passedPackages: 1,
        uniqueTargetCells: 1705,
        crossPackageIntersectionCells: 0,
      },
    });
    expect(readManifest().safetyBoundary).toMatchObject({
      targetFluidCount: 0,
      haloFluidCount: 0,
      untouchedHaloGravityCount: 5,
      gravitySupportRemovedCount: 0,
      blockEntityIntersectionCount: 0,
      savedEntityIntersectionCount: 0,
      protectedRelicIntersectionCount: 0,
      r09aFloorOverlapCount: 0,
      r06WetTreatmentOverlapCount: 0,
    });
  });
});
