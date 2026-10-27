#!/usr/bin/env node
/** Read-only current-source condition and ownership survey for High Successor-15. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const option = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : '';
};
const snapshot = option('--snapshot');
const predecessorPath = option('--predecessor-manifest');
const out = option('--out');
if (!snapshot || !predecessorPath || !out) throw new Error('usage: --snapshot <complete post> --predecessor-manifest <manifest> --out <json>');
const ROOT = process.cwd();
const absolute = (filename) => path.resolve(ROOT, filename);
const point = (x, y, z) => ({ x, y, z });
const box = (min, max) => {
  const cells = [];
  for (let x = min.x; x <= max.x; x += 1) for (let y = min.y; y <= max.y; y += 1) {
    for (let z = min.z; z <= max.z; z += 1) cells.push(point(x, y, z));
  }
  return cells;
};
const name = (state) => state.split('[', 1)[0];
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(name(state)) || state.includes('waterlogged=true');
const parseOps = (filename) => fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/).filter(Boolean).map((line) => {
  const p = line.trim().split(/\s+/);
  if (p.length !== 9 || p[0] !== 'REPL') throw new Error(`invalid operation ${line}`);
  return point(Number(p[1]), Number(p[2]), Number(p[3]));
});
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  if (!fs.existsSync(path.join(absolute(snapshot), member))) throw new Error(`source lacks ${member}`);
}
const reader = new AnvilReader(path.join(absolute(snapshot), 'region'));
const entityReader = new AnvilReader(path.join(absolute(snapshot), 'entities'));
const cache = new Map();
const stateAt = async (cell) => {
  const key = cellKey(cell);
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return cache.get(key);
};
const core = box(point(-274, 54, -460), point(-255, 59, -455));
const coreKeys = new Set(core.map(cellKey));
const envelope = box(point(-275, 53, -461), point(-254, 60, -454));
const shell = envelope.filter((cell) => !coreKeys.has(cellKey(cell)) && (cell.y === 53 || cell.y === 60 || cell.z === -461 || cell.z === -454));
const shellKeys = new Set(shell.map(cellKey));
const halo = box(point(-276, 52, -462), point(-253, 61, -453)).filter((cell) => !coreKeys.has(cellKey(cell)) && !shellKeys.has(cellKey(cell)));
const predecessor = JSON.parse(fs.readFileSync(absolute(predecessorPath), 'utf8'));
const predecessorTargets = new Set(predecessor.stages.flatMap(({ forward }) => parseOps(forward)).map(cellKey));
const classify = async (cells) => {
  const records = [];
  const counts = { total: cells.length, air: 0, fluids: 0, gravel: 0, pds: 0, forbidden: 0, predecessorOwned: 0, states: {} };
  for (const cell of cells) {
    const state = await stateAt(cell);
    counts.states[state] = (counts.states[state] ?? 0) + 1;
    if (state === 'minecraft:air') counts.air += 1;
    if (isFluid(state)) counts.fluids += 1;
    if (state === 'minecraft:gravel') counts.gravel += 1;
    if (state === 'minecraft:polished_deepslate') counts.pds += 1;
    if (predecessorTargets.has(cellKey(cell))) counts.predecessorOwned += 1;
    records.push({ point: cell, state, predecessorOwned: predecessorTargets.has(cellKey(cell)) });
  }
  return { counts, records };
};
const [coreResult, shellResult, haloResult] = await Promise.all([classify(core), classify(shell), classify(halo)]);
const interaction = [...core, ...shell, ...halo];
const interactionKeys = new Set(interaction.map(cellKey));
const entities = [];
for (const chunkKey of new Set(interaction.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))) {
  const [x, z] = chunkKey.split(',').map(Number);
  const chunk = await entityReader.chunk(x, z);
  for (const entity of chunk?.Entities ?? []) {
    if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
    const [entityX, entityY, entityZ] = entity.Pos.map(Number);
    if (interactionKeys.has(cellKey(point(Math.floor(entityX), Math.floor(entityY), Math.floor(entityZ))))) entities.push({ id: entity.id ?? entity.Id ?? null, position: [entityX, entityY, entityZ] });
  }
}
const water = haloResult.records.filter(({ state }) => state === 'minecraft:water[level=0]').map(({ point: cell }) => cell);
const result = {
  schemaVersion: 1,
  id: 'rail-s3-r10-high-successor15-current-post-survey',
  status: 'READ_ONLY_CURRENT_SOURCE_SURVEY',
  source: { snapshot, completeSaveCaptureManifestSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(absolute(snapshot), 'combined-zones-complete-save-capture.json'))).digest('hex') },
  predecessor: { manifest: predecessorPath, targets: predecessorTargets.size },
  geometry: { core: { bounds: { x: [-274, -255], y: [54, 59], z: [-460, -455] }, count: core.length }, shell: { bounds: { x: [-275, -254], y: [53, 60], z: [-461, -454] }, count: shell.length }, halo: { bounds: { x: [-276, -253], y: [52, 61], z: [-462, -453] }, count: halo.length } },
  core: coreResult,
  shell: shellResult,
  halo: { ...haloResult, waterCoordinateSetSha256: hashCells(water), water },
  interaction: { count: interaction.length, savedEntityCount: entities.length, savedEntities: entities },
  readOnly: true,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
};
fs.mkdirSync(path.dirname(absolute(out)), { recursive: true });
fs.writeFileSync(absolute(out), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ status: result.status, geometry: result.geometry, core: result.core.counts, shell: result.shell.counts, halo: { ...result.halo.counts, water: water.length, waterCoordinateSetSha256: result.halo.waterCoordinateSetSha256 }, savedEntities: entities.length }, null, 2));
