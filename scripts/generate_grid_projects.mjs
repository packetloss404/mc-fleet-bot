#!/usr/bin/env node
/**
 * Build the first two additional MainStreet grid projects:
 *   GRID-W2 Design Lab & Maker Commons
 *   GRID-E2 Neighborhood Clubhouse & Walled Garden
 *
 * Both parcels were audited as dry/vacant and fenced before this phase. The
 * buildings have explicit rooms, circulation, windows, lighting, and connected
 * gate approaches rather than placeholder shells.
 */

import fs from 'fs';
import path from 'path';

const outputPath = process.argv[2]
  ?? 'data/buildops/mainstreet-grid-projects-2026-07-26.txt';
const reportPath = outputPath.replace(/\.txt$/, '.report.json');
const ops = [];

function set(x1, y1, z1, x2, y2, z2, block, project, role) {
  ops.push({
    line: `SET ${x1} ${y1} ${z1} ${x2} ${y2} ${z2} ${block}`,
    project,
    role,
  });
}

function repl(x1, y1, z1, x2, y2, z2, expected, desired, project, role) {
  ops.push({
    line: `REPL ${x1} ${y1} ${z1} ${x2} ${y2} ${z2} ${expected} ${desired}`,
    project,
    role,
  });
}

const natural = [
  'minecraft:stone', 'minecraft:dirt', 'minecraft:grass_block',
  'minecraft:coarse_dirt', 'minecraft:rooted_dirt', 'minecraft:gravel',
  'minecraft:granite', 'minecraft:diorite', 'minecraft:andesite',
  'minecraft:tuff', 'minecraft:calcite',
  'minecraft:oak_log', 'minecraft:oak_leaves',
  'minecraft:birch_log', 'minecraft:birch_leaves',
  'minecraft:acacia_log', 'minecraft:acacia_leaves',
].join(',');

// ── GRID-W2: Design Lab & Maker Commons ─────────────────────────────────
repl(-132, 68, -52, -96, 86, 4, natural, 'minecraft:air', 'GRID-W2', 'site_clearance');
set(-132, 63, -52, -96, 66, 4, 'minecraft:stone_bricks', 'GRID-W2', 'foundation');
set(-132, 67, -52, -96, 67, 4, 'minecraft:polished_deepslate', 'GRID-W2', 'ground_floor');
set(-131, 68, -51, -97, 80, 3, 'minecraft:air', 'GRID-W2', 'interior_clearance');

// Two-storey masonry shell with a warm copper roof.
set(-132, 68, -52, -96, 80, -52, 'minecraft:stone_bricks', 'GRID-W2', 'north_wall');
set(-132, 68, 4, -96, 80, 4, 'minecraft:stone_bricks', 'GRID-W2', 'south_wall');
set(-132, 68, -51, -132, 80, 3, 'minecraft:smooth_quartz', 'GRID-W2', 'west_wall');
set(-96, 68, -51, -96, 80, 3, 'minecraft:smooth_quartz', 'GRID-W2', 'east_wall');
set(-132, 81, -52, -96, 81, 4, 'minecraft:oxidized_cut_copper', 'GRID-W2', 'roof');
set(-130, 74, -50, -98, 74, 2, 'minecraft:spruce_planks', 'GRID-W2', 'upper_floor');

// Repeated full-height windows on every elevation.
for (const x of [-127, -121, -115, -109, -103]) {
  set(x, 69, -52, x + 2, 72, -52, 'minecraft:light_blue_stained_glass', 'GRID-W2', 'north_window');
  set(x, 76, -52, x + 2, 79, -52, 'minecraft:light_blue_stained_glass', 'GRID-W2', 'north_window');
  set(x, 69, 4, x + 2, 72, 4, 'minecraft:light_blue_stained_glass', 'GRID-W2', 'south_window');
}
for (const z of [-46, -38, -30, -14, -6]) {
  set(-132, 69, z, -132, 72, z + 3, 'minecraft:light_blue_stained_glass', 'GRID-W2', 'west_window');
  set(-96, 69, z, -96, 72, z + 3, 'minecraft:light_blue_stained_glass', 'GRID-W2', 'east_window');
}

