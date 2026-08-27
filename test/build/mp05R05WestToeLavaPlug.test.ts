import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = process.cwd();
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'mp05-r05-lava-plug-'));
const source = 'data/worldsnap-mp05-b07-surface-receiver-descent-post-20260826T221000Z';
let manifest: any;
describe('MP05 R05 west-toe finite lava plug', () => {
  beforeAll(() => {
    execFileSync(process.execPath, ['scripts/compile_mp05_r05_west_toe_lava_plug_01.mjs', '--snapshot', source, '--out-dir', out, '--generated-at', '2026-08-26T22:30:00.000Z'], { cwd: root, stdio: 'pipe', timeout: 120_000 });
    manifest = JSON.parse(fs.readFileSync(path.join(out, 'mp05-r05-west-toe-lava-plug-01.release-manifest.json'), 'utf8'));
  });
  afterAll(() => fs.rmSync(out, { recursive: true, force: true }));
  it('binds a fully bounded 36-cell lava component with no fluid-bearing halo or source entities', () => {
    expect(manifest.scope.fluidComponent).toMatchObject({ cellCount: 36, bounds: { minX: 1961, maxX: 1962, minY: 76, maxY: 91, minZ: -824, maxZ: -815 } });
    expect(manifest.scope.componentBoundaryContactCount).toBe(0);
    expect(manifest.target.sourceStateCensus).toEqual({ 'minecraft:lava[level=0]': 1, 'minecraft:lava[level=2]': 12, 'minecraft:lava[level=4]': 2, 'minecraft:lava[level=8]': 21 });
    expect(manifest.isolation).toMatchObject({ finiteSixConnectedLavaComponent: true, sourceBlockEntityCount: 0, sourceSavedEntityCount: 0, fluidBearingHaloCount: 0 });
  });
  it('orders a canonical exact inverse from downstream tail to source and supplies the guarded artifacts', () => {
    expect(manifest.operations['flow-ordered-lava-liner']).toMatchObject({ forwardCommandCount: 36, rollbackCommandCount: 36, exactInverse: true });
    expect(manifest.operations['flow-ordered-lava-liner'].flowOrder).toContain('downstream low-Y tail');
    expect(fs.existsSync(path.join(out, 'mp05-r05-west-toe-lava-plug-01.section.svg'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'scripts/qa_mp05_r05_west_toe_lava_plug_01_post_release.mjs'))).toBe(true);
  });
  it('has a valid scoped standing authorization with the complete hard-safety kernel', () => {
    const auth = JSON.parse(fs.readFileSync(path.join(root, 'docs/masterplans/05-combined-zones/mp05-r05-west-toe-lava-plug-governor-standing-execution-authorization.json'), 'utf8'));
    expect(auth.authorizedReleaseNodes).toEqual(['CZ-MP05-R05-WEST-TOE-LAVA-PLUG']);
    expect(auth.authorizationPayloadSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(auth.hardSafetyKernel.map((entry: { id: string; required: boolean }) => entry.id)).toEqual(expect.arrayContaining([
      'exact-release-and-inverse', 'fresh-source-snapshot-and-preflight', 'strict-forward-and-rollback-parser-checks',
      'block-and-live-entity-clearance', 'strict-execution-with-compensating-rollback', 'post-snapshot-and-rollback-poststate-verification',
    ]));
  });
});
