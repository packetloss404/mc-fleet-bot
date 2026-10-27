import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/qa_combined_zones_r08u_internal_vent_caps_post_release.mjs');
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r08u-live-20260821T201019Z');
const QA = path.join(EVIDENCE, 'r08u-post-release-qa.json');
const SEAL = path.join(EVIDENCE, 'r08u-ventilation-passive-cap-commissioning-seal.json');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'r08u-post-qa-'));
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const tempQa = path.join(temp, 'qa.json');
const tempMd = path.join(temp, 'qa.md');
const tempSeal = path.join(temp, 'seal.json');
const tempSealMd = path.join(temp, 'seal.md');

beforeAll(() => {
  execFileSync(process.execPath, [SCRIPT, '--generated-at', '2026-08-21T20:15:00Z',
    '--out', tempQa, '--markdown', tempMd, '--seal-out', tempSeal,
    '--seal-markdown', tempSealMd], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('Combined Zones R08U internal vent-cap post-release QA', () => {
  it('reproduces the canonical QA and commissioning artifacts deterministically', () => {
    expect(fs.readFileSync(tempQa)).toEqual(fs.readFileSync(QA));
    expect(fs.readFileSync(tempSeal)).toEqual(fs.readFileSync(SEAL));
    expect(fs.readFileSync(tempMd)).toEqual(fs.readFileSync(path.join(EVIDENCE, 'r08u-post-release-qa.md')));
    expect(fs.readFileSync(tempSealMd)).toEqual(fs.readFileSync(path.join(EVIDENCE,
      'r08u-ventilation-passive-cap-commissioning-seal.md')));
  });

  it('binds the exact immutable execution ledger and release identities', () => {
    expect(readJson(QA)).toMatchObject({
      status: 'PASS_R08U_INTERNAL_VENT_CAPS_POST_RELEASE_ACCEPTED',
      release: {
        transactionId: 'combined-zones-r08u-empty-eight-internal-vent-caps',
        manifestIdentity: '066880c728aa2211667833086a58647f27fdc86cb991e5cffce760e62a178863',
        sourceBoundReleaseIdentitySha256: 'bfa0c6063ca33fae960b6cb966611d4d34038ded44e597e46b6c78839cc981d0',
        executionBindingSha256: '67d89065580399fed6102568eca3ea8695203cf36a685af5bc9411bc482e80c2',
        completedReleaseIdentitySha256: 'a1e608b0a3a52da11a65f6d87f20f39d292f2ef801bdab3a25fb39f26885ab91',
      },
      bindings: {
        ledger: { sha256: '72293cd10dce462b5565b837fd10f36c883b00ede570e36da9f33dfb1b5b0456' },
        sourceCompleteSave: {
          completeSaveSha256: 'c63d2af4c4dc51fc34dfcf8be22d39c63ffc0adf1d7f2c4e7c2617650a1e2682',
          regionSnapshotSha256: '8c5367e1f3076ff206751ac5f71598f3a4a813ba1dceb783901153c79717b72a',
        },
        postCompleteSave: {
          completeSaveSha256: '6a1c3c12b900f3e646b4930c282ff9da81f213b8b5f49dbfd73233536c0b2f59',
          regionSnapshotSha256: 'dd4e62a6f74c5ce8427313a8fd1a470994926fb1270b3e34170ead06f4026217',
        },
        ledgerEvidence: { declaredBindingCount: 25, matchingBindingCount: 25, mismatchCount: 0 },
      },
    });
  });

  it('verifies all caps, the ordered gravity inverse, and every preservation set', () => {
    expect(readJson(QA)).toMatchObject({
      geometry: {
        internalCompartmentCaps: { cellCount: 36,
          coordinateSetSha256: '14993e347856c00cd95a2de0fb5490141fa93a994ff3466fcc0b59e310a6aaee' },
        retainedExteriorOutletCaps: { cellCount: 36 },
        completePassiveCapUnion: { cellCount: 72 },
        retainedUnexcavatedRiserReservations: { cellCount: 900 },
        faceInteractionHalo: { cellCount: 120 },
        topology: { internalCapPlaneCount: 4, exteriorCapPlaneCount: 4,
          internalCellsPerPlane: [9, 9, 9, 9], exteriorCellsPerPlane: [9, 9, 9, 9] },
      },
      postState: {
        exactTransitions: { matchingCellCount: 36, mismatchCellCount: 0 },
        passiveCaps: { newInternalPolishedDeepslateCount: 36,
          retainedExteriorPolishedDeepslateCount: 36,
          completeClosedCapCellCount: 72, closedCapPlaneCount: 8, openedOutletCount: 0 },
        gravity: { targetGravelCellCount: 1, targetDependencyDepth: 3,
          targetTerminalSupportState: 'minecraft:andesite', targetGravityViolationCount: 0,
          retainedHaloGravelCount: 4, retainedHaloGravityViolationCount: 0,
          exactDurableRollbackReady: true },
        preservation: { haloUnchangedCount: 120, haloDriftCount: 0,
          unchangedRiserReservationCount: 900, riserReservationDriftCount: 0,
          r08tBoundaryPreservedCount: 1372, r08tBoundaryDriftCount: 0,
          commissionedRetailShellCount: 23, commissionedRetailShellPreservedCount: 9936,
          commissionedRetailShellDriftCount: 0, n06BlockedCellCount: 4,
          n06DriftCount: 0, undeclaredDriftCount: 0 },
      },
    });
  });

  it('verifies strict execution, reverse rollback, and passive commissioning limits', () => {
    expect(readJson(QA)).toMatchObject({
      commissioningBoundary: { passiveStaticCapDoctrine: true,
        internalCompartmentInterfacesClosed: true, exteriorOutletCapsClosed: true,
        riserExcavationAuthorized: false, riserExcavationPerformed: false,
        exteriorOutletOpeningAuthorized: false, ventilationMechanismAuthorized: false,
        operationalVentilationCommissioned: false, northSmokeBoundaryLocalBlockPreserved: true,
        n06LocalExceptionPreserved: true },
      executionEvidence: {
        stageOrder: { expectedStageCount: 24, actualStageCount: 24, exact: true, allPass: true },
        strictForwardExecution: { packageCount: 2, successfulCommandCount: 36,
          failedCommandCount: 0, noopCommandCount: 0, passed: true },
        reverseRollbackPoststatePreflight: { packageCount: 2, passedGuardCount: 36,
          failedGuardCount: 0, passed: true },
      },
    });
  });

  it('seals only eight passive closed cap planes and binds payload identities', () => {
    const qa = readJson(QA);
    const qaPayload = { ...qa };
    delete qaPayload.qaPayloadSha256;
    expect(crypto.createHash('sha256').update(JSON.stringify(qaPayload)).digest('hex'))
      .toBe(qa.qaPayloadSha256);
    expect(qa.qaPayloadSha256).toBe('e07bd06b0d93156c8997aace0ec4c7bf600476899fab1410f3046880ca5f5b21');
    const seal = readJson(SEAL);
    const sealPayload = { ...seal };
    delete sealPayload.commissioningSealSha256;
    expect(crypto.createHash('sha256').update(JSON.stringify(sealPayload)).digest('hex'))
      .toBe(seal.commissioningSealSha256);
    expect(seal).toMatchObject({
      status: 'PASS_R08U_EIGHT_PASSIVE_VENT_CAP_PLANES_COMMISSIONED_CLOSED',
      commissioningScope: { internalCompartmentCapPlaneCount: 4,
        internalCompartmentCapCellCount: 36, exteriorOutletCapPlaneCount: 4,
        exteriorOutletCapCellCount: 36, completeClosedCapPlaneCount: 8,
        completeClosedCapCellCount: 72, retainedUnexcavatedRiserCellCount: 900,
        openedOutletCount: 0, passiveCapClosureCommissioned: true,
        riserExcavationCommissioned: false, operationalVentilationCommissioned: false },
      commissioningSealSha256: 'e5f89fc58fa6cc10f0c62791fe834bcd80858f67f78ec4edeac7a06608764d28',
    });
  });
});
