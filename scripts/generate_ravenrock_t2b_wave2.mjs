#!/usr/bin/env node
/**
 * Generate the Wave 2 Raven Rock T2b tunnel-within-cavern pilot.
 *
 * Offline only: reads an immutable Anvil snapshot and world-map.db read-only.
 * Emits one-cell exact REPL operations, a reverse-order rollback, complete
 * prestate/design evidence, the network inventory, database-feature proposals,
 * and the same-camera contract. It never connects to Minecraft.
 */

import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import Database from 'better-sqlite3';

import { AnvilSnapshot } from './generate_picket_fence.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const EXPECTED_SNAPSHOT_SHA256 =
  '4fca1ff3c40ae9c24c9338483b0780678aa5966bb570a642f0d0277885331a2b';
const DEFAULT_REGIONS =
  'data/worldsnap-wave2-baseline-4fca1ff3-20260728/region';
const DEFAULT_BASE =
  'data/buildops/ravenrock-t2b-liner-pilot-wave2-2026-07-28';
const DEFAULT_INVENTORY =
  'data/world-review/ravenrock-wave2-tunnel-inventory-2026-07-28.json';
const DEFAULT_DATABASE =
  'data/world-review/ravenrock-wave2-tunnel-database-features-2026-07-28.json';
const DEFAULT_CAMERAS =
  'data/exports/redevelopment-wave2-2026-07-28/ravenrock/t2b-camera-manifest.json';

const args = process.argv.slice(2);
function argument(name, fallback) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
}
const expectedSnapshotSha256 = argument(
  '--expected-snapshot-sha256',
  EXPECTED_SNAPSHOT_SHA256,
);
const regionsPath = path.resolve(ROOT, argument('--regions', DEFAULT_REGIONS));
const basePath = path.resolve(ROOT, argument('--base', DEFAULT_BASE));
const operationPath = `${basePath}.txt`;
const rollbackPath = `${basePath}.rollback.txt`;
const prestatePath = `${basePath}.prestate.json`;
const reportPath = `${basePath}.report.json`;
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

const PACKAGE = {
  programId: 'REDEV-2026-07-28-R2',
  packageId: 'INF-RR-02',
  routeId: 'RR-T2B',
  featureId: 'RR-T2B-LINER-PILOT-W2',
  stationAxis: 'x',
  stationRange: [-145, -136],
  clearWidth: 5,
  clearHeight: 5,
  shellBounds: [-145, 1, 179, -136, 8, 190],
  safetyBuffer: [-146, 0, 178, -135, 9, 191],
  excludedAquiferEdge: {
    prescribedStationX: -135,
    observedWaterBounds: [-135, 1, 177, -134, 9, 179],
    reason:
      'The immutable Wave 2 snapshot contains an active water column beside '
      + 'the x=-135 shell. The largest dry, non-face-adjacent package ends at '
      + 'x=-136; x=-135 requires a separately engineered wet threshold.',
  },
};

const CENTERLINE = [
  { x: -145, walkY: 3, z: 187 },
  { x: -144, walkY: 3, z: 187 },
  { x: -143, walkY: 3, z: 186 },
  { x: -142, walkY: 2, z: 185 },
  { x: -141, walkY: 2, z: 185 },
  { x: -140, walkY: 2, z: 184 },
  { x: -139, walkY: 2, z: 184 },
  { x: -138, walkY: 2, z: 183 },
  { x: -137, walkY: 2, z: 183 },
  { x: -136, walkY: 2, z: 182 },
];

const ROUTE_LEGS = [
  ['T1a', 'North Vehicle Tunnel — portal to N1', 'public-primary-spine', 'z',
    [0, 18, -285], [0, -6, -120]],
  ['T1b', 'North Vehicle Tunnel — N1 to Cavern A', 'public-primary-spine', 'z',
    [0, -6, -120], [0, -12, -45]],
  ['T2a', 'South Personnel Tunnel — portal to dogleg', 'public-primary-spine', 'z',
    [-150, 18, 285], [-150, 2, 190]],
  ['T2b', 'South Personnel Tunnel — dogleg to Cavern B', 'public-primary-spine', 'x',
    [-150, 2, 190], [-45, -10, 130]],
  ['T3a', 'East Tunnel — portal to N2', 'public-primary-spine', 'x',
    [285, 18, -30], [180, 0, -30]],
  ['T3b', 'East Tunnel — N2 to Cavern A', 'public-primary-spine', 'x',
    [180, 0, -30], [75, -12, -15]],
  ['T4', 'West Utility Tunnel', 'service-emergency-dead-end', 'x',
    [-290, 10, 5], [-185, -18, -10]],
  ['C1', 'A-B Inter-Cavern Corridor', 'public-primary-spine', 'z',
    [0, -12, 15], [0, -10, 70]],
  ['C2', 'A-C Inter-Cavern Corridor', 'operational-secondary', 'x',
    [-75, -12, -15], [-115, -18, -10]],
  ['S1', 'Shaft Spur to RR-Z5', 'public-primary-spine', 'x',
    [75, -12, -15], [200, -12, -15]],
];

