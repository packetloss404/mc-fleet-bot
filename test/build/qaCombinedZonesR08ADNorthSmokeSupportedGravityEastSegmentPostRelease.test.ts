import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const DIR = path.join(ROOT, 'data/world-review/combined-zones-r08ad-live-20260822T012919Z');
const read = (name: string) => JSON.parse(fs.readFileSync(path.join(DIR, name), 'utf8'));

beforeAll(() => execFileSync(process.execPath, [
  path.join(ROOT, 'scripts/qa_combined_zones_r08ad_north_smoke_supported_gravity_east_segment_post_release.mjs'),
], { cwd: ROOT, stdio: 'pipe' }), 30_000);

describe('R08AD independent post-release QA', () => {
  it('binds the completed release and immutable saves', () => {
    expect(read('r08ad-post-release-qa.json')).toMatchObject({
      status: 'PASS_R08AD_NORTH_SMOKE_SUPPORTED_GRAVITY_EAST_SEGMENT_POST_RELEASE_ACCEPTED',
      release: { manifestIdentity: '98c5766a634bbf68b6dd005c0ca50299c017276738be839cf91a9ea6505e9c9e',
        completedReleaseIdentitySha256: '8a52c003b3466815fcb1adfbec13082fab8d47b48d5a97fb385654cd1dae18d4' },
      bindings: { stages: 17, evidenceBindings: 17 },
    });
  });
  it('verifies exact geometry, preservation, and bounded drift', () => {
    expect(read('r08ad-post-release-qa.json')).toMatchObject({
      geometry: { targetSet: { cellCount: 14 }, interactionHalo: { cellCount: 46 },
        componentCount: 1, widthCells: 2, heightCells: 7 },
      postState: { exactTransitions: { expected: 14, matching: 14, mismatches: 0 },
        boundedDiff: { reviewCells: 4522, declaredChanges: 14, observedChanges: 14,
          lifecycleChanges: 0, undeclaredChanges: 0 },
        preservation: { haloExact: 46, gravityChainsExact: 8, durableTerminalsExact: 8,
          wetCellsExact: 6, n06CellsExact: 4, priorCellsExact: 1120 } },
    });
  });
  it('binds the accepted residual, journal, and inverse', () => {
    expect(read('r08ad-post-release-qa.json')).toMatchObject({
      residual: { cellCount: 218, wet: 147, gravity: 56, sourceState: 15, n06Adjacent: 21 },
      execution: { stageCount: 17, journalEventCount: 34, successfulCommands: 14,
        failedCommands: 0, noopCommands: 0, rollbackGuardsPassed: 14 },
    });
  });
  it('emits the bounded fail-closed seal', () => {
    expect(read('r08ad-bounded-north-smoke-supported-gravity-east-segment-seal.json')).toMatchObject({
      status: 'PASS_R08AD_BOUNDED_NORTH_SMOKE_SUPPORTED_GRAVITY_EAST_SEGMENT_ACCEPTED',
      scope: { transitions: 14, halo: 46, gravityChains: 8, priorCells: 1120, residualCells: 218 },
      rollback: { guards: 14, passed: true }, noLiveCalls: true, noWorldEdits: true,
    });
  });
});
