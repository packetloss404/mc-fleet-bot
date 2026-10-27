import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const COMPILER = path.join(
  ROOT,
  'scripts/compile_combined_zones_r12d_b09_hairpin_cardinal_passive_rail.mjs',
);
const QA = path.join(
  ROOT,
  'scripts/qa_combined_zones_r12d_b09_hairpin_cardinal_passive_rail_offline.mjs',
);
const WRAPPER = path.join(ROOT, 'scripts/run_combined_zones_scoped_release.mjs');
const BASENAME = 'combined-zones-r12d-b09-isolated-hairpin-cardinal-passive-rail';
const PACKAGE_KEY = 'b09-isolated-hairpin-cardinal-passive-rail';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r12d-b09-isolated-hairpin-cardinal-passive-rail-offline-20260822T005000Z',
);
const CANONICAL_QA = path.join(EVIDENCE, 'r12d-offline-readiness.json');
const CANONICAL_QA_MARKDOWN = path.join(EVIDENCE, 'r12d-offline-readiness.md');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r12d-passive-rail-'),
);
const temporaryQa = path.join(temporaryDirectory, 'r12d-offline-readiness.json');
const temporaryQaMarkdown = path.join(temporaryDirectory, 'r12d-offline-readiness.md');

interface ExactSet {
  cellCount: number;
  coordinateSetSha256: string;
}

interface Manifest {
  manifestIdentity: string;
  status: string;
  releaseNodeId: string;
  mvpScope: boolean;
  packages: Array<{ key: string; forward: string; rollback: string }>;
  scope: {
    canonicalOwner: string;
    material: string;
    geometry: Record<string, ExactSet>;
    selection: Record<string, number | string | boolean>;
    failSafeState: Record<string, string | boolean>;
    operationalBoundary: Record<string, boolean>;
  };
  source: Record<string, unknown> & {
    predecessor: Record<string, unknown>;
    b09SourceState: Record<string, unknown>;
  };
  operations: Record<string, Record<string, number | string | boolean>>;
  preservation: Record<string, unknown>;
  safetyAudit: Record<string, unknown>;
  blockedRailClasses: Record<string, unknown>;
  safetyBoundary: Record<string, boolean>;
}

interface Operation {
  point: [number, number, number];
  fromState: string;
  toState: string;
}

interface OfflineQa {
  status: string;
  readinessPayloadSha256: string;
  result: Record<string, number | string>;
  functionalBoundary: Record<string, boolean>;
  summary: { passed: boolean; checkCount: number; passCount: number; failCount: number };
  safetyBoundary: Record<string, boolean>;
}

const readManifest = (): Manifest => (
  JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as Manifest
);
const readQa = (): OfflineQa => (
  JSON.parse(fs.readFileSync(CANONICAL_QA, 'utf8')) as OfflineQa
);

function parseOperations(filename: string): Operation[] {
  return fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line.startsWith('REPL '))
    .map((line) => {
      const fields = line.split(/\s+/);
      expect(fields).toHaveLength(9);
      const point = fields.slice(1, 4).map(Number) as [number, number, number];
      expect(fields.slice(4, 7).map(Number)).toEqual(point);
      return { point, fromState: fields[7], toState: fields[8] };
    });
}