const NODES = [
  ['N1', 'North Blast Vestibule', [0, -6, -120], 'vestibule'],
  ['N2', 'East Blast Vestibule', [180, 0, -30], 'vestibule'],
  ['N3', 'South Personnel Portal', [-150, 18, 285], 'portal'],
  ['N4', 'North Vehicle Portal', [0, 18, -285], 'portal'],
  ['N5', 'East Portal', [285, 18, -30], 'portal'],
  ['N6', 'West Utility Portal', [-290, 10, 5], 'flooded-portal'],
  ['N9', 'RR-Z5 Surface Head-House', [200, 64, -15], 'shaft-head'],
  ['N10', 'Central Junction Rotunda', [0, -12, 0], 'major-decision-node'],
  ['J-T2-DOGLEG', 'T2 South Dogleg', [-150, 2, 190], 'major-decision-node'],
  ['J-T3-S1', 'T3 / S1 East Junction', [75, -12, -15], 'route-junction'],
  ['J-C1-A', 'C1 / Cavern A Threshold', [0, -12, 15], 'cavern-threshold'],
  ['J-C1-B', 'C1 / Cavern B Threshold', [0, -10, 70], 'cavern-threshold'],
  ['J-C2-A', 'C2 / Cavern A Threshold', [-75, -12, -15], 'cavern-threshold'],
  ['J-C2-C', 'C2 / Cavern C Threshold', [-115, -18, -10], 'wet-threshold'],
  ['J-T4-BULKHEAD', 'T4 Aquifer Bulkhead', [-278, 1, 3], 'protected-bulkhead'],
];

const AIR = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
]);
const FLUID = new Set([
  'minecraft:water',
  'minecraft:lava',
  'minecraft:bubble_column',
  'minecraft:powder_snow',
]);
const GRAVITY = new Set([
  'minecraft:sand',
  'minecraft:red_sand',
  'minecraft:gravel',
  'minecraft:suspicious_sand',
  'minecraft:suspicious_gravel',
]);
const SUPPORT_DEPENDENT = [
  '_torch',
  'minecraft:torch',
  'minecraft:lantern',
  'minecraft:soul_lantern',
  '_button',
  '_pressure_plate',
  '_rail',
  'minecraft:tripwire',
  'minecraft:vine',
];

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function baseName(block) {
  return block?.split('[', 1)[0] ?? 'MISSING';
}

function isAir(block) {
  return AIR.has(baseName(block));
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function snapshotDigest(directory) {
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
    algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
    sha256: hash.digest('hex'),
    regionFileCount: names.length,
    bytes,
  };
}

const digest = snapshotDigest(regionsPath);
if (digest.sha256 !== expectedSnapshotSha256) {
  throw new Error(
    `snapshot hash mismatch: expected ${expectedSnapshotSha256}, `
    + `found ${digest.sha256}`,
  );
}

const snapshot = new AnvilSnapshot(regionsPath);
const blockCache = new Map();
async function blockAt(x, y, z) {
  const point = `${x},${y},${z}`;
  if (blockCache.has(point)) return blockCache.get(point);
  const chunk = await snapshot.readChunk(Math.floor(x / 16), Math.floor(z / 16));
  if (!chunk) return null;
  const block = snapshot.blockState(chunk, x, y, z);
  blockCache.set(point, block);
  return block;
}

async function censusBox(bounds) {
  const [x1, y1, z1, x2, y2, z2] = bounds;
  const counts = {};
  const cells = new Map();
  const hazards = [];
  const supportDependent = [];
  const chunks = new Set();
  for (let x = x1; x <= x2; x += 1) {
    for (let z = z1; z <= z2; z += 1) {
      chunks.add(`${Math.floor(x / 16)},${Math.floor(z / 16)}`);
      for (let y = y1; y <= y2; y += 1) {
        const block = await blockAt(x, y, z);
        if (!block) throw new Error(`missing snapshot chunk at ${x},${y},${z}`);
        const base = baseName(block);
        counts[block] = (counts[block] ?? 0) + 1;
        cells.set(`${x},${y},${z}`, block);
        if (
          FLUID.has(base)
          || GRAVITY.has(base)
          || block.includes('waterlogged=true')
        ) {
          hazards.push({ point: [x, y, z], block });
        }
        if (SUPPORT_DEPENDENT.some((token) => base.includes(token))) {
          supportDependent.push({ point: [x, y, z], block });
        }
      }
    }
  }
  return { counts, cells, hazards, supportDependent, chunks: [...chunks] };
}

function blockEntityCensus(bounds) {
  return JSON.parse(execFileSync(
    process.execPath,
    [
      'scripts/block_entity_census.mjs',
      '--regions',
      regionsPath,
      '--box',
      ...bounds.map(String),
    ],
    { cwd: ROOT, encoding: 'utf8' },
  ));
}

const desired = new Map();
function putDesired(x, y, z, desiredBlock, role) {
  const point = `${x},${y},${z}`;
  if (desired.has(point)) {
    throw new Error(`design overlap at ${point}`);
  }
  desired.set(point, { point: [x, y, z], desired: desiredBlock, role });
}

for (const station of CENTERLINE) {
  const { x, walkY, z } = station;
  for (let offset = -2; offset <= 2; offset += 1) {
    putDesired(x, walkY - 1, z + offset, 'minecraft:stone_bricks', 'floor');
    for (let rise = 0; rise < PACKAGE.clearHeight; rise += 1) {
      putDesired(x, walkY + rise, z + offset, 'minecraft:air', 'clear_volume');
    }
    const light = [-144, -140, -136].includes(x) && offset === 0;
    putDesired(
      x,
      walkY + PACKAGE.clearHeight,
      z + offset,
      light ? 'minecraft:sea_lantern' : 'minecraft:stone_bricks',
      light ? 'ceiling_light' : 'ceiling',
    );
  }
  for (const side of [-3, 3]) {
    for (let rise = 0; rise < PACKAGE.clearHeight; rise += 1) {
      let material = rise === 2
        ? 'minecraft:bricks'
        : 'minecraft:polished_deepslate';
      if (
        side === 3
        && x >= -141
        && x <= -139
        && rise >= 1
        && rise <= 3
      ) {
        material = 'minecraft:tinted_glass';
      }
      putDesired(
        x,
        walkY + rise,
        z + side,
        material,
        material === 'minecraft:tinted_glass'
          ? 'intentional_cave_window'
          : rise === 2
            ? 'habitation_route_band'
            : 'side_liner',
      );
    }
  }
}

