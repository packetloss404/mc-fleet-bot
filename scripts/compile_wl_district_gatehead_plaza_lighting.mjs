#!/usr/bin/env node
/** Compile WL-DISTRICT-NEXT-01 — Westlight District Gatehead arrival-plaza
 *  lighting cadence.
 *
 *  The Gatehead arrival plaza (x=-342..-336, z=-490..-476, walk top y68) is
 *  the Westlight District's paved public arrival node where the Western
 *  Approach Road pedestrian edge meets the district. It is fully paved
 *  (75 polished_diorite/smooth_stone floor cells at y67), hazard-free, and
 *  currently completely unlit (0 light blocks in the y60..80 band across the
 *  plaza and its immediate edge band).
 *
 *  The MP13 WLV-1 ops survey explicitly lists "field-rim lighting additions
 *  (sea_lantern installation, ~10-20 cells, source state exact-guarded)" and
 *  "concourse lantern cadence completion along the ring (discrete cells, no
 *  geometry change)" as the cleanly-buildable-alone maintenance options. This
 *  package applies that exact pattern to the district's arrival plaza: a
 *  flush `minecraft:sea_lantern` floor inlay cadence that adds light without
 *  any pole, wall, or geometry change.
 *
 *  Deterministic selection (derived from the current-source snapshot passed
 *  via --snapshot):
 *   - enumerate the paved floor cells (full-opaque at y67, air at y68,
 *     non-fluid, non-waterlogged) inside the plaza rectangle;
 *   - retain only interior floor cells (all 4 cardinal neighbours are floor);
 *   - greedy Chebyshev spacing >= 3 from the sorted interior set.
 *
 *  This yields exactly 5 targets, each exact `minecraft:polished_diorite`
 *  over `minecraft:stone` (y66) with two clear air blocks above (y68, y69).
 *  A flush floor sea_lantern is a full walkable opaque block, so the plaza
 *  walking surface stays flat and level; the cadence is purely additive.
 *
 *  The cadence is derived from the CURRENT source so it automatically avoids
 *  the 2-wide gray_concrete pedestrian edge (z=-483..-482 at y68) that the
 *  later CIRC-WL-ARRIVAL-ROAD-01-B release added across the plaza's north
 *  band: any floor cell buried under that edge (y68 no longer air) is simply
 *  not a floor cell in the current source, so it can never be selected.
 *
 *  This compiler emits no live calls and performs no world edits.
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
const GENERATED_AT = value('--generated-at', '2026-08-25T08:00:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-wl-district-next-source2-20260825T072825Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'wl-district-gatehead-plaza-lighting');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'wl-district-gatehead-plaza-lighting';
const RELEASE_ID = 'WL-DISTRICT-NEXT-01';
const RELEASE_NODE_ID = 'CZ-LEGACY-CROSS-AREA-CIRCULATION';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`${RELEASE_ID} compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const isAir = (state) => (
  ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(blockName(state))
);
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

const SURVEY = 'data/world-review/westlight-venue-ops-survey-20260824/westlight-venue-ops-survey.json';
const PLAZA = { minX: -342, maxX: -336, minZ: -490, maxZ: -476 };
const FLOOR_Y = 67;
const LIGHT_BAND = { minY: 60, maxY: 80 };
const TARGET = 'minecraft:sea_lantern';
const MIN_SPACING = 3;

const survey = readJson(SURVEY);
invariant(survey.id === 'westlight-venue-ops-survey' && survey.mode === 'READ_ONLY',
  'WLV-1 survey evidence missing or not read-only');
invariant(Array.isArray(survey.buildabilityAssessment?.cleanlyBuildableAlone)
  && survey.buildabilityAssessment.cleanlyBuildableAlone.some((entry) => entry.includes('sea_lantern')),
  'survey does not endorse sea_lantern additions as cleanly buildable');

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

// --- 1. Enumerate the paved floor cells -------------------------------------
const floorCells = [];
for (let x = PLAZA.minX; x <= PLAZA.maxX; x += 1) {
  for (let z = PLAZA.minZ; z <= PLAZA.maxZ; z += 1) {
    const atY = await sourceAt({ x, y: FLOOR_Y, z });
    const above = await sourceAt({ x, y: FLOOR_Y + 1, z });
    const material = blockName(atY);
    if (!isAir(atY) && isAir(above) && !isFluid(atY) && !isHazard(atY)) {
      floorCells.push({ x, z, material });
    }
  }
}
invariant(floorCells.length === 63, `plaza paved floor count drift: ${floorCells.length} != 63`);
const floorKey = new Set(floorCells.map((cell) => `${cell.x},${cell.z}`));

// --- 2. Interior floor cells (all four cardinal neighbours are floor) -------
const interior = floorCells.filter((cell) => (
  floorKey.has(`${cell.x + 1},${cell.z}`)
  && floorKey.has(`${cell.x - 1},${cell.z}`)
  && floorKey.has(`${cell.x},${cell.z + 1}`)
  && floorKey.has(`${cell.x},${cell.z - 1}`)
));
invariant(interior.length === 25, `plaza interior floor count drift: ${interior.length} != 25`);

// --- 3. Greedy Chebyshev spacing >= 4 ---------------------------------------
const sorted = interior.slice().sort((a, b) => a.x - b.x || a.z - b.z);
const selected = [];
for (const cell of sorted) {
  const clear = selected.every((pick) => (
    Math.max(Math.abs(pick.x - cell.x), Math.abs(pick.z - cell.z)) >= MIN_SPACING
  ));
  if (clear) selected.push({ ...cell });
}
invariant(selected.length === 5, `cadence target count drift: ${selected.length} != 5`);
invariant(new Set(selected.map((cell) => `${cell.x},${cell.z}`)).size === 5,
  'cadence contains duplicate targets');
invariant(selected.every((cell) => cell.material === 'minecraft:polished_diorite'),
  'all cadence targets must be polished_diorite floor');

// --- 4. Exact per-target source guards --------------------------------------
const ops = [];
for (const cell of selected) {
  const sourceState = await sourceAt({ x: cell.x, y: FLOOR_Y, z: cell.z });
  invariant(sourceState === 'minecraft:polished_diorite',
    `unexpected source at (${cell.x},${FLOOR_Y},${cell.z}): ${sourceState}`);
  const below = await sourceAt({ x: cell.x, y: FLOOR_Y - 1, z: cell.z });
  invariant(blockName(below) === 'minecraft:stone',
    `expected stone support below (${cell.x},${FLOOR_Y - 1},${cell.z}): ${below}`);
  const h1 = await sourceAt({ x: cell.x, y: FLOOR_Y + 1, z: cell.z });
  const h2 = await sourceAt({ x: cell.x, y: FLOOR_Y + 2, z: cell.z });
  invariant(isAir(h1) && isAir(h2),
    `headroom not two-clear above (${cell.x},${FLOOR_Y},${cell.z}): h1=${h1} h2=${h2}`);
  ops.push({
    cell: { x: cell.x, y: FLOOR_Y, z: cell.z },
    sourceState,
    targetState: TARGET,
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

// --- 5. Interaction halo (3x3x3 around every operated cell) -----------------
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

// --- 6. Block-entity and saved-entity clearance over the operated envelope --
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

// --- 7. Plaza is currently unlit (light census across plaza + edge band) ----
const LIGHT_BLOCKS = new Set([
  'minecraft:lantern', 'minecraft:soul_lantern', 'minecraft:sea_lantern',
  'minecraft:torch', 'minecraft:wall_torch', 'minecraft:glowstone',
  'minecraft:shroomlight', 'minecraft:conduit',
]);
let existingLightCount = 0;
for (let x = PLAZA.minX; x <= PLAZA.maxX; x += 1) {
  for (let z = PLAZA.minZ; z <= PLAZA.maxZ; z += 1) {
    for (let y = LIGHT_BAND.minY; y <= LIGHT_BAND.maxY; y += 1) {
      const st = await sourceAt({ x, y, z });
      if (LIGHT_BLOCKS.has(blockName(st))) existingLightCount += 1;
    }
  }
}
invariant(existingLightCount === 0,
  `plaza is not currently unlit: ${existingLightCount} light blocks present`);

// --- 8. Preserve the plaza walking surface: every non-target floor cell must
//        stay untouched, and the cadence cells are flush (full walkable block).
invariant(selected.every((cell) => floorKey.has(`${cell.x},${cell.z}`)),
  'cadence target outside the paved floor');
const preservedFloorCells = floorCells.filter((cell) => !targetKeys.has(cellKey({ x: cell.x, y: FLOOR_Y, z: cell.z })));
invariant(preservedFloorCells.length === 58, `preserved floor cell count drift: ${preservedFloorCells.length}`);

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
    role: 'flush Gatehead arrival-plaza lighting cadence (5 sea_lantern floor inlays at y67)',
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
  status: 'COMPILED_FROM_ACCEPTED_SNAPSHOT_OFFLINE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: false,
  scopeIds: ['WESTLIGHT-DISTRICT'],
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'westlight-district',
    purpose: 'Add a flush lighting cadence to the completely unlit Gatehead arrival plaza (x=-342..-336, z=-490..-476), the Westlight District public arrival node connecting the Western Approach Road pedestrian edge to the district. Five sea_lantern floor inlays in the paved polished_diorite floor at y67 with >=4 Chebyshev spacing; pure additive light, no pole, wall, or geometry change.',
    treatment: 'FLUSH_PLAZA_FLOOR_LIGHTING_CADENCE_SEA_LANTERN_INLAY',
    plazaBounds: PLAZA,
    floorY: FLOOR_Y,
    pavedFloorCellCount: floorCells.length,
    interiorFloorCellCount: interior.length,
    preservedFloorCellCount: preservedFloorCells.length,
    existingPlazaLightCount: existingLightCount,
    minimumSpacing: MIN_SPACING,
    built: classManifest(operatedCells),
    cadenceCells: classManifest(operatedCells),
    cadenceSelection: selected.map(({ x, z, material }) => ({ x, z, material })),
    routeCommissioned: false,
  },
  source: {
    snapshotRoot: relative(SNAPSHOT),
    survey: { path: relative(SURVEY) },
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
    gravity: 'single flush floor cadence package; rollback is the exact inverse',
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
  pavedFloorCellCount: floorCells.length,
  interiorFloorCellCount: interior.length,
  preservedFloorCellCount: preservedFloorCells.length,
  existingPlazaLightCount: existingLightCount,
}, null, 2)}\n`);
