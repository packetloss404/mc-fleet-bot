#!/usr/bin/env node
/**
 * Dedicated atomic executor for the finite West High containment package.
 * Default mode is PREPARE_ONLY. --execute is the sole mutation opt-in.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const option = (flag, fallback = '') => { const index = argv.indexOf(flag); return index < 0 ? fallback : (argv[index + 1] ?? fallback); };
const has = (flag) => argv.includes(flag);
const execute = has('--execute');
const printPlan = has('--print-plan');
const sourceDest = option('--source-snapshot-root');
const existingSource = option('--existing-source-root');
const postDest = option('--post-snapshot-root');
const packageDir = option('--package-dir');
const outDir = option('--out-dir');
const generatedAt = option('--generated-at', new Date().toISOString());
const AUTHORIZATION = 'docs/masterplans/05-combined-zones/sys03-west-high-finite-containment-governor-standing-execution-authorization.json';
const NODE = 'SYS03-WEST-HIGH-FINITE-CONTAINMENT';
const abs = (file) => path.resolve(ROOT, file);
const rel = (file) => path.relative(ROOT, abs(file)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (condition) throw new Error(`SYS03 West High atomic release rejected: ${message}`); };
const run = (command, args, allowFailure = false) => {
  const result = spawnSync(command, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, timeout: 60 * 60 * 1000 });
  if (result.status !== 0 && !allowFailure) throw new Error(`${command} ${args.join(' ')} failed: ${String(result.stderr || result.stdout).slice(-8000)}`);
  return result;
};
const requiredSnapshot = (root) => {
  for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(!fs.existsSync(path.join(abs(root), member)), `source snapshot lacks ${member}`);
  const captureBytes = fs.readFileSync(path.join(abs(root), 'combined-zones-complete-save-capture.json'));
  const capture = JSON.parse(captureBytes);
  fail(capture.immutableCopy !== true || !capture.captureId, 'source is not a complete immutable capture');
  return { capture, captureBytes };
};
const write = (file, value) => fs.writeFileSync(abs(file), `${JSON.stringify(value, null, 2)}\n`);

fail(Boolean(sourceDest) === Boolean(existingSource), 'provide exactly one of --source-snapshot-root or --existing-source-root');
fail(execute && !sourceDest, '--execute requires a fresh, nonexistent --source-snapshot-root');
fail(execute && !postDest, '--execute requires a fresh, nonexistent --post-snapshot-root');
fail(!packageDir, '--package-dir is required');
const buildopsRoot = abs('data/buildops'); const packageRoot = abs(packageDir); const packageRelative = path.relative(buildopsRoot, packageRoot);
fail(!packageRelative || packageRelative.startsWith('..') || path.isAbsolute(packageRelative), '--package-dir must be a new child of data/buildops');
fail(fs.existsSync(packageRoot), '--package-dir already exists');
fail(!printPlan && !outDir, '--out-dir is required unless --print-plan');
if (!printPlan) fail(fs.existsSync(abs(outDir)), '--out-dir already exists');
if (sourceDest) fail(fs.existsSync(abs(sourceDest)), '--source-snapshot-root already exists');
if (execute) fail(fs.existsSync(abs(postDest)), '--post-snapshot-root already exists');

let source = existingSource;
if (sourceDest) {
  run('python3', ['scripts/capture_combined_zones_complete_save.py', '--execute', '--dest', sourceDest]);
  source = sourceDest;
}
const { capture, captureBytes } = requiredSnapshot(source);
const basename = `sys03-west-high-finite-containment-01-${capture.captureId}`;
run(process.execPath, ['scripts/compile_sys03_west_high_finite_containment_01.mjs', '--snapshot', source, '--out-dir', packageDir, '--basename', basename, '--generated-at', generatedAt]);
const manifest = `${packageDir}/${basename}.release-manifest.json`;
const manifestBytes = fs.readFileSync(abs(manifest)); const manifestRecord = JSON.parse(manifestBytes);
fail(manifestRecord.source?.completeSaveCapture?.captureId !== capture.captureId, 'recompiled manifest does not bind the fresh capture ID');
const genericArgs = ['scripts/run_combined_zones_scoped_release.mjs', '--manifest', manifest, '--release-node', NODE, '--authorization', AUTHORIZATION];
if (printPlan) {
  const plan = JSON.parse(String(run(process.execPath, [...genericArgs, '--print-plan']).stdout));
  process.stdout.write(`${JSON.stringify({ status: 'PREPARE_PLAN_ONLY', mode: 'PREPARE_ONLY', sourceSnapshot: rel(source), captureId: capture.captureId, manifest: rel(manifest), plan, worldMutated: false }, null, 2)}\n`);
  process.exit(0);
}
run(process.execPath, [...genericArgs, '--out-dir', outDir, '--existing-source-regions', `${source}/region`]);
const genericLedgerPath = path.join(abs(outDir), 'evidence-ledger.json');
const genericLedger = JSON.parse(fs.readFileSync(genericLedgerPath));
fail(genericLedger.status !== 'READY_FOR_EXPLICIT_EXECUTION', 'generic preparation kernel is not READY');
if (!execute) {
  process.stdout.write(`${JSON.stringify({ status: 'PREPARE_ONLY_READY_FOR_EXPLICIT_EXECUTION', sourceSnapshot: rel(source), captureId: capture.captureId, manifest: rel(manifest), ledger: rel(genericLedgerPath), worldMutated: false }, null, 2)}\n`);
  process.exit(0);
}

const atomicPath = path.join(abs(outDir), 'atomic-execution-ledger.json');
const atomic = {
  schemaVersion: 1, id: 'sys03-west-high-finite-containment-atomic-release', status: 'RUNNING', mode: 'EXECUTE', releaseNodeId: NODE, transactionId: manifestRecord.transactionId,
  manifest: { path: rel(manifest), sha256: sha(manifestBytes) }, authorization: AUTHORIZATION,
  sourceSnapshot: { root: rel(source), captureId: capture.captureId, captureSha256: sha(captureBytes) }, postSnapshot: null,
  stages: [...genericLedger.stages], genericPreparationLedger: rel(genericLedgerPath),
};
const record = (stage, result, report = null) => { atomic.stages.push({ stage, status: result.status === 0 ? 'PASS' : 'FAIL', report, stdoutTail: String(result.stdout ?? '').slice(-4000), stderrTail: String(result.stderr ?? '').slice(-4000) }); write(atomicPath, atomic); return result.status === 0; };
const completed = [];
for (const pkg of manifestRecord.packages) {
  const liveReport = path.join(abs(outDir), `${pkg.key}.same-moment-entity-clearance.json`);
  const live = run('python3', ['scripts/redevelopment_live_entity_gate.py', '--ops', pkg.forward, '--capture-blocker-nbt', '--report', rel(liveReport)], true);
  if (!record(`same-moment-package-entity-clearance:${pkg.key}`, live, rel(liveReport))) break;
  const executionReport = path.join(abs(outDir), `${pkg.key}.forward-execution.json`);
  const forward = run('python3', ['scripts/rcon_runner.py', pkg.forward, '--strict-noop', '--operation-role', 'forward', '--report', rel(executionReport), '--stream-journal', `${rel(executionReport)}.stream-journal.jsonl`], true);
  if (record(`strict-forward-execution:${pkg.key}`, forward, rel(executionReport))) { completed.push(pkg); continue; }
  break;
}
if (completed.length !== manifestRecord.packages.length) {
  atomic.status = 'FORWARD_FAILED_ROLLING_BACK'; write(atomicPath, atomic);
  const failed = manifestRecord.packages[completed.length]; const reverse = [failed, ...completed.slice().reverse()].filter(Boolean);
  const rollbackFailures = [];
  for (const [index, pkg] of reverse.entries()) {
    const report = path.join(abs(outDir), `${pkg.key}.compensating-rollback.json`);
    const args = ['scripts/rcon_runner.py', pkg.rollback, '--operation-role', 'rollback', '--report', rel(report), '--stream-journal', `${rel(report)}.stream-journal.jsonl`];
    if (index !== 0) args.splice(2, 0, '--strict-noop');
    if (!record(`compensating-rollback:${pkg.key}`, run('python3', args, true), rel(report))) rollbackFailures.push(pkg.key);
  }
  atomic.status = rollbackFailures.length ? 'ROLLBACK_FAILED_MANUAL_INTERVENTION_REQUIRED' : 'ROLLED_BACK_PENDING_RECOVERY_VERIFICATION'; atomic.rollbackFailures = rollbackFailures; write(atomicPath, atomic);
  throw new Error(`forward did not complete; compensating rollback status ${atomic.status}`);
}
run('python3', ['scripts/capture_combined_zones_complete_save.py', '--execute', '--dest', postDest]);
const postCapture = requiredSnapshot(postDest); const postHash = JSON.parse(String(run(process.execPath, ['scripts/hash_world_snapshot.mjs', `${postDest}/region`]).stdout));
atomic.postSnapshot = { root: rel(postDest), regions: `${rel(postDest)}/region`, captureId: postCapture.capture.captureId, captureSha256: sha(postCapture.captureBytes), identity: postHash };
record('fresh-post-complete-save', { status: 0, stdout: '', stderr: '' });
const postIntake = path.join(abs(outDir), 'post-complete-save-intake.json');
const postAudit = run(process.execPath, ['scripts/audit_combined_zones_complete_save.mjs', '--world-root', postDest, '--out', rel(postIntake), '--markdown', rel(path.join(abs(outDir), 'post-complete-save-intake.md')), '--generated-at', new Date().toISOString()], true);
if (!record('post-complete-save-intake', postAudit, rel(postIntake))) throw new Error('fresh post complete-save intake failed');
// The post snapshot is already the state after every forward package. Do not
// replay forwards as overlays here: their source guards would incorrectly
// expect gravel/water even though those cells are correctly PDS in post. Each
// next rollback is instead preflighted over only the earlier rollback(s).
const completedRollbackOverlays = [];
for (const pkg of manifestRecord.packages.slice().reverse()) {
  const report = path.join(abs(outDir), `${pkg.key}.rollback-poststate-preflight.json`);
  const result = run(process.execPath, ['scripts/preflight_guarded_ops.mjs', pkg.rollback, '--regions', `${postDest}/region`, ...completedRollbackOverlays.flatMap((entry) => ['--source-overlay-ops', entry]), '--report', rel(report)], true);
  if (!record(`rollback-poststate-preflight:${pkg.key}`, result, rel(report))) throw new Error(`poststate rollback preflight failed for ${pkg.key}`);
  completedRollbackOverlays.push(pkg.rollback);
}
atomic.status = 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'; write(atomicPath, atomic);
const qa = path.join(abs(outDir), 'independent-post-qa.json');
const qaResult = run(process.execPath, ['scripts/qa_sys03_west_high_finite_containment_01_post_release.mjs', '--manifest', manifest, '--ledger', rel(atomicPath), '--out', rel(qa)], true);
record('independent-post-qa', qaResult, rel(qa));
if (qaResult.status !== 0) { atomic.status = 'POST_QA_FAILED'; write(atomicPath, atomic); throw new Error('independent post QA failed'); }
atomic.completedAtUtc = new Date().toISOString(); write(atomicPath, atomic);
process.stdout.write(`${JSON.stringify({ status: atomic.status, ledger: rel(atomicPath), manifest: rel(manifest), postSnapshot: rel(postDest) }, null, 2)}\n`);
