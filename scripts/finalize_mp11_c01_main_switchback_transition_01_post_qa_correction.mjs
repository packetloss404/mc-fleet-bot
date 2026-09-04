#!/usr/bin/env node
/** Finalizes the immutable-post C01 release ledger after the exact wall-state QA correction. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd(); const args = process.argv.slice(2);
const opt = (flag, fallback) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const ledgerPath = opt('--ledger', 'data/world-review/mp11-c01-main-switchback-transition-01-live-20260827T055000Z/mp11-c01-main-switchback-transition-01-guarded-release-ledger.json');
const qaPath = opt('--corrected-qa', 'data/world-review/mp11-c01-main-switchback-transition-01-live-20260827T055000Z/independent-post-release-qa-corrected/mp11-c01-main-switchback-transition-01-post-qa.json');
const initialQaPath = opt('--initial-qa', 'data/world-review/mp11-c01-main-switchback-transition-01-live-20260827T055000Z/independent-post-release-qa/mp11-c01-main-switchback-transition-01-post-qa.json');
const abs = (value) => path.resolve(ROOT, value); const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(fs.readFileSync(abs(value))).digest('hex'); const read = (value) => JSON.parse(fs.readFileSync(abs(value), 'utf8'));
const fail = (ok, message) => { if (!ok) throw new Error(`C01 main-switchback post-QA finalizer rejected: ${message}`); };
for (const required of [ledgerPath, qaPath, initialQaPath]) fail(fs.existsSync(abs(required)), `missing ${required}`);
const ledger = read(ledgerPath), qa = read(qaPath), initialQa = read(initialQaPath);
fail(ledger.releaseId === 'MP11-C01-MAIN-SWITCHBACK-TRANSITION-01' && ledger.status === 'EXECUTED_PENDING_INDEPENDENT_POST_QA', 'ledger is not the pending C01 main-switchback release');
fail(qa.status === 'PASS_C01_MAIN_SWITCHBACK_TRANSITION_IMMUTABLE_POST_QA' && qa.readOnly === true && qa.worldMutated === false && qa.checks?.canonicalPostStates?.passed === true && qa.checks?.mainAndReturn02FiveWideFiveClear?.passed === true && qa.checks?.retainedReturn02?.passed === true, 'corrected QA is not a full immutable-post pass');
fail(initialQa.status === 'FAIL_C01_MAIN_SWITCHBACK_TRANSITION_IMMUTABLE_POST_QA' && initialQa.checks?.canonicalPostStates?.hits?.length === 100 && initialQa.checks?.dryGravitySafe?.passed === true && initialQa.checks?.mainAndReturn02FiveWideFiveClear?.passed === true && initialQa.checks?.retainedReturn02?.passed === true, 'initial QA is not the exact 100-wall canonical-state-only finding');
const requiredStages = ['fresh-source-complete-save', 'source-complete-save-intake', 'fresh-main-switchback-transition-rebind', 'fresh-main-switchback-compiler', 'exact-forward-source-preflight', 'strict-forward-parser', 'strict-rollback-parser', 'projected-rollback-preflight', 'block-entity-and-protected-core-clearance', 'same-moment-live-entity-clearance', 'strict-forward-execution', 'fresh-post-complete-save', 'post-complete-save-intake', 'rollback-poststate-preflight'];
for (const stage of requiredStages) fail(ledger.stages?.some((entry) => entry.stage === stage && entry.status === 'PASS'), `missing passed stage ${stage}`);
ledger.postQaCorrection = { initialQa: { path: rel(initialQaPath), sha256: sha(initialQaPath), canonicalStateFailureCount: 100 }, correctedQa: { path: rel(qaPath), sha256: sha(qaPath) }, resolution: 'Minecraft normalized all 100 exact placed polished-deepslate wall guards from the bare source-design material state to the deterministic full isolated-wall connection state east=none,north=none,south=none,up=true,waterlogged=false,west=none. The correction changes no world cell and accepts only that exact final state for existing manifest guard targets.', worldMutationPerformedForCorrection: false };
ledger.status = 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'; ledger.independentPostQa = { path: rel(qaPath), sha256: sha(qaPath) }; ledger.completedAtUtc = new Date().toISOString();
fs.writeFileSync(abs(ledgerPath), `${JSON.stringify(ledger, null, 2)}\n`);
console.log(JSON.stringify({ status: ledger.status, ledger: rel(ledgerPath), correctedQa: rel(qaPath), mutationAuthority: false, worldMutatedForCorrection: false }, null, 2));
