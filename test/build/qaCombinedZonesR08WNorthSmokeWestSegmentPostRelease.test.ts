import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/qa_combined_zones_r08w_north_smoke_west_segment_post_release.mjs');
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r08w-live-20260821T234958Z');
const QA = path.join(EVIDENCE, 'r08w-post-release-qa.json');
const SEAL = path.join(EVIDENCE, 'r08w-bounded-north-smoke-west-segment-seal.json');
const NEGATIVE = path.join(EVIDENCE, 'r08w-superseded-pre-mutation-schema-rejection.json');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'r08w-post-qa-'));
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const tempQa = path.join(temp, 'qa.json');
const tempMd = path.join(temp, 'qa.md');
const tempSeal = path.join(temp, 'seal.json');
const tempSealMd = path.join(temp, 'seal.md');
const tempNegative = path.join(temp, 'negative.json');

beforeAll(() => {
  execFileSync(process.execPath, [SCRIPT, '--generated-at', '2026-08-21T23:56:30Z',
    '--out', tempQa, '--markdown', tempMd, '--seal-out', tempSeal,
    '--seal-markdown', tempSealMd, '--negative-out', tempNegative],
  { cwd: ROOT, stdio: 'pipe' });
}, 30_000);
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('Combined Zones R08W north-smoke west-segment post-release QA', () => {
  it('reproduces all canonical QA, seal, and negative-evidence artifacts deterministically', () => {
    expect(fs.readFileSync(tempQa)).toEqual(fs.readFileSync(QA));
    expect(fs.readFileSync(tempSeal)).toEqual(fs.readFileSync(SEAL));
    expect(fs.readFileSync(tempNegative)).toEqual(fs.readFileSync(NEGATIVE));
    expect(fs.readFileSync(tempMd)).toEqual(fs.readFileSync(path.join(EVIDENCE,
      'r08w-post-release-qa.md')));
    expect(fs.readFileSync(tempSealMd)).toEqual(fs.readFileSync(path.join(EVIDENCE,
      'r08w-bounded-north-smoke-west-segment-seal.md')));
  });

  it('binds the immutable ledger, source/post saves, MVP contract, and completed identity', () => {
    expect(readJson(QA)).toMatchObject({
      status: 'PASS_R08W_NORTH_SMOKE_WEST_SEGMENT_POST_RELEASE_ACCEPTED',
      release: {
        transactionId: 'combined-zones-r08w-empty-eight-north-smoke-west-segment',
        manifestIdentity: '1cd4fba750151fa84fec74494a7e480ccbb9e9e6e1cad15abb81d1262a062a52',
        sourceBoundReleaseIdentitySha256: '0e75b7baa04cb7464cf16957c039c5342ce1a5d174aaa94d23eaafbd669106da',
        executionBindingSha256: '67d439d3f3ca5fdd7d46d5bacb29ce640d2269fe97ae83d50877b9f9cdc1a6da',
        completedReleaseIdentitySha256: 'cf24047e94f4e7f1eaac0064f83675b4d1bbeac9b0ad2970b9ee398141a168b1',
      },
      bindings: {
        ledger: { sha256: '2216c368df910c1b19001d6166ed510bed69b9a656aaa705b91ffcf280aa3667' },
        manifest: { sha256: '5564a29a1abec6d3a2dc2907016337ab5ec413856443c9a4e73849e6a4463957' },
        sourceCompleteSave: { completeSaveSha256: 'e002a6589f693fa4e2cdfa3b184cce101ea65dba876cdd91339f974c0f9cdba6',
          regionSnapshotSha256: 'e4d403991a6c7ebb89cf8b36d4edb102e123c71deeeb3fb95a4a2b5375e6340f' },
        postCompleteSave: { completeSaveSha256: 'fb0bc8910c8176f0e1a5aa4c4fa85e5857a6b131fd647d54a11d0a83a58ec377',
          regionSnapshotSha256: '095d596d823559e2790260e20d26338e1745c442374216f5e505818ead419244' },
        ledgerEvidence: { declaredBindingCount: 25, matchingBindingCount: 25, mismatchCount: 0 },
      },
    });
  });

  it('verifies all targets, full-height maximal geometry, materials, and static cap', () => {
    expect(readJson(QA)).toMatchObject({
      geometry: {
        fullFrozenNorthPlane: { cellCount: 1372 },
        maximalSelectedWestSegment: { cellCount: 350, widthCells: 50, heightCells: 7,
          fullHeight: true, componentCount: 1, largestComponentCellCount: 350,
          coordinateSetSha256: '47fa07b21a343459fb45aeaef5cdd76bf0052976ad6100c3a8faa990f269b50f' },
        wallField: { cellCount: 341 },
        closedStaticCap: { cellCount: 9, widthCells: 3, heightCells: 3,
          componentCount: 1, largestComponentCellCount: 9 },
        selectedInteractionHalo: { cellCount: 814,
          coordinateSetSha256: '3163bea44edcf8f2543e81dd845af2f0e7dd7b3f3cbdf0c0263e0fe7accf780f' },
        fullPlaneInteractionHalo: { cellCount: 3150 },
      },
      postState: {
        exactTransitions: { expectedCellCount: 350, matchingCellCount: 350,
          mismatchCellCount: 0, stoneBrickWallCount: 341,
          polishedDeepslateCapCount: 9, materialMismatchCount: 0 },
        maximality: { exactRankedCleanRunsReproduced: true,
          selectedLargestRun: { minX: 1652, maxX: 1701, widthCells: 50 },
          fullHeightColumnCount: 50 },
      },
    });
  });

  it('proves halo, wet, gravity, N06, and complete non-target plane preservation', () => {
    expect(readJson(QA)).toMatchObject({
      postState: { preservation: {
        unchangedNonTargetPlaneCellCount: 1022, nonTargetPlaneDriftCount: 0,
        unchangedSelectedHaloCellCount: 814, selectedHaloDriftCount: 0,
        unchangedFullPlaneHaloCellCount: 3150, fullPlaneHaloDriftCount: 0,
        retainedWetPlaneCellCount: 6, wetPlaneDriftCount: 0,
        retainedFullPlaneHaloGravelCount: 68, haloGravelDriftCount: 0,
        retainedN06BlockedCellCount: 4, n06DriftCount: 0,
        postBlockEntityCount: 0, postSavedEntityCount: 0, undeclaredDriftCount: 0,
      } },
      commissioningBoundary: { boundedStaticWestSegmentAccepted: true,
        completeNorthSmokeBoundaryBuilt: false, passiveNorthSmokeBoundaryCommissioned: false,
        poweredSmokeControlCommissioned: false, wetOrGravityInterfaceOpened: false,
        n06Touched: false, publicRouteCommissioned: false },
    });
  });

  it('verifies wrapper stages, strict journals, and exact reverse rollback', () => {
    expect(readJson(QA).executionEvidence).toMatchObject({
      stageOrder: { expectedStageCount: 24, actualStageCount: 24, exact: true, allPass: true },
      strictForwardExecution: { packageCount: 2, successfulCommandCount: 350,
        failedCommandCount: 0, noopCommandCount: 0, passed: true },
      journals: { packageCount: 2, totalEventCount: 712, allCompleteAndOperationBound: true },
      reverseRollbackPoststatePreflight: { packageCount: 2, passedGuardCount: 350,
        failedGuardCount: 0, passed: true },
    });
  });

  it('retains the first rejection as superseded negative evidence and seals the corrected release', () => {
    const negative = readJson(NEGATIVE);
    expect(negative).toMatchObject({
      status: 'SUPERSEDED_PRE_MUTATION_SCHEMA_REJECTION_RECORDED',
      initialAttempt: { manifestFullFileSha256: '235729e2fa6c3036f7e309c6a6a9874c9b305aa35b7f58479766eb5433b230d7',
        manifestPayloadIdentitySha256: '67b4e52fdfab846c7ffae64df981081d8e0a727f6438ee349359e3bf899cf2ad',
        rejection: 'release manifest must declare mvpScope true',
        reachedEvidenceDirectoryCreation: false, reachedSnapshotCapture: false,
        reachedRconExecution: false, worldMutationPerformed: false },
      supersededBy: { correctedMvpScope: true,
        correctedScopeIds: ['OWN-D06-SMOKE', 'Z02-U1-CONCOURSE-MALL'],
        completedReleaseIdentitySha256: 'cf24047e94f4e7f1eaac0064f83675b4d1bbeac9b0ad2970b9ee398141a168b1' },
    });
    const qa = readJson(QA);
    const qaPayload = { ...qa };
    delete qaPayload.qaPayloadSha256;
    expect(crypto.createHash('sha256').update(JSON.stringify(qaPayload)).digest('hex'))
      .toBe(qa.qaPayloadSha256);
    expect(qa.qaPayloadSha256).toBe('f3cfbc07db04a4ad5fffe49f1ecc4c8eef7833d57d5819fa247b49e954a551e5');
    const seal = readJson(SEAL);
    const sealPayload = { ...seal };
    delete sealPayload.commissioningSealSha256;
    expect(crypto.createHash('sha256').update(JSON.stringify(sealPayload)).digest('hex'))
      .toBe(seal.commissioningSealSha256);
    expect(seal).toMatchObject({
      status: 'PASS_R08W_BOUNDED_NORTH_SMOKE_WEST_SEGMENT_ACCEPTED',
      constructionScope: { exactTransitionCount: 350, fullHeightSegmentCellCount: 350,
        widthCells: 50, heightCells: 7, stoneBrickWallCellCount: 341,
        polishedDeepslateStaticCapCellCount: 9, unchangedInteractionHaloCellCount: 814,
        boundedStaticWestSegmentAccepted: true, completeNorthSmokeBoundaryBuilt: false },
      retainedInterfaces: { wetPlaneCellCount: 6, fullPlaneHaloGravelCellCount: 68,
        n06BlockedCellCount: 4, allUnchanged: true },
      rollback: { exactGuardCount: 350, poststatePreflightPassed: true },
      commissioningSealSha256: '1d0233f85699c9bd20b966bdf9fb22caec7551391e516124eec504b0f46d4fdb',
    });
  });
});
