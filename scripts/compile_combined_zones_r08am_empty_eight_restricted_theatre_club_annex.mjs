#!/usr/bin/env node
/** Compile the bounded Empty Eight restricted theatre/private-club annex. */

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
const GENERATED_AT = value('--generated-at', '2026-08-22T16:15:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r08al-post-20260822T155850Z');
const INTAKE = value('--intake-audit', 'data/world-review/combined-zones-r08al-live-20260822T155850Z/post-complete-save-intake.json');
const SOURCE_LEDGER = value('--source-release-ledger', 'data/world-review/combined-zones-r08al-live-20260822T155850Z/evidence-ledger.json');
const SOURCE_QA = value('--source-post-qa', 'data/world-review/combined-zones-r08al-live-20260822T155850Z/r08al-post-release-qa.json');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'combined-zones-r08am-empty-eight-restricted-theatre-private-club-annex');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'combined-zones-r08am-empty-eight-restricted-theatre-private-club-annex';
const RELEASE_ID = 'CZ-R08AM-EMPTY-EIGHT-RESTRICTED-THEATRE-PRIVATE-CLUB-ANNEX';
const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const DESIGN = 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json';
const CONTRACT = 'docs/masterplans/05-combined-zones/phase1-release-contract.json';
const AUTHORIZATION = 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json';
const PROTECTED_RELICS = 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json';
const R08AL_MANIFEST = 'data/buildops/combined-zones-r08al-empty-eight-south-public-vacant-retail.release-manifest.json';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fileBinding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R08AM compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
  'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil',
  'minecraft:dragon_egg', 'minecraft:pointed_dripstone', 'minecraft:scaffolding',
]);
const FORBIDDEN = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:spawner', 'minecraft:lectern', 'minecraft:brewing_stand',
  'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive', 'minecraft:bee_nest',
  'minecraft:decorated_pot', 'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw',
]);
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const isGravity = (state) => GRAVITY.has(blockName(state)) || blockName(state).endsWith('_concrete_powder');
const isForbidden = (state) => FORBIDDEN.has(blockName(state)) || blockName(state).endsWith('_shulker_box');
const inside = (cell, bounds) => cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY
  && cell.z >= bounds.minZ && cell.z <= bounds.maxZ;
const exactSet = (cells) => {
  const exact = uniqueCells(cells);
  return { cellCount: exact.length, bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact) };
};
const census = (records, selector) => Object.fromEntries([...records.reduce((counts, record) => {
  const state = selector(record);
  counts.set(state, (counts.get(state) ?? 0) + 1);
  return counts;
}, new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
const FACE = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

const design = readJson(DESIGN);
const contract = readJson(CONTRACT);
const authorization = readJson(AUTHORIZATION);
const protectedRelics = readJson(PROTECTED_RELICS);
const intake = readJson(INTAKE);
const sourceLedger = readJson(SOURCE_LEDGER);
const sourceQa = readJson(SOURCE_QA);
const r08alManifest = readJson(R08AL_MANIFEST);
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && absolute(intake.input?.suppliedWorldRoot) === absolute(SNAPSHOT),
'source intake is not the accepted R08AL complete save');
invariant(sourceLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && absolute(sourceLedger.postSnapshot?.root) === absolute(SNAPSHOT)
  && sourceLedger.postSnapshot.completeSaveSha256 === intake.packageIdentity.completeSaveSha256,
'source ledger is not the accepted R08AL terminal post');
invariant(sourceQa.status === 'PASS_PUBLIC_VACANT_RETAIL_AND_RESTRICTED_BOH_COMMISSIONED'
  && sourceQa.completedReleaseIdentitySha256 === sourceLedger.completedReleaseIdentitySha256
  && sourceQa.postSnapshot.completeSaveSha256 === sourceLedger.postSnapshot.completeSaveSha256,
'R08AL independent post QA is not accepted');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID),
'standing authorization does not cover R08');
invariant(contract.releaseSequence.some(({ id }) => id === RELEASE_NODE_ID), 'R08 release contract node missing');

