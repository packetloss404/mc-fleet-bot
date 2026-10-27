import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r07_b03_portal_tube.mjs',
);
const BASENAME = 'combined-zones-r07-b03-portal-tube';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const QA = path.join(ROOT, `data/world-review/${BASENAME}.manifest-qa.json`);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r07-b03-portal-tube-'),
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
    geometry: {
      frozenR03SurfaceDeferral: ExactSet;
      tubeDesign: ExactSet;
      portalPlugDesign: ExactSet;
      routeCrossSectionContinuity: {
        projectedClearCellCount: number;
        faceConnectedComponentCount: number;
        largestFaceConnectedComponentCellCount: number;
        exposedCenterlineFirstIndex: number;
        exposedCenterlineLastIndex: number;
        exposedCenterlinePointCount: number;
        exposedCenterlineContiguous: boolean;
        externalBoundaryUniqueCellCount: number;
        externalBoundaryCoordinateSetSha256: string;
        everyExternalBoundaryCellEnclosedAfterShellPackage: boolean;
      };
    };
    sourcePartition: {
      tubeShell: {
        operated: ExactSet;
        alreadyTarget: ExactSet;
        alreadyEnclosingStone: ExactSet;
        exactPartition: boolean;
      };
      routeVoid: {
        operated: ExactSet;
        portalPlugsOperated: ExactSet;
        transientSnowOperated: ExactSet;
        portalPlugsAlreadyOpen: ExactSet;
        alreadyClearAir: ExactSet;
        exactPartition: boolean;
      };
    };
  };
  source: {
    snapshotRoot: string;
    completeSaveSha256: string;
    intakeStatus: string;
    touchedChunkCount: number;
    packageSourceStateCensus: Record<string, Record<string, number>>;
  };
  target: {
    operatedUnion: ExactSet;
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
    priorReleaseIntersections: Array<{ packageId: string; cellCount: number }>;
    intentionalPriorReleaseOverlap: {
      packageId: string;
      design: ExactSet;
      operatedNow: ExactSet;
    };
    undeclaredPriorReleaseIntersectionCount: number;
  };
  compileGuards: {
    unexpectedSourceStateViolationCount: number;
    fluidSourceStateViolationCount: number;
    gravitySourceStateViolationCount: number;
    forbiddenContainerSourceStateViolationCount: number;
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
    `${BASENAME}.b03-tube-shell.forward.txt`,
    `${BASENAME}.b03-tube-shell.rollback.txt`,
    `${BASENAME}.b03-portal-openings.forward.txt`,
    `${BASENAME}.b03-portal-openings.rollback.txt`,
    `${BASENAME}.release-manifest.json`,
  ].map((filename) => path.join(directory, filename));
}

let firstCompile: Buffer[] = [];

