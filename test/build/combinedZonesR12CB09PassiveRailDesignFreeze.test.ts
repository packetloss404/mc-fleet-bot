import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const COMPILER = path.join(
  ROOT,
  'scripts/compile_combined_zones_r12c_b09_passive_rail_design_freeze.mjs',
);
const QA = path.join(ROOT, 'scripts/qa_combined_zones_r12c_b09_passive_rail_offline.mjs');
const BASENAME = 'combined-zones-r12c-b09-isolated-lower-straight-passive-rail-design-freeze';
const PACKAGE_KEY = 'b09-isolated-lower-straight-passive-rail';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r12c-b09-passive-rail-design-freeze-20260822T004000Z',
);
const CANONICAL_QA = path.join(EVIDENCE, 'r12c-offline-readiness.json');
const CANONICAL_QA_MARKDOWN = path.join(EVIDENCE, 'r12c-offline-readiness.md');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r12c-passive-rail-'),
);
const temporaryQa = path.join(temporaryDirectory, 'r12c-offline-readiness.json');
const temporaryQaMarkdown = path.join(temporaryDirectory, 'r12c-offline-readiness.md');

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
  source: {
    snapshotRoot: string;
    completeSaveSha256: string;
    regionSnapshotSha256: string;
    predecessor: Record<string, unknown>;
    b09SourceState: { blockStateSetSha256: string };
  };
  target: { operatedUnion: ExactSet; desiredStateCensus: Record<string, number> };
  operations: Record<string, Record<string, number | string | boolean>>;
  preservation: Record<string, unknown>;
  safetyAudit: Record<string, unknown>;
  residualActiveSystemBlockers: Record<string, unknown>;
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
    '--generated-at', '2026-08-22T00:40:00Z',
    '--snapshot', 'data/worldsnap-combined-zones-r10e-post-20260822T001339Z',
    '--intake-audit',
    'data/world-review/combined-zones-r10e-live-20260822T001339Z/post-complete-save-intake.json',
    '--source-ledger',
    'data/world-review/combined-zones-r10e-live-20260822T001339Z/evidence-ledger.json',
    '--out-dir', temporaryDirectory,
  ];
  execFileSync(process.execPath, compilerArgs, { cwd: ROOT, stdio: 'pipe' });
  firstCompile = compilerArtifactPaths(temporaryDirectory)
    .map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, compilerArgs, { cwd: ROOT, stdio: 'pipe' });
  execFileSync(process.execPath, [
    QA,
    '--generated-at', '2026-08-22T00:40:00Z',
    '--out', temporaryQa,
    '--markdown', temporaryQaMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R12C isolated lower-straight passive rail design freeze', () => {
  it('regenerates compiler artifacts deterministically and the QA seal byte-for-byte', () => {
    expect(compilerArtifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstCompile);
    expect(fs.readFileSync(temporaryQa)).toEqual(fs.readFileSync(CANONICAL_QA));
    expect(fs.readFileSync(temporaryQaMarkdown)).toEqual(fs.readFileSync(CANONICAL_QA_MARKDOWN));
  });

  it('binds the accepted R10E terminal and R12B readiness milestone', () => {
    expect(readManifest()).toMatchObject({
      manifestIdentity: 'b786c59a4d68361482b764bff34244aa73637ec859a5647f863636c49e256036',
      status: 'COMPILED_R12C_PASSIVE_RAIL_DESIGN_FREEZE_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING',
      mvpScope: true,
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r10e-post-20260822T001339Z',
        completeSaveSha256:
          '4705f8c8b5e25de25af862071f117573bc7c0aff9dd0edb0e0c4b7fd369c0cf0',
        regionSnapshotSha256:
          '8c41238e78e061a7ac3aafd58712f81fb7c66e9a6b41b2afdaa2ac3d26848443',
        predecessor: {
          completedReleaseIdentitySha256:
            '6c40b77e68ae455330eab4658c0c859132f3e60570b1a98c97decd4134c192f5',
          r12bReadinessPayloadSha256:
            'bf2a1a6a93ca51c2a2ba3e6bbdbb95ec7ff3a8f97434205abaa899edd9269044',
        },
        b09SourceState: {
          blockStateSetSha256:
            'c35c3de3dcfa24e3f588749aef0f8bfa09e26d6e9235a0a93c1b36afb5a4deef',
        },
      },
    });
  });

  it('freezes the maximal straight rail-datum subset and both isolation gaps', () => {
    expect(readManifest().scope).toMatchObject({
      canonicalOwner: 'Z11-FUNICULAR-OPERATIONS',
      material: 'minecraft:rail[shape=east_west,waterlogged=false]',
      geometry: {
        fullFrozenRailDatum: {
          cellCount: 561,
          coordinateSetSha256:
            '91b5174e01bde419175c68997f199f01b04ee38cbde13304ab4dd9a0d0d979b8',
        },
        selectedStraightRail: {
          cellCount: 231,
          coordinateSetSha256:
            'd0ce28ec1df09ee872d9885bd65d858e8a39c1d4c377ca532bfafa481bd91b0f',
        },
        exactSupport: { cellCount: 231 },
        retainedHeadroom: { cellCount: 231 },
        retainedIsolationGaps: { cellCount: 2 },
      },
      selection: {
        firstCenterlineIndex: 9,
        lastCenterlineIndex: 239,
        excludedLowerStationLastIndex: 8,
        excludedFirstCurveIndex: 240,
        axis: 'EAST_WEST',
        contiguousCardinalRun: true,
        branchCount: 0,
        endpointCount: 2,
      },
    });
  });

  it('emits 231 exact one-cell guards and the reverse-order inverse', () => {
    const manifest = readManifest();
    const pkg = manifest.packages[0];
    const forward = parseOperations(path.join(ROOT, pkg.forward));
    const rollback = parseOperations(path.join(ROOT, pkg.rollback));
    expect(forward).toHaveLength(231);
    expect(forward.map(({ point }) => point)).toEqual(
      Array.from({ length: 231 }, (_, index) => [2057 + index, 130, -748]),
    );
    expect(forward.every(({ fromState, toState }) => (
      fromState === 'minecraft:air'
        && toState === 'minecraft:rail[shape=east_west,waterlogged=false]'
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

  it('proves support, headroom, update determinism, and a clean interaction halo', () => {
    expect(readManifest()).toMatchObject({
      safetyAudit: {
        halo: {
          cellCount: 2_097,
          coordinateSetSha256:
            '834616ef9b187577d267ac796e5cbbe9ed4ec7222121db61a174a25fc1905618',
        },
        targetFluidCount: 0,
        haloFluidCount: 0,
        haloGravityCount: 0,
        haloExistingMechanismCount: 0,
        haloContainerOrControlCount: 0,
        haloBlockEntityCount: 0,
        haloSavedEntityCount: 0,
        haloProtectedRelicCount: 0,
        exactSolidSupportCount: 231,
        exactAirHeadroomCount: 231,
        railUpdateDeterminism: {
          straightSingleAxis: true,
          branchCount: 0,
          endpointNeighbourCount: 1,
          interiorNeighbourCount: 2,
          forwardOrder: 'WEST_TO_EAST',
          rollbackOrder: 'EAST_TO_WEST',
        },
      },
      preservation: { undeclaredPriorReleaseIntersectionCount: 0 },
    });
  });

  it('passes every offline gate and preserves the operational boundary', () => {
    expect(readQa()).toMatchObject({
      status: 'PASS_R12C_ISOLATED_PASSIVE_RAIL_DESIGN_FREEZE_OFFLINE_READY',
      readinessPayloadSha256:
        '470a207dc9618c5a6bca58843eee76d6c2123be3e3ac4c2d90a720290b899d61',
      result: {
        targetCellCount: 231,
        forwardPreflightPassed: 231,
        projectedRollbackPreflightPassed: 231,
        wrapperMode: 'PREPARE_ONLY',
      },
      functionalBoundary: {
        passiveRailDesignFrozen: true,
        liveExecutionReadyWithoutRebind: false,
        rebindRequiredIfAcceptedTerminalAdvances: true,
        platformBarrierDesigned: false,
        funicularCommissioned: false,
        passengerOrRescueRouteCommissioned: false,
        driveBrakeVehicleControlPowerDrainageInstalled: false,
      },
      summary: { passed: true, checkCount: 12, passCount: 12, failCount: 0 },
    });
  });

  it('makes no live or service mutation claim', () => {
    expect(readManifest().scope.operationalBoundary).toMatchObject({
      staticPassiveGuidewayMaterialOnly: true,
      funicularCommissioned: false,
      routeCommissioned: false,
      passengerTransportCommissioned: false,
      platformBarrierDesignedOrInstalled: false,
      exteriorInterfaceOpened: false,
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
