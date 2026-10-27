import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r08_empty_eight_fitout.mjs',
);
const BASENAME = 'combined-zones-r08-empty-eight-platform-03-fitout';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r08-platform-03-preflight');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r08-empty-eight-fitout-'),
);

interface ExactSet {
  cellCount: number;
  coordinateSetSha256: string;
}

interface ReleaseManifest {
  schemaVersion: number;
  transactionId: string;
  releaseNodeId: string;
  mvpScope: boolean;
  scopeIds: string[];
  status: string;
  packages: Array<{ key: string; forward: string; rollback: string }>;
  executionOrder: { forward: string[]; rollback: string[] };
  scope: {
    platformId: string;
    assignedTrack: number;
    geometry: {
      chamberPrism: ExactSet;
      floor: ExactSet;
      clearInterior: ExactSet;
      ceiling: ExactSet;
      completeFailClosedBarrier: ExactSet;
      retainedBarrier: ExactSet;
      staticGateCaps: ExactSet;
      existingLightingFixtures: ExactSet;
      preservedR02Mechanisms: ExactSet;
      preservedR02CarrierBands: ExactSet;
      exactDryHalo: {
        fluidCellCount: number;
        observedFluidCellCount?: number;
        containedExternalFluidCellCount?: number;
      };
    };
    transportBoundary: {
      trackCommissioned: boolean;
      poweredGateMechanismInstalled: boolean;
      futureLineSealCellCount: number;
      futureLineSealIntersectionCount: number;
      minimumXSeparationBlocks: number;
      futureLineOpeningsDeferred: boolean;
    };
    sourcePartition: {
      enclosure: { design: ExactSet; operated: ExactSet; alreadyTarget: ExactSet; exactPartition: boolean };
      interiorClearance: { design: ExactSet; operated: ExactSet; alreadyAir: ExactSet; exactPartition: boolean };
    };
  };
  source: {
    snapshotRoot: string;
    completeSaveSha256: string;
    intakeStatus: string;
    touchedChunkCount: number;
  };
  target: {
    operatedUnion: ExactSet;
    packageTargetsDisjoint: boolean;
    packageDesiredStateCensus: Record<string, Record<string, number>>;
  };
  operations: Record<string, {
    forwardSha256: string;
    rollbackSha256: string;
    forwardCommandCount: number;
    rollbackCommandCount: number;
    exactInverse: boolean;
  }>;
  isolation: {
    fluidHaloIntersectionCount: number;
    forbiddenContainerOrControlHaloCount: number;
    blockEntityHaloIntersectionCount: number;
    savedEntityHaloIntersectionCount: number;
    protectedRelicCoreIntersectionCount: number;
    deferredFutureLineSealIntersectionCount: number;
    preservedMechanismStateViolationCount: number;
    containedExternalFluidHaloCount?: number;
    intentionalPriorReleaseIntersections: Array<{ packageId: string; cellCount: number }>;
    undeclaredPriorReleaseIntersectionCount: number;
  };
  standingAuthorization: {
    releaseNodeAuthorized: boolean;
    excludedMvpScopeNamed: boolean;
  };
  safetyBoundary: {
    liveCallsPerformed: boolean;
    worldEditsPerformed: boolean;
    executionAuthorizedByThisManifest: boolean;
  };
  manifestIdentity: string;
}

interface Operation {
  point: string;
  fromState: string;
  toState: string;
}

function readManifest(filename = MANIFEST): ReleaseManifest {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as ReleaseManifest;
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
    `${BASENAME}.ee-pf-03-enclosure-finish.forward.txt`,
    `${BASENAME}.ee-pf-03-enclosure-finish.rollback.txt`,
    `${BASENAME}.ee-pf-03-interior-clearance.forward.txt`,
    `${BASENAME}.ee-pf-03-interior-clearance.rollback.txt`,
    `${BASENAME}.release-manifest.json`,
  ].map((filename) => path.join(directory, filename));
}

let firstCompile: Buffer[] = [];

