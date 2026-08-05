#!/usr/bin/env node
/**
 * Generate the read-only Phase 0 East Corridor terrain evidence package.
 *
 * The script reads immutable copied Anvil files only. It never connects to
 * Minecraft, RCON, the fleet API, systemd, or SSH.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

import { createCanvas } from 'canvas';
import nbt from 'prismarine-nbt';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

const REGION_DIR = path.resolve(value('--regions', 'data/worldsnap/region'));
const PRE_REGION_DIR = path.resolve(value('--pre-regions', 'data/worldsnap/region'));
const OUTPUT_DIR = path.resolve(value('--out-dir', 'docs/masterplans/05-combined-zones'));
const MAP_DIR = path.join(OUTPUT_DIR, 'maps');
const REGISTRY_PATH = path.resolve(value(
  '--registry',
  'docs/masterplans/05-combined-zones/site-coordinates.json',
));
const CANDIDATE_ANALYSIS_PATH = path.resolve(value(
  '--candidate-analysis',
  'docs/masterplans/05-combined-zones/resiting-candidate-analysis.json',
));
const GENERATED_AT = value('--generated-at', new Date().toISOString());
const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
const candidateAnalysis = JSON.parse(fs.readFileSync(CANDIDATE_ANALYSIS_PATH, 'utf8'));
const zone = (id) => {
  const result = registry.zones.find((candidate) => candidate.id === id);
  if (!result) throw new Error(`coordinate registry is missing zone ${id}`);
  return result;
};
const connection = (id) => {
  const result = registry.connections.find((candidate) => candidate.id === id);
  if (!result) throw new Error(`coordinate registry is missing connection ${id}`);
  return result;
};
const WORLD_MIN_Y = -64;
const WORLD_MAX_Y = 319;
const WHOLE = Object.freeze({ minX: -883, maxX: 3200, minZ: -1387, maxZ: 964 });
const ATLAS = Object.freeze({ minX: 1200, maxX: 3200, minZ: -1200, maxZ: 600 });
const RESERVE = Object.freeze({ ...zone('Z00').bounds });
const GATEWAY_APPROACH = Object.freeze({ ...zone('Z02').bounds });
const terminalDefinition = zone('Z02').hiddenSubway.terminal;
const TERMINAL = Object.freeze({
  minX: terminalDefinition.bounds.minX,
  maxX: terminalDefinition.bounds.maxX,
  minZ: terminalDefinition.bounds.minZ,
  maxZ: terminalDefinition.bounds.maxZ,
});
const TERMINAL_SHELL = Object.freeze({
  minY: terminalDefinition.bounds.minY,
  maxY: terminalDefinition.bounds.maxY,
  railY: terminalDefinition.railY,
});
const MOUNTAIN = Object.freeze({
  minX: zone('Z09').bounds.minX,
  maxX: zone('Z09').bounds.maxX,
  minZ: zone('Z09').bounds.minZ,
  maxZ: zone('Z09').bounds.maxZ,
});
const URBAN_CORE = Object.freeze({ ...candidateAnalysis.adoptedSelection.core.urbanBounds });
const featureUnion = registry.acceptedBaseline.database.featureUnion;
const EXISTING_UNION = Object.freeze({
  minX: featureUnion.minX,
  maxX: featureUnion.maxX,
  minZ: featureUnion.minZ,
  maxZ: featureUnion.maxZ,
});
const ALIGNMENT = Object.freeze(connection('C1').pointsOfIntersection.map((point) => ({
  id: point.id,
  x: point.x,
  z: point.z,
})));
const NAMED_PROBE_POINTS = Object.freeze([
  ...ALIGNMENT,
  { id: 'EXIT-11', x: 1180, z: -80 },
  { id: 'DD-1', x: 1240, z: -80 },
  { id: 'L1', x: 470, z: -232 },
  { id: 'L2', x: 305, z: 80 },
  { id: 'L3', x: 362, z: 165 },
  { id: 'GATEWAY-WEST-STOP', x: 1550, z: -250 },
  { id: 'GATEWAY-CENTRAL-STOP', x: 1640, z: -250 },
  { id: 'ALPINE-JUNCTION-STOP', x: 1780, z: -250 },
  { id: 'HIDDEN-SUBWAY-PORTAL', x: 1785, z: -215 },
  { id: 'GATEWAY-FUTURE-EAST-STOP', x: 1920, z: -250 },
  { id: 'GRAND-AVENUE-WEST', x: 1750, z: -300 },
  { id: 'GRAND-AVENUE-EAST', x: 2048, z: -328 },
  { id: 'HOUSTON-TERMINUS', x: 2048, z: -328 },
  { id: 'LOCAL-ORIGIN', x: 2048, z: -328 },
  { id: 'PUBLIC-SHAFT-HEAD', x: 2108, z: -398 },
  { id: 'SUBTROPOLIS-CENTER', x: 2048, z: -528 },
  { id: 'CHEYENNE-PORTAL', x: 2048, z: -748 },
  { id: 'SUMMIT-FOOTPRINT', x: 2048, z: -828 },
  { id: 'EMPTY-EIGHT-WEST-THROAT', x: 1632, z: 100 },
  { id: 'EMPTY-EIGHT-CONCOURSE', x: 1752, z: 100 },
]);

fs.mkdirSync(MAP_DIR, { recursive: true });

function sha256File(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function snapshotIdentity(directory) {
  const names = fs.readdirSync(directory).filter((name) => name.endsWith('.mca')).sort();
  const digest = crypto.createHash('sha256');
  let bytes = 0;
  for (const name of names) {
    const filename = path.join(directory, name);
    const data = fs.readFileSync(filename);
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
    algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
  };
}

function longToBig(value) {
  if (typeof value === 'bigint') return value;
  if (Array.isArray(value)) return (BigInt(value[0] | 0) << 32n) | BigInt(value[1] >>> 0);
  if (value && typeof value === 'object' && 'high' in value && 'low' in value) {
    return (BigInt(value.high | 0) << 32n) | BigInt(value.low >>> 0);
  }
  return BigInt(value);
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
  const sectorCount = buffer[index + 3];
  if (!sectorOffset || !sectorCount) return null;
  const offset = sectorOffset * 4096;
  const size = buffer.readUInt32BE(offset);
  const compression = buffer.readUInt8(offset + 4);
  if (compression & 0x80) throw new Error(`external chunk storage unsupported at ${cx},${cz}`);
  const compressed = buffer.subarray(offset + 5, offset + 4 + size);
  const { parsed } = await nbt.parse(decompress(compression, compressed));
  return nbt.simplify(parsed);
}

function packedValue(values, bits, index) {
  if (!values?.length) return 0;
  const perLong = Math.floor(64 / bits);
  const longIndex = Math.floor(index / perLong);
  if (longIndex >= values.length) return 0;
  const shift = BigInt((index % perLong) * bits);
  const mask = (1n << BigInt(bits)) - 1n;
  return Number((longToBig(values[longIndex]) >> shift) & mask);
}

function heightMapValue(heightMap, index) {
  return packedValue(heightMap, 9, index);
}

const blockNames = ['minecraft:air'];
const blockIds = new Map([['minecraft:air', 0]]);
function blockId(name) {
  let id = blockIds.get(name);
  if (id === undefined) {
    id = blockNames.length;
    blockNames.push(name);
    blockIds.set(name, id);
  }
  return id;
}

function paletteIndex(container, index, minimumBits) {
  const palette = container?.palette;
  if (!palette?.length || palette.length === 1) return 0;
  const bits = Math.max(minimumBits, Math.ceil(Math.log2(palette.length)));
  return packedValue(container.data, bits, index);
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

const DISPLAY_NOISE = /^minecraft:(air|cave_air|void_air|light|structure_void|moving_piston|short_grass|tall_grass|fern|large_fern)$/;
const AIR = /^minecraft:(air|cave_air|void_air|light|structure_void|moving_piston)$/;
const WATER = new Set(['minecraft:water', 'minecraft:bubble_column']);
function isVegetation(name) {
  return /(_leaves|_log|_wood|_stem|_hyphae|_sapling)$/.test(name)
    || /^minecraft:(mangrove_roots|muddy_mangrove_roots|bamboo|vine|cocoa|short_grass|tall_grass|fern|large_fern|dead_bush|lily_pad|leaf_litter|seagrass|tall_seagrass|kelp|kelp_plant|sea_pickle|moss_carpet|pale_moss_carpet|pale_hanging_moss|pink_petals|wildflowers)$/.test(name)
    || /(_flower|_tulip|mushroom|dandelion|poppy|allium|azure_bluet|orchid|peony|sunflower|lilac|rose_bush|cornflower|lily_of_the_valley)$/.test(name);
}


function isColdBiome(name) {
  return /snowy|frozen|ice_spikes/.test(name) || name === 'minecraft:grove';
}

function surfaceForColumn(chunk, x, z) {
  const sectionMap = new Map((chunk.sections ?? []).map((section) => [Number(section.Y), section]));
  const columnIndex = (z & 15) * 16 + (x & 15);
  const worldSurface = chunk.Heightmaps?.WORLD_SURFACE ?? chunk.Heightmaps?.WORLD_SURFACE_WG;
  let top = worldSurface ? WORLD_MIN_Y + heightMapValue(worldSurface, columnIndex) - 1 : WORLD_MAX_Y;
  top = Math.min(WORLD_MAX_Y, top);
  let displayY = WORLD_MIN_Y - 1;
  let displayBlock = 'minecraft:air';
  let terrainY = WORLD_MIN_Y - 1;
  let terrainBlock = 'minecraft:air';
  let water = false;
  let lava = false;
  let vegetation = false;
  for (let y = top; y >= WORLD_MIN_Y; y--) {
    const block = blockAt(sectionMap, x, y, z);
    if (DISPLAY_NOISE.test(block)) continue;
    if (displayY < WORLD_MIN_Y) {
      displayY = y;
      displayBlock = block;
    }
    if (WATER.has(block)) {
      water = true;
      continue;
    }
    if (block === 'minecraft:lava') {
      lava = true;
      continue;
    }
    if (isVegetation(block)) {
      vegetation = true;
      continue;
    }
    if (!AIR.test(block)) {
      terrainY = y;
      terrainBlock = block;
      break;
    }
  }
  return {
    displayY,
    displayBlock,
    terrainY,
    terrainBlock,
    water,
    lava,
    vegetation,
    biome: biomeAt(sectionMap, x, Math.max(terrainY, WORLD_MIN_Y), z),
  };
}

function inBounds(x, z, bounds) {
  return x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ;
}

const EXACT = {
  'minecraft:grass_block': [102, 142, 62],
  'minecraft:dirt': [134, 96, 67],
  'minecraft:coarse_dirt': [122, 88, 62],
  'minecraft:podzol': [88, 62, 30],
  'minecraft:stone': [125, 125, 125],
  'minecraft:gravel': [131, 127, 126],
  'minecraft:sand': [219, 207, 163],
  'minecraft:red_sand': [190, 102, 33],
  'minecraft:clay': [160, 166, 179],
  'minecraft:water': [50, 90, 190],
  'minecraft:bubble_column': [50, 90, 190],
  'minecraft:lava': [214, 96, 20],
  'minecraft:snow': [248, 252, 252],
  'minecraft:snow_block': [248, 252, 252],
  'minecraft:oak_leaves': [60, 106, 40],
  'minecraft:spruce_leaves': [40, 74, 40],
  'minecraft:birch_leaves': [102, 130, 62],
  'minecraft:dark_oak_leaves': [50, 96, 30],
  'minecraft:oak_log': [104, 83, 50],
  'minecraft:spruce_log': [58, 39, 23],
  'minecraft:birch_log': [216, 215, 210],
  'minecraft:dark_oak_log': [60, 45, 26],
};
function colorFor(name) {
  if (EXACT[name]) return EXACT[name];
  const rules = [
    [/leaves|vine|azalea/, [58, 104, 40]],
    [/_log|_wood|_stem|_hyphae/, [95, 70, 40]],
    [/deepslate|blackstone/, [70, 68, 73]],
    [/stone|andesite|diorite|granite|tuff/, [126, 126, 126]],
    [/sand/, [216, 202, 154]],
    [/dirt|mud/, [126, 91, 63]],
    [/grass|moss/, [94, 134, 58]],
    [/water|ice/, [54, 96, 188]],
    [/planks|log|wood/, [144, 111, 67]],
    [/brick/, [144, 96, 82]],
    [/concrete|terracotta|wool/, [155, 150, 145]],
    [/glass/, [170, 205, 220]],
  ];
  for (const [pattern, color] of rules) if (pattern.test(name)) return color;
  const hash = crypto.createHash('sha1').update(name).digest();
  return [90 + hash[0] % 90, 90 + hash[1] % 90, 90 + hash[2] % 90];
}

function polylineSamples(interval = 16) {
  const legs = [];
  let total = 0;
  for (let index = 1; index < ALIGNMENT.length; index++) {
    const from = ALIGNMENT[index - 1];
    const to = ALIGNMENT[index];
    const length = Math.hypot(to.x - from.x, to.z - from.z);
    legs.push({ from, to, start: total, length });
    total += length;
  }
  const distances = [];
  for (let distance = 0; distance <= total; distance += interval) distances.push(distance);
  if (distances.at(-1) !== total) distances.push(total);
  const seen = new Set();
  return distances.map((distance) => {
    const leg = legs.find((candidate) => distance <= candidate.start + candidate.length) ?? legs.at(-1);
    const offset = Math.min(1, Math.max(0, (distance - leg.start) / leg.length));
    const x = Math.round(leg.from.x + (leg.to.x - leg.from.x) * offset);
    const z = Math.round(leg.from.z + (leg.to.z - leg.from.z) * offset);
    const key = `${x},${z}`;
    if (seen.has(key)) throw new Error(`duplicate rounded corridor sample ${key}`);
    seen.add(key);
    return { distance: Number(distance.toFixed(3)), x, z };
  });
}

function increment(record, key, amount = 1) {
  record[key] = (record[key] ?? 0) + amount;
}

function structureStarts(chunk) {
  const found = [];
  for (const [key, value] of Object.entries(chunk.structures?.starts ?? {})) {
    const id = value?.id ?? key;
    if (!id || /invalid/i.test(id)) continue;
    const childBounds = (value.Children ?? [])
      .map((child) => child.BB)
      .filter((bounds) => Array.isArray(bounds) && bounds.length === 6);
    const bounds = childBounds.length ? {
      minX: Math.min(...childBounds.map((item) => item[0])),
      minY: Math.min(...childBounds.map((item) => item[1])),
      minZ: Math.min(...childBounds.map((item) => item[2])),
      maxX: Math.max(...childBounds.map((item) => item[3])),
      maxY: Math.max(...childBounds.map((item) => item[4])),
      maxZ: Math.max(...childBounds.map((item) => item[5])),
    } : null;
    found.push({ id, bounds });
  }
  return found;
}

function boundsIntersect(a, b) {
  if (!a) return false;
  return a.maxX >= b.minX && a.minX <= b.maxX
    && a.maxZ >= b.minZ && a.minZ <= b.maxZ;
}

function emptyAreaCensus(bounds, roofY = null) {
  return {
    bounds,
    columns: 0,
    waterColumns: 0,
    lavaColumns: 0,
    coldBiomeColumns: 0,
    vegetationTopColumns: 0,
    terrainMinY: null,
    terrainMaxY: null,
    biomes: {},
    ...(roofY === null ? {} : {
      proposedRoofY: roofY,
      minimumTerrainAboveRoof: null,
      maximumTerrainAboveRoof: null,
      columnsMeetingEightBlockSolidCover: 0,
    }),
  };
}

function updateAreaCensus(census, surface) {
  census.columns++;
  if (surface.water) census.waterColumns++;
  if (surface.lava) census.lavaColumns++;
  if (isColdBiome(surface.biome ?? '')) census.coldBiomeColumns++;
  if (surface.vegetation) census.vegetationTopColumns++;
  if (surface.biome) increment(census.biomes, surface.biome);
  census.terrainMinY = census.terrainMinY === null
    ? surface.terrainY : Math.min(census.terrainMinY, surface.terrainY);
  census.terrainMaxY = census.terrainMaxY === null
    ? surface.terrainY : Math.max(census.terrainMaxY, surface.terrainY);
  if (census.proposedRoofY !== undefined) {
    const cover = surface.terrainY - census.proposedRoofY;
    census.minimumTerrainAboveRoof = census.minimumTerrainAboveRoof === null
      ? cover : Math.min(census.minimumTerrainAboveRoof, cover);
    census.maximumTerrainAboveRoof = census.maximumTerrainAboveRoof === null
      ? cover : Math.max(census.maximumTerrainAboveRoof, cover);
    if (!surface.water && cover >= 8) census.columnsMeetingEightBlockSolidCover++;
  }
}

const postSnapshot = snapshotIdentity(REGION_DIR);
const preSnapshot = snapshotIdentity(PRE_REGION_DIR);
const width = WHOLE.maxX - WHOLE.minX + 1;
const height = WHOLE.maxZ - WHOLE.minZ + 1;
const heights = new Int16Array(width * height);
heights.fill(-32768);
const surfaceIds = new Uint16Array(width * height);
const chunkCoverage = { atlas: {}, reserve: {}, wholeRequested: 0, wholePresent: 0 };
const structures = [];
const reserveCensus = emptyAreaCensus(RESERVE);
const z02Census = emptyAreaCensus(GATEWAY_APPROACH);
const terminalCensus = emptyAreaCensus(TERMINAL, TERMINAL_SHELL.maxY);
const mountainCensus = emptyAreaCensus(MOUNTAIN);
const urbanCoreCensus = emptyAreaCensus(URBAN_CORE);

const minCx = Math.floor(WHOLE.minX / 16);
const maxCx = Math.floor(WHOLE.maxX / 16);
const minCz = Math.floor(WHOLE.minZ / 16);
const maxCz = Math.floor(WHOLE.maxZ / 16);
for (let cz = minCz; cz <= maxCz; cz++) {
  for (let cx = minCx; cx <= maxCx; cx++) {
    chunkCoverage.wholeRequested++;
    const chunk = await readChunk(cx, cz);
    const chunkMinX = cx * 16;
    const chunkMinZ = cz * 16;
    const intersectsAtlas = chunkMinX + 15 >= ATLAS.minX && chunkMinX <= ATLAS.maxX
      && chunkMinZ + 15 >= ATLAS.minZ && chunkMinZ <= ATLAS.maxZ;
    const intersectsReserve = chunkMinX + 15 >= RESERVE.minX && chunkMinX <= RESERVE.maxX
      && chunkMinZ + 15 >= RESERVE.minZ && chunkMinZ <= RESERVE.maxZ;
    const status = chunk?.Status ?? 'MISSING';
    if (intersectsAtlas) increment(chunkCoverage.atlas, status);
    if (intersectsReserve) increment(chunkCoverage.reserve, status);
    if (!chunk?.sections) continue;
    chunkCoverage.wholePresent++;
    if (intersectsAtlas) {
      for (const start of structureStarts(chunk)) {
        structures.push({
          ...start,
          chunkX: cx,
          chunkZ: cz,
          intersectsReserve: boundsIntersect(start.bounds, RESERVE),
          intersectsZ02: boundsIntersect(start.bounds, z02Census.bounds),
          intersectsTerminalFootprint: boundsIntersect(start.bounds, terminalCensus.bounds),
          intersectsMountainFootprint: boundsIntersect(start.bounds, mountainCensus.bounds),
          intersectsUrbanCore: boundsIntersect(start.bounds, urbanCoreCensus.bounds),
        });
      }
    }
    for (let localZ = 0; localZ < 16; localZ++) {
      const z = chunkMinZ + localZ;
      if (z < WHOLE.minZ || z > WHOLE.maxZ) continue;
      for (let localX = 0; localX < 16; localX++) {
        const x = chunkMinX + localX;
        if (x < WHOLE.minX || x > WHOLE.maxX) continue;
        const surface = surfaceForColumn(chunk, x, z);
        if (surface.displayY < WORLD_MIN_Y) continue;
        const target = (z - WHOLE.minZ) * width + x - WHOLE.minX;
        heights[target] = surface.displayY;
        surfaceIds[target] = blockId(surface.displayBlock);
        if (inBounds(x, z, RESERVE)) updateAreaCensus(reserveCensus, surface);
        if (inBounds(x, z, z02Census.bounds)) updateAreaCensus(z02Census, surface);
        if (inBounds(x, z, terminalCensus.bounds)) updateAreaCensus(terminalCensus, surface);
        if (inBounds(x, z, mountainCensus.bounds)) updateAreaCensus(mountainCensus, surface);
        if (inBounds(x, z, urbanCoreCensus.bounds)) updateAreaCensus(urbanCoreCensus, surface);
      }
    }
  }
  if ((cz - minCz) % 16 === 0) process.stderr.write(`surface rows through chunk z=${cz}\n`);
}

function renderTerrain() {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  const image = context.createImageData(width, height);
  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      const index = z * width + x;
      const id = surfaceIds[index];
      const offset = index * 4;
      if (!id) {
        image.data[offset] = 18;
        image.data[offset + 1] = 20;
        image.data[offset + 2] = 25;
        image.data[offset + 3] = 255;
        continue;
      }
      const base = colorFor(blockNames[id]);
      const current = heights[index];
      const west = x ? heights[index - 1] : current;
      const north = z ? heights[index - width] : current;
      const relief = Math.max(-0.3, Math.min(0.3, ((current - west) + (current - north)) * 0.1));
      const elevation = 0.78 + 0.22 * Math.max(0, Math.min(1, (current + 64) / 200));
      const shade = elevation * (1 + relief);
      image.data[offset] = Math.min(255, base[0] * shade);
      image.data[offset + 1] = Math.min(255, base[1] * shade);
      image.data[offset + 2] = Math.min(255, base[2] * shade);
      image.data[offset + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

function mapX(x) { return x - WHOLE.minX; }
function mapZ(z) { return z - WHOLE.minZ; }
function inclusiveSpan(min, max) {
  return Number.isInteger(min) && Number.isInteger(max) ? max - min + 1 : max - min;
}
function drawRect(context, bounds, color, dash = []) {
  context.save();
  context.strokeStyle = color;
  context.lineWidth = 5;
  context.setLineDash(dash);
  context.strokeRect(
    mapX(bounds.minX),
    mapZ(bounds.minZ),
    inclusiveSpan(bounds.minX, bounds.maxX),
    inclusiveSpan(bounds.minZ, bounds.maxZ),
  );
  context.restore();
}

const terrainCanvas = renderTerrain();
const rawMapPath = path.join(MAP_DIR, 'current-plus-phase0-terrain.png');
fs.writeFileSync(rawMapPath, terrainCanvas.toBuffer('image/png'));

const footerHeight = 220;
const overlay = createCanvas(width, height + footerHeight);
const overlayContext = overlay.getContext('2d');
overlayContext.drawImage(terrainCanvas, 0, 0);
overlayContext.fillStyle = 'rgba(245, 166, 35, 0.14)';
overlayContext.fillRect(
  mapX(RESERVE.minX),
  mapZ(RESERVE.minZ),
  inclusiveSpan(RESERVE.minX, RESERVE.maxX),
  inclusiveSpan(RESERVE.minZ, RESERVE.maxZ),
);
drawRect(overlayContext, EXISTING_UNION, '#28d7d2');
drawRect(overlayContext, RESERVE, '#ffbd45', [18, 12]);
drawRect(overlayContext, GATEWAY_APPROACH, '#f7d154', [10, 8]);
drawRect(overlayContext, MOUNTAIN, '#b98cff', [16, 9]);
drawRect(overlayContext, URBAN_CORE, '#ff769f');
drawRect(overlayContext, TERMINAL, '#66e0ff');
overlayContext.save();
overlayContext.strokeStyle = 'rgba(255, 189, 69, 0.34)';
overlayContext.lineWidth = 80;
overlayContext.lineJoin = 'round';
overlayContext.beginPath();
overlayContext.moveTo(mapX(ALIGNMENT[0].x), mapZ(ALIGNMENT[0].z));
for (const point of ALIGNMENT.slice(1)) overlayContext.lineTo(mapX(point.x), mapZ(point.z));
overlayContext.stroke();
overlayContext.strokeStyle = '#ffd77d';
overlayContext.lineWidth = 5;
overlayContext.setLineDash([18, 10]);
overlayContext.stroke();
overlayContext.restore();
overlayContext.font = 'bold 26px DejaVu Sans, sans-serif';
overlayContext.fillStyle = '#f7fbff';
overlayContext.strokeStyle = 'rgba(0,0,0,0.85)';
overlayContext.lineWidth = 7;
const labels = [
  ['CURRENT CATALOGED EXTENT', EXISTING_UNION.minX + 20, EXISTING_UNION.minZ + 40],
  ['REVISED COMBINED-ZONES RESERVE', RESERVE.minX + 25, RESERVE.minZ + 45],
  ['Gateway Approach / E-TERM', 1550, -250],
  ['EMPTY EIGHT · 8 TRACKS / 8 PLATFORMS', TERMINAL.minX + 10, TERMINAL.minZ + 80],
  ['NORTH-ALIGNED CORE · 0°', URBAN_CORE.minX + 10, URBAN_CORE.minZ + 45],
  ['MOUNTAIN ENVELOPE', MOUNTAIN.minX + 20, MOUNTAIN.minZ + 45],
];
for (const [label, x, z] of labels) {
  overlayContext.strokeText(label, mapX(x), mapZ(z));
  overlayContext.fillText(label, mapX(x), mapZ(z));
}
overlayContext.fillStyle = '#10151d';
overlayContext.fillRect(0, height, width, footerHeight);
overlayContext.fillStyle = '#f7fbff';
overlayContext.font = 'bold 38px DejaVu Sans, sans-serif';
overlayContext.fillText('Current world + re-sited Combined Zones Phase 0 terrain', 34, height + 54);
overlayContext.font = '24px DejaVu Sans, sans-serif';
overlayContext.fillStyle = '#c9d5e4';
overlayContext.fillText('North is up (−Z) · 1 pixel = 1 block · X −883…3200 · Z −1387…964', 34, height + 96);
overlayContext.fillText(`Post snapshot ${postSnapshot.sha256} · raw terrain is unedited Anvil evidence`, 34, height + 135);
overlayContext.fillStyle = '#28d7d2';
overlayContext.fillText('solid cyan: accepted cataloged feature union', 34, height + 180);
overlayContext.fillStyle = '#ffbd45';
overlayContext.fillText('amber corridor/reserve · purple mountain · pink core · cyan Empty Eight; planning geometry only', 760, height + 180);
const overlayPath = path.join(MAP_DIR, 'current-plus-proposed-phase0-overlay.png');
fs.writeFileSync(overlayPath, overlay.toBuffer('image/png'));

const samples = [];
for (const point of polylineSamples()) {
  const chunk = await readChunk(Math.floor(point.x / 16), Math.floor(point.z / 16));
  if (!chunk) throw new Error(`missing corridor chunk at ${point.x},${point.z}`);
  const surface = surfaceForColumn(chunk, point.x, point.z);
  samples.push({
    index: samples.length,
    distanceAlongCenterline: point.distance,
    x: point.x,
    z: point.z,
    chunkStatus: chunk.Status,
    worldSurfaceY: surface.displayY,
    worldSurfaceBlock: surface.displayBlock,
    terrainY: surface.terrainY,
    terrainBlock: surface.terrainBlock,
    waterColumn: surface.water,
    lavaColumn: surface.lava,
    vegetationAboveTerrain: surface.vegetation,
    biome: surface.biome,
  });
}

const namedPointSamples = [];
for (const point of NAMED_PROBE_POINTS) {
  const chunk = await readChunk(Math.floor(point.x / 16), Math.floor(point.z / 16));
  if (!chunk) throw new Error(`missing named-point chunk at ${point.x},${point.z}`);
  const surface = surfaceForColumn(chunk, point.x, point.z);
  namedPointSamples.push({
    ...point,
    chunkStatus: chunk.Status,
    worldSurfaceY: surface.displayY,
    worldSurfaceBlock: surface.displayBlock,
    terrainY: surface.terrainY,
    terrainBlock: surface.terrainBlock,
    waterColumn: surface.water,
    lavaColumn: surface.lava,
    vegetationAboveTerrain: surface.vegetation,
    biome: surface.biome,
  });
}

const terrainYs = samples.map((sample) => sample.terrainY);
const biomeCounts = {};
for (const sample of samples) increment(biomeCounts, sample.biome ?? 'unknown');
const gradeSegments = [];
for (let index = 1; index < samples.length; index++) {
  const from = samples[index - 1];
  const to = samples[index];
  const run = Math.hypot(to.x - from.x, to.z - from.z);
  const rise = to.terrainY - from.terrainY;
  const grade = run ? Math.abs(rise) / run : 0;
  gradeSegments.push({
    fromSample: from.index,
    toSample: to.index,
    run: Number(run.toFixed(3)),
    rise,
    absoluteGrade: Number(grade.toFixed(6)),
    exceedsOneInEight: grade > 0.125,
  });
}

function engineerRailProfile(inputSamples, startY = 68, endY = 68) {
  const minY = 40;
  const maxY = 130;
  const states = maxY - minY + 1;
  const infinity = 1e30;
  let previous = new Float64Array(states).fill(infinity);
  previous[startY - minY] = 0;
  const backPointers = [];
  for (let index = 1; index < inputSamples.length; index++) {
    const from = inputSamples[index - 1];
    const to = inputSamples[index];
    const run = Math.hypot(to.x - from.x, to.z - from.z);
    const maximumRise = Math.floor(run / 8 + 1e-9);
    const current = new Float64Array(states).fill(infinity);
    const back = new Int16Array(states).fill(-32768);
    for (let y = minY; y <= maxY; y++) {
      if (index === inputSamples.length - 1 && y !== endY) continue;
      const cutFill = to.terrainY - y;
      const earthworkCost = Math.abs(cutFill) + Math.max(0, Math.abs(cutFill) - 16) * 5;
      const levelCost = Math.abs(y - 68) * 0.08;
      for (let priorY = Math.max(minY, y - maximumRise);
        priorY <= Math.min(maxY, y + maximumRise); priorY++) {
        const cost = previous[priorY - minY] + earthworkCost + levelCost;
        if (cost < current[y - minY]) {
          current[y - minY] = cost;
          back[y - minY] = priorY;
        }
      }
    }
    previous = current;
    backPointers.push(back);
  }
  if (!Number.isFinite(previous[endY - minY]) || previous[endY - minY] >= infinity) {
    throw new Error('no 1:8 corridor rail profile connects the selected endpoints');
  }
  const railYs = new Array(inputSamples.length);
  railYs[railYs.length - 1] = endY;
  for (let index = inputSamples.length - 1; index >= 1; index--) {
    railYs[index - 1] = backPointers[index - 1][railYs[index] - minY];
  }
  const profile = inputSamples.map((sample, index) => ({
    sampleIndex: sample.index,
    distanceAlongCenterline: sample.distanceAlongCenterline,
    x: sample.x,
    z: sample.z,
    terrainY: sample.terrainY,
    waterColumn: sample.waterColumn,
    proposedRailY: railYs[index],
    cutFill: sample.terrainY - railYs[index],
  }));
  const segments = profile.slice(1).map((to, index) => {
    const from = profile[index];
    const run = Math.hypot(to.x - from.x, to.z - from.z);
    const rise = to.proposedRailY - from.proposedRailY;
    return {
      fromSample: from.sampleIndex,
      toSample: to.sampleIndex,
      run: Number(run.toFixed(3)),
      rise,
      absoluteGrade: Number((Math.abs(rise) / run).toFixed(6)),
    };
  });
  const maximumGrade = Math.max(...segments.map((segment) => segment.absoluteGrade));
  return {
    status: maximumGrade <= 0.125 ? 'PASS_ONE_IN_EIGHT' : 'FAIL_ONE_IN_EIGHT',
    method: 'Integer-Y dynamic program minimizing sampled cut/fill while constraining every sampled interval to an absolute grade of 1:8 or flatter.',
    startY,
    endY,
    railMinY: Math.min(...railYs),
    railMaxY: Math.max(...railYs),
    maximumGrade,
    maximumCutBlocks: Math.max(...profile.map((sample) => sample.cutFill)),
    maximumFillBlocks: Math.max(...profile.map((sample) => -sample.cutFill)),
    waterCrossingSamples: profile.filter((sample) => sample.waterColumn).length,
    profile,
    segments,
  };
}

const engineeredRailProfile = engineerRailProfile(samples);
const waterRuns = [];
let activeWaterRun = null;
for (const sample of samples) {
  if (sample.waterColumn && !activeWaterRun) activeWaterRun = { startSample: sample.index, endSample: sample.index };
  else if (sample.waterColumn) activeWaterRun.endSample = sample.index;
  else if (activeWaterRun) {
    waterRuns.push(activeWaterRun);
    activeWaterRun = null;
  }
}
if (activeWaterRun) waterRuns.push(activeWaterRun);
for (const run of waterRuns) {
  run.start = { x: samples[run.startSample].x, z: samples[run.startSample].z };
  run.end = { x: samples[run.endSample].x, z: samples[run.endSample].z };
}

const terminalVerticalStructureConflicts = structures.filter((structure) => (
  structure.intersectsTerminalFootprint
  && structure.bounds
  && structure.bounds.maxY >= TERMINAL_SHELL.minY
  && structure.bounds.minY <= TERMINAL_SHELL.maxY
));
const protectedSurfaceRelics = structures.filter((structure) => (
  structure.intersectsMountainFootprint
  && structure.bounds
  && structure.bounds.minY >= 50
));
const criticalAnchorIds = new Set([
  'HOUSTON-TERMINUS',
  'PUBLIC-SHAFT-HEAD',
  'SUBTROPOLIS-CENTER',
  'CHEYENNE-PORTAL',
  'SUMMIT-FOOTPRINT',
]);
const criticalAnchorSamples = namedPointSamples.filter((sample) => criticalAnchorIds.has(sample.id));
const sitingGates = {
  fullAtlasChunkCoverage: Object.keys(chunkCoverage.atlas).every(
    (status) => status === 'minecraft:full',
  ),
  engineeredPassengerRailOneInEight: engineeredRailProfile.status === 'PASS_ONE_IN_EIGHT',
  criticalCoreAnchorsDry: criticalAnchorSamples.length === criticalAnchorIds.size
    && criticalAnchorSamples.every((sample) => !sample.waterColumn),
  emptyEightFootprintDry: terminalCensus.waterColumns === 0,
  emptyEightWhollySouthOfGatewayApproach: TERMINAL.minZ > GATEWAY_APPROACH.maxZ,
  emptyEightColdBiomeColumnsZero: terminalCensus.coldBiomeColumns === 0,
  emptyEightEightBlockCover: terminalCensus.columnsMeetingEightBlockSolidCover
    === terminalCensus.columns,
  emptyEightVerticalStructureClearance: terminalVerticalStructureConflicts.length === 0,
  mountainWaterExposureBelowFivePercent: mountainCensus.waterColumns / mountainCensus.columns < 0.05,
  urbanCoreWaterExposureBelowFivePercent: urbanCoreCensus.waterColumns / urbanCoreCensus.columns < 0.05,
  surfaceRelicsDeclaredNoTouch: protectedSurfaceRelics.length === 3,
};
const revisedSitingPassed = Object.values(sitingGates).every(Boolean);

const probe = {
  schemaVersion: 2,
  id: 'combined-zones-east-corridor-phase0-terrain-probe',
  status: revisedSitingPassed
    ? 'PASS_REVISED_SITING_PHASE0' : 'FAIL_REVISED_SITING_PHASE0',
  generatedAtUtc: GENERATED_AT,
  method: 'Read-only Anvil WORLD_SURFACE sampling with block-state and biome palette decoding; centerline sampled every 16 Euclidean blocks and rounded to integer columns.',
  snapshots: { preGeneration: preSnapshot, postGeneration: postSnapshot },
  bounds: { wholeMap: WHOLE, phase0Atlas: ATLAS, proposedReserve: RESERVE },
  chunkCoverage,
  alignment: ALIGNMENT,
  intervalBlocks: 16,
  sampleCount: samples.length,
  summary: {
    terrainMinY: Math.min(...terrainYs),
    terrainMaxY: Math.max(...terrainYs),
    terrainMeanY: Number((terrainYs.reduce((sum, y) => sum + y, 0) / terrainYs.length).toFixed(3)),
    waterSampleCount: samples.filter((sample) => sample.waterColumn).length,
    lavaSampleCount: samples.filter((sample) => sample.lavaColumn).length,
    vegetationSampleCount: samples.filter((sample) => sample.vegetationAboveTerrain).length,
    biomeCounts,
    maximumObservedNaturalSurfaceGrade: Math.max(...gradeSegments.map((segment) => segment.absoluteGrade)),
    naturalSurfaceSegmentsExceedingOneInEight: gradeSegments.filter((segment) => segment.exceedsOneInEight).length,
    engineeredRailMaximumGrade: engineeredRailProfile.maximumGrade,
    engineeredRailMaximumCutBlocks: engineeredRailProfile.maximumCutBlocks,
    engineeredRailMaximumFillBlocks: engineeredRailProfile.maximumFillBlocks,
    interpretation: 'The natural surface remains a terrain constraint. The proposed sampled rail profile now proves the 1:8 gate, while disclosed cuts, fills, structures, and final civil design remain separate approvals.',
  },
  sitingGates,
  waterRuns,
  gradeSegments,
  engineeredRailProfile,
  namedPointSamples,
  samples,
};
const probePath = path.join(OUTPUT_DIR, 'corridor-terrain-probe.json');
fs.writeFileSync(probePath, `${JSON.stringify(probe, null, 2)}\n`);

for (const census of [
  reserveCensus,
  z02Census,
  terminalCensus,
  mountainCensus,
  urbanCoreCensus,
]) {
  census.biomes = Object.fromEntries(Object.entries(census.biomes).sort((a, b) => b[1] - a[1]));
  census.waterFraction = Number((census.waterColumns / census.columns).toFixed(6));
  census.vegetationFraction = Number((census.vegetationTopColumns / census.columns).toFixed(6));
  if (census.proposedRoofY !== undefined) {
    census.eightBlockSolidCoverFraction = Number(
      (census.columnsMeetingEightBlockSolidCover / census.columns).toFixed(6),
    );
  }
}
const evidence = {
  schemaVersion: 2,
  id: 'combined-zones-phase0-survey-evidence',
  status: probe.status,
  generatedAtUtc: probe.generatedAtUtc,
  snapshots: probe.snapshots,
  authorityInputs: {
    coordinateRegistry: {
      path: path.relative(ROOT, REGISTRY_PATH),
      sha256: sha256File(REGISTRY_PATH),
    },
    candidateAnalysis: {
      path: path.relative(ROOT, CANDIDATE_ANALYSIS_PATH),
      sha256: sha256File(CANDIDATE_ANALYSIS_PATH),
    },
  },
  rerunDisposition: {
    additionalChunkGenerationRequired: false,
    reason: 'Every chunk required by the re-sited reserve was already minecraft:full in the bounded Phase 0 atlas; no temporary force-load tile was added.',
    preservedLiveForceLoadBaseline: 104,
  },
  chunkCoverage,
  sitingGates,
  areaCensuses: {
    revisedCombinedZonesReserve: reserveCensus,
    gatewayApproach: z02Census,
    gatewayExpansionTerminalFootprint: terminalCensus,
    mountainFootprint: mountainCensus,
    urbanCore: urbanCoreCensus,
  },
  protectedSurfaceRelics,
  terminalVerticalStructureConflicts,
  generatedStructureStarts: structures,
  artifacts: [rawMapPath, overlayPath, probePath].map((filename) => ({
    path: path.relative(ROOT, filename),
    bytes: fs.statSync(filename).size,
    sha256: sha256File(filename),
  })),
  limitations: [
    'The copied overworld region snapshot does not include the separate entities region directory, so this is not a live-entity census.',
    'Vanilla structure-start records identify generated structures but do not prove present-day preservation or entrance safety.',
    'The planning overlay does not authorize excavation, grading, or construction.',
  ],
};
const evidencePath = path.join(OUTPUT_DIR, 'phase0-survey-evidence.json');
fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

process.stdout.write(`${JSON.stringify({
  preSnapshot,
  postSnapshot,
  probeStatus: probe.status,
  sampleCount: samples.length,
  corridorSummary: probe.summary,
  chunkCoverage,
  areaCensuses: evidence.areaCensuses,
  generatedStructureStartCount: structures.length,
  artifacts: evidence.artifacts,
}, null, 2)}\n`);
