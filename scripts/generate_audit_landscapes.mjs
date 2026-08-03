#!/usr/bin/env node
/**
 * Finish the two open landscape audit scopes without touching their protected
 * cores: L01 water/liner and L02 billboard. Pond paths and safety rails are
 * terrain-derived from the latest local snapshot; monument cuts are limited to
 * the explicitly audited natural-material wings and rear frontage.
 */

import fs from 'fs';
import path from 'path';

import {
  AnvilSnapshot,
  findSafeSupport,
  isAirBlock,
  isFoliageBlock,
  isReplaceableBlock,
} from './generate_picket_fence.mjs';

const regionDir = process.argv[2] ?? 'data/worldsnap/region';
const outputPath = process.argv[3]
  ?? 'data/buildops/mainstreet-audit-landscapes-2026-07-26.txt';
const reportPath = outputPath.replace(/\.txt$/, '.report.json');
const snapshot = new AnvilSnapshot(regionDir);
const ops = [];
const report = {
  schemaVersion: 1,
  id: 'mainstreet-america-audit-landscapes',
  generatedAtUtc: new Date().toISOString(),
  snapshot: regionDir,
  protected: {
    pondWaterCore: { x: [168, 212], y: [60, 63], z: [-272, -228] },
    billboard: { x: [84, 106], y: [63, 83], z: [267, 278] },
    parkingNorthLimit: 268,
  },
  pond: {
    pathCells: 0,
    fenceColumns: 0,
    gateColumns: 0,
    waterSupports: [],
    collisions: [],
    foliageTrimmed: 0,
  },
  monument: {
    protectedCoreOperations: 0,
    terraceLevels: [64, 68, 72],
  },
};

function baseName(block) {
  return String(block).split('[', 1)[0];
}

function repl(x1, y1, z1, x2, y2, z2, expected, desired, tag) {
  ops.push({
    line: `REPL ${x1} ${y1} ${z1} ${x2} ${y2} ${z2} ${expected} ${desired}`,
    tag,
    box: [x1, y1, z1, x2, y2, z2],
  });
}

function set(x1, y1, z1, x2, y2, z2, block, tag) {
  ops.push({
    line: `SET ${x1} ${y1} ${z1} ${x2} ${y2} ${z2} ${block}`,
    tag,
    box: [x1, y1, z1, x2, y2, z2],
  });
}

function pointKey(x, z) {
  return `${x},${z}`;
}

// ── L01: terrain-following ecology walk ─────────────────────────────────
for (let x = 160; x <= 220; x += 1) {
  for (let z = -280; z <= -220; z += 1) {
    const distance = Math.hypot(x - 190, z + 250);
    if (distance < 25 || distance > 28) continue;
    const column = await snapshot.readColumn(x, z, -64, 100);
    const support = findSafeSupport(column, -64, 100, isFoliageBlock);
    if (support.kind !== 'land' || support.y === null) continue;
    repl(x, support.y, z, x, support.y, z, support.block, 'minecraft:packed_mud', 'pond_path');
    report.pond.pathCells += 1;
    for (let y = support.y + 1; y <= support.y + 3; y += 1) {
      const existing = column.get(y);
      if (!isAirBlock(existing) && (isFoliageBlock(existing) || isReplaceableBlock(existing))) {
        repl(x, y, z, x, y, z, baseName(existing), 'minecraft:air', 'pond_path_clearance');
        report.pond.foliageTrimmed += 1;
      }
    }
  }
}

// Build a continuous orthogonal approximation of the radius-23 safety edge.
const sampledRing = [];
for (let angle = 0; angle < 360; angle += 1) {
  const radians = angle * Math.PI / 180;
  sampledRing.push({
    x: Math.round(190 + 23 * Math.cos(radians)),
    z: Math.round(-250 + 23 * Math.sin(radians)),
  });
}
const ring = [];
for (let index = 0; index < sampledRing.length; index += 1) {
  const from = sampledRing[index];
  const to = sampledRing[(index + 1) % sampledRing.length];
  let x = from.x;
  let z = from.z;
  ring.push({ x, z });
  while (x !== to.x) {
    x += Math.sign(to.x - x);
    ring.push({ x, z });
  }
  while (z !== to.z) {
    z += Math.sign(to.z - z);
    ring.push({ x, z });
  }
}
const uniqueRing = [...new Map(ring.map((point) => [pointKey(point.x, point.z), point])).values()];
const isPondGate = ({ x, z }) => (
  (x <= 168 && z >= -252 && z <= -248)
  || (x >= 212 && z >= -252 && z <= -248)
  || (z <= -272 && x >= 188 && x <= 192)
  || (z >= -228 && x >= 188 && x <= 192)
);

