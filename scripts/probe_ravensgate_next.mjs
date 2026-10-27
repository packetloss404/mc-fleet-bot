#!/usr/bin/env node
/** Read-only probe — survey Ravensgate public-realm surfaces for a clean
 *  buildable item (missing path / lighting cadence / garden element).
 *
 *  READ-ONLY: emits a JSON report only. It never writes ops, never contacts
 *  RCON, and never mutates the world.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  cellKey,
  stateToCommandString,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r08am-post-20260822T161818Z');
const OUT = value('--out', 'data/world-review/ravensgate-next-probe-20260825/ravensgate-next-probe.json');

const reader = new AnvilReader(path.resolve(ROOT, path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(path.resolve(ROOT, path.join(SNAPSHOT, 'entities')));
const cache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!cache.has(key)) {
    cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  }
  return cache.get(key);
};
const blockName = (state) => state.split('[', 1)[0];
const isAir = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(blockName(state));
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const NON_COLLIDING = new Set([
  'minecraft:air', 'minecraft:cave_air', 'minecraft:void_air',
  'minecraft:short_grass', 'minecraft:tall_grass', 'minecraft:poppy',
  'minecraft:dandelion', 'minecraft:azure_bluet', 'minecraft:cornflower',
  'minecraft:bush', 'minecraft:fern', 'minecraft:large_fern', 'minecraft:torch',
  'minecraft:wall_torch', 'minecraft:redstone_torch', 'minecraft:sea_pickle',
  'minecraft:kelp', 'minecraft:seagrass', 'minecraft:sugar_cane', 'minecraft:cobweb',
  'minecraft:red_carpet', 'minecraft:blue_carpet', 'minecraft:yellow_carpet',
  'minecraft:white_carpet', 'minecraft:snow',
]);
const isNonColliding = (state) => NON_COLLIDING.has(blockName(state));
const LIGHT_BLOCKS = new Set([
  'minecraft:lantern', 'minecraft:soul_lantern', 'minecraft:sea_lantern',
  'minecraft:torch', 'minecraft:wall_torch', 'minecraft:glowstone',
  'minecraft:shroomlight', 'minecraft:conduit', 'minecraft:end_rod',
]);
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

// Candidate public-realm rectangles (frozen Ravensgate district).
const CANDIDATES = [
  {
    key: 'north-plaza',
    label: 'North plaza (NW Garth arrival node, stone_bricks at z=-450)',
    bounds: { minX: -130, maxX: -96, minZ: -455, maxZ: -448 },
    floorY: 67,
  },
  {
    key: 'garth-statues',
    label: 'Garth statue program public realm (x=-93..-68, z=-444..-428)',
    bounds: { minX: -93, maxX: -68, minZ: -444, maxZ: -428 },
    floorY: 67,
  },
  {
    key: 'stoa-plaza',
    label: 'Stoa south plaza / garden-loop connection (x=-105..-65, z=-440..-449)',
    bounds: { minX: -105, maxX: -65, minZ: -449, maxZ: -426 },
    floorY: 67,
  },
  {
    key: 'bell-approach',
    label: 'Bell-Gate approach / Garth west band (x=-110..-106, z=-440..-433)',
    bounds: { minX: -110, maxX: -106, minZ: -440, maxZ: -433 },
    floorY: 67,
  },
];

const report = {
  schemaVersion: 1,
  id: 'ravensgate-next-probe',
  generatedAtUtc: new Date().toISOString(),
  mode: 'READ_ONLY',
  worldMutationPerformed: false,
  rconCallsPerformed: false,
  source: { snapshotRoot: SNAPSHOT, reader: 'AnvilReader' },
  scopeIds: ['RAVENSGATE'],
  candidates: [],
};

const six = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

for (const candidate of CANDIDATES) {
  const { bounds, floorY } = candidate;
  const floorCells = [];
  const lightCount = { band: { minY: 60, maxY: 80 }, count: 0, cells: [] };
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
    for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
      const atY = await sourceAt({ x, y: floorY, z });
      const above = await sourceAt({ x, y: floorY + 1, z });
      if (!isAir(atY) && isAir(above) && !isFluid(atY) && !isHazard(atY)) {
        floorCells.push({ x, z, material: blockName(atY).replace('minecraft:', '') });
      }
      for (let y = lightCount.band.minY; y <= lightCount.band.maxY; y += 1) {
        const st = await sourceAt({ x, y, z });
        if (LIGHT_BLOCKS.has(blockName(st))) {
          lightCount.count += 1;
          lightCount.cells.push({ x, y, z, state: st });
        }
      }
    }
  }

  const census = {};
  for (const cell of floorCells) {
    census[cell.material] = (census[cell.material] ?? 0) + 1;
  }

  // Interior floor cells (all 4 cardinal neighbours also floor).
  const floorKey = new Set(floorCells.map((cell) => `${cell.x},${cell.z}`));
  const interior = floorCells.filter((cell) => (
    floorKey.has(`${cell.x + 1},${cell.z}`)
    && floorKey.has(`${cell.x - 1},${cell.z}`)
    && floorKey.has(`${cell.x},${cell.z + 1}`)
    && floorKey.has(`${cell.x},${cell.z - 1}`)
  ));

  report.candidates.push({
    key: candidate.key,
    label: candidate.label,
    bounds,
    floorY,
    floorCellCount: floorCells.length,
    floorCensus: census,
    interiorFloorCellCount: interior.length,
    existingLightCount: lightCount.count,
    existingLightCells: lightCount.cells.slice(0, 20),
  });
}

// Hazard census across a broad district surface band for context.
const district = { minX: -148, maxX: -64, minZ: -562, maxZ: -420 };
let districtFluid = 0;
let districtHazard = 0;
const fluidCells = [];
const hazardCells = [];
for (let x = district.minX; x <= district.maxX; x += 1) {
  for (let z = district.minZ; z <= district.maxZ; z += 1) {
    for (let y = 60; y <= 80; y += 1) {
      const st = await sourceAt({ x, y, z });
      if (isFluid(st)) { districtFluid += 1; if (fluidCells.length < 30) fluidCells.push({ x, y, z, state: st }); }
      if (isHazard(st)) { districtHazard += 1; if (hazardCells.length < 30) hazardCells.push({ x, y, z, state: st }); }
    }
  }
}
report.districtSurfaceBand = {
  bounds: { minX: district.minX, maxX: district.maxX, minY: 60, maxY: 80, minZ: district.minZ, maxZ: district.maxZ },
  fluidCellCount: districtFluid,
  hazardCellCount: districtHazard,
  fluidSample: fluidCells,
  hazardSample: hazardCells,
};

fs.mkdirSync(path.dirname(path.resolve(ROOT, OUT)), { recursive: true });
fs.writeFileSync(path.resolve(ROOT, OUT), `${JSON.stringify(report, null, 2)}\n`);
const identity = crypto.createHash('sha256').update(JSON.stringify(report)).digest('hex');
process.stdout.write(`${JSON.stringify({
  status: 'READ_ONLY_PROBE',
  report: OUT,
  probeIdentity: identity,
  candidates: report.candidates.map((c) => ({
    key: c.key,
    floorCellCount: c.floorCellCount,
    interiorFloorCellCount: c.interiorFloorCellCount,
    existingLightCount: c.existingLightCount,
    topMaterials: Object.entries(c.floorCensus).sort((a, b) => b[1] - a[1]).slice(0, 6),
  })),
  districtSurfaceBand: {
    fluidCellCount: districtFluid,
    hazardCellCount: districtHazard,
  },
}, null, 2)}\n`);
