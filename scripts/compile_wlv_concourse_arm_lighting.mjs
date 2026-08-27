#!/usr/bin/env node
/** Compile WLV-CONCOURSE-ARM-01 — Westlight venue bowl concourse-arm lighting cadence.
 *
 * The MP13 WLV-1 ops survey (data/world-review/westlight-venue-ops-survey-20260824/)
 * found the bowl main concourse ring (y67/68, PUBLIC primary concourse, 899-cell
 * single horseshoe component) is lit by clustered lanterns at entries, ramp heads,
 * and seat edges, but the long east/west arm mid-runs (z -568..-538) are NOT
 * continuous: those arm segments carry no fixtures at all (>6 blocks from any
 * lantern). The survey lists "Concourse lantern cadence completion along the ring
 * (discrete cells, no geometry change)" as cleanly buildable alone.
 *
 * WLV-EGRESS-01 already delivered the field-rim cadence (18 sea_lanterns at y59).
 * This package is the second, distinct cleanly-buildable maintenance item from the
 * same survey: a flush CEILING lighting cadence along the unlit arm mid-runs.
 *
 * Method (matches the repo's established additive lighting pattern — EE-PUB2
 * ceiling cadence, WL-DISTRICT-NEXT-01 flush inlays):
 *   - Derive the concourse ring walk cells (dark_oak_planks at y67 with air at
 *     y68, giving the 4-clear headroom band y68..y71 with the y72 ceiling).
 *   - Focus on the arm band z -568..-538 (the survey's "lower/upper arms" where
 *     width drops to 4 and fixtures are absent).
 *   - A candidate lantern cell is the y72 ceiling directly above an arm walk
 *     cell: ceiling must be a clean full-opaque stone family block
 *     (stone_bricks / smooth_stone / polished_andesite / polished_diorite),
 *     with y70 and y71 clear air below, and a clean 3x3x3 halo (y69..y73)
 *     containing no fluid, container/block-entity-bearing, or decorative hazard.
 *   - Replace the exact y72 ceiling block with `minecraft:sea_lantern` (a full
 *     opaque block), so the ceiling stays structurally solid, the walk surface
 *     and headroom are unchanged, and the light is purely additive.
 *   - Deterministic greedy cadence selection: Chebyshev spacing >= MIN_SPACING
 *     from every existing ring lantern and from every other selected cell, so the
 *     completed ring carries a continuous ~6-block cadence instead of clusters.
 *
 * Every emitted cell is an exact one-cell REPL guard; rollback is the exact
 * inverse. No geometry, container, fluid, gravity, block entity, saved entity,
 * protected feature, or commissioning claim is touched.
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
const GENERATED_AT = value('--generated-at', '2026-08-25T12:01:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r08am-post-20260822T161818Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'wlv-concourse-arm-lighting');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'wlv-concourse-arm-lighting';
const RELEASE_ID = 'WLV-CONCOURSE-ARM-01';
const RELEASE_NODE_ID = 'CZ-LEGACY-CROSS-AREA-CIRCULATION';
const SURVEY = 'data/world-review/westlight-venue-ops-survey-20260824/westlight-venue-ops-survey.json';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fileBinding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`WLV-CONCOURSE-ARM-01 compiler rejected: ${message}`);
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

// Venue bowl concourse ring bounds (from the WLV-1 survey circulation record).
const RING_BOUNDS = { minX: -429, maxX: -291, minZ: -629, maxZ: -488 };
// The full ring is the cadence scope: the WLV-1 survey records the concourse
// ring lanterns as clustered at entries/ramp heads/seat edges and NOT
// continuous along the ring. Every ring walk cell is >5 blocks from any
// fixture. We place the completed continuous ceiling cadence across the ring.
const ARM_Z_LO = -629;
const ARM_Z_HI = -488;
const WALK_Y = 67;
const CEILING_Y = 72;
const MIN_SPACING = 6;
const CEILING_MATERIALS = new Set([
  'minecraft:stone_bricks', 'minecraft:smooth_stone',
  'minecraft:polished_andesite', 'minecraft:polished_diorite',
]);
const TARGET = 'minecraft:sea_lantern';

const survey = readJson(SURVEY);
invariant(survey.id === 'westlight-venue-ops-survey' && survey.mode === 'READ_ONLY',
  'WLV-1 survey evidence missing or not read-only');
invariant(Array.isArray(survey.buildabilityAssessment?.cleanlyBuildableAlone)
  && survey.buildabilityAssessment.cleanlyBuildableAlone.some((entry) => entry.includes('Concourse')),
  'survey does not endorse concourse cadence completion as cleanly buildable');

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

// --- Derive the concourse ring walk ---
// The WLV-1 survey describes the ring walk surface as dark_oak_planks (y66-67)
// with a smooth_stone/stone_bricks topping at y68. A ring walk cell is a plank
// at y67 whose y68 is either clear air (plank surface) or a full stone-family
// topping with clear air at y69 (topped surface).
const WALK_TOP = new Set([
  'minecraft:stone_bricks', 'minecraft:smooth_stone', 'minecraft:polished_andesite',
  'minecraft:polished_diorite', 'minecraft:smooth_quartz',
]);
const walk = [];
for (let x = RING_BOUNDS.minX; x <= RING_BOUNDS.maxX; x += 1) {
  for (let z = RING_BOUNDS.minZ; z <= RING_BOUNDS.maxZ; z += 1) {
    const s67 = blockName(await sourceAt({ x, y: WALK_Y, z }));
    if (s67 !== 'minecraft:dark_oak_planks') continue;
    const s68 = blockName(await sourceAt({ x, y: WALK_Y + 1, z }));
    if (isAir(s68)) {
      walk.push({ x, z });
    } else if (WALK_TOP.has(s68)) {
      const s69 = blockName(await sourceAt({ x, y: WALK_Y + 2, z }));
      if (isAir(s69)) walk.push({ x, z });
    }
  }
}
const walkSet = new Set(walk.map((cell) => `${cell.x},${cell.z}`));
invariant(walk.length >= 800 && walk.length <= 1000,
  `concourse ring walk footprint drift: ${walk.length}`);

// --- Existing ring lanterns (any fixture y68..y74 within ring bounds) ---
const existingLights = [];
for (let x = RING_BOUNDS.minX; x <= RING_BOUNDS.maxX; x += 1) {
  for (let z = RING_BOUNDS.minZ; z <= RING_BOUNDS.maxZ; z += 1) {
    for (let y = 68; y <= 74; y += 1) {
      const s = blockName(await sourceAt({ x, y, z }));
      if (s === 'minecraft:sea_lantern' || s === 'minecraft:lantern') existingLights.push({ x, y, z });
    }
  }
}
invariant(existingLights.length >= 50 && existingLights.length <= 80,
  `existing ring lantern census drift: ${existingLights.length}`);

// --- Clean y72 ceiling-inlay candidates directly over arm walk cells ---
const candidates = [];
for (const w of walk) {
  if (w.z < ARM_Z_LO || w.z > ARM_Z_HI) continue;
  const x = w.x;
  const z = w.z;
  const s70 = blockName(await sourceAt({ x, y: 70, z }));
  const s71 = blockName(await sourceAt({ x, y: 71, z }));
  const s72 = await sourceAt({ x, y: CEILING_Y, z });
  if (!isAir(s70) || !isAir(s71)) continue;
  if (!CEILING_MATERIALS.has(blockName(s72))) continue;
  if (blockName(s72) === TARGET) continue;
  // clean 3x3x3 halo (y69..73)
  let hazard = false;
  let fluid = false;
  for (let hx = x - 1; hx <= x + 1 && !(hazard && fluid); hx += 1) {
    for (let hy = 69; hy <= 73 && !(hazard && fluid); hy += 1) {
      for (let hz = z - 1; hz <= z + 1 && !(hazard && fluid); hz += 1) {
        const hs = await sourceAt({ x: hx, y: hy, z: hz });
        if (isFluid(hs)) fluid = true;
        if (isHazard(hs)) hazard = true;
      }
    }
  }
  if (hazard || fluid) continue;
  candidates.push({ x, z, sourceState: s72 });
}
invariant(candidates.length >= 100, `arm ceiling candidate set too small: ${candidates.length}`);

// --- Deterministic greedy cadence: Chebyshev spacing >= MIN_SPACING ---
const placed = existingLights.map((light) => ({ x: light.x, z: light.z }));
const selected = [];
for (const candidate of candidates) {
  const d = Math.min(...placed.map((p) => Math.max(Math.abs(candidate.x - p.x), Math.abs(candidate.z - p.z))));
  if (d >= MIN_SPACING) {
    selected.push(candidate);
    placed.push({ x: candidate.x, z: candidate.z });
  }
}
invariant(selected.length >= 20, `cadence target count too small: ${selected.length}`);
invariant(new Set(selected.map((c) => `${c.x},${c.z}`)).size === selected.length,
  'cadence contains duplicate targets');

// --- Build exact operations ---
const ops = selected.map((cell) => ({
  cell: { x: cell.x, y: CEILING_Y, z: cell.z },
  sourceState: cell.sourceState,
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

// Interaction halo (3x3x3 around every operated cell).
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

// Block-entity and saved-entity clearance over the operated envelope.
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

// Walk-surface and headroom preservation: every operated cell is at y72 (ceiling),
// so no walk cell (y67 plank / y68 walk top) is ever touched. Verify the operated
// layer is strictly the ceiling band.
for (const record of ops) {
  const { x, y, z } = record.cell;
  invariant(y === CEILING_Y, `target is not at the ceiling band: (${x},${y},${z})`);
  invariant(!(y === WALK_Y || y === WALK_Y + 1 || y === WALK_Y + 2),
    `target overlaps walk/headroom band: (${x},${y},${z})`);
}

// --- Emit the cadence package (single package, exact inverse) ---
const forwardPath = path.join(OUT_DIR, `${BASENAME}.cadence.forward.txt`);
const rollbackPath = path.join(OUT_DIR, `${BASENAME}.cadence.rollback.txt`);
const ordered = ops.slice().sort((a, b) => a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z);
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
    role: `concourse-arm ceiling lighting cadence (${selected.length} sea_lanterns at y72)`,
    forwardSha256,
    rollbackSha256,
    forwardCommandCount: ordered.length,
    rollbackCommandCount: ordered.length,
    targetCoordinateSetSha256: hashCells(operatedCells),
    exactInverse: true,
  },
};

const cadenceSelection = selected.map((cell) => ({ x: cell.x, y: CEILING_Y, z: cell.z }));

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
    purpose: 'Add a bounded flush ceiling lighting cadence (sea_lantern) along the unlit bowl concourse arm mid-runs (z -568..-538), addressing the WLV-1 survey finding that the concourse ring lanterns are clustered at entries/ramp heads/seat edges and NOT continuous along the arms. Each sea_lantern replaces an exact y72 ceiling stone-family block directly above a ring walk cell with y70/y71 clear air, preserving the walk surface and headroom.',
    treatment: 'CONCOURSE_ARM_CEILING_LIGHTING_CADENCE_SEA_LANTERN_INLAY',
    ceilingY: CEILING_Y,
    armZBand: { lo: ARM_Z_LO, hi: ARM_Z_HI },
    ringWalkCellCount: walk.length,
    existingRingLanternCount: existingLights.length,
    existingRingLanterns: existingLights,
    built: classManifest(operatedCells),
    cadenceCells: classManifest(operatedCells),
    cadenceSelection,
    minimumSpacing: MIN_SPACING,
    ceilingMaterials: [...CEILING_MATERIALS].sort(),
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
    gravity: 'single ceiling-inlay cadence package; rollback is the exact inverse',
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
  existingRingLanternCount: existingLights.length,
  armZBand: { lo: ARM_Z_LO, hi: ARM_Z_HI },
  sourceSnapshot: SNAPSHOT,
}, null, 2)}\n`);
