#!/usr/bin/env node
/**
 * Independent QA for INF-RR-02.
 *
 * This checker does not import generator functions or accept generator geometry
 * as truth. It re-derives the ten-station section, reads the immutable snapshot,
 * simulates forward and reverse operations, and audits fluid adjacency.
 */

import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { AnvilSnapshot } from './generate_picket_fence.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const EXPECTED_SHA =
  '4fca1ff3c40ae9c24c9338483b0780678aa5966bb570a642f0d0277885331a2b';
const DEFAULT_BASE =
  'data/buildops/ravenrock-t2b-liner-pilot-wave2-2026-07-28';
const DEFAULT_REGIONS =
  'data/worldsnap-wave2-baseline-4fca1ff3-20260728/region';
const DEFAULT_INVENTORY =
  'data/world-review/ravenrock-wave2-tunnel-inventory-2026-07-28.json';
const DEFAULT_DATABASE =
  'data/world-review/ravenrock-wave2-tunnel-database-features-2026-07-28.json';
const DEFAULT_CAMERAS =
  'data/exports/redevelopment-wave2-2026-07-28/ravenrock/t2b-camera-manifest.json';
const BUFFER = [-146, 0, 178, -135, 9, 191];
const SHELL = [-145, 1, 179, -136, 8, 190];
const CENTERLINE = [
  [-145, 3, 187],
  [-144, 3, 187],
  [-143, 3, 186],
  [-142, 2, 185],
  [-141, 2, 185],
  [-140, 2, 184],
  [-139, 2, 184],
  [-138, 2, 183],
  [-137, 2, 183],
  [-136, 2, 182],
];
const AIR = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
]);
const FLUID_GRAVITY = new Set([
  'minecraft:water',
  'minecraft:lava',
  'minecraft:bubble_column',
  'minecraft:powder_snow',
  'minecraft:sand',
  'minecraft:red_sand',
  'minecraft:gravel',
  'minecraft:suspicious_sand',
  'minecraft:suspicious_gravel',
]);

const args = process.argv.slice(2);
function argument(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}
const base = path.resolve(ROOT, argument('--base', DEFAULT_BASE));
const regions = path.resolve(ROOT, argument('--regions', DEFAULT_REGIONS));
const inventoryPath = path.resolve(
  ROOT,
  argument('--inventory', DEFAULT_INVENTORY),
);
const databasePath = path.resolve(
  ROOT,
  argument('--database', DEFAULT_DATABASE),
);
const camerasPath = path.resolve(
  ROOT,
  argument('--cameras', DEFAULT_CAMERAS),
);
const out = path.resolve(ROOT, argument('--out', `${base}.qa.json`));
const operationPath = `${base}.txt`;
const rollbackPath = `${base}.rollback.txt`;
const prestatePath = `${base}.prestate.json`;
const reportPath = `${base}.report.json`;

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function baseName(block) {
  return block?.split('[', 1)[0] ?? 'MISSING';
}

function isAir(block) {
  return AIR.has(baseName(block));
}

function digestSnapshot(directory) {
  const names = fs.readdirSync(directory)
    .filter((name) => name.endsWith('.mca'))
    .sort();
  const hash = crypto.createHash('sha256');
  let bytes = 0;
  for (const name of names) {
    const content = fs.readFileSync(path.join(directory, name));
    hash.update(name);
    hash.update('\0');
    hash.update(content);
    hash.update('\0');
    bytes += content.length;
  }
  return {
    sha256: hash.digest('hex'),
    regionFileCount: names.length,
    bytes,
  };
}

function parseOperations(filename) {
  const invalid = [];
  const records = [];
  for (const [index, raw] of fs.readFileSync(filename, 'utf8')
    .split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const fields = line.split(/\s+/);
    if (fields.length !== 9 || fields[0] !== 'REPL') {
      invalid.push({ line: index + 1, text: raw });
      continue;
    }
    const first = fields.slice(1, 4).map(Number);
    const second = fields.slice(4, 7).map(Number);
    if ([...first, ...second].some(Number.isNaN)) {
      invalid.push({ line: index + 1, text: raw });
      continue;
    }
    records.push({
      line: index + 1,
      point: first,
      secondPoint: second,
      expected: fields[7],
      desired: fields[8],
    });
  }
  return { invalid, records };
}

function pointKey(point) {
  return point.join(',');
}

