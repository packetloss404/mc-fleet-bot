import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r12i_b09_next_maximal_isolated_graded_passive_rail_post_release.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r12i-live-20260822T023713Z',
);
const CANONICAL_JSON = path.join(EVIDENCE, 'r12i-post-release-qa.json');
const CANONICAL_MARKDOWN = path.join(EVIDENCE, 'r12i-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r12i-post-qa-'),
);
const temporaryJson = path.join(temporaryDirectory, 'r12i-post-release-qa.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'r12i-post-release-qa.md');

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
    '--generated-at', '2026-08-22T02:48:00Z',
    '--out', temporaryJson,
    '--markdown', temporaryMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R12I passive B09 next maximal isolated graded rail post-release QA', () => {
  it('regenerates both sealed reports byte-for-byte', () => {
    expect(fs.readFileSync(temporaryJson)).toEqual(fs.readFileSync(CANONICAL_JSON));
    expect(fs.readFileSync(temporaryMarkdown)).toEqual(fs.readFileSync(CANONICAL_MARKDOWN));
  });

  it('binds the exact completed ledger, manifest, source, post, R12H, and runtime proof', () => {
    expect(readQa()).toMatchObject({
      status:
        'PASS_EXACT_ISOLATED_GRADED_RAIL_TOPOLOGY_ISOLATION_AND_ROLLBACK_PRESERVED',
      qaPayloadSha256:
        'bdbe884727ad4e1690f25009e4d4b3119f8a888ac4922d5f8c1882c5211e867d',
      ledger: {
        sha256: '45e39e2eb78162036f6fc9304d5c5cd45a07acda3cf12fdb2d4899c431ceba5b',
      },
      manifest: {
        sha256: '9cd2cd62801aae251c29ebc9526ef5102e6737fc9c3062e7a670a8dd9616d513',
      },
      acceptedPredecessor: {
        r12hCompletedReleaseIdentitySha256:
          'a7be316c903bdfb71934d0e543b4cb875f3eef4fbe15fbe1a090b4c456ac8d92',
        sourceB09StateMatchesR12hPost: true,
      },
      runtimeProof: {
        proofPayloadSha256:
          'ed7215a5de7c23f42d29ee7f05ba606d1e5a641068bf5ffde00a21933f3c60f2',
        exactProductionPaperVersion: '1.21.11-69-main@94d0c97',
        forwardStatePassCount: 4,
        rollbackAirPassCount: 4,
        productionMutationPerformed: false,
      },
      sourceSnapshot: {
        completeSaveSha256:
          '3a8e3a877c698b9f7f007b01b1f39ec3fd086fac7aa591b7e758a1ef31b267d1',
        regionSha256:
          '624f8d265c986d8670c1cbcf32192231f0ca9ad7155e3b63e3fe1959fb07fd79',
      },
      postSnapshot: {
        completeSaveSha256:
          '4f297319294b22d42a15087c41b5077c0ade249450ade1147e858adc7191a6c4',
        regionSha256:
          '45e004fea13e4e40c864fc0f79578744d37e920410ef843ff034d9555b5097d2',
      },
      releaseIdentity: {
        completedReleaseIdentitySha256:
          '396fc2ff6c3c3411854c7d2bb72dffe07625a7b32813e089e3acf1c1065465a2',
      },
    });
  });

  it('verifies all four exact graded rail states and topology', () => {
    expect(readQa().exactPostState).toMatchObject({
      targetCellCount: 4,
      targetCoordinateSetSha256:
        '0def8552020fb272fe57c09a7441dd5a3dc4dfcdc672ea72274544a007d95ad0',
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
      r12hRailCellCount: 4,
      r12hRailSourceMatchCount: 4,
      r12hRailPostMatchCount: 4,
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
        '6b4019fb60e0f81d8ab47b469621e3abade4491de6e5e3b34588a40f99ce59b7',
      postB09StateSetSha256:
        '061a02478cda4241f5dcc148012b145a64bdc7aa303e327658d7b25143aa6048',
      b09DeclaredDifferenceCount: 4,
      b09LifecycleDifferenceCount: 0,
      b09UndeclaredDifferenceCount: 0,
      preservedNonTargetB09CellCount: 7_796,
      totalExpectedRailCellCount: 345,
      offTargetOrShapeMismatchRailCount: 0,
      postB09StateCensus: {
        'minecraft:rail[shape=ascending_west,waterlogged=false]': 11,
        'minecraft:rail[shape=east_west,waterlogged=false]': 315,
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
          '0138b6ba3b2762946cb0c6faaa5fb1b5ee524996c39ab8f8fd0cb22b3d184274',
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
