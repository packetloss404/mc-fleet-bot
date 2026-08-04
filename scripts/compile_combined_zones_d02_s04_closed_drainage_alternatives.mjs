#!/usr/bin/env node
/**
 * Compile deterministic D02-S04 closed/capped drainage planning alternatives.
 *
 * The compiler derives exact candidate cells from the immutable D02-S03 low
 * runs and reads only the bound copied region files. Candidate cells are
 * planning geometry, never operations or material authorization.
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

const GENERATED_AT = value('--generated-at', '2026-08-04T22:44:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'masterplans/05-combined-zones/phase1-d02-s04-closed-drainage-alternatives.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'masterplans/05-combined-zones/phase1-d02-s04-closed-drainage-alternatives.md',
));

const INPUTS = {
  s03: 'masterplans/05-combined-zones/phase1-d02-s03-hydrology-outfalls.json',
  s01s02: 'masterplans/05-combined-zones/phase1-d02-s01-s02-region-evidence.json',
  civil: 'masterplans/05-combined-zones/phase1-c1-civil-design.json',
  defaults: 'masterplans/05-combined-zones/phase1-d05-conservative-defaults.json',
};

const ROLES = {
  s03: 'exact D02-S03 fluid topology, collection profiles, and low runs',
  s01s02: 'immutable region identity, block-entity boundary, and generated-structure bounds',
  civil: 'exact C1 alignment, land take, drainage offsets, and interface controls',
  defaults: 'default no-diversion and receiver/interface criteria',
};

const WATER_NAMES = new Set(['minecraft:water', 'minecraft:bubble_column']);
const AIR_NAMES = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const DIRECTIONS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

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
    const chunk = { cx, cz, sections, raw };
    this.chunks.set(key, chunk);
    return chunk;
  }

  stateAt(x, y, z) {
    const chunk = this.chunks.get(`${Math.floor(x / 16)},${Math.floor(z / 16)}`);
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

function isGravitySensitive(name) {
  return name === 'minecraft:sand'
    || name === 'minecraft:red_sand'
    || name === 'minecraft:gravel'
    || name === 'minecraft:dragon_egg'
    || name === 'minecraft:scaffolding'
    || name.endsWith('_concrete_powder')
    || name.endsWith('_anvil');
}

function pointKey(x, y, z) {
  return `${x},${y},${z}`;
}

function columnKey(x, z) {
  return `${x},${z}`;
}

function compareCells(left, right) {
  return left.x - right.x || left.y - right.y || left.z - right.z;
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

function offsetPoint(points, station, offset) {
  const point = points[station];
  const tangent = tangentAt(points, station);
  return {
    x: point.x + Math.round(offset * -tangent.z),
    z: point.z + Math.round(offset * tangent.x),
  };
}

function addRole(map, cell, role) {
  const key = pointKey(cell.x, cell.y, cell.z);
  const record = map.get(key) ?? { x: cell.x, y: cell.y, z: cell.z, roles: [] };
  if (!record.roles.includes(role)) record.roles.push(role);
  map.set(key, record);
}

function orderedRoleCells(map) {
  return [...map.values()]
    .map((cell) => ({ ...cell, roles: [...cell.roles].sort() }))
    .sort(compareCells);
}

function hashRoleCells(cells, preamble) {
  const coordinate = crypto.createHash('sha256');
  const role = crypto.createHash('sha256');
  coordinate.update(`${preamble}-coordinates\n`);
  role.update(`${preamble}-roles\n`);
  for (const cell of [...cells].sort(compareCells)) {
    coordinate.update(`${cell.x},${cell.y},${cell.z}\n`);
    role.update(`${cell.x},${cell.y},${cell.z},${[...(cell.roles ?? [])].sort().join('+')}\n`);
  }
  return { coordinateSetSha256: coordinate.digest('hex'), roleStreamSha256: role.digest('hex') };
}

function hashCoordinateCells(cells, preamble) {
  const digest = crypto.createHash('sha256');
  digest.update(`${preamble}\n`);
  for (const cell of [...cells].sort(compareCells)) digest.update(`${cell.x},${cell.y},${cell.z}\n`);
  return digest.digest('hex');
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

function manifest(cells, preamble, includeCells = true) {
  const normalized = new Map();
  for (const cell of cells) {
    for (const role of cell.roles ?? []) addRole(normalized, cell, role);
  }
  const ordered = orderedRoleCells(normalized);
  return {
    cellCount: ordered.length,
    ...hashRoleCells(ordered, preamble),
    bounds: boundsOf(ordered),
    ...(includeCells ? { cells: ordered } : {}),
  };
}

function localSumpGeometry(system, lowRun, station, centerline, civil, includePump) {
  const road = system === 'road';
  const outerOffset = road ? 19 : -30;
  const footprintOffsets = road ? [18, 19, 20] : [-31, -30, -29];
  const datumY = road
    ? civil.horizontalAlignment.stations[station].highwaySouthEdgeY
    : civil.horizontalAlignment.stations[station].railFormationY;
  const cells = new Map();
  for (const footprintStation of [station - 1, station, station + 1]) {
    if (footprintStation < 0 || footprintStation >= centerline.length) continue;
    for (const offset of footprintOffsets) {
      const point = offsetPoint(centerline, footprintStation, offset);
      for (let y = datumY - 5; y <= datumY - 1; y++) addRole(cells, { ...point, y }, 'SUMP_EXCAVATION_ENVELOPE');
      addRole(cells, { ...point, y: datumY }, 'SEALED_CAP_ENVELOPE');
    }
  }
  const center = offsetPoint(centerline, station, outerOffset);
  if (includePump) {
    for (let y = datumY - 4; y <= datumY - 2; y++) addRole(cells, { ...center, y }, 'PUMP_EQUIPMENT_SOCKET');
    addRole(cells, { ...center, y: datumY - 1 }, 'PUMP_POWER_CONTROL_INTERFACE');
  }
  const interfaceOffsets = road ? [18, 19] : [-30, -29];
  const inletCells = interfaceOffsets.map((offset) => {
    const point = offsetPoint(centerline, station, offset);
    return { ...point, y: datumY, roles: ['COLLECTION_INLET_INTERFACE'] };
  }).sort(compareCells);
  return {
    system,
    lowRunId: lowRun.id,
    anchorStation: station,
    anchorOffset: outerOffset,
    datumY,
    center: { ...center, y: datumY - 3 },
    cells: orderedRoleCells(cells),
    inletCells,
  };
}

function facePath(from, to) {
  const cells = [];
  const cursor = { ...from };
  const push = () => cells.push({ ...cursor });
  push();
  for (const axis of ['x', 'z', 'y']) {
    while (cursor[axis] !== to[axis]) {
      cursor[axis] += Math.sign(to[axis] - cursor[axis]);
      push();
    }
  }
  return cells;
}

function addFacePath(map, from, to, role) {
  for (const cell of facePath(from, to)) addRole(map, cell, role);
}

function buildForceMain(system, centerline, civil, localAssets) {
  const road = system === 'road';
  const offset = road ? 21 : -32;
  const cells = new Map();
  let previous = null;
  for (let station = 0; station < centerline.length; station++) {
    const point = offsetPoint(centerline, station, offset);
    const datumY = road
      ? civil.horizontalAlignment.stations[station].highwaySouthEdgeY
      : civil.horizontalAlignment.stations[station].railFormationY;
    const current = { ...point, y: datumY - 3 };
    if (previous) addFacePath(cells, previous, current, 'SEALED_FORCE_MAIN_ENVELOPE');
    else addRole(cells, current, 'SEALED_FORCE_MAIN_ENVELOPE');
    previous = current;
  }
  for (const asset of localAssets) {
    const point = offsetPoint(centerline, asset.anchorStation, offset);
    const target = { ...point, y: asset.datumY - 3 };
    addFacePath(cells, asset.center, target, 'CAPPED_PUMP_CONNECTION_ENVELOPE');
  }
  const terminalStations = [0, 1, 2, 3, 4];
  const terminalOffsets = road ? [20, 21, 22, 23, 24] : [-35, -34, -33, -32, -31];
  const terminalDatumY = road
    ? civil.horizontalAlignment.stations[0].highwaySouthEdgeY
    : civil.horizontalAlignment.stations[0].railFormationY;
  for (const station of terminalStations) {
    for (const terminalOffset of terminalOffsets) {
      const point = offsetPoint(centerline, station, terminalOffset);
      for (let y = terminalDatumY - 8; y <= terminalDatumY - 3; y++) {
        addRole(cells, { ...point, y }, 'CLOSED_TERMINAL_TANK_ENVELOPE');
      }
      addRole(cells, { ...point, y: terminalDatumY - 2 }, 'SEALED_TERMINAL_CAP_ENVELOPE');
    }
  }
  return orderedRoleCells(cells);
}

function reconstructLowInterface(system, lowRun, centerline, civil) {
  const offsets = system === 'road' ? [18, 19] : [-30, -29];
  const map = new Map();
  for (let station = lowRun.startStation; station <= lowRun.endStation; station++) {
    const datumY = system === 'road'
      ? civil.horizontalAlignment.stations[station].highwaySouthEdgeY
      : civil.horizontalAlignment.stations[station].railFormationY;
    for (const offset of offsets) {
      const point = offsetPoint(centerline, station, offset);
      addRole(map, { ...point, y: datumY }, 'LOW_RUN_NO_CULVERT_PRESERVATION_CELL');
    }
  }
  return orderedRoleCells(map);
}

function pointInsideBounds(cell, bounds) {
  return cell.x >= bounds.minX && cell.x <= bounds.maxX
    && cell.y >= bounds.minY && cell.y <= bounds.maxY
    && cell.z >= bounds.minZ && cell.z <= bounds.maxZ;
}

async function loadCellsAndNeighbors(reader, cells) {
  const chunks = new Map();
  for (const cell of cells) {
    for (const [dx, , dz] of [[0, 0, 0], ...DIRECTIONS]) {
      const cx = Math.floor((cell.x + dx) / 16);
      const cz = Math.floor((cell.z + dz) / 16);
      chunks.set(`${cx},${cz}`, { cx, cz });
    }
  }
  const missing = [];
  for (const chunk of [...chunks.values()].sort((left, right) => left.cx - right.cx || left.cz - right.cz)) {
    if (!await reader.readChunk(chunk.cx, chunk.cz)) missing.push(chunk);
  }
  assert(missing.length === 0, `candidate geometry has ${missing.length} missing region chunks`);
  return { chunkCount: chunks.size, missingChunks: missing };
}

function blockEntityMap(reader) {
  const result = new Map();
  for (const chunk of reader.chunks.values()) {
    if (!chunk) continue;
    for (const entity of chunk.raw.block_entities ?? chunk.raw.blockEntities ?? []) {
      const record = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z), id: entity.id ?? 'UNKNOWN' };
      result.set(pointKey(record.x, record.y, record.z), record);
    }
  }
  return result;
}

function auditGeometry(cells, context, preamble) {
  const ordered = [...cells].sort(compareCells);
  const candidateKeys = new Set(ordered.map((cell) => pointKey(cell.x, cell.y, cell.z)));
  const stateDigest = crypto.createHash('sha256');
  stateDigest.update(`${preamble}-current-state-stream\n`);
  let airLikeCells = 0;
  let nonAirCells = 0;
  let waterFamilyCells = 0;
  let lavaCells = 0;
  let gravitySensitiveCells = 0;
  let outsideLandTakeCells = 0;
  const blockEntities = [];
  const structureIntersections = new Map();
  const civilInterfaceIntersections = new Map();
  const crossroadForbiddenCells = [];
  const adjacentFluids = new Map();
  for (const cell of ordered) {
    const state = context.reader.stateAt(cell.x, cell.y, cell.z);
    const stateText = canonicalState(state);
    const family = fluidFamily(state);
    stateDigest.update(`${cell.x},${cell.y},${cell.z},${stateText}\n`);
    if (AIR_NAMES.has(state.Name)) airLikeCells++;
    else nonAirCells++;
    if (family === 'water') waterFamilyCells++;
    if (family === 'lava') lavaCells++;
    if (isGravitySensitive(state.Name)) gravitySensitiveCells++;
    if (!context.landTakeColumns.has(columnKey(cell.x, cell.z))) outsideLandTakeCells++;
    const entity = context.blockEntities.get(pointKey(cell.x, cell.y, cell.z));
    if (entity) blockEntities.push(entity);
    for (const structure of context.structures) {
      if (pointInsideBounds(cell, structure.bounds)) structureIntersections.set(structure.id, structure);
    }
    for (const feature of context.civilInterfaces) {
      const bounds = {
        minX: feature.extent.minX,
        maxX: feature.extent.maxX,
        minY: feature.featureBaseY,
        maxY: feature.featureTopY,
        minZ: feature.extent.minZ,
        maxZ: feature.extent.maxZ,
      };
      if (pointInsideBounds(cell, bounds)) civilInterfaceIntersections.set(feature.feature, feature.feature);
    }
    if (context.crossroadForbiddenColumns.has(columnKey(cell.x, cell.z))) crossroadForbiddenCells.push(cell);
    for (const [dx, dy, dz] of DIRECTIONS) {
      const x = cell.x + dx;
      const y = cell.y + dy;
      const z = cell.z + dz;
      if (candidateKeys.has(pointKey(x, y, z))) continue;
      const adjacentState = context.reader.stateAt(x, y, z);
      const adjacentFamily = fluidFamily(adjacentState);
      if (adjacentFamily) {
        adjacentFluids.set(pointKey(x, y, z), {
          x,
          y,
          z,
          family: adjacentFamily,
          state: canonicalState(adjacentState),
        });
      }
    }
  }
  const orderedAdjacent = [...adjacentFluids.values()].sort(compareCells);
  const adjacentDigest = crypto.createHash('sha256');
  adjacentDigest.update(`${preamble}-face-adjacent-current-fluids\n`);
  for (const cell of orderedAdjacent) adjacentDigest.update(`${cell.x},${cell.y},${cell.z},${cell.state}\n`);
  const strictNoCurrentFluidInteraction = waterFamilyCells === 0
    && lavaCells === 0
    && orderedAdjacent.length === 0;
  const planningGeometryClear = strictNoCurrentFluidInteraction
    && blockEntities.length === 0
    && structureIntersections.size === 0
    && civilInterfaceIntersections.size === 0
    && crossroadForbiddenCells.length === 0
    && outsideLandTakeCells === 0;
  return {
    currentStateSetSha256: stateDigest.digest('hex'),
    airLikeCells,
    nonAirCells,
    waterFamilyCells,
    lavaCells,
    gravitySensitiveCells,
    faceAdjacentCurrentFluidCellCount: orderedAdjacent.length,
    faceAdjacentCurrentFluidSetSha256: adjacentDigest.digest('hex'),
    faceAdjacentCurrentFluidCells: orderedAdjacent,
    blockEntityIntersectionCount: blockEntities.length,
    blockEntityIntersections: blockEntities.sort(compareCells),
    generatedStructureBoundsIntersectionCount: structureIntersections.size,
    generatedStructureBoundsIntersections: [...structureIntersections.values()].sort((a, b) => a.id.localeCompare(b.id)),
    civilThreeDimensionalInterfaceIntersectionCount: civilInterfaceIntersections.size,
    civilThreeDimensionalInterfaceIntersections: [...civilInterfaceIntersections.keys()].sort(),
    dataDistrictCrossroadForbiddenCellCount: crossroadForbiddenCells.length,
    outsideExactLandTakeCellCount: outsideLandTakeCells,
    strictNoCurrentFluidInteraction,
    planningGeometryClear,
    qualification: 'Current immutable region states and six-face neighbors only; not excavation stability, capacity, constructability, entity clearance, or future-state proof.',
  };
}

function scoreAudit(audit, station, midpoint) {
  return [
    audit.waterFamilyCells + audit.lavaCells,
    audit.faceAdjacentCurrentFluidCellCount,
    audit.blockEntityIntersectionCount,
    audit.generatedStructureBoundsIntersectionCount,
    audit.civilThreeDimensionalInterfaceIntersectionCount,
    audit.dataDistrictCrossroadForbiddenCellCount,
    audit.outsideExactLandTakeCellCount,
    audit.gravitySensitiveCells,
    Math.abs(station - midpoint),
    station,
  ];
}

function compareScores(left, right) {
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0);
    if (delta) return delta;
  }
  return 0;
}

function mergeCells(parts) {
  const map = new Map();
  for (const cells of parts) {
    for (const cell of cells) {
      for (const role of cell.roles ?? []) addRole(map, cell, role);
    }
  }
  return orderedRoleCells(map);
}

function ownershipInstance(asset, alternativeId, includePump) {
  return {
    assetId: `${alternativeId}-${asset.lowRunId}`,
    system: asset.system === 'road' ? 'C1_ROAD_SOUTH_DRAIN' : 'C1_RAIL_NORTH_CESS',
    lowRunId: asset.lowRunId,
    provisionalOwnerKey: 'D02_C1_DRAINAGE_OWNER_UNASSIGNED',
    ownerStatus: 'UNASSIGNED_REQUIRES_SOLE_AUTHORITY_ACCEPTANCE',
    exactAssetCellManifest: manifest(asset.cells, `combined-zones-d02-s04-${alternativeId}-${asset.lowRunId}`, false),
    interfaces: {
      collectionInlet: {
        interfaceId: `${alternativeId}-${asset.lowRunId}-INLET`,
        upstreamOwnerKey: asset.system === 'road' ? 'C1_ROAD_COLLECTION_OWNER_UNASSIGNED' : 'C1_RAIL_CESS_OWNER_UNASSIGNED',
        downstreamOwnerKey: 'D02_C1_DRAINAGE_OWNER_UNASSIGNED',
        cellManifest: manifest(asset.inletCells, `combined-zones-d02-s04-${alternativeId}-${asset.lowRunId}-inlet`, true),
        acceptanceStatus: 'UNACCEPTED_PLANNING_INTERFACE',
      },
      pumpPowerAndControl: includePump ? {
        interfaceId: `${alternativeId}-${asset.lowRunId}-PUMP-POWER-CONTROL`,
        providerOwnerKey: 'C1_POWER_AND_CONTROL_OWNER_UNASSIGNED',
        consumerOwnerKey: 'D02_C1_DRAINAGE_OWNER_UNASSIGNED',
        acceptanceStatus: 'UNACCEPTED_NO_DUTY_STANDBY_POWER_OR_CONTROL_BASIS',
      } : null,
      overflow: {
        interfaceId: `${alternativeId}-${asset.lowRunId}-OVERFLOW`,
        cellManifest: manifest([], `combined-zones-d02-s04-${alternativeId}-${asset.lowRunId}-overflow`, true),
        receiverId: null,
        status: 'PROHIBITED_UNDER_DEFAULT_NO_DIVERSION',
      },
      outfall: {
        interfaceId: `${alternativeId}-${asset.lowRunId}-OUTFALL`,
        cellManifest: manifest([], `combined-zones-d02-s04-${alternativeId}-${asset.lowRunId}-outfall`, true),
        receiverId: null,
        ownerId: null,
        status: 'PROHIBITED_UNDER_DEFAULT_NO_DIVERSION',
      },
      maintenanceAccess: {
        ownerKey: 'D02_C1_OPERATIONS_OWNER_UNASSIGNED',
        routeCellManifest: null,
        status: 'UNDEFINED_AND_UNACCEPTED',
      },
    },
  };
}

const s03 = readJson(INPUTS.s03);
const s01s02 = readJson(INPUTS.s01s02);
const civil = readJson(INPUTS.civil);
const defaults = readJson(INPUTS.defaults);

assert(s03.status === 'PARTIAL_PASS_EXACT_CURRENT_COMPONENTS_NO_ACCEPTABLE_OUTFALL_D02_HOLD', 'S03 status drift');
assert(s03.safetyBoundary.operationCellCount === 0 && s03.safetyBoundary.diversionAuthorized === false, 'S03 safety boundary drift');
assert(s03.receiverEvaluation.acceptedReceiverCount === 0 && s03.receiverEvaluation.selectedOutfall === null, 'S03 receiver decision drift');
assert(s01s02.status === 'PARTIAL_PASS_REGION_FACTS_COMPLETE_SAVE_MISSING_D02_HOLD', 'S01/S02 status drift');
assert(civil.status === 'PARTIAL_PASS_D02_HOLD', 'civil status drift');
assert(defaults.soleAuthorityRecommendations.preservationAndNoDiversionCriteria.recommendation
  === 'ADOPT_ZERO_UNDECLARED_CHANGE_AND_DEFAULT_NO_DIVERSION', 'default no-diversion drift');
const selectedNoDiversion = s03.immutableEvidenceIdentity.selectedNoDiversionRule;
assert(selectedNoDiversion?.selectionId === 'SEL-D05-ZERO-UNDECLARED-CHANGE', 'S03 selected no-diversion identity missing');
assert(selectedNoDiversion.selection === 'ADOPT_ZERO_UNDECLARED_CHANGE_AND_DEFAULT_NO_DIVERSION', 'S03 selected no-diversion rule missing');
assert(selectedNoDiversion.technicalAcceptanceClaimed === false, 'no-diversion selection cannot claim technical acceptance');

const sourceBindings = Object.entries(INPUTS).map(([key, filename]) => fileBinding(filename, ROLES[key]));
const snapshot = s01s02.selectedRegionOnlyEvidence.identity;
assert(snapshot.sha256 === s03.immutableEvidenceIdentity.regionSnapshot.sha256, 'snapshot drift between S03 and S01/S02');
assert(snapshot.sha256 === civil.immutableSnapshot.sha256, 'snapshot drift between civil and S01/S02');

const centerline = civil.horizontalAlignment.stations.map((station) => ({ x: station.x, z: station.z }));
const landTakeColumns = new Set();
for (let station = 0; station < centerline.length; station++) {
  for (let offset = civil.crossSection.totalLandTake.offsetFrom; offset <= civil.crossSection.totalLandTake.offsetTo; offset++) {
    const point = offsetPoint(centerline, station, offset);
    landTakeColumns.add(columnKey(point.x, point.z));
  }
}
assert(landTakeColumns.size === civil.crossSection.totalLandTake.uniqueColumnCount, 'land-take reconstruction drift');

const crossroad = civil.interfaces.dataDistrictCrossroad;
const crossroadForbiddenColumns = new Set();
for (let offset = civil.crossSection.reservedRailStrip.offsetFrom; offset <= civil.crossSection.reservedRailStrip.offsetTo; offset++) {
  const point = offsetPoint(centerline, crossroad.nearestReferenceStation, offset);
  crossroadForbiddenColumns.add(columnKey(point.x, point.z));
}

const lowRuns = [
  ...s03.collectionSystems.roadSouthDrain.gravityLowInterfaces.map((run) => ({ ...run, system: 'road' })),
  ...s03.collectionSystems.railNorthCess.gravityLowInterfaces.map((run) => ({ ...run, system: 'rail' })),
];
assert(lowRuns.length === 11, 'expected 11 exact S03 low runs');

const interfaceCells = [];
for (const lowRun of lowRuns) {
  const reconstructed = reconstructLowInterface(lowRun.system, lowRun, centerline, civil);
  assert(reconstructed.length === lowRun.interfaceCellCount, `${lowRun.id} interface count drift`);
  const reconstructedHash = hashCoordinateCells(
    reconstructed,
    `combined-zones-d02-s03-${lowRun.system}-low-interface-v1`,
  );
  assert(reconstructedHash === lowRun.interfaceCellSetSha256, `${lowRun.id} interface hash drift`);
  interfaceCells.push(...reconstructed);
}

const proposalGeometries = [];
for (const lowRun of lowRuns) {
  for (let station = lowRun.startStation; station <= lowRun.endStation; station++) {
    proposalGeometries.push(localSumpGeometry(lowRun.system, lowRun, station, centerline, civil, false));
  }
}

const forceMainPreview = [
  buildForceMain('road', centerline, civil, []),
  buildForceMain('rail', centerline, civil, []),
];
const reader = new SnapshotReader(path.resolve(snapshot.path));
const loadEvidence = await loadCellsAndNeighbors(reader, [
  ...proposalGeometries.flatMap((proposal) => proposal.cells),
  ...forceMainPreview.flat(),
  ...interfaceCells,
]);
const context = {
  reader,
  landTakeColumns,
  blockEntities: blockEntityMap(reader),
  structures: s01s02.d02S01.relevantGeneratedStructureStarts.records,
  civilInterfaces: civil.interfaces.c01,
  crossroadForbiddenColumns,
};

const selectedLocalAssets = [];
const anchorSelectionEvidence = [];
for (const lowRun of lowRuns) {
  const midpoint = (lowRun.startStation + lowRun.endStation) / 2;
  const candidates = proposalGeometries.filter((proposal) => proposal.lowRunId === lowRun.id);
  const evaluated = candidates.map((candidate) => {
    const audit = auditGeometry(candidate.cells, context, `combined-zones-d02-s04-anchor-${candidate.lowRunId}-${candidate.anchorStation}`);
    return { candidate, audit, score: scoreAudit(audit, candidate.anchorStation, midpoint) };
  }).sort((left, right) => compareScores(left.score, right.score));
  const selected = evaluated[0];
  assert(selected, `no anchor candidates for ${lowRun.id}`);
  selectedLocalAssets.push({ ...selected.candidate, audit: selected.audit });
  anchorSelectionEvidence.push({
    lowRunId: lowRun.id,
    system: lowRun.system,
    evaluatedAnchorCount: evaluated.length,
    strictClearAnchorCount: evaluated.filter((entry) => entry.audit.planningGeometryClear).length,
    selectedAnchorStation: selected.candidate.anchorStation,
    selectedAnchorScore: selected.score,
    selectedAudit: selected.audit,
    rankingRule: 'Lexicographically minimize same-cell fluid, face-adjacent fluid, block entities, generated bounds, civil interfaces, crossroad conflicts, outside-land-take cells, gravity-sensitive cells, midpoint distance, then station.',
  });
}

const altACells = mergeCells(selectedLocalAssets.map((asset) => asset.cells));
const altAAudit = auditGeometry(altACells, context, 'combined-zones-d02-s04-alt-a');
const pumpedAssets = selectedLocalAssets.map((asset) => localSumpGeometry(
  asset.system,
  lowRuns.find((run) => run.id === asset.lowRunId),
  asset.anchorStation,
  centerline,
  civil,
  true,
));
const roadPumpedAssets = pumpedAssets.filter((asset) => asset.system === 'road');
const railPumpedAssets = pumpedAssets.filter((asset) => asset.system === 'rail');
const roadForceMain = buildForceMain('road', centerline, civil, roadPumpedAssets);
const railForceMain = buildForceMain('rail', centerline, civil, railPumpedAssets);
const altBCells = mergeCells([...pumpedAssets.map((asset) => asset.cells), roadForceMain, railForceMain]);
await loadCellsAndNeighbors(reader, altBCells);
context.blockEntities = blockEntityMap(reader);
const altBAudit = auditGeometry(altBCells, context, 'combined-zones-d02-s04-alt-b');
const altCCells = mergeCells([interfaceCells]);
const altCAudit = auditGeometry(altCCells, context, 'combined-zones-d02-s04-alt-c-preservation');
const strictClearLocalAssets = selectedLocalAssets.filter((asset) => asset.audit.planningGeometryClear);
const heldLocalAssets = selectedLocalAssets.filter((asset) => !asset.audit.planningGeometryClear);
const heldLowRunIds = new Set(heldLocalAssets.map((asset) => asset.lowRunId));
const heldPreservationCells = mergeCells(lowRuns
  .filter((run) => heldLowRunIds.has(run.id))
  .map((run) => reconstructLowInterface(run.system, run, centerline, civil)));
const altDCells = mergeCells(strictClearLocalAssets.map((asset) => asset.cells));
const altDAudit = auditGeometry(altDCells, context, 'combined-zones-d02-s04-alt-d');
const altDPreservationAudit = auditGeometry(
  heldPreservationCells,
  context,
  'combined-zones-d02-s04-alt-d-held-preservation',
);

const ownershipSchema = {
  schemaVersion: 1,
  requiredFields: [
    'assetId',
    'system',
    'lowRunId',
    'provisionalOwnerKey',
    'ownerStatus',
    'exactAssetCellManifest',
    'interfaces.collectionInlet',
    'interfaces.pumpPowerAndControl',
    'interfaces.overflow',
    'interfaces.outfall',
    'interfaces.maintenanceAccess',
  ],
  invariant: 'No candidate becomes owned, accepted, operable, or constructible until every owner key is replaced by an accepted identity and every required interface binds an exact cell manifest and explicit acceptance.',
  defaultNoDiversionInvariant: 'Overflow and outfall interfaces must have zero cells, null receiver/owner identities, and PROHIBITED status unless a separately enumerated sole-authority exception and exact future component accounting are bound.',
};

const alternatives = [
  {
    id: 'ALT-D02-S04-A-DISTRIBUTED-CAPPED-SUMPS',
    title: 'Distributed capped local sumps without pumps or cross-corridor transfer',
    concept: 'One sealed planning chamber at each exact gravity-low run. No pump, main, overflow, culvert, receiver, or outfall is present.',
    lowRunsCovered: selectedLocalAssets.length,
    sumpCount: selectedLocalAssets.length,
    pumpSocketCount: 0,
    forceMainCount: 0,
    terminalTankCount: 0,
    culvertCandidateCells: [],
    overflowCandidateCells: [],
    outfallCandidateCells: [],
    candidateCellManifest: manifest(altACells, 'combined-zones-d02-s04-alt-a', true),
    currentRegionAudit: altAAudit,
    assetRecords: selectedLocalAssets.map((asset) => ({
      id: `ALT-D02-S04-A-${asset.lowRunId}`,
      lowRunId: asset.lowRunId,
      system: asset.system,
      anchorStation: asset.anchorStation,
      datumY: asset.datumY,
      geometry: manifest(asset.cells, `combined-zones-d02-s04-alt-a-${asset.lowRunId}`, true),
      audit: asset.audit,
    })),
    ownershipAndInterfaces: selectedLocalAssets.map((asset) => ownershipInstance(asset, 'ALT-D02-S04-A', false)),
    planningDisposition: altAAudit.planningGeometryClear
      ? 'ELIGIBLE_FOR_PREFERRED_PLANNING_GEOMETRY_ONLY'
      : 'REJECTED_CURRENT_REGION_OR_INTERFACE_INTERACTION',
    technicalAcceptanceClaimed: false,
  },
  {
    id: 'ALT-D02-S04-B-PUMPED-SEALED-MAINS-TO-CLOSED-TANKS',
    title: 'Distributed pump sockets and two sealed force mains to closed terminal tanks',
    concept: 'One pump socket at each low run, one sealed main per collection system, and one closed terminal tank per system. No overflow, receiver, or outfall is present.',
    lowRunsCovered: pumpedAssets.length,
    sumpCount: pumpedAssets.length,
    pumpSocketCount: pumpedAssets.length,
    forceMainCount: 2,
    terminalTankCount: 2,
    culvertCandidateCells: [],
    overflowCandidateCells: [],
    outfallCandidateCells: [],
    candidateCellManifest: manifest(altBCells, 'combined-zones-d02-s04-alt-b', true),
    componentManifests: {
      roadForceMainAndTank: manifest(roadForceMain, 'combined-zones-d02-s04-alt-b-road-main', false),
      railForceMainAndTank: manifest(railForceMain, 'combined-zones-d02-s04-alt-b-rail-main', false),
    },
    currentRegionAudit: altBAudit,
    ownershipAndInterfaces: pumpedAssets.map((asset) => ownershipInstance(asset, 'ALT-D02-S04-B', true)),
    additionalUnacceptedInterfaces: [
      'Two terminal tank ownership and maintenance-access interfaces',
      'Eleven pump power, control, duty/standby, failure-alarm, and recovery interfaces',
      'Two sealed-main pressure and isolation interfaces',
    ],
    planningDisposition: altBAudit.planningGeometryClear
      ? 'GEOMETRICALLY_CLEAR_BUT_NOT_PREFERRED_DUE_TO_LARGER_FOOTPRINT_AND_MORE_UNACCEPTED_INTERFACES'
      : 'REJECTED_CURRENT_REGION_OR_INTERFACE_INTERACTION',
    technicalAcceptanceClaimed: false,
  },
  {
    id: 'ALT-D02-S04-C-NO-BUILD-CULVERT-AVOIDANCE-BASELINE',
    title: 'No-build low-run preservation and culvert-avoidance baseline',
    concept: 'Reserve every exact low-run interface cell, create no drainage asset, and prohibit culvert, overflow, receiver, or outfall cells.',
    lowRunsCovered: lowRuns.length,
    sumpCount: 0,
    pumpSocketCount: 0,
    forceMainCount: 0,
    terminalTankCount: 0,
    culvertCandidateCells: [],
    overflowCandidateCells: [],
    outfallCandidateCells: [],
    preservationCellManifest: manifest(altCCells, 'combined-zones-d02-s04-alt-c-preservation', true),
    currentRegionAudit: altCAudit,
    planningDisposition: 'CONTROL_BASELINE_ONLY_DOES_NOT_PROVIDE_COLLECTION_OR_CAPACITY',
    technicalAcceptanceClaimed: false,
  },
  {
    id: 'ALT-D02-S04-D-HYBRID-CAPPED-SUMPS-WITH-AQUATIC-NO-BUILD-HOLD',
    title: 'Strict-clear capped sumps plus exact no-build holds at fluid-interacting low runs',
    concept: 'Use a local capped sump only where the immutable current-region gate is strict-clear. Preserve every rejected low run without a chamber, pump, pipe, culvert, overflow, receiver, or outfall.',
    lowRunDispositionCount: strictClearLocalAssets.length + heldLocalAssets.length,
    sumpCount: strictClearLocalAssets.length,
    noBuildPreservationHoldCount: heldLocalAssets.length,
    pumpSocketCount: 0,
    forceMainCount: 0,
    terminalTankCount: 0,
    culvertCandidateCells: [],
    overflowCandidateCells: [],
    outfallCandidateCells: [],
    candidateCellManifest: manifest(altDCells, 'combined-zones-d02-s04-alt-d', true),
    heldLowRunPreservationCellManifest: manifest(
      heldPreservationCells,
      'combined-zones-d02-s04-alt-d-held-preservation',
      true,
    ),
    currentRegionAudit: altDAudit,
    heldLowRunPreservationAudit: altDPreservationAudit,
    lowRunDispositions: [
      ...strictClearLocalAssets.map((asset) => ({
        lowRunId: asset.lowRunId,
        disposition: 'CAPPED_LOCAL_SUMP_PLANNING_GEOMETRY',
        anchorStation: asset.anchorStation,
        candidateCellCount: asset.cells.length,
        currentFluidSameCellCount: asset.audit.waterFamilyCells + asset.audit.lavaCells,
        currentFluidFaceAdjacentCellCount: asset.audit.faceAdjacentCurrentFluidCellCount,
      })),
      ...heldLocalAssets.map((asset) => ({
        lowRunId: asset.lowRunId,
        disposition: 'NO_BUILD_PRESERVATION_HOLD_CURRENT_FLUID_INTERACTION',
        rejectedAnchorStation: asset.anchorStation,
        rejectedCandidateCellCount: asset.cells.length,
        currentFluidSameCellCount: asset.audit.waterFamilyCells + asset.audit.lavaCells,
        currentFluidFaceAdjacentCellCount: asset.audit.faceAdjacentCurrentFluidCellCount,
      })),
    ].sort((left, right) => left.lowRunId.localeCompare(right.lowRunId)),
    ownershipAndInterfaces: strictClearLocalAssets.map((asset) => ownershipInstance(asset, 'ALT-D02-S04-D', false)),
    heldOwnershipAndInterfaceRecords: heldLocalAssets.map((asset) => ({
      lowRunId: asset.lowRunId,
      ownerStatus: 'UNASSIGNED_NO_ASSET_SELECTED',
      collectionOwnerKey: asset.system === 'road'
        ? 'C1_ROAD_COLLECTION_OWNER_UNASSIGNED'
        : 'C1_RAIL_CESS_OWNER_UNASSIGNED',
      drainageAssetId: null,
      pumpPowerAndControlInterface: null,
      overflowInterface: null,
      outfallInterface: null,
      status: 'NO_BUILD_PRESERVATION_HOLD',
    })),
    planningDisposition: altDAudit.planningGeometryClear
      && altDPreservationAudit.strictNoCurrentFluidInteraction
      ? 'ELIGIBLE_FOR_PREFERRED_PLANNING_GEOMETRY_ONLY_WITH_EXPLICIT_UNSERVED_HOLD'
      : 'REJECTED_CURRENT_REGION_OR_INTERFACE_INTERACTION',
    technicalAcceptanceClaimed: false,
  },
];

const altA = alternatives[0];
const altB = alternatives[1];
const altD = alternatives[3];
const preferredEligible = altDAudit.planningGeometryClear
  && altDPreservationAudit.strictNoCurrentFluidInteraction
  && altD.lowRunDispositionCount === lowRuns.length
  && altD.sumpCount > 0
  && altD.noBuildPreservationHoldCount > 0
  && altD.candidateCellManifest.cellCount < altA.candidateCellManifest.cellCount
  && altD.candidateCellManifest.cellCount < altB.candidateCellManifest.cellCount
  && altD.pumpSocketCount < altB.pumpSocketCount
  && altD.overflowCandidateCells.length === 0
  && altD.outfallCandidateCells.length === 0;

const preferredPlanningAlternative = preferredEligible ? {
  alternativeId: altD.id,
  status: 'PREFERRED_FOR_FURTHER_OFFLINE_TECHNICAL_DEVELOPMENT_ONLY',
  selectionBasis: [
    `Assigns an explicit disposition to all 11 exact gravity-low runs: ${altD.sumpCount} strict-clear capped-sump candidates and ${altD.noBuildPreservationHoldCount} no-build preservation hold.`,
    'Has zero same-cell or face-adjacent current fluid cells in the immutable region evidence.',
    'Has zero block-entity, generated-structure-bound, known civil-interface, Data District crossroad, or outside-land-take intersections.',
    'Excludes rather than modifies the road terminal candidate whose chamber envelope intersects current water.',
    'Uses fewer exact candidate cells and no pump/power/main/tank interfaces compared with Alternatives A and B.',
    'Creates no culvert, overflow, receiver, or outfall candidate cells.',
  ],
  nonAcceptanceBoundary: 'Preference ranks planning geometry only and deliberately leaves one low run without a drainage asset. It is not hydraulic, geotechnical, structural, operational, ownership, safety, capacity, construction, or world-edit acceptance.',
  technicalAcceptanceClaimed: false,
  worldEditAuthorized: false,
} : null;

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-d02-s04-closed-drainage-alternatives',
  generatedAtUtc: GENERATED_AT,
  status: preferredPlanningAlternative
    ? 'PARTIAL_PASS_PREFERRED_CLOSED_SUMP_PLANNING_GEOMETRY_D02_HOLD'
    : 'PARTIAL_PASS_ALTERNATIVES_COMPILED_NO_PREFERRED_GEOMETRY_D02_HOLD',
  purpose: 'Deterministic closed/capped C1 drainage planning alternatives derived from every exact D02-S03 gravity-low run under default no-diversion.',
  safetyBoundary: {
    immutableRegionReadOnly: true,
    regionOnlyEvidence: true,
    completeCopiedSaveAvailable: false,
    mutableProseDependencies: [],
    r00Dependencies: [],
    liveCallsPerformed: [],
    databasesOpened: [],
    operationCells: [],
    materialCells: [],
    operationCellCount: 0,
    candidateCellsAreOperations: false,
    diversionAuthorized: false,
    constructionAuthorized: false,
    worldEditAuthorized: false,
    technicalAcceptanceClaimed: false,
    d02Resolved: false,
  },
  sourceBindings,
  immutableEvidenceIdentity: {
    regionSnapshot: snapshot,
    s03FluidTopology: {
      waterManifestSha256: s03.currentFluidComponents.water.manifestSha256,
      lavaManifestSha256: s03.currentFluidComponents.lava.manifestSha256,
      acceptedReceiverCount: s03.receiverEvaluation.acceptedReceiverCount,
      selectedOutfall: s03.receiverEvaluation.selectedOutfall,
    },
    selectedNoDiversionRule: {
      selectionId: selectedNoDiversion.selectionId,
      selection: selectedNoDiversion.selection,
      technicalAcceptanceClaimed: selectedNoDiversion.technicalAcceptanceClaimed,
    },
    candidateReadDomain: {
      decodedChunkCount: loadEvidence.chunkCount,
      missingChunkCount: loadEvidence.missingChunks.length,
    },
  },
  exactLowRunBasis: {
    lowRunCount: lowRuns.length,
    roadLowRunCount: lowRuns.filter((run) => run.system === 'road').length,
    railLowRunCount: lowRuns.filter((run) => run.system === 'rail').length,
    lowRunIds: lowRuns.map((run) => run.id),
    anchorSelectionEvidence,
  },
  geometryRules: {
    localSump: 'Evaluate each station in a low run. Use station -1..+1, road offsets +18..+20 or rail offsets -31..-29, excavation datum-5..datum-1, and a sealed cap at datum.',
    pumpSocket: 'Alternative B overlays a three-cell vertical equipment socket at the selected outer collection offset and a capped power/control interface inside the chamber.',
    forceMain: 'Alternative B uses road offset +21 and rail offset -32 at local datum-3; consecutive setout points are made six-face contiguous in fixed X, then Z, then Y order.',
    closedTerminalTank: 'Alternative B uses stations 0..4 and five outer offsets, datum-8..datum-3 with a sealed datum-2 cap.',
    culvertAvoidance: 'No alternative emits culvert cells. Alternative C preserves every reconstructed exact S03 low-run interface cell as a no-build control.',
  },
  candidateOwnershipInterfaceSchema: ownershipSchema,
  alternatives,
  defaultNoDiversionProof: {
    selectedRule: selectedNoDiversion.selection,
    preferredAlternativeId: preferredPlanningAlternative?.alternativeId ?? null,
    exactOutfallCandidateCellCount: preferredPlanningAlternative ? altD.outfallCandidateCells.length : 0,
    exactOverflowCandidateCellCount: preferredPlanningAlternative ? altD.overflowCandidateCells.length : 0,
    exactCulvertCandidateCellCount: preferredPlanningAlternative ? altD.culvertCandidateCells.length : 0,
    currentFluidSameCellCount: preferredPlanningAlternative ? altDAudit.waterFamilyCells + altDAudit.lavaCells : null,
    currentFluidFaceAdjacentCellCount: preferredPlanningAlternative ? altDAudit.faceAdjacentCurrentFluidCellCount : null,
    heldLowRunCount: preferredPlanningAlternative ? altD.noBuildPreservationHoldCount : null,
    receiverId: null,
    diversionInterfacePresent: false,
    futureFluidTopologyClaimed: false,
    physicalNoDiversionAcceptanceClaimed: false,
    conclusion: preferredPlanningAlternative
      ? 'The preferred candidate geometry has no current fluid same/face interaction, excludes the fluid-interacting terminal, and emits no discharge path. This is exact present-state geometric compliance with the planning default, not proof of future hydraulic behavior or service to the held low run.'
      : 'No preferred candidate geometry satisfies the exact present-state planning default.',
  },
  preferredPlanningAlternative,
  evidenceImpact: {
    exactClosedAlternativesCompiled: true,
    exactCandidateCellManifestsFrozen: true,
    exactOwnershipInterfaceSchemaFrozen: true,
    culvertAvoidanceBaselineFrozen: true,
    capacityClaimed: false,
    pumpPerformanceClaimed: false,
    hydraulicAcceptanceClaimed: false,
    geotechnicalAcceptanceClaimed: false,
    structuralAcceptanceClaimed: false,
    entityClearanceClaimed: false,
    ownershipAccepted: false,
    d02Resolved: false,
  },
  remainingBlockers: [
    'Adopt Minecraft-domain inflow, storage-duration, freeboard, snowmelt-like, groundwater-like void, erosion, and failure criteria; no real-world engineering claim is permitted.',
    'Size each sump/tank and prove pump duty/standby, power, controls, alarms, recovery, and safe failure behavior if a pumped alternative proceeds.',
    'Compile exact future excavation, lining, cap, backfill, access, and surrounding influence cells with before/after fluid-component accounting.',
    'Resolve gravity-sensitive current cells through accepted excavation stability and material handling rules.',
    'Assign and accept drainage, road, rail, power/control, maintenance, tank, and emergency-response owners and exact interfaces.',
    'Obtain structural/geotechnical acceptance for chambers, caps, corridor loading, and any future crossing; no culvert is currently selected.',
    'Repeat entity, POI, and level metadata clearance against one complete immutable copied save before physical planning can close.',
    'Retain zero outfall/overflow/receiver cells unless an exact sole-authority exception, receiver owner, and complete future topology accounting are separately accepted.',
  ],
  nextAutonomousWork: [
    'Compile exact future-state excavation/lining/cap influence sets for the preferred local-sump planning geometry.',
    'Draft Minecraft-domain storage and pump-failure test schemas with every numeric criterion explicitly unaccepted.',
    'Instantiate maintenance-access and power/control interface candidates without selecting a live route or owner.',
  ],
  finalGate: {
    status: 'HOLD_D02_CLOSED_DRAINAGE_GEOMETRY_IS_PLANNING_ONLY_NO_WORLD_EDITS',
    worldEditAuthorized: false,
    d02Resolved: false,
    reason: 'Exact alternatives and a conservative planning preference exist, but capacity, future-state interaction, stability, structures, ownership, complete-save clearance, and technical acceptance remain absent.',
  },
};

function list(items) {
  return items.map((item) => `- ${item}`).join('\n');
}

const markdown = `# D02-S04 closed drainage planning alternatives\n\n`
  + `**Status:** ${report.finalGate.status}\n\n`
  + `**Generated:** ${GENERATED_AT}\n\n`
  + `**Region snapshot:** \`${snapshot.sha256}\`\n\n`
  + `This read-only compiler turns all ${lowRuns.length} exact D02-S03 gravity-low runs into closed/capped Minecraft planning geometry. Candidate cells are not operations or material authorization. No outfall, overflow, culvert, receiver, capacity, ownership, construction, or world edit is accepted.\n\n`
  + `## Alternatives\n\n`
  + `| Alternative | Candidate/preservation cells | Sumps | Pumps | Mains | Tanks | Same-cell fluid | Face-adjacent fluid | Disposition |\n`
  + `|---|---:|---:|---:|---:|---:|---:|---:|---|\n`
  + `| A — distributed capped sumps | ${altA.candidateCellManifest.cellCount.toLocaleString('en-US')} | ${altA.sumpCount} | 0 | 0 | 0 | ${altAAudit.waterFamilyCells + altAAudit.lavaCells} | ${altAAudit.faceAdjacentCurrentFluidCellCount} | ${altA.planningDisposition} |\n`
  + `| B — pumped sealed mains/tanks | ${alternatives[1].candidateCellManifest.cellCount.toLocaleString('en-US')} | ${alternatives[1].sumpCount} | ${alternatives[1].pumpSocketCount} | 2 | 2 | ${altBAudit.waterFamilyCells + altBAudit.lavaCells} | ${altBAudit.faceAdjacentCurrentFluidCellCount} | ${alternatives[1].planningDisposition} |\n`
  + `| C — no-build culvert avoidance | ${alternatives[2].preservationCellManifest.cellCount.toLocaleString('en-US')} | 0 | 0 | 0 | 0 | ${altCAudit.waterFamilyCells + altCAudit.lavaCells} | ${altCAudit.faceAdjacentCurrentFluidCellCount} | control baseline |\n`
  + `| D — strict-clear sump/no-build hybrid | ${altD.candidateCellManifest.cellCount.toLocaleString('en-US')} | ${altD.sumpCount} | 0 | 0 | 0 | ${altDAudit.waterFamilyCells + altDAudit.lavaCells} | ${altDAudit.faceAdjacentCurrentFluidCellCount} | ${altD.planningDisposition} |\n\n`
  + `## Conservative planning preference\n\n`
  + (preferredPlanningAlternative
    ? `**${preferredPlanningAlternative.alternativeId}** is preferred only for further offline technical development. It assigns ${altD.sumpCount} strict-clear sump candidates and one explicit no-build hold at ROAD-LOW-001, where the rejected chamber envelope intersects ${heldLocalAssets[0].audit.waterFamilyCells + heldLocalAssets[0].audit.lavaCells} current fluid cells and has ${heldLocalAssets[0].audit.faceAdjacentCurrentFluidCellCount} current fluid neighbors. It has no pumps or transfer mains, no fluid interaction in its candidate cells, and no outfall/overflow/culvert cells.\n\n`
    : `No alternative is preferred because the exact present-state geometry gate did not pass.\n\n`)
  + `This ranking is not capacity, hydraulic, geotechnical, structural, operational, safety, ownership, construction, or expert acceptance. Closed storage can still fill and fail; no inflow or duration criterion exists.\n\n`
  + `## Default no-diversion proof boundary\n\n`
  + `For the preferred planning geometry, current same-cell fluid count is **${report.defaultNoDiversionProof.currentFluidSameCellCount ?? 'n/a'}**, face-adjacent fluid count is **${report.defaultNoDiversionProof.currentFluidFaceAdjacentCellCount ?? 'n/a'}**, and outfall, overflow, culvert, and receiver counts are all zero/null. That proves only exact present-state geometric compliance with the selected planning default. Future excavation or collected water is not modeled.\n\n`
  + `## Ownership and interfaces\n\n`
  + `Every asset is instantiated against schema v${ownershipSchema.schemaVersion}. All drainage, collection, power/control, operations, maintenance, and emergency owner keys remain unassigned. Overflow and outfall interfaces are exact empty manifests and remain prohibited.\n\n`
  + `## Remaining blockers\n\n${list(report.remainingBlockers)}\n\n`
  + `## Safe autonomous continuation\n\n${list(report.nextAutonomousWork)}\n\n`
  + `D02 remains on HOLD. No live world, service, database, construction, diversion, or world-edit action occurred or is authorized.\n`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

console.log(JSON.stringify({
  status: report.status,
  output: relative(OUTPUT),
  markdown: relative(MARKDOWN),
  lowRunCount: lowRuns.length,
  alternativeCount: alternatives.length,
  preferredPlanningAlternative: preferredPlanningAlternative?.alternativeId ?? null,
  altACandidateCells: altA.candidateCellManifest.cellCount,
  altBCandidateCells: alternatives[1].candidateCellManifest.cellCount,
  altCPreservationCells: alternatives[2].preservationCellManifest.cellCount,
  altDCandidateCells: alternatives[3].candidateCellManifest.cellCount,
  altDHeldLowRuns: alternatives[3].noBuildPreservationHoldCount,
  operationCellCount: 0,
  diversionAuthorized: false,
  d02Resolved: false,
  worldEditAuthorized: false,
}, null, 2));
