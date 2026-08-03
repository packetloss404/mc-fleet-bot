#!/usr/bin/env node
/**
 * Repair the MainStreet mountain complex's misleading circulation:
 * continuous public-entry route, labeled hangar/arena hub, explicit shaft
 * spine, opened upper rooms, and a real lower-operations exit/loop.
 *
 * Carving is limited to audited bulkheads/corridor boxes and only replaces
 * known architectural shell materials. Furnishings and room interiors outside
 * those boxes are not touched.
 */

import fs from 'fs';
import path from 'path';

const outputPath = process.argv[2]
  ?? 'data/buildops/mainstreet-mountain-wayfinding-2026-07-26.txt';
const reportPath = outputPath.replace(/\.txt$/, '.report.json');
const ops = [];

function set(x1, y1, z1, x2, y2, z2, block, tag) {
  ops.push({ line: `SET ${x1} ${y1} ${z1} ${x2} ${y2} ${z2} ${block}`, tag });
}

function repl(x1, y1, z1, x2, y2, z2, expected, desired, tag) {
  ops.push({
    line: `REPL ${x1} ${y1} ${z1} ${x2} ${y2} ${z2} ${expected} ${desired}`,
    tag,
  });
}

function cmd(command, tag) {
  ops.push({ line: `CMD ${command}`, tag });
}

const shellMask = [
  'minecraft:iron_block',
  'minecraft:white_concrete',
  'minecraft:light_gray_concrete',
  'minecraft:gray_concrete',
  'minecraft:black_concrete',
  'minecraft:polished_andesite',
  'minecraft:smooth_stone',
  'minecraft:stone_bricks',
  'minecraft:stone',
  'minecraft:deepslate',
  'minecraft:polished_deepslate',
  'minecraft:quartz_block',
  'minecraft:dark_oak_fence',
  'minecraft:dark_oak_slab',
  'minecraft:dark_oak_stairs',
].join(',');

// ── Continuous upper public route ───────────────────────────────────────
set(122, 62, 132, 126, 62, 143, 'minecraft:oxidized_cut_copper', 'public_route');
set(123, 62, 131, 150, 62, 133, 'minecraft:oxidized_cut_copper', 'public_route');
set(148, 62, 108, 152, 62, 133, 'minecraft:oxidized_cut_copper', 'public_route');
set(150, 62, 108, 225, 62, 110, 'minecraft:oxidized_cut_copper', 'hangar_arena_route');
set(196, 62, 106, 203, 62, 114, 'minecraft:dark_prismarine', 'destination_hub');
set(198, 62, 115, 200, 62, 151, 'minecraft:oxidized_cut_copper', 'shaft_spine');

for (const z of [140, 132, 124, 116]) {
  set(124, 62, z, 124, 62, z, 'minecraft:sea_lantern', 'public_route_light');
}
for (const x of [132, 140, 148, 156, 164, 172, 180, 188, 196, 204, 212, 220]) {
  set(x, 62, x < 150 ? 132 : 109, x, 62, x < 150 ? 132 : 109, 'minecraft:sea_lantern', 'public_route_light');
}
for (const z of [120, 128, 136, 144, 150]) {
  set(199, 62, z, 199, 62, z, 'minecraft:sea_lantern', 'shaft_spine_light');
}

// Directional floor arrows: white points west to Hangar, orange east to Arena,
// cyan south to the service shaft. The shaft terminates in the surface
// hangar's second-floor office; it is not the public exit or the heliport.
set(190, 62, 111, 196, 62, 111, 'minecraft:white_concrete', 'hangar_arrow');
set(204, 62, 111, 210, 62, 111, 'minecraft:orange_concrete', 'arena_arrow');
set(201, 62, 114, 201, 62, 120, 'minecraft:cyan_concrete', 'shaft_arrow');

// A freestanding labeled decision pylon at the exact ambiguous junction.
set(200, 63, 114, 200, 66, 114, 'minecraft:smooth_quartz', 'hub_pylon');
cmd('setblock 200 64 113 minecraft:oak_wall_sign[facing=north]', 'hub_sign');
cmd(
  `data merge block 200 64 113 {front_text:{color:"black",has_glowing_text:1b,messages:['{"text":"LOWER HANGAR <<"}','{"text":"ARENA  >>"}','{"text":"HANGAR OFFICE S"}','{"text":"HELIPAD VIA UP"}']}}`,
  'hub_sign_text',
);

// ── Upper latent rooms and shaft landing ────────────────────────────────
repl(196, 63, 148, 196, 70, 151, shellMask, 'minecraft:air', 'upper_west_gallery_bulkhead');
repl(201, 63, 148, 201, 70, 151, shellMask, 'minecraft:air', 'upper_east_gallery_bulkhead');
repl(158, 63, 152, 166, 70, 152, shellMask, 'minecraft:air', 'upper_theater_entrance');
set(197, 62, 149, 201, 62, 152, 'minecraft:dark_prismarine', 'upper_shaft_landing');
for (const [x, z] of [[197, 149], [201, 149], [197, 152], [201, 152]]) {
  set(x, 62, z, x, 62, z, 'minecraft:sea_lantern', 'upper_landing_light');
}
set(198, 63, 148, 198, 66, 148, 'minecraft:smooth_quartz', 'upper_landing_pylon');
cmd('setblock 198 64 147 minecraft:oak_wall_sign[facing=north]', 'upper_landing_sign');
cmd(
  `data merge block 198 64 147 {front_text:{color:"black",has_glowing_text:1b,messages:['{"text":"OFFICE SHAFT"}','{"text":"ROOF HANGAR"}','{"text":"HELIPAD VIA BAY"}','{"text":"PUBLIC ENTRY N"}']}}`,
  'upper_landing_sign_text',
);

