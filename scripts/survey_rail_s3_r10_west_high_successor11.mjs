#!/usr/bin/env node
/**
 * Read-only current-source census for the next westward R10 high-corridor
 * envelope. This is not a build compiler and never contacts the live world.
 */
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const option = (flag, fallback = '') => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const snapshot = option('--snapshot');
const out = option('--out');
const predecessorManifestPath = option('--predecessor-manifest');
if (!snapshot || !out || !predecessorManifestPath) {
  throw new Error('usage: --snapshot <complete snapshot> --predecessor-manifest <manifest> --out <json>');
}
const ROOT = process.cwd();
const absolute = (filename) => path.resolve(ROOT, filename);
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  if (!fs.existsSync(path.join(absolute(snapshot), member))) throw new Error(`incomplete source: ${member}`);
}
const point = (x, y, z) => ({ x, y, z });
const box = (min, max) => {
  const result = [];
  for (let x = min.x; x <= max.x; x += 1) for (let y = min.y; y <= max.y; y += 1) {
    for (let z = min.z; z <= max.z; z += 1) result.push(point(x, y, z));
  }
  return result;
};
const name = (state) => state.split('[', 1)[0];
const fluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(name(state))
  || state.includes('waterlogged=true');
const protectedNames = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper',
  'minecraft:spawner', 'minecraft:command_block', 'minecraft:lectern', 'minecraft:beacon',
  'minecraft:structure_block', 'minecraft:jigsaw',
]);
const parse = (filename) => fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)
  .filter((line) => line && !line.startsWith('#')).map((line) => {
    const terms = line.trim().split(/\s+/);
    if (terms.length !== 9 || terms[0] !== 'REPL') throw new Error(`invalid predecessor operation: ${line}`);
    return point(Number(terms[1]), Number(terms[2]), Number(terms[3]));
  });
const predecessor = JSON.parse(fs.readFileSync(absolute(predecessorManifestPath), 'utf8'));
const predecessorTargets = new Set(predecessor.stages.flatMap(({ forward }) => parse(forward)).map(cellKey));
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
const shellSurface = envelope.filter((cell) => !coreKeys.has(cellKey(cell)) && (
  cell.y === 41 || cell.y === 48 || cell.z === -473 || cell.z === -466
));
const shellKeys = new Set(shellSurface.map(cellKey));
const halo = box(point(-196, 40, -474), point(-173, 49, -465))
  .filter((cell) => !coreKeys.has(cellKey(cell)) && !shellKeys.has(cellKey(cell)));
const classify = async (cells) => {
  const states = [];
  for (const cell of cells) states.push({ point: cell, state: await stateAt(cell) });
  return {
    count: cells.length,
    coordinateSetSha256: hashCells(cells),
    fluids: states.filter(({ state }) => fluid(state)),
    gravity: states.filter(({ state }) => state === 'minecraft:gravel'),
    protectedStates: states.filter(({ state }) => protectedNames.has(name(state))),
    polishedDeepslate: states.filter(({ state }) => state === 'minecraft:polished_deepslate'),
    predecessorOwned: states.filter(({ point: cell }) => predecessorTargets.has(cellKey(cell))),
    alreadyAir: states.filter(({ state }) => state === 'minecraft:air'),
    exactStates: states,
  };
};
const [coreSurvey, shellSurvey, haloSurvey] = await Promise.all([classify(core), classify(shellSurface), classify(halo)]);
const interaction = [...core, ...shellSurface, ...halo];
const interactionKeys = new Set(interaction.map(cellKey));
const savedEntities = [];
for (const chunkKey of new Set(interaction.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))) {
  const [x, z] = chunkKey.split(',').map(Number);
  const chunk = await entityReader.chunk(x, z);
  for (const entity of chunk?.Entities ?? []) {
    if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
    const [entityX, entityY, entityZ] = entity.Pos.map(Number);
    if (interactionKeys.has(cellKey(point(Math.floor(entityX), Math.floor(entityY), Math.floor(entityZ))))) {
      savedEntities.push({ id: entity.id ?? entity.Id ?? null, position: [entityX, entityY, entityZ] });
    }
  }
}
const mutableShell = shellSurvey.exactStates.filter(({ point: cell }) => !predecessorTargets.has(cellKey(cell)));
const supportChain = async (target) => {
  const chain = [];
  for (let y = target.y - 1; y >= -64; y -= 1) {
    const cell = point(target.x, y, target.z);
    const state = await stateAt(cell);
    chain.push({ point: cell, state, role: shellKeys.has(cellKey(cell)) ? 'shell-target' : halo.some(({ x, y: haloY, z }) => x === cell.x && haloY === cell.y && z === cell.z) ? 'preserved-halo' : 'external-support' });
    if (state !== 'minecraft:gravel') {
      const sourceSafe = state !== 'minecraft:air' && !fluid(state);
      const plannedShellLock = state === 'minecraft:air'
        && shellKeys.has(cellKey(cell)) && !predecessorTargets.has(cellKey(cell));
      return {
        target,
        chain,
        terminal: { point: cell, state },
        sourceSafe,
        plannedShellLock,
        safeAfterShellLock: sourceSafe || plannedShellLock,
      };
    }
  }
  return { target, chain, terminal: null, sourceSafe: false, plannedShellLock: false, safeAfterShellLock: false };
};
const coreGravityChains = [];
for (const { point: target } of coreSurvey.gravity) coreGravityChains.push(await supportChain(target));
const shellGravityChains = [];
for (const { point: target } of shellSurvey.gravity) shellGravityChains.push(await supportChain(target));
const preservedWater = haloSurvey.fluids.filter(({ point: cell, state }) => cell.x === -186 && cell.y === 40 && cell.z === -467 && state === 'minecraft:water[level=0]');
const waterAbove = await stateAt(point(-186, 41, -467));
const waterInterfaceSafe = preservedWater.length === 1 && waterAbove !== 'minecraft:air' && !fluid(waterAbove)
  && shellKeys.has(cellKey(point(-186, 41, -467)));
