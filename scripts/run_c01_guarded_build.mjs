#!/usr/bin/env node
/**
 * Reusable C01 guarded-build orchestrator.
 *
 * Default mode is preparation only. It binds a route manifest to the supplied
 * immutable pre snapshot, runs exact source preflight, strict forward/rollback
 * parser checks, and projected route QA. Live mutation requires --execute and
 * also requires an explicit post-snapshot destination and --snapshot-near.
 * Every stage is recorded in one evidence ledger.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function value(args, flag, fallback = null) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
}

function required(args, flag) {
  const result = value(args, flag);
  if (!result) throw new Error(`${flag} is required`);
  return result;
}

function resolve(filename) {
  return path.resolve(ROOT, filename);
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function sha256(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function run(stage, command, args, ledger) {
  const startedAt = new Date().toISOString();
  try {
    const stdout = execFileSync(command, args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    });
    ledger.stages.push({
      stage,
      status: 'PASS',
      command: [command, ...args].join(' '),
      startedAt,
      completedAt: new Date().toISOString(),
      stdoutTail: stdout.slice(-4000),
    });
    return stdout;
  } catch (error) {
    ledger.stages.push({
      stage,
      status: 'FAIL',
      command: [command, ...args].join(' '),
      startedAt,
      completedAt: new Date().toISOString(),
      exitStatus: error.status ?? null,
      stdoutTail: String(error.stdout ?? '').slice(-4000),
      stderrTail: String(error.stderr ?? '').slice(-4000),
    });
    throw error;
  }
}

function writeLedger(file, ledger) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(ledger, null, 2)}\n`);
}

const args = process.argv.slice(2);
const forward = resolve(required(args, '--forward'));
const rollback = resolve(required(args, '--rollback'));
const preRegions = resolve(required(args, '--pre-regions'));
const baseManifest = resolve(required(args, '--route-manifest'));
const outDir = resolve(value(args, '--out-dir', 'data/world-review/c01-guarded-build'));
const postRegions = value(args, '--post-regions') ? resolve(value(args, '--post-regions')) : null;
const snapshotNear = value(args, '--snapshot-near');
const execute = args.includes('--execute');
const ledgerPath = resolve(value(args, '--ledger', path.join(relative(outDir), 'evidence-ledger.json')));
const preManifest = path.join(outDir, 'pre-route-manifest.json');
const postManifest = path.join(outDir, 'post-route-manifest.json');
const packageBase = relative(forward);

if (execute && (!postRegions || !snapshotNear)) {
  throw new Error('--execute requires --post-regions <.../region> and --snapshot-near <x,z>');
}
if (!fs.existsSync(forward) || !fs.existsSync(rollback) || !fs.existsSync(preRegions)) {
  throw new Error('forward, rollback, or pre-regions path does not exist');
}
fs.mkdirSync(outDir, { recursive: true });

const ledger = {
  schemaVersion: 1,
  status: 'RUNNING',
  mode: execute ? 'EXECUTE' : 'PREPARE_ONLY',
  forward: { file: relative(forward), sha256: sha256(forward) },
  rollback: { file: relative(rollback), sha256: sha256(rollback) },
  preRegions: relative(preRegions),
  postRegions: postRegions ? relative(postRegions) : null,
  routeManifest: relative(baseManifest),
  stages: [],
};

try {
  run('bind-pre-route-manifest', process.execPath, [
    'scripts/bind_route_manifest_snapshot.mjs',
    '--input', relative(baseManifest),
    '--regions', relative(preRegions),
    '--package', packageBase,
    '--out', relative(preManifest),
  ], ledger);

  run('forward-source-preflight', process.execPath, [
    'scripts/preflight_guarded_ops.mjs',
    relative(forward),
    '--regions', relative(preRegions),
    '--report', relative(path.join(outDir, 'forward-preflight.json')),
  ], ledger);

  run('forward-strict-dry-run', 'python3', [
    'scripts/rcon_runner.py', relative(forward), '--dry-run', '--strict-noop',
    '--report', relative(path.join(outDir, 'forward-strict-dry-run.json')),
  ], ledger);

  run('rollback-strict-dry-run', 'python3', [
    'scripts/rcon_runner.py', relative(rollback), '--dry-run', '--strict-noop',
    '--operation-role', 'rollback',
    '--report', relative(path.join(outDir, 'rollback-strict-dry-run.json')),
  ], ledger);

  run('projected-route-qa', process.execPath, [
    'scripts/qa_town_expansion_routes.mjs',
    '--manifest', relative(preManifest),
    '--regions', relative(preRegions),
    '--overlay-ops', relative(forward),
    '--report', relative(path.join(outDir, 'projected-route-qa.json')),
    '--markdown', relative(path.join(outDir, 'projected-route-qa.md')),
  ], ledger);

  if (!execute) {
    ledger.status = 'READY_FOR_EXECUTION';
    writeLedger(ledgerPath, ledger);
    process.stdout.write(`${JSON.stringify({ status: ledger.status, ledger: relative(ledgerPath) }, null, 2)}\n`);
    process.exit(0);
  }

  run('live-forward-execution', 'python3', [
    'scripts/rcon_runner.py', relative(forward), '--strict-noop',
    '--report', relative(path.join(outDir, 'execution.json')),
    '--stream-journal', relative(path.join(outDir, 'execution.json.stream-journal.jsonl')),
  ], ledger);

  const postParent = path.dirname(postRegions);
  run('fresh-post-snapshot', 'python3', [
    'scripts/world_snapshot.py', '--dest', relative(postParent),
    '--near', snapshotNear, '--radius', '1200',
  ], ledger);

  run('bind-post-route-manifest', process.execPath, [
    'scripts/bind_route_manifest_snapshot.mjs',
    '--input', relative(baseManifest),
    '--regions', relative(postRegions),
    '--package', packageBase,
    '--out', relative(postManifest),
  ], ledger);

  run('post-route-qa', process.execPath, [
    'scripts/qa_town_expansion_routes.mjs',
    '--manifest', relative(postManifest),
    '--regions', relative(postRegions),
    '--report', relative(path.join(outDir, 'post-route-qa.json')),
    '--markdown', relative(path.join(outDir, 'post-route-qa.md')),
  ], ledger);

  run('rollback-poststate-preflight', process.execPath, [
    'scripts/preflight_guarded_ops.mjs', relative(rollback),
    '--regions', relative(postRegions),
    '--report', relative(path.join(outDir, 'rollback-poststate-preflight.json')),
  ], ledger);

  ledger.status = 'EXECUTED_AND_VERIFIED';
  writeLedger(ledgerPath, ledger);
  process.stdout.write(`${JSON.stringify({ status: ledger.status, ledger: relative(ledgerPath) }, null, 2)}\n`);
} catch (error) {
  ledger.status = 'BLOCKED';
  ledger.error = error.message;
  writeLedger(ledgerPath, ledger);
  process.stderr.write(`${error.stack ?? error.message}\n`);
  process.exitCode = 1;
}
