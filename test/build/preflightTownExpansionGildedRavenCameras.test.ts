import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

import {
  GILDED_RAVEN_CAMERA_OBJECT_BY_SHOT,
} from '../../scripts/generate_town_expansion_media_manifest.mjs';
import {
  GILDED_RAVEN_CAMERA_BINDINGS,
} from '../../scripts/preflight_town_expansion_gilded_raven_cameras.mjs';

const ROOT = path.resolve(__dirname, '../..');
const PREFLIGHT = path.join(
  ROOT,
  'data/world-review/'
    + 'town-expansion-gilded-raven-camera-preflight-20260728.json',
);

function readJson(filename: string) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function sha256File(filename: string) {
  return crypto.createHash('sha256')
    .update(fs.readFileSync(filename))
    .digest('hex');
}

describe('Town Expansion Gilded Raven camera preflight', () => {
  it('covers the complete three-shot object family', () => {
    expect(Object.fromEntries(Object.entries(
      GILDED_RAVEN_CAMERA_BINDINGS,
    ).map(([shotId, binding]) => [
      shotId,
      binding.primaryFeatureId,
    ]))).toEqual(GILDED_RAVEN_CAMERA_OBJECT_BY_SHOT);
    expect(GILDED_RAVEN_CAMERA_BINDINGS).toMatchObject({
      'OBJECT-RRCH-GILDED-RAVEN-FIRST-PASS': {
        eye: [-8, 96, -300],
        lookAt: [5, 90, -350],
        eyeDisposition: 'reviewed-exterior-facade-standoff',
      },
      'OBJECT-RRCH-GILDED-RAVEN-SECOND-PASS': {
        eye: [-8, 83, -368],
        lookAt: [-8, 80, -398],
        eyeDisposition: 'reviewed-interior-main-house',
      },
      'OBJECT-TE-RRCH-GILDED-RAVEN': {
        eye: [-5, 31, -395],
        lookAt: [-29, 40, -395],
        eyeDisposition: 'reviewed-interior-grand-descent',
      },
    });
  });

  it('binds accepted final-snapshot images and preserves the floor reject', () => {
    const report = readJson(PREFLIGHT);

    expect(report).toMatchObject({
      status: 'PASS',
      liveWorldMutated: false,
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
        allFramingTargetsBoundToExactObjects: true,
        allFirstVisibleSurfacesInsideExactObjects: true,
        allQualityGatesPass: true,
        allGeometryContractsSatisfied: true,
        pairedPassGeometryReady: true,
        noCanonicalCapturePathsWritten: true,
      },
      contract: {
        coverageAudit: {
          preservedRejectedEvidence: {
            capture: {
              sha256:
                '46bcd65c043d0de65e6658570615b44c947cb96ae48bc451840aaea5d848aa61',
            },
            metadata: {
              sha256:
                'c59f31c65a04cbf8e2337a878e23c29578b12d3980f88fc8de4918e1fc69e2b3',
            },
            rejectedCamera: {
              eye: [-8, 78, -368],
              lookAt: [-8, 78, -397],
            },
            rejectedQuality: {
              luminanceVariance: 0,
              luminanceRange: 0,
              quantizedColorCount: 1,
              nonBlank: false,
            },
          },
        },
      },
    });
    expect(report.contract.coverageAudit.cause).toContain(
      'exactly on the solid L2 finished floor at Y=78',
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
        && camera.geometryContract.lookAtInsideExactObject === true
        && camera.geometryContract
          .firstVisibleSurfaceInsideExactObject === true
        && fs.existsSync(accepted)
        && fs.statSync(accepted).size === camera.acceptedImage.bytes
        && sha256File(accepted) === camera.acceptedImage.sha256
      );
    })).toBe(true);
  });
});
