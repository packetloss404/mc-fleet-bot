#!/usr/bin/env node
/** Compile COBALT-RR-ACCESS-01 — Ravensreach (PR-W04) station access shaft
 *  with a sealed sleeve through the y34-39 contained cave-water pocket.
 *
 *  The Cobalt-S1 design found the Ravensreach preferred service shaft RR-SE-1
 *  (x=-158, z=-390) crosses a y35-37 water pocket under its 3x3 clear column.
 *  This package builds the bounded 3x3 access shaft from the corridor head
 *  (y23) to the surface plateau (y62) as a polished_deepslate sleeve:
 *
 *    - clear volume:    x=-159..-157, y=23..62, z=-391..-389  (3 wide x 3 high)
 *    - sleeve floor:    y=22 (sub-floor cap)   x=-160..-156, z=-392..-388
 *    - sleeve ceiling:  y=63 (surface cap)     x=-160..-156, z=-392..-388
 *    - west wall:       x=-160  y=23..62, z=-392..-388
 *    - east wall:       x=-156  y=23..62, z=-392..-388
 *    - north wall:      z=-392  y=23..62, x=-159..-157
 *    - south wall:      z=-388  y=23..62, x=-159..-157
 *
 *  TREATMENT (exact, reversible, durably sealed — the rail segment-01 liner
 *  pattern): every operated cell becomes polished_deepslate. Any fluid on a
 *  sleeve face or inside the water-crossing band is displaced in place by an
 *  exact REPL (never a removal), so no flow/gravity physics are triggered. The
 *  surrounding contained cave-water body is preserved exactly BEHIND the
 *  sleeve. Rollback restores every cell to its exact original state.
 *
 *  This is the RR-SE-1 access-shaft sleeve — RAIL-S2 access/civil containment
 *  only. No track, rail, platform, stair, or route commissioning.
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
const GENERATED_AT = value('--generated-at', '2026-08-25T06:12:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-cobalt-rr-source-20260825T061214');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'cobalt-rr-access-01');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'cobalt-rr-access-01';
const RELEASE_ID = 'COBALT-RR-ACCESS-01';
const RELEASE_NODE_ID = 'PASSENGER-RAILWAY';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`COBALT-RR-ACCESS-01 compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const isAir = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(blockName(state));
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const GRAVITY = new Set(['minecraft:sand', 'minecraft:gravel', 'minecraft:red_sand']);
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

const LINER = 'minecraft:polished_deepslate';

// Clear shaft volume: 3 wide x 3 high, from the corridor head (y23) up to the
// surface plateau (y62). The sealed sleeve box wraps it at +-1 in x/z and
// floor cap y22 / ceiling cap y63.
const CLEAR = { minX: -159, maxX: -157, minY: 23, maxY: 62, minZ: -391, maxZ: -389 };
const BOX = { minX: -160, maxX: -156, minY: 22, maxY: 63, minZ: -392, maxZ: -388 };
const WATER_BAND = { minY: 33, maxY: 39 };

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

const cellsIn = (b) => {
  const out = [];
  for (let x = b.minX; x <= b.maxX; x += 1) {
    for (let y = b.minY; y <= b.maxY; y += 1) {
      for (let z = b.minZ; z <= b.maxZ; z += 1) out.push({ x, y, z });
    }
  }
  return out;
};

// --- 1. Sleeve face cells (all six faces) ------------------------------------
const faces = {
  floor: cellsIn({ minX: BOX.minX, maxX: BOX.maxX, minY: 22, maxY: 22, minZ: BOX.minZ, maxZ: BOX.maxZ }),
  ceiling: cellsIn({ minX: BOX.minX, maxX: BOX.maxX, minY: 63, maxY: 63, minZ: BOX.minZ, maxZ: BOX.maxZ }),
  west: cellsIn({ minX: -160, maxX: -160, minY: 23, maxY: 62, minZ: -392, maxZ: -388 }),
  east: cellsIn({ minX: -156, maxX: -156, minY: 23, maxY: 62, minZ: -392, maxZ: -388 }),
  north: cellsIn({ minX: -159, maxX: -157, minY: 23, maxY: 62, minZ: -392, maxZ: -392 }),
  south: cellsIn({ minX: -159, maxX: -157, minY: 23, maxY: 62, minZ: -388, maxZ: -388 }),
};
const allFaceCells = Object.values(faces).flat();

// --- 2. Clear-shaft interior: must be air or (in the water band) fluid that is
//        sealed-displaced to liner. Assert no forbidden/gravity/above-band fluid.
const interiorFluid = [];
const interiorForbidden = [];
const interiorGravity = [];
for (const cell of cellsIn(CLEAR)) {
  const state = await sourceAt(cell);
  if (isFluid(state)) interiorFluid.push({ ...cell, state });
  if (isForbidden(state)) interiorForbidden.push({ ...cell, state });
  if (GRAVITY.has(blockName(state))) interiorGravity.push({ ...cell, state });
}
invariant(interiorForbidden.length === 0,
  `clear-shaft interior contains forbidden blocks: ${interiorForbidden.length}`);
invariant(interiorGravity.length === 0,
  `clear-shaft interior contains gravity blocks: ${interiorGravity.length}`);
const interiorFluidInWaterBand = interiorFluid.filter((c) => c.y >= WATER_BAND.minY && c.y <= WATER_BAND.maxY);
const interiorFluidOutsideBand = interiorFluid.filter((c) => c.y < WATER_BAND.minY || c.y > WATER_BAND.maxY);
invariant(interiorFluidOutsideBand.length === 0,
  `clear-shaft interior fluid outside the y${WATER_BAND.minY}..${WATER_BAND.maxY} water band: ${interiorFluidOutsideBand.map((c) => `${c.x},${c.y},${c.z}=${c.state}`).join('; ')}`);
invariant(interiorFluidInWaterBand.length > 0,
  'expected the y34-39 water pocket in the clear shaft interior');
invariant(interiorFluidInWaterBand.every((c) => blockName(c.state) === 'minecraft:water'),
  'clear-shaft water-band fluid is not the contained water pocket');

// --- 3. Classify sleeve face cells --------------------------------------------
const buildRecords = [];
const heldRecords = [];
for (const cell of allFaceCells) {
  const state = await sourceAt(cell);
  const problems = [];
  if (isForbidden(state)) problems.push(`forbidden=${blockName(state)}`);
  if (problems.length) heldRecords.push({ ...cell, state, problems });
  else {
    const isFluidSource = isFluid(state);
    const isGravitySource = GRAVITY.has(blockName(state));
    buildRecords.push({
      ...cell,
      state,
      role: isFluidSource ? 'sealed-fluid-displacement' : isGravitySource ? 'gravity-seal' : 'liner',
      problem: null,
    });
  }
}
invariant(heldRecords.length === 0, `held sleeve face cells: ${heldRecords.length}`);
invariant(buildRecords.length === allFaceCells.length,
  `sleeve face count drift: ${buildRecords.length} != ${allFaceCells.length}`);

// --- 4. Assemble all ops (sleeve faces + interior water-band displacement) ----
const ops = [
  ...buildRecords.map((record) => ({
    cell: { x: record.x, y: record.y, z: record.z },
    sourceState: record.state,
    targetState: LINER,
    role: record.role,
    packageKey: 'sleeve',
  })),
  ...interiorFluidInWaterBand.map((record) => ({
    cell: { x: record.x, y: record.y, z: record.z },
    sourceState: record.state,
    targetState: LINER,
    role: 'water-band-shaft-interior-displacement',
    packageKey: 'sleeve',
  })),
];

const targetKeys = new Set();
for (const op of ops) {
  const key = cellKey(op.cell);
  invariant(!targetKeys.has(key), `duplicate target ${key}`);
  targetKeys.add(key);
  const current = await sourceAt(op.cell);
  invariant(current === op.sourceState && op.sourceState !== op.targetState,
    `source/noop guard drift at ${key}: ${current}`);
}

// --- 5. Interaction halo: 1-cell outside the operated box ---------------------
const operatedCells = uniqueCells(ops.map(({ cell }) => cell));
const halo = uniqueCells(allFaceCells.flatMap((cell) => {
  const cells = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) cells.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
    }
  }
  return cells;
})).filter((cell) => !targetKeys.has(cellKey(cell)));

let haloFluidCount = 0;
let haloForbiddenCount = 0;
const haloFluidCells = [];
for (const cell of halo) {
  const st = await sourceAt(cell);
  if (isFluid(st)) { haloFluidCount += 1; haloFluidCells.push({ ...cell, state: st }); }
  if (isForbidden(st)) haloForbiddenCount += 1;
}
// The outer halo contains the preserved contained cave-water body (the pocket
// behind/around the sleeve) plus the air shaft above/below. The sleeve box is
// contiguous and fully sealed so no flow-through gap exists.
invariant(haloForbiddenCount === 0,
  `interaction halo forbidden/container hazard: ${haloForbiddenCount}`);
invariant(haloFluidCount > 0,
  'expected the preserved contained cave-water body in the sleeve halo');

// --- 6. Block-entity and saved-entity clearance over operated envelope ------
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

// --- 7. Emit package ----------------------------------------------------------
const packageOrder = ['sleeve'];
const packageGroups = new Map(packageOrder.map((key) => [key, []]));
for (const op of ops) packageGroups.get(op.packageKey).push(op);
for (const [key, group] of packageGroups) {
  group.sort((a, b) => a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z);
}

const packages = [];
const operationManifest = {};
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
for (const key of packageOrder) {
  const group = packageGroups.get(key);
  if (group.length === 0) continue;
  const forwardPath = path.join(OUT_DIR, `${BASENAME}.${key}.forward.txt`);
  const rollbackPath = path.join(OUT_DIR, `${BASENAME}.${key}.rollback.txt`);
  const forwardBody = `${group.map(({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState)).join('\n')}\n`;
  const reverse = [...group].reverse();
  const rollbackBody = `${reverse.map(({ cell, sourceState, targetState }) => replLine(cell, targetState, sourceState)).join('\n')}\n`;
  const header = [
    `# GENERATED FILE - ${RELEASE_ID} (${key})`,
    `# source root: ${SNAPSHOT}`,
    `# target coordinate-set SHA-256: ${hashCells(group.map(({ cell }) => cell))}`,
  ].join('\n');
  fs.writeFileSync(absolute(forwardPath), `${header}\n${forwardBody}`);
  fs.writeFileSync(absolute(rollbackPath), `${header}\n${rollbackBody}`);
  packages.push({ key, forward: relative(forwardPath), rollback: relative(rollbackPath) });
  operationManifest[key] = {
    role: 'sealed access-shaft sleeve (polished_deepslate box around the 3x3 clear shaft volume through the y34-39 contained cave-water pocket)',
    forwardSha256: sha256(forwardBody),
    rollbackSha256: sha256(rollbackBody),
    forwardCommandCount: group.length,
    rollbackCommandCount: group.length,
    targetCoordinateSetSha256: hashCells(group.map(({ cell }) => cell)),
    exactInverse: true,
  };
}

const sealedFluidDisplacementCells = ops.filter((o) => o.role.includes('fluid'))
  .map(({ cell, sourceState }) => ({ ...cell, sourceState }));
const waterBandInteriorDisplacementCells = interiorFluidInWaterBand.map(({ x, y, z, state }) => ({ x, y, z, state }));
const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: TRANSACTION_ID,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_SNAPSHOT_OFFLINE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: false,
  scopeIds: ['PASSENGER-RAILWAY'],
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'passenger-railway',
    purpose: 'Build the Ravensreach (PR-W04) preferred service shaft RR-SE-1 (x=-158, z=-390) as a 3x3 clear access shaft from the corridor head (y23) to the surface plateau (y62), wrapped in a sealed polished_deepslate sleeve that passes through the y34-39 contained cave-water pocket. The sleeve displaces water on its faces and in the water-band shaft interior in place (exact REPL, never a removal), preserving the surrounding contained water body behind the sleeve.',
    treatment: 'SEALED_ACCESS_SHAFT_SLEEVE_FLUID_DISPLACED_ON_FACES_PRESERVED_BEHIND',
    linerMaterial: LINER,
    clearVolume: CLEAR,
    sleeveBox: BOX,
    waterBand: WATER_BAND,
    built: classManifest(operatedCells),
    sleeveFaceCells: classManifest(allFaceCells),
    sealedFluidDisplacementCells: {
      count: sealedFluidDisplacementCells.length,
      cells: sealedFluidDisplacementCells,
    },
    waterBandShaftInteriorDisplaced: {
      count: waterBandInteriorDisplacementCells.length,
      cells: waterBandInteriorDisplacementCells,
    },
    preservedWaterBodyBehindSleeve: true,
    shaftDry: true,
    held: {
      cellCount: heldRecords.length,
      byReason: census(heldRecords, (record) => record.problems.join(';')),
    },
    routeCommissioned: false,
  },
  source: {
    snapshotRoot: relative(SNAPSHOT),
    waterSurvey: 'scripts/probe_cobalt_rr_water.mjs / scripts/probe_cobalt_rr_shaft.mjs / scripts/probe_cobalt_rr_candidates.mjs / scripts/probe_cobalt_rr_corridor_head.mjs',
  },
  target: {
    operatedUnion: classManifest(ops.map(({ cell }) => cell)),
    desiredStateCensus: census(ops, (record) => record.targetState),
    sourceStateCensus: census(ops, (record) => record.sourceState),
    interactionHalo: classManifest(halo),
    haloFluidCellsPreservedOutside: haloFluidCount,
    packageTargetsDisjoint: true,
  },
  operations: operationManifest,
  packages,
  executionOrder: {
    forward: packageOrder.filter((key) => operationManifest[key]),
    rollback: packageOrder.filter((key) => operationManifest[key]).reverse(),
    gravity: 'single sleeve package; every REPL is an in-place exact replacement (never a removal), so no gravity/flow physics are triggered',
  },
  isolation: {
    sourceHazardCount: 0,
    sealedFluidDisplacementCount: sealedFluidDisplacementCells.length,
    waterBandShaftInteriorDisplacementCount: waterBandInteriorDisplacementCells.length,
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
  sleeveCellCount: ops.length,
  sleeveFaceCellCount: allFaceCells.length,
  sealedFluidDisplacementCount: sealedFluidDisplacementCells.length,
  waterBandShaftInteriorDisplacementCount: waterBandInteriorDisplacementCells.length,
  heldCount: heldRecords.length,
  packageCount: packages.length,
  haloFluidCellsPreservedOutside: haloFluidCount,
}, null, 2)}\n`);
