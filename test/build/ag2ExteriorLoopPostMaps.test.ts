import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..'); const created: string[] = [];
afterEach(() => created.splice(0).forEach((item) => fs.rmSync(item, { recursive: true, force: true })));
describe('AG-2 exterior-loop as-built post maps', () => {
  it('maps the verified protected promenade/gallery while retaining an explicit empty rail reserve', () => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'ag2-post-maps-')); fs.rmSync(out, { recursive: true, force: true }); created.push(out);
    const result = JSON.parse(execFileSync(process.execPath, ['scripts/map_ag2_exterior_loop_deck_module_01_post_release.mjs', '--out', out, '--generated-at', '2026-08-27T02:15:00.000Z'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }));
    expect(result).toMatchObject({ status: 'PASS_AG2_AS_BUILT_POST_MAPS_READ_ONLY', mutationAuthority: false, targets: 820, halo: 1462, promenade: 'BUILT_POST_VERIFIED', gallery: 'BUILT_POST_VERIFIED', railReserve: 'UNBUILT_EMPTY_POST_VERIFIED' });
    const report = JSON.parse(fs.readFileSync(path.join(out, 'ag2-exterior-loop-post-maps.json'), 'utf8'));
    expect(report).toMatchObject({ asBuilt: { groups: { 'deck-base': 368, 'promenade-surface': 80, 'gallery-lighting': 4 }, protectedPromenade: { width: 5 }, sealedGallery: { clearWidth: 6, lanterns: 4 }, railReserve: { width: 9, status: 'UNBUILT_EMPTY_POST_VERIFIED' }, supportQa: { targetMismatches: [], hazardHits: [], blockEntities: [], entities: [], fiveWideNormalWalk: true, sixWideGalleryClear: true, railReserveStillEmpty: true, exactInverse: true } } });
    expect(fs.readFileSync(path.join(out, 'ag2-exterior-loop-post-plan.svg'), 'utf8')).toContain('UNBUILT / EMPTY'); expect(fs.existsSync(path.join(out, 'ag2-exterior-loop-post-section.svg'))).toBe(true);
  }, 30_000);
});
