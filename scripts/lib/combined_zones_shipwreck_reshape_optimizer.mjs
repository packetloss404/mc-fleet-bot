import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

import nbt from 'prismarine-nbt';

const WORLD_MIN_Y = -64;
const WORLD_MAX_Y = 319;
const ADDED_SOLID_MIN_Y = 72;
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const CELL_PREAMBLE = 'combined-zones-coordinate-cell-set-v1';
const COLUMN_PREAMBLE = 'combined-zones-shipwreck-reshape-no-build-columns-v1';
const DESIGN_PREAMBLE = 'combined-zones-d05-shipwreck-reshape-design-surface-v1';
const SOLID_PREAMBLE = 'combined-zones-d05-shipwreck-reshape-sparse-solid-intervals-v1';
const SUPPORT_PREAMBLE = 'combined-zones-d05-shipwreck-reshape-support-gap-intervals-v1';
const BASE_SOLID_PREAMBLE = 'combined-zones-d05-sparse-solid-intervals-v1';
const BASE_SUPPORT_PREAMBLE = 'combined-zones-d05-support-gap-intervals-v1';
const DOMAIN_INTERVAL_PREAMBLE =
  'combined-zones-residual-domain-sparse-integer-intervals-v1';

function invariant(condition, message) {
  if (!condition) throw new Error(`Shipwreck reshape optimizer rejected: ${message}`);
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
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
  return Number((longToBig(values[longIndex]) >> shift)
    & ((1n << BigInt(bits)) - 1n));
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
    if (this.chunks.size > 120) this.chunks.delete(this.chunks.keys().next().value);
    return result;
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
    let top = heightMap
      ? WORLD_MIN_Y + packedValue(heightMap, 9, columnIndex) - 1
      : WORLD_MAX_Y;
    top = Math.min(WORLD_MAX_Y, top);
    for (let y = top; y >= WORLD_MIN_Y; y -= 1) {
      const states = sections.get(Math.floor(y / 16))?.block_states;
      const index = ((y & 15) << 8) | ((z & 15) << 4) | (x & 15);
      const state = states?.palette?.length
        ? states.palette[paletteIndex(states, index, 4)] ?? { Name: 'minecraft:air' }
        : { Name: 'minecraft:air' };
      if (!AIR.has(state.Name)) {
        return {
          y,
          stateName: state.Name,
          biome: await this.biome(x, y, z),
        };
      }
    }
    return { y: WORLD_MIN_Y - 1, stateName: 'minecraft:air', biome: null };
  }
}

function readJson(root, filename) {
  return JSON.parse(fs.readFileSync(path.join(root, filename), 'utf8'));
}

function columnKey(x, z) {
  return `${x},${z}`;
}

function cellKey({ x, y, z }) {
  return `${x},${y},${z}`;
}

function compareCells(left, right) {
  return left.x - right.x || left.y - right.y || left.z - right.z;
}

function uniqueCells(cells) {
  const result = new Map();
  for (const cell of cells) result.set(cellKey(cell), cell);
  return [...result.values()].sort(compareCells);
}

function coordinateHash(cells) {
  const digest = crypto.createHash('sha256').update(`${CELL_PREAMBLE}\n`);
  for (const { x, y, z } of uniqueCells(cells)) digest.update(`${x},${y},${z}\n`);
  return digest.digest('hex');
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
  const expanded = [];
  for (const cell of uniqueCells(cells)) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dz = -radius; dz <= radius; dz += 1) {
          expanded.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
        }
      }
    }
  }
  return uniqueCells(expanded);
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
  return dilate(uniqueCells(excavation), 1);
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
    (model.peakSurfaceY - model.baseSurfaceY)
      * (denominator - numerator) / denominator,
  );
}

