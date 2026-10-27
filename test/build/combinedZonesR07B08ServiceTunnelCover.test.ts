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
const BASENAME = 'combined-zones-r07c-b08-service-tunnel-cover';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r07c-b08-cover-'),
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
    releaseId: string;
    materialDoctrine: { shell: string; routeVoid: string };
    geometry: {
      frozenB08Construction: ExactSet;
      externalBoundary: ExactSet;
      shellDesign: ExactSet;
      westEntrance: ExactSet;
      b03Connection: ExactSet;
      projectedRouteAndEntranceVoid: ExactSet;
      routeContinuity: {
        projectedClearCellCount: number;
        faceConnectedComponentCount: number;
        largestFaceConnectedComponentCellCount: number;
        everyExternalBoundaryCellResolved: boolean;
        apertureCount: number;
        apertureCellCount: number;
      };
    };
    sourcePartition: {
      coverShell: {
        operated: ExactSet;
        alreadyEnclosing: ExactSet;
        alreadyEnclosingStateCensus: Record<string, number>;
        exactPartition: boolean;
      };
      routeAndEntrance: {
        operated: ExactSet;
        alreadyAir: ExactSet;
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
  target: { operatedUnion: ExactSet; packageTargetsDisjoint: boolean };
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
    priorReleaseIntersections: unknown[];
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
    '--generated-at',
    '2026-08-21T16:10:00Z',
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

describe('Combined Zones CZ-R07C B08 service-tunnel cover compiler', () => {
  it('regenerates every release artifact byte-for-byte', () => {
    const secondCompile = artifactPaths(temporaryDirectory)
      .map((filename) => fs.readFileSync(filename));
    expect(secondCompile).toEqual(firstCompile);
  });

  it('binds the accepted R07A post-state and the R07 MVP release node', () => {
    const manifest = readManifest();
    expect(manifest).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      releaseNodeId: 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
      mvpScope: true,
      scopeIds: ['P1-B08'],
      status: 'COMPILED_FROM_ACCEPTED_R07A_POSTSTATE_AWAITING_HARD_SAFETY_KERNEL',
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r07a-post-20260821T154500Z',
        completeSaveSha256:
          '398d1ca5cb3b2b1791cc4b1b3a33ada2a831f7165e899de27e1307f8210267b0',
        intakeStatus: 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
        touchedChunkCount: 20,
      },
    });
    expect(manifest.packages.map(({ key }) => key)).toEqual([
      'b08-cover-shell',
      'b08-route-openings',
    ]);
    expect(manifest.executionOrder).toMatchObject({
      forward: ['b08-cover-shell', 'b08-route-openings'],
      rollback: ['b08-route-openings', 'b08-cover-shell'],
    });
  });

  it('partitions the full external boundary into cover and two exact apertures', () => {
    const manifest = readManifest();
    expect(manifest.scope.geometry).toMatchObject({
      frozenB08Construction: {
        cellCount: 7878,
        coordinateSetSha256:
          '967a9ddd39775cfc4cbc851fd51abc4726a1e20ab632b433b45d386393254882',
      },
      externalBoundary: {
        cellCount: 5327,
        coordinateSetSha256:
          '83c7bae09d31a562de9cf0d1c31d35ad68b04438545270ee592e462e6c657994',
      },
      shellDesign: {
        cellCount: 5283,
        coordinateSetSha256:
          'e61aca484f2ff44d2ace64d1b9948236c7c59586743ef79d159dc0a776e7ce79',
      },
      westEntrance: {
        cellCount: 24,
        coordinateSetSha256:
          'b7a6d1173b904243df812c16c7465c081211e30a2f4599d2f858bf0ddffda49f',
      },
      b03Connection: {
        cellCount: 20,
        coordinateSetSha256:
          '95b1b86fa537ebc6aae1bdefae200a218971ba5643cf2f8e1a19f347b8fa0e85',
      },
      routeContinuity: {
        projectedClearCellCount: 7902,
        faceConnectedComponentCount: 1,
        largestFaceConnectedComponentCellCount: 7902,
        everyExternalBoundaryCellResolved: true,
        apertureCount: 2,
        apertureCellCount: 44,
      },
    });
  });

  it('emits exact per-cell guards and exact inverse rollback for 5,280 targets', () => {
    const manifest = readManifest();
    const shellForward = parseOperations(path.join(ROOT, manifest.packages[0].forward));
    const shellRollback = parseOperations(path.join(ROOT, manifest.packages[0].rollback));
    const openingsForward = parseOperations(path.join(ROOT, manifest.packages[1].forward));
    const openingsRollback = parseOperations(path.join(ROOT, manifest.packages[1].rollback));

    expect(shellForward).toHaveLength(5252);
    expect(openingsForward).toHaveLength(28);
    expect(shellForward.filter(({ fromState }) => fromState === 'minecraft:air'))
      .toHaveLength(5239);
    expect(shellForward.filter(({ fromState }) => fromState === 'minecraft:snow[layers=1]'))
      .toHaveLength(13);
    expect(shellForward.every(({ toState }) => toState === 'minecraft:polished_diorite'))
      .toBe(true);
    expect(openingsForward.every(({ toState }) => toState === 'minecraft:air')).toBe(true);
    expect(new Set([...shellForward, ...openingsForward].map(({ point }) => point)).size)
      .toBe(5280);
    expect(shellRollback).toEqual(shellForward.map(({ point, fromState, toState }) => ({
      point,
      fromState: toState,
      toState: fromState,
    })));
    expect(openingsRollback).toEqual(openingsForward.map(({ point, fromState, toState }) => ({
      point,
      fromState: toState,
      toState: fromState,
    })));
    expect(manifest.target).toMatchObject({
      operatedUnion: {
        cellCount: 5280,
        coordinateSetSha256:
          '961edbe920f3433803868318af0b1ed59806d278fa18a798602fc466679c74e6',
      },
      packageTargetsDisjoint: true,
    });
  });

  it('preserves exact natural enclosure cells and clears only the allow-listed sources', () => {
    const manifest = readManifest();
    expect(manifest.scope.sourcePartition).toMatchObject({
      coverShell: {
        operated: { cellCount: 5252 },
        alreadyEnclosing: { cellCount: 31 },
        alreadyEnclosingStateCensus: {
          'minecraft:grass_block[snowy=true]': 14,
          'minecraft:dirt': 12,
          'minecraft:stone': 5,
        },
        exactPartition: true,
      },
      routeAndEntrance: {
        operated: { cellCount: 28 },
        alreadyAir: { cellCount: 7874 },
        exactPartition: true,
      },
    });
    expect(manifest.source.packageSourceStateCensus['b08-route-openings']).toEqual({
      'minecraft:snow[layers=1]': 22,
      'minecraft:grass_block[snowy=true]': 2,
      'minecraft:short_grass': 2,
      'minecraft:dirt': 1,
      'minecraft:grass_block[snowy=false]': 1,
    });
  });

  it('fails closed around protected, stateful, fluid, gravity, entity, and prior targets', () => {
    const manifest = readManifest();
    expect(manifest.isolation).toEqual({
      protectedRelicCoreIntersectionCount: 0,
      blockEntityTargetIntersectionCount: 0,
      savedEntityHaloIntersectionCount: 0,
      priorReleaseIntersections: [],
      undeclaredPriorReleaseIntersectionCount: 0,
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
