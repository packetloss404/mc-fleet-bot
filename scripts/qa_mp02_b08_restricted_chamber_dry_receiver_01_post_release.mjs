#!/usr/bin/env node
/** Independent immutable-post QA for MP02 B08 chamber / dry receiver. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd(); const ID = 'MP02-B08-RESTRICTED-CHAMBER-DRY-RECEIVER-01'; const args = process.argv.slice(2);
const option = (name, fallback = null) => { const index = args.indexOf(name); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const fail = (message) => { throw new Error(`${ID} post-release QA rejected: ${message}`); };
const abs = (value) => path.resolve(ROOT, value); const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/'); const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const parse = (filename) => fs.readFileSync(abs(filename), 'utf8').split(/\r?\n/).filter((line) => line.startsWith('REPL ')).map((line) => { const terms = line.trim().split(/\s+/); if (terms.length !== 9) fail(`malformed operation ${line}`); const [x1, y1, z1, x2, y2, z2] = terms.slice(1, 7).map(Number); if (x1 !== x2 || y1 !== y2 || z1 !== z2) fail(`non-unit operation ${line}`); return { cell: { x: x1, y: y1, z: z1 }, source: terms[7], target: terms[8] }; });
const canonical = (entries) => `${entries.map(({ cell, source, target }) => `REPL ${cell.x} ${cell.y} ${cell.z} ${cell.x} ${cell.y} ${cell.z} ${source} ${target}`).join('\n')}\n`;
const snapshotArg = option('--snapshot'); const manifestArg = option('--manifest'); const remediationArg = option('--preservation-remediation-ledger'); const outArg = option('--out');
if (!snapshotArg || !manifestArg || !outArg) fail('usage: --snapshot <immutable post snapshot> --manifest <rebound manifest> --out <report>');
const SNAPSHOT = abs(snapshotArg); const MANIFEST = abs(manifestArg); const OUT = abs(outArg);
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) if (!fs.existsSync(path.join(SNAPSHOT, member))) fail(`incomplete post snapshot; missing ${member}`);
const manifestBytes = fs.readFileSync(MANIFEST); const manifest = JSON.parse(manifestBytes);
if (manifest.scope?.releaseId !== ID) fail('manifest identity drifted');
const forward = [];
for (const pkg of manifest.packages ?? []) { const items = parse(pkg.forward); const rollback = parse(pkg.rollback); const binding = manifest.operations?.[pkg.key]; if (!binding || sha(canonical(items)) !== binding.forwardSha256 || sha(canonical(rollback)) !== binding.rollbackSha256) fail(`operation hash drift ${pkg.key}`); const inverse = items.slice().reverse().map(({ cell, source, target }) => ({ cell, source: target, target: source })); if (JSON.stringify(rollback) !== JSON.stringify(inverse)) fail(`rollback inverse drift ${pkg.key}`); forward.push(...items); }
const reader = new AnvilReader(path.join(SNAPSHOT, 'region')); const targetFailures = [];
for (const { cell, target } of forward) { const actual = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)); if (actual !== target) targetFailures.push({ cell, target, actual }); }
if (targetFailures.length) fail(`post target state drift ${JSON.stringify(targetFailures.slice(0, 4))}`);
const preserved = [
  ...Array.from({ length: 20 }, (_, index) => ({ x: 2049, y: 130 + Math.floor(index / 5), z: -750 + (index % 5), expected: 'minecraft:air' })),
  ...Array.from({ length: 12 }, (_, index) => ({ x: 2050, y: 129 + Math.floor(index / 3), z: -749 + (index % 3), expected: 'minecraft:polished_diorite' })),
];
const preservationFailures = [];
for (const { x, y, z, expected } of preserved) { const actual = stateToCommandString(await reader.blockState(x, y, z)); if (actual !== expected) preservationFailures.push({ cell: { x, y, z }, expected, actual }); }
if (preservationFailures.length) fail(`B03/B09 preservation drift ${JSON.stringify(preservationFailures.slice(0, 4))}`);
let preservedGuideway = manifest.staticClearance?.B09GuidewayExactSourceStates; let preservationBaseline = 'manifest';
if (!Array.isArray(preservedGuideway) || preservedGuideway.length !== 19) {
  if (!remediationArg) fail('manifest lacks the exact 19-cell B09 guideway/control preservation baseline');
  const remediationPath = abs(remediationArg); const remediationBytes = fs.readFileSync(remediationPath); const remediation = JSON.parse(remediationBytes);
  if (remediation.status !== 'PASS_SOURCE_BOUND_POST_PRESERVATION_RECONSTRUCTION' || remediation.releaseId !== ID || remediation.transaction?.manifestSha256 !== sha(manifestBytes) || abs(remediation.transaction?.manifest ?? '') !== MANIFEST || abs(remediation.transaction?.post ?? '') !== SNAPSHOT) fail('preservation remediation ledger is not bound to this manifest and immutable post');
  preservedGuideway = remediation.baseline?.B09GuidewayAndControls?.source;
  if (!Array.isArray(preservedGuideway) || preservedGuideway.length !== 19 || remediation.baseline?.B09GuidewayAndControls?.post?.length !== 19) fail('preservation remediation ledger lacks an exact 19-cell source/post control baseline');
  preservationBaseline = `source-bound remediation ledger ${rel(remediationPath)} (${sha(remediationBytes)})`;
}
const guidewayFailures = [];
for (const { cell, state: expected } of preservedGuideway) {
  const actual = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  if (actual !== expected) guidewayFailures.push({ cell, expected, actual });
}
if (guidewayFailures.length) fail(`B09 guideway/control preservation drift ${JSON.stringify(guidewayFailures.slice(0, 4))}`);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp02-b08-chamber-post-qa-'));
try {
  const write = (name, lines) => { const filename = path.join(temp, name); fs.writeFileSync(filename, `${lines.join('\n')}\n`); return filename; };
  const northFailure = write('north-failure.txt', [
    'SET 2007 129 -741 2007 129 -741 minecraft:iron_door[facing=north,half=lower,hinge=left,open=false,powered=false]', 'SET 2007 130 -741 2007 130 -741 minecraft:iron_door[facing=north,half=upper,hinge=left,open=false,powered=false]',
    'SET 2008 129 -741 2008 129 -741 minecraft:iron_door[facing=north,half=lower,hinge=right,open=false,powered=false]', 'SET 2008 130 -741 2008 130 -741 minecraft:iron_door[facing=north,half=upper,hinge=right,open=false,powered=false]',
    'SET 2009 129 -741 2009 129 -741 minecraft:iron_door[facing=north,half=lower,hinge=left,open=false,powered=false]', 'SET 2009 130 -741 2009 130 -741 minecraft:iron_door[facing=north,half=upper,hinge=left,open=false,powered=false]',
  ]);
  const shaftFailure = write('shaft-failure.txt', ['SET 2008 129 -748 2008 129 -748 minecraft:deepslate_tiles', 'SET 2008 130 -748 2008 130 -748 minecraft:deepslate_tiles']);
  const reach = (id, ops, to, expected) => { const result = spawnSync(process.execPath, ['scripts/reachability.mjs', '--regions', path.join(SNAPSHOT, 'region'), ...(ops ? ['--ops', ops] : []), '--from', '2008,129,-745', '--to', to, '--pad', '16', '--budget', '1000000'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }); const passed = result.status === 0 && result.stdout.includes('REACHABLE'); return { id, expected, passed, correct: passed === expected, output: result.stdout.trim().split(/\r?\n/).slice(-4) }; };
  const routes = [
    reach('normal-north-handoff', null, '2008,129,-690', true), reach('normal-shaft-surface', null, '2005,208,-748', true),
    reach('north-failure-north-isolated', northFailure, '2008,129,-690', false), reach('north-failure-shaft-survives', northFailure, '2005,208,-748', true),
    reach('shaft-failure-north-survives', shaftFailure, '2008,129,-690', true), reach('shaft-failure-shaft-isolated', shaftFailure, '2005,208,-748', false),
  ];
  if (routes.some(({ correct }) => !correct)) fail(`post normal/failure route QA failed: ${JSON.stringify(routes.filter(({ correct }) => !correct))}`);
  const report = { schemaVersion: 1, id: 'mp02-b08-restricted-chamber-dry-receiver-01-independent-post-qa', releaseId: ID, status: 'PASS_EXECUTED_RESTRICTED_CHAMBER_DRY_RECEIVER_POST_QA', readOnly: true, worldMutated: false, snapshot: rel(SNAPSHOT), manifest: rel(MANIFEST), manifestSha256: sha(manifestBytes), targetSummary: { count: forward.length, passed: forward.length - targetFailures.length, failed: targetFailures.length, exactInverseByPackage: true }, preservation: { baseline: preservationBaseline, B03Aperture: { count: 20, failed: preservationFailures.length }, B09Cap: { count: 12, failed: preservationFailures.length }, B09GuidewayAndControls: { count: 19, failed: guidewayFailures.length } }, routes, nonclaims: ['No public/emergency egress commissioning.', 'No B03/B09 opening, B09 rail/control action, or automatic fluid outfall.'] };
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`); console.log(JSON.stringify({ status: report.status, targetSummary: report.targetSummary, routeSummary: { count: routes.length, passed: routes.filter(({ correct }) => correct).length }, out: rel(OUT) }, null, 2));
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
