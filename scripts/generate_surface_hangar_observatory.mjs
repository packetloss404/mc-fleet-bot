#!/usr/bin/env node
/**
 * Build the MainStreet mountain-roof arrival complex.
 *
 * Arrival sequence:
 *   service shaft -> second-floor dispatch office -> hangar overlook/catwalk
 *   -> main hangar bay -> exterior trail -> existing heliport
 *
 * The hangar roof carries a Griffith-inspired white Art Deco observatory with
 * one central copper dome and two smaller telescope domes. A private residence
 * and twelve-monitor command room are concealed behind the dispatch office.
 *
 * The generator never connects to Minecraft. Site clearing is material-masked
 * against the refreshed local Anvil snapshot, and the existing scaffold shaft
 * and heliport are deliberately outside every destructive mask.
 */

import fs from 'fs';
import path from 'path';

import {
  AnvilSnapshot,
  isAirBlock,
  isFoliageBlock,
  isReplaceableBlock,
} from './generate_picket_fence.mjs';

const outputPath = process.argv[2]
  ?? 'data/buildops/mainstreet-surface-hangar-observatory-2026-07-26.txt';
const reportPath = outputPath.replace(/\.txt$/, '.report.json');
const ops = [];
const snapshot = new AnvilSnapshot('data/worldsnap/region');

function set(x1, y1, z1, x2, y2, z2, block, area, role) {
  ops.push({
    line: `SET ${x1} ${y1} ${z1} ${x2} ${y2} ${z2} ${block}`,
    area,
    role,
  });
}

function repl(x1, y1, z1, x2, y2, z2, expected, desired, area, role) {
  ops.push({
    line: `REPL ${x1} ${y1} ${z1} ${x2} ${y2} ${z2} ${expected} ${desired}`,
    area,
    role,
  });
}

function cmd(command, area, role) {
  ops.push({ line: `CMD ${command}`, area, role });
}

const natural = [
  'minecraft:stone', 'minecraft:dirt', 'minecraft:grass_block',
  'minecraft:coarse_dirt', 'minecraft:rooted_dirt', 'minecraft:gravel',
  'minecraft:granite', 'minecraft:diorite', 'minecraft:andesite',
  'minecraft:tuff', 'minecraft:calcite', 'minecraft:snow',
  'minecraft:short_grass', 'minecraft:tall_grass', 'minecraft:fern',
  'minecraft:large_fern', 'minecraft:oak_log', 'minecraft:oak_leaves',
  'minecraft:birch_log', 'minecraft:birch_leaves',
  'minecraft:spruce_log', 'minecraft:spruce_leaves',
].join(',');

const supersededShaftShed = [
  'minecraft:spruce_planks', 'minecraft:spruce_log',
  'minecraft:spruce_slab', 'minecraft:spruce_stairs',
  'minecraft:dark_oak_log', 'minecraft:dark_oak_planks',
  'minecraft:smooth_quartz', 'minecraft:smooth_quartz_slab',
  'minecraft:quartz_block', 'minecraft:quartz_slab',
  'minecraft:sea_lantern', 'minecraft:lantern',
].join(',');

// ── Mountain-integrated hangar shell ────────────────────────────────────
// The z=135 white project fence is a protected northern boundary. The hangar
// begins at z=138, leaving a two-block landscape reveal inside the fence.
// Clear only natural terrain by default. The one-time legacy shaft-head shed
// removal is deliberately opt-in: smooth quartz is part of the finished
// office/observatory, so treating it as a broad "superseded" mask would make a
// post-build regeneration destructive. Scaffolding is in neither mask.
repl(177, 99, 139, 233, 139, 180, natural, 'minecraft:air', 'HGR-S01', 'site_clearance');
if (process.env.MSA_CLEAR_LEGACY_SHAFT_SHED === '1') {
  repl(
    196, 99, 150, 203, 112, 157,
    supersededShaftShed,
    'minecraft:air',
    'HGR-S01',
    'legacy_shaft_shed_clearance',
  );
}

// Terrain-derived foundation infill avoids a rectangular concrete plinth on
// the downhill side. Each run starts immediately above the natural support
// recorded in the snapshot; cut columns retain their y98 natural support.
function isShaftCore(x, z) {
  return x >= 198 && x <= 202 && z >= 151 && z <= 156;
}

async function terrainTop(x, z) {
  const column = await snapshot.readColumn(x, z, 70, 118);
  if (!column) throw new Error(`missing snapshot column ${x},${z}`);
  for (let y = 118; y >= 70; y -= 1) {
    const block = column.get(y);
    if (isAirBlock(block) || isFoliageBlock(block) || isReplaceableBlock(block)) continue;
    if (supersededShaftShed.split(',').includes(block)) continue;
    if (block === 'minecraft:scaffolding') continue;
    return y;
  }
  throw new Error(`no terrain support at ${x},${z}`);
}

const foundationProfile = [];
for (let z = 139; z <= 180; z += 1) {
  let run = null;
  for (let x = 177; x <= 233; x += 1) {
    if (isShaftCore(x, z)) {
      if (run) {
        set(run.x1, run.y1, z, x - 1, 97, z, 'minecraft:stone_bricks', 'HGR-S01', 'terrain_foundation');
        foundationProfile.push({ x1: run.x1, x2: x - 1, z, supportY: run.y1 - 1 });
        run = null;
      }
      continue;
    }
    const top = await terrainTop(x, z);
    const y1 = top + 1;
    if (y1 > 97) {
      if (run) {
        set(run.x1, run.y1, z, x - 1, 97, z, 'minecraft:stone_bricks', 'HGR-S01', 'terrain_foundation');
        foundationProfile.push({ x1: run.x1, x2: x - 1, z, supportY: run.y1 - 1 });
        run = null;
      }
      continue;
    }
    if (!run || run.y1 !== y1) {
      if (run) {
        set(run.x1, run.y1, z, x - 1, 97, z, 'minecraft:stone_bricks', 'HGR-S01', 'terrain_foundation');
        foundationProfile.push({ x1: run.x1, x2: x - 1, z, supportY: run.y1 - 1 });
      }
      run = { x1: x, y1 };
    }
  }
  if (run) {
    set(run.x1, run.y1, z, 233, 97, z, 'minecraft:stone_bricks', 'HGR-S01', 'terrain_foundation');
    foundationProfile.push({ x1: run.x1, x2: 233, z, supportY: run.y1 - 1 });
  }
}

// Bay floor split around the protected 5x6 shaft core.
set(177, 98, 139, 197, 98, 180, 'minecraft:polished_andesite', 'HGR-S01', 'bay_floor');
set(203, 98, 139, 233, 98, 180, 'minecraft:polished_andesite', 'HGR-S01', 'bay_floor');
set(198, 98, 139, 202, 98, 150, 'minecraft:polished_andesite', 'HGR-S01', 'bay_floor');
set(198, 98, 157, 202, 98, 180, 'minecraft:polished_andesite', 'HGR-S01', 'bay_floor');

// High-bay exterior shell.
set(176, 98, 138, 234, 118, 138, 'minecraft:light_gray_concrete', 'HGR-S01', 'north_wall');
set(176, 98, 181, 234, 118, 181, 'minecraft:light_gray_concrete', 'HGR-S01', 'south_wall');
set(176, 98, 139, 176, 118, 180, 'minecraft:gray_concrete', 'HGR-S01', 'west_wall');
set(234, 98, 139, 234, 118, 180, 'minecraft:gray_concrete', 'HGR-S01', 'east_wall');
set(175, 119, 137, 235, 119, 182, 'minecraft:smooth_stone', 'HGR-S01', 'hangar_roof');
set(176, 120, 138, 234, 120, 181, 'minecraft:smooth_quartz', 'OBS-S01', 'roof_terrace');

// Architectural base, cornice, and repeated high-bay glazing.
set(176, 98, 138, 234, 101, 138, 'minecraft:stone_bricks', 'HGR-S01', 'stone_base');
set(176, 98, 181, 234, 101, 181, 'minecraft:stone_bricks', 'HGR-S01', 'stone_base');
set(176, 98, 139, 176, 101, 180, 'minecraft:stone_bricks', 'HGR-S01', 'stone_base');
set(234, 98, 139, 234, 101, 180, 'minecraft:stone_bricks', 'HGR-S01', 'stone_base');
set(175, 115, 137, 235, 116, 182, 'minecraft:polished_deepslate', 'HGR-S01', 'cornice');
set(176, 117, 138, 234, 118, 181, 'minecraft:light_gray_concrete', 'HGR-S01', 'upper_band');

for (const x of [181, 190, 199, 208, 217, 226]) {
  set(x, 102, 138, x + 4, 111, 138, 'minecraft:light_blue_stained_glass', 'HGR-S01', 'north_window');
}
for (const z of [144, 154, 166]) {
  set(176, 103, z, 176, 111, z + 5, 'minecraft:light_blue_stained_glass', 'HGR-S01', 'west_window');
  set(234, 103, z, 234, 111, z + 5, 'minecraft:light_blue_stained_glass', 'HGR-S01', 'east_window');
}

