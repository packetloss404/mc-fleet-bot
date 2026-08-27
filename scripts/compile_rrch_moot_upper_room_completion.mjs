#!/usr/bin/env node
/** Compile the RRCH-MOOT-UPPER-ROOMS Ravensreach Moot Hall upper-stack room
 * completion (Clerks Hall, Meeting Room, Attic Store, and Committee Room
 * finishing) following the guarded-release pattern.
 *
 * Every changed cell is an exact-air guarded REPL transition, strictly within
 * the interior x=-91..-71 (the x=-92 partition wall and the accepted
 * CIVIC-RRCH-MOOT-UPPER-SPINE at x=-100..-92 stay untouched). The build:
 *
 *  - Committee Room: puts the seven floating RRCH-MOOT-01B fixtures on solid
 *    footing (support block directly below each), adds a committee table +
 *    seating on the walkable north ledge.
 *  - Clerks Hall: adds records/work islands, lighting, a level directory and
 *    an identifiable access threshold marker on the west interior face.
 *  - Meeting Room: adds a meeting table, supported seating, a display/notice
 *    bookshelf wall, and a wayfinding beacon toward the common stair.
 *  - Attic Store: adds an enclosure/ceiling over the floor footprint, storage
 *    shelving, lighting, and a controlled staff threshold marker. It stays a
 *    staff/service room, not public.
 *
 * The compiler reads an immutable snapshot and writes exact forward REPL and
 * inverse rollback files plus a release manifest. It never contacts RCON or
 * edits the world.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  cellsIn,
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
const GENERATED_AT = value('--generated-at', '2026-08-24T16:10:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-moot-upper-source-20260824T160900Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'rrch-moot-upper-room-completion');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'rrch-moot-upper-room-completion';
const RELEASE_ID = 'RRCH-MOOT-UPPER-ROOMS';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`RRCH-MOOT-UPPER compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const FORBIDDEN = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:spawner', 'minecraft:lectern', 'minecraft:brewing_stand',
  'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive',
  'minecraft:bee_nest', 'minecraft:decorated_pot', 'minecraft:chiseled_bookshelf',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw',
]);
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const isForbidden = (state) => FORBIDDEN.has(blockName(state)) || blockName(state).endsWith('_shulker_box');
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const six = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

const OAK_PLANKS = 'minecraft:oak_planks';
const SPRUCE_PLANKS = 'minecraft:spruce_planks';
const POLISHED_DEEPSLATE = 'minecraft:polished_deepslate';
const BOOKSHELF = 'minecraft:bookshelf';
const SEA_LANTERN = 'minecraft:sea_lantern';
const STAIR = 'minecraft:dark_oak_stairs[facing=%s,half=bottom,shape=straight,waterlogged=false]';

const INTERIOR = { minX: -91, maxX: -71 };

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));

/** -------------------------------------------------------------------- *
 *  Committee Room (y=74..77). Fix the seven floating 01B fixtures by adding
 *  a support column from the void bottom up to just below each fixture, then
 *  add a committee table + seating on the walkable north ledge (y77, z=-357).
 *  -------------------------------------------------------------------- */
// Each entry: fixture cell + the level the column must reach up to (exclusive
// top, i.e. the first air cell right under the fixture).
const committeeFixtureColumns = [
  { x: -73, z: -364, fixtureY: 75 },
  { x: -73, z: -352, fixtureY: 75 },
  { x: -73, z: -348, fixtureY: 75 },
  { x: -91, z: -344, fixtureY: 75 },
  { x: -79, z: -344, fixtureY: 75 },
  { x: -90, z: -362, fixtureY: 76 },
  { x: -80, z: -362, fixtureY: 76 },
];
const committeeSupports = [];
for (const fixture of committeeFixtureColumns) {
  // Find the void bottom: first non-air block below the fixture.
  let bottom = null;
  for (let y = fixture.fixtureY - 1; y >= 55; y -= 1) {
    const s = await reader.blockState(fixture.x, y, fixture.z);
    if (!AIR.has(s.Name) && !FLUID.has(s.Name)) { bottom = y; break; }
  }
  invariant(bottom !== null,
    `committee fixture ${fixture.x},${fixture.z} has no void bottom above y55`);
  invariant(bottom < fixture.fixtureY - 1, `committee fixture ${fixture.x},${fixture.z} already supported`);
  for (let y = bottom + 1; y < fixture.fixtureY; y += 1) {
    committeeSupports.push({
      cell: { x: fixture.x, y, z: fixture.z },
      toState: POLISHED_DEEPSLATE,
      role: 'committee-support',
    });
  }
}

