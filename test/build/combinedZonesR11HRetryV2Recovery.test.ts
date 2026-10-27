import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME =
  'combined-zones-r11h-retry-v2-c1-hydraulic-isolation-bridge-1189-1206';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const MANIFEST = path.join(BUILDOPS, `${BASENAME}.release-manifest.json`);
const RECOVERY = path.join(
  ROOT,
  'data/world-review/combined-zones-r11h-live-20260822T031103Z/r11h-recovery-acceptance.json',
);
const RECOVERY_MD = path.join(
  ROOT,
  'data/world-review/combined-zones-r11h-live-20260822T031103Z/r11h-recovery-acceptance.md',
);
const OFFLINE = path.join(
  ROOT,
  'data/world-review/combined-zones-r11h-retry-v2-offline-20260822T033000Z',
);
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-r11h-v2-'));
const artifactNames = [
  `${BASENAME}.release-manifest.json`,
  `${BASENAME}.c1-bridge-1189-1206-dependencies.forward.txt`,
  `${BASENAME}.c1-bridge-1189-1206-dependencies.rollback.txt`,
  `${BASENAME}.c1-bridge-1189-1206-structure.forward.txt`,
  `${BASENAME}.c1-bridge-1189-1206-structure.rollback.txt`,
];

type Manifest = {
  manifestIdentity: string;
  mvpScope: boolean;
  packages: Array<{ key: string }>;
  scope: {
    lifecycleRebound: { changedForwardRecordCount: number; changedRollbackRecordCount: number };
    retainedHydraulicGraph: {
      fluidCellCount: number;
      componentCount: number;
      minimumTargetChebyshevDistance: number;
      targetHaloFluidCount: number;
    };
  };
  target: { operatedUnion: { cellCount: number; coordinateSetSha256: string } };
};

let manifest: Manifest;

