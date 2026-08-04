#!/usr/bin/env node
/**
 * Compile and audit a bounded, coordinate-only C1 visual/civil pilot candidate.
 *
 * Offline by construction: this script reads local planning files and one
 * immutable copied Anvil region directory. It never connects to Minecraft,
 * RCON, the fleet API, systemd, SSH, or a live database. It emits no block
 * operations and cannot authorize construction.
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

const GENERATED_AT = value('--generated-at', '2026-08-04T15:56:00Z');
const MASTERPLAN = path.resolve(value(
  '--masterplan',
  'masterplans/05-combined-zones/MASTERPLAN.md',
));
const COORDINATES = path.resolve(value(
  '--coordinates',
  'masterplans/05-combined-zones/site-coordinates.json',
));
const TERRAIN_PROBE = path.resolve(value(
  '--terrain-probe',
  'masterplans/05-combined-zones/corridor-terrain-probe.json',
));
const PHASE0_EVIDENCE = path.resolve(value(
  '--phase0-evidence',
  'masterplans/05-combined-zones/phase0-survey-evidence.json',
));
const CLEARANCE = path.resolve(value(
  '--clearance',
  'masterplans/05-combined-zones/corridor-clearance.json',
));
const DECISIONS = path.resolve(value(
  '--decisions',
  'masterplans/05-combined-zones/phase1-design-decisions.json',
));
const OUTPUT = path.resolve(value(
  '--out',
  'masterplans/05-combined-zones/phase1-c1-pilot-coordination.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'masterplans/05-combined-zones/phase1-c1-pilot-coordination.md',
));

const WORLD_MIN_Y = -64;
const WORLD_MAX_Y = 319;
const CANDIDATE_SAMPLE_START = 24;
const CANDIDATE_SAMPLE_END = 28;
const REFERENCE_Z = 80;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function fileBinding(filename, role) {
  const data = fs.readFileSync(filename);
  return {
    path: relative(filename),
    sha256: sha256(data),
    bytes: data.length,
    role,
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
    if (!buffer) return null;
    const index = ((cx & 31) + (cz & 31) * 32) * 4;
    const sectorOffset = buffer.readUIntBE(index, 3);
    const sectorCount = buffer[index + 3];
    if (!sectorOffset || !sectorCount) return null;
    const offset = sectorOffset * 4096;
    const length = buffer.readUInt32BE(offset);
    const compression = buffer.readUInt8(offset + 4);
    assert(!(compression & 0x80), `external chunk storage unsupported at ${cx},${cz}`);
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

function structureStarts(chunk) {
  const result = [];
  for (const [key, start] of Object.entries(chunk?.raw?.structures?.starts ?? {})) {
    const id = start?.id ?? key;
    if (!id || /invalid/i.test(id)) continue;
    const childBounds = (start.Children ?? [])
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
    result.push({ id, bounds, startChunkX: chunk.cx, startChunkZ: chunk.cz });
  }
  return result;
}

function intersectsPlan(bounds, envelope) {
  return Boolean(bounds)
    && bounds.maxX >= envelope.minX
    && bounds.minX <= envelope.maxX
    && bounds.maxZ >= envelope.minZ
    && bounds.minZ <= envelope.maxZ;
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
const SENSITIVE_NATURAL = new Set([
  'minecraft:creaking_heart',
  'minecraft:open_eyeblossom',
  'minecraft:closed_eyeblossom',
]);

function isOrganicSurfaceFeature(name) {
  return SENSITIVE_NATURAL.has(name)
    || /(_leaves|_log|_wood|_stem|_hyphae|_sapling|_mushroom_block)$/.test(name)
    || /^minecraft:(mangrove_roots|muddy_mangrove_roots|bamboo|vine|cocoa|short_grass|tall_grass|fern|large_fern|dead_bush|lily_pad|leaf_litter|seagrass|tall_seagrass|kelp|kelp_plant|sea_pickle|moss_carpet|pale_moss_carpet|pale_hanging_moss|pink_petals|wildflowers|brown_mushroom|red_mushroom)$/.test(name)
    || /(_flower|_tulip|mushroom|dandelion|poppy|allium|azure_bluet|orchid|peony|sunflower|lilac|rose_bush|cornflower|lily_of_the_valley)$/.test(name);
}

function increment(record, key, amount = 1) {
  record[key] = (record[key] ?? 0) + amount;
}

function sortRecord(record) {
  return Object.fromEntries(Object.entries(record).sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
}

function cellSetHash(cells, preamble) {
  const digest = crypto.createHash('sha256');
  digest.update(`${preamble}\n`);
  const ordered = [...cells].sort((left, right) => left.x - right.x
    || (left.y ?? -1000) - (right.y ?? -1000)
    || left.z - right.z);
  for (const cell of ordered) {
    digest.update(cell.y === undefined
      ? `${cell.x},${cell.z}\n`
      : `${cell.x},${cell.y},${cell.z}\n`);
  }
  return digest.digest('hex');
}

function stateSetHash(cells, preamble) {
  const digest = crypto.createHash('sha256');
  digest.update(`${preamble}\n`);
  const ordered = [...cells].sort((left, right) => left.x - right.x
    || left.y - right.y
    || left.z - right.z);
  for (const cell of ordered) {
    digest.update(`${cell.x},${cell.y},${cell.z}\t${cell.state}\n`);
  }
  return digest.digest('hex');
}

function inclusiveColumns(bounds) {
  const cells = [];
  for (let x = bounds.minX; x <= bounds.maxX; x++) {
    for (let z = bounds.minZ; z <= bounds.maxZ; z++) cells.push({ x, z });
  }
  return cells;
}

function nearestIntegerTiesPositive(numerator, denominator) {
  assert(numerator >= 0 && denominator > 0, 'pilot profile expects positive Y rationals');
  return Math.floor((2 * numerator + denominator) / (2 * denominator));
}

const masterplan = fs.readFileSync(MASTERPLAN, 'utf8');
const coordinates = readJson(COORDINATES);
const probe = readJson(TERRAIN_PROBE);
const phase0 = readJson(PHASE0_EVIDENCE);
const clearance = readJson(CLEARANCE);
const decisions = readJson(DECISIONS);

assert(masterplan.includes('### C1 East Corridor'), 'Masterplan 05 has no C1 East Corridor section');
const c1 = coordinates.connections.find((connection) => connection.id === 'C1');
assert(c1, 'site-coordinates.json has no C1 record');
assert(c1.crossSection.reservationBlocks === 56, 'C1 reservation must remain 56 blocks');
assert(c1.crossSection.totalLandTakeBlocks === 80, 'C1 total land take must remain 80 blocks');
assert(c1.crossSection.railFlank === 'north', 'C1 rail flank must remain north');
const d04 = decisions.decisions.find((decision) => decision.id === 'D04');
assert(d04?.status === 'RESOLVED', 'D04 rail staging is not resolved');
assert(
  d04.selection === 'RESERVE_FIRST_FULLY_CLEAR_SPANNED_RAIL_STRIP',
  'D04 does not select reserve-first clear-spanned staging',
);

const sourceSamples = probe.samples.filter((sample) => (
  sample.index >= CANDIDATE_SAMPLE_START && sample.index <= CANDIDATE_SAMPLE_END
));
const sourceProfile = probe.engineeredRailProfile.profile.filter((sample) => (
  sample.sampleIndex >= CANDIDATE_SAMPLE_START
  && sample.sampleIndex <= CANDIDATE_SAMPLE_END
));
assert(sourceSamples.length === 5 && sourceProfile.length === 5, 'candidate must bind five samples');
assert(sourceSamples.every((sample) => sample.z === REFERENCE_Z), 'candidate is not a tangent');
assert(sourceSamples.every((sample) => !sample.waterColumn && !sample.lavaColumn), 'candidate sample is wet');
assert(sourceProfile.every((sample) => sample.cutFill === 0), 'candidate source sample has earthwork');

const anchors = sourceProfile.map((sample) => ({
  x: sample.x,
  z: sample.z,
  y: sample.proposedRailY,
  sampleIndex: sample.sampleIndex,
  chainage: sample.distanceAlongCenterline,
}));
const minX = anchors[0].x;
const maxX = anchors.at(-1).x;

function profileY(x) {
  const rightIndex = anchors.findIndex((anchor) => anchor.x >= x);
  if (rightIndex <= 0) return anchors[0].y;
  const left = anchors[rightIndex - 1];
  const right = anchors[rightIndex];
  const denominator = right.x - left.x;
  const numerator = left.y * denominator + (right.y - left.y) * (x - left.x);
  return nearestIntegerTiesPositive(numerator, denominator);
}

const referenceCenterline = [];
const railCenterlines = [];
for (let x = minX; x <= maxX; x++) {
  const y = profileY(x);
  referenceCenterline.push({ x, y, z: REFERENCE_Z });
  for (const offset of [-28, -24]) railCenterlines.push({ x, y, z: REFERENCE_Z + offset });
}

const verticalChangeLocations = [];
for (let index = 1; index < referenceCenterline.length; index++) {
  const previous = referenceCenterline[index - 1];
  const current = referenceCenterline[index];
  if (current.y !== previous.y) {
    verticalChangeLocations.push({
      x: current.x,
      fromY: previous.y,
      toY: current.y,
      deltaY: current.y - previous.y,
    });
  }
}
const verticalChangeRuns = verticalChangeLocations.slice(1).map((change, index) => (
  change.x - verticalChangeLocations[index].x
));

const planBounds = {
  referenceCenterline: { minX, maxX, minZ: REFERENCE_Z, maxZ: REFERENCE_Z },
  reservation: {
    minX,
    maxX,
    minZ: REFERENCE_Z + c1.crossSection.northEdgeOffset,
    maxZ: REFERENCE_Z + c1.crossSection.southEdgeOffset,
  },
  reservedRailStrip: { minX, maxX, minZ: REFERENCE_Z - 30, maxZ: REFERENCE_Z - 18 },
  totalLandTake: {
    minX,
    maxX,
    minZ: REFERENCE_Z + c1.crossSection.northEdgeOffset
      - c1.crossSection.slopeEasementEachSide,
    maxZ: REFERENCE_Z + c1.crossSection.southEdgeOffset
      + c1.crossSection.slopeEasementEachSide,
  },
};
const planSets = Object.fromEntries(Object.entries(planBounds).map(([id, bounds]) => {
  const cells = inclusiveColumns(bounds);
  return [id, {
    bounds,
    columnCount: cells.length,
    columnSetSha256: cellSetHash(cells, 'combined-zones-c1-pilot-plan-columns-v1'),
  }];
}));

assert(planSets.reservation.columnCount === 65 * 56, 'unexpected reservation column count');
assert(planSets.reservedRailStrip.columnCount === 65 * 13, 'unexpected rail-strip column count');
assert(planSets.totalLandTake.columnCount === 65 * 80, 'unexpected total-land-take column count');

const snapshotDirectory = path.resolve(phase0.snapshots.postGeneration.path);
const snapshot = snapshotIdentity(snapshotDirectory);
assert(snapshot.sha256 === phase0.snapshots.postGeneration.sha256, 'snapshot SHA-256 drift');
assert(
  snapshot.regionFileCount === phase0.snapshots.postGeneration.regionFileCount,
  'snapshot region-file count drift',
);
assert(snapshot.bytes === phase0.snapshots.postGeneration.bytes, 'snapshot byte count drift');

const reader = new SnapshotReader(snapshotDirectory);
const touchedChunks = [];
const localStructureStarts = [];
const minCx = Math.floor(planBounds.totalLandTake.minX / 16);
const maxCx = Math.floor(planBounds.totalLandTake.maxX / 16);
const minCz = Math.floor(planBounds.totalLandTake.minZ / 16);
const maxCz = Math.floor(planBounds.totalLandTake.maxZ / 16);
for (let cz = minCz; cz <= maxCz; cz++) {
  for (let cx = minCx; cx <= maxCx; cx++) {
    const chunk = await reader.readChunk(cx, cz);
    assert(chunk, `missing candidate chunk ${cx},${cz}`);
    touchedChunks.push({ cx, cz, status: chunk.raw.Status ?? null });
    localStructureStarts.push(...structureStarts(chunk));
  }
}

const localStructureIntersections = localStructureStarts.filter((start) => (
  intersectsPlan(start.bounds, planBounds.totalLandTake)
));
const phase0StructureIntersections = phase0.generatedStructureStarts.filter((start) => (
  intersectsPlan(start.bounds, planBounds.totalLandTake)
));

const fluidCells = [];
const sensitiveCells = [];
const terrainStateCells = [];
const terrainBlocks = {};
const biomes = {};
const sensitiveBlocks = {};
const organicBlocksInGroundToDatumSpan = {};
let terrainMinY = null;
let terrainMaxY = null;
let surfaceWaterColumns = 0;
let surfaceLavaColumns = 0;
let waterCells = 0;
let lavaCells = 0;
let groundToDatumWaterCells = 0;
let groundToDatumLavaCells = 0;
let groundToDatumOrganicCells = 0;
let maximumCrossSectionCut = 0;
let maximumCrossSectionFill = 0;

for (let x = planBounds.totalLandTake.minX; x <= planBounds.totalLandTake.maxX; x++) {
  const datumY = profileY(x);
  for (let z = planBounds.totalLandTake.minZ; z <= planBounds.totalLandTake.maxZ; z++) {
    const chunk = await reader.readChunk(Math.floor(x / 16), Math.floor(z / 16));
    const names = new Array(WORLD_MAX_Y - WORLD_MIN_Y + 1);
    const states = new Array(names.length);
    for (let y = WORLD_MIN_Y; y <= WORLD_MAX_Y; y++) {
      const state = reader.stateAt(chunk, x, y, z);
      const name = state.Name ?? 'minecraft:air';
      names[y - WORLD_MIN_Y] = name;
      states[y - WORLD_MIN_Y] = state;
      if (WATER.has(name) || name === 'minecraft:lava') {
        fluidCells.push({ x, y, z, state: canonicalState(state) });
        if (WATER.has(name)) waterCells++;
        else lavaCells++;
      }
      if (SENSITIVE_NATURAL.has(name)) {
        sensitiveCells.push({ x, y, z, state: canonicalState(state) });
        increment(sensitiveBlocks, name);
      }
    }

    let terrainY = null;
    let terrainState = null;
    let waterAboveTerrain = false;
    let lavaAboveTerrain = false;
    for (let y = WORLD_MAX_Y; y >= WORLD_MIN_Y; y--) {
      const name = names[y - WORLD_MIN_Y];
      if (AIR.has(name)) continue;
      if (WATER.has(name)) {
        waterAboveTerrain = true;
        continue;
      }
      if (name === 'minecraft:lava') {
        lavaAboveTerrain = true;
        continue;
      }
      if (isOrganicSurfaceFeature(name)) continue;
      terrainY = y;
      terrainState = states[y - WORLD_MIN_Y];
      break;
    }
    assert(terrainY !== null && terrainState, `no terrain found at ${x},${z}`);
    if (waterAboveTerrain) surfaceWaterColumns++;
    if (lavaAboveTerrain) surfaceLavaColumns++;
    terrainMinY = terrainMinY === null ? terrainY : Math.min(terrainMinY, terrainY);
    terrainMaxY = terrainMaxY === null ? terrainY : Math.max(terrainMaxY, terrainY);
    increment(terrainBlocks, terrainState.Name);
    increment(biomes, reader.biomeAt(chunk, x, terrainY, z) ?? 'UNKNOWN');
    terrainStateCells.push({ x, y: terrainY, z, state: canonicalState(terrainState) });

    maximumCrossSectionCut = Math.max(maximumCrossSectionCut, terrainY - datumY);
    maximumCrossSectionFill = Math.max(maximumCrossSectionFill, datumY - terrainY);
    const spanMin = Math.min(terrainY, datumY);
    const spanMax = Math.max(terrainY, datumY);
    for (let y = spanMin; y <= spanMax; y++) {
      const name = names[y - WORLD_MIN_Y];
      if (WATER.has(name)) groundToDatumWaterCells++;
      if (name === 'minecraft:lava') groundToDatumLavaCells++;
      if (isOrganicSurfaceFeature(name)) {
        groundToDatumOrganicCells++;
        increment(organicBlocksInGroundToDatumSpan, name);
      }
    }
  }
}

const blockEntities = [];
for (const { cx, cz } of touchedChunks) {
  const chunk = await reader.readChunk(cx, cz);
  for (const entity of chunk.raw.block_entities ?? []) {
    const x = Number(entity.x);
    const y = Number(entity.y);
    const z = Number(entity.z);
    if (x >= planBounds.totalLandTake.minX && x <= planBounds.totalLandTake.maxX
      && z >= planBounds.totalLandTake.minZ && z <= planBounds.totalLandTake.maxZ) {
      blockEntities.push({ id: entity.id ?? 'UNKNOWN', x, y, z });
    }
  }
}

const phase0Atlas = probe.bounds.phase0Atlas;
const candidateInsideDeclaredPhase0Atlas = planBounds.totalLandTake.minX >= phase0Atlas.minX
  && planBounds.totalLandTake.maxX <= phase0Atlas.maxX
  && planBounds.totalLandTake.minZ >= phase0Atlas.minZ
  && planBounds.totalLandTake.maxZ <= phase0Atlas.maxZ;

const c01Findings = clearance.results.findings.filter((finding) => (
  finding.feature.startsWith('C01 ')
));
function coordinateGap(bounds, extent) {
  const dx = bounds.maxX < extent.minX ? extent.minX - bounds.maxX
    : extent.maxX < bounds.minX ? bounds.minX - extent.maxX : 0;
  const dz = bounds.maxZ < extent.minZ ? extent.minZ - bounds.maxZ
    : extent.maxZ < bounds.minZ ? bounds.minZ - extent.maxZ : 0;
  return Math.max(dx, dz);
}
const c01CandidateSeparations = c01Findings.map((finding) => ({
  feature: finding.feature,
  layer: finding.layer,
  featureBaseY: finding.featureBaseY,
  featureTopY: finding.featureTopY,
  extent: finding.extent,
  candidateTotalLandTakeCoordinateGap: coordinateGap(
    planBounds.totalLandTake,
    finding.extent,
  ),
  structuralAcceptance: false,
}));

const sourceBindings = [
  fileBinding(MASTERPLAN, 'current-world plan and Phase 1 pilot requirement'),
  fileBinding(COORDINATES, 'C1 alignment and cross-section'),
  fileBinding(TERRAIN_PROBE, 'sampled terrain and accepted rail study profile'),
  fileBinding(PHASE0_EVIDENCE, 'immutable siting evidence and structure-inventory boundary'),
  fileBinding(CLEARANCE, 'catalog plan separation and truth boundary'),
  fileBinding(DECISIONS, 'reserve-first rail staging decision'),
];

const gates = [
  {
    id: 'source-bindings-and-snapshot-integrity',
    status: 'PASS',
    basis: 'All six local inputs are hash-bound and the copied Phase 0 post region identity exactly matches its declaration.',
  },
  {
    id: 'bounded-candidate-plan-selection',
    status: 'PASS',
    basis: 'The candidate is a 64-chainage-block east-west tangent bounded by five consecutive dry, zero-cut/fill source samples.',
  },
  {
    id: 'exact-integer-reference-and-rail-setout',
    status: 'PASS_COORDINATION_ONLY',
    basis: 'All 65 reference points and both reserved rail centerlines have deterministic integer X/Y/Z setout; this is not a target cell set.',
  },
  {
    id: 'exact-plan-cross-section',
    status: 'PASS_COORDINATION_ONLY',
    basis: 'The 56-block reservation, 13-block empty rail strip, and 80-block total land take have exact plan bounds, counts, and hashes.',
  },
  {
    id: 'candidate-touched-chunk-coverage',
    status: touchedChunks.every((chunk) => chunk.status === 'minecraft:full') ? 'PASS' : 'HOLD',
    basis: `${touchedChunks.length} touched chunks were decoded directly from the immutable snapshot.`,
  },
  {
    id: 'limited-fluid-observation',
    status: groundToDatumWaterCells === 0 && groundToDatumLavaCells === 0 ? 'PASS_LIMITED' : 'HOLD',
    basis: `Surface-to-rail-datum spans contain ${groundToDatumWaterCells} water and ${groundToDatumLavaCells} lava cells, but the complete land-take columns contain ${waterCells} water and ${lavaCells} lava cells and no drainage model exists.`,
  },
  {
    id: 'complete-generated-structure-clearance',
    status: 'HOLD',
    basis: `Touched start chunks contain ${localStructureIntersections.length} intersecting starts, but the candidate is outside the Phase 0 atlas used for the complete structure-start inventory; adjacent start chunks can own structures crossing this envelope.`,
  },
  {
    id: 'surface-catalog-plan-separation',
    status: 'PASS_LIMITED',
    basis: 'The corridor-wide catalog test reports zero surface-feature intersections; catalog separation is not ownership or loading acceptance.',
  },
  {
    id: 'pale-garden-and-live-entity-clearance',
    status: 'HOLD',
    basis: `All five source samples are pale garden and the exact envelope contains ${sensitiveBlocks['minecraft:creaking_heart'] ?? 0} creaking-heart cells; copied entity-region evidence and a preservation policy are absent.`,
  },
  {
    id: 'block-entity-and-dungeon-clearance',
    status: 'HOLD',
    basis: `The copied candidate columns contain ${blockEntities.length} block entities, including ${blockEntities.filter((entity) => entity.id === 'minecraft:mob_spawner').length} mob spawners and ${blockEntities.filter((entity) => entity.id === 'minecraft:chest').length} chests; no target or interaction volume exists to prove non-interference.`,
  },
  {
    id: 'independent-highway-vertical-profile',
    status: 'HOLD',
    basis: 'The integer rail study datum cannot be silently reused as the highway profile; cross-section cut/fill reaches the values reported by this census.',
  },
  {
    id: 'soil-loading-retaining-and-slope-design',
    status: 'HOLD',
    basis: 'Block identities do not prove geotechnical capacity, settlement, retained slopes, structures, or C01 loading acceptance.',
  },
  {
    id: 'hydrology-and-drainage-design',
    status: 'HOLD',
    basis: 'No runoff, watershed, infiltration, culvert, ditch, snowmelt, sump, discharge, erosion, or unintended-diversion model is frozen.',
  },
  {
    id: 'ownership-and-interface-contracts',
    status: 'HOLD',
    basis: 'No exact candidate owner/interaction union or default-deny interface audit exists.',
  },
  {
    id: 'fresh-release-source-and-entity-identity',
    status: 'HOLD',
    basis: 'The Phase 0 snapshot is terrain evidence only, lacks entities/POI/level identity, and is not a future execution-moment source snapshot.',
  },
  {
    id: 'physical-pilot-cell-set',
    status: 'HOLD',
    basis: 'Missing civil, hydrology, protected-natural, structure, entity, ownership, source-guard, rollback, and authorization gates prohibit target-cell compilation.',
  },
];

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-c1-pilot-coordination',
  generatedAtUtc: GENERATED_AT,
  status: 'COORDINATION_CANDIDATE_FROZEN_PHYSICAL_PILOT_HOLD',
  authority: {
    chain: '01 + 02 + 03 -> 04 normalized architecture -> 05 current-world placement',
    planToDevelop: 'masterplans/05-combined-zones/MASTERPLAN.md',
    role: 'bounded C1 coordination evidence; not construction ownership or a release manifest',
    offlineOnly: true,
    worldEditAuthorized: false,
    constructionPackageExists: false,
  },
  sourceBindings,
  snapshot: {
    ...snapshot,
    use: 'historical Phase 0 terrain and coordination evidence only',
    usableAsReleaseSource: false,
    entitiesDirectoryPresent: fs.existsSync(path.join(path.dirname(snapshotDirectory), 'entities')),
    poiDirectoryPresent: fs.existsSync(path.join(path.dirname(snapshotDirectory), 'poi')),
    levelDatPresent: fs.existsSync(path.join(path.dirname(snapshotDirectory), 'level.dat')),
  },
  candidate: {
    id: 'C1-R01-TANGENT-A-S24-S28',
    rationale: 'strongest bounded straight study window: five consecutive dry source samples with zero centerline rail cut/fill, outside curves, terminals, stations, interchanges, and known direct catalog intersections',
    sourceSampleRangeInclusive: {
      start: CANDIDATE_SAMPLE_START,
      end: CANDIDATE_SAMPLE_END,
    },
    chainage: { start: anchors[0].chainage, end: anchors.at(-1).chainage, length: 64 },
    sourceSamples,
    sourceProfileAnchors: anchors,
    outsideDeclaredPhase0Atlas: !candidateInsideDeclaredPhase0Atlas,
    declaredPhase0Atlas: phase0Atlas,
  },
  integerSetout: {
    interpolation: 'exact linear interpolation between 16-block rail-profile anchors; nearest integer with exact halves choosing the greater Y',
    referenceCenterline: {
      pointCount: referenceCenterline.length,
      bounds: {
        minX,
        maxX,
        minY: Math.min(...referenceCenterline.map((cell) => cell.y)),
        maxY: Math.max(...referenceCenterline.map((cell) => cell.y)),
        minZ: REFERENCE_Z,
        maxZ: REFERENCE_Z,
      },
      cellSetSha256: cellSetHash(referenceCenterline, 'combined-zones-c1-pilot-reference-centerline-v1'),
      points: referenceCenterline,
    },
    verticalChanges: {
      count: verticalChangeLocations.length,
      locations: verticalChangeLocations,
      minimumHorizontalRunBetweenChanges: Math.min(...verticalChangeRuns),
      maximumAbsoluteSingleChange: Math.max(...verticalChangeLocations.map((change) => Math.abs(change.deltaY))),
    },
    reservedRailCenterlines: {
      staging: 'RESERVE_FIRST_FULLY_CLEAR_SPANNED_RAIL_STRIP',
      trackConstructionAuthorized: false,
      zCoordinates: [REFERENCE_Z - 28, REFERENCE_Z - 24],
      pointCount: railCenterlines.length,
      cellSetSha256: cellSetHash(railCenterlines, 'combined-zones-c1-pilot-reserved-rail-centerlines-v1'),
    },
    independentHighwayProfile: null,
  },
  exactPlanCoordination: {
    coordinateSemantics: 'inclusive integer block columns',
    normalRuleOnThisEastboundTangent: 'worldZ = referenceZ + signed cross-section offset; negative offsets are north',
    sets: planSets,
    crossSectionElements: c1.crossSection.elements.map((element) => ({
      ...element,
      worldZFrom: REFERENCE_Z + element.offsetFrom,
      worldZTo: REFERENCE_Z + element.offsetTo,
    })),
    slopeEasements: {
      north: { minZ: planBounds.totalLandTake.minZ, maxZ: planBounds.reservation.minZ - 1 },
      south: { minZ: planBounds.reservation.maxZ + 1, maxZ: planBounds.totalLandTake.maxZ },
      widthEachBlocks: 12,
    },
    physicalTargetCellSet: null,
    interactionCellSet: null,
  },
  immutableSnapshotCensus: {
    touchedChunkBounds: { minCx, maxCx, minCz, maxCz },
    touchedChunkCount: touchedChunks.length,
    touchedChunks,
    allTouchedChunksFull: touchedChunks.every((chunk) => chunk.status === 'minecraft:full'),
    columns: planSets.totalLandTake.columnCount,
    terrain: {
      method: 'top-down exact palette scan; ignore air, fluids, and enumerated organic surface features before selecting the first support block',
      minY: terrainMinY,
      maxY: terrainMaxY,
      blockCounts: sortRecord(terrainBlocks),
      biomeCounts: sortRecord(biomes),
      exactStateSetSha256: stateSetHash(terrainStateCells, 'combined-zones-c1-pilot-terrain-state-cells-v1'),
    },
    fluids: {
      surfaceWaterColumns,
      surfaceLavaColumns,
      fullColumnWorldYRange: { minY: WORLD_MIN_Y, maxY: WORLD_MAX_Y },
      waterCells,
      lavaCells,
      exactFluidStateSetSha256: stateSetHash(fluidCells, 'combined-zones-c1-pilot-fluid-state-cells-v1'),
      groundToRailDatumSpan: {
        waterCells: groundToDatumWaterCells,
        lavaCells: groundToDatumLavaCells,
      },
      hydrologyDesignComplete: false,
    },
    naturalAndOrganicFeatures: {
      sensitiveBlockCounts: sortRecord(sensitiveBlocks),
      exactSensitiveStateSetSha256: stateSetHash(
        sensitiveCells,
        'combined-zones-c1-pilot-sensitive-natural-state-cells-v1',
      ),
      organicCellsInGroundToRailDatumSpan: groundToDatumOrganicCells,
      organicBlocksInGroundToRailDatumSpan: sortRecord(organicBlocksInGroundToDatumSpan),
      preservationAndClearancePolicyFrozen: false,
    },
    crossSectionAgainstRailDatum: {
      maximumObservedCutBlocks: maximumCrossSectionCut,
      maximumObservedFillBlocks: maximumCrossSectionFill,
      interpretation: 'These are diagnostic differences across the 80-block planning land take, not approved earthwork because the highway, crossfall, slopes, drainage, and retaining profiles are unset.',
    },
    blockEntities: {
      count: blockEntities.length,
      records: blockEntities,
      boundary: 'Block entities in region chunks are not the separate live entity census.',
    },
    generatedStructures: {
      startsRecordedInTouchedChunks: localStructureStarts.length,
      touchedChunkStartsIntersectingCandidate: localStructureIntersections,
      phase0RecordedStartsIntersectingCandidate: phase0StructureIntersections,
      completeClearance: false,
      boundary: 'The Phase 0 complete structure-start inventory was limited to its eastern atlas. Reading touched start chunks cannot exclude a structure whose start is stored in an adjacent chunk.',
    },
  },
  catalogAndSubsurfaceCoordination: {
    corridorWideSurfaceFeatureIntersectionCount: clearance.results.surfaceFeaturesIntersectingReservation.length,
    candidateC01CoordinateSeparations: c01CandidateSeparations,
    ownershipAccepted: false,
    structuralLoadingAccepted: false,
  },
  gates,
  decision: {
    coordinationEnvelopeMayBeFrozen: true,
    reservedRailSetoutMayBeFrozenForCoordination: true,
    independentHighwayProfileFrozen: false,
    physicalPilotTargetCellSetMayBeFrozen: false,
    operationCellCount: 0,
    operationsEmitted: false,
    phase1R01Status: 'HOLD',
    liveBuildMayProceed: false,
  },
};

function markdownFor(result) {
  const gateRows = result.gates
    .map((gate) => `| ${gate.id} | **${gate.status}** | ${gate.basis} |`)
    .join('\n');
  const terrain = result.immutableSnapshotCensus.terrain;
  const fluids = result.immutableSnapshotCensus.fluids;
  const nature = result.immutableSnapshotCensus.naturalAndOrganicFeatures;
  const civil = result.immutableSnapshotCensus.crossSectionAgainstRailDatum;
  return `# Combined Zones Phase 1 C1 bounded-pilot coordination\n\n`
    + `Status: **COORDINATION CANDIDATE FROZEN — PHYSICAL PILOT HOLD — OFFLINE ONLY**\n\n`
    + `The machine-readable evidence is [phase1-c1-pilot-coordination.json](phase1-c1-pilot-coordination.json). This read-only audit emits zero operations and cannot authorize construction.\n\n`
    + `## Strongest bounded candidate\n\n`
    + `The best defensible straight study window is C1 Phase 0 samples \`${CANDIDATE_SAMPLE_START}…${CANDIDATE_SAMPLE_END}\`: reference centerline \`x=${minX}…${maxX}, z=${REFERENCE_Z}\`, chainage \`${anchors[0].chainage}…${anchors.at(-1).chainage}\`. All five source samples are dry and their sampled rail cut/fill is zero. The 65 integer setout points use exact interpolation between the 16-block anchors and nearest-integer rounding with ties toward the greater Y.\n\n`
    + `The plan-only cross-section is now exact for this tangent:\n\n`
    + `- 56-block reservation: \`x=${minX}…${maxX}, z=${planBounds.reservation.minZ}…${planBounds.reservation.maxZ}\` (${planSets.reservation.columnCount.toLocaleString()} columns);\n`
    + `- empty 13-block north rail strip: \`z=${planBounds.reservedRailStrip.minZ}…${planBounds.reservedRailStrip.maxZ}\` (${planSets.reservedRailStrip.columnCount.toLocaleString()} columns);\n`
    + `- 80-block land take including slopes: \`z=${planBounds.totalLandTake.minZ}…${planBounds.totalLandTake.maxZ}\` (${planSets.totalLandTake.columnCount.toLocaleString()} columns);\n`
    + `- reserved rail centerlines: \`z=${REFERENCE_Z - 28}\` and \`z=${REFERENCE_Z - 24}\`; track construction remains unauthorized.\n\n`
    + `This freezes a coordination envelope, not construction targets. The highway vertical profile remains null.\n\n`
    + `## Immutable-snapshot findings\n\n`
    + `All ${result.immutableSnapshotCensus.touchedChunkCount} touched chunks decode as \`minecraft:full\`. Across ${result.immutableSnapshotCensus.columns.toLocaleString()} land-take columns, independently selected support terrain spans \`Y=${terrain.minY}…${terrain.maxY}\`. Comparing the entire cross-section with the rail datum exposes up to ${civil.maximumObservedCutBlocks} blocks of cut and ${civil.maximumObservedFillBlocks} blocks of fill, despite the five centerline samples reading zero. That is why the rail datum cannot become a highway profile.\n\n`
    + `The surface census finds ${fluids.surfaceWaterColumns} water columns and ${fluids.surfaceLavaColumns} lava columns. The exact surface-to-rail-datum spans contain ${fluids.groundToRailDatumSpan.waterCells} water and ${fluids.groundToRailDatumSpan.lavaCells} lava cells, but the complete copied columns contain ${fluids.waterCells.toLocaleString()} water and ${fluids.lavaCells.toLocaleString()} lava cells. No drainage or watershed model exists.\n\n`
    + `All five source samples are \`minecraft:pale_garden\`. The exact envelope contains ${(nature.sensitiveBlockCounts['minecraft:creaking_heart'] ?? 0).toLocaleString()} creaking-heart cells and ${nature.organicCellsInGroundToRailDatumSpan.toLocaleString()} organic cells in the ground-to-datum span. There is no reviewed pale-garden preservation policy and the copied package has no entity directory.\n\n`
    + `## Gates\n\n`
    + `| Gate | Result | Basis |\n|---|---|---|\n${gateRows}\n\n`
    + `## Decision\n\n`
    + `The bounded coordinate envelope and reserved-rail setout may be frozen for offline coordination. A physical pilot cell set may **not** be frozen. R01 remains on HOLD until the independent highway profile, complete structure clearance, pale-garden and entity treatment, soil/loading/retaining design, hydrology/drainage, ownership/interfaces, fresh source snapshot, exact guarded forward/rollback package, and release authorization all pass against the same identities.\n`;
}

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdownFor(report));

console.log(JSON.stringify({
  output: relative(OUTPUT),
  markdown: relative(MARKDOWN),
  status: report.status,
  coordinationEnvelopeMayBeFrozen: report.decision.coordinationEnvelopeMayBeFrozen,
  physicalPilotTargetCellSetMayBeFrozen: report.decision.physicalPilotTargetCellSetMayBeFrozen,
  operationCellCount: report.decision.operationCellCount,
}, null, 2));
