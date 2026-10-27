#!/usr/bin/env node
/** Compile WLV-CROWN-01 — Westlight venue bowl crown-walk lighting cadence.
 *
 * The MP13 WLV-1 ops survey (data/world-review/westlight-venue-ops-survey-20260824/)
 * documents the bowl crown walk (y82..84) as "sparse" — only 22 light blocks,
 * all clustered at the east screen-core corner, against a ~797-cell single
 * connected walk ring. The two prior cleanly-buildable lighting items from the
 * same survey were already delivered:
 *   - WLV-EGRESS-01 (2026-08-25): field-rim wall cadence at y59 (18 cells);
 *   - WLV-CONCOURSE-ARM-01 (2026-08-25): main concourse-ring ceiling cadence at
 *     y72 (36 cells).
 * This package is the third, distinct cleanly-buildable maintenance item from
 * the same survey, and the final documented under-lit public route: a flush
 * FLOOR lighting cadence on the crown-walk ring surface (polished_andesite /
 * deepslate_tiles at y82, with two clear air blocks above and solid support
 * below), every cell well-spaced from every existing light.
 *
 * Method (matches the repo's established additive lighting pattern — APPROACH-
 * LIGHTS-01 flush inlays, WL-DISTRICT-NEXT-01 flush inlays, WLV-CONCOURSE-ARM-01
 * ceiling inlays):
 *   - Derive the crown walk ring cells: a full-opaque stone-family walk block at
 *     y82 (polished_andesite / deepslate_tiles) with y83 and y84 clear air and a
 *     solid non-fluid non-hazard support at y81.
 *   - A candidate lantern cell is a walk cell itself, replaced by an exact
 *     `minecraft:sea_lantern` floor inlay (a full opaque block), so the walk
 *     surface level is unchanged and the light is purely additive.
 *   - Deterministic greedy cadence selection: Chebyshev spacing >= MIN_SPACING
 *     from every existing light and every other selected cell, around the ring
 *     in a stable z-then-x order. The completed ring carries a continuous
 *     cadence instead of the single screen-core cluster.
 *
 * Every emitted cell is an exact one-cell REPL guard; rollback is the exact
 * inverse. No geometry, container, fluid, gravity, block entity, saved entity,
 * protected feature, screen rig, or commissioning claim is touched.
 *
 * Pinned to the accepted r08am post snapshot (same as the survey and the two
 * prior WLV releases). Source guards are re-verified against a fresh live
 * snapshot immediately before execution.
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
const GENERATED_AT = value('--generated-at', '2026-08-25T18:00:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r08am-post-20260822T161818Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'wlv-crown-walk-lighting');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'wlv-crown-walk-lighting';
const RELEASE_ID = 'WLV-CROWN-01';
const RELEASE_NODE_ID = 'CZ-LEGACY-CROSS-AREA-CIRCULATION';
const SURVEY = 'data/world-review/westlight-venue-ops-survey-20260824/westlight-venue-ops-survey.json';

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
  'minecraft:polished_andesite_stairs', 'minecraft:smooth_stone_stairs', 'minecraft:torch',
]);
const isHazard = (state) => HAZARD_BLOCKS.has(blockName(state)) || blockName(state).endsWith('_shulker_box');
const LIGHT_BLOCKS = new Set([
  'minecraft:sea_lantern', 'minecraft:lantern', 'minecraft:soul_lantern', 'minecraft:glowstone',
  'minecraft:torch', 'minecraft:wall_torch', 'minecraft:end_rod', 'minecraft:shroomlight',
  'minecraft:conduit',
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

const WALK_Y = 82;
const MIN_SPACING = 6;
const WALK_MATERIALS = new Set(['minecraft:polished_andesite', 'minecraft:deepslate_tiles']);
const TARGET = 'minecraft:sea_lantern';
// Crown-walk ring bounds (survey lighting record / civic room census WL-BOWL
// ROOM:4 crown-walk, X -428..-361 / Z -628..-492 plus the full ring which the
// survey counts at y82..84). The ring is the full oval at y82 across the bowl.
const RING_BOUNDS = { minX: -428, maxX: -291, minZ: -629, maxZ: -488 };

const survey = readJson(SURVEY);
invariant(survey.id === 'westlight-venue-ops-survey' && survey.mode === 'READ_ONLY',
  'WLV-1 survey evidence missing or not read-only');
invariant(Number(survey.lighting?.counts?.crown_y82_84) >= 0
  || Number(survey.lighting?.counts?.['crown_y82-84']) >= 0,
  'survey crown lighting record missing');
invariant(Array.isArray(survey.buildabilityAssessment?.cleanlyBuildableAlone)
  && survey.buildabilityAssessment.cleanlyBuildableAlone.some((entry) => entry.includes('sea_lantern')),
  'survey does not endorse additive lighting as cleanly buildable');

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

// --- Derive the crown-walk ring footprint at y82 ---
// A crown walk cell is a full-opaque walk material at y82 with y83 and y84 clear
// air and a solid non-fluid non-hazard support at y81.
const walk = [];
for (let x = RING_BOUNDS.minX; x <= RING_BOUNDS.maxX; x += 1) {
  for (let z = RING_BOUNDS.minZ; z <= RING_BOUNDS.maxZ; z += 1) {
    const s82 = blockName(await sourceAt({ x, y: WALK_Y, z }));
    if (!WALK_MATERIALS.has(s82)) continue;
    const s83 = blockName(await sourceAt({ x, y: WALK_Y + 1, z }));
    const s84 = blockName(await sourceAt({ x, y: WALK_Y + 2, z }));
    if (!isAir(s83) || !isAir(s84)) continue;
    const s81 = await sourceAt({ x, y: WALK_Y - 1, z });
    if (isAir(s81) || isFluid(s81) || isHazard(s81)) continue;
    walk.push({ x, z, material: s82, support: s81 });
  }
}
invariant(walk.length >= 600 && walk.length <= 950,
  `crown-walk ring footprint drift: ${walk.length}`);
const walkSet = new Set(walk.map((cell) => `${cell.x},${cell.z}`));

// --- Existing crown lights (any fixture y82..84 within ring bounds) ---
const existingLights = [];
for (let x = RING_BOUNDS.minX; x <= RING_BOUNDS.maxX; x += 1) {
  for (let z = RING_BOUNDS.minZ; z <= RING_BOUNDS.maxZ; z += 1) {
    for (let y = 82; y <= 84; y += 1) {
      const s = blockName(await sourceAt({ x, y, z }));
      if (LIGHT_BLOCKS.has(s)) existingLights.push({ x, y, z });
    }
  }
}
invariant(existingLights.length >= 5 && existingLights.length <= 80,
  `existing crown-light census drift: ${existingLights.length}`);

// --- Cadence distance proof (pre-build): the ring is currently under-lit ---
let over6Count = 0;
let maxDistance = 0;
let farCell = null;
let distanceSum = 0;
for (const w of walk) {
  let min = Infinity;
  for (const l of existingLights) {
    min = Math.min(min, Math.max(Math.abs(w.x - l.x), Math.abs(w.z - l.z)));
  }
  distanceSum += min;
  if (min > maxDistance) { maxDistance = min; farCell = w; }
  if (min > MIN_SPACING) over6Count += 1;
}
const meanDistance = walk.length ? distanceSum / walk.length : 0;
invariant(over6Count > walk.length * 0.5,
  `crown walk is not actually under-lit (${over6Count}/${walk.length} cells >${MIN_SPACING})`);

// --- Deterministic greedy cadence: Chebyshev spacing >= MIN_SPACING ---
// Stable ring order: z descending (south first) then x ascending.
const orderedCandidates = walk.slice().sort((a, b) => b.z - a.z || a.x - b.x);
const placed = existingLights.map((light) => ({ x: light.x, z: light.z }));
const selected = [];
for (const candidate of orderedCandidates) {
  const d = Math.min(...placed.map((p) => Math.max(Math.abs(candidate.x - p.x), Math.abs(candidate.z - p.z))));
  if (d >= MIN_SPACING) {
    selected.push(candidate);
    placed.push({ x: candidate.x, z: candidate.z });
  }
}
invariant(selected.length >= 30, `crown cadence target count too small: ${selected.length}`);
invariant(new Set(selected.map((c) => `${c.x},${c.z}`)).size === selected.length,
  'cadence contains duplicate targets');

// --- Build exact operations ---
const ops = selected.map((cell) => ({
  cell: { x: cell.x, y: WALK_Y, z: cell.z },
  sourceState: cell.material,
  targetState: TARGET,
}));

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

// --- Walk-surface / headroom preservation proof ---
// Every operated cell is the walk surface itself (flush inlay). Verify each
// target still has the two-clear headroom and solid support after the guard.
for (const record of ops) {
  const { x, y, z } = record.cell;
  invariant(y === WALK_Y, `target is not at the crown walk band: (${x},${y},${z})`);
  const h1 = blockName(await sourceAt({ x, y: y + 1, z }));
  const h2 = blockName(await sourceAt({ x, y: y + 2, z }));
  invariant(isAir(h1) && isAir(h2), `target headroom not two-clear: (${x},${y},${z})`);
  const below = await sourceAt({ x, y: y - 1, z });
  invariant(!isAir(below) && !isFluid(below) && !isHazard(below),
    `target support not solid/non-fluid/non-hazard: (${x},${y},${z})`);
}

// --- Interaction halo (3x3x3 around every operated cell) ---
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

// --- Block-entity and saved-entity clearance over the operated envelope ---
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

// --- Preserve every non-target crown walk cell (flush inlay only changes the
//     selected cells; the rest of the ring stays byte-identical). ---
const preservedWalkCells = walk.filter((cell) => !targetKeys.has(`${cell.x},${WALK_Y},${cell.z}`));
invariant(preservedWalkCells.length === walk.length - ops.length,
  `preserved crown-walk cell count drift: ${preservedWalkCells.length}`);

// --- Emit the cadence package (single package, exact inverse) ---
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
    role: `crown-walk floor lighting cadence (${ops.length} sea_lantern flush inlays at y82)`,
    forwardSha256,
    rollbackSha256,
    forwardCommandCount: ordered.length,
    rollbackCommandCount: ordered.length,
    targetCoordinateSetSha256: hashCells(operatedCells),
    exactInverse: true,
  },
};

const cadenceSelection = selected.map((cell) => ({ x: cell.x, y: WALK_Y, z: cell.z }));

const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: TRANSACTION_ID,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_SNAPSHOT_OFFLINE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: false,
  scopeIds: ['WESTLIGHT-VENUE'],
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'westlight-venue',
    purpose: 'Add a bounded flush floor lighting cadence (sea_lantern) along the bowl crown-walk ring at y82, closing the WLV-1 survey finding that the crown walk (y82-84) is "sparse" — every crown walk cell is currently more than 6 blocks from any light (mean ~84 blocks), with the only 22 fixtures clustered at the east screen-core corner. Each sea_lantern flush-inlays an exact polished_andesite / deepslate_tiles walk cell with two clear air blocks above and solid non-fluid support below, preserving the walk surface level and headroom.',
    treatment: 'CROWN_WALK_FLOOR_LIGHTING_CADENCE_SEA_LANTERN_INLAY',
    walkY: WALK_Y,
    ringWalkCellCount: walk.length,
    existingCrownLightCount: existingLights.length,
    existingCrownLights: existingLights,
    built: classManifest(operatedCells),
    cadenceCells: classManifest(operatedCells),
    cadenceSelection,
    minimumSpacing: MIN_SPACING,
    preBuildDistanceProof: {
      meanDistanceToNearestLight: Number(meanDistance.toFixed(1)),
      maxDistanceToNearestLight: maxDistance,
      farthestCell: farCell,
      cellsOverMinimumSpacing: over6Count,
    },
    walkMaterials: [...WALK_MATERIALS].sort(),
    walkSurfaceChanged: false,
    headroomChanged: false,
    egressGeometryChanged: false,
    routeCommissioned: false,
    commissions: 'PASSIVE_NORMAL_ILLUMINATION_ONLY',
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
    gravity: 'single flush floor-inlay cadence package; rollback is the exact inverse',
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
  ringWalkCellCount: walk.length,
  existingCrownLightCount: existingLights.length,
  meanDistanceToNearestLight: Number(meanDistance.toFixed(1)),
  maxDistanceToNearestLight: maxDistance,
  preservedCrownWalkCellCount: preservedWalkCells.length,
  cadenceCells: selected.map((c) => `${c.x},${WALK_Y},${c.z}`),
  sourceSnapshot: SNAPSHOT,
}, null, 2)}\n`);
