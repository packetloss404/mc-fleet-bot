#!/usr/bin/env node
/** READ-ONLY focused probe: second public street-to-platform route for the
 *  Ravensreach (PR-W04) station box.
 *
 *  Confirms the exact dry vertical shaft site(s) on the RR-SC-1 east plateau,
 *  the horizontal dry connector from the corridor head / platform box east edge
 *  to that site, the surface entry condition, and walkability-relevant geometry.
 *  No world edit, no RCON.
 */
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  cellKey,
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
const OUT_DIR = value('--out-dir', 'data/world-review/cobalt-s1-second-route-survey-20260825');
const OUT = value('--out', path.join(OUT_DIR, 'cobalt-s1-second-route-detail.json'));

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

// Restricted / protected bounds (must not intersect)
const APPROACH_ROAD = { minX: -999, maxX: -80, minY: -64, maxY: 110, minZ: -490, maxZ: -480 };
const RRCH_LIBRARY = { minX: -144, maxX: -111, minY: -64, maxY: 110, minZ: -448, maxZ: -426 };
const RRCH_CIVIC = [
  { minX: -100, maxX: -70, minY: -64, maxY: 110, minZ: -392, maxZ: -341 },
  { minX: -95, maxX: -75, minY: -64, maxY: 110, minZ: -420, maxZ: -408 },
  { minX: -110, maxX: -94, minY: -64, maxY: 110, minZ: -447, maxZ: -432 },
];
const RAVENSGATE_EXCLUSION = { minX: -148, maxX: -64, minY: -64, maxY: 35, minZ: -562, maxZ: -420 };
const inBounds = (b, x, y, z) => x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY && z >= b.minZ && z <= b.maxZ;
const overlapsRestricted = (cell) => RRCH_CIVIC.some((b) => inBounds(b, cell.x, cell.y, cell.z))
  || inBounds(RRCH_LIBRARY, cell.x, cell.y, cell.z)
  || inBounds(APPROACH_ROAD, cell.x, cell.y, cell.z)
  || inBounds(RAVENSGATE_EXCLUSION, cell.x, cell.y, cell.z);

