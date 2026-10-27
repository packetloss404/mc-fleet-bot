#!/usr/bin/env node
/** Bind the complete guarded evidence set for MP08-RR-T1B-WAYFINDING-01. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const tag = '20260826T104858Z';
const evidence = `data/world-review/mp08-rr-t1b-wayfinding-live-${tag}`;
const source = 'data/worldsnap-mp08-rr-t1b-wayfinding-source-20260826T130000Z';
const post = `data/worldsnap-mp08-rr-t1b-wayfinding-post-${tag}`;
const manifest = `data/buildops/mp08-rr-t1b-two-wall-sign-wayfinding-live-${tag}.release-manifest.json`;
const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const read = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const bind = (filename) => ({
  path: filename,
  sha256: sha256(fs.readFileSync(absolute(filename))),
  bytes: fs.statSync(absolute(filename)).size,
});
const expect = (filename, status) => {
  const value = read(filename);
  if (value.status !== status) throw new Error(`${filename}: ${value.status} != ${status}`);
  return value;
};

const sourceIntake = expect(`${evidence}/source-complete-save-intake.json`, 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE');
const postIntake = expect(`${evidence}/post-complete-save-intake.json`, 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE');
for (const filename of [
  'manifest-qa.json',
  'two-wall-signs.forward-source-preflight.json',
  'two-wall-signs.projected-rollback-preflight.json',
  'two-wall-signs.rollback-poststate-preflight.json',
  'block-entity-clearance.json',
  'pre-execution-live-entity-clearance.json',
  'two-wall-signs.same-moment-live-entity-clearance.json',
]) expect(`${evidence}/${filename}`, 'PASS');
for (const filename of [
  'two-wall-signs.forward-strict-dry-run.json',
  'two-wall-signs.rollback-strict-dry-run.json',
]) expect(`${evidence}/${filename}`, 'dry_run');
const execution = expect(`${evidence}/two-wall-signs.forward-execution.json`, 'complete');
if (execution.strictNoop !== true || execution.successfulGroups !== 4
  || execution.successfulCommands !== 4 || execution.noopCommands !== 0
  || execution.failedGroups !== 0 || execution.failedCommands !== 0
  || execution.unexpectedNoopCommands !== 0 || execution.worldEditLeftoverCount !== 0) {
  throw new Error('forward execution is not an exact strict four-group zero-noop release');
}
expect(`${evidence}/independent-post-qa.json`, 'PASS_POST_RELEASE_SIGN_AND_ROUTE_QA');

const sourceIdentity = read(`${evidence}/source-snapshot-identity.json`);
const postIdentity = read(`${evidence}/post-snapshot-identity.json`);
const releaseManifest = read(manifest);
const operation = releaseManifest.operations['two-wall-signs'];
if (operation.forwardCommandCount !== 4 || operation.rollbackCommandCount !== 4
  || operation.blockTransitions !== 2 || operation.guardedDataMerges.forward !== 2
  || operation.guardedDataMerges.rollback !== 2 || !operation.exactStateAndNbtInverse) {
  throw new Error('manifest does not carry the exact two-sign state/NBT inverse contract');
}
const files = [manifest, ...fs.readdirSync(absolute(evidence))
  .filter((name) => name !== 'evidence-ledger.json').sort()
  .map((name) => `${evidence}/${name}`)];
const ledger = {
  schemaVersion: 1,
  id: 'mp08-rr-t1b-two-wall-sign-wayfinding-guarded-release',
  status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
  transactionId: releaseManifest.transactionId,
  releaseId: releaseManifest.scope.releaseId,
  sourceSnapshot: {
    root: source,
    completeSaveSha256: sourceIntake.packageIdentity.completeSaveSha256,
    regionSha256: sourceIdentity.sha256,
  },
  postSnapshot: {
    root: post,
    completeSaveSha256: postIntake.packageIdentity.completeSaveSha256,
    regionSha256: postIdentity.sha256,
  },
  manifest: bind(manifest),
  acceptance: {
    signsInstalled: 2,
    exactBlockTransitions: 2,
    exactGuardedNbtWrites: 2,
    normalWalkCore: { stations: 76, width: 3, preserved: true },
    strictChangedGroups: 4,
    rollbackPoststatePreflight: '2/2 guarded rollback state transitions pass',
    nonClaims: [
      'No excavation, containment, C2/Cavern-C/RR-N6/T4 work, public opening, accessibility certification, or whole Raven Rock completion claim.',
      'The release changes only the two bound wayfinding signs and leaves the measured route core unmodified.',
    ],
  },
  evidenceBindings: files.map(bind),
};
ledger.completedReleaseIdentitySha256 = sha256(JSON.stringify({
  source: ledger.sourceSnapshot,
  post: ledger.postSnapshot,
  manifest: ledger.manifest.sha256,
  evidence: ledger.evidenceBindings.map(({ path: filename, sha256: hash }) => ({ path: filename, sha256: hash })),
}));
fs.writeFileSync(absolute(`${evidence}/evidence-ledger.json`), `${JSON.stringify(ledger, null, 2)}\n`);
console.log(JSON.stringify({
  status: ledger.status,
  ledger: `${evidence}/evidence-ledger.json`,
  completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
}, null, 2));
