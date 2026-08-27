#!/usr/bin/env node
/**
 * Prepare (never execute) a fresh-source-bound West High containment release.
 *
 * A caller may supply an already fresh immutable capture or have this wrapper
 * obtain one. In either case the operation package is recompiled into a new
 * data/buildops directory from that capture before the generic scoped runner
 * validates the manifest and hard-safety preparation kernel.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback = '') => { const index = argv.indexOf(flag); return index < 0 ? fallback : (argv[index + 1] ?? fallback); };
const has = (flag) => argv.includes(flag);
const sourceRoot = value('--source-snapshot-root');
const captureDest = value('--capture-source-dest');
const packageDir = value('--package-dir');
const outDir = value('--out-dir');
const printPlan = has('--print-plan');
const generatedAt = value('--generated-at', new Date().toISOString());
const authorization = 'docs/masterplans/05-combined-zones/sys03-west-high-finite-containment-governor-standing-execution-authorization.json';
const releaseNode = 'SYS03-WEST-HIGH-FINITE-CONTAINMENT';
const abs = (file) => path.resolve(ROOT, file);
const rel = (file) => path.relative(ROOT, abs(file)).split(path.sep).join('/');
const fail = (condition, message) => { if (condition) throw new Error(`SYS03 West High preparation rejected: ${message}`); };
const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, timeout: 60 * 60 * 1000 });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed: ${String(result.stderr || result.stdout).slice(-8000)}`);
  return String(result.stdout);
};

fail(has('--execute'), 'this reconciliation wrapper is preparation-only; it never executes a world mutation');
fail(Boolean(sourceRoot) === Boolean(captureDest), 'provide exactly one of --source-snapshot-root or --capture-source-dest');
fail(!packageDir, '--package-dir is required and must be a new directory under data/buildops');
fail(!printPlan && !outDir, '--out-dir is required unless --print-plan is set');
const packageRoot = abs(packageDir);
const buildopsRoot = abs('data/buildops');
const packageRelative = path.relative(buildopsRoot, packageRoot);
fail(!packageRelative || packageRelative.startsWith('..') || path.isAbsolute(packageRelative), '--package-dir must be a child of data/buildops');
fail(fs.existsSync(packageRoot), '--package-dir already exists; rebind outputs are append-only');
if (!printPlan) fail(fs.existsSync(abs(outDir)), '--out-dir already exists; evidence destinations are append-only');

let source = sourceRoot;
if (captureDest) {
  fail(fs.existsSync(abs(captureDest)), '--capture-source-dest already exists; it must be fresh');
  run('python3', ['scripts/capture_combined_zones_complete_save.py', '--execute', '--dest', captureDest]);
  source = captureDest;
}
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(!fs.existsSync(path.join(abs(source), member)), `source snapshot lacks ${member}`);
const capture = JSON.parse(fs.readFileSync(path.join(abs(source), 'combined-zones-complete-save-capture.json'), 'utf8'));
fail(capture.immutableCopy !== true || !capture.captureId, 'source capture is not a complete immutable capture');
const basename = `sys03-west-high-finite-containment-01-${capture.captureId}`;
run(process.execPath, [
  'scripts/compile_sys03_west_high_finite_containment_01.mjs', '--snapshot', source,
  '--out-dir', packageDir, '--basename', basename, '--generated-at', generatedAt,
]);
const manifest = `${packageDir}/${basename}.release-manifest.json`;
const manifestRecord = JSON.parse(fs.readFileSync(abs(manifest), 'utf8'));
fail(manifestRecord.source?.completeSaveCapture?.captureId !== capture.captureId, 'manifest capture ID is not bound to the supplied source');
const genericArgs = [
  'scripts/run_combined_zones_scoped_release.mjs', '--manifest', manifest, '--release-node', releaseNode,
  '--authorization', authorization,
  ...(printPlan ? ['--print-plan'] : ['--out-dir', outDir, '--existing-source-regions', `${source}/region`]),
];
const genericOutput = run(process.execPath, genericArgs);
process.stdout.write(`${JSON.stringify({
  status: printPlan ? 'SOURCE_REBOUND_PREPARE_PLAN' : 'SOURCE_REBOUND_PREPARE_READY',
  sourceSnapshot: rel(source), captureId: capture.captureId, manifest: rel(manifest), packageDir: rel(packageDir),
  genericRunner: 'scripts/run_combined_zones_scoped_release.mjs', genericOutput: JSON.parse(genericOutput),
  worldMutated: false, executionAuthorized: false,
}, null, 2)}\n`);
