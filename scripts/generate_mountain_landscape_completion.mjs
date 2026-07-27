#!/usr/bin/env node
/**
 * Complete the MainStreet mountain landscape without touching the operational
 * cores. The build has two jobs:
 *
 * 1. turn the abrupt x=125/126 parking-to-mountain cut into three planted,
 *    four-block retaining terraces; and
 * 2. berm the exposed lower hangar walls and feather the south property scarp
 *    into dry land while preserving the lake, project fences, heliport, shaft,
 *    public entry, and hangar/trail circulation.
 *
 * Every terrain fill is derived from the refreshed Anvil snapshot. Authored
 * surfaces cause a column to be skipped, not overwritten.
 */

import fs from 'fs';
import path from 'path';

import {
  AnvilSnapshot,
  isAirBlock,
  isFoliageBlock,
  isReplaceableBlock,
} from './generate_picket_fence.mjs';

const regionDir = process.argv[2] ?? 'data/worldsnap/region';
const outputPath = process.argv[3]
  ?? 'data/buildops/mainstreet-mountain-landscape-completion-2026-07-26.txt';
const reportPath = outputPath.replace(/\.txt$/, '.report.json');
const snapshot = new AnvilSnapshot(regionDir);
const ops = [];

const NATURAL = new Set([
  'minecraft:stone',
  'minecraft:dirt',
  'minecraft:grass_block',
  'minecraft:coarse_dirt',
  'minecraft:rooted_dirt',
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
  'minecraft:snow',
  'minecraft:snow_block',
]);

const report = {
  schemaVersion: 1,
  id: 'mainstreet-america-mountain-landscape-completion',
  generatedAtUtc: new Date().toISOString(),
  snapshot: regionDir,
  scopes: {
    parkingMountainTerraces: {
      x: [126, 134],
      z: [177, 228],
      levels: [68, 72, 76],
      publicEntryGateClear: { x: [126, 135], z: [168, 176] },
    },
    southScarp: {
      x: [126, 294],
      z: [232, 240],
      waterExclusion: [141, 159],
    },
    hangarBerms: {
      west: { x: [166, 175], z: [139, 180] },
      east: { x: [235, 242], z: [139, 170] },
      southwest: { x: [177, 207], z: [182, 190] },
    },
  },
  protected: {
    publicEntry: { x: [108, 139], y: [64, 76], z: [153, 173] },
    hangar: { x: [176, 234], y: [98, 139], z: [138, 181] },
    hangarDoorAndTrail: { x: [208, 238], y: [88, 116], z: [180, 191] },
    shaft: { x: [198, 202], y: [24, 106], z: [151, 156] },
    heliport: { x: [238, 257], y: [88, 89], z: [172, 191] },
    projectFencePlanes: [
      { axis: 'x', fixed: 90 },
      { axis: 'x', fixed: 135 },
      { axis: 'x', fixed: 294 },
      { axis: 'z', fixed: 135 },
      { axis: 'z', fixed: 231 },
    ],
    lakeWater: { x: [141, 159], z: [232, 240] },
  },
  terrain: {
    cutColumns: 0,
    fillColumns: 0,
    skippedAuthoredColumns: [],
    skippedWaterColumns: [],
    surfaceCells: 0,
  },
  fixtures: {
    retainingFaces: 0,
    shrubs: 0,
    flowers: 0,
    lights: 0,
    benches: 0,
  },
  errors: [],
};

function baseName(block) {
  return String(block).split('[', 1)[0];
}

function set(x1, y1, z1, x2, y2, z2, block, area, role) {
  ops.push({
    line: `SET ${x1} ${y1} ${z1} ${x2} ${y2} ${z2} ${block}`,
    box: [x1, y1, z1, x2, y2, z2],
    area,
    role,
  });
}

