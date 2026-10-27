import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/qa_combined_zones_r08y_north_smoke_central_west_segment_post_release.mjs');
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r08y-live-20260822T002056Z');
const QA = path.join(EVIDENCE, 'r08y-post-release-qa.json');
const SEAL = path.join(EVIDENCE, 'r08y-bounded-north-smoke-central-west-segment-seal.json');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'r08y-post-qa-'));
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const tempQa = path.join(temp, 'qa.json');
const tempMd = path.join(temp, 'qa.md');
const tempSeal = path.join(temp, 'seal.json');
const tempSealMd = path.join(temp, 'seal.md');

beforeAll(() => {
  execFileSync(process.execPath, [SCRIPT, '--generated-at', '2026-08-22T00:25:00Z',
    '--out', tempQa, '--markdown', tempMd, '--seal-out', tempSeal,
    '--seal-markdown', tempSealMd],
  { cwd: ROOT, stdio: 'pipe' });
}, 30_000);
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('Combined Zones R08Y north-smoke central-west-segment post-release QA', () => {
  it('reproduces all canonical QA and seal artifacts deterministically', () => {
    expect(fs.readFileSync(tempQa)).toEqual(fs.readFileSync(QA));
    expect(fs.readFileSync(tempSeal)).toEqual(fs.readFileSync(SEAL));
    expect(fs.readFileSync(tempMd)).toEqual(fs.readFileSync(path.join(EVIDENCE,
      'r08y-post-release-qa.md')));
    expect(fs.readFileSync(tempSealMd)).toEqual(fs.readFileSync(path.join(EVIDENCE,
      'r08y-bounded-north-smoke-central-west-segment-seal.md')));
  });

  it('binds the immutable ledger, source/post saves, MVP contract, and completed identity', () => {
    expect(readJson(QA)).toMatchObject({
      status: 'PASS_R08Y_NORTH_SMOKE_CENTRAL_WEST_SEGMENT_POST_RELEASE_ACCEPTED',
      release: {
        transactionId: 'combined-zones-r08y-empty-eight-north-smoke-central-west-segment',
        manifestIdentity: 'e6478ea5acb3487c76e925241efbbdba0ea3432dc3942703410778a3263636a6',
        sourceBoundReleaseIdentitySha256: '133b33361b0d5100f8c9fd88d4d2f1c35ba633f3249800856d3e724566172df8',
        executionBindingSha256: '2aeeaba2cc39d3b1b6a2717d0eebaa09d1f91101e2edda0b2164b1c65c9f4a50',
        completedReleaseIdentitySha256: '319ca6769a42d7e809e981cdc9ae1e2cbbab86f4ca1fcb26fc7bd3390d0dacdd',
      },
      bindings: {
        ledger: { sha256: '6320acfcb0ec92f970058166071a6cf77e0262eff320665647e2c8851d0035b0' },
        manifest: { sha256: '8ebbc9e5f300655be41b1ed72ac8e3c83cac00c7c8bbd484107a4a10bcf69a8e' },
        sourceCompleteSave: { completeSaveSha256: '70eca26deeff6d5dd76e55dcaaae18b28fa0d8f43403fb42cb51aa40c42e25a5',
          regionSnapshotSha256: '5e6c95b5bb62bc580b9eeb7382e8f1c051770eb0965bbf98bcdb3b24a9bd8ed4' },
        postCompleteSave: { completeSaveSha256: '0c33e28a59ed52c668f3989a2db9e8b2b0a549d63e3447a1dd04f444810e7196',
          regionSnapshotSha256: '805a90e09710c3a045a292aeefbacb3960ac86d719191da6a563cede6cdbc1a0' },
        ledgerEvidence: { declaredBindingCount: 25, matchingBindingCount: 25, mismatchCount: 0 },
      },
    });
  });

  it('verifies all targets, full-height maximal geometry, materials, and static cap', () => {
    expect(readJson(QA)).toMatchObject({
      geometry: {
        fullFrozenNorthPlane: { cellCount: 1372 },
        maximalSelectedCentralWestSegment: { cellCount: 231, widthCells: 33, heightCells: 7,
          fullHeight: true, componentCount: 1, largestComponentCellCount: 231,
          coordinateSetSha256: '5cb6cc1c0e3dbfced74768d6b7ffaeb0cef4874f796c4d5fa0fc21a8af6e620f' },
        wallField: { cellCount: 222 },
        closedStaticCap: { cellCount: 9, widthCells: 3, heightCells: 3,
          componentCount: 1, largestComponentCellCount: 9 },
        selectedInteractionHalo: { cellCount: 542,
          coordinateSetSha256: '8db77eba7b8ecf12d84c7e3aff8125594e4a8556367e014355ff306f016e2f1f' },
        fullPlaneInteractionHalo: { cellCount: 3150 },
      },
      postState: {
        exactTransitions: { expectedCellCount: 231, matchingCellCount: 231,
          mismatchCellCount: 0, stoneBrickWallCount: 222,
          polishedDeepslateCapCount: 9, materialMismatchCount: 0 },
        maximality: { exactRankedCleanRunsReproduced: true,
          selectedLargestRun: { minX: 1703, maxX: 1735, widthCells: 33 },
          fullHeightColumnCount: 33 },
      },
    });
  });

  it('proves halo, wet, gravity, N06, and complete non-target plane preservation', () => {
    expect(readJson(QA)).toMatchObject({
      postState: { preservation: {
        unchangedNonTargetPlaneCellCount: 1141, nonTargetPlaneDriftCount: 0,
        unchangedSelectedHaloCellCount: 542, selectedHaloDriftCount: 0,
        unchangedFullPlaneHaloCellCount: 3150, fullPlaneHaloDriftCount: 0,
        retainedWetPlaneCellCount: 6, wetPlaneDriftCount: 0,
        retainedFullPlaneHaloGravelCount: 68, haloGravelDriftCount: 0,
        retainedN06BlockedCellCount: 4, n06DriftCount: 0,
        postBlockEntityCount: 0, postSavedEntityCount: 0, undeclaredDriftCount: 0,
      } },
      commissioningBoundary: { boundedStaticCentralWestSegmentAccepted: true,
        completeNorthSmokeBoundaryBuilt: false, passiveNorthSmokeBoundaryCommissioned: false,
        poweredSmokeControlCommissioned: false, wetOrGravityInterfaceOpened: false,
        n06Touched: false, publicRouteCommissioned: false },
    });
  });

  it('verifies wrapper stages, strict journals, and exact reverse rollback', () => {
    expect(readJson(QA).executionEvidence).toMatchObject({
      stageOrder: { expectedStageCount: 24, actualStageCount: 24, exact: true, allPass: true },
      strictForwardExecution: { packageCount: 2, successfulCommandCount: 231,
        failedCommandCount: 0, noopCommandCount: 0, passed: true },
      journals: { packageCount: 2, totalEventCount: 474, allCompleteAndOperationBound: true },
      reverseRollbackPoststatePreflight: { packageCount: 2, passedGuardCount: 231,
        failedGuardCount: 0, passed: true },
    });
  });

  it('binds the independent QA payload and bounded construction seal', () => {
    const qa = readJson(QA);
    const qaPayload = { ...qa };
    delete qaPayload.qaPayloadSha256;
    expect(crypto.createHash('sha256').update(JSON.stringify(qaPayload)).digest('hex'))
      .toBe(qa.qaPayloadSha256);
    expect(qa.qaPayloadSha256).toBe('1c0a5784b34433c2873e7bd850ec5ccfe5ca0e88f646c56829916671004b173a');
    const seal = readJson(SEAL);
    const sealPayload = { ...seal };
    delete sealPayload.commissioningSealSha256;
    expect(crypto.createHash('sha256').update(JSON.stringify(sealPayload)).digest('hex'))
      .toBe(seal.commissioningSealSha256);
    expect(seal).toMatchObject({
      status: 'PASS_R08Y_BOUNDED_NORTH_SMOKE_CENTRAL_WEST_SEGMENT_ACCEPTED',
      constructionScope: { exactTransitionCount: 231, fullHeightSegmentCellCount: 231,
        widthCells: 33, heightCells: 7, stoneBrickWallCellCount: 222,
        polishedDeepslateStaticCapCellCount: 9, unchangedInteractionHaloCellCount: 542,
        boundedStaticCentralWestSegmentAccepted: true, completeNorthSmokeBoundaryBuilt: false },
      retainedInterfaces: { wetPlaneCellCount: 6, fullPlaneHaloGravelCellCount: 68,
        n06BlockedCellCount: 4, allUnchanged: true },
      rollback: { exactGuardCount: 231, poststatePreflightPassed: true },
      commissioningSealSha256: 'b18f5e9f5d5e23171eeed47b60de5cad19f4bac2c0823eb5e10971f908b6b1ca',
    });
  });
});