const desired = new Map();
const meta = new Map();
const setTarget = (cell, toState, packageKey, role) => {
  const key = cellKey(cell);
  desired.set(key, { cell, toState });
  meta.set(key, { packageKey, role });
};

// Dry lower shell: large enough for an honest 100-seat theatre plus a bounded
// four-suite private-club wing, while remaining west of fire/service ownership.
const ANNEX = { minX: 1700, maxX: 1789, minY: 24, maxY: 35, minZ: 185, maxZ: 224 };
for (const cell of cellsIn({ ...ANNEX, minY: 24, maxY: 24 })) setTarget(cell, 'minecraft:polished_deepslate', 'annex-envelope', 'annex-floor');
for (const cell of cellsIn({ ...ANNEX, minY: 35, maxY: 35 })) setTarget(cell, 'minecraft:smooth_stone', 'annex-envelope', 'annex-ceiling');
for (const cell of cellsIn({ minX: 1700, maxX: 1789, minY: 25, maxY: 34, minZ: 185, maxZ: 185 })) setTarget(cell, 'minecraft:light_gray_concrete', 'annex-envelope', 'annex-north-wall');
for (const cell of cellsIn({ minX: 1700, maxX: 1789, minY: 25, maxY: 34, minZ: 224, maxZ: 224 })) setTarget(cell, 'minecraft:light_gray_concrete', 'annex-envelope', 'annex-south-wall');
for (const x of [1700, 1789]) for (const cell of cellsIn({ minX: x, maxX: x, minY: 25, maxY: 34, minZ: 186, maxZ: 223 })) setTarget(cell, 'minecraft:light_gray_concrete', 'annex-envelope', 'annex-end-wall');
for (const cell of cellsIn({ minX: 1701, maxX: 1788, minY: 25, maxY: 34, minZ: 186, maxZ: 223 })) setTarget(cell, 'minecraft:air', 'annex-clearance', 'annex-interior-clearance');

// Seven-wide, 25-block descent from the accepted R08AL rear service hall.
const staircaseSteps = [];
for (let index = 0; index <= 25; index += 1) {
  const y = 49 - index;
  const z = 160 + index;
  for (let x = 1740; x <= 1746; x += 1) {
    const cell = { x, y, z };
    staircaseSteps.push(cell);
    setTarget(cell,
      'minecraft:polished_andesite_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]',
      'stair-envelope', 'grand-stair-step');
    for (let height = 1; height <= 5; height += 1) setTarget({ x, y: y + height, z }, 'minecraft:air', 'stair-clearance', 'grand-stair-headroom');
    setTarget({ x, y: y + 6, z }, 'minecraft:smooth_stone', 'stair-envelope', 'grand-stair-ceiling');
  }
  for (const x of [1739, 1747]) for (let wallY = y; wallY <= y + 6; wallY += 1) {
    setTarget({ x, y: wallY, z }, 'minecraft:polished_deepslate', 'stair-envelope', 'grand-stair-containment');
  }
  if (index % 5 === 2) {
    for (const x of [1739, 1747]) setTarget({ x, y: y + 3, z }, 'minecraft:sea_lantern', 'theatre-fixtures', 'grand-stair-light');
  }
}
// Two secured doors and warning stripes through only the exact R08AL rear wall.
for (const x of [1742, 1743]) {
  setTarget({ x, y: 50, z: 159 }, 'minecraft:iron_door[facing=south,half=lower,hinge=left,open=false,powered=false]', 'club-fixtures', 'restricted-annex-door-lower');
  setTarget({ x, y: 51, z: 159 }, 'minecraft:iron_door[facing=south,half=upper,hinge=left,open=false,powered=false]', 'club-fixtures', 'restricted-annex-door-upper');
}
for (const x of [1741, 1744]) for (const y of [50, 51]) setTarget({ x, y, z: 159 }, 'minecraft:red_terracotta', 'stair-envelope', 'restricted-annex-warning-stripe');
// Grand lower landing opens through the north shell wall.
for (let x = 1740; x <= 1746; x += 1) for (let y = 25; y <= 30; y += 1) setTarget({ x, y, z: 185 }, 'minecraft:air', 'stair-clearance', 'grand-stair-lower-landing');

