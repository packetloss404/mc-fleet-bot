#!/usr/bin/env node
/**
 * Compile a read-only D06 surface-egress survey and R00 geometry recommendation.
 *
 * Reads one immutable copied Anvil snapshot and local masterplan evidence only.
 * Emits design reservations and hashes, never Minecraft operations.
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

const GENERATED_AT = value('--generated-at', '2026-08-04T20:10:00Z');
const COORDINATES = path.resolve(value(
  '--coordinates',
  'masterplans/05-combined-zones/site-coordinates.json',
));
const PHASE0 = path.resolve(value(
  '--phase0',
  'masterplans/05-combined-zones/phase0-survey-evidence.json',
));
const D06 = path.resolve(value(
  '--d06',
  'masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
));
const GEOMETRY = path.resolve(value(
  '--geometry',
  'masterplans/05-combined-zones/phase1-geometry-coordination.json',
));
const OUTPUT = path.resolve(value(
  '--out',
  'masterplans/05-combined-zones/phase1-d06-egress-geometry-design.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'masterplans/05-combined-zones/phase1-d06-egress-geometry-design.md',
));

const WORLD_MIN_Y = -64;
const WORLD_MAX_Y = 319;
const AIR = /^minecraft:(air|cave_air|void_air|light|structure_void|moving_piston)$/;
const DISPLAY_NOISE = /^minecraft:(air|cave_air|void_air|light|structure_void|moving_piston|short_grass|tall_grass|fern|large_fern)$/;
const WATER = new Set(['minecraft:water', 'minecraft:bubble_column']);

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
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
    if (!buffer) throw new Error(`missing region for chunk ${key}`);
    const index = ((cx & 31) + (cz & 31) * 32) * 4;
    const sectorOffset = buffer.readUIntBE(index, 3);
    const sectorCount = buffer[index + 3];
    if (!sectorOffset || !sectorCount) throw new Error(`missing chunk ${key}`);
    const offset = sectorOffset * 4096;
    const size = buffer.readUInt32BE(offset);
    const compression = buffer.readUInt8(offset + 4);
    if (compression & 0x80) throw new Error(`external chunk storage unsupported at ${key}`);
    const compressed = buffer.subarray(offset + 5, offset + 4 + size);
    const { parsed } = await nbt.parse(decompress(compression, compressed));
    const simplified = nbt.simplify(parsed);
    const sectionMap = new Map(
      (simplified.sections ?? []).map((section) => [Number(section.Y), section]),
    );
    const chunk = { data: simplified, sectionMap };
    this.chunks.set(key, chunk);
    return chunk;
  }

  async block(x, y, z) {
    const { sectionMap } = await this.chunk(Math.floor(x / 16), Math.floor(z / 16));
    const states = sectionMap.get(Math.floor(y / 16))?.block_states;
    if (!states?.palette?.length) return 'minecraft:air';
    const index = ((y & 15) << 8) | ((z & 15) << 4) | (x & 15);
    return states.palette[paletteIndex(states, index, 4)]?.Name ?? 'minecraft:air';
  }

  async biome(x, y, z) {
    const { sectionMap } = await this.chunk(Math.floor(x / 16), Math.floor(z / 16));
    const biomes = sectionMap.get(Math.floor(y / 16))?.biomes;
    if (!biomes?.palette?.length) return null;
    const index = (((y & 15) >> 2) << 4) | (((z & 15) >> 2) << 2) | ((x & 15) >> 2);
    return biomes.palette[paletteIndex(biomes, index, 1)] ?? null;
  }

  async surface(x, z) {
    const { data, sectionMap } = await this.chunk(Math.floor(x / 16), Math.floor(z / 16));
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
      const states = sectionMap.get(Math.floor(y / 16))?.block_states;
      let block = 'minecraft:air';
      if (states?.palette?.length) {
        const index = ((y & 15) << 8) | ((z & 15) << 4) | (x & 15);
        block = states.palette[paletteIndex(states, index, 4)]?.Name ?? 'minecraft:air';
      }
      if (DISPLAY_NOISE.test(block)) continue;
      if (displayY < WORLD_MIN_Y) {
        displayY = y;
        displayBlock = block;
      }
      if (WATER.has(block)) {
        water = true;
        continue;
      }
      if (block === 'minecraft:lava') {
        lava = true;
        continue;
      }
      if (!AIR.test(block)) {
        terrainY = y;
        terrainBlock = block;
        break;
      }
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
}

function sortCells(cells) {
  return [...cells].sort((left, right) => left.x - right.x || left.y - right.y || left.z - right.z);
}

function summarizeCells(cells, preamble) {
  const sorted = sortCells(cells);
  return {
    cellCount: sorted.length,
    coordinateSetSha256: sha256(`${preamble}\n${sorted.map(({ x, y, z }) => `${x},${y},${z}`).join('\n')}`),
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

function intersects(a, b) {
  return a.minX <= b.maxX && a.maxX >= b.minX
    && a.minY <= b.maxY && a.maxY >= b.minY
    && a.minZ <= b.maxZ && a.maxZ >= b.minZ;
}

const coordinates = readJson(COORDINATES);
const phase0 = readJson(PHASE0);
const d06 = readJson(D06);
const geometry = readJson(GEOMETRY);
const snapshotDirectory = path.resolve(ROOT, phase0.snapshots.postGeneration.path);
const snapshot = snapshotIdentity(snapshotDirectory);
if (snapshot.sha256 !== phase0.snapshots.postGeneration.sha256) {
  throw new Error('immutable Phase 0 post snapshot hash mismatch');
}
const reader = new SnapshotReader(snapshotDirectory);
const egressAnchors = coordinates.zones.find(({ id }) => id === 'Z02')
  ?.hiddenSubway?.terminal?.lifeSafety?.egressStudyAnchors ?? [];
if (egressAnchors.length !== 2) throw new Error('exactly two egress study anchors required');

const egressDesigns = [];
for (const anchor of egressAnchors) {
  const columns = [];
  for (let x = anchor.x - 3; x <= anchor.x + 3; x += 1) {
    for (let z = anchor.z - 3; z <= anchor.z + 3; z += 1) {
      columns.push(await reader.surface(x, z));
    }
  }
  const center = columns.find(({ x, z }) => x === anchor.x && z === anchor.z);
  const landingY = Math.max(...columns.map(({ terrainY }) => terrainY)) + 1;
  const continuationBounds = {
    minX: anchor.x - 3,
    maxX: anchor.x + 3,
    minY: 55,
    maxY: landingY,
    minZ: anchor.z - 3,
    maxZ: anchor.z + 3,
  };
  const continuationCells = cellsIn(continuationBounds);
  const materialCounts = {};
  let waterCellCount = 0;
  let lavaCellCount = 0;
  for (const cell of continuationCells) {
    const block = await reader.block(cell.x, cell.y, cell.z);
    materialCounts[block] = (materialCounts[block] ?? 0) + 1;
    if (WATER.has(block)) waterCellCount += 1;
    if (block === 'minecraft:lava') lavaCellCount += 1;
  }
  const structureIntersections = phase0.generatedStructureStarts.filter(
    ({ bounds }) => intersects(bounds, continuationBounds),
  ).map(({ id, bounds, chunkX, chunkZ }) => ({ id, bounds, chunkX, chunkZ }));
  const surfaceDry = columns.every(({ water, lava }) => !water && !lava);
  egressDesigns.push({
    id: anchor.id,
    position: anchor.position,
    surveyedSurfaceEndpoint: {
      x: anchor.x,
      y: landingY,
      z: anchor.z,
      naturalTerrainY: center.terrainY,
      terrainBlock: center.terrainBlock,
      displayY: center.displayY,
      displayBlock: center.displayBlock,
      biome: center.biome,
      dry: !center.water && !center.lava,
      engineeredLandingBasis: 'one block above the maximum terrain in the surveyed 7x7 core; exact grading remains G03/G07 work',
    },
    sevenBySevenSurfaceReview: {
      columnCount: columns.length,
      minimumTerrainY: Math.min(...columns.map(({ terrainY }) => terrainY)),
      maximumTerrainY: Math.max(...columns.map(({ terrainY }) => terrainY)),
      reliefBlocks: Math.max(...columns.map(({ terrainY }) => terrainY))
        - Math.min(...columns.map(({ terrainY }) => terrainY)),
      waterColumnCount: columns.filter(({ water }) => water).length,
      lavaColumnCount: columns.filter(({ lava }) => lava).length,
      biomes: [...new Set(columns.map(({ biome }) => biome))].sort(),
      surfaceDry,
      surfaceColumnSetSha256: sha256(columns
        .sort((left, right) => left.x - right.x || left.z - right.z)
        .map((item) => `${item.x},${item.z},${item.terrainY},${item.terrainBlock},${item.displayY},${item.displayBlock},${item.biome}`)
        .join('\n')),
    },
    externalContinuationDesign: {
      bounds: continuationBounds,
      ...summarizeCells(continuationCells, 'combined-zones-d06-egress-continuation-v1'),
      surfaceLandingY: landingY,
      stairReservation: {
        bounds: { ...continuationBounds, maxX: anchor.x - 1 },
        ...summarizeCells(
          cellsIn({ ...continuationBounds, maxX: anchor.x - 1 }),
          'combined-zones-d06-egress-stair-v1',
        ),
      },
      accessibleLiftReservation: {
        bounds: { ...continuationBounds, minX: anchor.x + 1, minZ: anchor.z - 1, maxZ: anchor.z + 1 },
        ...summarizeCells(
          cellsIn({ ...continuationBounds, minX: anchor.x + 1, minZ: anchor.z - 1, maxZ: anchor.z + 1 }),
          'combined-zones-d06-egress-lift-v1',
        ),
      },
      routeGraph: {
        nodes: [
          { id: `${anchor.id}-ROOF-CAP`, x: anchor.x, y: 54, z: anchor.z },
          { id: `${anchor.id}-SURFACE-LANDING`, x: anchor.x, y: landingY, z: anchor.z },
          { id: `${anchor.id}-SAFE-EXTERIOR`, x: anchor.x, y: landingY, z: anchor.z + 3 },
        ],
        edges: [
          { from: `${anchor.id}-ROOF-CAP`, to: `${anchor.id}-SURFACE-LANDING`, modes: ['protected-stairs', 'reserved-accessible-lift'] },
          { from: `${anchor.id}-SURFACE-LANDING`, to: `${anchor.id}-SAFE-EXTERIOR`, modes: ['level-accessible-path'] },
        ],
      },
    },
    immutableSourceCensus: {
      cellCount: continuationCells.length,
      materialCounts: Object.fromEntries(Object.entries(materialCounts).sort()),
      waterCellCount,
      lavaCellCount,
      structureIntersections,
    },
    designGate: {
      status: surfaceDry && structureIntersections.length === 0
        ? 'PASS_EXACT_DRY_SURFACE_ENDPOINT_AND_DISJOINT_ROUTE_RESERVATION'
        : 'HOLD_SURFACE_OR_STRUCTURE_CONFLICT',
      physicalOpeningAuthorized: false,
      mechanismCommissioned: false,
    },
  });
}

const geometryRecommendations = [
  ['P1-B01-VERTICAL-AUTHORITY-ACTIVATION', 'ADOPT_EXACT_RATIONAL_AND_ROUNDING_CONTRACT_PER_SCOPE_AFTER_CELLSET_REVIEW', 'READY_FOR_SOLE_AUTHORITY_ACCEPTANCE'],
  ['P1-B02-CHEYENNE-INTERNAL-FIT', 'PRESERVE_CHILD_DIMENSIONS_CENTER_ALIGNED_INSIDE_04_ENVELOPE', 'READY_FOR_SOLE_AUTHORITY_ACCEPTANCE'],
  ['P1-B03-CHEYENNE-JCURVE', 'AUTHOR_NEW_INTEGER_J_CURVE_WITHIN_Z09_Z10_PRESERVING_CHILD_CROSS_SECTION', 'OFFLINE_DESIGN_REQUIRED'],
  ['P1-B04-SUBTROPOLIS-NORMALIZATION', 'PRESERVE_ORIENTATION_AND_ADD_SEPARATELY_OWNED_200_BLOCK_PORTAL_ADAPTER', 'READY_FOR_SOLE_AUTHORITY_ACCEPTANCE'],
  ['P1-B05-SUBTROPOLIS-PILLARS', 'FREEZE_35_EXPLICIT_GRID_INTERSECTIONS_AND_OMIT_UNSPECIFIED_EXTRA_PILLARS', 'READY_FOR_SOLE_AUTHORITY_ACCEPTANCE'],
  ['P1-B06-HOUSTON-GENERIC-PLACEMENT', 'OMIT_UNPLACED_GENERIC_TOWERS_AND_GARAGES_RETAIN_NAMED_EXPLICIT_GEOMETRY', 'READY_FOR_SOLE_AUTHORITY_ACCEPTANCE'],
  ['P1-B07-PUBLIC-SHAFT-DOGLEG', 'PLACE_ONE_LEVEL_TRANSFER_AT_OBSERVATION_REFUGE_THEN_CONTINUE_NORTH', 'OFFLINE_DESIGN_REQUIRED'],
  ['P1-B08-SERVICE-TUNNEL-CENTERLINE', 'RASTER_THREE_AUTHORED_ANCHORS_WITH_CARDINAL_RUNS_AND_LEVEL_TURNS', 'OFFLINE_DESIGN_REQUIRED'],
  ['P1-B09-FUNICULAR-CENTERLINE', 'HOLD_FACE_SELECTION_FOR_READ_ONLY_EAST_WEST_TERRAIN_SURVEY', 'READ_ONLY_SURVEY_REQUIRED'],
  ['P1-B10-MOUNTAIN-SOLID-AND-RELIC-VOIDS', 'DEFAULT_DENY_DETERMINISTIC_SHELL_WITH_REVIEWED_RELIC_VOIDS_AND_D05_HYDROLOGY', 'D05_DESIGN_REQUIRED'],
  ['P1-B11-EXTERNAL-INTERFACES', 'FREEZE_ONLY_EXACT_SURVEYED_ENDPOINTS_AND_KEEP_ALL_OTHER_NULL_Y_INTERFACES_SEALED', 'PARTIAL_D06_SURVEY_PASS'],
].map(([blockerId, recommendation, disposition]) => ({ blockerId, recommendation, disposition }));

const originalBlockerIds = geometry.blockerMatrix.map(({ id }) => id);
if (JSON.stringify(geometryRecommendations.map(({ blockerId }) => blockerId)) !== JSON.stringify(originalBlockerIds)) {
  throw new Error('geometry blocker recommendation coverage drift');
}
const routeSetsDisjoint = !intersects(
  egressDesigns[0].externalContinuationDesign.bounds,
  egressDesigns[1].externalContinuationDesign.bounds,
);
const allSurveyGatesPass = egressDesigns.every(
  ({ designGate }) => designGate.status.startsWith('PASS_'),
);

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-d06-egress-geometry-design',
  generatedAtUtc: GENERATED_AT,
  status: allSurveyGatesPass
    ? 'PARTIAL_PASS_D06_SURFACE_ENDPOINTS_AND_ROUTE_RESERVATIONS_FROZEN'
    : 'HOLD_D06_SURFACE_SURVEY_CONFLICT',
  authority: {
    chain: '01 + 02 + 03 -> 04 normalized architecture -> 05 current-world placement',
    decisionAuthority: 'sole human project owner',
    offlineOnly: true,
    executable: false,
    worldEditAuthorized: false,
    operationCellCount: 0,
  },
  sourceBindings: [
    fileBinding(COORDINATES, 'D06 study anchors and current-world registry'),
    fileBinding(PHASE0, 'immutable Phase 0 survey identity and structure starts'),
    fileBinding(D06, 'frozen internal Empty Eight design'),
    fileBinding(GEOMETRY, 'R00 geometry blocker matrix'),
  ],
  immutableSnapshot: snapshot,
  egressDesigns,
  independenceProof: {
    routeCount: egressDesigns.length,
    horizontalSeparationBlocks: Math.abs(egressAnchors[1].x - egressAnchors[0].x) - 7,
    exactExternalContinuationSetsDisjoint: routeSetsDisjoint,
    independentSurfaceEndpoints: new Set(
      egressDesigns.map(({ surveyedSurfaceEndpoint: point }) => `${point.x},${point.y},${point.z}`),
    ).size === 2,
  },
  soleAuthorityRecommendations: {
    d06: {
      egressSelection: 'ADOPT_TWO_EXISTING_DISJOINT_7X7_CORES_AND_SURVEYED_SURFACE_LANDINGS',
      lifeSafetyBasis: 'PROTECTED_STAIR_PLUS_RESERVED_ACCESSIBLE_LIFT_IN_EACH_CORE',
      smokeControl: 'INDEPENDENT_CORE_COMPARTMENTS_WITH_NORMALLY_CLOSED_BOUNDARY_DOORS_AND_SEPARATE_EXHAUST_RESERVATIONS',
      ventilation: 'FOUR_INTERNAL_RESERVATIONS_TO_TWO_SEPARATE_SURFACE_OUTLET_GROUPS_ONE_PER_CORE',
      emergencyLighting: 'SEA_LANTERN_NORMAL_LIGHTING_PLUS_SEPARATELY_SWITCHED_REDUNDANT_EMERGENCY_CIRCUITS',
      platformBarriers: 'NORMALLY_CLOSED_BARRIERS_FAILING_CLOSED_WITH_MANUAL_EGRESS_RELEASE',
      drainage: 'EIGHT_TRACK_SUMPS_TO_CAPPED_HEADER_NO_EXTERNAL_DISCHARGE_UNTIL_D05_OWNER_ACCEPTANCE',
      fireService: 'USE_EG_B_SURFACE_COMPOUND_AS_PRIMARY_SERVICE_ACCESS_WITH_EG_A_INDEPENDENT_ESCAPE_ONLY',
      futureInterfaces: 'KEEP_ALL_EIGHT_PHYSICALLY_SEALED_AND_SEPARATELY_OWNED',
      currentDisposition: 'SURFACE_ENDPOINT_AND_ROUTE_RESERVATION_ACCEPTABLE_SYSTEM_MECHANISMS_STILL_HOLD',
    },
    geometry: geometryRecommendations,
  },
  remainingHoldGates: [
    'sole-authority acceptance of the recommended D06 design basis and ready geometry choices',
    'exact smoke, ventilation, lift, barrier, emergency-circuit, drainage, fire-service, and surface-outlet mechanism cell sets',
    'D05 hydrology ownership and accepted external discharge point',
    'read-only funicular face survey and offline exact centerline designs for remaining route blockers',
    'canonical ownership and interface contracts for every exact proposed cell',
  ],
  releaseBoundary: {
    physicalOpeningAuthorized: false,
    operationsEmitted: false,
    releaseEvidenceRequiredUnder: 'G03-G19',
  },
};

const markdown = `# D06 surface egress and R00 geometry recommendation\n\n`
  + `Status: **${report.status} — OFFLINE ONLY — ZERO OPERATIONS**\n\n`
  + `This package reads the immutable Phase 0 copied world and freezes exact design evidence. It does not open a shaft, select a live release, or claim commissioning.\n\n`
  + `## Surveyed egress endpoints\n\n`
  + `| Core | Surface endpoint | 7×7 terrain | Dry | Structure intersections | Design result |\n|---|---|---|---|---:|---|\n`
  + egressDesigns.map((item) => `| ${item.id} | \`${item.surveyedSurfaceEndpoint.x},${item.surveyedSurfaceEndpoint.y},${item.surveyedSurfaceEndpoint.z}\` | Y${item.sevenBySevenSurfaceReview.minimumTerrainY}…Y${item.sevenBySevenSurfaceReview.maximumTerrainY} | ${item.sevenBySevenSurfaceReview.surfaceDry ? 'yes' : 'no'} | ${item.immutableSourceCensus.structureIntersections.length} | ${item.designGate.status} |`).join('\n')
  + `\n\nThe two exact 7×7 continuation sets are disjoint and preserve a protected stair plus a separately reserved accessible lift in each core. Surface opening and mechanisms remain unauthorized.\n\n`
  + `## Sole-authority defaults\n\n`
  + `- Preserve the two existing cores and surveyed surface landings.\n`
  + `- Give each core a protected stair and accessible-lift reservation.\n`
  + `- Keep smoke compartments and outlet groups independent.\n`
  + `- Keep every future-line interface physically sealed.\n`
  + `- Hold external drainage discharge until D05 ownership accepts it.\n\n`
  + `## Geometry recommendations\n\n`
  + `| Blocker | Recommendation | Disposition |\n|---|---|---|\n`
  + geometryRecommendations.map((item) => `| ${item.blockerId} | ${item.recommendation} | ${item.disposition} |`).join('\n')
  + `\n\nD06 and G03/G07 remain HOLD on the listed mechanism, ownership, hydrology, and exact-route work. No live service was contacted.\n`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

process.stdout.write(`${JSON.stringify({
  output: relative(OUTPUT),
  markdown: relative(MARKDOWN),
  status: report.status,
  endpoints: egressDesigns.map(({ id, surveyedSurfaceEndpoint }) => ({ id, ...surveyedSurfaceEndpoint })),
  routeSetsDisjoint,
  operationCellCount: 0,
}, null, 2)}\n`);
