#!/usr/bin/env node
/**
 * Compile exact, conservative coordination-reservation proposals for the
 * residual P1-B03/B08/B09/B10/B12 surface and connector G03 domains.
 *
 * Offline/read-only only. Proposal geometry is not expert physical influence,
 * a material/future-state selection, accepted ownership, an operation, or a
 * release authorization.
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

const GENERATED_AT = value('--generated-at', '2026-08-05T07:00:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-residual-surface-connector-domain-proposals.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-residual-surface-connector-domain-proposals.md',
));

const INPUTS = Object.freeze({
  b03: 'docs/masterplans/05-combined-zones/phase1-cheyenne-jcurve-geometry.json',
  connectors: 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  d05FutureState: 'docs/masterplans/05-combined-zones/phase1-d05-future-state.json',
  d05Defaults: 'docs/masterplans/05-combined-zones/phase1-d05-conservative-defaults.json',
  d05OwnerPacket: 'docs/masterplans/05-combined-zones/phase1-d05-owner-acceptance-packet.json',
  b09Technical: 'docs/masterplans/05-combined-zones/phase1-b09-funicular-technical-system.json',
  b12: 'docs/masterplans/05-combined-zones/phase1-grand-avenue-passive-shell-candidate.json',
});

const ROLES = Object.freeze({
  b03: 'exact P1-B03 construction and external interaction proposal',
  connectors: 'exact P1-B08 construction/interaction geometry and B09 endpoints',
  d05FutureState: 'source-bound FM-01 sparse construction and support-gap identities',
  d05Defaults: 'exact protected-relic no-fill cells',
  d05OwnerPacket: 'selected B09 route and D05 planning-policy boundary',
  b09Technical: 'exact B09 reservation layers and zero-acceptance boundary',
  b12: 'exact passive-shell construction and interaction proposal',
});

const WORLD_MIN_Y = -64;
const WORLD_MAX_Y = 319;
const ADDED_SOLID_MIN_Y = 72;
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const CELL_PREAMBLE = 'combined-zones-coordinate-cell-set-v1';
const INTERVAL_PREAMBLE = 'combined-zones-residual-domain-sparse-integer-intervals-v1';
const PAYLOAD_PREAMBLE = 'combined-zones-residual-surface-connector-domain-payload-v1';
const G03_V2_MIGRATION_BASELINE = Object.freeze({
  schemaVersion: 2,
  canonicalPayloadSha256: '4742c4d09dd490ccf0cfd89a3139f40bb49e6d3fb2e03ce5584c1c666bd25248',
  unresolvedRequiredDomainCount: 15,
});

function invariant(condition, message) {
  if (!condition) throw new Error(`Residual domain compiler rejected: ${message}`);
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
  return { path: relativePath, sha256: sha256(data), bytes: data.length, role };
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
    invariant(buffer, `missing region for chunk ${key}`);
    const index = ((cx & 31) + (cz & 31) * 32) * 4;
    const sectorOffset = buffer.readUIntBE(index, 3);
    const sectorCount = buffer[index + 3];
    invariant(sectorOffset && sectorCount, `missing chunk ${key}`);
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

function compareCells(left, right) {
  return left.x - right.x || left.y - right.y || left.z - right.z;
}

function cellKey({ x, y, z }) {
  return `${x},${y},${z}`;
}

function columnKey(x, z) {
  return `${x},${z}`;
}

function parseColumnKey(key) {
  const [x, z] = key.split(',').map(Number);
  return { x, z };
}

function uniqueCells(cells) {
  const byKey = new Map();
  for (const cell of cells) byKey.set(cellKey(cell), { x: cell.x, y: cell.y, z: cell.z });
  return [...byKey.values()].sort(compareCells);
}

function unionCells(...sets) {
  return uniqueCells(sets.flat());
}

function differenceCells(left, right) {
  const rightKeys = new Set(right.map(cellKey));
  return uniqueCells(left.filter((cell) => !rightKeys.has(cellKey(cell))));
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

function boundsOfCells(cells) {
  if (cells.length === 0) return null;
  return {
    minX: Math.min(...cells.map(({ x }) => x)),
    maxX: Math.max(...cells.map(({ x }) => x)),
    minY: Math.min(...cells.map(({ y }) => y)),
    maxY: Math.max(...cells.map(({ y }) => y)),
    minZ: Math.min(...cells.map(({ z }) => z)),
    maxZ: Math.max(...cells.map(({ z }) => z)),
  };
}

function coordinateHash(cells) {
  const digest = crypto.createHash('sha256').update(`${CELL_PREAMBLE}\n`);
  for (const cell of uniqueCells(cells)) digest.update(`${cell.x},${cell.y},${cell.z}\n`);
  return digest.digest('hex');
}

function coordinateHashWithPreamble(cells, preamble) {
  const digest = crypto.createHash('sha256').update(`${preamble}\n`);
  for (const cell of uniqueCells(cells)) digest.update(`${cell.x},${cell.y},${cell.z}\n`);
  return digest.digest('hex');
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

function rangesFromStartEnd(start, end, excludedY = []) {
  if (start > end) return [];
  return subtractRanges([{ start, end }], excludedY.map((y) => ({ start: y, end: y })));
}

function rangesCount(ranges) {
  return ranges.reduce((sum, { start, end }) => sum + end - start + 1, 0);
}

function addRanges(map, x, z, ranges) {
  if (ranges.length === 0) return;
  const key = columnKey(x, z);
  map.set(key, normalizeRanges([...(map.get(key) ?? []), ...ranges]));
}

function unionIntervalMaps(...maps) {
  const result = new Map();
  for (const map of maps) {
    for (const [key, ranges] of map) {
      const { x, z } = parseColumnKey(key);
      addRanges(result, x, z, ranges);
    }
  }
  return result;
}

function faceShell(map) {
  const candidates = new Map();
  for (const [key, ranges] of map) {
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
    addRanges(result, x, z, subtractRanges(ranges, map.get(key) ?? []));
  }
  return result;
}

function mapStats(map, scopeId, domain) {
  const records = [...map.entries()].map(([key, ranges]) => ({
    ...parseColumnKey(key),
    ranges: normalizeRanges(ranges),
  })).sort((left, right) => left.x - right.x || left.z - right.z);
  const digest = crypto.createHash('sha256')
    .update(`${INTERVAL_PREAMBLE}\n${scopeId}/${domain}\n`);
  let cellCount = 0;
  let intervalCount = 0;
  let bounds = null;
  for (const record of records) {
    if (record.ranges.length === 0) continue;
    const text = record.ranges.map(({ start, end }) => `${start}..${end}`).join(',');
    digest.update(`${record.x},${record.z}\t${text}\n`);
    intervalCount += record.ranges.length;
    cellCount += rangesCount(record.ranges);
    const minY = record.ranges[0].start;
    const maxY = record.ranges.at(-1).end;
    bounds = bounds
      ? {
          minX: Math.min(bounds.minX, record.x), maxX: Math.max(bounds.maxX, record.x),
          minY: Math.min(bounds.minY, minY), maxY: Math.max(bounds.maxY, maxY),
          minZ: Math.min(bounds.minZ, record.z), maxZ: Math.max(bounds.maxZ, record.z),
        }
      : { minX: record.x, maxX: record.x, minY, maxY, minZ: record.z, maxZ: record.z };
  }
  return {
    representation: 'SOURCE_BOUND_SPARSE_EXACT_INTEGER_Y_INTERVAL_SET_NO_INLINE_COORDINATES',
    reconstructionRule: 'expand every inclusive x,z / Y-interval record under the bound source formula and exclusions',
    cellCount,
    bounds,
    sparseIntervals: {
      preamble: `${INTERVAL_PREAMBLE}\\n${scopeId}/${domain}\\n`,
      record: 'x,z<TAB>inclusive-y-start..inclusive-y-end[,start..end]',
      columnRecordCount: records.filter(({ ranges }) => ranges.length > 0).length,
      intervalCount,
      intervalManifestSha256: digest.digest('hex'),
    },
  };
}

function mapFromCells(cells) {
  const map = new Map();
  for (const { x, y, z } of uniqueCells(cells)) addRanges(map, x, z, [{ start: y, end: y }]);
  return map;
}

function cellSet(scopeId, domain, cells, reconstructionRule) {
  const exact = uniqueCells(cells);
  const sparse = mapStats(mapFromCells(exact), scopeId, domain);
  return {
    status: 'PROPOSED_EXACT_COORDINATION_RESERVATION_UNACCEPTED',
    representation: 'SPARSE_EXACT_INTEGER_CELL_SET_NO_INLINE_COORDINATES',
    reconstructionRule,
    cellCount: exact.length,
    bounds: boundsOfCells(exact),
    coordinateSetPreamble: `${CELL_PREAMBLE}\\n`,
    coordinateSetSha256: coordinateHash(exact),
    sparseIntervals: sparse.sparseIntervals,
    accepted: false,
    expertPhysicalInfluenceAccepted: false,
    constructionOwnershipAccepted: false,
    operationAuthorization: false,
  };
}

function intervalSet(scopeId, domain, map, reconstructionRule) {
  return {
    status: 'PROPOSED_EXACT_COORDINATION_RESERVATION_UNACCEPTED',
    ...mapStats(map, scopeId, domain),
    reconstructionRule,
    accepted: false,
    expertPhysicalInfluenceAccepted: false,
    constructionOwnershipAccepted: false,
    operationAuthorization: false,
  };
}

function bottomAndTopCarriers(cells) {
  const columns = new Map();
  for (const cell of uniqueCells(cells)) {
    const key = columnKey(cell.x, cell.z);
    const value = columns.get(key) ?? { x: cell.x, z: cell.z, minY: cell.y, maxY: cell.y };
    value.minY = Math.min(value.minY, cell.y);
    value.maxY = Math.max(value.maxY, cell.y);
    columns.set(key, value);
  }
  return {
    bottom: uniqueCells([...columns.values()].map(({ x, z, minY }) => ({ x, y: minY, z }))),
    top: uniqueCells([...columns.values()].map(({ x, z, maxY }) => ({ x, y: maxY, z }))),
  };
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

function buildB08(connector) {
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
  const construction = uniqueCells(excavation);
  return { construction, interaction: dilate(construction, 1) };
}

function direction(from, to) {
  return { x: Math.sign(to.x - from.x), z: Math.sign(to.z - from.z) };
}

function buildB09(model, endpoints) {
  const portal = endpoints.from;
  const summit = endpoints.to;
  let climbZ = portal.z - 1;
  while (climbZ > summit.z && mountainSurface(portal.x, climbZ - 1, model)
    !== mountainSurface(portal.x, climbZ, model)) climbZ -= 1;
  invariant(climbZ > summit.z, 'B09 lacks a level summit approach');
  let throatX = null;
  for (let distance = 1; distance <= model.extents.east; distance += 1) {
    const x = portal.x + distance;
    if (mountainSurface(x, climbZ, model) === portal.y - 1
      && mountainSurface(x - 1, climbZ, model) === portal.y - 1) {
      throatX = x;
      break;
    }
  }
  invariant(throatX !== null, 'B09 lacks an east-face throat');
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
  invariant(points.slice(1).every((point, index) => (
    Math.abs(point.x - points[index].x) + Math.abs(point.z - points[index].z) === 1
      && Math.abs(point.y - points[index].y) <= 1
  )), 'B09 centerline is not cardinal and connected');
  for (let index = 1; index < points.length - 1; index += 1) {
    const before = direction(points[index - 1], points[index]);
    const after = direction(points[index], points[index + 1]);
    if (before.x !== after.x || before.z !== after.z) {
      invariant(points[index - 1].y === points[index].y
        && points[index + 1].y === points[index].y, `B09 curve ${index} is sloped`);
    }
  }
  const railAndHeadroom = uniqueCells(points.flatMap(({ x, y, z }) => [
    { x, y, z }, { x, y: y + 1, z },
  ]));
  return { points, accommodation: dilate(railAndHeadroom, 1) };
}

function expandB12Reference(report) {
  const byStation = new Map();
  for (const run of report.exactReferenceLine.sparseRuns) {
    for (let station = run.startStation; station <= run.endStation; station += 1) {
      const offset = station - run.startStation;
      const point = {
        station,
        x: run.start.x + run.step.dx * offset,
        y: run.start.y + run.step.dy * offset,
        z: run.start.z + run.step.dz * offset,
      };
      const prior = byStation.get(station);
      invariant(!prior || cellKey(prior) === cellKey(point), `B12 station ${station} drift`);
      byStation.set(station, point);
    }
  }
  return [...byStation.values()].sort((left, right) => left.station - right.station);
}

function buildB12(report) {
  const reference = expandB12Reference(report);
  const outer = [];
  const separation = [];
  const zRange = report.exactSection.evenWidthSideBias.outerZOffsetsInclusive;
  const yRange = report.exactSection.evenHeightSideBias.outerYOffsetsInclusive;
  for (const point of reference) {
    for (let dy = yRange.min; dy <= yRange.max; dy += 1) {
      for (let dz = zRange.min; dz <= zRange.max; dz += 1) {
        outer.push({ x: point.x, y: point.y + dy, z: point.z + dz });
      }
    }
    for (const dy of [4, 5]) {
      for (let dz = zRange.min; dz <= zRange.max; dz += 1) {
        separation.push({ x: point.x, y: point.y + dy, z: point.z + dz });
      }
    }
  }
  return { reference, interaction: unionCells(outer, separation) };
}

const sourceBindings = Object.fromEntries(Object.entries(INPUTS).map(([key, filename]) => [
  key,
  binding(filename, ROLES[key]),
]));
const b03 = readJson(INPUTS.b03);
const connectors = readJson(INPUTS.connectors);
const d05 = readJson(INPUTS.d05FutureState);
const d05Defaults = readJson(INPUTS.d05Defaults);
const d05Owner = readJson(INPUTS.d05OwnerPacket);
const b09Technical = readJson(INPUTS.b09Technical);
const b12 = readJson(INPUTS.b12);

const requiredNullDomains = [
  ['P1-B03', 'influence'],
  ['P1-B08', 'influence'],
  ['P1-B09', 'construction'],
  ['P1-B09', 'influence'],
  ['P1-B10', 'interaction'],
  ['P1-B10', 'influence'],
  ['P1-B12', 'influence'],
];
invariant(b09Technical.safetyBoundary?.constructionCellCount === 0
  && b09Technical.exactTechnicalReservationProposals?.proposalLayerCount === 9,
'B09 technical reservation boundary drift');
invariant(b12.safetyBoundary?.acceptedConstructionCellCount === 0
  && b12.safetyBoundary?.operationCellCount === 0,
'B12 authority boundary drift');

const model = d05.selectedPlanningIdentity.formula;
const expectedSnapshot = d05.sourceBindings.immutablePhase0PostRegionSnapshot;
const immutableSnapshot = snapshotIdentity(absolute(expectedSnapshot.path));
invariant(immutableSnapshot.sha256 === expectedSnapshot.sha256
  && immutableSnapshot.regionFileCount === expectedSnapshot.regionFileCount
  && immutableSnapshot.bytes === expectedSnapshot.bytes,
'immutable source snapshot identity drift');

const b03Construction = uniqueCells(b03.design.excavationReservation.cells);
const b03Interaction = uniqueCells(b03.design.oneCellFaceInteractionShell.cells);
invariant(b03Construction.length === 15972
  && coordinateHash(b03Construction) === b03.design.excavationReservation.coordinateSetSha256,
'B03 construction source drift');
invariant(b03Interaction.length === 14418
  && coordinateHash(b03Interaction) === b03.design.oneCellFaceInteractionShell.coordinateSetSha256,
'B03 interaction source drift');
const b03Base = unionCells(b03Construction, b03Interaction);
const b03ExternalMaintenance = differenceCells(dilate(b03Base, 1), b03Base);
const b03Carriers = bottomAndTopCarriers(b03Construction);
const b03Influence = unionCells(
  b03Base,
  b03ExternalMaintenance,
  b03Carriers.bottom,
  b03Carriers.top,
);

const b08 = buildB08(connectors);
const b08Source = connectors.serviceTunnelCenterline.exactCellSets;
invariant(b08.construction.length === b08Source.excavationReservation.cellCount
  && coordinateHash(b08.construction) === b08Source.excavationReservation.coordinateSetSha256,
'B08 construction source drift');
invariant(b08.interaction.length === b08Source.interactionUnion.cellCount
  && coordinateHash(b08.interaction) === b08Source.interactionUnion.coordinateSetSha256,
'B08 interaction source drift');
const b08ExternalMaintenance = differenceCells(dilate(b08.interaction, 1), b08.interaction);
const b08Carriers = bottomAndTopCarriers(b08.construction);
const b08Influence = unionCells(
  b08.interaction,
  b08ExternalMaintenance,
  b08Carriers.bottom,
  b08Carriers.top,
);

const b09 = buildB09(model, d05Owner.b09B10SystemPlan.b09Route);
invariant(b09.points.length === b09Technical.deterministicGeometryContract.centerlinePointCount,
  'B09 centerline point-count drift');
invariant(b09.accommodation.length
  === b09Technical.deterministicGeometryContract.minimumPlanningAccommodation.cellCount
  && coordinateHash(b09.accommodation)
    === b09Technical.deterministicGeometryContract.minimumPlanningAccommodation.coordinateSetSha256,
'B09 accommodation source drift');
const b09Construction = b09.accommodation;
const b09ExternalCoordination = differenceCells(dilate(b09Construction, 1), b09Construction);
const b09Influence = unionCells(b09Construction, b09ExternalCoordination);

const relicCells = [];
for (const relic of d05Defaults.soleAuthorityRecommendations.bufferPolicy.relics) {
  relicCells.push(...cellsIn(relic.protectedCore.bounds));
  relicCells.push(...differenceCells(
    cellsIn(relic.minimumPlanningExclusionShell.expandedBounds),
    cellsIn(relic.protectedCore.bounds),
  ));
}
const noFillCells = unionCells(relicCells, b08.interaction, b09.accommodation);
const noFillByColumn = new Map();
for (const { x, y, z } of noFillCells) {
  const key = columnKey(x, z);
  if (!noFillByColumn.has(key)) noFillByColumn.set(key, []);
  noFillByColumn.get(key).push(y);
}
const constructionMap = new Map();
const supportGapMap = new Map();
const sourceConstructionDigest = crypto.createHash('sha256')
  .update('combined-zones-d05-sparse-solid-intervals-v1\n');
const sourceSupportDigest = crypto.createHash('sha256')
  .update('combined-zones-d05-support-gap-intervals-v1\n');
const reader = new SnapshotReader(absolute(immutableSnapshot.path));
let sourceCandidateCellCount = 0;
let sourceSupportCellCount = 0;
for (let x = model.center.x - model.extents.west;
  x <= model.center.x + model.extents.east; x += 1) {
  for (let z = model.center.z - model.extents.north;
    z <= model.center.z + model.extents.south; z += 1) {
    const currentY = await reader.surfaceY(x, z);
    const designY = mountainSurface(x, z, model);
    const rawStart = currentY + 1;
    const supportEnd = Math.min(designY, ADDED_SOLID_MIN_Y - 1);
    if (rawStart <= supportEnd) {
      addRanges(supportGapMap, x, z, [{ start: rawStart, end: supportEnd }]);
      sourceSupportCellCount += supportEnd - rawStart + 1;
      sourceSupportDigest.update(`${x},${z}\t${rawStart}..${supportEnd}\n`);
    }
    const candidate = rangesFromStartEnd(
      Math.max(rawStart, ADDED_SOLID_MIN_Y),
      designY,
      noFillByColumn.get(columnKey(x, z)) ?? [],
    );
    addRanges(constructionMap, x, z, candidate);
    sourceCandidateCellCount += rangesCount(candidate);
    const text = candidate.length
      ? candidate.map(({ start, end }) => `${start}..${end}`).join(',')
      : '-';
    sourceConstructionDigest.update(
      `${x},${z}\tcurrent=${currentY}\tdesign=${designY}\tadd=${text}\n`,
    );
  }
}
const sourceB10 = d05.selectedPlanningIdentity.boundCandidateAddedSolidIntervals;
const sourceSupport = d05.selectedPlanningIdentity.boundSupportGap;
invariant(sourceCandidateCellCount === sourceB10.candidateAddedSolidCellCount
  && sourceConstructionDigest.digest('hex') === sourceB10.intervalManifestSha256,
'B10 source construction intervals do not reproduce');
invariant(sourceSupportCellCount === sourceSupport.cellCount
  && sourceSupportDigest.digest('hex') === sourceSupport.intervalManifestSha256,
'B10 support-gap intervals do not reproduce');
const b10InteractionMap = faceShell(constructionMap);
const b10InfluenceMap = unionIntervalMaps(b10InteractionMap, supportGapMap);

const b12Geometry = buildB12(b12);
invariant(b12Geometry.reference.length === b12.exactReferenceLine.pointCount,
  'B12 reference expansion drift');
invariant(b12Geometry.interaction.length === b12.exactCellSets.candidateInfluenceUnion.cellCount
  && coordinateHashWithPreamble(
    b12Geometry.interaction,
    'combined-zones-grand-avenue-passive-shell-candidate-cells-v1-influence-union',
  )
    === b12.exactCellSets.candidateInfluenceUnion.coordinateSetSha256,
'B12 candidate interaction source drift');
const b12ExternalCoordination = differenceCells(
  dilate(b12Geometry.interaction, 1),
  b12Geometry.interaction,
);
const b12Influence = unionCells(b12Geometry.interaction, b12ExternalCoordination);

const proposalSets = {
  'P1-B03': {
    influence: {
      ...cellSet(
        'P1-B03',
        'influence',
        b03Influence,
        'B03 construction plus external one-face interaction, exact one-cell Chebyshev constructability/maintenance shell, and bottom/top drainage/utility carrier reservations.',
      ),
      reservationFamilies: {
        boundConstructionAndInteraction: cellSet('P1-B03', 'influence-base', b03Base,
          'exact union of the bound B03 construction and external face-interaction sets'),
        externalConstructionMaintenanceShell: cellSet('P1-B03', 'influence-maintenance',
          b03ExternalMaintenance, 'exact Chebyshev-one shell outside the bound B03 base union'),
        candidateDrainageCarrier: cellSet('P1-B03', 'influence-drainage',
          b03Carriers.bottom, 'minimum Y cell in every B03 construction X/Z column'),
        candidateUtilityInspectionCarrier: cellSet('P1-B03', 'influence-utility',
          b03Carriers.top, 'maximum Y cell in every B03 construction X/Z column'),
      },
    },
  },
  'P1-B08': {
    influence: {
      ...cellSet(
        'P1-B08',
        'influence',
        b08Influence,
        'B08 interaction union plus exact one-cell Chebyshev constructability/maintenance shell and bottom/top drainage/utility carrier reservations.',
      ),
      reservationFamilies: {
        boundInteraction: cellSet('P1-B08', 'influence-base', b08.interaction,
          'bound exact B08 interaction union'),
        externalConstructionMaintenanceShell: cellSet('P1-B08', 'influence-maintenance',
          b08ExternalMaintenance, 'exact Chebyshev-one shell outside the B08 interaction union'),
        candidateDrainageCarrier: cellSet('P1-B08', 'influence-drainage',
          b08Carriers.bottom, 'minimum Y cell in every B08 construction X/Z column'),
        candidateUtilityInspectionCarrier: cellSet('P1-B08', 'influence-utility',
          b08Carriers.top, 'maximum Y cell in every B08 construction X/Z column'),
      },
    },
  },
  'P1-B09': {
    construction: {
      ...cellSet(
        'P1-B09',
        'construction',
        b09Construction,
        'Exact union of the lower/summit station envelopes and running guideway/support accommodation; target envelope only, with no block state or system acceptance.',
      ),
      proposedMaterialStates: null,
      functionalMechanismsAccepted: false,
    },
    influence: {
      ...cellSet(
        'P1-B09',
        'influence',
        b09Influence,
        'B09 proposed construction envelope plus exact one-cell Chebyshev construction-method, evacuation-maintenance, drainage, and power-coordination shell.',
      ),
      reservationFamilies: {
        boundConstructionTargetEnvelope: cellSet('P1-B09', 'influence-base',
          b09Construction, 'bound exact B09 planning accommodation promoted only to an unaccepted construction target envelope proposal'),
        externalConstructionMaintenanceDrainagePowerShell: cellSet('P1-B09',
          'influence-external', b09ExternalCoordination,
          'exact Chebyshev-one external coordination shell; not a physical propagation kernel'),
      },
    },
  },
  'P1-B10': {
    interaction: {
      ...intervalSet(
        'P1-B10',
        'interaction',
        b10InteractionMap,
        'Exact external six-face shell of the source-bound FM-01 candidate-added-solid interval set after protected-relic, B08, and B09 exclusions.',
      ),
      sourceConstructionIntervalManifestSha256: sourceB10.intervalManifestSha256,
      includedConstructionCellCount: 0,
    },
    influence: {
      ...intervalSet(
        'P1-B10',
        'influence',
        b10InfluenceMap,
        'Exact union of the B10 external six-face coordination shell and the source-bound below-Y72 support-gap reservation; no groundwater, snowmelt, erosion, settlement, or discharge kernel is inferred.',
      ),
      reservationFamilies: {
        externalConstructionMaintenanceDrainageUtilityShell: intervalSet(
          'P1-B10',
          'influence-external-shell',
          b10InteractionMap,
          'exact external six-face shell of candidate added-solid intervals',
        ),
        belowY72SupportAndGroundInterfaceReservation: intervalSet(
          'P1-B10',
          'influence-support-gap',
          supportGapMap,
          'source-bound exact support gap from current top + 1 through Y71 where design surface is higher',
        ),
      },
      sourceSupportGapIntervalManifestSha256: sourceSupport.intervalManifestSha256,
      expertGroundwaterKernel: null,
      expertCryosphereKernel: null,
      acceptedReceiver: null,
      acceptedOutfall: null,
    },
  },
  'P1-B12': {
    influence: {
      ...cellSet(
        'P1-B12',
        'influence',
        b12Influence,
        'Bound passive-shell interaction/load-separation union plus exact one-cell Chebyshev construction-method, maintenance, drainage, and utility-coordination shell.',
      ),
      reservationFamilies: {
        boundShellAndRoadLoadInteraction: cellSet('P1-B12', 'influence-base',
          b12Geometry.interaction, 'bound outer shell envelope union two-layer road-load separation'),
        externalConstructionMaintenanceDrainageUtilityShell: cellSet('P1-B12',
          'influence-external', b12ExternalCoordination,
          'exact Chebyshev-one external coordination shell; not an expert influence radius'),
      },
    },
  },
};

const proposedDomains = Object.entries(proposalSets).flatMap(([scopeId, domains]) => (
  Object.entries(domains).map(([domain, manifest]) => ({
    scopeId,
    domain,
    cellCount: manifest.cellCount,
    bounds: manifest.bounds,
    exactSetIdentitySha256:
      manifest.coordinateSetSha256 ?? manifest.sparseIntervals.intervalManifestSha256,
  }))
));
invariant(proposedDomains.length === 7, 'expected seven exact domain proposals');

const externalTechnicalHolds = [
  {
    id: 'EXT-CONSTRUCTION-METHOD-AND-STAGING',
    status: 'HOLD',
    requirement: 'Accept scope-specific means, sequencing, equipment sweeps, temporary works, access, laydown, and reinstatement against the complete saved world.',
  },
  {
    id: 'EXT-GEOTECHNICAL-STRUCTURAL-LOADS',
    status: 'HOLD',
    requirement: 'Accept loads, settlement/deformation criteria, foundations, retaining, support, liner, transfer, and positive protected-feature margins.',
  },
  {
    id: 'EXT-HYDROLOGY-CRYOSPHERE-DRAINAGE',
    status: 'HOLD',
    requirement: 'Accept finite groundwater, infiltration, snowmelt, erosion, dewatering, sump, drainage, receiver, outfall, capacity, and no-diversion models.',
  },
  {
    id: 'EXT-UTILITIES-POWER-LIFE-SAFETY',
    status: 'HOLD',
    requirement: 'Accept service types, circuits, isolation, maintainability, rescue/egress, fire/smoke behavior, commissioning, and operational controls.',
  },
  {
    id: 'EXT-COMPLETE-SAVE-AND-PROTECTED-CLEARANCE',
    status: 'HOLD',
    requirement: 'Bind region/entities/POI/level.dat in one same-moment capture and rerun exact all-start, entity, POI, fabric, and protected-core comparisons.',
  },
  {
    id: 'EXT-OWNER-INTERFACE-AND-MATERIAL-ACCEPTANCE',
    status: 'HOLD',
    requirement: 'Accept one owner per physical cell, default-deny directional seams, materials/future states, technical evidence, and the final hash-bound package.',
  },
];

const proposalPayload = {
  immutableSnapshot,
  g03MigrationBaseline: {
    sourceSchemaVersion: G03_V2_MIGRATION_BASELINE.schemaVersion,
    sourceCanonicalPayloadSha256: G03_V2_MIGRATION_BASELINE.canonicalPayloadSha256,
    sourceUnresolvedRequiredDomainCount:
      G03_V2_MIGRATION_BASELINE.unresolvedRequiredDomainCount,
    assignedNullDomainCount: requiredNullDomains.length,
    descendantCanonicalG03ConsumedAsInput: false,
    reason: 'This proposal package is an upstream migration input to G03 and cannot hash-bind the descendant G03 artifact.',
  },
  proposalSets,
  proposedDomains,
  externalTechnicalHolds,
};
const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-residual-surface-connector-domain-proposals',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_SEVEN_EXACT_PROPOSAL_DOMAINS_COMPILED_ALL_TECHNICAL_ACCEPTANCE_AND_RELEASE_GATES_HOLD',
  purpose: 'Replace seven surface/connector geometry nulls with exact conservative proposal reservations while preserving every expert, complete-save, ownership, material, operation, and release HOLD.',
  sourceBindings,
  immutableSnapshot,
  proposalPayload,
  proposalPayloadSha256: sha256(`${PAYLOAD_PREAMBLE}\n${JSON.stringify(proposalPayload)}\n`),
  projectedG03Impact: {
    proposalCompilerMutatesCanonicalG03: false,
    migrationBaselineUnresolvedRequiredDomainCount:
      G03_V2_MIGRATION_BASELINE.unresolvedRequiredDomainCount,
    exactProposalGeometryDomainCount: proposedDomains.length,
    projectedUnresolvedRequiredDomainCountIfConsumedWithoutOtherChanges:
      G03_V2_MIGRATION_BASELINE.unresolvedRequiredDomainCount - proposedDomains.length,
    exactProposalDomains: proposedDomains.map(({ scopeId, domain }) => ({ scopeId, domain })),
    migrationBaselineCanonicalG03Passed: false,
    reason: 'At the v2 migration baseline these seven exact proposals reduced 15 null domains to eight. This upstream package does not inspect or self-accept its descendant canonical G03 result.',
  },
  safetyBoundary: {
    offlineOnly: true,
    immutableCopiedRegionOnly: true,
    liveCallsPerformed: [],
    databasesOpened: [],
    operations: [],
    proposedBlockStatePalette: [],
    acceptedConstructionCellCount: 0,
    acceptedInfluenceCellCount: 0,
    acceptedMaterialCellCount: 0,
    acceptedFutureCellCount: 0,
    acceptedOwnerAssignmentCount: 0,
    acceptedInterfaceContractCount: 0,
    operationCellCount: 0,
    constructionAuthorized: false,
    physicalReleaseAuthorized: false,
    operationGenerationAuthorized: false,
    worldEditAuthorized: false,
    executable: false,
  },
};

const rows = proposedDomains.map((item) => (
  `| ${item.scopeId} | ${item.domain} | ${item.cellCount.toLocaleString('en-US')} | `
  + `\`${item.exactSetIdentitySha256}\` | proposal only |`
));
const markdown = `# Combined Zones residual surface and connector domain proposals

Generated: ${GENERATED_AT}

Status: **${report.status}**
Construction authority: **none**
World edits: **not authorized**

This read-only package gives seven previously null G03 domains exact conservative
proposal sets. A reservation is not a physical influence model: it identifies
cells that later engineering and ownership review must conservatively coordinate.
No material, future block state, mechanism, receiver, outfall, operation, or
expert acceptance is created.

## Exact proposal result

| Scope | Domain | Exact cells | Exact set identity SHA-256 | Authority |
|---|---|---:|---|---|
${rows.join('\n')}

At the immutable G03 v2 migration baseline, consuming these sets without other changes
the geometry-null count projects from **${G03_V2_MIGRATION_BASELINE.unresolvedRequiredDomainCount}**
to **${report.projectedG03Impact.projectedUnresolvedRequiredDomainCountIfConsumedWithoutOtherChanges}**.
This upstream package alone did not pass G03: eight other canonical domains were
still null at that baseline. Any descendant G03 result is assessed separately and
is deliberately not consumed here.

## What each proposal means

- **B03/B08 influence:** their exact bound construction/interaction geometry,
  one-cell constructability and maintenance coordination shell, and explicit
  bottom/top drainage and utility carrier reservations.
- **B09 construction:** the already bound 7,800-cell station and guideway/support
  accommodation, now explicitly authored as an unaccepted construction target
  envelope with no block states. Its influence proposal adds a one-cell external
  construction, maintenance/egress, drainage, and power coordination shell.
- **B10 interaction:** the exact external six-face shell of all 14,768,553
  source-bound FM-01 candidate added-solid cells after the protected-relic, B08,
  and B09 exclusions. **B10 influence** is that shell union the exact 754,224-cell
  below-Y72 support-gap reservation.
- **B12 influence:** the passive-shell interaction/road-load set plus a one-cell
  external construction, maintenance, drainage, and utility coordination shell.

The one-cell shells are exact coordination reservations derived from committed
geometry. They are deliberately not groundwater, settlement, structural,
snowmelt, erosion, smoke, fire, load-transfer, equipment-sweep, or other expert
physical-propagation kernels.

## Holds that remain external

${externalTechnicalHolds.map((item) => `- **${item.id}: ${item.status}.** ${item.requirement}`).join('\n')}

## Fail-closed conclusion

All seven domains are defensible as non-null **proposals**. None is accepted as
construction or physical influence authority. The compiler emits no operation,
opens no seam, changes no owner, and performs no world edit.

Proposal payload SHA-256: \`${report.proposalPayloadSha256}\`
`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

console.log(JSON.stringify({
  output: relative(OUTPUT),
  markdown: relative(MARKDOWN),
  status: report.status,
  proposedDomainCount: proposedDomains.length,
  projectedUnresolvedRequiredDomainCount:
    report.projectedG03Impact.projectedUnresolvedRequiredDomainCountIfConsumedWithoutOtherChanges,
  b10InteractionCellCount: proposalSets['P1-B10'].interaction.cellCount,
  b10InfluenceCellCount: proposalSets['P1-B10'].influence.cellCount,
  proposalPayloadSha256: report.proposalPayloadSha256,
}, null, 2));
