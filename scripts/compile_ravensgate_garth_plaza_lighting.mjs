#!/usr/bin/env node
/** Compile RAVENSGATE-NEXT-02 — Ravensgate RG-GARTH-STATUES plaza lighting
 *  cadence.
 *
 *  The Garth statue program public realm (`x=-93..-68, z=-444..-428`, floor
 *  y67) is the district's central civic plaza: a fully paved stone_bricks /
 *  smooth_stone plaza (201 interior floor cells) carrying the six authored
 *  statue plinths. The re-census (`ravensgate-recensus-20260824`) classifies
 *  it as `IF-RG-GARTH-STATUES IN_DISTRICT_PUBLIC_REALM`, uncontested, fully
 *  inside the frozen Ravensgate district. It is effectively unlit: the only
 *  light sources are eight hanging lanterns along the z=-430 north edge at
 *  y73 (6 blocks above the floor).
 *
 *  This package applies the same clean additive treatment as the accepted
 *  RAVENSGATE-NEXT-01 / WL-DISTRICT-NEXT-01 pattern: a flush
 *  `minecraft:sea_lantern` floor-inlay cadence that adds light without any
 *  pole, wall, or geometry change.
 *
 *  Deterministic selection (derived from the current-source snapshot passed via
 *  --snapshot):
 *   - enumerate the paved floor cells (full-opaque at y67, air at y68,
 *     non-fluid) inside the statue-plaza rectangle;
 *   - retain only interior floor cells (all 4 cardinal neighbours are floor)
 *     whose material is `minecraft:stone_bricks` or `minecraft:smooth_stone`;
 *   - exclude cells within Chebyshev distance 2 of an authored statue plinth
 *     center (the plinth footprints `x±1,z±1` at y67-68 plus one halo);
 *   - exclude cells within Chebyshev distance 4 of an existing light block in
 *     the y60..80 band (keeps the cadence additive and clear of the north-edge
 *     lantern line);
 *   - greedy Chebyshev spacing >= 3 from the sorted interior set.
 *
 *  This yields exactly 23 targets, each exact `minecraft:stone_bricks` over a
 *  solid non-fluid base with two clear air blocks above (y68, y69). A flush
 *  floor sea_lantern is a full walkable opaque block, so the plaza walking
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
const GENERATED_AT = value('--generated-at', '2026-08-25T17:00:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-sweep3-source-20260825T164404Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'ravensgate-garth-plaza-lighting');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'ravensgate-garth-plaza-lighting';
const RELEASE_ID = 'RAVENSGATE-NEXT-02';
const RELEASE_NODE_ID = 'CZ-LEGACY-CROSS-AREA-CIRCULATION';

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
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
  'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil',
  'minecraft:dragon_egg', 'minecraft:pointed_dripstone', 'minecraft:scaffolding',
]);
const isGravity = (state) => GRAVITY.has(blockName(state)) || blockName(state).endsWith('_concrete_powder');
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
const LIGHT_BLOCKS = new Set([
  'minecraft:lantern', 'minecraft:soul_lantern', 'minecraft:sea_lantern',
  'minecraft:torch', 'minecraft:wall_torch', 'minecraft:glowstone',
  'minecraft:shroomlight', 'minecraft:conduit',
]);
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

const RECENSUS = 'data/world-review/ravensgate-recensus-20260824/ravensgate-recensus.json';
const PLAZA = { minX: -93, maxX: -68, minZ: -444, maxZ: -428 };
const FLOOR_Y = 67;
const LIGHT_BAND = { minY: 60, maxY: 80 };
const TARGET = 'minecraft:sea_lantern';
const MIN_SPACING = 3;
const LIGHT_EXCLUSION_RADIUS = 4;
const PAVED = new Set(['minecraft:stone_bricks', 'minecraft:smooth_stone']);
const STATUES = [
  [-92, -443], [-92, -429], [-69, -443], [-69, -429],
  [-91, -437], [-77, -437],
];
const STATUE_HALO = 2;

const recensus = readJson(RECENSUS);
invariant(recensus.id === 'ravensgate-recensus-20260824' && recensus.readOnly === true,
  'Ravensgate re-census evidence missing or not read-only');
invariant(recensus.ownershipClosureSummary?.resolvedInterfaces?.includes('IF-RG-GARTH-STATUES'),
  'RG-GARTH-STATUES must be resolved in the re-census ownership closure');
const statueInterface = recensus.ownershipInterfaces?.find((entry) => entry.id === 'IF-RG-GARTH-STATUES');
invariant(statueInterface?.status === 'IN_DISTRICT_PUBLIC_REALM' && statueInterface.contested === false,
  'RG-GARTH-STATUES must be uncontested in-district public realm');
invariant(statueInterface.bounds?.minX === PLAZA.minX && statueInterface.bounds?.maxX === PLAZA.maxX
  && statueInterface.bounds?.minZ === PLAZA.minZ && statueInterface.bounds?.maxZ === PLAZA.maxZ,
  'RG-GARTH-STATUES bounds drifted from the plaza rectangle');

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

// --- 1. Enumerate the paved floor cells -------------------------------------
const floorCells = [];
for (let x = PLAZA.minX; x <= PLAZA.maxX; x += 1) {
  for (let z = PLAZA.minZ; z <= PLAZA.maxZ; z += 1) {
    const atY = await sourceAt({ x, y: FLOOR_Y, z });
    const above = await sourceAt({ x, y: FLOOR_Y + 1, z });
    const material = blockName(atY);
    if (!isAir(atY) && isAir(above) && !isFluid(atY) && !isHazard(atY)) {
      floorCells.push({ x, z, material });
    }
  }
}
invariant(floorCells.length === 301, `plaza paved floor count drift: ${floorCells.length} != 301`);
const floorKey = new Set(floorCells.map((cell) => `${cell.x},${cell.z}`));

// --- 2. Interior floor cells (all four cardinal neighbours are floor) -------
const interior = floorCells.filter((cell) => (
  floorKey.has(`${cell.x + 1},${cell.z}`)
  && floorKey.has(`${cell.x - 1},${cell.z}`)
  && floorKey.has(`${cell.x},${cell.z + 1}`)
  && floorKey.has(`${cell.x},${cell.z - 1}`)
));
invariant(interior.length === 201, `plaza interior floor count drift: ${interior.length} != 201`);

// --- 3. Paved interior (stone_bricks / smooth_stone) ------------------------
const pavedInterior = interior.filter((cell) => PAVED.has(cell.material));
invariant(pavedInterior.length === 171, `paved interior count drift: ${pavedInterior.length} != 171`);

// --- 4. Statue exclusion (Chebyshev <= 2 from an authored statue center) ----
const nearStatue = (cell) => STATUES.some(([sx, sz]) => (
  Math.max(Math.abs(cell.x - sx), Math.abs(cell.z - sz)) <= STATUE_HALO
));
const statueFiltered = pavedInterior.filter((cell) => !nearStatue(cell));
invariant(statueFiltered.length === 163, `statue-filtered count drift: ${statueFiltered.length} != 163`);

// --- 5. Support / headroom filter (solid non-fluid base, two clear air above)
const supportFiltered = [];
for (const cell of statueFiltered) {
  const below = await sourceAt({ x: cell.x, y: FLOOR_Y - 1, z: cell.z });
  if (isFluid(below) || isAir(below) || isHazard(below) || isGravity(below)) continue;
  const h1 = await sourceAt({ x: cell.x, y: FLOOR_Y + 1, z: cell.z });
  const h2 = await sourceAt({ x: cell.x, y: FLOOR_Y + 2, z: cell.z });
  if (!isAir(h1) || !isAir(h2)) continue;
  supportFiltered.push(cell);
}
invariant(supportFiltered.length === 159, `support-filtered count drift: ${supportFiltered.length} != 159`);

// --- 6. Existing-light exclusion (Chebyshev < 4 from a light in y60..80) ----
const lightCells = [];
for (let x = PLAZA.minX - 4; x <= PLAZA.maxX + 4; x += 1) {
  for (let z = PLAZA.minZ - 4; z <= PLAZA.maxZ + 4; z += 1) {
    for (let y = LIGHT_BAND.minY; y <= LIGHT_BAND.maxY; y += 1) {
      const st = await sourceAt({ x, y, z });
      if (LIGHT_BLOCKS.has(blockName(st))) lightCells.push({ x, y, z });
    }
  }
}
invariant(lightCells.length === 8, `plaza light census drift: ${lightCells.length} != 8`);
const nearExistingLight = (cell) => lightCells.some((light) => (
  Math.max(Math.abs(light.x - cell.x), Math.abs(light.z - cell.z)) < LIGHT_EXCLUSION_RADIUS
));
const lightFiltered = supportFiltered.filter((cell) => !nearExistingLight(cell));
invariant(lightFiltered.length === 138, `light-filtered count drift: ${lightFiltered.length} != 138`);

// --- 7. Greedy Chebyshev spacing >= 3 ---------------------------------------
const sorted = lightFiltered.slice().sort((a, b) => a.x - b.x || a.z - b.z);
const selected = [];
for (const cell of sorted) {
  const clear = selected.every((pick) => (
    Math.max(Math.abs(pick.x - cell.x), Math.abs(pick.z - cell.z)) >= MIN_SPACING
  ));
  if (clear) selected.push({ ...cell });
}
invariant(selected.length === 22, `cadence target count drift: ${selected.length} != 22`);
invariant(new Set(selected.map((cell) => `${cell.x},${cell.z}`)).size === 22,
  'cadence contains duplicate targets');
invariant(selected.every((cell) => cell.material === 'minecraft:stone_bricks'),
  'all cadence targets must be stone_bricks floor');

// --- 8. Exact per-target source guards --------------------------------------
const ops = [];
for (const cell of selected) {
  const sourceState = await sourceAt({ x: cell.x, y: FLOOR_Y, z: cell.z });
  invariant(sourceState === 'minecraft:stone_bricks',
    `unexpected source at (${cell.x},${FLOOR_Y},${cell.z}): ${sourceState}`);
  const below = await sourceAt({ x: cell.x, y: FLOOR_Y - 1, z: cell.z });
  invariant(!isFluid(below) && !isAir(below) && !isHazard(below) && !isGravity(below),
    `expected solid non-fluid support below (${cell.x},${FLOOR_Y - 1},${cell.z}): ${below}`);
  const h1 = await sourceAt({ x: cell.x, y: FLOOR_Y + 1, z: cell.z });
  const h2 = await sourceAt({ x: cell.x, y: FLOOR_Y + 2, z: cell.z });
  invariant(isAir(h1) && isAir(h2),
    `headroom not two-clear above (${cell.x},${FLOOR_Y},${cell.z}): h1=${h1} h2=${h2}`);
  ops.push({
    cell: { x: cell.x, y: FLOOR_Y, z: cell.z },
    sourceState,
    targetState: TARGET,
  });
}

// Duplicate / noop guard.
const targetKeys = new Set();
for (const record of ops) {
  const key = cellKey(record.cell);
  invariant(!targetKeys.has(key), `duplicate target ${key}`);
  targetKeys.add(key);
  invariant(await sourceAt(record.cell) === record.sourceState
    && record.sourceState !== record.targetState,
  `source/noop guard drift at ${key}`);
}

// --- 8. Interaction halo (3x3x3 around every operated cell) -----------------
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
for (const cell of haloCells) {
  const st = await sourceAt(cell);
  if (isFluid(st)) haloFluidCount += 1;
  if (isHazard(st)) haloForbiddenCount += 1;
}
invariant(haloFluidCount === 0 && haloForbiddenCount === 0,
  `interaction halo fluid/forbidden hazard: ${haloFluidCount}/${haloForbiddenCount}`);

// --- 9. Block-entity and saved-entity clearance over the operated envelope --
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

// --- 10. Preserve the statue plinths and the plaza walking surface ----------
invariant(selected.every((cell) => floorKey.has(`${cell.x},${cell.z}`)),
  'cadence target outside the paved floor');
const preservedFloorCells = floorCells.filter((cell) => !targetKeys.has(cellKey({ x: cell.x, y: FLOOR_Y, z: cell.z })));
invariant(preservedFloorCells.length === 279, `preserved floor cell count drift: ${preservedFloorCells.length}`);
invariant(statueInterface.cells === 144, `statue interface cell count drifted: ${statueInterface.cells}`);

// --- Emit the cadence package (single package, exact inverse) ---------------
const ordered = ops.slice().sort((a, b) => a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z);
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
    role: `flush Ravensgate Garth statue-plaza lighting cadence (${ops.length} sea_lantern floor inlays at y67)`,
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
  status: 'COMPILED_FROM_ACCEPTED_SNAPSHOT_OFFLINE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: false,
  scopeIds: ['RAVENSGATE'],
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'ravensgate',
    purpose: 'Add a flush lighting cadence to the Ravensgate RG-GARTH-STATUES central civic plaza (x=-93..-68, z=-444..-428, floor y67). The plaza is fully paved stone_bricks/smooth_stone with six authored statue plinths and effectively unlit (eight hanging lanterns along the z=-430 north edge at y73). 22 sea_lantern floor inlays in the stone_bricks plaza floor at y67 with >=3 Chebyshev spacing, >=4 from the existing north-edge lantern line, and outside every statue plinth halo; pure additive light, no pole, wall, or geometry change.',
    treatment: 'FLUSH_PLAZA_FLOOR_LIGHTING_CADENCE_SEA_LANTERN_INLAY',
    plazaBounds: PLAZA,
    floorY: FLOOR_Y,
    pavedFloorCellCount: floorCells.length,
    interiorFloorCellCount: interior.length,
    pavedInteriorCellCount: pavedInterior.length,
    statueFilteredCellCount: statueFiltered.length,
    lightFilteredCellCount: lightFiltered.length,
    preservedFloorCellCount: preservedFloorCells.length,
    existingPlazaLightCount: lightCells.length,
    minimumSpacing: MIN_SPACING,
    lightExclusionRadius: LIGHT_EXCLUSION_RADIUS,
    statueHalo: STATUE_HALO,
    built: classManifest(operatedCells),
    cadenceCells: classManifest(operatedCells),
    cadenceSelection: selected.map(({ x, z, material }) => ({ x, z, material })),
    routeCommissioned: false,
    ownership: {
      interfaceIF_RG_GARTH_STATUES: 'IN_DISTRICT_PUBLIC_REALM (uncontested)',
      contestedInterfaceIF_RG_GARTH_LIBRARY_TERRACE: 'z=-432 band south-west of this plaza; no overlap',
    },
  },
  source: {
    snapshotRoot: relative(SNAPSHOT),
    recensus: fileBinding(RECENSUS),
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
  targetCount: ops.length,
  cadenceCellCount: ops.length,
  haloCellCount: haloCells.length,
  haloFluidCount,
  haloForbiddenCount,
  blockEntityIntersectionCount: blockEntities.length,
  savedEntityIntersectionCount: savedEntities.length,
  pavedFloorCellCount: floorCells.length,
  interiorFloorCellCount: interior.length,
  pavedInteriorCellCount: pavedInterior.length,
  preservedFloorCellCount: preservedFloorCells.length,
  existingPlazaLightCount: lightCells.length,
}, null, 2)}\n`);
