#!/usr/bin/env node
/** Read-only probe for the Approach Road lighting cadence (APPROACH-LIGHTS-01).
 *
 * Reproduces the survey/compiler column+deck model on a supplied source
 * snapshot and reports, for every conflict-free (clean-both) column:
 *   - deckY, centerline z, zLo/zHi, main-run width;
 *   - the two-edge-cell strips (north zLo-1/zLo-2, south zHi+1/zHi+2) and the
 *     current source state at deckY for each edge cell;
 *   - whether the edge cell is a built gray_concrete pedestrian edge cell.
 *
 * READ-ONLY: emits a JSON report only. It never writes ops, never contacts
 * RCON, and never mutates the world.
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
const SNAPSHOT = value('--snapshot', 'data/worldsnap-approach-lights-source-20260825T152239Z');
const OUT = value('--out', 'data/world-review/approach-lights-probe-20260825/approach-lights-probe.json');

const reader = new AnvilReader(path.resolve(ROOT, path.join(SNAPSHOT, 'region')));
const cache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return cache.get(key);
};
const blockName = (state) => state.split('[', 1)[0];

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
console.error(`columns=${columns.length}`);

// Reproduce the survey strip-clearance classification.
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
for (const column of columns) {
  const { x, zLo, zHi, deckY } = column;
  const stripClear = async (dir) => {
    const startZ = dir === -1 ? zLo - 1 : zHi + 1;
    const reasons = [];
    for (let k = 0; k < 2; k += 1) {
      const z = startZ + k * dir;
      const surf = blockName(await sourceAt({ x, y: deckY, z })).replace('minecraft:', '');
      const below = blockName(await sourceAt({ x, y: deckY - 1, z })).replace('minecraft:', '');
      const h1 = blockName(await sourceAt({ x, y: deckY + 1, z })).replace('minecraft:', '');
      const h2 = blockName(await sourceAt({ x, y: deckY + 2, z })).replace('minecraft:', '');
      const h3 = blockName(await sourceAt({ x, y: deckY + 3, z })).replace('minecraft:', '');
      if (['water', 'lava', 'bubble_column'].includes(surf)
        || ['water', 'lava', 'bubble_column'].includes(below)
        || ['water', 'lava', 'bubble_column'].includes(h1)
        || ['water', 'lava', 'bubble_column'].includes(h2)
        || ['water', 'lava', 'bubble_column'].includes(h3)) reasons.push(`water@${x},${z}`);
      if (HEADROOM_OCCLUDER.has(h1) || HEADROOM_OCCLUDER.has(h2) || HEADROOM_OCCLUDER.has(h3)) reasons.push(`overhead@${x},${z}`);
      if (!CLEAR_GROUND.has(surf) && surf !== 'air') reasons.push(`object@${x},${z}(${surf})`);
      const floored = below !== 'air' || CLEAR_GROUND.has(surf) || surf === 'air';
      if (h1 === 'air' && h2 === 'air' && !floored) reasons.push(`drop@${x},${z}`);
    }
    return { clear: reasons.length === 0, reasons };
  };
  const north = await stripClear(-1);
  const south = await stripClear(1);
  if (north.clear && south.clear) cleanBoth.push(column);
}
console.error(`clean-both=${cleanBoth.length}`);

// For each clean-both column, enumerate the edge-strip cells and their state.
const edgeCells = [];
for (const column of cleanBoth) {
  const northCells = [];
  const southCells = [];
  for (let k = 0; k < 2; k += 1) {
    northCells.push({ x: column.x, y: column.deckY, z: column.zLo - 1 - k });
    southCells.push({ x: column.x, y: column.deckY, z: column.zHi + 1 + k });
  }
  for (const cell of [...northCells, ...southCells]) {
    edgeCells.push({
      ...cell,
      state: await sourceAt(cell),
      below: await sourceAt({ x: cell.x, y: cell.y - 1, z: cell.z }),
      h1: await sourceAt({ x: cell.x, y: cell.y + 1, z: cell.z }),
      h2: await sourceAt({ x: cell.x, y: cell.y + 2, z: cell.z }),
    });
  }
}

const grayEdgeCells = edgeCells.filter((c) => blockName(c.state) === 'minecraft:gray_concrete');
const report = {
  schemaVersion: 1,
  id: 'approach-lights-probe',
  generatedAtUtc: new Date().toISOString(),
  mode: 'READ_ONLY',
  worldMutationPerformed: false,
  rconCallsPerformed: false,
  source: { snapshotRoot: SNAPSHOT, reader: 'AnvilReader' },
  scopeIds: ['TE-REGIONAL-APPROACH-ROAD'],
  reproduced: { columns: columns.length, cleanBoth: cleanBoth.length },
  grayEdgeCellCount: grayEdgeCells.length,
  grayEdgeCells: grayEdgeCells.map((c) => ({ x: c.x, y: c.y, z: c.z, state: c.state, below: c.below, h1: c.h1, h2: c.h2 })),
};
fs.mkdirSync(path.dirname(path.resolve(ROOT, OUT)), { recursive: true });
fs.writeFileSync(path.resolve(ROOT, OUT), `${JSON.stringify(report, null, 2)}\n`);
const identity = crypto.createHash('sha256').update(JSON.stringify(report)).digest('hex');
process.stdout.write(`${JSON.stringify({
  status: 'READ_ONLY_PROBE',
  report: OUT,
  probeIdentity: identity,
  columns: columns.length,
  cleanBoth: cleanBoth.length,
  grayEdgeCellCount: grayEdgeCells.length,
}, null, 2)}\n`);
