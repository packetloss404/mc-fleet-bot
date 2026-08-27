#!/usr/bin/env node
/** Independently census the isolated R10 five-water roof-retention post-state. */
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const value = (flag, fallback = '') => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const sourceRoot = value('--source');
const postRoot = value('--post');
const out = value('--out');
if (!sourceRoot || !postRoot || !out) throw new Error('usage: --source <root> --post <root> --out <json>');

const root = process.cwd();
const source = new AnvilReader(path.resolve(root, sourceRoot, 'region'));
const post = new AnvilReader(path.resolve(root, postRoot, 'region'));
const state = async (reader, point) => stateToCommandString(await reader.blockState(point.x, point.y, point.z));
const key = (point) => cellKey(point);
const points = (min, max) => {
  const result = [];
  for (let x = min.x; x <= max.x; x += 1) for (let y = min.y; y <= max.y; y += 1) for (let z = min.z; z <= max.z; z += 1) result.push({ x, y, z });
  return result;
};
const original = [
  { x: -65, y: 39, z: -464 }, { x: -64, y: 39, z: -464 }, { x: -64, y: 39, z: -463 },
  { x: -63, y: 39, z: -464 }, { x: -63, y: 39, z: -463 },
];
const chamber = points({ x: -67, y: 39, z: -471 }, { x: -65, y: 40, z: -469 });
const retained = chamber.slice(0, 5);
const reserve = chamber.slice(5);
const shell = points({ x: -68, y: 38, z: -472 }, { x: -64, y: 41, z: -468 })
  .filter(({ x, y, z }) => x === -68 || x === -64 || y === 38 || y === 41 || z === -472 || z === -468);
const targets = new Set([...original, ...retained, ...shell].map(key));
const read = async (reader, cells) => Promise.all(cells.map(async (point) => ({ point, state: await state(reader, point) })));
const [sourceOriginal, postOriginal, sourceReserve, postReserve, postRetained, postShell] = await Promise.all([
  read(source, original), read(post, original), read(source, reserve), read(post, reserve), read(post, retained), read(post, shell),
]);
const haloDrift = [];
const waterOutsideRetention = [];
const preexistingOutsideRetention = [];
for (const point of points({ x: -69, y: 37, z: -473 }, { x: -62, y: 42, z: -462 })) {
  const [before, after] = await Promise.all([state(source, point), state(post, point)]);
  if (!targets.has(key(point)) && before !== after) haloDrift.push({ point, before, after });
  if (before.startsWith('minecraft:water') && !targets.has(key(point))) preexistingOutsideRetention.push({ point, before, after });
  if (after.startsWith('minecraft:water')
    && !retained.some((candidate) => key(candidate) === key(point))
    && !preexistingOutsideRetention.some(({ point: candidate }) => key(candidate) === key(point))) waterOutsideRetention.push({ point, state: after });
}
const exact = (records, expected) => records.filter(({ state: actual }) => actual === expected).length;
const report = {
  schemaVersion: 1,
  id: 'rail-s3-r10-roof-pocket-retention-post-qa',
  generatedAtUtc: new Date().toISOString(),
  sourceRoot,
  postRoot,
  coordinateSets: { originalWater: { count: original.length, sha256: hashCells(original) }, retainedWater: { count: retained.length, sha256: hashCells(retained) }, reserve: { count: reserve.length, sha256: hashCells(reserve) }, shell: { count: shell.length, sha256: hashCells(shell) } },
  checks: {
    sourceOriginalWater: { expected: original.length, actual: exact(sourceOriginal, 'minecraft:water[level=0]') },
    originalPocketLiner: { expected: original.length, actual: exact(postOriginal, 'minecraft:polished_deepslate') },
    retainedSourceWater: { expected: retained.length, actual: exact(postRetained, 'minecraft:water[level=0]') },
    shell: { expected: shell.length, actual: exact(postShell, 'minecraft:polished_deepslate') },
    unusedChamberReservePreserved: { expected: reserve.length, actual: postReserve.filter(({ point, state: actual }) => sourceReserve.find((record) => key(record.point) === key(point))?.state === actual).length },
    nonTargetHaloDrift: { expected: 0, actual: haloDrift.length, samples: haloDrift.slice(0, 20) },
    preservedPreexistingWaterOutsideDeclaredRetention: { expected: preexistingOutsideRetention.length, actual: preexistingOutsideRetention.filter(({ before, after }) => before === after).length, cells: preexistingOutsideRetention },
    introducedWaterOutsideDeclaredRetention: { expected: 0, actual: waterOutsideRetention.length, samples: waterOutsideRetention.slice(0, 20) },
  },
  civilOnly: true,
  routeCommissioned: false,
  passengerServiceCommissioned: false,
};
report.status = Object.values(report.checks).every(({ expected, actual }) => expected === actual) ? 'PASS' : 'FAIL';
fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true });
fs.writeFileSync(path.resolve(root, out), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: report.status, checks: report.checks }, null, 2)}\n`);
if (report.status !== 'PASS') process.exitCode = 1;