const designCells = [];
for (const cell of desired.values()) {
  const source = await blockAt(...cell.point);
  if (!source) throw new Error(`missing source at ${cell.point.join(',')}`);
  designCells.push({
    ...cell,
    source,
    changed: source !== cell.desired,
  });
}
const changes = designCells.filter((cell) => cell.changed);
const targetHazards = changes.filter((cell) => (
  FLUID.has(baseName(cell.source))
  || GRAVITY.has(baseName(cell.source))
  || cell.source.includes('waterlogged=true')
));
if (targetHazards.length > 0) {
  throw new Error(`unsafe target source: ${JSON.stringify(targetHazards)}`);
}
if (changes.some((cell) => !isAir(cell.source))) {
  throw new Error('Wave 2 T2b pilot must remain addition-only on this baseline');
}

const safety = await censusBox(PACKAGE.safetyBuffer);
const blockEntities = blockEntityCensus(PACKAGE.safetyBuffer);
if (blockEntities.count !== 0 || blockEntities.chunksMissing !== 0) {
  throw new Error(`unsafe block entities: ${JSON.stringify(blockEntities)}`);
}

const targetKeys = new Set(changes.map((cell) => cell.point.join(',')));
const directions = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
];
const faceAdjacentHazards = [];
for (const cell of changes) {
  for (const direction of directions) {
    const point = cell.point.map((value, index) => value + direction[index]);
    const neighbor = safety.cells.get(point.join(','));
    if (
      neighbor
      && (
        FLUID.has(baseName(neighbor))
        || GRAVITY.has(baseName(neighbor))
        || neighbor.includes('waterlogged=true')
      )
    ) {
      faceAdjacentHazards.push({
        target: cell.point,
        neighbor: point,
        block: neighbor,
      });
    }
  }
}
if (faceAdjacentHazards.length > 0) {
  throw new Error(
    `target has face-adjacent hazard: ${JSON.stringify(faceAdjacentHazards)}`,
  );
}

const roleOrder = new Map([
  ['floor', 0],
  ['side_liner', 1],
  ['habitation_route_band', 2],
  ['intentional_cave_window', 3],
  ['ceiling', 4],
  ['ceiling_light', 5],
  ['clear_volume', 6],
]);
changes.sort((left, right) => (
  roleOrder.get(left.role) - roleOrder.get(right.role)
  || left.point[0] - right.point[0]
  || left.point[1] - right.point[1]
  || left.point[2] - right.point[2]
));

function repl(cell, expected, replacement) {
  const [x, y, z] = cell.point;
  return `REPL ${x} ${y} ${z} ${x} ${y} ${z} ${expected} ${replacement}`;
}
const forwardLines = changes.map((cell) => repl(cell, cell.source, cell.desired));
const rollbackLines = [...changes]
  .reverse()
  .map((cell) => repl(cell, cell.desired, cell.source));

const operationHeader = [
  '# GENERATED FILE — Raven Rock Wave 2 T2b tunnel-within-cavern dry pilot',
  `# program: ${PACKAGE.programId}; package: ${PACKAGE.packageId}`,
  `# immutable baseline: ${relative(regionsPath)}`,
  `# baseline SHA-256: ${digest.sha256}`,
  '# Selected x=-145..-136; x=-135 excluded for the observed aquifer edge.',
  '# Addition-only: every changed source is exact minecraft:air.',
  '# Every mutation is a one-cell exact-state REPL. No SET/CMD.',
  '',
];
const rollbackHeader = [
  '# GENERATED FILE — reverse-order exact rollback for Raven Rock T2b Wave 2',
  `# source: ${relative(operationPath)}`,
  '# Applied cells are restored only while their exact pilot state remains.',
  '',
];
const operationText =
  `${operationHeader.join('\n')}${forwardLines.join('\n')}\n`;
const rollbackText =
  `${rollbackHeader.join('\n')}${rollbackLines.join('\n')}\n`;

const db = new Database(path.join(ROOT, 'data/world-map.db'), {
  readonly: true,
  fileMustExist: true,
});
const district = db.prepare(
  `SELECT id, external_id, name
   FROM world_features
   WHERE project_id = 'raven-rock' AND external_id = 'raven-rock:DISTRICT'`,
).get();
if (!district) throw new Error('Raven Rock district parent is missing');
const ravenRows = db.prepare(
  `SELECT id, external_id, parent_id, name, kind, status, geometry_json,
          tags_json, attributes_json, source, source_ref
   FROM world_features
   WHERE project_id = 'raven-rock'
   ORDER BY external_id, name`,
).all();

function threeDimensionalBounds(row) {
  const geometry = JSON.parse(row.geometry_json);
  if (geometry.type === 'bounds') {
    return [
      geometry.minX, geometry.minY ?? -64, geometry.minZ,
      geometry.maxX, geometry.maxY ?? 320, geometry.maxZ,
    ];
  }
  if (geometry.type === 'point') {
    return [
      geometry.x, geometry.y ?? -64, geometry.z,
      geometry.x, geometry.y ?? 320, geometry.z,
    ];
  }
  const points = geometry.points ?? [];
  if (points.length === 0) return null;
  return [
    Math.min(...points.map((point) => point.x)),
    Math.min(...points.map((point) => point.y ?? -64)),
    Math.min(...points.map((point) => point.z)),
    Math.max(...points.map((point) => point.x)),
    Math.max(...points.map((point) => point.y ?? 320)),
    Math.max(...points.map((point) => point.z)),
  ];
}

