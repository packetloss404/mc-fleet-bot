import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/qa_combined_zones_r08aa_north_smoke_center_segment_post_release.mjs');
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r08aa-live-20260822T004356Z');
const QA = path.join(EVIDENCE, 'r08aa-post-release-qa.json');
const SEAL = path.join(EVIDENCE, 'r08aa-bounded-north-smoke-center-segment-seal.json');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'r08aa-post-qa-'));
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const tempQa = path.join(temp, 'qa.json');
const tempMd = path.join(temp, 'qa.md');
const tempSeal = path.join(temp, 'seal.json');
const tempSealMd = path.join(temp, 'seal.md');

beforeAll(() => {
  execFileSync(process.execPath, [SCRIPT, '--generated-at', '2026-08-22T00:48:00Z',
    '--out', tempQa, '--markdown', tempMd, '--seal-out', tempSeal,
    '--seal-markdown', tempSealMd],
  { cwd: ROOT, stdio: 'pipe' });
}, 30_000);
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('Combined Zones R08AA north-smoke center-segment post-release QA', () => {
  it('reproduces all canonical QA and seal artifacts deterministically', () => {
    expect(fs.readFileSync(tempQa)).toEqual(fs.readFileSync(QA));
    expect(fs.readFileSync(tempSeal)).toEqual(fs.readFileSync(SEAL));
    expect(fs.readFileSync(tempMd)).toEqual(fs.readFileSync(path.join(EVIDENCE,
      'r08aa-post-release-qa.md')));
    expect(fs.readFileSync(tempSealMd)).toEqual(fs.readFileSync(path.join(EVIDENCE,
      'r08aa-bounded-north-smoke-center-segment-seal.md')));
  });

  it('binds the immutable ledger, source/post saves, MVP contract, and completed identity', () => {
    expect(readJson(QA)).toMatchObject({
      status: 'PASS_R08AA_NORTH_SMOKE_CENTER_SEGMENT_POST_RELEASE_ACCEPTED',
      release: {
        transactionId: 'combined-zones-r08aa-empty-eight-north-smoke-center-segment',
        manifestIdentity: '5ff8e27225dd2ac78179b4dedc1492096006aa7926ceb14d72e709d5b6016e98',
        sourceBoundReleaseIdentitySha256: '5fd6a4d791bb83773b90d63195329661a7fac9fb4d4b12406094508cc5007ae8',
        executionBindingSha256: '2c57200611955f84327804b0597aa55df68bd47f7e0077cae650c8e6271cc6df',
        completedReleaseIdentitySha256: '04440c644876ffb9736cde25b90cfb9c3f34808970b588575b38f59f00271f63',
      },
      bindings: {
        ledger: { sha256: 'f5c08a28e0d1bd7ccc0c8dfa8b76257e522c8274cf0a3a322072ec383b4e7c9e' },
        manifest: { sha256: 'be1b2b67e9ecb10dda624fc4acd9097fea0d7cae0d4d22b1715b4fbe698d7bf9' },
        sourceCompleteSave: { completeSaveSha256: '1073306ae3862eca39741e5bed384f182be1c2dd9b4174442eefe7fe50f3a15a',
          regionSnapshotSha256: 'd4ae4d915c5cdcf34d19ce55874bd19cace29c0e79df9c1d31473c161f9a83cf' },
        postCompleteSave: { completeSaveSha256: 'd0c8278796140888a0801d6152f9fc6d352cc297d388cea5bdf8ce06e4a6d2e6',
          regionSnapshotSha256: 'a52751c2f34f4dfd0931529421a5a235cc5a522b40a3d378fe01e4b5887244f9' },
        ledgerEvidence: { declaredBindingCount: 17, matchingBindingCount: 17, mismatchCount: 0 },
      },
    });
  });

  it('verifies all targets, full-height maximal geometry, material, and no opening intersection', () => {
    expect(readJson(QA)).toMatchObject({
      geometry: {
        fullFrozenNorthPlane: { cellCount: 1372 },
        maximalSelectedCenterSegment: { cellCount: 98, widthCells: 14, heightCells: 7,
          fullHeight: true, componentCount: 1, largestComponentCellCount: 98,
          coordinateSetSha256: '3fbb019107872bba4d0a5bd26cc0d67e1c4a6eb1f01b13a2ca82713192ecf492' },
        wallField: { cellCount: 98 },
        openingReservationIntersection: { cellCount: 0, componentCount: 0 },
        selectedInteractionHalo: { cellCount: 238,
          coordinateSetSha256: '655ec215ca6a3f1834f9482087a11d0c8fc20cbeb47fb7729f01c8deb5c66142' },
        fullPlaneInteractionHalo: { cellCount: 3150 },
      },
      postState: {
        exactTransitions: { expectedCellCount: 98, matchingCellCount: 98,
          mismatchCellCount: 0, stoneBrickWallCount: 98,
          openingReservationIntersectionCount: 0, materialMismatchCount: 0 },
        boundedDiffAccounting: { reviewCellCount: 4522, observedChangedCellCount: 98,
          declaredOperationTransitionCount: 98, acceptedLifecycleTransitionCount: 0,
          undeclaredChangedCellCount: 0, exactDeclaredDeltaOnly: true,
          sourceAndPostCompleteSaveIdentitiesDifferAsExpected: true },
        priorSegmentPreservation: { expectedSegmentCount: 4, totalExactCellCount: 973,
          allSourceAndPostStatesExact: true,
          segments: [
            { transactionId: 'combined-zones-r08w-empty-eight-north-smoke-west-segment',
              exactCellCount: 350, mismatchCount: 0, r08aaIntersectionCount: 0 },
            { transactionId: 'combined-zones-r08x-empty-eight-north-smoke-east-segment',
              exactCellCount: 245, mismatchCount: 0, r08aaIntersectionCount: 0 },
            { transactionId: 'combined-zones-r08y-empty-eight-north-smoke-central-west-segment',
              exactCellCount: 231, mismatchCount: 0, r08aaIntersectionCount: 0 },
            { transactionId: 'combined-zones-r08z-empty-eight-north-smoke-central-east-segment',
              exactCellCount: 147, mismatchCount: 0, r08aaIntersectionCount: 0 },
          ] },
        maximality: { exactRankedCleanRunsReproduced: true,
          selectedLargestRun: { minX: 1740, maxX: 1753, widthCells: 14 },
          fullHeightColumnCount: 14 },
      },
    });
  });

  it('proves halo, wet, gravity, N06, and complete non-target plane preservation', () => {
    expect(readJson(QA)).toMatchObject({
      postState: { preservation: {
        unchangedNonTargetPlaneCellCount: 1274, nonTargetPlaneDriftCount: 0,
        unchangedSelectedHaloCellCount: 238, selectedHaloDriftCount: 0,
        unchangedFullPlaneHaloCellCount: 3150, fullPlaneHaloDriftCount: 0,
        retainedWetPlaneCellCount: 6, wetPlaneDriftCount: 0,
        retainedFullPlaneHaloGravelCount: 68, haloGravelDriftCount: 0,
        retainedN06BlockedCellCount: 4, n06DriftCount: 0,
        postBlockEntityCount: 0, postSavedEntityCount: 0, undeclaredDriftCount: 0,
      } },
      commissioningBoundary: { boundedStaticCenterSegmentAccepted: true,
        completeNorthSmokeBoundaryBuilt: false, passiveNorthSmokeBoundaryCommissioned: false,
        poweredSmokeControlCommissioned: false, wetOrGravityInterfaceOpened: false,
        n06Touched: false, publicRouteCommissioned: false },
    });
  });

  it('verifies wrapper stages, strict journals, and exact reverse rollback', () => {
    expect(readJson(QA).executionEvidence).toMatchObject({
      stageOrder: { expectedStageCount: 17, actualStageCount: 17, exact: true, allPass: true },
      strictForwardExecution: { packageCount: 1, successfulCommandCount: 98,
        failedCommandCount: 0, noopCommandCount: 0, passed: true },
      journals: { packageCount: 1, totalEventCount: 202, allCompleteAndOperationBound: true },
      reverseRollbackPoststatePreflight: { packageCount: 1, passedGuardCount: 98,
        failedGuardCount: 0, passed: true },
    });
  });

  it('binds the independent QA payload and bounded construction seal', () => {
    const qa = readJson(QA);
    const qaPayload = { ...qa };
    delete qaPayload.qaPayloadSha256;
    expect(crypto.createHash('sha256').update(JSON.stringify(qaPayload)).digest('hex'))
      .toBe(qa.qaPayloadSha256);
    expect(qa.qaPayloadSha256).toBe('46763bb550765a96e7150d7aee9e15acabff544cda4778c046f84772bcadbc0e');
    const seal = readJson(SEAL);
    const sealPayload = { ...seal };
    delete sealPayload.commissioningSealSha256;
    expect(crypto.createHash('sha256').update(JSON.stringify(sealPayload)).digest('hex'))
      .toBe(seal.commissioningSealSha256);
    expect(seal).toMatchObject({
      status: 'PASS_R08AA_BOUNDED_NORTH_SMOKE_CENTER_SEGMENT_ACCEPTED',
      constructionScope: { exactTransitionCount: 98, fullHeightSegmentCellCount: 98,
        widthCells: 14, heightCells: 7, stoneBrickWallCellCount: 98,
        openingReservationIntersectionCellCount: 0, unchangedInteractionHaloCellCount: 238,
        boundedStaticCenterSegmentAccepted: true, completeNorthSmokeBoundaryBuilt: false },
      retainedInterfaces: { wetPlaneCellCount: 6, fullPlaneHaloGravelCellCount: 68,
        n06BlockedCellCount: 4, priorBoundedSegmentCellCount: 973, allUnchanged: true },
      rollback: { exactGuardCount: 98, poststatePreflightPassed: true },
      commissioningSealSha256: 'c7158a6e3df19f32cedb53366306b1e7809d9db98332288466f3499b48f8b4ce',
    });
  });
});

