#!/usr/bin/env node
/** Seal a completed MP02 B08 service-spine release from its immutable evidence. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const release = process.argv[2] ?? '20260826T102000Z';
const evidence = `data/world-review/mp02-b08-service-spine-01-live-${release}`;
const source = `data/worldsnap-mp02-b08-source-${release}`;
const post = `data/worldsnap-mp02-b08-post-${release}`;
const forward = `data/buildops/mp02-subtropolis-b08-service-spine-01-live-${release}.forward.txt`;
const rollback = `data/buildops/mp02-subtropolis-b08-service-spine-01-live-${release}.rollback.txt`;
const manifest = `data/buildops/mp02-subtropolis-b08-service-spine-01-live-${release}.release-manifest.json`;
const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const bind = (filename) => ({ path: filename, sha256: sha256(fs.readFileSync(absolute(filename))), bytes: fs.statSync(absolute(filename)).size });
const read = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const requireStatus = (filename, expected) => {
  const record = read(filename);
  if (record.status !== expected) throw new Error(`${filename} is ${record.status}, expected ${expected}`);
  return record;
};

const sourceIntake = requireStatus(`${evidence}/source-complete-save-intake.json`, 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE');
const postIntake = requireStatus(`${evidence}/post-complete-save-intake.json`, 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE');
for (const filename of [
  `${evidence}/exact-release-manifest-qa.json`,
  `${evidence}/forward-source-preflight.json`,
  `${evidence}/projected-rollback-preflight.json`,
  `${evidence}/block-entity-clearance.json`,
  `${evidence}/pre-execution-live-entity-clearance.json`,
  `${evidence}/rollback-poststate-preflight.json`,
  `${evidence}/independent-post-qa.json`,
]) requireStatus(filename, 'PASS');
const execution = requireStatus(`${evidence}/forward-execution.json`, 'complete');
if (execution.strictNoop !== true || execution.sourceOperationCount !== 729 || execution.commandCount !== 729) {
  throw new Error('forward execution is not the expected 729-command strict transaction');
}
const sourceIdentity = read(`${evidence}/source-snapshot-identity.json`);
const postIdentity = read(`${evidence}/post-snapshot-identity.json`);
const manifestRecord = read(manifest);
if (manifestRecord.ownership?.acceptedRouteOpeningOverlapCount !== 0) {
  throw new Error('accepted R07C route-opening ownership has not been explicitly cleared');
}
const bindings = [manifest, forward, rollback, ...fs.readdirSync(absolute(evidence))
  .filter((name) => name !== 'evidence-ledger.json')
  .sort()
  .map((name) => `${evidence}/${name}`)];
const ledger = {
  schemaVersion: 1,
  id: 'mp02-subtropolis-b08-service-spine-01-guarded-release',
  status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
  releaseId: 'MP02-SUBTROPOLIS-B08-SERVICE-SPINE-01',
  transactionId: manifestRecord.transactionId,
  sourceSnapshot: { root: source, completeSaveSha256: sourceIntake.packageIdentity.completeSaveSha256, regionSha256: sourceIdentity.sha256 },
  postSnapshot: { root: post, completeSaveSha256: postIntake.packageIdentity.completeSaveSha256, regionSha256: postIdentity.sha256 },
  operation: { forward: bind(forward), rollback: bind(rollback), exactInverse: true, strictForwardExecution: bind(`${evidence}/forward-execution.json`) },
  acceptance: {
    targetCells: 729,
    normalWalkRouteStations: 123,
    accessClass: 'RESTRICTED_SERVICE_ONLY',
    nonClaims: ['public opening', 'tenant area', 'vehicle route', 'B03/B09 connection', 'completed SubTropolis'],
  },
  evidenceBindings: bindings.map(bind),
};
ledger.completedReleaseIdentitySha256 = sha256(JSON.stringify({
  source: ledger.sourceSnapshot,
  post: ledger.postSnapshot,
  forward: ledger.operation.forward.sha256,
  rollback: ledger.operation.rollback.sha256,
  evidence: ledger.evidenceBindings.map(({ path: evidencePath, sha256: evidenceSha }) => ({ path: evidencePath, sha256: evidenceSha })),
}));
fs.writeFileSync(absolute(`${evidence}/evidence-ledger.json`), `${JSON.stringify(ledger, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: ledger.status, ledger: `${evidence}/evidence-ledger.json`, completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256 }, null, 2)}\n`);
