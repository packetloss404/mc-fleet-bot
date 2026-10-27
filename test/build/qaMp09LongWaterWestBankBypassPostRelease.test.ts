import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/qa_mp09_long_water_west_bank_bypass_01_post_release.mjs');
const LEDGER = 'data/world-review/mp09-long-water-west-bank-live-20260826T183700Z/fresh-kernel-ledger.json';
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'mp09-long-water-post-qa-'));

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('MP09 Long Water west-bank bypass independent post-release QA', () => {
  it('proves the exact dry route while retaining the complete sealed water component', () => {
    const out = path.join(temporaryDirectory, 'post-release-qa.json');
    execFileSync(process.execPath, [SCRIPT, '--ledger', LEDGER, '--out', out], { cwd: ROOT, stdio: 'pipe' });
    const qa = JSON.parse(fs.readFileSync(out, 'utf8'));

    expect(qa).toMatchObject({
      status: 'PASS_EXECUTED_DRY_WEST_BANK_BYPASS_RETAINS_SEALED_LONG_WATER_COMPONENT',
      exactExecutedRouteCells: { observed: { cellCount: 274 }, postState: { 'minecraft:polished_andesite': 274 } },
      retainedLongWater: {
        source: { cellCount: 1477, boundaryFaces: [] },
        post: { cellCount: 1477, boundaryFaces: [] },
        unchangedAcrossRelease: true,
      },
      route: { width: 2, minHeadroom: 2, maxStepRise: 1 },
      interaction: { fluidOrWaterloggedCells: 0, protectedOrControlCells: 0, blockEntityIntersections: [], savedEntityIntersections: [] },
    });
  }, 30000);
});
