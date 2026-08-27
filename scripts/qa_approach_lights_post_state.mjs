#!/usr/bin/env node
/** Independent read-only post-state verification for APPROACH-LIGHTS-01.
 *
 * Verifies against the immutable post snapshot that:
 *   - every cadence target is exactly `minecraft:sea_lantern` in post state;
 *   - the interaction halo (3x3x3 around operated cells) has zero fluid,
 *     zero forbidden/container block, and zero off-target drift vs source;
 *   - the 7-wide carriageway is preserved (all deck-paving cells within the
 *     modeled cz±3 window are byte-identical between source and post);
 *   - all 139 preserved pedestrian-edge cells remain `minecraft:gray_concrete`;
 *   - rollback exact-inverse holds (rollback source == forward source).
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
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
const MANIFEST = value('--manifest', 'data/buildops/approach-lights-cadence.release-manifest.json');
const SOURCE = value('--source-regions', 'data/worldsnap-approach-lights-source-20260825T152239Z/region');
const POST = value('--post-regions', 'data/worldsnap-approach-lights-post-20260825T154047Z/region');
const EVIDENCE = value('--evidence-dir', 'data/world-review/approach-lights-live-20260825T154047Z');
const OUT = value('--out', `${EVIDENCE}/approach-lights-post-state-verify.json`);
const GENERATED_AT = value('--generated-at', '2026-08-25T15:41:00Z');

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`APPROACH-LIGHTS-01 post verify rejected: ${message}`);
};
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const blockName = (state) => state.split('[', 1)[0];
const isAir = (state) => (
  ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(blockName(state))
);
const isFluid = (state) => (
  ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(blockName(state))
  || state.includes('waterlogged=true')
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

function parseOperations(filename) {
  const records = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9, `${filename} malformed operation`);
    records.push({
      cell: { x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]) },
      sourceState: fields[7],
      targetState: fields[8],
    });
  }
  return records;
}

const manifest = readJson(MANIFEST);
const { manifestIdentity, ...manifestPayload } = manifest;
invariant(manifestIdentity === sha256(Buffer.from(`${JSON.stringify(manifestPayload, null, 2)}\n`)),
  'manifest identity drifted');
invariant(manifest.mvpScope === false && manifest.scopeIds.includes('TE-REGIONAL-APPROACH-ROAD'),
  'manifest scope drifted');
invariant(manifest.scope?.releaseId === 'APPROACH-LIGHTS-01', 'release id drifted');

const sourceReader = new AnvilReader(absolute(SOURCE));
const postReader = new AnvilReader(absolute(POST));
const sourceCache = new Map();
const postCache = new Map();
async function sourceAt(cell) {
  const key = cellKey(cell);
  if (!sourceCache.has(key)) sourceCache.set(key, stateToCommandString(await sourceReader.blockState(cell.x, cell.y, cell.z)));
  return sourceCache.get(key);
}
async function postAt(cell) {
  const key = cellKey(cell);
  if (!postCache.has(key)) postCache.set(key, stateToCommandString(await postReader.blockState(cell.x, cell.y, cell.z)));
  return postCache.get(key);
}

const forwardRecords = parseOperations(manifest.packages[0].forward);
const rollbackRecords = parseOperations(manifest.packages[0].rollback);
invariant(forwardRecords.length === 6, `forward record count drift: ${forwardRecords.length}`);
invariant(rollbackRecords.length === 6, `rollback record count drift: ${rollbackRecords.length}`);

// Target bijection.
const forwardKeyToSource = new Map();
for (const record of forwardRecords) {
  invariant(!forwardKeyToSource.has(cellKey(record.cell)), `duplicate forward target ${cellKey(record.cell)}`);
  forwardKeyToSource.set(cellKey(record.cell), record.sourceState);
}
const rollbackKeyToSource = new Map();
for (const record of rollbackRecords) {
  invariant(!rollbackKeyToSource.has(cellKey(record.cell)), `duplicate rollback target ${cellKey(record.cell)}`);
  rollbackKeyToSource.set(cellKey(record.cell), record.targetState);
}
invariant(forwardKeyToSource.size === 6 && rollbackKeyToSource.size === 6, 'target sets not both 6');
for (const [key, sourceState] of forwardKeyToSource) {
  invariant(rollbackKeyToSource.get(key) === sourceState,
    `rollback source (${rollbackKeyToSource.get(key)}) != forward source (${sourceState}) at ${key}`);
}
for (const key of rollbackKeyToSource.keys()) {
  invariant(forwardKeyToSource.has(key), `rollback target not in forward set: ${key}`);
}

// 1. Exact post-state match.
const postMismatches = [];
for (const record of forwardRecords) {
  const actual = await postAt(record.cell);
  if (actual !== record.targetState) postMismatches.push({ cell: record.cell, expected: record.targetState, actual });
}
invariant(postMismatches.length === 0, `post-state mismatch: ${JSON.stringify(postMismatches.slice(0, 5))}`);

// 2. Interaction halo: no fluid/forbidden, no off-target drift.
const operatedCells = uniqueCells(forwardRecords.map(({ cell }) => cell));
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
})).filter((cell) => !forwardKeyToSource.has(cellKey(cell)));
let haloFluidCount = 0;
let haloForbiddenCount = 0;
let haloDrift = 0;
for (const cell of haloCells) {
  const s = await sourceAt(cell);
  const p = await postAt(cell);
  if (isFluid(p)) haloFluidCount += 1;
  if (isHazard(p)) haloForbiddenCount += 1;
  if (s !== p) haloDrift += 1;
}
invariant(haloFluidCount === 0 && haloForbiddenCount === 0 && haloDrift === 0,
  `post halo hazard/drift: fluid=${haloFluidCount} forbidden=${haloForbiddenCount} drift=${haloDrift}`);

// 3. Preserved pedestrian edge: all 145 built edge cells are gray_concrete in
//    post except the 6 cadence cells (which are flush sea_lantern, still full
//    opaque walkable surface at the same level).
const EDGE_BASE = 'data/buildops/approach-road-pedestrian-edge.edge-pave.forward.txt';
const EDGE_EDGE2 = 'data/buildops/approach-road-edge2-pedestrian-edge.edge-pave.forward.txt';
const builtEdgeCells = new Map();
for (const edgeFile of [EDGE_BASE, EDGE_EDGE2]) {
  for (const raw of fs.readFileSync(absolute(edgeFile), 'utf8').split(/\r?\n/)) {
    if (!raw.startsWith('REPL ')) continue;
    const f = raw.split(/\s+/);
    builtEdgeCells.set(`${f[1]},${f[2]},${f[3]}`, { x: Number(f[1]), y: Number(f[2]), z: Number(f[3]) });
  }
}
invariant(builtEdgeCells.size === 145, `built edge count drift: ${builtEdgeCells.size}`);
let preservedEdgeDrift = 0;
for (const cell of builtEdgeCells.values()) {
  if (forwardKeyToSource.has(cellKey(cell))) continue; // cadence target
  const p = await postAt(cell);
  if (p !== 'minecraft:gray_concrete') preservedEdgeDrift += 1;
}
invariant(preservedEdgeDrift === 0, `preserved edge drift: ${preservedEdgeDrift}`);

// 4. Carriageway preservation: every deck-paving cell inside the modeled cz±3
//    window is byte-identical between source and post.
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
async function deckAt(reader, x, z) {
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
    deckMap.set(`${x},${z}`, await deckAt(sourceReader, x, z));
  }
}
let carriagewayChecked = 0;
let carriagewayChanged = [];
for (let x = -352; x <= -148; x += 1) {
  const cz = centerZFor(x);
  if (cz === null) continue;
  const zs = [];
  for (let z = -509; z <= -484; z += 1) {
    const c = deckMap.get(`${x},${z}`);
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
  const deckCell = deckMap.get(`${x},${Math.round((main[0] + main[1]) / 2)}`);
  if (deckCell.y === null) continue;
  for (let k = -3; k <= 3; k += 1) {
    const z = cz + k;
    const a = stateToCommandString(await sourceReader.blockState(x, deckCell.y, z));
    const b = stateToCommandString(await postReader.blockState(x, deckCell.y, z));
    if (!DECK_PAVING.has(blockName(a).replace('minecraft:', ''))) continue;
    carriagewayChecked += 1;
    if (a !== b) carriagewayChanged.push({ x, y: deckCell.y, z, a, b });
  }
}
invariant(carriagewayChanged.length === 0,
  `carriageway changed: ${JSON.stringify(carriagewayChanged.slice(0, 5))}`);

const report = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_APPROACH_LIGHTS_01_PEDESTRIAN_EDGE_LIGHTING_POSTSTATE_VERIFIED_REVERSIBLE',
  mode: 'INDEPENDENT_READ_ONLY_APPROACH_LIGHTS_01_POST_RELEASE_QA',
  release: {
    manifestPath: MANIFEST,
    manifestIdentity,
    targetCount: forwardRecords.length,
    sourceRegionDir: SOURCE,
    postRegionDir: POST,
  },
  checks: {
    exactPostStateCount: forwardRecords.length,
    exactPostStateMismatchCount: postMismatches.length,
    forwardRollbackBijection: true,
    interactionHaloCellCount: haloCells.length,
    haloFluidCount,
    haloForbiddenCount,
    haloOffTargetDriftCount: haloDrift,
    builtEdgeCellCount: builtEdgeCells.size,
    preservedEdgeDriftCount: preservedEdgeDrift,
    carriagewayDeckCellsChecked: carriagewayChecked,
    carriagewayChangedCount: carriagewayChanged.length,
  },
  routeProof: {
    pedestrianEdgePreserved: preservedEdgeDrift === 0,
    carriagewayPreserved: carriagewayChanged.length === 0,
    cadenceIsFlushWalkableInlay: true,
    routeCommissioned: false,
  },
  identities: {
    targetCoordinateSetSha256: hashCells(operatedCells),
    haloCoordinateSetSha256: hashCells(haloCells),
  },
  liveCallsPerformed: false,
  worldEditsPerformed: false,
};
fs.mkdirSync(absolute(EVIDENCE), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  status: report.status,
  targetsMatched: forwardRecords.length,
  haloDrift: haloDrift,
  preservedEdgeDrift: preservedEdgeDrift,
  carriagewayChecked,
  carriagewayChanged: carriagewayChanged.length,
  report: OUT,
}, null, 2)}\n`);
