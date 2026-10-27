import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp11-c01-approach-containment-'));
const review = 'data/world-review/mp11-bkr-c01-approach-gravity-containment-02-g11-post-20260827T231000Z';
const snapshot = 'data/worldsnap-mp11-bkr-c01-finite-gravity-liner-post-20260827T231000Z';
const auth = 'docs/masterplans/11-town-expansion-r1/mp11-bkr-c01-approach-gravity-containment-02-governor-standing-execution-authorization.json';
const config = ['--release-id', 'MP11-BKR-C01-APPROACH-GRAVITY-CONTAINMENT-02', '--release-node', 'MP11-BKR-C01-APPROACH-GRAVITY-CONTAINMENT', '--release-slug', 'mp11-bkr-c01-approach-gravity-containment-02', '--expected-component', 'EXP-G11', '--expected-count', '55', '--expected-halo', '324'];

afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('MP11/BKR C01 second portal-approach gravity containment', () => {
  it('compiles a finite 55-cell no-falling liner and completes its prepare-only guarded kernel', () => {
    const compile = path.join(temp, 'compile');
    const result = JSON.parse(execFileSync(process.execPath, ['scripts/compile_mp11_bkr_c01_finite_gravity_liner_01.mjs', '--snapshot', snapshot, '--design', `${review}/static-design/mp11-bkr-c01-finite-gravity-liner-design-01.json`, '--auth', auth, '--out', compile, ...config], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));
    const manifest = JSON.parse(fs.readFileSync(path.join(compile, 'mp11-bkr-c01-approach-gravity-containment-02.manifest.json'), 'utf8'));
    expect(result.mutationAuthority).toBe(false);
    expect(manifest.id).toBe('MP11-BKR-C01-APPROACH-GRAVITY-CONTAINMENT-02');
    expect(manifest.target.changedCellCount).toBe(55);
    expect(manifest.interactionSet.fullHaloCellCount).toBe(324);
    expect(manifest.interactionSet.sourceFluidCount).toBe(0);
    expect(manifest.interactionSet.sourceBlockEntityCount).toBe(0);
    const prepared = path.join(temp, 'prepared');
    execFileSync(process.execPath, ['scripts/run_mp11_bkr_c01_finite_gravity_liner_release.mjs', '--out-dir', prepared, '--source-snapshot-root', snapshot, '--authorization', auth, ...config], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
    const ledger = JSON.parse(fs.readFileSync(path.join(prepared, 'fresh-kernel-ledger.json'), 'utf8'));
    expect(ledger.status).toBe('PREPARED_STATIC_SOURCE_REQUIRES_EXECUTE_MODE_FOR_IMMEDIATE_CAPTURE_AND_LIVE_ENTITY_CLEARANCE');
    expect(ledger.stages).toHaveLength(9);
    expect(ledger.stages.every((stage: { status: string }) => stage.status === 'PASS')).toBe(true);
  }, 120_000);
});
