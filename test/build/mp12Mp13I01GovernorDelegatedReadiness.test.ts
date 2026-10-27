import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/generate_mp12_mp13_i01_governor_delegated_readiness_01.mjs');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mp12-mp13-i01-governor-'));

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('MP12 / MP13 I01 Governor-delegated readiness', () => {
  it('assigns the finite boundary internally but refuses a release when source egress and public geometry are absent', () => {
    execFileSync(process.execPath, [SCRIPT, '--out-dir', temporaryDirectory, '--generated-at', '2026-08-26T22:00:00.000Z'], { cwd: ROOT, stdio: 'pipe' });
    const evidence = JSON.parse(fs.readFileSync(path.join(temporaryDirectory, 'mp12-mp13-i01-governor-delegated-readiness-01.json'), 'utf8'));
    const signature = JSON.parse(fs.readFileSync(path.join(temporaryDirectory, 'mp12-mp13-i01-governor-delegated-signature-01.json'), 'utf8'));
    expect(evidence).toMatchObject({
      status: 'GOVERNOR_DELEGATED_ROLES_ASSIGNED_PHYSICAL_RELEASE_NOT_READY', mutationAuthority: false,
      exactScope: { routeAndFacadeCellCount: 387, directionalFaceCount: 206, protectedFacadeCellCount: 75 },
      assignedCells: { total: 387, protectedFacadeX0: 75 }, assignedFaces: { total: 206 },
    });
    expect(Object.values(evidence.delegatedRoles).every((role) => String(role).startsWith('Governor-delegated '))).toBe(true);
    expect(signature.cellAssignments.every((cell: { accepted: boolean }) => cell.accepted)).toBe(true);
    expect(signature.directionalFaceAcceptances.every((face: { accepted: boolean }) => face.accepted)).toBe(true);
    expect(evidence.residuals.map((item: { id: string }) => item.id)).toEqual([
      'I01_PUBLIC_ENVELOPE_AND_LIGHT', 'I01_TWO_INDEPENDENT_EXTERIOR_EGRESSES', 'I01_PUBLIC_STAFF_SEPARATION_PROOF', 'I01_FRESH_RELEASE_KERNEL',
    ]);
    expect(evidence.nonClaims.join('\n')).toMatch(/I05\/I06 are not used/);
  }, 45_000);
});
