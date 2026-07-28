#!/usr/bin/env node
/**
 * Read-only engineering survey for the Worker Town theatre and private owner
 * corridor. Reads an immutable Anvil snapshot and writes factual census data;
 * it never connects to Minecraft and never mutates a world.
 */

import fs from 'fs';
import path from 'path';

import {
  DetailedAnvilSnapshot,
  baseBlockName,
  hashSnapshotDirectory,
} from './generate_mainstreet_redevelopment_r4_r5.mjs';

const SNAPSHOT = process.argv[2]
  ?? 'data/worldsnap-town-expansion-expanded-baseline-20260728T0405Z/region';
const OUTPUT = process.argv[3]
  ?? 'docs/redevelopment/2026-07-28-town-expansion/evidence/worker-town-theater-owner-tunnel-survey.json';
const PLANNED_OPS = 'data/buildops/town-expansion-r1-wip2.txt';

const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set([
  'minecraft:sand',
  'minecraft:red_sand',
  'minecraft:gravel',
  'minecraft:anvil',
  'minecraft:chipped_anvil',
  'minecraft:damaged_anvil',
  'minecraft:dragon_egg',
  'minecraft:scaffolding',
]);

function key(x, y, z) {
  return `${x},${y},${z}`;
}

function parseKey(value) {
  return value.split(',').map(Number);
}

function normalizeBox(box) {
  const [x1, y1, z1, x2, y2, z2] = box;
  return [
    Math.min(x1, x2),
    Math.min(y1, y2),
    Math.min(z1, z2),
    Math.max(x1, x2),
    Math.max(y1, y2),
    Math.max(z1, z2),
  ];
}

function intersectBoxes(first, second) {
  const a = normalizeBox(first);
  const b = normalizeBox(second);
  const intersection = [
    Math.max(a[0], b[0]),
    Math.max(a[1], b[1]),
    Math.max(a[2], b[2]),
    Math.min(a[3], b[3]),
    Math.min(a[4], b[4]),
    Math.min(a[5], b[5]),
  ];
  if (
    intersection[0] > intersection[3]
    || intersection[1] > intersection[4]
    || intersection[2] > intersection[5]
  ) return null;
  return intersection;
}

function boxCells(box) {
  const [x1, y1, z1, x2, y2, z2] = normalizeBox(box);
  const cells = new Set();
  for (let y = y1; y <= y2; y += 1) {
    for (let z = z1; z <= z2; z += 1) {
      for (let x = x1; x <= x2; x += 1) cells.add(key(x, y, z));
    }
  }
  return cells;
}

function addBox(cells, box) {
  for (const coordinate of boxCells(box)) cells.add(coordinate);
}

function linePoints(points) {
  const output = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const from = points[index];
    const to = points[index + 1];
    const dx = Math.sign(to[0] - from[0]);
    const dz = Math.sign(to[1] - from[1]);
    const length = Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]));
    for (let step = 0; step <= length; step += 1) {
      const point = [from[0] + dx * step, from[1] + dz * step];
      if (!output.length || output.at(-1)[0] !== point[0] || output.at(-1)[1] !== point[1]) {
        output.push(point);
      }
    }
  }
  return output;
}

function corridorEnvelope(points, floorY = -44) {
  const cells = new Set();
  const centerline = linePoints(points);
  for (let index = 0; index < centerline.length; index += 1) {
    const [x, z] = centerline[index];
    const prior = centerline[Math.max(0, index - 1)];
    const next = centerline[Math.min(centerline.length - 1, index + 1)];
    const alongX = prior[0] !== x || next[0] !== x;
    if (alongX) {
      addBox(cells, [x, floorY - 2, z - 4, x, floorY + 7, z + 4]);
    } else {
      addBox(cells, [x - 4, floorY - 2, z, x + 4, floorY + 7, z]);
    }
  }
  for (const [x, z] of points.slice(1, -1)) {
    addBox(cells, [x - 5, floorY - 2, z - 5, x + 5, floorY + 7, z + 5]);
  }
  return cells;
}