function overlaps(left, right) {
  return !(
    left[3] < right[0] || left[0] > right[3]
    || left[4] < right[1] || left[1] > right[4]
    || left[5] < right[2] || left[2] > right[5]
  );
}
const databaseIntersections = ravenRows
  .map((row) => ({ row, bounds: threeDimensionalBounds(row) }))
  .filter(({ bounds }) => bounds && overlaps(bounds, PACKAGE.safetyBuffer))
  .map(({ row, bounds }) => ({
    id: row.id,
    externalId: row.external_id,
    name: row.name,
    kind: row.kind,
    status: row.status,
    bounds,
  }));

async function routeInventory() {
  const records = [];
  for (const [id, name, routeClass, axis, from, to] of ROUTE_LEGS) {
    const axisIndex = axis === 'x' ? 0 : 2;
    const perpendicularIndex = axis === 'x' ? 2 : 0;
    const distance = Math.abs(to[axisIndex] - from[axisIndex]);
    const sampleCount = Math.ceil(distance / 8);
    const samples = [];
    for (let sampleIndex = 0; sampleIndex <= sampleCount; sampleIndex += 1) {
      const fraction = sampleIndex / sampleCount;
      const expected = from.map((value, index) => (
        value + (to[index] - value) * fraction
      ));
      const station = Math.round(expected[axisIndex]);
      const candidates = [];
      for (let perpendicularOffset = -14; perpendicularOffset <= 14;
        perpendicularOffset += 1) {
        for (let yOffset = -7; yOffset <= 7; yOffset += 1) {
          const point = [
            Math.round(expected[0]),
            Math.round(expected[1]) + yOffset,
            Math.round(expected[2]),
          ];
          point[axisIndex] = station;
          point[perpendicularIndex] =
            Math.round(expected[perpendicularIndex]) + perpendicularOffset;
          const floor = await blockAt(...point);
          const head1 = await blockAt(point[0], point[1] + 1, point[2]);
          const head2 = await blockAt(point[0], point[1] + 2, point[2]);
          const floorBase = baseName(floor);
          if (
            floor
            && !isAir(floor)
            && !FLUID.has(floorBase)
            && !GRAVITY.has(floorBase)
            && isAir(head1)
            && isAir(head2)
          ) {
            const authoredTread =
              floorBase === 'minecraft:stone_bricks'
              || floorBase.endsWith('_stairs')
              || floorBase === 'minecraft:polished_andesite';
            candidates.push({
              floor: point,
              floorBlock: floor,
              walk: [point[0], point[1] + 1, point[2]],
              perpendicularDeviation: Math.abs(perpendicularOffset),
              verticalDeviation: Math.abs(yOffset),
              authoredTread,
              score:
                Math.abs(perpendicularOffset) * 2
                + Math.abs(yOffset)
                + (authoredTread ? 0 : 8),
            });
          }
        }
      }
      candidates.sort((left, right) => left.score - right.score);
      samples.push({
        fraction,
        expected: expected.map((value) => Number(value.toFixed(2))),
        observed: candidates[0] ?? null,
      });
    }
    const found = samples.filter((sample) => sample.observed);
    const databaseMatch = ravenRows.find((row) => row.external_id === `RR-${id}`);
    records.push({
      id: `RR-${id}`,
      name,
      class: routeClass,
      axis,
      from,
      to,
      plannedLengthBlocks: Number(Math.hypot(
        to[0] - from[0],
        to[1] - from[1],
        to[2] - from[2],
      ).toFixed(2)),
      snapshotEvidence: {
        sampledStations: samples.length,
        treadStationsFound: found.length,
        treadStationsMissing: samples.length - found.length,
        maximumPerpendicularDeviation: found.length
          ? Math.max(...found.map((sample) =>
            sample.observed.perpendicularDeviation))
          : null,
        maximumVerticalDeviation: found.length
          ? Math.max(...found.map((sample) =>
            sample.observed.verticalDeviation))
          : null,
        samples,
      },
      databaseCoverage: databaseMatch
        ? {
          state: 'first-class-record-present',
          id: databaseMatch.id,
          externalId: databaseMatch.external_id,
        }
        : { state: 'missing-first-class-record' },
      wave2Disposition:
        id === 'T2b'
          ? 'selected-dry-pilot-x-minus145-through-minus136'
          : id === 'S1'
            ? 'accepted-R1-pilot-present; remaining rollout deferred'
            : id === 'T4'
              ? 'protected-aquifer-bulkhead; service-only; no surface exit'
              : 'inventoried; later package',
    });
  }
  return records;
}

const routeRecords = await routeInventory();

const nodeRecords = [];
for (const [id, name, coordinate, type] of NODES) {
  const [x, y, z] = coordinate;
  const localCounts = {};
  let airCells = 0;
  let fluidCells = 0;
  for (let dx = -2; dx <= 2; dx += 1) {
    for (let dy = -2; dy <= 4; dy += 1) {
      for (let dz = -2; dz <= 2; dz += 1) {
        const block = await blockAt(x + dx, y + dy, z + dz);
        if (!block) continue;
        const base = baseName(block);
        localCounts[base] = (localCounts[base] ?? 0) + 1;
        if (AIR.has(base)) airCells += 1;
        if (FLUID.has(base)) fluidCells += 1;
      }
    }
  }
  const databaseMatch = ravenRows.find((row) => row.external_id === `RR-${id}`);
  nodeRecords.push({
    id: `RR-${id}`,
    name,
    type,
    coordinate,
    localProbe: {
      bounds: [x - 2, y - 2, z - 2, x + 2, y + 4, z + 2],
      cells: 175,
      airCells,
      fluidCells,
      materialCounts: localCounts,
    },
    databaseCoverage: databaseMatch
      ? { state: 'first-class-record-present', id: databaseMatch.id }
      : { state: 'missing-first-class-record' },
  });
}

