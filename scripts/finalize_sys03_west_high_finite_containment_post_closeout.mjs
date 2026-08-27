#!/usr/bin/env node
/** Append-only closeout for the West High post-state rollback preflight repair. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const option = (flag) => { const index = argv.indexOf(flag); return index < 0 ? '' : (argv[index + 1] ?? ''); };
const LEDGER = option('--ledger'); const MANIFEST = option('--manifest'); const WATER = option('--water-preflight'); const GRAVITY = option('--gravity-preflight'); const OUT = option('--out');
const NODE = 'SYS03-WEST-HIGH-FINITE-CONTAINMENT';
const abs = (file) => path.resolve(ROOT, file); const rel = (file) => path.relative(ROOT, abs(file)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (condition) throw new Error(`SYS03 West High closeout rejected: ${message}`); };
for (const [name, value] of Object.entries({ '--ledger': LEDGER, '--manifest': MANIFEST, '--water-preflight': WATER, '--gravity-preflight': GRAVITY, '--out': OUT })) fail(!value, `${name} is required`);
fail(fs.existsSync(abs(OUT)), '--out must be a fresh append-only path');
const ledgerBytes = fs.readFileSync(abs(LEDGER)); const ledger = JSON.parse(ledgerBytes);
const manifestBytes = fs.readFileSync(abs(MANIFEST)); const manifest = JSON.parse(manifestBytes);
fail(ledger.releaseNodeId !== NODE || ledger.transactionId !== manifest.transactionId || ledger.manifest?.sha256 !== sha(manifestBytes), 'ledger/manifest identity drifted');
const water = JSON.parse(fs.readFileSync(abs(WATER))); const gravity = JSON.parse(fs.readFileSync(abs(GRAVITY)));
const packageByKey = new Map(manifest.packages.map((pkg) => [pkg.key, pkg]));
const validate = (report, pkg, expected) => {
  fail(report.status !== 'PASS' || report.passed !== expected || report.failed !== 0, `${pkg.key} preflight is not exact PASS`);
  fail(report.opsPath !== pkg.rollback || report.opsSha256 !== manifest.operations[pkg.key].rollbackSha256, `${pkg.key} rollback operation identity drifted`);
  fail(report.regions !== ledger.postSnapshot?.regions, `${pkg.key} preflight is not bound to the immutable post regions`);
};
const waterPkg = packageByKey.get('finite-water-component-plug-low-to-high'); const gravityPkg = packageByKey.get('gravity-foundation-lock-bottom-up');
fail(!waterPkg || !gravityPkg, 'expected staged packages missing'); validate(water, waterPkg, 2525); validate(gravity, gravityPkg, 92);
const required = ['fresh-post-complete-save', 'post-complete-save-intake', 'strict-forward-execution:gravity-foundation-lock-bottom-up', 'strict-forward-execution:finite-water-component-plug-low-to-high'];
fail(required.some((stage) => !ledger.stages?.some((entry) => entry.stage === stage && entry.status === 'PASS')), 'prior atomic execution evidence is incomplete');
const finalLedger = {
  ...ledger,
  id: 'sys03-west-high-finite-containment-post-closeout',
  status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
  priorInterruptedLedger: { path: rel(LEDGER), sha256: sha(ledgerBytes), status: ledger.status },
  stages: [...ledger.stages, {
    stage: 'rollback-poststate-preflight:finite-water-component-plug-low-to-high', status: 'PASS', correctedPostOverlayOrder: 'post snapshot directly; no forward overlays', report: rel(WATER),
  }, {
    stage: 'rollback-poststate-preflight:gravity-foundation-lock-bottom-up', status: 'PASS', correctedPostOverlayOrder: 'post snapshot plus completed water rollback overlay only', report: rel(GRAVITY),
  }],
  closeout: { correctedWrapper: 'scripts/run_sys03_west_high_finite_containment_atomic_release.mjs', waterRollback: { report: rel(WATER), sha256: sha(fs.readFileSync(abs(WATER))) }, gravityRollback: { report: rel(GRAVITY), sha256: sha(fs.readFileSync(abs(GRAVITY))) } },
  completedAtUtc: new Date().toISOString(),
};
finalLedger.closeoutPayloadSha256 = sha(JSON.stringify(finalLedger));
fs.mkdirSync(path.dirname(abs(OUT)), { recursive: true }); fs.writeFileSync(abs(OUT), `${JSON.stringify(finalLedger, null, 2)}\n`);
console.log(JSON.stringify({ status: finalLedger.status, out: rel(OUT), correctedStages: 2 }, null, 2));
