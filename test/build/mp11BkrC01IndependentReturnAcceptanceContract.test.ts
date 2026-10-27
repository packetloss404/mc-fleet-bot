import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp11-bkr-c01-acceptance-'));
const out = path.join(temp, 'contract');
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('MP11/BKR C01 independent-return acceptance contract', () => {
  it('binds both interfaces and directed inverse route while denying a physical release without target states', () => {
    const result = JSON.parse(execFileSync(process.execPath, [
      'scripts/design_mp11_bkr_c01_independent_return_acceptance_contract_01.mjs', '--out', out,
    ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));
    const contract = JSON.parse(fs.readFileSync(path.join(out, 'mp11-bkr-c01-independent-return-acceptance-contract-01.json'), 'utf8'));
    expect(result.mutationAuthority).toBe(false);
    expect(contract.status).toBe('DESIGN_CONTRACT_COMPLETE_PHYSICAL_POSTSTATE_MAPPING_REQUIRED');
    expect(contract.finiteRoute.stationCount).toBe(105);
    expect(contract.finiteRoute.envelopeCellCount).toBe(1434);
    expect(contract.interfaces.portal.endpoint.point).toEqual([697, 68, -52]);
    expect(contract.interfaces.l1.endpoint.point).toEqual([798, 43, -55]);
    expect(contract.directedReturnContracts).toHaveLength(2);
    expect(contract.directedReturnContracts[1].exactInverseOf).toBe(contract.directedReturnContracts[0].id);
    expect(contract.selfContained).toBe(false);
    expect(contract.postStateAcceptance.requiredCompilerInputsBeforePhysicalOperations).toHaveLength(3);
    expect(fs.existsSync(path.join(out, 'mp11-bkr-c01-independent-return-acceptance-map.svg'))).toBe(true);
  });
});