const safe = core.length === 720 && shellSurface.length === 616 && halo.length === 1064
  && coreSurvey.fluids.length === 0
  && coreSurvey.protectedStates.length === 0 && coreSurvey.polishedDeepslate.length === 0
  && coreSurvey.alreadyAir.length === 0 && shellSurvey.fluids.length === 0
  && shellSurvey.protectedStates.length === 0
  && shellSurvey.predecessorOwned.length === 56 && shellSurvey.polishedDeepslate.length === 56
  && mutableShell.length === 560 && coreGravityChains.length === 7 && shellGravityChains.length === 7
  && coreGravityChains.every(({ safeAfterShellLock: valid }) => valid)
  && shellGravityChains.every(({ safeAfterShellLock: valid }) => valid)
  && preservedWater.length === 1 && waterInterfaceSafe && haloSurvey.gravity.length === 18
  && haloSurvey.polishedDeepslate.length === 28 && haloSurvey.predecessorOwned.length === 100
  && savedEntities.length === 0;
const result = {
  schemaVersion: 1,
  id: 'rail-s3-r10-west-high-successor11-current-source-survey',
  status: safe ? 'SAFE_STATIC_CANDIDATE' : 'HOLD',
  readOnly: true,
  source: snapshot,
  predecessorManifestPath,
  geometry: {
    core: { bounds: { x: [-194, -175], y: [42, 47], z: [-472, -467] }, count: core.length },
    shell: { bounds: { x: [-195, -174], y: [41, 48], z: [-473, -466] }, surfaceCount: shellSurface.length, mutableCount: mutableShell.length },
    halo: { bounds: { x: [-196, -173], y: [40, 49], z: [-474, -465] }, count: halo.length },
  },
  core: coreSurvey,
  shell: shellSurvey,
  halo: haloSurvey,
  gravityChains: {
    core: coreGravityChains,
    shell: shellGravityChains,
    order: ['shell-gravity-lock-bottom-up', 'core-clear-top-down'],
  },
  preservedWater: {
    exact: preservedWater,
    above: { point: point(-186, 41, -467), state: waterAbove, isMutableShellTarget: shellKeys.has(cellKey(point(-186, 41, -467))) },
    safe: waterInterfaceSafe,
  },
  savedEntities,
  ownership: {
    shellPredecessorOwned: shellSurvey.predecessorOwned.length,
    shellPredecessorPds: shellSurvey.predecessorOwned.filter(({ state }) => state === 'minecraft:polished_deepslate').length,
    haloPredecessorOwned: haloSurvey.predecessorOwned.length,
    haloPds: haloSurvey.polishedDeepslate.length,
    localHaloPds: haloSurvey.polishedDeepslate.filter(({ point: cell }) => !predecessorTargets.has(cellKey(cell))).length,
  },
};
fs.mkdirSync(path.dirname(absolute(out)), { recursive: true });
fs.writeFileSync(absolute(out), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ status: result.status, geometry: result.geometry, ownership: result.ownership,
  blockers: { coreFluid: coreSurvey.fluids.length, coreGravity: coreSurvey.gravity.length, coreProtected: coreSurvey.protectedStates.length,
    corePds: coreSurvey.polishedDeepslate.length, coreAir: coreSurvey.alreadyAir.length, shellFluid: shellSurvey.fluids.length,
    shellGravity: shellSurvey.gravity.length, shellProtected: shellSurvey.protectedStates.length, haloFluid: haloSurvey.fluids.length,
    haloGravity: haloSurvey.gravity.length, savedEntities: savedEntities.length } }, null, 2));
