import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SURVEY = path.join(ROOT, 'scripts/survey_mp01_direct_lamp_owner_access_recovery_gap_01.mjs');
const SNAPSHOT = 'data/worldsnap-mp11-bkr-c01-approach-gravity-containment-08-post-20260828T040000Z';
const CANDIDATE = 'data/world-review/mp01-functional-front-audit-20260828T040000Z/direct-lamp-calibration-candidate.json';
const TOPOLOGY = 'data/world-review/mp01-direct-lamp-access-return-topology-20260828T040000Z/mp01-direct-lamp-access-return-topology-01.json';
const BOUNDARY = 'data/world-review/mp01-direct-lamp-east-sequential-boundary-design-20260828T040000Z/mp01-direct-lamp-east-sequential-boundary-design-01.json';
const READINESS = 'data/world-review/mp01-isolated-direct-lamp-readiness-contract-20260828T050000Z/mp01-isolated-direct-lamp-readiness-interaction-contract-01.json';
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mp01-direct-lamp-owner-gap-'));

afterAll(() => fs.rmSync(directory, { recursive: true, force: true }));

describe('MP01 direct-lamp owner-bound access/recovery gap', () => {
  it('records the three closed exits and rejects a route absent an exact catalog/owner chain', () => {
    const out = path.join(directory, 'gap.json');
    execFileSync(process.execPath, [SURVEY,
      '--snapshot', SNAPSHOT, '--candidate', CANDIDATE, '--topology', TOPOLOGY, '--boundary', BOUNDARY, '--readiness', READINESS,
      '--markers', 'data/markers.json', '--routes', 'data/routes.json', '--out', out, '--markdown', path.join(directory, 'gap.md'), '--map', path.join(directory, 'gap.svg'),
      '--generated-at', '2026-08-28T07:00:00.000Z'], { cwd: ROOT, stdio: 'pipe' });
    const report = JSON.parse(fs.readFileSync(out, 'utf8'));
    expect(report).toMatchObject({
      id: 'MP01-DIRECT-LAMP-OWNER-BOUND-ACCESS-RECOVERY-GAP-01',
      status: 'REJECTED_NO_CURRENT_OWNER_BOUND_OUTBOUND_OR_RECOVERY_ROUTE',
      mutationAuthority: false,
      exactLocalFinding: { acceptedRouteStations: 0, closedExits: expect.any(Array) },
      catalogFinding: { exactStagingMarkerCount: 0, localComponentMarkerCount: 0, routesWithComponentWaypointCount: 0, routesWithComponentEndpointCount: 0 },
      safetyBoundary: { liveCallsPerformed: false, botMovementPerformed: false, interactionsPerformed: false, catalogMutationPerformed: false, worldEditsPerformed: false, operationFilesEmitted: false },
    });
    expect(report.exactLocalFinding.closedExits).toHaveLength(3);
    expect(report.exactLocalFinding.closedExits.map((exit: { id: string }) => exit.id)).toEqual(['NORTH_ROOM_CLOSURE', 'EAST_WEST_LEAF', 'EAST_EAST_LEAF']);
    expect(report.protectedConstraints.eastBoundary.boundaryIsNotAccessAcceptance).toBe(true);
    expect(report.candidateContractRequired.status).toBe('NO_ROUTE_CANDIDATE_CAN_BE_SELECTED_FROM_CURRENT_EVIDENCE');
  }, 30_000);
});