function halo(cells) {
  const output = new Set();
  const neighbors = [
    [1, 0, 0], [-1, 0, 0],
    [0, 1, 0], [0, -1, 0],
    [0, 0, 1], [0, 0, -1],
  ];
  for (const coordinate of cells) {
    const [x, y, z] = parseKey(coordinate);
    for (const [dx, dy, dz] of neighbors) {
      const candidate = key(x + dx, y + dy, z + dz);
      if (!cells.has(candidate)) output.add(candidate);
    }
  }
  return output;
}

async function censusCells(snapshot, cells) {
  const result = {
    cells: cells.size,
    missingCells: 0,
    airCells: 0,
    solidCells: 0,
    fluidCells: 0,
    gravityCells: 0,
    fluidSamples: [],
    gravitySamples: [],
    stateCounts: {},
  };
  for (const coordinate of cells) {
    const [x, y, z] = parseKey(coordinate);
    const state = await snapshot.getBlock(x, y, z);
    if (state === null) {
      result.missingCells += 1;
      continue;
    }
    const name = baseBlockName(state);
    result.stateCounts[name] = (result.stateCounts[name] ?? 0) + 1;
    if (AIR.has(name)) result.airCells += 1;
    else result.solidCells += 1;
    if (FLUID.has(name)) {
      result.fluidCells += 1;
      if (result.fluidSamples.length < 50) result.fluidSamples.push([x, y, z, state]);
    }
    if (GRAVITY.has(name) || name.endsWith('_concrete_powder')) {
      result.gravityCells += 1;
      if (result.gravitySamples.length < 50) result.gravitySamples.push([x, y, z, state]);
    }
  }
  result.stateCounts = Object.fromEntries(
    Object.entries(result.stateCounts).sort((a, b) => b[1] - a[1]),
  );
  return result;
}

async function censusBox(snapshot, box) {
  const cells = boxCells(box);
  const census = await censusCells(snapshot, cells);
  const blockEntities = await snapshot.blockEntitiesInBox(box);
  return {
    bounds: normalizeBox(box),
    ...census,
    blockEntities: blockEntities.map((entity) => ({
      id: entity.id ?? entity.Id ?? null,
      x: Number(entity.x),
      y: Number(entity.y),
      z: Number(entity.z),
    })),
  };
}

async function surfaceSurvey(snapshot, box) {
  const [x1, , z1, x2, , z2] = normalizeBox(box);
  const surfaceYs = [];
  const waterColumns = [];
  const stateCounts = {};
  for (let z = z1; z <= z2; z += 1) {
    for (let x = x1; x <= x2; x += 1) {
      let surface = null;
      for (let y = 120; y >= 40; y -= 1) {
        const state = await snapshot.getBlock(x, y, z);
        const name = baseBlockName(state);
        if (!AIR.has(name)) {
          surface = { y, state, name };
          break;
        }
      }
      if (!surface) continue;
      surfaceYs.push(surface.y);
      stateCounts[surface.name] = (stateCounts[surface.name] ?? 0) + 1;
      if (FLUID.has(surface.name)) waterColumns.push([x, surface.y, z, surface.state]);
    }
  }
  surfaceYs.sort((a, b) => a - b);
  const percentile = (p) => surfaceYs[Math.min(
    surfaceYs.length - 1,
    Math.max(0, Math.floor((surfaceYs.length - 1) * p)),
  )];
  return {
    columns: surfaceYs.length,
    surfaceY: {
      min: surfaceYs[0] ?? null,
      p10: percentile(0.1) ?? null,
      median: percentile(0.5) ?? null,
      p90: percentile(0.9) ?? null,
      max: surfaceYs.at(-1) ?? null,
    },
    surfaceStateCounts: Object.fromEntries(
      Object.entries(stateCounts).sort((a, b) => b[1] - a[1]),
    ),
    waterColumns: waterColumns.length,
    waterSamples: waterColumns.slice(0, 100),
  };
}

