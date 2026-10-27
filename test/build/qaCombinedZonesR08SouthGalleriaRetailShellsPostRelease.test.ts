import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r08_south_galleria_retail_shells_post_release.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r08o-live-20260821T182348Z',
);
const FILES = [
  'r08o-post-release-qa.json',
  'r08o-post-release-qa.md',
  'r08n-r08o-capped-retail-shells-commissioning-supplement.json',
  'r08n-r08o-capped-retail-shells-commissioning-supplement.md',
];
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'r08o-post-qa-'));

interface QaReport {
  status: string;
  qaPayloadSha256: string;
  release: Record<string, string>;
  bindings: {
    ledger: { sha256: string; status: string };
    manifest: { sha256: string };
    sourceCompleteSave: { completeSaveSha256: string; regionSnapshotSha256: string };
    postCompleteSave: { completeSaveSha256: string; regionSnapshotSha256: string };
    ledgerEvidence: { declaredBindingCount: number; matchingBindingCount: number; mismatchCount: number };
  };
  geometry: Record<string, Record<string, unknown>>;
  postState: {
    fullTargets: Record<string, unknown>;
    shells: Array<Record<string, Record<string, unknown>>>;
    tenantBoundary: Record<string, unknown>;
    floorStability: Record<string, unknown>;
    retainedGravityHalo: Record<string, unknown>;
    preservedInteraction: Record<string, unknown>;
    postBlockEntityIntersectionCount: number;
    postSavedEntityIntersectionCount: number;
  };
  executionEvidence: Record<string, Record<string, unknown> | Array<Record<string, unknown>>>;
  summary: Record<string, number>;
  safetyBoundary: Record<string, boolean>;
}

