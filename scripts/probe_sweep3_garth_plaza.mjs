#!/usr/bin/env node
/** Read-only probe for SWEEP-3 candidate selection.
 *
 * Primary candidate: Ravensgate RG-GARTH-STATUES public-realm plaza
 * (`x=-93..-68, z=-444..-428`, floor y67) — a fully paved civic plaza (mostly
 * stone_bricks) with only six lanterns along the z=-430 north edge. This probe
 * reports, for every interior floor cell: current state, material, support
 * below, headroom above, and whether a flush sea_lantern floor inlay would be
 * clean (exact solid paved floor, solid non-fluid base, two clear air above,
 * no fluid/container/hazard in the 3x3x3 halo).
 *
 * Secondary candidates probed at low detail:
 *   - Approach Road zebra-crossing surface cells at the two stone-brick stair
 *     crossing columns (x=-281..-279, z=-500 and z=-494).
 *
 * READ-ONLY: emits a JSON report only. It never writes ops, never contacts
 * RCON, and never mutates the world.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  hashCells,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r08am-post-20260822T161818Z');
const OUT = value('--out', 'data/world-review/sweep3-probe-20260825/sweep3-probe.json');

const reader = new AnvilReader(path.resolve(ROOT, path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(path.resolve(ROOT, path.join(SNAPSHOT, 'entities')));
const cache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return cache.get(key);
};
const blockName = (state) => state.split('[', 1)[0];
const isAir = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(blockName(state));
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const HAZARD_BLOCKS = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:furnace',
  'minecraft:blast_furnace', 'minecraft:smoker', 'minecraft:hopper', 'minecraft:dispenser',
  'minecraft:dropper', 'minecraft:shulker_box', 'minecraft:spawner', 'minecraft:lectern',
  'minecraft:brewing_stand', 'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive',
  'minecraft:bee_nest', 'minecraft:decorated_pot', 'minecraft:command_block',
  'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block',
  'minecraft:crafting_table', 'minecraft:smithing_table', 'minecraft:stonecutter',
  'minecraft:enchanting_table', 'minecraft:composter', 'minecraft:campfire', 'minecraft:soul_campfire',
  'minecraft:sign', 'minecraft:hanging_sign', 'minecraft:item_frame', 'minecraft:glow_item_frame',
  'minecraft:lantern', 'minecraft:soul_lantern', 'minecraft:sea_lantern', 'minecraft:conduit',
  'minecraft:torch', 'minecraft:wall_torch',
]);
const isHazard = (state) => HAZARD_BLOCKS.has(blockName(state)) || blockName(state).endsWith('_shulker_box');
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
  'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil',
  'minecraft:dragon_egg', 'minecraft:pointed_dripstone', 'minecraft:scaffolding',
]);
const isGravity = (state) => GRAVITY.has(blockName(state)) || blockName(state).endsWith('_concrete_powder');
const LIGHT_BLOCKS = new Set([
  'minecraft:lantern', 'minecraft:soul_lantern', 'minecraft:sea_lantern',
  'minecraft:torch', 'minecraft:wall_torch', 'minecraft:glowstone',
  'minecraft:shroomlight', 'minecraft:conduit',
]);

const GARTH = { minX: -93, maxX: -68, minZ: -444, maxZ: -428 };
const FLOOR_Y = 67;

// --- Garth plaza floor census + per-cell cleanliness ----------------------
const floorCells = [];
for (let x = GARTH.minX; x <= GARTH.maxX; x += 1) {
  for (let z = GARTH.minZ; z <= GARTH.maxZ; z += 1) {
    const atY = await sourceAt({ x, y: FLOOR_Y, z });
    const above = await sourceAt({ x, y: FLOOR_Y + 1, z });
    if (!isAir(atY) && isAir(above) && !isFluid(atY) && !isHazard(atY)) {
      floorCells.push({ x, z, material: blockName(atY) });
    }
  }
}
const floorKey = new Set(floorCells.map((c) => `${c.x},${c.z}`));
const interior = floorCells.filter((c) => (
  floorKey.has(`${c.x + 1},${c.z}`) && floorKey.has(`${c.x - 1},${c.z}`)
  && floorKey.has(`${c.x},${c.z + 1}`) && floorKey.has(`${c.x},${c.z - 1}`)
));
const census = {};
for (const c of floorCells) census[c.material] = (census[c.material] ?? 0) + 1;

// Light census over the plaza + halo band.
let existingLightCount = 0;
const existingLightCells = [];
for (let x = GARTH.minX - 2; x <= GARTH.maxX + 2; x += 1) {
  for (let z = GARTH.minZ - 2; z <= GARTH.maxZ + 2; z += 1) {
    for (let y = 60; y <= 80; y += 1) {
      const st = await sourceAt({ x, y, z });
      if (LIGHT_BLOCKS.has(blockName(st))) {
        existingLightCount += 1;
        existingLightCells.push({ x, y, z, state: st });
      }
    }
  }
}

// --- Per-interior-floor-cell inlay cleanliness -----------------------------
const PAVED = new Set(['minecraft:stone_bricks', 'minecraft:smooth_stone', 'minecraft:polished_diorite', 'minecraft:deepslate_tiles']);
const cleanCandidates = [];
for (const cell of interior) {
  if (!PAVED.has(cell.material)) continue;
  const below = await sourceAt({ x: cell.x, y: FLOOR_Y - 1, z: cell.z });
  const h1 = await sourceAt({ x: cell.x, y: FLOOR_Y + 1, z: cell.z });
  const h2 = await sourceAt({ x: cell.x, y: FLOOR_Y + 2, z: cell.z });
  if (isFluid(below) || isAir(below) || isHazard(below) || isGravity(below)) continue;
  if (!isAir(h1) || !isAir(h2)) continue;
  cleanCandidates.push({ x: cell.x, z: cell.z, material: cell.material, below, h1, h2 });
}
const cleanKeys = new Set(cleanCandidates.map((c) => `${c.x},${c.z}`));

// 3x3x3 halo cleanliness for each clean candidate (excluding target itself).
const cleanHalo = [];
for (const cell of cleanCandidates) {
  const halo = [];
  let fluid = 0;
  let hazard = 0;
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        if (dx === 0 && dy === 0 && dz === 0) continue;
        const p = { x: cell.x + dx, y: FLOOR_Y + dy, z: cell.z + dz };
        const st = await sourceAt(p);
        halo.push(`${p.x},${p.y},${p.z}`);
        if (isFluid(st)) fluid += 1;
        if (isHazard(st)) hazard += 1;
      }
    }
  }
  cleanHalo.push({ ...cell, haloFluidCount: fluid, haloHazardCount: hazard, clean: fluid === 0 && hazard === 0, halo });
}
const fullyClean = cleanHalo.filter((c) => c.clean);

// Greedy Chebyshev >= 3 selection on the fully-clean paved interior cells.
const sorted = fullyClean.slice().sort((a, b) => a.x - b.x || a.z - b.z);
const selected = [];
for (const cell of sorted) {
  const clear = selected.every((pick) => (
    Math.max(Math.abs(pick.x - cell.x), Math.abs(pick.z - cell.z)) >= 3
  ));
  if (clear) selected.push({ ...cell });
}

// Block-entity / saved-entity clearance over the selected envelope.
const selectedCells = uniqueCells(selected.map((c) => ({ x: c.x, y: FLOOR_Y, z: c.z })));
const envelope = boundsOf(selectedCells);
const blockEntities = [];
const savedEntities = [];
for (let cx = Math.floor(envelope.minX / 16); cx <= Math.floor(envelope.maxX / 16); cx += 1) {
  for (let cz = Math.floor(envelope.minZ / 16); cz <= Math.floor(envelope.maxZ / 16); cz += 1) {
    const chunk = await reader.chunk(cx, cz);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (selectedCells.some((c) => cellKey(c) === cellKey(point))) blockEntities.push({ id: entity.id ?? null, point });
    }
    const entityChunk = await entityReader.chunk(cx, cz);
    for (const entity of entityChunk?.Entities ?? []) {
      const position = entity.Pos?.slice(0, 3).map(Number);
      if (position?.length === 3
        && position[0] >= envelope.minX && position[0] < envelope.maxX + 1
        && position[1] >= envelope.minY && position[1] < envelope.maxY + 1
        && position[2] >= envelope.minZ && position[2] < envelope.maxZ + 1) {
        savedEntities.push({ id: entity.id ?? null, position });
      }
    }
  }
}

// --- Approach Road crossing probe (secondary, low detail) -----------------
const crossing = {};
for (const z of [-500, -494]) {
  const cells = [];
  for (let x = -283; x <= -277; x += 1) {
    for (let y = 71; y <= 73; y += 1) {
      const st = await sourceAt({ x, y, z });
      cells.push({ x, y, z, state: st, material: blockName(st), fluid: isFluid(st), hazard: isHazard(st) });
    }
  }
  crossing[`z=${z}`] = cells;
}

const report = {
  schemaVersion: 1,
  id: 'sweep3-probe',
  generatedAtUtc: new Date().toISOString(),
  mode: 'READ_ONLY',
  worldMutationPerformed: false,
  rconCallsPerformed: false,
  source: { snapshotRoot: SNAPSHOT, reader: 'AnvilReader' },
  scopeIds: ['RAVENSGATE', 'TE-REGIONAL-APPROACH-ROAD'],
  garth: {
    bounds: GARTH,
    floorY: FLOOR_Y,
    floorCellCount: floorCells.length,
    interiorFloorCellCount: interior.length,
    census,
    existingLightCount,
    existingLightCells,
    cleanCandidateCount: cleanCandidates.length,
    fullyCleanHaloCount: fullyClean.length,
    greedySelectionCount: selected.length,
    selectedCells: selected.map(({ x, z, material }) => ({ x, z, material })),
    selectedCoordinateSetSha256: hashCells(selectedCells),
    blockEntityIntersectionCount: blockEntities.length,
    savedEntityIntersectionCount: savedEntities.length,
    blockEntities,
    savedEntities,
  },
  approachRoadCrossing: crossing,
};
fs.mkdirSync(path.dirname(path.resolve(ROOT, OUT)), { recursive: true });
fs.writeFileSync(path.resolve(ROOT, OUT), `${JSON.stringify(report, null, 2)}\n`);
const identity = crypto.createHash('sha256').update(JSON.stringify(report)).digest('hex');
process.stdout.write(`${JSON.stringify({
  status: 'READ_ONLY_PROBE',
  report: OUT,
  probeIdentity: identity,
  garthFloorCells: floorCells.length,
  garthInterior: interior.length,
  existingLightCount,
  cleanCandidates: cleanCandidates.length,
  fullyCleanHalo: fullyClean.length,
  greedySelection: selected.length,
  crossing: Object.fromEntries(Object.entries(crossing).map(([k, v]) => [k, v.length])),
}, null, 2)}\n`);
