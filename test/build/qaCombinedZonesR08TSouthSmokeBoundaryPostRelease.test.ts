import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/qa_combined_zones_r08t_south_smoke_boundary_post_release.mjs');
const EVIDENCE = path.join(ROOT, 'data/world-review/combined-zones-r08t-live-20260821T194152Z');
const QA = path.join(EVIDENCE, 'r08t-post-release-qa.json');
const SEAL = path.join(EVIDENCE, 'r08t-south-smoke-boundary-commissioning-seal.json');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'r08t-post-qa-'));
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const tempQa = path.join(temp, 'qa.json');
const tempMd = path.join(temp, 'qa.md');
const tempSeal = path.join(temp, 'seal.json');
const tempSealMd = path.join(temp, 'seal.md');

beforeAll(() => {
  execFileSync(process.execPath, [SCRIPT, '--generated-at', '2026-08-21T19:45:00Z',
    '--out', tempQa, '--markdown', tempMd, '--seal-out', tempSeal,
    '--seal-markdown', tempSealMd], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('Combined Zones R08T south smoke-boundary post-release QA', () => {
  it('reproduces the canonical QA and commissioning artifacts deterministically', () => {
    expect(fs.readFileSync(tempQa)).toEqual(fs.readFileSync(QA));
    expect(fs.readFileSync(tempSeal)).toEqual(fs.readFileSync(SEAL));
    expect(fs.readFileSync(tempMd)).toEqual(fs.readFileSync(path.join(EVIDENCE, 'r08t-post-release-qa.md')));
    expect(fs.readFileSync(tempSealMd)).toEqual(fs.readFileSync(path.join(EVIDENCE,
      'r08t-south-smoke-boundary-commissioning-seal.md')));
  });

  it('binds the exact immutable execution ledger and release identities', () => {
    expect(readJson(QA)).toMatchObject({
      status: 'PASS_R08T_SOUTH_SMOKE_BOUNDARY_POST_RELEASE_ACCEPTED',
      release: {
        transactionId: 'combined-zones-r08t-empty-eight-south-smoke-boundary',
        manifestIdentity: 'd8b75ef1c7df83fea7cfb9e4ac389dd4f001a8ebcd7ea6ccfaeb56e723a414da',
        sourceBoundReleaseIdentitySha256: '05fa39e22854b8dac8d1e99c45a2e548171aedabd031ec223f31e1f695bc2e5b',
        executionBindingSha256: 'fc22937211518cd6ce275e2d7e57b73133cab757e19c04a218afab3bf6e5bf2e',
        completedReleaseIdentitySha256: '0ad2b587ea12f84e1490ce7b32d4a2946e9c593544d05994e9b6dd476630ed8f',
      },
      bindings: {
        ledger: { sha256: 'ee64b2008872e1508636074ef3e62e1f8bb0053a26bfaf540d0e554db0872293' },
        sourceCompleteSave: { completeSaveSha256: '7140b0599c233141f4517a0e006d35dd7da97e2d18a9a6743a4152d9ebb98853',
          regionSnapshotSha256: 'b6a9ac51eb9cc56a734aeb090cf804ae7f24a05f7680ccc02834e62ea30367af' },
        postCompleteSave: { completeSaveSha256: 'fcde819dd413b3ec9920d56c81c797d56a92b7f66c0f4216cdbcad23451adbec',
          regionSnapshotSha256: '42001ae747a852e64aead34dcdcfa67b5c22dd45ba25cd49385b633b40155023' },
        ledgerEvidence: { declaredBindingCount: 25, matchingBindingCount: 25, mismatchCount: 0 },
      },
    });
  });

  it('verifies the complete wall, four static caps, and preserved interaction graph', () => {
    expect(readJson(QA)).toMatchObject({
      geometry: {
        compartmentWall: { cellCount: 1336 }, staticOpeningCaps: { cellCount: 36 },
        completeFailClosedBoundary: { cellCount: 1372,
          coordinateSetSha256: '51d63bc45fdd53230f5ed9c3ed0df6777668eecc45a2017baa1eba6ed38c7a1e' },
        d06CoordinateSetSha256: '7055645cb0c309d8f57ae81fba68e933ca64f7f038259ec501e8b8c21402796f',
        faceInteractionHalo: { cellCount: 3150 },
        topology: { complete: { componentCount: 1, largestComponentCellCount: 1372 },
          caps: { componentCount: 4, componentSizes: [9, 9, 9, 9] } },
      },
      postState: {
        exactTransitions: { matchingCellCount: 1372, mismatchCellCount: 0 },
        finalBoundary: { stoneBrickWallCount: 1336, polishedDeepslateCapCount: 36,
          completeCellCount: 1372, openingCount: 0, poweredMechanismCount: 0 },
        preservation: { haloUnchangedCount: 3150, haloDriftCount: 0,
          stableGravityHaloCount: 27, gravitySupportViolationCount: 0,
          commissionedRetailShellCount: 23, commissionedRetailShellCellCount: 9936,
          commissionedRetailShellPreservedCount: 9936, commissionedRetailShellDriftCount: 0,
          n06BlockedCellCount: 4, n06DriftCount: 0, undeclaredDriftCount: 0 },
      },
    });
  });

  it('verifies strict execution, reverse rollback, and passive commissioning limits', () => {
    expect(readJson(QA)).toMatchObject({
      contract: { id: 'IF-D06-EE-SMOKE-S-COMPARTMENT', accepted: true,
        classification: 'TERMINAL_CAP', passiveStaticCapDoctrine: true,
        poweredOpeningsAuthorized: false, smokeSystemCommissioned: false,
        ventilationCommissioned: false },
      executionEvidence: {
        stageOrder: { expectedStageCount: 24, actualStageCount: 24, exact: true, allPass: true },
        strictForwardExecution: { packageCount: 2, successfulCommandCount: 1372,
          failedCommandCount: 0, noopCommandCount: 0, passed: true },
        reverseRollbackPoststatePreflight: { packageCount: 2, passedGuardCount: 1372,
          failedGuardCount: 0, passed: true },
      },
    });
  });

  it('seals only the passive fail-closed boundary and binds payload identities', () => {
    const qa = readJson(QA);
    const qaPayload = { ...qa };
    delete qaPayload.qaPayloadSha256;
    expect(crypto.createHash('sha256').update(JSON.stringify(qaPayload)).digest('hex'))
      .toBe(qa.qaPayloadSha256);
    expect(qa.qaPayloadSha256).toBe('a3b2c3764ded0d683575ebb7f757e9b7e2cd23b50a69d8eb5220c58639d9e64d');
    const seal = readJson(SEAL);
    const sealPayload = { ...seal };
    delete sealPayload.commissioningSealSha256;
    expect(crypto.createHash('sha256').update(JSON.stringify(sealPayload)).digest('hex'))
      .toBe(seal.commissioningSealSha256);
    expect(seal).toMatchObject({
      status: 'PASS_R08T_EE_SMOKE_S_PASSIVE_BOUNDARY_COMMISSIONED_FAIL_CLOSED',
      commissioningScope: { completeBoundaryCellCount: 1372,
        staticFutureDoorCapCellCount: 36, retainedOpeningCount: 0,
        poweredMechanismCount: 0, passiveBoundaryCommissioned: true,
        operationalSmokeSystemCommissioned: false },
      commissioningSealSha256: '1edf341dd9ebed0f1a7ba072d1becdac3c2c2fa401cfb4e92965c748cbcd07d5',
    });
  });
});
