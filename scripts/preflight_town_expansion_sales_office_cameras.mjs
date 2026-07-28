#!/usr/bin/env node
/**
 * Render the complete Founders' Gallery sales-office object-camera family
 * against the accepted immutable post snapshot before paired media rendering.
 *
 * This is offline and read-only with respect to Minecraft. It covers both
 * authored publication shots and the exact compiler-scope alias so a generic
 * or occupied object camera cannot bypass preflight.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import { AnvilSnapshot } from './generate_picket_fence.mjs';
import {
  buildMediaPackage,
  SALES_OFFICE_CAMERA_OBJECT_BY_SHOT,
} from './generate_town_expansion_media_manifest.mjs';
import {
  C01_CAMERA_MAX_RENDER_DISTANCE,
  clearSightDistance,
  isCameraEyeClear,
  isCameraRayTransparent,
  renderCameraPreflight,
} from './preflight_town_expansion_c01_cameras.mjs';
import { MEDIA_IMAGE_QUALITY_GATE } from './lib/media_image_quality.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_REPORT =
  'data/buildops/town-expansion-r1-2026-07-28.report.json';
const DEFAULT_DATABASE = 'data/world-map.db';
const DEFAULT_REGIONS =
  'data/worldsnap-town-terminal-recovery-post-20260728T1839Z/region';
const DEFAULT_OUT =
  'data/world-review/'
  + 'town-expansion-sales-office-camera-preflight-20260728.json';
const DEFAULT_IMAGE_DIRECTORY =
  'data/exports/town-expansion-media-2026-07-28/'
  + 'sales-office-camera-preflight';
const REJECTED_CAPTURE =
  'data/exports/town-expansion-media-2026-07-28/rejected-captures/'
  + 'OBJECT-OWNER-CITY-SALES-OFFICE-01-FIRST-PASS-PASS-1-raw-'
  + '020deab122aa.png';
const REJECTED_METADATA =
  'data/exports/town-expansion-media-2026-07-28/rejected-captures/'
  + 'OBJECT-OWNER-CITY-SALES-OFFICE-01-FIRST-PASS-PASS-1-raw-'
  + '020deab122aa.json';

export const SALES_OFFICE_CAMERA_BINDINGS = Object.freeze({
  'OBJECT-OWNER-CITY-SALES-OFFICE-01-FIRST-PASS': {
    primaryFeatureId: SALES_OFFICE_CAMERA_OBJECT_BY_SHOT[
      'OBJECT-OWNER-CITY-SALES-OFFICE-01-FIRST-PASS'
    ],
    eye: [80, -40.5, -216],
    lookAt: [98, -42, -216],
    fov: 68,
    sourceCameraId: 'OWNER-CITY-SALES-OFFICE-01-FIRST-PASS',
    sourceJsonPointer:
      '/publication/objectRecords/10/cameraCandidates/0',
    originalEye: [84, -42, -222],
    originalLookAt: [97, -42, -216],
    reviewedSeed:
      'reviewed-sales-office-concierge-gallery-and-model-camera',
    evidence:
      'concierge desk, materials gallery, illuminated district model, '
      + 'and reservation markers',
  },
  'OBJECT-OWNER-CITY-SALES-OFFICE-01-SECOND-PASS': {
    primaryFeatureId: SALES_OFFICE_CAMERA_OBJECT_BY_SHOT[
      'OBJECT-OWNER-CITY-SALES-OFFICE-01-SECOND-PASS'
    ],
    eye: [104, -40, -211],
    lookAt: [96, -40, -205.2],
    fov: 68,
    sourceCameraId: 'OWNER-CITY-SALES-OFFICE-01-SECOND-PASS',
    sourceJsonPointer:
      '/publication/objectRecords/10/cameraCandidates/1',
    originalEye: [96, -42, -209],
    originalLookAt: [96, -42, -204],
    reviewedSeed:
      'reviewed-sales-office-sealed-presentation-door-camera',
    evidence:
      'sealed future-city presentation doors, adjacent reservation marker, '
      + 'and illuminated district model',
  },
  'OBJECT-TE-OWNER-CITY-SALES-OFFICE': {
    primaryFeatureId: SALES_OFFICE_CAMERA_OBJECT_BY_SHOT[
      'OBJECT-TE-OWNER-CITY-SALES-OFFICE'
    ],
    eye: [80, -40.5, -216],
    lookAt: [98, -42, -216],
    fov: 68,
    sourceCameraId: null,
    sourceJsonPointer: '/operations/scopeSummary/198',
    originalEye: [81, -39.5, -227],
    originalLookAt: [92, -39.5, -216.5],
    reviewedSeed:
      'reviewed-sales-office-exact-scope-alias-camera',
    evidence:
      'exact compiler-scope alias of the concierge, gallery, model, '
      + 'and reservation-marker interior',
  },
});

function parseArgs(argv) {
  const options = {
    report: DEFAULT_REPORT,
    database: DEFAULT_DATABASE,
    regions: DEFAULT_REGIONS,
    out: DEFAULT_OUT,
    imageDirectory: DEFAULT_IMAGE_DIRECTORY,
    resume: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--report') options.report = argv[++index];
    else if (argument === '--database') options.database = argv[++index];
    else if (argument === '--regions') options.regions = argv[++index];
    else if (argument === '--out') options.out = argv[++index];
    else if (argument === '--image-dir') {
      options.imageDirectory = argv[++index];
    } else if (argument === '--resume') {
      options.resume = true;
    } else if (argument === '--help') {
      options.help = true;
    } else {
      throw new Error(`unknown argument ${argument}`);
    }
  }
  return options;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256File(filename) {
  return sha256(fs.readFileSync(filename));
}

function relativeRoot(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function snapshotHash(directory) {
  const files = fs.readdirSync(directory)
    .filter((name) => name.endsWith('.mca'))
    .sort();
  if (files.length === 0) {
    throw new Error(`no Anvil region files found in ${directory}`);
  }
  const digest = crypto.createHash('sha256');
  let bytes = 0;
  for (const filename of files) {
    const content = fs.readFileSync(path.join(directory, filename));
    digest.update(filename);
    digest.update('\0');
    digest.update(content);
    digest.update('\0');
    bytes += content.length;
  }
  return {
    algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
    sha256: digest.digest('hex'),
    regionFileCount: files.length,
    bytes,
  };
}

function pointInsideBounds(point, rawBounds) {
  const bounds = [
    Math.min(rawBounds[0], rawBounds[3]),
    Math.min(rawBounds[1], rawBounds[4]),
    Math.min(rawBounds[2], rawBounds[5]),
    Math.max(rawBounds[0], rawBounds[3]),
    Math.max(rawBounds[1], rawBounds[4]),
    Math.max(rawBounds[2], rawBounds[5]),
  ];
  return (
    point[0] >= bounds[0] && point[0] <= bounds[3]
    && point[1] >= bounds[1] && point[1] <= bounds[4]
    && point[2] >= bounds[2] && point[2] <= bounds[5]
  );
}

function direction(from, to) {
  const delta = to.map((coordinate, index) => coordinate - from[index]);
  const length = Math.hypot(...delta);
  if (!(length > 0)) throw new Error('camera direction must be non-zero');
  return {
    vector: delta.map((coordinate) => coordinate / length),
    length,
  };
}

async function blockAt(snapshot, point) {
  const [x, y, z] = point.map(Math.floor);
  const chunk = await snapshot.readChunk(
    Math.floor(x / 16),
    Math.floor(z / 16),
  );
  return {
    point: [x, y, z],
    name: snapshot.blockName(chunk, x, y, z),
  };
}

function rejectedEvidence() {
  const capture = path.resolve(ROOT, REJECTED_CAPTURE);
  const metadata = path.resolve(ROOT, REJECTED_METADATA);
  if (!fs.existsSync(capture) || !fs.existsSync(metadata)) return null;
  const record = JSON.parse(fs.readFileSync(metadata, 'utf8'));
  return {
    capture: {
      path: relativeRoot(capture),
      bytes: fs.statSync(capture).size,
      sha256: sha256File(capture),
    },
    metadata: {
      path: relativeRoot(metadata),
      bytes: fs.statSync(metadata).size,
      sha256: sha256File(metadata),
    },
    rejectedCamera: record.camera,
    rejectedQuality: record.quality,
  };
}

export async function buildSalesOfficeCameraPlans({
  media,
  snapshot,
}) {
  const objectsById = new Map(
    media.crosswalk.objects.map((object) => [object.objectId, object]),
  );
  const plans = [];
  for (const [shotId, binding] of Object.entries(
    SALES_OFFICE_CAMERA_BINDINGS,
  )) {
    const owner = objectsById.get(binding.primaryFeatureId);
    if (!owner) {
      throw new Error(`${shotId}: exact sales-office object missing`);
    }
    if (
      !pointInsideBounds(binding.eye, owner.bounds)
      || !pointInsideBounds(binding.lookAt, owner.bounds)
    ) {
      throw new Error(`${shotId}: reviewed camera exits exact bounds`);
    }
    const eye = await blockAt(snapshot, binding.eye);
    const target = await blockAt(snapshot, binding.lookAt);
    if (!isCameraEyeClear(eye.name)) {
      throw new Error(
        `${shotId}: reviewed eye is occupied by ${eye.name}`,
      );
    }
    if (!isCameraRayTransparent(target.name)) {
      throw new Error(
        `${shotId}: reviewed look target is opaque ${target.name}`,
      );
    }
    const sightVector = direction(binding.eye, binding.lookAt);
    const blockNameAt = async (point) => (
      await blockAt(snapshot, point)
    ).name;
    const exactSight = await clearSightDistance({
      eye: binding.eye,
      direction: sightVector.vector,
      maximumDistance: sightVector.length,
      blockNameAt,
    });
    if (exactSight.firstSurface) {
      throw new Error(
        `${shotId}: reviewed line of sight intersects `
        + `${exactSight.firstSurface.blockName} at `
        + exactSight.firstSurface.point.join(','),
      );
    }
    const fullSight = await clearSightDistance({
      eye: binding.eye,
      direction: sightVector.vector,
      maximumDistance: C01_CAMERA_MAX_RENDER_DISTANCE,
      blockNameAt,
    });
    plans.push({
      cameraId: shotId,
      shotId,
      source: {
        file: DEFAULT_REPORT,
        jsonPointer: binding.sourceJsonPointer,
        sourceCameraId: binding.sourceCameraId,
        originalEye: binding.originalEye,
        originalLookAt: binding.originalLookAt,
        reviewedGeometry: binding.evidence,
      },
      owner: {
        objectId: owner.objectId,
        bounds: owner.bounds,
      },
      level: {
        id: 'FOUNDERS-GALLERY-SALES-OFFICE',
        auditVolumeBoxes: [owner.bounds],
      },
      candidates: [{
        cameraId: shotId,
        eye: binding.eye,
        lookAt: binding.lookAt,
        fov: binding.fov,
        maxDistance: C01_CAMERA_MAX_RENDER_DISTANCE,
        offset: binding.eye.map(
          (coordinate, index) =>
            Number((coordinate - binding.originalEye[index]).toFixed(2)),
        ),
        yawOffsetDegrees: null,
        reviewedSeed: binding.reviewedSeed,
        eyeBlock: eye.name,
        lookAtBlock: target.name,
        lookDistance: Number(sightVector.length.toFixed(3)),
        clearSightDistance: fullSight.distance,
        firstVisibleSurface: fullSight.firstSurface,
        sourceDirectionPreserved: false,
      }],
    });
  }
  return plans;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(
      'usage: node scripts/preflight_town_expansion_sales_office_cameras.mjs '
      + '--regions <immutable-post-region-dir> [--out <json>] '
      + '[--image-dir <dir>] [--resume]\n',
    );
    return;
  }
  const reportPath = path.resolve(ROOT, options.report);
  const databasePath = path.resolve(ROOT, options.database);
  const regions = path.resolve(ROOT, options.regions);
  const outputPath = path.resolve(ROOT, options.out);
  const imageDirectory = path.resolve(ROOT, options.imageDirectory);
  if (!fs.existsSync(regions)) {
    throw new Error(`immutable post snapshot missing: ${regions}`);
  }
  const reportSource = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const media = buildMediaPackage({
    report: reportSource,
    reportPath,
    databasePath,
    salesOfficeCameraPreflightPath: null,
  });
  const snapshot = new AnvilSnapshot(regions);
  const plans = await buildSalesOfficeCameraPlans({ media, snapshot });
  const results = [];
  for (const [cameraIndex, plan] of plans.entries()) {
    const result = await renderCameraPreflight({
      plan,
      regions,
      imageDirectory,
      width: 1280,
      height: 720,
      resume: options.resume,
    });
    results.push({
      ...result,
      cameraIndex,
      shotId: plan.shotId,
      primaryFeatureId: plan.owner.objectId,
    });
    process.stdout.write(
      `${cameraIndex + 1}/${plans.length} ${plan.shotId}: `
      + `${result.status}`
      + `${result.status === 'PASS'
        ? ` colors=${result.quality.metrics.quantizedColorCount}`
        : ''}\n`,
    );
  }
  const failures = results.filter((result) => result.status !== 'PASS');
  const output = {
    schemaVersion: 1,
    id: 'town-expansion-sales-office-camera-poststate-preflight',
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    generatedAtUtc: new Date().toISOString(),
    liveWorldMutated: false,
    source: {
      compilerReport: {
        path: relativeRoot(reportPath),
        sha256: sha256File(reportPath),
      },
      immutablePostSnapshot: {
        path: relativeRoot(regions),
        ...snapshotHash(regions),
      },
    },
    contract: {
      family:
        'Founders Gallery publication object plus exact compiler-scope alias',
      disposition:
        'replace occupied or generic source cameras only with reviewed '
        + 'immutable-post interior geometry inside the same exact object',
      maximumRenderDistance: C01_CAMERA_MAX_RENDER_DISTANCE,
      qualityGate: MEDIA_IMAGE_QUALITY_GATE,
      rejectedCapturePolicy:
        'retain every rejected attempt outside canonical paired output paths',
      coverageAudit: {
        cause:
          'the authored first-pass camera eye [84,-42,-222] occupies the '
          + 'three-block-high concierge desk at x=81..89, y=-43..-41, '
          + 'z=-224..-219; the prior C01-only camera preflight did not cover '
          + 'this non-C01 publication family',
        familyShotsCovered: Object.keys(SALES_OFFICE_CAMERA_BINDINGS),
        preservedRejectedEvidence: rejectedEvidence(),
      },
    },
    counts: {
      sourceShots: results.length,
      passedShots: results.length - failures.length,
      failedShots: failures.length,
      pairedCapturesBound: results.length * 2,
      totalRenderAttempts: results.reduce(
        (count, result) => count + result.attempts.length,
        0,
      ),
      rejectedRenderAttempts: results.reduce(
        (count, result) => count + result.attempts.filter(
          (attempt) =>
            attempt.status === 'REJECTED_LOW_INFORMATION_CAPTURE',
        ).length,
        0,
      ),
      failedRenderAttempts: results.reduce(
        (count, result) => count + result.attempts.filter(
          (attempt) => attempt.status === 'RENDER_FAILED',
        ).length,
        0,
      ),
    },
    checks: {
      exactFamilyShotCount: results.length === 3,
      allEyesClear: results.every(
        (result) => result.occupancy?.status === 'PASS',
      ),
      allLookTargetsClear: results.every(
        (result) => result.lineOfSight?.status === 'PASS',
      ),
      allQualityGatesPass: results.every(
        (result) => result.quality?.status === 'PASS',
      ),
      allGeometryInsideExactObjects: results.every(
        (result) => (
          pointInsideBounds(result.camera?.eye, result.owner?.bounds)
          && pointInsideBounds(result.camera?.lookAt, result.owner?.bounds)
        ),
      ),
      pairedPassGeometryReady: results.length === 3,
      noCanonicalCapturePathsWritten: results.every(
        (result) => result.attempts.every(
          (attempt) => !String(attempt.output ?? '').includes('/pass-1/')
            && !String(attempt.output ?? '').includes('/pass-2/'),
        ),
      ),
    },
    failures: failures.map((result) => ({
      shotId: result.shotId,
      failures: result.failures,
    })),
    cameras: results,
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  process.stdout.write(
    `${output.status}: ${output.counts.passedShots}/`
    + `${output.counts.sourceShots} family shots pass; `
    + `${output.counts.rejectedRenderAttempts} rejected attempts\n`
    + `report: ${relativeRoot(outputPath)}\n`,
  );
  if (failures.length > 0) process.exitCode = 1;
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
