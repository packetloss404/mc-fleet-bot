#!/usr/bin/env node
/**
 * T03 release wrapper for the CZ-R02 D06 deep-shell package pair.
 *
 * Verifies every hash-bound identity equality, then executes the packages in
 * manifest order (reservations, then mechanisms) through the strict-noop
 * guarded runner. On any failure it rolls back every already-executed package
 * in reverse order and aborts.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const EXECUTE = argv.includes('--execute');
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

const MANIFEST = value('--manifest', 'data/buildops/combined-zones-r02-d06-shell.release-manifest.json');
const AUTHORIZATION = value('--authorization', 'data/buildops/combined-zones-r02-d06-shell.release-authorization.json');
const ENTITY_GATE = value('--entity-gate', 'data/buildops/combined-zones-r02-d06-shell.entity-gate.json');
const MANIFEST_QA = value('--manifest-qa', 'data/world-review/combined-zones-r02-d06-shell.manifest-qa.json');
const T02 = value('--t02', 'data/world-review/combined-zones-r02-d06-shell.ownership-interface-audit.json');

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
function invariant(condition, message) {
  if (!condition) throw new Error(`R02 D06 release wrapper rejected: ${message}`);
}
const stripHeader = (raw) => `${raw.split('\n').filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
const bodyHash = (p) => crypto.createHash('sha256')
  .update(stripHeader(fs.readFileSync(path.join(ROOT, p), 'utf8'))).digest('hex');

const manifest = readJson(MANIFEST);
const authorization = readJson(AUTHORIZATION);
const manifestQa = readJson(MANIFEST_QA);
const t02 = readJson(T02);

invariant(authorization.status === 'AUTHORIZED_SINGLE_EXECUTION_HASH_BOUND',
  'authorization record is not in the authorized state');
invariant(Date.now() < Date.parse(authorization.expiresAtUtc), 'authorization has expired');
invariant(authorization.boundIdentities.manifestIdentity === manifest.manifestIdentity,
  'authorization is bound to a different manifest');
invariant(manifestQa.status === 'PASS', 'G09 manifest QA is not PASS');
invariant(/^PASS/.test(t02.status) && t02.manifestIdentity === manifest.manifestIdentity,
  'T02 audit missing, failing, or bound to a different manifest');
invariant(Array.isArray(manifest.packages) && manifest.packages.length >= 1,
  'manifest has no packages');

for (const pkg of manifest.packages) {
  const boundPkg = authorization.boundIdentities.packages
    ?.find((entry) => entry.key === pkg.key);
  invariant(boundPkg, `authorization does not bind package ${pkg.key}`);
  invariant(bodyHash(pkg.forward) === boundPkg.forwardSha256,
    `${pkg.key} forward drifted from its bound identity`);
  invariant(bodyHash(pkg.rollback) === boundPkg.rollbackSha256,
    `${pkg.key} rollback drifted from its bound identity`);
}

const entityGate = readJson(ENTITY_GATE);
const gateGeneratedAt = Date.parse(entityGate.generatedAtUtc ?? entityGate.generatedAt
  ?? entityGate.timestampUtc ?? entityGate.completedAtUtc ?? 0);
invariant(Number.isFinite(gateGeneratedAt) && gateGeneratedAt > 0,
  'entity gate report has no readable timestamp');
invariant(Date.now() - gateGeneratedAt <= 300_000,
  'entity gate report is older than 300 seconds');
const gateTotals = entityGate.totals ?? entityGate.summary ?? {};
invariant((gateTotals.blockingEntityHits ?? 1) === 0
  && (gateTotals.failed ?? 1) === 0
  && entityGate.passed !== false,
'entity gate reports blockers or failures');
const gateText = JSON.stringify(entityGate);
invariant(manifest.packages.every((pkg) => gateText.includes(pkg.forward)),
  'entity gate is not bound to every forward package');

console.log(JSON.stringify({
  preExecutionChecks: 'ALL_IDENTITY_AND_GATE_CHECKS_PASS',
  manifestIdentity: manifest.manifestIdentity,
  packageOrder: manifest.packages.map(({ key }) => key),
  entityGateAgeSeconds: Math.round((Date.now() - gateGeneratedAt) / 1000),
  execute: EXECUTE,
}, null, 2));

if (!EXECUTE) {
  console.log('Dry verification only; pass --execute to run the release.');
  process.exit(0);
}

const run = (key, role, file) => spawnSync('python3', [
  'scripts/rcon_runner.py', file,
  '--strict-noop',
  '--operation-role', role,
  '--report', `data/buildops/combined-zones-r02-d06-shell.${key}.${role}.execution.json`,
  '--stream-journal', `data/buildops/combined-zones-r02-d06-shell.${key}.${role}.execution.stream-journal.jsonl`,
], { cwd: ROOT, stdio: 'inherit', timeout: 60 * 60 * 1000 });

const executed = [];
for (const pkg of manifest.packages) {
  console.log(`--- executing forward package: ${pkg.key} ---`);
  const result = run(pkg.key, 'forward', pkg.forward);
  if (result.status !== 0) {
    console.error(`FORWARD FAILED for ${pkg.key} (exit ${result.status}); rolling back in reverse order.`);
    for (const done of [pkg, ...executed].reverse()) {
      const rollbackResult = run(done.key, 'rollback', done.rollback);
      invariant(rollbackResult.status === 0,
        `rollback of ${done.key} also failed (exit ${rollbackResult.status}); MANUAL INTERVENTION REQUIRED`);
    }
    console.error('Rollback completed cleanly after forward failure.');
    process.exit(1);
  }
  executed.push(pkg);
}
console.log('All forward packages executed cleanly.');
