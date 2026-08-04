#!/usr/bin/env node
/**
 * Generate a read-only, snapshot-pinned surface atlas and source inventory.
 *
 * This decoder reads copied Anvil files only. It never connects to Minecraft,
 * RCON, systemd, or the fleet API.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { createRequire } from 'module';
import { createCanvas } from 'canvas';
import nbt from 'prismarine-nbt';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const yaml = require('js-yaml');

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const positionalOutput = args[0] && !args[0].startsWith('--') ? args[0] : null;
const REGION_DIR = path.resolve(
  ROOT,
  value('--regions', 'data/worldsnap/region'),
);
const OUTPUT_DIR = path.resolve(
  value('--out', positionalOutput)
    ?? path.join(ROOT, 'data/exports/box/atlas-2026-07-26/team-a'),
);
const MASTER = {
  minX: -512,
  maxX: 383,
  minZ: -704,
  maxZ: 383,
};
const WORLD_MIN_Y = -64;
const WORLD_MAX_Y = 319;

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function sha256Buffer(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256File(filename) {
  return sha256Buffer(fs.readFileSync(filename));
}

function relative(filename) {
  return path.relative(ROOT, filename);
}

function hashSnapshotDirectory() {
  const files = fs.readdirSync(REGION_DIR)
    .filter((name) => name.endsWith('.mca'))
    .sort();
  const digest = crypto.createHash('sha256');
  const members = [];
  for (const name of files) {
    const filename = path.join(REGION_DIR, name);
    const stat = fs.statSync(filename);
    const hash = sha256File(filename);
    digest.update(name);
    digest.update('\0');
    digest.update(fs.readFileSync(filename));
    digest.update('\0');
    members.push({
      file: relative(filename),
      bytes: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      sha256: hash,
    });
  }
  return {
    algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
    sha256: digest.digest('hex'),
    members,
  };
}

function fileEvidence(relativePath) {
  const filename = path.join(ROOT, relativePath);
  const stat = fs.statSync(filename);
  return {
    file: relativePath,
    bytes: stat.size,
    modifiedAt: stat.mtime.toISOString(),
    sha256: sha256File(filename),
  };
}

const snapshot = hashSnapshotDirectory();

// ---------------------------------------------------------------- Anvil surface
const regionCache = new Map();

function regionBuffer(rx, rz) {
  const key = `${rx},${rz}`;
  if (regionCache.has(key)) return regionCache.get(key);
  const filename = path.join(REGION_DIR, `r.${rx}.${rz}.mca`);
  let buffer = null;
  try {
    buffer = fs.readFileSync(filename);
  } catch {
    buffer = null;
  }
  regionCache.set(key, buffer);
  return buffer;
}

function decompress(type, data) {
  if (type === 1) return zlib.gunzipSync(data);
  if (type === 2) return zlib.inflateSync(data);
  if (type === 3) return data;
  throw new Error(`Unsupported chunk compression type ${type}`);
}

async function readChunk(cx, cz) {
  const rx = Math.floor(cx / 32);
  const rz = Math.floor(cz / 32);
  const buffer = regionBuffer(rx, rz);
  if (!buffer) return null;
  const index = ((cx & 31) + (cz & 31) * 32) * 4;
  if (index + 4 > buffer.length) return null;
  const offset = (
    (buffer[index] << 16)
    | (buffer[index + 1] << 8)
    | buffer[index + 2]
  ) * 4096;
  const sectors = buffer[index + 3];
  if (offset === 0 || sectors === 0 || offset + 5 > buffer.length) return null;
  const length = buffer.readInt32BE(offset);
  const compression = buffer[offset + 4];
  const payload = buffer.subarray(offset + 5, offset + 4 + length);
  try {
    const raw = decompress(compression, payload);
    const { parsed } = await nbt.parse(raw);
    return nbt.simplify(parsed);
  } catch {
    return null;
  }
}

function asBigInt(value) {
  if (typeof value === 'bigint') return value;
  if (Array.isArray(value)) {
    return (BigInt(value[0]) << 32n) | BigInt(value[1] >>> 0);
  }
  return BigInt(value);
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

function paletteValue(blockStates, index) {
  const palette = blockStates?.palette;
  if (!palette?.length) return 0;
  if (palette.length === 1) return blockId(palette[0].Name);
  const bits = Math.max(4, Math.ceil(Math.log2(palette.length)));
  const valuesPerLong = Math.floor(64 / bits);
  const longIndex = Math.floor(index / valuesPerLong);
  if (longIndex >= blockStates.data.length) return 0;
  const shift = BigInt((index % valuesPerLong) * bits);
  const mask = (1n << BigInt(bits)) - 1n;
  const paletteIndex = Number(
    (asBigInt(blockStates.data[longIndex]) >> shift) & mask,
  );
  return blockId(palette[paletteIndex]?.Name ?? 'minecraft:air');
}

function heightMapValue(heightMap, index) {
  // Java 1.18+ overworld height is 384 cells, requiring nine packed bits.
  const bits = 9;
  const valuesPerLong = Math.floor(64 / bits);
  const longIndex = Math.floor(index / valuesPerLong);
  if (longIndex >= heightMap.length) return 0;
  const shift = BigInt((index % valuesPerLong) * bits);
  const mask = (1n << BigInt(bits)) - 1n;
  return Number((asBigInt(heightMap[longIndex]) >> shift) & mask);
}

function isSurfaceNoise(name) {
  return /^minecraft:(air|cave_air|void_air|light|structure_void|moving_piston|short_grass|tall_grass|fern|large_fern)$/.test(name);
}

function getChunkBlock(sectionMap, x, y, z) {
  const section = sectionMap.get(Math.floor(y / 16));
  if (!section?.block_states) return 0;
  const localY = y & 15;
  const index = (localY << 8) | ((z & 15) << 4) | (x & 15);
  return paletteValue(section.block_states, index);
}

const masterWidth = MASTER.maxX - MASTER.minX + 1;
const masterHeight = MASTER.maxZ - MASTER.minZ + 1;
const heights = new Int16Array(masterWidth * masterHeight);
heights.fill(WORLD_MIN_Y - 1);
const surfaceIds = new Uint16Array(masterWidth * masterHeight);
const chunkStats = {
  requested: 0,
  loaded: 0,
  missing: 0,
  withoutWorldSurfaceHeightmap: 0,
};

async function loadMasterSurface() {
  const minChunkX = Math.floor(MASTER.minX / 16);
  const maxChunkX = Math.floor(MASTER.maxX / 16);
  const minChunkZ = Math.floor(MASTER.minZ / 16);
  const maxChunkZ = Math.floor(MASTER.maxZ / 16);
  for (let cz = minChunkZ; cz <= maxChunkZ; cz++) {
    for (let cx = minChunkX; cx <= maxChunkX; cx++) {
      chunkStats.requested++;
      const chunk = await readChunk(cx, cz);
      if (!chunk?.sections) {
        chunkStats.missing++;
        continue;
      }
      chunkStats.loaded++;
      const worldSurface = chunk.Heightmaps?.WORLD_SURFACE;
      if (!worldSurface) chunkStats.withoutWorldSurfaceHeightmap++;
      const sectionMap = new Map(chunk.sections.map((section) => [section.Y, section]));
      for (let localZ = 0; localZ < 16; localZ++) {
        const worldZ = cz * 16 + localZ;
        if (worldZ < MASTER.minZ || worldZ > MASTER.maxZ) continue;
        for (let localX = 0; localX < 16; localX++) {
          const worldX = cx * 16 + localX;
          if (worldX < MASTER.minX || worldX > MASTER.maxX) continue;
          const columnIndex = localZ * 16 + localX;
          let topY;
          if (worldSurface) {
            topY = WORLD_MIN_Y + heightMapValue(worldSurface, columnIndex) - 1;
          } else {
            topY = WORLD_MAX_Y;
          }
          let id = 0;
          for (
            let y = Math.min(topY, WORLD_MAX_Y);
            y >= WORLD_MIN_Y;
            y--
          ) {
            id = getChunkBlock(sectionMap, worldX, y, worldZ);
            const name = blockNames[id] ?? 'minecraft:air';
            if (!isSurfaceNoise(name)) {
              topY = y;
              break;
            }
            id = 0;
          }
          const target = (
            (worldZ - MASTER.minZ) * masterWidth
            + (worldX - MASTER.minX)
          );
          heights[target] = topY;
          surfaceIds[target] = id;
        }
      }
    }
    if ((cz - minChunkZ) % 8 === 0) {
      process.stderr.write(`surface rows through chunk z=${cz}\n`);
    }
  }
}

// ---------------------------------------------------------------- colours
const EXACT = {
  'minecraft:grass_block': [102, 142, 62],
  'minecraft:dirt': [134, 96, 67],
  'minecraft:coarse_dirt': [122, 88, 62],
  'minecraft:rooted_dirt': [144, 105, 78],
  'minecraft:dirt_path': [154, 132, 78],
  'minecraft:podzol': [88, 62, 30],
  'minecraft:stone': [125, 125, 125],
  'minecraft:cobblestone': [122, 122, 122],
  'minecraft:mossy_cobblestone': [104, 118, 96],
  'minecraft:gravel': [131, 127, 126],
  'minecraft:andesite': [136, 136, 138],
  'minecraft:diorite': [188, 188, 190],
  'minecraft:granite': [154, 106, 88],
  'minecraft:deepslate': [78, 78, 82],
  'minecraft:cobbled_deepslate': [77, 77, 80],
  'minecraft:tuff': [108, 109, 102],
  'minecraft:bedrock': [51, 51, 51],
  'minecraft:sand': [219, 207, 163],
  'minecraft:sandstone': [216, 203, 155],
  'minecraft:red_sand': [190, 102, 33],
  'minecraft:clay': [160, 166, 179],
  'minecraft:water': [50, 90, 190],
  'minecraft:lava': [214, 96, 20],
  'minecraft:ice': [160, 190, 240],
  'minecraft:snow': [248, 252, 252],
  'minecraft:snow_block': [248, 252, 252],
  'minecraft:oak_planks': [162, 130, 78],
  'minecraft:spruce_planks': [114, 84, 48],
  'minecraft:birch_planks': [196, 179, 123],
  'minecraft:dark_oak_planks': [66, 43, 20],
  'minecraft:cherry_planks': [226, 177, 172],
  'minecraft:oak_log': [104, 83, 50],
  'minecraft:spruce_log': [58, 39, 23],
  'minecraft:birch_log': [216, 215, 210],
  'minecraft:dark_oak_log': [60, 45, 26],
  'minecraft:oak_leaves': [60, 106, 40],
  'minecraft:spruce_leaves': [40, 74, 40],
  'minecraft:birch_leaves': [102, 130, 62],
  'minecraft:dark_oak_leaves': [50, 96, 30],
  'minecraft:bricks': [150, 97, 83],
  'minecraft:stone_bricks': [122, 122, 122],
  'minecraft:mossy_stone_bricks': [110, 118, 102],
  'minecraft:smooth_stone': [158, 158, 158],
  'minecraft:polished_andesite': [132, 134, 133],
  'minecraft:polished_granite': [156, 110, 92],
  'minecraft:polished_diorite': [192, 192, 194],
  'minecraft:polished_deepslate': [72, 72, 75],
  'minecraft:deepslate_bricks': [70, 70, 73],
  'minecraft:deepslate_tiles': [55, 55, 57],
  'minecraft:blackstone': [42, 36, 41],
  'minecraft:polished_blackstone': [48, 43, 51],
  'minecraft:glass': [190, 220, 235],
  'minecraft:white_stained_glass': [225, 235, 238],
  'minecraft:light_gray_stained_glass': [160, 175, 180],
  'minecraft:iron_block': [220, 220, 220],
  'minecraft:gold_block': [246, 208, 62],
  'minecraft:diamond_block': [98, 219, 213],
  'minecraft:emerald_block': [42, 203, 88],
  'minecraft:copper_block': [193, 107, 76],
  'minecraft:oxidized_copper': [82, 162, 132],
  'minecraft:quartz_block': [236, 231, 224],
  'minecraft:smooth_quartz': [236, 231, 224],
  'minecraft:bookshelf': [110, 86, 52],
  'minecraft:hay_block': [166, 139, 24],
  'minecraft:glowstone': [222, 194, 132],
  'minecraft:sea_lantern': [190, 210, 200],
  'minecraft:obsidian': [20, 16, 30],
  'minecraft:terracotta': [152, 94, 68],
  'minecraft:white_concrete': [207, 213, 214],
  'minecraft:gray_concrete': [54, 57, 61],
  'minecraft:light_gray_concrete': [125, 125, 115],
  'minecraft:black_concrete': [8, 10, 15],
  'minecraft:red_concrete': [142, 33, 33],
  'minecraft:blue_concrete': [44, 46, 143],
  'minecraft:green_concrete': [73, 91, 36],
  'minecraft:yellow_concrete': [241, 175, 21],
  'minecraft:white_wool': [234, 236, 237],
  'minecraft:farmland': [110, 76, 45],
  'minecraft:moss_block': [90, 120, 50],
  'minecraft:mud': [60, 55, 55],
  'minecraft:calcite': [224, 224, 218],
  'minecraft:amethyst_block': [134, 98, 200],
  'minecraft:prismarine': [99, 156, 151],
  'minecraft:dark_prismarine': [51, 91, 75],
  'minecraft:mud_bricks': [137, 105, 78],
  'minecraft:packed_mud': [142, 106, 79],
};

const KEYWORDS = [
  [/deepslate/, [76, 76, 80]],
  [/blackstone/, [45, 39, 47]],
  [/quartz/, [235, 230, 222]],
  [/sandstone/, [216, 203, 155]],
  [/_sand$/, [219, 207, 163]],
  [/prismarine/, [90, 148, 143]],
  [/copper/, [193, 107, 76]],
  [/terracotta/, [152, 94, 68]],
  [/glazed/, [180, 160, 150]],
  [/concrete/, [130, 130, 130]],
  [/_wool$|carpet/, [200, 200, 200]],
  [/leaves|vine|azalea|lily_pad/, [58, 104, 40]],
  [/_log$|_wood$|stem|hyphae/, [100, 78, 48]],
  [/planks|_door$|trapdoor|fence|_sign$|barrel|bookshelf/, [155, 124, 74]],
  [/_stairs$|_slab$|_wall$/, [128, 128, 128]],
  [/brick/, [150, 97, 83]],
  [/stone/, [126, 126, 126]],
  [/glass/, [190, 220, 235]],
  [/water|kelp|seagrass|bubble/, [50, 90, 190]],
  [/lava|magma|fire/, [214, 96, 20]],
  [/ice|snow/, [230, 240, 248]],
  [/grass|moss|bamboo|sugar_cane|fern/, [96, 140, 60]],
  [/dirt|mud|podzol|farmland/, [134, 96, 67]],
  [/gold|yellow/, [230, 190, 60]],
  [/iron|anvil|chain|rail|lantern|light/, [190, 190, 190]],
  [/red|crimson|nether/, [150, 50, 45]],
  [/flower|tulip|poppy|dandelion|petal/, [200, 150, 160]],
  [/torch|candle|lamp/, [225, 190, 110]],
];

const colorCache = new Map();

function colorOf(id) {
  if (id === 0) return [18, 22, 28];
  const name = blockNames[id];
  let color = colorCache.get(name);
  if (color) return color;
  color = EXACT[name];
  if (!color) {
    for (const [pattern, candidate] of KEYWORDS) {
      if (pattern.test(name)) {
        color = candidate;
        break;
      }
    }
  }
  if (!color) {
    let hash = 0;
    for (let index = 0; index < name.length; index++) {
      hash = (hash * 131 + name.charCodeAt(index)) | 0;
    }
    color = [
      105 + (hash & 63),
      100 + ((hash >> 6) & 63),
      100 + ((hash >> 12) & 63),
    ];
  }
  colorCache.set(name, color);
  return color;
}

// ---------------------------------------------------------------- source inventory
function parseOpsBounds(files) {
  const bounds = {
    minX: Infinity,
    minY: Infinity,
    minZ: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
    maxZ: -Infinity,
  };
  let parsedOperations = 0;
  const missingFiles = [];
  for (const name of files ?? []) {
    const filename = path.join(ROOT, 'data/buildops', name);
    if (!fs.existsSync(filename)) {
      missingFiles.push(name);
      continue;
    }
    const lines = fs.readFileSync(filename, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(
        /^(?:SET|REPL)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)\b/,
      );
      if (!match) continue;
      const values = match.slice(1).map(Number);
      bounds.minX = Math.min(bounds.minX, values[0], values[3]);
      bounds.minY = Math.min(bounds.minY, values[1], values[4]);
      bounds.minZ = Math.min(bounds.minZ, values[2], values[5]);
      bounds.maxX = Math.max(bounds.maxX, values[0], values[3]);
      bounds.maxY = Math.max(bounds.maxY, values[1], values[4]);
      bounds.maxZ = Math.max(bounds.maxZ, values[2], values[5]);
      parsedOperations++;
    }
  }
  return {
    bounds: parsedOperations > 0 ? bounds : null,
    parsedOperations,
    missingFiles,
  };
}

const buildManifestPath = path.join(ROOT, 'builds/manifest.yaml');
const buildManifest = yaml.load(fs.readFileSync(buildManifestPath, 'utf8'));
const manifestUnits = buildManifest.units.map((unit) => ({
  name: unit.name,
  active: !unit.retired,
  retiredReason: unit.retired ?? null,
  ops: unit.ops ?? [],
  placementOps: unit.placement_ops ?? [],
  walk: unit.walk ?? null,
  ...parseOpsBounds(unit.ops ?? []),
}));

function readDatabase(filename, work) {
  const database = new Database(filename, { readonly: true });
  try {
    return work(database);
  } finally {
    database.close();
  }
}

const worldCatalog = readDatabase(
  path.join(ROOT, 'data/world-map.db'),
  (database) => ({
    projects: database.prepare(`
      SELECT project_id AS projectId, COUNT(*) AS featureCount,
             MIN(min_x) AS minX, MAX(max_x) AS maxX,
             MIN(min_z) AS minZ, MAX(max_z) AS maxZ
      FROM world_features
      GROUP BY project_id
      ORDER BY project_id
    `).all(),
    features: database.prepare(`
      SELECT id, project_id AS projectId, external_id AS externalId,
             parent_id AS parentId, world, name, kind, status,
             geometry_json AS geometryJson,
             min_x AS minX, max_x AS maxX, min_z AS minZ, max_z AS maxZ,
             source, source_ref AS sourceRef, confidence,
             completion_ratio AS completionRatio,
             condition_score AS conditionScore,
             tags_json AS tagsJson, attributes_json AS attributesJson,
             observed_at AS observedAt, revision
      FROM world_features
      ORDER BY project_id, kind, external_id, name
    `).all().map((row) => ({
      ...row,
      geometry: JSON.parse(row.geometryJson),
      tags: JSON.parse(row.tagsJson),
      attributes: JSON.parse(row.attributesJson),
      geometryJson: undefined,
      tagsJson: undefined,
      attributesJson: undefined,
    })),
    scans: database.prepare(`
      SELECT id, project_id AS projectId, world, method, status,
             bounds_json AS boundsJson, observer,
             snapshot_ref AS snapshotRef, summary_json AS summaryJson,
             error, started_at AS startedAt, completed_at AS completedAt
      FROM world_scans
      ORDER BY completed_at DESC
    `).all().map((row) => ({
      ...row,
      bounds: row.boundsJson ? JSON.parse(row.boundsJson) : null,
      summary: JSON.parse(row.summaryJson),
      boundsJson: undefined,
      summaryJson: undefined,
    })),
  }),
);

const townCatalog = readDatabase(
  path.join(ROOT, 'data/town.db'),
  (database) => ({
    towns: database.prepare('SELECT * FROM towns ORDER BY name').all(),
    districts: database.prepare(`
      SELECT d.*, t.name AS town_name
      FROM districts d
      LEFT JOIN towns t ON t.id = d.town_id
      ORDER BY town_name, d.name
    `).all().map((row) => ({
      ...row,
      bounds: row.bounds_json ? JSON.parse(row.bounds_json) : null,
      bounds_json: undefined,
    })),
    buildings: database.prepare(`
      SELECT b.*, t.name AS town_name, d.name AS district_name
      FROM buildings b
      LEFT JOIN towns t ON t.id = b.town_id
      LEFT JOIN districts d ON d.id = b.district_id
      ORDER BY town_name, b.name
    `).all(),
  }),
);

const markers = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/markers.json'), 'utf8'));
const zones = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/zones.json'), 'utf8'));
const routes = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/routes.json'), 'utf8'));
const markerById = new Map(markers.map((marker) => [marker.id, marker]));
const resolvedRoutes = routes.map((route) => ({
  ...route,
  waypoints: route.waypointIds.map((id) => {
    const marker = markerById.get(id);
    return marker
      ? { id, name: marker.name, position: marker.position }
      : { id, missing: true };
  }),
}));

const activeAreas = [
  {
    id: 'mainstreet-america',
    name: 'MainStreet America',
    classification: 'surface property / neighborhood grid',
    status: 'active',
    bounds: { minX: -300, maxX: 300, minZ: -300, maxZ: 300 },
    elevation: {
      protectedMinY: -64,
      protectedMaxY: 319,
      note: 'Surface varies; catalog contains exact per-feature Y geometry.',
    },
    provenance: [
      'data/world-map.db project mainstreet-america',
      'docs/mainstreet-america/qa/audit-2026-07-26.md',
      'docs/mainstreet-america/integration/worldguard.yaml',
    ],
    confidence: 'high',
  },
  {
    id: 'raven-rock',
    name: 'Raven Rock / Site R',
    classification: 'underground complex with surface access anchors',
    status: 'active',
    bounds: { minX: -300, maxX: 300, minZ: -300, maxZ: 300 },
    elevation: {
      minY: -18,
      maxY: 64,
      note: 'Mostly underground; the atlas plots only N3/N4/N5/N6 mouths and N9 shaft on the surface.',
    },
    surfaceAnchors: [
      { name: 'N3 portal mouth', x: -150, y: 18, z: 285, surfaceY: 62 },
      { name: 'N4 portal mouth', x: 0, y: 18, z: -285, surfaceY: 66 },
      { name: 'N5 portal mouth', x: 285, y: 18, z: -30, surfaceY: 63 },
      { name: 'N6 portal mouth', x: -290, y: 10, z: 5, surfaceY: 79 },
      { name: 'N9 shaft/head house', x: 200, y: 64, z: -15, surfaceY: 64 },
    ],
    provenance: [
      'docs/raven-rock/qa/build-log.md',
      'docs/raven-rock/qa/portal-survey.md',
      'docs/raven-rock/planning/coordinates.yaml',
      'builds/manifest.yaml#ravenrock-connectivity',
    ],
    confidence: 'high for named anchors; surface approaches remain visually natural/unfinished',
  },
  {
    id: 'ravensreach',
    name: 'Ravensreach',
    aliases: ['Worker Town'],
    classification: 'active governed town and expanded civic core',
    status: 'active',
    bounds: { minX: -147, maxX: -40, minZ: -451, maxZ: -324 },
    authoritativeDistrictBounds: {
      name: 'Old Town',
      minX: -126,
      maxX: -45,
      minZ: -422,
      maxZ: -338,
    },
    elevation: {
      activeBuildMinY: 24,
      activeBuildMaxY: 110,
      publicSurfaceY: 67,
      note: 'Expanded envelope is the union of active manifest ops; it includes underground Moot Hall/Sanctum work.',
    },
    provenance: [
      'data/town.db',
      'docs/worker-town/planning/site-plan.md',
      'docs/ravensreach/design/RAVENSREACH-CIVIC-QUARTER-2026-07-26.md',
      'builds/manifest.yaml active Ravensreach units',
    ],
    confidence: 'high; Old Town DB bounds and expanded build envelope are intentionally both retained',
  },
  {
    id: 'ravensgate',
    name: 'Ravensgate',
    classification: 'western civic/park extension',
    status: 'active',
    bounds: { minX: -148, maxX: -64, minZ: -562, maxZ: -420 },
    elevation: { activeBuildMinY: 64, activeBuildMaxY: 109 },
    provenance: [
      'builds/manifest.yaml#ravensgate',
      'data/buildops/rg1_civic.txt',
      'data/buildops/rg2_park.txt',
      'data/buildops/rg3_final.txt',
    ],
    confidence: 'high build-operation envelope; no separate town/world-feature DB row exists',
  },
  {
    id: 'approach-road',
    name: 'Western Approach Road',
    classification: 'surface road linking Ravensgate to Westlight',
    status: 'active',
    bounds: { minX: -352, maxX: -148, minZ: -509, maxZ: -484 },
    elevation: { activeBuildMinY: 62, activeBuildMaxY: 76 },
    provenance: [
      'builds/manifest.yaml#approach-road',
      'data/buildops/ar1_road.txt',
      'data/buildops/ar2_final.txt',
    ],
    confidence: 'high build-operation envelope',
  },
  {
    id: 'westlight-venue',
    name: 'Westlight Theatre / Stadium',
    classification: 'large surface venue with below-grade theatre',
    status: 'active',
    bounds: { minX: -443, maxX: -272, minZ: -640, maxZ: -488 },
    elevation: { activeBuildMinY: 10, activeBuildMaxY: 130 },
    provenance: [
      'builds/manifest.yaml active westlight venue units',
      'data/buildops/wl0_site.txt',
      'data/buildops/wl1_theatre.txt',
      'data/buildops/wl2_bowl.txt',
      'data/buildops/wl3_canopy.txt',
    ],
    confidence: 'high build-operation envelope',
  },
  {
    id: 'westlight-district',
    name: 'Westlight District',
    classification: 'mixed-use venue district and waterfront',
    status: 'active',
    bounds: { minX: -429, maxX: -260, minZ: -556, maxZ: -445 },
    elevation: { activeBuildMinY: 62, activeBuildMaxY: 110 },
    provenance: [
      'builds/manifest.yaml#westlight-district',
      'data/buildops/wd1_ground.txt',
      'data/buildops/wd2_buildings.txt',
      'data/buildops/wd3_waterfront.txt',
      'data/buildops/wd4_final.txt',
    ],
    confidence: 'high build-operation envelope; overlaps the Westlight venue by design',
  },
];

const ambiguities = [
  {
    subject: 'Ravensreach bounds',
    resolution: 'Preserve both the Town DB Old Town bounds and the larger active-build envelope. Neither is substituted for the other.',
  },
  {
    subject: 'Ravensgate and Westlight catalog coverage',
    resolution: 'They are active and manifest-backed but absent from world-map.db and control markers. Bounds therefore come from parsed active ops, not invented parcels.',
  },
  {
    subject: 'Raven Rock surface representation',
    resolution: 'Raven Rock is predominantly underground and shares MainStreet XZ. The surface atlas plots measured portal/shaft anchors only; it does not pretend the underground rooms are visible from above.',
  },
  {
    subject: 'Old Ravensreach concert hall / pavilion',
    resolution: 'Excluded from active boundaries because manifest entries explicitly mark them demolished, never-run, or superseded.',
  },
  {
    subject: 'Hollybrook, island HQ, and remote bunker coordinates',
    resolution: 'Excluded as retired DyoCraft-world documentation per BACKLOG.md item 11 and OPT-14. The current snapshot does not establish them as active-current-world projects.',
  },
  {
    subject: 'Generic feature catalog coverage',
    resolution: 'world-map.db contains MainStreet only. The atlas inventory retains this limitation instead of fabricating non-MainStreet feature records.',
  },
];

// ---------------------------------------------------------------- map definitions
const palette = {
  mainstreet: '#f5d547',
  ravenRock: '#cf6ce6',
  ravensreach: '#45e0c2',
  ravensgate: '#ff9e57',
  approach: '#f7f7f7',
  westlight: '#68a9ff',
  westlightDistrict: '#b6e36f',
  point: '#ff4d6d',
};

function box(id, label, bounds, color, options = {}) {
  return { type: 'box', id, label, bounds, color, ...options };
}

function point(label, x, z, color = palette.point, options = {}) {
  return { type: 'point', label, x, z, color, ...options };
}

const overallAnnotations = [
  box('mainstreet-america', 'MainStreet America', activeAreas[0].bounds, palette.mainstreet),
  box('ravensreach', 'Ravensreach', activeAreas[2].bounds, palette.ravensreach),
  box('ravensgate', 'Ravensgate', activeAreas[3].bounds, palette.ravensgate),
  box('approach-road', 'Approach Road', activeAreas[4].bounds, palette.approach),
  box('westlight-venue', 'Westlight Venue', activeAreas[5].bounds, palette.westlight),
  box('westlight-district', 'Westlight District', activeAreas[6].bounds, palette.westlightDistrict),
  point('World spawn', -9, -10, '#ffffff'),
  point('RR N3', -150, 285, palette.ravenRock),
  point('RR N4', 0, -285, palette.ravenRock),
  point('RR N5', 285, -30, palette.ravenRock),
  point('RR N6', -290, 5, palette.ravenRock),
  point('RR N9', 200, -15, palette.ravenRock),
];

const coreAnnotations = [
  box(
    'ravensreach',
    'Expanded Ravensreach core',
    activeAreas[2].bounds,
    palette.ravensreach,
  ),
  box(
    'old-town',
    'Old Town (town.db)',
    activeAreas[2].authoritativeDistrictBounds,
    '#ffffff',
    { dashed: true },
  ),
  point('Library', -128, -437, '#ffe066'),
  point('North mine', -85, -440, '#b0b0b0'),
  point('Moot Hall', -85, -375, '#ff8fab'),
  point('Amsterdam Square', -85, -370, '#ffb86b'),
  point('Market Hall', -56, -336, '#ffd166'),
  point('Grange Hall', -52, -361, '#cdb4db'),
  point('Oak grove', -110, -323, '#66d17a'),
  point('Sanctum (below)', -85, -380, palette.ravenRock, { labelOffsetY: 17 }),
];

const ravensgateAnnotations = [
  box('ravensgate', 'Ravensgate build envelope', activeAreas[3].bounds, palette.ravensgate),
  point('Town handoff', -108, -421, palette.ravensreach),
  point('Garth / library loggia', -108, -430, '#ffe066'),
  point('Bell-Gate', -85, -452, '#ff8fab'),
  point('Belvedere', -90, -470, '#f7f7f7'),
  point('Western handoff', -130, -498, palette.approach),
  point('Long Water / tempietto', -85, -556, '#68a9ff'),
];

const approachAnnotations = [
  box('approach-road', 'Western Approach Road', activeAreas[4].bounds, palette.approach),
  point('Ravensgate handoff', -148, -500, palette.ravensgate),
  point('Millstone', -170, -506, '#ffe066'),
  point('Panorama', -224, -496, '#ffe066'),
  point('White Bridge', -305, -497, '#ffffff'),
  point('Gatehead', -344, -486, palette.westlightDistrict),
];

const westlightAnnotations = [
  box('westlight-venue', 'Westlight Theatre / Stadium', activeAreas[5].bounds, palette.westlight),
  box('westlight-district', 'Westlight District', activeAreas[6].bounds, palette.westlightDistrict),
  point('Westlight bowl', -360, -560, '#ff8fab'),
  point('Members club (below)', -408, -560, palette.ravenRock),
  point('Gatehead', -344, -486, '#ffffff'),
  point('High Street', -380, -476, '#ffe066'),
  point('Field House', -394, -490, '#f7f7f7'),
  point('Beacon Inn', -416, -480, '#f7f7f7'),
  point('Malt & Lantern', -344, -455, '#ffd166'),
  point('Shorelight Park', -280, -486, '#66d17a'),
  point('Skiff House', -280, -507, '#ffd166'),
  point('Brimside boardwalk', -282, -535, '#68d8d6'),
];

const ravenRockAnnotations = [
  box('mainstreet-america', 'MainStreet surface property', activeAreas[0].bounds, palette.mainstreet),
  point('N3 — underwater surface', -150, 285, palette.ravenRock),
  point('N4 — hillside', 0, -285, palette.ravenRock),
  point('N5 — slope foot', 285, -30, palette.ravenRock),
  point('N6 — ridge', -290, 5, palette.ravenRock),
  point('N9 — shaft/head house', 200, -15, palette.ravenRock),
];

const mapDefinitions = [
  {
    filename: '00-overall-active-world-surface-atlas.png',
    title: 'Active-world surface atlas',
    subtitle: 'MainStreet · Ravensreach · Ravensgate · Approach Road · Westlight · Raven Rock surface anchors',
    bounds: MASTER,
    scale: 2,
    grid: 128,
    annotations: overallAnnotations,
  },
  {
    filename: '01-ravensreach-core-and-old-town.png',
    title: 'Ravensreach — expanded core and Old Town',
    subtitle: 'Town DB district retained inside the larger manifest-backed build envelope',
    bounds: { minX: -176, maxX: -16, minZ: -480, maxZ: -304 },
    scale: 5,
    grid: 32,
    annotations: coreAnnotations,
  },
  {
    filename: '02-ravensgate.png',
    title: 'Ravensgate',
    subtitle: 'Garth · Bell-Gate · belvedere · Long Water · western handoff',
    bounds: { minX: -176, maxX: -32, minZ: -592, maxZ: -400 },
    scale: 5,
    grid: 32,
    annotations: ravensgateAnnotations,
  },
  {
    filename: '03-western-approach-road.png',
    title: 'Western Approach Road',
    subtitle: 'Ravensgate → Millstone → Panorama → White Bridge → Gatehead',
    bounds: { minX: -368, maxX: -128, minZ: -536, maxZ: -456 },
    scale: 4,
    grid: 32,
    annotations: approachAnnotations,
  },
  {
    filename: '04-westlight-venue-and-district.png',
    title: 'Westlight venue and district',
    subtitle: 'Theatre/stadium · Gatehead · High Street · waterfront',
    bounds: { minX: -464, maxX: -240, minZ: -672, maxZ: -416 },
    scale: 4,
    grid: 32,
    annotations: westlightAnnotations,
  },
  {
    filename: '05-western-project-corridor.png',
    title: 'Western project corridor',
    subtitle: 'Ravensreach → Ravensgate → Approach Road → Westlight',
    bounds: { minX: -480, maxX: -16, minZ: -672, maxZ: -304 },
    scale: 3,
    grid: 64,
    annotations: [
      ...overallAnnotations.filter((item) => (
        ['ravensreach', 'ravensgate', 'approach-road', 'westlight-venue', 'westlight-district']
          .includes(item.id)
      )),
    ],
  },
  {
    filename: '06-raven-rock-surface-access.png',
    title: 'Raven Rock — surface access context',
    subtitle: 'Underground complex shown only by measured portal mouths and N9 shaft',
    bounds: { minX: -320, maxX: 320, minZ: -320, maxZ: 320 },
    scale: 2,
    grid: 64,
    annotations: ravenRockAnnotations,
  },
];

function sourceIndex(worldX, worldZ) {
  if (
    worldX < MASTER.minX
    || worldX > MASTER.maxX
    || worldZ < MASTER.minZ
    || worldZ > MASTER.maxZ
  ) {
    return -1;
  }
  return (
    (worldZ - MASTER.minZ) * masterWidth
    + (worldX - MASTER.minX)
  );
}

function drawLabel(context, x, y, label, color, options = {}) {
  const fontSize = options.fontSize ?? 13;
  context.font = `600 ${fontSize}px DejaVu Sans, sans-serif`;
  context.textBaseline = 'middle';
  const paddingX = 5;
  const height = fontSize + 8;
  const width = context.measureText(label).width + paddingX * 2;
  let labelX = x + (options.labelOffsetX ?? 7);
  let labelY = y + (options.labelOffsetY ?? -7);
  labelX = Math.max(2, Math.min(context.canvas.width - width - 2, labelX));
  labelY = Math.max(height / 2 + 2, Math.min(context.canvas.height - height / 2 - 2, labelY));
  context.fillStyle = 'rgba(5, 10, 18, 0.80)';
  context.fillRect(labelX, labelY - height / 2, width, height);
  context.strokeStyle = color;
  context.lineWidth = 1;
  context.strokeRect(labelX, labelY - height / 2, width, height);
  context.fillStyle = '#ffffff';
  context.fillText(label, labelX + paddingX, labelY + 1);
}

function renderMap(definition) {
  const { bounds, scale } = definition;
  const blockWidth = bounds.maxX - bounds.minX + 1;
  const blockHeight = bounds.maxZ - bounds.minZ + 1;
  const base = createCanvas(blockWidth, blockHeight);
  const baseContext = base.getContext('2d');
  const image = baseContext.createImageData(blockWidth, blockHeight);
  const pixels = image.data;
  let populated = 0;
  let minHeight = Infinity;
  let maxHeight = -Infinity;
  const materialCounts = new Map();
  for (let row = 0; row < blockHeight; row++) {
    const worldZ = bounds.minZ + row;
    for (let column = 0; column < blockWidth; column++) {
      const worldX = bounds.minX + column;
      const source = sourceIndex(worldX, worldZ);
      const id = source >= 0 ? surfaceIds[source] : 0;
      const height = source >= 0 ? heights[source] : WORLD_MIN_Y - 1;
      if (id !== 0) {
        populated++;
        minHeight = Math.min(minHeight, height);
        maxHeight = Math.max(maxHeight, height);
        const name = blockNames[id];
        materialCounts.set(name, (materialCounts.get(name) ?? 0) + 1);
      }
      const baseColor = colorOf(id);
      const west = sourceIndex(worldX - 1, worldZ);
      const north = sourceIndex(worldX, worldZ - 1);
      const westHeight = west >= 0 ? heights[west] : height;
      const northHeight = north >= 0 ? heights[north] : height;
      let shade = 1 + Math.max(
        -0.34,
        Math.min(0.34, ((height - westHeight) + (height - northHeight)) * 0.11),
      );
      shade *= 0.72 + 0.28 * Math.min(
        1,
        Math.max(0, (height + 64) / 200),
      );
      const offset = (row * blockWidth + column) * 4;
      pixels[offset] = Math.min(255, baseColor[0] * shade) | 0;
      pixels[offset + 1] = Math.min(255, baseColor[1] * shade) | 0;
      pixels[offset + 2] = Math.min(255, baseColor[2] * shade) | 0;
      pixels[offset + 3] = 255;
    }
  }
  baseContext.putImageData(image, 0, 0);

  const canvas = createCanvas(blockWidth * scale, blockHeight * scale);
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = false;
  context.drawImage(base, 0, 0, canvas.width, canvas.height);

  const toPixel = (x, z) => ({
    x: (x - bounds.minX) * scale,
    y: (z - bounds.minZ) * scale,
  });

  // Coordinate grid.
  context.save();
  context.font = '11px DejaVu Sans Mono, monospace';
  context.lineWidth = 1;
  const firstGridX = Math.ceil(bounds.minX / definition.grid) * definition.grid;
  const firstGridZ = Math.ceil(bounds.minZ / definition.grid) * definition.grid;
  for (let x = firstGridX; x <= bounds.maxX; x += definition.grid) {
    const pixel = toPixel(x, bounds.minZ).x;
    context.strokeStyle = 'rgba(255,255,255,0.24)';
    context.beginPath();
    context.moveTo(pixel, 0);
    context.lineTo(pixel, canvas.height);
    context.stroke();
    context.fillStyle = 'rgba(0,0,0,0.72)';
    context.fillRect(pixel + 2, 47, 52, 16);
    context.fillStyle = '#ffffff';
    context.fillText(`x ${x}`, pixel + 5, 59);
  }
  for (let z = firstGridZ; z <= bounds.maxZ; z += definition.grid) {
    const pixel = toPixel(bounds.minX, z).y;
    context.strokeStyle = 'rgba(255,255,255,0.24)';
    context.beginPath();
    context.moveTo(0, pixel);
    context.lineTo(canvas.width, pixel);
    context.stroke();
    context.fillStyle = 'rgba(0,0,0,0.72)';
    context.fillRect(2, pixel + 2, 56, 16);
    context.fillStyle = '#ffffff';
    context.fillText(`z ${z}`, 5, pixel + 14);
  }
  context.restore();

  // Project envelopes and points.
  for (const annotation of definition.annotations) {
    if (annotation.type === 'box') {
      const start = toPixel(annotation.bounds.minX, annotation.bounds.minZ);
      const end = toPixel(annotation.bounds.maxX + 1, annotation.bounds.maxZ + 1);
      context.save();
      context.strokeStyle = annotation.color;
      context.fillStyle = `${annotation.color}20`;
      context.lineWidth = Math.max(2, scale * 0.75);
      if (annotation.dashed) context.setLineDash([8, 5]);
      context.fillRect(start.x, start.y, end.x - start.x, end.y - start.y);
      context.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
      context.restore();
      drawLabel(
        context,
        (start.x + end.x) / 2,
        (start.y + end.y) / 2,
        annotation.label,
        annotation.color,
        { fontSize: scale >= 4 ? 13 : 12 },
      );
    } else {
      if (
        annotation.x < bounds.minX
        || annotation.x > bounds.maxX
        || annotation.z < bounds.minZ
        || annotation.z > bounds.maxZ
      ) {
        continue;
      }
      const pixel = toPixel(annotation.x, annotation.z);
      context.save();
      context.fillStyle = annotation.color;
      context.strokeStyle = '#07111d';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(pixel.x, pixel.y, Math.max(4, scale + 2), 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.restore();
      drawLabel(context, pixel.x, pixel.y, annotation.label, annotation.color, annotation);
    }
  }

  // Header.
  const headerHeight = 43;
  context.fillStyle = 'rgba(4, 9, 16, 0.88)';
  context.fillRect(0, 0, canvas.width, headerHeight);
  context.fillStyle = '#ffffff';
  context.font = '700 18px DejaVu Sans, sans-serif';
  context.fillText(definition.title, 12, 20);
  context.fillStyle = '#c7d4e5';
  context.font = '11px DejaVu Sans, sans-serif';
  context.fillText(definition.subtitle, 12, 36);

  // North arrow and scale bar.
  context.save();
  context.strokeStyle = '#ffffff';
  context.fillStyle = '#ffffff';
  context.lineWidth = 2;
  const northX = canvas.width - 26;
  context.beginPath();
  context.moveTo(northX, 34);
  context.lineTo(northX, 10);
  context.lineTo(northX - 5, 18);
  context.moveTo(northX, 10);
  context.lineTo(northX + 5, 18);
  context.stroke();
  context.font = '700 11px DejaVu Sans, sans-serif';
  context.fillText('N', northX - 4, 39);
  const barBlocks = definition.grid >= 128 ? 128 : 32;
  const barWidth = barBlocks * scale;
  const barX = 12;
  const barY = canvas.height - 17;
  context.strokeStyle = '#ffffff';
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(barX, barY);
  context.lineTo(barX + barWidth, barY);
  context.stroke();
  context.fillStyle = 'rgba(0,0,0,0.76)';
  context.fillRect(barX, barY - 20, 88, 16);
  context.fillStyle = '#ffffff';
  context.font = '11px DejaVu Sans, sans-serif';
  context.fillText(`${barBlocks} blocks`, barX + 4, barY - 8);
  context.restore();

  // Footer provenance.
  const provenance = (
    `snapshot ${snapshot.sha256.slice(0, 12)}… · bounds `
    + `x[${bounds.minX},${bounds.maxX}] z[${bounds.minZ},${bounds.maxZ}] · `
    + `${scale} px/block · north = -Z`
  );
  context.font = '11px DejaVu Sans Mono, monospace';
  const provenanceWidth = Math.min(
    canvas.width - 8,
    context.measureText(provenance).width + 10,
  );
  context.fillStyle = 'rgba(0,0,0,0.76)';
  context.fillRect(canvas.width - provenanceWidth - 4, canvas.height - 21, provenanceWidth, 18);
  context.fillStyle = '#ffffff';
  context.fillText(provenance, canvas.width - provenanceWidth + 1, canvas.height - 8);

  const outputPath = path.join(OUTPUT_DIR, definition.filename);
  fs.writeFileSync(outputPath, canvas.toBuffer('image/png'));
  const topMaterials = [...materialCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 12)
    .map(([name, count]) => ({ name, count }));
  return {
    file: relative(outputPath),
    filename: definition.filename,
    sha256: sha256File(outputPath),
    bytes: fs.statSync(outputPath).size,
    widthPixels: canvas.width,
    heightPixels: canvas.height,
    bounds,
    blocksWide: blockWidth,
    blocksHigh: blockHeight,
    scalePixelsPerBlock: scale,
    orientation: {
      north: '-Z / image up',
      east: '+X / image right',
    },
    populatedColumns: populated,
    totalColumns: blockWidth * blockHeight,
    populatedRatio: populated / (blockWidth * blockHeight),
    surfaceElevation: {
      minY: Number.isFinite(minHeight) ? minHeight : null,
      maxY: Number.isFinite(maxHeight) ? maxHeight : null,
    },
    topSurfaceMaterials: topMaterials,
    nonblank: (
      fs.statSync(outputPath).size > 10_000
      && populated > Math.min(1_000, blockWidth * blockHeight * 0.02)
      && materialCounts.size > 4
    ),
  };
}

await loadMasterSurface();

const renderedMaps = [];
for (const definition of mapDefinitions) {
  process.stderr.write(`rendering ${definition.filename}\n`);
  renderedMaps.push(renderMap(definition));
}

const sourceEvidence = [
  'builds/manifest.yaml',
  'data/world-map.db',
  'data/town.db',
  'data/markers.json',
  'data/zones.json',
  'data/routes.json',
  'docs/WORLD-MAPPING.md',
  'docs/worker-town/planning/site-plan.md',
  'docs/ravensreach/design/RAVENSREACH-CIVIC-QUARTER-2026-07-26.md',
  'docs/ravensreach/design/MASTERPLAN-RAVENSREACH-PUBLIC-REALM.md',
  'docs/raven-rock/qa/build-log.md',
  'docs/raven-rock/qa/portal-survey.md',
  'docs/raven-rock/planning/coordinates.yaml',
  'docs/mainstreet-america/qa/audit-2026-07-26.md',
  'docs/mainstreet-america/integration/worldguard.yaml',
  'BACKLOG.md',
].map(fileEvidence);

const inventory = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  readOnly: true,
  snapshot: {
    directory: relative(REGION_DIR),
    ...snapshot,
  },
  activeAreas,
  ambiguities,
  sources: sourceEvidence,
  buildManifest: {
    file: 'builds/manifest.yaml',
    units: manifestUnits,
  },
  worldFeatureCatalog: worldCatalog,
  townCatalog,
  controlCatalog: {
    markers,
    zones,
    routes: resolvedRoutes,
    limitation: 'Current local control markers/routes/zones cover MainStreet only.',
  },
};

const inventoryPath = path.join(OUTPUT_DIR, 'area-inventory.json');
fs.writeFileSync(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`);

const readme = `# Active-world surface atlas — Team A

Generated ${new Date().toISOString()} from the copied Anvil snapshot only.

- Snapshot SHA-256: \`${snapshot.sha256}\`
- Orientation: north is image up (\`-Z\`); east is image right (\`+X\`).
- Overall coverage: \`x[${MASTER.minX},${MASTER.maxX}] z[${MASTER.minZ},${MASTER.maxZ}]\`.
- Rendering is surface-only. Raven Rock is predominantly underground, so only its
  measured N3/N4/N5/N6 portal mouths and N9 shaft are annotated.
- Ravensreach/Worker Town is the sole active town in \`town.db\`. Ravensgate,
  the Approach Road, and Westlight are active manifest-backed projects but do not
  yet have first-class rows in \`world-map.db\`.
- Hollybrook, island HQ, and the remote bunker coordinates are deliberately excluded:
  current repository guidance identifies them as retired DyoCraft-world records.
- Retired/superseded Ravensreach concert-hall, pavilion, and never-run fit-out units
  remain in the detailed inventory for provenance but are not mapped as active.

The concise map metadata is in \`atlas-manifest.json\`; the full normalized source
inventory is in \`area-inventory.json\`.
`;
const readmePath = path.join(OUTPUT_DIR, 'README.md');
fs.writeFileSync(readmePath, readme);

const manifest = {
  schemaVersion: 1,
  package: 'atlas-2026-07-26/team-a',
  generatedAt: new Date().toISOString(),
  purpose: 'Read-only active-world surface atlas and named-area inventory',
  snapshot: {
    directory: relative(REGION_DIR),
    sha256: snapshot.sha256,
    regionFileCount: snapshot.members.length,
    hashAlgorithm: snapshot.algorithm,
  },
  renderer: {
    file: 'scripts/generate_surface_atlas.mjs',
    source: 'local Anvil WORLD_SURFACE heightmaps plus palette lookup',
    mode: 'offline/read-only',
    masterBounds: MASTER,
    worldYRangeDecoded: { minY: WORLD_MIN_Y, maxY: WORLD_MAX_Y },
    chunkStats,
  },
  maps: renderedMaps,
  activeAreas: activeAreas.map((area) => ({
    id: area.id,
    name: area.name,
    classification: area.classification,
    bounds: area.bounds,
    elevation: area.elevation,
    confidence: area.confidence,
    provenance: area.provenance,
  })),
  ambiguities,
  companions: [
    {
      file: relative(inventoryPath),
      bytes: fs.statSync(inventoryPath).size,
      sha256: sha256File(inventoryPath),
      description: 'Detailed normalized inventory from DBs, manifest, local controls, and docs.',
    },
    {
      file: relative(readmePath),
      bytes: fs.statSync(readmePath).size,
      sha256: sha256File(readmePath),
      description: 'Human-readable scope and exclusions.',
    },
  ],
  verification: {
    allMapsNonblank: renderedMaps.every((map) => map.nonblank),
    checks: 'PNG byte size > 10,000; populated terrain columns; >4 surface material classes.',
    worldOrServiceMutations: 0,
  },
};

const manifestPath = path.join(OUTPUT_DIR, 'atlas-manifest.json');
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

if (!manifest.verification.allMapsNonblank) {
  throw new Error('One or more atlas maps failed nonblank verification');
}

process.stdout.write(`${JSON.stringify({
  outputDirectory: relative(OUTPUT_DIR),
  snapshotSha256: snapshot.sha256,
  maps: renderedMaps.map((map) => ({
    file: map.file,
    bytes: map.bytes,
    dimensions: `${map.widthPixels}x${map.heightPixels}`,
    populatedRatio: Number(map.populatedRatio.toFixed(4)),
    nonblank: map.nonblank,
  })),
  chunkStats,
}, null, 2)}\n`);
