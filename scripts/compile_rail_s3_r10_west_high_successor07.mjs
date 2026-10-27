#!/usr/bin/env node
/** Source-bound offline compiler for the dry R10 West High Successor-07 civil envelope. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, replLine, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const value = (flag, fallback = '') => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const snapshot = value('--snapshot');
const basename = value('--basename', 'rail-s3-r10-west-high-successor-07');
const outDir = value('--out-dir', 'data/buildops');
const predecessorManifestPath = value('--predecessor-manifest', 'data/buildops/rail-s3-r10-west-high-successor-06.manifest.json');
if (!snapshot) throw new Error('--snapshot required');

const root = process.cwd();
const reader = new AnvilReader(path.resolve(root, snapshot, 'region'));
const cache = new Map();
const state = async (point) => {
  const key = cellKey(point);
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(point.x, point.y, point.z)));
  return cache.get(key);
};
const point = (x, y, z) => ({ x, y, z });
const box = (min, max) => {
  const cells = [];
  for (let x = min.x; x <= max.x; x += 1) for (let y = min.y; y <= max.y; y += 1) for (let z = min.z; z <= max.z; z += 1) cells.push(point(x, y, z));
  return cells;
};
const fail = (condition, message) => { if (condition) throw new Error(`R10 West High Successor-07: ${message}`); };
const isFluid = (block) => block.startsWith('minecraft:water') || block.startsWith('minecraft:lava') || block.startsWith('minecraft:bubble_column') || block.includes('waterlogged=true');
const blockName = (block) => block.split('[', 1)[0];
const forbidden = new Set(['minecraft:chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:spawner', 'minecraft:command_block', 'minecraft:lectern', 'minecraft:beacon']);
const parseTargets = (file) => fs.readFileSync(path.resolve(root, file), 'utf8').trim().split(/\r?\n/).filter(Boolean).map((line) => {
  const terms = line.trim().split(/\s+/);
  return point(Number(terms[1]), Number(terms[2]), Number(terms[3]));
});

const core = box(point(-114, 42, -472), point(-95, 47, -467));
const coreKeys = new Set(core.map(cellKey));
const envelope = box(point(-115, 41, -473), point(-94, 48, -466));
const shellSurface = envelope.filter((cell) => !coreKeys.has(cellKey(cell)) && (cell.y === 41 || cell.y === 48 || cell.z === -473 || cell.z === -466));
const predecessor = JSON.parse(fs.readFileSync(path.resolve(root, predecessorManifestPath), 'utf8'));
const predecessorTargets = new Set(predecessor.stages.flatMap(({ forward }) => parseTargets(forward)).map(cellKey));

const coreRecords = [];
for (const cell of core) {
  const from = await state(cell);
  fail(isFluid(from), `fluid core ${cellKey(cell)}=${from}`);
  fail(from === 'minecraft:gravel', `gravity core ${cellKey(cell)}`);
  fail(forbidden.has(blockName(from)), `block entity core ${cellKey(cell)}=${from}`);
  fail(from === 'minecraft:polished_deepslate', `unreviewed PDS migration in core ${cellKey(cell)}`);
  if (from !== 'minecraft:air') coreRecords.push({ point: cell, from, to: 'minecraft:air' });
}

const shellRecords = [];
const shellPds = [];
const localPds = [];
for (const cell of shellSurface) {
  const from = await state(cell);
  if (predecessorTargets.has(cellKey(cell))) {
    fail(from !== 'minecraft:polished_deepslate', `predecessor shell interface drift ${cellKey(cell)}=${from}`);
    shellPds.push(cell);
    continue;
  }
  if (from === 'minecraft:polished_deepslate') {
    localPds.push(cell);
    continue;
  }
  fail(isFluid(from), `fluid shell ${cellKey(cell)}=${from}`);
  fail(from === 'minecraft:gravel', `gravity shell ${cellKey(cell)}`);
  fail(forbidden.has(blockName(from)), `block entity shell ${cellKey(cell)}=${from}`);
  shellRecords.push({ point: cell, from, to: 'minecraft:polished_deepslate' });
}
fail(shellPds.length !== 56, `expected 56 predecessor shell PDS cells, got ${shellPds.length}`);
fail(localPds.length !== 0, `unexpected local shell PDS count ${localPds.length}`);

const shellKeys = new Set(shellSurface.map(cellKey));
const halo = [];
for (const cell of box(point(-116, 40, -474), point(-93, 49, -465))) if (!coreKeys.has(cellKey(cell)) && !shellKeys.has(cellKey(cell))) halo.push({ point: cell, state: await state(cell) });
const haloPds = halo.filter(({ state: block }) => block === 'minecraft:polished_deepslate');
const predecessorHaloInterface = halo.filter(({ point: cell }) => predecessorTargets.has(cellKey(cell)));
const haloGravel = halo.filter(({ state: block }) => block === 'minecraft:gravel');
fail(halo.some(({ state: block }) => isFluid(block)), 'unexpected fluid in declared halo');
fail(haloGravel.length !== 0, `unexpected gravel in declared halo ${haloGravel.length}`);
fail(haloPds.length !== 28, `expected 28 source halo PDS cells, got ${haloPds.length}`);
fail(predecessorHaloInterface.length !== 100, `expected 100 predecessor halo interface cells, got ${predecessorHaloInterface.length}`);

fs.mkdirSync(path.resolve(root, outDir), { recursive: true });
const emit = (id, records) => {
  const ordered = records.slice().sort((left, right) => left.point.x - right.point.x || left.point.y - right.point.y || left.point.z - right.point.z);
  const forwardContent = `${ordered.map(({ point: cell, from, to }) => replLine(cell, from, to)).join('\n')}\n`;
  const rollbackContent = `${ordered.slice().reverse().map(({ point: cell, from, to }) => replLine(cell, to, from)).join('\n')}\n`;
  const forward = `${outDir}/${basename}.${id}.forward.txt`;
  const rollback = `${outDir}/${basename}.${id}.rollback.txt`;
  fs.writeFileSync(path.resolve(root, forward), forwardContent);
  fs.writeFileSync(path.resolve(root, rollback), rollbackContent);
  return { id, forward, rollback, count: ordered.length, sha256: crypto.createHash('sha256').update(forwardContent).digest('hex'), rollbackSha256: crypto.createHash('sha256').update(rollbackContent).digest('hex'), exactInverse: true };
};
const stages = [emit('external-shell', shellRecords), emit('core-clear', coreRecords)];
const manifest = {
  schemaVersion: 1,
  transactionId: basename,
  status: 'COMPILED_OFFLINE_R10_WEST_HIGH_SUCCESSOR07_AWAITING_STATIC_GATES',
  source: { snapshot },
  geometry: {
    core: { bounds: { x: [-114, -95], y: [42, 47], z: [-472, -467] }, count: core.length, expected: 'minecraft:air', coordinateSetSha256: hashCells(core) },
    shell: { surfaceCount: shellSurface.length, mutableCount: shellRecords.length, expected: 'minecraft:polished_deepslate', coordinateSetSha256: hashCells(shellSurface) },
  },
  ownership: {
    predecessor: {
      manifest: predecessorManifestPath,
      shellPds: { count: shellPds.length, coordinateSetSha256: hashCells(shellPds), immutable: true },
      haloPds: { count: haloPds.length, coordinateSetSha256: hashCells(haloPds.map(({ point: cell }) => cell)), immutable: true },
      haloInterface: { count: predecessorHaloInterface.length, coordinateSetSha256: hashCells(predecessorHaloInterface.map(({ point: cell }) => cell)), immutable: true },
      localPds: { count: localPds.length, coordinateSetSha256: hashCells(localPds), immutable: true },
      pdsMigration: { count: 0 },
    },
  },
  gravity: { preservedHalo: { count: halo.length, coordinateSetSha256: hashCells(halo.map(({ point: cell }) => cell)), gravelCount: haloGravel.length, exactStates: halo } },
  stages,
  exactInverse: true,
  civilOnly: true,
  routeCommissioned: false,
  passengerServiceCommissioned: false,
};
manifest.manifestIdentity = crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
fs.writeFileSync(path.resolve(root, `${outDir}/${basename}.manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: manifest.status, core: core.length, stages: Object.fromEntries(stages.map(({ id, count }) => [id, count])), shellPds: shellPds.length, haloPds: haloPds.length, haloInterface: predecessorHaloInterface.length, localPds: localPds.length, pdsMigration: 0, halo: halo.length, manifestIdentity: manifest.manifestIdentity }, null, 2));