const digest = digestSnapshot(regions);
const snapshot = new AnvilSnapshot(regions);
const cache = new Map();
async function blockAt(x, y, z) {
  const point = `${x},${y},${z}`;
  if (cache.has(point)) return cache.get(point);
  const chunk = await snapshot.readChunk(Math.floor(x / 16), Math.floor(z / 16));
  const block = chunk ? snapshot.blockState(chunk, x, y, z) : null;
  cache.set(point, block);
  return block;
}

const expectedDesign = new Map();
function put(x, y, z, desired, role) {
  const point = `${x},${y},${z}`;
  if (expectedDesign.has(point)) throw new Error(`QA design overlap ${point}`);
  expectedDesign.set(point, { point: [x, y, z], desired, role });
}
for (const [x, walkY, z] of CENTERLINE) {
  for (let offset = -2; offset <= 2; offset += 1) {
    put(x, walkY - 1, z + offset, 'minecraft:stone_bricks', 'floor');
    for (let rise = 0; rise < 5; rise += 1) {
      put(x, walkY + rise, z + offset, 'minecraft:air', 'clear_volume');
    }
    put(
      x,
      walkY + 5,
      z + offset,
      [-144, -140, -136].includes(x) && offset === 0
        ? 'minecraft:sea_lantern'
        : 'minecraft:stone_bricks',
      'ceiling',
    );
  }
  for (const side of [-3, 3]) {
    for (let rise = 0; rise < 5; rise += 1) {
      let material = rise === 2
        ? 'minecraft:bricks'
        : 'minecraft:polished_deepslate';
      if (
        side === 3
        && x >= -141
        && x <= -139
        && rise >= 1
        && rise <= 3
      ) material = 'minecraft:tinted_glass';
      put(x, walkY + rise, z + side, material, 'wall');
    }
  }
}

const forward = parseOperations(operationPath);
const rollback = parseOperations(rollbackPath);
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const prestate = JSON.parse(fs.readFileSync(prestatePath, 'utf8'));
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
const cameras = JSON.parse(fs.readFileSync(camerasPath, 'utf8'));

const assertions = [];
const failures = [];
function check(name, passed, details = null) {
  assertions.push({ name, passed, details });
  if (!passed) failures.push({ name, details });
}

check('immutable baseline hash matches Wave 2',
  digest.sha256 === EXPECTED_SHA, digest);
check('immutable baseline contains 26 region files and expected bytes',
  digest.regionFileCount === 26 && digest.bytes === 122744700, digest);
check('generator report is pinned to the same baseline',
  report.baseline.sha256 === EXPECTED_SHA
    && prestate.baseline.sha256 === EXPECTED_SHA
    && inventory.baseline.sha256 === EXPECTED_SHA
    && database.baseline.sha256 === EXPECTED_SHA
    && cameras.baseline.sha256 === EXPECTED_SHA);
check('forward file contains only exact REPL operations',
  forward.invalid.length === 0, forward.invalid);
check('rollback file contains only exact REPL operations',
  rollback.invalid.length === 0, rollback.invalid);
check('expected forward and rollback counts are 151',
  forward.records.length === 151 && rollback.records.length === 151,
  { forward: forward.records.length, rollback: rollback.records.length });

const forwardKeys = forward.records.map((operation) => pointKey(operation.point));
check('all forward targets are unique',
  new Set(forwardKeys).size === forward.records.length);
check('all operations target exactly one cell',
  [...forward.records, ...rollback.records].every((operation) =>
    pointKey(operation.point) === pointKey(operation.secondPoint)));
check('all targets remain within the selected shell',
  forward.records.every(({ point: [x, y, z] }) => (
    x >= SHELL[0] && x <= SHELL[3]
    && y >= SHELL[1] && y <= SHELL[4]
    && z >= SHELL[2] && z <= SHELL[5]
  )));
check('x=-135 wet threshold receives zero targets',
  forward.records.every(({ point: [x] }) => x <= -136));
check('accepted S1 and T4 bulkhead cannot be targeted',
  forward.records.every(({ point: [x, , z] }) =>
    !(x >= 138 && x <= 148 && z >= -18 && z <= -10)
    && !(x === -278 || x === -277)));
check('hard y41 ceiling is respected',
  forward.records.every(({ point: [, y] }) => y <= 41));
check('package is addition-only with exact air sources',
  forward.records.every((operation) =>
    operation.expected === 'minecraft:air'
    && operation.desired !== 'minecraft:air'));

