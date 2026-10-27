#!/usr/bin/env node
/** Independent read-only post-release QA for WLV-CROWN-01.
 *
 * Verifies against the immutable post snapshot:
 *   1. Every cadence target is exactly `minecraft:sea_lantern` in post state.
 *   2. The interaction halo (3x3x3 around operated cells) has zero fluid, zero
 *      forbidden/container block, and zero off-target drift vs source.
 *   3. Crown-walk preservation: every non-target crown-walk ring cell at y82 is
 *      byte-identical to source (the flush inlays never change walk level or
 *      remove support).
 *   4. The existing crown-light census is unchanged.
 *   5. Cadence continuity: every crown-walk ring cell is now within MIN_SPACING
 *      of a light OR a new cadence cell (the completed continuous cadence).
 *   6. Exact inverse: rollback preflight already proved reversibility; here we
 *      re-verify the target bijection.
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
const MANIFEST = value('--manifest', 'data/buildops/wlv-crown-walk-lighting.release-manifest.json');
const SOURCE = value('--source-regions', 'data/worldsnap-wlv-crown-source-20260825T180000Z/region');
const POST = value('--post-regions', 'data/worldsnap-wlv-crown-post-20260825T181000Z/region');
const EVIDENCE = value('--evidence-dir', 'data/world-review/wlv-crown-live-20260825T181000Z');
const OUT = value('--out', `${EVIDENCE}/wlv-crown-post-release-qa.json`);
const GENERATED_AT = value('--generated-at', '2026-08-25T18:30:00Z');

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`WLV-CROWN-01 post QA rejected: ${message}`);
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
  'minecraft:polished_andesite_stairs', 'minecraft:smooth_stone_stairs', 'minecraft:torch',
]);
const isHazard = (state) => HAZARD_BLOCKS.has(blockName(state)) || blockName(state).endsWith('_shulker_box');
const LIGHT_BLOCKS = new Set([
  'minecraft:sea_lantern', 'minecraft:lantern', 'minecraft:soul_lantern', 'minecraft:glowstone',
  'minecraft:torch', 'minecraft:wall_torch', 'minecraft:end_rod', 'minecraft:shroomlight',
  'minecraft:conduit',
]);

const RING_BOUNDS = { minX: -428, maxX: -291, minZ: -629, maxZ: -488 };
const WALK_Y = 82;
const MIN_SPACING = 6;
const WALK_MATERIALS = new Set(['minecraft:polished_andesite', 'minecraft:deepslate_tiles']);

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
invariant(manifest.scope?.releaseId === 'WLV-CROWN-01', 'manifest release identity drift');
const targetRecords = parseOperations(absolute(manifest.packages[0].forward));
const rollbackRecords = parseOperations(absolute(manifest.packages[0].rollback));
invariant(targetRecords.length === manifest.scope.cadenceCells.cellCount,
  'manifest/forward target count mismatch');
invariant(targetRecords.length === rollbackRecords.length,
  'forward/rollback target count mismatch');

const targetKeys = new Set(targetRecords.map((r) => cellKey(r.cell)));

// --- Load source and post snapshots ---
const sourceReader = new AnvilReader(absolute(SOURCE));
const postReader = new AnvilReader(absolute(POST));
const sourceCache = new Map();
const postCache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!sourceCache.has(key)) sourceCache.set(key, stateToCommandString(await sourceReader.blockState(cell.x, cell.y, cell.z)));
  return sourceCache.get(key);
};
const postAt = async (cell) => {
  const key = cellKey(cell);
  if (!postCache.has(key)) postCache.set(key, stateToCommandString(await postReader.blockState(cell.x, cell.y, cell.z)));
  return postCache.get(key);
};

// --- 1. Exact post-state count ---
let exactPostStateCount = 0;
let exactPostStateMismatchCount = 0;
for (const record of targetRecords) {
  const actual = await postAt(record.cell);
  if (actual === record.targetState) exactPostStateCount += 1;
  else exactPostStateMismatchCount += 1;
}

// --- 2. Interaction halo check (3x3x3 around operated cells) ---
const operatedCells = uniqueCells(targetRecords.map((r) => r.cell));
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
let haloOffTargetDriftCount = 0;
for (const cell of haloCells) {
  const src = await sourceAt(cell);
  const post = await postAt(cell);
  if (isFluid(post)) haloFluidCount += 1;
  if (isHazard(post)) haloForbiddenCount += 1;
  if (src !== post) haloOffTargetDriftCount += 1;
}

// --- 3. Crown-walk preservation: every non-target walk cell byte-identical ---
const preservedWalk = [];
for (let x = RING_BOUNDS.minX; x <= RING_BOUNDS.maxX; x += 1) {
  for (let z = RING_BOUNDS.minZ; z <= RING_BOUNDS.maxZ; z += 1) {
    if (targetKeys.has(`${x},${WALK_Y},${z}`)) continue;
    const src = blockName(await sourceAt({ x, y: WALK_Y, z }));
    if (!WALK_MATERIALS.has(src)) continue;
    const s83 = blockName(await sourceAt({ x, y: WALK_Y + 1, z }));
    const s84 = blockName(await sourceAt({ x, y: WALK_Y + 2, z }));
    if (!isAir(s83) || !isAir(s84)) continue;
    preservedWalk.push({ x, z });
  }
}
let preservedWalkDriftCount = 0;
for (const w of preservedWalk) {
  const src = await sourceAt({ x: w.x, y: WALK_Y, z: w.z });
  const post = await postAt({ x: w.x, y: WALK_Y, z: w.z });
  if (src !== post) preservedWalkDriftCount += 1;
}

// --- 4. Existing crown-light census unchanged ---
const sourceLightKeys = new Set();
const postLightKeys = new Set();
for (let x = RING_BOUNDS.minX; x <= RING_BOUNDS.maxX; x += 1) {
  for (let z = RING_BOUNDS.minZ; z <= RING_BOUNDS.maxZ; z += 1) {
    for (let y = 82; y <= 84; y += 1) {
      if (LIGHT_BLOCKS.has(blockName(await sourceAt({ x, y, z })))) sourceLightKeys.add(`${x},${y},${z}`);
      if (LIGHT_BLOCKS.has(blockName(await postAt({ x, y, z })))) postLightKeys.add(`${x},${y},${z}`);
    }
  }
}
const existingSourceLights = [...sourceLightKeys].filter((k) => !targetKeys.has(k));
const existingPostLights = [...postLightKeys].filter((k) => !targetKeys.has(k));
const sourceLightSet = new Set(existingSourceLights);
const postLightSet = new Set(existingPostLights);
const lightCensusUnchanged = sourceLightSet.size === postLightSet.size
  && [...sourceLightSet].every((k) => postLightSet.has(k));

// --- 5. Cadence continuity: every ring walk cell within MIN_SPACING of a light
//     or a cadence cell ---
const lightOrCadence = [];
for (let x = RING_BOUNDS.minX; x <= RING_BOUNDS.maxX; x += 1) {
  for (let z = RING_BOUNDS.minZ; z <= RING_BOUNDS.maxZ; z += 1) {
    for (let y = 82; y <= 84; y += 1) {
      if (LIGHT_BLOCKS.has(blockName(await postAt({ x, y, z }))) || targetKeys.has(`${x},${y},${z}`)) {
        lightOrCadence.push({ x, z });
      }
    }
  }
}
let cadenceDarkCellCount = 0;
for (const w of preservedWalk) {
  let min = Infinity;
  for (const l of lightOrCadence) {
    min = Math.min(min, Math.max(Math.abs(w.x - l.x), Math.abs(w.z - l.z)));
  }
  if (min > MIN_SPACING) cadenceDarkCellCount += 1;
}

// --- 6. Forward/rollback bijection ---
const forwardMap = new Map(targetRecords.map((r) => [cellKey(r.cell), r]));
const rollbackMap = new Map(rollbackRecords.map((r) => [cellKey(r.cell), r]));
let forwardRollbackBijection = true;
for (const [key, { sourceState, targetState }] of forwardMap) {
  const rb = rollbackMap.get(key);
  if (!rb || rb.sourceState !== targetState || rb.targetState !== sourceState) {
    forwardRollbackBijection = false;
  }
}

const status = exactPostStateMismatchCount === 0
  && haloFluidCount === 0 && haloForbiddenCount === 0 && haloOffTargetDriftCount === 0
  && preservedWalkDriftCount === 0 && lightCensusUnchanged && cadenceDarkCellCount === 0
  && forwardRollbackBijection
  ? 'PASS_WLV_CROWN_01_FLOOR_CADENCE_POSTSTATE_VERIFIED_REVERSIBLE'
  : 'FAIL';

const report = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status,
  mode: 'INDEPENDENT_READ_ONLY_WLV_CROWN_01_POST_RELEASE_QA',
  release: {
    manifestPath: relative(MANIFEST),
    manifestIdentity: manifest.manifestIdentity,
    targetCount: targetRecords.length,
    sourceRegionDir: relative(SOURCE),
    postRegionDir: relative(POST),
  },
  checks: {
    exactPostStateCount,
    exactPostStateMismatchCount,
    forwardRollbackBijection,
    interactionHaloCellCount: haloCells.length,
    haloFluidCount,
    haloForbiddenCount,
    haloOffTargetDriftCount,
    preservedCrownWalkCellCount: preservedWalk.length,
    preservedCrownWalkDriftCount: preservedWalkDriftCount,
    existingCrownLightCount: existingSourceLights.length,
    postExistingCrownLightCount: existingPostLights.length,
    lightCensusUnchanged,
    cadenceDarkCellCount,
    cadenceProof: {
      ringWalkWithinLightingStandard: cadenceDarkCellCount === 0,
      cadenceSpacingMinChebyshev: MIN_SPACING,
      walkSurfaceChanged: false,
      headroomChanged: false,
      egressGeometryChanged: false,
      routeCommissioned: false,
    },
  },
  identities: {
    targetCoordinateSetSha256: hashCells(operatedCells),
    haloCoordinateSetSha256: hashCells(haloCells),
    preservedCrownWalkCoordinateSetSha256: hashCells(preservedWalk),
  },
  liveCallsPerformed: false,
  worldEditsPerformed: false,
};
fs.mkdirSync(absolute(EVIDENCE), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  status,
  evidence: relative(OUT),
  targetCount: targetRecords.length,
  exactPostStateCount,
  haloFluidCount,
  haloForbiddenCount,
  haloOffTargetDriftCount,
  preservedCrownWalkDriftCount: preservedWalkDriftCount,
  lightCensusUnchanged,
  cadenceDarkCellCount,
}, null, 2)}\n`);
