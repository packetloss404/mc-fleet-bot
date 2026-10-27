import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mp10-library-parapet-'));
const buildops = path.join(temporaryDirectory, 'buildops');
const review = path.join(temporaryDirectory, 'review');

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('MP10 Ravensreach library exterior stair retaining parapet compiler', () => {
  it('emits a supported 119-cell exact inverse that retains all five stair flights', () => {
    const stdout = execFileSync(process.execPath, [
      'scripts/compile_mp10_rrch_library_exterior_stair_parapet_01.mjs',
      '--out-dir', buildops,
      '--review-dir', review,
      '--basename', 'parapet',
    ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const result = JSON.parse(stdout);
    const manifest = JSON.parse(fs.readFileSync(path.join(buildops, 'parapet.release-manifest.json'), 'utf8'));
    const qa = JSON.parse(fs.readFileSync(path.join(review, 'parapet.projected-route-qa.json'), 'utf8'));
    expect(result.status).toBe('STATIC_READY_FROM_FRESH_POST_SOURCE_AWAITING_FRESH_LIVE_KERNEL');
    expect(manifest.target.cells.cellCount).toBe(119);
    expect(manifest.target.cells.bounds).toEqual({ minX: -157, maxX: -157, minY: 47, maxY: 82, minZ: -446, maxZ: -440 });
    expect(manifest.design.directSupports.cellCount).toBe(32);
    expect(manifest.target.haloFluidGravityCount).toBe(0);
    expect(manifest.target.storedBlockEntityInteractionCount).toBe(0);
    expect(manifest.target.savedEntityInteractionCount).toBe(0);
    expect(manifest.operations.forward.commandCount).toBe(119);
    expect(manifest.operations.rollback.commandCount).toBe(119);
    expect(qa.routeSummary).toEqual({ pairs: 5, directions: 10, passed: 10, failed: 0 });
  });
});
