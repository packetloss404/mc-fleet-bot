#!/usr/bin/env node
/** Compile CIRC-WL-ARRIVAL-01 — Westlight arrival pedestrian-edge completion.
 *
 * CIRC-WL-ARRIVAL-01 closes the last unbuilt gap in the Approach Road
 * pedestrian edge: the south 2-wide edge beside the White Bridge arrival deck
 * from the Gatehead transition (x=-318) eastward to the White Bridge approach
 * (x=-310). The prior CIRC-WL-ARRIVAL-ROAD-01 release built the east/central
 * edge (x=-322, x=-319, and every conflict-free column east to x=-148). The
 * survey's deck model classified x=-316..-310 at the gravel plaza level (y67)
 * with south-edge obstruction, but the actual gray_concrete bridge-approach
 * deck at those columns sits at deckY 69-71 with a clean air south edge at
 * z=-492,-491 — the exact structural pattern the prior release built at x=-319
 * and x=-322.
 *
 * This compiler is pinned to the accepted r08am post snapshot (the same one the
 * survey and the prior edge release used) and derives the edge purely from exact
 * cell state:
 *   - edge cells: (x, deckY, z=-492..-491) for x=-318..-310 — exact air, two-clear
 *     headroom above, non-colliding for the full 3-4 block clearance;
 *   - support fills: every air/plant cell from deckY-1 down to the solid
 *     (gravel/stone) terminal, bounded depth 1-3 (matching the prior release's
 *     MAX_SUPPORT_DEPTH rule);
 *   - hazards fail closed: fluid, container/control blocks, block entities, and
 *     saved movable entities in the operated envelope or 1-cell halo.
 *
 * The 7-wide carriageway (gray_concrete) cells are never touched; every operated
 * cell is a road-adjacent edge cell at the same deck elevation. Forward and
 * rollback are exact per-cell REPL inverses. This emits no live calls.
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
const GENERATED_AT = value('--generated-at', '2026-08-24T12:00:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r08am-post-20260822T161818Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'westlight-arrival-pedestrian-edge');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'westlight-arrival-pedestrian-edge';
const RELEASE_ID = 'CIRC-WL-ARRIVAL-01';
const RELEASE_NODE_ID = 'CZ-LEGACY-CROSS-AREA-CIRCULATION';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`CIRC-WL-ARRIVAL-01 compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const isAir = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(blockName(state));
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const NON_COLLIDING = new Set([
  'minecraft:air', 'minecraft:cave_air', 'minecraft:void_air',
  'minecraft:short_grass', 'minecraft:tall_grass', 'minecraft:poppy',
  'minecraft:dandelion', 'minecraft:azure_bluet', 'minecraft:cornflower',
  'minecraft:bush', 'minecraft:fern', 'minecraft:large_fern', 'minecraft:torch',
  'minecraft:wall_torch', 'minecraft:redstone_torch', 'minecraft:sea_pickle',
  'minecraft:kelp', 'minecraft:seagrass', 'minecraft:sugar_cane', 'minecraft:cobweb',
  'minecraft:red_carpet', 'minecraft:blue_carpet', 'minecraft:yellow_carpet',
  'minecraft:white_carpet', 'minecraft:snow',
]);
const isNonColliding = (state) => NON_COLLIDING.has(blockName(state));
const PLANTS = new Set([
  'minecraft:short_grass', 'minecraft:tall_grass', 'minecraft:poppy',
  'minecraft:dandelion', 'minecraft:azure_bluet', 'minecraft:cornflower',
  'minecraft:bush', 'minecraft:fern', 'minecraft:large_fern',
]);
const isVoidFillable = (state) => isAir(state) || PLANTS.has(blockName(state));
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

const MAX_SUPPORT_DEPTH = 3;
const EDGE_MATERIAL = 'minecraft:gray_concrete';
const SUPPORT_MATERIAL = 'minecraft:stone';

const SURVEY = 'data/world-review/circ-wl-arrival-01-survey-2026-08-24T01-18-16-141Z/wl-arrival-01-survey.json';
const EDGE_X_RANGE = [-318, -310];
const EDGE_Z_RANGE = [-492, -491];

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

// Find the gray_concrete carriageway deck elevation at each column (z=-493 is
// inside the 7-wide run for every candidate column).
async function deckYFor(x) {
  for (let y = 76; y >= 64; y -= 1) {
    const state = await sourceAt({ x, y, z: -493 });
    if (blockName(state) === 'minecraft:gray_concrete') return y;
  }
  return null;
}

// --- Derive the exact edge + support targets -------------------------------
const buildRecords = [];
const heldRecords = [];
for (let x = EDGE_X_RANGE[0]; x <= EDGE_X_RANGE[1]; x += 1) {
  const deckY = await deckYFor(x);
  invariant(deckY !== null, `no gray_concrete carriageway at x=${x}, z=-493`);
  for (const z of EDGE_Z_RANGE) {
    const cell = { x, y: deckY, z };
    const problems = [];
    const fills = [];
    const surf = await sourceAt(cell);
    const below = await sourceAt({ x, y: deckY - 1, z });
    const h1 = await sourceAt({ x, y: deckY + 1, z });
    const h2 = await sourceAt({ x, y: deckY + 2, z });
    if (isFluid(surf)) problems.push('surface-fluid');
    if (isForbidden(surf)) problems.push('surface-forbidden');
    if (!isNonColliding(h1)) problems.push(`headroom-h1=${blockName(h1).replace('minecraft:', '')}`);
    if (!isNonColliding(h2)) problems.push(`headroom-h2=${blockName(h2).replace('minecraft:', '')}`);
    if (isVoidFillable(below)) {
      let yy = deckY - 1;
      let reachedBase = false;
      for (; yy >= 0; yy -= 1) {
        const st = await sourceAt({ x, y: yy, z });
        if (isVoidFillable(st)) { fills.push({ x, y: yy, z, source: st }); continue; }
        if (isFluid(st)) { problems.push(`fluid-base@y${yy}`); break; }
        if (isForbidden(st)) { problems.push(`forbidden-base@y${yy}`); break; }
        reachedBase = true;
        break;
      }
      if (!reachedBase && problems.length === 0) problems.push('no-base-found');
      if (fills.length > MAX_SUPPORT_DEPTH && problems.length === 0) {
        problems.push(`support-depth>${MAX_SUPPORT_DEPTH}(${fills.length})`);
        fills.length = 0;
      }
    }
    if (problems.length === 0) buildRecords.push({ ...cell, surf, fills });
    else heldRecords.push({ ...cell, surf, problems });
  }
}

invariant(buildRecords.length === 18,
  `edge target count drift: ${buildRecords.length} != 18`);

const edgeOps = buildRecords.map((record) => ({
  cell: { x: record.x, y: record.y, z: record.z },
  sourceState: record.surf,
  targetState: EDGE_MATERIAL,
  role: 'pedestrian-edge',
  packageKey: 'edge-pave',
}));
const supportOps = [];
for (const record of buildRecords) {
  for (const fill of record.fills) {
    invariant(isVoidFillable(fill.source) && fill.source !== EDGE_MATERIAL && fill.source !== SUPPORT_MATERIAL,
      `unexpected support source at (${fill.x},${fill.y},${fill.z}): ${fill.source}`);
    supportOps.push({
      cell: { x: fill.x, y: fill.y, z: fill.z },
      sourceState: fill.source,
      targetState: SUPPORT_MATERIAL,
      role: 'edge-support-fill',
      packageKey: 'support-fill',
    });
  }
}
invariant(supportOps.length === 36, `support-fill count drift: ${supportOps.length} != 36`);

// Duplicate-target / noop guards.
const targetKeys = new Set();
for (const record of [...edgeOps, ...supportOps]) {
  const key = cellKey(record.cell);
  invariant(!targetKeys.has(key), `duplicate target ${key}`);
  targetKeys.add(key);
  invariant(await sourceAt(record.cell) === record.sourceState
    && record.sourceState !== record.targetState,
  `source/noop guard drift at ${key}`);
}

// Surface-only edge cells need a solid (non-air, non-plant, non-fluid) support
// immediately below after projection.
const projected = new Map([...edgeOps, ...supportOps].map(({ cell, targetState }) => [
  cellKey(cell), targetState,
]));
for (const record of buildRecords) {
  if (record.fills.length > 0) continue;
  const belowKey = cellKey({ x: record.x, y: record.y - 1, z: record.z });
  const belowState = projected.get(belowKey) ?? await sourceAt({ x: record.x, y: record.y - 1, z: record.z });
  invariant(!isAir(belowState) && !isFluid(belowState) && !isVoidFillable(belowState)
    && !isForbidden(belowState),
  `edge cell lacks projected support at (${record.x},${record.y},${record.z}): ${belowState}`);
}

// Interaction halo (3x3x3 around every operated cell).
const operatedCells = uniqueCells([...edgeOps, ...supportOps].map(({ cell }) => cell));
const haloCells = uniqueCells(operatedCells.flatMap((cell) => {
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
for (const cell of haloCells) {
  const st = await sourceAt(cell);
  if (isFluid(st)) haloFluidCount += 1;
  if (isForbidden(st)) haloForbiddenCount += 1;
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

// --- Emit packages ----------------------------------------------------------
const packageOrder = ['support-fill', 'edge-pave'];
const packageGroups = new Map(packageOrder.map((key) => [key, []]));
for (const op of supportOps) packageGroups.get(op.packageKey).push(op);
for (const op of edgeOps) packageGroups.get(op.packageKey).push(op);
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
    role: key === 'support-fill' ? 'shallow edge-support fill' : '2-wide pedestrian edge paving',
    forwardSha256: sha256(forwardBody),
    rollbackSha256: sha256(rollbackBody),
    forwardCommandCount: group.length,
    rollbackCommandCount: group.length,
    targetCoordinateSetSha256: hashCells(group.map(({ cell }) => cell)),
    exactInverse: true,
  };
}

const allOperations = [...supportOps, ...edgeOps];
const heldByReason = census(heldRecords, (record) => record.problems.join(';'));
const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: TRANSACTION_ID,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_SNAPSHOT_OFFLINE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: false,
  scopeIds: ['WESTLIGHT-DISTRICT'],
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'westlight-district',
    purpose: 'Complete the Westlight arrival pedestrian edge at the Gatehead/White Bridge approach: a 2-wide gray_concrete edge beside the preserved 7-wide carriageway at deckY 69-71 from x=-318..-310, closing the gap between the already-built x=-319 edge and the White Bridge.',
    treatment: 'SURFACE_LEVEL_PEDESTRIAN_EDGE_WITH_SHALLOW_SUPPORT_FILLS',
    edgeMaterial: EDGE_MATERIAL,
    supportMaterial: SUPPORT_MATERIAL,
    deckColumns: { minX: EDGE_X_RANGE[0], maxX: EDGE_X_RANGE[1], edgeZ: EDGE_Z_RANGE },
    built: classManifest(operatedCells),
    builtEdgeCells: classManifest(edgeOps.map(({ cell }) => cell)),
    supportFillCells: classManifest(supportOps.map(({ cell }) => cell)),
    held: {
      cellCount: heldRecords.length,
      byReason: heldByReason,
    },
    interactionHalo: classManifest(haloCells),
    carriagewayPreservedExactly: true,
    routeCommissioned: false,
  },
  source: {
    snapshotRoot: relative(SNAPSHOT),
    survey: {
      path: relative(SURVEY),
    },
  },
  target: {
    operatedUnion: classManifest(allOperations.map(({ cell }) => cell)),
    desiredStateCensus: census(allOperations, (record) => record.targetState),
    sourceStateCensus: census(allOperations, (record) => record.sourceState),
    interactionHalo: classManifest(haloCells),
    packageTargetsDisjoint: true,
  },
  operations: operationManifest,
  packages,
  executionOrder: {
    forward: packageOrder.filter((key) => operationManifest[key]),
    rollback: packageOrder.filter((key) => operationManifest[key]).reverse(),
    gravity: 'support fills bottom-up, then edge paving; rollback removes edge paving first, then support fills top-down',
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
  edgeCellCount: edgeOps.length,
  supportFillCount: supportOps.length,
  totalOperationCount: allOperations.length,
  heldCount: heldRecords.length,
  packageCount: packages.length,
}, null, 2)}\n`);
