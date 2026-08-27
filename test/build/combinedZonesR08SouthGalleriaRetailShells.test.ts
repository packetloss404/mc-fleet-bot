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
const BASENAME = 'combined-zones-r08-south-galleria-capped-retail-shells';
const MANIFEST = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const SHELL_IDS = [
  'EE-R-S01', 'EE-R-S02', 'EE-R-S03', 'EE-R-S04', 'EE-R-S05', 'EE-R-S06',
  'EE-R-S07', 'EE-R-S08', 'EE-R-S10', 'EE-R-S11', 'EE-R-S12',
];
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'r08-south-retail-'));

interface ExactSet {
  cellCount: number;
  coordinateSetSha256: string;
}

interface Operation {
  point: string;
  fromState: string;
  toState: string;
}

interface Manifest {
  transactionId: string;
  status: string;
  releaseNodeId: string;
  scopeIds: string[];
  packages: Array<{ key: string; forward: string; rollback: string }>;
  executionOrder: { forward: string[]; rollback: string[] };
  scope: {
    canonicalOwner: string;
    shellIds: string[];
    shellCount: number;
    wings: string[];
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
    shells: Array<{
      fullPrism: ExactSet;
      completeBoundary: ExactSet;
      connectedInteriorVoid: ExactSet;
      entranceCap: ExactSet;
      source: { operated: ExactSet; alreadyTarget: ExactSet; exactPartition: boolean };
      operations: { boundaryCommandCount: number; interiorCommandCount: number; topDownWithinEachLayer: boolean };
    }>;
  };
  source: {
    snapshotRoot: string;
    completeSaveSha256: string;
    captureManifestSha256: string;
    terminalReleaseLedger: {
      transactionId: string;
      completedReleaseIdentitySha256: string;
    };
    exactFullTargetStateCensus: Record<string, number>;
  };
  target: {
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
        stableAndUnaffected: boolean;
        verticalGravityDependency: unknown[];
        declaredSolidSupportTransitionCount: number;
        terminalSupport: { finalState: string };
      }>;
    };
    floorContacts: {
      cellCount: number;
      coordinateSetSha256: string;
      airCount: number;
      gravityStateCount: number;
      stableGravityStateCount: number;
      hazardousStateCount: number;
      unchangedByRelease: boolean;
    };
    blockEntityInteractionEnvelopeIntersectionCount: number;
    savedEntityInteractionEnvelopeIntersectionCount: number;
    protectedRelicInteractionEnvelopeIntersectionCount: number;
    deferredFutureLineSealInteractionEnvelopeIntersectionCount: number;
    checkedAcceptedPriorManifestCount: number;
    acceptedPriorManifestChecks: Array<{ transactionId: string; targetIntersectionCount: number }>;
    undeclaredPriorReleaseIntersectionCount: number;
  };
  safetyBoundary: Record<string, boolean>;
  manifestIdentity: string;
}

