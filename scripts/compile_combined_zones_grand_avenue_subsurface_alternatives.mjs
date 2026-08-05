#!/usr/bin/env node
/**
 * Compile the deterministic, offline Grand Avenue subsurface no-foreclosure
 * alternatives record.
 *
 * This compiler reads only committed planning evidence and the immutable copied
 * Phase 0 Anvil region. It emits screening geometry and current-state evidence,
 * never construction cells, future states, ownership, or Minecraft operations.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import nbt from 'prismarine-nbt';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

const GENERATED_AT = value('--generated-at', '2026-08-05T01:30:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-grand-avenue-subsurface-alternatives.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-grand-avenue-subsurface-alternatives.md',
));

const INPUTS = Object.freeze({
  b11: 'docs/masterplans/05-combined-zones/phase1-b11-external-interface-acceptance.json',
  phase0: 'docs/masterplans/05-combined-zones/phase0-survey-evidence.json',
  geometry: 'docs/masterplans/05-combined-zones/phase1-geometry-coordination.json',
  coordinates: 'docs/masterplans/05-combined-zones/site-coordinates.json',
  protectedRelics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  d02: 'docs/masterplans/05-combined-zones/phase1-d02-owner-acceptance-packet.json',
  d06: 'docs/masterplans/05-combined-zones/phase1-d06-owner-acceptance-packet.json',
  releaseContract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
});

const WORLD_MIN_Y = -64;
const WORLD_MAX_Y = 319;
const SCREENING_RADIUS = 4;
const SHALLOW_BAND_HEIGHT = 8;
const COLUMN_HASH_PREAMBLE = 'combined-zones-grand-avenue-subsurface-screening-columns-v1';
const CELL_HASH_PREAMBLE = 'combined-zones-grand-avenue-subsurface-screening-cells-v1';
const STATE_HASH_PREAMBLE = 'combined-zones-grand-avenue-subsurface-current-states-v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`Grand Avenue subsurface input rejected: ${message}`);
}

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function relative(filename) {
  return path.relative(ROOT, filename);
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8'));
}

function fileBinding(relativePath, role) {
  const data = fs.readFileSync(absolute(relativePath));
  return {
    path: relativePath,
    sha256: sha256(data),
    bytes: data.length,
    role,
  };
}

function snapshotIdentity(directory) {
  const names = fs.readdirSync(directory).filter((name) => name.endsWith('.mca')).sort();
  const digest = crypto.createHash('sha256');
  let bytes = 0;
  for (const name of names) {
    const data = fs.readFileSync(path.join(directory, name));
    bytes += data.length;
    digest.update(name);
    digest.update('\0');
    digest.update(data);
    digest.update('\0');
  }
  return {
    path: relative(directory),
    sha256: digest.digest('hex'),
    regionFileCount: names.length,
    bytes,
    algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
  };
}

function longToBig(input) {
  if (typeof input === 'bigint') return input;
  if (Array.isArray(input)) {
    return (BigInt(input[0] | 0) << 32n) | BigInt(input[1] >>> 0);
  }
  if (input && typeof input === 'object' && 'high' in input && 'low' in input) {
    return (BigInt(input.high | 0) << 32n) | BigInt(input.low >>> 0);
  }
  return BigInt(input);
}

function packedValue(values, bits, index) {
  if (!values?.length) return 0;
  const perLong = Math.floor(64 / bits);
  const longIndex = Math.floor(index / perLong);
  if (longIndex >= values.length) return 0;
  const shift = BigInt((index % perLong) * bits);
  return Number((longToBig(values[longIndex]) >> shift) & ((1n << BigInt(bits)) - 1n));
}

function paletteIndex(container, index, minimumBits) {
  if (!container?.palette?.length || container.palette.length === 1) return 0;
  return packedValue(
    container.data,
    Math.max(minimumBits, Math.ceil(Math.log2(container.palette.length))),
    index,
  );
}

function decompress(type, data) {
  if (type === 1) return zlib.gunzipSync(data);
  if (type === 2) return zlib.inflateSync(data);
  if (type === 3) return data;
  if (type === 4) return zlib.brotliDecompressSync(data);
  throw new Error(`unsupported Anvil compression type ${type}`);
}

class SnapshotReader {
  constructor(directory) {
    this.directory = directory;
    this.regions = new Map();
    this.chunks = new Map();
  }

  regionBuffer(rx, rz) {
    const key = `${rx},${rz}`;
    if (this.regions.has(key)) return this.regions.get(key);
    const filename = path.join(this.directory, `r.${rx}.${rz}.mca`);
    let buffer = null;
    try {
      buffer = fs.readFileSync(filename);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    this.regions.set(key, buffer);
    return buffer;
  }

  async readChunk(cx, cz) {
    const key = `${cx},${cz}`;
    if (this.chunks.has(key)) return this.chunks.get(key);
    const buffer = this.regionBuffer(Math.floor(cx / 32), Math.floor(cz / 32));
    if (!buffer) {
      this.chunks.set(key, null);
      return null;
    }
    const index = ((cx & 31) + (cz & 31) * 32) * 4;
    const sectorOffset = buffer.readUIntBE(index, 3);
    const sectorCount = buffer[index + 3];
    if (!sectorOffset || !sectorCount) {
      this.chunks.set(key, null);
      return null;
    }
    const offset = sectorOffset * 4096;
    const length = buffer.readUInt32BE(offset);
    const compression = buffer.readUInt8(offset + 4);
    invariant(!(compression & 0x80), `external chunk storage unsupported at ${cx},${cz}`);
    const { parsed } = await nbt.parse(decompress(
      compression,
      buffer.subarray(offset + 5, offset + 4 + length),
    ));
    const raw = nbt.simplify(parsed);
    const sections = new Map((raw.sections ?? []).map((section) => [Number(section.Y), section]));
    const chunk = { cx, cz, raw, sections };
    this.chunks.set(key, chunk);
    return chunk;
  }

  stateAt(chunk, x, y, z) {
    const states = chunk?.sections.get(Math.floor(y / 16))?.block_states;
    if (!states?.palette?.length) return { Name: 'minecraft:air' };
    const index = ((y & 15) << 8) | ((z & 15) << 4) | (x & 15);
    return states.palette[paletteIndex(states, index, 4)] ?? { Name: 'minecraft:air' };
  }

  biomeAt(chunk, x, y, z) {
    const biomes = chunk?.sections.get(Math.floor(y / 16))?.biomes;
    if (!biomes?.palette?.length) return null;
    const index = (((y & 15) >> 2) << 4) | (((z & 15) >> 2) << 2) | ((x & 15) >> 2);
    return biomes.palette[paletteIndex(biomes, index, 1)] ?? null;
  }
}

const AIR = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
  'minecraft:light',
  'minecraft:structure_void',
  'minecraft:moving_piston',
]);

const WATER = new Set(['minecraft:water', 'minecraft:bubble_column']);

function canonicalState(state) {
  const properties = Object.entries(state?.Properties ?? state?.properties ?? {})
    .sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify({
    Name: state?.Name ?? 'minecraft:air',
    ...(properties.length ? { Properties: Object.fromEntries(properties) } : {}),
  });
}

function isWaterlogged(state) {
  const properties = state?.Properties ?? state?.properties ?? {};
  return properties.waterlogged === 'true' || properties.waterlogged === true;
}

function fluidFamily(state) {
  if (state?.Name === 'minecraft:lava') return 'lava';
  if (WATER.has(state?.Name) || isWaterlogged(state)) return 'water';
  return null;
}

function isOrganicSurfaceFeature(name) {
  return /(_leaves|_log|_wood|_stem|_hyphae|_sapling|_mushroom_block)$/.test(name)
    || /^minecraft:(mangrove_roots|muddy_mangrove_roots|bamboo|vine|cocoa|short_grass|tall_grass|fern|large_fern|dead_bush|lily_pad|leaf_litter|seagrass|tall_seagrass|kelp|kelp_plant|sea_pickle|moss_carpet|pale_moss_carpet|pale_hanging_moss|pink_petals|wildflowers|brown_mushroom|red_mushroom)$/.test(name)
    || /(_flower|_tulip|mushroom|dandelion|poppy|allium|azure_bluet|orchid|peony|sunflower|lilac|rose_bush|cornflower|lily_of_the_valley)$/.test(name);
}

function isGravitySensitive(name) {
  return name === 'minecraft:sand'
    || name === 'minecraft:red_sand'
    || name === 'minecraft:gravel'
    || name === 'minecraft:dragon_egg'
    || name === 'minecraft:scaffolding'
    || name.endsWith('_concrete_powder')
    || name.endsWith('_anvil');
}

function rasterLine(from, to) {
  let x = from.x;
  let z = from.z;
  const dx = Math.abs(to.x - from.x);
  const dz = Math.abs(to.z - from.z);
  const sx = from.x < to.x ? 1 : -1;
  const sz = from.z < to.z ? 1 : -1;
  let error = dx - dz;
  const points = [];
  for (;;) {
    points.push({ x, z });
    if (x === to.x && z === to.z) break;
    const doubled = 2 * error;
    if (doubled > -dz) {
      error -= dz;
      x += sx;
    }
    if (doubled < dx) {
      error += dx;
      z += sz;
    }
  }
  return points;
}

function compareColumns(left, right) {
  return left.x - right.x || left.z - right.z;
}

function compareCells(left, right) {
  return left.x - right.x || left.y - right.y || left.z - right.z;
}

function columnKey(x, z) {
  return `${x},${z}`;
}

function pointKey(x, y, z) {
  return `${x},${y},${z}`;
}

function hashColumns(columns) {
  const digest = crypto.createHash('sha256');
  digest.update(`${COLUMN_HASH_PREAMBLE}\n`);
  for (const column of [...columns].sort(compareColumns)) digest.update(`${column.x},${column.z}\n`);
  return digest.digest('hex');
}

function hashCells(cells, preamble = CELL_HASH_PREAMBLE) {
  const digest = crypto.createHash('sha256');
  digest.update(`${preamble}\n`);
  for (const cell of [...cells].sort(compareCells)) digest.update(`${cell.x},${cell.y},${cell.z}\n`);
  return digest.digest('hex');
}

function hashStateCells(cells, preamble = STATE_HASH_PREAMBLE) {
  const digest = crypto.createHash('sha256');
  digest.update(`${preamble}\n`);
  for (const cell of [...cells].sort(compareCells)) {
    digest.update(`${cell.x},${cell.y},${cell.z}\t${cell.state}\n`);
  }
  return digest.digest('hex');
}

function boundsOfColumns(columns) {
  return {
    minX: Math.min(...columns.map(({ x }) => x)),
    maxX: Math.max(...columns.map(({ x }) => x)),
    minZ: Math.min(...columns.map(({ z }) => z)),
    maxZ: Math.max(...columns.map(({ z }) => z)),
  };
}

function boundsOfCells(cells) {
  return {
    ...boundsOfColumns(cells),
    minY: Math.min(...cells.map(({ y }) => y)),
    maxY: Math.max(...cells.map(({ y }) => y)),
  };
}

function increment(record, key, amount = 1) {
  record[key] = (record[key] ?? 0) + amount;
}

function sortedCounts(record) {
  return Object.fromEntries(Object.entries(record).sort(([left], [right]) => left.localeCompare(right)));
}

function insideHalfOpen(cell, bounds) {
  return cell.x >= bounds.minXInclusive && cell.x < bounds.maxXExclusive
    && cell.y >= bounds.minYInclusive && cell.y < bounds.maxYExclusive
    && cell.z >= bounds.minZInclusive && cell.z < bounds.maxZExclusive;
}

function columnInsideInclusive(column, bounds) {
  return column.x >= bounds.minX && column.x <= bounds.maxX
    && column.z >= bounds.minZ && column.z <= bounds.maxZ;
}

function distancePointToInclusiveBox(point, bounds) {
  const dx = point.x < bounds.minX
    ? bounds.minX - point.x
    : point.x > bounds.maxX ? point.x - bounds.maxX : 0;
  const dz = point.z < bounds.minZ
    ? bounds.minZ - point.z
    : point.z > bounds.maxZ ? point.z - bounds.maxZ : 0;
  return Math.hypot(dx, dz);
}

function nearestRouteToPoint(route, point) {
  return route.reduce((best, candidate) => {
    const distance = Math.hypot(candidate.x - point.x, candidate.z - point.z);
    return !best || distance < best.distance
      ? { ...candidate, distance: Number(distance.toFixed(6)) }
      : best;
  }, null);
}

const b11 = readJson(INPUTS.b11);
const phase0 = readJson(INPUTS.phase0);
const geometry = readJson(INPUTS.geometry);
const coordinates = readJson(INPUTS.coordinates);
const protectedRelics = readJson(INPUTS.protectedRelics);
const d02 = readJson(INPUTS.d02);
const d06 = readJson(INPUTS.d06);
const releaseContract = readJson(INPUTS.releaseContract);

invariant(b11.id === 'combined-zones-phase1-b11-external-interface-acceptance', 'unexpected B11 packet');
invariant(b11.acceptancePayload?.grandAvenue?.centerlinePointCount === 299, 'B11 point count drift');
invariant(b11.acceptancePayload.grandAvenue.centerlineSha256
  === 'e63b7779674ad46fd7ad9c4ae0aea8f618afa8b656d3a24aa4367057cf103ff4',
'B11 centerline identity drift');
invariant(b11.safetyBoundary?.operationCellCount === 0, 'B11 unexpectedly contains operations');
invariant(phase0.id === 'combined-zones-phase0-survey-evidence', 'unexpected Phase 0 evidence');
invariant(protectedRelics.g06Disposition?.status === 'HOLD', 'protected-feature gate unexpectedly passed');
invariant(d02.safetyBoundary?.d02Resolved === false, 'D02 unexpectedly resolved');
invariant(d06.disposition?.d06Resolved === false, 'D06 unexpectedly resolved');

const snapshotPath = phase0.snapshots.postGeneration.path;
const immutableSnapshot = snapshotIdentity(absolute(snapshotPath));
invariant(immutableSnapshot.sha256 === phase0.snapshots.postGeneration.sha256, 'snapshot SHA-256 drift');
invariant(immutableSnapshot.sha256
  === protectedRelics.sourceBindings.immutablePhase0PostRegionSnapshot.sha256,
'protected evidence snapshot drift');

const grand = b11.acceptancePayload.grandAvenue;
const plan = rasterLine(grand.start, grand.end);
const route = plan.map((point, station) => ({
  station,
  x: point.x,
  y: 68 + Math.round((4 * station) / (plan.length - 1)),
  z: point.z,
}));
const routeManifest = `${route.map((point) => `${point.x},${point.y},${point.z}`).join('\n')}\n`;
invariant(sha256(routeManifest) === grand.centerlineSha256, 'recomputed B11 profile hash drift');

const footprintMap = new Map();
for (const point of route) {
  for (let dx = -SCREENING_RADIUS; dx <= SCREENING_RADIUS; dx++) {
    for (let dz = -SCREENING_RADIUS; dz <= SCREENING_RADIUS; dz++) {
      footprintMap.set(columnKey(point.x + dx, point.z + dz), {
        x: point.x + dx,
        z: point.z + dz,
      });
    }
  }
}
const footprint = [...footprintMap.values()].sort(compareColumns);
const footprintKeys = new Set(footprintMap.keys());
const footprintBounds = boundsOfColumns(footprint);

const nearestStationByColumn = new Map();
for (const column of footprint) {
  let nearest = null;
  for (const point of route) {
    const distanceSquared = (point.x - column.x) ** 2 + (point.z - column.z) ** 2;
    if (!nearest || distanceSquared < nearest.distanceSquared
      || (distanceSquared === nearest.distanceSquared && point.station < nearest.station)) {
      nearest = { ...point, distanceSquared };
    }
  }
  nearestStationByColumn.set(columnKey(column.x, column.z), nearest);
}

const bandRangeByColumn = new Map([...nearestStationByColumn.entries()].map(([key, point]) => [
  key,
  {
    station: point.station,
    roadY: point.y,
    minY: point.y - SHALLOW_BAND_HEIGHT,
    maxY: point.y - 1,
  },
]));

const reader = new SnapshotReader(absolute(snapshotPath));
const neededChunks = new Map();
for (const column of footprint) {
  const cx = Math.floor(column.x / 16);
  const cz = Math.floor(column.z / 16);
  neededChunks.set(`${cx},${cz}`, { cx, cz });
}
const missingChunks = [];
for (const chunkCoordinate of [...neededChunks.values()].sort((left, right) => (
  left.cx - right.cx || left.cz - right.cz
))) {
  if (!await reader.readChunk(chunkCoordinate.cx, chunkCoordinate.cz)) missingChunks.push(chunkCoordinate);
}
invariant(missingChunks.length === 0, 'screening footprint has missing chunks');

const fullCoordinateDigest = crypto.createHash('sha256');
const fullStateDigest = crypto.createHash('sha256');
const fluidCoordinateDigest = crypto.createHash('sha256');
const fluidStateDigest = crypto.createHash('sha256');
fullCoordinateDigest.update(`${CELL_HASH_PREAMBLE}-full-height\n`);
fullStateDigest.update(`${STATE_HASH_PREAMBLE}-full-height\n`);
fluidCoordinateDigest.update(`${CELL_HASH_PREAMBLE}-fluids\n`);
fluidStateDigest.update(`${STATE_HASH_PREAMBLE}-fluids\n`);

const stateCounts = {};
const fluidCounts = { water: 0, lava: 0, waterlogged: 0 };
const surfaceByColumn = new Map(footprint.map((column) => [columnKey(column.x, column.z), {
  x: column.x,
  z: column.z,
  worldSurfaceY: null,
  worldSurfaceState: null,
  terrainY: null,
  terrainState: null,
  waterCellCount: 0,
  lavaCellCount: 0,
}]));
const bandCells = [];
let airCellCount = 0;
let presentCellCount = 0;
let gravitySensitiveCellCount = 0;

for (let x = footprintBounds.minX; x <= footprintBounds.maxX; x++) {
  for (let y = WORLD_MIN_Y; y <= WORLD_MAX_Y; y++) {
    for (let z = footprintBounds.minZ; z <= footprintBounds.maxZ; z++) {
      const key = columnKey(x, z);
      if (!footprintKeys.has(key)) continue;
      const chunk = reader.chunks.get(`${Math.floor(x / 16)},${Math.floor(z / 16)}`);
      const rawState = reader.stateAt(chunk, x, y, z);
      const state = canonicalState(rawState);
      const name = rawState.Name ?? 'minecraft:air';
      const fluid = fluidFamily(rawState);
      fullCoordinateDigest.update(`${x},${y},${z}\n`);
      fullStateDigest.update(`${x},${y},${z}\t${state}\n`);
      increment(stateCounts, state);
      if (AIR.has(name)) airCellCount++;
      else presentCellCount++;
      if (isGravitySensitive(name)) gravitySensitiveCellCount++;
      const surface = surfaceByColumn.get(key);
      if (!AIR.has(name)) {
        surface.worldSurfaceY = y;
        surface.worldSurfaceState = state;
      }
      if (!AIR.has(name) && !isOrganicSurfaceFeature(name) && !fluid) {
        surface.terrainY = y;
        surface.terrainState = state;
      }
      if (fluid) {
        fluidCounts[fluid]++;
        if (isWaterlogged(rawState)) fluidCounts.waterlogged++;
        surface[`${fluid}CellCount`]++;
        fluidCoordinateDigest.update(`${x},${y},${z}\n`);
        fluidStateDigest.update(`${x},${y},${z}\t${state}\n`);
      }
      const range = bandRangeByColumn.get(key);
      if (y >= range.minY && y <= range.maxY) {
        bandCells.push({ x, y, z, state, name, fluid, station: range.station, roadY: range.roadY });
      }
    }
  }
}

for (const surface of surfaceByColumn.values()) {
  invariant(surface.terrainY !== null, `no terrain found at ${surface.x},${surface.z}`);
  const chunk = reader.chunks.get(`${Math.floor(surface.x / 16)},${Math.floor(surface.z / 16)}`);
  surface.biome = reader.biomeAt(chunk, surface.x, surface.terrainY, surface.z);
}

const blockEntities = [];
for (const chunk of reader.chunks.values()) {
  for (const entity of chunk?.raw?.block_entities ?? []) {
    const x = Number(entity.x);
    const y = Number(entity.y);
    const z = Number(entity.z);
    if (!footprintKeys.has(columnKey(x, z)) || y < WORLD_MIN_Y || y > WORLD_MAX_Y) continue;
    blockEntities.push({ x, y, z, id: entity.id ?? 'unknown' });
  }
}
blockEntities.sort(compareCells);
const blockEntityDigest = crypto.createHash('sha256');
blockEntityDigest.update('combined-zones-grand-avenue-subsurface-block-entities-v1\n');
for (const entity of blockEntities) {
  blockEntityDigest.update(`${entity.x},${entity.y},${entity.z}\t${entity.id}\n`);
}

const centerlineTerrain = route.map((point) => {
  const surface = surfaceByColumn.get(columnKey(point.x, point.z));
  return {
    ...point,
    worldSurfaceY: surface.worldSurfaceY,
    worldSurfaceState: surface.worldSurfaceState,
    terrainY: surface.terrainY,
    terrainState: surface.terrainState,
    biome: surface.biome,
    roadMinusTerrain: point.y - surface.terrainY,
    waterCellCount: surface.waterCellCount,
    lavaCellCount: surface.lavaCellCount,
  };
});
const terrainDigest = crypto.createHash('sha256');
terrainDigest.update('combined-zones-grand-avenue-centerline-terrain-profile-v1\n');
for (const point of centerlineTerrain) {
  terrainDigest.update(`${point.station}\t${point.x},${point.y},${point.z}`
    + `\tterrain=${point.terrainY}\t${point.terrainState}`
    + `\tsurface=${point.worldSurfaceY}\t${point.worldSurfaceState}`
    + `\tbiome=${point.biome ?? 'null'}\n`);
}

const bandStateCounts = {};
const bandFluidCounts = { water: 0, lava: 0, waterlogged: 0 };
let bandAirCellCount = 0;
let bandGravitySensitiveCellCount = 0;
for (const cell of bandCells) {
  increment(bandStateCounts, cell.state);
  if (AIR.has(cell.name)) bandAirCellCount++;
  if (cell.fluid) bandFluidCounts[cell.fluid]++;
  if (cell.state.includes('"waterlogged":"true"')) bandFluidCounts.waterlogged++;
  if (isGravitySensitive(cell.name)) bandGravitySensitiveCellCount++;
}

const surfaceRelationships = [...surfaceByColumn.values()].map((surface) => {
  const range = bandRangeByColumn.get(columnKey(surface.x, surface.z));
  return {
    terrainMinusCandidateRoof: surface.terrainY - range.maxY,
    terrainMinusRoad: surface.terrainY - range.roadY,
  };
});

const houstonSample = geometry.compiledCoordinationGeometry.normalized04EnvelopeCellSets
  .find((item) => item.id === 'houston-tunnel-sample');
invariant(houstonSample, 'Houston tunnel sample envelope missing');
const houstonBounds = houstonSample.exactCoordinationCellSet.bounds;
const houstonBandIntersection = bandCells.filter((cell) => insideHalfOpen(cell, houstonBounds));
const houstonCenterlinePoints = route.filter((point) => (
  point.x >= houstonBounds.minXInclusive && point.x < houstonBounds.maxXExclusive
  && point.z >= houstonBounds.minZInclusive && point.z < houstonBounds.maxZExclusive
));

const structureScreening = phase0.generatedStructureStarts.map((structure) => {
  const bounds = structure.bounds;
  const footprintColumns = bounds
    ? footprint.filter((column) => columnInsideInclusive(column, bounds))
    : [];
  const bandIntersection = bounds
    ? bandCells.filter((cell) => cell.x >= bounds.minX && cell.x <= bounds.maxX
      && cell.y >= bounds.minY && cell.y <= bounds.maxY
      && cell.z >= bounds.minZ && cell.z <= bounds.maxZ)
    : [];
  const routePoints = bounds
    ? route.filter((point) => columnInsideInclusive(point, bounds))
    : [];
  const nearestPlanDistance = bounds
    ? Math.min(...route.map((point) => distancePointToInclusiveBox(point, bounds)))
    : null;
  return {
    id: structure.id,
    bounds,
    startChunk: { x: structure.chunkX, z: structure.chunkZ },
    footprintColumnIntersectionCount: footprintColumns.length,
    shallowScreeningBandIntersectionCellCount: bandIntersection.length,
    centerlineStationRange: routePoints.length ? {
      first: routePoints[0].station,
      last: routePoints.at(-1).station,
    } : null,
    nearestCenterlinePlanDistanceBlocks: nearestPlanDistance === null
      ? null
      : Number(nearestPlanDistance.toFixed(6)),
    qualification: 'A generated structure-start bound is a coordination constraint, not proof of present fabric or a reviewed construction-influence distance.',
  };
}).filter((item) => item.footprintColumnIntersectionCount > 0
  || (item.nearestCenterlinePlanDistanceBlocks ?? Infinity) <= 16)
  .sort((left, right) => left.nearestCenterlinePlanDistanceBlocks
    - right.nearestCenterlinePlanDistanceBlocks || left.id.localeCompare(right.id));

const protectedScreening = protectedRelics.relics.map((relic) => {
  const bounds = relic.declaredInclusiveBounds;
  const footprintIntersection = footprint.filter((column) => columnInsideInclusive(column, bounds));
  const nearest = Math.min(...route.map((point) => distancePointToInclusiveBox(point, bounds)));
  return {
    key: relic.key,
    structureId: relic.structureId,
    declaredInclusiveBounds: bounds,
    defaultDenyCoreCellCount: relic.evidenceBackedDefaultDenyCore.cellCount,
    defaultDenyCoreCoordinateSetSha256:
      relic.evidenceBackedDefaultDenyCore.coordinateSetSha256,
    positiveMarginStatus: relic.positiveMarginBuffer.status,
    screeningFootprintIntersectionColumnCount: footprintIntersection.length,
    nearestCenterlinePlanDistanceBlocks: Number(nearest.toFixed(6)),
  };
});

const z02 = coordinates.zones.find((zone) => zone.id === 'Z02');
const c4 = coordinates.connections.find((connection) => connection.id === 'C4');
invariant(z02 && c4, 'C4/Empty Eight registry evidence missing');
const terminal = z02.hiddenSubway.terminal;
const terminalNearestPlanDistance = Math.min(...route.map((point) => {
  const dx = point.x < terminal.bounds.minX
    ? terminal.bounds.minX - point.x
    : point.x > terminal.bounds.maxX ? point.x - terminal.bounds.maxX : 0;
  const dz = point.z < terminal.bounds.minZ
    ? terminal.bounds.minZ - point.z
    : point.z > terminal.bounds.maxZ ? point.z - terminal.bounds.maxZ : 0;
  return Math.hypot(dx, dz);
}));
const nearestFutureWall = terminal.trackCenterlinesZ.flatMap((z) => [
  { x: terminal.futureInterfaces.westThroatX, y: terminal.railY, z },
  { x: terminal.futureInterfaces.eastStubX, y: terminal.railY, z },
]).map((point) => ({ point, nearest: nearestRouteToPoint(route, point) }))
  .sort((left, right) => left.nearest.distance - right.nearest.distance)[0];

const d02OpenGaps = d02.evidenceGaps.map(({ id, missing }) => ({ id, missing }));
const d06HoldCriteria = d06.acceptanceCriteria.filter(({ status }) => status === 'HOLD')
  .map(({ id, subject, holdReason }) => ({ id, subject, holdReason }));

const sourceBindings = {
  b11: fileBinding(INPUTS.b11, 'exact Grand Avenue profile and external-interface truth boundary'),
  phase0: fileBinding(INPUTS.phase0, 'immutable terrain, generated-structure, and survey evidence'),
  geometry: fileBinding(INPUTS.geometry, 'vertical contract and exact Houston sample coordination envelope'),
  coordinates: fileBinding(INPUTS.coordinates, 'Z02/Z03/Z05/C4/Empty Eight registry and future-line geometry'),
  protectedRelics: fileBinding(INPUTS.protectedRelics, 'exact protected-core evidence and G06 limitations'),
  d02: fileBinding(INPUTS.d02, 'civil, geotechnical, hydrology, complete-save, and ownership limitations'),
  d06: fileBinding(INPUTS.d06, 'egress, ventilation, drainage, fire/service, mechanism, and commissioning limitations'),
  releaseContract: fileBinding(INPUTS.releaseContract, 'G03-G07 design gates and deep-shell-before-surface sequence'),
  immutablePhase0PostRegionSnapshot: immutableSnapshot,
};

const fullHeightCellCount = footprint.length * (WORLD_MAX_Y - WORLD_MIN_Y + 1);
invariant(fullHeightCellCount === airCellCount + presentCellCount, 'full-height census partition drift');
invariant(bandCells.length === footprint.length * SHALLOW_BAND_HEIGHT, 'shallow-band size drift');
invariant(protectedScreening.every((item) => item.screeningFootprintIntersectionColumnCount === 0),
  'screening footprint reaches a protected relic core');

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-grand-avenue-subsurface-alternatives',
  generatedAtUtc: GENERATED_AT,
  status: 'RESERVE_NOW_CONDITIONAL_SEALED_SHELL_BEFORE_ROAD_NO_FITOUT_ZERO_OPERATIONS',
  purpose: 'Compare Grand Avenue subsurface no-foreclosure alternatives against exact route-specific immutable evidence without accepting a tunnel, construction cells, future states, ownership, or physical work.',
  authorityBoundary: {
    planningRecommendationPreparedAutonomously: true,
    soleOwnerApprovalRecordedHere: false,
    b11OwnerApprovalStatus: b11.ownerReview.approvalStatus,
    b11AcceptancePayloadSha256: b11.authority.acceptancePayloadSha256,
    masterplan04Role: 'normalized architectural composition only',
    masterplan05Role: 'current-world placement, additive zones, interfaces, and delivery gates',
  },
  safetyBoundary: {
    offlineOnly: true,
    immutableCopiedAnvilOnly: true,
    liveCallsPerformed: [],
    proposedFutureStateRecords: [],
    operationCells: [],
    materialCells: [],
    operationCellCount: 0,
    materialCellCount: 0,
    constructionCellCount: 0,
    acceptedFutureCellCount: 0,
    canonicalOwnersAssigned: 0,
    acceptedInterfaceContracts: 0,
    executable: false,
    constructionAuthorized: false,
    worldEditAuthorized: false,
  },
  sourceBindings,
  evidenceTaxonomy: {
    BOUND_FACT: 'Copied directly from hash-bound input evidence or the immutable Anvil snapshot.',
    DETERMINISTIC_DERIVATION: 'Recomputed from bound facts under the exact method recorded here.',
    PLANNING_RECOMMENDATION: 'A no-foreclosure choice that is neither an observed fact nor technical acceptance.',
    SCREENING_GEOMETRY: 'An exact conservative audit volume that is not a future shell, owned construction set, or operation set.',
    EVIDENCE_GAP: 'A missing input that keeps physical work or fit-out on HOLD.',
  },
  b11SurfaceControl: {
    classification: 'BOUND_FACT',
    owner: grand.owner,
    pointCount: route.length,
    horizontalStepCount: grand.horizontalStepCount,
    start: route[0],
    end: route.at(-1),
    riseStations: grand.riseStations,
    crossSectionBlocks: grand.crossSectionBlocks,
    exactCrossSectionSideBiasAvailable: false,
    centerlineSha256: grand.centerlineSha256,
    qualification: 'The accepted B11 artifact is pending sole-owner acceptance; its eight-block cross-section still has no exact lateral cell convention.',
  },
  exactRouteSpecificScreening: {
    method: {
      classification: 'SCREENING_GEOMETRY',
      conservativeFootprintRule: 'Union of all integer X/Z columns within Chebyshev radius four of every B11 centerline point.',
      footprintQualification: 'The radius-four union is the smallest symmetric integer screening capture around an integer centerline for an unresolved authored eight-block section. It is deliberately one cell wider than eight and is not the eventual road or tunnel section.',
      fullHeightRule: `Read every cell at Y=${WORLD_MIN_Y}…${WORLD_MAX_Y} in every screening column.`,
      shallowBandRule: 'For each screening column, use the nearest B11 station (ties choose lower station) and screen roadY-8 through roadY-1 inclusive.',
      shallowBandQualification: 'The eight-cell vertical band tests a possible shallow continuation into the exact eight-cell-high Houston sample. It is not a structural shell, clearance, lining, or excavation design.',
      stateCanonicalization: 'JSON object with Name first and Properties keys lexicographically sorted.',
      terrainRule: 'Highest non-air, non-organic, non-fluid block in each column; world surface separately retains the highest non-air state.',
      hashOrder: 'columns: x,z; cells/states: x,y,z',
    },
    chunkCoverage: {
      requiredChunkCount: neededChunks.size,
      missingChunkCount: missingChunks.length,
      missingChunks,
    },
    conservativeFootprint: {
      classification: 'SCREENING_GEOMETRY',
      radiusBlocks: SCREENING_RADIUS,
      columnCount: footprint.length,
      bounds: footprintBounds,
      coordinateSetSha256: hashColumns(footprint),
      exactConstructionFootprintAccepted: false,
    },
    fullHeightCurrentStateCensus: {
      classification: 'BOUND_FACT_AND_DETERMINISTIC_DERIVATION',
      minY: WORLD_MIN_Y,
      maxY: WORLD_MAX_Y,
      cellCount: fullHeightCellCount,
      coordinateSetSha256: fullCoordinateDigest.digest('hex'),
      blockStateSetSha256: fullStateDigest.digest('hex'),
      airCellCount,
      presentCellCount,
      gravitySensitiveCellCount,
      fluidCells: {
        ...fluidCounts,
        coordinateSetSha256: fluidCoordinateDigest.digest('hex'),
        blockStateSetSha256: fluidStateDigest.digest('hex'),
      },
      canonicalStateCounts: sortedCounts(stateCounts),
      blockEntities: {
        count: blockEntities.length,
        manifestSha256: blockEntityDigest.digest('hex'),
        records: blockEntities,
        qualification: 'The copied region contains block entities but no entity-region, POI, or level.dat evidence.',
      },
    },
    centerlineTerrainProfile: {
      classification: 'BOUND_FACT_AND_DETERMINISTIC_DERIVATION',
      pointCount: centerlineTerrain.length,
      minimumTerrainY: Math.min(...centerlineTerrain.map(({ terrainY }) => terrainY)),
      maximumTerrainY: Math.max(...centerlineTerrain.map(({ terrainY }) => terrainY)),
      minimumRoadMinusTerrain: Math.min(...centerlineTerrain.map(({ roadMinusTerrain }) => roadMinusTerrain)),
      maximumRoadMinusTerrain: Math.max(...centerlineTerrain.map(({ roadMinusTerrain }) => roadMinusTerrain)),
      fillReferencePointCount: centerlineTerrain.filter(({ roadMinusTerrain }) => roadMinusTerrain > 0).length,
      atTerrainReferencePointCount: centerlineTerrain.filter(({ roadMinusTerrain }) => roadMinusTerrain === 0).length,
      cutReferencePointCount: centerlineTerrain.filter(({ roadMinusTerrain }) => roadMinusTerrain < 0).length,
      fullHeightCenterlineWaterCellCount: centerlineTerrain.reduce((sum, item) => sum + item.waterCellCount, 0),
      fullHeightCenterlineLavaCellCount: centerlineTerrain.reduce((sum, item) => sum + item.lavaCellCount, 0),
      manifestSha256: terrainDigest.digest('hex'),
      endpoints: [centerlineTerrain[0], centerlineTerrain.at(-1)],
      qualification: 'This is exact present-state terrain screening, not accepted road earthwork, groundwater, loading, or retaining design.',
    },
    shallowHoustonCompatibleScreeningBand: {
      classification: 'SCREENING_GEOMETRY',
      verticalRule: 'nearest-station roadY-8 through roadY-1 inclusive',
      minY: Math.min(...bandCells.map(({ y }) => y)),
      maxY: Math.max(...bandCells.map(({ y }) => y)),
      cellCount: bandCells.length,
      bounds: boundsOfCells(bandCells),
      coordinateSetSha256: hashCells(bandCells, `${CELL_HASH_PREAMBLE}-shallow-band`),
      blockStateSetSha256: hashStateCells(bandCells, `${STATE_HASH_PREAMBLE}-shallow-band`),
      airCellCount: bandAirCellCount,
      presentCellCount: bandCells.length - bandAirCellCount,
      gravitySensitiveCellCount: bandGravitySensitiveCellCount,
      fluidCells: bandFluidCounts,
      canonicalStateCounts: sortedCounts(bandStateCounts),
      minimumTerrainMinusCandidateRoof:
        Math.min(...surfaceRelationships.map(({ terrainMinusCandidateRoof }) => terrainMinusCandidateRoof)),
      maximumTerrainMinusCandidateRoof:
        Math.max(...surfaceRelationships.map(({ terrainMinusCandidateRoof }) => terrainMinusCandidateRoof)),
      columnsWithCandidateRoofAtOrAboveTerrain:
        surfaceRelationships.filter(({ terrainMinusCandidateRoof }) => terrainMinusCandidateRoof <= 0).length,
      exactShellGeometryAccepted: false,
      acceptedFutureStateCellCount: 0,
      qualification: 'An exact current-state audit band only. It does not choose a mode, internal clearance, structure, lining, material, portal, station, utility, drainage, ownership, or future state.',
    },
    houstonSampleCoordination: {
      classification: 'BOUND_FACT_AND_DETERMINISTIC_DERIVATION',
      exactHalfOpenEnvelope: houstonBounds,
      envelopeCellCount: houstonSample.exactCoordinationCellSet.cellCount,
      centerlinePointCountInsideXZ: houstonCenterlinePoints.length,
      centerlineStationRange: {
        first: houstonCenterlinePoints[0].station,
        last: houstonCenterlinePoints.at(-1).station,
      },
      shallowScreeningBandIntersectionCellCount: houstonBandIntersection.length,
      intersectionCoordinateSetSha256:
        hashCells(houstonBandIntersection, `${CELL_HASH_PREAMBLE}-houston-intersection`),
      intersectionBlockStateSetSha256:
        hashStateCells(houstonBandIntersection, `${STATE_HASH_PREAMBLE}-houston-intersection`),
      exactPhysicalSeamAccepted: false,
      qualification: 'The overlap is an intentional coordination warning. The Houston sample is not empty ground, and neither artifact assigns seam ownership or future states.',
    },
    generatedStructureScreening: {
      phase0GeneratedStartCount: phase0.generatedStructureStarts.length,
      reportedNearOrIntersectingStartCount: structureScreening.length,
      shallowBandBoundingIntersectionCellCount:
        structureScreening.reduce((sum, item) => sum + item.shallowScreeningBandIntersectionCellCount, 0),
      records: structureScreening,
      exactPresentFabricClearanceAccepted: false,
    },
    protectedRelicScreening: {
      declaredRelicCount: protectedScreening.length,
      screeningFootprintIntersectionColumnCount:
        protectedScreening.reduce((sum, item) => sum + item.screeningFootprintIntersectionColumnCount, 0),
      records: protectedScreening,
      finalConstructionInfluenceClearanceAccepted: false,
    },
  },
  futureNetworkAndInterfaceContext: {
    c4: {
      junction: c4.from,
      nearestGrandAvenueCenterline: nearestRouteToPoint(route, c4.from),
      concealedPortal: z02.hiddenSubway.branch.portalStudy,
      nearestGrandAvenueToPortal:
        nearestRouteToPoint(route, z02.hiddenSubway.branch.portalStudy),
      openingState: b11.acceptancePayload.interfaceContracts
        .find(({ id }) => id === 'IF-B11-C4-Z02-EMPTY-EIGHT').openingState,
    },
    emptyEight: {
      bounds: terminal.bounds,
      railY: terminal.railY,
      nearestPlanDistanceFromGrandAvenueBlocks: Number(terminalNearestPlanDistance.toFixed(6)),
      nearestSealedFutureWall: nearestFutureWall,
      futureInterfaceState: terminal.futureInterfaces.state,
    },
    passageWay: {
      combinedZonesEndpoint: coordinates.connections.find(({ id }) => id === 'C3').to,
      passageWayEndpoint: null,
      proposedRouteCellCount: 0,
      state: 'DEFAULT_DENY_UNEVIDENCED',
    },
    conclusion: 'The under-avenue option protects Houston/Gateway optionality but is not required by, aligned to, or authorized as an opening for C4, Empty Eight future lines, or PassageWay.',
  },
  inheritedTechnicalLimitations: {
    d02: {
      status: 'HOLD',
      openEvidenceGapCount: d02OpenGaps.length,
      openEvidenceGaps: d02OpenGaps,
      applicability: 'The same complete-save, geotechnical, structural, hydraulic, future-fluid, ownership/interface, and quantity disciplines apply to an under-road shell; D02 evidence does not technically accept this route.',
    },
    d06: {
      status: 'HOLD',
      holdCriterionCount: d06HoldCriteria.length,
      holdCriteria: d06HoldCriteria,
      applicability: 'Any occupiable or operational tunnel requires exact egress/accessibility, smoke/ventilation, barriers, emergency power, drainage, fire/service, ownership/interface, and commissioning evidence; D06 reservations do not commission this route.',
    },
    completeSaveAvailable: false,
    copiedRegionIncludesEntitiesPoiAndLevelDat: false,
  },
  alternatives: [
    {
      id: 'GA-U0-RESERVE-ONLY-NO-FORECLOSURE',
      classification: 'PLANNING_RECOMMENDATION',
      status: 'SELECTED_CONTROLLING_RECOMMENDATION_NOW',
      action: 'Protect subsurface optionality beneath the exact B11 alignment and prohibit incompatible foundations, utilities, or ownership assumptions until exact tunnel design exists.',
      exactEvidence: {
        b11CenterlineSha256: grand.centerlineSha256,
        screeningFootprintCoordinateSetSha256: hashColumns(footprint),
        screeningFootprintColumnCount: footprint.length,
      },
      physicalReservationCellsAccepted: false,
      operationCellCount: 0,
      worldEditAuthorized: false,
      rationale: 'Reservation preserves a costly-to-recover option while the future use, vertical profile, and interfaces remain unknown.',
    },
    {
      id: 'GA-U1-SEALED-ROUGH-SHELL-BEFORE-ROAD',
      classification: 'PLANNING_RECOMMENDATION_WITH_SCREENING_GEOMETRY',
      status: 'CONDITIONAL_HOLD_NOT_AUTHORIZED',
      action: 'If every technical gate closes before Phase 3 Grand Avenue work, construct a separately reversible sealed, dry rough shell in the earlier Phase 2 deep-shell window; otherwise leave the reservation unexcavated.',
      exactScreeningEvidence: {
        shallowBandCoordinateSetSha256:
          hashCells(bandCells, `${CELL_HASH_PREAMBLE}-shallow-band`),
        shallowBandCellCount: bandCells.length,
        houstonIntersectionCellCount: houstonBandIntersection.length,
      },
      requiredBeforeSelection: [
        'accepted purpose, endpoints, cross-section, vertical profile, internal clearance, portals/knockouts, and construction-influence cells',
        'complete immutable save with region, entities, POI, and level.dat plus exact current-state and entity clearance',
        'accepted geotechnical, structural, road-loading, retaining, settlement, lining, and waterproofing design',
        'accepted inflow, sump/pump, power, overflow, receiver/outfall, failure/recovery, and future-fluid accounting',
        'exact utilities and crossings, including separation from any Grand Avenue ductbank or foundations',
        'one canonical owner per cell and exact Z02/Z03/Z04/Z05/Houston directional interface contracts',
        'final clearance against all generated starts and accepted protected-feature influence sets',
        'life-safety and commissioning criteria if any occupancy or operational use is proposed',
      ],
      exactShellGeometryAccepted: false,
      acceptedFutureStateCellCount: 0,
      operationCellCount: 0,
      worldEditAuthorized: false,
      rationale: 'A shell could avoid reopening a finished civic avenue, but the current screening band is not a design and the Houston overlap is unresolved.',
    },
    {
      id: 'GA-U2-FULL-FITOUT-NOW',
      classification: 'PLANNING_RECOMMENDATION',
      status: 'NOT_RECOMMENDED_HOLD',
      action: 'Do not fit out or commission a tunnel now.',
      exactFitoutGeometry: null,
      selectedMode: null,
      acceptedEndpointCount: 0,
      commissionedConnectionCount: 0,
      acceptedFutureStateCellCount: 0,
      operationCellCount: 0,
      worldEditAuthorized: false,
      rationale: 'No accepted service, demand, west portal, Houston seam, PassageWay door, Empty Eight continuation, utility program, life-safety design, ownership, or commissioning identity exists.',
    },
  ],
  controllingPlanningRecommendation: {
    reserveCorridorNow: true,
    reserveMeaning: 'Nonphysical no-foreclosure policy bound to the exact B11 centerline and conservative screening footprint; it assigns no cell ownership.',
    roughShellDuringAvenueWorks: 'CONDITIONAL_ONLY_IF_COMPLETE_TECHNICAL_ACCEPTANCE_PRECEDES_THE_ROAD',
    preferredSequence: 'Phase 2 sealed deep shell before Phase 3 surface avenue, never reopen the road merely to satisfy a planning preference.',
    fullyFitOutNow: false,
    ifEvidenceIsNotReady: 'Build no tunnel; retain the no-foreclosure reservation and keep Houston/C4/future-line interfaces sealed.',
  },
  passHoldMatrix: [
    { id: 'GA-U-G01-B11-PROFILE', status: 'PASS', basis: 'The 299-point B11 profile regenerates to its bound SHA-256.' },
    { id: 'GA-U-G02-IMMUTABLE-CURRENT-SCREEN', status: 'PASS_QUALIFIED_REGION_ONLY', basis: 'Every full-height screening cell is read from the bound immutable copied region; entities/POI/level.dat remain absent.' },
    { id: 'GA-U-G03-RESERVE-POLICY', status: 'PASS_RECOMMENDATION_ONLY', basis: 'The exact no-foreclosure footprint is reproducible and creates no physical or owned cells.' },
    { id: 'GA-U-G04-EXACT-SHELL-DESIGN', status: 'HOLD', basis: 'The shallow band is screening geometry, not an accepted shell.' },
    { id: 'GA-U-G05-STRUCTURE-HYDROLOGY-UTILITIES', status: 'HOLD', basis: 'Technical inputs and complete future-state influence accounting are absent.' },
    { id: 'GA-U-G06-OWNERSHIP-INTERFACES', status: 'HOLD', basis: 'No owner or exact Houston/Z02/Z03/Z04/Z05 seam contract is accepted.' },
    { id: 'GA-U-G07-LIFE-SAFETY-FITOUT', status: 'HOLD', basis: 'No occupiable-system design or commissioning identity exists.' },
    { id: 'GA-U-G08-PHYSICAL-WORK', status: 'HOLD', basis: 'No operations, source guards, rollback package, preflight, release, or world-edit authorization exists.' },
  ],
  limitations: [
    'The radius-four footprint and roadY-8…roadY-1 band are conservative screening geometry, not an authored tunnel, road cross-section, construction envelope, or property right.',
    'Current region block facts do not replace entities, POI, level.dat, live clearance, future-state, groundwater, hydraulic, structural, or construction-influence evidence.',
    'Generated structure-start bounds do not prove current present fabric, structural influence, safe clearance, or ownership.',
    'Zero shallow-band intersection with generated-start bounds or protected cores is not technical clearance because influence kernels and exact future work are absent.',
    'The Houston coordination overlap is neither a collision approval nor an accepted connection.',
    'No recommendation in this packet opens C4, Empty Eight future walls, PassageWay, Houston, drainage, utilities, or any other interface.',
  ],
};

function markdown(current) {
  const screen = current.exactRouteSpecificScreening;
  const terrain = screen.centerlineTerrainProfile;
  const band = screen.shallowHoustonCompatibleScreeningBand;
  const houston = screen.houstonSampleCoordination;
  const structureRows = screen.generatedStructureScreening.records.map((item) => (
    `| ${item.id} | ${item.bounds.minX}…${item.bounds.maxX}, ${item.bounds.minY}…${item.bounds.maxY}, ${item.bounds.minZ}…${item.bounds.maxZ} | ${item.footprintColumnIntersectionCount} | ${item.shallowScreeningBandIntersectionCellCount} | ${item.nearestCenterlinePlanDistanceBlocks} |`
  )).join('\n');
  const relicRows = screen.protectedRelicScreening.records.map((item) => (
    `| ${item.key} | ${item.defaultDenyCoreCellCount.toLocaleString()} | ${item.screeningFootprintIntersectionColumnCount} | ${item.nearestCenterlinePlanDistanceBlocks} | ${item.positiveMarginStatus} |`
  )).join('\n');
  const alternativeRows = current.alternatives.map((item) => (
    `| ${item.id} | **${item.status}** | ${item.action} | ${item.rationale} |`
  )).join('\n');
  const gateRows = current.passHoldMatrix.map((item) => (
    `| ${item.id} | **${item.status}** | ${item.basis} |`
  )).join('\n');

  return `# Grand Avenue subsurface no-foreclosure alternatives

Status: **RESERVE NOW — SEALED ROUGH SHELL CONDITIONAL BEFORE ROAD — NO FIT-OUT — ZERO OPERATIONS**

## Recommendation

Reserve the under–Grand Avenue option now as a nonphysical no-foreclosure policy. Do **not** excavate it at the current HOLD state. If every exact technical gate closes before Grand Avenue construction, a separately reversible, sealed rough shell may be built during Phase 2 deep-shell work before the Phase 3 surface avenue. Do **not** fully fit it out now.

| Alternative | Current decision | Action | Why |
|---|---|---|---|
${alternativeRows}

The fallback is explicit: if the technical evidence is not complete before the road, build no tunnel, retain the planning reservation, and keep every interface sealed.

## Exact B11 control

- 299 points / 298 horizontal steps from \`${current.b11SurfaceControl.start.x},${current.b11SurfaceControl.start.y},${current.b11SurfaceControl.start.z}\` to \`${current.b11SurfaceControl.end.x},${current.b11SurfaceControl.end.y},${current.b11SurfaceControl.end.z}\`.
- Centerline SHA-256: \`${current.b11SurfaceControl.centerlineSha256}\`.
- The authored road section is eight blocks, but no exact side bias exists.
- The conservative screening footprint expands four cells in X/Z around every point: **${screen.conservativeFootprint.columnCount.toLocaleString()} columns**, bounds \`${screen.conservativeFootprint.bounds.minX}…${screen.conservativeFootprint.bounds.maxX}\`, \`${screen.conservativeFootprint.bounds.minZ}…${screen.conservativeFootprint.bounds.maxZ}\`, hash \`${screen.conservativeFootprint.coordinateSetSha256}\`.

That nine-cell symmetric capture is screening geometry only. It is deliberately conservative because an even eight-block cross-section cannot be assigned around an integer centerline without choosing a side.

## Route-specific immutable screening

The compiler read **${screen.fullHeightCurrentStateCensus.cellCount.toLocaleString()} cells** at Y=${screen.fullHeightCurrentStateCensus.minY}…${screen.fullHeightCurrentStateCensus.maxY} from the copied Phase 0 region. It found ${screen.fullHeightCurrentStateCensus.presentCellCount.toLocaleString()} present and ${screen.fullHeightCurrentStateCensus.airCellCount.toLocaleString()} air cells; ${screen.fullHeightCurrentStateCensus.fluidCells.water.toLocaleString()} water/waterlogged and ${screen.fullHeightCurrentStateCensus.fluidCells.lava.toLocaleString()} lava cells occur somewhere in the full-height screening columns. This is not a groundwater or future-flow model.

The exact centerline terrain ranges Y=${terrain.minimumTerrainY}…${terrain.maximumTerrainY}. Road minus terrain ranges ${terrain.minimumRoadMinusTerrain}…${terrain.maximumRoadMinusTerrain}: ${terrain.fillReferencePointCount} reference points imply fill, ${terrain.atTerrainReferencePointCount} sit at terrain, and ${terrain.cutReferencePointCount} imply cut. The terrain manifest is \`${terrain.manifestSha256}\`.

The shallow Houston-compatible **screening** band follows roadY−8…roadY−1, spanning Y=${band.minY}…${band.maxY}. It contains **${band.cellCount.toLocaleString()} current cells**, ${band.presentCellCount.toLocaleString()} present, ${band.airCellCount.toLocaleString()} air, ${band.fluidCells.water.toLocaleString()} water/waterlogged, and ${band.fluidCells.lava.toLocaleString()} lava. Its coordinate hash is \`${band.coordinateSetSha256}\`. It is not an accepted shell or excavation set.

## Houston coordination

The exact Houston sample is the half-open envelope X=${houston.exactHalfOpenEnvelope.minXInclusive}…${houston.exactHalfOpenEnvelope.maxXExclusive - 1}, Y=${houston.exactHalfOpenEnvelope.minYInclusive}…${houston.exactHalfOpenEnvelope.maxYExclusive - 1}, Z=${houston.exactHalfOpenEnvelope.minZInclusive}…${houston.exactHalfOpenEnvelope.maxZExclusive - 1}. ${houston.centerlinePointCountInsideXZ} B11 centerline points, stations ${houston.centerlineStationRange.first}…${houston.centerlineStationRange.last}, pass through its X/Z footprint. The shallow screening band intersects **${houston.shallowScreeningBandIntersectionCellCount.toLocaleString()}** coordination cells, hash \`${houston.intersectionCoordinateSetSha256}\`.

That is an interface warning, not permission. A later shell must accept exact Z03/Z04/Z05 ownership, road loading, waterproofing, and Houston seam cells.

## Generated and protected evidence

| Generated start | Inclusive bounds X, Y, Z | Screening columns | Shallow-band cells | Nearest plan distance |
|---|---|---:|---:|---:|
${structureRows}

These are generated-start bounds, not proof of present fabric or safe construction influence. The shallow screening band intersects ${screen.generatedStructureScreening.shallowBandBoundingIntersectionCellCount} such bounding cells, but final exact construction and influence geometry must still be screened against all ${screen.generatedStructureScreening.phase0GeneratedStartCount} Phase 0 recorded starts.

| Protected relic | Core cells | Screening columns | Nearest plan distance | Positive margin |
|---|---:|---:|---:|---|
${relicRows}

The screening footprint intersects zero protected-core columns. G06 remains HOLD because positive influence distances and the final construction/interaction union are absent.

## Future network context

- C4 junction \`${current.futureNetworkAndInterfaceContext.c4.junction.x},${current.futureNetworkAndInterfaceContext.c4.junction.y},${current.futureNetworkAndInterfaceContext.c4.junction.z}\` remains sealed and is ${current.futureNetworkAndInterfaceContext.c4.nearestGrandAvenueCenterline.distance} blocks in plan from the nearest avenue point.
- Empty Eight is ${current.futureNetworkAndInterfaceContext.emptyEight.nearestPlanDistanceFromGrandAvenueBlocks} blocks away in plan and remains at rail Y=${current.futureNetworkAndInterfaceContext.emptyEight.railY} with sealed future walls.
- PassageWay still has no evidenced endpoint or route on its side.

The reservation protects optionality; it is not presently required by or connected to C4, Empty Eight, or PassageWay.

## What must exist before a rough shell

The conditional shell requires an accepted purpose and endpoints; exact section/profile/lining/portal and influence cells; a complete save with entities, POI, and level.dat; geotechnical and structural design; utilities; drainage and failure design; one owner per cell; exact Houston and cross-scope interfaces; generated/protected clearance; and life-safety/commissioning evidence for any occupiable use.

D02 still exposes ${current.inheritedTechnicalLimitations.d02.openEvidenceGapCount} applicable evidence gaps. D06 still has ${current.inheritedTechnicalLimitations.d06.holdCriterionCount} technical HOLD criteria. Neither packet technically accepts this route.

## PASS / HOLD

| Gate | Status | Basis |
|---|---|---|
${gateRows}

## Safety boundary

No live system was contacted. Accepted future, construction, material, and operation cell counts are all **0**. No canonical owner, interface contract, release, construction, or world edit is authorized.
`;
}

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown(report));

console.log(JSON.stringify({
  output: relative(OUTPUT),
  markdown: relative(MARKDOWN),
  status: report.status,
  routePointCount: route.length,
  screeningColumnCount: footprint.length,
  fullHeightCellCount,
  shallowBandCellCount: bandCells.length,
  houstonIntersectionCellCount: houstonBandIntersection.length,
  protectedIntersectionColumnCount:
    report.exactRouteSpecificScreening.protectedRelicScreening.screeningFootprintIntersectionColumnCount,
  operationCellCount: report.safetyBoundary.operationCellCount,
  worldEditAuthorized: report.safetyBoundary.worldEditAuthorized,
}, null, 2));
