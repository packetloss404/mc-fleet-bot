import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'cobalt-rr-midshaft-recovery-lighting-'));
const BASE = 'cobalt-rr-midshaft-recovery-lighting-01';
let manifest: any;

describe('Cobalt Ravensreach mid-shaft recovery lighting', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_cobalt_rr_midshaft_recovery_lighting_01.mjs',
      '--out-dir', OUT,
      '--generated-at', '2026-08-26T23:40:00.000Z',
    ], { cwd: ROOT, timeout: 180000 });
    manifest = JSON.parse(fs.readFileSync(path.join(OUT, `${BASE}.release-manifest.json`), 'utf8'));
  });

  afterAll(() => fs.rmSync(OUT, { recursive: true, force: true }));

  it('lights the recovery transfer without reducing its retained clearance or ladder interfaces', () => {
    expect(manifest.scope.fixtures.cellCount).toBe(2);
    expect(manifest.scope.retainedRecoveryClear.cellCount).toBe(18);
    expect(manifest.scope.retainedLeftLadder.cellCount).toBe(3);
    expect(manifest.scope.retainedRightLadder.cellCount).toBe(3);
    expect(manifest.scope.midShaftRecoveryLandingLit).toBe(true);
    expect(manifest.scope.railPowerCommissioned).toBe(false);
    expect(manifest.scope.signalCommissioned).toBe(false);
    expect(manifest.scope.publicRouteCommissioned).toBe(false);
    expect(manifest.scope.passengerServiceCommissioned).toBe(false);
  });

  it('has a scoped kernel and independent post-release QA', () => {
    const plan = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_combined_zones_scoped_release.mjs',
      '--manifest', `data/buildops/${BASE}.release-manifest.json`,
      '--release-node', 'CZ-SYS03-COBALT-RR-MIDSHAFT-RECOVERY-LIGHTING',
      '--authorization', 'docs/masterplans/05-combined-zones/sys03-cobalt-rr-midshaft-recovery-lighting-governor-standing-execution-authorization.json',
      '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8', timeout: 180000 }));
    expect(plan.packageOrder).toEqual(['recovery-lighting']);
    expect(fs.existsSync(path.join(ROOT, 'scripts/qa_cobalt_rr_midshaft_recovery_lighting_01_post_release.mjs'))).toBe(true);
  });
});
