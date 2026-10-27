import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r09d_b07_terminal_crown.mjs',
);
const BASENAME = 'combined-zones-r09d-b07-terminal-crown';
const PACKAGE_KEY = 'b07-terminal-crown';
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r09d-b07-terminal-crown-offline-20260821T180800Z',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r09d-terminal-crown-'),
);

interface Operation {
  point: number[];
  fromState: string;
  toState: string;
}

interface Manifest {
  schemaVersion: number;
  transactionId: string;
  status: string;
  releaseNodeId: string;
  mvpScope: boolean;
  manifestIdentity: string;
  source: Record<string, string | number>;
  scope: {
    canonicalOwner: string;
    geometry: Record<string, { cellCount: number; coordinateSetSha256: string }>;
    ownership: Record<string, unknown>;
    reachabilityClosure: Record<string, unknown>;
    operationalBoundary: Record<string, boolean>;
  };
  target: Record<string, unknown>;
  operations: Record<string, Record<string, string | number | boolean>>;
  packages: Array<{ key: string; forward: string; rollback: string }>;
  priorReleaseInterfaces: Record<string, { cellCount: number }>;
  safetyBoundary: Record<string, number>;
}

const artifactPaths = (directory: string) => [
  path.join(directory, `${BASENAME}.${PACKAGE_KEY}.forward.txt`),
  path.join(directory, `${BASENAME}.${PACKAGE_KEY}.rollback.txt`),
  path.join(directory, `${BASENAME}.release-manifest.json`),
];

function readManifest(directory = path.join(ROOT, 'data/buildops')): Manifest {
  return JSON.parse(fs.readFileSync(
    path.join(directory, `${BASENAME}.release-manifest.json`),
    'utf8',
  )) as Manifest;
}

function parseOperations(filename: string): Operation[] {
  return fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const fields = line.split(/\s+/);
      expect(fields[0]).toBe('REPL');
      expect(fields).toHaveLength(9);
      expect(fields.slice(1, 4)).toEqual(fields.slice(4, 7));
      return {
        point: fields.slice(1, 4).map(Number),
        fromState: fields[7],
        toState: fields[8],
      };
    });
}

