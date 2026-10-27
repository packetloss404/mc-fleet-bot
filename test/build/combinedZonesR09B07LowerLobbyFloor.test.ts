import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r09_b07_lower_lobby_floor.mjs',
);
const BASENAME = 'combined-zones-r09-b07-lower-lobby-floor';
const PACKAGE_KEY = 'b07-lower-lobby-floor';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r09-b07-lower-lobby-floor-'),
);

interface ExactSet {
  cellCount: number;
  coordinateSetSha256: string;
}

interface ReleaseManifest {
  schemaVersion: number;
  transactionId: string;
  status: string;
  releaseNodeId: string;
  mvpScope: boolean;
  scopeIds: string[];
  packages: Array<{ key: string; forward: string; rollback: string }>;
  scope: {
    canonicalOwner: string;
    geometry: {
      acceptedB07Construction: ExactSet;
      lowerLobbyFloor: ExactSet;
      primaryFinish: ExactSet;
      secondaryAisle: ExactSet;
      stableFoundationContacts: ExactSet & {
        sourceStateCensus: Record<string, number>;
        unsupportedCellCount: number;
      };
      clearStandingPlane: ExactSet;
      clearHeadPlane: ExactSet;
      interactionHalo: ExactSet;
    };
    materialDoctrine: {
      primary: string;
      secondary: string;
    };
    operationalBoundary: Record<string, boolean>;
    sourcePartition: {
      design: ExactSet;
      operated: ExactSet;
      alreadyTarget: ExactSet;
      sourceStateCensus: Record<string, number>;
      exactPartition: boolean;
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
    desiredStateCensus: Record<string, number>;
    packageTargetsDisjoint: boolean;
  };
  operations: Record<string, {
    forwardSha256: string;
    rollbackSha256: string;
    forwardCommandCount: number;
    rollbackCommandCount: number;
    targetCellCount: number;
    targetCoordinateSetSha256: string;
    exactInverse: boolean;
  }>;
  isolation: {
    fluidHaloIntersectionCount: number;
    gravityHaloIntersectionCount: number;
    forbiddenContainerOrControlHaloCount: number;
    blockEntityHaloIntersectionCount: number;
    savedEntityHaloIntersectionCount: number;
    protectedRelicHaloIntersectionCount: number;
    d06MechanismHaloIntersectionCount: number;
    intentionalPriorReleaseIntersections: Array<{
      packageId: string;
      cellCount: number;
      coordinateSetSha256: string;
      transitionCensus: Record<string, number>;
    }>;
    undeclaredPriorReleaseIntersectionCount: number;
  };
  compileGuards: Record<string, number | string>;
  safetyBoundary: {
    liveCallsPerformed: boolean;
    worldEditsPerformed: boolean;
    executionAuthorizedByThisManifest: boolean;
  };
  manifestIdentity: string;
}

interface Operation {
  from: [number, number, number];
  to: [number, number, number];
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
      return {
        from: fields.slice(1, 4).map(Number) as [number, number, number],
        to: fields.slice(4, 7).map(Number) as [number, number, number],
        fromState: fields[7],
        toState: fields[8],
      };
    });
}

function expand(operations: Operation[]): Map<string, Operation> {
  const result = new Map<string, Operation>();
  for (const operation of operations) {
    const [x1, y1, z1] = operation.from;
    const [x2, y2, z2] = operation.to;
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) {
        for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z += 1) {
          const key = `${x},${y},${z}`;
          expect(result.has(key)).toBe(false);
          result.set(key, operation);
        }
      }
    }
  }
  return result;
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
    '2026-08-21T16:45:00Z',
    '--snapshot',
    'data/worldsnap-combined-zones-r08b-post-20260821T162429Z',
    '--intake-audit',
    'data/world-review/combined-zones-r08b-live-20260821T162429Z/post-complete-save-intake.json',
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

