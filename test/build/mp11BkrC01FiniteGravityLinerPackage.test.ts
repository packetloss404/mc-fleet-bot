import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp11-bkr-c01-liner-package-'));
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('MP11/BKR C01 finite gravity liner guarded package', () => {
  it('compiles an exact atomic inverse and completes the prepare-only kernel without world execution', () => {
    const compileOut = path.join(temp, 'compile');
    const compiler = JSON.parse(execFileSync(process.execPath, [
      'scripts/compile_mp11_bkr_c01_finite_gravity_liner_01.mjs', '--out', compileOut,
    ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));
    const manifest = JSON.parse(fs.readFileSync(path.join(compileOut, 'mp11-bkr-c01-finite-gravity-liner-01.manifest.json'), 'utf8'));
    expect(compiler.mutationAuthority).toBe(false);
    expect(manifest.status).toBe('OFFLINE_COMPILED_AWAITING_FRESH_GUARDED_KERNEL');
    expect(manifest.target.changedCellCount).toBe(34);
    expect(manifest.interactionSet.fullHaloCellCount).toBe(204);
    expect(manifest.operations.forward.commandCount).toBe(34);
    expect(manifest.operations.rollback.commandCount).toBe(34);
    expect(manifest.operations.rollback.exactInverseOfForward).toBe(true);
    expect(manifest.interactionSet.sourceFluidCount).toBe(0);
    expect(manifest.interactionSet.sourceBlockEntityCount).toBe(0);
    const prepareOut = path.join(temp, 'prepare');
    const prepared = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_mp11_bkr_c01_finite_gravity_liner_release.mjs',
      '--out-dir', prepareOut,
      '--source-snapshot-root', 'data/worldsnap-mp11-bkr-c01-independent-return-01-post-20260827T014500Z',
    ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));
    const ledger = JSON.parse(fs.readFileSync(path.join(prepareOut, 'fresh-kernel-ledger.json'), 'utf8'));
    expect(prepared.mutationAuthority).toBe(false);
    expect(ledger.status).toBe('PREPARED_STATIC_SOURCE_REQUIRES_EXECUTE_MODE_FOR_IMMEDIATE_CAPTURE_AND_LIVE_ENTITY_CLEARANCE');
    expect(ledger.stages).toHaveLength(9);
    expect(ledger.stages.every((stage: { status: string }) => stage.status === 'PASS')).toBe(true);
    expect(fs.existsSync(path.join(prepareOut, 'rebound-buildops', 'mp11-bkr-c01-finite-gravity-liner-01.forward.txt'))).toBe(true);
    expect(fs.existsSync(path.join(prepareOut, 'rebound-buildops', 'mp11-bkr-c01-finite-gravity-liner-01.rollback.txt'))).toBe(true);
  }, 120_000);

  it('uses a distinct coordinate cache key in independent QA of the immutable live post', () => {
    const qaOut = path.join(temp, 'post-qa');
    const result = JSON.parse(execFileSync(process.execPath, [
      'scripts/qa_mp11_bkr_c01_finite_gravity_liner_01_post_release.mjs',
      '--manifest', 'data/world-review/mp11-bkr-c01-finite-gravity-liner-live-20260827T231000Z/rebound-buildops/mp11-bkr-c01-finite-gravity-liner-01.manifest.json',
      '--snapshot', 'data/worldsnap-mp11-bkr-c01-finite-gravity-liner-post-20260827T231000Z',
      '--out', qaOut,
    ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));
    const qa = JSON.parse(fs.readFileSync(path.join(qaOut, 'mp11-bkr-c01-finite-gravity-liner-01-post-qa.json'), 'utf8'));
    expect(result.status).toBe('POST_RELEASE_QA_PASS');
    expect(qa.checks.canonicalTargets.mismatches).toEqual([]);
    expect(qa.checks.retainedHalo.mismatches).toEqual([]);
    expect(qa.checks.blockEntityExclusion.failures).toEqual([]);
  }, 120_000);
});
