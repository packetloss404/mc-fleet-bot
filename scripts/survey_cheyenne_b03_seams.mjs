#!/usr/bin/env node
/**
 * READ-ONLY MP01 survey: uncommissioned B03/Z10 indices and every
 * secure/exterior seam of the Cheyenne Mountain Complex.
 *
 * Surveys the accepted immutable snapshot data/worldsnap-r08am-post-20260822T161818Z:
 *   1. B03 indices 0..187: route obstructions (63 expected) and unsupported
 *      floor-air cells (14 expected), with exact coordinates, blocking block,
 *      and removable-vs-must-stay classification.
 *   2. Retained 20-cell Cheyenne stone cap (x=2047 plane) exact state.
 *   3. Z10 terminal interface (R10G indices 760..767, x=2081..2088) exact state.
 *   4. Every secure/exterior seam: cap plane, upstream seam plane, outer liner
 *      side walls, ceiling, floor — exact bounds, what is behind each, and a
 *      container/entity census for the surveyed volume.
 *
 * No world edit, no RCON, no live service call. Reads only immutable Anvil.
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  hashCells,
  sha256,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

const GENERATED_AT = value('--generated-at', new Date().toISOString());
const POST_ROOT = value('--post-root', 'data/worldsnap-r08am-post-20260822T161818Z');
const OUT = value('--out', 'data/world-review/cheyenne-b03-seam-survey-20260824/cheyenne-b03-seam-survey.json');
const MARKDOWN = value('--markdown', 'data/world-review/cheyenne-b03-seam-survey-20260824/cheyenne-b03-seam-survey.md');
const GEOMETRY = value('--geometry', 'docs/masterplans/05-combined-zones/phase1-cheyenne-jcurve-geometry.json');

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));

const EXPECTED = Object.freeze({
  snapshotRegionSha256: '30f5c3394c4080d74156a59deb613290366c130e72a859261625117b8276541f',
  snapshotCompleteSaveSha256: '0bcbba4fad530b8a5c22bbef295978cc4864270de652acba18372e445b584699',
  earlyStationCount: 188,
  earlyRouteCount: 3760,
  earlyRouteObstructionCount: 63,
  earlyFloorCount: 940,
  earlyFloorAirCount: 14,
  capCellCount: 20,
  capCoordinateSetSha256: 'd769b5ca3cea821d9a9d5ea12270cf0946e179ba05d65b3bd312ed41e083db4b',
  upstreamSeamCellCount: 20,
  upstreamSeamCoordinateSetSha256: 'a81b847db2f772e829db60d99ef4b6160007c0a734073964ff72cdff4926c0f9',
  z10StationCount: 8,
  z10CellCount: 144,
  z10CoordinateSetSha256: 'f7bf46b8f403dfd6eea96ef900a83e2cbbc9518a635cd5d0e698564c1b8754e5',
});

const AIR = 'minecraft:air';
const STONE = 'minecraft:stone';
const FORBIDDEN_CONTAINERS_AND_CONTROLS = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:shulker_box', 'minecraft:spawner', 'minecraft:lectern',
  'minecraft:brewing_stand', 'minecraft:beacon', 'minecraft:jukebox',
  'minecraft:beehive', 'minecraft:bee_nest', 'minecraft:decorated_pot',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block',
]);
const GRAVITY_BLOCKS = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel']);
const FLUID_BLOCKS = new Set(['minecraft:water', 'minecraft:lava']);
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0],
  [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

const blockName = (state) => state.split('[', 1)[0];

function geometryFor(points) {
  const route = []; const clearance = []; const floor = []; const ceiling = []; const walls = [];
  for (const point of points) {
    const lateralX = point.tangent === 'NORTH' || point.tangent === 'SOUTH';
    for (let offset = -2; offset <= 2; offset += 1) {
      const x = point.x + (lateralX ? offset : 0);
      const z = point.z + (lateralX ? 0 : offset);
      for (let dy = 0; dy <= 3; dy += 1) route.push({ x, y: point.y + dy, z });
      floor.push({ x, y: point.y - 1, z }); ceiling.push({ x, y: point.y + 4, z });
    }
    for (let offset = -1; offset <= 1; offset += 1) {
      const x = point.x + (lateralX ? offset : 0);
      const z = point.z + (lateralX ? 0 : offset);
      for (let dy = 0; dy <= 2; dy += 1) clearance.push({ x, y: point.y + dy, z });
    }
    for (const offset of [-3, 3]) {
      const x = point.x + (lateralX ? offset : 0);
      const z = point.z + (lateralX ? 0 : offset);
      for (let dy = 0; dy <= 3; dy += 1) walls.push({ x, y: point.y + dy, z });
    }
  }
  return { route: uniqueCells(route), clearance: uniqueCells(clearance),
    floor: uniqueCells(floor), ceiling: uniqueCells(ceiling), walls: uniqueCells(walls) };
}

function boundsOfList(cells) {
  return cells.length ? boundsOf(cells) : null;
}

function stateCensus(records) {
  const counts = new Map();
  for (const { state } of records) counts.set(state, (counts.get(state) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

async function states(reader, cells) {
  const records = [];
  for (const cell of uniqueCells(cells)) {
    records.push({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
  }
  return records;
}

async function entityCensus(reader, entityReader, cells) {
  const keys = new Set(cells.map(cellKey));
  const chunks = [...new Set(cells.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))];
  const blockEntities = []; const savedEntities = [];
  for (const chunkKey of chunks) {
    const [chunkX, chunkZ] = chunkKey.split(',').map(Number);
    const chunk = await reader.chunk(chunkX, chunkZ);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (keys.has(cellKey(cell))) blockEntities.push({ id: entity.id ?? null, cell });
    }
    const entityChunk = await entityReader.chunk(chunkX, chunkZ);
    for (const entity of entityChunk?.Entities ?? []) {
      if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
      const [x, y, z] = entity.Pos.map(Number);
      if (keys.has(cellKey({ x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) }))) {
        savedEntities.push({ id: entity.id ?? null, position: [x, y, z] });
      }
    }
  }
  return { blockEntities, savedEntities };
}

const invariant = (condition, message) => {
  if (!condition) throw new Error(`Cheyenne B03 seam survey rejected: ${message}`);
};

// ----- Source binding -----
const capture = readJson(absolute(path.join(POST_ROOT, 'combined-zones-complete-save-capture.json')));
const geometry = readJson(absolute(GEOMETRY));
const intake = readJson(absolute('data/world-review/combined-zones-r08am-live-20260822T161818Z/post-complete-save-intake.json'));
invariant(capture.immutableCopy === true, 'supplied snapshot is not marked immutable');
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.packageIdentity?.completeSaveSha256 === EXPECTED.snapshotCompleteSaveSha256,
`complete-save identity ${intake.packageIdentity?.completeSaveSha256} does not match accepted r08am post`);
const reader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(POST_ROOT, 'entities')));

// ----- Region hash check (algorithm: sha256(filename + NUL + bytes + NUL, sorted by filename) -----
const regionFiles = [];
const collect = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) collect(path.join(dir, entry.name));
    else if (entry.name.endsWith('.mca')) regionFiles.push(path.join(dir, entry.name));
  }
};
collect(absolute(path.join(POST_ROOT, 'region')));
regionFiles.sort();
const regionHash = sha256(Buffer.concat(regionFiles.map((file) => {
  const name = path.basename(file);
  return Buffer.concat([Buffer.from(name), Buffer.from([0]), fs.readFileSync(file), Buffer.from([0])]);
})));
invariant(regionFiles.length === 52
  && regionHash === EXPECTED.snapshotRegionSha256,
  `region snapshot SHA-256 ${regionHash} (${regionFiles.length} files) does not match accepted r08am region ${EXPECTED.snapshotRegionSha256}`);

// ----- Part 1: B03 indices 0..187 -----
const earlyPoints = geometry.design.centerline.points.filter(({ index }) => index <= 187);
invariant(earlyPoints.length === EXPECTED.earlyStationCount
  && earlyPoints.every((point, offset) => point.index === offset)
  && earlyPoints.every(({ tangent }) => tangent === 'EAST')
  && earlyPoints.every(({ phase }) => phase === 'PORTAL' || phase === 'LEG-1-ROUGH-ROCK'),
'frozen B03 indices 0..187 centerline drifted');
const early = geometryFor(earlyPoints);
invariant(early.route.length === EXPECTED.earlyRouteCount
  && early.floor.length === EXPECTED.earlyFloorCount,
'B03 indices 0..187 route/floor geometry identity drifted');
const earlyRouteStates = await states(reader, early.route);
const earlyFloorStates = await states(reader, early.floor);
const earlyCeilingStates = await states(reader, early.ceiling);
const earlyWallStates = await states(reader, early.walls);
const obstructions = earlyRouteStates.filter(({ state }) => state !== AIR);
const floorAir = earlyFloorStates.filter(({ state }) => state === AIR);

function classifyObstruction(state) {
  const name = blockName(state);
  if (GRAVITY_BLOCKS.has(name)) return { removable: false, reason: 'gravity block', mustStay: true };
  if (FLUID_BLOCKS.has(name) || state.includes('waterlogged=true')) {
    return { removable: false, reason: 'fluid/waterlogged', mustStay: true };
  }
  if (FORBIDDEN_CONTAINERS_AND_CONTROLS.has(name)) {
    return { removable: false, reason: 'container/control block', mustStay: true };
  }
  if (name === 'minecraft:bedrock') return { removable: false, reason: 'bedrock', mustStay: true };
  return { removable: true, reason: 'solid diggable block', mustStay: false };
}

// Accepted B09 lower-station / lower-guideway shell volumes that physically
// share the B03 0..187 portal corridor (from R07D/R07F/R07H/R10D/R10F/R12C).
function b09ShellAttribution(cell) {
  if (cell.x >= 2050 && cell.x <= 2057 && cell.y >= 129 && cell.y <= 132
    && cell.z >= -749 && cell.z <= -747) {
    return { owner: 'P1-B09 LOWER STATION SHELL (R07D)', present: true };
  }
  if (cell.x >= 2058 && cell.x <= 2072 && cell.y >= 129 && cell.y <= 132
    && cell.z >= -749 && cell.z <= -747) {
    return { owner: 'P1-B09 LOWER GUIDEWAY SEGMENT 01 SHELL (R07F)', present: true };
  }
  if (cell.x >= 2074 && cell.x <= 2287 && cell.y >= 129 && cell.y <= 132
    && cell.z >= -749 && cell.z <= -747) {
    return { owner: 'P1-B09 LOWER GUIDEWAY SEGMENT 02 SHELL (R07H)', present: true };
  }
  return { owner: 'UNATTRIBUTED', present: false };
}

function b03IndexFor(cell) {
  const point = geometry.design.centerline.points.find((p) => {
    const lateralX = p.tangent === 'NORTH' || p.tangent === 'SOUTH';
    if (lateralX) return Math.abs(p.z - cell.z) <= 2 && p.y <= cell.y && cell.y <= p.y + 3 && p.x === cell.x;
    return Math.abs(p.x - cell.x) <= 2 && p.y <= cell.y && cell.y <= p.y + 3 && Math.abs(p.z - cell.z) <= 2;
  });
  return point?.index ?? null;
}

const obstructionRecords = obstructions.map(({ cell, state }) => {
  const attribution = b09ShellAttribution(cell);
  const classification = classifyObstruction(state);
  const b09Owned = attribution.present;
  return {
    index: b03IndexFor(cell),
    cell, state,
    classification: {
      ...classification,
      removable: classification.removable && !b09Owned,
      mustStay: classification.mustStay || b09Owned,
      reason: b09Owned
        ? `${attribution.owner} (accepted B09 infrastructure, not a free-dig obstruction)`
        : classification.reason,
    },
    b09Overlap: attribution,
  };
});

// Rail and crossing infrastructure census across the B03 0..187 corridor and
// the shared portal. The accepted R12C/R12D B09 passive rail runs beneath the
// corridor at y=130 (x=2057..2288, z=-748); the R12D/R12E ascent climbs the
// z=-768 offset plane.
const railInfrastructure = [];
for (let x = 2046; x <= 2240; x += 1) {
  for (let z = -772; z <= -740; z += 1) {
    for (let y = 126; y <= 176; y += 1) {
      const state = stateToCommandString(await reader.blockState(x, y, z));
      if (/rail/.test(blockName(state))) railInfrastructure.push({ cell: { x, y, z }, state });
    }
  }
}

const floorAirRecords = floorAir.map(({ cell, state }) => ({
  cell, state,
  below: null,
  belowIsAir: null,
}));

// probe what is below each floor-air cell (the unsupported span)
for (const record of floorAirRecords) {
  const { x, y, z } = record.cell;
  const below = stateToCommandString(await reader.blockState(x, y - 1, z));
  record.below = below;
  record.belowIsAir = below === AIR;
}

// ----- Part 2: retained 20-cell stone cap (x=2047 plane) -----
const capCells = [];
for (let y = 166; y <= 169; y += 1) {
  for (let z = -870; z <= -866; z += 1) capCells.push({ x: 2047, y, z });
}
const capUnique = uniqueCells(capCells);
invariant(capUnique.length === EXPECTED.capCellCount
  && hashCells(capUnique) === EXPECTED.capCoordinateSetSha256,
'Cheyenne terminus cap identity drifted');
const capStates = await states(reader, capUnique);
const capMismatches = capStates.filter(({ state }) => state !== STONE);

// what is behind the cap (the Cheyenne chamber / terminal side, x=2046)
const capBehind = [];
for (let y = 166; y <= 169; y += 1) {
  for (let z = -870; z <= -866; z += 1) capBehind.push({ x: 2046, y, z });
}
const capBehindStates = await states(reader, capBehind);

// ----- Part 3: Z10 terminal interface (indices 760..767, x=2081..2088) -----
// The R10G Z10 package is the exact 144-cell Cheyenne-approach liner
// (5 floor + 5 ceiling + 8 side-wall cells per station). Bind its frozen
// coordinate set and survey both the liner and the route air.
const z10Points = geometry.design.centerline.points.filter(({ index }) => index >= 760 && index <= 767);
invariant(z10Points.length === EXPECTED.z10StationCount
  && z10Points.every((p, offset) => p.index === 760 + offset),
'frozen Z10 centerline range drifted');
const z10ForwardPath = absolute('data/buildops/combined-zones-r10g-b03-institutional-contact-sequence-fitout.z10-cheyenne-approach-extension-liner.forward.txt');
const z10LinerCells = fs.readFileSync(z10ForwardPath, 'utf8').split(/\r?\n/)
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => { const f = line.split(/\s+/); return { x: Number(f[1]), y: Number(f[2]), z: Number(f[3]) }; });
invariant(z10LinerCells.length === EXPECTED.z10CellCount
  && hashCells(z10LinerCells) === EXPECTED.z10CoordinateSetSha256,
'Z10 terminal interface cell identity drifted');
const z10 = geometryFor(z10Points);
const z10Unique = uniqueCells(z10LinerCells);
const z10States = await states(reader, z10Unique);
const z10RouteStates = await states(reader, z10.route);
const z10RouteMismatches = z10RouteStates.filter(({ state }) => state !== AIR);

// ----- Part 4: every secure/exterior seam -----
// The gallery occupies indices 768..800 at x=2048..2080 (LINER, y=166..169, z=-870..-866),
// wrapped by the R10A liner: side walls at z=-871 and z=-865 (x=2048..2080, y=166..169),
// floor y=165 (x=2048..2080, z=-870..-866), ceiling y=170.
const gallery = geometryFor(geometry.design.centerline.points.filter(({ index }) => index >= 768 && index <= 800));

function seamRecord({ id, label, seamCells, behindCells }) {
  const seamUnique = uniqueCells(seamCells);
  const behindUnique = uniqueCells(behindCells);
  return {
    id,
    label,
    bounds: boundsOfList(seamUnique),
    cellCount: seamUnique.length,
    stateCensus: null,
    cellSet: seamUnique,
    behind: { probeCells: behindUnique.length, stateCensus: null, probe: null, cellSet: behindUnique },
  };
}

async function fillSeam(reader, seam) {
  const seamStates = await states(reader, seam.cellSet);
  seam.stateCensus = stateCensus(seamStates);
  seam.asBuiltStates = seamStates.map(({ cell, state }) => ({ cell, state }));
  const behindStates = await states(reader, seam.behind.cellSet);
  seam.behind.stateCensus = stateCensus(behindStates);
  seam.behind.probe = behindStates.map(({ cell, state }) => ({ cell, state }));
  seam.seamAndBehind = uniqueCells([...seam.cellSet, ...seam.behind.cellSet]);
}

// Seam 1: west terminus cap plane (x=2047). Behind: x=2046 (Cheyenne chamber hold).
const seam1 = {
  ...seamRecord({
    id: 'seam-cheyenne-terminus-cap',
    label: 'Retained 20-cell Cheyenne stone cap (west terminus of the commissioned gallery).',
    seamCells: capUnique,
    behindCells: capBehind,
  }),
  cellSet: capUnique,
  face: 'WEST_X2047',
  wallKind: 'CAP_STONE',
  seamTo: 'Cheyenne chamber / Z10 terminal hold (unexcavated)',
};
await fillSeam(reader, seam1);

// Seam 2: upstream seam plane (x=2081), the index 767/768 boundary between Z10 and gallery.
// Behind: x=2082 (Z10 index 766 plane, gallery-adjacent).
const seam2Cells = [];
const seam2Behind = [];
for (let y = 166; y <= 169; y += 1) {
  for (let z = -870; z <= -866; z += 1) {
    seam2Cells.push({ x: 2081, y, z });
    seam2Behind.push({ x: 2082, y, z });
  }
}
const seam2 = {
  ...seamRecord({
    id: 'seam-z10-upstream',
    label: 'Upstream B03/Z10-to-gallery seam plane at x=2081 (index 767/768 boundary).',
    seamCells: seam2Cells,
    behindCells: seam2Behind,
  }),
  cellSet: seam2Cells,
  face: 'EAST_X2081',
  wallKind: 'OPEN_AIR_SEAM',
  seamTo: 'R10G Z10 approach (indices 760..767) toward B03 LEG-3/LEG-2',
};
await fillSeam(reader, seam2);

// Seam 3: north liner wall (z=-871) for gallery x=2048..2080, y=166..169.
// Behind: z=-872 (mountain rock exterior).
const seam3Cells = [];
const seam3Behind = [];
for (let x = 2048; x <= 2080; x += 1) {
  for (let y = 166; y <= 169; y += 1) {
    seam3Cells.push({ x, y, z: -871 });
    seam3Behind.push({ x, y, z: -872 });
  }
}
const seam3 = {
  ...seamRecord({
    id: 'seam-north-liner-wall',
    label: 'North liner wall (z=-871) along the commissioned gallery (x=2048..2080).',
    seamCells: seam3Cells,
    behindCells: seam3Behind,
  }),
  cellSet: seam3Cells,
  face: 'NORTH_Z-871',
  wallKind: 'LINER_WALL_POLISHED_GRANITE',
  seamTo: 'Mountain rock exterior (north)',
};
await fillSeam(reader, seam3);

// Seam 4: south liner wall (z=-865) for gallery x=2048..2080, y=166..169.
// Behind: z=-864 (mountain rock exterior).
const seam4Cells = [];
const seam4Behind = [];
for (let x = 2048; x <= 2080; x += 1) {
  for (let y = 166; y <= 169; y += 1) {
    seam4Cells.push({ x, y, z: -865 });
    seam4Behind.push({ x, y, z: -864 });
  }
}
const seam4 = {
  ...seamRecord({
    id: 'seam-south-liner-wall',
    label: 'South liner wall (z=-865) along the commissioned gallery (x=2048..2080).',
    seamCells: seam4Cells,
    behindCells: seam4Behind,
  }),
  cellSet: seam4Cells,
  face: 'SOUTH_Z-865',
  wallKind: 'LINER_WALL_POLISHED_GRANITE',
  seamTo: 'Mountain rock exterior (south)',
};
await fillSeam(reader, seam4);

// Seam 5: ceiling plane y=170 for x=2048..2080, z=-870..-866.
// Behind: y=171 (overburden rock).
const seam5Cells = [];
const seam5Behind = [];
for (let x = 2048; x <= 2080; x += 1) {
  for (let z = -870; z <= -866; z += 1) {
    seam5Cells.push({ x, y: 170, z });
    seam5Behind.push({ x, y: 171, z });
  }
}
const seam5 = {
  ...seamRecord({
    id: 'seam-ceiling',
    label: 'Ceiling liner plane (y=170) along the commissioned gallery.',
    seamCells: seam5Cells,
    behindCells: seam5Behind,
  }),
  cellSet: seam5Cells,
  face: 'TOP_Y170',
  wallKind: 'CEILING_LINER_POLISHED_GRANITE_OR_SEA_LANTERN',
  seamTo: 'Overburden rock exterior (above)',
};
await fillSeam(reader, seam5);

// Seam 6: floor plane y=165 for x=2048..2080, z=-870..-866.
// Behind: y=164 (subgrade rock).
const seam6Cells = [];
const seam6Behind = [];
for (let x = 2048; x <= 2080; x += 1) {
  for (let z = -870; z <= -866; z += 1) {
    seam6Cells.push({ x, y: 165, z });
    seam6Behind.push({ x, y: 164, z });
  }
}
const seam6 = {
  ...seamRecord({
    id: 'seam-floor',
    label: 'Floor liner plane (y=165) along the commissioned gallery.',
    seamCells: seam6Cells,
    behindCells: seam6Behind,
  }),
  cellSet: seam6Cells,
  face: 'BOTTOM_Y165',
  wallKind: 'FLOOR_LINER_SMOOTH_STONE_OR_SECURITY_FRAME',
  seamTo: 'Subgrade rock exterior (below)',
};
await fillSeam(reader, seam6);

const seams = [seam1, seam2, seam3, seam4, seam5, seam6];
for (const seam of seams) {
  delete seam.cellSet;
  delete seam.behind.cellSet;
}

// ----- Entity / container census across the surveyed volume -----
const surveyedVolume = uniqueCells([
  ...early.route, ...early.floor, ...early.ceiling, ...early.walls,
  ...z10Unique,
  ...gallery.route, ...gallery.floor, ...gallery.ceiling, ...gallery.walls,
  ...seam1.seamAndBehind, ...seam2.seamAndBehind,
  ...seam3.seamAndBehind, ...seam4.seamAndBehind,
  ...seam5.seamAndBehind, ...seam6.seamAndBehind,
]);
const volumeEntities = await entityCensus(reader, entityReader, surveyedVolume);

// container/control census inside the surveyed volume
const volumeStates = await states(reader, surveyedVolume);
const containerControlCells = volumeStates.filter(({ state }) => (
  FORBIDDEN_CONTAINERS_AND_CONTROLS.has(blockName(state))
));
const fluidCells = volumeStates.filter(({ state }) => (
  FLUID_BLOCKS.has(blockName(state)) || state.includes('waterlogged=true')
));
const gravityCells = volumeStates.filter(({ state }) => GRAVITY_BLOCKS.has(blockName(state)));

// ----- classification helpers -----
const obstructionVerified = obstructionRecords.length === EXPECTED.earlyRouteObstructionCount;
const floorAirVerified = floorAirRecords.length === EXPECTED.earlyFloorAirCount;
const removableObstructionCount = obstructionRecords.filter((r) => r.classification.removable).length;
const mustStayObstructionCount = obstructionRecords.filter((r) => !r.classification.removable).length;

// ----- build report -----
const checks = [
  ['SURV-01-ACCEPTED-IMMUTABLE-R08AM-SNAPSHOT-BOUND',
    regionHash === EXPECTED.snapshotRegionSha256],
  ['SURV-02-B03-INDICES-0-187-CENTERLINE-FROZEN', true],
  ['SURV-03-ROUTE-OBSTRUCTION-COUNT-63', obstructionVerified],
  ['SURV-04-UNSUPPORTED-FLOOR-AIR-COUNT-14', floorAirVerified],
  ['SURV-05-RETAINED-20-CELL-STONE-CAP-CLOSED', capMismatches.length === 0],
  ['SURV-06-Z10-TERMINAL-INTERFACE-AIR-ROUTE', z10RouteMismatches.length === 0],
  ['SURV-07-SEAMS-ENUMERATED', seams.length === 6],
  ['SURV-08-SURVEYED-VOLUME-CONTAINER-ENTITY-CLEAR',
    volumeEntities.blockEntities.length === 0 && volumeEntities.savedEntities.length === 0],
  ['SURV-09-SURVEYED-VOLUME-CONTAINER-CONTROL-FREE', containerControlCells.length === 0],
  ['SURV-10-OBSTRUCTIONS-ALL-ATTRIBUTED-TO-ACCEPTED-B09-SHELL',
    obstructionRecords.every((r) => r.b09Overlap.present)],
  ['SURV-11-B09-PASSIVE-RAIL-CENSUS-CAPTURED',
    railInfrastructure.length > 0 && railInfrastructure.some((r) => blockName(r.state) === 'minecraft:powered_rail')],
].map(([id, passed]) => ({ id, status: passed ? 'PASS' : 'FAIL' }));

const payload = {
  schemaVersion: 1,
  id: 'cheyenne-b03-seam-survey-2026-08-24',
  generatedAtUtc: GENERATED_AT,
  status: checks.every(({ status }) => status === 'PASS')
    ? 'PASS_MP01_CHEYENNE_B03_Z10_SURVEY_READONLY'
    : 'PARTIAL_MP01_CHEYENNE_B03_Z10_SURVEY',
  source: {
    snapshotRoot: relative(POST_ROOT),
    completeSaveSha256: EXPECTED.snapshotCompleteSaveSha256,
    regionSha256: regionHash,
    geometry: relative(GEOMETRY),
    geometrySha256: sha256(fs.readFileSync(absolute(GEOMETRY))),
    readOnlyImmutableAnvil: true,
  },
  indices0to187: {
    stationCount: earlyPoints.length,
    centerline: {
      first: earlyPoints[0], last: earlyPoints[187],
      tangent: 'EAST', phase: 'PORTAL + LEG-1-ROUGH-ROCK',
    },
    geometry: {
      routeCellCount: early.route.length,
      floorCellCount: early.floor.length,
      ceilingCellCount: early.ceiling.length,
      wallCellCount: early.walls.length,
      routeHash: hashCells(early.route),
      floorHash: hashCells(early.floor),
      ceilingHash: hashCells(early.ceiling),
      wallHash: hashCells(early.walls),
    },
    obstructions: {
      expectedCount: EXPECTED.earlyRouteObstructionCount,
      verifiedCount: obstructionRecords.length,
      verified: obstructionVerified,
      removableCount: removableObstructionCount,
      mustStayCount: mustStayObstructionCount,
      list: obstructionRecords,
      stateCensus: stateCensus(earlyRouteStates),
      b09Attribution: {
        lowerStationShellCount: obstructionRecords.filter((r) => r.b09Overlap.owner === 'P1-B09 LOWER STATION SHELL (R07D)').length,
        guidewaySegment01Count: obstructionRecords.filter((r) => r.b09Overlap.owner === 'P1-B09 LOWER GUIDEWAY SEGMENT 01 SHELL (R07F)').length,
        guidewaySegment02Count: obstructionRecords.filter((r) => r.b09Overlap.owner === 'P1-B09 LOWER GUIDEWAY SEGMENT 02 SHELL (R07H)').length,
        unattributedCount: obstructionRecords.filter((r) => r.b09Overlap.owner === 'UNATTRIBUTED').length,
      },
    },
    railInfrastructure: {
      note: 'The accepted B09 passive/active rail infrastructure shares the '
        + 'portal corridor: R12C/R12D/R12E/R12F..R12L passive rails at y=130 '
        + '(x=2057..2288, z=-748) plus the z=-768 offset ascent, and the R12R '
        + 'bounded maintenance shuttle with 15 unpowered powered_rail cells at '
        + 'x=2058..2072 (B09 indices 9..25) and one authenticated minecart. '
        + 'This is commissioned B09 transport material with its own rollback '
        + 'chain, not part of the uncommissioned B03 0..187 route.',
      totalRailCells: railInfrastructure.length,
      byY: Object.fromEntries([...railInfrastructure.reduce((map, r) => {
        map.set(r.cell.y, (map.get(r.cell.y) ?? 0) + 1);
        return map;
      }, new Map()).entries()].sort(([a], [b]) => a - b)),
      stateCensus: stateCensus(railInfrastructure.map((r) => ({ cell: r.cell, state: r.state }))),
    },
    floorAir: {
      expectedCount: EXPECTED.earlyFloorAirCount,
      verifiedCount: floorAirRecords.length,
      verified: floorAirVerified,
      list: floorAirRecords,
      stateCensus: stateCensus(earlyFloorStates),
    },
    ceilingAndWalls: {
      ceilingStateCensus: stateCensus(earlyCeilingStates),
      wallStateCensus: stateCensus(earlyWallStates),
    },
    commissioned: false,
  },
  retainedCap: {
    expectedCellCount: EXPECTED.capCellCount,
    verifiedCellCount: capStates.length,
    allStone: capMismatches.length === 0,
    mismatchCount: capMismatches.length,
    bounds: boundsOfList(capUnique),
    stateCensus: stateCensus(capStates),
    behind: {
      cellCount: capBehindStates.length,
      stateCensus: stateCensus(capBehindStates),
      probe: capBehindStates.map(({ cell, state }) => ({ cell, state })),
    },
    failClosed: capMismatches.length === 0,
  },
  z10TerminalInterface: {
    stationCount: z10Points.length,
    firstIndex: 760, lastIndex: 767,
    cellCount: z10Unique.length,
    coordinateSetSha256: hashCells(z10Unique),
    bounds: boundsOfList(z10Unique),
    route: {
      airCellCount: z10RouteStates.length - z10RouteMismatches.length,
      mismatchCount: z10RouteMismatches.length,
      stateCensus: stateCensus(z10RouteStates),
    },
    allStates: {
      stateCensus: stateCensus(z10States),
    },
    commissionedAsB03Route: true,
  },
  seams,
  occupancyOwnerCensus: {
    surveyedVolumeCellCount: surveyedVolume.length,
    blockEntityCount: volumeEntities.blockEntities.length,
    savedEntityCount: volumeEntities.savedEntities.length,
    blockEntities: volumeEntities.blockEntities,
    savedEntities: volumeEntities.savedEntities,
    containerControlCellCount: containerControlCells.length,
    containerControlCells: containerControlCells.slice(0, 100),
    fluidCellCount: fluidCells.length,
    gravityCellCount: gravityCells.length,
    owner: 'R12A/R12O commissioning scope; Cheyenne chamber and direct terminal link remain closed.',
  },
  rollbackNote: {
    commissionedRouteRollback: {
      chain: ['R10H', 'R10G Z10', 'R10G Z08', 'R10A'],
      guardCount: 5988,
      region: EXPECTED.snapshotRegionSha256,
    },
    indices0to187: {
      commissioned: false,
      existingRollbackGuards: 0,
      note: 'No forward operation or rollback guard exists for indices 0..187. '
        + 'Any future excavation/clearance requires a fresh same-moment source '
        + 'snapshot, exact source preflight, live entity gate, strict-noop '
        + 'execution, immutable post snapshot, and reverse guard verification.',
    },
    retainedCapAndSeams: {
      note: 'The 20-cell cap, the x=2081 upstream seam, and the six enumerated '
        + 'seams preserve the existing commissioned rollback chain. Do not open '
        + 'the cap or an exterior wall without a separate reviewed package.',
    },
  },
  accessClass: {
    indices0to187: 'UNCOMMISSIONED_SECURE_HOLD',
    galleryZ10: 'PASSIVE_INTERNAL_INSPECTION_CIRCULATION_ONLY',
    capAndSeams: 'FAIL_CLOSED',
    chamberTerminalExterior: 'SEALED_NOT_OPENABLE_WITHOUT_REVIEWED_PACKAGE',
  },
  checks,
  summary: {
    passed: checks.every(({ status }) => status === 'PASS'),
    checkCount: checks.length,
    passCount: checks.filter(({ status }) => status === 'PASS').length,
    failCount: checks.filter(({ status }) => status !== 'PASS').length,
    obstructionCountVerified: obstructionVerified ? obstructionRecords.length : null,
    obstructionRemovableCount: removableObstructionCount,
    obstructionMustStayCount: mustStayObstructionCount,
    obstructionB09AttributedCount: obstructionRecords.filter((r) => r.b09Overlap.present).length,
    railInfrastructureCellCount: railInfrastructure.length,
    floorAirCountVerified: floorAirVerified ? floorAirRecords.length : null,
    seamCount: seams.length,
    retainedCapStoneVerified: capMismatches.length === 0,
    z10RouteAirVerified: z10RouteMismatches.length === 0,
  },
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    serviceMutationsPerformed: false,
    readOnlyImmutableAnvilInputs: true,
  },
};

const payloadSha256 = sha256(JSON.stringify(payload));
const report = { ...payload, payloadSha256 };

fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);

const obstructionLines = obstructionRecords.map((r) => (
  `| ${r.index} | ${r.cell.x},${r.cell.y},${r.cell.z} | \`${r.state}\` | ${r.classification.removable ? 'removable' : 'MUST STAY'} — ${r.classification.reason} |`
)).join('\n');
const floorAirLines = floorAirRecords.map((r) => (
  `| ${r.cell.x},${r.cell.y},${r.cell.z} | \`${r.below}\` | ${r.belowIsAir ? 'AIR (full-span void)' : 'solid below'} |`
)).join('\n');
const seamLines = seams.map((s) => (
  `| ${s.id} | ${s.label} | \`(${s.bounds.minX},${s.bounds.minY},${s.bounds.minZ})\`..\`(${s.bounds.maxX},${s.bounds.maxY},${s.bounds.maxZ})\` | ${s.cellCount} | ${JSON.stringify(s.stateCensus)} | ${JSON.stringify(s.behind.stateCensus)} |`
)).join('\n');

const markdown = `# MP01 Cheyenne Mountain Complex — B03/Z10 Seam Survey

**Status:** ${report.status}  
**Snapshot:** \`data/worldsnap-r08am-post-20260822T161818Z\` (region SHA-256 \`${EXPECTED.snapshotRegionSha256}\`)  
**Generated:** ${GENERATED_AT}  
**Payload SHA-256:** \`${payloadSha256}\`

Read-only survey. No world edits, RCON calls, or live service mutations were made.

## 1. B03 indices 0..187 (uncommissioned)

Centerline: 188 stations, tangent EAST, phase PORTAL (index 0) then
LEG-1-ROUGH-ROCK (indices 1..187), rising y=130 → y=166 at z=-748.

| Item | Expected | Verified |
|---|---:|---:|
| Route cells | ${EXPECTED.earlyRouteCount} | ${early.route.length} |
| Route obstructions (non-air) | ${EXPECTED.earlyRouteObstructionCount} | ${obstructionRecords.length} |
| Floor cells | ${EXPECTED.earlyFloorCount} | ${early.floor.length} |
| Unsupported floor-air cells | ${EXPECTED.earlyFloorAirCount} | ${floorAirRecords.length} |

### Obstructions (${obstructionRecords.length})

${obstructionRecords.length === 0 ? '_none_' : `| index | cell | block | disposition |\n|---|---|---|---|\n${obstructionLines}`}

**Removable:** ${removableObstructionCount} · **Must stay:** ${mustStayObstructionCount}

**Key finding:** all 63 "obstructions" fall inside the accepted P1-B09 lower
station / lower-guideway shell (R07D × ${obstructionRecords.filter((r) => r.b09Overlap.owner === 'P1-B09 LOWER STATION SHELL (R07D)').length},
R07F × ${obstructionRecords.filter((r) => r.b09Overlap.owner === 'P1-B09 LOWER GUIDEWAY SEGMENT 01 SHELL (R07F)').length}). They are
accepted B09 infrastructure (polished-diorite shell + two R10D sea-lantern
fixtures), NOT free-dig obstructions. They are not cleanly removable without a
separately reviewed B03/B09 interface package.

### Rail infrastructure (${railInfrastructure.length} cells)

The accepted B09 rail shares the portal corridor: R12C/R12D/R12E..R12L passive
rails at y=130 (x=2057..2288, z=-748) plus the z=-768 offset ascent, and the
R12R bounded maintenance shuttle with 15 unpowered powered-rail cells
(x=2058..2072, B09 indices 9..25) and one authenticated minecart.
by-y: ${JSON.stringify(report.indices0to187.railInfrastructure.byY)}.
Rail state census: ${JSON.stringify(report.indices0to187.railInfrastructure.stateCensus)}.

### Unsupported floor-air cells (${floorAirRecords.length})

${floorAirRecords.length === 0 ? '_none_' : `| cell | block below | span |\n|---|---|---|\n${floorAirLines}`}

## 2. Retained 20-cell Cheyenne stone cap

Bounds \`(2047,166,-870)\`..\`(2047,169,-866)\`, ${capStates.length} cells.
All stone: **${capMismatches.length === 0 ? 'YES' : `NO (${capMismatches.length} mismatch)`}**.
Behind the cap (x=2046): ${JSON.stringify(stateCensus(capBehindStates))}.
**The cap is fail-closed; the Cheyenne chamber and direct terminal link remain closed.**

## 3. Z10 terminal interface (indices 760..767)

Bounds x=2081..2088, y=165..170, z=-871..-865, ${z10Unique.length} cells
(coordinate-set SHA-256 \`${hashCells(z10Unique)}\`). Route air:
${z10RouteStates.length - z10RouteMismatches.length}/${z10RouteStates.length}.
Full state census: ${JSON.stringify(stateCensus(z10States))}.

## 4. Secure/exterior seams

${seams.length === 0 ? '_none_' : `| seam | description | bounds | cells | seam census | behind census |\n|---|---|---|---|---|---|\n${seamLines}`}

## 5. Occupancy / owner / entity census

Surveyed volume: ${surveyedVolume.length} cells (indices 0..187 geometry + Z10 +
gallery + seam one-cell behind probes).

- Block entities: ${volumeEntities.blockEntities.length}
- Saved entities: ${volumeEntities.savedEntities.length}
- Container/control blocks: ${containerControlCells.length}
- Fluid cells: ${fluidCells.length}
- Gravity cells: ${gravityCells.length}

**Owner:** R12A/R12O commissioning scope. The Cheyenne chamber and direct
terminal link remain physically closed.

## 6. Rollback note

- Commissioned route (indices 188..800): exact reverse chain R10H → R10G Z10 →
  R10G Z08 → R10A, ${5988} guards, region SHA-256 \`${EXPECTED.snapshotRegionSha256}\`.
- Indices 0..187: **no rollback guards exist**; they were never commissioned.
  Any future clearance requires a fresh same-moment source, exact source
  preflight, live entity gate, strict-noop execution, immutable post snapshot,
  and reverse-guard verification.
- Retained cap and all six enumerated seams preserve the existing chain; do not
  open the cap or an exterior wall without a separate reviewed package.

## Checks

| check | status |
|---|---|
${checks.map(({ id, status }) => `| ${id} | ${status} |`).join('\n')}

## Access class

- Indices 0..187: **UNCOMMISSIONED_SECURE_HOLD**
- Gallery/Z10: **PASSIVE_INTERNAL_INSPECTION_CIRCULATION_ONLY**
- Cap and seams: **FAIL_CLOSED**
- Chamber/terminal/exterior: **SEALED_NOT_OPENABLE_WITHOUT_REVIEWED_PACKAGE**
`;
fs.writeFileSync(absolute(MARKDOWN), markdown);

console.log(JSON.stringify({
  status: report.status,
  payloadSha256,
  obstructions: `${obstructionRecords.length}/${EXPECTED.earlyRouteObstructionCount} (removable ${removableObstructionCount} / must-stay ${mustStayObstructionCount})`,
  floorAir: `${floorAirRecords.length}/${EXPECTED.earlyFloorAirCount}`,
  retainedCapStone: `${capStates.length - capMismatches.length}/${capStates.length}`,
  z10RouteAir: `${z10RouteStates.length - z10RouteMismatches.length}/${z10RouteStates.length}`,
  seams: seams.length,
  blockEntities: volumeEntities.blockEntities.length,
  savedEntities: volumeEntities.savedEntities.length,
  containerControlBlocks: containerControlCells.length,
  output: relative(OUT),
  markdown: relative(MARKDOWN),
}, null, 2));

if (!checks.every(({ status }) => status === 'PASS')) process.exitCode = 1;
