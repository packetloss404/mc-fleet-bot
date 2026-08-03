#!/usr/bin/env node
/**
 * Resolve and render every authored C01 camera against an immutable post-state
 * Anvil snapshot before the combined evidence renderer is allowed to run.
 *
 * This is offline and read-only with respect to Minecraft. Candidate images
 * are written outside the canonical pass-1/pass-2 output paths so rejected
 * geometry is retained as evidence and never overwrites an accepted capture.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath, pathToFileURL } from 'url';

import { AnvilSnapshot } from './generate_picket_fence.mjs';
import {
  buildMediaPackage,
  C01_REPRESENTATIVE_CAMERA_BY_OBJECT,
} from './generate_town_expansion_media_manifest.mjs';
import {
  MEDIA_IMAGE_QUALITY_GATE,
  measureMediaImageQuality,
} from './lib/media_image_quality.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_REPORT =
  'data/buildops/town-expansion-r1-2026-07-28.report.json';
const DEFAULT_DATABASE = 'data/world-map.db';
const DEFAULT_SCHEDULE =
  'docs/redevelopment/2026-07-28-town-expansion/'
  + 'c01-bunker-classification-manifest.json';
const DEFAULT_REGIONS =
  'data/worldsnap-town-terminal-recovery-post-20260728T1839Z/region';
const DEFAULT_OUT =
  'data/world-review/town-expansion-c01-camera-preflight-20260728.json';
const DEFAULT_IMAGE_DIRECTORY =
  'data/exports/town-expansion-media-2026-07-28/c01-camera-preflight';
const PRIOR_REJECTED_TUNNEL_CAPTURE =
  'data/exports/town-expansion-media-2026-07-28/rejected-captures/'
  + 'OBJECT-c01_owner_tunnel_detour-PASS-1-raw-75e51427f2c4.png';
const PRIOR_REJECTED_TUNNEL_METADATA =
  'data/exports/town-expansion-media-2026-07-28/rejected-captures/'
  + 'OBJECT-c01_owner_tunnel_detour-PASS-1-raw-75e51427f2c4.json';
export const C01_CAMERA_MAX_RENDER_DISTANCE = 128;
export const C01_CAMERA_MINIMUM_CLEAR_SIGHT_DISTANCE = 0.75;

export const C01_OBJECT_REPRESENTATIVE_CAMERAS =
  C01_REPRESENTATIVE_CAMERA_BY_OBJECT;

const REVIEWED_OBJECT_CAMERA_SEEDS = Object.freeze({
  c01_owner_tunnel_detour: {
    cameraId: 'CAM-owner-tunnel-detour-refuge-01',
    eye: [399, -42.38, 42],
    directionTarget: [414, -42.38, 33],
    basis:
      'reviewed-owner-tunnel-refuge-and-five-wide-route-camera',
    evidence:
      'widened refuge-room floor, five-wide route, sealed ceiling, '
      + 'and repeated ceiling lighting',
  },
});

const REVIEWED_CAMERA_SEEDS = Object.freeze({
  'CAM-l2-adult-private-01': {
    eye: [790, 36.62, -38],
    directionTarget: [793.83, 36.62, -32.25],
    basis: 'reviewed-authored-room-camera-clear-eye-inset',
  },
  'CAM-l4-command-center': {
    eye: [730, 16.62, -62],
    directionTarget: [745, 16.62, -50],
    basis: 'reviewed-command-room-context-camera',
  },
  'CAM-l5-power-plant': {
    eye: [730, 7.62, -62],
    directionTarget: [750, 7.62, -50],
    basis: 'reviewed-power-room-context-camera',
  },
});

function parseArgs(argv) {
  const options = {
    report: DEFAULT_REPORT,
    database: DEFAULT_DATABASE,
    schedule: DEFAULT_SCHEDULE,
    regions: DEFAULT_REGIONS,
    out: DEFAULT_OUT,
    imageDirectory: DEFAULT_IMAGE_DIRECTORY,
    concurrency: Math.max(
      1,
      Number.parseInt(
        process.env.C01_CAMERA_PREFLIGHT_CONCURRENCY ?? '4',
        10,
      ) || 4,
    ),
    maxCandidates: 16,
    resume: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--report') options.report = argv[++index];
    else if (argument === '--database') options.database = argv[++index];
    else if (argument === '--schedule') options.schedule = argv[++index];
    else if (argument === '--regions') options.regions = argv[++index];
    else if (argument === '--out') options.out = argv[++index];
    else if (argument === '--image-dir') {
      options.imageDirectory = argv[++index];
    } else if (argument === '--concurrency') {
      options.concurrency = Math.max(1, Number.parseInt(argv[++index], 10));
    } else if (argument === '--max-candidates') {
      options.maxCandidates = Math.max(1, Number.parseInt(argv[++index], 10));
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

function rejectedTunnelEvidence() {
  const capture = path.resolve(ROOT, PRIOR_REJECTED_TUNNEL_CAPTURE);
  const metadata = path.resolve(ROOT, PRIOR_REJECTED_TUNNEL_METADATA);
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
    rejectedMetrics: record.quality ?? record.metrics ?? null,
  };
}

function normalizeBounds(bounds) {
  return [
    Math.min(bounds[0], bounds[3]),
    Math.min(bounds[1], bounds[4]),
    Math.min(bounds[2], bounds[5]),
    Math.max(bounds[0], bounds[3]),
    Math.max(bounds[1], bounds[4]),
    Math.max(bounds[2], bounds[5]),
  ];
}

function pointInsideBounds(point, rawBounds) {
  const bounds = normalizeBounds(rawBounds);
  return (
    point[0] >= bounds[0] && point[0] <= bounds[3]
    && point[1] >= bounds[1] && point[1] <= bounds[4]
    && point[2] >= bounds[2] && point[2] <= bounds[5]
  );
}

function pointInsideAnyBounds(point, boxes) {
  return boxes.some((bounds) => pointInsideBounds(point, bounds));
}

function roundPoint(point) {
  return point.map((coordinate) => Number(coordinate.toFixed(2)));
}

function vector(from, to) {
  const result = to.map((coordinate, index) => coordinate - from[index]);
  const length = Math.hypot(...result);
  if (!(length > 0)) throw new Error('camera direction must be non-zero');
  return {
    direction: result.map((coordinate) => coordinate / length),
    length,
  };
}

function rotateHorizontal(direction, degrees) {
  const radians = degrees * Math.PI / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const rotated = [
    direction[0] * cosine - direction[2] * sine,
    direction[1],
    direction[0] * sine + direction[2] * cosine,
  ];
  const length = Math.hypot(...rotated);
  return rotated.map((coordinate) => coordinate / length);
}

export function isCameraEyeClear(blockName) {
  return /^minecraft:(air|cave_air|void_air|light|barrier|structure_void|moving_piston)$/
    .test(blockName);
}

export function isCameraRayTransparent(blockName) {
  return isCameraEyeClear(blockName)
    || /glass|water|ice$|leaves|vine|fence|pane|torch|rail|grass$|fern|flower|snow$|carpet|sign|button|pressure|lily|bars|chain|sapling|wheat|kelp|seagrass|petal|amethyst_cluster/
      .test(blockName);
}

function horizontalOffsets(maximumRadius = 12) {
  const offsets = [];
  for (let radius = 0; radius <= maximumRadius; radius += 1) {
    for (let x = -radius; x <= radius; x += 1) {
      for (let z = -radius; z <= radius; z += 1) {
        if (Math.max(Math.abs(x), Math.abs(z)) === radius) {
          offsets.push([x, z]);
        }
      }
    }
  }
  return offsets;
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

export async function clearSightDistance({
  eye,
  direction,
  maximumDistance,
  blockNameAt,
  step = 0.05,
}) {
  const visited = new Set();
  for (let distance = step; distance <= maximumDistance; distance += step) {
    const point = eye.map(
      (coordinate, index) => coordinate + direction[index] * distance,
    );
    const cell = point.map(Math.floor);
    const key = cell.join(',');
    if (visited.has(key)) continue;
    visited.add(key);
    const blockName = await blockNameAt(point);
    if (!isCameraRayTransparent(blockName)) {
      return {
        distance: Number(distance.toFixed(3)),
        firstSurface: { point: cell, blockName },
      };
    }
  }
  return {
    distance: maximumDistance,
    firstSurface: null,
  };
}

function cameraLevel(schedule, originalEye, cameraId) {
  const levels = schedule.levels.filter((level) =>
    pointInsideAnyBounds(originalEye, level.auditVolumeBoxes ?? []));
  if (levels.length !== 1) {
    throw new Error(
      `${cameraId}: expected one source audit level, found `
      + `${levels.map((level) => level.id).join(',') || 'none'}`,
    );
  }
  return levels[0];
}

function candidateScore(candidate) {
  if (candidate.reviewedSeed) return -100_000;
  const [x, y, z] = candidate.offset;
  return (
    Math.hypot(x, z) * 10
    + Math.abs(y) * 14
    + Math.abs(candidate.yawOffsetDegrees) * 0.25
    - Math.min(candidate.clearSightDistance, 12)
  );
}

export async function resolveC01CameraCandidates({
  cameraId,
  originalEye,
  originalLookAt,
  exactObjectBounds,
  levelAuditVolumeBoxes,
  blockNameAt,
  reviewedSeed = null,
  maximumCandidates = 16,
}) {
  const sourceDirection = vector(originalEye, originalLookAt);
  const seeds = [];
  if (reviewedSeed) {
    const reviewedDirection = vector(
      reviewedSeed.eye,
      reviewedSeed.directionTarget,
    );
    seeds.push({
      eye: reviewedSeed.eye,
      direction: reviewedDirection.direction,
      authoredDirectionLength: reviewedDirection.length,
      offset: roundPoint(reviewedSeed.eye.map(
        (coordinate, index) => coordinate - originalEye[index],
      )),
      yawOffsetDegrees: 0,
      reviewedSeed: reviewedSeed.basis,
    });
  }
  const yawOffsets = [0, -20, 20, -40, 40, -65, 65, -90, 90, 180];
  for (const [x, z] of horizontalOffsets()) {
    for (const y of [0, 1, -1, 2, -2, 3, -3]) {
      const eye = roundPoint([
        originalEye[0] + x,
        originalEye[1] + y,
        originalEye[2] + z,
      ]);
      for (const yawOffsetDegrees of yawOffsets) {
        seeds.push({
          eye,
          direction: rotateHorizontal(
            sourceDirection.direction,
            yawOffsetDegrees,
          ),
          authoredDirectionLength: sourceDirection.length,
          offset: [x, y, z],
          yawOffsetDegrees,
          reviewedSeed: null,
        });
      }
    }
  }

  const candidates = [];
  const seen = new Set();
  for (const seed of seeds) {
    const key = [
      ...seed.eye,
      ...seed.direction.map((value) => value.toFixed(5)),
    ].join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    if (
      !pointInsideBounds(seed.eye, exactObjectBounds)
      || !pointInsideAnyBounds(seed.eye, levelAuditVolumeBoxes)
    ) continue;
    const eyeBlock = await blockNameAt(seed.eye);
    if (!isCameraEyeClear(eyeBlock)) continue;
    const maximumSightDistance = Math.min(
      C01_CAMERA_MAX_RENDER_DISTANCE,
      Math.max(12, seed.authoredDirectionLength),
    );
    const sight = await clearSightDistance({
      eye: seed.eye,
      direction: seed.direction,
      maximumDistance: maximumSightDistance,
      blockNameAt,
    });
    if (
      sight.distance
      < C01_CAMERA_MINIMUM_CLEAR_SIGHT_DISTANCE + 0.1
    ) continue;
    const lookDistance = Math.min(
      12,
      seed.authoredDirectionLength,
      sight.distance - 0.1,
    );
    if (lookDistance < C01_CAMERA_MINIMUM_CLEAR_SIGHT_DISTANCE) continue;
    const lookAt = roundPoint(seed.eye.map(
      (coordinate, index) =>
        coordinate + seed.direction[index] * lookDistance,
    ));
    if (
      !pointInsideBounds(lookAt, exactObjectBounds)
      || !pointInsideAnyBounds(lookAt, levelAuditVolumeBoxes)
    ) continue;
    const lookAtBlock = await blockNameAt(lookAt);
    if (!isCameraRayTransparent(lookAtBlock)) continue;
    const exactLookSight = await clearSightDistance({
      eye: seed.eye,
      direction: seed.direction,
      maximumDistance: lookDistance,
      blockNameAt,
    });
    if (exactLookSight.firstSurface) continue;
    candidates.push({
      cameraId,
      eye: seed.eye,
      lookAt,
      fov: 70,
      maxDistance: C01_CAMERA_MAX_RENDER_DISTANCE,
      offset: seed.offset,
      yawOffsetDegrees: seed.yawOffsetDegrees,
      reviewedSeed: seed.reviewedSeed,
      eyeBlock,
      lookAtBlock,
      lookDistance: Number(lookDistance.toFixed(3)),
      clearSightDistance: sight.distance,
      firstVisibleSurface: sight.firstSurface,
      sourceDirectionPreserved: seed.yawOffsetDegrees === 0,
    });
    if (candidates.length >= maximumCandidates * 4) break;
  }
  return candidates
    .sort((left, right) => candidateScore(left) - candidateScore(right))
    .slice(0, maximumCandidates);
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function runRenderer({
  regions,
  output,
  candidate,
  width,
  height,
}) {
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const arguments_ = [
    path.join(ROOT, 'scripts', 'world_render.mjs'),
    '--regions', regions,
    '--mode', 'persp',
    '--eye', candidate.eye.join(','),
    '--look', candidate.lookAt.join(','),
    '--fov', String(candidate.fov),
    '--dist', String(candidate.maxDistance),
    '--w', String(width),
    '--h', String(height),
    '--out', output,
  ];
  const child = spawn(process.execPath, arguments_, {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  const status = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
  });
  return { status, stdout, stderr };
}

export async function renderCameraPreflight({
  plan,
  regions,
  imageDirectory,
  width,
  height,
  resume,
}) {
  const attempts = [];
  const acceptedOutput = path.join(
    imageDirectory,
    'accepted',
    `${slug(plan.cameraId)}.png`,
  );
  const firstAttemptOutput = path.join(
    imageDirectory,
    'attempts',
    `${slug(plan.cameraId)}-candidate-01.png`,
  );
  if (
    resume
    && fs.existsSync(acceptedOutput)
    && fs.existsSync(firstAttemptOutput)
    && sha256File(acceptedOutput) === sha256File(firstAttemptOutput)
  ) {
    const bytes = fs.readFileSync(acceptedOutput);
    const quality = await measureMediaImageQuality(acceptedOutput);
    if (!quality.nonBlank) {
      throw new Error(
        `${plan.cameraId}: resumed accepted image no longer passes quality`,
      );
    }
    const candidate = plan.candidates[0];
    return {
      cameraId: plan.cameraId,
      status: 'PASS',
      resumed: true,
      source: plan.source,
      owner: plan.owner,
      level: plan.level,
      camera: candidate,
      occupancy: {
        status: 'PASS',
        eyeCell: candidate.eye.map(Math.floor),
        eyeBlock: candidate.eyeBlock,
      },
      lineOfSight: {
        status: 'PASS',
        lookAtCell: candidate.lookAt.map(Math.floor),
        lookAtBlock: candidate.lookAtBlock,
        lookDistance: candidate.lookDistance,
        clearSightDistance: candidate.clearSightDistance,
        firstVisibleSurface: candidate.firstVisibleSurface,
      },
      quality: {
        status: 'PASS',
        gate: MEDIA_IMAGE_QUALITY_GATE,
        metrics: quality,
      },
      acceptedImage: {
        path: relativeRoot(acceptedOutput),
        bytes: bytes.length,
        sha256: sha256(bytes),
      },
      attempts: [{
        candidateIndex: 0,
        camera: candidate,
        status: 'PASS_RESUMED',
        output: relativeRoot(firstAttemptOutput),
        bytes: bytes.length,
        sha256: sha256(bytes),
        quality,
      }],
    };
  }
  for (
    let candidateIndex = 0;
    candidateIndex < plan.candidates.length;
    candidateIndex += 1
  ) {
    const candidate = plan.candidates[candidateIndex];
    const stem = `${slug(plan.cameraId)}-candidate-${String(
      candidateIndex + 1,
    ).padStart(2, '0')}`;
    const output = path.join(imageDirectory, 'attempts', `${stem}.png`);
    const render = await runRenderer({
      regions,
      output,
      candidate,
      width,
      height,
    });
    if (render.status !== 0 || !fs.existsSync(output)) {
      attempts.push({
        candidateIndex,
        camera: candidate,
        status: 'RENDER_FAILED',
        rendererStatus: render.status,
        stderr: render.stderr.slice(-4000),
      });
      continue;
    }
    const bytes = fs.readFileSync(output);
    const quality = await measureMediaImageQuality(output);
    const attempt = {
      candidateIndex,
      camera: candidate,
      status: quality.nonBlank
        ? 'PASS'
        : 'REJECTED_LOW_INFORMATION_CAPTURE',
      rendererStatus: render.status,
      output: relativeRoot(output),
      bytes: bytes.length,
      sha256: sha256(bytes),
      quality,
    };
    attempts.push(attempt);
    if (!quality.nonBlank) continue;
    fs.mkdirSync(path.dirname(acceptedOutput), { recursive: true });
    fs.copyFileSync(output, acceptedOutput);
    return {
      cameraId: plan.cameraId,
      status: 'PASS',
      source: plan.source,
      owner: plan.owner,
      level: plan.level,
      camera: candidate,
      occupancy: {
        status: 'PASS',
        eyeCell: candidate.eye.map(Math.floor),
        eyeBlock: candidate.eyeBlock,
      },
      lineOfSight: {
        status: 'PASS',
        lookAtCell: candidate.lookAt.map(Math.floor),
        lookAtBlock: candidate.lookAtBlock,
        lookDistance: candidate.lookDistance,
        clearSightDistance: candidate.clearSightDistance,
        firstVisibleSurface: candidate.firstVisibleSurface,
      },
      quality: {
        status: 'PASS',
        gate: MEDIA_IMAGE_QUALITY_GATE,
        metrics: quality,
      },
      acceptedImage: {
        path: relativeRoot(acceptedOutput),
        bytes: bytes.length,
        sha256: sha256(bytes),
      },
      attempts,
    };
  }
  return {
    cameraId: plan.cameraId,
    status: 'FAIL',
    source: plan.source,
    owner: plan.owner,
    level: plan.level,
    failures: ['no candidate passed occupancy, line-of-sight, and quality'],
    attempts,
  };
}

export async function buildC01CameraPlans({
  schedule,
  media,
  snapshot,
  maximumCandidates = 16,
}) {
  const sourceById = new Map(
    schedule.evidenceCameras.map((camera, index) => [
      camera.id,
      { camera, index },
    ]),
  );
  const objectsById = new Map(
    media.crosswalk.objects.map((object) => [object.objectId, object]),
  );
  const scheduleCameras = media.pass1.cameras.filter(
    (camera) => camera.id.startsWith('SCHEDULE-CAM-'),
  );
  if (scheduleCameras.length !== schedule.evidenceCameras.length) {
    throw new Error(
      `media has ${scheduleCameras.length} C01 schedule cameras; `
      + `source has ${schedule.evidenceCameras.length}`,
    );
  }
  const plans = [];
  for (const manifestCamera of scheduleCameras) {
    const cameraId = manifestCamera.shotId.replace(/^SCHEDULE-/, '');
    const source = sourceById.get(cameraId);
    if (!source) throw new Error(`${cameraId}: source camera missing`);
    const owner = objectsById.get(manifestCamera.primaryFeatureId);
    if (!owner) throw new Error(`${cameraId}: exact owner missing`);
    const level = cameraLevel(schedule, manifestCamera.eye, cameraId);
    const blockNameAt = async (point) => (
      await blockAt(snapshot, point)
    ).name;
    const candidates = await resolveC01CameraCandidates({
      cameraId,
      originalEye: manifestCamera.eye,
      originalLookAt: manifestCamera.lookAt,
      exactObjectBounds: owner.bounds,
      levelAuditVolumeBoxes: level.auditVolumeBoxes,
      blockNameAt,
      reviewedSeed: REVIEWED_CAMERA_SEEDS[cameraId] ?? null,
      maximumCandidates,
    });
    if (candidates.length === 0) {
      throw new Error(`${cameraId}: no clear camera geometry candidates`);
    }
    plans.push({
      cameraId,
      source: {
        file: DEFAULT_SCHEDULE,
        jsonPointer: `/evidenceCameras/${source.index}`,
        authoredPosition: source.camera.position,
        authoredTarget: source.camera.target,
        transformedEye: manifestCamera.eye,
        transformedLookAt: manifestCamera.lookAt,
      },
      owner: {
        objectId: owner.objectId,
        bounds: owner.bounds,
      },
      level: {
        id: level.id,
        auditVolumeBoxes: level.auditVolumeBoxes,
      },
      candidates,
    });
  }
  return plans.sort((left, right) =>
    left.cameraId.localeCompare(right.cameraId));
}

export async function buildC01ObjectCameraPlans({
  media,
  snapshot,
}) {
  const objectsById = new Map(
    media.crosswalk.objects.map((object) => [object.objectId, object]),
  );
  const plans = [];
  for (const [objectId, seed] of Object.entries(
    REVIEWED_OBJECT_CAMERA_SEEDS,
  )) {
    const owner = objectsById.get(objectId);
    if (!owner) throw new Error(`${objectId}: exact object missing`);
    if (
      !pointInsideBounds(seed.eye, owner.bounds)
      || !pointInsideBounds(seed.directionTarget, owner.bounds)
    ) {
      throw new Error(`${objectId}: reviewed camera exits exact bounds`);
    }
    const eye = await blockAt(snapshot, seed.eye);
    const target = await blockAt(snapshot, seed.directionTarget);
    if (!isCameraEyeClear(eye.name)) {
      throw new Error(
        `${objectId}: reviewed eye is occupied by ${eye.name}`,
      );
    }
    if (!isCameraRayTransparent(target.name)) {
      throw new Error(
        `${objectId}: reviewed look target is opaque ${target.name}`,
      );
    }
    const sightVector = vector(seed.eye, seed.directionTarget);
    const blockNameAt = async (point) => (
      await blockAt(snapshot, point)
    ).name;
    const exactLookSight = await clearSightDistance({
      eye: seed.eye,
      direction: sightVector.direction,
      maximumDistance: sightVector.length,
      blockNameAt,
    });
    if (exactLookSight.firstSurface) {
      throw new Error(
        `${objectId}: reviewed line of sight intersects `
        + `${exactLookSight.firstSurface.blockName} at `
        + exactLookSight.firstSurface.point.join(','),
      );
    }
    const fullSight = await clearSightDistance({
      eye: seed.eye,
      direction: sightVector.direction,
      maximumDistance: C01_CAMERA_MAX_RENDER_DISTANCE,
      blockNameAt,
    });
    plans.push({
      cameraId: seed.cameraId,
      objectId,
      source: {
        file: owner.provenance.file,
        jsonPointer: owner.provenance.jsonPointer,
        reviewedGeometry: seed.evidence,
      },
      owner: {
        objectId,
        bounds: owner.bounds,
      },
      level: {
        id: 'C01-OWNER-TUNNEL-DETOUR',
        auditVolumeBoxes: [owner.bounds],
      },
      candidates: [{
        cameraId: seed.cameraId,
        eye: seed.eye,
        lookAt: seed.directionTarget,
        fov: 70,
        maxDistance: C01_CAMERA_MAX_RENDER_DISTANCE,
        offset: [0, 0, 0],
        yawOffsetDegrees: 0,
        reviewedSeed: seed.basis,
        eyeBlock: eye.name,
        lookAtBlock: target.name,
        lookDistance: Number(sightVector.length.toFixed(3)),
        clearSightDistance: fullSight.distance,
        firstVisibleSurface: fullSight.firstSurface,
        sourceDirectionPreserved: true,
      }],
    });
  }
  return plans;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(
      'usage: node scripts/preflight_town_expansion_c01_cameras.mjs '
      + '--regions <immutable-post-region-dir> [--out <json>] '
      + '[--image-dir <dir>] [--concurrency <n>]\n',
    );
    return;
  }
  const reportPath = path.resolve(ROOT, options.report);
  const databasePath = path.resolve(ROOT, options.database);
  const schedulePath = path.resolve(ROOT, options.schedule);
  const regions = path.resolve(ROOT, options.regions);
  const outputPath = path.resolve(ROOT, options.out);
  const imageDirectory = path.resolve(ROOT, options.imageDirectory);
  if (!fs.existsSync(regions)) {
    throw new Error(`immutable post snapshot missing: ${regions}`);
  }
  const reportSource = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const schedule = JSON.parse(fs.readFileSync(schedulePath, 'utf8'));
  const media = buildMediaPackage({
    report: reportSource,
    reportPath,
    databasePath,
  });
  const snapshot = new AnvilSnapshot(regions);
  const plans = await buildC01CameraPlans({
    schedule,
    media,
    snapshot,
    maximumCandidates: options.maxCandidates,
  });
  const objectSpecificPlans = await buildC01ObjectCameraPlans({
    media,
    snapshot,
  });
  fs.mkdirSync(imageDirectory, { recursive: true });
  let cursor = 0;
  const cameraResults = new Array(plans.length);
  await Promise.all(Array.from(
    { length: Math.min(options.concurrency, plans.length) },
    async () => {
      while (cursor < plans.length) {
        const index = cursor;
        cursor += 1;
        const result = await renderCameraPreflight({
          plan: plans[index],
          regions,
          imageDirectory,
          width: 1280,
          height: 720,
          resume: options.resume,
        });
        cameraResults[index] = result;
        process.stdout.write(
          `${String(index + 1).padStart(3, '0')}/${plans.length} `
          + `${result.cameraId}: ${result.status}`
          + `${result.status === 'PASS'
            ? ` colors=${result.quality.metrics.quantizedColorCount}`
            : ''}\n`,
        );
      }
    },
  ));
  const objectSpecificResults = [];
  for (const plan of objectSpecificPlans) {
    const result = await renderCameraPreflight({
      plan,
      regions,
      imageDirectory,
      width: 1280,
      height: 720,
      resume: options.resume,
    });
    objectSpecificResults.push({
      ...result,
      objectId: plan.objectId,
      coverageBasis: 'reviewed-object-specific-camera',
    });
    process.stdout.write(
      `object ${plan.objectId} ${result.cameraId}: ${result.status}`
      + `${result.status === 'PASS'
        ? ` colors=${result.quality.metrics.quantizedColorCount}`
        : ''}\n`,
    );
  }
  const acceptedById = new Map(
    cameraResults
      .filter((result) => result.status === 'PASS')
      .map((result) => [result.cameraId, result]),
  );
  const objectSpecificById = new Map(
    objectSpecificResults.map((result) => [result.cameraId, result]),
  );
  const objectCameraResults = Object.entries(
    C01_OBJECT_REPRESENTATIVE_CAMERAS,
  ).map(([objectId, cameraId], objectCameraIndex) => {
    const scheduleResult = acceptedById.get(cameraId);
    const objectSpecificResult = objectSpecificById.get(cameraId);
    const result = scheduleResult ?? objectSpecificResult;
    if (!result) {
      return {
        objectCameraIndex,
        objectId,
        cameraId,
        coverageBasis: objectSpecificResult
          ? 'reviewed-object-specific-camera'
          : 'schedule-camera-reuse',
        status: 'FAIL',
        failures: ['representative camera did not pass preflight'],
      };
    }
    return {
      ...result,
      objectCameraIndex,
      objectId,
      coverageBasis: scheduleResult
        ? 'schedule-camera-reuse'
        : 'reviewed-object-specific-camera',
    };
  });
  const scheduleFailures = cameraResults.filter(
    (result) => result.status !== 'PASS',
  );
  const objectFailures = objectCameraResults.filter(
    (result) => result.status !== 'PASS',
  );
  const failures = [...scheduleFailures, ...objectFailures];
  const representativeObjectCameras = Object.fromEntries(
    objectCameraResults.map(
      (result) => {
        const { objectId, cameraId } = result;
        return [objectId, {
          cameraId,
          status: result.status,
          coverageBasis: result.coverageBasis,
          eye: result.camera?.eye ?? null,
          lookAt: result.camera?.lookAt ?? null,
          acceptedImage: result.acceptedImage ?? null,
        }];
      },
    ),
  );
  const allRenderedResults = [
    ...cameraResults,
    ...objectSpecificResults,
  ];
  const output = {
    schemaVersion: 2,
    id: 'town-expansion-c01-authored-camera-poststate-preflight',
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    generatedAtUtc: new Date().toISOString(),
    liveWorldMutated: false,
    source: {
      schedule: {
        path: relativeRoot(schedulePath),
        sha256: sha256File(schedulePath),
        cameraCount: schedule.evidenceCameras.length,
      },
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
      sourceCoordinateConvention: 'authored-floor-or-foot-reference',
      initialEyeTransform: {
        axis: 'y',
        operation: 'add',
        blocks: 1.62,
      },
      occupiedEyeDisposition:
        'relocate to the nearest clear point within the same exact object '
        + 'and C01 level; reviewed room seeds take precedence',
      lineOfSight:
        'preserve the authored direction when possible and bind lookAt to a '
        + 'clear point before the first visible surface',
      minimumClearSightDistance:
        C01_CAMERA_MINIMUM_CLEAR_SIGHT_DISTANCE,
      maximumRenderDistance: C01_CAMERA_MAX_RENDER_DISTANCE,
      qualityGate: MEDIA_IMAGE_QUALITY_GATE,
      rejectedCapturePolicy:
        'retain every rejected attempt outside canonical paired output paths',
      coverageAudit: {
        priorCoverage:
          '165 authored schedule cameras plus five L1-L5 object aliases',
        missedObjects: [
          'c01_owner_club_arrival',
          'c01_owner_residence',
          'c01_owner_tunnel_detour',
        ],
        cause:
          'the prior object-level gate reused only five schedule cameras; '
          + 'the remaining three object shots retained generic bounding-box '
          + 'cameras that were never rendered by this preflight',
        preservedRejectedTunnelEvidence: rejectedTunnelEvidence(),
        remediation:
          'bind all eight C01 object shots to verified interior geometry; '
          + 'reuse exact-owner schedule cameras for seven objects and render '
          + 'one reviewed tunnel-refuge camera independently',
      },
    },
    counts: {
      scheduledCameras: plans.length,
      passedCameras: cameraResults.length - scheduleFailures.length,
      failedCameras: scheduleFailures.length,
      objectCameras: objectCameraResults.length,
      passedObjectCameras:
        objectCameraResults.length - objectFailures.length,
      failedObjectCameras: objectFailures.length,
      scheduleCameraObjectReuses: objectCameraResults.filter(
        (result) => result.coverageBasis === 'schedule-camera-reuse',
      ).length,
      independentlyRenderedObjectCameras: objectCameraResults.filter(
        (result) =>
          result.coverageBasis === 'reviewed-object-specific-camera',
      ).length,
      reviewedRepresentativeObjects: Object.keys(
        representativeObjectCameras,
      ).length,
      resumedCameras: cameraResults.filter(
        (result) => result.resumed === true,
      ).length,
      totalRenderAttempts: allRenderedResults.reduce(
        (count, result) => count + result.attempts.length,
        0,
      ),
      rejectedRenderAttempts: allRenderedResults.reduce(
        (count, result) => count + result.attempts.filter(
          (attempt) =>
            attempt.status === 'REJECTED_LOW_INFORMATION_CAPTURE',
        ).length,
        0,
      ),
      failedRenderAttempts: allRenderedResults.reduce(
        (count, result) => count + result.attempts.filter(
          (attempt) => attempt.status === 'RENDER_FAILED',
        ).length,
        0,
      ),
    },
    representativeObjectCameras,
    checks: {
      exactCameraCount:
        plans.length === schedule.evidenceCameras.length
        && plans.length === 165,
      exactC01ObjectCameraCount:
        objectCameraResults.length
          === Object.keys(C01_OBJECT_REPRESENTATIVE_CAMERAS).length
        && objectCameraResults.length === 8,
      allEyesClear: cameraResults.every(
        (result) => result.occupancy?.status === 'PASS',
      ),
      allLookTargetsClear: cameraResults.every(
        (result) => result.lineOfSight?.status === 'PASS',
      ),
      allQualityGatesPass: cameraResults.every(
        (result) => result.quality?.status === 'PASS',
      ),
      allC01ObjectEyesClear: objectCameraResults.every(
        (result) => result.occupancy?.status === 'PASS',
      ),
      allC01ObjectLookTargetsClear: objectCameraResults.every(
        (result) => result.lineOfSight?.status === 'PASS',
      ),
      allC01ObjectQualityGatesPass: objectCameraResults.every(
        (result) => result.quality?.status === 'PASS',
      ),
      allEightC01ObjectCamerasPass: Object.values(
        representativeObjectCameras,
      ).every((entry) => entry.status === 'PASS'),
      allC01ObjectShotsUseVerifiedInteriorGeometry:
        objectCameraResults.every((result) => (
          pointInsideBounds(result.camera?.eye, result.owner?.bounds)
          && pointInsideBounds(result.camera?.lookAt, result.owner?.bounds)
          && (
            result.coverageBasis === 'schedule-camera-reuse'
            || result.coverageBasis
              === 'reviewed-object-specific-camera'
          )
        )),
      noCanonicalCapturePathsWritten: allRenderedResults.every(
        (result) => result.attempts.every(
          (attempt) => !String(attempt.output ?? '')
            .includes('/pass-1/')
            && !String(attempt.output ?? '').includes('/pass-2/'),
        ),
      ),
    },
    failures: failures.map((result) => ({
      objectId: result.objectId ?? null,
      cameraId: result.cameraId,
      failures: result.failures,
    })),
    cameras: cameraResults,
    objectCameras: objectCameraResults,
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  process.stdout.write(
    `${output.status}: ${output.counts.passedCameras}/`
    + `${output.counts.scheduledCameras} cameras pass; `
    + `${output.counts.passedObjectCameras}/`
    + `${output.counts.objectCameras} object cameras pass; `
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
