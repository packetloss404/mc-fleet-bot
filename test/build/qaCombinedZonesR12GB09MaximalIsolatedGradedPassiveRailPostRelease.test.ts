import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r12g_b09_maximal_isolated_graded_passive_rail_post_release.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r12g-live-20260822T020641Z',
);
const CANONICAL_JSON = path.join(EVIDENCE, 'r12g-post-release-qa.json');
const CANONICAL_MARKDOWN = path.join(EVIDENCE, 'r12g-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r12g-post-qa-'),
);
const temporaryJson = path.join(temporaryDirectory, 'r12g-post-release-qa.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'r12g-post-release-qa.md');

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
    '--generated-at', '2026-08-22T02:20:00Z',
    '--out', temporaryJson,
    '--markdown', temporaryMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R12G passive B09 isolated graded rail post-release QA', () => {
  it('regenerates both sealed reports byte-for-byte', () => {
    expect(fs.readFileSync(temporaryJson)).toEqual(fs.readFileSync(CANONICAL_JSON));
    expect(fs.readFileSync(temporaryMarkdown)).toEqual(fs.readFileSync(CANONICAL_MARKDOWN));
  });

  it('binds the exact completed ledger, manifest, source, post, R12F, and runtime proof', () => {
    expect(readQa()).toMatchObject({
      status:
        'PASS_EXACT_ISOLATED_GRADED_RAIL_TOPOLOGY_ISOLATION_AND_ROLLBACK_PRESERVED',
      qaPayloadSha256:
        '64eeb69bd5b5af6bf0fd89d8e0d1fd6b4d11b808d218628f4cadb958eb10b53e',
      ledger: {
        sha256: '536c4a23d7f2f3dc91a446183026c162ed48bff1c3a13b3fcc23a88638bfbe9a',
      },
      manifest: {
        sha256: 'e75d6ee3f31bfb483f88bc84ec10637cb09cfe115a443993cec204c517b27b59',
      },
      acceptedPredecessor: {
        r12fCompletedReleaseIdentitySha256:
          '2c9a54aaad0bfd742705ed1015b781db3b0aa7d56a86e6c57ee348c6e9f29f28',
        sourceB09StateMatchesR12fPost: true,
      },
      runtimeProof: {
        proofPayloadSha256:
          '1590009333d22172fa3d0db724b793522a0c6c340c6b0ee997497db1ad45b42d',
        exactProductionPaperVersion: '1.21.11-69-main@94d0c97',
        forwardStatePassCount: 4,
        rollbackAirPassCount: 4,
        productionMutationPerformed: false,
      },
      sourceSnapshot: {
        completeSaveSha256:
          '0b999e6d2f32c16d94d32fca8c39473da83634978052611dbd884bc1da9e8cb8',
        regionSha256:
          '1342a7912d077011e43b559192c34e5471169b8dad0c38a8cda55b8082439427',
      },
      postSnapshot: {
        completeSaveSha256:
          'e9674310deb7b7ef41d21b1e8c2cb8597c013c777e3581428de3e0be5aa44141',
        regionSha256:
          'e3a09c6500d89bfa700a55b83f0cad312b2647d8a826ea1d6f650dc045191ce9',
      },
      releaseIdentity: {
        completedReleaseIdentitySha256:
          'd553db34ab30a5a03dc290b72c75df7266748de6ceae66bf8596cc652ab1d160',
      },
    });
  });

  it('verifies all four exact graded rail states and topology', () => {
    expect(readQa().exactPostState).toMatchObject({
      targetCellCount: 4,
      targetCoordinateSetSha256:
        'bb5739a71b664cbe90e166dfcb7d531e18f54138c6965bf0208ec0e79319350d',
      exactRailStatePassCount: 4,
      exactRailStateFailureCount: 0,
      topology: {
        componentCount: 1,
        largestComponentCellCount: 4,
        endpointCount: 2,
        interiorCellCount: 2,
        branchCellCount: 0,
        shapeUpdateMismatchCount: 0,
        railNeighbourAdjacencyToPriorRailCount: 0,
      },
    });
  });

  it('preserves supports, headroom, gaps, prior rails, and caps', () => {
    const qa = readQa();
    expect(qa.exactPostState.support).toMatchObject({
      cellCount: 4,
      sourceMatchCount: 4,
      postMatchCount: 4,
    });
    expect(qa.exactPostState.headroom).toMatchObject({
      cellCount: 4,
      sourceAirCount: 4,
      postAirCount: 4,
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
      r12fRailCellCount: 3,
      r12fRailSourceMatchCount: 3,
      r12fRailPostMatchCount: 3,
      lowerB08CapCellCount: 12,
      summitZ11CapCellCount: 12,
      capSourceMatchCount: 24,
      capPostMatchCount: 24,
    });
  });

  it('accounts for every halo/B09 difference and exact rail-shape census', () => {
    expect(readQa().preservation).toMatchObject({
      interactionHaloCellCount: 72,
      haloDeclaredDifferenceCount: 4,
      haloLifecycleDifferenceCount: 0,
      haloUndeclaredDifferenceCount: 0,
      b09AccommodationCellCount: 7_800,
      sourceB09StateSetSha256:
        '5cac855d633287c103593f0d3131c89ec08bf807cc7bafa0f33ea7fed2a46467',
      postB09StateSetSha256:
        '545d72fbf144c66d815895034b587e4ce736c6bb28fc27eaa5fa2939de927e94',
      b09DeclaredDifferenceCount: 4,
      b09LifecycleDifferenceCount: 0,
      b09UndeclaredDifferenceCount: 0,
      preservedNonTargetB09CellCount: 7_796,
      totalExpectedRailCellCount: 337,
      offTargetOrShapeMismatchRailCount: 0,
      postB09StateCensus: {
        'minecraft:rail[shape=ascending_west,waterlogged=false]': 5,
        'minecraft:rail[shape=east_west,waterlogged=false]': 313,
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
        strictForwardGroupPassCount: 4,
        failedGroupCount: 0,
        noOpCount: 0,
        unknownReplyCount: 0,
        worldEditLeftoverCount: 0,
        streamJournalEntryCount: 14,
        streamJournalSha256:
          'f998d1e91b5e9a900b8ebd75dd2c50c3b84dbd7c21ac714c0659f4807dc1f28e',
        streamJournalFinalStatus: 'complete',
        rollbackPoststatePassCount: 4,
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
      exactFourCellSlopeRailInstalled: true,
      platformBarrierDesignedOrInstalled: false,
      poweredRailDriveBrakeVehicleControlsPowerDrainageInstalled: false,
      funicularCommissioned: false,
      passengerOrRescueRouteCommissioned: false,
      liveCallsPerformedByQa: false,
      worldMutationsPerformedByQa: false,
    });
  });
});