// Iron structural rhythm and lit roof trusses make the bay read at hangar scale.
for (const x of [177, 185, 193, 201, 209, 217, 225, 233]) {
  set(x, 99, 139, x, 117, 139, 'minecraft:iron_block', 'HGR-S01', 'structural_column');
  set(x, 99, 180, x, 117, 180, 'minecraft:iron_block', 'HGR-S01', 'structural_column');
  set(x, 116, 140, x, 116, 179, 'minecraft:iron_block', 'HGR-S01', 'roof_truss');
  set(x, 115, 147, x, 115, 147, 'minecraft:sea_lantern', 'HGR-S01', 'truss_light');
  set(x, 115, 171, x, 115, 171, 'minecraft:sea_lantern', 'HGR-S01', 'truss_light');
}
for (const z of [145, 154, 163, 172]) {
  set(177, 99, z, 177, 114, z, 'minecraft:iron_block', 'HGR-S01', 'structural_column');
  set(233, 99, z, 233, 114, z, 'minecraft:iron_block', 'HGR-S01', 'structural_column');
}

// Main aircraft door and exterior apron. The opening is intentionally large
// enough to reveal the full bay when approaching from the heliport.
set(208, 99, 181, 231, 113, 181, 'minecraft:air', 'HGR-S01', 'hangar_door_opening');
set(207, 98, 180, 232, 116, 181, 'minecraft:polished_deepslate', 'HGR-S01', 'hangar_door_frame');
set(208, 99, 180, 231, 113, 181, 'minecraft:air', 'HGR-S01', 'hangar_door_opening');
set(209, 98, 182, 231, 98, 187, 'minecraft:polished_andesite', 'HGR-S01', 'door_apron');
for (let z = 182; z <= 187; z += 1) {
  for (let x = 209; x <= 231; x += 1) {
    const top = await terrainTop(x, z);
    if (top < 97) {
      set(x, top + 1, z, x, 97, z, 'minecraft:stone_bricks', 'HGR-S01', 'door_apron_foundation');
    }
  }
}
for (const x of [209, 213, 217, 221, 225, 229]) {
  set(x, 98, 181, x + 1, 98, 183, 'minecraft:yellow_concrete', 'HGR-S01', 'door_hazard_stripe');
}

// Hangar-bay program: two marked maintenance positions, tool/storage wall,
// overhead crane, and a compact utility aircraft silhouette.
for (const x of [184, 212]) {
  set(x, 98, 140, x + 14, 98, 166, 'minecraft:smooth_stone', 'HGR-S01', 'maintenance_pad');
  set(x, 98, 140, x + 14, 98, 140, 'minecraft:yellow_concrete', 'HGR-S01', 'maintenance_outline');
  set(x, 98, 166, x + 14, 98, 166, 'minecraft:yellow_concrete', 'HGR-S01', 'maintenance_outline');
  set(x, 98, 140, x, 98, 166, 'minecraft:yellow_concrete', 'HGR-S01', 'maintenance_outline');
  set(x + 14, 98, 140, x + 14, 98, 166, 'minecraft:yellow_concrete', 'HGR-S01', 'maintenance_outline');
}
set(179, 99, 173, 195, 101, 177, 'minecraft:barrel', 'HGR-S01', 'stores_wall');
set(181, 102, 173, 193, 102, 177, 'minecraft:iron_block', 'HGR-S01', 'tool_wall');
set(181, 103, 177, 193, 105, 177, 'minecraft:orange_concrete', 'HGR-S01', 'tool_panels');
set(183, 113, 142, 228, 113, 142, 'minecraft:yellow_concrete', 'HGR-S01', 'overhead_crane');
set(183, 111, 142, 183, 113, 142, 'minecraft:iron_chain', 'HGR-S01', 'crane_drop');
set(228, 111, 142, 228, 113, 142, 'minecraft:iron_chain', 'HGR-S01', 'crane_drop');

// Utility aircraft on the east maintenance pad.
set(215, 99, 146, 225, 99, 150, 'minecraft:white_concrete', 'HGR-S01', 'utility_aircraft');
set(219, 100, 147, 226, 101, 149, 'minecraft:light_gray_concrete', 'HGR-S01', 'utility_aircraft');
set(221, 102, 147, 225, 103, 149, 'minecraft:light_blue_stained_glass', 'HGR-S01', 'utility_aircraft_cockpit');
set(210, 99, 141, 223, 99, 155, 'minecraft:air', 'HGR-S01', 'aircraft_clearance');
set(214, 99, 146, 225, 99, 150, 'minecraft:white_concrete', 'HGR-S01', 'utility_aircraft');
set(217, 99, 140, 220, 99, 156, 'minecraft:white_concrete', 'HGR-S01', 'utility_aircraft_wing');
set(219, 100, 147, 226, 101, 149, 'minecraft:light_gray_concrete', 'HGR-S01', 'utility_aircraft');
set(221, 102, 147, 225, 103, 149, 'minecraft:light_blue_stained_glass', 'HGR-S01', 'utility_aircraft_cockpit');
set(212, 99, 147, 214, 101, 149, 'minecraft:orange_concrete', 'HGR-S01', 'utility_aircraft_tail');

// ── Two-storey shaft office and hangar overlook ─────────────────────────
// Ground service core below the office establishes a real first storey.
set(190, 99, 145, 207, 104, 145, 'minecraft:gray_concrete', 'OFF-S01', 'service_core_wall');
set(190, 99, 162, 207, 104, 162, 'minecraft:gray_concrete', 'OFF-S01', 'service_core_wall');
set(190, 99, 146, 190, 104, 161, 'minecraft:gray_concrete', 'OFF-S01', 'service_core_wall');
set(207, 99, 146, 207, 104, 161, 'minecraft:gray_concrete', 'OFF-S01', 'service_core_wall');
set(191, 99, 146, 197, 104, 161, 'minecraft:air', 'OFF-S01', 'service_core_interior');
set(203, 99, 146, 206, 104, 161, 'minecraft:air', 'OFF-S01', 'service_core_interior');
set(198, 99, 146, 202, 104, 150, 'minecraft:air', 'OFF-S01', 'service_core_interior');
set(198, 99, 157, 202, 104, 161, 'minecraft:air', 'OFF-S01', 'service_core_interior');
set(200, 50, 153, 200, 50, 153, 'minecraft:scaffolding', 'OFF-S01', 'shaft_continuity_repair');
set(190, 99, 153, 190, 102, 157, 'minecraft:air', 'OFF-S01', 'service_core_entry');
set(191, 99, 147, 196, 100, 150, 'minecraft:barrel', 'OFF-S01', 'service_storage');
set(202, 99, 147, 206, 99, 151, 'minecraft:smithing_table', 'OFF-S01', 'service_bench');

// Second-floor slab preserves the scaffold at (200,105,153). The office is
// deliberately narrower than the private wing behind it so it reads as a
// discrete dispatch room overlooking the full bay.
set(194, 105, 150, 199, 105, 162, 'minecraft:dark_oak_planks', 'OFF-S01', 'office_floor');
set(201, 105, 150, 207, 105, 162, 'minecraft:dark_oak_planks', 'OFF-S01', 'office_floor');
set(200, 105, 150, 200, 105, 152, 'minecraft:dark_oak_planks', 'OFF-S01', 'office_floor');
set(200, 105, 154, 200, 105, 162, 'minecraft:dark_oak_planks', 'OFF-S01', 'office_floor');
set(194, 106, 150, 207, 113, 150, 'minecraft:smooth_quartz', 'OFF-S01', 'office_wall');
set(194, 106, 162, 207, 113, 162, 'minecraft:smooth_quartz', 'OFF-S01', 'office_wall');
set(194, 106, 151, 194, 113, 161, 'minecraft:smooth_quartz', 'OFF-S01', 'office_wall');
set(207, 106, 151, 207, 113, 161, 'minecraft:light_blue_stained_glass', 'OFF-S01', 'hangar_overlook_window');
set(195, 106, 151, 206, 113, 161, 'minecraft:air', 'OFF-S01', 'office_interior');
set(207, 106, 156, 207, 109, 160, 'minecraft:air', 'OFF-S01', 'office_catwalk_door');
set(194, 114, 150, 207, 114, 162, 'minecraft:smooth_quartz', 'OFF-S01', 'office_ceiling');

// Shaft arrival guard and unambiguous office wayfinding.
set(199, 106, 152, 199, 107, 152, 'minecraft:oxidized_copper', 'OFF-S01', 'shaft_guard');
set(201, 106, 152, 201, 107, 152, 'minecraft:oxidized_copper', 'OFF-S01', 'shaft_guard');
set(199, 106, 154, 199, 107, 154, 'minecraft:oxidized_copper', 'OFF-S01', 'shaft_guard');
set(201, 106, 154, 201, 107, 154, 'minecraft:oxidized_copper', 'OFF-S01', 'shaft_guard');
set(200, 106, 152, 200, 106, 152, 'minecraft:air', 'OFF-S01', 'shaft_exit');
set(200, 106, 154, 200, 106, 154, 'minecraft:air', 'OFF-S01', 'shaft_exit');
set(204, 106, 151, 206, 106, 155, 'minecraft:spruce_slab[type=top]', 'OFF-S01', 'dispatch_desk');
set(203, 106, 151, 203, 106, 152, 'minecraft:dark_oak_stairs[facing=east]', 'OFF-S01', 'dispatch_chair');
set(195, 106, 151, 195, 110, 156, 'minecraft:bookshelf', 'OFF-S01', 'concealed_library_wall');
set(204, 109, 161, 206, 111, 161, 'minecraft:black_concrete', 'OFF-S01', 'office_status_board');
set(196, 113, 151, 196, 113, 151, 'minecraft:sea_lantern', 'OFF-S01', 'office_light');
set(204, 113, 159, 204, 113, 159, 'minecraft:sea_lantern', 'OFF-S01', 'office_light');