const snapshotSources = new Map();
for (const operation of forward.records) {
  snapshotSources.set(
    pointKey(operation.point),
    await blockAt(...operation.point),
  );
}
const sourceMismatches = forward.records
  .filter((operation) =>
    snapshotSources.get(pointKey(operation.point)) !== operation.expected)
  .map((operation) => ({
    point: operation.point,
    expected: operation.expected,
    actual: snapshotSources.get(pointKey(operation.point)),
  }));
check('all 151 source guards match the immutable snapshot',
  sourceMismatches.length === 0, sourceMismatches);

const expectedChanges = [];
for (const cell of expectedDesign.values()) {
  const source = await blockAt(...cell.point);
  if (source !== cell.desired) {
    expectedChanges.push({ ...cell, source });
  }
}
const expectedByPoint = new Map(
  expectedChanges.map((cell) => [pointKey(cell.point), cell]),
);
const operationDesignDifferences = forward.records.filter((operation) => {
  const expected = expectedByPoint.get(pointKey(operation.point));
  return !expected
    || expected.source !== operation.expected
    || expected.desired !== operation.desired;
});
check('operations equal independently derived changed design cells',
  expectedChanges.length === 151
    && operationDesignDifferences.length === 0
    && expectedByPoint.size === forward.records.length,
  {
    expectedChanges: expectedChanges.length,
    operationDesignDifferences,
  });
check('complete design contains 450 cells',
  expectedDesign.size === 450 && prestate.designCells.length === 450);

const inverseFailures = [];
for (let index = 0; index < forward.records.length; index += 1) {
  const operation = forward.records[index];
  const inverse = rollback.records[rollback.records.length - index - 1];
  if (
    pointKey(operation.point) !== pointKey(inverse.point)
    || operation.expected !== inverse.desired
    || operation.desired !== inverse.expected
  ) {
    inverseFailures.push({ operation, inverse });
  }
}
check('rollback is a reverse-order exact bijection',
  inverseFailures.length === 0, inverseFailures);

const bufferState = new Map();
const hazards = [];
for (let x = BUFFER[0]; x <= BUFFER[3]; x += 1) {
  for (let y = BUFFER[1]; y <= BUFFER[4]; y += 1) {
    for (let z = BUFFER[2]; z <= BUFFER[5]; z += 1) {
      const block = await blockAt(x, y, z);
      const point = `${x},${y},${z}`;
      bufferState.set(point, block);
      if (
        FLUID_GRAVITY.has(baseName(block))
        || block?.includes('waterlogged=true')
      ) hazards.push({ point: [x, y, z], block });
    }
  }
}
const waterHazards = hazards.filter((hazard) =>
  baseName(hazard.block) === 'minecraft:water');
check('audit buffer contains the expected 12 water cells and no gravity hazard',
  hazards.length === 12 && waterHazards.length === 12,
  hazards);
check('water is retained at the explicit excluded edges',
  waterHazards.every(({ point: [x, , z] }) =>
    (x >= -146 && x <= -144 && z === 178)
    || (x === -135 && (z === 178 || z === 179))),
  waterHazards);

const directions = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
];
const faceAdjacentHazards = [];
for (const operation of forward.records) {
  for (const direction of directions) {
    const neighbor = operation.point.map((value, index) =>
      value + direction[index]);
    const block = bufferState.get(pointKey(neighbor));
    if (
      block
      && (
        FLUID_GRAVITY.has(baseName(block))
        || block.includes('waterlogged=true')
      )
    ) {
      faceAdjacentHazards.push({
        target: operation.point,
        neighbor,
        block,
      });
    }
  }
}
check('every target is non-face-adjacent to fluid and gravity blocks',
  faceAdjacentHazards.length === 0, faceAdjacentHazards);

const blockEntities = JSON.parse(execFileSync(
  process.execPath,
  [
    'scripts/block_entity_census.mjs',
    '--regions',
    regions,
    '--box',
    ...BUFFER.map(String),
  ],
  { cwd: ROOT, encoding: 'utf8' },
));
check('audit buffer has zero block entities and no missing chunks',
  blockEntities.count === 0 && blockEntities.chunksMissing === 0,
  blockEntities);

const finalState = new Map(bufferState);
for (const operation of forward.records) {
  const point = pointKey(operation.point);
  if (finalState.get(point) !== operation.expected) {
    failures.push({
      name: `forward simulation drift at ${point}`,
      details: {
        expected: operation.expected,
        actual: finalState.get(point),
      },
    });
  }
  finalState.set(point, operation.desired);
}

