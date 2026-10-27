import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'sys03-west-high-finite-containment-'));
const BASE = 'west-high-finite-containment-test';
let manifest: any;

const operations = (filename: string) => fs.readFileSync(filename, 'utf8').trim().split(/\r?\n/).filter(Boolean).map((line) => {
  const [kind, x, y, z, expectedX, expectedY, expectedZ, from, to] = line.split(/\s+/);
  expect(`${expectedX},${expectedY},${expectedZ}`).toBe(`${x},${y},${z}`);
  expect(kind).toBe('REPL');
  return { cell: `${x},${y},${z}`, from, to };
});

beforeAll(() => {
  execFileSync(process.execPath, [
    'scripts/compile_sys03_west_high_finite_containment_01.mjs',
    '--out-dir', OUT,
    '--basename', BASE,
    '--generated-at', '2026-08-27T02:00:00.000Z',
  ], { cwd: ROOT, stdio: 'pipe', timeout: 180_000 });
  manifest = JSON.parse(fs.readFileSync(path.join(OUT, `${BASE}.release-manifest.json`), 'utf8'));
});

afterAll(() => fs.rmSync(OUT, { recursive: true, force: true }));

describe('SYS03 West High finite water and gravity containment compiler', () => {
  it('binds the latest complete immutable source and treats the complete finite component', () => {
    expect(manifest.status).toBe('COMPILED_OFFLINE_FINITE_WATER_AND_GRAVITY_CONTAINMENT_AWAITING_FRESH_KERNEL');
    expect(manifest.source.snapshotRoot).toBe('data/worldsnap-mp11-bkr-c01-independent-return-01-post-20260827T014500Z');
    expect(manifest.scope.waterTreatment).toMatchObject({
      kind: 'FULL_COMPONENT_PERMANENT_SEALED_PLUG',
      sourceComponent: { cellCount: 2525, coordinateSetSha256: '220cf041351f18cd75e8acfa587a2b29f3eaf29fb821e355d910ee93be31271e' },
      boundaryContactCount: 0,
      exteriorFluidHaloCount: 0,
      sourceStateCensus: { 'minecraft:water[level=0]': 2513, 'minecraft:bubble_column[drag=true]': 12 },
    });
    expect(manifest.scope.gravityTreatment.targets.cellCount).toBe(92);
    expect(manifest.scope.operatedUnion.cellCount).toBe(2617);
  });

  it('uses an ordered permanent containment treatment with exact inverses and no release authority', () => {
    expect(manifest.executionOrder).toMatchObject({
      forward: ['gravity-foundation-lock-bottom-up', 'finite-water-component-plug-low-to-high'],
      rollback: ['finite-water-component-plug-low-to-high', 'gravity-foundation-lock-bottom-up'],
    });
    expect(manifest.operations['gravity-foundation-lock-bottom-up']).toMatchObject({ forwardCommandCount: 92, rollbackCommandCount: 92, exactInverse: true });
    expect(manifest.operations['finite-water-component-plug-low-to-high']).toMatchObject({ forwardCommandCount: 2525, rollbackCommandCount: 2525, exactInverse: true });
    expect(manifest.scope.receiverAndOverflow).toMatchObject({ kind: 'ZERO_DISCHARGE_SEALED_MASS_TERMINAL', retainedOrReleasedFluidCells: 0 });
    expect(manifest.functionalAcceptance).toMatchObject({ civilCorridorCommissioned: false, railCommissioned: false, publicAccessCommissioned: false });
    expect(manifest.safetyBoundary).toMatchObject({ liveCallsPerformed: false, worldEditsPerformed: false, executionAuthorizedByThisManifest: false });
  });

  it('writes a cell-for-cell reverse inverse for both containment stages', () => {
    for (const stage of manifest.packages) {
      const forward = operations(stage.forward);
      const rollback = operations(stage.rollback);
      expect(rollback).toHaveLength(forward.length);
      expect(rollback).toEqual(forward.slice().reverse().map((operation) => ({
        cell: operation.cell,
        from: operation.to,
        to: operation.from,
      })));
    }
  });

  it('has a scoped authorization and a fresh-source rebind preparation path', () => {
    const planDir = path.join(ROOT, 'data/buildops', `sys03-west-high-finite-test-${process.pid}-${Date.now()}`);
    try {
      const output = execFileSync(process.execPath, [
        'scripts/prepare_sys03_west_high_finite_containment_release.mjs',
        '--source-snapshot-root', 'data/worldsnap-mp11-bkr-c01-independent-return-01-post-20260827T014500Z',
        '--package-dir', path.relative(ROOT, planDir), '--print-plan', '--generated-at', '2026-08-27T02:00:00.000Z',
      ], { cwd: ROOT, encoding: 'utf8', timeout: 180_000 });
      const prepared = JSON.parse(output);
      expect(prepared).toMatchObject({ status: 'SOURCE_REBOUND_PREPARE_PLAN', worldMutated: false, executionAuthorized: false });
      expect(prepared.captureId).toBe(manifest.source.completeSaveCapture.captureId);
      expect(prepared.genericOutput).toMatchObject({ mode: 'PREPARE_ONLY', packageOrder: ['gravity-foundation-lock-bottom-up', 'finite-water-component-plug-low-to-high'] });
    } finally {
      fs.rmSync(planDir, { recursive: true, force: true });
    }
  });

  it('projects the independent post QA without mistaking it for release evidence', () => {
    const qa = path.join(OUT, 'projected-post-qa.json');
    execFileSync(process.execPath, [
      'scripts/qa_sys03_west_high_finite_containment_01_post_release.mjs',
      '--manifest', path.join(OUT, `${BASE}.release-manifest.json`),
      '--snapshot', 'data/worldsnap-mp11-bkr-c01-independent-return-01-post-20260827T014500Z',
      '--project-source', '--out', qa,
    ], { cwd: ROOT, stdio: 'pipe', timeout: 180_000 });
    const result = JSON.parse(fs.readFileSync(qa, 'utf8'));
    expect(result).toMatchObject({
      status: 'PROJECTED_QA_PASS_NOT_POST_RELEASE',
      geometry: { operatedCells: 2617, waterComponentCells: 2525, gravityCells: 92 },
      checks: { all2617TargetsExact: true, zeroFluidInOperatedUnion: true, rollbackOrderRetainsGravityUntilWaterRestored: true },
    });
  });

  it('exposes an atomic executor whose tested path is preparation-only', () => {
    const packageDir = path.join(ROOT, 'data/buildops', `sys03-west-high-atomic-test-${process.pid}-${Date.now()}`);
    try {
      const output = execFileSync(process.execPath, [
        'scripts/run_sys03_west_high_finite_containment_atomic_release.mjs',
        '--existing-source-root', 'data/worldsnap-mp11-bkr-c01-independent-return-01-post-20260827T014500Z',
        '--package-dir', path.relative(ROOT, packageDir), '--print-plan', '--generated-at', '2026-08-27T02:00:00.000Z',
      ], { cwd: ROOT, encoding: 'utf8', timeout: 180_000 });
      const result = JSON.parse(output);
      expect(result).toMatchObject({ status: 'PREPARE_PLAN_ONLY', mode: 'PREPARE_ONLY', worldMutated: false });
      expect(result.plan.stages).toEqual(expect.arrayContaining([
        'fresh-source-complete-save', 'forward-source-preflight', 'strict-forward-parser-check',
        'strict-rollback-parser-check', 'projected-rollback-preflight', 'block-entity-clearance', 'live-entity-clearance',
      ]));
    } finally {
      fs.rmSync(packageDir, { recursive: true, force: true });
    }
  });

  it('preflights post-state rollback in rollback order, without replaying completed forwards', () => {
    const post = 'data/worldsnap-sys03-west-high-containment-post-20260827T021500Z/region';
    const manifestPath = 'data/buildops/sys03-west-high-containment-20260827T021500Z/sys03-west-high-finite-containment-01-combined-zones-5a6dd0e84edd4c3dbfb6aba1831dec8a.release-manifest.json';
    if (!fs.existsSync(path.join(ROOT, post)) || !fs.existsSync(path.join(ROOT, manifestPath))) return;
    const release = JSON.parse(fs.readFileSync(path.join(ROOT, manifestPath), 'utf8'));
    const water = release.packages.find((pkg: { key: string }) => pkg.key === 'finite-water-component-plug-low-to-high');
    const gravity = release.packages.find((pkg: { key: string }) => pkg.key === 'gravity-foundation-lock-bottom-up');
    const waterReport = path.join(OUT, 'water-post-rollback.json'); const gravityReport = path.join(OUT, 'gravity-post-rollback.json');
    execFileSync(process.execPath, ['scripts/preflight_guarded_ops.mjs', water.rollback, '--regions', post, '--report', waterReport], { cwd: ROOT, stdio: 'pipe', timeout: 180_000 });
    execFileSync(process.execPath, ['scripts/preflight_guarded_ops.mjs', gravity.rollback, '--regions', post, '--source-overlay-ops', water.rollback, '--report', gravityReport], { cwd: ROOT, stdio: 'pipe', timeout: 180_000 });
    expect(JSON.parse(fs.readFileSync(waterReport, 'utf8'))).toMatchObject({ status: 'PASS', passed: 2525, failed: 0 });
    expect(JSON.parse(fs.readFileSync(gravityReport, 'utf8'))).toMatchObject({ status: 'PASS', passed: 92, failed: 0 });
    const priorLedger = 'data/world-review/sys03-west-high-containment-live-20260827T021500Z/atomic-execution-ledger.json';
    const closeout = path.join(OUT, 'atomic-post-closeout-ledger.json'); const qa = path.join(OUT, 'post-qa.json');
    execFileSync(process.execPath, [
      'scripts/finalize_sys03_west_high_finite_containment_post_closeout.mjs', '--ledger', priorLedger,
      '--manifest', manifestPath, '--water-preflight', waterReport, '--gravity-preflight', gravityReport, '--out', closeout,
    ], { cwd: ROOT, stdio: 'pipe', timeout: 180_000 });
    execFileSync(process.execPath, [
      'scripts/qa_sys03_west_high_finite_containment_01_post_release.mjs', '--manifest', manifestPath,
      '--ledger', closeout, '--out', qa,
    ], { cwd: ROOT, stdio: 'pipe', timeout: 180_000 });
    expect(JSON.parse(fs.readFileSync(closeout, 'utf8')).status).toBe('EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE');
    expect(JSON.parse(fs.readFileSync(qa, 'utf8')).status).toBe('PASS_EXECUTED_SYS03_WEST_HIGH_FINITE_CONTAINMENT_QA');
  });

  it('binds as-built plan and section maps to the accepted post snapshot', () => {
    const mapDir = path.join(OUT, 'poststate-maps'); const markdown = path.join(OUT, 'poststate-maps.md');
    execFileSync(process.execPath, [
      'scripts/generate_sys03_west_high_finite_containment_post_maps.mjs',
      '--out-dir', mapDir, '--markdown-out', markdown,
    ], { cwd: ROOT, stdio: 'pipe', timeout: 180_000 });
    const report = JSON.parse(fs.readFileSync(path.join(mapDir, 'west-high-finite-containment-post-maps.json'), 'utf8'));
    expect(report).toMatchObject({
      status: 'PASS_EXECUTED_POSTSTATE_MAPS', readOnly: true, worldMutated: false,
      geometry: { waterBubblePlugCells: 2525, gravityFoundationLockCells: 92, operatedCells: 2617, residualTargetMismatches: 0 },
      nonClaims: expect.arrayContaining(['No corridor clearing or opening.', 'No rail, public route, service route, or passenger operation.']),
    });
    expect(fs.readFileSync(markdown, 'utf8')).toContain('This does **not** clear/open the West High corridor');
    expect(fs.existsSync(path.join(mapDir, 'west-high-finite-containment-post-plan-y47.svg'))).toBe(true);
    expect(fs.existsSync(path.join(mapDir, 'west-high-finite-containment-post-section-x206.svg'))).toBe(true);
  });
});
