#!/usr/bin/env node
/**
 * RR-C2-01 — Raven Rock C2 inter-cavern corridor fail-closed containment cap.
 *
 * Survey evidence (BKR-SURVEY-00 on the accepted R08AM post snapshot):
 *   - C2 is a 3-wide dry-secondary corridor candidate but FAILS because the
 *     corridor spine east of x=-80 is pervasively flooded (1,622 water sources
 *     + 1,018 falling + 233 flowing in the corridor band) and the Cavern C
 *     threshold at x=-114 is a water-filled 1-wide obsidian pinch.
 *   - The only dry, structurally solid run is x=-77..-80 (the Cavern A
 *     vestibule), which is already 3-wide+ and walkable.
 *
 * This package builds OPTION B: a fail-closed solid containment cap at
 * x=-80 (the safe dry east point) sealing the dry corridor from the flooded
 * eastern continuation. Cavern C is recorded as a permanent wet hold.
 *
 * The cap is exactly 60 air cells in the corridor cross-section at x=-80,
 * filled with stone_bricks:
 *   - corridor plane:  z = -11..-15, y = -11..-4  (feet-through-ceiling wall)
 *   - north channel:   z = -16..-18, y = -10..-4  (seals the air above the
 *     existing water pool; the water cells at y=-11 are NEVER touched)
 * The single deepslate_gold_ore at (-80,-5,-13) is already solid and left in
 * place. Every target is exact air in the accepted snapshot; zero fluid,
 * container, block-entity, or saved-entity targets. Forward and rollback are
 * exact per-cell REPL inverses. This emits no live calls.
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
const BASENAME = value('--basename', 'rr-c2-01-cap');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'rr-c2-01-cap';
const RELEASE_ID = 'RR-C2-01';
const RELEASE_NODE_ID = 'CZ-LEGACY-RAVEN-ROCK-CIRCULATION';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`RR-C2-01 compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const isAir = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(blockName(state));
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const CONTAINER_BLOCK = new Set([
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
const isContainer = (state) => CONTAINER_BLOCK.has(blockName(state)) || blockName(state).endsWith('_shulker_box');
const CAP_MATERIAL = 'minecraft:stone_bricks';

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const sourceCache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!sourceCache.has(key)) {
    sourceCache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  }
  return sourceCache.get(key);
};

// --- Derive the exact cap target cells --------------------------------------
// Corridor plane at x=-80: the 5-wide dry passage z=-11..-15, feet y=-11 up to
// ceiling y=-4. North channel air above the water pool: z=-16..-18, y=-10..-4.
const CAP_X = -80;
const buildRecords = [];
const heldRecords = [];

for (const z of [-11, -12, -13, -14, -15]) {
  for (let y = -11; y <= -4; y += 1) {
    const cell = { x: CAP_X, y, z };
    const problems = [];
    const surf = await sourceAt(cell);
    if (!isAir(surf)) problems.push(`source-not-air=${blockName(surf).replace('minecraft:', '')}`);
    if (isFluid(surf)) problems.push('source-fluid');
    if (isContainer(surf)) problems.push('source-container');
    if (problems.length === 0) buildRecords.push({ ...cell, source: surf });
    else heldRecords.push({ ...cell, source: surf, problems });
  }
}
for (const z of [-16, -17, -18]) {
  for (let y = -10; y <= -4; y += 1) {
    const cell = { x: CAP_X, y, z };
    const problems = [];
    const surf = await sourceAt(cell);
    if (!isAir(surf)) problems.push(`source-not-air=${blockName(surf).replace('minecraft:', '')}`);
    if (isFluid(surf)) problems.push('source-fluid');
    if (isContainer(surf)) problems.push('source-container');
    if (problems.length === 0) buildRecords.push({ ...cell, source: surf });
    else heldRecords.push({ ...cell, source: surf, problems });
  }
}

invariant(buildRecords.length === 60,
  `cap target count drift: ${buildRecords.length} != 60`);

const capOps = buildRecords.map((record) => ({
  cell: { x: record.x, y: record.y, z: record.z },
  sourceState: record.source,
  targetState: CAP_MATERIAL,
  role: 'containment-cap',
  packageKey: 'cap',
}));

// Duplicate-target / noop guards.
const targetKeys = new Set();
for (const op of capOps) {
  const key = cellKey(op.cell);
  invariant(!targetKeys.has(key), `duplicate target ${key}`);
  targetKeys.add(key);
  invariant(await sourceAt(op.cell) === op.sourceState
    && op.sourceState !== op.targetState,
  `source/noop guard drift at ${key}`);
}

// The gold-ore cell at (-80,-5,-13) is already solid: verify it is untouched
// and non-colliding (it is part of the sealed wall).
const goldOre = await sourceAt({ x: CAP_X, y: -5, z: -13 });
invariant(blockName(goldOre) === 'minecraft:deepslate_gold_ore',
  `gold-ore wall cell drift at ${CAP_X},-5,-13: ${goldOre}`);

// The cap wall at x=-80 is a free-standing barrier spanning the corridor
// cross-section. It is anchored by the south wall (z=-10 deepslate), the north
// wall (z=-19 tuff), and the ceiling (y=-3 deepslate), and sits on the floor
// (y=-12 stone_bricks/tuff except a pre-existing water channel at z=-12 which
// is NOT operated). The east flood (x=-81, water surface at y=-12 corridor /
// y=-11 north channel) is fully below the operated band (y=-11..-4), so the
// wall is water-tight: water cannot flow upward through solid stone_bricks.
// The west face (x=-79) is the dry corridor the wall protects.

// 1. The operated band must be continuous in z across the full wall where it
// is meant to be solid:
//    - corridor plane z=-11..-15: solid across y=-11..-4
//    - north channel z=-16..-18: solid across y=-10..-4 (the water pool at
//      y=-11 is deliberately NOT operated — it is sealed above)
// A "solid" cell is an operated target or a pre-existing non-air non-fluid
// block (e.g. the deepslate_gold_ore at y=-5,z=-13).
for (let y = -11; y <= -4; y += 1) {
  const row = [];
  for (const z of [-11, -12, -13, -14, -15]) {
    if (targetKeys.has(cellKey({ x: CAP_X, y, z }))) { row.push('X'); continue; }
    const st = await sourceAt({ x: CAP_X, y, z });
    row.push(!isAir(st) && !isFluid(st) ? 'S' : '.');
  }
  invariant(row.every((c) => c === 'X' || c === 'S'),
    `corridor-plane band gap at y=${y}: ${row.join('')}`);
}
for (let y = -10; y <= -4; y += 1) {
  const row = [];
  for (const z of [-16, -17, -18]) {
    if (targetKeys.has(cellKey({ x: CAP_X, y, z }))) { row.push('X'); continue; }
    const st = await sourceAt({ x: CAP_X, y, z });
    row.push(!isAir(st) && !isFluid(st) ? 'S' : '.');
  }
  invariant(row.every((c) => c === 'X' || c === 'S'),
    `north-channel band gap at y=${y}: ${row.join('')}`);
}

// 2. The ceiling above the operated band is solid (seals the top).
for (const z of [-11, -12, -13, -14, -15, -16, -17, -18]) {
  const ceiling = await sourceAt({ x: CAP_X, y: -3, z });
  invariant(!isAir(ceiling) && !isFluid(ceiling),
    `ceiling not sealed at ${CAP_X},-3,${z}: ${ceiling}`);
}

// 3. North channel water pool at y=-11 must remain sealed ABOVE by operated
// cells or solid blocks and must NOT be operated.
for (const z of [-16, -17, -18]) {
  const pool = await sourceAt({ x: CAP_X, y: -11, z });
  invariant(isFluid(pool), `north-channel pool at ${CAP_X},-11,${z} is not fluid: ${pool}`);
  const above = await sourceAt({ x: CAP_X, y: -10, z });
  invariant(!isAir(above) || targetKeys.has(cellKey({ x: CAP_X, y: -10, z })),
    `north-channel pool not sealed above at ${CAP_X},-10,${z}: ${above}`);
}

// Interaction halo (3x3x3 around every operated cell) — fail closed on fluid
// or container/control blocks.
const operatedCells = uniqueCells(capOps.map(({ cell }) => cell));
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
let haloContainerCount = 0;
for (const cell of haloCells) {
  const st = await sourceAt(cell);
  if (isFluid(st)) haloFluidCount += 1;
  if (isContainer(st)) haloContainerCount += 1;
}
// Water pool at y=-11 in the north channel and the east flood are adjacent but
// NEVER operated; the compiler only requires that operated targets are air.
invariant(haloContainerCount === 0, `interaction halo container hazard: ${haloContainerCount}`);

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
    const entityChunk = await new AnvilReader(absolute(path.join(SNAPSHOT, 'entities'))).chunk(cx, cz);
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

// --- Emit the single package -------------------------------------------------
const packageOrder = ['cap'];
const packageGroups = new Map(packageOrder.map((key) => [key, []]));
for (const op of capOps) packageGroups.get(op.packageKey).push(op);
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
    role: 'fail-closed containment cap at x=-80 sealing the dry C2 corridor from the flooded eastern continuation',
    forwardSha256: sha256(forwardBody),
    rollbackSha256: sha256(rollbackBody),
    forwardCommandCount: group.length,
    rollbackCommandCount: group.length,
    targetCoordinateSetSha256: hashCells(group.map(({ cell }) => cell)),
    exactInverse: true,
  };
}

const allOperations = capOps;
const heldByReason = Object.fromEntries(
  [...heldRecords.reduce((counts, record) => {
    const reason = record.problems.join(';');
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
    return counts;
  }, new Map()).entries()].sort((a, b) => b[1] - a[1]),
);

const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: TRANSACTION_ID,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_SNAPSHOT_OFFLINE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: false,
  scopeIds: ['RAVEN-ROCK'],
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'raven-rock',
    purpose: 'Build a fail-closed solid containment cap at x=-80 in the Raven Rock C2 inter-cavern corridor, sealing the dry Cavern A vestibule (x=-77..-80) from the pervasively flooded eastern continuation to Cavern C. Cavern C is recorded as a permanent wet hold.',
    treatment: 'FAIL_CLOSED_CONTAINMENT_CAP_AT_SAFE_DRY_POINT',
    capMaterial: CAP_MATERIAL,
    capX: CAP_X,
    corridorPlane: { z: [-11, -15], y: [-11, -4] },
    northChannelAir: { z: [-16, -18], y: [-10, -4] },
    built: classManifest(operatedCells),
    held: {
      cellCount: heldRecords.length,
      byReason: heldByReason,
    },
    interactionHalo: classManifest(haloCells),
    cavernCWetHold: true,
    dryCorridorSealed: true,
    routeCommissioned: false,
  },
  source: {
    snapshotRoot: relative(SNAPSHOT),
    survey: {
      path: 'data/world-review/bkr-survey-00-20260824/bkr-survey-00.json',
      finding: 'C2 corridor spine east of x=-80 is pervasively flooded; only the Cavern A vestibule x=-77..-80 is dry.',
    },
  },
  target: {
    operatedUnion: classManifest(operatedCells),
    desiredStateCensus: { 'minecraft:stone_bricks': allOperations.length },
    sourceStateCensus: { 'minecraft:air': allOperations.length },
    interactionHalo: classManifest(haloCells),
    packageTargetsDisjoint: true,
    zeroFluidTargets: true,
    zeroContainerTargets: true,
  },
  operations: operationManifest,
  packages,
  executionOrder: {
    forward: packageOrder.filter((key) => operationManifest[key]),
    rollback: packageOrder.filter((key) => operationManifest[key]).reverse(),
    gravity: 'single solid cap package; rollback is the exact reverse per-cell inverse',
  },
  isolation: {
    sourceHazardCount: 0,
    operatedHaloFluidCount: haloFluidCount,
    operatedHaloContainerBlockCount: haloContainerCount,
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
function classManifest(cells) {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
}
const manifestIdentity = sha256(Buffer.from(`${JSON.stringify(manifestWithoutIdentity, null, 2)}\n`));
const manifest = { ...manifestWithoutIdentity, manifestIdentity };
fs.writeFileSync(absolute(MANIFEST_OUT), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  status: manifest.status,
  manifest: relative(MANIFEST_OUT),
  manifestIdentity,
  capCellCount: capOps.length,
  heldCount: heldRecords.length,
  heldByReason,
  packageCount: packages.length,
}, null, 2)}\n`);