const theatre = [-34, 40, -402, 18, 110, -350];
const theatreConstruction = [-38, 40, -406, 22, 110, -346];
const theatreSubgrade = [-34, -1, -402, 18, 66, -350];
const theatreDescent = [-34, -46, -400, 14, 67, -383];
const theatreMarquee = [-17, 70, -349, 1, 86, -344];
const theatreEntryCourt = [-30, 64, -349, 14, 82, -340];
const mansionAscent = [348, -46, 150, 377, 112, 180];
const mansionArrivalGallery = [269, 109, 156, 348, 120, 174];
const cityReservation = [65, -38, -280, 125, -20, -200];
const salesOffice = [78, -46, -227, 106, -33, -204];
const routePoints = [
  [-10, -390],
  [55, -390],
  [55, -230],
  [150, -230],
  [150, -80],
  [165, -80],
  [165, 55],
  [363, 55],
  [363, 165],
];
const routeCells = corridorEnvelope(routePoints);
const routeHalo = halo(routeCells);
const restSuites = [
  { id: 'OWNER-REST-A', bounds: [20, -46, -351, 48, -34, -331] },
  { id: 'OWNER-REST-B', bounds: [20, -46, -269, 48, -34, -249] },
  { id: 'OWNER-REST-C', bounds: [157, -46, -161, 186, -34, -141] },
  { id: 'OWNER-REST-D', bounds: [157, -46, -111, 186, -34, -91] },
  { id: 'OWNER-REST-E', bounds: [172, -46, 30, 201, -34, 50] },
  { id: 'OWNER-REST-F', bounds: [235, -46, 62, 264, -34, 82] },
  { id: 'OWNER-REST-G', bounds: [326, -46, 90, 355, -34, 110] },
];

const snapshot = new DetailedAnvilSnapshot(SNAPSHOT);
const result = {
  schemaVersion: '1.0.0',
  generatedAtUtc: new Date().toISOString(),
  liveWorldMutated: false,
  sourceSnapshot: hashSnapshotDirectory(SNAPSHOT),
  candidates: {
    theatre: {
      ...(await censusBox(snapshot, theatre)),
      constructionHalo: await censusBox(snapshot, theatreConstruction),
      subgrade: await censusBox(snapshot, theatreSubgrade),
      surface: await surfaceSurvey(snapshot, theatreConstruction),
    },
    theatreDescent: await censusBox(snapshot, theatreDescent),
    theatreMarquee: await censusBox(snapshot, theatreMarquee),
    theatreEntryCourt: await censusBox(snapshot, theatreEntryCourt),
    ownerCorridor: {
      floorY: -44,
      clearInterior: {
        width: 5,
        height: 5,
        clearY: [-43, -39],
      },
      constructionEnvelope: {
        lateralWidth: 9,
        verticalY: [-46, -37],
        points: routePoints,
      },
      census: await censusCells(snapshot, routeCells),
      faceHaloCensus: await censusCells(snapshot, routeHalo),
      blockEntities: [],
    },
    restSuites: [],
    futureOwnerCity: await censusBox(snapshot, cityReservation),
    futureOwnerCityAlternatives: [],
    salesOffice: await censusBox(snapshot, salesOffice),
    mansionAscent: await censusBox(snapshot, mansionAscent),
    mansionArrivalGallery: await censusBox(snapshot, mansionArrivalGallery),
    mansionAscentAlternatives: [],
  },
};

const plannedIntersections = new Map();
function recordIntersection(candidate, scope, cells, sample) {
  if (!cells) return;
  const id = `${candidate}\u0000${scope}`;
  const current = plannedIntersections.get(id) ?? {
    candidate,
    scope,
    cells: 0,
    samples: [],
  };
  current.cells += cells;
  if (current.samples.length < 20) current.samples.push(sample);
  plannedIntersections.set(id, current);
}

