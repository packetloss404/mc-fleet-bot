#!/usr/bin/env node
/** Execute the ordered water-bypass packages and compensate every touched package on failure. */
import childProcess from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const evidence = process.argv[2];
if (!evidence) throw new Error('usage: run_rail_s3_water_bypass_01_execution.mjs <evidence-directory>');
const packages = ['isolation-shell', 'retained-water-transfer', 'temporary-cage-restoration'];
const basenameIndex = process.argv.indexOf('--basename');
const basename = basenameIndex >= 0 ? process.argv[basenameIndex + 1] : 'rail-s3-water-bypass-01';
const out = (file) => path.resolve(ROOT, evidence, file);
fs.mkdirSync(path.resolve(ROOT, evidence), { recursive: true });
const ledger = { schemaVersion: 1, id: 'rail-s3-water-bypass-01-execution', status: 'RUNNING', packages, stages: [] };
const ledgerPath = out('ordered-execution-ledger.json');
const save = () => fs.writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
const run = (stage, command, args) => {
  const result = childProcess.spawnSync(command, args, { cwd: ROOT, encoding: 'utf8' });
  ledger.stages.push({ stage, command, args, status: result.status, stdout: result.stdout, stderr: result.stderr }); save();
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result.status === 0;
};
const forwards = packages.map((key) => `data/buildops/${basename}.${key}.forward.txt`);
if (!run('same-moment-composite-entity-clearance', 'python3', [
  'scripts/redevelopment_live_entity_gate.py', ...forwards.flatMap((ops) => ['--ops', ops]), '--capture-blocker-nbt',
  '--report', `${evidence}/all-packages.same-moment-entity-clearance.json`,
])) { ledger.status = 'BLOCKED_BEFORE_MUTATION'; save(); process.exitCode = 1; }
else {
  const completed = [];
  let failed = null;
  for (const key of packages) {
    const ok = run(`forward:${key}`, 'python3', [
      'scripts/rcon_runner.py', `data/buildops/${basename}.${key}.forward.txt`, '--strict-noop', '--operation-role', 'forward',
      '--report', `${evidence}/${key}.forward-execution.json`, '--stream-journal', `${evidence}/${key}.forward-execution.stream-journal.jsonl`,
    ]);
    if (!ok) { failed = key; break; }
    completed.push(key);
  }
  if (!failed) { ledger.status = 'FORWARD_EXECUTED_AWAITING_FRESH_POST_CAPTURE'; save(); }
  else {
    ledger.status = 'FORWARD_FAILED_COMPENSATING'; save();
    const rollbackKeys = [failed, ...completed.slice().reverse()];
    let rollbackFailed = false;
    for (const key of rollbackKeys) {
      if (!run(`compensating-rollback:${key}`, 'python3', [
        'scripts/rcon_runner.py', `data/buildops/${basename}.${key}.rollback.txt`, '--strict-noop', '--operation-role', 'rollback',
        '--report', `${evidence}/${key}.compensating-rollback-execution.json`, '--stream-journal', `${evidence}/${key}.compensating-rollback.stream-journal.jsonl`,
      ])) rollbackFailed = true;
    }
    ledger.status = rollbackFailed ? 'FORWARD_AND_COMPENSATION_FAILED' : 'FORWARD_FAILED_COMPENSATED'; save(); process.exitCode = 1;
  }
}