function repl(x1, y1, z1, x2, y2, z2, expected, desired, area, role) {
  ops.push({
    line: `REPL ${x1} ${y1} ${z1} ${x2} ${y2} ${z2} ${expected} ${desired}`,
    box: [x1, y1, z1, x2, y2, z2],
    area,
    role,
  });
}

async function readColumn(x, z, minY = 40, maxY = 139) {
  const column = await snapshot.readColumn(x, z, minY, maxY);
  if (!column) throw new Error(`missing snapshot column ${x},${z}`);
  return column;
}

function isEmpty(block) {
  return isAirBlock(block) || isFoliageBlock(block) || isReplaceableBlock(block);
}

function isWater(block) {
  return baseName(block) === 'minecraft:water';
}

async function surface(column, minY = 40, maxY = 139) {
  for (let y = maxY; y >= minY; y -= 1) {
    const block = baseName(column.get(y));
    if (isEmpty(block)) continue;
    return { y, block };
  }
  return null;
}

function hasAuthoredBlock(column, y1, y2) {
  for (let y = y1; y <= y2; y += 1) {
    const block = baseName(column.get(y));
    if (isEmpty(block) || NATURAL.has(block)) continue;
    return { y, block };
  }
  return null;
}

async function cutNaturalColumn(x, z, targetY, area) {
  const column = await readColumn(x, z);
  const top = await surface(column);
  if (!top || top.y <= targetY) return false;
  const authored = hasAuthoredBlock(column, targetY + 1, top.y);
  if (authored) {
    report.terrain.skippedAuthoredColumns.push({ x, z, targetY, ...authored });
    return false;
  }
  // The complete vertical span was just proven natural against this snapshot,
  // so a single SET is both safe and much less likely to stall on a 2-vCPU
  // server than expanding a material mask into 18 separate /fill commands.
  set(x, targetY + 1, z, x, top.y, z, 'minecraft:air', area, 'terrain_cut');
  set(x, targetY, z, x, targetY, z, 'minecraft:grass_block', area, 'terrace_surface');
  report.terrain.cutColumns += 1;
  report.terrain.surfaceCells += 1;
  return true;
}

async function fillNaturalColumn(x, z, targetY, area) {
  const column = await readColumn(x, z);
  const top = await surface(column);
  if (!top || top.y >= targetY) return false;
  if (isWater(top.block)) {
    report.terrain.skippedWaterColumns.push({ x, z, y: top.y });
    return false;
  }
  if (!NATURAL.has(top.block)) {
    report.terrain.skippedAuthoredColumns.push({ x, z, targetY, y: top.y, block: top.block });
    return false;
  }
  const authored = hasAuthoredBlock(column, top.y + 1, targetY);
  if (authored) {
    report.terrain.skippedAuthoredColumns.push({ x, z, targetY, ...authored });
    return false;
  }
  if (targetY > top.y + 1) {
    set(x, top.y + 1, z, x, targetY - 1, z, 'minecraft:dirt', area, 'terrain_fill');
  }
  set(x, targetY, z, x, targetY, z, 'minecraft:grass_block', area, 'landscape_surface');
  report.terrain.fillColumns += 1;
  report.terrain.surfaceCells += 1;
  return true;
}

// ── Parking-to-mountain terraces ───────────────────────────────────────
// Three shallow planted shelves replace the abrupt 12–24 block raw cut. The
// existing public portal and its z=168..176 fence opening remain untouched.
for (let z = 177; z <= 228; z += 1) {
  for (let x = 126; x <= 134; x += 1) {
    const targetY = x <= 128 ? 68 : x <= 131 ? 72 : 76;
    await cutNaturalColumn(x, z, targetY, 'ML-01');
  }
}

