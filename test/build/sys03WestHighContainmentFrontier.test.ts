import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'sys03-west-high-frontier-'));
let report: any;

describe('SYS03 West High containment frontier', () => {
  beforeAll(() => {
    execFileSync(process.execPath, [
      'scripts/survey_sys03_west_high_containment_frontier_01.mjs',
      '--out-dir', OUT,
      '--markdown-out', path.join(OUT, 'frontier.md'),
      '--generated-at', '2026-08-27T01:30:00.000Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 180_000 });
    report = JSON.parse(fs.readFileSync(path.join(OUT, 'sys03-west-high-containment-frontier.json'), 'utf8'));
  });

  afterAll(() => fs.rmSync(OUT, { recursive: true, force: true }));

  it('binds the current immutable post and is disjoint from B07', () => {
    expect(report.status).toBe('SOURCE_BOUND_SUBSTANTIVE_FRONTIER_HELD_FOR_CONTAINMENT_FIRST');
    expect(report.source.postSnapshot.root).toBe('data/worldsnap-mp02-b08-surface-recovery-landing-post-20260827T005500Z');
    expect(report.disjointness.spatiallyDisjointFromB07).toBe(true);
    expect(report.safetyBoundary).toMatchObject({ readOnly: true, worldMutated: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0 });
  });

  it('retains the finite water and supported-gravity facts but denies an access-first operation', () => {
    expect(report.currentFluidAndGravity.waterSeeds.cellCount).toBe(16);
    expect(report.currentFluidAndGravity.waterComponent).toMatchObject({ cellCount: 2525, traceComplete: true });
    expect(report.currentFluidAndGravity.gravityTargets).toMatchObject({ expectedCount: 92, observedCount: 92, sourceStatesAllGravity: true, sourceSupportTerminalsAllNonAirNonFluid: true });
    expect(report.currentFluidAndGravity.passForContainmentFreeOperation).toBe(false);
  });
});
