import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r12f_b09_isolated_graded_passive_rail_post_release.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r12f-live-20260822T014754Z',
);
const CANONICAL_JSON = path.join(EVIDENCE, 'r12f-post-release-qa.json');
const CANONICAL_MARKDOWN = path.join(EVIDENCE, 'r12f-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r12f-post-qa-'),
);
const temporaryJson = path.join(temporaryDirectory, 'r12f-post-release-qa.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'r12f-post-release-qa.md');

interface PostQa {
  status: string;
  qaPayloadSha256: string;
  ledger: { sha256: string };
  manifest: { sha256: string };
  acceptedPredecessor: Record<string, string | boolean | object>;
  runtimeProof: Record<string, string | number | boolean | object>;
  sourceSnapshot: { completeSaveSha256: string; regionSha256: string };
  postSnapshot: { completeSaveSha256: string; regionSha256: string };
  releaseIdentity: { completedReleaseIdentitySha256: string };
  exactPostState: {
    targetCellCount: number;
    targetCoordinateSetSha256: string;
    desiredStatesByForwardOrder: object[];
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
    '--generated-at', '2026-08-22T01:30:00Z',
    '--out', temporaryJson,
    '--markdown', temporaryMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R12F passive B09 isolated graded rail post-release QA', () => {
  it('regenerates both sealed reports byte-for-byte', () => {
    expect(fs.readFileSync(temporaryJson)).toEqual(fs.readFileSync(CANONICAL_JSON));
    expect(fs.readFileSync(temporaryMarkdown)).toEqual(fs.readFileSync(CANONICAL_MARKDOWN));
  });

  it('binds the exact completed ledger, manifest, source, post, R12E, and runtime proof', () => {
    expect(readQa()).toMatchObject({
      status:
        'PASS_EXACT_ISOLATED_GRADED_RAIL_TOPOLOGY_ISOLATION_AND_ROLLBACK_PRESERVED',
      qaPayloadSha256:
        '67427f0f7e0f0cc08829575a128793ea39cf1adb09a9eb0316c7664953449fb8',
      ledger: {
        sha256: 'd918f8bd5eb35ff3dda8655969edb82be503f17bad657592deab5edaeb157864',
      },
      manifest: {
        sha256: 'cdfa0bacc4537e59970e15f59774f0bee2ddccc959a87f8fa1299c849b0fc9c5',
      },
      acceptedPredecessor: {
        r12eCompletedReleaseIdentitySha256:
          '552ac3c9580c80b248625d6f26676fd491a110ccf707b488b507dea6a1434c9b',
        sourceB09StateMatchesR12ePost: true,
      },
      runtimeProof: {
        proofPayloadSha256:
          '9f734939a5217d5bc5bc0616f3dbd78f0ac75275bcc5fd11f16ff35dd696f8be',
        exactProductionPaperVersion: '1.21.11-69-main@94d0c97',
        forwardStatePassCount: 3,
        rollbackAirPassCount: 3,
        productionMutationPerformed: false,
      },
      sourceSnapshot: {
        completeSaveSha256:
          '3293348adee3f4ca8e15acdfd66bff1a95e8253166d5b9d9fe683bba71d53619',
        regionSha256:
          '1264520fbb2ab26521f8d0b53e2e83fd1b621d019f40fcde1a3297dadc179f92',
      },
      postSnapshot: {
        completeSaveSha256:
          '8a1350c3a12898d983c6825c6912de383407e97f7b8735172cb1775a409f9b49',
        regionSha256:
          '500d8151ec8dff15bd18434cbf4c68fa88756247ff87f264b5acd60f5f334e11',
      },
      releaseIdentity: {
        completedReleaseIdentitySha256:
          '2c9a54aaad0bfd742705ed1015b781db3b0aa7d56a86e6c57ee348c6e9f29f28',
      },
    });
  });

  it('verifies all three exact graded rail states and topology', () => {
    expect(readQa().exactPostState).toMatchObject({
      targetCellCount: 3,
      targetCoordinateSetSha256:
        '4ef1dd45742537a3300286c1bc3742600626540ec2327bb46a0e6149568cb973',
      exactRailStatePassCount: 3,
      exactRailStateFailureCount: 0,
      topology: {
        componentCount: 1,
        largestComponentCellCount: 3,
        endpointCount: 2,
        interiorCellCount: 1,
        branchCellCount: 0,
        shapeUpdateMismatchCount: 0,
        railNeighbourAdjacencyToPriorRailCount: 0,
      },
    });
  });

  it('preserves supports, headroom, gaps, prior rails, and caps', () => {
    const qa = readQa();
    expect(qa.exactPostState.support).toMatchObject({
      cellCount: 3,
      sourceMatchCount: 3,
      postMatchCount: 3,
    });
    expect(qa.exactPostState.headroom).toMatchObject({
      cellCount: 3,
      sourceAirCount: 3,
      postAirCount: 3,
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
      r12dRailCellCount: 19,
      r12dRailSourceMatchCount: 19,
      r12dRailPostMatchCount: 19,
      r12eRailCellCount: 80,
      r12eRailSourceMatchCount: 80,
      r12eRailPostMatchCount: 80,
      lowerB08CapCellCount: 12,
      summitZ11CapCellCount: 12,
      capSourceMatchCount: 24,
      capPostMatchCount: 24,
    });
  });

  it('accounts for every halo/B09 difference and exact rail-shape census', () => {
    expect(readQa().preservation).toMatchObject({
      interactionHaloCellCount: 57,
      haloDeclaredDifferenceCount: 3,
      haloLifecycleDifferenceCount: 0,
      haloUndeclaredDifferenceCount: 0,
      b09AccommodationCellCount: 7_800,
      sourceB09StateSetSha256:
        'f775a927bded347e269b132a3e608798a93b803ee326d44be4cebb72e9d44776',
      postB09StateSetSha256:
        '5cac855d633287c103593f0d3131c89ec08bf807cc7bafa0f33ea7fed2a46467',
      b09DeclaredDifferenceCount: 3,
      b09LifecycleDifferenceCount: 0,
      b09UndeclaredDifferenceCount: 0,
      preservedNonTargetB09CellCount: 7_797,
      totalExpectedRailCellCount: 333,
      offTargetOrShapeMismatchRailCount: 0,
      postB09StateCensus: {
        'minecraft:rail[shape=ascending_west,waterlogged=false]': 2,
        'minecraft:rail[shape=east_west,waterlogged=false]': 312,
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
        strictForwardGroupPassCount: 3,
        failedGroupCount: 0,
        noOpCount: 0,
        unknownReplyCount: 0,
        worldEditLeftoverCount: 0,
        streamJournalEntryCount: 12,
        streamJournalSha256:
          '11f393e48299628de2eb74234b213b41fff1e6980e0b1df7abbf44b906477459',
        streamJournalFinalStatus: 'complete',
        rollbackPoststatePassCount: 3,
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
      summary: { passed: true, checkCount: 21, passCount: 21, failCount: 0 },
    });
  });

  it('accepts isolated passive material only and makes no commissioning overclaim', () => {
    expect(readQa().disposition).toMatchObject({
      passiveRailMaterialAsBuilt: true,
      hairpinTurnAndUpperIsolationGapsRemainAir: true,
      priorRailConnectionCreated: false,
      turnRailInstalled: false,
      exactThreeCellSlopeRailInstalled: true,
      platformBarrierDesignedOrInstalled: false,
      poweredRailDriveBrakeVehicleControlsPowerDrainageInstalled: false,
      funicularCommissioned: false,
      passengerOrRescueRouteCommissioned: false,
      liveCallsPerformedByQa: false,
      worldMutationsPerformedByQa: false,
    });
  });
});
