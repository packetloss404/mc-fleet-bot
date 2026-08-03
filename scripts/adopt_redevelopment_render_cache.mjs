#!/usr/bin/env node
/**
 * Adopt only camera outputs whose complete camera contracts are byte-identical
 * between two manifests bound to the same immutable world snapshot.
 *
 * This is a cache migration, not acceptance. The canonical renderer must still
 * run with --resume against the new manifest and emit the complete report.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  measureMediaImageQuality,
} from './lib/media_image_quality.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

function value(flag, fallback = null) {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function required(flag) {
  const result = value(flag);
  if (!result) throw new Error(`${flag} is required`);
  return path.resolve(ROOT, result);
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function sha256File(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function snapshotHash(directory) {
  const files = fs.readdirSync(directory)
    .filter((name) => name.endsWith('.mca'))
    .sort();
  if (files.length === 0) throw new Error(`snapshot has no region files: ${directory}`);
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
    sha256: hash.digest('hex'),
    regionFileCount: files.length,
    bytes,
    algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
  };
}

function assertSnapshotBinding(label, manifest, regionsPath, snapshot) {
  const expected = manifest.postreleaseSnapshot;
  if (
    !expected
    || expected.path !== relative(regionsPath)
    || expected.sha256 !== snapshot.sha256
    || expected.regionFileCount !== snapshot.regionFileCount
    || expected.bytes !== snapshot.bytes
  ) {
    throw new Error(`${label} manifest does not bind the selected snapshot`);
  }
}

function countFiles(directory) {
  if (!fs.existsSync(directory)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    count += entry.isDirectory() ? countFiles(filename) : 1;
  }
  return count;
}

async function main() {
  const oldManifestPath = required('--old-manifest');
  const newManifestPath = required('--new-manifest');
  const regionsPath = required('--regions');
  const sourceDirectory = required('--source-dir');
  const targetDirectory = required('--target-dir');
  const reportPath = path.resolve(
    ROOT,
    value('--report', path.join(targetDirectory, 'cache-adoption-report.json')),
  );
  if (sourceDirectory === targetDirectory) {
    throw new Error('source and target render directories must differ');
  }
  if (!fs.existsSync(sourceDirectory)) {
    throw new Error(`source render directory does not exist: ${sourceDirectory}`);
  }
  if (fs.existsSync(targetDirectory) && fs.readdirSync(targetDirectory).length > 0) {
    throw new Error(`target render directory is not empty: ${targetDirectory}`);
  }

  const oldManifest = JSON.parse(fs.readFileSync(oldManifestPath, 'utf8'));
  const newManifest = JSON.parse(fs.readFileSync(newManifestPath, 'utf8'));
  const oldManifestSha256 = sha256File(oldManifestPath);
  const newManifestSha256 = sha256File(newManifestPath);
  const snapshot = snapshotHash(regionsPath);
  assertSnapshotBinding('old', oldManifest, regionsPath, snapshot);
  assertSnapshotBinding('new', newManifest, regionsPath, snapshot);

  const sourceBindingPath = path.join(sourceDirectory, '.render-binding.json');
  if (!fs.existsSync(sourceBindingPath)) {
    throw new Error(`source render binding is missing: ${sourceBindingPath}`);
  }
  const sourceBinding = JSON.parse(fs.readFileSync(sourceBindingPath, 'utf8'));
  if (
    sourceBinding.schemaVersion !== 1
    || sourceBinding.sourceManifestSha256 !== oldManifestSha256
    || sourceBinding.regions !== relative(regionsPath)
    || JSON.stringify(sourceBinding.snapshot) !== JSON.stringify(snapshot)
    || sourceBinding.outputDirectory !== relative(sourceDirectory)
  ) {
    throw new Error('source render binding does not match the old manifest and snapshot');
  }

  const oldById = new Map(
    (oldManifest.cameras ?? []).map((camera) => [camera.id, camera]),
  );
  const newCameras = newManifest.cameras ?? [];
  if (newCameras.length === 0 || oldById.size === 0) {
    throw new Error('both manifests must contain cameras');
  }

  fs.mkdirSync(targetDirectory, { recursive: true });
  const adopted = [];
  const pending = [];
  const changed = [];
  for (const camera of newCameras) {
    const oldCamera = oldById.get(camera.id);
    if (!oldCamera || JSON.stringify(oldCamera) !== JSON.stringify(camera)) {
      changed.push(camera.id);
      continue;
    }
    const source = path.join(sourceDirectory, camera.output);
    const target = path.join(targetDirectory, camera.output);
    if (!fs.existsSync(source) || fs.statSync(source).size < 8_000) {
      pending.push(camera.id);
      continue;
    }
    const quality = await measureMediaImageQuality(source);
    if (!quality.nonBlank) {
      pending.push(camera.id);
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
    adopted.push({
      id: camera.id,
      output: camera.output,
      bytes: fs.statSync(target).size,
      sha256: sha256File(target),
    });
  }

  const sourceRejectedDirectory = path.join(
    sourceDirectory,
    'rejected-captures',
  );
  const targetRejectedDirectory = path.join(
    targetDirectory,
    'rejected-captures',
  );
  const rejectedArchiveFiles = countFiles(sourceRejectedDirectory);
  if (rejectedArchiveFiles > 0) {
    fs.cpSync(
      sourceRejectedDirectory,
      targetRejectedDirectory,
      { recursive: true, errorOnExist: true },
    );
  }

  const targetBinding = {
    schemaVersion: 1,
    sourceManifest: relative(newManifestPath),
    sourceManifestSha256: newManifestSha256,
    regions: relative(regionsPath),
    snapshot,
    outputDirectory: relative(targetDirectory),
  };
  fs.writeFileSync(
    path.join(targetDirectory, '.render-binding.json'),
    `${JSON.stringify(targetBinding, null, 2)}\n`,
    { flag: 'wx' },
  );

  const report = {
    schemaVersion: 1,
    generatedAtUtc: new Date().toISOString(),
    status: 'PASS_CACHE_ADOPTION_ONLY',
    passed: true,
    acceptanceClaim: false,
    source: {
      manifest: relative(oldManifestPath),
      manifestSha256: oldManifestSha256,
      directory: relative(sourceDirectory),
      binding: relative(sourceBindingPath),
    },
    target: {
      manifest: relative(newManifestPath),
      manifestSha256: newManifestSha256,
      directory: relative(targetDirectory),
      binding: relative(path.join(targetDirectory, '.render-binding.json')),
    },
    snapshot: {
      path: relative(regionsPath),
      ...snapshot,
    },
    counts: {
      oldCameras: oldById.size,
      newCameras: newCameras.length,
      changedCameraContracts: changed.length,
      adoptedOutputs: adopted.length,
      unchangedOutputsPendingRender: pending.length,
      totalPendingRender: newCameras.length - adopted.length,
      preservedRejectedArchiveFiles: rejectedArchiveFiles,
    },
    changedCameraIds: changed,
    unchangedPendingCameraIds: pending,
    adopted,
    finalAcceptanceRequirement:
      'Run the canonical renderer with --resume against the complete new '
      + 'manifest, then validate its complete capture report.',
  };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({
    status: report.status,
    report: relative(reportPath),
    counts: report.counts,
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
});
