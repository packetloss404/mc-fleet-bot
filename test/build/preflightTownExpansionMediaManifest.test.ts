import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const REPORT = path.join(
  ROOT,
  'data/world-review/town-expansion-media-static-preflight-20260728.json',
);

describe('Town Expansion complete media static preflight', () => {
  it('binds every paired camera and supported family gate to the final snapshot', () => {
    const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));

    expect(report).toMatchObject({
      status: 'PASS',
      liveWorldMutated: false,
      renderedImages: false,
      source: {
        immutablePostSnapshot: {
          path:
            'data/worldsnap-town-terminal-recovery-post-'
            + '20260728T1839Z/region',
          sha256:
            'c39d0d67c9dec737aa5807cf5fa56a84f3c3d38d4b13d0f82599d3eb30fa6751',
          regionFileCount: 30,
          bytes: 134749182,
        },
      },
      counts: {
        cameras: 1178,
        distinctShots: 589,
        pass1Cameras: 589,
        pass2Cameras: 589,
        maps: 26,
        perspectiveCameras: 1152,
        exactObjects: 340,
        expectedOutputPaths: 1178,
        existingInvalidatedOutputFiles: expect.any(Number),
        missingOutputFiles: expect.any(Number),
        renderRequiredOutputFiles: 1178,
      },
      checks: {
        combinedCameraCount: true,
        distinctCameraIds: true,
        distinctOutputPaths: true,
        exactPairedShotCount: true,
        pairedGeometryIdentical: true,
        pairedOutputsDistinct: true,
        allFeatureIdsResolve: true,
        allPerspectiveGeometryValid: true,
        allMapGeometryValid: true,
        manifestBindsSelectedSnapshot: true,
        crosswalkBindsSelectedSnapshot: true,
        renderBackedFamilyPreflightsPass: true,
        rejectedArchivesPreserved: true,
        renderRequirementPartitionsExpectedOutputs: true,
      },
      failures: [],
    });
    expect(report.counts.existingInvalidatedOutputFiles)
      .toBeGreaterThanOrEqual(63);
    expect(
      report.counts.existingInvalidatedOutputFiles
      + report.counts.missingOutputFiles,
    ).toBe(1178);
    expect(report.invalidation).toMatchObject({
      invalidatedCameraOutputs:
        report.counts.existingInvalidatedOutputFiles,
      pendingMissingCameraOutputs: report.counts.missingOutputFiles,
      renderRequiredCameraOutputs: 1178,
      captureReportInvalidated: false,
      captureReportDisposition: 'ABSENT_NOT_INVALIDATED',
      mediaQaInvalidated: false,
      mediaQaDisposition: 'ABSENT_NOT_INVALIDATED',
    });
    expect(report.supportedRenderBackedPreflights).toHaveLength(3);
    expect(report.supportedRenderBackedPreflights.every(
      (preflight: any) => (
        preflight.reportStatus === 'PASS'
        && preflight.reportIdentityMatches === true
        && preflight.snapshotMatches === true
      ),
    )).toBe(true);
  });
});
