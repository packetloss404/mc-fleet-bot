import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const CONTRACT = path.join(ROOT, 'data/world-review/mp05-b09-operating-system-acceptance-contract-01-current-mp01-anvil-post-20260826T163300Z/mp05-b09-operating-system-acceptance-contract-01.json');

describe('MP05 B09 operating-system acceptance contract', () => {
  it('binds current exact maintenance state and cannot authorize a release', () => {
    const stdout = execFileSync(process.execPath, ['scripts/validate_mp05_b09_operating_system_acceptance_contract_01.mjs'], { cwd: ROOT, encoding: 'utf8' });
    expect(JSON.parse(stdout)).toMatchObject({ status: 'PASS_SOURCE_BOUND_DEFAULT_DENY_OPERATING_SYSTEM_CONTRACT', mutationAuthority: false, requiredGateCount: 9, acceptedGateCount: 0, r12rProtectedCells: 19, acceptedRescueDischarges: 0 });
    const contract = JSON.parse(fs.readFileSync(CONTRACT, 'utf8'));
    expect(contract.exactCurrentState).toMatchObject({ lowerVoid: { cellCount: 12, currentGeometry: { width: 6, height: 2, depth: 1 } }, sealedWestCap: { cellCount: 12 }, r12rMaintenanceProtection: { cellCount: 19, poweredRailCells: 15, terminalStopCells: 2, offControlCells: 2 }, endpoints: { b08DefaultDenyCells: 36, z11DefaultDenyCells: 12, independentProtectedDischargesAccepted: 0, requiredIndependentProtectedDischarges: 2 } });
    expect(contract.requiredGates.every((gate: { currentAcceptedCells: number }) => gate.currentAcceptedCells === 0)).toBe(true);
  });
});