const report = (): QaReport => JSON.parse(
  fs.readFileSync(path.join(EVIDENCE, FILES[0]), 'utf8'),
) as QaReport;

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--generated-at', '2026-08-21T18:32:00Z',
    '--out', path.join(temporaryDirectory, FILES[0]),
    '--markdown', path.join(temporaryDirectory, FILES[1]),
    '--seal-out', path.join(temporaryDirectory, FILES[2]),
    '--seal-markdown', path.join(temporaryDirectory, FILES[3]),
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones CZ-R08O south-galleria post-release QA seal', () => {
  it('regenerates QA and commissioning artifacts byte-for-byte', () => {
    for (const filename of FILES) {
      expect(fs.readFileSync(path.join(temporaryDirectory, filename)))
        .toEqual(fs.readFileSync(path.join(EVIDENCE, filename)));
    }
  });

  it('binds the exact terminal ledger, manifest, snapshots, and all evidence', () => {
    expect(report()).toMatchObject({
      status: 'PASS_R08O_SOUTH_GALLERIA_RETAIL_SHELLS_POST_RELEASE_ACCEPTED',
      qaPayloadSha256: 'f629fc1a500b33d6887580a9e04f56d802d8f386a6305d473871ca2bffa3238b',
      release: {
        manifestIdentity: '4889c4dab5ae52f6bb7e7f7fe7f4364971e07ded8bdb9caddea7ac8835b0bdc2',
        executionBindingSha256: '8574e5dbedd7d8bdd816a0b0103f7b71d74574a15fc5787829c2e11f0751d8dc',
        completedReleaseIdentitySha256: '873a6e79675265e4190baa9a8728d68120bbcc095eaa3dddad916b474a2e4922',
      },
      bindings: {
        ledger: {
          sha256: '8ccb0be13023cce2bff1e528fc48036c7e1d85bdd522fdc43c274e2cfb77276b',
          status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
        },
        manifest: {
          sha256: '991fb2730c381bd6d69c4c2f6d00129272ea3c38119699eec5191f2670cf8205',
        },
        sourceCompleteSave: {
          completeSaveSha256: '66e45c39a7656a75926def9e9a2d8cf3612fadd942b16951b28b92cf31c3bc64',
          regionSnapshotSha256: 'd044e6d7c63076c63a0a1b8fb9c01056142b324473e0f04f6660c8ce02dbf4ad',
        },
        postCompleteSave: {
          completeSaveSha256: 'fbb5a6ffa459e04beff352e3601268a319358c0affa7f4b6c2686fd61cf06cfe',
          regionSnapshotSha256: '44aba5593c3177956b6484338f7d07f170c9f8128c4c142cf8bf4a7bb0771b67',
        },
        ledgerEvidence: { declaredBindingCount: 97, matchingBindingCount: 97, mismatchCount: 0 },
      },
    });
  });

  it('proves all eleven exact closed shells and connected air interiors', () => {
    expect(report().geometry).toMatchObject({
      fullShellUnion: { cellCount: 4752, coordinateSetSha256: '1efc63abed4e4240e30ce2b225fc964e6621beb5d180c2eb8442b056caa5f2e2' },
      operatedUnion: { cellCount: 4752 },
      completeBoundaryUnion: { cellCount: 3212 },
      connectedInteriorUnion: { cellCount: 1540 },
      closedTenantFaceUnion: { cellCount: 132 },
      interactionHalo: { cellCount: 5412 },
      floorContacts: { cellCount: 1188 },
      shellTopology: {
        shells: { componentCount: 11, largestComponentCellCount: 432 },
        boundaries: { componentCount: 11, largestComponentCellCount: 292 },
        interiors: { componentCount: 11, largestComponentCellCount: 140 },
      },
    });
    expect(report().postState.fullTargets).toEqual({
      matchingCellCount: 4752,
      mismatchCellCount: 0,
      stateCensus: { 'minecraft:light_gray_concrete': 3212, 'minecraft:air': 1540 },
    });
    expect(report().postState.shells).toHaveLength(11);
    expect(report().postState.shells.every((shell) => (
      shell.completeBoundary.cellCount === 292
      && shell.completeBoundary.openingCount === 0
      && shell.connectedInteriorVoid.cellCount === 140
      && shell.connectedInteriorVoid.nonAirCount === 0
      && shell.closedTenantFace.cellCount === 12
      && shell.closedTenantFace.openingCount === 0
    ))).toBe(true);
  });

  it('proves floor, halo, and complete gravity dependency preservation', () => {
    expect(report().postState).toMatchObject({
      floorStability: {
        unchangedContactCount: 1188,
        driftCount: 0,
        fluidCount: 0,
        gravityCount: 11,
        stableGravityCount: 11,
      },
      retainedGravityHalo: {
        gravelCount: 31,
        unchangedGravelCount: 31,
        faceAdjacentTargetCount: 26,
        uniqueDependencyCellCount: 8,
        maxDependencyDepth: 3,
        stableClosureCount: 31,
        violationCount: 0,
      },
      preservedInteraction: {
        haloUnchangedCount: 5412,
        haloDriftCount: 0,
        observedChangedCellCount: 4752,
        declaredChangedCellCount: 4752,
        undeclaredDriftCount: 0,
      },
      postBlockEntityIntersectionCount: 0,
      postSavedEntityIntersectionCount: 0,
    });
  });

  it('proves strict execution and exact reverse rollback readiness', () => {
    expect(report().executionEvidence).toMatchObject({
      stageOrder: { expectedStageCount: 87, actualStageCount: 87, exact: true, allPass: true },
      strictForwardExecution: {
        packageCount: 11,
        successfulCommandCount: 4752,
        failedCommandCount: 0,
        noopCommandCount: 0,
        passed: true,
      },
      reverseRollbackPoststatePreflight: {
        packageCount: 11,
        passedGuardCount: 4752,
        failedGuardCount: 0,
        regionSnapshotSha256: '44aba5593c3177956b6484338f7d07f170c9f8128c4c142cf8bf4a7bb0771b67',
        passed: true,
      },
    });
  });

  it('seals the combined capped-shell fabric without authorizing fit-out', () => {
    const seal = JSON.parse(fs.readFileSync(path.join(EVIDENCE, FILES[2]), 'utf8'));
    expect(seal).toMatchObject({
      status: 'PASS_R08N_R08O_CAPPED_RETAIL_SHELLS_COMMISSIONED_CLOSED',
      commissioningSealSha256: '85aaa006325b12e17b5d570310e65d099b790a3189a4da0541aa1b63f6e392c8',
      commissioningScope: {
        northShellCount: 9,
        southShellCount: 11,
        totalCappedShellCount: 20,
        completeBoundaryCellCount: 5840,
        connectedInteriorAirCellCount: 2800,
        tenantFaceOpeningCount: 0,
        tenantFitOutAuthorized: false,
        publicOccupancyAuthorized: false,
      },
      acceptance: {
        exactFinalStates: true,
        stableFloorAndGravityClosure: true,
        interactionHalosPreserved: true,
        zeroUndeclaredDrift: true,
        exactReverseRollbackReady: true,
      },
      safetyBoundary: {
        liveCallsPerformed: false,
        worldEditsPerformed: false,
        serviceMutationsPerformed: false,
        readOnlyAnvilInputs: true,
      },
    });
  });
});
