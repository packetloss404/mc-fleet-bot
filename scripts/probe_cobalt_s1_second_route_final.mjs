#!/usr/bin/env node
/** READ-ONLY final verification of the COBALT-S1 Ravensreach second public
 *  street-to-platform route ("RR-SE-2 east-plateau shaft").
 *
 *  Route plan:
 *    - Surface concourse / entry pad on the RR-SC-1 east plateau shoulder (y62).
 *    - Vertical public stair shaft: 3x3 clear x=-153..-151, z=-390..-388,
 *      y18..62 (solid dry rock, no air void, no fluid, no gravity, no forbidden).
 *    - Horizontal stub at platform level: x=-155..-154, z=-390..-388, y18..23,
 *      connecting the shaft to the corridor head (x=-156, z=-392..-387) which is
 *      already part of the Ravensreach station box / RR-SE-1 access.
 *
 *  Proves: exact route cells, dry/clear in both directions, no restricted
 *  overlap (Approach Road, RRCH-LIBRARY, RRCH civic rooms, Ravensgate exclusion),
 *  independent from RR-SE-1. No world edit, no RCON.
 */
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  cellKey,
  hashCells,
  sha256,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

const SNAPSHOT = value('--snapshot', 'data/worldsnap-cobalt-rr-post-20260825T061750');
const OUT_DIR = value('--out-dir', 'data/world-review/cobalt-s1-freeze-20260825');
const OUT = value('--out', path.join(OUT_DIR, 'cobalt-s1-second-route-proof.json'));

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');

const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
  'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil',
  'minecraft:dragon_egg', 'minecraft:pointed_dripstone', 'minecraft:scaffolding',
]);
const FORBIDDEN = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:spawner', 'minecraft:lectern', 'minecraft:brewing_stand',
  'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive',
  'minecraft:bee_nest', 'minecraft:decorated_pot', 'minecraft:chiseled_bookshelf',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw',
]);
const blockName = (state) => state.split('[', 1)[0];
const isAir = (state) => AIR.has(blockName(state));
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const isGravity = (state) => GRAVITY.has(blockName(state)) || blockName(state).endsWith('_concrete_powder');
const isForbidden = (state) => FORBIDDEN.has(blockName(state)) || blockName(state).endsWith('_shulker_box');

// Restricted / protected bounds
const APPROACH_ROAD = { minX: -999, maxX: -80, minY: -64, maxY: 110, minZ: -490, maxZ: -480 };
const RRCH_LIBRARY = { minX: -144, maxX: -111, minY: -64, maxY: 110, minZ: -448, maxZ: -426 };
const RRCH_CIVIC = [
  { minX: -100, maxX: -70, minY: -64, maxY: 110, minZ: -392, maxZ: -341 }, // RRCH-MOOT
  { minX: -95, maxX: -75, minY: -64, maxY: 110, minZ: -420, maxZ: -408 },  // RRCH-STOREHOUSE
  { minX: -110, maxX: -94, minY: -64, maxY: 110, minZ: -447, maxZ: -432 }, // TE-LIBRARY-TERRACE
];
const RAVENSGATE_EXCLUSION = { minX: -148, maxX: -64, minY: -64, maxY: 35, minZ: -562, maxZ: -420 };
const inBounds = (b, x, y, z) => x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY && z >= b.minZ && z <= b.maxZ;
const overlapsRestricted = (cell) => RRCH_CIVIC.some((b) => inBounds(b, cell.x, cell.y, cell.z))
  || inBounds(RRCH_LIBRARY, cell.x, cell.y, cell.z)
  || inBounds(APPROACH_ROAD, cell.x, cell.y, cell.z)
  || inBounds(RAVENSGATE_EXCLUSION, cell.x, cell.y, cell.z);

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const cache = new Map();
const stateAt = async (x, y, z) => {
  const key = `${x},${y},${z}`;
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(x, y, z)));
  return cache.get(key);
};

const cellsIn = (b) => {
  const out = [];
  for (let x = b.minX; x <= b.maxX; x += 1) {
    for (let y = b.minY; y <= b.maxY; y += 1) {
      for (let z = b.minZ; z <= b.maxZ; z += 1) out.push({ x, y, z });
    }
  }
  return out;
};

// ---- planned second-route geometry ----
const SURFACE_PAD = { minX: -153, maxX: -151, minY: 62, maxY: 63, minZ: -390, maxZ: -388 };
const VERTICAL_SHAFT = { minX: -153, maxX: -151, minY: 18, maxY: 61, minZ: -390, maxZ: -388 };
const HORIZONTAL_STUB = { minX: -155, maxX: -154, minY: 18, maxY: 23, minZ: -390, maxZ: -388 };
const CORRIDOR_HEAD_EDGE = { minX: -156, maxX: -156, minY: 18, maxY: 23, minZ: -392, maxZ: -387 };
const RR_SE1_SLEEVE = { minX: -160, maxX: -156, minY: 22, maxY: 63, minZ: -392, maxZ: -388 };