const retainingTiers = [
  { x: 126, y1: 65, y2: 68 },
  { x: 129, y1: 69, y2: 72 },
  { x: 132, y1: 73, y2: 76 },
];
for (const tier of retainingTiers) {
  set(tier.x, tier.y1, 177, tier.x, tier.y2, 228, 'minecraft:stone_bricks', 'ML-01', 'retaining_wall');
  for (let z = 180; z <= 228; z += 8) {
    set(tier.x, tier.y1 + 1, z, tier.x, tier.y1 + 2, z, 'minecraft:mossy_stone_bricks', 'ML-01', 'retaining_wall_accent');
    set(tier.x, tier.y2 + 2, z, tier.x, tier.y2 + 2, z, 'minecraft:azalea_leaves', 'ML-01', 'terrace_shrub');
    report.fixtures.retainingFaces += tier.y2 - tier.y1 + 1;
    report.fixtures.shrubs += 1;
  }
}

// A continuous pale cap and two quiet sitting bays make the tiers read as
// deliberate garden architecture from the parking lot.
for (const tier of retainingTiers) {
  set(tier.x, tier.y2 + 1, 177, tier.x, tier.y2 + 1, 228, 'minecraft:smooth_stone_slab[type=bottom]', 'ML-01', 'retaining_cap');
}
for (const z of [188, 216]) {
  set(127, 69, z, 127, 69, z + 3, 'minecraft:quartz_stairs[facing=west]', 'ML-01', 'terrace_bench');
  set(130, 73, z, 130, 73, z + 3, 'minecraft:quartz_stairs[facing=west]', 'ML-01', 'terrace_bench');
  report.fixtures.benches += 8;
}
for (const [x, y, z] of [
  [126, 69, 179], [126, 69, 227],
  [129, 73, 179], [129, 73, 227],
  [132, 77, 179], [132, 77, 227],
]) {
  set(x, y, z, x, y + 1, z, 'minecraft:andesite_wall', 'ML-01', 'terrace_light_post');
  set(x, y + 2, z, x, y + 2, z, 'minecraft:lantern', 'ML-01', 'terrace_light');
  report.fixtures.lights += 1;
}
for (let z = 181; z <= 225; z += 4) {
  const flower = z % 8 === 1 ? 'minecraft:white_tulip' : 'minecraft:blue_orchid';
  set(128, 69, z, 128, 69, z, flower, 'ML-01', 'terrace_flower');
  set(131, 73, z + 1, 131, 73, z + 1, flower, 'ML-01', 'terrace_flower');
  set(134, 77, z, 134, 77, z, flower, 'ML-01', 'terrace_flower');
  report.fixtures.flowers += 3;
}

// ── South scarp feathering ─────────────────────────────────────────────
// Preserve the lake inlet exactly. Dry columns outside the south fence are
// raised into a one-block-per-course downslope; high natural columns are left
// alone, so this never bulldozes the existing shore or field.
for (let x = 126; x <= 294; x += 1) {
  if (x >= 141 && x <= 159) continue;
  for (let z = 232; z <= 240; z += 1) {
    const targetY = 76 - (z - 231);
    await fillNaturalColumn(x, z, targetY, 'ML-04');
  }
}

// A planted overlook line inside the fence hides the remaining water-facing
// rock without placing a single block in the water exclusion.
for (const x of [164, 180, 196, 212, 228, 244, 260, 276, 290]) {
  set(x, 77, 229, x, 78, 229, 'minecraft:andesite_wall', 'ML-04', 'south_overlook_light_post');
  set(x, 79, 229, x, 79, 229, 'minecraft:lantern', 'ML-04', 'south_overlook_light');
  set(x - 2, 77, 228, x - 1, 77, 228, 'minecraft:azalea_leaves', 'ML-04', 'south_overlook_shrub');
  set(x + 1, 77, 228, x + 2, 77, 228, 'minecraft:flowering_azalea_leaves', 'ML-04', 'south_overlook_shrub');
  report.fixtures.lights += 1;
  report.fixtures.shrubs += 4;
}

