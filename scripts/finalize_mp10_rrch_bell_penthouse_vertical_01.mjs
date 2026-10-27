#!/usr/bin/env node
/** Seal MP10's five-cell bell/penthouse circulation repair only after all evidence passes. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = process.cwd();
const RELEASE = '20260826T122519Z';
const EVIDENCE = `data/world-review/mp10-bell-penthouse-live-${RELEASE}`;
const FORWARD = `data/buildops/mp10-rrch-bell-penthouse-vertical-01-live-${RELEASE}.forward.txt`;
const ROLLBACK = `data/buildops/mp10-rrch-bell-penthouse-vertical-01-live-${RELEASE}.rollback.txt`;
const MANIFEST = `data/buildops/mp10-rrch-bell-penthouse-vertical-01-live-${RELEASE}.release-manifest.json`;
const absolute = (p) => path.resolve(ROOT, p);
const read = (p) => JSON.parse(fs.readFileSync(absolute(p), 'utf8'));
const sha = (data) => crypto.createHash('sha256').update(data).digest('hex');
const bind = (p) => ({ path: p, sha256: sha(fs.readFileSync(absolute(p))), bytes: fs.statSync(absolute(p)).size });
const expect = (p, status) => { const item = read(p); if (item.status !== status) throw new Error(`${p}: ${item.status} != ${status}`); return item; };
const source = expect(`${EVIDENCE}/source-complete-save-intake.json`, 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE');
const post = expect(`${EVIDENCE}/post-complete-save-intake.json`, 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE');
for (const p of ['forward-source-preflight.json','projected-rollback-preflight.json','block-entity-clearance.json','pre-execution-live-entity-clearance.json','same-moment-live-entity-clearance.json','rollback-poststate-preflight.json','projected-route-qa.json','independent-post-route-qa.json']) expect(`${EVIDENCE}/${p}`, 'PASS');
for (const p of ['forward-strict-dry-run.json','rollback-strict-dry-run.json']) { const item = expect(`${EVIDENCE}/${p}`, 'dry_run'); if (item.strictNoop !== true || item.failedGroups !== 0 || item.noopCommands !== 0) throw new Error(`${p} strict parser failed`); }
const execution = expect(`${EVIDENCE}/forward-execution.json`, 'complete');
if (execution.strictNoop !== true || execution.successfulCommands !== 5 || execution.failedGroups !== 0 || execution.noopCommands !== 0) throw new Error('strict execution did not change exactly five cells');
for (const p of ['projected-route-qa.json','independent-post-route-qa.json']) { const item = read(`${EVIDENCE}/${p}`); if (item.routeSummary?.directions !== 20 || item.routeSummary?.passed !== 20 || item.protectedFailures?.length !== 0) throw new Error(`${p} does not prove all routes/protected states`); }
const sourceId = read(`${EVIDENCE}/source-snapshot-identity.json`);
const postId = read(`${EVIDENCE}/post-snapshot-identity.json`);
const files = fs.readdirSync(absolute(EVIDENCE)).filter((name) => name !== 'evidence-ledger.json').sort().map((name) => `${EVIDENCE}/${name}`);
const ledger = {
  schemaVersion: 1,
  id: 'mp10-rrch-bell-penthouse-vertical-01-guarded-release',
  status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
  releaseId: 'MP10-RRCH-BELL-PENTHOUSE-VERTICAL-01',
  sourceSnapshot: { root: 'data/worldsnap-mp10-bell-penthouse-source-20260826T122519Z', completeSaveSha256: source.packageIdentity.completeSaveSha256, regionSha256: sourceId.sha256 },
  postSnapshot: { root: 'data/worldsnap-mp10-bell-penthouse-post-20260826T123537Z', completeSaveSha256: post.packageIdentity.completeSaveSha256, regionSha256: postId.sha256 },
  operation: { forward: bind(FORWARD), rollback: bind(ROLLBACK), exactInverse: true, strictForwardExecution: bind(`${EVIDENCE}/forward-execution.json`) },
  acceptance: { targetCells: 5, retainedProtectedStates: ['bell','third-floor sign','penthouse sign','bell ceiling support','penthouse sign wall support'], directedRouteChecks: '20/20', accessClass: 'Ravensreach civic circulation', nonClaims: ['complete civic programme','public certification','citywide accessibility'] },
  evidenceBindings: [MANIFEST, FORWARD, ROLLBACK, ...files].map(bind),
};
ledger.completedReleaseIdentitySha256 = sha(JSON.stringify({ source: ledger.sourceSnapshot, post: ledger.postSnapshot, forward: ledger.operation.forward.sha256, rollback: ledger.operation.rollback.sha256, evidence: ledger.evidenceBindings.map(({ path, sha256 }) => ({ path, sha256 })) }));
fs.writeFileSync(absolute(`${EVIDENCE}/evidence-ledger.json`), `${JSON.stringify(ledger, null, 2)}\n`);
console.log(JSON.stringify({ status: ledger.status, ledger: `${EVIDENCE}/evidence-ledger.json`, identity: ledger.completedReleaseIdentitySha256 }, null, 2));
