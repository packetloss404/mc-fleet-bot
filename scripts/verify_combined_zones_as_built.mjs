#!/usr/bin/env node
/** T04: verify a release against an immutable post snapshot and exact rollback preflight. */

import fs from 'fs';
import { spawnSync } from 'child_process';
import {
  readJson,
  resolveFromRoot,
  relativeToRoot,
  sha256File,
  hashSnapshotDirectory,
  parseArgs,
  requiredArg,
  writeJson,
} from './lib/combined_zones_release_layer.mjs';

const args = parseArgs(process.argv.slice(2));
const layerPath = resolveFromRoot(requiredArg(args, '--layer'));
const postSnapshotPath = resolveFromRoot(requiredArg(args, '--post-snapshot'));
const outputPath = resolveFromRoot(args.get('--out') ?? 'data/world-review/combined-zones-as-built-verification-20260808.json');
const preflightDir = args.get('--preflight-dir')
  ? resolveFromRoot(args.get('--preflight-dir'))
  : resolveFromRoot('data/world-review/combined-zones-as-built-verification-20260808');
const layer = readJson(layerPath);
const snapshot = hashSnapshotDirectory(postSnapshotPath);
const packages = [];
const errors = [];
fs.mkdirSync(preflightDir, { recursive: true });

for (const entry of layer.packages ?? []) {
  const rollbackPath = resolveFromRoot(entry.rollback.path);
  const reportPath = `${preflightDir}/${entry.key}.rollback-post-preflight.json`;
  const result = spawnSync('node', [
    'scripts/preflight_guarded_ops.mjs', rollbackPath,
    '--regions', postSnapshotPath,
    '--report', reportPath,
  ], { cwd: process.cwd(), encoding: 'utf8', timeout: 30 * 60 * 1000 });
  let report = null;
  if (fs.existsSync(reportPath)) report = readJson(reportPath);
  const passed = result.status === 0
    && report?.status === 'PASS'
    && report?.opsSha256 === entry.rollback.sha256
    && report?.regionsSnapshot?.sha256 === snapshot.sha256
    && report?.operationCount === entry.rollback.replGroups;
  if (!passed) {
    errors.push({
      package: entry.key,
      reason: 'rollback-post-preflight-failed-or-identity-drifted',
      exitCode: result.status,
      report: report ? { status: report.status, opsSha256: report.opsSha256, regionsSha256: report.regionsSnapshot?.sha256 } : null,
      stderr: result.stderr?.slice(-2000) ?? '',
    });
  }
  packages.push({
    key: entry.key,
    rollback: { path: entry.rollback.path, sha256: entry.rollback.sha256 },
    preflight: { path: relativeToRoot(reportPath), passed },
  });
}

const verification = {
  schemaVersion: 1,
  id: 'combined-zones-as-built-verification',
  generatedAtUtc: new Date().toISOString(),
  status: errors.length === 0 ? 'PASS_AS_BUILT_POST_SNAPSHOT_AND_ROLLBACK_PREFLIGHT' : 'FAIL_AS_BUILT_VERIFICATION',
  passed: errors.length === 0,
  layer: { path: relativeToRoot(layerPath), sha256: sha256File(layerPath), identitySha256: layer.layerIdentitySha256 },
  postSnapshot: { path: relativeToRoot(postSnapshotPath), ...snapshot },
  packages,
  errors,
  rule: 'A package is verified only when the exact rollback operation treats every post-state target as its expected forward desired state on the supplied immutable snapshot; no package is credited from an execution log alone.',
};
writeJson(outputPath, verification);
console.log(JSON.stringify({ status: verification.status, output: relativeToRoot(outputPath), packages: packages.length, errors: errors.length }, null, 2));
process.exitCode = verification.passed ? 0 : 1;