// ── Hangar-integrated berms ────────────────────────────────────────────
// Target profiles stop below the lowest glazing and keep the aircraft door,
// apron, marked trail, heliport, shaft, and roof entirely out of scope.
for (let z = 139; z <= 180; z += 1) {
  for (let x = 166; x <= 175; x += 1) {
    const targetY = Math.min(101, 96 + Math.floor((x - 166) / 2));
    await fillNaturalColumn(x, z, targetY, 'ML-06-W');
  }
}
for (let z = 139; z <= 170; z += 1) {
  for (let x = 235; x <= 242; x += 1) {
    const targetY = Math.min(101, 101 - Math.floor((x - 235) / 2));
    await fillNaturalColumn(x, z, targetY, 'ML-06-E');
  }
}
for (let z = 182; z <= 190; z += 1) {
  for (let x = 177; x <= 207; x += 1) {
    const targetY = Math.max(92, 101 - (z - 181));
    await fillNaturalColumn(x, z, targetY, 'ML-06-SW');
  }
}

for (const [x, y, z] of [
  [170, 99, 145], [170, 99, 157], [170, 99, 173],
  [238, 101, 145], [238, 101, 157], [238, 101, 168],
  [184, 98, 185], [196, 97, 186], [204, 96, 187],
]) {
  set(x, y, z, x + 1, y, z + 1, 'minecraft:flowering_azalea_leaves', 'ML-06', 'hangar_berm_shrub');
  report.fixtures.shrubs += 4;
}
for (const [x, y, z] of [
  [168, 98, 151], [168, 98, 176], [240, 100, 151], [236, 102, 169],
]) {
  set(x, y, z, x, y + 1, z, 'minecraft:andesite_wall', 'ML-06', 'berm_light_post');
  set(x, y + 2, z, x, y + 2, z, 'minecraft:lantern', 'ML-06', 'berm_light');
  report.fixtures.lights += 1;
}

function intersects(box, protectedBox) {
  const [x1, y1, z1, x2, y2, z2] = box;
  return (
    x1 <= protectedBox.x[1] && x2 >= protectedBox.x[0]
    && y1 <= protectedBox.y[1] && y2 >= protectedBox.y[0]
    && z1 <= protectedBox.z[1] && z2 >= protectedBox.z[0]
  );
}

for (const operation of ops) {
  for (const [name, protectedBox] of Object.entries(report.protected)) {
    if (!protectedBox?.x || !protectedBox?.y || !protectedBox?.z) continue;
    if (intersects(operation.box, protectedBox)) {
      report.errors.push(`${operation.area}/${operation.role} intersects ${name}: ${operation.line}`);
    }
  }
  const [x1, , z1, x2, , z2] = operation.box;
  if (x1 <= 159 && x2 >= 141 && z1 <= 240 && z2 >= 232) {
    report.errors.push(`${operation.area}/${operation.role} intersects protected lake water: ${operation.line}`);
  }
}

report.operationCount = ops.length;
report.commandCount = ops.reduce((count, operation) => {
  const [x1, y1, z1, x2, y2, z2] = operation.box;
  const volume = (Math.abs(x2 - x1) + 1) * (Math.abs(y2 - y1) + 1) * (Math.abs(z2 - z1) + 1);
  return count + Math.max(1, Math.ceil(volume / 32768));
}, 0);

const output = [
  '# GENERATED FILE — MainStreet mountain landscape completion',
  `# snapshot: ${regionDir}`,
  '# Protected: public portal, hangar, shaft, door/trail, heliport, project fence planes, lake water.',
  `# operations: ${ops.length}`,
  '',
  ...ops.map((operation) => operation.line),
  '',
].join('\n');

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, output);
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify({
  output: outputPath,
  report: reportPath,
  operationCount: report.operationCount,
  commandCount: report.commandCount,
  terrain: report.terrain,
  fixtures: report.fixtures,
  errors: report.errors,
}, null, 2));
if (report.errors.length) process.exitCode = 1;
