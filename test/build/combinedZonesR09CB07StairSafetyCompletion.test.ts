import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r09c_b07_stair_safety_completion.mjs',
);
const BASENAME = 'combined-zones-r09c-b07-stair-safety-completion';
const PACKAGE_KEY = 'b07-stair-safety-completion';
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r09c-b07-stair-safety-completion-offline-20260821T175500Z',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r09c-stair-safety-'),
);

interface Operation {
  point: number[];
  fromState: string;
  toState: string;
}

interface Manifest {
  schemaVersion: number;
  transactionId: string;
  status: string;
  releaseNodeId: string;
  mvpScope: boolean;
  manifestIdentity: string;
  source: Record<string, string | number>;
  scope: {
    canonicalOwner: string;
    geometry: Record<string, { cellCount: number; coordinateSetSha256: string }>;
    ownership: Record<string, unknown>;
    sourcePartition: Record<string, unknown>;
    functionalProof: Record<string, unknown>;
    operationalBoundary: Record<string, boolean>;
  };
  target: Record<string, unknown>;
  operations: Record<string, Record<string, string | number | boolean>>;
  packages: Array<{ key: string; forward: string; rollback: string }>;
  priorReleaseInterfaces: Record<string, unknown>;
  safetyBoundary: Record<string, number>;
}

const artifactPaths = (directory: string) => [
  path.join(directory, `${BASENAME}.${PACKAGE_KEY}.forward.txt`),
  path.join(directory, `${BASENAME}.${PACKAGE_KEY}.rollback.txt`),
  path.join(directory, `${BASENAME}.release-manifest.json`),
];

