import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const DIRECTORY = path.join(ROOT,
  'data/world-review/combined-zones-r08ag-live-20260822T020533Z');
const SCRIPT = path.join(ROOT,
  'scripts/qa_combined_zones_r08ag_north_smoke_source_state_column_completion_post_release.mjs');
const readJson = (filename: string) => JSON.parse(
  fs.readFileSync(path.join(DIRECTORY, filename), 'utf8'),
);

beforeAll(() => execFileSync(process.execPath, [SCRIPT], {
  cwd: ROOT,
  stdio: 'pipe',
}), 30_000);

describe('R08AG post-release QA', () => {
  it('binds the executed release and immutable evidence', () => {
    expect(readJson('r08ag-post-release-qa.json')).toMatchObject({
      status: 'PASS_R08AG_NORTH_SMOKE_SOURCE_STATE_COLUMN_COMPLETION_POST_RELEASE_ACCEPTED',
      release: {
        manifestIdentity: '197ac7f5c7a7973996d87ab9196138bd2d4a1ed33b3871d0807cc87f6d22b553',
        completedReleaseIdentitySha256: '73cd13c4ce79e7faf83710d5e29fdafab2df557fd0a2d0cb8ba009ea8ad2fe30',
      },
      bindings: { stages: 17, evidence: 17 },
    });
  });

  it('verifies the exact target, halo, prior scope, and bounded diff', () => {
    expect(readJson('r08ag-post-release-qa.json')).toMatchObject({
      geometry: {
        targetSet: { cellCount: 7 },
        halo: { cellCount: 30 },
        width: 1,
        height: 7,
        componentCount: 1,
      },
      postState: {
        exactTransitions: { expected: 7, matching: 7, mismatches: 0 },
        stoneBrickCount: 7,
        sourceStates: { 'minecraft:air': 6, 'minecraft:stone': 1 },
        boundedDiff: { reviewCells: 4522, declared: 7, observed: 7, lifecycle: 0, undeclared: 0 },
        haloExact: 30,
        priorAcceptedR08CellsExact: 1184,
      },
    });
  });

  it('binds the exact local residual and strict execution', () => {
    expect(readJson('r08ag-post-release-qa.json')).toMatchObject({
      residual: {
        cellCount: 161,
        wet: 105,
        gravity: 56,
        sourceState: 0,
        n06Adjacent: 21,
        disposition: 'LOCAL_NON_DURABLE_PHYSICS_GROUPS_ONLY; NOT A MASTERPLAN HOLD',
      },
      execution: {
        stages: 17,
        journalEvents: 20,
        success: 7,
        failed: 0,
        noops: 0,
        inverseGuards: 7,
      },
    });
  });

  it('emits the bounded acceptance seal', () => {
    expect(readJson('r08ag-bounded-north-smoke-source-state-column-completion-seal.json'))
      .toMatchObject({
        status: 'PASS_R08AG_BOUNDED_NORTH_SMOKE_SOURCE_STATE_COLUMN_COMPLETION_ACCEPTED',
        scope: { targets: 7, halo: 30, priorCells: 1184, residual: 161 },
        rollback: { guards: 7, passed: true },
        localResidualOnly: true,
        noLiveCalls: true,
        noWorldEdits: true,
      });
  });
});