const shaftBounds = [196, -12, -19, 204, 64, -11];
const shaftCensus = await censusBox(shaftBounds);
const stairsByY = {};
let stairBlockCount = 0;
let ladderBlockCount = 0;
let ironBarsCount = 0;
for (const [point, block] of shaftCensus.cells) {
  const [, y] = point.split(',').map(Number);
  const base = baseName(block);
  if (base.endsWith('_stairs')) {
    stairBlockCount += 1;
    stairsByY[y] = (stairsByY[y] ?? 0) + 1;
  }
  if (base === 'minecraft:ladder') ladderBlockCount += 1;
  if (base === 'minecraft:iron_bars') ironBarsCount += 1;
}
const landingLevels = Array.from({ length: 16 }, (_, index) => -11 + index * 5);
const shaftFlights = landingLevels.slice(0, -1).map((lowerY, index) => ({
  id: `RR-Z5-F${String(index + 1).padStart(2, '0')}`,
  name: `RR-Z5 switchback flight ${index + 1}`,
  lowerLandingY: lowerY,
  upperLandingY: landingLevels[index + 1],
  bounds: [196, lowerY, -19, 204, landingLevels[index + 1], -11],
  snapshotStairBlocks:
    Object.entries(stairsByY)
      .filter(([y]) => Number(y) >= lowerY && Number(y) <= landingLevels[index + 1])
      .reduce((sum, [, count]) => sum + count, 0),
  databaseCoverage: 'missing-first-class-flight-record',
  wave2Disposition:
    index === 0
      ? 'next-stair-pilot-candidate-after-INF-RR-02'
      : 'inventory-only',
}));

const databaseFeatures = [];
function commonFeature(externalId, name, geometry, tags, attributes) {
  return {
    projectId: 'raven-rock',
    externalId,
    parentId: district.id,
    parentExternalId: district.external_id,
    world: 'world',
    name,
    kind: 'custom',
    status: 'planned',
    geometry,
    source: 'region_scan',
    sourceRef: relative(inventoryPath),
    confidence: 1,
    completionRatio: null,
    conditionScore: null,
    tags,
    attributes: {
      snapshotSha256: digest.sha256,
      provenanceConfidence: 'creative-approximation',
      ...attributes,
    },
  };
}

for (const route of routeRecords) {
  if (route.databaseCoverage.state !== 'missing-first-class-record') continue;
  databaseFeatures.push(commonFeature(
    route.id,
    route.name,
    {
      type: 'path',
      points: [
        { x: route.from[0], y: route.from[1], z: route.from[2] },
        { x: route.to[0], y: route.to[1], z: route.to[2] },
      ],
      width: route.id === 'RR-C2' ? 3 : 5,
    },
    ['tunnel-network', route.class, 'wave2-inventory', 'not-imported'],
    {
      routeClass: route.class,
      snapshotEvidence: route.snapshotEvidence,
      quality: {
        physicalCompletion: {
          status: 'sampled-existing-route',
          score: null,
          evidence: relative(inventoryPath),
        },
        walkability: {
          status: 'live-bidirectional-test-required',
          score: null,
          evidence: null,
        },
        legibility: {
          status: route.id === 'RR-T2b'
            ? 'measured-route-identity-defect'
            : 'not-yet-scored',
          score: null,
          evidence:
            'docs/redevelopment/2026-07-27/infrastructure-audit.md',
        },
      },
    },
  ));
}
for (const node of nodeRecords) {
  if (node.databaseCoverage.state !== 'missing-first-class-record') continue;
  databaseFeatures.push(commonFeature(
    node.id,
    node.name,
    {
      type: 'point',
      x: node.coordinate[0],
      y: node.coordinate[1],
      z: node.coordinate[2],
    },
    ['tunnel-node', node.type, 'wave2-inventory', 'not-imported'],
    {
      nodeType: node.type,
      localProbe: node.localProbe,
    },
  ));
}
for (const flight of shaftFlights) {
  databaseFeatures.push(commonFeature(
    flight.id,
    flight.name,
    {
      type: 'bounds',
      minX: flight.bounds[0],
      minY: flight.bounds[1],
      minZ: flight.bounds[2],
      maxX: flight.bounds[3],
      maxY: flight.bounds[4],
      maxZ: flight.bounds[5],
    },
    ['vertical-circulation', 'switchback-flight', 'wave2-inventory', 'not-imported'],
    {
      lowerLandingY: flight.lowerLandingY,
      upperLandingY: flight.upperLandingY,
      snapshotStairBlocks: flight.snapshotStairBlocks,
      liveTwoWayTimingRequired: true,
    },
  ));
}
databaseFeatures.push(commonFeature(
  PACKAGE.featureId,
  'Raven Rock T2b Tunnel-Within-Cavern Wave 2 Pilot',
  {
    type: 'path',
    points: CENTERLINE.map(({ x, walkY, z }) => ({ x, y: walkY, z })),
    width: PACKAGE.clearWidth,
  },
  [
    'tunnel',
    'public-primary-spine',
    'habitation-route',
    'tunnel-within-cavern',
    'exact-state-guarded',
    'not-live-executed',
  ],
  {
    packageId: PACKAGE.packageId,
    designStatus: 'generated-offline-live-gates-pending',
    clearEnvelope: {
      width: PACKAGE.clearWidth,
      height: PACKAGE.clearHeight,
    },
    routeIdentity: {
      code: 'H',
      materialCue: 'minecraft:bricks',
      destination: 'Habitation / Cavern B',
    },
    intentionalCaveWindow: {
      stationsX: [-141, -140, -139],
      side: 'positive-z-dry-side',
      material: 'minecraft:tinted_glass',
    },
    excludedAquiferEdge: PACKAGE.excludedAquiferEdge,
    quality: {
      physicalCompletion: {
        status: 'not-live-executed',
        score: 0,
        evidence: relative(reportPath),
      },
      functional: {
        status: 'offline-section-simulation-pending-independent-qa',
        score: 65,
        evidence: relative(reportPath),
      },
      walkability: {
        status: 'existing-tread-preserved-live-two-way-test-pending',
        score: 60,
        evidence: relative(prestatePath),
      },
      legibility: {
        status: 'authored-route-band-window-and-light-rhythm-designed',
        score: 55,
        evidence: relative(reportPath),
      },
      mediaCoverage: {
        status: 'exact-cameras-defined-images-pending',
        score: 0,
        evidence: relative(camerasPath),
      },
    },
  },
));