set(208, 105, 154, 218, 105, 162, 'minecraft:dark_oak_planks', 'OFF-S01', 'overlook_catwalk');
set(208, 106, 154, 218, 106, 154, 'minecraft:iron_bars', 'OFF-S01', 'catwalk_rail');
set(208, 106, 162, 218, 106, 162, 'minecraft:iron_bars', 'OFF-S01', 'catwalk_rail');
for (let step = 0; step < 7; step += 1) {
  set(219 + step, 104 - step, 157, 219 + step, 104 - step, 160,
    'minecraft:quartz_stairs[facing=west]', 'OFF-S01', 'bay_stair');
}
set(225, 98, 156, 230, 98, 162, 'minecraft:polished_andesite', 'OFF-S01', 'bay_stair_landing');

// Signs deliberately distinguish the roof hangar, underground destinations,
// and the separately located heliport.
set(202, 106, 157, 202, 109, 157, 'minecraft:smooth_quartz', 'OFF-S01', 'office_sign_pylon');
cmd('setblock 202 108 156 minecraft:oak_wall_sign[facing=north]', 'OFF-S01', 'office_sign');
cmd(
  `data merge block 202 108 156 {front_text:{color:"black",has_glowing_text:1b,messages:['{"text":"ROOF HANGAR"}','{"text":"BAY / EXIT ->"}','{"text":"HELIPORT OUTSIDE"}','{"text":"SHAFT: LOWER"}']}}`,
  'OFF-S01',
  'office_sign_text',
);

// ── Concealed one-bedroom penthouse and command center ─────────────────
// The L-shaped private level fills the north and west mezzanine behind the
// dispatch office. It has no exterior door or public-facing sign.
set(178, 105, 139, 207, 105, 180, 'minecraft:dark_oak_planks', 'APT-S01', 'private_floor');
set(200, 105, 153, 200, 105, 153, 'minecraft:scaffolding', 'OFF-S01', 'shaft_top_preserve');
set(178, 106, 139, 207, 113, 139, 'minecraft:gray_concrete', 'APT-S01', 'private_wall');
set(178, 106, 180, 207, 113, 180, 'minecraft:gray_concrete', 'APT-S01', 'private_wall');
set(178, 106, 140, 178, 113, 179, 'minecraft:gray_concrete', 'APT-S01', 'private_wall');
set(207, 106, 140, 207, 113, 179, 'minecraft:gray_concrete', 'APT-S01', 'private_wall');
set(179, 106, 140, 206, 113, 179, 'minecraft:air', 'APT-S01', 'private_interior');
set(178, 114, 139, 207, 114, 180, 'minecraft:gray_concrete', 'APT-S01', 'private_ceiling');

// Rebuild the public dispatch office after private-shell clearing, preserving
// the scaffold hole and keeping the east wall fully glazed to the hangar.
set(194, 105, 150, 199, 105, 162, 'minecraft:dark_oak_planks', 'OFF-S01', 'office_floor_restore');
set(201, 105, 150, 207, 105, 162, 'minecraft:dark_oak_planks', 'OFF-S01', 'office_floor_restore');
set(200, 105, 150, 200, 105, 152, 'minecraft:dark_oak_planks', 'OFF-S01', 'office_floor_restore');
set(200, 105, 154, 200, 105, 162, 'minecraft:dark_oak_planks', 'OFF-S01', 'office_floor_restore');
set(194, 106, 150, 207, 113, 150, 'minecraft:smooth_quartz', 'OFF-S01', 'office_wall_restore');
set(194, 106, 162, 207, 113, 162, 'minecraft:smooth_quartz', 'OFF-S01', 'office_wall_restore');
set(194, 106, 151, 194, 113, 161, 'minecraft:smooth_quartz', 'OFF-S01', 'office_wall_restore');
set(207, 106, 151, 207, 113, 161, 'minecraft:light_blue_stained_glass', 'OFF-S01', 'hangar_overlook_window');
set(195, 106, 151, 206, 113, 161, 'minecraft:air', 'OFF-S01', 'office_interior_restore');

// Concealed doorway through the office library into the private level.
set(194, 106, 148, 196, 108, 150, 'minecraft:air', 'APT-S01', 'concealed_entry');
set(195, 106, 150, 195, 106, 150, 'minecraft:spruce_door[facing=south,half=lower,open=true]', 'APT-S01', 'concealed_door');
set(195, 107, 150, 195, 107, 150, 'minecraft:spruce_door[facing=south,half=upper,open=true]', 'APT-S01', 'concealed_door');

// Private library directly west of the battlestation room.
set(194, 106, 140, 194, 113, 149, 'minecraft:polished_deepslate', 'LIB-S01', 'library_command_partition');
set(194, 106, 145, 194, 108, 147, 'minecraft:air', 'LIB-S01', 'library_command_doorway');
set(179, 106, 140, 179, 111, 149, 'minecraft:bookshelf', 'LIB-S01', 'library_shelves');
set(180, 106, 140, 193, 111, 140, 'minecraft:bookshelf', 'LIB-S01', 'library_shelves');
set(180, 106, 149, 193, 111, 149, 'minecraft:bookshelf', 'LIB-S01', 'library_shelves');
set(184, 106, 143, 190, 106, 146, 'minecraft:dark_oak_slab[type=top]', 'LIB-S01', 'library_table');
set(186, 106, 142, 188, 106, 142, 'minecraft:dark_oak_stairs[facing=south]', 'LIB-S01', 'library_chair');
set(186, 113, 145, 186, 113, 145, 'minecraft:sea_lantern', 'LIB-S01', 'library_light');

// Exactly twelve monitors in a six-by-two array, with an archive wall and
// three operator positions.
set(195, 107, 139, 206, 111, 139, 'minecraft:cyan_concrete', 'CMD-S01', 'monitor_backlight');
const monitorXs = [195, 197, 199, 201, 203, 205];
for (const x of monitorXs) {
  for (const y of [108, 110]) {
    set(x, y, 140, x, y, 140, 'minecraft:black_stained_glass', 'CMD-S01', 'monitor');
  }
}
set(195, 106, 142, 206, 106, 144, 'minecraft:spruce_slab[type=top]', 'CMD-S01', 'battlestation_desk');
for (const x of [197, 201, 205]) {
  set(x, 106, 145, x, 106, 145, 'minecraft:dark_oak_stairs[facing=north]', 'CMD-S01', 'command_chair');
}
set(206, 107, 146, 206, 111, 149, 'minecraft:bookshelf', 'CMD-S01', 'command_archive');
set(201, 113, 147, 201, 113, 147, 'minecraft:sea_lantern', 'CMD-S01', 'command_light');

// One-bedroom suite west of the office.
set(190, 106, 150, 190, 113, 162, 'minecraft:smooth_quartz', 'APT-S01', 'bedroom_partition');
set(190, 106, 153, 190, 108, 155, 'minecraft:air', 'APT-S01', 'bedroom_doorway');
set(180, 106, 152, 187, 106, 158, 'minecraft:smooth_quartz', 'APT-S01', 'bed_base');
set(180, 107, 152, 187, 107, 158, 'minecraft:red_carpet', 'APT-S01', 'one_bed');
set(179, 106, 150, 189, 110, 150, 'minecraft:light_blue_stained_glass', 'APT-S01', 'bedroom_window');
set(179, 106, 160, 188, 108, 162, 'minecraft:barrel', 'APT-S01', 'bedroom_storage');
set(182, 113, 160, 182, 113, 160, 'minecraft:sea_lantern', 'APT-S01', 'bedroom_light');

// Full-width marble spa bath. Both the shower and oversized soaking tub are
// enclosed in glass and framed entirely with smooth-quartz "marble".
set(178, 105, 163, 207, 105, 180, 'minecraft:smooth_quartz', 'BATH-S01', 'marble_floor');
set(178, 106, 163, 207, 113, 163, 'minecraft:smooth_quartz', 'BATH-S01', 'marble_wall');
set(178, 106, 180, 207, 113, 180, 'minecraft:smooth_quartz', 'BATH-S01', 'marble_wall');
set(178, 106, 164, 178, 113, 179, 'minecraft:smooth_quartz', 'BATH-S01', 'marble_wall');
set(207, 106, 164, 207, 113, 179, 'minecraft:smooth_quartz', 'BATH-S01', 'marble_wall');
set(179, 106, 164, 206, 113, 179, 'minecraft:air', 'BATH-S01', 'spa_interior');
set(198, 106, 162, 200, 108, 163, 'minecraft:air', 'BATH-S01', 'spa_entry');