// Theatre/private-club division. The only cross-boundary door is adjacent to
// the completed stage and opens into the neat restricted suite corridor.
for (const cell of cellsIn({ minX: 1756, maxX: 1756, minY: 25, maxY: 34, minZ: 186, maxZ: 223 })) setTarget(cell, 'minecraft:polished_deepslate', 'annex-envelope', 'theatre-club-boundary');
for (const y of [25, 26]) setTarget({ x: 1756, y, z: 216 },
  `minecraft:iron_door[facing=east,half=${y === 25 ? 'lower' : 'upper'},hinge=left,open=false,powered=false]`,
  'club-fixtures', `rear-stage-door-${y === 25 ? 'lower' : 'upper'}`);
for (const z of [214, 218]) for (const y of [25, 26, 27]) setTarget({ x: 1756, y, z }, 'minecraft:red_terracotta', 'annex-envelope', 'rear-stage-restricted-marker');

// Raised, finished stage with a noninteractive king-size bed-shaped wool
// centerpiece. This is intentionally non-explicit and introduces no entity or
// block entity.
for (const cell of cellsIn({ minX: 1747, maxX: 1754, minY: 25, maxY: 25, minZ: 188, maxZ: 221 })) setTarget(cell, 'minecraft:polished_andesite', 'annex-envelope', 'theatre-stage');
for (const cell of cellsIn({ minX: 1755, maxX: 1755, minY: 26, maxY: 33, minZ: 189, maxZ: 220 })) setTarget(cell, 'minecraft:black_concrete', 'annex-envelope', 'theatre-backdrop');
for (const cell of cellsIn({ minX: 1749, maxX: 1753, minY: 26, maxY: 26, minZ: 201, maxZ: 207 })) setTarget(cell, 'minecraft:red_wool', 'theatre-fixtures', 'nonexplicit-bed-centerpiece');
for (const cell of cellsIn({ minX: 1752, maxX: 1753, minY: 27, maxY: 27, minZ: 202, maxZ: 206 })) setTarget(cell, 'minecraft:white_wool', 'theatre-fixtures', 'bed-centerpiece-pillows');
for (const z of [191, 197, 203, 209, 215, 219]) {
  setTarget({ x: 1755, y: 29, z }, 'minecraft:shroomlight', 'theatre-fixtures', 'dramatic-stage-light');
  setTarget({ x: 1754, y: 29, z }, 'minecraft:red_stained_glass', 'theatre-fixtures', 'dramatic-stage-light-filter');
}

// Exactly 100 fixed audience seats: ten longitudinal rows by ten seats, with
// generous spacing and clear aisles between every seat line.
const theatreSeats = [];
for (let row = 0; row < 10; row += 1) for (let seat = 0; seat < 10; seat += 1) {
  const cell = { x: 1705 + row * 4, y: 25, z: 189 + seat * 3 };
  theatreSeats.push(cell);
  setTarget(cell, 'minecraft:crimson_stairs[facing=west,half=bottom,shape=straight,waterlogged=false]', 'theatre-fixtures', 'theatre-audience-seat');
}
const theatreCeilingLights = [];
for (const x of [1707, 1719, 1731, 1743]) for (const z of [190, 200, 210, 220]) {
  const cell = { x, y: 35, z };
  theatreCeilingLights.push(cell);
  setTarget(cell, 'minecraft:sea_lantern', 'theatre-fixtures', 'theatre-ceiling-light');
}

