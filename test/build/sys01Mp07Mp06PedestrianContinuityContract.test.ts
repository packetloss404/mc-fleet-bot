import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/generate_sys01_mp07_mp06_pedestrian_continuity_contract_02.mjs');
const SNAPSHOT = 'data/worldsnap-mp01-service-staging-anvil-repair-live-post-20260826T163300Z';
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'sys01-pedestrian-contract-'));

function run() {
  execFileSync('node', [SCRIPT, '--snapshot', SNAPSHOT, '--out', temporaryDirectory, '--generated-at', '2026-08-26T16:33:00.000Z'], { cwd: ROOT, stdio: 'pipe' });
  return JSON.parse(fs.readFileSync(path.join(temporaryDirectory, 'sys01-mp07-mp06-pedestrian-continuity-contract-02.json'), 'utf8'));
}

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('SYS-01 MP07–MP06 pedestrian continuity contract 02', () => {
  it('rechecks both finite attachments against the latest complete immutable source without creating a route', () => {
    const contract = run();
    expect(contract).toMatchObject({
      id: 'SYS01-MP07-MP06-PEDESTRIAN-CONTINUITY-CONTRACT-02',
      status: 'CURRENT_SOURCE_DEFAULT_DENY_NONAUTHORIZING',
      mutationAuthority: false,
      source: { snapshot: SNAPSHOT, immutableCopy: true, requiredMemberCount: 130 },
      measuredSeparation: { manhattanCells: 302, delta: { x: 141, y: 0, z: 161 } },
      outputs: { operationFiles: 0, rollbackFiles: 0, liveReads: 0, rconCalls: 0, worldEdits: 0 },
    });
    expect(contract.recheckedAttachments).toHaveLength(2);
    for (const attachment of contract.recheckedAttachments) {
      expect(attachment.observedCells.map((cell: { role: string }) => cell.role)).toEqual(['support', 'feet', 'head']);
      expect(attachment.observedStateSha256).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it('keeps all corridor, ownership, return, and release decisions default-denied until a finite survey exists', () => {
    const contract = run();
    expect(contract.defaultDeny).toEqual(expect.objectContaining({
      firstNewStation: 'DENIED', corridorCells: 'DENIED', ownerTransfer: 'DENIED', recoveryAnchor: 'DENIED', operations: 'DENIED', worldMutation: 'DENIED',
    }));
    expect(contract.finiteFutureSurveyAcceptance.normalWalk).toMatchObject({
      minimumClearWidth: 3,
      minimumClearHeadroom: 2,
      maximumAdjacentFloorRise: 1,
    });
    expect(contract.finiteFutureSurveyAcceptance.ownershipAndInterfaces.requiredRoles).toEqual([
      'MP07_ATTACHMENT_OWNER', 'PUBLIC_CORRIDOR_OWNER', 'MP06_ATTACHMENT_OWNER', 'RETURN_AND_RECOVERY_OWNER',
    ]);
  });
});
