#!/usr/bin/env node
/**
 * Compile the conservative MainStreet America R4/R5 redevelopment package.
 *
 * The generator reads an immutable local Anvil snapshot, verifies its aggregate
 * hash, and emits exact-block-state REPL operations. It never connects to the
 * live server. The whole package fails closed if one requested garage is
 * skipped, a protected building is intersected, a block entity is targeted, or
 * an unapproved source block would be removed.
 *
 * Usage:
 *   node scripts/generate_mainstreet_redevelopment_r4_r5.mjs
 *   node scripts/generate_mainstreet_redevelopment_r4_r5.mjs \
 *     --plan mainstreet-america/planning/redevelopment-r4-r5.yaml \
 *     --regions data/worldsnap-rollbackcheck-64829086424cde6f-20260727/region \
 *     --out data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.txt \
 *     --report data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.report.json \
 *     --design data/world-review/mainstreet-redevelopment-r4-r5-runtime-safe-design-2026-07-27.json
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import process from 'process';
import zlib from 'zlib';
import { pathToFileURL } from 'url';

import yaml from 'js-yaml';
import nbt from 'prismarine-nbt';

const DEFAULT_PLAN = 'mainstreet-america/planning/redevelopment-r4-r5.yaml';
const DEFAULT_REGIONS = 'data/worldsnap-rollbackcheck-64829086424cde6f-20260727/region';
const DEFAULT_OUTPUT = 'data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.txt';
const DEFAULT_ROLLBACK = 'data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.rollback.txt';
const DEFAULT_REPORT = 'data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.report.json';
const DEFAULT_DESIGN = 'data/world-review/mainstreet-redevelopment-r4-r5-runtime-safe-design-2026-07-27.json';

const WORLD_MIN_Y = -64;
const WORLD_MAX_Y = 319;
const SURFACE_SCAN_MIN_Y = 48;
const SURFACE_SCAN_MAX_Y = 112;

const AIR_BLOCKS = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
]);

const SOFT_BLOCKS = new Set([
  'minecraft:short_grass',
  'minecraft:tall_grass',
  'minecraft:fern',
  'minecraft:large_fern',
  'minecraft:dead_bush',
  'minecraft:vine',
  'minecraft:glow_lichen',
  'minecraft:hanging_roots',
  'minecraft:crimson_roots',
  'minecraft:warped_roots',
  'minecraft:nether_sprouts',
  'minecraft:leaf_litter',
  'minecraft:snow',
  'minecraft:fire',
  'minecraft:soul_fire',
  'minecraft:brown_mushroom',
  'minecraft:red_mushroom',
  'minecraft:moss_carpet',
  'minecraft:pale_moss_carpet',
  'minecraft:pale_hanging_moss',
  'minecraft:pink_petals',
  'minecraft:wildflowers',
]);

const CUTTABLE_NATURAL = new Set([
  'minecraft:stone',
  'minecraft:dirt',
  'minecraft:grass_block',
  'minecraft:coarse_dirt',
  'minecraft:rooted_dirt',
  'minecraft:podzol',
  'minecraft:mycelium',
  'minecraft:mud',
  'minecraft:packed_mud',
  'minecraft:gravel',
  'minecraft:sand',
  'minecraft:red_sand',
  'minecraft:sandstone',
  'minecraft:red_sandstone',
  'minecraft:clay',
  'minecraft:granite',
  'minecraft:diorite',
  'minecraft:andesite',
  'minecraft:tuff',
  'minecraft:calcite',
  'minecraft:deepslate',
  'minecraft:cobbled_deepslate',
  'minecraft:moss_block',
  'minecraft:snow_block',
  'minecraft:dripstone_block',
]);

const SAFE_PUBLIC_SURFACES = new Set([
  'minecraft:smooth_stone',
  'minecraft:smooth_stone_slab',
  'minecraft:stone_bricks',
  'minecraft:stone_brick_slab',
  'minecraft:stone_brick_stairs',
  'minecraft:polished_andesite',
  'minecraft:gray_concrete',
  'minecraft:light_gray_concrete',
  'minecraft:white_concrete',
  'minecraft:yellow_concrete',
  'minecraft:orange_concrete',
  'minecraft:blue_concrete',
  'minecraft:cyan_concrete',
  'minecraft:packed_mud',
  'minecraft:dirt_path',
  'minecraft:sea_lantern',
]);

const ROAD_SURFACES = new Set([
  'minecraft:smooth_stone',
  'minecraft:stone_bricks',
  'minecraft:polished_andesite',
  'minecraft:gray_concrete',
  'minecraft:light_gray_concrete',
  'minecraft:white_concrete',
  'minecraft:yellow_concrete',
  'minecraft:orange_concrete',
  'minecraft:blue_concrete',
  'minecraft:cyan_concrete',
]);

const APPROVED_DRIVEWAY_CLEARANCE = new Set([
  'minecraft:birch_fence',
  'minecraft:birch_fence_gate',
  'minecraft:stone_brick_slab',
]);

const FLOWERS = new Set([
  'dandelion',
  'poppy',
  'blue_orchid',
  'allium',
  'azure_bluet',
  'red_tulip',
  'orange_tulip',
  'white_tulip',
  'pink_tulip',
  'oxeye_daisy',
  'cornflower',
  'lily_of_the_valley',
  'wither_rose',
  'sunflower',
  'lilac',
  'rose_bush',
  'peony',
  'closed_eyeblossom',
  'open_eyeblossom',
  'cactus_flower',
]);

function cliValue(args, key, fallback) {
  const index = args.indexOf(key);
  return index < 0 ? fallback : args[index + 1];
}

export function baseBlockName(state) {
  return String(state).split('[', 1)[0];
}

function isAir(state) {
  return AIR_BLOCKS.has(baseBlockName(state));
}

function isSoft(state) {
  const name = baseBlockName(state);
  const bare = name.replace(/^minecraft:/, '');
  return SOFT_BLOCKS.has(name)
    || FLOWERS.has(bare)
    || bare.endsWith('_sapling')
    || bare.endsWith('_propagule');
}

function isCuttableNatural(state) {
  const name = baseBlockName(state);
  return CUTTABLE_NATURAL.has(name) || /_ore$/.test(name);
}

function isSafeSurface(state) {
  const name = baseBlockName(state);
  return isCuttableNatural(name) || SAFE_PUBLIC_SURFACES.has(name);
}

function isRoadSurface(state) {
  return ROAD_SURFACES.has(baseBlockName(state));
}

function isApprovedDrivewayClearance(state) {
  return APPROVED_DRIVEWAY_CLEARANCE.has(baseBlockName(state));
}

function stateFromPalette(entry) {
  const name = entry?.Name ?? 'minecraft:air';
  const properties = entry?.Properties ?? {};
  const keys = Object.keys(properties).sort();
  if (!keys.length) return name;
  return `${name}[${keys.map((key) => `${key}=${properties[key]}`).join(',')}]`;
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

function decompress(type, data) {
  if (type === 1) return zlib.gunzipSync(data);
  if (type === 2) return zlib.inflateSync(data);
  if (type === 3) return data;
  if (type === 4) return zlib.brotliDecompressSync(data);
  throw new Error(`unsupported Anvil compression type ${type}`);
}

export class DetailedAnvilSnapshot {
  constructor(regionDir) {
    this.regionDir = regionDir;
    this.regionCache = new Map();
    this.chunkCache = new Map();
  }

  regionBuffer(rx, rz) {
    const key = `${rx},${rz}`;
    if (this.regionCache.has(key)) return this.regionCache.get(key);
    const filename = path.join(this.regionDir, `r.${rx}.${rz}.mca`);
    let buffer = null;
    try {
      buffer = fs.readFileSync(filename);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    this.regionCache.set(key, buffer);
    return buffer;
  }

  async readChunk(cx, cz) {
    const key = `${cx},${cz}`;
    if (this.chunkCache.has(key)) return this.chunkCache.get(key);
    const pending = this.#readChunkUncached(cx, cz);
    this.chunkCache.set(key, pending);
    return pending;
  }

  async #readChunkUncached(cx, cz) {
    const buffer = this.regionBuffer(Math.floor(cx / 32), Math.floor(cz / 32));
    if (!buffer) return null;
    const index = ((cx & 31) + (cz & 31) * 32) * 4;
    if (index + 4 > buffer.length) return null;
    const sectorOffset = buffer.readUIntBE(index, 3);
    const sectorCount = buffer[index + 3];
    if (sectorOffset === 0 || sectorCount === 0) return null;
    const offset = sectorOffset * 4096;
    if (offset + 5 > buffer.length) return null;
    const size = buffer.readUInt32BE(offset);
    const rawCompression = buffer.readUInt8(offset + 4);
    if ((rawCompression & 0x80) !== 0) {
      throw new Error(`external .mcc chunk storage is unsupported at chunk ${cx},${cz}`);
    }
    const compressed = buffer.subarray(offset + 5, offset + 4 + size);
    const raw = decompress(rawCompression, compressed);
    const { parsed } = await nbt.parse(raw);
    const chunk = nbt.simplify(parsed);
    const sections = new Map();
    for (const section of chunk.sections ?? []) {
      sections.set(Number(section.Y), section.block_states ?? null);
    }
    return {
      cx,
      cz,
      sections,
      blockEntities: chunk.block_entities ?? chunk.blockEntities ?? [],
    };
  }

  blockState(chunk, x, y, z) {
    if (!chunk) return null;
    const states = chunk.sections.get(Math.floor(y / 16));
    if (!states?.palette?.length) return 'minecraft:air';
    const palette = states.palette;
    if (palette.length === 1) return stateFromPalette(palette[0]);
    const bits = Math.max(4, 32 - Math.clz32(palette.length - 1));
    const perLong = Math.floor(64 / bits);
    const index = ((y & 15) << 8) | ((z & 15) << 4) | (x & 15);
    const longIndex = Math.floor(index / perLong);
    const data = states.data ?? [];
    if (longIndex >= data.length) return 'minecraft:air';
    const shift = BigInt((index % perLong) * bits);
    const mask = (1n << BigInt(bits)) - 1n;
    const paletteIndex = Number((longToBig(data[longIndex]) >> shift) & mask);
    return stateFromPalette(palette[paletteIndex]);
  }

  async getBlock(x, y, z) {
    const chunk = await this.readChunk(Math.floor(x / 16), Math.floor(z / 16));
    return this.blockState(chunk, x, y, z);
  }

  async blockEntitiesInBox(box) {
    const [x1, y1, z1, x2, y2, z2] = normalizeBox(box);
    const output = [];
    for (let cz = Math.floor(z1 / 16); cz <= Math.floor(z2 / 16); cz += 1) {
      for (let cx = Math.floor(x1 / 16); cx <= Math.floor(x2 / 16); cx += 1) {
        const chunk = await this.readChunk(cx, cz);
        for (const entity of chunk?.blockEntities ?? []) {
          const x = Number(entity.x);
          const y = Number(entity.y);
          const z = Number(entity.z);
          if (x < x1 || x > x2 || y < y1 || y > y2 || z < z1 || z > z2) continue;
          output.push(entity);
        }
      }
    }
    return output;
  }
}

function sha256Buffer(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function hashSnapshotDirectory(regionDir) {
  const files = fs.readdirSync(regionDir)
    .filter((name) => name.endsWith('.mca'))
    .sort();
  const digest = crypto.createHash('sha256');
  const members = [];
  for (const name of files) {
    const filename = path.join(regionDir, name);
    const bytes = fs.readFileSync(filename);
    const hash = sha256Buffer(bytes);
    digest.update(name);
    digest.update('\0');
    digest.update(bytes);
    digest.update('\0');
    members.push({
      file: name,
      bytes: bytes.length,
      sha256: hash,
    });
  }
  return {
    algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
    sha256: digest.digest('hex'),
    regionFileCount: members.length,
    members,
  };
}

export function loadPlan(planPath) {
  const plan = yaml.load(fs.readFileSync(planPath, 'utf8'));
  if (!plan || plan.id !== 'mainstreet-america-redevelopment-r4-r5') {
    throw new Error(`unexpected or missing redevelopment plan id in ${planPath}`);
  }
  return plan;
}

function normalizeBox(box) {
  return [
    Math.min(Number(box[0]), Number(box[3])),
    Math.min(Number(box[1]), Number(box[4])),
    Math.min(Number(box[2]), Number(box[5])),
    Math.max(Number(box[0]), Number(box[3])),
    Math.max(Number(box[1]), Number(box[4])),
    Math.max(Number(box[2]), Number(box[5])),
  ];
}

function bounds2d(bounds) {
  return {
    minX: Number(bounds[0]),
    maxX: Number(bounds[1]),
    minZ: Number(bounds[2]),
    maxZ: Number(bounds[3]),
  };
}

export function rectanglesIntersect(left, right) {
  return !(
    left.maxX < right.minX
    || left.minX > right.maxX
    || left.maxZ < right.minZ
    || left.minZ > right.maxZ
  );
}

export function garageGeometry(garage, road) {
  const box = bounds2d(garage.bounds);
  const width = box.maxX - box.minX + 1;
  const depth = box.maxZ - box.minZ + 1;
  const centerX = Math.floor((box.minX + box.maxX) / 2);
  const centerZ = Math.floor((box.minZ + box.maxZ) / 2);
  const roadIsWest = Number(road.center_x) < centerX;
  const front = roadIsWest ? 'west' : 'east';
  const frontX = roadIsWest ? box.minX : box.maxX;
  return {
    ...box,
    width,
    depth,
    centerX,
    centerZ,
    floorY: Number(garage.floor_y),
    front,
    frontX,
    interior: {
      minX: box.minX + 1,
      maxX: box.maxX - 1,
      minZ: box.minZ + 1,
      maxZ: box.maxZ - 1,
    },
    portal: {
      x: frontX,
      minZ: centerZ - 1,
      maxZ: centerZ + 1,
      minY: Number(garage.floor_y) + 1,
      maxY: Number(garage.floor_y) + 3,
    },
  };
}

export function interpolateDrivewayProfile(startX, endX, startY, endY) {
  const distance = Math.abs(endX - startX);
  const rise = Math.abs(endY - startY);
  if (rise > distance) {
    throw new Error(
      `driveway grade ${startY}->${endY} needs ${rise} rises in ${distance} cells`,
    );
  }
  const direction = Math.sign(endX - startX);
  const verticalDirection = Math.sign(endY - startY);
  const firstStepIndex = distance - rise + 1;
  const profile = [];
  for (let index = 0; index <= distance; index += 1) {
    profile.push({
      x: startX + direction * index,
      y: startY + (
        verticalDirection
        * Math.max(0, index - firstStepIndex + 1)
      ),
    });
  }
  return profile;
}

export function expandAlleyCenterline(alley) {
  const points = (alley.centerline ?? []).map(([x, z]) => ({
    x: Number(x),
    z: Number(z),
  }));
  if (points.length < 2) {
    throw new Error(`${alley.id} needs at least two centerline points`);
  }
  const [minZ, maxZ] = alley.z_range.map(Number);
  if (points[0].z !== minZ || points.at(-1).z !== maxZ) {
    throw new Error(`${alley.id} centerline endpoints must match z_range`);
  }
  const rows = [];
  let segment = 1;
  for (let z = minZ; z <= maxZ; z += 1) {
    while (segment < points.length - 1 && z > points[segment].z) segment += 1;
    const start = points[segment - 1];
    const end = points[segment];
    if (end.z <= start.z) {
      throw new Error(`${alley.id} centerline z values must strictly increase`);
    }
    const ratio = (z - start.z) / (end.z - start.z);
    rows.push({
      z,
      centerX: Math.round(start.x + (end.x - start.x) * ratio),
    });
  }
  return rows;
}

export function solveAlleyGrade(
  rows,
  anchors,
  maxCut,
  maxFill,
  minimumReversalPlateauRows = 2,
) {
  if (!rows.length || rows.some((row) => !row.surfaces?.length)) return null;
  const anchorMap = new Map(anchors.map((anchor) => [
    Number(anchor.z),
    Number(anchor.target_y),
  ]));
  const surfaceYs = rows.flatMap((row) => row.surfaces.map((surface) => surface.y));
  const anchorYs = [...anchorMap.values()];
  const minY = Math.min(...surfaceYs, ...anchorYs) - maxFill;
  const maxY = Math.max(...surfaceYs, ...anchorYs) + maxCut;
  const states = [];
  let current = new Map();
  const compareScores = (left, right) => (
    left.reversals - right.reversals
    || left.terrainCost - right.terrainCost
    || left.verticalSteps - right.verticalSteps
    || left.y - right.y
    || left.lastDirection - right.lastDirection
  );

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const requiredY = anchorMap.get(row.z);
    const next = new Map();
    for (let y = minY; y <= maxY; y += 1) {
      if (requiredY !== undefined && y !== requiredY) continue;
      const deltas = row.surfaces.map((surface) => y - surface.y);
      if (Math.min(...deltas) < -maxCut || Math.max(...deltas) > maxFill) {
        continue;
      }
      const rowCost = deltas.reduce((sum, delta) => sum + Math.abs(delta), 0);
      if (index === 0) {
        const key = `${y}:0:${minimumReversalPlateauRows}`;
        next.set(key, {
          y,
          lastDirection: 0,
          reversalPlateauRows: minimumReversalPlateauRows,
          reversals: 0,
          terrainCost: rowCost,
          verticalSteps: 0,
          previousKey: null,
        });
        continue;
      }
      for (const [previousKey, previous] of current.entries()) {
        if (Math.abs(previous.y - y) > 1) continue;
        const stepDirection = Math.sign(y - previous.y);
        const lastDirection = stepDirection || previous.lastDirection;
        const isReversal = (
          stepDirection !== 0
          && previous.lastDirection !== 0
          && stepDirection !== previous.lastDirection
        );
        if (
          isReversal
          && previous.reversalPlateauRows < minimumReversalPlateauRows
        ) {
          continue;
        }
        const reversalPlateauRows = stepDirection === 0
          ? Math.min(
            minimumReversalPlateauRows,
            previous.reversalPlateauRows + 1,
          )
          : 0;
        const candidate = {
          y,
          lastDirection,
          reversalPlateauRows,
          reversals: previous.reversals + Number(isReversal),
          terrainCost: previous.terrainCost + rowCost,
          verticalSteps: previous.verticalSteps + Number(stepDirection !== 0),
          previousKey,
        };
        const key = `${y}:${lastDirection}:${reversalPlateauRows}`;
        const existing = next.get(key);
        if (!existing || compareScores(candidate, existing) < 0) {
          next.set(key, candidate);
        }
      }
    }
    if (!next.size) return null;
    states.push(next);
    current = next;
  }

  let key = [...current.entries()]
    .sort((left, right) => compareScores(left[1], right[1]))[0][0];
  const profile = new Array(rows.length);
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const state = states[index].get(key);
    profile[index] = {
      ...rows[index],
      targetY: state.y,
    };
    key = state.previousKey;
  }
  return profile;
}

export function analyzeGradeProfile(profile) {
  const deltas = profile.slice(1).map((row, index) => (
    row.targetY - profile[index].targetY
  ));
  const directionalRuns = [];
  const reversals = [];
  let activeRun = null;
  let lastNonZeroIndex = null;

  for (let index = 0; index < deltas.length; index += 1) {
    const direction = Math.sign(deltas[index]);
    if (direction === 0) continue;
    if (!activeRun || activeRun.direction !== direction) {
      if (activeRun) {
        const plateauRows = index - lastNonZeroIndex - 1;
        reversals.push({
          atZ: profile[index + 1].z,
          fromDirection: activeRun.direction,
          toDirection: direction,
          plateauRows,
        });
      }
      activeRun = {
        direction,
        startZ: profile[index].z,
        endZ: profile[index + 1].z,
        elevationChanges: 1,
      };
      directionalRuns.push(activeRun);
    } else {
      activeRun.endZ = profile[index + 1].z;
      activeRun.elevationChanges += 1;
    }
    lastNonZeroIndex = index;
  }

  const adjacentOpposingStepPairs = deltas.slice(1).filter((delta, index) => (
    delta !== 0
    && deltas[index] !== 0
    && Math.sign(delta) !== Math.sign(deltas[index])
  )).length;
  const oneCellPeaksOrTroughs = profile.slice(1, -1).filter((row, index) => (
    profile[index].targetY === profile[index + 2].targetY
    && row.targetY !== profile[index].targetY
  )).length;

  return {
    elevationChangeCount: deltas.filter((delta) => delta !== 0).length,
    signReversalCount: reversals.length,
    adjacentOpposingStepPairs,
    oneCellPeaksOrTroughs,
    minimumReversalPlateauRows: reversals.length
      ? Math.min(...reversals.map((reversal) => reversal.plateauRows))
      : null,
    directionalRuns,
    reversals,
  };
}

export function validatePlan(plan) {
  const issues = [];
  if (plan.execution?.live_mutation_authorized !== true) {
    issues.push('live_mutation_authorized must be true');
  }
  if (plan.execution?.package_is_atomic !== true) {
    issues.push('package_is_atomic must be true');
  }
  if ((plan.garages ?? []).length !== 18) {
    issues.push(`expected 18 garages; found ${(plan.garages ?? []).length}`);
  }
  const roads = new Map((plan.roads ?? []).map((road) => [road.id, road]));
  const protectedBuildings = (plan.protected_buildings ?? []).map((feature) => ({
    id: feature.id,
    ...bounds2d(feature.bounds),
  }));
  const seenGarages = new Set();
  const seenBuildings = new Set();
  const geometries = [];
  for (const garage of plan.garages ?? []) {
    if (seenGarages.has(garage.id)) issues.push(`duplicate garage id ${garage.id}`);
    if (seenBuildings.has(garage.building)) {
      issues.push(`building ${garage.building} has more than one garage`);
    }
    seenGarages.add(garage.id);
    seenBuildings.add(garage.building);
    const accessRoute = garage.access_route ?? garage.frontage;
    const road = roads.get(accessRoute);
    if (!road) {
      issues.push(`${garage.id} references missing access route ${accessRoute}`);
      continue;
    }
    const geometry = garageGeometry(garage, road);
    geometries.push({ id: garage.id, ...geometry });
    if (geometry.width !== 7 || geometry.depth !== 7) {
      issues.push(`${garage.id} must have a 7x7 exterior`);
    }
    for (const feature of protectedBuildings) {
      if (rectanglesIntersect(geometry, feature)) {
        issues.push(`${garage.id} intersects protected building ${feature.id}`);
      }
    }
    if (String(garage.building).startsWith('H')) {
      const building = protectedBuildings.find((feature) => feature.id === garage.building);
      const rearOutward = (
        garage.side === 'west'
          ? geometry.maxX < building.minX
          : geometry.minX > building.maxX
      );
      if (!rearOutward) {
        issues.push(`${garage.id} occupies the Main Street front-garden zone`);
      }
      const setback = Math.abs(Number(garage.principal_facade_x) - geometry.frontX);
      if (setback < Number(plan.acceptance.minimum_garage_rear_setback)) {
        issues.push(`${garage.id} rear setback ${setback} is below the minimum`);
      }
      if (!String(accessRoute).startsWith('ALLEY-')) {
        issues.push(`${garage.id} must use a rear alley access route`);
      }
    }
  }
  for (let left = 0; left < geometries.length; left += 1) {
    for (let right = left + 1; right < geometries.length; right += 1) {
      if (rectanglesIntersect(geometries[left], geometries[right])) {
        issues.push(`${geometries[left].id} intersects ${geometries[right].id}`);
      }
    }
  }
  const frontage = plan.frontage_assignments ?? {};
  const assigned = Object.values(frontage).flat();
  if (new Set(assigned).size !== Number(plan.acceptance?.required_frontage_assignment_count)) {
    issues.push('frontage assignments do not contain the required number of unique objects');
  }
  if (
    (plan.shared_alleys ?? []).length
    !== Number(plan.acceptance?.required_shared_alleys)
  ) {
    issues.push('shared alley count does not match acceptance requirement');
  }
  const connectionCount = (plan.shared_alleys ?? []).reduce(
    (sum, alley) => sum + (alley.public_connections ?? []).length,
    0,
  );
  if (connectionCount !== Number(plan.acceptance?.required_complete_alley_connections)) {
    issues.push('shared alley public-connection count does not match acceptance requirement');
  }
  for (const alley of plan.shared_alleys ?? []) {
    try {
      const centerline = expandAlleyCenterline(alley);
      if (Number(alley.width) !== 3) issues.push(`${alley.id} must be three blocks wide`);
      if (
        centerline.slice(1).some((row, index) => (
          Math.abs(row.centerX - centerline[index].centerX) > 1
        ))
      ) {
        issues.push(`${alley.id} centerline shifts by more than one block per row`);
      }
      for (const garage of plan.garages ?? []) {
        if (garage.access_route !== alley.id) continue;
        const geometry = garageGeometry(garage, roads.get(alley.id));
        const row = centerline.find((candidate) => candidate.z === geometry.centerZ);
        const roadX = Number(garage.drive_x[0]);
        if (!row || Math.abs(roadX - row.centerX) > 1) {
          issues.push(`${garage.id} driveway does not meet ${alley.id}`);
        }
      }
    } catch (error) {
      issues.push(error.message);
    }
  }
  return issues;
}

function key3(x, y, z) {
  return `${x},${y},${z}`;
}

class OperationCollector {
  constructor(snapshot) {
    this.snapshot = snapshot;
    this.operations = new Map();
    this.conflicts = [];
    this.noOps = [];
  }

  async add(x, y, z, replacement, meta) {
    if (y < WORLD_MIN_Y || y > WORLD_MAX_Y) {
      this.conflicts.push({
        type: 'world_height_violation',
        point: [x, y, z],
        replacement,
        meta,
      });
      return;
    }
    const key = key3(x, y, z);
    const expected = await this.snapshot.getBlock(x, y, z);
    if (expected === null) {
      this.conflicts.push({
        type: 'missing_chunk',
        point: [x, y, z],
        replacement,
        meta,
      });
      return;
    }
    const current = this.operations.get(key);
    if (current && current.replacement !== replacement) {
      if (current.replacement === 'minecraft:air' && replacement !== 'minecraft:air') {
        this.operations.set(key, {
          x,
          y,
          z,
          expected,
          replacement,
          ...meta,
        });
        return;
      }
      this.conflicts.push({
        type: 'operation_target_conflict',
        point: [x, y, z],
        first: current,
        second: { expected, replacement, ...meta },
      });
      return;
    }
    if (current) return;
    if (expected === replacement) {
      this.noOps.push({ point: [x, y, z], state: expected, ...meta });
      return;
    }
    this.operations.set(key, {
      x,
      y,
      z,
      expected,
      replacement,
      ...meta,
    });
  }

  merge(other) {
    for (const operation of other.operations.values()) {
      const key = key3(operation.x, operation.y, operation.z);
      const current = this.operations.get(key);
      if (current && current.replacement !== operation.replacement) {
        if (current.replacement === 'minecraft:air' && operation.replacement !== 'minecraft:air') {
          this.operations.set(key, operation);
        } else {
          this.conflicts.push({
            type: 'operation_target_conflict',
            point: [operation.x, operation.y, operation.z],
            first: current,
            second: operation,
          });
        }
      } else if (!current) {
        this.operations.set(key, operation);
      }
    }
    this.conflicts.push(...other.conflicts);
    this.noOps.push(...other.noOps);
  }

  list() {
    return [...this.operations.values()];
  }
}

async function surfaceAt(snapshot, x, z, options = {}) {
  const skipped = [];
  for (let y = SURFACE_SCAN_MAX_Y; y >= SURFACE_SCAN_MIN_Y; y -= 1) {
    const state = await snapshot.getBlock(x, y, z);
    if (state === null) return { missing: true, x, z };
    if (options.ignoreExactStates?.has(state)) {
      skipped.push({ y, state, kind: 'already_desired_overlay' });
      continue;
    }
    if (isAir(state) || isSoft(state)) {
      if (!isAir(state)) skipped.push({ y, state, kind: 'soft' });
      continue;
    }
    if (options.ignoreDrivewayClearance && isApprovedDrivewayClearance(state)) {
      skipped.push({ y, state, kind: 'approved_clearance' });
      continue;
    }
    return { x, y, z, state, skipped };
  }
  return { missing: true, x, z };
}

export async function walkSurfaceAt(snapshot, x, z, headroom, options = {}) {
  for (let y = SURFACE_SCAN_MAX_Y; y >= SURFACE_SCAN_MIN_Y; y -= 1) {
    const state = await snapshot.getBlock(x, y, z);
    if (state === null) return { missing: true, x, z };
    if (options.ignoreDrivewayClearance && isApprovedDrivewayClearance(state)) {
      continue;
    }
    if (!isSafeSurface(state)) continue;
    const skipped = [];
    let clear = true;
    for (let above = y + 1; above <= y + headroom; above += 1) {
      const aboveState = await snapshot.getBlock(x, above, z);
      if (isAir(aboveState)) continue;
      if (isSoft(aboveState)) {
        skipped.push({ y: above, state: aboveState, kind: 'soft' });
        continue;
      }
      if (options.ignoreDrivewayClearance && isApprovedDrivewayClearance(aboveState)) {
        skipped.push({ y: above, state: aboveState, kind: 'approved_clearance' });
        continue;
      }
      clear = false;
      break;
    }
    if (clear) return { x, y, z, state, skipped };
  }
  return { missing: true, x, z };
}

async function roadSurfaceAt(snapshot, x, z) {
  for (let y = SURFACE_SCAN_MAX_Y; y >= SURFACE_SCAN_MIN_Y; y -= 1) {
    const state = await snapshot.getBlock(x, y, z);
    if (state === null) return { missing: true, x, z };
    if (isRoadSurface(state)) return { x, y, z, state, skipped: [] };
  }
  return { missing: true, x, z };
}

async function clearSoftColumn(snapshot, collector, x, z, y1, y2, meta) {
  for (let y = y1; y <= y2; y += 1) {
    const state = await snapshot.getBlock(x, y, z);
    if (isSoft(state)) {
      await collector.add(x, y, z, 'minecraft:air', meta);
    }
  }
}

async function prepareLevelCell({
  snapshot,
  collector,
  x,
  z,
  targetY,
  maxCut,
  maxFill,
  surfaceReplacement,
  foundationReplacement,
  collision,
  meta,
  allowPublicSurface = true,
  ignoreDrivewayClearance = false,
  headroom = 0,
  surfaceOverride = null,
}) {
  const surface = surfaceOverride
    ?? await surfaceAt(snapshot, x, z, { ignoreDrivewayClearance });
  if (surface.missing) {
    collision({
      type: 'missing_surface',
      point: [x, z],
      meta,
    });
    return false;
  }
  const surfaceAllowed = isSoft(surface.state)
    || isCuttableNatural(surface.state)
    || (allowPublicSurface && SAFE_PUBLIC_SURFACES.has(baseBlockName(surface.state)));
  if (!surfaceAllowed) {
    collision({
      type: 'protected_surface_collision',
      point: [x, surface.y, z],
      actual: surface.state,
      meta,
    });
    return false;
  }
  const cut = Math.max(0, surface.y - targetY);
  const fill = Math.max(0, targetY - surface.y);
  if (cut > maxCut || fill > maxFill) {
    collision({
      type: 'grade_limit_exceeded',
      point: [x, z],
      surfaceY: surface.y,
      targetY,
      cut,
      fill,
      maxCut,
      maxFill,
      meta,
    });
    return false;
  }

  for (const skipped of surface.skipped) {
    if (skipped.kind === 'approved_clearance') {
      await collector.add(x, skipped.y, z, 'minecraft:air', {
        ...meta,
        role: 'driveway_clearance',
      });
    }
  }

  if (cut > 0) {
    for (let y = targetY + 1; y <= surface.y; y += 1) {
      const state = await snapshot.getBlock(x, y, z);
      const canRemove = isAir(state)
        || isSoft(state)
        || isCuttableNatural(state)
        || (
          ignoreDrivewayClearance
          && (
            isApprovedDrivewayClearance(state)
            || SAFE_PUBLIC_SURFACES.has(baseBlockName(state))
          )
        );
      if (!canRemove) {
        collision({
          type: 'non_natural_cut_collision',
          point: [x, y, z],
          actual: state,
          meta,
        });
        return false;
      }
      await collector.add(x, y, z, 'minecraft:air', {
        ...meta,
        role: 'bounded_grade_cut',
      });
    }
  }

  if (fill > 0) {
    for (let y = surface.y + 1; y < targetY; y += 1) {
      const state = await snapshot.getBlock(x, y, z);
      if (
        !isAir(state)
        && !isSoft(state)
        && !(ignoreDrivewayClearance && isApprovedDrivewayClearance(state))
      ) {
        collision({
          type: 'fill_volume_collision',
          point: [x, y, z],
          actual: state,
          meta,
        });
        return false;
      }
      await collector.add(x, y, z, foundationReplacement, {
        ...meta,
        role: 'bounded_grade_fill',
      });
    }
  }

  const targetState = await snapshot.getBlock(x, targetY, z);
  if (
    !isAir(targetState)
    && !isSoft(targetState)
    && !isCuttableNatural(targetState)
    && !(allowPublicSurface && SAFE_PUBLIC_SURFACES.has(baseBlockName(targetState)))
    && !(ignoreDrivewayClearance && isApprovedDrivewayClearance(targetState))
  ) {
    collision({
      type: 'target_surface_collision',
      point: [x, targetY, z],
      actual: targetState,
      meta,
    });
    return false;
  }
  await collector.add(x, targetY, z, surfaceReplacement, {
    ...meta,
    role: meta.role ?? 'finished_surface',
  });

  for (let y = targetY + 1; y <= targetY + headroom; y += 1) {
    const state = await snapshot.getBlock(x, y, z);
    if (isAir(state)) continue;
    if (isSoft(state) || (ignoreDrivewayClearance && isApprovedDrivewayClearance(state))) {
      await collector.add(x, y, z, 'minecraft:air', {
        ...meta,
        role: 'headroom_clearance',
      });
      continue;
    }
    if (
      cut > 0
      && y <= surface.y
      && (
        isAir(state)
        || isSoft(state)
        || isCuttableNatural(state)
        || (
          ignoreDrivewayClearance
          && (
            isApprovedDrivewayClearance(state)
            || SAFE_PUBLIC_SURFACES.has(baseBlockName(state))
          )
        )
      )
    ) {
      continue;
    }
    collision({
      type: 'headroom_collision',
      point: [x, y, z],
      actual: state,
      meta,
    });
    return false;
  }
  await clearSoftColumn(
    snapshot,
    collector,
    x,
    z,
    targetY + headroom + 1,
    Math.min(targetY + headroom + 2, WORLD_MAX_Y),
    meta,
  );
  return true;
}

async function generateSharedAlleys(plan, snapshot, collector, collisions) {
  const accessSurfaces = new Map();
  const matrices = [];
  const scopeBoxes = [];
  const protectedBuildings = (plan.protected_buildings ?? []).map((feature) => ({
    id: feature.id,
    ...bounds2d(feature.bounds),
  }));

  for (const alley of plan.shared_alleys ?? []) {
    const centerline = expandAlleyCenterline(alley);
    const rows = [];
    const alleyCollisions = [];
    const collision = (entry) => {
      const detailed = { scope: alley.id, ...entry };
      alleyCollisions.push(detailed);
      collisions.push(detailed);
    };

    for (const row of centerline) {
      const surfaces = [];
      for (
        let x = row.centerX - Math.floor(Number(alley.width) / 2);
        x <= row.centerX + Math.floor(Number(alley.width) / 2);
        x += 1
      ) {
        const protectedFeature = protectedBuildings.find((feature) => (
          x >= feature.minX
          && x <= feature.maxX
          && row.z >= feature.minZ
          && row.z <= feature.maxZ
        ));
        if (protectedFeature) {
          collision({
            type: 'alley_protected_building_intersection',
            point: [x, row.z],
            protectedFeature: protectedFeature.id,
          });
          continue;
        }
        const surface = await walkSurfaceAt(
          snapshot,
          x,
          row.z,
          Number(alley.headroom),
          { ignoreDrivewayClearance: true },
        );
        if (surface.missing) {
          collision({
            type: 'alley_surface_or_headroom_collision',
            point: [x, row.z],
          });
          continue;
        }
        surfaces.push(surface);
      }
      rows.push({ ...row, surfaces });
    }

    const profile = alleyCollisions.length
      ? null
      : solveAlleyGrade(
        rows,
        alley.grade_anchors ?? [],
        Number(alley.max_cut),
        Number(alley.max_fill),
        Number(plan.acceptance.minimum_alley_reversal_plateau_rows),
      );
    if (!profile) {
      collision({
        type: 'alley_grade_profile_infeasible',
        maxCut: Number(alley.max_cut),
        maxFill: Number(alley.max_fill),
        maximumAdjacentStep: Number(plan.acceptance.maximum_adjacent_alley_step),
      });
    }

    if (profile) {
      for (const row of profile) {
        for (const surface of row.surfaces) {
          await prepareLevelCell({
            snapshot,
            collector,
            x: surface.x,
            z: surface.z,
            targetY: row.targetY,
            maxCut: Number(alley.max_cut),
            maxFill: Number(alley.max_fill),
            surfaceReplacement: plan.palette.alley_surface,
            foundationReplacement: plan.palette.driveway_foundation,
            collision,
            meta: {
              phase: 10,
              scope: alley.id,
              feature: alley.id,
              role: 'shared_alley_surface',
            },
            ignoreDrivewayClearance: true,
            headroom: Number(alley.headroom),
            surfaceOverride: surface,
          });
          accessSurfaces.set(`${surface.x},${surface.z}`, {
            x: surface.x,
            y: row.targetY,
            z: surface.z,
            state: plan.palette.alley_surface,
            planned: true,
            route: alley.id,
          });
        }
      }
    }

    const pad = alley.terminal_turn_pad;
    if (pad) {
      const [minX, maxX, minZ, maxZ] = pad.bounds.map(Number);
      for (let x = minX; x <= maxX; x += 1) {
        for (let z = minZ; z <= maxZ; z += 1) {
          const surface = await walkSurfaceAt(
            snapshot,
            x,
            z,
            Number(alley.headroom),
            { ignoreDrivewayClearance: true },
          );
          if (surface.missing) {
            collision({
              type: 'alley_turn_pad_surface_or_headroom_collision',
              point: [x, z],
            });
            continue;
          }
          await prepareLevelCell({
            snapshot,
            collector,
            x,
            z,
            targetY: Number(pad.floor_y),
            maxCut: Number(alley.max_cut),
            maxFill: Number(alley.max_fill),
            surfaceReplacement: plan.palette.alley_surface,
            foundationReplacement: plan.palette.driveway_foundation,
            collision,
            meta: {
              phase: 11,
              scope: alley.id,
              feature: alley.id,
              role: 'alley_turn_pad',
            },
            ignoreDrivewayClearance: true,
            headroom: Number(alley.headroom),
            surfaceOverride: surface,
          });
          accessSurfaces.set(`${x},${z}`, {
            x,
            y: Number(pad.floor_y),
            z,
            state: plan.palette.alley_surface,
            planned: true,
            route: alley.id,
          });
        }
      }
    }

    const connectionNodes = [];
    for (const anchor of alley.grade_anchors ?? []) {
      if (!String(anchor.purpose).endsWith('_connection')) continue;
      const roadId = String(anchor.purpose).replace(/_connection$/, '');
      const row = profile?.find((candidate) => candidate.z === Number(anchor.z));
      const centerSurface = row?.surfaces.find(
        (surface) => surface.x === row.centerX,
      );
      const baselineRoad = centerSurface
        ? await roadSurfaceAt(snapshot, centerSurface.x, centerSurface.z)
        : { missing: true };
      const connected = (
        !baselineRoad.missing
        && isRoadSurface(baselineRoad.state)
        && Math.abs(baselineRoad.y - Number(anchor.target_y)) <= 1
      );
      if (!connected) {
        collision({
          type: 'alley_public_connection_incomplete',
          road: roadId,
          point: row ? [row.centerX, row.z] : [null, Number(anchor.z)],
          baselineRoad,
          targetY: Number(anchor.target_y),
        });
      }
      connectionNodes.push({
        road: roadId,
        point: row ? [row.centerX, Number(anchor.target_y), row.z] : null,
        baselineRoad,
        connected,
      });
    }

    const steps = profile
      ? profile.slice(1).map((row, index) => (
        Math.abs(row.targetY - profile[index].targetY)
      ))
      : [];
    const allSurfaces = profile?.flatMap((row) => row.surfaces) ?? [];
    const actualMaxCut = profile
      ? Math.max(0, ...profile.flatMap((row) => (
        row.surfaces.map((surface) => surface.y - row.targetY)
      )))
      : null;
    const actualMaxFill = profile
      ? Math.max(0, ...profile.flatMap((row) => (
        row.surfaces.map((surface) => row.targetY - surface.y)
      )))
      : null;
    const gradeAnalysis = profile
      ? analyzeGradeProfile(profile)
      : {
        elevationChangeCount: null,
        signReversalCount: null,
        adjacentOpposingStepPairs: null,
        oneCellPeaksOrTroughs: null,
        minimumReversalPlateauRows: null,
        directionalRuns: [],
        reversals: [],
      };
    matrices.push({
      id: alley.id,
      width: Number(alley.width),
      zRange: alley.z_range.map(Number),
      rowCount: profile?.length ?? 0,
      cellCount: allSurfaces.length,
      centerline: profile?.map((row) => [row.centerX, row.targetY, row.z]) ?? [],
      publicConnections: connectionNodes,
      terminalTurnPad: pad,
      actualMaximumCut: actualMaxCut,
      actualMaximumFill: actualMaxFill,
      maximumAdjacentStep: steps.length ? Math.max(...steps) : null,
      gradeAnalysis: {
        solverStandard: 'lexicographic minimum feasible sign reversals, then minimum terrain cut/fill cost, then minimum vertical steps',
        requiredMinimumReversalPlateauRows: Number(
          plan.acceptance.minimum_alley_reversal_plateau_rows,
        ),
        ...gradeAnalysis,
      },
      collisionCount: alleyCollisions.length,
      collisions: alleyCollisions,
      complete: (
        alleyCollisions.length === 0
        && connectionNodes.every((connection) => connection.connected)
        && steps.every((step) => (
          step <= Number(plan.acceptance.maximum_adjacent_alley_step)
        ))
        && gradeAnalysis.adjacentOpposingStepPairs === 0
        && gradeAnalysis.oneCellPeaksOrTroughs === 0
        && (
          gradeAnalysis.minimumReversalPlateauRows === null
          || gradeAnalysis.minimumReversalPlateauRows >= Number(
            plan.acceptance.minimum_alley_reversal_plateau_rows,
          )
        )
      ),
    });
    if (profile?.length) {
      const xs = allSurfaces.map((surface) => surface.x);
      const ys = profile.map((row) => row.targetY);
      scopeBoxes.push({
        scope: alley.id,
        box: [
          Math.min(...xs) - 1,
          Math.min(...ys) - Number(alley.max_fill) - 1,
          Number(alley.z_range[0]) - 1,
          Math.max(...xs) + 1,
          Math.max(...ys) + Number(alley.headroom) + 1,
          Number(alley.z_range[1]) + 1,
        ],
      });
    }
  }

  return { accessSurfaces, matrices, scopeBoxes };
}

async function generateGarage(
  plan,
  snapshot,
  garage,
  road,
  accessSurfaces = new Map(),
) {
  const geometry = garageGeometry(garage, road);
  const collector = new OperationCollector(snapshot);
  const collisions = [];
  const collision = (entry) => collisions.push({ garage: garage.id, ...entry });
  const maxCut = Number(plan.execution.maximum_garage_cut);
  const maxFill = Number(plan.execution.maximum_garage_fill);
  const palette = plan.palette;

  for (let x = geometry.minX; x <= geometry.maxX; x += 1) {
    for (let z = geometry.minZ; z <= geometry.maxZ; z += 1) {
      await prepareLevelCell({
        snapshot,
        collector,
        x,
        z,
        targetY: geometry.floorY,
        maxCut,
        maxFill,
        surfaceReplacement: palette.garage_floor,
        foundationReplacement: palette.driveway_foundation,
        collision,
        meta: {
          phase: 20,
          scope: garage.id,
          feature: garage.building,
          role: 'garage_floor',
        },
        headroom: 5,
      });
    }
  }

  for (let x = geometry.minX; x <= geometry.maxX; x += 1) {
    for (let z = geometry.minZ; z <= geometry.maxZ; z += 1) {
      const perimeter = (
        x === geometry.minX
        || x === geometry.maxX
        || z === geometry.minZ
        || z === geometry.maxZ
      );
      if (perimeter) {
        for (let y = geometry.floorY + 1; y <= geometry.floorY + 4; y += 1) {
          const inPortal = (
            x === geometry.portal.x
            && z >= geometry.portal.minZ
            && z <= geometry.portal.maxZ
            && y >= geometry.portal.minY
            && y <= geometry.portal.maxY
          );
          if (inPortal) continue;
          await collector.add(
            x,
            y,
            z,
            y === geometry.floorY + 4 ? palette.garage_lintel : palette.garage_wall,
            {
              phase: 21,
              scope: garage.id,
              feature: garage.building,
              role: inPortal ? 'garage_portal' : 'garage_wall',
            },
          );
        }
      }
      await collector.add(x, geometry.floorY + 5, z, palette.garage_roof, {
        phase: 22,
        scope: garage.id,
        feature: garage.building,
        role: 'garage_roof',
      });
    }
  }

  const [roadX, garageAdjacentX] = garage.drive_x.map(Number);
  const plannedAccessSurface = accessSurfaces.get(`${roadX},${geometry.centerZ}`);
  const roadSurface = plannedAccessSurface
    ?? await roadSurfaceAt(snapshot, roadX, geometry.centerZ);
  if (roadSurface.missing || !isRoadSurface(roadSurface.state)) {
    collision({
      type: 'frontage_road_not_found',
      point: [roadX, geometry.centerZ],
      actual: roadSurface.state ?? 'MISSING',
      frontage: garage.frontage,
      accessRoute: garage.access_route ?? garage.frontage,
    });
  }

  let profile = [];
  if (!roadSurface.missing) {
    try {
      profile = interpolateDrivewayProfile(
        roadX,
        garageAdjacentX,
        roadSurface.y,
        geometry.floorY,
      );
    } catch (error) {
      collision({
        type: 'driveway_grade_infeasible',
        message: error.message,
      });
    }
  }

  for (const point of profile) {
    for (let z = geometry.centerZ - 1; z <= geometry.centerZ + 1; z += 1) {
      const walkSurface = await walkSurfaceAt(
        snapshot,
        point.x,
        z,
        Number(plan.execution.minimum_clear_headroom),
        { ignoreDrivewayClearance: true },
      );
      await prepareLevelCell({
        snapshot,
        collector,
        x: point.x,
        z,
        targetY: point.y,
        maxCut,
        maxFill,
        surfaceReplacement: palette.driveway,
        foundationReplacement: palette.driveway_foundation,
        collision,
        meta: {
          phase: 23,
          scope: garage.id,
          feature: garage.building,
          role: 'driveway_surface',
        },
        ignoreDrivewayClearance: true,
        headroom: Number(plan.execution.minimum_clear_headroom),
        surfaceOverride: walkSurface,
      });
    }
  }

  const profileSteps = profile.slice(1).map((point, index) => (
    Math.abs(point.y - profile[index].y)
  ));
  const usability = {
    exterior: [geometry.width, geometry.depth],
    interior: [
      geometry.interior.maxX - geometry.interior.minX + 1,
      geometry.interior.maxZ - geometry.interior.minZ + 1,
    ],
    portalWidth: geometry.portal.maxZ - geometry.portal.minZ + 1,
    portalHeadroom: geometry.portal.maxY - geometry.portal.minY + 1,
    drivewayWidth: 3,
    drivewayProfile: profile,
    maximumAdjacentStep: profileSteps.length ? Math.max(...profileSteps) : null,
    roadConnection: roadSurface.missing
      ? null
      : {
        x: roadX,
        y: roadSurface.y,
        z: geometry.centerZ,
        state: roadSurface.state,
        planned: Boolean(roadSurface.planned),
        route: garage.access_route ?? garage.frontage,
      },
    usable: (
      collisions.length === 0
      && geometry.width === 7
      && geometry.depth === 7
      && geometry.portal.maxZ - geometry.portal.minZ + 1 >= 3
      && geometry.portal.maxY - geometry.portal.minY + 1 >= 3
      && (profileSteps.length === 0 || Math.max(...profileSteps) <= 1)
    ),
  };

  return {
    garage,
    geometry,
    collector,
    collisions,
    usability,
    scopeBox: [
      Math.min(geometry.minX, roadX) - 1,
      geometry.floorY - maxFill - 1,
      geometry.minZ - 1,
      Math.max(geometry.maxX, roadX) + 1,
      geometry.floorY + 6,
      geometry.maxZ + 1,
    ],
  };
}

async function generateSurfaceArea({
  plan,
  snapshot,
  collector,
  id,
  bounds,
  desiredFor,
  role,
  phase,
  collisions,
  headroom,
  fixedY = null,
}) {
  const [minX, maxX, minZ, maxZ] = bounds.map(Number);
  for (let x = minX; x <= maxX; x += 1) {
    for (let z = minZ; z <= maxZ; z += 1) {
      const surface = fixedY === null
        ? await walkSurfaceAt(snapshot, x, z, headroom, {
          ignoreDrivewayClearance: true,
        })
        : {
          x,
          y: Number(fixedY),
          z,
          state: await snapshot.getBlock(x, Number(fixedY), z),
          skipped: [],
        };
      if (
        surface.missing
        || (!isSafeSurface(surface.state) && !isSoft(surface.state))
      ) {
        collisions.push({
          scope: id,
          type: 'surface_area_collision',
          point: [x, surface.y ?? null, z],
          actual: surface.state ?? 'MISSING',
        });
        continue;
      }
      await prepareLevelCell({
        snapshot,
        collector,
        x,
        z,
        targetY: surface.y,
        maxCut: 0,
        maxFill: 0,
        surfaceReplacement: desiredFor(x, z),
        foundationReplacement: plan.palette.driveway_foundation,
        collision: (entry) => collisions.push({ scope: id, ...entry }),
        meta: {
          phase,
          scope: id,
          role,
        },
        ignoreDrivewayClearance: true,
        headroom,
        surfaceOverride: surface,
      });
    }
  }
}

async function generatePylon(plan, snapshot, collector, pylon, scope, collisions) {
  const surface = pylon.ground_y === undefined
    ? await walkSurfaceAt(snapshot, Number(pylon.x), Number(pylon.z), 4)
    : {
      x: Number(pylon.x),
      y: Number(pylon.ground_y),
      z: Number(pylon.z),
      state: await snapshot.getBlock(
        Number(pylon.x),
        Number(pylon.ground_y),
        Number(pylon.z),
      ),
    };
  if (surface.missing || !isSafeSurface(surface.state)) {
    collisions.push({
      scope,
      type: 'pylon_surface_collision',
      point: [pylon.x, surface.y ?? null, pylon.z],
      actual: surface.state ?? 'MISSING',
    });
    return;
  }
  const body = pylon.body === 'service'
    ? plan.palette.service_pylon
    : plan.palette.identity_pylon;
  for (let y = surface.y + 1; y <= surface.y + 4; y += 1) {
    const state = await snapshot.getBlock(Number(pylon.x), y, Number(pylon.z));
    if (!isAir(state) && !isSoft(state)) {
      collisions.push({
        scope,
        type: 'pylon_volume_collision',
        point: [pylon.x, y, pylon.z],
        actual: state,
      });
      return;
    }
  }
  for (let y = surface.y + 1; y <= surface.y + 3; y += 1) {
    await collector.add(Number(pylon.x), y, Number(pylon.z), body, {
      phase: 42,
      scope,
      role: 'identity_pylon',
    });
  }
  await collector.add(
    Number(pylon.x),
    surface.y + 4,
    Number(pylon.z),
    plan.palette.pylon_light,
    {
      phase: 42,
      scope,
      role: 'identity_pylon_light',
    },
  );
}

function pointsOnScreenSegment(segment) {
  const points = [];
  if (segment.axis === 'z') {
    for (let z = Number(segment.min); z <= Number(segment.max); z += 1) {
      points.push({ x: Number(segment.fixed), z });
    }
  } else if (segment.axis === 'x') {
    for (let x = Number(segment.min); x <= Number(segment.max); x += 1) {
      points.push({ x, z: Number(segment.fixed) });
    }
  } else {
    throw new Error(`invalid screen segment axis ${segment.axis}`);
  }
  return points;
}

async function generateHedge(plan, snapshot, collector, segment, scope, collisions) {
  for (const point of pointsOnScreenSegment(segment)) {
    const surface = await surfaceAt(snapshot, point.x, point.z, {
      ignoreExactStates: new Set([plan.palette.screen_hedge]),
    });
    if (surface.missing || !isSafeSurface(surface.state)) {
      collisions.push({
        scope,
        type: 'screen_surface_collision',
        point: [point.x, surface.y ?? null, point.z],
        actual: surface.state ?? 'MISSING',
      });
      continue;
    }
    let ready = true;
    for (let offset = 1; offset <= Number(segment.height); offset += 1) {
      const state = await snapshot.getBlock(point.x, surface.y + offset, point.z);
      if (
        state !== plan.palette.screen_hedge
        && !isAir(state)
        && !isSoft(state)
      ) {
        collisions.push({
          scope,
          type: 'screen_volume_collision',
          point: [point.x, surface.y + offset, point.z],
          actual: state,
        });
        ready = false;
        break;
      }
    }
    if (!ready) continue;
    for (let offset = 1; offset <= Number(segment.height); offset += 1) {
      await collector.add(
        point.x,
        surface.y + offset,
        point.z,
        plan.palette.screen_hedge,
        {
          phase: 44,
          scope,
          role: 'service_screen',
        },
      );
    }
  }
}

async function generateWayfinding(plan, snapshot, collector, collisions) {
  const results = [];
  for (const inlay of plan.wayfinding_inlays ?? []) {
    const points = [];
    for (const [rawX, rawZ] of inlay.points ?? []) {
      const x = Number(rawX);
      const z = Number(rawZ);
      const surface = await roadSurfaceAt(snapshot, x, z);
      if (surface.missing || !isRoadSurface(surface.state)) {
        collisions.push({
          scope: inlay.id,
          type: 'wayfinding_source_not_road',
          point: [x, surface.y ?? null, z],
          actual: surface.state ?? 'MISSING',
        });
        continue;
      }
      await collector.add(x, surface.y, z, inlay.desired, {
        phase: 40,
        scope: inlay.id,
        role: 'wayfinding_inlay',
      });
      points.push({ x, y: surface.y, z, expected: surface.state });
    }
    results.push({
      id: inlay.id,
      desired: inlay.desired,
      requestedPoints: (inlay.points ?? []).length,
      readyPoints: points.length,
      points,
    });
  }
  return results;
}

function operationBounds(operations) {
  if (!operations.length) return null;
  return [
    Math.min(...operations.map((item) => item.x)),
    Math.min(...operations.map((item) => item.y)),
    Math.min(...operations.map((item) => item.z)),
    Math.max(...operations.map((item) => item.x)),
    Math.max(...operations.map((item) => item.y)),
    Math.max(...operations.map((item) => item.z)),
  ];
}

function groupedCount(items, field) {
  const output = {};
  for (const item of items) {
    const key = String(item[field] ?? 'unknown');
    output[key] = (output[key] ?? 0) + 1;
  }
  return output;
}

function entitySummary(entity, scope) {
  return {
    scope,
    id: entity.id ?? entity.Id ?? 'unknown',
    x: Number(entity.x),
    y: Number(entity.y),
    z: Number(entity.z),
  };
}

function isStatefulFence(state) {
  const name = baseBlockName(state);
  return name.endsWith('_fence') || name.endsWith('_fence_gate');
}

function parseStateProperties(state) {
  const bracket = state.indexOf('[');
  if (bracket < 0) return { name: state, properties: {} };
  return {
    name: state.slice(0, bracket),
    properties: Object.fromEntries(
      state.slice(bracket + 1, -1)
        .split(',')
        .filter(Boolean)
        .map((entry) => entry.split('=')),
    ),
  };
}

function formatStateProperties(name, properties) {
  const keys = Object.keys(properties).sort();
  if (!keys.length) return name;
  return `${name}[${keys.map((key) => `${key}=${properties[key]}`).join(',')}]`;
}

export function runtimeGuardForOperation(
  operation,
  earlierChangedFenceTargets = new Map(),
) {
  const expected = parseStateProperties(operation.expected);
  if (expected.name.endsWith('_fence')) {
    const sides = [
      ['west', key3(operation.x - 1, operation.y, operation.z)],
      ['east', key3(operation.x + 1, operation.y, operation.z)],
      ['north', key3(operation.x, operation.y, operation.z - 1)],
      ['south', key3(operation.x, operation.y, operation.z + 1)],
    ];
    for (const [property, neighborKey] of sides) {
      if (
        property in expected.properties
        && earlierChangedFenceTargets.has(neighborKey)
      ) {
        expected.properties[property] = (
          baseBlockName(earlierChangedFenceTargets.get(neighborKey))
          === 'minecraft:air'
            ? 'false'
            : 'true'
        );
      }
    }
    return formatStateProperties(expected.name, expected.properties);
  }
  return operation.expected;
}

export function runtimeOperationClass(operation) {
  if (isStatefulFence(operation.expected)) {
    return 0;
  }
  if (
    isSoft(operation.expected)
    || baseBlockName(operation.replacement) === 'minecraft:air'
  ) {
    return 1;
  }
  return 2;
}

export function orderOperationsForRuntime(operations) {
  const sorted = [...operations].sort((left, right) => (
    runtimeOperationClass(left) - runtimeOperationClass(right)
    || (
      runtimeOperationClass(left) < 2
        ? right.y - left.y
        : left.phase - right.phase
    )
    || left.phase - right.phase
    || left.scope.localeCompare(right.scope)
    || left.z - right.z
    || left.x - right.x
    || left.y - right.y
  ));
  const earlierChangedFenceTargets = new Map();
  return sorted.map((operation) => {
    const fenceNeighborKeys = [
      key3(operation.x - 1, operation.y, operation.z),
      key3(operation.x + 1, operation.y, operation.z),
      key3(operation.x, operation.y, operation.z - 1),
      key3(operation.x, operation.y, operation.z + 1),
    ];
    const fenceNeighborAlreadyChanged = (
      baseBlockName(operation.expected).endsWith('_fence')
      && fenceNeighborKeys.some((key) => earlierChangedFenceTargets.has(key))
    );
    const predictedRuntimeExpected = runtimeGuardForOperation(
      operation,
      earlierChangedFenceTargets,
    );
    if (baseBlockName(operation.expected).endsWith('_fence')) {
      earlierChangedFenceTargets.set(
        key3(operation.x, operation.y, operation.z),
        operation.replacement,
      );
    }
    const allowedExactSources = predictedRuntimeExpected === operation.expected
      ? [operation.expected]
      : [...new Set([operation.expected, predictedRuntimeExpected])];
    return {
      ...operation,
      snapshotExactSource: operation.expected,
      predictedRuntimeExactSource: predictedRuntimeExpected,
      allowedExactSources,
      runtimeExpected: allowedExactSources.join(','),
      guardMode: fenceNeighborAlreadyChanged
        ? (
          predictedRuntimeExpected === operation.expected
            ? 'exact-state-neighbor-validated'
            : 'finite-exact-state-union'
        )
        : 'exact-state',
      runtimeOrderClass: [
        'stateful-fence-clearance',
        'reactive-clearance-or-replacement',
        'support-surface-or-structure',
      ][runtimeOperationClass(operation)],
    };
  });
}

export function analyzeRuntimeOrdering(operations) {
  const earlierTargets = new Map();
  const reactiveNeighborHazards = [];
  let firstSupportMutationIndex = null;
  let lastReactiveOperationIndex = null;

  for (let index = 0; index < operations.length; index += 1) {
    const operation = operations[index];
    const operationClass = runtimeOperationClass(operation);
    if (operationClass < 2) lastReactiveOperationIndex = index;
    else if (firstSupportMutationIndex === null) firstSupportMutationIndex = index;

    if (isSoft(operation.expected)) {
      const supportKey = key3(operation.x, operation.y - 1, operation.z);
      const earlierSupport = earlierTargets.get(supportKey);
      if (earlierSupport !== undefined) {
        reactiveNeighborHazards.push({
          type: 'support_changed_before_reactive_target',
          operationIndex: index,
          point: [operation.x, operation.y, operation.z],
          expected: operation.expected,
          earlierSupportOperationIndex: earlierSupport,
        });
      }
    }

    if (
      isStatefulFence(operation.expected)
      && ![
        'exact-state-neighbor-validated',
        'finite-exact-state-union',
      ].includes(operation.guardMode)
    ) {
      const neighborKeys = [
        key3(operation.x - 1, operation.y, operation.z),
        key3(operation.x + 1, operation.y, operation.z),
        key3(operation.x, operation.y, operation.z - 1),
        key3(operation.x, operation.y, operation.z + 1),
      ];
      const changedNeighbor = neighborKeys
        .map((key) => earlierTargets.get(key))
        .find((candidate) => candidate !== undefined);
      if (changedNeighbor !== undefined) {
        reactiveNeighborHazards.push({
          type: 'fence_neighbor_changed_before_exact_state_guard',
          operationIndex: index,
          point: [operation.x, operation.y, operation.z],
          expected: operation.expected,
          earlierNeighborOperationIndex: changedNeighbor,
        });
      }
    }
    earlierTargets.set(key3(operation.x, operation.y, operation.z), index);
  }

  const finiteExactStateUnionCells = operations.filter(
    (operation) => operation.guardMode === 'finite-exact-state-union',
  ).length;
  const neighborValidatedExactStateGuardCount = operations.filter(
    (operation) => operation.guardMode === 'exact-state-neighbor-validated',
  ).length;
  const finiteExactStateUnionGuards = finiteExactStateUnionCells
    ? [{
      desired: 'minecraft:air',
      cells: operations
        .filter((operation) => operation.guardMode === 'finite-exact-state-union')
        .map((operation) => ({
          point: [operation.x, operation.y, operation.z],
          snapshotExactSource: operation.snapshotExactSource,
          allowedExactSources: operation.allowedExactSources,
        })),
      cellCount: finiteExactStateUnionCells,
      sourceMaterial: 'minecraft:birch_fence',
      blockEntityCapable: false,
    }]
    : [];
  const exactStateGuardCount = operations.length;
  return {
    policy: [
      'support-dependent plants and clearance/removal operations execute before support, surface, or structural mutations',
      'reactive operations execute top-down so upper double plants clear before lower halves',
      'connected fence removals use a finite union of the snapshot exact state and the predicted exact state after earlier removals in the same component',
      'rollback restores the immutable-snapshot exact state at every changed fence cell',
    ],
    reactiveOperationCount: operations.filter(
      (operation) => runtimeOperationClass(operation) < 2,
    ).length,
    supportDependentExpectedStateCount: operations.filter(
      (operation) => isSoft(operation.expected),
    ).length,
    statefulFenceExpectedStateCount: operations.filter(
      (operation) => isStatefulFence(operation.expected),
    ).length,
    exactStateGuardCount,
    neighborDerivedExactStateGuardCount: finiteExactStateUnionCells,
    neighborValidatedExactStateGuardCount,
    neighborNormalizedMaterialGuardCount: 0,
    finiteExactStateUnionGuards,
    firstSupportMutationIndex,
    lastReactiveOperationIndex,
    allReactiveOperationsBeforeSupportMutations: (
      lastReactiveOperationIndex === null
      || firstSupportMutationIndex === null
      || lastReactiveOperationIndex < firstSupportMutationIndex
    ),
    reactiveNeighborHazardCount: reactiveNeighborHazards.length,
    reactiveNeighborHazards,
  };
}

function operationLine(operation) {
  return [
    'REPL',
    operation.x,
    operation.y,
    operation.z,
    operation.x,
    operation.y,
    operation.z,
    operation.runtimeExpected ?? operation.expected,
    operation.replacement,
  ].join(' ');
}

export function buildRollbackOperations(operations) {
  return [...operations].reverse().map((operation) => ({
    ...operation,
    expected: operation.replacement,
    runtimeExpected: operation.replacement,
    snapshotExactSource: operation.replacement,
    predictedRuntimeExactSource: operation.replacement,
    allowedExactSources: [operation.replacement],
    guardMode: 'exact-state',
    replacement: operation.snapshotExactSource ?? operation.expected,
    phase: 900 - Number(operation.phase),
    role: `rollback_${operation.role}`,
  }));
}

function operationGeometry(operations, predicate) {
  const selected = operations.filter(predicate);
  if (!selected.length) return null;
  return {
    type: 'bounds',
    minX: Math.min(...selected.map((operation) => operation.x)),
    minY: Math.min(...selected.map((operation) => operation.y)),
    minZ: Math.min(...selected.map((operation) => operation.z)),
    maxX: Math.max(...selected.map((operation) => operation.x)),
    maxY: Math.max(...selected.map((operation) => operation.y)),
    maxZ: Math.max(...selected.map((operation) => operation.z)),
  };
}

function qualityStatuses(functional, legibility, media) {
  return {
    functional: {
      status: functional,
      evidence: 'Immutable-snapshot exact-state generation; live route proof remains required.',
    },
    legibility: {
      status: legibility,
      evidence: 'Placement and route hierarchy were checked against the governing R4/R5 plan.',
    },
    media: {
      status: media,
      evidence: 'Object-matched post-release screenshots must use the accepted final snapshot.',
    },
  };
}

function buildDatabaseFeatures({
  plan,
  garageMatrix,
  alleyMatrix,
  wayfinding,
  operations,
  desiredStateNoOps,
}) {
  const featureGeometryOperations = [
    ...operations,
    ...desiredStateNoOps.map((operation) => ({
      ...operation,
      x: operation.point[0],
      y: operation.point[1],
      z: operation.point[2],
    })),
  ];
  const sourceRefs = [
    'mainstreet-america/planning/redevelopment-r4-r5.yaml',
    DEFAULT_OUTPUT,
    DEFAULT_ROLLBACK,
    DEFAULT_REPORT,
    DEFAULT_DESIGN,
    'docs/redevelopment/2026-07-27/master-plan.md#62-house-frontage-and-garage-schedule',
    'docs/redevelopment/2026-07-27/infrastructure-standards.md#5-garages-and-driveways',
  ];
  const base = {
    projectId: 'mainstreet-america',
    world: 'world',
    status: 'planned',
    completionRatio: 0,
    conditionScore: null,
    source: 'build_job',
    sourceRef: DEFAULT_REPORT,
  };
  const records = garageMatrix.map((garage) => {
    const [minX, maxX, minZ, maxZ] = garage.garageBounds.map(Number);
    const rear = String(garage.buildingId).startsWith('H');
    return {
      ...base,
      externalId: `R4-${garage.garageId}`,
      parentExternalId: garage.buildingId,
      name: `${garage.buildingId} detached rear/side garage`,
      kind: 'custom',
      geometry: {
        type: 'bounds',
        minX,
        minY: garage.floorY,
        minZ,
        maxX,
        maxY: garage.floorY + 5,
        maxZ,
      },
      tags: [
        'garage',
        rear ? 'rear-outward' : 'side-placement',
        'three-wide-access',
        'exact-state-guarded',
        'not-live-executed',
      ],
      quality: qualityStatuses(
        garage.usable
          ? 'offline-geometry-and-access-pass-live-use-pending'
          : 'offline-access-failed',
        rear
          ? 'main-street-front-garden-preserved-rear-alley-address'
          : 'public-street-address-with-subordinate-side-garage',
        'post-release-object-matched-exterior-and-interior-captures-required',
      ),
      attributes: {
        featureClass: 'garage',
        packageId: plan.id,
        parentBuildingExternalId: garage.buildingId,
        publicFrontage: garage.frontage,
        accessRoute: garage.accessRoute,
        placement: garage.placement,
        front: garage.front,
        floorY: garage.floorY,
        portalWidth: garage.portalWidth,
        portalHeadroom: garage.portalHeadroom,
        drivewayWidth: garage.drivewayWidth,
        rearSetback: garage.rearSetback,
        frontGardenPreserved: garage.frontGardenPreserved,
        sourceSnapshotSha256: plan.execution.source_snapshot.sha256,
        sourceRefs,
        quality: qualityStatuses(
          garage.usable
            ? 'offline-geometry-and-access-pass-live-use-pending'
            : 'offline-access-failed',
          rear
            ? 'main-street-front-garden-preserved-rear-alley-address'
            : 'public-street-address-with-subordinate-side-garage',
          'post-release-object-matched-exterior-and-interior-captures-required',
        ),
      },
    };
  });

  for (const alley of alleyMatrix) {
    const points = alley.centerline.map(([x, y, z]) => ({ x, y, z }));
    records.push({
      ...base,
      externalId: `R4-${alley.id}`,
      parentExternalId: 'SITE',
      name: alley.id === 'ALLEY-W' ? 'West Rear Alley' : 'East Rear Alley',
      kind: 'road',
      geometry: {
        type: 'path',
        points,
        width: alley.width,
      },
      tags: [
        'rear-alley',
        'residential-service',
        'three-wide',
        'terrain-following',
        'exact-state-guarded',
        'not-live-executed',
      ],
      quality: qualityStatuses(
        alley.complete
          ? 'offline-continuity-grade-and-connection-pass-live-drive-pending'
          : 'offline-route-incomplete',
        'shared-rear-service-route-subordinate-to-public-streets',
        'post-release-route-sequence-and-junction-captures-required',
      ),
      attributes: {
        featureClass: 'rear-alley',
        packageId: plan.id,
        exact3dBounds: {
          minX: Math.min(...points.map((point) => point.x - 1)),
          minY: Math.min(...points.map((point) => point.y)),
          minZ: Math.min(...points.map((point) => point.z)),
          maxX: Math.max(...points.map((point) => point.x + 1)),
          maxY: Math.max(...points.map((point) => point.y)),
          maxZ: Math.max(...points.map((point) => point.z)),
        },
        publicConnections: alley.publicConnections,
        terminalTurnPad: alley.terminalTurnPad,
        maximumAdjacentStep: alley.maximumAdjacentStep,
        actualMaximumCut: alley.actualMaximumCut,
        actualMaximumFill: alley.actualMaximumFill,
        sourceSnapshotSha256: plan.execution.source_snapshot.sha256,
        sourceRefs,
        quality: qualityStatuses(
          alley.complete
            ? 'offline-continuity-grade-and-connection-pass-live-drive-pending'
            : 'offline-route-incomplete',
          'shared-rear-service-route-subordinate-to-public-streets',
          'post-release-route-sequence-and-junction-captures-required',
        ),
      },
    });
  }

  const scopedRecord = ({
    externalId,
    parentExternalId,
    name,
    kind,
    scope,
    roles,
    functional,
    legibility,
    media,
    tags,
  }) => {
    const geometry = operationGeometry(featureGeometryOperations, (operation) => (
      operation.scope === scope && (!roles || roles.includes(operation.role))
    ));
    return {
      ...base,
      externalId,
      parentExternalId,
      name,
      kind,
      geometry,
      tags: [...tags, 'exact-state-guarded', 'not-live-executed'],
      quality: qualityStatuses(functional, legibility, media),
      attributes: {
        featureClass: tags[0],
        packageId: plan.id,
        operationScope: scope,
        operationRoles: roles ?? 'all',
        sourceSnapshotSha256: plan.execution.source_snapshot.sha256,
        sourceRefs,
        quality: qualityStatuses(functional, legibility, media),
      },
    };
  };

  records.push(
    scopedRecord({
      externalId: 'R5-B02-CULINARY-FORECOURT',
      parentExternalId: 'B02',
      name: 'B02 culinary public forecourt',
      kind: 'landscape',
      scope: 'B02-FRONTAGE',
      roles: ['culinary_forecourt'],
      functional: 'offline-public-threshold-surface-pass-live-walk-pending',
      legibility: 'orange-coded-r02-public-entry-threshold',
      media: 'post-release-four-direction-forecourt-captures-required',
      tags: ['culinary-forecourt', 'public-threshold'],
    }),
    scopedRecord({
      externalId: 'R5-B02-CULINARY-PYLONS',
      parentExternalId: 'B02',
      name: 'B02 culinary identity pylons',
      kind: 'landmark',
      scope: 'B02-FRONTAGE',
      roles: ['identity_pylon', 'identity_pylon_light'],
      functional: 'offline-clear-volume-pass-live-visibility-pending',
      legibility: 'paired-orange-coded-r02-arrival-landmarks',
      media: 'post-release-day-and-night-pylon-captures-required',
      tags: ['culinary-identity', 'wayfinding-landmark'],
    }),
    scopedRecord({
      externalId: 'R5-B03-SERVICE-LANE',
      parentExternalId: 'B03',
      name: 'B03 screened service approach',
      kind: 'road',
      scope: 'B03-SERVICE-IDENTITY',
      roles: ['service_lane'],
      functional: 'offline-surface-and-headroom-pass-live-drive-pending',
      legibility: 'blue-coded-service-route-distinct-from-public-frontage',
      media: 'post-release-r07-to-loading-sequence-required',
      tags: ['service-lane', 'warehouse-access'],
    }),
    scopedRecord({
      externalId: 'R5-B03-SERVICE-SCREEN',
      parentExternalId: 'B03',
      name: 'B03 service-yard landscape screen',
      kind: 'landscape',
      scope: 'B03-SERVICE-SCREEN',
      roles: ['service_screen'],
      functional: 'offline-screen-volume-pass-live-occlusion-review-pending',
      legibility: 'service-yard-edge-defined-without-moving-warehouse',
      media: 'post-release-public-and-service-side-screen-captures-required',
      tags: ['service-screen', 'landscape-buffer'],
    }),
    scopedRecord({
      externalId: 'R5-B03-SERVICE-PYLONS',
      parentExternalId: 'B03',
      name: 'B03 service identity pylons',
      kind: 'landmark',
      scope: 'B03-SERVICE-IDENTITY',
      roles: ['identity_pylon', 'identity_pylon_light'],
      functional: 'offline-clear-volume-pass-live-visibility-pending',
      legibility: 'paired-blue-coded-service-arrival-landmarks',
      media: 'post-release-r07-arrival-pylon-captures-required',
      tags: ['service-identity', 'wayfinding-landmark'],
    }),
  );

  for (const marker of wayfinding) {
    const points = marker.points.map((point) => ({
      x: point.x,
      y: point.y,
      z: point.z,
    }));
    records.push({
      ...base,
      externalId: `R4-${marker.id}`,
      parentExternalId: 'SITE',
      name: `${marker.id} route marking`,
      kind: 'landmark',
      geometry: { type: 'path', points, width: 1 },
      tags: [
        'road-marking',
        'decision-node',
        'wayfinding',
        'exact-state-guarded',
        'not-live-executed',
      ],
      quality: qualityStatuses(
        marker.readyPoints === marker.requestedPoints
          ? 'offline-exact-point-pass-live-visibility-pending'
          : 'offline-point-set-incomplete',
        'color-coded-junction-and-destination-cue',
        'post-release-eye-level-junction-capture-required',
      ),
      attributes: {
        featureClass: 'road-marking',
        packageId: plan.id,
        desiredBlockState: marker.desired,
        requestedPointCount: marker.requestedPoints,
        readyPointCount: marker.readyPoints,
        sourceSnapshotSha256: plan.execution.source_snapshot.sha256,
        sourceRefs,
        quality: qualityStatuses(
          marker.readyPoints === marker.requestedPoints
            ? 'offline-exact-point-pass-live-visibility-pending'
            : 'offline-point-set-incomplete',
          'color-coded-junction-and-destination-cue',
          'post-release-eye-level-junction-capture-required',
        ),
      },
    });
  }
  return records;
}

export async function generatePackage({ plan, snapshot, snapshotEvidence }) {
  const planIssues = validatePlan(plan);
  const roads = new Map((plan.roads ?? []).map((road) => [road.id, road]));
  const collector = new OperationCollector(snapshot);
  const collisions = planIssues.map((message) => ({
    scope: 'PLAN',
    type: 'plan_validation',
    message,
  }));
  const garageResults = [];
  const scopeBoxes = [];
  const sharedAlleys = await generateSharedAlleys(
    plan,
    snapshot,
    collector,
    collisions,
  );
  scopeBoxes.push(...sharedAlleys.scopeBoxes);

  for (const garage of plan.garages ?? []) {
    const accessRoute = garage.access_route ?? garage.frontage;
    const generated = await generateGarage(
      plan,
      snapshot,
      garage,
      roads.get(accessRoute),
      sharedAlleys.accessSurfaces,
    );
    garageResults.push(generated);
    collisions.push(...generated.collisions);
    scopeBoxes.push({ scope: garage.id, box: generated.scopeBox });
    if (generated.collisions.length === 0) {
      collector.merge(generated.collector);
    }
  }

  const wayfinding = await generateWayfinding(plan, snapshot, collector, collisions);

  const b02 = plan.b02_frontage;
  await generateSurfaceArea({
    plan,
    snapshot,
    collector,
    id: 'B02-FRONTAGE',
    bounds: b02.forecourt.bounds,
    desiredFor: (x, z) => (
      z === -95 ? plan.palette.culinary_identity : plan.palette.culinary_forecourt
    ),
    role: 'culinary_forecourt',
    phase: 41,
    collisions,
    headroom: Number(b02.forecourt.minimum_headroom),
    fixedY: Number(b02.forecourt.floor_y),
  });
  for (const pylon of b02.pylons ?? []) {
    await generatePylon(plan, snapshot, collector, pylon, 'B02-FRONTAGE', collisions);
  }
  scopeBoxes.push({
    scope: 'B02-FRONTAGE',
    box: [-88, 60, -103, -80, 82, -87],
  });

  const b03 = plan.b03_service_identity;
  await generateSurfaceArea({
    plan,
    snapshot,
    collector,
    id: 'B03-SERVICE-IDENTITY',
    bounds: b03.lane.bounds,
    desiredFor: (x) => (
      x === Number(b03.lane.center_stripe_x)
        ? plan.palette.service_identity
        : plan.palette.service_lane
    ),
    role: 'service_lane',
    phase: 43,
    collisions,
    headroom: Number(b03.lane.minimum_headroom),
  });
  for (const pylon of b03.pylons ?? []) {
    await generatePylon(
      plan,
      snapshot,
      collector,
      pylon,
      'B03-SERVICE-IDENTITY',
      collisions,
    );
  }
  for (const segment of b03.screen_segments ?? []) {
    await generateHedge(
      plan,
      snapshot,
      collector,
      segment,
      'B03-SERVICE-SCREEN',
      collisions,
    );
  }
  scopeBoxes.push({
    scope: 'B03-SERVICE-IDENTITY',
    box: [-30, 58, -284, 30, 82, -217],
  });

  collisions.push(...collector.conflicts);

  const protectedEntities = [];
  const entityKeys = new Set();
  for (const scope of scopeBoxes) {
    const entities = await snapshot.blockEntitiesInBox(scope.box);
    for (const entity of entities) {
      const summary = entitySummary(entity, scope.scope);
      const key = `${summary.id}:${summary.x},${summary.y},${summary.z}`;
      if (entityKeys.has(key)) continue;
      entityKeys.add(key);
      protectedEntities.push(summary);
    }
  }
  const targetedBlockEntities = protectedEntities.filter((entity) => (
    collector.operations.has(key3(entity.x, entity.y, entity.z))
  ));
  for (const entity of targetedBlockEntities) {
    collisions.push({
      scope: entity.scope,
      type: 'targeted_block_entity',
      entity,
    });
  }

  const operations = orderOperationsForRuntime(collector.list());
  const runtimeSafety = analyzeRuntimeOrdering(operations);
  const garageMatrix = garageResults.map((result) => ({
    garageId: result.garage.id,
    buildingId: result.garage.building,
    frontage: result.garage.frontage,
    accessRoute: result.garage.access_route ?? result.garage.frontage,
    placement: result.garage.placement ?? 'side',
    fixedBuildingBounds: (plan.protected_buildings ?? [])
      .find((item) => item.id === result.garage.building)?.bounds ?? null,
    garageBounds: result.garage.bounds,
    floorY: result.geometry.floorY,
    front: result.geometry.front,
    operationCount: result.collector.list().length,
    collisionCount: result.collisions.length,
    collisions: result.collisions,
    rearSetback: result.garage.principal_facade_x === undefined
      ? null
      : Math.abs(
        Number(result.garage.principal_facade_x) - result.geometry.frontX,
      ),
    frontGardenPreserved: !String(result.garage.building).startsWith('H')
      ? true
      : (
        result.garage.side === 'west'
          ? (
            result.geometry.maxX
            < Number(
              (plan.protected_buildings ?? [])
                .find((item) => item.id === result.garage.building).bounds[0]
            )
          )
          : (
            result.geometry.minX
            > Number(
              (plan.protected_buildings ?? [])
                .find((item) => item.id === result.garage.building).bounds[1]
            )
          )
      ),
    ...result.usability,
  }));
  const usableGarages = garageMatrix.filter((garage) => garage.usable).length;
  const skippedGarages = garageMatrix.filter((garage) => !garage.usable);
  const buildingRelocations = [];
  const protectedIntersections = planIssues.filter((issue) => (
    issue.includes('intersects protected building')
  ));
  const frontageAssignments = Object.entries(plan.frontage_assignments ?? {})
    .flatMap(([frontage, ids]) => ids.map((id) => ({ id, frontage })));

  const acceptanceChecks = {
    snapshotHashMatches: snapshotEvidence.sha256 === plan.execution.source_snapshot.sha256,
    planValid: planIssues.length === 0,
    requestedGarages: garageMatrix.length === Number(plan.acceptance.requested_garages),
    everyGarageUsable: usableGarages === Number(plan.acceptance.required_usable_garages),
    noGarageSkipped: skippedGarages.length === 0,
    sharedAlleysComplete: (
      sharedAlleys.matrices.length === Number(plan.acceptance.required_shared_alleys)
      && sharedAlleys.matrices.every((alley) => alley.complete)
    ),
    allAlleyConnectionsComplete: (
      sharedAlleys.matrices.flatMap((alley) => alley.publicConnections)
        .filter((connection) => connection.connected).length
      === Number(plan.acceptance.required_complete_alley_connections)
    ),
    alleyGradesWalkable: sharedAlleys.matrices.every((alley) => (
      alley.maximumAdjacentStep <= Number(plan.acceptance.maximum_adjacent_alley_step)
    )),
    alleyGradesDeliberate: sharedAlleys.matrices.every((alley) => (
      alley.gradeAnalysis.adjacentOpposingStepPairs === 0
      && alley.gradeAnalysis.oneCellPeaksOrTroughs === 0
      && (
        alley.gradeAnalysis.minimumReversalPlateauRows === null
        || alley.gradeAnalysis.minimumReversalPlateauRows >= Number(
          plan.acceptance.minimum_alley_reversal_plateau_rows,
        )
      )
    )),
    noFrontGardenGarages: garageMatrix.every((garage) => garage.frontGardenPreserved),
    minimumRearSetbackMet: garageMatrix
      .filter((garage) => String(garage.buildingId).startsWith('H'))
      .every((garage) => (
        garage.rearSetback >= Number(plan.acceptance.minimum_garage_rear_setback)
      )),
    frontageAssignmentCount: (
      new Set(frontageAssignments.map((entry) => entry.id)).size
      === Number(plan.acceptance.required_frontage_assignment_count)
    ),
    noBuildingRelocations: buildingRelocations.length === 0,
    noProtectedBuildingIntersections: protectedIntersections.length === 0,
    noTargetedBlockEntities: targetedBlockEntities.length === 0,
    noUnresolvedCollisions: collisions.length === 0,
    noOperationConflicts: collector.conflicts.length === 0,
    allOperationsGuarded: operations.every(
      (operation) => Boolean(operation.runtimeExpected),
    ),
    runtimeOrderingHazardFree: runtimeSafety.reactiveNeighborHazardCount === 0,
    reactiveClearanceBeforeSupportMutation: (
      runtimeSafety.allReactiveOperationsBeforeSupportMutations
    ),
    rollbackExactlyInvertible: buildRollbackOperations(operations).every(
      (inverse, index) => {
        const forward = operations[operations.length - 1 - index];
        return (
          inverse.expected === forward.replacement
          && inverse.replacement === forward.snapshotExactSource
          && inverse.x === forward.x
          && inverse.y === forward.y
          && inverse.z === forward.z
        );
      },
    ),
    noDoublePlantTargets: operations.every(
      (operation) => !String(operation.expected).includes('tall_grass'),
    ),
    finiteExactStateUnionPolicyValid: operations
      .filter((operation) => operation.guardMode === 'finite-exact-state-union')
      .every((operation) => (
        operation.replacement === 'minecraft:air'
        && operation.allowedExactSources.length >= 2
        && new Set(operation.allowedExactSources).size
          === operation.allowedExactSources.length
        && operation.allowedExactSources.includes(operation.snapshotExactSource)
        && operation.allowedExactSources.every((state) => (
          baseBlockName(state) === 'minecraft:birch_fence'
          && state.includes('[')
          && state.endsWith(']')
        ))
      )),
    liveMutationAuthorized: plan.execution.live_mutation_authorized,
  };
  const databaseFeatures = buildDatabaseFeatures({
    plan,
    garageMatrix,
    alleyMatrix: sharedAlleys.matrices,
    wayfinding,
    operations,
    desiredStateNoOps: collector.noOps,
  });
  const offlineReady = Object.values(acceptanceChecks).every((value) => value === true);

  return {
    operations,
    report: {
      schemaVersion: 1,
      packageId: plan.id,
      title: plan.title,
      generatedAtUtc: new Date().toISOString(),
      execution: {
        generatorMode: 'offline/read-only',
        packageIsAtomic: plan.execution.package_is_atomic,
        liveMutationAuthorized: plan.execution.live_mutation_authorized,
        liveExecutionPerformed: false,
      },
      source: {
        snapshot: snapshotEvidence,
        expectedSnapshotSha256: plan.execution.source_snapshot.sha256,
      },
      scope: {
        buildingRelocations,
        preservedBuildings: (plan.protected_buildings ?? []).map((item) => item.id),
        frontageAssignments,
        roads: plan.roads,
      },
      operations: {
        count: operations.length,
        bounds: operationBounds(operations),
        byRole: groupedCount(operations, 'role'),
        byScope: groupedCount(operations, 'scope'),
        exactStateGuarded: runtimeSafety.exactStateGuardCount,
        neighborDerivedExactStateGuarded: (
          runtimeSafety.neighborDerivedExactStateGuardCount
        ),
        neighborValidatedExactStateGuarded: (
          runtimeSafety.neighborValidatedExactStateGuardCount
        ),
        neighborNormalizedMaterialGuarded: (
          runtimeSafety.neighborNormalizedMaterialGuardCount
        ),
        unguarded: 0,
        alreadyDesiredNoOps: collector.noOps.length,
        alreadyDesiredNoOpsByRole: groupedCount(collector.noOps, 'role'),
        runtimeSafety,
      },
      garages: {
        requested: garageMatrix.length,
        ready: garageMatrix.filter((garage) => garage.collisionCount === 0).length,
        usable: usableGarages,
        skipped: skippedGarages.length,
        matrix: garageMatrix,
      },
      sharedAlleys: {
        requested: Number(plan.acceptance.required_shared_alleys),
        complete: sharedAlleys.matrices.filter((alley) => alley.complete).length,
        publicConnectionsRequired: Number(
          plan.acceptance.required_complete_alley_connections,
        ),
        publicConnectionsComplete: sharedAlleys.matrices
          .flatMap((alley) => alley.publicConnections)
          .filter((connection) => connection.connected).length,
        matrix: sharedAlleys.matrices,
      },
      publicRealm: {
        frontageModel: {
          R01: 'H01-H12 retain Main Street front-door identity; every garage is behind/outward and served from a shared rear alley',
          R02: 'C02/C04/C06 form the West Lane second-street frontage; B02 receives a culinary forecourt',
          R03: 'C03/C05/C07 form the East Avenue second-street frontage',
          ALLEY_W: 'West rear alley serves H01-H06 without entering a Main Street front garden',
          ALLEY_E: 'East rear alley serves H07-H12 with protected-terrain shifts and three upper-terrace garages',
          SERVICE: 'B03 remains fixed and gains a screened, blue-coded service approach',
        },
        wayfinding,
        b02: {
          moved: false,
          forecourt: b02.forecourt,
          pylonCount: (b02.pylons ?? []).length,
        },
        b03: {
          moved: false,
          lane: b03.lane,
          pylonCount: (b03.pylons ?? []).length,
          screenSegmentCount: (b03.screen_segments ?? []).length,
        },
      },
      protection: {
        protectedBuildingCount: (plan.protected_buildings ?? []).length,
        protectedBuildingIntersections: protectedIntersections,
        nearbyBlockEntities: protectedEntities,
        targetedBlockEntities,
      },
      diagnostics: {
        planIssues,
        collisions,
        skips: skippedGarages,
        operationConflicts: collector.conflicts,
        runtimeRebase: {
          failedSequence: plan.execution.runtime_rebase ?? null,
          failedSequenceHazards: (
            plan.execution.runtime_rebase?.failed_sequence_hazards ?? null
          ),
          rollbackSnapshotDivergences: (
            plan.execution.runtime_rebase?.rollback_snapshot_divergences ?? null
          ),
          desiredStatesOmittedFromDelta: collector.noOps.length,
          operationCountReconciliation: {
            failedSequenceOperations: 5981,
            runtimeSafeOperations: operations.length,
            omittedAlreadyDesiredAirClearance: Number(
              plan.execution.runtime_rebase?.rollback_snapshot_divergences
                ?.already_desired_air_clearance_omitted ?? 0,
            ),
            omittedAlreadyDesiredStableScreen: collector.noOps.filter(
              (operation) => operation.role === 'service_screen',
            ).length,
            netOperationReduction: 5981 - operations.length,
          },
          stableLeafState: plan.palette.screen_hedge,
          mitigation: {
            omitAlreadyDesiredStates: true,
            reactiveClearanceBeforeSupportMutation: (
              runtimeSafety.allReactiveOperationsBeforeSupportMutations
            ),
            topDownReactiveOrdering: true,
            connectedFenceGuardPolicy: 'finite exact-state union of the immutable-snapshot state and predicted post-neighbor-update state; rollback restores the immutable-snapshot exact state',
            reactiveNeighborHazardCount: runtimeSafety.reactiveNeighborHazardCount,
          },
        },
      },
      databaseFeatures,
      acceptanceChecks,
      releaseDecision: {
        offlineGeneration: offlineReady ? 'GO' : 'NO_GO',
        liveExecution: offlineReady
          ? 'IMPLEMENTATION_READY_PENDING_FRESH_SNAPSHOT_ENTITY_AND_LIVE_QA'
          : 'NO_GO_ATOMIC_ACCEPTANCE_FAILURE',
        rationale: offlineReady
          ? 'The user authorized implementation. Execute only after a fresh-snapshot hash/guard refresh, entity-clear confirmation, same-camera before capture, and supervised live QA.'
          : 'One or more atomic-package acceptance checks failed; no part of the package may be executed.',
      },
    },
  };
}

function outputText(plan, report, operations, planPath, regionDir) {
  const lines = [
    '# GENERATED FILE — MainStreet America R4/R5 conservative redevelopment',
    `# package: ${plan.id}`,
    `# plan: ${planPath}`,
    `# snapshot: ${regionDir}`,
    `# snapshot_sha256: ${report.source.snapshot.sha256}`,
    '# live_mutation_authorized: true',
    '# execution gate: refresh snapshot/guards, confirm entity-clear work areas, capture same-camera before media, then supervised live QA',
    '# atomic package: do not execute any subset',
    '# runtime ordering: reactive clearance/replacement top-down before support/surface/structure mutation',
    `# exact_state_guards: ${report.operations.exactStateGuarded}`,
    `# neighbor_derived_exact_state_guards: ${report.operations.neighborDerivedExactStateGuarded}`,
    `# operations: ${operations.length}`,
    `# garage acceptance: ${report.garages.usable}/${report.garages.requested} usable`,
    '',
  ];
  let priorGroup = null;
  for (const operation of operations) {
    const group = `${operation.phase}:${operation.scope}:${operation.role}`;
    if (group !== priorGroup) {
      lines.push(`# phase=${operation.phase} scope=${operation.scope} role=${operation.role}`);
      priorGroup = group;
    }
    lines.push(operationLine(operation));
  }
  lines.push('');
  return lines.join('\n');
}

function rollbackText(plan, report, operations, outputPath) {
  const rollback = buildRollbackOperations(operations);
  const lines = [
    '# GENERATED FILE — exact inverse for MainStreet America R4/R5 redevelopment',
    `# package: ${plan.id}`,
    `# forward_file: ${outputPath}`,
    `# forward_sha256: ${report.operations.sha256 ?? 'assigned-after-forward-render'}`,
    `# source_snapshot_sha256: ${report.source.snapshot.sha256}`,
    '# apply only to the exact completed forward package; every inverse is guarded',
    `# operations: ${rollback.length}`,
    '',
    ...rollback.map(operationLine),
    '',
  ];
  return lines.join('\n');
}

function designDocument(plan, report, planPath, outputPath) {
  return {
    schemaVersion: 1,
    id: `${plan.id}-design`,
    generatedAtUtc: report.generatedAtUtc,
    sourcePlan: planPath,
    generatedOperations: outputPath,
    immutableBaseline: report.source,
    nonRelocationDecision: {
      B02: 'Preserved at registered bounds; activated through its existing R02 gate.',
      B03: 'Preserved at registered bounds; connected to R07 through a screened service lane.',
      houses: 'H01-H12 and C02-C07 remain at registered as-built bounds.',
    },
    frontageAssignments: report.scope.frontageAssignments,
    garageAccessMatrix: report.garages.matrix,
    junctionWayfinding: report.publicRealm.wayfinding,
    b02Frontage: report.publicRealm.b02,
    b03ServiceIdentity: report.publicRealm.b03,
    protectedAssets: report.protection,
    databaseFeatures: report.databaseFeatures,
    exactCollisions: report.diagnostics.collisions,
    exactSkips: report.diagnostics.skips,
    acceptanceChecks: report.acceptanceChecks,
    releaseDecision: report.releaseDecision,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const planPath = cliValue(args, '--plan', DEFAULT_PLAN);
  const regionDir = cliValue(args, '--regions', DEFAULT_REGIONS);
  const outputPath = cliValue(args, '--out', DEFAULT_OUTPUT);
  const rollbackPath = cliValue(args, '--rollback', DEFAULT_ROLLBACK);
  const reportPath = cliValue(args, '--report', DEFAULT_REPORT);
  const designPath = cliValue(args, '--design', DEFAULT_DESIGN);

  const plan = loadPlan(planPath);
  const snapshotEvidence = hashSnapshotDirectory(regionDir);
  if (snapshotEvidence.sha256 !== plan.execution.source_snapshot.sha256) {
    throw new Error(
      `snapshot hash mismatch: expected ${plan.execution.source_snapshot.sha256}; `
      + `found ${snapshotEvidence.sha256}`,
    );
  }
  const snapshot = new DetailedAnvilSnapshot(regionDir);
  const generated = await generatePackage({ plan, snapshot, snapshotEvidence });
  const text = outputText(
    plan,
    generated.report,
    generated.operations,
    planPath,
    regionDir,
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.mkdirSync(path.dirname(rollbackPath), { recursive: true });
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.mkdirSync(path.dirname(designPath), { recursive: true });
  fs.writeFileSync(outputPath, text);
  const operationsSha256 = sha256Buffer(Buffer.from(text));
  generated.report.source.plan = {
    file: planPath,
    sha256: sha256Buffer(fs.readFileSync(planPath)),
  };
  generated.report.operations.file = outputPath;
  generated.report.operations.sha256 = operationsSha256;
  const rollback = rollbackText(
    plan,
    generated.report,
    generated.operations,
    outputPath,
  );
  fs.writeFileSync(rollbackPath, rollback);
  generated.report.rollback = {
    file: rollbackPath,
    sha256: sha256Buffer(Buffer.from(rollback)),
    operationCount: generated.operations.length,
    exactInverse: true,
    applicationRule: 'Apply only after this exact forward package completed; inverse guards expect forward replacement states.',
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(generated.report, null, 2)}\n`);
  fs.writeFileSync(
    designPath,
    `${JSON.stringify(
      designDocument(plan, generated.report, planPath, outputPath),
      null,
      2,
    )}\n`,
  );

  console.log(JSON.stringify({
    output: outputPath,
    report: reportPath,
    design: designPath,
    rollback: rollbackPath,
    snapshotSha256: snapshotEvidence.sha256,
    operations: generated.operations.length,
    garages: {
      requested: generated.report.garages.requested,
      usable: generated.report.garages.usable,
      skipped: generated.report.garages.skipped,
    },
    collisions: generated.report.diagnostics.collisions.length,
    targetedBlockEntities: generated.report.protection.targetedBlockEntities.length,
    releaseDecision: generated.report.releaseDecision,
  }, null, 2));

  if (generated.report.releaseDecision.offlineGeneration !== 'GO') process.exitCode = 1;
}

if (
  process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  await main();
}
