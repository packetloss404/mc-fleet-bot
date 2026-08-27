import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/qa_combined_zones_r08p_s09_gravity_stabilized_retail_shell_post_release.mjs');
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r08p-live-20260821T184147Z');
const FILES = [
  'r08p-post-release-qa.json',
  'r08p-post-release-qa.md',
  'r08n-r08p-capped-retail-shells-commissioning-supplement.json',
  'r08n-r08p-capped-retail-shells-commissioning-supplement.md',
];
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'r08p-post-qa-'));
const report = () => JSON.parse(fs.readFileSync(path.join(EVIDENCE, FILES[0]), 'utf8'));

beforeAll(() => {
  execFileSync(process.execPath, [SCRIPT, '--generated-at', '2026-08-21T18:44:00Z',
    '--out', path.join(temp, FILES[0]), '--markdown', path.join(temp, FILES[1]),
    '--seal-out', path.join(temp, FILES[2]), '--seal-markdown', path.join(temp, FILES[3])],
  { cwd: ROOT, stdio: 'pipe' });
}, 30_000);
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('Combined Zones CZ-R08P post-release QA and 21-shell seal', () => {
  it('regenerates all QA and commissioning artifacts byte-for-byte', () => {
    for (const filename of FILES) {
      expect(fs.readFileSync(path.join(temp, filename))).toEqual(fs.readFileSync(path.join(EVIDENCE, filename)));
    }
  });

  it('binds the terminal ledger, manifest, snapshots, and all 25 evidence files', () => {
    expect(report()).toMatchObject({
      status: 'PASS_R08P_S09_GRAVITY_STABILIZED_RETAIL_SHELL_POST_RELEASE_ACCEPTED',
      qaPayloadSha256: '7442a1a8dd6ec6ef077ffd5e44782dd39ac1317ce6e6c73cdfe175bb49d3d3c0',
      release: {
        manifestIdentity: '5df6682203afb52a5dce2386ef5ef7285aab2ccf4d5844856af11fbda4d789a2',
        executionBindingSha256: '16bb6f2e49392119ab79722db844c48fce069ef5818cd143190411cf6c52c316',
        completedReleaseIdentitySha256: 'f59ad1ae37ca9a2786c9b3f560bdfdffde250e9d38c000c0d059b39e96c9f9e3',
      },
      bindings: {
        ledger: { sha256: 'ab87277187339f06f2306daf5f24228574d71ae65749fd22fda8bc3ac29c39c1' },
        manifest: { sha256: 'c0cd0cea1ad032f7e9ca90ad78cddf96bc32373143256d54aa89a0835d351b1d' },
        sourceCompleteSave: {
          completeSaveSha256: '04e742351bde39d3be413f60d1945bf80aa4b28b58f6bb9993d1b67100dbd329',
          regionSnapshotSha256: 'fe578946e7f92a23c0ae8c68d08d63cf680a7d669ab54062cd850d98cfb4476c',
        },
        postCompleteSave: {
          completeSaveSha256: 'bf3f03362e1c920e89cf6eadbbb46926dbf7a204acd8eeae5f0182951f1a4505',
          regionSnapshotSha256: 'b0503fc70b8960c2f6a413c620136c5c0ecbd562093362f143e902f7376abc25',
        },
        ledgerEvidence: { declaredBindingCount: 25, matchingBindingCount: 25, mismatchCount: 0 },
      },
    });
  });

  it('proves exact S09 fabric, target stabilization, and retained support graph', () => {
    expect(report()).toMatchObject({
      geometry: {
        fullShell: { cellCount: 432, coordinateSetSha256: '9de7ea5709dbdca1be8e3201b38421f7333ee8f06c07655106234ee2101232f8' },
        completeBoundary: { cellCount: 292 }, connectedInterior: { cellCount: 140 },
        closedTenantFace: { cellCount: 12 }, interactionHalo: { cellCount: 492 },
        topology: { boundary: { componentCount: 1 }, interior: { componentCount: 1 } },
      },
      postState: {
        exactTransitions: { matchingCellCount: 432, mismatchCellCount: 0 },
        fullTargets: { matchingCellCount: 432, mismatchCellCount: 0, lightGrayConcreteCount: 292, airCount: 140 },
        targetGravityStabilization: {
          cell: { x: 1784, y: 52, z: 151 }, sourceState: 'minecraft:gravel',
          postState: 'minecraft:light_gray_concrete', sourceSupportState: 'minecraft:diorite',
          postSupportState: 'minecraft:light_gray_concrete', stableForwardOrder: true,
          restoredLastByRollbackOrder: true,
        },
        retainedGravityHalo: {
          gravelCount: 22, unchangedGravelCount: 22, faceAdjacentTargetCount: 13,
          uniqueDependencyCellCount: 14, maxDependencyDepth: 3,
          targetTransitionSupportCount: 1, violationCount: 0,
        },
      },
    });
  });

  it('proves R08N/O preservation, strict execution, and reverse rollback', () => {
    expect(report()).toMatchObject({
      postState: {
        preservation: { haloUnchangedCount: 492, haloDriftCount: 0, priorShellCount: 20,
          priorShellCellCount: 8640, priorShellPreservedCount: 8640, priorShellDriftCount: 0,
          undeclaredDriftCount: 0 },
        postBlockEntityIntersectionCount: 0, postSavedEntityIntersectionCount: 0,
      },
      executionEvidence: {
        stageOrder: { expectedStageCount: 24, actualStageCount: 24, exact: true, allPass: true },
        strictForwardExecution: { packageCount: 2, successfulCommandCount: 432, failedCommandCount: 0, noopCommandCount: 0, passed: true },
        reverseRollbackPoststatePreflight: { packageCount: 2, passedGuardCount: 432, failedGuardCount: 0,
          regionSnapshotSha256: 'b0503fc70b8960c2f6a413c620136c5c0ecbd562093362f143e902f7376abc25', passed: true },
      },
      safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false,
        serviceMutationsPerformed: false, readOnlyAnvilInputs: true },
    });
  });

  it('commissions 21 closed shells without authorizing fit-out or occupancy', () => {
    const seal = JSON.parse(fs.readFileSync(path.join(EVIDENCE, FILES[2]), 'utf8'));
    expect(seal).toMatchObject({
      status: 'PASS_R08N_R08P_21_CAPPED_RETAIL_SHELLS_COMMISSIONED_CLOSED',
      commissioningSealSha256: '6bc1aff9f49b8ad5a2c2ff05fe6dcf7e6ddff8a26f95677a50fd16c4991705a3',
      commissioningScope: { totalCappedShellCount: 21, completeBoundaryCellCount: 6132,
        connectedInteriorAirCellCount: 2940, closedTenantFaceCellCount: 252,
        tenantFaceOpeningCount: 0, tenantFitOutAuthorized: false, publicOccupancyAuthorized: false },
      acceptance: { exactFinalStates: true, targetGravityStabilized: true,
        retainedGravitySupportGraphStable: true, r08nR08oFabricPreserved: true,
        zeroUndeclaredDrift: true, exactReverseRollbackReady: true },
    });
  });
});
