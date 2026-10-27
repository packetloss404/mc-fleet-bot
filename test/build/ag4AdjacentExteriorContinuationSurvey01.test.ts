import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..'); const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ag4-survey-'));
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('AG-4 adjacent exterior continuation survey 01', () => {
  it('holds the unsafe contiguous module and identifies only the nearest surveyed disjoint module', () => {
    const out = path.join(temp, 'survey.json'); const map = path.join(temp, 'survey.svg');
    execFileSync(process.execPath, ['scripts/survey_ag4_adjacent_exterior_continuation_01.mjs', '--out', out, '--map', map, '--generated-at', '2026-08-28T10:20:00.000Z'], { cwd: ROOT, stdio: 'pipe', maxBuffer: 16 * 1024 * 1024 });
    const survey = JSON.parse(fs.readFileSync(out, 'utf8'));
    expect(survey).toMatchObject({
      id: 'AG4-ADJACENT-EXTERIOR-CONTINUATION-SURVEY-01', status: 'AG4_ADJACENT_HELD_NEAREST_DISJOINT_SEQUENCE_IDENTIFIED_NO_OPERATIONS', mutationAuthority: false,
      candidate: { id: 'AG4-EE-01', footprint: { minX: 336, maxX: 351, minZ: -806, maxZ: -784 }, deckAir: { cellCount: 2944, hits: [] }, surroundingHalo: { hydrologyOrGravityHits: [] }, bearings: { cellCount: 27 }, protectedInterfaceHits: [], blockEntities: [], savedEntities: [{ id: 'minecraft:item' }] },
      designInput: { nearestCandidate: 'AG4-EE-DISJOINT-352' }, safetyBoundary: { readOnly: true, liveCallsPerformed: false, rconCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false },
    });
    expect(survey.candidate.bearings.failures).toHaveLength(16);
    expect(survey.nearestViableDisjointSequence).toMatchObject({ id: 'AG4-EE-DISJOINT-352', footprint: { minX: 352, maxX: 367 }, ready: true, deckAir: { hits: [] }, surroundingHalo: { hydrologyOrGravityHits: [] }, protectedInterfaceHits: [], blockEntities: [], savedEntities: [] });
    expect(fs.existsSync(map)).toBe(true);
  });
});