// ---- 1. RR-SC-1 east edge surface detail (x=-156..-148, z=-394..-385) ----
const SURFACE_BOX = { minX: -156, maxX: -148, minY: 60, maxY: 66, minZ: -394, maxZ: -385 };
const surfaceRows = [];
for (let x = SURFACE_BOX.minX; x <= SURFACE_BOX.maxX; x += 1) {
  for (let z = SURFACE_BOX.minZ; z <= SURFACE_BOX.maxZ; z += 1) {
    let top = null;
    let topY = null;
    for (let y = 60; y <= 68; y += 1) {
      const state = await stateAt(x, y, z);
      if (!isAir(state)) { top = state; topY = y; break; }
    }
    surfaceRows.push({ x, z, topY, top });
  }
}
const surfaceCensus = Object.fromEntries([...surfaceRows.reduce((counts, r) => {
  counts.set(r.top ?? 'void', (counts.get(r.top ?? 'void') ?? 0) + 1);
  return counts;
}, new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
console.log(`=== RR-SC-1 east edge surface (x=-156..-148, z=-394..-385) ===`);
console.log(JSON.stringify(surfaceCensus));

// ---- 2. East-edge column dryness at y18..62 ----
console.log(`\n=== Column dryness x=-156..-148, z=-394..-385 (y18..62) ===`);
const dry = [];
for (let x = -156; x <= -148; x += 1) {
  for (let z = -394; z <= -385; z += 1) {
    let fluid = 0; let gravity = 0; let forbidden = 0; let airCount = 0;
    for (let y = 18; y <= 62; y += 1) {
      const state = await stateAt(x, y, z);
      if (isFluid(state)) fluid += 1;
      if (isGravity(state)) gravity += 1;
      if (isForbidden(state)) forbidden += 1;
      if (isAir(state)) airCount += 1;
    }
    if (fluid === 0 && gravity === 0 && forbidden === 0) dry.push({ x, z, airCount });
  }
}
console.log(`dry columns (y18..62, zero fluid/gravity/forbidden): ${dry.length}`);
console.log(dry.map((d) => `(${d.x},${d.z}) air=${d.airCount}`).join(' '));

// ---- 3. Horizontal connector from platform box east edge (x=-156) to shaft ----
// Corridor head ends at x=-156 (z=-392..-387, y18..23). Confirm dry rock exists
// immediately east of the RR-SE-1 sleeve for a horizontal stub to the shaft.
const CONNECTOR_BOX = { minX: -162, maxX: -146, minY: 18, maxY: 23, minZ: -392, maxZ: -385 };
const connectorRecords = [];
for (const cell of cellsIn(CONNECTOR_BOX)) {
  const state = await stateAt(cell.x, cell.y, cell.z);
  connectorRecords.push({ cell, state });
}
const cFluid = connectorRecords.filter((r) => isFluid(r.state));
const cForbidden = connectorRecords.filter((r) => isForbidden(r.state));
const cGravity = connectorRecords.filter((r) => isGravity(r.state));
const cAir = connectorRecords.filter((r) => isAir(r.state));
console.log(`\n=== Connector band x=-162..-146, y18..23, z=-392..-385 ===`);
console.log(`cells: ${connectorRecords.length}, fluid: ${cFluid.length}, gravity: ${cGravity.length}, forbidden: ${cForbidden.length}, air: ${cAir.length}`);
console.log('fluid cells:', cFluid.map((r) => `${r.cell.x},${r.cell.y},${r.cell.z}`).join(' ') || 'none');
console.log('forbidden cells:', cForbidden.map((r) => `${r.cell.x},${r.cell.y},${r.cell.z}=${r.state}`).join(' ') || 'none');

// ---- 4. The RR-SC-2 meadow "polished_diorite feature" ----
console.log(`\n=== RR-SC-2 south meadow structure census (x=-166..-154, y60..75, z=-410..-398) ===`);
const SC2_BOX = { minX: -166, maxX: -154, minY: 60, maxY: 75, minZ: -410, maxZ: -398 };
const sc2Records = [];
for (const cell of cellsIn(SC2_BOX)) {
  const state = await stateAt(cell.x, cell.y, cell.z);
  if (!isAir(state)) sc2Records.push({ cell, state });
}
const sc2Census = Object.fromEntries([...sc2Records.reduce((counts, { state }) => {
  counts.set(state, (counts.get(state) ?? 0) + 1);
  return counts;
}, new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
console.log(JSON.stringify(sc2Census));
console.log('non-air cells:', sc2Records.length);
// which x/z are the structure?
const sc2Columns = new Map();
for (const { cell } of sc2Records) {
  const key = `${cell.x},${cell.z}`;
  sc2Columns.set(key, (sc2Columns.get(key) ?? 0) + 1);
}
const sc2StructCols = [...sc2Columns.entries()].filter(([, n]) => n > 3).map(([k]) => k).join(' ');
console.log('columns with >3 non-air cells (the structure):', sc2StructCols);

// ---- 5. Walkability-relevant: RR-SE-1 sleeve + second route separation ----
// Distance from RR-SE-1 clear column to nearest dry second-route column.
const secondRouteDryCandidates = dry.filter((d) => !(d.x >= -160 && d.x <= -156 && d.z >= -392 && d.z <= -388));
console.log(`\n=== Second-route dry columns OUTSIDE the RR-SE-1 sleeve box ===`);
console.log(secondRouteDryCandidates.map((d) => `(${d.x},${d.z})`).join(' '));

// ---- 6. Restricted-overlap check for the chosen second-route shaft cell set ----
// Chosen site: the eastern cluster x=-154..-150, z=-391..-387 (clear of sleeve,
// outside all restricted bounds, grass surface y62).
const SHAFT = { minX: -154, maxX: -150, minY: 18, maxY: 62, minZ: -391, maxZ: -387 };
const shaftCells = cellsIn(SHAFT);
const overlaps = shaftCells.filter(overlapsRestricted);
const shaftFluid = [];
const shaftForbidden = [];
const shaftGravity = [];
for (const cell of shaftCells) {
  const state = await stateAt(cell.x, cell.y, cell.z);
  if (isFluid(state)) shaftFluid.push({ ...cell, state });
  if (isForbidden(state)) shaftForbidden.push({ ...cell, state });
  if (isGravity(state)) shaftGravity.push({ ...cell, state });
}
console.log(`\n=== Chosen second-route shaft cell set x=-154..-150, y18..62, z=-391..-387 ===`);
console.log(`cells: ${shaftCells.length}, restricted overlap: ${overlaps.length}`);
console.log(`fluid: ${shaftFluid.length}, forbidden: ${shaftForbidden.length}, gravity: ${shaftGravity.length}`);
console.log('fluid cells:', shaftFluid.map((c) => `${c.x},${c.y},${c.z}`).join(' ') || 'none');
console.log('forbidden cells:', shaftForbidden.map((c) => `${c.x},${c.y},${c.z}=${c.state}`).join(' ') || 'none');

const payload = {
  schemaVersion: 1,
  id: 'cobalt-s1-second-route-detail',
  status: 'SURVEY_COMPLETE_READONLY',
  generatedAtUtc: new Date().toISOString(),
  snapshot: relative(SNAPSHOT),
  surfaceEastEdgeCensus: surfaceCensus,
  eastEdgeDryColumns: dry,
  connectorBand: {
    bounds: CONNECTOR_BOX,
    cellCount: connectorRecords.length,
    fluid: cFluid.length,
    gravity: cGravity.length,
    forbidden: cForbidden.length,
    air: cAir.length,
  },
  secondRouteDryCandidatesOutsideSleeve: secondRouteDryCandidates,
  sc2MeadowStructureCensus: sc2Census,
  sc2MeadowStructureColumns: sc2StructCols,
  chosenShaft: {
    bounds: SHAFT,
    cellCount: shaftCells.length,
    restrictedOverlap: overlaps.length,
    fluid: shaftFluid.length,
    forbidden: shaftForbidden.length,
    gravity: shaftGravity.length,
  },
};
const payloadSha256 = sha256(Buffer.from(`${JSON.stringify(payload, null, 2)}\n`));
const report = { ...payload, payloadSha256 };
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
console.log(`\nWrote ${relative(OUT)}`);
console.log(`payloadSha256: ${payloadSha256}`);
console.log('DONE');
