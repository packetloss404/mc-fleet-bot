import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r08_empty_eight_fitout_post_release.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r08a-live-20260821T161558Z',
);
const COMMITTED_JSON = path.join(EVIDENCE, 'r08a-post-release-qa.json');
const COMMITTED_MARKDOWN = path.join(EVIDENCE, 'r08a-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r08a-post-qa-'),
);
const regeneratedJson = path.join(temporaryDirectory, 'report.json');
const regeneratedMarkdown = path.join(temporaryDirectory, 'report.md');

interface ExactSet {
  cellCount: number;
  coordinateSetSha256: string;
}

interface QaReport {
  status: string;
  qaPayloadSha256: string;
  release: {
    transactionId: string;
    releaseNodeId: string;
    scopeIds: string[];
    manifestIdentity: string;
    executionBindingSha256: string;
  };
  bindings: {
    ledger: { sha256: string; status: string };
    manifest: { sha256: string; manifestIdentity: string };
    sourceCompleteSave: { completeSaveSha256: string };
    postCompleteSave: {
      completeSaveSha256: string;
      regionSnapshotSha256: string;
    };
  };
  executionEvidence: {
    strictSuccessfulGroupCount: number;
    strictFailedGroupCount: number;
    strictNoopCount: number;
    packages: Array<{ passed: boolean }>;
    rollbackPoststatePreflights: Array<{
      passed: boolean;
      passedGuards: number;
      failedGuards: number;
      regionSnapshotSha256: string;
      overlayArtifactCount: number;
    }>;
  };
  geometry: {
    chamber: ExactSet;
    floor: ExactSet;
    ceiling: ExactSet;
    clearInterior: ExactSet;
    completeBarrier: ExactSet;
    retainedBarrier: ExactSet;
    staticGateCaps: ExactSet;
    preservedCarrierBands: ExactSet;
    lightingFixtures: ExactSet;
    operatedTargets: ExactSet;
  };
  postState: {
    operatedTargets: {
      matchingCellCount: number;
      mismatchCellCount: number;
      stateCensus: Record<string, number>;
    };
    floor: { stateCensus: Record<string, number>; mismatchCellCount: number };
    ceiling: { stateCensus: Record<string, number>; mismatchCellCount: number };
    clearInterior: {
      stateCensus: Record<string, number>;
      matchingCellCount: number;
      mismatchCellCount: number;
      connectivity: { componentCount: number; largestComponentCellCount: number };
    };
    preservedCarriers: {
      stateCensus: Record<string, number>;
      matchingCellCount: number;
      mismatchCellCount: number;
    };
    lightingFixtures: {
      stateCensus: Record<string, number>;
      matchingCellCount: number;
      mismatchCellCount: number;
    };
    failClosedBarrier: {
      retainedStateCensus: Record<string, number>;
      gateCapStateCensus: Record<string, number>;
      matchingCellCount: number;
      mismatchCellCount: number;
    };
  };
  checks: Array<{ id: string; status: string }>;
  summary: {
    passed: boolean;
    checkCount: number;
    passCount: number;
    failCount: number;
    operatedTargetMatchCount: number;
    clearInteriorAirCellCount: number;
    clearInteriorComponentCount: number;
    preservedCarrierMatchCount: number;
    lightingFixtureMatchCount: number;
    completeBarrierMatchCount: number;
    rollbackGuardPassCount: number;
  };
  safetyBoundary: {
    liveCallsPerformed: boolean;
    worldEditsPerformed: boolean;
    readOnlyAnvilInputs: boolean;
  };
}

