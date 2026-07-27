#!/usr/bin/env node
/**
 * Generate collision-safe, terrain-following RCON ops for the MainStreet
 * America campus fence.
 *
 * This script reads a LOCAL Anvil snapshot. It never connects to Minecraft and
 * never executes an operation. Every emitted REPL operation is guarded by the
 * exact block material observed in the snapshot, so a changed or occupied
 * target becomes a no-op instead of being overwritten.
 *
 * Usage:
 *   node scripts/generate_picket_fence.mjs \
 *     --mode pilot \
 *     --out data/buildops/msa_picket_fence_pilot.txt \
 *     --report data/buildops/msa_picket_fence_pilot.report.json
 *
 *   node scripts/generate_picket_fence.mjs \
 *     --mode full \
 *     --out data/buildops/msa_picket_fence_full.txt \
 *     --report data/buildops/msa_picket_fence_full.report.json
 *
 * Generated files are inputs for:
 *   python3 scripts/rcon_runner.py <file> --dry-run
 *
 * Do not omit the report review or execute a generated file against a world
 * newer than its source snapshot.
 */

import fs from 'fs';
import path from 'path';
import process from 'process';
import zlib from 'zlib';
import { pathToFileURL } from 'url';

import yaml from 'js-yaml';
import nbt from 'prismarine-nbt';

const DEFAULT_PLAN = 'mainstreet-america/planning/picket-fence.yaml';
const DEFAULT_REGIONS = 'data/worldsnap/region';
const PILOT_RANGE = Object.freeze({
  side: 'south',
  axis: 'x',
  min: 20,
  max: 51,
});

const AIR_BLOCKS = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
  'minecraft:light',
]);

