import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SCRIPT = path.join(ROOT, 'scripts/compile_combined_zones_r09e_b07_dry_upper_stair.mjs');
const BASENAME = 'combined-zones-r09e-b07-dry-upper-stair';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r09e-b07-dry-upper-stair-offline-20260822T011800Z',
);
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r09e-upper-stair-'));

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
  source: Record<string, unknown>;
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

const tempArtifacts = () => [
  'b07-upper-dry-lower-containment-deck.forward.txt',
  'b07-upper-dry-lower-containment-deck.rollback.txt',
  'b07-upper-dry-stair-framework.forward.txt',
  'b07-upper-dry-stair-framework.rollback.txt',
].map((suffix) => path.join(temporaryDirectory, `${BASENAME}.${suffix}`)).concat([
  path.join(temporaryDirectory, `${BASENAME}.release-manifest.json`),
  path.join(temporaryDirectory, 'entity.json'),
]);

let firstCompile: Buffer[];

beforeAll(() => {
  const args = [
    SCRIPT,
    '--generated-at', '2026-08-22T01:18:00Z',
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

describe('Combined Zones CZ-R09E B07 dry upper stair', () => {
  it('regenerates all guarded artifacts and entity evidence byte-for-byte', () => {
    expect(tempArtifacts().map((filename) => fs.readFileSync(filename))).toEqual(firstCompile);
  });

  it('binds the accepted R08AB post and real R09 wrapper contract', () => {
    expect(readManifest()).toMatchObject({
      manifestIdentity: '10fb02c514bcd5bb14e7febf987ae9fa7f1c22ab9e5bbb4fcdb9f30698ffcc7f',
      transactionId: BASENAME,
      releaseNodeId: 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT',
      mvpScope: true,
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r08ab-post-20260822T005922Z',
        completeSaveSha256: 'f9612be6c862f1693ce9c7be60e3fcc5eeb5e7a305d5ca62632d10b22bb606cb',
        regionSnapshotSha256: '4d0fc4568f8cded612e3d552520cc640056ad8c9a962379746e3069f8fe6bf7a',
        sourceLedgerCompletedReleaseIdentitySha256:
          '478d681e6df3255cf3f28742a8a00220b668754f9747777c4eab617a9d13c6e3',
      },
    });
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'wrapper-plan.json'), 'utf8')))
      .toMatchObject({
        mode: 'PREPARE_ONLY',
        packageOrder: [
          'b07-upper-dry-lower-containment-deck',
          'b07-upper-dry-stair-framework',
        ],
      });
  });

  it('derives the exact bounded dry upper geometry from accepted B07/R09 patterns', () => {
    const manifest = readManifest();
    expect(manifest.scope.geometry).toMatchObject({
      acceptedUpperVerticalPrimitive: {
        bounds: { minX: 2105, maxX: 2111, minY: 8, maxY: 72, minZ: -401, maxZ: -395 },
      },
      lowerContainmentDeck: { cellCount: 49, bounds: { minY: 18, maxY: 18 } },
      staticCore: { cellCount: 1075, bounds: { minY: 19, maxY: 61 } },
      orderedStairAndLanding: {
        cellCount: 88,
        orderedStepCount: 88,
        lowestSurfaceY2: 39,
        highestSurfaceY2: 122,
        maximumRiseHalfBlocks: 1,
        cardinallyContiguous: true,
      },
      upperRetainedCap: { cellCount: 2 },
      upperCoreCrown: { cellCount: 16, bounds: { minY: 62, maxY: 62 } },
      requiredOuterBarrier: {
        cellCount: 176,
        retainedFullSolidCellCount: 174,
        operatedAirGapCellCount: 2,
        projectedContainmentFailureCount: 0,
      },
      operatedUnion: { cellCount: 1232 },
      interactionHalo: { cellCount: 2852 },
    });
    expect(manifest.scope.ownership).toMatchObject({
      targetConstructionCellCount: 1230,
      targetInteractionOnlyCellCount: 2,
      targetOutsideInteractionCellCount: 0,
    });
  });

  it('emits 49 + 1,183 air-only transitions with exact reverse-order inverses', () => {
    const manifest = readManifest();
    expect(manifest.executionOrder).toEqual({
      forward: ['b07-upper-dry-lower-containment-deck', 'b07-upper-dry-stair-framework'],
      rollback: ['b07-upper-dry-stair-framework', 'b07-upper-dry-lower-containment-deck'],
      rationale: expect.any(String),
    });
    for (const [pkg, count] of manifest.packages.map((entry, index) => (
      [entry, index === 0 ? 49 : 1183] as const
    ))) {
      const forwardPath = path.resolve(ROOT, pkg.forward);
      const rollbackPath = path.resolve(ROOT, pkg.rollback);
      const forward = parseOperations(forwardPath);
      const rollback = parseOperations(rollbackPath);
      expect(forward).toHaveLength(count);
      expect(new Set(forward.map(({ point }) => point.join(','))).size).toBe(count);
      expect(forward.every(({ fromState }) => fromState === 'minecraft:air')).toBe(true);
      expect(rollback).toEqual(forward.slice().reverse().map((operation) => ({
        point: operation.point,
        fromState: operation.toState,
        toState: operation.fromState,
      })));
      expect(bodySha256(forwardPath)).toBe(manifest.operations[pkg.key].forwardSha256);
      expect(bodySha256(rollbackPath)).toBe(manifest.operations[pkg.key].rollbackSha256);
    }
    expect(manifest.target).toMatchObject({
      operatedCellCount: 1232,
      sourceStateCensus: { 'minecraft:air': 1232 },
      packageTargetsDisjoint: true,
    });
  });

  it('preserves wet, surface, prior R09, gravity, entity, BE, and relic boundaries', () => {
    const manifest = readManifest();
    expect(manifest.scope.operationalBoundary).toMatchObject({
      lowerWetClassMaximumY: 17,
      lowestTargetY: 18,
      r07jLowestTargetY: 63,
      highestTargetY: 62,
      lowerInterfaceClosed: true,
      upperInterfaceClosed: true,
      exteriorOpeningCreated: false,
      routeBeyondR09DHoldCommissioned: false,
      upperStairCommissioned: false,
      liftMechanismSmokePowerDrainageTouched: false,
      r06WetTreatmentTouched: false,
      r07jSurfaceArchitectureTouched: false,
      r09aThroughR09dTouched: false,
    });
    for (const key of [
      'r06TreatmentOverlap', 'r07jSurfaceArchitectureOverlap',
      'r09aLowerFloorOverlap', 'r09bLowerStairOverlap',
      'r09cLowerContainmentOverlap', 'r09dLowerCrownOverlap',
    ]) expect(manifest.priorReleaseInterfaces[key].cellCount).toBe(0);
    expect(manifest.priorReleaseInterfaces.r02AcceptedExcavationAirOverlap)
      .toMatchObject({ cellCount: 1186 });
    expect(manifest.safetyBoundary).toMatchObject({
      targetFluidCount: 0,
      haloFluidCount: 0,
      targetGravityCount: 0,
      unsupportedGravityCount: 1,
      targetsFaceAdjacentToUnsupportedGravityCount: 0,
      gravitySupportRemovedCount: 0,
      blockEntityIntersectionCount: 0,
      savedEntityIntersectionCount: 0,
      protectedRelicIntersectionCount: 0,
      mechanismTargetCount: 0,
      exteriorOpeningTargetCount: 0,
    });
  });

  it('passes ordered preflights, inverse projections, parsers, and BE/entity gates', () => {
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'manifest-qa.json'), 'utf8')))
      .toMatchObject({
        status: 'PASS',
        passed: true,
        totals: { packages: 2, passedPackages: 2, uniqueTargetCells: 1232 },
      });
    for (const [filename, count] of [
      ['deck-forward-source-preflight.json', 49],
      ['framework-forward-source-preflight.json', 1183],
      ['framework-projected-rollback-preflight.json', 1183],
      ['deck-projected-rollback-preflight.json', 49],
    ] as const) {
      expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, filename), 'utf8')))
        .toMatchObject({ status: 'PASS', passed: count, failed: 0 });
    }
    for (const [filename, role, count] of [
      ['deck-forward-strict-dry-run.json', 'forward', 49],
      ['deck-rollback-strict-dry-run.json', 'rollback', 49],
      ['framework-forward-strict-dry-run.json', 'forward', 1183],
      ['framework-rollback-strict-dry-run.json', 'rollback', 1183],
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
  });

  it('seals a complete 12/12 offline QA result without live mutation', () => {
    expect(JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'offline-qa.json'), 'utf8')))
      .toMatchObject({
        status: 'PASS_R09E_DRY_UPPER_STAIR_OFFLINE_RELEASE_READY',
        manifestIdentity: '10fb02c514bcd5bb14e7febf987ae9fa7f1c22ab9e5bbb4fcdb9f30698ffcc7f',
        targetCellCount: 1232,
        packageCount: 2,
        packageTargetCounts: [49, 1183],
        summary: { checkCount: 12, passCount: 12, failCount: 0 },
        liveCallsPerformed: false,
        worldMutationPerformed: false,
      });
  });
});
