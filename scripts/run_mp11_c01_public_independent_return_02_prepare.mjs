#!/usr/bin/env node
/** Static guarded prepare kernel; deliberately incapable of live execution. */
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd(); const RELEASE = 'MP11-C01-PUBLIC-INDEPENDENT-RETURN-02'; const args = process.argv.slice(2);
const option = (flag, fallback = null) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const has = (flag) => args.includes(flag); const abs = (file) => path.resolve(ROOT, file); const rel = (file) => path.relative(ROOT, abs(file)).split(path.sep).join('/');
const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(abs(file))).digest('hex'); const fail = (ok, message) => { if (!ok) throw new Error(`${RELEASE} prepare kernel rejected: ${message}`); };
const outDir = option('--out-dir'); const source = option('--source-snapshot-root'); const design = option('--design', 'data/world-review/mp11-c01-public-vertical-switchback-return-02-c01-08-post-20260828T043000Z/mp11-c01-public-vertical-switchback-return-02.json'); const survey = option('--survey', 'data/world-review/bkr-survey-00-c01-08-post-20260828T040000Z/bkr-survey-00.json'); const authorization = option('--authorization', 'docs/masterplans/11-town-expansion-r1/mp11-c01-public-independent-return-02-prepare-authorization.json');
fail(!has('--execute'), 'this authorization is deliberately prepare-only; --execute is prohibited'); fail(outDir && source, '--out-dir and --source-snapshot-root are required'); fail(!fs.existsSync(abs(outDir)), '--out-dir must be fresh');
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(abs(source), member)), `source missing complete immutable member ${member}`);
const auth = JSON.parse(fs.readFileSync(abs(authorization), 'utf8')); fail(auth.status === 'AUTHORIZED_PREPARE_ONLY_SOURCE_BOUND_COMPILATION' && auth.releaseId === RELEASE && auth.prepareOnlyAuthorized === true && auth.executionAuthorized === false && auth.rconAuthorized === false && auth.worldMutationAuthorized === false && auth.revoked === false, 'prepare-only authorization mismatch');
fs.mkdirSync(abs(outDir), { recursive: true }); const ledgerPath = path.join(abs(outDir), 'prepare-kernel-ledger.json');
const ledger = { schemaVersion: 1, id: `${RELEASE}-PREPARE-KERNEL`, releaseId: RELEASE, status: 'RUNNING', mode: 'STATIC_PREPARE_ONLY_NO_LIVE_EXECUTION', mutationAuthority: false, authorization: { path: rel(authorization), sha256: sha(authorization) }, stages: [] };
const save = () => fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
const run = (stage, command, commandArgs) => { const result = spawnSync(command, commandArgs, { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }); const row = { stage, command: [command, ...commandArgs], status: result.status === 0 ? 'PASS' : 'FAIL', stdoutTail: String(result.stdout ?? '').slice(-6000), stderrTail: String(result.stderr ?? '').slice(-6000) }; ledger.stages.push(row); save(); if (result.status !== 0) throw new Error(`${stage} failed: ${row.stderrTail || row.stdoutTail}`); };
try {
  const buildops = path.join(abs(outDir), 'buildops');
  run('authorization-and-source-bound-compiler', process.execPath, ['scripts/compile_mp11_c01_public_independent_return_02.mjs', '--snapshot', source, '--design', design, '--survey', survey, '--authorization', authorization, '--out', buildops]);
  const manifest = path.join(buildops, 'mp11-c01-public-independent-return-02.manifest.json'); const forward = path.join(buildops, 'mp11-c01-public-independent-return-02.forward.txt'); const rollback = path.join(buildops, 'mp11-c01-public-independent-return-02.rollback.txt'); const regions = path.join(abs(source), 'region');
  run('exact-forward-source-preflight', process.execPath, ['scripts/preflight_guarded_ops.mjs', forward, '--regions', regions, '--report', path.join(abs(outDir), 'forward-source-preflight.json')]);
  run('exact-projected-rollback-preflight', process.execPath, ['scripts/preflight_guarded_ops.mjs', rollback, '--regions', regions, '--source-overlay-ops', forward, '--report', path.join(abs(outDir), 'projected-rollback-preflight.json')]);
  run('block-entity-and-protected-core-clearance', process.execPath, ['scripts/audit_guarded_ops_block_entities.mjs', '--regions', regions, '--ops', forward, '--report', path.join(abs(outDir), 'block-entity-clearance.json')]);
  run('strict-forward-parser', 'python3', ['scripts/rcon_runner.py', forward, '--dry-run', '--strict-noop', '--operation-role', 'forward', '--report', path.join(abs(outDir), 'forward-strict-dry-run.json')]);
  run('strict-rollback-parser', 'python3', ['scripts/rcon_runner.py', rollback, '--dry-run', '--strict-noop', '--operation-role', 'rollback', '--report', path.join(abs(outDir), 'rollback-strict-dry-run.json')]);
  run('projected-functional-qa', process.execPath, ['scripts/qa_mp11_c01_public_independent_return_02_projected.mjs', '--manifest', manifest, '--snapshot', source, '--out', path.join(abs(outDir), 'projected-functional-qa')]);
  ledger.status = 'PREPARED_STATIC_SOURCE_FULL_OFFLINE_KERNEL_PASS_LIVE_EXECUTION_PROHIBITED'; ledger.completedAtUtc = new Date().toISOString(); ledger.liveHardStop = 'Same-moment live entity clearance, fresh execute authorization, journaled RCON execution, immutable post snapshot, rollback poststate preflight, and independent post QA are intentionally not present in prepare-only mode.'; save();
  console.log(JSON.stringify({ status: ledger.status, mutationAuthority: false, ledger: rel(ledgerPath), manifest: rel(manifest) }, null, 2));
} catch (error) { ledger.status = 'PREPARE_KERNEL_FAILED'; ledger.error = error.message; ledger.completedAtUtc = new Date().toISOString(); save(); throw error; }
