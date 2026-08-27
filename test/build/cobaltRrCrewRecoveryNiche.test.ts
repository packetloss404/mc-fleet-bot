import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'cobalt-rr-crew-recovery-niche-'));
const BASE = 'cobalt-rr-crew-recovery-niche-01';
let manifest: any;

describe('Cobalt Ravensreach crew-recovery niche', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_cobalt_rr_crew_recovery_niche_01.mjs',
      '--out-dir', OUT,
      '--generated-at', '2026-08-26T22:35:00.000Z',
    ], { cwd: ROOT, timeout: 180000 });
    manifest = JSON.parse(fs.readFileSync(path.join(OUT, `${BASE}.release-manifest.json`), 'utf8'));
  });

  afterAll(() => fs.rmSync(OUT, { recursive: true, force: true }));

  it('adds a shell-first, gravity-contained crew recovery niche without commissioning passenger systems', () => {
    expect(manifest.scope.recoveryNicheClear.cellCount).toBe(27);
    expect(manifest.scope.bridgeAperture.cellCount).toBe(3);
    expect(manifest.scope.containmentShell.cellCount).toBe(54);
    expect(manifest.scope.gravityContainedBeforeOpening.cellCount).toBe(2);
    expect(manifest.scope.retainedDirectionalRails.cellCount).toBe(36);
    expect(manifest.scope.crewRecoveryNicheConnected).toBe(true);
    expect(manifest.scope.railPowerCommissioned).toBe(false);
    expect(manifest.scope.signalCommissioned).toBe(false);
    expect(manifest.scope.publicPlatformCommissioned).toBe(false);
    expect(manifest.scope.passengerServiceCommissioned).toBe(false);
  });

  it('has a scoped guarded kernel and independent post-release QA', () => {
    const plan = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_combined_zones_scoped_release.mjs',
      '--manifest', `data/buildops/${BASE}.release-manifest.json`,
      '--release-node', 'CZ-SYS03-COBALT-RR-CREW-RECOVERY-NICHE',
      '--authorization', 'docs/masterplans/05-combined-zones/sys03-cobalt-rr-crew-recovery-niche-governor-standing-execution-authorization.json',
      '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8', timeout: 180000 }));
    expect(plan.packageOrder).toEqual(['containment', 'recovery-niche']);
    expect(fs.existsSync(path.join(ROOT, 'scripts/qa_cobalt_rr_crew_recovery_niche_01_post_release.mjs'))).toBe(true);
  });
});
