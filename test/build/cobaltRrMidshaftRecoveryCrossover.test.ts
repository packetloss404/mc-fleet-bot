import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'cobalt-rr-midshaft-recovery-crossover-'));
const BASE = 'cobalt-rr-midshaft-recovery-crossover-01';
let manifest: any;

describe('Cobalt Ravensreach mid-shaft recovery crossover', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_cobalt_rr_midshaft_recovery_crossover_01.mjs',
      '--out-dir', OUT,
      '--generated-at', '2026-08-26T23:30:00.000Z',
    ], { cwd: ROOT, timeout: 180000 });
    manifest = JSON.parse(fs.readFileSync(path.join(OUT, `${BASE}.release-manifest.json`), 'utf8'));
  });

  afterAll(() => fs.rmSync(OUT, { recursive: true, force: true }));

  it('creates a dry cross-shaft recovery transfer above the sealed water band', () => {
    expect(manifest.scope.crossoverClear.cellCount).toBe(18);
    expect(manifest.scope.crossoverFloor.cellCount).toBe(6);
    expect(manifest.scope.crossoverShell.cellCount).toBe(36);
    expect(manifest.scope.leftShaftEntry.cellCount).toBe(6);
    expect(manifest.scope.rightShaftEntry.cellCount).toBe(6);
    expect(manifest.scope.retainedLeftLadder.cellCount).toBe(3);
    expect(manifest.scope.retainedRightLadder.cellCount).toBe(3);
    expect(manifest.scope.retainedWaterBand).toEqual({ minY: 33, maxY: 39, modified: false });
    expect(manifest.scope.midShaftRecoveryCrossoverConnected).toBe(true);
    expect(manifest.scope.twoIndependentControlledSurfaceDischargesRetained).toBe(true);
    expect(manifest.scope.publicRouteCommissioned).toBe(false);
  });

  it('has the scoped guarded kernel and independent post-release QA', () => {
    const plan = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_combined_zones_scoped_release.mjs',
      '--manifest', `data/buildops/${BASE}.release-manifest.json`,
      '--release-node', 'CZ-SYS03-COBALT-RR-MIDSHAFT-RECOVERY-CROSSOVER',
      '--authorization', 'docs/masterplans/05-combined-zones/sys03-cobalt-rr-midshaft-recovery-crossover-governor-standing-execution-authorization.json',
      '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8', timeout: 180000 }));
    expect(plan.packageOrder).toEqual(['containment', 'crossover']);
    expect(fs.existsSync(path.join(ROOT, 'scripts/qa_cobalt_rr_midshaft_recovery_crossover_01_post_release.mjs'))).toBe(true);
  });
});