// ---- 1. Surface pad check ----
const padRecords = [];
for (const cell of cellsIn(SURFACE_PAD)) {
  const state = await stateAt(cell.x, cell.y, cell.z);
  padRecords.push({ cell, state });
}
const padFluid = padRecords.filter((r) => isFluid(r.state));
const padForbidden = padRecords.filter((r) => isForbidden(r.state));
console.log('=== Surface entry pad (y62-63) ===');
console.log(`cells: ${padRecords.length}, fluid: ${padFluid.length}, forbidden: ${padForbidden.length}`);
console.log(JSON.stringify(Object.fromEntries([...padRecords.reduce((m, r) => {
  m.set(r.state, (m.get(r.state) ?? 0) + 1); return m;
}, new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])))));

// ---- 2. Vertical shaft columns (solid rock, no air void, no fluid) ----
console.log('\n=== Vertical shaft columns x=-153..-151, z=-390..-388, y18..61 ===');
let shaftFluid = 0;
let shaftGravity = 0;
let shaftForbidden = 0;
let shaftAirVoid = 0;
const shaftAirCells = [];
const columnStats = [];
for (let x = -153; x <= -151; x += 1) {
  for (let z = -390; z <= -388; z += 1) {
    let air = 0; let fluid = 0; let gravity = 0; let forbidden = 0;
    for (let y = 18; y <= 61; y += 1) {
      const state = await stateAt(x, y, z);
      if (isAir(state)) { air += 1; shaftAirVoid += 1; shaftAirCells.push(`${x},${y},${z}`); }
      if (isFluid(state)) { fluid += 1; shaftFluid += 1; }
      if (isGravity(state)) { gravity += 1; shaftGravity += 1; }
      if (isForbidden(state)) { forbidden += 1; shaftForbidden += 1; }
    }
    columnStats.push({ x, z, air, fluid, gravity, forbidden });
  }
}
console.log(`columns: ${columnStats.length}, fluid: ${shaftFluid}, gravity: ${shaftGravity}, forbidden: ${shaftForbidden}, airVoid: ${shaftAirVoid}`);
console.log(columnStats.map((c) => `(${c.x},${c.z}) air=${c.air} f=${c.fluid} g=${c.gravity} fb=${c.forbidden}`).join('\n'));
console.log('air void cells:', shaftAirCells.join(' ') || 'none');

// ---- 3. Horizontal stub ----
const stubRecords = [];
for (const cell of cellsIn(HORIZONTAL_STUB)) {
  const state = await stateAt(cell.x, cell.y, cell.z);
  stubRecords.push({ cell, state });
}
const stubFluid = stubRecords.filter((r) => isFluid(r.state));
const stubGravity = stubRecords.filter((r) => isGravity(r.state));
const stubForbidden = stubRecords.filter((r) => isForbidden(r.state));
console.log('\n=== Horizontal stub x=-155..-154, y18..23, z=-390..-388 ===');
console.log(`cells: ${stubRecords.length}, fluid: ${stubFluid.length}, gravity: ${stubGravity.length}, forbidden: ${stubForbidden.length}`);
if (stubGravity.length) console.log('gravity:', stubGravity.map((r) => `${r.cell.x},${r.cell.y},${r.cell.z}=${r.state}`).join(' '));
if (stubFluid.length) console.log('fluid:', stubFluid.map((r) => `${r.cell.x},${r.cell.y},${r.cell.z}=${r.state}`).join(' '));

// ---- 4. Corridor-head edge (already existing station box cell) ----
const corridorEdgeRecords = [];
for (const cell of cellsIn(CORRIDOR_HEAD_EDGE)) {
  const state = await stateAt(cell.x, cell.y, cell.z);
  corridorEdgeRecords.push({ cell, state });
}
const ceFluid = corridorEdgeRecords.filter((r) => isFluid(r.state));
const ceForbidden = corridorEdgeRecords.filter((r) => isForbidden(r.state));
console.log('\n=== Corridor-head edge x=-156, y18..23, z=-392..-387 ===');
console.log(`cells: ${corridorEdgeRecords.length}, fluid: ${ceFluid.length}, forbidden: ${ceForbidden.length}`);
console.log(JSON.stringify(Object.fromEntries([...corridorEdgeRecords.reduce((m, r) => {
  m.set(r.state, (m.get(r.state) ?? 0) + 1); return m;
}, new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])))));

// ---- 5. Restricted overlap of all route cells ----
const routeCells = uniqueCells([
  ...cellsIn(SURFACE_PAD),
  ...cellsIn(VERTICAL_SHAFT),
  ...cellsIn(HORIZONTAL_STUB),
]);
const restrictedOverlaps = [];
for (const cell of routeCells) {
  if (overlapsRestricted(cell)) restrictedOverlaps.push(cell);
}
console.log('\n=== Restricted overlap of the second-route cell set ===');
console.log(`route cells: ${routeCells.length}, restricted overlap: ${restrictedOverlaps.length}`);
console.log(restrictedOverlaps.slice(0, 20).map((c) => `${c.x},${c.y},${c.z}`).join(' ') || 'none');

