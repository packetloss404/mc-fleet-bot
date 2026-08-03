import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import {
  SALES_OFFICE_CAMERA_OBJECT_BY_SHOT,
} from '../../scripts/generate_town_expansion_media_manifest.mjs';
import {
  SALES_OFFICE_CAMERA_BINDINGS,
} from '../../scripts/preflight_town_expansion_sales_office_cameras.mjs';

const ROOT = path.resolve(__dirname, '../..');
const PREFLIGHT = path.join(
  ROOT,
  'data/world-review/'
    + 'town-expansion-sales-office-camera-preflight-20260728.json',
);

function readJson(filename: string) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function sha256File(filename: string) {
  return crypto.createHash('sha256')
    .update(fs.readFileSync(filename))
    .digest('hex');
}

describe('Town Expansion sales-office camera preflight', () => {
  it('covers the complete three-shot object family', () => {
    expect(Object.fromEntries(Object.entries(
      SALES_OFFICE_CAMERA_BINDINGS,
    ).map(([shotId, binding]) => [
      shotId,
      binding.primaryFeatureId,
    ]))).toEqual(SALES_OFFICE_CAMERA_OBJECT_BY_SHOT);
    expect(SALES_OFFICE_CAMERA_BINDINGS).toMatchObject({
      'OBJECT-OWNER-CITY-SALES-OFFICE-01-FIRST-PASS': {
        eye: [80, -40.5, -216],
        lookAt: [98, -42, -216],
      },
      'OBJECT-OWNER-CITY-SALES-OFFICE-01-SECOND-PASS': {
        eye: [104, -40, -211],
        lookAt: [96, -40, -205.2],
      },
      'OBJECT-TE-OWNER-CITY-SALES-OFFICE': {
        eye: [80, -40.5, -216],
        lookAt: [98, -42, -216],
      },
    });
  });

  it('binds accepted immutable-post images and preserves rejected evidence', () => {
    const report = readJson(PREFLIGHT);

    expect(report).toMatchObject({
      status: 'PASS',
      liveWorldMutated: false,
      counts: {
        sourceShots: 3,
        passedShots: 3,
        failedShots: 0,
        pairedCapturesBound: 6,
        rejectedRenderAttempts: 0,
        failedRenderAttempts: 0,
      },
      checks: {
        exactFamilyShotCount: true,
        allEyesClear: true,
        allLookTargetsClear: true,
        allQualityGatesPass: true,
        allGeometryInsideExactObjects: true,
        pairedPassGeometryReady: true,
        noCanonicalCapturePathsWritten: true,
      },
      contract: {
        coverageAudit: {
          preservedRejectedEvidence: {
            capture: {
              sha256:
                '020deab122aad6b70909b256986bd856e939108aa6649683ae867ab88ada93db',
            },
            metadata: {
              sha256:
                'db7a57ce231243a3c60e92a3c1856b7747799112e40c034a4664577833ceed0d',
            },
            rejectedQuality: {
              quantizedColorCount: 3,
              nonBlank: false,
            },
          },
        },
      },
    });
    expect(report.contract.coverageAudit.cause).toContain(
      'occupies the three-block-high concierge desk',
    );
    expect(report.cameras).toHaveLength(3);
    expect(report.cameras.every((camera: any) => {
      const accepted = path.join(ROOT, camera.acceptedImage.path);
      return (
        camera.status === 'PASS'
        && camera.occupancy.status === 'PASS'
        && camera.lineOfSight.status === 'PASS'
        && camera.quality.status === 'PASS'
        && camera.quality.metrics.nonBlank === true
        && fs.existsSync(accepted)
        && fs.statSync(accepted).size === camera.acceptedImage.bytes
        && sha256File(accepted) === camera.acceptedImage.sha256
      );
    })).toBe(true);
  });
});
