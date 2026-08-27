import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r09f_b07_enclosed_upper_interface.mjs',
);
const WRAPPER = path.join(ROOT, 'scripts/run_combined_zones_scoped_release.mjs');
const BASENAME = 'combined-zones-r09f-b07-enclosed-upper-interface';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r09f-b07-enclosed-upper-interface-offline-20260822T012500Z',
);
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r09f-upper-interface-'));

interface Operation {
  point: number[];
  fromState: string;
  toState: string;
}

interface Manifest {
  manifestIdentity: string;
  transactionId: string;
  releaseNodeId: string;
  mvpScope: boolean;
  source: Record<string, any>;
  scope: Record<string, any>;
  target: Record<string, any>;
  operations: Record<string, any>;
  packages: Array<{ key: string; forward: string; rollback: string }>;
  executionOrder: { forward: string[]; rollback: string[] };
  priorReleaseInterfaces: Record<string, any>;
  safetyBoundary: Record<string, any>;
}

function readManifest(directory = BUILDOPS): Manifest {
  return JSON.parse(fs.readFileSync(
    path.join(directory, `${BASENAME}.release-manifest.json`),
    'utf8',
  )) as Manifest;
}

function parseOperations(filename: string): Operation[] {
  return fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const fields = line.split(/\s+/);
      expect(fields[0]).toBe('REPL');
      expect(fields).toHaveLength(9);
      expect(fields.slice(1, 4)).toEqual(fields.slice(4, 7));
      return {
        point: fields.slice(1, 4).map(Number),
        fromState: fields[7],
        toState: fields[8],
      };
    });
}

