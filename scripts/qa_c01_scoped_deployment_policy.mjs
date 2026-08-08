#!/usr/bin/env node
/** Validate a C01 town-hall policy against one orchestrator evidence ledger. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DetailedAnvilSnapshot } from './generate_mainstreet_redevelopment_r4_r5.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const value = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : null;
};
const required = (flag) => {
  const v = value(flag);
  if (!v) throw new Error(`${flag} is required`);
  return path.resolve(ROOT, v);
};
const policyPath = required('--policy');
const ledgerPath = required('--ledger');
const outPath = required('--out');
const exception = value('--small-wave-exception');
const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
const ledgerDir = path.dirname(ledgerPath);
const failures = [];
const checks = [];
const pass = (id, observed) => checks.push({ id, status: 'PASS', observed });
const fail = (id, observed) => { failures.push({ id, observed }); checks.push({ id, status: 'FAIL', observed }); };
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');
const stage = (id) => ledger.stages.find((entry) => entry.stage === id);

if (policy.status !== 'APPROVED_SCOPED_DEPLOYMENT_POLICY') fail('policy-approved', policy.status);
else pass('policy-approved', policy.status);
if (ledger.status !== 'EXECUTED_AND_VERIFIED') fail('ledger-executed-and-verified', ledger.status);
else pass('ledger-executed-and-verified', ledger.status);
if (ledger.mode !== 'EXECUTE') fail('ledger-live-execution', ledger.mode);
else pass('ledger-live-execution', ledger.mode);
if (ledger.forward?.sha256 !== sha256(path.resolve(ROOT, ledger.forward.file))) fail('forward-hash-bound', ledger.forward);
else pass('forward-hash-bound', ledger.forward.sha256);
if (ledger.rollback?.sha256 !== sha256(path.resolve(ROOT, ledger.rollback.file))) fail('rollback-hash-bound', ledger.rollback);
else pass('rollback-hash-bound', ledger.rollback.sha256);

const requiredStages = [
  'forward-source-preflight',
  'forward-strict-dry-run',
  'rollback-strict-dry-run',
  'projected-route-qa',
  'live-forward-execution',
  'fresh-post-snapshot',
  'post-route-qa',
  'rollback-poststate-preflight',
];
for (const id of requiredStages) {
  const observed = stage(id)?.status ?? 'MISSING';
  if (observed !== 'PASS') fail(`stage:${id}`, observed);
  else pass(`stage:${id}`, observed);
}

const execution = JSON.parse(fs.readFileSync(path.join(ledgerDir, 'execution.json'), 'utf8'));
const operationCount = Number(execution.sourceOperationCount ?? 0);
if (operationCount >= policy.minimumNormalWaveChangedCells) {
  pass('minimum-wave-size', operationCount);
} else if (exception && policy.allowedSmallWaveExceptions.includes(exception)) {
  pass('minimum-wave-size-exception', { operationCount, exception });
} else {
  fail('minimum-wave-size', { operationCount, required: policy.minimumNormalWaveChangedCells, exception });
}
if (execution.strictNoop === true && execution.worldEditLeftoverCount === 0) pass('strict-execution-contract', {
  strictNoop: execution.strictNoop,
  worldEditLeftoverCount: execution.worldEditLeftoverCount,
});
else fail('strict-execution-contract', execution);

for (const file of ['projected-route-qa.json', 'post-route-qa.json']) {
  const report = JSON.parse(fs.readFileSync(path.join(ledgerDir, file), 'utf8'));
  if (report.status === 'PASS' && report.summary?.passedDirections === report.summary?.directionalRuns) {
    pass(file, { status: report.status, routes: report.summary.routes, directions: report.summary.directionalRuns });
  } else fail(file, { status: report.status, summary: report.summary });
}
const rollback = JSON.parse(fs.readFileSync(path.join(ledgerDir, 'rollback-poststate-preflight.json'), 'utf8'));
if (rollback.status === 'PASS' && rollback.failed === 0) pass('rollback-poststate', { status: rollback.status, passed: rollback.passed });
else fail('rollback-poststate', rollback);

const packageTargets = new Set();
for (const line of fs.readFileSync(path.resolve(ROOT, ledger.forward.file), 'utf8').split(/\r?\n/)) {
  const fields = line.trim().split(/\s+/);
  if (fields[0] === 'REPL') packageTargets.add(`${fields[1]},${fields[2]},${fields[3]}`);
}
const snapshot = new DetailedAnvilSnapshot(path.resolve(ROOT, ledger.postRegions));
const classification = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'docs/redevelopment/2026-07-28-town-expansion/c01-bunker-classification-manifest.json'), 'utf8'));
const entities = [];
for (const box of classification.envelope.boxes ?? []) entities.push(...await snapshot.blockEntitiesInBox(box));
const overlap = entities.filter((entity) => packageTargets.has(`${entity.x},${entity.y},${entity.z}`));
if (overlap.length === 0) pass('block-entity-clearance', { packageTargets: packageTargets.size, entities: entities.length, overlap: 0 });
else fail('block-entity-clearance', { overlap: overlap.length, points: overlap });

const report = {
  schemaVersion: 1,
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  policy: rel(policyPath),
  ledger: rel(ledgerPath),
  smallWaveException: exception,
  checks,
  failures,
};
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: report.status, out: rel(outPath), failures: failures.length }, null, 2)}\n`);
if (failures.length) process.exitCode = 1;