function readManifest(filename = MANIFEST): Manifest {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as Manifest;
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

const compileArgs = (outDir: string) => [
  SCRIPT,
  '--generated-at', '2026-08-21T18:16:00Z',
  '--snapshot', 'data/worldsnap-combined-zones-r07g-post-20260821T181527Z',
  '--intake-audit', 'data/world-review/combined-zones-r07g-live-20260821T181527Z/post-complete-save-intake.json',
  '--source-release-ledger', 'data/world-review/combined-zones-r07g-live-20260821T181527Z/evidence-ledger.json',
  '--out-dir', outDir,
  '--basename', BASENAME,
  '--release-id', 'CZ-R08O-SOUTH-GALLERIA-CAPPED-RETAIL-SHELLS',
  '--manifest-status', 'COMPILED_FROM_ACCEPTED_R07G_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  '--shell-ids', SHELL_IDS.join(','),
  '--prior-manifest', 'data/buildops/combined-zones-r08-north-galleria-capped-retail-shells.release-manifest.json',
  '--prior-manifest', 'data/buildops/combined-zones-r09d-b07-terminal-crown.release-manifest.json',
  '--prior-manifest', 'data/buildops/combined-zones-r07g-empty-eight-egress-headhouses.release-manifest.json',
];

let firstCompile: Buffer[] = [];

beforeAll(() => {
  execFileSync(process.execPath, compileArgs(temporaryDirectory), { cwd: ROOT, stdio: 'pipe' });
  firstCompile = artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, compileArgs(temporaryDirectory), { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones CZ-R08O south-galleria capped retail-shell compiler', () => {
  it('regenerates all eleven package pairs and the manifest byte-for-byte', () => {
    expect(artifactPaths(temporaryDirectory).map((filename) => fs.readFileSync(filename)))
      .toEqual(firstCompile);
  });

  it('binds the accepted R09D terminal post and only the selected south shells', () => {
    expect(readManifest()).toMatchObject({
      transactionId: BASENAME,
      status: 'COMPILED_FROM_ACCEPTED_R07G_POST_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      scopeIds: ['Z02-U1-CONCOURSE-MALL'],
      scope: {
        canonicalOwner: 'Z02-U1-CONCOURSE-MALL',
        shellIds: SHELL_IDS,
        shellCount: 11,
        wings: ['south galleria'],
      },
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r07g-post-20260821T181527Z',
        completeSaveSha256: '98086a3bc4584ba82ee287f1425f32435a2f41e1ce5f3a72482a50e225f8b8e4',
        captureManifestSha256: '2bd296097051ed610b07672b8df5f70c09a37524fcc90fb6089d995fb2fe9cca',
        terminalReleaseLedger: {
          transactionId: 'combined-zones-r07g-empty-eight-egress-headhouses',
          completedReleaseIdentitySha256: '79b6e5972cfc24770cb402f740407bc7c01113d728d5cca0b765894c0066335e',
        },
      },
    });
    expect(readManifest().scope.shellIds).not.toContain('EE-R-S09');
  });

  it('reproduces eleven complete disjoint shells around connected voids', () => {
    const manifest = readManifest();
    expect(manifest.scope.union).toMatchObject({
      fullPrisms: {
        cellCount: 4752,
        coordinateSetSha256: '1efc63abed4e4240e30ce2b225fc964e6621beb5d180c2eb8442b056caa5f2e2',
      },
      completeBoundaries: {
        cellCount: 3212,
        coordinateSetSha256: 'f95f195e084bacfdf10cfafa1d7c2a5fafb6d7bbaa1df9072681fe00745e131d',
      },
      connectedInteriorVoids: {
        cellCount: 1540,
        coordinateSetSha256: '01aeb42105c13aa76b3b8272746e8f1278afee372718a7c4d033bd86f966091f',
      },
      entranceCaps: {
        cellCount: 132,
        coordinateSetSha256: '55c7c528cf957b602661b8704f10e09c0f127dbada8d4e517f79570e6651e960',
      },
      shellComponents: { componentCount: 11, largestComponentCellCount: 432 },
      boundaryComponents: { componentCount: 11, largestComponentCellCount: 292 },
      interiorComponents: { componentCount: 11, largestComponentCellCount: 140 },
      shellsPairwiseDisjoint: true,
    });
    expect(manifest.scope.shells.every((shell) => (
      shell.fullPrism.cellCount === 432
      && shell.completeBoundary.cellCount === 292
      && shell.connectedInteriorVoid.cellCount === 140
      && shell.entranceCap.cellCount === 12
      && shell.source.operated.cellCount === 432
      && shell.source.alreadyTarget.cellCount === 0
      && shell.source.exactPartition
      && shell.operations.boundaryCommandCount === 292
      && shell.operations.interiorCommandCount === 140
      && shell.operations.topDownWithinEachLayer
    ))).toBe(true);
  });

  it('emits 4,752 disjoint transitions with exact reverse-order inverses', () => {
    const manifest = readManifest();
    const allPoints: string[] = [];
    expect(manifest.packages).toHaveLength(11);
    expect(manifest.executionOrder.rollback).toEqual(manifest.executionOrder.forward.slice().reverse());
    for (const pkg of manifest.packages) {
      const forward = parseOperations(path.join(ROOT, pkg.forward));
      const rollback = parseOperations(path.join(ROOT, pkg.rollback));
      expect(forward).toHaveLength(432);
      expect(rollback).toEqual(forward.slice().reverse().map((operation) => ({
        ...operation,
        fromState: operation.toState,
        toState: operation.fromState,
      })));
      expect(manifest.operations[pkg.key]).toMatchObject({
        forwardCommandCount: 432,
        rollbackCommandCount: 432,
        exactInverse: true,
      });
      allPoints.push(...forward.map(({ point }) => point));
    }
    expect(allPoints).toHaveLength(4752);
    expect(new Set(allPoints).size).toBe(4752);
    expect(manifest.target).toEqual({
      fullDesignUnion: manifest.scope.union.fullPrisms,
      operatedUnion: manifest.scope.union.fullPrisms,
      packageTargetsDisjoint: true,
      completeFinalDesiredStateCensus: {
        'minecraft:light_gray_concrete': 3212,
        'minecraft:air': 1540,
      },
      packageDesiredStateCensus: expect.any(Object),
    });
  });

  it('proves target isolation and the complete retained-gravity dependency closure', () => {
    const isolation = readManifest().isolation;
    expect(isolation).toMatchObject({
      targetFluidIntersectionCount: 0,
      targetGravityIntersectionCount: 0,
      targetContainerOrControlIntersectionCount: 0,
      interactionHalo: {
        cellCount: 5412,
        coordinateSetSha256: '0a3f59b4a9b492a63ee6c88eff1fa3c9dd14f2a3eb4c92bcef2cfe7a0f376530',
      },
      interactionHaloFluidCount: 0,
      interactionHaloContainerOrControlCount: 0,
      retainedStableGravityHalo: {
        count: 31,
        allStablySupportedAndUnaffected: true,
        faceAdjacentTargetCount: 26,
      },
      floorContacts: {
        cellCount: 1188,
        coordinateSetSha256: '216fc1abff71f7dbf057e078fc0ef8893db70a49890720dfada8bc950ae7f4a5',
        airCount: 30,
        gravityStateCount: 11,
        stableGravityStateCount: 11,
        hazardousStateCount: 0,
        unchangedByRelease: true,
      },
      blockEntityInteractionEnvelopeIntersectionCount: 0,
      savedEntityInteractionEnvelopeIntersectionCount: 0,
      protectedRelicInteractionEnvelopeIntersectionCount: 0,
      deferredFutureLineSealInteractionEnvelopeIntersectionCount: 0,
      checkedAcceptedPriorManifestCount: 33,
      undeclaredPriorReleaseIntersectionCount: 0,
    });
    const findings = isolation.retainedStableGravityHalo.findings;
    expect(findings.every(({ stableAndUnaffected }) => stableAndUnaffected)).toBe(true);
    expect(findings.reduce((sum, finding) => sum + finding.verticalGravityDependency.length, 0))
      .toBe(8);
    expect(Math.max(...findings.map((finding) => finding.verticalGravityDependency.length)))
      .toBe(3);
    expect(findings.reduce(
      (sum, finding) => sum + finding.declaredSolidSupportTransitionCount,
      0,
    )).toBe(15);
    expect(findings.every(({ terminalSupport }) => (
      terminalSupport.finalState !== 'minecraft:air'
      && terminalSupport.finalState !== 'minecraft:water'
      && terminalSupport.finalState !== 'minecraft:lava'
      && terminalSupport.finalState !== 'minecraft:gravel'
    ))).toBe(true);
    expect(isolation.acceptedPriorManifestChecks.slice(-3)).toEqual([
      {
        transactionId: 'combined-zones-r08-north-galleria-capped-retail-shells',
        path: 'data/buildops/combined-zones-r08-north-galleria-capped-retail-shells.release-manifest.json',
        manifestIdentity: '67c8cc3edbb6b534932e9169b5f2126e74ba2405ae7ead635f88e2ef90d19778',
        targetIntersectionCount: 0,
      },
      {
        transactionId: 'combined-zones-r09d-b07-terminal-crown',
        path: 'data/buildops/combined-zones-r09d-b07-terminal-crown.release-manifest.json',
        manifestIdentity: 'eba26411e7076fd30899c891b57677a48e8daba8772897bb998e42f8bf1d58a0',
        targetIntersectionCount: 0,
      },
      {
        transactionId: 'combined-zones-r07g-empty-eight-egress-headhouses',
        path: 'data/buildops/combined-zones-r07g-empty-eight-egress-headhouses.release-manifest.json',
        manifestIdentity: 'f0733a6a4b925043eb495299dd682290ad943cd4a8184ec516c4e3c7353d9d0e',
        targetIntersectionCount: 0,
      },
    ]);
  });

  it('binds manifest identity and makes no live/execution claim', () => {
    const manifest = readManifest();
    const { manifestIdentity, ...payload } = manifest;
    expect(crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'))
      .toBe(manifestIdentity);
    expect(manifestIdentity).toBe('4889c4dab5ae52f6bb7e7f7fe7f4364971e07ded8bdb9caddea7ac8835b0bdc2');
    expect(manifest.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      liveEntityClearancePerformed: false,
      worldEditsPerformed: false,
      executionAuthorizedByThisManifest: false,
    });
  });
});