const committeeTable = [];
for (const x of [-87, -86, -85]) {
  committeeTable.push({ cell: { x, y: 77, z: -357 }, toState: OAK_PLANKS, role: 'committee-table' });
}
const committeeChairs = [
  { cell: { x: -88, y: 77, z: -357 }, toState: STAIR.replace('%s', 'east'), role: 'committee-chair' },
  { cell: { x: -84, y: 77, z: -357 }, toState: STAIR.replace('%s', 'west'), role: 'committee-chair' },
];

/** -------------------------------------------------------------------- *
 *  Clerks Hall (y=79..82). The deepslate floor platform spans
 *  x=-91..-71, z=-354..-344. Add records islands + work desks on the raised
 *  band edges, a level directory and an identifiable access threshold on the
 *  west interior face, plus sea-lantern lighting.
 *  -------------------------------------------------------------------- */
const clerksDesks = [];
for (const x of [-89, -84, -78]) {
  clerksDesks.push({ cell: { x, y: 80, z: -354 }, toState: OAK_PLANKS, role: 'clerks-desks' });
  clerksDesks.push({ cell: { x, y: 80, z: -344 }, toState: OAK_PLANKS, role: 'clerks-desks' });
}
const clerksRecords = [];
for (const x of [-89, -84, -78]) {
  clerksRecords.push({ cell: { x, y: 81, z: -353 }, toState: BOOKSHELF, role: 'clerks-records' });
  clerksRecords.push({ cell: { x, y: 81, z: -345 }, toState: BOOKSHELF, role: 'clerks-records' });
}
const clerksLights = [
  [-89, -352], [-84, -352], [-89, -346], [-84, -346],
].map(([x, z]) => ({ cell: { x, y: 82, z }, toState: SEA_LANTERN, role: 'clerks-lighting' }));
const clerksDirectory = [
  { cell: { x: -91, y: 81, z: -353 }, toState: POLISHED_DEEPSLATE, role: 'clerks-directory' },
];
const clerksThreshold = [
  { cell: { x: -91, y: 80, z: -354 }, toState: STAIR.replace('%s', 'east'), role: 'clerks-threshold' },
];

/** -------------------------------------------------------------------- *
 *  Meeting Room (y=84..86). Spruce floor slab at y83 (RRCH-MOOT-01). Add a
 *  meeting table + seating on the y84 plane, a display/notice bookshelf band
 *  on the west wall, and a wayfinding beacon toward the common stair.
 *  -------------------------------------------------------------------- */
const meetingTable = [];
for (const z of [-354, -353, -352]) {
  for (const x of [-87, -86, -85]) {
    meetingTable.push({ cell: { x, y: 84, z }, toState: OAK_PLANKS, role: 'meeting-table' });
  }
}
const meetingChairs = [
  { cell: { x: -88, y: 84, z: -354 }, toState: STAIR.replace('%s', 'east'), role: 'meeting-chair' },
  { cell: { x: -84, y: 84, z: -354 }, toState: STAIR.replace('%s', 'west'), role: 'meeting-chair' },
  { cell: { x: -86, y: 84, z: -355 }, toState: STAIR.replace('%s', 'north'), role: 'meeting-chair' },
  { cell: { x: -86, y: 84, z: -351 }, toState: STAIR.replace('%s', 'south'), role: 'meeting-chair' },
];
const meetingDisplay = [
  { cell: { x: -91, y: 84, z: -360 }, toState: BOOKSHELF, role: 'meeting-display' },
  { cell: { x: -91, y: 84, z: -359 }, toState: BOOKSHELF, role: 'meeting-display' },
  { cell: { x: -91, y: 84, z: -358 }, toState: BOOKSHELF, role: 'meeting-display' },
];
const meetingWayfinding = [
  { cell: { x: -91, y: 84, z: -348 }, toState: POLISHED_DEEPSLATE, role: 'meeting-wayfinding' },
  { cell: { x: -90, y: 84, z: -348 }, toState: SEA_LANTERN, role: 'meeting-wayfinding-light' },
];

