import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r07g_empty_eight_egress_headhouses_post_release.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r07g-live-20260821T181527Z',
);
const COMMITTED_JSON = path.join(EVIDENCE, 'r07g-post-release-qa.json');
const COMMITTED_MARKDOWN = path.join(EVIDENCE, 'r07g-post-release-qa.md');
const SOURCE_ROOT = path.join(
  ROOT,
  'data/worldsnap-combined-zones-r07g-source-20260821T181527Z',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r07g-post-qa-'),
);
const regeneratedJson = path.join(temporaryDirectory, 'report.json');
const regeneratedMarkdown = path.join(temporaryDirectory, 'report.md');

interface QaReport {
  status: string;
  qaPayloadSha256: string;
  release: Record<string, string | string[]>;
  bindings: {
    ledger: { sha256: string; status: string };
    manifest: { sha256: string; manifestIdentity: string };
    evidenceBindingCount: number;
    evidenceBindingFailures: unknown[];
    sourceCompleteSave: { completeSaveSha256: string; regionSnapshotSha256: string };
    postCompleteSave: { completeSaveSha256: string; regionSnapshotSha256: string };
  };
  geometryAndPostState: Array<{
    core: string;
    canonicalOwner: string;
    geometry: Record<string, { cellCount: number; coordinateSetSha256: string }>;
    postState: Record<string, Record<string, unknown>>;
  }>;
  fullReviewDomain: Record<string, unknown>;
  beeRelocation: Record<string, Record<string, unknown>>;
  entityContainment: Record<string, unknown>;
  executionAndRollback: Array<Record<string, unknown>>;
  checks: Array<{ id: string; status: string }>;
  summary: Record<string, number | boolean>;
  commissioningBoundary: Record<string, boolean>;
  safetyBoundary: Record<string, boolean>;
}

