#!/usr/bin/env node
/** Independent read-only post-release QA for WLV-CONCOURSE-ARM-01.
 *
 * Verifies against the immutable post snapshot:
 *   1. Every cadence target is exactly `minecraft:sea_lantern` in post state.
 *   2. The interaction halo (3x3x3 around operated cells) has zero fluid, zero
 *      forbidden/container block, and zero off-target drift vs source.
 *   3. Walk-surface/headroom preservation: the concourse ring walk footprint
 *      (planks y67 with clear y68, i.e. walk top y68) is byte-identical to
 *      source — the ceiling inlays never touch the walk band.
 *   4. The existing ring lantern census is unchanged (58 fixtures).
 *   5. Cadence continuity: every ring walk cell is now within MIN_SPACING of a
 *      lantern OR a new cadence cell (the completed continuous cadence).
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
const MANIFEST = value('--manifest', 'data/buildops/wlv-concourse-arm-lighting.release-manifest.json');
const SOURCE = value('--source-regions', 'data/worldsnap-wlv-concourse-source-20260825T120000Z/region');
const POST = value('--post-regions', 'data/worldsnap-wlv-concourse-post-20260825T120300Z/region');
const EVIDENCE = value('--evidence-dir', 'data/world-review/wlv-concourse-live-20260825T120300Z');
const OUT = value('--out', `${EVIDENCE}/wlv-concourse-post-release-qa.json`);
const GENERATED_AT = value('--generated-at', '2026-08-25T12:30:00Z');

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`WLV-CONCOURSE-ARM-01 post QA rejected: ${message}`);
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

const RING_BOUNDS = { minX: -429, maxX: -291, minZ: -629, maxZ: -488 };
const WALK_Y = 67;
const CEILING_Y = 72;
const MIN_SPACING = 6;
const WALK_TOP = new Set([
  'minecraft:stone_bricks', 'minecraft:smooth_stone', 'minecraft:polished_andesite',
  'minecraft:polished_diorite', 'minecraft:smooth_quartz',
]);

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
invariant(manifest.mvpScope === false && manifest.scopeIds.includes('WESTLIGHT-VENUE'),
  'manifest scope drifted');
invariant(manifest.scope?.releaseId === 'WLV-CONCOURSE-ARM-01', 'release id drifted');

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
const EXPECTED = manifest.scope.cadenceCells.cellCount;
invariant(forwardRecords.length === EXPECTED, `forward record count drift: ${forwardRecords.length} != ${EXPECTED}`);
invariant(rollbackRecords.length === EXPECTED, `rollback record count drift: ${rollbackRecords.length} != ${EXPECTED}`);

// Target bijection: every forward target has exactly the inverse in rollback.
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
invariant(forwardKeyToSource.size === EXPECTED && rollbackKeyToSource.size === EXPECTED,
  `forward/rollback target sets not both ${EXPECTED}`);
for (const [key, sourceState] of forwardKeyToSource) {
  invariant(rollbackKeyToSource.get(key) === sourceState,
    `rollback source (${rollbackKeyToSource.get(key)}) != forward source (${sourceState}) at ${key}`);
  invariant(forwardKeyToSource.get(key) === sourceState, `forward bijection broken at ${key}`);
}
for (const key of rollbackKeyToSource.keys()) {
  invariant(forwardKeyToSource.has(key), `rollback target not in forward set: ${key}`);
}

// 1. Exact post-state match for every forward target.
const postMismatches = [];
for (const record of forwardRecords) {
  const actual = await postAt(record.cell);
  if (actual !== record.targetState) postMismatches.push({ cell: record.cell, expected: record.targetState, actual });
}
invariant(postMismatches.length === 0, `post-state mismatch: ${JSON.stringify(postMismatches.slice(0, 5))}`);

// 2. Interaction halo: no fluid/forbidden, and no off-target drift.
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

// 3. Walk-surface preservation: ring walk footprint (planks y67 + clear y68
//    [or stone top + clear y69]) byte-identical to source, and the operated
//    band is strictly the y72 ceiling.
for (const record of forwardRecords) {
  invariant(record.cell.y === CEILING_Y, `target not at ceiling: ${cellKey(record.cell)}`);
  invariant(record.cell.y !== WALK_Y && record.cell.y !== WALK_Y + 1,
    `target overlaps walk band: ${cellKey(record.cell)}`);
}
const walk = [];
for (let x = RING_BOUNDS.minX; x <= RING_BOUNDS.maxX; x += 1) {
  for (let z = RING_BOUNDS.minZ; z <= RING_BOUNDS.maxZ; z += 1) {
    const s67 = blockName(await postAt({ x, y: WALK_Y, z }));
    if (s67 !== 'minecraft:dark_oak_planks') continue;
    const s68 = blockName(await postAt({ x, y: WALK_Y + 1, z }));
    if (isAir(s68)) walk.push({ x, z });
    else if (WALK_TOP.has(s68)) {
      const s69 = blockName(await postAt({ x, y: WALK_Y + 2, z }));
      if (isAir(s69)) walk.push({ x, z });
    }
  }
}
invariant(walk.length >= 800 && walk.length <= 1000,
  `post ring walk footprint drift: ${walk.length}`);
let walkDrift = 0;
for (const cell of walk) {
  for (let y = WALK_Y; y <= WALK_Y + 2; y += 1) {
    const s = await sourceAt({ x: cell.x, y, z: cell.z });
    const p = await postAt({ x: cell.x, y, z: cell.z });
    if (s !== p) walkDrift += 1;
  }
}
invariant(walkDrift === 0, `ring walk band drift: ${walkDrift}`);

// 4. Existing ring lantern census unchanged: source has exactly the recorded
//    existing count; post has source-existing PLUS the newly placed cadence
//    cells, and every post lantern is either a pre-existing source lantern or
//    an operated target (no stray new light anywhere else in the band).
const sourceLights = [];
for (let x = RING_BOUNDS.minX; x <= RING_BOUNDS.maxX; x += 1) {
  for (let z = RING_BOUNDS.minZ; z <= RING_BOUNDS.maxZ; z += 1) {
    for (let y = 68; y <= 74; y += 1) {
      const s = await sourceAt({ x, y, z });
      if (blockName(s) === 'minecraft:sea_lantern' || blockName(s) === 'minecraft:lantern') {
        sourceLights.push({ x, y, z, s });
      }
    }
  }
}
invariant(sourceLights.length === manifest.scope.existingRingLanternCount,
  `source existing ring lantern census drift: ${sourceLights.length} != ${manifest.scope.existingRingLanternCount}`);
const postLights = [];
for (let x = RING_BOUNDS.minX; x <= RING_BOUNDS.maxX; x += 1) {
  for (let z = RING_BOUNDS.minZ; z <= RING_BOUNDS.maxZ; z += 1) {
    for (let y = 68; y <= 74; y += 1) {
      const s = await postAt({ x, y, z });
      if (blockName(s) === 'minecraft:sea_lantern' || blockName(s) === 'minecraft:lantern') {
        postLights.push({ x, y, z, s });
      }
    }
  }
}
invariant(postLights.length === sourceLights.length + EXPECTED,
  `post ring lantern census drift: ${postLights.length} != ${sourceLights.length} + ${EXPECTED}`);
const sourceLightKeys = new Set(sourceLights.map((l) => `${l.x},${l.y},${l.z}`));
const targetKeysSet = new Set(forwardKeyToSource.keys());
const strayLights = postLights.filter((l) => {
  const key = `${l.x},${l.y},${l.z}`;
  return !sourceLightKeys.has(key) && !targetKeysSet.has(key);
});
invariant(strayLights.length === 0, `stray post lights: ${JSON.stringify(strayLights.slice(0, 5))}`);

// 5. Cadence continuity: every ring walk cell is now within MIN_SPACING
//    (Chebyshev) of a post lantern (pre-existing or new cadence cell).
const lightPoints = postLights.map((l) => ({ x: l.x, z: l.z }));
let stillDark = 0;
const darkCells = [];
for (const cell of walk) {
  let best = Infinity;
  for (const p of lightPoints) best = Math.min(best, Math.max(Math.abs(cell.x - p.x), Math.abs(cell.z - p.z)));
  if (best > MIN_SPACING) { stillDark += 1; darkCells.push({ ...cell, dist: best }); }
}
invariant(stillDark === 0,
  `ring cadence still has dark cells (>${MIN_SPACING}): ${JSON.stringify(darkCells.slice(0, 5))}`);

// 6. All cadence cells remain Chebyshev >= MIN_SPACING apart.
for (let i = 0; i < forwardRecords.length; i += 1) {
  for (let j = i + 1; j < forwardRecords.length; j += 1) {
    const d = Math.max(
      Math.abs(forwardRecords[i].cell.x - forwardRecords[j].cell.x),
      Math.abs(forwardRecords[i].cell.z - forwardRecords[j].cell.z),
    );
    invariant(d >= MIN_SPACING, `cadence spacing violation ${cellKey(forwardRecords[i].cell)} ${cellKey(forwardRecords[j].cell)} d=${d}`);
  }
}

const report = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_WLV_CONCOURSE_ARM_01_CEILING_CADENCE_POSTSTATE_VERIFIED_REVERSIBLE',
  mode: 'INDEPENDENT_READ_ONLY_WLV_CONCOURSE_ARM_01_POST_RELEASE_QA',
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
    ringWalkCellCount: walk.length,
    ringWalkBandDriftCount: walkDrift,
    sourceRingLanternCount: sourceLights.length,
    postRingLanternCount: postLights.length,
    strayPostLightCount: strayLights.length,
    cadenceStillDarkCellCount: stillDark,
    cadenceSpacingViolations: 0,
  },
  cadenceProof: {
    ringWalkWithinLightingStandard: stillDark === 0,
    cadenceSpacingMinChebyshev: MIN_SPACING,
    walkSurfaceChanged: walkDrift > 0,
    headroomChanged: false,
    egressGeometryChanged: false,
    floodRouteCommissioned: false,
    routeCommissioningClaimed: false,
  },
  identities: {
    targetCoordinateSetSha256: hashCells(operatedCells),
    haloCoordinateSetSha256: hashCells(haloCells),
    ringWalkCoordinateSetSha256: hashCells(walk),
  },
  liveCallsPerformed: false,
  worldEditsPerformed: false,
};
fs.mkdirSync(absolute(EVIDENCE), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
