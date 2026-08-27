import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r10g_b03_institutional_contact_sequence_fitout_post_release.mjs',
);
const LEDGER =
  'data/world-review/combined-zones-r10g-live-20260822T031853Z/evidence-ledger.json';
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-r10g-post-qa-'));
const OUTPUT = path.join(temporaryDirectory, 'qa.json');
const MARKDOWN = path.join(temporaryDirectory, 'qa.md');

interface QaReport {
  status: string;
  qaPayloadSha256: string;
  release: Record<string, string | string[]>;
  bindings: Record<string, unknown>;
  exactPostState: Record<string, unknown>;
  routeAndFixtures: Record<string, unknown>;
  preservation: Record<string, number>;
  drift: Record<string, unknown>;
  entityAndBlockEntityPreservation: Record<string, unknown>;
  completeSaveDiffAccounting: Record<string, unknown>;
  executionEvidence: Record<string, unknown>;
  operationalBoundary: Record<string, unknown>;
  summary: Record<string, number | boolean>;
}

let report: QaReport;
let firstJson: Buffer;
let firstMarkdown: Buffer;

beforeAll(() => {
  const args = [
    SCRIPT,
    '--ledger', LEDGER,
    '--generated-at', '2026-08-22T03:35:00Z',
    '--out', OUTPUT,
    '--markdown', MARKDOWN,
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstJson = fs.readFileSync(OUTPUT);
  firstMarkdown = fs.readFileSync(MARKDOWN);
  report = JSON.parse(firstJson.toString('utf8')) as QaReport;
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R10G B03 institutional contact-sequence post-release QA', () => {
  it('regenerates both canonical evidence formats byte-for-byte', () => {
    expect(fs.readFileSync(OUTPUT)).toEqual(firstJson);
    expect(fs.readFileSync(MARKDOWN)).toEqual(firstMarkdown);
  });

  it('binds the completed release identity and immutable snapshots', () => {
    expect(report).toMatchObject({
      status:
        'PASS_R10G_B03_INSTITUTIONAL_CONTACT_SEQUENCE_POSTSTATE_VERIFIED_REVERSIBLE_UNCOMMISSIONED',
      qaPayloadSha256:
        '45ae703711127ab8c30fae08b7c84f69e872cc374a70f79e1087d44ffb77fbff',
      release: {
        manifestIdentity:
          'f4cba8ea0e4fdb3a8c5e036675c9ca9fac1842b8cffe1a4605e2297fc5d52ea4',
        sourceBoundReleaseIdentitySha256:
          '41a05a90c1f8f1fc779d19096db6b887814f7b99cc8107e0243ec0a8784fba75',
        completedReleaseIdentitySha256:
          '818e098cfa2ce12bfe09748162fa7b3cc7165e98fba6757f8bb73fb58570ca6d',
      },
      bindings: {
        evidenceBindingCount: 25,
        evidenceBindingFailures: [],
        sourceCompleteSave: {
          completeSaveSha256:
            '221b76f0f8298a29de35c52c8a77fff00d2e3f95b589755f773d646e4d2f0edb',
          regionSnapshotSha256:
            'ea3a584625d99d3568cc5f107f3e38309f8cc4f18e481718f6790c5af448a508',
        },
        postCompleteSave: {
          completeSaveSha256:
            'b6f7034521acc89a3534e68eec0533566eab67f0240fac9b4bb43ae0db1753cd',
          regionSnapshotSha256:
            '39e9e446b36381fa0961fa17e788685c983fc683a605b91e2a7b515ab39264fa',
        },
      },
    });
  });

  it('proves all targets, both owners, exact materials, and inverse operations', () => {
    expect(report.exactPostState).toMatchObject({
      targetCellCount: 5346,
      targetCoordinateSetSha256:
        '7dc95a40879d7b17546a4800cfb7233111e2bc0094838282b57c35c358dfb81b',
      ownerPackageCounts: {
        'z08-institutional-contact-sequence-liner': 5202,
        'z10-cheyenne-approach-extension-liner': 144,
      },
      ownerTargetsDisjoint: true,
      desiredStateCensus: {
        'minecraft:polished_blackstone_bricks': 18,
        'minecraft:polished_granite': 3799,
        'minecraft:sea_lantern': 49,
        'minecraft:smooth_stone': 1480,
      },
      exactSourceGuardPassCount: 5346,
      exactSourceGuardFailureCount: 0,
      exactPostTargetPassCount: 5346,
      exactPostTargetFailureCount: 0,
      exactReverseOrderInverseByPackage: {
        'z08-institutional-contact-sequence-liner': true,
        'z10-cheyenne-approach-extension-liner': true,
      },
    });
  });

  it('proves connected route air, exact fixture cadence, and both seams', () => {
    expect(report.routeAndFixtures).toMatchObject({
      routeAirCellCount: 5940,
      routeComponentCount: 1,
      routeLargestComponentCellCount: 5940,
      sourceRouteAirPassCount: 5940,
      postRouteAirPassCount: 5940,
      routeChangedCellCount: 0,
      fixtureCellCount: 49,
      maximumFixtureSpacingBlocks: 6,
      securityFrameCellCount: 18,
    });
    expect(report.preservation).toEqual({
      upstreamInteriorSeamCellCount: 20,
      upstreamInteriorSeamChangedCellCount: 0,
      downstreamR10aInteriorSeamCellCount: 20,
      downstreamR10aInteriorSeamChangedCellCount: 0,
      acceptedR10aTargetCellCount: 594,
      acceptedR10aTargetChangedCellCount: 0,
      acceptedR10aRouteAirCellCount: 660,
      acceptedR10aRouteChangedCellCount: 0,
      acceptedR10aFailClosedTerminusCellCount: 20,
      acceptedR10aFailClosedTerminusChangedCellCount: 0,
    });
  });

  it('finds exactly the declared target changes in the full halo', () => {
    expect(report.drift).toMatchObject({
      interactionHaloCellCount: 21528,
      changedCellCount: 5346,
      declaredTargetChangedCellCount: 5346,
      undeclaredChangedCellCount: 0,
      lifecycleTransitionCount: 0,
    });
    expect(report.entityAndBlockEntityPreservation).toEqual({
      sourceSnapshotBlockEntityCount: 0,
      sourceSnapshotSavedEntityCount: 0,
      postSnapshotBlockEntityCount: 0,
      postSnapshotSavedEntityCount: 0,
      wrapperBlockEntityClearance: 'PASS',
      wrapperLiveEntityClearance: 'PASS',
    });
  });

  it('accounts for complete-save lifecycle without widening block acceptance', () => {
    expect(report.completeSaveDiffAccounting).toMatchObject({
      requiredMemberCount: 130,
      unchangedMemberCount: 118,
      changedMemberCount: 12,
      targetRegionMemberIncluded: true,
      changedPoiMemberCount: 0,
      exactBlockDomainUndeclaredDifferenceCount: 0,
      completeSaveMemberChangesDoNotAuthorizeUndeclaredBlockMutation: true,
    });
  });

  it('seals all stages, journals, rollback order, and the uncommissioned boundary', () => {
    expect(report.executionEvidence).toMatchObject({
      wrapperStageCount: 24,
      wrapperPassedStageCount: 24,
      wrapperFailedStageCount: 0,
    });
    expect(report.operationalBoundary).toEqual({
      acceptedScope: 'source-proven B03 institutional contact-sequence liner and passive fixtures',
      routeVoidPreserved: true,
      secureOrPublicRouteCommissioned: false,
      accessControlMechanismCommissioned: false,
      activeSystemInstalled: false,
      exteriorOpeningCreated: false,
      liveCallsPerformedByQa: false,
      worldMutationsPerformedByQa: false,
    });
    expect(report.summary).toEqual({
      passed: true,
      checkCount: 14,
      passCount: 14,
      failCount: 0,
      exactTargetCellCount: 5346,
      routeAirCellCount: 5940,
      fixtureCellCount: 49,
      interactionHaloCellCount: 21528,
      undeclaredChangedCellCount: 0,
    });
  });
});