function buildB09Reservation(model, route) {
  const portal = route.from;
  const summit = route.to;
  let climbZ = portal.z - 1;
  while (climbZ > summit.z
    && mountainSurface(portal.x, climbZ - 1, model)
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
  invariant(points.at(-1).x === summit.x
    && points.at(-1).y === summit.y
    && points.at(-1).z === summit.z, 'B09 route misses summit');
  const railAndHeadroom = uniqueCells(points.flatMap(({ x, y, z }) => [
    { x, y, z },
    { x, y: y + 1, z },
  ]));
  return dilate(railAndHeadroom, 1);
}

function byColumn(cells) {
  const result = new Map();
  for (const { x, y, z } of uniqueCells(cells)) {
    const key = columnKey(x, z);
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(y);
  }
  for (const ys of result.values()) ys.sort((left, right) => left - right);
  return result;
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

function rangesFromStartEnd(start, end, excludedY = []) {
  if (start > end) return [];
  return subtractRanges(
    [{ start, end }],
    excludedY.map((y) => ({ start: y, end: y })),
  );
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
      const [x, z] = key.split(',').map(Number);
      addRanges(result, x, z, ranges);
    }
  }
  return result;
}

function faceShell(map) {
  const candidates = new Map();
  for (const [key, ranges] of map) {
    const [x, z] = key.split(',').map(Number);
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
    const [x, z] = key.split(',').map(Number);
    addRanges(result, x, z, subtractRanges(ranges, map.get(key) ?? []));
  }
  return result;
}

function mapHas(map, x, y, z) {
  return (map.get(columnKey(x, z)) ?? [])
    .some(({ start, end }) => y >= start && y <= end);
}

function mapStats(map, scopeId, domain) {
  const records = [...map.entries()].map(([key, ranges]) => {
    const [x, z] = key.split(',').map(Number);
    return { x, z, ranges: normalizeRanges(ranges) };
  }).sort((left, right) => left.x - right.x || left.z - right.z);
  const digest = crypto.createHash('sha256')
    .update(`${DOMAIN_INTERVAL_PREAMBLE}\n${scopeId}/${domain}\n`);
  let cellCount = 0;
  let intervalCount = 0;
  let bounds = null;
  for (const record of records) {
    if (record.ranges.length === 0) continue;
    digest.update(`${record.x},${record.z}\t${record.ranges
      .map(({ start, end }) => `${start}..${end}`).join(',')}\n`);
    intervalCount += record.ranges.length;
    cellCount += rangesCount(record.ranges);
    const minY = record.ranges[0].start;
    const maxY = record.ranges.at(-1).end;
    bounds = bounds
      ? {
          minX: Math.min(bounds.minX, record.x),
          maxX: Math.max(bounds.maxX, record.x),
          minY: Math.min(bounds.minY, minY),
          maxY: Math.max(bounds.maxY, maxY),
          minZ: Math.min(bounds.minZ, record.z),
          maxZ: Math.max(bounds.maxZ, record.z),
        }
      : {
          minX: record.x,
          maxX: record.x,
          minY,
          maxY,
          minZ: record.z,
          maxZ: record.z,
        };
  }
  return {
    cellCount,
    bounds,
    columnRecordCount: records.filter(({ ranges }) => ranges.length > 0).length,
    intervalCount,
    intervalManifestSha256: digest.digest('hex'),
  };
}

function inColumnBounds(bounds, x, z) {
  return x >= bounds.minX && x <= bounds.maxX
    && z >= bounds.minZ && z <= bounds.maxZ;
}

function removedCellCount(map, bounds) {
  let count = 0;
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
    for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
      count += rangesCount(map.get(columnKey(x, z)) ?? []);
    }
  }
  return count;
}

function columnIntersectionCount(cells, bounds) {
  return new Set(cells
    .filter(({ x, z }) => inColumnBounds(bounds, x, z))
    .map(({ x, z }) => columnKey(x, z))).size;
}

