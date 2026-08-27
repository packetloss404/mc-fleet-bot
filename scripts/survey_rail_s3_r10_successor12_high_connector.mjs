#!/usr/bin/env node
/** Read-only 6×6 dry-envelope, 1:1-grade connector search to the high bypass. */
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
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) if (!fs.existsSync(path.join(absolute(snapshot), member))) throw new Error(`incomplete source: ${member}`);
const point = (x, y, z) => ({ x, y, z });
const key = ({ x, y, z }) => `${x},${y},${z}`;
const name = (state) => state.split('[', 1)[0];
const fluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(name(state)) || state.includes('waterlogged=true');
const forbidden = new Set(['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:spawner', 'minecraft:command_block', 'minecraft:lectern', 'minecraft:beacon', 'minecraft:structure_block', 'minecraft:jigsaw']);
const parse = (filename) => fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/).filter(Boolean).map((line) => { const terms = line.trim().split(/\s+/); if (terms.length !== 9 || terms[0] !== 'REPL') throw new Error(`invalid operation: ${line}`); return point(Number(terms[1]), Number(terms[2]), Number(terms[3])); });
const predecessor = JSON.parse(fs.readFileSync(absolute(predecessorManifestPath), 'utf8'));
const predecessorTargets = new Set(predecessor.stages.flatMap(({ forward }) => parse(forward)).map(cellKey));
const reader = new AnvilReader(path.join(absolute(snapshot), 'region'));
const cache = new Map();
const stateAt = async (cell) => { const id = key(cell); if (!cache.has(id)) cache.set(id, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z))); return cache.get(id); };
const min = { x: -236, y: 30, z: -504 };
const max = { x: -176, y: 55, z: -446 };
const inBounds = ({ x, y, z }) => x >= min.x && x <= max.x && y >= min.y && y <= max.y && z >= min.z && z <= max.z;
const footprintCache = new Map();
const footprint = async (origin) => {
  const id = key(origin); if (footprintCache.has(id)) return footprintCache.get(id);
  const cells = []; const stats = { fluid: 0, gravel: 0, protected: 0, pds: 0, air: 0, predecessorPds: 0 };
  for (let x = origin.x - 1; x <= origin.x + 6; x += 1) for (let y = origin.y - 1; y <= origin.y + 6; y += 1) for (let z = origin.z - 1; z <= origin.z + 6; z += 1) {
    const cell = point(x, y, z); const state = await stateAt(cell); cells.push({ point: cell, state });
    if (fluid(state)) stats.fluid += 1; if (state === 'minecraft:gravel') stats.gravel += 1; if (forbidden.has(name(state))) stats.protected += 1; if (state === 'minecraft:polished_deepslate') { stats.pds += 1; if (predecessorTargets.has(cellKey(cell))) stats.predecessorPds += 1; } if (state === 'minecraft:air') stats.air += 1;
  }
  const value = { cells, stats, safe: stats.fluid === 0 && stats.gravel === 0 && stats.protected === 0 };
  footprintCache.set(id, value); return value;
};
/* This is inside the accepted Successor-11 6×6 core, one station east of the
 * gravel-adjacent western fringe. It is the first no-hazard connection point. */
const start = point(-193, 42, -472);
const destination = point(-200, 54, -460);
const startFootprint = await footprint(start);
const destinationFootprint = await footprint(destination);
if (!startFootprint.safe) throw new Error(`accepted connector entry is not dry/gravity-safe: ${JSON.stringify(startFootprint.stats)}`);
const queue = [{ point: start, lastVertical: false }];
const records = new Map([[`${key(start)}|0`, { point: start, lastVertical: false, previous: null }]]);
let found = null;
const steps = [[-1, 0, 0], [1, 0, 0], [0, 0, -1], [0, 0, 1], [0, 1, 0], [0, -1, 0]];
while (queue.length > 0) {
  const current = queue.shift();
  if (key(current.point) === key(destination)) { found = records.get(`${key(current.point)}|${current.lastVertical ? 1 : 0}`); break; }
  for (const [dx, dy, dz] of steps) {
    const next = point(current.point.x + dx, current.point.y + dy, current.point.z + dz);
    const vertical = dy !== 0;
    if (!inBounds(next) || (vertical && current.lastVertical)) continue;
    const nextKey = `${key(next)}|${vertical ? 1 : 0}`;
    if (records.has(nextKey)) continue;
    if (!(await footprint(next)).safe) continue;
    const record = { point: next, lastVertical: vertical, previous: `${key(current.point)}|${current.lastVertical ? 1 : 0}` };
    records.set(nextKey, record); queue.push({ point: next, lastVertical: vertical });
  }
}
const route = [];
if (found) for (let record = found; record; record = record.previous ? records.get(record.previous) : null) route.push(record.point);
route.reverse();
const routeCells = new Map();
const routePds = [];
for (const origin of route) for (const { point: cell, state } of (await footprint(origin)).cells) {
  routeCells.set(cellKey(cell), cell);
  if (state === 'minecraft:polished_deepslate') routePds.push({ point: cell, predecessorOwned: predecessorTargets.has(cellKey(cell)) });
}
const stepsByAxis = { x: 0, y: 0, z: 0 };
for (let index = 1; index < route.length; index += 1) { const prior = route[index - 1]; const next = route[index]; if (next.x !== prior.x) stepsByAxis.x += 1; else if (next.y !== prior.y) stepsByAxis.y += 1; else stepsByAxis.z += 1; }
const result = {
  schemaVersion: 1,
  id: 'rail-s3-r10-successor12-high-connector-survey',
  readOnly: true,
  source: snapshot,
  search: { nodeBounds: { min, max }, envelope: '6x6 core plus one-cell all-side clearance', gradeRule: 'no consecutive vertical station moves (maximum 1:1 grade)', start, destination, startFootprint: startFootprint.stats, destinationFootprint: destinationFootprint.stats, exploredStates: records.size },
  status: found ? 'ROUTE_GEOMETRY_FOUND_REQUIRES_OWNERSHIP_SET_OUT' : 'NO_DRY_6X6_GRADE_ROUTE_IN_SEARCH_BOUNDS',
  route: found ? { stationCount: route.length, stations: route, stationCoordinateSetSha256: hashCells(route), stepsByAxis, uniqueEnvelopeCells: routeCells.size, pdsTouches: routePds.length, predecessorOwnedPdsTouches: routePds.filter(({ predecessorOwned }) => predecessorOwned).length, unownedPdsTouches: routePds.filter(({ predecessorOwned }) => !predecessorOwned).length } : null,
};
fs.mkdirSync(path.dirname(absolute(out)), { recursive: true }); fs.writeFileSync(absolute(out), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ status: result.status, search: result.search, route: result.route ? { stationCount: result.route.stationCount, stepsByAxis, uniqueEnvelopeCells: result.route.uniqueEnvelopeCells, pdsTouches: result.route.pdsTouches, predecessorOwnedPdsTouches: result.route.predecessorOwnedPdsTouches, unownedPdsTouches: result.route.unownedPdsTouches } : null }, null, 2));
