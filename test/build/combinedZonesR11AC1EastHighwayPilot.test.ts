import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r11a_c1_east_highway_pilot.mjs',
);
const BASENAME = 'combined-zones-r11a-c1-east-highway-pilot';
const PACKAGE_KEY = 'c1-east-highway-pavement-pilot';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r11a-c1-highway-'),
);

interface ExactSet {
  cellCount: number;
  coordinateSetSha256: string;
}

interface Operation {
  cell: [number, number, number];
  sourceState: string;
  targetState: string;
}

interface ReleaseManifest {
  schemaVersion: number;
  transactionId: string;
  status: string;
  releaseNodeId: string;
  mvpScope: boolean;
  scopeIds: string[];
  packages: Array<{ key: string; forward: string; rollback: string }>;
  source: {
    snapshotRoot: string;
    completeSaveSha256: string;
    sourceLedgerCompletedReleaseIdentitySha256: string;
    intakeStatus: string;
    touchedChunkCount: number;
  };
  scope: {
    canonicalOwner: string;
    stations: {
      start: number;
      end: number;
      count: number;
      treatment: string;
    };
    geometry: {
      pavementSurface: ExactSet;
      carriageway: ExactSet;
      outerShoulders: ExactSet;
      medianSurface: ExactSet;
      exactHeadroomCuts: ExactSet;
      exactFoundationFill: ExactSet;
      operatedUnion: ExactSet;
      stableFoundationContacts: ExactSet & {
        sourceStateCensus: Record<string, number>;
        unsupportedCellCount: number;
      };
      interactionHalo: ExactSet;
      connectedSurfaceComponentCount: number;
    };
    sourcePartition: {
      surfaceSourceStateCensus: Record<string, number>;
      foundationSourceStateCensus: Record<string, number>;
      headroomSourceStateCensus: Record<string, number>;
      desiredStateCensus: Record<string, number>;
      operated: ExactSet;
      alreadyTarget: ExactSet;
      exactPartition: boolean;
    };
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
  } | string>;
  isolation: Record<string, number | unknown[]>;
  compileGuards: Record<string, number | string>;
  safetyBoundary: {
    liveCallsPerformed: boolean;
    worldEditsPerformed: boolean;
    executionAuthorizedByThisManifest: boolean;
  };
  manifestIdentity: string;
}

const artifactNames = [
  `${BASENAME}.${PACKAGE_KEY}.forward.txt`,
  `${BASENAME}.${PACKAGE_KEY}.rollback.txt`,
  `${BASENAME}.release-manifest.json`,
];

function readManifest(filename = MANIFEST): ReleaseManifest {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as ReleaseManifest;
}

function parseOperations(filename: string): Operation[] {
  return fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line.startsWith('REPL '))
    .map((line) => {
      const fields = line.split(/\s+/);
      expect(fields).toHaveLength(9);
      const from = fields.slice(1, 4).map(Number) as [number, number, number];
      const to = fields.slice(4, 7).map(Number) as [number, number, number];
      expect(to).toEqual(from);
      return { cell: from, sourceState: fields[7], targetState: fields[8] };
    });
}

function bodySha256(filename: string): string {
  const body = `${fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .join('\n')}\n`;
  return crypto.createHash('sha256').update(body).digest('hex');
}

let firstCompile: Buffer[] = [];

