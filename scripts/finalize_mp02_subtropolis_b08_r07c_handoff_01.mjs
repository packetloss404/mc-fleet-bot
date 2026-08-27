#!/usr/bin/env node
/** Seal the MP02 B08 R07C-ramp-handoff guarded release from immutable evidence. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const RELEASE = process.argv[2] ?? '20260826T120613Z';
const EVIDENCE = `data/world-review/mp02-b08-r07c-handoff-live-${RELEASE}`;
const SOURCE = `data/worldsnap-mp02-b08-r07c-handoff-source-${RELEASE}`;
const POST = 'data/worldsnap-mp02-b08-r07c-handoff-post-20260826T120820Z';
const BASENAME = `mp02-subtropolis-b08-service-spine-01-r07c-ramp-handoff-live-${RELEASE}`;
const FORWARD = `data/buildops/${BASENAME}.forward.txt`;
const ROLLBACK = `data/buildops/${BASENAME}.rollback.txt`;
const MANIFEST = `data/buildops/${BASENAME}.release-manifest.json`;
const absolute = (filename) => path.resolve(ROOT, filename);
const read = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const bind = (filename) => ({
  path: filename,
  sha256: sha256(fs.readFileSync(absolute(filename))),
  bytes: fs.statSync(absolute(filename)).size,
});
const expect = (filename, status) => {
  const record = read(filename);
  if (record.status !== status) throw new Error(`${filename}: ${record.status} !== ${status}`);
  return record;
};

const sourceIntake = expect(`${EVIDENCE}/source-complete-save-intake.json`, 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE');
const postIntake = expect(`${EVIDENCE}/post-complete-save-intake.json`, 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE');
for (const filename of [
  'forward-source-preflight.json',
  'projected-rollback-preflight.json',
  'block-entity-clearance.json',
  'pre-execution-live-entity-clearance.json',
  'same-moment-live-entity-clearance.json',
  'rollback-poststate-preflight.json',
  'independent-r07c-handoff-post-qa.json',
]) expect(`${EVIDENCE}/${filename}`, 'PASS');
for (const filename of ['forward-strict-dry-run.json', 'rollback-strict-dry-run.json']) {
  const record = expect(`${EVIDENCE}/${filename}`, 'dry_run');
  if (record.strictNoop !== true || record.failedGroups !== 0 || record.noopCommands !== 0) {
    throw new Error(`${filename} is not a zero-noop strict parser pass`);
  }
}
const execution = expect(`${EVIDENCE}/forward-execution.json`, 'complete');
if (execution.strictNoop !== true || execution.successfulCommands !== 719 || execution.failedGroups !== 0 || execution.noopCommands !== 0) {
  throw new Error('forward execution is not the expected 719-command strict transaction');
}
const manifest = read(MANIFEST);
if (manifest.target?.serviceFloor?.cellCount !== 719
  || manifest.acceptedInterfaces?.r07cRouteOpenings?.operatedOverlap?.cellCount !== 0
  || manifest.routeAcceptance?.result !== 'PASS'
  || manifest.routeAcceptance?.stationCount !== 125
  || manifest.routeAcceptance?.contactLanding?.width !== 6
  || manifest.routeAcceptance?.contactLanding?.depth !== 3
  || manifest.operations?.exactInverse !== true) {
  throw new Error('manifest does not prove the exact R07C-handoff release boundary');
}
const postQa = read(`${EVIDENCE}/independent-r07c-handoff-post-qa.json`);
if (postQa.targetVerification?.expected !== 719
  || postQa.targetVerification?.derived !== 719
  || postQa.targetVerification?.targetDerivationFailures?.length !== 0
  || postQa.targetVerification?.targetStateFailures?.length !== 0
  || postQa.retainedR07cOpenings?.expected !== 10
  || postQa.retainedR07cOpenings?.stateFailures?.length !== 0
  || postQa.downstreamProtectedScope?.operationTargetTouches?.length !== 0
  || postQa.downstreamProtectedScope?.sourcePostDrift?.length !== 0
  || postQa.route?.stationCount !== 125
  || postQa.route?.routeFailures?.length !== 0
  || postQa.contactLanding?.cellCount !== 18
  || postQa.contactLanding?.failures?.length !== 0) {
  throw new Error('independent post QA does not prove targets, retained openings, exclusion, and route');
}
const sourceIdentity = read(`${EVIDENCE}/source-snapshot-identity.json`);
const postIdentity = read(`${EVIDENCE}/post-snapshot-identity.json`);
const evidenceFiles = fs.readdirSync(absolute(EVIDENCE))
  .filter((name) => name !== 'evidence-ledger.json')
  .sort()
  .map((name) => `${EVIDENCE}/${name}`);
const ledger = {
  schemaVersion: 1,
  id: 'mp02-subtropolis-b08-r07c-ramp-handoff-01-guarded-release',
  status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
  releaseId: 'MP02-SUBTROPOLIS-B08-SERVICE-SPINE-01-R07C-RAMP-HANDOFF',
  transactionId: manifest.transactionId,
  sourceSnapshot: {
    root: SOURCE,
    completeSaveSha256: sourceIntake.packageIdentity.completeSaveSha256,
    regionSha256: sourceIdentity.sha256,
  },
  postSnapshot: {
    root: POST,
    completeSaveSha256: postIntake.packageIdentity.completeSaveSha256,
    regionSha256: postIdentity.sha256,
  },
  operation: { forward: bind(FORWARD), rollback: bind(ROLLBACK), exactInverse: true, strictForwardExecution: bind(`${EVIDENCE}/forward-execution.json`) },
  acceptance: {
    targetCells: 719,
    normalWalkRouteStations: 125,
    landing: '6x3',
    retainedR07COpeningCells: 10,
    accessClass: 'RESTRICTED_SERVICE_ONLY',
    nonClaims: ['public opening', 'tenant area', 'vehicle route', 'B03/B09 connection', 'completed SubTropolis'],
  },
  evidenceBindings: [MANIFEST, FORWARD, ROLLBACK, ...evidenceFiles].map(bind),
};
ledger.completedReleaseIdentitySha256 = sha256(JSON.stringify({
  source: ledger.sourceSnapshot,
  post: ledger.postSnapshot,
  forward: ledger.operation.forward.sha256,
  rollback: ledger.operation.rollback.sha256,
  evidence: ledger.evidenceBindings.map(({ path: evidencePath, sha256: evidenceSha }) => ({ path: evidencePath, sha256: evidenceSha })),
}));
fs.writeFileSync(absolute(`${EVIDENCE}/evidence-ledger.json`), `${JSON.stringify(ledger, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: ledger.status, ledger: `${EVIDENCE}/evidence-ledger.json`, completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256 }, null, 2)}\n`);
