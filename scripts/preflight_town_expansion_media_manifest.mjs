#!/usr/bin/env node
/**
 * Complete static validation for the Town Expansion paired media contract.
 *
 * This reads manifests, immutable Anvil files, preflight reports, and existing
 * output identities only. It never renders, connects to Minecraft, or mutates
 * the live world.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_MANIFEST =
  'data/exports/town-expansion-media-2026-07-28/capture-manifest.json';
const DEFAULT_CROSSWALK =
  'data/exports/town-expansion-media-2026-07-28/'
  + 'object-media-database-crosswalk.json';
const DEFAULT_REGIONS =
  'data/worldsnap-town-terminal-recovery-post-20260728T1839Z/region';
const DEFAULT_OUTPUT_DIRECTORY =
  'data/exports/town-expansion-media-2026-07-28';
const DEFAULT_OUT =
  'data/world-review/'
  + 'town-expansion-media-static-preflight-20260728.json';
const DEFAULT_MEDIA_QA =
  'data/world-review/'
  + 'town-expansion-r1-post-release-media-2026-07-28.json';

function parseArgs(argv) {
  const options = {
    manifest: DEFAULT_MANIFEST,
    crosswalk: DEFAULT_CROSSWALK,
    regions: DEFAULT_REGIONS,
    outputDirectory: DEFAULT_OUTPUT_DIRECTORY,
    out: DEFAULT_OUT,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--manifest') options.manifest = argv[++index];
    else if (argument === '--crosswalk') options.crosswalk = argv[++index];
    else if (argument === '--regions') options.regions = argv[++index];
    else if (argument === '--output-dir') {
      options.outputDirectory = argv[++index];
    } else if (argument === '--out') options.out = argv[++index];
    else if (argument === '--help') options.help = true;
    else throw new Error(`unknown argument ${argument}`);
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

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
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
    path: relativeRoot(directory),
    algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
    sha256: digest.digest('hex'),
    regionFileCount: files.length,
    bytes,
  };
}

function sameSnapshot(left, right) {
  return (
    left?.path === right?.path
    && left?.sha256 === right?.sha256
    && left?.regionFileCount === right?.regionFileCount
    && left?.bytes === right?.bytes
  );
}

function sameCameraGeometry(left, right) {
  const keys = [
    'mode',
    'eye',
    'lookAt',
    'center',
    'span',
    'fov',
    'maxDistance',
    'width',
    'height',
  ];
  return keys.every(
    (key) => JSON.stringify(left[key] ?? null)
      === JSON.stringify(right[key] ?? null),
  );
}

function validPoint(point) {
  return Array.isArray(point)
    && point.length === 3
    && point.every(Number.isFinite);
}

function validMapCenter(point) {
  return Array.isArray(point)
    && point.length === 2
    && point.every(Number.isFinite);
}

function preflightIdentity(audit) {
  if (!audit) return null;
  return {
    path: audit.path ?? audit.reportPath,
    sha256: audit.sha256 ?? audit.reportSha256,
    snapshot: audit.snapshot,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(
      'usage: node scripts/preflight_town_expansion_media_manifest.mjs '
      + '--manifest <combined.json> --crosswalk <crosswalk.json> '
      + '--regions <immutable-post-region-dir> [--out <json>]\n',
    );
    return;
  }
  const manifestPath = path.resolve(ROOT, options.manifest);
  const crosswalkPath = path.resolve(ROOT, options.crosswalk);
  const regions = path.resolve(ROOT, options.regions);
  const outputDirectory = path.resolve(ROOT, options.outputDirectory);
  const outputPath = path.resolve(ROOT, options.out);
  const manifest = readJson(manifestPath);
  const crosswalk = readJson(crosswalkPath);
  const snapshot = snapshotHash(regions);
  const cameras = manifest.cameras ?? [];
  const pass1 = new Map();
  const pass2 = new Map();
  for (const camera of cameras) {
    const target = camera.evidencePass === 1 ? pass1 : pass2;
    target.set(camera.shotId, camera);
  }
  const pairedShots = [...pass1].map(([shotId, first]) => ({
    shotId,
    first,
    second: pass2.get(shotId),
  }));
  const exactObjectIds = new Set(
    (crosswalk.objects ?? []).map((object) => object.objectId),
  );
  const expectedOutputs = cameras.map((camera) => camera.output);
  const existingOutputs = cameras.filter(
    (camera) => fs.existsSync(path.join(outputDirectory, camera.output)),
  );
  const missingOutputs = cameras.filter(
    (camera) => !fs.existsSync(path.join(outputDirectory, camera.output)),
  );
  const manifestSha256 = sha256File(manifestPath);
  const captureReportPath = path.join(
    outputDirectory,
    'capture-report.json',
  );
  const captureReportExists = fs.existsSync(captureReportPath);
  const captureReport = captureReportExists
    ? readJson(captureReportPath)
    : null;
  const captureReportCaptures = captureReport?.captures ?? [];
  const captureReportById = new Map(
    captureReportCaptures.map((capture) => [capture.id, capture]),
  );
  const captureReportBindsSelectedInputs = Boolean(
    captureReport
    && captureReport.status === 'PASS'
    && captureReport.passed === true
    && captureReport.sourceManifestSha256 === manifestSha256
    && captureReport.regions === snapshot.path
    && captureReport.snapshot?.sha256 === snapshot.sha256
    && captureReport.snapshot?.regionFileCount === snapshot.regionFileCount
    && captureReport.snapshot?.bytes === snapshot.bytes
    && captureReportCaptures.length === cameras.length
    && new Set(captureReportCaptures.map((capture) => capture.id)).size
      === cameras.length,
  );
  const currentBoundOutputs = [];
  const invalidatedOutputs = [];
  for (const camera of existingOutputs) {
    const filename = path.join(outputDirectory, camera.output);
    const capture = captureReportById.get(camera.id);
    const currentBound = (
      captureReportBindsSelectedInputs
      && capture?.output === camera.output
      && capture?.quality?.nonBlank === true
      && capture?.sha256 === sha256File(filename)
    );
    (currentBound ? currentBoundOutputs : invalidatedOutputs).push(camera);
  }
  const mediaQaPath = path.resolve(ROOT, DEFAULT_MEDIA_QA);
  const mediaQaExists = fs.existsSync(mediaQaPath);
  const mediaQa = mediaQaExists ? readJson(mediaQaPath) : null;
  const mediaQaBindsSelectedInputs = Boolean(
    mediaQa
    && mediaQa.status === 'PASS'
    && mediaQa.passed === true
    && mediaQa.sourceManifest?.sha256 === manifestSha256
    && captureReportExists
    && mediaQa.rendererReport?.sha256 === sha256File(captureReportPath)
    && mediaQa.postSnapshot?.path === snapshot.path
    && mediaQa.postSnapshot?.sha256 === snapshot.sha256
    && mediaQa.postSnapshot?.regionFileCount === snapshot.regionFileCount
    && mediaQa.postSnapshot?.bytes === snapshot.bytes,
  );
  const familyCounts = {};
  for (const camera of cameras) {
    const family = camera.output?.split('/')[1] ?? 'invalid';
    familyCounts[family] = (familyCounts[family] ?? 0) + 1;
  }
  const supportedAudits = [
    {
      family: 'c01',
      identity: preflightIdentity(
        crosswalk.cameraCoordinateAudit?.c01
          ?.postStateCameraPreflight,
      ),
    },
    {
      family: 'sales-office',
      identity: preflightIdentity(
        crosswalk.cameraCoordinateAudit?.salesOffice,
      ),
    },
    {
      family: 'gilded-raven',
      identity: preflightIdentity(
        crosswalk.cameraCoordinateAudit?.gildedRaven,
      ),
    },
  ].map((entry) => {
    const reportPath = entry.identity?.path
      ? path.resolve(ROOT, entry.identity.path)
      : null;
    const report = reportPath && fs.existsSync(reportPath)
      ? readJson(reportPath)
      : null;
    return {
      family: entry.family,
      ...entry.identity,
      reportExists: Boolean(report),
      reportStatus: report?.status ?? null,
      reportLiveWorldMutated: report?.liveWorldMutated ?? null,
      reportIdentityMatches:
        Boolean(reportPath)
        && entry.identity?.sha256 === sha256File(reportPath),
      snapshotMatches:
        sameSnapshot(entry.identity?.snapshot, snapshot),
    };
  });
  const rejectedDirectory = path.join(
    outputDirectory,
    'rejected-captures',
  );
  const rejectedArchives = fs.existsSync(rejectedDirectory)
    ? fs.readdirSync(rejectedDirectory)
      .filter((name) => /\.(json|png)$/.test(name))
      .sort()
      .map((name) => {
        const filename = path.join(rejectedDirectory, name);
        return {
          path: relativeRoot(filename),
          bytes: fs.statSync(filename).size,
          sha256: sha256File(filename),
        };
      })
    : [];
  const checks = {
    combinedCameraCount:
      cameras.length === 1178
      && manifest.counts?.combinedCaptures === 1178,
    distinctCameraIds:
      new Set(cameras.map((camera) => camera.id)).size === 1178,
    distinctOutputPaths: new Set(expectedOutputs).size === 1178,
    exactPairedShotCount:
      pass1.size === 589
      && pass2.size === 589
      && pairedShots.length === 589,
    pairedGeometryIdentical: pairedShots.every(
      ({ first, second }) =>
        second && sameCameraGeometry(first, second),
    ),
    pairedOutputsDistinct: pairedShots.every(
      ({ first, second }) =>
        second && first.output !== second.output,
    ),
    allFeatureIdsResolve: cameras.every(
      (camera) => (
        camera.mode === 'map'
        || exactObjectIds.has(camera.primaryFeatureId)
      ),
    ),
    allPerspectiveGeometryValid: cameras.every(
      (camera) => (
        camera.mode === 'map'
        || (
          validPoint(camera.eye)
          && validPoint(camera.lookAt)
          && JSON.stringify(camera.eye) !== JSON.stringify(camera.lookAt)
        )
      ),
    ),
    allMapGeometryValid: cameras.every(
      (camera) => (
        camera.mode !== 'map'
        || (
          validMapCenter(camera.center)
          && Number.isFinite(camera.span)
          && camera.span > 0
        )
      ),
    ),
    manifestBindsSelectedSnapshot:
      sameSnapshot(manifest.postreleaseSnapshot, snapshot),
    crosswalkBindsSelectedSnapshot:
      sameSnapshot(crosswalk.postreleaseSnapshot, snapshot),
    renderBackedFamilyPreflightsPass: supportedAudits.every(
      (audit) => (
        audit.reportExists
        && audit.reportStatus === 'PASS'
        && audit.reportLiveWorldMutated === false
        && audit.reportIdentityMatches
        && audit.snapshotMatches
      ),
    ),
    rejectedArchivesPreserved: [
      '020deab122aad6b70909b256986bd856e939108aa6649683ae867ab88ada93db',
      'db7a57ce231243a3c60e92a3c1856b7747799112e40c034a4664577833ceed0d',
      '75e51427f2c40af54d541bb2c2496710090f918b95550a6485cecd7f4c574d93',
      '17daf18f31c13045c618d3656eba1d2fae4bceedd896d61b1dc29cbf26122af7',
      '46bcd65c043d0de65e6658570615b44c947cb96ae48bc451840aaea5d848aa61',
      'c59f31c65a04cbf8e2337a878e23c29578b12d3980f88fc8de4918e1fc69e2b3',
    ].every((required) =>
      rejectedArchives.some((archive) => archive.sha256 === required)),
    renderRequirementPartitionsExpectedOutputs:
      currentBoundOutputs.length
      + invalidatedOutputs.length
      + missingOutputs.length === cameras.length,
  };
  const failures = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([check]) => check);
  const output = {
    schemaVersion: 1,
    id: 'town-expansion-media-complete-static-preflight',
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    generatedAtUtc: new Date().toISOString(),
    liveWorldMutated: false,
    renderedImages: false,
    source: {
      manifest: {
        path: relativeRoot(manifestPath),
        sha256: sha256File(manifestPath),
      },
      crosswalk: {
        path: relativeRoot(crosswalkPath),
        sha256: sha256File(crosswalkPath),
      },
      immutablePostSnapshot: snapshot,
    },
    counts: {
      cameras: cameras.length,
      distinctShots: pass1.size,
      pass1Cameras: [...pass1.values()].length,
      pass2Cameras: [...pass2.values()].length,
      maps: cameras.filter((camera) => camera.mode === 'map').length,
      perspectiveCameras: cameras.filter(
        (camera) => camera.mode !== 'map',
      ).length,
      exactObjects: exactObjectIds.size,
      expectedOutputPaths: expectedOutputs.length,
      existingCurrentBoundOutputFiles: currentBoundOutputs.length,
      existingInvalidatedOutputFiles: invalidatedOutputs.length,
      missingOutputFiles: missingOutputs.length,
      renderRequiredOutputFiles:
        invalidatedOutputs.length + missingOutputs.length,
      rejectedArchiveFiles: rejectedArchives.length,
    },
    familyCameraCounts: familyCounts,
    supportedRenderBackedPreflights: supportedAudits,
    invalidation: {
      disposition:
        'only existing capture outputs without exact current-snapshot '
        + 'evidence are invalidated; absent outputs are pending, and every '
        + 'expected output requires a selected-snapshot-bound render before '
        + 'media QA',
      currentBoundCameraOutputs: currentBoundOutputs.length,
      invalidatedCameraOutputs: invalidatedOutputs.length,
      pendingMissingCameraOutputs: missingOutputs.length,
      renderRequiredCameraOutputs:
        invalidatedOutputs.length + missingOutputs.length,
      existingFilesWithoutCurrentSnapshotBinding: invalidatedOutputs.map(
        (camera) => camera.output,
      ),
      captureReport: {
        path: relativeRoot(captureReportPath),
        exists: captureReportExists,
        bindsSelectedInputs: captureReportBindsSelectedInputs,
      },
      captureReportInvalidated:
        captureReportExists && !captureReportBindsSelectedInputs,
      captureReportDisposition: !captureReportExists
        ? 'ABSENT_NOT_INVALIDATED'
        : captureReportBindsSelectedInputs
          ? 'CURRENT_BOUND_EVIDENCE'
          : 'INVALIDATED_BINDING_MISMATCH',
      mediaQa: {
        path: relativeRoot(mediaQaPath),
        exists: mediaQaExists,
        bindsSelectedInputs: mediaQaBindsSelectedInputs,
      },
      mediaQaInvalidated:
        mediaQaExists && !mediaQaBindsSelectedInputs,
      mediaQaDisposition: !mediaQaExists
        ? 'ABSENT_NOT_INVALIDATED'
        : mediaQaBindsSelectedInputs
          ? 'CURRENT_BOUND_EVIDENCE'
          : 'INVALIDATED_BINDING_MISMATCH',
    },
    rejectedArchives,
    checks,
    failures,
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  process.stdout.write(
    `${output.status}: ${output.counts.cameras} cameras, `
    + `${output.counts.distinctShots} paired shots, `
    + `${output.counts.existingInvalidatedOutputFiles} existing invalidated `
    + `files\nreport: ${relativeRoot(outputPath)}\n`,
  );
  if (failures.length > 0) process.exitCode = 1;
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;
if (invokedPath === import.meta.url) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  }
}