const inventory = {
  schemaVersion: 1,
  id: 'ravenrock-wave2-tunnel-inventory-2026-07-28',
  generatedAtUtc: new Date().toISOString(),
  programId: PACKAGE.programId,
  status: 'offline-inventory-complete',
  baseline: { regions: relative(regionsPath), ...digest },
  sources: {
    plan: 'docs/raven-rock/planning/coordinates.yaml',
    standards:
      'docs/redevelopment/2026-07-27/infrastructure-standards.md',
    acceptedPilot:
      'docs/redevelopment/2026-07-27/tunnel-repair-release.md',
    database: 'data/world-map.db (read-only)',
  },
  database: {
    ravenRockFeatureRows: ravenRows.length,
    firstClassRouteRecords: routeRecords.filter((record) =>
      record.databaseCoverage.state === 'first-class-record-present').length,
    missingFirstClassRouteRecords: routeRecords.filter((record) =>
      record.databaseCoverage.state === 'missing-first-class-record').length,
    note:
      'Database absence is a catalog gap. Plan plus immutable snapshot establish '
      + 'the physical inventory; proposed records are not imported by this package.',
  },
  routes: routeRecords,
  nodes: nodeRecords,
  verticalCirculation: {
    shaftId: 'RR-Z5',
    bounds: shaftBounds,
    landingLevels,
    flightCount: shaftFlights.length,
    flights: shaftFlights,
    snapshotCensus: {
      stairBlockCount,
      stairsByY,
      ladderBlockCount,
      ironBarsCount,
      fluidOrGravityHazards: shaftCensus.hazards.length,
      supportDependentBlocks: shaftCensus.supportDependent.length,
    },
    buildingCirculationDatabaseObjects: ravenRows
      .filter((row) => row.external_id?.endsWith(':CIRCULATION'))
      .map((row) => ({
        id: row.id,
        externalId: row.external_id,
        name: row.name,
        status: row.status,
      })),
  },
  selectedPackage: {
    packageId: PACKAGE.packageId,
    routeId: PACKAGE.routeId,
    stationRange: PACKAGE.stationRange,
    stationCount: CENTERLINE.length,
    shellBounds: PACKAGE.shellBounds,
    safetyBuffer: PACKAGE.safetyBuffer,
    rationale:
      'Highest-priority measured defect and largest contiguous dry portion of '
      + 'the prescribed T2b pilot. Existing stone-brick tread and clear volume '
      + 'are retained; only an authored shell, light rhythm, identity band, and '
      + 'deliberate dry-side cave window are added.',
    excludedAquiferEdge: PACKAGE.excludedAquiferEdge,
  },
  remainingWork: [
    'T2b wet threshold at x=-135 and the remainder to Cavern B',
    'one RR-Z5 switchback flight plus its two landings',
    'T2 dogleg decision node and advance/confirmation signs',
    'T1a/T1b uniform primary-spine rollout and N1 threshold',
    'T3a/T3b uniform primary-spine rollout and N2 threshold',
    'C1 public connector identity and cavern thresholds',
    'C2 utility-secondary identity and wet Cavern C threshold',
    'T4 service/dead-end signing while preserving x=-278/-277 bulkhead',
    'remaining S1 stations outside the accepted R1 x=138..148 pilot',
  ],
};

const databasePayload = {
  schemaVersion: 1,
  id: 'ravenrock-wave2-tunnel-database-features-2026-07-28',
  generatedAtUtc: new Date().toISOString(),
  status: 'proposal-not-imported',
  baseline: { regions: relative(regionsPath), ...digest },
  parent: district,
  featureCount: databaseFeatures.length,
  features: databaseFeatures,
};