// Glass shower room, 10x11, with two wall heads and two ceiling rain heads.
set(179, 105, 165, 189, 105, 175, 'minecraft:smooth_quartz', 'BATH-S01', 'shower_marble_floor');
set(179, 106, 165, 179, 112, 175, 'minecraft:glass', 'BATH-S01', 'shower_glass_wall');
set(189, 106, 165, 189, 112, 175, 'minecraft:glass', 'BATH-S01', 'shower_glass_wall');
set(180, 106, 165, 188, 112, 165, 'minecraft:glass', 'BATH-S01', 'shower_glass_wall');
set(180, 106, 175, 188, 112, 175, 'minecraft:glass', 'BATH-S01', 'shower_glass_wall');
set(183, 106, 165, 185, 108, 165, 'minecraft:air', 'BATH-S01', 'shower_glass_door');
set(180, 109, 168, 180, 109, 168, 'minecraft:end_rod[facing=east]', 'BATH-S01', 'wall_shower_head');
set(180, 109, 172, 180, 109, 172, 'minecraft:end_rod[facing=east]', 'BATH-S01', 'wall_shower_head');
set(183, 112, 169, 183, 112, 169, 'minecraft:end_rod[facing=down]', 'BATH-S01', 'ceiling_rain_head');
set(187, 112, 171, 187, 112, 171, 'minecraft:end_rod[facing=down]', 'BATH-S01', 'ceiling_rain_head');
set(181, 107, 168, 181, 108, 168, 'minecraft:light_blue_stained_glass_pane', 'BATH-S01', 'shower_water_detail');
set(181, 107, 172, 181, 108, 172, 'minecraft:light_blue_stained_glass_pane', 'BATH-S01', 'shower_water_detail');
set(183, 109, 169, 183, 111, 169, 'minecraft:light_blue_stained_glass_pane', 'BATH-S01', 'shower_water_detail');
set(187, 109, 171, 187, 111, 171, 'minecraft:light_blue_stained_glass_pane', 'BATH-S01', 'shower_water_detail');

// Huge glass-and-marble soaking tub enclosure.
set(191, 105, 165, 199, 105, 176, 'minecraft:smooth_quartz', 'BATH-S01', 'tub_marble_base');
set(191, 106, 165, 199, 106, 176, 'minecraft:smooth_quartz', 'BATH-S01', 'tub_marble_surround');
set(192, 106, 166, 198, 106, 175, 'minecraft:air', 'BATH-S01', 'tub_basin');
set(192, 106, 166, 198, 106, 175, 'minecraft:water', 'BATH-S01', 'tub_water');
set(190, 107, 164, 200, 112, 164, 'minecraft:glass', 'BATH-S01', 'tub_glass_wall');
set(190, 107, 177, 200, 112, 177, 'minecraft:glass', 'BATH-S01', 'tub_glass_wall');
set(190, 107, 165, 190, 112, 176, 'minecraft:glass', 'BATH-S01', 'tub_glass_wall');
set(200, 107, 165, 200, 112, 176, 'minecraft:glass', 'BATH-S01', 'tub_glass_wall');
set(194, 107, 164, 196, 109, 164, 'minecraft:air', 'BATH-S01', 'tub_glass_door');
set(198, 107, 164, 200, 109, 164, 'minecraft:air', 'BATH-S01', 'tub_gallery_door');
set(200, 107, 168, 200, 109, 170, 'minecraft:air', 'BATH-S01', 'tub_closet_door');

// Walk-in closet and wardrobe adjacent to the bath.
set(201, 106, 164, 201, 113, 179, 'minecraft:air', 'CLOSET-S01', 'closet_walkway');
set(202, 106, 164, 202, 113, 179, 'minecraft:dark_oak_planks', 'CLOSET-S01', 'closet_partition');
set(202, 106, 168, 202, 108, 170, 'minecraft:air', 'CLOSET-S01', 'closet_doorway');
set(203, 106, 165, 206, 108, 165, 'minecraft:barrel', 'CLOSET-S01', 'wardrobe');
set(203, 106, 178, 206, 108, 178, 'minecraft:barrel', 'CLOSET-S01', 'wardrobe');
set(206, 106, 166, 206, 110, 177, 'minecraft:dark_oak_planks', 'CLOSET-S01', 'wardrobe');
set(203, 106, 170, 205, 106, 174, 'minecraft:white_carpet', 'CLOSET-S01', 'closet_island');
set(204, 113, 172, 204, 113, 172, 'minecraft:sea_lantern', 'CLOSET-S01', 'closet_light');

// ── Apartment safe room and private mountain shelter ───────────────────
// The apartment-level safe room is east of the command center. Its vault-like
// west door opens directly into a descending, enclosed stair hall. The shelter
// itself occupies virgin stone above the known y76 underground-complex roof.
set(208, 105, 140, 220, 105, 151, 'minecraft:polished_deepslate', 'SAFE-S01', 'apartment_safe_floor');
set(208, 106, 140, 220, 113, 140, 'minecraft:deepslate_bricks', 'SAFE-S01', 'apartment_safe_wall');
set(208, 106, 151, 220, 113, 151, 'minecraft:deepslate_bricks', 'SAFE-S01', 'apartment_safe_wall');
set(208, 106, 141, 208, 113, 150, 'minecraft:deepslate_bricks', 'SAFE-S01', 'apartment_safe_wall');
set(220, 106, 141, 220, 113, 150, 'minecraft:deepslate_bricks', 'SAFE-S01', 'apartment_safe_wall');
set(209, 106, 141, 219, 113, 150, 'minecraft:air', 'SAFE-S01', 'apartment_safe_interior');
set(208, 114, 140, 220, 114, 151, 'minecraft:deepslate_tiles', 'SAFE-S01', 'apartment_safe_ceiling');
set(207, 106, 144, 208, 109, 147, 'minecraft:air', 'SAFE-S01', 'command_safe_doorway');
set(209, 106, 142, 217, 106, 145, 'minecraft:dark_oak_slab[type=top]', 'SAFE-S01', 'safe_room_table');
set(210, 107, 149, 218, 110, 150, 'minecraft:barrel', 'SAFE-S01', 'emergency_supplies');
set(214, 113, 146, 214, 113, 146, 'minecraft:sea_lantern', 'SAFE-S01', 'safe_room_light');

// Descending stair hall: one block down per block west, from y104 to y81.
// Its z145..148 alignment avoids the scaffold at x200,z153.
const shelterStairs = [];
for (let x = 207; x >= 184; x -= 1) {
  const y = 104 - (207 - x);
  shelterStairs.push([x, y, 146]);
  set(x, y + 1, 145, x, y + 4, 148, 'minecraft:air', 'SHL-S01', 'stair_clearance');
  set(x, y, 145, x, y, 148, 'minecraft:polished_deepslate_stairs[facing=east]', 'SHL-S01', 'descending_stair');
  set(x, y + 1, 144, x, y + 3, 144, 'minecraft:deepslate_bricks', 'SHL-S01', 'stair_wall');
  set(x, y + 1, 149, x, y + 3, 149, 'minecraft:deepslate_bricks', 'SHL-S01', 'stair_wall');
  if ((207 - x) % 5 === 0) {
    set(x, y + 3, 145, x, y + 3, 145, 'minecraft:sea_lantern', 'SHL-S01', 'stair_light');
  }
}
set(207, 106, 145, 208, 109, 148, 'minecraft:air', 'SAFE-S01', 'stair_vault_doorway');
set(208, 106, 144, 208, 109, 149, 'minecraft:iron_block', 'SAFE-S01', 'stair_vault_door_frame');
set(208, 106, 145, 208, 109, 148, 'minecraft:air', 'SAFE-S01', 'stair_vault_doorway');
set(208, 106, 146, 208, 106, 146, 'minecraft:iron_door[facing=west,half=lower,open=true]', 'SAFE-S01', 'stair_vault_door');
set(208, 107, 146, 208, 107, 146, 'minecraft:iron_door[facing=west,half=upper,open=true]', 'SAFE-S01', 'stair_vault_door');

