#!/usr/bin/env node
/** Compile CIRC-RG-SURFACE-02 — Ravensgate NW Garth pedestrian connection.
 *
 * Surfaces the clean grass/dirt gap (x=-123..-115, z=-457..-451) between the
 * existing gravel feeder trunk (Approach Road side, z=-462..-458) and the
 * Ravensgate north plaza (stone bricks, z=-450) with cobblestone, matching the
 * CIRC-RG-SURFACE-01 garden-loop walk material. Completes the Approach Road →
 * Ravensgate pedestrian connection.
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
const GENERATED_AT = value('--generated-at', '2026-08-24T21:20:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-ravensgate-surface-source-20260824T211000Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'ravensgate-surface-nw-garth-connection');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'ravensgate-surface-nw-garth-connection';
const RELEASE_ID = 'CIRC-RG-SURFACE-02';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`RAVENSGATE-SURFACE compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
  'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil',
  'minecraft:dragon_egg', 'minecraft:pointed_dripstone', 'minecraft:scaffolding',
]);
const isGravity = (state) => GRAVITY.has(blockName(state)) || blockName(state).endsWith('_concrete_powder');
const FORBIDDEN = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:spawner', 'minecraft:lectern', 'minecraft:brewing_stand',
  'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive',
  'minecraft:bee_nest', 'minecraft:decorated_pot', 'minecraft:chiseled_bookshelf',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw',
  'minecraft:sign', 'minecraft:hanging_sign', 'minecraft:item_frame',
  'minecraft:glow_item_frame', 'minecraft:smithing_table', 'minecraft:stonecutter',
  'minecraft:enchanting_table', 'minecraft:composter', 'minecraft:campfire',
  'minecraft:soul_campfire', 'minecraft:sculk_sensor', 'minecraft:sculk_shrieker',
  'minecraft:bell', 'minecraft:lantern', 'minecraft:soul_lantern',
  'minecraft:sea_lantern', 'minecraft:conduit',
]);
const isForbidden = (state) => FORBIDDEN.has(blockName(state)) || blockName(state).endsWith('_shulker_box');
const NON_COLLIDING = new Set([
  'minecraft:air', 'minecraft:cave_air', 'minecraft:void_air',
  'minecraft:short_grass', 'minecraft:tall_grass', 'minecraft:poppy',
  'minecraft:dandelion', 'minecraft:azure_bluet', 'minecraft:cornflower',
  'minecraft:bush', 'minecraft:fern', 'minecraft:large_fern', 'minecraft:torch',
  'minecraft:wall_torch', 'minecraft:redstone_torch', 'minecraft:sea_pickle',
  'minecraft:kelp', 'minecraft:seagrass', 'minecraft:sugar_cane', 'minecraft:cobweb',
  'minecraft:snow',
]);
const isNonColliding = (state) => NON_COLLIDING.has(blockName(state));
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const six = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

const WALK = 'minecraft:cobblestone';
const TARGET_X = [-123, -122, -121, -120, -119, -118, -117, -116, -115];
const TARGET_Z = [];
for (let z = -457; z <= -451; z += 1) TARGET_Z.push(z);
const TARGET_Y = 67;

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));

// Block entities in the surrounding envelope to protect (district-wide scan of
// the relevant region files).
const blockEntityPoints = [];
for (let cx = Math.floor(-130 / 16); cx <= Math.floor(-96 / 16); cx += 1) {
  for (let cz = Math.floor(-462 / 16); cz <= Math.floor(-448 / 16); cz += 1) {
    const chunk = await reader.chunk(cx, cz);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      blockEntityPoints.push({ x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) });
    }
  }
}
const blockEntityKeys = new Set(blockEntityPoints.map(cellKey));

const desired = new Map();
const meta = new Map();
const setTarget = (cell, toState, packageKey, role) => {
  const key = cellKey(cell);
  desired.set(key, { cell, toState });
  meta.set(key, { packageKey, role });
};

// Surface only grass_block/dirt cells in the gap.
const WALKABLE = new Set(['minecraft:grass_block', 'minecraft:dirt']);
for (const z of TARGET_Z) {
  for (const x of TARGET_X) {
    const cell = { x, y: TARGET_Y, z };
    if (blockEntityKeys.has(cellKey(cell))) continue;
    const source = await reader.blockState(x, TARGET_Y, z);
    if (!WALKABLE.has(source.Name)) continue;
    setTarget(cell, WALK, 'connection-walk', 'surface-nw-garth-connection');
  }
}

const targetCells = [...desired.values()].map(({ cell }) => cell);
const targetKeys = new Set(targetCells.map(cellKey));
const records = [];
for (const [key, target] of desired) {
  const sourceState = stateToCommandString(await reader.blockState(target.cell.x, target.cell.y, target.cell.z));
  records.push({ ...target, key, sourceState, ...meta.get(key) });
}
const operations = records.filter(({ sourceState, toState }) => sourceState !== toState);
const alreadyTarget = records.filter(({ sourceState, toState }) => sourceState === toState);
const hazards = operations.filter(({ sourceState }) => isFluid(sourceState) || isForbidden(sourceState));
invariant(hazards.length === 0, `target fluid/container/control sources: ${JSON.stringify(hazards.slice(0, 20))}`);

// Headroom check (y68, y69 non-colliding) and projected-support check (y66 solid non-fluid).
for (const operation of operations) {
  const { cell } = operation;
  const h1 = await reader.blockState(cell.x, cell.y + 1, cell.z);
  const h2 = await reader.blockState(cell.x, cell.y + 2, cell.z);
  const below = await reader.blockState(cell.x, cell.y - 1, cell.z);
  const belowState = stateToCommandString(below);
  invariant(isNonColliding(stateToCommandString(h1)) && isNonColliding(stateToCommandString(h2)),
    `headroom hazard at ${cellKey(cell)}: h1=${stateToCommandString(h1)} h2=${stateToCommandString(h2)}`);
  invariant(!isFluid(belowState) && !isForbidden(belowState) && !AIR.has(blockName(belowState)),
    `projected-support hazard at ${cellKey(cell)}: below=${belowState}`);
}

const haloCells = uniqueCells(targetCells.flatMap((cell) => six.map(([dx, dy, dz]) => ({
  x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
})))).filter((cell) => !targetKeys.has(cellKey(cell)));
const haloRecords = [];
for (const cell of haloCells) {
  haloRecords.push({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
}
const haloFluid = haloRecords.filter(({ state }) => isFluid(state));
const haloForbidden = haloRecords.filter(({ state }) => isForbidden(state));
invariant(haloFluid.length === 0 && haloForbidden.length === 0,
  `interaction halo fluid/container/control hazard: ${JSON.stringify([...haloFluid, ...haloForbidden].slice(0, 20))}`);

// Block-entity and saved-entity clearance over target + halo envelope.
const chunks = new Set(haloCells.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
const blockEntityIntersections = [];
const entityIntersections = [];
const envelopeBounds = boundsOf(uniqueCells([...targetCells, ...haloCells]));
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
    if (position?.length === 3 && position[0] >= envelopeBounds.minX && position[0] < envelopeBounds.maxX + 1
      && position[1] >= envelopeBounds.minY && position[1] < envelopeBounds.maxY + 1
      && position[2] >= envelopeBounds.minZ && position[2] < envelopeBounds.maxZ + 1) {
      entityIntersections.push({ id: entity.id ?? null, position });
    }
  }
}
invariant(blockEntityIntersections.length === 0 && entityIntersections.length === 0,
  'target/halo intersects a block entity or saved movable entity');

const packageOrder = ['connection-walk'];
const packageGroups = new Map(packageOrder.map((key) => [key, []]));
for (const operation of operations) packageGroups.get(operation.packageKey).push(operation);
for (const [key, group] of packageGroups) {
  group.sort((a, b) => a.cell.z - b.cell.z || a.cell.x - b.cell.x);
  invariant(group.length > 0, `${key} compiled empty`);
}

const packages = [];
const operationManifest = {};
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
for (const key of packageOrder) {
  const group = packageGroups.get(key);
  const forward = path.join(OUT_DIR, `${BASENAME}.${key}.forward.txt`);
  const rollback = path.join(OUT_DIR, `${BASENAME}.${key}.rollback.txt`);
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
  packages.push({ key, forward: relative(forward), rollback: relative(rollback) });
  operationManifest[key] = {
    forwardSha256: sha256(forwardBody),
    rollbackSha256: sha256(rollbackBody),
    forwardCommandCount: group.length,
    rollbackCommandCount: group.length,
    targetCoordinateSetSha256: hashCells(group.map(({ cell }) => cell)),
    exactInverse: true,
  };
}

const operationRoles = Object.fromEntries([...new Set(records.map(({ role }) => role))].sort().map((role) => [
  role,
  classManifest(records.filter((record) => record.role === role).map(({ cell }) => cell)),
]));
const manifestWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  transactionId: TRANSACTION_ID,
  status: 'COMPILED_FROM_FRESH_SOURCE_AWAITING_EXECUTION_KERNEL',
  mvpScope: true,
  scopeIds: ['ravensgate'],
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'ravensgate',
    purpose: 'Surface the clean grass/dirt gap (x=-123..-115, z=-457..-451) between the existing NW gravel feeder trunk (Approach Road side) and the Ravensgate north plaza with cobblestone, completing the Approach Road to Ravensgate pedestrian connection.',
    repair: {
      district: 'ravensgate',
      connection: {
        approachRoadEdge: { minX: -322, maxX: -148, minZ: -511, maxZ: -490 },
        gravelTrunk: { minX: -123, maxX: -98, minZ: -462, maxZ: -458 },
        gap: { minX: -123, maxX: -115, y: 67, minZ: -457, maxZ: -451 },
        northPlaza: { minX: -130, maxX: -96, minZ: -450, maxZ: -448 },
        material: WALK,
      },
      blockEntityCountProtected: blockEntityPoints.length,
    },
    geometry: {
      targets: classManifest(targetCells),
      operatedTargets: classManifest(operations.map(({ cell }) => cell)),
      alreadyTarget: classManifest(alreadyTarget.map(({ cell }) => cell)),
      interactionHalo: classManifest(haloCells),
      operationRoles,
    },
    retainedBoundaries: {
      gravelTrunkPreserved: true,
      northPlazaPreserved: true,
      approachRoadEdgePreserved: true,
      existingContainersPreserved: true,
      restrictedUndergroundUntouched: true,
      noUndergroundShortcut: true,
    },
  },
  source: {
    snapshotRoot: relative(SNAPSHOT),
  },
  isolation: {
    targetFluidOrWaterloggedCount: operations.filter(({ sourceState }) => isFluid(sourceState)).length,
    targetForbiddenBlockCount: operations.filter(({ sourceState }) => isForbidden(sourceState)).length,
    interactionHaloFluidCount: haloFluid.length,
    interactionHaloForbiddenBlockCount: haloForbidden.length,
    blockEntityIntersectionCount: blockEntityIntersections.length,
    savedEntityIntersectionCount: entityIntersections.length,
  },
  executionOrder: {
    forward: packageOrder,
    rollback: [...packageOrder].reverse(),
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
  blockEntityCountProtected: blockEntityPoints.length,
}, null, 2)}\n`);