// Private-club corridor and four compact, finished suites.
for (const cell of cellsIn({ minX: 1762, maxX: 1762, minY: 25, maxY: 34, minZ: 186, maxZ: 212 })) setTarget(cell, 'minecraft:polished_deepslate', 'annex-envelope', 'suite-corridor-wall');
for (const cell of cellsIn({ minX: 1775, maxX: 1775, minY: 25, maxY: 34, minZ: 186, maxZ: 212 })) setTarget(cell, 'minecraft:polished_deepslate', 'annex-envelope', 'suite-party-wall');
for (const z of [199, 212]) for (const cell of cellsIn({ minX: 1763, maxX: 1788, minY: 25, maxY: 34, minZ: z, maxZ: z })) setTarget(cell, 'minecraft:polished_deepslate', 'annex-envelope', 'suite-transverse-wall');
const suiteDoorPoints = [
  { x: 1762, z: 191, facing: 'east' }, { x: 1775, z: 191, facing: 'east' },
  { x: 1762, z: 205, facing: 'east' }, { x: 1775, z: 205, facing: 'east' },
];
for (const door of suiteDoorPoints) for (const y of [25, 26]) setTarget({ x: door.x, y, z: door.z },
  `minecraft:crimson_door[facing=${door.facing},half=${y === 25 ? 'lower' : 'upper'},hinge=left,open=false,powered=false]`,
  'club-fixtures', `suite-door-${y === 25 ? 'lower' : 'upper'}`);
const suiteBeds = [
  { minX: 1765, maxX: 1768, minZ: 188, maxZ: 193 },
  { minX: 1779, maxX: 1782, minZ: 188, maxZ: 193 },
  { minX: 1765, maxX: 1768, minZ: 202, maxZ: 207 },
  { minX: 1779, maxX: 1782, minZ: 202, maxZ: 207 },
];
for (const bed of suiteBeds) {
  for (const cell of cellsIn({ ...bed, minY: 25, maxY: 25 })) setTarget(cell, 'minecraft:red_wool', 'club-fixtures', 'suite-bed-platform');
  for (const cell of cellsIn({ minX: bed.maxX - 1, maxX: bed.maxX, minY: 26, maxY: 26, minZ: bed.minZ + 1, maxZ: bed.maxZ - 1 })) setTarget(cell, 'minecraft:white_wool', 'club-fixtures', 'suite-pillow');
  setTarget({ x: bed.minX + 1, y: 34, z: bed.maxZ + 2 }, 'minecraft:shroomlight', 'club-fixtures', 'suite-warm-light');
}
for (const z of [188, 196, 204, 212, 220]) {
  setTarget({ x: 1759, y: 35, z }, 'minecraft:shroomlight', 'club-fixtures', 'restricted-corridor-light');
  setTarget({ x: 1759, y: 34, z }, 'minecraft:red_stained_glass', 'club-fixtures', 'restricted-corridor-light-filter');
}

// Communal party lounge: simulated fireplaces (no fire), non-explicit swing
// seating, billiards table, and a compact cinema corner.
for (const cell of cellsIn({ minX: 1764, maxX: 1768, minY: 25, maxY: 29, minZ: 223, maxZ: 223 })) setTarget(cell, 'minecraft:polished_blackstone_bricks', 'annex-envelope', 'lounge-fireplace-frame');
for (const x of [1765, 1767]) for (const y of [26, 27]) {
  setTarget({ x, y, z: 223 }, 'minecraft:shroomlight', 'club-fixtures', 'simulated-fireplace-light');
  setTarget({ x, y, z: 222 }, 'minecraft:orange_stained_glass', 'club-fixtures', 'simulated-fireplace-screen');
}
const swingSeats = [{ x: 1770, z: 219 }, { x: 1773, z: 219 }];
for (const seat of swingSeats) {
  setTarget({ ...seat, y: 25 }, 'minecraft:crimson_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]', 'club-fixtures', 'nonexplicit-swing-seat');
  for (let y = 26; y <= 34; y += 1) setTarget({ ...seat, y }, 'minecraft:iron_bars[east=false,north=false,south=false,waterlogged=false,west=false]', 'club-fixtures', 'swing-support-bar');
}
for (const cell of cellsIn({ minX: 1776, maxX: 1782, minY: 26, maxY: 26, minZ: 215, maxZ: 219 })) setTarget(cell, 'minecraft:green_wool', 'club-fixtures', 'billiards-table-surface');
for (const x of [1776, 1782]) for (const z of [215, 219]) setTarget({ x, y: 25, z }, 'minecraft:dark_oak_log[axis=y]', 'club-fixtures', 'billiards-table-leg');
for (const z of [214, 215, 216, 217, 218, 219, 220]) for (let y = 27; y <= 31; y += 1) setTarget({ x: 1788, y, z }, 'minecraft:white_concrete', 'club-fixtures', 'cinema-screen');
const cinemaSeats = [];
for (const x of [1784, 1786]) for (const z of [215, 218, 221]) {
  const cell = { x, y: 25, z };
  cinemaSeats.push(cell);
  setTarget(cell, 'minecraft:crimson_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]', 'club-fixtures', 'cinema-seat');
}
for (const x of [1766, 1774, 1782, 1787]) setTarget({ x, y: 35, z: 218 }, 'minecraft:shroomlight', 'club-fixtures', 'party-lounge-light');