const cameraManifest = {
  schemaVersion: 1,
  id: 'ravenrock-t2b-wave2-same-camera-contract',
  generatedAtUtc: new Date().toISOString(),
  programId: PACKAGE.programId,
  packageId: PACKAGE.packageId,
  primaryFeatureId: PACKAGE.featureId,
  baseline: { regions: relative(regionsPath), ...digest },
  sourceOperation: relative(operationPath),
  capturePolicy: {
    renderer: 'scripts/world_render.mjs',
    dimensions: [1280, 720],
    fieldOfView: 72,
    sameCameraBeforeAfter: true,
    exactPrimaryFeatureRelation: true,
    evidenceState: 'camera-contract-only-images-not-yet-captured',
  },
  cameras: [
    {
      id: 'RR-T2B-W2-WEST-TO-EAST',
      role: 'approach-and-section-proof',
      eye: [-149, 5, 190],
      lookAt: [-138, 4, 183],
      fov: 72,
      output: 't2b-west-to-east.png',
    },
    {
      id: 'RR-T2B-W2-EAST-TO-WEST',
      role: 'reverse-walk-and-section-proof',
      eye: [-132, 4, 179],
      lookAt: [-142, 4, 186],
      fov: 72,
      output: 't2b-east-to-west.png',
    },
    {
      id: 'RR-T2B-W2-CAVE-WINDOW',
      role: 'intentional-window-and-route-edge-proof',
      eye: [-142, 4, 184],
      lookAt: [-140, 4, 190],
      fov: 68,
      output: 't2b-intentional-cave-window.png',
    },
    {
      id: 'RR-T2B-W2-SECTION',
      role: 'five-wide-five-high-cross-section-proof',
      eye: [-139, 4.5, 184],
      lookAt: [-145, 4.5, 187],
      fov: 65,
      output: 't2b-section.png',
    },
    {
      id: 'RR-T2B-W2-AQUIFER-EXCLUSION',
      role: 'excluded-wet-threshold-context',
      eye: [-132, 5, 175],
      lookAt: [-136, 4, 181],
      fov: 72,
      output: 't2b-aquifer-exclusion.png',
    },
    {
      id: 'RR-T2B-W2-OBLIQUE',
      role: 'shell-window-light-rhythm-overview',
      eye: [-148, 12, 196],
      lookAt: [-140, 4, 185],
      fov: 75,
      output: 't2b-oblique.png',
    },
  ].map((camera) => ({
    ...camera,
    primaryFeatureId: PACKAGE.featureId,
    beforeOutput:
      `data/exports/redevelopment-wave2-2026-07-28/ravenrock/before/${camera.output}`,
    afterOutput:
      `data/exports/redevelopment-wave2-2026-07-28/ravenrock/after/${camera.output}`,
  })),
};

const sectionCamera = cameraManifest.cameras.find((camera) =>
  camera.id === 'RR-T2B-W2-SECTION');
const sectionRayCells = [];
for (let step = 0; step <= 48; step += 1) {
  const fraction = step / 48;
  const point = sectionCamera.eye.map((value, index) => Math.floor(
    value + (sectionCamera.lookAt[index] - value) * fraction,
  ));
  const pointId = point.join(',');
  if (sectionRayCells.some((entry) => entry.point.join(',') === pointId)) continue;
  sectionRayCells.push({ point, block: await blockAt(...point) });
}
sectionCamera.visibilityRay = {
  sampleCount: sectionRayCells.length,
  cells: sectionRayCells,
  unobstructed: sectionRayCells.every((cell) => isAir(cell.block)),
};
if (!sectionCamera.visibilityRay.unobstructed) {
  throw new Error(
    `section camera ray is obstructed: ${JSON.stringify(sectionRayCells)}`,
  );
}

const countsByRole = {};
const desiredCounts = {};
const sourceCounts = {};
for (const cell of changes) {
  countsByRole[cell.role] = (countsByRole[cell.role] ?? 0) + 1;
  desiredCounts[cell.desired] = (desiredCounts[cell.desired] ?? 0) + 1;
  sourceCounts[cell.source] = (sourceCounts[cell.source] ?? 0) + 1;
}

const prestate = {
  schemaVersion: 1,
  packageId: PACKAGE.packageId,
  baseline: { regions: relative(regionsPath), ...digest },
  package: PACKAGE,
  centerline: CENTERLINE,
  designCells,
  safety: {
    buffer: PACKAGE.safetyBuffer,
    chunks: safety.chunks,
    counts: safety.counts,
    hazards: safety.hazards,
    supportDependent: safety.supportDependent,
    blockEntities,
    targetHazards,
    faceAdjacentHazards,
  },
};

