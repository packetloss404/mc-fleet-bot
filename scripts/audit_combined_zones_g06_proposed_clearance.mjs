#!/usr/bin/env node
/**
 * Audit exact proposed G03 domains against Phase 0 generated starts and the
 * frozen zero-margin protected-relic cores.
 *
 * Offline only. This audit does not authorize construction, accept an
 * interface, select an expert influence distance, pass G06, or emit ops.
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
  'docs/masterplans/05-combined-zones/phase1-g06-proposed-clearance-audit.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-g06-proposed-clearance-audit.md',
));

const INPUTS = Object.freeze({
  g03: 'docs/masterplans/05-combined-zones/phase1-g03-canonical-setout.json',
  ownership: 'docs/masterplans/05-combined-zones/phase1-proposed-ownership-interface-registry.json',
  releaseContract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
  phase0: 'docs/masterplans/05-combined-zones/phase0-survey-evidence.json',
  relics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  completeSave: 'docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit.json',
  b03: 'docs/masterplans/05-combined-zones/phase1-cheyenne-jcurve-geometry.json',
  connectors: 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  d05Alternatives: 'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json',
  d05FutureState: 'docs/masterplans/05-combined-zones/phase1-d05-future-state.json',
  d05Defaults: 'docs/masterplans/05-combined-zones/phase1-d05-conservative-defaults.json',
  d02Technical: 'docs/masterplans/05-combined-zones/phase1-d02-technical-design.json',
  d02C01:
    'docs/masterplans/05-combined-zones/phase1-d02-c01-ownership-loading-interface-proposal.json',
  d06LifeSafety: 'docs/masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.json',
  d06Mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  d06Detailed: 'docs/masterplans/05-combined-zones/phase1-d06-detailed-mechanism-setout.json',
  emptyEight: 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
  b11: 'docs/masterplans/05-combined-zones/phase1-b11-external-interface-acceptance.json',
  b11SurfaceRoad:
    'docs/masterplans/05-combined-zones/phase1-b11-surface-road-technical-proposal.json',
  b12: 'docs/masterplans/05-combined-zones/phase1-grand-avenue-passive-shell-candidate.json',
  residualSurfaceClosure:
    'docs/masterplans/05-combined-zones/phase1-residual-surface-connector-domain-proposals.json',
  civilLifeSafetyClosure:
    'docs/masterplans/05-combined-zones/phase1-civil-life-safety-domain-closure.json',
});

const ROLES = Object.freeze({
  g03: 'canonical all-30 exact proposed-domain registry and downstream HOLD boundary',
  ownership: 'proposed owner/interface context and accepted-contract boundary',
  releaseContract: 'controlling G06 pass rule',
  phase0: 'complete 114-record generated-structure-start registry and snapshot identity',
  relics: 'three frozen zero-margin default-deny protected cores and positive-margin HOLDs',
  completeSave: 'complete-save default-deny dependency',
  b03: 'exact B03 construction and external interaction shell reconstruction source',
  connectors: 'exact B08 construction/interaction and B09 anchor reconstruction source',
  d05Alternatives: 'selected FM-01 B09/B10 formula and sparse proposal source',
  d05FutureState: 'selected B10 construction and support-gap exact identities',
  d05Defaults: 'exact D05 protected-relic no-fill core and one-cell shell sets',
  d02Technical: 'exact selected D02 candidate envelope source',
  d02C01: 'exact bounded C01 loading/D02 directional-interface reconstruction source',
  d06LifeSafety: 'selected B07-C-WEST-2 reconstruction source',
  d06Mechanisms: 'D06 source-limited mechanism proposal and exact-reference boundary',
  d06Detailed: 'exact D06 detailed functional setout proposed interaction union',
  emptyEight: 'frozen Empty Eight geometry needed to reproduce D06 functional carriers',
  b11: 'owner-accepted B11 reference profile used to reproduce proposed road domains',
  b11SurfaceRoad: 'exact B11 construction, interaction, and candidate influence proposal identities',
  b12: 'exact P1-B12 construction/interaction reconstruction source and prior audits',
  residualSurfaceClosure: 'seven exact surface/connector proposal domains consumed by G03 v3',
  civilLifeSafetyClosure: 'eight exact civil/life-safety proposal domains consumed by G03 v3',
});

const WORLD_MIN_Y = -64;
const WORLD_MAX_Y = 319;
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const CELL_PREAMBLE = 'combined-zones-coordinate-cell-set-v1';
const D06_CELL_PREAMBLE = 'combined-zones-d06-life-safety-cell-set-v1';
const B11_CELL_PREAMBLE = 'combined-zones-b11-surface-road-technical-proposal-cells-v1';
const CIVIL_CLOSURE_CELL_PREAMBLE =
  'combined-zones-civil-life-safety-domain-closure-cell-set-v1';
const RESIDUAL_INTERVAL_PREAMBLE =
  'combined-zones-residual-domain-sparse-integer-intervals-v1';
const PAYLOAD_PREAMBLE = 'combined-zones-g06-proposed-clearance-payload-v3';
const REPORT_PREAMBLE = 'combined-zones-g06-proposed-clearance-report-v3';
const PRIOR_G03_PAYLOAD_SHA256 =
  '4742c4d09dd490ccf0cfd89a3139f40bb49e6d3fb2e03ce5584c1c666bd25248';
const PRIOR_G06_PAYLOAD_SHA256 =
  '0f5b1d41db427fa6a45de5f45d91c6467f6e67309464cdb0d78a7a8f48ee4034';

function invariant(condition, message) {
  if (!condition) throw new Error(`G06 proposed clearance rejected: ${message}`);
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

function fileBinding(relativePath, role) {
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
    this.surfaces = new Map();
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
    return result;
  }

  async surfaceY(x, z) {
    const key = `${x},${z}`;
    if (this.surfaces.has(key)) return this.surfaces.get(key);
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
      if (!AIR.has(state.Name)) {
        this.surfaces.set(key, y);
        return y;
      }
    }
    this.surfaces.set(key, WORLD_MIN_Y - 1);
    return WORLD_MIN_Y - 1;
  }
}

function compareCells(left, right) {
  return left.x - right.x || left.y - right.y || left.z - right.z;
}

function cellKey({ x, y, z }) {
  return `${x},${y},${z}`;
}

function uniqueCells(cells) {
  const byKey = new Map();
  for (const cell of cells) byKey.set(cellKey(cell), { x: cell.x, y: cell.y, z: cell.z });
  return [...byKey.values()].sort(compareCells);
}

function union(...sets) {
  return uniqueCells(sets.flat());
}

function difference(left, right) {
  const excluded = new Set(right.map(cellKey));
  return uniqueCells(left.filter((cell) => !excluded.has(cellKey(cell))));
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

function inside(cell, bounds) {
  return cell.x >= bounds.minX && cell.x <= bounds.maxX
    && cell.y >= bounds.minY && cell.y <= bounds.maxY
    && cell.z >= bounds.minZ && cell.z <= bounds.maxZ;
}

function boundsIntersect(left, right) {
  return left.minX <= right.maxX && left.maxX >= right.minX
    && left.minY <= right.maxY && left.maxY >= right.minY
    && left.minZ <= right.maxZ && left.maxZ >= right.minZ;
}

function boundsOf(cells) {
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

function hashCells(cells, preamble = CELL_PREAMBLE) {
  const digest = crypto.createHash('sha256');
  digest.update(`${preamble}\n`);
  for (const cell of uniqueCells(cells)) digest.update(`${cell.x},${cell.y},${cell.z}\n`);
  return digest.digest('hex');
}

function rawHashCells(cells) {
  return sha256(uniqueCells(cells).map(cellKey).join('\n'));
}

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

function bottomAndTopCarriers(cells) {
  const columns = new Map();
  for (const cell of uniqueCells(cells)) {
    const key = `${cell.x},${cell.z}`;
    const record = columns.get(key) ?? {
      x: cell.x, z: cell.z, minY: cell.y, maxY: cell.y,
    };
    record.minY = Math.min(record.minY, cell.y);
    record.maxY = Math.max(record.maxY, cell.y);
    columns.set(key, record);
  }
  return {
    bottom: uniqueCells([...columns.values()].map(({ x, z, minY }) => ({ x, y: minY, z }))),
    top: uniqueCells([...columns.values()].map(({ x, z, maxY }) => ({ x, y: maxY, z }))),
  };
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
        if (range.start < exclusion.start) {
          next.push({ start: range.start, end: exclusion.start - 1 });
        }
        if (exclusion.end < range.end) {
          next.push({ start: exclusion.end + 1, end: range.end });
        }
      }
    }
    result = next;
  }
  return result;
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

function intervalMapStats(map, scopeId, domain) {
  const records = [...map.entries()].map(([key, ranges]) => ({
    ...parseColumnKey(key), ranges: normalizeRanges(ranges),
  })).sort((left, right) => left.x - right.x || left.z - right.z);
  const digest = crypto.createHash('sha256')
    .update(`${RESIDUAL_INTERVAL_PREAMBLE}\n${scopeId}/${domain}\n`);
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
    bounds = bounds
      ? {
          minX: Math.min(bounds.minX, record.x), maxX: Math.max(bounds.maxX, record.x),
          minY: Math.min(bounds.minY, minY), maxY: Math.max(bounds.maxY, maxY),
          minZ: Math.min(bounds.minZ, record.z), maxZ: Math.max(bounds.maxZ, record.z),
        }
      : { minX: record.x, maxX: record.x, minY, maxY, minZ: record.z, maxZ: record.z };
  }
  return {
    cellCount,
    bounds,
    columnRecordCount: records.filter(({ ranges }) => ranges.length > 0).length,
    intervalCount,
    intervalManifestSha256: digest.digest('hex'),
  };
}

function cellsFromIntervalMap(bounds, map) {
  const result = [];
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
    for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
      for (const range of map.get(columnKey(x, z)) ?? []) {
        const minY = Math.max(bounds.minY, range.start);
        const maxY = Math.min(bounds.maxY, range.end);
        for (let y = minY; y <= maxY; y += 1) result.push({ x, y, z });
      }
    }
  }
  return uniqueCells(result);
}

function intersectionIdentity(cells) {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: boundsOf(exact),
    coordinateSetSha256: hashCells(exact),
  };
}

function mountainSurface(x, z, formula) {
  const dx = x - formula.center.x;
  const dz = z - formula.center.z;
  const xDenominator = dx < 0 ? formula.extents.west : formula.extents.east;
  const zDenominator = dz < 0 ? formula.extents.north : formula.extents.south;
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
  return formula.baseSurfaceY + Math.floor(
    (formula.peakSurfaceY - formula.baseSurfaceY) * (denominator - numerator) / denominator,
  );
}

function buildB08(connectors) {
  const excavation = [];
  for (const point of connectors.serviceTunnelCenterline.centerline.points) {
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
  const exact = uniqueCells(excavation);
  return { excavation: exact, interaction: dilate(exact, 1) };
}

function buildB07(candidate) {
  const { top, observationLanding: observation, lowerLobby: lower } = candidate.anchors;
  const shiftedX = observation.x - candidate.westOffsetBlocks;
  const excavation = union(
    cellsIn({
      minX: top.x - 3, maxX: top.x + 3,
      minY: observation.y, maxY: top.y,
      minZ: top.z - 3, maxZ: top.z + 3,
    }),
    cellsIn({
      minX: shiftedX - 3, maxX: observation.x + 3,
      minY: observation.y - 3, maxY: observation.y + 3,
      minZ: observation.z - 3, maxZ: observation.z + 3,
    }),
    cellsIn({
      minX: shiftedX - 3, maxX: shiftedX + 3,
      minY: observation.y - 3, maxY: observation.y + 3,
      minZ: lower.z - 3, maxZ: observation.z + 3,
    }),
    cellsIn({
      minX: shiftedX - 3, maxX: shiftedX + 3,
      minY: lower.y, maxY: observation.y,
      minZ: lower.z - 3, maxZ: lower.z + 3,
    }),
    cellsIn({
      minX: shiftedX - 3, maxX: lower.x + 3,
      minY: lower.y - 3, maxY: lower.y + 3,
      minZ: lower.z - 3, maxZ: lower.z + 3,
    }),
  );
  return { excavation, interaction: dilate(excavation, 1) };
}

function buildB09(formula, endpoints) {
  const portal = endpoints.from;
  const summit = endpoints.to;
  let climbZ = portal.z - 1;
  while (climbZ > summit.z && mountainSurface(portal.x, climbZ - 1, formula)
    !== mountainSurface(portal.x, climbZ, formula)) climbZ -= 1;
  invariant(climbZ > summit.z, 'B09 summit-approach curve missing');
  let throatX = null;
  for (let distance = 1; distance <= formula.extents.east; distance += 1) {
    const x = portal.x + distance;
    if (mountainSurface(x, climbZ, formula) === portal.y - 1
      && mountainSurface(x - 1, climbZ, formula) === portal.y - 1) {
      throatX = x;
      break;
    }
  }
  invariant(throatX !== null, 'B09 east throat missing');
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
    points.push({ x, y: mountainSurface(x, climbZ, formula) + 1, z: climbZ });
  }
  for (let distance = 1; distance <= Math.abs(summit.z - climbZ); distance += 1) {
    const z = climbZ - distance;
    points.push({ x: summit.x, y: mountainSurface(summit.x, z, formula) + 1, z });
  }
  const railAndHeadroom = uniqueCells(points.flatMap(({ x, y, z }) => [
    { x, y, z }, { x, y: y + 1, z },
  ]));
  return dilate(railAndHeadroom, 1);
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
      const previous = byStation.get(station);
      invariant(!previous || cellKey(previous) === cellKey(point),
        `B12 sparse run disagreement at station ${station}`);
      byStation.set(station, point);
    }
  }
  return [...byStation.values()].sort((left, right) => left.station - right.station);
}

function buildB12(report) {
  const reference = expandB12Reference(report);
  const outerZ = [];
  const outerY = [];
  const innerZ = [];
  const innerY = [];
  for (let z = report.exactSection.evenWidthSideBias.outerZOffsetsInclusive.min;
    z <= report.exactSection.evenWidthSideBias.outerZOffsetsInclusive.max; z += 1) outerZ.push(z);
  for (let y = report.exactSection.evenHeightSideBias.outerYOffsetsInclusive.min;
    y <= report.exactSection.evenHeightSideBias.outerYOffsetsInclusive.max; y += 1) outerY.push(y);
  for (let z = report.exactSection.evenWidthSideBias.innerZOffsetsInclusive.min;
    z <= report.exactSection.evenWidthSideBias.innerZOffsetsInclusive.max; z += 1) innerZ.push(z);
  for (let y = report.exactSection.evenHeightSideBias.innerYOffsetsInclusive.min;
    y <= report.exactSection.evenHeightSideBias.innerYOffsetsInclusive.max; y += 1) innerY.push(y);
  const outer = [];
  const inner = [];
  const separation = [];
  const lining = [];
  for (const point of reference) {
    for (const dy of outerY) {
      for (const dz of outerZ) {
        const cell = { x: point.x, y: point.y + dy, z: point.z + dz, station: point.station };
        outer.push(cell);
        if (dy === outerY[0] || dy === outerY.at(-1) || dz === outerZ[0] || dz === outerZ.at(-1)) {
          lining.push(cell);
        }
      }
    }
    for (const dy of innerY) {
      for (const dz of innerZ) inner.push({ x: point.x, y: point.y + dy, z: point.z + dz, station: point.station });
    }
    for (const dy of [4, 5]) {
      for (const dz of outerZ) separation.push({ x: point.x, y: point.y + dy, z: point.z + dz });
    }
  }
  const closureStations = new Set([
    report.passiveClosures.westCapStation,
    ...report.passiveClosures.periodicBulkheadStations,
    report.passiveClosures.eastCapStation,
  ]);
  return {
    material: union(lining, inner.filter(({ station }) => closureStations.has(station))),
    interaction: union(outer, separation),
  };
}

function rasterLine(from, to) {
  let x = from.x;
  let z = from.z;
  const dx = Math.abs(to.x - x);
  const dz = Math.abs(to.z - z);
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

function buildB11SurfaceRoad(profileSource, proposalSource) {
  const accepted = profileSource.acceptancePayload.grandAvenue;
  const plan = rasterLine(accepted.start, accepted.end);
  const profile = plan.map((point, station) => ({
    station,
    x: point.x,
    y: 68 + Math.round((4 * station) / (plan.length - 1)),
    z: point.z,
  }));
  const orderedManifest = `${profile.map(({ x, y, z }) => `${x},${y},${z}`).join('\n')}\n`;
  invariant(profile.length === accepted.centerlinePointCount, 'B11 profile point-count drift');
  invariant(sha256(orderedManifest) === accepted.centerlineSha256,
    'B11 accepted profile coordinate identity drift');

  const construction = [];
  const interaction = [];
  const load = [];
  const drainage = [];
  const dryUtility = [];
  const wetUtility = [];
  for (const point of profile) {
    for (let dz = -3; dz <= 4; dz += 1) {
      construction.push({ x: point.x, y: point.y, z: point.z + dz });
      for (const dy of [-2, -1]) {
        load.push({ x: point.x, y: point.y + dy, z: point.z + dz });
      }
    }
    for (let dz = -4; dz <= 5; dz += 1) {
      for (let dy = -2; dy <= 1; dy += 1) {
        interaction.push({ x: point.x, y: point.y + dy, z: point.z + dz });
      }
    }
    drainage.push(
      { x: point.x, y: point.y - 1, z: point.z - 4 },
      { x: point.x, y: point.y - 1, z: point.z + 5 },
    );
    dryUtility.push({ x: point.x, y: point.y - 2, z: point.z - 4 });
    wetUtility.push({ x: point.x, y: point.y - 2, z: point.z + 5 });
  }
  const result = {
    construction: uniqueCells(construction),
    interaction: uniqueCells(interaction),
    influence: union(load, drainage, dryUtility, wetUtility),
  };
  const source = proposalSource.exactCellSets;
  for (const [domain, sourceKey, preamble] of [
    ['construction', 'proposedRoadConstruction', `${B11_CELL_PREAMBLE}-road-surface`],
    ['interaction', 'candidateInteractionUnion', `${B11_CELL_PREAMBLE}-interaction-prism`],
    ['influence', 'candidateInfluenceReservationUnion', `${B11_CELL_PREAMBLE}-influence-reservation`],
  ]) {
    invariant(result[domain].length === source[sourceKey].cellCount,
      `B11 ${domain} source count drift`);
    invariant(hashCells(result[domain], preamble) === source[sourceKey].coordinateSetSha256,
      `B11 ${domain} source coordinate identity drift`);
  }
  return result;
}

function buildD06DetailedSetout(payload, emptyEightSource, detailedSource) {
  const layers = new Map();
  const add = (id, cells) => {
    invariant(!layers.has(id), `duplicate D06 detailed layer ${id}`);
    const exact = uniqueCells(cells);
    const source = detailedSource.exactDetailedProposalLayers.proposalLayers[id]
      ?.rawProposalCellSet;
    invariant(source, `D06 detailed source layer ${id} missing`);
    invariant(exact.length === source.cellCount, `D06 detailed ${id} count drift`);
    invariant(JSON.stringify(boundsOf(exact)) === JSON.stringify(source.bounds),
      `D06 detailed ${id} bounds drift`);
    invariant(hashCells(exact, D06_CELL_PREAMBLE) === source.coordinateSetSha256,
      `D06 detailed ${id} hash drift`);
    layers.set(id, exact);
  };

  for (const system of payload.protectedEgressAndLiftSystems) {
    const prefix = system.coreId.toLowerCase().replace('-', '');
    const stair = cellsIn(system.protectedStairReservation.bounds);
    const lift = cellsIn(system.accessibleLiftReservation.bounds);
    const bottom = cellsIn({
      ...system.combinedProtectedCoreReservation.bounds,
      maxY: system.combinedProtectedCoreReservation.bounds.minY,
    });
    const transfer = union(
      bottom,
      cellsIn(system.roofTransitionCap.bounds),
      cellsIn(system.surfaceOutletCap.bounds),
    );
    const stairBounds = system.protectedStairReservation.bounds;
    const liftBounds = system.accessibleLiftReservation.bounds;
    const stairEquipmentCaps = union(
      cellsIn({ ...stairBounds, maxY: stairBounds.minY }),
      cellsIn({ ...stairBounds, minY: stairBounds.maxY }),
    );
    const liftEquipmentCaps = union(
      cellsIn({ ...liftBounds, maxY: liftBounds.minY }),
      cellsIn({ ...liftBounds, minY: liftBounds.maxY }),
    );
    add(`${prefix}TransferLandings`, transfer);
    add(`${prefix}LiftEquipmentCaps`, liftEquipmentCaps);
    add(`${prefix}StairEquipmentCaps`, stairEquipmentCaps);
    add(`${prefix}LiftEnvelope`, lift);
    add(`${prefix}StairEnvelope`, stair);
  }

  const ventDucts = [];
  const ventFans = [];
  const ventOutlets = [];
  for (const system of payload.ventSystems) {
    const riserBounds = system.exactRiserReservation.bounds;
    const riser = cellsIn(riserBounds);
    const fan = cellsIn({ ...riserBounds, maxY: riserBounds.minY });
    const outlet = cellsIn({ ...riserBounds, minY: riserBounds.maxY });
    ventFans.push(...fan);
    ventOutlets.push(...outlet);
    ventDucts.push(...difference(riser, union(fan, outlet)));
  }
  add('ventFanEquipmentBays', ventFans);
  add('ventOutletCaps', ventOutlets);
  add('ventDuctEnvelopes', ventDucts);

  const smokeDoorBays = payload.smokeAndBarrierSystems.smokeBoundaries.flatMap((boundary) => (
    [1670, 1720, 1770, 1820].flatMap((minX) => cellsIn({
      minX,
      maxX: minX + 2,
      minY: 49,
      maxY: 51,
      minZ: boundary.staticOpeningCaps.bounds.minZ,
      maxZ: boundary.staticOpeningCaps.bounds.maxZ,
    }))
  ));
  const platformGateBays = payload.smokeAndBarrierSystems.platformBarriers.flatMap((barrier) => (
    [1664, 1688, 1712, 1736].flatMap((minX) => cellsIn({
      minX,
      maxX: minX + 2,
      minY: 42,
      maxY: 43,
      minZ: barrier.staticGateBayCap.bounds.minZ,
      maxZ: barrier.staticGateBayCap.bounds.minZ,
    }))
  ));
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

  const circuit = (id, y) => {
    const trunk = cellsIn({ minX: 1750, maxX: 1750, minY: y, maxY: y, minZ: 54, maxZ: 153 });
    const branches = fixtureZ.flatMap((z) => cellsIn({
      minX: Math.min(...fixtureX),
      maxX: 1750,
      minY: y,
      maxY: y,
      minZ: z,
      maxZ: z,
    }));
    const equipment = cellsIn({
      minX: 1754, maxX: 1756, minY: y, maxY: y, minZ: 156, maxZ: 158,
    });
    const approach = union(
      cellsIn({ minX: 1750, maxX: 1750, minY: y, maxY: y, minZ: 154, maxZ: 157 }),
      cellsIn({ minX: 1751, maxX: 1753, minY: y, maxY: y, minZ: 157, maxZ: 157 }),
    );
    add(`${id}Carrier`, union(trunk, branches, approach));
    add(`${id}Equipment`, equipment);
  };
  circuit('normalCircuit', 44);
  circuit('emergencyCircuitA', 45);
  circuit('emergencyCircuitB', 47);

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
  add('unconnectedDrainHeaderReservation',
    cellsIn(payload.cappedDrainageSystem.retainedUnconnectedHeaderReservation.bounds));
  add('externalDrainBoundaryCap',
    cellsIn(payload.cappedDrainageSystem.retainedExternalBoundaryCap.bounds));

  const fire = payload.fireServiceSystem;
  add('fireServiceControlPanels', emptyEightSource.d06.platforms.map(({ trackCenterlineZ }) => ({
    x: 1846, y: 52, z: trackCenterlineZ,
  })));
  add('fireServiceInterfaceCap', cellsIn(fire.normallyClosedSpineInterfaceCap.bounds));
  add('fireSurfaceApproachCap', cellsIn(fire.sealedSurfaceApproachInterface.bounds));
  add('fireSurfaceCompoundReservation', cellsIn(fire.surfaceCompoundReservation.bounds));
  add('fireServiceSpineReservation', cellsIn(fire.internalSpineReservation.bounds));

  const sourcePriority = detailedSource.deterministicSetoutContract.priority;
  invariant(layers.size === sourcePriority.length
    && sourcePriority.every((id) => layers.has(id)),
  'D06 detailed layer reproduction does not cover source priority exactly');
  const rawMembershipCount = [...layers.values()].reduce((sum, cells) => sum + cells.length, 0);
  invariant(rawMembershipCount
    === detailedSource.exactDetailedProposalLayers.rawProposalMembershipCount,
  'D06 detailed raw membership count drift');
  const proposalUnion = union(...sourcePriority.map((id) => layers.get(id)));
  const unionSource = detailedSource.crossScopeAudit.d06DetailedProposalUnion;
  invariant(proposalUnion.length === unionSource.cellCount, 'D06 detailed union count drift');
  invariant(JSON.stringify(boundsOf(proposalUnion)) === JSON.stringify(unionSource.bounds),
    'D06 detailed union bounds drift');
  invariant(hashCells(proposalUnion, D06_CELL_PREAMBLE) === unionSource.coordinateSetSha256,
    'D06 detailed union hash drift');
  return proposalUnion;
}

function buildD06ReservationUnions(payload, lifeSafetySource, emptyEightSource, b07Built) {
  const references = payload.exactReservationReferenceContract.references;
  invariant(references.length === 73 && payload.exactReservationReferenceContract.allPassed,
    'D06 exact reservation-reference ledger drift');
  const sourceDocuments = new Map([
    [INPUTS.d06LifeSafety, lifeSafetySource],
    [INPUTS.emptyEight, emptyEightSource],
  ]);
  const referenceCells = (reference) => {
    const logical = reference.logicalPath;
    if (reference.cellCount === 0 && reference.bounds === null) return [];
    if (logical === 'b07WestTwo/excavationReservation') return b07Built.excavation;
    if (logical === 'b07WestTwo/interactionUnion') return b07Built.interaction;
    if (logical === 'smokeVentilationAndBarriers/localVentUnion') {
      return union(...payload.ventSystems.map(({ exactRiserReservation }) => (
        cellsIn(exactRiserReservation.bounds)
      )));
    }
    const platformMatch = logical.match(
      /platformBarriers\/(\d+)\/(retainedClosedBarrierReservation|staticGateBayCap)$/,
    );
    if (platformMatch) {
      const platform = payload.smokeAndBarrierSystems.platformBarriers[
        Number(platformMatch[1])
      ];
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
      const boundary = payload.smokeAndBarrierSystems.smokeBoundaries[Number(smokeMatch[1])];
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
      const z = payload.lightingAndPowerSystem.exactFixtureReservations[
        Number(fixtureMatch[1])
      ].reservation.bounds.minZ;
      return [1660, 1676, 1692, 1708, 1724, 1740, 1748]
        .map((x) => ({ x, y: 46, z }));
    }
    if (logical === 'cappedDrainage/capUnion') {
      return union(...payload.cappedDrainageSystem.localCaps.map(({ cap }) => (
        cellsIn(cap.bounds)
      )));
    }
    return cellsIn(reference.bounds);
  };
  const reproduced = references.map((reference) => {
    const document = sourceDocuments.get(reference.sourcePath);
    invariant(document, `unsupported D06 reference source ${reference.sourcePath}`);
    const sourceManifest = resolveJsonPointer(document, reference.jsonPointer);
    const cells = uniqueCells(referenceCells(reference));
    const expectedHash = sourceManifest.coordinateSetSha256 ?? sourceManifest.cellSetSha256;
    const actualHash = reference.sourcePath === INPUTS.emptyEight
      ? rawHashCells(cells)
      : hashCells(cells, D06_CELL_PREAMBLE);
    invariant(cells.length === reference.cellCount,
      `D06 reference ${reference.logicalPath} count drift`);
    invariant(JSON.stringify(boundsOf(cells)) === JSON.stringify(reference.bounds),
      `D06 reference ${reference.logicalPath} bounds drift`);
    invariant(actualHash === expectedHash && actualHash === reference.coordinateSetSha256,
      `D06 reference ${reference.logicalPath} hash drift`);
    return { reference, cells };
  });
  return {
    referenceCount: reproduced.length,
    construction: union(...reproduced
      .filter(({ reference }) => reference.logicalPath !== 'b07WestTwo/interactionUnion')
      .map(({ cells }) => cells)),
    interaction: union(...reproduced.map(({ cells }) => cells)),
  };
}

function g03Scope(report, scopeId) {
  return report.scopeRegistry.find((record) => record.scopeId === scopeId);
}

function exactDomain(
  scopeId,
  domain,
  cells,
  g03Manifest,
  closureManifest = null,
  closurePreamble = CELL_PREAMBLE,
) {
  const exact = uniqueCells(cells);
  invariant(g03Manifest?.cellCount === exact.length, `${scopeId}/${domain} G03 count drift`);
  const canonicalHash = hashCells(exact);
  const closureHash = hashCells(exact, closurePreamble);
  if (g03Manifest.coordinateSetSha256) {
    invariant(g03Manifest.coordinateSetSha256 === canonicalHash,
      `${scopeId}/${domain} G03 coordinate hash drift`);
  } else {
    invariant(g03Manifest.exactIntegerCellSetIdentitySha256 === closureHash
      && g03Manifest.sourceCoordinateSetSha256 === closureHash,
    `${scopeId}/${domain} G03 source-bound coordinate identity drift`);
  }
  invariant(JSON.stringify(g03Manifest.bounds) === JSON.stringify(boundsOf(exact)),
    `${scopeId}/${domain} G03 bounds drift`);
  if (closureManifest) {
    invariant(closureManifest.cellCount === exact.length
      && JSON.stringify(closureManifest.bounds) === JSON.stringify(boundsOf(exact))
      && closureManifest.coordinateSetSha256 === closureHash,
    `${scopeId}/${domain} standalone closure identity drift`);
  }
  return {
    scopeId,
    domain,
    domainId: `${scopeId}/${domain}`,
    cells: exact,
    bounds: boundsOf(exact),
    sourceCellCount: exact.length,
    sourceCoordinateSetSha256:
      g03Manifest.coordinateSetSha256 ?? g03Manifest.exactIntegerCellSetIdentitySha256,
    evaluatedCoordinateSetSha256: canonicalHash,
    standaloneClosureCoordinateSetSha256: closureManifest?.coordinateSetSha256 ?? null,
    accepted: false,
  };
}

function exactIntervalDomain(scopeId, domain, map, g03Manifest, closureManifest) {
  const stats = intervalMapStats(map, scopeId, domain);
  invariant(g03Manifest?.cellCount === stats.cellCount
    && JSON.stringify(g03Manifest.bounds) === JSON.stringify(stats.bounds)
    && g03Manifest.exactIntegerCellSetIdentitySha256 === stats.intervalManifestSha256,
  `${scopeId}/${domain} G03 interval identity drift`);
  invariant(closureManifest.cellCount === stats.cellCount
    && JSON.stringify(closureManifest.bounds) === JSON.stringify(stats.bounds)
    && closureManifest.sparseIntervals.intervalManifestSha256 === stats.intervalManifestSha256,
  `${scopeId}/${domain} standalone interval closure identity drift`);
  return {
    domainId: `${scopeId}/${domain}`,
    scopeId,
    domain,
    representation: 'SOURCE_BOUND_SPARSE_EXACT_INTEGER_Y_INTERVAL_SET',
    sourceCellCount: stats.cellCount,
    bounds: stats.bounds,
    sourceIntervalManifestSha256: stats.intervalManifestSha256,
    columnRecordCount: stats.columnRecordCount,
    intervalCount: stats.intervalCount,
    accepted: false,
    _intervalMap: map,
  };
}

function subjectRecord(subject, index, category) {
  return {
    subjectId: category === 'GENERATED_START'
      ? `GS-${String(index).padStart(3, '0')}`
      : `CORE-${subject.key}`,
    category,
    sourceIndex: category === 'GENERATED_START' ? index : null,
    structureId: subject.id ?? subject.structureId,
    relicKey: subject.key ?? null,
    startChunk: category === 'GENERATED_START'
      ? { x: subject.chunkX, z: subject.chunkZ }
      : subject.structureStartChunk,
    bounds: category === 'GENERATED_START' ? subject.bounds : subject.declaredInclusiveBounds,
  };
}

function auditExpandedDomain(domain, subjects) {
  const records = subjects.map((subject) => {
    const overlap = boundsIntersect(domain.bounds, subject.bounds)
      ? domain.cells.filter((cell) => inside(cell, subject.bounds))
      : [];
    return {
      ...subject,
      method: overlap.length > 0
        ? 'EXACT_EXPANDED_CELL_FILTER_AGAINST_INCLUSIVE_SUBJECT_BOUNDS'
        : boundsIntersect(domain.bounds, subject.bounds)
          ? 'EXACT_EXPANDED_CELL_FILTER_ZERO'
          : 'EXACT_BOUNDS_DISJOINT',
      result: overlap.length > 0 ? 'OVERLAP_DISCLOSED_HOLD' : 'EXACT_ZERO',
      intersection: intersectionIdentity(overlap),
      separatelyAuthorizedContract: null,
    };
  });
  return {
    domainId: domain.domainId,
    scopeId: domain.scopeId,
    domain: domain.domain,
    sourceCellCount: domain.sourceCellCount,
    sourceCoordinateSetSha256: domain.sourceCoordinateSetSha256,
    subjectCount: records.length,
    exactZeroSubjectCount: records.filter(({ intersection }) => intersection.cellCount === 0).length,
    overlapSubjectCount: records.filter(({ intersection }) => intersection.cellCount > 0).length,
    overlapCellCount: records.reduce((sum, { intersection }) => sum + intersection.cellCount, 0),
    records,
  };
}

async function cellsFromIntervalRule(bounds, formula, reader, mode, exclusionSet) {
  const domainBounds = {
    minX: formula.center.x - formula.extents.west,
    maxX: formula.center.x + formula.extents.east,
    minY: mode === 'construction' ? 72 : WORLD_MIN_Y,
    maxY: mode === 'construction' ? formula.peakSurfaceY : 71,
    minZ: formula.center.z - formula.extents.north,
    maxZ: formula.center.z + formula.extents.south,
  };
  if (!boundsIntersect(bounds, domainBounds)) return [];
  const result = [];
  const minX = Math.max(bounds.minX, domainBounds.minX);
  const maxX = Math.min(bounds.maxX, domainBounds.maxX);
  const minZ = Math.max(bounds.minZ, domainBounds.minZ);
  const maxZ = Math.min(bounds.maxZ, domainBounds.maxZ);
  for (let x = minX; x <= maxX; x += 1) {
    for (let z = minZ; z <= maxZ; z += 1) {
      const designY = mountainSurface(x, z, formula);
      const surfaceY = await reader.surfaceY(x, z);
      const start = mode === 'construction' ? Math.max(surfaceY + 1, 72) : surfaceY + 1;
      const end = mode === 'construction' ? designY : Math.min(designY, 71);
      const minY = Math.max(start, bounds.minY);
      const maxY = Math.min(end, bounds.maxY);
      for (let y = minY; y <= maxY; y += 1) {
        const cell = { x, y, z };
        if (mode === 'construction' && exclusionSet.has(cellKey(cell))) continue;
        result.push(cell);
      }
    }
  }
  return uniqueCells(result);
}

async function auditIntervalDomain(identity, subjects, formula, reader, mode, exclusionSet) {
  const records = [];
  for (const subject of subjects) {
    const overlap = await cellsFromIntervalRule(subject.bounds, formula, reader, mode, exclusionSet);
    records.push({
      ...subject,
      method: overlap.length > 0
        ? 'EXACT_SOURCE_BOUND_INTERVAL_MEMBERSHIP_INTERSECTION'
        : 'EXACT_SOURCE_BOUND_INTERVAL_MEMBERSHIP_ZERO',
      result: overlap.length > 0 ? 'OVERLAP_DISCLOSED_HOLD' : 'EXACT_ZERO',
      intersection: intersectionIdentity(overlap),
      separatelyAuthorizedContract: null,
    });
  }
  return {
    ...identity,
    subjectCount: records.length,
    exactZeroSubjectCount: records.filter(({ intersection }) => intersection.cellCount === 0).length,
    overlapSubjectCount: records.filter(({ intersection }) => intersection.cellCount > 0).length,
    overlapCellCount: records.reduce((sum, { intersection }) => sum + intersection.cellCount, 0),
    records,
  };
}

function auditIntervalMapDomain(identity, subjects) {
  const records = subjects.map((subject) => {
    const overlap = boundsIntersect(identity.bounds, subject.bounds)
      ? cellsFromIntervalMap(subject.bounds, identity._intervalMap)
      : [];
    return {
      ...subject,
      method: overlap.length > 0
        ? 'EXACT_RECONSTRUCTED_INTERVAL_MAP_INTERSECTION'
        : boundsIntersect(identity.bounds, subject.bounds)
          ? 'EXACT_RECONSTRUCTED_INTERVAL_MAP_ZERO'
          : 'EXACT_BOUNDS_DISJOINT',
      result: overlap.length > 0 ? 'OVERLAP_DISCLOSED_HOLD' : 'EXACT_ZERO',
      intersection: intersectionIdentity(overlap),
      separatelyAuthorizedContract: null,
    };
  });
  const { _intervalMap, ...publicIdentity } = identity;
  return {
    ...publicIdentity,
    subjectCount: records.length,
    exactZeroSubjectCount: records.filter(({ intersection }) => intersection.cellCount === 0).length,
    overlapSubjectCount: records.filter(({ intersection }) => intersection.cellCount > 0).length,
    overlapCellCount: records.reduce((sum, { intersection }) => sum + intersection.cellCount, 0),
    records,
  };
}

const sourceBindings = Object.fromEntries(Object.entries(INPUTS).map(([key, filename]) => [
  key,
  fileBinding(filename, ROLES[key]),
]));
const g03 = readJson(INPUTS.g03);
const ownership = readJson(INPUTS.ownership);
const releaseContract = readJson(INPUTS.releaseContract);
const phase0 = readJson(INPUTS.phase0);
const relicReport = readJson(INPUTS.relics);
const completeSave = readJson(INPUTS.completeSave);
const b03 = readJson(INPUTS.b03);
const connectors = readJson(INPUTS.connectors);
const d05Alternatives = readJson(INPUTS.d05Alternatives);
const d05FutureState = readJson(INPUTS.d05FutureState);
const d05Defaults = readJson(INPUTS.d05Defaults);
const d02Technical = readJson(INPUTS.d02Technical);
const d02C01 = readJson(INPUTS.d02C01);
const d06LifeSafety = readJson(INPUTS.d06LifeSafety);
const d06Mechanisms = readJson(INPUTS.d06Mechanisms);
const d06Detailed = readJson(INPUTS.d06Detailed);
const emptyEight = readJson(INPUTS.emptyEight);
const b11 = readJson(INPUTS.b11);
const b11SurfaceRoad = readJson(INPUTS.b11SurfaceRoad);
const b12 = readJson(INPUTS.b12);
const residualSurfaceClosure = readJson(INPUTS.residualSurfaceClosure);
const civilLifeSafetyClosure = readJson(INPUTS.civilLifeSafetyClosure);

const g06Rule = releaseContract.gateDefinitions.find(({ id }) => id === 'G06_PROTECTED_FEATURES');
invariant(g06Rule?.pass
  === 'Exact protected cell/buffer sets are frozen and have zero overlap with all release interaction cells unless an exact separately authorized contract exists.',
'G06 pass rule drift');
invariant(g03.schemaVersion === 3
  && g03.status
    === 'PASS_G03_V3_ALL_30_PROPOSAL_DOMAINS_EXACT_DOWNSTREAM_AND_PHYSICAL_AUTHORITY_HOLD'
  && g03.gate?.result === 'PASS'
  && g03.gate?.g03Passed === true, 'G03 input unexpectedly failed or changed identity');
invariant(g03.gate?.unresolvedRequiredDomainCount === 0
  && g03.gate?.exactRequiredDomainCount === 30,
'G03 v3 convergence contract requires all 30 domains exact and zero unresolved domains');
invariant(residualSurfaceClosure.status
  === 'PASS_SEVEN_EXACT_PROPOSAL_DOMAINS_COMPILED_ALL_TECHNICAL_ACCEPTANCE_AND_RELEASE_GATES_HOLD'
  && residualSurfaceClosure.proposalPayloadSha256
    === g03.v3IntegrationDelta.boundSourceIdentities
      .residualSurfaceConnectorProposalPayloadSha256,
'residual surface/connector closure identity drift');
invariant(civilLifeSafetyClosure.status
  === 'PASS_EIGHT_SOURCE_LIMITED_PROPOSAL_DOMAINS_EXACT_ALL_FUNCTIONAL_AND_RELEASE_GATES_HOLD'
  && civilLifeSafetyClosure.canonicalPayloadSha256
    === g03.v3IntegrationDelta.boundSourceIdentities.civilLifeSafetyCanonicalPayloadSha256,
'civil/life-safety closure identity drift');
invariant(d02C01.proposalPayloadSha256
  === g03.v3IntegrationDelta.boundSourceIdentities.d02C01ProposalPayloadSha256,
'D02/C01 proposal identity drift');
invariant(ownership.disposition?.allKnownProposalCellsHaveOneProposedOwner === true
  && ownership.disposition?.finalOwnerAcceptanceRecorded === false
  && ownership.disposition?.allInterfacesExact === false,
'proposed ownership/interface authority boundary drift');
invariant(phase0.generatedStructureStarts?.length === 114, 'Phase 0 generated-start count drift');
invariant(relicReport.relics?.length === 3
  && relicReport.relics.every(({ positiveMarginBuffer }) => positiveMarginBuffer.status === 'HOLD_NOT_FROZEN'),
'protected-core or positive-margin boundary drift');
invariant(completeSave.status === 'HOLD_INCOMPLETE_OR_UNBOUND_SAVE',
'complete-save gate unexpectedly changed');
invariant(d06Mechanisms.summary?.acceptedMechanismManifestCount === 0,
'D06 unexpectedly has an accepted mechanism manifest');
invariant(d06Detailed.reportIdentitySha256
  === '55eaab99b53aac1de53e81128026ff509de7a6efb9614b7e390c4f9cbe37c12f'
  && d06Detailed.safetyBoundary?.acceptedConstructionCellCount === 0,
'D06 detailed proposal identity or authority boundary drift');
invariant(b11SurfaceRoad.status
  === 'EXACT_SURFACE_ROAD_SET_OUT_PROPOSAL_READY_ALL_TECHNICAL_AND_PHYSICAL_GATES_HOLD'
  && b11SurfaceRoad.authorityBoundary?.acceptedProfileAmended === false,
'B11 surface-road proposal identity or authority boundary drift');

const snapshotExpected = d05FutureState.sourceBindings.immutablePhase0PostRegionSnapshot;
const immutableSnapshot = snapshotIdentity(absolute(snapshotExpected.path));
invariant(immutableSnapshot.sha256 === snapshotExpected.sha256
  && immutableSnapshot.sha256 === phase0.snapshots.postGeneration.sha256
  && immutableSnapshot.regionFileCount === snapshotExpected.regionFileCount
  && immutableSnapshot.bytes === snapshotExpected.bytes,
'immutable snapshot identity drift');

const b07Source = d06LifeSafety.b07PublicShaftTransfer.candidates
  .find(({ id }) => id === 'B07-C-WEST-2');
invariant(b07Source && d06LifeSafety.b07PublicShaftTransfer.recommendedCandidateId === b07Source.id,
'B07 selection drift');
const b07 = buildB07(b07Source);
const b08 = buildB08(connectors);
const selectedD05 = d05Alternatives.alternatives
  .find(({ modelId }) => modelId === d05FutureState.selectedPlanningIdentity.modelId);
invariant(selectedD05?.modelId === 'FM-01-COMPACT-EAST-FACE', 'D05 selection drift');
const b09 = buildB09(selectedD05.formula, connectors.funicularFaceComparison.designEndpoints);
const d06DetailedInteraction = buildD06DetailedSetout(
  d06Mechanisms.mechanismDevelopmentPayload,
  emptyEight,
  d06Detailed,
);
const b11Built = buildB11SurfaceRoad(b11, b11SurfaceRoad);
const b12Built = buildB12(b12);
const residualSets = residualSurfaceClosure.proposalPayload.proposalSets;
const civilSets = civilLifeSafetyClosure.proposalDomains;

const b03Base = union(
  b03.design.excavationReservation.cells,
  b03.design.oneCellFaceInteractionShell.cells,
);
const b03Carriers = bottomAndTopCarriers(b03.design.excavationReservation.cells);
const b03Influence = union(
  b03Base,
  difference(dilate(b03Base, 1), b03Base),
  b03Carriers.bottom,
  b03Carriers.top,
);
const b08Carriers = bottomAndTopCarriers(b08.excavation);
const b08Influence = union(
  b08.interaction,
  difference(dilate(b08.interaction, 1), b08.interaction),
  b08Carriers.bottom,
  b08Carriers.top,
);
const b09Influence = dilate(b09, 1);
const b12Influence = dilate(b12Built.interaction, 1);

const d02Construction = uniqueCells(
  d02Technical.technicalDevelopmentPayload.selectedBasis.exactAggregateCandidateCellManifest.cells,
);
const d02Inlets = uniqueCells(d02Technical.technicalDevelopmentPayload.exactAssetDesigns
  .flatMap(({ collectionInlet }) => collectionInlet.cellManifest.cells));
const d02LoadingInterface = d02C01.proposalPayload.directionalSealedInterfaces
  .exactFaceAdjacentContracts.find(({ contractId }) => (
    contractId === 'IF-C1-LOADING-SEPARATION-TO-D02-CAPPED-SUMP-CAPS'
  ));
invariant(d02LoadingInterface?.transitionPairCount === 9
  && d02LoadingInterface.interfaceCellSet.cellCount === 18,
'D02/C01 loading interface drift');
const d02Interaction = union(
  d02Construction,
  d02Inlets,
  cellsIn(d02LoadingInterface.interfaceCellSet.bounds),
);
const d02Influence = union(
  d02Interaction,
  d02Technical.technicalDevelopmentPayload.roadLow001NoBuildHold
    .exactPreservationCellManifest.cells,
);
const d06ReservationUnions = buildD06ReservationUnions(
  d06Mechanisms.mechanismDevelopmentPayload,
  d06LifeSafety,
  emptyEight,
  b07,
);
invariant(d06ReservationUnions.referenceCount === 73,
  'D06 reservation reconstruction did not cover all references');

const domains = [
  exactDomain('P1-B03', 'construction', b03.design.excavationReservation.cells,
    g03Scope(g03, 'P1-B03').construction),
  exactDomain('P1-B03', 'interaction', b03.design.oneCellFaceInteractionShell.cells,
    g03Scope(g03, 'P1-B03').interaction),
  exactDomain('P1-B03', 'influence', b03Influence,
    g03Scope(g03, 'P1-B03').influence, residualSets['P1-B03'].influence),
  exactDomain('P1-B07', 'construction', b07.excavation,
    g03Scope(g03, 'P1-B07').construction),
  exactDomain('P1-B07', 'interaction', b07.interaction,
    g03Scope(g03, 'P1-B07').interaction),
  exactDomain('P1-B07', 'influence', b07.interaction,
    g03Scope(g03, 'P1-B07').influence, civilSets['P1-B07'].influence,
    CIVIL_CLOSURE_CELL_PREAMBLE),
  exactDomain('P1-B08', 'construction', b08.excavation,
    g03Scope(g03, 'P1-B08').construction),
  exactDomain('P1-B08', 'interaction', b08.interaction,
    g03Scope(g03, 'P1-B08').interaction),
  exactDomain('P1-B08', 'influence', b08Influence,
    g03Scope(g03, 'P1-B08').influence, residualSets['P1-B08'].influence),
  exactDomain('P1-B09', 'construction', b09,
    g03Scope(g03, 'P1-B09').construction, residualSets['P1-B09'].construction),
  exactDomain('P1-B09', 'interaction', b09,
    g03Scope(g03, 'P1-B09').interaction),
  exactDomain('P1-B09', 'influence', b09Influence,
    g03Scope(g03, 'P1-B09').influence, residualSets['P1-B09'].influence),
  exactDomain('D02', 'construction', d02Construction,
    g03Scope(g03, 'D02').construction),
  exactDomain('D02', 'interaction', d02Interaction,
    g03Scope(g03, 'D02').interaction, civilSets.D02.interaction,
    CIVIL_CLOSURE_CELL_PREAMBLE),
  exactDomain('D02', 'influence', d02Influence,
    g03Scope(g03, 'D02').influence, civilSets.D02.influence,
    CIVIL_CLOSURE_CELL_PREAMBLE),
  exactDomain('D06-RESERVATIONS', 'construction', d06ReservationUnions.construction,
    g03Scope(g03, 'D06-RESERVATIONS').construction,
    civilSets['D06-RESERVATIONS'].construction, CIVIL_CLOSURE_CELL_PREAMBLE),
  exactDomain('D06-RESERVATIONS', 'interaction', d06ReservationUnions.interaction,
    g03Scope(g03, 'D06-RESERVATIONS').interaction,
    civilSets['D06-RESERVATIONS'].interaction, CIVIL_CLOSURE_CELL_PREAMBLE),
  exactDomain('D06-RESERVATIONS', 'influence', d06ReservationUnions.interaction,
    g03Scope(g03, 'D06-RESERVATIONS').influence,
    civilSets['D06-RESERVATIONS'].influence, CIVIL_CLOSURE_CELL_PREAMBLE),
  exactDomain('D06-MECHANISMS', 'construction', d06DetailedInteraction,
    g03Scope(g03, 'D06-MECHANISMS').construction,
    civilSets['D06-MECHANISMS'].construction, CIVIL_CLOSURE_CELL_PREAMBLE),
  exactDomain('D06-MECHANISMS', 'interaction', d06DetailedInteraction,
    g03Scope(g03, 'D06-MECHANISMS').interaction),
  exactDomain('D06-MECHANISMS', 'influence', d06DetailedInteraction,
    g03Scope(g03, 'D06-MECHANISMS').influence,
    civilSets['D06-MECHANISMS'].influence, CIVIL_CLOSURE_CELL_PREAMBLE),
  exactDomain('P1-B11', 'construction', b11Built.construction,
    g03Scope(g03, 'P1-B11').construction),
  exactDomain('P1-B11', 'interaction', b11Built.interaction,
    g03Scope(g03, 'P1-B11').interaction),
  exactDomain('P1-B11', 'influence', b11Built.influence,
    g03Scope(g03, 'P1-B11').influence),
  exactDomain('P1-B12', 'construction', b12Built.material,
    g03Scope(g03, 'P1-B12').construction),
  exactDomain('P1-B12', 'interaction', b12Built.interaction,
    g03Scope(g03, 'P1-B12').interaction),
  exactDomain('P1-B12', 'influence', b12Influence,
    g03Scope(g03, 'P1-B12').influence, residualSets['P1-B12'].influence),
];

const generatedSubjects = phase0.generatedStructureStarts.map((subject, index) => (
  subjectRecord(subject, index, 'GENERATED_START')
));
const protectedSubjects = relicReport.relics.map((subject, index) => (
  subjectRecord(subject, index, 'PROTECTED_CORE')
));

const expandedGeneratedStartAudits = domains.map((domain) => (
  auditExpandedDomain(domain, generatedSubjects)
));
const expandedProtectedCoreAudits = domains.map((domain) => (
  auditExpandedDomain(domain, protectedSubjects)
));

const relicExclusions = [];
for (const relic of d05Defaults.soleAuthorityRecommendations.bufferPolicy.relics) {
  const core = cellsIn(relic.protectedCore.bounds);
  const expanded = cellsIn(relic.minimumPlanningExclusionShell.expandedBounds);
  relicExclusions.push(...core, ...difference(expanded, core));
}
const exactRelicExclusions = uniqueCells(relicExclusions);
invariant(exactRelicExclusions.length
  === d05FutureState.hydrologyAndRelicBoundary.protectedRelicMinimumPlanningExclusion.cellCount,
'D05 relic exclusion count drift');
invariant(hashCells(exactRelicExclusions)
  === d05FutureState.hydrologyAndRelicBoundary.protectedRelicMinimumPlanningExclusion
    .coordinateSetSha256,
'D05 relic exclusion hash drift');
const b10ExclusionSet = new Set(union(exactRelicExclusions, b08.interaction, b09).map(cellKey));
const reader = new SnapshotReader(absolute(immutableSnapshot.path));
const b10G03 = g03Scope(g03, 'P1-B10').construction;
invariant(b10G03.cellCount === d05FutureState.selectedPlanningIdentity
  .boundCandidateAddedSolidIntervals.candidateAddedSolidCellCount
  && b10G03.exactIntegerCellSetIdentitySha256 === d05FutureState.selectedPlanningIdentity
    .boundCandidateAddedSolidIntervals.intervalManifestSha256,
'B10 G03/source-bound sparse identity drift');

const exclusionsByColumn = new Map();
for (const key of b10ExclusionSet) {
  const [x, y, z] = key.split(',').map(Number);
  const column = columnKey(x, z);
  if (!exclusionsByColumn.has(column)) exclusionsByColumn.set(column, []);
  exclusionsByColumn.get(column).push(y);
}
const constructionMap = new Map();
const supportGapMap = new Map();
const constructionDigest = crypto.createHash('sha256')
  .update('combined-zones-d05-sparse-solid-intervals-v1\n');
const supportDigest = crypto.createHash('sha256')
  .update('combined-zones-d05-support-gap-intervals-v1\n');
let constructionCellCount = 0;
let supportGapCellCount = 0;
for (let x = selectedD05.formula.center.x - selectedD05.formula.extents.west;
  x <= selectedD05.formula.center.x + selectedD05.formula.extents.east; x += 1) {
  for (let z = selectedD05.formula.center.z - selectedD05.formula.extents.north;
    z <= selectedD05.formula.center.z + selectedD05.formula.extents.south; z += 1) {
    const currentY = await reader.surfaceY(x, z);
    const designY = mountainSurface(x, z, selectedD05.formula);
    const supportStart = currentY + 1;
    const supportEnd = Math.min(designY, 71);
    if (supportStart <= supportEnd) {
      const ranges = [{ start: supportStart, end: supportEnd }];
      addRanges(supportGapMap, x, z, ranges);
      supportGapCellCount += rangesCount(ranges);
      supportDigest.update(`${x},${z}\t${supportStart}..${supportEnd}\n`);
    }
    const constructionRanges = subtractRanges(
      [{ start: Math.max(currentY + 1, 72), end: designY }],
      (exclusionsByColumn.get(columnKey(x, z)) ?? []).map((y) => ({ start: y, end: y })),
    );
    addRanges(constructionMap, x, z, constructionRanges);
    constructionCellCount += rangesCount(constructionRanges);
    constructionDigest.update(
      `${x},${z}\tcurrent=${currentY}\tdesign=${designY}\tadd=${constructionRanges.length
        ? constructionRanges.map(({ start, end }) => `${start}..${end}`).join(',')
        : '-'}\n`,
    );
  }
}
invariant(constructionCellCount === b10G03.cellCount
  && constructionDigest.digest('hex') === b10G03.exactIntegerCellSetIdentitySha256,
'B10 construction interval stream did not independently reproduce');
const b10InteractionMap = faceShell(constructionMap);
const b10InfluenceMap = unionIntervalMaps(b10InteractionMap, supportGapMap);

const b10Identity = {
  domainId: 'P1-B10/construction',
  scopeId: 'P1-B10',
  domain: 'construction',
  representation: 'SOURCE_BOUND_SPARSE_EXACT_INTEGER_Y_INTERVAL_SET',
  sourceCellCount: b10G03.cellCount,
  bounds: b10G03.bounds,
  sourceIntervalManifestSha256: b10G03.exactIntegerCellSetIdentitySha256,
  accepted: false,
  _intervalMap: constructionMap,
};
const b10InteractionIdentity = exactIntervalDomain(
  'P1-B10',
  'interaction',
  b10InteractionMap,
  g03Scope(g03, 'P1-B10').interaction,
  residualSets['P1-B10'].interaction,
);
const b10InfluenceIdentity = exactIntervalDomain(
  'P1-B10',
  'influence',
  b10InfluenceMap,
  g03Scope(g03, 'P1-B10').influence,
  residualSets['P1-B10'].influence,
);
const b10IntervalDomains = [b10Identity, b10InteractionIdentity, b10InfluenceIdentity];
const b10GeneratedStartAudits = b10IntervalDomains.map((identity) => (
  auditIntervalMapDomain(identity, generatedSubjects)
));
const b10ProtectedCoreAudits = b10IntervalDomains.map((identity) => (
  auditIntervalMapDomain(identity, protectedSubjects)
));

const supportSource = d05FutureState.supportGapStatusLedger;
invariant(supportSource.cellCount === 754224
  && supportSource.coordinateSetSha256 === 'f007560fafa7eceed438c4ade36981fe16461c7dad35b55f4f29bf729e86bde6'
  && supportSource.boundIntervalManifestSha256
    === '31664bc00e7a1d361567fb878e8653c2a4018045169d54900ca9ad15bddd7171',
'D05 support-gap identity drift');
invariant(supportGapCellCount === supportSource.cellCount
  && supportDigest.digest('hex') === supportSource.boundIntervalManifestSha256,
'D05 support-gap intervals did not independently reproduce');
const supportIdentity = {
  domainId: 'P1-B10/support-gap-status-evidence',
  scopeId: 'P1-B10',
  domain: 'support-gap-status-evidence',
  representation: 'SOURCE_BOUND_EXACT_INTEGER_INTERVAL_EVIDENCE_NOT_G03_DOMAIN',
  sourceCellCount: supportSource.cellCount,
  sourceCoordinateSetSha256: supportSource.coordinateSetSha256,
  sourceIntervalManifestSha256: supportSource.boundIntervalManifestSha256,
  treatmentAccepted: false,
  canonicalFutureState: null,
};
const supportMapIdentity = {
  ...supportIdentity,
  bounds: intervalMapStats(
    supportGapMap,
    'P1-B10',
    'support-gap-status-evidence',
  ).bounds,
  _intervalMap: supportGapMap,
};
const supportGeneratedStartAudit = auditIntervalMapDomain(supportMapIdentity, generatedSubjects);
const supportProtectedCoreAudit = auditIntervalMapDomain(supportMapIdentity, protectedSubjects);

const generatedStartAudits = [...expandedGeneratedStartAudits, ...b10GeneratedStartAudits];
const protectedCoreAudits = [...expandedProtectedCoreAudits, ...b10ProtectedCoreAudits];
const g03NonNullDomainIds = g03.scopeRegistry.flatMap((scope) => (
  ['construction', 'interaction', 'influence']
    .filter((domain) => scope[domain]?.cellCount != null)
    .map((domain) => `${scope.scopeId}/${domain}`)
));
invariant(g03NonNullDomainIds.length === 30,
  'G03 v3 must expose exactly 30 non-null required domains');
const auditedDomainIds = generatedStartAudits.map(({ domainId }) => domainId);
invariant(
  JSON.stringify([...g03NonNullDomainIds].sort()) === JSON.stringify([...auditedDomainIds].sort())
    && JSON.stringify([...auditedDomainIds].sort())
      === JSON.stringify(protectedCoreAudits.map(({ domainId }) => domainId).sort()),
  'G06 evaluated-domain registry does not exactly equal every non-null G03 domain',
);
const nullDomains = g03.gate.unresolvedRequiredDomains.map((record) => ({
  ...record,
  clearanceStatus: 'UNKNOWN_NOT_AUDITABLE_NULL_DOMAIN',
  exactZeroClaimed: false,
  reason: `${record.reason} Protected-feature clearance cannot be inferred for a null set.`,
}));
invariant(nullDomains.length === 0, 'G03 v3 null/unknown domain ledger must be empty');
const marginHolds = relicReport.relics.map((relic) => ({
  relicKey: relic.key,
  frozenCoreCellCount: relic.evidenceBackedDefaultDenyCore.cellCount,
  frozenCoreCoordinateSetSha256: relic.evidenceBackedDefaultDenyCore.coordinateSetSha256,
  positiveMarginBlocks: null,
  status: relic.positiveMarginBuffer.status,
  reason: relic.positiveMarginBuffer.reason,
  clearanceOutsideFrozenCore: 'UNKNOWN_NOT_AUDITABLE',
}));

const exactGeneratedOverlapRecords = generatedStartAudits.flatMap((audit) => (
  audit.records.filter(({ intersection }) => intersection.cellCount > 0)
    .map((record) => ({ domainId: audit.domainId, ...record }))
));
const exactCoreOverlapRecords = protectedCoreAudits.flatMap((audit) => (
  audit.records.filter(({ intersection }) => intersection.cellCount > 0)
    .map((record) => ({ domainId: audit.domainId, ...record }))
));
const supportGeneratedOverlaps = supportGeneratedStartAudit.records
  .filter(({ intersection }) => intersection.cellCount > 0);
const supportCoreOverlaps = supportProtectedCoreAudit.records
  .filter(({ intersection }) => intersection.cellCount > 0);
const exactGeneratedOverlapCellCount = exactGeneratedOverlapRecords.reduce(
  (sum, record) => sum + record.intersection.cellCount,
  0,
);
const exactCoreOverlapCellCount = exactCoreOverlapRecords.reduce(
  (sum, record) => sum + record.intersection.cellCount,
  0,
);
const supportGeneratedOverlapCellCount = supportGeneratedOverlaps.reduce(
  (sum, record) => sum + record.intersection.cellCount,
  0,
);
const supportCoreOverlapCellCount = supportCoreOverlaps.reduce(
  (sum, record) => sum + record.intersection.cellCount,
  0,
);

const newlyAuditedDomainIds = g03.v3IntegrationDelta.closedProposalGeometryDomains
  .map(({ scopeId, domain }) => `${scopeId}/${domain}`);
invariant(newlyAuditedDomainIds.length === 15,
  'G03 v3 must identify exactly 15 newly closed proposal domains');
invariant(newlyAuditedDomainIds.every((domainId) => (
  generatedStartAudits.some((audit) => audit.domainId === domainId)
  && protectedCoreAudits.some((audit) => audit.domainId === domainId)
)), 'G03 v3 newly closed domain is missing from G06 evaluation');
const convergenceDelta = {
  baseline: {
    g03CanonicalPayloadSha256: PRIOR_G03_PAYLOAD_SHA256,
    g06AuditPayloadSha256: PRIOR_G06_PAYLOAD_SHA256,
    exactNonNullG03DomainCount: 15,
    nullUnknownDomainCount: 15,
    generatedStartDomainEvaluationCount: 1710,
    protectedCoreDomainEvaluationCount: 45,
    exactG03GeneratedStartOverlapRecordCount: 0,
    exactG03ProtectedCoreOverlapRecordCount: 0,
    exactG03GeneratedStartOverlapCellCount: 0,
    exactG03ProtectedCoreOverlapCellCount: 0,
    supportEvidenceGeneratedStartOverlapRecordCount: 1,
    supportEvidenceProtectedCoreOverlapRecordCount: 1,
    supportEvidenceGeneratedStartOverlapCellCount: 126,
    supportEvidenceProtectedCoreOverlapCellCount: 126,
  },
  current: {
    g03CanonicalPayloadSha256: g03.canonicalPayloadSha256,
    exactNonNullG03DomainCount: generatedStartAudits.length,
    nullUnknownDomainCount: nullDomains.length,
    generatedStartDomainEvaluationCount: generatedStartAudits.length * generatedSubjects.length,
    protectedCoreDomainEvaluationCount: protectedCoreAudits.length * protectedSubjects.length,
    exactG03GeneratedStartOverlapRecordCount: exactGeneratedOverlapRecords.length,
    exactG03ProtectedCoreOverlapRecordCount: exactCoreOverlapRecords.length,
    exactG03GeneratedStartOverlapCellCount: exactGeneratedOverlapCellCount,
    exactG03ProtectedCoreOverlapCellCount: exactCoreOverlapCellCount,
    supportEvidenceGeneratedStartOverlapRecordCount: supportGeneratedOverlaps.length,
    supportEvidenceProtectedCoreOverlapRecordCount: supportCoreOverlaps.length,
    supportEvidenceGeneratedStartOverlapCellCount: supportGeneratedOverlapCellCount,
    supportEvidenceProtectedCoreOverlapCellCount: supportCoreOverlapCellCount,
  },
  change: {
    exactNonNullG03DomainCount: generatedStartAudits.length - 15,
    nullUnknownDomainCount: nullDomains.length - 15,
    generatedStartDomainEvaluationCount:
      generatedStartAudits.length * generatedSubjects.length - 1710,
    protectedCoreDomainEvaluationCount:
      protectedCoreAudits.length * protectedSubjects.length - 45,
    exactG03GeneratedStartOverlapRecordCount: exactGeneratedOverlapRecords.length,
    exactG03ProtectedCoreOverlapRecordCount: exactCoreOverlapRecords.length,
    exactG03GeneratedStartOverlapCellCount: exactGeneratedOverlapCellCount,
    exactG03ProtectedCoreOverlapCellCount: exactCoreOverlapCellCount,
    supportEvidenceGeneratedStartOverlapRecordCount: supportGeneratedOverlaps.length - 1,
    supportEvidenceProtectedCoreOverlapRecordCount: supportCoreOverlaps.length - 1,
    supportEvidenceGeneratedStartOverlapCellCount: supportGeneratedOverlapCellCount - 126,
    supportEvidenceProtectedCoreOverlapCellCount: supportCoreOverlapCellCount - 126,
  },
  newlyAuditedDomainIds,
  interpretation:
    'All fifteen formerly null G03 v2 domains are now exact proposed sets and receive full G06 evaluation. This is geometric convergence only; no proposal, owner, interface, material, expert influence policy, or release is accepted.',
};

const ownershipContext = {
  status: ownership.status,
  proposedOwnerRecordCount: ownership.proposedOwnerRegistry.proposedOwnerRecordCount,
  acceptedOwnerRecordCount: ownership.proposedOwnerRegistry.acceptedOwnerRecordCount,
  proposedInterfaceContractCount: ownership.proposedDirectionalInterfaceRegistry.contractCount,
  acceptedInterfaceContractCount: ownership.proposedDirectionalInterfaceRegistry.acceptedContractCount,
  allInterfacesExact: ownership.disposition.allInterfacesExact,
  ownerRegistryManifestSha256: ownership.registryContract.ownerRegistryManifestSha256,
  interfaceRegistryManifestSha256: ownership.registryContract.interfaceRegistryManifestSha256,
  separatelyAuthorizedProtectedFeatureContractCount: 0,
  interpretation: 'Proposed ownership cannot authorize a protected-feature overlap; accepted owner and interface counts remain zero.',
};

const eliminatedUncertainty = [
  `All ${generatedStartAudits.length} non-null G03 construction/interaction/influence domains are independently reconstructed and evaluated against all ${generatedSubjects.length} Phase 0 generated starts.`,
  `All ${protectedCoreAudits.length} non-null G03 construction/interaction/influence domains are evaluated against all ${protectedSubjects.length} frozen zero-margin protected cores.`,
  'The seven residual surface/connector and eight civil/life-safety closures are hash-bound and independently reconstructed; their authority and technical acceptance remain zero.',
  'Each evaluated domain/subject pair has an exact intersection count, inclusive bounds, and canonical coordinate SHA-256; exact zero is reported only after deterministic bounds or cell/interval evaluation.',
  'The D05 support-gap status stream is audited separately as exact unresolved evidence and is not reclassified as construction, interaction, influence, or an accepted treatment.',
  'All 30 required G03 geometry domains are exact; the null/unknown domain ledger is empty.',
];
const remainingBlockers = [
  'No accepted expert structural, hydrology, groundwater, access, staging, equipment-sweep, settlement, erosion, or construction-method positive-margin kernels are frozen.',
  'All three relic positive-margin buffers remain unfrozen; the audited cores are exact zero-margin minimum default-deny bounds only.',
  `The complete-save intake remains ${completeSave.status}; region-only evidence cannot establish entity, POI, level.dat, or all-start clearance.`,
  `The exact 126-cell D05 support-gap overlap with the shipwreck generated start and frozen core remains disclosed and has no separately accepted treatment/clearance contract.`,
  'Accepted owner and protected-feature interface contract counts remain zero.',
  'Before R00, commissioning designs, methods, pass criteria, failure stimuli, and evidence-capture contracts must be accepted; actual commissioning results are post-build G17/G19 evidence and are not a pre-R00 or G02 prerequisite.',
  'Final G06 acceptance must bind reviewed margin policy or explicit zero-margin acceptance and the complete accepted release interaction union.',
];

const gate = {
  id: 'G06_PROTECTED_FEATURES',
  controllingPassRule: g06Rule.pass,
  result: 'HOLD',
  g06Passed: false,
  exactNonNullG03DomainCount: generatedStartAudits.length,
  nullUnknownDomainCount: nullDomains.length,
  generatedStartCount: generatedSubjects.length,
  protectedCoreCount: protectedSubjects.length,
  generatedStartDomainEvaluationCount: generatedStartAudits.length * generatedSubjects.length,
  protectedCoreDomainEvaluationCount: protectedCoreAudits.length * protectedSubjects.length,
  exactG03GeneratedStartOverlapRecordCount: exactGeneratedOverlapRecords.length,
  exactG03ProtectedCoreOverlapRecordCount: exactCoreOverlapRecords.length,
  exactG03GeneratedStartOverlapCellCount: exactGeneratedOverlapCellCount,
  exactG03ProtectedCoreOverlapCellCount: exactCoreOverlapCellCount,
  supportEvidenceGeneratedStartOverlapRecordCount: supportGeneratedOverlaps.length,
  supportEvidenceProtectedCoreOverlapRecordCount: supportCoreOverlaps.length,
  supportEvidenceGeneratedStartOverlapCellCount: supportGeneratedOverlapCellCount,
  supportEvidenceProtectedCoreOverlapCellCount: supportCoreOverlapCellCount,
  allNonNullG03DomainsExactZeroAgainstGeneratedStarts: exactGeneratedOverlapRecords.length === 0,
  allNonNullG03DomainsExactZeroAgainstFrozenCores: exactCoreOverlapRecords.length === 0,
  positiveMarginClearanceEstablished: false,
  completeSaveClearanceEstablished: false,
  allInfluenceDomainsKnown: true,
  allProposalGeometryDomainsKnown: true,
  expertPositiveMarginClearanceEstablished: false,
  allProtectedFeatureContractsAccepted: false,
  physicalReleaseAuthorized: false,
  operationGenerationAuthorized: false,
  worldEditAuthorized: false,
  g03CanonicalPayloadSha256: g03.canonicalPayloadSha256,
  convergenceDelta,
  eliminatedUncertainty,
  remainingBlockers,
};

const auditPayload = {
  g03CanonicalPayloadSha256: g03.canonicalPayloadSha256,
  g03NonNullDomainIds,
  convergenceDelta,
  immutableSnapshot,
  generatedStartSubjects: generatedSubjects,
  protectedCoreSubjects: protectedSubjects,
  generatedStartAudits,
  protectedCoreAudits,
  supportEvidenceAudit: {
    classification: 'EXACT_UNRESOLVED_SUPPORT_EVIDENCE_NOT_A_G03_CONSTRUCTION_INTERACTION_OR_INFLUENCE_DOMAIN',
    generatedStarts: supportGeneratedStartAudit,
    protectedCores: supportProtectedCoreAudit,
  },
  nullDomainLedger: nullDomains,
  positiveMarginLedger: marginHolds,
  ownershipContext,
  gate,
};
const report = {
  schemaVersion: 3,
  id: 'combined-zones-phase1-g06-proposed-clearance-audit',
  generatedAtUtc: GENERATED_AT,
  status: 'PARTIAL_PASS_G03_V3_ALL_30_EXACT_PROPOSAL_DOMAINS_AUDITED_POSITIVE_MARGIN_COMPLETE_SAVE_SUPPORT_ACCEPTANCE_G06_HOLD',
  purpose: 'Deterministic offline clearance of all 30 exact G03 v3 proposal domains against all Phase 0 generated starts and frozen protected cores, while retaining positive-margin, complete-save, support-treatment, ownership, and acceptance uncertainty.',
  sourceBindings,
  immutableSnapshot,
  auditContract: {
    generatedStartPolicy: 'Evaluate every Phase 0 generatedStructureStarts inclusive bound; this conservative offline test does not itself freeze every start as a permanent no-touch core.',
    protectedCorePolicy: 'Evaluate the three exact frozen zero-margin default-deny cores from the protected-relic clearance report.',
    coordinateHashPreamble: `${CELL_PREAMBLE}\\n`,
    exactZeroRule: 'EXACT_ZERO is emitted only after deterministic expanded-cell, source-bound interval, or disjoint-inclusive-bounds evaluation.',
    nullRule: 'A null construction, interaction, or influence domain would remain UNKNOWN_NOT_AUDITABLE and is never converted to an empty set; G03 v3 currently has zero null required domains.',
    supportRule: 'D05 support-gap status is exact evidence but is not promoted to construction, interaction, influence, treatment, or future state.',
    g03ConvergenceRule: 'Consume G03 v3 only when all 30 required domains are exact and zero remain null; require the evaluated-domain registry to equal those 30 domains exactly.',
    commissioningEvidenceTimingRule: 'Before R00 require accepted commissioning design, methods, pass criteria, failure stimuli, and evidence-capture contracts. Actual commissioning results are post-build G17/G19 evidence and cannot be required to close pre-R00 G02.',
    authorizationRule: 'Any nonzero overlap requires a separate exact accepted contract; no such contract exists in the consumed registry.',
  },
  generatedStartSubjects: generatedSubjects,
  protectedCoreSubjects: protectedSubjects,
  g03NonNullDomainIds,
  domainSummary: domains.map(({ cells: _cells, ...domain }) => domain).concat(
    b10IntervalDomains.map(({ _intervalMap, ...domain }) => domain),
  ),
  generatedStartAudits,
  protectedCoreAudits,
  exactOverlapSummary: {
    g03GeneratedStartOverlaps: exactGeneratedOverlapRecords,
    g03ProtectedCoreOverlaps: exactCoreOverlapRecords,
  },
  supportEvidenceAudit: auditPayload.supportEvidenceAudit,
  nullDomainLedger: nullDomains,
  positiveMarginLedger: marginHolds,
  convergenceDelta,
  ownershipContext,
  completeSaveContext: {
    status: completeSave.status,
    acceptedCompleteSaveCandidateCount:
      completeSave.summary?.acceptedCompleteSaveCandidateCount
      ?? completeSave.completeSaveIntake?.acceptedCandidateCount
      ?? 0,
    clearanceEstablished: false,
  },
  gate,
  safetyBoundary: {
    acceptedConstructionCellCount: 0,
    acceptedMaterialCellCount: 0,
    acceptedFutureCellCount: 0,
    operationCellCount: 0,
    acceptedProtectedFeatureContractCount: 0,
    physicalReleaseAuthorized: false,
    operationGenerationAuthorized: false,
    worldEditAuthorized: false,
    executable: false,
  },
  auditPayloadSha256: sha256(`${PAYLOAD_PREAMBLE}\n${JSON.stringify(auditPayload)}\n`),
};
report.reportIdentitySha256 = sha256(`${REPORT_PREAMBLE}\n${JSON.stringify({
  schemaVersion: report.schemaVersion,
  id: report.id,
  generatedAtUtc: report.generatedAtUtc,
  status: report.status,
  sourceBindings: report.sourceBindings,
  auditPayloadSha256: report.auditPayloadSha256,
  gate: report.gate,
  safetyBoundary: report.safetyBoundary,
})}\n`);

const domainRows = [...generatedStartAudits].map((audit) => {
  const core = protectedCoreAudits.find(({ domainId }) => domainId === audit.domainId);
  return `| ${audit.domainId} | ${audit.sourceCellCount.toLocaleString()} | ${audit.exactZeroSubjectCount}/${audit.subjectCount} | ${core.exactZeroSubjectCount}/${core.subjectCount} | ${audit.overlapSubjectCount + core.overlapSubjectCount} |`;
});
const supportRows = [...supportGeneratedOverlaps, ...supportCoreOverlaps].map((record) => (
  `| ${record.category} | ${record.subjectId} | ${record.structureId} | ${record.relicKey ?? '—'} | ${record.intersection.cellCount.toLocaleString()} | \`${record.intersection.coordinateSetSha256}\` |`
));
const markdown = `# Combined Zones Phase 1 G06 proposed-set protected-feature clearance

Generated: ${GENERATED_AT}

Status: **${report.status}**
G06 result: **HOLD**
Physical release: **not authorized**
World edits: **not authorized**

This is an offline proposed-set audit. It evaluates all 30 exact G03 v3 domains against all 114 Phase 0 generated starts and the three frozen zero-margin protected cores. It does not turn a proposal into accepted construction, convert a coordination reservation into an expert margin, freeze a positive margin, or substitute region-only evidence for a complete saved world.

## G03 v2 to v3 convergence

| Measure | Prior | Current | Change |
|---|---:|---:|---:|
| Exact evaluated G03 domains | ${convergenceDelta.baseline.exactNonNullG03DomainCount} | ${convergenceDelta.current.exactNonNullG03DomainCount} | +${convergenceDelta.change.exactNonNullG03DomainCount} |
| Null/unknown required domains | ${convergenceDelta.baseline.nullUnknownDomainCount} | ${convergenceDelta.current.nullUnknownDomainCount} | ${convergenceDelta.change.nullUnknownDomainCount} |
| Generated-start/domain evaluations | ${convergenceDelta.baseline.generatedStartDomainEvaluationCount.toLocaleString()} | ${convergenceDelta.current.generatedStartDomainEvaluationCount.toLocaleString()} | +${convergenceDelta.change.generatedStartDomainEvaluationCount.toLocaleString()} |
| Frozen-core/domain evaluations | ${convergenceDelta.baseline.protectedCoreDomainEvaluationCount} | ${convergenceDelta.current.protectedCoreDomainEvaluationCount} | +${convergenceDelta.change.protectedCoreDomainEvaluationCount} |
| G03/generated-start conflict records | ${convergenceDelta.baseline.exactG03GeneratedStartOverlapRecordCount} | ${convergenceDelta.current.exactG03GeneratedStartOverlapRecordCount} | ${convergenceDelta.change.exactG03GeneratedStartOverlapRecordCount} |
| G03/frozen-core conflict records | ${convergenceDelta.baseline.exactG03ProtectedCoreOverlapRecordCount} | ${convergenceDelta.current.exactG03ProtectedCoreOverlapRecordCount} | ${convergenceDelta.change.exactG03ProtectedCoreOverlapRecordCount} |
| D05 support/generated-start disclosures | ${convergenceDelta.baseline.supportEvidenceGeneratedStartOverlapRecordCount} | ${convergenceDelta.current.supportEvidenceGeneratedStartOverlapRecordCount} | ${convergenceDelta.change.supportEvidenceGeneratedStartOverlapRecordCount} |
| D05 support/frozen-core disclosures | ${convergenceDelta.baseline.supportEvidenceProtectedCoreOverlapRecordCount} | ${convergenceDelta.current.supportEvidenceProtectedCoreOverlapRecordCount} | ${convergenceDelta.change.supportEvidenceProtectedCoreOverlapRecordCount} |
| D05 support/generated-start disclosed cells | ${convergenceDelta.baseline.supportEvidenceGeneratedStartOverlapCellCount} | ${convergenceDelta.current.supportEvidenceGeneratedStartOverlapCellCount} | ${convergenceDelta.change.supportEvidenceGeneratedStartOverlapCellCount} |
| D05 support/frozen-core disclosed cells | ${convergenceDelta.baseline.supportEvidenceProtectedCoreOverlapCellCount} | ${convergenceDelta.current.supportEvidenceProtectedCoreOverlapCellCount} | ${convergenceDelta.change.supportEvidenceProtectedCoreOverlapCellCount} |

Newly evaluated exact proposal domains: ${newlyAuditedDomainIds.map((id) => `\`${id}\``).join(', ')}. None is accepted construction, an accepted expert influence kernel, or operation authority.

## All exact G03 domain results

| Domain | Proposed cells | Exact-zero generated starts | Exact-zero frozen cores | Overlap subjects |
|---|---:|---:|---:|---:|
${domainRows.join('\n')}

Exact G03/generated-start overlap records: **${exactGeneratedOverlapRecords.length}**.
Exact G03/frozen-core overlap records: **${exactCoreOverlapRecords.length}**.

## D05 support-gap evidence

The exact ${supportSource.cellCount.toLocaleString()}-cell support-gap status stream is audited separately. It has no accepted treatment or canonical future state and is not a G03 construction, interaction, or influence domain.

| Subject class | Subject | Structure | Relic | Cells | Canonical coordinate SHA-256 |
|---|---|---|---|---:|---|
${supportRows.length ? supportRows.join('\n') : '| — | — | — | — | 0 | — |'}

## Offline uncertainty eliminated

${eliminatedUncertainty.map((item) => `- ${item}`).join('\n')}

## Remaining blockers

${remainingBlockers.map((item) => `- ${item}`).join('\n')}

## Fail-closed conclusion

G06 remains HOLD. All 30 proposal domains are exact and evaluated, but their findings apply only to the source-bound coordination geometry and the three frozen zero-margin cores. They do not establish positive-margin clearance, expert influence clearance, complete-save entity/POI clearance, accepted support treatment, accepted ownership/interfaces, construction safety, or final post-release preservation.

Audit payload SHA-256: \`${report.auditPayloadSha256}\`

G03 v3 canonical payload SHA-256: \`${g03.canonicalPayloadSha256}\`

Report identity SHA-256: \`${report.reportIdentitySha256}\`
`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

console.log(JSON.stringify({
  output: relative(OUTPUT),
  markdown: relative(MARKDOWN),
  status: report.status,
  g06Passed: report.gate.g06Passed,
  nonNullG03DomainCount: report.gate.exactNonNullG03DomainCount,
  nullUnknownDomainCount: report.gate.nullUnknownDomainCount,
  g03GeneratedStartOverlaps: exactGeneratedOverlapRecords.length,
  g03ProtectedCoreOverlaps: exactCoreOverlapRecords.length,
  supportGeneratedStartOverlaps: supportGeneratedOverlaps.length,
  supportProtectedCoreOverlaps: supportCoreOverlaps.length,
  auditPayloadSha256: report.auditPayloadSha256,
  reportIdentitySha256: report.reportIdentitySha256,
}, null, 2));
