import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/qa_combined_zones_r08x_north_smoke_east_segment_post_release.mjs');
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r08x-live-20260822T000635Z');
const QA = path.join(EVIDENCE, 'r08x-post-release-qa.json');
const SEAL = path.join(EVIDENCE, 'r08x-bounded-north-smoke-east-segment-seal.json');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'r08x-post-qa-'));
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const tempQa = path.join(temp, 'qa.json');
const tempMd = path.join(temp, 'qa.md');
const tempSeal = path.join(temp, 'seal.json');
const tempSealMd = path.join(temp, 'seal.md');

beforeAll(() => {
  execFileSync(process.execPath, [SCRIPT, '--generated-at', '2026-08-22T00:12:00Z',
    '--out', tempQa, '--markdown', tempMd, '--seal-out', tempSeal,
    '--seal-markdown', tempSealMd],
  { cwd: ROOT, stdio: 'pipe' });
}, 30_000);
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('Combined Zones R08X north-smoke east-segment post-release QA', () => {
  it('reproduces all canonical QA and seal artifacts deterministically', () => {
    expect(fs.readFileSync(tempQa)).toEqual(fs.readFileSync(QA));
    expect(fs.readFileSync(tempSeal)).toEqual(fs.readFileSync(SEAL));
    expect(fs.readFileSync(tempMd)).toEqual(fs.readFileSync(path.join(EVIDENCE,
      'r08x-post-release-qa.md')));
    expect(fs.readFileSync(tempSealMd)).toEqual(fs.readFileSync(path.join(EVIDENCE,
      'r08x-bounded-north-smoke-east-segment-seal.md')));
  });

  it('binds the immutable ledger, source/post saves, MVP contract, and completed identity', () => {
    expect(readJson(QA)).toMatchObject({
      status: 'PASS_R08X_NORTH_SMOKE_EAST_SEGMENT_POST_RELEASE_ACCEPTED',
      release: {
        transactionId: 'combined-zones-r08x-empty-eight-north-smoke-east-segment',
        manifestIdentity: '56daf423a9603e23342d1a3d7e1b6ac0677e4daaf28d38ba5a6bcc5b95f1ce3d',
        sourceBoundReleaseIdentitySha256: '59b821111799fd7a6b77abb37a52e11acd38f9f3279138f8ce48b6f59a2027d2',
        executionBindingSha256: 'dd949b32096db59e0d1582d53c31fb5cd283a2ff3bac30ec4c7aa6f5ae0be68f',
        completedReleaseIdentitySha256: 'f149d854213ece928bebc1c13f2c8973ab7f8770a1406eb3e00aee529ba6cf45',
      },
      bindings: {
        ledger: { sha256: '7a7fd819ef6ee8e7bc597e3314e989decde4b0b22ae4f0a96e98e138b7d46588' },
        manifest: { sha256: '65a3f38609b7dc5f78bed68ee1ba7fc376a9b30552b41d0d8c69f6a0f98c3843' },
        sourceCompleteSave: { completeSaveSha256: '0238c0254800088810e95ecd2373d874c1787d7f5a1d0c4d5bf5ec15180e8216',
          regionSnapshotSha256: '482b9d99ffededb2571b38f6a5e02376409b822ef6d3cd5348b707c44b8e1b4f' },
        postCompleteSave: { completeSaveSha256: 'be415f76248cc94f8358f4dd2553231726234450e5e4d5102667559a6329ce56',
          regionSnapshotSha256: 'd3ecb8a0e8c8080de4469dcb4bee84369fd9ec99afe5cd32a086afec4d995e87' },
        ledgerEvidence: { declaredBindingCount: 25, matchingBindingCount: 25, mismatchCount: 0 },
      },
    });
  });

  it('verifies all targets, full-height maximal geometry, materials, and static cap', () => {
    expect(readJson(QA)).toMatchObject({
      geometry: {
        fullFrozenNorthPlane: { cellCount: 1372 },
        maximalSelectedEastSegment: { cellCount: 245, widthCells: 35, heightCells: 7,
          fullHeight: true, componentCount: 1, largestComponentCellCount: 245,
          coordinateSetSha256: '9e8de5d464314c54f77a11524cb419e0d23ce55075363bf447b64f0eb59a47f8' },
        wallField: { cellCount: 236 },
        closedStaticCap: { cellCount: 9, widthCells: 3, heightCells: 3,
          componentCount: 1, largestComponentCellCount: 9 },
        selectedInteractionHalo: { cellCount: 574,
          coordinateSetSha256: 'dcf41fc61999c20282b8b23b5915c13679b8546349eeffb5988f90c97f301d13' },
        fullPlaneInteractionHalo: { cellCount: 3150 },
      },
      postState: {
        exactTransitions: { expectedCellCount: 245, matchingCellCount: 245,
          mismatchCellCount: 0, stoneBrickWallCount: 236,
          polishedDeepslateCapCount: 9, materialMismatchCount: 0 },
        maximality: { exactRankedCleanRunsReproduced: true,
          selectedLargestRun: { minX: 1798, maxX: 1832, widthCells: 35 },
          fullHeightColumnCount: 35 },
      },
    });
  });

  it('proves halo, wet, gravity, N06, and complete non-target plane preservation', () => {
    expect(readJson(QA)).toMatchObject({
      postState: { preservation: {
        unchangedNonTargetPlaneCellCount: 1127, nonTargetPlaneDriftCount: 0,
        unchangedSelectedHaloCellCount: 574, selectedHaloDriftCount: 0,
        unchangedFullPlaneHaloCellCount: 3150, fullPlaneHaloDriftCount: 0,
        retainedWetPlaneCellCount: 6, wetPlaneDriftCount: 0,
        retainedFullPlaneHaloGravelCount: 68, haloGravelDriftCount: 0,
        retainedN06BlockedCellCount: 4, n06DriftCount: 0,
        postBlockEntityCount: 0, postSavedEntityCount: 0, undeclaredDriftCount: 0,
      } },
      commissioningBoundary: { boundedStaticEastSegmentAccepted: true,
        completeNorthSmokeBoundaryBuilt: false, passiveNorthSmokeBoundaryCommissioned: false,
        poweredSmokeControlCommissioned: false, wetOrGravityInterfaceOpened: false,
        n06Touched: false, publicRouteCommissioned: false },
    });
  });

  it('verifies wrapper stages, strict journals, and exact reverse rollback', () => {
    expect(readJson(QA).executionEvidence).toMatchObject({
      stageOrder: { expectedStageCount: 24, actualStageCount: 24, exact: true, allPass: true },
      strictForwardExecution: { packageCount: 2, successfulCommandCount: 245,
        failedCommandCount: 0, noopCommandCount: 0, passed: true },
      journals: { packageCount: 2, totalEventCount: 502, allCompleteAndOperationBound: true },
      reverseRollbackPoststatePreflight: { packageCount: 2, passedGuardCount: 245,
        failedGuardCount: 0, passed: true },
    });
  });

  it('binds the independent QA payload and bounded construction seal', () => {
    const qa = readJson(QA);
    const qaPayload = { ...qa };
    delete qaPayload.qaPayloadSha256;
    expect(crypto.createHash('sha256').update(JSON.stringify(qaPayload)).digest('hex'))
      .toBe(qa.qaPayloadSha256);
    expect(qa.qaPayloadSha256).toBe('d7a1099e605cf1eed5e59620af7db908a34a29b635e7277c418fc5c3d72ae8eb');
    const seal = readJson(SEAL);
    const sealPayload = { ...seal };
    delete sealPayload.commissioningSealSha256;
    expect(crypto.createHash('sha256').update(JSON.stringify(sealPayload)).digest('hex'))
      .toBe(seal.commissioningSealSha256);
    expect(seal).toMatchObject({
      status: 'PASS_R08X_BOUNDED_NORTH_SMOKE_EAST_SEGMENT_ACCEPTED',
      constructionScope: { exactTransitionCount: 245, fullHeightSegmentCellCount: 245,
        widthCells: 35, heightCells: 7, stoneBrickWallCellCount: 236,
        polishedDeepslateStaticCapCellCount: 9, unchangedInteractionHaloCellCount: 574,
        boundedStaticEastSegmentAccepted: true, completeNorthSmokeBoundaryBuilt: false },
      retainedInterfaces: { wetPlaneCellCount: 6, fullPlaneHaloGravelCellCount: 68,
        n06BlockedCellCount: 4, allUnchanged: true },
      rollback: { exactGuardCount: 245, poststatePreflightPassed: true },
      commissioningSealSha256: '050cb8dbccfd7567bf5678f9871e304a5aed8b5ec41cd9d813839b75098e63cc',
    });
  });
});
