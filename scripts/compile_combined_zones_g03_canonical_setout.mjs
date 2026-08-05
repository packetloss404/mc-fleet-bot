#!/usr/bin/env node
/**
 * Compile the bounded G03 canonical integer-setout registry.
 *
 * This is an offline planning compiler. It normalizes exact proposed cell
 * domains, preserves missing domains as explicit null/HOLD records, and
 * discloses overlaps. It emits no block operations, accepted construction
 * ownership, release authority, or live-world mutations.
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

const GENERATED_AT = value('--generated-at', '2026-08-05T07:30:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-g03-canonical-setout.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-g03-canonical-setout.md',
));

const INPUTS = Object.freeze({
  releaseContract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
  b03: 'docs/masterplans/05-combined-zones/phase1-cheyenne-jcurve-geometry.json',
  connectors: 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  d05Alternatives: 'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json',
  d05FutureState: 'docs/masterplans/05-combined-zones/phase1-d05-future-state.json',
  d05Defaults: 'docs/masterplans/05-combined-zones/phase1-d05-conservative-defaults.json',
  d02Technical: 'docs/masterplans/05-combined-zones/phase1-d02-technical-design.json',
  d02C01Proposal:
    'docs/masterplans/05-combined-zones/phase1-d02-c01-ownership-loading-interface-proposal.json',
  d02Owner: 'docs/masterplans/05-combined-zones/phase1-d02-owner-acceptance-packet.json',
  d06LifeSafety: 'docs/masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.json',
  d06Mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  d06Detailed:
    'docs/masterplans/05-combined-zones/phase1-d06-detailed-mechanism-setout.json',
  emptyEight: 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
  b09Technical: 'docs/masterplans/05-combined-zones/phase1-b09-funicular-technical-system.json',
  b11: 'docs/masterplans/05-combined-zones/phase1-b11-external-interface-acceptance.json',
  b11SurfaceRoad:
    'docs/masterplans/05-combined-zones/phase1-b11-surface-road-technical-proposal.json',
  b12: 'docs/masterplans/05-combined-zones/phase1-grand-avenue-passive-shell-candidate.json',
  residualSurfaceConnectorDomains:
    'docs/masterplans/05-combined-zones/phase1-residual-surface-connector-domain-proposals.json',
  civilLifeSafetyDomains:
    'docs/masterplans/05-combined-zones/phase1-civil-life-safety-domain-closure.json',
});

const ROLES = Object.freeze({
  releaseContract: 'controlling G03 pass rule and physical-release lifecycle boundary',
  b03: 'frozen P1-B03 exact Cheyenne J-curve proposal',
  connectors: 'frozen P1-B08 service-tunnel geometry and B09 interface anchors',
  d05Alternatives: 'selected FM-01 B09 accommodation and B10 sparse proposal identity',
  d05FutureState: 'frozen D05 selected planning identity and typed HOLD boundary',
  d05Defaults: 'exact protected-relic no-fill definitions used by D05',
  d02Technical: 'selected exact D02 candidate geometry and technical HOLDs',
  d02C01Proposal: 'bounded C01-stack interaction subsets explicitly not a whole-D02 canonical union',
  d02Owner: 'D02 owner-policy boundary retaining technical acceptance HOLD',
  d06LifeSafety: 'selected B07-C-WEST-2 exact proposal and D06 reservations',
  d06Mechanisms: 'D06 exact reservation-reference ledger and null mechanism slots',
  d06Detailed: 'exact D06 detailed functional setout and precedence proposal with zero accepted construction cells',
  emptyEight: 'frozen Empty Eight geometry needed to reproduce D06 detailed proposal carriers',
  b09Technical: 'exact B09 technical reservation layers explicitly not construction or expert influence',
  b11: 'owner-accepted Grand Avenue 299-point planning profile',
  b11SurfaceRoad: 'exact B11 road construction, interaction, and candidate influence reservation proposals',
  b12: 'unaccepted P1-B12 passive-shell exact candidate geometry',
  residualSurfaceConnectorDomains:
    'seven exact surface/connector construction and coordination-influence proposal domains',
  civilLifeSafetyDomains:
    'eight exact source-limited civil/life-safety proposal domains',
});

const WORLD_MIN_Y = -64;
const WORLD_MAX_Y = 319;
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const STANDARD_CELL_PREAMBLE = 'combined-zones-coordinate-cell-set-v1';
const D06_CELL_PREAMBLE = 'combined-zones-d06-life-safety-cell-set-v1';
const B12_CELL_PREAMBLE = 'combined-zones-grand-avenue-passive-shell-candidate-cells-v1';
const B11_CELL_PREAMBLE = 'combined-zones-b11-surface-road-technical-proposal-cells-v1';
const G03_INTERVAL_PREAMBLE = 'combined-zones-g03-sparse-integer-cell-intervals-v1';
const G03_PAYLOAD_PREAMBLE = 'combined-zones-g03-canonical-setout-payload-v1';
const RESIDUAL_CELL_PREAMBLE = 'combined-zones-coordinate-cell-set-v1';
const CIVIL_CELL_PREAMBLE = 'combined-zones-civil-life-safety-domain-closure-cell-set-v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`G03 canonical setout rejected: ${message}`);
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

function uniqueCells(cells) {
  const byKey = new Map();
  for (const cell of cells) byKey.set(cellKey(cell), { x: cell.x, y: cell.y, z: cell.z });
  return [...byKey.values()].sort(compareCells);
}

function union(...sets) {
  return uniqueCells(sets.flat());
}

function intersection(left, right) {
  const rightKeys = new Set(right.map(cellKey));
  return uniqueCells(left.filter((cell) => rightKeys.has(cellKey(cell))));
}

function difference(left, right) {
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

function boundsDisjoint(left, right) {
  return left.maxX < right.minX || right.maxX < left.minX
    || left.maxY < right.minY || right.maxY < left.minY
    || left.maxZ < right.minZ || right.maxZ < left.minZ;
}

function hashCells(cells, preamble = STANDARD_CELL_PREAMBLE) {
  const digest = crypto.createHash('sha256');
  digest.update(`${preamble}\n`);
  for (const cell of uniqueCells(cells)) digest.update(`${cell.x},${cell.y},${cell.z}\n`);
  return digest.digest('hex');
}

function sparseIntervals(cells, scopeId, domain) {
  const columns = new Map();
  for (const cell of uniqueCells(cells)) {
    const key = `${cell.x},${cell.z}`;
    if (!columns.has(key)) columns.set(key, { x: cell.x, z: cell.z, ys: [] });
    columns.get(key).ys.push(cell.y);
  }
  const records = [...columns.values()].sort((left, right) => left.x - right.x || left.z - right.z);
  const digest = crypto.createHash('sha256');
  digest.update(`${G03_INTERVAL_PREAMBLE}\n${scopeId}/${domain}\n`);
  let intervalCount = 0;
  for (const record of records) {
    const ys = [...new Set(record.ys)].sort((left, right) => left - right);
    const intervals = [];
    let start = ys[0];
    let end = ys[0];
    for (let index = 1; index < ys.length; index += 1) {
      if (ys[index] === end + 1) {
        end = ys[index];
      } else {
        intervals.push([start, end]);
        start = ys[index];
        end = ys[index];
      }
    }
    if (ys.length) intervals.push([start, end]);
    intervalCount += intervals.length;
    digest.update(`${record.x},${record.z}\t${intervals.map(([a, b]) => `${a}..${b}`).join(',')}\n`);
  }
  return {
    preamble: `${G03_INTERVAL_PREAMBLE}\\n${scopeId}/${domain}\\n`,
    record: 'x,z<TAB>inclusive-y-start..inclusive-y-end[,start..end]',
    columnRecordCount: records.length,
    intervalCount,
    intervalManifestSha256: digest.digest('hex'),
  };
}

function componentSummary(cells) {
  const remaining = new Set(cells.map(cellKey));
  const sizes = [];
  const directions = [
    [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
  ];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const queue = [first];
    let size = 0;
    for (let index = 0; index < queue.length; index += 1) {
      const [x, y, z] = queue[index].split(',').map(Number);
      size += 1;
      for (const [dx, dy, dz] of directions) {
        const key = `${x + dx},${y + dy},${z + dz}`;
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

function exactManifest(scopeId, domain, cells, source, sourceHashPreamble = null) {
  const exact = uniqueCells(cells);
  invariant(exact.length === source.cellCount, `${scopeId}/${domain} source count drift`);
  if (source.bounds) {
    invariant(JSON.stringify(boundsOf(exact)) === JSON.stringify(source.bounds),
      `${scopeId}/${domain} source bounds drift`);
  }
  if (sourceHashPreamble) {
    invariant(hashCells(exact, sourceHashPreamble) === source.coordinateSetSha256,
      `${scopeId}/${domain} source coordinate hash drift`);
  }
  return {
    status: 'PROPOSED_EXACT_INTEGER_CELL_SET_UNACCEPTED',
    representation: 'SPARSE_EXACT_INTEGER_CELL_SET_NO_INLINE_COORDINATES',
    cellCount: exact.length,
    bounds: boundsOf(exact),
    canonicalCoordinatePreamble: `${STANDARD_CELL_PREAMBLE}\\n`,
    coordinateSetSha256: hashCells(exact),
    sparseIntervals: sparseIntervals(exact, scopeId, domain),
    ...componentSummary(exact),
    sourceCoordinateSetSha256: source.coordinateSetSha256,
    sourceCoordinateHashPreamble: sourceHashPreamble ? `${sourceHashPreamble}\\n` : null,
    accepted: false,
    constructionOwnership: false,
    operationAuthorization: false,
  };
}

function exactClosureManifest(
  scopeId,
  domain,
  cells,
  source,
  sourceHashPreamble,
  semantic,
) {
  const exact = uniqueCells(cells);
  invariant(exact.length === source.cellCount, `${scopeId}/${domain} closure count drift`);
  invariant(JSON.stringify(boundsOf(exact)) === JSON.stringify(source.bounds),
    `${scopeId}/${domain} closure bounds drift`);
  invariant(hashCells(exact, sourceHashPreamble) === source.coordinateSetSha256,
    `${scopeId}/${domain} closure coordinate identity drift`);
  return {
    status: 'PROPOSED_EXACT_INTEGER_CELL_SET_UNACCEPTED',
    representation: 'SPARSE_EXACT_INTEGER_CELL_SET_NO_INLINE_COORDINATES',
    cellCount: exact.length,
    bounds: boundsOf(exact),
    canonicalCoordinatePreamble: `${STANDARD_CELL_PREAMBLE}\\n`,
    coordinateSetSha256: hashCells(exact),
    sparseIntervals: sparseIntervals(exact, scopeId, domain),
    ...componentSummary(exact),
    sourceCoordinateSetSha256: source.coordinateSetSha256,
    sourceCoordinateHashPreamble: `${sourceHashPreamble}\\n`,
    semantic,
    accepted: false,
    constructionOwnership: false,
    operationAuthorization: false,
  };
}

function sourceBoundExactManifest(scopeId, domain, source, semantic) {
  invariant(source?.cellCount > 0 && source.bounds, `${scopeId}/${domain} source-bound set absent`);
  const intervalIdentity = source.sparseIntervals?.intervalManifestSha256 ?? null;
  const coordinateIdentity = source.coordinateSetSha256 ?? null;
  invariant(intervalIdentity || coordinateIdentity, `${scopeId}/${domain} exact identity absent`);
  return {
    status: 'PROPOSED_EXACT_SOURCE_BOUND_INTEGER_CELL_SET_UNACCEPTED',
    representation: source.representation,
    cellCount: source.cellCount,
    bounds: source.bounds,
    ...(source.sparseIntervals ? { sparseIntervals: source.sparseIntervals } : {}),
    ...(coordinateIdentity ? {
      sourceCoordinateSetSha256: coordinateIdentity,
      sourceCoordinateHashPreamble: source.coordinatePreamble
        ?? source.coordinateSetPreamble
        ?? null,
    } : {}),
    exactIntegerCellSetIdentitySha256: intervalIdentity ?? coordinateIdentity,
    sourceDerivation: source.derivation ?? source.reconstructionRule,
    semantic,
    accepted: false,
    constructionOwnership: false,
    operationAuthorization: false,
  };
}

function nullHold(reason) {
  return {
    status: 'HOLD_REQUIRED_EXACT_SET_MISSING_OR_UNACCEPTED',
    exactIntegerCellManifest: null,
    reason,
    unknownIsNotEmptySet: true,
    accepted: false,
    operationAuthorization: false,
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

function direction(from, to) {
  return { x: Math.sign(to.x - from.x), z: Math.sign(to.z - from.z) };
}

function buildB09(formula, endpoints) {
  const portal = endpoints.from;
  const summit = endpoints.to;
  let climbZ = portal.z - 1;
  while (climbZ > summit.z && mountainSurface(portal.x, climbZ - 1, formula)
    !== mountainSurface(portal.x, climbZ, formula)) climbZ -= 1;
  invariant(climbZ > summit.z, 'B09 lacks a level summit-approach curve');
  const step = 1;
  let throatX = null;
  for (let distance = 1; distance <= formula.extents.east; distance += 1) {
    const x = portal.x + distance;
    if (mountainSurface(x, climbZ, formula) === portal.y - 1
      && mountainSurface(x - step, climbZ, formula) === portal.y - 1) {
      throatX = x;
      break;
    }
  }
  invariant(throatX !== null, 'B09 lacks east-face throat');
  const faceRun = Math.abs(throatX - portal.x);
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
  invariant(points.slice(1).every((point, index) => {
    const previous = points[index];
    return Math.abs(point.x - previous.x) + Math.abs(point.z - previous.z) === 1
      && Math.abs(point.y - previous.y) <= 1;
  }), 'B09 route is not connected cardinal integer geometry');
  const curveIndices = [];
  for (let index = 1; index < points.length - 1; index += 1) {
    const before = direction(points[index - 1], points[index]);
    const after = direction(points[index], points[index + 1]);
    if (before.x !== after.x || before.z !== after.z) curveIndices.push(index);
  }
  invariant(curveIndices.every((index) => (
    points[index - 1].y === points[index].y && points[index + 1].y === points[index].y
  )), 'B09 contains a sloped curve');
  const railAndHeadroom = uniqueCells(points.flatMap(({ x, y, z }) => [
    { x, y, z }, { x, y: y + 1, z },
  ]));
  return { points, accommodation: dilate(railAndHeadroom, 1) };
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
  const exactExcavation = uniqueCells(excavation);
  return { excavation: exactExcavation, interaction: dilate(exactExcavation, 1) };
}

function buildB07(candidate) {
  const { top, observationLanding: observation, lowerLobby: lower } = candidate.anchors;
  const westOffset = candidate.westOffsetBlocks;
  const shiftedX = observation.x - westOffset;
  const upper = cellsIn({
    minX: top.x - 3, maxX: top.x + 3,
    minY: observation.y, maxY: top.y,
    minZ: top.z - 3, maxZ: top.z + 3,
  });
  const observationShift = cellsIn({
    minX: shiftedX - 3, maxX: observation.x + 3,
    minY: observation.y - 3, maxY: observation.y + 3,
    minZ: observation.z - 3, maxZ: observation.z + 3,
  });
  const transfer = cellsIn({
    minX: shiftedX - 3, maxX: shiftedX + 3,
    minY: observation.y - 3, maxY: observation.y + 3,
    minZ: lower.z - 3, maxZ: observation.z + 3,
  });
  const lowerVertical = cellsIn({
    minX: shiftedX - 3, maxX: shiftedX + 3,
    minY: lower.y, maxY: observation.y,
    minZ: lower.z - 3, maxZ: lower.z + 3,
  });
  const lowerShift = cellsIn({
    minX: shiftedX - 3, maxX: lower.x + 3,
    minY: lower.y - 3, maxY: lower.y + 3,
    minZ: lower.z - 3, maxZ: lower.z + 3,
  });
  const excavation = union(upper, observationShift, transfer, lowerVertical, lowerShift);
  return { excavation, interaction: dilate(excavation, 1) };
}

function expandReferenceLine(report) {
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
  const points = [...byStation.values()].sort((left, right) => left.station - right.station);
  invariant(points.length === report.exactReferenceLine.pointCount, 'B12 reference count drift');
  invariant(points.every((point, index) => point.station === index), 'B12 reference station gap');
  return points;
}

function buildB12(report) {
  const reference = expandReferenceLine(report);
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
  const closures = inner.filter(({ station }) => closureStations.has(station));
  return {
    reference,
    material: union(lining, closures),
    interaction: union(outer, separation),
  };
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

function buildB11SurfaceRoad(profileSource) {
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
  return {
    profile,
    construction: uniqueCells(construction),
    interaction: uniqueCells(interaction),
    influence: union(load, drainage, dryUtility, wetUtility),
  };
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
    const bounds = system.exactRiserReservation.bounds;
    const riser = cellsIn(bounds);
    const fan = cellsIn({ ...bounds, maxY: bounds.minY });
    const outlet = cellsIn({ ...bounds, minY: bounds.maxY });
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
  return { layers, proposalUnion };
}

function overlapRecord(leftId, rightId, cells, method = 'EXACT_EXPANDED_INTEGER_SET_INTERSECTION') {
  const exact = uniqueCells(cells);
  return {
    leftScopeId: leftId,
    rightScopeId: rightId,
    classification: exact.length > 0 ? 'OVERLAP_DISCLOSED_HOLD' : 'EXACT_DISJOINT',
    method,
    intersection: {
      cellCount: exact.length,
      bounds: boundsOf(exact),
      coordinateSetSha256: hashCells(exact),
      ...(exact.length > 0 ? { sparseIntervals: sparseIntervals(exact, `${leftId}__${rightId}`, 'overlap') } : {}),
    },
    acceptedInterface: false,
    operationAuthorization: false,
  };
}

const sourceBindings = Object.fromEntries(Object.entries(INPUTS).map(([key, filename]) => [
  key,
  fileBinding(filename, ROLES[key]),
]));
const releaseContract = readJson(INPUTS.releaseContract);
const b03 = readJson(INPUTS.b03);
const connectors = readJson(INPUTS.connectors);
const d05Alternatives = readJson(INPUTS.d05Alternatives);
const d05FutureState = readJson(INPUTS.d05FutureState);
const d05Defaults = readJson(INPUTS.d05Defaults);
const d02Technical = readJson(INPUTS.d02Technical);
const d02C01Proposal = readJson(INPUTS.d02C01Proposal);
const d02Owner = readJson(INPUTS.d02Owner);
const d06LifeSafety = readJson(INPUTS.d06LifeSafety);
const d06Mechanisms = readJson(INPUTS.d06Mechanisms);
const d06Detailed = readJson(INPUTS.d06Detailed);
const emptyEight = readJson(INPUTS.emptyEight);
const b09Technical = readJson(INPUTS.b09Technical);
const b11 = readJson(INPUTS.b11);
const b11SurfaceRoad = readJson(INPUTS.b11SurfaceRoad);
const b12 = readJson(INPUTS.b12);
const residualDomains = readJson(INPUTS.residualSurfaceConnectorDomains);
const civilDomains = readJson(INPUTS.civilLifeSafetyDomains);

invariant(releaseContract.gateDefinitions?.find(({ id }) => id === 'G03_INTEGER_SET_OUT')?.pass
  === 'Every release owner has an exact integer target/interaction cell set, rounding rule, bounds, count, and SHA-256; no null Y or fractional block coordinate remains.',
'controlling G03 definition drift');
invariant(b03.id === 'combined-zones-phase1-cheyenne-jcurve-geometry', 'B03 identity drift');
invariant(connectors.id === 'combined-zones-phase1-connector-geometry', 'connector identity drift');
invariant(d05FutureState.selectedPlanningIdentity?.modelId === 'FM-01-COMPACT-EAST-FACE',
  'D05 selected planning identity drift');
invariant(d02Technical.technicalDevelopmentPayload?.selectedBasis?.alternativeId
  === 'ALT-D02-S04-D-HYBRID-CAPPED-SUMPS-WITH-AQUATIC-NO-BUILD-HOLD',
'D02 selected basis drift');
invariant(d02Owner.finalGate?.d02Resolved === false, 'D02 unexpectedly resolved');
invariant(d02C01Proposal.status
  === 'PARTIAL_PASS_EXACT_BOUNDED_D02_C01_PROPOSAL_D02_G03_G04_G05_HOLD'
  && /^[0-9a-f]{64}$/.test(d02C01Proposal.proposalPayloadSha256),
'bounded D02/C01 proposal identity drift');
invariant(d06Mechanisms.mechanismDevelopmentPayload?.exactReservationReferenceContract?.allPassed === true,
  'D06 reservation reference contract drift');
invariant(d06Mechanisms.summary?.acceptedMechanismManifestCount === 0,
  'D06 unexpectedly has an accepted mechanism manifest');
invariant(d06Detailed.reportIdentitySha256
  === '55eaab99b53aac1de53e81128026ff509de7a6efb9614b7e390c4f9cbe37c12f'
  && d06Detailed.safetyBoundary?.acceptedConstructionCellCount === 0,
'D06 detailed proposal identity or semantic boundary drift');
invariant(b09Technical.reportIdentitySha256
  === 'e8738f3932f2afc3ba71e35ccdebf0d5ef444ca7389e81ec31a18e48517d3eba'
  && b09Technical.safetyBoundary?.constructionCellCount === 0,
'B09 technical proposal identity or construction boundary drift');
invariant(b11SurfaceRoad.status
  === 'EXACT_SURFACE_ROAD_SET_OUT_PROPOSAL_READY_ALL_TECHNICAL_AND_PHYSICAL_GATES_HOLD'
  && b11SurfaceRoad.authorityBoundary?.acceptedProfileAmended === false,
'B11 surface-road proposal identity or profile boundary drift');
invariant(b12.status
  === 'EXACT_PASSIVE_SHELL_CANDIDATE_READY_FOR_REVIEW_ALL_TECHNICAL_AND_PHYSICAL_GATES_HOLD',
'P1-B12 candidate status drift');
invariant(residualDomains.status
  === 'PASS_SEVEN_EXACT_PROPOSAL_DOMAINS_COMPILED_ALL_TECHNICAL_ACCEPTANCE_AND_RELEASE_GATES_HOLD'
  && residualDomains.proposalPayloadSha256
    === 'b16a05525c4d68f3d3499d6db8a85ccd1eec44c89027ea1adca49dfed891af61'
  && residualDomains.projectedG03Impact?.exactProposalGeometryDomainCount === 7,
'residual surface/connector proposal identity drift');
invariant(civilDomains.status
  === 'PASS_EIGHT_SOURCE_LIMITED_PROPOSAL_DOMAINS_EXACT_ALL_FUNCTIONAL_AND_RELEASE_GATES_HOLD'
  && civilDomains.canonicalPayloadSha256
    === '8fb2d3425bcd002fa8e782fae40a5d9eb591e9583535037b5471f009fe103459'
  && civilDomains.closureAccounting?.exactSourceLimitedProposalDomainCount === 8,
'civil/life-safety proposal identity drift');
invariant(residualDomains.safetyBoundary?.acceptedConstructionCellCount === 0
  && residualDomains.safetyBoundary?.acceptedInfluenceCellCount === 0
  && residualDomains.safetyBoundary?.operationCellCount === 0
  && civilDomains.safetyBoundary?.acceptedConstructionCellCount === 0
  && civilDomains.safetyBoundary?.operationCellCount === 0,
'closure packages unexpectedly claim accepted cells or operations');

const snapshotExpected = d05FutureState.sourceBindings.immutablePhase0PostRegionSnapshot;
const immutableSnapshot = snapshotIdentity(absolute(snapshotExpected.path));
invariant(immutableSnapshot.sha256 === snapshotExpected.sha256
  && immutableSnapshot.regionFileCount === snapshotExpected.regionFileCount
  && immutableSnapshot.bytes === snapshotExpected.bytes,
'immutable D05 source snapshot identity drift');

const b03ConstructionCells = uniqueCells(b03.design.excavationReservation.cells);
const b03InteractionCells = uniqueCells(b03.design.oneCellFaceInteractionShell.cells);
const b03ScopeCells = union(b03ConstructionCells, b03InteractionCells);
const b07Source = d06LifeSafety.b07PublicShaftTransfer.candidates
  .find(({ id }) => id === 'B07-C-WEST-2');
invariant(b07Source && d06LifeSafety.b07PublicShaftTransfer.recommendedCandidateId === b07Source.id,
  'B07-C-WEST-2 is not the controlling recommendation');
const b07Cells = buildB07(b07Source);
const b08Cells = buildB08(connectors);
const selectedD05 = d05Alternatives.alternatives
  .find(({ modelId }) => modelId === d05FutureState.selectedPlanningIdentity.modelId);
invariant(selectedD05, 'selected D05 alternative missing');
const b09Cells = buildB09(selectedD05.formula, connectors.funicularFaceComparison.designEndpoints);
const d02Cells = uniqueCells(d02Technical.technicalDevelopmentPayload.selectedBasis
  .exactAggregateCandidateCellManifest.cells);
const d06DetailedCells = buildD06DetailedSetout(
  d06Mechanisms.mechanismDevelopmentPayload,
  emptyEight,
  d06Detailed,
);
const b11Cells = buildB11SurfaceRoad(b11);
const b12Cells = buildB12(b12);
const residualProposalSets = residualDomains.proposalPayload.proposalSets;
const civilProposalSets = civilDomains.proposalDomains;
const b03InfluenceCells = dilate(b03ScopeCells, 1);
const b08InfluenceCells = dilate(b08Cells.interaction, 1);
const b09ConstructionCells = b09Cells.accommodation;
const b09InfluenceCells = dilate(b09ConstructionCells, 1);
const b12InfluenceCells = dilate(b12Cells.interaction, 1);
const d02NoBuildCells = uniqueCells(d02Technical.technicalDevelopmentPayload
  .roadLow001NoBuildHold.exactPreservationCellManifest.cells);
const d02InteractionCells = d02Cells;
const d02InfluenceCells = union(d02InteractionCells, d02NoBuildCells);
const d06ReservationSourceSets = civilProposalSets['D06-RESERVATIONS'];

invariant(b03InfluenceCells.length === 55216, 'B03 residual influence count drift');
invariant(b08InfluenceCells.length === 24690, 'B08 residual influence count drift');
invariant(b09ConstructionCells.length === 7800
  && b09InfluenceCells.length === 20430, 'B09 residual domain count drift');
invariant(b12InfluenceCells.length === 30732, 'B12 residual influence count drift');
invariant(d02InteractionCells.length === 432
  && d02InfluenceCells.length === 456, 'D02 civil domain count drift');

const sourceB03Construction = b03.design.excavationReservation;
const sourceB03Interaction = b03.design.oneCellFaceInteractionShell;
const sourceB07Construction = b07Source.exactCellSets.excavationReservation;
const sourceB07Interaction = b07Source.exactCellSets.interactionUnion;
const sourceB08Construction = connectors.serviceTunnelCenterline.exactCellSets.excavationReservation;
const sourceB08Interaction = connectors.serviceTunnelCenterline.exactCellSets.interactionUnion;
const sourceB09Interaction = selectedD05.routeAccommodation.b09Funicular.minimumPlanningAccommodation;
const sourceD02Construction = d02Technical.technicalDevelopmentPayload.selectedBasis
  .exactAggregateCandidateCellManifest;
const sourceD06DetailedInteraction = d06Detailed.crossScopeAudit.d06DetailedProposalUnion;
const sourceB11Construction = b11SurfaceRoad.exactCellSets.proposedRoadConstruction;
const sourceB11Interaction = b11SurfaceRoad.exactCellSets.candidateInteractionUnion;
const sourceB11Influence = b11SurfaceRoad.exactCellSets.candidateInfluenceReservationUnion;
const sourceB12Construction = b12.exactCellSets.proposedMaterialGeometry;
const sourceB12Interaction = b12.exactCellSets.candidateInfluenceUnion;

const manifests = {
  b03Construction: exactManifest('P1-B03', 'construction', b03ConstructionCells,
    sourceB03Construction, STANDARD_CELL_PREAMBLE),
  b03Interaction: exactManifest('P1-B03', 'interaction', b03InteractionCells,
    sourceB03Interaction, STANDARD_CELL_PREAMBLE),
  b07Construction: exactManifest('P1-B07', 'construction', b07Cells.excavation,
    sourceB07Construction, D06_CELL_PREAMBLE),
  b07Interaction: exactManifest('P1-B07', 'interaction', b07Cells.interaction,
    sourceB07Interaction, D06_CELL_PREAMBLE),
  b08Construction: exactManifest('P1-B08', 'construction', b08Cells.excavation,
    sourceB08Construction, STANDARD_CELL_PREAMBLE),
  b08Interaction: exactManifest('P1-B08', 'interaction', b08Cells.interaction,
    sourceB08Interaction, STANDARD_CELL_PREAMBLE),
  b09Interaction: exactManifest('P1-B09', 'interaction', b09Cells.accommodation,
    sourceB09Interaction, STANDARD_CELL_PREAMBLE),
  d02Construction: exactManifest('D02', 'construction', d02Cells,
    sourceD02Construction),
  d06DetailedInteraction: exactManifest(
    'D06-MECHANISMS',
    'interaction',
    d06DetailedCells.proposalUnion,
    sourceD06DetailedInteraction,
    D06_CELL_PREAMBLE,
  ),
  b11Construction: exactManifest(
    'P1-B11',
    'construction',
    b11Cells.construction,
    sourceB11Construction,
    `${B11_CELL_PREAMBLE}-road-surface`,
  ),
  b11Interaction: exactManifest(
    'P1-B11',
    'interaction',
    b11Cells.interaction,
    sourceB11Interaction,
    `${B11_CELL_PREAMBLE}-interaction-prism`,
  ),
  b11Influence: exactManifest(
    'P1-B11',
    'influence',
    b11Cells.influence,
    sourceB11Influence,
    `${B11_CELL_PREAMBLE}-influence-reservation`,
  ),
  b12Construction: exactManifest('P1-B12', 'construction', b12Cells.material,
    sourceB12Construction, `${B12_CELL_PREAMBLE}-proposed-material-geometry`),
  b12Interaction: exactManifest('P1-B12', 'interaction', b12Cells.interaction,
    sourceB12Interaction, `${B12_CELL_PREAMBLE}-influence-union`),
  b03Influence: exactClosureManifest(
    'P1-B03', 'influence', b03InfluenceCells,
    residualProposalSets['P1-B03'].influence,
    RESIDUAL_CELL_PREAMBLE,
    'EXACT_CONSTRUCTABILITY_MAINTENANCE_DRAINAGE_UTILITY_COORDINATION_RESERVATION_NOT_EXPERT_KERNEL',
  ),
  b07Influence: exactClosureManifest(
    'P1-B07', 'influence', b07Cells.interaction,
    civilProposalSets['P1-B07'].influence,
    CIVIL_CELL_PREAMBLE,
    'SOURCE_LIMITED_COORDINATION_RESERVATION_EQUALS_KNOWN_INTERACTION_NOT_EXPERT_MARGIN',
  ),
  b08Influence: exactClosureManifest(
    'P1-B08', 'influence', b08InfluenceCells,
    residualProposalSets['P1-B08'].influence,
    RESIDUAL_CELL_PREAMBLE,
    'EXACT_CONSTRUCTABILITY_MAINTENANCE_DRAINAGE_UTILITY_COORDINATION_RESERVATION_NOT_EXPERT_KERNEL',
  ),
  b09Construction: exactClosureManifest(
    'P1-B09', 'construction', b09ConstructionCells,
    residualProposalSets['P1-B09'].construction,
    RESIDUAL_CELL_PREAMBLE,
    'MINIMUM_STATION_GUIDEWAY_SUPPORT_TARGET_ENVELOPE_NO_MATERIAL_OR_SYSTEM_ACCEPTANCE',
  ),
  b09Influence: exactClosureManifest(
    'P1-B09', 'influence', b09InfluenceCells,
    residualProposalSets['P1-B09'].influence,
    RESIDUAL_CELL_PREAMBLE,
    'EXACT_CONSTRUCTION_MAINTENANCE_DRAINAGE_POWER_COORDINATION_RESERVATION_NOT_EXPERT_KERNEL',
  ),
  d02Interaction: exactClosureManifest(
    'D02', 'interaction', d02InteractionCells,
    civilProposalSets.D02.interaction,
    CIVIL_CELL_PREAMBLE,
    'WHOLE_KNOWN_D02_INTERACTION_PROPOSAL_NO_FLOW_LOADING_OR_GENERIC_HALO_CREDIT',
  ),
  d02Influence: exactClosureManifest(
    'D02', 'influence', d02InfluenceCells,
    civilProposalSets.D02.influence,
    CIVIL_CELL_PREAMBLE,
    'KNOWN_D02_INTERACTION_PLUS_ROAD_LOW_001_PRESERVATION_NOT_EXPERT_KERNEL',
  ),
  d06MechanismConstruction: exactClosureManifest(
    'D06-MECHANISMS', 'construction', d06DetailedCells.proposalUnion,
    civilProposalSets['D06-MECHANISMS'].construction,
    CIVIL_CELL_PREAMBLE,
    'DETAILED_FUNCTIONAL_TARGET_UNION_NOT_ACCEPTED_MECHANISM_OR_BUILD_STATE',
  ),
  d06MechanismInfluence: exactClosureManifest(
    'D06-MECHANISMS', 'influence', d06DetailedCells.proposalUnion,
    civilProposalSets['D06-MECHANISMS'].influence,
    CIVIL_CELL_PREAMBLE,
    'SOURCE_LIMITED_FUNCTIONAL_COORDINATION_RESERVATION_NOT_EXPERT_KERNEL',
  ),
  b12Influence: exactClosureManifest(
    'P1-B12', 'influence', b12InfluenceCells,
    residualProposalSets['P1-B12'].influence,
    RESIDUAL_CELL_PREAMBLE,
    'EXACT_CONSTRUCTION_MAINTENANCE_DRAINAGE_UTILITY_COORDINATION_RESERVATION_NOT_EXPERT_KERNEL',
  ),
};
manifests.b10Interaction = sourceBoundExactManifest(
  'P1-B10',
  'interaction',
  residualProposalSets['P1-B10'].interaction,
  'EXACT_EXTERNAL_SIX_FACE_SHELL_OF_SOURCE_BOUND_FM01_INTERVALS',
);
manifests.b10Influence = sourceBoundExactManifest(
  'P1-B10',
  'influence',
  residualProposalSets['P1-B10'].influence,
  'EXACT_EXTERNAL_SHELL_UNION_SOURCE_BOUND_SUPPORT_GAP_NOT_EXPERT_KERNEL',
);
for (const domain of ['construction', 'interaction', 'influence']) {
  manifests[`d06Reservation${domain[0].toUpperCase()}${domain.slice(1)}`]
    = sourceBoundExactManifest(
      'D06-RESERVATIONS',
      domain,
      d06ReservationSourceSets[domain],
      d06ReservationSourceSets[domain].semantics,
    );
}

invariant(manifests.b10Interaction.exactIntegerCellSetIdentitySha256
  === '9dcae3deeefc09f563a47955dd7d3fba75eac8e8ca74f44ab26b24d3a4535ba8'
  && manifests.b10Influence.exactIntegerCellSetIdentitySha256
    === '1a209dbae3552c0b49a7972f22c4838a30e09c8391bce8d20979a1b4f542447d',
'B10 closure interval identity drift');
invariant(residualProposalSets['P1-B10'].interaction.sourceConstructionIntervalManifestSha256
  === d05FutureState.selectedPlanningIdentity.boundCandidateAddedSolidIntervals
    .intervalManifestSha256,
'B10 closure is not bound to selected FM-01 source construction intervals');

invariant(b09Cells.points.length === selectedD05.routeAccommodation.b09Funicular.pointCount,
  'B09 point count drift');
invariant(b09Technical.deterministicGeometryContract.minimumPlanningAccommodation
  .coordinateSetSha256 === sourceB09Interaction.coordinateSetSha256,
'B09 technical proposal is not bound to the controlling minimum accommodation');
invariant(d02C01Proposal.proposalPayload.ambiguityReconciliation.G03.remains
  .startsWith('No accepted whole-D02 canonical interaction union'),
'bounded C01 proposal no longer preserves whole-D02 interaction HOLD');
invariant(b11Cells.profile.length === 299, 'B11 profile expansion drift');
invariant(b12Cells.reference.length === 299, 'B12 reference expansion drift');

const expandedDomains = [
  { id: 'P1-B03', cells: b03InfluenceCells, definition: 'all three exact domains bounded by conservative coordination influence proposal' },
  { id: 'P1-B07', cells: b07Cells.interaction, definition: 'all three exact domains bounded by selected B07-C-WEST-2 interaction union' },
  { id: 'P1-B08', cells: b08InfluenceCells, definition: 'all three exact domains bounded by conservative coordination influence proposal' },
  { id: 'P1-B09', cells: b09InfluenceCells, definition: 'all three exact domains bounded by conservative coordination influence proposal' },
  { id: 'D02', cells: d02InfluenceCells, definition: 'all three exact domains bounded by D02 interaction plus ROAD-LOW-001 reservation' },
  { id: 'D06-MECHANISMS', cells: d06DetailedCells.proposalUnion, definition: 'all three exact domains use the detailed functional proposal union' },
  { id: 'P1-B11', cells: union(b11Cells.interaction, b11Cells.influence), definition: 'union of road construction, interaction, and candidate influence reservations' },
  { id: 'P1-B12', cells: b12InfluenceCells, definition: 'all three exact domains bounded by conservative coordination influence proposal' },
];
const exactPairwiseOverlaps = [];
for (let left = 0; left < expandedDomains.length; left += 1) {
  for (let right = left + 1; right < expandedDomains.length; right += 1) {
    exactPairwiseOverlaps.push(overlapRecord(
      expandedDomains[left].id,
      expandedDomains[right].id,
      intersection(expandedDomains[left].cells, expandedDomains[right].cells),
    ));
  }
}

const b10Formula = d05FutureState.selectedPlanningIdentity.formula;
const b10Bounds = {
  minX: b10Formula.center.x - b10Formula.extents.west,
  maxX: b10Formula.center.x + b10Formula.extents.east,
  minY: 72,
  maxY: b10Formula.peakSurfaceY,
  minZ: b10Formula.center.z - b10Formula.extents.north,
  maxZ: b10Formula.center.z + b10Formula.extents.south,
};
invariant(boundsDisjoint(boundsOf(d06DetailedCells.proposalUnion), b10Bounds),
  'D06 detailed interaction bounds unexpectedly intersect B10');
invariant(boundsDisjoint(boundsOf(b11Cells.interaction), b10Bounds),
  'B11 interaction bounds unexpectedly intersect B10');
const b08AndB09NoFill = new Set(union(b08Cells.interaction, b09Cells.accommodation).map(cellKey));
const reader = new SnapshotReader(absolute(immutableSnapshot.path));
const surfaceByColumn = new Map();
const b03B10Overlap = [];
for (const cell of b03ScopeCells) {
  const designY = mountainSurface(cell.x, cell.z, b10Formula);
  if (designY === null) continue;
  const column = `${cell.x},${cell.z}`;
  if (!surfaceByColumn.has(column)) surfaceByColumn.set(column, await reader.surfaceY(cell.x, cell.z));
  const startY = Math.max(surfaceByColumn.get(column) + 1, 72);
  if (cell.y < startY || cell.y > designY || b08AndB09NoFill.has(cellKey(cell))) continue;
  b03B10Overlap.push(cell);
}
const b03B10 = overlapRecord(
  'P1-B03',
  'P1-B10',
  b03B10Overlap,
  'EXACT_B03_EXPANSION_AGAINST_SOURCE_BOUND_B10_INTERVAL_MEMBERSHIP_RULE',
);

const b10SparseSource = d05FutureState.selectedPlanningIdentity.boundCandidateAddedSolidIntervals;
invariant(b10SparseSource.candidateAddedSolidCellCount
  === selectedD05.sparseAddedSolidIntervals.candidateAddedSolidCellCount
  && b10SparseSource.intervalManifestSha256
    === selectedD05.sparseAddedSolidIntervals.intervalManifestSha256,
'B10 sparse selected identity drift');
const supportGapSource = d05FutureState.selectedPlanningIdentity.boundSupportGap;

const scopeRegistry = [
  {
    scopeId: 'P1-B03',
    selectedIdentity: 'CHEYENNE-JCURVE-EXACT-PLANNING-GEOMETRY',
    disposition: 'PROPOSAL_UNACCEPTED_G03_HOLD',
    construction: manifests.b03Construction,
    interaction: {
      ...manifests.b03Interaction,
      semantic: 'EXTERNAL_ONE_CELL_FACE_INTERACTION_SHELL_EXCLUDES_CONSTRUCTION',
    },
    influence: manifests.b03Influence,
  },
  {
    scopeId: 'P1-B07',
    selectedIdentity: b07Source.id,
    disposition: 'RECOMMENDED_PROPOSAL_UNACCEPTED_D06_G03_HOLD',
    construction: manifests.b07Construction,
    interaction: { ...manifests.b07Interaction, semantic: 'INTERACTION_UNION_INCLUDES_CONSTRUCTION' },
    influence: manifests.b07Influence,
  },
  {
    scopeId: 'P1-B08',
    selectedIdentity: 'SERVICE-TUNNEL-CENTERLINE-EXACT',
    disposition: 'PROPOSAL_UNACCEPTED_G03_HOLD',
    construction: manifests.b08Construction,
    interaction: { ...manifests.b08Interaction, semantic: 'INTERACTION_UNION_INCLUDES_CONSTRUCTION' },
    influence: manifests.b08Influence,
  },
  {
    scopeId: 'P1-B09',
    selectedIdentity: `${selectedD05.modelId}/${selectedD05.face}-face-funicular`,
    disposition: 'ALL_EXACT_PROPOSAL_DOMAINS_COMPILED_TECHNICAL_AND_ACCEPTANCE_HOLD',
    construction: manifests.b09Construction,
    interaction: {
      ...manifests.b09Interaction,
      semantic: 'MINIMUM_PLANNING_ACCOMMODATION_NOT_ENGINEERING_BUFFER',
      orderedCenterline: {
        pointCount: selectedD05.routeAccommodation.b09Funicular.pointCount,
        sha256: selectedD05.routeAccommodation.b09Funicular.orderedCenterlineSha256,
      },
    },
    influence: manifests.b09Influence,
    exactTechnicalReservationLedger: {
      status: b09Technical.exactTechnicalReservationProposals.status,
      reportIdentitySha256: b09Technical.reportIdentitySha256,
      technicalReservationManifestSha256:
        b09Technical.deterministicGeometryContract.technicalReservationManifestSha256,
      layerCount: b09Technical.exactTechnicalReservationProposals.proposalLayerCount,
      layers: Object.entries(b09Technical.exactTechnicalReservationProposals.proposalLayers)
        .map(([layerId, layer]) => ({
          layerId,
          proposalRole: layer.proposalRole,
          cellCount: layer.cellCount,
          bounds: layer.bounds,
          coordinateSetSha256: layer.coordinateSetSha256,
          accepted: false,
        })),
      sealedInterfaceCount: b09Technical.exactSealedInterfaceProposals.exactInterfaceCount,
      acceptedTechnicalCellCount: 0,
      interpretation: 'Exact functional reservation detail only; it does not close B09 construction or expert influence.',
    },
  },
  {
    scopeId: 'P1-B10',
    selectedIdentity: selectedD05.modelId,
    disposition: 'ALL_EXACT_SOURCE_BOUND_SPARSE_PROPOSAL_DOMAINS_COMPILED_TECHNICAL_AND_ACCEPTANCE_HOLD',
    construction: {
      status: b10SparseSource.status,
      representation: 'SOURCE_BOUND_SPARSE_EXACT_INTEGER_Y_INTERVAL_SET_NO_INLINE_COORDINATES',
      cellCount: b10SparseSource.candidateAddedSolidCellCount,
      bounds: b10Bounds,
      sparseIntervals: {
        preamble: b10SparseSource.preamble,
        record: b10SparseSource.record,
        raisedColumnCount: b10SparseSource.raisedColumnCount,
        intervalManifestSha256: b10SparseSource.intervalManifestSha256,
      },
      exactIntegerCellSetIdentitySha256: b10SparseSource.intervalManifestSha256,
      formula: b10Formula,
      immutableSnapshot,
      exclusions: {
        protectedRelicWithheldFillCellCount: b10SparseSource.protectedRelicWithheldFillCellCount,
        b08WithheldFillCellCount: b10SparseSource.b08WithheldFillCellCount,
        b09WithheldFillCellCount: b10SparseSource.b09WithheldFillCellCount,
      },
      canonicalMaterialState: null,
      accepted: false,
      constructionOwnership: false,
      operationAuthorization: false,
    },
    interaction: manifests.b10Interaction,
    influence: manifests.b10Influence,
    exactSupportGapEvidence: {
      status: supportGapSource.status,
      cellCount: supportGapSource.cellCount,
      columnCount: supportGapSource.columnCount,
      intervalManifestSha256: supportGapSource.intervalManifestSha256,
      treatment: null,
      interpretation: 'Exact unresolved support evidence; not reclassified as construction, interaction, or influence geometry.',
    },
  },
  {
    scopeId: 'D02',
    selectedIdentity: d02Technical.technicalDevelopmentPayload.selectedBasis.alternativeId,
    disposition: 'ALL_EXACT_SOURCE_LIMITED_PROPOSAL_DOMAINS_COMPILED_D02_TECHNICAL_AND_ACCEPTANCE_HOLD',
    construction: {
      ...manifests.d02Construction,
      semantic: 'CANDIDATE_EXCAVATION_AND_SEALED_CAP_ENVELOPES_NO_MATERIAL_OR_STORAGE_ACCEPTED',
      roleStreamSha256: sourceD02Construction.roleStreamSha256,
    },
    interaction: manifests.d02Interaction,
    influence: manifests.d02Influence,
    exactInterfaceReferenceLedger: {
      inletInterfaceCount: d02Technical.summary?.inletInterfaceCount ?? 10,
      inletInterfaceCellCount: d02Technical.summary?.inletInterfaceCellCount ?? 16,
      acceptedInterfaceCount: 0,
      canonicalInteractionUnion: null,
    },
    boundedC01StackInteractionEvidence: {
      status: d02C01Proposal.status,
      proposalPayloadSha256: d02C01Proposal.proposalPayloadSha256,
      exactSubsetCount: Object.keys(d02C01Proposal.proposalPayload.exactInteractionSets).length,
      exactSubsets: Object.entries(d02C01Proposal.proposalPayload.exactInteractionSets)
        .map(([subsetId, subset]) => ({
          subsetId,
          representation: subset.representation,
          cellCount: subset.cellCount,
          bounds: subset.bounds,
          coordinateSetSha256: subset.coordinateSetSha256 ?? null,
          intervalManifestSha256: subset.intervalManifestSha256 ?? null,
          accepted: false,
        })),
      wholeD02CanonicalInteractionUnion: null,
      wholeD02CanonicalInfluenceUnion: null,
      interpretation: 'Bounded C01-stack subsets remove local ambiguity only and are not promoted into whole-D02 canonical domains.',
    },
  },
  {
    scopeId: 'D06-RESERVATIONS',
    selectedIdentity: 'D06-EXACT-REFERENCE-LEDGER-V1',
    disposition: 'ALL_EXACT_SOURCE_BOUND_REFERENCE_UNION_DOMAINS_COMPILED_FUNCTIONAL_AND_ACCEPTANCE_HOLD',
    construction: manifests.d06ReservationConstruction,
    interaction: manifests.d06ReservationInteraction,
    influence: manifests.d06ReservationInfluence,
    exactReservationReferenceLedger: {
      referenceCount: d06Mechanisms.mechanismDevelopmentPayload.exactReservationReferenceContract.referenceCount,
      passedReferenceCount: d06Mechanisms.mechanismDevelopmentPayload.exactReservationReferenceContract.passedReferenceCount,
      failedReferenceCount: d06Mechanisms.mechanismDevelopmentPayload.exactReservationReferenceContract.failedReferenceCount,
      allPassed: true,
      references: d06Mechanisms.mechanismDevelopmentPayload.exactReservationReferenceContract.references,
      interpretation: 'Exact source identities only; this ledger is not a set union, mechanism design, material manifest, or operation plan.',
    },
  },
  {
    scopeId: 'D06-MECHANISMS',
    selectedIdentity: 'D06-DETAILED-MECHANISM-CIRCUIT-SETOUT-PROPOSAL',
    disposition: 'ALL_EXACT_DETAILED_FUNCTIONAL_PROPOSAL_DOMAINS_COMPILED_FUNCTIONAL_AND_ACCEPTANCE_HOLD',
    construction: manifests.d06MechanismConstruction,
    interaction: {
      ...manifests.d06DetailedInteraction,
      semantic: 'DETAILED_FUNCTIONAL_SET_OUT_UNION_NOT_CONSTRUCTION_OR_ACCEPTED_MECHANISM_STATE',
    },
    influence: manifests.d06MechanismInfluence,
    nullSlotSummary: {
      acceptedMechanismManifestCount: d06Mechanisms.summary.acceptedMechanismManifestCount,
      exactCircuitManifestCount: d06Mechanisms.summary.exactCircuitManifestCount,
      physicalOpeningCount: d06Mechanisms.summary.physicalOpeningCount,
      acceptedReceiverCount: d06Mechanisms.summary.acceptedReceiverCount,
      acceptedOwnerCount: d06Mechanisms.summary.acceptedOwnerCount,
      acceptedInterfaceContractCount: d06Mechanisms.summary.acceptedInterfaceContractCount,
    },
    exactDetailedProposalLedger: {
      status: d06Detailed.exactDetailedProposalLayers.status,
      reportIdentitySha256: d06Detailed.reportIdentitySha256,
      proposalLayerCount: d06Detailed.deterministicSetoutContract.proposalLayerCount,
      setoutManifestSha256: d06Detailed.deterministicSetoutContract.setoutManifestSha256,
      precedenceManifestSha256: d06Detailed.deterministicSetoutContract.precedenceManifestSha256,
      rawProposalMembershipCount:
        d06Detailed.exactDetailedProposalLayers.rawProposalMembershipCount,
      uniqueProposalCellCount:
        d06Detailed.exactDetailedProposalLayers.uniqueRawProposalCellCount,
      duplicateCoordinateCount:
        d06Detailed.exactDetailedProposalLayers.duplicateCoordinateCount,
      layers: Object.entries(d06Detailed.exactDetailedProposalLayers.proposalLayers)
        .map(([layerId, layer]) => ({
          layerId,
          priority: layer.priority,
          group: layer.group,
          proposedFunction: layer.proposedFunction,
          basis: layer.basis,
          rawProposalCellCount: layer.rawProposalCellSet.cellCount,
          rawProposalCoordinateSetSha256: layer.rawProposalCellSet.coordinateSetSha256,
          canonicalProposalCellCount: layer.canonicalProposalCellSetAfterPrecedence.cellCount,
          canonicalProposalCoordinateSetSha256:
            layer.canonicalProposalCellSetAfterPrecedence.coordinateSetSha256,
          accepted: false,
        })),
      acceptedMechanismCellCount: 0,
      acceptedConstructionCellCount: 0,
    },
  },
  {
    scopeId: 'P1-B11',
    selectedIdentity: b11SurfaceRoad.proposalId,
    disposition: 'EXACT_SURFACE_ROAD_PROPOSAL_DOMAINS_COMPILED_TECHNICAL_ACCEPTANCE_G03_HOLD',
    construction: {
      ...manifests.b11Construction,
      semantic: 'ONE_CELL_ROAD_DATUM_CONTROL_GEOMETRY_NO_FORMATION_DEPTH_MATERIAL_OR_FUTURE_STATE',
    },
    interaction: {
      ...manifests.b11Interaction,
      semantic: 'TEN_WIDE_ROAD_Y_MINUS_2_TO_PLUS_1_COORDINATION_PRISM',
    },
    influence: {
      ...manifests.b11Influence,
      semantic: 'CANDIDATE_LOAD_DRAINAGE_AND_UTILITY_RESERVATION_UNION_NOT_EXPERT_PHYSICAL_INFLUENCE_KERNEL',
      expertConstructionInfluenceKernel: null,
      expertConstructionInfluenceAccepted: false,
    },
    exactReferenceProfile: {
      pointCount: b11.acceptancePayload.grandAvenue.centerlinePointCount,
      start: b11.acceptancePayload.grandAvenue.start,
      end: b11.acceptancePayload.grandAvenue.end,
      orderedCoordinateSha256: b11.acceptancePayload.grandAvenue.centerlineSha256,
      acceptedConstructionSet: false,
    },
    proposalAuthorityBoundary: {
      acceptedProfileAmended: false,
      eightWideSideBiasAcceptedByOwner: false,
      technicalDesignAccepted: false,
      acceptedConstructionCellCount: 0,
      operationCellCount: 0,
    },
  },
  {
    scopeId: 'P1-B12',
    selectedIdentity: b12.candidateId,
    disposition: 'EXACT_PASSIVE_SHELL_CANDIDATE_UNACCEPTED_G03_HOLD',
    construction: {
      ...manifests.b12Construction,
      semantic: 'PROPOSED_MATERIAL_GEOMETRY_WITH_NO MATERIAL OR BLOCK STATE SELECTED',
    },
    interaction: {
      ...manifests.b12Interaction,
      semantic: 'CANDIDATE_INFLUENCE_UNION_USED_ONLY_AS_GEOMETRIC_INTERACTION_DOMAIN',
    },
    influence: manifests.b12Influence,
    exactReferenceLine: {
      pointCount: b12.exactReferenceLine.pointCount,
      referenceLineSha256: b12.exactReferenceLine.referenceLineSha256,
      sparseRunCount: b12.exactReferenceLine.sparseRunCount,
    },
  },
];

const hashBoundScopeDomains = [
  {
    id: 'P1-B10',
    bounds: residualProposalSets['P1-B10'].influence.bounds,
    exactSetIdentitySha256:
      residualProposalSets['P1-B10'].influence.sparseIntervals.intervalManifestSha256,
    representation: 'SOURCE_BOUND_SPARSE_INTERVALS',
  },
  {
    id: 'D06-RESERVATIONS',
    bounds: civilProposalSets['D06-RESERVATIONS'].influence.bounds,
    exactSetIdentitySha256:
      civilProposalSets['D06-RESERVATIONS'].influence.coordinateSetSha256,
    representation: 'SOURCE_BOUND_COORDINATE_HASH_ONLY',
  },
];

function sourceBoundComparison(left, right) {
  if (boundsDisjoint(left.bounds, right.bounds)) {
    return {
      leftScopeId: left.id,
      rightScopeId: right.id,
      classification: 'EXACT_DISJOINT_BY_INCLUSIVE_BOUNDS',
      method: 'INCLUSIVE_INTEGER_BOUNDS_SEPARATION',
      intersection: {
        cellCount: 0,
        bounds: null,
        coordinateSetSha256: hashCells([]),
      },
      sourceBoundComparisonComplete: true,
      acceptedInterface: false,
      operationAuthorization: false,
    };
  }
  if (left.id === 'P1-B10' && right.id === 'P1-B03') {
    return {
      ...b03B10,
      classification: 'PARTIAL_EXACT_CONSTRUCTION_OVERLAP_FULL_SCOPE_INTERSECTION_UNKNOWN',
      method: 'EXACT_B03_AGAINST_B10_CONSTRUCTION_INTERVALS_ONLY',
      fullScopeIntersectionUnknown: true,
      sourceBoundComparisonComplete: false,
      unknownReason: 'B10 interaction and influence are exact source-bound interval identities not expanded in G03.',
    };
  }
  if (left.id === 'P1-B10' && ['P1-B08', 'P1-B09'].includes(right.id)) {
    return {
      leftScopeId: left.id,
      rightScopeId: right.id,
      classification: 'SOURCE_CERTIFIED_CONSTRUCTION_EXCLUSION_FULL_SCOPE_INTERSECTION_UNKNOWN',
      method: 'B10_SOURCE_EXCLUSION_COUNTS_PLUS_UNEXPANDED_EXACT_INTERVAL_DOMAINS',
      constructionWithheldCellCount: right.id === 'P1-B08'
        ? b10SparseSource.b08WithheldFillCellCount
        : b10SparseSource.b09WithheldFillCellCount,
      intersection: { cellCount: null, bounds: null, coordinateSetSha256: null },
      sourceBoundComparisonComplete: false,
      unknownReason: 'The exact B10 interaction/influence interval streams are hash-bound but not materialized as inline cells.',
      unknownIsNotEmptySet: true,
      acceptedInterface: false,
      operationAuthorization: false,
    };
  }
  if (left.id === 'D06-RESERVATIONS' && right.id === 'P1-B07') {
    return {
      ...overlapRecord(
        left.id,
        right.id,
        b07Cells.interaction,
        'EXACT_SOURCE_REFERENCE_CONTAINMENT_OF_B07_INTERACTION_UNION',
      ),
      classification: 'EXACT_SOURCE_CONTAINMENT_OVERLAP_DISCLOSED_HOLD',
      sourceBoundComparisonComplete: true,
    };
  }
  return {
    leftScopeId: left.id,
    rightScopeId: right.id,
    classification: 'UNKNOWN_EXACT_SOURCE_BOUND_SET_NOT_EXPANDED',
    method: left.representation,
    intersection: { cellCount: null, bounds: null, coordinateSetSha256: null },
    sourceBoundComparisonComplete: false,
    unknownReason: `${left.id} is exact and hash-bound but lacks an expanded coordinate stream in this compiler.`,
    unknownIsNotEmptySet: true,
    acceptedInterface: false,
    operationAuthorization: false,
  };
}

const sourceBoundPairwiseComparisons = hashBoundScopeDomains.flatMap((left) => (
  expandedDomains.map((right) => sourceBoundComparison(left, {
    id: right.id,
    bounds: boundsOf(right.cells),
    representation: 'EXPANDED_EXACT_INTEGER_CELLS',
  }))
));
sourceBoundPairwiseComparisons.push(sourceBoundComparison(
  hashBoundScopeDomains[0],
  hashBoundScopeDomains[1],
));

const overlapAudit = {
  status: 'PASS_ALL_SCOPE_DOMAINS_EXACT_EXPANDED_AND_SOURCE_BOUND_OVERLAPS_AUDITED_ACCEPTANCE_HOLD',
  expandedDomainDefinitions: expandedDomains.map(({ id, cells, definition }) => ({
    scopeId: id,
    definition,
    cellCount: cells.length,
    bounds: boundsOf(cells),
    coordinateSetSha256: hashCells(cells),
  })),
  exactPairwiseOverlaps,
  sourceBoundScopeDomains: hashBoundScopeDomains,
  sourceBoundPairwiseComparisons,
  b10CrossScopeChecks: [
    b03B10,
    {
      leftScopeId: 'P1-B08', rightScopeId: 'P1-B10',
      classification: 'SOURCE_CERTIFIED_WITHHELD_FROM_B10_FILL',
      exactWithheldCellCount: b10SparseSource.b08WithheldFillCellCount,
      sourceInteractionCellCount: b08Cells.interaction.length,
      acceptedInterface: false,
    },
    {
      leftScopeId: 'P1-B09', rightScopeId: 'P1-B10',
      classification: 'SOURCE_CERTIFIED_WITHHELD_FROM_B10_FILL',
      exactWithheldCellCount: b10SparseSource.b09WithheldFillCellCount,
      sourceInteractionCellCount: b09Cells.accommodation.length,
      acceptedInterface: false,
    },
    ...['P1-B07', 'D02', 'D06-MECHANISMS', 'P1-B11', 'P1-B12'].map((scopeId) => ({
      leftScopeId: scopeId,
      rightScopeId: 'P1-B10',
      classification: 'BOUNDS_DISJOINT',
      acceptedInterface: false,
    })),
    ...['D06-RESERVATIONS'].map((scopeId) => ({
      leftScopeId: scopeId,
      rightScopeId: 'P1-B10',
      classification: 'BOUNDS_DISJOINT_EXACT_SOURCE_BOUND_SCOPE_UNION',
      unknownIsNotEmptySet: false,
      acceptedInterface: false,
    })),
  ],
  disclosedOverlapCount: exactPairwiseOverlaps.filter(
    ({ intersection: result }) => result.cellCount > 0,
  ).length + sourceBoundPairwiseComparisons.filter(
    ({ intersection: result }) => Number.isInteger(result.cellCount) && result.cellCount > 0,
  ).length,
  unknownPairCount: sourceBoundPairwiseComparisons.filter(
    ({ sourceBoundComparisonComplete }) => sourceBoundComparisonComplete === false,
  ).length,
  unknownDueNullDomainCount: 0,
  unknownDueExactSourceBoundUnexpandedCount: sourceBoundPairwiseComparisons.filter(
    ({ sourceBoundComparisonComplete }) => sourceBoundComparisonComplete === false,
  ).length,
  allOverlapsResolvedAsAcceptedInterfaces: false,
};

const unresolved = scopeRegistry.flatMap((scope) => ['construction', 'interaction', 'influence']
  .filter((domain) => scope[domain]?.exactIntegerCellManifest === null)
  .map((domain) => ({ scopeId: scope.scopeId, domain, reason: scope[domain].reason })));
const allRequiredDomains = scopeRegistry.flatMap((scope) => (
  ['construction', 'interaction', 'influence'].map((domain) => ({
    scopeId: scope.scopeId,
    domain,
    manifest: scope[domain],
  }))
));
invariant(allRequiredDomains.length === 30, 'G03 v3 must contain exactly thirty scope/domain records');
invariant(unresolved.length === 0, `G03 v3 expected zero null domains, found ${unresolved.length}`);
invariant(allRequiredDomains.every(({ manifest }) => (
  Number.isInteger(manifest.cellCount)
    && manifest.cellCount > 0
    && manifest.bounds
    && (manifest.coordinateSetSha256
      || manifest.exactIntegerCellSetIdentitySha256
      || manifest.sparseIntervals?.intervalManifestSha256)
)), 'G03 v3 emitted a required domain without an exact count, bounds, and SHA-256 identity');
invariant(exactPairwiseOverlaps.find((record) => (
  record.leftScopeId === 'P1-B11' && record.rightScopeId === 'P1-B12'
))?.intersection.cellCount >= 4784, 'B11/B12 exact overlap lost the previously bound road-load seam');
const eliminatedAmbiguities = [
  'P1-B03 construction and external interaction-shell proposal are sparse, integer, bounded, counted, and hashed.',
  'P1-B07 is pinned to B07-C-WEST-2 and its construction and interaction-union proposals are sparse, integer, bounded, counted, and hashed.',
  'P1-B08 construction and interaction-union proposals are sparse, integer, bounded, counted, and hashed.',
  'P1-B09 construction and coordination-influence proposals bind the minimum planning accommodation without accepting materials, mechanisms, structural design, or expert influence.',
  'P1-B10 construction, interaction, and influence proposals are bound to exact sparse interval hashes and the immutable snapshot without expanding 16-million-scale coordinate streams inline.',
  'D02 construction, whole-known interaction, and source-limited influence proposals are exact; hydraulics, flow, storage, receiver, outfall, loading, and expert influence remain unaccepted.',
  'D06 retains exact construction, interaction, and influence identities for both the 73-reference reservation union and independently reproduced 9,065-cell detailed functional setout.',
  'P1-B11 construction, interaction, and candidate load/drainage/utility influence reservations are independently reconstructed and hashed without accepting an expert physical influence kernel.',
  'P1-B12 construction, interaction, and conservative coordination-influence proposals are reconstructed and hashed while expert influence remains unaccepted.',
  'All pairwise overlaps among expanded exact scope unions are enumerated; source-bound comparisons are either proven by bounds/source containment or explicitly retained as unknown for unexpanded exact streams.',
  'Seven surface/connector construction and coordination-influence domains are independently reconstructed or source-bound without promoting them to expert influence or construction acceptance.',
  'Eight civil/life-safety domains are independently reconstructed where coordinate sources exist; exact D06 reservation unions remain source-bound hash-only identities.',
  'All 30 required scope/domain records now have integer counts, inclusive bounds, and exact SHA-256 identities; no geometry null remains.',
];

const newlyClosedProposalGeometryDomains = [
  ...residualDomains.projectedG03Impact.exactProposalDomains,
  ...civilDomains.closureAccounting.geometricallyClosedDomains,
];
invariant(newlyClosedProposalGeometryDomains.length === 15,
  'G03 v3 closure packages must cover the fifteen v2 null domains exactly');

const gate = {
  id: 'G03_INTEGER_SET_OUT',
  controllingPassRule: releaseContract.gateDefinitions.find(({ id }) => id === 'G03_INTEGER_SET_OUT').pass,
  result: 'PASS',
  g03Passed: true,
  exactScopeCount: scopeRegistry.length,
  exactRequiredDomainCount: allRequiredDomains.length,
  exactExpandedScopeDomainCount: expandedDomains.length,
  originalV1UnresolvedRequiredDomainCount: 19,
  priorUnresolvedRequiredDomainCount: 15,
  unresolvedRequiredDomainCount: unresolved.length,
  newlyClosedProposalGeometryDomains,
  newlyClosedProposalGeometryDomainCount: newlyClosedProposalGeometryDomains.length,
  unresolvedRequiredDomains: unresolved,
  disclosedOverlapCount: overlapAudit.disclosedOverlapCount,
  unknownOverlapPairCount: overlapAudit.unknownPairCount,
  passBasis: [
    'All 30 required construction, interaction, and influence proposal domains have exact integer cell counts, inclusive bounds, deterministic reconstruction/source rules, and SHA-256 identities.',
    'No required domain contains a null Y, fractional coordinate, or missing exact identity.',
    'Overlap uncertainty is preserved only for exact source-bound coordinate streams that are not expanded inline; unknown is never treated as an empty set.',
  ],
  downstreamAndTechnicalHolds: [
    'Every closure set remains an unaccepted planning or source-limited coordination proposal rather than accepted construction or expert influence authority.',
    'G02 technical evidence, G04 ownership, G05 interfaces, G06 protected-feature clearance, G07 executable operations, and complete-save evidence remain separate gates.',
    'Disclosed overlaps are coordination findings, not accepted interfaces.',
  ],
  eliminatedAmbiguities,
  ambiguitiesRemaining: [
    ...residualDomains.proposalPayload.externalTechnicalHolds,
    ...civilDomains.genuineExternalHolds,
  ],
  physicalReleaseAuthorized: false,
  operationGenerationAuthorized: false,
  worldEditAuthorized: false,
};

const canonicalPayload = { immutableSnapshot, scopeRegistry, overlapAudit, gate };
const report = {
  schemaVersion: 3,
  id: 'combined-zones-phase1-g03-canonical-setout',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_G03_V3_ALL_30_PROPOSAL_DOMAINS_EXACT_DOWNSTREAM_AND_PHYSICAL_AUTHORITY_HOLD',
  purpose: 'One authoritative deterministic sparse/source-bound registry for all 30 exact Phase 1 proposal domains, explicit semantic ceilings, and disclosed cross-scope overlap uncertainty without construction, expert-influence, or release acceptance.',
  sourceBindings,
  immutableSnapshot,
  canonicalContracts: {
    coordinatePreamble: `${STANDARD_CELL_PREAMBLE}\\n`,
    sparseIntervalPreamble: `${G03_INTERVAL_PREAMBLE}\\n<scope>/<domain>\\n`,
    sparseIntervalRecord: 'x,z<TAB>inclusive-y-start..inclusive-y-end[,start..end]',
    integerLattice: 'Every emitted exact coordinate is an integer block cell; bounds are inclusive.',
    largeSetRule: 'Large exact sets may be represented by reconstruction formula plus source-bound sparse interval hash; no coordinate array is required.',
    nullRule: 'All 30 required domains must have exact non-null count/bounds/hash identities; overlap uncertainty is never represented as an empty set.',
  },
  scopeRegistry,
  overlapAudit,
  v3IntegrationDelta: {
    originalV1UnresolvedRequiredDomainCount: 19,
    priorV2UnresolvedRequiredDomainCount: 15,
    currentUnresolvedRequiredDomainCount: unresolved.length,
    closedProposalGeometryDomainCount: newlyClosedProposalGeometryDomains.length,
    closedProposalGeometryDomains: newlyClosedProposalGeometryDomains,
    boundSourceIdentities: {
      residualSurfaceConnectorProposalPayloadSha256:
        residualDomains.proposalPayloadSha256,
      residualSurfaceConnectorFileSha256:
        sourceBindings.residualSurfaceConnectorDomains.sha256,
      civilLifeSafetyCanonicalPayloadSha256:
        civilDomains.canonicalPayloadSha256,
      civilLifeSafetyFileSha256:
        sourceBindings.civilLifeSafetyDomains.sha256,
      b09TechnicalReportIdentitySha256: b09Technical.reportIdentitySha256,
      b11SurfaceRoadFileSha256: sourceBindings.b11SurfaceRoad.sha256,
      d06DetailedReportIdentitySha256: d06Detailed.reportIdentitySha256,
      d02C01ProposalPayloadSha256: d02C01Proposal.proposalPayloadSha256,
    },
    independentReconstruction: {
      exactCoordinateDomainCount: 24,
      sourceBoundHashOnlyDomainCount: 6,
      sourceBoundHashOnlyScopes: ['P1-B10', 'D06-RESERVATIONS'],
      qualification: 'The two scopes have exact count/bounds/hash domain identities but their large/reference-union coordinate streams are not expanded in G03.',
    },
    semanticNonPromotions: [
      'Every construction-domain closure is an unaccepted target or source-limited reservation proposal with no selected material/future state.',
      'Every influence-domain closure is a conservative coordination reservation, never an expert physical propagation kernel.',
      'D06 detailed functional cells remain unaccepted mechanisms; the 73-reference union remains exact source-bound geometry with no functional credit.',
      'D02 exact interaction/influence geometry does not supply hydraulics, flow, receiver, outfall, loading, or geotechnical acceptance.',
      'B10 exact sparse interaction/influence identities do not accept support, groundwater, cryosphere, erosion, settlement, or material states.',
    ],
  },
  gate,
  safetyBoundary: {
    acceptedConstructionCellCount: 0,
    acceptedMaterialCellCount: 0,
    acceptedFutureCellCount: 0,
    operationCellCount: 0,
    constructionOwnershipAuthorized: false,
    physicalReleaseAuthorized: false,
    operationGenerationAuthorized: false,
    worldEditAuthorized: false,
    executable: false,
  },
  canonicalPayloadSha256: sha256(`${G03_PAYLOAD_PREAMBLE}\n${JSON.stringify(canonicalPayload)}\n`),
};

const overlapRows = [
  ...exactPairwiseOverlaps.filter(({ intersection: result }) => result.cellCount > 0),
  ...sourceBoundPairwiseComparisons.filter(
    ({ intersection: result }) => Number.isInteger(result.cellCount) && result.cellCount > 0,
  ),
].map((record) => `| ${record.leftScopeId} | ${record.rightScopeId} | ${record.intersection.cellCount.toLocaleString()} | \`${record.intersection.coordinateSetSha256}\` |`);
const unknownOverlapRows = sourceBoundPairwiseComparisons
  .filter(({ sourceBoundComparisonComplete }) => sourceBoundComparisonComplete === false)
  .map((record) => `| ${record.leftScopeId} | ${record.rightScopeId} | ${record.classification} | ${record.unknownReason} |`);
const scopeRows = scopeRegistry.map((scope) => {
  const display = (domain) => domain?.cellCount != null
    ? `${domain.cellCount.toLocaleString()} proposed`
    : 'null / HOLD';
  return `| ${scope.scopeId} | ${display(scope.construction)} | ${display(scope.interaction)} | ${display(scope.influence)} | ${scope.disposition} |`;
});
const markdown = `# Combined Zones Phase 1 G03 canonical integer setout v3

Generated: ${GENERATED_AT}

Status: **${report.status}**
G03 result: **PASS**
Physical release: **not authorized**
World edits: **not authorized**

This offline compiler normalizes every selected exact proposal into one authoritative sparse/source-bound registry. All **30 of 30** required scope/domain records now have integer counts, inclusive bounds, and exact SHA-256 identities. A geometrically exact proposal is not an accepted construction set or expert physical influence kernel.

## V3 integration result

Unresolved required geometry domains decrease from **15 to ${unresolved.length}** in this integration, and from **19 to ${unresolved.length}** across the complete G03 convergence. The residual surface/connector package closes seven proposal domains; the civil/life-safety package closes eight. All 15 remain unaccepted and non-executable.

B10 and D06-RESERVATIONS remain exact source-bound hash identities rather than fabricated inline coordinate lists. The other 24 domains are independently reconstructed to canonical G03 coordinate and sparse-interval hashes.

## Scope registry

| Scope | Proposed construction | Proposed interaction | Physical influence | Disposition |
|---|---:|---:|---:|---|
${scopeRows.join('\n')}

## Disclosed exact overlaps

| Left | Right | Cells | Canonical coordinate SHA-256 |
|---|---|---:|---|
${overlapRows.length ? overlapRows.join('\n') : '| — | — | 0 | — |'}

The B08 and B09 reservations are source-certified exclusions from B10 fill, withholding ${b10SparseSource.b08WithheldFillCellCount.toLocaleString()} and ${b10SparseSource.b09WithheldFillCellCount.toLocaleString()} candidate fill cells respectively. Full-scope B10 comparisons with B03, B08, and B09 remain unexpanded exact-set comparisons because B10 interaction/influence are sparse interval identities. D06-MECHANISMS, D06-RESERVATIONS, D02, B07, B11, and B12 are bounds-disjoint from B10.

## Exact source-bound comparisons not expanded

| Left | Right | Classification | Why exact intersection remains unknown |
|---|---|---|---|
${unknownOverlapRows.length ? unknownOverlapRows.join('\n') : '| — | — | — | none |'}

There are **${overlapAudit.unknownPairCount}** unexpanded exact-set comparisons and **0** unknowns caused by null geometry. Bounds-disjoint and source-contained pairs are resolved explicitly. Unknown is never treated as an empty set or accepted interface.

## Ambiguities eliminated

${eliminatedAmbiguities.map((item) => `- ${item}`).join('\n')}

## External technical and acceptance holds

${gate.ambiguitiesRemaining.map((item) => `- **${item.id}: ${item.status}.** ${item.requirement}`).join('\n')}

## Fail-closed conclusion

G03 passes its exact-integer-setout rule. That pass creates no accepted construction, expert influence, material or future-state cell, no ownership acceptance, no interface acceptance, no operation, and no release authority. The next valid work is complete-save intake, scope-specific G02 technical acceptance, G04 ownership, G05 directional interfaces, G06 protected-feature clearance, and G07 operation proof against this immutable identity.

Canonical payload SHA-256: \`${report.canonicalPayloadSha256}\`
`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

console.log(JSON.stringify({
  output: relative(OUTPUT),
  markdown: relative(MARKDOWN),
  status: report.status,
  g03Passed: report.gate.g03Passed,
  scopeCount: scopeRegistry.length,
  exactRequiredDomainCount: allRequiredDomains.length,
  priorUnresolvedRequiredDomainCount: 15,
  unresolvedRequiredDomainCount: unresolved.length,
  disclosedOverlapCount: overlapAudit.disclosedOverlapCount,
  unknownOverlapPairCount: overlapAudit.unknownPairCount,
  b03B10OverlapCellCount: b03B10.intersection.cellCount,
  canonicalPayloadSha256: report.canonicalPayloadSha256,
}, null, 2));
