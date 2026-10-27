import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'combined-zones-r11e-retry-c1-six-island-sheep-preserving-batch';
const CANONICAL_MANIFEST = path.join(
  ROOT, 'data/buildops', `${BASENAME}.release-manifest.json`,
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r11e-retry-'),
);
const temporaryManifest = path.join(temporaryDirectory, `${BASENAME}.release-manifest.json`);
const qaPath = path.join(temporaryDirectory, 'r11e-retry-offline-qa.json');
const exactQaPath = path.join(temporaryDirectory, 'exact-release-manifest-qa.json');

type Manifest = {
  manifestIdentity: string;
  transactionId: string;
  status: string;
  packages: Array<{ key: string; forward: string; rollback: string }>;
  executionOrder: { forward: string[]; rollback: string[] };
  scope: {
    includedIslands: Array<{ key: string }>;
    omittedEntityInterfaceIslands: Array<{
      key: string;
      omittedTargetCellCount: number;
      protectedSheep: Array<{ uuidIntArray: number[] }>;
      disposition: string;
    }>;
    excludedAtGradeRanges: Array<{ key: string }>;
    corridorConnectivityClaimed: boolean;
  };
  source: {
    completeSaveSha256: string;
    prepareOnlyFailedLedgerSha256: string;
    baseManifestSha256: string;
  };
  target: {
    operatedUnion: { cellCount: number; coordinateSetSha256: string };
  };
  isolation: {
    selectedPackageFailedGatePassCount: number;
    minimumProtectedSheepToSelectedTargetDistance: number;
  };
};

let manifest: Manifest;

beforeAll(() => {
  execFileSync(process.execPath, [
    'scripts/compile_combined_zones_r11e_retry_c1_six_island_batch.mjs',
    '--out-dir', temporaryDirectory,
    '--generated-at', '2026-08-21T20:20:00Z',
  ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
  manifest = JSON.parse(fs.readFileSync(temporaryManifest, 'utf8')) as Manifest;
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R11E sheep-preserving six-island retry', () => {
  it('recompiles the distinct retry manifest byte-for-byte deterministically', () => {
    expect(fs.readFileSync(temporaryManifest))
      .toEqual(fs.readFileSync(CANONICAL_MANIFEST));
    expect(crypto.createHash('sha256').update(fs.readFileSync(CANONICAL_MANIFEST)).digest('hex'))
      .toBe('5b51b90ba542c9584d4e4a77fbc32d891a5d82970df2a9444187af72aa781aa9');
    expect(manifest.manifestIdentity)
      .toBe('ee02b1db8daef2c558b879f7a59a790e086016bf42b155a319b2766c1eb7693d');
  });

  it('binds the failed prepare-only evidence and current immutable source', () => {
    expect(manifest.transactionId).toBe(BASENAME);
    expect(manifest.status)
      .toContain('SHEEP_PRESERVING_RETRY_AWAITING_FRESH_EXECUTION_KERNEL');
    expect(manifest.source).toMatchObject({
      completeSaveSha256:
        'd53c3ff0039ce4b36a435dece8ede0002678a4fb34c6e00cbeb3e6ff0299e712',
      prepareOnlyFailedLedgerSha256:
        '7d0da4ded0d5eb0d33ec1f5fc088d1431718e59ac4def3296a7bf95e05f4068c',
      baseManifestSha256:
        'faef78985c8d7dbc55d673b66668194a744621eff508d8ecda15dc11d7c8e7bd',
    });
  });

  it('omits the complete roaming-sheep island and retains six useful islands', () => {
    expect(manifest.packages).toHaveLength(10);
    expect(manifest.scope.includedIslands.map(({ key }) => key)).toEqual([
      'island-548-551',
      'island-564-569',
      'island-606-608',
      'island-627-632',
      'island-792',
      'island-1213-1215',
    ]);
    expect(manifest.scope.omittedEntityInterfaceIslands).toMatchObject([{
      key: 'island-1142-1183',
      omittedTargetCellCount: 2_389,
      disposition:
        'PRESERVED_UNTOUCHED_UNFENCED_ROAMING_SHEEP_INTERFACE_NO_OPERATION_PACKAGE',
    }]);
    expect(manifest.scope.omittedEntityInterfaceIslands[0].protectedSheep).toHaveLength(3);
    expect(manifest.scope.excludedAtGradeRanges).toHaveLength(2);
    expect(manifest.scope.corridorConnectivityClaimed).toBe(false);
    expect(manifest.target.operatedUnion).toEqual({
      cellCount: 1_593,
      bounds: {
        minX: 934, maxX: 1560, minY: 51, maxY: 106, minZ: -261, maxZ: 50,
      },
      coordinateSetSha256:
        'bfa786a846c26649358b373aa01043a037b68f423f2627e3b5739b210db79042',
    });
    expect(manifest.isolation).toMatchObject({
      selectedPackageFailedGatePassCount: 10,
      minimumProtectedSheepToSelectedTargetDistance: 46.24436597870396,
    });
  });

  it('passes independent source, inverse, geometry, sheep, and hold QA', () => {
    execFileSync(process.execPath, [
      'scripts/qa_combined_zones_r11e_retry_c1_six_island_batch_offline.mjs',
      '--manifest', temporaryManifest,
      '--out', qaPath,
      '--generated-at', '2026-08-21T20:25:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
    execFileSync(process.execPath, [
      'scripts/qa_guarded_release_manifest.mjs',
      '--manifest', temporaryManifest,
      '--out', exactQaPath,
    ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
    expect(JSON.parse(fs.readFileSync(qaPath, 'utf8'))).toMatchObject({
      status: 'PASS',
      checks: {
        reusedFrozenPackageCount: 10,
        includedIslandCount: 6,
        exactSourceGuardMatchCount: 1_593,
        exactInverseRecordCount: 1_593,
        uniqueTargetCellCount: 1_593,
        omittedSheepIslandCount: 1,
        omittedSheepIslandTargetCellCount: 2_389,
        protectedSheepCount: 3,
        selectedPackageFailedGatePassCount: 10,
        forwardExecutionStageCountInFailedLedger: 0,
        excludedWetRangeCount: 2,
        heldTreatmentMutationCount: 0,
        corridorConnectivityClaimed: false,
      },
    });
    expect(JSON.parse(fs.readFileSync(exactQaPath, 'utf8'))).toMatchObject({
      status: 'PASS',
      totals: { packages: 10, uniqueTargetCells: 1_593 },
    });
  });

  it('retains ten-package wrapper print-plan compatibility', () => {
    const plan = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_combined_zones_scoped_release.mjs',
      '--manifest', path.relative(ROOT, temporaryManifest),
      '--release-node', 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR',
      '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8' })) as {
      mode: string;
      globalGateDependency: string;
      packageOrder: string[];
    };
    expect(plan).toMatchObject({
      mode: 'PREPARE_ONLY',
      globalGateDependency: 'NONE',
      packageOrder: manifest.executionOrder.forward,
    });
  });
});
