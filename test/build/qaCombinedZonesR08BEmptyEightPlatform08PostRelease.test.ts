import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r08b_empty_eight_platform_08_post_release.mjs',
);
const REPORT = path.join(
  ROOT,
  'data/world-review/combined-zones-r08b-live-20260821T162429Z/r08b-post-release-qa.json',
);

interface QaReport {
  status: string;
  qaPayloadSha256: string;
  result: {
    operatedTargetMatchCount: number;
    operatedTargetMismatchCount: number;
    preservedMechanismMatchCount: number;
    preservedMechanismMismatchCount: number;
    clearInteriorAirCount: number;
    clearInteriorConnectivity: {
      componentCount: number;
      largestComponentCellCount: number;
    };
    lightingMatchCount: number;
    barrierMatchCount: number;
    openBarrierCellCount: number;
    strictExecutionSuccessCount: number;
    rollbackGuardPassCount: number;
  };
  checks: Array<{ id: string; status: string }>;
  safetyBoundary: {
    liveCallsPerformed: boolean;
    worldEditsPerformed: boolean;
    readOnlyAnvilInputs: boolean;
  };
}

let firstReport = '';

beforeAll(() => {
  execFileSync(process.execPath, [SCRIPT], { cwd: ROOT, stdio: 'pipe' });
  firstReport = fs.readFileSync(REPORT, 'utf8');
  execFileSync(process.execPath, [SCRIPT], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

describe('Combined Zones R08B EE-PF-08 post-release QA', () => {
  it('regenerates the sealed report deterministically', () => {
    expect(fs.readFileSync(REPORT, 'utf8')).toBe(firstReport);
  });

  it('accepts every target, preserved mechanism, route, barrier, and inverse', () => {
    const report = JSON.parse(firstReport) as QaReport;
    expect(report.status).toBe('PASS_R08B_EMPTY_EIGHT_PLATFORM_08_POST_RELEASE_ACCEPTED');
    expect(report.qaPayloadSha256).toBe(
      '9952b456fbf47c7664a880bbb95b00491f5be4bb1da74a2b6c36ef0d96425eb6',
    );
    expect(report.result).toEqual({
      operatedTargetMatchCount: 3678,
      operatedTargetMismatchCount: 0,
      preservedMechanismMatchCount: 254,
      preservedMechanismMismatchCount: 0,
      clearInteriorAirCount: 2392,
      clearInteriorConnectivity: {
        componentCount: 1,
        largestComponentCellCount: 2392,
      },
      lightingMatchCount: 7,
      barrierMatchCount: 202,
      openBarrierCellCount: 0,
      strictExecutionSuccessCount: 3678,
      rollbackGuardPassCount: 3678,
    });
    expect(report.checks.every(({ status }) => status === 'PASS')).toBe(true);
  });

  it('is strictly read-only', () => {
    const report = JSON.parse(firstReport) as QaReport;
    expect(report.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      readOnlyAnvilInputs: true,
    });
  });
});
