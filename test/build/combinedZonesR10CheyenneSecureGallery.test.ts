import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r10_cheyenne_secure_gallery.mjs',
);
const BASENAME = 'combined-zones-r10-cheyenne-secure-gallery';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r10-cheyenne-secure-gallery-preflight',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r10-cheyenne-secure-gallery-'),
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
      acceptedCenterlineRange: {
        firstIndex: number;
        lastIndex: number;
        pointCount: number;
      };
      galleryRouteVoid: ExactSet;
      galleryRouteConnectivity: {
        componentCount: number;
        largestComponentCellCount: number;
      };
      exteriorLiner: ExactSet;
      securityFrames: ExactSet;
      lightingFixtures: ExactSet;
      preservedTerminusCap: ExactSet;
      preservedUpstreamContinuation: ExactSet;
      exactDryHalo: { fluidCellCount: number };
    };
    secureBoundary: {
      routeVoidPreservedCellCount: number;
      routeStateViolationCount: number;
      terminusCapPreservedCellCount: number;
      terminusCapStateViolationCount: number;
      routeOrCapOperationIntersectionCount: number;
      chamberExcavatedOrOpened: boolean;
      accessControlMechanismCommissioned: boolean;
      currentDisposition: string;
    };
    summitIndependence: {
      summitProposalBoundsIntersectionCount: number;
      minimumClearZBlocks: number;
      summitFrameworkRequired: boolean;
    };
    sourcePartition: {
      liner: {
        design: ExactSet;
        operated: ExactSet;
        alreadyTarget: ExactSet;
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
    unexpectedHaloStateCount: number;
    blockEntityHaloIntersectionCount: number;
    savedEntityHaloIntersectionCount: number;
    protectedRelicCoreIntersectionCount: number;
    acceptedR03RouteTargetIntersectionCount: number;
    summitProposalBoundsIntersectionCount: number;
    intentionalPriorReleaseIntersections: Array<{
      packageId: string;
      cellCount: number;
      coordinateSetSha256: string;
    }>;
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
    `${BASENAME}.cheyenne-secure-gallery-liner.forward.txt`,
    `${BASENAME}.cheyenne-secure-gallery-liner.rollback.txt`,
    `${BASENAME}.release-manifest.json`,
  ].map((filename) => path.join(directory, filename));
}

let firstCompile: Buffer[] = [];

