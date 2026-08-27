import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME =
  'combined-zones-r11e-retry-v2-c1-six-island-natural-transition-rebound-batch';
const CANONICAL_MANIFEST = path.join(ROOT, 'data/buildops', `${BASENAME}.release-manifest.json`);
const ACCEPTANCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r11e-retry-live-20260821T230554Z/r11e-retry-recovery-acceptance.json',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r11e-retry-v2-'),
);
const temporaryManifest = path.join(temporaryDirectory, `${BASENAME}.release-manifest.json`);
const temporaryQa = path.join(temporaryDirectory, 'offline-qa.json');
const temporaryExactQa = path.join(temporaryDirectory, 'exact-manifest-qa.json');
const temporaryAcceptance = path.join(temporaryDirectory, 'recovery-acceptance.json');
const temporaryAcceptanceMarkdown = path.join(temporaryDirectory, 'recovery-acceptance.md');

type Manifest = {
  manifestIdentity: string;
  transactionId: string;
  status: string;
  packages: Array<{ key: string; forward: string; rollback: string }>;
  source: {
    completeSaveSha256: string;
    acceptedRecoveryEvidenceSha256: string;
    acceptedRecoveryIdentitySha256: string;
    failedRetryLedgerSha256: string;
  };
  target: { operatedUnion: { cellCount: number; coordinateSetSha256: string } };
  scope: {
    naturalTransitionRebound: {
      packageKey: string;
      point: { x: number; y: number; z: number };
      recoveryAndV2ForwardSourceState: string;
      v2RollbackTargetState: string;
      changedForwardRecordCount: number;
      changedRollbackRecordCount: number;
    };
    includedIslands: Array<{ key: string }>;
    omittedEntityInterfaceIslands: Array<{ key: string; protectedSheep: unknown[] }>;
  };
};

let manifest: Manifest;
let firstCompileBytes: Buffer;