function bodySha256(filename: string): string {
  const body = `${fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
  return crypto.createHash('sha256').update(body).digest('hex');
}

function compilerArtifactPaths(directory: string): string[] {
  return [
    `${BASENAME}.${PACKAGE_KEY}.forward.txt`,
    `${BASENAME}.${PACKAGE_KEY}.rollback.txt`,
    `${BASENAME}.release-manifest.json`,
  ].map((filename) => path.join(directory, filename));
}

let firstCompile: Buffer[] = [];

beforeAll(() => {
  const compilerArgs = [
    COMPILER,
    '--generated-at', '2026-08-22T00:50:00Z',
    '--snapshot', 'data/worldsnap-combined-zones-r12c-post-20260822T004255Z',
    '--intake-audit',
    'data/world-review/combined-zones-r12c-live-20260822T004255Z/post-complete-save-intake.json',
    '--source-ledger',
    'data/world-review/combined-zones-r12c-live-20260822T004255Z/evidence-ledger.json',
    '--out-dir', temporaryDirectory,
  ];
  execFileSync(process.execPath, compilerArgs, { cwd: ROOT, stdio: 'pipe' });
  firstCompile = compilerArtifactPaths(temporaryDirectory)
    .map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, compilerArgs, { cwd: ROOT, stdio: 'pipe' });
  execFileSync(process.execPath, [
    QA,
    '--generated-at', '2026-08-22T00:50:00Z',
    '--out', temporaryQa,
    '--markdown', temporaryQaMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R12D isolated hairpin cardinal passive rail', () => {
  it('regenerates compiler artifacts and offline QA deterministically', () => {
    expect(compilerArtifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstCompile);
    expect(fs.readFileSync(temporaryQa)).toEqual(fs.readFileSync(CANONICAL_QA));
    expect(fs.readFileSync(temporaryQaMarkdown)).toEqual(fs.readFileSync(CANONICAL_QA_MARKDOWN));
  });

  it('binds the accepted R12C execution and independent post QA', () => {
    expect(readManifest()).toMatchObject({
      manifestIdentity: '4d360dc80d659dc26bd3359f15dcd234d05fdb2a759dab9e1b10021bc41f3cb0',
      status:
        'COMPILED_R12D_ISOLATED_HAIRPIN_CARDINAL_PASSIVE_RAIL_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING',
      mvpScope: true,
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r12c-post-20260822T004255Z',
        completeSaveSha256:
          '1c51b53415dc35060a4aefacaac8e7e8b3ca588a457c3c4ce28329e06f6fb02d',
        regionSnapshotSha256:
          'd899d084dd13f27c10ff8cdd40ad509967a3ade5c927cd22bbfdcab44a9ab80d',
        predecessor: {
          completedReleaseIdentitySha256:
            '516755fa28b16d5d7d5b1baec7dd63e33be73276ed42d69b8f58bb75cba74480',
          postQaPayloadSha256:
            '145dc2e1a30081aa4be1e6fd7204fe6f09b5bbe6828e9dea77f3791fe6d47deb',
        },
        b09SourceState: {
          blockStateSetSha256:
            'f685ace53187d0c8614e6f3ec7df2ffb56fd130c32d720d48cc7b96d97ce587f',
        },
      },
    });
  });

  it('selects only the complete isolated north-south cardinal leg', () => {
    expect(readManifest().scope).toMatchObject({
      canonicalOwner: 'Z11-FUNICULAR-OPERATIONS',
      material: 'minecraft:rail[shape=north_south,waterlogged=false]',
      geometry: {
        fullFrozenRailDatum: {
          cellCount: 561,
          coordinateSetSha256:
            '91b5174e01bde419175c68997f199f01b04ee38cbde13304ab4dd9a0d0d979b8',
        },
        selectedHairpinCardinalRail: {
          cellCount: 19,
          coordinateSetSha256:
            'd34c55e58763b4e6666edd4a973769e5e468ee185f7ef044334670ffcff41754',
        },
        exactSupport: { cellCount: 19 },
        retainedHeadroom: { cellCount: 19 },
        retainedIsolationTurnGaps: { cellCount: 2 },
        preservedR12cStraightRail: { cellCount: 231 },
      },
      selection: {
        firstCenterlineIndex: 241,
        lastCenterlineIndex: 259,
        excludedFirstTurnIndex: 240,
        excludedSecondTurnIndex: 260,
        firstAscendingDatumIndex: 262,
        axis: 'NORTH_SOUTH',
        contiguousCardinalRun: true,
        branchCount: 0,
        endpointCount: 2,
      },
    });
  });

  it('emits 19 one-cell guards and the exact reverse-order inverse', () => {
    const manifest = readManifest();
    const pkg = manifest.packages[0];
    const forward = parseOperations(path.join(ROOT, pkg.forward));
    const rollback = parseOperations(path.join(ROOT, pkg.rollback));
    expect(forward.map(({ point }) => point)).toEqual(
      Array.from({ length: 19 }, (_, index) => [2288, 130, -767 + index]),
    );
    expect(forward.every(({ fromState, toState }) => (
      fromState === 'minecraft:air'
        && toState === 'minecraft:rail[shape=north_south,waterlogged=false]'
    ))).toBe(true);
    expect(rollback).toEqual(forward.slice().reverse().map((operation) => ({
      point: operation.point,
      fromState: operation.toState,
      toState: operation.fromState,
    })));
    expect(bodySha256(path.join(ROOT, pkg.forward)))
      .toBe(String(manifest.operations[PACKAGE_KEY].forwardSha256));
    expect(bodySha256(path.join(ROOT, pkg.rollback)))
      .toBe(String(manifest.operations[PACKAGE_KEY].rollbackSha256));
  });

  it('proves support, entity containment, reviewed diagonal rail, and isolated updates', () => {
    expect(readManifest()).toMatchObject({
      safetyAudit: {
        halo: {
          cellCount: 189,
          coordinateSetSha256:
            'aca9feb244b790c02adcd958bfce9a9e2d1b646602ad73c49a6965794aa04fdc',
        },
        targetFluidCount: 0,
        haloFluidCount: 0,
        haloGravityCount: 0,
        haloExistingMechanismCount: 1,
        reviewedAdjacentMechanismCount: 1,
        haloUndeclaredMechanismCount: 0,
        haloContainerOrControlCount: 0,
        haloBlockEntityCount: 0,
        haloSavedEntityCount: 0,
        haloProtectedRelicCount: 0,
        exactSolidSupportCount: 19,
        exactAirHeadroomCount: 19,
        railUpdateDeterminism: {
          straightSingleAxis: true,
          branchCount: 0,
          forwardOrder: 'NORTH_TO_SOUTH',
          rollbackOrder: 'SOUTH_TO_NORTH',
          retainedTurnGapCount: 2,
          cardinalAdjacencyToPriorRailCount: 0,
        },
      },
      preservation: { undeclaredPriorReleaseIntersectionCount: 0 },
    });
  });

  it('passes offline gates and the real wrapper prepare-only path', () => {
    expect(readQa()).toMatchObject({
      status: 'PASS_R12D_ISOLATED_HAIRPIN_CARDINAL_PASSIVE_RAIL_OFFLINE_READY',
      readinessPayloadSha256:
        '40e7739c244b9c449b185ed63ca950d8a32e2c80dd402877ba17decc860d0d00',
      result: {
        targetCellCount: 19,
        forwardPreflightPassed: 19,
        projectedRollbackPreflightPassed: 19,
        savedEntityIntersectionCount: 0,
        blockEntityIntersectionCount: 0,
        wrapperMode: 'PREPARE_ONLY',
      },
      functionalBoundary: {
        isolatedCardinalPassiveRailReady: true,
        liveExecutionReadyWithoutFreshKernel: false,
        actualTurnRailDesignedOrInstalled: false,
        slopeRailDesignedOrInstalled: false,
        funicularCommissioned: false,
      },
      summary: { passed: true, checkCount: 15, passCount: 15, failCount: 0 },
    });
    const plan = JSON.parse(execFileSync(process.execPath, [
      WRAPPER,
      '--manifest', MANIFEST,
      '--release-node', 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING',
      '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })) as {
      mode: string;
      globalGateDependency: string;
      packageOrder: string[];
      stages: string[];
    };
    expect(plan).toMatchObject({
      mode: 'PREPARE_ONLY',
      globalGateDependency: 'NONE',
      packageOrder: [PACKAGE_KEY],
    });
    expect(plan.stages).toHaveLength(10);
  });

  it('leaves both turns, every slope, active systems, and commissioning absent', () => {
    expect(readManifest()).toMatchObject({
      scope: {
        failSafeState: {
          connectedToR12cRail: false,
          curveRailInstalled: false,
          slopeRailInstalled: false,
          poweredRailInstalled: false,
          vehicleInstalled: false,
          passengerOrRescueUseAuthorized: false,
        },
        operationalBoundary: {
          funicularCommissioned: false,
          routeCommissioned: false,
          passengerTransportCommissioned: false,
          exteriorInterfaceOpened: false,
        },
      },
      blockedRailClasses: {
        status: 'LOCAL_HOLD_ONLY_FOR_UNPROVEN_RAIL_UPDATE_CLASSES',
        doesNotBlockThisIsolatedCardinalPackage: true,
      },
    });
    expect(readQa().safetyBoundary).toEqual({
      liveCallsPerformed: false,
      apiCallsPerformed: false,
      rconCallsPerformed: false,
      serviceMutationsPerformed: false,
      worldEditsPerformed: false,
    });
  });
});
