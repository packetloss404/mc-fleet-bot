import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp11-c01-public-return-prepare-'));
const out = path.join(temp, 'prepared');
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('MP11 C01 public independent-return guarded prepare package', () => {
  it('compiles exact inverse operations and passes the full offline prepare kernel without mutation authority', () => {
    const result = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_mp11_c01_public_independent_return_02_prepare.mjs',
      '--out-dir', out,
      '--source-snapshot-root', 'data/worldsnap-mp11-bkr-c01-approach-gravity-containment-08-post-20260828T040000Z',
    ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));
    const ledger = JSON.parse(fs.readFileSync(path.join(out, 'prepare-kernel-ledger.json'), 'utf8'));
    const manifest = JSON.parse(fs.readFileSync(path.join(out, 'buildops', 'mp11-c01-public-independent-return-02.manifest.json'), 'utf8'));
    expect(result.mutationAuthority).toBe(false);
    expect(ledger.status).toBe('PREPARED_STATIC_SOURCE_FULL_OFFLINE_KERNEL_PASS_LIVE_EXECUTION_PROHIBITED');
    expect(ledger.stages).toHaveLength(7);
    expect(ledger.stages.every((stage: { status: string }) => stage.status === 'PASS')).toBe(true);
    expect(manifest.status).toBe('OFFLINE_COMPILED_PREPARE_ONLY_REQUIRES_FRESH_EXECUTION_KERNEL');
    expect(manifest.mutationAuthority).toBe(false);
    expect(manifest.source.authorization.executionAuthorized).toBe(false);
    expect(manifest.target.canonicalPostStateCellCount).toBe(768);
    expect(manifest.target.changedCellCount).toBe(278);
    expect(manifest.operations.forward.commandCount).toBe(manifest.operations.rollback.commandCount);
    expect(manifest.route.currentProtectedRouteInteriorHaloIntersectionCount).toBe(0);
  });
});
