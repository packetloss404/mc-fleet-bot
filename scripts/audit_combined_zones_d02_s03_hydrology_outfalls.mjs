#!/usr/bin/env node
/**
 * Audit current C1 hydrology and outfall candidates for D02-S03.
 *
 * This is a deterministic region-only model. It inventories current fluid
 * components inside a chunk-aligned one-chunk halo, evaluates the frozen road
 * drain and rail cess coordination datums, and applies the conservative default
 * no-diversion policy. It emits no operations or material cells.
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

const GENERATED_AT = value('--generated-at', '2026-08-04T22:12:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-d02-s03-hydrology-outfalls.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-d02-s03-hydrology-outfalls.md',
));

const INPUTS = {
  d02S01S02: 'docs/masterplans/05-combined-zones/phase1-d02-s01-s02-region-evidence.json',
  c1Civil: 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json',
  d05Hydrology: 'docs/masterplans/05-combined-zones/phase1-d05-hydrology-relic-buffer-design.json',
  d05Defaults: 'docs/masterplans/05-combined-zones/phase1-d05-conservative-defaults.json',
  phase0Evidence: 'docs/masterplans/05-combined-zones/phase0-survey-evidence.json',
};

const ROLES = {
  d02S01S02: 'finalized D02 region census and copied-save completeness boundary',
  c1Civil: 'exact C1 land take, collection columns, and independent profiles',
  d05Hydrology: 'same-snapshot full-height hydrology method and mountain component baseline',
  d05Defaults: 'exact default no-diversion and receiver/interface criteria',
  phase0Evidence: 'immutable selected region snapshot identity',
};

const WORLD_MIN_Y = -64;
const WORLD_MAX_Y = 319;
const WATER_NAMES = new Set(['minecraft:water', 'minecraft:bubble_column']);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function fileBinding(relativePath, role) {
  const data = fs.readFileSync(path.join(ROOT, relativePath));
  return { path: relativePath, sha256: sha256(data), bytes: data.length, role };
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
    assert(!(compression & 0x80), `external chunk storage unsupported at ${cx},${cz}`);
    const { parsed } = await nbt.parse(decompress(compression, buffer.subarray(offset + 5, offset + 4 + length)));
    const raw = nbt.simplify(parsed);
    const sections = new Map((raw.sections ?? []).map((section) => [Number(section.Y), section]));
    const chunk = { cx, cz, sections };
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

function canonicalState(state) {
  const properties = state.Properties ?? state.properties ?? {};
  const suffix = Object.keys(properties).sort().map((key) => `${key}=${properties[key]}`).join(',');
  return suffix ? `${state.Name}[${suffix}]` : state.Name;
}

function isWaterlogged(state) {
  const properties = state.Properties ?? state.properties ?? {};
  return properties.waterlogged === 'true' || properties.waterlogged === true;
}

function fluidFamily(state) {
  if (state.Name === 'minecraft:lava') return 'lava';
  if (WATER_NAMES.has(state.Name) || isWaterlogged(state)) return 'water';
  return null;
}

function pointKey(x, y, z) {
  return `${x},${y},${z}`;
}

function columnKey(x, z) {
  return `${x},${z}`;
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
      const key = columnKey(point.x, point.z);
      if (!columns.has(key)) columns.set(key, { ...point, station, offset });
    }
  }
  return [...columns.values()];
}

function hashColumns(columns, preamble) {
  const digest = crypto.createHash('sha256');
  digest.update(`${preamble}\n`);
  for (const cell of [...columns].sort((left, right) => left.x - right.x || left.z - right.z)) {
    digest.update(`${cell.x},${cell.z}\n`);
  }
  return digest.digest('hex');
}

function hashCells(cells, preamble) {
  const digest = crypto.createHash('sha256');
  digest.update(`${preamble}\n`);
  for (const cell of [...cells].sort((left, right) => left.x - right.x || left.y - right.y || left.z - right.z)) {
    digest.update(`${cell.x},${cell.y},${cell.z}\n`);
  }
  return digest.digest('hex');
}

function boundsOf(cells) {
  return {
    minX: Math.min(...cells.map((cell) => cell.x)),
    maxX: Math.max(...cells.map((cell) => cell.x)),
    minY: Math.min(...cells.map((cell) => cell.y)),
    maxY: Math.max(...cells.map((cell) => cell.y)),
    minZ: Math.min(...cells.map((cell) => cell.z)),
    maxZ: Math.max(...cells.map((cell) => cell.z)),
  };
}

function localMinimumRuns(profile) {
  const runs = [];
  let start = 0;
  for (let index = 1; index <= profile.length; index++) {
    if (index < profile.length && profile[index] === profile[start]) continue;
    const end = index - 1;
    const left = start > 0 ? profile[start - 1] : Number.POSITIVE_INFINITY;
    const right = end < profile.length - 1 ? profile[end + 1] : Number.POSITIVE_INFINITY;
    if (profile[start] <= left && profile[end] <= right
      && (profile[start] < left || profile[end] < right)) {
      runs.push({
        startStation: start,
        endStation: end,
        datumY: profile[start],
        stationCount: end - start + 1,
        kind: start === 0 || end === profile.length - 1 ? 'TERMINAL_GRAVITY_LOW' : 'INTERNAL_GRAVITY_SINK',
      });
    }
    start = index;
  }
  return runs;
}

function profileAudit(profile) {
  let riseEdges = 0;
  let fallEdges = 0;
  let levelEdges = 0;
  for (let index = 1; index < profile.length; index++) {
    if (profile[index] > profile[index - 1]) riseEdges++;
    else if (profile[index] < profile[index - 1]) fallEdges++;
    else levelEdges++;
  }
  return {
    stationCount: profile.length,
    minimumY: Math.min(...profile),
    maximumY: Math.max(...profile),
    startY: profile[0],
    endY: profile.at(-1),
    riseEdges,
    fallEdges,
    levelEdges,
    localMinimumRuns: localMinimumRuns(profile),
    continuousOneWayGravityOutlet: riseEdges === 0 || fallEdges === 0,
  };
}

function componentManifestHash(components, family) {
  const digest = crypto.createHash('sha256');
  digest.update(`combined-zones-d02-s03-${family}-components-v1\n`);
  for (const component of components) {
    digest.update(`${component.id}|${component.cellCount}|${component.coordinateSetSha256}|${JSON.stringify(component.bounds)}|${component.touchesStudyBoundary}\n`);
  }
  return digest.digest('hex');
}

async function scanFluidDomain(reader, domainChunks, sets) {
  const orderedChunks = [...domainChunks.values()].sort((left, right) => left.cx - right.cx || left.cz - right.cz);
  const missingChunks = [];
  const fluidPoints = [];
  for (const { cx, cz } of orderedChunks) {
    const chunk = await reader.readChunk(cx, cz);
    if (!chunk) {
      missingChunks.push({ cx, cz });
      continue;
    }
    for (let x = cx * 16; x < cx * 16 + 16; x++) {
      for (let z = cz * 16; z < cz * 16 + 16; z++) {
        for (let y = WORLD_MIN_Y; y <= WORLD_MAX_Y; y++) {
          const state = reader.stateAt(chunk, x, y, z);
          const family = fluidFamily(state);
          if (family) fluidPoints.push({ x, y, z, family, state: canonicalState(state) });
        }
      }
    }
  }
  fluidPoints.sort((left, right) => left.family.localeCompare(right.family)
    || left.x - right.x || left.y - right.y || left.z - right.z);
  const pointByKey = new Map(fluidPoints.map((point) => [pointKey(point.x, point.y, point.z), point]));
  const componentByCell = new Map();
  const results = { water: [], lava: [] };
  const directions = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (const family of ['water', 'lava']) {
    const familyPoints = fluidPoints.filter((point) => point.family === family);
    const unvisited = new Set(familyPoints.map((point) => pointKey(point.x, point.y, point.z)));
    while (unvisited.size) {
      const seedKey = unvisited.values().next().value;
      const seed = pointByKey.get(seedKey);
      const queue = [seed];
      unvisited.delete(seedKey);
      const cells = [];
      let touchesStudyBoundary = false;
      let landTakeCellCount = 0;
      let roadCollectionColumnCellCount = 0;
      let railCollectionColumnCellCount = 0;
      const stateCounts = new Map();
      for (let cursor = 0; cursor < queue.length; cursor++) {
        const point = queue[cursor];
        cells.push(point);
        const column = columnKey(point.x, point.z);
        if (sets.landTake.has(column)) landTakeCellCount++;
        if (sets.roadCollection.has(column)) roadCollectionColumnCellCount++;
        if (sets.railCollection.has(column)) railCollectionColumnCellCount++;
        stateCounts.set(point.state, (stateCounts.get(point.state) ?? 0) + 1);
        for (const [dx, dy, dz] of directions) {
          const x = point.x + dx;
          const y = point.y + dy;
          const z = point.z + dz;
          if (y < WORLD_MIN_Y || y > WORLD_MAX_Y) continue;
          const neighborChunk = `${Math.floor(x / 16)},${Math.floor(z / 16)}`;
          if (!domainChunks.has(neighborChunk)) {
            touchesStudyBoundary = true;
            continue;
          }
          const key = pointKey(x, y, z);
          const neighbor = pointByKey.get(key);
          if (neighbor?.family === family && unvisited.delete(key)) queue.push(neighbor);
        }
      }
      cells.sort((left, right) => left.x - right.x || left.y - right.y || left.z - right.z);
      const id = `${family}-${String(results[family].length + 1).padStart(5, '0')}`;
      for (const cell of cells) componentByCell.set(pointKey(cell.x, cell.y, cell.z), id);
      const stateDigest = crypto.createHash('sha256');
      stateDigest.update(`combined-zones-d02-s03-${family}-component-states-v1\n`);
      for (const cell of cells) stateDigest.update(`${cell.x},${cell.y},${cell.z},${cell.state}\n`);
      results[family].push({
        id,
        family,
        cellCount: cells.length,
        coordinateSetSha256: hashCells(cells, `combined-zones-d02-s03-${family}-component-coordinates-v1`),
        blockStateSetSha256: stateDigest.digest('hex'),
        bounds: boundsOf(cells),
        touchesStudyBoundary,
        landTakeCellCount,
        roadCollectionColumnCellCount,
        railCollectionColumnCellCount,
        exactStateCounts: [...stateCounts.entries()].sort(([left], [right]) => left.localeCompare(right))
          .map(([state, count]) => ({ state, count })),
      });
    }
  }
  return {
    missingChunks,
    fluidPoints,
    componentByCell,
    components: results,
  };
}

function collectionDatum(civil, columns, kind) {
  const cells = columns.map((column) => ({
    x: column.x,
    y: kind === 'road'
      ? civil.horizontalAlignment.stations[column.station].highwaySouthEdgeY
      : civil.horizontalAlignment.stations[column.station].railFormationY,
    z: column.z,
    station: column.station,
    offset: column.offset,
  }));
  const unique = new Map();
  for (const cell of cells) {
    const key = pointKey(cell.x, cell.y, cell.z);
    if (!unique.has(key)) unique.set(key, cell);
  }
  return [...unique.values()];
}

function datumEvidence(reader, cells, componentByCell) {
  const directions = [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  const currentStateDigest = crypto.createHash('sha256');
  currentStateDigest.update('combined-zones-d02-s03-collection-datum-current-states-v1\n');
  let currentWaterFamilyCells = 0;
  let currentLavaCells = 0;
  const contactComponentIds = new Set();
  for (const cell of [...cells].sort((left, right) => left.x - right.x || left.y - right.y || left.z - right.z)) {
    const chunk = reader.chunks.get(`${Math.floor(cell.x / 16)},${Math.floor(cell.z / 16)}`);
    const state = reader.stateAt(chunk, cell.x, cell.y, cell.z);
    const family = fluidFamily(state);
    if (family === 'water') currentWaterFamilyCells++;
    if (family === 'lava') currentLavaCells++;
    currentStateDigest.update(`${cell.x},${cell.y},${cell.z},${canonicalState(state)}\n`);
    for (const [dx, dy, dz] of directions) {
      const componentId = componentByCell.get(pointKey(cell.x + dx, cell.y + dy, cell.z + dz));
      if (componentId) contactComponentIds.add(componentId);
    }
  }
  return {
    datumCellCount: cells.length,
    datumCellSetSha256: hashCells(cells, 'combined-zones-d02-s03-collection-datum-cells-v1'),
    currentStateSetSha256: currentStateDigest.digest('hex'),
    currentWaterFamilyCells,
    currentLavaCells,
    sameOrFaceAdjacentComponentIds: [...contactComponentIds].sort(),
  };
}

function sinkContactEvidence(civil, centerline, offsets, minima, kind, componentByCell) {
  return minima.map((minimum, index) => {
    const cells = new Map();
    for (let station = minimum.startStation; station <= minimum.endStation; station++) {
      const tangent = tangentAt(centerline, station);
      for (const offset of offsets) {
        const point = offsetPoint(centerline[station], tangent, offset);
        const y = kind === 'road'
          ? civil.horizontalAlignment.stations[station].highwaySouthEdgeY
          : civil.horizontalAlignment.stations[station].railFormationY;
        cells.set(pointKey(point.x, y, point.z), { ...point, y, station, offset });
      }
    }
    const componentIds = new Set();
    const directions = [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    for (const cell of cells.values()) {
      for (const [dx, dy, dz] of directions) {
        const componentId = componentByCell.get(pointKey(cell.x + dx, cell.y + dy, cell.z + dz));
        if (componentId) componentIds.add(componentId);
      }
    }
    const orderedCells = [...cells.values()];
    return {
      id: `${kind.toUpperCase()}-LOW-${String(index + 1).padStart(3, '0')}`,
      ...minimum,
      interfaceCellCount: orderedCells.length,
      interfaceCellSetSha256: hashCells(orderedCells, `combined-zones-d02-s03-${kind}-low-interface-v1`),
      sameOrFaceAdjacentComponentIds: [...componentIds].sort(),
    };
  });
}

const s01 = readJson(INPUTS.d02S01S02);
const civil = readJson(INPUTS.c1Civil);
const d05 = readJson(INPUTS.d05Hydrology);
const defaults = readJson(INPUTS.d05Defaults);
const phase0 = readJson(INPUTS.phase0Evidence);

assert(s01.status === 'PARTIAL_PASS_REGION_FACTS_COMPLETE_SAVE_MISSING_D02_HOLD', 'D02 S01/S02 status drift');
assert(s01.safetyBoundary.d02Resolved === false, 'D02 S01/S02 unexpectedly resolves D02');
assert(civil.status === 'PARTIAL_PASS_D02_HOLD', 'C1 civil status drift');
assert(d05.status === 'PARTIAL_PASS_EXACT_BASELINE_AND_BUFFER_CANDIDATES_D05_HOLD', 'D05 hydrology status drift');
assert(defaults.soleAuthorityRecommendations.preservationAndNoDiversionCriteria.recommendation
  === 'ADOPT_ZERO_UNDECLARED_CHANGE_AND_DEFAULT_NO_DIVERSION', 'D05 no-diversion default drift');
const selectedNoDiversion = {
  id: 'SEL-D05-ZERO-UNDECLARED-CHANGE',
  selection: defaults.soleAuthorityRecommendations.preservationAndNoDiversionCriteria
    .recommendation,
  technicalAcceptanceClaimed: false,
};
const snapshot = s01.selectedRegionOnlyEvidence.identity;
assert(snapshot.sha256 === civil.immutableSnapshot.sha256, 'S01 and C1 snapshot drift');
assert(snapshot.sha256 === d05.sourceBindings.immutablePhase0PostRegionSnapshot.sha256, 'S01 and D05 snapshot drift');
assert(snapshot.sha256 === phase0.snapshots.postGeneration.sha256, 'S01 and Phase 0 snapshot drift');

const sourceBindings = Object.entries(INPUTS).map(([key, relativePath]) => fileBinding(relativePath, ROLES[key]));
const centerline = civil.horizontalAlignment.stations.map((station) => ({ x: station.x, z: station.z }));
const landTakeColumns = canonicalOffsetColumns(
  centerline,
  civil.crossSection.totalLandTake.offsetFrom,
  civil.crossSection.totalLandTake.offsetTo,
);
const roadCollectionColumns = canonicalOffsetColumns(
  centerline,
  civil.drainage.roadCollection.offsetFrom,
  civil.drainage.roadCollection.offsetTo,
);
const railCollectionColumns = canonicalOffsetColumns(
  centerline,
  civil.drainage.railCollection.offsetFrom,
  civil.drainage.railCollection.offsetTo,
);
assert(hashColumns(landTakeColumns, 'combined-zones-c1-total-land-take-columns-v1')
  === civil.crossSection.totalLandTake.columnSetSha256, 'C1 land-take column identity drift');
assert(hashColumns(roadCollectionColumns, 'combined-zones-c1-south-drain-columns-v1')
  === civil.drainage.roadCollection.columnSetSha256, 'road collection column identity drift');
assert(hashColumns(railCollectionColumns, 'combined-zones-c1-north-cess-columns-v1')
  === civil.drainage.railCollection.columnSetSha256, 'rail collection column identity drift');

const touchedChunks = new Map();
for (const column of landTakeColumns) {
  const cx = Math.floor(column.x / 16);
  const cz = Math.floor(column.z / 16);
  touchedChunks.set(`${cx},${cz}`, { cx, cz });
}
const domainChunks = new Map();
for (const { cx, cz } of touchedChunks.values()) {
  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      domainChunks.set(`${cx + dx},${cz + dz}`, { cx: cx + dx, cz: cz + dz });
    }
  }
}
const domainDigest = crypto.createHash('sha256');
domainDigest.update('combined-zones-d02-s03-study-domain-chunks-v1\n');
for (const { cx, cz } of [...domainChunks.values()].sort((left, right) => left.cx - right.cx || left.cz - right.cz)) {
  domainDigest.update(`${cx},${cz}\n`);
}

const reader = new SnapshotReader(path.resolve(snapshot.path));
const fluid = await scanFluidDomain(reader, domainChunks, {
  landTake: new Set(landTakeColumns.map((column) => columnKey(column.x, column.z))),
  roadCollection: new Set(roadCollectionColumns.map((column) => columnKey(column.x, column.z))),
  railCollection: new Set(railCollectionColumns.map((column) => columnKey(column.x, column.z))),
});
assert(fluid.missingChunks.length === 0, 'C1 hydrology study domain has missing chunks');

const roadDatumCells = collectionDatum(civil, roadCollectionColumns, 'road');
const railDatumCells = collectionDatum(civil, railCollectionColumns, 'rail');
const roadProfile = civil.horizontalAlignment.stations.map((station) => station.highwaySouthEdgeY);
const railProfile = civil.horizontalAlignment.stations.map((station) => station.railFormationY);
const roadProfileEvidence = profileAudit(roadProfile);
const railProfileEvidence = profileAudit(railProfile);
const roadDatumEvidence = datumEvidence(reader, roadDatumCells, fluid.componentByCell);
const railDatumEvidence = datumEvidence(reader, railDatumCells, fluid.componentByCell);
const roadSinks = sinkContactEvidence(civil, centerline, [18, 19], roadProfileEvidence.localMinimumRuns, 'road', fluid.componentByCell);
const railSinks = sinkContactEvidence(civil, centerline, [-30, -29], railProfileEvidence.localMinimumRuns, 'rail', fluid.componentByCell);

const allComponents = [...fluid.components.water, ...fluid.components.lava];
const componentLookup = new Map(allComponents.map((component) => [component.id, component]));
const sinkComponentSources = new Map();
for (const sink of [...roadSinks, ...railSinks]) {
  for (const componentId of sink.sameOrFaceAdjacentComponentIds) {
    if (!sinkComponentSources.has(componentId)) sinkComponentSources.set(componentId, []);
    sinkComponentSources.get(componentId).push(sink.id);
  }
}
const receiverCandidates = [...sinkComponentSources.entries()].sort(([left], [right]) => left.localeCompare(right))
  .map(([componentId, sinkIds]) => {
    const component = componentLookup.get(componentId);
    return {
      componentId,
      family: component.family,
      cellCount: component.cellCount,
      coordinateSetSha256: component.coordinateSetSha256,
      touchesStudyBoundary: component.touchesStudyBoundary,
      sinkIds: [...sinkIds].sort(),
      disposition: 'REJECTED_UNDER_CURRENT_DEFAULT_NO_DIVERSION',
      rejectionReasons: [
        'DEFAULT_NO_DIVERSION_PROHIBITS_NEW_DISCHARGE_OR_COMPONENT_CHANGE',
        'NO_EXACT_RECEIVER_OWNER_OR_INTERFACE_CONTRACT',
        'NO_RAINFALL_GROUNDWATER_SNOWMELT_OR_CAPACITY_ACCEPTANCE',
        ...(component.touchesStudyBoundary ? ['COMPONENT_TRUNCATED_AT_STUDY_DOMAIN_BOUNDARY'] : []),
      ],
    };
  });

const intersectingComponents = allComponents.filter((component) => component.landTakeCellCount > 0);
const waterManifestSha256 = componentManifestHash(fluid.components.water, 'water');
const lavaManifestSha256 = componentManifestHash(fluid.components.lava, 'lava');
const c1Bounds = civil.crossSection.totalLandTake.bounds;
const mountainBounds = d05.scope.fullHeightHydrologySurveyPrism.bounds;
const clearColumnsToMountain = mountainBounds.minX - c1Bounds.maxX - 1;
assert(clearColumnsToMountain >= 0, 'C1 land take overlaps D05 mountain hydrology prism in plan');

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-d02-s03-hydrology-outfalls',
  generatedAtUtc: GENERATED_AT,
  status: 'PARTIAL_PASS_EXACT_CURRENT_COMPONENTS_NO_ACCEPTABLE_OUTFALL_D02_HOLD',
  purpose: 'Exact current C1 fluid-component and collection-datum evidence under the selected zero-undeclared-change/default-no-diversion policy.',
  safetyBoundary: {
    localMachineEvidenceOnly: true,
    mutableProseDependencies: [],
    r00Dependencies: [],
    liveCallsPerformed: [],
    databasesOpened: [],
    operationCells: [],
    materialCells: [],
    operationCellCount: 0,
    worldEditAuthorized: false,
    diversionAuthorized: false,
    d02Resolved: false,
    d02B03Resolved: false,
  },
  sourceBindings,
  immutableEvidenceIdentity: {
    regionSnapshot: snapshot,
    regionOnly: true,
    completeCopiedSaveAvailable: false,
    c1LandTake: {
      columnCount: landTakeColumns.length,
      columnSetSha256: civil.crossSection.totalLandTake.columnSetSha256,
      bounds: c1Bounds,
    },
    selectedNoDiversionRule: {
      selectionId: selectedNoDiversion.id,
      selection: selectedNoDiversion.selection,
      technicalAcceptanceClaimed: selectedNoDiversion.technicalAcceptanceClaimed,
      criteria: defaults.soleAuthorityRecommendations.preservationAndNoDiversionCriteria.preR00DesignCriteria,
    },
  },
  studyDomain: {
    derivation: 'All chunks touched by the exact C1 total-land-take columns plus every horizontally adjacent one-chunk neighbor.',
    coreTouchedChunkCount: touchedChunks.size,
    haloChunkCount: domainChunks.size,
    haloChunkSetSha256: domainDigest.digest('hex'),
    worldY: { min: WORLD_MIN_Y, max: WORLD_MAX_Y, inclusiveHeight: WORLD_MAX_Y - WORLD_MIN_Y + 1 },
    surveyedCellCount: domainChunks.size * 16 * 16 * (WORLD_MAX_Y - WORLD_MIN_Y + 1),
    missingChunkCount: fluid.missingChunks.length,
    topologyBoundary: 'A component touching the outer face of the chunk halo is boundary-truncated and cannot be treated as a complete receiver.',
  },
  currentFluidComponents: {
    water: {
      componentCount: fluid.components.water.length,
      cellCount: fluid.components.water.reduce((sum, component) => sum + component.cellCount, 0),
      manifestSha256: waterManifestSha256,
      boundaryTruncatedComponentCount: fluid.components.water.filter((component) => component.touchesStudyBoundary).length,
    },
    lava: {
      componentCount: fluid.components.lava.length,
      cellCount: fluid.components.lava.reduce((sum, component) => sum + component.cellCount, 0),
      manifestSha256: lavaManifestSha256,
      boundaryTruncatedComponentCount: fluid.components.lava.filter((component) => component.touchesStudyBoundary).length,
    },
    landTakeIntersections: {
      componentCount: intersectingComponents.length,
      waterComponentCount: intersectingComponents.filter((component) => component.family === 'water').length,
      lavaComponentCount: intersectingComponents.filter((component) => component.family === 'lava').length,
      waterCellCount: intersectingComponents.filter((component) => component.family === 'water')
        .reduce((sum, component) => sum + component.landTakeCellCount, 0),
      lavaCellCount: intersectingComponents.filter((component) => component.family === 'lava')
        .reduce((sum, component) => sum + component.landTakeCellCount, 0),
      components: intersectingComponents,
    },
    qualification: 'Six-face components of current water/bubble/waterlogged or lava states inside the exact chunk-halo domain. Boundary-touching components are deliberately incomplete.',
  },
  collectionSystems: {
    roadSouthDrain: {
      offsetsInclusive: [18, 19],
      columnCount: roadCollectionColumns.length,
      columnSetSha256: civil.drainage.roadCollection.columnSetSha256,
      datumRule: 'Use the frozen highway south-edge coordination Y at the owning reference station; this is not a constructed invert.',
      profile: roadProfileEvidence,
      datumEvidence: roadDatumEvidence,
      gravityLowInterfaces: roadSinks,
      status: 'EXACT_COORDINATION_DATUM_GRAVITY_NETWORK_AND_OUTFALL_HOLD',
    },
    railNorthCess: {
      offsetsInclusive: [-30, -29],
      columnCount: railCollectionColumns.length,
      columnSetSha256: civil.drainage.railCollection.columnSetSha256,
      datumRule: 'Use the frozen rail formation coordination Y at the owning reference station; this is not a constructed cess invert.',
      profile: railProfileEvidence,
      datumEvidence: railDatumEvidence,
      gravityLowInterfaces: railSinks,
      status: 'EXACT_COORDINATION_DATUM_GRAVITY_NETWORK_AND_OUTFALL_HOLD',
    },
    interpretation: 'Both profiles rise and fall and therefore drain to internal low runs rather than one continuous gravity outlet. Pumps, pipes, culverts, capacities, and invert depths are not inferred.',
  },
  receiverEvaluation: {
    candidateRule: 'A current fluid component is a geometric candidate only when a component cell is the same as or face-adjacent to a frozen collection-datum cell at a profile gravity-low run.',
    candidateCount: receiverCandidates.length,
    candidates: receiverCandidates,
    acceptedReceiverCount: 0,
    acceptedReceivers: [],
    selectedOutfall: null,
    decision: 'NO_ACCEPTABLE_RECEIVER_CAN_BE_SELECTED_UNDER_CURRENT_DEFAULT_NO_DIVERSION',
    reasons: [
      'The selected design criterion changes, creates, removes, merges, splits, reroutes, blocks, exposes, or discharges no current fluid component by default.',
      'No exact receiver ownership/interface contract exists.',
      'No rainfall, groundwater, snowmelt, erosion, capacity, consent, or future-grading model exists.',
      'A geometric same/face adjacency is not discharge permission or capacity evidence.',
    ],
  },
  d05Interface: {
    c1LandTakeMaxX: c1Bounds.maxX,
    mountainHydrologyPrismMinX: mountainBounds.minX,
    clearPlanColumns: clearColumnsToMountain,
    directPlanContact: false,
    currentMountainWaterComponentCount: d05.immutableThreeDimensionalCensus.waterComponents.componentCount,
    currentMountainWaterComponentManifestSha256: d05.immutableThreeDimensionalCensus.waterComponents.manifestSha256,
    status: 'NO_DIRECT_C1_TO_D05_RECEIVER_INTERFACE; ANY LINK_REQUIRES_NEW_EXACT_PATH_OWNER_AND_EXCEPTION',
  },
  evidenceImpact: {
    exactCurrentC1FluidTopologyFrozen: true,
    exactCollectionCoordinationDatumsFrozen: true,
    acceptableOutfallFrozen: false,
    rainfallCapacityClaimed: false,
    groundwaterClaimed: false,
    snowmeltCapacityClaimed: false,
    consentClaimed: false,
    diversionAuthorized: false,
    d02B03Status: 'HOLD_NO_ACCEPTED_OUTFALL_OR_HYDRAULIC_MODEL',
    d02Resolved: false,
    r00Ready: false,
  },
  remainingBlockers: [
    'Select exact constructed drain/cess inverts, pipes, culverts, bridges, sumps, or pumps; the current datums are coordination-only.',
    'Produce exact future terrain and fluid-interaction sets and component before/after accounting.',
    'Provide an exact receiver/outfall owner and interface contract for every intended discharge.',
    'Provide accepted Minecraft-domain rainfall, groundwater-like void, snowmelt, erosion, and capacity rules without claiming real-world engineering.',
    'Obtain explicit sole-authority acceptance of any enumerated exception to default no-diversion.',
    'Repeat against a complete immutable copied save when entity, POI, and level metadata matter to the selected system.',
  ],
  nextAutonomousWork: [
    'Use the exact internal gravity-low runs to compile closed, capped sump alternatives with zero discharge.',
    'Compile exact no-change bridge/culvert avoidance alternatives around current intersecting components.',
    'Defer any receiver selection until exact future interaction cells, component accounting, and an owner/interface exception exist.',
  ],
  finalGate: {
    status: 'HOLD_D02_B03_NO_ACCEPTED_OUTFALL_NO_WORLD_EDITS',
    worldEditAuthorized: false,
    reason: 'Current fluid topology and collection geometry are exact, but default no-diversion, internal gravity lows, absent hydraulic criteria, and absent receiver contracts prohibit outfall selection.',
  },
};

function list(items) {
  return items.map((item) => `- ${item}`).join('\n');
}

const markdown = `# D02-S03 C1 hydrology and outfall candidates\n\n`
  + `**Status:** ${report.finalGate.status}  \n`
  + `**Generated:** ${GENERATED_AT}  \n`
  + `**Region snapshot:** \`${snapshot.sha256}\`\n\n`
  + `This read-only audit freezes exact current fluid components and evaluates the C1 road-drain and rail-cess coordination datums under the selected **zero undeclared change / default no-diversion** rule. It selects no outfall, claims no capacity or consent, emits no operations, and leaves D02 on HOLD.\n\n`
  + `## Exact study domain\n\n`
  + `| Core chunks | One-chunk-halo chunks | Cells surveyed | Missing chunks |\n`
  + `|---:|---:|---:|---:|\n`
  + `| ${touchedChunks.size} | ${domainChunks.size} | ${report.studyDomain.surveyedCellCount.toLocaleString('en-US')} | ${fluid.missingChunks.length} |\n\n`
  + `Components touching the halo boundary are marked truncated and cannot be treated as complete receivers.\n\n`
  + `## Current fluid topology\n\n`
  + `| Family | Components | Cells | Boundary-truncated | Manifest |\n`
  + `|---|---:|---:|---:|---|\n`
  + `| Water/waterlogged | ${report.currentFluidComponents.water.componentCount} | ${report.currentFluidComponents.water.cellCount.toLocaleString('en-US')} | ${report.currentFluidComponents.water.boundaryTruncatedComponentCount} | \`${waterManifestSha256}\` |\n`
  + `| Lava | ${report.currentFluidComponents.lava.componentCount} | ${report.currentFluidComponents.lava.cellCount.toLocaleString('en-US')} | ${report.currentFluidComponents.lava.boundaryTruncatedComponentCount} | \`${lavaManifestSha256}\` |\n\n`
  + `Inside the exact C1 land take, ${report.currentFluidComponents.landTakeIntersections.waterCellCount.toLocaleString('en-US')} water-family cells and ${report.currentFluidComponents.landTakeIntersections.lavaCellCount.toLocaleString('en-US')} lava cells belong to ${report.currentFluidComponents.landTakeIntersections.componentCount} components. This is present-state evidence, not permission to modify them.\n\n`
  + `## Collection profiles\n\n`
  + `| System | Columns | Datum cells | Y range | Internal/terminal low runs | Current fluid datum cells | Adjacent components | Continuous one-way gravity outlet |\n`
  + `|---|---:|---:|---|---:|---:|---:|---|\n`
  + `| Road south drain | ${roadCollectionColumns.length} | ${roadDatumEvidence.datumCellCount} | ${roadProfileEvidence.minimumY}..${roadProfileEvidence.maximumY} | ${roadSinks.length} | ${roadDatumEvidence.currentWaterFamilyCells + roadDatumEvidence.currentLavaCells} | ${roadDatumEvidence.sameOrFaceAdjacentComponentIds.length} | ${roadProfileEvidence.continuousOneWayGravityOutlet} |\n`
  + `| Rail north cess | ${railCollectionColumns.length} | ${railDatumEvidence.datumCellCount} | ${railProfileEvidence.minimumY}..${railProfileEvidence.maximumY} | ${railSinks.length} | ${railDatumEvidence.currentWaterFamilyCells + railDatumEvidence.currentLavaCells} | ${railDatumEvidence.sameOrFaceAdjacentComponentIds.length} | ${railProfileEvidence.continuousOneWayGravityOutlet} |\n\n`
  + `Both profiles rise and fall. Their exact low runs are potential sump locations only; no pump, pipe, invert, culvert, bridge, or capacity is inferred.\n\n`
  + `## Receiver decision\n\n`
  + `Geometric receiver candidates at gravity-low interfaces: **${receiverCandidates.length}**. Accepted receivers: **0**.\n\n`
  + `**${report.receiverEvaluation.decision}.** Same/face adjacency does not provide ownership, permission, capacity, or consent. Every candidate would require an explicit exception to the selected no-diversion rule and exact before/after component accounting.\n\n`
  + `The D05 mountain hydrology prism begins ${clearColumnsToMountain + 1} blocks east of the C1 land-take edge, leaving ${clearColumnsToMountain} clear plan columns. It is not a direct receiver interface.\n\n`
  + `## Remaining blockers\n\n${list(report.remainingBlockers)}\n\n`
  + `## Safe autonomous continuation\n\n${list(report.nextAutonomousWork)}\n\n`
  + `No rainfall, groundwater, snowmelt, erosion, capacity, consent, diversion, construction, or world-edit acceptance is claimed.\n`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

console.log(JSON.stringify({
  status: report.status,
  output: relative(OUTPUT),
  markdown: relative(MARKDOWN),
  studyChunks: domainChunks.size,
  studyCells: report.studyDomain.surveyedCellCount,
  waterComponents: report.currentFluidComponents.water.componentCount,
  lavaComponents: report.currentFluidComponents.lava.componentCount,
  landTakeComponents: report.currentFluidComponents.landTakeIntersections.componentCount,
  receiverCandidates: receiverCandidates.length,
  acceptedReceivers: 0,
  operationCellCount: 0,
  d02Resolved: false,
  worldEditAuthorized: false,
}, null, 2));
