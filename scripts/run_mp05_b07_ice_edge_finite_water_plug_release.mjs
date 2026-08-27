#!/usr/bin/env node
/** Fresh-kernel wrapper for the finite B07 ice-edge water plug. Default: prepare only. */
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd(); const RELEASE = 'MP05-B07-ICE-EDGE-FINITE-WATER-PLUG-01';
const args = process.argv.slice(2); const has = (flag) => args.includes(flag);
const option = (flag, fallback = null) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const abs = (value) => path.resolve(ROOT, value); const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (filename) => crypto.createHash('sha256').update(fs.readFileSync(abs(filename))).digest('hex');
const fail = (ok, message) => { if (!ok) throw new Error(`${RELEASE} guarded wrapper rejected: ${message}`); };
const execute = has('--execute'); const outDir = option('--out-dir'); const sourceRoot = option('--source-snapshot-root'); const postRoot = option('--post-snapshot-root');
const authorization = option('--authorization', 'docs/masterplans/05-combined-zones/mp05-b07-ice-edge-finite-water-plug-governor-standing-execution-authorization.json');
fail(outDir && sourceRoot, '--out-dir and --source-snapshot-root are required'); fail(!fs.existsSync(abs(outDir)), '--out-dir must be fresh');
if (execute) fail(postRoot && !fs.existsSync(abs(sourceRoot)) && !fs.existsSync(abs(postRoot)), '--execute requires fresh nonexistent source/post destinations'); else fail(fs.existsSync(abs(sourceRoot)), 'prepare mode requires an existing immutable source snapshot');
const auth = JSON.parse(fs.readFileSync(abs(authorization), 'utf8')); fail(auth.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION' && auth.revoked === false && auth.authorizedReleaseId === RELEASE, 'standing authorization invalid');
fs.mkdirSync(abs(outDir), { recursive: true }); const ledgerPath = path.join(abs(outDir), 'fresh-kernel-ledger.json');
const ledger = { schemaVersion: 1, id: `${RELEASE}-FRESH-KERNEL`, releaseId: RELEASE, mode: execute ? 'EXECUTE' : 'PREPARE_ONLY', status: 'RUNNING', authorization: { path: rel(authorization), sha256: sha(authorization) }, stages: [] };
const save = () => fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
const attempt = (stage, command, commandArgs) => { const result = spawnSync(command, commandArgs, { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }); const record = { stage, command: [command, ...commandArgs], status: result.status === 0 ? 'PASS' : 'FAIL', stdoutTail: String(result.stdout ?? '').slice(-8000), stderrTail: String(result.stderr ?? '').slice(-8000) }; ledger.stages.push(record); save(); return result; };
const run = (stage, command, commandArgs) => { const result = attempt(stage, command, commandArgs); if (result.status !== 0) { const record = ledger.stages.at(-1); throw new Error(`${stage} failed: ${record.stderrTail || record.stdoutTail}`); } return result; };
try {
  if (execute) run('fresh-source-complete-save', 'python3', ['scripts/capture_combined_zones_complete_save.py', '--execute', '--dest', sourceRoot]);
  for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(abs(sourceRoot), member)), `source missing ${member}`);
  const buildops = path.join(abs(outDir), 'rebound-buildops');
  run('fresh-source-compiler-rebind', process.execPath, ['scripts/compile_mp05_b07_ice_edge_finite_water_plug_01.mjs', '--snapshot', sourceRoot, '--auth', authorization, '--out', buildops]);
  const manifest = path.join(buildops, 'mp05-b07-ice-edge-finite-water-plug-01.manifest.json'); const forward = path.join(buildops, 'mp05-b07-ice-edge-finite-water-plug-01.forward.txt'); const rollback = path.join(buildops, 'mp05-b07-ice-edge-finite-water-plug-01.rollback.txt'); const regions = path.join(abs(sourceRoot), 'region');
  run('exact-release-manifest-qa', process.execPath, ['scripts/qa_guarded_release_manifest.mjs', '--manifest', manifest, '--out', path.join(abs(outDir), 'exact-release-manifest-qa.json')]);
  run('forward-source-preflight', process.execPath, ['scripts/preflight_guarded_ops.mjs', forward, '--regions', regions, '--report', path.join(abs(outDir), 'forward-source-preflight.json')]);
  run('projected-rollback-preflight', process.execPath, ['scripts/preflight_guarded_ops.mjs', rollback, '--regions', regions, '--source-overlay-ops', forward, '--report', path.join(abs(outDir), 'projected-rollback-preflight.json')]);
  run('block-entity-and-protected-core-clearance', process.execPath, ['scripts/audit_guarded_ops_block_entities.mjs', '--regions', regions, '--ops', forward, '--report', path.join(abs(outDir), 'block-entity-clearance.json')]);
  run('strict-forward-parser', 'python3', ['scripts/rcon_runner.py', forward, '--dry-run', '--strict-noop', '--operation-role', 'forward', '--report', path.join(abs(outDir), 'forward-strict-dry-run.json')]);
  run('strict-rollback-parser', 'python3', ['scripts/rcon_runner.py', rollback, '--dry-run', '--strict-noop', '--operation-role', 'rollback', '--report', path.join(abs(outDir), 'rollback-strict-dry-run.json')]);
  if (!execute) { ledger.status = 'PREPARED_STATIC_SOURCE_REQUIRES_EXECUTE_MODE_FOR_IMMEDIATE_CAPTURE_AND_LIVE_ENTITY_CLEARANCE'; ledger.completedAtUtc = new Date().toISOString(); save(); console.log(JSON.stringify({ status: ledger.status, ledger: rel(ledgerPath), manifest: rel(manifest), mutationAuthority: false }, null, 2)); process.exit(0); }
  run('same-moment-live-entity-clearance', 'python3', ['scripts/redevelopment_live_entity_gate.py', '--ops', forward, '--capture-blocker-nbt', '--report', path.join(abs(outDir), 'live-entity-clearance.json')]);
  const forwardResult = attempt('strict-forward-execution', 'python3', ['scripts/rcon_runner.py', forward, '--strict-noop', '--operation-role', 'forward', '--stream-journal', path.join(abs(outDir), 'forward-stream.journal.jsonl'), '--report', path.join(abs(outDir), 'forward-execution.json')]);
  if (forwardResult.status !== 0) {
    ledger.status = 'FORWARD_FAILED_ROLLING_BACK'; save();
    const rollbackResult = attempt('compensating-rollback', 'python3', ['scripts/rcon_runner.py', rollback, '--operation-role', 'rollback', '--stream-journal', path.join(abs(outDir), 'compensating-rollback.journal.jsonl'), '--report', path.join(abs(outDir), 'compensating-rollback.json')]);
    if (rollbackResult.status !== 0) { ledger.status = 'ROLLBACK_FAILED_MANUAL_INTERVENTION_REQUIRED'; ledger.completedAtUtc = new Date().toISOString(); save(); throw new Error('strict forward failed and compensating rollback failed'); }
    ledger.status = 'ROLLED_BACK_PENDING_RECOVERY_VERIFICATION'; save();
    try {
      run('fresh-rollback-recovery-complete-save', 'python3', ['scripts/capture_combined_zones_complete_save.py', '--execute', '--dest', postRoot]);
      run('rollback-recovery-source-preflight', process.execPath, ['scripts/preflight_guarded_ops.mjs', forward, '--regions', path.join(abs(postRoot), 'region'), '--report', path.join(abs(outDir), 'rollback-recovery-source-preflight.json')]);
      ledger.status = 'ROLLED_BACK_AND_RECOVERY_VERIFIED_AFTER_FORWARD_FAILURE'; ledger.completedAtUtc = new Date().toISOString(); save();
    } catch (recoveryError) { ledger.status = 'ROLLED_BACK_RECOVERY_VERIFICATION_FAILED_MANUAL_REVIEW'; ledger.recoveryError = recoveryError.message; ledger.completedAtUtc = new Date().toISOString(); save(); }
    throw new Error(`strict forward failed; compensating rollback status ${ledger.status}`);
  }
  run('fresh-post-complete-save', 'python3', ['scripts/capture_combined_zones_complete_save.py', '--execute', '--dest', postRoot]);
  run('rollback-poststate-preflight', process.execPath, ['scripts/preflight_guarded_ops.mjs', rollback, '--regions', path.join(abs(postRoot), 'region'), '--report', path.join(abs(outDir), 'rollback-poststate-preflight.json')]);
  run('independent-post-qa', process.execPath, ['scripts/qa_mp05_b07_ice_edge_finite_water_plug_01_post_release.mjs', '--manifest', manifest, '--snapshot', postRoot, '--out', path.join(abs(outDir), 'independent-post-qa.json')]);
  ledger.status = 'EXECUTED_PENDING_REVIEW_OF_INDEPENDENT_POST_QA'; ledger.completedAtUtc = new Date().toISOString(); save(); console.log(JSON.stringify({ status: ledger.status, ledger: rel(ledgerPath), manifest: rel(manifest) }, null, 2));
} catch (error) {
  const terminalRecoveryStatuses = new Set([
    'ROLLED_BACK_AND_RECOVERY_VERIFIED_AFTER_FORWARD_FAILURE',
    'ROLLED_BACK_RECOVERY_VERIFICATION_FAILED_MANUAL_REVIEW',
    'ROLLBACK_FAILED_MANUAL_INTERVENTION_REQUIRED',
  ]);
  if (!terminalRecoveryStatuses.has(ledger.status)) ledger.status = 'BLOCKED_BY_SCOPE_LOCAL_SAFETY_KERNEL';
  ledger.error = error.message;
  ledger.completedAtUtc = new Date().toISOString();
  save();
  throw error;
}