const targetCells = [...desired.values()].map(({ cell }) => cell);
const targetKeys = new Set(targetCells.map(cellKey));
const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const records = [];
for (const [key, target] of desired) {
  const sourceState = stateToCommandString(await reader.blockState(target.cell.x, target.cell.y, target.cell.z));
  records.push({ ...target, key, sourceState, ...meta.get(key) });
}
const operations = records.filter(({ sourceState, toState }) => sourceState !== toState);
const alreadyTarget = records.filter(({ sourceState, toState }) => sourceState === toState);
const hazards = operations.filter(({ sourceState }) => isFluid(sourceState) || isForbidden(sourceState));
invariant(hazards.length === 0, `target fluid/container/control sources: ${JSON.stringify(hazards.slice(0, 30))}`);

const haloCells = uniqueCells(targetCells.flatMap((cell) => FACE.map(([dx, dy, dz]) => ({
  x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
})))).filter((cell) => !targetKeys.has(cellKey(cell)));
const haloRecords = [];
for (const cell of haloCells) haloRecords.push({ cell,
  state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
const haloHazards = haloRecords.filter(({ state }) => isFluid(state) || isForbidden(state));
invariant(haloHazards.length === 0, `halo fluid/container/control sources: ${JSON.stringify(haloHazards.slice(0, 30))}`);
const unstableHaloGravity = [];
for (const finding of haloRecords.filter(({ state }) => isGravity(state))) {
  if (blockName(finding.state) === 'minecraft:pointed_dripstone'
    && finding.state.includes('vertical_direction=down')) continue;
  const belowKey = `${finding.cell.x},${finding.cell.y - 1},${finding.cell.z}`;
  const below = desired.get(belowKey)?.toState
    ?? stateToCommandString(await reader.blockState(finding.cell.x, finding.cell.y - 1, finding.cell.z));
  if (AIR.has(blockName(below)) || isFluid(below)) unstableHaloGravity.push({ ...finding, below });
}
invariant(unstableHaloGravity.length === 0,
`retained halo gravity lacks support: ${JSON.stringify(unstableHaloGravity.slice(0, 30))}`);
const changedGravity = operations.filter(({ sourceState }) => isGravity(sourceState));
for (const entry of changedGravity) {
  if (blockName(entry.sourceState) === 'minecraft:pointed_dripstone'
    && entry.sourceState.includes('vertical_direction=down')) continue;
  if (AIR.has(blockName(entry.toState))) invariant(entry.packageKey.includes('clearance'),
    `gravity removal is not top-down clearance at ${entry.key}`);
  else invariant(!isGravity(entry.toState) && !isFluid(entry.toState),
    `gravity replacement is not stable at ${entry.key}`);
}

const future = uniqueCells(design.d06.futureInterfaces.interfaces.flatMap(({ sealDesign }) => cellsIn(sealDesign.bounds)));
const drainage = uniqueCells([
  ...design.d06.lifeSafety.drainage.trackDrainAndSumpReservations.flatMap(({ channel, sumpReservation }) => [
    ...cellsIn(channel.bounds), ...cellsIn(sumpReservation.bounds),
  ]),
  ...cellsIn(design.d06.lifeSafety.drainage.internalDischargeHeader.bounds),
  ...cellsIn(design.d06.lifeSafety.drainage.sealedBoundaryCap.bounds),
]);
const fireSpine = cellsIn(design.d06.lifeSafety.fireAndServiceAccess.internalSpineReservation.bounds);
const northShells = design.d06.concourseAndRetail.retailShells.filter(({ wing }) => wing === 'north galleria')
  .flatMap(({ bounds }) => cellsIn(bounds));
for (const [label, cells] of [['future rail', future], ['drainage', drainage], ['fire/service', fireSpine], ['north retail', northShells]]) {
  invariant(cells.every((cell) => !targetKeys.has(cellKey(cell))), `${label} target intersection`);
}
for (const relic of protectedRelics.relics) invariant(!haloCells.some((cell) => inside(cell, relic.declaredInclusiveBounds)),
  `protected relic halo intersection: ${relic.key}`);

// R08AL's declared target bounds end at z=159. Everything in R08AM is south
// of that plane except these eight exact rear-wall cells. Some of those cells
// were already target in the R08AL source, so operation-file intersection
// alone would under-report the semantic ownership supersession.
const priorOverlap = targetCells.filter((cell) => cell.z <= 159);
const allowedPriorOverlap = new Set([
  ...[1742, 1743].flatMap((x) => [{ x, y: 50, z: 159 }, { x, y: 51, z: 159 }]),
  ...[1741, 1744].flatMap((x) => [{ x, y: 50, z: 159 }, { x, y: 51, z: 159 }]),
].map(cellKey));
invariant(r08alManifest.scope.geometry.targets.bounds.maxZ === 159
  && priorOverlap.length === 8
  && priorOverlap.every((cell) => allowedPriorOverlap.has(cellKey(cell)))
  && priorOverlap.every((cell) => records.find(({ key }) => key === cellKey(cell))?.sourceState === 'minecraft:light_gray_concrete'),
`R08AL supersession is not the exact eight rear-wall cells: ${JSON.stringify(priorOverlap)}`);

const chunks = new Set(haloCells.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
const blockEntities = [];
const savedEntities = [];
const envelope = boundsOf(uniqueCells([...targetCells, ...haloCells]));
for (const chunkKey of chunks) {
  const [cx, cz] = chunkKey.split(',').map(Number);
  const chunk = await reader.chunk(cx, cz);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (targetKeys.has(cellKey(point)) || haloCells.some((cell) => cellKey(cell) === cellKey(point))) blockEntities.push({ id: entity.id ?? null, point });
  }
  const entityChunk = await entityReader.chunk(cx, cz);
  for (const entity of entityChunk?.Entities ?? []) {
    const position = entity.Pos?.slice(0, 3).map(Number);
    if (position?.length === 3 && position[0] >= envelope.minX && position[0] < envelope.maxX + 1
      && position[1] >= envelope.minY && position[1] < envelope.maxY + 1
      && position[2] >= envelope.minZ && position[2] < envelope.maxZ + 1) savedEntities.push({ id: entity.id ?? null, position });
  }
}
invariant(blockEntities.length === 0 && savedEntities.length === 0,
'annex target/halo intersects a block entity or saved movable entity');

const packageOrder = ['annex-envelope', 'stair-envelope', 'annex-clearance', 'stair-clearance', 'theatre-fixtures', 'club-fixtures'];
const groups = new Map(packageOrder.map((key) => [key, []]));
for (const operation of operations) groups.get(operation.packageKey).push(operation);
const isDoor = ({ toState }) => blockName(toState).endsWith('_door');
for (const [key, group] of groups) {
  invariant(group.length > 0, `${key} compiled empty`);
  if (key.includes('clearance')) group.sort((a, b) => b.cell.y - a.cell.y || a.cell.z - b.cell.z || a.cell.x - b.cell.x);
  else if (key.includes('fixtures')) group.sort((a, b) => Number(isDoor(a)) - Number(isDoor(b))
    || a.cell.y - b.cell.y || a.cell.z - b.cell.z || a.cell.x - b.cell.x);
  else group.sort((a, b) => a.cell.y - b.cell.y || a.cell.z - b.cell.z || a.cell.x - b.cell.x);
}

fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
const packages = [];
const operationManifest = {};
for (const key of packageOrder) {
  const group = groups.get(key);
  const forward = path.join(OUT_DIR, `${BASENAME}.${key}.forward.txt`);
  const rollback = path.join(OUT_DIR, `${BASENAME}.${key}.rollback.txt`);
  const header = [`# ${TRANSACTION_ID}/${key}`, `# source ${SNAPSHOT}`, '# exact guarded point transitions; generated offline'];
  const forwardBody = `${group.map(({ cell, sourceState, toState }) => replLine(cell, sourceState, toState)).join('\n')}\n`;
  const rollbackBody = `${[...group].reverse().map(({ cell, sourceState, toState }) => replLine(cell, toState, sourceState)).join('\n')}\n`;
  fs.writeFileSync(absolute(forward), `${header.join('\n')}\n${forwardBody}`);
  fs.writeFileSync(absolute(rollback), `${header.join('\n')}\n${rollbackBody}`);
  packages.push({ key, forward: relative(forward), rollback: relative(rollback) });
  operationManifest[key] = { forwardSha256: sha256(forwardBody), rollbackSha256: sha256(rollbackBody),
    forwardCommandCount: group.length, rollbackCommandCount: group.length,
    targetCoordinateSetSha256: hashCells(group.map(({ cell }) => cell),), exactInverse: true };
}

const sourcePostIdentity = readJson(sourceLedger.postSnapshot.identity.path);
const roles = Object.fromEntries([...new Set(records.map(({ role }) => role))].sort().map((role) => [
  role, exactSet(records.filter((record) => record.role === role).map(({ cell }) => cell)),
]));
const manifestWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  transactionId: TRANSACTION_ID,
  status: 'COMPILED_FROM_ACCEPTED_R08AL_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['Z02-U1-CONCOURSE-MALL'],
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'Z02-U1-CONCOURSE-MALL',
    purpose: 'Complete a dry, reversible, non-public adults-only theatre/private-club annex behind the accepted public-vacant retail BOH without opening any rail, utility, drainage, fire-service, or hazard interface.',
    accessBoundary: {
      public: false,
      restrictedAdultsOnly: true,
      securedR08alRearWallDoorCount: 2,
      exactR08alSupersessionCellCount: priorOverlap.length,
      upperThreshold: { minX: 1740, maxX: 1746, y: 49, z: 160 },
      lowerLanding: { minX: 1740, maxX: 1746, y: 24, z: 185 },
      grandStair: { width: 7, longitudinalStepCount: 26, exactStepBlockCount: staircaseSteps.length,
        verticalDrop: 25, upper: { y: 49, z: 160 }, lower: { y: 24, z: 185 } },
    },
    annex: {
      bounds: ANNEX,
      dryEnclosed: true,
      theatre: { bounds: { minX: 1701, maxX: 1755, minY: 25, maxY: 34, minZ: 186, maxZ: 223 },
        exactAudienceSeatCount: theatreSeats.length, stageBounds: { minX: 1747, maxX: 1755, minY: 25, maxY: 33, minZ: 188, maxZ: 221 },
        stageCeilingLightCount: theatreCeilingLights.length, bedCenterpieceNoninteractive: true },
      privateClub: { bounds: { minX: 1757, maxX: 1788, minY: 25, maxY: 34, minZ: 186, maxZ: 223 },
        restrictedCorridor: { minX: 1757, maxX: 1761, minY: 25, maxY: 34, minZ: 186, maxZ: 223 },
        suiteCount: suiteBeds.length, suiteDoorCount: suiteDoorPoints.length,
        communalLounge: true, simulatedFireplaceCount: 2, nonexplicitSwingSeatCount: swingSeats.length,
        billiardsTableCount: 1, smallCinemaSeatCount: cinemaSeats.length },
    },
    contentBoundary: { consensualAdultsOnlyTheme: true, explicitSexualContent: false,
      anatomyOrSexActDepicted: false, coercionConfinementOrViolenceDepicted: false,
      occupantsNpcsOrEntitiesIntroduced: 0 },
    geometry: { targets: exactSet(targetCells), operatedTargets: exactSet(operations.map(({ cell }) => cell)),
      alreadyTarget: exactSet(alreadyTarget.map(({ cell }) => cell)), interactionHalo: exactSet(haloCells), roles },
    retainedBoundaries: { r08alPublicRetailPreserved: true, r08alRearWallSupersessionCellCount: priorOverlap.length,
      northRetailShellsCapped: true, n06ExceptionUntouched: true, futureRailInterfacesOpened: false,
      drainageOpened: false, fireServiceSpineOpened: false, utilityVentMechanismInterfacesOpened: false,
      activeFireIntroduced: false, railOrPlatformBarrierOpened: false },
  },
  source: {
    snapshotRoot: relative(SNAPSHOT), intakeAudit: fileBinding(INTAKE), postQa: fileBinding(SOURCE_QA),
    predecessor: { transactionId: sourceLedger.transactionId, executionLedger: fileBinding(SOURCE_LEDGER),
      completedReleaseIdentitySha256: sourceLedger.completedReleaseIdentitySha256,
      postCompleteSaveSha256: sourceLedger.postSnapshot.completeSaveSha256,
      postRegionSha256: sourcePostIdentity.sha256 },
    completeSaveSha256: sourceLedger.postSnapshot.completeSaveSha256,
    regionSnapshotSha256: sourcePostIdentity.sha256,
    targetSourceStateCensus: census(records, ({ sourceState }) => sourceState),
  },
  evidenceBindings: { design: fileBinding(DESIGN), contract: fileBinding(CONTRACT),
    authorization: fileBinding(AUTHORIZATION), protectedRelics: fileBinding(PROTECTED_RELICS),
    r08alManifest: fileBinding(R08AL_MANIFEST) },
  isolation: { targetFluidOrWaterloggedCount: 0, interactionHaloFluidCount: 0,
    targetForbiddenBlockCount: 0, interactionHaloForbiddenBlockCount: 0,
    targetGravityCount: changedGravity.length, unstableRetainedHaloGravityCount: unstableHaloGravity.length,
    blockEntityIntersectionCount: blockEntities.length, savedEntityIntersectionCount: savedEntities.length,
    protectedRelicIntersectionCount: 0, futureLineIntersectionCount: 0, drainageIntersectionCount: 0,
    fireServiceSpineIntersectionCount: 0, northRetailIntersectionCount: 0 },
  executionOrder: { forward: packageOrder, rollback: [...packageOrder].reverse(),
    gravity: 'stable solids bottom-up; exact gravity removals top-down; rollback reverse package/order' },
  operations: operationManifest,
  packages,
  hardStops: { requireFreshImmutableSourceImmediatelyBeforeExecution: true, requireExactSourceGuards: true,
    requireLiveEntityClearance: true, requireBlockEntityAndProtectedCoreClearance: true,
    requireStrictNoopForwardAndRollbackParserChecks: true, requireJournaledStrictExecution: true,
    requireFreshPostSnapshotAndRollbackPoststatePreflight: true },
  liveCallsPerformed: false,
  worldEditsPerformed: false,
};
const manifestIdentity = sha256(Buffer.from(`${JSON.stringify(manifestWithoutIdentity, null, 2)}\n`));
const manifest = { ...manifestWithoutIdentity, manifestIdentity };
fs.writeFileSync(absolute(MANIFEST_OUT), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: manifest.status, manifest: relative(MANIFEST_OUT), manifestIdentity,
  targetCount: targetCells.length, operationCount: operations.length, packageCount: packages.length,
  targetGravityCount: changedGravity.length, theatreSeatCount: theatreSeats.length,
  suiteCount: suiteBeds.length, r08alSupersessionCellCount: priorOverlap.length }, null, 2)}\n`);
