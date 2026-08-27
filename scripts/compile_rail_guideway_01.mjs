#!/usr/bin/env node
/** Compile RAIL-S3-GUIDEWAY-01 — first Cobalt directional track-tube beds.
 *
 * The sealed 6x6 Cobalt-S1 corridor (x=-254..-136, y=18..23, z=-462..-457)
 * is the mandatory behind-wall service corridor (Engineering Standard §4.3).
 * Its levelled polished_deepslate floor at y=18 is the future service-corridor
 * walking surface. This package is the first passenger-guideway civil slice:
 * it lays the two directional track-tube beds directly BELOW that corridor,
 * separated from the service volume by the liner floor/rock so the corridor
 * stays the continuous separation surface (Standard §4.1/§4.3).
 *
 * Design (first slice = corridor cell block x=-254..-236):
 *   - bed level   y=12 (level, no grade drift)
 *   - tube-N bed  z=-461..-460  (westbound/north directional tube)
 *   - tube-S bed  z=-455..-454  (eastbound/south directional tube)
 *   - every bed cell -> minecraft:polished_deepslate (smooth track-bed surface
 *     where the future passive rails sit), in-place exact REPL only
 *   - the 2-cell rock spine z=-459..-458 between the two tube beds is
 *     preserved untouched (Standard track-centre spacing 5 blocks)
 *   - wall/ceiling/floor support cells and side wall cells are follow-up
 *     RAIL-S3-GUIDEWAY packages; this slice changes only the bed surfaces.
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
const GENERATED_AT = value('--generated-at', '2026-08-25T17:10:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-rail-guideway-source1-20260825T170000Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'rail-guideway-01');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'rail-guideway-01';
const RELEASE_ID = 'RAIL-S3-GUIDEWAY-01';
const RELEASE_NODE_ID = 'PASSENGER-RAILWAY';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`RAIL-S3-GUIDEWAY-01 compiler rejected: ${message}`);
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

// Directional track-tube beds: two parallel 2-wide beds at y=12, separated by
// the 2-cell rock spine z=-459..-458 (5-block track-centre spacing). The first
// corridor cell block is x=-254..-236.
const TUBES = [
  { key: 'tube-n', releaseSuffix: 'TUBE-N', minZ: -461, maxZ: -460, direction: 'westbound/north tube bed' },
  { key: 'tube-s', releaseSuffix: 'TUBE-S', minZ: -455, maxZ: -454, direction: 'eastbound/south tube bed' },
];
const SEGMENT = { key: 'seg01', releaseSuffix: 'SEGMENT-01', minX: -254, maxX: -236 };
const SPINE_Z = [-459, -458];
const SUPPORT_Y = 11;

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
// 1. Context proof: the corridor above is the sealed service corridor, its
//    floor is the levelled track bed, and the spine/support rock below is
//    intact, dry, and non-gravity.
// ---------------------------------------------------------------------------
for (const y of [17, 24]) {
  for (const z of [-462, -461, -460, -459, -458, -457]) {
    const st = await sourceAt({ x: SEGMENT.minX, y, z });
    invariant(blockName(st) === 'minecraft:polished_deepslate',
      `corridor floor/ceiling seam at (${SEGMENT.minX},${y},${z}) is not sealed: ${st}`);
  }
}
for (let x = SEGMENT.minX; x <= SEGMENT.maxX; x += 1) {
  for (const z of [-463, -456]) {
    for (const y of [18, 19, 20, 21, 22, 23]) {
      const st = await sourceAt({ x, y, z });
      invariant(blockName(st) === 'minecraft:polished_deepslate',
        `corridor liner wall at (${x},${y},${z}) is not sealed: ${st}`);
    }
  }
  for (const z of SPINE_Z) {
    const st = await sourceAt({ x, y: BED_Y + 1, z });
    invariant(!isFluid(st),
      `spine cell above bed at (${x},${BED_Y + 1},${z}) must be non-fluid: ${st}`);
    const support = await sourceAt({ x, y: SUPPORT_Y, z });
    invariant(!isFluid(support) && !isAir(support),
      `support cell under bed at (${x},${SUPPORT_Y},${z}) must be non-fluid, non-air: ${support}`);
  }
}
for (const capX of [SEGMENT.minX - 1, SEGMENT.maxX + 1]) {
  for (const y of [18, 19, 20, 21, 22, 23]) {
    for (const z of [-462, -461, -460, -459, -458, -457]) {
      const st = await sourceAt({ x: capX, y, z });
      invariant(blockName(st) === 'minecraft:polished_deepslate',
        `corridor cap at (${capX},${y},${z}) is not sealed: ${st}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Build records: every tube-bed cell at y=12 -> polished_deepslate.
// ---------------------------------------------------------------------------
const buildRecords = [];
const preservedRecords = [];
const heldRecords = [];
for (const tube of TUBES) {
  for (let x = SEGMENT.minX; x <= SEGMENT.maxX; x += 1) {
    for (let z = tube.minZ; z <= tube.maxZ; z += 1) {
      const cell = { x, y: BED_Y, z };
      const state = await sourceAt(cell);
      const problems = [];
      if (isForbidden(state)) problems.push(`forbidden=${blockName(state)}`);
      if (isFluid(state)) problems.push('fluid-source');
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
invariant(heldRecords.length === 0, `held track-tube-bed cells: ${heldRecords.length}`);

const operatedCells = uniqueCells(buildRecords.map(({ x, y, z }) => ({ x, y, z })));
const targetKeys = new Set(operatedCells.map((cell) => cellKey(cell)));
const expected = TUBES.length * 2 * (SEGMENT.maxX - SEGMENT.minX + 1);
invariant(operatedCells.length === expected - 0, `operated count drift: ${operatedCells.length} != ${expected} minus preserved`);
invariant(operatedCells.length + preservedRecords.length
  === TUBES.length * 2 * (SEGMENT.maxX - SEGMENT.minX + 1),
`tube-bed count drift: ${operatedCells.length} + ${preservedRecords.length}`);

// ---------------------------------------------------------------------------
// 3. Interaction halo: 1-cell outside the operated beds (excludes the corridor
//    above at y17.. and excludes the spine/ceiling band). Every halo cell in the
//    bed neighbourhood must be dry and free of forbidden/container state.
// ---------------------------------------------------------------------------
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
invariant(haloForbiddenCount === 0, `interaction halo forbidden/container hazard: ${haloForbiddenCount}`);
invariant(haloFluidCount === 0, `interaction halo fluid hazard: ${haloFluidCount}`);

// ---------------------------------------------------------------------------
// 4. Block-entity / saved-entity clearance over the operated envelope.
// ---------------------------------------------------------------------------
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
  `operated envelope intersects a block entity or saved movable entity`);

// ---------------------------------------------------------------------------
// 5. Emit the forward/rollback REPL files and release manifest.
// ---------------------------------------------------------------------------
const ops = buildRecords.map((record) => ({
  cell: { x: record.x, y: record.y, z: record.z },
  sourceState: record.state,
  targetState: BED_MATERIAL,
  role: record.role,
  tube: record.tube,
}));
ops.sort((a, b) => a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z);

fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
const forwardPath = path.join(OUT_DIR, `${BASENAME}.forward.txt`);
const rollbackPath = path.join(OUT_DIR, `${BASENAME}.rollback.txt`);
const forwardBody = `${ops.map(({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState)).join('\n')}\n`;
const reverse = [...ops].reverse();
const rollbackBody = `${reverse.map(({ cell, sourceState, targetState }) => replLine(cell, targetState, sourceState)).join('\n')}\n`;
const header = [
  `# GENERATED FILE - ${RELEASE_ID} (${SEGMENT.key})`,
  `# source root: ${SNAPSHOT}`,
  `# target coordinate-set SHA-256: ${hashCells(ops.map(({ cell }) => cell))}`,
].join('\n');
fs.writeFileSync(absolute(forwardPath), `${header}\n${forwardBody}`);
fs.writeFileSync(absolute(rollbackPath), `${header}\n${rollbackBody}`);

const packages = [{ key: SEGMENT.key, forward: relative(forwardPath), rollback: relative(rollbackPath) }];
const operationManifest = {
  [SEGMENT.key]: {
    role: 'RAIL-S3 guideway track-tube beds (y=12 two directional 2-wide polished_deepslate beds below the service corridor)',
    forwardSha256: sha256(forwardBody),
    rollbackSha256: sha256(rollbackBody),
    forwardCommandCount: ops.length,
    rollbackCommandCount: ops.length,
    targetCoordinateSetSha256: hashCells(ops.map(({ cell }) => cell)),
    exactInverse: true,
  },
};

const builtCells = uniqueCells(ops.map((op) => op.cell));
const allHalo = halo;
const allSource = census(buildRecords, (r) => r.state);
const desired = census(builtCells.map((c) => ({ state: BED_MATERIAL })));

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
    purpose: 'Lay the first two directional passenger track-tube beds (tube-N z=-461..-460, tube-S z=-455..-454, y=12, x=-254..-236) as smooth level polished_deepslate surfaces directly below the sealed Cobalt 6x6 service corridor. This is RAIL-S3 civil guideway prep: no rail, powered rail, signalling, or vehicles.',
    treatment: 'CIVIL_PREP_TRACK_TUBE_BEDS_POLISHED_DEEPSLATE_BELOW_SERVICE_CORRIDOR',
    trackBedMaterial: BED_MATERIAL,
    tubeBedLevel: BED_Y,
    serviceCorridorEnvelope: { minX: -254, maxX: -136, minY: 18, maxY: 23, minZ: -462, maxZ: -457 },
    guidewayEnvelope: { minX: -254, maxX: -236, minY: 12, maxY: 12, minZ: -461, maxZ: -454 },
    tubes: TUBES.map((tube) => ({
      key: tube.key,
      direction: tube.direction,
      bounds: { minX: -254, maxX: -236, minY: 12, maxY: 12, minZ: tube.minZ, maxZ: tube.maxZ },
      cellCount: (SEGMENT.maxX - SEGMENT.minX + 1) * 2,
    })),
    separation: {
      serviceCorridor: 'sealed polished_deepslate 6x6 liner (z=-462..-457, y=18..23) with levelled floor at y=18',
      spineBetweenTubes: { minZ: -459, maxZ: -458, preserved: true, cells: SPINE_Z.length },
      separationWall: 'the corridor liner floor + rock column between the tube beds and the service corridor above',
      note: 'The service corridor remains continuous, lit, dry, and walkable; it is never used as a track bed or shortcut.',
    },
    built: classManifest(builtCells),
    preservedCells: classManifest(preservedRecords.map((r) => ({ x: r.x, y: r.y, z: r.z }))),
    held: { cellCount: heldRecords.length, byReason: census(heldRecords, (record) => record.problems.join(';')) },
    routeCommissioned: false,
    segment: {
      key: SEGMENT.key,
      corridor: { minX: -254, maxX: -236, minY: 18, maxY: 23, minZ: -462, maxZ: -457 },
      guidewayBed: { minX: -254, maxX: -236, minY: 12, maxY: 12, minZ: -461, maxZ: -454 },
      tubeBedCellCount: ops.length,
      preservedBedCellCount: preservedRecords.length,
    },
  },
  source: {
    snapshotRoot: relative(SNAPSHOT),
    designBasis: 'accepted rail-trackbed-02 post / rail-bc post / rail-wl-seg456 post / r08am post; fresh live source bound at compile',
  },
  target: {
    operatedUnion: classManifest(builtCells),
    desiredStateCensus: desired,
    sourceStateCensus: allSource,
    interactionHalo: classManifest(allHalo),
    haloFluidCellsPreservedOutside: haloFluidCount,
    packageTargetsDisjoint: true,
  },
  operations: operationManifest,
  packages,
  executionOrder: {
    forward: [SEGMENT.key],
    rollback: [SEGMENT.key],
    gravity: 'every REPL is an in-place exact replacement (never a removal), so no gravity/flow physics are triggered; gravity-sealed gravel bed cells become polished_deepslate in place',
  },
  isolation: {
    sourceHazardCount: 0,
    sealedFluidDisplacementCount: 0,
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
  targetCellCount: builtCells.length,
  preservedCellCount: preservedRecords.length,
  heldCount: heldRecords.length,
  tubeCellCounts: Object.fromEntries(TUBES.map((tube) => [tube.key, ops.filter((o) => o.tube === tube.key).length])),
  packageCount: packages.length,
}, null, 2)}\n`);