// East entry and direct connection to the inventoried West Lane gate.
set(-96, 68, -27, -96, 71, -21, 'minecraft:air', 'GRID-W2', 'main_entry');
set(-97, 67, -27, -84, 67, -20, 'minecraft:smooth_stone', 'GRID-W2', 'gate_walk');
set(-97, 64, -27, -84, 66, -20, 'minecraft:stone_bricks', 'GRID-W2', 'gate_walk_foundation');
set(-97, 68, -27, -84, 72, -20, 'minecraft:air', 'GRID-W2', 'gate_walk_clearance');
set(-95, 68, -25, -95, 68, -23, 'minecraft:dark_oak_door[facing=east,half=lower,open=true]', 'GRID-W2', 'entry_door');
set(-95, 69, -25, -95, 69, -23, 'minecraft:dark_oak_door[facing=east,half=upper,open=true]', 'GRID-W2', 'entry_door');

// Ground floor: maker hall, fabrication bay, material library, and washroom core.
set(-114, 68, -50, -114, 73, 2, 'minecraft:dark_oak_planks', 'GRID-W2', 'maker_partition');
set(-114, 68, -28, -114, 71, -22, 'minecraft:air', 'GRID-W2', 'maker_portal');
set(-130, 68, -18, -116, 72, -18, 'minecraft:smooth_quartz', 'GRID-W2', 'fabrication_partition');
set(-124, 68, -18, -120, 71, -18, 'minecraft:air', 'GRID-W2', 'fabrication_portal');
set(-130, 68, -49, -116, 68, -20, 'minecraft:gray_concrete', 'GRID-W2', 'fabrication_floor');
for (const x of [-128, -123, -118]) {
  set(x, 68, -47, x + 2, 68, -45, 'minecraft:smithing_table', 'GRID-W2', 'maker_station');
  set(x, 69, -47, x + 2, 69, -47, 'minecraft:lantern', 'GRID-W2', 'maker_task_light');
}
set(-111, 68, -48, -100, 70, -48, 'minecraft:bookshelf', 'GRID-W2', 'material_library');
set(-111, 68, -44, -100, 68, -40, 'minecraft:spruce_slab[type=top]', 'GRID-W2', 'material_table');
set(-111, 68, -5, -100, 72, -5, 'minecraft:smooth_quartz', 'GRID-W2', 'service_core');
set(-106, 68, -5, -104, 71, -5, 'minecraft:air', 'GRID-W2', 'service_door');

// Broad switchback stair to the collaborative design loft.
set(-112, 74, -17, -102, 74, -13, 'minecraft:air', 'GRID-W2', 'loft_stairwell');
for (let step = 0; step < 7; step += 1) {
  set(-111 + step, 68 + step, -16, -109 + step, 68 + step, -14, 'minecraft:quartz_stairs[facing=east]', 'GRID-W2', 'loft_stair');
}
set(-105, 74, -16, -102, 74, -14, 'minecraft:spruce_planks', 'GRID-W2', 'loft_landing');
set(-128, 75, -48, -100, 79, -30, 'minecraft:air', 'GRID-W2', 'design_loft');
for (const z of [-45, -39, -33]) {
  set(-126, 75, z, -105, 75, z + 2, 'minecraft:spruce_slab[type=top]', 'GRID-W2', 'design_table');
}
set(-129, 75, -27, -99, 79, -27, 'minecraft:white_concrete', 'GRID-W2', 'review_wall');
set(-120, 77, -27, -108, 79, -27, 'minecraft:black_concrete', 'GRID-W2', 'review_screen');

for (const [x, y, z] of [
  [-128, 73, -48], [-118, 73, -48], [-108, 73, -48], [-100, 73, -48],
  [-128, 73, -28], [-118, 73, -28], [-108, 73, -28], [-100, 73, -28],
  [-128, 80, -48], [-118, 80, -48], [-108, 80, -48], [-100, 80, -48],
]) {
  set(x, y, z, x, y, z, 'minecraft:sea_lantern', 'GRID-W2', 'interior_light');
}

