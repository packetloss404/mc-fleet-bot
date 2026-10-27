import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp11-bkr-c01-return-compiler-'));
const out = path.join(temp, 'package');
const qa = path.join(temp, 'qa');
const wrapper = path.join(temp, 'wrapper');
const SNAPSHOT = 'data/worldsnap-mp02-b08-surface-recovery-landing-post-20260827T005500Z';
const CONTRACT = 'data/world-review/mp11-bkr-c01-rebind-b08-post-20260827T005500Z/acceptance/mp11-bkr-c01-independent-return-acceptance-contract-01.json';
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('MP11/BKR C01 independent-return offline compiler', () => {
  it('emits a guarded 3-wide, 3-clear-high return with finite permanent gravity containment and exact inverse', () => {
    const compile = JSON.parse(execFileSync(process.execPath, [
      'scripts/compile_mp11_bkr_c01_independent_return_01.mjs', '--snapshot', SNAPSHOT, '--contract', CONTRACT, '--out', out,
    ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));
    const manifest = JSON.parse(fs.readFileSync(path.join(out, 'mp11-bkr-c01-independent-return-01.manifest.json'), 'utf8'));
    expect(compile.mutationAuthority).toBe(false);
    expect(manifest.mutationAuthority).toBe(false);
    expect(manifest.route.stationCount).toBe(105);
    expect(manifest.route.topologyGateReconciliation.packagePurpose).toContain('establishes');
    expect(manifest.source.captureIdEqualityAssertions.allEqual).toBe(true);
    expect(manifest.scopedRunner.wrapper).toBe('scripts/run_mp11_bkr_c01_independent_return_release.mjs');
    expect(manifest.target.canonicalPostStateCellCount).toBe(2828);
    expect(manifest.operations.forward.commandCount).toBe(manifest.operations.rollback.commandCount);
    expect(manifest.operations.forward.containmentFirst).toBe(true);
    expect(manifest.operations.rollback.containmentLast).toBe(true);
    expect(manifest.safety.sourceFluidCountAfterContainment).toBe(0);
    expect(manifest.safety.sourceGravityCountAfterContainment).toBe(0);
    expect(manifest.safety.sourceBlockEntityCount).toBe(0);
    expect(manifest.safety.sourceProtectedCoreCountAfterContainment).toBe(0);
    expect(manifest.safety.gravityContainment).toMatchObject({ permanent: true, temporarySupportUsed: false, componentCount: 1, cellCount: 228 });
    const qaResult = JSON.parse(execFileSync(process.execPath, [
      'scripts/qa_mp11_bkr_c01_independent_return_01_post_release.mjs',
      '--manifest', path.join(out, 'mp11-bkr-c01-independent-return-01.manifest.json'),
      '--snapshot', SNAPSHOT,
      '--project-source', '--out', qa,
    ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));
    expect(qaResult.status).toBe('PROJECTED_QA_PASS_NOT_POST_RELEASE');
    expect(qaResult.mutationAuthority).toBe(false);
    const wrapperResult = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_mp11_bkr_c01_independent_return_release.mjs',
      '--source-snapshot-root', SNAPSHOT,
      '--out-dir', wrapper,
    ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));
    const ledger = JSON.parse(fs.readFileSync(path.join(wrapper, 'fresh-kernel-ledger.json'), 'utf8'));
    expect(wrapperResult.status).toBe('PREPARED_STATIC_SOURCE_REQUIRES_EXECUTE_MODE_FOR_IMMEDIATE_CAPTURE_AND_LIVE_ENTITY_CLEARANCE');
    expect(ledger.mode).toBe('PREPARE_ONLY');
    expect(ledger.stages).toHaveLength(10);
    expect(ledger.stages.every((stage: { status: string }) => stage.status === 'PASS')).toBe(true);
  }, 60_000);
});
