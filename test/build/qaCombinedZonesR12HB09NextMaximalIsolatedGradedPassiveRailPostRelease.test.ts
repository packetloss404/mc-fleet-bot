import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r12h_b09_next_maximal_isolated_graded_passive_rail_post_release.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r12h-live-20260822T022403Z',
);
const CANONICAL_JSON = path.join(EVIDENCE, 'r12h-post-release-qa.json');
const CANONICAL_MARKDOWN = path.join(EVIDENCE, 'r12h-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r12h-post-qa-'),
);
const temporaryJson = path.join(temporaryDirectory, 'r12h-post-release-qa.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'r12h-post-release-qa.md');

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
    '--generated-at', '2026-08-22T02:35:00Z',
    '--out', temporaryJson,
    '--markdown', temporaryMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R12H passive B09 next maximal isolated graded rail post-release QA', () => {
  it('regenerates both sealed reports byte-for-byte', () => {
    expect(fs.readFileSync(temporaryJson)).toEqual(fs.readFileSync(CANONICAL_JSON));
    expect(fs.readFileSync(temporaryMarkdown)).toEqual(fs.readFileSync(CANONICAL_MARKDOWN));
  });

  it('binds the exact completed ledger, manifest, source, post, R12G, and runtime proof', () => {
    expect(readQa()).toMatchObject({
      status:
        'PASS_EXACT_ISOLATED_GRADED_RAIL_TOPOLOGY_ISOLATION_AND_ROLLBACK_PRESERVED',
      qaPayloadSha256:
        '30e194abdafae329da025ddf6d66d336fe7ab68318a14b7de176dc73154ff963',
      ledger: {
        sha256: 'acce456892d798420531dd80fd1f7a89939173590c2d509f9887a6e0d33c09ce',
      },
      manifest: {
        sha256: '0e5f01f2e13c6d3659ada3af7bd8f86edc7edea07d68bb04b3686d68bba445c4',
      },
      acceptedPredecessor: {
        r12gCompletedReleaseIdentitySha256:
          'd553db34ab30a5a03dc290b72c75df7266748de6ceae66bf8596cc652ab1d160',
        sourceB09StateMatchesR12gPost: true,
      },
      runtimeProof: {
        proofPayloadSha256:
          'e2bf30863292c6705526f21b61ee02ecb55ba7fe8a487a4ad1b06fa29dc0c2fe',
        exactProductionPaperVersion: '1.21.11-69-main@94d0c97',
        forwardStatePassCount: 4,
        rollbackAirPassCount: 4,
        productionMutationPerformed: false,
      },
      sourceSnapshot: {
        completeSaveSha256:
          'bebc3a43d21882fe1222d3a42372bdb4d993b694c9c3a2389c269d0b3be0b380',
        regionSha256:
          'ea43727404368957dd16fd7eb743aa84ad2ecef3f640e9ee04c91a7f5027cb03',
      },
      postSnapshot: {
        completeSaveSha256:
          '8dbd2e6c75c20e5c580b3e338ca970aad0307b417e0691c0f186f46c97be7b41',
        regionSha256:
          '51ca4a63132fdeca060485f36991add4a8012a748154c4136c69db2ac919651d',
      },
      releaseIdentity: {
        completedReleaseIdentitySha256:
          'a7be316c903bdfb71934d0e543b4cb875f3eef4fbe15fbe1a090b4c456ac8d92',
      },
    });
  });

  it('verifies all four exact graded rail states and topology', () => {
    expect(readQa().exactPostState).toMatchObject({
      targetCellCount: 4,
      targetCoordinateSetSha256:
        '7e0c109ad5a16196ec13f7d7b9fb98b35dee4c4c5085e623da8e64b327b14ead',
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
      r12gRailCellCount: 4,
      r12gRailSourceMatchCount: 4,
      r12gRailPostMatchCount: 4,
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
        '545d72fbf144c66d815895034b587e4ce736c6bb28fc27eaa5fa2939de927e94',
      postB09StateSetSha256:
        '6b4019fb60e0f81d8ab47b469621e3abade4491de6e5e3b34588a40f99ce59b7',
      b09DeclaredDifferenceCount: 4,
      b09LifecycleDifferenceCount: 0,
      b09UndeclaredDifferenceCount: 0,
      preservedNonTargetB09CellCount: 7_796,
      totalExpectedRailCellCount: 341,
      offTargetOrShapeMismatchRailCount: 0,
      postB09StateCensus: {
        'minecraft:rail[shape=ascending_west,waterlogged=false]': 8,
        'minecraft:rail[shape=east_west,waterlogged=false]': 314,
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
          '1030f87505782c83a406126517920fd9e8c9c527ea292d2206ab727deeb18b88',
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
