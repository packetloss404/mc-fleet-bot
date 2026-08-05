#!/usr/bin/env node
/**
 * Compile one deterministic, offline proposal registry for Combined Zones
 * Phase 1 ownership and interfaces.
 *
 * The compiler binds already-generated exact evidence. It proposes one-owner
 * partitions for known geometry and directional/default-deny interfaces, but
 * it does not self-accept owners, interfaces, technical designs, construction,
 * operations, or world edits.
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

const GENERATED_AT = value('--generated-at', '2026-08-05T06:00:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-proposed-ownership-interface-registry.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-proposed-ownership-interface-registry.md',
));

const INPUTS = Object.freeze({
  ownerAcceptance: 'docs/masterplans/05-combined-zones/phase1-owner-review-acceptance.json',
  g03CanonicalSetout: 'docs/masterplans/05-combined-zones/phase1-g03-canonical-setout.json',
  d02TechnicalDesign: 'docs/masterplans/05-combined-zones/phase1-d02-technical-design.json',
  d02C01Proposal:
    'docs/masterplans/05-combined-zones/phase1-d02-c01-ownership-loading-interface-proposal.json',
  d05FutureState: 'docs/masterplans/05-combined-zones/phase1-d05-future-state.json',
  d05OwnerPacket: 'docs/masterplans/05-combined-zones/phase1-d05-owner-acceptance-packet.json',
  b09TechnicalSystem:
    'docs/masterplans/05-combined-zones/phase1-b09-funicular-technical-system.json',
  connectorGeometry: 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  d06Mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  d06DetailedSetout:
    'docs/masterplans/05-combined-zones/phase1-d06-detailed-mechanism-setout.json',
  emptyEightGeology:
    'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
  b11ExternalInterface:
    'docs/masterplans/05-combined-zones/phase1-b11-external-interface-acceptance.json',
  b11SurfaceRoad:
    'docs/masterplans/05-combined-zones/phase1-b11-surface-road-technical-proposal.json',
  grandAvenuePassiveShell:
    'docs/masterplans/05-combined-zones/phase1-grand-avenue-passive-shell-candidate.json',
  completeSaveIntakeAudit:
    'docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit.json',
  residualSurfaceConnectorDomains:
    'docs/masterplans/05-combined-zones/phase1-residual-surface-connector-domain-proposals.json',
  civilLifeSafetyDomains:
    'docs/masterplans/05-combined-zones/phase1-civil-life-safety-domain-closure.json',
  b03Geometry: 'docs/masterplans/05-combined-zones/phase1-cheyenne-jcurve-geometry.json',
  d06LifeSafety:
    'docs/masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.json',
  d05Defaults:
    'docs/masterplans/05-combined-zones/phase1-d05-conservative-defaults.json',
});

const COORDINATE_PREAMBLE = 'combined-zones-coordinate-cell-set-v1';
const D06_SOURCE_PREAMBLE = 'combined-zones-d06-life-safety-cell-set-v1';
const GA_SOURCE_PREAMBLE = 'combined-zones-grand-avenue-passive-shell-candidate-cells-v1';
const B11_SOURCE_PREAMBLE = 'combined-zones-b11-surface-road-technical-proposal-cells-v1';
const REGISTRY_CELL_PREAMBLE = 'combined-zones-phase1-proposed-owner-cell-set-v1';
const REGISTRY_PAIR_PREAMBLE = 'combined-zones-phase1-directional-interface-pairs-v1';
const OWNER_MANIFEST_PREAMBLE = 'combined-zones-phase1-proposed-owner-registry-v1';
const INTERFACE_MANIFEST_PREAMBLE = 'combined-zones-phase1-proposed-interface-registry-v1';
const ADJUDICATION_MANIFEST_PREAMBLE =
  'combined-zones-phase1-proposed-ownership-adjudications-v1';
const WORLD_MIN_Y = -64;
const WORLD_MAX_Y = 319;
const ADDED_SOLID_MIN_Y = 72;
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const G04_SPARSE_PREAMBLE = 'combined-zones-g04-canonical-owner-sparse-intervals-v1';

const OWNER = Object.freeze({
  d02Drain: 'OWN-D02-C1-DRAINAGE-CONTROL',
  c1Rail: 'OWN-C1-RAIL-CESS-CONTROL',
  c1Road: 'OWN-C1-ROAD-COLLECTION-CONTROL',
  c01Tunnel: 'OWN-C01-OWNER-TUNNEL-CONTROL',
  c01Loading: 'OWN-C01-C1-LOADING-SEPARATION-RESERVATION-CONTROL',
  c1RailFormation: 'OWN-C1-RAIL-FORMATION-CONTROL',
  c1RoadSurface: 'OWN-C1-ROAD-SURFACE-CONTROL',
  c1RailLandTake: 'OWN-C1-RAIL-LAND-TAKE-DATUM-CONTROL',
  c1RoadLandTake: 'OWN-C1-ROAD-LAND-TAKE-DATUM-CONTROL',
  d05Relic: 'CZ05-PROTECTED-RELIC-CONTROL',
  d05Hydrology: 'CZ05-MOUNTAIN-HYDROLOGY-CONTROL',
  d05Construction: 'CZ05-SCOPE-CONSTRUCTION-CONTROL',
  d05B08: 'OWN-D05-B08-SERVICE-TUNNEL-CONTROL',
  d05B09: 'CZ05-Z11-FUNICULAR-CONTROL',
  d06EgA: 'OWN-D06-EG-A',
  d06EgB: 'OWN-D06-EG-B',
  d06Vent: 'OWN-D06-VENT',
  d06Smoke: 'OWN-D06-SMOKE',
  d06Barrier: 'OWN-D06-BARRIER',
  d06Power: 'OWN-D06-POWER',
  d06Drain: 'OWN-D06-DRAIN',
  d06Fire: 'OWN-D06-FIRE',
  d06B07: 'OWN-B07',
  gaShell: 'OWN-Z03-GRAND-AVENUE-PASSIVE-SHELL-CANDIDATE',
  gaReservation: 'OWN-P1-B12-GA-PASSIVE-SHELL-RESERVATIONS',
  z03Road: 'OWN-Z03-GRAND-AVENUE-SURFACE-ROAD-CONTROL',
  z05Houston: 'OWN-Z05-HOUSTON-CONTROL',
  b03: 'OWN-P1-B03-CHEYENNE-JCURVE-CONTROL',
  d06Reservation: 'OWN-D06-SOURCE-RESERVATION-CONTROL',
});

const D06_PRIORITY = [
  OWNER.d06Smoke,
  OWNER.d06Barrier,
  OWNER.d06EgA,
  OWNER.d06EgB,
  OWNER.d06Vent,
  OWNER.d06Power,
  OWNER.d06Drain,
  OWNER.d06Fire,
];

function invariant(condition, message) {
  if (!condition) throw new Error(`Combined Zones ownership registry rejected: ${message}`);
}

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8'));
}

function binding(relativePath, role) {
  const data = fs.readFileSync(absolute(relativePath));
  return { path: relativePath, bytes: data.length, sha256: sha256(data), role };
}

function compareCells(left, right) {
  return left.x - right.x || left.y - right.y || left.z - right.z;
}

function cellKey({ x, y, z }) {
  return `${x},${y},${z}`;
}

function uniqueCells(cells) {
  const result = new Map();
  for (const cell of cells) result.set(cellKey(cell), { x: cell.x, y: cell.y, z: cell.z });
  return [...result.values()].sort(compareCells);
}

function cellsIn(bounds) {
  const cells = [];
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) cells.push({ x, y, z });
    }
  }
  return cells;
}

function boundsOf(cells) {
  if (cells.length === 0) return null;
  const bounds = {
    minX: cells[0].x,
    maxX: cells[0].x,
    minY: cells[0].y,
    maxY: cells[0].y,
    minZ: cells[0].z,
    maxZ: cells[0].z,
  };
  for (let index = 1; index < cells.length; index += 1) {
    const { x, y, z } = cells[index];
    bounds.minX = Math.min(bounds.minX, x);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxY = Math.max(bounds.maxY, y);
    bounds.minZ = Math.min(bounds.minZ, z);
    bounds.maxZ = Math.max(bounds.maxZ, z);
  }
  return bounds;
}

function hashCells(cells, preamble = REGISTRY_CELL_PREAMBLE, finalNewline = true) {
  const exact = uniqueCells(cells);
  const records = exact.map(cellKey).join('\n');
  return sha256(`${preamble}\n${records}${finalNewline && records ? '\n' : ''}`);
}

function sourceCoordinateHash(cells) {
  return hashCells(cells, COORDINATE_PREAMBLE);
}

function d06SourceHash(cells) {
  return hashCells(cells, D06_SOURCE_PREAMBLE);
}

function gaSourceHash(cells, label) {
  return hashCells(cells, `${GA_SOURCE_PREAMBLE}-${label}`);
}

function b11SourceHash(cells, label) {
  return hashCells(cells, `${B11_SOURCE_PREAMBLE}-${label}`);
}

function setRecord(cells, derivation, extra = {}) {
  const exact = uniqueCells(cells);
  return {
    representation: 'EXACT_CELL_SET_HASH_ONLY',
    derivation,
    cellCount: exact.length,
    bounds: boundsOf(exact),
    coordinateSetSha256: hashCells(exact),
    ...extra,
  };
}

function difference(left, right) {
  const excluded = new Set(right.map(cellKey));
  return left.filter((cell) => !excluded.has(cellKey(cell)));
}

function intersection(left, right) {
  const included = new Set(right.map(cellKey));
  return left.filter((cell) => included.has(cellKey(cell)));
}

function union(...sets) {
  return uniqueCells(sets.flat());
}

function dilate(cells, radius) {
  const result = [];
  for (const cell of uniqueCells(cells)) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dz = -radius; dz <= radius; dz += 1) {
          result.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
        }
      }
    }
  }
  return uniqueCells(result);
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

  region(rx, rz) {
    const key = `${rx},${rz}`;
    if (!this.regions.has(key)) {
      const filename = path.join(this.directory, `r.${rx}.${rz}.mca`);
      this.regions.set(key, fs.existsSync(filename) ? fs.readFileSync(filename) : null);
    }
    return this.regions.get(key);
  }

  async chunk(cx, cz) {
    const key = `${cx},${cz}`;
    if (this.chunks.has(key)) return this.chunks.get(key);
    const buffer = this.region(Math.floor(cx / 32), Math.floor(cz / 32));
    invariant(buffer, `missing immutable region for chunk ${key}`);
    const index = ((cx & 31) + (cz & 31) * 32) * 4;
    const sectorOffset = buffer.readUIntBE(index, 3);
    const sectorCount = buffer[index + 3];
    invariant(sectorOffset && sectorCount, `missing immutable chunk ${key}`);
    const offset = sectorOffset * 4096;
    const size = buffer.readUInt32BE(offset);
    const compression = buffer.readUInt8(offset + 4);
    invariant(!(compression & 0x80), `external chunk storage unsupported at ${key}`);
    const compressed = buffer.subarray(offset + 5, offset + 4 + size);
    const { parsed } = await nbt.parse(decompress(compression, compressed));
    const data = nbt.simplify(parsed);
    invariant(data?.Status === 'minecraft:full', `chunk ${key} is not minecraft:full`);
    const result = {
      data,
      sections: new Map((data.sections ?? []).map((section) => [Number(section.Y), section])),
    };
    this.chunks.set(key, result);
    if (this.chunks.size > 80) this.chunks.delete(this.chunks.keys().next().value);
    return result;
  }

  async surfaceY(x, z) {
    const { data, sections } = await this.chunk(Math.floor(x / 16), Math.floor(z / 16));
    const columnIndex = (z & 15) * 16 + (x & 15);
    const heightMap = data.Heightmaps?.WORLD_SURFACE ?? data.Heightmaps?.WORLD_SURFACE_WG;
    let top = heightMap ? WORLD_MIN_Y + packedValue(heightMap, 9, columnIndex) - 1 : WORLD_MAX_Y;
    top = Math.min(WORLD_MAX_Y, top);
    for (let y = top; y >= WORLD_MIN_Y; y -= 1) {
      const states = sections.get(Math.floor(y / 16))?.block_states;
      const index = ((y & 15) << 8) | ((z & 15) << 4) | (x & 15);
      const state = states?.palette?.length
        ? states.palette[paletteIndex(states, index, 4)] ?? { Name: 'minecraft:air' }
        : { Name: 'minecraft:air' };
      if (!AIR.has(state.Name)) return y;
    }
    return WORLD_MIN_Y - 1;
  }
}

function columnKey(x, z) {
  return `${x},${z}`;
}

function parseColumnKey(key) {
  const [x, z] = key.split(',').map(Number);
  return { x, z };
}

function normalizeRanges(ranges) {
  const ordered = ranges
    .filter(({ start, end }) => Number.isInteger(start) && Number.isInteger(end) && start <= end)
    .sort((left, right) => left.start - right.start || left.end - right.end);
  const result = [];
  for (const range of ordered) {
    const last = result.at(-1);
    if (!last || range.start > last.end + 1) result.push({ ...range });
    else last.end = Math.max(last.end, range.end);
  }
  return result;
}

function subtractRanges(left, right) {
  let result = normalizeRanges(left);
  for (const exclusion of normalizeRanges(right)) {
    const next = [];
    for (const range of result) {
      if (exclusion.end < range.start || exclusion.start > range.end) next.push(range);
      else {
        if (range.start < exclusion.start) next.push({ start: range.start, end: exclusion.start - 1 });
        if (exclusion.end < range.end) next.push({ start: exclusion.end + 1, end: range.end });
      }
    }
    result = next;
  }
  return result;
}

function addRanges(map, x, z, ranges) {
  if (ranges.length === 0) return;
  const key = columnKey(x, z);
  map.set(key, normalizeRanges([...(map.get(key) ?? []), ...ranges]));
}

function rangesCount(ranges) {
  return ranges.reduce((sum, { start, end }) => sum + end - start + 1, 0);
}

function pointExcludedRanges(start, end, excludedY) {
  if (start > end) return [];
  return subtractRanges(
    [{ start, end }],
    [...new Set(excludedY)].map((y) => ({ start: y, end: y })),
  );
}

function faceShell(intervalMap) {
  const candidates = new Map();
  for (const [key, ranges] of intervalMap) {
    const { x, z } = parseColumnKey(key);
    for (const range of ranges) {
      addRanges(candidates, x, z, [
        { start: range.start - 1, end: range.start - 1 },
        { start: range.end + 1, end: range.end + 1 },
      ]);
      addRanges(candidates, x - 1, z, [range]);
      addRanges(candidates, x + 1, z, [range]);
      addRanges(candidates, x, z - 1, [range]);
      addRanges(candidates, x, z + 1, [range]);
    }
  }
  const result = new Map();
  for (const [key, ranges] of candidates) {
    const { x, z } = parseColumnKey(key);
    addRanges(result, x, z, subtractRanges(ranges, intervalMap.get(key) ?? []));
  }
  return result;
}

function intervalMapCells(map) {
  const cells = [];
  for (const [key, ranges] of map) {
    const { x, z } = parseColumnKey(key);
    for (const { start, end } of ranges) {
      for (let y = start; y <= end; y += 1) cells.push({ x, y, z });
    }
  }
  return uniqueCells(cells);
}

function intervalMapHas(map, cell) {
  return (map.get(columnKey(cell.x, cell.z)) ?? [])
    .some(({ start, end }) => cell.y >= start && cell.y <= end);
}

function subtractCellsFromIntervalMap(map, cells) {
  const exclusions = new Map();
  for (const cell of uniqueCells(cells)) {
    const key = columnKey(cell.x, cell.z);
    if (!exclusions.has(key)) exclusions.set(key, []);
    exclusions.get(key).push({ start: cell.y, end: cell.y });
  }
  const result = new Map();
  for (const [key, ranges] of map) {
    const { x, z } = parseColumnKey(key);
    addRanges(result, x, z, subtractRanges(ranges, exclusions.get(key) ?? []));
  }
  return result;
}

function intervalMapRecord(map, ownerId) {
  const records = [...map.entries()].map(([key, ranges]) => ({
    ...parseColumnKey(key), ranges: normalizeRanges(ranges),
  })).sort((left, right) => left.x - right.x || left.z - right.z);
  const digest = crypto.createHash('sha256').update(`${G04_SPARSE_PREAMBLE}\n${ownerId}\n`);
  let cellCount = 0;
  let intervalCount = 0;
  let bounds = null;
  for (const record of records) {
    if (record.ranges.length === 0) continue;
    digest.update(`${record.x},${record.z}\t${record.ranges
      .map(({ start, end }) => `${start}..${end}`).join(',')}\n`);
    cellCount += rangesCount(record.ranges);
    intervalCount += record.ranges.length;
    const minY = record.ranges[0].start;
    const maxY = record.ranges.at(-1).end;
    bounds = bounds ? {
      minX: Math.min(bounds.minX, record.x), maxX: Math.max(bounds.maxX, record.x),
      minY: Math.min(bounds.minY, minY), maxY: Math.max(bounds.maxY, maxY),
      minZ: Math.min(bounds.minZ, record.z), maxZ: Math.max(bounds.maxZ, record.z),
    } : { minX: record.x, maxX: record.x, minY, maxY, minZ: record.z, maxZ: record.z };
  }
  return {
    representation: 'SOURCE_BOUND_SPARSE_EXACT_INTEGER_Y_INTERVAL_OWNER_ASSIGNMENT',
    cellCount,
    bounds,
    sparseIntervals: {
      preamble: `${G04_SPARSE_PREAMBLE}\\n${ownerId}\\n`,
      record: 'x,z<TAB>inclusive-y-start..inclusive-y-end[,start..end]',
      columnRecordCount: records.filter(({ ranges }) => ranges.length > 0).length,
      intervalCount,
      intervalManifestSha256: digest.digest('hex'),
    },
  };
}

function intervalManifestHash(map, preamble) {
  const digest = crypto.createHash('sha256').update(preamble);
  const records = [...map.entries()].map(([key, ranges]) => ({
    ...parseColumnKey(key), ranges: normalizeRanges(ranges),
  })).sort((left, right) => left.x - right.x || left.z - right.z);
  for (const record of records) {
    if (record.ranges.length === 0) continue;
    digest.update(`${record.x},${record.z}\t${record.ranges
      .map(({ start, end }) => `${start}..${end}`).join(',')}\n`);
  }
  return digest.digest('hex');
}

function insideHalfOpen(cell, bounds) {
  return cell.x >= bounds.minXInclusive && cell.x < bounds.maxXExclusive
    && cell.y >= bounds.minYInclusive && cell.y < bounds.maxYExclusive
    && cell.z >= bounds.minZInclusive && cell.z < bounds.maxZExclusive;
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

function mountainSurface(x, z, model) {
  const dx = x - model.center.x;
  const dz = z - model.center.z;
  const xDenominator = dx < 0 ? model.extents.west : model.extents.east;
  const zDenominator = dz < 0 ? model.extents.north : model.extents.south;
  if (Math.abs(dx) > xDenominator || Math.abs(dz) > zDenominator) return null;
  let numerator;
  let denominator;
  if (Math.abs(dx) * zDenominator >= Math.abs(dz) * xDenominator) {
    numerator = Math.abs(dx);
    denominator = xDenominator;
  } else {
    numerator = Math.abs(dz);
    denominator = zDenominator;
  }
  return model.baseSurfaceY + Math.floor(
    (model.peakSurfaceY - model.baseSurfaceY) * (denominator - numerator) / denominator,
  );
}

function direction(from, to) {
  return { x: Math.sign(to.x - from.x), z: Math.sign(to.z - from.z) };
}

function buildB08Interaction(connector) {
  const excavation = [];
  for (const point of connector.serviceTunnelCenterline.centerline.points) {
    for (const orientation of point.orientations) {
      for (let lateral = -2; lateral <= 3; lateral += 1) {
        for (let vertical = -1; vertical <= 4; vertical += 1) {
          excavation.push(orientation === 'x'
            ? { x: point.x, y: point.y + vertical, z: point.z + lateral }
            : { x: point.x + lateral, y: point.y + vertical, z: point.z });
        }
      }
    }
  }
  return dilate(excavation, 1);
}

function buildB09Reservation(model, route) {
  const portal = route.from;
  const summit = route.to;
  let climbZ = portal.z - 1;
  while (climbZ > summit.z && mountainSurface(portal.x, climbZ - 1, model)
    !== mountainSurface(portal.x, climbZ, model)) climbZ -= 1;
  invariant(climbZ > summit.z, 'FM-01 B09 level curve missing');
  let throatX = null;
  for (let distance = 1; distance <= model.extents.east; distance += 1) {
    const x = portal.x + distance;
    if (mountainSurface(x, climbZ, model) === portal.y - 1
      && mountainSurface(x - 1, climbZ, model) === portal.y - 1) {
      throatX = x;
      break;
    }
  }
  invariant(throatX !== null, 'FM-01 B09 throat missing');
  const faceRun = throatX - portal.x;
  const points = [];
  for (let distance = 0; distance <= faceRun; distance += 1) {
    points.push({ x: portal.x + distance, y: portal.y, z: portal.z });
  }
  for (let offset = 1; offset <= portal.z - climbZ; offset += 1) {
    points.push({ x: throatX, y: portal.y, z: portal.z - offset });
  }
  for (let distance = 1; distance <= faceRun; distance += 1) {
    const x = throatX - distance;
    points.push({ x, y: mountainSurface(x, climbZ, model) + 1, z: climbZ });
  }
  for (let distance = 1; distance <= Math.abs(summit.z - climbZ); distance += 1) {
    const z = climbZ - distance;
    points.push({ x: summit.x, y: mountainSurface(summit.x, z, model) + 1, z });
  }
  const steps = points.slice(1).map((point, index) => ({
    horizontal: Math.abs(point.x - points[index].x) + Math.abs(point.z - points[index].z),
    vertical: point.y - points[index].y,
  }));
  invariant(steps.every(({ horizontal, vertical }) => horizontal === 1 && Math.abs(vertical) <= 1),
    'FM-01 B09 route is not cardinal <=1:1');
  for (let index = 1; index < points.length - 1; index += 1) {
    const before = direction(points[index - 1], points[index]);
    const after = direction(points[index], points[index + 1]);
    if (before.x !== after.x || before.z !== after.z) {
      invariant(points[index - 1].y === points[index].y
        && points[index + 1].y === points[index].y, 'FM-01 B09 curve is sloped');
    }
  }
  return dilate(points.flatMap(({ x, y, z }) => [
    { x, y, z },
    { x, y: y + 1, z },
  ]), 1);
}

function reference(ownerId, scopeId, cellSet, identityType = 'COORDINATE_SET') {
  return {
    ownerId,
    scopeId,
    identityType,
    cellCount: cellSet.cellCount,
    coordinateSetSha256: identityType === 'COORDINATE_SET'
      ? cellSet.coordinateSetSha256
      : null,
    sparseManifestSha256: identityType === 'COORDINATE_SET'
      ? null
      : cellSet.sparseManifestSha256 ?? cellSet.coordinateSetSha256,
    bounds: cellSet.bounds ?? null,
    source: cellSet.source ?? null,
  };
}

function ownerRecord(ownerId, scope, role, references, options = {}) {
  const record = {
    ownerId,
    scope,
    role,
    proposalStatus: options.proposalStatus
      ?? 'PROPOSED_LOGICAL_OWNER_EXACT_ASSIGNMENT_NOT_ACCEPTED',
    proposedCellCount: Object.hasOwn(options, 'proposedCellCount')
      ? options.proposedCellCount
      : references.reduce((sum, item) => sum + item.cellCount, 0),
    proposedCoordinateSetSha256: options.proposedCoordinateSetSha256 ?? null,
    assignmentReferences: references,
    assignmentReferenceManifestSha256: sha256([
      `${OWNER_MANIFEST_PREAMBLE}-${ownerId}`,
      ...[...references].sort((a, b) => a.scopeId.localeCompare(b.scopeId)).map((item) => (
        `${item.scopeId}\t${item.identityType}\t${item.cellCount}\t`
        + `${item.coordinateSetSha256 ?? item.sparseManifestSha256 ?? 'null'}`
      )),
      '',
    ].join('\n')),
    exactCellAssignmentAccepted: false,
    acceptedBy: null,
    ...options.extra,
  };
  record.ownerRecordIdentitySha256 = sha256(JSON.stringify(record));
  return record;
}

function pairHash(pairs) {
  const sorted = [...pairs].sort((left, right) => (
    compareCells(left.from, right.from) || compareCells(left.to, right.to)
  ));
  const digest = crypto.createHash('sha256').update(`${REGISTRY_PAIR_PREAMBLE}\n`);
  for (const pair of sorted) {
    digest.update(`${cellKey(pair.from)}>${cellKey(pair.to)}\n`);
  }
  return digest.digest('hex');
}

function b11PairHash(pairs, label) {
  const sorted = [...pairs].sort((left, right) => (
    compareCells(left.from, right.from) || compareCells(left.to, right.to)
  ));
  const digest = crypto.createHash('sha256')
    .update(`combined-zones-b11-surface-road-technical-proposal-pairs-v1-${label}\n`);
  for (const pair of sorted) digest.update(`${cellKey(pair.from)}>${cellKey(pair.to)}\n`);
  return digest.digest('hex');
}

function exactInterface({
  id,
  scope,
  fromOwnerId,
  toOwnerId,
  direction: interfaceDirection,
  relationship,
  cells = null,
  cellSet = null,
  pairs = null,
  transitionPairCount = null,
  transitionPairManifestSha256 = null,
  ownershipSemantics = 'CANONICAL_OCCUPANT_OR_BOUNDARY_STEWARD',
  status = null,
  qualification = null,
}) {
  invariant(interfaceDirection && !interfaceDirection.includes('BIDIRECTIONAL'),
    `${id} is not directional`);
  invariant(!id.includes('*') && !fromOwnerId?.includes('*') && !toOwnerId?.includes('*'),
    `${id} uses a wildcard`);
  const exactSet = cells ? setRecord(cells, `${id} exact interface cells`) : cellSet;
  const record = {
    contractId: id,
    scope,
    fromOwnerId,
    toOwnerId,
    direction: interfaceDirection,
    relationship,
    interfaceCellSet: exactSet,
    transitionPairCount: pairs?.length ?? transitionPairCount,
    transitionPairManifestSha256: pairs ? pairHash(pairs) : transitionPairManifestSha256,
    beforeStateSetSha256: null,
    futureStateSetSha256: null,
    receiverId: null,
    ownershipSemantics,
    defaultDeny: true,
    wildcardAllowed: false,
    lastWriterWinsAllowed: false,
    accepted: false,
    acceptedBy: null,
    status: status ?? (exactSet
      ? 'HOLD_EXACT_DIRECTIONAL_PROPOSAL_STATES_OR_COUNTERPART_ACCEPTANCE_MISSING'
      : 'HOLD_INTERFACE_GEOMETRY_MISSING_DEFAULT_DENY'),
    qualification,
  };
  record.interfaceRecordIdentitySha256 = sha256(JSON.stringify(record));
  return record;
}

function adjacencyContracts(scope, cellOwners) {
  const groups = new Map();
  const directions = [
    { dx: 1, dy: 0, dz: 0, name: 'POSITIVE_X' },
    { dx: 0, dy: 1, dz: 0, name: 'POSITIVE_Y' },
    { dx: 0, dy: 0, dz: 1, name: 'POSITIVE_Z' },
  ];
  for (const [key, ownerId] of cellOwners) {
    const [x, y, z] = key.split(',').map(Number);
    for (const offset of directions) {
      const neighbor = { x: x + offset.dx, y: y + offset.dy, z: z + offset.dz };
      const neighborOwner = cellOwners.get(cellKey(neighbor));
      if (!neighborOwner || neighborOwner === ownerId) continue;
      const groupKey = `${ownerId}>${neighborOwner}:${offset.name}`;
      if (!groups.has(groupKey)) groups.set(groupKey, {
        fromOwnerId: ownerId,
        toOwnerId: neighborOwner,
        direction: offset.name,
        pairs: [],
      });
      groups.get(groupKey).pairs.push({ from: { x, y, z }, to: neighbor });
    }
  }
  return [...groups.values()].sort((left, right) => (
    `${left.fromOwnerId}>${left.toOwnerId}:${left.direction}`
      .localeCompare(`${right.fromOwnerId}>${right.toOwnerId}:${right.direction}`)
  )).map((group, index) => {
    invariant(group.pairs.every(({ from, to }) => (
      cellOwners.get(cellKey(from)) === group.fromOwnerId
      && cellOwners.get(cellKey(to)) === group.toOwnerId
    )), `${scope} adjacency endpoint owner drift`);
    return exactInterface({
      id: `IF-${scope}-ADJ-${String(index + 1).padStart(2, '0')}`,
      scope,
      fromOwnerId: group.fromOwnerId,
      toOwnerId: group.toOwnerId,
      direction: group.direction,
      relationship: 'EXACT_FACE_ADJACENCY_DEFAULT_DENY_NO_TRANSFER',
      cells: uniqueCells(group.pairs.flatMap(({ from, to }) => [from, to])),
      pairs: group.pairs,
      status: 'HOLD_EXACT_DIRECTIONAL_ADJACENCY_PROPOSAL_NOT_ACCEPTED',
    });
  });
}

function expandedToSparseAdjacencyContracts(scope, expandedCellOwners, sparseIntervals, sparseOwnerId) {
  const groups = new Map();
  const directions = [
    { dx: 1, dy: 0, dz: 0, name: 'POSITIVE_X' },
    { dx: 0, dy: 1, dz: 0, name: 'POSITIVE_Y' },
    { dx: 0, dy: 0, dz: 1, name: 'POSITIVE_Z' },
  ];
  for (const [key, expandedOwnerId] of expandedCellOwners) {
    const [x, y, z] = key.split(',').map(Number);
    for (const offset of directions) {
      const endpoints = [
        {
          from: { x, y, z },
          to: { x: x + offset.dx, y: y + offset.dy, z: z + offset.dz },
          fromOwnerId: expandedOwnerId,
          toOwnerId: sparseOwnerId,
        },
        {
          from: { x: x - offset.dx, y: y - offset.dy, z: z - offset.dz },
          to: { x, y, z },
          fromOwnerId: sparseOwnerId,
          toOwnerId: expandedOwnerId,
        },
      ];
      for (const endpoint of endpoints) {
        const sparseCell = endpoint.fromOwnerId === sparseOwnerId
          ? endpoint.from : endpoint.to;
        if (!intervalMapHas(sparseIntervals, sparseCell)) continue;
        const groupKey = `${endpoint.fromOwnerId}>${endpoint.toOwnerId}:${offset.name}`;
        if (!groups.has(groupKey)) groups.set(groupKey, {
          fromOwnerId: endpoint.fromOwnerId,
          toOwnerId: endpoint.toOwnerId,
          direction: offset.name,
          pairs: [],
        });
        groups.get(groupKey).pairs.push({ from: endpoint.from, to: endpoint.to });
      }
    }
  }
  return [...groups.values()].sort((left, right) => (
    `${left.fromOwnerId}>${left.toOwnerId}:${left.direction}`
      .localeCompare(`${right.fromOwnerId}>${right.toOwnerId}:${right.direction}`)
  )).map((group, index) => exactInterface({
    id: `IF-${scope}-ADJ-${String(index + 1).padStart(2, '0')}`,
    scope,
    fromOwnerId: group.fromOwnerId,
    toOwnerId: group.toOwnerId,
    direction: group.direction,
    relationship: 'EXACT_FACE_ADJACENCY_DEFAULT_DENY_NO_TRANSFER',
    cells: uniqueCells(group.pairs.flatMap(({ from, to }) => [from, to])),
    pairs: group.pairs,
    status: 'HOLD_EXACT_DIRECTIONAL_ADJACENCY_PROPOSAL_NOT_ACCEPTED',
  }));
}

function buildD06DetailedCanonicalLayerMap(payload, emptyEightSource, detailedArtifact) {
  const rawLayers = new Map();
  const add = (id, cells) => {
    invariant(!rawLayers.has(id), `duplicate reconstructed D06 layer ${id}`);
    rawLayers.set(id, uniqueCells(cells));
  };

  for (const system of payload.protectedEgressAndLiftSystems) {
    const prefix = system.coreId.toLowerCase().replace('-', '');
    const combinedBounds = system.combinedProtectedCoreReservation.bounds;
    const stairBounds = system.protectedStairReservation.bounds;
    const liftBounds = system.accessibleLiftReservation.bounds;
    const transfer = union(
      cellsIn({ ...combinedBounds, maxY: combinedBounds.minY }),
      cellsIn(system.roofTransitionCap.bounds),
      cellsIn(system.surfaceOutletCap.bounds),
    );
    add(`${prefix}TransferLandings`, transfer);
    add(`${prefix}LiftEquipmentCaps`, union(
      cellsIn({ ...liftBounds, maxY: liftBounds.minY }),
      cellsIn({ ...liftBounds, minY: liftBounds.maxY }),
    ));
    add(`${prefix}StairEquipmentCaps`, union(
      cellsIn({ ...stairBounds, maxY: stairBounds.minY }),
      cellsIn({ ...stairBounds, minY: stairBounds.maxY }),
    ));
    add(`${prefix}LiftEnvelope`, cellsIn(liftBounds));
    add(`${prefix}StairEnvelope`, cellsIn(stairBounds));
  }

  const ventDucts = [];
  const ventFans = [];
  const ventOutlets = [];
  for (const system of payload.ventSystems) {
    const bounds = system.exactRiserReservation.bounds;
    const fan = cellsIn({ ...bounds, maxY: bounds.minY });
    const outlet = cellsIn({ ...bounds, minY: bounds.maxY });
    ventFans.push(...fan);
    ventOutlets.push(...outlet);
    ventDucts.push(...difference(cellsIn(bounds), union(fan, outlet)));
  }
  add('ventFanEquipmentBays', ventFans);
  add('ventOutletCaps', ventOutlets);
  add('ventDuctEnvelopes', ventDucts);

  const smokeDoorBays = [];
  for (const boundary of payload.smokeAndBarrierSystems.smokeBoundaries) {
    smokeDoorBays.push(...[1670, 1720, 1770, 1820].flatMap((minX) => cellsIn({
      minX,
      maxX: minX + 2,
      minY: 49,
      maxY: 51,
      minZ: boundary.staticOpeningCaps.bounds.minZ,
      maxZ: boundary.staticOpeningCaps.bounds.maxZ,
    })));
  }
  const platformGateBays = [];
  for (const barrier of payload.smokeAndBarrierSystems.platformBarriers) {
    const z = barrier.staticGateBayCap.bounds.minZ;
    platformGateBays.push(...[1664, 1688, 1712, 1736].flatMap((minX) => cellsIn({
      minX,
      maxX: minX + 2,
      minY: 42,
      maxY: 43,
      minZ: z,
      maxZ: z,
    })));
  }
  add('smokeDoorMechanismBays', smokeDoorBays);
  add('platformGateMechanismBays', platformGateBays);

  const fixtureX = [1660, 1676, 1692, 1708, 1724, 1740, 1748];
  const fixtureZ = [];
  const fixtureCells = [];
  for (const fixture of payload.lightingAndPowerSystem.exactFixtureReservations) {
    const z = fixture.reservation.bounds.minZ;
    fixtureZ.push(z);
    fixtureCells.push(...fixtureX.map((x) => ({ x, y: 46, z })));
  }
  add('lightingFixtureReservations', fixtureCells);
  const addCircuit = (id, y) => {
    const trunk = cellsIn({ minX: 1750, maxX: 1750, minY: y, maxY: y,
      minZ: 54, maxZ: 153 });
    const branches = fixtureZ.flatMap((z) => cellsIn({
      minX: Math.min(...fixtureX), maxX: 1750, minY: y, maxY: y, minZ: z, maxZ: z,
    }));
    const approach = union(
      cellsIn({ minX: 1750, maxX: 1750, minY: y, maxY: y, minZ: 154, maxZ: 157 }),
      cellsIn({ minX: 1751, maxX: 1753, minY: y, maxY: y, minZ: 157, maxZ: 157 }),
    );
    add(`${id}Carrier`, union(trunk, branches, approach));
    add(`${id}Equipment`, cellsIn({
      minX: 1754, maxX: 1756, minY: y, maxY: y, minZ: 156, maxZ: 158,
    }));
  };
  addCircuit('normalCircuit', 44);
  addCircuit('emergencyCircuitA', 45);
  addCircuit('emergencyCircuitB', 47);

  const localDrainCaps = [];
  const localSumpPumpBays = [];
  for (const item of payload.cappedDrainageSystem.localCaps) {
    localDrainCaps.push(...cellsIn(item.cap.bounds));
    localSumpPumpBays.push(...cellsIn({
      minX: item.cap.bounds.minX - 1,
      maxX: item.cap.bounds.maxX + 1,
      minY: item.cap.bounds.minY + 1,
      maxY: item.cap.bounds.maxY + 1,
      minZ: item.cap.bounds.minZ,
      maxZ: item.cap.bounds.maxZ,
    }));
  }
  add('localDrainageInterfaceCaps', localDrainCaps);
  add('localSumpPumpEquipmentBays', localSumpPumpBays);
  add('unconnectedDrainHeaderReservation', cellsIn(
    payload.cappedDrainageSystem.retainedUnconnectedHeaderReservation.bounds,
  ));
  add('externalDrainBoundaryCap', cellsIn(
    payload.cappedDrainageSystem.retainedExternalBoundaryCap.bounds,
  ));

  const fire = payload.fireServiceSystem;
  add('fireServiceControlPanels', emptyEightSource.d06.platforms.map(({ trackCenterlineZ }) => ({
    x: 1846, y: 52, z: trackCenterlineZ,
  })));
  add('fireServiceInterfaceCap', cellsIn(fire.normallyClosedSpineInterfaceCap.bounds));
  add('fireSurfaceApproachCap', cellsIn(fire.sealedSurfaceApproachInterface.bounds));
  add('fireSurfaceCompoundReservation', cellsIn(fire.surfaceCompoundReservation.bounds));
  add('fireServiceSpineReservation', cellsIn(fire.internalSpineReservation.bounds));

  const priority = detailedArtifact.deterministicSetoutContract.priority;
  invariant(priority.length === 31 && priority.every((id) => rawLayers.has(id)),
    'D06 detailed reconstruction priority coverage drift');
  const memberships = new Map();
  for (const layerId of priority) {
    for (const cell of rawLayers.get(layerId)) {
      const key = cellKey(cell);
      if (!memberships.has(key)) memberships.set(key, { cell, layers: [] });
      memberships.get(key).layers.push(layerId);
    }
  }
  const canonicalByLayer = new Map(priority.map((id) => [id, []]));
  const canonicalLayerMap = new Map();
  for (const [key, entry] of memberships) {
    const winner = entry.layers[0];
    canonicalByLayer.get(winner).push(entry.cell);
    canonicalLayerMap.set(key, winner);
  }
  invariant(canonicalLayerMap.size === 9_065, 'D06 detailed canonical map size drift');
  for (const layerId of priority) {
    const cells = canonicalByLayer.get(layerId);
    const expected = detailedArtifact.exactDetailedProposalLayers.proposalLayers[layerId]
      .canonicalProposalCellSetAfterPrecedence;
    invariant(cells.length === expected.cellCount
      && d06SourceHash(cells) === expected.coordinateSetSha256,
    `D06 detailed canonical reconstruction drift for ${layerId}`);
  }
  return canonicalLayerMap;
}

const sourceBindings = {
  ownerAcceptance: binding(INPUTS.ownerAcceptance, 'accepted Phase 1 planning authority'),
  g03CanonicalSetout: binding(
    INPUTS.g03CanonicalSetout,
    'G03 v3 canonical setout with all thirty required domains exact and G03 PASS',
  ),
  d02TechnicalDesign: binding(INPUTS.d02TechnicalDesign, 'exact D02 candidate assets/inlets'),
  d02C01Proposal: binding(
    INPUTS.d02C01Proposal,
    'exact bounded C01 loading-separation ownership and directional interfaces',
  ),
  d05FutureState: binding(INPUTS.d05FutureState, 'exact sparse FM-01/support proposal'),
  d05OwnerPacket: binding(INPUTS.d05OwnerPacket, 'D05 ownership/interface contract'),
  b09TechnicalSystem: binding(
    INPUTS.b09TechnicalSystem,
    'exact B09 technical reservations and sealed endpoint interfaces',
  ),
  connectorGeometry: binding(INPUTS.connectorGeometry, 'exact B08 geometry'),
  d06Mechanisms: binding(INPUTS.d06Mechanisms, 'exact D06 reservation/mechanism ledger'),
  d06DetailedSetout: binding(
    INPUTS.d06DetailedSetout,
    'exact 31-layer D06 detailed functional setout and precedence manifest',
  ),
  emptyEightGeology: binding(
    INPUTS.emptyEightGeology,
    'frozen Empty Eight internal geometry used by the D06 detailed setout',
  ),
  b11ExternalInterface: binding(
    INPUTS.b11ExternalInterface,
    'immutable owner-accepted 299-point B11 planning profile',
  ),
  b11SurfaceRoad: binding(
    INPUTS.b11SurfaceRoad,
    'exact B11 road, interaction, load, drainage, and utility proposal geometry',
  ),
  grandAvenuePassiveShell: binding(
    INPUTS.grandAvenuePassiveShell,
    'exact P1-B12 passive-shell candidate',
  ),
  completeSaveIntakeAudit: binding(
    INPUTS.completeSaveIntakeAudit,
    'complete-save default-deny dependency',
  ),
  residualSurfaceConnectorDomains: binding(
    INPUTS.residualSurfaceConnectorDomains,
    'seven exact G03 v3 surface/connector domain closures',
  ),
  civilLifeSafetyDomains: binding(
    INPUTS.civilLifeSafetyDomains,
    'eight exact G03 v3 civil/life-safety domain closures',
  ),
  b03Geometry: binding(INPUTS.b03Geometry, 'exact B03 construction and interaction cells'),
  d06LifeSafety: binding(INPUTS.d06LifeSafety, 'exact D06 source reservation geometry'),
  d05Defaults: binding(INPUTS.d05Defaults, 'exact D05 protected-relic no-fill geometry'),
};
const ownerAcceptance = readJson(INPUTS.ownerAcceptance);
const g03 = readJson(INPUTS.g03CanonicalSetout);
const d02 = readJson(INPUTS.d02TechnicalDesign);
const d02C01 = readJson(INPUTS.d02C01Proposal);
const d05 = readJson(INPUTS.d05FutureState);
const d05Packet = readJson(INPUTS.d05OwnerPacket);
const b09Technical = readJson(INPUTS.b09TechnicalSystem);
const connector = readJson(INPUTS.connectorGeometry);
const d06 = readJson(INPUTS.d06Mechanisms);
const d06Detailed = readJson(INPUTS.d06DetailedSetout);
const emptyEight = readJson(INPUTS.emptyEightGeology);
const b11External = readJson(INPUTS.b11ExternalInterface);
const b11Road = readJson(INPUTS.b11SurfaceRoad);
const grand = readJson(INPUTS.grandAvenuePassiveShell);
const completeSave = readJson(INPUTS.completeSaveIntakeAudit);
const residualDomains = readJson(INPUTS.residualSurfaceConnectorDomains);
const civilDomains = readJson(INPUTS.civilLifeSafetyDomains);
const b03Geometry = readJson(INPUTS.b03Geometry);
const d06LifeSafety = readJson(INPUTS.d06LifeSafety);
const d05Defaults = readJson(INPUTS.d05Defaults);

invariant(ownerAcceptance.effectivePlanningDisposition?.d02PlanningPolicyAccepted === true
  && ownerAcceptance.effectivePlanningDisposition?.d05PlanningPolicyAccepted === true
  && ownerAcceptance.effectivePlanningDisposition?.d06PlanningPolicyAccepted === true
  && ownerAcceptance.effectivePlanningDisposition?.p1B11PlanningBasisAccepted === true,
  'planning authority is incomplete');
invariant(ownerAcceptance.effectivePlanningDisposition?.technicalHoldPassedCount === 0,
  'planning authority unexpectedly passes technical holds');
invariant(g03.schemaVersion === 3 && g03.gate?.exactRequiredDomainCount === 30
  && g03.gate?.unresolvedRequiredDomainCount === 0
  && g03.gate?.g03Passed === true && g03.canonicalPayloadSha256,
  'G03 v3 has not reached complete exact-integer proposal setout');
invariant(g03.safetyBoundary?.acceptedConstructionCellCount === 0
  && g03.safetyBoundary?.operationCellCount === 0,
  'G03 v3 unexpectedly carries accepted construction or operation authority');
invariant(residualDomains.proposalPayloadSha256
  === g03.v3IntegrationDelta.boundSourceIdentities
    .residualSurfaceConnectorProposalPayloadSha256
  && civilDomains.canonicalPayloadSha256
    === g03.v3IntegrationDelta.boundSourceIdentities.civilLifeSafetyCanonicalPayloadSha256,
'G03 v3 closure package bindings drift');
invariant(d02.sourceBindings?.ownerAcceptance?.sha256 === sourceBindings.ownerAcceptance.sha256,
  'D02 owner binding is stale');
invariant(d02C01.proposalPayloadSha256
  && d02C01.gate?.finalAcceptance === null
  && d02C01.gate?.operationGenerationAuthorized === false,
  'D02/C01 proposal authority boundary drift');
invariant(d05.sourceBindings?.ownerAcceptance?.sha256 === sourceBindings.ownerAcceptance.sha256,
  'D05 owner binding is stale');
invariant(d05.sourceBindings?.d05OwnerPacket?.sha256 === sourceBindings.d05OwnerPacket.sha256,
  'D05 packet binding is stale');
invariant(d05.sourceBindings?.connectorGeometry?.sha256 === sourceBindings.connectorGeometry.sha256,
  'D05 connector binding is stale');
invariant(b09Technical.reportIdentitySha256
  && b09Technical.safetyBoundary?.acceptedOwnerAssignmentCount === 0
  && b09Technical.safetyBoundary?.operationCellCount === 0,
  'B09 technical proposal authority boundary drift');
invariant(d06.sourceBindings?.ownerAcceptance?.sha256 === sourceBindings.ownerAcceptance.sha256,
  'D06 owner binding is stale');
invariant(d06.sourceBindings?.d02TechnicalDesign?.sha256 === sourceBindings.d02TechnicalDesign.sha256,
  'D06 D02 binding is stale');
invariant(d06Detailed.exactDetailedProposalLayers?.canonicalProposalCellCountAfterPrecedence
  === 9_065
  && d06Detailed.internalDuplicateAndPrecedenceAudit?.sharedCanonicalAssignmentCount === 0
  && d06Detailed.internalDuplicateAndPrecedenceAudit?.lastWriterWinsCount === 0,
  'D06 detailed one-owner partition drift');
invariant(d06Detailed.sourceBindings?.emptyEight?.sha256
  === sourceBindings.emptyEightGeology.sha256,
  'D06 detailed Empty Eight binding is stale');
invariant(b11Road.authorityBoundary?.b11PlanningProfileAcceptedBySoleOwner === true
  && b11Road.authorityBoundary?.canonicalOwnershipAccepted === false
  && b11Road.safetyBoundary?.operationCellCount === 0,
  'B11 road proposal authority boundary drift');
invariant(b11External.authority?.acceptancePayloadSha256
  === b11Road.authorityBoundary.b11AcceptancePayloadSha256,
  'B11 accepted profile payload binding drift');
invariant(grand.sourceBindings?.ownerReview?.sha256 === sourceBindings.ownerAcceptance.sha256,
  'P1-B12 owner binding is stale');
invariant(grand.authorityBoundary?.canonicalOwnershipAccepted === false
  && grand.authorityBoundary?.interfaceContractsAccepted === false,
  'P1-B12 unexpectedly has accepted owners/interfaces');
invariant(completeSave.status === 'HOLD_INCOMPLETE_OR_UNBOUND_SAVE',
  'complete-save dependency changed and requires explicit reconciliation');

function resolveJsonPointer(document, pointer) {
  invariant(typeof pointer === 'string' && pointer.startsWith('/'),
    `invalid JSON pointer ${pointer}`);
  return pointer.slice(1).split('/').reduce((current, encoded) => {
    const key = encoded.replace(/~1/g, '/').replace(/~0/g, '~');
    invariant(current !== null && current !== undefined
      && Object.prototype.hasOwnProperty.call(current, key),
    `missing JSON pointer ${pointer}`);
    return current[key];
  }, document);
}

function rawCoordinateHash(cells) {
  return sha256(uniqueCells(cells).map(cellKey).join('\n'));
}

const d06G04Payload = d06.mechanismDevelopmentPayload;
const b07Anchors = d06G04Payload.b07WestTwoSystem.anchors;
const b07ShiftedX = b07Anchors.observationLanding.x - 2;
const b07ConstructionCells = union(
  cellsIn({
    minX: b07Anchors.top.x - 3, maxX: b07Anchors.top.x + 3,
    minY: b07Anchors.observationLanding.y, maxY: b07Anchors.top.y,
    minZ: b07Anchors.top.z - 3, maxZ: b07Anchors.top.z + 3,
  }),
  cellsIn({
    minX: b07ShiftedX - 3, maxX: b07Anchors.observationLanding.x + 3,
    minY: b07Anchors.observationLanding.y - 3,
    maxY: b07Anchors.observationLanding.y + 3,
    minZ: b07Anchors.observationLanding.z - 3,
    maxZ: b07Anchors.observationLanding.z + 3,
  }),
  cellsIn({
    minX: b07ShiftedX - 3, maxX: b07ShiftedX + 3,
    minY: b07Anchors.observationLanding.y - 3,
    maxY: b07Anchors.observationLanding.y + 3,
    minZ: b07Anchors.lowerLobby.z - 3,
    maxZ: b07Anchors.observationLanding.z + 3,
  }),
  cellsIn({
    minX: b07ShiftedX - 3, maxX: b07ShiftedX + 3,
    minY: b07Anchors.lowerLobby.y, maxY: b07Anchors.observationLanding.y,
    minZ: b07Anchors.lowerLobby.z - 3, maxZ: b07Anchors.lowerLobby.z + 3,
  }),
  cellsIn({
    minX: b07ShiftedX - 3, maxX: b07Anchors.lowerLobby.x + 3,
    minY: b07Anchors.lowerLobby.y - 3, maxY: b07Anchors.lowerLobby.y + 3,
    minZ: b07Anchors.lowerLobby.z - 3, maxZ: b07Anchors.lowerLobby.z + 3,
  }),
);
const b07InteractionCells = dilate(b07ConstructionCells, 1);
invariant(d06SourceHash(b07ConstructionCells)
  === d06G04Payload.b07WestTwoSystem.exactExcavationReservation.coordinateSetSha256
  && d06SourceHash(b07InteractionCells)
    === d06G04Payload.b07WestTwoSystem.exactInteractionUnion.coordinateSetSha256,
'G04 B07 reconstruction drift');

function d06ReferenceCells(reference) {
  const logical = reference.logicalPath;
  if (reference.cellCount === 0 && reference.bounds === null) return [];
  if (logical === 'b07WestTwo/excavationReservation') return b07ConstructionCells;
  if (logical === 'b07WestTwo/interactionUnion') return b07InteractionCells;
  if (logical === 'smokeVentilationAndBarriers/localVentUnion') {
    return union(...d06G04Payload.ventSystems.map(({ exactRiserReservation }) => (
      cellsIn(exactRiserReservation.bounds)
    )));
  }
  const platformMatch = logical.match(
    /platformBarriers\/(\d+)\/(retainedClosedBarrierReservation|staticGateBayCap)$/,
  );
  if (platformMatch) {
    const platform = d06G04Payload.smokeAndBarrierSystems
      .platformBarriers[Number(platformMatch[1])];
    const z = platform.staticGateBayCap.bounds.minZ;
    const gates = [1664, 1688, 1712, 1736].flatMap((minX) => cellsIn({
      minX, maxX: minX + 2, minY: 42, maxY: 43, minZ: z, maxZ: z,
    }));
    return platformMatch[2] === 'staticGateBayCap'
      ? gates
      : difference(cellsIn(platform.retainedClosedBarrierReservation.bounds), gates);
  }
  const smokeMatch = logical.match(
    /smokeBoundaries\/(\d+)\/(retainedBoundaryPlane|staticOpeningCaps)$/,
  );
  if (smokeMatch) {
    const boundary = d06G04Payload.smokeAndBarrierSystems
      .smokeBoundaries[Number(smokeMatch[1])];
    const z = boundary.staticOpeningCaps.bounds.minZ;
    const openings = [1670, 1720, 1770, 1820].flatMap((minX) => cellsIn({
      minX, maxX: minX + 2, minY: 49, maxY: 51, minZ: z, maxZ: z,
    }));
    return smokeMatch[2] === 'staticOpeningCaps'
      ? openings
      : difference(cellsIn(boundary.retainedBoundaryPlane.bounds), openings);
  }
  const fixtureMatch = logical.match(/fixtureReservations\/(\d+)\/reservation$/);
  if (fixtureMatch) {
    const z = d06G04Payload.lightingAndPowerSystem.exactFixtureReservations[
      Number(fixtureMatch[1])
    ].reservation.bounds.minZ;
    return [1660, 1676, 1692, 1708, 1724, 1740, 1748]
      .map((x) => ({ x, y: 46, z }));
  }
  if (logical === 'cappedDrainage/capUnion') {
    return union(...d06G04Payload.cappedDrainageSystem.localCaps
      .map(({ cap }) => cellsIn(cap.bounds)));
  }
  return cellsIn(reference.bounds);
}

const d06SourceDocuments = new Map([
  [INPUTS.d06LifeSafety, d06LifeSafety],
  [INPUTS.emptyEightGeology, emptyEight],
]);
const d06ReproducedReferences = d06G04Payload.exactReservationReferenceContract.references
  .map((referenceItem) => {
    const document = d06SourceDocuments.get(referenceItem.sourcePath);
    invariant(document, `unsupported G04 D06 source ${referenceItem.sourcePath}`);
    const sourceManifest = resolveJsonPointer(document, referenceItem.jsonPointer);
    const cells = d06ReferenceCells(referenceItem);
    const actualHash = referenceItem.sourcePath === INPUTS.emptyEightGeology
      ? rawCoordinateHash(cells)
      : d06SourceHash(cells);
    invariant(cells.length === referenceItem.cellCount
      && JSON.stringify(boundsOf(cells)) === JSON.stringify(referenceItem.bounds)
      && actualHash === referenceItem.coordinateSetSha256
      && actualHash
        === (sourceManifest.coordinateSetSha256 ?? sourceManifest.cellSetSha256),
    `G04 D06 reference drift ${referenceItem.logicalPath}`);
    return { reference: referenceItem, cells };
  });
const d06ReservationInteractionCells = union(
  ...d06ReproducedReferences.map(({ cells }) => cells),
);
invariant(d06ReservationInteractionCells.length
  === civilDomains.proposalDomains['D06-RESERVATIONS'].interaction.cellCount
  && hashCells(
    d06ReservationInteractionCells,
    'combined-zones-civil-life-safety-domain-closure-cell-set-v1',
  ) === civilDomains.proposalDomains['D06-RESERVATIONS'].interaction.coordinateSetSha256,
'G04 D06 reservation interaction union drift');

const ownerRecords = [];
const interfaceRecords = [];
const ownershipAdjudications = [];

// D02/C01: bind the exact 944,298-cell loading-separation interval proposal and
// the exact terminal-datum partition. The loading reservation wins 45 D02
// candidate cells; all other terminal categories are already mutually exclusive
// after the source packet's explicit priority rule.
const d02Payload = d02.technicalDevelopmentPayload;
const d02Aggregate = d02Payload.selectedBasis.exactAggregateCandidateCellManifest;
const d02Cells = d02Aggregate.cells.map(({ x, y, z }) => ({ x, y, z }));
invariant(d02Cells.length === 432 && new Set(d02Cells.map(cellKey)).size === 432,
  'D02 aggregate cell identity drift');
const d02C01Owners = d02C01.proposalPayload.oneOwnerPrecedence.scopedOwners;
const d02C01Owner = (ownerId) => {
  const record = d02C01Owners.find((item) => item.ownerId === ownerId);
  invariant(record, `missing D02/C01 source owner ${ownerId}`);
  return record;
};
const d02Withheld = d02C01.proposalPayload.oneOwnerPrecedence.exactConflictAccounting
  .d02CellsWithheldByLoadingSeparation;
const d02WithheldCells = d02Withheld.cells.map(({ x, y, z }) => ({ x, y, z }));
const d02CanonicalCells = difference(d02Cells, d02WithheldCells);
invariant(d02WithheldCells.length === 45 && d02CanonicalCells.length === 387,
  'D02/C01 loading precedence drift');
const d02CellMap = new Map(d02CanonicalCells.map((cell) => [cellKey(cell), OWNER.d02Drain]));
invariant(d02CellMap.size === 387, 'D02 canonical candidate cells are not unique');
ownershipAdjudications.push({
  adjudicationId: 'OA-D02-C01-LOADING-PRECEDENCE-OVER-D02-CANDIDATE',
  scope: 'D02/C01',
  winningOwnerId: OWNER.c01Loading,
  yieldingOwnerIds: [OWNER.d02Drain],
  exactConflictCellSet: setRecord(d02WithheldCells, 'D02 cells withheld by C01 loading separation'),
  sourceCoordinateSetSha256: d02Withheld.coordinateSetSha256,
  rule: 'The exact vertical loading-separation reservation owns the 45 same-coordinate cells; the D02 capped-sump proposal resumes above it.',
  accepted: false,
  status: 'PROPOSED_EXACT_PRECEDENCE_OWNER_ACCEPTANCE_HOLD',
});
ownerRecords.push(ownerRecord(
  OWNER.d02Drain,
  'D02/C01',
  'Proposed canonical steward for the D02 candidate cells remaining after exact C01 loading-separation precedence.',
  [reference(OWNER.d02Drain, 'D02-AGGREGATE-AFTER-C01-LOADING-PRECEDENCE', {
    cellCount: d02CanonicalCells.length,
    bounds: boundsOf(d02CanonicalCells),
    coordinateSetSha256: hashCells(d02CanonicalCells),
    source: `${INPUTS.d02C01Proposal}#/proposalPayload/oneOwnerPrecedence/exactConflictAccounting plus D02 aggregate`,
  })],
  {
    proposedCellCount: d02CanonicalCells.length,
    proposedCoordinateSetSha256: hashCells(d02CanonicalCells),
  },
));
ownerRecords.push(ownerRecord(
  OWNER.c01Tunnel,
  'D02/C01',
  d02C01Owner(OWNER.c01Tunnel).role,
  [],
  {
    proposedCellCount: null,
    proposalStatus: 'HOLD_CATALOG_BOUNDS_ONLY_EXACT_PHYSICAL_OCCUPANCY_MISSING',
    extra: {
      catalogBounds: d02C01Owner(OWNER.c01Tunnel).proposedAssignment.catalogBounds,
      exactTopInterfaceColumnCount:
        d02C01Owner(OWNER.c01Tunnel).proposedAssignment.exactTopInterfaceColumnCount,
    },
  },
));
const loadingAssignment = d02C01Owner(OWNER.c01Loading).proposedAssignment;
ownerRecords.push(ownerRecord(
  OWNER.c01Loading,
  'D02/C01',
  d02C01Owner(OWNER.c01Loading).role,
  [reference(OWNER.c01Loading, 'C01-C1-LOADING-SEPARATION-INTERVALS', {
    cellCount: loadingAssignment.cellCount,
    bounds: loadingAssignment.bounds,
    sparseManifestSha256: loadingAssignment.intervalManifestSha256,
    source: `${INPUTS.d02C01Proposal}#/proposalPayload/exactInteractionSets/loadingSeparationReservation`,
  }, 'INTERVAL_MANIFEST')],
  { proposedCellCount: loadingAssignment.cellCount },
));
for (const [ownerId, role] of [
  [OWNER.c1Rail, 'C1 rail-collection terminal datum after exact stack precedence.'],
  [OWNER.c1Road, 'C1 road-collection terminal datum after exact stack precedence.'],
  [OWNER.c1RailFormation, 'C1 rail-formation terminal datum after exact stack precedence.'],
  [OWNER.c1RoadSurface, 'C1 road-surface terminal datum after exact stack precedence.'],
  [OWNER.c1RailLandTake, 'C1 rail land-take terminal datum after exact stack precedence.'],
  [OWNER.c1RoadLandTake, 'C1 road land-take terminal datum after exact stack precedence.'],
]) {
  const assignment = d02C01Owner(ownerId).proposedAssignment;
  const cells = assignment.cells.map(({ x, y, z }) => ({ x, y, z }));
  invariant(cells.length === assignment.cellCount
    && sourceCoordinateHash(cells) === assignment.coordinateSetSha256,
  `${ownerId} D02/C01 terminal assignment drift`);
  ownerRecords.push(ownerRecord(
    ownerId,
    'D02/C01',
    role,
    [reference(ownerId, `${ownerId}-D02-C01-TERMINAL-ASSIGNMENT`, {
      cellCount: cells.length,
      bounds: assignment.bounds,
      coordinateSetSha256: assignment.coordinateSetSha256,
      source: `${INPUTS.d02C01Proposal}#/proposalPayload/oneOwnerPrecedence/scopedOwners/${ownerId}`,
    })],
    {
      proposedCellCount: cells.length,
      proposedCoordinateSetSha256: hashCells(cells),
      proposalStatus: cells.length === 0
        ? 'PROPOSED_EXACT_ZERO_ASSIGNMENT_NOT_ACCEPTED'
        : 'PROPOSED_LOGICAL_OWNER_EXACT_ASSIGNMENT_NOT_ACCEPTED',
    },
  ));
}
for (const asset of d02Payload.exactAssetDesigns) {
  const inlet = asset.collectionInlet.cellManifest;
  const inletCells = inlet.cells.map(({ x, y, z }) => ({ x, y, z }));
  invariant(inletCells.length === inlet.cellCount
    && new Set(inletCells.map(cellKey)).size === inlet.cellCount,
  `${asset.assetId} inlet identity drift`);
  interfaceRecords.push(exactInterface({
    id: `IF-D02-${asset.lowRunId}-COLLECTION-INLET`,
    scope: 'D02/C01',
    fromOwnerId: asset.system === 'C1_RAIL_NORTH_CESS' ? OWNER.c1Rail : OWNER.c1Road,
    toOwnerId: OWNER.d02Drain,
    direction: 'UPSTREAM_COLLECTION_INTO_CAPPED_SUMP',
    relationship: 'EXACT_COLLECTION_INLET_DEFAULT_CLOSED_NO_FLOW_CREDIT',
    cellSet: {
      representation: 'BOUND_EXACT_SOURCE_CELL_SET',
      cellCount: inlet.cellCount,
      bounds: inlet.bounds,
      coordinateSetSha256: inlet.coordinateSetSha256,
      source: `${INPUTS.d02TechnicalDesign}#${asset.collectionInlet.interfaceId}`,
    },
    qualification: 'Exact inlet cells exist, but flow, storage, source/future fluid states, and upstream-owner acceptance do not.',
  }));
}
for (const missing of [
  ['IF-D02-MAINTENANCE-ACCESS', OWNER.d02Drain, null, 'OUTBOUND_TO_MAINTENANCE_SAFE_ENDPOINT'],
  ['IF-D02-PUMP-POWER-CONTROL', OWNER.d02Drain, null, 'OUTBOUND_TO_POWER_AND_CONTROL_SOURCE'],
  ['IF-D02-OVERFLOW-RECEIVER', OWNER.d02Drain, null, 'OUTBOUND_TO_ACCEPTED_RECEIVER'],
]) {
  interfaceRecords.push(exactInterface({
    id: missing[0], scope: 'D02/C01', fromOwnerId: missing[1], toOwnerId: missing[2],
    direction: missing[3], relationship: 'MISSING_REQUIRED_INTERFACE_DEFAULT_DENY',
  }));
}
for (const sourceContract of d02C01.proposalPayload.directionalSealedInterfaces
  .exactFaceAdjacentContracts) {
  interfaceRecords.push(exactInterface({
    id: sourceContract.contractId,
    scope: 'D02/C01',
    fromOwnerId: sourceContract.fromOwnerId,
    toOwnerId: sourceContract.toOwnerId,
    direction: sourceContract.direction,
    relationship: sourceContract.relationship,
    cellSet: {
      ...sourceContract.interfaceCellSet,
      source: `${INPUTS.d02C01Proposal}#/proposalPayload/directionalSealedInterfaces/exactFaceAdjacentContracts/${sourceContract.contractId}`,
    },
    transitionPairCount: sourceContract.transitionPairCount,
    transitionPairManifestSha256: sourceContract.transitionPairManifestSha256,
    status: sourceContract.status,
    qualification: 'Source-bound D02/C01 proposal; no loading, flow, state, or counterpart acceptance is inferred.',
  }));
}

// D05: assign exact proposal/reference families without promoting them to
// accepted future states. B08 wins the 36-cell same-coordinate portal conflict;
// B09 receives an exact subtraction rather than shared ownership.
const d05Model = d05.selectedPlanningIdentity.formula;
const model = {
  center: d05Model.center,
  extents: d05Model.extents,
  baseSurfaceY: d05Model.baseSurfaceY,
  peakSurfaceY: d05Model.peakSurfaceY,
};
const b08Cells = buildB08Interaction(connector);
const b09Cells = buildB09Reservation(model, d05Packet.b09B10SystemPlan.b09Route);
invariant(sourceCoordinateHash(b08Cells)
  === d05.exactReservationsAndInterfaces.b08Interaction.coordinateSetSha256,
  'D05 B08 cell identity drift');
invariant(sourceCoordinateHash(b09Cells)
  === d05.exactReservationsAndInterfaces.b09MinimumPlanningAccommodation.coordinateSetSha256,
  'D05 B09 cell identity drift');
const b08B09Overlap = intersection(b08Cells, b09Cells);
const b09CanonicalCells = difference(b09Cells, b08B09Overlap);
invariant(b08B09Overlap.length === 36 && b09CanonicalCells.length === 7_764,
  'D05 B08/B09 proposed precedence drift');
ownershipAdjudications.push({
  adjudicationId: 'OA-D05-B08-PRECEDENCE-OVER-B09-PORTAL',
  scope: 'D05',
  winningOwnerId: OWNER.d05B08,
  yieldingOwnerIds: [OWNER.d05B09],
  exactConflictCellSet: setRecord(b08B09Overlap, 'B08/B09 exact portal overlap'),
  rule: 'B08 service-tunnel control owns the same-coordinate portal cells; B09 begins at the exact directional interface.',
  accepted: false,
  status: 'PROPOSED_EXACT_PRECEDENCE_OWNER_ACCEPTANCE_HOLD',
});
const supportFamily = (id) => {
  const result = d05.supportGapStatusLedger.families.find((item) => item.id === id);
  invariant(result, `missing D05 support family ${id}`);
  return result;
};
const relicSupport = supportFamily('SUPPORT-STATUS-RELIC-PRESERVE');
const hydroSupport = [
  supportFamily('SUPPORT-STATUS-WATER-ADJACENT'),
  supportFamily('SUPPORT-STATUS-LAVA-ADJACENT'),
  supportFamily('SUPPORT-STATUS-FROZEN-ADJACENT'),
  supportFamily('SUPPORT-STATUS-SNOW-ADJACENT'),
].filter(({ cellCount }) => cellCount > 0);
const otherSupport = supportFamily('SUPPORT-STATUS-OTHER-SURFACE');
invariant(relicSupport.cellCount + hydroSupport.reduce((sum, item) => sum + item.cellCount, 0)
  + otherSupport.cellCount === d05.supportGapStatusLedger.cellCount,
  'D05 support ownership partition drift');
const d05RelicSet = d05.hydrologyAndRelicBoundary.protectedRelicMinimumPlanningExclusion;
ownerRecords.push(ownerRecord(
  OWNER.d05Relic,
  'D05',
  'Proposed veto owner for exact relic preserve cells; the support subset remains a classification, not a duplicate assignment.',
  [reference(OWNER.d05Relic, 'D05-RELIC-PRESERVE-UNION', {
    ...d05RelicSet,
    source: `${INPUTS.d05FutureState}#/hydrologyAndRelicBoundary/protectedRelicMinimumPlanningExclusion`,
  })],
));
ownerRecords.push(ownerRecord(
  OWNER.d05Hydrology,
  'D05',
  'Proposed control owner for exact water/frozen/snow-adjacent support status cells; treatments and influence remain unaccepted.',
  hydroSupport.map((item) => reference(OWNER.d05Hydrology, item.id, {
    ...item,
    source: `${INPUTS.d05FutureState}#/supportGapStatusLedger/families/${item.id}`,
  })),
));
const fillFamily = d05.typedDirectAndInfluenceFamilies.find(({ familyId }) => (
  familyId === 'fill-direct'
));
const finishFamily = d05.typedDirectAndInfluenceFamilies.find(({ familyId }) => (
  familyId === 'surface-finish-direct'
));
ownerRecords.push(ownerRecord(
  OWNER.d05Construction,
  'D05',
  'Proposed construction-control owner for exact sparse FM-01 bulk/finish cells and dry support-status cells.',
  [
    reference(OWNER.d05Construction, 'D05-FM01-FILL-DIRECT-PROPOSAL', {
      cellCount: fillFamily.proposalCellCount,
      sparseManifestSha256: fillFamily.proposalSparseManifestSha256,
      bounds: null,
      source: `${INPUTS.d05FutureState}#fill-direct`,
    }, 'SPARSE_TYPED_PROPOSAL'),
    reference(OWNER.d05Construction, 'D05-FM01-SURFACE-FINISH-PROPOSAL', {
      cellCount: finishFamily.proposalCellCount,
      sparseManifestSha256: finishFamily.proposalSparseManifestSha256,
      bounds: null,
      source: `${INPUTS.d05FutureState}#surface-finish-direct`,
    }, 'SPARSE_TYPED_PROPOSAL'),
    reference(OWNER.d05Construction, otherSupport.id, {
      ...otherSupport,
      source: `${INPUTS.d05FutureState}#/supportGapStatusLedger/families/${otherSupport.id}`,
    }),
  ],
));
ownerRecords.push(ownerRecord(
  OWNER.d05B08,
  'D05',
  'Proposed owner of the exact B08 service-tunnel interaction reservation.',
  [reference(OWNER.d05B08, 'D05-B08-INTERACTION', {
    cellCount: b08Cells.length,
    bounds: boundsOf(b08Cells),
    coordinateSetSha256: hashCells(b08Cells),
    source: `${INPUTS.connectorGeometry}#/serviceTunnelCenterline/exactCellSets/interactionUnion`,
  })],
  { proposedCoordinateSetSha256: hashCells(b08Cells) },
));
ownerRecords.push(ownerRecord(
  OWNER.d05B09,
  'D05',
  'Proposed subordinate owner of B09 planning accommodation after exact B08 portal precedence.',
  [reference(OWNER.d05B09, 'D05-B09-CANONICAL-PLANNING-ACCOMMODATION', {
    cellCount: b09CanonicalCells.length,
    bounds: boundsOf(b09CanonicalCells),
    coordinateSetSha256: hashCells(b09CanonicalCells),
    source: `${INPUTS.d05FutureState}#/exactReservationsAndInterfaces/b09MinimumPlanningAccommodation minus OA-D05-B08-PRECEDENCE-OVER-B09-PORTAL`,
  })],
  {
    proposedCoordinateSetSha256: hashCells(b09CanonicalCells),
    extra: {
      technicalProposalLayerCount:
        b09Technical.exactTechnicalReservationProposals.proposalLayerCount,
      technicalProposalLayerManifestSha256: sha256([
        'combined-zones-phase1-b09-technical-layer-references-v1',
        ...Object.entries(b09Technical.exactTechnicalReservationProposals.proposalLayers)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([id, item]) => `${id}\t${item.cellCount}\t${item.coordinateSetSha256}`),
        '',
      ].join('\n')),
      technicalProposalAccepted: false,
    },
  },
));
interfaceRecords.push(exactInterface({
  id: 'IF-D05-B08-TO-B09-PORTAL', scope: 'D05',
  fromOwnerId: OWNER.d05B08, toOwnerId: OWNER.d05B09,
  direction: 'B08_SERVICE_TUNNEL_TO_B09_STATION',
  relationship: 'SAME_COORDINATE_PORTAL_PRECEDENCE_AND_CLOSED_TRANSFER',
  cells: b08B09Overlap,
}));
interfaceRecords.push(exactInterface({
  id: 'IF-D05-B09-TO-B10-MOUNTAIN', scope: 'D05',
  fromOwnerId: OWNER.d05B09, toOwnerId: OWNER.d05Construction,
  direction: 'B09_GUIDEWAY_INTO_B10_MOUNTAIN',
  relationship: 'EXACT_PLANNING_RESERVATION_NO_MECHANISM_OR_TRANSFER_CREDIT',
  cells: b09CanonicalCells,
}));
const b09SummitInterface = b09Technical.exactSealedInterfaceProposals.interfaces
  .find(({ interfaceId }) => interfaceId === 'IF-B09-Z11-SUMMIT');
invariant(b09SummitInterface?.exactCellSet?.cellCount === 12,
  'B09 summit interface identity drift');
interfaceRecords.push(exactInterface({
  id: 'IF-D05-B09-TO-Z11-SUMMIT', scope: 'D05',
  fromOwnerId: OWNER.d05B09, toOwnerId: null,
  direction: 'B09_GUIDEWAY_TO_Z11_SUMMIT',
  relationship: 'EXACT_B09_SUMMIT_CAP_TO_UNASSIGNED_Z11_OWNER_CLOSED',
  cellSet: {
    ...b09SummitInterface.exactCellSet,
    source: `${INPUTS.b09TechnicalSystem}#/exactSealedInterfaceProposals/interfaces/IF-B09-Z11-SUMMIT`,
  },
  status: 'HOLD_EXACT_DIRECTIONAL_PROPOSAL_COUNTERPART_AND_STATES_NOT_ACCEPTED',
}));
for (const missing of [
  ['IF-D05-HYDROLOGY-TO-RECEIVER', OWNER.d05Hydrology, null, 'D05_DRAINAGE_TO_ACCEPTED_RECEIVER'],
]) {
  interfaceRecords.push(exactInterface({
    id: missing[0], scope: 'D05', fromOwnerId: missing[1], toOwnerId: missing[2],
    direction: missing[3], relationship: 'MISSING_REQUIRED_INTERFACE_DEFAULT_DENY',
  }));
}

// D06: materialize all rectangular/sparse primary reservation sets except the
// already-hashed B07 nonlinear set. Exact precedence removes 76 known internal
// same-coordinate conflicts before directional face adjacencies are compiled.
const d06Payload = d06.mechanismDevelopmentPayload;
const d06OriginalSets = new Map(D06_PRIORITY.map((ownerId) => [ownerId, []]));
for (const egress of d06Payload.protectedEgressAndLiftSystems) {
  const ownerId = egress.coreId === 'EG-A' ? OWNER.d06EgA : OWNER.d06EgB;
  const cells = cellsIn(egress.combinedProtectedCoreReservation.bounds);
  invariant(d06SourceHash(cells) === egress.combinedProtectedCoreReservation.coordinateSetSha256,
    `${egress.coreId} protected-core hash drift`);
  d06OriginalSets.get(ownerId).push(...cells);
}
for (const vent of d06Payload.ventSystems) {
  const cells = cellsIn(vent.exactRiserReservation.bounds);
  invariant(d06SourceHash(cells) === vent.exactRiserReservation.coordinateSetSha256,
    `${vent.ventId} riser hash drift`);
  d06OriginalSets.get(OWNER.d06Vent).push(...cells);
}
for (const boundary of d06Payload.smokeAndBarrierSystems.smokeBoundaries) {
  const cells = cellsIn(boundary.completeFailClosedBoundary.bounds);
  invariant(d06SourceHash(cells) === boundary.completeFailClosedBoundary.coordinateSetSha256,
    `${boundary.id} smoke-boundary hash drift`);
  d06OriginalSets.get(OWNER.d06Smoke).push(...cells);
}
for (const barrier of d06Payload.smokeAndBarrierSystems.platformBarriers) {
  const cells = cellsIn(barrier.completeFailClosedBarrier.bounds);
  invariant(d06SourceHash(cells) === barrier.completeFailClosedBarrier.coordinateSetSha256,
    `${barrier.id} barrier hash drift`);
  d06OriginalSets.get(OWNER.d06Barrier).push(...cells);
}
const fixtureX = [1660, 1676, 1692, 1708, 1724, 1740, 1748];
for (const fixture of d06Payload.lightingAndPowerSystem.exactFixtureReservations) {
  const cells = fixtureX.map((x) => ({
    x,
    y: fixture.reservation.bounds.minY,
    z: fixture.reservation.bounds.minZ,
  }));
  const noPreambleHash = sha256(cells.sort(compareCells).map(cellKey).join('\n'));
  invariant(noPreambleHash === fixture.reservation.coordinateSetSha256,
    `${fixture.platformId} fixture hash drift`);
  d06OriginalSets.get(OWNER.d06Power).push(...cells);
}
for (const item of d06Payload.cappedDrainageSystem.localCaps) {
  const cells = cellsIn(item.cap.bounds);
  invariant(d06SourceHash(cells) === item.cap.coordinateSetSha256,
    `${item.id} drainage-cap hash drift`);
  d06OriginalSets.get(OWNER.d06Drain).push(...cells);
}
for (const item of [
  d06Payload.cappedDrainageSystem.retainedUnconnectedHeaderReservation,
  d06Payload.cappedDrainageSystem.retainedExternalBoundaryCap,
]) {
  const cells = cellsIn(item.bounds);
  invariant(d06SourceHash(cells) === item.coordinateSetSha256, 'D06 drainage boundary hash drift');
  d06OriginalSets.get(OWNER.d06Drain).push(...cells);
}
const fireSpine = cellsIn(d06Payload.fireServiceSystem.internalSpineReservation.bounds);
invariant(d06SourceHash(fireSpine)
  === d06Payload.fireServiceSystem.internalSpineReservation.coordinateSetSha256,
  'D06 fire-spine hash drift');
d06OriginalSets.get(OWNER.d06Fire).push(...fireSpine);
for (const [ownerId, cells] of d06OriginalSets) d06OriginalSets.set(ownerId, uniqueCells(cells));

const d06Membership = new Map();
for (const [ownerId, cells] of d06OriginalSets) {
  for (const cell of cells) {
    if (!d06Membership.has(cellKey(cell))) d06Membership.set(cellKey(cell), []);
    d06Membership.get(cellKey(cell)).push(ownerId);
  }
}
const d06CanonicalMap = new Map();
const d06ConflictGroups = new Map();
for (const [key, memberships] of d06Membership) {
  const ordered = [...memberships].sort((left, right) => (
    D06_PRIORITY.indexOf(left) - D06_PRIORITY.indexOf(right)
  ));
  d06CanonicalMap.set(key, ordered[0]);
  if (ordered.length > 1) {
    const groupKey = `${ordered[0]}<-${ordered.slice(1).join('+')}`;
    if (!d06ConflictGroups.has(groupKey)) d06ConflictGroups.set(groupKey, {
      winner: ordered[0], yielding: ordered.slice(1), cells: [],
    });
    const [x, y, z] = key.split(',').map(Number);
    d06ConflictGroups.get(groupKey).cells.push({ x, y, z });
  }
}
const d06ConflictCellCount = [...d06ConflictGroups.values()]
  .reduce((sum, item) => sum + item.cells.length, 0);
invariant(d06ConflictCellCount === 76, 'D06 known same-coordinate conflict count drift');
const d06LayerOwner = (layerId) => {
  if (layerId === 'smokeDoorMechanismBays') return OWNER.d06Smoke;
  if (layerId === 'platformGateMechanismBays') return OWNER.d06Barrier;
  if (layerId.startsWith('ega')) return OWNER.d06EgA;
  if (layerId.startsWith('egb')) return OWNER.d06EgB;
  if (layerId.startsWith('vent')) return OWNER.d06Vent;
  if (layerId.startsWith('normal') || layerId.startsWith('emergency')
    || layerId.startsWith('lighting')) return OWNER.d06Power;
  if (layerId.startsWith('externalDrain') || layerId.startsWith('local')
    || layerId.startsWith('unconnectedDrain')) return OWNER.d06Drain;
  if (layerId.startsWith('fire')) return OWNER.d06Fire;
  throw new Error(`Combined Zones ownership registry rejected: unmapped D06 layer ${layerId}`);
};
const d06DetailedCanonicalLayerMap = buildD06DetailedCanonicalLayerMap(
  d06Payload,
  emptyEight,
  d06Detailed,
);
const d06DetailedCanonicalOwnerMap = new Map(
  [...d06DetailedCanonicalLayerMap].map(([key, layerId]) => [key, d06LayerOwner(layerId)]),
);
const d06DetailedAdjacencyContracts = adjacencyContracts(
  'D06',
  d06DetailedCanonicalOwnerMap,
);
const d06SourceAdjacency = d06Detailed.exactCanonicalOwnerAdjacency;
invariant(d06SourceAdjacency?.contractCount === 4
  && d06SourceAdjacency?.transitionPairCount === 59
  && d06SourceAdjacency?.acceptedContractCount === 0,
  'D06 detailed source adjacency accounting drift');
const expectedD06DetailedAdjacency = [
  ['IF-D06-ADJ-01', OWNER.d06EgB, OWNER.d06Fire, 'POSITIVE_Y', 10,
    'efaffb09850d450d56778f32a6f0921e9c9d64accf320aee5db7ea7da81cb469'],
  ['IF-D06-ADJ-02', OWNER.d06EgB, OWNER.d06Fire, 'POSITIVE_Z', 7,
    'a8ec9c372e1e00fa4f9d9b945bea80471541505a2b4eac6ab98610b312f3fb9b'],
  ['IF-D06-ADJ-03', OWNER.d06Fire, OWNER.d06EgB, 'POSITIVE_X', 35,
    '86fa8755867325fc1bea7e602d3d2eab536c5702a5a24ec111d2cf7907ea7915'],
  ['IF-D06-ADJ-04', OWNER.d06Fire, OWNER.d06EgB, 'POSITIVE_Y', 7,
    '57c8a5ca4de6ae9c6bd923aa695249d3f71c663a9ace35331d6fac614295800e'],
];
invariant(d06DetailedAdjacencyContracts.length === expectedD06DetailedAdjacency.length,
  'D06 detailed adjacency group count drift');
for (let index = 0; index < expectedD06DetailedAdjacency.length; index += 1) {
  const [id, fromOwnerId, toOwnerId, interfaceDirection, pairCount, pairManifest] =
    expectedD06DetailedAdjacency[index];
  invariant(d06DetailedAdjacencyContracts[index].contractId === id
    && d06DetailedAdjacencyContracts[index].fromOwnerId === fromOwnerId
    && d06DetailedAdjacencyContracts[index].toOwnerId === toOwnerId
    && d06DetailedAdjacencyContracts[index].direction === interfaceDirection
    && d06DetailedAdjacencyContracts[index].transitionPairCount === pairCount
    && d06DetailedAdjacencyContracts[index].transitionPairManifestSha256 === pairManifest,
  `${id} D06 detailed adjacency identity drift`);
  const sourceRecord = d06SourceAdjacency.records[index];
  invariant(sourceRecord.interfaceId === id
    && sourceRecord.fromOwnerId === fromOwnerId
    && sourceRecord.toOwnerId === toOwnerId
    && sourceRecord.direction === interfaceDirection
    && sourceRecord.transitionPairCount === pairCount
    && sourceRecord.transitionPairManifestSha256 === pairManifest
    && sourceRecord.exactInterfaceCellSet.cellCount
      === d06DetailedAdjacencyContracts[index].interfaceCellSet.cellCount
    && sourceRecord.exactInterfaceCellSet.coordinateSetSha256
      === d06DetailedAdjacencyContracts[index].interfaceCellSet.coordinateSetSha256,
  `${id} D06 source/downstream adjacency binding drift`);
}
const d06BoundDetailedAdjacencyContracts = d06SourceAdjacency.records.map((sourceRecord) => (
  exactInterface({
    id: sourceRecord.interfaceId,
    scope: 'D06',
    fromOwnerId: sourceRecord.fromOwnerId,
    toOwnerId: sourceRecord.toOwnerId,
    direction: sourceRecord.direction,
    relationship: sourceRecord.relationship,
    cellSet: {
      ...sourceRecord.exactInterfaceCellSet,
      source: `${INPUTS.d06DetailedSetout}#/exactCanonicalOwnerAdjacency/records/${sourceRecord.interfaceId}`,
    },
    transitionPairCount: sourceRecord.transitionPairCount,
    transitionPairManifestSha256: sourceRecord.transitionPairManifestSha256,
    status: sourceRecord.status,
    qualification: 'Upstream-published D06 detailed canonical-owner adjacency, independently reconstructed and endpoint-owner validated by this registry compiler.',
  })
));
const detailedLayers = d06Detailed.exactDetailedProposalLayers.proposalLayers;
const detailedLayerEntries = Object.entries(detailedLayers);
invariant(detailedLayerEntries.length === 31, 'D06 detailed layer count drift');
for (const precedence of d06Detailed.internalDuplicateAndPrecedenceAudit.precedenceRecords) {
  ownershipAdjudications.push({
    adjudicationId: `OA-${precedence.precedenceId}`,
    scope: 'D06',
    winningOwnerId: d06LayerOwner(precedence.winningLayerId),
    yieldingOwnerIds: [d06LayerOwner(precedence.yieldingLayerId)],
    winningLayerId: precedence.winningLayerId,
    yieldingLayerIds: [precedence.yieldingLayerId],
    exactConflictCellSet: {
      ...precedence.exactConflictCellSet,
      source: `${INPUTS.d06DetailedSetout}#/internalDuplicateAndPrecedenceAudit/precedenceRecords/${precedence.precedenceId}`,
    },
    rule: precedence.rule,
    accepted: false,
    status: 'PROPOSED_EXACT_LAYER_PRECEDENCE_OWNER_ACCEPTANCE_HOLD',
  });
}
for (const ownerId of D06_PRIORITY) {
  const ownerLayers = detailedLayerEntries
    .filter(([layerId]) => d06LayerOwner(layerId) === ownerId);
  const references = ownerLayers.map(([layerId, layer]) => reference(
    ownerId,
    `D06-DETAILED-${layerId}`,
    {
      ...layer.canonicalProposalCellSetAfterPrecedence,
      source: `${INPUTS.d06DetailedSetout}#/exactDetailedProposalLayers/proposalLayers/${layerId}/canonicalProposalCellSetAfterPrecedence`,
    },
  ));
  const assignedCount = references.reduce((sum, item) => sum + item.cellCount, 0);
  ownerRecords.push(ownerRecord(
    ownerId,
    'D06',
    d06Payload.controlOwnershipInterfaceContract.register
      .find(({ slotId }) => slotId === ownerId)?.subject ?? 'D06 exact reservation-control slot',
    references,
    {
      proposedCellCount: assignedCount,
      proposedCoordinateSetSha256: null,
      extra: {
        canonicalDetailedLayerCount: references.length,
        canonicalDetailedLayerAssignmentManifestSha256: sha256([
          `combined-zones-phase1-d06-detailed-owner-layers-v1-${ownerId}`,
          ...references.map((item) => (
            `${item.scopeId}\t${item.cellCount}\t${item.coordinateSetSha256}`
          )),
          '',
        ].join('\n')),
        detailedProposalAccepted: false,
      },
    },
  ));
}
const b07Set = d06Payload.b07WestTwoSystem.exactExcavationReservation;
ownerRecords.push(ownerRecord(
  OWNER.d06B07,
  'D06',
  'Proposed owner of the exact B07 west-two excavation reservation; mechanisms and water treatment remain absent.',
  [reference(OWNER.d06B07, 'D06-B07-WEST-TWO-EXCAVATION', {
    ...b07Set,
    source: `${INPUTS.d06Mechanisms}#/mechanismDevelopmentPayload/b07WestTwoSystem/exactExcavationReservation`,
  })],
));
interfaceRecords.push(...d06BoundDetailedAdjacencyContracts);
const d06BoundaryStewardSemantics =
  'SOURCE_BOUNDARY_STEWARD_NOT_DETAILED_CANONICAL_OCCUPANCY_CLAIM';
const d06BoundaryQualification =
  'The from-owner identifies the bound D06 source-system boundary steward. This record does not assert that every coarse source-cap cell is occupied by that owner in the independent 9,065-cell detailed canonical partition.';
for (const egress of d06Payload.protectedEgressAndLiftSystems) {
  interfaceRecords.push(exactInterface({
    id: `IF-D06-${egress.coreId}-SURFACE-CAP`, scope: 'D06',
    fromOwnerId: egress.coreId === 'EG-A' ? OWNER.d06EgA : OWNER.d06EgB,
    toOwnerId: null, direction: 'VERTICAL_UP_TO_UNDEFINED_SURFACE_OWNER',
    relationship: 'EXACT_SURFACE_CAP_CLOSED', cellSet: egress.surfaceOutletCap,
    ownershipSemantics: d06BoundaryStewardSemantics,
    qualification: d06BoundaryQualification,
  }));
}
for (const vent of d06Payload.ventSystems) {
  const top = { ...vent.exactRiserReservation.bounds,
    minY: vent.exactRiserReservation.bounds.maxY };
  interfaceRecords.push(exactInterface({
    id: `IF-D06-${vent.ventId}-EXTERIOR-CAP`, scope: 'D06',
    fromOwnerId: OWNER.d06Vent, toOwnerId: null,
    direction: 'VERTICAL_UP_TO_UNDEFINED_EXTERIOR_OWNER',
    relationship: 'EXACT_DERIVED_RISER_TOP_CAP_CLOSED', cells: cellsIn(top),
    ownershipSemantics: d06BoundaryStewardSemantics,
    qualification: d06BoundaryQualification,
  }));
}
for (const boundary of d06Payload.smokeAndBarrierSystems.smokeBoundaries) {
  interfaceRecords.push(exactInterface({
    id: `IF-D06-${boundary.id}-COMPARTMENT`, scope: 'D06',
    fromOwnerId: OWNER.d06Smoke, toOwnerId: null,
    direction: boundary.id.endsWith('-N') ? 'NORTHBOUND_TO_UNDEFINED_COMPARTMENT_OWNER'
      : 'SOUTHBOUND_TO_UNDEFINED_COMPARTMENT_OWNER',
    relationship: 'EXACT_FAIL_CLOSED_SMOKE_BOUNDARY',
    cellSet: boundary.completeFailClosedBoundary,
    ownershipSemantics: d06BoundaryStewardSemantics,
    qualification: d06BoundaryQualification,
  }));
}
for (const barrier of d06Payload.smokeAndBarrierSystems.platformBarriers) {
  interfaceRecords.push(exactInterface({
    id: `IF-D06-${barrier.id}-TRAIN-PLATFORM`, scope: 'D06',
    fromOwnerId: OWNER.d06Barrier, toOwnerId: null,
    direction: 'PLATFORM_TO_UNDEFINED_TRAIN_SYSTEM_OWNER',
    relationship: 'EXACT_FAIL_CLOSED_PLATFORM_BARRIER',
    cellSet: barrier.completeFailClosedBarrier,
    ownershipSemantics: d06BoundaryStewardSemantics,
    qualification: d06BoundaryQualification,
  }));
}
interfaceRecords.push(exactInterface({
  id: 'IF-D06-DRAIN-TO-EXTERNAL-RECEIVER', scope: 'D06',
  fromOwnerId: OWNER.d06Drain, toOwnerId: null,
  direction: 'OUTBOUND_TO_UNDEFINED_RECEIVER',
  relationship: 'EXACT_EXTERNAL_BOUNDARY_CAP_NO_DISCHARGE',
  cellSet: d06Payload.cappedDrainageSystem.retainedExternalBoundaryCap,
  ownershipSemantics: d06BoundaryStewardSemantics,
  qualification: d06BoundaryQualification,
}));
interfaceRecords.push(exactInterface({
  id: 'IF-D06-FIRE-SPINE-TO-EG-B', scope: 'D06',
  fromOwnerId: OWNER.d06Fire, toOwnerId: OWNER.d06EgB,
  direction: 'FIRE_SPINE_TO_EG_B', relationship: 'EXACT_NORMALLY_CLOSED_CAP',
  cellSet: d06Payload.fireServiceSystem.normallyClosedSpineInterfaceCap,
  ownershipSemantics: d06BoundaryStewardSemantics,
  qualification: d06BoundaryQualification,
}));
interfaceRecords.push(exactInterface({
  id: 'IF-D06-FIRE-TO-EXTERNAL-APPROACH', scope: 'D06',
  fromOwnerId: OWNER.d06Fire, toOwnerId: null,
  direction: 'FIRE_COMPOUND_TO_UNDEFINED_EXTERNAL_APPROACH',
  relationship: 'EXACT_SEALED_SURFACE_APPROACH',
  cellSet: d06Payload.fireServiceSystem.sealedSurfaceApproachInterface,
  ownershipSemantics: d06BoundaryStewardSemantics,
  qualification: d06BoundaryQualification,
}));
for (const circuit of d06Payload.lightingAndPowerSystem.circuitSlots) {
  interfaceRecords.push(exactInterface({
    id: `IF-${circuit.id}-TO-POWER-SOURCE`, scope: 'D06',
    fromOwnerId: OWNER.d06Power, toOwnerId: null,
    direction: 'CIRCUIT_TO_UNDEFINED_POWER_SOURCE',
    relationship: 'MISSING_REQUIRED_INTERFACE_DEFAULT_DENY',
  }));
}
for (const [id, directionName] of [
  ['IF-D06-B07-TO-SURFACE', 'B07_VERTICAL_UP_TO_UNDEFINED_SURFACE_OWNER'],
  ['IF-D06-B07-TO-LOWER-LOBBY', 'B07_DOWN_TO_UNDEFINED_LOBBY_OWNER'],
  ['IF-D06-B07-TO-WATER-RECEIVER', 'B07_WATER_TO_UNDEFINED_RECEIVER'],
]) {
  interfaceRecords.push(exactInterface({
    id, scope: 'D06', fromOwnerId: OWNER.d06B07, toOwnerId: null,
    direction: directionName, relationship: 'MISSING_REQUIRED_INTERFACE_DEFAULT_DENY',
  }));
}

// P1-B12: rebuild the exact 19,136-cell influence geometry from its frozen
// reference line. Houston receives proposed conflict precedence over its exact
// 832 cells; every remaining cell has one proposed owner.
const start = grand.exactReferenceLine.start;
const end = grand.exactReferenceLine.end;
const plan = rasterLine(start, end);
const referenceLine = plan.map((point, station) => ({
  station,
  x: point.x,
  y: 62 + Math.round((4 * station) / (plan.length - 1)),
  z: point.z,
}));
invariant(referenceLine.length === 299, 'P1-B12 reference-line count drift');
const outer = [];
const inner = [];
const separation = [];
const lining = [];
for (const point of referenceLine) {
  for (const dy of [-2, -1, 0, 1, 2, 3]) {
    for (const dz of [-3, -2, -1, 0, 1, 2, 3, 4]) {
      const cell = { x: point.x, y: point.y + dy, z: point.z + dz,
        station: point.station };
      outer.push(cell);
      if (dy === -2 || dy === 3 || dz === -3 || dz === 4) lining.push(cell);
    }
  }
  for (const dy of [-1, 0, 1, 2]) {
    for (const dz of [-2, -1, 0, 1, 2, 3]) {
      inner.push({ x: point.x, y: point.y + dy, z: point.z + dz,
        station: point.station });
    }
  }
  for (const dy of [4, 5]) {
    for (const dz of [-3, -2, -1, 0, 1, 2, 3, 4]) {
      separation.push({ x: point.x, y: point.y + dy, z: point.z + dz,
        station: point.station });
    }
  }
}
const closureStations = new Set([0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 298]);
const closures = inner.filter(({ station }) => closureStations.has(station));
const material = union(lining, closures);
const retainedVoid = difference(inner, closures);
const programmedRaw = [];
for (const point of referenceLine) {
  if (closureStations.has(point.station)) continue;
  programmedRaw.push(
    { x: point.x, y: point.y, z: point.z - 2 },
    { x: point.x, y: point.y, z: point.z + 3 },
    { x: point.x, y: point.y - 1, z: point.z + 3 },
  );
  for (const dz of [-1, 0, 1, 2]) {
    programmedRaw.push({ x: point.x, y: point.y - 1, z: point.z + dz });
    for (const dy of [0, 1, 2]) {
      programmedRaw.push({ x: point.x, y: point.y + dy, z: point.z + dz });
    }
  }
}
const programmed = uniqueCells(programmedRaw);
const unprogrammed = difference(retainedVoid, programmed);
const influence = union(outer, separation);
invariant(gaSourceHash(outer, 'outer-envelope') === grand.exactCellSets.outerEnvelope.coordinateSetSha256,
  'P1-B12 outer-envelope identity drift');
invariant(gaSourceHash(material, 'proposed-material-geometry')
  === grand.exactCellSets.proposedMaterialGeometry.coordinateSetSha256,
  'P1-B12 material identity drift');
invariant(gaSourceHash(programmed, 'programmed-internal-union')
  === grand.internalSegregationAndAccessReservations.reservations.programmedUnion.coordinateSetSha256,
  'P1-B12 programmed-union identity drift');
invariant(gaSourceHash(unprogrammed, 'unprogrammed-internal-void')
  === grand.internalSegregationAndAccessReservations.reservations
    .unprogrammedInternalVoid.coordinateSetSha256,
  'P1-B12 unprogrammed-void identity drift');
invariant(gaSourceHash(separation, 'road-load-separation')
  === grand.exactCellSets.twoLayerRoadLoadSeparation.coordinateSetSha256,
  'P1-B12 separation identity drift');
invariant(gaSourceHash(influence, 'influence-union')
  === grand.exactCellSets.candidateInfluenceUnion.coordinateSetSha256,
  'P1-B12 influence identity drift');
const houstonBounds = grand.houstonZ03Z05Coordination.exactHalfOpenHoustonSampleEnvelope;
const houstonCells = influence.filter((cell) => insideHalfOpen(cell, houstonBounds));
invariant(gaSourceHash(houstonCells, 'houston-influence-overlap')
  === grand.houstonZ03Z05Coordination.exactCellSets
    .exactZ03Z05CoordinationOverlap.coordinateSetSha256,
  'P1-B12 Houston overlap identity drift');
const materialSet = new Set(material.map(cellKey));
const programmedSet = new Set(programmed.map(cellKey));
const unprogrammedSet = new Set(unprogrammed.map(cellKey));
const separationSet = new Set(separation.map(cellKey));
const houstonSet = new Set(houstonCells.map(cellKey));
const gaMap = new Map();
const gaOriginalByOwner = new Map([
  [OWNER.gaShell, []],
  [OWNER.gaReservation, []],
  [OWNER.z03Road, []],
]);
for (const cell of influence) {
  const key = cellKey(cell);
  const originalOwner = materialSet.has(key) || unprogrammedSet.has(key)
    ? OWNER.gaShell
    : programmedSet.has(key) ? OWNER.gaReservation
      : separationSet.has(key) ? OWNER.z03Road : null;
  invariant(originalOwner, `P1-B12 unclassified cell ${key}`);
  gaOriginalByOwner.get(originalOwner).push(cell);
  gaMap.set(key, houstonSet.has(key) ? OWNER.z05Houston : originalOwner);
}
// Fold the independently reconstructed P1-B11 surface and influence
// reservations into the same logical road/Houston ownership map. The exact
// 4,784-cell B11 road-load set is the already-owned B12 separation set, so it
// is deduplicated under the same Z03 road-control owner rather than assigned
// twice.
const b11Profile = plan.map((point, station) => ({
  station,
  x: point.x,
  y: 68 + Math.round((4 * station) / (plan.length - 1)),
  z: point.z,
}));
invariant(b11Profile.length === b11Road.exactAcceptedReferenceProfile.pointCount
  && b11Profile[0].y === b11Road.exactAcceptedReferenceProfile.start.y
  && b11Profile.at(-1).y === b11Road.exactAcceptedReferenceProfile.end.y,
  'P1-B11 accepted profile drift');
const b11Surface = [];
const b11Interaction = [];
const b11RoadLoad = [];
const b11Drainage = [];
const b11DryUtility = [];
const b11WetUtility = [];
for (const point of b11Profile) {
  for (let dz = -3; dz <= 4; dz += 1) {
    b11Surface.push({ x: point.x, y: point.y, z: point.z + dz });
    for (const dy of [-2, -1]) {
      b11RoadLoad.push({ x: point.x, y: point.y + dy, z: point.z + dz });
    }
  }
  for (let dz = -4; dz <= 5; dz += 1) {
    for (const dy of [-2, -1, 0, 1]) {
      b11Interaction.push({ x: point.x, y: point.y + dy, z: point.z + dz });
    }
  }
  b11Drainage.push(
    { x: point.x, y: point.y - 1, z: point.z - 4 },
    { x: point.x, y: point.y - 1, z: point.z + 5 },
  );
  b11DryUtility.push({ x: point.x, y: point.y - 2, z: point.z - 4 });
  b11WetUtility.push({ x: point.x, y: point.y - 2, z: point.z + 5 });
}
const b11Influence = union(b11RoadLoad, b11Drainage, b11DryUtility, b11WetUtility);
for (const [cells, label, record] of [
  [b11Surface, 'road-surface', b11Road.exactCellSets.proposedRoadConstruction],
  [b11Interaction, 'interaction-prism', b11Road.exactCellSets.candidateInteractionUnion],
  [b11RoadLoad, 'road-load-reservation', b11Road.exactCellSets.roadLoadInfluenceReservation],
  [b11Drainage, 'drainage-reservation', b11Road.exactCellSets.bilateralDrainageReservation],
  [b11DryUtility, 'dry-utility-reservation', b11Road.exactCellSets.dryUtilityReservation],
  [b11WetUtility, 'wet-utility-reservation', b11Road.exactCellSets.wetUtilityReservation],
  [b11Influence, 'influence-reservation',
    b11Road.exactCellSets.candidateInfluenceReservationUnion],
]) {
  invariant(cells.length === record.cellCount
    && b11SourceHash(cells, label) === record.coordinateSetSha256,
  `P1-B11 ${label} identity drift`);
}
invariant(intersection(b11RoadLoad, influence).length === 4_784,
  'P1-B11/B12 shared road-load identity drift');
const b11NewInfluence = difference(b11Influence, influence);
const b11HoustonInfluence = b11Influence.filter((cell) => insideHalfOpen(cell, houstonBounds));
invariant(b11NewInfluence.length === 1_196
  && intersection(b11Surface, influence).length === 0,
  'P1-B11/B12 unique ownership increment drift');
invariant(b11HoustonInfluence.length === 260
  && b11SourceHash(b11HoustonInfluence, 'houston-influence-overlap')
    === b11Road.houstonZ03Z05Coordination.exactCellSets
      .candidateInfluenceReservationOverlap.coordinateSetSha256,
  'P1-B11 Houston influence identity drift');
gaOriginalByOwner.get(OWNER.z03Road).push(...b11Surface, ...b11NewInfluence);
for (const cell of union(b11Surface, b11NewInfluence)) {
  const key = cellKey(cell);
  const houstonOwns = insideHalfOpen(cell, houstonBounds);
  if (houstonOwns) houstonSet.add(key);
  gaMap.set(key, houstonOwns ? OWNER.z05Houston : OWNER.z03Road);
}
invariant(gaMap.size === 22_724, 'combined P1-B11/P1-B12 owner partition cell count drift');
let gaConflictTotal = 0;
for (const [yieldingOwner, cells] of gaOriginalByOwner) {
  const conflict = cells.filter((cell) => houstonSet.has(cellKey(cell)));
  gaConflictTotal += conflict.length;
  ownershipAdjudications.push({
    adjudicationId: `OA-P1-B12-${yieldingOwner.split('-').slice(-2).join('-')}-YIELDS-HOUSTON`,
    scope: 'P1-B12',
    winningOwnerId: OWNER.z05Houston,
    yieldingOwnerIds: [yieldingOwner],
    exactConflictCellSet: setRecord(conflict, 'exact Houston same-coordinate conflict subset'),
    rule: 'Houston default-deny precedence owns the candidate coordination conflict; no connection or transfer is opened.',
    accepted: false,
    status: 'PROPOSED_EXACT_PRECEDENCE_OWNER_ACCEPTANCE_HOLD',
  });
}
invariant(gaConflictTotal === 884, 'combined P1-B11/P1-B12 Houston conflict partition drift');
for (const [ownerId, role] of [
  [OWNER.gaShell, 'Proposed owner of material geometry and unprogrammed retained void outside Houston conflict cells.'],
  [OWNER.gaReservation, 'Proposed owner of programmed internal reservations outside Houston conflict cells.'],
  [OWNER.z03Road, 'Proposed owner of the two-layer surface-road load separation outside Houston conflict cells.'],
  [OWNER.z05Houston, 'Proposed default-deny owner of the exact 884-cell combined B11/B12 Houston coordination conflict.'],
]) {
  const cells = [];
  for (const [key, assignedOwner] of gaMap) {
    if (assignedOwner !== ownerId) continue;
    const [x, y, z] = key.split(',').map(Number);
    cells.push({ x, y, z });
  }
  ownerRecords.push(ownerRecord(
    ownerId, 'P1-B12', role,
    [reference(ownerId, `${ownerId}-P1-B12-CANONICAL-PROPOSAL`, {
      cellCount: cells.length,
      bounds: boundsOf(cells),
      coordinateSetSha256: hashCells(cells),
      source: `${INPUTS.grandAvenuePassiveShell} and ${INPUTS.b11SurfaceRoad} plus exact Houston precedence`,
    })],
    { proposedCoordinateSetSha256: hashCells(cells) },
  ));
}
const gaAdjacencyContracts = adjacencyContracts('P1-B12', gaMap);
interfaceRecords.push(...gaAdjacencyContracts);
const westCap = inner.filter(({ station }) => station === 0);
const eastCap = inner.filter(({ station }) => station === 298);
const endpoint = (station) => {
  const point = referenceLine[station];
  return [
    { x: point.x, y: point.y, z: point.z - 2 },
    { x: point.x, y: point.y, z: point.z + 3 },
    { x: point.x, y: point.y - 1, z: point.z + 3 },
  ];
};
invariant(westCap.length === 24
  && westCap.every((cell) => gaMap.get(cellKey(cell)) === OWNER.gaShell),
  'P1-B12 west cap canonical occupancy drift');
invariant(eastCap.length === 24
  && eastCap.every((cell) => gaMap.get(cellKey(cell)) === OWNER.z05Houston),
  'P1-B12 east cap canonical occupancy drift');
invariant(endpoint(0).every((cell) => gaMap.get(cellKey(cell)) === OWNER.gaShell)
  && endpoint(298).every((cell) => gaMap.get(cellKey(cell)) === OWNER.z05Houston),
  'P1-B12 utility endpoint canonical occupancy drift');
interfaceRecords.push(exactInterface({
  id: 'IF-P1-B12-WEST-CAP-CLOSED', scope: 'P1-B12',
  fromOwnerId: OWNER.gaShell, toOwnerId: null, direction: 'WESTBOUND_CLOSED',
  relationship: 'EXACT_PASSIVE_SHELL_END_CAP', cells: westCap,
}));
interfaceRecords.push(exactInterface({
  id: 'IF-P1-B12-EAST-CAP-HOUSTON-CLOSED', scope: 'P1-B12',
  fromOwnerId: OWNER.gaShell, toOwnerId: OWNER.z05Houston,
  direction: 'EASTBOUND_TO_HOUSTON_CLOSED',
  relationship: 'EXACT_PASSIVE_SHELL_END_CAP_AND_HOUSTON_PRECEDENCE', cells: eastCap,
  ownershipSemantics: 'YIELDING_SOURCE_SYSTEM_TO_CANONICAL_HOUSTON_OCCUPANT',
  qualification: 'All 24 cap cells are canonically Houston-owned after precedence; gaShell names the yielding passive-shell source system, not a second occupant.',
}));
interfaceRecords.push(exactInterface({
  id: 'IF-P1-B12-WEST-UTILITY-ENDPOINT-CLOSED', scope: 'P1-B12',
  fromOwnerId: OWNER.gaReservation, toOwnerId: OWNER.gaShell,
  direction: 'WESTBOUND_TO_SHELL_CAP_CLOSED',
  relationship: 'EXACT_UTILITY_ENDPOINT_CAP', cells: endpoint(0),
  ownershipSemantics: 'YIELDING_SOURCE_SYSTEM_TO_CANONICAL_SHELL_OCCUPANT',
  qualification: 'All three endpoint cells are canonically shell-owned; gaReservation names the yielding utility source system, not a second occupant.',
}));
interfaceRecords.push(exactInterface({
  id: 'IF-P1-B12-EAST-UTILITY-ENDPOINT-CLOSED', scope: 'P1-B12',
  fromOwnerId: OWNER.gaReservation, toOwnerId: OWNER.z05Houston,
  direction: 'EASTBOUND_TO_HOUSTON_CAP_CLOSED',
  relationship: 'EXACT_UTILITY_ENDPOINT_CAP', cells: endpoint(298),
  ownershipSemantics: 'YIELDING_SOURCE_SYSTEM_TO_CANONICAL_HOUSTON_OCCUPANT',
  qualification: 'All three endpoint cells are canonically Houston-owned; gaReservation names the yielding utility source system, not a second occupant.',
}));
const b11WestCap = b11Surface.filter(({ x }) => x === b11Profile[0].x);
const b11EastCap = b11Surface.filter(({ x }) => x === b11Profile.at(-1).x);
const b11RoadToUpperLoadPairs = b11Surface.map((to) => ({
  from: { x: to.x, y: to.y - 1, z: to.z },
  to,
}));
const b11CanonicalRoadToRoadPairs = b11RoadToUpperLoadPairs.filter(({ from, to }) => (
  gaMap.get(cellKey(from)) === OWNER.z03Road
  && gaMap.get(cellKey(to)) === OWNER.z03Road
));
const b11CanonicalHoustonToRoadPairs = b11RoadToUpperLoadPairs.filter(({ from, to }) => (
  gaMap.get(cellKey(from)) === OWNER.z05Houston
  && gaMap.get(cellKey(to)) === OWNER.z03Road
));
invariant(b11WestCap.length === 8 && b11EastCap.length === 8,
  'P1-B11 endpoint cap identity drift');
invariant(b11WestCap.every((cell) => gaMap.get(cellKey(cell)) === OWNER.z03Road)
  && b11EastCap.every((cell) => gaMap.get(cellKey(cell)) === OWNER.z03Road)
  && b11HoustonInfluence.every((cell) => gaMap.get(cellKey(cell)) === OWNER.z05Houston),
  'P1-B11 cap or Houston canonical occupancy drift');
invariant(b11PairHash(b11RoadToUpperLoadPairs, 'b12-upper-load-to-road-surface')
  === b11Road.p1B12Coordination.roadSurfaceToB12UpperLoadLayer.transitionPairSha256,
  'P1-B11/B12 vertical transition-pair identity drift');
invariant(b11CanonicalRoadToRoadPairs.length === 2_288
  && b11CanonicalHoustonToRoadPairs.length === 104
  && b11CanonicalRoadToRoadPairs.length + b11CanonicalHoustonToRoadPairs.length
    === b11RoadToUpperLoadPairs.length,
  'P1-B11/B12 canonical vertical pair split drift');
const canonicalHoustonToRoadAdjacency = gaAdjacencyContracts.find((record) => (
  record.fromOwnerId === OWNER.z05Houston
  && record.toOwnerId === OWNER.z03Road
  && record.direction === 'POSITIVE_Y'
  && record.transitionPairCount === 104
));
invariant(canonicalHoustonToRoadAdjacency
  && canonicalHoustonToRoadAdjacency.transitionPairManifestSha256
    === pairHash(b11CanonicalHoustonToRoadPairs),
  'P1-B11/B12 Houston-to-road adjacency coverage drift');
interfaceRecords.push(exactInterface({
  id: 'IF-P1-B11-WEST-SURFACE-CAP-CLOSED', scope: 'P1-B11/P1-B12',
  fromOwnerId: OWNER.z03Road, toOwnerId: null,
  direction: 'WESTBOUND_TO_Z02_SURFACE_APPROACH_CLOSED',
  relationship: 'EXACT_EIGHT_CELL_SURFACE_ROAD_ENDPOINT_CAP',
  cells: b11WestCap,
}));
interfaceRecords.push(exactInterface({
  id: 'IF-P1-B11-EAST-SURFACE-CAP-HOUSTON-CLOSED', scope: 'P1-B11/P1-B12',
  fromOwnerId: OWNER.z03Road, toOwnerId: OWNER.z05Houston,
  direction: 'EASTBOUND_TO_HOUSTON_SURFACE_CLOSED',
  relationship: 'EXACT_EIGHT_CELL_SURFACE_ROAD_ENDPOINT_CAP_NO_OPENING_CREDIT',
  cells: b11EastCap,
}));
interfaceRecords.push(exactInterface({
  id: 'IF-P1-B11-ROAD-TO-B12-UPPER-LOAD', scope: 'P1-B11/P1-B12',
  fromOwnerId: OWNER.z03Road, toOwnerId: OWNER.z03Road,
  direction: 'B12_UPPER_LOAD_POSITIVE_Y_TO_ROAD_SURFACE',
  relationship: 'EXACT_SAME_OWNER_VERTICAL_ADJACENCY_NO_STRUCTURAL_TRANSFER_CREDIT',
  cells: uniqueCells(b11CanonicalRoadToRoadPairs.flatMap(({ from, to }) => [from, to])),
  pairs: b11CanonicalRoadToRoadPairs,
}));
interfaceRecords.push(exactInterface({
  id: 'IF-P1-B11-INFLUENCE-TO-HOUSTON', scope: 'P1-B11/P1-B12',
  fromOwnerId: OWNER.z03Road, toOwnerId: OWNER.z05Houston,
  direction: 'EASTBOUND_INFLUENCE_COORDINATION_CLOSED',
  relationship: 'EXACT_SAME_COORDINATE_HOUSTON_PRECEDENCE_NO_TRANSFER_CREDIT',
  cells: b11HoustonInfluence,
  ownershipSemantics: 'YIELDING_SOURCE_SYSTEM_TO_CANONICAL_HOUSTON_OCCUPANT',
  qualification: 'All 260 interface cells are canonically Houston-owned; Z03 road names the yielding B11 load/drainage/utility source system, not a second occupant.',
}));
for (const [id, directionName] of [
  ['IF-P1-B11-DRAINAGE-TO-RECEIVER', 'OUTBOUND_TO_UNDEFINED_DRAINAGE_RECEIVER'],
  ['IF-P1-B11-DRY-UTILITY-TO-SERVICE', 'OUTBOUND_TO_UNDEFINED_DRY_UTILITY_OWNER'],
  ['IF-P1-B11-WET-UTILITY-TO-SERVICE', 'OUTBOUND_TO_UNDEFINED_WET_UTILITY_OWNER'],
]) {
  interfaceRecords.push(exactInterface({
    id,
    scope: 'P1-B11/P1-B12',
    fromOwnerId: OWNER.z03Road,
    toOwnerId: null,
    direction: directionName,
    relationship: 'MISSING_REQUIRED_TECHNICAL_COUNTERPART_DEFAULT_DENY',
  }));
}

// G04 v3 physical target/interaction ownership. Reconstruct the exact B10
// sparse construction and interaction shell, then union every G03
// construction/interaction domain under one deterministic precedence map.
// Influence-only coordination stewardship remains outside this physical map.
const b03ConstructionCells = uniqueCells(b03Geometry.design.excavationReservation.cells);
const b03InteractionCells = uniqueCells(b03Geometry.design.oneCellFaceInteractionShell.cells);
const b03PhysicalCells = union(b03ConstructionCells, b03InteractionCells);
invariant(sourceCoordinateHash(b03ConstructionCells)
  === b03Geometry.design.excavationReservation.coordinateSetSha256
  && sourceCoordinateHash(b03InteractionCells)
    === b03Geometry.design.oneCellFaceInteractionShell.coordinateSetSha256,
'G04 B03 source geometry drift');

const relicNoFillCells = [];
for (const relic of d05Defaults.soleAuthorityRecommendations.bufferPolicy.relics) {
  const core = cellsIn(relic.protectedCore.bounds);
  const expanded = cellsIn(relic.minimumPlanningExclusionShell.expandedBounds);
  relicNoFillCells.push(...core, ...difference(expanded, core));
}
const b10NoFillByColumn = new Map();
for (const cell of union(relicNoFillCells, b08Cells, b09Cells)) {
  const key = columnKey(cell.x, cell.z);
  if (!b10NoFillByColumn.has(key)) b10NoFillByColumn.set(key, []);
  b10NoFillByColumn.get(key).push(cell.y);
}
const b10ConstructionMap = new Map();
const b10Reader = new SnapshotReader(path.resolve(
  ROOT,
  d05.sourceBindings.immutablePhase0PostRegionSnapshot.path,
));
for (let x = model.center.x - model.extents.west;
  x <= model.center.x + model.extents.east; x += 1) {
  for (let z = model.center.z - model.extents.north;
    z <= model.center.z + model.extents.south; z += 1) {
    const currentY = await b10Reader.surfaceY(x, z);
    const designY = mountainSurface(x, z, model);
    addRanges(
      b10ConstructionMap,
      x,
      z,
      pointExcludedRanges(
        Math.max(currentY + 1, ADDED_SOLID_MIN_Y),
        designY,
        b10NoFillByColumn.get(columnKey(x, z)) ?? [],
      ),
    );
  }
}
const b10SourceConstructionCount = [...b10ConstructionMap.values()]
  .reduce((sum, ranges) => sum + rangesCount(ranges), 0);
invariant(b10SourceConstructionCount
  === g03.scopeRegistry.find(({ scopeId }) => scopeId === 'P1-B10').construction.cellCount,
'G04 B10 construction count drift');
const b10InteractionMap = faceShell(b10ConstructionMap);
const b10InteractionCells = intervalMapCells(b10InteractionMap);
const b10ResidualInteraction = residualDomains.proposalPayload.proposalSets['P1-B10'].interaction;
invariant(b10InteractionCells.length === b10ResidualInteraction.cellCount
  && intervalManifestHash(
    b10InteractionMap,
    'combined-zones-residual-domain-sparse-integer-intervals-v1\nP1-B10/interaction\n',
  ) === b10ResidualInteraction.sparseIntervals.intervalManifestSha256,
'G04 B10 interaction interval identity drift');

const g04Memberships = new Map();
function addG04Membership(scopeId, ownerId, cells) {
  for (const cell of uniqueCells(cells)) {
    const key = cellKey(cell);
    if (!g04Memberships.has(key)) g04Memberships.set(key, { cell, memberships: [] });
    const memberships = g04Memberships.get(key).memberships;
    if (!memberships.some((entry) => entry.scopeId === scopeId && entry.ownerId === ownerId)) {
      memberships.push({ scopeId, ownerId });
    }
  }
}

addG04Membership('P1-B03', OWNER.b03, b03PhysicalCells);
addG04Membership('P1-B08', OWNER.d05B08, b08Cells);
addG04Membership('P1-B09', OWNER.d05B09, b09Cells);
addG04Membership('P1-B10', OWNER.d05Construction, b10InteractionCells);
addG04Membership('P1-B07', OWNER.d06B07, b07InteractionCells);
addG04Membership('D06-RESERVATIONS', OWNER.d06Reservation,
  d06ReservationInteractionCells);
for (const [key, ownerId] of d06DetailedCanonicalOwnerMap) {
  const [x, y, z] = key.split(',').map(Number);
  addG04Membership('D06-MECHANISMS', ownerId, [{ x, y, z }]);
}
for (const cell of d02Cells) {
  addG04Membership(
    'D02',
    new Set(d02WithheldCells.map(cellKey)).has(cellKey(cell))
      ? OWNER.c01Loading
      : OWNER.d02Drain,
    [cell],
  );
}
for (const cell of b11Interaction) {
  addG04Membership(
    'P1-B11',
    insideHalfOpen(cell, houstonBounds) ? OWNER.z05Houston : OWNER.z03Road,
    [cell],
  );
}
for (const cell of influence) {
  addG04Membership('P1-B12', gaMap.get(cellKey(cell)), [cell]);
}

const g04OwnerPriority = [
  OWNER.b03,
  OWNER.d05B08,
  OWNER.d05B09,
  OWNER.d05Construction,
  OWNER.c01Loading,
  OWNER.d02Drain,
  ...D06_PRIORITY,
  OWNER.d06B07,
  OWNER.d06Reservation,
  OWNER.z05Houston,
  OWNER.z03Road,
  OWNER.gaShell,
  OWNER.gaReservation,
];
const g04PriorityIndex = new Map(g04OwnerPriority.map((ownerId, index) => [ownerId, index]));
const g04CanonicalOwnerMap = new Map();
const g04OwnerCells = new Map();
const g04ConflictGroups = new Map();
for (const [key, entry] of g04Memberships) {
  const candidateOwners = [...new Set(entry.memberships.map(({ ownerId }) => ownerId))];
  candidateOwners.sort((left, right) => (
    g04PriorityIndex.get(left) - g04PriorityIndex.get(right) || left.localeCompare(right)
  ));
  const winner = candidateOwners[0];
  invariant(g04PriorityIndex.has(winner), `G04 owner priority missing ${winner}`);
  g04CanonicalOwnerMap.set(key, winner);
  if (!g04OwnerCells.has(winner)) g04OwnerCells.set(winner, []);
  g04OwnerCells.get(winner).push(entry.cell);
  for (const loser of candidateOwners.slice(1)) {
    const groupKey = `${winner}\t${loser}`;
    if (!g04ConflictGroups.has(groupKey)) g04ConflictGroups.set(groupKey, []);
    g04ConflictGroups.get(groupKey).push(entry.cell);
  }
}

const b10ConstructionConflictCells = [...g04Memberships.values()]
  .map(({ cell }) => cell)
  .filter((cell) => intervalMapHas(b10ConstructionMap, cell));
for (const cell of b10ConstructionConflictCells) {
  const winningOwner = g04CanonicalOwnerMap.get(cellKey(cell));
  const groupKey = `${winningOwner}\t${OWNER.d05Construction}`;
  if (!g04ConflictGroups.has(groupKey)) g04ConflictGroups.set(groupKey, []);
  g04ConflictGroups.get(groupKey).push(cell);
}
const b10CanonicalConstructionMap = subtractCellsFromIntervalMap(
  b10ConstructionMap,
  b10ConstructionConflictCells,
);
const b10CanonicalOwnerRecord = intervalMapRecord(
  b10CanonicalConstructionMap,
  OWNER.d05Construction,
);
invariant(b10ConstructionConflictCells.length === 14_054
  && b10CanonicalOwnerRecord.cellCount === 14_754_499,
'G04 B03 precedence against B10 construction drift');

const g04PrecedenceRecords = [...g04ConflictGroups.entries()]
  .map(([key, cells], index) => {
    const [winningOwnerId, yieldingOwnerId] = key.split('\t');
    const exact = uniqueCells(cells);
    return {
      adjudicationId: `OA-G04-V3-${String(index + 1).padStart(2, '0')}`,
      scope: 'G04-GLOBAL-PHYSICAL',
      winningOwnerId,
      yieldingOwnerIds: [yieldingOwnerId],
      exactConflictCellSet: setRecord(exact, 'G04 v3 exact physical-domain precedence'),
      rule: 'The earlier owner in the frozen G04 v3 physical precedence list owns every same-coordinate membership; the yielding domain remains an interface/coordination source only.',
      accepted: false,
      status: 'PROPOSED_EXACT_G04_PHYSICAL_PRECEDENCE_OWNER_ACCEPTANCE_HOLD',
    };
  }).sort((left, right) => (
    left.winningOwnerId.localeCompare(right.winningOwnerId)
      || left.yieldingOwnerIds[0].localeCompare(right.yieldingOwnerIds[0])
  ));
for (let index = 0; index < g04PrecedenceRecords.length; index += 1) {
  g04PrecedenceRecords[index].adjudicationId = `OA-G04-V3-${String(index + 1).padStart(2, '0')}`;
  ownershipAdjudications.push(g04PrecedenceRecords[index]);
}

const g04ExpandedOwnerRecords = [...g04OwnerCells.entries()]
  .map(([ownerId, cells]) => ({
    ownerId,
    representation: 'EXACT_CANONICAL_G04_PHYSICAL_CELL_SET_HASH_ONLY',
    ...setRecord(cells, 'canonical expanded G04 construction/interaction ownership after precedence'),
    accepted: false,
  })).sort((left, right) => left.ownerId.localeCompare(right.ownerId));
const g04ExpandedCanonicalCellCount = g04CanonicalOwnerMap.size;
const g04ObservedPhysicalUnionCellCount = b10SourceConstructionCount
  + g04Memberships.size - b10ConstructionConflictCells.length;
const g04CanonicalOwnerUnionCellCount = b10CanonicalOwnerRecord.cellCount
  + g04ExpandedCanonicalCellCount;
invariant(g04ObservedPhysicalUnionCellCount === g04CanonicalOwnerUnionCellCount,
'G04 observed physical union and canonical owner union count mismatch');
invariant(g04CanonicalOwnerMap.size
  === [...g04OwnerCells.values()].reduce((sum, cells) => sum + cells.length, 0),
'G04 expanded cells are not assigned exactly once');

const g04ExpandedAdjacencyContracts = adjacencyContracts(
  'G04-GLOBAL-EXPANDED',
  g04CanonicalOwnerMap,
);
const g04SparseAdjacencyContracts = expandedToSparseAdjacencyContracts(
  'G04-GLOBAL-SPARSE-B10',
  g04CanonicalOwnerMap,
  b10CanonicalConstructionMap,
  OWNER.d05Construction,
);
const g04AdjacencyContracts = [
  ...g04ExpandedAdjacencyContracts,
  ...g04SparseAdjacencyContracts,
];
interfaceRecords.push(...g04AdjacencyContracts);
const g04InfluenceStewardOwners = new Map([
  ['P1-B03', [OWNER.b03]],
  ['P1-B07', [OWNER.d06B07]],
  ['P1-B08', [OWNER.d05B08]],
  ['P1-B09', [OWNER.d05B09]],
  ['P1-B10', [OWNER.d05Construction]],
  ['D02', [OWNER.d02Drain]],
  ['D06-RESERVATIONS', [OWNER.d06Reservation]],
  ['D06-MECHANISMS', D06_PRIORITY],
  ['P1-B11', [OWNER.z05Houston, OWNER.z03Road]],
  ['P1-B12', [OWNER.gaReservation]],
]);
const g04InfluenceCoordinationStewardship = g03.scopeRegistry.map((scope) => ({
  scopeId: scope.scopeId,
  stewardOwnerIds: g04InfluenceStewardOwners.get(scope.scopeId),
  influenceCellCount: scope.influence.cellCount,
  influenceCoordinateSetSha256: scope.influence.coordinateSetSha256,
  accepted: false,
  physicalCellOwnershipClaimed: false,
  operationAuthorization: false,
  status: 'PROPOSED_NONPHYSICAL_INFLUENCE_COORDINATION_STEWARDSHIP_HOLD',
}));
invariant(g04InfluenceCoordinationStewardship.length === 10
  && g04InfluenceCoordinationStewardship.every(({ stewardOwnerIds }) => (
    Array.isArray(stewardOwnerIds) && stewardOwnerIds.length > 0
  )), 'G04 influence stewardship mapping incomplete');
const g04PhysicalOwnership = {
  status: 'PASS_OFFLINE_EXACT_ONE_OWNER_COVERAGE_FINAL_ACCEPTANCE_HOLD',
  controllingRule: 'The complete observed construction/interaction-cell union equals the canonical-owner union one-to-one with zero unowned and zero multiply owned cells.',
  sourceScopeCount: 10,
  sourceRequiredDomainCount: 20,
  observedPhysicalUnionCellCount: g04ObservedPhysicalUnionCellCount,
  canonicalOwnerUnionCellCount: g04CanonicalOwnerUnionCellCount,
  unownedCellCount: 0,
  multiplyOwnedCellCount: 0,
  expandedCanonicalCellCount: g04ExpandedCanonicalCellCount,
  sparseB10CanonicalConstructionCellCount: b10CanonicalOwnerRecord.cellCount,
  sparseB10CanonicalConstructionOwner: {
    ownerId: OWNER.d05Construction,
    ...b10CanonicalOwnerRecord,
    accepted: false,
  },
  expandedOwnerRecordCount: g04ExpandedOwnerRecords.length,
  expandedOwnerRecords: g04ExpandedOwnerRecords,
  precedenceRecordCount: g04PrecedenceRecords.length,
  precedenceRecords: g04PrecedenceRecords,
  exactDirectionalAdjacencyContractCount: g04AdjacencyContracts.length,
  exactExpandedDirectionalAdjacencyContractCount: g04ExpandedAdjacencyContracts.length,
  exactSparseB10DirectionalAdjacencyContractCount: g04SparseAdjacencyContracts.length,
  exactDirectionalAdjacencyPairCount: g04AdjacencyContracts.reduce(
    (sum, contractRecord) => sum + contractRecord.transitionPairCount,
    0,
  ),
  g04PassedOffline: true,
  finalOwnerAcceptanceRecorded: false,
};

// Validate the proposal registry itself. Every known compiled cell is assigned
// once after explicit precedence; missing physical sets stay null/HOLD.
const d02C01ProposedCellCount = ownerRecords.filter(({ scope }) => scope === 'D02/C01')
  .reduce((sum, owner) => sum + (owner.proposedCellCount ?? 0), 0);
const d06DetailedCellCount = d06Detailed.exactDetailedProposalLayers
  .canonicalProposalCellCountAfterPrecedence;
const d06UniqueCellCount = d06DetailedCellCount + b07Set.cellCount;
const d05ProposedCellCount = ownerRecords.filter(({ scope }) => scope === 'D05')
  .reduce((sum, owner) => sum + (owner.proposedCellCount ?? 0), 0);
const knownProposedCellCount = d02C01ProposedCellCount + d05ProposedCellCount
  + d06UniqueCellCount + gaMap.size;
invariant(d02C01ProposedCellCount === 952_479,
  'D02/C01 proposed owner count drift');
invariant(d05ProposedCellCount === 15_550_164, 'D05 proposed owner count drift');
invariant(d06UniqueCellCount === 17_199, 'D06 proposed owner count drift');
invariant(knownProposedCellCount === 16_542_566, 'global proposed owner count drift');
invariant(ownerRecords.length === 27, 'proposed owner record count drift');
invariant(interfaceRecords.every((item) => item.defaultDeny
  && item.wildcardAllowed === false && item.lastWriterWinsAllowed === false
  && item.accepted === false && !item.direction.includes('BIDIRECTIONAL')),
  'interface registry violates default-deny directional rules');
invariant(new Set(interfaceRecords.map(({ contractId }) => contractId)).size
  === interfaceRecords.length, 'duplicate interface contract ID');
for (const record of ownershipAdjudications) {
  record.adjudicationRecordIdentitySha256 = sha256(JSON.stringify(record));
}
const exactInterfaceCount = interfaceRecords.filter(({ interfaceCellSet }) => (
  interfaceCellSet !== null
)).length;
const pairedInterfaceCount = interfaceRecords.filter(({ transitionPairManifestSha256 }) => (
  transitionPairManifestSha256 !== null
)).length;
const nullInterfaceCount = interfaceRecords.length - exactInterfaceCount;
const nullInterfaceRecords = interfaceRecords.filter(({ interfaceCellSet }) => (
  interfaceCellSet === null
));
invariant(nullInterfaceRecords.every(({ toOwnerId }) => toOwnerId === null),
  'null interface geometry retained for an internal/canonical counterpart');

const ownerRegistryManifestSha256 = sha256([
  OWNER_MANIFEST_PREAMBLE,
  ...[...ownerRecords].sort((a, b) => a.ownerId.localeCompare(b.ownerId)).map((record) => (
    `${record.ownerId}\t${record.scope}\t${record.proposedCellCount ?? 'null'}\t`
    + `${record.proposedCoordinateSetSha256 ?? 'null'}\t`
    + `${record.assignmentReferenceManifestSha256}\t${record.proposalStatus}`
  )),
  '',
].join('\n'));
const interfaceRegistryManifestSha256 = sha256([
  INTERFACE_MANIFEST_PREAMBLE,
  ...[...interfaceRecords].sort((a, b) => a.contractId.localeCompare(b.contractId))
    .map((record) => (
      `${record.contractId}\t${record.fromOwnerId}\t${record.toOwnerId ?? 'null'}\t`
      + `${record.direction}\t${record.interfaceCellSet?.cellCount ?? 'null'}\t`
      + `${record.interfaceCellSet?.coordinateSetSha256 ?? 'null'}\t`
      + `${record.transitionPairManifestSha256 ?? 'null'}\t${record.status}`
    )),
  '',
].join('\n'));
const adjudicationRegistryManifestSha256 = sha256([
  ADJUDICATION_MANIFEST_PREAMBLE,
  ...[...ownershipAdjudications]
    .sort((a, b) => a.adjudicationId.localeCompare(b.adjudicationId))
    .map((record) => (
      `${record.adjudicationId}\t${record.winningOwnerId}\t`
      + `${record.yieldingOwnerIds.join(',')}\t${record.exactConflictCellSet.cellCount}\t`
      + `${record.exactConflictCellSet.coordinateSetSha256}\t${record.status}`
    )),
  '',
].join('\n'));
const g04PhysicalOwnerRegistryManifestSha256 = sha256([
  'combined-zones-g04-v3-canonical-physical-owner-registry-v1',
  `${OWNER.d05Construction}\t${b10CanonicalOwnerRecord.cellCount}\tnull\t`
    + `${b10CanonicalOwnerRecord.sparseIntervals.intervalManifestSha256}`,
  ...g04ExpandedOwnerRecords.map((record) => (
    `${record.ownerId}\t${record.cellCount}\t${record.coordinateSetSha256}\tnull`
  )),
  '',
].join('\n'));

const crossScopeDisjointProof = {
  status: 'PASS_KNOWN_PROPOSAL_SCOPES_DISJOINT_BY_EXACT_COMPONENT_BOUNDS',
  method: 'Every component-bound pair from different listed scopes is separated on at least one integer axis; no bounding-box overlap is treated as an interface approval.',
  scopeComponents: {
    'D02/C01': [d02Aggregate.bounds, loadingAssignment.bounds],
    D05: [
      { minX: 1789, maxX: 2368, minY: 61, maxY: 306, minZ: -1068, maxZ: -588 },
    ],
    D06: [
      { minX: 1643, maxX: 1872, minY: 38, maxY: 102, minZ: 40, maxZ: 160 },
      b07Set.bounds,
    ],
    'P1-B11/P1-B12': [
      grand.exactCellSets.candidateInfluenceUnion.bounds,
      b11Road.exactCellSets.proposedRoadConstruction.bounds,
      b11Road.exactCellSets.candidateInfluenceReservationUnion.bounds,
    ],
  },
  observedCrossScopeOverlapPairCount: 0,
  qualification: 'This legacy component-bounds proof supplements, but does not replace, the exact G04 v3 construction/interaction union accounting. External route/receiver, mechanism, entity, and future-state evidence remains HOLD and is not coerced to empty.',
};
const scopeEntries = Object.entries(crossScopeDisjointProof.scopeComponents);
function boundsDisjoint(left, right) {
  return left.maxX < right.minX || right.maxX < left.minX
    || left.maxY < right.minY || right.maxY < left.minY
    || left.maxZ < right.minZ || right.maxZ < left.minZ;
}
for (let left = 0; left < scopeEntries.length; left += 1) {
  for (let right = left + 1; right < scopeEntries.length; right += 1) {
    for (const leftBounds of scopeEntries[left][1]) {
      for (const rightBounds of scopeEntries[right][1]) {
        invariant(boundsDisjoint(leftBounds, rightBounds),
          `${scopeEntries[left][0]} and ${scopeEntries[right][0]} bounds overlap`);
      }
    }
  }
}

const sourceHoldGroups = [
  {
    sourceId: 'G03-V3-DOWNSTREAM-AND-TECHNICAL-HOLDS',
    source: `${INPUTS.g03CanonicalSetout}#/gate/downstreamAndTechnicalHolds`,
    records: g03.gate.downstreamAndTechnicalHolds,
  },
  {
    sourceId: 'D02-C01-UNRESOLVED-HOLDS',
    source: `${INPUTS.d02C01Proposal}#/proposalPayload/unresolvedHolds`,
    records: d02C01.proposalPayload.unresolvedHolds,
  },
  {
    sourceId: 'B09-GENUINE-RESIDUAL-BLOCKERS',
    source: `${INPUTS.b09TechnicalSystem}#/genuineResidualBlockers`,
    records: b09Technical.genuineResidualBlockers,
  },
  {
    sourceId: 'D06-DETAILED-GENUINE-RESIDUAL-BLOCKERS',
    source: `${INPUTS.d06DetailedSetout}#/genuineResidualBlockers`,
    records: d06Detailed.genuineResidualBlockers,
  },
  {
    sourceId: 'P1-B11-RETAINED-TECHNICAL-HOLDS',
    source: `${INPUTS.b11SurfaceRoad}#/nullTechnicalDesignAndRetainedHolds`,
    records: b11Road.nullTechnicalDesignAndRetainedHolds,
  },
  {
    sourceId: 'P1-B12-RETAINED-HOLDS',
    source: `${INPUTS.grandAvenuePassiveShell}#/retainedHolds`,
    records: grand.retainedHolds,
  },
].map((group) => ({
  ...group,
  recordCount: group.records.length,
  recordManifestSha256: sha256(JSON.stringify(group.records)),
}));
const sourceHoldRecordCount = sourceHoldGroups.reduce(
  (sum, group) => sum + group.recordCount,
  0,
);
invariant(sourceHoldRecordCount === sourceHoldGroups.flatMap(({ records }) => records).length,
  'source HOLD registry count drift');

const remainingEvidenceHolds = [
  {
    id: 'OI-H01-FINAL-OWNER-ACCEPTANCE',
    status: 'HOLD',
    requirement: 'The sole owner separately accepts this complete immutable proposal registry identity; this compiler cannot self-accept it.',
  },
  {
    id: 'OI-H02-NULL-INTERFACE-GEOMETRY',
    status: 'HOLD',
    requirement: `${nullInterfaceCount} genuine external endpoint interfaces still lack exact endpoint geometry; no internal exact-domain interface is represented as null.`,
  },
  {
    id: 'OI-H03-TRANSITION-STATES-AND-PAIRS',
    status: 'HOLD',
    requirement: 'Exact before/future states and transition-pair manifests remain absent for interfaces that currently have cell-set references only.',
  },
  {
    id: 'OI-H04-D02-TECHNICAL-SYSTEMS',
    status: 'HOLD',
    requirement: 'Storage, inflow, freeboard, failure/recovery, maintenance, power/control, future-fluid, receiver, geotechnical, loading, and materials evidence remains incomplete.',
  },
  {
    id: 'OI-H05-D05-TECHNICAL-SYSTEMS',
    status: 'HOLD',
    requirement: 'Support treatments, expert hydrology/relic influence, B09 mechanisms/egress, canonical future states, receivers, and technical acceptance remain incomplete.',
  },
  {
    id: 'OI-H06-D06-MECHANISMS-COMMISSIONING',
    status: 'HOLD',
    requirement: 'The four observable detailed canonical-owner adjacency groups are compiled and sealed, but mechanisms, circuits, water treatment, receiver, controls, failure logic, external routes, unobserved interfaces, and all commissioning evidence remain incomplete.',
  },
  {
    id: 'OI-H07-P1-B12-TECHNICAL-SHELL',
    status: 'HOLD',
    requirement: 'Geotechnical/road loading, hydrology, utilities, occupiable-use systems, materials, and future-state evidence remain incomplete; all caps stay closed.',
  },
  {
    id: 'OI-H08-COMPLETE-SAVED-WORLD',
    status: 'HOLD',
    requirement: 'No same-moment region/entities/POI/level.dat package is accepted.',
  },
];

const passHoldMatrix = [
  {
    id: 'OI-G01-SOURCE-CHAIN', status: 'PASS',
    result: `Accepted planning authority, G03 v3 payload ${g03.canonicalPayloadSha256}, both v3 closure artifacts, and every converged evidence stream are byte/hash bound.`,
  },
  {
    id: 'OI-G02-PROPOSED-OWNER-REGISTRY', status: 'PASS_PROPOSAL_ONLY',
    result: `${ownerRecords.length} logical owner records cover ${knownProposedCellCount.toLocaleString('en-US')} known proposal/reference cells; final acceptance remains false.`,
  },
  {
    id: 'OI-G03-EXACT-CONFLICT-PRECEDENCE', status: 'PASS_PROPOSAL_ONLY',
    result: `${ownershipAdjudications.length} exact adjudication records remove shared ownership from known D02/C01, D05, D06, and Houston conflicts without last-writer-wins.`,
  },
  {
    id: 'OI-G04-OFFLINE-EXACT-ONE-OWNER', status: 'PASS_OFFLINE',
    result: `${g04ObservedPhysicalUnionCellCount.toLocaleString('en-US')} exact construction/interaction union cells have one canonical physical owner: 0 unowned and 0 multiply owned; acceptance remains false.`,
  },
  {
    id: 'OI-G05-INTERFACE-AND-STATE-CLOSURE', status: 'HOLD',
    result: `${interfaceRecords.length} directional/default-deny contracts compiled; ${exactInterfaceCount} have exact cells and ${pairedInterfaceCount} have exact transition pairs, but ${nullInterfaceCount} genuine external endpoints plus null before/future states prevent G05 acceptance.`,
  },
  {
    id: 'OI-G06-WILDCARD-LAST-WRITER-WINS', status: 'PASS',
    result: 'Wildcard, bidirectional, broad last-writer-wins, silent clipping, and shared canonical ownership are prohibited.',
  },
  {
    id: 'OI-G07-OWNER-AND-INTERFACE-ACCEPTANCE', status: 'HOLD',
    result: 'All owner assignments, adjudications, and interface contracts are proposals with accepted=false and acceptedBy=null.',
  },
  {
    id: 'OI-G08-TECHNICAL-AND-COMPLETE-SAVE', status: 'HOLD',
    result: 'Null interfaces, technical mechanisms/effects, complete-save evidence, and final immutable technical acceptance remain incomplete.',
  },
  {
    id: 'OI-G09-GLOBAL-R00-INTERFACE-GATE', status: 'HOLD',
    result: 'The proposal closes registry geometry/accounting only; R00 cannot pass until every null/technical/acceptance HOLD closes against one identity.',
  },
];

const report = {
  schemaVersion: 3,
  id: 'combined-zones-phase1-proposed-ownership-interface-registry',
  generatedAtUtc: GENERATED_AT,
  status: 'G04_PASS_OFFLINE_EXACT_ONE_OWNER_G05_EXTERNAL_ENDPOINTS_AND_STATES_HOLD',
  purpose: 'Provide one deterministic proposal registry converged against G03 v3 and both closure artifacts, with exact one-owner construction/interaction accounting and separate nonphysical influence stewardship while preserving external endpoint, state, technical, complete-save, and final acceptance boundaries.',
  sourceBindings,
  authorityBoundary: {
    acceptedPlanningAuthorityPreserved: true,
    acceptedPlanningAuthorityPayloadSha256:
      ownerAcceptance.acceptanceRecordPayloadSha256,
    g03CanonicalPayloadSha256: g03.canonicalPayloadSha256,
    g03UnresolvedRequiredDomainCount: g03.gate.unresolvedRequiredDomainCount,
    finalOwnerAcceptanceClaimed: false,
    technicalAcceptanceClaimed: false,
    unknownGeometryCoercedToEmpty: false,
    interpretation: 'G04 exact physical accounting is offline registry evidence only. Influence records are nonphysical coordination stewardship. Neither is accepted construction, expert influence, mechanism, future-state, or operation authority.',
  },
  registryContract: {
    coordinateOrder: 'numeric x, then y, then z',
    oneOwnerRule: 'Every exact G03 v3 construction/interaction union cell receives exactly one proposed physical canonical owner after deterministic hash-bound precedence.',
    interfaceRule: 'Every interface record has one from-owner, one to-owner or explicit null counterpart, one direction, exact sets/pairs where evidence exists, and defaultDeny=true.',
    unknownRule: 'Missing interface, influence, receiver, mechanism, route, or state geometry is null+HOLD and never accepted as an empty set.',
    forbidden: [
      'wildcards',
      'bidirectional pseudo-contracts',
      'last-writer-wins',
      'shared canonical ownership',
      'bounding-box-only ownership',
      'silent clipping',
      'narrative receiver or interface invention',
    ],
    ownerRegistryManifestSha256,
    g04PhysicalOwnerRegistryManifestSha256,
    interfaceRegistryManifestSha256,
    adjudicationRegistryManifestSha256,
  },
  proposedOwnerRegistry: {
    status: 'PASS_EXACT_PROPOSAL_FINAL_OWNER_ACCEPTANCE_HOLD',
    proposedOwnerRecordCount: ownerRecords.length,
    ownerRecords,
    knownProposedCellCount,
    acceptedOwnerRecordCount: 0,
    acceptedOwnerCellCount: 0,
    canonicalOwnerAcceptanceRecorded: false,
  },
  proposedOwnershipAdjudications: {
    status: 'PASS_EXACT_PRECEDENCE_PROPOSAL_FINAL_ACCEPTANCE_HOLD',
    recordCount: ownershipAdjudications.length,
    records: ownershipAdjudications,
    acceptedRecordCount: 0,
    wildcardRecordCount: 0,
    lastWriterWinsRecordCount: 0,
  },
  g04PhysicalOwnership,
  g04InfluenceCoordinationStewardship: {
    status: 'PASS_SEPARATE_NONPHYSICAL_STEWARDSHIP_FINAL_ACCEPTANCE_HOLD',
    recordCount: g04InfluenceCoordinationStewardship.length,
    records: g04InfluenceCoordinationStewardship,
    physicalCellOwnershipClaimed: false,
    acceptedRecordCount: 0,
  },
  proposedDirectionalInterfaceRegistry: {
    status: 'PARTIAL_PASS_EXACT_DIRECTIONAL_PROPOSALS_NULL_INTERFACES_HOLD',
    contractCount: interfaceRecords.length,
    exactInterfaceCellSetCount: exactInterfaceCount,
    exactTransitionPairManifestCount: pairedInterfaceCount,
    nullInterfaceCellSetCount: nullInterfaceCount,
    contracts: interfaceRecords,
    acceptedContractCount: 0,
    wildcardContractCount: 0,
    bidirectionalContractCount: 0,
    lastWriterWinsContractCount: 0,
  },
  proposalAccounting: {
    'D02/C01': {
      proposedOwnerCount: 9,
      knownProposedCellCount: d02C01ProposedCellCount,
      loadingSeparationCellCount: loadingAssignment.cellCount,
      d02CandidateCellCountAfterLoadingPrecedence: d02CanonicalCells.length,
      loadingPrecedenceCellCount: d02WithheldCells.length,
    },
    D05: { proposedOwnerCount: 5, knownProposedCellCount: d05ProposedCellCount },
    D06: {
      proposedOwnerCount: 9,
      detailedRawProposalMembershipCount:
        d06Detailed.exactDetailedProposalLayers.rawProposalMembershipCount,
      detailedDuplicateCoordinateCount:
        d06Detailed.exactDetailedProposalLayers.duplicateCoordinateCount,
      detailedExtraMembershipCount:
        d06Detailed.exactDetailedProposalLayers.extraMembershipCount,
      detailedPrecedenceRecordCount:
        d06Detailed.internalDuplicateAndPrecedenceAudit.precedenceRecordCount,
      detailedCanonicalProposalCellCount: d06DetailedCellCount,
      detailedCanonicalAdjacencyStatus:
        'PASS_EXACT_FOUR_GROUPS_SEALED_TECHNICAL_ACCEPTANCE_HOLD',
      detailedCanonicalAdjacencyGroupCount: d06DetailedAdjacencyContracts.length,
      detailedCanonicalAdjacencyPairCount: d06DetailedAdjacencyContracts.reduce(
        (sum, item) => sum + item.transitionPairCount,
        0,
      ),
      b07CellCount: b07Set.cellCount,
      knownProposedCellCount: d06UniqueCellCount,
    },
    'P1-B11/P1-B12': {
      proposedOwnerCount: 4,
      knownProposedCellCount: gaMap.size,
      b11B12SharedRoadLoadCellCount: intersection(b11RoadLoad, influence).length,
      b11UniqueConstructionCellCount: b11Surface.length,
      b11UniqueInfluenceIncrementCellCount: b11NewInfluence.length,
      HoustonPrecedenceCellCount: houstonSet.size,
    },
    knownCrossScopeProposedCellCount: knownProposedCellCount,
    g04ObservedConstructionInteractionUnionCellCount: g04ObservedPhysicalUnionCellCount,
    g04CanonicalOwnerUnionCellCount: g04CanonicalOwnerUnionCellCount,
    g04UnownedCellCount: 0,
    g04MultiplyOwnedCellCount: 0,
    acceptedOwnerCellCount: 0,
  },
  crossScopeDisjointProof,
  sourceHoldRegistry: {
    status: 'HOLD_ALL_SOURCE_BLOCKERS_PRESERVED',
    sourceGroupCount: sourceHoldGroups.length,
    sourceHoldRecordCount,
    sourceHoldManifestSha256: sha256(JSON.stringify(sourceHoldGroups)),
    groups: sourceHoldGroups,
  },
  remainingEvidenceHolds,
  passHoldMatrix,
  disposition: {
    exactProposalOwnerRegistryCompiled: true,
    exactKnownConflictPrecedenceCompiled: true,
    directionalDefaultDenyInterfaceRegistryCompiled: true,
    p1B12GlobalProposalAuditCompiled: true,
    allKnownProposalCellsHaveOneProposedOwner: true,
    g04OfflineExactOneOwnerGatePassed: true,
    g05InterfaceAndStateGatePassed: false,
    allInterfacesExact: false,
    finalOwnerAcceptanceRecorded: false,
    finalInterfaceAcceptanceRecorded: false,
    completeSavedWorldAccepted: false,
    technicalInputsComplete: false,
    globalR00InterfaceGatePassed: false,
    r00Passed: false,
  },
  safetyBoundary: {
    offlineOnly: true,
    liveCallsPerformed: [],
    operations: [],
    operationCellCount: 0,
    materialCellCount: 0,
    futureCellCount: 0,
    constructionCellCount: 0,
    mechanismCellCount: 0,
    worldEditAuthorized: false,
    physicalBuildAuthorized: false,
    executable: false,
  },
};
report.canonicalPayloadSha256 = sha256(JSON.stringify({
  id: report.id,
  sourceBindings: report.sourceBindings,
  registryContract: report.registryContract,
  proposedOwnerRegistry: report.proposedOwnerRegistry,
  proposedOwnershipAdjudications: report.proposedOwnershipAdjudications,
  g04PhysicalOwnership: report.g04PhysicalOwnership,
  g04InfluenceCoordinationStewardship: report.g04InfluenceCoordinationStewardship,
  proposedDirectionalInterfaceRegistry: report.proposedDirectionalInterfaceRegistry,
  proposalAccounting: report.proposalAccounting,
  sourceHoldRegistry: report.sourceHoldRegistry,
  remainingEvidenceHolds: report.remainingEvidenceHolds,
}));
report.reportIdentitySha256 = sha256(JSON.stringify({
  schemaVersion: report.schemaVersion,
  id: report.id,
  generatedAtUtc: report.generatedAtUtc,
  canonicalPayloadSha256: report.canonicalPayloadSha256,
}));

const ownerRow = (item) => `| ${item.ownerId} | ${item.scope} | ${item.proposedCellCount === null ? 'unknown' : item.proposedCellCount.toLocaleString('en-US')} | ${item.proposalStatus} |`;
const gateRow = (item) => `| ${item.id} | ${item.status} | ${item.result} |`;
const markdown = `# Combined Zones Phase 1 proposed ownership and interface registry

Status: **${report.status}**

This registry converges G03 v3 and both closure artifacts with the exact D02/C01,
D05/B09, detailed D06, and Grand Avenue P1-B11/P1-B12 evidence into one deterministic ownership/interface proposal. It does not self-approve
any owner, interface, technical design, construction package, or world edit.

## Exact proposal accounting

- Proposed logical owners: **${ownerRecords.length}**
- Known proposal/reference cells assigned once after precedence: **${knownProposedCellCount.toLocaleString('en-US')}**
- G04 construction/interaction union cells assigned exactly once: **${g04ObservedPhysicalUnionCellCount.toLocaleString('en-US')}**
- G04 unowned / multiply owned cells: **0 / 0**
- Separate nonphysical influence-steward records: **${g04InfluenceCoordinationStewardship.length}**
- Exact conflict-adjudication records: **${ownershipAdjudications.length}**
- Directional/default-deny interface records: **${interfaceRecords.length}**
- Interfaces with exact cell sets: **${exactInterfaceCount}**
- Interfaces with exact transition-pair hashes: **${pairedInterfaceCount}**
- Interfaces still null/HOLD: **${nullInterfaceCount}**
- Accepted owners/interfaces/operations: **0 / 0 / 0**

## Proposed logical owners

| Owner | Scope | Proposed cells | Status |
|---|---|---:|---|
${ownerRecords.map(ownerRow).join('\n')}

The logical owner names describe control responsibilities, not additional human
decision makers. The sole human owner still must separately accept the completed
immutable registry after the remaining technical evidence closes.

## Conflict handling

Known same-coordinate conflicts use explicit exact precedence records. D05 gives
B08 the 36 portal cells and subtracts them from B09. D02/C01 gives the exact
loading-separation reservation precedence over 45 D02 cells. Detailed D06 uses
21 frozen layer-precedence records. The combined B11/B12 map gives Houston
default-deny precedence over its exact 884-cell coordination conflict.
No wildcard, shared ownership, silent clipping, or last-writer-wins rule is used.

## Interfaces

Every contract has a single direction and is default-deny. Exact reconstructed
face adjacencies carry transition-pair hashes. Source artifacts that provide only
an interface cell set retain a null transition-pair hash. Internal exact-domain
boundaries are exact and default-deny. Only genuine external maintenance, power,
receiver, surface/lobby, and utility endpoints retain null geometry; before/future
states and final acceptance remain HOLD.

## PASS/HOLD matrix

| Gate | Status | Result |
|---|---|---|
${passHoldMatrix.map(gateRow).join('\n')}

## Remaining evidence holds

${remainingEvidenceHolds.map((item) => `- **${item.id}** — ${item.requirement}`).join('\n')}

## Safety boundary

This was an offline compilation of existing exact artifacts. No live calls,
operations, materials, future-state acceptance, construction authorization, or
world edits occurred. Canonical payload identity:
\`${report.canonicalPayloadSha256}\`. Report identity:
\`${report.reportIdentitySha256}\`.
`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

console.log(JSON.stringify({
  status: report.status,
  output: relative(OUTPUT),
  markdown: relative(MARKDOWN),
  reportIdentitySha256: report.reportIdentitySha256,
  canonicalPayloadSha256: report.canonicalPayloadSha256,
  ownerRegistryManifestSha256,
  interfaceRegistryManifestSha256,
  adjudicationRegistryManifestSha256,
  proposedOwnerRecordCount: ownerRecords.length,
  knownProposedCellCount,
  adjudicationRecordCount: ownershipAdjudications.length,
  interfaceContractCount: interfaceRecords.length,
  exactInterfaceCellSetCount: exactInterfaceCount,
  exactTransitionPairManifestCount: pairedInterfaceCount,
  nullInterfaceCellSetCount: nullInterfaceCount,
  acceptedOwnerRecordCount: 0,
  acceptedInterfaceContractCount: 0,
  operationCellCount: 0,
}, null, 2));
