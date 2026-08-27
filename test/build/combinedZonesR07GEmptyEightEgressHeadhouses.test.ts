import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r07g_empty_eight_egress_headhouses.mjs',
);
const BASENAME = 'combined-zones-r07g-empty-eight-egress-headhouses';
const PACKAGE_KEYS = [
  'eg-a-sealed-surface-headhouse',
  'eg-b-sealed-surface-headhouse',
];
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r07g-empty-eight-egress-headhouses-offline-20260821T181300Z',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r07g-egress-headhouses-'),
);

interface ExactSet {
  cellCount: number;
  coordinateSetSha256: string;
  bounds?: Record<string, number> | null;
}

interface OperationRecord {
  forwardSha256: string;
  rollbackSha256: string;
  forwardCommandCount: number;
  rollbackCommandCount: number;
  targetCellCount: number;
  targetCoordinateSetSha256: string;
  exactInverse: boolean;
  oneCellGuards: boolean;
}

interface ReleaseManifest {
  schemaVersion: number;
  transactionId: string;
  status: string;
  releaseNodeId: string;
  mvpScope: boolean;
  scopeIds: string[];
  packages: Array<{ key: string; forward: string; rollback: string }>;
  executionOrder: { forward: string[]; rollback: string[] };
  scope: {
    canonicalOwners: string[];
    engineeringBasis: Record<string, string>;
    cores: Record<string, {
      canonicalOwner: string;
      frozenExternalContinuation: ExactSet & { frozenCoordinateSetSha256: string };
      completeSurfaceEnvelope: ExactSet;
      completeStaticShell: ExactSet;
      acceptedLandingCap: ExactSet & {
        stateCensus: Record<string, number>;
      };
      acceptedR02ApproachCapWall: ExactSet;
      newWallAndRoof: ExactSet;
      preservedConnectedHeadroom: ExactSet & {
        componentCount: number;
        largestComponentCellCount: number;
        stateCensus: Record<string, number>;
      };
      preservedRoofTransitionCapY54: ExactSet & {
        stateCensus: Record<string, number>;
      };
      currentContinuationInventory: ExactSet & {
        fluidCellCount: number;
        contextualWoodyCellCount: number;
      };
    }>;
    operationalBoundary: Record<string, boolean>;
  };
  source: {
    snapshotRoot: string;
    completeSaveSha256: string;
    regionSnapshotSha256: string;
    intakeStatus: string;
    predecessor: {
      transactionId: string;
      completedReleaseIdentitySha256: string;
    };
  };
  target: {
    operatedUnion: ExactSet;
    desiredStateCensus: Record<string, number>;
    packageTargetsDisjoint: boolean;
    acceptedR02SurfaceFabricPreserved: ExactSet;
  };
  operations: Record<string, OperationRecord>;
  isolation: Record<string, number | ExactSet>;
  beeRelocationPreservation: Record<string, unknown>;
  compileGuards: Record<string, number | string>;
  safetyBoundary: Record<string, boolean>;
  manifestIdentity: string;
}

interface Operation {
  point: [number, number, number];
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
      const from = fields.slice(1, 4).map(Number) as [number, number, number];
      const to = fields.slice(4, 7).map(Number) as [number, number, number];
      expect(to).toEqual(from);
      return { point: from, fromState: fields[7], toState: fields[8] };
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
    ...PACKAGE_KEYS.flatMap((key) => [
      `${BASENAME}.${key}.forward.txt`,
      `${BASENAME}.${key}.rollback.txt`,
    ]),
    `${BASENAME}.release-manifest.json`,
  ].map((filename) => path.join(directory, filename));
}

let firstCompile: Buffer[] = [];

