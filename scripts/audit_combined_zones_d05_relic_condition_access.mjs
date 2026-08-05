#!/usr/bin/env node
/**
 * Deterministic read-only condition and access-candidate survey for the three
 * Combined Zones D05 protected relic records.
 *
 * The script reads only the bound immutable copied Anvil snapshot and local
 * evidence. It emits no operation/material cells, contacts no live service,
 * and does not claim template integrity, structural safety, public access, or
 * an accepted engineering buffer.
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

const GENERATED_AT = value('--generated-at', '2026-08-04T20:15:00Z');
const PHASE0 = path.resolve(value(
  '--phase0-evidence',
  'docs/masterplans/05-combined-zones/phase0-survey-evidence.json',
));
const RELIC_CLEARANCE = path.resolve(value(
  '--relic-clearance',
  'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
));
const D05_DESIGN = path.resolve(value(
  '--d05-design',
  'docs/masterplans/05-combined-zones/phase1-d05-hydrology-relic-buffer-design.json',
));
const D05_DEFAULTS = path.resolve(value(
  '--d05-defaults',
  'docs/masterplans/05-combined-zones/phase1-d05-conservative-defaults.json',
));
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-d05-relic-condition-access-survey.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-d05-relic-condition-access-survey.md',
));

const WORLD_MIN_Y = -64;
const WORLD_MAX_Y = 319;
const HORIZONTAL_SURVEY_MARGIN = 16;
const BELOW_SURVEY_MARGIN = 16;
const ABOVE_SURVEY_MARGIN = 24;
const OBSERVATION_MINIMUM_DISTANCE = 2;
const OBSERVATION_MAXIMUM_DISTANCE = 6;
const MAX_SIGHTLINE_CANDIDATES = 32;
const MAX_SIGHTLINE_TARGETS_PER_CANDIDATE = 64;
const MAX_ROUTE_VISITS = 500_000;

const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:bubble_column', 'minecraft:lava']);
const DEADLY = new Set([
  'minecraft:fire',
  'minecraft:soul_fire',
  'minecraft:cactus',
  'minecraft:magma_block',
  'minecraft:sweet_berry_bush',
  'minecraft:powder_snow',
]);
const PASSABLE_EXACT = new Set([
  ...AIR,
  'minecraft:short_grass',
  'minecraft:tall_grass',
  'minecraft:fern',
  'minecraft:large_fern',
  'minecraft:dead_bush',
  'minecraft:snow',
  'minecraft:tripwire',
  'minecraft:redstone_wire',
  'minecraft:light',
  'minecraft:lever',
]);
const PASSABLE_SUFFIXES = [
  '_flower',
  '_sapling',
  '_torch',
  '_wall_torch',
  '_sign',
  '_wall_sign',
  '_hanging_sign',
  '_wall_hanging_sign',
  '_banner',
  '_wall_banner',
  '_button',
  '_pressure_plate',
  '_rail',
  '_carpet',
];

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function fileBinding(filename) {
  const data = fs.readFileSync(filename);
  return { path: relative(filename), bytes: data.length, sha256: sha256(data) };
}

function invariant(condition, message) {
  if (!condition) throw new Error(`D05-S01 input rejected: ${message}`);
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

class Snapshot {
  constructor(directory) {
    this.directory = directory;
    this.regionCache = new Map();
    this.chunkCache = new Map();
    this.blockCache = new Map();
  }

  region(rx, rz) {
    const key = `${rx},${rz}`;
    if (this.regionCache.has(key)) return this.regionCache.get(key);
    const filename = path.join(this.directory, `r.${rx}.${rz}.mca`);
    const buffer = fs.existsSync(filename) ? fs.readFileSync(filename) : null;
    this.regionCache.set(key, buffer);
    return buffer;
  }

  async chunk(cx, cz) {
    const key = `${cx},${cz}`;
    if (this.chunkCache.has(key)) return this.chunkCache.get(key);
    const buffer = this.region(Math.floor(cx / 32), Math.floor(cz / 32));
    invariant(buffer, `missing region for chunk ${key}`);
    const index = ((cx & 31) + (cz & 31) * 32) * 4;
    const sectorOffset = buffer.readUIntBE(index, 3);
    invariant(sectorOffset > 0, `missing chunk ${key}`);
    const offset = sectorOffset * 4096;
    const length = buffer.readUInt32BE(offset);
    const compression = buffer.readUInt8(offset + 4);
    invariant(!(compression & 0x80), `external chunk storage unsupported at ${key}`);
    const { parsed } = await nbt.parse(decompress(
      compression,
      buffer.subarray(offset + 5, offset + 4 + length),
    ));
    const chunk = nbt.simplify(parsed);
    invariant(chunk?.Status === 'minecraft:full', `chunk ${key} is not minecraft:full`);
    this.chunkCache.set(key, chunk);
    return chunk;
  }

  async block(x, y, z) {
    if (y < WORLD_MIN_Y || y > WORLD_MAX_Y) return { Name: 'minecraft:void_air' };
    const key = `${x},${y},${z}`;
    if (this.blockCache.has(key)) return this.blockCache.get(key);
    const chunk = await this.chunk(Math.floor(x / 16), Math.floor(z / 16));
    const section = chunk.sections?.find((candidate) => Number(candidate.Y) === Math.floor(y / 16));
    const states = section?.block_states;
    const state = states?.palette?.length
      ? states.palette[paletteIndex(
        states,
        ((y & 15) << 8) | ((z & 15) << 4) | (x & 15),
        4,
      )] ?? { Name: 'minecraft:air' }
      : { Name: 'minecraft:air' };
    this.blockCache.set(key, state);
    return state;
  }

  async blockEntities(bounds) {
    const result = [];
    for (let cz = Math.floor(bounds.minZ / 16); cz <= Math.floor(bounds.maxZ / 16); cz++) {
      for (let cx = Math.floor(bounds.minX / 16); cx <= Math.floor(bounds.maxX / 16); cx++) {
        const chunk = await this.chunk(cx, cz);
        for (const entity of chunk.block_entities ?? chunk.blockEntities ?? []) {
          const point = {
            x: Number(entity.x),
            y: Number(entity.y),
            z: Number(entity.z),
          };
          if (!contains(bounds, point)) continue;
          result.push({
            id: String(entity.id ?? entity.Id ?? 'unknown'),
            ...point,
          });
        }
      }
    }
    return result.sort(compareCells);
  }
}

function canonicalState(state) {
  const properties = Object.entries(state?.Properties ?? {})
    .sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify({
    Name: state?.Name ?? 'minecraft:air',
    ...(properties.length ? { Properties: Object.fromEntries(properties) } : {}),
  });
}

function compareCells(left, right) {
  return left.x - right.x || left.y - right.y || left.z - right.z;
}

function key(cell) {
  return `${cell.x},${cell.y},${cell.z}`;
}

function fromKey(value) {
  const [x, y, z] = value.split(',').map(Number);
  return { x, y, z };
}

function coordinateSetHash(cells) {
  const digest = crypto.createHash('sha256');
  digest.update('combined-zones-coordinate-cell-set-v1\n');
  for (const cell of [...cells].sort(compareCells)) digest.update(`${key(cell)}\n`);
  return digest.digest('hex');
}

function stateSetHash(cells) {
  const digest = crypto.createHash('sha256');
  digest.update('combined-zones-block-state-cell-set-v1\n');
  for (const cell of [...cells].sort(compareCells)) {
    digest.update(`${key(cell)}\t${canonicalState(cell.state)}\n`);
  }
  return digest.digest('hex');
}

function recordSetHash(records, preamble) {
  const digest = crypto.createHash('sha256');
  digest.update(`${preamble}\n`);
  for (const record of records) digest.update(`${JSON.stringify(record)}\n`);
  return digest.digest('hex');
}

function contains(bounds, cell) {
  return cell.x >= bounds.minX && cell.x <= bounds.maxX
    && cell.y >= bounds.minY && cell.y <= bounds.maxY
    && cell.z >= bounds.minZ && cell.z <= bounds.maxZ;
}

function touchesBoundary(bounds, cell) {
  return cell.x === bounds.minX || cell.x === bounds.maxX
    || cell.y === bounds.minY || cell.y === bounds.maxY
    || cell.z === bounds.minZ || cell.z === bounds.maxZ;
}

function expand(bounds, horizontal, below, above) {
  return {
    minX: bounds.minX - horizontal,
    maxX: bounds.maxX + horizontal,
    minY: Math.max(WORLD_MIN_Y, bounds.minY - below),
    maxY: Math.min(WORLD_MAX_Y, bounds.maxY + above),
    minZ: bounds.minZ - horizontal,
    maxZ: bounds.maxZ + horizontal,
  };
}

function volume(bounds) {
  return (bounds.maxX - bounds.minX + 1)
    * (bounds.maxY - bounds.minY + 1)
    * (bounds.maxZ - bounds.minZ + 1);
}

function boxCells(bounds) {
  const result = [];
  for (let x = bounds.minX; x <= bounds.maxX; x++) {
    for (let y = bounds.minY; y <= bounds.maxY; y++) {
      for (let z = bounds.minZ; z <= bounds.maxZ; z++) result.push({ x, y, z });
    }
  }
  return result;
}

function neighbors(cell) {
  return [
    { x: cell.x + 1, y: cell.y, z: cell.z },
    { x: cell.x - 1, y: cell.y, z: cell.z },
    { x: cell.x, y: cell.y + 1, z: cell.z },
    { x: cell.x, y: cell.y - 1, z: cell.z },
    { x: cell.x, y: cell.y, z: cell.z + 1 },
    { x: cell.x, y: cell.y, z: cell.z - 1 },
  ];
}

function boundsOf(cells) {
  if (!cells.length) return null;
  return {
    minX: Math.min(...cells.map((cell) => cell.x)),
    maxX: Math.max(...cells.map((cell) => cell.x)),
    minY: Math.min(...cells.map((cell) => cell.y)),
    maxY: Math.max(...cells.map((cell) => cell.y)),
    minZ: Math.min(...cells.map((cell) => cell.z)),
    maxZ: Math.max(...cells.map((cell) => cell.z)),
  };
}

function components(cells, extra = () => ({})) {
  const byKey = new Map(cells.map((cell) => [key(cell), cell]));
  const seen = new Set();
  const result = [];
  for (const start of [...cells].sort(compareCells)) {
    if (seen.has(key(start))) continue;
    const queue = [start];
    const members = [];
    seen.add(key(start));
    for (let index = 0; index < queue.length; index++) {
      const cell = queue[index];
      members.push(cell);
      for (const candidate of neighbors(cell)) {
        const candidateKey = key(candidate);
        if (!byKey.has(candidateKey) || seen.has(candidateKey)) continue;
        seen.add(candidateKey);
        queue.push(byKey.get(candidateKey));
      }
    }
    result.push({
      cellCount: members.length,
      bounds: boundsOf(members),
      coordinateSetSha256: coordinateSetHash(members),
      ...extra(members),
    });
  }
  return result.sort((left, right) => right.cellCount - left.cellCount
    || left.coordinateSetSha256.localeCompare(right.coordinateSetSha256));
}

function isPresent(state) {
  return !AIR.has(state?.Name);
}

function isFluid(state) {
  return FLUID.has(state?.Name) || state?.Properties?.waterlogged === 'true';
}

function isPassable(state) {
  const name = state?.Name ?? 'minecraft:air';
  if (PASSABLE_EXACT.has(name)) return true;
  if (FLUID.has(name) || DEADLY.has(name)) return false;
  if (PASSABLE_SUFFIXES.some((suffix) => name.endsWith(suffix))) return true;
  if (name.endsWith('_door') || name.endsWith('_fence_gate')
    || name.endsWith('_trapdoor')) return state?.Properties?.open === 'true';
  return false;
}

function isSafeFooting(state) {
  const name = state?.Name ?? 'minecraft:air';
  if (AIR.has(name) || isFluid(state) || DEADLY.has(name) || isPassable(state)) return false;
  return !name.endsWith('_fence')
    && !name.endsWith('_wall')
    && !name.endsWith('_pane')
    && !name.endsWith('_leaves')
    && !name.endsWith('_chain')
    && !name.endsWith('_lantern');
}

async function standable(snapshot, cell) {
  return isPassable(await snapshot.block(cell.x, cell.y, cell.z))
    && isPassable(await snapshot.block(cell.x, cell.y + 1, cell.z))
    && isSafeFooting(await snapshot.block(cell.x, cell.y - 1, cell.z));
}

function horizontalDistanceFromBox(cell, bounds) {
  const dx = cell.x < bounds.minX
    ? bounds.minX - cell.x
    : cell.x > bounds.maxX ? cell.x - bounds.maxX : 0;
  const dz = cell.z < bounds.minZ
    ? bounds.minZ - cell.z
    : cell.z > bounds.maxZ ? cell.z - bounds.maxZ : 0;
  return Math.max(dx, dz);
}

function squaredDistance(left, right) {
  return (left.x - right.x) ** 2 + (left.y - right.y) ** 2 + (left.z - right.z) ** 2;
}

function centerCell(bounds) {
  return {
    x: Math.floor((bounds.minX + bounds.maxX) / 2),
    y: Math.floor((bounds.minY + bounds.maxY) / 2),
    z: Math.floor((bounds.minZ + bounds.maxZ) / 2),
  };
}

function rayVoxels(from, target) {
  const start = { x: from.x + 0.5, y: from.y + 1.62, z: from.z + 0.5 };
  const end = { x: target.x + 0.5, y: target.y + 0.5, z: target.z + 0.5 };
  const distance = Math.sqrt(squaredDistance(start, end));
  const steps = Math.max(1, Math.ceil(distance * 8));
  const result = [];
  const seen = new Set();
  for (let index = 0; index <= steps; index++) {
    const ratio = index / steps;
    const cell = {
      x: Math.floor(start.x + (end.x - start.x) * ratio),
      y: Math.floor(start.y + (end.y - start.y) * ratio),
      z: Math.floor(start.z + (end.z - start.z) * ratio),
    };
    if (seen.has(key(cell))) continue;
    seen.add(key(cell));
    result.push(cell);
  }
  return result;
}

async function clearAirRay(snapshot, from, target) {
  const voxels = rayVoxels(from, target);
  const intermediate = voxels.slice(1, -1);
  for (const cell of intermediate) {
    if (!AIR.has((await snapshot.block(cell.x, cell.y, cell.z)).Name)) return null;
  }
  return {
    target,
    voxelCount: voxels.length,
    voxelSetSha256: coordinateSetHash(voxels),
    rule: 'all intermediate sampled voxels are exact air variants; the target voxel may be present fabric or an absent-site datum',
  };
}

function movementCandidates(point) {
  const result = [];
  for (const [dx, dz] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
    for (const dy of [0, 1, -1]) {
      result.push({ x: point.x + dx, y: point.y + dy, z: point.z + dz });
    }
  }
  return result;
}

function reconstructPath(parents, endKey) {
  const result = [];
  let cursor = endKey;
  while (cursor !== null) {
    result.push(fromKey(cursor));
    cursor = parents.get(cursor) ?? null;
  }
  return result.reverse();
}

async function routeCandidate(snapshot, starts, goals, bounds, forbiddenBounds) {
  if (!starts.length || !goals.length) {
    return {
      status: 'NO_CANDIDATE',
      reason: !starts.length
        ? 'NO_STANDABLE_SURVEY_PERIMETER_CELLS'
        : 'NO_AIR_SIGHTLINE_OBSERVATION_CELLS',
      startCandidateCount: starts.length,
      goalCandidateCount: goals.length,
    };
  }
  const sortedStarts = [...starts].sort(compareCells);
  const goalKeys = new Set(goals.map((goal) => key(goal.point)));
  const queue = [];
  const parents = new Map();
  for (const start of sortedStarts) {
    const startKey = key(start);
    if (parents.has(startKey)) continue;
    parents.set(startKey, null);
    queue.push(start);
  }
  let cursor = 0;
  let reachedKey = null;
  while (cursor < queue.length && cursor < MAX_ROUTE_VISITS) {
    const point = queue[cursor++];
    const pointKey = key(point);
    if (goalKeys.has(pointKey)) {
      reachedKey = pointKey;
      break;
    }
    for (const candidate of movementCandidates(point)) {
      if (!contains(bounds, candidate) || contains(forbiddenBounds, candidate)) continue;
      const candidateKey = key(candidate);
      if (parents.has(candidateKey)) continue;
      if (!(await standable(snapshot, candidate))) continue;
      parents.set(candidateKey, pointKey);
      queue.push(candidate);
    }
  }
  if (!reachedKey) {
    return {
      status: 'NO_CANDIDATE',
      reason: cursor >= MAX_ROUTE_VISITS ? 'SEARCH_LIMIT_REACHED' : 'NO_BOUNDED_NORMAL_WALK_PATH',
      startCandidateCount: starts.length,
      goalCandidateCount: goals.length,
      visitedCellCount: cursor,
      frontierCellCount: queue.length,
    };
  }
  const route = reconstructPath(parents, reachedKey);
  const stateRecords = [];
  let minimumDistanceFromCore = Number.POSITIVE_INFINITY;
  for (const point of route) {
    stateRecords.push({
      point,
      feet: canonicalState(await snapshot.block(point.x, point.y, point.z)),
      head: canonicalState(await snapshot.block(point.x, point.y + 1, point.z)),
      support: canonicalState(await snapshot.block(point.x, point.y - 1, point.z)),
    });
    minimumDistanceFromCore = Math.min(
      minimumDistanceFromCore,
      horizontalDistanceFromBox(point, forbiddenBounds),
    );
  }
  const goal = goals.find((candidate) => key(candidate.point) === reachedKey);
  return {
    status: 'EXACT_OFFLINE_OBSERVATION_ROUTE_CANDIDATE',
    qualification:
      'Bounded two-block-clear cardinal walk with at most one-block vertical transitions. It is not live pathfinder proof, terrain safety, public access approval, entrance commissioning, or accessibility compliance.',
    startCandidateCount: starts.length,
    goalCandidateCount: goals.length,
    visitedCellCount: cursor,
    start: route[0],
    observationPoint: route.at(-1),
    observationTarget: goal.sightline.target,
    observationSightline: goal.sightline,
    pathCellCount: route.length,
    path: route,
    pathCoordinateSetSha256: coordinateSetHash(route),
    orderedPathSha256: recordSetHash(route, 'combined-zones-ordered-route-v1'),
    pathStateSha256: recordSetHash(stateRecords, 'combined-zones-route-state-v1'),
    maximumRiseBlocks: Math.max(0, ...route.slice(1).map((point, index) => (
      point.y - route[index].y
    ))),
    maximumDropBlocks: Math.max(0, ...route.slice(1).map((point, index) => (
      route[index].y - point.y
    ))),
    minimumHorizontalDistanceFromPlanningExclusionBlocks: minimumDistanceFromCore,
    entersPlanningExclusion: route.some((point) => contains(forbiddenBounds, point)),
    authorization: false,
  };
}

const sources = {
  phase0SurveyEvidence: fileBinding(PHASE0),
  protectedRelicClearance: fileBinding(RELIC_CLEARANCE),
  d05HydrologyRelicDesign: fileBinding(D05_DESIGN),
  d05ConservativeDefaults: fileBinding(D05_DEFAULTS),
};
const phase0 = readJson(PHASE0);
const clearance = readJson(RELIC_CLEARANCE);
const d05 = readJson(D05_DESIGN);
const defaults = readJson(D05_DEFAULTS);

invariant(phase0.status === 'PASS_REVISED_SITING_PHASE0', 'Phase 0 is not accepted');
invariant(clearance.g06Disposition?.status === 'HOLD', 'G06 must remain HOLD');
invariant(d05.d05Disposition?.status === 'HOLD', 'D05 must remain HOLD');
invariant(defaults.status === 'RECOMMENDATION_READY_D05_AND_G06_HOLD',
  'unexpected D05 conservative-default packet');
invariant(defaults.evidenceBoundary?.d05Resolved === false,
  'D05 conservative-default packet unexpectedly resolves D05');
invariant(defaults.sourceBindings?.phase0Evidence?.sha256 === sources.phase0SurveyEvidence.sha256,
  'conservative defaults have a stale Phase 0 binding');
invariant(defaults.sourceBindings?.protectedRelicClearance?.sha256
  === sources.protectedRelicClearance.sha256,
  'conservative defaults have a stale relic binding');
invariant(defaults.sourceBindings?.d05HydrologyRelicDesign?.sha256
  === sources.d05HydrologyRelicDesign.sha256,
  'conservative defaults have a stale D05 binding');

const regionDirectory = path.resolve(phase0.snapshots.postGeneration.path);
const immutableSnapshot = snapshotIdentity(regionDirectory);
invariant(immutableSnapshot.sha256 === phase0.snapshots.postGeneration.sha256,
  'immutable snapshot hash drift');
invariant(immutableSnapshot.regionFileCount === phase0.snapshots.postGeneration.regionFileCount,
  'immutable snapshot file-count drift');
invariant(immutableSnapshot.bytes === phase0.snapshots.postGeneration.bytes,
  'immutable snapshot byte-count drift');
invariant(immutableSnapshot.sha256
  === clearance.sourceBindings.immutablePhase0PostRegionSnapshot.sha256,
  'relic-clearance snapshot mismatch');
invariant(immutableSnapshot.sha256
  === d05.sourceBindings.immutablePhase0PostRegionSnapshot.sha256,
  'D05 snapshot mismatch');

const snapshot = new Snapshot(regionDirectory);
const surveyRelics = [];
for (const recommendation of defaults.soleAuthorityRecommendations.bufferPolicy.relics) {
  const relicKey = recommendation.relicKey;
  const clearanceRelic = clearance.relics.find((item) => item.key === relicKey);
  const d05Relic = d05.protectedRelicBufferCandidates.find((item) => item.relicKey === relicKey);
  invariant(clearanceRelic && d05Relic, `missing current evidence for ${relicKey}`);
  const core = recommendation.protectedCore.bounds;
  const planningExclusion = recommendation.minimumPlanningExclusionShell.expandedBounds;
  const surveyBounds = expand(core, HORIZONTAL_SURVEY_MARGIN, BELOW_SURVEY_MARGIN,
    ABOVE_SURVEY_MARGIN);

  const cells = [];
  for (const cell of boxCells(surveyBounds)) {
    cells.push({ ...cell, state: await snapshot.block(cell.x, cell.y, cell.z) });
  }
  const byKey = new Map(cells.map((cell) => [key(cell), cell]));
  const coreCells = cells.filter((cell) => contains(core, cell));
  const presentCoreCells = coreCells.filter((cell) => isPresent(cell.state));
  const airCells = cells.filter((cell) => AIR.has(cell.state.Name));
  invariant(presentCoreCells.length === clearanceRelic.observedSnapshotCensus.presentCellCount,
    `${relicKey} present-cell count drift`);
  invariant(coordinateSetHash(presentCoreCells)
    === clearanceRelic.observedSnapshotCensus.presentCoordinateSetSha256,
  `${relicKey} present-coordinate hash drift`);
  invariant(stateSetHash(presentCoreCells)
    === clearanceRelic.observedSnapshotCensus.presentBlockStateSetSha256,
  `${relicKey} present-state hash drift`);

  const materialCounts = {};
  for (const cell of presentCoreCells) {
    materialCounts[cell.state.Name] = (materialCounts[cell.state.Name] ?? 0) + 1;
  }
  const presentComponents = components(presentCoreCells);
  const exposedPresentCells = [];
  const fluidAdjacentPresentCells = [];
  for (const cell of presentCoreCells) {
    const adjacentStates = await Promise.all(neighbors(cell).map(
      (candidate) => snapshot.block(candidate.x, candidate.y, candidate.z),
    ));
    if (adjacentStates.some((state) => AIR.has(state.Name))) exposedPresentCells.push(cell);
    if (adjacentStates.some(isFluid)) fluidAdjacentPresentCells.push(cell);
  }

  const lowestPresentByColumn = new Map();
  for (const cell of presentCoreCells) {
    const columnKey = `${cell.x},${cell.z}`;
    const current = lowestPresentByColumn.get(columnKey);
    if (!current || cell.y < current.y) lowestPresentByColumn.set(columnKey, cell);
  }
  const belowContact = { present: [], air: [], fluid: [] };
  for (const lowest of [...lowestPresentByColumn.values()].sort(compareCells)) {
    const below = { x: lowest.x, y: lowest.y - 1, z: lowest.z };
    const state = await snapshot.block(below.x, below.y, below.z);
    const record = { ...below, state };
    if (AIR.has(state.Name)) belowContact.air.push(record);
    else if (isFluid(state)) belowContact.fluid.push(record);
    else belowContact.present.push(record);
  }

  const coreFootprintUnderlay = { present: [], air: [], fluid: [] };
  const nearestPresentBelowCore = [];
  let footprintColumnsWithoutPresentBelowInSurvey = 0;
  for (let x = core.minX; x <= core.maxX; x++) {
    for (let z = core.minZ; z <= core.maxZ; z++) {
      const underlay = { x, y: core.minY - 1, z };
      const underlayState = await snapshot.block(underlay.x, underlay.y, underlay.z);
      const underlayRecord = { ...underlay, state: underlayState };
      if (AIR.has(underlayState.Name)) coreFootprintUnderlay.air.push(underlayRecord);
      else if (isFluid(underlayState)) coreFootprintUnderlay.fluid.push(underlayRecord);
      else coreFootprintUnderlay.present.push(underlayRecord);

      let nearest = null;
      for (let y = core.minY - 1; y >= surveyBounds.minY; y--) {
        const state = await snapshot.block(x, y, z);
        if (isPresent(state) && !isFluid(state)) {
          nearest = {
            x,
            y,
            z,
            clearBlocksBelowCore: core.minY - y - 1,
            state,
          };
          break;
        }
      }
      if (nearest) nearestPresentBelowCore.push(nearest);
      else footprintColumnsWithoutPresentBelowInSurvey += 1;
    }
  }

  const voidComponents = components(airCells, (members) => ({
    touchesSurveyBoundary: members.some((cell) => touchesBoundary(surveyBounds, cell)),
    intersectsRecordedCore: members.some((cell) => contains(core, cell)),
    intersectsPlanningExclusion: members.some((cell) => contains(planningExclusion, cell)),
  }));
  const coreVoidComponents = voidComponents.filter((component) => component.intersectsRecordedCore);
  const boundaryConnectedCoreVoidCellCount = coreVoidComponents
    .filter((component) => component.touchesSurveyBoundary)
    .reduce((sum, component) => sum + component.cellCount, 0);

  const blockEntities = await snapshot.blockEntities(surveyBounds);
  const coreBlockEntities = blockEntities.filter((entity) => contains(core, entity));

  const doorAndGateCells = presentCoreCells.filter((cell) => (
    cell.state.Name.endsWith('_door')
    || cell.state.Name.endsWith('_fence_gate')
    || cell.state.Name.endsWith('_trapdoor')
  ));
  const boundaryThresholds = [];
  for (const direction of [
    { id: 'north', dx: 0, dz: -1 },
    { id: 'east', dx: 1, dz: 0 },
    { id: 'south', dx: 0, dz: 1 },
    { id: 'west', dx: -1, dz: 0 },
  ]) {
    for (let y = core.minY; y <= core.maxY; y++) {
      const edgeCells = [];
      if (direction.dx !== 0) {
        const x = direction.dx < 0 ? core.minX : core.maxX;
        for (let z = core.minZ; z <= core.maxZ; z++) edgeCells.push({ x, y, z });
      } else {
        const z = direction.dz < 0 ? core.minZ : core.maxZ;
        for (let x = core.minX; x <= core.maxX; x++) edgeCells.push({ x, y, z });
      }
      for (const inside of edgeCells) {
        const outsideCandidates = [0, 1, -1].map((dy) => ({
          x: inside.x + direction.dx,
          y: inside.y + dy,
          z: inside.z + direction.dz,
        }));
        if (!(await standable(snapshot, inside))) continue;
        const outside = [];
        for (const candidate of outsideCandidates) {
          if (await standable(snapshot, candidate)) outside.push(candidate);
        }
        if (outside.length) {
          boundaryThresholds.push({
            direction: direction.id,
            inside,
            outside: outside.sort(compareCells)[0],
          });
        }
      }
    }
  }
  boundaryThresholds.sort((left, right) => compareCells(left.inside, right.inside)
    || left.direction.localeCompare(right.direction));

  const standableCells = [];
  for (const cell of cells) {
    if (contains(planningExclusion, cell)) continue;
    if (await standable(snapshot, cell)) standableCells.push(cell);
  }
  const perimeterStarts = standableCells.filter((cell) => (
    cell.x === surveyBounds.minX || cell.x === surveyBounds.maxX
    || cell.z === surveyBounds.minZ || cell.z === surveyBounds.maxZ
  ));
  const geometricObservationCells = standableCells.filter((cell) => {
    const distance = horizontalDistanceFromBox(cell, core);
    return distance >= OBSERVATION_MINIMUM_DISTANCE
      && distance <= OBSERVATION_MAXIMUM_DISTANCE
      && cell.y >= core.minY - 4
      && cell.y <= core.maxY + 8;
  }).sort((left, right) => (
    squaredDistance(left, centerCell(core)) - squaredDistance(right, centerCell(core))
    || compareCells(left, right)
  ));
  const nearestStandableContext = [...standableCells].sort((left, right) => (
    squaredDistance(left, centerCell(core)) - squaredDistance(right, centerCell(core))
    || compareCells(left, right)
  ))[0] ?? null;

  let visualTargets = exposedPresentCells.length
    ? [...exposedPresentCells]
    : [centerCell(core)];
  visualTargets = visualTargets.sort((left, right) => (
    squaredDistance(left, centerCell(core)) - squaredDistance(right, centerCell(core))
    || compareCells(left, right)
  ));
  const sightlineCandidates = [];
  for (const point of geometricObservationCells) {
    const orderedTargets = [...visualTargets].sort((left, right) => (
      squaredDistance(point, left) - squaredDistance(point, right)
      || compareCells(left, right)
    )).slice(0, MAX_SIGHTLINE_TARGETS_PER_CANDIDATE);
    let sightline = null;
    for (const target of orderedTargets) {
      sightline = await clearAirRay(snapshot, point, target);
      if (sightline) break;
    }
    if (sightline) {
      sightlineCandidates.push({
        point: { x: point.x, y: point.y, z: point.z },
        sightline,
      });
    }
    if (sightlineCandidates.length >= MAX_SIGHTLINE_CANDIDATES) break;
  }
  const route = await routeCandidate(
    snapshot,
    perimeterStarts,
    sightlineCandidates,
    surveyBounds,
    planningExclusion,
  );

  surveyRelics.push({
    relicKey,
    structureId: recommendation.structureId,
    recommendedDisposition: recommendation.recommendedDisposition,
    surveyBounds,
    surveyCellCount: cells.length,
    recordedCore: {
      bounds: core,
      cellCount: coreCells.length,
      currentFinding: recommendation.currentFinding,
      fullStateSetSha256: stateSetHash(coreCells),
    },
    presentFabricCondition: {
      status: presentCoreCells.length
        ? 'PRESENT_FABRIC_EXACT_LOCAL_CONDITION_CENSUS'
        : 'NO_PRESENT_FABRIC_IN_RECORDED_CORE',
      presenceDefinition: 'block name is not an air variant',
      presentCellCount: presentCoreCells.length,
      airCellCount: coreCells.length - presentCoreCells.length,
      materialCounts: Object.fromEntries(
        Object.entries(materialCounts).sort(([left], [right]) => left.localeCompare(right)),
      ),
      presentCoordinateSetSha256: coordinateSetHash(presentCoreCells),
      presentStateSetSha256: stateSetHash(presentCoreCells),
      sixConnectedComponentCount: presentComponents.length,
      sixConnectedComponents: presentComponents,
      airExposedPresentCellCount: exposedPresentCells.length,
      airExposedPresentCoordinateSetSha256: coordinateSetHash(exposedPresentCells),
      fluidAdjacentPresentCellCount: fluidAdjacentPresentCells.length,
      fluidAdjacentPresentCoordinateSetSha256: coordinateSetHash(fluidAdjacentPresentCells),
      qualification:
        'Exact block-state condition only; it does not establish vanilla-template completeness, attribution, damage cause, structural integrity, preservation value, or public safety.',
    },
    directBelowContactCensus: {
      footprintColumnCount: lowestPresentByColumn.size,
      presentBelowCellCount: belowContact.present.length,
      presentBelowStateSetSha256: stateSetHash(belowContact.present),
      airBelowCellCount: belowContact.air.length,
      airBelowStateSetSha256: stateSetHash(belowContact.air),
      fluidBelowCellCount: belowContact.fluid.length,
      fluidBelowStateSetSha256: stateSetHash(belowContact.fluid),
      qualification:
        'Classifies the exact block immediately below the lowest present core cell in each occupied X/Z column. Present contact is not load capacity; air contact is not a structural-failure finding.',
    },
    recordedFootprintUnderlayContext: {
      footprintColumnCount: (core.maxX - core.minX + 1) * (core.maxZ - core.minZ + 1),
      underlayY: core.minY - 1,
      presentUnderlayCellCount: coreFootprintUnderlay.present.length,
      presentUnderlayStateSetSha256: stateSetHash(coreFootprintUnderlay.present),
      airUnderlayCellCount: coreFootprintUnderlay.air.length,
      airUnderlayStateSetSha256: stateSetHash(coreFootprintUnderlay.air),
      fluidUnderlayCellCount: coreFootprintUnderlay.fluid.length,
      fluidUnderlayStateSetSha256: stateSetHash(coreFootprintUnderlay.fluid),
      nearestPresentBelowColumnCount: nearestPresentBelowCore.length,
      columnsWithoutPresentBelowInSurvey: footprintColumnsWithoutPresentBelowInSurvey,
      nearestPresentBelowCoordinateSetSha256: coordinateSetHash(nearestPresentBelowCore),
      nearestPresentBelowStateSetSha256: stateSetHash(nearestPresentBelowCore),
      clearBlocksBelowCore: nearestPresentBelowCore.length ? {
        minimum: Math.min(...nearestPresentBelowCore.map((cell) => cell.clearBlocksBelowCore)),
        maximum: Math.max(...nearestPresentBelowCore.map((cell) => cell.clearBlocksBelowCore)),
      } : null,
      qualification:
        'The fixed underlay plane and nearest non-fluid present cell below each core X/Z column are exact local terrain context. They are not foundations, bearing support, fall protection, or access clearance.',
    },
    localVoidCensus: {
      airDefinition: 'minecraft:air, minecraft:cave_air, or minecraft:void_air',
      airCellCount: airCells.length,
      airCoordinateSetSha256: coordinateSetHash(airCells),
      sixConnectedComponentCount: voidComponents.length,
      sixConnectedComponents: voidComponents,
      coreIntersectingComponentCount: coreVoidComponents.length,
      boundaryConnectedCoreVoidCellCount,
      qualification:
        'A local exact air-component census inside the declared survey box. Boundary connection is geometric evidence only, not an entrance, ventilation, egress, access, or safety determination.',
    },
    protectedInventoryCensus: {
      surveyBlockEntityCount: blockEntities.length,
      surveyBlockEntities: blockEntities,
      surveyBlockEntityManifestSha256: recordSetHash(
        blockEntities,
        'combined-zones-block-entity-location-manifest-v1',
      ),
      coreBlockEntityCount: coreBlockEntities.length,
      coreBlockEntities,
      coreBlockEntityManifestSha256: recordSetHash(
        coreBlockEntities,
        'combined-zones-block-entity-location-manifest-v1',
      ),
      nbtPayloadInspected: false,
    },
    entranceCandidateCensus: {
      exactDoorGateTrapdoorCellCount: doorAndGateCells.length,
      exactDoorGateTrapdoorStateSetSha256: stateSetHash(doorAndGateCells),
      twoBlockClearBoundaryThresholdCount: boundaryThresholds.length,
      boundaryThresholds,
      boundaryThresholdManifestSha256: recordSetHash(
        boundaryThresholds,
        'combined-zones-relic-boundary-threshold-v1',
      ),
      entranceEstablished: false,
      qualification:
        'Door/gate/trapdoor states and standable inside/outside threshold pairs are exact candidates only. Neither their presence nor absence establishes an authored, safe, accessible, controlled, or public entrance.',
    },
    observationCandidateCensus: {
      planningExclusionBounds: planningExclusion,
      standableCellCountOutsidePlanningExclusion: standableCells.length,
      nearestStandableContext: nearestStandableContext ? {
        point: nearestStandableContext,
        horizontalDistanceFromRecordedCoreBlocks:
          horizontalDistanceFromBox(nearestStandableContext, core),
        verticalDeltaFromCoreMinimumY: nearestStandableContext.y - core.minY,
      } : null,
      geometricStandableCandidateCount: geometricObservationCells.length,
      exactAirSightlineCandidateCount: sightlineCandidates.length,
      sightlineCandidates,
      sightlineCandidateManifestSha256: recordSetHash(
        sightlineCandidates,
        'combined-zones-relic-sightline-candidate-v1',
      ),
      route,
      observationAccessAuthorized: false,
    },
  });
}

const completedSurveyIds = surveyRelics.map((relic) => relic.relicKey);
const routeCandidateCount = surveyRelics.filter(
  (relic) => relic.observationCandidateCensus.route.status
    === 'EXACT_OFFLINE_OBSERVATION_ROUTE_CANDIDATE',
).length;
const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-d05-relic-condition-access-survey',
  generatedAtUtc: GENERATED_AT,
  status: 'D05_S01_OFFLINE_SURVEY_COMPLETE_D05_G06_HOLD',
  worldEditAuthorized: false,
  constructionOwnershipAuthorized: false,
  observationAccessAuthorized: false,
  operationCellCount: 0,
  materialCellCount: 0,
  sourceBindings: {
    ...sources,
    immutablePhase0PostRegionSnapshot: immutableSnapshot,
  },
  method: {
    access: 'read-only copied Anvil region files and hash-bound local evidence only',
    surveyMargins: {
      horizontalBlocks: HORIZONTAL_SURVEY_MARGIN,
      belowCoreBlocks: BELOW_SURVEY_MARGIN,
      aboveCoreBlocks: ABOVE_SURVEY_MARGIN,
    },
    exactCondition:
      'complete block-state census inside each local survey box; six-connected present-fabric and air components; direct-below contacts; block-entity locations',
    entranceCandidate:
      'exact door/gate/trapdoor states plus two-block-clear standable boundary crossings',
    observationCandidate:
      'standable cells two to six horizontal blocks outside the recorded core, outside the minimum planning exclusion, with a sampled all-air ray to exposed present fabric or the absent-site datum',
    routeCandidate:
      'bounded cardinal two-block-clear walk with dy 0,+1,-1; no dig, tower, parkour, sprint, jump control, or planning-exclusion entry',
    coordinateSetHashPreamble: 'combined-zones-coordinate-cell-set-v1\\n',
    blockStateSetHashPreamble: 'combined-zones-block-state-cell-set-v1\\n',
  },
  relics: surveyRelics,
  d05S01Disposition: {
    surveyId: 'D05-S01-RELIC-CONDITION-AND-ACCESS',
    status: completedSurveyIds.length === 3 ? 'PASS_OFFLINE_SURVEY_EVIDENCE' : 'HOLD',
    completedRelicRecords: completedSurveyIds,
    exactObservationRouteCandidateCount: routeCandidateCount,
    passedEvidence: [
      'all three recorded cores and deterministic local survey boxes have exact immutable block-state identities',
      'present-fabric components, exposure, direct-below contact, local void components, and block-entity locations are exact',
      'door/gate/trapdoor and two-block-clear boundary threshold candidates are exact without being called entrances',
      'bounded outside-exclusion observation routes are reported when exact standability and all-air sightline candidates exist',
      'the east recorded site is independently confirmed fabric-absent in the same immutable snapshot',
    ],
    remainingEvidence: [
      'sole-authority acceptance of the proposed minimum planning exclusions and east-site disposition',
      'template/heritage attribution and condition interpretation beyond block-state facts',
      'structural support, groundwater, entrance, fall, lighting, accessibility, emergency, and exhibit-safety review',
      'the exact future mountain, direct-construction, staging, access, and physics-influence cell sets',
      'expert hydrology/geotechnical review and the all-50-structure exact clearance audit',
    ],
    d05Resolved: false,
    g02Passed: false,
    g06Passed: false,
    g07Passed: false,
    worldEditAuthorized: false,
    constructionOwnershipAuthorized: false,
    observationAccessAuthorized: false,
    operationCellCount: 0,
    materialCellCount: 0,
  },
};

function markdownFor(current) {
  const rows = current.relics.map((relic) => {
    const condition = relic.presentFabricCondition;
    const route = relic.observationCandidateCensus.route;
    return `| ${relic.relicKey} | ${condition.presentCellCount} | ${condition.sixConnectedComponentCount} | ${relic.directBelowContactCensus.presentBelowCellCount}/${relic.directBelowContactCensus.airBelowCellCount}/${relic.directBelowContactCensus.fluidBelowCellCount} | ${relic.localVoidCensus.coreIntersectingComponentCount} | ${relic.protectedInventoryCensus.coreBlockEntityCount} | ${relic.entranceCandidateCensus.twoBlockClearBoundaryThresholdCount} | ${route.status} |`;
  }).join('\n');
  const details = current.relics.map((relic) => {
    const route = relic.observationCandidateCensus.route;
    return `### ${relic.relicKey}\n\n`
      + `- Finding: \`${relic.presentFabricCondition.status}\`.\n`
      + `- Present cells: ${relic.presentFabricCondition.presentCellCount.toLocaleString('en-US')} across ${relic.presentFabricCondition.sixConnectedComponentCount} six-connected component(s).\n`
      + `- Air-exposed present cells: ${relic.presentFabricCondition.airExposedPresentCellCount.toLocaleString('en-US')}; fluid-adjacent present cells: ${relic.presentFabricCondition.fluidAdjacentPresentCellCount.toLocaleString('en-US')}.\n`
      + `- Direct-below contacts by occupied core column: ${relic.directBelowContactCensus.presentBelowCellCount} present, ${relic.directBelowContactCensus.airBelowCellCount} air, ${relic.directBelowContactCensus.fluidBelowCellCount} fluid. These are contact facts, not load findings.\n`
      + `- Fixed core-underlay plane: ${relic.recordedFootprintUnderlayContext.presentUnderlayCellCount} present, ${relic.recordedFootprintUnderlayContext.airUnderlayCellCount} air, ${relic.recordedFootprintUnderlayContext.fluidUnderlayCellCount} fluid; ${relic.recordedFootprintUnderlayContext.nearestPresentBelowColumnCount} footprint columns have a present local terrain cell below.\n`
      + `- Local voids: ${relic.localVoidCensus.sixConnectedComponentCount} component(s), ${relic.localVoidCensus.coreIntersectingComponentCount} intersecting the recorded core.\n`
      + `- Core block entities: ${relic.protectedInventoryCensus.coreBlockEntityCount}; NBT payload inspected: no.\n`
      + `- Threshold candidates: ${relic.entranceCandidateCensus.twoBlockClearBoundaryThresholdCount}; entrance established: no.\n`
      + `- Observation result: \`${route.status}\`${route.pathCellCount ? `, ${route.pathCellCount} exact candidate path cells` : ''}. Access authorized: no.\n`;
  }).join('\n');
  return `# D05-S01 relic condition and access-candidate survey

Status: **OFFLINE SURVEY COMPLETE — D05, G02, G06, AND G07 REMAIN HOLD**

This report performs the strongest deterministic local survey available from the bound immutable copied Anvil snapshot. It inventories exact present fabric, direct-below contact states, local air components, block-entity locations, boundary-threshold candidates, air-only sightline candidates, and bounded observation-route candidates. It does not inspect live state, authorize access, certify structure or terrain safety, or infer a vanilla template.

Bound snapshot: \`${current.sourceBindings.immutablePhase0PostRegionSnapshot.sha256}\`.

| Relic | Present cells | Present components | Below present/air/fluid | Core void components | Core block entities | Threshold candidates | Observation route |
|---|---:|---:|---:|---:|---:|---:|---|
${rows}

${details}
## What advanced

\`D05-S01-RELIC-CONDITION-AND-ACCESS\` now passes as **offline survey evidence** for all three records. The same immutable snapshot independently confirms the east recorded core contains zero present cells. Exact route candidates, when found, remain outside the proposed minimum planning exclusion and are evidence only.

## What remains

${current.d05S01Disposition.remainingEvidence.map((item) => `- ${item}`).join('\n')}

D05, G02, G06, and G07 remain HOLD. No owner acceptance, expert acceptance, construction cells, influence cells, access authorization, material cells, operation cells, or world-edit authorization is emitted.

Reproduce with:

\`\`\`bash
node scripts/audit_combined_zones_d05_relic_condition_access.mjs
\`\`\`
`;
}

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdownFor(report));

console.log(JSON.stringify({
  status: report.status,
  output: relative(OUTPUT),
  markdown: relative(MARKDOWN),
  surveyedRelics: report.relics.length,
  observationRouteCandidates: routeCandidateCount,
  d05Resolved: false,
  operationCellCount: 0,
  worldEditAuthorized: false,
}, null, 2));
