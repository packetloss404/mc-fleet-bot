import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp11-bkr-c01-contract-'));
const out = path.join(temp, 'contract');
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('MP11/BKR C01 finite-gravity no-second-return contract', () => {
  it('records finite topology without relaxing the independent-return gate', () => {
    const result = JSON.parse(execFileSync(process.execPath, [
      'scripts/publish_mp11_bkr_c01_no_second_return_contract_01.mjs', '--out', out,
    ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));
    const contract = JSON.parse(fs.readFileSync(path.join(out, 'mp11-bkr-c01-no-second-return-contract-01.json'), 'utf8'));
    expect(result.mutationAuthority).toBe(false);
    expect(contract.status).toBe('INDEPENDENT_RETURN_REQUIRED_GRAVITY_TOPOLOGY_FINITE');
    expect(contract.gravityDisposition.unboundedComponentCount).toBe(0);
    expect(contract.gravityDisposition.finiteComponentCount).toBe(12);
    expect(contract.noSecondReturnAssertion.status).toBe('NO_SECOND_INDEPENDENT_PORTAL_RETURN_IN_SOURCE_BOUND_STUDY');
    expect(contract.hardGate.result).toMatch(/NO_PHYSICAL_PORTAL/);
    expect(fs.existsSync(path.join(out, 'mp11-bkr-c01-no-second-return-coordinate-map.svg'))).toBe(true);
  });
});
