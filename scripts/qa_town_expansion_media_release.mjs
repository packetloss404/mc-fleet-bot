#!/usr/bin/env node
/**
 * Final, read-only QA for the Town Expansion R1 paired media release.
 *
 * The renderer may be run only after a distinct immutable post-release
 * snapshot exists. This verifier refuses to label prerelease renders final,
 * checks every manifest/capture/file/hash pair, and emits a media report that
 * can be supplied directly to qa_town_expansion_post_release.mjs.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const MEDIA_RELEASE_CONTRACT = Object.freeze({
  requiredInputs: [
    '--manifest <combined-post-release-capture-manifest.json>',
    '--capture-report <renderer-capture-report.json>',
    '--post <immutable-postrelease-region-directory>',
    '--design-report data/buildops/town-expansion-r1-2026-07-28.report.json',
  ],
  output:
    'data/world-review/town-expansion-r1-post-release-media-2026-07-28.json',
  hardRules: [
    'post snapshot hash differs from the compiler prerelease snapshot hash',
    'renderer report binds the byte-exact combined manifest',
    'renderer report binds the supplied immutable post snapshot',
    'every stable shot has one pass-1 and one pass-2 capture',
    'paired captures use identical camera geometry',
    'paired deterministic renders have identical image hashes',
    'every capture file exists and matches its reported SHA-256',
    'the media report binds the canonical forward package SHA-256',
  ],
});

function parseArgs(argv) {
  const options = {
    designReport: 'data/buildops/town-expansion-r1-2026-07-28.report.json',
    out: 'data/world-review/'
      + 'town-expansion-r1-post-release-media-2026-07-28.json',
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--manifest') options.manifest = argv[++index];
    else if (arg === '--capture-report') options.captureReport = argv[++index];
    else if (arg === '--post') options.post = argv[++index];
    else if (arg === '--design-report') options.designReport = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--contract') options.contract = true;
    else throw new Error(`unknown argument ${arg}`);
  }
  return options;
}

function resolveRoot(filename) {
  return path.resolve(ROOT, filename);
}

function relativeRoot(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256File(filename) {
  return sha256(fs.readFileSync(filename));
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

export function hashSnapshot(directory) {
  const files = fs.readdirSync(directory)
    .filter((filename) => filename.endsWith('.mca'))
    .sort();
  if (files.length === 0) {
    throw new Error(`snapshot has no .mca files: ${directory}`);
  }
  const hash = crypto.createHash('sha256');
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
    directory: relativeRoot(directory),
    sha256: hash.digest('hex'),
    regionFileCount: files.length,
    bytes,
    algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
  };
}

function normalizedCamera(camera) {
  return {
    mode: camera.mode ?? 'persp',
    eye: camera.eye ?? null,
    lookAt: camera.lookAt ?? null,
    center: camera.center ?? null,
    span: camera.span ?? null,
    fieldOfView: camera.fov ?? camera.fieldOfView ?? null,
    maxDistance: camera.maxDistance ?? null,
  };
}

function captureCamera(capture) {
  return {
    mode: capture.camera?.mode ?? capture.mode ?? 'persp',
    eye: capture.camera?.eye ?? capture.eye ?? null,
    lookAt: capture.camera?.lookAt ?? capture.lookAt ?? null,
    center: capture.camera?.center ?? capture.center ?? null,
    span: capture.camera?.span ?? capture.span ?? null,
    fieldOfView:
      capture.camera?.fieldOfView
      ?? capture.camera?.fov
      ?? capture.fov
      ?? null,
    maxDistance:
      capture.camera?.maxDistance
      ?? capture.maxDistance
      ?? null,
  };
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function validateMediaReleaseContract({
  manifest,
  captureReport,
  crosswalk = null,
  postSnapshotSha256,
  manifestSha256,
  prereleaseSnapshotSha256,
  forwardSha256,
}) {
  const failures = [];
  const cameras = manifest.cameras ?? [];
  const captures = captureReport.captures ?? [];
  const manifestById = new Map(cameras.map((camera) => [camera.id, camera]));
  const captureById = new Map(captures.map((capture) => [capture.id, capture]));
  const captureIds = captures.map((capture) => capture.id);
  if (manifest.status !== 'POST_RELEASE_CAPTURE_PENDING') {
    failures.push('manifest-status');
  }
  if (
    !/^[a-f0-9]{64}$/.test(postSnapshotSha256)
    || postSnapshotSha256 === prereleaseSnapshotSha256
  ) {
    failures.push('post-snapshot-not-distinct');
  }
  if (captureReport.status !== 'PASS' || captureReport.passed !== true) {
    failures.push('renderer-report-not-pass');
  }
  if (captureReport.snapshot?.sha256 !== postSnapshotSha256) {
    failures.push('renderer-post-snapshot-mismatch');
  }
  if (captureReport.sourceManifestSha256 !== manifestSha256) {
    failures.push('renderer-manifest-hash-mismatch');
  }
  if (manifest.releasePackage?.forwardSha256 !== forwardSha256) {
    failures.push('manifest-forward-hash-mismatch');
  }
  if (
    cameras.length === 0
    || captures.length !== cameras.length
    || new Set(captureIds).size !== captures.length
  ) {
    failures.push('capture-cardinality');
  }
  const missingCaptures = cameras
    .filter((camera) => !captureById.has(camera.id))
    .map((camera) => camera.id);
  const unknownCaptures = captures
    .filter((capture) => !manifestById.has(capture.id))
    .map((capture) => capture.id);
  if (missingCaptures.length > 0) failures.push('missing-captures');
  if (unknownCaptures.length > 0) failures.push('unknown-captures');

  for (const capture of captures) {
    const camera = manifestById.get(capture.id);
    if (!camera) continue;
    if (!sameJson(normalizedCamera(camera), captureCamera(capture))) {
      failures.push(`camera-geometry:${capture.id}`);
    }
    if (capture.output !== camera.output) {
      failures.push(`capture-output:${capture.id}`);
    }
    if (capture.primaryFeatureId !== camera.primaryFeatureId) {
      failures.push(`capture-object:${capture.id}`);
    }
  }

  const byShot = new Map();
  for (const camera of cameras) {
    if (!camera.shotId || ![1, 2].includes(camera.evidencePass)) {
      failures.push(`camera-pair-metadata:${camera.id}`);
      continue;
    }
    if (!byShot.has(camera.shotId)) byShot.set(camera.shotId, new Map());
    const passes = byShot.get(camera.shotId);
    if (passes.has(camera.evidencePass)) {
      failures.push(`duplicate-shot-pass:${camera.shotId}:${camera.evidencePass}`);
    }
    passes.set(camera.evidencePass, camera);
  }
  const pairs = [];
  for (const [shotId, passes] of byShot) {
    const first = passes.get(1);
    const second = passes.get(2);
    if (!first || !second) {
      failures.push(`incomplete-shot-pair:${shotId}`);
      continue;
    }
    const sameCamera = sameJson(normalizedCamera(first), normalizedCamera(second));
    if (!sameCamera) failures.push(`unmatched-camera-pair:${shotId}`);
    if (first.output === second.output) {
      failures.push(`non-distinct-pair-output:${shotId}`);
    }
    const firstCapture = captureById.get(first.id);
    const secondCapture = captureById.get(second.id);
    const sameImage = (
      firstCapture
      && secondCapture
      && firstCapture.sha256 === secondCapture.sha256
    );
    if (!sameImage) failures.push(`unmatched-image-pair:${shotId}`);
    pairs.push({
      shotId,
      primaryFeatureId: first.primaryFeatureId,
      pass1CameraId: first.id,
      pass2CameraId: second.id,
      identicalCameraGeometry: sameCamera,
      identicalImageSha256: Boolean(sameImage),
      sha256: firstCapture?.sha256 ?? null,
    });
  }
  if (crosswalk) {
    const objectIds = new Set(
      (crosswalk.objects ?? []).map((object) => object.objectId),
    );
    const mapIds = new Set(
      (crosswalk.mapShots ?? []).map((shot) => shot.primaryFeatureId),
    );
    for (
      const requiredId
      of crosswalk.coverageContracts?.c01?.requiredScopeIds ?? []
    ) {
      if (!objectIds.has(requiredId)) {
        failures.push(`missing-c01-proof-object:${requiredId}`);
      }
    }
    const c01MapShotId =
      crosswalk.coverageContracts?.c01?.surfaceConcealmentMapShotId;
    if (c01MapShotId && !byShot.has(c01MapShotId)) {
      failures.push(`missing-c01-surface-map:${c01MapShotId}`);
    }
    for (const object of crosswalk.objects ?? []) {
      if (
        object.truth?.releaseState !== 'GENERATED_OFFLINE_NOT_YET_VERIFIED'
        || object.truth?.plannedOnly !== false
        || object.truth?.finalCertificationRequired !== 'VERIFIED_POST_STATE'
        || !object.truth?.physicalClaim
      ) {
        failures.push(`object-truth-contract:${object.objectId}`);
      }
      if ((object.capturePairs ?? []).length === 0) {
        failures.push(`object-without-capture-pair:${object.objectId}`);
      }
      for (const pair of object.capturePairs ?? []) {
        const passes = byShot.get(pair.shotId);
        if (
          !passes
          || passes.get(1)?.id !== pair.pass1CameraId
          || passes.get(2)?.id !== pair.pass2CameraId
        ) {
          failures.push(`crosswalk-pair-mismatch:${object.objectId}:${pair.shotId}`);
        }
      }
    }
    for (const camera of cameras) {
      if (
        !objectIds.has(camera.primaryFeatureId)
        && !mapIds.has(camera.primaryFeatureId)
      ) {
        failures.push(`orphan-camera-object:${camera.id}`);
      }
    }
  }
  return {
    passed: failures.length === 0,
    failures: [...new Set(failures)],
    counts: {
      manifestCaptures: cameras.length,
      rendererCaptures: captures.length,
      shots: byShot.size,
      completePairs: pairs.filter((pair) => (
        pair.identicalCameraGeometry && pair.identicalImageSha256
      )).length,
      missingCaptures: missingCaptures.length,
      unknownCaptures: unknownCaptures.length,
      crosswalkObjects: crosswalk?.objects?.length ?? null,
    },
    pairs,
  };
}

function resolveCaptureOutput(captureReportPath, output) {
  const fromRoot = resolveRoot(output);
  if (fs.existsSync(fromRoot)) return fromRoot;
  return path.resolve(path.dirname(captureReportPath), output);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.contract) {
    console.log(JSON.stringify(MEDIA_RELEASE_CONTRACT, null, 2));
    return;
  }
  for (const key of ['manifest', 'captureReport', 'post']) {
    if (!options[key]) throw new Error(`missing --${key.replace(/[A-Z]/g, (x) => `-${x.toLowerCase()}`)}`);
  }
  const manifestPath = resolveRoot(options.manifest);
  const captureReportPath = resolveRoot(options.captureReport);
  const postPath = resolveRoot(options.post);
  const designReportPath = resolveRoot(options.designReport);
  const outputPath = resolveRoot(options.out);
  const manifest = readJson(manifestPath);
  const captureReport = readJson(captureReportPath);
  const designReport = readJson(designReportPath);
  const crosswalkPath = path.resolve(
    path.dirname(manifestPath),
    manifest.objectCrosswalk?.path ?? manifest.objectCrosswalk,
  );
  const crosswalk = readJson(crosswalkPath);
  const postSnapshot = hashSnapshot(postPath);
  const manifestHash = sha256File(manifestPath);
  const forwardPath = resolveRoot(manifest.releasePackage?.forwardPath);
  const forwardHash = sha256File(forwardPath);
  const validation = validateMediaReleaseContract({
    manifest,
    captureReport,
    crosswalk,
    postSnapshotSha256: postSnapshot.sha256,
    manifestSha256: manifestHash,
    prereleaseSnapshotSha256: designReport.sourceSnapshot?.sha256,
    forwardSha256: forwardHash,
  });
  if (
    manifest.objectCrosswalk?.sha256
    && manifest.objectCrosswalk.sha256 !== sha256File(crosswalkPath)
  ) {
    validation.failures.push('crosswalk-hash-mismatch');
    validation.passed = false;
  }
  const designReportSha256 = sha256File(designReportPath);
  if (
    manifest.sourceReport?.sha256 !== designReportSha256
    || crosswalk.sourceReport?.sha256 !== designReportSha256
  ) {
    validation.failures.push('design-report-hash-mismatch');
    validation.passed = false;
  }
  if (
    designReport.operations?.sha256 !== forwardHash
    || crosswalk.releasePackage?.forwardSha256 !== forwardHash
  ) {
    validation.failures.push('forward-package-file-hash-mismatch');
    validation.passed = false;
  }
  if (
    manifest.prereleaseSnapshot?.sha256 !== designReport.sourceSnapshot?.sha256
    || crosswalk.prereleaseSnapshot?.sha256
      !== designReport.sourceSnapshot?.sha256
  ) {
    validation.failures.push('prerelease-source-identity-mismatch');
    validation.passed = false;
  }
  if (
    manifest.objectCrosswalk?.objectCount != null
    && manifest.objectCrosswalk.objectCount !== (crosswalk.objects?.length ?? 0)
  ) {
    validation.failures.push('crosswalk-object-count-mismatch');
    validation.passed = false;
  }

  const fileChecks = (captureReport.captures ?? []).map((capture) => {
    const output = resolveCaptureOutput(captureReportPath, capture.output);
    const exists = fs.existsSync(output);
    const actualSha256 = exists ? sha256File(output) : null;
    const passed = (
      exists
      && capture.sha256 === actualSha256
      && capture.quality?.nonBlank === true
    );
    return {
      id: capture.id,
      output: capture.output,
      exists,
      reportedSha256: capture.sha256 ?? null,
      actualSha256,
      nonBlank: capture.quality?.nonBlank === true,
      passed,
    };
  });
  const failedFiles = fileChecks.filter((entry) => !entry.passed);
  const passed = validation.passed && failedFiles.length === 0;
  const report = {
    schemaVersion: 2,
    id: 'town-expansion-r1-post-release-media',
    packageId: designReport.packageId,
    generatedAtUtc: new Date().toISOString(),
    status: passed ? 'PASS' : 'FAIL',
    passed,
    liveWorldMutated: false,
    finality: passed ? 'ACCEPTED_POST_RELEASE_MEDIA' : 'NOT_FINAL',
    acceptanceBoundary: {
      certifies:
        'post-snapshot identity, object/camera crosswalk integrity, paired '
        + 'render repeatability, file existence, non-blank quality and hashes',
      doesNotAloneCertify:
        'scope completion, route usability, C01 concealment semantics, or '
        + 'database as-built promotion',
      requiredCompanion:
        'PASS/ACCEPTED scripts/qa_town_expansion_post_release.mjs report',
    },
    sourceManifest: {
      path: relativeRoot(manifestPath),
      sha256: manifestHash,
    },
    crosswalk: {
      path: relativeRoot(crosswalkPath),
      sha256: sha256File(crosswalkPath),
      objectCount: crosswalk.objects?.length ?? 0,
    },
    rendererReport: {
      path: relativeRoot(captureReportPath),
      sha256: sha256File(captureReportPath),
    },
    designReport: {
      path: relativeRoot(designReportPath),
      sha256: designReportSha256,
    },
    forwardPackage: {
      path: relativeRoot(forwardPath),
      sha256: forwardHash,
    },
    prereleaseSnapshot: designReport.sourceSnapshot,
    postSnapshot,
    packageHashes: {
      'town-expansion-r1': {
        sha256: forwardHash,
      },
    },
    forwardSha256: forwardHash,
    validation,
    fileChecks: {
      checked: fileChecks.length,
      passed: fileChecks.length - failedFiles.length,
      failed: failedFiles.length,
      failures: failedFiles,
    },
    captures: (captureReport.captures ?? []).map((capture) => {
      const camera = (manifest.cameras ?? []).find(
        (entry) => entry.id === capture.id,
      );
      return {
        ...capture,
        shotId: camera?.shotId ?? null,
        primaryFeatureId:
          camera?.primaryFeatureId ?? capture.primaryFeatureId ?? null,
        objectId: camera?.primaryFeatureId ?? capture.primaryFeatureId ?? null,
        evidencePass: camera?.evidencePass ?? null,
        viewClass: camera?.mode ?? capture.camera?.mode ?? 'persp',
        role: camera?.role ?? capture.role ?? null,
        width: capture.quality?.width ?? camera?.width ?? null,
        height: capture.quality?.height ?? camera?.height ?? null,
        passed:
          fileChecks.find((entry) => entry.id === capture.id)?.passed === true,
      };
    }),
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    status: report.status,
    finality: report.finality,
    output: relativeRoot(outputPath),
    postSnapshotSha256: postSnapshot.sha256,
    counts: validation.counts,
    failedFiles: failedFiles.length,
    failures: validation.failures,
  }, null, 2));
  if (!passed) process.exitCode = 1;
}

if (
  process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  main();
}
