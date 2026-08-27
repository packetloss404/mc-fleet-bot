import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r12d_b09_hairpin_cardinal_passive_rail_post_release.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r12d-live-20260822T005835Z',
);
const CANONICAL_JSON = path.join(EVIDENCE, 'r12d-post-release-qa.json');
const CANONICAL_MARKDOWN = path.join(EVIDENCE, 'r12d-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r12d-post-qa-'),
);
const temporaryJson = path.join(temporaryDirectory, 'r12d-post-release-qa.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'r12d-post-release-qa.md');

interface PostQa {
  status: string;
  qaPayloadSha256: string;
  ledger: { sha256: string };
  manifest: { sha256: string };
  acceptedPredecessor: Record<string, string | boolean | object>;
  sourceSnapshot: { completeSaveSha256: string; regionSha256: string };
  postSnapshot: { completeSaveSha256: string; regionSha256: string };
  releaseIdentity: { completedReleaseIdentitySha256: string };
  exactPostState: {
    targetCellCount: number;
    targetCoordinateSetSha256: string;
    desiredState: string;
    exactRailStatePassCount: number;
    exactRailStateFailureCount: number;
    topology: Record<string, number>;
    support: Record<string, number | string>;
    headroom: Record<string, number | string>;
    isolationTurnGaps: Record<string, number | string>;
  };
  preservation: Record<string, number | string | Record<string, number>>;
  hazardsAndEntities: Record<string, number | string>;
  execution: Record<string, number | string | boolean>;
  evidence: Record<string, number | string>;
  disposition: Record<string, boolean | string>;
  summary: { passed: boolean; checkCount: number; passCount: number; failCount: number };
}

function readQa(): PostQa {
  return JSON.parse(fs.readFileSync(CANONICAL_JSON, 'utf8')) as PostQa;
}

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--generated-at', '2026-08-22T01:05:00Z',
    '--out', temporaryJson,
    '--markdown', temporaryMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R12D passive B09 hairpin cardinal rail post-release QA', () => {
  it('regenerates both sealed reports byte-for-byte', () => {
    expect(fs.readFileSync(temporaryJson)).toEqual(fs.readFileSync(CANONICAL_JSON));
    expect(fs.readFileSync(temporaryMarkdown)).toEqual(fs.readFileSync(CANONICAL_MARKDOWN));
  });

  it('binds the exact completed ledger, manifest, source, post, and R12C predecessor', () => {
    expect(readQa()).toMatchObject({
      status:
        'PASS_EXACT_HAIRPIN_CARDINAL_RAIL_TOPOLOGY_ISOLATION_AND_ROLLBACK_PRESERVED',
      qaPayloadSha256:
        '56aceba3fa84b1a6508398daf2a34269aee2a992e3fc205dbc0306ad73ac1a4a',
      ledger: {
        sha256: '4aae15af18c8d895832808ad6d3062349cc33742b05d386cef0d2a5b9a158b12',
      },
      manifest: {
        sha256: 'bba29822282eb5de5276f86f5a11f01a4a8018b288d73a3955f36f089eff0af1',
      },
      acceptedPredecessor: {
        r12cCompletedReleaseIdentitySha256:
          '516755fa28b16d5d7d5b1baec7dd63e33be73276ed42d69b8f58bb75cba74480',
        sourceB09StateMatchesR12cPost: true,
      },
      sourceSnapshot: {
        completeSaveSha256:
          'd8cb93ae18190e7db3ac7923c75d8efcbacacec851a71826cb33a8d946c1028f',
        regionSha256:
          'd6cff082cf612fb0a2fa6fa6e92fdafdd1153b5918bb561c7127efd6a43ab834',
      },
      postSnapshot: {
        completeSaveSha256:
          '87966eef0a9e3ca695820f521ca2311c01ad7d6b199ee6ef57c6201cc97ee804',
        regionSha256:
          '28ccb2dd338522e98e2a734d91670c3eb5f52a1adfc695584ba3286f6d8a90f6',
      },
      releaseIdentity: {
        completedReleaseIdentitySha256:
          '97ff44527f857241316f425e563f639bea1c96b52b9b839f1e77089a04b225b2',
      },
    });
  });

  it('verifies all 19 exact north-south rail states and topology', () => {
    expect(readQa().exactPostState).toMatchObject({
      targetCellCount: 19,
      targetCoordinateSetSha256:
        'd34c55e58763b4e6666edd4a973769e5e468ee185f7ef044334670ffcff41754',
      desiredState: 'minecraft:rail[shape=north_south,waterlogged=false]',
      exactRailStatePassCount: 19,
      exactRailStateFailureCount: 0,
      topology: {
        componentCount: 1,
        largestComponentCellCount: 19,
        endpointCount: 2,
        interiorCellCount: 17,
        branchCellCount: 0,
        shapeUpdateMismatchCount: 0,
        cardinalAdjacencyToR12cCount: 0,
      },
    });
  });

  it('preserves supports, headroom, turn gaps, R12C rails, caps, and aperture boundary', () => {
    const qa = readQa();
    expect(qa.exactPostState.support).toMatchObject({
      cellCount: 19,
      sourceMatchCount: 19,
      postMatchCount: 19,
    });
    expect(qa.exactPostState.headroom).toMatchObject({
      cellCount: 19,
      sourceAirCount: 19,
      postAirCount: 19,
    });
    expect(qa.exactPostState.isolationTurnGaps).toMatchObject({
      cellCount: 2,
      sourceAirCount: 2,
      postAirCount: 2,
    });
    expect(qa.preservation).toMatchObject({
      r12cRailCellCount: 231,
      r12cRailSourceMatchCount: 231,
      r12cRailPostMatchCount: 231,
      lowerB08CapCellCount: 12,
      summitZ11CapCellCount: 12,
      capSourceMatchCount: 24,
      capPostMatchCount: 24,
      curveApertureCellCount: 4,
      curveApertureSourceAirCount: 4,
      curveAperturePostAirCount: 3,
      curveApertureOwnedRailCount: 1,
    });
  });

  it('accounts for every halo/B09 difference and exact rail-shape census', () => {
    expect(readQa().preservation).toMatchObject({
      interactionHaloCellCount: 189,
      haloDeclaredDifferenceCount: 19,
      haloLifecycleDifferenceCount: 0,
      haloUndeclaredDifferenceCount: 0,
      b09AccommodationCellCount: 7_800,
      sourceB09StateSetSha256:
        'f685ace53187d0c8614e6f3ec7df2ffb56fd130c32d720d48cc7b96d97ce587f',
      postB09StateSetSha256:
        '84c25bde1ce5d62bb2647f4d8cf087b4c6caa44ab02d43efebf1dc2f72765bc4',
      b09DeclaredDifferenceCount: 19,
      b09LifecycleDifferenceCount: 0,
      b09UndeclaredDifferenceCount: 0,
      preservedNonTargetB09CellCount: 7_781,
      totalExpectedRailCellCount: 250,
      offTargetOrShapeMismatchRailCount: 0,
      postB09StateCensus: {
        'minecraft:rail[shape=east_west,waterlogged=false]': 231,
        'minecraft:rail[shape=north_south,waterlogged=false]': 19,
      },
    });
  });

  it('verifies clean hazards/entities, execution, journal, stages, and inverse', () => {
    expect(readQa()).toMatchObject({
      hazardsAndEntities: {
        postFluidCount: 0,
        postGravityCount: 0,
        postContainerOrControlCount: 0,
        postUndeclaredMechanismCount: 0,
        sourceBlockEntityIntersectionCount: 0,
        postBlockEntityIntersectionCount: 0,
        sourceSavedEntityIntersectionCount: 0,
        postSavedEntityIntersectionCount: 0,
        wrapperBlockEntityClearance: 'PASS',
        wrapperLiveEntityClearance: 'PASS',
        wrapperSameMomentEntityClearance: 'PASS',
      },
      execution: {
        strictForwardGroupPassCount: 19,
        failedGroupCount: 0,
        noOpCount: 0,
        unknownReplyCount: 0,
        worldEditLeftoverCount: 0,
        streamJournalEntryCount: 44,
        streamJournalSha256:
          'b181ce419fbd6fb88eac3fe020e1f03e7fc6867d65ff715bfd7995737329b4eb',
        streamJournalFinalStatus: 'complete',
        rollbackPoststatePassCount: 19,
        rollbackPoststateFailCount: 0,
        exactReverseOrderInverse: true,
        allTemporaryChunksReleased: true,
        finalForceLoadSetRestored: true,
      },
      evidence: {
        requiredStageCount: 17,
        requiredStagePassCount: 17,
        evidenceBindingCount: 17,
        evidenceBindingFailureCount: 0,
      },
      summary: { passed: true, checkCount: 20, passCount: 20, failCount: 0 },
    });
  });

  it('accepts isolated passive material only and makes no commissioning overclaim', () => {
    expect(readQa().disposition).toMatchObject({
      passiveRailMaterialAsBuilt: true,
      bothActualTurnCellsRemainAir: true,
      r12cCardinalConnectionCreated: false,
      curveOrSlopeRailInstalled: false,
      platformBarrierDesignedOrInstalled: false,
      poweredRailDriveBrakeVehicleControlsPowerDrainageInstalled: false,
      funicularCommissioned: false,
      passengerOrRescueRouteCommissioned: false,
      liveCallsPerformedByQa: false,
      worldMutationsPerformedByQa: false,
    });
  });
});