// Hardened shelter envelope at y81, with five solid blocks separating it
// vertically from the older operations complex.
repl(148, 82, 143, 188, 90, 180, natural, 'minecraft:air', 'SHL-S01', 'shelter_excavation');
set(148, 81, 143, 188, 81, 180, 'minecraft:polished_deepslate', 'SHL-S01', 'shelter_floor');
set(148, 82, 143, 188, 90, 143, 'minecraft:deepslate_bricks', 'SHL-S01', 'shelter_wall');
set(148, 82, 180, 188, 90, 180, 'minecraft:deepslate_bricks', 'SHL-S01', 'shelter_wall');
set(148, 82, 144, 148, 90, 179, 'minecraft:deepslate_bricks', 'SHL-S01', 'shelter_wall');
set(188, 82, 144, 188, 90, 179, 'minecraft:deepslate_bricks', 'SHL-S01', 'shelter_wall');
set(148, 91, 143, 188, 91, 180, 'minecraft:reinforced_deepslate', 'SHL-S01', 'shelter_ceiling');
set(149, 82, 144, 187, 90, 179, 'minecraft:air', 'SHL-S01', 'shelter_interior');
// Reopen and restore the final five stair courses after the east shelter wall
// and interior clearance are laid; otherwise the x188 wall seals the descent.
for (let x = 188; x >= 184; x -= 1) {
  const y = 104 - (207 - x);
  set(x, y + 1, 145, x, y + 4, 148, 'minecraft:air', 'SHL-S01', 'shelter_stair_entry_clearance');
  set(x, y, 145, x, y, 148, 'minecraft:polished_deepslate_stairs[facing=east]', 'SHL-S01', 'shelter_stair_entry');
  set(x, y + 1, 144, x, y + 3, 144, 'minecraft:deepslate_bricks', 'SHL-S01', 'shelter_stair_entry_wall');
  set(x, y + 1, 149, x, y + 3, 149, 'minecraft:deepslate_bricks', 'SHL-S01', 'shelter_stair_entry_wall');
}

// Central circulation and four named rooms.
set(166, 82, 144, 166, 90, 179, 'minecraft:deepslate_bricks', 'SHL-S01', 'shelter_partition');
set(167, 82, 163, 187, 90, 163, 'minecraft:deepslate_bricks', 'SHL-S01', 'shelter_partition');
set(149, 82, 163, 165, 90, 163, 'minecraft:deepslate_bricks', 'SHL-S01', 'shelter_partition');
for (const [x1, z1, x2, z2] of [
  [166, 148, 168, 151],
  [166, 156, 168, 159],
  [173, 163, 176, 165],
  [166, 169, 168, 173],
]) {
  set(x1, 82, z1, x2, 85, z2, 'minecraft:air', 'SHL-S01', 'room_doorway');
}

// Fallout shelter: bunks, food/water, medical bench, galley, and sanitation.
for (const z of [146, 151, 156]) {
  set(150, 82, z, 155, 82, z + 2, 'minecraft:smooth_stone', 'FAL-S01', 'bunk');
  set(150, 83, z, 155, 83, z + 2, 'minecraft:green_carpet', 'FAL-S01', 'bunk');
  set(159, 82, z, 164, 84, z + 1, 'minecraft:barrel', 'FAL-S01', 'supply_rack');
}
set(150, 82, 159, 155, 84, 162, 'minecraft:smooth_quartz', 'FAL-S01', 'medical_bay');
set(158, 82, 159, 164, 83, 162, 'minecraft:polished_blackstone', 'FAL-S01', 'shelter_galley');
set(154, 89, 153, 154, 89, 153, 'minecraft:sea_lantern', 'FAL-S01', 'shelter_light');
set(162, 89, 153, 162, 89, 153, 'minecraft:sea_lantern', 'FAL-S01', 'shelter_light');

// Hardened lower safe room.
set(168, 82, 145, 187, 84, 147, 'minecraft:barrel', 'SAFE-U01', 'long_term_supplies');
set(168, 82, 160, 172, 84, 162, 'minecraft:barrel', 'SAFE-U01', 'long_term_supplies');
set(177, 82, 160, 187, 84, 162, 'minecraft:barrel', 'SAFE-U01', 'long_term_supplies');
set(173, 82, 152, 182, 82, 156, 'minecraft:dark_oak_slab[type=top]', 'SAFE-U01', 'safe_room_table');
set(177, 89, 153, 177, 89, 153, 'minecraft:sea_lantern', 'SAFE-U01', 'safe_room_light');

// Communications room with radio racks, map/status wall, and operator desks.
set(168, 82, 164, 171, 85, 166, 'minecraft:polished_blackstone', 'COM-S01', 'radio_rack');
set(184, 82, 164, 187, 85, 166, 'minecraft:polished_blackstone', 'COM-S01', 'radio_rack');
set(169, 84, 164, 186, 87, 164, 'minecraft:redstone_lamp[lit=true]', 'COM-S01', 'radio_display');
set(168, 82, 177, 187, 84, 179, 'minecraft:bookshelf', 'COM-S01', 'communications_archive');
set(170, 82, 169, 185, 82, 172, 'minecraft:spruce_slab[type=top]', 'COM-S01', 'operator_console');
for (const x of [172, 177, 182]) {
  set(x, 82, 173, x, 82, 173, 'minecraft:dark_oak_stairs[facing=north]', 'COM-S01', 'operator_chair');
  set(x, 88, 169, x, 88, 169, 'minecraft:sea_lantern', 'COM-S01', 'communications_light');
}

// Treasury vault with a thick circular-looking iron/deepslate door frame.
set(166, 82, 164, 168, 90, 179, 'minecraft:reinforced_deepslate', 'VLT-S01', 'vault_wall');
set(166, 83, 169, 168, 88, 174, 'minecraft:iron_block', 'VLT-S01', 'vault_door_frame');
set(166, 84, 170, 168, 87, 173, 'minecraft:air', 'VLT-S01', 'vault_door_opening');
set(168, 84, 171, 168, 84, 171, 'minecraft:iron_door[facing=east,half=lower,open=true]', 'VLT-S01', 'vault_door');
set(168, 85, 171, 168, 85, 171, 'minecraft:iron_door[facing=east,half=upper,open=true]', 'VLT-S01', 'vault_door');
set(166, 85, 169, 166, 86, 169, 'minecraft:gold_block', 'VLT-S01', 'vault_wheel');

// Block treasury: every high-value ore/metal family receives a visible bay.
const treasuryBlocks = [
  'minecraft:netherite_block',
  'minecraft:diamond_block',
  'minecraft:emerald_block',
  'minecraft:gold_block',
  'minecraft:iron_block',
  'minecraft:copper_block',
  'minecraft:lapis_block',
  'minecraft:redstone_block',
  'minecraft:amethyst_block',
  'minecraft:raw_gold_block',
  'minecraft:raw_iron_block',
  'minecraft:raw_copper_block',
  'minecraft:ancient_debris',
  'minecraft:quartz_block',
  'minecraft:beacon',
  'minecraft:conduit[waterlogged=false]',
];
for (let i = 0; i < treasuryBlocks.length; i += 1) {
  const x = 150 + (i % 4) * 4;
  const z = 165 + Math.floor(i / 4) * 4;
  set(x, 82, z, x + 2, 84, z + 2, treasuryBlocks[i], 'VLT-S01', 'treasury_block_bay');
}
set(150, 85, 165, 165, 85, 179, 'minecraft:iron_bars', 'VLT-S01', 'treasury_security_grid');
set(151, 85, 166, 164, 85, 178, 'minecraft:air', 'VLT-S01', 'treasury_aisle');

// Actual in-game armory and rare-item reserves.
set(150, 82, 178, 150, 82, 178, 'minecraft:chest[facing=east]', 'VLT-S01', 'armory_chest');
cmd(
  `data merge block 150 82 178 {CustomName:'{"text":"ARMORY"}',Items:[{Slot:0b,id:"minecraft:netherite_sword",count:1},{Slot:1b,id:"minecraft:netherite_axe",count:1},{Slot:2b,id:"minecraft:mace",count:1},{Slot:3b,id:"minecraft:trident",count:1},{Slot:4b,id:"minecraft:bow",count:1},{Slot:5b,id:"minecraft:crossbow",count:1},{Slot:6b,id:"minecraft:shield",count:1},{Slot:7b,id:"minecraft:netherite_helmet",count:1},{Slot:8b,id:"minecraft:netherite_chestplate",count:1},{Slot:9b,id:"minecraft:netherite_leggings",count:1},{Slot:10b,id:"minecraft:netherite_boots",count:1}]}`,
  'VLT-S01',
  'armory_inventory',
);
set(154, 82, 178, 154, 82, 178, 'minecraft:chest[facing=east]', 'VLT-S01', 'rare_items_chest');
cmd(
  `data merge block 154 82 178 {CustomName:'{"text":"RARE RESERVE"}',Items:[{Slot:0b,id:"minecraft:enchanted_golden_apple",count:64},{Slot:1b,id:"minecraft:nether_star",count:64},{Slot:2b,id:"minecraft:elytra",count:1},{Slot:3b,id:"minecraft:totem_of_undying",count:64},{Slot:4b,id:"minecraft:heavy_core",count:64},{Slot:5b,id:"minecraft:echo_shard",count:64},{Slot:6b,id:"minecraft:diamond",count:64},{Slot:7b,id:"minecraft:emerald",count:64},{Slot:8b,id:"minecraft:netherite_ingot",count:64},{Slot:9b,id:"minecraft:gold_ingot",count:64},{Slot:10b,id:"minecraft:dragon_breath",count:64}]}`,
  'VLT-S01',
  'rare_inventory',
);
set(158, 82, 178, 158, 82, 178, 'minecraft:chest[facing=east]', 'VLT-S01', 'currency_chest');
cmd(
  `data merge block 158 82 178 {CustomName:'{"text":"CURRENCY & METALS"}',Items:[{Slot:0b,id:"minecraft:diamond",count:64},{Slot:1b,id:"minecraft:emerald",count:64},{Slot:2b,id:"minecraft:gold_ingot",count:64},{Slot:3b,id:"minecraft:iron_ingot",count:64},{Slot:4b,id:"minecraft:copper_ingot",count:64},{Slot:5b,id:"minecraft:netherite_ingot",count:64},{Slot:6b,id:"minecraft:lapis_lazuli",count:64},{Slot:7b,id:"minecraft:redstone",count:64},{Slot:8b,id:"minecraft:amethyst_shard",count:64},{Slot:9b,id:"minecraft:quartz",count:64}]}`,
  'VLT-S01',
  'currency_inventory',
);
set(157, 89, 171, 157, 89, 171, 'minecraft:sea_lantern', 'VLT-S01', 'vault_light');