function bodySha256(filename: string): string {
  const body = `${fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
  return crypto.createHash('sha256').update(body).digest('hex');
}

let firstCompile: Buffer[];

beforeAll(() => {
  const args = [
    SCRIPT,
    '--generated-at', '2026-08-21T18:08:00Z',
    '--snapshot', 'data/worldsnap-combined-zones-r08n-post-20260821T180151Z',
    '--intake-audit',
    'data/world-review/combined-zones-r08n-live-20260821T180151Z/post-complete-save-intake.json',
    '--source-ledger',
    'data/world-review/combined-zones-r08n-live-20260821T180151Z/evidence-ledger.json',
    '--out-dir', temporaryDirectory,
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstCompile = artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones CZ-R09D B07 terminal crown compiler', () => {
  it('regenerates every guarded artifact byte-for-byte', () => {
    expect(artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstCompile);
  });

  it('binds the latest accepted R08N terminal post exactly', () => {
    expect(readManifest()).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      status: 'COMPILED_FROM_LATEST_ACCEPTED_POST_STATE_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT',
      mvpScope: true,
      manifestIdentity:
        'eba26411e7076fd30899c891b57677a48e8daba8772897bb998e42f8bf1d58a0',
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r08n-post-20260821T180151Z',
        completeSaveSha256:
          '083a2ba58d70dfdae65b16c20b8b19c785bc7bb897fe39e054f1f8e06b37ac8c',
        regionSnapshotSha256:
          '6634800dff0fbcd11a7aadd0e4c90804c9d098e6ef9f8b2660e7d29d9b76cd7e',
        sourceLedgerSha256:
          'f65dcb8181519a505bf608bb2b08fcda41741f484a2774eb60540cc8e2dd7dfb',
        sourceLedgerCompletedReleaseIdentitySha256:
          '3b223d0482b9acabea43b864b41a9a72ddc285766dcbffe12e69d52ac142c70a',
      },
    });
  });

  it('owns the complete 5x5 core perimeter and leaves the route clearance untouched', () => {
    expect(readManifest().scope).toMatchObject({
      canonicalOwner: 'Z06-PUBLIC-SHAFT-FITOUT',
      geometry: {
        terminalCrown: {
          cellCount: 16,
          coordinateSetSha256:
            '656002eadbb3714eab9d99016a59f63ffaf7d1fdce899242219746c7fb32ef01',
        },
        preservedCoreTop: { cellCount: 25 },
        enclosedCoreInteriorTop: { cellCount: 9 },
        preservedStairClearance: { cellCount: 256 },
        existingRetainedCap: { cellCount: 3 },
      },
      ownership: {
        canonicalB07ConstructionCellCount: 8134,
        canonicalB07InteractionCellCount: 13608,
        crownConstructionCellCount: 16,
        crownInteractionOnlyCellCount: 0,
        crownOutsideInteractionCellCount: 0,
      },
      operationalBoundary: {
        stairPathTouched: false,
        stairHeadroomTouched: false,
        existingCoreTouched: false,
        retainedCapTouched: false,
        r09aFloorTouched: false,
        r06TreatmentTouched: false,
        r09bOperatedTouched: false,
        r09cOperatedTouched: false,
        wetZoneLiftSmokePowerDrainageTouched: false,
      },
    });
  });

  it('closes the upper landing under a conservative eight-neighbour surface graph', () => {
    const manifest = readManifest();
    expect(manifest.scope.reachabilityClosure).toMatchObject({
      model:
        'CONSERVATIVE_EIGHT_NEIGHBOUR_PLAYER_SURFACE_GRAPH_WITH_ONE_BLOCK_MAX_RISE_AND_ALL_DIAGONALS_ADMITTED',
      diagonalPolicy: 'ADMIT_ALL_DIAGONALS_AS_CONSERVATIVE_OVER_APPROXIMATION',
      terminalRouteSurfaceCount: 5,
      beforeSurfaceGraphNodeCount: 31,
      projectedSurfaceGraphNodeCount: 31,
      directCoreEntryEdgeCountBeforeCrown: 11,
      directForbiddenEntryEdgeCountAfterCrown: 0,
      reachableCoreOrCapSurfaceCountBeforeProjection: 26,
      crownSurfaceY2: 12,
      coreInteriorSurfaceY2: 10,
      capSurfaceY2: 12,
      maximumTerminalRouteSurfaceY2: 8,
      minimumBarrierRiseHalfBlocks: 4,
      reachableCoreOrCapSurfaceCountAfterProjection: 0,
      diagonalBypassCountAfterProjection: 0,
      crownCompletePerimeter: true,
    });

    const operations = parseOperations(path.join(ROOT, manifest.packages[0].forward));
    const perimeter = new Set(operations.map(({ point }) => `${point[0]},${point[2]}`));
    for (let x = 2104; x <= 2108; x += 1) {
      expect(perimeter.has(`${x},-430`)).toBe(true);
      expect(perimeter.has(`${x},-426`)).toBe(true);
    }
    for (let z = -429; z <= -427; z += 1) {
      expect(perimeter.has(`2104,${z}`)).toBe(true);
      expect(perimeter.has(`2108,${z}`)).toBe(true);
    }
    expect(perimeter.size).toBe(16);

    // From the highest route surface (Y=4), every perimeter/cap top is at
    // Y=6. The lower Y=5 core interior has no adjacent or diagonal entry: its
    // complete one-cell perimeter is collision-solid through Y=6.
    const terminalRoute = [
      [2106, -431], [2107, -431], [2108, -431],
      [2109, -431], [2109, -430],
    ];
    const interior = [] as number[][];
    for (let x = 2105; x <= 2107; x += 1) {
      for (let z = -429; z <= -427; z += 1) interior.push([x, z]);
    }
    expect(terminalRoute.some(([x, z]) => interior.some(([ix, iz]) => (
      Math.max(Math.abs(x - ix), Math.abs(z - iz)) <= 1
    )))).toBe(false);
  });

  it('emits 16 air-only point guards with an exact reverse-order inverse', () => {
    const manifest = readManifest();
    const pkg = manifest.packages[0];
    const forwardPath = path.join(ROOT, pkg.forward);
    const rollbackPath = path.join(ROOT, pkg.rollback);
    const forward = parseOperations(forwardPath);
    const rollback = parseOperations(rollbackPath);
    expect(forward).toHaveLength(16);
    expect(new Set(forward.map(({ point }) => point.join(','))).size).toBe(16);
    expect(forward.every(({ point, fromState, toState }) => (
      point[1] === 5
      && fromState === 'minecraft:air'
      && toState === 'minecraft:polished_andesite'
    ))).toBe(true);
    expect(rollback).toEqual(forward.slice().reverse().map((operation) => ({
      point: operation.point,
      fromState: operation.toState,
      toState: operation.fromState,
    })));
    expect(bodySha256(forwardPath)).toBe(manifest.operations[PACKAGE_KEY].forwardSha256);
    expect(bodySha256(rollbackPath)).toBe(manifest.operations[PACKAGE_KEY].rollbackSha256);
    expect(manifest.operations[PACKAGE_KEY]).toMatchObject({
      forwardCommandCount: 16,
      rollbackCommandCount: 16,
      targetCellCount: 16,
      exactInverse: true,
      reverseOrderInverse: true,
      oneCellGuards: true,
    });
  });

  it('passes every offline hard-safety gate and the scoped wrapper plan', () => {
    expect(readManifest()).toMatchObject({
      priorReleaseInterfaces: {
        r06TreatmentOverlap: { cellCount: 0 },
        r09aFloorOverlap: { cellCount: 0 },
        r09bOperatedOverlap: { cellCount: 0 },
        r09cOperatedOverlap: { cellCount: 0 },
      },
      safetyBoundary: {
        targetFluidCount: 0,
        haloFluidCount: 0,
        targetGravityCount: 0,
        haloGravityCount: 0,
        gravitySupportRemovedCount: 0,
        blockEntityIntersectionCount: 0,
        savedEntityIntersectionCount: 0,
        protectedRelicIntersectionCount: 0,
      },
    });
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'manifest-qa.json'), 'utf8')))
      .toMatchObject({
        status: 'PASS',
        passed: true,
        totals: { packages: 1, passedPackages: 1, uniqueTargetCells: 16 },
      });
    for (const filename of ['forward-source-preflight.json', 'projected-rollback-preflight.json']) {
      expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, filename), 'utf8')))
        .toMatchObject({ status: 'PASS', passed: 16, failed: 0 });
    }
    for (const [filename, role] of [
      ['forward-strict-dry-run.json', 'forward'],
      ['rollback-strict-dry-run.json', 'rollback'],
    ] as const) {
      expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, filename), 'utf8')))
        .toMatchObject({
          status: 'dry_run',
          strictNoop: true,
          operationRole: role,
          sourceOperationCount: 16,
          worldEditLeftoverCount: 0,
        });
    }
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'block-entity-clearance.json'), 'utf8')))
      .toMatchObject({ status: 'PASS', blockingBlockEntityCount: 0 });
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'wrapper-plan.json'), 'utf8')))
      .toMatchObject({
        mode: 'PREPARE_ONLY',
        globalGateDependency: 'NONE',
        packageOrder: [PACKAGE_KEY],
      });
  });
});
