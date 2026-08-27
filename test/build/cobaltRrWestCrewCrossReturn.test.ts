import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'cobalt-rr-west-crew-cross-return-'));
const BASE = 'cobalt-rr-west-crew-cross-return-01';
let manifest: any;

describe('Cobalt Ravensreach west crew cross-return', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_cobalt_rr_west_crew_cross_return_01.mjs',
      '--out-dir', OUT,
      '--generated-at', '2026-08-26T23:15:00.000Z',
    ], { cwd: ROOT, timeout: 180000 });
    manifest = JSON.parse(fs.readFileSync(path.join(OUT, `${BASE}.release-manifest.json`), 'utf8'));
  });

  afterAll(() => fs.rmSync(OUT, { recursive: true, force: true }));

  it('adds a second actual crew return around the opposite rail termini', () => {
    expect(manifest.scope.westCrossReturnDeck.cellCount).toBe(7);
    expect(manifest.scope.westCrossReturnClear.cellCount).toBe(21);
    expect(manifest.scope.westOuterSafetyWall.cellCount).toBe(28);
    expect(manifest.scope.retainedDirectionalRails.cellCount).toBe(36);
    expect(manifest.scope.retainedEastReturnBridge.cellCount).toBe(28);
    expect(manifest.scope.independentCrewCrossReturns).toBe(2);
    expect(manifest.scope.crewCirculationConnectedWithoutRailCrossing).toBe(true);
    expect(manifest.scope.railPowerCommissioned).toBe(false);
    expect(manifest.scope.signalCommissioned).toBe(false);
    expect(manifest.scope.passengerServiceCommissioned).toBe(false);
  });

  it('has the scoped guarded kernel and independent post-release QA', () => {
    const plan = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_combined_zones_scoped_release.mjs',
      '--manifest', `data/buildops/${BASE}.release-manifest.json`,
      '--release-node', 'CZ-SYS03-COBALT-RR-WEST-CREW-CROSS-RETURN',
      '--authorization', 'docs/masterplans/05-combined-zones/sys03-cobalt-rr-west-crew-cross-return-governor-standing-execution-authorization.json',
      '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8', timeout: 180000 }));
    expect(plan.packageOrder).toEqual(['containment', 'cross-return']);
    expect(fs.existsSync(path.join(ROOT, 'scripts/qa_cobalt_rr_west_crew_cross_return_01_post_release.mjs'))).toBe(true);
  });
});
