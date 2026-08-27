import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/accept_mp05_b07_integrated_owner_interface_04.mjs');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp05-b07-owner-interface-'));
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('MP05 B07 integrated owner/interface input 04', () => {
  it('binds the latest complete B07 post capture to all six exact boundary counterpart roles without emitting a release', () => {
    const out = path.join(temp, 'out');
    execFileSync(process.execPath, [SCRIPT, '--out-dir', out, '--markdown-out', path.join(out, 'report.md'), '--generated-at', '2026-08-28T05:00:00.000Z'], { cwd: ROOT, stdio: 'pipe' });
    const report = JSON.parse(fs.readFileSync(path.join(out, 'mp05-b07-integrated-owner-interface-04.json'), 'utf8'));
    expect(report).toMatchObject({
      status: 'ACCEPTED_EXACT_OWNER_AND_SIX_BOUNDARY_COUNTERPART_INPUT_ONLY', mutationAuthority: false,
      source: { immutableRequiredMemberCount: 130 },
      safetyBoundary: { forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false },
    });
    expect(report.exactDomain.construction.cellCount).toBe(8134);
    expect(report.exactDomain.interaction.cellCount).toBe(13608);
    expect(report.exactDomain.seams.map((s: { transitionCount: number }) => s.transitionCount)).toEqual([1134, 1134, 287, 287, 952, 952]);
    expect(report.retainedDefaultDeny.join('\n')).toMatch(/No fluid component/);
    expect(fs.existsSync(path.join(out, 'mp05-b07-integrated-owner-interface-map.svg'))).toBe(true);
  });
});
