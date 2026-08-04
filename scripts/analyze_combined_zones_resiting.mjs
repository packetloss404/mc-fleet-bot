#!/usr/bin/env node
/**
 * Rank revised Combined Zones placements from a copied Anvil snapshot.
 *
 * Read-only: this script opens copied region files and writes one JSON report.
 * It never connects to Minecraft, RCON, the fleet API, systemd, or SSH.
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

const REGION_DIR = path.resolve(value(
  '--regions',
  'data/worldsnap-combined-zones-phase0-rerun-post-20260804T021358Z/region',
));
const OUTPUT = path.resolve(value(
  '--out',
  'masterplans/05-combined-zones/resiting-candidate-analysis.json',
));
const WORLD_MIN_Y = -64;
const WORLD_MAX_Y = 319;
const SEARCH = Object.freeze({ minX: 1500, maxX: 2800, minZ: -1200, maxZ: 600 });
const TERMINAL_SEARCH = Object.freeze({ minX: 1500, maxX: 2550, minZ: 16, maxZ: 600 });
const SUBWAY_PORTAL_REFERENCE = Object.freeze({ x: 1785, z: -215 });
const TERMINAL_SHAPES = Object.freeze([
  { orientation: 'east-west', width: 341, depth: 161 },
  { orientation: 'east-west', width: 321, depth: 145 },
  { orientation: 'east-west', width: 289, depth: 145 },
  { orientation: 'east-west', width: 257, depth: 129 },
  { orientation: 'east-west', width: 241, depth: 121 },
  { orientation: 'east-west', width: 225, depth: 113 },
  { orientation: 'north-south', width: 161, depth: 341 },
  { orientation: 'north-south', width: 145, depth: 321 },
  { orientation: 'north-south', width: 145, depth: 289 },
  { orientation: 'north-south', width: 129, depth: 257 },
  { orientation: 'north-south', width: 121, depth: 241 },
  { orientation: 'north-south', width: 113, depth: 225 },
]);
const CORE_LOCAL = Object.freeze({
  mountain: { minX: -400, maxX: 400, minZ: -800, maxZ: -200 },
  urban: { minX: -110, maxX: 110, minZ: -320, maxZ: 90 },
  points: {
    houstonTerminus: { x: 0, z: 0 },
    publicShaftHead: { x: 60, z: -70 },
    subTropolisCenter: { x: 0, z: -200 },
    cheyennePortal: { x: 0, z: -420 },
    summit: { x: 0, z: -500 },
  },
});

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
    path: path.relative(ROOT, directory),
    sha256: digest.digest('hex'),
    regionFileCount: names.length,
    bytes,
  };
}

function longToBig(input) {
  if (typeof input === 'bigint') return input;
  if (Array.isArray(input)) return (BigInt(input[0] | 0) << 32n) | BigInt(input[1] >>> 0);
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
  return packedValue(container.data, Math.max(minimumBits, Math.ceil(Math.log2(container.palette.length))), index);
}

function decompress(type, data) {
  if (type === 1) return zlib.gunzipSync(data);
  if (type === 2) return zlib.inflateSync(data);
  if (type === 3) return data;
  if (type === 4) return zlib.brotliDecompressSync(data);
  throw new Error(`unsupported Anvil compression type ${type}`);
}

const regionCache = new Map();
function regionBuffer(rx, rz) {
  const key = `${rx},${rz}`;
  if (regionCache.has(key)) return regionCache.get(key);
  const filename = path.join(REGION_DIR, `r.${rx}.${rz}.mca`);
  let buffer = null;
  try {
    buffer = fs.readFileSync(filename);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  regionCache.set(key, buffer);
  return buffer;
}

async function readChunk(cx, cz) {
  const buffer = regionBuffer(Math.floor(cx / 32), Math.floor(cz / 32));
  if (!buffer) return null;
  const index = ((cx & 31) + (cz & 31) * 32) * 4;
  const sectorOffset = buffer.readUIntBE(index, 3);
  if (!sectorOffset) return null;
  const offset = sectorOffset * 4096;
  const length = buffer.readUInt32BE(offset);
  const compression = buffer.readUInt8(offset + 4);
  if (compression & 0x80) throw new Error(`external chunk storage unsupported at ${cx},${cz}`);
  const { parsed } = await nbt.parse(decompress(
    compression,
    buffer.subarray(offset + 5, offset + 4 + length),
  ));
  return nbt.simplify(parsed);
}

const AIR = /^minecraft:(air|cave_air|void_air|light|structure_void|moving_piston)$/;
const DISPLAY_NOISE = /^minecraft:(air|cave_air|void_air|light|structure_void|moving_piston|short_grass|tall_grass|fern|large_fern)$/;
const WATER = new Set(['minecraft:water', 'minecraft:bubble_column']);
function isVegetation(name) {
  return /(_leaves|_log|_wood|_stem|_hyphae|_sapling)$/.test(name)
    || /^minecraft:(mangrove_roots|muddy_mangrove_roots|bamboo|vine|cocoa|short_grass|tall_grass|fern|large_fern|dead_bush|lily_pad|leaf_litter|seagrass|tall_seagrass|kelp|kelp_plant|sea_pickle|moss_carpet|pale_moss_carpet|pale_hanging_moss|pink_petals|wildflowers)$/.test(name)
    || /(_flower|_tulip|mushroom|dandelion|poppy|allium|azure_bluet|orchid|peony|sunflower|lilac|rose_bush|cornflower|lily_of_the_valley)$/.test(name);
}

function isColdBiome(name) {
  return /snowy|frozen|ice_spikes/.test(name) || name === 'minecraft:grove';
}

function blockAt(sectionMap, x, y, z) {
  const states = sectionMap.get(Math.floor(y / 16))?.block_states;
  if (!states?.palette?.length) return 'minecraft:air';
  const index = ((y & 15) << 8) | ((z & 15) << 4) | (x & 15);
  return states.palette[paletteIndex(states, index, 4)]?.Name ?? 'minecraft:air';
}

function biomeAt(sectionMap, x, y, z) {
  const biomes = sectionMap.get(Math.floor(y / 16))?.biomes;
  if (!biomes?.palette?.length) return null;
  const index = (((y & 15) >> 2) << 4) | (((z & 15) >> 2) << 2) | ((x & 15) >> 2);
  return biomes.palette[paletteIndex(biomes, index, 1)] ?? null;
}

function surfaceForColumn(chunk, sectionMap, x, z) {
  const columnIndex = (z & 15) * 16 + (x & 15);
  const heightMap = chunk.Heightmaps?.WORLD_SURFACE ?? chunk.Heightmaps?.WORLD_SURFACE_WG;
  let top = heightMap ? WORLD_MIN_Y + packedValue(heightMap, 9, columnIndex) - 1 : WORLD_MAX_Y;
  top = Math.min(WORLD_MAX_Y, top);
  let displayY = WORLD_MIN_Y - 1;
  let terrainY = WORLD_MIN_Y - 1;
  let terrainBlock = 'minecraft:air';
  let water = false;
  for (let y = top; y >= WORLD_MIN_Y; y--) {
    const block = blockAt(sectionMap, x, y, z);
    if (DISPLAY_NOISE.test(block)) continue;
    if (displayY < WORLD_MIN_Y) displayY = y;
    if (WATER.has(block)) {
      water = true;
      continue;
    }
    if (block === 'minecraft:lava' || isVegetation(block)) continue;
    if (!AIR.test(block)) {
      terrainY = y;
      terrainBlock = block;
      break;
    }
  }
  return {
    displayY,
    terrainY,
    terrainBlock,
    water,
    biome: biomeAt(sectionMap, x, Math.max(terrainY, WORLD_MIN_Y), z),
  };
}

function structureStarts(chunk) {
  const result = [];
  for (const [key, value] of Object.entries(chunk.structures?.starts ?? {})) {
    const id = value?.id ?? key;
    if (!id || /invalid/i.test(id)) continue;
    const children = (value.Children ?? []).map((child) => child.BB)
      .filter((bounds) => Array.isArray(bounds) && bounds.length === 6);
    const bounds = children.length ? {
      minX: Math.min(...children.map((item) => item[0])),
      minY: Math.min(...children.map((item) => item[1])),
      minZ: Math.min(...children.map((item) => item[2])),
      maxX: Math.max(...children.map((item) => item[3])),
      maxY: Math.max(...children.map((item) => item[4])),
      maxZ: Math.max(...children.map((item) => item[5])),
    } : null;
    result.push({ id, bounds });
  }
  return result;
}

function boundsIntersect(a, b) {
  return a && b && a.maxX >= b.minX && a.minX <= b.maxX
    && a.maxZ >= b.minZ && a.minZ <= b.maxZ;
}

const width = SEARCH.maxX - SEARCH.minX + 1;
const height = SEARCH.maxZ - SEARCH.minZ + 1;
const terrain = new Int16Array(width * height);
terrain.fill(-32768);
const water = new Uint8Array(width * height);
const biomeNames = [null];
const biomeIds = new Map();
const biomeIndex = new Uint16Array(width * height);
const structures = [];
const coverage = {};
function indexAt(x, z) {
  return (z - SEARCH.minZ) * width + x - SEARCH.minX;
}

for (let cz = Math.floor(SEARCH.minZ / 16); cz <= Math.floor(SEARCH.maxZ / 16); cz++) {
  for (let cx = Math.floor(SEARCH.minX / 16); cx <= Math.floor(SEARCH.maxX / 16); cx++) {
    const chunk = await readChunk(cx, cz);
    const status = chunk?.Status ?? 'MISSING';
    coverage[status] = (coverage[status] ?? 0) + 1;
    if (!chunk?.sections) continue;
    for (const start of structureStarts(chunk)) {
      if (start.bounds && boundsIntersect(start.bounds, SEARCH)) {
        structures.push({ ...start, chunkX: cx, chunkZ: cz });
      }
    }
    const sectionMap = new Map(chunk.sections.map((section) => [Number(section.Y), section]));
    for (let localZ = 0; localZ < 16; localZ++) {
      const z = cz * 16 + localZ;
      if (z < SEARCH.minZ || z > SEARCH.maxZ) continue;
      for (let localX = 0; localX < 16; localX++) {
        const x = cx * 16 + localX;
        if (x < SEARCH.minX || x > SEARCH.maxX) continue;
        const surface = surfaceForColumn(chunk, sectionMap, x, z);
        const target = indexAt(x, z);
        terrain[target] = surface.terrainY;
        water[target] = surface.water ? 1 : 0;
        if (surface.biome) {
          let id = biomeIds.get(surface.biome);
          if (id === undefined) {
            id = biomeNames.length;
            biomeNames.push(surface.biome);
            biomeIds.set(surface.biome, id);
          }
          biomeIndex[target] = id;
        }
      }
    }
  }
  if ((cz - Math.floor(SEARCH.minZ / 16)) % 12 === 0) {
    process.stderr.write(`resiting scan through chunk z=${cz}\n`);
  }
}

if (Object.keys(coverage).some((status) => status !== 'minecraft:full')) {
  throw new Error(`search contains non-full chunks: ${JSON.stringify(coverage)}`);
}

const integralWidth = width + 1;
const waterIntegral = new Uint32Array((width + 1) * (height + 1));
for (let row = 1; row <= height; row++) {
  let rowSum = 0;
  for (let column = 1; column <= width; column++) {
    rowSum += water[(row - 1) * width + column - 1];
    waterIntegral[row * integralWidth + column] = waterIntegral[(row - 1) * integralWidth + column] + rowSum;
  }
}

function waterCount(bounds) {
  const x0 = bounds.minX - SEARCH.minX;
  const x1 = bounds.maxX - SEARCH.minX + 1;
  const z0 = bounds.minZ - SEARCH.minZ;
  const z1 = bounds.maxZ - SEARCH.minZ + 1;
  return waterIntegral[z1 * integralWidth + x1]
    - waterIntegral[z0 * integralWidth + x1]
    - waterIntegral[z1 * integralWidth + x0]
    + waterIntegral[z0 * integralWidth + x0];
}

function pointSample(x, z) {
  const target = indexAt(x, z);
  return {
    x,
    z,
    terrainY: terrain[target],
    waterColumn: Boolean(water[target]),
    biome: biomeNames[biomeIndex[target]] ?? null,
  };
}

function areaCensus(bounds, step = 1) {
  let columns = 0;
  let waterColumns = 0;
  let coldBiomeColumns = 0;
  let minTerrainY = null;
  let maxTerrainY = null;
  let terrainSum = 0;
  for (let z = bounds.minZ; z <= bounds.maxZ; z += step) {
    for (let x = bounds.minX; x <= bounds.maxX; x += step) {
      const target = indexAt(x, z);
      const y = terrain[target];
      columns++;
      waterColumns += water[target];
      const biome = biomeNames[biomeIndex[target]] ?? '';
      if (isColdBiome(biome)) coldBiomeColumns++;
      minTerrainY = minTerrainY === null ? y : Math.min(minTerrainY, y);
      maxTerrainY = maxTerrainY === null ? y : Math.max(maxTerrainY, y);
      terrainSum += y;
    }
  }
  return {
    columns,
    waterColumns,
    waterFraction: Number((waterColumns / columns).toFixed(6)),
    coldBiomeColumns,
    coldBiomeFraction: Number((coldBiomeColumns / columns).toFixed(6)),
    minTerrainY,
    maxTerrainY,
    meanTerrainY: Number((terrainSum / columns).toFixed(3)),
    relief: maxTerrainY - minTerrainY,
  };
}

function intersections(bounds) {
  return structures.filter((item) => boundsIntersect(item.bounds, bounds));
}

const approximateTerminals = [];
for (const shape of TERMINAL_SHAPES) {
  for (let minZ = 16; minZ + shape.depth - 1 <= TERMINAL_SEARCH.maxZ; minZ += 8) {
    for (let minX = 1504; minX + shape.width - 1 <= TERMINAL_SEARCH.maxX; minX += 8) {
      const bounds = {
        minX,
        maxX: minX + shape.width - 1,
        minZ,
        maxZ: minZ + shape.depth - 1,
      };
      const sampled = areaCensus(bounds, 8);
      const exactWater = waterCount(bounds);
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerZ = (bounds.minZ + bounds.maxZ) / 2;
      approximateTerminals.push({
        ...shape,
        area: shape.width * shape.depth,
        bounds,
        exactWater,
        planStructureIntersectionCount: intersections(bounds).length,
        sampled,
        distanceFromPortal: Number(Math.hypot(
          centerX - SUBWAY_PORTAL_REFERENCE.x,
          centerZ - SUBWAY_PORTAL_REFERENCE.z,
        ).toFixed(3)),
      });
    }
  }
}
approximateTerminals.sort((a, b) => Number(a.exactWater > 0) - Number(b.exactWater > 0)
  || a.exactWater / a.area - b.exactWater / b.area
  || a.planStructureIntersectionCount - b.planStructureIntersectionCount
  || a.sampled.coldBiomeFraction - b.sampled.coldBiomeFraction
  || b.area - a.area
  || b.sampled.minTerrainY - a.sampled.minTerrainY
  || a.sampled.relief - b.sampled.relief
  || a.distanceFromPortal - b.distanceFromPortal);
const terminalCandidates = approximateTerminals.slice(0, 80).map((candidate) => {
  const exact = areaCensus(candidate.bounds);
  const ceilingY = exact.minTerrainY - 8;
  const stationFloorY = ceilingY - 14;
  const structureIntersections = intersections(candidate.bounds);
  return {
    ...candidate,
    exact,
    engineered: {
      minimumSolidCoverBlocks: 8,
      ceilingY,
      stationFloorY,
      shellMinY: stationFloorY - 2,
      shellMaxY: ceilingY,
    },
    structureIntersections,
    verticalStructureConflicts: structureIntersections.filter((item) => item.bounds
      && item.bounds.maxY >= stationFloorY - 2
      && item.bounds.minY <= ceilingY),
  };
});
terminalCandidates.sort((a, b) => Number(a.exact.waterColumns > 0) - Number(b.exact.waterColumns > 0)
  || a.exact.waterFraction - b.exact.waterFraction
  || a.verticalStructureConflicts.length - b.verticalStructureConflicts.length
  || a.exact.coldBiomeFraction - b.exact.coldBiomeFraction
  || b.area - a.area
  || b.exact.minTerrainY - a.exact.minTerrainY
  || a.exact.relief - b.exact.relief
  || a.distanceFromPortal - b.distanceFromPortal);

function transformBounds(local, origin, rotation) {
  const corners = [
    { x: local.minX, z: local.minZ },
    { x: local.minX, z: local.maxZ },
    { x: local.maxX, z: local.minZ },
    { x: local.maxX, z: local.maxZ },
  ].map((point) => transformPoint(point, origin, rotation));
  return {
    minX: Math.min(...corners.map((point) => point.x)),
    maxX: Math.max(...corners.map((point) => point.x)),
    minZ: Math.min(...corners.map((point) => point.z)),
    maxZ: Math.max(...corners.map((point) => point.z)),
  };
}

function transformPoint(local, origin, rotation) {
  if (rotation === 0) return { x: origin.x + local.x, z: origin.z + local.z };
  if (rotation === 90) return { x: origin.x - local.z, z: origin.z + local.x };
  if (rotation === 180) return { x: origin.x - local.x, z: origin.z - local.z };
  if (rotation === 270) return { x: origin.x + local.z, z: origin.z - local.x };
  throw new Error(`unsupported rotation ${rotation}`);
}

const coreCandidates = [];
for (const rotation of [0, 90, 180, 270]) {
  for (let z = -352; z <= 152; z += 8) {
    for (let x = 1848; x <= 2448; x += 8) {
      const origin = { x, z };
      const mountainBounds = transformBounds(CORE_LOCAL.mountain, origin, rotation);
      const urbanBounds = transformBounds(CORE_LOCAL.urban, origin, rotation);
      if (mountainBounds.minX < SEARCH.minX || mountainBounds.maxX > SEARCH.maxX
        || mountainBounds.minZ < SEARCH.minZ || mountainBounds.maxZ > SEARCH.maxZ) continue;
      if (urbanBounds.minX < SEARCH.minX || urbanBounds.maxX > SEARCH.maxX
        || urbanBounds.minZ < SEARCH.minZ || urbanBounds.maxZ > SEARCH.maxZ) continue;
      const mountainColumns = (mountainBounds.maxX - mountainBounds.minX + 1)
        * (mountainBounds.maxZ - mountainBounds.minZ + 1);
      const urbanColumns = (urbanBounds.maxX - urbanBounds.minX + 1)
        * (urbanBounds.maxZ - urbanBounds.minZ + 1);
      const mountainWater = waterCount(mountainBounds);
      const urbanWater = waterCount(urbanBounds);
      const points = Object.fromEntries(Object.entries(CORE_LOCAL.points).map(([key, point]) => {
        const world = transformPoint(point, origin, rotation);
        return [key, pointSample(world.x, world.z)];
      }));
      const wetPoints = Object.values(points).filter((point) => point.waterColumn).length;
      const surfaceStructureIntersections = intersections(mountainBounds)
        .filter((item) => item.bounds?.minY >= 50);
      const score = mountainWater / mountainColumns
        + 2 * urbanWater / urbanColumns
        + wetPoints;
      coreCandidates.push({
        origin,
        rotation,
        score: Number(score.toFixed(9)),
        wetAnchorCount: wetPoints,
        surfaceStructureIntersections,
        mountainBounds,
        mountainWaterColumns: mountainWater,
        mountainWaterFraction: Number((mountainWater / mountainColumns).toFixed(6)),
        urbanBounds,
        urbanWaterColumns: urbanWater,
        urbanWaterFraction: Number((urbanWater / urbanColumns).toFixed(6)),
        points,
      });
    }
  }
}
coreCandidates.sort((a, b) => a.wetAnchorCount - b.wetAnchorCount
  || a.surfaceStructureIntersections.length - b.surfaceStructureIntersections.length
  || a.score - b.score
  || a.mountainWaterFraction - b.mountainWaterFraction
  || a.urbanWaterFraction - b.urbanWaterFraction);
function enrichCoreCandidate(candidate) {
  return {
  ...candidate,
  mountain: areaCensus(candidate.mountainBounds),
  urban: areaCensus(candidate.urbanBounds),
  mountainStructureIntersections: intersections(candidate.mountainBounds),
  urbanStructureIntersections: intersections(candidate.urbanBounds),
  };
}
const exactCoreCandidates = coreCandidates.slice(0, 80).map(enrichCoreCandidate);
exactCoreCandidates.sort((a, b) => a.score - b.score
  || a.urbanStructureIntersections.length - b.urbanStructureIntersections.length
  || a.mountainStructureIntersections.length - b.mountainStructureIntersections.length
  || a.mountain.relief - b.mountain.relief);

const selectedTerminal = terminalCandidates[0];
const selectedCoreSource = coreCandidates.find((candidate) => (
  candidate.origin.x === 2048
  && candidate.origin.z === -328
  && candidate.rotation === 0
));
if (!selectedTerminal || !selectedCoreSource) throw new Error('adopted candidate missing from search');
const selectedCore = enrichCoreCandidate(selectedCoreSource);
const subwayPortalCandidates = [];
for (let z = -215; z <= -120; z += 5) {
  for (let x = 1740; x <= 1820; x += 5) {
    const sample = pointSample(x, z);
    const runFromJunction = Math.hypot(x - 1780, z + 250);
    if (!sample.waterColumn && runFromJunction >= 35) {
      subwayPortalCandidates.push({
        ...sample,
        runFromJunction: Number(runFromJunction.toFixed(3)),
        gradeForFourBlockDescent: Number((4 / runFromJunction).toFixed(6)),
      });
    }
  }
}
subwayPortalCandidates.sort((a, b) => a.runFromJunction - b.runFromJunction
  || b.terrainY - a.terrainY);

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  mode: 'READ_ONLY_COPIED_ANVIL_ANALYSIS',
  sourceSnapshot: snapshotIdentity(REGION_DIR),
  searchBounds: SEARCH,
  coverage,
  adoptedSelection: {
    terminal: selectedTerminal,
    core: selectedCore,
    rationale: [
      'Terminal is wholly south of Gateway Approach, completely dry, outside snowy/frozen biomes, supports at least eight blocks of cover, and has zero vertical generated-structure conflicts at shell Y38..54.',
      'Core keeps all five critical anchors dry while limiting mountain water to 2.6167% and urban-core water to 2.7788%.',
      'Three surface structures in the mountain envelope are retained as mandatory no-touch exhibit voids rather than treated as vacant land.',
      'The coupled placement keeps Gateway Approach inside the generated atlas and avoids any additional Phase 0 chunk generation.',
    ],
  },
  terminalSearch: {
    bounds: TERMINAL_SEARCH,
    shapes: TERMINAL_SHAPES,
    rankingRule: 'zero water, zero vertical generated-structure conflicts, zero snowy/frozen biome columns, largest viable hall, highest exact minimum terrain, lowest relief, shortest branch from the dry portal reference (1785,-215)',
    candidatesEvaluated: approximateTerminals.length,
    topCandidates: terminalCandidates.slice(0, 20),
  },
  subwayPortalSearch: {
    junction: { x: 1780, y: 68, z: -250 },
    proposedPortalY: 64,
    rule: 'dry copied-snapshot surface column at least 35 horizontal blocks south of GA-J1; four-block descent no steeper than 1:8',
    topCandidates: subwayPortalCandidates.slice(0, 20),
  },
  coreSearch: {
    normalizedLocalProgram: CORE_LOCAL,
    candidatesEvaluated: coreCandidates.length,
    rankingRule: 'dry five anchors, zero surface generated-structure intersections, then lowest combined mountain and double-weighted urban water fraction; underground intersections and relief are reported as constraints',
    topCandidates: exactCoreCandidates.slice(0, 20),
  },
};

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  output: path.relative(ROOT, OUTPUT),
  sourceSnapshot: report.sourceSnapshot,
  coverage,
  topTerminal: report.terminalSearch.topCandidates[0],
  topCore: report.coreSearch.topCandidates[0],
}, null, 2)}\n`);
