import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'mp05-b07-ice-edge-receiver-'));
const BASE = 'mp05-b07-ice-edge-contained-receiver-01';
let manifest: any;

describe('MP05 B07 ice-edge contained receiver', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_mp05_b07_ice_edge_contained_receiver_01.mjs',
      '--out-dir', OUT,
      '--generated-at', '2026-08-27T00:50:00.000Z',
    ], { cwd: ROOT, timeout: 180000 });
    manifest = JSON.parse(fs.readFileSync(path.join(OUT, `${BASE}.release-manifest.json`), 'utf8'));
  });

  afterAll(() => fs.rmSync(OUT, { recursive: true, force: true }));

  it('installs the exterior liquid-facing bulkhead before the ice-edge receiver', () => {
    expect(manifest.scope.exteriorBulkhead.cellCount).toBe(20);
    expect(manifest.scope.sideContainment.cellCount).toBe(48);
    expect(manifest.scope.iceEdgeDeck.cellCount).toBe(24);
    expect(manifest.scope.roof.cellCount).toBe(24);
    expect(manifest.scope.clearReceiverCore.cellCount).toBe(48);
    expect(manifest.scope.finiteRetainedWaterContact.cellCount).toBe(4);
    expect(manifest.scope.noLiquidTargets).toBe(true);
    expect(manifest.scope.iceSourceTargetCount).toBe(29);
    expect(manifest.functionalAcceptance.publicAccessCommissioned).toBe(false);
    expect(manifest.functionalAcceptance.emergencyEgressCommissioned).toBe(false);
  });

  it('has the guarded kernel and independent post-release QA', () => {
    const plan = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_combined_zones_scoped_release.mjs',
      '--manifest', `data/buildops/${BASE}.release-manifest.json`,
      '--release-node', 'CZ-MP05-B07-ICE-EDGE-CONTAINED-RECEIVER',
      '--authorization', 'docs/masterplans/05-combined-zones/mp05-b07-ice-edge-contained-receiver-governor-standing-execution-authorization.json',
      '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8', timeout: 180000 }));
    expect(plan.packageOrder).toEqual(['exterior-bulkhead-and-side-containment', 'ice-edge-receiver-deck-and-roof']);
    expect(fs.existsSync(path.join(ROOT, 'scripts/qa_mp05_b07_ice_edge_contained_receiver_01_post_release.mjs'))).toBe(true);
  });
});
