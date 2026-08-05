#!/usr/bin/env node
/**
 * Compile the exact, offline C1 civil coordination design for Masterplan 05.
 *
 * This is deliberately incapable of producing block operations or material
 * cells. It reads only local plan documents and an immutable copied Anvil
 * snapshot. It never connects to Minecraft, RCON, the fleet API, systemd, a
 * database, SSH, or any other live service.
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

const GENERATED_AT = value('--generated-at', '2026-08-04T16:22:57Z');
const MASTERPLAN = path.resolve(value('--masterplan', 'docs/masterplans/05-combined-zones/MASTERPLAN.md'));
const COORDINATES = path.resolve(value('--coordinates', 'docs/masterplans/05-combined-zones/site-coordinates.json'));
const TERRAIN_PROBE = path.resolve(value('--terrain-probe', 'docs/masterplans/05-combined-zones/corridor-terrain-probe.json'));
const PHASE0_EVIDENCE = path.resolve(value('--phase0-evidence', 'docs/masterplans/05-combined-zones/phase0-survey-evidence.json'));
const CLEARANCE = path.resolve(value('--clearance', 'docs/masterplans/05-combined-zones/corridor-clearance.json'));
const OUTPUT = path.resolve(value('--out', 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json'));
const MARKDOWN = path.resolve(value('--markdown', 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.md'));

const WORLD_MIN_Y = -64;
const WORLD_MAX_Y = 319;
const HIGHWAY_MIN_VERTICAL_RUN = 12;
const RAIL_MIN_VERTICAL_RUN = 8;
const C1_DD_CROSSROAD_X = 1180;

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
  return { path: relative(filename), sha256: sha256(data), bytes: data.length, role };
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
    if (!buffer) return null;
    const index = ((cx & 31) + (cz & 31) * 32) * 4;
    const sectorOffset = buffer.readUIntBE(index, 3);
    const sectorCount = buffer[index + 3];
    if (!sectorOffset || !sectorCount) return null;
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

const AIR = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
  'minecraft:light',
  'minecraft:structure_void',
  'minecraft:moving_piston',
]);
const WATER = new Set(['minecraft:water', 'minecraft:bubble_column']);

function isOrganicSurfaceFeature(name) {
  return /(_leaves|_log|_wood|_stem|_hyphae|_sapling|_mushroom_block)$/.test(name)
    || /^minecraft:(mangrove_roots|muddy_mangrove_roots|bamboo|vine|cocoa|short_grass|tall_grass|fern|large_fern|dead_bush|lily_pad|leaf_litter|seagrass|tall_seagrass|kelp|kelp_plant|sea_pickle|moss_carpet|pale_moss_carpet|pale_hanging_moss|pink_petals|wildflowers|brown_mushroom|red_mushroom)$/.test(name)
    || /(_flower|_tulip|mushroom|dandelion|poppy|allium|azure_bluet|orchid|peony|sunflower|lilac|rose_bush|cornflower|lily_of_the_valley)$/.test(name);
}

function round6(value) {
  return Math.round(value * 1e6) / 1e6;
}

function pointKey(point) {
  return `${point.x},${point.z}`;
}

function cellSetHash(cells, preamble) {
  const digest = crypto.createHash('sha256');
  digest.update(`${preamble}\n`);
  const ordered = [...cells].sort((left, right) => left.x - right.x
    || (left.y ?? -1000) - (right.y ?? -1000)
    || left.z - right.z);
  for (const cell of ordered) {
    digest.update(cell.y === undefined ? `${cell.x},${cell.z}\n` : `${cell.x},${cell.y},${cell.z}\n`);
  }
  return digest.digest('hex');
}

function rasterLine(start, end) {
  let x = start.x;
  let z = start.z;
  const dx = Math.abs(end.x - x);
  const dz = Math.abs(end.z - z);
  const sx = x < end.x ? 1 : -1;
  const sz = z < end.z ? 1 : -1;
  let error = dx - dz;
  const points = [];
  while (true) {
    points.push({ x, z });
    if (x === end.x && z === end.z) break;
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

function appendPath(target, points) {
  for (const point of points) {
    if (!target.length || pointKey(target.at(-1)) !== pointKey(point)) target.push(point);
  }
}

function turnNormal(direction, turn) {
  return turn > 0 ? { x: -direction.z, z: direction.x } : { x: direction.z, z: -direction.x };
}

function fillet(previous, pi, next, radius, id) {
  const incomingLength = Math.hypot(pi.x - previous.x, pi.z - previous.z);
  const outgoingLength = Math.hypot(next.x - pi.x, next.z - pi.z);
  const incoming = { x: (pi.x - previous.x) / incomingLength, z: (pi.z - previous.z) / incomingLength };
  const outgoing = { x: (next.x - pi.x) / outgoingLength, z: (next.z - pi.z) / outgoingLength };
  const dot = Math.max(-1, Math.min(1, incoming.x * outgoing.x + incoming.z * outgoing.z));
  const deflection = Math.acos(dot);
  const turn = Math.sign(incoming.x * outgoing.z - incoming.z * outgoing.x);
  assert(turn !== 0, `${id} is not a turn`);
  const tangentLength = radius * Math.tan(deflection / 2);
  assert(tangentLength < incomingLength && tangentLength < outgoingLength, `${id} fillet exceeds tangent`);
  const tangentIn = { x: pi.x - incoming.x * tangentLength, z: pi.z - incoming.z * tangentLength };
  const tangentOut = { x: pi.x + outgoing.x * tangentLength, z: pi.z + outgoing.z * tangentLength };
  const normal = turnNormal(incoming, turn);
  const center = { x: tangentIn.x + normal.x * radius, z: tangentIn.z + normal.z * radius };
  const startAngle = Math.atan2(tangentIn.z - center.z, tangentIn.x - center.x);
  let endAngle = Math.atan2(tangentOut.z - center.z, tangentOut.x - center.x);
  if (turn > 0 && endAngle <= startAngle) endAngle += Math.PI * 2;
  if (turn < 0 && endAngle >= startAngle) endAngle -= Math.PI * 2;
  const sampleCount = Math.max(64, Math.ceil(radius * Math.abs(endAngle - startAngle) * 8));
  const raster = [];
  const rasterDirectionX = Math.sign(tangentOut.x - tangentIn.x);
  const rasterDirectionZ = Math.sign(tangentOut.z - tangentIn.z);
  for (let index = 0; index <= sampleCount; index++) {
    const angle = startAngle + (endAngle - startAngle) * (index / sampleCount);
    const rounded = {
      x: Math.round(center.x + radius * Math.cos(angle)),
      z: Math.round(center.z + radius * Math.sin(angle)),
    };
    if (!raster.length) raster.push(rounded);
    else if ((rounded.x - raster.at(-1).x) * rasterDirectionX >= 0
      && (rounded.z - raster.at(-1).z) * rasterDirectionZ >= 0) {
      appendPath(raster, rasterLine(raster.at(-1), rounded));
    }
  }
  const steps = [];
  for (let index = 1; index < raster.length; index++) {
    const vector = `${raster[index].x - raster[index - 1].x},${raster[index].z - raster[index - 1].z}`;
    if (steps.at(-1)?.vector === vector) steps.at(-1).run++;
    else steps.push({ vector, run: 1 });
  }
  return {
    id,
    radiusBlocks: radius,
    turn: turn > 0 ? 'left' : 'right',
    deflectionDegrees: round6(deflection * 180 / Math.PI),
    tangentLengthBlocks: round6(tangentLength),
    tangentInExact: { x: round6(tangentIn.x), z: round6(tangentIn.z) },
    tangentOutExact: { x: round6(tangentOut.x), z: round6(tangentOut.z) },
    centerExact: { x: round6(center.x), z: round6(center.z) },
    rasterStart: raster[0],
    rasterEnd: raster.at(-1),
    rasterPointCount: raster.length,
    rasterColumnSetSha256: cellSetHash(raster, 'combined-zones-c1-curve-raster-v1'),
    rasterStepRuns: steps,
    raster,
  };
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
      const key = pointKey(point);
      if (!columns.has(key)) columns.set(key, { ...point, station, offset });
    }
  }
  return [...columns.values()];
}

function interpolateSamples(samples, distance, valueKey) {
  if (distance <= samples[0].distanceAlongCenterline) return samples[0][valueKey];
  if (distance >= samples.at(-1).distanceAlongCenterline) return samples.at(-1)[valueKey];
  let rightIndex = 1;
  while (samples[rightIndex].distanceAlongCenterline < distance) rightIndex++;
  const left = samples[rightIndex - 1];
  const right = samples[rightIndex];
  const fraction = (distance - left.distanceAlongCenterline)
    / (right.distanceAlongCenterline - left.distanceAlongCenterline);
  return left[valueKey] + (right[valueKey] - left[valueKey]) * fraction;
}

function constrainedProfile(targets, startY, endY, minimumRun, minY, maxY) {
  const cooldownMax = minimumRun - 1;
  const encode = (y, cooldown) => (y - minY) * minimumRun + cooldown;
  const decode = (key) => ({ y: Math.floor(key / minimumRun) + minY, cooldown: key % minimumRun });
  let costs = new Map([[encode(startY, 0), (startY - targets[0]) ** 2]]);
  const backs = [new Map()];
  for (let index = 1; index < targets.length; index++) {
    const next = new Map();
    const back = new Map();
    for (const [key, cost] of costs) {
      const state = decode(key);
      const candidates = [{ y: state.y, cooldown: Math.min(cooldownMax, state.cooldown + 1) }];
      if (state.cooldown === cooldownMax) {
        if (state.y > minY) candidates.push({ y: state.y - 1, cooldown: 0 });
        if (state.y < maxY) candidates.push({ y: state.y + 1, cooldown: 0 });
      }
      for (const candidate of candidates) {
        if (index === targets.length - 1 && candidate.y !== endY) continue;
        const candidateKey = encode(candidate.y, candidate.cooldown);
        const candidateCost = cost + (candidate.y - targets[index]) ** 2;
        const oldCost = next.get(candidateKey);
        const oldBack = back.get(candidateKey);
        if (oldCost === undefined || candidateCost < oldCost
          || (candidateCost === oldCost && key < oldBack)) {
          next.set(candidateKey, candidateCost);
          back.set(candidateKey, key);
        }
      }
    }
    assert(next.size, `no feasible constrained profile at station ${index}`);
    costs = next;
    backs.push(back);
  }
  const endCandidates = [...costs].sort((left, right) => left[1] - right[1] || left[0] - right[0]);
  let key = endCandidates[0][0];
  const profile = new Array(targets.length);
  for (let index = targets.length - 1; index >= 0; index--) {
    profile[index] = decode(key).y;
    if (index > 0) key = backs[index].get(key);
  }
  return { profile, objectiveSquaredError: endCandidates[0][1] };
}

function verticalProfileAudit(points, profile) {
  const changes = [];
  let distance = 0;
  let lastChangeDistance = null;
  let minimumRunBetweenChanges = null;
  let maximumStepGrade = 0;
  for (let index = 1; index < points.length; index++) {
    distance += Math.hypot(points[index].x - points[index - 1].x, points[index].z - points[index - 1].z);
    if (profile[index] !== profile[index - 1]) {
      const run = lastChangeDistance === null ? distance : distance - lastChangeDistance;
      minimumRunBetweenChanges = minimumRunBetweenChanges === null ? run : Math.min(minimumRunBetweenChanges, run);
      maximumStepGrade = Math.max(maximumStepGrade, 1 / run);
      changes.push({ station: index, x: points[index].x, z: points[index].z, fromY: profile[index - 1], toY: profile[index], runSincePreviousChange: round6(run) });
      lastChangeDistance = distance;
    }
  }
  return {
    changeCount: changes.length,
    minimumRunBetweenChanges: round6(minimumRunBetweenChanges ?? 0),
    maximumStepGrade: round6(maximumStepGrade),
    minimumY: Math.min(...profile),
    maximumY: Math.max(...profile),
    changes,
  };
}

function boundsOf(cells) {
  return {
    minX: Math.min(...cells.map((cell) => cell.x)),
    maxX: Math.max(...cells.map((cell) => cell.x)),
    minZ: Math.min(...cells.map((cell) => cell.z)),
    maxZ: Math.max(...cells.map((cell) => cell.z)),
  };
}

function summarizeColumns(cells, preamble) {
  return {
    offsetFrom: Math.min(...cells.map((cell) => cell.offset)),
    offsetTo: Math.max(...cells.map((cell) => cell.offset)),
    bounds: boundsOf(cells),
    uniqueColumnCount: cells.length,
    columnSetSha256: cellSetHash(cells, preamble),
    generationRule: 'At each ordered reference station, round the unit left-normal times signed offset independently in X and Z; first station owns duplicate columns.',
  };
}

function crossfallAdjustment(offset) {
  if (offset <= -5) return 1;
  if (offset <= 5) return 0;
  return -1;
}

function treatmentFor({ water, cut, fill }) {
  if (water) return 'BRIDGE_OR_CULVERT_HYDRAULIC_HOLD';
  if (cut >= 13) return 'TUNNEL_CONCEPT_GEOTECH_HOLD';
  if (cut >= 5) return 'RETAINED_CUT_CONCEPT_GEOTECH_HOLD';
  if (fill >= 8) return 'BRIDGE_OR_RETAINED_EMBANKMENT_GEOTECH_HOLD';
  if (fill >= 3) return 'EMBANKMENT_CONCEPT_GEOTECH_HOLD';
  return 'AT_GRADE_COORDINATION_PASS';
}

function contiguousRuns(records, key) {
  const runs = [];
  for (const record of records) {
    if (!runs.length || runs.at(-1).treatment !== record[key]) {
      runs.push({
        treatment: record[key],
        startStation: record.station,
        endStation: record.station,
        start: { x: record.x, z: record.z },
        end: { x: record.x, z: record.z },
        stationCount: 1,
      });
    } else {
      const run = runs.at(-1);
      run.endStation = record.station;
      run.end = { x: record.x, z: record.z };
      run.stationCount++;
    }
  }
  return runs;
}

function planGap(cells, extent) {
  let minimum = Infinity;
  for (const cell of cells) {
    const dx = cell.x < extent.minX ? extent.minX - cell.x : cell.x > extent.maxX ? cell.x - extent.maxX : 0;
    const dz = cell.z < extent.minZ ? extent.minZ - cell.z : cell.z > extent.maxZ ? cell.z - extent.maxZ : 0;
    minimum = Math.min(minimum, Math.max(dx, dz));
  }
  return minimum;
}

const masterplanText = fs.readFileSync(MASTERPLAN, 'utf8');
const coordinates = readJson(COORDINATES);
const probe = readJson(TERRAIN_PROBE);
const phase0 = readJson(PHASE0_EVIDENCE);
const clearance = readJson(CLEARANCE);

assert(masterplanText.includes('### C1 East Corridor'), 'Masterplan 05 has no C1 East Corridor section');
const c1 = coordinates.connections.find((connection) => connection.id === 'C1');
assert(c1, 'site-coordinates.json has no C1 record');
assert(c1.crossSection.reservationBlocks === 56, 'C1 reservation is not 56 blocks');
assert(c1.crossSection.totalLandTakeBlocks === 80, 'C1 total land take is not 80 blocks');
assert(c1.crossSection.railFlank === 'north', 'C1 rail flank is not north');
assert(c1.pointsOfIntersection.length === 5, 'C1 must have five authored points of intersection');
assert(probe.engineeredRailProfile.status === 'PASS_ONE_IN_EIGHT', 'source rail profile did not pass 1:8');

const authored = c1.pointsOfIntersection.map(({ id, x, z }) => ({ id, x, z }));
const curveRadii = c1.pointsOfIntersection.slice(1, -1).map((point) => point.curveRadiusBlocks);
const curves = authored.slice(1, -1).map((pi, index) => fillet(authored[index], pi, authored[index + 2], curveRadii[index], pi.id));
const centerline = [];
appendPath(centerline, rasterLine(authored[0], curves[0].rasterStart));
appendPath(centerline, curves[0].raster);
appendPath(centerline, rasterLine(curves[0].rasterEnd, curves[1].rasterStart));
appendPath(centerline, curves[1].raster);
appendPath(centerline, rasterLine(curves[1].rasterEnd, curves[2].rasterStart));
appendPath(centerline, curves[2].raster);
appendPath(centerline, rasterLine(curves[2].rasterEnd, authored.at(-1)));

assert(pointKey(centerline[0]) === '430,80', 'C1 raster does not start at W-TERM');
assert(pointKey(centerline.at(-1)) === '1550,-250', 'C1 raster does not end at E-TERM');
for (let index = 1; index < centerline.length; index++) {
  assert(Math.abs(centerline[index].x - centerline[index - 1].x) <= 1, `non-contiguous X step at ${index}`);
  assert(Math.abs(centerline[index].z - centerline[index - 1].z) <= 1, `non-contiguous Z step at ${index}`);
}

const cumulativeDistance = [0];
for (let index = 1; index < centerline.length; index++) {
  cumulativeDistance.push(cumulativeDistance.at(-1) + Math.hypot(
    centerline[index].x - centerline[index - 1].x,
    centerline[index].z - centerline[index - 1].z,
  ));
}
const designLength = cumulativeDistance.at(-1);
const authoredPolylineLength = authored.slice(1).reduce((sum, point, index) => (
  sum + Math.hypot(point.x - authored[index].x, point.z - authored[index].z)
), 0);
const continuousFilletLength = authoredPolylineLength
  - 2 * curves.reduce((sum, curve) => sum + curve.tangentLengthBlocks, 0)
  + curves.reduce((sum, curve) => sum + curve.radiusBlocks * curve.deflectionDegrees * Math.PI / 180, 0);
const sourceProfileSamples = probe.engineeredRailProfile.profile;
const sourceLength = sourceProfileSamples.at(-1).distanceAlongCenterline;

const snapshotDirectory = path.resolve(phase0.snapshots.postGeneration.path);
const snapshot = snapshotIdentity(snapshotDirectory);
assert(snapshot.sha256 === phase0.snapshots.postGeneration.sha256, 'Phase 0 post snapshot SHA-256 drift');
assert(snapshot.regionFileCount === phase0.snapshots.postGeneration.regionFileCount, 'Phase 0 post snapshot file-count drift');
assert(snapshot.bytes === phase0.snapshots.postGeneration.bytes, 'Phase 0 post snapshot byte-count drift');
const reader = new SnapshotReader(snapshotDirectory);

const terrainCache = new Map();
async function terrainAt(x, z) {
  const key = `${x},${z}`;
  if (terrainCache.has(key)) return terrainCache.get(key);
  const chunk = await reader.readChunk(Math.floor(x / 16), Math.floor(z / 16));
  assert(chunk, `missing immutable snapshot chunk for ${x},${z}`);
  let surfaceWater = false;
  let surfaceLava = false;
  for (let y = WORLD_MAX_Y; y >= WORLD_MIN_Y; y--) {
    const name = reader.stateAt(chunk, x, y, z).Name ?? 'minecraft:air';
    if (AIR.has(name)) continue;
    if (WATER.has(name)) {
      surfaceWater = true;
      continue;
    }
    if (name === 'minecraft:lava') {
      surfaceLava = true;
      continue;
    }
    if (isOrganicSurfaceFeature(name)) continue;
    const result = { terrainY: y, surfaceWater, surfaceLava, terrainBlock: name };
    terrainCache.set(key, result);
    return result;
  }
  throw new Error(`no terrain in immutable snapshot at ${x},${z}`);
}

const referenceTerrain = [];
for (const point of centerline) referenceTerrain.push(await terrainAt(point.x, point.z));

const railTargets = cumulativeDistance.map((distance) => interpolateSamples(
  sourceProfileSamples,
  distance / designLength * sourceLength,
  'proposedRailY',
));
const highwayTargets = referenceTerrain.map((terrain) => terrain.terrainY);
const railSolution = constrainedProfile(railTargets, 68, 68, RAIL_MIN_VERTICAL_RUN, 50, 130);
const highwaySolution = constrainedProfile(highwayTargets, 68, 68, HIGHWAY_MIN_VERTICAL_RUN, 50, 130);
const railAudit = verticalProfileAudit(centerline, railSolution.profile);
const highwayAudit = verticalProfileAudit(centerline, highwaySolution.profile);
assert(railAudit.maximumStepGrade <= 1 / RAIL_MIN_VERTICAL_RUN + 1e-6, 'rail profile exceeds 1:8');
assert(highwayAudit.maximumStepGrade <= 1 / HIGHWAY_MIN_VERTICAL_RUN + 1e-6, 'highway profile exceeds 1:12');
assert(railSolution.profile.some((y, index) => y !== highwaySolution.profile[index]), 'highway profile is not independent of rail profile');

const landTakeColumns = canonicalOffsetColumns(centerline, -48, 31);
const reservationColumns = canonicalOffsetColumns(centerline, -36, 19);
const railStripColumns = canonicalOffsetColumns(centerline, -30, -18);
const track1Columns = canonicalOffsetColumns(centerline, -28, -28);
const track2Columns = canonicalOffsetColumns(centerline, -24, -24);
const highwayColumns = canonicalOffsetColumns(centerline, -14, 14);
const northCessColumns = canonicalOffsetColumns(centerline, -30, -29);
const southDrainColumns = canonicalOffsetColumns(centerline, 18, 19);

const earthwork = {
  highway: { cutColumnBlocks: 0, fillColumnBlocks: 0, balanceFillMinusCut: 0, maximumCut: 0, maximumFill: 0, surfaceWaterColumns: 0, surfaceLavaColumns: 0 },
  railStrip: { cutColumnBlocks: 0, fillColumnBlocks: 0, balanceFillMinusCut: 0, maximumCut: 0, maximumFill: 0, surfaceWaterColumns: 0, surfaceLavaColumns: 0 },
  totalLandTakeDatum: { cutColumnBlocks: 0, fillColumnBlocks: 0, balanceFillMinusCut: 0, maximumCut: 0, maximumFill: 0, surfaceWaterColumns: 0, surfaceLavaColumns: 0 },
};

async function accumulateEarthwork(columns, summary, datumFor) {
  for (const column of columns) {
    const terrain = await terrainAt(column.x, column.z);
    const datumY = datumFor(column);
    const cut = Math.max(0, terrain.terrainY - datumY);
    const fill = Math.max(0, datumY - terrain.terrainY);
    summary.cutColumnBlocks += cut;
    summary.fillColumnBlocks += fill;
    summary.maximumCut = Math.max(summary.maximumCut, cut);
    summary.maximumFill = Math.max(summary.maximumFill, fill);
    if (terrain.surfaceWater) summary.surfaceWaterColumns++;
    if (terrain.surfaceLava) summary.surfaceLavaColumns++;
  }
  summary.balanceFillMinusCut = summary.fillColumnBlocks - summary.cutColumnBlocks;
}

await accumulateEarthwork(highwayColumns, earthwork.highway, (column) => (
  highwaySolution.profile[column.station] + crossfallAdjustment(column.offset)
));
await accumulateEarthwork(railStripColumns, earthwork.railStrip, (column) => railSolution.profile[column.station]);
await accumulateEarthwork(landTakeColumns, earthwork.totalLandTakeDatum, (column) => (
  column.offset <= -18 ? railSolution.profile[column.station] : highwaySolution.profile[column.station]
));

const stationRecords = centerline.map((point, station) => {
  const terrain = referenceTerrain[station];
  const lowestDatum = Math.min(railSolution.profile[station], highwaySolution.profile[station] - 1);
  const cut = Math.max(0, terrain.terrainY - lowestDatum);
  const fill = Math.max(0, lowestDatum - terrain.terrainY);
  return {
    station,
    chainageBlocks: round6(cumulativeDistance[station]),
    x: point.x,
    z: point.z,
    terrainY: terrain.terrainY,
    surfaceWater: terrain.surfaceWater,
    surfaceLava: terrain.surfaceLava,
    railFormationY: railSolution.profile[station],
    highwayReferenceY: highwaySolution.profile[station],
    highwayNorthEdgeY: highwaySolution.profile[station] + 1,
    highwaySouthEdgeY: highwaySolution.profile[station] - 1,
    treatment: treatmentFor({ water: terrain.surfaceWater || terrain.surfaceLava, cut, fill }),
  };
});

const railCenterlines = {
  track1Eastbound: centerline.map((point, station) => ({
    ...offsetPoint(point, tangentAt(centerline, station), -28),
    y: railSolution.profile[station],
    station,
  })),
  track2Westbound: centerline.map((point, station) => ({
    ...offsetPoint(point, tangentAt(centerline, station), -24),
    y: railSolution.profile[station],
    station,
  })),
};

const treatmentRuns = contiguousRuns(stationRecords, 'treatment');
const treatmentStationCounts = {};
for (const station of stationRecords) treatmentStationCounts[station.treatment] = (treatmentStationCounts[station.treatment] ?? 0) + 1;

const c01Features = clearance.results.findings.filter((finding) => finding.feature.startsWith('C01 '));
const c01Interfaces = c01Features.map((finding) => {
  const overlaps = landTakeColumns.filter((column) => column.x >= finding.extent.minX
    && column.x <= finding.extent.maxX
    && column.z >= finding.extent.minZ
    && column.z <= finding.extent.maxZ);
  const datums = overlaps.map((column) => ({
    x: column.x,
    z: column.z,
    y: column.offset <= -18 ? railSolution.profile[column.station] : highwaySolution.profile[column.station],
  }));
  const minimumDatum = datums.length ? datums.reduce((left, right) => right.y < left.y ? right : left) : null;
  return {
    feature: finding.feature,
    layer: finding.layer,
    featureBaseY: finding.featureBaseY,
    featureTopY: finding.featureTopY,
    extent: finding.extent,
    exactLandTakePlanGapBlocksChebyshev: planGap(landTakeColumns, finding.extent),
    exactLandTakeOverlapColumnCount: overlaps.length,
    minimumCorridorSurfaceDatumAtOverlap: minimumDatum,
    minimumSurfaceDatumSeparationAboveFeatureTop: minimumDatum ? minimumDatum.y - finding.featureTopY : null,
    threeDimensionalSurfaceDatumCollision: minimumDatum ? minimumDatum.y <= finding.featureTopY : false,
    ownershipStatus: 'HOLD_CONTESTED_ISSUE_002',
    structuralLoadingAcceptance: false,
    interpretation: datums.length
      ? 'Plan overlap evaluated against the lowest exact road/rail surface datum. This is not excavation depth, cover capacity, or loading approval.'
      : 'No total-land-take plan overlap; the exact Chebyshev plan gap is reported.',
  };
});

const ddStation = stationRecords.reduce((best, station) => (
  Math.abs(station.x - C1_DD_CROSSROAD_X) < Math.abs(best.x - C1_DD_CROSSROAD_X) ? station : best
));
const ddTangent = tangentAt(centerline, ddStation.station);
const ddRailNorth = offsetPoint(centerline[ddStation.station], ddTangent, -30);
const ddRailSouth = offsetPoint(centerline[ddStation.station], ddTangent, -18);
const ddInterface = {
  id: 'C1A_DATA_DISTRICT_CROSSROAD_BRIDGE',
  authoredCrossroadX: C1_DD_CROSSROAD_X,
  nearestReferenceStation: ddStation.station,
  nearestReferencePoint: { x: ddStation.x, z: ddStation.z, highwayReferenceY: ddStation.highwayReferenceY, railFormationY: ddStation.railFormationY },
  emptyRailStripSpanEndpoints: { north: ddRailNorth, south: ddRailSouth },
  railStripWidthOffsetsInclusive: 13,
  pierOrMaterialCellsInsideRailStrip: [],
  requiredClearanceRule: 'Any future cross-corridor structure must clear-span the complete offsets -30..-18 rail strip with no pier, abutment, utility, drainage, or temporary works inside it.',
  status: 'COORDINATION_ENVELOPE_PASS_STRUCTURAL_DESIGN_HOLD',
};

const sourceBindings = [
  fileBinding(MASTERPLAN, 'current-world plan and D02 requirements'),
  fileBinding(COORDINATES, 'authored C1 PIs, radii, cross-section, and interfaces'),
  fileBinding(TERRAIN_PROBE, 'accepted terrain samples and rail-profile control targets'),
  fileBinding(PHASE0_EVIDENCE, 'immutable copied-world evidence identity'),
  fileBinding(CLEARANCE, 'catalog C01 bounds and truth boundary'),
];

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-c1-civil-design',
  generatedAtUtc: GENERATED_AT,
  status: 'PARTIAL_PASS_D02_HOLD',
  purpose: 'Exact, reproducible, coordinate-only C1 civil coordination design. No construction authorization.',
  offlineSafetyBoundary: {
    localInputsOnly: true,
    immutableCopiedAnvilOnly: true,
    liveCallsPerformed: [],
    operationCells: [],
    materialCells: [],
    worldEditAuthorized: false,
    physicalBuildAuthorized: false,
  },
  sourceBindings,
  immutableSnapshot: snapshot,
  horizontalAlignment: {
    authoredPointsOfIntersection: authored,
    method: 'Exact-radius tangent circular fillets sampled densely, integer-rounded, and joined by deterministic 8-connected Bresenham raster lines.',
    authoredCurveStaircaseIntent: c1.curveTreatment.chamfer,
    curveIntentDisposition: 'The authored ratio sequence remains a visual detailing control. The exact-radius raster and each run vector are frozen here; final visual-pattern acceptance remains part of D02 HOLD.',
    curves: curves.map(({ raster, ...curve }) => curve),
    referencePointCount: centerline.length,
    referenceRasterTraversalLengthBlocks: round6(designLength),
    continuousFilletLengthBlocks: round6(continuousFilletLength),
    authoredPolylineLengthBlocks: c1.planLengthBlocks,
    referenceCenterlineColumnSetSha256: cellSetHash(centerline, 'combined-zones-c1-reference-centerline-v1'),
    endpoints: { start: centerline[0], end: centerline.at(-1) },
    stations: stationRecords,
  },
  verticalProfiles: {
    rail: {
      status: 'EXACT_COORDINATION_PASS_D04_EMPTY_RESERVATION',
      method: 'A deterministic integer dynamic program follows the accepted Phase 0 rail profile after normalized-chainage interpolation, fixes both terminals at Y68, and permits one Y step only after at least eight raster edges.',
      targetSource: relative(TERRAIN_PROBE),
      startY: railSolution.profile[0],
      endY: railSolution.profile.at(-1),
      objectiveSquaredError: round6(railSolution.objectiveSquaredError),
      ...railAudit,
      profileSha256: sha256(`${railSolution.profile.join(',')}\n`),
    },
    highway: {
      status: 'EXACT_INDEPENDENT_COORDINATION_PASS',
      method: 'An independent deterministic integer dynamic program minimizes squared deviation from immutable centerline terrain, fixes both terminals at Y68, and permits one Y step only after at least twelve raster edges.',
      independentFromRail: true,
      startY: highwaySolution.profile[0],
      endY: highwaySolution.profile.at(-1),
      objectiveSquaredError: round6(highwaySolution.objectiveSquaredError),
      ...highwayAudit,
      profileSha256: sha256(`${highwaySolution.profile.join(',')}\n`),
    },
  },
  crossSection: {
    reservation: summarizeColumns(reservationColumns, 'combined-zones-c1-reservation-columns-v1'),
    totalLandTake: summarizeColumns(landTakeColumns, 'combined-zones-c1-total-land-take-columns-v1'),
    reservedRailStrip: {
      ...summarizeColumns(railStripColumns, 'combined-zones-c1-reserved-rail-strip-columns-v1'),
      widthOffsetsInclusive: 13,
      staging: 'EMPTY_RESERVE_FIRST',
      materialCells: [],
    },
    track1Eastbound: {
      offset: -28,
      pointCount: railCenterlines.track1Eastbound.length,
      setoutSha256: cellSetHash(railCenterlines.track1Eastbound, 'combined-zones-c1-track1-setout-v1'),
      points: railCenterlines.track1Eastbound,
    },
    track2Westbound: {
      offset: -24,
      pointCount: railCenterlines.track2Westbound.length,
      setoutSha256: cellSetHash(railCenterlines.track2Westbound, 'combined-zones-c1-track2-setout-v1'),
      points: railCenterlines.track2Westbound,
    },
    highway: {
      offsetsInclusive: [-14, 14],
      columns: summarizeColumns(highwayColumns, 'combined-zones-c1-highway-columns-v1'),
      singleSouthwardCrossfall: [
        { offsetsInclusive: [-14, -5], adjustmentFromReferenceY: 1 },
        { offsetsInclusive: [-4, 5], adjustmentFromReferenceY: 0 },
        { offsetsInclusive: [6, 14], adjustmentFromReferenceY: -1 },
      ],
    },
  },
  civilTreatment: {
    rule: 'At reference stations: water/lava => bridge-or-culvert hydraulic HOLD; cut >=13 => tunnel concept HOLD; cut 5..12 => retained-cut concept HOLD; fill >=8 => bridge/retained-embankment concept HOLD; fill 3..7 => embankment concept HOLD; otherwise at-grade coordination PASS.',
    treatmentStationCounts,
    contiguousRuns: treatmentRuns,
    interpretation: 'These are exact coordination zones selected from immutable surface evidence. They are not structural typologies, foundation designs, excavation limits, or operation cells.',
  },
  diagnosticEarthworkVolumes: {
    method: 'One-block-column prismatic difference from immutable terrain top to the stated surface datum, after deterministic duplicate-column ownership. Pavement thickness, side slopes, structures, voids, bulking, topsoil, and unsuitable material are excluded.',
    units: 'block-column cubic blocks (coordination estimate only)',
    ...earthwork,
  },
  drainage: {
    status: 'COLLECTION_GEOMETRY_PASS_OUTFALL_HOLD',
    roadCollection: { offsetsInclusive: [18, 19], ...summarizeColumns(southDrainColumns, 'combined-zones-c1-south-drain-columns-v1') },
    railCollection: { offsetsInclusive: [-30, -29], ...summarizeColumns(northCessColumns, 'combined-zones-c1-north-cess-columns-v1') },
    crossfall: 'Highway drains south through the exact +1/0/-1 elevation bands; rail drains independently north.',
    approvedOutfalls: [],
    blocker: 'No catchment model, design storm, capacity proof, watercourse consent, or approved discharge point exists in the bound evidence.',
  },
  interfaces: {
    c01: c01Interfaces,
    dataDistrictCrossroad: ddInterface,
  },
  decisionD02: {
    status: 'PARTIAL_PASS_HOLD',
    resolutionBoundary: {
      scope: 'PRE_R00_DESIGN_AND_EXTERNAL_ACCEPTANCE_ONLY',
      worldEditAuthorized: false,
      requiresPhysicalPilot: false,
      requiresForwardRollbackOperations: false,
      requiresPostStateQa: false,
    },
    subsequentReleaseValidation: {
      releaseId: 'CZ-R01-PHASE1-BOUNDED-VISUAL-PILOT',
      prerequisiteReleaseId: 'CZ-R00-PHASE1-DESIGN-FREEZE',
      requiredBeforeReleaseId: 'CZ-R02-PHASE2-EMPTY-EIGHT-DEEP-SHELL',
      validationRole: 'POST_R00_VALIDATION_NOT_D02_OR_G02_CLOSURE_EVIDENCE',
    },
    passed: [
      'Exact integer horizontal reference setout and three exact-radius curve rasters are hash-bound.',
      'Independent exact highway and rail profiles are frozen and grade-audited.',
      'The complete 56-block reservation, 80-block land take, 29-block highway, and empty 13-block rail strip are reproducible and hash-bound.',
      'Surface-derived treatment zones and diagnostic volume summaries are reproducible from the immutable snapshot.',
      'Every catalogued C01/owner-tunnel interface has an exact plan-gap or overlap and surface-datum separation result.',
      'The Data District crossroad coordination envelope explicitly preserves a pier-free 13-block rail strip.',
    ],
    blockers: [
      { id: 'D02-B01', blocker: 'No geotechnical or subsurface investigation supports tunnel, retaining, embankment, or foundation choices.', requiredClosure: 'Accepted borehole/geology/groundwater evidence and geotechnical design criteria bound to this setout.' },
      { id: 'D02-B02', blocker: 'No structural calculations or load model prove bridges, culverts, retaining walls, tunnel lining, or the Data District clear span.', requiredClosure: 'Accepted structural basis, clearances, span arrangement, foundations, and independent design check.' },
      { id: 'D02-B03', blocker: 'Drainage collection is set out but no hydraulic model or approved outfall exists.', requiredClosure: 'Accepted catchments, design storm, capacities, erosion controls, and discharge ownership/consent.' },
      { id: 'D02-B04', blocker: 'C01 East/owner-tunnel interfaces remain contested under ISSUE-002; surface separation does not prove loading or ownership acceptance.', requiredClosure: 'Authoritative C01 field survey, ownership disposition, exclusion/loading criteria, and interface sign-off.' },
      { id: 'D02-B05', blocker: 'The authored 1:16→1:12→1:8→1:6 visual staircase sequence has not received final visual acceptance against the exact-radius raster.', requiredClosure: 'Reviewed raster visualization and explicit acceptance or a revised hash-bound staircase.' },
      { id: 'D02-B06', blocker: 'Earthwork values are surface-datum diagnostics, not construction quantities.', requiredClosure: 'Approved formation depths, side slopes, structures/voids, topsoil/unsuitable-material rules, and mass-haul model.' },
    ],
  },
  finalGate: {
    status: 'PARTIAL_PASS_D02_HOLD_NO_WORLD_EDITS',
    worldEditAuthorized: false,
    reason: 'Exact coordination geometry is complete, but structural, geotechnical, hydraulic, contested-interface, visual-acceptance, and construction-quantity evidence remains absent.',
  },
};

const markdown = `# Phase 1 C1 Civil Design — D02 Offline Remediation\n\n`
  + `**Status:** ${report.finalGate.status}\n`
  + `**Generated:** ${GENERATED_AT}\n`
  + `**Snapshot:** \`${snapshot.sha256}\`\n\n`
  + `This is the exact, reproducible C1 coordination design. It contains no operation cells, no material cells, performs no live calls, and does not authorize a physical build.\n\n`
  + `## Frozen setout\n\n`
  + `- Reference centerline: ${centerline.length.toLocaleString('en-US')} ordered integer points, ${round6(designLength)} blocks discrete raster traversal (${round6(continuousFilletLength)} blocks continuous fillet), hash \`${report.horizontalAlignment.referenceCenterlineColumnSetSha256}\`.\n`
  + `- Curves: ${curves.map((curve) => `${curve.id} R${curve.radiusBlocks} (${curve.rasterPointCount} raster points)`).join('; ')}.\n`
  + `- Rail: exact offsets -28/-24, profile Y${railAudit.minimumY}..Y${railAudit.maximumY}, maximum audited grade ${railAudit.maximumStepGrade}. The entire offsets -30..-18 strip remains empty.\n`
  + `- Highway: exact offsets -14..14, independent profile Y${highwayAudit.minimumY}..Y${highwayAudit.maximumY}, maximum audited grade ${highwayAudit.maximumStepGrade}; southward +1/0/-1 crossfall bands are frozen.\n`
  + `- Reservation: ${reservationColumns.length.toLocaleString('en-US')} unique plan columns; total land take: ${landTakeColumns.length.toLocaleString('en-US')} unique plan columns. These are coordination columns, not target cells.\n\n`
  + `## Immutable-evidence quantities\n\n`
  + `| Scope | Cut | Fill | Balance | Max cut | Max fill | Surface-water columns |\n`
  + `|---|---:|---:|---:|---:|---:|---:|\n`
  + `| Highway | ${earthwork.highway.cutColumnBlocks} | ${earthwork.highway.fillColumnBlocks} | ${earthwork.highway.balanceFillMinusCut} | ${earthwork.highway.maximumCut} | ${earthwork.highway.maximumFill} | ${earthwork.highway.surfaceWaterColumns} |\n`
  + `| Empty rail strip datum | ${earthwork.railStrip.cutColumnBlocks} | ${earthwork.railStrip.fillColumnBlocks} | ${earthwork.railStrip.balanceFillMinusCut} | ${earthwork.railStrip.maximumCut} | ${earthwork.railStrip.maximumFill} | ${earthwork.railStrip.surfaceWaterColumns} |\n`
  + `| Total-land-take datum | ${earthwork.totalLandTakeDatum.cutColumnBlocks} | ${earthwork.totalLandTakeDatum.fillColumnBlocks} | ${earthwork.totalLandTakeDatum.balanceFillMinusCut} | ${earthwork.totalLandTakeDatum.maximumCut} | ${earthwork.totalLandTakeDatum.maximumFill} | ${earthwork.totalLandTakeDatum.surfaceWaterColumns} |\n\n`
  + `These are prismatic surface-datum diagnostics, not construction takeoffs.\n\n`
  + `## C01 and owner-tunnel interfaces\n\n`
  + `| Feature | Plan gap | Overlap columns | Minimum surface separation | Result |\n`
  + `|---|---:|---:|---:|---|\n`
  + c01Interfaces.map((item) => `| ${item.feature} | ${item.exactLandTakePlanGapBlocksChebyshev} | ${item.exactLandTakeOverlapColumnCount} | ${item.minimumSurfaceDatumSeparationAboveFeatureTop ?? 'n/a'} | ${item.threeDimensionalSurfaceDatumCollision ? 'COLLISION' : 'NO SURFACE-DATUM COLLISION; HOLD'} |`).join('\n')
  + `\n\nThe checks do not prove excavation clearance, cover capacity, load transfer, or ownership acceptance. ISSUE-002 remains controlling.\n\n`
  + `## D04 rail protection\n\n`
  + `Offsets -30..-18 are a 13-block empty reserve. At the Data District crossroad near X=${C1_DD_CROSSROAD_X}, all future structures must clear-span it with no piers, abutments, utilities, drainage, or temporary works inside. The exact exclusion envelope is hash-reproducible; structural design remains HOLD.\n\n`
  + `## D02 blockers\n\n`
  + report.decisionD02.blockers.map((item) => `- **${item.id}:** ${item.blocker} Closure: ${item.requiredClosure}`).join('\n')
  + `\n\nUntil all six accepted design/external-evidence blockers close, D02 remains **HOLD**. Closing D02 alone authorizes no world edit; R01 is subsequent post-R00 physical validation and cannot resolve D02 or G02.\n`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

console.log(JSON.stringify({
  status: report.status,
  output: relative(OUTPUT),
  markdown: relative(MARKDOWN),
  referencePointCount: centerline.length,
  landTakeColumnCount: landTakeColumns.length,
  snapshotSha256: snapshot.sha256,
  d02: report.decisionD02.status,
  worldEditAuthorized: false,
}, null, 2));
