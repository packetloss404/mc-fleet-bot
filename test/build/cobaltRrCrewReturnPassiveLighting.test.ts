import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'cobalt-rr-crew-return-lighting-'));
const BASE = 'cobalt-rr-crew-return-passive-lighting-01';
let manifest: any;

describe('Cobalt Ravensreach crew-return passive lighting', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_cobalt_rr_crew_return_passive_lighting_01.mjs',
      '--out-dir', OUT,
      '--generated-at', '2026-08-26T22:20:00.000Z',
    ], { cwd: ROOT, timeout: 180000 });
    manifest = JSON.parse(fs.readFileSync(path.join(OUT, `${BASE}.release-manifest.json`), 'utf8'));
  });

  afterAll(() => fs.rmSync(OUT, { recursive: true, force: true }));

  it('covers every crew-return segment with retained-wall static fixtures', () => {
    expect(manifest.scope.fixtures.cellCount).toBe(6);
    expect(manifest.scope.fixtureZones).toEqual({ northPlatform: 2, eastReturnBridge: 2, southPlatform: 2 });
    expect(manifest.scope.retainedDirectionalRails.cellCount).toBe(36);
    expect(manifest.scope.crewReturnWayfindingLit).toBe(true);
    expect(manifest.scope.railPowerCommissioned).toBe(false);
    expect(manifest.scope.signalCommissioned).toBe(false);
    expect(manifest.scope.passengerServiceCommissioned).toBe(false);
  });

  it('has the scoped kernel and independent post-release QA', () => {
    const plan = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_combined_zones_scoped_release.mjs',
      '--manifest', `data/buildops/${BASE}.release-manifest.json`,
      '--release-node', 'CZ-SYS03-COBALT-RR-CREW-RETURN-PASSIVE-LIGHTING',
      '--authorization', 'docs/masterplans/05-combined-zones/sys03-cobalt-rr-crew-return-passive-lighting-governor-standing-execution-authorization.json',
      '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8', timeout: 180000 }));
    expect(plan.packageOrder).toEqual(['passive-lighting']);
    expect(fs.existsSync(path.join(ROOT, 'scripts/qa_cobalt_rr_crew_return_passive_lighting_01_post_release.mjs'))).toBe(true);
  });
});
