#!/usr/bin/env node
/**
 * Projected normal and single-return-failure QA for MP02 B08 chamber package.
 * It is read-only: operation files are projected into reachability.mjs only.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd(); const args = process.argv.slice(2);
const option = (name, fallback = null) => { const index = args.indexOf(name); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const ID = 'MP02-B08-RESTRICTED-CHAMBER-DRY-RECEIVER-01';
const fail = (message) => { throw new Error(`${ID} projected QA rejected: ${message}`); };
const abs = (value) => path.resolve(ROOT, value); const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const parse = (filename) => fs.readFileSync(abs(filename), 'utf8').split(/\r?\n/).filter((line) => line.startsWith('REPL ')).map((line) => { const terms = line.trim().split(/\s+/); if (terms.length !== 9) fail(`malformed operation: ${line}`); const [x1, y1, z1, x2, y2, z2] = terms.slice(1, 7).map(Number); if (x1 !== x2 || y1 !== y2 || z1 !== z2) fail(`non-unit operation: ${line}`); return { cell: { x: x1, y: y1, z: z1 }, source: terms[7], target: terms[8], line }; });
const canonical = (entries) => `${entries.map(({ cell, source, target }) => `REPL ${cell.x} ${cell.y} ${cell.z} ${cell.x} ${cell.y} ${cell.z} ${source} ${target}`).join('\n')}\n`;
const snapshotArg = option('--snapshot'); const manifestArg = option('--manifest'); const outArg = option('--out');
if (!snapshotArg || !manifestArg || !outArg) fail('usage: --snapshot <complete snapshot> --manifest <compiled manifest> --out <report>');
const SNAPSHOT = abs(snapshotArg); const MANIFEST = abs(manifestArg); const OUT = abs(outArg);
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) if (!fs.existsSync(path.join(SNAPSHOT, member))) fail(`incomplete snapshot; missing ${member}`);
const manifestBytes = fs.readFileSync(MANIFEST); const manifest = JSON.parse(manifestBytes);
if (manifest.scope?.releaseId !== ID || manifest.status !== 'COMPILED_STATIC_FINITE_PACKAGE_AWAITING_PROJECTED_FUNCTIONAL_QA_AND_FRESH_GUARDED_KERNEL') fail('manifest identity/status drifted');
if (abs(manifest.source?.snapshotRoot ?? '') !== SNAPSHOT) fail('manifest and snapshot differ');
const groups = [];
for (const pkg of manifest.packages ?? []) {
  const forward = parse(pkg.forward); const rollback = parse(pkg.rollback); const binding = manifest.operations?.[pkg.key];
  if (!binding || sha(canonical(forward)) !== binding.forwardSha256 || sha(canonical(rollback)) !== binding.rollbackSha256) fail(`operation hash drift: ${pkg.key}`);
  const inverse = forward.slice().reverse().map(({ cell, source, target }) => ({ cell, source: target, target: source }));
  if (JSON.stringify(rollback.map(({ cell, source, target }) => ({ cell, source, target }))) !== JSON.stringify(inverse)) fail(`rollback not exact inverse: ${pkg.key}`);
  groups.push({ key: pkg.key, forward, rollback });
}
if (groups.length !== 7) fail('expected seven ordered packages');
const allForward = groups.flatMap(({ forward }) => forward); const unique = new Set(allForward.map(({ cell }) => cellKey(cell)));
if (unique.size !== allForward.length || unique.size !== manifest.target?.operatedUnion?.cellCount) fail('forward target union drifted');
const reader = new AnvilReader(path.join(SNAPSHOT, 'region'));
const sourceFailures = [];
for (const { cell, source } of allForward) { const actual = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)); if (actual !== source) sourceFailures.push({ cell, source, actual }); }
if (sourceFailures.length) fail(`source state drift: ${JSON.stringify(sourceFailures.slice(0, 4))}`);
const noTouch = [
  ...Array.from({ length: 20 }, (_, index) => ({ x: 2049, y: 130 + Math.floor(index / 5), z: -750 + (index % 5), state: 'minecraft:air' })),
  ...Array.from({ length: 12 }, (_, index) => ({ x: 2050, y: 129 + Math.floor(index / 3), z: -749 + (index % 3), state: 'minecraft:polished_diorite' })),
];
const noTouchKeys = new Set(noTouch.map(({ x, y, z }) => `${x},${y},${z}`));
if (allForward.some(({ cell }) => noTouchKeys.has(cellKey(cell)))) fail('B03/B09 preservation target collision');
const noTouchFailures = [];
for (const item of noTouch) { const actual = stateToCommandString(await reader.blockState(item.x, item.y, item.z)); if (actual !== item.state) noTouchFailures.push({ ...item, actual }); }
if (noTouchFailures.length) fail(`B03/B09 preservation state drift: ${JSON.stringify(noTouchFailures.slice(0, 4))}`);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mp02-b08-chamber-qa-'));
try {
  const projection = path.join(tempDir, 'forward.txt'); fs.writeFileSync(projection, `${allForward.map(({ line }) => line).join('\n')}\n`);
  const withFailure = (filename, overrides) => { const target = path.join(tempDir, filename); fs.writeFileSync(target, `${fs.readFileSync(projection, 'utf8')}${overrides.join('\n')}\n`); return target; };
  const normal = projection;
  const northBlocked = withFailure('north-return-failure.txt', [
    'SET 2007 129 -741 2007 129 -741 minecraft:iron_door[facing=north,half=lower,hinge=left,open=false,powered=false]',
    'SET 2007 130 -741 2007 130 -741 minecraft:iron_door[facing=north,half=upper,hinge=left,open=false,powered=false]',
    'SET 2008 129 -741 2008 129 -741 minecraft:iron_door[facing=north,half=lower,hinge=right,open=false,powered=false]',
    'SET 2008 130 -741 2008 130 -741 minecraft:iron_door[facing=north,half=upper,hinge=right,open=false,powered=false]',
    'SET 2009 129 -741 2009 129 -741 minecraft:iron_door[facing=north,half=lower,hinge=left,open=false,powered=false]',
    'SET 2009 130 -741 2009 130 -741 minecraft:iron_door[facing=north,half=upper,hinge=left,open=false,powered=false]',
  ]);
  const shaftBlocked = withFailure('shaft-return-failure.txt', [
    'SET 2008 129 -748 2008 129 -748 minecraft:deepslate_tiles',
    'SET 2008 130 -748 2008 130 -748 minecraft:deepslate_tiles',
  ]);
  const reach = (id, ops, target, expected) => {
    const result = spawnSync(process.execPath, ['scripts/reachability.mjs', '--regions', path.join(SNAPSHOT, 'region'), '--ops', ops, '--from', '2008,129,-745', '--to', target, '--pad', '16', '--budget', '1000000'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    const passed = result.status === 0 && result.stdout.includes('REACHABLE');
    return { id, expected, passed, correct: passed === expected, output: result.stdout.trim().split(/\r?\n/).slice(-4) };
  };
  const routes = [
    reach('normal-north-handoff', normal, '2008,129,-690', true),
    reach('normal-shaft-surface', normal, '2005,208,-748', true),
    reach('north-boundary-failure-north-isolated', northBlocked, '2008,129,-690', false),
    reach('north-boundary-failure-shaft-survives', northBlocked, '2005,208,-748', true),
    reach('shaft-failure-north-survives', shaftBlocked, '2008,129,-690', true),
    reach('shaft-failure-shaft-isolated', shaftBlocked, '2005,208,-748', false),
  ];
  if (routes.some(({ correct }) => !correct)) fail(`normal/failure return QA failed: ${JSON.stringify(routes.filter(({ correct }) => !correct))}`);
  const report = { schemaVersion: 1, id: 'mp02-b08-restricted-chamber-dry-receiver-01-projected-functional-qa', releaseId: ID, status: 'PASS_PROJECTED_NORMAL_AND_SINGLE_RETURN_FAILURE_QA__NOT_POST_RELEASE_EVIDENCE', readOnly: true, worldMutated: false, snapshot: rel(SNAPSHOT), manifest: rel(MANIFEST), manifestSha256: sha(manifestBytes), targetSummary: { forward: allForward.length, unique: unique.size, sourceFailures: sourceFailures.length, exactInverseByPackage: true }, preservation: { B03Aperture: { count: 20, failures: noTouchFailures.length }, B09Cap: { count: 12, failures: noTouchFailures.length }, targetCollision: false }, routes, executionEligibility: false, nonclaims: ['Projected QA is not post-release evidence.', 'No public/emergency egress or B03/B09 connection is commissioned.', 'Fresh live source, entity gates, strict parser/preflight, journal, post capture, rollback proof, and independent post QA remain mandatory.'] };
  fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`); console.log(JSON.stringify({ status: report.status, targetSummary: report.targetSummary, routeSummary: { count: routes.length, passed: routes.filter(({ correct }) => correct).length }, out: rel(OUT) }, null, 2));
} finally { fs.rmSync(tempDir, { recursive: true, force: true }); }
