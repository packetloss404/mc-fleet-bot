import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r08_north_galleria_retail_shells.mjs',
);
const BASENAME = 'combined-zones-r08-north-galleria-capped-retail-shells';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const SHELL_IDS = [
  'EE-R-N01', 'EE-R-N02', 'EE-R-N03', 'EE-R-N04', 'EE-R-N05',
  'EE-R-N08', 'EE-R-N10', 'EE-R-N11', 'EE-R-N12',
];
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r08-retail-shells-'),
);
const parameterizedDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r08-retail-shell-parameterized-'),
);

interface ExactSet {
  cellCount: number;
  coordinateSetSha256: string;
}

interface Operation {
  point: string;
  pointCoordinates: number[];
  fromState: string;
  toState: string;
}

interface ReleaseManifest {
  schemaVersion: number;
  transactionId: string;
  status: string;
  releaseNodeId: string;
  mvpScope: boolean;
  scopeIds: string[];
  packages: Array<{ key: string; forward: string; rollback: string }>;
  executionOrder: { forward: string[]; rollback: string[]; withinPackage: string };
  scope: {
    canonicalOwner: string;
    shellIds: string[];
    shellCount: number;
    tenantFitOutAuthorized: boolean;
    openingAuthorized: boolean;
    materialDoctrine: { paletteId: string; lining: string; interior: string };
    shells: Array<{
      id: string;
      frozenCellCount: number;
      fullPrism: ExactSet;
      completeBoundary: ExactSet;
      connectedInteriorVoid: ExactSet;
      entranceCap: ExactSet;
      topology: {
        boundary: { componentCount: number };
        interiorVoid: { componentCount: number };
      };
      source: { operated: ExactSet; alreadyTarget: ExactSet; exactPartition: boolean };
      operations: {
        boundaryCommandCount: number;
        interiorCommandCount: number;
        topDownWithinEachLayer: boolean;
      };
    }>;
    union: {
      fullPrisms: ExactSet;
      completeBoundaries: ExactSet;
      connectedInteriorVoids: ExactSet;
      entranceCaps: ExactSet;
      shellComponents: { componentCount: number; largestComponentCellCount: number };
      boundaryComponents: { componentCount: number; largestComponentCellCount: number };
      interiorComponents: { componentCount: number; largestComponentCellCount: number };
      shellsPairwiseDisjoint: boolean;
    };
  };
  source: {
    snapshotRoot: string;
    completeSaveSha256: string;
    captureManifestSha256: string;
    intakeStatus: string;
    terminalReleaseLedger: {
      status: string;
      transactionId: string;
      completedReleaseIdentitySha256: string;
    };
    exactFullTargetStateCensus: Record<string, number>;
  };
  target: {
    fullDesignUnion: ExactSet;
    operatedUnion: ExactSet;
    packageTargetsDisjoint: boolean;
    completeFinalDesiredStateCensus: Record<string, number>;
  };
  operations: Record<string, {
    forwardCommandCount: number;
    rollbackCommandCount: number;
    exactInverse: boolean;
  }>;
  isolation: {
    targetFluidIntersectionCount: number;
    targetGravityIntersectionCount: number;
    targetContainerOrControlIntersectionCount: number;
    interactionHalo: ExactSet;
    interactionHaloFluidCount: number;
    interactionHaloContainerOrControlCount: number;
    retainedStableGravityHalo: {
      count: number;
      allStablySupportedAndUnaffected: boolean;
      faceAdjacentTargetCount: number;
      findings: Array<{
        state: string;
        supportState: string;
        stableAndUnaffected: boolean;
      }>;
    };
    floorContacts: {
      cellCount: number;
      airCount: number;
      hazardousStateCount: number;
      unchangedByRelease: boolean;
      staticLiningRequiresGravitySupport: boolean;
    };
    blockEntityInteractionEnvelopeIntersectionCount: number;
    savedEntityInteractionEnvelopeIntersectionCount: number;
    protectedRelicInteractionEnvelopeIntersectionCount: number;
    deferredFutureLineSealInteractionEnvelopeIntersectionCount: number;
    checkedAcceptedPriorManifestCount: number;
    undeclaredPriorReleaseIntersectionCount: number;
  };
  standingAuthorization: {
    releaseNodeAuthorized: boolean;
    canonicalOwnerAuthorized: boolean;
    excludedMvpScopeNamed: boolean;
  };
  safetyBoundary: {
    liveCallsPerformed: boolean;
    liveEntityClearancePerformed: boolean;
    worldEditsPerformed: boolean;
    executionAuthorizedByThisManifest: boolean;
  };
  manifestIdentity: string;
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
        pointCoordinates: fields.slice(1, 4).map(Number),
        fromState: fields[7],
        toState: fields[8],
      };
    });
}

