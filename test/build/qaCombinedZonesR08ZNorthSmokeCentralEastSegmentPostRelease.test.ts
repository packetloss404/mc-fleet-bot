import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/qa_combined_zones_r08z_north_smoke_central_east_segment_post_release.mjs');
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r08z-live-20260822T003120Z');
const QA = path.join(EVIDENCE, 'r08z-post-release-qa.json');
const SEAL = path.join(EVIDENCE, 'r08z-bounded-north-smoke-central-east-segment-seal.json');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'r08z-post-qa-'));
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const tempQa = path.join(temp, 'qa.json');
const tempMd = path.join(temp, 'qa.md');
const tempSeal = path.join(temp, 'seal.json');
const tempSealMd = path.join(temp, 'seal.md');

beforeAll(() => {
  execFileSync(process.execPath, [SCRIPT, '--generated-at', '2026-08-22T00:35:00Z',
    '--out', tempQa, '--markdown', tempMd, '--seal-out', tempSeal,
    '--seal-markdown', tempSealMd],
  { cwd: ROOT, stdio: 'pipe' });
}, 30_000);
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('Combined Zones R08Z north-smoke central-east-segment post-release QA', () => {
  it('reproduces all canonical QA and seal artifacts deterministically', () => {
    expect(fs.readFileSync(tempQa)).toEqual(fs.readFileSync(QA));
    expect(fs.readFileSync(tempSeal)).toEqual(fs.readFileSync(SEAL));
    expect(fs.readFileSync(tempMd)).toEqual(fs.readFileSync(path.join(EVIDENCE,
      'r08z-post-release-qa.md')));
    expect(fs.readFileSync(tempSealMd)).toEqual(fs.readFileSync(path.join(EVIDENCE,
      'r08z-bounded-north-smoke-central-east-segment-seal.md')));
  });

  it('binds the immutable ledger, source/post saves, MVP contract, and completed identity', () => {
    expect(readJson(QA)).toMatchObject({
      status: 'PASS_R08Z_NORTH_SMOKE_CENTRAL_EAST_SEGMENT_POST_RELEASE_ACCEPTED',
      release: {
        transactionId: 'combined-zones-r08z-empty-eight-north-smoke-central-east-segment',
        manifestIdentity: 'b837c8cba2b4788b9350697dac09c538ad9dd8c678513399097a6211efd52580',
        sourceBoundReleaseIdentitySha256: '7c89fdb298b12ef9d31861e077b000d755ec18757ee7998c766448ee4481722b',
        executionBindingSha256: 'ade9f5bc35e59eeb01ad315aef0ffed03e0836dc5b03c61f783cd65e325e64af',
        completedReleaseIdentitySha256: 'be4cbb77f5d2be379fd4b502810de2bf71a10e9ef8612639513615b18e0c1d78',
      },
      bindings: {
        ledger: { sha256: 'f208edc413cd8dca55df13e07a7670689a4f65eb8da89ede1e6dbc0cb45a619e' },
        manifest: { sha256: 'd0a3a3ce4fac35b2e6f9b8d413087e09922e665a286a87b75f1bd01ab524eecc' },
        sourceCompleteSave: { completeSaveSha256: 'c8632c3116e99a2a8d2052809befbebb3115022784bcccfc7ef58da94b3e9bed',
          regionSnapshotSha256: 'e94ed83768ceacae505924ff53e118d1bdf6f33b1fe660d9d4cd08d5bb514637' },
        postCompleteSave: { completeSaveSha256: '46b375521f06d7a0770ed272c92556a41bef58d31e05735eb7eec0a59f8747ed',
          regionSnapshotSha256: 'd7a7efaa717435dea1f23aaaa45c982cb97ecdf319dac65e7928e4db965bb4ec' },
        ledgerEvidence: { declaredBindingCount: 25, matchingBindingCount: 25, mismatchCount: 0 },
      },
    });
  });

  it('verifies all targets, full-height maximal geometry, materials, and static cap', () => {
    expect(readJson(QA)).toMatchObject({
      geometry: {
        fullFrozenNorthPlane: { cellCount: 1372 },
        maximalSelectedCentralEastSegment: { cellCount: 147, widthCells: 21, heightCells: 7,
          fullHeight: true, componentCount: 1, largestComponentCellCount: 147,
          coordinateSetSha256: 'caaecae965f23ac574c7d9550d2022bd566b42950cade3bf84b106ecba73d5f5' },
        wallField: { cellCount: 138 },
        closedStaticCap: { cellCount: 9, widthCells: 3, heightCells: 3,
          componentCount: 1, largestComponentCellCount: 9 },
        selectedInteractionHalo: { cellCount: 350,
          coordinateSetSha256: '1181c568f86298524cf15976dd8fdb90e73e2a829976c91342c2d947b9327542' },
        fullPlaneInteractionHalo: { cellCount: 3150 },
      },
      postState: {
        exactTransitions: { expectedCellCount: 147, matchingCellCount: 147,
          mismatchCellCount: 0, stoneBrickWallCount: 138,
          polishedDeepslateCapCount: 9, materialMismatchCount: 0 },
        boundedDiffAccounting: { reviewCellCount: 4522, observedChangedCellCount: 147,
          declaredOperationTransitionCount: 147, acceptedLifecycleTransitionCount: 0,
          undeclaredChangedCellCount: 0, exactDeclaredDeltaOnly: true,
          sourceAndPostCompleteSaveIdentitiesDifferAsExpected: true },
        priorSegmentPreservation: { expectedSegmentCount: 3, totalExactCellCount: 826,
          allSourceAndPostStatesExact: true,
          segments: [
            { transactionId: 'combined-zones-r08w-empty-eight-north-smoke-west-segment',
              exactCellCount: 350, mismatchCount: 0, r08zIntersectionCount: 0 },
            { transactionId: 'combined-zones-r08x-empty-eight-north-smoke-east-segment',
              exactCellCount: 245, mismatchCount: 0, r08zIntersectionCount: 0 },
            { transactionId: 'combined-zones-r08y-empty-eight-north-smoke-central-west-segment',
              exactCellCount: 231, mismatchCount: 0, r08zIntersectionCount: 0 },
          ] },
        maximality: { exactRankedCleanRunsReproduced: true,
          selectedLargestRun: { minX: 1766, maxX: 1786, widthCells: 21 },
          fullHeightColumnCount: 21 },
      },
    });
  });

  it('proves halo, wet, gravity, N06, and complete non-target plane preservation', () => {
    expect(readJson(QA)).toMatchObject({
      postState: { preservation: {
        unchangedNonTargetPlaneCellCount: 1225, nonTargetPlaneDriftCount: 0,
        unchangedSelectedHaloCellCount: 350, selectedHaloDriftCount: 0,
        unchangedFullPlaneHaloCellCount: 3150, fullPlaneHaloDriftCount: 0,
        retainedWetPlaneCellCount: 6, wetPlaneDriftCount: 0,
        retainedFullPlaneHaloGravelCount: 68, haloGravelDriftCount: 0,
        retainedN06BlockedCellCount: 4, n06DriftCount: 0,
        postBlockEntityCount: 0, postSavedEntityCount: 0, undeclaredDriftCount: 0,
      } },
      commissioningBoundary: { boundedStaticCentralEastSegmentAccepted: true,
        completeNorthSmokeBoundaryBuilt: false, passiveNorthSmokeBoundaryCommissioned: false,
        poweredSmokeControlCommissioned: false, wetOrGravityInterfaceOpened: false,
        n06Touched: false, publicRouteCommissioned: false },
    });
  });

  it('verifies wrapper stages, strict journals, and exact reverse rollback', () => {
    expect(readJson(QA).executionEvidence).toMatchObject({
      stageOrder: { expectedStageCount: 24, actualStageCount: 24, exact: true, allPass: true },
      strictForwardExecution: { packageCount: 2, successfulCommandCount: 147,
        failedCommandCount: 0, noopCommandCount: 0, passed: true },
      journals: { packageCount: 2, totalEventCount: 306, allCompleteAndOperationBound: true },
      reverseRollbackPoststatePreflight: { packageCount: 2, passedGuardCount: 147,
        failedGuardCount: 0, passed: true },
    });
  });

  it('binds the independent QA payload and bounded construction seal', () => {
    const qa = readJson(QA);
    const qaPayload = { ...qa };
    delete qaPayload.qaPayloadSha256;
    expect(crypto.createHash('sha256').update(JSON.stringify(qaPayload)).digest('hex'))
      .toBe(qa.qaPayloadSha256);
    expect(qa.qaPayloadSha256).toBe('0cb642b134734a3bc6bd1fa226312100864cf6442afe358a6f93c4887f676644');
    const seal = readJson(SEAL);
    const sealPayload = { ...seal };
    delete sealPayload.commissioningSealSha256;
    expect(crypto.createHash('sha256').update(JSON.stringify(sealPayload)).digest('hex'))
      .toBe(seal.commissioningSealSha256);
    expect(seal).toMatchObject({
      status: 'PASS_R08Z_BOUNDED_NORTH_SMOKE_CENTRAL_EAST_SEGMENT_ACCEPTED',
      constructionScope: { exactTransitionCount: 147, fullHeightSegmentCellCount: 147,
        widthCells: 21, heightCells: 7, stoneBrickWallCellCount: 138,
        polishedDeepslateStaticCapCellCount: 9, unchangedInteractionHaloCellCount: 350,
        boundedStaticCentralEastSegmentAccepted: true, completeNorthSmokeBoundaryBuilt: false },
      retainedInterfaces: { wetPlaneCellCount: 6, fullPlaneHaloGravelCellCount: 68,
        n06BlockedCellCount: 4, priorBoundedSegmentCellCount: 826, allUnchanged: true },
      rollback: { exactGuardCount: 147, poststatePreflightPassed: true },
      commissioningSealSha256: 'f40cb76e2208ec05e9fa5157cdc61a56ab23d6d58107fd1fb2a529eb5a0fc5e7',
    });
  });
});

