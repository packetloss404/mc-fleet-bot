import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..'); const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ag1-fresh-qa-'));
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('AG-1 exterior loop independent fresh-source QA 01', () => {
  it('rebinds the exact prepared target and halo to the AG-1 immutable source without creating execution authority', () => {
    const out = path.join(temp, 'qa.json');
    execFileSync(process.execPath, ['scripts/qa_ag1_exterior_loop_fresh_source_01.mjs', '--out', out, '--generated-at', '2026-08-28T09:00:00.000Z'], { cwd: ROOT, stdio: 'pipe', maxBuffer: 8 * 1024 * 1024 });
    const qa = JSON.parse(fs.readFileSync(out, 'utf8'));
    expect(qa).toMatchObject({
      id: 'AG1-EXTERIOR-LOOP-FRESH-SOURCE-INDEPENDENT-QA-01', status: 'PASS_STATIC_FRESH_SOURCE_LIVE_ENTITY_CLEARANCE_STILL_REQUIRED', mutationAuthority: false,
      source: { immutableCopy: true, differsFromPreparedSource: true },
      scope: { targets: { cellCount: 1165, coordinateSetSha256: '40ceecf1e281d3c804c9c7aa7eb9367c12cee544d62e3ec66a1f9eed865734c0' }, halo: { cellCount: 1436, coordinateSetSha256: 'a1b7427fe8cb77b8e52a346813d899c565324b9f0832cf5db2d9134cdb41ceef' } },
      checks: {
        exactTargetAndHaloManifestMatch: true, sourceStatesMatchPreparedForwardGuards: { passed: true, mismatches: [] }, finiteFluidAndWaterlogged: { passed: true, hits: [] }, finiteGravity: { passed: true, hits: [] }, containersAndBlockEntities: { passed: true, hits: [] }, savedEntities: { passed: true, hits: [] }, exteriorProtectedInterfaces: { passed: true, hits: [] }, liveEntities: { passed: false },
      },
      safetyBoundary: { readOnly: true, liveCallsPerformed: false, rconCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false },
    });
    expect(qa.checks.liveEntities.disposition).toMatch(/NOT_PERFORMED/);
  });
});
