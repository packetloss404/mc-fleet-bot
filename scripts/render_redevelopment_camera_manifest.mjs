#!/usr/bin/env node
/**
 * Render a same-camera evidence contract from an immutable Anvil snapshot.
 * Every output is hashed and tied to the snapshot used for the render.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

import { createCanvas, loadImage } from 'canvas';

import {
  MEDIA_IMAGE_QUALITY_GATE,
  measureMediaImageQuality,
} from './lib/media_image_quality.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback = null) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const manifestPath = path.resolve(ROOT, value('--manifest', ''));
const regions = path.resolve(ROOT, value('--regions', ''));
const outputDir = path.resolve(ROOT, value('--out-dir', ''));
const reportPath = path.resolve(
  ROOT,
  value('--report', path.join(outputDir || '.', 'capture-report.json')),
);
if (!value('--manifest') || !value('--regions') || !value('--out-dir')) {
  throw new Error(
    'usage: --manifest <json> --regions <region-dir> --out-dir <dir> '
    + '[--report <json>] [--resume] '
    + '[--slice-start <zero-based-index> --slice-end <exclusive-index>]',
  );
}
const resume = args.includes('--resume');
const diagnosticContinueOnReject = args.includes(
  '--diagnostic-continue-on-reject',
);

function snapshotHash(directory) {
  const hash = crypto.createHash('sha256');
  const files = fs.readdirSync(directory).filter((name) => name.endsWith('.mca')).sort();
  let bytes = 0;
  for (const filename of files) {
    const content = fs.readFileSync(path.join(directory, filename));
    hash.update(filename);
    hash.update('\0');
    hash.update(content);
    hash.update('\0');
    bytes += content.length;
  }
  return {
    sha256: hash.digest('hex'),
    regionFileCount: files.length,
    bytes,
    algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
  };
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const sourceManifestSha256 = crypto
  .createHash('sha256')
  .update(fs.readFileSync(manifestPath))
  .digest('hex');
const renderedSnapshot = snapshotHash(regions);
const renderedSnapshotPath = path.relative(ROOT, regions)
  .split(path.sep)
  .join('/');
if (manifest.postreleaseSnapshot) {
  const expected = manifest.postreleaseSnapshot;
  if (
    expected.path !== renderedSnapshotPath
    || expected.sha256 !== renderedSnapshot.sha256
    || expected.regionFileCount !== renderedSnapshot.regionFileCount
    || expected.bytes !== renderedSnapshot.bytes
  ) {
    throw new Error(
      'render snapshot does not match manifest postreleaseSnapshot: '
      + `expected ${expected.path} ${expected.sha256}, got `
      + `${renderedSnapshotPath} ${renderedSnapshot.sha256}`,
    );
  }
}
const coordinate = (input) => {
  if (Array.isArray(input)) return input;
  if (typeof input === 'string') {
    const parsed = input.split(',').map(Number);
    if (parsed.length === 3 && parsed.every(Number.isFinite)) return parsed;
  }
  return input;
};
const cameras = Array.isArray(manifest.cameras)
  ? manifest.cameras.map((camera) => ({
      ...camera,
      eye: coordinate(camera.eye),
      lookAt: coordinate(camera.lookAt ?? camera.look),
    }))
  : (manifest.captures ?? []).map((capture) => ({
      ...capture,
      primaryFeatureId: capture.primaryFeatureId
        ?? capture.featureTargets?.find((target) => target[2] === 'exact_object')?.[1]
        ?? null,
      eye: coordinate(capture.eye),
      lookAt: coordinate(capture.lookAt ?? capture.look),
      output: path.basename(capture.afterRequired?.file ?? capture.output ?? ''),
    }));
if (cameras.length === 0) {
  throw new Error('camera manifest has no cameras or same-camera captures');
}
const onlyIds = new Set(
  (value('--only', '') ?? '').split(',').map((id) => id.trim()).filter(Boolean),
);
const parseCameraIndex = (flag, fallback) => {
  const raw = value(flag, null);
  if (raw == null) return fallback;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`${flag} must be a non-negative integer`);
  }
  return parsed;
};
const sliceStart = parseCameraIndex('--slice-start', 0);
const sliceEnd = parseCameraIndex('--slice-end', cameras.length);
const sliceRequested = (
  value('--slice-start', null) != null
  || value('--slice-end', null) != null
);
if (sliceStart > sliceEnd || sliceEnd > cameras.length) {
  throw new Error(
    `invalid camera slice [${sliceStart}, ${sliceEnd}) for ${cameras.length} cameras`,
  );
}
if (onlyIds.size > 0 && sliceRequested) {
  throw new Error('--only and camera slicing are mutually exclusive');
}
if (resume && onlyIds.size > 0) {
  throw new Error('--resume and --only are mutually exclusive');
}
if (onlyIds.size > 0) {
  const unknown = [...onlyIds].filter(
    (id) => !cameras.some((camera) => camera.id === id),
  );
  if (unknown.length > 0) {
    throw new Error(`unknown --only camera ids: ${unknown.join(', ')}`);
  }
}
const selectedCameras = sliceRequested
  ? cameras.slice(sliceStart, sliceEnd)
  : cameras;
fs.mkdirSync(outputDir, { recursive: true });
const resumeBindingPath = path.join(outputDir, '.render-binding.json');
const resumeBinding = {
  schemaVersion: 1,
  sourceManifest: path.relative(ROOT, manifestPath),
  sourceManifestSha256,
  regions: renderedSnapshotPath,
  snapshot: renderedSnapshot,
  outputDirectory: path.relative(ROOT, outputDir),
};
if (resume) {
  if (fs.existsSync(resumeBindingPath)) {
    const existingBinding = JSON.parse(
      fs.readFileSync(resumeBindingPath, 'utf8'),
    );
    if (JSON.stringify(existingBinding) !== JSON.stringify(resumeBinding)) {
      throw new Error(
        'resume binding does not match the selected manifest, snapshot, '
        + `or output directory: ${path.relative(ROOT, resumeBindingPath)}`,
      );
    }
  } else {
    const unboundOutputs = cameras.filter((camera) =>
      fs.existsSync(path.join(outputDir, camera.output)));
    if (unboundOutputs.length > 0) {
      throw new Error(
        `refusing --resume with ${unboundOutputs.length} unbound existing `
        + 'outputs; select a fresh output directory or provide its original '
        + 'render binding',
      );
    }
    fs.writeFileSync(
      resumeBindingPath,
      `${JSON.stringify(resumeBinding, null, 2)}\n`,
      { flag: 'wx' },
    );
  }
}
const captures = [];
const rejected = [];

function drawContained(context, image, bounds) {
  const scale = Math.min(bounds.width / image.width, bounds.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  const x = bounds.x + (bounds.width - width) / 2;
  const y = bounds.y + (bounds.height - height) / 2;
  context.drawImage(image, x, y, width, height);
}

async function composeEvidencePlate(filename, camera) {
  const referencePath = path.resolve(ROOT, camera.evidencePlate.referenceImage);
  if (!fs.existsSync(referencePath)) {
    throw new Error(`${camera.id}: evidence-plate reference missing: ${referencePath}`);
  }
  const perspective = await loadImage(filename);
  const reference = await loadImage(referencePath);
  const width = camera.width ?? manifest.capturePolicy?.width ?? 1280;
  const height = camera.height ?? manifest.capturePolicy?.height ?? 720;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  context.fillStyle = '#07111f';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#111f33';
  context.fillRect(0, 0, width, 76);
  context.fillStyle = '#f8fafc';
  context.font = '700 24px DejaVu Sans, sans-serif';
  context.fillText(camera.evidencePlate.title, 24, 33);
  context.fillStyle = '#93c5fd';
  context.font = '13px DejaVu Sans Mono, monospace';
  context.fillText(
    `${camera.primaryFeatureId} · ${camera.role}`,
    24,
    57,
  );
  const gap = 14;
  const contentTop = 98;
  const contentBottom = height - 48;
  const contentHeight = contentBottom - contentTop;
  const perspectiveWidth = Math.round(width * 0.67);
  const perspectiveBounds = {
    x: 20,
    y: contentTop,
    width: perspectiveWidth - 20,
    height: contentHeight,
  };
  const referenceBounds = {
    x: perspectiveWidth + gap,
    y: contentTop,
    width: width - perspectiveWidth - gap - 20,
    height: contentHeight,
  };
  context.fillStyle = '#0f172a';
  context.fillRect(
    perspectiveBounds.x,
    perspectiveBounds.y,
    perspectiveBounds.width,
    perspectiveBounds.height,
  );
  context.fillRect(
    referenceBounds.x,
    referenceBounds.y,
    referenceBounds.width,
    referenceBounds.height,
  );
  drawContained(context, perspective, perspectiveBounds);
  drawContained(context, reference, referenceBounds);
  context.strokeStyle = '#334155';
  context.lineWidth = 2;
  context.strokeRect(
    perspectiveBounds.x,
    perspectiveBounds.y,
    perspectiveBounds.width,
    perspectiveBounds.height,
  );
  context.strokeRect(
    referenceBounds.x,
    referenceBounds.y,
    referenceBounds.width,
    referenceBounds.height,
  );
  context.fillStyle = 'rgba(7,17,31,0.88)';
  context.fillRect(perspectiveBounds.x, perspectiveBounds.y, 265, 28);
  context.fillRect(referenceBounds.x, referenceBounds.y, 155, 28);
  context.fillStyle = '#cbd5e1';
  context.font = '700 11px DejaVu Sans Mono, monospace';
  context.fillText(
    'IMMUTABLE SNAPSHOT PERSPECTIVE',
    perspectiveBounds.x + 9,
    perspectiveBounds.y + 19,
  );
  context.fillText(
    'EXACT FLOOR PLAN',
    referenceBounds.x + 9,
    referenceBounds.y + 19,
  );
  context.fillStyle = '#94a3b8';
  context.font = '11px DejaVu Sans Mono, monospace';
  context.fillText(
    `snapshot ${manifest.snapshot?.sha256 ?? 'reported in capture-report.json'}`,
    24,
    height - 18,
  );
  fs.writeFileSync(filename, canvas.toBuffer('image/png'));
}

function preserveRejectedCapture(camera, output, quality, phase) {
  const bytes = fs.readFileSync(output);
  const imageSha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  const archiveDirectory = path.join(outputDir, 'rejected-captures');
  const stem = `${camera.id}-${phase}-${imageSha256.slice(0, 12)}`;
  const imagePath = path.join(archiveDirectory, `${stem}.png`);
  const metadataPath = path.join(archiveDirectory, `${stem}.json`);
  fs.mkdirSync(archiveDirectory, { recursive: true });
  if (!fs.existsSync(imagePath)) fs.copyFileSync(output, imagePath);
  if (!fs.existsSync(metadataPath)) {
    fs.writeFileSync(metadataPath, `${JSON.stringify({
      schemaVersion: 1,
      status: 'REJECTED_LOW_INFORMATION_CAPTURE',
      liveWorldMutated: false,
      phase,
      cameraId: camera.id,
      shotId: camera.shotId ?? null,
      primaryFeatureId: camera.primaryFeatureId ?? null,
      sourceManifest: path.relative(ROOT, manifestPath),
      sourceManifestSha256,
      regions: path.relative(ROOT, regions),
      snapshot: renderedSnapshot,
      camera: {
        mode: camera.mode ?? 'persp',
        eye: camera.eye ?? null,
        lookAt: camera.lookAt ?? null,
        center: camera.center ?? null,
        span: camera.span ?? null,
        fieldOfView: camera.fov
          ?? manifest.capturePolicy?.fieldOfView
          ?? null,
      },
      rejectedOutput: {
        originalPath: path.relative(ROOT, output),
        archivePath: path.relative(ROOT, imagePath),
        bytes: bytes.length,
        sha256: imageSha256,
      },
      quality,
      qualityGate: MEDIA_IMAGE_QUALITY_GATE,
      evidenceDisposition:
        'PRESERVED_REJECTED_CAPTURE_DO_NOT_USE_AS_ACCEPTED_MEDIA',
    }, null, 2)}\n`);
  }
  process.stderr.write(
    `${camera.id}: preserved rejected capture at `
    + `${path.relative(ROOT, imagePath)}\n`,
  );
}

cameraLoop:
for (const camera of selectedCameras) {
  if (!camera.id || !camera.output) throw new Error('every camera needs id and output');
  const output = path.join(outputDir, camera.output);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  let shouldRender = onlyIds.size === 0 || onlyIds.has(camera.id);
  let rawQuality = null;
  let resumedQuality = null;
  if (resume && fs.existsSync(output)) {
    const existingBytes = fs.statSync(output).size;
    if (existingBytes >= 8_000) {
      try {
        const existingQuality = await measureMediaImageQuality(output);
        if (existingQuality.nonBlank) {
          shouldRender = false;
          resumedQuality = existingQuality;
        }
      } catch {
        shouldRender = true;
      }
    }
  }
  if (shouldRender) {
    const renderArgs = [
      path.join(ROOT, 'scripts', 'world_render.mjs'),
      '--regions', regions,
      '--mode', camera.mode ?? 'persp',
      '--w', String(camera.width ?? manifest.capturePolicy?.width ?? 1280),
      '--h', String(camera.height ?? manifest.capturePolicy?.height ?? 720),
      '--out', output,
    ];
    if ((camera.mode ?? 'persp') === 'map') {
      if (!camera.center || !camera.span) throw new Error(`${camera.id}: map camera needs center/span`);
      renderArgs.push('--center', camera.center.join(','), '--span', String(camera.span));
    } else {
      if (!camera.eye || !camera.lookAt) throw new Error(`${camera.id}: camera needs eye/lookAt`);
      renderArgs.push(
        '--eye', camera.eye.join(','),
        '--look', camera.lookAt.join(','),
        '--fov', String(camera.fov ?? manifest.capturePolicy?.fieldOfView ?? 70),
      );
    }
    if (args.includes('--shadows')) renderArgs.push('--shadows', 'true');
    if (camera.maxDistance) {
      renderArgs.push('--dist', String(camera.maxDistance));
    }
    const render = spawnSync(process.execPath, renderArgs, {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
    });
    if (render.status !== 0) {
      process.stderr.write(render.stdout);
      process.stderr.write(render.stderr);
      const message = `${camera.id}: renderer exited ${render.status}`;
      if (!diagnosticContinueOnReject) throw new Error(message);
      rejected.push({
        id: camera.id,
        phase: 'renderer',
        message,
      });
      continue cameraLoop;
    }
    rawQuality = await measureMediaImageQuality(output);
    if (!rawQuality.nonBlank) {
      preserveRejectedCapture(camera, output, rawQuality, 'raw');
      const message = (
        `${camera.id}: blank/low-information raw perspective `
        + `(variance=${rawQuality.luminanceVariance}, `
        + `range=${rawQuality.luminanceRange}, `
        + `colors=${rawQuality.quantizedColorCount})`
      );
      if (!diagnosticContinueOnReject) throw new Error(message);
      rejected.push({
        id: camera.id,
        phase: 'raw',
        message,
        quality: rawQuality,
      });
      continue cameraLoop;
    }
    if (camera.evidencePlate) await composeEvidencePlate(output, camera);
  } else if (!fs.existsSync(output)) {
    throw new Error(`${camera.id}: --only reuse image is missing: ${output}`);
  }
  const bytes = fs.statSync(output).size;
  if (bytes < 8_000) throw new Error(`${camera.id}: suspiciously small image (${bytes} bytes)`);
  const quality = resumedQuality ?? await measureMediaImageQuality(output);
  if (!quality.nonBlank) {
    preserveRejectedCapture(camera, output, quality, 'composed');
    const message = (
      `${camera.id}: blank/low-information image `
      + `(variance=${quality.luminanceVariance}, `
      + `range=${quality.luminanceRange}, `
      + `colors=${quality.quantizedColorCount})`
    );
    if (!diagnosticContinueOnReject) throw new Error(message);
    rejected.push({
      id: camera.id,
      phase: 'composed',
      message,
      quality,
    });
    continue cameraLoop;
  }
  captures.push({
    id: camera.id,
    primaryFeatureId: camera.primaryFeatureId ?? null,
    role: camera.role ?? null,
    camera: {
      mode: camera.mode ?? 'persp',
      eye: camera.eye ?? null,
      lookAt: camera.lookAt ?? null,
      center: camera.center ?? null,
      span: camera.span ?? null,
      fieldOfView: (camera.mode ?? 'persp') === 'map'
        ? null
        : camera.fov ?? manifest.capturePolicy?.fieldOfView ?? null,
      maxDistance: camera.maxDistance ?? null,
    },
    output: camera.output,
    bytes,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex'),
    quality,
    rawQuality,
    evidencePlate: camera.evidencePlate ?? null,
  });
  console.log(
    `${camera.id}: ${shouldRender ? 'rendered' : 'reused'} `
    + `${path.relative(ROOT, output)} (${bytes} bytes)`,
  );
}

const report = {
  schemaVersion: 1,
  generatedAtUtc: new Date().toISOString(),
  status: rejected.length === 0 ? 'PASS' : 'FAIL_DIAGNOSTIC_REJECTIONS',
  passed: rejected.length === 0,
  sourceManifest: path.relative(ROOT, manifestPath),
  sourceManifestSha256,
  regions: path.relative(ROOT, regions),
  snapshot: renderedSnapshot,
  outputDirectory: path.relative(ROOT, outputDir),
  resume: {
    enabled: resume,
    binding: resume ? path.relative(ROOT, resumeBindingPath) : null,
  },
  cameraSelection: {
    mode: sliceRequested ? 'slice' : onlyIds.size > 0 ? 'only' : 'complete',
    start: sliceRequested ? sliceStart : 0,
    endExclusive: sliceRequested ? sliceEnd : cameras.length,
    totalManifestCameras: cameras.length,
  },
  captureCount: captures.length,
  rejectedCount: rejected.length,
  rejected,
  diagnosticContinueOnReject,
  qualityGate: MEDIA_IMAGE_QUALITY_GATE,
  captures,
};
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`report: ${path.relative(ROOT, reportPath)}`);