if (fs.existsSync(PLANNED_OPS)) {
  const candidateBoxes = [
    ['THEATRE', theatre],
    ['THEATRE-DESCENT', theatreDescent],
    ['THEATRE-MARQUEE', theatreMarquee],
    ['THEATRE-ENTRY-COURT', theatreEntryCourt],
    ['FUTURE-OWNER-CITY', cityReservation],
    ['SALES-OFFICE', salesOffice],
    ['MANSION-ASCENT', mansionAscent],
    ['MANSION-ARRIVAL-GALLERY', mansionArrivalGallery],
    ...restSuites.map((suite) => [suite.id, suite.bounds]),
  ];
  let scope = 'UNKNOWN';
  for (const line of fs.readFileSync(PLANNED_OPS, 'utf8').split(/\r?\n/)) {
    if (line.startsWith('# phase=')) {
      const match = line.match(/\bscope=(\S+)/);
      if (match) scope = match[1];
      continue;
    }
    if (!line.startsWith('REPL ')) continue;
    const parts = line.split(/\s+/);
    const operationBox = parts.slice(1, 7).map(Number);
    for (const [candidate, box] of candidateBoxes) {
      const intersection = intersectBoxes(operationBox, box);
      if (!intersection) continue;
      const cells = (
        (intersection[3] - intersection[0] + 1)
        * (intersection[4] - intersection[1] + 1)
        * (intersection[5] - intersection[2] + 1)
      );
      recordIntersection(candidate, scope, cells, intersection);
    }
    const corridorIntersection = intersectBoxes(operationBox, [
      -14,
      -46,
      -394,
      369,
      -37,
      169,
    ]);
    if (corridorIntersection) {
      let cells = 0;
      const samples = [];
      for (let y = corridorIntersection[1]; y <= corridorIntersection[4]; y += 1) {
        for (let z = corridorIntersection[2]; z <= corridorIntersection[5]; z += 1) {
          for (let x = corridorIntersection[0]; x <= corridorIntersection[3]; x += 1) {
            if (!routeCells.has(key(x, y, z))) continue;
            cells += 1;
            if (samples.length < 3) samples.push([x, y, z]);
          }
        }
      }
      if (cells) recordIntersection('OWNER-CORRIDOR', scope, cells, samples);
    }
  }
}
result.plannedPackageIntersectionEvidence = {
  source: PLANNED_OPS,
  advisoryOnly: true,
  rule: 'Repeat against the final regenerated package. Intersections with the owner estate are permitted only at the documented mansion endpoint.',
  intersections: [...plannedIntersections.values()].sort((a, b) => (
    a.candidate.localeCompare(b.candidate) || b.cells - a.cells
  )),
};

result.candidates.theatreDescent.faceHaloCensus = await censusCells(
  snapshot,
  halo(boxCells(theatreDescent)),
);
result.candidates.futureOwnerCity.faceHaloCensus = await censusCells(
  snapshot,
  halo(boxCells(cityReservation)),
);
result.candidates.salesOffice.faceHaloCensus = await censusCells(
  snapshot,
  halo(boxCells(salesOffice)),
);
result.candidates.mansionAscent.faceHaloCensus = await censusCells(
  snapshot,
  halo(boxCells(mansionAscent)),
);
result.candidates.mansionArrivalGallery.faceHaloCensus = await censusCells(
  snapshot,
  halo(boxCells(mansionArrivalGallery)),
);

for (const candidate of [
  { id: 'CITY-SELECTED-DRY-HALO', bounds: [65, -38, -280, 125, -20, -200] },
  { id: 'CITY-SELECTED-DRY', bounds: [65, -38, -280, 125, -19, -200] },
  { id: 'CITY-SELECTED-WEST', bounds: [65, -38, -280, 125, -15, -200] },
  { id: 'CITY-F', bounds: [60, -38, -270, 125, -15, -190] },
  { id: 'CITY-SELECTED', bounds: [75, -38, -270, 145, -15, -190] },
  { id: 'CITY-D', bounds: [65, -38, -290, 135, -15, -210] },
  { id: 'CITY-E', bounds: [85, -38, -270, 155, -15, -190] },
  { id: 'CITY-A', bounds: [70, -52, -280, 140, -19, -200] },
  { id: 'CITY-B', bounds: [75, -52, -270, 145, -19, -190] },
  { id: 'CITY-C', bounds: [80, -50, -300, 150, -17, -220] },
]) {
  result.candidates.futureOwnerCityAlternatives.push({
    id: candidate.id,
    ...(await censusBox(snapshot, candidate.bounds)),
  });
}

