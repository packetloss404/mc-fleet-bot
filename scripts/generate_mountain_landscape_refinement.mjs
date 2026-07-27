#!/usr/bin/env node
/**
 * Visual-QA refinement for the mountain landscape completion.
 *
 * The first pass proved all protected cores safe, but the hangar's east berm
 * held its full height too far south and read as a rectangular grass wall from
 * the heliport approach. This pass compares the preserved pre-landscape
 * snapshot with the post-build snapshot, tapers that berm back to the original
 * landform by z=165, and turns the parking-side retaining face into a planted
 * green wall.
 */

import fs from 'fs';
import path from 'path';

import {
  AnvilSnapshot,
  isAirBlock,
  isFoliageBlock,
  isReplaceableBlock,
} from './generate_picket_fence.mjs';

const beforeDir = process.argv[2] ?? 'data/worldsnap-pre-landscape-20260726/region';
const afterDir = process.argv[3] ?? 'data/worldsnap/region';
const outputPath = process.argv[4]
  ?? 'data/buildops/mainstreet-mountain-landscape-refinement-2026-07-26.txt';
const reportPath = outputPath.replace(/\.txt$/, '.report.json');
const before = new AnvilSnapshot(beforeDir);
const after = new AnvilSnapshot(afterDir);
const ops = [];
const report = {
  schemaVersion: 1,
  id: 'mainstreet-america-mountain-landscape-refinement',
  generatedAtUtc: new Date().toISOString(),
  beforeSnapshot: beforeDir,
  afterSnapshot: afterDir,
  eastBerm: {
    box: { x: [235, 242], y: [70, 105], z: [156, 170] },
    reshapedColumns: 0,
    unchangedColumns: 0,
    errors: [],
  },
  greenWall: {
    box: { x: [124, 125], y: [65, 76], z: [181, 228] },
    panels: 0,
  },
  protected: {
    hangar: { x: [176, 234], y: [98, 139], z: [138, 181] },
    heliport: { x: [238, 257], y: [88, 89], z: [172, 191] },
    trail: { x: [208, 238], y: [88, 116], z: [180, 191] },
    publicPortal: { x: [108, 139], y: [64, 76], z: [153, 176] },
    fencePlanes: [
      { axis: 'x', fixed: 90 },
      { axis: 'x', fixed: 135 },
      { axis: 'x', fixed: 294 },
      { axis: 'z', fixed: 135 },
      { axis: 'z', fixed: 231 },
    ],
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

function isEmpty(block) {
  return isAirBlock(block) || isFoliageBlock(block) || isReplaceableBlock(block);
}

async function top(snapshot, x, z) {
  const column = await snapshot.readColumn(x, z, 70, 105);
  if (!column) throw new Error(`missing snapshot column ${x},${z}`);
  for (let y = 105; y >= 70; y -= 1) {
    const block = baseName(column.get(y));
    if (isEmpty(block)) continue;
    return { y, block, column };
  }
  throw new Error(`no support in ${x},${z}`);
}

const removable = new Set([
  'minecraft:dirt',
  'minecraft:grass_block',
  'minecraft:azalea_leaves',
  'minecraft:flowering_azalea_leaves',
  'minecraft:andesite_wall',
  'minecraft:lantern',
]);

// Feather the east berm southward. The desired surface is never below the
// original terrain and never above the architectural profile from pass one.
for (let z = 156; z <= 170; z += 1) {
  for (let x = 235; x <= 242; x += 1) {
    const original = await top(before, x, z);
    const current = await top(after, x, z);
    const untapered = Math.min(101, 101 - Math.floor((x - 235) / 2));
    const desiredY = Math.max(original.y, untapered - (z - 155));
    if (current.y <= desiredY) {
      report.eastBerm.unchangedColumns += 1;
      continue;
    }
    let safe = true;
    for (let y = desiredY + 1; y <= 105; y += 1) {
      const block = baseName(current.column.get(y));
      if (isEmpty(block) || removable.has(block)) continue;
      report.eastBerm.errors.push({ x, y, z, block });
      safe = false;
      break;
    }
    if (!safe) continue;
    set(x, desiredY + 1, z, x, 105, z, 'minecraft:air', 'ML-06-E', 'berm_visual_taper');
    set(x, desiredY, z, x, desiredY, z, 'minecraft:grass_block', 'ML-06-E', 'berm_visual_surface');
    report.eastBerm.reshapedColumns += 1;
  }
}

// Replace only known raw retaining materials on the parking face; the portal,
// canopy, signs, lamps, and pavement are all outside this box or material mask.
const rawRetaining = [
  'minecraft:light_gray_concrete',
  'minecraft:gray_concrete',
  'minecraft:stone',
  'minecraft:stone_bricks',
].join(',');
repl(125, 65, 181, 125, 76, 228, rawRetaining, 'minecraft:mossy_stone_bricks', 'ML-01', 'green_retaining_face');

// Six staggered foliage panels break the long wall into garden-room scale.
const panels = [
  { z1: 181, z2: 185, y2: 69 },
  { z1: 190, z2: 194, y2: 71 },
  { z1: 199, z2: 203, y2: 69 },
  { z1: 208, z2: 212, y2: 71 },
  { z1: 217, z2: 221, y2: 69 },
  { z1: 225, z2: 228, y2: 71 },
];
for (const panel of panels) {
  set(124, 65, panel.z1, 124, panel.y2, panel.z2, 'minecraft:azalea_leaves', 'ML-01', 'green_wall_panel');
  for (let z = panel.z1; z <= panel.z2; z += 2) {
    set(123, 65, z, 123, 65, z, 'minecraft:flowering_azalea_leaves', 'ML-01', 'green_wall_planter');
  }
  report.greenWall.panels += 1;
}

if (report.eastBerm.errors.length) {
  report.errors.push('east berm refinement encountered authored blocks');
}
for (const operation of ops) {
  const [x1, y1, z1, x2, y2, z2] = operation.box;
  for (const [name, box] of Object.entries(report.protected)) {
    if (!box?.x || !box?.y || !box?.z) continue;
    if (
      x1 <= box.x[1] && x2 >= box.x[0]
      && y1 <= box.y[1] && y2 >= box.y[0]
      && z1 <= box.z[1] && z2 >= box.z[0]
    ) {
      report.errors.push(`${operation.area}/${operation.role} intersects ${name}: ${operation.line}`);
    }
  }
}

report.operationCount = ops.length;
const output = [
  '# GENERATED FILE — mountain landscape visual-QA refinement',
  `# before snapshot: ${beforeDir}`,
  `# after snapshot: ${afterDir}`,
  '# Protected: hangar, heliport, trail, portal, project fence planes.',
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
  eastBerm: report.eastBerm,
  greenWall: report.greenWall,
  errors: report.errors,
}, null, 2));
if (report.errors.length) process.exitCode = 1;
