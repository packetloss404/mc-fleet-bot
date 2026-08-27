import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mp10-library-annex-'));
const buildops = path.join(temporaryDirectory, 'buildops');
const review = path.join(temporaryDirectory, 'review');

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('MP10 Ravensreach library exterior stair annex compiler', () => {
  it('emits an exact 126-cell reversible three-wide route with headroom apertures and projected bidirectional QA', () => {
    const stdout = execFileSync(process.execPath, [
      'scripts/compile_mp10_rrch_library_exterior_stair_annex_01.mjs',
      '--out-dir', buildops,
      '--review-dir', review,
      '--basename', 'annex',
    ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const result = JSON.parse(stdout);
    const manifest = JSON.parse(fs.readFileSync(path.join(buildops, 'annex.release-manifest.json'), 'utf8'));
    const qa = JSON.parse(fs.readFileSync(path.join(review, 'annex.projected-route-qa.json'), 'utf8'));
    expect(result.status).toBe('STATIC_READY_FROM_COMPLETE_SOURCE_AWAITING_FRESH_LIVE_KERNEL');
    expect(manifest.target.cells.cellCount).toBe(126);
    expect(manifest.target.haloFluidGravityCount).toBe(0);
    expect(manifest.target.storedBlockEntityInteractionCount).toBe(0);
    expect(manifest.target.savedEntityInteractionCount).toBe(0);
    expect(manifest.operations.forward.commandCount).toBe(126);
    expect(manifest.operations.rollback.commandCount).toBe(126);
    expect(qa.status).toBe('PASS');
    expect(qa.routeSummary).toEqual({ pairs: 6, directions: 12, passed: 12, failed: 0 });
  });
});
