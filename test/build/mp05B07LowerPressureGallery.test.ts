import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp05-b07-pressure-gallery-'));
const source = 'data/worldsnap-mp08-c1-contained-corridor-post-20260826T194000Z';
const authorization = 'docs/masterplans/05-combined-zones/mp05-b07-lower-pressure-gallery-governor-standing-execution-authorization.json';
const basename = 'mp05-b07-lower-pressure-gallery-01';
let manifest: any;

beforeAll(() => {
  execFileSync(process.execPath, [
    'scripts/compile_mp05_b07_lower_pressure_gallery_01.mjs',
    '--snapshot', source,
    '--out-dir', temp,
    '--generated-at', '2026-08-26T20:30:00.000Z',
  ], { cwd: root, stdio: 'pipe', timeout: 180_000 });
  manifest = JSON.parse(fs.readFileSync(path.join(temp, `${basename}.release-manifest.json`), 'utf8'));
}, 30_000);
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('MP05 B07 lower pressure gallery', () => {
  it('builds a complete ordered containment, recovery-support, and controlled-access transaction', () => {
    expect(manifest.releaseNodeId).toBe('CZ-MP05-B07-LOWER-PRESSURE-GALLERY');
    expect(manifest.scope.releaseId).toBe('MP05-B07-LOWER-PRESSURE-GALLERY-01');
    expect(manifest.executionOrder.forward).toEqual([
      'outer-fluid-liner-and-bulkhead',
      'sealed-core-excavation-and-entry-aperture',
      'controlled-hatch-ladder-and-landing',
    ]);
    expect(manifest.executionOrder.rollback).toEqual([...manifest.executionOrder.forward].reverse());
    expect(manifest.scope.outerLinerAndBulkhead.cellCount).toBe(481);
    expect(manifest.scope.sealedCore.cellCount).toBe(180);
    expect(manifest.scope.gravityRecoverySupports.cellCount).toBe(6);
    expect(manifest.scope.retainedFluidBoundary).toMatchObject({ cellCount: 1029, stateSetSha256: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect(manifest.functionalAcceptance).toMatchObject({ routeWidth: 3, clearHeight: 2, normalHorizontalStations: 29, controlledHatch: 1, ladderRungs: 2, upperBulkheadClosed: true, publicAccessCommissioned: false, emergencyEgressCommissioned: false, upperB07ConnectionCommissioned: false });
  });

  it('is exact-inverse, manifest-valid, and admitted to the scoped kernel in prepare mode only', () => {
    const qa = path.join(temp, 'manifest-qa.json');
    const liveManifest = 'data/buildops/mp05-b07-lower-pressure-gallery-01.release-manifest.json';
    execFileSync(process.execPath, ['scripts/qa_guarded_release_manifest.mjs', '--manifest', liveManifest, '--out', qa], { cwd: root, stdio: 'pipe', timeout: 120_000 });
    expect(JSON.parse(fs.readFileSync(qa, 'utf8')).status).toBe('PASS');
    const plan = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_combined_zones_scoped_release.mjs',
      '--manifest', liveManifest,
      '--release-node', 'CZ-MP05-B07-LOWER-PRESSURE-GALLERY',
      '--authorization', authorization,
      '--existing-source-regions', `${source}/region`,
      '--out-dir', path.join(temp, 'prepare'),
      '--print-plan',
    ], { cwd: root, encoding: 'utf8', timeout: 180_000 }));
    expect(plan.mode).toBe('PREPARE_ONLY');
    expect(plan.stages).toContain('projected-rollback-preflight');
    expect(plan.stages).toContain('live-entity-clearance');
  });

  it('has a source-bound Governor authorization and independent post-release QA entrypoint', () => {
    const auth = JSON.parse(fs.readFileSync(path.join(root, authorization), 'utf8'));
    expect(auth.authorizedReleaseNodes).toEqual(['CZ-MP05-B07-LOWER-PRESSURE-GALLERY']);
    expect(auth.authorizationPayloadSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(auth.hardSafetyKernel).toHaveLength(6);
    expect(fs.existsSync(path.join(root, 'scripts/qa_mp05_b07_lower_pressure_gallery_01_post_release.mjs'))).toBe(true);
  });
});
