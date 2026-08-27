import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..'); const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp11-c01-public-return-request-')); const out = path.join(temp, 'request');
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('MP11 C01 public independent-return live-release request', () => {
  it('is source-bound, explicitly unaccepted, and enumerates all live guards', () => {
    const result = JSON.parse(execFileSync(process.execPath, ['scripts/publish_mp11_c01_public_independent_return_02_live_release_request.mjs', '--out', out], { cwd: ROOT, encoding: 'utf8' }));
    const request = JSON.parse(fs.readFileSync(path.join(out, 'mp11-c01-public-independent-return-02-live-release-acceptance-request.json'), 'utf8'));
    expect(result.mutationAuthority).toBe(false);
    expect(request.status).toBe('REQUESTED_UNACCEPTED_NO_EXECUTION_AUTHORITY');
    expect(Object.values(request.requiredAcceptanceRoles).every((role: { acceptance: string }) => role.acceptance === 'UNACCEPTED')).toBe(true);
    expect(request.preparedPackage.forward.commandCount).toBe(278);
    expect(request.preparedPackage.rollback.commandCount).toBe(278);
    expect(request.mandatoryLiveReleaseConditions.entityAndExecution.length).toBeGreaterThan(2);
    expect(request.mandatoryLiveReleaseConditions.postStateAndRollback.length).toBeGreaterThan(2);
    expect(request.mandatoryLiveReleaseConditions.functionalAcceptance.length).toBeGreaterThan(2);
  });
});
