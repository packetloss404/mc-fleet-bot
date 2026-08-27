#!/usr/bin/env node
/** Compile RAIL-S2 — Westlight rail-corridor water-containment, segments 04+05+06.
 *
 * Continues the RAIL-S2-WL sealed water-management liner east along the Cobalt
 * S1 corridor bore at y=18..23, z=-462..-457 (6 wide x 6 high).
 *
 *   SEGMENT-04: corridor cell block x=-195..-176
 *   SEGMENT-05: corridor cell block x=-175..-156
 *   SEGMENT-06: corridor cell block x=-155..-136
 *
 * The segment-03 liner (RAIL-S2-WL-SEGMENT-02-03) already sealed the blocks up
 * to x=-196 and its east cap at x=-195 (y18..23, z=-462..-457) which becomes
 * segment-04's west wall. Each new segment therefore builds five of six faces:
 *
 *   - floor    y=17 (sub-floor) over the segment x-span
 *   - ceiling  y=24 over the segment x-span
 *   - north    z=-463 over the segment x-span, y18..23
 *   - south    z=-456 over the segment x-span, y18..23
 *   - east cap x=(segment maxX + 1), y18..23, z=-462..-457
 *
 * The west wall is the prior segment's east cap (segment-04 uses segment-03's
 * x=-195 cap; segment-05 uses segment-04's new x=-175 cap; segment-06 uses
 * segment-05's new x=-155 cap), so the packages are exact and disjoint — no
 * cross-package target overlap.
 *
 * TREATMENT (exact, reversible, durably sealed), identical to the prior
 * segments: every operated cell becomes polished_deepslate. In-place exact REPL
 * only — never a removal — so no flow/gravity physics are triggered. Any fluid
 * that sits on a liner face is sealed-displaced; any gravity block on a face is
 * gravity-sealed. The surrounding lake water body and any lava pocket behind
 * the liner are preserved exactly. Rollback restores every cell.
 *
 * Segments 04-06 interiors are dry rock (0 fluid cells), so there is no
 * interior floor fluid displacement — the faces carry only the contained rock /
 * andesite / granite / gravel that is sealed in place.
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
const SNAPSHOT = value('--snapshot', 'data/worldsnap-rail-wl-seg456-source-20260825T061200Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'rail-wl-seg-456-liner');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'rail-wl-seg-456-liner';
const RELEASE_ID = 'RAIL-S2-WL-SEGMENT-04-06';
const RELEASE_NODE_ID = 'PASSENGER-RAILWAY';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`RAIL-S2-WL-SEGMENT-04-06 compiler rejected: ${message}`);
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

// Corridor bore interior clear volume is 6 wide x 6 high: y=18..23, z=-462..-457.
// Segment-03 sealed up to x=-196 plus east cap x=-195 (y18..23, z=-462..-457).
const SEGMENTS = [
  { key: 'seg04', releaseSuffix: 'SEGMENT-04', minX: -195, maxX: -176 },
  { key: 'seg05', releaseSuffix: 'SEGMENT-05', minX: -175, maxX: -156 },
  { key: 'seg06', releaseSuffix: 'SEGMENT-06', minX: -155, maxX: -136 },
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
// 1. Seam check: segment-04's west wall is segment-03's built east cap x=-195.
//    (segment-05's west wall is segment-04's new cap x=-175, segment-06's west
//    wall is segment-05's new cap x=-155, built in the same transaction —
//    nothing to assert in the source, but they must stay disjoint.)
// ---------------------------------------------------------------------------
for (const y of [18, 19, 20, 21, 22, 23]) {
  for (const z of [-462, -461, -460, -459, -458, -457]) {
    const seamState = await sourceAt({ x: -195, y, z });
    invariant(blockName(seamState) === 'minecraft:polished_deepslate',
      `segment-04 west wall seam at (-195,${y},${z}) is not sealed: ${seamState}`);
  }
}

// ---------------------------------------------------------------------------
// 2. Per-segment liner face cells and interior fluid census.
// ---------------------------------------------------------------------------
const segmentPlans = [];
for (const segment of SEGMENTS) {
  const { minX, maxX } = segment;
  const faces = {
    floor: cellsIn({ minX, maxX, minY: 17, maxY: 17, minZ: -462, maxZ: -457 }),
    ceiling: cellsIn({ minX, maxX, minY: 24, maxY: 24, minZ: -462, maxZ: -457 }),
    north: cellsIn({ minX, maxX, minY: 18, maxY: 23, minZ: -463, maxZ: -463 }),
    south: cellsIn({ minX, maxX, minY: 18, maxY: 23, minZ: -456, maxZ: -456 }),
    east: cellsIn({ minX: maxX + 1, maxX: maxX + 1, minY: 18, maxY: 23, minZ: -462, maxZ: -457 }),
  };
  const allFaceCells = Object.values(faces).flat();

  // Interior fluid census (y18..23). Segments 04-06 interiors are dry rock.
  const interiorFluid = [];
  for (const cell of cellsIn({ minX, maxX, minY: 18, maxY: 23, minZ: -462, maxZ: -457 })) {
    const state = await sourceAt(cell);
    if (isFluid(state)) interiorFluid.push({ ...cell, state });
  }
  invariant(interiorFluid.length === 0,
    `segment ${segment.key} interior must be dry rock: ${interiorFluid.length} fluid cells`);

  // Classify liner face cells.
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

  // Interaction halo (1-cell outside operated box).
  const operatedCells = uniqueCells(buildRecords.map(({ x, y, z }) => ({ x, y, z })));
  const targetKeys = new Set(operatedCells.map((cell) => cellKey(cell)));
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
    targetState: LINER,
    role: record.role,
  }));

  segmentPlans.push({
    ...segment,
    faces,
    allFaceCells,
    buildRecords,
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
// 3. Cross-segment disjointness: segment-04 east cap (x=-175) must not overlap
//    any segment-05 target; segment-05 east cap (x=-155) must not overlap any
//    segment-06 target. The seam x=-195 is segment-03's, untouched here.
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
const interiorFloorFluidBySegment = {};
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
    role: 'sealed water-management liner (polished_deepslate box around the 6x6 corridor clear volume)',
    forwardSha256: sha256(forwardBody),
    rollbackSha256: sha256(rollbackBody),
    forwardCommandCount: group.length,
    rollbackCommandCount: group.length,
    targetCoordinateSetSha256: hashCells(group.map(({ cell }) => cell)),
    exactInverse: true,
  };
  sealedFluidDisplacementBySegment[key] = group.filter((o) => o.role.includes('fluid'))
    .map(({ cell, sourceState }) => ({ ...cell, sourceState }));
  interiorFloorFluidBySegment[key] = plan.interiorFluid.map(({ x, y, z, state }) => ({ x, y, z, state }));
}

const builtCells = uniqueCells(segmentPlans.flatMap((plan) => plan.ops.map((op) => op.cell)));
const allFaceCells = uniqueCells(segmentPlans.flatMap((plan) => plan.allFaceCells));
const allHalo = uniqueCells(segmentPlans.flatMap((plan) => plan.halo));
const allHaloFluid = segmentPlans.reduce((sum, plan) => sum + plan.haloFluidCount, 0);
const allHaloForbidden = segmentPlans.reduce((sum, plan) => sum + plan.haloForbiddenCount, 0);
const allBlockEntities = segmentPlans.reduce((sum, plan) => sum + plan.blockEntities.length, 0);
const allSavedEntities = segmentPlans.reduce((sum, plan) => sum + plan.savedEntities.length, 0);
const allSealedFluid = Object.values(sealedFluidDisplacementBySegment).flat();
const allInteriorFloorFluid = Object.values(interiorFloorFluidBySegment).flat();
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
    purpose: 'Seal the fourth, fifth and sixth Westlight 6x6 rail-corridor cell blocks (segment-04 x=-195..-176, segment-05 x=-175..-156 and segment-06 x=-155..-136, y=18..23, z=-462..-457) with polished_deepslate water-management liners so each corridor interior is fluid-free (dry) while the surrounding lake water body and any contained lava pocket are preserved behind/around the liners. Segment-04 reuses the segment-03 east cap at x=-195 as its west wall; segment-05 reuses the segment-04 east cap at x=-175 as its west wall; segment-06 reuses the segment-05 east cap at x=-155 as its west wall.',
    treatment: 'SEALED_WATER_MANAGEMENT_LINER_BOX_FLUID_DISPLACED_ON_FACES_PRESERVED_BEHIND',
    linerMaterial: LINER,
    corridorEnvelope: { minX: -195, maxX: -136, minY: 18, maxY: 23, minZ: -462, maxZ: -457 },
    built: classManifest(builtCells),
    linerFaceCells: classManifest(allFaceCells),
    sealedFluidDisplacementCells: {
      count: allSealedFluid.length,
      cells: allSealedFluid,
    },
    interiorFloorFluidDisplaced: {
      count: allInteriorFloorFluid.length,
      cells: allInteriorFloorFluid,
    },
    preservedWaterBodyOutsideLiner: true,
    interiorDry: true,
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
        builtCellCount: plan.ops.length,
        interiorFluidBefore: plan.interiorFluid.length,
        westWall: segment.key === 'seg04' ? 'segment-03 east cap x=-195 (pre-sealed)' : segment.key === 'seg05' ? 'segment-04 east cap x=-175 (same transaction)' : 'segment-05 east cap x=-155 (same transaction)',
      };
    }),
  },
  source: {
    snapshotRoot: relative(SNAPSHOT),
    waterSurvey: 'scripts/probe_rail_wl_water.mjs / scripts/probe_rail_wl_reconcile.mjs / scripts/probe_rail_wl_exact.mjs / scripts/probe_rail_wl_lava.mjs',
  },
  target: {
    operatedUnion: classManifest(builtCells),
    desiredStateCensus: census(builtCells.map((cell) => ({ state: LINER }))),
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
    gravity: 'single liner package per segment; every REPL is an in-place exact replacement (never a removal), so no gravity/flow physics are triggered',
  },
  isolation: {
    sourceHazardCount: 0,
    sealedFluidDisplacementCount: allSealedFluid.length,
    interiorFloorFluidDisplacementCount: allInteriorFloorFluid.length,
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
  sealedFluidDisplacementCount: allSealedFluid.length,
  interiorFloorFluidDisplacementCount: allInteriorFloorFluid.length,
  heldCount: allHeld.length,
  packageCount: packages.length,
}, null, 2)}\n`);
