#!/usr/bin/env node
/** T03: hash-bound, fail-closed wrapper for a compiled Combined Zones release. */

import fs from 'fs';
import { spawnSync } from 'child_process';
import {
  readJson,
  resolveFromRoot,
  relativeToRoot,
  sha256File,
  parseArgs,
  requiredArg,
  writeJson,
} from './lib/combined_zones_release_layer.mjs';

const args = parseArgs(process.argv.slice(2));
const layerPath = resolveFromRoot(requiredArg(args, '--layer'));
const authPath = resolveFromRoot(requiredArg(args, '--authorization'));
const ownershipPath = resolveFromRoot(requiredArg(args, '--ownership-audit'));
const execute = args.get('--execute') === true;
const layer = readJson(layerPath);
const authorization = readJson(authPath);
const ownership = readJson(ownershipPath);
const errors = [];

if (layer.executable !== true || layer.worldEditAuthorized !== true) errors.push('layer-is-not-executable-or-authorized');
if (layer.status !== 'RELEASE_LAYER_COMPILED_AWAITING_GATES') errors.push(`layer-status:${layer.status}`);
if (ownership.passed !== true) errors.push('T02-ownership-interface-audit-is-not-pass');
if (authorization.status !== 'AUTHORIZED_SINGLE_EXECUTION_HASH_BOUND') errors.push('authorization-is-not-hash-bound-single-execution');
if (Date.parse(authorization.expiresAtUtc ?? '') <= Date.now()) errors.push('authorization-expired');
if (authorization.boundIdentities?.layerIdentitySha256 !== layer.layerIdentitySha256) errors.push('authorization-layer-identity-mismatch');
if (authorization.boundIdentities?.ownershipAuditSha256 !== sha256File(ownershipPath)) errors.push('authorization-ownership-audit-mismatch');
const expectedPackageHashes = (layer.packages ?? []).map((entry) => ({
  key: entry.key,
  forwardSha256: entry.forward?.sha256,
  rollbackSha256: entry.rollback?.sha256,
}));
if (JSON.stringify(authorization.boundIdentities?.packages ?? []) !== JSON.stringify(expectedPackageHashes)) {
  errors.push('authorization-package-hash-list-mismatch');
}

const report = {
  schemaVersion: 1,
  id: 'combined-zones-release-layer-wrapper-check',
  generatedAtUtc: new Date().toISOString(),
  status: errors.length === 0 ? 'READY_TO_EXECUTE' : 'REJECTED',
  execute,
  layer: { path: relativeToRoot(layerPath), sha256: sha256File(layerPath) },
  authorization: { path: relativeToRoot(authPath), sha256: sha256File(authPath) },
  ownershipAudit: { path: relativeToRoot(ownershipPath), sha256: sha256File(ownershipPath) },
  errors,
};
const reportPath = resolveFromRoot(args.get('--report') ?? 'data/world-review/combined-zones-release-layer-wrapper-check-20260808.json');
writeJson(reportPath, report);
console.log(JSON.stringify(report, null, 2));
if (errors.length > 0) process.exit(1);
if (!execute) process.exit(0);

const runPackage = (entry, role) => {
  const operationPath = role === 'forward' ? entry.forward.path : entry.rollback.path;
  const output = resolveFromRoot(`data/world-review/combined-zones-release-layer-${entry.key}-${role}-execution-20260808.json`);
  return spawnSync('python3', [
    'scripts/rcon_runner.py', resolveFromRoot(operationPath),
    '--strict-noop', '--operation-role', role,
    '--report', output,
    '--stream-journal', `${output}.jsonl`,
  ], { cwd: process.cwd(), stdio: 'inherit', timeout: 30 * 60 * 1000 });
};

const completed = [];
for (const entry of layer.packages ?? []) {
  const result = runPackage(entry, 'forward');
  if (result.status === 0) {
    completed.push(entry);
    continue;
  }
  runPackage(entry, 'rollback');
  for (const prior of completed.reverse()) runPackage(prior, 'rollback');
  process.exit(1);
}
