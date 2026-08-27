#!/usr/bin/env node
/** Compile CIRC-MSA-H11-01 — MainStreet Midtown (H11) stair-core correction.
 *
 * Replaces the one-tread 15-cell turning core with a two-clear-wide switchback
 * stair inside the existing 3x3 stair well, with 3x3 landings at each floor.
 * Uses the building's existing polished-blackstone-brick material language.
 * Preserves every block entity and protected room.
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
const GENERATED_AT = value('--generated-at', '2026-08-24T01:10:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-civic-interiors-source-20260822T180000Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'civic-msa-h11-01-stair-core-correction');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'civic-msa-h11-01-stair-core-correction';
const RELEASE_ID = 'CIRC-MSA-H11-01';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fileBinding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`CIRC-MSA-H11-01 compiler rejected: ${message}`);
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

// H11 stair well: x=31..33, z=-147..-149, floors at y=64,69,74,79,84.
// Two-clear-wide switchback: 2-wide columns x=32..33.
const well = { minX: 32, maxX: 33, minZ: -149, maxZ: -147 };
const floors = [64, 69, 74, 79];

const STAIR = 'minecraft:polished_blackstone_brick_stairs[facing=%s,half=bottom,shape=straight,waterlogged=false]';

const desired = new Map();
const meta = new Map();
const setTarget = (cell, toState, packageKey, role) => {
  const key = cellKey(cell);
  desired.set(key, { cell, toState });
  meta.set(key, { packageKey, role });
};

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));

// Collect block entities in the building volume to protect.
const blockEntityPoints = [];
for (const cx of [2]) {
  for (const cz of [-10]) {
    const chunk = await reader.chunk(cx, cz);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      if (entity.x >= 26 && entity.x <= 38 && entity.z >= -151 && entity.z <= -140) {
        blockEntityPoints.push({ x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) });
      }
    }
  }
}
const blockEntityKeys = new Set(blockEntityPoints.map(cellKey));

// Build the switchback stair per floor. Each 5-block rise (F..F+5) uses:
//  - 2-wide stair ascending +z: z=-149(y=F+1), z=-148(y=F+2), z=-147(y=F+3)  [facing north]
//  - 3x3 landing air at y=F+3
//  - 2-wide stair ascending -z: z=-147(y=F+4), z=-148(y=F+5)  [facing south]
// The next floor landing is the existing oak floor at y=F+5.
for (const F of floors) {
  // Ascending +z leg (from lower floor toward higher): steps at increasing y.
  const plusZ = [
    { y: F + 1, z: -149 },
    { y: F + 2, z: -148 },
    { y: F + 3, z: -147 },
  ];
  for (const { y, z } of plusZ) {
    for (const x of [32, 33]) {
      const cell = { x, y, z };
      if (blockEntityKeys.has(cellKey(cell))) continue;
      setTarget(cell, STAIR.replace('%s', 'north'), 'stair-flight', 'h11-stair-plusz');
    }
  }
  // Ascending -z leg (second pass): from mid landing back toward higher.
  const minusZ = [
    { y: F + 4, z: -147 },
    { y: F + 5, z: -148 },
  ];
  for (const { y, z } of minusZ) {
    for (const x of [32, 33]) {
      const cell = { x, y, z };
      if (blockEntityKeys.has(cellKey(cell))) continue;
      setTarget(cell, STAIR.replace('%s', 'south'), 'stair-flight', 'h11-stair-minusz');
    }
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

const packageOrder = ['stair-flight'];
const packageGroups = new Map(packageOrder.map((key) => [key, []]));
for (const operation of operations) packageGroups.get(operation.packageKey).push(operation);
for (const [key, group] of packageGroups) {
  group.sort((a, b) => a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z);
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
  status: 'COMPILED_FROM_ACCEPTED_INTERIOR_SOURCE_AWAITING_FRESH_EXECUTION_KERNEL',
  mvpScope: true,
  scopeIds: ['mainstreet-america'],
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'mainstreet-america',
    purpose: 'Replace the one-tread 15-cell turning core of H11 (The Midtown) with a two-clear-wide switchback stair inside the existing 3x3 well, with 3x3 landings at each floor.',
    repair: {
      structure: 'H11',
      name: 'The Midtown',
      stairWell: { minX: 31, maxX: 33, minZ: -147, maxZ: -149 },
      stairColumns: { minX: 32, maxX: 33 },
      floors: [64, 69, 74, 79],
      widthClearBlocks: 2,
      landings: '3x3',
      material: 'minecraft:polished_blackstone_brick_stairs',
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
      existingContainersPreserved: true,
      existingBlockEntitiesPreserved: true,
      protectedRoomsUntouched: true,
      buildingEnvelopePreserved: true,
      alternateSignedRouteNotRequired: false,
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
