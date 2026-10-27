import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r10f_b09_curve_summit_passive_wayfinding_post_release.mjs',
);
const LEDGER =
  'data/world-review/combined-zones-r10f-live-20260822T003320Z/evidence-ledger.json';
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-r10f-post-qa-'));
const OUTPUT = path.join(temporaryDirectory, 'qa.json');
const MARKDOWN = path.join(temporaryDirectory, 'qa.md');

interface QaReport {
  status: string;
  qaPayloadSha256: string;
  ledger: { sha256: string };
  manifest: { sha256: string };
  sourceSnapshot: Record<string, string>;
  postSnapshot: Record<string, string>;
  releaseIdentity: Record<string, string>;
  exactPostState: Record<string, number | string | number[]>;
  preservation: Record<string, unknown>;
  completeSaveDiffAccounting: Record<string, unknown>;
  execution: Record<string, number | boolean | string>;
  evidence: Record<string, number | string>;
  disposition: Record<string, boolean | string>;
  summary: { checkCount: number; passCount: number; failCount: number; passed: boolean };
}

let report: QaReport;
let firstJson: Buffer;
let firstMarkdown: Buffer;

beforeAll(() => {
  const args = [
    SCRIPT,
    '--ledger', LEDGER,
    '--generated-at', '2026-08-22T00:45:00Z',
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

describe('CZ-R10F B09 curve/summit passive wayfinding post-release QA', () => {
  it('regenerates both QA artifacts byte-for-byte', () => {
    expect(fs.readFileSync(OUTPUT)).toEqual(firstJson);
    expect(fs.readFileSync(MARKDOWN)).toEqual(firstMarkdown);
  });

  it('binds the completed ledger, frozen manifest, and immutable snapshots', () => {
    expect(report).toMatchObject({
      status:
        'PASS_EXACT_CURVE_SUMMIT_WAYFINDING_COMPLETE_ROUTE_CAPS_AND_PRIOR_FIXTURES_PRESERVED',
      qaPayloadSha256:
        'c8e5a92f8f4820eca27ac3343d2e2b53c6c3a8e005f150075a1f5908c2774b51',
      ledger: {
        sha256: 'ff406dc599979d497ed4fb6f4c783f0b4a2dd6bf4689f9d9e7b8dc8f65bcc903',
      },
      manifest: {
        sha256: '26655abd984d90b4d31c513fceecd2987cae7c70b68df3ef30e6d3d59aff741f',
      },
      sourceSnapshot: {
        completeSaveSha256:
          'b9347e6790d14541f7b8705955382f91445db58cd81109dd9c78d09d719914f4',
        regionSha256:
          '10aa3bfe714a59564cb4791ab1bfd48d01d5fa2338852ab98731d159cb6799db',
      },
      postSnapshot: {
        completeSaveSha256:
          '04007781f1a59beb3889b91210536180fe7b4aa69e68e455c873b4def901a8c2',
        regionSha256:
          '811328bde5cdff2e1140b49971236c4707b99a8a27eb8b4684696d1dce479725',
      },
      releaseIdentity: {
        sourceBoundReleaseIdentitySha256:
          'a2488ab9923ae51a4bf1c6d53c1662025fa8640d102f356cb4f4a6efba3b6d48',
        completedReleaseIdentitySha256:
          '480473cb39bb923fa85b28d1141e6d5344fe3908fb71d9958daabf736c46e17b',
      },
    });
  });

  it('proves all nineteen fixtures and the complete accepted cadence', () => {
    expect(report.exactPostState).toEqual({
      targetCellCount: 19,
      targetCoordinateSetSha256:
        'aff71953450823749a57f808f119ef333712418eb5be1755066c7bc643df61e4',
      exactTransitionPassCount: 19,
      exactTransitionFailureCount: 0,
      desiredState: 'minecraft:sea_lantern',
      fixtureCenterlineIndices: [
        255, 271, 287, 303, 319, 335, 351, 367, 383, 399,
        415, 431, 447, 463, 479, 495, 511, 527, 543,
      ],
      maximumCompleteRouteIndexDistanceToAcceptedFixture: 8,
      maximumNewFixtureSpacingInIndices: 16,
    });
  });

  it('preserves the connected route, exact boundaries, both caps, prior fixtures, and halo', () => {
    expect(report.preservation).toMatchObject({
      segmentRouteCellCount: 622,
      postSegmentRouteAirPassCount: 622,
      completeRouteCellCount: 1116,
      completeRouteComponentCount: 1,
      completeRouteLargestComponentCellCount: 1116,
      postCompleteRouteAirPassCount: 1116,
      segmentBoundaryCellCount: 1866,
      postSegmentBoundaryStateCensus: {
        'minecraft:air': 3,
        'minecraft:polished_diorite': 1844,
        'minecraft:sea_lantern': 19,
      },
      segmentBoundaryDeclaredDifferenceCount: 19,
      segmentBoundaryUndeclaredDifferenceCount: 0,
      completeBoundaryCellCount: 3346,
      postCompleteBoundaryStateCensus: {
        'minecraft:polished_diorite': 3307,
        'minecraft:sea_lantern': 39,
      },
      completeBoundaryDeclaredDifferenceCount: 19,
      completeBoundaryUndeclaredDifferenceCount: 0,
      retainedB08WestCapCellCount: 12,
      retainedSummitExternalCapCellCount: 12,
      r10cFixturePreservedCount: 3,
      r10dFixturePreservedCount: 2,
      r10eFixturePreservedCount: 15,
      priorFixturePreservedCount: 20,
      haloCellCount: 133,
      haloDeclaredDifferenceCount: 19,
      haloUndeclaredDifferenceCount: 0,
    });
  });

  it('finds exactly nineteen declared B09 differences and no drift', () => {
    expect(report.preservation).toMatchObject({
      b09AccommodationCellCount: 7800,
      sourceB09StateSetSha256:
        'c35c3de3dcfa24e3f588749aef0f8bfa09e26d6e9235a0a93c1b36afb5a4deef',
      postB09StateSetSha256:
        '41cc05ffb0474ca4d5c9f53d48ebc3c1a8629d1d8731752c57b7671932fb8e8b',
      declaredB09DifferenceCount: 19,
      undeclaredB09DifferenceCount: 0,
      preservedNonTargetB09CellCount: 7781,
      b08ExternalInterfaceOpened: false,
      summitExternalInterfaceOpened: false,
    });
  });

  it('accounts for the bounded complete-save member lifecycle exactly', () => {
    expect(report.completeSaveDiffAccounting).toMatchObject({
      requiredMemberCount: 130,
      unchangedMemberCount: 117,
      changedMemberCount: 13,
      targetRegionMember: 'region/r.4.-2.mca',
      targetRegionMemberIncluded: true,
      nonTargetSaveLifecycleMemberCount: 12,
      changedPoiMemberCount: 0,
      completeSaveMemberChangesDoNotAuthorizeUndeclaredBlockMutation: true,
      exactB09BlockDomainUndeclaredDifferenceCount: 0,
    });
    expect(report.completeSaveDiffAccounting.changedMemberPaths).toEqual([
      'entities/r.-1.-1.mca', 'entities/r.-1.-2.mca', 'entities/r.-1.0.mca',
      'entities/r.0.-1.mca', 'entities/r.0.-2.mca', 'entities/r.0.0.mca',
      'entities/r.4.-2.mca', 'level.dat', 'region/r.-1.-1.mca',
      'region/r.-1.0.mca', 'region/r.0.-1.mca', 'region/r.3.-2.mca',
      'region/r.4.-2.mca',
    ]);
  });

  it('seals the wrapper, journal, evidence, and exact rollback', () => {
    expect(report.execution).toEqual({
      strictForwardGroupPassCount: 19,
      failedGroupCount: 0,
      noOpCount: 0,
      unknownReplyCount: 0,
      worldEditLeftoverCount: 0,
      streamJournalEntryCount: 44,
      streamJournalSha256:
        '26a4ad8d632255a25bf153096da51b0badeb2888f9842b5d35723e768c82e129',
      streamJournalFinalStatus: 'complete',
      rollbackPoststatePassCount: 19,
      rollbackPoststateFailCount: 0,
      exactReverseOrderInverse: true,
      allTemporaryChunksReleased: true,
    });
    expect(report.evidence).toMatchObject({
      requiredStageCount: 17,
      requiredStagePassCount: 17,
      evidenceBindingCount: 17,
      evidenceBindingFailureCount: 0,
      manifestQa: 'PASS',
      blockEntityClearance: 'PASS',
      liveEntityClearance: 'PASS',
      sameMomentEntityClearance: 'PASS',
    });
  });

  it('accepts passive visual wayfinding only and no commissioned system', () => {
    expect(report.disposition).toEqual({
      acceptedScope:
        'nineteen full-cube passive B09 curve/summit ceiling wayfinding fixtures only',
      completeConnectedRouteAndBoundaryPreserved: true,
      bothExternalCapsRemainFailClosed: true,
      priorR10cR10dR10eFixturesPreserved: true,
      photometricEmergencyOrLifeSafetyLightingCommissioned: false,
      railDriveBrakeVehicleControlsPowerDrainageRemainDeferred: true,
      funicularCommissioned: false,
      pedestrianRouteCommissioned: false,
      liveCallsPerformedByQa: false,
      worldMutationsPerformedByQa: false,
    });
    expect(report.summary).toEqual({
      checkCount: 16,
      passCount: 16,
      failCount: 0,
      passed: true,
    });
    expect(fs.readFileSync(MARKDOWN, 'utf8')).toContain('All 17 wrapper stages');
  });
});
