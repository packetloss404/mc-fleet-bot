#!/usr/bin/env node
/** Compile RAIL-S2 — Westlight rail-corridor water-containment, first segment.
 *
 * The Westlight↔Ravensreach Cobalt-S1 corridor bore sits at y=18..23. The
 * full corridor rectangle x=-254..-156, z=-462..-387 carries 938 fluid cells
 * (918 water + 18 lava + 2 bubble) in y18..23 — the water is a lake/surface
 * body above the bore and a contained lava pocket intrudes the east end.
 *
 * This first segment builds the sealed liner box for exactly ONE 6×6 corridor
 * cell block (x=-254..-236, y=18..23, z=-462..-457), the Westlight end to the
 * first cross-passage at x=-236:
 *
 *   - interior corridor clear volume: x=-254..-236, y=18..23, z=-462..-457
 *   - floor liner:      y=17  (sub-floor)  x=-254..-236, z=-462..-457
 *   - corridor floor:   y=18  (12 lava cells displaced to polished_deepslate)
 *   - ceiling liner:    y=24  x=-254..-236, z=-462..-457
 *   - north wall:       z=-463  x=-254..-236, y=18..23
 *   - south wall:       z=-456  x=-254..-236, y=18..23
 *   - west cap:         x=-255  y=18..23, z=-462..-457
 *   - east cap:         x=-235  y=18..23, z=-462..-457
 *
 * TREATMENT (exact, reversible, durably sealed):
 *   Every cell on the six liner faces becomes polished_deepslate. The
 *   contained lava pocket cells that sit ON the liner face or ON the corridor
 *   floor (y18) are displaced in place to polished_deepslate (a REPL
 *   replacement, not a removal — no flow/gravity physics are triggered). The
 *   surrounding lake water body and the pocket lava that lies BEHIND the liner
 *   are preserved exactly. Rollback restores every polished_deepslate cell to
 *   its exact original state (rock, lava, air, or gravel).
 *
 * The corridor interior is made fluid-free (dry) by this package; the rock
 * interior is retained for the later RAIL-S3 civil bore. No track, rail, or
 * platform. RAIL-S2 only.
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
const GENERATED_AT = value('--generated-at', '2026-08-25T00:00:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r08am-post-20260822T161818Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'rail-wl-seg-01-liner');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'rail-wl-seg-01-liner';
const RELEASE_ID = 'RAIL-S2-WL-SEGMENT-01';
const RELEASE_NODE_ID = 'PASSENGER-RAILWAY';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`RAIL-S2-WL-SEGMENT-01 compiler rejected: ${message}`);
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

const CORRIDOR = { minX: -254, maxX: -236, minY: 18, maxY: 23, minZ: -462, maxZ: -457 };

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

// --- 1. Liner face cells (all six faces) ------------------------------------
const faces = {
  floor: cellsIn({ minX: -254, maxX: -236, minY: 17, maxY: 17, minZ: -462, maxZ: -457 }),
  ceiling: cellsIn({ minX: -254, maxX: -236, minY: 24, maxY: 24, minZ: -462, maxZ: -457 }),
  north: cellsIn({ minX: -254, maxX: -236, minY: 18, maxY: 23, minZ: -463, maxZ: -463 }),
  south: cellsIn({ minX: -254, maxX: -236, minY: 18, maxY: 23, minZ: -456, maxZ: -456 }),
  west: cellsIn({ minX: -255, maxX: -255, minY: 18, maxY: 23, minZ: -462, maxZ: -457 }),
  east: cellsIn({ minX: -235, maxX: -235, minY: 18, maxY: 23, minZ: -462, maxZ: -457 }),
};
const allFaceCells = Object.values(faces).flat();

// --- 2. Corridor interior floor fluid: the 12 lava cells at y18 must become
// the dry corridor floor. Detect them exactly.
const interiorFloorFluid = [];
for (const cell of cellsIn({ ...CORRIDOR, minY: 18, maxY: 18 })) {
  const state = await sourceAt(cell);
  if (isFluid(state)) interiorFloorFluid.push({ ...cell, state });
}
// Any interior fluid above y18 (y19..23) would also need treatment; assert none.
const interiorAboveFluid = [];
for (const cell of cellsIn({ ...CORRIDOR, minY: 19, maxY: 23 })) {
  const state = await sourceAt(cell);
  if (isFluid(state)) interiorAboveFluid.push({ ...cell, state });
}
invariant(interiorAboveFluid.length === 0,
  `unexpected interior fluid above corridor floor: ${interiorAboveFluid.length}`);
invariant(interiorFloorFluid.length > 0 && interiorFloorFluid.length <= 14,
  `interior floor fluid count out of expected range: ${interiorFloorFluid.length}`);
invariant(interiorFloorFluid.every((c) => blockName(c.state) === 'minecraft:lava'),
  'interior corridor floor fluid is not the contained lava pocket');

// --- 3. Classify liner face cells --------------------------------------------
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
invariant(heldRecords.length === 0, `held liner face cells: ${heldRecords.length}`);
invariant(buildRecords.length === allFaceCells.length,
  `liner face count drift: ${buildRecords.length} != ${allFaceCells.length}`);

// --- 4. Assemble all ops (liner faces + interior floor fluid) ----------------
const ops = [
  ...buildRecords.map((record) => ({
    cell: { x: record.x, y: record.y, z: record.z },
    sourceState: record.state,
    targetState: LINER,
    role: record.role,
    packageKey: 'liner',
  })),
  ...interiorFloorFluid.map((record) => ({
    cell: { x: record.x, y: record.y, z: record.z },
    sourceState: record.state,
    targetState: LINER,
    role: 'corridor-floor-fluid-displacement',
    packageKey: 'liner',
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

// --- 5. Interaction halo: 1-cell outside the operated box -------------------
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
for (const cell of halo) {
  const st = await sourceAt(cell);
  if (isFluid(st)) haloFluidCount += 1;
  if (isForbidden(st)) haloForbiddenCount += 1;
}
// The outer halo contains the preserved lake water body (above/around) and the
// sealed pocket-lava neighbors. These are the preserved water bodies — the
// liner box is contiguous and fully sealed so no flow-through gap exists.
invariant(haloForbiddenCount === 0,
  `interaction halo forbidden/container hazard: ${haloForbiddenCount}`);

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
const packageOrder = ['liner'];
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
    role: 'sealed water-management liner (polished_deepslate box around the 6x6 corridor clear volume)',
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
const interiorFloorFluidCells = interiorFloorFluid.map(({ x, y, z, state }) => ({ x, y, z, state }));
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
    purpose: 'Seal the first Westlight 6x6 rail-corridor cell block (x=-254..-236, y=18..23, z=-462..-457) with a polished_deepslate water-management liner so the corridor interior is fluid-free (dry) while the surrounding lake water body and the contained lava pocket are preserved behind/around the liner.',
    treatment: 'SEALED_WATER_MANAGEMENT_LINER_BOX_FLUID_DISPLACED_ON_FACES_PRESERVED_BEHIND',
    linerMaterial: LINER,
    corridorEnvelope: CORRIDOR,
    built: classManifest(operatedCells),
    linerFaceCells: classManifest(allFaceCells),
    sealedFluidDisplacementCells: {
      count: sealedFluidDisplacementCells.length,
      cells: sealedFluidDisplacementCells,
    },
    interiorFloorFluidDisplaced: {
      count: interiorFloorFluidCells.length,
      cells: interiorFloorFluidCells,
    },
    preservedWaterBodyOutsideLiner: true,
    interiorDry: true,
    held: {
      cellCount: heldRecords.length,
      byReason: census(heldRecords, (record) => record.problems.join(';')),
    },
    routeCommissioned: false,
  },
  source: {
    snapshotRoot: relative(SNAPSHOT),
    waterSurvey: 'scripts/probe_rail_wl_water.mjs / scripts/probe_rail_wl_reconcile.mjs / scripts/probe_rail_wl_exact.mjs / scripts/probe_rail_wl_lava.mjs',
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
    gravity: 'single liner package; every REPL is an in-place exact replacement (never a removal), so no gravity/flow physics are triggered',
  },
  isolation: {
    sourceHazardCount: 0,
    sealedFluidDisplacementCount: sealedFluidDisplacementCells.length,
    interiorFloorFluidDisplacementCount: interiorFloorFluidCells.length,
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
  linerCellCount: ops.length,
  sealedFluidDisplacementCount: sealedFluidDisplacementCells.length,
  interiorFloorFluidDisplacementCount: interiorFloorFluidCells.length,
  heldCount: heldRecords.length,
  packageCount: packages.length,
}, null, 2)}\n`);
