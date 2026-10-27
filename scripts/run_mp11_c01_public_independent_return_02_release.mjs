#!/usr/bin/env node
/** Full guarded runner for MP11 C01 Return-02; default is prepare-only. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd(); const RELEASE = 'MP11-C01-PUBLIC-INDEPENDENT-RETURN-02'; const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag); const opt = (flag, fallback = null) => { const i = argv.indexOf(flag); return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback; };
const execute = has('--execute'), validateOnly = has('--validate-execution-authorization');
const outDir = opt('--out-dir'), sourceRoot = opt('--source-snapshot-root'), postRoot = opt('--post-snapshot-root');
const prepareAuthorization = opt('--authorization', 'docs/masterplans/11-town-expansion-r1/mp11-c01-public-independent-return-02-prepare-authorization.json');
const executionAuthorization = opt('--execution-authorization'); const abs = (value) => path.resolve(ROOT, value); const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const fileSha = (value) => crypto.createHash('sha256').update(fs.readFileSync(abs(value))).digest('hex'); const fail = (condition, message) => { if (!condition) throw new Error(`${RELEASE} guarded release rejected: ${message}`); };
const MEBIBYTE = 1024 * 1024;
const EXECUTE_STORAGE_RESERVES = [
  { label: 'source complete-save capture', value: () => sourceRoot, bytes: 640 * MEBIBYTE },
  { label: 'post complete-save capture', value: () => postRoot, bytes: 640 * MEBIBYTE },
  { label: 'release evidence and journals', value: () => outDir, bytes: 256 * MEBIBYTE },
];
function existingParent(value) {
  let candidate = abs(value);
  while (!fs.existsSync(candidate)) {
    const parent = path.dirname(candidate);
    fail(parent !== candidate, `could not resolve an existing parent for ${value}`);
    candidate = parent;
  }
  return candidate;
}
function assertExecuteStorageCapacity() {
  const byDevice = new Map();
  for (const reserve of EXECUTE_STORAGE_RESERVES) {
    const parent = existingParent(reserve.value());
    const device = String(fs.statSync(parent).dev);
    const entry = byDevice.get(device) ?? { parent, requiredBytes: 0, labels: [] };
    entry.requiredBytes += reserve.bytes;
    entry.labels.push(reserve.label);
    byDevice.set(device, entry);
  }
  for (const entry of byDevice.values()) {
    const stats = fs.statfsSync(entry.parent);
    const availableBytes = Number(stats.bavail) * Number(stats.bsize);
    fail(availableBytes >= entry.requiredBytes, `insufficient free storage before capture at ${entry.parent}: need ${(entry.requiredBytes / MEBIBYTE).toFixed(0)} MiB for ${entry.labels.join(', ')}, have ${(availableBytes / MEBIBYTE).toFixed(0)} MiB`);
  }
}
function validateScopedExecutionAuthorization() {
  fail(executionAuthorization && fs.existsSync(abs(executionAuthorization)), 'missing distinct --execution-authorization');
  const value = JSON.parse(fs.readFileSync(abs(executionAuthorization), 'utf8')); const c = value.scopeConstraints ?? {}; const f = value.freshness ?? {};
  fail(value.authorizationType === 'SCOPED_EXECUTION_AUTHORIZATION' && value.status === 'AUTHORIZED_SCOPED_EXECUTION_PENDING_FRESH_REBIND' && value.releaseId === RELEASE && value.executionAuthorized === true && value.rconAuthorized === true && value.worldMutationAuthorized === true && value.revoked === false, 'execution authorization is not exact, active, and scoped');
  fail(c.stationCount === 28 && c.publicClearance?.width === 5 && c.publicClearance?.height === 5 && c.endpointContractCount === 4 && c.currentProtectedSwitchbackInteriorHaloIntersectionCount === 0 && c.maximumChangedCells === 768, 'execution authorization scope constraints drifted');
  fail(f.freshSourceCaptureRequired && f.freshReboundManifestRequired && f.sameMomentLiveEntityClearanceRequired && f.freshPostCaptureRequired && f.rollbackPoststatePreflightRequired && f.independentImmutablePostQaRequired && /no broader world edit/.test(value.authorizationBoundary ?? ''), 'execution authorization weakens mandatory kernel'); return value;
}
if (validateOnly) { const value = validateScopedExecutionAuthorization(); console.log(JSON.stringify({ status: 'SCOPED_EXECUTION_AUTHORIZATION_ACCEPTED_LIVE_GATES_NOT_ENTERED', releaseId: RELEASE, authorization: rel(executionAuthorization), authorizationSha256: fileSha(executionAuthorization), requiredFreshness: value.freshness, mutationAuthority: false }, null, 2)); process.exit(0); }
fail(outDir && sourceRoot, '--out-dir and --source-snapshot-root are required'); fail(!fs.existsSync(abs(outDir)), '--out-dir must be fresh');
if (execute) { validateScopedExecutionAuthorization(); fail(postRoot && !fs.existsSync(abs(sourceRoot)) && !fs.existsSync(abs(postRoot)), '--execute requires fresh nonexistent source and post capture destinations'); assertExecuteStorageCapacity(); } else fail(fs.existsSync(abs(sourceRoot)), 'prepare-only requires existing immutable source');
for (const item of [prepareAuthorization]) fail(fs.existsSync(abs(item)), `missing source-bound input ${item}`);
fs.mkdirSync(abs(outDir), { recursive: true }); const ledgerPath = path.join(abs(outDir), 'mp11-c01-public-independent-return-02-guarded-release-ledger.json');
const ledger = { schemaVersion: 1, id: `${RELEASE}-GUARDED-RELEASE`, releaseId: RELEASE, mode: execute ? 'EXECUTE' : 'PREPARE_ONLY', status: 'RUNNING', mutationAuthority: false, stages: [] }; const save = () => fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
const run = (stage, command, args, allowFailure = false) => { const result = spawnSync(command, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }); const record = { stage, command: [command, ...args], status: result.status === 0 ? 'PASS' : 'FAIL', stdoutTail: String(result.stdout ?? '').slice(-8000), stderrTail: String(result.stderr ?? '').slice(-8000) }; ledger.stages.push(record); save(); if (result.status !== 0 && !allowFailure) throw new Error(`${stage} failed: ${record.stderrTail || record.stdoutTail}`); return result; };
const complete = (root, label) => { for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(abs(root), member)), `${label} missing ${member}`); };
const audit = (report, root, label) => { const value = JSON.parse(fs.readFileSync(report, 'utf8')); fail(value.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE' && value.summary?.passed === true && value.input?.suppliedWorldRoot === rel(root), `${label} immutable intake failed`); return value; };
try {
  if (execute) run('fresh-source-complete-save', 'python3', ['scripts/capture_combined_zones_complete_save.py', '--execute', '--dest', sourceRoot]);
  complete(sourceRoot, 'source'); const sourceIntake = path.join(abs(outDir), 'source-complete-save-intake.json'); run('source-complete-save-intake', process.execPath, ['scripts/audit_combined_zones_complete_save.mjs', '--world-root', sourceRoot, '--out', sourceIntake, '--markdown', path.join(abs(outDir), 'source-complete-save-intake.md'), '--generated-at', new Date().toISOString()]); const sourceAudit = audit(sourceIntake, sourceRoot, 'source');
  const rebound = path.join(abs(outDir), 'rebound'); const surveyDir = path.join(rebound, 'survey'); const dimensionDir = path.join(rebound, 'dimension'); const physicalDir = path.join(rebound, 'physical'); const designDir = path.join(rebound, 'public-return-design');
  run('fresh-bkr-survey-rebind', process.execPath, ['scripts/survey_bkr_00.mjs', '--snapshot', sourceRoot, '--out-dir', surveyDir, '--intake-report', sourceIntake]); const freshSurvey = path.join(surveyDir, 'bkr-survey-00.json');
  run('fresh-c01-dimension-recovery-rebind', process.execPath, ['scripts/design_mp11_bkr_c01_dimension_recovery_01.mjs', '--snapshot', sourceRoot, '--out', dimensionDir]); const freshDimension = path.join(dimensionDir, 'mp11-bkr-c01-dimension-recovery-design-01.json');
  run('fresh-c01-physical-design-rebind', process.execPath, ['scripts/design_mp11_c01_dimension_physical_01.mjs', '--snapshot', sourceRoot, '--dimension', freshDimension, '--survey', freshSurvey, '--out', physicalDir]); const freshPhysical = path.join(physicalDir, 'mp11-c01-dimension-physical-01.json');
  run('fresh-public-vertical-return-design-rebind', process.execPath, ['scripts/design_mp11_c01_public_vertical_switchback_return_02.mjs', '--snapshot', sourceRoot, '--physical-design', freshPhysical, '--survey', freshSurvey, '--out', designDir]); const freshDesign = path.join(designDir, 'mp11-c01-public-vertical-switchback-return-02.json');
  const compileDir = path.join(rebound, 'compile'); run('fresh-source-bound-return-compiler', process.execPath, ['scripts/compile_mp11_c01_public_independent_return_02.mjs', '--snapshot', sourceRoot, '--design', freshDesign, '--survey', freshSurvey, '--authorization', prepareAuthorization, '--out', compileDir]);
  const manifestPath = path.join(compileDir, 'mp11-c01-public-independent-return-02.manifest.json'); const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); fail(manifest.id === RELEASE && manifest.source?.snapshot === rel(sourceRoot) && manifest.route?.stationCount === 28 && manifest.target?.canonicalPostStateCellCount === 768 && manifest.mutationAuthority === false, 'fresh rebound manifest identity drifted');
  const forward = manifest.operations.forward.path, rollback = manifest.operations.rollback.path, regions = path.join(sourceRoot, 'region'); ledger.sourceSnapshot = { root: rel(sourceRoot), completeSaveSha256: sourceAudit.packageIdentity.completeSaveSha256, sourceIntake: rel(sourceIntake), manifest: rel(manifestPath), manifestSha256: fileSha(manifestPath), survey: rel(freshSurvey), dimension: rel(freshDimension), physicalDesign: rel(freshPhysical), publicReturnDesign: rel(freshDesign) }; save();
  run('exact-forward-source-preflight', process.execPath, ['scripts/preflight_guarded_ops.mjs', forward, '--regions', regions, '--report', path.join(abs(outDir), 'forward-source-preflight.json')]); run('strict-forward-parser', 'python3', ['scripts/rcon_runner.py', forward, '--dry-run', '--strict-noop', '--operation-role', 'forward', '--report', path.join(abs(outDir), 'forward-parser.json')]); run('strict-rollback-parser', 'python3', ['scripts/rcon_runner.py', rollback, '--dry-run', '--strict-noop', '--operation-role', 'rollback', '--report', path.join(abs(outDir), 'rollback-parser.json')]); run('projected-rollback-preflight', process.execPath, ['scripts/preflight_guarded_ops.mjs', rollback, '--regions', regions, '--source-overlay-ops', forward, '--report', path.join(abs(outDir), 'projected-rollback-preflight.json')]); run('block-entity-and-protected-core-clearance', process.execPath, ['scripts/audit_guarded_ops_block_entities.mjs', '--regions', regions, '--ops', forward, '--report', path.join(abs(outDir), 'block-entity-clearance.json')]);
  if (!execute) { ledger.status = 'PREPARED_REBOUND_SOURCE_REQUIRES_EXECUTE_AUTHORIZATION_LIVE_ENTITY_CLEARANCE_AND_GUARDED_MUTATION'; ledger.completedAtUtc = new Date().toISOString(); save(); console.log(JSON.stringify({ status: ledger.status, ledger: rel(ledgerPath), manifest: rel(manifestPath), mutationAuthority: false }, null, 2)); process.exit(0); }
  run('same-moment-live-entity-clearance', 'python3', ['scripts/redevelopment_live_entity_gate.py', '--ops', forward, '--capture-blocker-nbt', '--report', path.join(abs(outDir), 'live-entity-clearance.json')]); const executed = run('strict-forward-execution', 'python3', ['scripts/rcon_runner.py', forward, '--strict-noop', '--operation-role', 'forward', '--stream-journal', path.join(abs(outDir), 'forward-execution.journal.jsonl'), '--report', path.join(abs(outDir), 'forward-execution.json')], true); if (executed.status !== 0) throw new Error('strict forward execution failed');
  run('fresh-post-complete-save', 'python3', ['scripts/capture_combined_zones_complete_save.py', '--execute', '--dest', postRoot]); complete(postRoot, 'post'); const postIntake = path.join(abs(outDir), 'post-complete-save-intake.json'); run('post-complete-save-intake', process.execPath, ['scripts/audit_combined_zones_complete_save.mjs', '--world-root', postRoot, '--out', postIntake, '--markdown', path.join(abs(outDir), 'post-complete-save-intake.md'), '--generated-at', new Date().toISOString()]); const postAudit = audit(postIntake, postRoot, 'post'); ledger.postSnapshot = { root: rel(postRoot), completeSaveSha256: postAudit.packageIdentity.completeSaveSha256, postIntake: rel(postIntake) }; ledger.status = 'EXECUTED_PENDING_INDEPENDENT_POST_QA'; save();
  run('rollback-poststate-preflight', process.execPath, ['scripts/preflight_guarded_ops.mjs', rollback, '--regions', path.join(postRoot, 'region'), '--report', path.join(abs(outDir), 'rollback-poststate-preflight.json')]); const qaOut = path.join(abs(outDir), 'independent-post-release-qa'); run('independent-immutable-post-qa', process.execPath, ['scripts/qa_mp11_c01_public_independent_return_02_post_release.mjs', '--snapshot', postRoot, '--manifest', manifestPath, '--ledger', ledgerPath, '--post-intake', postIntake, '--out', qaOut]); const qa = JSON.parse(fs.readFileSync(path.join(qaOut, 'mp11-c01-public-independent-return-02-post-qa.json'), 'utf8')); fail(qa.status === 'PASS_C01_RETURN02_IMMUTABLE_POST_QA', 'independent immutable post QA failed'); ledger.status = 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'; ledger.independentPostQa = { path: rel(qaOut), sha256: fileSha(path.join(qaOut, 'mp11-c01-public-independent-return-02-post-qa.json')) }; ledger.completedAtUtc = new Date().toISOString(); save();
} catch (error) { if (ledger.status === 'RUNNING') ledger.status = 'BLOCKED_BY_SCOPE_LOCAL_SAFETY_KERNEL'; ledger.error = error.message; ledger.completedAtUtc = new Date().toISOString(); save(); throw error; }
