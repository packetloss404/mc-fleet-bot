#!/usr/bin/env node
/** Compile CIRC-MSA-PORTAL-01 — MainStreet parking portal → warehouse drive hall.
 *
 * The "opulent surface vehicle portal" (start anchor) opens into an enclosed
 * lobby pocket at x=32..44, y=64..71, z=195..202. Its east face at z=203 is a
 * near-full-height polished_blackstone_bricks wall that leaves only a 1-block
 * slit (air at y=64, floor gray_concrete at y=63, lintel at y=65..71, roof
 * crown at y=72). The dry drive-down ramp and the warehouse drive hall beyond
 * z=204 are already built; the reverse flood reaches (42,64,204), exactly two
 * blocks from the pocket. The lintel slab is the sole separator.
 *
 * This package clears the full portal mouth x=34..42, y=65..70, z=203
 * (54 cells, polished_blackstone_bricks -> air), matching the existing corridor
 * interior at z=204 (air y=64..70, reinforced_deepslate roof at y=71 and
 * jambs at x=33/x=43). y=71..72 lintel/roof cells stay intact so the crown
 * above the opening remains supported and the corridor profile is matched.
 *
 * All targets are exact-air REPLs; the package is a pure wall opening. No fill,
 * no floor, no gravity/fluid, no containers, no entities. Exact inverse
 * rollback restores the lintel.
 *
 * Follows the guarded-release template of
 * compile_combined_zones_r11n_c1_station_1183_bridge_gap.mjs and
 * compile_civic_rrch_moot_01_room_repair.mjs. Offline, read-only with respect
 * to the live world.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  cellsIn,
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
const GENERATED_AT = value('--generated-at', '2026-08-24T12:00:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-msa-portal-source-20260824T120000Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'msa-portal-warehouse-route-closure');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'msa-portal-warehouse-route-closure';
const RELEASE_ID = 'CIRC-MSA-PORTAL-01';
const SURVEY = 'data/world-review/msa-portal-warehouse-route-survey-20260824/msa-portal-warehouse-survey.json';
const AUTHORIZATION = 'docs/masterplans/05-combined-zones/OWNER-DIRECTIVE-EXPANDED-ALL-AREAS.md';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fileBinding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`CIRC-MSA-PORTAL-01 compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
  'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil',
  'minecraft:dragon_egg', 'minecraft:pointed_dripstone', 'minecraft:scaffolding',
]);
const FORBIDDEN = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:spawner', 'minecraft:lectern', 'minecraft:brewing_stand',
  'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive',
  'minecraft:bee_nest', 'minecraft:decorated_pot', 'minecraft:chiseled_bookshelf',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw',
]);
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const isGravity = (state) => GRAVITY.has(blockName(state)) || blockName(state).endsWith('_concrete_powder');
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
const six = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

const survey = readJson(SURVEY);
invariant(survey.schemaVersion === 1
  && survey.mode === 'READ_ONLY_IMMUTABLE_SNAPSHOT_SURVEY'
  && survey.readyForBuild === true
  && survey.worldMutationPerformed === false,
'survey contract drifted');

// Full portal mouth matching the z=204 corridor: x=34..42, y=65..70, z=203.
const PORTAL_BOUNDS = { minX: 34, maxX: 42, minY: 65, maxY: 70, minZ: 203, maxZ: 203 };
// The surveyed candidate is the authoritative coordinate set.
invariant(survey.repairCandidateCells.fullPortalOpening.cellCount === 54,
'fullPortalOpening candidate count drifted');
invariant(JSON.stringify(survey.repairCandidateCells.fullPortalOpening.bounds)
  === JSON.stringify([34, 65, 203, 42, 70, 203]),
'fullPortalOpening candidate bounds drifted');

const targetCells = cellsIn(PORTAL_BOUNDS);
const targetKeys = new Set(targetCells.map(cellKey));
const desired = new Map();
for (const cell of targetCells) desired.set(cellKey(cell), { cell, toState: 'minecraft:air' });

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));

const records = [];
for (const [key, target] of desired) {
  const sourceState = stateToCommandString(await reader.blockState(target.cell.x, target.cell.y, target.cell.z));
  invariant(sourceState === 'minecraft:polished_blackstone_bricks',
    `target ${key} source is not the expected lintel: ${sourceState}`);
  records.push({ ...target, key, sourceState });
}
const operations = records.filter(({ sourceState, toState }) => sourceState !== toState);
const alreadyTarget = records.filter(({ sourceState, toState }) => sourceState === toState);
invariant(alreadyTarget.length === 0, 'no target may already be air');
invariant(operations.length === 54, `expected exactly 54 lintel operations, got ${operations.length}`);
const hazards = operations.filter(({ sourceState }) => isFluid(sourceState) || isForbidden(sourceState) || isGravity(sourceState));
invariant(hazards.length === 0, `target fluid/container/control/gravity hazards: ${JSON.stringify(hazards.slice(0, 20))}`);

// Interaction halo: 3x3x3 around every operated cell.
const haloCells = uniqueCells(records.flatMap(({ cell }) => (
  cellsIn({
    minX: cell.x - 1, maxX: cell.x + 1,
    minY: cell.y - 1, maxY: cell.y + 1,
    minZ: cell.z - 1, maxZ: cell.z + 1,
  })
))).filter((cell) => !targetKeys.has(cellKey(cell)));
const haloRecords = [];
for (const cell of haloCells) {
  haloRecords.push({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
}
const haloFluid = haloRecords.filter(({ state }) => isFluid(state));
const haloForbidden = haloRecords.filter(({ state }) => isForbidden(state));
const haloGravity = haloRecords.filter(({ state }) => isGravity(state));
invariant(haloFluid.length === 0 && haloForbidden.length === 0 && haloGravity.length === 0,
`interaction halo hazard: ${JSON.stringify([...haloFluid, ...haloForbidden, ...haloGravity].slice(0, 20))}`);

// Crown check: the lintel layer at y=71..72 above the opening stays intact and
// the retained y=71..72 cells at x=34..42 are solid lintel in the source, so the
// corridor roof (reinforced_deepslate at z=204, y=71) and the portal crown stay
// continuous. y=72 is the roof crown above the wall.
for (const y of [71, 72]) {
  for (const x of [34, 38, 42]) {
    const crown = await reader.blockState(x, y, 203);
    invariant(stateToCommandString(crown) === 'minecraft:polished_blackstone_bricks',
      `retained crown cell (${x},${y},203) is not the expected lintel`);
  }
}

// Block-entity and saved-entity clearance over the halo.
const envelopeBounds = boundsOf(uniqueCells([...records.map(({ cell }) => cell), ...haloCells]));
const blockEntityIntersections = [];
const entityIntersections = [];
const chunks = new Set(haloCells.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
for (const chunkKey of chunks) {
  const [cx, cz] = chunkKey.split(',').map(Number);
  const chunk = await reader.chunk(cx, cz);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (targetKeys.has(cellKey(point)) || haloCells.some((cell) => cellKey(cell) === cellKey(point))) {
      blockEntityIntersections.push({ id: entity.id ?? null, point });
    }
  }
  const entityChunk = await entityReader.chunk(cx, cz);
  for (const entity of entityChunk?.Entities ?? []) {
    const position = entity.Pos?.slice(0, 3).map(Number);
    if (position?.length === 3
      && position[0] >= envelopeBounds.minX && position[0] < envelopeBounds.maxX + 1
      && position[1] >= envelopeBounds.minY && position[1] < envelopeBounds.maxY + 1
      && position[2] >= envelopeBounds.minZ && position[2] < envelopeBounds.maxZ + 1) {
      entityIntersections.push({ id: entity.id ?? null, position });
    }
  }
}
invariant(blockEntityIntersections.length === 0 && entityIntersections.length === 0,
'halo intersects a block entity or saved movable entity');

// Single package: the lintel clear. Order ascending x/y/z.
const packageOrder = ['portal-lintel-clear'];
const packageGroups = new Map(packageOrder.map((key) => [key, []]));
for (const operation of operations) packageGroups.get(packageOrder[0]).push(operation);
for (const group of packageGroups.values()) {
  group.sort((a, b) => a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z);
}

const packages = [];
const operationManifest = {};
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
for (const key of packageOrder) {
  const group = packageGroups.get(key);
  const forward = path.join(OUT_DIR, `${BASENAME}.${key}.forward.txt`);
  const rollback = path.join(OUT_DIR, `${BASENAME}.${key}.rollback.txt`);
  // Package paths in the manifest are canonical repo paths (data/buildops/...)
  // so the byte-identical test reproduces the committed manifest regardless of
  // OUT_DIR.
  const canonicalForward = `data/buildops/${BASENAME}.${key}.forward.txt`;
  const canonicalRollback = `data/buildops/${BASENAME}.${key}.rollback.txt`;
  const header = [
    `# ${TRANSACTION_ID}/${key}`,
    `# source ${SNAPSHOT}`,
    '# guarded per-cell exact-state transitions; generated offline',
  ];
  const forwardBody = `${group.map(({ cell, sourceState, toState }) => replLine(cell, sourceState, toState)).join('\n')}\n`;
  const reverse = [...group].reverse();
  const rollbackBody = `${reverse.map(({ cell, sourceState, toState }) => replLine(cell, toState, sourceState)).join('\n')}\n`;
  fs.writeFileSync(absolute(forward), `${header.join('\n')}\n${forwardBody}`);
  fs.writeFileSync(absolute(rollback), `${header.join('\n')}\n${rollbackBody}`);
  packages.push({ key, forward: canonicalForward, rollback: canonicalRollback });
  operationManifest[key] = {
    forwardSha256: sha256(forwardBody),
    rollbackSha256: sha256(rollbackBody),
    forwardCommandCount: group.length,
    rollbackCommandCount: group.length,
    targetCellCount: group.length,
    targetCoordinateSetSha256: hashCells(group.map(({ cell }) => cell)),
    exactInverse: true,
  };
}

const manifestWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  transactionId: TRANSACTION_ID,
  status: 'COMPILED_FROM_ACCEPTED_R08AM_POST_FRESH_EXECUTION_KERNEL_AWAITING_EXECUTION',
  mvpScope: true,
  scopeIds: ['mainstreet-america'],
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'mainstreet-america',
    purpose: 'Clear the polished_blackstone_bricks lintel at z=203 (x=34..42, y=65..70) to open the full portal mouth from the surface vehicle portal pocket into the existing dry drive-down ramp and warehouse drive hall, restoring the TE-ROUTE-MAINSTREET-WAREHOUSE-DRIVE-HALL route.',
    repair: {
      portalBounds: { minX: 34, maxX: 42, minY: 65, maxY: 70, minZ: 203, maxZ: 203 },
      slitPreserved: { y: 64, state: 'minecraft:air' },
      floorPreserved: { y: 63, state: 'minecraft:gray_concrete' },
      crownPreserved: { y: 71, state: 'minecraft:polished_blackstone_bricks' },
      roofCrownPreserved: { y: 72, state: 'minecraft:polished_blackstone_bricks' },
      rampBeyondPreserved: true,
      corridorMatch: { y: [64, 65, 66, 67, 68, 69, 70], state: 'minecraft:air' },
      blockEntityCountProtected: 0,
    },
    geometry: {
      targets: classManifest(targetCells),
      operatedTargets: classManifest(operations.map(({ cell }) => cell)),
      alreadyTarget: classManifest(alreadyTarget.map(({ cell }) => cell)),
      interactionHalo: classManifest(haloCells),
    },
    retainedBoundaries: {
      existingContainersPreserved: true,
      existingBlockEntitiesPreserved: true,
      lobbyPocketUntouched: true,
      rampAndDriveHallUntouched: true,
      aquiferSeamUntouched: true,
      warehouseBulkheadOwnershipUntouched: true,
      routeCommissioned: false,
    },
  },
  source: {
    snapshotRoot: relative(SNAPSHOT),
    survey: fileBinding(SURVEY),
    authorization: fileBinding(AUTHORIZATION),
  },
  isolation: {
    targetFluidOrWaterloggedCount: operations.filter(({ sourceState }) => isFluid(sourceState)).length,
    targetForbiddenBlockCount: operations.filter(({ sourceState }) => isForbidden(sourceState)).length,
    targetGravityBlockCount: operations.filter(({ sourceState }) => isGravity(sourceState)).length,
    interactionHaloFluidCount: haloFluid.length,
    interactionHaloForbiddenBlockCount: haloForbidden.length,
    interactionHaloGravityBlockCount: haloGravity.length,
    blockEntityIntersectionCount: blockEntityIntersections.length,
    savedEntityIntersectionCount: entityIntersections.length,
  },
  executionOrder: {
    forward: packageOrder,
    rollback: [...packageOrder].reverse(),
    gravity: 'single air-clear package; exact rollback restores the lintel',
  },
  operations: operationManifest,
  packages,
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
  targetCount: targetCells.length,
  operationCount: operations.length,
  packageCount: packages.length,
}, null, 2)}\n`);
