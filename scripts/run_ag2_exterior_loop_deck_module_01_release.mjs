#!/usr/bin/env node
/** AG-2 guarded release kernel; prepare-only unless --execute is explicit. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd(); const RELEASE = 'AG2-CITYWIDE-EXTERIOR-LOOP-DECK-MODULE-01'; const args = process.argv.slice(2);
const has = (flag) => args.includes(flag); const opt = (flag, fallback = null) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const execute = has('--execute'), outDir = opt('--out-dir'), sourceRoot = opt('--source-snapshot-root'), postRoot = opt('--post-snapshot-root');
const abs = (value) => path.resolve(ROOT, value); const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/'); const fileSha = (value) => crypto.createHash('sha256').update(fs.readFileSync(abs(value))).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`${RELEASE} guarded release rejected: ${message}`); };
fail(outDir && sourceRoot, '--out-dir and --source-snapshot-root are required'); fail(!fs.existsSync(abs(outDir)), '--out-dir must be fresh');
if (execute) fail(postRoot && !fs.existsSync(abs(sourceRoot)) && !fs.existsSync(abs(postRoot)), '--execute requires fresh nonexistent source and post capture destinations'); else fail(fs.existsSync(abs(sourceRoot)), 'prepare-only requires an existing immutable source snapshot');
fs.mkdirSync(abs(outDir), { recursive: true }); const ledgerPath = path.join(abs(outDir), 'ag2-guarded-release-ledger.json'); const ledger = { schemaVersion: 1, id: `${RELEASE}-GUARDED-RELEASE`, releaseId: RELEASE, mode: execute ? 'EXECUTE' : 'PREPARE_ONLY', status: 'RUNNING', mutationAuthority: false, stages: [] };
const save = () => fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
const run = (stage, command, commandArgs, permittedFailure = false) => { const result = spawnSync(command, commandArgs, { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }); const record = { stage, command: [command, ...commandArgs], status: result.status === 0 ? 'PASS' : 'FAIL', stdoutTail: String(result.stdout ?? '').slice(-8000), stderrTail: String(result.stderr ?? '').slice(-8000) }; ledger.stages.push(record); save(); if (result.status !== 0 && !permittedFailure) throw new Error(`${stage} failed: ${record.stderrTail || record.stdoutTail}`); return result; };
const complete = (root, label) => { for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(abs(root), member)), `${label} missing ${member}`); };
const audited = (reportPath, root, label) => { const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')); fail(report.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE' && report.summary?.passed === true && report.input?.suppliedWorldRoot === rel(root), `${label} immutable capture audit failed`); return report; };
try {
  if (execute) run('fresh-source-complete-save', 'python3', ['scripts/capture_combined_zones_complete_save.py', '--execute', '--dest', sourceRoot]);
  complete(sourceRoot, 'source'); const sourceIntake = path.join(abs(outDir), 'source-complete-save-intake.json');
  run('source-complete-save-intake', process.execPath, ['scripts/audit_combined_zones_complete_save.mjs', '--world-root', sourceRoot, '--out', sourceIntake, '--markdown', path.join(abs(outDir), 'source-complete-save-intake.md'), '--generated-at', new Date().toISOString()]);
  const sourceAudit = audited(sourceIntake, sourceRoot, 'source'); const rebound = path.join(abs(outDir), 'rebound');
  run('fresh-ag2-compiler-rebind', process.execPath, ['scripts/compile_ag2_exterior_loop_deck_module_01.mjs', '--snapshot', sourceRoot, '--out', rebound, '--generated-at', new Date().toISOString()]);
  const manifestPath = path.join(rebound, 'ag2-citywide-exterior-loop-deck-module-01.release-manifest.json'); const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  fail(manifest.id === RELEASE && manifest.target?.cellCount === 820 && manifest.source?.root === rel(sourceRoot) && manifest.mutationAuthority === false, 'fresh AG-2 manifest/source binding drifted');
  const forward = manifest.operations?.forward?.path, rollback = manifest.operations?.rollback?.path; fail(forward && rollback && fs.existsSync(abs(forward)) && fs.existsSync(abs(rollback)), 'rebound operation files missing');
  const regions = path.join(sourceRoot, 'region'); ledger.sourceSnapshot = { root: rel(sourceRoot), completeSaveSha256: sourceAudit.packageIdentity.completeSaveSha256, sourceIntake: rel(sourceIntake), manifest: rel(manifestPath), manifestSha256: fileSha(manifestPath) }; save();
  run('exact-forward-source-preflight', process.execPath, ['scripts/preflight_guarded_ops.mjs', forward, '--regions', regions, '--report', path.join(abs(outDir), 'forward-source-preflight.json')]);
  run('strict-forward-parser', 'python3', ['scripts/rcon_runner.py', forward, '--dry-run', '--strict-noop', '--operation-role', 'forward', '--report', path.join(abs(outDir), 'forward-parser.json')]);
  run('strict-rollback-parser', 'python3', ['scripts/rcon_runner.py', rollback, '--dry-run', '--strict-noop', '--operation-role', 'rollback', '--report', path.join(abs(outDir), 'rollback-parser.json')]);
  run('projected-rollback-preflight', process.execPath, ['scripts/preflight_guarded_ops.mjs', rollback, '--regions', regions, '--source-overlay-ops', forward, '--report', path.join(abs(outDir), 'projected-rollback-preflight.json')]);
  run('block-entity-and-protected-core-clearance', process.execPath, ['scripts/audit_guarded_ops_block_entities.mjs', '--regions', regions, '--ops', forward, '--report', path.join(abs(outDir), 'block-entity-and-protected-core-clearance.json')]);
  if (!execute) { ledger.status = 'PREPARED_REBOUND_SOURCE_REQUIRES_EXECUTE_FOR_IMMEDIATE_CAPTURE_LIVE_ENTITY_CLEARANCE_AND_GUARDED_MUTATION'; ledger.completedAtUtc = new Date().toISOString(); save(); console.log(JSON.stringify({ status: ledger.status, ledger: rel(ledgerPath), manifest: rel(manifestPath), mutationAuthority: false }, null, 2)); process.exit(0); }
  run('same-moment-live-entity-clearance', 'python3', ['scripts/redevelopment_live_entity_gate.py', '--ops', forward, '--capture-blocker-nbt', '--report', path.join(abs(outDir), 'live-entity-clearance.json')]);
  const executed = run('strict-forward-execution', 'python3', ['scripts/rcon_runner.py', forward, '--strict-noop', '--operation-role', 'forward', '--stream-journal', path.join(abs(outDir), 'forward-execution.journal.jsonl'), '--report', path.join(abs(outDir), 'forward-execution.json')], true);
  if (executed.status !== 0) { ledger.status = 'FORWARD_FAILED_REQUIRES_EXACT_SCOPE_RECOVERY'; save(); throw new Error('strict forward execution failed'); }
  run('fresh-post-complete-save', 'python3', ['scripts/capture_combined_zones_complete_save.py', '--execute', '--dest', postRoot]); complete(postRoot, 'post'); const postIntake = path.join(abs(outDir), 'post-complete-save-intake.json');
  run('post-complete-save-intake', process.execPath, ['scripts/audit_combined_zones_complete_save.mjs', '--world-root', postRoot, '--out', postIntake, '--markdown', path.join(abs(outDir), 'post-complete-save-intake.md'), '--generated-at', new Date().toISOString()]);
  const postAudit = audited(postIntake, postRoot, 'post'); ledger.postSnapshot = { root: rel(postRoot), completeSaveSha256: postAudit.packageIdentity.completeSaveSha256, postIntake: rel(postIntake) }; ledger.status = 'EXECUTED_PENDING_INDEPENDENT_POST_QA'; save();
  run('rollback-poststate-preflight', process.execPath, ['scripts/preflight_guarded_ops.mjs', rollback, '--regions', path.join(postRoot, 'region'), '--report', path.join(abs(outDir), 'rollback-poststate-preflight.json')]);
  const qa = path.join(abs(outDir), 'independent-post-release-qa.json'); run('independent-post-release-qa', process.execPath, ['scripts/qa_ag2_exterior_loop_deck_module_01_post_release.mjs', '--snapshot', postRoot, '--manifest', manifestPath, '--ledger', ledgerPath, '--post-intake', postIntake, '--out', qa]);
  const qaData = JSON.parse(fs.readFileSync(qa, 'utf8')); fail(qaData.status === 'PASS_AG2_POSTSTATE_DECK_MODULE_QA', 'independent post QA did not pass'); ledger.status = 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'; ledger.completedAtUtc = new Date().toISOString(); ledger.independentPostQa = { path: rel(qa), sha256: fileSha(qa) }; save(); console.log(JSON.stringify({ status: ledger.status, ledger: rel(ledgerPath), manifest: rel(manifestPath), postQa: rel(qa), mutationAuthority: false }, null, 2));
} catch (error) { if (ledger.status === 'RUNNING') ledger.status = 'BLOCKED_BY_SCOPE_LOCAL_SAFETY_KERNEL'; ledger.error = error.message; ledger.completedAtUtc = new Date().toISOString(); save(); throw error; }
