#!/usr/bin/env node
/** Fresh-kernel wrapper for MP11/BKR C01 independent return. Default: prepare only. */
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd(); const RELEASE = 'MP11-BKR-C01-INDEPENDENT-RETURN-01';
const args = process.argv.slice(2); const has = (flag) => args.includes(flag);
const option = (flag, fallback = null) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const abs = (value) => path.resolve(ROOT, value); const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(abs(file))).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`${RELEASE} fresh kernel rejected: ${message}`); };
const execute = has('--execute'); const outDir = option('--out-dir'); const sourceRoot = option('--source-snapshot-root'); const postRoot = option('--post-snapshot-root');
const authorizationPath = option('--authorization', 'docs/masterplans/11-town-expansion-r1/mp11-bkr-c01-independent-return-governor-standing-execution-authorization.json');
fail(outDir && sourceRoot, '--out-dir and --source-snapshot-root are required'); fail(!fs.existsSync(abs(outDir)), '--out-dir must be fresh');
if (execute) fail(postRoot && !fs.existsSync(abs(sourceRoot)) && !fs.existsSync(abs(postRoot)), '--execute requires fresh nonexistent source/post destinations'); else fail(fs.existsSync(abs(sourceRoot)), 'prepare mode requires an existing immutable source snapshot');
const authorization = JSON.parse(fs.readFileSync(abs(authorizationPath), 'utf8'));
fail(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION' && authorization.revoked === false && authorization.authorizedReleaseId === RELEASE, 'standing authorization is absent, revoked, or does not bind this release');
fs.mkdirSync(abs(outDir), { recursive: true }); const ledgerPath = path.join(abs(outDir), 'fresh-kernel-ledger.json');
const ledger = { schemaVersion: 1, id: `${RELEASE}-FRESH-KERNEL`, releaseId: RELEASE, mode: execute ? 'EXECUTE' : 'PREPARE_ONLY', status: 'RUNNING', authorization: { path: rel(authorizationPath), sha256: sha(authorizationPath) }, stages: [] };
const save = () => fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
const run = (stage, command, commandArgs) => { const result = spawnSync(command, commandArgs, { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }); const record = { stage, command: [command, ...commandArgs], status: result.status === 0 ? 'PASS' : 'FAIL', stdoutTail: String(result.stdout ?? '').slice(-8000), stderrTail: String(result.stderr ?? '').slice(-8000) }; ledger.stages.push(record); save(); if (result.status !== 0) throw new Error(`${stage} failed: ${record.stderrTail || record.stdoutTail}`); };
try {
  if (execute) run('fresh-source-complete-save', 'python3', ['scripts/capture_combined_zones_complete_save.py', '--execute', '--dest', sourceRoot]);
  for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(abs(sourceRoot), member)), `source missing ${member}`);
  const review = path.join(abs(outDir), 'rebound-review'); const survey = path.join(review, 'survey'); const topology = path.join(review, 'topology'); const feasibility = path.join(review, 'feasibility'); const contract = path.join(review, 'acceptance'); const buildops = path.join(abs(outDir), 'rebound-buildops');
  run('fresh-bkr-survey', process.execPath, ['scripts/survey_bkr_00.mjs', '--snapshot', sourceRoot, '--out-dir', survey]);
  run('fresh-expanded-topology-gate', process.execPath, ['scripts/survey_mp11_bkr_c01_portal_topology_and_second_return_03.mjs', '--snapshot', sourceRoot, '--survey', path.join(survey, 'bkr-survey-00.json'), '--out', topology]);
  run('fresh-finite-return-feasibility', process.execPath, ['scripts/design_mp11_bkr_c01_finite_independent_return_feasibility_01.mjs', '--snapshot', sourceRoot, '--survey', path.join(survey, 'bkr-survey-00.json'), '--topology', path.join(topology, 'mp11-bkr-c01-portal-topology-second-return-03.json'), '--out', feasibility]);
  run('fresh-return-interface-contract', process.execPath, ['scripts/design_mp11_bkr_c01_independent_return_acceptance_contract_01.mjs', '--feasibility', path.join(feasibility, 'mp11-bkr-c01-finite-independent-return-feasibility-01.json'), '--out', contract]);
  run('fresh-source-compiler-rebind', process.execPath, ['scripts/compile_mp11_bkr_c01_independent_return_01.mjs', '--snapshot', sourceRoot, '--contract', path.join(contract, 'mp11-bkr-c01-independent-return-acceptance-contract-01.json'), '--auth', authorizationPath, '--out', buildops]);
  const manifest = path.join(buildops, 'mp11-bkr-c01-independent-return-01.manifest.json'); const forward = path.join(buildops, 'mp11-bkr-c01-independent-return-01.forward.txt'); const rollback = path.join(buildops, 'mp11-bkr-c01-independent-return-01.rollback.txt'); const regions = path.join(abs(sourceRoot), 'region');
  run('forward-source-preflight', process.execPath, ['scripts/preflight_guarded_ops.mjs', forward, '--regions', regions, '--report', path.join(abs(outDir), 'forward-source-preflight.json')]);
  run('projected-rollback-preflight', process.execPath, ['scripts/preflight_guarded_ops.mjs', rollback, '--regions', regions, '--source-overlay-ops', forward, '--report', path.join(abs(outDir), 'projected-rollback-preflight.json')]);
  run('block-entity-and-protected-core-clearance', process.execPath, ['scripts/audit_guarded_ops_block_entities.mjs', '--regions', regions, '--ops', forward, '--report', path.join(abs(outDir), 'block-entity-clearance.json')]);
  run('strict-forward-parser', 'python3', ['scripts/rcon_runner.py', forward, '--dry-run', '--strict-noop', '--operation-role', 'forward', '--report', path.join(abs(outDir), 'forward-strict-dry-run.json')]);
  run('strict-rollback-parser', 'python3', ['scripts/rcon_runner.py', rollback, '--dry-run', '--strict-noop', '--operation-role', 'rollback', '--report', path.join(abs(outDir), 'rollback-strict-dry-run.json')]);
  if (!execute) { ledger.status = 'PREPARED_STATIC_SOURCE_REQUIRES_EXECUTE_MODE_FOR_IMMEDIATE_CAPTURE_AND_LIVE_ENTITY_CLEARANCE'; ledger.completedAtUtc = new Date().toISOString(); save(); console.log(JSON.stringify({ status: ledger.status, ledger: rel(ledgerPath), manifest: rel(manifest), mutationAuthority: false }, null, 2)); process.exit(0); }
  run('same-moment-live-entity-clearance', 'python3', ['scripts/redevelopment_live_entity_gate.py', '--ops', forward, '--capture-blocker-nbt', '--report', path.join(abs(outDir), 'live-entity-clearance.json')]);
  run('strict-forward-execution', 'python3', ['scripts/rcon_runner.py', forward, '--strict-noop', '--operation-role', 'forward', '--stream-journal', path.join(abs(outDir), 'forward-stream.journal.jsonl'), '--report', path.join(abs(outDir), 'forward-execution.json')]);
  run('fresh-post-complete-save', 'python3', ['scripts/capture_combined_zones_complete_save.py', '--execute', '--dest', postRoot]);
  run('rollback-poststate-preflight', process.execPath, ['scripts/preflight_guarded_ops.mjs', rollback, '--regions', path.join(abs(postRoot), 'region'), '--report', path.join(abs(outDir), 'rollback-poststate-preflight.json')]);
  run('independent-post-qa', process.execPath, ['scripts/qa_mp11_bkr_c01_independent_return_01_post_release.mjs', '--manifest', manifest, '--snapshot', postRoot, '--out', path.join(abs(outDir), 'independent-post-qa')]);
  ledger.status = 'EXECUTED_PENDING_REVIEW_OF_INDEPENDENT_POST_QA'; ledger.completedAtUtc = new Date().toISOString(); save(); console.log(JSON.stringify({ status: ledger.status, ledger: rel(ledgerPath), manifest: rel(manifest) }, null, 2));
} catch (error) { ledger.status = 'BLOCKED_BY_SCOPE_LOCAL_SAFETY_KERNEL'; ledger.error = error.message; ledger.completedAtUtc = new Date().toISOString(); save(); throw error; }
