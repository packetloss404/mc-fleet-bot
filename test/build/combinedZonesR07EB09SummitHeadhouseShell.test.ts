import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r07e_b09_summit_headhouse_shell.mjs',
);
const BASENAME = 'combined-zones-r07e-b09-summit-headhouse-shell';
const PACKAGE_KEY = 'b09-summit-headhouse-shell';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r07e-b09-summit-headhouse-shell-offline-20260821T165500Z',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r07e-b09-summit-headhouse-shell-'),
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
    geometry: Record<string, ExactSet>;
    operationalBoundary: Record<string, boolean>;
    sourcePartition: {
      design: ExactSet;
      operated: ExactSet;
      preservedInterior: ExactSet;
      sourceStateCensus: Record<string, number>;
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
    oneCellGuards: boolean;
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
    '--generated-at', '2026-08-21T16:55:00Z',
    '--snapshot', 'data/worldsnap-combined-zones-r07d-post-20260821T164505Z',
    '--intake-audit',
    'data/world-review/combined-zones-r07d-live-20260821T164505Z/post-complete-save-intake.json',
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

describe('Combined Zones CZ-R07E B09 summit-headhouse shell compiler', () => {
  it('regenerates every guarded artifact byte-for-byte', () => {
    expect(artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstCompile);
  });

  it('binds the accepted R07D post state and authorized R07 framework node', () => {
    expect(readManifest()).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R07D_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
      mvpScope: true,
      scopeIds: ['P1-B09', 'Z11-SUMMIT-INTERFACE'],
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r07d-post-20260821T164505Z',
        completeSaveSha256:
          'fdffaae24e4adb32ac32df7f14a1efef14e70922b6633562f093bbfafca4b858',
        regionSnapshotSha256:
          '5ec31dc503fac970a174056db8459d88aa29ec5ae441f50f6e4744cd58b40e1d',
        intakeStatus: 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
        touchedChunkCount: 2,
        predecessor: {
          transactionId: 'combined-zones-r07d-b09-lower-station-shell',
          completedReleaseIdentitySha256:
            'd2e446216f55a7f6b67432c2203e3624a64606eb64b25eb2e5439d8c8d286bfe',
        },
      },
    });
  });

  it('exactly partitions the frozen summit envelope into shell and connected void', () => {
    expect(readManifest().scope).toMatchObject({
      canonicalOwner: 'P1-B09-FUNICULAR-FRAMEWORK',
      geometry: {
        minimumPlanningAccommodation: {
          cellCount: 7800,
          coordinateSetSha256:
            'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
        },
        summitStationEnvelope: {
          cellCount: 180,
          coordinateSetSha256:
            '99d28f072ae6055d394a9690c125b4e0de58b09192cc3fd166302060f3bb9599',
        },
        connectedRailAndHeadroomVoid: {
          cellCount: 18,
          coordinateSetSha256:
            '771f8df9ee84b79c8ed5e5b2d2e1c6c828915d8d77102ea3b6d60230e681e72d',
          componentCount: 1,
          largestComponentCellCount: 18,
        },
        summitHeadhouseShell: {
          cellCount: 162,
          coordinateSetSha256:
            '8f1cd67b0d08e1f986c21067af7ba50e1c4f3e8daa52c703309c5734d0979592',
        },
        interiorFaceBoundary: {
          cellCount: 58,
          coordinateSetSha256:
            'bdd0ba179cc533a5c707137a606254fa06c916bfe28fd0c59da77f168f4eab06',
        },
        guidewayApproachCap: {
          cellCount: 12,
          coordinateSetSha256:
            '8ef484d874dca406f5a8abbc6dd8306ff2770ab304c10bddbc01db5c4107ad5c',
        },
        summitInterfaceCap: {
          cellCount: 12,
          coordinateSetSha256:
            'd1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093',
        },
        b08PortalSeam: { cellCount: 36 },
        acceptedR07DLowerShell: { cellCount: 84 },
        interactionHalo: { cellCount: 550 },
      },
      sourcePartition: {
        design: { cellCount: 180 },
        operated: { cellCount: 162 },
        preservedInterior: { cellCount: 18 },
        sourceStateCensus: { 'minecraft:air': 162 },
        exactPartition: true,
      },
    });
  });

  it('inventories the R07D-post B09 reservation and both sealed interfaces', () => {
    expect(readManifest().source.b09CurrentStateInventory).toMatchObject({
      minimumAccommodation: {
        cellCount: 7800,
        stateCensus: {
          'minecraft:air': 7713,
          'minecraft:polished_diorite': 87,
        },
        blockStateSetSha256:
          '2bbe43cd7463cbeccfe3140c63e23edb89eb99b2fadecfe9752887c4dfe624ae',
      },
      summitStationEnvelope: {
        cellCount: 180,
        stateCensus: { 'minecraft:air': 180 },
      },
      summitInterfaceCap: {
        cellCount: 12,
        stateCensus: { 'minecraft:air': 12 },
      },
      guidewayApproachCap: {
        cellCount: 12,
        stateCensus: { 'minecraft:air': 12 },
      },
    });
  });

  it('emits 162 one-cell guards and an exact reverse-order inverse', () => {
    const manifest = readManifest();
    const pkg = manifest.packages[0];
    const forwardPath = path.join(ROOT, pkg.forward);
    const rollbackPath = path.join(ROOT, pkg.rollback);
    const forward = parseOperations(forwardPath);
    const rollback = parseOperations(rollbackPath);

    expect(forward).toHaveLength(162);
    expect(rollback).toHaveLength(162);
    expect(forward.every(({ from, to, fromState, toState }) => (
      from.join(',') === to.join(',')
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
        '0919ff43b2ca9d405d5d45ae35e00d75df790406c5d19a6b3c1899e4b5802a44',
      rollbackSha256:
        '3d1529966df9fe25286de645c7e1fec97cf03a3b5192f959246f73a7f8312c41',
      forwardCommandCount: 162,
      rollbackCommandCount: 162,
      targetCellCount: 162,
      targetCoordinateSetSha256:
        '8f1cd67b0d08e1f986c21067af7ba50e1c4f3e8daa52c703309c5734d0979592',
      exactInverse: true,
      oneCellGuards: true,
    });
  });

  it('hard-clears protected classes while intentionally building both caps closed', () => {
    const manifest = readManifest();
    expect(manifest.target).toMatchObject({
      operatedUnion: { cellCount: 162 },
      desiredStateCensus: { 'minecraft:polished_diorite': 162 },
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
      priorReleaseIntersections: [],
      undeclaredPriorReleaseIntersectionCount: 0,
      b08PortalSeamTargetIntersectionCount: 0,
      acceptedR07DLowerShellTargetIntersectionCount: 0,
      preservedInteriorTargetIntersectionCount: 0,
      summitInterfaceCapTargetIntersectionCount: 12,
      summitInterfaceCapTargetRole: 'INTENTIONAL_PHYSICAL_FAIL_CLOSED_CAP',
    });
    expect(Object.entries(manifest.compileGuards)
      .filter(([key]) => key.endsWith('ViolationCount'))
      .every(([, count]) => count === 0)).toBe(true);
    expect(manifest.scope.operationalBoundary).toMatchObject({
      summitInterfaceCapBuiltClosed: true,
      summitInterfaceOpeningCreated: false,
      guidewayApproachCapBuiltClosed: true,
      guidewayContinuationOpened: false,
      b08PortalSeamTouched: false,
      acceptedR07DLowerShellTouched: false,
      railOrVehicleInstalled: false,
      powerOrControlInstalled: false,
      drainageOrOutfallInstalled: false,
      rescueOrEgressCommissioned: false,
      exactRollbackRestoresR07DPostAir: true,
    });
    expect(manifest.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      executionAuthorizedByThisManifest: false,
    });
  });

  it('binds passing QA, exact preflights, strict parsers, and block-entity clearance', () => {
    expect(JSON.parse(fs.readFileSync(
      path.join(EVIDENCE, 'exact-release-manifest-qa.json'), 'utf8',
    ))).toMatchObject({
      status: 'PASS',
      passed: true,
      totals: {
        packages: 1,
        passedPackages: 1,
        uniqueTargetCells: 162,
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
      status: 'PASS', operationCount: 162, passed: 162, failed: 0,
      opsSha256: 'b248011a3372caaf3953639e0b2360a819bb6466526a8875ed92e6d7e4ac9d99',
      regionsSnapshot: {
        sha256: '5ec31dc503fac970a174056db8459d88aa29ec5ae441f50f6e4744cd58b40e1d',
      },
    });
    expect(rollbackPreflight).toMatchObject({
      status: 'PASS', operationCount: 162, passed: 162, failed: 0,
      opsSha256: '363616a49e7c4434cf26132fef25d0335007f8008be5611830909a72dfd96f4a',
      regionsSnapshot: {
        sha256: '5ec31dc503fac970a174056db8459d88aa29ec5ae441f50f6e4744cd58b40e1d',
      },
      sourceOverlays: { operationCount: 162, passed: 162, failed: 0 },
    });

    for (const [filename, role, operationSha256] of [
      [
        'forward-strict-dry-run.json', 'forward',
        'b248011a3372caaf3953639e0b2360a819bb6466526a8875ed92e6d7e4ac9d99',
      ],
      [
        'rollback-strict-dry-run.json', 'rollback',
        '363616a49e7c4434cf26132fef25d0335007f8008be5611830909a72dfd96f4a',
      ],
    ] as const) {
      expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, filename), 'utf8')))
        .toMatchObject({
          status: 'dry_run',
          dryRun: true,
          strictNoop: true,
          operationRole: role,
          operationSha256,
          sourceOperationCount: 162,
          sourceGroupCount: 162,
          worldEditLeftoverCount: 0,
        });
    }
    expect(JSON.parse(fs.readFileSync(
      path.join(EVIDENCE, 'block-entity-clearance.json'), 'utf8',
    ))).toMatchObject({
      status: 'PASS', operationCount: 162, targetChunkCount: 2,
      blockingBlockEntityCount: 0, chunksMissing: 0,
    });
  });

  it('seals the manifest payload identity', () => {
    const manifest = readManifest();
    const { manifestIdentity, ...payload } = manifest;
    expect(manifestIdentity)
      .toBe('e3e0055b807d28c7d52748c93f16b30d1903a719af3b31176b8805b6fcc0472d');
    expect(crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'))
      .toBe(manifestIdentity);
  });
});
