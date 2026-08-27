import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..'); const created: string[] = [];
afterEach(() => created.splice(0).forEach((item) => fs.rmSync(item, { recursive: true, force: true })));
describe('AG-1 exterior-loop as-built post maps', () => {
  it('binds the executed ledger/post snapshot and maps only verified support work', () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'ag1-post-maps-')); fs.rmSync(out, { recursive: true, force: true }); created.push(out);
    const result = JSON.parse(execFileSync(process.execPath, ['scripts/map_ag1_citywide_exterior_loop_pier_deck_support_01_post_release.mjs', '--out', out, '--generated-at', '2026-08-27T01:45:00.000Z'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }));
    expect(result).toMatchObject({ status: 'PASS_AG1_AS_BUILT_POST_MAPS_READ_ONLY', mutationAuthority: false, targets: 1165, halo: 1436, pierPads: 3 });
    const maps = JSON.parse(fs.readFileSync(path.join(out, 'ag1-exterior-loop-post-maps.json'), 'utf8'));
    expect(maps).toMatchObject({ source: { ledger: { status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE' }, independentPostQa: { status: 'PASS_AG1_POSTSTATE_SUPPORT_CONTAINMENT_QA' } }, asBuilt: { exactTargetCells: 1165, haloCells: 1436, deckGirder: { yLevels: [82, 83], physicalCellCount: 736, operationTargetCells: 694, overlapWithPierOperationTargets: 42 }, supportQa: { canonicalTargetFailures: [], haloFluidOrGravityHits: [], blockEntities: [], entities: [], allPierColumnsContinuous: true, twoDeepGirderComplete: true, exactInverse: true } } });
    expect(maps.nonClaims.join(' ')).toContain('No rail.'); expect(fs.readFileSync(path.join(out, 'ag1-exterior-loop-post-plan.svg'), 'utf8')).toContain('1,165 exact polished-deepslate targets'); expect(fs.existsSync(path.join(out, 'ag1-exterior-loop-post-section-profile.svg'))).toBe(true);
  }, 30_000);
});
