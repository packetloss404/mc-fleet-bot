#!/usr/bin/env node
/**
 * Generate the first guarded surface release for the MainStreet C01 complex.
 *
 * This package deliberately does not translate the protected deep complex or
 * retire the existing portal. It:
 *
 * 1. wraps the west, east, and non-door south faces of HGR-S01 in a graded
 *    natural landform while keeping OBS-S01 as the sole surface landmark;
 * 2. completes a six-block-wide, level east-edge road between the existing
 *    public-entry promenade and Festival Row; and
 * 3. authors a clear gate and restrained route signs at the z=231 project
 *    boundary.
 *
 * Every changed cell is derived from the immutable Anvil snapshot and emitted
 * as an exact-source REPL guard. There are no SET operations and this script
 * never connects to Minecraft or RCON.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import {
  AnvilSnapshot,
  isAirBlock,
  isFoliageBlock,
  isReplaceableBlock,
} from './generate_picket_fence.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
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
  positionalOutput ?? 'data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.txt',
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

const snapshot = new AnvilSnapshot(regionDir);
const sourceCache = new Map();
const operations = new Map();
const commandOperations = [];
const columnResults = [];
const skippedColumns = [];
const phaseCellCounts = new Map();
const ROAD_MIN_X = 120;
const ROAD_MAX_X = 125;
const ROAD_MIN_Z = 206;
const ROAD_MAX_Z = 245;

const AIR = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
]);
const FLUID = new Set([
  'minecraft:water',
  'minecraft:lava',
  'minecraft:bubble_column',
]);
const NATURAL_GROUND = new Set([
  'minecraft:stone',
  'minecraft:deepslate',
  'minecraft:dirt',
  'minecraft:grass_block',
  'minecraft:coarse_dirt',
  'minecraft:rooted_dirt',
  'minecraft:podzol',
  'minecraft:gravel',
  'minecraft:granite',
  'minecraft:diorite',
  'minecraft:andesite',
  'minecraft:tuff',
  'minecraft:calcite',
  'minecraft:sand',
  'minecraft:red_sand',
  'minecraft:clay',
  'minecraft:mud',
  'minecraft:moss_block',
  'minecraft:snow_block',
]);
const ROAD_SOURCE = new Set([
  'minecraft:light_gray_concrete',
  'minecraft:gray_concrete',
  'minecraft:white_concrete',
  'minecraft:stone_bricks',
  'minecraft:mossy_stone_bricks',
  'minecraft:smooth_stone',
  'minecraft:polished_andesite',
  'minecraft:stone',
  'minecraft:sand',
  'minecraft:dirt',
  'minecraft:grass_block',
  'minecraft:waxed_weathered_cut_copper',
  'minecraft:sea_lantern',
]);
const LOADED_CHESTS = new Set([
  '150,82,178',
  '154,82,178',
  '158,82,178',
  '233,45,220',
  '238,45,220',
  '255,45,220',
  '233,56,220',
  '238,56,220',
  '255,56,220',
  '233,67,220',
  '238,67,220',
  '255,67,220',
]);
const PROTECTED_BOXES = [
  {
    id: 'public-observatory-stair',
    box: [164, 98, 151, 175, 123, 166],
  },
  {
    id: 'hangar-shell',
    box: [176, 98, 138, 234, 120, 181],
  },
  {
    id: 'observatory-and-penthouse',
    box: [175, 119, 137, 235, 136, 182],
  },
  {
    id: 'hangar-door-trail',
    box: [208, 88, 180, 238, 116, 191],
  },
  {
    id: 'heliport',
    box: [238, 88, 172, 257, 91, 191],
  },
  {
    id: 'service-shaft',
    box: [198, 24, 151, 202, 106, 156],
  },
  {
    id: 'public-entry',
    box: [90, 64, 153, 139, 80, 205],
  },
  {
    id: 'shelter-shell-and-interior',
    box: [148, 81, 143, 188, 92, 180],
  },
  {
    id: 'vault-connector',
    box: [188, 66, 171, 232, 86, 196],
  },
  {
    id: 'grand-vault',
    box: [230, 44, 184, 262, 77, 226],
  },
  {
    id: 'southeast-rain-garden',
    box: [100, 64, 240, 119, 66, 245],
  },
];

function relative(filename) {
  return path.relative(ROOT, filename);
}

function key(x, y, z) {
  return `${x},${y},${z}`;
}

function baseName(block) {
  return String(block).split('[', 1)[0];
}

function normalizeNamespaced(block) {
  return block.startsWith('minecraft:') ? block : `minecraft:${block}`;
}

function hashBuffer(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hashFile(filename) {
  return hashBuffer(fs.readFileSync(filename));
}

function hashSnapshotDirectory(directory) {
  const digest = crypto.createHash('sha256');
  const members = [];
  for (const name of fs.readdirSync(directory)
    .filter((filename) => filename.endsWith('.mca'))
    .sort()) {
    const filename = path.join(directory, name);
    const content = fs.readFileSync(filename);
    digest.update(name);
    digest.update('\0');
    digest.update(content);
    digest.update('\0');
    members.push({
      name,
      bytes: content.length,
      sha256: hashBuffer(content),
    });
  }
  return {
    algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
    sha256: digest.digest('hex'),
    members,
  };
}

function inside(point, box) {
  const [x, y, z] = point;
  const [x1, y1, z1, x2, y2, z2] = box;
  return (
    x >= Math.min(x1, x2)
    && x <= Math.max(x1, x2)
    && y >= Math.min(y1, y2)
    && y <= Math.max(y1, y2)
    && z >= Math.min(z1, z2)
    && z <= Math.max(z1, z2)
  );
}

function protectedAt(x, y, z) {
  const point = [x, y, z];
  const box = PROTECTED_BOXES.find((entry) => inside(point, entry.box));
  if (box) return box.id;
  if (LOADED_CHESTS.has(key(x, y, z))) return 'loaded-chest';
  return null;
}

async function sourceAt(x, y, z) {
  const cellKey = key(x, y, z);
  if (sourceCache.has(cellKey)) return sourceCache.get(cellKey);
  const column = await snapshot.readStateColumn(x, z, y, y);
  if (!column) throw new Error(`missing snapshot column ${x},${z}`);
  const block = normalizeNamespaced(column.get(y));
  sourceCache.set(cellKey, block);
  return block;
}

async function projectedAt(x, y, z) {
  return operations.get(key(x, y, z))?.desired ?? sourceAt(x, y, z);
}

async function replace(x, y, z, desired, phase, role, options = {}) {
  const cellKey = key(x, y, z);
  const normalizedDesired = normalizeNamespaced(desired);
  const protection = protectedAt(x, y, z);
  if (protection && !options.allowProtected) {
    throw new Error(`${phase}/${role} targets protected ${protection} at ${cellKey}`);
  }
  const prior = operations.get(cellKey);
  if (prior) {
    if (prior.desired === normalizedDesired) return false;
    throw new Error(
      `conflicting target at ${cellKey}: ${prior.desired} (${prior.phase}) / `
      + `${normalizedDesired} (${phase})`,
    );
  }
  const current = await sourceAt(x, y, z);
  if (current === normalizedDesired || (
    !normalizedDesired.includes('[')
    && baseName(current) === normalizedDesired
  )) {
    return false;
  }
  operations.set(cellKey, {
    x,
    y,
    z,
    current,
    desired: normalizedDesired,
    phase,
    role,
  });
  phaseCellCounts.set(phase, (phaseCellCounts.get(phase) ?? 0) + 1);
  return true;
}

async function hasFluidNeighbor(x, y, z) {
  for (const [dx, dy, dz] of [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ]) {
    if (FLUID.has(baseName(await sourceAt(x + dx, y + dy, z + dz)))) {
      return true;
    }
  }
  return false;
}

async function naturalTop(x, z, minY = 60, maxY = 118) {
  const column = await snapshot.readColumn(x, z, minY, maxY);
  if (!column) throw new Error(`missing snapshot column ${x},${z}`);
  for (let y = maxY; y >= minY; y -= 1) {
    const block = baseName(column.get(y));
    if (NATURAL_GROUND.has(block)) return { y, block };
  }
  return null;
}

async function addLandformColumn(x, z, targetY, phase, role) {
  const surface = await naturalTop(x, z);
  if (!surface) {
    skippedColumns.push({ x, z, targetY, phase, reason: 'no-natural-support' });
    return;
  }
  if (surface.y >= targetY) {
    columnResults.push({
      x,
      z,
      targetY,
      sourceNaturalY: surface.y,
      phase,
      changedCells: 0,
      outcome: 'existing-terrain-meets-profile',
    });
    return;
  }

  const candidates = [];
  for (let y = surface.y + 1; y <= targetY; y += 1) {
    const protection = protectedAt(x, y, z);
    if (protection) {
      skippedColumns.push({
        x,
        z,
        targetY,
        phase,
        reason: `protected-${protection}`,
      });
      return;
    }
    const block = await sourceAt(x, y, z);
    const base = baseName(block);
    if (FLUID.has(base)) {
      skippedColumns.push({ x, z, targetY, phase, reason: `fluid-${base}`, y });
      return;
    }
    if (AIR.has(base)) {
      candidates.push({ x, y, z });
      continue;
    }
    if (isFoliageBlock(base) || isReplaceableBlock(base)) {
      skippedColumns.push({
        x,
        z,
        targetY,
        phase,
        reason: `preserved-existing-vegetation-${base}`,
        y,
      });
      return;
    }
  }
  for (const point of candidates) {
    if (await hasFluidNeighbor(point.x, point.y, point.z)) {
      skippedColumns.push({
        x,
        z,
        targetY,
        phase,
        reason: 'fluid-neighbor',
        point: [point.x, point.y, point.z],
      });
      return;
    }
  }

  let changed = 0;
  for (const point of candidates) {
    const above = await sourceAt(point.x, point.y + 1, point.z);
    const desired = (
      point.y === targetY
      && AIR.has(baseName(above))
    )
      ? 'minecraft:grass_block[snowy=false]'
      : 'minecraft:dirt';
    if (await replace(point.x, point.y, point.z, desired, phase, role)) changed += 1;
  }
  columnResults.push({
    x,
    z,
    targetY,
    sourceNaturalY: surface.y,
    phase,
    changedCells: changed,
    outcome: changed ? 'graded-fill' : 'solid-profile-already-present',
  });
}

// West wrap: this hides the shelter crown and the hangar's west podium while
// preserving the separately enclosed public observatory stair.
for (let z = 139; z <= 180; z += 1) {
  for (let x = 145; x <= 175; x += 1) {
    const distance = 176 - x;
    const targetY = 118 - Math.ceil(distance * 0.75);
    await addLandformColumn(x, z, targetY, '01-west-landform', 'west-podium-wrap');
  }
}

// East wrap stops before the heliport and aircraft trail at z=172.
for (let z = 139; z <= 171; z += 1) {
  for (let x = 235; x <= 260; x += 1) {
    const distance = x - 235;
    const targetY = 118 - Math.ceil(distance * 0.92);
    await addLandformColumn(x, z, targetY, '02-east-landform', 'east-podium-wrap');
  }
}

// The south-west wrap conceals the blank wall while leaving the x208..238
// aircraft door, apron, and trail completely outside the package.
for (let z = 182; z <= 205; z += 1) {
  for (let x = 176; x <= 207; x += 1) {
    const distance = z - 182;
    const targetY = 118 - Math.ceil(distance * 1.05);
    await addLandformColumn(x, z, targetY, '03-south-landform', 'south-west-podium-wrap');
  }
}

// A sparse, deterministic azalea program gives the new slopes natural depth
// without growing trees or replacing any existing vegetation.
for (const column of columnResults) {
  if (!column.changedCells || (column.x * 31 + column.z * 17) % 29 !== 0) continue;
  const y = column.targetY + 1;
  if (!AIR.has(baseName(await projectedAt(column.x, y, column.z)))) continue;
  if (!AIR.has(baseName(await projectedAt(column.x, y + 1, column.z)))) continue;
  if (protectedAt(column.x, y, column.z)) continue;
  await replace(
    column.x,
    y,
    column.z,
    (column.x + column.z) % 2 === 0
      ? 'minecraft:azalea'
      : 'minecraft:flowering_azalea',
    '04-vegetation',
    'landform-shrub',
  );
}

// Six-block-wide level east-edge road. It starts one cell beyond the existing
// C01 promenade and terminates immediately before Festival Row. The road never
// enters an individual stall or the rain garden.
const roadBands = new Set([216, 226, 236, 245]);
for (let z = ROAD_MIN_Z; z <= ROAD_MAX_Z; z += 1) {
  for (let x = ROAD_MIN_X; x <= ROAD_MAX_X; x += 1) {
    const source = baseName(await sourceAt(x, 64, z));
    if (!ROAD_SOURCE.has(source)) {
      throw new Error(`road source ${source} is not approved at ${x},64,${z}`);
    }
    let desired;
    if (x === ROAD_MIN_X || x === ROAD_MAX_X) {
      desired = 'minecraft:polished_deepslate';
    } else if (roadBands.has(z)) {
      desired = 'minecraft:waxed_weathered_cut_copper';
    } else {
      desired = 'minecraft:polished_andesite';
    }
    await replace(
      x,
      64,
      z,
      desired,
      '05-east-seam-road',
      roadBands.has(z) ? 'route-confirmation-band' : 'road-surface',
      { allowProtected: false },
    );
  }
}

// Turn the existing z=231 fence marker into an authored six-wide gate. The
// fence remains on x<=119; the natural mountain wall begins at x=126.
for (let x = ROAD_MIN_X; x <= ROAD_MAX_X; x += 1) {
  for (let y = 65; y <= 67; y += 1) {
    const current = baseName(await sourceAt(x, y, 231));
    if (AIR.has(current)) continue;
    if (!new Set([
      'minecraft:birch_fence',
      'minecraft:smooth_quartz',
      'minecraft:smooth_quartz_slab',
    ]).has(current)) {
      throw new Error(`unapproved gate obstruction ${current} at ${x},${y},231`);
    }
    await replace(
      x,
      y,
      231,
      'minecraft:air',
      '06-authored-gate',
      'road-gate-clearance',
      { allowProtected: true },
    );
  }
}

async function pylon(x, z, sourceY, phase, id) {
  for (let y = sourceY; y <= sourceY + 2; y += 1) {
    if (!AIR.has(baseName(await sourceAt(x, y, z)))) {
      throw new Error(`${id} pylon cell is not air at ${x},${y},${z}`);
    }
    await replace(x, y, z, 'minecraft:smooth_quartz', phase, `${id}-pylon`);
  }
}

// North entry marker, outside the road clear width.
await pylon(119, 207, 65, '07-wayfinding', 'north-directory');
await replace(
  119,
  66,
  208,
  'minecraft:oak_wall_sign[facing=south,waterlogged=false]',
  '07-wayfinding',
  'north-directory-sign',
);
commandOperations.push({
  phase: '07-wayfinding',
  role: 'north-directory-text',
  line: 'CMD execute if block 119 66 208 '
    + 'minecraft:oak_wall_sign[facing=south,waterlogged=false] '
    + 'run data merge block 119 66 208 '
    + '{front_text:{color:"black",has_glowing_text:1b,messages:['
    + `'{"text":"C01 PUBLIC ENTRY"}',`
    + `'{"text":"NORTH / UP ROAD"}',`
    + `'{"text":"PARKING SOUTH"}',`
    + `'{"text":"OBS LANDMARK"}'`
    + ']}}',
});

// Reuse the last surviving fence cell at x119 as a boundary/gate monument.
await replace(
  119,
  65,
  231,
  'minecraft:smooth_quartz',
  '07-wayfinding',
  'boundary-gate-pylon',
);
for (const y of [66, 67]) {
  await replace(
    119,
    y,
    231,
    'minecraft:smooth_quartz',
    '07-wayfinding',
    'boundary-gate-pylon',
  );
}
for (const sign of [
  {
    point: [119, 66, 230],
    state: 'minecraft:oak_wall_sign[facing=north,waterlogged=false]',
    id: 'gate-north',
    messages: [
      'PARKING SOUTH',
      'FESTIVAL ROW',
      'C01 NORTH',
      'EAST EDGE ROAD',
    ],
  },
  {
    point: [119, 66, 232],
    state: 'minecraft:oak_wall_sign[facing=south,waterlogged=false]',
    id: 'gate-south',
    messages: [
      'C01 PUBLIC',
      'ENTRY NORTH',
      'PARKING SOUTH',
      'OBS LANDMARK',
    ],
  },
]) {
  await replace(...sign.point, sign.state, '07-wayfinding', `${sign.id}-sign`);
  commandOperations.push({
    phase: '07-wayfinding',
    role: `${sign.id}-text`,
    line: `CMD execute if block ${sign.point.join(' ')} ${sign.state} `
      + `run data merge block ${sign.point.join(' ')} `
      + '{front_text:{color:"black",has_glowing_text:1b,messages:['
      + sign.messages.map((message) => `'{"text":"${message}"}'`).join(',')
      + ']}}',
  });
}

function mergeCells(cells) {
  const ordered = [...cells].map((cell) => ({
    ...cell,
    runtimeOrder: cell.runtimeOrder ?? 0,
    guardCurrent: cell.guardCurrent ?? cell.current,
  })).sort((a, b) => (
    a.runtimeOrder - b.runtimeOrder
    || a.phase.localeCompare(b.phase)
    || a.guardCurrent.localeCompare(b.guardCurrent)
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
      && prior.guardCurrent === cell.guardCurrent
      && prior.current === cell.current
      && prior.desired === cell.desired
      && prior.role === cell.role
      && prior.y1 === cell.y
      && prior.y2 === cell.y
      && prior.z1 === cell.z
      && prior.z2 === cell.z
      && prior.x2 + 1 === cell.x
    ) {
      prior.x2 = cell.x;
    } else {
      xRuns.push({
        runtimeOrder: cell.runtimeOrder,
        phase: cell.phase,
        role: cell.role,
        guardCurrent: cell.guardCurrent,
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
    || a.guardCurrent.localeCompare(b.guardCurrent)
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
      && prior.guardCurrent === run.guardCurrent
      && prior.current === run.current
      && prior.desired === run.desired
      && prior.role === run.role
      && prior.y1 === run.y1
      && prior.y2 === run.y2
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
    || a.guardCurrent.localeCompare(b.guardCurrent)
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
      && prior.guardCurrent === rect.guardCurrent
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

async function facadeExposure(face) {
  let manufactured = 0;
  let exposedBefore = 0;
  let exposedAfter = 0;
  for (let first = face.firstMin; first <= face.firstMax; first += 1) {
    for (let y = face.minY; y <= face.maxY; y += 1) {
      const x = face.axis === 'x' ? face.fixed : first;
      const z = face.axis === 'z' ? face.fixed : first;
      const adjacentX = x + face.dx;
      const adjacentZ = z + face.dz;
      const wall = baseName(await sourceAt(x, y, z));
      if (AIR.has(wall) || FLUID.has(wall) || NATURAL_GROUND.has(wall)) continue;
      manufactured += 1;
      const before = baseName(await sourceAt(adjacentX, y, adjacentZ));
      const after = baseName(await projectedAt(adjacentX, y, adjacentZ));
      if (AIR.has(before) || isFoliageBlock(before) || isReplaceableBlock(before)) {
        exposedBefore += 1;
      }
      if (AIR.has(after) || isFoliageBlock(after) || isReplaceableBlock(after)) {
        exposedAfter += 1;
      }
    }
  }
  return {
    manufacturedFacadeCells: manufactured,
    exposedBefore,
    exposedAfter,
    newlyScreened: exposedBefore - exposedAfter,
    exposureReductionPercent: exposedBefore
      ? Number((((exposedBefore - exposedAfter) / exposedBefore) * 100).toFixed(1))
      : 0,
  };
}

async function scanBox(box) {
  const [x1, y1, z1, x2, y2, z2] = box;
  const counts = {};
  let fluidCells = 0;
  let missingColumns = 0;
  for (let z = z1; z <= z2; z += 1) {
    for (let x = x1; x <= x2; x += 1) {
      const column = await snapshot.readColumn(x, z, y1, y2);
      if (!column) {
        missingColumns += 1;
        continue;
      }
      for (let y = y1; y <= y2; y += 1) {
        const block = baseName(column.get(y));
        counts[block] = (counts[block] ?? 0) + 1;
        if (FLUID.has(block)) fluidCells += 1;
      }
    }
  }
  return {
    box,
    volume: (x2 - x1 + 1) * (y2 - y1 + 1) * (z2 - z1 + 1),
    missingColumns,
    fluidCells,
    blockCounts: Object.fromEntries(
      Object.entries(counts).sort((a, b) => b[1] - a[1]),
    ),
  };
}

const snapshotHash = hashSnapshotDirectory(regionDir);
if (snapshotHash.sha256 !== EXPECTED_BASELINE_HASH) {
  throw new Error(
    `snapshot hash mismatch: expected ${EXPECTED_BASELINE_HASH}, got ${snapshotHash.sha256}`,
  );
}

// Validate the finished road profile directly against the projected overlay.
const roadQa = {
  width: ROAD_MAX_X - ROAD_MIN_X + 1,
  length: ROAD_MAX_Z - ROAD_MIN_Z + 1,
  supportY: 64,
  standingY: 65,
  blockedHeadroomCells: [],
  fluidCells: [],
  categoryIntersections: {
    individualParkingStalls: [],
    southeastRainGarden: [],
    festivalRow: [],
  },
};
for (let z = ROAD_MIN_Z; z <= ROAD_MAX_Z; z += 1) {
  for (let x = ROAD_MIN_X; x <= ROAD_MAX_X; x += 1) {
    for (const y of [65, 66, 67]) {
      const block = baseName(await projectedAt(x, y, z));
      if (!AIR.has(block)) roadQa.blockedHeadroomCells.push({ point: [x, y, z], block });
      if (FLUID.has(block)) roadQa.fluidCells.push({ point: [x, y, z], block });
    }
  }
}

const databasePath = path.join(ROOT, 'data/world-map.db');
let databaseParkingCheck = {
  available: false,
  individualStallCount: null,
  intersectedStallIds: [],
};
try {
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  const Database = require('better-sqlite3');
  const database = new Database(databasePath, { readonly: true });
  const stalls = database.prepare(`
    SELECT external_id, min_x, max_x, min_z, max_z
    FROM world_features
    WHERE project_id = 'mainstreet-america'
      AND kind = 'parking'
      AND external_id LIKE 'P01-BAY-%'
  `).all();
  databaseParkingCheck = {
    available: true,
    individualStallCount: stalls.length,
    intersectedStallIds: stalls
      .filter((stall) => !(
        stall.max_x < ROAD_MIN_X
        || stall.min_x > ROAD_MAX_X
        || stall.max_z < ROAD_MIN_Z
        || stall.min_z > ROAD_MAX_Z
      ))
      .map((stall) => stall.external_id),
  };
  database.close();
} catch (error) {
  databaseParkingCheck.error = error.message;
}

roadQa.categoryIntersections.individualParkingStalls =
  databaseParkingCheck.intersectedStallIds;
function phaseRuntimeOrder(phase) {
  return Number.parseInt(phase.slice(0, 2), 10) * 100;
}

function isConnectedFenceRemoval(operation) {
  return (
    operation.phase === '06-authored-gate'
    && baseName(operation.current) === 'minecraft:birch_fence'
    && operation.desired === 'minecraft:air'
  );
}

const forwardCells = [...operations.values()].map((operation) => ({
  ...operation,
  // Convert the surviving x119 fence anchor before removing its x120
  // neighbour, otherwise the exact directional source state normalizes and
  // the later strict guard no-ops.
  runtimeOrder: (
    operation.x === 119
    && operation.y === 65
    && operation.z === 231
  )
    ? 550
    : phaseRuntimeOrder(operation.phase),
  // Fence connectivity is expected to normalize while adjacent fence cells
  // are removed. For this removal-only case, guard the exact material rather
  // than a directional state that is invalidated by the preceding removal.
  guardCurrent: isConnectedFenceRemoval(operation)
    ? 'minecraft:birch_fence'
    : operation.current,
}));
const forwardBoxes = mergeCells(forwardCells);
const rollbackCells = [...operations.values()].map((operation) => ({
  ...operation,
  current: operation.desired,
  desired: operation.current,
  // Roll back dependants before support: signs before pylons and shrubs before
  // the landform surface. All other phases unwind in reverse order.
  runtimeOrder: ['minecraft:azalea', 'minecraft:flowering_azalea']
    .includes(baseName(operation.desired))
    ? 10
    : baseName(operation.desired) === 'minecraft:oak_wall_sign'
      ? 0
      : 1_000 - phaseRuntimeOrder(operation.phase),
}));
const rollbackBoxes = mergeCells(rollbackCells);
const materialExactRemovalCells = forwardCells.filter(
  (operation) => operation.guardCurrent !== operation.current,
);
const materialExactRemovalBoxes = forwardBoxes.filter(
  (operation) => operation.guardCurrent !== operation.current,
);
const materialRemovalFluidNeighbors = [];
for (const operation of materialExactRemovalCells) {
  if (await hasFluidNeighbor(operation.x, operation.y, operation.z)) {
    materialRemovalFluidNeighbors.push([operation.x, operation.y, operation.z]);
  }
}
if (
  materialExactRemovalCells.some((operation) => (
    operation.guardCurrent !== 'minecraft:birch_fence'
    || operation.desired !== 'minecraft:air'
    || !operation.current.includes('waterlogged=false')
  ))
  || materialRemovalFluidNeighbors.length > 0
) {
  throw new Error('unsafe connected-fence material-removal exception');
}

function boxLine(operation) {
  return `REPL ${operation.x1} ${operation.y1} ${operation.z1} `
    + `${operation.x2} ${operation.y2} ${operation.z2} `
    + `${operation.guardCurrent ?? operation.current} ${operation.desired}`;
}

function writeOperations(title, boxes, commands = []) {
  const lines = [
    `# ${title}`,
    `# frozen baseline: ${relative(regionDir)}`,
    `# baseline SHA-256: ${EXPECTED_BASELINE_HASH}`,
    '# Exact-source REPL guards only. No SET operation is permitted.',
    `# changed cells: ${operations.size}; guarded boxes: ${boxes.length}`,
    '',
  ];
  let phase = null;
  for (const operation of boxes) {
    if (phase !== operation.phase) {
      phase = operation.phase;
      lines.push(`# phase: ${phase}`);
    }
    lines.push(boxLine(operation));
  }
  for (const command of commands) {
    if (phase !== command.phase) {
      phase = command.phase;
      lines.push(`# phase: ${phase}`);
    }
    lines.push(command.line);
  }
  lines.push('');
  return lines.join('\n');
}

const forwardOutput = writeOperations(
  'GENERATED FILE — MainStreet bunker surface Phase 1',
  forwardBoxes,
  commandOperations,
);
const rollbackOutput = writeOperations(
  'GENERATED ROLLBACK — MainStreet bunker surface Phase 1',
  rollbackBoxes,
);
const portalStudy = await scanBox([130, 64, 184, 158, 76, 206]);
const exposure = {
  west: await facadeExposure({
    axis: 'x',
    fixed: 176,
    firstMin: 139,
    firstMax: 180,
    minY: 98,
    maxY: 118,
    dx: -1,
    dz: 0,
  }),
  east: await facadeExposure({
    axis: 'x',
    fixed: 234,
    firstMin: 139,
    firstMax: 171,
    minY: 98,
    maxY: 118,
    dx: 1,
    dz: 0,
  }),
  southWest: await facadeExposure({
    axis: 'z',
    fixed: 181,
    firstMin: 176,
    firstMax: 207,
    minY: 98,
    maxY: 118,
    dx: 0,
    dz: 1,
  }),
};

const operationMaterialCounts = {};
for (const operation of operations.values()) {
  operationMaterialCounts[operation.desired] =
    (operationMaterialCounts[operation.desired] ?? 0) + 1;
}
const sourceMaterialCounts = {};
for (const operation of operations.values()) {
  sourceMaterialCounts[operation.current] =
    (sourceMaterialCounts[operation.current] ?? 0) + 1;
}
const skippedByReason = {};
for (const column of skippedColumns) {
  skippedByReason[column.reason] = (skippedByReason[column.reason] ?? 0) + 1;
}

const forwardSha256 = hashBuffer(forwardOutput);
const rollbackSha256 = hashBuffer(rollbackOutput);
const report = {
  schemaVersion: 1,
  id: 'mainstreet-bunker-surface-phase1-2026-07-27',
  status: 'implementation-ready-live-safety-gates-pending',
  generatedAtUtc: new Date().toISOString(),
  liveWorldMutated: false,
  baseline: {
    regions: relative(regionDir),
    expectedSha256: EXPECTED_BASELINE_HASH,
    observedSha256: snapshotHash.sha256,
    hashMatched: snapshotHash.sha256 === EXPECTED_BASELINE_HASH,
    algorithm: snapshotHash.algorithm,
    regionFiles: snapshotHash.members.length,
  },
  decisions: {
    deepComplexTranslated: false,
    oldPortalRetired: false,
    observatoryTreatment: 'retained-as-sole-intentional-surface-landmark',
    hangarTreatment:
      'graded west/east/south-west landform wrap; door/trail remains a controlled surface exception',
    rationale:
      'The visible podium and parking seam can improve without moving protected rooms, routes, inventories, or the observatory.',
  },
  scope: {
    westLandform: {
      x: [145, 175],
      z: [139, 180],
      targetProfile: 'y=118-ceil((176-x)*0.75)',
    },
    eastLandform: {
      x: [235, 260],
      z: [139, 171],
      targetProfile: 'y=118-ceil((x-235)*0.92)',
    },
    southWestLandform: {
      x: [176, 207],
      z: [182, 205],
      targetProfile: 'y=118-ceil((z-182)*1.05)',
    },
    eastEdgeRoad: {
      bounds: [ROAD_MIN_X, 64, ROAD_MIN_Z, ROAD_MAX_X, 64, ROAD_MAX_Z],
      width: roadQa.width,
      length: roadQa.length,
      standingY: roadQa.standingY,
      northConnection: 'existing C01 public-entry promenade at z<=205',
      southConnection: 'Festival Row begins at z=246',
    },
    gate: {
      bounds: [ROAD_MIN_X, 65, 231, ROAD_MAX_X, 67, 231],
      authoredTransition: true,
    },
  },
  protected: {
    boxes: PROTECTED_BOXES,
    loadedChestCoordinates: [...LOADED_CHESTS],
    projectFenceException:
      'Only the exact x120..125,z231 marker cells become the authored east-edge-road gate.',
    noInteriorTargets: [...operations.values()].every((operation) => (
      !PROTECTED_BOXES
        .filter((entry) => entry.id !== 'public-entry')
        .some((entry) => inside([operation.x, operation.y, operation.z], entry.box))
    )),
  },
  terrain: {
    evaluatedColumns: columnResults.length + skippedColumns.length,
    changedColumns: columnResults.filter((column) => column.changedCells > 0).length,
    unchangedColumns: columnResults.filter((column) => column.changedCells === 0).length,
    skippedColumns: skippedColumns.length,
    skippedByReason,
    changedCells: [...operations.values()]
      .filter((operation) => operation.phase.includes('landform'))
      .length,
    vegetationCells: phaseCellCounts.get('04-vegetation') ?? 0,
    maximumTargetY: Math.max(...columnResults.map((column) => column.targetY)),
    minimumTargetY: Math.min(...columnResults.map((column) => column.targetY)),
  },
  visualEffect: {
    exposedManufacturedFacade: exposure,
    acceptanceCaveat:
      'North wall, controlled aircraft door/trail, roof cornice, and OBS-S01 remain visible; this is a material Phase 1 improvement, not final zero-shell concealment acceptance.',
  },
  roadQa: {
    ...roadQa,
    databaseParkingCheck,
    passed: (
      roadQa.width === 6
      && roadQa.length === 40
      && roadQa.blockedHeadroomCells.length === 0
      && roadQa.fluidCells.length === 0
      && databaseParkingCheck.intersectedStallIds.length === 0
    ),
  },
  operations: {
    changedCellCount: operations.size,
    guardedBoxCount: forwardBoxes.length,
    commandCount: commandOperations.length,
    forward: {
      path: relative(outputPath),
      sha256: forwardSha256,
    },
    rollback: {
      path: relative(rollbackPath),
      changedCellCount: operations.size,
      guardedBoxCount: rollbackBoxes.length,
      sha256: rollbackSha256,
      requirement:
        'Preflight against a content-addressed post-release snapshot before any rollback.',
    },
    sourceMaterialCounts,
    desiredMaterialCounts: operationMaterialCounts,
    phaseCellCounts: Object.fromEntries(phaseCellCounts),
    duplicateTargetCells: 0,
    setOperationCount: 0,
  },
  runtimeSafety: {
    orderingModel:
      'dependency-aware forward order and reverse dependency rollback order',
    supportDependentRollbackFirst: {
      blocks: ['minecraft:azalea', 'minecraft:flowering_azalea', 'minecraft:oak_wall_sign'],
      vegetationCells: phaseCellCounts.get('04-vegetation') ?? 0,
      wallSignCells: 3,
      passed: true,
    },
    materialExactRemovalExceptions: [{
      sourceMaterial: 'minecraft:birch_fence',
      snapshotExactSource:
        'minecraft:birch_fence[east=true,north=false,south=false,waterlogged=false,west=true]',
      desired: 'minecraft:air',
      cells: materialExactRemovalCells.map(({ x, y, z }) => [x, y, z]),
      boxes: materialExactRemovalBoxes.map(
        ({ x1, y1, z1, x2, y2, z2 }) => [x1, y1, z1, x2, y2, z2],
      ),
      cellCount: materialExactRemovalCells.length,
      blockEntityCapable: false,
      snapshotWaterlogged: false,
      fluidNeighborCells: materialRemovalFluidNeighbors,
      rationale:
        'Removal-only guard tolerates directional fence connectivity updates; all non-connectivity state is frozen and dry.',
    }],
  },
  portalPhase2: {
    status: 'held-for-dedicated-collision-and-route-release',
    conceptCenter: [144, 66, 194],
    studyEnvelope: portalStudy,
    connectorRequirement:
      'Keep the old portal live; build and prove the new dry connector and return route before retiring any current entry cell.',
    blockingProofStillRequired: [
      'exact block-entity and entity inventory in the portal/connector volume',
      'new connector collision model against C01 room and protected-route geometry',
      'fluid-neighbor and three-natural-block cover model',
      'bidirectional no-jump reachability through the new route',
      'same-camera portal and parking acceptance',
    ],
  },
  databaseFeatures: [
    {
      externalId: 'C01-PHASE1-LANDFORM-WEST',
      parentExternalId: 'DIV-C01-SURFACE',
      projectId: 'mainstreet-america',
      kind: 'landscape',
      name: 'C01 west concealment landform',
      geometry: {
        type: 'bounds',
        minX: 145,
        minY: 93,
        minZ: 139,
        maxX: 175,
        maxY: 118,
        maxZ: 180,
      },
      source: 'guarded-operation',
      sourceRef: relative(outputPath),
      status: 'implementation-ready-pre-execution',
      qualityStatus: {
        concealment: 'projected-93.7-percent-west-facade-exposure-reduction',
        functional: 'not-a-public-route',
        legibility: 'observatory-retained-as-surface-landmark',
        media: 'before-camera-contract-defined-after-required',
      },
    },
    {
      externalId: 'C01-PHASE1-LANDFORM-EAST',
      parentExternalId: 'DIV-C01-SURFACE',
      projectId: 'mainstreet-america',
      kind: 'landscape',
      name: 'C01 east concealment landform',
      geometry: {
        type: 'bounds',
        minX: 235,
        minY: 95,
        minZ: 139,
        maxX: 260,
        maxY: 118,
        maxZ: 171,
      },
      source: 'guarded-operation',
      sourceRef: relative(outputPath),
      status: 'implementation-ready-pre-execution',
      qualityStatus: {
        concealment: 'projected-100-percent-east-facade-exposure-reduction',
        functional: 'heliport-and-trail-outside-targets',
        legibility: 'observatory-retained-as-surface-landmark',
        media: 'before-camera-contract-defined-after-required',
      },
    },
    {
      externalId: 'C01-PHASE1-LANDFORM-SOUTHWEST',
      parentExternalId: 'DIV-C01-SURFACE',
      projectId: 'mainstreet-america',
      kind: 'landscape',
      name: 'C01 southwest concealment landform',
      geometry: {
        type: 'bounds',
        minX: 176,
        minY: 93,
        minZ: 182,
        maxX: 207,
        maxY: 118,
        maxZ: 205,
      },
      source: 'guarded-operation',
      sourceRef: relative(outputPath),
      status: 'implementation-ready-pre-execution',
      qualityStatus: {
        concealment: 'projected-82-percent-southwest-facade-exposure-reduction',
        functional: 'aircraft-door-and-trail-outside-targets',
        legibility: 'controlled-door-exception-remains-visible',
        media: 'before-camera-contract-defined-after-required',
      },
    },
    {
      externalId: 'C01-EAST-EDGE-ROAD-PHASE1',
      parentExternalId: 'DIV-C01-SURFACE',
      projectId: 'mainstreet-america',
      kind: 'road',
      name: 'C01 East Edge Road',
      geometry: {
        type: 'bounds',
        minX: ROAD_MIN_X,
        minY: 64,
        minZ: ROAD_MIN_Z,
        maxX: ROAD_MAX_X,
        maxY: 67,
        maxZ: ROAD_MAX_Z,
      },
      source: 'guarded-operation',
      sourceRef: relative(outputPath),
      status: 'implementation-ready-pre-execution',
      qualityStatus: {
        concealment: 'not-applicable',
        functional: 'projected-six-wide-level-zero-stall-conflicts',
        legibility: 'route-bands-and-two-way-directory-contract-defined',
        media: 'northbound-and-southbound-before-cameras-defined',
      },
    },
    {
      externalId: 'GATE-C01-EAST-EDGE-ROAD',
      parentExternalId: 'FENCE:DIV-C01-SURFACE',
      projectId: 'mainstreet-america',
      kind: 'custom',
      name: 'C01 East Edge Road boundary gate',
      geometry: {
        type: 'bounds',
        minX: ROAD_MIN_X,
        minY: 64,
        minZ: 231,
        maxX: ROAD_MAX_X,
        maxY: 67,
        maxZ: 231,
      },
      source: 'guarded-operation',
      sourceRef: relative(outputPath),
      status: 'implementation-ready-pre-execution',
      qualityStatus: {
        concealment: 'not-applicable',
        functional: 'projected-six-wide-three-block-headroom',
        legibility: 'authored-transition-not-an-unmarked-fence-breach',
        media: 'road-before-camera-contract-defined',
      },
    },
    {
      externalId: 'C01-EAST-ROAD-DIRECTORY-NORTH',
      parentExternalId: 'C01-EAST-EDGE-ROAD-PHASE1',
      projectId: 'mainstreet-america',
      kind: 'landmark',
      name: 'C01 East Edge Road north directory',
      geometry: {
        type: 'bounds',
        minX: 119,
        minY: 65,
        minZ: 207,
        maxX: 119,
        maxY: 67,
        maxZ: 208,
      },
      source: 'guarded-operation',
      sourceRef: relative(outputPath),
      status: 'implementation-ready-pre-execution',
      qualityStatus: {
        concealment: 'not-applicable',
        functional: 'outside-six-block-road-clear-width',
        legibility: 'projected-destination-and-return-message',
        media: 'road-before-camera-contract-defined',
      },
    },
    {
      externalId: 'C01-EAST-ROAD-DIRECTORY-GATE',
      parentExternalId: 'C01-EAST-EDGE-ROAD-PHASE1',
      projectId: 'mainstreet-america',
      kind: 'landmark',
      name: 'C01 East Edge Road gate directory',
      geometry: {
        type: 'bounds',
        minX: 119,
        minY: 65,
        minZ: 230,
        maxX: 119,
        maxY: 67,
        maxZ: 232,
      },
      source: 'guarded-operation',
      sourceRef: relative(outputPath),
      status: 'implementation-ready-pre-execution',
      qualityStatus: {
        concealment: 'not-applicable',
        functional: 'outside-six-block-road-clear-width',
        legibility: 'projected-two-way-boundary-confirmation',
        media: 'road-before-camera-contract-defined',
      },
    },
    {
      externalId: 'C01-PUBLIC-PORTAL-APPROACH-PHASE1',
      parentExternalId: 'C01-PUBLIC-ENTRY',
      projectId: 'mainstreet-america',
      kind: 'custom',
      name: 'C01 public portal east approach relation',
      geometry: {
        type: 'path',
        width: 6,
        points: [
          { x: 122, y: 65, z: 231 },
          { x: 122, y: 65, z: 206 },
          { x: 116, y: 65, z: 204 },
        ],
      },
      source: 'guarded-operation',
      sourceRef: relative(outputPath),
      status: 'implementation-ready-pre-execution',
      qualityStatus: {
        concealment: 'existing-portal-remains-phase1',
        functional: 'projected-route-stitch-to-existing-promenade',
        legibility: 'north-directory-identifies-current-public-entry',
        media: 'parking-center-and-road-camera-contract-defined',
      },
    },
  ],
  acceptance: {
    snapshotHashMatched: snapshotHash.sha256 === EXPECTED_BASELINE_HASH,
    noSetOperations: true,
    exactSourceGuardsRequired: forwardBoxes.length,
    failedGuardsAllowed: 0,
    liveCommandFailuresAllowed: 0,
    roadQaPassed: roadQa.passed,
    requiredPostBuildEvidence: [
      'post-release immutable snapshot and hash',
      '100 percent forward-guard execution with zero failures',
      'post-build census of every target cell',
      'bidirectional road and C01-public-entry reachability',
      'shelter/vault 12-chest NBT reconciliation',
      'dry-shell and fluid-neighbor checks',
      'same-camera after images for every camera in the manifest',
      'database/media observations without a default condition score of 100',
    ],
  },
};

const cameraManifest = {
  schemaVersion: 1,
  id: 'mainstreet-bunker-surface-phase1-before-cameras',
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
      id: 'C01-P1-PARKING-CENTER',
      primaryFeatureId: 'C01-PUBLIC-ENTRY',
      role: 'parking-center-and-east-seam',
      eye: [75, 110, 250],
      lookAt: [116, 73, 172],
      output: '01-parking-center-east-seam.png',
    },
    {
      id: 'C01-P1-SOUTHWEST-OBLIQUE',
      primaryFeatureId: 'HGR-S01',
      role: 'west-and-south-podium-concealment',
      eye: [285, 125, 235],
      lookAt: [205, 108, 160],
      output: '02-southwest-oblique.png',
    },
    {
      id: 'C01-P1-EAST-OBLIQUE',
      primaryFeatureId: 'HGR-S01',
      role: 'east-podium-concealment',
      eye: [300, 125, 155],
      lookAt: [205, 108, 160],
      output: '03-east-oblique.png',
    },
    {
      id: 'C01-P1-HANGAR-DOOR',
      primaryFeatureId: 'HGR-S01',
      role: 'controlled-door-and-trail-exception',
      eye: [205, 105, 245],
      lookAt: [205, 108, 175],
      output: '04-hangar-door.png',
    },
    {
      id: 'C01-P1-NORTH-OBLIQUE',
      primaryFeatureId: 'OBS-S01',
      role: 'observatory-landmark-and-north-caveat',
      eye: [205, 125, 90],
      lookAt: [205, 108, 160],
      output: '05-north-oblique.png',
    },
    {
      id: 'C01-P1-ROAD-NORTHBOUND',
      primaryFeatureId: 'C01-PUBLIC-ENTRY',
      role: 'east-edge-road-and-authored-gate',
      eye: [122, 67, 243],
      lookAt: [122, 66, 207],
      output: '06-road-northbound.png',
    },
    {
      id: 'C01-P1-ROAD-SOUTHBOUND',
      primaryFeatureId: 'P01',
      role: 'east-edge-road-return',
      eye: [122, 67, 207],
      lookAt: [122, 66, 245],
      output: '07-road-southbound.png',
    },
    {
      id: 'C01-P1-SURFACE-MAP',
      primaryFeatureId: 'C01',
      role: 'surface-context-map',
      mode: 'map',
      center: [195, 190],
      span: 190,
      output: '08-surface-map.png',
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
  changedCells: operations.size,
  guardedBoxes: forwardBoxes.length,
  commands: commandOperations.length,
  phaseCellCounts: Object.fromEntries(phaseCellCounts),
  roadQaPassed: roadQa.passed,
  facadeExposure: exposure,
  portalPhase2FluidCells: portalStudy.fluidCells,
}, null, 2));