function readReport(): QaReport {
  return JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as QaReport;
}

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--generated-at', '2026-08-21T18:20:00Z',
    '--out', regeneratedJson,
    '--markdown', regeneratedMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R07G Empty Eight egress-headhouse post-release QA', () => {
  it('regenerates both sealed reports byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
  });

  it('binds the exact terminal release, manifest, and immutable save pair', () => {
    expect(readReport()).toMatchObject({
      status: 'PASS_R07G_EMPTY_EIGHT_EGRESS_HEADHOUSES_POST_RELEASE_ACCEPTED',
      qaPayloadSha256:
        'cf911cfed8f790e2b5eaf1177d9cb485a8282bb1e9d35a7eb0a498c3228fa964',
      release: {
        transactionId: 'combined-zones-r07g-empty-eight-egress-headhouses',
        releaseNodeId: 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
        canonicalOwners: ['OWN-D06-EG-A', 'OWN-D06-EG-B'],
        manifestIdentity:
          'f0733a6a4b925043eb495299dd682290ad943cd4a8184ec516c4e3c7353d9d0e',
        sourceBoundReleaseIdentitySha256:
          'ed684c352dc3317aa70396f62f0043bbf1c67b0932b5410cba75cbfb7b2c7dc5',
        completedReleaseIdentitySha256:
          '79b6e5972cfc24770cb402f740407bc7c01113d728d5cca0b765894c0066335e',
      },
      bindings: {
        ledger: {
          sha256: 'de283824ad70c1b0b1e46d7070c4c3622210f67b703a20a1b0fa791779341689',
          status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
        },
        manifest: {
          sha256: '9113c0b7d95f1991239d2e92a57c39709f481fafb0242562903914bd27e6a62e',
        },
        evidenceBindingCount: 25,
        evidenceBindingFailures: [],
        sourceCompleteSave: {
          completeSaveSha256:
            '516e0574e8928eb038e8d6dfd67334e64bcb63d79baa2c31970715750867d96f',
          regionSnapshotSha256:
            'e24b137b290835163110a0c259b7bca5df9a03ab3cc1fd621f8f23912ec25311',
        },
        postCompleteSave: {
          completeSaveSha256:
            '98086a3bc4584ba82ee287f1425f32435a2f41e1ce5f3a72482a50e225f8b8e4',
          regionSnapshotSha256:
            'd3c7f46034a4cab20819c51a4ee505a46be81065fda887c19ebe3638f2d83ad8',
        },
      },
    });
  });

  it('independently reproduces both exact 7x5x7 shells and preserved sets', () => {
    const [egA, egB] = readReport().geometryAndPostState;
    expect(egA).toMatchObject({
      core: 'EG-A',
      canonicalOwner: 'OWN-D06-EG-A',
      geometry: {
        completeSurfaceEnvelope: { cellCount: 245 },
        completeStaticShell: {
          cellCount: 170,
          coordinateSetSha256:
            '6c4048fc4430f42e0cd2fc39b11248576c331e78e0736793a5ddf0bd554e4e3e',
        },
        acceptedLandingCap: { cellCount: 49 },
        newWallAndRoof: { cellCount: 121 },
        connectedHeadroom: { cellCount: 75 },
        enclosedHeadroomFaceBoundary: { cellCount: 110 },
        roofTransitionCapY54: { cellCount: 49 },
      },
    });
    expect(egB).toMatchObject({
      core: 'EG-B',
      canonicalOwner: 'OWN-D06-EG-B',
      geometry: {
        completeSurfaceEnvelope: { cellCount: 245 },
        completeStaticShell: {
          cellCount: 170,
          coordinateSetSha256:
            '0a1566dc60205db8f5d3dd625a58e998b52ea1c1b2b4736857de43db5cf0ef9b',
        },
        acceptedLandingCap: { cellCount: 49 },
        acceptedApproachCapWall: { cellCount: 14 },
        newWallAndRoof: { cellCount: 107 },
        connectedHeadroom: { cellCount: 75 },
        enclosedHeadroomFaceBoundary: { cellCount: 110 },
        roofTransitionCapY54: { cellCount: 49 },
      },
    });
  });

  it('proves 121+107 exact targets and two complete closed shells', () => {
    const [egA, egB] = readReport().geometryAndPostState;
    expect(egA.postState).toMatchObject({
      exactTargetTransitions: { matchingCount: 121, mismatchCount: 0 },
      acceptedLandingCap: { unchangedCellCount: 49, changedCellCount: 0 },
      completeStaticShell: {
        postStateCensus: {
          'minecraft:polished_deepslate': 151,
          'minecraft:smooth_stone': 19,
        },
        closedCellCount: 170,
        forbiddenOpeningOrDynamicCellCount: 0,
        noDoorOrShaftOpening: true,
      },
    });
    expect(egB.postState).toMatchObject({
      exactTargetTransitions: { matchingCount: 107, mismatchCount: 0 },
      acceptedLandingCap: { unchangedCellCount: 49, changedCellCount: 0 },
      acceptedApproachCapWall: { unchangedCellCount: 14, changedCellCount: 0 },
      completeStaticShell: {
        postStateCensus: {
          'minecraft:polished_deepslate': 155,
          'minecraft:smooth_stone': 15,
        },
        closedCellCount: 170,
        forbiddenOpeningOrDynamicCellCount: 0,
        noDoorOrShaftOpening: true,
      },
    });
  });

  it('proves connected interior air, closed boundaries, and preserved transition caps', () => {
    for (const result of readReport().geometryAndPostState) {
      expect(result.postState).toMatchObject({
        connectedHeadroom: {
          sourceStateCensus: { 'minecraft:air': 75 },
          postStateCensus: { 'minecraft:air': 75 },
          unchangedAirCellCount: 75,
          mismatchCount: 0,
          connectivity: { componentCount: 1, largestComponentCellCount: 75 },
        },
        enclosedFaceBoundary: { closedCellCount: 110, openingCount: 0 },
        roofTransitionCapY54: { unchangedClosedCellCount: 49, mismatchCount: 0 },
      });
    }
  });

  it('proves no undeclared drift across the full 2,597-cell review domain', () => {
    expect(readReport().fullReviewDomain).toMatchObject({
      cellCount: 2597,
      coordinateSetSha256:
        '90ad64bdcaaf99fd994c89c5707457b966a942a96d8fc0dba1377159432c69eb',
      declaredChangedCellCount: 228,
      observedChangedCellCount: 228,
      undeclaredChangedCellCount: 0,
      missingDeclaredChangeCount: 0,
    });
  });

  it('proves the accepted bee relocation and entity containment persisted', () => {
    const report = readReport();
    expect(report.beeRelocation).toMatchObject({
      source: {
        point: { x: 1849, y: 66, z: 145 },
        sourceState: 'minecraft:air',
        postState: 'minecraft:air',
        sourceBlockEntity: null,
        postBlockEntity: null,
        preservedEmpty: true,
      },
      destination: {
        point: { x: 1811, y: 67, z: 378 },
        sourceState: 'minecraft:bee_nest[facing=south,honey_level=0]',
        postState: 'minecraft:bee_nest[facing=south,honey_level=0]',
        sourceProjection: { id: 'minecraft:beehive', beeCount: 3, maxEntities: 3 },
        postProjection: { id: 'minecraft:beehive', beeCount: 3, maxEntities: 3 },
        preserved: true,
      },
    });
    expect(report.entityContainment).toMatchObject({
      releaseTimeBlockingBlockEntityCount: 0,
      postShellAndInteriorBlockEntityCount: 0,
    });
  });

  it('binds strict execution, reverse rollback, acceptance, and fail-closed scope', () => {
    const report = readReport();
    expect(report.executionAndRollback).toHaveLength(2);
    expect(report.executionAndRollback).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'eg-a-sealed-surface-headhouse',
        operationCount: 121,
        exactOneCellForwardGuards: true,
        exactReverseOrderInverse: true,
        strictForwardExecution: expect.objectContaining({
          successfulGroups: 121, failedGroups: 0, noopCommands: 0, passed: true,
        }),
        rollbackPoststatePreflight: expect.objectContaining({
          passedGuards: 121, failedGuards: 0, overlayOperationCount: 107, passed: true,
        }),
      }),
      expect.objectContaining({
        key: 'eg-b-sealed-surface-headhouse',
        operationCount: 107,
        exactOneCellForwardGuards: true,
        exactReverseOrderInverse: true,
        strictForwardExecution: expect.objectContaining({
          successfulGroups: 107, failedGroups: 0, noopCommands: 0, passed: true,
        }),
        rollbackPoststatePreflight: expect.objectContaining({
          passedGuards: 107, failedGuards: 0, overlayOperationCount: 0, passed: true,
        }),
      }),
    ]));
    expect(report.checks).toHaveLength(13);
    expect(report.checks.every(({ status }) => status === 'PASS')).toBe(true);
    expect(report.summary).toEqual({
      passed: true,
      checkCount: 13,
      passCount: 13,
      failCount: 0,
      exactTargetCount: 228,
      completeShellCellCount: 340,
      preservedLandingCellCount: 98,
      preservedApproachWallCellCount: 14,
      connectedInteriorCellCount: 150,
      closedFaceBoundaryCellCount: 220,
      preservedRoofTransitionCapCellCount: 98,
      reviewDomainCellCount: 2597,
      observedChangedCellCount: 228,
      undeclaredChangedCellCount: 0,
      strictSuccessfulGroupCount: 228,
      rollbackGuardPassCount: 228,
    });
    expect(report.commissioningBoundary).toEqual({
      surfaceHeadhouseShellsPhysicallyAccepted: true,
      doorsInstalled: false,
      shaftsOrLiftsOpened: false,
      egressRouteCommissioned: false,
      futureInterfacesRemainSealed: true,
    });
    expect(report.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      serviceMutationPerformed: false,
      worldEditsPerformed: false,
      readOnlyImmutableAnvilInputs: true,
    });
  });

  it('rejects a caller-supplied post root that is not the ledger-bound post snapshot', () => {
    expect(() => execFileSync(process.execPath, [
      SCRIPT,
      '--post-root', SOURCE_ROOT,
      '--out', path.join(temporaryDirectory, 'should-not-pass.json'),
      '--markdown', path.join(temporaryDirectory, 'should-not-pass.md'),
    ], { cwd: ROOT, stdio: 'pipe' })).toThrow();
  });
});