describe('Combined Zones CZ-R09A B07 lower-lobby floor compiler', () => {
  it('regenerates the guarded artifacts byte-for-byte', () => {
    expect(artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstCompile);
  });

  it('binds the newest accepted R08B post state and authorized R09 MVP node', () => {
    expect(readManifest()).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R08B_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT',
      mvpScope: true,
      scopeIds: ['P1-B07', 'Z06-PUBLIC-SHAFT-FITOUT'],
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r08b-post-20260821T162429Z',
        completeSaveSha256:
          'db8be11127b00fc779a7e70afa400c3e2a3f7782f4d7a95d8ef2374c2a1c8ce7',
        intakeStatus: 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
        touchedChunkCount: 2,
      },
    });
  });

  it('derives the exact dry B07 lobby floor, support, and clear headroom', () => {
    expect(readManifest().scope).toMatchObject({
      canonicalOwner: 'Z06-PUBLIC-SHAFT-FITOUT',
      geometry: {
        acceptedB07Construction: { cellCount: 8134 },
        lowerLobbyFloor: {
          cellCount: 63,
          coordinateSetSha256:
            '1d6d17740ee4df2253b3d2825456097cdadae5d108142d84174b03a38c9a82cd',
        },
        primaryFinish: { cellCount: 36 },
        secondaryAisle: { cellCount: 27 },
        stableFoundationContacts: {
          cellCount: 63,
          sourceStateCensus: {
            'minecraft:deepslate[axis=y]': 43,
            'minecraft:bedrock': 10,
            'minecraft:tuff': 10,
          },
          unsupportedCellCount: 0,
        },
        clearStandingPlane: { cellCount: 63 },
        clearHeadPlane: { cellCount: 63 },
        interactionHalo: { cellCount: 297 },
      },
      materialDoctrine: {
        primary: 'minecraft:polished_andesite',
        secondary: 'minecraft:polished_diorite',
      },
      operationalBoundary: {
        shaftTransportCommissioned: false,
        liftOrStairMechanismInstalled: false,
        observationTransferTouched: false,
        wetLinerTouched: false,
        wallsOrCeilingTouched: false,
        exactRollbackRestoresR02Void: true,
      },
    });
  });

  it('covers 63 cells with three complete-state bands and exact inverse rollback', () => {
    const manifest = readManifest();
    const pkg = manifest.packages[0];
    const forwardPath = path.join(ROOT, pkg.forward);
    const rollbackPath = path.join(ROOT, pkg.rollback);
    const forward = parseOperations(forwardPath);
    const rollback = parseOperations(rollbackPath);
    const forwardCells = expand(forward);
    const rollbackCells = expand(rollback);

    expect(forward).toHaveLength(3);
    expect(rollback).toHaveLength(3);
    expect(forwardCells.size).toBe(63);
    expect(rollbackCells.size).toBe(63);
    expect([...forwardCells.keys()].sort()).toEqual([...rollbackCells.keys()].sort());
    expect(forward.every(({ fromState }) => fromState === 'minecraft:air')).toBe(true);
    expect(rollback.every(({ toState }) => toState === 'minecraft:air')).toBe(true);
    expect(rollback).toEqual(forward.slice().reverse().map((operation) => ({
      from: operation.from,
      to: operation.to,
      fromState: operation.toState,
      toState: operation.fromState,
    })));
    expect(bodySha256(forwardPath)).toBe(manifest.operations[PACKAGE_KEY].forwardSha256);
    expect(bodySha256(rollbackPath)).toBe(manifest.operations[PACKAGE_KEY].rollbackSha256);
    expect(manifest.operations[PACKAGE_KEY]).toMatchObject({
      forwardCommandCount: 3,
      rollbackCommandCount: 3,
      targetCellCount: 63,
      targetCoordinateSetSha256:
        '1d6d17740ee4df2253b3d2825456097cdadae5d108142d84174b03a38c9a82cd',
      exactInverse: true,
    });
    expect(manifest.target).toMatchObject({
      operatedUnion: { cellCount: 63 },
      desiredStateCensus: {
        'minecraft:polished_andesite': 36,
        'minecraft:polished_diorite': 27,
      },
      packageTargetsDisjoint: true,
    });
  });

  it('declares only the exact R02 air transition and hard-clears protected classes', () => {
    const manifest = readManifest();
    expect(manifest.scope.sourcePartition).toMatchObject({
      design: { cellCount: 63 },
      operated: { cellCount: 63 },
      alreadyTarget: { cellCount: 0 },
      sourceStateCensus: { 'minecraft:air': 63 },
      exactPartition: true,
    });
    expect(manifest.isolation).toMatchObject({
      fluidHaloIntersectionCount: 0,
      gravityHaloIntersectionCount: 0,
      forbiddenContainerOrControlHaloCount: 0,
      blockEntityHaloIntersectionCount: 0,
      savedEntityHaloIntersectionCount: 0,
      protectedRelicHaloIntersectionCount: 0,
      d06MechanismHaloIntersectionCount: 0,
      undeclaredPriorReleaseIntersectionCount: 0,
      intentionalPriorReleaseIntersections: [{
        packageId: 'combined-zones-r02-d06-shell/d06-reservations',
        cellCount: 63,
        coordinateSetSha256:
          '1d6d17740ee4df2253b3d2825456097cdadae5d108142d84174b03a38c9a82cd',
      }],
    });
    expect(manifest.isolation.intentionalPriorReleaseIntersections[0].transitionCensus)
      .toEqual({
        'minecraft:deepslate[axis=y]->minecraft:air': 46,
        'minecraft:deepslate_diamond_ore->minecraft:air': 1,
        'minecraft:tuff->minecraft:air': 16,
      });
    expect(Object.entries(manifest.compileGuards)
      .filter(([key]) => key.endsWith('ViolationCount'))
      .every(([, count]) => count === 0)).toBe(true);
    expect(manifest.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      executionAuthorizedByThisManifest: false,
    });
  });

  it('seals the manifest payload identity', () => {
    const manifest = readManifest();
    const { manifestIdentity, ...payload } = manifest;
    expect(crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'))
      .toBe(manifestIdentity);
  });
});