beforeAll(() => {
  execFileSync(process.execPath, [
    'scripts/compile_combined_zones_r11e_retry_v2_c1_six_island_batch.mjs',
    '--out-dir', temporaryDirectory,
    '--generated-at', '2026-08-21T23:25:00Z',
  ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
  firstCompileBytes = fs.readFileSync(temporaryManifest);
  manifest = JSON.parse(firstCompileBytes.toString()) as Manifest;
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R11E retry-v2 accepted recovery rebound', () => {
  it('independently seals the exact two-cell natural recovery diff and zero residuals', () => {
    execFileSync(process.execPath, [
      'scripts/audit_combined_zones_r11e_retry_recovery.mjs',
      '--out', temporaryAcceptance,
      '--md-out', temporaryAcceptanceMarkdown,
      '--generated-at', '2026-08-21T23:20:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
    expect(fs.readFileSync(temporaryAcceptance)).toEqual(fs.readFileSync(ACCEPTANCE));
    expect(JSON.parse(fs.readFileSync(temporaryAcceptance, 'utf8'))).toMatchObject({
      status:
        'PASS_RECOVERY_ACCEPTED_TWO_BENIGN_NATURAL_DIRT_GRASS_TRANSITIONS_ZERO_RESIDUAL_OPERATION_CHANGES',
      checks: {
        targetCellCount: 1_593,
        exactSourceRestoredTargetCount: 1_592,
        residualForwardDesiredStateCount: 0,
        interactionHaloCellCount: 8_348,
        interactionHaloDiffCount: 2,
        targetDiffCount: 1,
        haloOnlyDiffCount: 1,
        compensationFailedGroupCount: 0,
      },
      acceptance: {
        physicalRecoveryAccepted: true,
        exactPermittedNaturalTransitionCount: 2,
        operationResidualCount: 0,
      },
      recoveryAcceptanceIdentitySha256:
        '4c43f50ae5c85723c0e2f0d8ad490df1549d29c157185b9bcc3907aab7cd958e',
    });
  });

  it('compiles deterministically with a distinct immutable identity', () => {
    execFileSync(process.execPath, [
      'scripts/compile_combined_zones_r11e_retry_v2_c1_six_island_batch.mjs',
      '--out-dir', temporaryDirectory,
      '--generated-at', '2026-08-21T23:25:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
    expect(fs.readFileSync(temporaryManifest)).toEqual(firstCompileBytes);
    expect(crypto.createHash('sha256').update(fs.readFileSync(CANONICAL_MANIFEST)).digest('hex'))
      .toBe('db348b7419dc6955dce857e58b3e152a58da5b93ba1167cb1a8d3b7623eff9ee');
    expect((JSON.parse(fs.readFileSync(CANONICAL_MANIFEST, 'utf8')) as Manifest).manifestIdentity)
      .toBe('29b5c6fe848a1f9396de052ffda7b431357b78d676621d0307848b7b40f8f2bd');
  });

  it('binds the accepted recovery and changes exactly one guard plus its inverse', () => {
    expect(manifest).toMatchObject({
      transactionId: BASENAME,
      source: {
        completeSaveSha256:
          '9b98157a895d29614a05d50fbdc4170ff184d7c22f2e5018aa8dec5604c35930',
        acceptedRecoveryEvidenceSha256:
          '64d7e6b4b4894d50820336453c428f068c3527714a0da16b95d07e0a3a01f5dd',
        acceptedRecoveryIdentitySha256:
          '4c43f50ae5c85723c0e2f0d8ad490df1549d29c157185b9bcc3907aab7cd958e',
        failedRetryLedgerSha256:
          'f520aa966e064901062d034f8a89d08ec1c9c5bf30765580c354eb7aa19acadb',
      },
      target: {
        operatedUnion: {
          cellCount: 1_593,
          coordinateSetSha256:
            'bfa786a846c26649358b373aa01043a037b68f423f2627e3b5739b210db79042',
        },
      },
      scope: {
        naturalTransitionRebound: {
          packageKey: 'c1-island-564-569-pavement',
          point: { x: 968, y: 102, z: 27 },
          recoveryAndV2ForwardSourceState: 'minecraft:grass_block[snowy=false]',
          v2RollbackTargetState: 'minecraft:grass_block[snowy=false]',
          changedForwardRecordCount: 1,
          changedRollbackRecordCount: 1,
        },
      },
    });
    expect(manifest.packages).toHaveLength(10);
    expect(manifest.scope.includedIslands).toHaveLength(6);
    expect(manifest.scope.omittedEntityInterfaceIslands).toMatchObject([{
      key: 'island-1142-1183',
    }]);
    expect(manifest.scope.omittedEntityInterfaceIslands[0].protectedSheep).toHaveLength(3);
    const rebound = manifest.packages.find(
      ({ key }) => key === 'c1-island-564-569-pavement',
    );
    expect(fs.readFileSync(rebound!.forward, 'utf8')).toContain(
      'REPL 968 102 27 968 102 27 minecraft:grass_block[snowy=false] minecraft:gray_concrete',
    );
    expect(fs.readFileSync(rebound!.rollback, 'utf8')).toContain(
      'REPL 968 102 27 968 102 27 minecraft:gray_concrete minecraft:grass_block[snowy=false]',
    );
  });

  it('passes independent source, inverse, geometry, sheep, and generic manifest QA', () => {
    execFileSync(process.execPath, [
      'scripts/qa_combined_zones_r11e_retry_v2_c1_six_island_batch_offline.mjs',
      '--manifest', temporaryManifest,
      '--out', temporaryQa,
      '--generated-at', '2026-08-21T23:30:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
    execFileSync(process.execPath, [
      'scripts/qa_guarded_release_manifest.mjs',
      '--manifest', temporaryManifest,
      '--out', temporaryExactQa,
    ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
    expect(JSON.parse(fs.readFileSync(temporaryQa, 'utf8'))).toMatchObject({
      status: 'PASS',
      checks: {
        packageCount: 10,
        distinctOperationFileCount: 20,
        includedIslandCount: 6,
        exactSourceGuardMatchCount: 1_593,
        exactInverseRecordCount: 1_593,
        uniqueTargetCellCount: 1_593,
        v1ForwardRecordDifferenceCount: 1,
        v1RollbackRecordDifferenceCount: 1,
        sourceReboundTargetCount: 1,
        acceptedRecoveryOperationResidualCount: 0,
        omittedSheepIslandCount: 1,
        protectedSheepCount: 3,
      },
    });
    expect(JSON.parse(fs.readFileSync(temporaryExactQa, 'utf8'))).toMatchObject({
      status: 'PASS',
      totals: { packages: 10, uniqueTargetCells: 1_593 },
    });
  });

  it('retains guarded wrapper print-plan compatibility without executing', () => {
    const plan = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_combined_zones_scoped_release.mjs',
      '--manifest', CANONICAL_MANIFEST,
      '--release-node', 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR',
      '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8', timeout: 30_000 })) as {
      mode: string;
      globalGateDependency: string;
      packageOrder: string[];
    };
    expect(plan).toMatchObject({
      mode: 'PREPARE_ONLY',
      globalGateDependency: 'NONE',
    });
    expect(plan.packageOrder).toEqual(manifest.packages.map(({ key }) => key));
  });
});
