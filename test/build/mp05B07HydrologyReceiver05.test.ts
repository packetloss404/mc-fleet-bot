import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp05-b07-hydrology-receiver-'));
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('MP05 B07 hydrology / receiver decision 05', () => {
  it('binds owner input 04 and current topology to an explicit no-receiver fail-closed result', () => {
    const out = path.join(temp, 'out');
    execFileSync(process.execPath, [
      'scripts/design_mp05_b07_hydrology_receiver_05.mjs',
      '--out-dir', out,
      '--markdown-out', path.join(out, 'report.md'),
      '--generated-at', '2026-08-28T05:30:00.000Z',
    ], { cwd: ROOT, stdio: 'pipe', maxBuffer: 8 * 1024 * 1024 });
    const report = JSON.parse(fs.readFileSync(path.join(out, 'mp05-b07-hydrology-receiver-decision-05.json'), 'utf8'));
    expect(report).toMatchObject({
      status: 'SOURCE_BOUND_HYDROLOGY_RECEIVER_FAIL_CLOSED_UNBOUNDED_COMPONENT',
      mutationAuthority: false,
      source: { immutableRequiredMemberCount: 130 },
      exactB07Domain: { construction: { cellCount: 8134 }, interaction: { cellCount: 13608 } },
      containmentReceiverCandidate: {
        disposition: 'NO_FINITE_CONTAINMENT_RECEIVER_CANDIDATE',
        selectedCells: { cellCount: 0 }, selectedFaces: { faceCount: 0 },
      },
      observedHydrology: { extendedTrace: { capReached: true, maximumCells: 125000, disposition: 'CELL_CAP_REACHED_TOPOLOGY_INCOMPLETE' } },
      safetyBoundary: { readOnly: true, liveCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0 },
    });
    expect(report.observedHydrology.seed.cellCount).toBe(84);
    expect(report.observedHydrology.extendedTrace.unexpandedCapFrontier.cellCount).toBeGreaterThan(0);
    expect(report.explicitNonClaims.join('\n')).toMatch(/public-access/);
    expect(fs.existsSync(path.join(out, 'mp05-b07-hydrology-receiver-decision-05.svg'))).toBe(true);
  });
});
