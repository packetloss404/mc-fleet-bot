#!/usr/bin/env node
/**
 * Source-bound, gravity-and-water-preserving compiler for the next westward
 * R10 high-corridor envelope. It is offline-only: live entity gates and a
 * fresh capture remain mandatory before any physical execution.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, cellKey, hashCells, replLine, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const option = (flag, fallback = '') => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const snapshot = option('--snapshot');
const outDir = option('--out-dir', 'data/buildops');
const basename = option('--basename', 'rail-s3-r10-west-high-successor-11');
const predecessorManifestPath = option('--predecessor-manifest');
const ROOT = process.cwd();
const absolute = (filename) => path.resolve(ROOT, filename);
const fail = (condition, message) => {
  if (condition) throw new Error(`R10 West High Successor-11 rejected: ${message}`);
};
if (!snapshot || !predecessorManifestPath) {
  throw new Error('usage: --snapshot <complete snapshot> --predecessor-manifest <manifest> [--out-dir <dir>] [--basename <name>]');
}
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  fail(!fs.existsSync(path.join(absolute(snapshot), member)), `complete source lacks ${member}`);
}

const point = (x, y, z) => ({ x, y, z });
const box = (min, max) => {
  const cells = [];
  for (let x = min.x; x <= max.x; x += 1) for (let y = min.y; y <= max.y; y += 1) {
    for (let z = min.z; z <= max.z; z += 1) cells.push(point(x, y, z));
  }
  return cells;
};
const name = (state) => state.split('[', 1)[0];
const fluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(name(state))
  || state.includes('waterlogged=true');
const forbidden = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper',
  'minecraft:spawner', 'minecraft:command_block', 'minecraft:lectern', 'minecraft:beacon',
  'minecraft:structure_block', 'minecraft:jigsaw',
]);
const sha256 = (input) => crypto.createHash('sha256').update(input).digest('hex');
const parseOperations = (filename) => fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)
  .filter((line) => line && !line.startsWith('#')).map((line) => {
    const terms = line.trim().split(/\s+/);
    fail(terms.length !== 9 || terms[0] !== 'REPL', `invalid predecessor operation: ${line}`);
    return point(Number(terms[1]), Number(terms[2]), Number(terms[3]));
  });
const predecessor = JSON.parse(fs.readFileSync(absolute(predecessorManifestPath), 'utf8'));
fail(!Array.isArray(predecessor.stages), 'predecessor lacks stages');
const predecessorTargets = new Set(predecessor.stages.flatMap(({ forward }) => parseOperations(forward)).map(cellKey));

const reader = new AnvilReader(path.join(absolute(snapshot), 'region'));
const entityReader = new AnvilReader(path.join(absolute(snapshot), 'entities'));
const cache = new Map();
const stateAt = async (cell) => {
  const key = cellKey(cell);
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return cache.get(key);
};

const core = box(point(-194, 42, -472), point(-175, 47, -467));
const coreKeys = new Set(core.map(cellKey));
const envelope = box(point(-195, 41, -473), point(-174, 48, -466));
const shell = envelope.filter((cell) => !coreKeys.has(cellKey(cell)) && (
  cell.y === 41 || cell.y === 48 || cell.z === -473 || cell.z === -466
));
const shellKeys = new Set(shell.map(cellKey));
fail(core.length !== 720 || shell.length !== 616, `invalid fixed geometry ${core.length}/${shell.length}`);

const shellRecords = [];
const predecessorShellPds = [];
for (const cell of shell) {
  const from = await stateAt(cell);
  if (predecessorTargets.has(cellKey(cell))) {
    fail(from !== 'minecraft:polished_deepslate', `predecessor shell seam drift ${cellKey(cell)}=${from}`);
    predecessorShellPds.push(cell);
    continue;
  }
  fail(fluid(from), `fluid in shell target ${cellKey(cell)}=${from}`);
  fail(forbidden.has(name(from)), `protected/container state in shell target ${cellKey(cell)}=${from}`);
  fail(from === 'minecraft:polished_deepslate', `unowned polished-deepslate shell state ${cellKey(cell)}`);
  shellRecords.push({ point: cell, from, to: 'minecraft:polished_deepslate' });
}
fail(predecessorShellPds.length !== 56 || shellRecords.length !== 560, `shell ownership ${predecessorShellPds.length}/${shellRecords.length}`);
const mutableShellKeys = new Set(shellRecords.map(({ point: cell }) => cellKey(cell)));

const coreRecords = [];
for (const cell of core) {
  const from = await stateAt(cell);
  fail(fluid(from), `fluid in core target ${cellKey(cell)}=${from}`);
  fail(forbidden.has(name(from)), `protected/container state in core target ${cellKey(cell)}=${from}`);
  fail(from === 'minecraft:polished_deepslate', `unowned polished-deepslate core state ${cellKey(cell)}`);
  fail(from === 'minecraft:air', `core target already air at ${cellKey(cell)}`);
  coreRecords.push({ point: cell, from, to: 'minecraft:air' });
}
fail(coreRecords.length !== 720, `core records ${coreRecords.length}`);

const supportChain = async (target) => {
  const chain = [];
  for (let y = target.y - 1; y >= -64; y -= 1) {
    const cell = point(target.x, y, target.z);
    const state = await stateAt(cell);
    chain.push({ point: cell, state });
    if (state !== 'minecraft:gravel') {
      const sourceSafe = state !== 'minecraft:air' && !fluid(state);
      const plannedShellLock = state === 'minecraft:air' && mutableShellKeys.has(cellKey(cell));
      return { target, chain, terminal: { point: cell, state }, sourceSafe, plannedShellLock, safeAfterShellLock: sourceSafe || plannedShellLock };
    }
  }
  return { target, chain, terminal: null, sourceSafe: false, plannedShellLock: false, safeAfterShellLock: false };
};
const coreGravel = coreRecords.filter(({ from }) => from === 'minecraft:gravel');
const shellGravel = shellRecords.filter(({ from }) => from === 'minecraft:gravel');
fail(coreGravel.length !== 7 || shellGravel.length !== 7, `target gravel ${coreGravel.length}/${shellGravel.length}, expected 7/7`);
const coreChains = [];
for (const { point: cell } of coreGravel) coreChains.push(await supportChain(cell));
const shellChains = [];
for (const { point: cell } of shellGravel) shellChains.push(await supportChain(cell));
fail(coreChains.some(({ safeAfterShellLock }) => !safeAfterShellLock), 'unsupported core gravel chain');
fail(shellChains.some(({ sourceSafe }) => !sourceSafe), 'unsupported shell gravel chain');
fail(coreChains.filter(({ plannedShellLock }) => plannedShellLock).length !== 1, 'expected exactly one shell-lock core dependency');

const halo = [];
for (const cell of box(point(-196, 40, -474), point(-173, 49, -465))) {
  if (!coreKeys.has(cellKey(cell)) && !shellKeys.has(cellKey(cell))) halo.push({ point: cell, state: await stateAt(cell) });
}
const haloPds = halo.filter(({ state }) => state === 'minecraft:polished_deepslate');
const predecessorHaloInterface = halo.filter(({ point: cell }) => predecessorTargets.has(cellKey(cell)));
const localHaloPds = haloPds.filter(({ point: cell }) => !predecessorTargets.has(cellKey(cell)));
const haloGravel = halo.filter(({ state }) => state === 'minecraft:gravel');
const haloFluids = halo.filter(({ state }) => fluid(state));
const requiredWater = haloFluids.filter(({ point: cell, state }) => cell.x === -186 && cell.y === 40 && cell.z === -467 && state === 'minecraft:water[level=0]');
fail(halo.length !== 1064 || haloPds.length !== 28 || predecessorHaloInterface.length !== 100 || localHaloPds.length !== 0,
  `PDS contract ${halo.length}/${haloPds.length}/${predecessorHaloInterface.length}/${localHaloPds.length}`);
fail(haloGravel.length !== 18, `halo gravel ${haloGravel.length}, expected 18`);
fail(haloFluids.length !== 1 || requiredWater.length !== 1, `halo fluid contract ${JSON.stringify(haloFluids)}`);
const waterAbove = point(-186, 41, -467);
const waterAboveRecord = shellRecords.find(({ point: cell }) => cellKey(cell) === cellKey(waterAbove));
fail(!waterAboveRecord || fluid(waterAboveRecord.from), `water cap interface drift ${cellKey(waterAbove)}`);

const interaction = [...core, ...shell, ...halo];
const interactionKeys = new Set(interaction.map(cellKey));
const savedEntities = [];
for (const key of new Set(interaction.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))) {
  const [x, z] = key.split(',').map(Number);
  const chunk = await entityReader.chunk(x, z);
  for (const entity of chunk?.Entities ?? []) {
    if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
    const [entityX, entityY, entityZ] = entity.Pos.map(Number);
    if (interactionKeys.has(cellKey(point(Math.floor(entityX), Math.floor(entityY), Math.floor(entityZ))))) {
      savedEntities.push({ id: entity.id ?? entity.Id ?? null, position: [entityX, entityY, entityZ] });
    }
  }
}
fail(savedEntities.length !== 0, `saved movable entities in target/halo: ${JSON.stringify(savedEntities)}`);

const emit = (id, records, comparator) => {
  const ordered = records.slice().sort(comparator);
  const forwardBody = `${ordered.map(({ point: cell, from, to }) => replLine(cell, from, to)).join('\n')}\n`;
  const rollbackBody = `${ordered.slice().reverse().map(({ point: cell, from, to }) => replLine(cell, to, from)).join('\n')}\n`;
  const forward = `${outDir}/${basename}.${id}.forward.txt`;
  const rollback = `${outDir}/${basename}.${id}.rollback.txt`;
  fs.writeFileSync(absolute(forward), forwardBody);
  fs.writeFileSync(absolute(rollback), rollbackBody);
  return { id, forward, rollback, count: ordered.length, sha256: sha256(forwardBody), rollbackSha256: sha256(rollbackBody), exactInverse: true };
};
fs.mkdirSync(absolute(outDir), { recursive: true });
const stages = [
  emit('shell-gravity-lock-bottom-up', shellRecords, (left, right) => left.point.y - right.point.y || left.point.x - right.point.x || left.point.z - right.point.z),
  emit('core-clear-top-down', coreRecords, (left, right) => right.point.y - left.point.y || left.point.x - right.point.x || left.point.z - right.point.z),
];
const manifest = {
  schemaVersion: 1,
  transactionId: basename,
  status: 'COMPILED_OFFLINE_R10_WEST_HIGH_SUCCESSOR11_GRAVITY_WATER_PRESERVING_AWAITING_FRESH_KERNEL',
  source: { snapshot, completeSaveCaptureManifestSha256: sha256(fs.readFileSync(path.join(absolute(snapshot), 'combined-zones-complete-save-capture.json'))), verifiedCleanSource: true },
  geometry: {
    core: { bounds: { x: [-194, -175], y: [42, 47], z: [-472, -467] }, count: 720, expected: 'minecraft:air', coordinateSetSha256: hashCells(core) },
    shell: { surfaceCount: 616, mutableCount: 560, expected: 'minecraft:polished_deepslate', coordinateSetSha256: hashCells(shell) },
  },
  ownership: { predecessor: {
    manifest: predecessorManifestPath,
    shellPds: { count: 56, coordinateSetSha256: hashCells(predecessorShellPds), immutable: true },
    haloPds: { count: 28, coordinateSetSha256: hashCells(haloPds.map(({ point: cell }) => cell)), immutable: true },
    haloInterface: { count: 100, coordinateSetSha256: hashCells(predecessorHaloInterface.map(({ point: cell }) => cell)), immutable: true },
    localPds: { count: 0, coordinateSetSha256: hashCells([]) },
    pdsMigration: { count: 0, coordinateSetSha256: hashCells([]) },
    preservationContract: '56/28/100/0/0',
  } },
  gravity: {
    targetGravel: { core: coreGravel.map(({ point: cell }) => cell), shell: shellGravel.map(({ point: cell }) => cell), coreChains, shellChains },
    releaseOrder: stages.map(({ id }) => id),
    preservedHalo: { count: 1064, gravelCount: 18, coordinateSetSha256: hashCells(halo.map(({ point: cell }) => cell)), exactStates: halo },
  },
  waterPreservation: { point: point(-186, 40, -467), expected: 'minecraft:water[level=0]', capAbove: { point: waterAbove, from: waterAboveRecord.from, to: waterAboveRecord.to } },
  interfaces: { savedEntityCount: 0, savedEntities, targetAndHaloCellCount: interaction.length },
  stages,
  exactInverse: true,
  civilOnly: true,
  routeCommissioned: false,
  passengerServiceCommissioned: false,
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false },
};
manifest.manifestIdentity = sha256(JSON.stringify(manifest));
const manifestPath = `${outDir}/${basename}.manifest.json`;
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: manifest.status, source: snapshot, manifest: manifestPath,
  stages: Object.fromEntries(stages.map(({ id, count }) => [id, count])), gravity: { core: coreGravel.length, shell: shellGravel.length, coreChains: coreChains.length, shellChains: shellChains.length, plannedShellLocks: coreChains.filter(({ plannedShellLock }) => plannedShellLock).length },
  halo: { gravel: haloGravel.length, water: requiredWater.length, cells: halo.length }, ownership: manifest.ownership.predecessor, manifestIdentity: manifest.manifestIdentity }, null, 2));