function overlapAgainstEnvelope(construction, support, noBuild, envelope) {
  const candidateHas = (map, x, y, z) => (
    !inColumnBounds(noBuild, x, z) && mapHas(map, x, y, z)
  );
  let constructionCount = 0;
  let interactionCount = 0;
  let supportCount = 0;
  let influenceCount = 0;
  for (let x = envelope.minX; x <= envelope.maxX; x += 1) {
    for (let y = envelope.minY; y <= envelope.maxY; y += 1) {
      for (let z = envelope.minZ; z <= envelope.maxZ; z += 1) {
        const isConstruction = candidateHas(construction, x, y, z);
        const isSupport = candidateHas(support, x, y, z);
        const isInteraction = !isConstruction && [
          [x - 1, y, z], [x + 1, y, z],
          [x, y - 1, z], [x, y + 1, z],
          [x, y, z - 1], [x, y, z + 1],
        ].some(([nx, ny, nz]) => candidateHas(construction, nx, ny, nz));
        if (isConstruction) constructionCount += 1;
        if (isInteraction) interactionCount += 1;
        if (isSupport) supportCount += 1;
        if (isInteraction || isSupport) influenceCount += 1;
      }
    }
  }
  return {
    constructionCellCount: constructionCount,
    interactionCellCount: interactionCount,
    supportGapCellCount: supportCount,
    influenceCellCount: influenceCount,
  };
}

function componentStats(map, noBuild = null) {
  const remaining = new Set([...map.keys()].filter((key) => {
    if (!noBuild) return true;
    const [x, z] = key.split(',').map(Number);
    return !inColumnBounds(noBuild, x, z);
  }));
  let componentCount = 0;
  let largestComponentColumnCount = 0;
  while (remaining.size > 0) {
    componentCount += 1;
    const first = remaining.values().next().value;
    remaining.delete(first);
    const queue = [first];
    let count = 0;
    for (let index = 0; index < queue.length; index += 1) {
      const key = queue[index];
      count += 1;
      const [x, z] = key.split(',').map(Number);
      for (const neighbor of [
        columnKey(x - 1, z), columnKey(x + 1, z),
        columnKey(x, z - 1), columnKey(x, z + 1),
      ]) {
        if (remaining.delete(neighbor)) queue.push(neighbor);
      }
    }
    largestComponentColumnCount = Math.max(largestComponentColumnCount, count);
  }
  return { componentCount, largestComponentColumnCount };
}

function filterMap(map, noBuild) {
  return new Map([...map.entries()].filter(([key]) => {
    const [x, z] = key.split(',').map(Number);
    return !inColumnBounds(noBuild, x, z);
  }));
}

function expandedBounds(bounds, margin) {
  return {
    minX: bounds.minX - margin,
    maxX: bounds.maxX + margin,
    minY: bounds.minY - margin,
    maxY: bounds.maxY + margin,
    minZ: bounds.minZ - margin,
    maxZ: bounds.maxZ + margin,
  };
}

function sortedCounts(map) {
  return Object.fromEntries([...map.entries()].sort(([left], [right]) => (
    left.localeCompare(right)
  )));
}

function surfaceSummary(currentSurface, bounds) {
  let minimumY = Infinity;
  let maximumY = -Infinity;
  let totalY = 0;
  let columnCount = 0;
  const materialCounts = new Map();
  const biomeCounts = new Map();
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
    for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
      const surface = currentSurface.get(columnKey(x, z));
      invariant(surface, `missing cached surface at ${x},${z}`);
      minimumY = Math.min(minimumY, surface.y);
      maximumY = Math.max(maximumY, surface.y);
      totalY += surface.y;
      columnCount += 1;
      materialCounts.set(surface.stateName, (materialCounts.get(surface.stateName) ?? 0) + 1);
      const biome = surface.biome ?? 'null';
      biomeCounts.set(biome, (biomeCounts.get(biome) ?? 0) + 1);
    }
  }
  return {
    columnCount,
    minimumSurfaceY: minimumY,
    maximumSurfaceY: maximumY,
    meanSurfaceY: Number((totalY / columnCount).toFixed(6)),
    surfaceMaterialCounts: sortedCounts(materialCounts),
    biomeCounts: sortedCounts(biomeCounts),
  };
}

function noBuildColumnIdentity(bounds) {
  const digest = crypto.createHash('sha256').update(`${COLUMN_PREAMBLE}\n`);
  let columnCount = 0;
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
    for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
      digest.update(`${x},${z}\n`);
      columnCount += 1;
    }
  }
  return { columnCount, columnSetSha256: digest.digest('hex') };
}