function readManifest(directory = path.join(ROOT, 'data/buildops')): Manifest {
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

let firstCompile: Buffer[];

beforeAll(() => {
  const args = [
    SCRIPT,
    '--generated-at', '2026-08-21T17:55:00Z',
    '--snapshot', 'data/worldsnap-combined-zones-r08m-post-20260821T174621Z',
    '--intake-audit',
    'data/world-review/combined-zones-r08m-live-20260821T174621Z/post-complete-save-intake.json',
    '--source-ledger',
    'data/world-review/combined-zones-r08m-live-20260821T174621Z/evidence-ledger.json',
    '--out-dir', temporaryDirectory,
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstCompile = artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones CZ-R09C B07 stair safety completion compiler', () => {
  it('regenerates every guarded artifact byte-for-byte', () => {
    expect(artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstCompile);
  });

  it('binds the latest R08M terminal source and R09B commissioning hold', () => {
    expect(readManifest()).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      status: 'COMPILED_FROM_LATEST_ACCEPTED_POST_STATE_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT',
      mvpScope: true,
      manifestIdentity:
        'fa1eb2108e30725b173bdf1ee204adcb04a9b73c4412e77317e6b63336937fd7',
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r08m-post-20260821T174621Z',
        completeSaveSha256:
          '729e0ce1cbbfc46fcba8c8e4e906b15b9c9f78036a3ddb888791de55abcc87a2',
        regionSnapshotSha256:
          '17e6965f93dc3c06c2df6d39ad90572f39c4ff54b3ac3e8eb3e70a44c56d409a',
        sourceLedgerSha256:
          '80e1e8caa6695562ce0cdaaba20f54969892895e6c3c0cceced99c9139aa1b65',
        sourceLedgerCompletedReleaseIdentitySha256:
          'e97d45132458b3fe82a1d3fdb16a840ad92cc1f0d3fe1a13de60d510d6b4b4e7',
      },
      priorReleaseInterfaces: {
        acceptedR09BPostQaPayloadSha256:
          'cbc3a98e84234b2762b6e8ede97e297eec0b09ed6add7bbcc41460ce8a93e565',
      },
    });
  });

  it('proves exact B07/Z06 ownership and projected fall containment', () => {
    expect(readManifest().scope).toMatchObject({
      canonicalOwner: 'Z06-PUBLIC-SHAFT-FITOUT',
      geometry: {
        requiredOuterBarrier: {
          cellCount: 256,
          coordinateSetSha256:
            '8acfe532a78ba39ae3c6714766276adeffa9e06f9ffb2f002dfd8cd51c94fdc9',
        },
        upperCapExtension: { cellCount: 1 },
        candidateContainment: {
          cellCount: 257,
          coordinateSetSha256:
            '43798a385667ed963fc7b11cce806589839527e6f0dadc3271c3881140468450',
        },
        operatedAirGaps: {
          cellCount: 127,
          coordinateSetSha256:
            '75520eff49415e09a07fdca1069ad2cdbb6a28168f136861a56e964d75412d3b',
        },
        retainedFullSolidBoundary: { cellCount: 129 },
        controlledSourceGravityOverhangGap: { cellCount: 1 },
        preservedStairClearance: { cellCount: 256 },
      },
      ownership: {
        canonicalB07Construction: { cellCount: 8134 },
        canonicalB07Interaction: { cellCount: 13608 },
        candidateConstructionIntersection: { cellCount: 5 },
        candidateInteractionOnly: { cellCount: 252 },
        candidateOutsideB07InteractionCount: 0,
        operatedConstructionIntersection: { cellCount: 4 },
        operatedInteractionOnly: { cellCount: 123 },
      },
      sourcePartition: {
        candidateStateCensus: {
          'minecraft:air': 128,
          'minecraft:deepslate[axis=y]': 122,
          'minecraft:stone': 4,
          'minecraft:gravel': 3,
        },
        operatedSourceStateCensus: { 'minecraft:air': 127 },
        retainedFullSolidStateCensus: {
          'minecraft:deepslate[axis=y]': 122,
          'minecraft:stone': 4,
          'minecraft:gravel': 3,
        },
        controlledAirGapStateCensus: { 'minecraft:air': 1 },
        exactPartition: true,
      },
      functionalProof: {
        orderedStairCellCount: 128,
        orderedStairSha256:
          '0fee56a61014f8f5efdf3f6307056af29b35720cd58791c452cbd948241b4ed8',
        projectedFullSolidBarrierCellCount: 255,
        controlledLowClearanceGravityOverhangCount: 1,
        projectedUncontainedStairPositionCount: 0,
        stairClearanceTargetIntersectionCount: 0,
        stairClearancePreservedAirCellCount: 256,
        extendedCapY: [3, 4, 5],
        capRiseAboveLandingBlocks: 2,
        capPhysicallyClimbableAfterProjection: false,
        routeCommissionableAfterPostQa: true,
      },
    });
  });

  it('emits 127 air-only point guards with an exact reverse-order inverse', () => {
    const manifest = readManifest();
    const pkg = manifest.packages[0];
    const forwardPath = path.join(ROOT, pkg.forward);
    const rollbackPath = path.join(ROOT, pkg.rollback);
    const forward = parseOperations(forwardPath);
    const rollback = parseOperations(rollbackPath);
    expect(forward).toHaveLength(127);
    expect(new Set(forward.map(({ point }) => point.join(','))).size).toBe(127);
    expect(forward.every(({ fromState, toState }) => (
      fromState === 'minecraft:air' && toState === 'minecraft:polished_diorite'
    ))).toBe(true);
    expect(forward.some(({ point }) => point.join(',') === '2109,5,-429')).toBe(true);
    expect(forward.some(({ point }) => point.join(',') === '2110,-53,-429')).toBe(false);
    expect(rollback).toEqual(forward.slice().reverse().map((operation) => ({
      point: operation.point,
      fromState: operation.toState,
      toState: operation.fromState,
    })));
    expect(bodySha256(forwardPath)).toBe(manifest.operations[PACKAGE_KEY].forwardSha256);
    expect(bodySha256(rollbackPath)).toBe(manifest.operations[PACKAGE_KEY].rollbackSha256);
    expect(manifest.operations[PACKAGE_KEY]).toMatchObject({
      forwardCommandCount: 127,
      rollbackCommandCount: 127,
      targetCellCount: 127,
      exactInverse: true,
      reverseOrderInverse: true,
      oneCellGuards: true,
    });
  });

  it('preserves prior releases, hazards, entities, and the isolated gravity overhang', () => {
    expect(readManifest()).toMatchObject({
      priorReleaseInterfaces: {
        r02ExcavationOverlap: { cellCount: 3 },
        r06TreatmentOverlap: { cellCount: 0 },
        r09aFloorOverlap: { cellCount: 0 },
        r09bOperatedOverlap: { cellCount: 0 },
      },
      safetyBoundary: {
        targetFluidCount: 0,
        haloFluidCount: 0,
        targetGravityCount: 0,
        retainedGravityCount: 3,
        controlledSourceFloatingGravityCount: 1,
        targetFaceAdjacentToControlledFloatingGravityCount: 0,
        unsupportedRetainedGravityCount: 0,
        gravitySupportRemovedCount: 0,
        blockEntityIntersectionCount: 0,
        savedEntityIntersectionCount: 0,
        protectedRelicIntersectionCount: 0,
        unsupportedRetainedBoundaryStateCount: 0,
      },
      scope: {
        operationalBoundary: {
          r09bStairOrCoreTouched: false,
          r09aFloorTouched: false,
          r06TreatmentTouched: false,
          fluidsTouched: false,
          blockEntitiesTouched: false,
          entitiesTouched: false,
          exactRollbackRestoresEveryGapToItsCurrentAirState: true,
        },
      },
    });
  });

  it('passes every committed offline gate and the scoped wrapper plan', () => {
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'manifest-qa.json'), 'utf8')))
      .toMatchObject({
        status: 'PASS',
        passed: true,
        totals: { packages: 1, passedPackages: 1, uniqueTargetCells: 127 },
      });
    for (const filename of ['forward-source-preflight.json', 'projected-rollback-preflight.json']) {
      expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, filename), 'utf8')))
        .toMatchObject({ status: 'PASS', passed: 127, failed: 0 });
    }
    for (const [filename, role] of [
      ['forward-strict-dry-run.json', 'forward'],
      ['rollback-strict-dry-run.json', 'rollback'],
    ] as const) {
      expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, filename), 'utf8')))
        .toMatchObject({
          status: 'dry_run',
          strictNoop: true,
          operationRole: role,
          sourceOperationCount: 127,
          worldEditLeftoverCount: 0,
        });
    }
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'block-entity-clearance.json'), 'utf8')))
      .toMatchObject({ status: 'PASS', blockingBlockEntityCount: 0 });
    const plan = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_combined_zones_scoped_release.mjs',
      '--manifest', `data/buildops/${BASENAME}.release-manifest.json`,
      '--release-node', 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT',
      '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8' })) as Record<string, unknown>;
    expect(plan).toMatchObject({
      mode: 'PREPARE_ONLY',
      globalGateDependency: 'NONE',
      packageOrder: [PACKAGE_KEY],
    });
  });
});