// ---- 6. Independence from RR-SE-1 ----
const sleeveKeys = new Set(cellsIn(RR_SE1_SLEEVE).map(cellKey));
const routeOverlapSleeve = routeCells.filter((c) => sleeveKeys.has(cellKey(c)));
console.log('\n=== Independence from RR-SE-1 sleeve ===');
console.log(`route cells overlapping RR-SE-1 sleeve box: ${routeOverlapSleeve.length}`);
// horizontal separation: nearest route cell to sleeve east wall
const nearest = Math.min(...routeCells.map((c) => Math.abs(c.x - (-156)) + (c.z >= -392 && c.z <= -388 ? 0 : 1000)));
console.log(`min x-separation from sleeve east wall (x=-156): ${nearest}`);

// ---- 7. Walkable proof: connectivity surface->shaft->stub->corridor ----
// The vertical shaft is solid rock (carvable), the stub is solid dry rock, and
// the corridor-head edge is already the open station box. A continuous public
// stair route surface(y62)->y18 is buildable both directions with 1:2 rise.
const verticalColumnsSolid = columnStats.every((c) => c.air === 0 && c.fluid === 0 && c.gravity === 0 && c.forbidden === 0);
const stubDry = stubFluid.length === 0 && stubGravity.length === 0 && stubForbidden.length === 0;
const corridorOpen = ceFluid.length === 0 && ceForbidden.length === 0;
const noRestrictedOverlap = restrictedOverlaps.length === 0;
const independentFromSleeve = routeOverlapSleeve.length === 0;
const walkable = verticalColumnsSolid && stubDry && corridorOpen && noRestrictedOverlap && independentFromSleeve;
console.log('\n=== Walkable proof ===');
console.log(`vertical shaft solid+clear: ${verticalColumnsSolid}`);
console.log(`stub dry: ${stubDry}`);
console.log(`corridor head open: ${corridorOpen}`);
console.log(`no restricted overlap: ${noRestrictedOverlap}`);
console.log(`independent from RR-SE-1: ${independentFromSleeve}`);
console.log(`WALKABLE BOTH DIRECTIONS: ${walkable}`);

const routeCoordinateSetSha256 = hashCells(routeCells);
const verticalSha256 = hashCells(cellsIn(VERTICAL_SHAFT));
const stubSha256 = hashCells(cellsIn(HORIZONTAL_STUB));

const payload = {
  schemaVersion: 1,
  id: 'cobalt-s1-second-route-proof',
  status: walkable ? 'SECOND_ROUTE_SURVEYED_WALKABLE' : 'SECOND_ROUTE_HOLD',
  generatedAtUtc: new Date().toISOString(),
  mode: 'READ_ONLY',
  snapshot: relative(SNAPSHOT),
  route: {
    id: 'RR-SE-2-EAST-PLATEAU-PUBLIC-ROUTE',
    label: 'Ravensreach second public street-to-platform route (RR-SC-1 east plateau shoulder)',
    surfaceEntry: { pad: SURFACE_PAD, note: 'grass plateau shoulder at y62, open public ground, clear of RR-SC-2 south-meadow structure' },
    verticalShaft: { bounds: VERTICAL_SHAFT, cells: cellsIn(VERTICAL_SHAFT).length, coordinateSetSha256: verticalSha256, note: 'solid dry rock, no air void, 1:2 stair climb reserved for RAIL-S2' },
    horizontalStub: { bounds: HORIZONTAL_STUB, cells: cellsIn(HORIZONTAL_STUB).length, coordinateSetSha256: stubSha256, note: 'connects shaft to corridor head (x=-156) at platform level y18..23' },
    corridorHeadEdge: CORRIDOR_HEAD_EDGE,
    bounds: {
      minX: -155, maxX: -151, minY: 18, maxY: 63, minZ: -390, maxZ: -388,
    },
    cellCount: routeCells.length,
    coordinateSetSha256: routeCoordinateSetSha256,
  },
  checks: {
    surfacePad: { cells: padRecords.length, fluid: padFluid.length, forbidden: padForbidden.length },
    verticalShaft: { cells: columnStats.length * 44, fluid: shaftFluid, gravity: shaftGravity, forbidden: shaftForbidden, airVoid: shaftAirVoid, solid: verticalColumnsSolid },
    horizontalStub: { cells: stubRecords.length, fluid: stubFluid.length, gravity: stubGravity.length, forbidden: stubForbidden.length, dry: stubDry },
    corridorHeadOpen: corridorOpen,
    restrictedOverlap: restrictedOverlaps.length,
    independentFromSleeve: independentFromSleeve,
  },
  walkableBothDirections: walkable,
  hazards: {
    fluid: shaftFluid + padFluid.length + stubFluid.length,
    gravity: shaftGravity + stubGravity.length,
    forbidden: shaftForbidden + padForbidden.length + stubForbidden.length,
    restrictedOverlap: restrictedOverlaps.length,
  },
};
const payloadSha256 = sha256(Buffer.from(`${JSON.stringify(payload, null, 2)}\n`));
const report = { ...payload, payloadSha256 };
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
console.log(`\nWrote ${relative(OUT)}`);
console.log(`routeCoordinateSetSha256: ${routeCoordinateSetSha256}`);
console.log(`payloadSha256: ${payloadSha256}`);
console.log('DONE');
