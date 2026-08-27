#!/usr/bin/env node
/**
 * Read-only hydrology topology and disjoint high/low bypass screen for the
 * Successor-12 obstruction. It never calls the live world.
 */
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
const box = (min, max) => { const cells = []; for (let x = min.x; x <= max.x; x += 1) for (let y = min.y; y <= max.y; y += 1) for (let z = min.z; z <= max.z; z += 1) cells.push(point(x, y, z)); return cells; };
const name = (state) => state.split('[', 1)[0];
const fluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(name(state)) || state.includes('waterlogged=true');
const forbidden = new Set(['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:spawner', 'minecraft:command_block', 'minecraft:lectern', 'minecraft:beacon', 'minecraft:structure_block', 'minecraft:jigsaw']);
const predecessor = JSON.parse(fs.readFileSync(absolute(predecessorManifestPath), 'utf8'));
const parse = (filename) => fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/).filter(Boolean).map((line) => { const terms = line.trim().split(/\s+/); if (terms.length !== 9 || terms[0] !== 'REPL') throw new Error(`invalid operation: ${line}`); return point(Number(terms[1]), Number(terms[2]), Number(terms[3])); });
const predecessorTargets = new Set(predecessor.stages.flatMap(({ forward }) => parse(forward)).map(cellKey));
const reader = new AnvilReader(path.join(absolute(snapshot), 'region'));
const cache = new Map();
const stateAt = async (cell) => { const key = cellKey(cell); if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z))); return cache.get(key); };
const originCore = box(point(-214, 42, -472), point(-195, 47, -467));
const fluidSeeds = [];
for (const cell of originCore) if (fluid(await stateAt(cell))) fluidSeeds.push(cell);
if (fluidSeeds.length !== 16) throw new Error(`Successor-12 core fluid source drift ${fluidSeeds.length}, expected 16`);
const neighbours = ({ x, y, z }) => [point(x - 1, y, z), point(x + 1, y, z), point(x, y - 1, z), point(x, y + 1, z), point(x, y, z - 1), point(x, y, z + 1)];
const component = [];
const queue = [...fluidSeeds];
const visited = new Set();
const maxComponentCells = 50000;
while (queue.length > 0 && component.length < maxComponentCells) {
  const cell = queue.shift(); const key = cellKey(cell);
  if (visited.has(key)) continue; visited.add(key);
  const state = await stateAt(cell); if (!fluid(state)) continue;
  component.push({ point: cell, state });
  for (const next of neighbours(cell)) if (!visited.has(cellKey(next))) queue.push(next);
}
const componentOpen = queue.length > 0;
const bounds = (records) => {
  if (!records.length) return null;
  const points = records.map(({ point: cell }) => cell);
  return { x: [Math.min(...points.map(({ x }) => x)), Math.max(...points.map(({ x }) => x))], y: [Math.min(...points.map(({ y }) => y)), Math.max(...points.map(({ y }) => y))], z: [Math.min(...points.map(({ z }) => z)), Math.max(...points.map(({ z }) => z))] };
};
const gravitySupport = async (target) => {
  const chain = [];
  for (let y = target.y - 1; y >= -64; y -= 1) {
    const cell = point(target.x, y, target.z); const state = await stateAt(cell); chain.push({ point: cell, state });
    if (state !== 'minecraft:gravel') return { target, chain, terminal: { point: cell, state }, safe: state !== 'minecraft:air' && !fluid(state) };
  }
  return { target, chain, terminal: null, safe: false };
};
const originInteraction = box(point(-216, 40, -474), point(-193, 49, -465));
const originCoreGravity = [];
const originShellGravity = [];
const originHaloGravity = [];
const originCoreKeys = new Set(originCore.map(cellKey));
const originShell = box(point(-215, 41, -473), point(-194, 48, -466)).filter((cell) => !originCoreKeys.has(cellKey(cell)) && (cell.y === 41 || cell.y === 48 || cell.z === -473 || cell.z === -466));
const originShellKeys = new Set(originShell.map(cellKey));
for (const cell of originInteraction) {
  if (await stateAt(cell) !== 'minecraft:gravel') continue;
  if (originCoreKeys.has(cellKey(cell))) originCoreGravity.push(cell);
  else if (originShellKeys.has(cellKey(cell))) originShellGravity.push(cell);
  else originHaloGravity.push(cell);
}
const gravelTopology = { core: [], shell: [], halo: [] };
for (const cell of originCoreGravity) gravelTopology.core.push(await gravitySupport(cell));
for (const cell of originShellGravity) gravelTopology.shell.push(await gravitySupport(cell));
for (const cell of originHaloGravity) gravelTopology.halo.push(await gravitySupport(cell));

