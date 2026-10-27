import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r12c_b09_passive_rail_post_release.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r12c-live-20260822T004255Z',
);
const CANONICAL_JSON = path.join(EVIDENCE, 'r12c-post-release-qa.json');
const CANONICAL_MARKDOWN = path.join(EVIDENCE, 'r12c-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r12c-post-qa-'),
);
const temporaryJson = path.join(temporaryDirectory, 'r12c-post-release-qa.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'r12c-post-release-qa.md');

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
    isolationGaps: Record<string, number | string>;
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
    '--generated-at', '2026-08-22T00:50:00Z',
    '--out', temporaryJson,
    '--markdown', temporaryMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R12C passive B09 rail post-release QA', () => {
  it('regenerates both sealed reports byte-for-byte', () => {
    expect(fs.readFileSync(temporaryJson)).toEqual(fs.readFileSync(CANONICAL_JSON));
    expect(fs.readFileSync(temporaryMarkdown)).toEqual(fs.readFileSync(CANONICAL_MARKDOWN));
  });

  it('binds the exact completed ledger, manifest, source, post, and R10F predecessor', () => {
    expect(readQa()).toMatchObject({
      status: 'PASS_EXACT_PASSIVE_RAIL_TOPOLOGY_SUPPORT_ISOLATION_AND_ROLLBACK_PRESERVED',
      qaPayloadSha256:
        '145dc2e1a30081aa4be1e6fd7204fe6f09b5bbe6828e9dea77f3791fe6d47deb',
      ledger: {
        sha256: 'ed2e62dea837a8e6d2290752775f7f49444fe338f4aac6ca1bdec8b19f190db0',
      },
      manifest: {
        sha256: 'de097788b3f93bfb3ac0364e17fc07424801a8eb59cdd769758da9c9831e4a91',
      },
      acceptedPredecessor: {
        r10fCompletedReleaseIdentitySha256:
          '480473cb39bb923fa85b28d1141e6d5344fe3908fb71d9958daabf736c46e17b',
        sourceB09StateMatchesR10fPost: true,
      },
      sourceSnapshot: {
        completeSaveSha256:
          '36c79003a53923039945800835c7806fef61025f5f3daac9fdcab87e6ecad26a',
        regionSha256:
          '64e2ac0fc094820fdbbebf003ee0fc6eb2b26d6346b0e4aab23b5b75a0f45d36',
      },
      postSnapshot: {
        completeSaveSha256:
          '1c51b53415dc35060a4aefacaac8e7e8b3ca588a457c3c4ce28329e06f6fb02d',
        regionSha256:
          'd899d084dd13f27c10ff8cdd40ad509967a3ade5c927cd22bbfdcab44a9ab80d',
      },
      releaseIdentity: {
        completedReleaseIdentitySha256:
          '516755fa28b16d5d7d5b1baec7dd63e33be73276ed42d69b8f58bb75cba74480',
      },
    });
  });

  it('verifies all 231 exact rail states and deterministic topology', () => {
    expect(readQa().exactPostState).toMatchObject({
      targetCellCount: 231,
      targetCoordinateSetSha256:
        'd0ce28ec1df09ee872d9885bd65d858e8a39c1d4c377ca532bfafa481bd91b0f',
      desiredState: 'minecraft:rail[shape=east_west,waterlogged=false]',
      exactRailStatePassCount: 231,
      exactRailStateFailureCount: 0,
      topology: {
        componentCount: 1,
        largestComponentCellCount: 231,
        endpointCount: 2,
        interiorCellCount: 229,
        branchCellCount: 0,
        offTargetRailCellCountInHalo: 0,
        shapeUpdateMismatchCount: 0,
      },
    });
  });

  it('preserves supports, headroom, isolation gaps, caps, and aperture', () => {
    const qa = readQa();
    expect(qa.exactPostState.support).toMatchObject({
      cellCount: 231,
      sourceMatchCount: 231,
      postMatchCount: 231,
    });
    expect(qa.exactPostState.headroom).toMatchObject({
      cellCount: 231,
      sourceAirCount: 231,
      postAirCount: 231,
    });
    expect(qa.exactPostState.isolationGaps).toMatchObject({
      cellCount: 2,
      sourceAirCount: 2,
      postAirCount: 2,
    });
    expect(qa.preservation).toMatchObject({
      lowerB08CapCellCount: 12,
      summitZ11CapCellCount: 12,
      capSourceMatchCount: 24,
      capPostMatchCount: 24,
      curveApertureCellCount: 4,
      curveApertureSourceAirCount: 4,
      curveAperturePostAirCount: 4,
    });
  });

  it('accounts for every halo and accommodation difference without lifecycle drift', () => {
    expect(readQa().preservation).toMatchObject({
      interactionHaloCellCount: 2_097,
      haloDeclaredDifferenceCount: 231,
      haloLifecycleDifferenceCount: 0,
      haloUndeclaredDifferenceCount: 0,
      b09AccommodationCellCount: 7_800,
      sourceB09StateSetSha256:
        '41cc05ffb0474ca4d5c9f53d48ebc3c1a8629d1d8731752c57b7671932fb8e8b',
      postB09StateSetSha256:
        'f685ace53187d0c8614e6f3ec7df2ffb56fd130c32d720d48cc7b96d97ce587f',
      b09DeclaredDifferenceCount: 231,
      b09LifecycleDifferenceCount: 0,
      b09UndeclaredDifferenceCount: 0,
      preservedNonTargetB09CellCount: 7_569,
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
        strictForwardGroupPassCount: 231,
        failedGroupCount: 0,
        noOpCount: 0,
        unknownReplyCount: 0,
        worldEditLeftoverCount: 0,
        streamJournalEntryCount: 468,
        streamJournalSha256:
          '04c14c52776dc97a4812e4753c888f77df2d4b5ca064d4aaba1d93adf8b75042',
        streamJournalFinalStatus: 'complete',
        rollbackPoststatePassCount: 231,
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
      summary: { passed: true, checkCount: 18, passCount: 18, failCount: 0 },
    });
  });

  it('accepts passive material only and makes no commissioning overclaim', () => {
    expect(readQa().disposition).toMatchObject({
      passiveRailMaterialAsBuilt: true,
      lowerStationAndFirstCurveIsolationGapsPreserved: true,
      lowerAndSummitExternalCapsPreserved: true,
      stationOrCurveRailInstalled: false,
      platformBarrierDesignedOrInstalled: false,
      poweredRailDriveBrakeVehicleControlsPowerDrainageInstalled: false,
      funicularCommissioned: false,
      passengerOrRescueRouteCommissioned: false,
      liveCallsPerformedByQa: false,
      worldMutationsPerformedByQa: false,
    });
  });
});
