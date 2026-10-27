#!/usr/bin/env node
/** Compile BKR-C01-PORTAL-01 — east-C01 portal pedestrian spine (L1 link).
 *
 * Closes the vertical blocker at the ACTIVE east-C01 mountain portal road cut
 * (z=-140..-137). The route from the surface plateau descends to a walkable
 * shelf at y50/51 (x=794..796) while the L1 concourse floor stands at y44/45.
 * A solid 4-block-tall rock shear wall at x=789..793, y=46..49 (z=-137,-136)
 * fully seals the shaft between them.
 *
 * The survey (data/world-review/c01-portal-l1-route-survey-20260824) proved the
 * original manifest start anchor [684,59,-58,697,68,-50] is a RETIRED waypoint
 * (natural mountain, no portal) and the real portal is the active garage road
 * cut at z=-140..-137. This package therefore builds the pedestrian spine at
 * the active portal, exactly as the survey's repairCandidate design notes.
 *
 * Design (2-wide x 3-high public stair, per runbook): a clean stone_bricks
 * embankment stair along z=-137 and z=-136 from the L1 concourse standable
 * y45 (x=789) up to the natural surface shelf at y50 (x=794..795). Each lane
 * rises one block per column:
 *
 *   z=-137:  stand 45(x789) 46(790) 47(791) 48(792) 49(793); shelf 50(794,795)
 *   z=-136:  stand 45(x789) 46(790) 47(791) 48(792) 49(793); shelf 50(794,795)
 *
 * The embankment fills the open void cells beneath each step (air->stone_bricks,
 * bottom-up) so every step is fully supported, and the shear-wall rock above
 * each stand is excavated (rock->air) for 2-clear headroom. Forward and rollback
 * are exact per-cell REPL inverses. Emits no live calls.
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
const GENERATED_AT = value('--generated-at', '2026-08-24T21:55:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-c01-portal-source-20260824T212500Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'c01-portal-l1-spine');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'c01-portal-l1-spine';
const RELEASE_ID = 'BKR-C01-PORTAL-01';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`C01-PORTAL-01 compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const isAir = (state) => AIR.has(blockName(state));
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

const STAIR_MATERIAL = 'minecraft:stone_bricks';

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

// --- Stair design ----------------------------------------------------------
// 2-wide stair at z=-137 and z=-136. Stand levels rise exactly +1 per column:
//   y45(x789) -> y46(790) -> y47(791) -> y48(792) -> y49(793) -> shelf y50(794,795)
// Embankment cells fill open void air beneath each step (air->stone_bricks).
// Rock cells at the stand level and above are excavated (rock->air) so the
// stand cell is air over solid support with 2-clear headroom.
const LANES = [
  {
    z: -137,
    // air cells beneath each stand that become the step embankment.
    embankment: [
      [790, 45],
      [791, 45], [791, 46],
      [792, 45], [792, 46], [792, 47],
    ],
    // rock cells at the stand level (stand-excavation) plus shear-wall rock
    // above each stand that must become air for 2-clear headroom.
    headroom: [
      [789, 47],
      [790, 48],
      [791, 48], [791, 49],
      [792, 48], [792, 49], [792, 50],
      [793, 49], [793, 50],
    ],
  },
  {
    z: -136,
    embankment: [
      [789, 44],
      [790, 45],
      [791, 45], [791, 46],
    ],
    headroom: [
      [790, 48],
      [791, 48], [791, 49],
      [792, 48], [792, 49], [792, 50],
      [793, 49], [793, 50],
    ],
  },
];

const desired = new Map();
const meta = new Map();
const setTarget = (cell, toState, packageKey, role) => {
  const key = cellKey(cell);
  desired.set(key, { cell, toState });
  meta.set(key, { packageKey, role });
};

for (const lane of LANES) {
  for (const [x, y] of lane.embankment) {
    setTarget({ x, y, z: lane.z }, STAIR_MATERIAL, 'step-floors', 'stair-embankment');
  }
  for (const [x, y] of lane.headroom) {
    setTarget({ x, y, z: lane.z }, 'minecraft:air', 'headroom-clears', 'headroom-clear');
  }
}

const targetCells = [...desired.values()].map(({ cell }) => cell);
const targetKeys = new Set(targetCells.map(cellKey));
const records = [];
for (const [key, target] of desired) {
  const sourceState = await sourceAt(target.cell);
  records.push({ ...target, key, sourceState, ...meta.get(key) });
}
const operations = records.filter(({ sourceState, toState }) => sourceState !== toState);
const alreadyTarget = records.filter(({ sourceState, toState }) => sourceState === toState);

// Safety: sources must be plain removable rock family or air (for embankment
// fills), never gravity/fluid/forbidden.
const SOLID_REMOVABLE = new Set([
  'minecraft:stone', 'minecraft:granite', 'minecraft:diorite', 'minecraft:andesite',
  'minecraft:deepslate', 'minecraft:tuff', 'minecraft:dripstone_block',
  'minecraft:coal_ore', 'minecraft:iron_ore', 'minecraft:copper_ore',
  'minecraft:gold_ore', 'minecraft:redstone_ore', 'minecraft:diamond_ore',
  'minecraft:emerald_ore', 'minecraft:lapis_ore', 'minecraft:deepslate_iron_ore',
  'minecraft:deepslate_copper_ore', 'minecraft:deepslate_coal_ore',
]);
const SOLID_RETAINED = new Set([
  'minecraft:polished_deepslate', 'minecraft:reinforced_deepslate',
  'minecraft:polished_blackstone', 'minecraft:stone_bricks', 'minecraft:gray_concrete',
  'minecraft:light_blue_concrete', 'minecraft:white_concrete', 'minecraft:smooth_stone',
]);
for (const operation of operations) {
  const name = blockName(operation.sourceState);
  invariant(!isFluid(operation.sourceState), `fluid target source at ${operation.key}`);
  invariant(!isForbidden(operation.sourceState), `forbidden target source at ${operation.key}`);
  invariant(!isGravity(operation.sourceState), `gravity target source at ${operation.key}`);
  const removable = SOLID_REMOVABLE.has(name);
  const retained = SOLID_RETAINED.has(name);
  invariant(isAir(operation.sourceState) || removable || retained,
    `unexpected target source at ${operation.key}: ${operation.sourceState}`);
}

// Halo: 1-cell 6-neighborhood around every target.
const haloCells = uniqueCells(targetCells.flatMap((cell) => (
  [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]
    .map(([dx, dy, dz]) => ({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz }))
))).filter((cell) => !targetKeys.has(cellKey(cell)));
const haloRecords = [];
for (const cell of haloCells) {
  haloRecords.push({ cell, state: await sourceAt(cell) });
}
const haloFluid = haloRecords.filter(({ state }) => isFluid(state));
const haloForbidden = haloRecords.filter(({ state }) => isForbidden(state));
const haloGravity = haloRecords.filter(({ state }) => isGravity(state));
invariant(haloFluid.length === 0 && haloForbidden.length === 0 && haloGravity.length === 0,
  `interaction halo hazard: ${JSON.stringify({
    fluid: haloFluid.slice(0, 10), forbidden: haloForbidden.slice(0, 10), gravity: haloGravity.slice(0, 10),
  })}`);

// Block-entity and saved-entity clearance over the operated envelope.
const envelope = boundsOf(uniqueCells([...targetCells, ...haloCells]));
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

// Support check: every embankment cell must have non-air, non-fluid, non-gravity
// projected support immediately below (either the cell below is retained solid,
// another embankment cell, or the natural floor).
const projected = new Map(operations.map(({ cell, toState }) => [cellKey(cell), toState]));
const embankmentRecords = operations.filter(({ role }) => role === 'stair-embankment');
for (const record of embankmentRecords) {
  const belowKey = cellKey({ x: record.cell.x, y: record.cell.y - 1, z: record.cell.z });
  const belowState = projected.get(belowKey)
    ?? haloRecords.find((r) => cellKey(r.cell) === belowKey)?.state
    ?? await sourceAt({ x: record.cell.x, y: record.cell.y - 1, z: record.cell.z });
  invariant(!isAir(belowState) && !isFluid(belowState) && !isGravity(belowState)
    && !isForbidden(belowState),
    `embankment lacks projected support at ${cellKey(record.cell)}: below=${belowState}`);
}

// Route proof (offline projection): simulate the built state and run a normal
// walk from the stair bottom to the surface shelf.
const projectState = new Map(operations.map(({ cell, toState }) => [cellKey(cell), toState]));
const projectionReader = async (cell) => {
  const key = cellKey(cell);
  if (projectState.has(key)) return projectState.get(key);
  const halo = haloRecords.find((r) => cellKey(r.cell) === key);
  if (halo) return halo.state;
  return sourceAt(cell);
};
const projectedStandable = new Set();
const surveyCells = uniqueCells([
  ...targetCells, ...haloCells,
  ...LANES.flatMap((lane) => lane.embankment.map(([x, y]) => ({ x, y, z: lane.z }))),
  ...LANES.flatMap((lane) => lane.headroom.map(([x, y]) => ({ x, y, z: lane.z }))),
  ...[[794, 50, -137], [794, 50, -136], [795, 50, -137], [795, 50, -136]],
]);
for (const cell of surveyCells) {
  const state = await projectionReader(cell);
  const name = blockName(state);
  if (!isAir(state) || isFluid(state)) continue;
  const belowKey = cellKey({ x: cell.x, y: cell.y - 1, z: cell.z });
  const belowState = await projectionReader({ x: cell.x, y: cell.y - 1, z: cell.z });
  const aboveState = await projectionReader({ x: cell.x, y: cell.y + 1, z: cell.z });
  if (isAir(state) && !isAir(belowState) && isAir(aboveState)) projectedStandable.add(cellKey(cell));
}
const keyToCell = (k) => { const [x, y, z] = k.split(',').map(Number); return { x, y, z }; };
const walkNeighbors = (cell) => {
  const out = [];
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (const dy of [-1, 0, 1]) {
      const n = `${cell.x + dx},${cell.y + dy},${cell.z + dz}`;
      if (projectedStandable.has(n)) out.push(n);
    }
  }
  return out;
};
const routeSeed = `${LANES[0].embankment[0][0]},${LANES[0].embankment[0][1] + 1},${LANES[0].z}`;
const routeVisited = new Set([routeSeed]);
const routeQueue = [routeSeed];
while (routeQueue.length) {
  const k = routeQueue.shift();
  for (const n of walkNeighbors(keyToCell(k))) {
    if (!routeVisited.has(n)) { routeVisited.add(n); routeQueue.push(n); }
  }
}
const routeReachesShelf = [794, 795].some((x) => [-137, -136].some((z) => routeVisited.has(`${x},50,${z}`)));
invariant(routeReachesShelf, `projected route does not reach the top shelf`);

// Emit packages. Execution order: floor placements bottom-up first (they give
// the stands), then headroom clears top-down.
const packageOrder = ['step-floors', 'headroom-clears'];
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
  const forwardPath = path.join(OUT_DIR, `${BASENAME}.${key}.forward.txt`);
  const rollbackPath = path.join(OUT_DIR, `${BASENAME}.${key}.rollback.txt`);
  const forwardBody = `${group.map(({ cell, sourceState, toState }) => replLine(cell, sourceState, toState)).join('\n')}\n`;
  const reverse = [...group].reverse();
  const rollbackBody = `${reverse.map(({ cell, sourceState, toState }) => replLine(cell, toState, sourceState)).join('\n')}\n`;
  const header = [
    `# GENERATED FILE - ${RELEASE_ID} (${key})`,
    `# source root: ${SNAPSHOT}`,
    `# target coordinate-set SHA-256: ${hashCells(group.map(({ cell }) => cell))}`,
  ].join('\n');
  fs.writeFileSync(absolute(forwardPath), `${header}\n${forwardBody}`);
  fs.writeFileSync(absolute(rollbackPath), `${header}\n${rollbackBody}`);
  packages.push({ key, forward: relative(forwardPath), rollback: relative(rollbackPath) });
  operationManifest[key] = {
    role: key === 'step-floors' ? 'stair embankment placements (air/rock->stone_bricks, bottom-up)' : 'headroom rock excavation clears (rock->air, top-down)',
    forwardSha256: sha256(forwardBody),
    rollbackSha256: sha256(rollbackBody),
    forwardCommandCount: group.length,
    rollbackCommandCount: group.length,
    targetCoordinateSetSha256: hashCells(group.map(({ cell }) => cell)),
    exactInverse: true,
  };
}

const allOperations = operations;
const operationRoles = Object.fromEntries([...new Set(records.map(({ role }) => role))].sort().map((role) => [
  role,
  classManifest(records.filter((record) => record.role === role).map(({ cell }) => cell)),
]));
const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: TRANSACTION_ID,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_FRESH_SOURCE_AWAITING_EXECUTION_KERNEL',
  releaseNodeId: 'CZ-LEGACY-CROSS-AREA-CIRCULATION',
  mvpScope: false,
  scopeIds: ['TE-C01-BUNKER'],
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'town-expansion-r1',
    purpose: 'Build the east-C01 portal pedestrian spine linking the active mountain portal road cut (surface shelf y50/51) down to the L1 concourse floor (y44/45) through the 4-block rock shear wall at x=789..793, z=-137,-136: a clean 2-wide x 3-high public stair with exact rock excavations and stone_bricks embankment steps.',
    treatment: 'STAIR_EMBANKMENT_THROUGH_SOLID_ROCK_SHEAR_WALL_2WIDE_3HIGH',
    stairMaterial: STAIR_MATERIAL,
    activePortal: {
      roadCutZ: [-140, -137],
      shelfY: 50,
      l1FloorY: 45,
      shearWall: { minX: 789, maxX: 793, minY: 46, maxY: 49, z: [-137, -136] },
    },
    retiredManifestAnchor: {
      box: [684, 59, -58, 697, 68, -50],
      disposition: 'RETIRED_WAYPOINT natural mountain, no portal structure; superseded by active road cut at z=-140..-137 (survey c01-portal-l1-route-survey-20260824). This package builds at the active portal.',
    },
    lanes: LANES,
    shelf: { x: [794, 795], z: [-137, -136], y: 50 },
    built: classManifest(allOperations.map(({ cell }) => cell)),
    embankmentCells: classManifest(embankmentRecords.map(({ cell }) => cell)),
    headroomClearCells: classManifest(operations.filter(({ role }) => role === 'headroom-clear').map(({ cell }) => cell)),
    held: { cellCount: 0, byReason: {} },
    interactionHalo: classManifest(haloCells),
    routeProof: {
      seed: routeSeed,
      reachesShelf: routeReachesShelf,
    },
    routeCommissioned: false,
  },
  source: {
    snapshotRoot: relative(SNAPSHOT),
  },
  target: {
    operatedUnion: classManifest(allOperations.map(({ cell }) => cell)),
    desiredStateCensus: census(allOperations, (record) => record.toState),
    sourceStateCensus: census(allOperations, (record) => record.sourceState),
    interactionHalo: classManifest(haloCells),
    packageTargetsDisjoint: true,
  },
  operations: operationManifest,
  packages,
  executionOrder: {
    forward: packageOrder,
    rollback: packageOrder.slice().reverse(),
    gravity: 'embankment placements bottom-up, headroom clears top-down; rollback restores headroom clears first then removes embankment top-down',
  },
  isolation: {
    sourceHazardCount: 0,
    operatedHaloFluidCount: haloFluid.length,
    operatedHaloForbiddenBlockCount: haloForbidden.length,
    operatedHaloGravityBlockCount: haloGravity.length,
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
  targetCount: targetCells.length,
  operationCount: operations.length,
  alreadyTargetCount: alreadyTarget.length,
  embankmentCount: embankmentRecords.length,
  headroomClearCount: operations.filter(({ role }) => role === 'headroom-clear').length,
  haloCount: haloCells.length,
  haloFluidCount: haloFluid.length,
  haloForbiddenCount: haloForbidden.length,
  haloGravityCount: haloGravity.length,
  blockEntityCount: blockEntities.length,
  savedEntityCount: savedEntities.length,
  routeReachesShelf,
  packageCount: packages.length,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2)}\n`);