for (const point of uniqueRing) {
  if (isPondGate(point)) {
    report.pond.gateColumns += 1;
    continue;
  }
  const column = await snapshot.readColumn(point.x, point.z, -64, 100);
  const support = findSafeSupport(column, -64, 100, isFoliageBlock);
  if (support.kind === 'water') {
    report.pond.waterSupports.push({ ...point, y: support.y });
    continue;
  }
  if (support.kind !== 'land' || support.y === null) {
    report.pond.collisions.push({ ...point, reason: support.kind });
    continue;
  }
  const y = support.y + 1;
  const existing = column.get(y);
  if (
    !isAirBlock(existing)
    && !isReplaceableBlock(existing)
    && !isFoliageBlock(existing)
    && baseName(existing) !== 'minecraft:birch_fence'
  ) {
    report.pond.collisions.push({ ...point, y, existing });
    continue;
  }
  if (baseName(existing) !== 'minecraft:birch_fence') {
    repl(point.x, y, point.z, point.x, y, point.z, baseName(existing), 'minecraft:birch_fence', 'pond_safety_fence');
  }
  report.pond.fenceColumns += 1;
}

// Four unmistakable gate piers, a dry east overlook, seating, and low lights.
const pondPiers = [
  [167, -253], [167, -247], [213, -253], [213, -247],
  [187, -273], [193, -273], [187, -227], [193, -227],
];
for (const [x, z] of pondPiers) {
  const column = await snapshot.readColumn(x, z, -64, 100);
  const support = findSafeSupport(column, -64, 100, isFoliageBlock);
  if (support.kind !== 'land' || support.y === null) continue;
  set(x, support.y + 1, z, x, support.y + 2, z, 'minecraft:smooth_quartz', 'pond_gate_pier');
  set(x, support.y + 3, z, x, support.y + 3, z, 'minecraft:sea_lantern', 'pond_gate_light');
}
set(214, 64, -254, 220, 67, -246, 'minecraft:stone_bricks', 'pond_overlook_foundation');
set(214, 68, -254, 220, 68, -246, 'minecraft:birch_planks', 'pond_overlook_deck');
// A stair block cannot be stacked four-high in one column. Approach the deck
// along the dry east bank, turn south, and rise one block per course without
// touching the protected pond-water core (which ends at x=212).
set(213, 65, -252, 213, 68, -248, 'minecraft:air', 'pond_superseded_stair_clear');
for (let step = 0; step < 4; step += 1) {
  const z = -249 + step;
  const y = 64 + step;
  set(213, 64, z, 213, y - 1, z, 'minecraft:stone_bricks', 'pond_overlook_stair_foundation');
  set(213, y, z, 213, y, z, 'minecraft:stone_brick_stairs[facing=south]', 'pond_overlook_stair');
  set(213, y + 1, z, 213, 72, z, 'minecraft:air', 'pond_overlook_stair_clearance');
}
set(214, 69, -246, 216, 71, -246, 'minecraft:air', 'pond_overlook_gate');
set(220, 69, -254, 220, 69, -246, 'minecraft:birch_fence', 'pond_overlook_rail');
set(214, 69, -254, 219, 69, -254, 'minecraft:birch_fence', 'pond_overlook_rail');
set(214, 69, -246, 219, 69, -246, 'minecraft:birch_fence', 'pond_overlook_rail');
set(216, 69, -252, 218, 69, -252, 'minecraft:birch_stairs[facing=east]', 'pond_overlook_bench');
set(220, 70, -254, 220, 70, -254, 'minecraft:lantern', 'pond_overlook_light');
set(220, 70, -246, 220, 70, -246, 'minecraft:lantern', 'pond_overlook_light');

