#!/usr/bin/env node
/**
 * Render the complete Gilded Raven object-camera family against the accepted
 * immutable post snapshot before paired media rendering.
 *
 * This is offline and read-only with respect to Minecraft. It covers both
 * publication shots and the exact compiler-scope alias. Exterior framing is
 * allowed only for the declared facade shot; its target and first visible
 * surface must still resolve to the exact publication object.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

import { AnvilSnapshot } from './generate_picket_fence.mjs';
import {
  buildMediaPackage,
  GILDED_RAVEN_CAMERA_OBJECT_BY_SHOT,
} from './generate_town_expansion_media_manifest.mjs';
import {
  C01_CAMERA_MAX_RENDER_DISTANCE,
  clearSightDistance,
  isCameraEyeClear,
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
  + 'town-expansion-gilded-raven-camera-preflight-20260728.json';
const DEFAULT_IMAGE_DIRECTORY =
  'data/exports/town-expansion-media-2026-07-28/'
  + 'gilded-raven-camera-preflight';
const REJECTED_CAPTURE =
  'data/exports/town-expansion-media-2026-07-28/rejected-captures/'
  + 'OBJECT-RRCH-GILDED-RAVEN-SECOND-PASS-PASS-1-raw-'
  + '46bcd65c043d.png';
const REJECTED_METADATA =
  'data/exports/town-expansion-media-2026-07-28/rejected-captures/'
  + 'OBJECT-RRCH-GILDED-RAVEN-SECOND-PASS-PASS-1-raw-'
  + '46bcd65c043d.json';

export const GILDED_RAVEN_CAMERA_BINDINGS = Object.freeze({
  'OBJECT-RRCH-GILDED-RAVEN-FIRST-PASS': {
    primaryFeatureId: GILDED_RAVEN_CAMERA_OBJECT_BY_SHOT[
      'OBJECT-RRCH-GILDED-RAVEN-FIRST-PASS'
    ],
    eye: [-8, 96, -300],
    lookAt: [5, 90, -350],
    fov: 68,
    eyeDisposition: 'reviewed-exterior-facade-standoff',
    sourceCameraId: 'RRCH-GILDED-RAVEN-FIRST-PASS',
    sourceJsonPointer: '/publication/objectRecords/0/cameraCandidates/0',
    originalEye: [-8, 78, -329],
    originalLookAt: [-8, 78, -350],
    reviewedSeed: 'reviewed-gilded-raven-south-facade-massing-camera',
    evidence:
      'south facade, marquee, formal entry court, and complete theatre-house '
      + 'massing above the obstructing landscape canopy',
  },
  'OBJECT-RRCH-GILDED-RAVEN-SECOND-PASS': {
    primaryFeatureId: GILDED_RAVEN_CAMERA_OBJECT_BY_SHOT[
      'OBJECT-RRCH-GILDED-RAVEN-SECOND-PASS'
    ],
    eye: [-8, 83, -368],
    lookAt: [-8, 80, -398],
    fov: 68,
    eyeDisposition: 'reviewed-interior-main-house',
    sourceCameraId: 'RRCH-GILDED-RAVEN-SECOND-PASS',
    sourceJsonPointer: '/publication/objectRecords/0/cameraCandidates/1',
    originalEye: [-8, 78, -368],
    originalLookAt: [-8, 78, -397],
    reviewedSeed: 'reviewed-gilded-raven-main-house-bowl-camera',
    evidence:
      'main bowl, fixed seating, open sightline, stage, proscenium, and '
      + 'visible backdrop',
  },
  'OBJECT-TE-RRCH-GILDED-RAVEN': {
    primaryFeatureId: GILDED_RAVEN_CAMERA_OBJECT_BY_SHOT[
      'OBJECT-TE-RRCH-GILDED-RAVEN'
    ],
    eye: [-5, 31, -395],
    lookAt: [-29, 40, -395],
    fov: 68,
    eyeDisposition: 'reviewed-interior-grand-descent',
    sourceCameraId: null,
    sourceJsonPointer: '/operations/scopeSummary/194',
    originalEye: [-31, 32, -399],
    originalLookAt: [-8, 32, -371],
    reviewedSeed: 'reviewed-gilded-raven-exact-scope-grand-descent-camera',
    evidence:
      'exact compiler-scope alias showing the wide quartz grand-descent '
      + 'flight, paired rails, landing, and district-map finish',
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
  if (!Array.isArray(point) || point.length !== 3) return false;
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

export async function buildGildedRavenCameraPlans({ media, snapshot }) {
  const objectsById = new Map(
    media.crosswalk.objects.map((object) => [object.objectId, object]),
  );
  const plans = [];
  for (const [shotId, binding] of Object.entries(
    GILDED_RAVEN_CAMERA_BINDINGS,
  )) {
    const owner = objectsById.get(binding.primaryFeatureId);
    if (!owner) throw new Error(`${shotId}: exact Gilded Raven object missing`);
    const eyeInside = pointInsideBounds(binding.eye, owner.bounds);
    const lookAtInside = pointInsideBounds(binding.lookAt, owner.bounds);
    const exterior = binding.eyeDisposition
      === 'reviewed-exterior-facade-standoff';
    if (!lookAtInside || (!exterior && !eyeInside)) {
      throw new Error(`${shotId}: reviewed camera violates exact bounds`);
    }
    const eye = await blockAt(snapshot, binding.eye);
    const target = await blockAt(snapshot, binding.lookAt);
    if (!isCameraEyeClear(eye.name)) {
      throw new Error(
        `${shotId}: reviewed eye is occupied by ${eye.name}`,
      );
    }
    const sightVector = direction(binding.eye, binding.lookAt);
    const blockNameAt = async (point) => (
      await blockAt(snapshot, point)
    ).name;
    const fullSight = await clearSightDistance({
      eye: binding.eye,
      direction: sightVector.vector,
      maximumDistance: C01_CAMERA_MAX_RENDER_DISTANCE,
      blockNameAt,
    });
    if (
      !fullSight.firstSurface
      || !pointInsideBounds(fullSight.firstSurface.point, owner.bounds)
    ) {
      throw new Error(
        `${shotId}: first visible surface does not bind the exact object`,
      );
    }
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
        id: binding.eyeDisposition,
        auditVolumeBoxes: [owner.bounds],
      },
      geometryContract: {
        eyeDisposition: binding.eyeDisposition,
        eyeInsideExactObject: eyeInside,
        lookAtInsideExactObject: lookAtInside,
        firstVisibleSurfaceInsideExactObject: true,
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
      'usage: node scripts/preflight_town_expansion_gilded_raven_cameras.mjs '
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
    gildedRavenCameraPreflightPath: null,
  });
  const snapshot = new AnvilSnapshot(regions);
  const plans = await buildGildedRavenCameraPlans({ media, snapshot });
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
      geometryContract: plan.geometryContract,
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
    id: 'town-expansion-gilded-raven-camera-poststate-preflight',
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
        'Gilded Raven publication object plus exact compiler-scope alias',
      disposition:
        'replace the camera-in-floor interior shot and generic scope camera '
        + 'with reviewed immutable-post geometry; retain one bounded exterior '
        + 'facade standoff whose target and first surface bind the object',
      maximumRenderDistance: C01_CAMERA_MAX_RENDER_DISTANCE,
      qualityGate: MEDIA_IMAGE_QUALITY_GATE,
      rejectedCapturePolicy:
        'retain every rejected attempt outside canonical paired output paths',
      coverageAudit: {
        cause:
          'the authored second-pass eye [-8,78,-368] is exactly on the solid '
          + 'L2 finished floor at Y=78, producing a one-color image; the '
          + 'earlier C01 and sales-office family gates did not cover this '
          + 'Gilded Raven family',
        familyShotsCovered: Object.keys(GILDED_RAVEN_CAMERA_BINDINGS),
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
      allFramingTargetsBoundToExactObjects: results.every(
        (result) => result.geometryContract?.lookAtInsideExactObject === true,
      ),
      allFirstVisibleSurfacesInsideExactObjects: results.every(
        (result) => (
          result.geometryContract
            ?.firstVisibleSurfaceInsideExactObject === true
        ),
      ),
      allQualityGatesPass: results.every(
        (result) => result.quality?.status === 'PASS',
      ),
      allGeometryContractsSatisfied: results.every((result) => (
        result.geometryContract?.eyeInsideExactObject === true
        || result.geometryContract?.eyeDisposition
          === 'reviewed-exterior-facade-standoff'
      )),
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
