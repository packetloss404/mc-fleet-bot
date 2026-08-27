import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..'); const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp05-b07-descent-lighting-'));
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));
describe('MP05 B07 surface receiver descent fixed lighting', () => {
  it('prepares an exact five-cell dry sealed-wall package without executing it', () => {
    const compile = path.join(temp, 'compile'); const result = JSON.parse(execFileSync(process.execPath, ['scripts/compile_mp05_b07_surface_receiver_descent_fixed_lighting_01.mjs', '--out', compile], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 })); const manifest = JSON.parse(fs.readFileSync(path.join(compile, 'mp05-b07-surface-receiver-descent-fixed-lighting-01.manifest.json'), 'utf8'));
    expect(result.mutationAuthority).toBe(false); expect(manifest.target.changedCellCount).toBe(5); expect(manifest.interactionSet).toMatchObject({ haloCellCount: 123, sourceFluidCount: 0, sourceBlockEntityCount: 0, sourceSavedEntityCount: 0 }); expect(manifest.operations.rollback.exactInverseOfForward).toBe(true); expect(fs.existsSync(path.join(compile, 'surface-receiver-descent-fixed-lighting-profile.svg'))).toBe(true);
    const prepared = path.join(temp, 'prepare'); const plan = JSON.parse(execFileSync(process.execPath, ['scripts/run_mp05_b07_central_bypass_fixed_lighting_release.mjs', '--release-id', 'MP05-B07-SURFACE-RECEIVER-DESCENT-FIXED-LIGHTING-01', '--transaction-id', 'mp05-b07-surface-receiver-descent-fixed-lighting-01', '--release-node', 'CZ-MP05-B07-SURFACE-RECEIVER-DESCENT-FIXED-LIGHTING', '--authorization', 'docs/masterplans/05-combined-zones/mp05-b07-surface-receiver-descent-fixed-lighting-governor-standing-execution-authorization.json', '--compiler', 'scripts/compile_mp05_b07_surface_receiver_descent_fixed_lighting_01.mjs', '--post-qa', 'scripts/qa_mp05_b07_surface_receiver_descent_fixed_lighting_01_post_release.mjs', '--source-snapshot-root', 'data/worldsnap-mp05-b07-wet-riser-fixed-lighting-01-post-20260828T013000Z', '--out-dir', prepared], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));
    const ledger = JSON.parse(fs.readFileSync(path.join(prepared, 'fresh-kernel-ledger.json'), 'utf8')); expect(plan.mutationAuthority).toBe(false); expect(ledger.status).toBe('PREPARED_STATIC_SOURCE_REQUIRES_EXECUTE_MODE_FOR_IMMEDIATE_CAPTURE_AND_LIVE_ENTITY_CLEARANCE'); expect(ledger.stages.every((stage: { status: string }) => stage.status === 'PASS')).toBe(true);
  }, 120_000);
});
