#!/usr/bin/env node
/**
 * Compile an exact, offline P1-B11 Grand Avenue surface-road setout proposal.
 *
 * This resolves the eight-wide integer side-bias for review and records exact
 * coordination reservations. It does not amend the accepted B11 profile,
 * select materials or engineering criteria, accept ownership/interfaces, or
 * emit Minecraft operations.
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

const GENERATED_AT = value('--generated-at', '2026-08-05T03:35:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-b11-surface-road-technical-proposal.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-b11-surface-road-technical-proposal.md',
));

const INPUTS = Object.freeze({
  b11: 'docs/masterplans/05-combined-zones/phase1-b11-external-interface-acceptance.json',
  ownerAcceptance: 'docs/masterplans/05-combined-zones/phase1-owner-review-acceptance.json',
  b12: 'docs/masterplans/05-combined-zones/phase1-grand-avenue-passive-shell-candidate.json',
  houstonGeometry: 'docs/masterplans/05-combined-zones/phase1-geometry-coordination.json',
  currentRegionEvidence: 'docs/masterplans/05-combined-zones/phase1-d02-s01-s02-region-evidence.json',
  phase0: 'docs/masterplans/05-combined-zones/phase0-survey-evidence.json',
  protectedRelics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  c1: 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json',
  completeSave: 'docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit.json',
});

const ROLES = Object.freeze({
  b11: 'immutable 299-point owner-accepted Grand Avenue planning profile',
  ownerAcceptance: 'sole-owner planning acceptance with every technical HOLD retained',
  b12: 'exact unaccepted passive-shell side-bias and road-load coordination precedent',
  houstonGeometry: 'exact half-open Houston coordination envelope',
  currentRegionEvidence: 'selected immutable region-only current-state evidence and completeness limits',
  phase0: '114 generated-structure start bounds and immutable snapshot identity',
  protectedRelics: 'three evidence-backed default-deny relic cores',
  c1: 'exact C1 corridor setout and east extent',
  completeSave: 'complete-save intake HOLD and missing evidence boundary',
});

const CELL_HASH_PREAMBLE = 'combined-zones-b11-surface-road-technical-proposal-cells-v1';
const STATE_HASH_PREAMBLE = 'combined-zones-b11-surface-road-technical-proposal-current-states-v1';
const PAIR_HASH_PREAMBLE = 'combined-zones-b11-surface-road-technical-proposal-pairs-v1';
const B12_CELL_HASH_PREAMBLE = 'combined-zones-grand-avenue-passive-shell-candidate-cells-v1';
const ROAD_Z_OFFSETS = [-3, -2, -1, 0, 1, 2, 3, 4];
const INTERACTION_Z_OFFSETS = [-4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
const INTERACTION_Y_OFFSETS = [-2, -1, 0, 1];

function invariant(condition, message) {
  if (!condition) throw new Error(`B11 surface-road proposal rejected: ${message}`);
}

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function relative(filename) {
  return path.relative(ROOT, filename);
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
    invariant(!(compression & 0x80), `external chunk storage unsupported at ${cx},${cz}`);
    const { parsed } = await nbt.parse(decompress(
      compression,
      buffer.subarray(offset + 5, offset + 4 + length),
    ));
    const raw = nbt.simplify(parsed);
    const sections = new Map((raw.sections ?? []).map((section) => [Number(section.Y), section]));
    const chunk = { cx, cz, raw, sections };
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

const AIR = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
  'minecraft:light',
  'minecraft:structure_void',
  'minecraft:moving_piston',
]);
const WATER = new Set(['minecraft:water', 'minecraft:bubble_column']);

function canonicalState(state) {
  const properties = Object.entries(state?.Properties ?? state?.properties ?? {})
    .sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify({
    Name: state?.Name ?? 'minecraft:air',
    ...(properties.length ? { Properties: Object.fromEntries(properties) } : {}),
  });
}

function isWaterlogged(state) {
  const properties = state?.Properties ?? state?.properties ?? {};
  return properties.waterlogged === 'true' || properties.waterlogged === true;
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

function compareCells(left, right) {
  return left.x - right.x || left.y - right.y || left.z - right.z;
}

function pointKey(cell) {
  return `${cell.x},${cell.y},${cell.z}`;
}

function union(...sets) {
  const result = new Map();
  for (const cells of sets) {
    for (const cell of cells) result.set(pointKey(cell), cell);
  }
  return [...result.values()].sort(compareCells);
}

function difference(left, right) {
  const excluded = new Set(right.map(pointKey));
  return left.filter((cell) => !excluded.has(pointKey(cell)));
}

function intersection(left, right) {
  const included = new Set(right.map(pointKey));
  return left.filter((cell) => included.has(pointKey(cell)));
}

function insideHalfOpen(cell, bounds) {
  return cell.x >= bounds.minXInclusive && cell.x < bounds.maxXExclusive
    && cell.y >= bounds.minYInclusive && cell.y < bounds.maxYExclusive
    && cell.z >= bounds.minZInclusive && cell.z < bounds.maxZExclusive;
}

function insideInclusive(cell, bounds) {
  return cell.x >= bounds.minX && cell.x <= bounds.maxX
    && cell.y >= bounds.minY && cell.y <= bounds.maxY
    && cell.z >= bounds.minZ && cell.z <= bounds.maxZ;
}

function boundsOfCells(cells) {
  if (!cells.length) return null;
  return {
    minX: Math.min(...cells.map(({ x }) => x)),
    maxX: Math.max(...cells.map(({ x }) => x)),
    minY: Math.min(...cells.map(({ y }) => y)),
    maxY: Math.max(...cells.map(({ y }) => y)),
    minZ: Math.min(...cells.map(({ z }) => z)),
    maxZ: Math.max(...cells.map(({ z }) => z)),
  };
}

function hashCells(cells, label, preamble = CELL_HASH_PREAMBLE) {
  const digest = crypto.createHash('sha256');
  digest.update(`${preamble}-${label}\n`);
  for (const cell of [...cells].sort(compareCells)) digest.update(`${cell.x},${cell.y},${cell.z}\n`);
  return digest.digest('hex');
}

function componentSummary(cells) {
  const remaining = new Set(cells.map(pointKey));
  const sizes = [];
  const directions = [
    [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
  ];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const queue = [first];
    let size = 0;
    for (let index = 0; index < queue.length; index++) {
      const [x, y, z] = queue[index].split(',').map(Number);
      size++;
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

function cellSetRecord(cells, label, reconstructionRule) {
  return {
    representation: 'SPARSE_DERIVED_EXACT_INTEGER_CELL_SET_NO_INLINE_COORDINATES',
    reconstructionRule,
    cellCount: cells.length,
    bounds: boundsOfCells(cells),
    coordinateSetSha256: hashCells(cells, label),
    ...componentSummary(cells),
    accepted: false,
    operationAuthorization: false,
  };
}

function hashPairs(pairs, label) {
  const digest = crypto.createHash('sha256');
  digest.update(`${PAIR_HASH_PREAMBLE}-${label}\n`);
  for (const pair of [...pairs].sort((left, right) => (
    compareCells(left.from, right.from) || compareCells(left.to, right.to)
  ))) digest.update(`${pointKey(pair.from)}>${pointKey(pair.to)}\n`);
  return digest.digest('hex');
}

function boundsIntersect(left, right) {
  return left.minX <= right.maxX && left.maxX >= right.minX
    && left.minY <= right.maxY && left.maxY >= right.minY
    && left.minZ <= right.maxZ && left.maxZ >= right.minZ;
}

function sortedCounts(record) {
  return Object.fromEntries(Object.entries(record).sort(([left], [right]) => left.localeCompare(right)));
}

const b11 = readJson(INPUTS.b11);
const ownerAcceptance = readJson(INPUTS.ownerAcceptance);
const b12 = readJson(INPUTS.b12);
const houstonGeometry = readJson(INPUTS.houstonGeometry);
const currentRegionEvidence = readJson(INPUTS.currentRegionEvidence);
const phase0 = readJson(INPUTS.phase0);
const protectedRelics = readJson(INPUTS.protectedRelics);
const c1 = readJson(INPUTS.c1);
const completeSave = readJson(INPUTS.completeSave);

invariant(
  b11.authority?.acceptancePayloadSha256
    === 'd1bcd9aa70fb5374407013cf87b6396083341057e61a45764f42622cc2706d28',
  'immutable B11 acceptance payload identity drift',
);
invariant(ownerAcceptance.effectivePlanningDisposition?.p1B11PlanningBasisAccepted === true,
  'P1-B11 owner planning acceptance missing');
invariant(ownerAcceptance.disposition?.allTechnicalHoldsRetained === true
  && ownerAcceptance.effectivePlanningDisposition?.technicalHoldPassedCount === 0,
'owner acceptance no longer retains every technical HOLD');
invariant(b12.status
  === 'EXACT_PASSIVE_SHELL_CANDIDATE_READY_FOR_REVIEW_ALL_TECHNICAL_AND_PHYSICAL_GATES_HOLD',
'P1-B12 shell status drift');
invariant(b12.authorityBoundary?.thisCandidateAcceptedByOwner === false,
  'P1-B12 unexpectedly accepted');
invariant(b12.exactSection?.evenWidthSideBias?.outerZOffsetsInclusive?.min === -3
  && b12.exactSection?.evenWidthSideBias?.outerZOffsetsInclusive?.max === 4,
'P1-B12 side-bias precedent drift');
invariant(currentRegionEvidence.selectedRegionOnlyEvidence?.completeness?.status
  === 'INCOMPLETE_REGION_ONLY_TERRAIN_AND_BLOCK_ENTITY_EVIDENCE',
'current region evidence completeness boundary drift');
invariant(phase0.generatedStructureStarts?.length === 114, 'Phase 0 structure registry drift');
invariant(protectedRelics.relics?.length === 3, 'protected-relic registry drift');
invariant(completeSave.status === 'HOLD_INCOMPLETE_OR_UNBOUND_SAVE',
  'complete-save intake status drift');

const grand = b11.acceptancePayload.grandAvenue;
const plan = rasterLine(grand.start, grand.end);
const profile = plan.map((point, station) => ({
  station,
  x: point.x,
  y: 68 + Math.round((4 * station) / (plan.length - 1)),
  z: point.z,
}));
const profileManifest = `${profile.map(({ x, y, z }) => `${x},${y},${z}`).join('\n')}\n`;
invariant(profile.length === 299, 'profile point-count drift');
invariant(sha256(profileManifest) === grand.centerlineSha256, 'accepted B11 profile hash drift');

const roadSurface = [];
const interactionPrism = [];
const roadLoadReservation = [];
const drainageReservation = [];
const dryUtilityReservation = [];
const wetUtilityReservation = [];
for (const point of profile) {
  for (const dz of ROAD_Z_OFFSETS) {
    roadSurface.push({ x: point.x, y: point.y, z: point.z + dz, station: point.station });
    for (const dy of [-2, -1]) {
      roadLoadReservation.push({
        x: point.x,
        y: point.y + dy,
        z: point.z + dz,
        station: point.station,
      });
    }
  }
  for (const dz of INTERACTION_Z_OFFSETS) {
    for (const dy of INTERACTION_Y_OFFSETS) {
      interactionPrism.push({
        x: point.x,
        y: point.y + dy,
        z: point.z + dz,
        station: point.station,
      });
    }
  }
  drainageReservation.push(
    { x: point.x, y: point.y - 1, z: point.z - 4, station: point.station, side: 'negative-z' },
    { x: point.x, y: point.y - 1, z: point.z + 5, station: point.station, side: 'positive-z' },
  );
  dryUtilityReservation.push({
    x: point.x, y: point.y - 2, z: point.z - 4, station: point.station,
  });
  wetUtilityReservation.push({
    x: point.x, y: point.y - 2, z: point.z + 5, station: point.station,
  });
}

const utilityReservation = union(dryUtilityReservation, wetUtilityReservation);
const influenceReservation = union(
  roadLoadReservation,
  drainageReservation,
  utilityReservation,
);
const interactionShell = difference(interactionPrism, roadSurface);

invariant(roadSurface.length === 2392, 'road-surface count drift');
invariant(roadLoadReservation.length === 4784, 'load-reservation count drift');
invariant(drainageReservation.length === 598, 'drainage-reservation count drift');
invariant(dryUtilityReservation.length === 299, 'dry-utility count drift');
invariant(wetUtilityReservation.length === 299, 'wet-utility count drift');
invariant(utilityReservation.length === 598, 'utility-union count drift');
invariant(influenceReservation.length === 5980, 'influence-union count drift');
invariant(interactionPrism.length === 11960, 'interaction-prism count drift');
invariant(interactionShell.length === 9568, 'interaction-shell count drift');
invariant(intersection(dryUtilityReservation, wetUtilityReservation).length === 0,
  'dry/wet utility reservations overlap');
const interactionPrismKeys = new Set(interactionPrism.map(pointKey));
invariant(influenceReservation.every((cell) => (
  interactionPrismKeys.has(pointKey(cell))
)), 'influence reservation escapes interaction prism');

const b12RoadLoadHash = hashCells(
  roadLoadReservation,
  'road-load-separation',
  B12_CELL_HASH_PREAMBLE,
);
invariant(
  b12RoadLoadHash === b12.exactCellSets.twoLayerRoadLoadSeparation.coordinateSetSha256,
  'road-load reservation does not match P1-B12 exact separation set',
);

const b12OuterEnvelope = [];
const b12Reference = profile.map((point) => ({ ...point, y: point.y - 6 }));
for (const point of b12Reference) {
  for (const dy of [-2, -1, 0, 1, 2, 3]) {
    for (const dz of ROAD_Z_OFFSETS) {
      b12OuterEnvelope.push({ x: point.x, y: point.y + dy, z: point.z + dz });
    }
  }
}
const b12Influence = union(b12OuterEnvelope, roadLoadReservation);
invariant(hashCells(b12OuterEnvelope, 'outer-envelope', B12_CELL_HASH_PREAMBLE)
  === b12.exactCellSets.outerEnvelope.coordinateSetSha256,
'reconstructed P1-B12 outer envelope drift');
invariant(hashCells(b12Influence, 'influence-union', B12_CELL_HASH_PREAMBLE)
  === b12.exactCellSets.candidateInfluenceUnion.coordinateSetSha256,
'reconstructed P1-B12 influence union drift');

const roadSurfaceToUpperLoadPairs = roadSurface.map((to) => ({
  from: { x: to.x, y: to.y - 1, z: to.z },
  to,
}));
const b12InfluenceOverlap = intersection(interactionPrism, b12Influence);
const b12ConstructionOverlap = intersection(roadSurface, b12OuterEnvelope);
invariant(b12InfluenceOverlap.length === 4784, 'P1-B12 interaction overlap count drift');
invariant(b12ConstructionOverlap.length === 0, 'surface geometry collides with P1-B12 shell');

const houstonSample = houstonGeometry.compiledCoordinationGeometry.normalized04EnvelopeCellSets
  .find((item) => item.id === 'houston-tunnel-sample');
invariant(houstonSample, 'Houston exact envelope missing');
const houstonBounds = houstonSample.exactCoordinationCellSet.bounds;
const houstonConstructionOverlap = roadSurface.filter((cell) => insideHalfOpen(cell, houstonBounds));
const houstonInteractionOverlap = interactionPrism.filter((cell) => insideHalfOpen(cell, houstonBounds));
const houstonInfluenceOverlap = influenceReservation.filter((cell) => insideHalfOpen(cell, houstonBounds));
const houstonLoadOverlap = roadLoadReservation.filter((cell) => insideHalfOpen(cell, houstonBounds));
const houstonDrainageOverlap = drainageReservation.filter((cell) => insideHalfOpen(cell, houstonBounds));
const houstonUtilityOverlap = utilityReservation.filter((cell) => insideHalfOpen(cell, houstonBounds));
invariant(houstonConstructionOverlap.length === 0, 'unexpected Houston surface overlap');
invariant(houstonInteractionOverlap.length === 260, 'Houston interaction overlap count drift');
invariant(houstonInfluenceOverlap.length === 260, 'Houston influence overlap count drift');
invariant(houstonLoadOverlap.length === 208, 'Houston load overlap count drift');
invariant(hashCells(
  houstonLoadOverlap,
  'houston-road-separation-overlap',
  B12_CELL_HASH_PREAMBLE,
) === b12.houstonZ03Z05Coordination.exactCellSets.roadLoadSeparationOverlap.coordinateSetSha256,
'Houston load overlap does not match P1-B12');

const snapshotPath = currentRegionEvidence.selectedRegionOnlyEvidence.identity.path;
const immutableSnapshot = snapshotIdentity(absolute(snapshotPath));
invariant(immutableSnapshot.sha256
  === currentRegionEvidence.selectedRegionOnlyEvidence.identity.sha256,
'selected region-only snapshot identity drift');
invariant(immutableSnapshot.sha256 === phase0.snapshots.postGeneration.sha256,
  'Phase 0/current region snapshot identity mismatch');

const reader = new SnapshotReader(absolute(snapshotPath));
const requiredChunks = new Map();
for (const cell of interactionPrism) {
  const cx = Math.floor(cell.x / 16);
  const cz = Math.floor(cell.z / 16);
  requiredChunks.set(`${cx},${cz}`, { cx, cz });
}
const missingChunks = [];
for (const coordinate of [...requiredChunks.values()].sort((left, right) => (
  left.cx - right.cx || left.cz - right.cz
))) {
  if (!await reader.readChunk(coordinate.cx, coordinate.cz)) missingChunks.push(coordinate);
}
invariant(missingChunks.length === 0, 'road interaction prism has missing chunks');

const currentByCell = new Map();
for (const cell of interactionPrism) {
  const chunk = reader.chunks.get(`${Math.floor(cell.x / 16)},${Math.floor(cell.z / 16)}`);
  const rawState = reader.stateAt(chunk, cell.x, cell.y, cell.z);
  currentByCell.set(pointKey(cell), {
    ...cell,
    name: rawState?.Name ?? 'minecraft:air',
    canonicalState: canonicalState(rawState),
    waterlogged: isWaterlogged(rawState),
  });
}

function currentStateCensus(cells, label) {
  const records = cells.map((cell) => {
    const current = currentByCell.get(pointKey(cell));
    invariant(current, `${label} current-state lookup missing`);
    return current;
  }).sort(compareCells);
  const counts = {};
  let airCellCount = 0;
  let waterCellCount = 0;
  let waterloggedCellCount = 0;
  let lavaCellCount = 0;
  let gravitySensitiveCellCount = 0;
  const digest = crypto.createHash('sha256');
  digest.update(`${STATE_HASH_PREAMBLE}-${label}\n`);
  for (const record of records) {
    counts[record.canonicalState] = (counts[record.canonicalState] ?? 0) + 1;
    if (AIR.has(record.name)) airCellCount++;
    if (WATER.has(record.name) || record.waterlogged) waterCellCount++;
    if (record.waterlogged) waterloggedCellCount++;
    if (record.name === 'minecraft:lava') lavaCellCount++;
    if (isGravitySensitive(record.name)) gravitySensitiveCellCount++;
    digest.update(`${record.x},${record.y},${record.z}\t${record.canonicalState}\n`);
  }
  return {
    classification: 'IMMUTABLE_REGION_CURRENT_STATE_NOT_FUTURE_STATE',
    cellCount: records.length,
    coordinateSetSha256: hashCells(cells, label),
    blockStateSetSha256: digest.digest('hex'),
    airCellCount,
    presentCellCount: records.length - airCellCount,
    waterCellCount,
    waterloggedCellCount,
    lavaCellCount,
    gravitySensitiveCellCount,
    canonicalStateCounts: sortedCounts(counts),
  };
}

const currentState = {
  proposedRoadConstruction: currentStateCensus(roadSurface, 'road-surface'),
  candidateInteractionUnion: currentStateCensus(interactionPrism, 'interaction-prism'),
  candidateInfluenceReservation: currentStateCensus(influenceReservation, 'influence-reservation'),
  roadLoadReservation: currentStateCensus(roadLoadReservation, 'road-load-reservation'),
  drainageReservation: currentStateCensus(drainageReservation, 'drainage-reservation'),
  dryUtilityReservation: currentStateCensus(dryUtilityReservation, 'dry-utility-reservation'),
  wetUtilityReservation: currentStateCensus(wetUtilityReservation, 'wet-utility-reservation'),
  houstonInteractionOverlap: currentStateCensus(
    houstonInteractionOverlap,
    'houston-interaction-overlap',
  ),
};

const structureRegistryManifest = `${phase0.generatedStructureStarts.map((record, sourceIndex) => (
  `${sourceIndex}\t${record.id}\t${record.chunkX},${record.chunkZ}\t`
  + `${record.bounds.minX},${record.bounds.minY},${record.bounds.minZ},`
  + `${record.bounds.maxX},${record.bounds.maxY},${record.bounds.maxZ}`
)).join('\n')}\n`;
const structureRecords = phase0.generatedStructureStarts.map((record, sourceIndex) => {
  const exactIntersection = interactionPrism.filter((cell) => insideInclusive(cell, record.bounds));
  return {
    sourceIndex,
    id: record.id,
    startChunk: { x: record.chunkX, z: record.chunkZ },
    inclusiveBounds: record.bounds,
    candidateInteractionIntersection: cellSetRecord(
      exactIntersection,
      `structure-${sourceIndex}-interaction`,
      `exact intersection with Phase 0 generatedStructureStarts[${sourceIndex}] inclusive bounds`,
    ),
  };
});

const protectedCoreRecords = protectedRelics.relics.map((relic) => {
  const exactIntersection = interactionPrism.filter(
    (cell) => insideInclusive(cell, relic.declaredInclusiveBounds),
  );
  return {
    key: relic.key,
    structureId: relic.structureId,
    inclusiveBounds: relic.declaredInclusiveBounds,
    boundCoreCellCount: relic.evidenceBackedDefaultDenyCore.cellCount,
    boundCoreCoordinateSetSha256: relic.evidenceBackedDefaultDenyCore.coordinateSetSha256,
    positiveMarginStatus: relic.positiveMarginBuffer.status,
    candidateInteractionIntersection: cellSetRecord(
      exactIntersection,
      `protected-core-${relic.key}-interaction`,
      `exact intersection with protectedRelics.relics[${relic.key}] inclusive core bounds`,
    ),
  };
});

const interactionBounds = boundsOfCells(interactionPrism);
const c1Bounds2d = c1.crossSection.totalLandTake.bounds;
const c1Coordination = {
  sourceExactColumnSetSha256: c1.crossSection.totalLandTake.columnSetSha256,
  sourceBounds2d: c1Bounds2d,
  b11CandidateInteractionBounds3d: interactionBounds,
  classification: interactionBounds.minX > c1Bounds2d.maxX
    ? 'BOUNDS_DISJOINT'
    : 'BOUNDS_INTERSECT_REQUIRES_EXACT_AUDIT',
  clearIntermediateXColumnCount: Math.max(0, interactionBounds.minX - c1Bounds2d.maxX - 1),
  physicalSeamAccepted: false,
};
invariant(c1Coordination.classification === 'BOUNDS_DISJOINT', 'C1 bounds unexpectedly overlap');

// B11 is an upstream input to the canonical G03 compiler. Consuming G03 here
// creates a descendant-evidence cycle, so this bounded compiler evaluates only
// its independently reconstructed B12 seam. All remaining cross-scope
// comparisons belong to downstream G03/G04/G05 audits.
const otherScopeAudit = [{
  scopeId: 'P1-B12',
  classification: 'EXACT_INTERSECTION_COMPILED',
  exactCandidateInteractionIntersection: cellSetRecord(
    b12InfluenceOverlap,
    'b12-influence-interaction-overlap',
    'B11 candidate interaction union intersect reconstructed exact P1-B12 candidate influence union',
  ),
  acceptedInterface: false,
}];

const exactCellSets = {
  proposedRoadConstruction: cellSetRecord(
    roadSurface,
    'road-surface',
    'at each accepted B11 station, roadY with global Z offsets -3…+4',
  ),
  candidateInteractionUnion: cellSetRecord(
    interactionPrism,
    'interaction-prism',
    'at each accepted B11 station, global Z offsets -4…+5 and Y offsets roadY-2…roadY+1',
  ),
  interactionShellExcludingConstruction: cellSetRecord(
    interactionShell,
    'interaction-shell',
    'candidate interaction union minus proposed road construction geometry',
  ),
  roadLoadInfluenceReservation: cellSetRecord(
    roadLoadReservation,
    'road-load-reservation',
    'at each accepted B11 station, road Z offsets -3…+4 at roadY-2 and roadY-1',
  ),
  bilateralDrainageReservation: cellSetRecord(
    drainageReservation,
    'drainage-reservation',
    'at each accepted B11 station, roadside Z offsets -4 and +5 at roadY-1',
  ),
  dryUtilityReservation: cellSetRecord(
    dryUtilityReservation,
    'dry-utility-reservation',
    'at each accepted B11 station, negative-Z roadside offset -4 at roadY-2',
  ),
  wetUtilityReservation: cellSetRecord(
    wetUtilityReservation,
    'wet-utility-reservation',
    'at each accepted B11 station, positive-Z roadside offset +5 at roadY-2',
  ),
  utilityReservationUnion: cellSetRecord(
    utilityReservation,
    'utility-reservation-union',
    'disjoint dry and wet roadside utility reservation union',
  ),
  candidateInfluenceReservationUnion: cellSetRecord(
    influenceReservation,
    'influence-reservation',
    'road-load, bilateral drainage, and dry/wet utility reservation union',
  ),
};

const houstonCellSets = {
  proposedRoadConstructionOverlap: cellSetRecord(
    houstonConstructionOverlap,
    'houston-road-construction-overlap',
    'proposed road construction intersect exact half-open Houston sample envelope',
  ),
  candidateInteractionOverlap: cellSetRecord(
    houstonInteractionOverlap,
    'houston-interaction-overlap',
    'candidate interaction union intersect exact half-open Houston sample envelope',
  ),
  candidateInfluenceReservationOverlap: cellSetRecord(
    houstonInfluenceOverlap,
    'houston-influence-overlap',
    'candidate influence reservation union intersect exact half-open Houston sample envelope',
  ),
  roadLoadReservationOverlap: cellSetRecord(
    houstonLoadOverlap,
    'houston-load-overlap',
    'road-load reservation intersect exact half-open Houston sample envelope',
  ),
  drainageReservationOverlap: cellSetRecord(
    houstonDrainageOverlap,
    'houston-drainage-overlap',
    'bilateral drainage reservation intersect exact half-open Houston sample envelope',
  ),
  utilityReservationOverlap: cellSetRecord(
    houstonUtilityOverlap,
    'houston-utility-overlap',
    'dry/wet utility reservation union intersect exact half-open Houston sample envelope',
  ),
};

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-b11-surface-road-technical-proposal',
  proposalId: 'P1-B11-GRAND-AVENUE-SURFACE-ROAD-PROPOSAL-01',
  generatedAtUtc: GENERATED_AT,
  status: 'EXACT_SURFACE_ROAD_SET_OUT_PROPOSAL_READY_ALL_TECHNICAL_AND_PHYSICAL_GATES_HOLD',
  purpose: 'Remove P1-B11 construction/interaction/influence geometry nulls for review without changing accepted profile authority or accepting any technical design, future state, ownership, interface, material, or operation.',
  authorityBoundary: {
    b11PlanningProfileAcceptedBySoleOwner: true,
    b11AcceptancePayloadSha256: b11.authority.acceptancePayloadSha256,
    acceptedProfileAmended: false,
    eightWideSideBiasProposedByThisArtifact: true,
    eightWideSideBiasAcceptedByOwner: false,
    technicalDesignAccepted: false,
    canonicalOwnershipAccepted: false,
    interfaceContractsAccepted: false,
    physicalReleaseAuthorized: false,
  },
  safetyBoundary: {
    offlineOnly: true,
    immutableCopiedRegionOnly: true,
    liveCallsPerformed: [],
    proposedBlockStatePalette: [],
    proposedFutureStateRecords: [],
    operations: [],
    acceptedFutureStateCellCount: 0,
    acceptedConstructionCellCount: 0,
    acceptedMaterialCellCount: 0,
    acceptedInfluenceCellCount: 0,
    operationCellCount: 0,
    executable: false,
    constructionAuthorized: false,
    materialSelectionAuthorized: false,
    worldEditAuthorized: false,
  },
  sourceBindings: {
    ...Object.fromEntries(Object.entries(INPUTS).map(([key, relativePath]) => [
      key,
      fileBinding(relativePath, ROLES[key]),
    ])),
    immutableSelectedRegionSnapshot: immutableSnapshot,
  },
  exactAcceptedReferenceProfile: {
    classification: 'OWNER_ACCEPTED_B11_PLANNING_PROFILE_UNCHANGED',
    pointCount: profile.length,
    start: profile[0],
    end: profile.at(-1),
    orderedCoordinateSha256: grand.centerlineSha256,
    riseStations: grand.riseStations,
    crossSectionBlocks: grand.crossSectionBlocks,
    acceptedProfileAmendedByThisArtifact: false,
  },
  proposedEightWideSetout: {
    classification: 'DETERMINISTIC_EXACT_INTEGER_PROPOSAL_NOT_ACCEPTED_FUTURE_STATE',
    orientationConvention: 'station slices are X-constant and lateral offsets are global Z; B11 advances +X with Z unchanged or -1',
    referenceLatticePosition: 'lower-Z central lattice column',
    roadZOffsetsInclusive: { min: -3, max: 4 },
    extraCellSide: 'positive-Z',
    precedent: 'Matches the exact P1-B12 even-width convention so the B11 two-layer load reservation is identical to the B12 road-load separation set.',
    materialOrBlockStateSelected: false,
    formationDepthSelected: false,
    earthworkExtentsSelected: false,
    retainingExtentsSelected: false,
    accepted: false,
  },
  exactCellSets,
  reservationDesign: {
    classification: 'EXACT_COORDINATION_RESERVATIONS_NOT_ACCEPTED_ENGINEERED_SYSTEMS',
    roadLoad: {
      verticalLayersBelowRoadDatum: [-2, -1],
      exactMatchToB12TwoLayerRoadLoadSeparation: true,
      b12BoundCoordinateSetSha256: b12RoadLoadHash,
      structuralLoadModel: null,
      accepted: false,
    },
    drainage: {
      sides: ['negative-Z', 'positive-Z'],
      crossfall: null,
      catchments: null,
      capacity: null,
      receiver: null,
      outfall: null,
      futureFluidState: null,
      accepted: false,
    },
    utilities: {
      drySide: 'negative-Z',
      wetSide: 'positive-Z',
      dryWetCellSetsDisjoint: true,
      serviceTypes: null,
      capacities: null,
      crossingDetails: null,
      commissioning: null,
      accepted: false,
    },
    expertConstructionInfluenceKernel: null,
    expertConstructionInfluenceAccepted: false,
  },
  exactCurrentStateCensus: {
    requiredChunkCount: requiredChunks.size,
    missingChunkCount: missingChunks.length,
    sets: currentState,
    fluidFinding: {
      interactionWaterOrWaterloggedCellCount: currentState.candidateInteractionUnion.waterCellCount,
      interactionWaterloggedCellCount: currentState.candidateInteractionUnion.waterloggedCellCount,
      interactionLavaCellCount: currentState.candidateInteractionUnion.lavaCellCount,
      hydraulicOrGroundwaterInferenceAllowed: false,
    },
    qualification: 'Exact current block/fluid states in the immutable copied region only; not excavation, earthwork, retaining, groundwater, drainage, structural, utility, or future-state evidence.',
  },
  generatedStructureAudit: {
    sourceRecordCount: phase0.generatedStructureStarts.length,
    sourceRegistrySha256: sha256(structureRegistryManifest),
    evaluatedRecordCount: structureRecords.length,
    recordsWithCandidateInteractionIntersection: structureRecords.filter(
      (record) => record.candidateInteractionIntersection.cellCount > 0,
    ).length,
    records: structureRecords,
    exactPresentFabricClearanceAccepted: false,
    constructionInfluenceMarginAccepted: false,
    qualification: 'Every Phase 0 start bound is intersected exactly; bounds do not prove present fabric or a positive construction margin.',
  },
  protectedRelicAudit: {
    sourceCoreCount: protectedCoreRecords.length,
    evaluatedCoreCount: protectedCoreRecords.length,
    coresWithCandidateInteractionIntersection: protectedCoreRecords.filter(
      (record) => record.candidateInteractionIntersection.cellCount > 0,
    ).length,
    records: protectedCoreRecords,
    finalPositiveMarginClearanceAccepted: false,
  },
  p1B12Coordination: {
    b12CandidateId: b12.candidateId,
    b12CandidateAccepted: false,
    exactRoadLoadSetsIdentical: true,
    roadLoadCellCount: roadLoadReservation.length,
    b12BoundRoadLoadCoordinateSetSha256: b12RoadLoadHash,
    proposedRoadConstructionVsB12OuterEnvelope: cellSetRecord(
      b12ConstructionOverlap,
      'b12-outer-road-construction-overlap',
      'proposed road construction intersect reconstructed exact P1-B12 outer envelope',
    ),
    candidateInteractionVsB12Influence: cellSetRecord(
      b12InfluenceOverlap,
      'b12-influence-interaction-overlap',
      'candidate interaction union intersect reconstructed exact P1-B12 candidate influence union',
    ),
    roadSurfaceToB12UpperLoadLayer: {
      relationship: 'VERTICALLY_ADJACENT_AT_EVERY_ROAD_CELL',
      transitionPairCount: roadSurfaceToUpperLoadPairs.length,
      transitionPairSha256: hashPairs(roadSurfaceToUpperLoadPairs, 'b12-upper-load-to-road-surface'),
      accepted: false,
    },
    canonicalSharedOwnerAccepted: false,
    structuralTransferAccepted: false,
    physicalSeamAccepted: false,
  },
  houstonZ03Z05Coordination: {
    exactHalfOpenHoustonSampleEnvelope: houstonBounds,
    houstonSampleEnvelopeCellCount: houstonSample.exactCoordinationCellSet.cellCount,
    exactCellSets: houstonCellSets,
    interpretation: 'Surface geometry is above the half-open sample, while the proposed road-load, drainage, and utility influence reservations overlap it at the east end.',
    sameCoordinateOverlapRequiresCanonicalOwnerAdjudication: true,
    physicalSeamAccepted: false,
    connectionOpened: false,
  },
  c1AndOtherScopeAudit: {
    c1: c1Coordination,
    g03OtherScopes: otherScopeAudit,
    knownBoundsIntersectionRequiringExactFollowupCount: otherScopeAudit.filter((record) => (
      record.classification === 'BOUNDS_INTERSECT_REQUIRES_EXACT_CELL_AUDIT'
    )).length,
    unknownCanonicalScopeCount: 0,
    otherScopesDeferredToDownstreamCanonicalAudits: true,
    qualification: 'Only the independently reconstructed B12 seam is evaluated here. Remaining cross-scope comparisons are deferred to downstream G03/G04/G05 so this upstream proposal stays acyclic.',
  },
  g03ProposalImpact: {
    currentCommittedG03ArtifactModified: false,
    currentCommittedG03Result: null,
    currentCommittedUnresolvedRequiredDomainCount: null,
    descendantG03Consumed: false,
    historicalMigrationBaselineSchemaVersion: 1,
    historicalUnresolvedRequiredDomainCount: 19,
    p1B11GeometryNullDomainsBefore: ['construction', 'interaction', 'influence'],
    p1B11GeometryNullDomainsRemovedByThisProposal: ['construction', 'interaction', 'influence'],
    proposalGeometryNullDomainRemovalCount: 3,
    projectedRemainingGeometryNullDomainsIfConsumedByNextG03Compilation: 16,
    p1B11AcceptedDomainCount: 0,
    canonicalG03Passed: false,
    reason: 'The three P1-B11 domains have exact upstream proposal sets. This compiler does not consume or pass descendant G03, and none is accepted construction/influence authority.',
  },
  nullTechnicalDesignAndRetainedHolds: [
    {
      id: 'P1-B11-H01-MATERIAL-AND-FUTURE-STATE',
      status: 'HOLD',
      selectedMaterialPalette: null,
      acceptedFutureStateManifest: null,
      basis: 'Setout geometry selects no block, pavement, marking, edge, or replacement state.',
    },
    {
      id: 'P1-B11-H02-EARTHWORK-AND-RETAINING',
      status: 'HOLD',
      excavationManifest: null,
      fillManifest: null,
      retainingManifest: null,
      basis: 'Formation depth, cut/fill, side slopes, unsuitable material, mass haul, and retaining systems are unselected.',
    },
    {
      id: 'P1-B11-H03-DRAINAGE',
      status: 'HOLD',
      hydraulicDesign: null,
      receiverAndOutfall: null,
      basis: 'Exact roadside cells are reservation geometry only; catchment, capacity, crossfall, receiver, outfall, failure, and future-fluid states are null.',
    },
    {
      id: 'P1-B11-H04-UTILITIES',
      status: 'HOLD',
      utilityDesign: null,
      basis: 'Exact dry/wet cells are reservations only; services, capacities, separations, crossings, owners, and commissioning are null.',
    },
    {
      id: 'P1-B11-H05-STRUCTURAL-AND-ROAD-LOAD',
      status: 'HOLD',
      structuralDesign: null,
      loadModel: null,
      basis: 'The exact two-layer overlap with B12 is coordination geometry, not cover, bearing, settlement, foundation, lining, or load-transfer acceptance.',
    },
    {
      id: 'P1-B11-H06-GEOTECHNICAL',
      status: 'HOLD',
      geotechnicalDesignBasis: null,
      basis: 'No accepted geology, groundwater, bearing, settlement, excavation-stability, or ground-improvement basis exists.',
    },
    {
      id: 'P1-B11-H07-COMPLETE-SAVE-AND-ENTITY-CLEARANCE',
      status: 'HOLD',
      completeSameMomentSave: null,
      exactEntityClearance: null,
      basis: 'The selected evidence is region-only; entities, POI, and level.dat are absent.',
    },
    {
      id: 'P1-B11-H08-OWNERSHIP-INTERFACES-AND-TECHNICAL-ACCEPTANCE',
      status: 'HOLD',
      canonicalOwnership: null,
      acceptedInterfaceContracts: null,
      independentTechnicalAcceptance: null,
      basis: 'The side bias, exact sets, B12/Houston seams, and systems remain proposals with no self-acceptance.',
    },
    {
      id: 'P1-B11-H09-PHYSICAL-COMPILER-AND-RELEASE',
      status: 'HOLD',
      operationPlan: null,
      rollbackPlan: null,
      preflight: null,
      releaseLedger: null,
      basis: 'No operations, source guards, rollback, preflight, release ledger, or physical authorization exists.',
    },
  ],
  decision: {
    exactSurfaceRoadSetoutPreparedForReview: true,
    acceptedB11ProfilePreservedByteForByte: true,
    sideBiasResolvedAsProposalOnly: true,
    exactConstructionInteractionAndInfluenceGeometryPrepared: true,
    materialOrFutureStateAccepted: false,
    technicalDesignAccepted: false,
    buildNow: false,
    emitOperations: false,
  },
  limitations: [
    'The one-cell road surface set is a datum/control geometry, not a pavement thickness, material schedule, or final road future state.',
    'The interaction prism and load/drainage/utility sets are exact coordination reservations, not expert physical influence kernels or commissioned systems.',
    'Region-only current states omit entities, POI, level.dat, same-moment completeness, groundwater models, and future interactions.',
    'Generated-start bounds and protected cores provide exact default-deny comparisons but no accepted positive construction-influence margin.',
    'P1-B12 and Houston overlaps disclose coordination conflicts; they do not accept owners, structural transfers, physical seams, or connections.',
    'The descendant G03 artifact is neither consumed nor edited by this bounded upstream proposal.',
  ],
};

invariant(report.safetyBoundary.acceptedConstructionCellCount === 0, 'construction accepted');
invariant(report.safetyBoundary.acceptedMaterialCellCount === 0, 'material accepted');
invariant(report.safetyBoundary.operationCellCount === 0, 'operations emitted');
invariant(report.nullTechnicalDesignAndRetainedHolds.every(({ status }) => status === 'HOLD'),
  'a technical HOLD closed');
invariant(report.generatedStructureAudit.recordsWithCandidateInteractionIntersection === 0,
  'candidate intersects a generated-structure start bound');
invariant(report.protectedRelicAudit.coresWithCandidateInteractionIntersection === 0,
  'candidate intersects a protected relic core');

const json = `${JSON.stringify(report, null, 2)}\n`;
const setRows = Object.entries(exactCellSets).map(([name, set]) => (
  `| ${name} | ${set.cellCount.toLocaleString('en-US')} | ${set.bounds ? `${set.bounds.minX}…${set.bounds.maxX}; ${set.bounds.minY}…${set.bounds.maxY}; ${set.bounds.minZ}…${set.bounds.maxZ}` : 'empty'} | \`${set.coordinateSetSha256}\` |`
)).join('\n');
const censusRows = Object.entries(currentState).map(([name, census]) => (
  `| ${name} | ${census.cellCount.toLocaleString('en-US')} | ${census.presentCellCount.toLocaleString('en-US')} | ${census.airCellCount.toLocaleString('en-US')} | ${census.waterCellCount.toLocaleString('en-US')} | ${census.lavaCellCount.toLocaleString('en-US')} | \`${census.blockStateSetSha256}\` |`
)).join('\n');
const houstonRows = Object.entries(houstonCellSets).map(([name, set]) => (
  `| ${name} | ${set.cellCount.toLocaleString('en-US')} | \`${set.coordinateSetSha256}\` |`
)).join('\n');
const otherScopeRows = otherScopeAudit.map((record) => (
  `| ${record.scopeId} | ${record.classification} | ${record.exactCandidateInteractionIntersection?.cellCount ?? '—'} | ${record.acceptedInterface ? 'yes' : 'no'} |`
)).join('\n');
const holdRows = report.nullTechnicalDesignAndRetainedHolds.map((hold) => (
  `| ${hold.id} | ${hold.status} | ${hold.basis} |`
)).join('\n');

const markdown = `# P1-B11 Grand Avenue surface-road setout and technical proposal

Generated: ${GENERATED_AT}

Status: **${report.status}**

This bounded artifact turns the accepted 299-point B11 planning profile into exact review geometry. It does not modify the accepted payload, accept the side-bias choice, select materials or future states, close a technical gate, assign ownership, or authorize construction. Accepted construction/material/future-state/operation counts remain **zero**.

## Deterministic eight-wide setout

- Accepted centerline/profile: 299 points, ${grand.start.x},${grand.start.y},${grand.start.z} to ${grand.end.x},${grand.end.y},${grand.end.z}; SHA-256 \`${grand.centerlineSha256}\`.
- Proposed road width: global Z offsets -3…+4 around the reference lattice, so the eighth cell is on the positive-Z side.
- This matches P1-B12's exact side-bias convention. The 4,784-cell road-load reservation is byte-for-byte the same coordinate set as B12's two separation layers: \`${b12RoadLoadHash}\` under the B12 hash contract.
- The road construction proposal is one lattice layer at roadY. Formation depth, pavement thickness, earthwork, retaining, and materials remain null.

## Exact proposal sets

| Set | Cells | Inclusive X; Y; Z bounds | Coordinate-set SHA-256 |
|---|---:|---|---|
${setRows}

The candidate interaction union is a ten-wide prism from roadY-2 through roadY+1. It contains the road setout and every load/drainage/utility reservation, but it is not an accepted construction-influence kernel.

## Immutable current-state and fluid census

| Set | Cells | Present | Air | Water/waterlogged | Lava | Block-state SHA-256 |
|---|---:|---:|---:|---:|---:|---|
${censusRows}

The compiler read ${requiredChunks.size} chunks with zero missing chunks from immutable region snapshot \`${immutableSnapshot.sha256}\`. This is current block/fluid evidence only. The save is incomplete because entities, POI, and level.dat are absent.

## Structure and relic audit

All ${structureRecords.length} Phase 0 generated-start bounds were intersected with the exact interaction union; ${report.generatedStructureAudit.recordsWithCandidateInteractionIntersection} intersect. All ${protectedCoreRecords.length} evidence-backed relic cores were intersected; ${report.protectedRelicAudit.coresWithCandidateInteractionIntersection} intersect.

These zero intersections do not establish present-fabric clearance, a geotechnical influence area, or a positive construction margin.

## P1-B12 seam

- Proposed surface construction versus B12 outer shell: ${b12ConstructionOverlap.length} same-coordinate cells.
- Candidate interaction versus B12 influence: ${b12InfluenceOverlap.length.toLocaleString('en-US')} cells, exactly the shared two-layer load reservation.
- B12 upper load layer to proposed road surface: ${roadSurfaceToUpperLoadPairs.length.toLocaleString('en-US')} vertical adjacency pairs, SHA-256 \`${report.p1B12Coordination.roadSurfaceToB12UpperLoadLayer.transitionPairSha256}\`.
- No shared owner, structural transfer, physical seam, or B12 construction is accepted.

## Houston coordination

Houston's exact half-open sample is X ${houstonBounds.minXInclusive}…${houstonBounds.maxXExclusive - 1}, Y ${houstonBounds.minYInclusive}…${houstonBounds.maxYExclusive - 1}, Z ${houstonBounds.minZInclusive}…${houstonBounds.maxZExclusive - 1}.

| Exact overlap | Cells | Coordinate-set SHA-256 |
|---|---:|---|
${houstonRows}

The road datum is above Houston's half-open sample at the east end, so surface construction overlap is zero. The 260-cell interaction/influence overlap consists of 208 shared load-reservation cells plus 26 drainage and 26 utility reservation cells. It remains an unaccepted Z03/Z05 ownership and technical coordination conflict.

## C1 and other scopes

C1's exact total-land-take bounds end at X=${c1Bounds2d.maxX}; this proposal starts at X=${interactionBounds.minX}, leaving ${c1Coordination.clearIntermediateXColumnCount} intervening X columns. The bounds are disjoint.

| Independently reconstructed scope | Result against B11 candidate interaction | Exact overlap cells | Accepted interface |
|---|---|---:|---|
${otherScopeRows}

P1-B12 is intersected exactly above. All other cross-scope comparisons are intentionally deferred to downstream G03/G04/G05 so this upstream B11 proposal remains acyclic.

## G03 impact

This proposal supplies exact construction, interaction, and influence sets for downstream G03. Against the immutable v1 migration baseline, those three sets projected the null ledger from 19 to 16. This artifact deliberately does not consume or rewrite descendant G03, accept the three domains, or pass the canonical gate; accepted P1-B11 domain count remains zero.

## Retained nulls and HOLDs

| Gate | Result | Unresolved basis |
|---|---|---|
${holdRows}

No operation plan, rollback, preflight, release ledger, or world mutation was generated.
`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, json);
fs.writeFileSync(MARKDOWN, markdown);

console.log(JSON.stringify({
  output: relative(OUTPUT),
  markdown: relative(MARKDOWN),
  sha256: sha256(json),
  status: report.status,
  proposedRoadConstructionCells: roadSurface.length,
  candidateInteractionCells: interactionPrism.length,
  candidateInfluenceReservationCells: influenceReservation.length,
  g03GeometryNullDomainsRemoved: report.g03ProposalImpact.proposalGeometryNullDomainRemovalCount,
  acceptedCells: 0,
  operationCells: 0,
}, null, 2));
