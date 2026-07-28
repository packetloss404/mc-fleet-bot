#!/usr/bin/env node
/**
 * Generate an additive recessed public portal and dogleg connector for C01.
 *
 * The old portal remains open. The new south-facing mouth sits east of the
 * completed parking boundary and connects through the stable east wall of the
 * existing C01 arrival lobby. The route descends two blocks beneath the
 * mountain for cover, then rises through stair-backed transitions to the
 * existing y64 lobby without touching its sand substrate.
 *
 * This generator is offline-only. It verifies the immutable baseline hash,
 * source blocks, block entities, fluids, gravity blocks, cover, and database
 * feature intersections before emitting exact-source REPL operations and an
 * exact rollback.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';

import { AnvilSnapshot } from './generate_picket_fence.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const optionValueIndexes = new Set();
for (let index = 0; index < args.length - 1; index += 1) {
  if (args[index].startsWith('--')) {
    optionValueIndexes.add(index + 1);
  }
}
const positionalOutput = args.find(
  (argument, index) =>
    !argument.startsWith('--') && !optionValueIndexes.has(index),
);
const regionArgument = value(
  '--regions',
  'data/worldsnap-redevelopment-c9e2bf0a-20260727/region',
);
const outputArgument = value(
  '--out',
  positionalOutput
    ?? 'data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.txt',
);
const outputPath = path.resolve(ROOT, outputArgument);
const reportPath = path.resolve(
  ROOT,
  value('--report', outputArgument.replace(/\.txt$/, '.report.json')),
);
const rollbackPath = path.resolve(
  ROOT,
  value('--rollback', outputArgument.replace(/\.txt$/, '.rollback.txt')),
);
const cameraPath = path.resolve(
  ROOT,
  value('--cameras', outputArgument.replace(/\.txt$/, '.before-cameras.json')),
);
const regionDir = path.resolve(ROOT, regionArgument);
const EXPECTED_BASELINE_HASH =
  'c9e2bf0a2c8d3072d356b8db5c765622a9d367577bc4e09d077bbc58c4310654';
const SAFETY_BOX = [138, 61, 162, 148, 78, 203];
const NEW_PORTAL_BOUNDS = [139, 62, 163, 147, 71, 201];
const ALLOWED_INTERSECTIONS = new Set([
  'SITE',
  'C01',
  'DIV-A01',
  'DIV-C01-SURFACE',
  'FENCE:DIV-C01-SURFACE',
  'C01-PUBLIC-ENTRY',
  'C01-LOBBY',
  'P01',
  // Idempotent post-import regeneration: these exact IDs are emitted by this
  // package and may already exist after a successful catalog import.
  'C01-PUBLIC-PORTAL-RECESSED-PHASE2',
  'C01-PUBLIC-CONNECTOR-DOGLEG-PHASE2',
  'C01-PUBLIC-PORTAL-DIRECTORY-PHASE2',
]);
const FLUIDS = new Set([
  'minecraft:water',
  'minecraft:lava',
  'minecraft:bubble_column',
]);
const GRAVITY = new Set([
  'minecraft:sand',
  'minecraft:red_sand',
  'minecraft:gravel',
  'minecraft:white_concrete_powder',
  'minecraft:orange_concrete_powder',
  'minecraft:magenta_concrete_powder',
  'minecraft:light_blue_concrete_powder',
  'minecraft:yellow_concrete_powder',
  'minecraft:lime_concrete_powder',
  'minecraft:pink_concrete_powder',
  'minecraft:gray_concrete_powder',
  'minecraft:light_gray_concrete_powder',
  'minecraft:cyan_concrete_powder',
  'minecraft:purple_concrete_powder',
  'minecraft:blue_concrete_powder',
  'minecraft:brown_concrete_powder',
  'minecraft:green_concrete_powder',
  'minecraft:red_concrete_powder',
  'minecraft:black_concrete_powder',
]);
const AIR = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
]);
const NATURAL_COVER = new Set([
  'minecraft:stone',
  'minecraft:deepslate',
  'minecraft:granite',
  'minecraft:diorite',
  'minecraft:andesite',
  'minecraft:tuff',
  'minecraft:calcite',
  'minecraft:dirt',
  'minecraft:grass_block',
  'minecraft:coarse_dirt',
  'minecraft:rooted_dirt',
  'minecraft:podzol',
  'minecraft:mud',
  'minecraft:clay',
]);
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

function exactPaletteState(entry) {
  const name = entry?.Name ?? 'minecraft:air';
  const properties = Object.entries(entry?.Properties ?? {})
    .map(([property, propertyValue]) => `${property}=${propertyValue}`)
    .sort();
  return properties.length ? `${name}[${properties.join(',')}]` : name;
}

class ExactStateSnapshot extends AnvilSnapshot {
  blockName(chunk, x, y, z) {
    if (!chunk) return null;
    const states = chunk.sections.get(Math.floor(y / 16));
    if (!states?.palette?.length) return 'minecraft:air';
    const palette = states.palette;
    if (palette.length === 1) return exactPaletteState(palette[0]);
    const bits = Math.max(4, 32 - Math.clz32(palette.length - 1));
    const perLong = Math.floor(64 / bits);
    const index = ((y & 15) << 8) | ((z & 15) << 4) | (x & 15);
    const longIndex = Math.floor(index / perLong);
    const data = states.data ?? [];
    if (longIndex >= data.length) return 'minecraft:air';
    const shift = BigInt((index % perLong) * bits);
    const mask = (1n << BigInt(bits)) - 1n;
    const paletteIndex = Number((longToBig(data[longIndex]) >> shift) & mask);
    return exactPaletteState(palette[paletteIndex]);
  }
}

const snapshot = new ExactStateSnapshot(regionDir);
const sourceCache = new Map();
const desired = new Map();
const commands = [];

function relative(filename) {
  return path.relative(ROOT, filename);
}

function key(x, y, z) {
  return `${x},${y},${z}`;
}

function baseName(block) {
  return String(block).split('[', 1)[0];
}

function isNaturalCover(block) {
  const base = baseName(block);
  return NATURAL_COVER.has(base) || base.endsWith('_ore');
}

function namespaced(block) {
  return block.startsWith('minecraft:') ? block : `minecraft:${block}`;
}

function hashBuffer(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hashSnapshot(directory) {
  const digest = crypto.createHash('sha256');
  const files = fs.readdirSync(directory)
    .filter((filename) => filename.endsWith('.mca'))
    .sort();
  for (const filename of files) {
    digest.update(filename);
    digest.update('\0');
    digest.update(fs.readFileSync(path.join(directory, filename)));
    digest.update('\0');
  }
  return {
    sha256: digest.digest('hex'),
    files: files.length,
    algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
  };
}

async function sourceAt(x, y, z) {
  const point = key(x, y, z);
  if (sourceCache.has(point)) return sourceCache.get(point);
  const column = await snapshot.readColumn(x, z, y, y);
  if (!column) throw new Error(`missing snapshot column ${x},${z}`);
  const block = namespaced(column.get(y));
  sourceCache.set(point, block);
  return block;
}

function put(x, y, z, block, phase, role, overwrite = false) {
  const point = key(x, y, z);
  const normalized = namespaced(block);
  const prior = desired.get(point);
  if (prior && !overwrite && prior.block !== normalized) {
    throw new Error(
      `design conflict at ${point}: ${prior.block}/${prior.role} and ${normalized}/${role}`,
    );
  }
  desired.set(point, { x, y, z, block: normalized, phase, role });
}

function doglegFloor(z) {
  if (z >= 197) return { y: 64, type: 'flat' };
  if (z === 196) return { y: 63, type: 'stair-south' };
  if (z >= 193) return { y: 63, type: 'flat' };
  if (z === 192) return { y: 62, type: 'stair-south' };
  if (z >= 171) return { y: 62, type: 'flat' };
  if (z === 170) return { y: 62, type: 'stair-north' };
  if (z === 169) return { y: 63, type: 'flat' };
  return { y: 63, type: 'stair-north' };
}

function floorBlock(type, centerBand = false) {
  if (type === 'stair-south') {
    return 'minecraft:polished_deepslate_stairs'
      + '[facing=south,half=bottom,shape=straight,waterlogged=false]';
  }
  if (type === 'stair-north') {
    return 'minecraft:polished_deepslate_stairs'
      + '[facing=north,half=bottom,shape=straight,waterlogged=false]';
  }
  return centerBand
    ? 'minecraft:oxidized_cut_copper'
    : 'minecraft:polished_deepslate';
}

// Five clear blocks provide a consistent public connector while preserving a
// one-block structural buffer west of SHL-S01.
for (let z = 168; z <= 201; z += 1) {
  const floor = doglegFloor(z);
  for (let x = 141; x <= 145; x += 1) {
    put(
      x,
      floor.y,
      z,
      floorBlock(floor.type, x === 143),
      '01-route-floor',
      'dogleg-floor',
    );
    for (let y = floor.y + 1; y <= floor.y + 4; y += 1) {
      put(x, y, z, 'minecraft:air', '03-clear-volume', 'dogleg-clear');
    }
    put(
      x,
      floor.y + 5,
      z,
      (x === 143 && [172, 180, 188, 196].includes(z))
        ? 'minecraft:sea_lantern'
        : 'minecraft:deepslate_tiles',
      '02-shell',
      'dogleg-ceiling',
    );
  }
}

// The west-east connection enters the existing lobby through its east wall,
// above the authored threshold. No target or halo cell touches the sand
// substrate at x<=138, y63.
for (let x = 140; x <= 145; x += 1) {
  for (let z = 164; z <= 167; z += 1) {
    put(
      x,
      64,
      z,
      floorBlock('flat', z === 166),
      '01-route-floor',
      'connection-floor',
    );
    for (let y = 65; y <= 68; y += 1) {
      put(x, y, z, 'minecraft:air', '03-clear-volume', 'connection-clear');
    }
    put(
      x,
      69,
      z,
      (z === 166 && [141, 144].includes(x))
        ? 'minecraft:sea_lantern'
        : 'minecraft:deepslate_tiles',
      '02-shell',
      'connection-ceiling',
    );
  }
}
for (let z = 164; z <= 168; z += 1) {
  for (let y = 65; y <= 68; y += 1) {
    put(139, y, z, 'minecraft:air', '03-clear-volume', 'lobby-east-opening');
  }
}

function shellColumn(x, z, floor, phase, role) {
  for (let y = floor; y <= floor + 5; y += 1) {
    put(x, y, z, 'minecraft:deepslate_bricks', phase, role);
  }
}

// Connection north wall; the south side opens into the dogleg turn.
for (let x = 140; x <= 146; x += 1) {
  shellColumn(x, 163, 64, '02-shell', 'connection-north-wall');
}

// Dogleg walls include a protected one-block buffer before SHL-S01 at x148.
for (let z = 168; z <= 200; z += 1) {
  const floor = doglegFloor(z).y;
  shellColumn(140, z, floor, '02-shell', 'dogleg-west-wall');
  shellColumn(146, z, floor, '02-shell', 'dogleg-east-wall');
}

// A restrained frame makes the mouth read as an opening in landform.
for (let y = 64; y <= 69; y += 1) {
  put(140, y, 201, 'minecraft:mossy_stone_bricks', '04-portal-frame', 'west-jamb', true);
  put(146, y, 201, 'minecraft:mossy_stone_bricks', '04-portal-frame', 'east-jamb', true);
}
for (let x = 140; x <= 146; x += 1) {
  put(x, 69, 201, 'minecraft:mossy_stone_bricks', '04-portal-frame', 'portal-lintel', true);
}
put(143, 69, 201, 'minecraft:sea_lantern', '04-portal-frame', 'portal-lintel-light', true);

// The directory occupies an east-wall niche; x141..145 stays fully clear.
for (let y = 63; y <= 66; y += 1) {
  put(
    147,
    y,
    187,
    'minecraft:smooth_quartz',
    '05-wayfinding',
    'directory-pylon',
  );
}
const DIRECTORY_SIGN =
  'minecraft:oak_wall_sign[facing=west,waterlogged=false]';
put(
  146,
  65,
  187,
  DIRECTORY_SIGN,
  '05-wayfinding',
  'directory-sign',
  true,
);
commands.push({
  phase: '05-wayfinding',
  line: `CMD execute if block 146 65 187 ${DIRECTORY_SIGN} run `
    + 'data merge block 146 65 187 '
    + '{front_text:{color:"black",has_glowing_text:1b,messages:['
    + `'{"text":"C01 ARRIVAL"}',`
    + `'{"text":"LOBBY WEST"}',`
    + `'{"text":"PARKING SOUTH"}',`
    + `'{"text":"RETURN THIS WAY"}'`
    + ']}}',
});

const snapshotHash = hashSnapshot(regionDir);
if (snapshotHash.sha256 !== EXPECTED_BASELINE_HASH) {
  throw new Error(
    `snapshot hash mismatch: expected ${EXPECTED_BASELINE_HASH}, `
    + `found ${snapshotHash.sha256}`,
  );
}

const entityCensus = spawnSync(
  process.execPath,
  [
    path.join(ROOT, 'scripts/block_entity_census.mjs'),
    '--regions',
    regionDir,
    '--box',
    ...SAFETY_BOX.map(String),
  ],
  {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  },
);
if (entityCensus.status !== 0) {
  throw new Error(`block-entity census failed: ${entityCensus.stderr}`);
}
const blockEntities = JSON.parse(entityCensus.stdout);
if (blockEntities.count !== 0 || blockEntities.chunksMissing !== 0) {
  throw new Error(
    `block-entity safety failed: ${JSON.stringify(blockEntities)}`,
  );
}

const cells = [];
const hazards = [];
for (const target of desired.values()) {
  const source = await sourceAt(target.x, target.y, target.z);
  const base = baseName(source);
  if (FLUIDS.has(base) || GRAVITY.has(base) || source.includes('waterlogged=true')) {
    hazards.push({
      point: [target.x, target.y, target.z],
      source,
      role: target.role,
    });
  }
  if (
    source === target.block
    || (!target.block.includes('[') && base === target.block)
  ) {
    continue;
  }
  cells.push({ ...target, current: source, desired: target.block });
}
if (hazards.length) {
  throw new Error(`fluid/gravity hazards in target cells: ${JSON.stringify(hazards.slice(0, 20))}`);
}

// Scan a one-cell safety halo around every changed cell for fluids and gravity.
const safetyHazards = [];
const checkedSafetyCells = new Set();
for (const cell of cells) {
  for (const [dx, dy, dz] of [
    [0, 0, 0],
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ]) {
    const point = key(cell.x + dx, cell.y + dy, cell.z + dz);
    if (checkedSafetyCells.has(point)) continue;
    checkedSafetyCells.add(point);
    const block = await sourceAt(cell.x + dx, cell.y + dy, cell.z + dz);
    const base = baseName(block);
    if (FLUIDS.has(base) || GRAVITY.has(base) || block.includes('waterlogged=true')) {
      safetyHazards.push({
        point: [cell.x + dx, cell.y + dy, cell.z + dz],
        block,
      });
    }
  }
}
if (safetyHazards.length) {
  throw new Error(
    `fluid/gravity hazards in one-cell safety halo: `
    + `${JSON.stringify(safetyHazards.slice(0, 20))}`,
  );
}

// The three-block cover rule applies between the existing lobby junction and
// the intentional south-facing portal reveal. The junction and mouth planes
// are authored openings and are exempt.
const coverChecks = [];
for (const target of desired.values()) {
  if (target.role !== 'entrance-ceiling' && target.role !== 'dogleg-ceiling') continue;
  if (target.z <= 168 || target.z === 201) continue;
  let cover = 0;
  const nonNaturalBlocks = [];
  for (let y = target.y + 1; y <= target.y + 12; y += 1) {
    const projected = desired.get(key(target.x, y, target.z))?.block
      ?? await sourceAt(target.x, y, target.z);
    if (AIR.has(baseName(projected))) break;
    if (!isNaturalCover(projected)) {
      nonNaturalBlocks.push({
        point: [target.x, y, target.z],
        block: projected,
      });
      break;
    }
    cover += 1;
  }
  coverChecks.push({
    point: [target.x, target.y, target.z],
    cover,
    nonNaturalBlocks,
  });
}
const coverFailures = coverChecks.filter((check) => check.cover < 3);
if (coverFailures.length) {
  throw new Error(
    `insufficient portal cover: ${JSON.stringify(coverFailures.slice(0, 30))}`,
  );
}

const database = new Database(path.join(ROOT, 'data/world-map.db'), {
  readonly: true,
});
const [bx1, , bz1, bx2, , bz2] = NEW_PORTAL_BOUNDS;
const databaseIntersections2d = database.prepare(`
  SELECT external_id, name, kind, status, geometry_json,
         min_x, max_x, min_z, max_z
  FROM world_features
  WHERE project_id = 'mainstreet-america'
    AND NOT (max_x < ? OR min_x > ? OR max_z < ? OR min_z > ?)
  ORDER BY kind, external_id
`).all(bx1, bx2, bz1, bz2);
database.close();

function verticalRange(feature) {
  const geometry = JSON.parse(feature.geometry_json);
  if (
    Number.isFinite(geometry.minY)
    && Number.isFinite(geometry.maxY)
  ) {
    return [Number(geometry.minY), Number(geometry.maxY)];
  }
  if (geometry.type === 'path' && Array.isArray(geometry.points)) {
    const ys = geometry.points
      .map((point) => Number(point.y))
      .filter(Number.isFinite);
    if (ys.length) {
      const radius = Number(geometry.width ?? 1) / 2;
      return [Math.min(...ys) - radius, Math.max(...ys) + radius];
    }
  }
  return null;
}

const [, by1, , , by2] = NEW_PORTAL_BOUNDS;
const databaseIntersections = databaseIntersections2d
  .map((feature) => ({
    ...feature,
    verticalRange: verticalRange(feature),
  }))
  .filter((feature) => (
    !['retired', 'removed'].includes(feature.status)
    && (
      feature.verticalRange === null
      || !(
        feature.verticalRange[1] < by1
        || feature.verticalRange[0] > by2
      )
    )
  ));
const database2dOnlyClearance = databaseIntersections2d
  .map((feature) => ({
    ...feature,
    verticalRange: verticalRange(feature),
  }))
  .filter((feature) => (
    !databaseIntersections.some(
      (intersection) => intersection.external_id === feature.external_id,
    )
  ));
const unapprovedDatabaseIntersections = databaseIntersections
  .filter((feature) => !ALLOWED_INTERSECTIONS.has(feature.external_id));
if (unapprovedDatabaseIntersections.length) {
  throw new Error(
    `unapproved database intersections: `
    + `${JSON.stringify(unapprovedDatabaseIntersections)}`,
  );
}

function mergeCells(input) {
  const ordered = [...input].map((cell) => ({
    ...cell,
    runtimeOrder: cell.runtimeOrder ?? 0,
  })).sort((a, b) => (
    a.runtimeOrder - b.runtimeOrder
    || a.phase.localeCompare(b.phase)
    || a.current.localeCompare(b.current)
    || a.desired.localeCompare(b.desired)
    || a.role.localeCompare(b.role)
    || a.y - b.y
    || a.z - b.z
    || a.x - b.x
  ));
  const xRuns = [];
  for (const cell of ordered) {
    const prior = xRuns.at(-1);
    if (
      prior
      && prior.runtimeOrder === cell.runtimeOrder
      && prior.phase === cell.phase
      && prior.current === cell.current
      && prior.desired === cell.desired
      && prior.role === cell.role
      && prior.y1 === cell.y
      && prior.z1 === cell.z
      && prior.x2 + 1 === cell.x
    ) {
      prior.x2 = cell.x;
    } else {
      xRuns.push({
        runtimeOrder: cell.runtimeOrder,
        phase: cell.phase,
        role: cell.role,
        current: cell.current,
        desired: cell.desired,
        x1: cell.x,
        y1: cell.y,
        z1: cell.z,
        x2: cell.x,
        y2: cell.y,
        z2: cell.z,
      });
    }
  }
  xRuns.sort((a, b) => (
    a.runtimeOrder - b.runtimeOrder
    || a.phase.localeCompare(b.phase)
    || a.current.localeCompare(b.current)
    || a.desired.localeCompare(b.desired)
    || a.role.localeCompare(b.role)
    || a.y1 - b.y1
    || a.x1 - b.x1
    || a.x2 - b.x2
    || a.z1 - b.z1
  ));
  const zRects = [];
  for (const run of xRuns) {
    const prior = zRects.at(-1);
    if (
      prior
      && prior.runtimeOrder === run.runtimeOrder
      && prior.phase === run.phase
      && prior.current === run.current
      && prior.desired === run.desired
      && prior.role === run.role
      && prior.y1 === run.y1
      && prior.x1 === run.x1
      && prior.x2 === run.x2
      && prior.z2 + 1 === run.z1
    ) {
      prior.z2 = run.z2;
    } else {
      zRects.push({ ...run });
    }
  }
  zRects.sort((a, b) => (
    a.runtimeOrder - b.runtimeOrder
    || a.phase.localeCompare(b.phase)
    || a.current.localeCompare(b.current)
    || a.desired.localeCompare(b.desired)
    || a.role.localeCompare(b.role)
    || a.x1 - b.x1
    || a.x2 - b.x2
    || a.z1 - b.z1
    || a.z2 - b.z2
    || a.y1 - b.y1
  ));
  const boxes = [];
  for (const rect of zRects) {
    const prior = boxes.at(-1);
    if (
      prior
      && prior.runtimeOrder === rect.runtimeOrder
      && prior.phase === rect.phase
      && prior.current === rect.current
      && prior.desired === rect.desired
      && prior.role === rect.role
      && prior.x1 === rect.x1
      && prior.x2 === rect.x2
      && prior.z1 === rect.z1
      && prior.z2 === rect.z2
      && prior.y2 + 1 === rect.y1
    ) {
      prior.y2 = rect.y2;
    } else {
      boxes.push({ ...rect });
    }
  }
  return boxes.sort((a, b) => (
    a.runtimeOrder - b.runtimeOrder
    || a.phase.localeCompare(b.phase)
    || a.y1 - b.y1
    || a.z1 - b.z1
    || a.x1 - b.x1
  ));
}

function phaseRuntimeOrder(phase) {
  return Number.parseInt(phase.slice(0, 2), 10) * 100;
}

const forwardBoxes = mergeCells(cells.map((cell) => ({
  ...cell,
  runtimeOrder: phaseRuntimeOrder(cell.phase),
})));
const rollbackBoxes = mergeCells(cells.map((cell) => ({
  ...cell,
  current: cell.desired,
  desired: cell.current,
  // Remove the attached directory before changing its support, then unwind
  // every structural phase in reverse order.
  runtimeOrder: baseName(cell.desired) === 'minecraft:oak_wall_sign'
    ? 0
    : 1_000 - phaseRuntimeOrder(cell.phase),
})));
function operationLine(operation) {
  return `REPL ${operation.x1} ${operation.y1} ${operation.z1} `
    + `${operation.x2} ${operation.y2} ${operation.z2} `
    + `${operation.current} ${operation.desired}`;
}
function outputText(title, boxes, commandList = []) {
  const lines = [
    `# ${title}`,
    `# frozen baseline: ${relative(regionDir)}`,
    `# baseline SHA-256: ${EXPECTED_BASELINE_HASH}`,
    '# Additive portal: the old C01 entrance remains operational.',
    '# Exact-source REPL guards only. No SET operation is permitted.',
    `# changed cells: ${cells.length}; guarded boxes: ${boxes.length}`,
    '',
  ];
  let phase = null;
  for (const operation of boxes) {
    if (phase !== operation.phase) {
      phase = operation.phase;
      lines.push(`# phase: ${phase}`);
    }
    lines.push(operationLine(operation));
  }
  for (const command of commandList) {
    if (phase !== command.phase) {
      phase = command.phase;
      lines.push(`# phase: ${phase}`);
    }
    lines.push(command.line);
  }
  lines.push('');
  return lines.join('\n');
}

const forwardOutput = outputText(
  'GENERATED FILE — MainStreet bunker recessed portal Phase 2',
  forwardBoxes,
  commands,
);
const rollbackOutput = outputText(
  'GENERATED ROLLBACK — MainStreet bunker recessed portal Phase 2',
  rollbackBoxes,
);
const phaseCounts = {};
const desiredMaterialCounts = {};
const sourceMaterialCounts = {};
for (const cell of cells) {
  phaseCounts[cell.phase] = (phaseCounts[cell.phase] ?? 0) + 1;
  desiredMaterialCounts[cell.desired] =
    (desiredMaterialCounts[cell.desired] ?? 0) + 1;
  sourceMaterialCounts[cell.current] =
    (sourceMaterialCounts[cell.current] ?? 0) + 1;
}
const stairCells = cells.filter(
  (cell) => baseName(cell.desired) === 'minecraft:polished_deepslate_stairs',
);
const stairByPoint = new Map(
  stairCells.map((cell) => [`${cell.x},${cell.y},${cell.z}`, cell]),
);
const stairFacing = (state) => state.match(/facing=([^,\]]+)/)?.[1] ?? null;
const perpendicularStairNeighbors = [];
for (const cell of stairCells) {
  const facing = stairFacing(cell.desired);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const neighbor = stairByPoint.get(`${cell.x + dx},${cell.y},${cell.z + dz}`);
    if (!neighbor) continue;
    const neighborFacing = stairFacing(neighbor.desired);
    const perpendicular = (
      ['north', 'south'].includes(facing)
      !== ['north', 'south'].includes(neighborFacing)
    );
    if (perpendicular) {
      perpendicularStairNeighbors.push({
        point: [cell.x, cell.y, cell.z],
        facing,
        neighbor: [neighbor.x, neighbor.y, neighbor.z],
        neighborFacing,
      });
    }
  }
}
if (perpendicularStairNeighbors.length > 0) {
  throw new Error('stair layout can normalize away from shape=straight');
}
const report = {
  schemaVersion: 1,
  id: 'mainstreet-bunker-recessed-portal-phase2-2026-07-27',
  status: 'implementation-ready-live-safety-gates-pending',
  generatedAtUtc: new Date().toISOString(),
  liveWorldMutated: false,
  baseline: {
    regions: relative(regionDir),
    expectedSha256: EXPECTED_BASELINE_HASH,
    observedSha256: snapshotHash.sha256,
    hashMatched: snapshotHash.sha256 === EXPECTED_BASELINE_HASH,
    regionFiles: snapshotHash.files,
    hashAlgorithm: snapshotHash.algorithm,
  },
  design: {
    oldPortalRemainsOperational: true,
    mouth: {
      orientation: 'south-facing',
      openingPlane: [141, 65, 201, 145, 68, 201],
      center: [143, 65, 201],
      clearWidth: 5,
      clearHeight: 4,
    },
    lobbyConnection: {
      bounds: [139, 64, 163, 146, 69, 169],
      existingLobbyOpening: [139, 65, 164, 139, 68, 168],
      substratePreserved:
        'All x<=138,y63 sand remains outside both target cells and the one-cell safety halo.',
    },
    dogleg: {
      bounds: [140, 62, 168, 147, 69, 201],
      floorProfile: [
        { z: [197, 201], supportY: 64 },
        { z: [193, 196], supportY: 63, stairAtZ: 196 },
        { z: [171, 192], supportY: 62, stairAtZ: 192 },
        { z: [169, 170], supportY: [62, 63], stairAtZ: 170 },
        { z: 168, supportY: 63, stairAtZ: 168 },
      ],
      clearWidth: 5,
      clearHeight: 4,
      shelterClearance:
        'East liner ends at x147; SHL-S01 begins at x148 and y81, with no target overlap.',
      lowerTheaterClearance:
        'C01-LOWER-THEATER ends at y60; portal work begins at y62 and preserves the y61 structural separator.',
    },
    palette: {
      floor: ['polished_deepslate', 'oxidized_cut_copper'],
      stair: 'polished_deepslate_stairs',
      wall: 'deepslate_bricks',
      ceiling: 'deepslate_tiles',
      portalFrame: 'mossy_stone_bricks',
      lighting: 'sea_lantern',
    },
  },
  safety: {
    safetyBox: SAFETY_BOX,
    blockEntityCensus: {
      chunksRead: blockEntities.chunksRead,
      chunksMissing: blockEntities.chunksMissing,
      count: blockEntities.count,
      passed: blockEntities.count === 0 && blockEntities.chunksMissing === 0,
    },
    dynamicEntityCensus: {
      availableInFrozenRegionSnapshot: false,
      requirement:
        'Run a bounded live entity-empty sweep immediately before release; region-only evidence cannot prove transient entity absence.',
    },
    exactStateSourcePreserved: true,
    commandGuards: {
      count: commands.length,
      exactDesiredBlockPredicateRequired: true,
      allCommandsGuarded: commands.every(
        (command) => command.line.startsWith('CMD execute if block '),
      ),
    },
    targetHazards: hazards,
    safetyHaloHazards: safetyHazards,
    minimumNaturalCover: Math.min(...coverChecks.map((check) => check.cover)),
    coverChecks: {
      count: coverChecks.length,
      failures: coverFailures,
      passed: coverFailures.length === 0,
    },
    databaseIntersections2d,
    database2dOnlyClearance,
    databaseIntersections,
    unapprovedDatabaseIntersections,
  },
  operations: {
    changedCellCount: cells.length,
    guardedBoxCount: forwardBoxes.length,
    commandCount: commands.length,
    setOperationCount: 0,
    duplicateTargetCells: 0,
    phaseCellCounts: phaseCounts,
    sourceMaterialCounts,
    desiredMaterialCounts,
    forward: {
      path: relative(outputPath),
      sha256: hashBuffer(forwardOutput),
    },
    rollback: {
      path: relative(rollbackPath),
      changedCellCount: cells.length,
      guardedBoxCount: rollbackBoxes.length,
      sha256: hashBuffer(rollbackOutput),
      requirement:
        'Preflight against a content-addressed post-release snapshot before rollback.',
    },
  },
  runtimeSafety: {
    orderingModel:
      'forward dependency order and reverse-phase rollback with attached-block removal first',
    supportDependentRollbackFirst: {
      blocks: ['minecraft:oak_wall_sign'],
      cells: cells.filter(
        (cell) => baseName(cell.desired) === 'minecraft:oak_wall_sign',
      ).length,
      passed: true,
    },
    desiredStateNormalization: {
      statefulBlock: 'minecraft:polished_deepslate_stairs',
      cells: stairCells.length,
      authoredShape: 'straight',
      perpendicularNeighborPairs: perpendicularStairNeighbors,
      passed: perpendicularStairNeighbors.length === 0,
    },
    materialExactRemovalExceptions: [],
  },
  databaseFeatures: [
    {
      externalId: 'C01-PUBLIC-PORTAL-RECESSED-PHASE2',
      parentExternalId: 'C01',
      projectId: 'mainstreet-america',
      kind: 'building',
      name: 'C01 recessed public portal',
      geometry: {
        type: 'bounds',
        minX: 139,
        minY: 62,
        minZ: 163,
        maxX: 147,
        maxY: 69,
        maxZ: 201,
      },
      source: 'guarded-operation',
      sourceRef: relative(outputPath),
      status: 'implementation-ready-live-safety-gates-pending',
      qualityStatus: {
        concealment: 'projected-south-mouth-integrated-with-mountain-landform',
        functional: 'projected-five-wide-four-high-stair-backed-route',
        legibility: 'interior-directory-and-route-band-defined',
        media: 'before-camera-contract-defined-after-required',
      },
    },
    {
      externalId: 'C01-PUBLIC-CONNECTOR-DOGLEG-PHASE2',
      parentExternalId: 'C01-PUBLIC-PORTAL-RECESSED-PHASE2',
      projectId: 'mainstreet-america',
      kind: 'custom',
      name: 'C01 recessed portal dogleg connector',
      geometry: {
        type: 'path',
        width: 5,
        points: [
          { x: 143, y: 64, z: 201 },
          { x: 143, y: 64, z: 197 },
          { x: 143, y: 63, z: 193 },
          { x: 143, y: 62, z: 191 },
          { x: 143, y: 62, z: 171 },
          { x: 143, y: 63, z: 168 },
          { x: 143, y: 64, z: 166 },
          { x: 139, y: 64, z: 166 },
        ],
      },
      source: 'guarded-operation',
      sourceRef: relative(outputPath),
      status: 'implementation-ready-live-safety-gates-pending',
      qualityStatus: {
        concealment: 'minimum-eleven-block-overhead-cover-projected',
        functional: 'projected-bidirectional-qa-required',
        legibility: 'single-named-dogleg-with-confirmation-band',
        media: 'portal-entry-and-lobby-return-cameras-defined',
      },
    },
    {
      externalId: 'C01-PUBLIC-PORTAL-DIRECTORY-PHASE2',
      parentExternalId: 'C01-PUBLIC-PORTAL-RECESSED-PHASE2',
      projectId: 'mainstreet-america',
      kind: 'landmark',
      name: 'C01 recessed portal interior directory',
      geometry: {
        type: 'bounds',
        minX: 146,
        minY: 63,
        minZ: 187,
        maxX: 147,
        maxY: 66,
        maxZ: 187,
      },
      source: 'guarded-operation',
      sourceRef: relative(outputPath),
      status: 'implementation-ready-live-safety-gates-pending',
      qualityStatus: {
        concealment: 'interior',
        functional: 'outside-five-wide-primary-clear-route',
        legibility: 'projected-lobby-parking-return-message',
        media: 'interior-wayfinding-camera-defined',
      },
    },
  ],
  retirementGate: {
    oldPortalClosureIncluded: false,
    closurePermittedOnlyAfter: [
      '100 percent forward guard execution',
      'post-release immutable snapshot and target-cell census',
      'bounded live entity-empty sweep',
      'bidirectional no-jump player walk through new route',
      'old and new portal same-camera review',
      'parking-space and road reconciliation',
      'database/media import and owner acceptance',
    ],
  },
  acceptance: {
    exactSourceGuardsRequired: forwardBoxes.length,
    failedGuardsAllowed: 0,
    liveCommandFailuresAllowed: 0,
    noSetOperations: true,
    blockEntityCountRequired: 0,
    fluidAndGravityHazardsRequired: 0,
    minimumNaturalCoverBlocks: 3,
    dynamicEntitySweepRequired: true,
    projectedRouteQaRequired: true,
    sameCameraAfterRequired: true,
  },
};

const cameraManifest = {
  schemaVersion: 1,
  id: 'mainstreet-bunker-recessed-portal-phase2-before-cameras',
  generatedAtUtc: new Date().toISOString(),
  baseline: report.baseline,
  status: 'before-camera-contract',
  capturePolicy: {
    renderer: 'scripts/world_render.mjs',
    width: 1280,
    height: 720,
    fieldOfView: 70,
    sameCameraAfterRequired: true,
    sameLightingAfterRequired: true,
  },
  cameras: [
    {
      id: 'C01-P2-MOUTH-SOUTH',
      primaryFeatureId: 'C01-PUBLIC-PORTAL-RECESSED-PHASE2',
      eye: [143, 68, 213],
      lookAt: [143, 66, 201],
      role: 'new-south-facing-mouth',
      output: '01-new-mouth-south.png',
    },
    {
      id: 'C01-P2-PARKING-CONTEXT',
      primaryFeatureId: 'C01-PUBLIC-PORTAL-RECESSED-PHASE2',
      eye: [105, 82, 225],
      lookAt: [143, 66, 201],
      role: 'new-portal-parking-relationship',
      output: '02-parking-context.png',
    },
    {
      id: 'C01-P2-DOGLEG-NORTH',
      primaryFeatureId: 'C01-PUBLIC-CONNECTOR-DOGLEG-PHASE2',
      eye: [143, 65, 199],
      lookAt: [143, 64, 169],
      role: 'dogleg-toward-lobby',
      output: '03-dogleg-north.png',
    },
    {
      id: 'C01-P2-LOBBY-RETURN',
      primaryFeatureId: 'C01-LOBBY',
      eye: [135, 66, 166],
      lookAt: [143, 65, 166],
      role: 'return-to-new-portal',
      output: '04-lobby-return.png',
    },
    {
      id: 'C01-P2-OLD-NEW-CONTEXT',
      primaryFeatureId: 'C01-PUBLIC-ENTRY',
      eye: [75, 110, 250],
      lookAt: [122, 72, 182],
      role: 'old-and-new-entry-context',
      output: '05-old-new-entry-context.png',
    },
  ],
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.mkdirSync(path.dirname(cameraPath), { recursive: true });
fs.writeFileSync(outputPath, forwardOutput);
fs.writeFileSync(rollbackPath, rollbackOutput);
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(cameraPath, `${JSON.stringify(cameraManifest, null, 2)}\n`);
console.log(JSON.stringify({
  output: relative(outputPath),
  report: relative(reportPath),
  rollback: relative(rollbackPath),
  cameras: relative(cameraPath),
  baselineHash: snapshotHash.sha256,
  changedCells: cells.length,
  guardedBoxes: forwardBoxes.length,
  commands: commands.length,
  blockEntities: blockEntities.count,
  hazards: hazards.length + safetyHazards.length,
  minimumNaturalCover: Math.min(...coverChecks.map((check) => check.cover)),
  databaseIntersections: databaseIntersections.map((feature) => feature.external_id),
}, null, 2));
