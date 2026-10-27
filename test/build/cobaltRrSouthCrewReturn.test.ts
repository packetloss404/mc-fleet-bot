import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'cobalt-rr-south-crew-return-'));
const BASE = 'cobalt-rr-south-crew-return-01';
let manifest: any;

describe('Cobalt Ravensreach south crew return', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/compile_cobalt_rr_south_crew_return_01.mjs',
      '--out-dir', OUT,
      '--generated-at', '2026-08-26T21:45:00.000Z',
    ], { cwd: ROOT, timeout: 180000 });
    manifest = JSON.parse(fs.readFileSync(path.join(OUT, `${BASE}.release-manifest.json`), 'utf8'));
  });

  afterAll(() => fs.rmSync(OUT, { recursive: true, force: true }));

  it('connects directional crew platforms around the rail ends without commissioning passenger service', () => {
    expect(manifest.scope.southCrewDeck.cellCount).toBe(36);
    expect(manifest.scope.southCrewHeadroom.cellCount).toBe(54);
    expect(manifest.scope.southOuterWall.cellCount).toBe(72);
    expect(manifest.scope.eastReturnBridgeDeck.cellCount).toBe(7);
    expect(manifest.scope.eastReturnBridgeClear.cellCount).toBe(21);
    expect(manifest.scope.eastReturnBridgeWall.cellCount).toBe(28);
    expect(manifest.scope.retainedDirectionalRails.cellCount).toBe(36);
    expect(manifest.scope.crewReturnConnectedWithoutRailCrossing).toBe(true);
    expect(manifest.scope.publicPlatformCommissioned).toBe(false);
    expect(manifest.scope.passengerServiceCommissioned).toBe(false);
  });

  it('has the guarded kernel and independent post-release QA', () => {
    const plan = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_combined_zones_scoped_release.mjs',
      '--manifest', `data/buildops/${BASE}.release-manifest.json`,
      '--release-node', 'CZ-SYS03-COBALT-RR-SOUTH-CREW-RETURN',
      '--authorization', 'docs/masterplans/05-combined-zones/sys03-cobalt-rr-south-crew-return-governor-standing-execution-authorization.json',
      '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8', timeout: 180000 }));
    expect(plan.packageOrder).toEqual(['containment', 'return']);
    expect(fs.existsSync(path.join(ROOT, 'scripts/qa_cobalt_rr_south_crew_return_01_post_release.mjs'))).toBe(true);
  });
});
