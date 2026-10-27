import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/qa_combined_zones_r08ab_north_smoke_far_east_segment_post_release.mjs');
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r08ab-live-20260822T005922Z');
const QA = path.join(EVIDENCE, 'r08ab-post-release-qa.json');
const SEAL = path.join(EVIDENCE, 'r08ab-bounded-north-smoke-far-east-segment-seal.json');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'r08ab-post-qa-'));
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const tempQa = path.join(temp, 'qa.json');
const tempMd = path.join(temp, 'qa.md');
const tempSeal = path.join(temp, 'seal.json');
const tempSealMd = path.join(temp, 'seal.md');

beforeAll(() => {
  execFileSync(process.execPath, [SCRIPT, '--generated-at', '2026-08-22T01:08:00Z',
    '--out', tempQa, '--markdown', tempMd, '--seal-out', tempSeal,
    '--seal-markdown', tempSealMd],
  { cwd: ROOT, stdio: 'pipe' });
}, 30_000);
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('Combined Zones R08AB north-smoke far-east-segment post-release QA', () => {
  it('reproduces all canonical QA and seal artifacts deterministically', () => {
    expect(fs.readFileSync(tempQa)).toEqual(fs.readFileSync(QA));
    expect(fs.readFileSync(tempSeal)).toEqual(fs.readFileSync(SEAL));
    expect(fs.readFileSync(tempMd)).toEqual(fs.readFileSync(path.join(EVIDENCE,
      'r08ab-post-release-qa.md')));
    expect(fs.readFileSync(tempSealMd)).toEqual(fs.readFileSync(path.join(EVIDENCE,
      'r08ab-bounded-north-smoke-far-east-segment-seal.md')));
  });

  it('binds the immutable ledger, source/post saves, MVP contract, and completed identity', () => {
    expect(readJson(QA)).toMatchObject({
      status: 'PASS_R08AB_NORTH_SMOKE_FAR_EAST_SEGMENT_POST_RELEASE_ACCEPTED',
      release: {
        transactionId: 'combined-zones-r08ab-empty-eight-north-smoke-far-east-segment',
        manifestIdentity: '640fef84412a9852db1e0eeb7504557e96ce98378b8d156e347bf6ee02671fbb',
        sourceBoundReleaseIdentitySha256: 'ef4f0a5aa135f83edc383081c69aa596ed50175fd6eee3cab066daa5580ce8bb',
        executionBindingSha256: 'c4c6a4b6a95a00ab0d2cfead1a9d8b26aafb8f0dbe7c269927c3efaf0e064bce',
        completedReleaseIdentitySha256: '478d681e6df3255cf3f28742a8a00220b668754f9747777c4eab617a9d13c6e3',
      },
      bindings: {
        ledger: { sha256: 'e3922e7bc56e03d113a4c383b9561a2376b97e8c3fdb61f6cd012e41e43d173e' },
        manifest: { sha256: '64d7720eab198f8124b1403781991b9365403deb5fac28cb62da338aab7e43e3' },
        sourceCompleteSave: { completeSaveSha256: '289e8429b3f1cbeb5d7caa2250358d8527dedc595c2a6ac288b01bb80e903711',
          regionSnapshotSha256: 'f2ed37edb48bf5d5baaefd0779485e4fbc5ac3e15d7cab8977e437f8e7b31bb3' },
        postCompleteSave: { completeSaveSha256: 'f9612be6c862f1693ce9c7be60e3fcc5eeb5e7a305d5ca62632d10b22bb606cb',
          regionSnapshotSha256: '4d0fc4568f8cded612e3d552520cc640056ad8c9a962379746e3069f8fe6bf7a' },
        ledgerEvidence: { declaredBindingCount: 17, matchingBindingCount: 17, mismatchCount: 0 },
      },
    });
  });

  it('verifies all targets, full-height maximal geometry, material, and no opening intersection', () => {
    expect(readJson(QA)).toMatchObject({
      geometry: {
        fullFrozenNorthPlane: { cellCount: 1372 },
        maximalSelectedFarEastSegment: { cellCount: 14, widthCells: 2, heightCells: 7,
          fullHeight: true, componentCount: 1, largestComponentCellCount: 14,
          coordinateSetSha256: 'd2edc1b2dd46e577ef7bf45dadc50a911e04792b468a88b3f68de97844fee2fb' },
        wallField: { cellCount: 14 },
        openingReservationIntersection: { cellCount: 0, componentCount: 0 },
        selectedInteractionHalo: { cellCount: 46,
          coordinateSetSha256: '890d10f82b23fb8160952168e9b1f4d2d684fb39673bb5924268a9d7ba3b84a2' },
        fullPlaneInteractionHalo: { cellCount: 3150 },
      },
      postState: {
        exactTransitions: { expectedCellCount: 14, matchingCellCount: 14,
          mismatchCellCount: 0, stoneBrickWallCount: 14,
          openingReservationIntersectionCount: 0, materialMismatchCount: 0 },
        boundedDiffAccounting: { reviewCellCount: 4522, observedChangedCellCount: 14,
          declaredOperationTransitionCount: 14, acceptedLifecycleTransitionCount: 0,
          undeclaredChangedCellCount: 0, exactDeclaredDeltaOnly: true,
          sourceAndPostCompleteSaveIdentitiesDifferAsExpected: true },
        priorSegmentPreservation: { expectedSegmentCount: 5, totalExactCellCount: 1071,
          allSourceAndPostStatesExact: true,
          segments: [
            { transactionId: 'combined-zones-r08w-empty-eight-north-smoke-west-segment',
              exactCellCount: 350, mismatchCount: 0, r08abIntersectionCount: 0 },
            { transactionId: 'combined-zones-r08x-empty-eight-north-smoke-east-segment',
              exactCellCount: 245, mismatchCount: 0, r08abIntersectionCount: 0 },
            { transactionId: 'combined-zones-r08y-empty-eight-north-smoke-central-west-segment',
              exactCellCount: 231, mismatchCount: 0, r08abIntersectionCount: 0 },
            { transactionId: 'combined-zones-r08z-empty-eight-north-smoke-central-east-segment',
              exactCellCount: 147, mismatchCount: 0, r08abIntersectionCount: 0 },
            { transactionId: 'combined-zones-r08aa-empty-eight-north-smoke-center-segment',
              exactCellCount: 98, mismatchCount: 0, r08abIntersectionCount: 0 },
          ] },
        maximality: { exactRankedCleanRunsReproduced: true,
          selectedLargestRun: { minX: 1842, maxX: 1843, widthCells: 2 },
          fullHeightColumnCount: 2 },
      },
    });
  });

  it('proves halo, wet, gravity, N06, and complete non-target plane preservation', () => {
    expect(readJson(QA)).toMatchObject({
      postState: { preservation: {
        unchangedNonTargetPlaneCellCount: 1358, nonTargetPlaneDriftCount: 0,
        unchangedSelectedHaloCellCount: 46, selectedHaloDriftCount: 0,
        unchangedFullPlaneHaloCellCount: 3150, fullPlaneHaloDriftCount: 0,
        retainedWetPlaneCellCount: 6, wetPlaneDriftCount: 0,
        retainedFullPlaneHaloGravelCount: 68, haloGravelDriftCount: 0,
        retainedN06BlockedCellCount: 4, n06DriftCount: 0,
        postBlockEntityCount: 0, postSavedEntityCount: 0, undeclaredDriftCount: 0,
      } },
      commissioningBoundary: { boundedStaticFarEastSegmentAccepted: true,
        completeNorthSmokeBoundaryBuilt: false, passiveNorthSmokeBoundaryCommissioned: false,
        poweredSmokeControlCommissioned: false, wetOrGravityInterfaceOpened: false,
        n06Touched: false, publicRouteCommissioned: false },
    });
  });

  it('binds all 267 projected residual cells and proves no clean run remains', () => {
    expect(readJson(QA).postState.projectedResidualCensus).toMatchObject({
      binding: { sha256: 'e15c8cac35dd251d2adccaa69249abfef92ac1f3bf8d5eaef98a0dd5fcdc3ea1' },
      censusIdentitySha256: '24737681e79464c0bc40b1e1c833e1725c9d5e8fff69c18ae8265dfb29c5a4e2',
      residualCellCount: 267, wetInteractionCellCount: 147,
      gravityInteractionCellCount: 105, sourceStateBandCellCount: 15,
      n06GravityAdjacentCellCount: 21, openingReservationResidualCellCount: 0,
      sourceMismatchCount: 0, postMismatchCount: 0, targetIntersectionCount: 0,
      remainingCleanFullHeightRuns: [], exactSourceAndPostPreservation: true,
    });
  });

  it('verifies wrapper stages, strict journals, and exact reverse rollback', () => {
    expect(readJson(QA).executionEvidence).toMatchObject({
      stageOrder: { expectedStageCount: 17, actualStageCount: 17, exact: true, allPass: true },
      strictForwardExecution: { packageCount: 1, successfulCommandCount: 14,
        failedCommandCount: 0, noopCommandCount: 0, passed: true },
      journals: { packageCount: 1, totalEventCount: 34, allCompleteAndOperationBound: true },
      reverseRollbackPoststatePreflight: { packageCount: 1, passedGuardCount: 14,
        failedGuardCount: 0, passed: true },
    });
  });

  it('binds the independent QA payload and bounded construction seal', () => {
    const qa = readJson(QA);
    const qaPayload = { ...qa };
    delete qaPayload.qaPayloadSha256;
    expect(crypto.createHash('sha256').update(JSON.stringify(qaPayload)).digest('hex'))
      .toBe(qa.qaPayloadSha256);
    expect(qa.qaPayloadSha256).toBe('49f46ae0eac0e43f3dcadd2f2b032a9baf852837e3f032c30d2142f316ef5ed2');
    const seal = readJson(SEAL);
    const sealPayload = { ...seal };
    delete sealPayload.commissioningSealSha256;
    expect(crypto.createHash('sha256').update(JSON.stringify(sealPayload)).digest('hex'))
      .toBe(seal.commissioningSealSha256);
    expect(seal).toMatchObject({
      status: 'PASS_R08AB_BOUNDED_NORTH_SMOKE_FAR_EAST_SEGMENT_ACCEPTED',
      constructionScope: { exactTransitionCount: 14, fullHeightSegmentCellCount: 14,
        widthCells: 2, heightCells: 7, stoneBrickWallCellCount: 14,
        openingReservationIntersectionCellCount: 0, unchangedInteractionHaloCellCount: 46,
        boundedStaticFarEastSegmentAccepted: true, completeNorthSmokeBoundaryBuilt: false },
      retainedInterfaces: { wetPlaneCellCount: 6, fullPlaneHaloGravelCellCount: 68,
        n06BlockedCellCount: 4, priorBoundedSegmentCellCount: 1071,
        exactProjectedResidualCellCount: 267, wetInteractionResidualCellCount: 147,
        gravityInteractionResidualCellCount: 105, sourceStateResidualCellCount: 15,
        n06AdjacentResidualCellCount: 21, openingResidualCellCount: 0,
        remainingCleanFullHeightRunCount: 0, allUnchanged: true },
      rollback: { exactGuardCount: 14, poststatePreflightPassed: true },
      commissioningSealSha256: '6430e2d6b1261dceecf9db650ffcf5c58d195f21dda22a77fbd6019869e10fd8',
    });
  });
});

