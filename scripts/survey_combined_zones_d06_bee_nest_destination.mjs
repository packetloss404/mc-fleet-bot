#!/usr/bin/env node
/**
 * Survey a bounded, read-only destination candidate for the occupied D06 nest.
 *
 * The result is planning evidence only. It cannot accept ownership, habitat,
 * method, NBT handling, an operation, a relocation, or a release.
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
const GENERATED_AT = value('--generated-at', '2026-08-06T03:20:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-d06-bee-nest-destination-survey.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-d06-bee-nest-destination-survey.md',
));
const INPUTS = Object.freeze({
  treatment: 'docs/masterplans/05-combined-zones/phase1-d06-bee-nest-treatment.json',
  completeSaveIntake:
    'docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit-20260806T014133Z.json',
  completeSaveScope:
    'docs/masterplans/05-combined-zones/phase1-g06-complete-save-scope-clearance-20260806T014133Z.json',
  coordinates: 'docs/masterplans/05-combined-zones/site-coordinates.json',
});
const SEARCH_BOUNDS = Object.freeze({
  minX: 1700,
  maxX: 2000,
  minY: 55,
  maxY: 95,
  minZ: 301,
  maxZ: 500,
});
const MIN_DOMAIN_BOUNDS_CLEARANCE = 64;
const MIN_PLANNING_ZONE_BOUNDS_CLEARANCE = 64;
const MAX_SOURCE_DISTANCE = 450;
const FLOWER_RADIUS = 22;
const MIN_NEARBY_FLOWERS = 5;
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const REPLACEABLE = new Set([
  'minecraft:short_grass',
  'minecraft:tall_grass',
  'minecraft:bush',
]);
const SUPPORT = new Set(['minecraft:grass_block', 'minecraft:dirt']);
const FLOWERS = new Set([
  'minecraft:dandelion',
  'minecraft:poppy',
  'minecraft:blue_orchid',
  'minecraft:allium',
  'minecraft:azure_bluet',
  'minecraft:red_tulip',
  'minecraft:orange_tulip',
  'minecraft:white_tulip',
  'minecraft:pink_tulip',
  'minecraft:oxeye_daisy',
  'minecraft:cornflower',
  'minecraft:lily_of_the_valley',
  'minecraft:sunflower',
  'minecraft:lilac',
  'minecraft:rose_bush',
  'minecraft:peony',
]);

function absolute(filename) {
  return path.join(ROOT, filename);
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
}

function binding(filename, role) {
  const data = fs.readFileSync(absolute(filename));
  return { path: filename, sha256: sha256(data), bytes: data.length, role };
}

function invariant(condition, message) {
  if (!condition) throw new Error(`D06 bee-nest destination survey rejected: ${message}`);
}

function decompress(type, data) {
  if (type === 1) return zlib.gunzipSync(data);
  if (type === 2) return zlib.inflateSync(data);
  if (type === 3) return data;
  if (type === 4) return zlib.brotliDecompressSync(data);
  throw new Error(`unsupported Anvil compression type ${type}`);
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

class AnvilReader {
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
    if (!buffer) return null;
    const index = ((cx & 31) + (cz & 31) * 32) * 4;
    const sectorOffset = buffer.readUIntBE(index, 3);
    const sectorCount = buffer[index + 3];
    if (!sectorOffset || !sectorCount) return null;
    const offset = sectorOffset * 4096;
    const size = buffer.readUInt32BE(offset);
    const compression = buffer.readUInt8(offset + 4);
    invariant(!(compression & 0x80), `external chunk storage unsupported at ${key}`);
    const compressed = buffer.subarray(offset + 5, offset + 4 + size);
    const { parsed } = await nbt.parse(decompress(compression, compressed));
    const result = nbt.simplify(parsed);
    this.chunks.set(key, result);
    return result;
  }

  async blockState(x, y, z) {
    const chunk = await this.chunk(Math.floor(x / 16), Math.floor(z / 16));
    const states = chunk?.sections?.find(({ Y }) => Number(Y) === Math.floor(y / 16))
      ?.block_states;
    if (!states?.palette?.length) return { Name: 'minecraft:air' };
    const index = ((y & 15) << 8) | ((z & 15) << 4) | (x & 15);
    return states.palette[paletteIndex(states, index, 4)] ?? { Name: 'minecraft:air' };
  }

  async biome(x, y, z) {
    const chunk = await this.chunk(Math.floor(x / 16), Math.floor(z / 16));
    const biomes = chunk?.sections?.find(({ Y }) => Number(Y) === Math.floor(y / 16))
      ?.biomes;
    if (!biomes?.palette?.length) return null;
    const index = (((y & 15) >> 2) << 4) | (((z & 15) >> 2) << 2) | ((x & 15) >> 2);
    return biomes.palette[paletteIndex(biomes, index, 1)] ?? null;
  }
}

function pointDistance(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);
}

function horizontalBoundsDistance(point, bounds) {
  const dx = point.x < bounds.minX
    ? bounds.minX - point.x
    : point.x > bounds.maxX
      ? point.x - bounds.maxX
      : 0;
  const dz = point.z < bounds.minZ
    ? bounds.minZ - point.z
    : point.z > bounds.maxZ
      ? point.z - bounds.maxZ
      : 0;
  return Math.hypot(dx, dz);
}

function inside2d(point, bounds) {
  return point.x >= bounds.minX && point.x <= bounds.maxX
    && point.z >= bounds.minZ && point.z <= bounds.maxZ;
}

const sourceBindings = {
  treatment: binding(INPUTS.treatment, 'selected non-executable intact-relocation treatment'),
  completeSaveIntake: binding(
    INPUTS.completeSaveIntake,
    'accepted complete-save identity and immutable world-root binding',
  ),
  completeSaveScope: binding(
    INPUTS.completeSaveScope,
    'all exact proposal-domain bounds, protected cores, and source equivalence',
  ),
  coordinates: binding(INPUTS.coordinates, 'accepted reserve and zone context'),
};
const treatment = readJson(INPUTS.treatment);
const completeSaveIntake = readJson(INPUTS.completeSaveIntake);
const completeSaveScope = readJson(INPUTS.completeSaveScope);
const coordinates = readJson(INPUTS.coordinates);
invariant(
  treatment.status
    === 'PARTIAL_PASS_EXACT_OCCUPIED_NEST_BOUND_HUMANE_INTACT_RELOCATION_SELECTED_TECHNICAL_AND_RELEASE_HOLD'
    && treatment.treatmentPayload?.selectedPlanningAlternativeId
      === 'D06-BEE-02-HUMANE-INTACT-RELOCATION'
    && treatment.disposition?.destinationSelected === false,
  'treatment input drift',
);
invariant(
  completeSaveIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
    && completeSaveIntake.summary?.passed === true
    && completeSaveIntake.packageIdentity?.completeSaveSha256
      === treatment.treatmentPayload?.completeSaveSha256,
  'complete-save intake drift',
);
invariant(
  completeSaveScope.completeSaveScopeEvidence?.projectScopeSourceEquivalent === true
    && completeSaveScope.completeSaveScopeEvidence
      ?.regionEquivalence?.globalChangedChunkBounds?.maxX < SEARCH_BOUNDS.minX,
  'destination search source equivalence not established',
);
const worldRoot = absolute(completeSaveIntake.input.suppliedWorldRoot);
const regionReader = new AnvilReader(path.join(worldRoot, 'region'));
const poiReader = new AnvilReader(path.join(worldRoot, 'poi'));
const entityReader = new AnvilReader(path.join(worldRoot, 'entities'));
const sourcePoint = treatment.treatmentPayload.sourceCell.bounds;
const source = { x: sourcePoint.minX, y: sourcePoint.minY, z: sourcePoint.minZ };
const domainBounds = completeSaveScope.domainSummary.map(({ domainId, bounds }) => ({
  id: domainId,
  bounds,
}));
const protectedBounds = completeSaveScope.protectedCoreSubjects.map((subject) => ({
  id: subject.subjectId,
  bounds: subject.bounds,
}));
const eastReserve = coordinates.zones.find(({ id }) => id === 'Z00');
invariant(eastReserve, 'Z00 reserve context missing');
const boundedZones = coordinates.zones.filter(({ bounds }) => bounds);

const flowers = [];
for (let x = SEARCH_BOUNDS.minX; x <= SEARCH_BOUNDS.maxX; x += 1) {
  for (let z = SEARCH_BOUNDS.minZ; z <= SEARCH_BOUNDS.maxZ; z += 1) {
    for (let y = SEARCH_BOUNDS.minY; y <= SEARCH_BOUNDS.maxY; y += 1) {
      const state = await regionReader.blockState(x, y, z);
      const block = state.Name;
      if (FLOWERS.has(block) && state.Properties?.half !== 'upper') {
        flowers.push({ x, y, z, block });
      }
    }
  }
}

const candidates = [];
for (let x = SEARCH_BOUNDS.minX; x <= SEARCH_BOUNDS.maxX; x += 1) {
  for (let z = SEARCH_BOUNDS.minZ; z <= SEARCH_BOUNDS.maxZ; z += 1) {
    let supportY = null;
    let supportBlock = null;
    for (let y = SEARCH_BOUNDS.maxY; y >= SEARCH_BOUNDS.minY; y -= 1) {
      const block = (await regionReader.blockState(x, y, z)).Name;
      if (AIR.has(block) || REPLACEABLE.has(block) || FLOWERS.has(block)) continue;
      supportY = y;
      supportBlock = block;
      break;
    }
    if (supportY === null || !SUPPORT.has(supportBlock)) continue;
    const point = { x, y: supportY + 1, z };
    const current = (await regionReader.blockState(point.x, point.y, point.z)).Name;
    const southEntrance = (await regionReader.blockState(point.x, point.y, point.z + 1)).Name;
    if (!AIR.has(current) || !AIR.has(southEntrance)) continue;
    const sourceDistance = pointDistance(point, source);
    if (sourceDistance > MAX_SOURCE_DISTANCE) continue;
    const zoneClearances = boundedZones.map(({ id, bounds }) => ({
      id,
      distance: horizontalBoundsDistance(point, bounds),
    }));
    const intersectedZoneBounds = zoneClearances.filter(({ distance }) => distance === 0)
      .map(({ id }) => id);
    const minimumPlanningZoneBoundsClearance = Math.min(
      ...zoneClearances.map(({ distance }) => distance),
    );
    if (minimumPlanningZoneBoundsClearance < MIN_PLANNING_ZONE_BOUNDS_CLEARANCE) continue;
    const domainClearances = domainBounds.map(({ id, bounds }) => ({
      id,
      distance: horizontalBoundsDistance(point, bounds),
    }));
    const protectedClearances = protectedBounds.map(({ id, bounds }) => ({
      id,
      distance: horizontalBoundsDistance(point, bounds),
    }));
    const minimumDomainBoundsClearance = Math.min(
      ...domainClearances.map(({ distance }) => distance),
    );
    const minimumProtectedCoreBoundsClearance = Math.min(
      ...protectedClearances.map(({ distance }) => distance),
    );
    if (minimumDomainBoundsClearance < MIN_DOMAIN_BOUNDS_CLEARANCE
        || minimumProtectedCoreBoundsClearance < MIN_DOMAIN_BOUNDS_CLEARANCE) continue;
    const nearbyFlowers = flowers.map((flower) => ({
      ...flower,
      distance: pointDistance(point, flower),
    })).filter(({ distance }) => distance <= FLOWER_RADIUS)
      .sort((left, right) => left.distance - right.distance
        || left.x - right.x || left.y - right.y || left.z - right.z);
    if (nearbyFlowers.length < MIN_NEARBY_FLOWERS) continue;
    candidates.push({
      point,
      desiredFacing: 'south',
      currentBlock: current,
      supportBlock,
      southEntranceBlock: southEntrance,
      biome: await regionReader.biome(point.x, point.y, point.z),
      sourceDistance: Number(sourceDistance.toFixed(6)),
      minimumDomainBoundsClearance: Number(minimumDomainBoundsClearance.toFixed(6)),
      minimumProtectedCoreBoundsClearance:
        Number(minimumProtectedCoreBoundsClearance.toFixed(6)),
      minimumPlanningZoneBoundsClearance:
        Number(minimumPlanningZoneBoundsClearance.toFixed(6)),
      insideEastReserve: inside2d(point, eastReserve.bounds),
      nearbyFlowerCount: nearbyFlowers.length,
      nearestFlowerDistance: Number(nearbyFlowers[0].distance.toFixed(6)),
      nearbyFlowers,
      intersectedZoneBounds,
      intersectedDomainBounds: domainClearances.filter(({ distance }) => distance === 0)
        .map(({ id }) => id),
      intersectedProtectedCoreBounds:
        protectedClearances.filter(({ distance }) => distance === 0).map(({ id }) => id),
    });
  }
}
candidates.sort((left, right) => (
  right.nearbyFlowerCount - left.nearbyFlowerCount
  || left.nearestFlowerDistance - right.nearestFlowerDistance
  || right.minimumDomainBoundsClearance - left.minimumDomainBoundsClearance
  || left.sourceDistance - right.sourceDistance
  || left.point.x - right.point.x
  || left.point.y - right.point.y
  || left.point.z - right.point.z
));
invariant(candidates.length > 0, 'no destination candidate passed the bounded search');
const selected = candidates[0];

const destinationChunk = await regionReader.chunk(
  Math.floor(selected.point.x / 16),
  Math.floor(selected.point.z / 16),
);
const destinationBlockEntities = (destinationChunk?.block_entities ?? []).filter((record) => (
  Number(record.x) === selected.point.x
  && Number(record.y) === selected.point.y
  && Number(record.z) === selected.point.z
));
const poiChunk = await poiReader.chunk(
  Math.floor(selected.point.x / 16),
  Math.floor(selected.point.z / 16),
);
const destinationPoiRecords = Object.values(poiChunk?.Sections ?? {})
  .flatMap((section) => section.Records ?? [])
  .filter((record) => Array.isArray(record.pos)
    && Number(record.pos[0]) === selected.point.x
    && Number(record.pos[1]) === selected.point.y
    && Number(record.pos[2]) === selected.point.z);
const entityChunk = await entityReader.chunk(
  Math.floor(selected.point.x / 16),
  Math.floor(selected.point.z / 16),
);
const nearbyEntityRecords = (entityChunk?.Entities ?? []).filter(({ Pos }) => (
  Array.isArray(Pos) && pointDistance(selected.point, { x: Pos[0], y: Pos[1], z: Pos[2] }) <= 4
)).map(({ id, Pos }) => ({ entityType: id, position: Pos.slice(0, 3) }));
invariant(destinationBlockEntities.length === 0, 'selected destination has a block entity');
invariant(destinationPoiRecords.length === 0, 'selected destination already has a POI');

const candidateManifest = candidates.map((candidate) => (
  `${candidate.point.x},${candidate.point.y},${candidate.point.z}`
    + `\t${candidate.biome}\t${candidate.sourceDistance}`
    + `\t${candidate.minimumDomainBoundsClearance}`
    + `\t${candidate.minimumProtectedCoreBoundsClearance}`
    + `\t${candidate.minimumPlanningZoneBoundsClearance}`
    + `\t${candidate.nearbyFlowerCount}`
)).join('\n');
const selectedProjection = {
  ...selected,
  destinationBlockEntityCount: destinationBlockEntities.length,
  destinationPoiRecordCount: destinationPoiRecords.length,
  nearbyEntityRecordCount: nearbyEntityRecords.length,
  nearbyEntityRecords,
};
const surveyPayload = {
  completeSaveSha256: completeSaveIntake.packageIdentity.completeSaveSha256,
  sourceTreatmentPayloadSha256: treatment.treatmentPayloadSha256,
  searchContract: {
    bounds: SEARCH_BOUNDS,
    minimumDomainAndProtectedBoundsClearance: MIN_DOMAIN_BOUNDS_CLEARANCE,
    minimumPlanningZoneBoundsClearance: MIN_PLANNING_ZONE_BOUNDS_CLEARANCE,
    maximumSourceDistance: MAX_SOURCE_DISTANCE,
    flowerRadius: FLOWER_RADIUS,
    minimumNearbyFlowers: MIN_NEARBY_FLOWERS,
    currentDestinationState: 'minecraft:air',
    acceptedSupportStates: [...SUPPORT].sort(),
    requiredEntranceState: 'minecraft:air',
    desiredFacing: 'south',
    requiredOutsideEveryBoundedPlanningZone: true,
    ranking: 'maximum flower count, nearest flower, maximum proposal-bound clearance, minimum source distance, then x/y/z',
  },
  observedFlowerRecordCount: flowers.length,
  passingCandidateCount: candidates.length,
  passingCandidateManifestSha256: sha256(
    `combined-zones-d06-bee-destination-candidates-v1\n${candidateManifest}\n`,
  ),
  selectedPlanningCandidate: selectedProjection,
  destinationCellSet: {
    cellCount: 1,
    bounds: {
      minX: selected.point.x,
      maxX: selected.point.x,
      minY: selected.point.y,
      maxY: selected.point.y,
      minZ: selected.point.z,
      maxZ: selected.point.z,
    },
    coordinateSetSha256: sha256(
      `combined-zones-d06-bee-destination-cell-v1\n`
        + `${selected.point.x},${selected.point.y},${selected.point.z}\n`,
    ),
  },
  destinationAcceptance: null,
  exactRelocationMethod: null,
  exactForwardOperation: null,
  exactRollbackOperation: null,
};

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-d06-bee-nest-destination-survey',
  generatedAtUtc: GENERATED_AT,
  status:
    'PARTIAL_PASS_EXACT_CONFLICT_FREE_DESTINATION_CANDIDATE_SELECTED_OWNERSHIP_HABITAT_METHOD_AND_RELEASE_HOLD',
  purpose: 'Select one deterministic, low-impact destination planning candidate from the accepted complete save without accepting habitat, ownership, method, or physical work.',
  sourceBindings,
  surveyPayload,
  disposition: {
    boundedSearchComplete: true,
    destinationPlanningCandidateSelected: true,
    destinationCellAccepted: false,
    habitatAccepted: false,
    ownershipAccepted: false,
    relocationMethodAccepted: false,
    technicalTreatmentAccepted: false,
    readyForMethodAndAcceptanceDevelopment: true,
  },
  remainingClosure: [
    'Accept the destination habitat, access, ownership, and long-term non-interference basis.',
    'Freeze the exact intact-relocation method and the source/destination block-state and NBT projections for all three colony members.',
    'Compile guarded forward and rollback operations only after technical acceptance; require exact source guards and no undeclared cell or entity effects.',
    'Run fresh G13 clearance and obtain explicit manifest-bound release authority immediately before any later execution.',
  ],
  safetyBoundary: {
    acceptedDestinationCellCount: 0,
    operationCellCount: 0,
    entityRelocationCount: 0,
    blockEditCount: 0,
    physicalReleaseAuthorized: false,
    entityRelocationAuthorized: false,
    worldEditAuthorized: false,
    executable: false,
  },
};
report.surveyPayloadSha256 = sha256(
  `combined-zones-d06-bee-destination-survey-payload-v1\n${JSON.stringify(surveyPayload)}\n`,
);
report.reportIdentitySha256 = sha256(
  `combined-zones-d06-bee-destination-survey-report-v1\n${JSON.stringify({
    schemaVersion: report.schemaVersion,
    id: report.id,
    generatedAtUtc: report.generatedAtUtc,
    status: report.status,
    sourceBindings: report.sourceBindings,
    surveyPayloadSha256: report.surveyPayloadSha256,
    disposition: report.disposition,
    safetyBoundary: report.safetyBoundary,
  })}\n`,
);

const markdown = `# Combined Zones D06 bee-nest destination survey

Generated: ${GENERATED_AT}

Status: **${report.status}**

The bounded read-only search evaluated the accepted complete save south of the Empty Eight. It required air at the destination and south-facing entrance, grass/dirt support, at least ${MIN_NEARBY_FLOWERS} unique flower plants within ${FLOWER_RADIUS} blocks, at least ${MIN_DOMAIN_BOUNDS_CLEARANCE} blocks of horizontal clearance from every proposal-domain and protected-core bound, at least ${MIN_PLANNING_ZONE_BOUNDS_CLEARANCE} blocks from every bounded planning zone, no existing POI or block entity, and no more than ${MAX_SOURCE_DISTANCE} blocks from the occupied source nest.

## Selected planning candidate

- Position: \`${selected.point.x},${selected.point.y},${selected.point.z}\`
- Current/support/entrance: \`${selected.currentBlock}\` / \`${selected.supportBlock}\` / \`${selected.southEntranceBlock}\`
- Biome: \`${selected.biome}\`
- Source distance: **${selected.sourceDistance}** blocks
- Minimum proposal-bound clearance: **${selected.minimumDomainBoundsClearance}** blocks
- Minimum protected-core-bound clearance: **${selected.minimumProtectedCoreBoundsClearance}** blocks
- Minimum bounded-planning-zone clearance: **${selected.minimumPlanningZoneBoundsClearance}** blocks
- Flowers within ${FLOWER_RADIUS} blocks: **${selected.nearbyFlowerCount}**
- Existing destination POIs/block entities: **0 / 0**
- Passing candidates: **${candidates.length}**

This selects a planning candidate, not an accepted destination. Habitat, access, ownership, long-term non-interference, intact-relocation method, NBT/state preservation, guards, rollback, fresh G13 clearance, and explicit release authority remain HOLD.

## Safety boundary

Zero relocations, zero operations, and zero block edits are authorized.

Survey payload SHA-256: \`${report.surveyPayloadSha256}\`

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
  passingCandidateCount: candidates.length,
  selectedPlanningCandidate: selected.point,
  nearbyFlowerCount: selected.nearbyFlowerCount,
  minimumDomainBoundsClearance: selected.minimumDomainBoundsClearance,
  operationCellCount: report.safetyBoundary.operationCellCount,
  surveyPayloadSha256: report.surveyPayloadSha256,
  reportIdentitySha256: report.reportIdentitySha256,
}, null, 2));
