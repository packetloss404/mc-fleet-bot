#!/usr/bin/env node
/**
 * Generate the bounded Raven Rock S1 section-standard pilot.
 *
 * The generator reads only the immutable Anvil snapshot. It records every
 * source state, refuses protected/fluid/gravity targets, and emits one-cell
 * exact-state REPL operations plus a reverse-order exact rollback.
 *
 * Usage:
 *   node scripts/generate_ravenrock_s1_pilot.mjs
 *   node scripts/generate_ravenrock_s1_pilot.mjs /tmp/s1-pilot.txt \
 *     --regions data/worldsnap-redevelopment-c9e2bf0a-20260727/region
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import nbt from 'prismarine-nbt';

const ROOT = path.resolve(import.meta.dirname, '..');
const EXPECTED_SNAPSHOT_SHA256 =
  'c9e2bf0a2c8d3072d356b8db5c765622a9d367577bc4e09d077bbc58c4310654';
const DEFAULT_REGIONS =
  'data/worldsnap-redevelopment-c9e2bf0a-20260727/region';
const DEFAULT_OUTPUT =
  'data/buildops/ravenrock-s1-section-pilot-2026-07-27.txt';

const argv = process.argv.slice(2);
const regionsFlag = argv.indexOf('--regions');
const outputArgument = argv.find((argument, index) =>
  !argument.startsWith('--') && index !== regionsFlag + 1);
const outputPath = path.resolve(ROOT, outputArgument ?? DEFAULT_OUTPUT);
const regionsPath = path.resolve(
  ROOT,
  regionsFlag >= 0 ? argv[regionsFlag + 1] : DEFAULT_REGIONS,
);
const rollbackPath = outputPath.replace(/\.txt$/, '.rollback.txt');
const reportPath = outputPath.replace(/\.txt$/, '.report.json');
const prestatePath = outputPath.replace(/\.txt$/, '.prestate.json');

const PILOT = {
  featureId: 'RR-S1',
  packageId: 'INF-RR-01',
  x: [138, 148],
  clearY: [-11, -4],
  clearZ: [-17, -11],
  floorY: -12,
  ceilingY: -3,
  northWallZ: -18,
  southWallZ: -10,
  safetyBuffer: [137, -13, -19, 149, -2, -9],
};

const AIR = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
]);
const FLUID = new Set([
  'minecraft:water',
  'minecraft:lava',
  'minecraft:bubble_column',
  'minecraft:powder_snow',
]);
const GRAVITY = new Set([
  'minecraft:sand',
  'minecraft:red_sand',
  'minecraft:gravel',
  'minecraft:suspicious_sand',
  'minecraft:suspicious_gravel',
]);
const EXISTING_LINER = new Set([
  'minecraft:stone_bricks',
  'minecraft:polished_deepslate',
  'minecraft:oxidized_copper',
  'minecraft:sea_lantern',
]);
const NATURAL_EXACT = new Set([
  'minecraft:stone',
  'minecraft:deepslate',
  'minecraft:tuff',
  'minecraft:calcite',
  'minecraft:dripstone_block',
  'minecraft:andesite',
  'minecraft:diorite',
  'minecraft:granite',
  'minecraft:glow_lichen',
]);

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function snapshotDigest(directory) {
  const names = fs.readdirSync(directory)
    .filter((name) => name.endsWith('.mca'))
    .sort();
  const hash = crypto.createHash('sha256');
  let bytes = 0;
  for (const name of names) {
    const content = fs.readFileSync(path.join(directory, name));
    hash.update(name);
    hash.update('\0');
    hash.update(content);
    hash.update('\0');
    bytes += content.length;
  }
  return {
    algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
    sha256: hash.digest('hex'),
    regionFileCount: names.length,
    bytes,
  };
}

function longToBig(value) {
  if (typeof value === 'bigint') return value;
  if (Array.isArray(value)) {
    return (BigInt(value[0] | 0) << 32n) | BigInt(value[1] >>> 0);
  }
  if (value && typeof value === 'object' && 'high' in value && 'low' in value) {
    return (BigInt(value.high | 0) << 32n) | BigInt(value.low >>> 0);
  }
  return BigInt(value);
}

function decompress(type, bytes) {
  if (type === 1) return zlib.gunzipSync(bytes);
  if (type === 2) return zlib.inflateSync(bytes);
  if (type === 3) return bytes;
  if (type === 4) return zlib.brotliDecompressSync(bytes);
  throw new Error(`unsupported Anvil compression type ${type}`);
}

function paletteLabel(entry) {
  if (!entry.Properties) return entry.Name;
  const properties = Object.entries(entry.Properties)
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join(',');
  return properties ? `${entry.Name}[${properties}]` : entry.Name;
}

function baseName(block) {
  if (!block) return 'MISSING';
  return block.split('[', 1)[0];
}

function isNatural(block) {
  const base = baseName(block);
  return NATURAL_EXACT.has(base) || base.endsWith('_ore');
}

function isSafeSource(block) {
  const base = baseName(block);
  return AIR.has(base) || EXISTING_LINER.has(base) || isNatural(block);
}

class Snapshot {
  constructor(directory) {
    this.directory = directory;
    this.regions = new Map();
    this.chunks = new Map();
  }

  region(rx, rz) {
    const key = `${rx},${rz}`;
    if (this.regions.has(key)) return this.regions.get(key);
    const filename = path.join(this.directory, `r.${rx}.${rz}.mca`);
    const value = fs.existsSync(filename) ? fs.readFileSync(filename) : null;
    this.regions.set(key, value);
    return value;
  }

  async chunk(cx, cz) {
    const key = `${cx},${cz}`;
    if (this.chunks.has(key)) return this.chunks.get(key);
    const pending = this.#readChunk(cx, cz);
    this.chunks.set(key, pending);
    return pending;
  }

  async #readChunk(cx, cz) {
    const region = this.region(Math.floor(cx / 32), Math.floor(cz / 32));
    if (!region) return null;
    const header = ((cx & 31) + (cz & 31) * 32) * 4;
    const sectorOffset = region.readUIntBE(header, 3);
    if (!sectorOffset) return null;
    const offset = sectorOffset * 4096;
    const size = region.readUInt32BE(offset);
    const compression = region.readUInt8(offset + 4);
    const raw = decompress(
      compression,
      region.subarray(offset + 5, offset + 4 + size),
    );
    const { parsed } = await nbt.parse(raw);
    const simplified = nbt.simplify(parsed);
    const sections = new Map();
    for (const section of simplified.sections ?? []) {
      sections.set(Number(section.Y), section.block_states ?? null);
    }
    return {
      sections,
      blockEntities:
        simplified.block_entities ?? simplified.blockEntities ?? [],
    };
  }

  async block(x, y, z) {
    const chunk = await this.chunk(Math.floor(x / 16), Math.floor(z / 16));
    if (!chunk) return null;
    const states = chunk.sections.get(Math.floor(y / 16));
    if (!states?.palette?.length) return 'minecraft:air';
    const palette = states.palette.map(paletteLabel);
    if (palette.length === 1) return palette[0];
    const bits = Math.max(4, 32 - Math.clz32(palette.length - 1));
    const perLong = Math.floor(64 / bits);
    const index = ((y & 15) << 8) | ((z & 15) << 4) | (x & 15);
    const longIndex = Math.floor(index / perLong);
    const data = states.data ?? [];
    if (longIndex >= data.length) return 'minecraft:air';
    const shift = BigInt((index % perLong) * bits);
    const mask = (1n << BigInt(bits)) - 1n;
    const paletteIndex = Number((longToBig(data[longIndex]) >> shift) & mask);
    return palette[paletteIndex] ?? 'minecraft:air';
  }

  async blockEntitiesInBox(bounds) {
    const [x1, y1, z1, x2, y2, z2] = bounds;
    const found = [];
    for (let cz = Math.floor(z1 / 16); cz <= Math.floor(z2 / 16); cz += 1) {
      for (let cx = Math.floor(x1 / 16); cx <= Math.floor(x2 / 16); cx += 1) {
        const chunk = await this.chunk(cx, cz);
        if (!chunk) throw new Error(`missing chunk ${cx},${cz}`);
        for (const entity of chunk.blockEntities) {
          const x = Number(entity.x);
          const y = Number(entity.y);
          const z = Number(entity.z);
          if (
            x >= x1 && x <= x2 &&
            y >= y1 && y <= y2 &&
            z >= z1 && z <= z2
          ) {
            found.push({ x, y, z, id: entity.id ?? 'unknown' });
          }
        }
      }
    }
    return found;
  }
}

function key(x, y, z) {
  return `${x},${y},${z}`;
}

function putDesired(map, x, y, z, desired, role) {
  const point = key(x, y, z);
  if (map.has(point)) {
    throw new Error(`design overlap at ${point}: ${map.get(point).role} / ${role}`);
  }
  map.set(point, { x, y, z, desired, role });
}

const digest = snapshotDigest(regionsPath);
if (digest.sha256 !== EXPECTED_SNAPSHOT_SHA256) {
  throw new Error(
    `snapshot hash mismatch: expected ${EXPECTED_SNAPSHOT_SHA256}, `
    + `found ${digest.sha256}`,
  );
}

const snapshot = new Snapshot(regionsPath);
const desired = new Map();
for (let x = PILOT.x[0]; x <= PILOT.x[1]; x += 1) {
  for (let z = PILOT.clearZ[0]; z <= PILOT.clearZ[1]; z += 1) {
    putDesired(desired, x, PILOT.floorY, z, 'minecraft:stone_bricks', 'floor');
    const ceiling = [139, 143, 147].includes(x) && z === -15
      ? 'minecraft:sea_lantern'
      : 'minecraft:stone_bricks';
    putDesired(desired, x, PILOT.ceilingY, z, ceiling, 'ceiling');
    for (let y = PILOT.clearY[0]; y <= PILOT.clearY[1]; y += 1) {
      putDesired(desired, x, y, z, 'minecraft:air', 'clear_volume');
    }
  }
  for (const z of [PILOT.northWallZ, PILOT.southWallZ]) {
    for (let y = PILOT.clearY[0]; y <= PILOT.clearY[1]; y += 1) {
      const wall = y === -7
        ? 'minecraft:oxidized_copper'
        : 'minecraft:polished_deepslate';
      putDesired(desired, x, y, z, wall, 'side_liner');
    }
  }
}

const cells = [];
const unsafe = [];
for (const cell of desired.values()) {
  const source = await snapshot.block(cell.x, cell.y, cell.z);
  if (!source) throw new Error(`missing chunk at ${key(cell.x, cell.y, cell.z)}`);
  const base = baseName(source);
  if (
    !isSafeSource(source) ||
    FLUID.has(base) ||
    GRAVITY.has(base) ||
    source.includes('waterlogged=true')
  ) {
    unsafe.push({ point: [cell.x, cell.y, cell.z], source, role: cell.role });
  }
  cells.push({
    point: [cell.x, cell.y, cell.z],
    source,
    desired: cell.desired,
    role: cell.role,
    changed: source !== cell.desired,
  });
}
if (unsafe.length > 0) {
  throw new Error(`unsafe source cells: ${JSON.stringify(unsafe.slice(0, 12))}`);
}

const blockEntities = await snapshot.blockEntitiesInBox(PILOT.safetyBuffer);
if (blockEntities.length > 0) {
  throw new Error(`block entities in safety buffer: ${JSON.stringify(blockEntities)}`);
}

const [bx1, by1, bz1, bx2, by2, bz2] = PILOT.safetyBuffer;
const bufferCounts = {};
const bufferHazards = [];
const bufferBlocks = new Map();
for (let x = bx1; x <= bx2; x += 1) {
  for (let y = by1; y <= by2; y += 1) {
    for (let z = bz1; z <= bz2; z += 1) {
      const block = await snapshot.block(x, y, z);
      if (!block) throw new Error(`missing buffer chunk at ${key(x, y, z)}`);
      bufferBlocks.set(key(x, y, z), block);
      const base = baseName(block);
      bufferCounts[base] = (bufferCounts[base] ?? 0) + 1;
      if (FLUID.has(base) || GRAVITY.has(base) || block.includes('waterlogged=true')) {
        bufferHazards.push({ point: [x, y, z], block });
      }
    }
  }
}
if (bufferHazards.length > 0) {
  throw new Error(`fluid/gravity hazard in safety buffer: ${JSON.stringify(bufferHazards)}`);
}

const roleOrder = new Map([
  ['floor', 0],
  ['side_liner', 1],
  ['ceiling', 2],
  ['clear_volume', 3],
]);
const changes = cells
  .filter((cell) => cell.changed)
  .sort((left, right) =>
    roleOrder.get(left.role) - roleOrder.get(right.role) ||
    left.point[1] - right.point[1] ||
    left.point[0] - right.point[0] ||
    left.point[2] - right.point[2]);

function repl(cell, expected, replacement) {
  const [x, y, z] = cell.point;
  return `REPL ${x} ${y} ${z} ${x} ${y} ${z} ${expected} ${replacement}`;
}

const forwardLines = changes.map((cell) => repl(cell, cell.source, cell.desired));
const rollbackLines = [...changes]
  .reverse()
  .map((cell) => repl(cell, cell.desired, cell.source));
const header = [
  '# GENERATED FILE — Raven Rock S1 seven-wide/eight-high section pilot',
  `# package: ${PILOT.packageId}; feature: ${PILOT.featureId}`,
  `# frozen baseline: ${relative(regionsPath)}`,
  `# baseline SHA-256: ${digest.sha256}`,
  '# Bounds: x=138..148; clear z=-17..-11; clear y=-11..-4.',
  '# T3/S1 north divider becomes a sealed liner; south cave edge is sealed.',
  '# Every mutation is a one-cell exact-state REPL. No SET/CMD is permitted.',
  '',
];
const forward = `${header.join('\n')}${forwardLines.join('\n')}\n`;
const rollbackHeader = [
  '# GENERATED FILE — exact reverse-order rollback for Raven Rock S1 pilot',
  `# source: ${relative(outputPath)}`,
  '# Only restores a pre-state when the pilot material is still an exact match.',
  '',
];
const rollback =
  `${rollbackHeader.join('\n')}${rollbackLines.join('\n')}\n`;

const countsByRole = {};
const countsByRoleAndSource = {};
const sourceCounts = {};
const desiredCounts = {};
for (const cell of changes) {
  countsByRole[cell.role] = (countsByRole[cell.role] ?? 0) + 1;
  countsByRoleAndSource[cell.role] ??= {};
  countsByRoleAndSource[cell.role][cell.source] =
    (countsByRoleAndSource[cell.role][cell.source] ?? 0) + 1;
  sourceCounts[cell.source] = (sourceCounts[cell.source] ?? 0) + 1;
  desiredCounts[cell.desired] = (desiredCounts[cell.desired] ?? 0) + 1;
}

function isStandableAt(x, z) {
  return (
    AIR.has(baseName(bufferBlocks.get(key(x, -11, z)))) &&
    AIR.has(baseName(bufferBlocks.get(key(x, -10, z)))) &&
    !AIR.has(baseName(bufferBlocks.get(key(x, -12, z))))
  );
}

const beforeStationProfile = [];
for (let x = PILOT.x[0]; x <= PILOT.x[1]; x += 1) {
  let minimumZ = -15;
  let maximumZ = -15;
  while (isStandableAt(x, minimumZ - 1)) minimumZ -= 1;
  while (isStandableAt(x, maximumZ + 1)) maximumZ += 1;
  let centerClearHeight = 0;
  for (let y = -11; y <= -2; y += 1) {
    if (!AIR.has(baseName(bufferBlocks.get(key(x, y, -15))))) break;
    centerClearHeight += 1;
  }
  beforeStationProfile.push({
    x,
    standableRangeAtWalkYMinus11: [minimumZ, maximumZ],
    standableWidth: maximumZ - minimumZ + 1,
    centerClearHeight,
  });
}

const prestate = {
  schemaVersion: 1,
  packageId: PILOT.packageId,
  featureId: PILOT.featureId,
  baseline: {
    regions: relative(regionsPath),
    ...digest,
  },
  design: PILOT,
  safety: {
    chunksPresent: 4,
    blockEntityCount: blockEntities.length,
    blockEntities,
    fluidOrGravityHazardCount: bufferHazards.length,
    bufferMaterialCounts: bufferCounts,
    entityRegionDataAvailable: false,
    entityNote:
      'The frozen artifact contains region/*.mca only. Block entities are proven '
      + 'absent; free entities require the standard live execution gate.',
  },
  cells,
};

const databaseFeatures = [
  {
    projectId: 'raven-rock',
    externalId: 'RR-S1-STANDARD-PILOT',
    parentId: 'wft_5789677296f4b494',
    parentExternalId: 'raven-rock:DISTRICT',
    world: 'world',
    name: 'Raven Rock S1 Standard Section Pilot',
    kind: 'custom',
    status: 'planned',
    geometry: {
      type: 'bounds',
      minX: PILOT.x[0],
      minY: PILOT.floorY,
      minZ: PILOT.northWallZ,
      maxX: PILOT.x[1],
      maxY: PILOT.ceilingY,
      maxZ: PILOT.southWallZ,
    },
    source: 'region_scan',
    sourceRef:
      'data/buildops/ravenrock-s1-section-pilot-2026-07-27.report.json',
    confidence: 1,
    completionRatio: 0,
    conditionScore: null,
    tags: [
      'utility',
      'tunnel',
      'public-primary-spine',
      'section-standard-pilot',
      'exact-state-guarded',
      'not-live-executed',
    ],
    attributes: {
      featureClass: 'utility',
      packageId: PILOT.packageId,
      routeFeatureId: PILOT.featureId,
      plannedRouteCenterlineZ: -15,
      clearEnvelope: {
        width: 7,
        height: 8,
        minY: PILOT.clearY[0],
        maxY: PILOT.clearY[1],
        minZ: PILOT.clearZ[0],
        maxZ: PILOT.clearZ[1],
      },
      stationRangeX: PILOT.x,
      stationCount: PILOT.x[1] - PILOT.x[0] + 1,
      snapshotSha256: digest.sha256,
      sourceRefs: [
        'docs/redevelopment/2026-07-27/infrastructure-audit.md#54-pilot-sequence',
        'docs/redevelopment/2026-07-27/infrastructure-standards.md#6-tunnel-standards',
        'docs/redevelopment/2026-07-27/tunnel-repair-release.md',
        relative(outputPath),
        relative(rollbackPath),
        relative(prestatePath),
        relative(reportPath),
        relative(outputPath.replace(/\.txt$/, '.preflight.json')),
        relative(outputPath.replace(/\.txt$/, '.qa.json')),
      ],
      quality: {
        functional: {
          status: 'offline-section-pass-live-route-test-pending',
          score: 75,
          scale: '0-100',
          evidence:
            '11/11 stations pass the simulated sealed-section test; no live '
            + 'two-way movement result exists yet.',
        },
        walkability: {
          status: 'flat-no-jump-geometry-live-walk-pending',
          score: 70,
          scale: '0-100',
          evidence:
            'The proposed floor is flat and 7 blocks wide; normal-speed player '
            + 'testing in both directions remains mandatory.',
        },
        legibility: {
          status: 'route-band-designed-sign-system-not-in-pilot',
          score: 35,
          scale: '0-100',
          evidence:
            'The green/copper S-route cue is included, but decision signs and '
            + 'route-wide confirmation markers are outside this bounded pilot.',
        },
        mediaCoverage: {
          status: 'camera-defined-before-after-not-captured',
          score: 0,
          scale: '0-100',
          evidence:
            'The camera seed near (140,-9,-15) is specified; live before/after '
            + 'screenshots do not yet exist.',
        },
      },
    },
  },
];

const report = {
  schemaVersion: 1,
  id: 'ravenrock-s1-section-pilot-2026-07-27',
  packageId: PILOT.packageId,
  featureId: PILOT.featureId,
  status: 'generated-awaiting-independent-qa-and-live-execution',
  generatedAtUtc: new Date().toISOString(),
  baseline: {
    regions: relative(regionsPath),
    ...digest,
  },
  design: {
    stationRangeX: PILOT.x,
    stationCount: PILOT.x[1] - PILOT.x[0] + 1,
    plannedRouteCenterlineZ: -15,
    clearEnvelopeCenterZ: -14,
    asymmetricWideningReason:
      'The clear envelope expands south so the historic T3/S1 divider at z=-18 '
      + 'remains a continuous structural liner.',
    clearWidth: 7,
    clearHeight: 8,
    clearBounds: [
      PILOT.x[0],
      PILOT.clearY[0],
      PILOT.clearZ[0],
      PILOT.x[1],
      PILOT.clearY[1],
      PILOT.clearZ[1],
    ],
    shellBounds: [
      PILOT.x[0],
      PILOT.floorY,
      PILOT.northWallZ,
      PILOT.x[1],
      PILOT.ceilingY,
      PILOT.southWallZ,
    ],
    sectionMaterials: {
      floor: 'minecraft:stone_bricks',
      ceiling: 'minecraft:stone_bricks',
      sideLiner: 'minecraft:polished_deepslate',
      routeBand: 'minecraft:oxidized_copper',
      ceilingLight: 'minecraft:sea_lantern',
    },
    lightStationsX: [139, 143, 147],
    longitudinalTransition:
      'Open at x=138 and x=148 to retain the operating S1 route; rollout or taper '
      + 'is a later package after this section family is accepted.',
    beforeStationProfile,
    finalStationProfile: beforeStationProfile.map(({ x }) => ({
      x,
      standableRangeAtWalkYMinus11: [-17, -11],
      standableWidth: 7,
      clearHeight: 8,
    })),
  },
  exclusions: {
    noTreadRemovalOutsidePilot: true,
    noBulkExcavation: true,
    t4AquiferBulkheadUntouched: true,
    rrZ5StairUntouched: true,
    t2bNaturalCaveUntouched: true,
    databaseWrites: false,
    liveRcon: false,
  },
  safety: prestate.safety,
  designCellCount: cells.length,
  unchangedDesignCellCount: cells.length - changes.length,
  operationCount: changes.length,
  uniqueTargetCellCount: new Set(changes.map((cell) => cell.point.join(','))).size,
  rollbackOperationCount: rollbackLines.length,
  countsByRole,
  countsByRoleAndSource,
  sourceCounts,
  desiredCounts,
  databaseFeatures,
  output: {
    operations: relative(outputPath),
    operationsSha256: sha256(forward),
    rollback: relative(rollbackPath),
    rollbackSha256: sha256(rollback),
    prestate: relative(prestatePath),
  },
  acceptance: {
    frozenSnapshotHashMustMatch: EXPECTED_SNAPSHOT_SHA256,
    forwardGuardFailuresAllowed: 0,
    rollbackBijectionFailuresAllowed: 0,
    liveCommandFailuresAllowed: 0,
    clearStationsRequired: 11,
    clearEnvelopePerStation: '7 wide x 8 high',
    continuousFloorRequired: true,
    sealedNorthAndSouthLinersRequired: true,
    fluidsAllowedInSafetyBuffer: 0,
    gravityBlocksAllowedInSafetyBuffer: 0,
    blockEntitiesAllowedInSafetyBuffer: 0,
    liveFreeEntityGateRequired: true,
    postBuildBidirectionalWalkRequired: true,
    postBuildSameCameraEvidenceRequired: true,
  },
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, forward);
fs.writeFileSync(rollbackPath, rollback);
fs.writeFileSync(prestatePath, `${JSON.stringify(prestate, null, 2)}\n`);
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify({
  output: relative(outputPath),
  rollback: relative(rollbackPath),
  report: relative(reportPath),
  prestate: relative(prestatePath),
  snapshotSha256: digest.sha256,
  designCellCount: cells.length,
  operationCount: changes.length,
  unchangedDesignCellCount: cells.length - changes.length,
  countsByRole,
  safety: {
    blockEntities: blockEntities.length,
    fluidOrGravityHazards: bufferHazards.length,
  },
}, null, 2));
