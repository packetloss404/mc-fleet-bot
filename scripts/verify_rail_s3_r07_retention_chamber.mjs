#!/usr/bin/env node
/** Independently verify the R07 retained-water civil containment post-state. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const value = (flag, fallback = '') => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const sourceRoot = value('--source');
const postRoot = value('--post');
const basename = value('--basename', 'rail-s3-r07-retention-03');
const out = value('--out');
if (!sourceRoot || !postRoot || !out) {
  throw new Error('usage: --source <snapshot-root> --post <snapshot-root> --basename <buildops-basename> --out <json>');
}

const root = process.cwd();
const source = new AnvilReader(path.resolve(root, sourceRoot, 'region'));
const post = new AnvilReader(path.resolve(root, postRoot, 'region'));
const state = async (reader, point) => stateToCommandString(
  await reader.blockState(point.x, point.y, point.z),
);
const water = (block) => block.startsWith('minecraft:water');
const key = (point) => cellKey(point);
const pointsFromOperation = (operationPath) => fs.readFileSync(
  path.resolve(root, operationPath),
  'utf8',
).split(/\r?\n/).flatMap((raw) => {
  const fields = raw.trim().split(/\s+/);
  if (fields[0] !== 'REPL' || fields.length !== 9) return [];
  const [x1, y1, z1, x2, y2, z2] = fields.slice(1, 7).map(Number);
  const points = [];
  for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) {
      for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z += 1) {
        points.push({ x, y, z });
      }
    }
  }
  return points;
});

const original = [];
for (let x = -136; x <= -126; x += 1) for (let y = 2; y <= 14; y += 1) for (let z = -472; z <= -454; z += 1) {
  const point = { x, y, z };
  if (water(await state(source, point))) original.push(point);
}
const chamber = [];
for (let x = -136; x <= -126; x += 1) for (let y = 2; y <= 14; y += 1) for (let z = -478; z <= -476; z += 1) chamber.push({ x, y, z });
const retained = chamber.slice(0, original.length);
const pointsFromOps = (stage) => pointsFromOperation(`data/buildops/${basename}.${stage}.forward.txt`);
const allowedOps = args.flatMap((entry, index) => entry === '--allowed-ops' && args[index + 1] ? [args[index + 1]] : []);
const allTargets = new Set([
  ...pointsFromOps('gravity-support'),
  ...pointsFromOps('shell'),
  ...pointsFromOps('transfer'),
  ...pointsFromOps('original-pocket-liner'),
  ...allowedOps.flatMap(pointsFromOperation),
].map(key));
const observations = {
  originalLiner: await Promise.all(original.map(async (point) => ({ point, state: await state(post, point) }))),
  retainedWater: await Promise.all(retained.map(async (point) => ({ point, state: await state(post, point) }))),
  supports: await Promise.all(pointsFromOps('gravity-support').map(async (point) => ({ point, state: await state(post, point) }))),
  shell: await Promise.all(pointsFromOps('shell').map(async (point) => ({ point, state: await state(post, point) }))),
};
const uncontrolled = [];
const postWater = [];
for (let x = -137; x <= -125; x += 1) for (let y = 1; y <= 15; y += 1) for (let z = -479; z <= -454; z += 1) {
  const point = { x, y, z };
  const [before, after] = await Promise.all([state(source, point), state(post, point)]);
  if (!allTargets.has(key(point)) && before !== after) uncontrolled.push({ point, before, after });
  if (water(after)) postWater.push(point);
}
const gallery = [];
for (let x = -135; x <= -116; x += 1) for (let y = 18; y <= 23; y += 1) for (let z = -462; z <= -457; z += 1) gallery.push({ x, y, z });
const galleryStates = await Promise.all(gallery.map(async (point) => ({ point, state: await state(post, point) })));
const seam = [];
for (let z = -462; z <= -457; z += 1) seam.push({ x: -136, y: 17, z });
const seamStates = await Promise.all(seam.map(async (point) => ({ point, state: await state(post, point) })));
const expectedRetained = new Set(retained.map(key));
const actualRetained = new Set(postWater.map(key));
const extraWater = postWater.filter((point) => !expectedRetained.has(key(point)));
const missingWater = retained.filter((point) => !actualRetained.has(key(point)));
const result = {
  schemaVersion: 1,
  id: 'rail-s3-r07-retention-chamber-post-qa',
  generatedAtUtc: new Date().toISOString(),
  sourceRoot,
  postRoot,
  basename,
  allowedOps,
  targetCounts: {
    gravitySupport: observations.supports.length,
    shell: observations.shell.length,
    originalLiner: observations.originalLiner.length,
    retainedWater: observations.retainedWater.length,
  },
  hashes: {
    originalWater: hashCells(original),
    retainedWater: hashCells(retained),
    observedPostWater: hashCells(postWater),
  },
  checks: {
    originalLiner: {
      expected: original.length,
      actual: observations.originalLiner.filter(({ state: block }) => block === 'minecraft:polished_deepslate').length,
    },
    retainedWater: { expected: retained.length, actual: observations.retainedWater.filter(({ state: block }) => water(block)).length, missingWater, extraWater },
    gravitySupport: { expected: observations.supports.length, actual: observations.supports.filter(({ state: block }) => block === 'minecraft:polished_deepslate').length },
    shell: { expected: observations.shell.length, actual: observations.shell.filter(({ state: block }) => block === 'minecraft:polished_deepslate').length },
    untouchedHalo: { expected: 0, actual: uncontrolled.length, samples: uncontrolled.slice(0, 20) },
    serviceGallery: { expected: gallery.length, actual: galleryStates.filter(({ state: block }) => block === 'minecraft:air').length },
    r06FloorSeam: { expected: seam.length, actual: seamStates.filter(({ state: block }) => block === 'minecraft:polished_deepslate').length },
  },
  routeCommissioned: false,
  passengerServiceCommissioned: false,
};
result.status = Object.values(result.checks).every((check) => check.expected === check.actual)
  && missingWater.length === 0 && extraWater.length === 0
  ? 'PASS' : 'FAIL';
fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true });
fs.writeFileSync(path.resolve(root, out), `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: result.status, checks: result.checks }, null, 2)}\n`);
if (result.status !== 'PASS') process.exitCode = 1;
