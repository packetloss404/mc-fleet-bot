import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..'); const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ag2-fresh-qa-'));
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('AG-2 exterior loop independent fresh-source QA 01', () => {
  it('verifies the exact prepared civil scope and surrounding halo without granting execution authority', () => {
    const out = path.join(temp, 'qa.json');
    execFileSync(process.execPath, ['scripts/qa_ag2_exterior_loop_fresh_source_01.mjs', '--out', out, '--generated-at', '2026-08-28T09:45:00.000Z'], { cwd: ROOT, stdio: 'pipe', maxBuffer: 8 * 1024 * 1024 });
    const qa = JSON.parse(fs.readFileSync(out, 'utf8'));
    expect(qa).toMatchObject({
      id: 'AG2-EXTERIOR-LOOP-FRESH-SOURCE-INDEPENDENT-QA-01', status: 'PASS_STATIC_FRESH_SOURCE_LIVE_ENTITY_CLEARANCE_STILL_REQUIRED', mutationAuthority: false,
      scope: { target: { cellCount: 820, coordinateSetSha256: '1f781cb9fbdd2c988587b594eee57d4eb65f92209fe29bf1ae604143c268644a' }, surroundingHalo: { cellCount: 1462, coordinateSetSha256: '343f7499466639ebfa210670ed64fdbcd3c91bfba7643f47a472ea9eb1f5fd3b' } },
      checks: { exactTargetAndHaloManifestMatch: true, sourceGuards: { passed: true, hits: [] }, hydrologyAndWaterlogged: { passed: true, hits: [] }, gravity: { passed: true, hits: [] }, blockEntitiesAndContainers: { passed: true, hits: [] }, savedEntities: { passed: true, hits: [] }, protectedInterfaces: { passed: true, hits: [] }, liveEntities: { passed: false } },
      safetyBoundary: { readOnly: true, liveCallsPerformed: false, rconCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false },
    });
    expect(qa.checks.liveEntities.disposition).toMatch(/NOT_PERFORMED/);
  });
});