const stationResults = [];
for (const [x, walkY, z] of CENTERLINE) {
  let floor = 0;
  let clear = 0;
  let ceiling = 0;
  let walls = 0;
  for (let offset = -2; offset <= 2; offset += 1) {
    if (finalState.get(`${x},${walkY - 1},${z + offset}`)
      === 'minecraft:stone_bricks') floor += 1;
    for (let rise = 0; rise < 5; rise += 1) {
      if (isAir(finalState.get(`${x},${walkY + rise},${z + offset}`))) {
        clear += 1;
      }
    }
    const ceilingBlock =
      finalState.get(`${x},${walkY + 5},${z + offset}`);
    if (
      ceilingBlock === 'minecraft:stone_bricks'
      || ceilingBlock === 'minecraft:sea_lantern'
    ) ceiling += 1;
  }
  for (const side of [-3, 3]) {
    for (let rise = 0; rise < 5; rise += 1) {
      if (!isAir(finalState.get(`${x},${walkY + rise},${z + side}`))) {
        walls += 1;
      }
    }
  }
  stationResults.push({
    x,
    walkY,
    z,
    floor,
    clear,
    ceiling,
    walls,
    passed:
      floor === 5 && clear === 25 && ceiling === 5 && walls === 10,
  });
}
check('all ten stations simulate a 5-wide x 5-high authored section',
  stationResults.every((station) => station.passed), stationResults);

const lightPoints = forward.records
  .filter((operation) => operation.desired === 'minecraft:sea_lantern')
  .map((operation) => operation.point)
  .sort();
check('three rhythm lights occupy the independent schedule',
  JSON.stringify(lightPoints)
    === JSON.stringify([[-144, 8, 187], [-140, 7, 184], [-136, 7, 182]].sort()),
  lightPoints);
const windowPoints = forward.records
  .filter((operation) => operation.desired === 'minecraft:tinted_glass');
check('the deliberate dry-side cave window contains 9 cells',
  windowPoints.length === 9
    && windowPoints.every(({ point: [x, y, z] }) =>
      x >= -141 && x <= -139 && z >= 187 && z <= 188 && y >= 3 && y <= 5),
  windowPoints);

const transitions = CENTERLINE.slice(1).map((station, index) => ({
  from: CENTERLINE[index],
  to: station,
  dx: station[0] - CENTERLINE[index][0],
  dy: station[1] - CENTERLINE[index][1],
  dz: station[2] - CENTERLINE[index][2],
}));
check('centerline is continuous and adds no jump geometry',
  transitions.every(({ dx, dy, dz }) =>
    dx === 1 && Math.abs(dy) <= 1 && Math.abs(dz) <= 1),
  transitions);
check('vertical change occurs only after at least two horizontal stations',
  CENTERLINE.findIndex(([, walkY]) => walkY === 2) >= 3,
  CENTERLINE);

const restored = new Map(finalState);
for (const operation of rollback.records) {
  const point = pointKey(operation.point);
  if (restored.get(point) !== operation.expected) {
    failures.push({
      name: `rollback simulation drift at ${point}`,
      details: {
        expected: operation.expected,
        actual: restored.get(point),
      },
    });
  }
  restored.set(point, operation.desired);
}
const restorationDifferences = forward.records.filter((operation) =>
  restored.get(pointKey(operation.point))
  !== bufferState.get(pointKey(operation.point)));
check('rollback simulation restores every target exactly',
  restorationDifferences.length === 0, restorationDifferences);

check('inventory covers ten route legs, fifteen nodes, and fifteen shaft flights',
  inventory.routes.length === 10
    && inventory.nodes.length === 15
    && inventory.verticalCirculation.flights.length === 15);
check('all route legs have at least one snapshot observation',
  inventory.routes.every((route) =>
    route.snapshotEvidence.treadStationsFound > 0),
  inventory.routes.map((route) => ({
    id: route.id,
    found: route.snapshotEvidence.treadStationsFound,
    total: route.snapshotEvidence.sampledStations,
  })));
check('database census records catalog gaps without claiming imports',
  inventory.database.ravenRockFeatureRows === 40
    && inventory.database.missingFirstClassRouteRecords === 10
    && database.status === 'proposal-not-imported'
    && database.featureCount === database.features.length
    && database.features.length >= 40);
