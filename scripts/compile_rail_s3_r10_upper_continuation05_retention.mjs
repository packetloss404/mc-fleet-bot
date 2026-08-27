#!/usr/bin/env node
/** Offline-only staged retention of R10 continuation-05's bounded 26-water pocket. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { AnvilReader, cellKey, hashCells, replLine, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const value = (flag, fallback = '') => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const snapshot = value('--snapshot');
const basename = value('--basename', 'rail-s3-r10-upper-continuation-05-retention-01');
const outDir = value('--out-dir', 'data/buildops');
const fail = (condition, message) => {
  if (!condition) throw new Error(`R10 continuation-05 retention: ${message}`);
};
fail(snapshot, '--snapshot required');

const ORIGINAL = [
  [23, 39, -462], [24, 39, -462], [23, 40, -462], [23, 39, -461], [25, 39, -462], [24, 39, -461],
  [24, 39, -463], [23, 40, -463], [26, 39, -462], [25, 39, -461], [25, 39, -463], [24, 39, -460],
  [24, 40, -463], [23, 41, -463], [27, 39, -462], [26, 39, -461], [26, 39, -463], [23, 41, -464],
  [28, 39, -462], [27, 39, -461], [27, 39, -463], [29, 39, -462], [28, 39, -461], [27, 39, -460],
  [29, 39, -461], [28, 39, -460],
].map(([x, y, z]) => ({ x, y, z }));
const COMPONENT_HASH = '62e1bf2f430902c6159e552213c708dac0d7318c5d7183427a13cf743ca19f1e';
const SEARCH_BOUNDS = { minX: 19, maxX: 35, minY: 37, maxY: 42, minZ: -470, maxZ: -455 };
const CHAMBER = [];
for (let x = 31; x <= 34; x += 1) for (let y = 39; y <= 41; y += 1) for (let z = -464; z <= -461; z += 1) CHAMBER.push({ x, y, z });
const RETAINED = CHAMBER.slice(0, ORIGINAL.length);
const RESERVE = CHAMBER.slice(ORIGINAL.length);
const SHELL = [];
for (let x = 30; x <= 35; x += 1) for (let y = 38; y <= 42; y += 1) for (let z = -465; z <= -460; z += 1) {
  if (x === 30 || x === 35 || y === 38 || y === 42 || z === -465 || z === -460) SHELL.push({ x, y, z });
}
const FORBIDDEN = new Set(['minecraft:chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:spawner', 'minecraft:command_block', 'minecraft:lectern', 'minecraft:beacon']);
const isFluid = (block) => block.startsWith('minecraft:water') || block.startsWith('minecraft:lava') || block.startsWith('minecraft:bubble_column') || block.includes('waterlogged=true');
const isWater = (block) => block.startsWith('minecraft:water');
const blockName = (block) => block.split('[', 1)[0];
const reader = new AnvilReader(path.resolve(process.cwd(), snapshot, 'region'));
const cache = new Map();
const state = async (point) => {
  const key = cellKey(point);
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(point.x, point.y, point.z)));
  return cache.get(key);
};
const inside = ({ x, y, z }) => x >= SEARCH_BOUNDS.minX && x <= SEARCH_BOUNDS.maxX && y >= SEARCH_BOUNDS.minY && y <= SEARCH_BOUNDS.maxY && z >= SEARCH_BOUNDS.minZ && z <= SEARCH_BOUNDS.maxZ;
const directions = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const observedOriginal = [];
const queue = [ORIGINAL[0]];
const seen = new Set([cellKey(ORIGINAL[0])]);
const boundaryTouches = [];
for (let index = 0; index < queue.length; index += 1) {
  const point = queue[index];
  observedOriginal.push(point);
  for (const [dx, dy, dz] of directions) {
    const next = { x: point.x + dx, y: point.y + dy, z: point.z + dz };
    if (!inside(next)) {
      boundaryTouches.push({ from: point, to: next });
      continue;
    }
    if (isFluid(await state(next)) && !seen.has(cellKey(next))) {
      seen.add(cellKey(next));
      queue.push(next);
    }
  }
}
fail(isWater(await state(ORIGINAL[0])), `seed source drift ${cellKey(ORIGINAL[0])}=${await state(ORIGINAL[0])}`);
fail(observedOriginal.length === ORIGINAL.length, `expected ${ORIGINAL.length} connected water cells, found ${observedOriginal.length}`);
fail(hashCells(observedOriginal) === COMPONENT_HASH, 'connected-water coordinate set drifted');
fail(boundaryTouches.length === 0, `fluid component reaches hard survey boundary at ${boundaryTouches.length} faces`);
for (const point of ORIGINAL) fail(isWater(await state(point)), `declared original water drift ${cellKey(point)}=${await state(point)}`);
for (const point of [...SHELL, ...RETAINED]) {
  const observed = await state(point);
  fail(!isFluid(observed), `chamber shell/retention fluid conflict ${cellKey(point)}=${observed}`);
  fail(!FORBIDDEN.has(blockName(observed)), `chamber shell/retention block-entity risk ${cellKey(point)}=${observed}`);
  fail(observed !== 'minecraft:gravel', `chamber shell/retention gravity target ${cellKey(point)}=${observed}`);
}
const operated = new Set([...SHELL, ...RETAINED, ...ORIGINAL].map(cellKey));
const halo = new Map();
for (const point of [...SHELL, ...RETAINED, ...ORIGINAL]) for (const [dx, dy, dz] of directions) {
  const neighbour = { x: point.x + dx, y: point.y + dy, z: point.z + dz };
  if (!operated.has(cellKey(neighbour))) halo.set(cellKey(neighbour), neighbour);
}
const haloRecords = [];
for (const point of halo.values()) haloRecords.push({ point, source: await state(point) });
const gravelHalo = haloRecords.filter(({ source }) => source === 'minecraft:gravel');
fail(gravelHalo.length === 0, `unsupported adjacent gravel requires a separate gravity package (${gravelHalo.length})`);

const makeRecords = async (points, toFor) => Promise.all(points.map(async (point, index) => ({ point, from: await state(point), to: await toFor(point, index) })));
const stages = [
  { id: 'shell', records: await makeRecords(SHELL, async () => 'minecraft:polished_deepslate') },
  { id: 'transfer', records: await makeRecords(RETAINED, async (_point, index) => state(ORIGINAL[index])) },
  { id: 'original-pocket-liner', records: await makeRecords(ORIGINAL, async () => 'minecraft:polished_deepslate') },
];
fs.mkdirSync(path.resolve(process.cwd(), outDir), { recursive: true });
const emitted = stages.map(({ id, records }) => {
  const forward = `${records.map((record) => replLine(record.point, record.from, record.to)).join('\n')}\n`;
  const rollback = `${records.slice().reverse().map((record) => replLine(record.point, record.to, record.from)).join('\n')}\n`;
  const forwardPath = `${outDir}/${basename}.${id}.forward.txt`;
  const rollbackPath = `${outDir}/${basename}.${id}.rollback.txt`;
  fs.writeFileSync(forwardPath, forward);
  fs.writeFileSync(rollbackPath, rollback);
  return { id, forward: forwardPath, rollback: rollbackPath, count: records.length, sha256: crypto.createHash('sha256').update(forward).digest('hex'), rollbackSha256: crypto.createHash('sha256').update(rollback).digest('hex'), exactInverse: true };
});
const manifest = {
  schemaVersion: 1,
  transactionId: basename,
  status: 'COMPILED_OFFLINE_R10_CONTINUATION05_26_CELL_RETAINED_WATER_AWAITING_STATIC_GATES',
  snapshot,
  sourceComponent: { count: ORIGINAL.length, coordinateSetSha256: COMPONENT_HASH, cells: ORIGINAL, searchBounds: SEARCH_BOUNDS, boundaryTouches: 0 },
  externalRetention: { chamberBounds: { x: [31, 34], y: [39, 41], z: [-464, -461] }, retained: { count: RETAINED.length, coordinateSetSha256: hashCells(RETAINED), cells: RETAINED }, reserve: { count: RESERVE.length, coordinateSetSha256: hashCells(RESERVE), cells: RESERVE } },
  originalPocketLiner: { count: ORIGINAL.length, coordinateSetSha256: COMPONENT_HASH, owner: 'RAIL-S3-R10-CONTINUATION-05-FLUID-CONTAINMENT' },
  shell: { count: SHELL.length, coordinateSetSha256: hashCells(SHELL), bounds: { x: [30, 35], y: [38, 42], z: [-465, -460] } },
  gravityTopology: { supportStageRequired: false, targetGravelCount: 0, preservedHalo: { count: haloRecords.length, coordinateSetSha256: hashCells(haloRecords.map(({ point }) => point)), gravelCount: gravelHalo.length, records: haloRecords } },
  ownership: { continuation05RouteEnvelope: { x: [5, 25], y: [28, 39], z: [-463, -453] }, chamberDisjointFromRouteEnvelope: true, originalLinerIntersectsRouteEnvelope: true },
  stages: emitted,
  exactInverse: true,
  routeCommissioned: false,
  passengerServiceCommissioned: false,
  readOnlyCompilation: true,
};
fs.writeFileSync(`${outDir}/${basename}.manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
