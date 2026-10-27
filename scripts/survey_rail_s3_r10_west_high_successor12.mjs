#!/usr/bin/env node
/** Read-only current-source census for the next westward R10 high-corridor envelope. */
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const option = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : ''; };
const snapshot = option('--snapshot');
const predecessorManifestPath = option('--predecessor-manifest');
const out = option('--out');
if (!snapshot || !predecessorManifestPath || !out) throw new Error('usage: --snapshot <complete snapshot> --predecessor-manifest <manifest> --out <json>');
const ROOT = process.cwd();
const absolute = (filename) => path.resolve(ROOT, filename);
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  if (!fs.existsSync(path.join(absolute(snapshot), member))) throw new Error(`incomplete source: ${member}`);
}
const point = (x, y, z) => ({ x, y, z });
const box = (min, max) => { const result = []; for (let x = min.x; x <= max.x; x += 1) for (let y = min.y; y <= max.y; y += 1) for (let z = min.z; z <= max.z; z += 1) result.push(point(x, y, z)); return result; };
const name = (state) => state.split('[', 1)[0];
const fluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(name(state)) || state.includes('waterlogged=true');
const protectedNames = new Set(['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:spawner', 'minecraft:command_block', 'minecraft:lectern', 'minecraft:beacon', 'minecraft:structure_block', 'minecraft:jigsaw']);
const parse = (filename) => fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/).filter(Boolean).map((line) => { const terms = line.trim().split(/\s+/); if (terms.length !== 9 || terms[0] !== 'REPL') throw new Error(`invalid operation: ${line}`); return point(Number(terms[1]), Number(terms[2]), Number(terms[3])); });
const predecessor = JSON.parse(fs.readFileSync(absolute(predecessorManifestPath), 'utf8'));
const predecessorTargets = new Set(predecessor.stages.flatMap(({ forward }) => parse(forward)).map(cellKey));
const reader = new AnvilReader(path.join(absolute(snapshot), 'region'));
const entityReader = new AnvilReader(path.join(absolute(snapshot), 'entities'));
const cache = new Map();
const stateAt = async (cell) => { const key = cellKey(cell); if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z))); return cache.get(key); };
const core = box(point(-214, 42, -472), point(-195, 47, -467));
const coreKeys = new Set(core.map(cellKey));
const envelope = box(point(-215, 41, -473), point(-194, 48, -466));
const shell = envelope.filter((cell) => !coreKeys.has(cellKey(cell)) && (cell.y === 41 || cell.y === 48 || cell.z === -473 || cell.z === -466));
const shellKeys = new Set(shell.map(cellKey));
const halo = box(point(-216, 40, -474), point(-193, 49, -465)).filter((cell) => !coreKeys.has(cellKey(cell)) && !shellKeys.has(cellKey(cell)));
const inspect = async (cells) => {
  const exactStates = [];
  for (const cell of cells) exactStates.push({ point: cell, state: await stateAt(cell) });
  return {
    count: cells.length, coordinateSetSha256: hashCells(cells), exactStates,
    fluids: exactStates.filter(({ state }) => fluid(state)), gravity: exactStates.filter(({ state }) => state === 'minecraft:gravel'),
    protectedStates: exactStates.filter(({ state }) => protectedNames.has(name(state))), polishedDeepslate: exactStates.filter(({ state }) => state === 'minecraft:polished_deepslate'),
    predecessorOwned: exactStates.filter(({ point: cell }) => predecessorTargets.has(cellKey(cell))), alreadyAir: exactStates.filter(({ state }) => state === 'minecraft:air'),
  };
};
const [coreSurvey, shellSurvey, haloSurvey] = await Promise.all([inspect(core), inspect(shell), inspect(halo)]);
const interaction = [...core, ...shell, ...halo];
const interactionKeys = new Set(interaction.map(cellKey));
const savedEntities = [];
for (const chunkKey of new Set(interaction.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))) {
  const [x, z] = chunkKey.split(',').map(Number); const chunk = await entityReader.chunk(x, z);
  for (const entity of chunk?.Entities ?? []) { if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue; const [entityX, entityY, entityZ] = entity.Pos.map(Number); if (interactionKeys.has(cellKey(point(Math.floor(entityX), Math.floor(entityY), Math.floor(entityZ))))) savedEntities.push({ id: entity.id ?? entity.Id ?? null, position: [entityX, entityY, entityZ] }); }
}
const mutableShell = shellSurvey.exactStates.filter(({ point: cell }) => !predecessorTargets.has(cellKey(cell)));
const ownership = { shellPredecessorOwned: shellSurvey.predecessorOwned.length, shellPredecessorPds: shellSurvey.predecessorOwned.filter(({ state }) => state === 'minecraft:polished_deepslate').length, haloPredecessorOwned: haloSurvey.predecessorOwned.length, haloPds: haloSurvey.polishedDeepslate.length, localHaloPds: haloSurvey.polishedDeepslate.filter(({ point: cell }) => !predecessorTargets.has(cellKey(cell))).length };
const safeDirect = core.length === 720 && shell.length === 616 && halo.length === 1064 && coreSurvey.fluids.length === 0 && coreSurvey.gravity.length === 0 && coreSurvey.protectedStates.length === 0 && coreSurvey.polishedDeepslate.length === 0 && coreSurvey.alreadyAir.length === 0 && shellSurvey.fluids.length === 0 && shellSurvey.gravity.length === 0 && shellSurvey.protectedStates.length === 0 && shellSurvey.predecessorOwned.length === 56 && shellSurvey.polishedDeepslate.length === 56 && mutableShell.length === 560 && haloSurvey.fluids.length === 0 && haloSurvey.gravity.length === 0 && ownership.haloPds === 28 && ownership.haloPredecessorOwned === 100 && ownership.localHaloPds === 0 && savedEntities.length === 0;
const result = { schemaVersion: 1, id: 'rail-s3-r10-west-high-successor12-current-source-survey', status: safeDirect ? 'SAFE_DIRECT_STATIC_CANDIDATE' : 'HOLD_OR_STAGED_DESIGN_REQUIRED', readOnly: true, source: snapshot, predecessorManifestPath, geometry: { core: { bounds: { x: [-214, -195], y: [42, 47], z: [-472, -467] }, count: core.length }, shell: { bounds: { x: [-215, -194], y: [41, 48], z: [-473, -466] }, surfaceCount: shell.length, mutableCount: mutableShell.length }, halo: { bounds: { x: [-216, -193], y: [40, 49], z: [-474, -465] }, count: halo.length } }, core: coreSurvey, shell: shellSurvey, halo: haloSurvey, ownership, savedEntities };
fs.mkdirSync(path.dirname(absolute(out)), { recursive: true }); fs.writeFileSync(absolute(out), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ status: result.status, geometry: result.geometry, ownership, blockers: { coreFluid: coreSurvey.fluids.length, coreGravity: coreSurvey.gravity.length, coreProtected: coreSurvey.protectedStates.length, corePds: coreSurvey.polishedDeepslate.length, coreAir: coreSurvey.alreadyAir.length, shellFluid: shellSurvey.fluids.length, shellGravity: shellSurvey.gravity.length, shellProtected: shellSurvey.protectedStates.length, haloFluid: haloSurvey.fluids.length, haloGravity: haloSurvey.gravity.length, savedEntities: savedEntities.length } }, null, 2));
