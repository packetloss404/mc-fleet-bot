import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/qa_combined_zones_r08s_n07_fluid_ordered_retail_shell_post_release.mjs');
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r08s-live-20260821T191247Z');
const FILES = ['r08s-post-release-qa.json', 'r08s-post-release-qa.md',
  'r08n-r08s-capped-retail-shells-commissioning-supplement.json',
  'r08n-r08s-capped-retail-shells-commissioning-supplement.md'];
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'r08s-post-qa-'));
const report = () => JSON.parse(fs.readFileSync(path.join(EVIDENCE, FILES[0]), 'utf8'));

beforeAll(() => {
  execFileSync(process.execPath, [SCRIPT, '--generated-at', '2026-08-21T19:16:00Z',
    '--out', path.join(temp, FILES[0]), '--markdown', path.join(temp, FILES[1]),
    '--seal-out', path.join(temp, FILES[2]), '--seal-markdown', path.join(temp, FILES[3])],
  { cwd: ROOT, stdio: 'pipe' });
}, 30_000);
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('Combined Zones CZ-R08S post-release QA and 23-shell seal', () => {
  it('regenerates all QA and commissioning artifacts byte-for-byte', () => {
    for (const filename of FILES) expect(fs.readFileSync(path.join(temp, filename)))
      .toEqual(fs.readFileSync(path.join(EVIDENCE, filename)));
  });

  it('binds the terminal ledger, manifest, snapshots, and all evidence files', () => {
    expect(report()).toMatchObject({
      status: 'PASS_R08S_N07_FLUID_ORDERED_RETAIL_SHELL_POST_RELEASE_ACCEPTED',
      qaPayloadSha256: '9d40a30c421f0ecc75dc890916356876993756e4757020eaa6fa366f1fa2ee3b',
      release: { manifestIdentity: 'ef3c89c666eb1e5f55b4e48ec0b9f04b6e89bf4464d0df5a995b3a211f7f2b2f',
        executionBindingSha256: 'f6b0b2dd734647b11f0090da6d28d272e54b1eda9a945b3d61408fd2df5548c6',
        completedReleaseIdentitySha256: '97cdc01930456d6cad36457ece95abb8f87232b3c19e5d4c76dfb7cf846b6bf3' },
      bindings: {
        ledger: { sha256: 'e5661df1e2f1c5354c2de701e11d4a02da335e55662a95d9c0965335474684f9' },
        manifest: { sha256: 'a58c2889fcf23cd90aa7803cfc7b2911526f8a73f20466a29eed6f0d82fb91ac' },
        sourceCompleteSave: { completeSaveSha256: 'f3cda07b19d13c144c3f1c73ca5a22124de16809da853602f1b9fce7fd84812d',
          regionSnapshotSha256: '45c6805d2a24b83e76db2b068d51a650237b39087ad08661e3cc947a9e9971bc' },
        postCompleteSave: { completeSaveSha256: '71969f7c558ded938c6e8007b475bd3d8d6430642ee0d2c08e0d43a88741fd64',
          regionSnapshotSha256: 'c47b325944bcfdb6327c775cec2c04cc58327295c5e6b1a00e775e1e4f1ad8e2' },
        ledgerEvidence: { declaredBindingCount: 33, matchingBindingCount: 33, mismatchCount: 0 },
      },
    });
  });

  it('proves exact fabric and the ordered target-fluid outcome', () => {
    expect(report()).toMatchObject({
      geometry: { fullShell: { cellCount: 432 }, completeBoundary: { cellCount: 292 },
        connectedInterior: { cellCount: 140 }, closedTenantFace: { cellCount: 12 },
        interactionHalo: { cellCount: 492 }, topology: { boundary: { componentCount: 1 }, interior: { componentCount: 1 } } },
      postState: {
        exactTransitions: { matchingCellCount: 401, mismatchCellCount: 0 },
        fullTargets: { matchingCellCount: 432, mismatchCellCount: 0, lightGrayConcreteCount: 292,
          airCount: 140, operatedCount: 401, alreadyTargetAirCount: 31 },
        targetFluidSequence: { sourceFluidCount: 26, sourceWaterCount: 24, sourceBubbleColumnCount: 2,
          boundaryFluidCount: 23, interiorFluidCount: 3, completeBoundaryBeforeInteriorExtraction: true,
          rollbackRestoresInteriorThenBoundaryFluidThenAir: true, bubbleSupportViolationCount: 0 },
      },
    });
  });

  it('proves retained fluid, prior fabric, execution, and reverse rollback', () => {
    expect(report()).toMatchObject({
      postState: {
        retainedFluidHalo: { fluidCount: 50, unchangedFluidCount: 50, faceAdjacentFluidCellCount: 37,
          faceAdjacencyCount: 37, allAdjacentFinalInterfacesStatic: true, violationCount: 0 },
        preservation: { haloUnchangedCount: 492, haloDriftCount: 0, priorShellCount: 22,
          priorShellCellCount: 9504, priorShellPreservedCount: 9504, priorShellDriftCount: 0,
          undeclaredDriftCount: 0 },
        postBlockEntityIntersectionCount: 0, postSavedEntityIntersectionCount: 0,
      },
      executionEvidence: {
        stageOrder: { expectedStageCount: 31, actualStageCount: 31, exact: true, allPass: true },
        strictForwardExecution: { packageCount: 3, successfulCommandCount: 401, failedCommandCount: 0, noopCommandCount: 0, passed: true },
        reverseRollbackPoststatePreflight: { packageCount: 3, passedGuardCount: 401, failedGuardCount: 0,
          regionSnapshotSha256: 'c47b325944bcfdb6327c775cec2c04cc58327295c5e6b1a00e775e1e4f1ad8e2', passed: true },
      },
      safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, serviceMutationsPerformed: false, readOnlyAnvilInputs: true },
    });
  });

  it('commissions 23 closed shells without authorizing fit-out or occupancy', () => {
    const seal = JSON.parse(fs.readFileSync(path.join(EVIDENCE, FILES[2]), 'utf8'));
    expect(seal).toMatchObject({
      status: 'PASS_R08N_R08S_23_CAPPED_RETAIL_SHELLS_COMMISSIONED_CLOSED',
      commissioningSealSha256: '2b22c64c9797dfb57a41e68bb8acf560ef15bebe889871a353c6114ac352f779',
      commissioningScope: { priorClosedShellCount: 22, fluidOrderedN07ShellCount: 1,
        totalCappedShellCount: 23, completeBoundaryCellCount: 6716,
        connectedInteriorAirCellCount: 3220, closedTenantFaceCellCount: 276,
        tenantFaceOpeningCount: 0, tenantFitOutAuthorized: false, publicOccupancyAuthorized: false },
      acceptance: { exactFinalStates: true, targetFluidOrderedAndContained: true,
        retainedFluidHaloExact: true, prior22ShellFabricPreserved: true,
        zeroUndeclaredDrift: true, exactReverseRollbackReady: true },
    });
  });
});
