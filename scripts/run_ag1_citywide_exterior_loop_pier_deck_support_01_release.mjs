#!/usr/bin/env node
/**
 * AG-1 guarded release wrapper. Default mode is prepare-only and does not
 * contact Minecraft. `--execute` is the only path that captures or mutates.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd(); const RELEASE = 'AG1-CITYWIDE-EXTERIOR-LOOP-PIER-DECK-SUPPORT-01';
const args = process.argv.slice(2); const has = (flag) => args.includes(flag); const option = (flag, fallback = null) => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const execute = has('--execute'); const outDir = option('--out-dir'); const sourceRoot = option('--source-snapshot-root'); const postRoot = option('--post-snapshot-root');
const abs = (value) => path.resolve(ROOT, value); const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(fs.readFileSync(abs(value))).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`${RELEASE} guarded release rejected: ${message}`); };
fail(outDir && sourceRoot, '--out-dir and --source-snapshot-root are required'); fail(!fs.existsSync(abs(outDir)), '--out-dir must be fresh');
if (execute) fail(postRoot && !fs.existsSync(abs(sourceRoot)) && !fs.existsSync(abs(postRoot)), '--execute requires fresh nonexistent --source-snapshot-root and --post-snapshot-root');
else fail(fs.existsSync(abs(sourceRoot)), 'prepare mode requires an existing immutable --source-snapshot-root');

fs.mkdirSync(abs(outDir), { recursive: true }); const ledgerPath = path.join(abs(outDir), 'ag1-guarded-release-ledger.json');
const ledger = { schemaVersion: 1, id: `${RELEASE}-GUARDED-RELEASE`, releaseId: RELEASE, mode: execute ? 'EXECUTE' : 'PREPARE_ONLY', status: 'RUNNING', mutationAuthority: false, stages: [] };
const save = () => fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
const run = (stage, command, commandArgs, allowFailure = false) => { const result = spawnSync(command, commandArgs, { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }); const record = { stage, command: [command, ...commandArgs], status: result.status === 0 ? 'PASS' : 'FAIL', stdoutTail: String(result.stdout ?? '').slice(-8000), stderrTail: String(result.stderr ?? '').slice(-8000) }; ledger.stages.push(record); save(); if (result.status !== 0 && !allowFailure) throw new Error(`${stage} failed: ${record.stderrTail || record.stdoutTail}`); return result; };
const complete = (root, label) => { for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(abs(root), member)), `${label} is missing ${member}`); };
const assertIntake = (filename, root, label) => { const report = JSON.parse(fs.readFileSync(abs(filename), 'utf8')); fail(report.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE' && report.summary?.passed === true && report.input?.suppliedWorldRoot === rel(root), `${label} capture audit is not a complete immutable pass`); return report; };
try {
  if (execute) run('fresh-source-complete-save', 'python3', ['scripts/capture_combined_zones_complete_save.py', '--execute', '--dest', sourceRoot]);
  complete(sourceRoot, 'source');
  const sourceIntake = path.join(abs(outDir), 'source-complete-save-intake.json');
  run('source-complete-save-intake', process.execPath, ['scripts/audit_combined_zones_complete_save.mjs', '--world-root', sourceRoot, '--out', sourceIntake, '--markdown', path.join(abs(outDir), 'source-complete-save-intake.md'), '--generated-at', new Date().toISOString()]);
  const sourceAudit = assertIntake(sourceIntake, sourceRoot, 'source');
  const rebound = path.join(abs(outDir), 'rebound'); const ag0Out = path.join(rebound, 'ag0'); const ag1Out = path.join(rebound, 'ag1');
  run('fresh-ag0-survey-rebind', process.execPath, ['scripts/compile_ag0_citywide_exterior_loop_segment_01.mjs', '--snapshot', sourceRoot, '--geometry-only-rebind', '--out', ag0Out, '--generated-at', new Date().toISOString()]);
  const ag0 = path.join(ag0Out, 'ag0-citywide-exterior-loop-segment-01.json'); const ag0Data = JSON.parse(fs.readFileSync(ag0, 'utf8'));
  fail(ag0Data.status === 'AG0_PASS_FINITE_EXTERIOR_LOOP_SEGMENT_SOURCE_BOUND_SURVEY_ONLY' && ag0Data.selectedCandidate?.id === 'SL-02-N-AG0-0576', 'fresh AG-0 has no exact candidate');
  run('fresh-ag1-compiler-rebind', process.execPath, ['scripts/compile_ag1_citywide_exterior_loop_pier_deck_support_01.mjs', '--snapshot', sourceRoot, '--ag0', ag0, '--out', ag1Out, '--generated-at', new Date().toISOString()]);
  const manifest = path.join(ag1Out, 'ag1-citywide-exterior-loop-pier-deck-support-01.release-manifest.json'); const manifestData = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  fail(manifestData.id === RELEASE && manifestData.target?.cellCount === 1165 && manifestData.source?.root === rel(sourceRoot) && manifestData.source?.ag0?.selectedCandidate === 'SL-02-N-AG0-0576', 'fresh AG-1 manifest identity or source binding drifted');
  const forward = manifestData.operations?.forward?.path; const rollback = manifestData.operations?.rollback?.path; fail(forward && rollback && fs.existsSync(abs(forward)) && fs.existsSync(abs(rollback)), 'rebound operation files missing');
  const regions = path.join(sourceRoot, 'region');
  ledger.sourceSnapshot = { root: rel(sourceRoot), completeSaveSha256: sourceAudit.packageIdentity.completeSaveSha256, sourceIntake: rel(sourceIntake), manifest: rel(manifest), manifestSha256: sha(manifest), ag0: rel(ag0), ag0Sha256: sha(ag0) }; save();
  run('exact-forward-source-preflight', process.execPath, ['scripts/preflight_guarded_ops.mjs', forward, '--regions', regions, '--report', path.join(abs(outDir), 'forward-source-preflight.json')]);
  run('strict-forward-parser', 'python3', ['scripts/rcon_runner.py', forward, '--dry-run', '--strict-noop', '--operation-role', 'forward', '--report', path.join(abs(outDir), 'forward-parser.json')]);
  run('strict-rollback-parser', 'python3', ['scripts/rcon_runner.py', rollback, '--dry-run', '--strict-noop', '--operation-role', 'rollback', '--report', path.join(abs(outDir), 'rollback-parser.json')]);
  run('projected-rollback-preflight', process.execPath, ['scripts/preflight_guarded_ops.mjs', rollback, '--regions', regions, '--source-overlay-ops', forward, '--report', path.join(abs(outDir), 'projected-rollback-preflight.json')]);
  run('block-entity-and-protected-core-clearance', process.execPath, ['scripts/audit_guarded_ops_block_entities.mjs', '--regions', regions, '--ops', forward, '--report', path.join(abs(outDir), 'block-entity-and-protected-core-clearance.json')]);
  if (!execute) { ledger.status = 'PREPARED_REBOUND_SOURCE_REQUIRES_EXECUTE_FOR_IMMEDIATE_CAPTURE_LIVE_ENTITY_CLEARANCE_AND_GUARDED_MUTATION'; ledger.completedAtUtc = new Date().toISOString(); save(); console.log(JSON.stringify({ status: ledger.status, ledger: rel(ledgerPath), manifest: rel(manifest), mutationAuthority: false }, null, 2)); process.exit(0); }
  run('same-moment-live-entity-clearance', 'python3', ['scripts/redevelopment_live_entity_gate.py', '--ops', forward, '--capture-blocker-nbt', '--report', path.join(abs(outDir), 'live-entity-clearance.json')]);
  const forwardExecution = run('strict-forward-execution', 'python3', ['scripts/rcon_runner.py', forward, '--strict-noop', '--operation-role', 'forward', '--stream-journal', path.join(abs(outDir), 'forward-execution.journal.jsonl'), '--report', path.join(abs(outDir), 'forward-execution.json')], true);
  if (forwardExecution.status !== 0) { ledger.status = 'FORWARD_FAILED_REQUIRES_EXACT_SCOPE_RECOVERY'; save(); throw new Error('strict forward execution failed; no post-release claim may be made'); }
  run('fresh-post-complete-save', 'python3', ['scripts/capture_combined_zones_complete_save.py', '--execute', '--dest', postRoot]); complete(postRoot, 'post');
  const postIntake = path.join(abs(outDir), 'post-complete-save-intake.json');
  run('post-complete-save-intake', process.execPath, ['scripts/audit_combined_zones_complete_save.mjs', '--world-root', postRoot, '--out', postIntake, '--markdown', path.join(abs(outDir), 'post-complete-save-intake.md'), '--generated-at', new Date().toISOString()]);
  const postAudit = assertIntake(postIntake, postRoot, 'post'); ledger.postSnapshot = { root: rel(postRoot), completeSaveSha256: postAudit.packageIdentity.completeSaveSha256, postIntake: rel(postIntake) }; ledger.status = 'EXECUTED_PENDING_INDEPENDENT_POST_QA'; save();
  run('rollback-poststate-preflight', process.execPath, ['scripts/preflight_guarded_ops.mjs', rollback, '--regions', path.join(postRoot, 'region'), '--report', path.join(abs(outDir), 'rollback-poststate-preflight.json')]);
  const qa = path.join(abs(outDir), 'independent-post-release-qa.json');
  run('independent-post-release-qa', process.execPath, ['scripts/qa_ag1_citywide_exterior_loop_pier_deck_support_01_post_release.mjs', '--snapshot', postRoot, '--manifest', manifest, '--ag0', ag0, '--ledger', ledgerPath, '--post-intake', postIntake, '--out', qa]);
  const qaData = JSON.parse(fs.readFileSync(qa, 'utf8')); fail(qaData.status === 'PASS_AG1_POSTSTATE_SUPPORT_CONTAINMENT_QA', 'independent post QA did not pass');
  ledger.status = 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'; ledger.mutationAuthority = false; ledger.completedAtUtc = new Date().toISOString(); ledger.independentPostQa = { path: rel(qa), sha256: sha(qa) }; save();
  console.log(JSON.stringify({ status: ledger.status, ledger: rel(ledgerPath), manifest: rel(manifest), postQa: rel(qa), mutationAuthority: false }, null, 2));
} catch (error) { if (ledger.status === 'RUNNING') ledger.status = 'BLOCKED_BY_SCOPE_LOCAL_SAFETY_KERNEL'; ledger.error = error.message; ledger.completedAtUtc = new Date().toISOString(); save(); throw error; }
