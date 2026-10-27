#!/usr/bin/env node
/** Read-only probe — re-evaluate the Approach Road "blocked" edge segments
 *  (blockedBoth / blockedNorthOnly / blockedSouthOnly from the accepted exact
 *  cell survey) with the exact strict build filter used by
 *  compile_approach_road_pedestrian_edge.mjs.
 *
 *  The survey's coarse strip-clearance model is more permissive on the surface
 *  (CLEAR_GROUND whitelist) but also flagged many columns as blocked on
 *  headroom/water/object grounds. This probe answers the practical build
 *  question: which 2-wide edge cells would the strict compiler emit TODAY?
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
const OUT = value('--out', 'data/world-review/approach-road-edge2-probe-20260825/approach-road-edge2-probe.json');

const BAND_LO = 65;
const BAND_HI = 76;
const DECK_PAVING = new Set([
  'gray_concrete', 'white_concrete', 'yellow_concrete', 'smooth_quartz',
  'deepslate_tiles', 'deepslate_tile_stairs', 'polished_diorite', 'polished_andesite',
  'stone_bricks', 'quartz_bricks', 'dark_oak_planks', 'gravel', 'dirt_path',
  'stone', 'polished_deepslate', 'smooth_stone', 'cobblestone', 'cut_copper',
  'oxidized_cut_copper', 'waxed_cut_copper',
]);
const CENTER_ANCHORS = [
  [-148, -500], [-160, -500], [-180, -500], [-200, -500], [-220, -500],
  [-240, -499], [-260, -498], [-280, -496], [-300, -493], [-320, -490], [-344, -486],
];
function centerZFor(x) {
  for (let i = 0; i < CENTER_ANCHORS.length - 1; i += 1) {
    const [x0, z0] = CENTER_ANCHORS[i];
    const [x1, z1] = CENTER_ANCHORS[i + 1];
    if (x >= Math.min(x0, x1) && x <= Math.max(x0, x1)) {
      const t = (x - x0) / (x1 - x0);
      return Math.round(z0 + t * (z1 - z0));
    }
  }
  return null;
}

const reader = new AnvilReader(path.resolve(ROOT, path.join(SNAPSHOT, 'region')));
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
const PLANTS = new Set([
  'minecraft:short_grass', 'minecraft:tall_grass', 'minecraft:poppy',
  'minecraft:dandelion', 'minecraft:azure_bluet', 'minecraft:cornflower',
  'minecraft:bush', 'minecraft:fern', 'minecraft:large_fern',
]);
const isVoidFillable = (state) => isAir(state) || PLANTS.has(blockName(state));
const FORBIDDEN = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:spawner', 'minecraft:lectern', 'minecraft:brewing_stand',
  'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive',
  'minecraft:bee_nest', 'minecraft:decorated_pot', 'minecraft:chiseled_bookshelf',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw',
  'minecraft:sign', 'minecraft:hanging_sign', 'minecraft:item_frame',
  'minecraft:glow_item_frame', 'minecraft:smithing_table', 'minecraft:stonecutter',
  'minecraft:enchanting_table', 'minecraft:composter', 'minecraft:campfire',
  'minecraft:soul_campfire', 'minecraft:sculk_sensor', 'minecraft:sculk_shrieker',
  'minecraft:bell', 'minecraft:lantern', 'minecraft:soul_lantern',
  'minecraft:sea_lantern', 'minecraft:conduit',
]);
const isForbidden = (state) => FORBIDDEN.has(blockName(state)) || blockName(state).endsWith('_shulker_box');
const MAX_SUPPORT_DEPTH = 3;

// Reproduce the survey's strip-clearance model (used only for classification).
const CLEAR_GROUND = new Set([
  'air', 'grass_block', 'short_grass', 'tall_grass', 'dirt', 'sand', 'gravel',
  'dirt_path', 'poppy', 'dandelion', 'azure_bluet', 'cornflower', 'bush',
  'water', 'dark_oak_planks', 'spruce_planks',
]);
const HEADROOM_OCCLUDER = new Set([
  'water', 'glass', 'white_stained_glass', 'light_gray_stained_glass',
  'light_blue_stained_glass', 'glass_pane', 'stone_brick_wall',
  'polished_deepslate_wall', 'spruce_fence', 'dark_oak_fence', 'iron_bars',
  'red_wool', 'blue_wool', 'gold_block', 'barrel', 'lectern', 'bell',
  'lantern', 'sea_lantern', 'quartz_pillar', 'spruce_door', 'iron_door',
  'spruce_stairs', 'dark_oak_stairs', 'stone_brick_stairs',
  'deepslate_tile_stairs', 'cut_copper', 'oxidized_cut_copper',
  'waxed_cut_copper', 'white_concrete', 'red_concrete', 'blue_concrete',
  'smooth_quartz', 'deepslate_tiles', 'polished_andesite', 'polished_diorite',
  'dark_oak_log', 'oak_leaves', 'end_rod', 'spruce_planks', 'smooth_stone',
  'gray_concrete', 'stone_bricks', 'polished_blackstone',
  'polished_blackstone_bricks', 'quartz_bricks', 'yellow_concrete',
  'cobblestone', 'calcite',
]);

async function deckAt(x, z) {
  const chunk = await reader.chunk(Math.floor(x / 16), Math.floor(z / 16));
  const sections = chunk?.sections ?? [];
  const byY = new Map();
  for (const section of sections) byY.set(Number(section.Y), section);
  for (let y = BAND_HI; y >= BAND_LO; y -= 1) {
    const section = byY.get(y >> 4);
    const states = section?.block_states;
    if (!states?.palette?.length) continue;
    const index = ((y & 15) << 8) | ((z & 15) << 4) | (x & 15);
    const bits = Math.max(4, Math.ceil(Math.log2(states.palette.length)));
    const state = states.palette[packedValue(states.data, bits, index)] ?? { Name: 'minecraft:air' };
    if (state.Name !== 'minecraft:air') return { y, name: state.Name.replace('minecraft:', '') };
  }
  return { y: null, name: 'air' };
}
function packedValue(values, bits, index) {
  if (!values?.length) return 0;
  const perLong = Math.floor(64 / bits);
  const longIndex = Math.floor(index / perLong);
  if (longIndex >= values.length) return 0;
  const shift = BigInt((index % perLong) * bits);
  return Number((BigInt.asUintN(64, values[longIndex]) >> shift) & ((1n << BigInt(bits)) - 1n));
}

const deckMap = new Map();
for (let x = -352; x <= -148; x += 1) {
  for (let z = -509; z <= -484; z += 1) {
    deckMap.set(`${x},${z}`, await deckAt(x, z));
  }
}

const columns = [];
for (let x = -352; x <= -148; x += 1) {
  const cz = centerZFor(x);
  if (cz === null) continue;
  const zs = [];
  for (let z = -509; z <= -484; z += 1) {
    const c = deckMap.get(`${x},${z}`);
    if (c && DECK_PAVING.has(c.name)) zs.push(z);
  }
  if (zs.length === 0) continue;
  const runs = [];
  let s = zs[0];
  let p = zs[0];
  for (let i = 1; i <= zs.length; i += 1) {
    const z = zs[i];
    if (i === zs.length || z !== p + 1) { runs.push([s, p]); s = z; }
    p = z;
  }
  const main = runs.find(([a, b]) => cz >= a && cz <= b)
    || runs.sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0];
  const [zLo, zHi] = main;
  const deckCell = deckMap.get(`${x},${Math.round((zLo + zHi) / 2)}`);
  const deckY = deckCell ? deckCell.y : null;
  if (deckY === null) continue;
  columns.push({ x, cz, zLo, zHi, deckY, mat: deckCell.name, width: zHi - zLo + 1 });
}

// Survey strip-clearance classification.
const cleanBoth = [];
const classification = new Map();
for (const column of columns) {
  const { x } = column;
  const stripClear = async (dir) => {
    const startZ = dir === -1 ? column.zLo - 1 : column.zHi + 1;
    const reasons = [];
    for (let k = 0; k < 2; k += 1) {
      const z = startZ + k * dir;
      const surf = blockName(await sourceAt({ x, y: column.deckY, z })).replace('minecraft:', '');
      const below = blockName(await sourceAt({ x, y: column.deckY - 1, z })).replace('minecraft:', '');
      const h1 = blockName(await sourceAt({ x, y: column.deckY + 1, z })).replace('minecraft:', '');
      const h2 = blockName(await sourceAt({ x, y: column.deckY + 2, z })).replace('minecraft:', '');
      const h3 = blockName(await sourceAt({ x, y: column.deckY + 3, z })).replace('minecraft:', '');
      if (['water', 'lava', 'bubble_column'].includes(surf)
        || ['water', 'lava', 'bubble_column'].includes(below)
        || ['water', 'lava', 'bubble_column'].includes(h1)
        || ['water', 'lava', 'bubble_column'].includes(h2)
        || ['water', 'lava', 'bubble_column'].includes(h3)) {
        reasons.push(`water@${x},${z}`);
      }
      if (HEADROOM_OCCLUDER.has(h1) || HEADROOM_OCCLUDER.has(h2) || HEADROOM_OCCLUDER.has(h3)) {
        reasons.push(`overhead@${x},${z}`);
      }
      if (!CLEAR_GROUND.has(surf) && surf !== 'air') reasons.push(`object@${x},${z}(${surf})`);
      const floored = below !== 'air' || CLEAR_GROUND.has(surf) || surf === 'air';
      if (h1 === 'air' && h2 === 'air' && !floored) reasons.push(`drop@${x},${z}`);
    }
    return { clear: reasons.length === 0, reasons };
  };
  const north = await stripClear(-1);
  const south = await stripClear(1);
  classification.set(column.x, { north, south });
  if (north.clear && south.clear) cleanBoth.push(column);
}
console.error(`reproduced columns=${columns.length} clean-both=${cleanBoth.length}`);

// Strict build filter (exact copy of the compiler's emitted-cell criteria).
const strictBuildable = async (cell) => {
  const problems = [];
  const fills = [];
  const surf = await sourceAt(cell);
  const below = await sourceAt({ x: cell.x, y: cell.y - 1, z: cell.z });
  const h1 = await sourceAt({ x: cell.x, y: cell.y + 1, z: cell.z });
  const h2 = await sourceAt({ x: cell.x, y: cell.y + 2, z: cell.z });
  if (isFluid(surf)) problems.push('surface-fluid');
  if (isForbidden(surf)) problems.push('surface-forbidden');
  if (!isNonColliding(h1)) problems.push(`headroom-h1=${blockName(h1).replace('minecraft:', '')}`);
  if (!isNonColliding(h2)) problems.push(`headroom-h2=${blockName(h2).replace('minecraft:', '')}`);
  if (isVoidFillable(below)) {
    let yy = cell.y - 1;
    let reachedBase = false;
    for (; yy >= 0; yy -= 1) {
      const st = await sourceAt({ x: cell.x, y: yy, z: cell.z });
      if (isVoidFillable(st)) { fills.push({ y: yy, source: st }); continue; }
      if (isFluid(st)) { problems.push(`fluid-base@y${yy}`); break; }
      if (isForbidden(st)) { problems.push(`forbidden-base@y${yy}`); break; }
      reachedBase = true;
      break;
    }
    if (!reachedBase && problems.length === 0) problems.push('no-base-found');
    if (fills.length > MAX_SUPPORT_DEPTH && problems.length === 0) {
      problems.push(`support-depth>${MAX_SUPPORT_DEPTH}(${fills.length})`);
      fills.length = 0;
    }
  } else if (isFluid(below)) {
    problems.push(`fluid-base@y${cell.y - 1}`);
  }
  return { problems, fills };
};

// Evaluate the blocked columns.
const BLOCKED_BOTH = ['-344..-342', '-335..-323', '-286', '-267', '-264..-252', '-199..-195', '-193'];
const BLOCKED_NORTH = ['-341..-336', '-318..-317', '-274', '-173..-168'];
const BLOCKED_SOUTH = ['-321..-320', '-316..-302', '-290..-287', '-284..-280', '-272..-268', '-266..-265', '-244..-243', '-214..-211', '-209..-200', '-194', '-192..-190', '-157..-154', '-152..-149'];
const expand = (range) => {
  if (!range.includes('..')) return [Number(range)];
  const [a, b] = range.split('..').map(Number);
  const out = [];
  for (let v = Math.min(a, b); v <= Math.max(a, b); v += 1) out.push(v);
  return out;
};
const blockedBothSet = new Set(BLOCKED_BOTH.flatMap(expand));
const blockedNorthSet = new Set(BLOCKED_NORTH.flatMap(expand));
const blockedSouthSet = new Set(BLOCKED_SOUTH.flatMap(expand));

const report = {
  schemaVersion: 1,
  generatedAtUtc: new Date().toISOString(),
  source: { snapshot: SNAPSHOT, reader: 'AnvilReader' },
  scopeIds: ['TE-REGIONAL-APPROACH-ROAD'],
  reproduced: { columns: columns.length, cleanBoth: cleanBoth.length },
  declaredBlockedCounts: {
    blockedBoth: [...blockedBothSet].length,
    blockedNorthOnly: [...blockedNorthSet].length,
    blockedSouthOnly: [...blockedSouthSet].length,
  },
  columns: [],
};

for (const column of columns) {
  const cls = classification.get(column.x);
  let group = null;
  if (blockedBothSet.has(column.x)) group = 'blockedBoth';
  else if (blockedNorthSet.has(column.x)) group = 'blockedNorthOnly';
  else if (blockedSouthSet.has(column.x)) group = 'blockedSouthOnly';
  if (!group) continue;

  const sideResult = async (dir) => {
    const startZ = dir === -1 ? column.zLo - 1 : column.zHi + 1;
    const cells = [];
    for (let k = 0; k < 2; k += 1) {
      const z = startZ + k * dir;
      cells.push({ x: column.x, y: column.deckY, z });
    }
    const per = [];
    let sideProblems = [];
    let fills = [];
    for (const cell of cells) {
      const r = await strictBuildable(cell);
      per.push({ cell, sourceState: await sourceAt(cell), problems: r.problems });
      sideProblems = sideProblems.concat(r.problems);
      fills = fills.concat(r.fills);
    }
    return { side: dir === -1 ? 'north' : 'south', cells, problems: sideProblems, fills, buildable: sideProblems.length === 0 };
  };

  const north = await sideResult(-1);
  const south = await sideResult(1);
  const survey = {
    northClear: cls.north.clear,
    northReasons: cls.north.reasons,
    southClear: cls.south.clear,
    southReasons: cls.south.reasons,
  };
  const buildableSides = [north, south].filter((s) => s.buildable);
  report.columns.push({
    x: column.x,
    group,
    deckY: column.deckY,
    zLo: column.zLo,
    zHi: column.zHi,
    mat: column.mat,
    survey,
    buildable: buildableSides.length > 0,
    buildableSides: buildableSides.map((s) => ({
      side: s.side,
      cells: s.cells,
      sourceStates: s.cells.map((c) => null), // filled below
      supportFills: s.fills,
    })),
    north,
    south,
  });
}

// Second pass to attach source states (already computed inside, so reattach here
// from the stored cells).
for (const col of report.columns) {
  for (const s of [col.north, col.south]) {
    s.sourceStates = [];
    for (const cell of s.cells) s.sourceStates.push(await sourceAt(cell));
  }
}

const buildableCells = [];
const buildableSides = [];
for (const col of report.columns) {
  for (const s of [col.north, col.south]) {
    if (s.buildable) {
      buildableSides.push({ x: col.x, side: s.side, cells: s.cells, supportFills: s.fills });
      for (const cell of s.cells) buildableCells.push(cell);
    }
  }
}

report.summary = {
  buildableColumns: buildableSides.length,
  buildableSideCount: buildableSides.length,
  buildableEdgeCellCount: buildableCells.length,
  buildableCells: buildableCells,
};

fs.mkdirSync(path.dirname(path.resolve(ROOT, OUT)), { recursive: true });
fs.writeFileSync(path.resolve(ROOT, OUT), `${JSON.stringify(report, null, 2)}\n`);
const identity = crypto.createHash('sha256')
  .update(JSON.stringify(report)).digest('hex');
process.stdout.write(`${JSON.stringify({
  status: 'READ_ONLY_PROBE',
  report: OUT,
  probeIdentity: identity,
  buildableColumns: buildableSides.length,
  buildableEdgeCellCount: buildableCells.length,
  buildableCells,
  supportFillCells: buildableSides.flatMap((s) => s.supportFills.map((f) => ({ x: s.cells[0].x, y: f.y, z: s.cells[0].z }))),
}, null, 2)}\n`);
