#!/usr/bin/env node
/** Guarded runner for the C01 main-switchback while Return-02 remains retained. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const RELEASE = 'MP11-C01-MAIN-SWITCHBACK-TRANSITION-01';
const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
const opt = (flag, fallback = null) => { const index = argv.indexOf(flag); return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback; };
const execute = has('--execute');
const validateOnly = has('--validate-execution-authorization');
const outDir = opt('--out-dir');
const sourceRoot = opt('--source-snapshot-root');
const postRoot = opt('--post-snapshot-root');
const failurePostRoot = opt('--failure-post-snapshot-root');
const recoveryPostRoot = opt('--recovery-post-snapshot-root');
const authorizationPath = opt('--execution-authorization', 'docs/masterplans/11-town-expansion-r1/mp11-c01-main-switchback-transition-01-execution-authorization.json');
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(fs.readFileSync(abs(value))).digest('hex');
const fail = (ok, message) => { if (!ok) throw new Error(`${RELEASE} guarded release rejected: ${message}`); };
const read = (value) => JSON.parse(fs.readFileSync(abs(value), 'utf8'));
const complete = (root, label) => {
  for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(abs(root), member)), `${label} capture missing ${member}`);
};
function existingParent(value) {
  let candidate = abs(value);
  while (!fs.existsSync(candidate)) { const parent = path.dirname(candidate); fail(parent !== candidate, `cannot resolve existing parent for ${value}`); candidate = parent; }
  return candidate;
}
function assertExecutionStorage() {
  const reserves = [[sourceRoot, 640], [postRoot, 640], [failurePostRoot, 640], [recoveryPostRoot, 640], [outDir, 256]];
  const devices = new Map();
  for (const [value, mib] of reserves) { const parent = existingParent(value); const device = String(fs.statSync(parent).dev); const prior = devices.get(device) ?? { parent, mib: 0 }; prior.mib += mib; devices.set(device, prior); }
  for (const { parent, mib } of devices.values()) { const stats = fs.statfsSync(parent); const available = (Number(stats.bavail) * Number(stats.bsize)) / (1024 * 1024); fail(available >= mib, `insufficient free storage at ${parent}: require ${mib} MiB, have ${available.toFixed(0)} MiB`); }
}
function authorization() {
  fail(fs.existsSync(abs(authorizationPath)), `missing execution authorization ${authorizationPath}`);
  const value = read(authorizationPath); const scope = value.scopeConstraints ?? {}; const freshness = value.freshness ?? {};
  fail(value.authorizationType === 'SCOPED_EXECUTION_AUTHORIZATION' && value.status === 'AUTHORIZED_SCOPED_EXECUTION_PENDING_FRESH_REBIND' && value.releaseId === RELEASE && value.executionAuthorized === true && value.rconAuthorized === true && value.worldMutationAuthorized === true && value.revoked === false, 'execution authorization is inactive, broad, revoked, or mismatched');
  fail(scope.mainStationCount === 30 && scope.mainClearance?.width === 5 && scope.mainClearance?.height === 5 && scope.guardHandrailTargetCount === 100 && scope.canonicalTargetUnionCount === 928 && scope.maximumChangedCells === 928 && scope.retainedReturn02CanonicalCount === 768 && scope.currentProtectedRouteRetirementTargetCellCount === 0 && scope.selectedRouteClosureState === 'NONE', 'execution authorization scope drift');
  fail(freshness.freshSourceCaptureRequired && freshness.freshReboundContractRequired && freshness.freshReboundManifestRequired && freshness.sameMomentLiveEntityClearanceRequired && freshness.freshPostCaptureRequired && freshness.rollbackPoststatePreflightRequired && freshness.independentImmutablePostQaRequired && /no broader world edit/.test(value.authorizationBoundary ?? ''), 'execution authorization weakens mandatory kernel');
  return value;
}
if (validateOnly) {
  const value = authorization();
  console.log(JSON.stringify({ status: 'SCOPED_EXECUTION_AUTHORIZATION_ACCEPTED_LIVE_GATES_NOT_ENTERED', releaseId: RELEASE, authorization: rel(authorizationPath), authorizationSha256: sha(authorizationPath), requiredFreshness: value.freshness, mutationAuthority: false }, null, 2));
  process.exit(0);
}
fail(outDir && sourceRoot, '--out-dir and --source-snapshot-root are required');
fail(!fs.existsSync(abs(outDir)), '--out-dir must be fresh');
if (execute) {
  authorization();
  fail(postRoot && failurePostRoot && recoveryPostRoot, '--execute requires --post-snapshot-root, --failure-post-snapshot-root, and --recovery-post-snapshot-root');
  for (const destination of [sourceRoot, postRoot, failurePostRoot, recoveryPostRoot]) fail(!fs.existsSync(abs(destination)), `--execute requires fresh capture destination ${destination}`);
  assertExecutionStorage();
} else complete(sourceRoot, 'prepare-only source');

fs.mkdirSync(abs(outDir), { recursive: true });
const ledgerPath = path.join(abs(outDir), 'mp11-c01-main-switchback-transition-01-guarded-release-ledger.json');
const ledger = { schemaVersion: 1, id: `${RELEASE}-GUARDED-RELEASE`, releaseId: RELEASE, mode: execute ? 'EXECUTE' : 'PREPARE_ONLY', status: 'RUNNING', mutationAuthority: false, stages: [] };
const save = () => fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
const run = (stage, command, args, allowFailure = false) => {
  const result = spawnSync(command, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
  const entry = { stage, command: [command, ...args], status: result.status === 0 ? 'PASS' : 'FAIL', stdoutTail: String(result.stdout ?? '').slice(-8000), stderrTail: String(result.stderr ?? '').slice(-8000) };
  ledger.stages.push(entry); save();
  if (result.status !== 0 && !allowFailure) throw new Error(`${stage} failed: ${entry.stderrTail || entry.stdoutTail}`);
  return result;
};
const intake = (root, label) => {
  const report = path.join(abs(outDir), `${label}-complete-save-intake.json`);
  run(`${label}-complete-save-intake`, process.execPath, ['scripts/audit_combined_zones_complete_save.mjs', '--world-root', root, '--out', report, '--markdown', path.join(abs(outDir), `${label}-complete-save-intake.md`), '--generated-at', new Date().toISOString()]);
  const value = read(report); fail(value.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE' && value.summary?.passed === true && value.input?.suppliedWorldRoot === rel(root), `${label} immutable capture intake failed`);
  return report;
};
let forwardAttempted = false;
try {
  if (execute) run('fresh-source-complete-save', 'python3', ['scripts/capture_combined_zones_complete_save.py', '--execute', '--dest', sourceRoot]);
  complete(sourceRoot, 'source');
  const sourceIntake = intake(sourceRoot, 'source');
  const rebound = path.join(abs(outDir), 'rebound');
  const transition = path.join(rebound, 'transition');
  const compile = path.join(rebound, 'compile');
  run('fresh-main-switchback-transition-rebind', process.execPath, ['scripts/design_mp11_c01_main_switchback_transition_return02_preservation_05.mjs', '--snapshot', sourceRoot, '--out', transition]);
  const transitionPath = path.join(transition, 'mp11-c01-main-switchback-transition-return02-preservation-05.json');
  run('fresh-main-switchback-compiler', process.execPath, ['scripts/compile_mp11_c01_main_switchback_transition_01.mjs', '--snapshot', sourceRoot, '--contract', transitionPath, '--out', compile]);
  const manifestPath = path.join(compile, 'mp11-c01-main-switchback-transition-01.manifest.json');
  const manifest = read(manifestPath);
  fail(manifest.id === RELEASE && manifest.scope?.stationCount === 30 && manifest.scope?.guardHandrailTargets?.cellCount === 100 && manifest.scope?.canonicalTargetUnion?.cellCount === 928 && manifest.scope?.currentProtectedRouteRetirementTargetCellCount === 0 && manifest.scope?.currentRouteClosureState === 'NONE' && manifest.retainedReturn02?.canonicalStateGeometry?.cellCount === 768 && manifest.retainedReturn02?.mainAndGuardIntersectionCount === 0 && manifest.operations?.forward?.commandCount > 0 && manifest.operations.forward.commandCount <= 928, 'fresh main-switchback manifest scope drift');
  const forward = manifest.operations.forward.path; const rollback = manifest.operations.rollback.path; const regions = path.join(sourceRoot, 'region');
  ledger.sourceSnapshot = { root: rel(sourceRoot), sourceIntake: rel(sourceIntake), transitionContract: rel(transitionPath), manifest: rel(manifestPath), manifestSha256: sha(manifestPath), manifestIdentitySha256: manifest.manifestIdentitySha256 }; save();
  run('exact-forward-source-preflight', process.execPath, ['scripts/preflight_guarded_ops.mjs', forward, '--regions', regions, '--report', path.join(abs(outDir), 'forward-source-preflight.json')]);
  run('strict-forward-parser', 'python3', ['scripts/rcon_runner.py', forward, '--dry-run', '--strict-noop', '--operation-role', 'forward', '--report', path.join(abs(outDir), 'forward-parser.json')]);
  run('strict-rollback-parser', 'python3', ['scripts/rcon_runner.py', rollback, '--dry-run', '--strict-noop', '--operation-role', 'rollback', '--report', path.join(abs(outDir), 'rollback-parser.json')]);
  run('projected-rollback-preflight', process.execPath, ['scripts/preflight_guarded_ops.mjs', rollback, '--regions', regions, '--source-overlay-ops', forward, '--report', path.join(abs(outDir), 'projected-rollback-preflight.json')]);
  run('block-entity-and-protected-core-clearance', process.execPath, ['scripts/audit_guarded_ops_block_entities.mjs', '--regions', regions, '--ops', forward, '--report', path.join(abs(outDir), 'block-entity-clearance.json')]);
  if (!execute) {
    ledger.status = 'PREPARED_REBOUND_SOURCE_REQUIRES_EXECUTE_AUTHORIZATION_LIVE_ENTITY_CLEARANCE_AND_GUARDED_MUTATION'; ledger.completedAtUtc = new Date().toISOString(); save();
    console.log(JSON.stringify({ status: ledger.status, ledger: rel(ledgerPath), manifest: rel(manifestPath), mutationAuthority: false }, null, 2)); process.exit(0);
  }
  run('same-moment-live-entity-clearance', 'python3', ['scripts/redevelopment_live_entity_gate.py', '--ops', forward, '--capture-blocker-nbt', '--report', path.join(abs(outDir), 'live-entity-clearance.json')]);
  forwardAttempted = true;
  const forwardResult = run('strict-forward-execution', 'python3', ['scripts/rcon_runner.py', forward, '--strict-noop', '--operation-role', 'forward', '--stream-journal', path.join(abs(outDir), 'forward-execution.journal.jsonl'), '--report', path.join(abs(outDir), 'forward-execution.json')], true);
  if (forwardResult.status !== 0) {
    run('failure-post-complete-save', 'python3', ['scripts/capture_combined_zones_complete_save.py', '--execute', '--dest', failurePostRoot]); complete(failurePostRoot, 'failure post'); const failureIntake = intake(failurePostRoot, 'failure-post');
    const subset = path.join(abs(outDir), 'journal-proven-rollback-subset.txt');
    run('derive-exact-journal-subset', process.execPath, ['scripts/derive_guarded_rollback_subset.mjs', '--forward', forward, '--rollback', rollback, '--journal', path.join(abs(outDir), 'forward-execution.journal.jsonl'), '--out', subset]);
    run('subset-parser', 'python3', ['scripts/rcon_runner.py', subset, '--dry-run', '--strict-noop', '--operation-role', 'rollback', '--report', path.join(abs(outDir), 'subset-parser.json')]);
    run('subset-preflight', process.execPath, ['scripts/preflight_guarded_ops.mjs', subset, '--regions', path.join(failurePostRoot, 'region'), '--report', path.join(abs(outDir), 'subset-preflight.json')]);
    const rollbackResult = run('strict-journaled-compensating-rollback', 'python3', ['scripts/rcon_runner.py', subset, '--strict-noop', '--operation-role', 'rollback', '--stream-journal', path.join(abs(outDir), 'compensating-rollback.journal.jsonl'), '--report', path.join(abs(outDir), 'compensating-rollback.json')], true);
    if (rollbackResult.status !== 0) throw new Error('compensating rollback failed');
    run('recovery-post-complete-save', 'python3', ['scripts/capture_combined_zones_complete_save.py', '--execute', '--dest', recoveryPostRoot]); complete(recoveryPostRoot, 'recovery post'); const recoveryIntake = intake(recoveryPostRoot, 'recovery-post');
    run('recovery-forward-preflight', process.execPath, ['scripts/preflight_guarded_ops.mjs', forward, '--regions', path.join(recoveryPostRoot, 'region'), '--report', path.join(abs(outDir), 'recovery-forward-preflight.json')]);
    ledger.status = 'FORWARD_FAILED_COMPENSATING_ROLLBACK_VERIFIED'; ledger.failurePost = { root: rel(failurePostRoot), intake: rel(failureIntake), subset: rel(subset) }; ledger.recoveryPost = { root: rel(recoveryPostRoot), intake: rel(recoveryIntake) }; ledger.completedAtUtc = new Date().toISOString(); save(); process.exit(1);
  }
  run('fresh-post-complete-save', 'python3', ['scripts/capture_combined_zones_complete_save.py', '--execute', '--dest', postRoot]); complete(postRoot, 'post'); const postIntake = intake(postRoot, 'post');
  ledger.postSnapshot = { root: rel(postRoot), postIntake: rel(postIntake) }; ledger.status = 'EXECUTED_PENDING_INDEPENDENT_POST_QA'; save();
  run('rollback-poststate-preflight', process.execPath, ['scripts/preflight_guarded_ops.mjs', rollback, '--regions', path.join(postRoot, 'region'), '--report', path.join(abs(outDir), 'rollback-poststate-preflight.json')]);
  const qaOut = path.join(abs(outDir), 'independent-post-release-qa');
  run('independent-immutable-post-qa', process.execPath, ['scripts/qa_mp11_c01_main_switchback_transition_01_post_release.mjs', '--snapshot', postRoot, '--manifest', manifestPath, '--ledger', ledgerPath, '--post-intake', postIntake, '--out', qaOut]);
  const qa = read(path.join(qaOut, 'mp11-c01-main-switchback-transition-01-post-qa.json')); fail(qa.status === 'PASS_C01_MAIN_SWITCHBACK_TRANSITION_IMMUTABLE_POST_QA', 'independent immutable post QA failed');
  ledger.status = 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'; ledger.independentPostQa = { path: rel(qaOut), sha256: sha(path.join(qaOut, 'mp11-c01-main-switchback-transition-01-post-qa.json')) }; ledger.completedAtUtc = new Date().toISOString(); save();
} catch (error) {
  if (ledger.status === 'RUNNING') ledger.status = forwardAttempted ? 'FORWARD_FAILED_COMPENSATING_ROLLBACK_UNVERIFIED' : 'BLOCKED_BY_SCOPE_LOCAL_SAFETY_KERNEL';
  ledger.error = error.message; ledger.completedAtUtc = new Date().toISOString(); save(); throw error;
}