check('package database feature has separated non-perfect quality states',
  (() => {
    const feature = database.features.find((entry) =>
      entry.externalId === 'RR-T2B-LINER-PILOT-W2');
    if (!feature) return false;
    const quality = Object.values(feature.attributes.quality);
    return feature.conditionScore === null
      && quality.every((dimension) => dimension.score !== 100)
      && new Set(quality.map((dimension) => dimension.status)).size
        === quality.length;
  })());
check('camera contract has six unique exact-primary cameras',
  cameras.cameras.length === 6
    && new Set(cameras.cameras.map((camera) => camera.id)).size === 6
    && cameras.cameras.every((camera) =>
      camera.primaryFeatureId === 'RR-T2B-LINER-PILOT-W2'
      && camera.beforeOutput
      && camera.afterOutput));
check('corrected section camera has an independently unobstructed source-state ray',
  await (async () => {
    const camera = cameras.cameras.find((entry) =>
      entry.id === 'RR-T2B-W2-SECTION');
    if (!camera || camera.eye[1] < 4.5) return false;
    const rayCells = new Map();
    for (let step = 0; step <= 48; step += 1) {
      const fraction = step / 48;
      const point = camera.eye.map((value, index) => Math.floor(
        value + (camera.lookAt[index] - value) * fraction,
      ));
      rayCells.set(pointKey(point), await blockAt(...point));
    }
    return rayCells.size >= 6
      && [...rayCells.values()].every((block) => isAir(block))
      && camera.visibilityRay?.unobstructed === true;
  })());
check('report declares no live mutation and no database writes',
  report.exclusions.liveWorldMutation === false
    && report.exclusions.databaseWrites === false
    && report.exclusions.excavation === false
    && report.exclusions.xMinus135WetThresholdTargets === false);

const qa = {
  schemaVersion: 1,
  id: 'ravenrock-t2b-liner-pilot-wave2-2026-07-28-independent-qa',
  generatedAtUtc: new Date().toISOString(),
  packageId: 'INF-RR-02',
  status: failures.length === 0
    ? 'PASS_OFFLINE_LIVE_GATES_PENDING'
    : 'FAIL',
  baseline: {
    regions: relative(regions),
    ...digest,
  },
  inputs: {
    operations: relative(operationPath),
    rollback: relative(rollbackPath),
    prestate: relative(prestatePath),
    report: relative(reportPath),
    inventory: relative(inventoryPath),
    databaseFeatures: relative(databasePath),
    cameras: relative(camerasPath),
  },
  summary: {
    forwardOperations: forward.records.length,
    rollbackOperations: rollback.records.length,
    uniqueTargets: new Set(forwardKeys).size,
    designCells: expectedDesign.size,
    passingStations: stationResults.filter((station) => station.passed).length,
    totalStations: stationResults.length,
    bufferWaterHazards: waterHazards.length,
    targetHazards: forward.records.filter((operation) =>
      FLUID_GRAVITY.has(baseName(operation.expected))).length,
    faceAdjacentTargetHazards: faceAdjacentHazards.length,
    blockEntities: blockEntities.count,
    routeLegsInventoried: inventory.routes.length,
    nodesInventoried: inventory.nodes.length,
    stairFlightsInventoried: inventory.verticalCirculation.flights.length,
    databaseFeatureProposals: database.features.length,
    cameras: cameras.cameras.length,
    assertions: assertions.length,
    failedAssertions: failures.length,
  },
  stationResults,
  hazards: {
    explicitExcludedWetBoundary: {
      stationX: -135,
      waterHazards,
      targetCount: forward.records.filter(({ point: [x] }) => x === -135).length,
      releaseStopCondition:
        'Stop if any target is fluid/waterlogged/gravity-affected or if a '
        + 'fluid/gravity cell becomes face-adjacent on the same-moment release snapshot.',
    },
  },
  mandatoryLiveGates: report.mandatoryLiveGates,
  assertions,
  failures,
};
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(qa, null, 2)}\n`);
console.log(
  `${path.basename(operationPath)}: `
  + `${assertions.length - failures.length}/${assertions.length} gates pass; `
  + `${qa.summary.passingStations}/${qa.summary.totalStations} stations pass`,
);
console.log(`  status: ${qa.status}`);
console.log(`  output: ${out}`);
process.exit(failures.length === 0 ? 0 : 1);
