#!/usr/bin/env node
/**
 * Compile read-only D05 hydrology and protected-relic buffer coordination
 * evidence from the immutable Combined Zones Phase 0 post snapshot.
 *
 * This script never connects to Minecraft, RCON, the fleet API, systemd, or
 * SSH. It emits no construction ownership, target cells, materials, or
 * operations. Its one-cell relic shells are review candidates, not approved
 * engineering buffers.
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

const PHASE0_EVIDENCE = path.resolve(value(
  '--phase0-evidence',
  'docs/masterplans/05-combined-zones/phase0-survey-evidence.json',
));
const COORDINATES = path.resolve(value(
  '--coordinates',
  'docs/masterplans/05-combined-zones/site-coordinates.json',
));
const GEOMETRY = path.resolve(value(
  '--geometry',
  'docs/masterplans/05-combined-zones/phase1-geometry-coordination.json',
));
const DECISIONS = path.resolve(value(
  '--decisions',
  'docs/masterplans/05-combined-zones/phase1-design-decisions.json',
));
const RELIC_CLEARANCE = path.resolve(value(
  '--relic-clearance',
  'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
));
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-d05-hydrology-relic-buffer-design.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-d05-hydrology-relic-buffer-design.md',
));

const WORLD_MIN_Y = -64;
const WORLD_MAX_Y = 319;
const WATER_NAMES = new Set(['minecraft:water', 'minecraft:bubble_column']);
const LAVA_NAMES = new Set(['minecraft:lava']);
const FROZEN_NAMES = new Set([
  'minecraft:ice',
  'minecraft:packed_ice',
  'minecraft:blue_ice',
  'minecraft:frosted_ice',
]);
const SNOW_NAMES = new Set([
  'minecraft:snow',
  'minecraft:snow_block',
  'minecraft:powder_snow',
]);

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function fileBinding(filename) {
  const data = fs.readFileSync(filename);
  return {
    path: relative(filename),
    bytes: data.length,
    sha256: sha256(data),
  };
}

function snapshotIdentity(directory) {
  const names = fs.readdirSync(directory)
    .filter((name) => name.endsWith('.mca'))
    .sort();
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
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

function canonicalState(state) {
  const properties = Object.entries(state?.Properties ?? {})
    .sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify({
    Name: state?.Name ?? 'minecraft:air',
    ...(properties.length ? { Properties: Object.fromEntries(properties) } : {}),
  });
}

function isWaterState(state) {
  return WATER_NAMES.has(state?.Name)
    || state?.Properties?.waterlogged === 'true';
}

function familyForState(state) {
  if (isWaterState(state)) return 'water';
  if (LAVA_NAMES.has(state?.Name)) return 'lava';
  if (FROZEN_NAMES.has(state?.Name)) return 'frozen';
  if (SNOW_NAMES.has(state?.Name)) return 'snow';
  return null;
}

function halfOpenToInclusive(bounds) {
  return {
    minX: bounds.minXInclusive,
    maxX: bounds.maxXExclusive - 1,
    minY: bounds.minYInclusive,
    maxY: bounds.maxYExclusive - 1,
    minZ: bounds.minZInclusive,
    maxZ: bounds.maxZExclusive - 1,
  };
}

function volume(bounds) {
  return (bounds.maxX - bounds.minX + 1)
    * (bounds.maxY - bounds.minY + 1)
    * (bounds.maxZ - bounds.minZ + 1);
}

function expand(bounds, margin) {
  return {
    minX: bounds.minX - margin,
    maxX: bounds.maxX + margin,
    minY: bounds.minY - margin,
    maxY: bounds.maxY + margin,
    minZ: bounds.minZ - margin,
    maxZ: bounds.maxZ + margin,
  };
}

function contains(bounds, cell) {
  return cell.x >= bounds.minX && cell.x <= bounds.maxX
    && cell.y >= bounds.minY && cell.y <= bounds.maxY
    && cell.z >= bounds.minZ && cell.z <= bounds.maxZ;
}

function intersection(left, right) {
  const result = {
    minX: Math.max(left.minX, right.minX),
    maxX: Math.min(left.maxX, right.maxX),
    minY: Math.max(left.minY, right.minY),
    maxY: Math.min(left.maxY, right.maxY),
    minZ: Math.max(left.minZ, right.minZ),
    maxZ: Math.min(left.maxZ, right.maxZ),
  };
  return result.minX <= result.maxX
    && result.minY <= result.maxY
    && result.minZ <= result.maxZ
    ? result
    : null;
}

function boxCells(bounds) {
  const result = [];
  for (let x = bounds.minX; x <= bounds.maxX; x++) {
    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      for (let z = bounds.minZ; z <= bounds.maxZ; z++) {
        result.push({ x, y, z });
      }
    }
  }
  return result;
}

function sortCells(cells) {
  return cells.sort((left, right) => left.x - right.x
    || left.y - right.y
    || left.z - right.z);
}

function coordinateSetHash(cells) {
  const digest = crypto.createHash('sha256');
  digest.update('combined-zones-coordinate-cell-set-v1\n');
  for (const cell of sortCells([...cells])) {
    digest.update(`${cell.x},${cell.y},${cell.z}\n`);
  }
  return digest.digest('hex');
}

function columnSetHash(columns) {
  const digest = crypto.createHash('sha256');
  digest.update('combined-zones-column-set-v1\n');
  for (const column of [...columns].sort((left, right) => left.x - right.x || left.z - right.z)) {
    digest.update(`${column.x},${column.z}\n`);
  }
  return digest.digest('hex');
}

function stateSetHash(cells) {
  const digest = crypto.createHash('sha256');
  digest.update('combined-zones-block-state-cell-set-v1\n');
  for (const cell of sortCells([...cells])) {
    digest.update(`${cell.x},${cell.y},${cell.z}\t${canonicalState(cell.state)}\n`);
  }
  return digest.digest('hex');
}

function sortedCounts(counts) {
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)),
  );
}

const phase0 = readJson(PHASE0_EVIDENCE);
const coordinates = readJson(COORDINATES);
const geometry = readJson(GEOMETRY);
const decisions = readJson(DECISIONS);
const relicClearance = readJson(RELIC_CLEARANCE);
const regionDirectory = path.resolve(phase0.snapshots.postGeneration.path);
const snapshot = snapshotIdentity(regionDirectory);

assert(snapshot.sha256 === phase0.snapshots.postGeneration.sha256, 'Phase 0 post snapshot SHA-256 mismatch');
assert(snapshot.regionFileCount === phase0.snapshots.postGeneration.regionFileCount, 'Phase 0 post snapshot member-count mismatch');
assert(snapshot.bytes === phase0.snapshots.postGeneration.bytes, 'Phase 0 post snapshot byte-count mismatch');
assert(relicClearance.g06Disposition?.status === 'HOLD', 'relic clearance must remain HOLD');
assert(decisions.decisions?.find((decision) => decision.id === 'D05')?.status === 'HOLD', 'D05 decision must remain HOLD');

const mountainRecord = geometry.compiledCoordinationGeometry?.normalized04EnvelopeCellSets
  ?.find((entry) => entry.id === 'continuous-mountain');
assert(mountainRecord, 'missing exact continuous-mountain coordination envelope');
const mountain = halfOpenToInclusive(mountainRecord.exactCoordinationCellSet.bounds);
assert(volume(mountain) === mountainRecord.exactCoordinationCellSet.cellCount, 'mountain coordination volume mismatch');
const hydrologySurvey = {
  minX: mountain.minX,
  maxX: mountain.maxX,
  minY: WORLD_MIN_Y,
  maxY: WORLD_MAX_Y,
  minZ: mountain.minZ,
  maxZ: mountain.maxZ,
};

const WIDTH = hydrologySurvey.maxX - hydrologySurvey.minX + 1;
const HEIGHT = hydrologySurvey.maxY - hydrologySurvey.minY + 1;
const DEPTH = hydrologySurvey.maxZ - hydrologySurvey.minZ + 1;
const X_STRIDE = HEIGHT * DEPTH;
const Y_STRIDE = DEPTH;

function encode(x, y, z) {
  return (x - hydrologySurvey.minX) * X_STRIDE
    + (y - hydrologySurvey.minY) * Y_STRIDE
    + z - hydrologySurvey.minZ;
}

function decode(id) {
  const localX = Math.floor(id / X_STRIDE);
  const remainder = id - localX * X_STRIDE;
  const localY = Math.floor(remainder / Y_STRIDE);
  const localZ = remainder - localY * Y_STRIDE;
  return {
    x: hydrologySurvey.minX + localX,
    y: hydrologySurvey.minY + localY,
    z: hydrologySurvey.minZ + localZ,
  };
}

const regionCache = new Map();
const chunkCache = new Map();

function regionBuffer(rx, rz) {
  const key = `${rx},${rz}`;
  if (regionCache.has(key)) return regionCache.get(key);
  const filename = path.join(regionDirectory, `r.${rx}.${rz}.mca`);
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
  const key = `${cx},${cz}`;
  if (chunkCache.has(key)) return chunkCache.get(key);
  const buffer = regionBuffer(Math.floor(cx / 32), Math.floor(cz / 32));
  assert(buffer, `missing region file for mountain chunk ${cx},${cz}`);
  const index = ((cx & 31) + (cz & 31) * 32) * 4;
  const sectorOffset = buffer.readUIntBE(index, 3);
  assert(sectorOffset, `missing mountain chunk ${cx},${cz}`);
  const offset = sectorOffset * 4096;
  const length = buffer.readUInt32BE(offset);
  const compression = buffer.readUInt8(offset + 4);
  assert(!(compression & 0x80), `external chunk storage unsupported at ${cx},${cz}`);
  const { parsed } = await nbt.parse(decompress(
    compression,
    buffer.subarray(offset + 5, offset + 4 + length),
  ));
  const chunk = nbt.simplify(parsed);
  assert(chunk?.Status === 'minecraft:full', `mountain chunk ${cx},${cz} is not minecraft:full`);
  chunkCache.set(key, chunk);
  return chunk;
}

async function stateAt(x, y, z) {
  const chunk = await readChunk(Math.floor(x / 16), Math.floor(z / 16));
  const section = chunk.sections?.find((candidate) => Number(candidate.Y) === Math.floor(y / 16));
  const states = section?.block_states;
  if (!states?.palette?.length) return { Name: 'minecraft:air' };
  const index = ((y & 15) << 8) | ((z & 15) << 4) | (x & 15);
  return states.palette[paletteIndex(states, index, 4)] ?? { Name: 'minecraft:air' };
}

const relicCandidates = [];
const candidateShellIdsByRelic = new Map();
for (const relic of relicClearance.relics) {
  const core = relic.declaredInclusiveBounds;
  const expanded = expand(core, 1);
  const shellCells = boxCells(expanded).filter((cell) => !contains(core, cell));
  const shellStateCells = [];
  const familyCounts = { water: 0, lava: 0, frozen: 0, snow: 0 };
  const materialCounts = {};
  for (const cell of shellCells) {
    const state = await stateAt(cell.x, cell.y, cell.z);
    shellStateCells.push({ ...cell, state });
    materialCounts[state.Name] = (materialCounts[state.Name] ?? 0) + 1;
    const family = familyForState(state);
    if (family) familyCounts[family]++;
  }
  const mountainIntersection = intersection(expanded, mountain);
  const inMountainShellCells = shellCells.filter((cell) => contains(mountain, cell));
  candidateShellIdsByRelic.set(
    relic.key,
    new Set(shellCells
      .filter((cell) => contains(hydrologySurvey, cell))
      .map((cell) => encode(cell.x, cell.y, cell.z))),
  );
  relicCandidates.push({
    relicKey: relic.key,
    structureId: relic.structureId,
    presentCellFinding: relic.observedSnapshotCensus.finding,
    protectedCore: {
      bounds: core,
      cellCount: relic.evidenceBackedDefaultDenyCore.cellCount,
      coordinateSetSha256: relic.evidenceBackedDefaultDenyCore.coordinateSetSha256,
    },
    minimumAdjacencyBufferCandidate: {
      status: 'EXACT_CANDIDATE_NOT_REVIEWED',
      derivation: 'one-cell Chebyshev dilation of the protected core minus the core; this prevents face, edge, or corner adjacency but is not a structural or hydrological safety distance',
      positiveMarginBlocks: 1,
      expandedBounds: expanded,
      cellCount: shellCells.length,
      coordinateSetSha256: coordinateSetHash(shellCells),
      blockStateSetSha256: stateSetHash(shellStateCells),
      materialCounts: sortedCounts(materialCounts),
      hydrologyAndCryosphereCellCounts: familyCounts,
      mountainCoordinationIntersection: {
        expandedBoundsIntersection: mountainIntersection,
        shellCellCount: inMountainShellCells.length,
        shellCoordinateSetSha256: coordinateSetHash(inMountainShellCells),
      },
      hydrologySurveyIntersection: {
        shellCellCount: shellCells.filter((cell) => contains(hydrologySurvey, cell)).length,
        shellCoordinateSetSha256: coordinateSetHash(
          shellCells.filter((cell) => contains(hydrologySurvey, cell)),
        ),
      },
      constructionOwnership: false,
      operationAuthorization: false,
    },
    exactReviewedBufferCellSet: null,
    reviewHoldReason: relic.key === 'igloo-east'
      ? 'The recorded start bound is empty in the immutable snapshot; a candidate shell preserves the record but cannot imply present relic fabric or an exhibit safety buffer.'
      : 'One-cell adjacency separation is reproducible but does not establish support, entrance, drainage, snowmelt, exhibit, or future-construction safety.',
  });
}

const HALO_MIN_X = mountain.minX - 1;
const HALO_MAX_X = mountain.maxX + 1;
const HALO_MIN_Z = mountain.minZ - 1;
const HALO_MAX_Z = mountain.maxZ + 1;
const HALO_WIDTH = HALO_MAX_X - HALO_MIN_X + 1;
const HALO_DEPTH = HALO_MAX_Z - HALO_MIN_Z + 1;
const surfaceY = new Int16Array(HALO_WIDTH * HALO_DEPTH);
surfaceY.fill(-32768);

function haloIndex(x, z) {
  return (x - HALO_MIN_X) * HALO_DEPTH + z - HALO_MIN_Z;
}

function heightmapY(chunk, localX, localZ) {
  const map = chunk.Heightmaps?.MOTION_BLOCKING_NO_LEAVES
    ?? chunk.Heightmaps?.WORLD_SURFACE
    ?? chunk.Heightmaps?.WORLD_SURFACE_WG;
  assert(map, 'mountain chunk lacks a usable surface heightmap');
  return WORLD_MIN_Y + packedValue(map, 9, localZ * 16 + localX) - 1;
}

for (let cz = Math.floor(HALO_MIN_Z / 16); cz <= Math.floor(HALO_MAX_Z / 16); cz++) {
  for (let cx = Math.floor(HALO_MIN_X / 16); cx <= Math.floor(HALO_MAX_X / 16); cx++) {
    const chunk = await readChunk(cx, cz);
    for (let localX = 0; localX < 16; localX++) {
      const x = cx * 16 + localX;
      if (x < HALO_MIN_X || x > HALO_MAX_X) continue;
      for (let localZ = 0; localZ < 16; localZ++) {
        const z = cz * 16 + localZ;
        if (z < HALO_MIN_Z || z > HALO_MAX_Z) continue;
        surfaceY[haloIndex(x, z)] = heightmapY(chunk, localX, localZ);
      }
    }
  }
}
assert(!surfaceY.includes(-32768), 'surface heightmap halo is incomplete');

const PACK_BASE = 4096;
function familyData() {
  return {
    records: [],
    canonicalStates: [],
    stateCodeByCanonical: new Map(),
    materialCounts: {},
  };
}
const familyRecords = {
  water: familyData(),
  lava: familyData(),
  frozen: familyData(),
  snow: familyData(),
};

function addFamilyRecord(family, id, state) {
  const data = familyRecords[family];
  const canonical = canonicalState(state);
  let stateCode = data.stateCodeByCanonical.get(canonical);
  if (stateCode === undefined) {
    stateCode = data.canonicalStates.length;
    assert(stateCode < PACK_BASE, `too many canonical states in ${family}`);
    data.canonicalStates.push(canonical);
    data.stateCodeByCanonical.set(canonical, stateCode);
  }
  data.records.push(id * PACK_BASE + stateCode);
  data.materialCounts[state.Name] = (data.materialCounts[state.Name] ?? 0) + 1;
}

function packedId(packed) {
  return Math.floor(packed / PACK_BASE);
}

function packedStateCode(packed) {
  return packed % PACK_BASE;
}

for (let cz = Math.floor(mountain.minZ / 16); cz <= Math.floor(mountain.maxZ / 16); cz++) {
  for (let cx = Math.floor(mountain.minX / 16); cx <= Math.floor(mountain.maxX / 16); cx++) {
    const chunk = await readChunk(cx, cz);
    for (const section of chunk.sections ?? []) {
      const sectionY = Number(section.Y);
      const sectionMinY = sectionY * 16;
      const sectionMaxY = sectionMinY + 15;
      if (sectionMaxY < hydrologySurvey.minY || sectionMinY > hydrologySurvey.maxY) continue;
      const states = section.block_states;
      if (!states?.palette?.length) continue;
      if (!states.palette.some((state) => familyForState(state))) continue;
      const minY = Math.max(sectionMinY, hydrologySurvey.minY);
      const maxY = Math.min(sectionMaxY, hydrologySurvey.maxY);
      for (let localX = 0; localX < 16; localX++) {
        const x = cx * 16 + localX;
        if (x < mountain.minX || x > mountain.maxX) continue;
        for (let y = minY; y <= maxY; y++) {
          for (let localZ = 0; localZ < 16; localZ++) {
            const z = cz * 16 + localZ;
            if (z < mountain.minZ || z > mountain.maxZ) continue;
            const index = ((y & 15) << 8) | (localZ << 4) | localX;
            const state = states.palette[paletteIndex(states, index, 4)]
              ?? { Name: 'minecraft:air' };
            const family = familyForState(state);
            if (!family) continue;
            addFamilyRecord(family, encode(x, y, z), state);
          }
        }
      }
    }
  }
  if ((cz - Math.floor(mountain.minZ / 16)) % 8 === 0) {
    process.stderr.write(`D05 hydrology scan through chunk z=${cz}\n`);
  }
}

for (const data of Object.values(familyRecords)) {
  data.records.sort((left, right) => left - right);
}
process.stderr.write(`D05 family counts ${JSON.stringify(Object.fromEntries(
  Object.entries(familyRecords).map(([family, data]) => [family, data.records.length]),
))}\n`);
chunkCache.clear();
regionCache.clear();
if (global.gc) global.gc();

function coordinateSetHashIds(ids) {
  const digest = crypto.createHash('sha256');
  digest.update('combined-zones-coordinate-cell-set-v1\n');
  for (const id of ids) {
    const cell = decode(id);
    digest.update(`${cell.x},${cell.y},${cell.z}\n`);
  }
  return digest.digest('hex');
}

function coordinateSetHashData(data) {
  const digest = crypto.createHash('sha256');
  digest.update('combined-zones-coordinate-cell-set-v1\n');
  for (const packed of data.records) {
    const cell = decode(packedId(packed));
    digest.update(`${cell.x},${cell.y},${cell.z}\n`);
  }
  return digest.digest('hex');
}

function stateSetHashData(data) {
  const digest = crypto.createHash('sha256');
  digest.update('combined-zones-block-state-cell-set-v1\n');
  for (const packed of data.records) {
    const cell = decode(packedId(packed));
    const state = data.canonicalStates[packedStateCode(packed)];
    digest.update(`${cell.x},${cell.y},${cell.z}\t${state}\n`);
  }
  return digest.digest('hex');
}

function stateSetHashForIds(ids, data) {
  const digest = crypto.createHash('sha256');
  digest.update('combined-zones-block-state-cell-set-v1\n');
  let recordIndex = 0;
  for (const id of ids) {
    while (packedId(data.records[recordIndex] ?? Number.POSITIVE_INFINITY) < id) recordIndex++;
    const packed = data.records[recordIndex];
    assert(packedId(packed) === id, `missing state record for encoded cell ${id}`);
    const cell = decode(id);
    digest.update(`${cell.x},${cell.y},${cell.z}\t${data.canonicalStates[packedStateCode(packed)]}\n`);
  }
  return digest.digest('hex');
}

const familySummary = Object.fromEntries(Object.entries(familyRecords).map(([family, data]) => {
  return [family, {
    cellCount: data.records.length,
    materialCounts: sortedCounts(data.materialCounts),
    coordinateSetSha256: coordinateSetHashData(data),
    blockStateSetSha256: stateSetHashData(data),
  }];
}));
process.stderr.write('D05 family hashes complete\n');
familyRecords.frozen.records.length = 0;
familyRecords.snow.records.length = 0;
if (global.gc) global.gc();

function boundaryFacesForCell(cell) {
  const result = [];
  if (cell.x === hydrologySurvey.minX) result.push('west');
  if (cell.x === hydrologySurvey.maxX) result.push('east');
  if (cell.y === hydrologySurvey.minY) result.push('bottom');
  if (cell.y === hydrologySurvey.maxY) result.push('top');
  if (cell.z === hydrologySurvey.minZ) result.push('north');
  if (cell.z === hydrologySurvey.maxZ) result.push('south');
  return result;
}

function neighborIds(id) {
  const cell = decode(id);
  const result = [];
  if (cell.x > hydrologySurvey.minX) result.push(id - X_STRIDE);
  if (cell.x < hydrologySurvey.maxX) result.push(id + X_STRIDE);
  if (cell.y > hydrologySurvey.minY) result.push(id - Y_STRIDE);
  if (cell.y < hydrologySurvey.maxY) result.push(id + Y_STRIDE);
  if (cell.z > hydrologySurvey.minZ) result.push(id - 1);
  if (cell.z < hydrologySurvey.maxZ) result.push(id + 1);
  return result;
}

function buildComponents(data, family) {
  const unvisited = new Set();
  for (const packed of data.records) unvisited.add(packedId(packed));
  const components = [];
  for (const packed of data.records) {
    const seed = packedId(packed);
    if (!unvisited.delete(seed)) continue;
    const stack = [seed];
    const ids = [];
    while (stack.length) {
      const id = stack.pop();
      ids.push(id);
      for (const neighbor of neighborIds(id)) {
        if (unvisited.delete(neighbor)) stack.push(neighbor);
      }
    }
    ids.sort((left, right) => left - right);
    const faces = {};
    let surfaceExposedCellCount = 0;
    const relicIntersections = {};
    const bounds = {
      minX: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
      minZ: Number.POSITIVE_INFINITY,
      maxZ: Number.NEGATIVE_INFINITY,
    };
    for (const id of ids) {
      const cell = decode(id);
      for (const face of boundaryFacesForCell(cell)) {
        if (!faces[face]) faces[face] = [];
        faces[face].push(id);
      }
      if (cell.y === surfaceY[haloIndex(cell.x, cell.z)]) surfaceExposedCellCount++;
      for (const [relicKey, shellIds] of candidateShellIdsByRelic.entries()) {
        if (shellIds.has(id)) relicIntersections[relicKey] = (relicIntersections[relicKey] ?? 0) + 1;
      }
      bounds.minX = Math.min(bounds.minX, cell.x);
      bounds.maxX = Math.max(bounds.maxX, cell.x);
      bounds.minY = Math.min(bounds.minY, cell.y);
      bounds.maxY = Math.max(bounds.maxY, cell.y);
      bounds.minZ = Math.min(bounds.minZ, cell.z);
      bounds.maxZ = Math.max(bounds.maxZ, cell.z);
    }
    components.push({
      id: `${family}-${String(components.length + 1).padStart(5, '0')}`,
      family,
      cellCount: ids.length,
      coordinateSetSha256: coordinateSetHashIds(ids),
      bounds,
      boundaryFaces: Object.fromEntries(Object.entries(faces).sort(([left], [right]) => (
        left.localeCompare(right)
      )).map(([face, faceCells]) => [face, {
        cellCount: faceCells.length,
        coordinateSetSha256: coordinateSetHashIds(faceCells.sort((left, right) => left - right)),
      }])),
      surfaceExposedCellCount,
      relicAdjacencyCandidateIntersections: sortedCounts(relicIntersections),
      ids,
    });
  }
  components.sort((left, right) => {
    const leftMin = left.ids[0];
    const rightMin = right.ids[0];
    return leftMin - rightMin;
  });
  components.forEach((component, index) => {
    component.id = `${family}-${String(index + 1).padStart(5, '0')}`;
  });
  return components;
}

process.stderr.write('D05 building water components\n');
const waterComponents = buildComponents(familyRecords.water, 'water');
process.stderr.write(`D05 water components ${waterComponents.length}\n`);
const lavaComponents = buildComponents(familyRecords.lava, 'lava');
process.stderr.write(`D05 lava components ${lavaComponents.length}\n`);
if (global.gc) global.gc();

function componentPublic(component) {
  const { ids, ...rest } = component;
  return rest;
}

function componentManifestHash(components) {
  const manifest = components.map((component) => componentPublic(component));
  return sha256(`${JSON.stringify(manifest)}\n`);
}

const waterPublic = waterComponents.map(componentPublic);
const lavaPublic = lavaComponents.map(componentPublic);
const waterComponentManifestSha256 = componentManifestHash(waterComponents);
const lavaComponentManifestSha256 = componentManifestHash(lavaComponents);
process.stderr.write('D05 component manifests complete\n');

function categoryRecordFromIds(id, description, ids, data) {
  ids.sort((left, right) => left - right);
  return {
    id,
    status: 'UNASSIGNED_DEFAULT_DENY_COORDINATION_SET',
    description,
    futureCanonicalOwner: null,
    cellCount: ids.length,
    coordinateSetSha256: coordinateSetHashIds(ids),
    blockStateSetSha256: stateSetHashForIds(ids, data),
    constructionOwnership: false,
  };
}

function categoryRecordFromData(id, description, data) {
  return {
    id,
    status: 'UNASSIGNED_DEFAULT_DENY_COORDINATION_SET',
    description,
    futureCanonicalOwner: null,
    cellCount: data.records.length,
    coordinateSetSha256: coordinateSetHashData(data),
    blockStateSetSha256: stateSetHashData(data),
    constructionOwnership: false,
  };
}

function categoryRecordFromSummary(id, description, summary) {
  return {
    id,
    status: 'UNASSIGNED_DEFAULT_DENY_COORDINATION_SET',
    description,
    futureCanonicalOwner: null,
    cellCount: summary.cellCount,
    coordinateSetSha256: summary.coordinateSetSha256,
    blockStateSetSha256: summary.blockStateSetSha256,
    constructionOwnership: false,
  };
}

function categorizeFluid(data, components, family) {
  const grouped = new Map();
  for (const component of components) {
    const category = Object.keys(component.boundaryFaces).length > 0
      ? `${family}-boundary-interface`
      : component.surfaceExposedCellCount > 0
        ? `${family}-contained-surface`
        : `${family}-contained-subsurface`;
    if (!grouped.has(category)) grouped.set(category, []);
    for (const id of component.ids) grouped.get(category).push(id);
  }
  const descriptions = {
    [`${family}-boundary-interface`]: `${family} cells in components touching at least one coordination-volume face; future work needs exact cross-boundary interface ownership`,
    [`${family}-contained-surface`]: `${family} cells in components contained by the coordination volume and exposed at the copied-snapshot surface`,
    [`${family}-contained-subsurface`]: `${family} cells in components contained by the coordination volume with no copied-snapshot surface exposure`,
  };
  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, ids]) => categoryRecordFromIds(id, descriptions[id], ids, data));
}

const waterDrainageCoordinationSets = categorizeFluid(
  familyRecords.water,
  waterComponents,
  'water',
);
process.stderr.write('D05 water coordination sets complete\n');
for (const component of waterComponents) delete component.ids;
if (global.gc) global.gc();
const lavaDrainageCoordinationSets = categorizeFluid(
  familyRecords.lava,
  lavaComponents,
  'lava',
);
process.stderr.write('D05 lava coordination sets complete\n');
for (const component of lavaComponents) delete component.ids;
if (global.gc) global.gc();
const drainageCoordinationSets = [
  ...waterDrainageCoordinationSets,
  ...lavaDrainageCoordinationSets,
  categoryRecordFromSummary(
    'frozen-water-storage',
    'ice-family cells that can represent stored water or snowmelt context but are not modeled as flowing water',
    familySummary.frozen,
  ),
  categoryRecordFromSummary(
    'snow-storage',
    'snow-family cells that require a future snowmelt policy; no melt rate or destination is inferred',
    familySummary.snow,
  ),
];
process.stderr.write('D05 coordination partition complete\n');
if (global.gc) global.gc();

function boundaryInterfaceSets(data, family) {
  const byFace = new Map();
  for (const packed of data.records) {
    const cell = decode(packedId(packed));
    for (const face of boundaryFacesForCell(cell)) {
      if (!byFace.has(face)) byFace.set(face, []);
      byFace.get(face).push(packed);
    }
  }
  return [...byFace.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([face, packedRecords]) => {
      const ids = packedRecords.map((packed) => packedId(packed));
      return {
      id: `${family}-${face}-coordination-face`,
      family,
      face,
      status: 'DEFAULT_DENY_INTERFACE_CANDIDATE',
      cellCount: packedRecords.length,
      coordinateSetSha256: coordinateSetHashIds(ids),
      blockStateSetSha256: stateSetHashForIds(ids, data),
      interfaceOwner: null,
      };
    });
}

const drainageDirections = [
  { name: 'north', dx: 0, dz: -1 },
  { name: 'north-east', dx: 1, dz: -1 },
  { name: 'east', dx: 1, dz: 0 },
  { name: 'south-east', dx: 1, dz: 1 },
  { name: 'south', dx: 0, dz: 1 },
  { name: 'south-west', dx: -1, dz: 1 },
  { name: 'west', dx: -1, dz: 0 },
  { name: 'north-west', dx: -1, dz: -1 },
];

const nextByColumn = new Int32Array(WIDTH * DEPTH);
nextByColumn.fill(-2);
const routingDigest = crypto.createHash('sha256');
routingDigest.update('combined-zones-d8-topographic-routing-v1\n');

function primaryColumnIndex(x, z) {
  return (x - mountain.minX) * DEPTH + z - mountain.minZ;
}

function primaryColumn(index) {
  const localX = Math.floor(index / DEPTH);
  const localZ = index - localX * DEPTH;
  return { x: mountain.minX + localX, z: mountain.minZ + localZ };
}

const directExitByIndex = new Map();
for (let x = mountain.minX; x <= mountain.maxX; x++) {
  for (let z = mountain.minZ; z <= mountain.maxZ; z++) {
    const index = primaryColumnIndex(x, z);
    const ownY = surfaceY[haloIndex(x, z)];
    let best = null;
    for (const direction of drainageDirections) {
      const candidate = { x: x + direction.dx, z: z + direction.dz, direction: direction.name };
      const candidateY = surfaceY[haloIndex(candidate.x, candidate.z)];
      if (candidateY >= ownY) continue;
      if (!best || candidateY < best.y) best = { ...candidate, y: candidateY };
    }
    if (!best) {
      nextByColumn[index] = -1;
      routingDigest.update(`${x},${z}\tSINK\n`);
      continue;
    }
    const outside = best.x < mountain.minX || best.x > mountain.maxX
      || best.z < mountain.minZ || best.z > mountain.maxZ;
    if (outside) {
      nextByColumn[index] = -3;
      directExitByIndex.set(index, best);
      routingDigest.update(`${x},${z}\tEXIT:${best.x},${best.z}\n`);
    } else {
      const next = primaryColumnIndex(best.x, best.z);
      nextByColumn[index] = next;
      routingDigest.update(`${x},${z}\t${best.x},${best.z}\n`);
    }
  }
}

const primaryColumnCount = WIDTH * DEPTH;
const terminalKeyByColumn = new Int32Array(primaryColumnCount);
terminalKeyByColumn.fill(-1);
function terminalFor(start) {
  if (terminalKeyByColumn[start] >= 0) return terminalKeyByColumn[start];
  const pathToResolve = [];
  let current = start;
  while (terminalKeyByColumn[current] < 0) {
    pathToResolve.push(current);
    const next = nextByColumn[current];
    if (next === -1) {
      terminalKeyByColumn[current] = current;
    } else if (next === -3) {
      const target = directExitByIndex.get(current);
      terminalKeyByColumn[current] = primaryColumnCount + haloIndex(target.x, target.z);
    } else {
      current = next;
    }
  }
  const terminal = terminalKeyByColumn[current];
  for (const index of pathToResolve) terminalKeyByColumn[index] = terminal;
  return terminal;
}

const terminalCounts = new Uint32Array(primaryColumnCount + HALO_WIDTH * HALO_DEPTH);
const boundaryRouteDigest = crypto.createHash('sha256');
const sinkRouteDigest = crypto.createHash('sha256');
boundaryRouteDigest.update('combined-zones-column-set-v1\n');
sinkRouteDigest.update('combined-zones-column-set-v1\n');
let boundaryRoutedColumnCount = 0;
let internalSinkRoutedColumnCount = 0;
for (let index = 0; index < primaryColumnCount; index++) {
  const terminal = terminalFor(index);
  terminalCounts[terminal]++;
  const column = primaryColumn(index);
  if (terminal >= primaryColumnCount) {
    boundaryRoutedColumnCount++;
    boundaryRouteDigest.update(`${column.x},${column.z}\n`);
  } else {
    internalSinkRoutedColumnCount++;
    sinkRouteDigest.update(`${column.x},${column.z}\n`);
  }
}

const sinkColumns = [];
for (let index = 0; index < primaryColumnCount; index++) {
  if (terminalCounts[index] > 0) sinkColumns.push(primaryColumn(index));
}
const directOutletColumns = [...directExitByIndex.keys()].map((index) => primaryColumn(index));
const outletReceiverByCoordinate = new Map();
for (const { x, z } of directExitByIndex.values()) {
  outletReceiverByCoordinate.set(`${x},${z}`, { x, z });
}
const outletReceiverColumns = [...outletReceiverByCoordinate.values()];
const terminalManifestDigest = crypto.createHash('sha256');
terminalManifestDigest.update('combined-zones-d8-terminal-assignment-manifest-v1\n');
let terminalCount = 0;
const largestCatchments = [];
for (let key = 0; key < terminalCounts.length; key++) {
  const columnCount = terminalCounts[key];
  if (columnCount === 0) continue;
  terminalCount++;
  let terminal;
  if (key < primaryColumnCount) {
    const column = primaryColumn(key);
    terminal = `SINK:${column.x},${column.z}`;
  } else {
    const index = key - primaryColumnCount;
    const localX = Math.floor(index / HALO_DEPTH);
    const localZ = index - localX * HALO_DEPTH;
    terminal = `EXIT:${HALO_MIN_X + localX},${HALO_MIN_Z + localZ}`;
  }
  terminalManifestDigest.update(`${terminal}\t${columnCount}\n`);
  largestCatchments.push({ terminal, columnCount });
  largestCatchments.sort((left, right) => right.columnCount - left.columnCount
    || left.terminal.localeCompare(right.terminal));
  if (largestCatchments.length > 20) largestCatchments.length = 20;
}
const terminalAssignmentManifestSha256 = terminalManifestDigest.digest('hex');
process.stderr.write('D05 topographic routing complete\n');

const fluidBoundaryInterfaceCandidates = [
  ...boundaryInterfaceSets(familyRecords.water, 'water'),
  ...boundaryInterfaceSets(familyRecords.lava, 'lava'),
];
process.stderr.write('D05 boundary interfaces complete\n');

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-d05-hydrology-relic-buffer-design',
  status: 'PARTIAL_PASS_EXACT_BASELINE_AND_BUFFER_CANDIDATES_D05_HOLD',
  worldEditAuthorized: false,
  constructionOwnershipAuthorized: false,
  operationCellCount: 0,
  materialCellCount: 0,
  sourceBindings: {
    phase0SurveyEvidence: fileBinding(PHASE0_EVIDENCE),
    coordinateRegistry: fileBinding(COORDINATES),
    phase1GeometryCoordination: fileBinding(GEOMETRY),
    phase1DesignDecisions: fileBinding(DECISIONS),
    protectedRelicClearance: fileBinding(RELIC_CLEARANCE),
    immutablePhase0PostRegionSnapshot: snapshot,
  },
  scope: {
    mountainCoordinationVolume: {
      sourceSemantics: mountainRecord.sourceSemantics,
      representation: 'inclusive integer cells converted from the compiled half-open coordination envelope',
      bounds: mountain,
      dimensions: mountainRecord.exactCoordinationCellSet.dimensions,
      cellCount: volume(mountain),
      constructionOwnership: false,
    },
    fullHeightHydrologySurveyPrism: {
      representation: 'full overworld build-height prism over the compiled mountain X/Z footprint',
      bounds: hydrologySurvey,
      dimensions: { x: WIDTH, y: HEIGHT, z: DEPTH },
      cellCount: volume(hydrologySurvey),
      purpose: 'current 3D fluid, frozen-water, snow-storage, and boundary-interface census',
      constructionOwnership: false,
    },
    surfaceRoutingHalo: {
      bounds: { minX: HALO_MIN_X, maxX: HALO_MAX_X, minZ: HALO_MIN_Z, maxZ: HALO_MAX_Z },
      purpose: 'one-column read-only height comparison around the coordination boundary',
      constructionOwnership: false,
    },
    caveat: 'The full-height survey prism is current copied-snapshot evidence over the exact mountain X/Z footprint. It is not a future excavation/fill influence volume, construction ownership, or a mountain solid function.',
  },
  protectedRelicBufferCandidates: relicCandidates,
  immutableThreeDimensionalCensus: {
    status: 'PASS_EXACT_CURRENT_FULL_HEIGHT_SURVEY_PRISM_BASELINE',
    families: familySummary,
    waterComponents: {
      componentCount: waterPublic.length,
      manifestSha256: waterComponentManifestSha256,
      components: waterPublic,
    },
    lavaComponents: {
      componentCount: lavaPublic.length,
      manifestSha256: lavaComponentManifestSha256,
      components: lavaPublic,
    },
    boundaryInterfaceCandidates: fluidBoundaryInterfaceCandidates,
    boundary: 'Counts cover current block states through the complete overworld build height over the exact mountain X/Z footprint. Waterlogged blocks count as water. Ice and snow are separate stored-water/snowmelt context, not simulated fluid.',
  },
  drainageCoordinationModel: {
    status: 'PARTIAL_PASS_EXACT_COORDINATION_PARTITION_OWNERS_UNASSIGNED',
    exactDefaultDenySets: drainageCoordinationSets,
    futureOwnershipRule: 'Every fluid, cryosphere, drainage, discharge, retaining, sump, and cross-boundary interaction cell needs exactly one future canonical owner and exact interface contracts before construction compilation.',
    currentlyAssignedOwnerCount: 0,
    constructionOwnershipFrozen: false,
    topographicRoutingCandidate: {
      status: 'EXACT_SNAPSHOT_D8_CANDIDATE_NOT_A_FLOW_SIMULATION',
      method: 'For each copied-snapshot mountain column, choose the lowest strictly lower MOTION_BLOCKING_NO_LEAVES neighbor from a fixed north-clockwise D8 order; equal or higher neighbors terminate at an internal sink.',
      columnCount: WIDTH * DEPTH,
      routingRelationSha256: routingDigest.digest('hex'),
      routesToBoundary: {
        columnCount: boundaryRoutedColumnCount,
        columnSetSha256: boundaryRouteDigest.digest('hex'),
      },
      routesToInternalSink: {
        columnCount: internalSinkRoutedColumnCount,
        columnSetSha256: sinkRouteDigest.digest('hex'),
      },
      internalSinkColumns: {
        columnCount: sinkColumns.length,
        columnSetSha256: columnSetHash(sinkColumns),
      },
      directBoundaryOutletColumns: {
        columnCount: directOutletColumns.length,
        columnSetSha256: columnSetHash(directOutletColumns),
      },
      outsideReceiverColumns: {
        columnCount: outletReceiverColumns.length,
        columnSetSha256: columnSetHash(outletReceiverColumns),
      },
      terminalCount,
      terminalAssignmentManifestSha256,
      largestCatchments,
      limitations: [
        'This deterministic D8 partition is a coordination candidate, not Minecraft fluid propagation, rainfall, infiltration, groundwater, snowmelt, erosion, or post-construction grading behavior.',
        'Flat areas terminate locally; no depression filling or engineered discharge is inferred.',
        'No outlet, sink, sump, ditch, culvert, lake, or fill treatment is approved.',
      ],
    },
  },
  d05Disposition: {
    decisionId: 'D05',
    status: 'HOLD',
    passedSubgates: [
      'immutable Phase 0 post snapshot identity matches its sealed declaration',
      'the full overworld build-height prism over the exact compiled continuous-mountain X/Z footprint has complete current 3D water, waterlogged, lava, ice, and snow cell-set hashes',
      'current water and lava six-connected components, boundary contacts, and copied-surface exposure are exact and hash-bound',
      'each relic has a reproducible one-cell adjacency-buffer candidate with exact coordinates and current block states',
      'the current copied-surface D8 routing relation and boundary-versus-sink partition are deterministic and hash-bound',
    ],
    designClosureHoldSubgates: [
      'the one-cell relic shells are candidates, not reviewed structural, hydrological, access, entrance-safety, or exhibit buffers',
      'the east igloo has no present cells in its recorded start bound and no present relic fabric is inferred',
      'no deterministic future mountain solid, grading, excavation, fill, retaining, or drainage geometry exists',
      'no exact construction or physics-influence cell set exists for before/after water-source, sink, diversion, and protected-buffer intersection proofs',
      'no canonical hydrology owner or cross-boundary interface contract is assigned',
      'no expert-approved snowmelt, groundwater, infiltration, discharge, sump, erosion, or geotechnical model exists',
    ],
    passRule: 'D05 may pass G02 only after reviewed exact relic buffers, an accepted deterministic future terrain/construction influence model, accepted one-owner hydrology and interface contracts, frozen preservation/accounting/no-unintended-diversion acceptance criteria, and expert civil/geotechnical review bind the same immutable design identity.',
    releaseLifecycleValidation: {
      gateRange: 'G03-G19',
      resolvesD05: false,
      requirements: [
        'exact owned construction and physics-influence cell sets',
        'guarded forward and rollback packages bound to one immutable source',
        'before-and-after accounting, immutable post-state preservation, diversion QA, and rollback verification',
      ],
    },
  },
  prohibitions: [
    'No present east-igloo preservation is inferred.',
    'No planning or coordination box is treated as construction ownership.',
    'No drainage direction, outlet, sink, or positive relic buffer candidate authorizes construction.',
    'No live system was contacted and no block operation was emitted.',
  ],
};

const markdown = `# D05 mountain hydrology and protected-relic buffer design audit

Status: **PARTIAL PASS — EXACT BASELINE AND CANDIDATES — D05 HOLD — OFFLINE ONLY**

This package reads the immutable Phase 0 post-region snapshot and the current coordination evidence. It hashes current three-dimensional fluid and cryosphere cells through the full overworld build height over the compiled mountain X/Z footprint, partitions water and lava into exact connected components and default-deny coordination classes, derives a deterministic copied-surface routing candidate, and proposes the minimum one-cell adjacency shell around each protected relic core. It emits zero operations and assigns no construction owner.

## Current 3D baseline

| Family | Cells | Exact coordinate SHA-256 |
|---|---:|---|
${Object.entries(familySummary).map(([family, summary]) => `| ${family} | ${summary.cellCount.toLocaleString('en-US')} | \`${summary.coordinateSetSha256}\` |`).join('\n')}

- Mountain coordination volume: \`${mountain.minX}…${mountain.maxX}, ${mountain.minY}…${mountain.maxY}, ${mountain.minZ}…${mountain.maxZ}\` (${volume(mountain).toLocaleString('en-US')} cells).
- Full-height hydrology survey prism: \`${hydrologySurvey.minX}…${hydrologySurvey.maxX}, ${hydrologySurvey.minY}…${hydrologySurvey.maxY}, ${hydrologySurvey.minZ}…${hydrologySurvey.maxZ}\` (${volume(hydrologySurvey).toLocaleString('en-US')} cells).
- Water components: ${waterPublic.length.toLocaleString('en-US')}.
- Lava components: ${lavaPublic.length.toLocaleString('en-US')}.
- The census includes waterlogged blocks as water. Ice and snow remain separate snowmelt/storage context.

These are current copied-snapshot facts, not a future excavation/fill influence model. Neither the survey prism nor the coordination volume is construction ownership.

## Relic buffer candidates

| Relic record | Core cells | One-cell candidate shell | Mountain-shell intersection | Review state |
|---|---:|---:|---:|---|
${relicCandidates.map((candidate) => `| ${candidate.relicKey} | ${candidate.protectedCore.cellCount} | ${candidate.minimumAdjacencyBufferCandidate.cellCount} | ${candidate.minimumAdjacencyBufferCandidate.mountainCoordinationIntersection.shellCellCount} | HOLD — candidate only |`).join('\n')}

The one-cell Chebyshev shell is the smallest positive separation that prevents future face, edge, or corner adjacency to a protected core. That makes it an exact coordination candidate, not an approved safety buffer. It does not prove structural support, entrance safety, hydrology, exhibit access, or an acceptable construction setback. The east-igloo start remains default-deny even though its recorded 280-cell volume is entirely air; this report does not invent present relic fabric.

## Drainage coordination

The exact D8 copied-surface candidate routes ${boundaryRoutedColumnCount.toLocaleString('en-US')} columns to the coordination boundary and ${internalSinkRoutedColumnCount.toLocaleString('en-US')} columns to ${sinkColumns.length.toLocaleString('en-US')} strict local sinks. Its routing relation is \`${report.drainageCoordinationModel.topographicRoutingCandidate.routingRelationSha256}\`.

This is a reproducible topographic partition only. It is not Minecraft fluid simulation and does not model rainfall, infiltration, groundwater, snowmelt, erosion, depression filling, future grading, sumps, culverts, or discharges. Every exact hydrology set remains unassigned and default-deny.

## D05 disposition

The immutable identity, exact current 3D hydrology/cryosphere census, fluid components and boundary contacts, relic adjacency candidates, and topographic routing candidate pass as offline evidence. D05 remains **HOLD** because reviewed relic buffers, an accepted future mountain model, accepted influence criteria, canonical owners/interfaces, expert civil and geotechnical review, and frozen preservation/no-diversion acceptance criteria do not exist. Operations, rollback, and post-state proof are later G03-G19 validation and cannot resolve D05 or G02.

Reproduce with:

\`\`\`bash
node scripts/audit_combined_zones_d05_hydrology_relic_buffers.mjs
\`\`\`
`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);
process.stdout.write(`${relative(OUTPUT)}\n${relative(MARKDOWN)}\n`);