// Shelter furniture is authored after the structural stair pass. Reopen the
// final four courses last so emergency-supply barrels cannot occupy the
// apartment-to-shelter descent or its player headroom.
for (let x = 187; x >= 184; x -= 1) {
  const y = 104 - (207 - x);
  set(x, y + 1, 145, x, y + 4, 148, 'minecraft:air', 'SHL-S01', 'final_stair_clearance');
  set(x, y, 145, x, y, 148, 'minecraft:polished_deepslate_stairs[facing=east]', 'SHL-S01', 'final_stair_course');
}

// ── Three-level grand treasury vault ───────────────────────────────────
// A secure connector leaves the shelter's east wall, then descends into a
// previously unbuilt volume beneath and south of the heliport. The top of the
// grand vault is y76, leaving the live y88 heliport and its support untouched.
repl(188, 82, 172, 226, 86, 176, natural, 'minecraft:air', 'VLT-G01', 'vault_access_clearance');
set(188, 81, 172, 226, 81, 176, 'minecraft:polished_deepslate', 'VLT-G01', 'vault_access_floor');
set(188, 82, 171, 226, 85, 171, 'minecraft:deepslate_bricks', 'VLT-G01', 'vault_access_wall');
set(188, 82, 177, 226, 85, 177, 'minecraft:deepslate_bricks', 'VLT-G01', 'vault_access_wall');
set(188, 86, 172, 226, 86, 176, 'minecraft:reinforced_deepslate', 'VLT-G01', 'vault_access_ceiling');
set(188, 82, 172, 188, 85, 176, 'minecraft:air', 'VLT-G01', 'vault_access_doorway');

// Fifteen-step final descent from the y81 connector to the upper-vault floor
// at y66. Every adjacent walk block differs by exactly one.
const grandVaultApproach = [];
for (let z = 177; z <= 191; z += 1) {
  const y = 80 - (z - 177);
  grandVaultApproach.push([225, y, z]);
  set(223, y + 1, z, 227, y + 5, z, 'minecraft:air', 'VLT-G01', 'vault_descent_clearance');
  set(223, y, z, 227, y, z, 'minecraft:polished_deepslate_stairs[facing=north]', 'VLT-G01', 'vault_descent');
  set(222, y + 1, z, 222, y + 3, z, 'minecraft:deepslate_bricks', 'VLT-G01', 'vault_descent_wall');
  set(228, y + 1, z, 228, y + 3, z, 'minecraft:deepslate_bricks', 'VLT-G01', 'vault_descent_wall');
}
set(223, 67, 192, 229, 71, 196, 'minecraft:air', 'VLT-G01', 'upper_vault_threshold_clearance');
set(223, 66, 192, 230, 66, 196, 'minecraft:smooth_quartz', 'VLT-G01', 'upper_vault_threshold');

// Virgin-stone envelope: lower y44, middle y55, upper y66, crown y76.
repl(230, 45, 184, 262, 75, 226, natural, 'minecraft:air', 'VLT-G01', 'grand_vault_excavation');
// The mountain intersects a natural aquifer. Water is intentionally excluded
// from the broad natural mask elsewhere, but the sealed grand-vault envelope
// must be dry before its floors, stairs, and treasury bays are placed.
repl(231, 45, 185, 261, 75, 225, 'minecraft:water,minecraft:bubble_column', 'minecraft:air', 'VLT-G01', 'grand_vault_dewatering');
set(230, 44, 184, 262, 44, 226, 'minecraft:smooth_quartz', 'VLT-G01', 'lower_marble_floor');
set(230, 55, 184, 262, 55, 226, 'minecraft:smooth_quartz', 'VLT-G01', 'middle_marble_floor');
set(230, 66, 184, 262, 66, 226, 'minecraft:smooth_quartz', 'VLT-G01', 'upper_marble_floor');
set(230, 45, 184, 262, 75, 184, 'minecraft:smooth_quartz', 'VLT-G01', 'grand_vault_wall');
set(230, 45, 226, 262, 75, 226, 'minecraft:smooth_quartz', 'VLT-G01', 'grand_vault_wall');
set(230, 45, 185, 230, 75, 225, 'minecraft:smooth_quartz', 'VLT-G01', 'grand_vault_wall');
set(262, 45, 185, 262, 75, 225, 'minecraft:smooth_quartz', 'VLT-G01', 'grand_vault_wall');
set(230, 76, 184, 262, 76, 226, 'minecraft:reinforced_deepslate', 'VLT-G01', 'grand_vault_crown');

// Gold Art Deco bands and marble pilasters unify all three levels.
for (const y of [45, 54, 56, 65, 67, 75]) {
  set(231, y, 185, 261, y, 185, 'minecraft:gold_block', 'VLT-G01', 'gold_cornice');
  set(231, y, 225, 261, y, 225, 'minecraft:gold_block', 'VLT-G01', 'gold_cornice');
}
for (const x of [232, 238, 244, 250, 256, 260]) {
  set(x, 45, 185, x, 75, 185, 'minecraft:quartz_pillar[axis=y]', 'VLT-G01', 'marble_pilaster');
  set(x, 45, 225, x, 75, 225, 'minecraft:quartz_pillar[axis=y]', 'VLT-G01', 'marble_pilaster');
}

// Triple-height atrium voids. Gallery rims remain around every edge.
set(236, 66, 194, 256, 66, 216, 'minecraft:air', 'VLT-G01', 'upper_atrium_void');
set(240, 55, 204, 252, 55, 218, 'minecraft:air', 'VLT-G01', 'middle_atrium_void');

// Titanic-inspired bifurcated marble stair: paired upper flights converge on
// a gold-trimmed middle landing, then a broad central flight reaches the lower
// gallery. Stair width is five throughout.
const grandStairs = [];
for (let step = 0; step < 11; step += 1) {
  const z = 194 + step;
  const y = 65 - step;
  for (const [x1, x2] of [[236, 240], [252, 256]]) {
    set(x1, y, z, x2, y, z, 'minecraft:quartz_stairs[facing=north]', 'VLT-G01', 'bifurcated_upper_stair');
    grandStairs.push([Math.floor((x1 + x2) / 2), y, z]);
  }
  set(235, y + 1, z, 235, y + 1, z, 'minecraft:gold_block', 'VLT-G01', 'stair_balustrade');
  set(241, y + 1, z, 241, y + 1, z, 'minecraft:gold_block', 'VLT-G01', 'stair_balustrade');
  set(251, y + 1, z, 251, y + 1, z, 'minecraft:gold_block', 'VLT-G01', 'stair_balustrade');
  set(257, y + 1, z, 257, y + 1, z, 'minecraft:gold_block', 'VLT-G01', 'stair_balustrade');
}
set(236, 55, 204, 256, 55, 209, 'minecraft:smooth_quartz', 'VLT-G01', 'middle_grand_landing');
set(236, 56, 204, 256, 56, 204, 'minecraft:gold_block', 'VLT-G01', 'landing_gold_edge');
for (let step = 0; step < 11; step += 1) {
  const z = 210 + step;
  const y = 54 - step;
  set(244, y, z, 248, y, z, 'minecraft:quartz_stairs[facing=north]', 'VLT-G01', 'central_lower_stair');
  set(243, y + 1, z, 243, y + 1, z, 'minecraft:gold_block', 'VLT-G01', 'stair_balustrade');
  set(249, y + 1, z, 249, y + 1, z, 'minecraft:gold_block', 'VLT-G01', 'stair_balustrade');
  grandStairs.push([246, y, z]);
}
set(240, 44, 219, 252, 44, 224, 'minecraft:smooth_quartz', 'VLT-G01', 'lower_grand_landing');
set(240, 45, 219, 252, 45, 219, 'minecraft:gold_block', 'VLT-G01', 'landing_gold_edge');

// A three-storey chandelier marks the atrium center.
set(246, 68, 205, 246, 75, 205, 'minecraft:iron_chain', 'VLT-G01', 'grand_chandelier');
for (const y of [67, 63, 58]) {
  set(243, y, 202, 249, y, 208, 'minecraft:gold_block', 'VLT-G01', 'chandelier_ring');
  set(244, y, 203, 248, y, 207, 'minecraft:air', 'VLT-G01', 'chandelier_center');
  for (const [x, z] of [[243, 202], [249, 202], [243, 208], [249, 208]]) {
    set(x, y - 1, z, x, y - 1, z, 'minecraft:sea_lantern', 'VLT-G01', 'chandelier_light');
  }
}

