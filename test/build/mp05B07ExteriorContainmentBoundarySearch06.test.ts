import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp05-b07-boundary-search-'));
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('MP05 B07 exterior containment-boundary search 06', () => {
  it('rejects every local fluid-to-air boundary without emitting a route or containment operation', () => {
    const out = path.join(temp, 'out');
    execFileSync(process.execPath, [
      'scripts/search_mp05_b07_exterior_containment_boundary_06.mjs',
      '--out-dir', out,
      '--markdown-out', path.join(out, 'report.md'),
      '--generated-at', '2026-08-28T05:45:00.000Z',
    ], { cwd: ROOT, stdio: 'pipe', maxBuffer: 8 * 1024 * 1024 });
    const report = JSON.parse(fs.readFileSync(path.join(out, 'mp05-b07-exterior-containment-boundary-search-06.json'), 'utf8'));
    expect(report).toMatchObject({
      status: 'SOURCE_BOUND_NO_PREPARE_READY_EXTERIOR_CONTAINMENT_BOUNDARY',
      mutationAuthority: false,
      exactDomain: { construction: { cellCount: 8134 }, interaction: { cellCount: 13608 } },
      localBoundaryInventory: { fluidSeeds: { cellCount: 84 }, fluidToAirFaceCount: 27, constructionTargetFaceCount: 0, interactionTargetFaceCount: 25, exteriorTargetFaceCount: 2 },
      prepareReadyCandidate: null,
      safetyBoundary: { readOnly: true, liveCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0 },
    });
    expect(report.preciseReasonNoCandidate.join('\n')).toMatch(/Zero fluid-to-air targets/);
    expect(fs.existsSync(path.join(out, 'b07-exterior-containment-boundary-y17.svg'))).toBe(true);
  });
});
