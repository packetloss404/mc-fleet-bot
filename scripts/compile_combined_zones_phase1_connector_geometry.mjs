#!/usr/bin/env node
/**
 * Compile deterministic, read-only Phase 1 connector geometry for:
 *   P1-B07 public-shaft dogleg,
 *   P1-B08 service-tunnel rail centerline, and
 *   P1-B09 east/west funicular-face terrain comparison.
 *
 * This compiler reads only local masterplan evidence and one immutable copied
 * Anvil snapshot. It emits geometry evidence, never block operations,
 * construction ownership, release authority, or world edits.
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

const GENERATED_AT = value('--generated-at', '2026-08-04T22:00:00Z');
const CONTRACTOR_04 = path.resolve(value(
  '--contractor-04',
  'masterplans/04-combined-complex/04-contractor/contractor-brief.json',
));
const RECONCILIATION = path.resolve(value(
  '--reconciliation',
  'masterplans/04-combined-complex/authority-reconciliation.json',
));
const COORDINATES = path.resolve(value(
  '--coordinates',
  'masterplans/05-combined-zones/site-coordinates.json',
));
const PHASE0 = path.resolve(value(
  '--phase0',
  'masterplans/05-combined-zones/phase0-survey-evidence.json',
));
const GEOMETRY = path.resolve(value(
  '--geometry',
  'masterplans/05-combined-zones/phase1-geometry-coordination.json',
));
const RELICS = path.resolve(value(
  '--relics',
  'masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
));
const D05 = path.resolve(value(
  '--d05',
  'masterplans/05-combined-zones/phase1-d05-hydrology-relic-buffer-design.json',
));
const OUTPUT = path.resolve(value(
  '--out',
  'masterplans/05-combined-zones/phase1-connector-geometry.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'masterplans/05-combined-zones/phase1-connector-geometry.md',
));

const WORLD_MIN_Y = -64;
const WORLD_MAX_Y = 319;
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const WATER = new Set(['minecraft:water', 'minecraft:bubble_column']);
const COORDINATE_HASH_PREAMBLE = 'combined-zones-coordinate-cell-set-v1';
const COLUMN_HASH_PREAMBLE = 'combined-zones-column-set-v1';
const ORDERED_CENTERLINE_PREAMBLE = 'combined-zones-ordered-centerline-v1';
const STATE_HASH_PREAMBLE = 'combined-zones-block-state-cell-set-v1';
const SURFACE_PROFILE_PREAMBLE = 'combined-zones-ordered-surface-profile-v1';

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
  return {
    path: relative(filename),
    bytes: data.length,
    sha256: sha256(data),
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
    assert(buffer, `missing region for chunk ${key}`);
    const index = ((cx & 31) + (cz & 31) * 32) * 4;
    const sectorOffset = buffer.readUIntBE(index, 3);
    const sectorCount = buffer[index + 3];
    assert(sectorOffset && sectorCount, `missing chunk ${key}`);
    const offset = sectorOffset * 4096;
    const size = buffer.readUInt32BE(offset);
    const compression = buffer.readUInt8(offset + 4);
    assert(!(compression & 0x80), `external chunk storage unsupported at ${key}`);
    const compressed = buffer.subarray(offset + 5, offset + 4 + size);
    const { parsed } = await nbt.parse(decompress(compression, compressed));
    const data = nbt.simplify(parsed);
    assert(data?.Status === 'minecraft:full', `chunk ${key} is not minecraft:full`);
    const result = {
      data,
      sections: new Map((data.sections ?? []).map((section) => [Number(section.Y), section])),
    };
    this.chunks.set(key, result);
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
        return {
          x,
          y,
          z,
          block: state.Name,
          biome: await this.biome(x, y, z),
        };
      }
    }
    return { x, y: WORLD_MIN_Y - 1, z, block: 'minecraft:air', biome: null };
  }

  async blockEntitiesForCells(cells) {
    const chunkKeys = new Set(cells.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
    const positions = new Set(cells.map(cellKey));
    const matches = [];
    for (const key of [...chunkKeys].sort()) {
      const [cx, cz] = key.split(',').map(Number);
      const { data } = await this.chunk(cx, cz);
      for (const entity of data.block_entities ?? []) {
        const x = Number(entity.x ?? entity.Pos?.[0]);
        const y = Number(entity.y ?? entity.Pos?.[1]);
        const z = Number(entity.z ?? entity.Pos?.[2]);
        if (![x, y, z].every(Number.isFinite) || !positions.has(`${x},${y},${z}`)) continue;
        matches.push({ id: entity.id ?? 'unknown', x, y, z });
      }
    }
    return matches.sort(compareCells);
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
  digest.update(`${COORDINATE_HASH_PREAMBLE}\n`);
  for (const cell of uniqueCells(cells)) digest.update(`${cell.x},${cell.y},${cell.z}\n`);
  return digest.digest('hex');
}

function columnHash(columns) {
  const digest = crypto.createHash('sha256');
  digest.update(`${COLUMN_HASH_PREAMBLE}\n`);
  const unique = new Map(columns.map(({ x, z }) => [`${x},${z}`, { x, z }]));
  for (const column of [...unique.values()].sort((left, right) => left.x - right.x || left.z - right.z)) {
    digest.update(`${column.x},${column.z}\n`);
  }
  return digest.digest('hex');
}

function cellSet(cells, extra = {}) {
  const unique = uniqueCells(cells);
  return {
    cellCount: unique.length,
    bounds: boundsOf(unique),
    coordinateSetSha256: coordinateHash(unique),
    ...extra,
  };
}

function orderedCenterlineHash(points) {
  const digest = crypto.createHash('sha256');
  digest.update(`${ORDERED_CENTERLINE_PREAMBLE}\n`);
  for (const point of points) {
    digest.update(`${point.index}:${point.x},${point.y},${point.z}:${point.kind}\n`);
  }
  return digest.digest('hex');
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
  digest.update(`${STATE_HASH_PREAMBLE}\n`);
  for (const cell of [...cells].sort(compareCells)) {
    digest.update(`${cell.x},${cell.y},${cell.z}\t${canonicalState(cell.state)}\n`);
  }
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

function inside(cell, bounds) {
  return cell.x >= bounds.minX && cell.x <= bounds.maxX
    && cell.y >= bounds.minY && cell.y <= bounds.maxY
    && cell.z >= bounds.minZ && cell.z <= bounds.maxZ;
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

function difference(left, right) {
  const excluded = new Set(right.map(cellKey));
  return left.filter((cell) => !excluded.has(cellKey(cell)));
}

function halfOpenToInclusive(bounds) {
  return {
    minX: bounds.minXInclusive,
    maxX: bounds.maxXExclusive - 1,
    minY: bounds.minYInclusive,
    maxY: bounds.maxYExclusive - 1,
    minZ: bounds.minZInclusive,
    maxZ: bounds.maxZExclusive - 1,
  };
}

function intersectionEvidence(cells, subjects, idField = 'id') {
  const result = [];
  for (const subject of subjects) {
    const overlap = cells.filter((cell) => inside(cell, subject.bounds));
    if (overlap.length === 0) continue;
    result.push({
      subjectId: subject[idField],
      subjectBounds: subject.bounds,
      intersection: cellSet(overlap),
    });
  }
  return result;
}

function sortedCounts(counts) {
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function publicShaftGeometry(anchors) {
  const top = anchors.top;
  const observation = anchors.observationLanding;
  const lower = anchors.lowerLobby;
  assert(top.x === observation.x && top.z === observation.z, 'upper shaft anchors must be vertical');
  assert(observation.x === lower.x, 'public shaft dogleg must preserve X');
  assert(top.y > observation.y && observation.y > lower.y, 'public shaft anchors must descend');

  const centerline = [];
  for (let y = top.y; y >= observation.y; y -= 1) {
    centerline.push({ x: top.x, y, z: top.z, kind: y === top.y ? 'top-anchor' : 'upper-vertical' });
  }
  for (let z = observation.z - 1; z >= lower.z; z -= 1) {
    centerline.push({ x: observation.x, y: observation.y, z, kind: 'level-transfer' });
  }
  for (let y = observation.y - 1; y >= lower.y; y -= 1) {
    centerline.push({ x: lower.x, y, z: lower.z, kind: y === lower.y ? 'lower-anchor' : 'lower-vertical' });
  }
  centerline.forEach((point, index) => { point.index = index; });
  const observationIndex = centerline.findIndex(
    (point) => point.x === observation.x && point.y === observation.y && point.z === observation.z,
  );

  const upper = cellsIn({
    minX: top.x - 3, maxX: top.x + 3,
    minY: observation.y, maxY: top.y,
    minZ: top.z - 3, maxZ: top.z + 3,
  });
  const transfer = cellsIn({
    minX: observation.x - 3, maxX: observation.x + 3,
    minY: observation.y - 3, maxY: observation.y + 3,
    minZ: lower.z - 3, maxZ: observation.z + 3,
  });
  const lowerVolume = cellsIn({
    minX: lower.x - 3, maxX: lower.x + 3,
    minY: lower.y, maxY: observation.y,
    minZ: lower.z - 3, maxZ: lower.z + 3,
  });
  const excavation = uniqueCells([...upper, ...transfer, ...lowerVolume]);
  const stair = excavation.filter(({ x }) => x === top.x - 3);
  const lift = excavation.filter(({ x }) => x >= top.x - 2 && x <= top.x + 2);
  const chase = excavation.filter(({ x }) => x === top.x + 3);
  assert(stair.length + lift.length + chase.length === excavation.length, 'shaft strips must partition geometry');
  const interaction = dilate(excavation, 1);

  return {
    blockerId: 'P1-B07-PUBLIC-SHAFT-DOGLEG',
    status: 'PARTIAL_PASS_EXACT_OFFLINE_GEOMETRY_B07_LIFE_SAFETY_HOLD',
    selection: 'TWO_VERTICAL_SHAFTS_WITH_LEVEL_OBSERVATION_TRANSFER',
    anchors: { top, observationLanding: observation, lowerLobby: lower },
    crossSection: {
      dimensions: { x: 7, transverse: 7 },
      centerBias: 'odd-width symmetric offsets -3…+3 about every integer centerline cell',
      westEmergencyStairStrip: 'x=centerX-3',
      innerLiftCore: 'x=centerX-2…centerX+2',
      eastServiceChaseStrip: 'x=centerX+3',
      sourceIntent: '5x5 inner lift core + 1-block emergency stair west + 1-block service chase east',
    },
    primitives: [
      { id: 'upper-vertical', bounds: boundsOf(upper), ...cellSet(upper) },
      { id: 'observation-transfer', bounds: boundsOf(transfer), ...cellSet(transfer) },
      { id: 'lower-vertical', bounds: boundsOf(lowerVolume), ...cellSet(lowerVolume) },
    ],
    centerline: {
      pointCount: centerline.length,
      orderedSha256: orderedCenterlineHash(centerline),
      observationAnchorIndex: observationIndex,
      points: centerline,
    },
    exactCellSets: {
      excavationReservation: cellSet(excavation, { constructionOwnership: false }),
      westEmergencyStairReservation: cellSet(stair, { constructionOwnership: false }),
      innerLiftCoreReservation: cellSet(lift, { constructionOwnership: false }),
      eastServiceChaseReservation: cellSet(chase, { constructionOwnership: false }),
      oneCellInteractionHalo: cellSet(difference(interaction, excavation), { constructionOwnership: false }),
      interactionUnion: cellSet(interaction, { constructionOwnership: false }),
    },
    geometryChecks: {
      allAnchorsAppearExactlyOnce: [top, observation, lower].every((anchor) => (
        centerline.filter((point) => point.x === anchor.x && point.y === anchor.y && point.z === anchor.z).length === 1
      )),
      centerlineCardinalAndConnected: centerline.slice(1).every((point, index) => {
        const previous = centerline[index];
        return Math.abs(point.x - previous.x)
          + Math.abs(point.y - previous.y)
          + Math.abs(point.z - previous.z) === 1;
      }),
      liftContinuity: 'HOLD_TWO_VERTICAL_LIFT_CORES_REQUIRE_TRANSFER_AND_MECHANISM_ACCEPTANCE',
      independentEgressProof: false,
    },
    disposition: {
      offlineGeometryFrozen: true,
      blockerClosed: false,
      holdReasons: [
        'The source does not authorize replacing one continuous mechanical lift with two commissioned lift mechanisms and a transfer.',
        'A one-block west stair reservation is exact geometry, not an accessible or independently protected egress proof.',
        'No surface discharge, smoke separation, lift mechanism, structural lining, drainage, ownership, or life-safety acceptance is bound.',
      ],
    },
    _cells: { excavation, interaction },
  };
}

function serviceTunnelGeometry(anchors) {
  const start = anchors.segments[0].from;
  const contact = anchors.segments[0].to;
  const end = anchors.segments[1].to;
  const points = [];
  for (let step = 0; step <= 60; step += 1) {
    points.push({
      x: start.x + step,
      y: start.y + Math.min(step, 58),
      z: start.z,
      kind: step === 0 ? 'start-anchor' : step === 60 ? 'level-curve-x-to-north' : step <= 58 ? 'ascending-east' : 'level-curve-approach',
      orientations: step === 60 ? ['x', 'z'] : ['x'],
    });
  }
  for (let step = 1; step <= 120; step += 1) {
    const z = start.z - step;
    points.push({
      x: start.x + 60,
      y: contact.y,
      z,
      kind: step === 60 ? 'contact-anchor-straight' : step === 120 ? 'level-curve-north-to-east' : 'level-north',
      orientations: step === 120 ? ['z', 'x'] : ['z'],
    });
  }
  for (let step = 1; step <= 40; step += 1) {
    points.push({
      x: start.x + 60 + step,
      y: end.y,
      z: end.z,
      kind: step === 40 ? 'end-anchor' : 'level-east',
      orientations: ['x'],
    });
  }
  points.forEach((point, index) => { point.index = index; });
  const contactIndex = points.findIndex(
    (point) => point.x === contact.x && point.y === contact.y && point.z === contact.z,
  );
  const curveIndices = points.filter((point) => point.orientations.length === 2).map(({ index }) => index);

  const excavation = [];
  const clear = [];
  const inner = [];
  const utility = [];
  const escape = [];
  const floor = [];
  const ceiling = [];
  for (const point of points) {
    for (const orientation of point.orientations) {
      for (let lateral = -2; lateral <= 3; lateral += 1) {
        for (let vertical = -1; vertical <= 4; vertical += 1) {
          const cell = orientation === 'x'
            ? { x: point.x, y: point.y + vertical, z: point.z + lateral }
            : { x: point.x + lateral, y: point.y + vertical, z: point.z };
          excavation.push(cell);
          if (vertical === -1) floor.push(cell);
          if (vertical === 4) ceiling.push(cell);
          if (vertical >= 0 && vertical <= 3) {
            clear.push(cell);
            if (lateral === -2) utility.push(cell);
            else if (lateral === 3) escape.push(cell);
            else inner.push(cell);
          }
        }
      }
    }
  }
  const excavationUnique = uniqueCells(excavation);
  const interaction = dilate(excavationUnique, 1);
  const poweredIndices = new Set([0]);
  for (let index = 4; index <= 56; index += 4) poweredIndices.add(index);
  for (let index = 68; index <= 172; index += 8) poweredIndices.add(index);
  for (let index = 188; index <= 220; index += 8) poweredIndices.add(index);
  for (const curveIndex of curveIndices) poweredIndices.delete(curveIndex);
  const poweredCells = points.filter(({ index }) => poweredIndices.has(index));

  const stepChecks = points.slice(1).map((point, index) => {
    const previous = points[index];
    return {
      horizontal: Math.abs(point.x - previous.x) + Math.abs(point.z - previous.z),
      vertical: point.y - previous.y,
    };
  });
  const roleKeys = [inner, utility, escape].map((cells) => new Set(uniqueCells(cells).map(cellKey)));
  const roleOverlap = uniqueCells([...inner, ...utility, ...escape]).filter((cell) => (
    roleKeys.filter((keys) => keys.has(cellKey(cell))).length > 1
  ));

  return {
    blockerId: 'P1-B08-SERVICE-TUNNEL-CENTERLINE',
    status: 'PARTIAL_PASS_EXACT_RAIL_BUILDABLE_CANDIDATE_B08_REVIEW_HOLD',
    selection: 'EAST_RAMP_THEN_NORTH_LEVEL_THROUGH_CONTACT_THEN_EAST_LEVEL',
    anchors: { start, contact, end },
    routeRationale: [
      'The first 60 eastward steps absorb the complete 58-block transformed rise and leave a two-step level curve approach.',
      'The 120-block northward tangent passes through the contact anchor at its midpoint, so the plaque location is straight and level.',
      'The final 40 eastward tangent reaches the outer-portal anchor after a level curve.',
      'This deterministic candidate uses the minimum 220-block horizontal Manhattan run implied by the two anchor deltas; it does not claim the inherited 120-block length.',
    ],
    crossSection: {
      dimensions: { lateral: 6, vertical: 6 },
      railDatum: 'integer centerline rail cell',
      verticalBias: 'floor y=railY-1; four-cell clear band y=railY…railY+3; ceiling y=railY+4',
      lateralBias: 'negative side two cells (-2…-1) and positive side three cells (+1…+3) around rail offset 0; full range -2…+3',
      orientationRule: {
        eastWestTangent: 'lateral offset applies to world Z; -2 is north and +3 is south',
        northSouthTangent: 'lateral offset applies to world X; -2 is west and +3 is east',
        curve: 'union of both oriented 6x6 sections at the level curve cell',
      },
      componentIntent: {
        innerMinecartCorridor: 'lateral offsets -1…+2, clear vertical offsets 0…+3',
        utilityStrip: 'travel-left/negative lateral offset -2, clear vertical offsets 0…+3',
        emergencyEscapeStrip: 'travel-right/positive lateral offset +3, clear vertical offsets 0…+3',
        curveDisposition: 'role overlaps at rotated curve unions remain shared transition cells and block final owner assignment',
      },
    },
    centerline: {
      pointCount: points.length,
      horizontalStepCount: points.length - 1,
      orderedSha256: orderedCenterlineHash(points),
      contactAnchorIndex: contactIndex,
      curveIndices,
      points,
    },
    railConstraintAudit: {
      connectedCardinalStepCount: stepChecks.filter(({ horizontal }) => horizontal === 1).length,
      ascendingStepCount: stepChecks.filter(({ vertical }) => vertical === 1).length,
      levelStepCount: stepChecks.filter(({ vertical }) => vertical === 0).length,
      descendingStepCount: stepChecks.filter(({ vertical }) => vertical < 0).length,
      maximumAbsoluteRisePerHorizontalStep: Math.max(...stepChecks.map(({ vertical }) => Math.abs(vertical))),
      maximumGrade: '1:1',
      everyStepCardinalAndRailBuildable: stepChecks.every(({ horizontal, vertical }) => horizontal === 1 && Math.abs(vertical) <= 1),
      everyCurveLevel: curveIndices.every((index) => (
        points[index - 1].y === points[index].y && points[index + 1].y === points[index].y
      )),
      contactAnchorStraightAndLevel: points[contactIndex - 1].x === contact.x
        && points[contactIndex + 1].x === contact.x
        && points[contactIndex - 1].y === contact.y
        && points[contactIndex + 1].y === contact.y,
    },
    poweredRailSchedule: {
      status: 'EXACT_OFFLINE_CANDIDATE_NOT_COMMISSIONED',
      rule: 'station start; every fourth cell on the ascending tangent; every eighth cell on level tangents; never a curve cell',
      sourceClimbingInterval: 4,
      levelStudyInterval: 8,
      poweredRailCellSet: cellSet(poweredCells),
      orderedIndices: [...poweredIndices].sort((a, b) => a - b),
      curvePoweredRailCount: curveIndices.filter((index) => poweredIndices.has(index)).length,
    },
    exactCellSets: {
      railCenterline: cellSet(points, { constructionOwnership: false }),
      excavationReservation: cellSet(excavationUnique, { constructionOwnership: false }),
      fourHighClearVolume: cellSet(clear, { constructionOwnership: false }),
      innerMinecartCorridor: cellSet(inner, { constructionOwnership: false }),
      utilityStrip: cellSet(utility, { constructionOwnership: false }),
      emergencyEscapeStrip: cellSet(escape, { constructionOwnership: false }),
      floorReservation: cellSet(floor, { constructionOwnership: false }),
      ceilingReservation: cellSet(ceiling, { constructionOwnership: false }),
      rotatedCurveRoleOverlap: cellSet(roleOverlap, { constructionOwnership: false }),
      oneCellInteractionHalo: cellSet(difference(interaction, excavationUnique), { constructionOwnership: false }),
      interactionUnion: cellSet(interaction, { constructionOwnership: false }),
    },
    disposition: {
      exactRailBuildableCandidateFrozen: true,
      blockerClosed: false,
      holdReasons: [
        'The cardinal axis ordering is a deterministic candidate, not an accepted architectural or construction authority selection.',
        'Rotated curve transitions need exact utility/escape ownership and a reviewed walking-clearance treatment.',
        'No structural lining, loading, drainage, ventilation, protected escape, source guards, commissioning, or bidirectional route QA is bound.',
      ],
    },
    _cells: { excavation: excavationUnique, interaction },
  };
}

async function stateAudit(reader, cells) {
  const observed = [];
  const materialCounts = new Map();
  let airCellCount = 0;
  let waterCellCount = 0;
  let lavaCellCount = 0;
  let waterloggedCellCount = 0;
  const paleGardenCounts = new Map();
  for (const cell of uniqueCells(cells)) {
    const state = await reader.state(cell.x, cell.y, cell.z);
    observed.push({ ...cell, state });
    const name = state.Name ?? 'minecraft:air';
    materialCounts.set(name, (materialCounts.get(name) ?? 0) + 1);
    if (AIR.has(name)) airCellCount += 1;
    if (WATER.has(name)) waterCellCount += 1;
    if (name === 'minecraft:lava') lavaCellCount += 1;
    if (state.Properties?.waterlogged === 'true') waterloggedCellCount += 1;
    if (/pale_|creaking_heart/.test(name)) {
      paleGardenCounts.set(name, (paleGardenCounts.get(name) ?? 0) + 1);
    }
  }
  return {
    status: 'PASS_EXACT_IMMUTABLE_SNAPSHOT_CENSUS_NOT_A_SOURCE_GUARD',
    ...cellSet(observed),
    blockStateSetSha256: stateHash(observed),
    airCellCount,
    presentCellCount: observed.length - airCellCount,
    waterCellCount,
    waterloggedCellCount,
    lavaCellCount,
    paleGardenMaterialCounts: sortedCounts(paleGardenCounts),
    materialCounts: sortedCounts(materialCounts),
  };
}

async function collisionAudit({ reader, excavation, interaction, phase0, relics, d05, envelopes }) {
  const reserveStarts = phase0.generatedStructureStarts
    .filter(({ intersectsReserve }) => intersectsReserve)
    .map((start, index) => ({ ...start, auditId: `${start.id}@${start.chunkX},${start.chunkZ}#${index}` }));
  assert(reserveStarts.length === 50, 'expected 50 reserve-intersecting generated structure starts');
  const relicSubjects = relics.relics.map((relic) => ({
    key: relic.key,
    bounds: relic.declaredInclusiveBounds,
  }));
  const bufferSubjects = d05.protectedRelicBufferCandidates.map((candidate) => {
    const core = candidate.protectedCore.bounds;
    const expanded = candidate.minimumAdjacencyBufferCandidate.expandedBounds;
    const shell = difference(cellsIn(expanded), cellsIn(core));
    assert(
      coordinateHash(shell) === candidate.minimumAdjacencyBufferCandidate.coordinateSetSha256,
      `D05 candidate shell hash mismatch for ${candidate.relicKey}`,
    );
    return { key: candidate.relicKey, bounds: expanded, shell };
  });
  const envelopeSubjects = envelopes.map((envelope) => ({
    id: envelope.id,
    bounds: halfOpenToInclusive(envelope.exactCoordinationCellSet.bounds),
  }));
  const bufferIntersections = [];
  for (const buffer of bufferSubjects) {
    const overlap = interaction.filter((cell) => new Set(buffer.shell.map(cellKey)).has(cellKey(cell)));
    if (overlap.length > 0) {
      bufferIntersections.push({ relicKey: buffer.key, intersection: cellSet(overlap) });
    }
  }
  const blockEntities = await reader.blockEntitiesForCells(interaction);
  return {
    immutableExcavationStateCensus: await stateAudit(reader, excavation),
    immutableInteractionStateCensus: await stateAudit(reader, interaction),
    generatedStructureStartCountChecked: reserveStarts.length,
    generatedStructureExcavationIntersections: intersectionEvidence(
      excavation,
      reserveStarts.map(({ auditId, bounds }) => ({ id: auditId, bounds })),
    ),
    generatedStructureInteractionIntersections: intersectionEvidence(
      interaction,
      reserveStarts.map(({ auditId, bounds }) => ({ id: auditId, bounds })),
    ),
    protectedCoreIntersections: intersectionEvidence(
      interaction,
      relicSubjects.map(({ key, bounds }) => ({ id: key, bounds })),
    ),
    unreviewedOneCellBufferCandidateIntersections: bufferIntersections,
    coordinationEnvelopeIntersections: intersectionEvidence(interaction, envelopeSubjects),
    blockEntityIntersections: blockEntities,
    interpretation: 'Existing solids describe excavation exposure, not permission. Any generated-structure, relic, candidate-buffer, fluid, pale-garden, or block-entity intersection remains default-deny pending exact ownership and reviewed treatment.',
  };
}

function line(start, end) {
  const points = [];
  const dx = Math.sign(end.x - start.x);
  const dz = Math.sign(end.z - start.z);
  assert(dx === 0 || dz === 0, 'surface profile line must be cardinal');
  let x = start.x;
  let z = start.z;
  points.push({ x, z });
  while (x !== end.x || z !== end.z) {
    x += dx;
    z += dz;
    points.push({ x, z });
  }
  return points;
}

function faceSurveyPath(start, summit, faceX) {
  const baseFace = { x: faceX, z: start.z };
  const summitFace = { x: faceX, z: summit.z };
  return [
    ...line({ x: start.x, z: start.z }, baseFace),
    ...line(baseFace, summitFace).slice(1),
    ...line(summitFace, { x: summit.x, z: summit.z }).slice(1),
  ].map((point, index) => ({ ...point, index }));
}

async function profileCandidate(reader, id, points, phase0, relics) {
  const profile = [];
  for (const point of points) profile.push({ index: point.index, ...await reader.surface(point.x, point.z) });
  const digest = crypto.createHash('sha256');
  digest.update(`${SURFACE_PROFILE_PREAMBLE}\n`);
  for (const item of profile) {
    digest.update(`${item.index}:${item.x},${item.y},${item.z}:${item.block}:${item.biome ?? 'null'}\n`);
  }
  const uniqueColumns = new Map(profile.map((item) => [`${item.x},${item.z}`, item]));
  const heights = profile.map(({ y }) => y);
  const biomeCounts = new Map();
  const materialCounts = new Map();
  for (const item of profile) {
    biomeCounts.set(item.biome ?? 'null', (biomeCounts.get(item.biome ?? 'null') ?? 0) + 1);
    materialCounts.set(item.block, (materialCounts.get(item.block) ?? 0) + 1);
  }
  const maxStep = Math.max(...profile.slice(1).map((item, index) => Math.abs(item.y - profile[index].y)));
  const startSubjects = phase0.generatedStructureStarts
    .filter(({ intersectsReserve }) => intersectsReserve)
    .map((start, index) => ({ ...start, auditId: `${start.id}@${start.chunkX},${start.chunkZ}#${index}` }));
  const structureIntersections = [];
  for (const subject of startSubjects) {
    const columns = [...uniqueColumns.values()].filter(({ x, z }) => (
      x >= subject.bounds.minX && x <= subject.bounds.maxX
      && z >= subject.bounds.minZ && z <= subject.bounds.maxZ
    ));
    if (columns.length > 0) {
      structureIntersections.push({
        subjectId: subject.auditId,
        subjectBounds: subject.bounds,
        intersectingColumnCount: columns.length,
        columnSetSha256: columnHash(columns),
      });
    }
  }
  const relicIntersections = [];
  for (const relic of relics.relics) {
    const columns = [...uniqueColumns.values()].filter(({ x, z }) => (
      x >= relic.declaredInclusiveBounds.minX && x <= relic.declaredInclusiveBounds.maxX
      && z >= relic.declaredInclusiveBounds.minZ && z <= relic.declaredInclusiveBounds.maxZ
    ));
    if (columns.length > 0) relicIntersections.push({ relicKey: relic.key, columnCount: columns.length });
  }
  return {
    id,
    status: 'PASS_READ_ONLY_EXISTING_TERRAIN_PROFILE_NOT_A_CENTERLINE',
    horizontalStepCount: points.length - 1,
    orderedSampleCount: profile.length,
    uniqueColumnCount: uniqueColumns.size,
    orderedSurfaceProfileSha256: digest.digest('hex'),
    currentSurface: {
      minimumY: Math.min(...heights),
      maximumY: Math.max(...heights),
      meanY: Number((heights.reduce((sum, current) => sum + current, 0) / heights.length).toFixed(6)),
      maximumAdjacentStep: maxStep,
      materialCounts: sortedCounts(materialCounts),
      biomeCounts: sortedCounts(biomeCounts),
    },
    generatedStructurePlanIntersections: structureIntersections,
    protectedRelicPlanIntersections: relicIntersections,
    orderedProfile: profile,
  };
}

async function main() {
  const contractor04 = readJson(CONTRACTOR_04);
  const reconciliation = readJson(RECONCILIATION);
  const coordinates = readJson(COORDINATES);
  const phase0 = readJson(PHASE0);
  const geometry = readJson(GEOMETRY);
  const relics = readJson(RELICS);
  const d05 = readJson(D05);
  const snapshotDirectory = path.resolve(ROOT, phase0.snapshots.postGeneration.path);
  const snapshot = snapshotIdentity(snapshotDirectory);
  assert(snapshot.sha256 === phase0.snapshots.postGeneration.sha256, 'snapshot SHA-256 mismatch');
  assert(snapshot.regionFileCount === phase0.snapshots.postGeneration.regionFileCount, 'snapshot region-file count mismatch');
  assert(snapshot.bytes === phase0.snapshots.postGeneration.bytes, 'snapshot byte count mismatch');
  assert(
    reconciliation.authorityModel?.composition
      === '01 + 02 + 03 -> 04 normalized architecture -> 05 current-world placement',
    'unexpected reconciliation ownership chain',
  );
  assert(geometry.compiledCoordinationGeometry.operationCellCount === 0, 'upstream geometry must emit zero operations');
  assert(coordinates.transform.vertical.activeForBuild === false, 'vertical transform must remain inactive for build');
  assert(contractor04.subterranean_zones.public_shaft.cross_section === '7x7', 'public shaft source cross-section drift');
  assert(contractor04.subterranean_zones.service_tunnel.cross_section === '6x6', 'service tunnel source cross-section drift');

  const reader = new SnapshotReader(snapshotDirectory);
  const shaft = publicShaftGeometry(geometry.centerlineCoordination.publicShaft.anchors);
  const service = serviceTunnelGeometry(geometry.centerlineCoordination.serviceTunnel);
  const envelopes = geometry.compiledCoordinationGeometry.normalized04EnvelopeCellSets;
  shaft.snapshotAndIntersectionAudit = await collisionAudit({
    reader,
    excavation: shaft._cells.excavation,
    interaction: shaft._cells.interaction,
    phase0,
    relics,
    d05,
    envelopes,
  });
  service.snapshotAndIntersectionAudit = await collisionAudit({
    reader,
    excavation: service._cells.excavation,
    interaction: service._cells.interaction,
    phase0,
    relics,
    d05,
    envelopes,
  });
  delete shaft._cells;
  delete service._cells;

  const funicular = geometry.centerlineCoordination.funicular;
  const mountain = envelopes.find(({ id }) => id === 'continuous-mountain');
  assert(mountain, 'continuous-mountain coordination envelope missing');
  const mountainBounds = halfOpenToInclusive(mountain.exactCoordinationCellSet.bounds);
  const eastPath = faceSurveyPath(funicular.from, funicular.to, mountainBounds.maxX);
  const westPath = faceSurveyPath(funicular.from, funicular.to, mountainBounds.minX);
  const east = await profileCandidate(reader, 'east-envelope-edge-profile', eastPath, phase0, relics);
  const west = await profileCandidate(reader, 'west-envelope-edge-profile', westPath, phase0, relics);
  const startSurface = await reader.surface(funicular.from.x, funicular.from.z);
  const summitSurface = await reader.surface(funicular.to.x, funicular.to.z);
  const funicularComparison = {
    blockerId: 'P1-B09-FUNICULAR-CENTERLINE',
    status: 'PARTIAL_PASS_READ_ONLY_EAST_WEST_PROFILE_B09_FACE_SELECTION_HOLD',
    faceSelection: null,
    designEndpoints: { from: funicular.from, to: funicular.to },
    immutableEndpointSurfaceComparison: {
      portal: { designY: funicular.from.y, currentSurface: startSurface, designMinusSurfaceY: funicular.from.y - startSurface.y },
      summit: { designY: funicular.to.y, currentSurface: summitSurface, designMinusSurfaceY: funicular.to.y - summitSurface.y },
    },
    surveyDefinition: {
      interpretation: 'Each profile is a cardinal U-shaped read-only transect from the portal to one inclusive X edge of the continuous-mountain coordination envelope, north to summit Z, then back to the summit anchor. It is not a rail proposal.',
      mountainCoordinationBounds: mountainBounds,
      eastFaceX: mountainBounds.maxX,
      westFaceX: mountainBounds.minX,
    },
    minimumRailGeometry: {
      transformedRiseBlocks: Math.abs(funicular.to.y - funicular.from.y),
      minimumHorizontalRunAtOneToOneGrade: funicular.minimumHorizontalRunAtAbsoluteMaximumRailGrade,
      levelCurveRunStillRequired: true,
    },
    candidates: [east, west],
    comparison: {
      eastHorizontalRunSatisfiesOneToOneMinimum: east.horizontalStepCount >= funicular.minimumHorizontalRunAtAbsoluteMaximumRailGrade,
      westHorizontalRunSatisfiesOneToOneMinimum: west.horizontalStepCount >= funicular.minimumHorizontalRunAtAbsoluteMaximumRailGrade,
      existingTerrainCanProveFutureMountainFace: false,
      reason: `The future deterministic mountain solid does not exist; the summit design anchor is ${funicular.to.y - summitSurface.y} blocks above the immutable current surface at that X/Z. Current terrain can compare constraints but cannot select or set out a future face.`,
    },
    disposition: {
      readOnlyProfileComparisonComplete: true,
      exactRailCenterlineFrozen: false,
      blockerClosed: false,
      holdReasons: [
        'No deterministic future mountain shell or face surface exists.',
        'No face-selection acceptance, integer switchback vertices, level curve landings, station throats, or maintenance/egress route exists.',
        'Current-surface differences do not establish future hydrology, protected-relic clearance, ownership, or construction quantities.',
      ],
    },
  };

  const report = {
    schemaVersion: 1,
    id: 'combined-zones-phase1-connector-geometry',
    generatedAtUtc: GENERATED_AT,
    status: 'PARTIAL_PASS_EXACT_B07_B08_CANDIDATES_B09_PROFILE_ALL_CONSTRUCTION_HOLD',
    worldEditAuthorized: false,
    constructionOwnershipAuthorized: false,
    executable: false,
    operationCellCount: 0,
    materialCellCount: 0,
    sourceBindings: {
      contractor04: fileBinding(CONTRACTOR_04, 'retained 7x7/6x6 connector cross-sections, component intent, and rail cadence'),
      reconciliation: fileBinding(RECONCILIATION, '01+02+03 to 04 to 05 authority boundary'),
      coordinates05: fileBinding(COORDINATES, 'current-world transform and planning anchors'),
      phase0Evidence: fileBinding(PHASE0, 'sealed immutable copied-snapshot identity and generated-structure starts'),
      phase1Geometry: fileBinding(GEOMETRY, 'binding transformed anchors and blocker definitions'),
      protectedRelics: fileBinding(RELICS, 'exact default-deny protected cores'),
      d05Baseline: fileBinding(D05, 'unreviewed one-cell relic-buffer candidates and hydrology baseline'),
      immutablePhase0PostSnapshot: snapshot,
    },
    hashContracts: {
      coordinateCellSet: `${COORDINATE_HASH_PREAMBLE}\\n followed by sorted x,y,z\\n`,
      columnSet: `${COLUMN_HASH_PREAMBLE}\\n followed by sorted unique x,z\\n`,
      orderedCenterline: `${ORDERED_CENTERLINE_PREAMBLE}\\n followed by index:x,y,z:kind\\n`,
      blockStateCellSet: `${STATE_HASH_PREAMBLE}\\n followed by sorted x,y,z TAB canonical-state\\n`,
      orderedSurfaceProfile: `${SURFACE_PROFILE_PREAMBLE}\\n followed by index:x,y,z:block:biome\\n`,
    },
    scope: {
      access: 'read-only local masterplan evidence and immutable copied Anvil regions only',
      frozenAs: 'offline geometry candidates and current-terrain comparison, not successor placement authority',
      prohibited: [
        'Minecraft, RCON, fleet API, systemd, SSH, or live-world access',
        'operation generation, source guards, construction ownership, release authorization, or world edits',
        'claiming an unreviewed candidate closes B07, B08, B09, D05, D06, G03, G06, or G07',
      ],
    },
    publicShaftDogleg: shaft,
    serviceTunnelCenterline: service,
    funicularFaceComparison: funicularComparison,
    overallDisposition: {
      exactOfflineGeometryCandidateCount: 2,
      readOnlyProfileComparisonCount: 1,
      blockerIdsClosed: [],
      blockersRemainingHold: [
        'P1-B07-PUBLIC-SHAFT-DOGLEG',
        'P1-B08-SERVICE-TUNNEL-CENTERLINE',
        'P1-B09-FUNICULAR-CENTERLINE',
      ],
      reason: 'The evidence now makes candidate geometry deterministic and auditable, but design acceptance, life safety, structure/hydrology, ownership, future mountain geometry, compiler/source/release evidence, and non-self authorization remain absent.',
    },
  };

  const markdown = `# Phase 1 connector geometry — B07/B08 candidates and B09 face comparison

Status: **PARTIAL PASS — EXACT OFFLINE CANDIDATES — ALL THREE BLOCKERS HOLD — ZERO OPERATIONS**

This package binds the reconciled Masterplan 04/05 anchors and the immutable Phase 0 copied snapshot. It freezes deterministic review geometry for the public-shaft dogleg and service-tunnel rail, and compares existing terrain along paired east/west envelope-edge transects for the funicular. It does not create construction ownership, operations, source guards, or world-edit authority.

## P1-B07 public shaft

- Exact anchors: top \`${shaft.anchors.top.x},${shaft.anchors.top.y},${shaft.anchors.top.z}\`; observation \`${shaft.anchors.observationLanding.x},${shaft.anchors.observationLanding.y},${shaft.anchors.observationLanding.z}\`; lower lobby \`${shaft.anchors.lowerLobby.x},${shaft.anchors.lowerLobby.y},${shaft.anchors.lowerLobby.z}\`.
- Candidate: two vertical 7×7 shafts joined by a level 7×7 observation-transfer gallery.
- Side convention: west one-block stair strip, centered 5×5 lift core, east one-block service chase.
- Excavation reservation: ${shaft.exactCellSets.excavationReservation.cellCount.toLocaleString()} cells, hash \`${shaft.exactCellSets.excavationReservation.coordinateSetSha256}\`.
- **HOLD:** the two-lift transfer is not an accepted mechanism; the one-block stair strip is not accessible independent egress; structure, smoke, drainage, ownership, and life-safety evidence remain absent.

## P1-B08 service tunnel

- Exact cardinal centerline: ${service.centerline.horizontalStepCount} horizontal steps through all three anchors; ${service.railConstraintAudit.ascendingStepCount} rising and ${service.railConstraintAudit.levelStepCount} level steps.
- The 58-block rise occurs on the first 60-step east tangent, followed by a 120-step north tangent through the straight/level contact anchor and a 40-step east tangent to the outer portal.
- Both curves are level. Maximum grade is 1:1. The 6×6 section uses the explicit lateral range −2…+3 and vertical range −1…+4 around the rail datum.
- Centerline hash: \`${service.centerline.orderedSha256}\`; excavation reservation: ${service.exactCellSets.excavationReservation.cellCount.toLocaleString()} cells, hash \`${service.exactCellSets.excavationReservation.coordinateSetSha256}\`.
- **HOLD:** axis ordering, curve component ownership, lining/loading, drainage, escape, source, commissioning, and route acceptance remain unapproved.

## P1-B09 funicular

| Survey-only profile | Horizontal steps | Current surface Y | Generated-start plan intersections | Relic plan intersections |
|---|---:|---:|---:|---:|
${funicularComparison.candidates.map((candidate) => `| ${candidate.id} | ${candidate.horizontalStepCount} | ${candidate.currentSurface.minimumY}…${candidate.currentSurface.maximumY} | ${candidate.generatedStructurePlanIntersections.length} | ${candidate.protectedRelicPlanIntersections.length} |`).join('\n')}

Both transects have more horizontal run than the transformed 174-block rise requires at the absolute Minecraft 1:1 rail limit. That does **not** select a face: the future mountain solid is absent, and the summit design anchor is ${funicularComparison.immutableEndpointSurfaceComparison.summit.designMinusSurfaceY} blocks above the immutable current surface at that X/Z. B09 remains HOLD pending an accepted future face, integer switchbacks with level curves, station throats, maintenance/egress, protected-feature clearance, hydrology, and ownership.

This packet is the source-bound precursor comparison. Consult **phase1-d05-future-mountain-alternatives.json** and **phase1-autonomous-design-selections.json** for later planning-selection status; those downstream records do not alter this packet's historical input finding or authorize construction.

## Snapshot and release boundary

- Immutable copied snapshot: \`${snapshot.path}\`
- Snapshot SHA-256: \`${snapshot.sha256}\`
- World edits authorized: **no**
- Operation cells: **0**
- Material cells: **0**

Regenerate:

\`\`\`bash
node scripts/compile_combined_zones_phase1_connector_geometry.mjs
\`\`\`
`;

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(MARKDOWN, markdown);
  process.stdout.write(`${JSON.stringify({
    output: relative(OUTPUT),
    markdown: relative(MARKDOWN),
    status: report.status,
    shaftCells: shaft.exactCellSets.excavationReservation.cellCount,
    serviceCells: service.exactCellSets.excavationReservation.cellCount,
    operationCellCount: 0,
  })}\n`);
}

await main();
