import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r09g_b07_upper_route_passive_wayfinding_post_release.mjs',
);
const REPORT = path.join(
  ROOT,
  'data/world-review/combined-zones-r09g-live-20260822T020232Z/r09g-post-release-qa.json',
);

interface QaReport {
  status: string;
  qaPayloadSha256: string;
  release: Record<string, unknown>;
  bindings: Record<string, unknown>;
  exactState: Record<string, unknown>;
  geometry: Record<string, Record<string, unknown> | unknown>;
  drift: Record<string, number>;
  preservation: Record<string, number>;
  executionEvidence: Record<string, number | boolean>;
  summary: Record<string, number | boolean>;
  safetyBoundary: Record<string, boolean>;
}

let output = '';
let report: QaReport;

beforeAll(() => {
  output = execFileSync(process.execPath, [SCRIPT], { cwd: ROOT, encoding: 'utf8' });
  report = JSON.parse(fs.readFileSync(REPORT, 'utf8')) as QaReport;
}, 30_000);

describe('CZ-R09G B07 passive-wayfinding independent post-release QA', () => {
  it('seals the exact completed release and immutable source/post identities', () => {
    expect(JSON.parse(output)).toMatchObject({
      status: 'PASS_R09G_B07_PASSIVE_WAYFINDING_POSTSTATE_VERIFIED_REVERSIBLE',
      qaPayloadSha256:
        '601a83d4ed8bed0e5e26abd28bb7b0f44fba99554f80223a94e7f0f3ae585fe0',
    });
    expect(report).toMatchObject({
      release: {
        manifestIdentity: '4df5a9df25c56e4c0145e0a566354ecbd8d489fdde00cd585000c8328ebc67bb',
        completedReleaseIdentitySha256:
          '6777fdf8c9629c32de06ef11348da49976fa8a9143560f34b7a0890645d18bf1',
      },
      bindings: {
        sourceCompleteSaveSha256:
          '286aa211eb2aae65e1521a78fa9aefbb34e96e27ac95e5bb059d8faa8a2e33a9',
        postCompleteSaveSha256:
          '123df9eb90e212c7de7497b189f28b41ee5ca03603d4f4dee2ba6c0895dd1e00',
      },
    });
  });

  it('verifies all eight exact full-cube fixture transitions', () => {
    expect(report.exactState).toMatchObject({
      targetCellCount: 8,
      sourceMatchingCellCount: 8,
      postMatchingCellCount: 8,
      sourceState: 'minecraft:polished_andesite',
      targetState: 'minecraft:sea_lantern',
    });
    expect(report.geometry.fixtures).toMatchObject({
      cellCount: 8,
      coordinateSetSha256:
        '2daad521ed5e94bea26f765fb19c394d460355315fe01e27b9b586c6e0898e87',
    });
    expect(report.geometry).toMatchObject({
      fixtureIndices: [1, 17, 33, 49, 65, 81, 97, 104],
      maximumRouteIndexDistanceToFixture: 8,
    });
  });

  it('proves the exact halo/B07 diff and no off-target fixture state', () => {
    expect(report.geometry.halo).toMatchObject({
      cellCount: 216,
      coordinateSetSha256:
        '8cfb658c4eb8a69c13bee8af410772b2eb45c9ac074bf8738413f8d7f0d2361e',
    });
    expect(report.drift).toMatchObject({
      haloChangedCellCount: 8,
      haloUndeclaredChangedCellCount: 0,
      b07InteractionCellCount: 13608,
      b07InteractionChangedCellCount: 8,
      b07InteractionUndeclaredChangedCellCount: 0,
      introducedSeaLanternCellCount: 8,
      offTargetIntroducedSeaLanternCellCount: 0,
    });
  });

  it('preserves exact clearance/hold and all non-fixture R09E/R09F cells', () => {
    expect(report.geometry).toMatchObject({
      headClearance: { cellCount: 222, airCellCount: 220, holdCellCount: 2 },
      retainedR09fBarrierHold: {
        cellCount: 2,
        coordinateSetSha256:
          '9562e3cdffe2ee63305486391b4b5758feb3bc7652e32b1e1f86f2d7a7c74e10',
      },
    });
    expect(report.preservation).toMatchObject({
      priorR09eR09fUnionCellCount: 1385,
      retainedPriorR09eR09fCellCount: 1377,
      retainedPriorR09eR09fChangedCellCount: 0,
      sourceBlockEntityCount: 0,
      postBlockEntityCount: 0,
      sourceSavedEntityCount: 0,
      postSavedEntityCount: 0,
    });
  });

  it('verifies all wrapper stages, journal entries, and inverse guards', () => {
    expect(report.executionEvidence).toMatchObject({
      stageCount: 17,
      evidenceBindingCount: 17,
      evidenceBindingFailureCount: 0,
      successfulGroupCount: 8,
      noopCommandCount: 0,
      journalEntryCount: 22,
      journalComplete: true,
      rollbackPassed: 8,
      rollbackFailed: 0,
    });
  });

  it('passes 12/12 without weakening the inherited route hold', () => {
    expect(report.summary).toMatchObject({
      passed: true,
      checkCount: 12,
      passCount: 12,
      failCount: 0,
      inheritedTransitionHoldCellCount: 2,
      routeCommissioned: false,
    });
    expect(report.safetyBoundary).toMatchObject({
      publicRouteCommissioned: false,
      fireServiceRouteCommissioned: false,
      emergencyOrLifeSafetyLightingCommissioned: false,
      inheritedR09fTransitionHoldResolved: false,
      liveCallsPerformedByQa: false,
      worldMutationPerformedByQa: false,
    });
  });
});