// Monumental upper vault door.
set(230, 67, 188, 232, 74, 196, 'minecraft:reinforced_deepslate', 'VLT-G01', 'grand_vault_door_frame');
set(230, 68, 190, 232, 72, 194, 'minecraft:iron_block', 'VLT-G01', 'grand_vault_door');
set(230, 67, 191, 232, 71, 193, 'minecraft:air', 'VLT-G01', 'grand_vault_door_opening');
set(232, 67, 192, 232, 67, 192, 'minecraft:iron_door[facing=east,half=lower,open=true]', 'VLT-G01', 'grand_vault_door');
set(232, 68, 192, 232, 68, 192, 'minecraft:iron_door[facing=east,half=upper,open=true]', 'VLT-G01', 'grand_vault_door');
set(230, 70, 189, 230, 71, 189, 'minecraft:gold_block', 'VLT-G01', 'grand_vault_wheel');

// Fill all three gallery levels with repeating treasury bays while leaving
// six-block circulation aisles and every staircase landing clear.
const vaultLevels = [44, 55, 66];
for (let levelIndex = 0; levelIndex < vaultLevels.length; levelIndex += 1) {
  const floorY = vaultLevels[levelIndex];
  const displayY = floorY + 1;
  const positions = [];
  for (let z = 188; z <= 222; z += 5) {
    positions.push([232, z], [258, z]);
  }
  for (let x = 237; x <= 255; x += 5) {
    positions.push([x, 187], [x, 222]);
  }
  for (let i = 0; i < positions.length; i += 1) {
    const [x, z] = positions[i];
    if (levelIndex === 0 && z === 222 && x >= 237 && x <= 257) continue;
    const block = treasuryBlocks[(i + levelIndex * 5) % treasuryBlocks.length];
    set(x, displayY, z, x + 2, displayY + 2, z + 2, block, 'VLT-G01', `treasury_level_${levelIndex + 1}`);
  }

  // Each floor also receives actual inventories rather than display blocks alone.
  const chestZ = 220;
  for (const [chestX, title, items] of [
    [233, `LEVEL ${levelIndex + 1} ARMORY`, [
      'netherite_sword', 'netherite_axe', 'mace', 'trident', 'bow', 'crossbow', 'shield',
    ]],
    [238, `LEVEL ${levelIndex + 1} RARES`, [
      'enchanted_golden_apple', 'nether_star', 'elytra', 'totem_of_undying', 'heavy_core', 'echo_shard',
    ]],
    [255, `LEVEL ${levelIndex + 1} TREASURY`, [
      'diamond', 'emerald', 'netherite_ingot', 'gold_ingot', 'iron_ingot', 'copper_ingot', 'amethyst_shard',
    ]],
  ]) {
    set(chestX, displayY, chestZ, chestX, displayY, chestZ, 'minecraft:chest[facing=north]', 'VLT-G01', 'treasury_chest');
    const nbtItems = items.map((item, slot) => (
      `{Slot:${slot}b,id:"minecraft:${item}",count:64}`
    )).join(',');
    cmd(
      `data merge block ${chestX} ${displayY} ${chestZ} {CustomName:'{"text":"${title}"}',Items:[${nbtItems}]}`,
      'VLT-G01',
      'treasury_inventory',
    );
  }
}

// ── Roof observatory ────────────────────────────────────────────────────
// White, symmetrical, Art Deco massing and triple oxidized-copper domes use
// Griffith Observatory as a design reference without attempting a literal copy.
set(184, 121, 136, 228, 126, 166, 'minecraft:smooth_quartz', 'OBS-S01', 'observatory_podium');
set(185, 121, 137, 227, 125, 165, 'minecraft:air', 'OBS-S01', 'observatory_interior');
set(184, 126, 136, 228, 126, 166, 'minecraft:quartz_block', 'OBS-S01', 'observatory_roof');

// Symmetrical south facade, centered portico, tall windows, and stepped cornice.
set(184, 121, 166, 228, 126, 166, 'minecraft:smooth_quartz', 'OBS-S01', 'south_facade');
set(197, 121, 166, 215, 126, 166, 'minecraft:quartz_pillar[axis=y]', 'OBS-S01', 'central_portico');
set(200, 121, 165, 212, 124, 166, 'minecraft:air', 'OBS-S01', 'observatory_entry');
for (const x of [198, 202, 210, 214]) {
  set(x, 121, 165, x, 126, 165, 'minecraft:quartz_pillar[axis=y]', 'OBS-S01', 'portico_column');
}
set(195, 127, 164, 217, 127, 167, 'minecraft:smooth_quartz', 'OBS-S01', 'stepped_cornice');
set(198, 128, 165, 214, 128, 166, 'minecraft:quartz_slab[type=bottom]', 'OBS-S01', 'stepped_cornice');
for (const x of [188, 192, 220, 224]) {
  set(x, 122, 166, x + 1, 125, 166, 'minecraft:light_blue_stained_glass', 'OBS-S01', 'facade_window');
}

// Interior plan: central planetarium gallery and two telescope rooms.
set(196, 121, 138, 196, 125, 164, 'minecraft:smooth_quartz', 'OBS-S01', 'gallery_partition');
set(216, 121, 138, 216, 125, 164, 'minecraft:smooth_quartz', 'OBS-S01', 'gallery_partition');
set(196, 121, 148, 196, 124, 153, 'minecraft:air', 'OBS-S01', 'west_gallery_portal');
set(216, 121, 148, 216, 124, 153, 'minecraft:air', 'OBS-S01', 'east_gallery_portal');
set(206, 121, 150, 206, 124, 152, 'minecraft:polished_blackstone', 'OBS-S01', 'planetarium_projector');
set(206, 125, 151, 206, 127, 151, 'minecraft:end_rod[facing=up]', 'OBS-S01', 'planetarium_projector');
set(188, 121, 150, 192, 122, 152, 'minecraft:polished_blackstone', 'OBS-S01', 'west_telescope');
set(220, 121, 150, 224, 122, 152, 'minecraft:polished_blackstone', 'OBS-S01', 'east_telescope');
set(190, 123, 151, 193, 123, 151, 'minecraft:end_rod[facing=east]', 'OBS-S01', 'west_telescope');
set(219, 123, 151, 222, 123, 151, 'minecraft:end_rod[facing=west]', 'OBS-S01', 'east_telescope');
for (const [x, z] of [[188, 140], [206, 140], [224, 140], [188, 162], [206, 162], [224, 162]]) {
  set(x, 125, z, x, 125, z, 'minecraft:sea_lantern', 'OBS-S01', 'gallery_light');
}

// Stair/lift tower from the hangar bay to the roof terrace, fully separate
// from the deep service shaft.
set(180, 99, 158, 186, 120, 164, 'minecraft:light_blue_stained_glass', 'OBS-S01', 'public_lift_tower');
set(181, 99, 159, 185, 120, 163, 'minecraft:air', 'OBS-S01', 'public_lift_interior');
set(183, 99, 161, 183, 120, 161, 'minecraft:scaffolding', 'OBS-S01', 'public_lift');
set(181, 99, 158, 185, 102, 159, 'minecraft:air', 'OBS-S01', 'lift_bay_entry');
set(181, 120, 159, 185, 123, 159, 'minecraft:air', 'OBS-S01', 'lift_roof_exit');
set(183, 120, 158, 201, 120, 166, 'minecraft:smooth_quartz', 'OBS-S01', 'observatory_walk');
set(183, 120, 161, 183, 120, 161, 'minecraft:scaffolding', 'OBS-S01', 'public_lift_top');

// Terrace rail and classical lamps.
set(176, 121, 138, 234, 121, 138, 'minecraft:diorite_wall', 'OBS-S01', 'terrace_rail');
set(176, 121, 181, 196, 121, 181, 'minecraft:diorite_wall', 'OBS-S01', 'terrace_rail');
set(217, 121, 181, 234, 121, 181, 'minecraft:diorite_wall', 'OBS-S01', 'terrace_rail');
set(176, 121, 139, 176, 121, 180, 'minecraft:diorite_wall', 'OBS-S01', 'terrace_rail');
set(234, 121, 139, 234, 121, 180, 'minecraft:diorite_wall', 'OBS-S01', 'terrace_rail');
for (const [x, z] of [[179, 141], [231, 141], [179, 178], [231, 178], [192, 178], [220, 178]]) {
  set(x, 121, z, x, 124, z, 'minecraft:quartz_pillar[axis=y]', 'OBS-S01', 'terrace_lamp');
  set(x, 125, z, x, 125, z, 'minecraft:lantern', 'OBS-S01', 'terrace_lamp');
}

