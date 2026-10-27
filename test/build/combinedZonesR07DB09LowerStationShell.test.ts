import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r07d_b09_lower_station_shell.mjs',
);
const BASENAME = 'combined-zones-r07d-b09-lower-station-shell';
const PACKAGE_KEY = 'b09-lower-station-shell';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r07d-b09-lower-station-shell-offline-20260821T163500Z',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r07d-b09-lower-station-shell-'),
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
      blockStateSetSha256: string;
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
  }>;
  isolation: Record<string, number | unknown[]>;
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
    '--generated-at', '2026-08-21T16:35:00Z',
    '--snapshot', 'data/worldsnap-combined-zones-r08b-post-20260821T162429Z',
    '--intake-audit',
    'data/world-review/combined-zones-r08b-live-20260821T162429Z/post-complete-save-intake.json',
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

describe('Combined Zones CZ-R07D B09 lower-station shell compiler', () => {
  it('regenerates the guarded artifacts byte-for-byte', () => {
    expect(artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstCompile);
  });

  it('binds the accepted R08B post state and authorized R07 framework node', () => {
    expect(readManifest()).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R08B_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
      mvpScope: true,
      scopeIds: ['P1-B09'],
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r08b-post-20260821T162429Z',
        completeSaveSha256:
          'db8be11127b00fc779a7e70afa400c3e2a3f7782f4d7a95d8ef2374c2a1c8ce7',
        regionSnapshotSha256:
          '6bc43a2d419aad4fbedb5a32d8e9949dd13899187f1657a67a30d8f5fc59d87d',
        intakeStatus: 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
        touchedChunkCount: 1,
        predecessor: {
          transactionId: 'combined-zones-r08-empty-eight-platform-08-fitout',
          completedReleaseIdentitySha256:
            '70261e609d25e24269ae1aea226f05817cba8f00649ed0cd6f802a766fa9fa5b',
        },
      },
    });
  });

  it('reproduces B09 and exactly partitions the non-B08 lower station', () => {
    const manifest = readManifest();
    expect(manifest.scope).toMatchObject({
      canonicalOwner: 'P1-B09-FUNICULAR-FRAMEWORK',
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
        b08PortalSeam: {
          cellCount: 36,
          coordinateSetSha256:
            'b28a975b44296fc43739a8af0743066ca58a2c33a99e13da6c2edf89142b33e3',
        },
        lowerStationResidual: {
          cellCount: 96,
          coordinateSetSha256:
            '48f5d7df833afd04f37550ce0ac9f099b3fdeafea7acc6cc42b87139a872f5cd',
        },
        roughShell: {
          cellCount: 84,
          coordinateSetSha256:
            'e7b44ebf100becffaca355a6b863219738a4c27e0dad83ea21170da35e411e1d',
        },
        preservedInteriorVoid: {
          cellCount: 12,
          coordinateSetSha256:
            '4062250031378a6fd8ee3a499df1c38cfb9af751e28876bb90c06bf00cd6eae7',
        },
        westIsolationCap: { cellCount: 12 },
        eastIsolationCap: { cellCount: 12 },
        summitInterfaceCap: {
          cellCount: 12,
          coordinateSetSha256:
            'd1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093',
        },
        interactionHalo: { cellCount: 300 },
      },
      sourcePartition: {
        design: { cellCount: 96 },
        operated: { cellCount: 84 },
        preservedInterior: { cellCount: 12 },
        sourceStateCensus: { 'minecraft:air': 84 },
        exactPartition: true,
      },
    });
  });

  it('inventories the latest full B09 reservation and both deferred interfaces', () => {
    expect(readManifest().source.b09CurrentStateInventory).toMatchObject({
      minimumAccommodation: {
        cellCount: 7800,
        stateCensus: {
          'minecraft:air': 7797,
          'minecraft:polished_diorite': 3,
        },
        blockStateSetSha256:
          '47aff5240ce88273eb85d6a539227b4695a425319d91acd7e0d9d5aed2f1b163',
      },
      lowerStation: {
        cellCount: 132,
        stateCensus: {
          'minecraft:air': 129,
          'minecraft:polished_diorite': 3,
        },
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
        stateCensus: { 'minecraft:air': 12 },
      },
    });
  });

  it('covers 84 cells with six guarded bands and exact inverse rollback', () => {
    const manifest = readManifest();
    const pkg = manifest.packages[0];
    const forwardPath = path.join(ROOT, pkg.forward);
    const rollbackPath = path.join(ROOT, pkg.rollback);
    const forward = parseOperations(forwardPath);
    const rollback = parseOperations(rollbackPath);
    const forwardCells = expand(forward);
    const rollbackCells = expand(rollback);

    expect(forward).toHaveLength(6);
    expect(rollback).toHaveLength(6);
    expect(forwardCells.size).toBe(84);
    expect(rollbackCells.size).toBe(84);
    expect([...forwardCells.keys()].sort()).toEqual([...rollbackCells.keys()].sort());
    expect(forward.every(({ fromState, toState }) => (
      fromState === 'minecraft:air' && toState === 'minecraft:polished_diorite'
    ))).toBe(true);
    expect(rollback).toEqual(forward.slice().reverse().map((operation) => ({
      from: operation.from,
      to: operation.to,
      fromState: operation.toState,
      toState: operation.fromState,
    })));
    expect(bodySha256(forwardPath)).toBe(manifest.operations[PACKAGE_KEY].forwardSha256);
    expect(bodySha256(rollbackPath)).toBe(manifest.operations[PACKAGE_KEY].rollbackSha256);
    expect(manifest.operations[PACKAGE_KEY]).toMatchObject({
      forwardSha256:
        '925726172be02fc4cc6ef272bf24d2e4a9b4fbb2ff78cd61fcd07b37bb154bbc',
      rollbackSha256:
        'ac0a72b8de8ba3a80dae7c3afc501aa1fdb348339e0232bcf65113ddbdab85fe',
      forwardCommandCount: 6,
      rollbackCommandCount: 6,
      targetCellCount: 84,
      targetCoordinateSetSha256:
        'e7b44ebf100becffaca355a6b863219738a4c27e0dad83ea21170da35e411e1d',
      exactInverse: true,
    });
  });

  it('hard-clears protected classes and keeps every deferred opening untouched', () => {
    const manifest = readManifest();
    expect(manifest.target).toMatchObject({
      operatedUnion: { cellCount: 84 },
      desiredStateCensus: { 'minecraft:polished_diorite': 84 },
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
      summitInterfaceCapTargetIntersectionCount: 0,
      preservedInteriorTargetIntersectionCount: 0,
    });
    expect(Object.entries(manifest.compileGuards)
      .filter(([key]) => key.endsWith('ViolationCount'))
      .every(([, count]) => count === 0)).toBe(true);
    expect(manifest.scope.operationalBoundary).toMatchObject({
      b08PortalSeamTouched: false,
      b08PortalOpeningCreated: false,
      guidewayContinuationOpened: false,
      summitInterfaceCapTouched: false,
      summitInterfaceOpened: false,
      railOrVehicleInstalled: false,
      powerOrControlInstalled: false,
      drainageOrOutfallInstalled: false,
      rescueOrEgressCommissioned: false,
      shellEndsPhysicallyCapped: true,
      exactRollbackRestoresR08BAir: true,
    });
    expect(manifest.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      executionAuthorizedByThisManifest: false,
    });
  });

  it('binds passing manifest QA, preflights, parser checks, and block-entity audit', () => {
    const manifestQa = JSON.parse(fs.readFileSync(
      path.join(EVIDENCE, 'exact-release-manifest-qa.json'), 'utf8',
    )) as { status: string; passed: boolean; totals: Record<string, number> };
    expect(manifestQa).toMatchObject({
      status: 'PASS',
      passed: true,
      totals: {
        packages: 1,
        passedPackages: 1,
        uniqueTargetCells: 84,
        crossPackageIntersectionCells: 0,
      },
    });

    const forwardPreflight = JSON.parse(fs.readFileSync(
      path.join(EVIDENCE, 'forward-source-preflight.json'), 'utf8',
    )) as Record<string, unknown> & {
      regionsSnapshot: { sha256: string };
    };
    const rollbackPreflight = JSON.parse(fs.readFileSync(
      path.join(EVIDENCE, 'projected-rollback-preflight.json'), 'utf8',
    )) as Record<string, unknown> & {
      regionsSnapshot: { sha256: string };
      sourceOverlays: { passed: number; failed: number; operationCount: number };
    };
    expect(forwardPreflight).toMatchObject({
      status: 'PASS', operationCount: 6, passed: 6, failed: 0,
      opsSha256: '840bdf9f730741cd8032ffcfe6a6c875391e40e4bc97613eb173e33131bc7ee4',
    });
    expect(rollbackPreflight).toMatchObject({
      status: 'PASS', operationCount: 6, passed: 6, failed: 0,
      opsSha256: '1e0e4bdee190ebf10c1b775e505ec7939dfce2cd9ea74a5895a7d0d61f3b850e',
      sourceOverlays: { operationCount: 6, passed: 6, failed: 0 },
    });
    expect(forwardPreflight.regionsSnapshot.sha256).toBe(
      '6bc43a2d419aad4fbedb5a32d8e9949dd13899187f1657a67a30d8f5fc59d87d',
    );
    expect(rollbackPreflight.regionsSnapshot.sha256)
      .toBe(forwardPreflight.regionsSnapshot.sha256);

    for (const [filename, role, operationSha256] of [
      [
        'forward-strict-dry-run.json', 'forward',
        '840bdf9f730741cd8032ffcfe6a6c875391e40e4bc97613eb173e33131bc7ee4',
      ],
      [
        'rollback-strict-dry-run.json', 'rollback',
        '1e0e4bdee190ebf10c1b775e505ec7939dfce2cd9ea74a5895a7d0d61f3b850e',
      ],
    ] as const) {
      const report = JSON.parse(fs.readFileSync(path.join(EVIDENCE, filename), 'utf8'));
      expect(report).toMatchObject({
        status: 'dry_run',
        dryRun: true,
        strictNoop: true,
        operationRole: role,
        operationSha256,
        sourceOperationCount: 6,
        sourceGroupCount: 6,
        worldEditLeftoverCount: 0,
      });
    }
    expect(JSON.parse(fs.readFileSync(
      path.join(EVIDENCE, 'block-entity-clearance.json'), 'utf8',
    ))).toMatchObject({
      status: 'PASS', operationCount: 6, targetChunkCount: 1,
      blockingBlockEntityCount: 0, chunksMissing: 0,
    });
  });

  it('seals the manifest payload identity', () => {
    const manifest = readManifest();
    const { manifestIdentity, ...payload } = manifest;
    expect(manifestIdentity)
      .toBe('1bd7cafaa9f37a9b63e681fd73114b836b77b54544fee586ccabfe64ed19f49a');
    expect(crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'))
      .toBe(manifestIdentity);
  });
});
