import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/qa_combined_zones_r08r_n09_gravity_ordered_retail_shell_post_release.mjs');
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r08r-live-20260821T185546Z');
const FILES = [
  'r08r-post-release-qa.json',
  'r08r-post-release-qa.md',
  'r08n-r08r-capped-retail-shells-commissioning-supplement.json',
  'r08n-r08r-capped-retail-shells-commissioning-supplement.md',
];
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'r08r-post-qa-'));
const report = () => JSON.parse(fs.readFileSync(path.join(EVIDENCE, FILES[0]), 'utf8'));

beforeAll(() => {
  execFileSync(process.execPath, [SCRIPT, '--generated-at', '2026-08-21T18:58:00Z',
    '--out', path.join(temp, FILES[0]), '--markdown', path.join(temp, FILES[1]),
    '--seal-out', path.join(temp, FILES[2]), '--seal-markdown', path.join(temp, FILES[3])],
  { cwd: ROOT, stdio: 'pipe' });
}, 30_000);
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('Combined Zones CZ-R08R post-release QA and 22-shell seal', () => {
  it('regenerates all QA and commissioning artifacts byte-for-byte', () => {
    for (const filename of FILES) {
      expect(fs.readFileSync(path.join(temp, filename))).toEqual(fs.readFileSync(path.join(EVIDENCE, filename)));
    }
  });

  it('binds the terminal ledger, manifest, snapshots, and all evidence files', () => {
    expect(report()).toMatchObject({
      status: 'PASS_R08R_N09_GRAVITY_ORDERED_RETAIL_SHELL_POST_RELEASE_ACCEPTED',
      qaPayloadSha256: '6f72589109d9e71708f2978e138607d9fbe95b6de80564a95e57e000304ec081',
      release: {
        manifestIdentity: 'e669d6c9517ff10f2f3b9b49cfc57967421c8a5e7f4794c35de8fef577cb953a',
        executionBindingSha256: '655f52e14d86887d048270786ca04b588e272c48c7204a0778d71ae46aa9ac32',
        completedReleaseIdentitySha256: '0506c0f0c9e89a0ecd00ee1a575623b86f8d98488f2394662a32718a53135936',
      },
      bindings: {
        ledger: { sha256: '6056832a574c384e2cadd787a161e3620201b90e70de21893a2240ca00e05c62' },
        manifest: { sha256: '9f6447749d5fe8b4382112fb457ff5af02a71244230be54a1ff2138ff2aba1b1' },
        sourceCompleteSave: {
          completeSaveSha256: '4394b3edb29ee9c3a3a7f817827cf9948743a6b1f20d05870e2f5a33fc5bf538',
          regionSnapshotSha256: 'e5ff070699beaa988e5b30e8e6db29f0aa805298378197a939f85aa62a6398cb',
        },
        postCompleteSave: {
          completeSaveSha256: 'd4140700680f5ea6e7e6aea4f421f74788a780a8ca268feed1d4cfee46e06ee7',
          regionSnapshotSha256: '464303a11a3b091afa7b0504b13b43b49da20f62bf3ef3cc8709321dde837f52',
        },
        ledgerEvidence: { declaredBindingCount: 33, matchingBindingCount: 33, mismatchCount: 0 },
      },
    });
  });

  it('proves exact N09 fabric and ordered target-gravity outcome', () => {
    expect(report()).toMatchObject({
      geometry: {
        fullShell: { cellCount: 432, coordinateSetSha256: '3ba8349decbeaaee95a5105342cb1e663eeae6dcae7f751b37d8a2c2e64b627a' },
        completeBoundary: { cellCount: 292 }, connectedInterior: { cellCount: 140 },
        closedTenantFace: { cellCount: 12 }, interactionHalo: { cellCount: 492 },
        topology: { boundary: { componentCount: 1 }, interior: { componentCount: 1 } },
      },
      postState: {
        exactTransitions: { matchingCellCount: 432, mismatchCellCount: 0 },
        fullTargets: { matchingCellCount: 432, mismatchCellCount: 0, lightGrayConcreteCount: 292, airCount: 140 },
        orderedTargetGravity: { sourceGravityCount: 57, stabilizationCount: 45, extractionCount: 12,
          stabilizationBottomUpViolationCount: 0, extractionTopDownViolationCount: 0,
          gravityAboveViolationCount: 0, exactRollbackRestoresShellThenExtractionThenStabilization: true },
      },
    });
  });

  it('proves retained support closure, prior fabric, strict execution, and reverse rollback', () => {
    expect(report()).toMatchObject({
      postState: {
        retainedGravityHalo: { gravelCount: 26, unchangedGravelCount: 26,
          faceAdjacentTargetCount: 22, violationCount: 0 },
        preservation: { haloUnchangedCount: 492, haloDriftCount: 0, priorShellCount: 21,
          priorShellCellCount: 9072, priorShellPreservedCount: 9072, priorShellDriftCount: 0,
          undeclaredDriftCount: 0 },
        postBlockEntityIntersectionCount: 0, postSavedEntityIntersectionCount: 0,
      },
      executionEvidence: {
        stageOrder: { expectedStageCount: 31, actualStageCount: 31, exact: true, allPass: true },
        strictForwardExecution: { packageCount: 3, successfulCommandCount: 432, failedCommandCount: 0,
          noopCommandCount: 0, passed: true },
        reverseRollbackPoststatePreflight: { packageCount: 3, passedGuardCount: 432,
          failedGuardCount: 0, regionSnapshotSha256: '464303a11a3b091afa7b0504b13b43b49da20f62bf3ef3cc8709321dde837f52', passed: true },
      },
      safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false,
        serviceMutationsPerformed: false, readOnlyAnvilInputs: true },
    });
  });

  it('commissions 22 closed shells without authorizing fit-out or occupancy', () => {
    const seal = JSON.parse(fs.readFileSync(path.join(EVIDENCE, FILES[2]), 'utf8'));
    expect(seal).toMatchObject({
      status: 'PASS_R08N_R08R_22_CAPPED_RETAIL_SHELLS_COMMISSIONED_CLOSED',
      commissioningSealSha256: '89cf155a26199d0fcfa4c1ccf675febc608d5f6a12a81d182129580bd6bcf674',
      commissioningScope: { priorClosedShellCount: 21, gravityOrderedN09ShellCount: 1,
        totalCappedShellCount: 22, completeBoundaryCellCount: 6424,
        connectedInteriorAirCellCount: 3080, closedTenantFaceCellCount: 264,
        tenantFaceOpeningCount: 0, tenantFitOutAuthorized: false, publicOccupancyAuthorized: false },
      acceptance: { exactFinalStates: true, targetGravityOrderedAndStable: true,
        retainedGravitySupportGraphStable: true, r08nR08oR08pFabricPreserved: true,
        zeroUndeclaredDrift: true, exactReverseRollbackReady: true },
    });
  });
});
