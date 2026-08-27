#!/usr/bin/env node
/** Post-state verification for CIRC-WL-ARRIVAL-ROAD-01-B (approach-road-edge2).
 *
 * Read-only. Verifies against the immutable post snapshot that:
 *   - every forward target matches its desired state (78 edge-pave + 104
 *     support-fill = 182 exact cells);
 *   - no paved carriageway surface cell changed between source and post
 *     (the actual gray_concrete / paving deck run, independent of the survey's
 *     coarse cz-window model).
 */

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
const POST = value('--post', 'data/worldsnap-approach-edge2-post-20260825T071200Z');
const SOURCE = value('--source', 'data/worldsnap-approach-edge2-source-20260825T065700Z');
const BASENAME = value('--basename', 'approach-road-edge2-pedestrian-edge');
const OUT = value('--out', 'data/world-review/approach-road-edge2-live-20260825T071000Z/approach-road-edge2.post-state-verify.json');

const post = new AnvilReader(path.resolve(ROOT, path.join(POST, 'region')));
const source = new AnvilReader(path.resolve(ROOT, path.join(SOURCE, 'region')));

const readOps = (pkg) => fs.readFileSync(
  path.resolve(ROOT, `data/buildops/${BASENAME}.${pkg}.forward.txt`), 'utf8',
).split(/\r?\n/).filter((l) => l.startsWith('REPL ')).map((l) => {
  const p = l.split(/\s+/);
  return { x: Number(p[1]), y: Number(p[2]), z: Number(p[3]), want: p[8], from: p[7] };
});

const PAVING = new Set([
  'minecraft:gray_concrete', 'minecraft:white_concrete', 'minecraft:yellow_concrete',
  'minecraft:smooth_quartz', 'minecraft:deepslate_tiles', 'minecraft:deepslate_tile_stairs',
  'minecraft:polished_diorite', 'minecraft:polished_andesite', 'minecraft:stone_bricks',
  'minecraft:quartz_bricks', 'minecraft:dark_oak_planks', 'minecraft:gravel',
  'minecraft:dirt_path', 'minecraft:stone', 'minecraft:polished_deepslate',
  'minecraft:smooth_stone', 'minecraft:cobblestone', 'minecraft:cut_copper',
  'minecraft:oxidized_cut_copper', 'minecraft:waxed_cut_copper',
]);

let matched = 0;
let failed = [];
for (const op of [...readOps('support-fill'), ...readOps('edge-pave')]) {
  const got = stateToCommandString(await post.blockState(op.x, op.y, op.z));
  if (got === op.want) matched += 1;
  else failed.push({ ...op, got });
}

// Carriageway preservation: recompute the actual paving deck run per column
// from the SOURCE snapshot (like the compiler), then verify every paving cell
// is byte-identical between source and post.
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
async function deckAt(reader, x, z) {
  const chunk = await reader.chunk(Math.floor(x / 16), Math.floor(z / 16));
  const sections = chunk?.sections ?? [];
  const byY = new Map();
  for (const section of sections) byY.set(Number(section.Y), section);
  for (let y = 76; y >= 65; y -= 1) {
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

let pavingChecked = 0;
let pavingChanged = [];
for (let x = -352; x <= -148; x += 1) {
  const cz = centerZFor(x);
  if (cz === null) continue;
  const zs = [];
  for (let z = -509; z <= -484; z += 1) {
    const c = await deckAt(source, x, z);
    if (c && DECK_PAVING.has(c.name)) zs.push(z);
  }
  if (!zs.length) continue;
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
  const deckCell = await deckAt(source, x, Math.round((main[0] + main[1]) / 2));
  if (deckCell.y === null) continue;
  // The actual paved carriageway is the DECK_PAVING run, not the whole deck.
  for (let z = main[0]; z <= main[1]; z += 1) {
    const a = stateToCommandString(await source.blockState(x, deckCell.y, z));
    const b = stateToCommandString(await post.blockState(x, deckCell.y, z));
    if (!PAVING.has(a)) continue; // only count paved deck cells as carriageway
    pavingChecked += 1;
    if (a !== b) pavingChanged.push({ x, y: deckCell.y, z, a, b });
  }
}

const status = matched === 182 && failed.length === 0 && pavingChanged.length === 0
  ? 'PASS'
  : 'FAIL';
const report = {
  schemaVersion: 1,
  releaseId: 'CIRC-WL-ARRIVAL-ROAD-01-B',
  status,
  postSnapshot: POST,
  sourceSnapshot: SOURCE,
  targetCheck: {
    expected: 182,
    matched,
    failed: failed.length,
    failures: failed.slice(0, 20),
  },
  carriagewayPreservation: {
    pavedDeckCellsChecked: pavingChecked,
    changed: pavingChanged.length,
    changedCells: pavingChanged.slice(0, 20),
  },
};
fs.mkdirSync(path.dirname(path.resolve(ROOT, OUT)), { recursive: true });
fs.writeFileSync(path.resolve(ROOT, OUT), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  status,
  targetsMatched: matched,
  targetsExpected: 182,
  pavingDeckCellsChecked: pavingChecked,
  pavingDeckCellsChanged: pavingChanged.length,
  report: OUT,
}, null, 2)}\n`);
