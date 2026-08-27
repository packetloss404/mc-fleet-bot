import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'sys03-passenger-commissioning-'));
const OUT = path.join(DIR, 'gate');
const DOC = path.join(DIR, 'gate.md');
const CONTRACT = path.join(OUT, 'sys03-passenger-rail-commissioning-acceptance-gate-01.json');

afterAll(() => fs.rmSync(DIR, { recursive: true, force: true }));

describe('SYS03 passenger rail commissioning acceptance gate', () => {
  it('binds the current civil and maintenance source facts but cannot authorize passenger service', () => {
    const stdout = execFileSync(process.execPath, [
      'scripts/generate_sys03_passenger_rail_commissioning_acceptance_gate_01.mjs',
      '--out-dir', OUT, '--doc', DOC, '--generated-at', '2026-08-26T18:00:00.000Z',
    ], { cwd: ROOT, encoding: 'utf8' });
    expect(JSON.parse(stdout)).toMatchObject({
      status: 'SOURCE_BOUND_DEFAULT_DENY__NO_SYS03_PASSENGER_SERVICE_COMMISSIONED',
      mutationAuthority: false, acceptedGateCount: 0, requiredGateCount: 8,
      passengerServiceCommissioned: false, b09ProtectedCells: 19,
    });
    const contract = JSON.parse(fs.readFileSync(CONTRACT, 'utf8'));
    expect(contract).toMatchObject({
      disposition: { readOnly: true, mutationAuthority: false, operationsCompiled: false, releaseAuthorization: false, rconCalled: false, worldMutated: false },
      source: { immutableCopy: true, verifiedRequiredMemberCount: 130, region: { sha256: '3e0d739e5ceda6fb9a828e9b5947e15d00864f7f15f54d1c099e011477e3bcfd', fileCount: 52 } },
      observedCurrentState: {
        high16: { civilOnly: true, passengerServiceCommissioned: false, connectedCivilStations: 46 },
        b09MaintenanceOnly: { protectedCellCount: 19, inactivePoweredRailCount: 15, authenticatedMinecartCount: 1, lowerVoid: { cells: 12, geometry: '6x2x1', platformAccepted: false } },
        passengerSystem: { stationPairsAccepted: 0, passengerPlatformsAccepted: 0, closedTrialsAccepted: 0, bidirectionalOperatingReturnAccepted: false },
      },
      acceptanceRule: { allGateCount: 8, acceptedGateCount: 0, passengerOpeningAllowed: false, sameFreshImmutablePostRequired: true },
    });
    expect(contract.acceptanceGates.map((gate: { id: string; accepted: boolean }) => gate.id)).toEqual([
      'PC-01-ROUTE-AND-STATION-PAIR', 'PC-02-DIRECTIONAL-GUIDEWAY-SEPARATION', 'PC-03-PLATFORM-EDGE-AND-BOARDING', 'PC-04-SIGNAL-POWER-FAILSAFE',
      'PC-05-RESCUE-AND-RECOVERY', 'PC-06-CLOSED-TRIALS-AND-RESET', 'PC-07-OPERATING-AND-RETURN-ACCEPTANCE', 'PC-08-FRESH-GUARDED-RELEASE-KERNEL',
    ]);
    expect(contract.acceptanceGates.every((gate: { accepted: boolean }) => gate.accepted === false)).toBe(true);
    expect(fs.readFileSync(path.join(OUT, 'sys03-passenger-commissioning-gate-map.svg'), 'utf8')).toContain('not an alignment map');
  }, 30_000);

  it('validates the generated gate without allowing a maintenance or civil shortcut', () => {
    const stdout = execFileSync(process.execPath, [
      'scripts/validate_sys03_passenger_rail_commissioning_acceptance_gate_01.mjs', '--contract', CONTRACT,
    ], { cwd: ROOT, encoding: 'utf8' });
    expect(JSON.parse(stdout)).toMatchObject({ status: 'PASS_SOURCE_BOUND_DEFAULT_DENY_PASSENGER_COMMISSIONING_GATE', mutationAuthority: false, acceptedGateCount: 0, requiredGateCount: 8, passengerServiceCommissioned: false });
  }, 30_000);
});