beforeAll(() => {
  const args = [
    SCRIPT,
    '--generated-at',
    '2026-08-21T17:10:00Z',
    '--snapshot',
    'data/worldsnap-combined-zones-r10a-post-20260821T163935Z',
    '--intake-audit',
    'data/world-review/combined-zones-r10a-live-20260821T163935Z/post-complete-save-intake.json',
    '--out-dir',
    temporaryDirectory,
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstCompile = artifactNames.map((name) => fs.readFileSync(path.join(temporaryDirectory, name)));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones CZ-R11A C1 east highway pilot compiler', () => {
  it('regenerates all guarded artifacts byte-for-byte', () => {
    expect(artifactNames.map((name) => fs.readFileSync(path.join(temporaryDirectory, name))))
      .toEqual(firstCompile);
  });

  it('binds the accepted R10A post state and authorized R11 node', () => {
    expect(readManifest()).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R10A_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR',
      mvpScope: true,
      scopeIds: ['C1-HIGHWAY'],
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r10a-post-20260821T163935Z',
        completeSaveSha256:
          'bb667794a20a2a580ba322eef19e60ac50bf51ff81ba5537702b26036c829486',
        sourceLedgerCompletedReleaseIdentitySha256:
          'a85f4c9409b6ceb941980de9836346f20a913ba0fd39d82a4752dadcd2a91244',
        intakeStatus: 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
        touchedChunkCount: 6,
      },
    });
  });

  it('freezes one connected five-station at-grade pavement segment', () => {
    expect(readManifest().scope).toMatchObject({
      canonicalOwner: 'C1-HIGHWAY',
      stations: {
        start: 489,
        end: 493,
        count: 5,
        treatment: 'AT_GRADE_COORDINATION_PASS',
      },
      geometry: {
        pavementSurface: {
          cellCount: 109,
          coordinateSetSha256:
            '67c334af780bdaf20db92267c5697cd601dcf85d05b31d7bad1d589b46661f16',
        },
        carriageway: { cellCount: 73 },
        outerShoulders: { cellCount: 26 },
        medianSurface: { cellCount: 10 },
        exactFoundationFill: {
          cellCount: 16,
          coordinateSetSha256:
            '234aafe7012f374ad7584efde23a50dbb415acda23cb538854ba8cbe2ff87809',
        },
        exactHeadroomCuts: {
          cellCount: 188,
          coordinateSetSha256:
            'd75df7e794e53d29b907d9a31c800ba013661f9096e501fb40e74afb3ffa98f5',
        },
        operatedUnion: {
          cellCount: 313,
          coordinateSetSha256:
            'db6564894b86f2c0a3c5a2889bd9ad9f75505d63cf78da3b738f367337bd1c1f',
        },
        stableFoundationContacts: {
          cellCount: 109,
          sourceStateCensus: {
            'minecraft:stone': 59,
            'minecraft:dirt': 45,
            'minecraft:pale_moss_block': 5,
          },
          unsupportedCellCount: 0,
        },
        interactionHalo: { cellCount: 1416 },
        connectedSurfaceComponentCount: 1,
      },
    });
  });

  it('uses 313 one-cell complete-state guards with an exact reverse inverse', () => {
    const manifest = readManifest();
    const pkg = manifest.packages[0];
    const forwardPath = path.join(ROOT, pkg.forward);
    const rollbackPath = path.join(ROOT, pkg.rollback);
    const forward = parseOperations(forwardPath);
    const rollback = parseOperations(rollbackPath);
    expect(forward).toHaveLength(313);
    expect(rollback).toHaveLength(313);
    expect(new Set(forward.map(({ cell }) => cell.join(',')).values()).size).toBe(313);
    expect(rollback).toEqual(forward.slice().reverse().map((operation) => ({
      cell: operation.cell,
      sourceState: operation.targetState,
      targetState: operation.sourceState,
    })));
    const metadata = manifest.operations[PACKAGE_KEY];
    expect(typeof metadata).toBe('object');
    if (typeof metadata === 'string') throw new Error('unexpected operation metadata');
    expect(bodySha256(forwardPath)).toBe(metadata.forwardSha256);
    expect(bodySha256(rollbackPath)).toBe(metadata.rollbackSha256);
    expect(metadata).toMatchObject({
      forwardCommandCount: 313,
      rollbackCommandCount: 313,
      targetCellCount: 313,
      targetCoordinateSetSha256:
        'db6564894b86f2c0a3c5a2889bd9ad9f75505d63cf78da3b738f367337bd1c1f',
      exactInverse: true,
    });
  });

  it('declares the exact source/target partition and zero protected intersections', () => {
    const manifest = readManifest();
    expect(manifest.scope.sourcePartition).toMatchObject({
      surfaceSourceStateCensus: {
        'minecraft:dirt': 64,
        'minecraft:stone': 31,
        'minecraft:air': 12,
        'minecraft:pale_moss_block': 2,
      },
      foundationSourceStateCensus: { 'minecraft:air': 16 },
      desiredStateCensus: {
        'minecraft:air': 188,
        'minecraft:gray_concrete': 73,
        'minecraft:smooth_stone': 26,
        'minecraft:stone_bricks': 16,
        'minecraft:yellow_concrete': 10,
      },
      operated: { cellCount: 313 },
      alreadyTarget: { cellCount: 0 },
      exactPartition: true,
    });
    expect(manifest.isolation).toMatchObject({
      fluidHaloIntersectionCount: 0,
      gravityHaloIntersectionCount: 0,
      forbiddenContainerOrControlHaloCount: 0,
      blockEntityHaloIntersectionCount: 0,
      savedEntityHaloIntersectionCount: 0,
      protectedRelicHaloIntersectionCount: 0,
      c01DefaultDenyHaloIntersectionCount: 0,
      dataDistrictCrossroadHaloIntersectionCount: 0,
      railReserveOperatedPlanIntersectionCount: 0,
      railCollectionOperatedPlanIntersectionCount: 0,
      utilityReserveOperatedPlanIntersectionCount: 0,
      roadCollectionOperatedPlanIntersectionCount: 0,
      woodyOperatedSourceCount: 0,
      priorReleaseIntersections: [],
      undeclaredPriorReleaseIntersectionCount: 0,
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
