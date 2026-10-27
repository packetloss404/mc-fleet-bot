import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const root = process.cwd();
const manifest = path.join(root, 'data/buildops/mp08-c1-sealed-containment-corridor-01.release-manifest.json');
const authorization = path.join(root, 'docs/masterplans/08-raven-rock/mp08-c1-sealed-containment-governor-standing-execution-authorization.json');
const source = path.join(root, 'data/worldsnap-mp08-c1-contained-corridor-stale-run-rolled-back-20260826T191000Z/region');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp08-c1-contained-test-'));

afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('MP08 C1 sealed containment corridor', () => {
  it('binds the exact finite dry containment package and its inverse', () => {
    execFileSync(process.execPath, [
      'scripts/qa_guarded_release_manifest.mjs', '--manifest', path.relative(root, manifest),
      '--out', path.join(temp, 'manifest-qa.json'),
    ], { cwd: root, stdio: 'pipe' });
    const qa = JSON.parse(fs.readFileSync(path.join(temp, 'manifest-qa.json'), 'utf8'));
    const release = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    expect(qa.status).toBe('PASS');
    expect(release.scope.releaseId).toBe('MP08-C1-SEALED-CONTAINMENT-CORRIDOR-01');
    expect(release.target.operatedUnion.cellCount).toBe(932);
    expect(release.functionalAcceptance.stations).toBe(62);
    // 64 stations × three-wide × two-clear; the post QA separately checks
    // the 192 feet cells for support and normal-walk continuity.
    expect(release.scope.retainedClearRoute.cellCount).toBe(372);
    expect(release.functionalAcceptance.fluidOrLavaWithinTargetHalo).toBe(0);
    expect(release.functionalAcceptance.gravityWithinTargetHalo).toBe(0);
    expect(release.functionalAcceptance.blockEntitiesWithinTargetHalo).toBe(0);
    expect(release.functionalAcceptance.savedEntitiesWithinTargetHalo).toBe(0);
    expect(release.executionOrder.forward).toEqual(['c1-core-liner', 'cavern-a-vestibule', 'cavern-b-vestibule']);
    expect(release.executionOrder.rollback).toEqual(['cavern-b-vestibule', 'cavern-a-vestibule', 'c1-core-liner']);
  });

  it('is admitted only through the Governor-scoped guarded kernel in prepare mode', () => {
    const output = execFileSync(process.execPath, [
      'scripts/run_combined_zones_scoped_release.mjs', '--manifest', path.relative(root, manifest),
      '--release-node', 'MP08-C1-SEALED-CONTAINMENT-CORRIDOR', '--authorization', path.relative(root, authorization),
      '--existing-source-regions', path.relative(root, source), '--out-dir', temp, '--print-plan',
    ], { cwd: root, encoding: 'utf8' });
    const plan = JSON.parse(output);
    expect(plan.mode).toBe('PREPARE_ONLY');
    expect(plan.stages).toContain('live-entity-clearance');
    expect(plan.stages).toContain('projected-rollback-preflight');
  });
});