for (const candidate of [
  { id: 'ASCENT-SELECTED-FAR-EAST', bounds: [348, -46, 150, 377, 112, 180] },
  { id: 'ASCENT-FAR-EAST-C', bounds: [350, -46, 150, 379, 112, 180] },
  { id: 'ASCENT-FAR-EAST-D', bounds: [350, -46, 190, 379, 112, 220] },
  { id: 'ASCENT-FAR-EAST-E', bounds: [340, -46, 190, 369, 112, 220] },
  { id: 'ASCENT-NORTH-C', bounds: [145, -46, 20, 174, 111, 50] },
  { id: 'ASCENT-NORTH-D', bounds: [145, -46, 35, 174, 111, 65] },
  { id: 'ASCENT-NORTH-E', bounds: [150, -46, 0, 179, 111, 30] },
  { id: 'ASCENT-NORTH-WEST', bounds: [100, -46, 20, 129, 111, 50] },
  { id: 'ASCENT-FAR-EAST-A', bounds: [310, -46, 100, 339, 111, 130] },
  { id: 'ASCENT-FAR-EAST-B', bounds: [310, -46, 150, 339, 111, 180] },
  { id: 'ASCENT-FAR-SOUTHEAST', bounds: [310, -46, 230, 339, 111, 260] },
  { id: 'ASCENT-SELECTED-NORTH', bounds: [188, -46, 32, 220, 111, 66] },
  { id: 'ASCENT-NORTH-A', bounds: [175, -46, 32, 207, 111, 66] },
  { id: 'ASCENT-NORTH-B', bounds: [221, -46, 32, 253, 111, 66] },
  { id: 'ASCENT-SELECTED-WEST', bounds: [120, -46, 155, 143, 111, 190] },
  { id: 'ASCENT-WEST-NORTH', bounds: [120, -46, 120, 143, 111, 154] },
  { id: 'ASCENT-WEST-SOUTH', bounds: [120, -46, 191, 143, 111, 225] },
  { id: 'ASCENT-EAST', bounds: [276, -46, 120, 306, 111, 152] },
  { id: 'ASCENT-NORTH', bounds: [180, -46, 88, 212, 111, 120] },
  { id: 'ASCENT-SOUTH', bounds: [180, -46, 216, 212, 111, 248] },
  { id: 'ASCENT-WEST', bounds: [128, -46, 155, 148, 111, 190] },
  { id: 'ASCENT-EAST-SOUTH', bounds: [276, -46, 198, 306, 111, 230] },
]) {
  result.candidates.mansionAscentAlternatives.push({
    id: candidate.id,
    ...(await censusBox(snapshot, candidate.bounds)),
  });
}

for (const suite of restSuites) {
  result.candidates.restSuites.push({
    id: suite.id,
    ...(await censusBox(snapshot, suite.bounds)),
  });
}

const corridorMinX = Math.min(...routePoints.map(([x]) => x)) - 4;
const corridorMaxX = Math.max(...routePoints.map(([x]) => x)) + 4;
const corridorMinZ = Math.min(...routePoints.map(([, z]) => z)) - 4;
const corridorMaxZ = Math.max(...routePoints.map(([, z]) => z)) + 4;
const corridorEntities = await snapshot.blockEntitiesInBox([
  corridorMinX,
  -46,
  corridorMinZ,
  corridorMaxX,
  -37,
  corridorMaxZ,
]);
result.candidates.ownerCorridor.blockEntities = corridorEntities.map((entity) => ({
  id: entity.id ?? entity.Id ?? null,
  x: Number(entity.x),
  y: Number(entity.y),
  z: Number(entity.z),
})).filter(({ x, y, z }) => routeCells.has(key(x, y, z)));

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  output: OUTPUT,
  snapshot: result.sourceSnapshot.sha256,
  theatre: {
    fluidCells: result.candidates.theatre.fluidCells,
    blockEntities: result.candidates.theatre.blockEntities.length,
    surface: result.candidates.theatre.surface,
  },
  route: {
    cells: result.candidates.ownerCorridor.census.cells,
    fluidCells: result.candidates.ownerCorridor.census.fluidCells,
    gravityCells: result.candidates.ownerCorridor.census.gravityCells,
    blockEntities: result.candidates.ownerCorridor.blockEntities.length,
    faceHaloFluidCells: result.candidates.ownerCorridor.faceHaloCensus.fluidCells,
  },
  city: {
    fluidCells: result.candidates.futureOwnerCity.fluidCells,
    gravityCells: result.candidates.futureOwnerCity.gravityCells,
    blockEntities: result.candidates.futureOwnerCity.blockEntities.length,
  },
  mansionAscent: {
    fluidCells: result.candidates.mansionAscent.fluidCells,
    gravityCells: result.candidates.mansionAscent.gravityCells,
    blockEntities: result.candidates.mansionAscent.blockEntities.length,
  },
}, null, 2)}\n`);
