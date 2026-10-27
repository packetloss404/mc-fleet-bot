import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r11d-post-qa-'),
);
const reportPath = path.join(temporaryDirectory, 'qa.json');
const markdownPath = path.join(temporaryDirectory, 'qa.md');

beforeAll(() => {
  execFileSync(process.execPath, [
    'scripts/qa_combined_zones_r11d_c1_at_grade_island_521_546_post_release.mjs',
    '--out', reportPath,
    '--markdown', markdownPath,
    '--generated-at', '2026-08-21T19:30:00Z',
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones CZ-R11D post-release QA', () => {
  it('seals the executed release and immutable snapshot identities', () => {
    expect(JSON.parse(fs.readFileSync(reportPath, 'utf8'))).toMatchObject({
      status: 'PASS',
      mode: 'READ_ONLY_POST_RELEASE_SEAL',
      release: {
        transactionId: 'combined-zones-r11d-c1-at-grade-island-521-546',
        manifestIdentitySha256:
          'f625388d44a4532bb1f35c041cda0ddc9fca2aa0504f09cb0f537cf252ee0320',
        completedReleaseIdentitySha256:
          'e0b07df1f9f3a6d5218db91f1b5afd3b0383150cf2c0c0d5cbbfddba3c8af0eb',
      },
      snapshots: {
        postCompleteSaveSha256:
          'b18af0b34c2156c51d2cdf4e8ade401efdcfd184c35787709c7048e5ba4cebe6',
        postRegionSha256:
          '303c00aa95c5c49b55f4d1c9e5f7436ab114a87bf7db73fec2373b114254aef5',
      },
    });
  });

  it('verifies all targets, foundations, headroom, and inverse rollback', () => {
    expect(JSON.parse(fs.readFileSync(reportPath, 'utf8')).checks).toMatchObject({
      exactSourceStateCount: 1_284,
      exactTargetStateCount: 1_284,
      reverseRollbackRecordCount: 1_284,
      connectedSurfaceCellCount: 476,
      connectedSurfaceComponentCount: 1,
      stableFoundationContactCount: 476,
      foundationFillCount: 329,
      fullHeadroomAirCount: 952,
      successfulExecutionGroupCount: 1_284,
      unexpectedExecutionNoopCount: 0,
      rollbackGuardPassCount: 1_284,
    });
  });

  it('preserves all exceptions, retained leaves, halo cells, and held ends', () => {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    expect(report.checks).toMatchObject({
      candidateCellCount: 499,
      preservedExceptionCount: 23,
      preservedExceptionDriftCount: 0,
      retainedLeafCount: 292,
      retainedLeafDriftCount: 0,
      retainedLogDistanceCensus: { 1: 91, 2: 112, 3: 75, 4: 10, 5: 4 },
      interactionHaloCellCount: 4_160,
      undeclaredDriftCount: 0,
      routeCommissioned: false,
      liveCallsPerformed: false,
      worldEditsPerformed: false,
    });
    expect(report.qaPayloadSha256)
      .toBe('0e16f032c614bc6e923ec097de2e281d084207cf190d708ade3a1f9b0fccf319');
    expect(fs.readFileSync(markdownPath, 'utf8')).toContain('**Status:** PASS');
  });
});
