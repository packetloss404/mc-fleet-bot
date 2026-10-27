#!/usr/bin/env node
/** Scoped fresh-kernel runner for MP10-RRCH-LIBRARY-EXTERIOR-STAIR-ANNEX-01. */
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const RELEASE_ID = 'MP10-RRCH-LIBRARY-EXTERIOR-STAIR-ANNEX-01';
const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const option = (flag, fallback = null) => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const abs = (item) => path.resolve(ROOT, item);
const rel = (item) => path.relative(ROOT, abs(item)).split(path.sep).join('/');
const sha = (item) => crypto.createHash('sha256').update(fs.readFileSync(abs(item))).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`${RELEASE_ID} kernel rejected: ${message}`); };
const execute = has('--execute');
const outDir = option('--out-dir');
const sourceRoot = option('--source-snapshot-root');
const postRoot = option('--post-snapshot-root');
const authorizationPath = option('--authorization', 'docs/masterplans/10-ravensreach/mp10-rrch-library-exterior-stair-annex-governor-execution-authorization.json');
fail(outDir && sourceRoot, '--out-dir and --source-snapshot-root are required');
fail(!fs.existsSync(abs(outDir)), `--out-dir must be a fresh evidence directory: ${outDir}`);
fail(execute ? postRoot && !fs.existsSync(abs(sourceRoot)) && !fs.existsSync(abs(postRoot)) : fs.existsSync(abs(sourceRoot)),
  execute ? '--execute requires fresh nonexistent source/post snapshot destinations' : 'prepare mode requires an existing immutable source snapshot');
const authorization = JSON.parse(fs.readFileSync(abs(authorizationPath), 'utf8'));
fail(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION' && authorization.revoked === false && authorization.authorizedReleaseId === RELEASE_ID,
  'Governor authorization is absent, revoked, or does not bind this release');

fs.mkdirSync(abs(outDir), { recursive: true });
const ledgerPath = path.join(abs(outDir), 'fresh-kernel-ledger.json');
const ledger = { schemaVersion: 1, id: `${RELEASE_ID}-FRESH-KERNEL`, releaseId: RELEASE_ID, mode: execute ? 'EXECUTE' : 'PREPARE_ONLY', status: 'RUNNING', authorization: { path: rel(authorizationPath), sha256: sha(authorizationPath) }, stages: [] };
const save = () => fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
const run = (stage, command, commandArgs) => {
  const result = spawnSync(command, commandArgs, { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
  const record = { stage, command: [command, ...commandArgs], status: result.status === 0 ? 'PASS' : 'FAIL', stdoutTail: String(result.stdout ?? '').slice(-8000), stderrTail: String(result.stderr ?? '').slice(-8000) };
  ledger.stages.push(record); save();
  if (result.status !== 0) throw new Error(`${stage} failed: ${record.stderrTail || record.stdoutTail}`);
};

try {
  if (execute) run('fresh-source-complete-save', 'python3', ['scripts/capture_combined_zones_complete_save.py', '--execute', '--dest', sourceRoot]);
  const sourceRegions = path.join(abs(sourceRoot), 'region');
  fail(fs.existsSync(sourceRegions) && fs.existsSync(path.join(abs(sourceRoot), 'entities')) && fs.existsSync(path.join(abs(sourceRoot), 'poi')),
    'source must contain immutable region/entities/poi planes');
  const reboundBuildops = path.join(outDir, 'rebound-buildops');
  const reboundReview = path.join(outDir, 'rebound-compiler-evidence');
  const basename = 'mp10-rrch-library-exterior-stair-annex-01';
  run('fresh-source-compiler-rebind', process.execPath, ['scripts/compile_mp10_rrch_library_exterior_stair_annex_01.mjs', '--snapshot', sourceRoot, '--out-dir', reboundBuildops, '--review-dir', reboundReview, '--basename', basename]);
  const forward = path.join(reboundBuildops, `${basename}.forward.txt`);
  const rollback = path.join(reboundBuildops, `${basename}.rollback.txt`);
  const manifest = path.join(reboundBuildops, `${basename}.release-manifest.json`);
  run('forward-source-preflight', process.execPath, ['scripts/preflight_guarded_ops.mjs', forward, '--regions', sourceRegions, '--report', path.join(outDir, 'forward-source-preflight.json')]);
  run('projected-rollback-preflight', process.execPath, ['scripts/preflight_guarded_ops.mjs', rollback, '--regions', sourceRegions, '--source-overlay-ops', forward, '--report', path.join(outDir, 'projected-rollback-preflight.json')]);
  run('block-entity-clearance', process.execPath, ['scripts/audit_guarded_ops_block_entities.mjs', '--regions', sourceRegions, '--ops', forward, '--report', path.join(outDir, 'block-entity-clearance.json')]);
  run('strict-forward-parser', 'python3', ['scripts/rcon_runner.py', forward, '--dry-run', '--strict-noop', '--operation-role', 'forward', '--report', path.join(outDir, 'forward-strict-dry-run.json')]);
  run('strict-rollback-parser', 'python3', ['scripts/rcon_runner.py', rollback, '--dry-run', '--strict-noop', '--operation-role', 'rollback', '--report', path.join(outDir, 'rollback-strict-dry-run.json')]);
  if (!execute) {
    ledger.status = 'PREPARED_STATIC_SOURCE_REQUIRES_EXECUTE_MODE_FOR_FRESH_CAPTURE_AND_LIVE_ENTITY_CLEARANCE'; ledger.completedAtUtc = new Date().toISOString(); save();
    process.stdout.write(`${JSON.stringify({ status: ledger.status, ledger: rel(ledgerPath), manifest: rel(manifest) }, null, 2)}\n`); process.exit(0);
  }
  run('same-moment-live-entity-clearance', 'python3', ['scripts/redevelopment_live_entity_gate.py', '--ops', forward, '--capture-blocker-nbt', '--report', path.join(outDir, 'live-entity-clearance.json')]);
  run('strict-forward-execution', 'python3', ['scripts/rcon_runner.py', forward, '--strict-noop', '--operation-role', 'forward', '--stream-journal', path.join(outDir, 'forward-stream.journal.jsonl'), '--report', path.join(outDir, 'forward-execution.json')]);
  run('fresh-post-complete-save', 'python3', ['scripts/capture_combined_zones_complete_save.py', '--execute', '--dest', postRoot]);
  run('rollback-poststate-preflight', process.execPath, ['scripts/preflight_guarded_ops.mjs', rollback, '--regions', path.join(abs(postRoot), 'region'), '--report', path.join(outDir, 'rollback-poststate-preflight.json')]);
  ledger.status = 'EXECUTED_PENDING_INDEPENDENT_ANNEX_ROUTE_QA'; ledger.completedAtUtc = new Date().toISOString(); save();
  process.stdout.write(`${JSON.stringify({ status: ledger.status, ledger: rel(ledgerPath), manifest: rel(manifest) }, null, 2)}\n`);
} catch (error) {
  ledger.status = 'BLOCKED_BY_SCOPE_LOCAL_SAFETY_KERNEL'; ledger.error = error.message; ledger.completedAtUtc = new Date().toISOString(); save(); throw error;
}