// ── L02: preserve the billboard; terrace only audited natural cut areas ──
const natural = [
  'minecraft:stone', 'minecraft:dirt', 'minecraft:grass_block',
  'minecraft:coarse_dirt', 'minecraft:rooted_dirt', 'minecraft:gravel',
  'minecraft:granite', 'minecraft:diorite', 'minecraft:andesite',
  'minecraft:tuff', 'minecraft:calcite',
  'minecraft:oak_log', 'minecraft:oak_leaves',
  'minecraft:birch_log', 'minecraft:birch_leaves',
  'minecraft:acacia_log', 'minecraft:acacia_leaves',
].join(',');
repl(75, 65, 269, 83, 90, 289, natural, 'minecraft:air', 'monument_west_cut');
repl(107, 65, 269, 115, 90, 289, natural, 'minecraft:air', 'monument_east_cut');
repl(87, 65, 279, 103, 90, 289, natural, 'minecraft:air', 'monument_rear_cut');

// Three landscaped levels, retaining walls, a central stair, beds, seats, and lights.
set(82, 64, 279, 108, 64, 283, 'minecraft:smooth_stone', 'monument_lower_terrace');
set(76, 65, 284, 114, 68, 287, 'minecraft:stone_bricks', 'monument_middle_retaining');
set(77, 69, 284, 113, 69, 287, 'minecraft:polished_andesite', 'monument_middle_terrace');
set(76, 69, 288, 114, 72, 291, 'minecraft:stone_bricks', 'monument_upper_retaining');
set(77, 73, 288, 113, 73, 291, 'minecraft:smooth_stone', 'monument_upper_terrace');
repl(77, 74, 288, 113, 90, 291, natural, 'minecraft:air', 'monument_upper_terrace_clearance');

for (let z = 279; z <= 291; z += 1) {
  const y = z <= 283 ? 64 : z <= 287 ? 69 : 73;
  set(93, y, z, 97, y, z, 'minecraft:polished_andesite', 'monument_central_walk');
}
// One continuous nine-course stair replaces the two buried four-course
// flights. It opens laterally onto the middle terrace at z=287 and the upper
// terrace at z=291, so both levels work in both directions.
set(93, 65, 284, 97, 76, 292, 'minecraft:air', 'monument_superseded_stair_clear');
for (let step = 0; step < 9; step += 1) {
  const y = 65 + step;
  const z = 284 + step;
  set(93, 64, z, 97, y - 1, z, 'minecraft:stone_bricks', 'monument_stair_foundation');
  set(93, y, z, 97, y, z, 'minecraft:stone_brick_stairs[facing=south]', 'monument_continuous_stair');
  set(93, y + 1, z, 97, 76, z, 'minecraft:air', 'monument_stair_clearance');
}

set(78, 70, 285, 90, 70, 286, 'minecraft:moss_block', 'monument_west_bed');
set(100, 70, 285, 112, 70, 286, 'minecraft:moss_block', 'monument_east_bed');
for (const x of [79, 82, 85, 88, 101, 104, 107, 110]) {
  set(x, 71, 285, x, 71, 285, x % 2 ? 'minecraft:white_tulip' : 'minecraft:blue_orchid', 'monument_planting');
}
set(84, 65, 281, 88, 65, 281, 'minecraft:quartz_stairs[facing=south]', 'monument_seat');
set(102, 65, 281, 106, 65, 281, 'minecraft:quartz_stairs[facing=south]', 'monument_seat');
for (const [x, y, z] of [[82, 64, 279], [108, 64, 279], [78, 69, 284], [112, 69, 284], [78, 73, 289], [112, 73, 289]]) {
  set(x, y, z, x, y, z, 'minecraft:sea_lantern', 'monument_low_light');
}

for (const operation of ops) {
  const [x1, y1, z1, x2, y2, z2] = operation.box;
  const touchesBillboard = (
    x1 <= 106 && x2 >= 84
    && y1 <= 83 && y2 >= 63
    && z1 <= 278 && z2 >= 267
  );
  if (touchesBillboard) report.monument.protectedCoreOperations += 1;
}

const errors = [];
if (report.pond.waterSupports.length) errors.push('pond safety fence has water supports');
if (report.pond.collisions.length) errors.push('pond safety fence has collisions');
if (report.monument.protectedCoreOperations) errors.push('an operation intersects the protected billboard box');
report.errors = errors;
report.operationCount = ops.length;

const output = [
  '# GENERATED FILE — L01 pond and L02 monument audit completion',
  `# snapshot: ${regionDir}`,
  '# Protected: pond water/liner and billboard core receive no operations.',
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
  operationCount: ops.length,
  pond: report.pond,
  monument: report.monument,
  errors,
}, null, 2));
if (errors.length) process.exitCode = 1;
