#!/usr/bin/env node
/**
 * Memory-bounded orchestrator for the immutable-snapshot camera renderer.
 *
 * The underlying renderer remains the acceptance authority. This wrapper
 * divides a requested index range into short-lived child processes so decoded
 * chunks and image buffers cannot accumulate across a long resumed sweep.
 * Each batch writes its own report. A caller must still run the complete
 * canonical renderer with --resume after every batch passes.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

function value(flag, fallback = null) {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
}

function required(flag) {
  const result = value(flag);
  if (!result) throw new Error(`${flag} is required`);
  return result;
}

function integer(flag, fallback) {
  const raw = value(flag, String(fallback));
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`${flag} must be a non-negative safe integer`);
  }
  return parsed;
}

const manifestArg = required('--manifest');
const regionsArg = required('--regions');
const outputArg = required('--out-dir');
const manifestPath = path.resolve(ROOT, manifestArg);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const cameraCount = Array.isArray(manifest.cameras)
  ? manifest.cameras.length
  : (manifest.captures ?? []).length;
if (cameraCount === 0) throw new Error('manifest has no cameras');

const start = integer('--slice-start', 0);
const end = Math.min(integer('--slice-end', cameraCount), cameraCount);
const batchSize = integer('--batch-size', 12);
const maxOldSpaceSize = integer('--max-old-space-size', 8192);
if (batchSize < 1) throw new Error('--batch-size must be at least 1');
if (start >= end) throw new Error('requested slice is empty');

const outputDirectory = path.resolve(ROOT, outputArg);
const batchReportDirectory = path.resolve(
  ROOT,
  value('--batch-report-dir', path.join(outputArg, 'batch-reports')),
);
fs.mkdirSync(batchReportDirectory, { recursive: true });

const renderer = path.join(
  ROOT,
  'scripts/render_redevelopment_camera_manifest.mjs',
);
const completed = [];
for (let batchStart = start; batchStart < end; batchStart += batchSize) {
  const batchEnd = Math.min(end, batchStart + batchSize);
  const report = path.join(
    batchReportDirectory,
    `capture-report-${String(batchStart).padStart(4, '0')}`
      + `-${String(batchEnd).padStart(4, '0')}.json`,
  );
  const childArgs = [
    `--max-old-space-size=${maxOldSpaceSize}`,
    renderer,
    '--manifest',
    manifestArg,
    '--regions',
    regionsArg,
    '--out-dir',
    outputArg,
    '--report',
    path.relative(ROOT, report),
    '--slice-start',
    String(batchStart),
    '--slice-end',
    String(batchEnd),
    '--resume',
  ];
  if (args.includes('--diagnostic-continue-on-reject')) {
    childArgs.push('--diagnostic-continue-on-reject');
  }
  const result = spawnSync(process.execPath, childArgs, {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(
      `camera batch [${batchStart}, ${batchEnd}) failed with exit `
      + `${result.status ?? result.signal ?? 'unknown'}`,
    );
  }
  if (!fs.existsSync(report)) {
    throw new Error(`camera batch [${batchStart}, ${batchEnd}) wrote no report`);
  }
  const batchReport = JSON.parse(fs.readFileSync(report, 'utf8'));
  if (
    batchReport.status !== 'PASS'
    || batchReport.passed !== true
    || batchReport.rejectedCount !== 0
    || batchReport.captureCount !== batchEnd - batchStart
  ) {
    throw new Error(
      `camera batch [${batchStart}, ${batchEnd}) did not pass its report`,
    );
  }
  completed.push({
    sliceStart: batchStart,
    sliceEnd: batchEnd,
    report: path.relative(ROOT, report).split(path.sep).join('/'),
  });
}

process.stdout.write(`${JSON.stringify({
  status: 'PASS_BATCHED_RENDER',
  manifest: path.relative(ROOT, manifestPath).split(path.sep).join('/'),
  outputDirectory:
    path.relative(ROOT, outputDirectory).split(path.sep).join('/'),
  requested: { start, end, cameraCount },
  batchSize,
  batches: completed,
  canonicalReportRequired: true,
}, null, 2)}\n`);