const REPLACEABLE_BLOCKS = new Set([
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
  'minecraft:small_dripleaf',
  'minecraft:big_dripleaf_stem',
  'minecraft:seagrass',
  'minecraft:tall_seagrass',
  'minecraft:kelp',
  'minecraft:kelp_plant',
  'minecraft:lily_pad',
  'minecraft:sea_pickle',
  'minecraft:moss_carpet',
  'minecraft:pale_moss_carpet',
  'minecraft:pale_hanging_moss',
  'minecraft:pink_petals',
  'minecraft:wildflowers',
  'minecraft:torchflower',
  'minecraft:torchflower_crop',
  'minecraft:pitcher_crop',
  'minecraft:pitcher_plant',
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

const SIDE_ORDER = new Map([
  ['north', 0],
  ['east', 1],
  ['south', 2],
  ['west', 3],
]);

const MAX_OUTWARD_JOG = 4;

function namespaced(block) {
  if (block.includes(':')) return block;
  return `minecraft:${block}`;
}

function baseBlockName(block) {
  return block.split('[', 1)[0];
}

export function isAirBlock(block) {
  return AIR_BLOCKS.has(baseBlockName(block));
}

export function isFoliageBlock(block) {
  const name = baseBlockName(block);
  return /(_leaves|_log|_wood|_stem|_hyphae)$/.test(name)
    || name === 'minecraft:mangrove_roots'
    || name === 'minecraft:muddy_mangrove_roots'
    || name === 'minecraft:bamboo'
    || name === 'minecraft:cocoa';
}

export function isReplaceableBlock(block) {
  const name = baseBlockName(block);
  if (AIR_BLOCKS.has(name) || REPLACEABLE_BLOCKS.has(name)) return true;
  const bare = name.replace(/^minecraft:/, '');
  return FLOWERS.has(bare)
    || bare.endsWith('_sapling')
    || bare.endsWith('_propagule');
}

function isWater(block) {
  const name = baseBlockName(block);
  return name === 'minecraft:water' || name === 'minecraft:bubble_column';
}

function isLava(block) {
  return baseBlockName(block) === 'minecraft:lava';
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

export class AnvilSnapshot {
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
    return { cx, cz, sections };
  }

  blockName(chunk, x, y, z) {
    if (!chunk) return null;
    const states = chunk.sections.get(Math.floor(y / 16));
    if (!states?.palette?.length) return 'minecraft:air';

    const palette = states.palette;
    if (palette.length === 1) return palette[0].Name;
    const bits = Math.max(4, 32 - Math.clz32(palette.length - 1));
    const perLong = Math.floor(64 / bits);
    const index = ((y & 15) << 8) | ((z & 15) << 4) | (x & 15);
    const longIndex = Math.floor(index / perLong);
    const data = states.data ?? [];
    if (longIndex >= data.length) return 'minecraft:air';
    const shift = BigInt((index % perLong) * bits);
    const mask = (1n << BigInt(bits)) - 1n;
    const paletteIndex = Number((longToBig(data[longIndex]) >> shift) & mask);
    return palette[paletteIndex]?.Name ?? 'minecraft:air';
  }

  async readColumn(x, z, yMin, yMax) {
    const chunk = await this.readChunk(Math.floor(x / 16), Math.floor(z / 16));
    if (!chunk) return null;
    const blocks = new Map();
    for (let y = yMin; y <= yMax; y += 1) {
      blocks.set(y, this.blockName(chunk, x, y, z));
    }
    return {
      x,
      z,
      get(y) {
        return blocks.get(y) ?? 'minecraft:air';
      },
    };
  }
}

export function loadFencePlan(planPath) {
  const plan = yaml.load(fs.readFileSync(planPath, 'utf8'));
  if (!plan || plan.id !== 'mainstreet-america-picket-fence') {
    throw new Error(`unexpected or missing fence plan id in ${planPath}`);
  }
  if (typeof plan.execution?.live_mutation_authorized !== 'boolean') {
    throw new Error('fence plan must declare live_mutation_authorized as a boolean');
  }
  return plan;
}

function boundaryBounds(plan) {
  const corners = plan.boundary?.corners_clockwise ?? [];
  if (corners.length !== 4) throw new Error('fence boundary must have four corners');
  const xs = corners.map((corner) => Number(corner.x));
  const zs = corners.map((corner) => Number(corner.z));
  const bounds = {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs),
  };
  if (new Set(xs).size !== 2 || new Set(zs).size !== 2) {
    throw new Error('fence boundary must be an axis-aligned rectangle');
  }
  return bounds;
}

function gateCoordinate(gate, column) {
  return gate.opening_axis === 'x' ? column.x : column.z;
}

function gateContains(gate, column) {
  if (gate.side !== column.side) return false;
  const fixedAxis = gate.side === 'north' || gate.side === 'south' ? 'z' : 'x';
  if (column[fixedAxis] !== Number(gate.fixed_coordinate[fixedAxis])) return false;
  const value = gateCoordinate(gate, column);
  return value >= Number(gate.opening_min) && value <= Number(gate.opening_max);
}

export function buildPerimeterColumns(plan, mode = 'full') {
  const bounds = boundaryBounds(plan);
  const columns = [];
  let perimeterIndex = 0;
  const add = (x, z, side) => {
    columns.push({ x, z, side, perimeterIndex });
    perimeterIndex += 1;
  };

  for (let x = bounds.minX; x <= bounds.maxX; x += 1) add(x, bounds.minZ, 'north');
  for (let z = bounds.minZ + 1; z <= bounds.maxZ; z += 1) add(bounds.maxX, z, 'east');
  for (let x = bounds.maxX - 1; x >= bounds.minX; x -= 1) add(x, bounds.maxZ, 'south');
  for (let z = bounds.maxZ - 1; z > bounds.minZ; z -= 1) add(bounds.minX, z, 'west');

  const seen = new Set();
  for (const column of columns) {
    const key = `${column.x},${column.z}`;
    if (seen.has(key)) throw new Error(`duplicate perimeter column ${key}`);
    seen.add(key);
    column.gate = (plan.gates ?? []).find((gate) => gateContains(gate, column))?.id ?? null;
  }

  if (columns.length !== Number(plan.boundary.gross_columns_including_corners_once)) {
    throw new Error(
      `perimeter has ${columns.length} columns; plan declares `
      + `${plan.boundary.gross_columns_including_corners_once}`,
    );
  }

  if (mode === 'pilot') {
    return columns.filter((column) => (
      column.side === PILOT_RANGE.side
      && column[PILOT_RANGE.axis] >= PILOT_RANGE.min
      && column[PILOT_RANGE.axis] <= PILOT_RANGE.max
    ));
  }
  if (mode !== 'full') throw new Error(`unsupported generation mode "${mode}"`);
  return columns;
}

function keyOf(x, y, z) {
  return `${x},${y},${z}`;
}

function columnKey(column) {
  return `${column.x},${column.z}`;
}

function gatePierKeys(plan) {
  const keys = new Map();
  for (const gate of plan.gates ?? []) {
    const fixedAxis = gate.side === 'north' || gate.side === 'south' ? 'z' : 'x';
    const movingAxis = gate.opening_axis;
    const fixed = Number(gate.fixed_coordinate[fixedAxis]);
    for (const value of [Number(gate.opening_min) - 1, Number(gate.opening_max) + 1]) {
      const x = movingAxis === 'x' ? value : fixed;
      const z = movingAxis === 'z' ? value : fixed;
      keys.set(`${x},${z}`, gate.id);
    }
  }
  return keys;
}

function cornerKeys(plan) {
  return new Set(
    plan.boundary.corners_clockwise.map((corner) => `${Number(corner.x)},${Number(corner.z)}`),
  );
}

function columnKind(column, plan, corners, piers) {
  const key = columnKey(column);
  if (corners.has(key)) return { kind: 'corner', gateId: null };
  if (piers.has(key)) return { kind: 'gate_pier', gateId: piers.get(key) };
  if (column.perimeterIndex % Number(plan.appearance.posts.spacing) === 0) {
    return { kind: 'post', gateId: null };
  }
  return { kind: 'field', gateId: null };
}

function isPlannedFenceAssemblyBlock(block, plan) {
  const name = baseBlockName(block);
  return new Set([
    namespaced(plan.appearance.field.block),
    namespaced(plan.appearance.posts.block),
    namespaced(plan.appearance.posts.cap),
    namespaced(plan.appearance.corner_posts.block),
    namespaced(plan.appearance.corner_posts.cap),
    namespaced(plan.appearance.gate_piers.block),
    namespaced(plan.appearance.gate_piers.cap),
    namespaced(plan.appearance.gate_piers.light),
  ]).has(name);
}

export function findSafeSupport(column, yMin, yMax, ignoredBlock = () => false) {
  const ignoredFoliage = [];
  const ignoredReplaceable = [];
  const ignoredPlanned = [];
  for (let y = yMax; y >= yMin; y -= 1) {
    const block = baseBlockName(column.get(y));
    if (isAirBlock(block)) continue;
    if (ignoredBlock(block)) {
      ignoredPlanned.push({ y, block });
      continue;
    }
    if (isFoliageBlock(block)) {
      ignoredFoliage.push({ y, block });
      continue;
    }
    if (isReplaceableBlock(block)) {
      ignoredReplaceable.push({ y, block });
      continue;
    }
    return {
      y,
      block,
      kind: isWater(block) ? 'water' : isLava(block) ? 'lava' : 'land',
      ceilingHit: y === yMax,
      ignoredFoliage,
      ignoredReplaceable,
      ignoredPlanned,
    };
  }
  return {
    y: null,
    block: null,
    kind: 'missing_support',
    ceilingHit: false,
    ignoredFoliage,
    ignoredReplaceable,
    ignoredPlanned,
  };
}

function desiredForColumn(column, support, kindInfo, plan) {
  const baseY = support.y + 1;
  const desired = [];
  if (support.kind === 'water') {
    desired.push({
      x: column.x,
      y: support.y,
      z: column.z,
      block: namespaced(plan.appearance.water_plinth.block),
      role: 'water_plinth',
      phase: 0,
    });
  }

  if (kindInfo.kind === 'field' || kindInfo.kind === 'jog_connector') {
    desired.push({
      x: column.x,
      y: baseY,
      z: column.z,
      block: namespaced(plan.appearance.field.block),
      role: kindInfo.kind,
      phase: 1,
    });
    return { baseY, desired };
  }

  let block;
  let height;
  let cap;
  let light = null;
  if (kindInfo.kind === 'post') {
    block = plan.appearance.posts.block;
    height = Number(plan.appearance.posts.height);
    cap = plan.appearance.posts.cap;
  } else if (kindInfo.kind === 'corner') {
    block = plan.appearance.corner_posts.block;
    height = Number(plan.appearance.corner_posts.height);
    cap = plan.appearance.corner_posts.cap;
  } else {
    block = plan.appearance.gate_piers.block;
    height = Number(plan.appearance.gate_piers.height);
    cap = plan.appearance.gate_piers.cap;
    light = plan.appearance.gate_piers.light;
  }

  for (let dy = 0; dy < height; dy += 1) {
    desired.push({
      x: column.x,
      y: baseY + dy,
      z: column.z,
      block: namespaced(block),
      role: kindInfo.kind,
      phase: 1,
    });
  }
  desired.push({
    x: column.x,
    y: baseY + height,
    z: column.z,
    block: namespaced(cap),
    role: `${kindInfo.kind}_cap`,
    phase: 2,
  });
  if (light) {
    desired.push({
      x: column.x,
      y: baseY + height + 1,
      z: column.z,
      block: namespaced(light),
      role: 'gate_light',
      phase: 3,
    });
  }
  return { baseY, desired };
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function canReplaceTarget(existing, desired, role) {
  if (baseBlockName(existing) === baseBlockName(desired)) return 'satisfied';
  if (role === 'water_plinth') return isWater(existing) ? 'replace' : 'collision';
  return isReplaceableBlock(existing) ? 'replace' : 'collision';
}

function axisForSide(side) {
  return side === 'north' || side === 'south' ? 'x' : 'z';
}

export function mergePlacements(placements) {
  const sorted = [...placements].sort((a, b) => (
    a.phase - b.phase
    || (SIDE_ORDER.get(a.side) ?? 99) - (SIDE_ORDER.get(b.side) ?? 99)
    || a.y - b.y
    || a.block.localeCompare(b.block)
    || a.expected.localeCompare(b.expected)
    || a.role.localeCompare(b.role)
    || a.x - b.x
    || a.z - b.z
  ));
  const merged = [];

  for (const placement of sorted) {
    const axis = axisForSide(placement.side);
    const otherAxis = axis === 'x' ? 'z' : 'x';
    const previous = merged.at(-1);
    const canMerge = previous
      && previous.phase === placement.phase
      && previous.side === placement.side
      && previous.y1 === placement.y
      && previous.y2 === placement.y
      && previous.block === placement.block
      && previous.expected === placement.expected
      && previous.role === placement.role
      && previous[`${otherAxis}1`] === placement[otherAxis]
      && previous[`${otherAxis}2`] === placement[otherAxis]
      && previous[`${axis}2`] + 1 === placement[axis];

    if (canMerge) {
      previous[`${axis}2`] = placement[axis];
      continue;
    }
    merged.push({
      x1: placement.x,
      y1: placement.y,
      z1: placement.z,
      x2: placement.x,
      y2: placement.y,
      z2: placement.z,
      block: placement.block,
      expected: placement.expected,
      role: placement.role,
      phase: placement.phase,
      side: placement.side,
    });
  }
  return merged;
}

function operationLine(op) {
  return `REPL ${op.x1} ${op.y1} ${op.z1} ${op.x2} ${op.y2} ${op.z2} `
    + `${op.expected} ${op.block}`;
}

function snapshotFiles(regionDir) {
  return fs.readdirSync(regionDir)
    .filter((name) => /^r\.-?\d+\.-?\d+\.mca$/.test(name))
    .sort()
    .map((name) => {
      const stat = fs.statSync(path.join(regionDir, name));
      return {
        name,
        bytes: stat.size,
        modifiedUtc: stat.mtime.toISOString(),
      };
    });
}

async function generateBaselineFence({
  plan,
  snapshot,
  mode = 'full',
  yMin = -64,
  yMax = 200,
}) {
  const allColumns = buildPerimeterColumns(plan, mode);
  const corners = cornerKeys(plan);
  const piers = gatePierKeys(plan);
  const openColumns = allColumns.filter((column) => column.gate);
  const fenceColumns = allColumns.filter((column) => !column.gate);
  const placements = [];
  const collisions = [];
  const skippedColumns = [];
  const columnResults = [];
  const supports = [];
  const alreadySatisfied = [];
  const duplicateTargets = [];
  const desiredKeys = new Set();

  for (const column of fenceColumns) {
    const snapshotColumn = await snapshot.readColumn(column.x, column.z, yMin, yMax);
    if (!snapshotColumn) {
      skippedColumns.push({
        x: column.x,
        z: column.z,
        side: column.side,
        reason: 'missing_chunk',
      });
      continue;
    }
    const support = findSafeSupport(
      snapshotColumn,
      yMin,
      yMax,
      (block) => isPlannedFenceAssemblyBlock(block, plan),
    );
    supports.push({
      x: column.x,
      z: column.z,
      side: column.side,
      ...support,
      ignoredFoliageCount: support.ignoredFoliage.length,
      ignoredReplaceableCount: support.ignoredReplaceable.length,
      ignoredFoliage: undefined,
      ignoredReplaceable: undefined,
    });
    if (support.kind === 'missing_support' || support.kind === 'lava' || support.ceilingHit) {
      skippedColumns.push({
        x: column.x,
        z: column.z,
        side: column.side,
        reason: support.ceilingHit ? 'scan_ceiling_hit' : support.kind,
        supportY: support.y,
        supportBlock: support.block,
      });
      continue;
    }

    const kindInfo = columnKind(column, plan, corners, piers);
    const { baseY, desired } = desiredForColumn(column, support, kindInfo, plan);
    const inspected = desired.map((target) => {
      const existing = snapshotColumn.get(target.y);
      return {
        ...target,
        existing,
        disposition: canReplaceTarget(existing, target.block, target.role),
      };
    });
    const blocked = inspected.filter((target) => target.disposition === 'collision');
    if (blocked.length > 0) {
      for (const target of blocked) {
        collisions.push({
          x: target.x,
          y: target.y,
          z: target.z,
          side: column.side,
          role: target.role,
          existing: target.existing,
          desired: target.block,
          reason: isFoliageBlock(target.existing)
            ? 'foliage_collision'
            : 'non_replaceable_collision',
        });
      }
      skippedColumns.push({
        x: column.x,
        z: column.z,
        side: column.side,
        reason: 'target_collision',
        collisionCount: blocked.length,
      });
      columnResults.push({
        x: column.x,
        z: column.z,
        side: column.side,
        kind: kindInfo.kind,
        gateId: kindInfo.gateId,
        baseY,
        supportY: support.y,
        supportBlock: support.block,
        supportKind: support.kind,
        status: 'collision',
      });
      continue;
    }

    for (const target of inspected) {
      const key = keyOf(target.x, target.y, target.z);
      if (desiredKeys.has(key)) {
        duplicateTargets.push({ x: target.x, y: target.y, z: target.z });
        continue;
      }
      desiredKeys.add(key);
      if (target.disposition === 'satisfied') {
        alreadySatisfied.push({
          x: target.x,
          y: target.y,
          z: target.z,
          block: target.block,
          role: target.role,
        });
      } else {
        placements.push({
          ...target,
          expected: baseBlockName(target.existing),
          side: column.side,
        });
      }
    }
    columnResults.push({
      x: column.x,
      z: column.z,
      side: column.side,
      kind: kindInfo.kind,
      gateId: kindInfo.gateId,
      baseY,
      supportY: support.y,
      supportBlock: support.block,
      supportKind: support.kind,
      status: 'ready',
      targetBlocks: inspected.length,
    });
  }

  const gradeBreaks = [];
  for (let index = 1; index < columnResults.length; index += 1) {
    const previous = columnResults[index - 1];
    const current = columnResults[index];
    if (previous.status !== 'ready' || current.status !== 'ready') continue;
    const previousColumn = fenceColumns.find(
      (column) => column.x === previous.x && column.z === previous.z,
    );
    const currentColumn = fenceColumns.find(
      (column) => column.x === current.x && column.z === current.z,
    );
    if (!previousColumn || !currentColumn) continue;
    if (currentColumn.perimeterIndex !== previousColumn.perimeterIndex + 1) continue;
    const delta = current.baseY - previous.baseY;
    if (Math.abs(delta) > 1) {
      gradeBreaks.push({
        from: { x: previous.x, y: previous.baseY, z: previous.z },
        to: { x: current.x, y: current.baseY, z: current.z },
        delta,
      });
    }
  }

  const mergedOperations = mergePlacements(placements);
  const gateViolations = placements.filter((placement) => (
    (plan.gates ?? []).some((gate) => gateContains(gate, placement))
  ));
  const readyColumnKeys = new Set(
    columnResults.filter((result) => result.status === 'ready').map(columnKey),
  );

  return {
    mode,
    yMin,
    yMax,
    columns: allColumns,
    openColumns,
    fenceColumns,
    readyColumnKeys,
    placements,
    mergedOperations,
    collisions,
    skippedColumns,
    alreadySatisfied,
    duplicateTargets,
    gateViolations,
    gradeBreaks,
    supports,
    columnResults,
    stats: {
      perimeterColumnsInMode: allColumns.length,
      declaredGateOpenColumns: openColumns.length,
      requestedFenceColumns: fenceColumns.length,
      readyFenceColumns: readyColumnKeys.size,
      skippedFenceColumns: new Set(skippedColumns.map(columnKey)).size,
      targetBlocks: placements.length + alreadySatisfied.length,
      placementBlocks: placements.length,
      mergedRconOperations: mergedOperations.length,
      alreadySatisfiedBlocks: alreadySatisfied.length,
      collisionBlocks: collisions.length,
      collisionColumns: new Set(collisions.map((item) => `${item.x},${item.z}`)).size,
      missingChunkColumns: skippedColumns.filter((item) => item.reason === 'missing_chunk').length,
      waterColumns: supports.filter((support) => support.kind === 'water').length,
      foliageBlocksIgnoredAsSupport: supports.reduce(
        (total, support) => total + support.ignoredFoliageCount,
        0,
      ),
      gradeBreaksOverOneBlock: gradeBreaks.length,
      duplicateTargetBlocks: duplicateTargets.length,
      gateViolationBlocks: gateViolations.length,
      placementsByBlock: countBy(placements, (item) => item.block),
      placementsByRole: countBy(placements, (item) => item.role),
      supportsByBlock: countBy(supports, (item) => item.block ?? 'none'),
      collisionsByExistingBlock: countBy(collisions, (item) => item.existing),
    },
  };
}

function outwardColumn(column, depth) {
  const moved = {
    ...column,
    originalX: column.x,
    originalZ: column.z,
    outwardDepth: depth,
  };
  if (column.side === 'north') moved.z -= depth;
  else if (column.side === 'east') moved.x += depth;
  else if (column.side === 'south') moved.z += depth;
  else if (column.side === 'west') moved.x -= depth;
  else throw new Error(`unsupported fence side "${column.side}"`);
  return moved;
}

function splitPlanningSegments(columns, mode) {
  if (mode === 'pilot') {
    return [{
      id: 'pilot-south',
      side: 'south',
      columns: columns.filter((column) => !column.gate),
      pinStart: true,
      pinEnd: true,
    }];
  }

  const segments = [];
  for (const side of SIDE_ORDER.keys()) {
    const sideColumns = columns.filter((column) => column.side === side);
    let current = [];
    const flush = () => {
      if (current.length === 0) return;
      segments.push({
        id: `${side}-${segments.length + 1}`,
        side,
        columns: current,
        pinStart: current[0] === sideColumns[0],
        pinEnd: current.at(-1) === sideColumns.at(-1),
      });
      current = [];
    };
    for (const column of sideColumns) {
      if (column.gate) flush();
      else current.push(column);
    }
    flush();
  }
  return segments;
}

function depthsBetween(from, to, includeFrom, includeTo) {
  if (from === to) return includeFrom && includeTo ? [from] : [];
  const step = to > from ? 1 : -1;
  const values = [];
  for (let depth = from; ; depth += step) {
    if ((depth !== from || includeFrom) && (depth !== to || includeTo)) values.push(depth);
    if (depth === to) break;
  }
  return values;
}

function desiredForGradeNode(node, requiredTopY, plan) {
  if (requiredTopY == null || requiredTopY <= node.baseY + 1) {
    return node.defaultDesired;
  }

  const desired = [];
  if (node.support.kind === 'water') {
    desired.push({
      x: node.x,
      y: node.support.y,
      z: node.z,
      block: namespaced(plan.appearance.water_plinth.block),
      role: 'water_plinth',
      phase: 0,
    });
  }

  const monumental = node.kindInfo.kind === 'corner' || node.kindInfo.kind === 'gate_pier';
  const block = monumental
    ? namespaced(node.kindInfo.kind === 'corner'
      ? plan.appearance.corner_posts.block
      : plan.appearance.gate_piers.block)
    : namespaced(plan.appearance.posts.block);
  const cap = monumental
    ? namespaced(node.kindInfo.kind === 'corner'
      ? plan.appearance.corner_posts.cap
      : plan.appearance.gate_piers.cap)
    : namespaced(plan.appearance.posts.cap);
  const normalHeight = node.kindInfo.kind === 'corner'
    ? Number(plan.appearance.corner_posts.height)
    : node.kindInfo.kind === 'gate_pier'
      ? Number(plan.appearance.gate_piers.height)
      : node.kindInfo.kind === 'post'
        ? Number(plan.appearance.posts.height)
        : 1;
  const height = Math.max(normalHeight, requiredTopY - node.baseY + 1);

  for (let dy = 0; dy < height; dy += 1) {
    desired.push({
      x: node.x,
      y: node.baseY + dy,
      z: node.z,
      block,
      role: 'grade_post',
      phase: 1,
    });
  }
  desired.push({
    x: node.x,
    y: node.baseY + height,
    z: node.z,
    block: cap,
    role: 'grade_post_cap',
    phase: 2,
  });
  if (node.kindInfo.kind === 'gate_pier' && plan.appearance.gate_piers.light) {
    desired.push({
      x: node.x,
      y: node.baseY + height + 1,
      z: node.z,
      block: namespaced(plan.appearance.gate_piers.light),
      role: 'gate_light',
      phase: 3,
    });
  }
  return desired;
}

function canReplacePlannedTarget(existing, desired, role, plan) {
  const disposition = canReplaceTarget(existing, desired, role);
  if (disposition !== 'collision' || role !== 'grade_post') return disposition;
  const existingName = baseBlockName(existing);
  const upgradable = new Set([
    namespaced(plan.appearance.field.block),
    namespaced(plan.appearance.posts.block),
    namespaced(plan.appearance.posts.cap),
    namespaced(plan.appearance.corner_posts.block),
    namespaced(plan.appearance.corner_posts.cap),
    namespaced(plan.appearance.gate_piers.block),
    namespaced(plan.appearance.gate_piers.cap),
  ]);
  return upgradable.has(existingName) ? 'replace' : 'collision';
}

function isTrimmableFoliage(block) {
  const name = baseBlockName(block);
  return name.endsWith('_leaves')
    || name === 'minecraft:mangrove_roots'
    || name === 'minecraft:muddy_mangrove_roots';
}

function edgeKey(first, second) {
  return first < second ? `${first}|${second}` : `${second}|${first}`;
}

function countGraphComponents(nodes, edges) {
  const adjacency = new Map([...nodes.keys()].map((key) => [key, new Set()]));
  for (const edge of edges) {
    adjacency.get(edge.a)?.add(edge.b);
    adjacency.get(edge.b)?.add(edge.a);
  }
  let components = 0;
  const visited = new Set();
  for (const start of adjacency.keys()) {
    if (visited.has(start)) continue;
    components += 1;
    const pending = [start];
    visited.add(start);
    while (pending.length > 0) {
      const current = pending.pop();
      for (const next of adjacency.get(current) ?? []) {
        if (visited.has(next)) continue;
        visited.add(next);
        pending.push(next);
      }
    }
  }
  return components;
}

function gateCorridorContains(gate, placement) {
  if (gate.side !== placement.side) return false;
  const value = gate.opening_axis === 'x' ? placement.x : placement.z;
  return value >= Number(gate.opening_min) && value <= Number(gate.opening_max);
}

export async function generateFence({
  plan,
  snapshot,
  mode = 'full',
  yMin = -64,
  yMax = 200,
}) {
  const allColumns = buildPerimeterColumns(plan, mode);
  const openColumns = allColumns.filter((column) => column.gate);
  const fenceColumns = allColumns.filter((column) => !column.gate);
  const corners = cornerKeys(plan);
  const piers = gatePierKeys(plan);
  const baseline = await generateBaselineFence({ plan, snapshot, mode, yMin, yMax });
  const supportCache = new Map();
  const candidateCache = new Map();
  const forcedBlockedCells = new Set();

  const supportAt = async (column) => {
    const key = `${column.x},${column.z}`;
    if (!supportCache.has(key)) {
      supportCache.set(key, (async () => {
        const snapshotColumn = await snapshot.readColumn(column.x, column.z, yMin, yMax);
        if (!snapshotColumn) return { snapshotColumn: null, support: null };
        return {
          snapshotColumn,
          support: findSafeSupport(
            snapshotColumn,
            yMin,
            yMax,
            (block) => isPlannedFenceAssemblyBlock(block, plan),
          ),
        };
      })());
    }
    return supportCache.get(key);
  };

  const evaluateCandidate = async (original, depth, kindInfo, isPrimary) => {
    const moved = outwardColumn(original, depth);
    const cacheKey = `${moved.x},${moved.z}:${kindInfo.kind}`;
    if (!candidateCache.has(cacheKey)) {
      candidateCache.set(cacheKey, (async () => {
        const { snapshotColumn, support } = await supportAt(moved);
        if (!snapshotColumn || !support) {
          return { available: false, reason: 'missing_chunk', moved };
        }
        if (support.kind === 'missing_support' || support.kind === 'lava' || support.ceilingHit) {
          return {
            available: false,
            reason: support.ceilingHit ? 'scan_ceiling_hit' : support.kind,
            moved,
            snapshotColumn,
            support,
          };
        }
        const generated = desiredForColumn(moved, support, kindInfo, plan);
        const blocked = generated.desired
          .map((target) => ({
            ...target,
            existing: snapshotColumn.get(target.y),
          }))
          .filter((target) => (
            canReplacePlannedTarget(target.existing, target.block, target.role, plan) === 'collision'
            && !(depth > 0 && isTrimmableFoliage(target.existing))
          ));
        return {
          available: blocked.length === 0,
          reason: blocked.length > 0 ? 'target_collision' : null,
          moved,
          snapshotColumn,
          support,
          baseY: generated.baseY,
          defaultDesired: generated.desired,
          blocked,
        };
      })());
    }
    const evaluated = await candidateCache.get(cacheKey);
    return {
      ...evaluated,
      key: `${moved.x},${moved.z}`,
      x: moved.x,
      z: moved.z,
      side: original.side,
      originalX: original.x,
      originalZ: original.z,
      originalPerimeterIndex: original.perimeterIndex,
      outwardDepth: depth,
      kindInfo,
      isPrimary,
    };
  };

  const candidateIsAvailable = (candidate) => (
    candidate.available && !forcedBlockedCells.has(candidate.key)
  );

  const planSegment = async (segment) => {
    const primary = [];
    for (const column of segment.columns) {
      const kindInfo = columnKind(column, plan, corners, piers);
      const choices = [];
      for (let depth = 0; depth <= MAX_OUTWARD_JOG; depth += 1) {
        choices.push(await evaluateCandidate(column, depth, kindInfo, true));
      }
      primary.push(choices);
    }

    const edgeChoice = async (previousIndex, previousDepth, currentDepth) => {
      if (previousDepth === currentDepth) return { nodes: [], cost: 0, orientation: 'straight' };
      const previousColumn = segment.columns[previousIndex];
      const currentColumn = segment.columns[previousIndex + 1];
      const connectorInfo = { kind: 'jog_connector', gateId: null };
      const specifications = [
        {
          orientation: 'before',
          column: previousColumn,
          depths: depthsBetween(previousDepth, currentDepth, false, true),
        },
        {
          orientation: 'after',
          column: currentColumn,
          depths: [
            previousDepth,
            ...depthsBetween(previousDepth, currentDepth, false, false),
          ],
        },
      ];
      const options = [];
      for (const specification of specifications) {
        const nodes = [];
        let available = true;
        for (const depth of specification.depths) {
          const candidate = await evaluateCandidate(
            specification.column,
            depth,
            connectorInfo,
            false,
          );
          if (!candidateIsAvailable(candidate)) {
            available = false;
            break;
          }
          nodes.push(candidate);
        }
        if (available) {
          options.push({
            nodes,
            orientation: specification.orientation,
            cost: nodes.length * 4 + 5,
          });
        }
      }
      options.sort((a, b) => a.cost - b.cost || a.orientation.localeCompare(b.orientation));
      return options[0] ?? null;
    };

    const states = primary.map(() => Array(MAX_OUTWARD_JOG + 1).fill(null));
    for (let depth = 0; depth <= MAX_OUTWARD_JOG; depth += 1) {
      if (segment.pinStart && depth !== 0) continue;
      const candidate = primary[0][depth];
      if (!candidateIsAvailable(candidate)) continue;
      states[0][depth] = {
        cost: depth * 8 + (depth > 0 ? 3 : 0),
        previousDepth: null,
        edge: null,
      };
    }

    for (let index = 1; index < segment.columns.length; index += 1) {
      for (let depth = 0; depth <= MAX_OUTWARD_JOG; depth += 1) {
        if (index === segment.columns.length - 1 && segment.pinEnd && depth !== 0) continue;
        const candidate = primary[index][depth];
        if (!candidateIsAvailable(candidate)) continue;
        for (let previousDepth = 0; previousDepth <= MAX_OUTWARD_JOG; previousDepth += 1) {
          const previousState = states[index - 1][previousDepth];
          if (!previousState) continue;
          const edge = await edgeChoice(index - 1, previousDepth, depth);
          if (!edge) continue;
          const cost = previousState.cost
            + edge.cost
            + depth * 8
            + (depth > 0 ? 3 : 0);
          if (!states[index][depth] || cost < states[index][depth].cost) {
            states[index][depth] = { cost, previousDepth, edge };
          }
        }
      }
    }

    const lastIndex = segment.columns.length - 1;
    let selectedDepth = null;
    for (let depth = 0; depth <= MAX_OUTWARD_JOG; depth += 1) {
      const state = states[lastIndex][depth];
      if (!state) continue;
      if (selectedDepth == null || state.cost < states[lastIndex][selectedDepth].cost) {
        selectedDepth = depth;
      }
    }
    if (selectedDepth == null) {
      const first = segment.columns[0];
      const last = segment.columns.at(-1);
      const blockedRows = primary
        .map((choices, index) => ({
          column: segment.columns[index],
          availableDepths: choices
            .map((candidate, depth) => (candidateIsAvailable(candidate) ? depth : null))
            .filter((depth) => depth != null),
          blocked: choices.map((candidate, depth) => ({
            depth,
            reason: forcedBlockedCells.has(candidate.key) ? 'forced_grade_collision' : candidate.reason,
            blocks: candidate.blocked?.map((target) => target.existing) ?? [],
          })),
        }))
        .filter((row) => row.availableDepths.length === 0);
      throw new Error(
        `no collision-free outward path within ${MAX_OUTWARD_JOG} blocks for ${segment.id} `
        + `from ${first.x},${first.z} to ${last.x},${last.z}; `
        + `fully blocked rows: ${JSON.stringify(blockedRows.slice(0, 8))}`,
      );
    }

    const depths = Array(segment.columns.length);
    const edges = Array(Math.max(0, segment.columns.length - 1));
    for (let index = lastIndex; index >= 0; index -= 1) {
      depths[index] = selectedDepth;
      const state = states[index][selectedDepth];
      if (index > 0) {
        edges[index - 1] = state.edge;
        selectedDepth = state.previousDepth;
      }
    }
    const orderedNodes = [primary[0][depths[0]]];
    for (let index = 1; index < segment.columns.length; index += 1) {
      orderedNodes.push(...edges[index - 1].nodes, primary[index][depths[index]]);
    }
    return {
      ...segment,
      depths,
      orderedNodes,
      primaryNodes: primary.map((choices, index) => choices[depths[index]]),
    };
  };

  const planGeometry = async () => {
    const segments = [];
    for (const segment of splitPlanningSegments(allColumns, mode)) {
      if (segment.columns.length > 0) segments.push(await planSegment(segment));
    }
    const nodes = new Map();
    const edges = new Map();
    const primaryByPerimeterIndex = new Map();
    const addNode = (candidate) => {
      const existing = nodes.get(candidate.key);
      if (!existing || candidate.isPrimary) nodes.set(candidate.key, candidate);
      if (candidate.isPrimary) {
        primaryByPerimeterIndex.set(candidate.originalPerimeterIndex, candidate);
      }
    };
    const addEdge = (first, second) => {
      addNode(first);
      addNode(second);
      edges.set(edgeKey(first.key, second.key), { a: first.key, b: second.key });
    };
    for (const segment of segments) {
      for (const node of segment.orderedNodes) addNode(node);
      for (let index = 1; index < segment.orderedNodes.length; index += 1) {
        addEdge(segment.orderedNodes[index - 1], segment.orderedNodes[index]);
      }
    }
    if (mode === 'full') {
      for (let index = 0; index < allColumns.length; index += 1) {
        const current = allColumns[index];
        const next = allColumns[(index + 1) % allColumns.length];
        if (current.gate || next.gate || current.side === next.side) continue;
        const currentNode = primaryByPerimeterIndex.get(current.perimeterIndex);
        const nextNode = primaryByPerimeterIndex.get(next.perimeterIndex);
        if (currentNode && nextNode) addEdge(currentNode, nextNode);
      }
    }
    return { segments, nodes, edges: [...edges.values()], primaryByPerimeterIndex };
  };

  const materializeGeometry = async (geometry) => {
    const requiredTopByNode = new Map();
    const gradeBreaks = [];
    const nonOrthogonalEdges = [];
    for (const edge of geometry.edges) {
      const first = geometry.nodes.get(edge.a);
      const second = geometry.nodes.get(edge.b);
      const distance = Math.abs(first.x - second.x) + Math.abs(first.z - second.z);
      if (distance !== 1) nonOrthogonalEdges.push({ first: edge.a, second: edge.b, distance });
      const delta = second.baseY - first.baseY;
      if (Math.abs(delta) <= 1) continue;
      const lower = delta > 0 ? first : second;
      const higher = delta > 0 ? second : first;
      requiredTopByNode.set(
        lower.key,
        Math.max(requiredTopByNode.get(lower.key) ?? lower.baseY, higher.baseY),
      );
      gradeBreaks.push({
        from: { x: first.x, y: first.baseY, z: first.z },
        to: { x: second.x, y: second.baseY, z: second.z },
        delta,
        lowerNode: lower.key,
        requiredTopY: higher.baseY,
        resolvedBy: 'vertical_white_connector',
      });
    }

    const desiredByNode = new Map();
    const finalCollisions = [];
    for (const node of geometry.nodes.values()) {
      const desired = desiredForGradeNode(node, requiredTopByNode.get(node.key), plan);
      const inspected = desired.map((target) => {
        const existing = node.snapshotColumn.get(target.y);
        let disposition = canReplacePlannedTarget(existing, target.block, target.role, plan);
        const trimmedFoliage = disposition === 'collision'
          && node.outwardDepth > 0
          && isTrimmableFoliage(existing);
        if (trimmedFoliage) disposition = 'replace';
        return {
          ...target,
          side: node.side,
          nodeKey: node.key,
          existing,
          disposition,
          trimmedFoliage,
        };
      });
      desiredByNode.set(node.key, inspected);
      for (const target of inspected.filter((item) => item.disposition === 'collision')) {
        finalCollisions.push({
          x: target.x,
          y: target.y,
          z: target.z,
          side: target.side,
          nodeKey: node.key,
          role: target.role,
          existing: target.existing,
          desired: target.block,
          reason: isFoliageBlock(target.existing)
            ? 'foliage_collision'
            : 'non_replaceable_collision',
        });
      }
    }

    const unresolvedGradeDiscontinuities = gradeBreaks.filter((gradeBreak) => {
      const targets = desiredByNode.get(gradeBreak.lowerNode) ?? [];
      const lower = geometry.nodes.get(gradeBreak.lowerNode);
      for (let y = lower.baseY; y <= gradeBreak.requiredTopY; y += 1) {
        if (!targets.some((target) => target.y === y && target.role === 'grade_post')) return true;
      }
      return false;
    });
    return {
      ...geometry,
      desiredByNode,
      finalCollisions,
      gradeBreaks,
      requiredTopByNode,
      unresolvedGradeDiscontinuities,
      nonOrthogonalEdges,
    };
  };

  let materialized = null;
  for (let attempt = 0; attempt < 64; attempt += 1) {
    materialized = await materializeGeometry(await planGeometry());
    if (materialized.finalCollisions.length === 0) break;
    let added = 0;
    for (const collision of materialized.finalCollisions) {
      if (forcedBlockedCells.has(collision.nodeKey)) continue;
      forcedBlockedCells.add(collision.nodeKey);
      added += 1;
    }
    if (added === 0) break;
  }
  if (!materialized || materialized.finalCollisions.length > 0) {
    throw new Error(
      `unable to resolve ${materialized?.finalCollisions.length ?? 'unknown'} final fence collisions`,
    );
  }

  const placements = [];
  const alreadySatisfied = [];
  const duplicateTargets = [];
  const desiredKeys = new Set();
  for (const targets of materialized.desiredByNode.values()) {
    for (const target of targets) {
      const key = keyOf(target.x, target.y, target.z);
      if (desiredKeys.has(key)) {
        duplicateTargets.push({ x: target.x, y: target.y, z: target.z });
        continue;
      }
      desiredKeys.add(key);
      if (target.disposition === 'satisfied') {
        alreadySatisfied.push({
          x: target.x,
          y: target.y,
          z: target.z,
          block: target.block,
          role: target.role,
        });
      } else {
        placements.push({
          ...target,
          expected: baseBlockName(target.existing),
        });
      }
    }
  }

  const primaryNodes = [...materialized.primaryByPerimeterIndex.values()];
  const connectorNodes = [...materialized.nodes.values()].filter((node) => !node.isPrimary);
  const joggedPrimary = primaryNodes.filter((node) => node.outwardDepth > 0);
  const baselineCollisionKeys = new Set(
    baseline.collisions.map((collision) => `${collision.x},${collision.z}`),
  );
  const resolvedBaselineCollisionColumns = primaryNodes.filter((node) => (
    baselineCollisionKeys.has(`${node.originalX},${node.originalZ}`)
    && node.outwardDepth > 0
  ));
  const gateViolations = placements.filter((placement) => (
    (plan.gates ?? []).some((gate) => gateCorridorContains(gate, placement))
  ));
  const supports = [...materialized.nodes.values()].map((node) => ({
    x: node.x,
    z: node.z,
    side: node.side,
    y: node.support.y,
    block: node.support.block,
    kind: node.support.kind,
    ignoredFoliageCount: node.support.ignoredFoliage.length,
    ignoredReplaceableCount: node.support.ignoredReplaceable.length,
  }));
  const mergedOperations = mergePlacements(placements);
  const nonOrthogonalEdges = materialized.nonOrthogonalEdges;
  const graphComponents = countGraphComponents(materialized.nodes, materialized.edges);
  const expectedComponents = mode === 'pilot' ? 1 : plan.gates.length;
  const pathDegrees = new Map([...materialized.nodes.keys()].map((key) => [key, 0]));
  for (const edge of materialized.edges) {
    pathDegrees.set(edge.a, (pathDegrees.get(edge.a) ?? 0) + 1);
    pathDegrees.set(edge.b, (pathDegrees.get(edge.b) ?? 0) + 1);
  }
  const pathEndpointNodes = [...pathDegrees.values()].filter((degree) => degree === 1).length;
  const pathBranchNodes = [...pathDegrees.values()].filter((degree) => degree > 2).length;
  const expectedPathEndpoints = mode === 'pilot' ? 2 : plan.gates.length * 2;
  const trimmedFoliage = placements.filter((placement) => placement.trimmedFoliage);
  const columnResults = primaryNodes.map((node) => ({
    x: node.x,
    z: node.z,
    originalX: node.originalX,
    originalZ: node.originalZ,
    outwardDepth: node.outwardDepth,
    side: node.side,
    kind: node.kindInfo.kind,
    gateId: node.kindInfo.gateId,
    baseY: node.baseY,
    supportY: node.support.y,
    supportBlock: node.support.block,
    supportKind: node.support.kind,
    status: 'ready',
  }));

  return {
    mode,
    yMin,
    yMax,
    columns: allColumns,
    openColumns,
    fenceColumns,
    placements,
    mergedOperations,
    collisions: materialized.finalCollisions,
    baselineCollisions: baseline.collisions,
    skippedColumns: [],
    alreadySatisfied,
    duplicateTargets,
    gateViolations,
    gradeBreaks: materialized.gradeBreaks,
    unresolvedGradeDiscontinuities: materialized.unresolvedGradeDiscontinuities,
    nonOrthogonalEdges,
    supports,
    columnResults,
    pathNodes: [...materialized.nodes.values()].map((node) => ({
      x: node.x,
      z: node.z,
      side: node.side,
      originalX: node.originalX,
      originalZ: node.originalZ,
      outwardDepth: node.outwardDepth,
      kind: node.kindInfo.kind,
      primary: node.isPrimary,
      baseY: node.baseY,
    })),
    pathEdges: materialized.edges,
    trimmedFoliage,
    stats: {
      perimeterColumnsInMode: allColumns.length,
      declaredGateOpenColumns: openColumns.length,
      requestedFenceColumns: fenceColumns.length,
      readyFenceColumns: primaryNodes.length,
      skippedFenceColumns: 0,
      targetBlocks: placements.length + alreadySatisfied.length,
      placementBlocks: placements.length,
      mergedRconOperations: mergedOperations.length,
      alreadySatisfiedBlocks: alreadySatisfied.length,
      collisionBlocks: 0,
      collisionColumns: 0,
      baselineCollisionBlocks: baseline.collisions.length,
      baselineCollisionColumns: baselineCollisionKeys.size,
      resolvedBaselineCollisionColumns: resolvedBaselineCollisionColumns.length,
      joggedOriginalColumns: joggedPrimary.length,
      orthogonalConnectorColumns: connectorNodes.length,
      maxOutwardJog: Math.max(0, ...primaryNodes.map((node) => node.outwardDepth)),
      missingChunkColumns: 0,
      waterColumns: supports.filter((support) => support.kind === 'water').length,
      foliageBlocksIgnoredAsSupport: supports.reduce(
        (total, support) => total + support.ignoredFoliageCount,
        0,
      ),
      gradeBreaksOverOneBlock: materialized.gradeBreaks.length,
      gradeTransitionColumns: materialized.requiredTopByNode.size,
      unresolvedGradeDiscontinuities: materialized.unresolvedGradeDiscontinuities.length,
      nonOrthogonalPathEdges: nonOrthogonalEdges.length,
      pathNodes: materialized.nodes.size,
      pathEdges: materialized.edges.length,
      graphComponents,
      expectedGraphComponents: expectedComponents,
      pathEndpointNodes,
      expectedPathEndpointNodes: expectedPathEndpoints,
      pathBranchNodes,
      trimmedFoliageBlocks: trimmedFoliage.length,
      duplicateTargetBlocks: duplicateTargets.length,
      gateViolationBlocks: gateViolations.length,
      placementsByBlock: countBy(placements, (item) => item.block),
      placementsByRole: countBy(placements, (item) => item.role),
      supportsByBlock: countBy(supports, (item) => item.block ?? 'none'),
      baselineCollisionsByExistingBlock: countBy(
        baseline.collisions,
        (item) => item.existing,
      ),
      trimmedFoliageByExistingBlock: countBy(
        trimmedFoliage,
        (item) => item.existing,
      ),
      collisionsByExistingBlock: {},
    },
  };
}

function outputHeader({ planPath, regionDir, mode, reportPath, stats }) {
  return [
    '# GENERATED FILE — DO NOT EDIT; DO NOT RUN WITHOUT REVIEW',
    '# MainStreet America white-picket-fence snapshot-guarded RCON operations',
    `# mode: ${mode}`,
    `# plan: ${planPath}`,
    `# snapshot: ${regionDir}`,
    `# report: ${reportPath}`,
    '# Safety: every operation replaces only the exact material observed in the snapshot.',
    '# A world change after generation therefore no-ops instead of being overwritten.',
    `# columns: ${stats.readyFenceColumns}/${stats.requestedFenceColumns} ready; `
      + `${stats.skippedFenceColumns} skipped; ${stats.declaredGateOpenColumns} gate-open`,
    `# blocks: ${stats.placementBlocks} to place; ${stats.alreadySatisfiedBlocks} already satisfied; `
      + `${stats.collisionBlocks} collisions`,
    `# routing: ${stats.baselineCollisionColumns} baseline collisions resolved; `
      + `${stats.joggedOriginalColumns} jogged columns; ${stats.unresolvedGradeDiscontinuities} `
      + 'unresolved grade barriers',
    '',
  ];
}

function parseArgs(argv) {
  const parsed = {
    mode: 'full',
    plan: DEFAULT_PLAN,
    regions: DEFAULT_REGIONS,
    out: null,
    report: null,
    yMin: -64,
    yMax: 200,
    strict: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];
    if (arg === '--mode') {
      parsed.mode = value;
      index += 1;
    } else if (arg === '--plan') {
      parsed.plan = value;
      index += 1;
    } else if (arg === '--regions') {
      parsed.regions = value;
      index += 1;
    } else if (arg === '--out') {
      parsed.out = value;
      index += 1;
    } else if (arg === '--report') {
      parsed.report = value;
      index += 1;
    } else if (arg === '--y-min') {
      parsed.yMin = Number(value);
      index += 1;
    } else if (arg === '--y-max') {
      parsed.yMax = Number(value);
      index += 1;
    } else if (arg === '--strict') {
      parsed.strict = true;
    } else if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else {
      throw new Error(`unknown argument "${arg}"`);
    }
  }
  if (!parsed.out) parsed.out = `data/buildops/msa_picket_fence_${parsed.mode}.txt`;
  if (!parsed.report) parsed.report = parsed.out.replace(/\.txt$/, '.report.json');
  return parsed;
}

function usage() {
  return [
    'Usage: node scripts/generate_picket_fence.mjs [options]',
    '',
    '  --mode pilot|full',
    `  --plan <yaml>       default: ${DEFAULT_PLAN}`,
    `  --regions <dir>     default: ${DEFAULT_REGIONS}`,
    '  --out <txt>',
    '  --report <json>',
    '  --y-min <number>    default: -64',
    '  --y-max <number>    default: 200',
    '  --strict            exit non-zero when collisions/skips are present',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  if (!['pilot', 'full'].includes(args.mode)) {
    throw new Error(`--mode must be "pilot" or "full", got "${args.mode}"`);
  }
  if (!fs.existsSync(args.regions)) throw new Error(`region directory not found: ${args.regions}`);

  const plan = loadFencePlan(args.plan);
  const snapshot = new AnvilSnapshot(args.regions);
  const generated = await generateFence({
    plan,
    snapshot,
    mode: args.mode,
    yMin: args.yMin,
    yMax: args.yMax,
  });

  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.mkdirSync(path.dirname(args.report), { recursive: true });
  const header = outputHeader({
    planPath: args.plan,
    regionDir: args.regions,
    mode: args.mode,
    reportPath: args.report,
    stats: generated.stats,
  });
  fs.writeFileSync(
    args.out,
    [...header, ...generated.mergedOperations.map(operationLine), ''].join('\n'),
  );

  const report = {
    schemaVersion: 1,
    id: plan.id,
    mode: args.mode,
    generatedAtUtc: new Date().toISOString(),
    liveMutationPerformed: false,
    plan: args.plan,
    snapshot: {
      regionDir: args.regions,
      files: snapshotFiles(args.regions),
      yMin: args.yMin,
      yMax: args.yMax,
    },
    output: args.out,
    pilotRange: args.mode === 'pilot' ? PILOT_RANGE : null,
    boundary: boundaryBounds(plan),
    gates: plan.gates,
    stats: generated.stats,
    collisions: generated.collisions,
    baselineCollisions: generated.baselineCollisions,
    skippedColumns: generated.skippedColumns,
    jogColumns: generated.pathNodes.filter((node) => node.outwardDepth > 0),
    trimmedFoliage: generated.trimmedFoliage.map((placement) => ({
      x: placement.x,
      y: placement.y,
      z: placement.z,
      side: placement.side,
      existing: placement.existing,
      desired: placement.block,
      role: placement.role,
    })),
    waterColumns: generated.supports
      .filter((support) => support.kind === 'water')
      .map((support) => ({
        x: support.x,
        y: support.y,
        z: support.z,
        side: support.side,
        supportBlock: support.block,
      })),
    gatePiers: generated.columnResults
      .filter((column) => column.kind === 'gate_pier')
      .map((column) => ({
        x: column.x,
        y: column.baseY,
        z: column.z,
        side: column.side,
        gate: column.gateId,
        status: column.status,
      })),
    gradeBreaks: generated.gradeBreaks,
    unresolvedGradeDiscontinuities: generated.unresolvedGradeDiscontinuities,
    nonOrthogonalEdges: generated.nonOrthogonalEdges,
    alreadySatisfied: generated.alreadySatisfied,
    checks: {
      noDuplicateTargets: generated.duplicateTargets.length === 0,
      noFinalCollisions: generated.collisions.length === 0,
      noSkippedColumns: generated.skippedColumns.length === 0,
      noGateViolations: generated.gateViolations.length === 0,
      allBaselineCollisionsResolved: (
        generated.stats.resolvedBaselineCollisionColumns
        === generated.stats.baselineCollisionColumns
      ),
      allFenceColumnsRouted: (
        generated.stats.readyFenceColumns === generated.stats.requestedFenceColumns
      ),
      maxJogWithinPlan: generated.stats.maxOutwardJog <= MAX_OUTWARD_JOG,
      orthogonalPathOnly: generated.nonOrthogonalEdges.length === 0,
      noPathBranches: generated.stats.pathBranchNodes === 0,
      expectedPathEndpoints: (
        generated.stats.pathEndpointNodes === generated.stats.expectedPathEndpointNodes
      ),
      expectedPathComponents: (
        generated.stats.graphComponents === generated.stats.expectedGraphComponents
      ),
      noUnresolvedGradeDiscontinuities: (
        generated.unresolvedGradeDiscontinuities.length === 0
      ),
      noFoliageSupports: generated.supports.every(
        (support) => !support.block || !isFoliageBlock(support.block),
      ),
      noReplaceableSupports: generated.supports.every(
        (support) => !support.block || !isReplaceableBlock(support.block),
      ),
      gateOpenCounts: Object.fromEntries(
        (plan.gates ?? []).map((gate) => [
          gate.id,
          generated.openColumns.filter((column) => column.gate === gate.id).length,
        ]),
      ),
      gateOpenColumns: generated.openColumns.map((column) => ({
        x: column.x,
        z: column.z,
        side: column.side,
        gate: column.gate,
      })),
    },
  };
  fs.writeFileSync(args.report, `${JSON.stringify(report, null, 2)}\n`);

  process.stdout.write(
    `${args.mode}: ${generated.stats.readyFenceColumns}/${generated.stats.requestedFenceColumns} `
    + `columns ready, ${generated.stats.placementBlocks} blocks in `
    + `${generated.stats.mergedRconOperations} ops, `
    + `${generated.stats.collisionBlocks} collisions, `
    + `${generated.stats.missingChunkColumns} missing chunks\n`
    + `ops: ${args.out}\nreport: ${args.report}\n`,
  );

  if (
    args.strict
    && (
      generated.stats.collisionBlocks > 0
      || generated.stats.skippedFenceColumns > 0
      || generated.stats.gateViolationBlocks > 0
      || generated.stats.duplicateTargetBlocks > 0
      || generated.stats.unresolvedGradeDiscontinuities > 0
      || generated.stats.nonOrthogonalPathEdges > 0
      || generated.stats.pathBranchNodes > 0
      || generated.stats.graphComponents !== generated.stats.expectedGraphComponents
      || generated.stats.pathEndpointNodes !== generated.stats.expectedPathEndpointNodes
      || generated.stats.resolvedBaselineCollisionColumns
        !== generated.stats.baselineCollisionColumns
    )
  ) {
    process.exitCode = 2;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