beforeAll(() => {
  const args = [
    SCRIPT,
    '--generated-at',
    '2026-08-21T16:05:00Z',
    '--snapshot',
    'data/worldsnap-combined-zones-r07a-post-20260821T154500Z',
    '--intake-audit',
    'data/world-review/combined-zones-r07a-live-20260821T154500Z/post-complete-save-intake.json',
    '--out-dir',
    temporaryDirectory,
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstCompile = artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones CZ-R08A Empty Eight platform fit-out compiler', () => {
  it('regenerates every guarded artifact byte-for-byte', () => {
    expect(artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstCompile);
  });

  it('binds the accepted R07A post state and authorized MVP release node', () => {
    const manifest = readManifest();
    expect(manifest).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      mvpScope: true,
      scopeIds: ['Z02-U1-PLATFORMS', 'Z02-U1-LIFE-SAFETY-FITOUT'],
      status: 'COMPILED_FROM_ACCEPTED_R07A_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r07a-post-20260821T154500Z',
        completeSaveSha256:
          '398d1ca5cb3b2b1791cc4b1b3a33ada2a831f7165e899de27e1307f8210267b0',
        intakeStatus: 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
        touchedChunkCount: 7,
      },
      standingAuthorization: {
        releaseNodeAuthorized: true,
        excludedMvpScopeNamed: false,
      },
    });
  });

  it('reproduces the exact EE-PF-03 platform, barrier, light, and chamber geometry', () => {
    const manifest = readManifest();
    expect(manifest.scope).toMatchObject({
      platformId: 'EE-PF-03',
      assignedTrack: 3,
      geometry: {
        chamberPrism: {
          cellCount: 4242,
          coordinateSetSha256:
            'c0e647f8e37c6dbd2a02885e1eee2fece96f66d4f5109b22f9dd2b63fe221463',
        },
        floor: { cellCount: 707 },
        clearInterior: { cellCount: 2432 },
        ceiling: { cellCount: 707 },
        completeFailClosedBarrier: { cellCount: 202 },
        retainedBarrier: { cellCount: 178 },
        staticGateCaps: { cellCount: 24 },
        existingLightingFixtures: { cellCount: 7 },
        preservedR02Mechanisms: { cellCount: 201 },
        preservedR02CarrierBands: { cellCount: 194 },
        exactDryHalo: { fluidCellCount: 0 },
      },
    });
    expect(manifest.scope.transportBoundary).toEqual({
      trackCenterlineZ: 80,
      trackCommissioned: false,
      poweredGateMechanismInstalled: false,
      futureLineSealCellCount: 200,
      futureLineSealIntersectionCount: 0,
      nearestFutureLineSealX: 1872,
      fitoutMaxX: 1752,
      minimumXSeparationBlocks: 120,
      futureLineOpeningsDeferred: true,
    });
  });

  it('emits 3,962 disjoint guarded transitions with exact reverse-order inverses', () => {
    const manifest = readManifest();
    expect(manifest.packages.map(({ key }) => key)).toEqual([
      'ee-pf-03-enclosure-finish',
      'ee-pf-03-interior-clearance',
    ]);
    expect(manifest.executionOrder).toMatchObject({
      forward: ['ee-pf-03-enclosure-finish', 'ee-pf-03-interior-clearance'],
      rollback: ['ee-pf-03-interior-clearance', 'ee-pf-03-enclosure-finish'],
    });

    const allPoints: string[] = [];
    for (const pkg of manifest.packages) {
      const forward = parseOperations(path.join(ROOT, pkg.forward));
      const rollback = parseOperations(path.join(ROOT, pkg.rollback));
      const expectedRollback = forward.slice().reverse().map(({ point, fromState, toState }) => ({
        point,
        fromState: toState,
        toState: fromState,
      }));
      expect(rollback).toEqual(expectedRollback);
      expect(manifest.operations[pkg.key]).toMatchObject({
        forwardCommandCount: forward.length,
        rollbackCommandCount: rollback.length,
        exactInverse: true,
      });
      allPoints.push(...forward.map(({ point }) => point));
    }
    expect(allPoints).toHaveLength(3962);
    expect(new Set(allPoints).size).toBe(3962);
    expect(manifest.target).toMatchObject({
      operatedUnion: {
        cellCount: 3962,
        coordinateSetSha256:
          '85ebae745b64ee6d20f24f527a0e72dad935a83ffe1187466521ccae1890b91b',
      },
      packageTargetsDisjoint: true,
      packageDesiredStateCensus: {
        'ee-pf-03-enclosure-finish': {
          'minecraft:polished_diorite': 1104,
          'minecraft:polished_deepslate': 226,
          'minecraft:polished_blackstone': 178,
          'minecraft:smooth_stone': 101,
        },
        'ee-pf-03-interior-clearance': { 'minecraft:air': 2353 },
      },
    });
  });

  it('proves exact source partitions and permits only the declared R02 transition', () => {
    const manifest = readManifest();
    expect(manifest.scope.sourcePartition).toMatchObject({
      enclosure: {
        design: { cellCount: 1616 },
        operated: { cellCount: 1609 },
        alreadyTarget: { cellCount: 7 },
        exactPartition: true,
      },
      interiorClearance: {
        design: { cellCount: 2432 },
        operated: { cellCount: 2353 },
        alreadyAir: { cellCount: 79 },
        exactPartition: true,
      },
    });
    expect(manifest.isolation).toMatchObject({
      fluidHaloIntersectionCount: 0,
      forbiddenContainerOrControlHaloCount: 0,
      blockEntityHaloIntersectionCount: 0,
      savedEntityHaloIntersectionCount: 0,
      protectedRelicCoreIntersectionCount: 0,
      deferredFutureLineSealIntersectionCount: 0,
      preservedMechanismStateViolationCount: 0,
      undeclaredPriorReleaseIntersectionCount: 0,
      intentionalPriorReleaseIntersections: [
        { packageId: 'combined-zones-r02-d06-shell/d06-reservations', cellCount: 178 },
        { packageId: 'combined-zones-r02-d06-shell/d06-mechanisms', cellCount: 24 },
      ],
    });
    expect(manifest.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      executionAuthorizedByThisManifest: false,
    });
  });

  it('passes manifest QA, block-entity audit, source preflights, and parser dry-runs', () => {
    const qa = JSON.parse(fs.readFileSync(
      path.join(EVIDENCE, 'exact-release-manifest-qa.json'),
      'utf8',
    )) as {
      status: string;
      totals: { passedPackages: number; uniqueTargetCells: number; crossPackageIntersectionCells: number };
    };
    expect(qa).toMatchObject({
      status: 'PASS',
      totals: { passedPackages: 2, uniqueTargetCells: 3962, crossPackageIntersectionCells: 0 },
    });
    const blockEntities = JSON.parse(fs.readFileSync(
      path.join(EVIDENCE, 'block-entity-audit.json'),
      'utf8',
    )) as { status: string; blockingBlockEntityCount: number };
    expect(blockEntities).toMatchObject({ status: 'PASS', blockingBlockEntityCount: 0 });

    for (const [key, prefix, count] of [
      ['ee-pf-03-enclosure-finish', 'enclosure', 1609],
      ['ee-pf-03-interior-clearance', 'clearance', 2353],
    ] as const) {
      const preflight = JSON.parse(fs.readFileSync(
        path.join(EVIDENCE, `${prefix}-forward-preflight.json`),
        'utf8',
      )) as { status: string; passed: number; failed: number };
      expect(preflight).toMatchObject({ status: 'PASS', passed: count, failed: 0 });
      for (const role of ['forward', 'rollback'] as const) {
        const dryRun = JSON.parse(fs.readFileSync(
          path.join(EVIDENCE, `${prefix}-${role}-strict-dry-run.json`),
          'utf8',
        )) as {
          status: string;
          dryRun: boolean;
          strictNoop: boolean;
          operationRole: string;
          sourceOperationCount: number;
          worldEditLeftoverCount: number;
        };
        expect(dryRun).toMatchObject({
          status: 'dry_run',
          dryRun: true,
          strictNoop: true,
          operationRole: role,
          sourceOperationCount: count,
          worldEditLeftoverCount: 0,
        });
      }
      expect(readManifest().operations[key].exactInverse).toBe(true);
    }

    for (const [filename, count, overlayCount] of [
      ['clearance-forward-ordered-overlay-preflight.json', 2353, 1],
      ['clearance-projected-rollback-preflight.json', 2353, 2],
      ['enclosure-projected-rollback-preflight.json', 1609, 3],
    ] as const) {
      const projected = JSON.parse(fs.readFileSync(
        path.join(EVIDENCE, filename),
        'utf8',
      )) as {
        status: string;
        passed: number;
        failed: number;
        sourceOverlays: { kind: string; artifacts: unknown[]; failed: number };
      };
      expect(projected).toMatchObject({ status: 'PASS', passed: count, failed: 0 });
      expect(projected.sourceOverlays).toMatchObject({
        kind: 'exact-guarded-logical-source-overlay',
        failed: 0,
      });
      expect(projected.sourceOverlays.artifacts).toHaveLength(overlayCount);
    }
  });

  it('is accepted by the scoped wrapper and prints the complete preparation plan', () => {
    const output = execFileSync(process.execPath, [
      'scripts/run_combined_zones_scoped_release.mjs',
      '--manifest',
      `data/buildops/${BASENAME}.release-manifest.json`,
      '--release-node',
      'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8' });
    expect(JSON.parse(output)).toEqual({
      mode: 'PREPARE_ONLY',
      globalGateDependency: 'NONE',
      packageOrder: ['ee-pf-03-enclosure-finish', 'ee-pf-03-interior-clearance'],
      stages: [
        'standing-authorization',
        'exact-release-manifest-qa',
        'fresh-source-complete-save',
        'source-complete-save-intake-and-coverage',
        'forward-source-preflight',
        'strict-forward-parser-check',
        'strict-rollback-parser-check',
        'projected-rollback-preflight',
        'block-entity-clearance',
        'live-entity-clearance',
      ],
    });
  });

  it('admits EE-PF-02 only through its exact solid containment boundary', () => {
    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'combined-zones-r08-contained-fluid-fitout-'),
    );
    try {
      execFileSync(process.execPath, [
        SCRIPT,
        '--generated-at',
        '2026-08-21T16:34:00Z',
        '--snapshot',
        'data/worldsnap-combined-zones-r08b-post-20260821T162429Z',
        '--intake-audit',
        'data/world-review/combined-zones-r08b-live-20260821T162429Z/post-complete-save-intake.json',
        '--platform-id',
        'EE-PF-02',
        '--out-dir',
        directory,
      ], { cwd: ROOT, stdio: 'pipe' });
      const manifestPath = path.join(
        directory,
        'combined-zones-r08-empty-eight-platform-02-fitout.release-manifest.json',
      );
      const manifest = readManifest(manifestPath);
      expect(manifest.scope).toMatchObject({
        platformId: 'EE-PF-02',
        assignedTrack: 2,
        geometry: {
          exactDryHalo: {
            fluidCellCount: 0,
            observedFluidCellCount: 7,
            containedExternalFluidCellCount: 7,
          },
        },
      });
      expect(manifest.isolation).toMatchObject({
        fluidHaloIntersectionCount: 0,
        containedExternalFluidHaloCount: 7,
      });
      expect(manifest.target.operatedUnion.cellCount).toBe(4011);
      const operations = manifest.packages.flatMap((pkg) => parseOperations(pkg.forward));
      expect(operations).toHaveLength(4011);
      expect(operations.some(({ point, fromState, toState }) => (
        point.endsWith(',68')
        || fromState.startsWith('minecraft:lava')
        || toState.startsWith('minecraft:lava')
      ))).toBe(false);
      const qaOutput = path.join(directory, 'manifest-qa.json');
      execFileSync(process.execPath, [
        'scripts/qa_guarded_release_manifest.mjs',
        '--manifest',
        manifestPath,
        '--out',
        qaOutput,
      ], { cwd: ROOT, stdio: 'pipe' });
      expect(JSON.parse(fs.readFileSync(qaOutput, 'utf8'))).toMatchObject({
        status: 'PASS',
        totals: { passedPackages: 2, uniqueTargetCells: 4011 },
      });
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