function bodySha256(filename: string): string {
  const body = `${fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
  return crypto.createHash('sha256').update(body).digest('hex');
}

const suffixes = [
  'b07-upper-interface-containment.forward.txt',
  'b07-upper-interface-containment.rollback.txt',
  'b07-upper-stair-headhouse-seam.forward.txt',
  'b07-upper-stair-headhouse-seam.rollback.txt',
];
const tempArtifacts = () => suffixes
  .map((suffix) => path.join(temporaryDirectory, `${BASENAME}.${suffix}`))
  .concat([
    path.join(temporaryDirectory, `${BASENAME}.release-manifest.json`),
    path.join(temporaryDirectory, 'entity.json'),
  ]);

let firstCompile: Buffer[];

beforeAll(() => {
  const args = [
    SCRIPT,
    '--generated-at', '2026-08-22T01:25:00Z',
    '--out-dir', temporaryDirectory,
    '--entity-report', path.join(temporaryDirectory, 'entity.json'),
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstCompile = tempArtifacts().map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones CZ-R09F B07 enclosed upper interface', () => {
  it('regenerates guarded packages, manifest, and entity report byte-for-byte', () => {
    expect(tempArtifacts().map((filename) => fs.readFileSync(filename))).toEqual(firstCompile);
  });

  it('binds the accepted R09E post and independent seal', () => {
    expect(readManifest()).toMatchObject({
      manifestIdentity: 'bdec6c796b92aee6b4d97da9e70945601f547e0b7f41eeb562b5cfec09a4d588',
      transactionId: BASENAME,
      releaseNodeId: 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT',
      mvpScope: true,
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r09e-post-20260822T011348Z',
        completeSaveSha256:
          '68b36cde83b73b4bd3fd696385fa43140fd60cd1ee5351189418103a1cf73694',
        regionSnapshotSha256:
          'c448fa5d6f623255f78d30de4f25d940f0881f6588fb8c02e5509635105ce784',
        sourceLedgerCompletedReleaseIdentitySha256:
          '2ea1f26641a95b82078f10061a4c760b5b47cb2fd4586efb3fc1747069d6495e',
        sourcePostQaPayloadSha256:
          '456810635961f7e8725c2da2e5a01fbc6f653cd52a99ef14be31135bfdcf269f',
      },
    });
  });

  it('derives the exact enclosed top-anchor seam and keeps route holds closed', () => {
    const manifest = readManifest();
    expect(manifest.scope.geometry).toMatchObject({
      acceptedTopAnchor: { x: 2108, y: 72, z: -398 },
      acceptedR09eTerminalStep: {
        cell: { x: 2108, y: 60, z: -395 },
        surfaceY2: 122,
      },
      upperCoreExtension: { cellCount: 88 },
      orderedInterfaceStair: {
        cellCount: 23,
        orderedStepCount: 23,
        lowestSurfaceY2: 123,
        highestSurfaceY2: 145,
        maximumRiseHalfBlocks: 1,
        cardinallyContiguous: true,
      },
      exactHeadClearance: {
        cellCount: 46,
        operatedBlockerCellCount: 10,
        projectedMismatchCount: 0,
      },
      requiredOuterBarrier: {
        cellCount: 40,
        retainedFullSolidCellCount: 2,
        operatedGapCellCount: 38,
        projectedFailureCount: 0,
      },
      fiveCellR07jLandingSeam: { cellCount: 5 },
      retainedInteriorDeckContinuation: { x: 2108, y: 72, z: -399 },
      operatedUnion: { cellCount: 159 },
      interactionHalo: { cellCount: 638 },
    });
    expect(manifest.scope.operationalBoundary).toMatchObject({
      lowerWetInterfaceClosedByR09eDeck: true,
      r07jExteriorDoorInstalled: false,
      r07jExteriorWallOrRoofTouched: false,
      enclosedHeadhouseInteriorReached: true,
      exteriorOpeningCreated: false,
      publicRouteCommissioned: false,
      fireServiceRouteCommissioned: false,
      liftMechanismSmokePowerDrainageTouched: false,
    });
  });

  it('emits 126 + 33 guarded transitions with exact reverse-order inverses', () => {
    const manifest = readManifest();
    expect(manifest.executionOrder.forward).toEqual([
      'b07-upper-interface-containment',
      'b07-upper-stair-headhouse-seam',
    ]);
    expect(manifest.executionOrder.rollback).toEqual([
      'b07-upper-stair-headhouse-seam',
      'b07-upper-interface-containment',
    ]);
    for (const [pkg, count] of manifest.packages.map((entry, index) => (
      [entry, index === 0 ? 126 : 33] as const
    ))) {
      const forwardPath = path.resolve(ROOT, pkg.forward);
      const rollbackPath = path.resolve(ROOT, pkg.rollback);
      const forward = parseOperations(forwardPath);
      const rollback = parseOperations(rollbackPath);
      expect(forward).toHaveLength(count);
      expect(new Set(forward.map(({ point }) => point.join(','))).size).toBe(count);
      expect(rollback).toEqual(forward.slice().reverse().map((operation) => ({
        point: operation.point,
        fromState: operation.toState,
        toState: operation.fromState,
      })));
      expect(bodySha256(forwardPath)).toBe(manifest.operations[pkg.key].forwardSha256);
      expect(bodySha256(rollbackPath)).toBe(manifest.operations[pkg.key].rollbackSha256);
    }
    expect(manifest.target).toMatchObject({
      operatedCellCount: 159,
      sourceStateCensus: {
        'minecraft:air': 130,
        'minecraft:snow[layers=1]': 17,
        'minecraft:polished_andesite': 6,
        'minecraft:polished_diorite': 5,
        'minecraft:fern': 1,
      },
      packageTargetsDisjoint: true,
    });
  });

  it('narrows prior interfaces and preserves all hard hazard boundaries', () => {
    const manifest = readManifest();
    expect(manifest.priorReleaseInterfaces).toMatchObject({
      r06WetTreatment: { cellCount: 0 },
      r07jExactFiveCellInteriorDeckSeam: { cellCount: 5 },
      r09aLowerLobby: { cellCount: 0 },
      r09bLowerStair: { cellCount: 0 },
      r09cSafetyCompletion: { cellCount: 0 },
      r09dTerminalCrown: { cellCount: 0 },
      r09eExactSixCellUpperHoldTransition: { cellCount: 6 },
    });
    expect(manifest.safetyBoundary).toMatchObject({
      targetFluidCount: 0,
      haloFluidCount: 0,
      targetGravityCount: 0,
      targetFaceAdjacencyToStableGravityCount: 2,
      unsupportedGravityCount: 0,
      targetFaceAdjacencyToUnsupportedGravityCount: 0,
      gravitySupportRemovalCount: 0,
      targetWoodyCount: 0,
      woodyMutationCount: 0,
      blockEntityIntersectionCount: 0,
      savedEntityIntersectionCount: 0,
      protectedRelicIntersectionCount: 0,
      exteriorWallRoofOrDoorTargetCount: 0,
    });
  });

  it('passes preflights, inverse projections, parsers, BE/entity gates, and wrapper plan', () => {
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'manifest-qa.json'), 'utf8')))
      .toMatchObject({
        status: 'PASS', passed: true,
        totals: { packages: 2, passedPackages: 2, uniqueTargetCells: 159 },
      });
    for (const [filename, count] of [
      ['containment-forward-source-preflight.json', 126],
      ['seam-forward-source-preflight.json', 33],
      ['seam-projected-rollback-preflight.json', 33],
      ['containment-projected-rollback-preflight.json', 126],
    ] as const) {
      expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, filename), 'utf8')))
        .toMatchObject({ status: 'PASS', passed: count, failed: 0 });
    }
    for (const [filename, role, count] of [
      ['containment-forward-strict-dry-run.json', 'forward', 126],
      ['containment-rollback-strict-dry-run.json', 'rollback', 126],
      ['seam-forward-strict-dry-run.json', 'forward', 33],
      ['seam-rollback-strict-dry-run.json', 'rollback', 33],
    ] as const) {
      expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, filename), 'utf8')))
        .toMatchObject({
          status: 'dry_run', strictNoop: true, operationRole: role,
          sourceOperationCount: count, worldEditLeftoverCount: 0,
        });
    }
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'block-entity-clearance.json'), 'utf8')))
      .toMatchObject({ status: 'PASS', blockingBlockEntityCount: 0 });
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'immutable-entity-clearance.json'), 'utf8')))
      .toMatchObject({
        status: 'PASS', blockEntityIntersectionCount: 0, savedEntityIntersectionCount: 0,
        liveEntityClearanceStillRequiredByWrapper: true,
      });
    const plan = JSON.parse(execFileSync(process.execPath, [
      WRAPPER,
      '--manifest', `data/buildops/${BASENAME}.release-manifest.json`,
      '--release-node', 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT',
      '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8' })) as Record<string, unknown>;
    expect(plan).toEqual(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'wrapper-plan.json'), 'utf8')));
  });

  it('seals a complete 12/12 offline QA result without live mutation', () => {
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'offline-qa.json'), 'utf8')))
      .toMatchObject({
        status: 'PASS_R09F_B07_ENCLOSED_UPPER_INTERFACE_OFFLINE_RELEASE_READY',
        manifestIdentity: 'bdec6c796b92aee6b4d97da9e70945601f547e0b7f41eeb562b5cfec09a4d588',
        targetCellCount: 159,
        packageCount: 2,
        packageTargetCounts: [126, 33],
        orderedStairCellCount: 23,
        landingSeamCellCount: 5,
        summary: { checkCount: 12, passCount: 12, failCount: 0 },
        liveCallsPerformed: false,
        worldMutationPerformed: false,
      });
  });
});