beforeAll(() => {
  const args = [
    SCRIPT,
    '--generated-at', '2026-08-21T18:13:00Z',
    '--snapshot', 'data/worldsnap-combined-zones-r09d-post-20260821T181124Z',
    '--intake-audit',
    'data/world-review/combined-zones-r09d-live-20260821T181124Z/post-complete-save-intake.json',
    '--source-ledger',
    'data/world-review/combined-zones-r09d-live-20260821T181124Z/evidence-ledger.json',
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

describe('Combined Zones CZ-R07G Empty Eight egress headhouses', () => {
  it('regenerates every guarded artifact byte-for-byte', () => {
    expect(artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstCompile);
  });

  it('binds the latest accepted R09D terminal post and R07 release node', () => {
    expect(readManifest()).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R09D_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
      mvpScope: true,
      scopeIds: ['D06-EGRESS-HEADHOUSE-EG-A', 'D06-EGRESS-HEADHOUSE-EG-B'],
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r09d-post-20260821T181124Z',
        completeSaveSha256:
          '899e8ce2b42bfa77ec01cbaba9088880a6760d30ff328722ec40958be34582ac',
        regionSnapshotSha256:
          '8b4fe0d6f20fdb4f59847aebf04cf21528763553d2140c23c50f6808068894e3',
        intakeStatus: 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
        predecessor: {
          transactionId: 'combined-zones-r09d-b07-terminal-crown',
          completedReleaseIdentitySha256:
            '39c27d80f062081a4cabee17eb22c3a1a6ce6776e62ea17e5d975e259eb8c8d0',
        },
      },
    });
  });

  it('binds exact owner-registry IDs at both the release and per-core levels', () => {
    const manifest = readManifest();
    expect(manifest.scope.canonicalOwners).toEqual([
      'OWN-D06-EG-A',
      'OWN-D06-EG-B',
    ]);
    expect(manifest.scope.cores['EG-A'].canonicalOwner).toBe('OWN-D06-EG-A');
    expect(manifest.scope.cores['EG-B'].canonicalOwner).toBe('OWN-D06-EG-B');
    expect(JSON.stringify(manifest.scope)).not.toMatch(/"OWN-D06-(A|B)"/);
  });

  it('builds exact 7x7 sealed shells while preserving landings, caps, and headroom', () => {
    const manifest = readManifest();
    expect(manifest.scope.cores['EG-A']).toMatchObject({
      frozenExternalContinuation: {
        cellCount: 1274,
        frozenCoordinateSetSha256:
          'da0d3c3a2db61ea29efe64b55e13a977cc5c36a8773c1030af8cd91e856b2213',
      },
      completeSurfaceEnvelope: { cellCount: 245 },
      completeStaticShell: { cellCount: 170 },
      acceptedLandingCap: {
        cellCount: 49,
        stateCensus: {
          'minecraft:polished_deepslate': 30,
          'minecraft:smooth_stone': 19,
        },
      },
      acceptedR02ApproachCapWall: { cellCount: 0 },
      newWallAndRoof: {
        cellCount: 121,
        coordinateSetSha256:
          '1bf66c17a230336f87214b818fed48df68600ec43bf7aef4352a1c22dc678959',
      },
      preservedConnectedHeadroom: {
        cellCount: 75,
        componentCount: 1,
        largestComponentCellCount: 75,
        stateCensus: { 'minecraft:air': 75 },
      },
      preservedRoofTransitionCapY54: {
        cellCount: 49,
        stateCensus: { 'minecraft:smooth_stone': 49 },
      },
    });
    expect(manifest.scope.cores['EG-B']).toMatchObject({
      frozenExternalContinuation: {
        cellCount: 833,
        frozenCoordinateSetSha256:
          '8c5e784edcafe9355e0a4986616e5289264112b455e0b280962895a1a036c70a',
      },
      completeSurfaceEnvelope: { cellCount: 245 },
      completeStaticShell: { cellCount: 170 },
      acceptedLandingCap: {
        cellCount: 49,
        stateCensus: {
          'minecraft:polished_deepslate': 34,
          'minecraft:smooth_stone': 15,
        },
      },
      acceptedR02ApproachCapWall: { cellCount: 14 },
      newWallAndRoof: {
        cellCount: 107,
        coordinateSetSha256:
          'f6179e01ab4c51bd72abf6749bcae4d10676e55fb1dfcde005573be5a3be03fe',
      },
      preservedConnectedHeadroom: {
        cellCount: 75,
        componentCount: 1,
        largestComponentCellCount: 75,
        stateCensus: { 'minecraft:air': 75 },
      },
      preservedRoofTransitionCapY54: {
        cellCount: 49,
        stateCensus: { 'minecraft:smooth_stone': 49 },
      },
    });
    expect(manifest.target).toMatchObject({
      operatedUnion: {
        cellCount: 228,
        coordinateSetSha256:
          'acab8baaebfada0a574ce89dc21711664d8a4a0074799379a4d61a607f71271d',
      },
      desiredStateCensus: { 'minecraft:polished_deepslate': 228 },
      packageTargetsDisjoint: true,
      acceptedR02SurfaceFabricPreserved: { cellCount: 112 },
    });
  });

  it('emits two exact reverse-order one-cell inverse packages', () => {
    const manifest = readManifest();
    expect(manifest.executionOrder).toEqual({
      forward: PACKAGE_KEYS,
      rollback: PACKAGE_KEYS.slice().reverse(),
      rationale:
        'The headhouses are disjoint; the declared order and exact reverse rollback remain deterministic.',
    });
    for (const pkg of manifest.packages) {
      const forwardPath = path.join(ROOT, pkg.forward);
      const rollbackPath = path.join(ROOT, pkg.rollback);
      const forward = parseOperations(forwardPath);
      const rollback = parseOperations(rollbackPath);
      expect(forward).toHaveLength(manifest.operations[pkg.key].targetCellCount);
      expect(forward.every(({ fromState, toState }) => (
        fromState === 'minecraft:air' && toState === 'minecraft:polished_deepslate'
      ))).toBe(true);
      expect(rollback).toEqual(forward.slice().reverse().map((operation) => ({
        point: operation.point,
        fromState: operation.toState,
        toState: operation.fromState,
      })));
      expect(bodySha256(forwardPath)).toBe(manifest.operations[pkg.key].forwardSha256);
      expect(bodySha256(rollbackPath)).toBe(manifest.operations[pkg.key].rollbackSha256);
      expect(manifest.operations[pkg.key]).toMatchObject({
        exactInverse: true,
        oneCellGuards: true,
      });
    }
  });

  it('proves hard isolation and preserves the executed three-bee relocation', () => {
    const manifest = readManifest();
    expect(manifest.isolation).toMatchObject({
      fluidTargetIntersectionCount: 0,
      fluidHaloIntersectionCount: 0,
      gravityHaloIntersectionCount: 0,
      forbiddenContainerOrControlHaloCount: 0,
      woodyHaloIntersectionCount: 0,
      blockEntityHaloIntersectionCount: 0,
      savedEntityHaloIntersectionCount: 0,
      protectedRelicHaloIntersectionCount: 0,
      r02AcceptedSurfaceFabricCellCount: 112,
      r02AcceptedSurfaceFabricProvenanceIntersectionCount: 112,
      r02NewTargetIntersectionCount: 0,
      coreCrossTargetIntersectionCount: 0,
    });
    expect(manifest.beeRelocationPreservation).toMatchObject({
      source: {
        point: { x: 1849, y: 66, z: 145 },
        currentState: 'minecraft:air',
        blockEntityCount: 0,
        targetIntersectionCount: 0,
      },
      destination: {
        point: { x: 1811, y: 67, z: 378 },
        currentState: 'minecraft:bee_nest[facing=south,honey_level=0]',
        blockEntityId: 'minecraft:beehive',
        embeddedBeeCount: 3,
        targetIntersectionCount: 0,
        interactionHaloIntersectionCount: 0,
      },
      acceptedExecutedRelocationBound: true,
    });
    expect(Object.entries(manifest.compileGuards)
      .filter(([key]) => key.endsWith('ViolationCount'))
      .every(([, count]) => count === 0)).toBe(true);
    expect(manifest.scope.operationalBoundary).toMatchObject({
      acceptedLandingCapsPreserved: true,
      acceptedRoofTransitionCapsPreserved: true,
      internalHeadroomPreservedAsAir: true,
      shaftsOpened: false,
      stairRoutesInstalled: false,
      liftsInstalled: false,
      exteriorDoorsInstalled: false,
      egressCommissioned: false,
      accessibleRouteCommissioned: false,
      futureInterfacesRemainSealed: true,
      exactRollbackRestoresR09DPostAir: true,
    });
    expect(manifest.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      executionAuthorizedByThisManifest: false,
    });
  });

  it('binds passing manifest, source, ordered rollback, parser, and BE evidence', () => {
    expect(JSON.parse(fs.readFileSync(
      path.join(EVIDENCE, 'exact-release-manifest-qa.json'), 'utf8',
    ))).toMatchObject({
      status: 'PASS',
      passed: true,
      totals: {
        packages: 2,
        passedPackages: 2,
        uniqueTargetCells: 228,
        crossPackageIntersectionCells: 0,
      },
    });
    const expected = {
      'eg-a': { count: 121, forward: '152959e8e32760fff5272ff3902198ce34ae77f295928110acb92f8e6206989e', rollback: '592cd47702647128225977a9aaba1c383a1264995d56d2e63286f83e8244e941' },
      'eg-b': { count: 107, forward: '02cd4a1c4154262a3bec01e179dae3d842d814a135147b93b5406cd6d8313739', rollback: '096e40c9bd82027f6bdb022eff4236fde9316b786cd5d529f8714e2bb39f29cb' },
    } as const;
    for (const [name, evidence] of Object.entries(expected)) {
      expect(JSON.parse(fs.readFileSync(
        path.join(EVIDENCE, `${name}.forward-source-preflight.json`), 'utf8',
      ))).toMatchObject({
        status: 'PASS',
        operationCount: evidence.count,
        passed: evidence.count,
        failed: 0,
        opsSha256: evidence.forward,
        regionsSnapshot: {
          sha256: '8b4fe0d6f20fdb4f59847aebf04cf21528763553d2140c23c50f6808068894e3',
        },
      });
      expect(JSON.parse(fs.readFileSync(
        path.join(EVIDENCE, `${name}.projected-rollback-preflight.json`), 'utf8',
      ))).toMatchObject({
        status: 'PASS',
        operationCount: evidence.count,
        passed: evidence.count,
        failed: 0,
        opsSha256: evidence.rollback,
        regionsSnapshot: {
          sha256: '8b4fe0d6f20fdb4f59847aebf04cf21528763553d2140c23c50f6808068894e3',
        },
      });
      for (const [role, operationSha256] of [
        ['forward', evidence.forward],
        ['rollback', evidence.rollback],
      ] as const) {
        expect(JSON.parse(fs.readFileSync(
          path.join(EVIDENCE, `${name}.${role}-strict-dry-run.json`), 'utf8',
        ))).toMatchObject({
          status: 'dry_run',
          dryRun: true,
          strictNoop: true,
          operationRole: role,
          operationSha256,
          sourceOperationCount: evidence.count,
          sourceGroupCount: evidence.count,
          worldEditLeftoverCount: 0,
        });
      }
    }
    const egBRollback = JSON.parse(fs.readFileSync(
      path.join(EVIDENCE, 'eg-b.projected-rollback-preflight.json'), 'utf8',
    ));
    const egARollback = JSON.parse(fs.readFileSync(
      path.join(EVIDENCE, 'eg-a.projected-rollback-preflight.json'), 'utf8',
    ));
    expect(egBRollback.sourceOverlays).toMatchObject({
      operationCount: 228,
      passed: 228,
      failed: 0,
    });
    expect(egARollback.sourceOverlays).toMatchObject({
      operationCount: 335,
      passed: 335,
      failed: 0,
    });
    expect(JSON.parse(fs.readFileSync(
      path.join(EVIDENCE, 'block-entity-clearance.json'), 'utf8',
    ))).toMatchObject({
      status: 'PASS',
      operationCount: 228,
      targetChunkCount: 2,
      blockingBlockEntityCount: 0,
      chunksMissing: 0,
    });
  });

  it('seals the corrected canonical manifest payload identity', () => {
    const manifest = readManifest();
    const { manifestIdentity, ...payload } = manifest;
    expect(manifestIdentity)
      .toBe('f0733a6a4b925043eb495299dd682290ad943cd4a8184ec516c4e3c7353d9d0e');
    expect(crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'))
      .toBe(manifestIdentity);
  });
});