const report = {
  schemaVersion: 1,
  id: 'ravenrock-t2b-liner-pilot-wave2-2026-07-28',
  generatedAtUtc: new Date().toISOString(),
  programId: PACKAGE.programId,
  packageId: PACKAGE.packageId,
  featureId: PACKAGE.featureId,
  status: 'generated-awaiting-independent-qa-and-live-gates',
  baseline: { regions: relative(regionsPath), ...digest },
  design: {
    routeId: PACKAGE.routeId,
    stationRange: PACKAGE.stationRange,
    stationCount: CENTERLINE.length,
    centerline: CENTERLINE,
    clearWidth: PACKAGE.clearWidth,
    clearHeight: PACKAGE.clearHeight,
    shellBounds: PACKAGE.shellBounds,
    safetyBuffer: PACKAGE.safetyBuffer,
    sectionMaterials: {
      floor: 'minecraft:stone_bricks',
      sideLiner: 'minecraft:polished_deepslate',
      habitationRouteBand: 'minecraft:bricks',
      ceiling: 'minecraft:stone_bricks',
      ceilingLights: 'minecraft:sea_lantern',
      intentionalCaveWindow: 'minecraft:tinted_glass',
    },
    lightStationsX: [-144, -140, -136],
    caveWindowStationsX: [-141, -140, -139],
    grade:
      'One block of vertical change after three horizontal stations; no jump '
      + 'geometry is added and the existing stone-brick tread is preserved.',
    standards: [
      'TU-01 public primary spine',
      'TU-02 complete section family',
      'TU-03 deliberate tunnel-within-cavern alignment',
      'TU-04 repeatable lighting rhythm',
      'TU-05 fluid/cave adjacency evidence',
      'TU-06 bidirectional experience test pending live execution',
      'WF-03 route confirmation rhythm',
      'WF-04 H / amber-brick Habitation route identity',
      'QA-01 exact atomic package',
    ],
    selectedAlternative:
      'Ten-station dry additive shell ending at x=-136.',
    rejectedAlternatives: [
      {
        alternative: 'Eleven stations through x=-135',
        reason:
          'Active aquifer water at x=-135/-134,z177..179,y1..9 makes '
          + 'the terminal shell fluid-adjacent and unsuitable for this dry pilot.',
      },
      {
        alternative: 'Normalize all T2b in one package',
        reason:
          'The route occupies a large natural cavern. One global shell/fill '
          + 'would obscure thresholds, magnify rollback scope, and risk overfill.',
      },
      {
        alternative: 'Excavate a new straight tube',
        reason:
          'The observed stone-brick tread is continuous and follows the creative '
          + 'dogleg. Excavation is unnecessary and would destroy as-built logic.',
      },
    ],
  },
  accounting: {
    designCells: designCells.length,
    unchangedDesignCells: designCells.length - changes.length,
    forwardOperations: changes.length,
    rollbackOperations: rollbackLines.length,
    uniqueTargets: targetKeys.size,
    additionOnly: changes.every((cell) => isAir(cell.source)),
    countsByRole,
    desiredCounts,
    sourceCounts,
  },
  safety: {
    bufferCellCount: safety.cells.size,
    chunks: safety.chunks,
    blockEntityCount: blockEntities.count,
    targetHazardCount: targetHazards.length,
    faceAdjacentTargetHazardCount: faceAdjacentHazards.length,
    bufferFluidOrGravityHazardCount: safety.hazards.length,
    bufferHazards: safety.hazards,
    bufferSupportDependentCount: safety.supportDependent.length,
    bufferSupportDependent: safety.supportDependent,
    aquiferDisposition:
      'Observed, retained, and excluded. No target is fluid or face-adjacent to fluid.',
    databaseIntersections,
    hardY41Guard: Math.max(...changes.map((cell) => cell.point[1])) <= 41,
  },
  exclusions: {
    liveWorldMutation: false,
    databaseWrites: false,
    acceptedS1PilotTargets: false,
    rrZ5Targets: false,
    t4BulkheadTargets: false,
    xMinus135WetThresholdTargets: false,
    excavation: false,
    setOrCmdOperations: false,
  },
  artifacts: {
    operations: relative(operationPath),
    rollback: relative(rollbackPath),
    prestate: relative(prestatePath),
    report: relative(reportPath),
    inventory: relative(inventoryPath),
    databaseFeatures: relative(databasePath),
    cameraManifest: relative(camerasPath),
    independentQa: `${relative(basePath)}.qa.json`,
    preflight: `${relative(basePath)}.preflight.json`,
    dryRun: `${relative(basePath)}.dry-run.json`,
  },
  databaseFeatures: {
    proposalPath: relative(databasePath),
    proposalCount: databaseFeatures.length,
    imported: false,
    packageFeatureExternalId: PACKAGE.featureId,
  },
  cameras: {
    manifest: relative(camerasPath),
    cameraCount: cameraManifest.cameras.length,
    imagesCaptured: 0,
  },
  mandatoryLiveGates: [
    'pause fleet and clear players/free entities from operation buffer',
    'save-all flush and freeze a same-moment immutable pre-release snapshot',
    'require all exact forward guards against that same snapshot',
    'reject if the aquifer advances or any target becomes fluid-adjacent',
    'execute as a separately ordered transaction with automatic rollback',
    'save-all flush and freeze post snapshot',
    'require every rollback guard to match the installed state',
    'normal-walk both directions without dig, jump, sprint, tower, or crouch',
    'capture all six same-camera after views and import database/media only after PASS',
  ],
};

for (const filename of [
  operationPath,
  rollbackPath,
  prestatePath,
  reportPath,
  inventoryPath,
  databasePath,
  camerasPath,
]) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
}
fs.writeFileSync(operationPath, operationText);
fs.writeFileSync(rollbackPath, rollbackText);
fs.writeFileSync(prestatePath, `${JSON.stringify(prestate, null, 2)}\n`);
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`);
fs.writeFileSync(databasePath, `${JSON.stringify(databasePayload, null, 2)}\n`);
fs.writeFileSync(camerasPath, `${JSON.stringify(cameraManifest, null, 2)}\n`);

const operationSha256 = sha256(fs.readFileSync(operationPath));
const rollbackSha256 = sha256(fs.readFileSync(rollbackPath));
console.log(JSON.stringify({
  packageId: PACKAGE.packageId,
  status: report.status,
  baselineSha256: digest.sha256,
  stations: CENTERLINE.length,
  designCells: designCells.length,
  forwardOperations: forwardLines.length,
  rollbackOperations: rollbackLines.length,
  operationSha256,
  rollbackSha256,
  bufferHazards: safety.hazards.length,
  targetHazards: targetHazards.length,
  faceAdjacentTargetHazards: faceAdjacentHazards.length,
  databaseFeatureProposals: databaseFeatures.length,
  cameras: cameraManifest.cameras.length,
  outputs: report.artifacts,
}, null, 2));
