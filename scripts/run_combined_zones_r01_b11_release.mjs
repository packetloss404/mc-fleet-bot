#!/usr/bin/env node
/**
 * T03 release wrapper for the CZ-R01 B11 road package.
 *
 * Verifies every hash-bound identity equality (manifest, operations,
 * authorization, QA, T02, entity-gate freshness and binding) and only then
 * executes the forward package once through the proven strict-noop guarded
 * runner. On any execution failure it immediately executes the bound rollback
 * package. All runner output is journaled.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const EXECUTE = argv.includes('--execute');

const sha256File = (p) => crypto.createHash('sha256')
  .update(fs.readFileSync(path.join(ROOT, p))).digest('hex');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
function invariant(condition, message) {
  if (!condition) throw new Error(`R01 B11 release wrapper rejected: ${message}`);
}
const stripHeader = (raw) => `${raw.split('\n').filter((line) => line && !line.startsWith('#')).join('\n')}\n`;

const MANIFEST = 'data/buildops/combined-zones-r01-b11-road.release-manifest.json';
const AUTHORIZATION = 'data/buildops/combined-zones-r01-b11-road.release-authorization.json';
const ENTITY_GATE = 'data/buildops/combined-zones-r01-b11-road.entity-gate.json';

const manifest = readJson(MANIFEST);
const authorization = readJson(AUTHORIZATION);
const manifestQa = readJson('data/world-review/combined-zones-r01-b11-road.manifest-qa.json');
const t02 = readJson('data/world-review/combined-zones-r01-b11-road.ownership-interface-audit.json');

invariant(authorization.status === 'AUTHORIZED_SINGLE_EXECUTION_HASH_BOUND',
  'authorization record is not in the authorized state');
invariant(Date.now() < Date.parse(authorization.expiresAtUtc), 'authorization has expired');
invariant(authorization.boundIdentities.manifestIdentity === manifest.manifestIdentity,
  'authorization is bound to a different manifest');
invariant(manifestQa.status === 'PASS', 'G09 manifest QA is not PASS');
invariant(t02.status === 'PASS_EXACT_DOMAIN_BIJECTION_ZERO_CORE_OVERLAP_ONE_OWNER_BOUND'
  && t02.manifestIdentity === manifest.manifestIdentity,
'T02 audit missing or bound to a different manifest');

const pkg = manifest.packages[0];
const forwardBodyHash = crypto.createHash('sha256')
  .update(stripHeader(fs.readFileSync(path.join(ROOT, pkg.forward), 'utf8'))).digest('hex');
const rollbackBodyHash = crypto.createHash('sha256')
  .update(stripHeader(fs.readFileSync(path.join(ROOT, pkg.rollback), 'utf8'))).digest('hex');
invariant(forwardBodyHash === manifest.operations.forwardSha256
  && forwardBodyHash === authorization.boundIdentities.forwardSha256,
'forward operation file drifted from its bound identity');
invariant(rollbackBodyHash === manifest.operations.rollbackSha256
  && rollbackBodyHash === authorization.boundIdentities.rollbackSha256,
'rollback operation file drifted from its bound identity');

const entityGate = readJson(ENTITY_GATE);
const gateGeneratedAt = Date.parse(entityGate.generatedAtUtc ?? entityGate.generatedAt
  ?? entityGate.timestampUtc ?? entityGate.completedAtUtc ?? 0);
invariant(Number.isFinite(gateGeneratedAt) && gateGeneratedAt > 0,
  'entity gate report has no readable timestamp');
invariant(Date.now() - gateGeneratedAt <= 300_000,
  'entity gate report is older than 300 seconds');
const gateText = JSON.stringify(entityGate);
invariant(!/"blocker/i.test(gateText) || (entityGate.summary?.blockerCount ?? 0) === 0,
  'entity gate reports blockers');
const gateStatus = entityGate.status ?? entityGate.gate?.status ?? '';
invariant(/PASS|CLEAR/i.test(gateStatus) || (entityGate.summary?.blockerCount === 0),
  `entity gate status is not PASS: ${gateStatus}`);
const gateOps = JSON.stringify(entityGate.ops ?? entityGate.operations ?? entityGate.inputs ?? '');
invariant(gateText.includes(manifest.operations.forwardSha256)
  || gateOps.includes(pkg.forward) || gateText.includes(pkg.forward),
'entity gate is not bound to this forward package');

console.log(JSON.stringify({
  preExecutionChecks: 'ALL_IDENTITY_AND_GATE_CHECKS_PASS',
  manifestIdentity: manifest.manifestIdentity,
  authorizationIdentitySha256: authorization.authorizationIdentitySha256,
  entityGateAgeSeconds: Math.round((Date.now() - gateGeneratedAt) / 1000),
  execute: EXECUTE,
}, null, 2));

if (!EXECUTE) {
  console.log('Dry verification only; pass --execute to run the release.');
  process.exit(0);
}

const run = (role, file) => spawnSync('python3', [
  'scripts/rcon_runner.py', file,
  '--strict-noop',
  '--operation-role', role,
  '--report', `data/buildops/combined-zones-r01-b11-road.${role}.execution.json`,
  '--stream-journal', `data/buildops/combined-zones-r01-b11-road.${role}.execution.stream-journal.jsonl`,
], { cwd: ROOT, stdio: 'inherit', timeout: 30 * 60 * 1000 });

const forwardResult = run('forward', pkg.forward);
if (forwardResult.status !== 0) {
  console.error(`FORWARD EXECUTION FAILED (exit ${forwardResult.status}); executing bound rollback.`);
  const rollbackResult = run('rollback', pkg.rollback);
  invariant(rollbackResult.status === 0,
    `rollback also failed (exit ${rollbackResult.status}); MANUAL INTERVENTION REQUIRED`);
  console.error('Rollback completed cleanly after forward failure.');
  process.exit(1);
}
console.log('Forward execution completed cleanly.');
