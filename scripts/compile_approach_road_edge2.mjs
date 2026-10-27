#!/usr/bin/env node
/** Compile CIRC-WL-ARRIVAL-ROAD-01-B — Approach Road pedestrian edge (blocked-segment remainder).
 *
 * Adds a 2-wide pedestrian edge (minecraft:gray_concrete) beside the preserved
 * 7-wide carriageway on the Western Approach Road for the survey's previously
 * BLOCKED segments (blockedBoth / blockedNorthOnly / blockedSouthOnly) whose
 * exact edge cells are NOW cleanly buildable:
 *   - the surface cell is a replaceable non-paved material (air / cave_air /
 *     plants / grass_block / dirt) — i.e. a genuine edge gap, never a recolor
 *     of an already-paved plaza/apron cell;
 *   - headroom deckY+1 and deckY+2 are non-colliding so a standing pedestrian
 *     fits at the carriageway surface level;
 *   - the support below is either immediately solid or safely fillable down to
 *     a solid non-fluid, non-block-entity base with bounded depth (<= 3).
 *
 * Every emitted cell is an exact one-cell REPL guard; the rollback is the exact
 * inverse. The 7-wide carriageway is preserved exactly. This is a bounded
 * follow-on to the executed 85-cell CIRC-WL-ARRIVAL-ROAD-01 release and reuses
 * the same strict walkability filter (headroom + safe support + replaceable
 * source) so no floating slab, fluid, container, or protected feature is
 * created or touched.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  hashCells,
  replLine,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-25T07:00:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-approach-edge2-source-20260825T065700Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'approach-road-edge2-pedestrian-edge');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'approach-road-edge2-pedestrian-edge';
const RELEASE_ID = 'CIRC-WL-ARRIVAL-ROAD-01-B';
const RELEASE_NODE_ID = 'CZ-LEGACY-CROSS-AREA-CIRCULATION';
const SURVEY = 'data/world-review/approach-road-exact-cell-survey-20260824/approach-road-survey.json';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fileBinding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`APPROACH-EDGE2 compiler rejected: ${message}`);
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
// Genuinely replaceable surface source — a NEW pavement surface, not a recolor
// of an already-paved plaza/apron/apron cell.
const REPLACEABLE_SURFACE = new Set([
  'minecraft:air', 'minecraft:cave_air', 'minecraft:void_air',
  'minecraft:short_grass', 'minecraft:tall_grass', 'minecraft:poppy',
  'minecraft:dandelion', 'minecraft:azure_bluet', 'minecraft:cornflower',
  'minecraft:bush', 'minecraft:fern', 'minecraft:large_fern',
  'minecraft:grass_block', 'minecraft:dirt', 'minecraft:sand', 'minecraft:gravel',
  'minecraft:dirt_path',
]);
const isReplaceableSurface = (state) => REPLACEABLE_SURFACE.has(blockName(state));
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
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const census = (records, selector = (record) => record.state) => Object.fromEntries(
  [...records.reduce((counts, record) => {
    const state = selector(record);
    counts.set(state, (counts.get(state) ?? 0) + 1);
    return counts;
  }, new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
);

const MAX_SUPPORT_DEPTH = 3;
const EDGE_MATERIAL = 'minecraft:gray_concrete';
const SUPPORT_MATERIAL = 'minecraft:stone';

// --- Reproduce the survey's column/deck model (same derivation as the survey
//     and the original compiler) -------------------------------------------
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

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const sourceCache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!sourceCache.has(key)) {
    sourceCache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  }
  return sourceCache.get(key);
};

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
invariant(columns.length === 197, `survey column count drift: ${columns.length}`);
// --- Reproduce the survey's strip-clearance classification for blocked segments
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
const cleanBoth = [];
const columnBlockedSides = new Map();
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
  columnBlockedSides.set(column.x, { north, south });
  if (north.clear && south.clear) cleanBoth.push(column);
}
invariant(cleanBoth.length >= 70 && cleanBoth.length <= 84,
  `survey clean-both count outside expected live range: ${cleanBoth.length}`);

// --- Focus on the survey's BLOCKED segments --------------------------------
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
const blockedColumns = columns.filter((column) => (
  blockedBothSet.has(column.x) || blockedNorthSet.has(column.x) || blockedSouthSet.has(column.x)
));
invariant(blockedColumns.length === 113, `blocked column count drift: ${blockedColumns.length}`);

// --- Strict walkability + safe-support filter, restricted to replaceable sources
const buildRecords = [];
const heldRecords = [];
for (const column of blockedColumns) {
  for (const dir of [-1, 1]) {
    const startZ = dir === -1 ? column.zLo - 1 : column.zHi + 1;
    const sideCells = [];
    for (let k = 0; k < 2; k += 1) sideCells.push({ x: column.x, y: column.deckY, z: startZ + k * dir });
    let sideBuildable = true;
    const cellRecords = [];
    for (const cell of sideCells) {
      const problems = [];
      const fills = [];
      const surf = await sourceAt(cell);
      const below = await sourceAt({ x: cell.x, y: cell.y - 1, z: cell.z });
      const h1 = await sourceAt({ x: cell.x, y: cell.y + 1, z: cell.z });
      const h2 = await sourceAt({ x: cell.x, y: cell.y + 2, z: cell.z });
      if (isFluid(surf)) problems.push('surface-fluid');
      if (isForbidden(surf)) problems.push('surface-forbidden');
      if (!isReplaceableSurface(surf)) problems.push(`surface-${blockName(surf).replace('minecraft:', '')}`);
      if (!isNonColliding(h1)) problems.push(`headroom-h1=${blockName(h1).replace('minecraft:', '')}`);
      if (!isNonColliding(h2)) problems.push(`headroom-h2=${blockName(h2).replace('minecraft:', '')}`);
      if (isVoidFillable(below)) {
        let yy = cell.y - 1;
        let reachedBase = false;
        for (; yy >= 0; yy -= 1) {
          const st = await sourceAt({ x: cell.x, y: yy, z: cell.z });
          if (isVoidFillable(st)) { fills.push({ x: cell.x, y: yy, z: cell.z, source: st }); continue; }
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
      cellRecords.push({ ...cell, surf, fills, problems });
      if (problems.length > 0) sideBuildable = false;
    }
    if (sideBuildable) {
      for (const record of cellRecords) buildRecords.push(record);
    } else {
      for (const record of cellRecords) heldRecords.push(record);
    }
  }
}

const edgeOps = buildRecords.map((record) => ({
  cell: { x: record.x, y: record.y, z: record.z },
  sourceState: record.surf,
  targetState: EDGE_MATERIAL,
  role: 'pedestrian-edge',
  packageKey: 'edge-pave',
}));
const supportOps = [];
for (const record of buildRecords) {
  for (const fill of record.fills) {
    invariant(isVoidFillable(fill.source) && fill.source !== EDGE_MATERIAL && fill.source !== SUPPORT_MATERIAL,
      `unexpected support source at (${fill.x},${fill.y},${fill.z}): ${fill.source}`);
    supportOps.push({
      cell: { x: fill.x, y: fill.y, z: fill.z },
      sourceState: fill.source,
      targetState: SUPPORT_MATERIAL,
      role: 'edge-support-fill',
      packageKey: 'support-fill',
    });
  }
}

// Duplicate-target / noop guards.
const targetKeys = new Set();
for (const record of [...edgeOps, ...supportOps]) {
  const key = cellKey(record.cell);
  invariant(!targetKeys.has(key), `duplicate target ${key}`);
  targetKeys.add(key);
  invariant(await sourceAt(record.cell) === record.sourceState
    && record.sourceState !== record.targetState,
  `source/noop guard drift at ${key}`);
}

// Projected-support check: surface-only edge cells need a solid (non-air,
// non-plant, non-fluid) support immediately below after projection.
const projected = new Map([...edgeOps, ...supportOps].map(({ cell, targetState }) => [
  cellKey(cell), targetState,
]));
for (const record of buildRecords) {
  if (record.fills.length > 0) continue;
  const belowKey = cellKey({ x: record.x, y: record.y - 1, z: record.z });
  const belowState = projected.get(belowKey) ?? await sourceAt({ x: record.x, y: record.y - 1, z: record.z });
  invariant(!isAir(belowState) && !isFluid(belowState) && !isVoidFillable(belowState)
    && !isForbidden(belowState),
  `edge cell lacks projected support at (${record.x},${record.y},${record.z}): ${belowState}`);
}

// Carriageway preservation: verify the modeled 7-wide carriageway window
// (every column's cz-3..cz+3 at deckY) as a preservation set, and confirm no
// operated cell is currently a paved carriageway surface cell. Edge cells are
// replaceable non-paved source (air/plants/grass/dirt) by the filter above, so
// no paved road cell is ever overwritten. The centered window is recorded for
// post-state verification (like the base release's 1006/1006 check).
const carriagewayKeys = new Set();
for (const column of columns) {
  for (let k = -3; k <= 3; k += 1) carriagewayKeys.add(cellKey({ x: column.x, y: column.deckY, z: column.cz + k }));
}
const PAVING_SURFACE = new Set([
  'minecraft:gray_concrete', 'minecraft:white_concrete', 'minecraft:yellow_concrete',
  'minecraft:smooth_quartz', 'minecraft:deepslate_tiles', 'minecraft:deepslate_tile_stairs',
  'minecraft:polished_diorite', 'minecraft:polished_andesite', 'minecraft:stone_bricks',
  'minecraft:quartz_bricks', 'minecraft:dark_oak_planks', 'minecraft:gravel',
  'minecraft:dirt_path', 'minecraft:stone', 'minecraft:polished_deepslate',
  'minecraft:smooth_stone', 'minecraft:cobblestone', 'minecraft:cut_copper',
  'minecraft:oxidized_cut_copper', 'minecraft:waxed_cut_copper',
]);
const carriagewayOverlap = [...targetKeys].filter((key) => carriagewayKeys.has(key));
const pavedOverlap = [...targetKeys].filter((key) => PAVING_SURFACE.has(blockName(sourceCache.get(key))));
invariant(pavedOverlap.length === 0,
  `operated cell is a paved carriageway surface cell: ${pavedOverlap.join(', ')}`);

// Interaction halo (3x3x3 around every operated cell).
const operatedCells = uniqueCells([...edgeOps, ...supportOps].map(({ cell }) => cell));
const haloCells = uniqueCells(operatedCells.flatMap((cell) => {
  const cells = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        cells.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
      }
    }
  }
  return cells;
})).filter((cell) => !targetKeys.has(cellKey(cell)));
let haloFluidCount = 0;
let haloForbiddenCount = 0;
for (const cell of haloCells) {
  const st = await sourceAt(cell);
  if (isFluid(st)) haloFluidCount += 1;
  if (isForbidden(st)) haloForbiddenCount += 1;
}
invariant(haloFluidCount === 0 && haloForbiddenCount === 0,
  `interaction halo fluid/forbidden hazard: ${haloFluidCount}/${haloForbiddenCount}`);

// Block-entity and saved-entity clearance over the operated envelope.
const envelope = boundsOf(operatedCells);
const blockEntities = [];
const savedEntities = [];
for (let cx = Math.floor(envelope.minX / 16); cx <= Math.floor(envelope.maxX / 16); cx += 1) {
  for (let cz = Math.floor(envelope.minZ / 16); cz <= Math.floor(envelope.maxZ / 16); cz += 1) {
    const chunk = await reader.chunk(cx, cz);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (targetKeys.has(cellKey(point))) {
        blockEntities.push({ id: entity.id ?? null, point });
      }
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
invariant(blockEntities.length === 0 && savedEntities.length === 0,
  'operated envelope intersects a block entity or saved movable entity');

// --- Emit packages ----------------------------------------------------------
const packageOrder = ['support-fill', 'edge-pave'];
const packageGroups = new Map(packageOrder.map((key) => [key, []]));
for (const op of supportOps) packageGroups.get(op.packageKey).push(op);
for (const op of edgeOps) packageGroups.get(op.packageKey).push(op);
for (const [key, group] of packageGroups) {
  group.sort((a, b) => a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z);
}

const packages = [];
const operationManifest = {};
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
for (const key of packageOrder) {
  const group = packageGroups.get(key);
  if (group.length === 0) continue;
  const forwardPath = path.join(OUT_DIR, `${BASENAME}.${key}.forward.txt`);
  const rollbackPath = path.join(OUT_DIR, `${BASENAME}.${key}.rollback.txt`);
  const forwardBody = `${group.map(({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState)).join('\n')}\n`;
  const reverse = [...group].reverse();
  const rollbackBody = `${reverse.map(({ cell, sourceState, targetState }) => replLine(cell, targetState, sourceState)).join('\n')}\n`;
  const header = [
    `# GENERATED FILE - ${RELEASE_ID} (${key})`,
    `# source root: ${SNAPSHOT}`,
    `# target coordinate-set SHA-256: ${hashCells(group.map(({ cell }) => cell))}`,
  ].join('\n');
  fs.writeFileSync(absolute(forwardPath), `${header}\n${forwardBody}`);
  fs.writeFileSync(absolute(rollbackPath), `${header}\n${rollbackBody}`);
  packages.push({ key, forward: relative(forwardPath), rollback: relative(rollbackPath) });
  operationManifest[key] = {
    role: key === 'support-fill' ? 'shallow edge-support fill' : '2-wide pedestrian edge paving',
    forwardSha256: sha256(forwardBody),
    rollbackSha256: sha256(rollbackBody),
    forwardCommandCount: group.length,
    rollbackCommandCount: group.length,
    targetCoordinateSetSha256: hashCells(group.map(({ cell }) => cell)),
    exactInverse: true,
  };
}

const allOperations = [...supportOps, ...edgeOps];
const heldByReason = census(heldRecords, (record) => record.problems.join(';'));
const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: TRANSACTION_ID,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_FRESH_SOURCE_OFFLINE_AWAITING_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: false,
  scopeIds: ['TE-REGIONAL-APPROACH-ROAD'],
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'TE-REGIONAL-APPROACH-ROAD',
    purpose: 'Add a 2-wide pedestrian edge (gray_concrete) at the Approach Road carriageway surface level for the survey blocked segments whose edge cells are now cleanly buildable (replaceable non-paved source, clear 2-tall headroom, shallow safe support), preserving the 7-wide carriageway.',
    treatment: 'SURFACE_LEVEL_PEDESTRIAN_EDGE_WITH_SHALLOW_SUPPORT_FILLS',
    edgeMaterial: EDGE_MATERIAL,
    supportMaterial: SUPPORT_MATERIAL,
    baseRelease: 'CIRC-WL-ARRIVAL-ROAD-01',
    blockedSegments: {
      blockedBoth: BLOCKED_BOTH,
      blockedNorthOnly: BLOCKED_NORTH,
      blockedSouthOnly: BLOCKED_SOUTH,
    },
    built: classManifest(operatedCells),
    builtEdgeCells: classManifest(edgeOps.map(({ cell }) => cell)),
    supportFillCells: classManifest(supportOps.map(({ cell }) => cell)),
    held: {
      cellCount: heldRecords.length,
      byReason: heldByReason,
    },
    interactionHalo: classManifest(haloCells),
    carriagewayPreservedExactly: true,
    routeCommissioned: false,
  },
  source: {
    snapshotRoot: relative(SNAPSHOT),
    survey: fileBinding(SURVEY),
  },
  target: {
    operatedUnion: classManifest(allOperations.map(({ cell }) => cell)),
    desiredStateCensus: census(allOperations, (record) => record.targetState),
    sourceStateCensus: census(allOperations, (record) => record.sourceState),
    interactionHalo: classManifest(haloCells),
    packageTargetsDisjoint: true,
  },
  operations: operationManifest,
  packages,
  executionOrder: {
    forward: packageOrder.filter((key) => operationManifest[key]),
    rollback: packageOrder.filter((key) => operationManifest[key]).reverse(),
    gravity: 'support fills bottom-up, then edge paving; rollback removes edge paving first, then support fills top-down',
  },
  isolation: {
    sourceHazardCount: 0,
    operatedHaloFluidCount: haloFluidCount,
    operatedHaloForbiddenBlockCount: haloForbiddenCount,
    blockEntityIntersectionCount: blockEntities.length,
    savedEntityIntersectionCount: savedEntities.length,
  },
  hardStops: {
    requireFreshImmutableSourceImmediatelyBeforeExecution: true,
    requireExactSourceGuards: true,
    requireLiveEntityClearance: true,
    requireBlockEntityAndProtectedCoreClearance: true,
    requireStrictNoopForwardAndRollbackParserChecks: true,
    requireJournaledStrictExecution: true,
    requireFreshPostSnapshotAndRollbackPoststatePreflight: true,
  },
  liveCallsPerformed: false,
  worldEditsPerformed: false,
};
const manifestIdentity = sha256(Buffer.from(`${JSON.stringify(manifestWithoutIdentity, null, 2)}\n`));
const manifest = { ...manifestWithoutIdentity, manifestIdentity };
fs.writeFileSync(absolute(MANIFEST_OUT), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  status: manifest.status,
  manifest: relative(MANIFEST_OUT),
  manifestIdentity,
  surveyBlockedColumnCount: blockedColumns.length,
  builtEdgeCellCount: edgeOps.length,
  supportFillCount: supportOps.length,
  totalOperationCount: allOperations.length,
  heldCount: heldRecords.length,
  packageCount: packages.length,
  sourceSnapshot: SNAPSHOT,
}, null, 2)}\n`);
