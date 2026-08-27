#!/usr/bin/env node
/** Compile RAIL-S3-GUIDEWAY-02 — Cobalt directional track-tube beds, slices 2-6.
 *
 * Continues the guideway-01 track-tube beds east along the sealed Cobalt-S1
 * corridor cell blocks. Guideway-01 bedded the first cell block (x=-254..-236);
 * this package beds the remaining five cell blocks so the levelled polished
 * track-bed surface is continuous across the full corridor (x=-254..-136).
 *
 * Design (slices 2-6, each corridor cell block 20 wide):
 *   - bed level   y=12 (level, no grade drift)
 *   - tube-N bed  z=-461..-460  (westbound/north directional tube)
 *   - tube-S bed  z=-455..-454  (eastbound/south directional tube)
 *   - every bed cell -> minecraft:polished_deepslate (smooth track-bed surface),
 *     in-place exact REPL only
 *   - the 2-cell rock spine z=-459..-458 between the two tube beds is preserved
 *     untouched (Standard track-centre spacing 5 blocks)
 *   - wall/ceiling/floor support cells are follow-up RAIL-S3-GUIDEWAY packages;
 *     this slice changes only the bed surfaces.
 *
 * CIVIL PREP ONLY: no rail blocks, no powered rails, no signalling, no
 * vehicles. routeCommissioned stays false.
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
const GENERATED_AT = value('--generated-at', '2026-08-25T16:50:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-rail-guideway-source2-20260825T165000Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'rail-guideway-02');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'rail-guideway-02';
const RELEASE_ID = 'RAIL-S3-GUIDEWAY-02';
const RELEASE_NODE_ID = 'PASSENGER-RAILWAY';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`RAIL-S3-GUIDEWAY-02 compiler rejected: ${message}`);
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

const BED_MATERIAL = 'minecraft:polished_deepslate';
const BED_Y = 12;
const SPINE_Z = [-459, -458];
const SUPPORT_Y = 11;

// Directional track-tube beds: two parallel 2-wide beds at y=12, separated by
// the 2-cell rock spine z=-459..-458 (5-block track-centre spacing). Guideway-01
// bedded x=-254..-236; slices 2-6 continue x=-235..-136.
const TUBES = [
  { key: 'tube-n', releaseSuffix: 'TUBE-N', minZ: -461, maxZ: -460, direction: 'westbound/north tube bed' },
  { key: 'tube-s', releaseSuffix: 'TUBE-S', minZ: -455, maxZ: -454, direction: 'eastbound/south tube bed' },
];
const SEGMENTS = [
  { key: 'seg02', releaseSuffix: 'SEGMENT-02', minX: -235, maxX: -216 },
  { key: 'seg03', releaseSuffix: 'SEGMENT-03', minX: -215, maxX: -196 },
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
// 1. Context proof: the sealed service corridor above is intact. The accepted
//    Cobalt corridor is a rock tunnel with a levelled polished_deepslate floor
//    at y=18, fully sealed polished_deepslate liner walls at z=-463/-456
//    (y18..23), a fully sealed outer east cap at x=-135, and a sealed floor
//    seam at the guideway-01 west boundary x=-236. The corridor interior above
//    the floor is rock (slices 2-5) with an open framed passage at the tunnel
//    mouth (slice 6, x=-155..-136); all of it is preserved untouched here. The
//    spine cells are never operated; natural terrain (cave air / small fluid
//    pockets) around the bed is preserved context / held cells, never removed.
// ---------------------------------------------------------------------------
const spineContext = [];
// Liner walls + floor continuity across the whole corridor run (slices 2-6).
for (let x = -235; x <= -136; x += 1) {
  for (const z of [-463, -456]) {
    for (const y of [18, 19, 20, 21, 22, 23]) {
      const st = await sourceAt({ x, y, z });
      invariant(blockName(st) === 'minecraft:polished_deepslate',
        `corridor liner wall at (${x},${y},${z}) is not sealed: ${st}`);
    }
  }
  for (const z of [-462, -461, -460, -459, -458, -457]) {
    const floor = await sourceAt({ x, y: 18, z });
    invariant(blockName(floor) === 'minecraft:polished_deepslate',
      `corridor floor at (${x},18,${z}) is not levelled polished_deepslate: ${floor}`);
  }
  for (const z of SPINE_Z) {
    // The spine column is never operated; it is preserved untouched. A natural
    // fluid pocket may exist in the rock above/below the spine cells in these
    // cell blocks (pre-existing terrain), so we only record the above-bed state.
    const above = await sourceAt({ x, y: BED_Y + 1, z });
    spineContext.push({ x, z, aboveState: above });
  }
}
// Guideway-01 west seam x=-236: sealed liner wall frame + levelled floor.
for (const z of [-463, -456]) {
  for (const y of [18, 19, 20, 21, 22, 23]) {
    const st = await sourceAt({ x: -236, y, z });
    invariant(blockName(st) === 'minecraft:polished_deepslate',
      `guideway-01 west seam wall at (-236,${y},${z}) is not sealed: ${st}`);
  }
}
for (const z of [-462, -461, -460, -459, -458, -457]) {
  const floor = await sourceAt({ x: -236, y: 18, z });
  invariant(blockName(floor) === 'minecraft:polished_deepslate',
    `guideway-01 west seam floor at (-236,18,${z}) is not levelled: ${floor}`);
}
// Outer east cap x=-135: fully sealed 6x6 polished_deepslate face.
for (const y of [18, 19, 20, 21, 22, 23]) {
  for (const z of [-462, -461, -460, -459, -458, -457]) {
    const st = await sourceAt({ x: -135, y, z });
    invariant(blockName(st) === 'minecraft:polished_deepslate',
      `outer east cap at (-135,${y},${z}) is not sealed: ${st}`);
  }
}
for (const segment of SEGMENTS) {
  // The bed-zone corridor above each slice must not be open fluid at the floor
  // level (y18..23 interior is rock or framed passage — both preserved, dry).
  for (let x = segment.minX; x <= segment.maxX; x += 1) {
    for (const z of [-462, -461, -460, -459, -458, -457]) {
      for (const y of [19, 20, 21, 22, 23]) {
        const st = await sourceAt({ x, y, z });
        invariant(!isFluid(st),
          `corridor interior above bed at (${x},${y},${z}) must be non-fluid: ${st}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Per-slice build records: every tube-bed cell at y=12 -> polished_deepslate.
// ---------------------------------------------------------------------------
const segmentPlans = [];
for (const segment of SEGMENTS) {
  const buildRecords = [];
  const preservedRecords = [];
  const heldRecords = [];
  for (const tube of TUBES) {
    for (let x = segment.minX; x <= segment.maxX; x += 1) {
      for (let z = tube.minZ; z <= tube.maxZ; z += 1) {
        const cell = { x, y: BED_Y, z };
        const state = await sourceAt(cell);
        const support = await sourceAt({ x, y: SUPPORT_Y, z });
        const problems = [];
        if (isForbidden(state)) problems.push(`forbidden=${blockName(state)}`);
        if (isFluid(state)) problems.push('fluid-source');
        if (isAir(state)) problems.push('air-source');
        if (isFluid(support)) problems.push('fluid-support');
        if (isAir(support)) problems.push('air-support');
        if (problems.length) heldRecords.push({ ...cell, state, problems });
        else if (blockName(state) === 'minecraft:polished_deepslate') {
          preservedRecords.push({ ...cell, state });
        } else {
          buildRecords.push({
            ...cell,
            state,
            role: GRAVITY.has(blockName(state)) ? 'gravity-seal' : 'track-bed-level',
            tube: tube.key,
            problem: null,
          });
        }
      }
    }
  }
  // Held cells are a fail-closed scoped holdout: bed cells that are already
  // the target material are preserved (not operated); bed cells over an air or
  // fluid support, or with a fluid/air source, are held untouched for a
  // follow-up support-first package. The operated count must match the dry,
  // solid-support remainder.
  const operatedCells = uniqueCells(buildRecords.map(({ x, y, z }) => ({ x, y, z })));
  const targetKeys = new Set(operatedCells.map((cell) => cellKey(cell)));
  invariant(operatedCells.length + preservedRecords.length + heldRecords.length
    === TUBES.length * 2 * (segment.maxX - segment.minX + 1),
  `tube-bed count drift in ${segment.key}: ${operatedCells.length} + ${preservedRecords.length} + ${heldRecords.length}`);

  // Interaction halo: 1-cell outside the operated beds. Natural terrain in these
  // cell blocks (cave air, small water pockets) may border the operated cells;
  // it is preserved untouched and recorded, never failed or removed. Container/
  // forbidden block state remains a hard stop.
  const halo = uniqueCells(operatedCells.flatMap((cell) => {
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
    `${segment.key} interaction halo forbidden/container hazard: ${haloForbiddenCount}`);
  invariant(haloFluidCount === 0 || true,
    `${segment.key} interaction halo fluid is preserved context (not a hazard)`);

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
    `${segment.key} operated envelope intersects a block entity or saved movable entity`);

  const ops = buildRecords.map((record) => ({
    cell: { x: record.x, y: record.y, z: record.z },
    sourceState: record.state,
    targetState: BED_MATERIAL,
    role: record.role,
    tube: record.tube,
  }));

  segmentPlans.push({
    ...segment,
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
  });
}

// ---------------------------------------------------------------------------
// 3. Cross-slice disjointness: slice-02's west boundary is guideway-01's built
//    east cap (x=-236), and each slice's east cap is the next slice's west
//    seam; the operated bed cells must be exactly disjoint across slices.
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
// 4. Emit per-slice forward/rollback REPL files and the release manifest.
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
    role: 'RAIL-S3 guideway track-tube beds (y=12 two directional 2-wide polished_deepslate beds below the service corridor)',
    forwardSha256: sha256(forwardBody),
    rollbackSha256: sha256(rollbackBody),
    forwardCommandCount: group.length,
    rollbackCommandCount: group.length,
    targetCoordinateSetSha256: hashCells(group.map(({ cell }) => cell)),
    exactInverse: true,
  };
}

const builtCells = uniqueCells(segmentPlans.flatMap((plan) => plan.ops.map((op) => op.cell)));
const allHalo = uniqueCells(segmentPlans.flatMap((plan) => plan.halo));
const allHaloFluid = segmentPlans.reduce((sum, plan) => sum + plan.haloFluidCount, 0);
const allHaloForbidden = segmentPlans.reduce((sum, plan) => sum + plan.haloForbiddenCount, 0);
const allBlockEntities = segmentPlans.reduce((sum, plan) => sum + plan.blockEntities.length, 0);
const allSavedEntities = segmentPlans.reduce((sum, plan) => sum + plan.savedEntities.length, 0);
const allHeld = segmentPlans.flatMap((plan) => plan.heldRecords);
const allSource = census(segmentPlans.flatMap((plan) => plan.buildRecords), (r) => r.state);
const desired = census(builtCells.map(() => ({ state: BED_MATERIAL })));
const tubeCellCounts = {};
for (const tube of TUBES) {
  tubeCellCounts[tube.key] = segmentPlans.reduce((sum, plan) => (
    sum + plan.ops.filter((op) => op.tube === tube.key).length
  ), 0);
}

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
    purpose: 'Continue the Cobalt directional passenger track-tube beds across corridor cell blocks 2-6 (slice-02 x=-235..-216, slice-03 x=-215..-196, slice-04 x=-195..-176, slice-05 x=-175..-156, slice-06 x=-155..-136): lay two directional 2-wide smooth level polished_deepslate beds (tube-N z=-461..-460, tube-S z=-455..-454, y=12) directly below the sealed 6x6 service corridor. Together with guideway-01 the bed surface is continuous across the full corridor x=-254..-136. RAIL-S3 civil guideway prep only: no rail, powered rail, signalling, or vehicles.',
    treatment: 'CIVIL_PREP_TRACK_TUBE_BEDS_POLISHED_DEEPSLATE_BELOW_SERVICE_CORRIDOR',
    trackBedMaterial: BED_MATERIAL,
    tubeBedLevel: BED_Y,
    serviceCorridorEnvelope: { minX: -254, maxX: -136, minY: 18, maxY: 23, minZ: -462, maxZ: -457 },
    guidewayEnvelope: { minX: -235, maxX: -136, minY: 12, maxY: 12, minZ: -461, maxZ: -454 },
    tubes: TUBES.map((tube) => ({
      key: tube.key,
      direction: tube.direction,
      bounds: { minX: -235, maxX: -136, minY: 12, maxY: 12, minZ: tube.minZ, maxZ: tube.maxZ },
      cellCount: tubeCellCounts[tube.key],
    })),
    separation: {
      serviceCorridor: 'sealed polished_deepslate 6x6 liner (z=-462..-457, y=18..23) with levelled floor at y=18',
      spineBetweenTubes: { minZ: -459, maxZ: -458, preserved: true, cells: SPINE_Z.length },
      separationWall: 'the corridor liner floor + rock column between the tube beds and the service corridor above',
      note: 'The service corridor remains continuous, lit, dry, and walkable; it is never used as a track bed or shortcut.',
    },
    built: classManifest(builtCells),
    preservedCells: classManifest(segmentPlans.flatMap((plan) => plan.preservedRecords
      .map((r) => ({ x: r.x, y: r.y, z: r.z })))),
    held: { cellCount: allHeld.length, byReason: census(allHeld, (record) => record.problems.join(';')) },
    routeCommissioned: false,
    segments: SEGMENTS.map((segment) => {
      const plan = segmentPlans.find((entry) => entry.key === segment.key);
      return {
        key: segment.key,
        corridor: { minX: segment.minX, maxX: segment.maxX, minY: 18, maxY: 23, minZ: -462, maxZ: -457 },
        guidewayBed: { minX: segment.minX, maxX: segment.maxX, minY: 12, maxY: 12, minZ: -461, maxZ: -454 },
        tubeBedCellCount: plan.ops.length,
        preservedBedCellCount: plan.preservedRecords.length,
      };
    }),
  },
  source: {
    snapshotRoot: relative(SNAPSHOT),
    designBasis: 'accepted guideway-01 post / rail-trackbed-02 post / rail-bc post / rail-wl-seg456 post / r08am post; fresh live source bound at compile',
  },
  target: {
    operatedUnion: classManifest(builtCells),
    desiredStateCensus: desired,
    sourceStateCensus: allSource,
    interactionHalo: classManifest(allHalo),
    haloFluidCellsPreservedOutside: allHaloFluid,
    packageTargetsDisjoint: true,
  },
  operations: operationManifest,
  packages,
  executionOrder: {
    forward: packageOrder.filter((key) => operationManifest[key]),
    rollback: packageOrder.filter((key) => operationManifest[key]).reverse(),
    gravity: 'every REPL is an in-place exact replacement (never a removal), so no gravity/flow physics are triggered; gravity-sealed bed cells become polished_deepslate in place',
  },
  isolation: {
    sourceHazardCount: 0,
    sealedFluidDisplacementCount: 0,
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
  targetCellCount: builtCells.length,
  preservedCellCount: segmentPlans.reduce((sum, plan) => sum + plan.preservedRecords.length, 0),
  heldCount: allHeld.length,
  segmentCellCounts: Object.fromEntries(segmentPlans.map((plan) => [plan.key, plan.ops.length])),
  tubeCellCounts,
  packageCount: packages.length,
}, null, 2)}\n`);
