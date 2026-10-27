import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'cobalt-wl-south-rail-staff-platform-'));
const BASE = 'cobalt-wl-south-rail-staff-platform-01';
let manifest: any;

describe('Cobalt Westlight south rail staff platform', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_cobalt_wl_south_rail_staff_platform_01.mjs',
      '--out-dir', OUT,
      '--generated-at', '2026-08-27T00:35:00.000Z',
    ], { cwd: ROOT, timeout: 180000 });
    manifest = JSON.parse(fs.readFileSync(path.join(OUT, `${BASE}.release-manifest.json`), 'utf8'));
  });

  afterAll(() => fs.rmSync(OUT, { recursive: true, force: true }));

  it('completes paired protected two-wide staff platforms without commissioning passenger service', () => {
    expect(manifest.scope.newOuterContainmentWall.cellCount).toBe(72);
    expect(manifest.scope.newSecondWalkDeck.cellCount).toBe(18);
    expect(manifest.scope.newSecondWalkClear.cellCount).toBe(51);
    expect(manifest.scope.retainedLadderBacking.cellCount).toBe(3);
    expect(manifest.scope.retainedSouthInspectionLadder.cellCount).toBe(5);
    expect(manifest.scope.retainedSouthSideLane.cellCount).toBe(54);
    expect(manifest.scope.retainedSouthPassiveRail.cellCount).toBe(18);
    expect(manifest.scope.retainedNorthTubeWall.cellCount).toBe(72);
    expect(manifest.scope.retainedNorthPassiveRail.cellCount).toBe(18);
    expect(manifest.scope.pairedTwoWideStaffPlatformsConnected).toBe(true);
    expect(manifest.scope.publicPlatformCommissioned).toBe(false);
    expect(manifest.scope.passengerServiceCommissioned).toBe(false);
  });

  it('has the scoped guarded kernel and independent post-release QA', () => {
    const plan = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_combined_zones_scoped_release.mjs',
      '--manifest', `data/buildops/${BASE}.release-manifest.json`,
      '--release-node', 'CZ-SYS03-COBALT-WL-SOUTH-RAIL-STAFF-PLATFORM',
      '--authorization', 'docs/masterplans/05-combined-zones/sys03-cobalt-wl-south-rail-staff-platform-governor-standing-execution-authorization.json',
      '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8', timeout: 180000 }));
    expect(plan.packageOrder).toEqual(['containment', 'staff-platform']);
    expect(fs.existsSync(path.join(ROOT, 'scripts/qa_cobalt_wl_south_rail_staff_platform_01_post_release.mjs'))).toBe(true);
  });
});