beforeAll(() => {
  const args = [
    SCRIPT,
    '--generated-at',
    '2026-08-21T15:35:00Z',
    '--snapshot',
    'data/worldsnap-combined-zones-mvp-pre-20260821T152926Z',
    '--intake-audit',
    'data/world-review/combined-zones-mvp-complete-save-intake-20260821T153100Z.json',
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

describe('Combined Zones CZ-R07A B03 portal tube compiler', () => {
  it('regenerates every release artifact byte-for-byte', () => {
    const secondCompile = artifactPaths(temporaryDirectory)
      .map((filename) => fs.readFileSync(filename));
    expect(secondCompile).toEqual(firstCompile);
  });

  it('binds the fresh complete save and the orchestrator MVP scope contract', () => {
    const manifest = readManifest();
    expect(manifest).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      releaseNodeId: 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
      mvpScope: true,
      scopeIds: ['P1-B03'],
      status: 'COMPILED_FROM_FRESH_COMPLETE_SAVE_AWAITING_HARD_SAFETY_KERNEL',
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-mvp-pre-20260821T152926Z',
        completeSaveSha256:
          'ddb1c89efc05a306c0bfe4fc387bdfc3af1c071f82a297118bf1bb2736dd93fe',
        intakeStatus: 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
        touchedChunkCount: 29,
      },
    });
    expect(manifest.packages.map(({ key }) => key)).toEqual([
      'b03-tube-shell',
      'b03-portal-openings',
    ]);
    expect(manifest.executionOrder).toMatchObject({
      forward: ['b03-tube-shell', 'b03-portal-openings'],
      rollback: ['b03-portal-openings', 'b03-tube-shell'],
    });
  });

  it('proves a single continuous route void with every external face enclosed', () => {
    const manifest = readManifest();
    expect(manifest.scope.geometry).toMatchObject({
      frozenR03SurfaceDeferral: {
        cellCount: 8532,
        coordinateSetSha256:
          '16bc4e50ded34ee3947005783707de1801c6147067077ef16f10952b5262da92',
      },
      tubeDesign: {
        cellCount: 7682,
        coordinateSetSha256:
          'eb2c21a45b3299ca8a5afa183d3ec4be834b5629a411c434bc95bae39845a63f',
      },
      portalPlugDesign: {
        cellCount: 50,
        coordinateSetSha256:
          'dd13e1a6f5d7326e6a9f163938dc8d484dcba17e95404f00133738ec4b69397c',
      },
      routeCrossSectionContinuity: {
        projectedClearCellCount: 8532,
        faceConnectedComponentCount: 1,
        largestFaceConnectedComponentCellCount: 8532,
        exposedCenterlineFirstIndex: 188,
        exposedCenterlineLastIndex: 612,
        exposedCenterlinePointCount: 425,
        exposedCenterlineContiguous: true,
        externalBoundaryUniqueCellCount: 7682,
        externalBoundaryCoordinateSetSha256:
          'eb2c21a45b3299ca8a5afa183d3ec4be834b5629a411c434bc95bae39845a63f',
        everyExternalBoundaryCellEnclosedAfterShellPackage: true,
      },
    });
    expect(manifest.scope.sourcePartition.tubeShell).toMatchObject({
      operated: { cellCount: 7632 },
      alreadyTarget: { cellCount: 40 },
      alreadyEnclosingStone: { cellCount: 10 },
      exactPartition: true,
    });
    expect(manifest.scope.sourcePartition.routeVoid).toMatchObject({
      operated: { cellCount: 53 },
      portalPlugsOperated: { cellCount: 50 },
      transientSnowOperated: { cellCount: 3 },
      portalPlugsAlreadyOpen: { cellCount: 0 },
      alreadyClearAir: { cellCount: 8479 },
      exactPartition: true,
    });
  });

  it('emits exact per-cell guards and exact inverse rollback for all 7,685 targets', () => {
    const manifest = readManifest();
    const shell = manifest.packages[0];
    const openings = manifest.packages[1];
    const shellForward = parseOperations(path.join(ROOT, shell.forward));
    const shellRollback = parseOperations(path.join(ROOT, shell.rollback));
    const openingForward = parseOperations(path.join(ROOT, openings.forward));
    const openingRollback = parseOperations(path.join(ROOT, openings.rollback));

    expect(shellForward).toHaveLength(7632);
    expect(openingForward).toHaveLength(53);
    expect(shellForward.filter(({ fromState }) => fromState === 'minecraft:air')).toHaveLength(7631);
    expect(shellForward.filter(({ fromState }) => fromState === 'minecraft:snow[layers=1]'))
      .toHaveLength(1);
    expect(shellForward.every(({ toState }) => toState === 'minecraft:polished_diorite'))
      .toBe(true);
    expect(openingForward.filter(({ fromState }) => fromState === 'minecraft:polished_diorite'))
      .toHaveLength(50);
    expect(openingForward.filter(({ fromState }) => fromState === 'minecraft:snow[layers=1]'))
      .toHaveLength(3);
    expect(openingForward.every(({ toState }) => toState === 'minecraft:air')).toBe(true);

    expect(shellRollback).toEqual(shellForward.map(({ point, fromState, toState }) => ({
      point,
      fromState: toState,
      toState: fromState,
    })));
    expect(openingRollback).toEqual(openingForward.map(({ point, fromState, toState }) => ({
      point,
      fromState: toState,
      toState: fromState,
    })));
    const allPoints = [...shellForward, ...openingForward].map(({ point }) => point);
    expect(new Set(allPoints).size).toBe(7685);
    expect(manifest.target).toMatchObject({
      operatedUnion: { cellCount: 7685 },
      packageTargetsDisjoint: true,
    });
    expect(Object.values(manifest.operations).every((operation) => (
      operation.forwardCommandCount === operation.rollbackCommandCount
      && operation.exactInverse
    ))).toBe(true);
  });

  it('hard-aborts unsafe classes and declares only the exact R05 portal overlap', () => {
    const manifest = readManifest();
    expect(manifest.compileGuards).toMatchObject({
      unexpectedSourceStateViolationCount: 0,
      fluidSourceStateViolationCount: 0,
      gravitySourceStateViolationCount: 0,
      forbiddenContainerSourceStateViolationCount: 0,
    });
    expect(manifest.isolation).toMatchObject({
      protectedRelicCoreIntersectionCount: 0,
      blockEntityTargetIntersectionCount: 0,
      savedEntityHaloIntersectionCount: 0,
      undeclaredPriorReleaseIntersectionCount: 0,
      priorReleaseIntersections: [{
        packageId: 'combined-zones-r05-mountain/b10-finish',
        cellCount: 50,
      }],
      intentionalPriorReleaseOverlap: {
        packageId: 'combined-zones-r05-mountain/b10-finish',
        design: { cellCount: 50 },
        operatedNow: { cellCount: 50 },
      },
    });
    expect(manifest.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      executionAuthorizedByThisManifest: false,
    });
  });

  it('passes independent manifest QA, both source preflights, and all parser dry-runs', () => {
    const qa = JSON.parse(fs.readFileSync(QA, 'utf8')) as {
      status: string;
      passed: boolean;
      totals: { passedPackages: number; uniqueTargetCells: number; crossPackageIntersectionCells: number };
    };
    expect(qa).toMatchObject({
      status: 'PASS',
      passed: true,
      totals: {
        passedPackages: 2,
        uniqueTargetCells: 7685,
        crossPackageIntersectionCells: 0,
      },
    });

    for (const key of ['b03-tube-shell', 'b03-portal-openings']) {
      const preflight = JSON.parse(fs.readFileSync(
        path.join(ROOT, `data/world-review/${BASENAME}.${key}.forward.preflight.json`),
        'utf8',
      )) as { status: string; passed: number; failed: number; regionsSnapshot: { sha256: string } };
      expect(preflight).toMatchObject({
        status: 'PASS',
        failed: 0,
        regionsSnapshot: {
          sha256: '1c7df75d83f95eb8f06febafd7199586fc5c727bf63cce514292fb18ffdf67eb',
        },
      });
      expect(preflight.passed).toBe(key === 'b03-tube-shell' ? 7632 : 53);
      for (const role of ['forward', 'rollback']) {
        const dryRun = JSON.parse(fs.readFileSync(
          path.join(ROOT, `data/world-review/${BASENAME}.${key}.${role}.strict-dry-run.json`),
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
          sourceOperationCount: key === 'b03-tube-shell' ? 7632 : 53,
          worldEditLeftoverCount: 0,
        });
      }
    }
  });
});
