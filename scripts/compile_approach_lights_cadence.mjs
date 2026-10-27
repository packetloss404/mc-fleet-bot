#!/usr/bin/env node
/** Compile APPROACH-LIGHTS-01 — Approach Road pedestrian-edge lighting cadence.
 *
 * The Western Approach Road 2-wide pedestrian edge is DONE (CIRC-WL-ARRIVAL-ROAD-01
 * 85 cells + CIRC-WL-ARRIVAL-ROAD-01-B 182 cells; all 145 edge-pave
 * `minecraft:gray_concrete` cells are verified present in the current source).
 * The accepted exact-cell survey found the road has NO regular lighting cadence:
 * lights only cluster at arrival pylons/towers/plaza edges (49 sea_lanterns +
 * 2 lanterns), and TE-ROAD-01 declares `lightingRhythmBlocks: 12` as a design
 * target. This package adds a **flush pedestrian-edge lighting cadence** —
 * exact `minecraft:sea_lantern` inlays in the built gray_concrete pedestrian
 * edge at the carriageway surface level, along the survey's conflict-free
 * segments, at a regular ~10-12 block rhythm.
 *
 * Deterministic selection (against the supplied current source snapshot):
 *   - reproduce the authoritative built pedestrian-edge cells from the two
 *     committed edge release files and verify each is `minecraft:gray_concrete`
 *     in the current source (the edge is as-built);
 *   - restrict to columns inside the survey's conflict-free segment runs;
 *   - one candidate per column = the outer edge cell (farthest from the
 *     centerline; north on tie);
 *   - greedy 1D X-spacing >= 10 along the road (target ~12, TE-ROAD-01
 *     `lightingRhythmBlocks`).
 *
 * Every emitted target is an exact one-cell REPL guard: source
 * `minecraft:gray_concrete`, solid non-fluid support below, two clear air
 * blocks above, no fluid/container/hazard in the 3x3x3 interaction halo, no
 * block entity / saved movable entity in the operated envelope, and no
 * pre-existing light block within a 4-block exclusion radius (the cadence is
 * additive and stays clear of the arrival-pylon clusters). The rollback is the
 * exact per-cell inverse.
 *
 * This compiler emits no live calls and performs no world edits.
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
const GENERATED_AT = value('--generated-at', '2026-08-25T16:00:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-approach-lights-source-20260825T152239Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'approach-lights-cadence');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'approach-lights-cadence';
const RELEASE_ID = 'APPROACH-LIGHTS-01';
const RELEASE_NODE_ID = 'CZ-LEGACY-CROSS-AREA-CIRCULATION';
const SURVEY = 'data/world-review/approach-road-exact-cell-survey-20260824/approach-road-survey.json';
const EDGE_BASE = 'data/buildops/approach-road-pedestrian-edge.edge-pave.forward.txt';
const EDGE_EDGE2 = 'data/buildops/approach-road-edge2-pedestrian-edge.edge-pave.forward.txt';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fileBinding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`${RELEASE_ID} compiler rejected: ${message}`);
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
const LIGHT_BLOCKS = new Set([
  'minecraft:lantern', 'minecraft:soul_lantern', 'minecraft:sea_lantern',
  'minecraft:torch', 'minecraft:wall_torch', 'minecraft:glowstone',
  'minecraft:shroomlight', 'minecraft:conduit',
]);
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const census = (records, selector) => Object.fromEntries(
  [...records.reduce((counts, record) => {
    const state = selector(record);
    counts.set(state, (counts.get(state) ?? 0) + 1);
    return counts;
  }, new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
);

const LIGHTING_RHYTHM_BLOCKS = 12;
const TARGET = 'minecraft:sea_lantern';
const LIGHT_EXCLUSION_RADIUS = 4;
const LIGHT_BAND = { minY: 62, maxY: 82 };
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

// --- Bind the survey and the two committed edge releases --------------------
const survey = readJson(SURVEY);
invariant(survey.schemaVersion === 1
  && survey.source?.snapshot === 'data/worldsnap-r08am-post-20260822T161818Z/region',
  'survey source snapshot drifted');
const conflictFreeSegments = survey.pedestrianEdgeCandidates?.conflictFreeSegments;
invariant(Array.isArray(conflictFreeSegments) && conflictFreeSegments.length > 0,
  'survey conflict-free segments missing');
const conflictFreeX = new Set();
for (const range of conflictFreeSegments) {
  if (!range.includes('..')) { conflictFreeX.add(Number(range)); continue; }
  const [a, b] = range.split('..').map(Number);
  for (let v = Math.min(a, b); v <= Math.max(a, b); v += 1) conflictFreeX.add(v);
}
invariant([...conflictFreeX].every((x) => x >= -352 && x <= -148),
  'conflict-free segment outside the Approach Road X envelope');

// Reproduce the deck columns (used only to resolve the centerline z).
const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const deckMap = new Map();
for (let x = -352; x <= -148; x += 1) {
  for (let z = -509; z <= -484; z += 1) {
    deckMap.set(`${x},${z}`, await deckAt(reader, x, z));
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
const centerlineByX = new Map(columns.map((c) => [c.x, c.cz]));

// --- Authoritative built pedestrian-edge cells (from the two committed edge
//     releases), verified present as gray_concrete in the current source -----
const builtEdgeCells = new Map();
for (const edgeFile of [EDGE_BASE, EDGE_EDGE2]) {
  for (const raw of fs.readFileSync(absolute(edgeFile), 'utf8').split(/\r?\n/)) {
    if (!raw.startsWith('REPL ')) continue;
    const f = raw.split(/\s+/);
    invariant(f.length === 9, `${edgeFile} malformed operation`);
    invariant(f[8] === 'minecraft:gray_concrete', `${edgeFile} unexpected edge material ${f[8]}`);
    builtEdgeCells.set(`${f[1]},${f[2]},${f[3]}`, { x: Number(f[1]), y: Number(f[2]), z: Number(f[3]) });
  }
}
invariant(builtEdgeCells.size === 145, `built pedestrian-edge cell count drift: ${builtEdgeCells.size} != 145`);
const sourceCache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!sourceCache.has(key)) {
    sourceCache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  }
  return sourceCache.get(key);
};
let edgePresent = 0;
for (const cell of builtEdgeCells.values()) {
  const st = await sourceAt(cell);
  invariant(st === 'minecraft:gray_concrete',
    `built pedestrian-edge cell missing in current source at (${cell.x},${cell.y},${cell.z}): ${st}`);
  edgePresent += 1;
}
invariant(edgePresent === 145, 'pedestrian-edge presence check incomplete');

// --- Restrict to the survey conflict-free segments; one outer cell per column
const conflictFreeEdgeCells = [...builtEdgeCells.values()].filter((cell) => conflictFreeX.has(cell.x));
invariant(conflictFreeEdgeCells.length > 0, 'no built pedestrian-edge cells in conflict-free segments');
const perColumn = new Map();
for (const cell of conflictFreeEdgeCells) {
  const cz = centerlineByX.get(cell.x);
  if (cz === null || cz === undefined) continue;
  const dist = Math.abs(cell.z - cz);
  const current = perColumn.get(cell.x);
  if (!current || dist > current.dist || (dist === current.dist && cell.z < current.z)) {
    perColumn.set(cell.x, { ...cell, cz, dist });
  }
}
const candidateByX = new Map(perColumn);
const columnsWithEdge = [...candidateByX.keys()].sort((a, b) => a - b);
invariant(columnsWithEdge.length >= 8, `conflict-free edge candidate columns too few: ${columnsWithEdge.length}`);

// --- Regular 12-block road cadence (TE-ROAD-01 `lightingRhythmBlocks: 12`).
//     For each survey conflict-free segment, greedy-pick the built pedestrian
//     edge columns at >= 12 block X-spacing (the first column with a built edge
//     in each step). This yields a regular, bounded cadence along the road
//     without clumping into the dense mid-run clusters or across distinct
//     arrival nodes, while still covering the long central runs.
const segmentXs = [];
for (const range of conflictFreeSegments) {
  if (!range.includes('..')) { segmentXs.push([Number(range)]); continue; }
  const [a, b] = range.split('..').map(Number);
  const xs = [];
  for (let v = Math.min(a, b); v <= Math.max(a, b); v += 1) xs.push(v);
  segmentXs.push(xs);
}
const selected = [];
for (const segment of segmentXs) {
  const presentInSegment = segment.filter((x) => candidateByX.has(x));
  if (presentInSegment.length === 0) continue;
  for (const x of presentInSegment) {
    const last = selected[selected.length - 1];
    if (!last || Math.abs(last.x - x) >= LIGHTING_RHYTHM_BLOCKS) selected.push(candidateByX.get(x));
  }
}
selected.sort((a, b) => a.x - b.x || a.z - b.z);
invariant(selected.length >= 6 && selected.length <= 12,
  `segment-step cadence target count outside bounded range: ${selected.length}`);

// --- Existing-light exclusion: no light block within a 4-block radius around a
//     target (the cadence stays clear of the arrival-pylon clusters). --------
async function nearExistingLight(cell) {
  let near = null;
  for (let dx = -LIGHT_EXCLUSION_RADIUS; dx <= LIGHT_EXCLUSION_RADIUS; dx += 1) {
    for (let dy = -LIGHT_EXCLUSION_RADIUS; dy <= LIGHT_EXCLUSION_RADIUS; dy += 1) {
      for (let dz = -LIGHT_EXCLUSION_RADIUS; dz <= LIGHT_EXCLUSION_RADIUS; dz += 1) {
        if (dx === 0 && dy === 0 && dz === 0) continue;
        const x = cell.x + dx;
        const y = cell.y + dy;
        const z = cell.z + dz;
        if (y < LIGHT_BAND.minY || y > LIGHT_BAND.maxY) continue;
        const st = await sourceAt({ x, y, z });
        if (LIGHT_BLOCKS.has(blockName(st))) { near = `${x},${y},${z}:${blockName(st)}`; break; }
      }
      if (near) break;
    }
    if (near) break;
  }
  if (near) process.stderr.write(`  note ${cell.x},${cell.y},${cell.z} skipped: existing light ${near}\n`);
  return near !== null;
}
const lightFiltered = [];
for (const cell of selected) {
  if (await nearExistingLight(cell)) {
    process.stderr.write(`skipping ${cell.x},${cell.y},${cell.z}: existing light within ${LIGHT_EXCLUSION_RADIUS}\n`);
    continue;
  }
  lightFiltered.push(cell);
}
const finalSelected = lightFiltered;
invariant(finalSelected.length >= 6 && finalSelected.length <= 12,
  `cadence target count outside bounded range: ${finalSelected.length}`);

// --- Exact per-target source guards -----------------------------------------
const ops = [];
for (const cell of finalSelected) {
  const sourceState = await sourceAt(cell);
  invariant(sourceState === 'minecraft:gray_concrete',
    `unexpected source at (${cell.x},${cell.y},${cell.z}): ${sourceState}`);
  const below = await sourceAt({ x: cell.x, y: cell.y - 1, z: cell.z });
  invariant(!isFluid(below) && !isAir(below) && !isHazard(below),
    `support below (${cell.x},${cell.y - 1},${cell.z}) not solid/non-fluid/non-hazard: ${below}`);
  const h1 = await sourceAt({ x: cell.x, y: cell.y + 1, z: cell.z });
  const h2 = await sourceAt({ x: cell.x, y: cell.y + 2, z: cell.z });
  invariant(isAir(h1) && isAir(h2),
    `headroom not two-clear above (${cell.x},${cell.y},${cell.z}): h1=${h1} h2=${h2}`);
  ops.push({
    cell: { x: cell.x, y: cell.y, z: cell.z },
    sourceState,
    targetState: TARGET,
    segment: conflictFreeSegments.find((range) => {
      if (!range.includes('..')) return Number(range) === cell.x;
      const [a, b] = range.split('..').map(Number);
      return cell.x >= Math.min(a, b) && cell.x <= Math.max(a, b);
    }),
  });
}

// Duplicate / noop guard.
const targetKeys = new Set();
for (const record of ops) {
  const key = cellKey(record.cell);
  invariant(!targetKeys.has(key), `duplicate target ${key}`);
  targetKeys.add(key);
  invariant(await sourceAt(record.cell) === record.sourceState
    && record.sourceState !== record.targetState,
  `source/noop guard drift at ${key}`);
}

// --- Interaction halo (3x3x3 around every operated cell) --------------------
const operatedCells = uniqueCells(ops.map(({ cell }) => cell));
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
  if (isHazard(st)) haloForbiddenCount += 1;
}
invariant(haloFluidCount === 0 && haloForbiddenCount === 0,
  `interaction halo fluid/forbidden hazard: ${haloFluidCount}/${haloForbiddenCount}`);

// --- Block-entity and saved-entity clearance over the operated envelope -----
const envelope = boundsOf(operatedCells);
const blockEntities = [];
const savedEntities = [];
for (let cx = Math.floor(envelope.minX / 16); cx <= Math.floor(envelope.maxX / 16); cx += 1) {
  for (let cz = Math.floor(envelope.minZ / 16); cz <= Math.floor(envelope.maxZ / 16); cz += 1) {
    const chunk = await reader.chunk(cx, cz);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (targetKeys.has(cellKey(point))) blockEntities.push({ id: entity.id ?? null, point });
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

// --- Carriageway preservation -----------------------------------------------
const carriagewayKeys = new Set();
for (const column of columns) {
  for (let k = -3; k <= 3; k += 1) {
    carriagewayKeys.add(cellKey({ x: column.x, y: column.deckY, z: column.cz + k }));
  }
}
const carriagewayOverlap = [...targetKeys].filter((key) => carriagewayKeys.has(key));
invariant(carriagewayOverlap.length === 0,
  `cadence target overlaps the 7-wide carriageway window: ${carriagewayOverlap.join(', ')}`);

// --- Preserve the pedestrian edge: every non-target built edge cell stays
//     gray_concrete. The 8-12 cadence cells are replaced by flush sea_lantern
//     (full opaque walkable blocks, same surface level).
const preservedEdgeCells = [...builtEdgeCells.values()].filter((cell) => !targetKeys.has(cellKey(cell)));
invariant(preservedEdgeCells.length === builtEdgeCells.size - ops.length,
  `preserved pedestrian-edge count drift: ${preservedEdgeCells.length}`);

// --- Emit the cadence package (single package, exact inverse) ---------------
const ordered = ops.slice().sort((a, b) => a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z);
const forwardPath = path.join(OUT_DIR, `${BASENAME}.cadence.forward.txt`);
const rollbackPath = path.join(OUT_DIR, `${BASENAME}.cadence.rollback.txt`);
const forwardBody = `${ordered.map(({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState)).join('\n')}\n`;
const rollbackBody = `${ordered.slice().reverse().map(({ cell, sourceState, targetState }) => replLine(cell, targetState, sourceState)).join('\n')}\n`;
const header = (direction, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID} (cadence ${direction})`,
  `# source root: ${SNAPSHOT}`,
  `# target coordinate-set SHA-256: ${hashCells(operatedCells)}`,
  `# operation SHA-256: ${operationSha256}`,
].join('\n');
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(forwardPath), `${header('forward', forwardSha256)}\n${forwardBody}`);
fs.writeFileSync(absolute(rollbackPath), `${header('rollback', rollbackSha256)}\n${rollbackBody}`);

const operationManifest = {
  cadence: {
    role: `flush Approach Road pedestrian-edge lighting cadence (${ops.length} sea_lantern floor inlays in the built gray_concrete pedestrian edge)`,
    forwardSha256,
    rollbackSha256,
    forwardCommandCount: ordered.length,
    rollbackCommandCount: ordered.length,
    targetCoordinateSetSha256: hashCells(operatedCells),
    exactInverse: true,
  },
};

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
    purpose: 'Add a flush lighting cadence to the Approach Road 2-wide pedestrian edge along the survey conflict-free segments. The edge is as-built (145 gray_concrete cells from CIRC-WL-ARRIVAL-ROAD-01 + -B); this package inlays exact sea_lantern floor blocks in the edge surface at a regular 12-block road rhythm (TE-ROAD-01 lightingRhythmBlocks target), preserving the 7-wide carriageway and the remaining pedestrian edge.',
    treatment: 'FLUSH_PEDESTRIAN_EDGE_LIGHTING_CADENCE_SEA_LANTERN_INLAY',
    builtEdgeCellCount: builtEdgeCells.size,
    conflictFreeSegmentCount: conflictFreeSegments.length,
    lightingRhythmBlocks: LIGHTING_RHYTHM_BLOCKS,
    cadence: classManifest(operatedCells),
    cadenceSelection: ops.map(({ cell, segment }) => ({ x: cell.x, y: cell.y, z: cell.z, segment })),
    preservedEdgeCellCount: preservedEdgeCells.length,
    carriagewayPreservedExactly: true,
    routeCommissioned: false,
  },
  source: {
    snapshotRoot: relative(SNAPSHOT),
    survey: fileBinding(SURVEY),
    edgeBaseRelease: fileBinding(EDGE_BASE),
    edgeEdge2Release: fileBinding(EDGE_EDGE2),
  },
  target: {
    operatedUnion: classManifest(operatedCells),
    desiredStateCensus: census(ops, (record) => record.targetState),
    sourceStateCensus: census(ops, (record) => record.sourceState),
    interactionHalo: classManifest(haloCells),
    packageTargetsDisjoint: true,
  },
  operations: operationManifest,
  packages: [{ key: 'cadence', forward: relative(forwardPath), rollback: relative(rollbackPath) }],
  executionOrder: {
    forward: ['cadence'],
    rollback: ['cadence'],
    gravity: 'single flush pedestrian-edge cadence package; rollback is the exact inverse',
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
  targetCount: ops.length,
  cadenceCellCount: ops.length,
  haloCellCount: haloCells.length,
  haloFluidCount,
  haloForbiddenCount,
  blockEntityIntersectionCount: blockEntities.length,
  savedEntityIntersectionCount: savedEntities.length,
  builtEdgeCellCount: builtEdgeCells.size,
  preservedEdgeCellCount: preservedEdgeCells.length,
  cadenceCells: ops.map(({ cell }) => `${cell.x},${cell.y},${cell.z}`),
}, null, 2)}\n`);