beforeAll(() => {
  execFileSync(process.execPath, [
    'scripts/compile_combined_zones_r11h_retry_v2_c1_hydraulic_isolation_bridge.mjs',
    '--out-dir', temporaryDirectory,
    '--generated-at', '2026-08-22T03:25:00Z',
  ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
  manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) as Manifest;
});

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R11H compensated recovery and retry-v2', () => {
  it('accepts only the exact sparse lifecycle delta and bounded external fluid settlement', () => {
    const auditOut = path.join(temporaryDirectory, 'recovery.json');
    const auditMd = path.join(temporaryDirectory, 'recovery.md');
    execFileSync(process.execPath, [
      'scripts/audit_combined_zones_r11h_retry_recovery.mjs',
      '--out', auditOut,
      '--md-out', auditMd,
      '--generated-at', '2026-08-22T03:20:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
    expect(fs.readFileSync(auditOut)).toEqual(fs.readFileSync(RECOVERY));
    expect(fs.readFileSync(auditMd)).toEqual(fs.readFileSync(RECOVERY_MD));
    const recovery = JSON.parse(fs.readFileSync(RECOVERY, 'utf8')) as {
      status: string;
      recoveryAcceptanceIdentitySha256: string;
      exactOperatedHalo: { cellCount: number; diffCount: number; recoveryFluidCount: number };
      retainedHydraulicReview: {
        recovery: { fluidCellCount: number; componentCount: number; minimumTargetChebyshevDistance: number };
      };
      broadScreeningBox: { diffCount: number; fluidOrAirSettlementDiffCount: number; solidDamageCount: number };
      preservation: Record<string, number>;
    };
    expect(recovery).toMatchObject({
      status:
        'PASS_RECOVERY_ACCEPTED_TWO_DIRT_GRASS_LIFECYCLE_TRANSITIONS_AND_BOUNDED_FLUID_SETTLEMENT_OUTSIDE_OPERATED_HALO',
      recoveryAcceptanceIdentitySha256:
        '9941594dc2f744af576efbddfc6eac3bf9fe954517347bbd52f49c4ba0f24adb',
      exactOperatedHalo: { cellCount: 7120, diffCount: 2, recoveryFluidCount: 0 },
      retainedHydraulicReview: {
        recovery: { fluidCellCount: 45, componentCount: 1, minimumTargetChebyshevDistance: 2 },
      },
      broadScreeningBox: {
        diffCount: 53, fluidOrAirSettlementDiffCount: 51, solidDamageCount: 0,
      },
    });
    expect(Object.values(recovery.preservation)).toEqual(expect.arrayContaining([0]));
  });

  it('compiles all retry artifacts deterministically and independently of out-dir', () => {
    for (const name of artifactNames) {
      expect(fs.readFileSync(path.join(temporaryDirectory, name)))
        .toEqual(fs.readFileSync(path.join(BUILDOPS, name)));
    }
    expect(crypto.createHash('sha256').update(fs.readFileSync(MANIFEST)).digest('hex'))
      .toBe('6a4dd03ff84d1e0af05e0c3f5f81aa5b2347abc05f363dd4657959a3c9d48d79');
    expect(manifest.manifestIdentity)
      .toBe('bfc9064f966a8032c38f70eb13e52eec6995470cde7cd97b37f42ccf90253d67');
  });

  it('preserves geometry and binds exactly two lifecycle and 45 fluid states', () => {
    expect(manifest.mvpScope).toBe(true);
    expect(manifest.packages).toHaveLength(2);
    expect(manifest.target.operatedUnion).toEqual(expect.objectContaining({
      cellCount: 1666,
      coordinateSetSha256:
        'ef89661a02a5544a093255ada780e8037200f2b9aa0cd421d30c7bd1fedcf129',
    }));
    expect(manifest.scope.lifecycleRebound).toMatchObject({
      changedForwardRecordCount: 2, changedRollbackRecordCount: 2,
    });
    expect(manifest.scope.retainedHydraulicGraph).toMatchObject({
      fluidCellCount: 45,
      componentCount: 1,
      minimumTargetChebyshevDistance: 2,
      targetHaloFluidCount: 0,
    });
  });

  it('passes independent source, inverse, geometry, and fluid-baseline QA', () => {
    const out = path.join(temporaryDirectory, 'qa.json');
    const md = path.join(temporaryDirectory, 'qa.md');
    execFileSync(process.execPath, [
      'scripts/qa_combined_zones_r11h_retry_v2_c1_hydraulic_isolation_bridge_offline.mjs',
      '--manifest', MANIFEST,
      '--out', out,
      '--md-out', md,
      '--generated-at', '2026-08-22T03:30:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
    expect(JSON.parse(fs.readFileSync(out, 'utf8'))).toMatchObject({
      status: 'PASS',
      qaPayloadSha256: 'a9c0d993626a1170633ac5d05b648e93c4a1a46048121843a2a777493921a9d7',
      checks: {
        exactSourceGuardMatchCount: 1666,
        exactInverseRecordCount: 1666,
        changedForwardSourceGuardCount: 2,
        changedRollbackTargetCount: 2,
        retainedFluidBaselineCount: 45,
        targetHaloFluidCount: 0,
        strictNoopWeakened: false,
      },
    });
  });

  it('passes manifest, source/rollback, parser, block-entity, and wrapper gates', () => {
    expect(JSON.parse(fs.readFileSync(path.join(OFFLINE, 'manifest-qa.json'), 'utf8')))
      .toMatchObject({ status: 'PASS', totals: { packages: 2, uniqueTargetCells: 1666 } });
    for (const name of [
      'dependencies-forward-source-preflight.json',
      'structure-forward-source-preflight.json',
      'structure-projected-rollback-preflight.json',
      'dependencies-projected-rollback-preflight.json',
    ]) expect(JSON.parse(fs.readFileSync(path.join(OFFLINE, name), 'utf8')))
      .toMatchObject({ status: 'PASS' });
    for (const name of [
      'dependencies-forward-strict-dry-run.json',
      'structure-forward-strict-dry-run.json',
      'structure-rollback-strict-dry-run.json',
      'dependencies-rollback-strict-dry-run.json',
    ]) expect(JSON.parse(fs.readFileSync(path.join(OFFLINE, name), 'utf8')))
      .toMatchObject({ status: 'dry_run', dryRun: true, strictNoop: true });
    expect(JSON.parse(fs.readFileSync(path.join(OFFLINE, 'block-entity-clearance.json'), 'utf8')))
      .toMatchObject({ status: 'PASS', blockingBlockEntityCount: 0 });
    expect(JSON.parse(fs.readFileSync(path.join(OFFLINE, 'wrapper-print-plan.json'), 'utf8')))
      .toMatchObject({ mode: 'PREPARE_ONLY', globalGateDependency: 'NONE' });
  });
});