/** -------------------------------------------------------------------- *
 *  Attic Store (y=88..93). Spruce floor slab at y87 (RRCH-MOOT-01) across
 *  x=-91..-75, z=-360..-348. Add a ceiling/enclosure at y93 over that exact
 *  footprint, storage shelving on the north/south walls, lighting, and a
 *  controlled staff threshold marker on the west interior face.
 *  -------------------------------------------------------------------- */
const atticCeiling = cellsIn({
  minX: -91, maxX: -75, minY: 93, maxY: 93, minZ: -360, maxZ: -348,
}).map((cell) => ({ cell, toState: SPRUCE_PLANKS, role: 'attic-ceiling' }));
const atticShelving = [];
for (const [x, z] of [
  [-88, -360], [-84, -360], [-80, -360], [-76, -360],
  [-88, -348], [-84, -348], [-80, -348], [-76, -348],
]) {
  atticShelving.push({ cell: { x, y: 88, z }, toState: BOOKSHELF, role: 'attic-shelving' });
}
const atticLightPosts = [];
for (const [x, z] of [[-85, -354], [-85, -350], [-79, -350]]) {
  atticLightPosts.push({ cell: { x, y: 88, z }, toState: POLISHED_DEEPSLATE, role: 'attic-light-post' });
  atticLightPosts.push({ cell: { x, y: 89, z }, toState: SEA_LANTERN, role: 'attic-lighting' });
}
const atticThreshold = [
  { cell: { x: -91, y: 88, z: -360 }, toState: STAIR.replace('%s', 'east'), role: 'attic-staff-threshold' },
  { cell: { x: -91, y: 89, z: -360 }, toState: POLISHED_DEEPSLATE, role: 'attic-staff-marker' },
];

const packages = [
  { key: 'committee-room', entries: [...committeeSupports, ...committeeTable, ...committeeChairs] },
  { key: 'clerks-hall', entries: [...clerksDesks, ...clerksRecords, ...clerksLights, ...clerksDirectory, ...clerksThreshold] },
  { key: 'meeting-room', entries: [...meetingTable, ...meetingChairs, ...meetingDisplay, ...meetingWayfinding] },
  { key: 'attic-store', entries: [...atticCeiling, ...atticShelving, ...atticLightPosts, ...atticThreshold] },
];

const desired = new Map();
const meta = new Map();
for (const pkg of packages) {
  for (const entry of pkg.entries) {
    const key = cellKey(entry.cell);
    invariant(!desired.has(key), `duplicate target ${key}`);
    desired.set(key, { cell: entry.cell, toState: entry.toState });
    meta.set(key, { packageKey: pkg.key, role: entry.role });
  }
}

// Every target must currently be exact air (interior-only, partition/spine excluded).
const records = [];
for (const [key, target] of desired) {
  invariant(target.cell.x >= INTERIOR.minX && target.cell.x <= INTERIOR.maxX,
    `target outside interior x range: ${key}`);
  const sourceState = stateToCommandString(await reader.blockState(target.cell.x, target.cell.y, target.cell.z));
  invariant(AIR.has(blockName(sourceState)),
    `target is not exact air in source: ${key} = ${sourceState}`);
  records.push({ ...target, key, sourceState, ...meta.get(key) });
}
const operations = records;
const targetCells = operations.map(({ cell }) => cell);
const targetKeys = new Set(targetCells.map(cellKey));
const hazards = operations.filter(({ sourceState }) => isFluid(sourceState) || isForbidden(sourceState));
invariant(hazards.length === 0, `target fluid/container/control sources: ${JSON.stringify(hazards.slice(0, 20))}`);

