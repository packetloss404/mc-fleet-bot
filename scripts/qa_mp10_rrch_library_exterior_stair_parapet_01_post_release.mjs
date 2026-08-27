#!/usr/bin/env node
/** Independent immutable-post QA for MP10-RRCH-LIBRARY-EXTERIOR-STAIR-PARAPET-01. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const RELEASE_ID = 'MP10-RRCH-LIBRARY-EXTERIOR-STAIR-PARAPET-01';
const argv = process.argv.slice(2);
const value = (flag) => { const index = argv.indexOf(flag); return index >= 0 ? argv[index + 1] : null; };
const regions = value('--regions');
const manifestPath = value('--manifest');
const out = value('--out');
if (!regions || !manifestPath || !out) throw new Error('usage: --regions <immutable-post-region-dir> --manifest <fresh-rebound-manifest.json> --out <qa.json>');
const abs = (item) => path.resolve(ROOT, item);
const rel = (item) => path.relative(ROOT, abs(item)).split(path.sep).join('/');
const hash = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`${RELEASE_ID} post-QA rejected: ${message}`); };
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const isAir = (state) => AIR.has(state.split('[', 1)[0]);
const parse = (filename) => fs.readFileSync(abs(filename), 'utf8').split(/\r?\n/).filter((line) => line.startsWith('REPL ')).map((line) => {
  const fields = line.trim().split(/\s+/);
  fail(fields.length === 9, `malformed operation: ${line}`);
  const [x1, y1, z1, x2, y2, z2] = fields.slice(1, 7).map(Number);
  fail(x1 === x2 && y1 === y2 && z1 === z2, `non-single-cell operation: ${line}`);
  return { cell: { x: x1, y: y1, z: z1 }, source: fields[7], target: fields[8] };
});
const manifest = JSON.parse(fs.readFileSync(abs(manifestPath), 'utf8'));
fail(manifest.releaseId === RELEASE_ID, 'manifest release identity drifted');
const forwardFile = manifest.operations?.forward?.path;
const rollbackFile = manifest.operations?.rollback?.path;
fail(forwardFile && rollbackFile, 'manifest operation bindings absent');
const forward = parse(forwardFile);
const rollback = parse(rollbackFile);
const canonical = (operations) => `${operations.map(({ cell, source, target }) => `REPL ${cell.x} ${cell.y} ${cell.z} ${cell.x} ${cell.y} ${cell.z} ${source} ${target}`).join('\n')}\n`;
fail(hash(canonical(forward)) === manifest.operations.forward.sha256 && hash(canonical(rollback)) === manifest.operations.rollback.sha256, 'canonical operation hashes drifted from manifest');
const expectedRollback = forward.slice().reverse().map(({ cell, source, target }) => ({ cell, source: target, target: source }));
fail(JSON.stringify(rollback) === JSON.stringify(expectedRollback), 'rollback is not exact reverse inverse');
const targets = new Map(forward.map((entry) => [cellKey(entry.cell), entry]));
fail(targets.size === forward.length && targets.size === manifest.target.cells.cellCount, 'target identity/count drifted');
const reader = new AnvilReader(abs(regions));
const targetStates = [];
for (const { cell, target } of forward) targetStates.push({ cell, expected: target, actual: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
const targetFailures = targetStates.filter(({ expected, actual }) => expected !== actual);
fail(targetFailures.length === 0, `post target state drift at ${JSON.stringify(targetFailures.slice(0, 5))}`);
const supports = [];
for (const { cell } of forward) {
  const below = { ...cell, y: cell.y - 1 };
  if (!targets.has(cellKey(below))) supports.push({ cell: below, state: stateToCommandString(await reader.blockState(below.x, below.y, below.z)) });
}
const supportFailures = supports.filter(({ state }) => isAir(state) || state.includes('water') || state.includes('lava'));
fail(supportFailures.length === 0, `parapet direct support drift at ${JSON.stringify(supportFailures.slice(0, 5))}`);
const flights = manifest.design?.flights;
fail(Array.isArray(flights) && flights.length === 5 && manifest.design.exposedWestX === -157, 'manifest flight/parapet design missing');
const routes = [];
for (const flight of flights) {
  const lane = flight.direction > 0 ? -156 : -151;
  const from = [lane, flight.floorY + 1, flight.startZ];
  const to = [lane, flight.floorY + flight.rise + 1, flight.startZ + flight.direction * flight.rise];
  for (const direction of ['forward', 'reverse']) {
    const result = spawnSync(process.execPath, ['scripts/reachability.mjs', '--regions', regions, '--from', (direction === 'forward' ? from : to).join(','), '--to', (direction === 'forward' ? to : from).join(','), '--pad', '8', '--budget', '800000'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    routes.push({ id: flight.id, direction, passed: result.status === 0 && result.stdout.includes('REACHABLE'), output: result.stdout.trim().split(/\r?\n/).slice(-3) });
  }
}
const routeFailures = routes.filter(({ passed }) => !passed);
fail(routeFailures.length === 0, `parapet normal-walk route failed: ${JSON.stringify(routeFailures)}`);
const report = { schemaVersion: 1, id: 'mp10-rrch-library-exterior-stair-parapet-01-post-release-qa', releaseId: RELEASE_ID, status: 'PASS', mode: 'READ_ONLY_IMMUTABLE_POST_SNAPSHOT', regions: rel(regions), manifest: rel(manifestPath), operationBindings: { forwardSha256: manifest.operations.forward.sha256, rollbackSha256: manifest.operations.rollback.sha256, exactInverse: true }, targetSummary: { count: targetStates.length, passed: targetStates.length - targetFailures.length, failed: targetFailures.length }, directSupportSummary: { count: supports.length, passed: supports.length - supportFailures.length, failed: supportFailures.length }, routeSummary: { pairs: flights.length, directions: routes.length, passed: routes.length - routeFailures.length, failed: routeFailures.length }, routes };
fs.mkdirSync(path.dirname(abs(out)), { recursive: true });
fs.writeFileSync(abs(out), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, targetSummary: report.targetSummary, directSupportSummary: report.directSupportSummary, routeSummary: report.routeSummary }, null, 2));