// ── Lower landing and operations loop ───────────────────────────────────
repl(197, 51, 151, 201, 58, 152, shellMask, 'minecraft:air', 'lower_landing_exit');
repl(196, 51, 148, 196, 58, 151, shellMask, 'minecraft:air', 'lower_west_gallery_bulkhead');
repl(201, 51, 148, 201, 58, 151, shellMask, 'minecraft:air', 'lower_east_gallery_bulkhead');
repl(141, 51, 124, 263, 58, 128, shellMask, 'minecraft:air', 'lower_operations_cross_concourse');
repl(197, 51, 124, 201, 58, 168, shellMask, 'minecraft:air', 'lower_operations_spine');
repl(140, 51, 168, 220, 58, 171, shellMask, 'minecraft:air', 'lower_conference_corridor');

// Controlled door bays into the lower theater and three furnished rooms.
for (const [x1, x2] of [[143, 146], [173, 176], [193, 196], [213, 216]]) {
  repl(x1, 51, 172, x2, 54, 172, shellMask, 'minecraft:air', 'lower_room_door');
}
// The lower theater's threshold is polished blackstone, which is intentionally
// absent from the general shell mask. Remove only the audited 4x4 door plane.
repl(
  143, 51, 172, 146, 54, 172,
  'minecraft:polished_blackstone',
  'minecraft:air',
  'lower_theater_door',
);

set(197, 50, 148, 201, 50, 152, 'minecraft:dark_prismarine', 'lower_shaft_landing');
set(141, 50, 124, 263, 50, 128, 'minecraft:deepslate_tiles', 'lower_operations_cross_concourse');
set(197, 50, 124, 201, 50, 168, 'minecraft:deepslate_tiles', 'lower_operations_spine');
set(140, 50, 168, 220, 50, 171, 'minecraft:deepslate_tiles', 'lower_conference_corridor');
for (const [x1, x2] of [[143, 146], [173, 176], [193, 196], [213, 216]]) {
  set(x1, 50, 172, x2, 50, 175, 'minecraft:deepslate_tiles', 'lower_room_threshold');
}
for (let x = 144; x <= 256; x += 8) {
  set(x, 50, 126, x, 50, 126, 'minecraft:sea_lantern', 'lower_cross_light');
}
for (let z = 132; z <= 164; z += 8) {
  set(199, 50, z, 199, 50, z, 'minecraft:sea_lantern', 'lower_spine_light');
}
for (let x = 144; x <= 216; x += 8) {
  set(x, 50, 170, x, 50, 170, 'minecraft:sea_lantern', 'lower_conference_light');
}

set(198, 51, 149, 198, 54, 149, 'minecraft:smooth_quartz', 'lower_landing_pylon');
cmd('setblock 198 52 148 minecraft:oak_wall_sign[facing=north]', 'lower_landing_sign');
cmd(
  `data merge block 198 52 148 {front_text:{color:"black",has_glowing_text:1b,messages:['{"text":"LOWER OPS"}','{"text":"E/W CONCOURSE"}','{"text":"ROOMS SOUTH"}','{"text":"SHAFT BEHIND"}']}}`,
  'lower_landing_sign_text',
);

const byTag = ops.reduce((counts, operation) => {
  counts[operation.tag] = (counts[operation.tag] ?? 0) + 1;
  return counts;
}, {});
const report = {
  schemaVersion: 1,
  id: 'mainstreet-america-mountain-wayfinding',
  generatedAtUtc: new Date().toISOString(),
  operationCount: ops.length,
  carvingMask: shellMask.split(','),
  carveBoxes: {
    lowerLanding: [197, 51, 151, 201, 58, 152],
    lowerCrossConcourse: [141, 51, 124, 263, 58, 128],
    lowerSpine: [197, 51, 124, 201, 58, 168],
    lowerConferenceCorridor: [140, 51, 168, 220, 58, 171],
  },
  routes: {
    publicEntryToRibbon: [
      [124, 63, 143], [124, 63, 132], [150, 63, 132], [150, 63, 109],
    ],
    hangarArena: [[150, 63, 109], [200, 63, 109], [225, 63, 109]],
    upperShaft: [[200, 63, 151], [199, 63, 115], [200, 63, 109]],
    lowerOperations: [[200, 51, 151], [199, 51, 126], [145, 51, 126], [260, 51, 126]],
  },
  byTag,
};
const output = [
  '# GENERATED FILE — MainStreet mountain circulation and lower-operations repair',
  '# Carves only known shell materials inside audited boxes; no broad air SET operations.',
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
  byTag,
}, null, 2));
