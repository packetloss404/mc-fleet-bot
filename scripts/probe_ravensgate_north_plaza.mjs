#!/usr/bin/env node
/** Read-only detailed probe — North plaza floor layout for a flush lighting
 *  cadence. Maps every floor cell at y=67, computes the paved interior set,
 *  verifies headroom/support, and scans for hazards in the 3x3x3 halo.
 *  READ-ONLY. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  cellKey,
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
const OUT = value('--out', 'data/world-review/ravensgate-next-probe-20260825/ravensgate-north-plaza-floor.json');

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
const isNonColliding = (state) => (
  isAir(state)
  || ['minecraft:short_grass', 'minecraft:tall_grass', 'minecraft:poppy',
    'minecraft:dandelion', 'minecraft:azure_bluet', 'minecraft:cornflower',
    'minecraft:bush', 'minecraft:fern', 'minecraft:large_fern', 'minecraft:torch',
    'minecraft:wall_torch', 'minecraft:redstone_torch', 'minecraft:sea_pickle',
    'minecraft:kelp', 'minecraft:seagrass', 'minecraft:sugar_cane', 'minecraft:cobweb',
    'minecraft:red_carpet', 'minecraft:blue_carpet', 'minecraft:yellow_carpet',
    'minecraft:white_carpet', 'minecraft:snow'].includes(blockName(state))
);
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

const PLAZA = { minX: -130, maxX: -96, minZ: -455, maxZ: -448 };
const FLOOR_Y = 67;

const floorCells = [];
for (let x = PLAZA.minX; x <= PLAZA.maxX; x += 1) {
  for (let z = PLAZA.minZ; z <= PLAZA.maxZ; z += 1) {
    const atY = await sourceAt({ x, y: FLOOR_Y, z });
    const above = await sourceAt({ x, y: FLOOR_Y + 1, z });
    if (!isAir(atY) && isAir(above) && !isFluid(atY) && !isHazard(atY)) {
      floorCells.push({ x, z, material: blockName(atY) });
    }
  }
}
const floorKey = new Set(floorCells.map((cell) => `${cell.x},${cell.z}`));
const interior = floorCells.filter((cell) => (
  floorKey.has(`${cell.x + 1},${cell.z}`)
  && floorKey.has(`${cell.x - 1},${cell.z}`)
  && floorKey.has(`${cell.x},${cell.z + 1}`)
  && floorKey.has(`${cell.x},${cell.z - 1}`)
));

const paved = interior.filter((cell) => (
  ['minecraft:stone_bricks', 'minecraft:smooth_stone', 'minecraft:deepslate_tiles',
    'minecraft:polished_diorite', 'minecraft:polished_andesite', 'minecraft:cobblestone'].includes(cell.material)
));

// Verify each candidate cadence cell: exact source, solid non-fluid below, two-clear headroom.
const verified = [];
for (const cell of paved) {
  const sourceState = await sourceAt({ x: cell.x, y: FLOOR_Y, z: cell.z });
  const below = await sourceAt({ x: cell.x, y: FLOOR_Y - 1, z: cell.z });
  const h1 = await sourceAt({ x: cell.x, y: FLOOR_Y + 1, z: cell.z });
  const h2 = await sourceAt({ x: cell.x, y: FLOOR_Y + 2, z: cell.z });
  const supportOk = !isAir(below) && !isFluid(below) && !isHazard(below);
  const headroomOk = isNonColliding(h1) && isNonColliding(h2);
  if (supportOk && headroomOk) {
    verified.push({ x: cell.x, z: cell.z, material: cell.material, below, h1, h2 });
  }
}

// Greedy Chebyshev spacing >= 3 from sorted interior set.
const sorted = verified.slice().sort((a, b) => a.x - b.x || a.z - b.z);
const selected = [];
for (const cell of sorted) {
  const clear = selected.every((pick) => (
    Math.max(Math.abs(pick.x - cell.x), Math.abs(pick.z - cell.z)) >= 3
  ));
  if (clear) selected.push({ ...cell });
}

// Halo scan over the selected cells.
const operatedKeys = new Set(selected.map((cell) => `${cell.x},${FLOOR_Y},${cell.z}`));
const halo = uniqueCells(selected.flatMap((cell) => {
  const cells = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) cells.push({ x: cell.x + dx, y: FLOOR_Y + dy, z: cell.z + dz });
    }
  }
  return cells;
})).filter((cell) => !operatedKeys.has(cellKey(cell)));
let haloFluid = 0;
let haloHazard = 0;
for (const cell of halo) {
  const st = await sourceAt(cell);
  if (isFluid(st)) haloFluid += 1;
  if (isHazard(st)) haloHazard += 1;
}

// Block entity + saved entity census across the plaza envelope.
const envelope = { minX: PLAZA.minX - 2, maxX: PLAZA.maxX + 2, minY: FLOOR_Y - 2, maxY: FLOOR_Y + 2, minZ: PLAZA.minZ - 2, maxZ: PLAZA.maxZ + 2 };
const blockEntities = [];
const savedEntities = [];
for (let cx = Math.floor(envelope.minX / 16); cx <= Math.floor(envelope.maxX / 16); cx += 1) {
  for (let cz = Math.floor(envelope.minZ / 16); cz <= Math.floor(envelope.maxZ / 16); cz += 1) {
    const chunk = await reader.chunk(cx, cz);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const p = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (p.x >= envelope.minX && p.x <= envelope.maxX && p.y >= envelope.minY && p.y <= envelope.maxY
        && p.z >= envelope.minZ && p.z <= envelope.maxZ) blockEntities.push({ id: entity.id ?? null, ...p });
    }
    const entityChunk = await entityReader.chunk(cx, cz);
    for (const entity of entityChunk?.Entities ?? []) {
      const position = entity.Pos?.slice(0, 3).map(Number);
      if (position?.length === 3 && position[0] >= envelope.minX && position[0] < envelope.maxX + 1
        && position[1] >= envelope.minY && position[1] < envelope.maxY + 1
        && position[2] >= envelope.minZ && position[2] < envelope.maxZ + 1) {
        savedEntities.push({ id: entity.id ?? null, position });
      }
    }
  }
}

const report = {
  schemaVersion: 1,
  id: 'ravensgate-north-plaza-floor',
  generatedAtUtc: new Date().toISOString(),
  mode: 'READ_ONLY',
  worldMutationPerformed: false,
  rconCallsPerformed: false,
  source: { snapshotRoot: SNAPSHOT, reader: 'AnvilReader' },
  scopeIds: ['RAVENSGATE'],
  plaza: PLAZA,
  floorY: FLOOR_Y,
  floorCellCount: floorCells.length,
  interiorFloorCellCount: interior.length,
  pavedInteriorCellCount: paved.length,
  verifiedCadenceCandidateCount: verified.length,
  selectedCadenceCellCount: selected.length,
  selectedCadenceCells: selected.map(({ x, z, material }) => ({ x, z, material })),
  halo: { cellCount: halo.length, fluid: haloFluid, hazard: haloHazard },
  blockEntityCountInEnvelope: blockEntities.length,
  savedEntityCountInEnvelope: savedEntities.length,
  blockEntities,
  savedEntities,
  floorLayout: { rows: [] },
};
for (let z = PLAZA.maxZ; z >= PLAZA.minZ; z -= 1) {
  const row = { z, cells: [] };
  for (let x = PLAZA.minX; x <= PLAZA.maxX; x += 1) {
    const cell = floorCells.find((c) => c.x === x && c.z === z);
    const pick = selected.find((c) => c.x === x && c.z === z);
    row.cells.push({ x, material: cell ? cell.material.replace('minecraft:', '') : '.', selected: !!pick });
  }
  report.floorLayout.rows.push(row);
}

fs.mkdirSync(path.dirname(path.resolve(ROOT, OUT)), { recursive: true });
fs.writeFileSync(path.resolve(ROOT, OUT), `${JSON.stringify(report, null, 2)}\n`);
const identity = crypto.createHash('sha256').update(JSON.stringify(report)).digest('hex');
process.stdout.write(`${JSON.stringify({
  status: 'READ_ONLY_PROBE',
  report: OUT,
  probeIdentity: identity,
  floorCellCount: floorCells.length,
  interiorFloorCellCount: interior.length,
  pavedInteriorCellCount: paved.length,
  verifiedCadenceCandidateCount: verified.length,
  selectedCadenceCellCount: selected.length,
  selectedCadenceCells: selected.map(({ x, z, material }) => ({ x, z, material })),
  halo: { fluid: haloFluid, hazard: haloHazard },
  blockEntityCountInEnvelope: blockEntities.length,
  savedEntityCountInEnvelope: savedEntities.length,
}, null, 2)}\n`);
