#!/usr/bin/env node
/**
 * Compile one exact, offline Grand Avenue passive-shell candidate.
 *
 * The result is design-review geometry only. It reads committed planning
 * evidence and the immutable copied Phase 0 region, never a live world. It
 * emits no accepted future states, material cells, operations, ownership, or
 * release authority.
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

const GENERATED_AT = value('--generated-at', '2026-08-05T01:45:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'masterplans/05-combined-zones/phase1-grand-avenue-passive-shell-candidate.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'masterplans/05-combined-zones/phase1-grand-avenue-passive-shell-candidate.md',
));

const INPUTS = Object.freeze({
  alternatives: 'masterplans/05-combined-zones/phase1-grand-avenue-subsurface-alternatives.json',
  b11: 'masterplans/05-combined-zones/phase1-b11-external-interface-acceptance.json',
  phase0: 'masterplans/05-combined-zones/phase0-survey-evidence.json',
  geometry: 'masterplans/05-combined-zones/phase1-geometry-coordination.json',
  protectedRelics: 'masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  d02: 'masterplans/05-combined-zones/phase1-d02-owner-acceptance-packet.json',
  d06: 'masterplans/05-combined-zones/phase1-d06-owner-acceptance-packet.json',
  ownerReview: 'masterplans/05-combined-zones/phase1-owner-review-acceptance.json',
  siteGate: 'masterplans/05-combined-zones/phase1-site-gate-audit.json',
});

const CELL_HASH_PREAMBLE = 'combined-zones-grand-avenue-passive-shell-candidate-cells-v1';
const STATE_HASH_PREAMBLE = 'combined-zones-grand-avenue-passive-shell-candidate-current-states-v1';
const PAIR_HASH_PREAMBLE = 'combined-zones-grand-avenue-passive-shell-candidate-interface-pairs-v1';
const REFERENCE_LINE_DROP = 6;
const OUTER_Z_OFFSETS = [-3, -2, -1, 0, 1, 2, 3, 4];
const OUTER_Y_OFFSETS = [-2, -1, 0, 1, 2, 3];
const INNER_Z_OFFSETS = [-2, -1, 0, 1, 2, 3];
const INNER_Y_OFFSETS = [-1, 0, 1, 2];
const ROAD_SEPARATION_Y_OFFSETS = [4, 5];
const BULKHEAD_STATIONS = [32, 64, 96, 128, 160, 192, 224, 256, 288];

function invariant(condition, message) {
  if (!condition) throw new Error(`Grand Avenue passive-shell candidate rejected: ${message}`);
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

function compareCells(left, right) {
  return left.x - right.x || left.y - right.y || left.z - right.z;
}

function pointKey(x, y, z) {
  return `${x},${y},${z}`;
}

function cellMap(cells) {
  return new Map(cells.map((cell) => [pointKey(cell.x, cell.y, cell.z), cell]));
}

function union(...sets) {
  const result = new Map();
  for (const cells of sets) {
    for (const cell of cells) result.set(pointKey(cell.x, cell.y, cell.z), cell);
  }
  return [...result.values()].sort(compareCells);
}

function difference(left, right) {
  const excluded = new Set(right.map((cell) => pointKey(cell.x, cell.y, cell.z)));
  return left.filter((cell) => !excluded.has(pointKey(cell.x, cell.y, cell.z)));
}

function intersection(left, right) {
  const included = new Set(right.map((cell) => pointKey(cell.x, cell.y, cell.z)));
  return left.filter((cell) => included.has(pointKey(cell.x, cell.y, cell.z)));
}

function insideHalfOpen(cell, bounds) {
  return cell.x >= bounds.minXInclusive && cell.x < bounds.maxXExclusive
    && cell.y >= bounds.minYInclusive && cell.y < bounds.maxYExclusive
    && cell.z >= bounds.minZInclusive && cell.z < bounds.maxZExclusive;
}

function insideInclusive(cell, bounds) {
  return cell.x >= bounds.minX && cell.x <= bounds.maxX
    && cell.y >= bounds.minY && cell.y <= bounds.maxY
    && cell.z >= bounds.minZ && cell.z <= bounds.maxZ;
}

function boundsOfCells(cells) {
  if (!cells.length) return null;
  return {
    minX: Math.min(...cells.map(({ x }) => x)),
    maxX: Math.max(...cells.map(({ x }) => x)),
    minY: Math.min(...cells.map(({ y }) => y)),
    maxY: Math.max(...cells.map(({ y }) => y)),
    minZ: Math.min(...cells.map(({ z }) => z)),
    maxZ: Math.max(...cells.map(({ z }) => z)),
  };
}

function hashCells(cells, label) {
  const digest = crypto.createHash('sha256');
  digest.update(`${CELL_HASH_PREAMBLE}-${label}\n`);
  for (const cell of [...cells].sort(compareCells)) digest.update(`${cell.x},${cell.y},${cell.z}\n`);
  return digest.digest('hex');
}

function componentSummary(cells) {
  const remaining = new Set(cells.map((cell) => pointKey(cell.x, cell.y, cell.z)));
  const sizes = [];
  const directions = [
    [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
  ];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const queue = [first];
    let size = 0;
    for (let index = 0; index < queue.length; index++) {
      const [x, y, z] = queue[index].split(',').map(Number);
      size++;
      for (const [dx, dy, dz] of directions) {
        const key = pointKey(x + dx, y + dy, z + dz);
        if (!remaining.delete(key)) continue;
        queue.push(key);
      }
    }
    sizes.push(size);
  }
  sizes.sort((left, right) => right - left);
  return {
    componentCount: sizes.length,
    largestComponentCellCount: sizes[0] ?? 0,
    componentSizeMultisetSha256: sha256(`${sizes.join(',')}\n`),
  };
}

function cellSetRecord(cells, label, reconstructionRule) {
  return {
    representation: 'SPARSE_DERIVED_EXACT_CELL_SET_NO_INLINE_COORDINATES',
    reconstructionRule,
    cellCount: cells.length,
    bounds: boundsOfCells(cells),
    coordinateSetSha256: hashCells(cells, label),
    ...componentSummary(cells),
  };
}

function hashPairs(pairs, label) {
  const digest = crypto.createHash('sha256');
  digest.update(`${PAIR_HASH_PREAMBLE}-${label}\n`);
  for (const pair of [...pairs].sort((left, right) => (
    compareCells(left.from, right.from) || compareCells(left.to, right.to)
  ))) {
    digest.update(`${pair.from.x},${pair.from.y},${pair.from.z}>`);
    digest.update(`${pair.to.x},${pair.to.y},${pair.to.z}\n`);
  }
  return digest.digest('hex');
}

function compressRoute(points) {
  const runs = [];
  let start = 0;
  for (let station = 1; station < points.length; station++) {
    const previousDelta = station > 1 ? {
      dx: points[station - 1].x - points[station - 2].x,
      dy: points[station - 1].y - points[station - 2].y,
      dz: points[station - 1].z - points[station - 2].z,
    } : null;
    const delta = {
      dx: points[station].x - points[station - 1].x,
      dy: points[station].y - points[station - 1].y,
      dz: points[station].z - points[station - 1].z,
    };
    if (previousDelta && JSON.stringify(previousDelta) !== JSON.stringify(delta)) {
      runs.push({
        startStation: start,
        endStation: station - 1,
        start: points[start],
        end: points[station - 1],
        step: previousDelta,
      });
      start = station - 1;
    }
    if (station === points.length - 1) {
      runs.push({
        startStation: start,
        endStation: station,
        start: points[start],
        end: points[station],
        step: delta,
      });
    }
  }
  return runs;
}

function sortedCounts(record) {
  return Object.fromEntries(Object.entries(record).sort(([left], [right]) => left.localeCompare(right)));
}

const alternatives = readJson(INPUTS.alternatives);
const b11 = readJson(INPUTS.b11);
const phase0 = readJson(INPUTS.phase0);
const geometry = readJson(INPUTS.geometry);
const protectedRelics = readJson(INPUTS.protectedRelics);
const d02 = readJson(INPUTS.d02);
const d06 = readJson(INPUTS.d06);
const ownerReview = readJson(INPUTS.ownerReview);
const siteGate = readJson(INPUTS.siteGate);

invariant(alternatives.id === 'combined-zones-phase1-grand-avenue-subsurface-alternatives',
  'unexpected alternatives packet');
invariant(alternatives.controllingPlanningRecommendation?.reserveCorridorNow === true,
  'reserve-now recommendation missing');
invariant(alternatives.controllingPlanningRecommendation?.fullyFitOutNow === false,
  'fit-out recommendation drift');
invariant(b11.acceptancePayload?.grandAvenue?.centerlineSha256
  === 'e63b7779674ad46fd7ad9c4ae0aea8f618afa8b656d3a24aa4367057cf103ff4',
'B11 identity drift');
invariant(phase0.generatedStructureStarts?.length === 114, 'Phase 0 structure registry drift');
invariant(protectedRelics.relics?.length === 3, 'protected-core registry drift');
invariant(d02.safetyBoundary?.d02Resolved === false, 'D02 unexpectedly resolved');
invariant(d06.disposition?.d06Resolved === false, 'D06 unexpectedly resolved');
invariant(siteGate.status === 'HOLD_PHASE1_EXIT_NOT_SATISFIED', 'site gate unexpectedly passed');
invariant(ownerReview.disposition?.allTechnicalHoldsRetained === true,
  'owner-review technical HOLD boundary drift');

const snapshotPath = phase0.snapshots.postGeneration.path;
const immutableSnapshot = snapshotIdentity(absolute(snapshotPath));
invariant(immutableSnapshot.sha256 === phase0.snapshots.postGeneration.sha256,
  'immutable snapshot identity drift');
invariant(immutableSnapshot.sha256
  === alternatives.sourceBindings.immutablePhase0PostRegionSnapshot.sha256,
'alternatives snapshot identity drift');

const grand = b11.acceptancePayload.grandAvenue;
const plan = rasterLine(grand.start, grand.end);
const surfaceRoute = plan.map((point, station) => ({
  station,
  x: point.x,
  y: 68 + Math.round((4 * station) / (plan.length - 1)),
  z: point.z,
}));
const surfaceManifest = `${surfaceRoute.map(({ x, y, z }) => `${x},${y},${z}`).join('\n')}\n`;
invariant(sha256(surfaceManifest) === grand.centerlineSha256, 'recomputed B11 profile hash drift');

const referenceLine = surfaceRoute.map((point) => ({
  station: point.station,
  x: point.x,
  y: point.y - REFERENCE_LINE_DROP,
  z: point.z,
  controllingRoadY: point.y,
}));
const referenceLineManifest = `${referenceLine.map(({ x, y, z }) => `${x},${y},${z}`).join('\n')}\n`;

const outerEnvelope = [];
const innerEnvelope = [];
const roadLoadSeparation = [];
const liningBoundary = [];
const roofCells = [];
const lowerRoadSeparationCells = [];
for (const point of referenceLine) {
  for (const dy of OUTER_Y_OFFSETS) {
    for (const dz of OUTER_Z_OFFSETS) {
      const cell = { x: point.x, y: point.y + dy, z: point.z + dz, station: point.station };
      outerEnvelope.push(cell);
      if (dy === OUTER_Y_OFFSETS[0] || dy === OUTER_Y_OFFSETS.at(-1)
        || dz === OUTER_Z_OFFSETS[0] || dz === OUTER_Z_OFFSETS.at(-1)) {
        liningBoundary.push(cell);
      }
      if (dy === OUTER_Y_OFFSETS.at(-1)) roofCells.push(cell);
    }
  }
  for (const dy of INNER_Y_OFFSETS) {
    for (const dz of INNER_Z_OFFSETS) {
      innerEnvelope.push({
        x: point.x,
        y: point.y + dy,
        z: point.z + dz,
        station: point.station,
      });
    }
  }
  for (const dy of ROAD_SEPARATION_Y_OFFSETS) {
    for (const dz of OUTER_Z_OFFSETS) {
      const cell = { x: point.x, y: point.y + dy, z: point.z + dz, station: point.station };
      roadLoadSeparation.push(cell);
      if (dy === ROAD_SEPARATION_Y_OFFSETS[0]) lowerRoadSeparationCells.push(cell);
    }
  }
}

const closureStations = new Set([0, ...BULKHEAD_STATIONS, referenceLine.at(-1).station]);
const westCap = innerEnvelope.filter(({ station }) => station === 0);
const eastCap = innerEnvelope.filter(({ station }) => station === referenceLine.at(-1).station);
const bulkheadCells = innerEnvelope.filter(({ station }) => BULKHEAD_STATIONS.includes(station));
const closureCells = union(westCap, eastCap, bulkheadCells);
const proposedMaterialGeometry = union(liningBoundary, closureCells);
const retainedInternalVoid = difference(innerEnvelope, closureCells);
const influenceUnion = union(outerEnvelope, roadLoadSeparation);

const dryUtilityReservation = [];
const wetUtilityReservation = [];
const drainageInvertReservation = [];
const maintenanceWalkwayReservation = [];
const inspectionEnvelopeReservation = [];
for (const point of referenceLine) {
  if (closureStations.has(point.station)) continue;
  dryUtilityReservation.push({
    x: point.x, y: point.y, z: point.z - 2, station: point.station,
  });
  wetUtilityReservation.push({
    x: point.x, y: point.y, z: point.z + 3, station: point.station,
  });
  drainageInvertReservation.push({
    x: point.x, y: point.y - 1, z: point.z + 3, station: point.station,
  });
  for (const dz of [-1, 0, 1, 2]) {
    maintenanceWalkwayReservation.push({
      x: point.x, y: point.y - 1, z: point.z + dz, station: point.station,
    });
    for (const dy of [0, 1, 2]) {
      inspectionEnvelopeReservation.push({
        x: point.x, y: point.y + dy, z: point.z + dz, station: point.station,
      });
    }
  }
}
const programmedInternalReservations = union(
  dryUtilityReservation,
  wetUtilityReservation,
  drainageInvertReservation,
  maintenanceWalkwayReservation,
  inspectionEnvelopeReservation,
);
const unprogrammedInternalVoid = difference(retainedInternalVoid, programmedInternalReservations);

invariant(outerEnvelope.length === 14352, 'outer envelope count drift');
invariant(innerEnvelope.length === 7176, 'inner envelope count drift');
invariant(liningBoundary.length === 7176, 'lining boundary count drift');
invariant(closureCells.length === 264, 'closure count drift');
invariant(proposedMaterialGeometry.length === 7440, 'material-geometry count drift');
invariant(retainedInternalVoid.length === 6912, 'retained void count drift');
invariant(roadLoadSeparation.length === 4784, 'road-load separation count drift');
invariant(influenceUnion.length === 19136, 'influence union count drift');
invariant(programmedInternalReservations.length === 5472, 'programmed void count drift');
invariant(unprogrammedInternalVoid.length === 1440, 'unprogrammed void count drift');
invariant(intersection(dryUtilityReservation, wetUtilityReservation).length === 0,
  'dry/wet utility reservations overlap');

const roofToCoverPairs = roofCells.map((from) => ({
  from,
  to: { x: from.x, y: from.y + 1, z: from.z, station: from.station },
}));
invariant(roofToCoverPairs.length === 2392, 'roof/load interface pair count drift');
const lowerRoadSeparationCellMap = cellMap(lowerRoadSeparationCells);
invariant(roofToCoverPairs.every(({ to }) => (
  lowerRoadSeparationCellMap.has(pointKey(to.x, to.y, to.z))
)), 'roof/load interface adjacency drift');

const houstonSample = geometry.compiledCoordinationGeometry.normalized04EnvelopeCellSets
  .find((item) => item.id === 'houston-tunnel-sample');
invariant(houstonSample, 'Houston sample envelope missing');
const houstonBounds = houstonSample.exactCoordinationCellSet.bounds;
const houstonOuterOverlap = outerEnvelope.filter((cell) => insideHalfOpen(cell, houstonBounds));
const houstonMaterialOverlap = proposedMaterialGeometry
  .filter((cell) => insideHalfOpen(cell, houstonBounds));
const houstonRoadSeparationOverlap = roadLoadSeparation
  .filter((cell) => insideHalfOpen(cell, houstonBounds));
const houstonInfluenceOverlap = influenceUnion.filter((cell) => insideHalfOpen(cell, houstonBounds));
const houstonClosureOverlap = closureCells.filter((cell) => insideHalfOpen(cell, houstonBounds));

const reader = new SnapshotReader(absolute(snapshotPath));
const requiredChunks = new Map();
for (const cell of influenceUnion) {
  const cx = Math.floor(cell.x / 16);
  const cz = Math.floor(cell.z / 16);
  requiredChunks.set(`${cx},${cz}`, { cx, cz });
}
const missingChunks = [];
for (const coordinate of [...requiredChunks.values()].sort((left, right) => (
  left.cx - right.cx || left.cz - right.cz
))) {
  if (!await reader.readChunk(coordinate.cx, coordinate.cz)) missingChunks.push(coordinate);
}
invariant(missingChunks.length === 0, 'candidate influence has missing chunks');

const currentByCell = new Map();
for (const cell of influenceUnion) {
  const chunk = reader.chunks.get(`${Math.floor(cell.x / 16)},${Math.floor(cell.z / 16)}`);
  const rawState = reader.stateAt(chunk, cell.x, cell.y, cell.z);
  currentByCell.set(pointKey(cell.x, cell.y, cell.z), {
    ...cell,
    name: rawState?.Name ?? 'minecraft:air',
    canonicalState: canonicalState(rawState),
    waterlogged: isWaterlogged(rawState),
  });
}

function currentStateCensus(cells, label) {
  const records = cells.map((cell) => {
    const current = currentByCell.get(pointKey(cell.x, cell.y, cell.z));
    invariant(current, `${label} current-state lookup missing`);
    return current;
  }).sort(compareCells);
  const counts = {};
  let airCellCount = 0;
  let waterCellCount = 0;
  let waterloggedCellCount = 0;
  let lavaCellCount = 0;
  let gravitySensitiveCellCount = 0;
  const stateDigest = crypto.createHash('sha256');
  stateDigest.update(`${STATE_HASH_PREAMBLE}-${label}\n`);
  for (const record of records) {
    counts[record.canonicalState] = (counts[record.canonicalState] ?? 0) + 1;
    if (AIR.has(record.name)) airCellCount++;
    if (WATER.has(record.name) || record.waterlogged) waterCellCount++;
    if (record.waterlogged) waterloggedCellCount++;
    if (record.name === 'minecraft:lava') lavaCellCount++;
    if (isGravitySensitive(record.name)) gravitySensitiveCellCount++;
    stateDigest.update(
      `${record.x},${record.y},${record.z}\t${record.canonicalState}\n`,
    );
  }
  return {
    classification: 'IMMUTABLE_REGION_CURRENT_STATE_NOT_FUTURE_STATE',
    cellCount: records.length,
    coordinateSetSha256: hashCells(cells, label),
    blockStateSetSha256: stateDigest.digest('hex'),
    airCellCount,
    presentCellCount: records.length - airCellCount,
    waterCellCount,
    waterloggedCellCount,
    lavaCellCount,
    gravitySensitiveCellCount,
    canonicalStateCounts: sortedCounts(counts),
  };
}

const influenceCurrentState = currentStateCensus(influenceUnion, 'influence-union');
const outerCurrentState = currentStateCensus(outerEnvelope, 'outer-envelope');
const materialGeometryCurrentState = currentStateCensus(
  proposedMaterialGeometry,
  'proposed-material-geometry',
);
const roadSeparationCurrentState = currentStateCensus(
  roadLoadSeparation,
  'road-load-separation',
);
const houstonCurrentState = currentStateCensus(houstonInfluenceOverlap, 'houston-overlap');

const structureRegistryManifest = `${phase0.generatedStructureStarts.map((record, sourceIndex) => (
  `${sourceIndex}\t${record.id}\t${record.chunkX},${record.chunkZ}\t`
  + `${record.bounds.minX},${record.bounds.minY},${record.bounds.minZ},`
  + `${record.bounds.maxX},${record.bounds.maxY},${record.bounds.maxZ}`
)).join('\n')}\n`;
const generatedStartIntersections = phase0.generatedStructureStarts.map((record, sourceIndex) => {
  const envelopeIntersection = outerEnvelope.filter((cell) => insideInclusive(cell, record.bounds));
  const influenceIntersection = influenceUnion.filter((cell) => insideInclusive(cell, record.bounds));
  return {
    sourceIndex,
    id: record.id,
    startChunk: { x: record.chunkX, z: record.chunkZ },
    inclusiveBounds: record.bounds,
    candidateOuterEnvelopeIntersection: cellSetRecord(
      envelopeIntersection,
      `structure-${sourceIndex}-outer`,
      `exact intersection with Phase 0 generatedStructureStarts[${sourceIndex}] inclusive bounds`,
    ),
    candidateInfluenceUnionIntersection: cellSetRecord(
      influenceIntersection,
      `structure-${sourceIndex}-influence`,
      `exact intersection with Phase 0 generatedStructureStarts[${sourceIndex}] inclusive bounds`,
    ),
  };
});
const generatedStartsWithInfluenceIntersection = generatedStartIntersections.filter(
  (record) => record.candidateInfluenceUnionIntersection.cellCount > 0,
);

const protectedCoreIntersections = protectedRelics.relics.map((relic) => {
  const coreCells = influenceUnion.filter((cell) => insideInclusive(cell, relic.declaredInclusiveBounds));
  return {
    key: relic.key,
    structureId: relic.structureId,
    inclusiveBounds: relic.declaredInclusiveBounds,
    boundCoreCellCount: relic.evidenceBackedDefaultDenyCore.cellCount,
    boundCoreCoordinateSetSha256: relic.evidenceBackedDefaultDenyCore.coordinateSetSha256,
    positiveMarginStatus: relic.positiveMarginBuffer.status,
    candidateInfluenceIntersection: cellSetRecord(
      coreCells,
      `protected-core-${relic.key}`,
      `exact intersection with protectedRelics.relics[${relic.key}] inclusive core bounds`,
    ),
  };
});

const utilityEndpointCapCells = union(
  ...[0, referenceLine.at(-1).station].map((station) => {
    const point = referenceLine[station];
    return [
      { x: point.x, y: point.y, z: point.z - 2, station },
      { x: point.x, y: point.y, z: point.z + 3, station },
      { x: point.x, y: point.y - 1, z: point.z + 3, station },
    ];
  }),
);

const sourceBindings = {
  alternatives: fileBinding(INPUTS.alternatives, 'controlling reserve/shell/no-fit-out recommendation'),
  b11: fileBinding(INPUTS.b11, 'exact 299-point Grand Avenue profile'),
  phase0: fileBinding(INPUTS.phase0, '114 generated starts and immutable survey identity'),
  geometry: fileBinding(INPUTS.geometry, 'exact half-open Houston sample envelope'),
  protectedRelics: fileBinding(INPUTS.protectedRelics, 'three evidence-backed default-deny cores'),
  d02: fileBinding(INPUTS.d02, 'complete-save, geotechnical, structural, hydraulic, and ownership HOLDs'),
  d06: fileBinding(INPUTS.d06, 'occupiable-use life-safety and commissioning HOLDs'),
  ownerReview: fileBinding(INPUTS.ownerReview, 'accepted planning policy with technical HOLDs retained'),
  siteGate: fileBinding(INPUTS.siteGate, 'Phase 1 exit HOLD'),
  immutablePhase0PostRegionSnapshot: immutableSnapshot,
};

const shellCellSets = {
  outerEnvelope: cellSetRecord(
    outerEnvelope,
    'outer-envelope',
    'for each exact reference station: Z offsets -3…+4 and Y offsets -2…+3',
  ),
  innerEnvelopeBeforeClosures: cellSetRecord(
    innerEnvelope,
    'inner-envelope',
    'for each exact reference station: Z offsets -2…+3 and Y offsets -1…+2',
  ),
  liningBoundary: cellSetRecord(
    liningBoundary,
    'lining-boundary',
    'outer envelope minus inner envelope',
  ),
  westSealedCap: cellSetRecord(
    westCap,
    'west-cap',
    'inner section at station 0',
  ),
  eastSealedCap: cellSetRecord(
    eastCap,
    'east-cap',
    'inner section at station 298',
  ),
  periodicSealedBulkheads: cellSetRecord(
    bulkheadCells,
    'periodic-bulkheads',
    `inner sections at stations ${BULKHEAD_STATIONS.join(',')}`,
  ),
  allSealedClosures: cellSetRecord(
    closureCells,
    'all-closures',
    'west cap union east cap union periodic bulkheads',
  ),
  proposedMaterialGeometry: cellSetRecord(
    proposedMaterialGeometry,
    'proposed-material-geometry',
    'lining boundary union sealed closures; no block state or material accepted',
  ),
  retainedInternalVoid: cellSetRecord(
    retainedInternalVoid,
    'retained-internal-void',
    'inner envelope minus sealed closures',
  ),
  twoLayerRoadLoadSeparation: cellSetRecord(
    roadLoadSeparation,
    'road-load-separation',
    'for each reference station: outer Z offsets and reference Y offsets +4,+5',
  ),
  candidateInfluenceUnion: cellSetRecord(
    influenceUnion,
    'influence-union',
    'outer envelope union two-layer road-load separation',
  ),
};

const reservationCellSets = {
  dryUtility: cellSetRecord(
    dryUtilityReservation,
    'dry-utility',
    'non-closure stations at reference Z-2,Y',
  ),
  wetUtility: cellSetRecord(
    wetUtilityReservation,
    'wet-utility',
    'non-closure stations at reference Z+3,Y',
  ),
  drainageInvert: cellSetRecord(
    drainageInvertReservation,
    'drainage-invert',
    'non-closure stations at reference Z+3,Y-1',
  ),
  maintenanceWalkway: cellSetRecord(
    maintenanceWalkwayReservation,
    'maintenance-walkway',
    'non-closure stations at reference Z offsets -1…+2,Y-1',
  ),
  clearInspectionEnvelope: cellSetRecord(
    inspectionEnvelopeReservation,
    'inspection-envelope',
    'non-closure stations at reference Z offsets -1…+2,Y offsets 0…+2',
  ),
  programmedUnion: cellSetRecord(
    programmedInternalReservations,
    'programmed-internal-union',
    'dry/wet/drainage/walkway/inspection union',
  ),
  unprogrammedInternalVoid: cellSetRecord(
    unprogrammedInternalVoid,
    'unprogrammed-internal-void',
    'retained internal void minus programmed reservations',
  ),
  sealedUtilityEndpointCaps: cellSetRecord(
    utilityEndpointCapCells,
    'utility-endpoint-caps',
    'dry, wet, and drainage reservation points at stations 0 and 298; contained by end caps',
  ),
};

const houstonCellSets = {
  candidateOuterEnvelopeOverlap: cellSetRecord(
    houstonOuterOverlap,
    'houston-outer-overlap',
    'candidate outer envelope intersect exact half-open Houston sample envelope',
  ),
  proposedMaterialGeometryOverlap: cellSetRecord(
    houstonMaterialOverlap,
    'houston-material-overlap',
    'proposed material geometry intersect exact half-open Houston sample envelope',
  ),
  roadLoadSeparationOverlap: cellSetRecord(
    houstonRoadSeparationOverlap,
    'houston-road-separation-overlap',
    'road-load separation intersect exact half-open Houston sample envelope',
  ),
  exactZ03Z05CoordinationOverlap: cellSetRecord(
    houstonInfluenceOverlap,
    'houston-influence-overlap',
    'candidate influence union intersect exact half-open Houston sample envelope',
  ),
  closureOverlap: cellSetRecord(
    houstonClosureOverlap,
    'houston-closure-overlap',
    'sealed cap/bulkhead cells intersect exact half-open Houston sample envelope',
  ),
};

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-grand-avenue-passive-shell-candidate',
  candidateId: 'P1-B12-GA-PASSIVE-SHELL-CANDIDATE-01',
  generatedAtUtc: GENERATED_AT,
  status: 'EXACT_PASSIVE_SHELL_CANDIDATE_READY_FOR_REVIEW_ALL_TECHNICAL_AND_PHYSICAL_GATES_HOLD',
  purpose: 'Advance reserve-now into one exact sealed passive-shell candidate without accepting construction, materials, future states, ownership, interfaces, operations, or fit-out.',
  authorityBoundary: {
    priorCombinedZonesPlanningPolicyAccepted: ownerReview.disposition.ownerAcceptanceRecorded,
    thisCandidateAcceptedByOwner: false,
    thisCandidateTechnicallyAccepted: false,
    canonicalOwnershipAccepted: false,
    interfaceContractsAccepted: false,
    globalAuditPassed: false,
    physicalReleaseAuthorized: false,
  },
  safetyBoundary: {
    offlineOnly: true,
    immutableCopiedRegionOnly: true,
    liveCallsPerformed: [],
    proposedBlockStatePalette: [],
    proposedFutureStateRecords: [],
    operations: [],
    acceptedFutureStateCellCount: 0,
    acceptedConstructionCellCount: 0,
    acceptedMaterialCellCount: 0,
    operationCellCount: 0,
    canonicalOwnerAssignmentCount: 0,
    acceptedInterfaceContractCount: 0,
    executable: false,
    constructionAuthorized: false,
    materialSelectionAuthorized: false,
    worldEditAuthorized: false,
  },
  sourceBindings,
  exactReferenceLine: {
    classification: 'EXACT_CANDIDATE_GEOMETRY_NOT_ACCEPTED_FUTURE_STATE',
    relationshipToB11: 'same X/Z raster and rise stations; every Y is exact B11 roadY minus 6',
    integerLatticeConvention: 'reference occupies the lower-Z and lower-Y central lattice column of both even sections',
    pointCount: referenceLine.length,
    start: referenceLine[0],
    end: referenceLine.at(-1),
    b11SurfaceCenterlineSha256: grand.centerlineSha256,
    referenceLineSha256: sha256(referenceLineManifest),
    sparseRunCount: compressRoute(referenceLine).length,
    sparseRuns: compressRoute(referenceLine),
  },
  exactSection: {
    orientationConvention: 'station slices are X-constant and offsets are global Z/Y; B11 advances +X with Z unchanged or -1',
    evenWidthSideBias: {
      referenceLatticePosition: 'lower-Z central lattice column',
      outerZOffsetsInclusive: { min: -3, max: 4 },
      innerZOffsetsInclusive: { min: -2, max: 3 },
      bias: 'one additional cell on positive-Z side',
    },
    evenHeightSideBias: {
      referenceLatticePosition: 'lower-Y central lattice row',
      outerYOffsetsInclusive: { min: -2, max: 3 },
      innerYOffsetsInclusive: { min: -1, max: 2 },
      bias: 'one additional cell on positive-Y side',
    },
    outerSection: { widthBlocks: 8, heightBlocks: 6, cellsPerStation: 48 },
    innerSectionBeforeClosures: { widthBlocks: 6, heightBlocks: 4, cellsPerStation: 24 },
    oneCellBoundary: {
      floorY: 'referenceY-2',
      roofY: 'referenceY+3 = controlling roadY-3',
      sidewallsZ: ['referenceZ-3', 'referenceZ+4'],
      materialOrBlockStateSelected: false,
    },
    roadLoadSeparation: {
      retainedLayers: 2,
      y: ['referenceY+4 = roadY-2', 'referenceY+5 = roadY-1'],
      relationship: 'exact reservation between candidate roof and B11 road datum; not accepted structural cover',
    },
  },
  exactCellSets: shellCellSets,
  passiveClosures: {
    westCapStation: 0,
    eastCapStation: 298,
    periodicBulkheadIntervalStations: 32,
    periodicBulkheadStations: BULKHEAD_STATIONS,
    doorOrOpeningCells: [],
    openingCellCount: 0,
    allClosuresProposedSolidAndSealed: true,
    materialOrMechanismSelected: false,
  },
  internalSegregationAndAccessReservations: {
    classification: 'EXACT_GEOMETRIC_RESERVATIONS_NOT_COMMISSIONED_SYSTEMS',
    dryWetCellSetsDisjoint: intersection(dryUtilityReservation, wetUtilityReservation).length === 0,
    dryWetReferenceLineSeparationBlocks: 5,
    allReservationsExcludeEndCapsAndBulkheads: true,
    occupiableUseAuthorized: false,
    utilityServiceAuthorized: false,
    drainageDischargePoint: null,
    pumpOrPassiveOutfallSelected: false,
    reservations: reservationCellSets,
  },
  exactCurrentStateCensus: {
    requiredChunkCount: requiredChunks.size,
    missingChunkCount: missingChunks.length,
    candidateInfluenceUnion: influenceCurrentState,
    outerEnvelope: outerCurrentState,
    proposedMaterialGeometry: materialGeometryCurrentState,
    roadLoadSeparation: roadSeparationCurrentState,
    exactZ03Z05HoustonCoordinationOverlap: houstonCurrentState,
    qualification: 'Exact current blocks and fluids in the copied region only; not excavation, replacement, groundwater, structural, hydraulic, or future-state evidence.',
  },
  generatedStructureAudit: {
    sourceRecordCount: phase0.generatedStructureStarts.length,
    sourceRegistrySha256: sha256(structureRegistryManifest),
    evaluatedRecordCount: generatedStartIntersections.length,
    recordsWithCandidateInfluenceIntersection: generatedStartsWithInfluenceIntersection.length,
    allRecords: generatedStartIntersections,
    exactPresentFabricClearanceAccepted: false,
    constructionInfluenceMarginAccepted: false,
    qualification: 'Every Phase 0 start bound is intersected exactly. Bounds are coordination evidence, not present-fabric attribution or an accepted positive margin.',
  },
  protectedCoreAudit: {
    sourceCoreCount: protectedRelics.relics.length,
    evaluatedCoreCount: protectedCoreIntersections.length,
    coresWithCandidateInfluenceIntersection: protectedCoreIntersections.filter(
      (record) => record.candidateInfluenceIntersection.cellCount > 0,
    ).length,
    records: protectedCoreIntersections,
    finalPositiveMarginClearanceAccepted: false,
  },
  houstonZ03Z05Coordination: {
    exactHalfOpenHoustonSampleEnvelope: houstonBounds,
    houstonSampleEnvelopeCellCount: houstonSample.exactCoordinationCellSet.cellCount,
    exactCellSets: houstonCellSets,
    sameCoordinateOverlapRequiresCanonicalOwnerAdjudication: true,
    physicalSeamAccepted: false,
    connectionOpened: false,
    qualification: 'The exact overlap is a conflict/coordination set, not a connection, transfer, material, or ownership approval.',
  },
  proposedSeparateOwnerRegistry: {
    status: 'PROPOSED_NOT_CANONICAL_NOT_ACCEPTED',
    records: [
      {
        proposedOwnerId: 'OWN-Z03-GRAND-AVENUE-PASSIVE-SHELL-CANDIDATE',
        role: 'candidate shell geometry steward distinct from Z03 surface-road and Z05 Houston owners',
        proposedScope: shellCellSets.outerEnvelope,
        sameCoordinateHoustonConflict: houstonCellSets.candidateOuterEnvelopeOverlap,
        accepted: false,
      },
      {
        proposedOwnerId: 'OWN-P1-B12-GA-PASSIVE-SHELL-RESERVATIONS',
        role: 'candidate internal utility, drainage, maintenance, and inspection reservation steward',
        proposedScope: reservationCellSets.programmedUnion,
        accepted: false,
      },
    ],
    canonicalOwnerAssignments: [],
    canonicalOwnerAssignmentCount: 0,
  },
  proposedInterfaceRegistry: {
    status: 'PROPOSED_EXACT_SETS_NOT_ACCEPTED_GLOBAL_AUDIT_HOLD',
    contracts: [
      {
        id: 'IF-P1-B12-PASSIVE-SHELL-ROOF-TO-Z03-SURFACE',
        fromOwner: 'OWN-Z03-GRAND-AVENUE-PASSIVE-SHELL-CANDIDATE',
        toOwner: 'Z03-GRAND-AVENUE',
        direction: 'VERTICAL_UP_FROM_SHELL_ROOF_TO_SURFACE_LOAD_SEPARATION',
        transitionPairCount: roofToCoverPairs.length,
        transitionPairSha256: hashPairs(roofToCoverPairs, 'roof-to-cover'),
        fromShellRoof: cellSetRecord(roofCells, 'roof-interface', 'candidate roof cells'),
        toLowerRoadSeparationLayer: cellSetRecord(
          lowerRoadSeparationCells,
          'lower-road-separation-interface',
          'vertically adjacent lower road-load separation cells',
        ),
        accepted: false,
      },
      {
        id: 'IF-P1-B12-Z03-Z05-HOUSTON-SAME-COORDINATE-OVERLAP',
        fromOwner: 'OWN-Z03-GRAND-AVENUE-PASSIVE-SHELL-CANDIDATE',
        toOwner: 'Z05-HOUSTON',
        direction: 'BIDIRECTIONAL_COORDINATION_CONFLICT_NO_TRANSFER',
        exactCandidateInfluenceOverlap: houstonCellSets.exactZ03Z05CoordinationOverlap,
        exactCandidateOuterEnvelopeOverlap: houstonCellSets.candidateOuterEnvelopeOverlap,
        exactProposedMaterialGeometryOverlap: houstonCellSets.proposedMaterialGeometryOverlap,
        exactClosureOverlap: houstonCellSets.closureOverlap,
        accepted: false,
      },
      {
        id: 'IF-P1-B12-WEST-CAP-SEALED',
        fromOwner: 'OWN-Z03-GRAND-AVENUE-PASSIVE-SHELL-CANDIDATE',
        toOwner: null,
        direction: 'WESTBOUND_CLOSED',
        exactCap: shellCellSets.westSealedCap,
        openingCells: [],
        accepted: false,
      },
      {
        id: 'IF-P1-B12-EAST-CAP-HOUSTON-SEALED',
        fromOwner: 'OWN-Z03-GRAND-AVENUE-PASSIVE-SHELL-CANDIDATE',
        toOwner: 'Z05-HOUSTON',
        direction: 'EASTBOUND_CLOSED',
        exactCap: shellCellSets.eastSealedCap,
        openingCells: [],
        accepted: false,
      },
      {
        id: 'IF-P1-B12-UTILITY-ENDPOINTS-SEALED',
        fromOwner: 'OWN-P1-B12-GA-PASSIVE-SHELL-RESERVATIONS',
        toOwner: null,
        direction: 'BOTH_ENDS_CLOSED',
        exactEndpointCaps: reservationCellSets.sealedUtilityEndpointCaps,
        accepted: false,
      },
    ],
    acceptedContracts: [],
    acceptedInterfaceContractCount: 0,
  },
  exactGeometricQuantities: {
    referenceLinePoints: referenceLine.length,
    outerEnvelopeCells: outerEnvelope.length,
    innerEnvelopeBeforeClosuresCells: innerEnvelope.length,
    liningBoundaryCells: liningBoundary.length,
    endCapCells: westCap.length + eastCap.length,
    periodicBulkheadCells: bulkheadCells.length,
    allClosureCells: closureCells.length,
    proposedMaterialGeometryCellsNoMaterialSelected: proposedMaterialGeometry.length,
    retainedInternalVoidCells: retainedInternalVoid.length,
    roadLoadSeparationCells: roadLoadSeparation.length,
    candidateInfluenceUnionCells: influenceUnion.length,
    programmedInternalReservationCells: programmedInternalReservations.length,
    unprogrammedInternalVoidCells: unprogrammedInternalVoid.length,
    currentPresentCellsInOuterEnvelope: outerCurrentState.presentCellCount,
    currentFluidCellsInOuterEnvelope: outerCurrentState.waterCellCount
      + outerCurrentState.lavaCellCount,
    acceptedConstructionCells: 0,
    acceptedMaterialCells: 0,
    operationCells: 0,
  },
  retainedHolds: [
    {
      id: 'P1-B12-H01-COMPLETE-SAVE',
      status: 'HOLD',
      basis: 'The bound snapshot contains region only; a same-moment entities/POI/level.dat save and exact entity clearance are absent.',
    },
    {
      id: 'P1-B12-H02-GEOTECHNICAL-STRUCTURAL-ROAD-LOAD',
      status: 'HOLD',
      basis: 'No accepted excavation stability, void, lining, foundation, retaining, loading, settlement, waterproofing, or independent structural design exists.',
    },
    {
      id: 'P1-B12-H03-HYDROLOGY-DRAINAGE',
      status: 'HOLD',
      basis: 'Current fluid census is exact, but inflow, storage, freeboard, pump/passive outfall, power, receiver, failure, recovery, and future-fluid accounting are absent.',
    },
    {
      id: 'P1-B12-H04-UTILITIES',
      status: 'HOLD',
      basis: 'Dry/wet cells are geometric reservations only; no service, capacity, source, separation criterion, crossing, or commissioning is accepted.',
    },
    {
      id: 'P1-B12-H05-D06-OCCUPIABLE-USE',
      status: 'HOLD',
      basis: 'The candidate is passive and nonoccupiable; egress, accessibility, ventilation/smoke, fire/service, lighting/power, barriers, drainage, and commissioning remain unresolved.',
    },
    {
      id: 'P1-B12-H06-OWNER-INTERFACE-ACCEPTANCE',
      status: 'HOLD',
      basis: 'Separate candidate owners and five exact interface records are proposals only; the Z03/Z05 overlap has no canonical owner adjudication.',
    },
    {
      id: 'P1-B12-H07-GLOBAL-CROSS-SCOPE-AUDIT',
      status: 'HOLD',
      basis: 'No complete default-deny global one-to-one interface audit has evaluated accepted candidate cell sets and contracts.',
    },
    {
      id: 'P1-B12-H08-PHYSICAL-COMPILER-RELEASE',
      status: 'HOLD',
      basis: 'No future-state compiler, operation/material plan, source guards, rollback, preflight, atomic ledger, or release authorization exists.',
    },
  ],
  decision: {
    exactCandidateGeometryPrepared: true,
    retainNoForeclosureReservation: true,
    conditionalShellCandidateSelectedForReview: true,
    constructNow: false,
    fitOutNow: false,
    openAnyCapBulkheadUtilityOrHoustonInterface: false,
    ifAnyHoldRemainsAtRoadRelease: 'Do not build the shell; retain the no-foreclosure reservation and sealed/null interfaces.',
  },
  limitations: [
    'Exact candidate geometry is not an accepted future-state or construction manifest.',
    'No Minecraft material or block state is selected; proposed material geometry is a functional quantity only.',
    'Generated-start bounds and protected cores are exact default-deny comparisons but do not supply positive construction-influence margins.',
    'Region-only current-state evidence omits entities, POI, level.dat, live occupancy, groundwater models, and future interactions.',
    'The Houston overlap registry identifies every candidate interaction coordinate but accepts neither ownership nor a physical connection.',
    'The passive shell has no authorized occupiable use, access, utility service, drainage discharge, operation, or release.',
  ],
};

invariant(report.safetyBoundary.acceptedFutureStateCellCount === 0, 'future cells accepted');
invariant(report.safetyBoundary.acceptedConstructionCellCount === 0, 'construction cells accepted');
invariant(report.safetyBoundary.acceptedMaterialCellCount === 0, 'material cells accepted');
invariant(report.safetyBoundary.operationCellCount === 0, 'operations accepted');
invariant(report.proposedInterfaceRegistry.contracts.every(({ accepted }) => accepted === false),
  'an interface was accepted');
invariant(report.retainedHolds.every(({ status }) => status === 'HOLD'), 'a technical HOLD closed');

const json = `${JSON.stringify(report, null, 2)}\n`;

const materialRows = Object.entries(shellCellSets).map(([name, set]) => (
  `| ${name} | ${set.cellCount.toLocaleString('en-US')} | \`${set.coordinateSetSha256}\` | ${set.componentCount} |`
)).join('\n');
const reservationRows = Object.entries(reservationCellSets).map(([name, set]) => (
  `| ${name} | ${set.cellCount.toLocaleString('en-US')} | \`${set.coordinateSetSha256}\` |`
)).join('\n');
const censusRows = [
  ['candidate influence union', influenceCurrentState],
  ['outer envelope', outerCurrentState],
  ['proposed material geometry', materialGeometryCurrentState],
  ['road-load separation', roadSeparationCurrentState],
  ['Z03/Z05 Houston overlap', houstonCurrentState],
].map(([name, census]) => (
  `| ${name} | ${census.cellCount.toLocaleString('en-US')} | ${census.presentCellCount.toLocaleString('en-US')} | ${census.airCellCount.toLocaleString('en-US')} | ${census.waterCellCount.toLocaleString('en-US')} | ${census.lavaCellCount.toLocaleString('en-US')} | \`${census.blockStateSetSha256}\` |`
)).join('\n');
const houstonRows = Object.entries(houstonCellSets).map(([name, set]) => (
  `| ${name} | ${set.cellCount.toLocaleString('en-US')} | \`${set.coordinateSetSha256}\` |`
)).join('\n');
const holdRows = report.retainedHolds.map((hold) => (
  `| ${hold.id} | ${hold.status} | ${hold.basis} |`
)).join('\n');

const markdown = `# Grand Avenue exact sealed passive-shell candidate

Generated: ${GENERATED_AT}

Status: **${report.status}**

This P1-B12 record advances the reserve-only recommendation into one exact review candidate. It is still offline, non-executable, unowned, technically unaccepted, and nonoccupiable. Accepted construction, material, future-state, and operation counts are all **zero**.

## Exact section and profile

- Reference line: exact B11 X/Z and rise profile, lowered six blocks; ${referenceLine.length} points; SHA-256 \`${report.exactReferenceLine.referenceLineSha256}\`.
- Integer convention: the reference occupies the lower-Z and lower-Y central lattice column.
- Outer section: 8 wide × 6 high, Z offsets -3…+4 and Y offsets -2…+3.
- Inner section: 6 wide × 4 high, Z offsets -2…+3 and Y offsets -1…+2.
- Roof: roadY-3. Two retained load-separation layers: roadY-2 and roadY-1.
- Closures: solid west/east caps and solid bulkheads at stations ${BULKHEAD_STATIONS.join(', ')}. No door or opening cells exist.

The even-width choice is explicit: the extra lateral cell is on the positive-Z side. This resolves the screening artifact's side-bias ambiguity for this candidate only; it does not alter accepted B11 surface ownership.

## Exact sparse cell manifests

| Cell set | Cells | Coordinate-set SHA-256 | Components |
|---|---:|---|---:|
${materialRows}

No Minecraft block palette is selected. “Proposed material geometry” means boundary/closure quantity, not accepted material or future-state cells.

## Internal reservations

| Reservation | Cells | Coordinate-set SHA-256 |
|---|---:|---|
${reservationRows}

Dry and wet utility reservations are disjoint and five lattice blocks apart. Drainage has no accepted outfall, pump, receiver, or operating mode. Walkway/inspection cells do not authorize occupancy.

## Immutable current-state census

| Exact set | Cells | Present | Air | Water/waterlogged | Lava | Block-state SHA-256 |
|---|---:|---:|---:|---:|---:|---|
${censusRows}

The census reads ${requiredChunks.size} chunks from immutable region snapshot \`${immutableSnapshot.sha256}\`. It is not excavation, groundwater, structural, hydraulic, or future-state evidence.

## Generated structures and protected cores

All ${generatedStartIntersections.length} Phase 0 generated-start records were intersected against the exact candidate. ${generatedStartsWithInfluenceIntersection.length} bound(s) intersect the candidate influence union. All ${protectedCoreIntersections.length} protected cores were evaluated; ${report.protectedCoreAudit.coresWithCandidateInfluenceIntersection} intersect.

These are exact bound/core comparisons only. Present fabric, positive construction margins, access, and hydrological influence remain HOLD.

## Z03 ↔ Z05 Houston coordination

Exact half-open Houston sample: X ${houstonBounds.minXInclusive}…${houstonBounds.maxXExclusive - 1}, Y ${houstonBounds.minYInclusive}…${houstonBounds.maxYExclusive - 1}, Z ${houstonBounds.minZInclusive}…${houstonBounds.maxZExclusive - 1}.

| Exact overlap set | Cells | Coordinate-set SHA-256 |
|---|---:|---|
${houstonRows}

The ${houstonInfluenceOverlap.length.toLocaleString('en-US')}-cell Z03/Z05 interaction set is a same-coordinate ownership conflict/coordination set. It accepts no seam, transfer, opening, owner, or construction.

## Proposed owner and interface registry

The candidate proposes a separate passive-shell steward and a separate internal-reservation steward. Neither is canonical. Five exact interface records cover the vertical roof/load transition, Z03/Z05 Houston overlap, sealed west cap, sealed east/Houston cap, and sealed utility endpoints. Every contract remains unaccepted and the global default-deny audit remains HOLD.

## Retained HOLDs

| Gate | Status | Basis |
|---|---|---|
${holdRows}

## Controlling decision

Retain the no-foreclosure reservation. Review this exact passive shell only if complete technical, owner/interface, and global-audit acceptance closes before the Grand Avenue surface release. If any HOLD remains, **build no shell**, keep every interface sealed/null, and do not fit out.
`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, json);
fs.writeFileSync(MARKDOWN, markdown);

process.stdout.write(`${JSON.stringify({
  output: relative(OUTPUT),
  markdown: relative(MARKDOWN),
  status: report.status,
  referenceLinePoints: referenceLine.length,
  outerEnvelopeCells: outerEnvelope.length,
  proposedMaterialGeometryCells: proposedMaterialGeometry.length,
  candidateInfluenceCells: influenceUnion.length,
  houstonInfluenceOverlapCells: houstonInfluenceOverlap.length,
  generatedStartIntersections: generatedStartsWithInfluenceIntersection.length,
  protectedCoreIntersections: report.protectedCoreAudit.coresWithCandidateInfluenceIntersection,
  acceptedConstructionCells: 0,
  operationCells: 0,
  worldEditAuthorized: false,
}, null, 2)}\n`);
