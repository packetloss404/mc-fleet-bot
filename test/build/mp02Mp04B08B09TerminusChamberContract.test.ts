import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const CONTRACT = path.join(ROOT, 'data/world-review/mp05-if-b08-b09-terminus-mp02-chamber-contract-01-current-mp01-anvil-post-20260826T163300Z/mp05-if-b08-b09-terminus-mp02-chamber-contract-01.json');

describe('MP05 IF B08/B09 terminus and MP02 chamber contract', () => {
  it('remains current-source bound, bilateral, and non-authorizing', () => {
    const stdout = execFileSync(process.execPath, ['scripts/validate_mp02_mp04_b08_b09_terminus_chamber_contract_01.mjs'], { cwd: ROOT, encoding: 'utf8' });
    expect(JSON.parse(stdout)).toMatchObject({ status: 'PASS_SOURCE_BOUND_DEFAULT_DENY_CONTRACT', mutationAuthority: false, b03ApertureCells: 20, b09CapCells: 12, acceptedRescueDischarges: 0 });
    const contract = JSON.parse(fs.readFileSync(CONTRACT, 'utf8'));
    expect(contract.counterpartAcceptance.joint).toMatchObject({ required: true, acceptanceRecord: null, wildcardOwnershipAllowed: false, partialOrOneWayOpeningAllowed: false });
    expect(contract.mandatoryFunctionalAcceptance.returnAndRescue).toMatchObject({ independentProtectedDischargesRequired: 2, acceptedIndependentProtectedDischarges: 0, acceptedNormalWalkReturn: false, acceptedFailureRoute: false });
    expect(contract.currentInterfaceFacts.rawB08Continuation).toMatchObject({ floorCells: 584, sourceAir: 584, supported: 584, twoClear: 584, functionalDisposition: 'RAW_LINEAR_TUNNEL_ONLY__ONE_PROVEN_RETURN' });
  });
});
