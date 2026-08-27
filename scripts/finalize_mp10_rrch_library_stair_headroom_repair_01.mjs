#!/usr/bin/env node
/** Bind the guarded MP10 library stair repair evidence into one acceptance ledger. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const tag = '20260826T112133Z';
const evidence = `data/world-review/mp10-rrch-library-stair-repair-live-${tag}`;
const source = `data/worldsnap-mp10-rrch-library-stair-repair-source-20260826T114500Z`;
const post = `data/worldsnap-mp10-rrch-library-stair-repair-post-${tag}`;
const manifest = `data/buildops/mp10-rrch-library-stair-repair-live-${tag}.release-manifest.json`;
const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const read = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const bind = (filename) => ({ path: filename, sha256: sha256(fs.readFileSync(absolute(filename))), bytes: fs.statSync(absolute(filename)).size });
const expect = (filename, status) => {
  const value = read(filename);
  if (value.status !== status) throw new Error(`${filename}: ${value.status} != ${status}`);
  return value;
};

const sourceIntake = expect(`${evidence}/source-complete-save-intake.json`, 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE');
const postIntake = expect(`${evidence}/post-complete-save-intake.json`, 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE');
for (const filename of [
  'forward-source-preflight.json', 'projected-rollback-preflight.json',
  'rollback-poststate-preflight.json', 'block-entity-clearance.json',
  'pre-execution-live-entity-clearance.json', 'same-moment-live-entity-clearance.json',
]) expect(`${evidence}/${filename}`, 'PASS');
for (const filename of ['forward-strict-dry-run.json', 'rollback-strict-dry-run.json']) expect(`${evidence}/${filename}`, 'dry_run');
const execution = expect(`${evidence}/forward-execution.json`, 'complete');
if (execution.strictNoop !== true || execution.successfulGroups !== 7 || execution.successfulCommands !== 7
  || execution.noopCommands !== 0 || execution.failedGroups !== 0 || execution.failedCommands !== 0
  || execution.unexpectedNoopCommands !== 0 || execution.worldEditLeftoverCount !== 0) {
  throw new Error('forward execution is not an exact strict seven-group zero-noop release');
}
const projectedQa = read(`${evidence}/projected-route-qa.json`);
const postQa = read(`${evidence}/independent-post-route-qa.json`);
if (projectedQa.total !== 7 || projectedQa.passed !== 7 || projectedQa.failed !== 0
  || postQa.total !== 7 || postQa.passed !== 7 || postQa.failed !== 0 || postQa.mode !== 'saved-world') {
  throw new Error('projected or post-release seven-route functional QA failed');
}
const releaseManifest = read(manifest);
if (releaseManifest.target.cells.cellCount !== 7 || !releaseManifest.target.exactInverse
  || releaseManifest.functionalAcceptance.passed !== 7 || releaseManifest.functionalAcceptance.routeSuites !== 7) {
  throw new Error('manifest does not bind the exact 7-cell route repair');
}
const sourceIdentity = read(`${evidence}/source-snapshot-identity.json`);
const postIdentity = read(`${evidence}/post-snapshot-identity.json`);
const files = [manifest, ...fs.readdirSync(absolute(evidence)).filter((name) => name !== 'evidence-ledger.json').sort().map((name) => `${evidence}/${name}`)];
const ledger = {
  schemaVersion: 1,
  id: 'mp10-rrch-library-stair-headroom-repair-guarded-release',
  status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
  transactionId: releaseManifest.transactionId,
  releaseId: releaseManifest.releaseId,
  sourceSnapshot: { root: source, completeSaveSha256: sourceIntake.packageIdentity.completeSaveSha256, regionSha256: sourceIdentity.sha256 },
  postSnapshot: { root: post, completeSaveSha256: postIntake.packageIdentity.completeSaveSha256, regionSha256: postIdentity.sha256 },
  manifest: bind(manifest),
  acceptance: {
    exactTargetCells: 7,
    staleHeadroomTreadsCleared: 5,
    B3LandingCellsRestored: 2,
    strictChangedGroups: 7,
    normalWalkRouteSuites: { projected: '7/7', postState: '7/7', standard: releaseManifest.functionalAcceptance.standard },
    rollbackPoststatePreflight: '7/7 guarded inverse transitions pass',
    nonClaims: ['No new room programme, public-access certification, cross-district route, or whole Ravensreach completion claim.', 'The release restores the measured library stair headroom and B3 landing only.'],
  },
  evidenceBindings: files.map(bind),
};
ledger.completedReleaseIdentitySha256 = sha256(JSON.stringify({ source: ledger.sourceSnapshot, post: ledger.postSnapshot, manifest: ledger.manifest.sha256, evidence: ledger.evidenceBindings.map(({ path: filename, sha256: hash }) => ({ path: filename, sha256: hash })) }));
fs.writeFileSync(absolute(`${evidence}/evidence-ledger.json`), `${JSON.stringify(ledger, null, 2)}\n`);
console.log(JSON.stringify({ status: ledger.status, ledger: `${evidence}/evidence-ledger.json`, completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256 }, null, 2));
