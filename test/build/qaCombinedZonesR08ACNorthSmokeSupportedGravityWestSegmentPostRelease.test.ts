import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT,
  'scripts/qa_combined_zones_r08ac_north_smoke_supported_gravity_west_segment_post_release.mjs');
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r08ac-live-20260822T011245Z');
const QA = path.join(EVIDENCE, 'r08ac-post-release-qa.json');
const SEAL = path.join(EVIDENCE, 'r08ac-bounded-north-smoke-supported-gravity-west-segment-seal.json');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'r08ac-post-qa-'));
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const tempQa = path.join(temp, 'qa.json');
const tempMd = path.join(temp, 'qa.md');
const tempSeal = path.join(temp, 'seal.json');
const tempSealMd = path.join(temp, 'seal.md');

beforeAll(() => {
  execFileSync(process.execPath, [SCRIPT, '--generated-at', '2026-08-22T01:22:00Z',
    '--out', tempQa, '--markdown', tempMd, '--seal-out', tempSeal,
    '--seal-markdown', tempSealMd],
  { cwd: ROOT, stdio: 'pipe' });
}, 30_000);
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('Combined Zones R08AC north-smoke supported-gravity-west-segment post-release QA', () => {
  it('reproduces all canonical QA and seal artifacts deterministically', () => {
    expect(fs.readFileSync(tempQa)).toEqual(fs.readFileSync(QA));
    expect(fs.readFileSync(tempSeal)).toEqual(fs.readFileSync(SEAL));
    expect(fs.readFileSync(tempMd)).toEqual(fs.readFileSync(path.join(EVIDENCE,
      'r08ac-post-release-qa.md')));
    expect(fs.readFileSync(tempSealMd)).toEqual(fs.readFileSync(path.join(EVIDENCE,
      'r08ac-bounded-north-smoke-supported-gravity-west-segment-seal.md')));
  });

  it('binds the immutable ledger, source/post saves, MVP contract, and completed identity', () => {
    expect(readJson(QA)).toMatchObject({
      status: 'PASS_R08AC_NORTH_SMOKE_SUPPORTED_GRAVITY_WEST_SEGMENT_POST_RELEASE_ACCEPTED',
      release: {
        transactionId: 'combined-zones-r08ac-empty-eight-north-smoke-supported-gravity-west-segment',
        manifestIdentity: '3509c4b5df3e01e5c64741a3e395eebf04269cd6fc6a8db14ab3daad2b7cfb96',
        sourceBoundReleaseIdentitySha256: '154f2aa10bc287ac66a29099fcd43521c535f60f2ae68d80e7ee14a28f92ef9a',
        executionBindingSha256: 'c979a757ea451c81e63554277273980a681d76dade985223267d398dc31e9cb1',
        completedReleaseIdentitySha256: 'f19e02e5aa9d0c0d783593428c0c2003d9361d5568df10149059a53b4f458f0c',
      },
      bindings: {
        ledger: { sha256: '2bc8f8471a37b8d2f6e0ff8042abeafc390cb75be621909ea8afc4cd2790a71e' },
        manifest: { sha256: '9c4d2e7c4a0406cdaa522a8c79b20bbc508ac3c9030a9ef6a4cb2a3f9b17b83c' },
        sourceCompleteSave: { completeSaveSha256: 'c87f7667d636e99be2c0a77d6a28f7d4065e8da6e7bfe9602f5b7c4dad9c1026',
          regionSnapshotSha256: '13adf9e27c66917bc25c5b1f58717467aa120f3440a970c730578350074e3576' },
        postCompleteSave: { completeSaveSha256: 'ae8ae28474c3b3c21d8c39c8cbf3550f80124ddbfe822324965054789c60d3b9',
          regionSnapshotSha256: '4436f48cf759066df1a22cfe578719603e2149788fd2ecd79a4badfea988f4c7' },
        ledgerEvidence: { declaredBindingCount: 17, matchingBindingCount: 17, mismatchCount: 0 },
      },
    });
  });

  it('verifies all targets, full-height maximal geometry, material, and no opening intersection', () => {
    expect(readJson(QA)).toMatchObject({
      geometry: {
        fullFrozenNorthPlane: { cellCount: 1372 },
        maximalSelectedSupportedGravityWestSegment: { cellCount: 35, widthCells: 5, heightCells: 7,
          fullHeight: true, componentCount: 1, largestComponentCellCount: 35,
          coordinateSetSha256: 'b5db94035c1c48956f60e8aed3e2290502fbc18a89dd21739253bff66265e99b' },
        wallField: { cellCount: 35 },
        openingReservationIntersection: { cellCount: 0, componentCount: 0 },
        selectedInteractionHalo: { cellCount: 94,
          coordinateSetSha256: 'dc0cf7a4bd279a5f6e0ee6dc346508aa850f3ccb4d798ab7158e80b859b3fc8f' },
        fullPlaneInteractionHalo: { cellCount: 3150 },
      },
      postState: {
        exactTransitions: { expectedCellCount: 35, matchingCellCount: 35,
          mismatchCellCount: 0, stoneBrickWallCount: 35,
          openingReservationIntersectionCount: 0, materialMismatchCount: 0 },
        boundedDiffAccounting: { reviewCellCount: 4522, observedChangedCellCount: 35,
          declaredOperationTransitionCount: 35, acceptedLifecycleTransitionCount: 0,
          undeclaredChangedCellCount: 0, exactDeclaredDeltaOnly: true,
          sourceAndPostCompleteSaveIdentitiesDifferAsExpected: true },
        priorSegmentPreservation: { expectedSegmentCount: 6, totalExactCellCount: 1085,
          allSourceAndPostStatesExact: true,
          segments: [
            { transactionId: 'combined-zones-r08w-empty-eight-north-smoke-west-segment',
              exactCellCount: 350, mismatchCount: 0, r08acIntersectionCount: 0 },
            { transactionId: 'combined-zones-r08x-empty-eight-north-smoke-east-segment',
              exactCellCount: 245, mismatchCount: 0, r08acIntersectionCount: 0 },
            { transactionId: 'combined-zones-r08y-empty-eight-north-smoke-central-west-segment',
              exactCellCount: 231, mismatchCount: 0, r08acIntersectionCount: 0 },
            { transactionId: 'combined-zones-r08z-empty-eight-north-smoke-central-east-segment',
              exactCellCount: 147, mismatchCount: 0, r08acIntersectionCount: 0 },
            { transactionId: 'combined-zones-r08aa-empty-eight-north-smoke-center-segment',
              exactCellCount: 98, mismatchCount: 0, r08acIntersectionCount: 0 },
            { transactionId: 'combined-zones-r08ab-empty-eight-north-smoke-far-east-segment',
              exactCellCount: 14, mismatchCount: 0, r08acIntersectionCount: 0 },
          ] },
        maximality: { exactRankedSupportedGravityRunsBound: true,
          selectedLargestRun: { minX: 1787, maxX: 1791, widthCells: 5 },
          fullHeightColumnCount: 5, retainedSupportedGravityCellCount: 22 },
      },
    });
  });

  it('proves halo, wet, gravity, N06, and complete non-target plane preservation', () => {
    expect(readJson(QA)).toMatchObject({
      postState: { preservation: {
        unchangedNonTargetPlaneCellCount: 1337, nonTargetPlaneDriftCount: 0,
        unchangedSelectedHaloCellCount: 94, selectedHaloDriftCount: 0,
        unchangedFullPlaneHaloCellCount: 3150, fullPlaneHaloDriftCount: 0,
        retainedWetPlaneCellCount: 6, wetPlaneDriftCount: 0,
        retainedFullPlaneHaloGravelCount: 68, haloGravelDriftCount: 0,
        retainedSelectedHaloGravelCount: 22, selectedGravityClosureCount: 22,
        durableGravityTerminalCount: 22, gravityClosureStateMismatchCount: 0,
        gravityTerminalMismatchCount: 0, gravityClosureTargetIntersectionCount: 0,
        retainedN06BlockedCellCount: 4, n06DriftCount: 0,
        postBlockEntityCount: 0, postSavedEntityCount: 0, undeclaredDriftCount: 0,
      } },
      commissioningBoundary: { boundedStaticSupportedGravityWestSegmentAccepted: true,
        completeNorthSmokeBoundaryBuilt: false, passiveNorthSmokeBoundaryCommissioned: false,
        poweredSmokeControlCommissioned: false, wetOrGravityInterfaceOpened: false,
        n06Touched: false, publicRouteCommissioned: false },
    });
  });

  it('binds all 232 accepted-post residual cells and proves no dry clean run remains', () => {
    expect(readJson(QA).postState.acceptedPostResidualCensus).toMatchObject({
      binding: { sha256: '606dd70844dab551665bb1ecb31cdcd62f0a847b43e6dbe5532a169c55b37abd' },
      censusIdentitySha256: 'fd7ad0503ede9aa502f90d6dae70386e7a32cdc03d56d1820b00c67f0839ecbb',
      residualCellCount: 232, wetInteractionCellCount: 147,
      gravityInteractionCellCount: 70, sourceStateBandCellCount: 15,
      n06GravityAdjacentCellCount: 21, openingReservationResidualCellCount: 0,
      sourceMismatchCount: 0, postMismatchCount: 0, targetIntersectionCount: 0,
      remainingCleanFullHeightRuns: [], exactSourceAndPostPreservation: true,
    });
  });

  it('verifies wrapper stages, strict journals, and exact reverse rollback', () => {
    expect(readJson(QA).executionEvidence).toMatchObject({
      stageOrder: { expectedStageCount: 17, actualStageCount: 17, exact: true, allPass: true },
      strictForwardExecution: { packageCount: 1, successfulCommandCount: 35,
        failedCommandCount: 0, noopCommandCount: 0, passed: true },
      journals: { packageCount: 1, totalEventCount: 76, allCompleteAndOperationBound: true },
      reverseRollbackPoststatePreflight: { packageCount: 1, passedGuardCount: 35,
        failedGuardCount: 0, passed: true },
    });
  });

  it('binds the independent QA payload and bounded construction seal', () => {
    const qa = readJson(QA);
    const qaPayload = { ...qa };
    delete qaPayload.qaPayloadSha256;
    expect(crypto.createHash('sha256').update(JSON.stringify(qaPayload)).digest('hex'))
      .toBe(qa.qaPayloadSha256);
    expect(qa.qaPayloadSha256).toBe('f1ed340c9cdac137af5d8bf622091a2a0eccea3089c3749865f5a06d2f3e4c04');
    const seal = readJson(SEAL);
    const sealPayload = { ...seal };
    delete sealPayload.commissioningSealSha256;
    expect(crypto.createHash('sha256').update(JSON.stringify(sealPayload)).digest('hex'))
      .toBe(seal.commissioningSealSha256);
    expect(seal).toMatchObject({
      status: 'PASS_R08AC_BOUNDED_NORTH_SMOKE_SUPPORTED_GRAVITY_WEST_SEGMENT_ACCEPTED',
      constructionScope: { exactTransitionCount: 35, fullHeightSegmentCellCount: 35,
        widthCells: 5, heightCells: 7, stoneBrickWallCellCount: 35,
        openingReservationIntersectionCellCount: 0, unchangedInteractionHaloCellCount: 94,
        boundedStaticSupportedGravityWestSegmentAccepted: true, completeNorthSmokeBoundaryBuilt: false },
      retainedInterfaces: { wetPlaneCellCount: 6, fullPlaneHaloGravelCellCount: 68,
        n06BlockedCellCount: 4, priorBoundedSegmentCellCount: 1085,
        selectedSupportedGravelCellCount: 22, durableGravityTerminalCount: 22,
        gravityClosureStateMismatchCount: 0,
        exactAcceptedPostResidualCellCount: 232, wetInteractionResidualCellCount: 147,
        gravityInteractionResidualCellCount: 70, sourceStateResidualCellCount: 15,
        n06AdjacentResidualCellCount: 21, openingResidualCellCount: 0,
        remainingCleanFullHeightRunCount: 0, allUnchanged: true },
      rollback: { exactGuardCount: 35, poststatePreflightPassed: true },
      commissioningSealSha256: '6d5e7c7b7284e8fe99b34266a429af7e6425c62859aeade75724b3c8ad4d5da7',
    });
  });
});

