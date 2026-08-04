#!/usr/bin/env node
/**
 * Compile deterministic, read-only D05/B09/B10 future-mountain alternatives.
 *
 * The output is planning geometry only. It binds an immutable copied snapshot,
 * emits exact analytic surface and sparse fill-interval manifests, and keeps
 * material states, owners, interfaces, expert influence kernels, operations,
 * and release authority absent.
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

const GENERATED_AT = value('--generated-at', '2026-08-04T22:45:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.md',
));

const INPUTS = Object.freeze({
  coordinateRegistry: 'masterplans/05-combined-zones/site-coordinates.json',
  geometryCoordination: 'masterplans/05-combined-zones/phase1-geometry-coordination.json',
  d05HydrologyBaseline:
    'masterplans/05-combined-zones/phase1-d05-hydrology-relic-buffer-design.json',
  d05ConservativeDefaults:
    'masterplans/05-combined-zones/phase1-d05-conservative-defaults.json',
  d05RelicConditionAccess:
    'masterplans/05-combined-zones/phase1-d05-relic-condition-access-survey.json',
  d05FutureStateContract:
    'masterplans/05-combined-zones/phase1-d05-future-state-compiler-contract.json',
  d06EgressGeometry:
    'masterplans/05-combined-zones/phase1-d06-egress-geometry-design.json',
  connectorGeometry:
    'masterplans/05-combined-zones/phase1-connector-geometry.json',
});

const WORLD_MIN_Y = -64;
const WORLD_MAX_Y = 319;
const MOUNTAIN_BASE_SURFACE_Y = 71;
const MOUNTAIN_PEAK_SURFACE_Y = 303;
const MOUNTAIN_ADDED_SOLID_MIN_Y = 72;
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const WATER = new Set(['minecraft:water', 'minecraft:bubble_column']);
const LAVA = new Set(['minecraft:lava']);
const FROZEN = new Set([
  'minecraft:ice',
  'minecraft:packed_ice',
  'minecraft:blue_ice',
  'minecraft:frosted_ice',
]);
const SNOW = new Set(['minecraft:snow', 'minecraft:snow_block', 'minecraft:powder_snow']);
const COORDINATE_PREAMBLE = 'combined-zones-coordinate-cell-set-v1';
const STATE_PREAMBLE = 'combined-zones-block-state-cell-set-v1';
const CENTERLINE_PREAMBLE = 'combined-zones-ordered-centerline-v1';
const CURRENT_SURFACE_PREAMBLE = 'combined-zones-d05-current-surface-v1';
const DESIGN_SURFACE_PREAMBLE = 'combined-zones-d05-design-surface-v1';
const SPARSE_SOLID_PREAMBLE = 'combined-zones-d05-sparse-solid-intervals-v1';
const SUPPORT_GAP_PREAMBLE = 'combined-zones-d05-support-gap-intervals-v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`D05/B09/B10 input rejected: ${message}`);
}

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8'));
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function binding(relativePath) {
  const data = fs.readFileSync(absolute(relativePath));
  return { path: relativePath, bytes: data.length, sha256: sha256(data) };
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
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

  async state(x, y, z) {
    const { sections } = await this.chunk(Math.floor(x / 16), Math.floor(z / 16));
    const states = sections.get(Math.floor(y / 16))?.block_states;
    if (!states?.palette?.length) return { Name: 'minecraft:air' };
    const index = ((y & 15) << 8) | ((z & 15) << 4) | (x & 15);
    return states.palette[paletteIndex(states, index, 4)] ?? { Name: 'minecraft:air' };
  }

  async biome(x, y, z) {
    const { sections } = await this.chunk(Math.floor(x / 16), Math.floor(z / 16));
    const biomes = sections.get(Math.floor(y / 16))?.biomes;
    if (!biomes?.palette?.length) return null;
    const index = (((y & 15) >> 2) << 4) | (((z & 15) >> 2) << 2) | ((x & 15) >> 2);
    return biomes.palette[paletteIndex(biomes, index, 1)] ?? null;
  }

  async surface(x, z) {
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
        return { x, y, z, state, biome: await this.biome(x, y, z) };
      }
    }
    return {
      x,
      y: WORLD_MIN_Y - 1,
      z,
      state: { Name: 'minecraft:air' },
      biome: null,
    };
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

function uniqueCells(cells) {
  const byKey = new Map();
  for (const cell of cells) byKey.set(cellKey(cell), { x: cell.x, y: cell.y, z: cell.z });
  return [...byKey.values()].sort(compareCells);
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

function coordinateHash(cells) {
  const digest = crypto.createHash('sha256');
  digest.update(`${COORDINATE_PREAMBLE}\n`);
  for (const cell of uniqueCells(cells)) digest.update(`${cell.x},${cell.y},${cell.z}\n`);
  return digest.digest('hex');
}

function coordinateHashWithoutFinalNewline(cells, preamble) {
  const records = uniqueCells(cells).map(({ x, y, z }) => `${x},${y},${z}`).join('\n');
  return sha256(`${preamble}\n${records}`);
}

function canonicalState(state) {
  const properties = Object.entries(state?.Properties ?? {}).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify({
    Name: state?.Name ?? 'minecraft:air',
    ...(properties.length > 0 ? { Properties: Object.fromEntries(properties) } : {}),
  });
}

function stateHash(cells) {
  const digest = crypto.createHash('sha256');
  digest.update(`${STATE_PREAMBLE}\n`);
  for (const cell of [...cells].sort(compareCells)) {
    digest.update(`${cell.x},${cell.y},${cell.z}\t${canonicalState(cell.state)}\n`);
  }
  return digest.digest('hex');
}

function cellSet(cells, extra = {}) {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: boundsOf(exact),
    coordinateSetSha256: coordinateHash(exact),
    ...extra,
  };
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

function difference(left, right) {
  const excluded = new Set(right.map(cellKey));
  return left.filter((cell) => !excluded.has(cellKey(cell)));
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

function setIntersection(left, right) {
  const rightKeys = new Set(right.map(cellKey));
  return uniqueCells(left.filter((cell) => rightKeys.has(cellKey(cell))));
}

function setUnion(...sets) {
  return uniqueCells(sets.flat());
}

function orderedCenterlineHash(points) {
  const digest = crypto.createHash('sha256');
  digest.update(`${CENTERLINE_PREAMBLE}\n`);
  for (const point of points) {
    digest.update(`${point.index}:${point.x},${point.y},${point.z}:${point.kind}\n`);
  }
  return digest.digest('hex');
}

function familyForName(name) {
  if (WATER.has(name)) return 'water';
  if (LAVA.has(name)) return 'lava';
  if (FROZEN.has(name)) return 'frozen';
  if (SNOW.has(name)) return 'snow';
  return 'other';
}

function sortedCounts(map) {
  return Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
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
  const rise = Math.floor(
    (model.peakSurfaceY - model.baseSurfaceY) * (denominator - numerator) / denominator,
  );
  return model.baseSurfaceY + rise;
}

function direction(from, to) {
  return { x: Math.sign(to.x - from.x), z: Math.sign(to.z - from.z) };
}

function buildFunicularRoute(model, face, endpoints) {
  const portal = endpoints.from;
  const summit = endpoints.to;
  let climbZ = portal.z - 1;
  while (climbZ > summit.z && mountainSurface(portal.x, climbZ - 1, model)
    !== mountainSurface(portal.x, climbZ, model)) {
    climbZ -= 1;
  }
  invariant(climbZ > summit.z,
    `${model.id} lacks a level summit-approach curve column`);
  const maximumFaceExtent = face === 'east' ? model.extents.east : model.extents.west;
  const step = face === 'east' ? 1 : -1;
  let throatX = null;
  for (let distance = 1; distance <= maximumFaceExtent; distance += 1) {
    const x = portal.x + step * distance;
    const inwardX = x - step;
    if (mountainSurface(x, climbZ, model) === portal.y - 1
      && mountainSurface(inwardX, climbZ, model) === portal.y - 1) {
      throatX = x;
      break;
    }
  }
  invariant(throatX !== null, `${model.id} lacks a ${face} face throat at rail Y ${portal.y}`);
  const faceRun = Math.abs(throatX - portal.x);
  const points = [];
  for (let distance = 0; distance <= faceRun; distance += 1) {
    points.push({
      x: portal.x + step * distance,
      y: portal.y,
      z: portal.z,
      kind: distance === 0 ? 'portal-interface' : 'level-station-throat',
    });
  }
  const hairpinRun = portal.z - climbZ;
  for (let offset = 1; offset <= hairpinRun; offset += 1) {
    points.push({ x: throatX, y: portal.y, z: portal.z - offset, kind: 'level-hairpin' });
  }
  for (let distance = 1; distance <= faceRun; distance += 1) {
    const x = throatX - step * distance;
    const y = mountainSurface(x, climbZ, model) + 1;
    points.push({
      x,
      y,
      z: climbZ,
      kind: distance === 1 ? 'level-hairpin-exit' : 'face-ascent',
    });
  }
  const northRun = Math.abs(summit.z - climbZ);
  for (let distance = 1; distance <= northRun; distance += 1) {
    const z = climbZ - distance;
    const y = mountainSurface(summit.x, z, model) + 1;
    points.push({
      x: summit.x,
      y,
      z,
      kind: distance === 1 ? 'level-summit-curve-exit'
        : distance === northRun ? 'summit-interface' : 'summit-ascent',
    });
  }
  points.forEach((point, index) => { point.index = index; });
  const steps = points.slice(1).map((point, index) => {
    const previous = points[index];
    return {
      horizontal: Math.abs(point.x - previous.x) + Math.abs(point.z - previous.z),
      vertical: point.y - previous.y,
    };
  });
  const curveIndices = [];
  for (let index = 1; index < points.length - 1; index += 1) {
    const before = direction(points[index - 1], points[index]);
    const after = direction(points[index], points[index + 1]);
    if (before.x !== after.x || before.z !== after.z) curveIndices.push(index);
  }
  invariant(steps.every(({ horizontal, vertical }) => horizontal === 1 && Math.abs(vertical) <= 1),
    `${model.id} ${face} centerline is not cardinal rail-buildable geometry`);
  const slopedCurveIndices = curveIndices.filter((index) => !(
    points[index - 1].y === points[index].y && points[index + 1].y === points[index].y
  ));
  invariant(slopedCurveIndices.length === 0,
    `${model.id} ${face} centerline has sloped curves at ${slopedCurveIndices.join(',')}`);
  invariant(points.at(-1).x === summit.x && points.at(-1).y === summit.y
    && points.at(-1).z === summit.z, `${model.id} ${face} centerline misses summit`);
  const railAndHeadroom = uniqueCells(points.flatMap(({ x, y, z }) => [
    { x, y, z },
    { x, y: y + 1, z },
  ]));
  const reservation = dilate(railAndHeadroom, 1);
  const facePoints = points.filter((point) => point.z <= climbZ);
  const clearances = facePoints.map((point) => ({
    point: { x: point.x, y: point.y, z: point.z, index: point.index },
    designSurfaceY: mountainSurface(point.x, point.z, model),
    railMinusDesignSurfaceY: point.y - mountainSurface(point.x, point.z, model),
  }));
  const minimumClearance = [...clearances].sort((left, right) => (
    left.railMinusDesignSurfaceY - right.railMinusDesignSurfaceY
  ))[0];
  const maximumClearance = [...clearances].sort((left, right) => (
    right.railMinusDesignSurfaceY - left.railMinusDesignSurfaceY
  ))[0];
  return {
    face,
    throat: { x: throatX, y: portal.y, z: portal.z, climbZ },
    pointCount: points.length,
    horizontalStepCount: points.length - 1,
    orderedCenterlineSha256: orderedCenterlineHash(points),
    curveIndices,
    ascendingStepCount: steps.filter(({ vertical }) => vertical === 1).length,
    levelStepCount: steps.filter(({ vertical }) => vertical === 0).length,
    descendingStepCount: steps.filter(({ vertical }) => vertical < 0).length,
    maximumAbsoluteRisePerHorizontalStep: Math.max(...steps.map(({ vertical }) => Math.abs(vertical))),
    everyStepCardinalAndRailBuildable: true,
    everyCurveLevel: true,
    faceSurfaceClearance: {
      minimumRailMinusDesignSurfaceY: minimumClearance.railMinusDesignSurfaceY,
      minimumPoint: minimumClearance,
      maximumRailMinusDesignSurfaceY: maximumClearance.railMinusDesignSurfaceY,
      maximumPoint: maximumClearance,
      qualification:
        'Every face-ascent rail cell is exactly one block above the analytic design surface. The level station throat is a tunnel reservation; no structural or maintenance-egress clearance is inferred.',
    },
    minimumPlanningAccommodation: {
      derivation:
        'two-cell rail/headroom seed plus exact one-cell Chebyshev shell; not an engineering, structural, evacuation, or vehicle-clearance buffer',
      ...cellSet(reservation),
      constructionOwnership: false,
      operationAuthorization: false,
    },
    _points: points,
    _reservation: reservation,
  };
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
  const interaction = dilate(uniqueCells(excavation), 1);
  const expected = connector.serviceTunnelCenterline.exactCellSets.interactionUnion;
  invariant(interaction.length === expected.cellCount, 'B08 interaction cell count drift');
  invariant(coordinateHash(interaction) === expected.coordinateSetSha256,
    'B08 interaction cell hash drift');
  return interaction;
}

function intervalText(start, end, excludedY) {
  if (start > end) return { text: '-', count: 0, excluded: 0 };
  const excluded = [...new Set(excludedY.filter((y) => y >= start && y <= end))]
    .sort((a, b) => a - b);
  const intervals = [];
  let cursor = start;
  for (const y of excluded) {
    if (cursor <= y - 1) intervals.push(`${cursor}..${y - 1}`);
    cursor = y + 1;
  }
  if (cursor <= end) intervals.push(`${cursor}..${end}`);
  return {
    text: intervals.length > 0 ? intervals.join(',') : '-',
    count: end - start + 1 - excluded.length,
    excluded: excluded.length,
  };
}

function byColumn(cells) {
  const result = new Map();
  for (const { x, y, z } of uniqueCells(cells)) {
    const key = columnKey(x, z);
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(y);
  }
  for (const values of result.values()) values.sort((a, b) => a - b);
  return result;
}

async function stateAudit(reader, cells) {
  const observed = [];
  const materialCounts = new Map();
  const familyCounts = { water: 0, lava: 0, frozen: 0, snow: 0 };
  let airCellCount = 0;
  for (const cell of uniqueCells(cells)) {
    const state = await reader.state(cell.x, cell.y, cell.z);
    observed.push({ ...cell, state });
    const name = state.Name ?? 'minecraft:air';
    materialCounts.set(name, (materialCounts.get(name) ?? 0) + 1);
    if (AIR.has(name)) airCellCount += 1;
    const family = familyForName(name);
    if (family !== 'other') familyCounts[family] += 1;
  }
  return {
    status: 'PASS_EXACT_IMMUTABLE_SNAPSHOT_CENSUS_NOT_A_SOURCE_GUARD',
    ...cellSet(observed),
    blockStateSetSha256: stateHash(observed),
    airCellCount,
    presentCellCount: observed.length - airCellCount,
    hydrologyAndCryosphereCellCounts: familyCounts,
    materialCounts: sortedCounts(materialCounts),
  };
}

const sources = Object.fromEntries(
  Object.entries(INPUTS).map(([key, relativePath]) => [key, binding(relativePath)]),
);
const coordinates = readJson(INPUTS.coordinateRegistry);
const geometry = readJson(INPUTS.geometryCoordination);
const d05 = readJson(INPUTS.d05HydrologyBaseline);
const defaults = readJson(INPUTS.d05ConservativeDefaults);
const s01 = readJson(INPUTS.d05RelicConditionAccess);
const s02 = readJson(INPUTS.d05FutureStateContract);
const d06 = readJson(INPUTS.d06EgressGeometry);
const connector = readJson(INPUTS.connectorGeometry);

invariant(geometry.id === 'combined-zones-phase1-geometry-coordination',
  'unexpected geometry coordination');
invariant(geometry.coordinateContract?.vertical?.activeForBuild === false,
  'vertical coordination unexpectedly activated for build');
invariant(d05.sourceBindings?.phase1GeometryCoordination?.sha256
  === sources.geometryCoordination.sha256, 'D05 baseline geometry binding is stale');
invariant(defaults.sourceBindings?.geometryCoordination?.sha256
  === sources.geometryCoordination.sha256, 'D05 defaults geometry binding is stale');
invariant(defaults.sourceBindings?.d05HydrologyRelicDesign?.sha256
  === sources.d05HydrologyBaseline.sha256, 'D05 defaults baseline binding is stale');
invariant(s01.sourceBindings?.d05ConservativeDefaults?.sha256
  === sources.d05ConservativeDefaults.sha256, 'D05-S01 default binding is stale');
invariant(s02.sourceBindings?.geometryCoordination?.sha256
  === sources.geometryCoordination.sha256, 'D05-S02 geometry binding is stale');
invariant(s02.sourceBindings?.d05HydrologyBaseline?.sha256
  === sources.d05HydrologyBaseline.sha256, 'D05-S02 baseline binding is stale');
invariant(s02.sourceBindings?.d05ConservativeDefaults?.sha256
  === sources.d05ConservativeDefaults.sha256, 'D05-S02 default binding is stale');
invariant(s02.sourceBindings?.d05RelicConditionAccess?.sha256
  === sources.d05RelicConditionAccess.sha256, 'D05-S02 survey binding is stale');
invariant(s02.sourceBindings?.d06EgressGeometry?.sha256
  === sources.d06EgressGeometry.sha256, 'D05-S02 D06 binding is stale');
invariant(connector.sourceBindings?.phase1Geometry?.sha256
  === sources.geometryCoordination.sha256, 'connector geometry binding is stale');
invariant(connector.sourceBindings?.d05Baseline?.sha256
  === sources.d05HydrologyBaseline.sha256, 'connector D05 binding is stale');
invariant(s02.readinessDisposition?.futureCellCount === 0
  && s02.readinessDisposition?.constructionCellCount === 0,
  'D05-S02 must remain zero-cell fail-closed');
invariant(connector.funicularFaceComparison?.faceSelection === null,
  'connector unexpectedly selected a B09 face');
invariant(d06.independenceProof?.exactExternalContinuationSetsDisjoint === true,
  'D06 reservations are not exact disjoint inputs');
invariant(d06.releaseBoundary?.physicalOpeningAuthorized === false,
  'D06 unexpectedly authorizes physical openings');

const snapshotPath = s01.sourceBindings?.immutablePhase0PostRegionSnapshot?.path;
invariant(snapshotPath, 'D05-S01 immutable snapshot path missing');
const immutableSnapshot = snapshotIdentity(path.resolve(ROOT, snapshotPath));
for (const [label, expected] of [
  ['D05 baseline', d05.sourceBindings?.immutablePhase0PostRegionSnapshot],
  ['D05-S01', s01.sourceBindings?.immutablePhase0PostRegionSnapshot],
  ['D05-S02', s02.sourceBindings?.immutablePhase0PostRegionSnapshot],
  ['D06', d06.immutableSnapshot],
  ['connector', connector.sourceBindings?.immutablePhase0PostSnapshot],
]) {
  invariant(immutableSnapshot.sha256 === expected?.sha256, `${label} snapshot hash mismatch`);
  invariant(immutableSnapshot.regionFileCount === expected?.regionFileCount,
    `${label} snapshot region count mismatch`);
  invariant(immutableSnapshot.bytes === expected?.bytes, `${label} snapshot byte count mismatch`);
}

const mountainCoordination = geometry.compiledCoordinationGeometry
  ?.normalized04EnvelopeCellSets?.find(({ id }) => id === 'continuous-mountain')
  ?.exactCoordinationCellSet;
invariant(mountainCoordination?.purpose
  === 'ownership-and-fit-coordination-only-not-a-material-or-operation-set',
  'continuous-mountain envelope was promoted to material geometry');
const mountainBounds = {
  minX: mountainCoordination.bounds.minXInclusive,
  maxX: mountainCoordination.bounds.maxXExclusive - 1,
  minY: mountainCoordination.bounds.minYInclusive,
  maxY: mountainCoordination.bounds.maxYExclusive - 1,
  minZ: mountainCoordination.bounds.minZInclusive,
  maxZ: mountainCoordination.bounds.maxZExclusive - 1,
};
invariant(mountainBounds.minX === 1648 && mountainBounds.maxX === 2447
  && mountainBounds.minY === 72 && mountainBounds.maxY === 303
  && mountainBounds.minZ === -1128 && mountainBounds.maxZ === -529,
  'unexpected mountain coordination bounds');

const relicExclusions = [];
const protectedRelicSummary = [];
for (const relic of defaults.soleAuthorityRecommendations.bufferPolicy.relics) {
  const core = cellsIn(relic.protectedCore.bounds);
  const expanded = cellsIn(relic.minimumPlanningExclusionShell.expandedBounds);
  const shell = difference(expanded, core);
  invariant(core.length === relic.protectedCore.cellCount
    && coordinateHash(core) === relic.protectedCore.coordinateSetSha256,
  `${relic.relicKey} protected-core drift`);
  invariant(shell.length === relic.minimumPlanningExclusionShell.cellCount
    && coordinateHash(shell) === relic.minimumPlanningExclusionShell.coordinateSetSha256,
  `${relic.relicKey} one-cell exclusion drift`);
  relicExclusions.push(...core, ...shell);
  protectedRelicSummary.push({
    relicKey: relic.relicKey,
    currentFinding: relic.currentFinding,
    disposition: relic.recommendedDisposition,
    protectedCore: relic.protectedCore,
    exactOneCellMinimumPlanningExclusion: relic.minimumPlanningExclusionShell,
    exactPreserveCurrentStateCellSet: cellSet([...core, ...shell]),
    futureRule: 'PRESERVE_EXACT_IMMUTABLE_CURRENT_STATE',
    engineeringQualification: relic.engineeringQualification,
    constructionOwnership: false,
    operationAuthorization: false,
  });
}
const exactRelicExclusions = uniqueCells(relicExclusions);
const exactRelicExclusionSet = new Set(exactRelicExclusions.map(cellKey));
const b08Interaction = buildB08Interaction(connector);

const d06Cells = d06.egressDesigns.map((design) => {
  const cells = cellsIn(design.externalContinuationDesign.bounds);
  invariant(cells.length === design.externalContinuationDesign.cellCount,
    `${design.id} D06 cell count drift`);
  invariant(coordinateHashWithoutFinalNewline(
    cells,
    'combined-zones-d06-egress-continuation-v1',
  ) === design.externalContinuationDesign.coordinateSetSha256,
    `${design.id} D06 coordinate hash drift`);
  return { id: design.id, cells, design };
});
const d06MountainIntersections = d06Cells.map(({ id, cells }) => ({
  id,
  intersection: cellSet(cells.filter((cell) => (
    cell.x >= mountainBounds.minX && cell.x <= mountainBounds.maxX
    && cell.y >= mountainBounds.minY && cell.y <= mountainBounds.maxY
    && cell.z >= mountainBounds.minZ && cell.z <= mountainBounds.maxZ
  ))),
}));
invariant(d06MountainIntersections.every(({ intersection }) => intersection.cellCount === 0),
  'D06 external continuation intersects the mountain coordination envelope');

const reader = new SnapshotReader(path.resolve(ROOT, snapshotPath));
const width = mountainBounds.maxX - mountainBounds.minX + 1;
const depth = mountainBounds.maxZ - mountainBounds.minZ + 1;
const currentSurfaceY = new Int16Array(width * depth);
const currentSurfaceFamily = new Uint8Array(width * depth);
const familyCodes = { other: 0, water: 1, lava: 2, frozen: 3, snow: 4 };
const currentSurfaceDigest = crypto.createHash('sha256');
currentSurfaceDigest.update(`${CURRENT_SURFACE_PREAMBLE}\n`);
const currentSurfaceMaterialCounts = new Map();
const currentSurfaceBiomeCounts = new Map();
let currentMinimumSurfaceY = Infinity;
let currentMaximumSurfaceY = -Infinity;
let currentSurfaceYTotal = 0;
for (let x = mountainBounds.minX; x <= mountainBounds.maxX; x += 1) {
  for (let z = mountainBounds.minZ; z <= mountainBounds.maxZ; z += 1) {
    const surface = await reader.surface(x, z);
    const index = (x - mountainBounds.minX) * depth + (z - mountainBounds.minZ);
    currentSurfaceY[index] = surface.y;
    currentSurfaceFamily[index] = familyCodes[familyForName(surface.state.Name)] ?? 0;
    currentMinimumSurfaceY = Math.min(currentMinimumSurfaceY, surface.y);
    currentMaximumSurfaceY = Math.max(currentMaximumSurfaceY, surface.y);
    currentSurfaceYTotal += surface.y;
    currentSurfaceMaterialCounts.set(
      surface.state.Name,
      (currentSurfaceMaterialCounts.get(surface.state.Name) ?? 0) + 1,
    );
    currentSurfaceBiomeCounts.set(
      surface.biome ?? 'null',
      (currentSurfaceBiomeCounts.get(surface.biome ?? 'null') ?? 0) + 1,
    );
    currentSurfaceDigest.update(
      `${x},${z}\t${surface.y}\t${canonicalState(surface.state)}\t${surface.biome ?? 'null'}\n`,
    );
  }
}

function surfaceAt(x, z) {
  invariant(x >= mountainBounds.minX && x <= mountainBounds.maxX
    && z >= mountainBounds.minZ && z <= mountainBounds.maxZ,
  `surface lookup outside mountain bounds at ${x},${z}`);
  const index = (x - mountainBounds.minX) * depth + (z - mountainBounds.minZ);
  return {
    y: currentSurfaceY[index],
    familyCode: currentSurfaceFamily[index],
  };
}

const modelDefinitions = [
  {
    id: 'FM-00-FULL-ENVELOPE-REFERENCE',
    label: 'Full coordination-envelope rational mountain reference',
    classification: 'REFERENCE_NOT_FACE_SELECTABLE',
    center: { x: 2048, z: -828 },
    extents: { west: 400, east: 399, north: 300, south: 299 },
    face: null,
  },
  {
    id: 'FM-01-COMPACT-EAST-FACE',
    label: 'Compact east-face rational mountain',
    classification: 'COMPARABLE_CONSERVATIVE_PLANNING_ALTERNATIVE',
    center: { x: 2048, z: -828 },
    extents: { west: 100, east: 320, north: 240, south: 240 },
    face: 'east',
  },
  {
    id: 'FM-02-COMPACT-WEST-FACE',
    label: 'Compact west-face rational mountain',
    classification: 'COMPARABLE_CONSERVATIVE_PLANNING_ALTERNATIVE',
    center: { x: 2048, z: -828 },
    extents: { west: 320, east: 100, north: 240, south: 240 },
    face: 'west',
  },
].map((model) => ({
  ...model,
  baseSurfaceY: MOUNTAIN_BASE_SURFACE_Y,
  peakSurfaceY: MOUNTAIN_PEAK_SURFACE_Y,
}));

const connectorProfiles = Object.fromEntries(
  connector.funicularFaceComparison.candidates.map((profile) => [
    profile.id.startsWith('east') ? 'east' : 'west',
    profile,
  ]),
);
const alternatives = [];
for (const model of modelDefinitions) {
  const route = model.face
    ? buildFunicularRoute(model, model.face, connector.funicularFaceComparison.designEndpoints)
    : null;
  if (route) {
    route.immutableSourceCensus = await stateAudit(reader, route._reservation);
    route.protectedRelicPlanningExclusionIntersection = cellSet(
      route._reservation.filter((cell) => exactRelicExclusionSet.has(cellKey(cell))),
    );
    route.b08PlanningInterfaceIntersection = cellSet(
      setIntersection(route._reservation, b08Interaction),
    );
    route.d06ExternalContinuationIntersection = cellSet(
      setIntersection(route._reservation, d06Cells.flatMap(({ cells }) => cells)),
    );
    invariant(route.protectedRelicPlanningExclusionIntersection.cellCount === 0,
      `${model.id} B09 route intersects a protected relic planning exclusion`);
    invariant(route.d06ExternalContinuationIntersection.cellCount === 0,
      `${model.id} B09 route intersects D06 external continuation`);
  }
  const b09Reservation = route?._reservation ?? [];
  const allNoFill = setUnion(exactRelicExclusions, b08Interaction, b09Reservation);
  const noFillByColumn = byColumn(allNoFill);
  const protectedByColumn = byColumn(exactRelicExclusions);
  const b08ByColumn = byColumn(b08Interaction);
  const b09ByColumn = byColumn(b09Reservation);
  const surfaceDigest = crypto.createHash('sha256');
  surfaceDigest.update(`${DESIGN_SURFACE_PREAMBLE}\n`);
  const solidDigest = crypto.createHash('sha256');
  solidDigest.update(`${SPARSE_SOLID_PREAMBLE}\n`);
  const supportDigest = crypto.createHash('sha256');
  supportDigest.update(`${SUPPORT_GAP_PREAMBLE}\n`);
  let directlyModelledColumnCount = 0;
  let raisedColumnCount = 0;
  let rawAddedSolidCellCount = 0;
  let candidateAddedSolidCellCount = 0;
  let protectedRelicWithheldFillCellCount = 0;
  let b08WithheldFillCellCount = 0;
  let b09WithheldFillCellCount = 0;
  let supportGapCellCount = 0;
  let supportGapColumnCount = 0;
  let minimumDesignSurfaceY = Infinity;
  let maximumDesignSurfaceY = -Infinity;
  const adjacentFamilyCounts = { water: 0, lava: 0, frozen: 0, snow: 0 };
  for (let x = model.center.x - model.extents.west;
    x <= model.center.x + model.extents.east; x += 1) {
    for (let z = model.center.z - model.extents.north;
      z <= model.center.z + model.extents.south; z += 1) {
      const designY = mountainSurface(x, z, model);
      invariant(designY !== null, `${model.id} missing an in-footprint design surface`);
      const current = surfaceAt(x, z);
      directlyModelledColumnCount += 1;
      minimumDesignSurfaceY = Math.min(minimumDesignSurfaceY, designY);
      maximumDesignSurfaceY = Math.max(maximumDesignSurfaceY, designY);
      surfaceDigest.update(`${x},${z}\t${designY}\n`);
      const rawStart = current.y + 1;
      const rawEnd = designY;
      if (rawStart <= rawEnd) {
        raisedColumnCount += 1;
        rawAddedSolidCellCount += rawEnd - rawStart + 1;
        const family = Object.entries(familyCodes)
          .find(([, code]) => code === current.familyCode)?.[0] ?? 'other';
        if (family !== 'other') adjacentFamilyCounts[family] += 1;
      }
      const supportEnd = Math.min(rawEnd, MOUNTAIN_ADDED_SOLID_MIN_Y - 1);
      if (rawStart <= supportEnd) {
        const count = supportEnd - rawStart + 1;
        supportGapCellCount += count;
        supportGapColumnCount += 1;
        supportDigest.update(`${x},${z}\t${rawStart}..${supportEnd}\n`);
      }
      const fillStart = Math.max(rawStart, MOUNTAIN_ADDED_SOLID_MIN_Y);
      const allIntervals = intervalText(
        fillStart,
        rawEnd,
        noFillByColumn.get(columnKey(x, z)) ?? [],
      );
      const protectedIntervals = intervalText(
        fillStart,
        rawEnd,
        protectedByColumn.get(columnKey(x, z)) ?? [],
      );
      const b08Intervals = intervalText(
        fillStart,
        rawEnd,
        b08ByColumn.get(columnKey(x, z)) ?? [],
      );
      const b09Intervals = intervalText(
        fillStart,
        rawEnd,
        b09ByColumn.get(columnKey(x, z)) ?? [],
      );
      candidateAddedSolidCellCount += allIntervals.count;
      protectedRelicWithheldFillCellCount += protectedIntervals.excluded;
      b08WithheldFillCellCount += b08Intervals.excluded;
      b09WithheldFillCellCount += b09Intervals.excluded;
      solidDigest.update(
        `${x},${z}\tcurrent=${current.y}\tdesign=${designY}\tadd=${allIntervals.text}\n`,
      );
    }
  }
  const formula = {
    id: 'D05-DIRECTIONAL-RATIONAL-PYRAMID-V1',
    domain:
      'inclusive X/Z footprint defined by center and four directional extents; outside columns remain immutable-current',
    dominantRatio:
      'max(abs(x-centerX)/directionalXExtent, abs(z-centerZ)/directionalZExtent), compared by exact cross multiplication',
    designSurfaceY:
      '71 + floor(232 * (denominator - numerator) / denominator)',
    directAddedSolidIntervals:
      'max(currentSurfaceY+1,72)..designSurfaceY minus exact relic, B08 interaction, and candidate B09 planning-reservation cells',
    supportGapRule:
      'any candidate support below Y=72 is counted and held; it is not silently filled outside the coordination envelope',
    currentStateRule:
      'all immutable current cells remain unchanged except that exact route cells may be future-passable planning reservations; no canonical block state is assigned here',
    center: model.center,
    extents: model.extents,
    baseSurfaceY: model.baseSurfaceY,
    peakSurfaceY: model.peakSurfaceY,
  };
  const geometry = {
    modelId: model.id,
    label: model.label,
    classification: model.classification,
    face: model.face,
    status: 'PASS_EXACT_PLANNING_GEOMETRY_MATERIAL_HYDROLOGY_OWNERSHIP_HOLD',
    formula,
    formulaSha256: sha256(JSON.stringify(formula)),
    directlyModelledColumnCount,
    designSurface: {
      minimumY: minimumDesignSurfaceY,
      maximumY: maximumDesignSurfaceY,
      columnManifestSha256: surfaceDigest.digest('hex'),
    },
    sparseAddedSolidIntervals: {
      status: 'EXACT_UNMATERIALIZED_PLANNING_INTERVALS_NOT_CONSTRUCTION_CELLS',
      preamble: `${SPARSE_SOLID_PREAMBLE}\\n`,
      record: 'x,z<TAB>current=Y<TAB>design=Y<TAB>add=start..end[,start..end] or -',
      raisedColumnCount,
      rawAddedSolidCellCount,
      candidateAddedSolidCellCount,
      protectedRelicWithheldFillCellCount,
      b08WithheldFillCellCount,
      b09WithheldFillCellCount,
      intervalManifestSha256: solidDigest.digest('hex'),
      canonicalMaterialState: null,
      constructionOwnership: false,
      operationAuthorization: false,
    },
    belowCoordinationSupportGap: {
      status: supportGapCellCount === 0 ? 'PASS_NONE' : 'HOLD_EXACT_UNSUPPORTED_BELOW_Y72',
      columnCount: supportGapColumnCount,
      cellCount: supportGapCellCount,
      intervalManifestSha256: supportDigest.digest('hex'),
      treatment: null,
      reason:
        'The coordination envelope begins at Y=72. A future solid may not silently fill lower air/water/terrain gaps without geotechnical, hydrology, ownership, and scope authority.',
    },
    exactCurrentSurfaceAdjacency: {
      raisedColumnSurfaceFamilyCounts: adjacentFamilyCounts,
      qualification:
        'Exact current top-cell adjacency only; it is not a groundwater, infiltration, snowmelt, erosion, or drainage influence model.',
    },
    routeAccommodation: {
      b08ServiceTunnelInteractionReservation: {
        status: 'EXACT_BOUND_REFERENCE_NO_OWNERSHIP',
        ...connector.serviceTunnelCenterline.exactCellSets.interactionUnion,
      },
      b09Funicular: route ? Object.fromEntries(
        Object.entries(route).filter(([key]) => !key.startsWith('_')),
      ) : {
        status: 'NOT_INCLUDED_FULL_ENVELOPE_REFERENCE_HAS_NO_FACE_SELECTION',
      },
      d06ExternalContinuations: d06MountainIntersections,
    },
    protectedRelicVoidAccommodation: {
      status: 'PASS_EXACT_CURRENT_STATE_PRESERVATION_PLANNING_EXCLUSIONS',
      exclusionCellCount: exactRelicExclusions.length,
      exclusionCoordinateSetSha256: coordinateHash(exactRelicExclusions),
      futureRule: 'PRESERVE_EXACT_IMMUTABLE_CURRENT_STATE',
      qualification:
        'The exact core plus one-cell shell is a minimum planning exclusion only. It is not an engineering, structural, groundwater, entrance, exhibit, or construction-influence buffer.',
    },
  };
  geometry.modelIdentitySha256 = sha256(JSON.stringify({
    formulaSha256: geometry.formulaSha256,
    designSurfaceSha256: geometry.designSurface.columnManifestSha256,
    sparseAddedSolidSha256: geometry.sparseAddedSolidIntervals.intervalManifestSha256,
    supportGapSha256: geometry.belowCoordinationSupportGap.intervalManifestSha256,
    relicExclusionSha256:
      geometry.protectedRelicVoidAccommodation.exclusionCoordinateSetSha256,
    b08ReservationSha256:
      geometry.routeAccommodation.b08ServiceTunnelInteractionReservation.coordinateSetSha256,
    b09ReservationSha256: route?.minimumPlanningAccommodation.coordinateSetSha256 ?? null,
  }));
  alternatives.push(geometry);
  if (route) {
    delete route._points;
    delete route._reservation;
  }
}

const comparableAlternatives = alternatives.filter(({ face }) => face !== null);
function profileScore(alternative) {
  const profile = connectorProfiles[alternative.face];
  return {
    modelId: alternative.modelId,
    protectedRouteIntersectionCellCount:
      alternative.routeAccommodation.b09Funicular
        .protectedRelicPlanningExclusionIntersection.cellCount,
    d06RouteIntersectionCellCount:
      alternative.routeAccommodation.b09Funicular.d06ExternalContinuationIntersection.cellCount,
    b08PortalInterfaceCellCount:
      alternative.routeAccommodation.b09Funicular.b08PlanningInterfaceIntersection.cellCount,
    supportGapCellCount: alternative.belowCoordinationSupportGap.cellCount,
    candidateAddedSolidCellCount:
      alternative.sparseAddedSolidIntervals.candidateAddedSolidCellCount,
    routeHydrologyCryosphereCellCount: Object.values(
      alternative.routeAccommodation.b09Funicular.immutableSourceCensus
        .hydrologyAndCryosphereCellCounts,
    ).reduce((sum, count) => sum + count, 0),
    currentFaceMaximumAdjacentStep: profile.currentSurface.maximumAdjacentStep,
    currentFaceGeneratedStructurePlanColumnCount: profile.generatedStructurePlanIntersections
      .reduce((sum, item) => sum + item.intersectingColumnCount, 0),
    currentFaceMeanSurfaceY: profile.currentSurface.meanY,
  };
}
const comparisonScores = comparableAlternatives.map(profileScore);
const orderedScores = [...comparisonScores].sort((left, right) => (
  left.protectedRouteIntersectionCellCount - right.protectedRouteIntersectionCellCount
  || left.d06RouteIntersectionCellCount - right.d06RouteIntersectionCellCount
  || left.b08PortalInterfaceCellCount - right.b08PortalInterfaceCellCount
  || left.supportGapCellCount - right.supportGapCellCount
  || left.candidateAddedSolidCellCount - right.candidateAddedSolidCellCount
  || left.routeHydrologyCryosphereCellCount - right.routeHydrologyCryosphereCellCount
  || left.currentFaceMaximumAdjacentStep - right.currentFaceMaximumAdjacentStep
  || left.currentFaceGeneratedStructurePlanColumnCount
    - right.currentFaceGeneratedStructurePlanColumnCount
  || right.currentFaceMeanSurfaceY - left.currentFaceMeanSurfaceY
  || left.modelId.localeCompare(right.modelId)
));
const recommendation = orderedScores[0];
const recommendationJustified = recommendation.protectedRouteIntersectionCellCount === 0
  && recommendation.d06RouteIntersectionCellCount === 0
  && recommendation.b08PortalInterfaceCellCount > 0;
const recommendedAlternativeId = recommendationJustified ? recommendation.modelId : null;

const readinessChecks = [
  {
    id: 'D05-B09-B10-R01-EXACT-SOURCE-CHAIN',
    status: 'PASS',
    result: 'All permitted upstream geometry/D05/D06/connector inputs and the immutable snapshot are hash-bound.',
  },
  {
    id: 'D05-B09-B10-R02-DETERMINISTIC-SURFACE-AND-SPARSE-SOLID',
    status: alternatives.every((item) => item.designSurface.columnManifestSha256
      && item.sparseAddedSolidIntervals.intervalManifestSha256) ? 'PASS' : 'HOLD',
    result: `${alternatives.length} exact analytic surfaces and sparse interval manifests compiled.`,
  },
  {
    id: 'D05-B09-B10-R03-PROTECTED-RELIC-VOID-ACCOMMODATION',
    status: 'PASS',
    result: `${exactRelicExclusions.length} exact core-plus-one-cell-shell current-state preservation cells are excluded from candidate fill.`,
  },
  {
    id: 'D05-B09-B10-R04-B09-RAIL-BUILDABLE-CANDIDATES',
    status: comparableAlternatives.every((item) => (
      item.routeAccommodation.b09Funicular.everyStepCardinalAndRailBuildable
      && item.routeAccommodation.b09Funicular.everyCurveLevel
    )) ? 'PASS' : 'HOLD',
    result: 'East and west compact face candidates have exact cardinal <=1:1 centerlines and level curves.',
  },
  {
    id: 'D05-B09-B10-R05-B08-D06-ACCOMMODATION',
    status: d06MountainIntersections.every(({ intersection }) => intersection.cellCount === 0)
      ? 'PASS' : 'HOLD',
    result: 'The exact B08 interaction set is withheld from candidate fill; both D06 external continuations are disjoint from Z09.',
  },
  {
    id: 'D05-B09-B10-R06-CONSERVATIVE-PLANNING-RECOMMENDATION',
    status: recommendationJustified ? 'PASS_RECOMMENDATION_ONLY' : 'HOLD',
    result: recommendedAlternativeId
      ? `${recommendedAlternativeId} ranks first by the frozen fail-closed comparison order.`
      : 'No alternative clears the exact no-conflict prerequisites.',
  },
  {
    id: 'D05-B09-B10-R07-SUPPORT-GEOTECHNICAL-HYDROLOGY',
    status: 'HOLD',
    result: 'Below-Y72 support gaps, expert hydrology/geotechnical kernels, treatment classes, and acceptance thresholds remain unresolved.',
  },
  {
    id: 'D05-B09-B10-R08-OWNERSHIP-INTERFACES-MATERIAL-STATES',
    status: 'HOLD',
    result: 'No exact owner registry, directional interface contracts, accepted material palette, or complete canonical future-state registry exists.',
  },
  {
    id: 'D05-B09-B10-R09-B09-MAINTENANCE-EGRESS-ACCEPTANCE',
    status: 'HOLD',
    result: 'The one-cell route shell is planning accommodation only; maintenance, evacuation, stations, passing loop, mechanisms, and human acceptance remain absent.',
  },
  {
    id: 'D05-B09-B10-R10-D05-G02-CLOSURE',
    status: 'HOLD',
    result: 'Planning geometry cannot close B09, B10, D05, or G02 without the remaining accepted expert and authority inputs.',
  },
];

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-d05-future-mountain-alternatives',
  generatedAtUtc: GENERATED_AT,
  status: 'PARTIAL_PASS_EXACT_FUTURE_MOUNTAIN_ALTERNATIVES_RECOMMENDATION_ONLY_D05_G02_HOLD',
  worldEditAuthorized: false,
  constructionOwnershipAuthorized: false,
  futureStateAuthorized: false,
  executable: false,
  operationCellCount: 0,
  materialCellCount: 0,
  futureCellCount: 0,
  constructionCellCount: 0,
  sourceBindings: {
    ...sources,
    immutablePhase0PostRegionSnapshot: immutableSnapshot,
  },
  authorityBoundary: {
    permittedInputs:
      'reconciled Phase 1 geometry, D05 baseline/defaults/S01/S02, D06 reservations, connector geometry/profiles, coordinates, and immutable copied snapshot',
    excludedInputs: [
      'autonomous selections and R00 gate state',
      'unbound hydrology/geotechnical assumptions or generic influence radii',
      'owner acceptance, interface acceptance, material acceptance, operations, preflight, execution, rollback, or post-state evidence',
    ],
    interpretation:
      'Nonzero counts below are candidate planning geometry. They are not S02 future/construction cells, material quantities, ownership assignments, or operations.',
  },
  immutableCurrentSurface: {
    bounds: {
      minX: mountainBounds.minX,
      maxX: mountainBounds.maxX,
      minZ: mountainBounds.minZ,
      maxZ: mountainBounds.maxZ,
    },
    columnCount: width * depth,
    minimumY: currentMinimumSurfaceY,
    maximumY: currentMaximumSurfaceY,
    meanY: Number((currentSurfaceYTotal / (width * depth)).toFixed(6)),
    manifestSha256: currentSurfaceDigest.digest('hex'),
    materialCounts: sortedCounts(currentSurfaceMaterialCounts),
    biomeCounts: sortedCounts(currentSurfaceBiomeCounts),
  },
  deterministicContracts: {
    coordinateOrder: 'numeric x, then y, then z',
    columnOrder: 'numeric x, then z',
    currentSurfaceManifest: {
      preamble: `${CURRENT_SURFACE_PREAMBLE}\\n`,
      record: 'x,z<TAB>surfaceY<TAB>canonical-state-json<TAB>biome-or-null',
    },
    designSurfaceManifest: {
      preamble: `${DESIGN_SURFACE_PREAMBLE}\\n`,
      record: 'x,z<TAB>designSurfaceY',
    },
    sparseSolidIntervalManifest: {
      preamble: `${SPARSE_SOLID_PREAMBLE}\\n`,
      record: 'x,z<TAB>current=Y<TAB>design=Y<TAB>add=start..end[,start..end] or -',
    },
    supportGapManifest: {
      preamble: `${SUPPORT_GAP_PREAMBLE}\\n`,
      record: 'x,z<TAB>startY..endY',
    },
    hashing: 'SHA-256 over UTF-8 bytes with the exact preamble and newline-terminated records',
  },
  protectedRelicVoidPolicy: {
    policyId: 'CZ05-RELIC-MINIMUM-PLANNING-EXCLUSION-V1',
    status: 'EXACT_MINIMUM_PLANNING_EXCLUSIONS_NOT_ENGINEERING_BUFFERS',
    union: cellSet(exactRelicExclusions),
    relics: protectedRelicSummary,
    automaticObservationRoutePromotion: false,
    reconstructionAuthorized: false,
    relocationAuthorized: false,
    removalAuthorized: false,
  },
  routeAndEgressBoundary: {
    b08ServiceTunnelInteraction: {
      ...connector.serviceTunnelCenterline.exactCellSets.interactionUnion,
      status: 'EXACT_REFERENCE_WITHHELD_FROM_CANDIDATE_FILL_NO_OWNERSHIP',
    },
    d06ExternalContinuations: d06Cells.map(({ id, design }) => ({
      id,
      ...design.externalContinuationDesign,
      mountainCoordinationIntersectionCellCount: 0,
      physicalOpeningAuthorized: design.designGate.physicalOpeningAuthorized,
      mechanismCommissioned: design.designGate.mechanismCommissioned,
    })),
    unresolved:
      'B09 maintenance/egress, passing loop, station throats, mechanism cells, barriers, drainage, fire service, and accepted owner interfaces remain HOLD.',
  },
  alternatives,
  b09FaceComparison: {
    inheritedImmutableProfiles: ['east', 'west'].map((face) => {
      const profile = connectorProfiles[face];
      return {
        face,
        profileId: profile.id,
        orderedSurfaceProfileSha256: profile.orderedSurfaceProfileSha256,
        horizontalStepCount: profile.horizontalStepCount,
        currentSurface: profile.currentSurface,
        generatedStructurePlanIntersectionColumnCount:
          profile.generatedStructurePlanIntersections.reduce(
            (sum, item) => sum + item.intersectingColumnCount,
            0,
          ),
        protectedRelicPlanIntersections: profile.protectedRelicPlanIntersections,
      };
    }),
    frozenComparisonOrder: [
      'zero protected-route intersections',
      'zero D06-route intersections',
      'smallest nonzero exact B08 portal-interface overlap',
      'fewest below-Y72 support-gap cells',
      'fewest candidate added-solid cells',
      'fewest current route hydrology/cryosphere cells',
      'lowest inherited face maximum adjacent terrain step',
      'fewest inherited generated-structure plan-intersection columns',
      'highest inherited mean current surface Y',
      'lexicographic model ID tie-break',
    ],
    scores: comparisonScores,
    recommendedAlternativeId,
    selectedAlternativeId: null,
    recommendationStatus: recommendationJustified
      ? 'RECOMMENDED_FOR_NEXT_PLANNING_REVIEW_NOT_ACCEPTED_OR_AUTHORIZED'
      : 'NO_RECOMMENDATION_HOLD',
    rationale: recommendationJustified
      ? 'The recommendation is deterministic under the published comparison order, clears exact relic/D06 route conflicts, and retains a nonzero exact B08 portal interface with less overlap than the other compact face. It remains a planning recommendation because support, hydrology, geotechnical, ownership, interfaces, materials, maintenance/egress, and human acceptance are absent.'
      : 'At least one exact no-conflict prerequisite failed, so no face is recommended.',
  },
  readinessChecks,
  disposition: {
    exactPlanningAlternativesCompiled: true,
    exactB09FaceCandidatesCompiled: true,
    planningRecommendationAvailable: recommendedAlternativeId !== null,
    recommendationAccepted: false,
    b09Closed: false,
    b10Closed: false,
    d05Resolved: false,
    g02Passed: false,
    g03Passed: false,
    g04Passed: false,
    g05Passed: false,
    g06Passed: false,
    g07Passed: false,
    futureStateAuthorized: false,
    constructionOwnershipAuthorized: false,
    worldEditAuthorized: false,
    operationCellCount: 0,
    materialCellCount: 0,
    futureCellCount: 0,
    constructionCellCount: 0,
  },
};

function markdownFor(current) {
  const alternativeRows = current.alternatives.map((alternative) => (
    `| ${alternative.modelId} | ${alternative.face ?? 'none'} | ${alternative.directlyModelledColumnCount.toLocaleString()} | ${alternative.sparseAddedSolidIntervals.candidateAddedSolidCellCount.toLocaleString()} | ${alternative.belowCoordinationSupportGap.cellCount.toLocaleString()} | ${alternative.routeAccommodation.b09Funicular.pointCount ?? '—'} |`
  )).join('\n');
  const scoreRows = current.b09FaceComparison.scores.map((score) => (
    `| ${score.modelId} | ${score.b08PortalInterfaceCellCount} | ${score.supportGapCellCount.toLocaleString()} | ${score.candidateAddedSolidCellCount.toLocaleString()} | ${score.routeHydrologyCryosphereCellCount} | ${score.currentFaceMaximumAdjacentStep} | ${score.currentFaceGeneratedStructurePlanColumnCount} | ${score.currentFaceMeanSurfaceY} |`
  )).join('\n');
  const relicRows = current.protectedRelicVoidPolicy.relics.map((relic) => (
    `| ${relic.relicKey} | ${relic.protectedCore.cellCount} | ${relic.exactOneCellMinimumPlanningExclusion.cellCount} | ${relic.exactPreserveCurrentStateCellSet.cellCount} | ${relic.futureRule} |`
  )).join('\n');
  const readinessRows = current.readinessChecks.map((check) => (
    `| ${check.id} | **${check.status}** | ${check.result} |`
  )).join('\n');
  return `# D05 / B09 / B10 future-mountain planning alternatives

Status: **PARTIAL PASS — EXACT PLANNING ALTERNATIVES — D05 AND G02 HOLD**

This package compiles exact analytic mountain surfaces and sparse candidate-solid interval manifests against the immutable copied snapshot. It does not assign materials, owners, interfaces, hydrology or geotechnical kernels, construction cells, operations, or release authority.

## Alternatives

| Alternative | Face | Modelled columns | Candidate added-solid cells | Below-Y72 support-gap cells | B09 centerline points |
|---|---|---:|---:|---:|---:|
${alternativeRows}

The full-envelope model is a comparison reference and does not choose a B09 face. The compact east and west models have equal authored plan dimensions and exact directional-rational surfaces. Their nonzero geometry counts are planning candidates, not material quantities or S02-emitted cells.

## B09 face comparison

| Alternative | B08 interface | Support gaps | Candidate solid | Route fluid/frozen/snow | Current max terrain step | Structure-plan columns | Current mean Y |
|---|---:|---:|---:|---:|---:|---:|---:|
${scoreRows}

Recommended for the next planning review: **${current.b09FaceComparison.recommendedAlternativeId ?? 'none'}**.

This is not an accepted selection. The comparison is deterministic and exact, but the one-cell route shell is not maintenance or evacuation clearance, and no owner/interface, material, mechanism, hydrology, or geotechnical acceptance exists.

## Protected relic voids

| Relic | Core cells | One-cell shell | Exact preserved union | Future rule |
|---|---:|---:|---:|---|
${relicRows}

The shell is exactly one Chebyshev cell beyond the recorded core. It is the minimum planning exclusion only—not a structural, groundwater, entrance, exhibit, fall, or construction-influence buffer. D05-S01 observation routes are not promoted.

## Route and egress accommodation

- The exact B08 interaction reservation is withheld from candidate mountain fill.
- Each compact B09 alternative has a cardinal, rail-buildable centerline with level curves and an exact two-cell rail/headroom seed plus one-cell planning shell.
- Both D06 external continuations have zero cells inside Z09 and remain physically unopened and uncommissioned.
- B09 maintenance/egress, passing loop, stations, mechanisms, drainage, fire service, and owner interfaces remain HOLD.

## Readiness

| Check | Status | Result |
|---|---|---|
${readinessRows}

D05, B09, B10, and G02 remain HOLD. Future, construction, material, and operation cell counts remain **0**, and world editing remains unauthorized.

Reproduce offline with:

\`\`\`bash
node --max-old-space-size=4096 scripts/compile_combined_zones_d05_future_mountain_alternatives.mjs
\`\`\`
`;
}

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdownFor(report));

console.log(JSON.stringify({
  status: report.status,
  recommendedAlternativeId,
  alternatives: alternatives.map((item) => ({
    id: item.modelId,
    columns: item.directlyModelledColumnCount,
    candidateAddedSolidCells: item.sparseAddedSolidIntervals.candidateAddedSolidCellCount,
    supportGapCells: item.belowCoordinationSupportGap.cellCount,
    b09Points: item.routeAccommodation.b09Funicular.pointCount ?? 0,
  })),
  exactRelicExclusionCells: report.protectedRelicVoidPolicy.union.cellCount,
  futureCellCount: 0,
  constructionCellCount: 0,
  operationCellCount: 0,
  worldEditAuthorized: false,
  output: relative(OUTPUT),
  markdown: relative(MARKDOWN),
}, null, 2));
