#!/usr/bin/env node
/**
 * Audit D02-S01/S02 using immutable local evidence only.
 *
 * The selected August 4 snapshot contains region files but no level.dat,
 * entity regions, or POI regions. This generator therefore produces exact
 * region-only facts and an explicit completeness failure. It cannot emit
 * operations or authorize a world edit.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

import nbt from 'prismarine-nbt';

const ROOT = process.cwd();
const argv = process.argv.slice(2);

function value(flag, fallback) {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

function values(flag) {
  const result = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === flag && argv[index + 1]) result.push(argv[index + 1]);
  }
  return result;
}

const GENERATED_AT = value('--generated-at', '2026-08-04T21:56:58Z');
const DATA_ROOT = path.resolve(value('--data-root', 'data'));
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-d02-s01-s02-region-evidence.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-d02-s01-s02-region-evidence.md',
));
const HISTORICAL_INVENTORY_REPLAY = argv.includes('--historical-inventory-replay');
const EXCLUDED_POST_GENERATION_CANDIDATES = new Set(
  values('--exclude-post-generation-candidate').map((filename) => path.resolve(filename)),
);

assert(
  EXCLUDED_POST_GENERATION_CANDIDATES.size === 0 || HISTORICAL_INVENTORY_REPLAY,
  '--exclude-post-generation-candidate requires --historical-inventory-replay',
);
for (const excluded of EXCLUDED_POST_GENERATION_CANDIDATES) {
  assert(
    excluded === DATA_ROOT || excluded.startsWith(`${DATA_ROOT}${path.sep}`),
    `historical candidate exclusion is outside --data-root: ${excluded}`,
  );
  assert(fs.existsSync(excluded), `historical candidate exclusion does not exist: ${excluded}`);
}

const INPUTS = {
  authorityPacket: 'docs/masterplans/05-combined-zones/phase1-d02-civil-authority-packet.json',
  c1Civil: 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json',
  phase0Evidence: 'docs/masterplans/05-combined-zones/phase0-survey-evidence.json',
  corridorClearance: 'docs/masterplans/05-combined-zones/corridor-clearance.json',
  relocationSchedule: 'docs/redevelopment/2026-07-28-town-expansion/c01-east-relocation-coordinate-schedule.json',
  relocationEngineering: 'docs/redevelopment/2026-07-28-town-expansion/northeast-datacenter-c01-relocation-engineering.json',
  releaseGeometryAudit: 'docs/redevelopment/2026-07-28-town-expansion/independent-release-geometry-safety-audit.md',
  railwayCloseout: 'docs/redevelopment/2026-07-28-town-expansion/railway-migration-closeout.json',
  undergroundInventory: 'docs/redevelopment/2026-07-28-underground-navigation/underground-inventory.json',
};

const ROLES = {
  authorityPacket: 'D02 conservative defaults and S01/S02 evidence contract',
  c1Civil: 'exact C1 land-take reconstruction and C01 comparison source',
  phase0Evidence: 'selected immutable region-only snapshot identity and structure starts',
  corridorClearance: 'catalogued C01 feature bounds and contested truth boundary',
  relocationSchedule: 'planned C01/P01/portal/road scopes and explicit release gates',
  relocationEngineering: 'prior source census and competing relocation geometry',
  releaseGeometryAudit: 'independent finding that old C01 retirement and full parking recovery were absent',
  railwayCloseout: 'ISSUE-002 open-at-closeout identity',
  undergroundInventory: 'published contested C01 arrival truth boundary',
};

const WORLD_MIN_Y = -64;
const WORLD_MAX_Y = 319;
const AIR = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
  'minecraft:light',
  'minecraft:structure_void',
  'minecraft:moving_piston',
]);
const WATER = new Set(['minecraft:water', 'minecraft:bubble_column']);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function fileBinding(relativePath, role) {
  const data = fs.readFileSync(path.join(ROOT, relativePath));
  return { path: relativePath, sha256: sha256(data), bytes: data.length, role };
}

function increment(map, key, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

function sortedCounts(map, limit = null) {
  const rows = [...map.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((left, right) => right.count - left.count || left.id.localeCompare(right.id));
  return limit === null ? rows : rows.slice(0, limit);
}

function canonical(value) {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(canonical(value));
}

function canonicalState(state) {
  const properties = state.Properties ?? state.properties ?? {};
  const suffix = Object.keys(properties).sort().map((key) => `${key}=${properties[key]}`).join(',');
  return suffix ? `${state.Name}[${suffix}]` : state.Name;
}

function isWaterlogged(state) {
  const properties = state.Properties ?? state.properties ?? {};
  return properties.waterlogged === 'true' || properties.waterlogged === true;
}

function isGravitySensitiveCandidate(name) {
  return /(^|:)(sand|red_sand|gravel|dragon_egg|scaffolding)$/.test(name)
    || /(_concrete_powder|_anvil)$/.test(name);
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
    assert(!(compression & 0x80), `external chunk storage unsupported at ${cx},${cz}`);
    const { parsed } = await nbt.parse(decompress(compression, buffer.subarray(offset + 5, offset + 4 + length)));
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

function directoryMcaSummary(directory) {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    return { present: false, mcaFileCount: 0, bytes: 0 };
  }
  const files = fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.mca'));
  return {
    present: true,
    mcaFileCount: files.length,
    bytes: files.reduce((sum, entry) => sum + fs.statSync(path.join(directory, entry.name)).size, 0),
  };
}

function discoverSnapshotCandidates(dataRoot) {
  const roots = new Set();
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (['region', 'entities', 'poi'].includes(entry.name)) {
          roots.add(path.dirname(filename));
          continue;
        }
        walk(filename);
      } else if (entry.name === 'level.dat') {
        roots.add(directory);
      }
    }
  }
  walk(dataRoot);
  return [...roots]
    .filter((root) => !EXCLUDED_POST_GENERATION_CANDIDATES.has(path.resolve(root)))
    .sort()
    .map((root) => {
      const region = directoryMcaSummary(path.join(root, 'region'));
      const entities = directoryMcaSummary(path.join(root, 'entities'));
      const poi = directoryMcaSummary(path.join(root, 'poi'));
      const levelDatPath = path.join(root, 'level.dat');
      const levelDat = fs.existsSync(levelDatPath) && fs.statSync(levelDatPath).isFile()
        ? { present: true, bytes: fs.statSync(levelDatPath).size, sha256: sha256(fs.readFileSync(levelDatPath)) }
        : { present: false, bytes: 0, sha256: null };
      const complete = region.mcaFileCount > 0 && entities.mcaFileCount > 0
        && poi.mcaFileCount > 0 && levelDat.present;
      return {
        root: relative(root),
        region,
        entities,
        poi,
        levelDat,
        complete,
        completenessStatus: complete ? 'COMPLETE_COPIED_SAVE_CANDIDATE' : 'INCOMPLETE_COPIED_SAVE',
      };
    });
}

function tangentAt(points, index) {
  const previous = points[Math.max(0, index - 1)];
  const next = points[Math.min(points.length - 1, index + 1)];
  const dx = next.x - previous.x;
  const dz = next.z - previous.z;
  const length = Math.hypot(dx, dz);
  assert(length > 0, `zero tangent at station ${index}`);
  return { x: dx / length, z: dz / length };
}

function offsetPoint(point, tangent, offset) {
  return {
    x: point.x + Math.round(offset * -tangent.z),
    z: point.z + Math.round(offset * tangent.x),
  };
}

function canonicalOffsetColumns(centerline, offsetFrom, offsetTo) {
  const columns = new Map();
  for (let station = 0; station < centerline.length; station++) {
    const tangent = tangentAt(centerline, station);
    for (let offset = offsetFrom; offset <= offsetTo; offset++) {
      const point = offsetPoint(centerline[station], tangent, offset);
      const key = `${point.x},${point.z}`;
      if (!columns.has(key)) columns.set(key, { ...point, station, offset });
    }
  }
  return [...columns.values()];
}

function columnSetHash(cells, preamble) {
  const digest = crypto.createHash('sha256');
  digest.update(`${preamble}\n`);
  const ordered = [...cells].sort((left, right) => left.x - right.x || left.z - right.z);
  for (const cell of ordered) digest.update(`${cell.x},${cell.z}\n`);
  return digest.digest('hex');
}

function boundsOfColumns(columns) {
  return {
    minX: Math.min(...columns.map((column) => column.x)),
    maxX: Math.max(...columns.map((column) => column.x)),
    minZ: Math.min(...columns.map((column) => column.z)),
    maxZ: Math.max(...columns.map((column) => column.z)),
  };
}

function blockEntitiesInScope(reader, predicate) {
  const entities = [];
  for (const chunk of reader.chunks.values()) {
    if (!chunk) continue;
    for (const entity of chunk.raw.block_entities ?? chunk.raw.blockEntities ?? []) {
      const x = Number(entity.x);
      const y = Number(entity.y);
      const z = Number(entity.z);
      if (predicate(x, y, z)) entities.push({ entity, id: entity.id ?? 'UNKNOWN', x, y, z });
    }
  }
  entities.sort((left, right) => left.x - right.x || left.y - right.y || left.z - right.z || left.id.localeCompare(right.id));
  const types = new Map();
  const digest = crypto.createHash('sha256');
  digest.update('combined-zones-d02-block-entities-v1\n');
  for (const item of entities) {
    increment(types, item.id);
    digest.update(`${item.x},${item.y},${item.z},${canonicalJson(item.entity)}\n`);
  }
  return {
    count: entities.length,
    byType: sortedCounts(types),
    nbtSetSha256: digest.digest('hex'),
    nbtContentsPublished: false,
  };
}

async function scanFullHeightColumns(reader, columns) {
  const ordered = [...columns].sort((left, right) => left.x - right.x || left.z - right.z);
  const columnKeys = new Set(ordered.map((column) => `${column.x},${column.z}`));
  const chunks = new Map();
  for (const column of ordered) {
    const cx = Math.floor(column.x / 16);
    const cz = Math.floor(column.z / 16);
    chunks.set(`${cx},${cz}`, { cx, cz });
  }
  const missingChunks = [];
  for (const chunkCoordinate of [...chunks.values()].sort((left, right) => left.cx - right.cx || left.cz - right.cz)) {
    if (!await reader.readChunk(chunkCoordinate.cx, chunkCoordinate.cz)) missingChunks.push(chunkCoordinate);
  }

  const names = new Map();
  const exactStates = new Map();
  const digest = crypto.createHash('sha256');
  digest.update('combined-zones-d02-c1-full-height-state-stream-v1\n');
  digest.update(`columns=${columnSetHash(ordered, 'combined-zones-c1-total-land-take-columns-v1')}\n`);
  digest.update(`worldY=${WORLD_MIN_Y}..${WORLD_MAX_Y}\n`);
  let airLikeCells = 0;
  let waterCells = 0;
  let waterloggedCells = 0;
  let lavaCells = 0;
  let gravitySensitiveCandidateCells = 0;
  let nonAirMinY = null;
  let nonAirMaxY = null;
  let fluidMinY = null;
  let fluidMaxY = null;
  for (const column of ordered) {
    const chunk = reader.chunks.get(`${Math.floor(column.x / 16)},${Math.floor(column.z / 16)}`);
    let stream = `${column.x},${column.z}\n`;
    for (let y = WORLD_MIN_Y; y <= WORLD_MAX_Y; y++) {
      const state = reader.stateAt(chunk, column.x, y, column.z);
      const stateText = canonicalState(state);
      increment(names, state.Name);
      increment(exactStates, stateText);
      stream += `${stateText}\0`;
      if (AIR.has(state.Name)) {
        airLikeCells++;
      } else {
        nonAirMinY = nonAirMinY === null ? y : Math.min(nonAirMinY, y);
        nonAirMaxY = nonAirMaxY === null ? y : Math.max(nonAirMaxY, y);
      }
      const fluid = WATER.has(state.Name) || state.Name === 'minecraft:lava' || isWaterlogged(state);
      if (WATER.has(state.Name)) waterCells++;
      if (state.Name === 'minecraft:lava') lavaCells++;
      if (isWaterlogged(state)) waterloggedCells++;
      if (isGravitySensitiveCandidate(state.Name)) gravitySensitiveCandidateCells++;
      if (fluid) {
        fluidMinY = fluidMinY === null ? y : Math.min(fluidMinY, y);
        fluidMaxY = fluidMaxY === null ? y : Math.max(fluidMaxY, y);
      }
    }
    digest.update(stream);
  }

  const blockEntities = blockEntitiesInScope(
    reader,
    (x, y, z) => y >= WORLD_MIN_Y && y <= WORLD_MAX_Y && columnKeys.has(`${x},${z}`),
  );
  const totalCells = ordered.length * (WORLD_MAX_Y - WORLD_MIN_Y + 1);
  return {
    scope: {
      columnCount: ordered.length,
      columnSetSha256: columnSetHash(ordered, 'combined-zones-c1-total-land-take-columns-v1'),
      bounds: boundsOfColumns(ordered),
      worldY: { min: WORLD_MIN_Y, max: WORLD_MAX_Y, inclusiveHeight: WORLD_MAX_Y - WORLD_MIN_Y + 1 },
      surveyedCellCount: totalCells,
      touchedChunkCount: chunks.size,
      missingChunkCount: missingChunks.length,
      missingChunks,
    },
    stateCensus: {
      stateStreamSha256: digest.digest('hex'),
      uniqueBlockNameCount: names.size,
      uniqueExactStateCount: exactStates.size,
      airLikeCells,
      nonAirCells: totalCells - airLikeCells,
      waterCells,
      waterloggedCells,
      lavaCells,
      gravitySensitiveCandidateCells,
      nonAirYRange: { min: nonAirMinY, max: nonAirMaxY },
      fluidYRange: { min: fluidMinY, max: fluidMaxY },
      topBlockNames: sortedCounts(names, 30),
      topExactStates: sortedCounts(exactStates, 30),
      gravityRule: 'Explicit name rule: sand, red_sand, gravel, dragon_egg, scaffolding, *_concrete_powder, and *_anvil.',
    },
    blockEntities,
  };
}

async function scanBox(reader, id, bounds) {
  const names = new Map();
  const exactStates = new Map();
  const digest = crypto.createHash('sha256');
  digest.update(`combined-zones-d02-box-state-stream-v1\n${id}\n${canonicalJson(bounds)}\n`);
  const touchedChunks = new Map();
  let airLikeCells = 0;
  let waterCells = 0;
  let waterloggedCells = 0;
  let lavaCells = 0;
  let gravitySensitiveCandidateCells = 0;
  for (let cx = Math.floor(bounds.minX / 16); cx <= Math.floor(bounds.maxX / 16); cx++) {
    for (let cz = Math.floor(bounds.minZ / 16); cz <= Math.floor(bounds.maxZ / 16); cz++) {
      touchedChunks.set(`${cx},${cz}`, { cx, cz });
      await reader.readChunk(cx, cz);
    }
  }
  const missingChunks = [...touchedChunks.values()].filter(({ cx, cz }) => !reader.chunks.get(`${cx},${cz}`));
  for (let x = bounds.minX; x <= bounds.maxX; x++) {
    for (let z = bounds.minZ; z <= bounds.maxZ; z++) {
      const chunk = reader.chunks.get(`${Math.floor(x / 16)},${Math.floor(z / 16)}`);
      let stream = `${x},${z}\n`;
      for (let y = bounds.minY; y <= bounds.maxY; y++) {
        const state = reader.stateAt(chunk, x, y, z);
        const stateText = canonicalState(state);
        increment(names, state.Name);
        increment(exactStates, stateText);
        stream += `${stateText}\0`;
        if (AIR.has(state.Name)) airLikeCells++;
        if (WATER.has(state.Name)) waterCells++;
        if (state.Name === 'minecraft:lava') lavaCells++;
        if (isWaterlogged(state)) waterloggedCells++;
        if (isGravitySensitiveCandidate(state.Name)) gravitySensitiveCandidateCells++;
      }
      digest.update(stream);
    }
  }
  const cellCount = (bounds.maxX - bounds.minX + 1)
    * (bounds.maxY - bounds.minY + 1)
    * (bounds.maxZ - bounds.minZ + 1);
  return {
    id,
    bounds,
    cellCount,
    touchedChunkCount: touchedChunks.size,
    missingChunkCount: missingChunks.length,
    stateStreamSha256: digest.digest('hex'),
    airLikeCells,
    nonAirCells: cellCount - airLikeCells,
    waterCells,
    waterloggedCells,
    lavaCells,
    gravitySensitiveCandidateCells,
    uniqueBlockNameCount: names.size,
    uniqueExactStateCount: exactStates.size,
    topBlockNames: sortedCounts(names, 20),
    blockEntities: blockEntitiesInScope(
      reader,
      (x, y, z) => x >= bounds.minX && x <= bounds.maxX
        && y >= bounds.minY && y <= bounds.maxY
        && z >= bounds.minZ && z <= bounds.maxZ,
    ),
  };
}

async function scanSurface(reader, id, bounds) {
  const topNames = new Map();
  const topStates = new Map();
  const digest = crypto.createHash('sha256');
  digest.update(`combined-zones-d02-surface-stream-v1\n${id}\n${canonicalJson(bounds)}\n`);
  let minimumTopY = null;
  let maximumTopY = null;
  let columnsWithoutTop = 0;
  let waterTopColumns = 0;
  let lavaTopColumns = 0;
  for (let x = bounds.minX; x <= bounds.maxX; x++) {
    for (let z = bounds.minZ; z <= bounds.maxZ; z++) {
      const chunk = await reader.readChunk(Math.floor(x / 16), Math.floor(z / 16));
      let top = null;
      for (let y = WORLD_MAX_Y; y >= WORLD_MIN_Y; y--) {
        const state = reader.stateAt(chunk, x, y, z);
        if (!AIR.has(state.Name)) {
          top = { y, state };
          break;
        }
      }
      if (!top) {
        columnsWithoutTop++;
        digest.update(`${x},${z},NONE\n`);
        continue;
      }
      const stateText = canonicalState(top.state);
      increment(topNames, top.state.Name);
      increment(topStates, stateText);
      minimumTopY = minimumTopY === null ? top.y : Math.min(minimumTopY, top.y);
      maximumTopY = maximumTopY === null ? top.y : Math.max(maximumTopY, top.y);
      if (WATER.has(top.state.Name)) waterTopColumns++;
      if (top.state.Name === 'minecraft:lava') lavaTopColumns++;
      digest.update(`${x},${top.y},${z},${stateText}\n`);
    }
  }
  const columnCount = (bounds.maxX - bounds.minX + 1) * (bounds.maxZ - bounds.minZ + 1);
  return {
    id,
    bounds,
    columnCount,
    surfaceStreamSha256: digest.digest('hex'),
    columnsWithoutTop,
    minimumTopY,
    maximumTopY,
    waterTopColumns,
    lavaTopColumns,
    uniqueTopBlockNameCount: topNames.size,
    topBlockNames: sortedCounts(topNames, 20),
    topExactStates: sortedCounts(topStates, 20),
    interpretation: 'Highest non-air region block per column. This is not parking geometry, route clearance, an entity census, or ownership evidence.',
  };
}

function planOverlapColumnCount(columns, bounds) {
  return columns.filter((column) => column.x >= bounds.minX && column.x <= bounds.maxX
    && column.z >= bounds.minZ && column.z <= bounds.maxZ).length;
}

const authorityPacket = readJson(INPUTS.authorityPacket);
const civil = readJson(INPUTS.c1Civil);
const phase0 = readJson(INPUTS.phase0Evidence);
const clearance = readJson(INPUTS.corridorClearance);
const relocationSchedule = readJson(INPUTS.relocationSchedule);
const relocationEngineering = readJson(INPUTS.relocationEngineering);
const railwayCloseout = readJson(INPUTS.railwayCloseout);
const undergroundInventory = readJson(INPUTS.undergroundInventory);

assert(authorityPacket.status === 'RECOMMENDATIONS_READY_D02_HOLD', 'D02 authority packet status drift');
assert(authorityPacket.safetyBoundary.d02Resolved === false, 'D02 authority packet unexpectedly resolves D02');
assert(civil.status === 'PARTIAL_PASS_D02_HOLD', 'C1 civil status drift');
assert(phase0.snapshots.postGeneration.sha256 === civil.immutableSnapshot.sha256, 'selected region snapshot identity disagreement');
assert(relocationSchedule.status === 'INDEPENDENT_PLANNING_DECISION_NOT_A_BUILD_RELEASE', 'C01 relocation schedule truth boundary drift');
assert(relocationEngineering.state === 'DESIGN_REVIEW_ONLY_NO_LIVE_MUTATION', 'C01 engineering truth boundary drift');
assert(railwayCloseout.issues?.items?.some((item) => item.startsWith('ISSUE-002')), 'ISSUE-002 is not recorded open at closeout');
assert(undergroundInventory.truthBoundary?.c01East?.includes('ISSUE-002')
  || undergroundInventory.truthBoundary?.c01East?.includes('contested'), 'underground inventory C01 truth boundary drift');

const sourceBindings = Object.entries(INPUTS).map(([key, relativePath]) => fileBinding(relativePath, ROLES[key]));
const snapshotCandidates = discoverSnapshotCandidates(DATA_ROOT);
const completeCandidates = snapshotCandidates.filter((candidate) => candidate.complete);
const completeSaveCandidateAvailable = completeCandidates.length > 0;
const inventoryDigest = sha256(`${snapshotCandidates.map((candidate) => canonicalJson(candidate)).join('\n')}\n`);

const selectedRegionDirectory = path.resolve(phase0.snapshots.postGeneration.path);
const selectedSnapshot = snapshotIdentity(selectedRegionDirectory);
assert(selectedSnapshot.sha256 === phase0.snapshots.postGeneration.sha256, 'selected region SHA-256 drift');
assert(selectedSnapshot.regionFileCount === phase0.snapshots.postGeneration.regionFileCount, 'selected region file-count drift');
assert(selectedSnapshot.bytes === phase0.snapshots.postGeneration.bytes, 'selected region byte-count drift');

const centerline = civil.horizontalAlignment.stations.map((station) => ({ x: station.x, z: station.z }));
const totalLandTake = canonicalOffsetColumns(
  centerline,
  civil.crossSection.totalLandTake.offsetFrom,
  civil.crossSection.totalLandTake.offsetTo,
);
assert(totalLandTake.length === civil.crossSection.totalLandTake.uniqueColumnCount, 'C1 total-land-take column count drift');
assert(columnSetHash(totalLandTake, 'combined-zones-c1-total-land-take-columns-v1')
  === civil.crossSection.totalLandTake.columnSetSha256, 'C1 total-land-take column hash drift');

const reader = new SnapshotReader(selectedRegionDirectory);
const c1FullHeight = await scanFullHeightColumns(reader, totalLandTake);
assert(c1FullHeight.scope.missingChunkCount === 0, 'selected region snapshot is missing C1 chunks');

const relevantStructureStarts = phase0.generatedStructureStarts
  .map((start) => ({
    id: start.id,
    bounds: start.bounds,
    sourceChunk: { x: start.chunkX, z: start.chunkZ },
    exactLandTakePlanOverlapColumnCount: planOverlapColumnCount(totalLandTake, start.bounds),
  }))
  .filter((start) => start.exactLandTakePlanOverlapColumnCount > 0)
  .sort((left, right) => left.bounds.minX - right.bounds.minX
    || left.bounds.minZ - right.bounds.minZ || left.id.localeCompare(right.id));

const civilInterfaceByName = new Map(civil.interfaces.c01.map((item) => [item.feature, item]));
const c01FeatureEvidence = [];
for (const finding of clearance.results.findings.filter((item) => item.feature.startsWith('C01 '))) {
  const civilInterface = civilInterfaceByName.get(finding.feature);
  assert(civilInterface, `missing civil interface for ${finding.feature}`);
  const exactPlanOverlap = planOverlapColumnCount(totalLandTake, finding.extent);
  assert(exactPlanOverlap === civilInterface.exactLandTakeOverlapColumnCount, `${finding.feature} plan-overlap drift`);
  const volume = await scanBox(reader, finding.feature, {
    minX: finding.extent.minX,
    maxX: finding.extent.maxX,
    minY: finding.featureBaseY,
    maxY: finding.featureTopY,
    minZ: finding.extent.minZ,
    maxZ: finding.extent.maxZ,
  });
  c01FeatureEvidence.push({
    feature: finding.feature,
    catalogLayer: finding.layer,
    catalogProject: finding.project,
    exactLandTakePlanOverlapColumnCount: exactPlanOverlap,
    exactLandTakePlanGapBlocksChebyshev: civilInterface.exactLandTakePlanGapBlocksChebyshev,
    minimumSurfaceDatumSeparationAboveFeatureTop: civilInterface.minimumSurfaceDatumSeparationAboveFeatureTop,
    regionVolume: volume,
    acceptance: 'REGION_STATE_EVIDENCE_ONLY_SEMANTIC_IDENTITY_OWNERSHIP_LOADING_AND_USABILITY_HOLD',
  });
}

const oldSourceBounds = relocationEngineering.worldSurvey.c01Source.transactionBounds;
const oldSourceVolume = await scanBox(reader, 'ISSUE-002-OLD-C01-SOURCE-VOLUME', {
  minX: oldSourceBounds[0], minY: oldSourceBounds[1], minZ: oldSourceBounds[2],
  maxX: oldSourceBounds[3], maxY: oldSourceBounds[4], maxZ: oldSourceBounds[5],
});
const eastStudyBounds = relocationSchedule.selectedReservation.studyEnvelope;
const eastStudyVolume = await scanBox(reader, 'ISSUE-002-C01-EAST-STUDY-ENVELOPE', {
  minX: eastStudyBounds[0], maxX: eastStudyBounds[1],
  minY: eastStudyBounds[2], maxY: eastStudyBounds[3],
  minZ: eastStudyBounds[4], maxZ: eastStudyBounds[5],
});
const portalBounds = relocationSchedule.access.portalStudy.bounds;
const portalStudyVolume = await scanBox(reader, 'ISSUE-002-C01-EAST-PORTAL-STUDY', {
  minX: portalBounds[0], maxX: portalBounds[1],
  minY: portalBounds[2], maxY: portalBounds[3],
  minZ: portalBounds[4], maxZ: portalBounds[5],
});
const p01 = relocationSchedule.p01Recovery.bounds;
const p01Surface = await scanSurface(reader, 'ISSUE-002-P01-RECOVERY-SURFACE', {
  minX: p01[0], maxX: p01[1], minZ: p01[2], maxZ: p01[3],
});

const oldC01PriorBlockEntities = relocationEngineering.worldSurvey.c01Source.blockEntities.count;
const oldSourceRegionFinding = oldSourceVolume.blockEntities.count > 0
  ? 'NONEMPTY_WITH_BLOCK_ENTITIES_CONSISTENT_WITH_OLD_SOURCE_NOT_RETIRED'
  : 'NO_BLOCK_ENTITIES_OBSERVED_REGION_ONLY_SEMANTIC_RETIREMENT_STILL_UNPROVEN';

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-d02-s01-s02-region-evidence',
  generatedAtUtc: GENERATED_AT,
  status: completeSaveCandidateAvailable
    ? 'PARTIAL_PASS_REGION_FACTS_COMPLETE_SAVE_CANDIDATE_AVAILABLE_REVIEW_REQUIRED_D02_HOLD'
    : 'PARTIAL_PASS_REGION_FACTS_COMPLETE_SAVE_MISSING_D02_HOLD',
  purpose: 'Deterministic copied-save completeness audit plus full-height C1 and C01/ISSUE-002 region-only evidence for D02-S01/S02.',
  safetyBoundary: {
    localFilesOnly: true,
    liveCallsPerformed: [],
    databasesOpened: [],
    operationCells: [],
    materialCells: [],
    operationCellCount: 0,
    worldEditAuthorized: false,
    physicalBuildAuthorized: false,
    d02Resolved: false,
    s01Complete: false,
    s02Complete: false,
  },
  sourceBindings,
  copiedSaveCompletenessAudit: {
    dataRoot: relative(DATA_ROOT),
    discoveryRule: 'Recursively group every parent of region/, entities/, poi/, or level.dat under data/. A complete candidate requires nonempty region, entities, and poi MCA sets plus level.dat.',
    candidateCount: snapshotCandidates.length,
    completeCandidateCount: completeCandidates.length,
    inventorySha256: inventoryDigest,
    candidates: snapshotCandidates,
    conclusion: completeCandidates.length
      ? 'COMPLETE_COPIED_SAVE_CANDIDATE_AVAILABLE_REVIEW_REQUIRED'
      : 'NO_COMPLETE_COPIED_SAVE_AVAILABLE_UNDER_DATA',
  },
  selectedRegionOnlyEvidence: {
    identity: selectedSnapshot,
    completeness: {
      region: true,
      entities: false,
      poi: false,
      levelDat: false,
      status: 'INCOMPLETE_REGION_ONLY_TERRAIN_AND_BLOCK_ENTITY_EVIDENCE',
    },
    permittedInferences: [
      'block states and block entities stored in the selected region chunks',
      'generated-structure starts stored and previously sealed from those region chunks',
      'exact full-height region-state counts and hashes over declared scopes',
    ],
    prohibitedInferences: [
      'current entities or entity clearance',
      'POI, resident, job-site, or route occupancy',
      'world identity or gamerule/dimension metadata from level.dat',
      'same-moment completeness across region/entities/poi',
      'semantic commissioning, ownership, loading permission, or usable arrival',
    ],
  },
  d02S01: {
    status: completeSaveCandidateAvailable
      ? 'PARTIAL_PASS_EXACT_REGION_CENSUS_COMPLETE_SAVE_CANDIDATE_REVIEW_REQUIRED'
      : 'PARTIAL_PASS_EXACT_REGION_CENSUS_COMPLETE_SAVE_COMPONENTS_MISSING',
    c1FullHeight,
    relevantGeneratedStructureStarts: {
      count: relevantStructureStarts.length,
      records: relevantStructureStarts,
      interpretation: 'Exact plan overlap with the C1 land-take columns; not an occupied-cell or clearance result.',
    },
    closedFacts: [
      'The complete hash-bound 80-block C1 land take was reconstructed byte-deterministically.',
      'Every land-take column was decoded for all 384 world levels with zero missing region chunks.',
      'Exact block-state, fluid, gravity-candidate, block-entity, and generated-start facts are sealed.',
    ],
    remainingBlockers: [
      completeSaveCandidateAvailable
        ? 'A complete copied-save candidate exists, but this historical region-only audit does not accept or consume it; use the dedicated complete-save intake audit.'
        : 'No same-moment entities, POI, or level.dat evidence exists in any copied-save candidate.',
      'The region census does not select treatment typologies, foundations, future excavation/fill influence cells, or groundwater-like behavior.',
      'Hydrology components and accepted outfalls remain D02-S03 work.',
    ],
  },
  d02S02: {
    status: 'PARTIAL_PASS_REGION_INTERFACE_FACTS_ISSUE_002_REMAINS_OPEN',
    c01CatalogFeatureVolumes: c01FeatureEvidence,
    issue002RegionEvidence: {
      oldC01SourceVolume: oldSourceVolume,
      oldC01PriorSurveyBlockEntityCount: oldC01PriorBlockEntities,
      oldSourceRegionFinding,
      eastStudyVolume,
      portalStudyVolume,
      p01Surface,
      roadStudy: {
        start: relocationSchedule.access.roadStudy.start,
        end: relocationSchedule.access.roadStudy.end,
        minimumWidthBlocks: relocationSchedule.access.roadStudy.minimumWidthBlocks,
        priorDryPathfindingResult: relocationSchedule.access.roadStudy.dryPathfindingResult,
        exactAcceptedRoadCellSetAvailable: false,
        status: 'HOLD_NO_EXACT_ACCEPTED_ROAD_SET',
      },
      authoritativeReleaseTruth: {
        railwayCloseoutIssue: railwayCloseout.issues.items.find((item) => item.startsWith('ISSUE-002')),
        independentAuditFinding: 'The old C01 is not actually moved; full old-program retirement and full P01 recovery were absent from the reviewed release geometry.',
        undergroundInventoryTruthBoundary: undergroundInventory.truthBoundary.c01East,
      },
    },
    closedFacts: [
      'Every catalogued C01 feature volume is state-hashed against the selected August 4 region snapshot.',
      'The old-source, east-study, portal-study, and P01 surface scopes have exact region-only state identities.',
      'The old C01 source scope remains nonempty and contains block entities in the selected region evidence.',
      'The accepted documentary truth keeps ISSUE-002 open and says relocation/arrival were not delivered.',
    ],
    remainingBlockers: [
      completeSaveCandidateAvailable
        ? 'A complete copied-save candidate exists, but C01 semantic, ownership, route, and ISSUE-002 acceptance remain outside this region-only audit.'
        : 'No complete current copied save establishes entity, POI, level.dat, or same-moment identity.',
      'Region blocks cannot establish semantic program migration, commissioning, usable road/entrance, full parking circulation, canonical ownership, or loading permission.',
      'No exact accepted road cell set exists to survey.',
      'ISSUE-002 requires explicit sole-authority disposition and must remain open in this artifact.',
    ],
  },
  decisionImpact: {
    d02B01: 'MATERIALLY_NARROWED_FULL_HEIGHT_REGION_STATE_KNOWN_TREATMENTS_AND_COMPLETE_SAVE_HOLD',
    d02B02: 'MATERIALLY_NARROWED_C01_VOLUMES_HASHED_STRUCTURAL_AND_COMPLETE_SAVE_HOLD',
    d02B04: 'NEGATIVE_EVIDENCE_STRENGTHENED_ISSUE_002_AND_OWNERSHIP_HOLD',
    d02Resolved: false,
    r00Ready: false,
  },
  nextAutonomousWork: [
    'Use the sealed S01 region census to compile alternative treatment classes without operations.',
    'Use the sealed C01 volume identities to draft exact default-deny interface/exclusion candidates.',
    'Run D02-S03 hydrology/component/outfall modelling from the region snapshot, labelled region-only.',
  ],
  exactExternalRequirement: {
    missingArtifact: completeSaveCandidateAvailable
      ? 'Dedicated intake and acceptance of the available complete copied-save candidate against its whole-package capture manifest.'
      : 'A current immutable copied save containing region/, entities/, poi/, and level.dat from one frozen capture, with a whole-package identity manifest.',
    afterReceipt: completeSaveCandidateAvailable
      ? 'Use the dedicated complete-save intake and scope-clearance artifacts; do not rewrite this historical region-only evidence or infer C01 semantic acceptance from file completeness.'
      : 'Regenerate this audit against that package, require identical or explicitly superseded region identity, then evaluate entities, POI, world metadata, semantic routes, and sole-authority ownership/ISSUE-002 acceptance.',
  },
  finalGate: {
    status: completeSaveCandidateAvailable
      ? 'HOLD_D02_S01_S02_COMPLETE_SAVE_REVIEW_REQUIRED_NO_WORLD_EDITS'
      : 'HOLD_D02_S01_S02_INCOMPLETE_NO_WORLD_EDITS',
    worldEditAuthorized: false,
    reason: completeSaveCandidateAvailable
      ? 'Exact region facts remain valid and a separate complete-save candidate now exists, but completeness alone cannot close C01 semantics, ownership, routes, technical acceptance, or ISSUE-002.'
      : 'Exact region facts are complete for the selected scopes, but no complete copied save exists and region evidence cannot close C01 semantics, ownership, or ISSUE-002.',
  },
};

function list(items) {
  return items.map((item) => `- ${item}`).join('\n');
}

const markdown = `# D02-S01/S02 copied-save and region evidence\n\n`
  + `**Status:** ${report.finalGate.status}  \n`
  + `**Generated:** ${GENERATED_AT}  \n`
  + `**Selected region identity:** \`${selectedSnapshot.sha256}\`\n\n`
  + (completeSaveCandidateAvailable
    ? `A complete copied-save candidate now exists under \`data/\`, but this artifact remains a historical region-only audit. Use the dedicated complete-save intake evidence; file completeness alone cannot close D02-S01, D02-S02, ISSUE-002, or R00.\n\n`
    : `No complete copied save exists under \`data/\`: ${snapshotCandidates.length} candidate roots were inspected, and none contains all of \`region/\`, \`entities/\`, \`poi/\`, and \`level.dat\`. The exact region-only work below is useful evidence, but it cannot close D02-S01, D02-S02, ISSUE-002, or R00.\n\n`)
  + `## Snapshot completeness\n\n`
  + `| Candidates | Complete | Selected region files | Selected bytes | Missing components |\n`
  + `|---:|---:|---:|---:|---|\n`
  + `| ${snapshotCandidates.length} | ${completeCandidates.length} | ${selectedSnapshot.regionFileCount} | ${selectedSnapshot.bytes} | entities/, poi/, level.dat |\n\n`
  + `Inventory hash: \`${inventoryDigest}\`.\n\n`
  + `## D02-S01 full-height C1 region census\n\n`
  + `| Measure | Result |\n|---|---:|\n`
  + `| Exact land-take columns | ${c1FullHeight.scope.columnCount.toLocaleString('en-US')} |\n`
  + `| Full-height cells decoded | ${c1FullHeight.scope.surveyedCellCount.toLocaleString('en-US')} |\n`
  + `| Touched chunks | ${c1FullHeight.scope.touchedChunkCount.toLocaleString('en-US')} |\n`
  + `| Missing chunks | ${c1FullHeight.scope.missingChunkCount} |\n`
  + `| Non-air cells | ${c1FullHeight.stateCensus.nonAirCells.toLocaleString('en-US')} |\n`
  + `| Water/bubble cells | ${c1FullHeight.stateCensus.waterCells.toLocaleString('en-US')} |\n`
  + `| Waterlogged cells | ${c1FullHeight.stateCensus.waterloggedCells.toLocaleString('en-US')} |\n`
  + `| Lava cells | ${c1FullHeight.stateCensus.lavaCells.toLocaleString('en-US')} |\n`
  + `| Gravity-sensitive candidates | ${c1FullHeight.stateCensus.gravitySensitiveCandidateCells.toLocaleString('en-US')} |\n`
  + `| Block entities | ${c1FullHeight.blockEntities.count.toLocaleString('en-US')} |\n`
  + `| Relevant generated starts | ${relevantStructureStarts.length} |\n\n`
  + `State-stream hash: \`${c1FullHeight.stateCensus.stateStreamSha256}\`. Generated-start overlap is plan-only and does not prove occupied-cell clearance.\n\n`
  + `### Closed region facts\n\n${list(report.d02S01.closedFacts)}\n\n`
  + `### Remaining S01 blockers\n\n${list(report.d02S01.remainingBlockers)}\n\n`
  + `## D02-S02 C01 and ISSUE-002 evidence\n\n`
  + `| Feature | Region cells | Non-air | Block entities | C1 plan overlap | Acceptance |\n`
  + `|---|---:|---:|---:|---:|---|\n`
  + c01FeatureEvidence.map((item) => `| ${item.feature} | ${item.regionVolume.cellCount} | ${item.regionVolume.nonAirCells} | ${item.regionVolume.blockEntities.count} | ${item.exactLandTakePlanOverlapColumnCount} | HOLD |`).join('\n')
  + `\n\nThe old C01 source survey scope is nonempty with ${oldSourceVolume.blockEntities.count.toLocaleString('en-US')} region-stored block entities. This is consistent with the independent finding that the old source was not retired; it is not a semantic inventory or commissioning test.\n\n`
  + `P01 has ${p01Surface.columnCount.toLocaleString('en-US')} region-surveyed surface columns, ${p01Surface.uniqueTopBlockNameCount} top block names, and top Y ${p01Surface.minimumTopY}..${p01Surface.maximumTopY}. That does not establish uninterrupted parking circulation. The road remains HOLD because no exact accepted road cell set exists.\n\n`
  + `### Closed region facts\n\n${list(report.d02S02.closedFacts)}\n\n`
  + `### Remaining S02 blockers\n\n${list(report.d02S02.remainingBlockers)}\n\n`
  + `## Exact missing evidence\n\n${report.exactExternalRequirement.missingArtifact}\n\n${report.exactExternalRequirement.afterReceipt}\n\n`
  + `This audit performs no live calls, opens no database, emits zero operations/material cells, leaves D02 and R00 on HOLD, and authorizes no world edit.\n`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

console.log(JSON.stringify({
  status: report.status,
  output: relative(OUTPUT),
  markdown: relative(MARKDOWN),
  snapshotCandidates: snapshotCandidates.length,
  completeSnapshotCandidates: completeCandidates.length,
  c1Columns: c1FullHeight.scope.columnCount,
  c1Cells: c1FullHeight.scope.surveyedCellCount,
  c1MissingChunks: c1FullHeight.scope.missingChunkCount,
  c01Features: c01FeatureEvidence.length,
  operationCellCount: 0,
  d02Resolved: false,
  worldEditAuthorized: false,
}, null, 2));
