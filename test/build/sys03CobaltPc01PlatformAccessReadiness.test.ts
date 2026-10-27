import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const made: string[] = [];
afterEach(() => made.splice(0).forEach((entry) => fs.rmSync(entry, { recursive: true, force: true })));

describe('SYS03 Cobalt PC-01 platform/access readiness', () => {
  it('keeps all public interfaces and returns unaccepted while preserving service separation', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sys03-cobalt-pc01-'));
    made.push(temp);
    const out = path.join(temp, 'readiness');
    const result = JSON.parse(execFileSync(process.execPath, ['scripts/design_sys03_cobalt_pc01_platform_access_readiness_01.mjs', '--out', out], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));
    const design = JSON.parse(fs.readFileSync(path.join(out, 'sys03-cobalt-pc01-platform-access-readiness-01.json'), 'utf8'));
    expect(result).toMatchObject({ status: 'SOURCE_BOUND_PC01_READINESS_ONLY__PUBLIC_ENDPOINTS_AND_RETURNS_UNACCEPTED', endpointContractCount: 5, publicEndpointUnboundCount: 4, pc01Accepted: false, mutationAuthority: false });
    expect(design.disposition).toMatchObject({ readOnly: true, operationsCompiled: false, releaseAuthorization: false, rconCalled: false, worldMutated: false, publicStationOpen: false, passengerServiceCommissioned: false });
    expect(design.endpointContracts.filter((contract: { class: string }) => contract.class === 'public')).toHaveLength(4);
    expect(design.endpointContracts.find((contract: { id: string }) => contract.id === 'RR-SE-1-SERVICE-3X3')).toMatchObject({ class: 'service', status: 'PROTECTED_SERVICE_ONLY' });
    expect(design.returnContracts).toHaveLength(3);
    expect(design.exclusions.blockEntitiesAndContainers.currentStatus).toBe('NOT_PROVED_FOR_FUTURE_PC01_TARGETS');
    expect(design.exclusions.entities.currentStatus).toBe('NOT_PROVED_FOR_FUTURE_PC01_TARGETS');
    expect(design.targetAndInversePrerequisites.currentState).toBe('NO_TARGET_STATES_OR_OPERATIONS_EMITTED');
    expect(fs.existsSync(path.join(out, 'sys03-cobalt-pc01-platform-access-readiness-map.svg'))).toBe(true);
  });
});
