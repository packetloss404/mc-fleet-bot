#!/usr/bin/env node
/** Independent immutable-post route and target QA for MP02 B08 service spine. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
};
const post = value('--post');
const forward = value('--forward');
const out = value('--out');
if (!post || !forward || !out) throw new Error('usage: --post <complete-save> --forward <ops> --out <report>');
const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const nameOf = (state) => state.split('[', 1)[0];
const isAir = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(nameOf(state));
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(nameOf(state)) || state.includes('waterlogged=true');

for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  if (!fs.existsSync(path.join(absolute(post), member))) throw new Error(`post source lacks ${member}`);
}
const desired = new Map();
for (const raw of fs.readFileSync(absolute(forward), 'utf8').split(/\r?\n/)) {
  if (!raw || raw.startsWith('#')) continue;
  const fields = raw.split(/\s+/);
  if (fields[0] !== 'REPL' || fields.length !== 9) throw new Error(`unexpected operation: ${raw}`);
  const point = { x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]) };
  desired.set(cellKey(point), { point, state: fields[8] });
}
if (desired.size !== 729) throw new Error(`expected 729 target cells, got ${desired.size}`);

const geometry = JSON.parse(fs.readFileSync(absolute('docs/masterplans/05-combined-zones/phase1-connector-geometry.json'), 'utf8'));
const route = [
  { x: 1947, y: 72, z: -628 },
  ...geometry.serviceTunnelCenterline.centerline.points
    .filter((point) => point.index >= 0 && point.index <= 121)
    .map(({ x, y, z }) => ({ x, y, z })),
];
if (route.length !== 123) throw new Error(`route station count drifted: ${route.length}`);

const reader = new AnvilReader(path.join(absolute(post), 'region'));
const stateAt = async (point) => stateToCommandString(await reader.blockState(point.x, point.y, point.z));
const targetFailures = [];
for (const { point, state } of desired.values()) {
  const actual = await stateAt(point);
  if (actual !== state) targetFailures.push({ point, expected: state, actual });
}
const routeFailures = [];
for (let index = 0; index < route.length; index += 1) {
  const point = route[index];
  const [floor, feet, head] = await Promise.all([
    stateAt({ x: point.x, y: point.y - 1, z: point.z }), stateAt(point), stateAt({ x: point.x, y: point.y + 1, z: point.z }),
  ]);
  if (isAir(floor) || isFluid(floor) || !isAir(feet) || !isAir(head)) {
    routeFailures.push({ index, point, floor, feet, head });
  }
  if (index > 0) {
    const prior = route[index - 1];
    const horizontal = Math.abs(point.x - prior.x) + Math.abs(point.z - prior.z);
    if (horizontal !== 1 || Math.abs(point.y - prior.y) > 1) routeFailures.push({ index, transition: [prior, point] });
  }
}
const checks = {
  targets: targetFailures.length === 0,
  route: routeFailures.length === 0,
  normalWalkGeometry: route.length === 123,
};
const failures = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
const report = {
  schemaVersion: 1,
  id: 'mp02-subtropolis-b08-service-spine-01-independent-post-qa',
  status: failures.length ? 'FAIL' : 'PASS',
  post,
  postCaptureManifestSha256: sha256(fs.readFileSync(path.join(absolute(post), 'combined-zones-complete-save-capture.json'))),
  targets: { expected: 729, actual: desired.size, failures: targetFailures },
  route: { stationCount: route.length, standard: 'normal walking only; no jump/sprint/dig/swim/climb', failures: routeFailures },
  checks,
  failures,
  civilBoundary: { publicOpening: false, tenantArea: false, vehicleRoute: false, b03OrB09Connection: false },
  readOnly: true,
};
fs.mkdirSync(path.dirname(absolute(out)), { recursive: true });
fs.writeFileSync(absolute(out), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: report.status, targetFailures: targetFailures.length, routeFailures: routeFailures.length }, null, 2)}\n`);
process.exitCode = failures.length ? 1 : 0;
