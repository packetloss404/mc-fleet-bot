import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp05-b07-bilateral-boundary-'));
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('MP05 B07 bilateral hydrology boundary authority 07', () => {
  it('source-binds two exterior counterpart faces and freezes the 25 interaction faces without authorizing a state change', () => {
    const out = path.join(temp, 'out');
    execFileSync(process.execPath, [
      'scripts/accept_mp05_b07_bilateral_hydrology_boundary_authority_07.mjs',
      '--out-dir', out,
      '--markdown-out', path.join(out, 'report.md'),
      '--generated-at', '2026-08-28T06:00:00.000Z',
    ], { cwd: ROOT, stdio: 'pipe', maxBuffer: 8 * 1024 * 1024 });
    const report = JSON.parse(fs.readFileSync(path.join(out, 'mp05-b07-bilateral-hydrology-boundary-authority-07.json'), 'utf8'));
    expect(report).toMatchObject({
      status: 'ACCEPTED_EXACT_BILATERAL_ROLE_AND_ROUTE_PRESERVATION_INPUT_ONLY', mutationAuthority: false,
      bilateralExteriorBoundary: { faceCount: 2, sourceSideOwner: 'MP05 Hydrology Containment Team', counterpartOwner: 'Combined Zones Boundary Stewardship Team' },
      interactionEnvelopePreservation: { faceCount: 25, airCellCount: 22, preservationOwner: 'B07 Protected-Cap Custodians' },
      safetyBoundary: { readOnly: true, liveCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0 },
    });
    expect(report.bilateralExteriorBoundary.faces.every((face: { direction: string }) => face.direction === 'POSITIVE_X')).toBe(true);
    expect(report.retainedDefaultDeny.join('\n')).toMatch(/No source state is converted/);
    expect(fs.existsSync(path.join(out, 'mp05-b07-bilateral-hydrology-boundary-authority-07.svg'))).toBe(true);
  });
});
