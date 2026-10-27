#!/usr/bin/env node
/** Independent source/post topology QA for R10 continuation-05 retention-01. */
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const value = (flag, fallback = '') => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const sourceSnapshot = value('--source');
const postSnapshot = value('--post');
const manifestPath = value('--manifest', 'data/buildops/rail-s3-r10-upper-continuation-05-retention-01.manifest.json');
const out = value('--out');
if (!sourceSnapshot || !postSnapshot || !out) throw new Error('usage: --source <snapshot> --post <snapshot> --out <json> [--manifest <json>]');
const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.resolve(root, manifestPath), 'utf8'));
const sourceReader = new AnvilReader(path.resolve(root, sourceSnapshot, 'region'));
const postReader = new AnvilReader(path.resolve(root, postSnapshot, 'region'));
const sourceCache = new Map();
const postCache = new Map();
const sourceState = async (point) => {
  const key = cellKey(point);
  if (!sourceCache.has(key)) sourceCache.set(key, stateToCommandString(await sourceReader.blockState(point.x, point.y, point.z)));
  return sourceCache.get(key);
};
const postState = async (point) => {
  const key = cellKey(point);
  if (!postCache.has(key)) postCache.set(key, stateToCommandString(await postReader.blockState(point.x, point.y, point.z)));
  return postCache.get(key);
};
const isFluid = (state) => state.startsWith('minecraft:water') || state.startsWith('minecraft:lava') || state.startsWith('minecraft:bubble_column') || state.includes('waterlogged=true');
const parseOps = (filename) => fs.readFileSync(path.resolve(root, filename), 'utf8').trim().split(/\r?\n/).filter(Boolean).map((line, index) => {
  const fields = line.trim().split(/\s+/);
  if (fields.length !== 9 || fields[0] !== 'REPL') throw new Error(`${filename}:${index + 1}: malformed guarded operation`);
  const [x1, y1, z1, x2, y2, z2] = fields.slice(1, 7).map(Number);
  if (x1 !== x2 || y1 !== y2 || z1 !== z2) throw new Error(`${filename}:${index + 1}: expected exact one-cell operation`);
  return { point: { x: x1, y: y1, z: z1 }, from: fields[7], to: fields[8], stage: path.basename(filename) };
});
const operations = manifest.stages.flatMap(({ forward }) => parseOps(forward));
const expected = new Map();
for (const operation of operations) {
  const key = cellKey(operation.point);
  if (expected.has(key)) throw new Error(`overlapping forward stage target ${key}`);
  expected.set(key, operation);
}
const targetResults = [];
for (const operation of expected.values()) targetResults.push({ point: operation.point, expected: operation.to, observed: await postState(operation.point), source: await sourceState(operation.point), stage: operation.stage });
const targetFailures = targetResults.filter(({ expected: expectedState, observed }) => expectedState !== observed);
const retained = manifest.externalRetention.retained.cells;
const original = manifest.sourceComponent.cells;
const shellPoints = parseOps(manifest.stages.find(({ id }) => id === 'shell').forward).map(({ point }) => point);
const shell = new Set(shellPoints.map(cellKey));
const retainedResults = await Promise.all(retained.map(async (point) => ({ point, source: await sourceState(point), post: await postState(point) })));
const originalResults = await Promise.all(original.map(async (point) => ({ point, source: await sourceState(point), post: await postState(point) })));
const retainedFluidFailures = retainedResults.filter(({ post }) => !isFluid(post));
const originalFluidFailures = originalResults.filter(({ source, post }) => !isFluid(source) || post !== 'minecraft:polished_deepslate');
const haloResults = await Promise.all(manifest.gravityTopology.preservedHalo.records.map(async ({ point, source }) => ({ point, expected: source, observed: await postState(point) })));
const haloFailures = haloResults.filter(({ expected: expectedState, observed }) => expectedState !== observed);
const broad = [];
for (let x = 22; x <= 36; x += 1) for (let y = 37; y <= 43; y += 1) for (let z = -466; z <= -459; z += 1) broad.push({ x, y, z });
const broadFailures = [];
for (const point of broad) {
  if (expected.has(cellKey(point))) continue;
  const source = await sourceState(point);
  const post = await postState(point);
  if (source !== post) broadFailures.push({ point, source, post });
}
const unexpectedPostFluid = [];
for (const point of [...original, ...shellPoints]) {
  const observed = await postState(point);
  if (isFluid(observed)) unexpectedPostFluid.push({ point, observed });
}
const report = {
  schemaVersion: 1,
  id: 'rail-s3-r10-upper-continuation05-retention-post-qa',
  sourceSnapshot,
  postSnapshot,
  manifestPath,
  status: targetFailures.length === 0 && retainedFluidFailures.length === 0 && originalFluidFailures.length === 0 && haloFailures.length === 0 && broadFailures.length === 0 && unexpectedPostFluid.length === 0 ? 'PASS' : 'FAIL',
  exactTargets: { count: targetResults.length, pass: targetResults.length - targetFailures.length, failures: targetFailures },
  retainedWater: { count: retainedResults.length, coordinateSetSha256: hashCells(retained), failures: retainedFluidFailures },
  originalPocketLiner: { count: originalResults.length, coordinateSetSha256: hashCells(original), failures: originalFluidFailures },
  preservedHalo: { count: haloResults.length, failures: haloFailures },
  broadInvariant: { bounds: { x: [22, 36], y: [37, 43], z: [-466, -459] }, nonTargetDriftCount: broadFailures.length, failures: broadFailures },
  unexpectedPostFluid,
  routeCommissioned: false,
  passengerServiceCommissioned: false,
  readOnly: true,
};
fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true });
fs.writeFileSync(path.resolve(root, out), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: report.status, targets: report.exactTargets, retainedWaterFailures: retainedFluidFailures.length, originalLinerFailures: originalFluidFailures.length, haloFailures: haloFailures.length, broadDrift: broadFailures.length, unexpectedPostFluid: unexpectedPostFluid.length }, null, 2)}\n`);
if (report.status !== 'PASS') process.exitCode = 2;
