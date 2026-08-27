#!/usr/bin/env node
/** Compile COBALT-WL-PLATFORM-01 — Westlight (PR-W02) station platform deck at
 *  the corridor head, with a sealed liner through the lake-boundary water.
 *
 *  The Cobalt-S1 design freezes the Westlight↔Ravensreach pair. RAIL-S2 sealed
 *  the 6x6 service corridor (z=-462..-457, y18..23, x=-254..-236) and the RR
 *  access shaft sleeve. This package builds the Westlight platform deck at the
 *  corridor head, immediately south of the future south track band:
 *
 *    - clear deck volume: x=-253..-237, y=18..23, z=-444..-441
 *    - deck walk surface: y=18, x=-253..-237, z=-444..-441  -> polished_andesite
 *    - sub-floor liner:   y=17 (sub-floor)   x=-253..-237, z=-445..-440
 *    - ceiling liner:     y=24               x=-253..-237, z=-445..-440
 *    - north wall:        z=-445             x=-253..-237, y=18..23
 *    - south wall:        z=-440             x=-253..-237, y=18..23
 *    - west cap:          x=-254             y=18..23, z=-445..-440
 *    - east cap:          x=-236             y=18..23, z=-445..-440
 *
 *  TREATMENT (exact, reversible, durably sealed — the rail segment / RR sleeve
 *  liner pattern): the platform deck surface becomes polished_andesite and
 *  every liner face becomes polished_deepslate. Any fluid sitting on a liner
 *  face or on the deck surface (the lake-boundary water at the west cap, south
 *  wall, and y24 crown) is displaced in place by an exact REPL (never a
 *  removal), so no flow/gravity physics are triggered. The surrounding lake
 *  water body is preserved exactly BEHIND the liner. Rollback restores every
 *  cell to its exact original state.
 *
 *  This is the Westlight platform deck foundation — RAIL-S2 access/civil
 *  containment only. No track, rail, stair, cross-passage, or route
 *  commissioning. The 6x6 service corridor (z=-462..-457) is untouched.
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
const SNAPSHOT = value('--snapshot', 'data/worldsnap-cobalt-rr-post-20260825T061750');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'cobalt-wl-platform-01');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'cobalt-wl-platform-01';
const RELEASE_ID = 'COBALT-WL-PLATFORM-01';
const RELEASE_NODE_ID = 'PASSENGER-RAILWAY';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`COBALT-WL-PLATFORM-01 compiler rejected: ${message}`);
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

const DECK_MATERIAL = 'minecraft:polished_andesite';
const LINER = 'minecraft:polished_deepslate';

// Clear deck volume: 17 wide x 4 deep, from the corridor head (x=-253..-237),
// south of the future south track band (z=-445..-440).
const CLEAR = { minX: -253, maxX: -237, minY: 18, maxY: 23, minZ: -444, maxZ: -441 };

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

// --- 1. Deck surface and liner face cells ------------------------------------
const faces = {
  deck: cellsIn({ minX: -253, maxX: -237, minY: 18, maxY: 18, minZ: -444, maxZ: -441 }),
  subfloor: cellsIn({ minX: -253, maxX: -237, minY: 17, maxY: 17, minZ: -445, maxZ: -440 }),
  ceiling: cellsIn({ minX: -253, maxX: -237, minY: 24, maxY: 24, minZ: -445, maxZ: -440 }),
  north: cellsIn({ minX: -253, maxX: -237, minY: 18, maxY: 23, minZ: -445, maxZ: -445 }),
  south: cellsIn({ minX: -253, maxX: -237, minY: 18, maxY: 23, minZ: -440, maxZ: -440 }),
  west: cellsIn({ minX: -254, maxX: -254, minY: 18, maxY: 23, minZ: -445, maxZ: -440 }),
  east: cellsIn({ minX: -236, maxX: -236, minY: 18, maxY: 23, minZ: -445, maxZ: -440 }),
};
const allFaceCells = Object.values(faces).flat();

// --- 2. Clear deck volume: assert no forbidden above-y18 fluid except the
//        lake-boundary crown cells at y23 (sealed-displaced in place).
const clearForbidden = [];
const clearAboveFluid = [];
for (const cell of cellsIn({ ...CLEAR, minY: 19, maxY: 23 })) {
  const state = await sourceAt(cell);
  if (isForbidden(state)) clearForbidden.push({ ...cell, state });
  if (isFluid(state)) clearAboveFluid.push({ ...cell, state });
}
invariant(clearForbidden.length === 0, `clear deck volume contains forbidden blocks: ${clearForbidden.length}`);
invariant(clearAboveFluid.every((c) => c.y === 23 && blockName(c.state) === 'minecraft:water'),
  `unexpected fluid in clear deck volume above the deck: ${clearAboveFluid.map((c) => `${c.x},${c.y},${c.z}=${c.state}`).join('; ')}`);

// --- 3. Classify deck + liner face cells --------------------------------------
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
    const isDeck = cell.y === 18 && cell.z >= -444 && cell.z <= -441 && cell.x >= -253 && cell.x <= -237;
    buildRecords.push({
      ...cell,
      state,
      role: isDeck ? 'platform-deck' : isFluidSource ? 'sealed-fluid-displacement' : isGravitySource ? 'gravity-seal' : 'liner',
      problem: null,
    });
  }
}
invariant(heldRecords.length === 0, `held deck/liner face cells: ${heldRecords.length}`);
invariant(buildRecords.length === allFaceCells.length,
  `deck/liner face count drift: ${buildRecords.length} != ${allFaceCells.length}`);

// --- 4. Assemble all ops -------------------------------------------------------
const ops = [
  ...buildRecords.map((record) => ({
    cell: { x: record.x, y: record.y, z: record.z },
    sourceState: record.state,
    targetState: record.role === 'platform-deck' ? DECK_MATERIAL : LINER,
    role: record.role,
    packageKey: 'platform',
  })),
  ...clearAboveFluid.map((record) => ({
    cell: { x: record.x, y: record.y, z: record.z },
    sourceState: record.state,
    targetState: LINER,
    role: 'crown-fluid-displacement',
    packageKey: 'platform',
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
// The outer halo contains the preserved lake water body (north of the south
// track band and the south/ceiling lake). The liner box is contiguous and fully
// sealed so no flow-through gap exists.
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
const packageOrder = ['platform'];
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
    role: 'Westlight platform deck (polished_andesite deck surface + polished_deepslate sealed liner box around the clear deck volume)',
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
const deckCells = ops.filter((o) => o.role === 'platform-deck')
  .map(({ cell, sourceState }) => ({ ...cell, sourceState }));
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
    purpose: 'Build the Westlight (PR-W02) station platform deck at the corridor head (x=-254..-236 area). The deck is a polished_andesite walk surface at y18 spanning x=-253..-237, z=-444..-441 (17x4), immediately south of the future south track band (z=-445), wrapped in a sealed polished_deepslate liner box (sub-floor y17, ceiling y24, north z=-445, south z=-440, west x=-254, east x=-236). Any lake-boundary water sitting on a liner face (west cap, south wall, y24 crown) is displaced in place by an exact REPL (never a removal), preserving the surrounding lake water body behind the liner.',
    treatment: 'SEALED_PLATFORM_DECK_LINER_FLUID_DISPLACED_ON_FACES_PRESERVED_BEHIND',
    deckMaterial: DECK_MATERIAL,
    linerMaterial: LINER,
    clearVolume: CLEAR,
    built: classManifest(operatedCells),
    deckSurfaceCells: classManifest(faces.deck),
    linerFaceCells: classManifest(allFaceCells.filter((c) => !(c.y === 18 && c.z >= -444 && c.z <= -441 && c.x >= -253 && c.x <= -237))),
    sealedFluidDisplacementCells: {
      count: sealedFluidDisplacementCells.length,
      cells: sealedFluidDisplacementCells,
    },
    preservedWaterBodyBehindLiner: true,
    deckDry: true,
    held: {
      cellCount: heldRecords.length,
      byReason: census(heldRecords, (record) => record.problems.join(';')),
    },
    routeCommissioned: false,
  },
  source: {
    snapshotRoot: relative(SNAPSHOT),
    designSource: 'data/world-review/cobalt-s1-station-pair-design-20260824/cobalt-s1-design.json',
    priorCorridor: 'RAIL-S2-WL-SEGMENT-01/02-03/04-06',
    priorShaft: 'COBALT-RR-ACCESS-01',
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
    gravity: 'single platform package; every REPL is an in-place exact replacement (never a removal), so no gravity/flow physics are triggered',
  },
  isolation: {
    sourceHazardCount: 0,
    sealedFluidDisplacementCount: sealedFluidDisplacementCells.length,
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
  platformCellCount: ops.length,
  deckSurfaceCellCount: faces.deck.length,
  sealedFluidDisplacementCount: sealedFluidDisplacementCells.length,
  heldCount: heldRecords.length,
  packageCount: packages.length,
  haloFluidCellsPreservedOutside: haloFluidCount,
}, null, 2)}\n`);
