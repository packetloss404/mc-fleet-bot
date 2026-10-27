import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'cobalt-wl-north-rail-inspection-transfer-'));
const BASE = 'cobalt-wl-north-rail-inspection-transfer-01';
let manifest: any;

describe('Cobalt Westlight north rail-inspection transfer', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_cobalt_wl_north_rail_inspection_transfer_01.mjs',
      '--out-dir', OUT,
      '--generated-at', '2026-08-27T00:05:00.000Z',
    ], { cwd: ROOT, timeout: 180000 });
    manifest = JSON.parse(fs.readFileSync(path.join(OUT, `${BASE}.release-manifest.json`), 'utf8'));
  });

  afterAll(() => fs.rmSync(OUT, { recursive: true, force: true }));

  it('completes dry, non-rail-walking staff access to both Westlight passive rails', () => {
    expect(manifest.scope.inspectionTransferLadder.cellCount).toBe(5);
    expect(manifest.scope.upperAttachment.cellCount).toBe(1);
    expect(manifest.scope.upperControlledLanding.cellCount).toBe(3);
    expect(manifest.scope.dryNorthRailSideLane.cellCount).toBe(54);
    expect(manifest.scope.retainedNorthPassiveRail.cellCount).toBe(18);
    expect(manifest.scope.retainedSideLaneSupport.cellCount).toBe(18);
    expect(manifest.scope.bothWestlightRailInspectionLanesAccessible).toBe(true);
    expect(manifest.scope.railPowerCommissioned).toBe(false);
    expect(manifest.scope.signalCommissioned).toBe(false);
    expect(manifest.scope.publicRouteCommissioned).toBe(false);
    expect(manifest.scope.passengerServiceCommissioned).toBe(false);
  });

  it('has a scoped guarded kernel and independent post-release QA', () => {
    const plan = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_combined_zones_scoped_release.mjs',
      '--manifest', `data/buildops/${BASE}.release-manifest.json`,
      '--release-node', 'CZ-SYS03-COBALT-WL-NORTH-RAIL-INSPECTION-TRANSFER',
      '--authorization', 'docs/masterplans/05-combined-zones/sys03-cobalt-wl-north-rail-inspection-transfer-governor-standing-execution-authorization.json',
      '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8', timeout: 180000 }));
    expect(plan.packageOrder).toEqual(['containment', 'inspection-transfer']);
    expect(fs.existsSync(path.join(ROOT, 'scripts/qa_cobalt_wl_north_rail_inspection_transfer_01_post_release.mjs'))).toBe(true);
  });
});
