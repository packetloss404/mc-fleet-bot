import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SNAPSHOT = 'data/worldsnap-mp01-service-staging-anvil-repair-live-post-20260826T163300Z';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp08-c1-contract-'));
let contract: any;
let acceptancePath: string;

beforeAll(() => {
  execFileSync(process.execPath, [
    'scripts/compile_mp08_c1_bilateral_containment_contract_02.mjs', '--snapshot', SNAPSHOT,
    '--out', temp, '--generated-at', '2026-08-26T16:35:00.000Z',
  ], { cwd: ROOT, stdio: 'pipe' });
  contract = JSON.parse(fs.readFileSync(path.join(temp, 'mp08-c1-bilateral-containment-contract-02.json'), 'utf8'));
  const acceptance = JSON.parse(JSON.stringify(contract.acceptanceTemplate));
  acceptance.contractIdentitySha256 = contract.identitySha256;
  acceptance.owners = { c1: 'RR-C1-CORRIDOR-OWNER', cavernA: 'RR-CAVERN-A-OWNER', cavernB: 'RR-CAVERN-B-OWNER' };
  acceptance.interfaces.forEach((entry: any, index: number) => {
    entry.bidirectionalNormalWalkAccepted = true;
    entry.outerReturnAnchor = index === 0 ? 'CAVERN_A_RETURN_ANCHOR x=0,y=-11,z=9' : 'CAVERN_B_RETURN_ANCHOR x=0,y=-9,z=76';
  });
  acceptancePath = path.join(temp, 'acceptance.json');
  fs.writeFileSync(acceptancePath, `${JSON.stringify(acceptance, null, 2)}\n`);
}, 30_000);
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('MP08 C1 bilateral containment/interface contract 02', () => {
  it('is source-bound and explicitly cannot authorize a mutation', () => {
    expect(contract.status).toBe('STATIC_SOURCE_BOUND_NONAUTHORIZING_OWNER_INTERFACE_CONTRACT');
    expect(contract.mutationAuthority).toBe(false);
    expect(contract.safetyBoundary).toEqual(expect.objectContaining({ liveCallsPerformed: false, worldEditsPerformed: false, operationFilesEmitted: false, releaseManifestEmitted: false }));
    expect(contract.source.requiredMemberCount).toBe(130);
  });

  it('reserves a continuous roof, sidewalls, sealed liner, and retained three-wide core', () => {
    expect(contract.core.retainedWalkRoute.cellCount).toBe(504);
    expect(contract.core.enclosure.cellCount).toBe(616);
    expect(contract.core.underfloorIsolationLiner.cellCount).toBe(168);
    expect(contract.core.enclosure.requiredDesiredState).toBe('minecraft:polished_deepslate');
    expect(contract.core.underfloorIsolationLiner.policy).toBe('SEALED_NO_DISCHARGE_NO_FLUID_NO_OUTFALL');
    expect(contract.sourceScreen).toMatchObject({ retainedRouteHazardCount: 0, retainedClearFailureCount: 0, sourceEnvelopeBlockEntityCount: 0 });
  });

  it('defines distinct exact Cavern A/B door and receiver obligations', () => {
    expect(contract.interfaces).toHaveLength(2);
    expect(contract.interfaces.map((entry: any) => entry.reciprocalCavernOwner.doorCells.cellCount)).toEqual([6, 6]);
    expect(contract.interfaces.map((entry: any) => entry.reciprocalCavernOwner.exteriorReceiver.cellCount)).toEqual([6, 6]);
    expect(contract.interfaces[0].reciprocalCavernOwner.requiredDoorLeaves[0].desiredState).toContain('facing=north');
    expect(contract.interfaces[1].reciprocalCavernOwner.requiredDoorLeaves[0].desiredState).toContain('facing=south');
  });

  it('rejects an unaccepted template and only accepts all three exact owner commitments', () => {
    expect(() => execFileSync(process.execPath, [
      'scripts/compile_mp08_c1_bilateral_containment_contract_02.mjs', '--snapshot', SNAPSHOT, '--out', path.join(temp, 'reject'), '--generated-at', '2026-08-26T16:35:00.000Z', '--validate-acceptance', path.join(temp, 'mp08-c1-bilateral-containment-contract-02.json'),
    ], { cwd: ROOT, stdio: 'pipe' })).toThrow();
    execFileSync(process.execPath, [
      'scripts/compile_mp08_c1_bilateral_containment_contract_02.mjs', '--snapshot', SNAPSHOT, '--out', path.join(temp, 'accept'), '--generated-at', '2026-08-26T16:35:00.000Z', '--validate-acceptance', acceptancePath,
    ], { cwd: ROOT, stdio: 'pipe' });
    const result = JSON.parse(fs.readFileSync(path.join(temp, 'accept', 'mp08-c1-bilateral-containment-acceptance-validation.json'), 'utf8'));
    expect(result).toEqual({ status: 'ACCEPTED_STATIC_CONTRACT_AWAITING_FRESH_RELEASE_KERNEL', errors: [] });
  });
});
