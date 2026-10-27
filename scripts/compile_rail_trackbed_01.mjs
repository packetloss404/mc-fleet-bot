#!/usr/bin/env node
/** Compile RAIL-S3 — Cobalt corridor track-bed preparation, first slice (TRACKBED-01).
 *
 * The Cobalt-S1 corridor bore is built as sealed 6×6 polished_deepslate liner
 * boxes (Leg A x=-254..-136 at z=-462..-457, plus the Leg B/C connector to the
 * Ravensreach shaft). The corridor interior clear volume is y=18..23; the
 * liner floor sits at y=17. The corridor floor at y=18 (the surface where the
 * future rail bed will sit) is currently uneven natural rock — a mix of stone,
 * andesite, diorite and iron_ore with scattered already-placed polished_deepslate
 * cells from the RAIL-S2 floor-lava displacement.
 *
 * This package levels the FIRST segment's corridor floor — the Westlight-side
 * cell block x=-254..-236 (the same cell block as RAIL-S2-WL-SEGMENT-01) — to a
 * smooth, level, solid `polished_deepslate` track-bed surface at y=18,
 * z=-462..-457 (6 cells across).
 *
 * TREATMENT (exact, reversible, civil-only):
 *   Every uneven corridor-floor cell at y=18 in the segment becomes
 *   `minecraft:polished_deepslate`. Cells already polished_deepslate (the 12
 *   RAIL-S2 lava-displacement cells at x=-239..-236) are preserved untouched —
 *   they are not re-operated. In-place exact REPL only, never a removal, so no
 *   flow/gravity physics are triggered. Rollback restores every changed cell to
 *   its exact original state.
 *
 * CIVIL PREP ONLY: no rail blocks, no powered rails, no signalling, no vehicles.
 * routeCommissioned stays false. The corridor interior rock above y=18 is
 * retained for the later RAIL-S3 civil bore (carving the 6×6 clear tunnel).
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
const SNAPSHOT = value('--snapshot', 'data/worldsnap-rail-trackbed-source-20260825T082100Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'rail-trackbed-01');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'rail-trackbed-01';
const RELEASE_ID = 'RAIL-S3-TRACKBED-01';
const RELEASE_NODE_ID = 'PASSENGER-RAILWAY';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`RAIL-S3-TRACKBED-01 compiler rejected: ${message}`);
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

const TRACKBED_MATERIAL = 'minecraft:polished_deepslate';

// First track-bed segment: the Westlight-side corridor cell block (same as
// RAIL-S2-WL-SEGMENT-01), floor y=18, all six corridor z cells.
const SEGMENTS = [
  { key: 'seg01', releaseSuffix: 'SEGMENT-01', minX: -254, maxX: -236 },
];

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

// ---------------------------------------------------------------------------
// 1. Seam check: the segment-01 6×6 liner box must already be sealed around the
//    corridor clear volume (this track bed sits inside that sealed box).
// ---------------------------------------------------------------------------
for (const y of [17, 18, 19, 20, 21, 22, 23, 24]) {
  for (const z of [-462, -461, -460, -459, -458, -457]) {
    const west = await sourceAt({ x: -254, y, z });
    const east = await sourceAt({ x: -236, y, z });
    if (y === 17 || y === 24) {
      invariant(blockName(west) === 'minecraft:polished_deepslate',
        `segment-01 floor/ceiling seam at (-254,${y},${z}) is not sealed: ${west}`);
      invariant(blockName(east) === 'minecraft:polished_deepslate',
        `segment-01 floor/ceiling seam at (-236,${y},${z}) is not sealed: ${east}`);
    } else {
      invariant(blockName(await sourceAt({ x: -255, y, z })) === 'minecraft:polished_deepslate',
        `segment-01 west cap at (-255,${y},${z}) is not sealed`);
      invariant(blockName(await sourceAt({ x: -235, y, z })) === 'minecraft:polished_deepslate',
        `segment-01 east cap at (-235,${y},${z}) is not sealed`);
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Per-segment track-bed cells: the corridor floor at y=18.
// ---------------------------------------------------------------------------
const segmentPlans = [];
for (const segment of SEGMENTS) {
  const { minX, maxX } = segment;
  const floorCells = cellsIn({ minX, maxX, minY: 18, maxY: 18, minZ: -462, maxZ: -457 });

  // Corridor interior must be dry rock above the floor (y19..23) for this
  // segment — the civil bore is not carved yet.
  const interiorFluid = [];
  for (const cell of cellsIn({ minX, maxX, minY: 19, maxY: 23, minZ: -462, maxZ: -457 })) {
    const state = await sourceAt(cell);
    if (isFluid(state)) interiorFluid.push({ ...cell, state });
  }
  invariant(interiorFluid.length === 0,
    `segment ${segment.key} interior above the floor must be dry rock: ${interiorFluid.length} fluid cells`);

  // Classify corridor-floor cells. Cells already polished_deepslate (the
  // RAIL-S2 lava-displacement floor cells) are preserved and not re-operated.
  const buildRecords = [];
  const preservedRecords = [];
  const heldRecords = [];
  for (const cell of floorCells) {
    const state = await sourceAt(cell);
    const problems = [];
    if (isForbidden(state)) problems.push(`forbidden=${blockName(state)}`);
    if (problems.length) heldRecords.push({ ...cell, state, problems });
    else if (blockName(state) === 'minecraft:polished_deepslate') {
      preservedRecords.push({ ...cell, state });
    } else {
      const isFluidSource = isFluid(state);
      const isGravitySource = GRAVITY.has(blockName(state));
      buildRecords.push({
        ...cell,
        state,
        role: isFluidSource ? 'sealed-fluid-displacement' : isGravitySource ? 'gravity-seal' : 'track-bed-level',
        problem: null,
      });
    }
  }
  invariant(heldRecords.length === 0, `held track-bed cells: ${heldRecords.length}`);
  invariant(buildRecords.length + preservedRecords.length === floorCells.length,
    `track-bed count drift: ${buildRecords.length} + ${preservedRecords.length} != ${floorCells.length}`);

  // Interaction halo (1-cell outside operated box).
  const operatedCells = uniqueCells(buildRecords.map(({ x, y, z }) => ({ x, y, z })));
  const targetKeys = new Set(operatedCells.map((cell) => cellKey(cell)));
  const halo = uniqueCells(floorCells.flatMap((cell) => {
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
  invariant(haloForbiddenCount === 0,
    `segment ${segment.key} interaction halo forbidden/container hazard: ${haloForbiddenCount}`);

  // Block-entity / saved-entity clearance over the operated envelope.
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
    `segment ${segment.key} operated envelope intersects a block entity or saved movable entity`);

  const ops = buildRecords.map((record) => ({
    cell: { x: record.x, y: record.y, z: record.z },
    sourceState: record.state,
    targetState: TRACKBED_MATERIAL,
    role: record.role,
  }));

  segmentPlans.push({
    ...segment,
    floorCells,
    buildRecords,
    preservedRecords,
    heldRecords,
    ops,
    operatedCells,
    targetKeys,
    halo,
    haloFluidCount,
    haloForbiddenCount,
    blockEntities,
    savedEntities,
    interiorFluid,
  });
}

// ---------------------------------------------------------------------------
// 3. Cross-segment disjointness (single segment here, kept for future slices).
// ---------------------------------------------------------------------------
const packageKeys = new Set();
for (const plan of segmentPlans) {
  invariant(!packageKeys.has(plan.key), `duplicate segment key ${plan.key}`);
  packageKeys.add(plan.key);
}
for (let left = 0; left < segmentPlans.length; left += 1) {
  for (let right = left + 1; right < segmentPlans.length; right += 1) {
    const a = segmentPlans[left].targetKeys;
    const b = segmentPlans[right].targetKeys;
    const shared = [];
    for (const key of a) if (b.has(key)) shared.push(key);
    invariant(shared.length === 0,
      `cross-package target overlap ${segmentPlans[left].key}/${segmentPlans[right].key}: ${shared.join(', ')}`);
  }
}

// ---------------------------------------------------------------------------
// 4. Emit packages.
// ---------------------------------------------------------------------------
const packageOrder = segmentPlans.map((plan) => plan.key);
const packageGroups = new Map(packageOrder.map((key) => [key, []]));
for (const plan of segmentPlans) {
  for (const op of plan.ops) packageGroups.get(plan.key).push(op);
}
for (const [key, group] of packageGroups) {
  group.sort((a, b) => a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z);
}

const packages = [];
const operationManifest = {};
const sealedFluidDisplacementBySegment = {};
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
for (const key of packageOrder) {
  const plan = segmentPlans.find((entry) => entry.key === key);
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
    role: 'RAIL-S3 track-bed preparation (corridor floor y=18 levelled to polished_deepslate)',
    forwardSha256: sha256(forwardBody),
    rollbackSha256: sha256(rollbackBody),
    forwardCommandCount: group.length,
    rollbackCommandCount: group.length,
    targetCoordinateSetSha256: hashCells(group.map(({ cell }) => cell)),
    exactInverse: true,
  };
  sealedFluidDisplacementBySegment[key] = group.filter((o) => o.role.includes('fluid'))
    .map(({ cell, sourceState }) => ({ ...cell, sourceState }));
}

const builtCells = uniqueCells(segmentPlans.flatMap((plan) => plan.ops.map((op) => op.cell)));
const allFloorCells = uniqueCells(segmentPlans.flatMap((plan) => plan.floorCells));
const allPreserved = uniqueCells(segmentPlans.flatMap((plan) => plan.preservedRecords.map((r) => ({ x: r.x, y: r.y, z: r.z }))));
const allHalo = uniqueCells(segmentPlans.flatMap((plan) => plan.halo));
const allHaloFluid = segmentPlans.reduce((sum, plan) => sum + plan.haloFluidCount, 0);
const allHaloForbidden = segmentPlans.reduce((sum, plan) => sum + plan.haloForbiddenCount, 0);
const allBlockEntities = segmentPlans.reduce((sum, plan) => sum + plan.blockEntities.length, 0);
const allSavedEntities = segmentPlans.reduce((sum, plan) => sum + plan.savedEntities.length, 0);
const allSealedFluid = Object.values(sealedFluidDisplacementBySegment).flat();
const allHeld = segmentPlans.flatMap((plan) => plan.heldRecords);

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
    purpose: 'Level the first Westlight Cobalt corridor cell block (x=-254..-236, y=18, z=-462..-457) corridor floor into a smooth solid polished_deepslate track bed in preparation for the future passive rail. This is RAIL-S3 pre-track civil work only: no rail, powered rail, signalling, or vehicles.',
    treatment: 'CIVIL_PREP_TRACK_BED_LEVEL_POLISHED_DEEPSLATE_FLOOR',
    trackBedMaterial: TRACKBED_MATERIAL,
    corridorEnvelope: { minX: -254, maxX: -236, minY: 18, maxY: 23, minZ: -462, maxZ: -457 },
    built: classManifest(builtCells),
    trackBedCells: classManifest(builtCells),
    preservedFloorCells: classManifest(allPreserved),
    sealedFluidDisplacementCells: {
      count: allSealedFluid.length,
      cells: allSealedFluid,
    },
    interiorAboveFloorFluid: {
      count: segmentPlans.reduce((sum, plan) => sum + plan.interiorFluid.length, 0),
    },
    held: {
      cellCount: allHeld.length,
      byReason: census(allHeld, (record) => record.problems.join(';')),
    },
    routeCommissioned: false,
    segments: SEGMENTS.map((segment) => {
      const plan = segmentPlans.find((entry) => entry.key === segment.key);
      return {
        key: segment.key,
        corridor: { minX: segment.minX, maxX: segment.maxX, minY: 18, maxY: 23, minZ: -462, maxZ: -457 },
        trackBedCellCount: plan.ops.length,
        preservedFloorCellCount: plan.preservedRecords.length,
        interiorAboveFloorFluidBefore: plan.interiorFluid.length,
      };
    }),
  },
  source: {
    snapshotRoot: relative(SNAPSHOT),
    designBasis: 'accepted rail-bc post / rail-wl-seg456 post / r08am post; fresh live source bound at compile',
  },
  target: {
    operatedUnion: classManifest(builtCells),
    desiredStateCensus: census(builtCells.map((cell) => ({ state: TRACKBED_MATERIAL }))),
    sourceStateCensus: census(builtCells.map((cell) => ({
      state: segmentPlans.flatMap((plan) => plan.ops)
        .find((op) => cellKey(op.cell) === cellKey(cell)).sourceState,
    }))),
    interactionHalo: classManifest(allHalo),
    haloFluidCellsPreservedOutside: allHaloFluid,
    packageTargetsDisjoint: true,
  },
  operations: operationManifest,
  packages,
  executionOrder: {
    forward: packageOrder.filter((key) => operationManifest[key]),
    rollback: packageOrder.filter((key) => operationManifest[key]).reverse(),
    gravity: 'single track-bed package; every REPL is an in-place exact replacement (never a removal), so no gravity/flow physics are triggered',
  },
  isolation: {
    sourceHazardCount: 0,
    sealedFluidDisplacementCount: allSealedFluid.length,
    operatedHaloForbiddenBlockCount: allHaloForbidden,
    blockEntityIntersectionCount: allBlockEntities,
    savedEntityIntersectionCount: allSavedEntities,
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
  segmentCellCounts: Object.fromEntries(segmentPlans.map((plan) => [plan.key, plan.ops.length])),
  totalCellCount: builtCells.length,
  preservedFloorCellCount: allPreserved.length,
  sealedFluidDisplacementCount: allSealedFluid.length,
  heldCount: allHeld.length,
  packageCount: packages.length,
}, null, 2)}\n`);