beforeAll(() => {
  const args = [
    SCRIPT,
    '--generated-at',
    '2026-08-21T16:35:00Z',
    '--snapshot',
    'data/worldsnap-combined-zones-r09a-post-20260821T163535Z',
    '--intake-audit',
    'data/world-review/combined-zones-r09a-live-20260821T163535Z/post-complete-save-intake.json',
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

describe('Combined Zones CZ-R10A Cheyenne secure-gallery compiler', () => {
  it('regenerates all guarded artifacts byte-for-byte', () => {
    expect(artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstCompile);
  });

  it('binds the latest accepted R09A post save and authorized R10 MVP node', () => {
    expect(readManifest()).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      releaseNodeId: 'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT',
      mvpScope: true,
      scopeIds: ['Z10-CHEYENNE-FITOUT'],
      status: 'COMPILED_FROM_ACCEPTED_R09A_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r09a-post-20260821T163535Z',
        completeSaveSha256:
          'ae68ac762092df0cff0203e87926eb8f809166e44231ca68a1e1eda6fd1b50cb',
        intakeStatus: 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
        touchedChunkCount: 8,
        packageSourceStateCensus: {
          'cheyenne-secure-gallery-liner': { 'minecraft:stone': 594 },
        },
      },
      standingAuthorization: {
        releaseNodeAuthorized: true,
        excludedMvpScopeNamed: false,
      },
    });
  });

  it('reproduces the exact terminal LEG-3 route, liner, frames, lights, and cap', () => {
    const manifest = readManifest();
    expect(manifest.scope.geometry).toMatchObject({
      acceptedCenterlineRange: { firstIndex: 768, lastIndex: 800, pointCount: 33 },
      galleryRouteVoid: {
        cellCount: 660,
        coordinateSetSha256:
          'eaeb38e78705d7ef7643fa24bb73ad4fa8cf6db2cbf17aaf39db4707e1656e67',
      },
      galleryRouteConnectivity: { componentCount: 1, largestComponentCellCount: 660 },
      exteriorLiner: {
        cellCount: 594,
        coordinateSetSha256:
          'ff2aa8d4b508943a2f65c86559dbb800bf5758835f455a62cf764f2ca67519e8',
      },
      securityFrames: { cellCount: 36 },
      lightingFixtures: { cellCount: 5 },
      preservedTerminusCap: {
        cellCount: 20,
        coordinateSetSha256:
          'd769b5ca3cea821d9a9d5ea12270cf0946e179ba05d65b3bd312ed41e083db4b',
      },
      preservedUpstreamContinuation: { cellCount: 20 },
      exactDryHalo: { fluidCellCount: 0 },
    });
    expect(manifest.scope.secureBoundary).toEqual({
      routeVoidPreservedCellCount: 660,
      routeStateViolationCount: 0,
      terminusCapPreservedCellCount: 20,
      terminusCapStateViolationCount: 0,
      routeOrCapOperationIntersectionCount: 0,
      chamberExcavatedOrOpened: false,
      accessControlMechanismCommissioned: false,
      currentDisposition: 'FAIL_CLOSED_STONE_TERMINUS_RETAINED',
    });
    expect(manifest.scope.summitIndependence).toMatchObject({
      summitProposalBoundsIntersectionCount: 0,
      minimumClearZBlocks: 35,
      summitFrameworkRequired: false,
    });
  });

  it('emits 594 exact stone transitions and a reverse-order inverse', () => {
    const manifest = readManifest();
    expect(manifest.packages.map(({ key }) => key)).toEqual([
      'cheyenne-secure-gallery-liner',
    ]);
    expect(manifest.executionOrder).toMatchObject({
      forward: ['cheyenne-secure-gallery-liner'],
      rollback: ['cheyenne-secure-gallery-liner'],
    });
    const pkg = manifest.packages[0];
    const forward = parseOperations(path.join(ROOT, pkg.forward));
    const rollback = parseOperations(path.join(ROOT, pkg.rollback));
    expect(forward).toHaveLength(594);
    expect(new Set(forward.map(({ point }) => point)).size).toBe(594);
    expect(forward.every(({ fromState }) => fromState === 'minecraft:stone')).toBe(true);
    expect(rollback).toEqual(forward.slice().reverse().map(({ point, fromState, toState }) => ({
      point,
      fromState: toState,
      toState: fromState,
    })));
    expect(manifest.operations['cheyenne-secure-gallery-liner']).toMatchObject({
      forwardSha256: '0884111910079e342f26626a4ccc8e72d25b93f189bf54dea245f1bcf3f16c1d',
      rollbackSha256: 'b198e3c8721852e4c977b6bb81633885c9629f8bf456e4eb7b7c3f2b85ce8efd',
      forwardCommandCount: 594,
      rollbackCommandCount: 594,
      exactInverse: true,
    });
    expect(manifest.target).toEqual({
      operatedUnion: {
        cellCount: 594,
        bounds: {
          minX: 2048, maxX: 2080, minY: 165, maxY: 170, minZ: -871, maxZ: -865,
        },
        coordinateSetSha256:
          'ff2aa8d4b508943a2f65c86559dbb800bf5758835f455a62cf764f2ca67519e8',
      },
      packageTargetsDisjoint: true,
      packageDesiredStateCensus: {
        'cheyenne-secure-gallery-liner': {
          'minecraft:polished_granite': 398,
          'minecraft:smooth_stone': 155,
          'minecraft:polished_blackstone_bricks': 36,
          'minecraft:sea_lantern': 5,
        },
      },
    });
  });

  it('preserves prior systems and permits only the exact reversible R05 shell transition', () => {
    const manifest = readManifest();
    expect(manifest.scope.sourcePartition.liner).toMatchObject({
      design: { cellCount: 594 },
      operated: { cellCount: 594 },
      alreadyTarget: { cellCount: 0 },
      exactPartition: true,
    });
    expect(manifest.isolation).toMatchObject({
      fluidHaloIntersectionCount: 0,
      forbiddenContainerOrControlHaloCount: 0,
      unexpectedHaloStateCount: 0,
      blockEntityHaloIntersectionCount: 0,
      savedEntityHaloIntersectionCount: 0,
      protectedRelicCoreIntersectionCount: 0,
      acceptedR03RouteTargetIntersectionCount: 0,
      summitProposalBoundsIntersectionCount: 0,
      intentionalPriorReleaseIntersections: [{
        packageId: 'combined-zones-r05-mountain/b10-bulk',
        cellCount: 594,
        coordinateSetSha256:
          'ff2aa8d4b508943a2f65c86559dbb800bf5758835f455a62cf764f2ca67519e8',
      }],
      undeclaredPriorReleaseIntersectionCount: 0,
    });
    expect(manifest.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      executionAuthorizedByThisManifest: false,
    });
  });

  it('passes independent manifest, source, rollback, block-entity, and parser gates', () => {
    const qa = JSON.parse(fs.readFileSync(
      path.join(EVIDENCE, 'exact-release-manifest-qa.json'),
      'utf8',
    )) as {
      status: string;
      totals: { passedPackages: number; uniqueTargetCells: number; crossPackageIntersectionCells: number };
    };
    expect(qa).toMatchObject({
      status: 'PASS',
      totals: { passedPackages: 1, uniqueTargetCells: 594, crossPackageIntersectionCells: 0 },
    });
    const blockEntities = JSON.parse(fs.readFileSync(
      path.join(EVIDENCE, 'block-entity-audit.json'),
      'utf8',
    )) as { status: string; blockingBlockEntityCount: number };
    expect(blockEntities).toMatchObject({ status: 'PASS', blockingBlockEntityCount: 0 });

    for (const [filename, overlayCount] of [
      ['forward-source-preflight.json', 0],
      ['projected-rollback-preflight.json', 1],
    ] as const) {
      const report = JSON.parse(fs.readFileSync(path.join(EVIDENCE, filename), 'utf8')) as {
        status: string;
        passed: number;
        failed: number;
        sourceOverlays: { artifacts: unknown[]; failed: number } | null;
      };
      expect(report).toMatchObject({ status: 'PASS', passed: 594, failed: 0 });
      if (overlayCount) {
        expect(report.sourceOverlays).toMatchObject({ failed: 0 });
        expect(report.sourceOverlays?.artifacts).toHaveLength(overlayCount);
      }
    }
    for (const [filename, role] of [
      ['forward-strict-dry-run.json', 'forward'],
      ['rollback-strict-dry-run.json', 'rollback'],
    ] as const) {
      const report = JSON.parse(fs.readFileSync(path.join(EVIDENCE, filename), 'utf8')) as {
        status: string;
        dryRun: boolean;
        strictNoop: boolean;
        operationRole: string;
        sourceOperationCount: number;
        worldEditLeftoverCount: number;
      };
      expect(report).toMatchObject({
        status: 'dry_run',
        dryRun: true,
        strictNoop: true,
        operationRole: role,
        sourceOperationCount: 594,
        worldEditLeftoverCount: 0,
      });
    }
  });

  it('is accepted by the scoped wrapper with the complete preparation plan', () => {
    const output = execFileSync(process.execPath, [
      'scripts/run_combined_zones_scoped_release.mjs',
      '--manifest',
      `data/buildops/${BASENAME}.release-manifest.json`,
      '--release-node',
      'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT',
      '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8' });
    expect(JSON.parse(output)).toEqual({
      mode: 'PREPARE_ONLY',
      globalGateDependency: 'NONE',
      packageOrder: ['cheyenne-secure-gallery-liner'],
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
});