const haloCells = uniqueCells(targetCells.flatMap((cell) => six.map(([dx, dy, dz]) => ({
  x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
})))).filter((cell) => !targetKeys.has(cellKey(cell)));
const haloRecords = [];
for (const cell of haloCells) {
  haloRecords.push({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
}
const haloFluid = haloRecords.filter(({ state }) => isFluid(state));
const haloForbidden = haloRecords.filter(({ state }) => isForbidden(state));
invariant(haloFluid.length === 0 && haloForbidden.length === 0,
  `interaction halo fluid/container/control hazard: ${JSON.stringify([...haloFluid, ...haloForbidden].slice(0, 20))}`);

const chunks = new Set(haloCells.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
const blockEntityIntersections = [];
const entityIntersections = [];
const envelopeBounds = boundsOf(uniqueCells([...targetCells, ...haloCells]));
for (const chunkKey of chunks) {
  const [cx, cz] = chunkKey.split(',').map(Number);
  const chunk = await reader.chunk(cx, cz);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (targetKeys.has(cellKey(point)) || haloCells.some((cell) => cellKey(cell) === cellKey(point))) {
      blockEntityIntersections.push({ id: entity.id ?? null, point });
    }
  }
  const entityChunk = await entityReader.chunk(cx, cz);
  for (const entity of entityChunk?.Entities ?? []) {
    const position = entity.Pos?.slice(0, 3).map(Number);
    if (position?.length === 3 && position[0] >= envelopeBounds.minX && position[0] < envelopeBounds.maxX + 1
      && position[1] >= envelopeBounds.minY && position[1] < envelopeBounds.maxY + 1
      && position[2] >= envelopeBounds.minZ && position[2] < envelopeBounds.maxZ + 1) {
      entityIntersections.push({ id: entity.id ?? null, position });
    }
  }
}
invariant(blockEntityIntersections.length === 0 && entityIntersections.length === 0,
  'target/halo intersects a block entity or saved movable entity');

// Verify every designed target's vertical support. A support is acceptable if
// the cell immediately below is (a) non-air/non-fluid in the source, or (b)
// itself a target in this package that will be placed solid first (lower y).
// Only furnishings (not ceiling cells) require support.
const floorSupportChecks = [];
const targetByKey = new Map(records.map((r) => [r.key, r]));
const SUPPORT_ROLES = new Set([
  'committee-support', 'committee-table', 'committee-chair',
  'clerks-desks', 'clerks-records', 'clerks-directory', 'clerks-threshold',
  'meeting-table', 'meeting-chair', 'meeting-display', 'meeting-wayfinding',
  'meeting-wayfinding-light', 'attic-shelving', 'attic-light-post',
  'attic-lighting', 'attic-staff-threshold', 'attic-staff-marker',
]);
for (const record of records) {
  if (!SUPPORT_ROLES.has(record.role)) continue;
  const { cell, role } = record;
  const belowCell = { x: cell.x, y: cell.y - 1, z: cell.z };
  const belowTarget = targetByKey.get(cellKey(belowCell));
  let supported = false;
  if (belowTarget) {
    supported = true; // projected solid placed first (lower y sorts first)
  } else {
    const below = await reader.blockState(belowCell.x, belowCell.y, belowCell.z);
    const belowState = stateToCommandString(below);
    supported = !AIR.has(blockName(belowState)) && !isFluid(belowState);
  }
  invariant(supported,
    `unsupported furniture cell: ${cellKey(cell)} (${role})`);
  floorSupportChecks.push({ cell, role });
}

const packageOrder = packages.map(({ key }) => key);
const packageGroups = new Map(packageOrder.map((key) => [key, []]));
for (const operation of operations) packageGroups.get(operation.packageKey).push(operation);
for (const [key, group] of packageGroups) {
  group.sort((a, b) => a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z);
  invariant(group.length > 0, `${key} compiled empty`);
}

const writtenPackages = [];
const operationManifest = {};
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
for (const key of packageOrder) {
  const group = packageGroups.get(key);
  const forward = path.join(OUT_DIR, `${BASENAME}.${key}.forward.txt`);
  const rollback = path.join(OUT_DIR, `${BASENAME}.${key}.rollback.txt`);
  const header = [
    `# ${TRANSACTION_ID}/${key}`,
    `# source ${SNAPSHOT}`,
    '# guarded per-cell exact-air transitions; generated offline',
  ];
  const forwardBody = `${group.map(({ cell, sourceState, toState }) => replLine(cell, sourceState, toState)).join('\n')}\n`;
  const reverse = [...group].reverse();
  const rollbackBody = `${reverse.map(({ cell, sourceState, toState }) => replLine(cell, toState, sourceState)).join('\n')}\n`;
  fs.writeFileSync(absolute(forward), `${header.join('\n')}\n${forwardBody}`);
  fs.writeFileSync(absolute(rollback), `${header.join('\n')}\n${rollbackBody}`);
  writtenPackages.push({ key, forward: relative(forward), rollback: relative(rollback) });
  operationManifest[key] = {
    forwardSha256: sha256(forwardBody),
    rollbackSha256: sha256(rollbackBody),
    forwardCommandCount: group.length,
    rollbackCommandCount: group.length,
    targetCoordinateSetSha256: hashCells(group.map(({ cell }) => cell)),
    exactInverse: true,
  };
}

const operationRoles = Object.fromEntries([...new Set(records.map(({ role }) => role))].sort().map((role) => [
  role,
  classManifest(records.filter((record) => record.role === role).map(({ cell }) => cell)),
]));
const perRoomCounts = Object.fromEntries(packageOrder.map((key) => [key, packageGroups.get(key).length]));

const manifestWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  transactionId: TRANSACTION_ID,
  status: 'COMPILED_FROM_FRESH_SOURCE_AWAITING_EXECUTION_KERNEL',
  mvpScope: false,
  scopeIds: ['RAVENSREACH-CIVIC'],
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'ravensreach',
    purpose: 'Finish the four Moot Hall upper-stack rooms (Committee Room, Clerks Hall, Meeting Room, Attic Store) within the interior x=-91..-71, keeping the x=-92 partition wall and the accepted upper spine untouched, correcting the floating RRCH-MOOT-01B fixtures and adding programme per room.',
    rooms: {
      'committee-room': {
        floating01BFixturesCorrected: committeeFixtureColumns.length,
        floating01BSupportColumnCells: committeeSupports.length,
        committeeTableCells: committeeTable.length,
        committeeChairCells: committeeChairs.length,
        supportMaterial: POLISHED_DEEPSLATE,
      },
      'clerks-hall': {
        workDeskCells: clerksDesks.length,
        recordsIslandCells: clerksRecords.length,
        lighting: clerksLights.length,
        directoryCells: clerksDirectory.length,
        accessThresholdCells: clerksThreshold.length,
      },
      'meeting-room': {
        meetingTableCells: meetingTable.length,
        seating: meetingChairs.length,
        displayWallCells: meetingDisplay.length,
        wayfindingCells: meetingWayfinding.length,
      },
      'attic-store': {
        ceilingCells: atticCeiling.length,
        shelvingCells: atticShelving.length,
        lightPostAndLanternCells: atticLightPosts.length,
        controlledStaffThresholdCells: atticThreshold.length,
        staffServiceRoom: true,
        publicAccessClaimed: false,
      },
    },
    geometry: {
      targets: classManifest(targetCells),
      operatedTargets: classManifest(operations.map(({ cell }) => cell)),
      interactionHalo: classManifest(haloCells),
      operationRoles,
      perRoomTargetCounts: perRoomCounts,
    },
    retainedBoundaries: {
      partitionWallX92Untouched: true,
      upperSpineUntouched: true,
      existingContainersPreserved: true,
      existingBlockEntitiesPreserved: true,
      lecternPreserved: true,
      bookshelfPreserved: true,
      treeFoliageUntouched: true,
      noPublicEgressClaimed: true,
    },
    furnitureSupport: {
      check: 'every furniture/support cell verified supported on a non-air, non-fluid block below, either in source or as a lower-y target placed first',
      verifiedCellCount: floorSupportChecks.length,
    },
  },
  source: {
    snapshotRoot: relative(SNAPSHOT),
  },
  isolation: {
    targetFluidOrWaterloggedCount: operations.filter(({ sourceState }) => isFluid(sourceState)).length,
    targetForbiddenBlockCount: operations.filter(({ sourceState }) => isForbidden(sourceState)).length,
    interactionHaloFluidCount: haloFluid.length,
    interactionHaloForbiddenBlockCount: haloForbidden.length,
    blockEntityIntersectionCount: blockEntityIntersections.length,
    savedEntityIntersectionCount: entityIntersections.length,
  },
  executionOrder: {
    forward: packageOrder,
    rollback: [...packageOrder].reverse(),
    gravity: 'solid conversions bottom-up; clearances top-down; exact rollback reverses both',
  },
  operations: operationManifest,
  packages: writtenPackages,
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
  packageCount: writtenPackages.length,
  perRoomTargetCounts: perRoomCounts,
  supportedFurnitureCells: floorSupportChecks.length,
}, null, 2)}\n`);