function readReport(): QaReport {
  return JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as QaReport;
}

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--generated-at',
    '2026-08-21T16:20:00Z',
    '--out',
    regeneratedJson,
    '--markdown',
    regeneratedMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R08A Empty Eight EE-PF-03 post-release QA', () => {
  it('regenerates both sealed reports byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
  });

  it('binds the executed release identity and immutable source/post saves', () => {
    const report = readReport();
    expect(report).toMatchObject({
      status: 'PASS_R08A_EMPTY_EIGHT_PLATFORM_03_POST_RELEASE_ACCEPTED',
      qaPayloadSha256:
        '57fd810c0a1ebf378e5acb656965be8ae5b3f8546512c54e975dd55c8b1a43b7',
      release: {
        transactionId: 'combined-zones-r08-empty-eight-platform-03-fitout',
        releaseNodeId: 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
        scopeIds: ['Z02-U1-PLATFORMS', 'Z02-U1-LIFE-SAFETY-FITOUT'],
        manifestIdentity:
          'f02046ae2e7ea6727ae5aaa2bf2429078544a86d36b00aafb22a26a699374362',
        executionBindingSha256:
          'f158875a94c660101cae13e1e0e266c2a90374b48c4b217cafa6d90ec3f41aac',
      },
      bindings: {
        ledger: {
          sha256: '8ee5a8925dd4f6e8d430d5634129cb36f23ed638f15596918dcd41c10445c30d',
          status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
        },
        manifest: {
          sha256: '8a09bdf44b48f5708dbcd90b3f0fd8917c21d1e9b5d425236ac9ddc99894fdd6',
        },
        sourceCompleteSave: {
          completeSaveSha256:
            'f87f2b622efa5c21b23952181ff62a5694b8ddfeabac583e765e633638f9a10d',
        },
        postCompleteSave: {
          completeSaveSha256:
            'ef2d631992a5e1424fb0c171c79d31536faae1d11c7894c127ef1329d2e4eee7',
          regionSnapshotSha256:
            '59900503af2f44807dbd310c7f169aacea0f47780286610feedb056321cbc1eb',
        },
      },
    });
  });

  it('independently reproduces the exact platform chamber and target set', () => {
    const geometry = readReport().geometry;
    expect(geometry).toMatchObject({
      chamber: {
        cellCount: 4242,
        coordinateSetSha256:
          'c0e647f8e37c6dbd2a02885e1eee2fece96f66d4f5109b22f9dd2b63fe221463',
      },
      floor: { cellCount: 707 },
      ceiling: { cellCount: 707 },
      clearInterior: {
        cellCount: 2432,
        coordinateSetSha256:
          '4ad8609d812fb751f02715782f50fde155c4e119b05b9996227518d9c4ddfe5b',
      },
      completeBarrier: { cellCount: 202 },
      retainedBarrier: { cellCount: 178 },
      staticGateCaps: { cellCount: 24 },
      preservedCarrierBands: { cellCount: 194 },
      lightingFixtures: { cellCount: 7 },
      operatedTargets: {
        cellCount: 3962,
        coordinateSetSha256:
          '85ebae745b64ee6d20f24f527a0e72dad935a83ffe1187466521ccae1890b91b',
      },
    });
  });

  it('verifies all operated, clear, preserved, and barrier states', () => {
    const post = readReport().postState;
    expect(post.operatedTargets).toMatchObject({
      matchingCellCount: 3962,
      mismatchCellCount: 0,
      stateCensus: {
        'minecraft:air': 2353,
        'minecraft:polished_diorite': 1104,
        'minecraft:polished_deepslate': 226,
        'minecraft:polished_blackstone': 178,
        'minecraft:smooth_stone': 101,
      },
    });
    expect(post.floor).toEqual({
      stateCensus: {
        'minecraft:polished_diorite': 404,
        'minecraft:polished_deepslate': 202,
        'minecraft:smooth_stone': 101,
      },
      mismatchCellCount: 0,
    });
    expect(post.ceiling).toEqual({
      stateCensus: {
        'minecraft:polished_diorite': 700,
        'minecraft:sea_lantern': 7,
      },
      mismatchCellCount: 0,
    });
    expect(post.clearInterior).toMatchObject({
      stateCensus: { 'minecraft:air': 2432 },
      matchingCellCount: 2432,
      mismatchCellCount: 0,
      connectivity: { componentCount: 1, largestComponentCellCount: 2432 },
    });
    expect(post.preservedCarriers).toMatchObject({
      stateCensus: { 'minecraft:polished_blackstone': 194 },
      matchingCellCount: 194,
      mismatchCellCount: 0,
    });
    expect(post.lightingFixtures).toMatchObject({
      stateCensus: { 'minecraft:sea_lantern': 7 },
      matchingCellCount: 7,
      mismatchCellCount: 0,
    });
    expect(post.failClosedBarrier).toMatchObject({
      retainedStateCensus: { 'minecraft:polished_blackstone': 178 },
      gateCapStateCensus: { 'minecraft:polished_deepslate': 24 },
      matchingCellCount: 202,
      mismatchCellCount: 0,
    });
  });

  it('binds strict execution and complete reverse-order rollback readiness', () => {
    const report = readReport();
    expect(report.executionEvidence).toMatchObject({
      strictSuccessfulGroupCount: 3962,
      strictFailedGroupCount: 0,
      strictNoopCount: 0,
    });
    expect(report.executionEvidence.packages.every(({ passed }) => passed)).toBe(true);
    expect(report.executionEvidence.rollbackPoststatePreflights
      .map(({ passedGuards, failedGuards, overlayArtifactCount }) => ({
        passedGuards,
        failedGuards,
        overlayArtifactCount,
      }))).toEqual([
      { passedGuards: 2353, failedGuards: 0, overlayArtifactCount: 0 },
      { passedGuards: 1609, failedGuards: 0, overlayArtifactCount: 1 },
    ]);
    expect(report.executionEvidence.rollbackPoststatePreflights.every((entry) => (
      entry.passed
      && entry.regionSnapshotSha256
        === '59900503af2f44807dbd310c7f169aacea0f47780286610feedb056321cbc1eb'
    ))).toBe(true);
    expect(report.checks).toHaveLength(11);
    expect(report.checks.every(({ status }) => status === 'PASS')).toBe(true);
    expect(report.summary).toEqual({
      passed: true,
      checkCount: 11,
      passCount: 11,
      failCount: 0,
      operatedTargetMatchCount: 3962,
      clearInteriorAirCellCount: 2432,
      clearInteriorComponentCount: 1,
      preservedCarrierMatchCount: 194,
      lightingFixtureMatchCount: 7,
      completeBarrierMatchCount: 202,
      rollbackGuardPassCount: 3962,
    });
    expect(report.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      readOnlyAnvilInputs: true,
    });
  });
});