function dome(cx, cz, baseY, radius, height, block, area, role) {
  const placed = new Set();
  for (let dy = 0; dy <= height; dy += 1) {
    const vertical = dy / height;
    const layerRadius = Math.max(0, Math.round(radius * Math.sqrt(1 - vertical * vertical)));
    if (layerRadius === 0) {
      const key = `${cx},${baseY + dy},${cz}`;
      if (!placed.has(key)) {
        set(cx, baseY + dy, cz, cx, baseY + dy, cz, block, area, role);
        placed.add(key);
      }
      continue;
    }
    for (let dz = -layerRadius; dz <= layerRadius; dz += 1) {
      const dx = Math.round(Math.sqrt(Math.max(0, layerRadius * layerRadius - dz * dz)));
      for (const x of new Set([cx - dx, cx + dx])) {
        const key = `${x},${baseY + dy},${cz + dz}`;
        if (!placed.has(key)) {
          set(x, baseY + dy, cz + dz, x, baseY + dy, cz + dz, block, area, role);
          placed.add(key);
        }
      }
    }
    for (let dx = -layerRadius; dx <= layerRadius; dx += 1) {
      const dz = Math.round(Math.sqrt(Math.max(0, layerRadius * layerRadius - dx * dx)));
      for (const z of new Set([cz - dz, cz + dz])) {
        const key = `${cx + dx},${baseY + dy},${z}`;
        if (!placed.has(key)) {
          set(cx + dx, baseY + dy, z, cx + dx, baseY + dy, z, block, area, role);
          placed.add(key);
        }
      }
    }
  }
}

dome(206, 151, 127, 10, 9, 'minecraft:oxidized_copper', 'OBS-S01', 'central_dome');
dome(190, 151, 127, 6, 6, 'minecraft:oxidized_copper', 'OBS-S01', 'west_dome');
dome(222, 151, 127, 6, 6, 'minecraft:oxidized_copper', 'OBS-S01', 'east_dome');

// ── Hangar-door trail to the existing heliport ─────────────────────────
// The source terrain already follows this profile closely. Natural blocks are
// removed only from the three-wide trail/headroom strip; retaining blocks fill
// small downhill gaps. The heliport itself (x238..257, y88, z172..191) is not
// overwritten.
const trail = [];
for (let x = 220; x <= 237; x += 1) {
  const progress = (x - 220) / 17;
  const y = 98 - Math.floor(progress * 10);
  trail.push([x, y, 183]);
  set(x, y + 1, 182, x, 108, 184, 'minecraft:air', 'TRL-S01', 'trail_clearance');
  for (let z = 182; z <= 184; z += 1) {
    const top = await terrainTop(x, z);
    if (top < y) {
      set(x, top + 1, z, x, y - 1, z, 'minecraft:stone_bricks', 'TRL-S01', 'trail_foundation');
    }
  }
  set(x, y, 182, x, y, 184, 'minecraft:polished_andesite', 'TRL-S01', 'trail_surface');
  if ((x - 220) % 4 === 0) {
    set(x, y, 183, x, y, 183, 'minecraft:sea_lantern', 'TRL-S01', 'trail_light');
  }
  set(x, y + 1, 181, x, y + 1, 181, 'minecraft:iron_bars', 'TRL-S01', 'trail_rail');
  set(x, y + 1, 185, x, y + 1, 185, 'minecraft:iron_bars', 'TRL-S01', 'trail_rail');
}
set(237, 88, 182, 238, 88, 184, 'minecraft:gray_concrete', 'TRL-S01', 'helipad_connection');
set(234, 89, 187, 237, 92, 187, 'minecraft:smooth_quartz', 'TRL-S01', 'helipad_sign_pylon');
cmd('setblock 237 91 187 minecraft:oak_wall_sign[facing=east]', 'TRL-S01', 'helipad_sign');
cmd(
  `data merge block 237 91 187 {front_text:{color:"black",has_glowing_text:1b,messages:['{"text":"HELIPORT"}','{"text":"HANGAR TRAIL <"}','{"text":"SHAFT IN OFFICE"}','{"text":"ROOF OBSERVATORY"}']}}`,
  'TRL-S01',
  'helipad_sign_text',
);
set(222, 99, 179, 222, 102, 179, 'minecraft:smooth_quartz', 'TRL-S01', 'door_sign_pylon');
cmd('setblock 222 101 180 minecraft:oak_wall_sign[facing=south]', 'TRL-S01', 'door_sign');
cmd(
  `data merge block 222 101 180 {front_text:{color:"black",has_glowing_text:1b,messages:['{"text":"HANGAR BAY"}','{"text":"HELIPORT ->"}','{"text":"OBSERVATORY UP"}','{"text":"OFFICE / SHAFT 2F"}']}}`,
  'TRL-S01',
  'door_sign_text',
);

const areas = {};
for (const operation of ops) {
  const area = areas[operation.area] ??= { operations: 0, byRole: {} };
  area.operations += 1;
  area.byRole[operation.role] = (area.byRole[operation.role] ?? 0) + 1;
}

const report = {
  schemaVersion: 1,
  id: 'mainstreet-america-surface-hangar-observatory',
  generatedAtUtc: new Date().toISOString(),
  sourceSnapshot: 'data/worldsnap/region',
  operationCount: ops.length,
  preserved: {
    serviceShaft: {
      column: [200, 153],
      expectedContinuousRange: [24, 105],
      expectedBlockCount: 82,
      repairedAt: [200, 50, 153],
    },
    heliport: {
      box: [238, 88, 172, 257, 89, 191],
      protectedCore: [239, 88, 172, 257, 89, 191],
      sameMaterialTieIn: [238, 88, 182, 238, 88, 184],
      centerMarker: [248, 90, 182],
    },
    projectFence: { northLineZ: 135, minimumHangarZ: 137 },
  },
  envelopes: {
    hangar: [176, 88, 138, 234, 120, 181],
    bay: [177, 98, 139, 233, 118, 180],
    secondFloorOffice: [194, 105, 150, 207, 114, 162],
    privateResidence: [178, 105, 139, 220, 114, 180],
    privateLibrary: [179, 105, 139, 194, 114, 150],
    commandCenter: [194, 105, 139, 207, 114, 150],
    marbleGlassSpa: [178, 105, 163, 207, 114, 180],
    apartmentSafeRoom: [208, 105, 140, 220, 114, 151],
    mountainShelter: [148, 81, 143, 188, 91, 180],
    grandVault: [230, 44, 184, 262, 76, 226],
    observatory: [175, 119, 137, 235, 136, 182],
    heliport: [238, 88, 172, 257, 89, 191],
  },
  floorplans: {
    hangar: {
      floors: 2,
      rooms: [
        'main high bay',
        'two maintenance positions',
        'stores and tool wall',
        'ground service core',
        'second-floor dispatch office',
        'hangar overlook and catwalk',
      ],
      shaftArrival: [200, 106, 153],
      bayExit: [220, 99, 181],
    },
    observatory: {
      rooms: ['central planetarium gallery', 'west telescope room', 'east telescope room', 'roof terrace'],
      motif: 'white symmetrical Art Deco podium, central copper dome, twin smaller copper domes',
    },
    privateResidence: {
      advertisedPublicly: false,
      rooms: [
        'one bedroom',
        'private library off command center',
        'twelve-monitor command center',
        'marble-and-glass spa bath',
        'four-head glass shower with two ceiling rain heads',
        'oversized glass-and-marble soaking tub',
        'walk-in closet and wardrobe',
        'apartment safe room',
      ],
      commandCenterMonitorCount: 12,
      showerHeads: { total: 4, ceiling: 2, wall: 2 },
      concealedEntry: [195, 106, 150],
    },
    privateShelter: {
      rooms: [
        'fallout shelter',
        'hardened safe room',
        'communications room',
        'treasury antechamber',
        'three-level grand vault',
      ],
      grandVaultLevels: [
        { name: 'lower gallery', floorY: 44 },
        { name: 'middle gallery', floorY: 55 },
        { name: 'upper gallery', floorY: 66 },
      ],
      valuables: treasuryBlocks,
      actualInventories: true,
      staircase: 'bifurcated marble-and-gold upper flight plus broad central lower flight',
    },
  },
  route: {
    name: 'MSA Office Shaft to Heliport',
    waypoints: [
      [200, 106, 153],
      [207, 106, 158],
      [218, 106, 158],
      [226, 99, 158],
      [220, 99, 181],
      [237, 89, 183],
      [248, 90, 182],
    ],
    trailProfile: trail,
  },
  secureRoutes: {
    apartmentToShelter: shelterStairs,
    shelterToGrandVault: [
      [188, 82, 174],
      [226, 82, 174],
      ...grandVaultApproach,
      [232, 67, 192],
    ],
    grandVaultStairs: grandStairs,
  },
  terrainFoundation: {
    method: 'snapshot-derived support runs',
    fixedDepthCuboid: false,
    runs: foundationProfile,
  },
  designReference: {
    name: 'Griffith Observatory-inspired',
    appliedMotifs: [
      'white symmetrical Art Deco massing',
      'central dome flanked by two smaller domes',
      'broad roof terrace and centered portico',
    ],
  },
  areas,
};

const output = [
  '# GENERATED FILE — MainStreet surface hangar, observatory, private suite, and heliport trail',
  '# Site clearing is material-masked; existing scaffold shaft and heliport are preserved.',
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
  areas,
}, null, 2));
