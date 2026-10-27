import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r12e_b09_upper_level_cardinal_passive_rail_post_release.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r12e-live-20260822T011943Z',
);
const CANONICAL_JSON = path.join(EVIDENCE, 'r12e-post-release-qa.json');
const CANONICAL_MARKDOWN = path.join(EVIDENCE, 'r12e-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r12e-post-qa-'),
);
const temporaryJson = path.join(temporaryDirectory, 'r12e-post-release-qa.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'r12e-post-release-qa.md');

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
    '--generated-at', '2026-08-22T01:30:00Z',
    '--out', temporaryJson,
    '--markdown', temporaryMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R12E passive B09 upper-level cardinal rail post-release QA', () => {
  it('regenerates both sealed reports byte-for-byte', () => {
    expect(fs.readFileSync(temporaryJson)).toEqual(fs.readFileSync(CANONICAL_JSON));
    expect(fs.readFileSync(temporaryMarkdown)).toEqual(fs.readFileSync(CANONICAL_MARKDOWN));
  });

  it('binds the exact completed ledger, manifest, source, post, and R12D predecessor', () => {
    expect(readQa()).toMatchObject({
      status:
        'PASS_EXACT_UPPER_LEVEL_CARDINAL_RAIL_TOPOLOGY_ISOLATION_AND_ROLLBACK_PRESERVED',
      qaPayloadSha256:
        '291ebd7aa3c1e5a80e3067ce1f7a8786c5dc67f67a418de3d840105135f5ee7d',
      ledger: {
        sha256: 'ca0505c5768e25762eca41f7ba77d477ed8eae2a2be55f9acad41caf3ed5f864',
      },
      manifest: {
        sha256: '4c52a6eab1f5a6dc23e869c3cac8d573cfa9e3548b211d64e247bbccb8e4749c',
      },
      acceptedPredecessor: {
        r12dCompletedReleaseIdentitySha256:
          '97ff44527f857241316f425e563f639bea1c96b52b9b839f1e77089a04b225b2',
        sourceB09StateMatchesR12dPost: true,
      },
      sourceSnapshot: {
        completeSaveSha256:
          'e67267a03d590e88858eca010998dd949a698758c9c2011dde6bccb7aba61633',
        regionSha256:
          'daa2da02ce2aaea64d2d61b2261d03b193dd6805b7b30b501c4a9638b7a50e9c',
      },
      postSnapshot: {
        completeSaveSha256:
          'fc88874e3037fa37565408fb72bda202416178ae990adf00cb0df462f7dc9484',
        regionSha256:
          '980a7636e53a86e1c98c24e05b5b1aadeda1bb5ac7860cf02e02b3ccd4634af9',
      },
      releaseIdentity: {
        completedReleaseIdentitySha256:
          '552ac3c9580c80b248625d6f26676fd491a110ccf707b488b507dea6a1434c9b',
      },
    });
  });

  it('verifies all 80 exact east-west rail states and topology', () => {
    expect(readQa().exactPostState).toMatchObject({
      targetCellCount: 80,
      targetCoordinateSetSha256:
        '71956640b587c6e2b749b168a8c6fe39638c766f323aac657c2f3e95d367456f',
      desiredState: 'minecraft:rail[shape=east_west,waterlogged=false]',
      exactRailStatePassCount: 80,
      exactRailStateFailureCount: 0,
      topology: {
        componentCount: 1,
        largestComponentCellCount: 80,
        endpointCount: 2,
        interiorCellCount: 78,
        branchCellCount: 0,
        shapeUpdateMismatchCount: 0,
        cardinalAdjacencyToPriorRailCount: 0,
      },
    });
  });

  it('preserves supports, headroom, gaps, prior rails, and caps', () => {
    const qa = readQa();
    expect(qa.exactPostState.support).toMatchObject({
      cellCount: 80,
      sourceMatchCount: 80,
      postMatchCount: 80,
    });
    expect(qa.exactPostState.headroom).toMatchObject({
      cellCount: 80,
      sourceAirCount: 80,
      postAirCount: 80,
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
      lowerB08CapCellCount: 12,
      summitZ11CapCellCount: 12,
      capSourceMatchCount: 24,
      capPostMatchCount: 24,
    });
  });

  it('accounts for every halo/B09 difference and exact rail-shape census', () => {
    expect(readQa().preservation).toMatchObject({
      interactionHaloCellCount: 738,
      haloDeclaredDifferenceCount: 80,
      haloLifecycleDifferenceCount: 0,
      haloUndeclaredDifferenceCount: 0,
      b09AccommodationCellCount: 7_800,
      sourceB09StateSetSha256:
        '84c25bde1ce5d62bb2647f4d8cf087b4c6caa44ab02d43efebf1dc2f72765bc4',
      postB09StateSetSha256:
        'f775a927bded347e269b132a3e608798a93b803ee326d44be4cebb72e9d44776',
      b09DeclaredDifferenceCount: 80,
      b09LifecycleDifferenceCount: 0,
      b09UndeclaredDifferenceCount: 0,
      preservedNonTargetB09CellCount: 7_720,
      totalExpectedRailCellCount: 330,
      offTargetOrShapeMismatchRailCount: 0,
      postB09StateCensus: {
        'minecraft:rail[shape=east_west,waterlogged=false]': 311,
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
        strictForwardGroupPassCount: 80,
        failedGroupCount: 0,
        noOpCount: 0,
        unknownReplyCount: 0,
        worldEditLeftoverCount: 0,
        streamJournalEntryCount: 166,
        streamJournalSha256:
          '60cb39eed371cb8fd6adee313a18f3b6b260b7cc3a00fcd4b01490cd6e8dbea2',
        streamJournalFinalStatus: 'complete',
        rollbackPoststatePassCount: 80,
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
      lowerGradeAndSummitTurnGapsRemainAir: true,
      priorRailCardinalConnectionCreated: false,
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