// Maker yard and shade canopy.
set(-130, 67, -16, -118, 67, 1, 'minecraft:packed_mud', 'GRID-W2', 'maker_yard');
set(-129, 68, -14, -129, 73, -1, 'minecraft:stripped_spruce_log', 'GRID-W2', 'yard_post');
set(-119, 68, -14, -119, 73, -1, 'minecraft:stripped_spruce_log', 'GRID-W2', 'yard_post');
set(-129, 74, -14, -119, 74, -1, 'minecraft:oxidized_cut_copper_slab', 'GRID-W2', 'yard_canopy');

// ── GRID-E2: Neighborhood Clubhouse & Walled Garden ─────────────────────
repl(106, 80, -32, 134, 94, 10, natural, 'minecraft:air', 'GRID-E2', 'site_clearance');
set(106, 70, -32, 134, 79, 10, 'minecraft:stone_bricks', 'GRID-E2', 'terrace_foundation');
set(106, 80, -32, 134, 80, 10, 'minecraft:polished_andesite', 'GRID-E2', 'club_floor');
set(107, 81, -31, 133, 89, 9, 'minecraft:air', 'GRID-E2', 'interior_clearance');

set(106, 81, -32, 134, 89, -32, 'minecraft:bricks', 'GRID-E2', 'north_wall');
set(106, 81, 10, 134, 89, 10, 'minecraft:bricks', 'GRID-E2', 'south_wall');
set(106, 81, -31, 106, 89, 9, 'minecraft:smooth_quartz', 'GRID-E2', 'west_wall');
set(134, 81, -31, 134, 89, 9, 'minecraft:smooth_quartz', 'GRID-E2', 'east_wall');
set(105, 90, -33, 135, 90, 11, 'minecraft:dark_oak_slab', 'GRID-E2', 'club_roof');

for (const x of [110, 116, 122, 128]) {
  set(x, 82, -32, x + 2, 86, -32, 'minecraft:white_stained_glass', 'GRID-E2', 'club_window');
  set(x, 82, 10, x + 2, 86, 10, 'minecraft:white_stained_glass', 'GRID-E2', 'club_window');
}
set(118, 81, 10, 122, 84, 10, 'minecraft:air', 'GRID-E2', 'terrace_portal');
for (const z of [-26, -18, -8, 0, 6]) {
  set(134, 82, z, 134, 86, z + 2, 'minecraft:white_stained_glass', 'GRID-E2', 'club_window');
}
set(106, 81, -26, 106, 84, -20, 'minecraft:air', 'GRID-E2', 'club_entry');
set(107, 81, -24, 107, 81, -22, 'minecraft:dark_oak_door[facing=east,half=lower,open=true]', 'GRID-E2', 'club_entry_door');
set(107, 82, -24, 107, 82, -22, 'minecraft:dark_oak_door[facing=east,half=upper,open=true]', 'GRID-E2', 'club_entry_door');

// Terraced procession from the high west gate down to the clubhouse.
const terraceWalk = [
  [88, 94, 85], [95, 95, 84], [96, 96, 83],
  [97, 101, 82], [102, 102, 81], [103, 108, 80],
];
for (const [x1, x2, y] of terraceWalk) {
  set(x1, 64, -25, x2, y - 1, -20, 'minecraft:stone_bricks', 'GRID-E2', 'garden_walk_foundation');
  set(x1, y, -25, x2, y, -20, 'minecraft:polished_andesite', 'GRID-E2', 'garden_walk');
}
for (const [x, y] of [[95, 84], [96, 83], [102, 81]]) {
  set(x, y, -25, x, y, -20, 'minecraft:stone_brick_stairs[facing=east]', 'GRID-E2', 'garden_step');
}

