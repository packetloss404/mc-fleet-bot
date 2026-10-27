import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'mp08-c1-lighting-'));
let manifest: any;

describe('MP08 C1 restricted inspection lighting', () => {
  beforeAll(() => {
    execFileSync(process.execPath, ['scripts/compile_mp08_c1_restricted_inspection_lighting_01.mjs', '--out-dir', OUT], { cwd: ROOT, stdio: 'pipe', timeout: 180_000 });
    manifest = JSON.parse(fs.readFileSync(path.join(OUT, 'mp08-c1-restricted-inspection-lighting-01.release-manifest.json'), 'utf8'));
  }, 190_000);
  afterAll(() => fs.rmSync(OUT, { recursive: true, force: true }));
  it('adds only bounded, static wall fixtures outside the retained corridor clearance', () => {
    expect(manifest.scope.fixtures).toMatchObject({ cellCount: 8, desiredState: 'minecraft:sea_lantern' });
    expect(manifest.scope.retainedThreeWideClearance).toMatchObject({ cellCount: 744, modified: false });
    expect(manifest.isolation).toMatchObject({ fluidOrWaterloggedHaloCount: 0, gravityHaloCount: 0, blockEntityCount: 0, savedEntityCount: 0 });
  });
  it('emits exact guarded inverses but no execution authority', () => {
    expect(manifest.operations['static-wall-lighting']).toMatchObject({ forwardCommandCount: 8, rollbackCommandCount: 8, exactInverse: true });
    expect(manifest.safetyBoundary).toMatchObject({ liveCallsPerformed: false, worldEditsPerformed: false, mutationAuthority: false });
    expect(fs.existsSync(path.join(ROOT, 'scripts/qa_mp08_c1_restricted_inspection_lighting_01_post_release.mjs'))).toBe(true);
  });
});
