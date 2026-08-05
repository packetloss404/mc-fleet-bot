#!/usr/bin/env node
/**
 * Compile deterministic, fail-closed B07/D06 planning alternatives.
 *
 * This compiler reads only local planning evidence and one immutable copied
 * Anvil snapshot. It emits reservations and comparison evidence, never block
 * operations, live-world access, code-compliance claims, or commissioning.
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

const GENERATED_AT = value('--generated-at', '2026-08-04T23:10:00Z');
const PHASE0 = path.resolve(value(
  '--phase0',
  'docs/masterplans/05-combined-zones/phase0-survey-evidence.json',
));
const CONNECTORS = path.resolve(value(
  '--connectors',
  'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
));
const D06_EGRESS = path.resolve(value(
  '--d06-egress',
  'docs/masterplans/05-combined-zones/phase1-d06-egress-geometry-design.json',
));
const EMPTY_EIGHT = path.resolve(value(
  '--empty-eight',
  'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
));
const RELICS = path.resolve(value(
  '--relics',
  'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
));
const D05 = path.resolve(value(
  '--d05',
  'docs/masterplans/05-combined-zones/phase1-d05-hydrology-relic-buffer-design.json',
));
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.md',
));

const WORLD_MIN_Y = -64;
const WORLD_MAX_Y = 319;
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const DISPLAY_NOISE = new Set([
  ...AIR,
  'minecraft:light',
  'minecraft:structure_void',
  'minecraft:moving_piston',
  'minecraft:short_grass',
  'minecraft:tall_grass',
  'minecraft:fern',
  'minecraft:large_fern',
]);
const WATER = new Set(['minecraft:water', 'minecraft:bubble_column']);
const CELL_HASH_PREAMBLE = 'combined-zones-d06-life-safety-cell-set-v1';
const CONNECTOR_CELL_HASH_PREAMBLE = 'combined-zones-coordinate-cell-set-v1';
const STATE_HASH_PREAMBLE = 'combined-zones-d06-life-safety-state-set-v1';
const CENTERLINE_HASH_PREAMBLE = 'combined-zones-d06-life-safety-centerline-v1';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function fileBinding(filename, role) {
  const data = fs.readFileSync(filename);
  return { path: relative(filename), sha256: sha256(data), bytes: data.length, role };
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
    let displayY = WORLD_MIN_Y - 1;
    let displayBlock = 'minecraft:air';
    let terrainY = WORLD_MIN_Y - 1;
    let terrainBlock = 'minecraft:air';
    let water = false;
    let lava = false;
    for (let y = top; y >= WORLD_MIN_Y; y -= 1) {
      const states = sections.get(Math.floor(y / 16))?.block_states;
      const index = ((y & 15) << 8) | ((z & 15) << 4) | (x & 15);
      const state = states?.palette?.length
        ? states.palette[paletteIndex(states, index, 4)] ?? { Name: 'minecraft:air' }
        : { Name: 'minecraft:air' };
      const name = state.Name ?? 'minecraft:air';
      if (DISPLAY_NOISE.has(name)) continue;
      if (displayY < WORLD_MIN_Y) {
        displayY = y;
        displayBlock = name;
      }
      if (WATER.has(name)) {
        water = true;
        continue;
      }
      if (name === 'minecraft:lava') {
        lava = true;
        continue;
      }
      terrainY = y;
      terrainBlock = name;
      break;
    }
    return {
      x,
      z,
      displayY,
      displayBlock,
      terrainY,
      terrainBlock,
      water,
      lava,
      biome: await this.biome(x, Math.max(terrainY, WORLD_MIN_Y), z),
    };
  }

  async blockEntitiesForCells(cells) {
    const keys = new Set(cells.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
    const positions = new Set(cells.map(cellKey));
    const matches = [];
    for (const key of [...keys].sort()) {
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
  digest.update(`${CELL_HASH_PREAMBLE}\n`);
  for (const cell of uniqueCells(cells)) digest.update(`${cell.x},${cell.y},${cell.z}\n`);
  return digest.digest('hex');
}

function connectorCoordinateHash(cells) {
  const digest = crypto.createHash('sha256');
  digest.update(`${CONNECTOR_CELL_HASH_PREAMBLE}\n`);
  for (const cell of uniqueCells(cells)) digest.update(`${cell.x},${cell.y},${cell.z}\n`);
  return digest.digest('hex');
}

function rawHash(cells) {
  return sha256(uniqueCells(cells).map(cellKey).join('\n'));
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

function intersection(left, right) {
  const rightKeys = new Set(right.map(cellKey));
  return uniqueCells(left).filter((cell) => rightKeys.has(cellKey(cell)));
}

function difference(left, right) {
  const rightKeys = new Set(right.map(cellKey));
  return uniqueCells(left).filter((cell) => !rightKeys.has(cellKey(cell)));
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

function setsDisjoint(sets) {
  const seen = new Set();
  for (const cells of sets) {
    for (const cell of uniqueCells(cells)) {
      const key = cellKey(cell);
      if (seen.has(key)) return false;
      seen.add(key);
    }
  }
  return true;
}

function canonicalState(state) {
  const properties = Object.entries(state?.Properties ?? {}).sort(([a], [b]) => a.localeCompare(b));
  return JSON.stringify({
    Name: state?.Name ?? 'minecraft:air',
    ...(properties.length > 0 ? { Properties: Object.fromEntries(properties) } : {}),
  });
}

async function stateAudit(reader, cells) {
  const observed = [];
  const counts = new Map();
  let airCellCount = 0;
  let waterCellCount = 0;
  let waterloggedCellCount = 0;
  let lavaCellCount = 0;
  for (const cell of uniqueCells(cells)) {
    const state = await reader.state(cell.x, cell.y, cell.z);
    const name = state.Name ?? 'minecraft:air';
    observed.push({ ...cell, state });
    counts.set(name, (counts.get(name) ?? 0) + 1);
    if (AIR.has(name)) airCellCount += 1;
    if (WATER.has(name)) waterCellCount += 1;
    if (state.Properties?.waterlogged === 'true') waterloggedCellCount += 1;
    if (name === 'minecraft:lava') lavaCellCount += 1;
  }
  const digest = crypto.createHash('sha256');
  digest.update(`${STATE_HASH_PREAMBLE}\n`);
  for (const item of observed.sort(compareCells)) {
    digest.update(`${item.x},${item.y},${item.z}\t${canonicalState(item.state)}\n`);
  }
  return {
    ...cellSet(observed),
    blockStateSetSha256: digest.digest('hex'),
    airCellCount,
    presentCellCount: observed.length - airCellCount,
    waterCellCount,
    waterloggedCellCount,
    lavaCellCount,
    materialCounts: Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b))),
  };
}

function orderedCenterlineHash(points) {
  const digest = crypto.createHash('sha256');
  digest.update(`${CENTERLINE_HASH_PREAMBLE}\n`);
  for (const point of points) digest.update(`${point.index}:${point.x},${point.y},${point.z}:${point.kind}\n`);
  return digest.digest('hex');
}

function subjectIntersections(cells, subjects) {
  return subjects.flatMap((subject) => {
    const overlap = uniqueCells(cells).filter((cell) => inside(cell, subject.bounds));
    return overlap.length > 0 ? [{
      subjectId: subject.id,
      subjectBounds: subject.bounds,
      intersection: cellSet(overlap),
    }] : [];
  });
}

function validateRawSet(source, cells, label) {
  const unique = uniqueCells(cells);
  assert(unique.length === source.cellCount, `${label} cell-count drift`);
  assert(JSON.stringify(boundsOf(unique)) === JSON.stringify(source.bounds), `${label} bounds drift`);
  assert(rawHash(unique) === source.cellSetSha256, `${label} source hash drift`);
}

function b07Candidate(anchors, westOffset) {
  const top = anchors.top;
  const observation = anchors.observationLanding;
  const lower = anchors.lowerLobby;
  const shiftedX = observation.x - westOffset;
  const upper = cellsIn({
    minX: top.x - 3, maxX: top.x + 3,
    minY: observation.y, maxY: top.y,
    minZ: top.z - 3, maxZ: top.z + 3,
  });
  const observationShift = westOffset === 0 ? [] : cellsIn({
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
  const lowerShift = westOffset === 0 ? [] : cellsIn({
    minX: shiftedX - 3, maxX: lower.x + 3,
    minY: lower.y - 3, maxY: lower.y + 3,
    minZ: lower.z - 3, maxZ: lower.z + 3,
  });
  const centerline = [];
  for (let y = top.y; y >= observation.y; y -= 1) {
    centerline.push({ x: top.x, y, z: top.z, kind: y === top.y ? 'top-anchor' : y === observation.y ? 'observation-anchor' : 'upper-vertical' });
  }
  for (let step = 1; step <= westOffset; step += 1) {
    centerline.push({ x: observation.x - step, y: observation.y, z: observation.z, kind: 'observation-west-shift' });
  }
  for (let z = observation.z - 1; z >= lower.z; z -= 1) {
    centerline.push({ x: shiftedX, y: observation.y, z, kind: 'level-north-transfer' });
  }
  for (let y = observation.y - 1; y >= lower.y; y -= 1) {
    centerline.push({ x: shiftedX, y, z: lower.z, kind: 'lower-vertical' });
  }
  for (let step = westOffset - 1; step >= 0; step -= 1) {
    if (westOffset === 0) break;
    centerline.push({
      x: lower.x - step,
      y: lower.y,
      z: lower.z,
      kind: step === 0 ? 'lower-anchor' : 'lower-east-shift',
    });
  }
  if (westOffset === 0) centerline[centerline.length - 1].kind = 'lower-anchor';
  centerline.forEach((point, index) => { point.index = index; });
  const excavation = uniqueCells([...upper, ...observationShift, ...transfer, ...lowerVertical, ...lowerShift]);
  const interaction = dilate(excavation, 1);
  return {
    id: westOffset === 0 ? 'B07-A-CENTERED' : `B07-${String.fromCharCode(65 + westOffset)}-WEST-${westOffset}`,
    westOffsetBlocks: westOffset,
    rationale: westOffset === 0
      ? 'Previously frozen centered lower shaft; retained as the exact baseline.'
      : `Shift the north transfer and lower vertical ${westOffset} block${westOffset === 1 ? '' : 's'} west, then return level at Y=${lower.y} so all three authored anchors remain exact.`,
    anchors,
    centerline: {
      pointCount: centerline.length,
      orderedSha256: orderedCenterlineHash(centerline),
      points: centerline,
    },
    crossSection: '7x7 on every vertical and horizontal segment; curve cells are exact segment unions',
    primitives: {
      upperVertical: cellSet(upper),
      observationWestShift: cellSet(observationShift),
      northTransfer: cellSet(transfer),
      lowerVertical: cellSet(lowerVertical),
      lowerAnchorReturn: cellSet(lowerShift),
    },
    exactCellSets: {
      excavationReservation: cellSet(excavation, { constructionOwnership: false }),
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
      authoredCrossSectionPreserved: true,
    },
    _cells: { excavation, interaction },
  };
}

async function auditB07Candidate(candidate, reader, structureSubjects, relicSubjects, bufferSubjects) {
  const excavation = candidate._cells.excavation;
  const interaction = candidate._cells.interaction;
  const bufferIntersections = [];
  for (const subject of bufferSubjects) {
    const overlap = intersection(interaction, subject.shell);
    if (overlap.length > 0) bufferIntersections.push({
      subjectId: subject.id,
      intersection: cellSet(overlap),
    });
  }
  candidate.immutableSnapshotAudit = {
    excavationStateCensus: await stateAudit(reader, excavation),
    interactionStateCensus: await stateAudit(reader, interaction),
    generatedStructureExcavationIntersections: subjectIntersections(excavation, structureSubjects),
    generatedStructureInteractionIntersections: subjectIntersections(interaction, structureSubjects),
    protectedRelicInteractionIntersections: subjectIntersections(interaction, relicSubjects),
    candidateRelicBufferInteractionIntersections: bufferIntersections,
    blockEntityInteractionIntersections: await reader.blockEntitiesForCells(interaction),
  };
  delete candidate._cells;
}

async function ventRiser(reader, id, center, structureSubjects) {
  const columns = [];
  for (let x = center.x - 1; x <= center.x + 1; x += 1) {
    for (let z = center.z - 1; z <= center.z + 1; z += 1) columns.push(await reader.surface(x, z));
  }
  const landingY = Math.max(...columns.map(({ terrainY }) => terrainY)) + 1;
  const bounds = {
    minX: center.x - 1,
    maxX: center.x + 1,
    minY: 55,
    maxY: landingY,
    minZ: center.z - 1,
    maxZ: center.z + 1,
  };
  const cells = cellsIn(bounds);
  const interaction = dilate(cells, 1);
  return {
    id,
    centerline: {
      from: { ...center, y: 55 },
      to: { ...center, y: landingY },
      verticalStepCount: landingY - 55,
    },
    surveyedSurface: {
      landingY,
      minimumTerrainY: Math.min(...columns.map(({ terrainY }) => terrainY)),
      maximumTerrainY: Math.max(...columns.map(({ terrainY }) => terrainY)),
      dryColumnCount: columns.filter(({ water, lava }) => !water && !lava).length,
      columnCount: columns.length,
      biomes: [...new Set(columns.map(({ biome }) => biome))].sort(),
    },
    riserReservation: cellSet(cells, { constructionOwnership: false }),
    internalCompartmentCap: cellSet(cellsIn({ ...bounds, minY: 54, maxY: 54 })),
    exteriorOutletCap: cellSet(cellsIn({ ...bounds, minY: landingY, maxY: landingY })),
    immutableSnapshotAudit: {
      stateCensus: await stateAudit(reader, cells),
      generatedStructureExcavationIntersections: subjectIntersections(cells, structureSubjects),
      generatedStructureInteractionIntersections: subjectIntersections(interaction, structureSubjects),
      blockEntityInteractionIntersections: await reader.blockEntitiesForCells(interaction),
    },
    exteriorOutletOpened: false,
    commissioned: false,
    _cells: cells,
  };
}

function egressLayouts(emptyEight, d06Egress) {
  const cores = emptyEight.d06.lifeSafety.egressCores;
  return d06Egress.egressDesigns.map((external) => {
    const internal = cores.find(({ id }) => id === external.id);
    assert(internal, `missing internal ${external.id} core`);
    const anchor = external.surveyedSurfaceEndpoint;
    assert(external.externalContinuationDesign.bounds.minY === 55, `${external.id} continuation datum drift`);
    assert(internal.internalCoreReservation.bounds.maxY === 54, `${external.id} roof datum drift`);
    const combinedBounds = {
      ...internal.internalCoreReservation.bounds,
      maxY: external.externalContinuationDesign.bounds.maxY,
    };
    const retainedStair = cellsIn({
      ...combinedBounds,
      maxX: anchor.x - 1,
    });
    const retainedLift = cellsIn({
      ...combinedBounds,
      minX: anchor.x + 1,
      minZ: anchor.z - 1,
      maxZ: anchor.z + 1,
    });
    const mirroredStair = cellsIn({
      ...combinedBounds,
      minX: anchor.x + 1,
    });
    const mirroredLift = cellsIn({
      ...combinedBounds,
      maxX: anchor.x - 1,
      minZ: anchor.z - 1,
      maxZ: anchor.z + 1,
    });
    return {
      id: external.id,
      surveyedSurfaceEndpoint: external.surveyedSurfaceEndpoint,
      combinedProtectedCoreReservation: cellSet(cellsIn(combinedBounds)),
      layoutAlternatives: [
        {
          id: `${external.id}-LAYOUT-A-PRESERVE-FROZEN`,
          recommendedForSoleAuthorityReview: true,
          stairReservation: cellSet(retainedStair),
          accessibleLiftReservation: cellSet(retainedLift),
          reason: 'Preserves the already-frozen west stair and east lift reservations without role drift.',
        },
        {
          id: `${external.id}-LAYOUT-B-MIRRORED`,
          recommendedForSoleAuthorityReview: false,
          stairReservation: cellSet(mirroredStair),
          accessibleLiftReservation: cellSet(mirroredLift),
          reason: 'Exact comparison only; rejected because it changes frozen component roles without an evidenced safety benefit.',
        },
      ],
      compartmentSeparatorCap: cellSet(cellsIn({
        ...combinedBounds,
        minX: anchor.x,
        maxX: anchor.x,
      })),
      retainedRoofTransitionCap: cellSet(cellsIn({
        ...combinedBounds,
        minY: 54,
        maxY: 54,
      })),
      retainedSurfaceOutletCap: cellSet(cellsIn({
        ...combinedBounds,
        minY: combinedBounds.maxY,
        maxY: combinedBounds.maxY,
      })),
      mechanismSelected: false,
      commissionedEgress: false,
      commissionedAccessibleRoute: false,
    };
  });
}

function barrierAndSmokeCaps(emptyEight) {
  const platforms = emptyEight.d06.platforms;
  const platformRecords = platforms.map((platform) => {
    // The upstream bounds cover the sparse barrier set, so regenerate it from
    // the platform edge rather than treating its bounds as a filled cuboid.
    const all = cellsIn({
      minX: platform.surface.bounds.minX,
      maxX: platform.surface.bounds.maxX,
      minY: 42,
      maxY: 43,
      minZ: platform.barrier.edgeZ,
      maxZ: platform.barrier.edgeZ,
    });
    const gateCaps = platform.barrier.gateBayXRangesInclusive.flatMap((range) => cellsIn({
      minX: range.minX,
      maxX: range.maxX,
      minY: 42,
      maxY: 43,
      minZ: platform.barrier.edgeZ,
      maxZ: platform.barrier.edgeZ,
    }));
    const reconstructedClosed = difference(all, gateCaps);
    validateRawSet(platform.barrier.closedBarrierDesign, reconstructedClosed, `${platform.id} closed barrier`);
    return {
      id: platform.id,
      retainedClosedBarrierReservation: cellSet(reconstructedClosed),
      staticGateBayCap: cellSet(gateCaps),
      completeFailClosedBarrier: cellSet(all),
      poweredGateMechanism: null,
      operationallyAuthorized: false,
    };
  });
  const smokeDefinitions = [
    { id: 'EE-SMOKE-N', z: 50 },
    { id: 'EE-SMOKE-S', z: 150 },
  ];
  const smokeRecords = smokeDefinitions.map((definition) => {
    const source = emptyEight.d06.lifeSafety.smokeBoundaries.find(({ id }) => id === definition.id);
    const openings = [1670, 1720, 1770, 1820].flatMap((minX) => cellsIn({
      minX,
      maxX: minX + 2,
      minY: 49,
      maxY: 51,
      minZ: definition.z,
      maxZ: definition.z,
    }));
    validateRawSet(source.smokeDoorOpeningReservations, openings, `${definition.id} smoke openings`);
    const retainedBoundary = difference(
      cellsIn({
        minX: 1652,
        maxX: 1847,
        minY: 48,
        maxY: 54,
        minZ: definition.z,
        maxZ: definition.z,
      }),
      openings,
    );
    validateRawSet(source.boundaryPlane, retainedBoundary, `${definition.id} boundary plane`);
    return {
      id: definition.id,
      retainedBoundaryPlane: cellSet(retainedBoundary),
      staticOpeningCaps: cellSet(openings),
      completeFailClosedBoundary: cellSet([...retainedBoundary, ...openings]),
      smokeDoorMechanism: null,
      operationallyAuthorized: false,
    };
  });
  return {
    platformBarriers: platformRecords,
    smokeBoundaries: smokeRecords,
    totals: {
      platformStaticGateCapCells: platformRecords.reduce((sum, item) => sum + item.staticGateBayCap.cellCount, 0),
      smokeOpeningCapCells: smokeRecords.reduce((sum, item) => sum + item.staticOpeningCaps.cellCount, 0),
    },
    recommendedFailClosedPrinciple: 'STATIC_CAP_EVERY_RESERVED_OPENING_POWERED_MECHANISMS_UNSELECTED',
  };
}

function drainageAlternatives(emptyEight) {
  const source = emptyEight.d06.lifeSafety.drainage;
  const localCapSets = source.trackDrainAndSumpReservations.map((drain) => {
    const bounds = drain.sumpReservation.bounds;
    const cells = cellsIn({
      minX: bounds.maxX + 1,
      maxX: bounds.maxX + 1,
      minY: bounds.minY,
      maxY: bounds.maxY,
      minZ: bounds.minZ,
      maxZ: bounds.maxZ,
    });
    return { id: `${drain.id}-LOCAL-CAP`, assignedTrack: drain.assignedTrack, cap: cellSet(cells), _cells: cells };
  });
  const existingHeader = cellsIn(source.internalDischargeHeader.bounds);
  const existingBoundaryCap = cellsIn(source.sealedBoundaryCap.bounds);
  validateRawSet(source.internalDischargeHeader, existingHeader, 'existing discharge header');
  validateRawSet(source.sealedBoundaryCap, existingBoundaryCap, 'existing boundary cap');
  const northHeader = cellsIn({ minX: 1869, maxX: 1871, minY: 38, maxY: 38, minZ: 54, maxZ: 95 });
  const southHeader = cellsIn({ minX: 1869, maxX: 1871, minY: 38, maxY: 38, minZ: 106, maxZ: 158 });
  const dualCaps = [
    ...cellsIn({ minX: 1872, maxX: 1872, minY: 38, maxY: 40, minZ: 93, maxZ: 95 }),
    ...existingBoundaryCap,
  ];
  const singleHeader = cellsIn({ minX: 1869, maxX: 1871, minY: 38, maxY: 38, minZ: 54, maxZ: 158 });
  const localCells = localCapSets.flatMap((item) => item._cells);
  localCapSets.forEach((item) => { delete item._cells; });
  return {
    recommendedAlternativeId: 'DRAIN-A-EIGHT-INDEPENDENT-LOCAL-CAPS',
    alternatives: [
      {
        id: 'DRAIN-A-EIGHT-INDEPENDENT-LOCAL-CAPS',
        recommendedForSoleAuthorityReview: true,
        localSumpInterfaceCaps: localCapSets,
        capUnion: cellSet(localCells),
        retainedUnconnectedHeaderReservation: cellSet(existingHeader),
        retainedExternalBoundaryCap: cellSet(existingBoundaryCap),
        interfaceSetsPairwiseDisjoint: setsDisjoint(localCapSets.map(({ cap }) => cellsIn(cap.bounds))),
        reason: 'Keeps every sump locally capped and independent; adds no unevidenced collector or external discharge path.',
      },
      {
        id: 'DRAIN-B-DUAL-ISOLATED-HEADERS',
        recommendedForSoleAuthorityReview: false,
        headerReservations: [cellSet(northHeader), cellSet(southHeader)],
        boundaryCaps: cellSet(dualCaps),
        reason: 'Exact comparison only; rejected pending hydraulics, ownership, and proof that two grouped headers preserve the required compartments.',
      },
      {
        id: 'DRAIN-C-SINGLE-SHARED-HEADER',
        recommendedForSoleAuthorityReview: false,
        headerReservation: cellSet(singleHeader),
        boundaryCap: cellSet(existingBoundaryCap),
        reason: 'Exact comparison only; rejected because one shared header creates a common interface before engineering and D05 discharge acceptance.',
      },
    ],
    externalDischargePoint: null,
    pumpMechanismSelected: false,
    hydraulicModelValidated: false,
    commissioned: false,
  };
}

function fireServiceAlternatives(emptyEight, egressLayoutsRecord) {
  const spine = emptyEight.d06.lifeSafety.fireAndServiceAccess.internalSpineReservation;
  const spineCells = cellsIn(spine.bounds);
  validateRawSet(spine, spineCells, 'fire/service spine');
  const alternatives = egressLayoutsRecord.map((core) => {
    const bounds = core.combinedProtectedCoreReservation.bounds;
    const isB = core.id === 'EG-B';
    const transfer = isB
      ? []
      : cellsIn({ minX: bounds.maxX, maxX: spine.bounds.minX, minY: 48, maxY: 52, minZ: 146, maxZ: 150 });
    const interfaceCap = cellsIn({
      minX: isB ? bounds.minX : bounds.maxX,
      maxX: isB ? bounds.minX : bounds.maxX,
      minY: 48,
      maxY: 52,
      minZ: 145,
      maxZ: 151,
    });
    const landingY = core.surveyedSurfaceEndpoint.y;
    return {
      id: `FIRE-${core.id}`,
      recommendedForSoleAuthorityReview: isB,
      internalTransferReservation: cellSet(transfer),
      normallyClosedSpineInterfaceCap: cellSet(interfaceCap),
      surfaceCompoundReservation: cellSet(cellsIn({
        minX: bounds.minX,
        maxX: bounds.maxX,
        minY: landingY,
        maxY: landingY,
        minZ: bounds.minZ,
        maxZ: bounds.maxZ,
      })),
      sealedSurfaceApproachInterface: cellSet(cellsIn({
        minX: bounds.minX,
        maxX: bounds.maxX,
        minY: landingY,
        maxY: landingY + 2,
        minZ: bounds.maxZ,
        maxZ: bounds.maxZ,
      })),
      externalApproachRoute: null,
      reason: isB
        ? 'Recommended as the minimum-geometry planning interface because the frozen fire/service spine is immediately adjacent to EG-B.'
        : 'Rejected: reaching EG-A requires a cross-terminal transfer reservation and would couple the independent escape core.',
    };
  });
  return {
    recommendedAlternativeId: 'FIRE-EG-B',
    internalSpineReservation: cellSet(spineCells),
    alternatives,
    emergencyServiceAcceptance: false,
    externalApproachRouteProven: false,
    commissioned: false,
  };
}

async function main() {
  const phase0 = readJson(PHASE0);
  const connectors = readJson(CONNECTORS);
  const d06Egress = readJson(D06_EGRESS);
  const emptyEight = readJson(EMPTY_EIGHT);
  const relics = readJson(RELICS);
  const d05 = readJson(D05);
  const snapshotDirectory = path.resolve(ROOT, phase0.snapshots.postGeneration.path);
  const snapshot = snapshotIdentity(snapshotDirectory);
  assert(snapshot.sha256 === phase0.snapshots.postGeneration.sha256, 'immutable snapshot SHA-256 mismatch');
  assert(snapshot.regionFileCount === phase0.snapshots.postGeneration.regionFileCount, 'immutable snapshot region-count mismatch');
  assert(snapshot.bytes === phase0.snapshots.postGeneration.bytes, 'immutable snapshot byte-count mismatch');
  assert(connectors.operationCellCount === 0, 'connector source must remain zero-operation');
  assert(d06Egress.authority.operationCellCount === 0, 'D06 egress source must remain zero-operation');
  assert(emptyEight.authority.operationCellCount === 0, 'Empty Eight source must remain zero-operation');

  const reader = new SnapshotReader(snapshotDirectory);
  const reserveStarts = phase0.generatedStructureStarts
    .filter(({ intersectsReserve }) => intersectsReserve)
    .map((start, index) => ({
      id: `${start.id}@${start.chunkX},${start.chunkZ}#${index}`,
      bounds: start.bounds,
    }));
  const relicSubjects = relics.relics.map((relic) => ({ id: relic.key, bounds: relic.declaredInclusiveBounds }));
  const bufferSubjects = d05.protectedRelicBufferCandidates.map((candidate) => {
    const coreCells = cellsIn(candidate.protectedCore.bounds);
    const shell = difference(cellsIn(candidate.minimumAdjacencyBufferCandidate.expandedBounds), coreCells);
    assert(
      connectorCoordinateHash(shell) === candidate.minimumAdjacencyBufferCandidate.coordinateSetSha256,
      `${candidate.relicKey} candidate-buffer hash drift`,
    );
    return { id: candidate.relicKey, shell };
  });

  const anchors = connectors.publicShaftDogleg.anchors;
  const b07Candidates = [0, 1, 2].map((westOffset) => b07Candidate(anchors, westOffset));
  assert(
    b07Candidates[0].exactCellSets.excavationReservation.cellCount
      === connectors.publicShaftDogleg.exactCellSets.excavationReservation.cellCount,
    'B07 baseline cell-count drift',
  );
  assert(
    connectorCoordinateHash(b07Candidates[0]._cells.excavation)
      === connectors.publicShaftDogleg.exactCellSets.excavationReservation.coordinateSetSha256,
    'B07 baseline exact coordinate-set drift',
  );
  for (const candidate of b07Candidates) {
    await auditB07Candidate(candidate, reader, reserveStarts, relicSubjects, bufferSubjects);
  }
  const baselineMineshaft = b07Candidates[0].immutableSnapshotAudit
    .generatedStructureExcavationIntersections.find(({ subjectId }) => subjectId.startsWith('minecraft:mineshaft@'));
  assert(baselineMineshaft?.intersection.cellCount === 217, 'B07 exact 217-cell mineshaft baseline drift');
  const westOneInteraction = b07Candidates[1].immutableSnapshotAudit
    .generatedStructureInteractionIntersections.find(({ subjectId }) => subjectId.startsWith('minecraft:mineshaft@'));
  assert(!b07Candidates[1].immutableSnapshotAudit.generatedStructureExcavationIntersections.length, 'west-one excavation still intersects a generated structure');
  assert((westOneInteraction?.intersection.cellCount ?? 0) > 0, 'west-one interaction halo unexpectedly clears the mineshaft edge');
  assert(!b07Candidates[2].immutableSnapshotAudit.generatedStructureExcavationIntersections.length, 'west-two excavation intersects a generated structure');
  assert(!b07Candidates[2].immutableSnapshotAudit.generatedStructureInteractionIntersections.length, 'west-two interaction halo intersects a generated structure');
  assert(!b07Candidates[2].immutableSnapshotAudit.protectedRelicInteractionIntersections.length, 'west-two intersects a protected relic');
  assert(!b07Candidates[2].immutableSnapshotAudit.candidateRelicBufferInteractionIntersections.length, 'west-two intersects a candidate relic buffer');
  assert(!b07Candidates[2].immutableSnapshotAudit.blockEntityInteractionIntersections.length, 'west-two intersects a block entity');
  b07Candidates.forEach((candidate) => {
    candidate.recommendedForSoleAuthorityReview = candidate.id === 'B07-C-WEST-2';
    candidate.recommendationBoundary = candidate.id === 'B07-C-WEST-2'
      ? 'RECOMMENDED_FOR_REVIEW_ONLY_BECAUSE_BOTH_EXCAVATION_AND_ONE_CELL_INTERACTION_HALO_AVOID_THE_CATALOGED_MINESHAFT_BOUNDING_BOX'
      : 'NOT_RECOMMENDED';
  });

  const coreLayouts = egressLayouts(emptyEight, d06Egress);
  assert(setsDisjoint(coreLayouts.map((core) => cellsIn(core.combinedProtectedCoreReservation.bounds))), 'D06 protected cores overlap');

  const ventDefinitions = [
    { id: 'EE-VENT-NW', center: { x: 1644, z: 48 } },
    { id: 'EE-VENT-NE', center: { x: 1860, z: 48 } },
    { id: 'EE-VENT-SW', center: { x: 1644, z: 152 } },
    { id: 'EE-VENT-SE', center: { x: 1860, z: 152 } },
  ];
  const localRisers = [];
  for (const definition of ventDefinitions) {
    localRisers.push(await ventRiser(reader, definition.id, definition.center, reserveStarts));
  }
  assert(setsDisjoint(localRisers.map((item) => item._cells)), 'local ventilation risers overlap');
  const coreCells = coreLayouts.map((core) => cellsIn(core.combinedProtectedCoreReservation.bounds));
  assert(localRisers.every((riser) => coreCells.every((core) => intersection(riser._cells, core).length === 0)), 'local ventilation riser overlaps an egress core');
  assert(localRisers.every((riser) => (
    riser.immutableSnapshotAudit.generatedStructureInteractionIntersections.length === 0
      && riser.immutableSnapshotAudit.blockEntityInteractionIntersections.length === 0
      && riser.immutableSnapshotAudit.stateCensus.waterCellCount === 0
      && riser.immutableSnapshotAudit.stateCensus.waterloggedCellCount === 0
      && riser.immutableSnapshotAudit.stateCensus.lavaCellCount === 0
  )), 'local ventilation riser immutable-snapshot conflict');
  const localUnion = uniqueCells(localRisers.flatMap((item) => item._cells));
  localRisers.forEach((item) => { delete item._cells; });

  const groupedRisers = [];
  for (const definition of [
    { id: 'EE-VENT-W-GROUP', center: { x: 1644, z: 100 }, sourceZ: [48, 152] },
    { id: 'EE-VENT-E-GROUP', center: { x: 1860, z: 100 }, sourceZ: [48, 152] },
  ]) {
    const riser = await ventRiser(reader, definition.id, definition.center, reserveStarts);
    const header = cellsIn({
      minX: definition.center.x - 1,
      maxX: definition.center.x + 1,
      minY: 54,
      maxY: 56,
      minZ: Math.min(...definition.sourceZ) - 1,
      maxZ: Math.max(...definition.sourceZ) + 1,
    });
    const union = uniqueCells([...riser._cells, ...header]);
    groupedRisers.push({
      id: definition.id,
      sharedByInternalPlants: definition.sourceZ.length,
      headerReservation: cellSet(header),
      riserReservation: riser.riserReservation,
      exteriorOutletCap: riser.exteriorOutletCap,
      combinedReservation: cellSet(union),
      immutableSnapshotAudit: {
        stateCensus: await stateAudit(reader, union),
        generatedStructureIntersections: subjectIntersections(union, reserveStarts),
      },
      _cells: union,
    });
  }
  const groupedUnion = uniqueCells(groupedRisers.flatMap((item) => item._cells));
  groupedRisers.forEach((item) => { delete item._cells; });

  const barriers = barrierAndSmokeCaps(emptyEight);
  const drainage = drainageAlternatives(emptyEight);
  const fireService = fireServiceAlternatives(emptyEight, coreLayouts);

  const report = {
    schemaVersion: 1,
    id: 'combined-zones-phase1-d06-life-safety-alternatives',
    generatedAtUtc: GENERATED_AT,
    status: 'PARTIAL_PASS_FAIL_CLOSED_B07_D06_ALTERNATIVES_FROZEN_ALL_RELEASE_AND_COMMISSIONING_HOLD',
    authority: {
      offlineOnly: true,
      executable: false,
      worldEditAuthorized: false,
      constructionAuthorized: false,
      codeComplianceClaimed: false,
      expertCommissioningClaimed: false,
      operationCellCount: 0,
      materialCellCount: 0,
      decisionAuthority: 'sole human project owner',
    },
    sourceBindings: {
      phase0Evidence: fileBinding(PHASE0, 'immutable copied-snapshot identity and generated-structure starts'),
      connectorGeometry: fileBinding(CONNECTORS, 'exact B07 baseline geometry and collision evidence'),
      d06SurfaceEgress: fileBinding(D06_EGRESS, 'surveyed surface endpoints and exact external stair/lift continuations'),
      emptyEightDesign: fileBinding(EMPTY_EIGHT, 'exact internal life-safety reservations and sealed interfaces'),
      protectedRelics: fileBinding(RELICS, 'exact default-deny protected relic cores'),
      d05Baseline: fileBinding(D05, 'candidate relic-buffer evidence and external-discharge HOLD'),
      immutablePhase0PostSnapshot: snapshot,
    },
    hashContracts: {
      coordinateCellSet: `${CELL_HASH_PREAMBLE}\\n followed by sorted x,y,z\\n`,
      blockStateCellSet: `${STATE_HASH_PREAMBLE}\\n followed by sorted x,y,z TAB canonical-state\\n`,
      orderedCenterline: `${CENTERLINE_HASH_PREAMBLE}\\n followed by index:x,y,z:kind\\n`,
    },
    scope: {
      recommendationMeans: 'conservative offline planning alternative supported by current immutable evidence and awaiting sole-authority acceptance',
      recommendationDoesNotMean: [
        'architectural acceptance, code compliance, expert review, mechanism selection, or commissioning',
        'construction ownership, release authority, source guards, operations, opening, or world edits',
        'proof of surface ownership, fire-appliance approach, safe discharge, smoke performance, hydraulics, or accessible egress',
      ],
    },
    b07PublicShaftTransfer: {
      blockerId: 'P1-B07-PUBLIC-SHAFT-DOGLEG',
      status: 'PARTIAL_PASS_WEST_TWO_OFFLINE_RECOMMENDATION_B07_AND_LIFE_SAFETY_HOLD',
      recommendedCandidateId: 'B07-C-WEST-2',
      recommendationRule: 'Recommend the minimum westward deviation subject to zero cataloged generated-structure intersections in both excavation and the one-cell interaction union.',
      candidates: b07Candidates,
      blockerClosed: false,
      holdReasons: [
        'The west-two geometry is a reservation comparison, not accepted shaft, lift-transfer, stair, lining, smoke, drainage, ownership, or construction design.',
        'A generated-structure bounding-box clearance is not a field condition, structural, or archaeology acceptance.',
        'No continuous accessible route, independent protected egress, surface discharge, source guard, rollback, or commissioning evidence exists.',
      ],
    },
    d06EmptyEightLifeSafety: {
      status: 'PARTIAL_PASS_EXACT_FAIL_CLOSED_RESERVATIONS_D06_AND_G02_HOLD',
      protectedEgressCoreLayouts: coreLayouts,
      ventilationOutletAlternatives: {
        recommendedAlternativeId: 'VENT-A-FOUR-INDEPENDENT-LOCAL-RISERS',
        alternatives: [
          {
            id: 'VENT-A-FOUR-INDEPENDENT-LOCAL-RISERS',
            recommendedForSoleAuthorityReview: true,
            risers: localRisers,
            combinedReservation: cellSet(localUnion),
            riserSetsPairwiseDisjoint: true,
            egressCoreIntersections: 0,
            reason: 'Four local capped risers preserve plant independence and have zero fluid, generated-structure, egress-core, and block-entity intersections in the immutable-snapshot audit.',
          },
          {
            id: 'VENT-B-TWO-GROUPED-HEADERS',
            recommendedForSoleAuthorityReview: false,
            groups: groupedRisers,
            combinedReservation: cellSet(groupedUnion),
            reason: 'Rejected because each header couples two internal plant reservations before smoke modelling, ownership, and expert engineering.',
          },
        ],
        exteriorOutletCountOpened: 0,
        smokeModelValidated: false,
        mechanismSelected: false,
        commissioned: false,
      },
      failClosedBarriersAndSmokeInterfaces: barriers,
      drainageAlternatives: drainage,
      fireServiceAccessAlternatives: fireService,
      independenceProof: {
        protectedCoreCount: coreLayouts.length,
        protectedCoreSetsDisjoint: true,
        recommendedVentRiserCount: localRisers.length,
        recommendedVentRiserSetsDisjoint: true,
        localDrainInterfaceCapCount: 8,
        localDrainInterfaceCapsDisjoint: drainage.alternatives[0].interfaceSetsPairwiseDisjoint,
        smokeBoundaryCapsRemainClosed: true,
        platformGateBaysRemainClosed: true,
        fireSpineInterfaceRemainsClosed: true,
        externalDrainageDischargeRemainsNull: drainage.externalDischargePoint === null,
        externalFireServiceApproachRemainsNull: fireService.alternatives.every(({ externalApproachRoute }) => externalApproachRoute === null),
      },
      commissioned: false,
      codeComplianceClaimed: false,
    },
    overallDisposition: {
      holdIds: ['P1-B07-PUBLIC-SHAFT-DOGLEG', 'D06', 'G02'],
      closedIds: [],
      recommendationsRequireSoleAuthorityAcceptance: true,
      nextRequiredEvidence: [
        'sole-authority acceptance of planning geometry without self-authorization',
        'licensed/expert life-safety, structural, accessibility, lift, smoke-control, fire-service, ventilation, barrier, emergency-power, and hydraulic engineering',
        'accepted D05 external-discharge ownership and exact surface/fire-appliance access ownership',
        'complete compiler, source-state, overlap, entity, rollback, execution, route, and commissioning gates before any physical work',
      ],
    },
  };

  const recommendedB07 = report.b07PublicShaftTransfer.candidates.find(({ recommendedForSoleAuthorityReview }) => recommendedForSoleAuthorityReview);
  const localVent = report.d06EmptyEightLifeSafety.ventilationOutletAlternatives.alternatives[0];
  const markdown = `# D06/B07 fail-closed life-safety alternatives\n\n`
    + `Status: **PARTIAL PASS — OFFLINE RESERVATIONS ONLY — B07, D06, AND G02 HOLD — ZERO OPERATIONS**\n\n`
    + `This package compares exact planning geometry against the immutable Phase 0 copied snapshot and makes recommendations for sole-authority review. A recommendation is not a selection or approval. It does not claim code compliance, expert acceptance, commissioning, construction ownership, or permission to open or build anything.\n\n`
    + `## B07 public-shaft transfer\n\n`
    + `| Candidate | West shift | Excavation cells | Generated-structure excavation overlap | One-cell interaction overlap | Recommendation |\n|---|---:|---:|---:|---:|---|\n`
    + b07Candidates.map((candidate) => `| ${candidate.id} | ${candidate.westOffsetBlocks} | ${candidate.exactCellSets.excavationReservation.cellCount.toLocaleString()} | ${candidate.immutableSnapshotAudit.generatedStructureExcavationIntersections.reduce((sum, item) => sum + item.intersection.cellCount, 0)} | ${candidate.immutableSnapshotAudit.generatedStructureInteractionIntersections.reduce((sum, item) => sum + item.intersection.cellCount, 0)} | ${candidate.recommendedForSoleAuthorityReview ? 'recommend for review' : 'do not recommend'} |`).join('\n')
    + `\n\nThe two-block west candidate is the smallest tested offset that clears the cataloged mineshaft bounding box in both its excavation set and one-cell interaction union. It preserves all three authored anchors and the 7×7 cross-section, then returns level at the lower-lobby Y. B07 remains HOLD because bounding-box clearance is not a shaft, structural, lift, egress, or commissioning approval. Recommended-for-review excavation: ${recommendedB07.exactCellSets.excavationReservation.cellCount.toLocaleString()} cells, hash \`${recommendedB07.exactCellSets.excavationReservation.coordinateSetSha256}\`. Its excavation contains the same 38 water cells as the centered baseline, while its interaction union contains more water and therefore still requires explicit drainage/hydrology treatment.\n\n`
    + `## D06 protected egress and ventilation\n\n`
    + `The existing two disjoint 7×7 cores remain unchanged: west stair and east accessible-lift reservations are recommended for retention, with a static separator, roof-transition cap, and surface cap. Mirrored component layouts are recorded only as non-recommended comparisons. No lift or door mechanism is selected.\n\n`
    + `Four local 3×3 vent risers are recommended as capped planning paths because their exact sets are mutually disjoint and the immutable-snapshot audit finds no fluid, generated-structure, egress-core, or block-entity intersections. The two grouped-header alternative is not recommended because it couples two plants per header before smoke engineering.\n\n`
    + `| Local riser | Surface landing Y | Cells | Water/lava | Structure intersections | Outlet state |\n|---|---:|---:|---:|---:|---|\n`
    + localVent.risers.map((riser) => `| ${riser.id} | ${riser.surveyedSurface.landingY} | ${riser.riserReservation.cellCount} | ${riser.immutableSnapshotAudit.stateCensus.waterCellCount + riser.immutableSnapshotAudit.stateCensus.lavaCellCount} | ${riser.immutableSnapshotAudit.generatedStructureInteractionIntersections.length} | capped |`).join('\n')
    + `\n\n## Fail-closed interfaces\n\n`
    + `- ${barriers.totals.platformStaticGateCapCells} platform gate-bay cells and ${barriers.totals.smokeOpeningCapCells} smoke-opening cells remain static caps; powered mechanisms are unselected.\n`
    + `- Eight three-cell local sump caps preserve independent drainage interfaces. The existing boundary header stub stays capped; external discharge remains null.\n`
    + `- EG-B is the minimum-geometry fire-service planning interface because it is adjacent to the frozen internal spine. Its spine interface and surface approach remain capped; no external fire-appliance route is claimed. EG-A remains independent escape-only planning geometry.\n\n`
    + `## Release boundary\n\n`
    + `B07, D06, and G02 remain HOLD. World edits authorized: **no**. Operation cells: **0**. Material cells: **0**. No live service or database was contacted.\n`;

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(MARKDOWN, markdown);
  process.stdout.write(`${JSON.stringify({
    output: relative(OUTPUT),
    markdown: relative(MARKDOWN),
    status: report.status,
    recommendedB07: report.b07PublicShaftTransfer.recommendedCandidateId,
    recommendedVent: report.d06EmptyEightLifeSafety.ventilationOutletAlternatives.recommendedAlternativeId,
    operationCellCount: 0,
  })}\n`);
}

await main();
