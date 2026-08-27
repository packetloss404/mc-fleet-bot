#!/usr/bin/env node
/**
 * Atomic fresh-kernel wrapper for MP02 B08 restricted chamber / dry receiver.
 * Default mode is prepare-only. `--execute` is the only mutation path and
 * captures/recompiles from a fresh same-moment source before any operation.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd(); const RELEASE = 'MP02-B08-RESTRICTED-CHAMBER-DRY-RECEIVER-01'; const NODE = 'CZ-MP02-B08-RESTRICTED-CHAMBER-DRY-RECEIVER';
const args = process.argv.slice(2); const has = (flag) => args.includes(flag); const option = (flag, fallback = null) => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const abs = (value) => path.resolve(ROOT, value); const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/'); const sha = (value) => crypto.createHash('sha256').update(fs.readFileSync(abs(value))).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`${RELEASE} fresh kernel rejected: ${message}`); };
const execute = has('--execute'); const outDir = option('--out-dir'); const sourceRoot = option('--source-snapshot-root'); const postRoot = option('--post-snapshot-root');
const authorizationPath = option('--authorization', 'docs/masterplans/02-subtropolis/mp02-b08-restricted-chamber-dry-receiver-governor-standing-execution-authorization.json');
fail(outDir && sourceRoot, '--out-dir and --source-snapshot-root are required'); fail(!fs.existsSync(abs(outDir)), '--out-dir must be fresh');
if (execute) fail(postRoot && !fs.existsSync(abs(sourceRoot)) && !fs.existsSync(abs(postRoot)), '--execute requires fresh nonexistent source and post destinations'); else fail(fs.existsSync(abs(sourceRoot)), 'prepare mode requires an existing immutable source snapshot');
const authorization = JSON.parse(fs.readFileSync(abs(authorizationPath), 'utf8')); const authPayload = { ...authorization }; delete authPayload.authorizationPayloadSha256;
fail(authorization.schemaVersion === 1 && authorization.projectId === 'combined-zones-phase1' && authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION' && authorization.revoked === false && authorization.authorizedReleaseNodes?.includes(NODE) && authorization.authorizationPayloadSha256 === crypto.createHash('sha256').update(JSON.stringify(authPayload)).digest('hex'), 'standing authorization is absent, revoked, mismatched, or drifted');
const requiredKernel = ['exact-release-and-inverse', 'fresh-source-snapshot-and-preflight', 'strict-forward-and-rollback-parser-checks', 'block-and-live-entity-clearance', 'strict-execution-with-compensating-rollback', 'post-snapshot-and-rollback-poststate-verification'];
fail(requiredKernel.every((id) => authorization.hardSafetyKernel?.some((entry) => entry.id === id && entry.required === true)), 'authorization omits hard-safety-kernel requirement');
fs.mkdirSync(abs(outDir), { recursive: true }); const ledgerPath = path.join(abs(outDir), 'fresh-kernel-ledger.json');
const ledger = { schemaVersion: 1, id: `${RELEASE}-FRESH-KERNEL`, releaseId: RELEASE, releaseNodeId: NODE, mode: execute ? 'EXECUTE' : 'PREPARE_ONLY', status: 'RUNNING', authorization: { path: rel(authorizationPath), sha256: sha(authorizationPath), payloadSha256: authorization.authorizationPayloadSha256 }, stages: [] };
const save = () => fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
const run = (stage, command, commandArgs, allowFailure = false) => { const result = spawnSync(command, commandArgs, { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }); const record = { stage, command: [command, ...commandArgs], status: result.status === 0 ? 'PASS' : 'FAIL', stdoutTail: String(result.stdout ?? '').slice(-8000), stderrTail: String(result.stderr ?? '').slice(-8000) }; ledger.stages.push(record); save(); if (result.status !== 0 && !allowFailure) throw new Error(`${stage} failed: ${record.stderrTail || record.stdoutTail}`); return result; };
const complete = (root, label) => { for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(abs(root), member)), `${label} missing ${member}`); };
const assertIntake = (filename, root, label) => { const report = JSON.parse(fs.readFileSync(abs(filename), 'utf8')); fail(report.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE' && report.summary?.passed === true && report.input?.suppliedWorldRoot === root, `${label} intake is not a complete immutable pass`); return report; };
const packageOps = (manifest, key) => { const pkg = manifest.packages.find((entry) => entry.key === key); fail(pkg, `missing manifest package ${key}`); return pkg; };
try {
  if (execute) run('fresh-source-complete-save', 'python3', ['scripts/capture_combined_zones_complete_save.py', '--execute', '--dest', sourceRoot]);
  complete(sourceRoot, 'source');
  const sourceIntake = path.join(abs(outDir), 'source-complete-save-intake.json');
  run('source-complete-save-intake', process.execPath, ['scripts/audit_combined_zones_complete_save.mjs', '--world-root', sourceRoot, '--out', sourceIntake, '--markdown', path.join(abs(outDir), 'source-complete-save-intake.md'), '--generated-at', new Date().toISOString()]);
  const sourceIntakeRecord = assertIntake(sourceIntake, sourceRoot, 'source');
  const rebound = path.join(abs(outDir), 'rebound'); const surveyDir = path.join(rebound, 'successor-survey'); const designDir = path.join(rebound, 'integrated-design'); const buildops = path.join(rebound, 'buildops');
  run('fresh-successor-survey', process.execPath, ['scripts/survey_mp02_b08_current_successor.mjs', '--snapshot', sourceRoot, '--out', surveyDir]);
  const survey = path.join(surveyDir, 'mp02-b08-current-successor-survey.json');
  run('fresh-integrated-chamber-receiver-design', process.execPath, ['scripts/design_mp02_b08_integrated_chamber_receiver_01.mjs', '--snapshot', sourceRoot, '--survey', survey, '--out', designDir]);
  const design = path.join(designDir, 'mp02-b08-integrated-chamber-receiver-feasibility-01.json');
  run('fresh-source-compiler-rebind', process.execPath, ['scripts/compile_mp02_b08_restricted_chamber_dry_receiver_01.mjs', '--snapshot', sourceRoot, '--design', design, '--out-dir', buildops]);
  const manifest = path.join(buildops, 'mp02-b08-restricted-chamber-dry-receiver-01.release-manifest.json'); const manifestData = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  fail(manifestData.releaseNodeId === NODE && manifestData.scope?.releaseId === RELEASE, 'rebound manifest identity drift');
  run('projected-normal-and-single-return-failure-qa', process.execPath, ['scripts/qa_mp02_b08_restricted_chamber_dry_receiver_01_projected.mjs', '--snapshot', sourceRoot, '--manifest', manifest, '--out', path.join(abs(outDir), 'projected-functional-qa.json')]);
  const packages = manifestData.packages; const forwardPaths = packages.map(({ forward }) => forward); const rollbackPaths = packages.map(({ rollback }) => rollback); const regions = path.join(sourceRoot, 'region');
  ledger.sourceSnapshot = { root: sourceRoot, completeSaveSha256: sourceIntakeRecord.packageIdentity.completeSaveSha256, manifest: rel(manifest), manifestSha256: sha(manifest), design: rel(design), designSha256: sha(design) }; save();
  for (let index = 0; index < packages.length; index += 1) {
    const pkg = packages[index];
    run(`forward-source-preflight:${pkg.key}`, process.execPath, ['scripts/preflight_guarded_ops.mjs', pkg.forward, '--regions', regions, ...packages.slice(0, index).flatMap((entry) => ['--source-overlay-ops', entry.forward]), '--report', path.join(abs(outDir), `${pkg.key}.forward-source-preflight.json`)]);
    run(`strict-forward-parser:${pkg.key}`, 'python3', ['scripts/rcon_runner.py', pkg.forward, '--dry-run', '--strict-noop', '--operation-role', 'forward', '--report', path.join(abs(outDir), `${pkg.key}.forward-parser.json`)]);
    run(`strict-rollback-parser:${pkg.key}`, 'python3', ['scripts/rcon_runner.py', pkg.rollback, '--dry-run', '--strict-noop', '--operation-role', 'rollback', '--report', path.join(abs(outDir), `${pkg.key}.rollback-parser.json`)]);
  }
  for (let index = packages.length - 1; index >= 0; index -= 1) {
    const pkg = packages[index]; const alreadyRolledBack = packages.slice(index + 1).reverse().flatMap((entry) => ['--source-overlay-ops', entry.rollback]);
    run(`projected-rollback-preflight:${pkg.key}`, process.execPath, ['scripts/preflight_guarded_ops.mjs', pkg.rollback, '--regions', regions, ...packages.flatMap((entry) => ['--source-overlay-ops', entry.forward]), ...alreadyRolledBack, '--report', path.join(abs(outDir), `${pkg.key}.projected-rollback-preflight.json`)]);
  }
  run('block-entity-and-protected-core-clearance', process.execPath, ['scripts/audit_guarded_ops_block_entities.mjs', '--regions', regions, ...forwardPaths.flatMap((value) => ['--ops', value]), '--report', path.join(abs(outDir), 'block-entity-clearance.json')]);
  if (!execute) { ledger.status = 'PREPARED_REBOUND_SOURCE_REQUIRES_EXECUTE_FOR_IMMEDIATE_CAPTURE_AND_LIVE_ENTITY_CLEARANCE'; ledger.completedAtUtc = new Date().toISOString(); save(); console.log(JSON.stringify({ status: ledger.status, ledger: rel(ledgerPath), manifest: rel(manifest), mutationAuthority: false }, null, 2)); process.exit(0); }
  run('same-moment-live-entity-clearance', 'python3', ['scripts/redevelopment_live_entity_gate.py', ...forwardPaths.flatMap((value) => ['--ops', value]), '--capture-blocker-nbt', '--report', path.join(abs(outDir), 'live-entity-clearance.json')]);
  const completed = [];
  for (const pkg of packages) {
    run(`same-moment-package-entity-clearance:${pkg.key}`, 'python3', ['scripts/redevelopment_live_entity_gate.py', '--ops', pkg.forward, '--capture-blocker-nbt', '--report', path.join(abs(outDir), `${pkg.key}.live-entity-clearance.json`)]);
    const result = run(`strict-forward-execution:${pkg.key}`, 'python3', ['scripts/rcon_runner.py', pkg.forward, '--strict-noop', '--operation-role', 'forward', '--stream-journal', path.join(abs(outDir), `${pkg.key}.forward.journal.jsonl`), '--report', path.join(abs(outDir), `${pkg.key}.forward-execution.json`)], true);
    if (result.status === 0) { completed.push(pkg); continue; }
    ledger.status = 'FORWARD_FAILED_COMPENSATING_ROLLBACK'; save();
    for (const rollbackPkg of [pkg, ...completed.slice().reverse()]) run(`compensating-rollback:${rollbackPkg.key}`, 'python3', ['scripts/rcon_runner.py', rollbackPkg.rollback, '--operation-role', 'rollback', '--stream-journal', path.join(abs(outDir), `${rollbackPkg.key}.compensating-rollback.journal.jsonl`), '--report', path.join(abs(outDir), `${rollbackPkg.key}.compensating-rollback.json`)], true);
    throw new Error(`strict forward execution failed at ${pkg.key}`);
  }
  run('fresh-post-complete-save', 'python3', ['scripts/capture_combined_zones_complete_save.py', '--execute', '--dest', postRoot]); complete(postRoot, 'post');
  const postIntake = path.join(abs(outDir), 'post-complete-save-intake.json'); run('post-complete-save-intake', process.execPath, ['scripts/audit_combined_zones_complete_save.mjs', '--world-root', postRoot, '--out', postIntake, '--markdown', path.join(abs(outDir), 'post-complete-save-intake.md'), '--generated-at', new Date().toISOString()]);
  const postIntakeRecord = assertIntake(postIntake, postRoot, 'post'); ledger.postSnapshot = { root: postRoot, completeSaveSha256: postIntakeRecord.packageIdentity.completeSaveSha256 }; save();
  for (let index = packages.length - 1; index >= 0; index -= 1) { const pkg = packages[index]; const priorRollbacks = packages.slice(index + 1).reverse().flatMap((entry) => ['--source-overlay-ops', entry.rollback]); run(`rollback-poststate-preflight:${pkg.key}`, process.execPath, ['scripts/preflight_guarded_ops.mjs', pkg.rollback, '--regions', path.join(postRoot, 'region'), ...priorRollbacks, '--report', path.join(abs(outDir), `${pkg.key}.rollback-poststate-preflight.json`)]); }
  run('independent-post-release-qa', process.execPath, ['scripts/qa_mp02_b08_restricted_chamber_dry_receiver_01_post_release.mjs', '--snapshot', postRoot, '--manifest', manifest, '--out', path.join(abs(outDir), 'independent-post-release-qa.json')]);
  ledger.status = 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'; ledger.completedAtUtc = new Date().toISOString(); save(); console.log(JSON.stringify({ status: ledger.status, ledger: rel(ledgerPath), manifest: rel(manifest) }, null, 2));
} catch (error) { ledger.status = 'BLOCKED_BY_SCOPE_LOCAL_SAFETY_KERNEL'; ledger.error = error.message; ledger.completedAtUtc = new Date().toISOString(); save(); throw error; }