const predecessorHalo = new Set(box(point(-196, 40, -474), point(-173, 49, -465)).map(cellKey));
const evaluate = async (coreMin) => {
  const core = box(coreMin, point(coreMin.x + 19, coreMin.y + 5, coreMin.z + 5));
  const coreKeys = new Set(core.map(cellKey));
  const shell = box(point(coreMin.x - 1, coreMin.y - 1, coreMin.z - 1), point(coreMin.x + 20, coreMin.y + 6, coreMin.z + 6))
    .filter((cell) => !coreKeys.has(cellKey(cell)) && (cell.y === coreMin.y - 1 || cell.y === coreMin.y + 6 || cell.z === coreMin.z - 1 || cell.z === coreMin.z + 6));
  const shellKeys = new Set(shell.map(cellKey));
  const halo = box(point(coreMin.x - 2, coreMin.y - 2, coreMin.z - 2), point(coreMin.x + 21, coreMin.y + 7, coreMin.z + 7))
    .filter((cell) => !coreKeys.has(cellKey(cell)) && !shellKeys.has(cellKey(cell)));
  const inspect = async (cells) => {
    const records = []; for (const cell of cells) records.push({ point: cell, state: await stateAt(cell) });
    return { fluid: records.filter(({ state }) => fluid(state)).length, gravel: records.filter(({ state }) => state === 'minecraft:gravel').length, protected: records.filter(({ state }) => forbidden.has(name(state))).length, pds: records.filter(({ state }) => state === 'minecraft:polished_deepslate').length, air: records.filter(({ state }) => state === 'minecraft:air').length, predecessorOverlap: records.filter(({ point: cell }) => predecessorTargets.has(cellKey(cell)) || predecessorHalo.has(cellKey(cell))).length };
  };
  const [coreStats, shellStats, haloStats] = await Promise.all([inspect(core), inspect(shell), inspect(halo)]);
  const blockers = Object.values(coreStats).reduce((sum, value) => sum + value, 0) + Object.values(shellStats).reduce((sum, value) => sum + value, 0) + Object.values(haloStats).reduce((sum, value) => sum + value, 0);
  return { core: { bounds: { x: [coreMin.x, coreMin.x + 19], y: [coreMin.y, coreMin.y + 5], z: [coreMin.z, coreMin.z + 5] } }, coreStats, shellStats, haloStats, blockerScore: blockers, directDry: blockers === 0 };
};
const candidates = [];
for (const y of [20, 24, 28, 32, 36, 50, 54, 58]) for (let z = -492; z <= -452; z += 2) candidates.push(await evaluate(point(-214, y, z)));
candidates.sort((left, right) => left.blockerScore - right.blockerScore || left.core.bounds.y[0] - right.core.bounds.y[0] || left.core.bounds.z[0] - right.core.bounds.z[0]);
const directDryCandidates = candidates.filter(({ directDry }) => directDry);
const result = {
  schemaVersion: 1,
  id: 'rail-s3-r10-west-high-successor12-hydrology-bypass-survey',
  readOnly: true,
  source: snapshot,
  hydrology: { seedCount: fluidSeeds.length, componentCellCount: component.length, componentOpenAt50000: componentOpen, componentBounds: bounds(component), componentCoordinateSetSha256: hashCells(component.map(({ point: cell }) => cell)), containmentEligible: !componentOpen },
  gravelTopology: { coreCount: gravelTopology.core.length, shellCount: gravelTopology.shell.length, haloCount: gravelTopology.halo.length, unsafeChains: Object.fromEntries(Object.entries(gravelTopology).map(([role, chains]) => [role, chains.filter(({ safe }) => !safe).length])), chains: gravelTopology },
  bypass: { candidateCount: candidates.length, directDryCandidates, bestFive: candidates.slice(0, 5) },
};
fs.mkdirSync(path.dirname(absolute(out)), { recursive: true }); fs.writeFileSync(absolute(out), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ hydrology: result.hydrology, gravel: { core: result.gravelTopology.coreCount, shell: result.gravelTopology.shellCount, halo: result.gravelTopology.haloCount, unsafeChains: result.gravelTopology.unsafeChains }, bypass: { directDryCandidates: directDryCandidates.length, bestFive: result.bypass.bestFive } }, null, 2));