export async function compileShipwreckReshapeOptimization({ root, inputs }) {
  const d05 = readJson(root, inputs.d05FutureState);
  const defaults = readJson(root, inputs.d05ConservativeDefaults);
  const owner = readJson(root, inputs.d05OwnerAcceptance);
  const connector = readJson(root, inputs.connectorGeometry);
  const g03 = readJson(root, inputs.g03CanonicalSetout);
  const relicEvidence = readJson(root, inputs.protectedRelicClearance);
  const g06 = readJson(root, inputs.g06CompleteSaveScopeClearance);
  const completeSave = readJson(root, inputs.acceptedCompleteSaveIntake);
  const capture = readJson(root, inputs.completeSaveCapture);
  const p1b10 = g03.scopeRegistry.find(({ scopeId }) => scopeId === 'P1-B10');
  const shipwreck = relicEvidence.relics.find(({ key }) => key === 'shipwreck');
  const model = d05.selectedPlanningIdentity.formula;
  const mountainBounds = {
    minX: model.center.x - model.extents.west,
    maxX: model.center.x + model.extents.east,
    minZ: model.center.z - model.extents.north,
    maxZ: model.center.z + model.extents.south,
  };

  invariant(p1b10?.selectedIdentity === 'FM-01-COMPACT-EAST-FACE', 'FM-01 source drift');
  invariant(g06.completeSaveScopeEvidence?.projectScopeSourceEquivalent === true,
    'complete save is not project-scope source equivalent');
  invariant(completeSave.summary?.passed === true
    && completeSave.packageIdentity?.completeSaveSha256
      === '1d17c303b975d35cc01e2b46dcc9f6d78a9e4503b578a62c41ccadbd6df43f26',
  'accepted complete-save identity drift');
  invariant(capture.immutableCopy === true
    && capture.captureProtocol?.restorationAction === 'SAVE_ON_CONFIRMED'
    && completeSave.packageIdentity?.captureManifestSha256
      === sha256(fs.readFileSync(path.join(root, inputs.completeSaveCapture))),
  'complete-save capture manifest drift');

  const b08 = buildB08Interaction(connector);
  invariant(b08.length === connector.serviceTunnelCenterline.exactCellSets.interactionUnion.cellCount
    && coordinateHash(b08)
      === connector.serviceTunnelCenterline.exactCellSets.interactionUnion.coordinateSetSha256,
  'B08 interaction reconstruction drift');
  const b09 = buildB09Reservation(model, owner.b09B10SystemPlan.b09Route);
  invariant(b09.length === owner.b09B10SystemPlan.b09Route.minimumPlanningAccommodation.cellCount
    && coordinateHash(b09)
      === owner.b09B10SystemPlan.b09Route.minimumPlanningAccommodation.coordinateSetSha256,
  'B09 reservation reconstruction drift');
  const relicCells = defaults.soleAuthorityRecommendations.bufferPolicy.relics
    .flatMap((relic) => cellsIn(relic.minimumPlanningExclusionShell.expandedBounds));
  const noFillByColumn = byColumn(uniqueCells([...relicCells, ...b08, ...b09]));

  const snapshotDirectory = path.join(path.dirname(
    path.join(root, inputs.completeSaveCapture),
  ), 'region');
  const reader = new SnapshotReader(snapshotDirectory);
  const currentSurface = new Map();
  const construction = new Map();
  const support = new Map();
  const baseSolidDigest = crypto.createHash('sha256').update(`${BASE_SOLID_PREAMBLE}\n`);
  const baseSupportDigest = crypto.createHash('sha256').update(`${BASE_SUPPORT_PREAMBLE}\n`);
  let constructionCellCount = 0;
  let supportCellCount = 0;
  for (let x = mountainBounds.minX; x <= mountainBounds.maxX; x += 1) {
    for (let z = mountainBounds.minZ; z <= mountainBounds.maxZ; z += 1) {
      const surface = await reader.surface(x, z);
      currentSurface.set(columnKey(x, z), surface);
      const designY = mountainSurface(x, z, model);
      const rawStart = surface.y + 1;
      const supportEnd = Math.min(designY, ADDED_SOLID_MIN_Y - 1);
      if (rawStart <= supportEnd) {
        addRanges(support, x, z, [{ start: rawStart, end: supportEnd }]);
        supportCellCount += supportEnd - rawStart + 1;
        baseSupportDigest.update(`${x},${z}\t${rawStart}..${supportEnd}\n`);
      }
      const candidate = rangesFromStartEnd(
        Math.max(rawStart, ADDED_SOLID_MIN_Y),
        designY,
        noFillByColumn.get(columnKey(x, z)) ?? [],
      );
      addRanges(construction, x, z, candidate);
      constructionCellCount += rangesCount(candidate);
      baseSolidDigest.update(
        `${x},${z}\tcurrent=${surface.y}\tdesign=${designY}\tadd=${candidate.length
          ? candidate.map(({ start, end }) => `${start}..${end}`).join(',')
          : '-'}\n`,
      );
    }
  }

  invariant(constructionCellCount === p1b10.construction.cellCount
    && baseSolidDigest.digest('hex')
      === p1b10.construction.sparseIntervals.intervalManifestSha256,
  'complete-save construction reproduction drift');
  invariant(supportCellCount === p1b10.exactSupportGapEvidence.cellCount
    && baseSupportDigest.digest('hex')
      === p1b10.exactSupportGapEvidence.intervalManifestSha256,
  'complete-save support reproduction drift');
  const baseInteraction = faceShell(construction);
  const baseInfluence = unionIntervalMaps(baseInteraction, support);
  const baseInteractionStats = mapStats(baseInteraction, 'P1-B10', 'interaction');
  const baseInfluenceStats = mapStats(baseInfluence, 'P1-B10', 'influence');
  invariant(baseInteractionStats.cellCount === p1b10.interaction.cellCount
    && baseInteractionStats.intervalManifestSha256
      === p1b10.interaction.sparseIntervals.intervalManifestSha256,
  'complete-save interaction reproduction drift');
  invariant(baseInfluenceStats.cellCount === p1b10.influence.cellCount
    && baseInfluenceStats.intervalManifestSha256
      === p1b10.influence.sparseIntervals.intervalManifestSha256,
  'complete-save influence reproduction drift');
  const baseComponents = componentStats(construction);

  const core = shipwreck.declaredInclusiveBounds;
  const margins = [1, 2, 3, 4];
  const strategies = [
    {
      id: 'LOCAL_ENCLOSED_POCKET',
      bounds: (setback) => ({
        minX: core.minX - setback,
        maxX: core.maxX + setback,
        minZ: core.minZ - setback,
        maxZ: core.maxZ + setback,
      }),
      topology: 'enclosed current-state pocket inside the future mountain',
    },
    {
      id: 'SOUTH_OPEN_NO_BUILD_CORRIDOR',
      bounds: (setback) => ({
        minX: core.minX - setback,
        maxX: core.maxX + setback,
        minZ: core.minZ - setback,
        maxZ: mountainBounds.maxZ,
      }),
      topology: 'current-state corridor from the protected envelope to the south exterior',
    },
    {
      id: 'BROAD_SOUTH_TOE_SETBACK',
      bounds: (setback) => ({
        minX: mountainBounds.minX,
        maxX: mountainBounds.maxX,
        minZ: core.minZ - setback,
        maxZ: mountainBounds.maxZ,
      }),
      topology: 'full-width removal of future fill across the south toe',
    },
  ];
  const candidates = [];
  for (const strategy of strategies) {
    for (const positiveMarginBlocks of margins) {
      const interactionSetbackBlocks = positiveMarginBlocks + 1;
      const noBuild = strategy.bounds(interactionSetbackBlocks);
      const protectedEnvelope = expandedBounds(core, positiveMarginBlocks);
      const exactOverlap = overlapAgainstEnvelope(
        construction,
        support,
        noBuild,
        protectedEnvelope,
      );
      const opensToSouthExterior = noBuild.maxZ >= mountainBounds.maxZ;
      const b08ChangedColumnCount = columnIntersectionCount(b08, noBuild);
      const b09ChangedColumnCount = columnIntersectionCount(b09, noBuild);
      const summitColumnRetained = !inColumnBounds(
        noBuild,
        model.center.x,
        model.center.z,
      );
      const rootCauseCleared = Object.values(exactOverlap).every((count) => count === 0);
      const preliminaryEligible = rootCauseCleared
        && opensToSouthExterior
        && b08ChangedColumnCount === 0
        && b09ChangedColumnCount === 0
        && summitColumnRetained;
      const components = preliminaryEligible ? componentStats(construction, noBuild) : null;
      const connectivityRetained = components
        ? components.componentCount === baseComponents.componentCount
          && components.largestComponentColumnCount
            === baseComponents.largestComponentColumnCount
              - [...construction.keys()].filter((key) => {
                const [x, z] = key.split(',').map(Number);
                return inColumnBounds(noBuild, x, z);
              }).length
        : false;
      const hardGates = {
        exactCorePlusMarginConstructionClear: exactOverlap.constructionCellCount === 0,
        exactCorePlusMarginInteractionClear: exactOverlap.interactionCellCount === 0,
        exactCorePlusMarginSupportClear: exactOverlap.supportGapCellCount === 0,
        exactCorePlusMarginInfluenceClear: exactOverlap.influenceCellCount === 0,
        opensToExistingSouthExterior: opensToSouthExterior,
        b08ReservationUnchanged: b08ChangedColumnCount === 0,
        b09ReservationUnchanged: b09ChangedColumnCount === 0,
        summitColumnRetained,
        constructionColumnConnectivityRetained: connectivityRetained,
      };
      candidates.push({
        strategyId: strategy.id,
        topology: strategy.topology,
        positiveMarginBlocks,
        interactionSetbackBlocks,
        protectedEnvelope,
        noBuildColumnBounds: noBuild,
        noBuildColumnCount:
          (noBuild.maxX - noBuild.minX + 1) * (noBuild.maxZ - noBuild.minZ + 1),
        lostCandidateAddedSolidCellCount: removedCellCount(construction, noBuild),
        removedSupportGapCellCount: removedCellCount(support, noBuild),
        exactOverlap,
        b08ChangedColumnCount,
        b09ChangedColumnCount,
        constructionColumnComponents: components,
        hardGates,
        eligible: Object.values(hardGates).every(Boolean),
      });
    }
  }
  const eligible = candidates.filter(({ eligible }) => eligible).sort((left, right) => (
    left.lostCandidateAddedSolidCellCount - right.lostCandidateAddedSolidCellCount
    || left.noBuildColumnCount - right.noBuildColumnCount
    || left.positiveMarginBlocks - right.positiveMarginBlocks
    || left.strategyId.localeCompare(right.strategyId)
  ));
  invariant(eligible.length > 0, 'no bounded reshape candidate passes every hard gate');
  const selectedCandidate = eligible[0];
  invariant(selectedCandidate.strategyId === 'SOUTH_OPEN_NO_BUILD_CORRIDOR'
    && selectedCandidate.positiveMarginBlocks === 1,
  'minimum eligible reshape selection drift');

  const selectedConstruction = filterMap(construction, selectedCandidate.noBuildColumnBounds);
  const selectedSupport = filterMap(support, selectedCandidate.noBuildColumnBounds);
  const selectedInteraction = faceShell(selectedConstruction);
  const selectedInfluence = unionIntervalMaps(selectedInteraction, selectedSupport);
  const constructionStats = mapStats(selectedConstruction, 'P1-B10', 'construction');
  const supportStats = mapStats(selectedSupport, 'P1-B10', 'influence-support-gap');
  const interactionStats = mapStats(selectedInteraction, 'P1-B10', 'interaction');
  const influenceStats = mapStats(selectedInfluence, 'P1-B10', 'influence');
  const designDigest = crypto.createHash('sha256').update(`${DESIGN_PREAMBLE}\n`);
  const solidDigest = crypto.createHash('sha256').update(`${SOLID_PREAMBLE}\n`);
  const supportDigest = crypto.createHash('sha256').update(`${SUPPORT_PREAMBLE}\n`);
  for (let x = mountainBounds.minX; x <= mountainBounds.maxX; x += 1) {
    for (let z = mountainBounds.minZ; z <= mountainBounds.maxZ; z += 1) {
      const key = columnKey(x, z);
      const surface = currentSurface.get(key);
      const designY = inColumnBounds(selectedCandidate.noBuildColumnBounds, x, z)
        ? surface.y
        : mountainSurface(x, z, model);
      const candidate = selectedConstruction.get(key) ?? [];
      designDigest.update(`${x},${z}\t${designY}\n`);
      solidDigest.update(
        `${x},${z}\tcurrent=${surface.y}\tdesign=${designY}\tadd=${candidate.length
          ? candidate.map(({ start, end }) => `${start}..${end}`).join(',')
          : '-'}\n`,
      );
      const supportRanges = selectedSupport.get(key) ?? [];
      if (supportRanges.length > 0) {
        supportDigest.update(`${x},${z}\t${supportRanges
          .map(({ start, end }) => `${start}..${end}`).join(',')}\n`);
      }
    }
  }
  const exactSelectedOverlap = overlapAgainstEnvelope(
    construction,
    support,
    selectedCandidate.noBuildColumnBounds,
    selectedCandidate.protectedEnvelope,
  );
  invariant(Object.values(exactSelectedOverlap).every((count) => count === 0),
    'selected exact overlap is nonzero');
  invariant(constructionStats.cellCount
    === constructionCellCount - selectedCandidate.lostCandidateAddedSolidCellCount,
  'selected construction accounting drift');
  invariant(supportStats.cellCount
    === supportCellCount - selectedCandidate.removedSupportGapCellCount,
  'selected support accounting drift');

  const noBuildIdentity = noBuildColumnIdentity(selectedCandidate.noBuildColumnBounds);
  const selectedGeometry = {
    id: 'FM-01-SHIPWRECK-SOUTH-OPEN-TOE-RESHAPE-V1',
    baseModelId: p1b10.selectedIdentity,
    planningStatus: 'EXACT_SELECTED_PLANNING_OVERLAY_TECHNICAL_MARGIN_AND_CANONICAL_INTEGRATION_HOLD',
    formulaOverride: {
      rule: 'Inside the exact no-build X/Z column set, preserve immutable current state and set analytic designSurfaceY to currentSurfaceY; outside it, retain FM-01 unchanged.',
      excavationAuthorized: false,
      currentBlockReplacementAuthorized: false,
    },
    positiveMargin: {
      selectedPlanningBlocks: selectedCandidate.positiveMarginBlocks,
      testedBlocks: margins,
      basis: 'one cell is the existing committed minimum planning shell; two through four are bounded monotone sensitivity checks',
      acceptedExpertMarginBlocks: null,
      expertMarginAccepted: false,
    },
    externalInteractionSetbackBlocks: selectedCandidate.interactionSetbackBlocks,
    sparseNoBuildPlan: {
      representation: 'INCLUSIVE_XZ_RECTANGLE_CURRENT_STATE_PRESERVATION_COLUMNS',
      bounds: selectedCandidate.noBuildColumnBounds,
      preamble: `${COLUMN_PREAMBLE}\\n`,
      record: 'x,z',
      ...noBuildIdentity,
      opensToSouthMountainExterior: true,
    },
    regeneratedDomains: {
      construction: {
        representation: 'SOURCE_BOUND_SPARSE_EXACT_INTEGER_Y_INTERVAL_SET_NO_INLINE_COORDINATES',
        cellCount: constructionStats.cellCount,
        bounds: constructionStats.bounds,
        intervalManifestSha256: solidDigest.digest('hex'),
        intervalPreamble: `${SOLID_PREAMBLE}\\n`,
        lostCellCountFromBase: selectedCandidate.lostCandidateAddedSolidCellCount,
      },
      interaction: {
        ...interactionStats,
        intervalPreamble: `${DOMAIN_INTERVAL_PREAMBLE}\\nP1-B10/interaction\\n`,
      },
      influence: {
        ...influenceStats,
        intervalPreamble: `${DOMAIN_INTERVAL_PREAMBLE}\\nP1-B10/influence\\n`,
      },
      supportGap: {
        cellCount: supportStats.cellCount,
        bounds: supportStats.bounds,
        columnCount: supportStats.columnRecordCount,
        intervalManifestSha256: supportDigest.digest('hex'),
        intervalPreamble: `${SUPPORT_PREAMBLE}\\n`,
        removedCellCountFromBase: selectedCandidate.removedSupportGapCellCount,
        treatment: null,
      },
    },
    designSurfaceManifestSha256: designDigest.digest('hex'),
    exactCorePlusPlanningMarginOverlap: exactSelectedOverlap,
    connectivity: selectedCandidate.constructionColumnComponents,
    routeAndScopeChecks: {
      b08ChangedColumnCount: selectedCandidate.b08ChangedColumnCount,
      b09ChangedColumnCount: selectedCandidate.b09ChangedColumnCount,
      d06CannotGainConflictBecauseOnlyB10CandidateFillIsRemoved: true,
      summitColumnRetained: selectedCandidate.hardGates.summitColumnRetained,
    },
  };
  selectedGeometry.geometryIdentitySha256 = sha256(
    `combined-zones-shipwreck-reshape-geometry-v1\n${JSON.stringify(selectedGeometry)}\n`,
  );

  return {
    status:
      'PASS_EXACT_MINIMUM_SOUTH_OPEN_RESHAPE_SELECTED_ZERO_CORE_PLUS_PLANNING_MARGIN_OVERLAP_TECHNICAL_MARGIN_AND_CANONICAL_INTEGRATION_HOLD',
    sourceVerification: {
      acceptedCompleteSaveSha256: completeSave.packageIdentity.completeSaveSha256,
      captureId: capture.captureId,
      capturedAtUtc: capture.capturedAtUtc,
      immutableCopy: capture.immutableCopy,
      projectScopeSourceEquivalent: true,
      baselineConstruction: {
        cellCount: constructionCellCount,
        intervalManifestSha256: p1b10.construction.sparseIntervals.intervalManifestSha256,
      },
      baselineInteraction: baseInteractionStats,
      baselineInfluence: baseInfluenceStats,
      baselineSupportGap: {
        cellCount: supportCellCount,
        intervalManifestSha256: p1b10.exactSupportGapEvidence.intervalManifestSha256,
      },
      baselineConstructionColumnComponents: baseComponents,
    },
    readOnlyWorldObservation: {
      method: 'direct read of the accepted immutable complete-save Anvil copy on the server filesystem',
      liveProcessQueried: false,
      selectedCorridorCurrentSurface: surfaceSummary(
        currentSurface,
        selectedCandidate.noBuildColumnBounds,
      ),
      shipwreckFootprintCurrentSurface: surfaceSummary(currentSurface, {
        minX: core.minX,
        maxX: core.maxX,
        minZ: core.minZ,
        maxZ: core.maxZ,
      }),
      shipwreckCoreCensus: shipwreck.observedSnapshotCensus,
    },
    boundedSearch: {
      positivePlanningMarginsTested: margins,
      strategyCount: strategies.length,
      candidateCount: candidates.length,
      eligibleCandidateCount: eligible.length,
      selectionRule: 'Pass every hard gate, then minimize lost candidate-added-solid cells, no-build columns, positive planning margin, and strategy ID in that order.',
      whySearchStopsAtFourBlocks: 'One block is the committed minimum planning shell. Two through four prove monotone sensitivity; larger invented margins cannot improve the decision before expert evidence establishes the accepted margin.',
      candidates,
    },
    selectedPlanningReshape: selectedGeometry,
    disposition: {
      exactReshapeGeometryCompiled: true,
      exactConstructionInteractionInfluenceSupportRegeneratedFromSource: true,
      exactZeroCorePlusSelectedPlanningMarginOverlap: true,
      selectedPlanningMarginBlocks: selectedCandidate.positiveMarginBlocks,
      expertPositiveMarginAccepted: false,
      canonicalD05G03G06IntegrationComplete: false,
      technicalTreatmentAccepted: false,
      operationCompilationAuthorized: false,
    },
  };
}
