#!/usr/bin/env node
/**
 * Idempotent autonomous Combined Zones worker.
 *
 * It refreshes offline evidence on every invocation. It may execute only when
 * the compiled layer is executable, T02 is PASS, and an external authorization
 * binds the exact layer/package/snapshot identities. A blocked run is a normal
 * result for the timer, not permission to guess or self-authorize.
 */

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import {
  ROOT,
  readJson,
  resolveFromRoot,
  relativeToRoot,
  writeJson,
} from './lib/combined_zones_release_layer.mjs';

const stateDir = resolveFromRoot(process.env.COMBINED_ZONES_AUTONOMOUS_STATE_DIR ?? 'data/world-review/combined-zones-autonomous');
const lockPath = path.join(stateDir, 'worker.lock');
const ledgerPath = path.join(stateDir, 'worker-ledger.jsonl');
const layerPath = resolveFromRoot(process.env.COMBINED_ZONES_RELEASE_LAYER ?? 'data/world-review/combined-zones-release-layer-20260808.json');
const ownershipPath = resolveFromRoot(process.env.COMBINED_ZONES_OWNERSHIP_AUDIT ?? 'data/world-review/combined-zones-release-layer-ownership-20260808.json');
const authorizationPath = resolveFromRoot(process.env.COMBINED_ZONES_AUTHORIZATION ?? 'data/buildops/combined-zones-release-layer.authorization.json');
const reportPath = path.join(stateDir, 'last-run.json');
fs.mkdirSync(stateDir, { recursive: true });

let lockHandle;
try {
  lockHandle = fs.openSync(lockPath, 'wx');
  fs.writeFileSync(lockHandle, `${JSON.stringify({ pid: process.pid, startedAtUtc: new Date().toISOString() })}\n`);
} catch (error) {
  if (error.code === 'EEXIST') {
    console.log(JSON.stringify({ status: 'SKIPPED_ALREADY_RUNNING', lock: relativeToRoot(lockPath) }));
    process.exit(0);
  }
  throw error;
}

function finish() {
  try { if (lockHandle !== undefined) fs.closeSync(lockHandle); } catch {}
  try { fs.unlinkSync(lockPath); } catch {}
}
process.on('exit', finish);
process.on('SIGTERM', () => { finish(); process.exit(143); });
process.on('SIGINT', () => { finish(); process.exit(130); });

function run(label, argv) {
  const result = spawnSync(argv[0], argv.slice(1), { cwd: ROOT, encoding: 'utf8', timeout: 30 * 60 * 1000 });
  return {
    label,
    command: argv.join(' '),
    passed: result.status === 0,
    exitCode: result.status,
    stdout: result.stdout?.slice(-3000) ?? '',
    stderr: result.stderr?.slice(-3000) ?? '',
  };
}

const startedAtUtc = new Date().toISOString();
const actions = [];
actions.push(run('mechanical blocker remediation', [
  'node', 'scripts/remediate_combined_zones_blockers.mjs',
  '--out', relativeToRoot(path.join(stateDir, 'blocker-remediation.json')),
]));

let layer = fs.existsSync(layerPath) ? readJson(layerPath) : null;
let ownership = fs.existsSync(ownershipPath) ? readJson(ownershipPath) : null;
let authorization = fs.existsSync(authorizationPath) ? readJson(authorizationPath) : null;
const blockers = [];
if (!layer) blockers.push('missing-release-layer');
if (!ownership) blockers.push('missing-ownership-audit');
if (!authorization) blockers.push('missing-external-authorization');
if (layer && (layer.executable !== true || layer.worldEditAuthorized !== true)) blockers.push('layer-not-executable-or-world-edit-authorized');
if (ownership && ownership.passed !== true) blockers.push('ownership-interface-gate-not-pass');
if (authorization && authorization.status !== 'AUTHORIZED_SINGLE_EXECUTION_HASH_BOUND') blockers.push('authorization-not-hash-bound-single-execution');

let execution = null;
if (blockers.length === 0) {
  execution = run('hash-bound release wrapper', [
    'node', 'scripts/run_combined_zones_release_layer.mjs',
    '--layer', relativeToRoot(layerPath),
    '--authorization', relativeToRoot(authorizationPath),
    '--ownership-audit', relativeToRoot(ownershipPath),
    '--execute',
    '--report', relativeToRoot(path.join(stateDir, 'wrapper-check.json')),
  ]);
} else {
  execution = { label: 'hash-bound release wrapper', skipped: true, blockers };
}

const report = {
  schemaVersion: 1,
  id: 'combined-zones-autonomous-worker-run',
  generatedAtUtc: new Date().toISOString(),
  startedAtUtc,
  status: execution?.passed === true
    ? 'EXECUTED_HASH_BOUND_RELEASE'
    : blockers.length > 0
      ? 'WAITING_FOR_RELEASE_INPUTS'
      : 'RELEASE_ATTEMPT_FAILED',
  mode: 'offline-remediation-plus-gated-execution',
  layer: layer ? { path: relativeToRoot(layerPath), status: layer.status } : null,
  ownership: ownership ? { path: relativeToRoot(ownershipPath), status: ownership.status } : null,
  authorization: authorization ? { path: relativeToRoot(authorizationPath), status: authorization.status } : null,
  blockers,
  actions,
  execution,
};
writeJson(reportPath, report);
fs.appendFileSync(ledgerPath, `${JSON.stringify(report)}\n`);
console.log(JSON.stringify({ status: report.status, report: relativeToRoot(reportPath), blockers }, null, 2));
process.exitCode = report.status === 'RELEASE_ATTEMPT_FAILED' ? 1 : 0;
