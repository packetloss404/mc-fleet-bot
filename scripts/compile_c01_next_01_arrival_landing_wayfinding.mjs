#!/usr/bin/env node
/** Compile C01-NEXT-01 — C01 portal→L1 arrival-corridor wayfinding cadence.
 *
 *  The C01 recessed mountain portal forecourt (walkable y=67 at x=695,z=-52)
 *  connects to the L1 bunker airlock through the accepted CIRC-C01-PORTAL-01
 *  stair shaft (256/256). The stair shaft empties at the L1 arrival corridor:
 *  a light_blue_concrete floor at y=42 along z=-81 (x=700..800+), open air
 *  above (y=43..44), supported by solid non-gravity stone below (y=41). The
 *  arrival corridor is currently completely unlit (0 light blocks in the
 *  y=38..48, x=700..760, z=-86..-60 band) and has no passive wayfinding
 *  cadence on the floor.
 *
 *  This package applies the same clean additive treatment as the accepted
 *  WL-DISTRICT-NEXT-01 / RAVENSGATE-NEXT-01 / EE-PUB2 pattern: a flush
 *  `minecraft:sea_lantern` floor-inlay cadence that adds passive wayfinding
 *  light without any pole, wall, or geometry change.
 *
 *  Deterministic selection (derived from the source snapshot passed via
 *  --snapshot):
 *   - the arrival corridor floor band is y=42, z=-81, x=700..800 (exact
 *     `minecraft:light_blue_concrete` floor, non-fluid, non-waterlogged);
 *   - retain only cells with non-gravity solid support below (y=41) and two
 *     clear air blocks above (y=43, y=44);
 *   - greedy Chebyshev spacing >= 4 from the sorted clean set within the
 *     bounded landing span x=708..740.
 *
 *  This yields exactly 9 targets, each exact `minecraft:light_blue_concrete`
 *  over solid stone support with two clear air blocks above. A flush floor
 *  sea_lantern is a full walkable opaque block, so the corridor walking
 *  surface stays flat and level; the cadence is purely additive.
 *
 *  This compiler emits no live calls and performs no world edits.
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
const GENERATED_AT = value('--generated-at', '2026-08-25T09:00:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r08am-post-20260822T161818Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'c01-next-01-arrival-landing-wayfinding');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'c01-next-01-arrival-landing-wayfinding';
const RELEASE_ID = 'C01-NEXT-01';
const RELEASE_NODE_ID = 'CZ-C01-BUNKER';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fileBinding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`${RELEASE_ID} compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const isAir = (state) => (
  ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(blockName(state))
);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const GRAVITY = new Set([
  'minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
]);
const HAZARD_BLOCKS = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:furnace',
  'minecraft:blast_furnace', 'minecraft:smoker', 'minecraft:hopper', 'minecraft:dispenser',
  'minecraft:dropper', 'minecraft:shulker_box', 'minecraft:spawner', 'minecraft:lectern',
  'minecraft:brewing_stand', 'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive',
  'minecraft:bee_nest', 'minecraft:decorated_pot', 'minecraft:command_block',
  'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block',
  'minecraft:crafting_table', 'minecraft:smithing_table', 'minecraft:stonecutter',
  'minecraft:enchanting_table', 'minecraft:composter', 'minecraft:campfire', 'minecraft:soul_campfire',
  'minecraft:sign', 'minecraft:hanging_sign', 'minecraft:item_frame', 'minecraft:glow_item_frame',
  'minecraft:lantern', 'minecraft:soul_lantern', 'minecraft:sea_lantern', 'minecraft:conduit',
  'minecraft:torch', 'minecraft:wall_torch',
]);
const isHazard = (state) => HAZARD_BLOCKS.has(blockName(state)) || blockName(state).endsWith('_shulker_box');
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const census = (records, selector) => Object.fromEntries(
  [...records.reduce((counts, record) => {
    const state = selector(record);
    counts.set(state, (counts.get(state) ?? 0) + 1);
    return counts;
  }, new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
);

const AUTHORIZATION = 'docs/masterplans/05-combined-zones/OWNER-DIRECTIVE-EXPANDED-ALL-AREAS.md';
const CONTRACT = 'docs/masterplans/05-combined-zones/CURRENT-STATE.md';

const CORRIDOR = {
  // The accepted CIRC-C01-PORTAL-01 evidence ledger (portal→L1 stair shaft).
  portalLedger: 'data/world-review/c01-portal-l1-live-20260825T005000Z/evidence-ledger.json',
};
const FLOOR_Y = 42;
const FLOOR_BAND_Z = -81;
const FLOOR_X_MIN = 700;
const FLOOR_X_MAX = 800;
const LANDING_X_MIN = 708;
const LANDING_X_MAX = 740;
const LIGHT_BAND = { minY: 38, maxY: 48 };
const TARGET = 'minecraft:sea_lantern';
const MIN_SPACING = 4;
const PAVED = new Set(['minecraft:light_blue_concrete']);
const SOLID_SUPPORT = new Set(['minecraft:stone', 'minecraft:andesite', 'minecraft:diorite', 'minecraft:granite']);

const portalLedger = readJson(CORRIDOR.portalLedger);
invariant(portalLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && portalLedger.releaseId === 'CIRC-C01-PORTAL-01',
  'C01 portal→L1 stair evidence ledger missing or not accepted');
const authorization = fs.readFileSync(absolute(AUTHORIZATION), 'utf8');
invariant(authorization.includes('I authorize all work all plans all areas'),
  'expanded owner directive does not authorize all-areas work');

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const sourceCache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!sourceCache.has(key)) {
    sourceCache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  }
  return sourceCache.get(key);
};

// --- 1. Enumerate the corridor floor band cells -----------------------------
const floorCells = [];
for (let x = FLOOR_X_MIN; x <= FLOOR_X_MAX; x += 1) {
  const z = FLOOR_BAND_Z;
  const atY = await sourceAt({ x, y: FLOOR_Y, z });
  const above = await sourceAt({ x, y: FLOOR_Y + 1, z });
  const material = blockName(atY);
  if (!isAir(atY) && isAir(above) && !isFluid(atY) && !isHazard(atY) && PAVED.has(material)) {
    floorCells.push({ x, z, material });
  }
}
invariant(floorCells.length >= 80, `corridor floor band count drift: ${floorCells.length}`);

// --- 2. Clean cells: non-gravity solid support below + two-clear air above --
const clean = [];
for (const cell of floorCells) {
  if (cell.x < LANDING_X_MIN || cell.x > LANDING_X_MAX) continue;
  const below = await sourceAt({ x: cell.x, y: FLOOR_Y - 1, z: cell.z });
  if (!SOLID_SUPPORT.has(blockName(below))) continue;
  const h1 = await sourceAt({ x: cell.x, y: FLOOR_Y + 1, z: cell.z });
  const h2 = await sourceAt({ x: cell.x, y: FLOOR_Y + 2, z: cell.z });
  if (!isAir(h1) || !isAir(h2)) continue;
  clean.push({ ...cell });
}
invariant(clean.length >= 9, `clean corridor cells too few: ${clean.length}`);

// --- 3. Greedy Chebyshev spacing >= 4 ---------------------------------------
const sorted = clean.slice().sort((a, b) => a.x - b.x || a.z - b.z);
const selected = [];
for (const cell of sorted) {
  const clear = selected.every((pick) => (
    Math.max(Math.abs(pick.x - cell.x), Math.abs(pick.z - cell.z)) >= MIN_SPACING
  ));
  if (clear) selected.push({ ...cell });
}
invariant(selected.length === 9, `cadence target count drift: ${selected.length} != 9`);
invariant(new Set(selected.map((cell) => `${cell.x},${cell.z}`)).size === 9,
  'cadence contains duplicate targets');
invariant(selected.every((cell) => cell.material === 'minecraft:light_blue_concrete'),
  'all cadence targets must be light_blue_concrete floor');
invariant(selected.every((cell) => cell.z === FLOOR_BAND_Z),
  'all cadence targets must lie on the z=-81 arrival-corridor band');

// --- 4. Exact per-target source guards --------------------------------------
const ops = [];
const targetKeys = new Set();
for (const cell of selected) {
  const sourceState = await sourceAt({ x: cell.x, y: FLOOR_Y, z: cell.z });
  invariant(sourceState === 'minecraft:light_blue_concrete',
    `unexpected source at (${cell.x},${FLOOR_Y},${cell.z}): ${sourceState}`);
  const below = await sourceAt({ x: cell.x, y: FLOOR_Y - 1, z: cell.z });
  invariant(SOLID_SUPPORT.has(blockName(below)) && !GRAVITY.has(blockName(below)),
    `expected solid support below (${cell.x},${FLOOR_Y - 1},${cell.z}): ${below}`);
  const h1 = await sourceAt({ x: cell.x, y: FLOOR_Y + 1, z: cell.z });
  const h2 = await sourceAt({ x: cell.x, y: FLOOR_Y + 2, z: cell.z });
  invariant(isAir(h1) && isAir(h2),
    `headroom not two-clear above (${cell.x},${FLOOR_Y},${cell.z}): h1=${h1} h2=${h2}`);
  const key = cellKey({ x: cell.x, y: FLOOR_Y, z: cell.z });
  invariant(!targetKeys.has(key), `duplicate target ${key}`);
  targetKeys.add(key);
  invariant(sourceState !== TARGET, `noop target at ${key}`);
  ops.push({
    cell: { x: cell.x, y: FLOOR_Y, z: cell.z },
    sourceState,
    targetState: TARGET,
  });
}
invariant(ops.length === 9, `operated target count drift: ${ops.length}`);

// --- 5. Interaction halo (3x3x3 around every operated cell) -----------------
const operatedCells = uniqueCells(ops.map(({ cell }) => cell));
const haloCells = uniqueCells(operatedCells.flatMap((cell) => {
  const cells = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        cells.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
      }
    }
  }
  return cells;
})).filter((cell) => !targetKeys.has(cellKey(cell)));
let haloFluidCount = 0;
let haloForbiddenCount = 0;
let haloGravityCount = 0;
for (const cell of haloCells) {
  const st = await sourceAt(cell);
  if (isFluid(st)) haloFluidCount += 1;
  if (isHazard(st)) haloForbiddenCount += 1;
  if (GRAVITY.has(blockName(st))) haloGravityCount += 1;
}
invariant(haloFluidCount === 0 && haloForbiddenCount === 0 && haloGravityCount === 0,
  `interaction halo fluid/forbidden/gravity: ${haloFluidCount}/${haloForbiddenCount}/${haloGravityCount}`);

// --- 6. Block-entity and saved-entity clearance over the operated envelope --
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
  }
}
invariant(blockEntities.length === 0,
  `operated envelope intersects a block entity: ${blockEntities.length}`);

// --- 7. Corridor is currently unlit (light census across the corridor band) -
const LIGHT_BLOCKS = new Set([
  'minecraft:lantern', 'minecraft:soul_lantern', 'minecraft:sea_lantern',
  'minecraft:torch', 'minecraft:wall_torch', 'minecraft:glowstone',
  'minecraft:shroomlight', 'minecraft:conduit',
]);
let existingLightCount = 0;
for (let x = 700; x <= 760; x += 1) {
  for (let z = -86; z <= -60; z += 1) {
    for (let y = LIGHT_BAND.minY; y <= LIGHT_BAND.maxY; y += 1) {
      const st = await sourceAt({ x, y, z });
      if (LIGHT_BLOCKS.has(blockName(st))) existingLightCount += 1;
    }
  }
}
invariant(existingLightCount === 0,
  `arrival corridor is not currently unlit: ${existingLightCount} light blocks present`);

// --- 8. Preserve the corridor walking surface ------------------------------
const preservedFloorCells = floorCells.filter((cell) => !targetKeys.has(
  cellKey({ x: cell.x, y: FLOOR_Y, z: cell.z }),
));
invariant(preservedFloorCells.length === floorCells.length - 9,
  `preserved floor cell count drift: ${preservedFloorCells.length}`);

// --- Emit the cadence package (single package, exact inverse) ---------------
const ordered = ops.slice().sort((a, b) => a.cell.x - b.cell.x || a.cell.y - b.cell.y || a.cell.z - b.cell.z);
const forwardPath = path.join(OUT_DIR, `${BASENAME}.cadence.forward.txt`);
const rollbackPath = path.join(OUT_DIR, `${BASENAME}.cadence.rollback.txt`);
const forwardBody = `${ordered.map(({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState)).join('\n')}\n`;
const rollbackBody = `${ordered.slice().reverse().map(({ cell, sourceState, targetState }) => replLine(cell, targetState, sourceState)).join('\n')}\n`;
const header = (direction, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID} (cadence ${direction})`,
  `# source root: ${SNAPSHOT}`,
  `# target coordinate-set SHA-256: ${hashCells(operatedCells)}`,
  `# operation SHA-256: ${operationSha256}`,
].join('\n');
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(forwardPath), `${header('forward', forwardSha256)}\n${forwardBody}`);
fs.writeFileSync(absolute(rollbackPath), `${header('rollback', rollbackSha256)}\n${rollbackBody}`);

const operationManifest = {
  cadence: {
    role: 'flush C01 portal-to-L1 arrival-corridor wayfinding cadence (9 sea_lantern floor inlays at y42)',
    forwardSha256,
    rollbackSha256,
    forwardCommandCount: ordered.length,
    rollbackCommandCount: ordered.length,
    targetCoordinateSetSha256: hashCells(operatedCells),
    exactInverse: true,
  },
};

const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: TRANSACTION_ID,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_R08AM_POST_OFFLINE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: false,
  scopeIds: ['C01-BUNKER'],
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'C01-BUNKER',
    purpose: 'Add a flush wayfinding cadence to the completely unlit C01 portal-to-L1 arrival corridor (z=-81, x=708..740 light_blue_concrete floor band at y42), the first interior node reached after the accepted CIRC-C01-PORTAL-01 stair shaft empties at (701,42,-81). Nine sea_lantern floor inlays with >=4 Chebyshev spacing; pure additive passive light, no pole, wall, or geometry change.',
    treatment: 'FLUSH_ARRIVAL_CORRIDOR_WAYFINDING_CADENCE_SEA_LANTERN_INLAY',
    corridorBand: { xMin: FLOOR_X_MIN, xMax: FLOOR_X_MAX, y: FLOOR_Y, z: FLOOR_BAND_Z },
    landingSpan: { xMin: LANDING_X_MIN, xMax: LANDING_X_MAX },
    floorY: FLOOR_Y,
    pavedFloorCellCount: floorCells.length,
    cleanCorridorCellCount: clean.length,
    preservedFloorCellCount: preservedFloorCells.length,
    existingCorridorLightCount: existingLightCount,
    minimumSpacing: MIN_SPACING,
    built: classManifest(operatedCells),
    cadenceCells: classManifest(operatedCells),
    cadenceSelection: selected.map(({ x, z, material }) => ({ x, z, material })),
    routeCommissioned: false,
    publicAccess: {
      surfaceEgressOrAccessibilityClaimed: false,
      emergencyLightingCommissioned: false,
      routeCommissioningClaimed: false,
    },
  },
  source: {
    snapshotRoot: relative(SNAPSHOT),
    portalLedger: fileBinding(CORRIDOR.portalLedger),
    authorization: { path: relative(AUTHORIZATION) },
    currentStateLedger: { path: relative(CONTRACT) },
  },
  target: {
    operatedUnion: classManifest(operatedCells),
    desiredStateCensus: census(ops, (record) => record.targetState),
    sourceStateCensus: census(ops, (record) => record.sourceState),
    interactionHalo: classManifest(haloCells),
    packageTargetsDisjoint: true,
  },
  operations: operationManifest,
  packages: [{ key: 'cadence', forward: relative(forwardPath), rollback: relative(rollbackPath) }],
  executionOrder: {
    forward: ['cadence'],
    rollback: ['cadence'],
    gravity: 'single flush floor cadence package; rollback is the exact inverse',
  },
  isolation: {
    sourceHazardCount: 0,
    operatedHaloFluidCount: haloFluidCount,
    operatedHaloForbiddenBlockCount: haloForbiddenCount,
    operatedHaloGravityCount: haloGravityCount,
    blockEntityIntersectionCount: blockEntities.length,
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
  targetCount: ops.length,
  cadenceCellCount: ops.length,
  haloCellCount: haloCells.length,
  haloFluidCount,
  haloForbiddenCount,
  haloGravityCount,
  blockEntityIntersectionCount: blockEntities.length,
  pavedFloorCellCount: floorCells.length,
  cleanCorridorCellCount: clean.length,
  preservedFloorCellCount: preservedFloorCells.length,
  existingCorridorLightCount: existingLightCount,
}, null, 2)}\n`);