function artifactPaths(directory: string) {
  return [
    ...SHELL_IDS.flatMap((id) => {
      const key = `${id.toLowerCase()}-capped-shell`;
      return [
        `${BASENAME}.${key}.forward.txt`,
        `${BASENAME}.${key}.rollback.txt`,
      ];
    }),
    `${BASENAME}.release-manifest.json`,
  ].map((filename) => path.join(directory, filename));
}

function readManifest(filename = MANIFEST): ReleaseManifest {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as ReleaseManifest;
}

let firstCompile: Buffer[] = [];

beforeAll(() => {
  const args = [SCRIPT, '--out-dir', temporaryDirectory];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstCompile = artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  execFileSync(process.execPath, [
    SCRIPT,
    '--out-dir', parameterizedDirectory,
    '--basename', 'combined-zones-r08-retail-shell-parameterized-test',
    '--release-id', 'CZ-R08-RETAIL-SHELL-PARAMETERIZED-TEST',
    '--manifest-status', 'PARAMETERIZED_TEST_ONLY',
    '--shell-id', 'EE-R-S01',
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  fs.rmSync(parameterizedDirectory, { recursive: true, force: true });
});

describe('Combined Zones CZ-R08 north-galleria capped retail-shell compiler', () => {
  it('regenerates all nine package pairs and the manifest byte-for-byte', () => {
    expect(artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstCompile);
  });

  it('binds the latest accepted R09C terminal post and exact R08 mall owner', () => {
    expect(readManifest()).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R09C_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      mvpScope: true,
      scopeIds: ['Z02-U1-CONCOURSE-MALL'],
      scope: {
        canonicalOwner: 'Z02-U1-CONCOURSE-MALL',
        shellIds: SHELL_IDS,
        shellCount: 9,
        tenantFitOutAuthorized: false,
        openingAuthorized: false,
        materialDoctrine: {
          paletteId: 'EE-P04',
          lining: 'minecraft:light_gray_concrete',
          interior: 'minecraft:air',
        },
      },
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r09c-post-20260821T175500Z',
        completeSaveSha256:
          '43324de6f66408ccd54d04fd754b660f56bd93768747db9153dacd7fba4741c5',
        captureManifestSha256:
          'ad908add8a4b848b83dd47c529a57aeb0a91d7d2af8473fd5555ff3eb96b93c6',
        intakeStatus: 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
        terminalReleaseLedger: {
          status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
          transactionId: 'combined-zones-r09c-b07-stair-safety-completion',
          completedReleaseIdentitySha256:
            'ac9a44c76a5dff561cb7e55c8b53890c729b26b28ab945903cb3db29b102ffaa',
        },
      },
      standingAuthorization: {
        releaseNodeAuthorized: true,
        canonicalOwnerAuthorized: true,
        excludedMvpScopeNamed: false,
      },
    });
  });

  it('reproduces nine complete disjoint 12x4x9 shells around connected voids', () => {
    const manifest = readManifest();
    expect(manifest.scope.union).toEqual({
      fullPrisms: {
        cellCount: 3888,
        bounds: { minX: 1656, maxX: 1843, minY: 49, maxY: 52, minZ: 41, maxZ: 49 },
        coordinateSetSha256:
          '0d303b5f35a5d52c51139395b1463d77f4953cdd091393b69a49438869d49a46',
      },
      completeBoundaries: {
        cellCount: 2628,
        bounds: { minX: 1656, maxX: 1843, minY: 49, maxY: 52, minZ: 41, maxZ: 49 },
        coordinateSetSha256:
          '0ffd71f9dd6fa39c4e0440c27758bb6d561a0b542249ed7465665c6f762a9dd4',
      },
      connectedInteriorVoids: {
        cellCount: 1260,
        bounds: { minX: 1657, maxX: 1842, minY: 50, maxY: 51, minZ: 42, maxZ: 48 },
        coordinateSetSha256:
          'b412268b3bb00a9e6302f9efb2e069768935f47a7bbe0b4ce05985652ed32b07',
      },
      entranceCaps: {
        cellCount: 108,
        bounds: { minX: 1656, maxX: 1843, minY: 49, maxY: 49, minZ: 49, maxZ: 49 },
        coordinateSetSha256:
          'b02e6adf80095fd998871a17c4b8da08ff3a5c968157eabedeecc8aaddd7fb3e',
      },
      shellComponents: { componentCount: 9, largestComponentCellCount: 432, componentSizeCensus: { 432: 9 } },
      boundaryComponents: { componentCount: 9, largestComponentCellCount: 292, componentSizeCensus: { 292: 9 } },
      interiorComponents: { componentCount: 9, largestComponentCellCount: 140, componentSizeCensus: { 140: 9 } },
      shellsPairwiseDisjoint: true,
    });
    for (const shell of manifest.scope.shells) {
      expect(shell).toMatchObject({
        frozenCellCount: 432,
        fullPrism: { cellCount: 432 },
        completeBoundary: { cellCount: 292 },
        connectedInteriorVoid: { cellCount: 140 },
        entranceCap: { cellCount: 12 },
        topology: { boundary: { componentCount: 1 }, interiorVoid: { componentCount: 1 } },
        source: { exactPartition: true },
        operations: { boundaryCommandCount: 292, topDownWithinEachLayer: true },
      });
      expect(shell.source.operated.cellCount + shell.source.alreadyTarget.cellCount).toBe(432);
    }
  });

  it('emits 3,878 disjoint exact inverses in boundary-then-interior top-down order', () => {
    const manifest = readManifest();
    expect(manifest.packages).toHaveLength(9);
    expect(manifest.executionOrder.forward).toEqual(
      SHELL_IDS.map((id) => `${id.toLowerCase()}-capped-shell`),
    );
    expect(manifest.executionOrder.rollback).toEqual(
      manifest.executionOrder.forward.slice().reverse(),
    );
    const allPoints: string[] = [];
    for (const pkg of manifest.packages) {
      const forward = parseOperations(path.join(ROOT, pkg.forward));
      const rollback = parseOperations(path.join(ROOT, pkg.rollback));
      expect(rollback).toEqual(forward.slice().reverse().map((operation) => ({
        ...operation,
        fromState: operation.toState,
        toState: operation.fromState,
      })));
      expect(manifest.operations[pkg.key]).toMatchObject({
        forwardCommandCount: forward.length,
        rollbackCommandCount: rollback.length,
        exactInverse: true,
      });
      const firstAir = forward.findIndex(({ toState }) => toState === 'minecraft:air');
      expect(firstAir).toBeGreaterThan(0);
      expect(forward.slice(0, firstAir).every(
        ({ toState }) => toState === 'minecraft:light_gray_concrete',
      )).toBe(true);
      expect(forward.slice(firstAir).every(({ toState }) => toState === 'minecraft:air')).toBe(true);
      for (const segment of [forward.slice(0, firstAir), forward.slice(firstAir)]) {
        expect(segment.every((operation, index) => (
          index === 0 || operation.pointCoordinates[1] <= segment[index - 1].pointCoordinates[1]
        ))).toBe(true);
      }
      allPoints.push(...forward.map(({ point }) => point));
    }
    expect(allPoints).toHaveLength(3878);
    expect(new Set(allPoints).size).toBe(3878);
    expect(manifest.target).toMatchObject({
      fullDesignUnion: { cellCount: 3888 },
      operatedUnion: {
        cellCount: 3878,
        coordinateSetSha256:
          '167ba260735dd809e64fc2f8eef7760dc91e29145e55ccbb88cbd150297a3ab9',
      },
      packageTargetsDisjoint: true,
      completeFinalDesiredStateCensus: {
        'minecraft:light_gray_concrete': 2628,
        'minecraft:air': 1260,
      },
    });
  });

  it('proves the exact source census and fail-closed interaction isolation', () => {
    const manifest = readManifest();
    expect(manifest.source.exactFullTargetStateCensus).toEqual({
      'minecraft:stone': 3456,
      'minecraft:andesite': 239,
      'minecraft:dirt': 51,
      'minecraft:diorite': 49,
      'minecraft:air': 42,
      'minecraft:granite': 21,
      'minecraft:copper_ore': 17,
      'minecraft:coal_ore': 13,
    });
    expect(manifest.isolation).toMatchObject({
      targetFluidIntersectionCount: 0,
      targetGravityIntersectionCount: 0,
      targetContainerOrControlIntersectionCount: 0,
      interactionHalo: {
        cellCount: 4428,
        coordinateSetSha256:
          'cb139fe2a9e017bf5666c78b733234e9fc1626e3366bd8f39066fe11bfc4d4fa',
      },
      interactionHaloFluidCount: 0,
      interactionHaloContainerOrControlCount: 0,
      retainedStableGravityHalo: {
        count: 2,
        allStablySupportedAndUnaffected: true,
        faceAdjacentTargetCount: 0,
      },
      floorContacts: {
        cellCount: 972,
        airCount: 14,
        hazardousStateCount: 0,
        unchangedByRelease: true,
        staticLiningRequiresGravitySupport: false,
      },
      blockEntityInteractionEnvelopeIntersectionCount: 0,
      savedEntityInteractionEnvelopeIntersectionCount: 0,
      protectedRelicInteractionEnvelopeIntersectionCount: 0,
      deferredFutureLineSealInteractionEnvelopeIntersectionCount: 0,
      checkedAcceptedPriorManifestCount: 30,
      undeclaredPriorReleaseIntersectionCount: 0,
    });
    expect(manifest.isolation.retainedStableGravityHalo.findings).toHaveLength(2);
    expect(manifest.isolation.retainedStableGravityHalo.findings.every((finding) => (
      finding.state === 'minecraft:gravel'
      && finding.supportState === 'minecraft:stone'
      && finding.stableAndUnaffected
    ))).toBe(true);
  });

  it('supports an explicit reusable shell-id selection without broadening the canonical batch', () => {
    const manifestPath = path.join(
      parameterizedDirectory,
      'combined-zones-r08-retail-shell-parameterized-test.release-manifest.json',
    );
    const manifest = readManifest(manifestPath);
    expect(manifest).toMatchObject({
      transactionId: 'combined-zones-r08-retail-shell-parameterized-test',
      status: 'PARAMETERIZED_TEST_ONLY',
      scope: {
        shellIds: ['EE-R-S01'],
        shellCount: 1,
        union: {
          fullPrisms: { cellCount: 432 },
          completeBoundaries: { cellCount: 292 },
          connectedInteriorVoids: { cellCount: 140 },
        },
      },
    });
  });

  it('binds the manifest identity and records no live or mutation claim', () => {
    const manifest = readManifest();
    const { manifestIdentity, ...payload } = manifest;
    expect(crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'))
      .toBe(manifestIdentity);
    expect(manifest.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      liveEntityClearancePerformed: false,
      worldEditsPerformed: false,
      executionAuthorizedByThisManifest: false,
    });
  });
});
