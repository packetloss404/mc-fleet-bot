import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r07f_b09_lower_guideway_segment_01.mjs',
);
const BASENAME = 'combined-zones-r07f-b09-lower-guideway-segment-01';
const PACKAGE_KEY = 'b09-lower-guideway-segment-01';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r07f-b09-lower-guideway-segment-01-offline-20260821T172000Z',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r07f-b09-guideway-'),
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
    centerlineRange: Record<string, number | string>;
    geometry: Record<string, ExactSet>;
    operationalBoundary: Record<string, boolean>;
    sourcePartition: {
      sourceStateCensus: Record<string, number>;
      desiredStateCensus: Record<string, number>;
      exactPartition: boolean;
    };
  };
  source: {
    snapshotRoot: string;
    completeSaveSha256: string;
    regionSnapshotSha256: string;
    intakeStatus: string;
    touchedChunkCount: number;
    predecessor: {
      transactionId: string;
      completedReleaseIdentitySha256: string;
    };
    acceptedB09State: {
      completedReleaseIdentitySha256: string;
      qaPayloadSha256: string;
    };
    b09CurrentStateInventory: Record<string, ExactSet & {
      stateCensus: Record<string, number>;
      blockStateSetSha256?: string;
    }>;
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
    reverseOrderInverse: boolean;
    oneCellGuards: boolean;
    shellBeforeOpening: boolean;
    rollbackResealsBeforeShellRemoval: boolean;
  }>;
  isolation: Record<string, number | string | unknown[]>;
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
    '--generated-at', '2026-08-21T17:18:00Z',
    '--snapshot', 'data/worldsnap-combined-zones-r08h-liner-post-20260821T171000Z',
    '--intake-audit',
    'data/world-review/combined-zones-r08h-liner-live-20260821T171000Z/post-complete-save-intake.json',
    '--out-dir', temporaryDirectory,
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstCompile = artifactPaths(temporaryDirectory)
    .map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones CZ-R07F B09 lower guideway segment 01 compiler', () => {
  it('regenerates every guarded artifact byte-for-byte', () => {
    expect(artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstCompile);
  });

  it('binds the accepted R08H post state and accepted R07E B09 state', () => {
    expect(readManifest()).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R08H_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
      mvpScope: true,
      scopeIds: ['P1-B09'],
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r08h-liner-post-20260821T171000Z',
        completeSaveSha256:
          '086f1c2add1074fddff040b5f425563806dbba07a7d8af5d56827aab10b0bbde',
        regionSnapshotSha256:
          'd2ae86f16d494453b543ed6d3dd94bf96173ff8b5e2d104989e439877a673cbd',
        intakeStatus: 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
        touchedChunkCount: 2,
        predecessor: {
          transactionId: 'combined-zones-r08-empty-eight-platform-06-dynamic-fluid-liner',
          completedReleaseIdentitySha256:
            'da8f714258d7b1d3254c2c2d408cdee930c4dcac4f3ce73cec3602607efbc6f3',
        },
        acceptedB09State: {
          completedReleaseIdentitySha256:
            '8ad00954eff48a4d6d5f7b2acb0505bed9169d07ad8c6214818106faec67e953',
          qaPayloadSha256:
            '53d4fce9b5e1dd658655ee364cdf50a6b56922e322e2b2174a5f1d732268943d',
        },
      },
    });
  });

  it('derives the first straight FM-01 segment and complete capped enclosure', () => {
    expect(readManifest().scope).toMatchObject({
      canonicalOwner: 'P1-B09-FUNICULAR-FRAMEWORK',
      centerlineRange: {
        firstInclusive: 9,
        lastInclusive: 24,
        pointCount: 16,
        classification: 'STRAIGHT_LEVEL_LOWER_GUIDEWAY',
      },
      geometry: {
        minimumPlanningAccommodation: {
          cellCount: 7800,
          coordinateSetSha256:
            'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
        },
        lowerStationEnvelope: {
          cellCount: 132,
          coordinateSetSha256:
            'd13426cafb5f9cb53de702653532111ef18588af1c28c0f3d8e7cb2956e0801b',
        },
        rawSegmentEnvelope: {
          cellCount: 216,
          coordinateSetSha256:
            'feab1c45f651f62e484c057a67c05b16091d0af4a2f7cb9afd1fb44d71802a8b',
        },
        newSegmentEnvelope: {
          cellCount: 192,
          coordinateSetSha256:
            'd2032cd4a66d1eee3175c498298152002ebea974aadf233a78200d3c7e3daa7a',
        },
        preservedSegmentInterior: {
          cellCount: 30,
          coordinateSetSha256:
            '76a52547e89698734a8c1175244a4e5069df7b0e1afb9f9de18a2c965bf52f25',
        },
        staticSegmentShell: {
          cellCount: 162,
          coordinateSetSha256:
            '7cb64c9af7d0f37695b9a4c30f888bfe373eb315bec4d9530ab915674a567ea6',
        },
        ownedInternalSeamOpening: {
          cellCount: 2,
          coordinateSetSha256:
            '5b6a8c096adadbbd5a5ed0399678c87aed1fa5db20b89adeb8289745f693a75e',
        },
        retainedNearCapCollar: { cellCount: 10 },
        farIsolationCap: {
          cellCount: 12,
          coordinateSetSha256:
            'ffbb546fae81114f50226ac6042fe75d9f057b3543cd3887f10ebbdfcefef333',
        },
        connectedLowerStationAndSegmentVoid: {
          cellCount: 44,
          coordinateSetSha256:
            '5eedb05ad65d442f00c56caa04d37f5e29838bd4006df577605a1b6dcc4563e5',
          componentCount: 1,
          largestComponentCellCount: 44,
        },
        connectedVoidFaceBoundary: {
          cellCount: 136,
          coordinateSetSha256:
            '0eb5742bd6dbb6a11959dbe79b5b714a40a575bc69d53a756d54afbebe849697',
        },
        b08PortalSeam: { cellCount: 36 },
        summitInterfaceCap: { cellCount: 12 },
        interactionHalo: { cellCount: 552 },
      },
      sourcePartition: {
        sourceStateCensus: {
          'minecraft:air': 162,
          'minecraft:polished_diorite': 2,
        },
        desiredStateCensus: {
          'minecraft:polished_diorite': 162,
          'minecraft:air': 2,
        },
        exactPartition: true,
      },
    });
  });

  it('inventories exact B09, shell, seam, collar, and external-interface states', () => {
    expect(readManifest().source.b09CurrentStateInventory).toMatchObject({
      minimumAccommodation: {
        cellCount: 7800,
        stateCensus: {
          'minecraft:air': 7551,
          'minecraft:polished_diorite': 249,
        },
        blockStateSetSha256:
          'a84911a9e54009f6d3ad4e4f6792c4ff60ee0b9fc8a068d9453f25f1c3e98846',
      },
      segmentShell: {
        cellCount: 162,
        stateCensus: { 'minecraft:air': 162 },
      },
      internalSeamOpening: {
        cellCount: 2,
        stateCensus: { 'minecraft:polished_diorite': 2 },
      },
      preservedConnectionInterior: {
        cellCount: 42,
        stateCensus: { 'minecraft:air': 42 },
      },
      retainedNearCapCollar: {
        cellCount: 10,
        stateCensus: { 'minecraft:polished_diorite': 10 },
      },
      farIsolationCap: {
        cellCount: 12,
        stateCensus: { 'minecraft:air': 12 },
      },
      b08PortalSeam: {
        cellCount: 36,
        stateCensus: {
          'minecraft:air': 33,
          'minecraft:polished_diorite': 3,
        },
      },
      summitInterfaceCap: {
        cellCount: 12,
        stateCensus: { 'minecraft:polished_diorite': 12 },
      },
    });
  });

  it('builds before opening and reseals before exact inverse shell removal', () => {
    const manifest = readManifest();
    const pkg = manifest.packages[0];
    const forwardPath = path.join(ROOT, pkg.forward);
    const rollbackPath = path.join(ROOT, pkg.rollback);
    const forward = parseOperations(forwardPath);
    const rollback = parseOperations(rollbackPath);

    expect(forward).toHaveLength(164);
    expect(rollback).toHaveLength(164);
    expect(forward.every(({ from, to }) => from.join(',') === to.join(','))).toBe(true);
    expect(forward.slice(0, 162).every(({ fromState, toState }) => (
      fromState === 'minecraft:air' && toState === 'minecraft:polished_diorite'
    ))).toBe(true);
    expect(forward.slice(162).every(({ from, fromState, toState }) => (
      from[0] === 2057
      && fromState === 'minecraft:polished_diorite'
      && toState === 'minecraft:air'
    ))).toBe(true);
    expect(rollback.slice(0, 2).every(({ from, fromState, toState }) => (
      from[0] === 2057
      && fromState === 'minecraft:air'
      && toState === 'minecraft:polished_diorite'
    ))).toBe(true);
    expect(rollback).toEqual(forward.slice().reverse().map((operation) => ({
      from: operation.from,
      to: operation.to,
      fromState: operation.toState,
      toState: operation.fromState,
    })));
    expect(bodySha256(forwardPath)).toBe(manifest.operations[PACKAGE_KEY].forwardSha256);
    expect(bodySha256(rollbackPath)).toBe(manifest.operations[PACKAGE_KEY].rollbackSha256);
    expect(manifest.operations[PACKAGE_KEY]).toEqual({
      forwardSha256:
        'c2ff8639b0f6047c770df8b83388c7adfb053b10543298136226b8d7c2ab600d',
      rollbackSha256:
        '6d9875947286e9c435624a063357d1e1638395ef3ccacbb4370f25ec8feae647',
      forwardCommandCount: 164,
      rollbackCommandCount: 164,
      targetCellCount: 164,
      targetCoordinateSetSha256:
        '2d0ac7f21afb5835112b47f3fba677939a4d4d2617f497cfe284cc0d11beed96',
      exactInverse: true,
      reverseOrderInverse: true,
      oneCellGuards: true,
      shellBeforeOpening: true,
      rollbackResealsBeforeShellRemoval: true,
    });
  });

  it('owns only the two-cell internal seam and hard-clears all protected classes', () => {
    const manifest = readManifest();
    expect(manifest.target).toMatchObject({
      operatedUnion: { cellCount: 164 },
      desiredStateCensus: {
        'minecraft:polished_diorite': 162,
        'minecraft:air': 2,
      },
      packageTargetsDisjoint: true,
    });
    expect(manifest.isolation).toMatchObject({
      fluidTargetIntersectionCount: 0,
      fluidHaloIntersectionCount: 0,
      gravityHaloIntersectionCount: 0,
      forbiddenContainerOrControlHaloCount: 0,
      blockEntityHaloIntersectionCount: 0,
      savedEntityHaloIntersectionCount: 0,
      protectedRelicHaloIntersectionCount: 0,
      declaredInternalSeamPriorReleaseIntersectionCount: 1,
      undeclaredPriorReleaseIntersectionCount: 0,
      b08PortalSeamTargetIntersectionCount: 0,
      summitInterfaceCapTargetIntersectionCount: 0,
      acceptedR07DLowerShellTargetIntersectionCount: 2,
      acceptedR07DLowerShellTargetRole:
        'EXACT_TWO_CELL_INTERNAL_GUIDEWAY_SEAM_OPENING',
      acceptedR07ESummitShellTargetIntersectionCount: 0,
    });
    expect(Object.entries(manifest.compileGuards)
      .filter(([key]) => key.endsWith('ViolationCount'))
      .every(([, count]) => count === 0)).toBe(true);
    expect(manifest.scope.operationalBoundary).toMatchObject({
      lowerStationInternalSeamOwnedAndOpened: true,
      retainedNearCapCollarComplete: true,
      farIsolationCapBuiltClosed: true,
      fartherGuidewayOpened: false,
      b08ExternalInterfaceTouched: false,
      b08ExternalInterfaceOpened: false,
      summitExternalInterfaceTouched: false,
      summitExternalInterfaceOpened: false,
      railOrVehicleInstalled: false,
      powerOrControlInstalled: false,
      drainageOrOutfallInstalled: false,
      rescueOrEgressCommissioned: false,
      exactRollbackResealsInternalSeamFirst: true,
      exactRollbackRestoresR08HPostState: true,
    });
    expect(manifest.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      executionAuthorizedByThisManifest: false,
    });
  });

  it('binds passing QA, mixed-source preflights, parsers, and block-entity clearance', () => {
    expect(JSON.parse(fs.readFileSync(
      path.join(EVIDENCE, 'exact-release-manifest-qa.json'), 'utf8',
    ))).toMatchObject({
      status: 'PASS',
      passed: true,
      totals: {
        packages: 1,
        passedPackages: 1,
        uniqueTargetCells: 164,
        crossPackageIntersectionCells: 0,
      },
    });
    const forwardPreflight = JSON.parse(fs.readFileSync(
      path.join(EVIDENCE, 'forward-source-preflight.json'), 'utf8',
    ));
    const rollbackPreflight = JSON.parse(fs.readFileSync(
      path.join(EVIDENCE, 'projected-rollback-preflight.json'), 'utf8',
    ));
    expect(forwardPreflight).toMatchObject({
      status: 'PASS', operationCount: 164, passed: 164, failed: 0,
      opsSha256: '210cc1793f48557a1f56181f66203d2ca80debbdbfcd33afb5190281d9a93071',
      regionsSnapshot: {
        sha256: 'd2ae86f16d494453b543ed6d3dd94bf96173ff8b5e2d104989e439877a673cbd',
      },
    });
    expect(rollbackPreflight).toMatchObject({
      status: 'PASS', operationCount: 164, passed: 164, failed: 0,
      opsSha256: '42f38ff84f23419a2d2a1992d6e859ec7a96c9b66014b2f43289a3563259fc99',
      regionsSnapshot: {
        sha256: 'd2ae86f16d494453b543ed6d3dd94bf96173ff8b5e2d104989e439877a673cbd',
      },
      sourceOverlays: { operationCount: 164, passed: 164, failed: 0 },
    });
    for (const [filename, role, operationSha256] of [
      [
        'forward-strict-dry-run.json', 'forward',
        '210cc1793f48557a1f56181f66203d2ca80debbdbfcd33afb5190281d9a93071',
      ],
      [
        'rollback-strict-dry-run.json', 'rollback',
        '42f38ff84f23419a2d2a1992d6e859ec7a96c9b66014b2f43289a3563259fc99',
      ],
    ] as const) {
      expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, filename), 'utf8')))
        .toMatchObject({
          status: 'dry_run',
          dryRun: true,
          strictNoop: true,
          operationRole: role,
          operationSha256,
          sourceOperationCount: 164,
          sourceGroupCount: 164,
          worldEditLeftoverCount: 0,
        });
    }
    expect(JSON.parse(fs.readFileSync(
      path.join(EVIDENCE, 'block-entity-clearance.json'), 'utf8',
    ))).toMatchObject({
      status: 'PASS', operationCount: 164, targetChunkCount: 2,
      blockingBlockEntityCount: 0, chunksMissing: 0,
    });
  });

  it('seals the manifest payload identity', () => {
    const manifest = readManifest();
    const { manifestIdentity, ...payload } = manifest;
    expect(manifestIdentity)
      .toBe('0260263944b561a612f786f1fb0fd0345d1afd18da4f5ff13e207cd777687354');
    expect(crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'))
      .toBe(manifestIdentity);
  });
});
