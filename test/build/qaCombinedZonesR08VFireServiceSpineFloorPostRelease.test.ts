import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/qa_combined_zones_r08v_fire_service_spine_floor_post_release.mjs');
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r08v-live-20260821T232156Z');
const QA = path.join(EVIDENCE, 'r08v-post-release-qa.json');
const SEAL = path.join(EVIDENCE, 'r08v-bounded-spine-construction-seal.json');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'r08v-post-qa-'));
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const tempQa = path.join(temp, 'qa.json');
const tempMd = path.join(temp, 'qa.md');
const tempSeal = path.join(temp, 'seal.json');
const tempSealMd = path.join(temp, 'seal.md');

beforeAll(() => {
  execFileSync(process.execPath, [SCRIPT, '--generated-at', '2026-08-21T23:25:00Z',
    '--out', tempQa, '--markdown', tempMd, '--seal-out', tempSeal,
    '--seal-markdown', tempSealMd], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('Combined Zones R08V fire/service-spine floor post-release QA', () => {
  it('reproduces all canonical QA and seal artifacts deterministically', () => {
    expect(fs.readFileSync(tempQa)).toEqual(fs.readFileSync(QA));
    expect(fs.readFileSync(tempSeal)).toEqual(fs.readFileSync(SEAL));
    expect(fs.readFileSync(tempMd)).toEqual(fs.readFileSync(path.join(EVIDENCE, 'r08v-post-release-qa.md')));
    expect(fs.readFileSync(tempSealMd)).toEqual(fs.readFileSync(path.join(EVIDENCE,
      'r08v-bounded-spine-construction-seal.md')));
  });

  it('binds the immutable ledger, source/post saves, and completed identity', () => {
    expect(readJson(QA)).toMatchObject({
      status: 'PASS_R08V_FIRE_SERVICE_SPINE_FLOOR_POST_RELEASE_ACCEPTED',
      release: {
        transactionId: 'combined-zones-r08v-empty-eight-fire-service-spine-floor',
        manifestIdentity: '354ee10ad5e1cd9b3714f67f5b9909eb20fdf2f945c3cf6cfe9c4058e8ad85c0',
        sourceBoundReleaseIdentitySha256: '19f103f4d801f98c83e2ee11ffc094babbd2e0ce4b3b5018f653b32a5e9d9738',
        executionBindingSha256: 'ec70ec751665d48e74e88d407e71580f237d27fee8e2fa19df47d6c503a0bc74',
        completedReleaseIdentitySha256: '849d0c719b007c1def5e12b55aabb72776e0ebcb7fd02dbf7a404ce55dca7a5b',
      },
      bindings: {
        ledger: { sha256: 'a0d93035f944949ba6ae1dbc237e8da738aecf713fd6facbed8967835db05110' },
        manifest: { sha256: 'fec04d98120b6321693678f45502582274a535a17ae2684f21171fa05fb12ef6' },
        sourceCompleteSave: {
          completeSaveSha256: '89d2240ad0c7913dc21bdcb135e5de91f6bc3039b7b9fb60fc9ac7d180d915ff',
          regionSnapshotSha256: 'cffed1a9109c35eff92dba21a12902d1d253789d8782add362fb936e258d5677',
        },
        postCompleteSave: {
          completeSaveSha256: 'b7f411e164b1f3d005d8d116085a0e258153a1388910a9e5751350cc75a6e44c',
          regionSnapshotSha256: '39a235a7bdd40493a848bffaf5e7ca1bb738ac9e19e2bd5c43b7248277b6d2ed',
        },
        ledgerEvidence: { declaredBindingCount: 25, matchingBindingCount: 25, mismatchCount: 0 },
      },
    });
  });

  it('verifies exact targets and the connected bounded-space geometry', () => {
    expect(readJson(QA)).toMatchObject({
      geometry: {
        operatedUnion: { cellCount: 525,
          coordinateSetSha256: 'd0e24bc3d10d55cb6c263a4d185c03049d1d1d591046cc090a8aa31d2da2a10b' },
        connectedFloor: { cellCount: 495, componentCount: 1, largestComponentCellCount: 495,
          widthCells: 5, lengthCells: 99, maxStepCells: 0 },
        closedStaticEnds: { cellCount: 50 }, minimumThreeBlockHeadroom: { cellCount: 1485 },
        frozenFireServiceSpine: { cellCount: 3025 }, interactionHalo: { cellCount: 1271 },
      },
      postState: {
        exactTransitions: { expectedCellCount: 525, matchingCellCount: 525, mismatchCellCount: 0,
          containmentStoneBrickCount: 30, floorPolishedBlackstoneCount: 495 },
        boundedSpace: { connectedFloorCellCount: 495, connectedComponentCount: 1,
          maximumStepCells: 0, headroomAirCount: 1485, headroomMismatchCount: 0,
          closedEndCellCount: 50, endMismatchCount: 0 },
      },
    });
  });

  it('proves full scope, halo, caps, gravity, wet-smoke, and N06 preservation', () => {
    expect(readJson(QA)).toMatchObject({
      postState: {
        preservation: { unchangedNonTargetSpineCellCount: 2500, nonTargetSpineDriftCount: 0,
          unchangedInteractionHaloCount: 1271, interactionHaloDriftCount: 0,
          unchangedMarkerLayerCount: 495, markerLayerDriftCount: 0,
          unchangedCeilingCount: 495, ceilingDriftCount: 0,
          unchangedSideContainmentCount: 594, sideContainmentDriftCount: 0,
          retainedPassiveCapCount: 131, retainedPassiveCapDriftCount: 0,
          retainedR08TSouthBoundaryCount: 1372, retainedR08TSouthBoundaryDriftCount: 0,
          wetNorthSmokeCellCount: 6, wetNorthSmokeDriftCount: 0,
          northSmokeUndeclaredDriftCount: 0, n06BlockedCellCount: 4, n06DriftCount: 0,
          postBlockEntityCount: 0, postSavedEntityCount: 0, undeclaredDriftCount: 0 },
        gravitySupport: { retainedHaloGravelCount: 25, violationCount: 0,
          allDurablySupportedAndUnaffected: true, exactDurableRollbackReady: true },
      },
      commissioningBoundary: { boundedConnectedInteriorConstructionAccepted: true,
        publicRouteCommissioned: false, fireServiceRouteCommissioned: false,
        egBSpineInterfaceOpened: false, northSmokeSystemCommissioned: false,
        wetNorthSmokeCellsTouched: false, n06Touched: false, activeMechanismsTouched: false,
        tenantOpeningsTouched: false, drainageHeaderOrExternalDischargeOpened: false },
    });
  });

  it('verifies strict execution, reverse rollback, and payload-bound construction seal', () => {
    const qa = readJson(QA);
    const qaPayload = { ...qa };
    delete qaPayload.qaPayloadSha256;
    expect(crypto.createHash('sha256').update(JSON.stringify(qaPayload)).digest('hex'))
      .toBe(qa.qaPayloadSha256);
    expect(qa.qaPayloadSha256).toBe('3abcab105ee33c16935d522a074ade8c2bbe3faad1bd7e73a3af5e45002e8e5a');
    expect(qa.executionEvidence).toMatchObject({
      stageOrder: { expectedStageCount: 24, actualStageCount: 24, exact: true, allPass: true },
      strictForwardExecution: { packageCount: 2, successfulCommandCount: 525,
        failedCommandCount: 0, noopCommandCount: 0, passed: true },
      reverseRollbackPoststatePreflight: { packageCount: 2, passedGuardCount: 525,
        failedGuardCount: 0, passed: true },
    });
    const seal = readJson(SEAL);
    const sealPayload = { ...seal };
    delete sealPayload.commissioningSealSha256;
    expect(crypto.createHash('sha256').update(JSON.stringify(sealPayload)).digest('hex'))
      .toBe(seal.commissioningSealSha256);
    expect(seal).toMatchObject({
      status: 'PASS_R08V_BOUNDED_FIRE_SERVICE_SPINE_CONSTRUCTION_ACCEPTED',
      constructionScope: { connectedFloorCellCount: 495, closedStaticEndCellCount: 50,
        minimumHeadroomAirCellCount: 1485, retainedPassiveCapCellCount: 131,
        retainedHaloGravelCellCount: 25, boundedInteriorConstructionAccepted: true,
        publicRouteCommissioned: false, fireServiceRouteCommissioned: false,
        externalInterfaceOpened: false },
      rollback: { exactGuardCount: 525, poststatePreflightPassed: true },
      commissioningSealSha256: '5b7fef0756f2bc879d5a9b9cd9b755e2abf90e061e9ecd0dd8107eaedaf168b9',
    });
  });
});