// Three walled-garden rooms flank the walk.
set(90, 84, -45, 98, 84, -28, 'minecraft:moss_block', 'GRID-E2', 'upper_garden_bed');
set(99, 81, -45, 106, 81, -28, 'minecraft:moss_block', 'GRID-E2', 'middle_garden_bed');
set(90, 84, -17, 98, 84, 2, 'minecraft:moss_block', 'GRID-E2', 'upper_garden_bed');
set(99, 81, -17, 106, 81, 2, 'minecraft:moss_block', 'GRID-E2', 'middle_garden_bed');
for (const [x1, y, z1, x2, z2] of [
  [90, 85, -45, 98, -28], [99, 82, -45, 106, -28],
  [90, 85, -17, 98, 2], [99, 82, -17, 106, 2],
]) {
  set(x1, y, z1, x2, y, z1, 'minecraft:birch_fence', 'GRID-E2', 'garden_rail');
  set(x1, y, z2, x2, y, z2, 'minecraft:birch_fence', 'GRID-E2', 'garden_rail');
}
for (const [x, y, z] of [
  [92, 85, -42], [96, 85, -34], [101, 82, -42], [104, 82, -34],
  [92, 85, -14], [96, 85, -4], [101, 82, -14], [104, 82, -4],
]) {
  set(x, y, z, x, y, z, (x + z) % 2 ? 'minecraft:white_tulip' : 'minecraft:blue_orchid', 'GRID-E2', 'garden_planting');
}

// Clubhouse floorplan: great room, kitchen, reading room, restrooms, terrace.
set(108, 81, -4, 132, 87, -4, 'minecraft:dark_oak_planks', 'GRID-E2', 'club_partition');
set(117, 81, -4, 121, 84, -4, 'minecraft:air', 'GRID-E2', 'great_room_portal');
set(121, 81, -30, 121, 87, -6, 'minecraft:smooth_quartz', 'GRID-E2', 'club_partition');
set(121, 81, -18, 121, 84, -14, 'minecraft:air', 'GRID-E2', 'kitchen_portal');
set(109, 81, -29, 119, 82, -27, 'minecraft:polished_blackstone', 'GRID-E2', 'kitchen_counter');
set(110, 81, 3, 130, 81, 7, 'minecraft:spruce_slab[type=top]', 'GRID-E2', 'reading_tables');
set(108, 81, -2, 118, 83, -2, 'minecraft:bookshelf', 'GRID-E2', 'reading_library');
set(123, 81, -29, 132, 83, -29, 'minecraft:barrel', 'GRID-E2', 'club_storage');
set(108, 80, 11, 132, 80, 16, 'minecraft:dark_oak_planks', 'GRID-E2', 'garden_terrace');
set(108, 81, 16, 132, 81, 16, 'minecraft:birch_fence', 'GRID-E2', 'terrace_rail');
for (const x of [110, 118, 126, 132]) {
  set(x, 88, -28, x, 88, -28, 'minecraft:sea_lantern', 'GRID-E2', 'club_light');
  set(x, 88, 6, x, 88, 6, 'minecraft:sea_lantern', 'GRID-E2', 'club_light');
}

const projects = {};
for (const operation of ops) {
  const project = projects[operation.project] ??= { operations: 0, byRole: {} };
  project.operations += 1;
  project.byRole[operation.role] = (project.byRole[operation.role] ?? 0) + 1;
}
const report = {
  schemaVersion: 1,
  id: 'mainstreet-america-grid-projects',
  generatedAtUtc: new Date().toISOString(),
  operationCount: ops.length,
  projects,
  floorplans: {
    'GRID-W2': {
      floors: 2,
      rooms: ['entry gallery', 'maker hall', 'fabrication bay', 'material library', 'service core', 'design loft', 'review wall', 'maker yard'],
      entrance: [-96, 68, -24],
    },
    'GRID-E2': {
      floors: 1,
      rooms: ['entry hall', 'great room', 'kitchen', 'reading room', 'storage', 'garden terrace', 'four garden rooms'],
      entrance: [106, 81, -23],
    },
  },
};
const output = [
  '# GENERATED FILE — MainStreet grid project build-out',
  '# Parcels: GRID-W2 Design Lab & Maker Commons; GRID-E2 Clubhouse & Walled Garden',
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
  projects,
}, null, 2));
