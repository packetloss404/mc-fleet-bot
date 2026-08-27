#!/usr/bin/env node
/** Independent immutable-post QA for MP10-RRCH-LIBRARY-EXTERIOR-STAIR-ANNEX-01. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const RELEASE_ID = 'MP10-RRCH-LIBRARY-EXTERIOR-STAIR-ANNEX-01';
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
const stateName = (state) => state.split('[', 1)[0];
const isAir = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(stateName(state));
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(stateName(state)) || state.includes('waterlogged=true');
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
const forwardBody = fs.readFileSync(abs(forwardFile), 'utf8');
const rollbackBody = fs.readFileSync(abs(rollbackFile), 'utf8');
const forward = parse(forwardFile);
const rollback = parse(rollbackFile);
fail(forward.length === manifest.operations.forward.commandCount && rollback.length === manifest.operations.rollback.commandCount, 'operation command count drifted');
const forwardCanonical = `${forward.map(({ cell, source, target }) => `REPL ${cell.x} ${cell.y} ${cell.z} ${cell.x} ${cell.y} ${cell.z} ${source} ${target}`).join('\n')}\n`;
const rollbackCanonical = `${rollback.map(({ cell, source, target }) => `REPL ${cell.x} ${cell.y} ${cell.z} ${cell.x} ${cell.y} ${cell.z} ${source} ${target}`).join('\n')}\n`;
fail(hash(forwardCanonical) === manifest.operations.forward.sha256 && hash(rollbackCanonical) === manifest.operations.rollback.sha256,
  'canonical operation hashes drifted from manifest');
const expectedRollback = forward.slice().reverse().map(({ cell, source, target }) => ({ cell, source: target, target: source }));
fail(JSON.stringify(rollback) === JSON.stringify(expectedRollback), 'rollback is not exact reverse inverse');
const targets = new Map(forward.map((entry) => [cellKey(entry.cell), entry]));
fail(targets.size === forward.length && targets.size === manifest.target.cells.cellCount, 'target identity/count drifted');
const reader = new AnvilReader(abs(regions));
const states = [];
for (const { cell, target } of forward) states.push({ cell, expected: target, actual: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
const targetFailures = states.filter(({ expected, actual }) => expected !== actual);
fail(targetFailures.length === 0, `post target state drift at ${JSON.stringify(targetFailures.slice(0, 5))}`);

const flights = manifest.design?.flights;
fail(Array.isArray(flights) && flights.length === 5, 'manifest flight design missing');
const landingChecks = [];
for (const flight of flights) {
  const endZ = flight.startZ + flight.direction * flight.rise;
  for (const z of [flight.startZ, endZ]) for (let x = flight.lane[0]; x <= flight.lane[1]; x += 1) {
    const y = z === flight.startZ ? flight.floorY : flight.floorY + flight.rise;
    const [floor, feet, head] = await Promise.all([reader.blockState(x, y, z), reader.blockState(x, y + 1, z), reader.blockState(x, y + 2, z)]);
    landingChecks.push({ cell: { x, y, z }, floor: stateToCommandString(floor), feet: stateToCommandString(feet), head: stateToCommandString(head) });
  }
}
fail(landingChecks.every(({ floor, feet, head }) => !isAir(floor) && !isFluid(floor) && isAir(feet) && isAir(head)), 'retained landing is no longer dry solid/two-clear');
const pairs = [
  ...flights.map((flight) => ({ id: flight.id, from: [flight.lane[0], flight.floorY + 1, flight.startZ], to: [flight.lane[0], flight.floorY + flight.rise + 1, flight.startZ + flight.direction * flight.rise], pad: 8 })),
  { id: 'full-B1-to-B6-annex-chain', from: [flights[0].lane[0], flights[0].floorY + 1, flights[0].startZ], to: [flights.at(-1).lane[0], flights.at(-1).floorY + flights.at(-1).rise + 1, flights.at(-1).startZ + flights.at(-1).direction * flights.at(-1).rise], pad: 12 },
];
const routes = [];
for (const pair of pairs) for (const direction of ['forward', 'reverse']) {
  const from = direction === 'forward' ? pair.from : pair.to;
  const to = direction === 'forward' ? pair.to : pair.from;
  const result = spawnSync(process.execPath, ['scripts/reachability.mjs', '--regions', regions, '--from', from.join(','), '--to', to.join(','), '--pad', String(pair.pad), '--budget', '800000'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  routes.push({ id: pair.id, direction, from, to, passed: result.status === 0 && result.stdout.includes('REACHABLE'), output: result.stdout.trim().split(/\r?\n/).slice(-3) });
}
const routeFailures = routes.filter(({ passed }) => !passed);
fail(routeFailures.length === 0, `annex normal-walk route failed: ${JSON.stringify(routeFailures)}`);
const report = {
  schemaVersion: 1,
  id: 'mp10-rrch-library-exterior-stair-annex-01-post-release-qa',
  releaseId: RELEASE_ID,
  status: 'PASS',
  mode: 'READ_ONLY_IMMUTABLE_POST_SNAPSHOT',
  regions: rel(regions),
  manifest: rel(manifestPath),
  operationBindings: { forwardSha256: manifest.operations.forward.sha256, rollbackSha256: manifest.operations.rollback.sha256, exactInverse: true },
  targetSummary: { count: states.length, passed: states.length - targetFailures.length, failed: targetFailures.length },
  retainedLandingSummary: { count: landingChecks.length, passed: landingChecks.length, failed: 0 },
  routeSummary: { pairs: pairs.length, directions: routes.length, passed: routes.length - routeFailures.length, failed: routeFailures.length },
  routes,
};
fs.mkdirSync(path.dirname(abs(out)), { recursive: true });
fs.writeFileSync(abs(out), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, targetSummary: report.targetSummary, retainedLandingSummary: report.retainedLandingSummary, routeSummary: report.routeSummary }, null, 2));
