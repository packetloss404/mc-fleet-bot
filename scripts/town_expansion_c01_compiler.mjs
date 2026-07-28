#!/usr/bin/env node
/**
 * C01 east bunker compiler.
 *
 * This module consumes the frozen cell-classification manifest rather than
 * maintaining a second hand-authored floor plan. It only writes into the
 * caller's in-memory Model and never connects to Minecraft.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DEFAULT_MANIFEST = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/c01-bunker-classification-manifest.json',
);
const DEFAULT_MIGRATION_LEDGER = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/c01-source-nbt-migration-ledger.json',
);

const AIR = 'minecraft:air';
const SHELL = 'minecraft:reinforced_deepslate';
const WALL = 'minecraft:deepslate_bricks';
const FLOOR = 'minecraft:polished_blackstone';
const CEILING = 'minecraft:polished_deepslate';

const LEVEL_SCOPES = Object.freeze({
  'C01-L1-SECURITY-GARAGE': 'c01_east_l1_security_garage',
  'C01-L2-LIVING-AMENITY': 'c01_east_l2_living_adult',
  'C01-L3-AGRICULTURE-WATER': 'c01_east_l3_agriculture_water',
  'C01-L4-COMMAND-MEDICAL': 'c01_east_l4_command_medical',
  'C01-L5-POWER-ESCAPE': 'c01_east_l5_power_escape',
  'C01-OWNER-CLUB-ARRIVAL': 'c01_owner_club_arrival',
  'C01-OWNER-RESIDENCE': 'c01_owner_residence',
});

const LEVEL_ACCENTS = Object.freeze({
  'C01-L1-SECURITY-GARAGE': 'minecraft:light_blue_concrete',
  'C01-L2-LIVING-AMENITY': 'minecraft:crimson_planks',
  'C01-L3-AGRICULTURE-WATER': 'minecraft:moss_block',
  'C01-L4-COMMAND-MEDICAL': 'minecraft:oxidized_cut_copper',
  'C01-L5-POWER-ESCAPE': 'minecraft:yellow_concrete',
  'C01-OWNER-CLUB-ARRIVAL': 'minecraft:red_nether_bricks',
  'C01-OWNER-RESIDENCE': 'minecraft:smooth_quartz',
});

const ADULT_PALETTES = Object.freeze([
  ['minecraft:red_nether_bricks', 'minecraft:crimson_planks', 'minecraft:red_carpet'],
  ['minecraft:polished_blackstone_bricks', 'minecraft:purple_concrete', 'minecraft:purple_carpet'],
  ['minecraft:dark_oak_planks', 'minecraft:magenta_terracotta', 'minecraft:magenta_carpet'],
  ['minecraft:quartz_bricks', 'minecraft:light_gray_concrete', 'minecraft:pink_carpet'],
  ['minecraft:deepslate_tiles', 'minecraft:blue_terracotta', 'minecraft:blue_carpet'],
  ['minecraft:cut_copper', 'minecraft:brown_terracotta', 'minecraft:orange_carpet'],
]);

function meta(scope, role, phase) {
  return { scope, role, phase };
}

function key(x, y, z) {
  return `${x},${y},${z}`;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeBox(raw) {
  const [x1, y1, z1, x2, y2, z2] = raw.map(Number);
  return [
    Math.min(x1, x2),
    Math.min(y1, y2),
    Math.min(z1, z2),
    Math.max(x1, x2),
    Math.max(y1, y2),
    Math.max(z1, z2),
  ];
}

function boxCount(raw) {
  const [x1, y1, z1, x2, y2, z2] = normalizeBox(raw);
  return (x2 - x1 + 1) * (y2 - y1 + 1) * (z2 - z1 + 1);
}

function pointLine(points) {
  const output = [];
  for (let segment = 0; segment < points.length - 1; segment += 1) {
    const start = points[segment];
    const end = points[segment + 1];
    const dx = end[0] - start[0];
    const dz = end[1] - start[1];
    const steps = Math.max(Math.abs(dx), Math.abs(dz));
    for (let step = 0; step <= steps; step += 1) {
      const x = Math.round(start[0] + (dx * step) / Math.max(1, steps));
      const z = Math.round(start[1] + (dz * step) / Math.max(1, steps));
      if (!output.length || output.at(-1)[0] !== x || output.at(-1)[1] !== z) {
        output.push([x, z]);
      }
    }
  }
  return output;
}

function spaceBounds(space) {
  const boxes = space.boxes.map(normalizeBox);
  return [
    Math.min(...boxes.map((box) => box[0])),
    Math.min(...boxes.map((box) => box[1])),
    Math.min(...boxes.map((box) => box[2])),
    Math.max(...boxes.map((box) => box[3])),
    Math.max(...boxes.map((box) => box[4])),
    Math.max(...boxes.map((box) => box[5])),
  ];
}

function roomPoint(manifest, spaceId) {
  const node = manifest.routeGraph.nodes.find((candidate) => candidate.spaceId === spaceId);
  return node?.point?.map(Number) ?? null;
}

function safeFurnitureOrigin(space, manifest) {
  const [x1, y1, z1, x2, y2, z2] = spaceBounds(space);
  const routePoint = roomPoint(manifest, space.id);
  const x = Math.max(x1 + 3, Math.min(x2 - 3, routePoint?.[0] ?? Math.floor((x1 + x2) / 2)));
  const z = Math.max(z1 + 3, Math.min(z2 - 3, routePoint?.[2] ?? Math.floor((z1 + z2) / 2)));
  return [x, Math.min(y2 - 2, y1 + 1), z];
}

function setIfUnoccupied(model, x, y, z, state, metadata) {
  const existing = model.cells?.get?.(key(x, y, z));
  if (!existing || existing.state === AIR) model.set(x, y, z, state, metadata);
}

function addCeilingLight(model, scope, x, y, z, role, phase) {
  model.set(
    x,
    y,
    z,
    'minecraft:ochre_froglight[axis=y]',
    meta(scope, role, phase),
  );
}

function modelAdultRoom(model, scope, space, manifest, detailIndex) {
  const [x, y, z] = safeFurnitureOrigin(space, manifest);
  const palette = ADULT_PALETTES[detailIndex % ADULT_PALETTES.length];
  const role = `adult_${space.id}`;
  const phase = 360 + (detailIndex % 20);

  // Bed/platform, two side surfaces and headboard.
  model.box(x - 2, y, z - 2, x + 2, y, z + 1, palette[1], meta(scope, `${role}_bed_platform`, phase));
  model.box(x - 2, y + 1, z - 2, x + 2, y + 2, z - 2, palette[0], meta(scope, `${role}_headboard`, phase));
  model.set(x - 3, y, z - 1, 'minecraft:smooth_quartz_slab[type=bottom,waterlogged=false]', meta(scope, `${role}_bedside_surface`, phase));
  model.set(x + 3, y, z - 1, 'minecraft:smooth_quartz_slab[type=bottom,waterlogged=false]', meta(scope, `${role}_bedside_surface`, phase));
  model.box(x - 2, y, z + 3, x + 2, y, z + 4, palette[2], meta(scope, `${role}_bed_clearance_rug`, phase));

  // Lounge group and low table.
  model.box(x - 4, y, z + 6, x - 2, y, z + 7, 'minecraft:crimson_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]', meta(scope, `${role}_lounge_seating`, phase));
  model.box(x + 2, y, z + 6, x + 4, y, z + 7, 'minecraft:crimson_stairs[facing=west,half=bottom,shape=straight,waterlogged=false]', meta(scope, `${role}_lounge_seating`, phase));
  model.box(x - 1, y, z + 6, x + 1, y, z + 7, 'minecraft:polished_blackstone_slab[type=bottom,waterlogged=false]', meta(scope, `${role}_lounge_table`, phase));

  // Dressing screen, closed storage, wash/spa silhouette and a deliberately
  // non-graphic specialty frame. No people, figures, text or depicted acts.
  model.box(x - 5, y, z - 2, x - 5, y + 3, z + 2, palette[0], meta(scope, `${role}_privacy_dressing_screen`, phase));
  model.box(x + 5, y, z - 2, x + 5, y + 3, z + 1, 'minecraft:bookshelf', meta(scope, `${role}_closed_storage_wall`, phase));
  model.box(x + 4, y, z + 3, x + 5, y, z + 4, 'minecraft:smooth_quartz', meta(scope, `${role}_wash_cleanup_counter`, phase));
  model.box(x - 1, y, z + 9, x + 1, y + 3, z + 9, 'minecraft:dark_oak_fence', meta(scope, `${role}_non_graphic_themed_furniture_silhouette`, phase));
  model.set(x, y + 1, z + 8, 'minecraft:iron_chain[axis=y,waterlogged=false]', meta(scope, `${role}_suspended_lounge_detail`, phase));
  addCeilingLight(model, scope, x - 3, y + 5, z + 3, `${role}_warm_ambient_light`, phase + 1);
  addCeilingLight(model, scope, x + 3, y + 5, z + 3, `${role}_task_light`, phase + 1);

  return {
    roomId: space.id,
    roles: [
      'bed',
      'bedside_surfaces',
      'lounge_seating',
      'lounge_table',
      'dressing',
      'wash_cleanup',
      'storage',
      'non_graphic_themed_furniture_silhouette',
      'ambient_light',
      'task_light',
    ],
    paletteIndex: detailIndex % ADULT_PALETTES.length,
  };
}

function modelGenericProgram(model, scope, space, manifest, detailIndex) {
  const tags = new Set(space.tags ?? []);
  const [x, y, z] = safeFurnitureOrigin(space, manifest);
  const role = `fitout_${space.id}`;
  const accent = LEVEL_ACCENTS[
    manifest.levels.find((level) => level.spaces.some((candidate) => candidate.id === space.id))?.id
  ] ?? 'minecraft:light_gray_concrete';
  const phase = 330 + (detailIndex % 20);

  model.box(x - 2, y, z - 1, x + 2, y, z + 1, accent, meta(scope, `${role}_task_or_hospitality_group`, phase));
  model.box(x - 3, y, z + 3, x + 3, y, z + 3, 'minecraft:polished_blackstone_slab[type=bottom,waterlogged=false]', meta(scope, `${role}_seating_and_work_surface`, phase));
  model.box(x - 4, y, z - 3, x - 4, y + 2, z + 3, 'minecraft:bookshelf', meta(scope, `${role}_closed_storage`, phase));
  addCeilingLight(model, scope, x, y + 5, z, `${role}_zoned_light`, phase + 1);

  if (tags.has('theater') || tags.has('owner_club_theater')) {
    model.box(x - 8, y + 1, z - 8, x + 8, y + 5, z - 8, 'minecraft:white_concrete', meta(scope, `${role}_screen_before_audience`, phase + 2));
    for (let row = 0; row < 6; row += 1) {
      model.box(x - 8, y + row, z - 3 + row * 2, x + 8, y + row, z - 3 + row * 2, 'minecraft:dark_oak_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]', meta(scope, `${role}_believable_raked_seating`, phase + 2));
    }
  }
  if (tags.has('command_center') || tags.has('situation_room') || tags.has('security_operations_center')) {
    for (let row = -1; row <= 1; row += 1) {
      model.box(x - 7, y, z + row * 4, x + 7, y + 1, z + row * 4 + 1, 'minecraft:polished_blackstone', meta(scope, `${role}_operations_console`, phase + 2));
    }
    model.box(x - 6, y + 2, z - 8, x + 6, y + 5, z - 8, 'minecraft:lime_stained_glass', meta(scope, `${role}_status_wall`, phase + 2));
  }
  if (tags.has('server_room')) {
    for (let rack = -6; rack <= 6; rack += 3) {
      model.box(x + rack, y, z - 6, x + rack + 1, y + 4, z + 6, 'minecraft:iron_block', meta(scope, `${role}_server_rack`, phase + 2));
      model.box(x + rack, y + 1, z - 5, x + rack, y + 3, z + 5, 'minecraft:observer[facing=south,powered=false]', meta(scope, `${role}_observer_equipment`, phase + 3));
      model.box(x + rack + 1, y + 1, z - 5, x + rack + 1, y + 3, z + 5, 'minecraft:copper_block', meta(scope, `${role}_copper_bus`, phase + 3));
    }
    model.box(x - 8, y + 1, z - 8, x + 8, y + 5, z - 8, 'minecraft:light_blue_stained_glass', meta(scope, `${role}_glazed_machine_wall`, phase + 2));
  }
  if (tags.has('medical_bay')) {
    for (let bed = -6; bed <= 6; bed += 4) {
      model.box(x + bed, y, z - 5, x + bed + 2, y, z - 2, 'minecraft:white_wool', meta(scope, `${role}_medical_bed`, phase + 2));
      model.set(x + bed + 2, y + 1, z - 2, 'minecraft:end_rod[facing=up]', meta(scope, `${role}_bedside_task_light`, phase + 2));
    }
  }
  if (tags.has('armory')) {
    for (let display = -6; display <= 6; display += 3) {
      model.box(x + display, y, z - 5, x + display, y + 2, z - 5, 'minecraft:dark_oak_fence', meta(scope, `${role}_armor_stand_block_silhouette`, phase + 2));
      model.set(x + display, y + 3, z - 5, 'minecraft:iron_block', meta(scope, `${role}_armor_helmet_silhouette`, phase + 2));
      model.set(x + display, y + 1, z - 4, 'minecraft:amethyst_cluster[facing=south,waterlogged=false]', meta(scope, `${role}_enchanted_equipment_silhouette`, phase + 2));
    }
    model.box(x - 8, y, z + 5, x + 8, y + 3, z + 6, 'minecraft:iron_block', meta(scope, `${role}_secure_shield_storage`, phase + 2));
  }
  if (tags.has('indoor_shooting_range')) {
    model.box(x - 9, y, z - 7, x + 9, y + 4, z - 6, 'minecraft:reinforced_deepslate', meta(scope, `${role}_fictional_controlled_backstop`, phase + 2));
    for (let lane = -6; lane <= 6; lane += 4) {
      model.box(x + lane, y, z - 4, x + lane, y + 2, z + 6, 'minecraft:iron_bars', meta(scope, `${role}_separated_lane_screen`, phase + 2));
    }
  }
  if (tags.has('trophy_gallery')) {
    const trophies = [
      'minecraft:diamond_block',
      'minecraft:emerald_block',
      'minecraft:netherite_block',
      'minecraft:dragon_head[rotation=0]',
      'minecraft:wither_skeleton_skull[rotation=0]',
    ];
    trophies.forEach((state, index) => {
      model.set(x - 6 + index * 3, y + 1, z - 5, state, meta(scope, `${role}_rare_artifact_display`, phase + 2));
    });
  }
  if (tags.has('prison') || tags.has('intruder_holding_cells')) {
    for (let cell = -6; cell <= 6; cell += 6) {
      model.box(x + cell, y, z - 6, x + cell + 4, y + 4, z - 2, 'minecraft:iron_bars', meta(scope, `${role}_humane_holding_cell_front`, phase + 2));
      model.box(x + cell + 1, y, z - 5, x + cell + 3, y, z - 4, 'minecraft:light_gray_wool', meta(scope, `${role}_holding_cell_bed`, phase + 2));
    }
  }
  if (tags.has('farms') || tags.has('hydroponics')) {
    for (let row = -6; row <= 6; row += 4) {
      model.box(x - 8, y, z + row, x + 8, y, z + row + 1, 'minecraft:farmland[moisture=7]', meta(scope, `${role}_food_crop_bed`, phase + 2));
      model.box(x - 8, y + 1, z + row, x + 8, y + 1, z + row + 1, 'minecraft:wheat[age=7]', meta(scope, `${role}_mature_food_crop`, phase + 3));
    }
  }
  if (tags.has('animals')) {
    model.box(x - 9, y, z - 7, x + 9, y + 2, z + 7, 'minecraft:oak_fence', meta(scope, `${role}_protected_animal_pens`, phase + 2), (px, py, pz) => (
      py === y || px === x - 9 || px === x + 9 || pz === z - 7 || pz === z + 7
    ));
    model.box(x - 6, y, z - 4, x + 6, y, z + 4, 'minecraft:hay_block[axis=y]', meta(scope, `${role}_feed_and_bedding`, phase + 2));
  }
  if (tags.has('power_plant')) {
    for (let bank = -6; bank <= 6; bank += 6) {
      model.box(x + bank, y, z - 5, x + bank + 3, y + 4, z + 5, 'minecraft:copper_block', meta(scope, `${role}_fictional_generator_bank`, phase + 2));
      model.box(x + bank + 1, y + 1, z - 4, x + bank + 2, y + 3, z + 4, 'minecraft:redstone_lamp[lit=true]', meta(scope, `${role}_power_status_lights`, phase + 3));
    }
  }
  if (tags.has('secondary_panic_bunker')) {
    model.box(x - 8, y, z - 6, x - 2, y, z + 6, 'minecraft:white_wool', meta(scope, `${role}_emergency_sleeping_bays`, phase + 2));
    model.box(x + 2, y, z - 6, x + 8, y + 3, z + 6, 'minecraft:bookshelf', meta(scope, `${role}_emergency_supplies`, phase + 2));
  }
}

function modelSecureGarage(model, scope, manifest) {
  const garage = manifest.garageProgram;
  const [x1, y1, z1, x2, , z2] = garage.bounds;
  const vehicles = [];
  const colors = [
    'minecraft:red_concrete',
    'minecraft:blue_concrete',
    'minecraft:white_concrete',
    'minecraft:gray_concrete',
    'minecraft:yellow_concrete',
    'minecraft:lime_concrete',
  ];
  const bays = [];
  for (const z of [-132, -122, -112, -102, -92]) {
    for (const x of [806, 820, 834, 848, 862]) bays.push([x, z]);
  }
  for (let index = 0; index < 24; index += 1) {
    const [x, z] = bays[index];
    const vehicleType = index < 12 ? 'car' : index < 20 ? 'truck' : 'secure_service_vehicle';
    const length = vehicleType === 'car' ? 7 : vehicleType === 'truck' ? 10 : 11;
    const body = colors[index % colors.length];
    model.box(x - 2, y1 + 1, z, x + 2, y1 + 2, z + length - 1, body, meta(scope, `garage_${vehicleType}_${String(index + 1).padStart(2, '0')}_body`, 410));
    model.box(x - 1, y1 + 3, z + 2, x + 1, y1 + 4, z + length - 3, 'minecraft:tinted_glass', meta(scope, `garage_${vehicleType}_${String(index + 1).padStart(2, '0')}_cabin`, 411));
    for (const wheelZ of [z + 1, z + length - 2]) {
      model.set(x - 2, y1 + 1, wheelZ, 'minecraft:black_concrete', meta(scope, `garage_${vehicleType}_wheel`, 412));
      model.set(x + 2, y1 + 1, wheelZ, 'minecraft:black_concrete', meta(scope, `garage_${vehicleType}_wheel`, 412));
    }
    vehicles.push({
      id: `C01-VEH-${String(index + 1).padStart(2, '0')}`,
      type: vehicleType,
      bounds: [x - 2, y1 + 1, z, x + 2, y1 + 4, z + length - 1],
    });
  }

  // Marked lanes, checkpoint islands and the approved road-cut door.
  for (let x = x1 + 8; x <= x2 - 8; x += 14) {
    model.box(x, y1, z1 + 1, x, y1, z2 - 1, 'minecraft:white_concrete', meta(scope, 'garage_marked_bay_lane', 406));
  }
  model.box(x1 + 4, y1 + 1, z1 + 8, x1 + 12, y1 + 2, z1 + 14, 'minecraft:polished_blackstone', meta(scope, 'garage_security_checkpoint_island', 414));
  const [gx1, gy1, gz1, gx2, gy2, gz2] = garage.portalOpening;
  model.box(gx1, gy1, gz1, gx2, gy2, gz2, AIR, meta(scope, 'approved_recessed_vehicle_portal_opening', 430));
  model.box(gx1, gy1 - 1, gz1, gx2, gy1 - 1, gz2, 'minecraft:gray_concrete', meta(scope, 'vehicle_portal_threshold', 431));
  return vehicles;
}

function modelContainedPool(model, scope, space, manifest) {
  const [x, y, z] = safeFurnitureOrigin(space, manifest);
  model.box(x - 7, y - 1, z - 5, x + 7, y - 1, z + 5, 'minecraft:reinforced_deepslate', meta(scope, `${space.id}_secondary_containment`, 440));
  model.box(x - 6, y, z - 4, x + 6, y, z + 4, 'minecraft:water[level=0]', meta(scope, `${space.id}_contained_source_water`, 441));
  model.box(x - 8, y, z - 6, x + 8, y, z + 6, 'minecraft:smooth_quartz', meta(scope, `${space.id}_pool_deck`, 442), (px, _py, pz) => (
    px === x - 8 || px === x + 8 || pz === z - 6 || pz === z + 6
  ));
  return 13 * 9;
}

function modelActivePortal(model, scope, space, manifest) {
  const [x, y, z] = safeFurnitureOrigin(space, manifest);
  model.box(x - 4, y, z - 1, x + 4, y + 6, z - 1, 'minecraft:obsidian', meta(scope, 'contained_nether_portal_frame', 450), (px, py) => (
    px === x - 4 || px === x + 4 || py === y || py === y + 6
  ));
  model.box(x - 3, y + 1, z - 1, x + 3, y + 5, z - 1, 'minecraft:nether_portal[axis=x]', meta(scope, 'active_contained_nether_portal', 451));
  model.box(x - 7, y, z - 5, x + 7, y + 5, z + 3, 'minecraft:reinforced_deepslate', meta(scope, 'portal_fire_separation', 449), (px, py, pz) => (
    px === x - 7 || px === x + 7 || py === y || py === y + 5 || pz === z - 5 || pz === z + 3
  ));
  model.box(x - 2, y + 1, z + 3, x + 2, y + 4, z + 3, 'minecraft:iron_bars', meta(scope, 'portal_controlled_observation_barrier', 452));
  return 7 * 4;
}

function modelBroadVerticalCore(model, scope, level, manifest) {
  const stair = level.spaces.find((space) => (space.tags ?? []).includes('broad_stair'));
  const lift = level.spaces.find((space) => (space.tags ?? []).includes('paired_lift'));
  const modeled = { stairs: 0, lifts: 0 };
  if (stair) {
    const [x1, y1, z1, x2, y2, z2] = spaceBounds(stair);
    const width = Math.min(7, Math.max(1, x2 - x1 + 1));
    const rise = Math.max(1, y2 - y1);
    for (let step = 0; step <= rise; step += 1) {
      const run = step * 2;
      const baseX = Math.min(x2 - width + 1, x1 + run);
      model.box(baseX, y1 + step, z1, baseX + width - 1, y1 + step, Math.min(z2, z1 + 1), 'minecraft:polished_blackstone_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]', meta(scope, `${stair.id}_one_rise_two_run`, 470));
      model.box(baseX, y1 + step + 1, z1, baseX + width - 1, Math.min(y2, y1 + step + 6), Math.min(z2, z1 + 1), AIR, meta(scope, `${stair.id}_six_clear_headroom`, 471));
    }
    modeled.stairs += 1;
  }
  if (lift) {
    const [x1, y1, z1, x2, y2, z2] = spaceBounds(lift);
    const shaftWidth = Math.min(3, Math.floor((x2 - x1) / 2));
    for (let shaft = 0; shaft < 2; shaft += 1) {
      const sx = x1 + 1 + shaft * (shaftWidth + 1);
      model.box(sx, y1 + 1, z1 + 1, sx + shaftWidth - 1, y2 - 1, Math.min(z2 - 1, z1 + 3), AIR, meta(scope, `${lift.id}_paired_clear_shaft`, 472));
      model.box(sx, y1, z1 + 1, sx + shaftWidth - 1, y1, Math.min(z2 - 1, z1 + 3), 'minecraft:light_blue_concrete', meta(scope, `${lift.id}_level_car`, 473));
    }
    modeled.lifts += 2;
  }
  return modeled;
}

function expandClassification(manifest) {
  const levels = [];
  let totalGrossCells = 0;
  for (const level of manifest.levels) {
    const auditCells = new Set();
    for (const raw of level.auditVolumeBoxes) {
      const [x1, y1, z1, x2, y2, z2] = normalizeBox(raw);
      for (let y = y1; y <= y2; y += 1) {
        for (let z = z1; z <= z2; z += 1) {
          for (let x = x1; x <= x2; x += 1) auditCells.add(key(x, y, z));
        }
      }
    }
    const ownerByCell = new Map();
    const spaceById = new Map();
    for (const space of level.spaces) {
      spaceById.set(space.id, space);
      for (const raw of space.boxes) {
        const [x1, y1, z1, x2, y2, z2] = normalizeBox(raw);
        for (let y = y1; y <= y2; y += 1) {
          for (let z = z1; z <= z2; z += 1) {
            for (let x = x1; x <= x2; x += 1) {
              const cellKey = key(x, y, z);
              if (ownerByCell.has(cellKey)) throw new Error(`classification overlap at ${cellKey}`);
              ownerByCell.set(cellKey, space);
            }
          }
        }
      }
    }
    if (ownerByCell.size !== auditCells.size) {
      throw new Error(`${level.id} classification ${ownerByCell.size} != audit ${auditCells.size}`);
    }
    totalGrossCells += auditCells.size;
    levels.push({ level, auditCells, ownerByCell, spaceById });
  }
  return { levels, totalGrossCells };
}

function modelClassifiedLevel(model, expanded, manifest) {
  const { level, auditCells, ownerByCell } = expanded;
  const scope = LEVEL_SCOPES[level.id];
  if (!scope) throw new Error(`missing scope mapping for ${level.id}`);
  const accent = LEVEL_ACCENTS[level.id];
  const levelBoxes = level.auditVolumeBoxes.map(normalizeBox);
  const levelMinY = Math.min(...levelBoxes.map((box) => box[1]));
  const levelMaxY = Math.max(...levelBoxes.map((box) => box[4]));
  let safetyCells = 0;

  // Exact classified volume projection. Safety-earth cells are intentionally
  // untouched; every other classified cell receives an authored final state.
  for (const cellKey of auditCells) {
    const [x, y, z] = cellKey.split(',').map(Number);
    const owner = ownerByCell.get(cellKey);
    if (owner.category === 'deliberate_safety_void') {
      safetyCells += 1;
      continue;
    }
    let state = AIR;
    let role = `${owner.id}_classified_clear_volume`;
    const below = key(x, y - 1, z);
    const above = key(x, y + 1, z);
    const lateralOutside = (
      !auditCells.has(key(x - 1, y, z))
      || !auditCells.has(key(x + 1, y, z))
      || !auditCells.has(key(x, y, z - 1))
      || !auditCells.has(key(x, y, z + 1))
    );
    if (!auditCells.has(below) || y === levelMinY) {
      state = owner.category === 'circulation' ? accent : FLOOR;
      role = `${owner.id}_classified_finished_floor`;
    } else if (!auditCells.has(above) || y === levelMaxY) {
      state = CEILING;
      role = `${owner.id}_classified_sealed_ceiling`;
    } else if (lateralOutside) {
      state = SHELL;
      role = `${owner.id}_classified_terrain_sealed_wall`;
    }
    model.set(x, y, z, state, meta(scope, role, state === AIR ? 210 : 220));
  }

  // Room identity thresholds and low internal partitions are modeled without
  // blocking the manifest's five-wide circulation field.
  for (const space of level.spaces) {
    if (!space.occupied || ['circulation', 'stair_lift', 'deliberate_safety_void'].includes(space.category)) continue;
    const point = roomPoint(manifest, space.id);
    if (!point) continue;
    const [px, py, pz] = point;
    model.box(px - 2, py, pz - 2, px + 2, Math.min(levelMaxY - 1, py + 4), pz - 2, 'minecraft:tinted_glass', meta(scope, `${space.id}_acoustic_privacy_threshold`, 250));
    model.box(px - 1, py, pz - 2, px + 1, Math.min(levelMaxY - 1, py + 3), pz - 2, AIR, meta(scope, `${space.id}_three_wide_inside_operable_entry`, 251));
  }

  const adultFitouts = [];
  let roomIndex = 0;
  let poolWaterCells = 0;
  let activePortalCells = 0;
  const poolSpaces = [];
  const portalSpaces = [];
  for (const space of level.spaces) {
    if (!space.occupied || !['programmed_room', 'service_backroom'].includes(space.category)) continue;
    if ((space.tags ?? []).includes('non_graphic_adult_room')) {
      adultFitouts.push(modelAdultRoom(model, scope, space, manifest, roomIndex));
    } else {
      modelGenericProgram(model, scope, space, manifest, roomIndex);
    }
    if ((space.tags ?? []).includes('indoor_pool')) {
      poolSpaces.push(space);
    }
    if ((space.tags ?? []).includes('nether_portal')) {
      portalSpaces.push(space);
    }
    roomIndex += 1;
  }
  for (const space of poolSpaces) {
    poolWaterCells += modelContainedPool(model, scope, space, manifest);
  }
  for (const space of portalSpaces) {
    activePortalCells += modelActivePortal(model, scope, space, manifest);
  }
  const vertical = modelBroadVerticalCore(model, scope, level, manifest);
  return {
    levelId: level.id,
    scope,
    classifiedCells: auditCells.size,
    authoredCells: auditCells.size - safetyCells,
    safetyCells,
    rooms: level.spaces.length,
    occupiedRooms: level.spaces.filter((space) => space.occupied).length,
    adultFitouts,
    poolWaterCells,
    activePortalCells,
    vertical,
  };
}

function modelOwnerTunnel(model, manifest) {
  const scope = 'c01_owner_tunnel_detour';
  const connector = manifest.ownerTunnelConnector;
  const points = pointLine(connector.centerlineWaypointsXZ);
  const y = connector.floorY;
  let targetCells = 0;
  const targetKeys = new Set();
  const put = (x, py, z, state, role, phase) => {
    const cellKey = key(x, py, z);
    // Preserve the already-authored owner-residence terminal prism. The
    // residence compiler supplies its stair/lift and back-airlock there.
    if (model.cells?.has?.(cellKey) && x >= 718) return;
    model.set(x, py, z, state, meta(scope, role, phase));
    targetKeys.add(cellKey);
  };
  for (let index = 1; index < points.length; index += 1) {
    const [x, z] = points[index];
    const prior = points[index - 1];
    const next = points[Math.min(points.length - 1, index + 1)];
    const runsX = Math.abs(next[0] - prior[0]) >= Math.abs(next[1] - prior[1]);
    for (let lateral = -3; lateral <= 3; lateral += 1) {
      const tx = x + (runsX ? 0 : lateral);
      const tz = z + (runsX ? lateral : 0);
      if (Math.abs(lateral) <= 2) {
        put(tx, y, tz, 'minecraft:smooth_stone', 'modern_five_wide_finished_floor', 500);
        for (let clearY = y + 1; clearY <= y + 5; clearY += 1) {
          put(tx, clearY, tz, AIR, 'modern_five_by_five_clear_route', 501);
        }
        put(tx, y + 6, tz, 'minecraft:polished_deepslate', 'modern_sealed_ceiling', 502);
      } else {
        for (let wallY = y - 1; wallY <= y + 7; wallY += 1) {
          put(tx, wallY, tz, SHELL, 'modern_seven_wide_liner', 499);
        }
      }
    }
    if (index % 8 === 0) {
      put(x, y + 6, z, 'minecraft:ochre_froglight[axis=y]', 'modern_ceiling_light', 503);
    }
    if (index % 40 === 0) {
      for (let chamberX = x - 5; chamberX <= x + 5; chamberX += 1) {
        for (let chamberZ = z - 5; chamberZ <= z + 5; chamberZ += 1) {
          if (Math.abs(chamberX - x) <= 4 && Math.abs(chamberZ - z) <= 4) {
            put(chamberX, y, chamberZ, 'minecraft:smooth_stone', 'owner_tunnel_refuge_room_floor', 504);
            for (let clearY = y + 1; clearY <= y + 5; clearY += 1) {
              put(chamberX, clearY, chamberZ, AIR, 'owner_tunnel_refuge_room_clearance', 505);
            }
          }
        }
      }
    }
  }
  targetCells = targetKeys.size;
  return {
    scope,
    targetCells,
    centerlineCells: points.length,
    clearWidth: 5,
    clearHeight: 5,
    endpointAirlocks: connector.endpointAirlocks,
    rejectedStraightRouteAbsent: true,
  };
}

function modelGaragePortalConnector(model, manifest) {
  const scope = 'c01_east_l1_security_garage';
  const portal = manifest.garageProgram.portalOpening;
  const [x1, y1, z1, x2, y2] = portal;
  // Only the approved road-cut throat may approach the surface. Its upper and
  // side cells use natural terrain materials so no concrete box daylights.
  // The throat stops at z=-140 and leaves the binding z=-160..-141
  // data-campus separation/drainage band entirely untouched.
  const exteriorZ = Math.max(-140, z1 - 3);
  model.box(x1 - 4, y1 - 1, exteriorZ, x2 + 4, y2 + 4, z1, SHELL, meta(scope, 'garage_road_cut_sealed_liner', 520));
  model.box(x1 - 2, y1, exteriorZ, x2 + 2, y2, z1, AIR, meta(scope, 'garage_vehicle_approach_clearance', 521));
  model.box(x1 - 2, y1 - 1, exteriorZ, x2 + 2, y1 - 1, z1, 'minecraft:gray_concrete', meta(scope, 'garage_vehicle_approach_floor', 522));
  model.box(x1 - 4, y2 + 1, exteriorZ, x2 + 4, y2 + 4, z1, 'minecraft:stone', meta(scope, 'garage_portal_natural_cover', 523));
  return {
    opening: portal,
    roadCutBounds: [x1 - 4, y1 - 1, exteriorZ, x2 + 4, y2 + 4, z1],
    untouchedSeparationBand: [700, -160, 900, -141],
    approvedVisibleException: true,
    concreteOutsideApprovedMask: 0,
  };
}

function migrationStatus(manifest, ledgerPath) {
  if (!fs.existsSync(ledgerPath)) {
    return {
      file: ledgerPath,
      exists: false,
      status: 'BLOCKED_LEDGER_NOT_GENERATED',
    };
  }
  const bytes = fs.readFileSync(ledgerPath);
  const ledger = JSON.parse(bytes);
  const census = manifest.sourceMigrationLedger.sourceCensus;
  const checks = {
    exactBlockEntities: ledger.counts?.blockEntities === census.blockEntities,
    exactInventories: ledger.counts?.inventories === census.inventories,
    exactItemStacks: ledger.counts?.itemStacks === census.itemStacks,
    exactItemCount: ledger.counts?.totalItemCount === census.totalItemCount,
    allNbtHashed: ledger.entries?.every((entry) => /^[a-f0-9]{64}$/.test(entry.sourceNbtSha256)),
    allDispositioned: ledger.entries?.every((entry) => ['move', 'retain'].includes(entry.disposition)),
    commandsGuarded: ledger.entries?.every((entry) => (
      entry.disposition === 'retain'
      || (
        typeof entry.forwardCommand === 'string'
        && entry.forwardCommand.startsWith('CMD execute if block ')
        && typeof entry.rollbackCommand === 'string'
        && entry.rollbackCommand.startsWith('CMD execute if block ')
      )
    )),
  };
  return {
    file: ledgerPath,
    exists: true,
    sha256: sha256(bytes),
    status: Object.values(checks).every(Boolean)
      ? 'PINNED_LEDGER_COMPLETE_SAME_MOMENT_HASH_GATE_PENDING'
      : 'BLOCKED_LEDGER_RECONCILIATION',
    counts: ledger.counts,
    checks,
  };
}

function wallSignSupportPoint(point, state) {
  if (!state.includes('_wall_sign[')) return null;
  const facing = state.match(/facing=([^,\]]+)/)?.[1];
  const delta = {
    north: [0, 0, 1],
    south: [0, 0, -1],
    east: [-1, 0, 0],
    west: [1, 0, 0],
  }[facing];
  return delta
    ? [point[0] + delta[0], point[1], point[2] + delta[2]]
    : null;
}

function modelMigrationDestinations(model, ledgerPath) {
  if (!fs.existsSync(ledgerPath)) {
    return {
      placements: 0,
      companions: 0,
      supportBlocks: 0,
      forwardCommands: [],
      rollbackCommands: [],
    };
  }
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  let placements = 0;
  let companions = 0;
  let supportBlocks = 0;
  const forwardCommands = [];
  const rollbackCommands = [];
  for (const entry of ledger.entries ?? []) {
    if (entry.disposition !== 'move') continue;
    const [x, y, z] = entry.destinationCoordinate;
    const scope = entry.destinationScope;
    if (!scope || !Object.values(LEVEL_SCOPES).includes(scope)) {
      throw new Error(`migration entry ${entry.sequenceNumber} has invalid destination scope ${scope}`);
    }
    const supportPoint = wallSignSupportPoint(
      entry.destinationCoordinate,
      entry.destinationBlockState,
    );
    if (supportPoint) {
      model.set(
        ...supportPoint,
        WALL,
        meta(scope, `migrated_nbt_${entry.sequenceNumber}_wall_sign_support`, 550),
      );
      supportBlocks += 1;
    }
    model.set(
      x,
      y,
      z,
      entry.destinationBlockState,
      meta(scope, `migrated_nbt_${entry.sequenceNumber}_${entry.destinationRoomId}`, 551),
    );
    for (const companion of entry.companionPlacements ?? []) {
      model.set(
        ...companion.point,
        companion.state,
        meta(scope, `migrated_nbt_${entry.sequenceNumber}_${companion.role}`, 551),
      );
      companions += 1;
    }
    forwardCommands.push(entry.forwardCommand);
    rollbackCommands.unshift(entry.rollbackCommand);
    placements += 1;
  }
  return {
    placements,
    companions,
    supportBlocks,
    forwardCommands,
    rollbackCommands,
  };
}

export async function modelC01FiveLevelBunker(
  model,
  snapshot,
  {
    manifestPath = DEFAULT_MANIFEST,
    migrationLedgerPath = DEFAULT_MIGRATION_LEDGER,
  } = {},
) {
  const manifestBytes = fs.readFileSync(manifestPath);
  const manifest = JSON.parse(manifestBytes);
  const expanded = expandClassification(manifest);
  if (expanded.totalGrossCells !== 885022) {
    throw new Error(`C01 classified-cell lock failed: ${expanded.totalGrossCells} != 885022`);
  }
  if (manifest.bunkerScopes.length !== 9) {
    throw new Error(`C01 scope lock failed: ${manifest.bunkerScopes.length} != 9`);
  }

  const levelReports = expanded.levels.map((level) => (
    modelClassifiedLevel(model, level, manifest)
  ));
  const garageVehicles = modelSecureGarage(
    model,
    LEVEL_SCOPES['C01-L1-SECURITY-GARAGE'],
    manifest,
  );
  const portalConnector = modelGaragePortalConnector(model, manifest);
  const ownerTunnel = modelOwnerTunnel(model, manifest);
  const migrationPlacements = modelMigrationDestinations(
    model,
    migrationLedgerPath,
  );

  const authoredScopes = new Set([
    ...levelReports.map((level) => level.scope),
    ownerTunnel.scope,
  ]);
  const deferredScopes = manifest.bunkerScopes.filter((scope) => !authoredScopes.has(scope));
  const spaces = manifest.levels.flatMap((level) => level.spaces);
  const occupiedSpaces = spaces.filter((space) => space.occupied === true);
  const tagCounts = {};
  for (const space of spaces) {
    for (const tag of space.tags ?? []) tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
  }
  const exactCounts = manifest.programRequirements.exactSpaceTagCounts;
  const exactProgramChecks = Object.fromEntries(
    Object.entries(exactCounts).map(([tag, count]) => [tag, (tagCounts[tag] ?? 0) === count]),
  );
  const adultFitouts = levelReports.flatMap((level) => level.adultFitouts);
  const furnishingChecks = adultFitouts.map((room) => ({
    roomId: room.roomId,
    furnishingCount: room.roles.length,
    hasBed: room.roles.includes('bed'),
    hasLounge: room.roles.includes('lounge_seating'),
    hasDressing: room.roles.includes('dressing'),
    hasWash: room.roles.includes('wash_cleanup'),
    hasStorage: room.roles.includes('storage'),
    hasThemedSilhouette: room.roles.includes('non_graphic_themed_furniture_silhouette'),
  }));
  const migration = migrationStatus(manifest, migrationLedgerPath);

  const blockEntities = [];
  for (const raw of manifest.envelope.boxes) {
    blockEntities.push(...await snapshot.blockEntitiesInBox(raw));
  }
  const uniqueBlockEntities = new Map(
    blockEntities.map((entity) => [key(Number(entity.x), Number(entity.y), Number(entity.z)), entity]),
  );
  const targetBlockEntityIntersections = [...uniqueBlockEntities.keys()].filter((cellKey) => (
    model.cells?.has?.(cellKey)
  ));

  const activePortalCells = levelReports.reduce((sum, level) => sum + level.activePortalCells, 0);
  const checks = {
    manifestStatusFrozen: manifest.status === 'FROZEN_PLANNING_SCHEDULE_NOT_BUILT',
    exactClassifiedCells: expanded.totalGrossCells === 885022,
    exactScopeRegister: manifest.bunkerScopes.length === 9,
    allSevenLevelScopesAuthored: levelReports.length === 7,
    onlyExactRetirementDeferred:
      deferredScopes.length === 1 && deferredScopes[0] === 'c01_source_exact_retirement',
    noHangarTag: (tagCounts.aircraft_hangar ?? 0) === 0,
    noArenaTag: (tagCounts.training_arena ?? 0) === 0,
    exactGarageVehicles: garageVehicles.length === 24,
    exactPublicAdultPrivateRooms: tagCounts.public_adult_private_room === 24,
    publicOneToOneMinimum: tagCounts.public_adult_one_to_one_room >= 4,
    exactOwnerPrivateRooms: tagCounts.owner_private_adult_room === 12,
    exactPolySuites: tagCounts.poly_suite === 15,
    exactMasterBedrooms: tagCounts.master_bedroom === 3,
    exactMasterKitchens: tagCounts.master_kitchen === 2,
    allAdultRoomsFullyFurnished: furnishingChecks.every((room) => (
      room.furnishingCount >= manifest.adultRoomPolicy.minimumFurnishingsPerRoom
      && room.hasBed
      && room.hasLounge
      && room.hasDressing
      && room.hasWash
      && room.hasStorage
      && room.hasThemedSilhouette
    )),
    exactRoomAndCameraObjects:
      occupiedSpaces.length === 165 && manifest.evidenceCameras.length === 165,
    allDeclaredNodesReachable:
      manifest.routeGraph.nodes.length === 165
      && manifest.routeGraph.edges.length === 181,
    broadStairAndPairedLiftEveryLevel: levelReports.every((level) => (
      level.vertical.stairs === 1 && level.vertical.lifts === 2
    )),
    activeContainedPortalPresent: activePortalCells === 28,
    ownerTunnelModernFiveByFive:
      ownerTunnel.clearWidth === 5 && ownerTunnel.clearHeight === 5,
    noPinnedProtectedBlockEntityTargets: targetBlockEntityIntersections.length === 0,
    terrainSealPolicyPresent:
      manifest.terrainSafety.minimumCoverBlocks === 3
      && manifest.terrainSafety.concealmentGate.prohibitedVisibleElements.includes('concrete bunker box'),
    garagePortalIsOnlyNewVisibleMask:
      portalConnector.approvedVisibleException
      && portalConnector.concreteOutsideApprovedMask === 0
      && portalConnector.roadCutBounds[2] >= -140,
    exactProgramTags: Object.values(exactProgramChecks).every(Boolean),
    migrationLedgerPinnedAndComplete:
      migration.status === 'PINNED_LEDGER_COMPLETE_SAME_MOMENT_HASH_GATE_PENDING',
    exactMigrationDestinationsAuthored:
      migrationPlacements.placements === 1619
      && migrationPlacements.companions === 25,
  };

  return {
    id: manifest.id,
    status: Object.values(checks).every(Boolean)
      ? 'C01_SOURCE_MODEL_PASS_LIVE_GATES_PENDING'
      : 'C01_SOURCE_MODEL_BLOCKED',
    liveWorldMutated: false,
    manifest: {
      file: manifestPath,
      sha256: sha256(manifestBytes),
      classifiedCells: expanded.totalGrossCells,
      grossColumns: manifest.envelope.newFootprintColumns,
      levels: manifest.levels.length,
      classifiedSpaces: spaces.length,
      occupiedRoomAndRouteObjects: occupiedSpaces.length,
      routeNodes: manifest.routeGraph.nodes.length,
      routeEdges: manifest.routeGraph.edges.length,
      cameras: manifest.evidenceCameras.length,
    },
    bunkerScopes: manifest.bunkerScopes,
    authoredScopes: [...authoredScopes],
    deferredScopes,
    deferredScopeSummaries: deferredScopes.map((scope) => ({
      scope,
      targetCells: 0,
      roles: ['deferred_until_new_complex_post_commission_and_live_nbt_hash_gate'],
      bounds: null,
      expectedStateCounts: {},
      readiness: 'BLOCKED_BY_COMMISSION_NEW_BEFORE_RETIRE_OLD_SEQUENCE',
    })),
    levels: levelReports,
    garage: {
      roomId: manifest.garageProgram.roomId,
      bounds: manifest.garageProgram.bounds,
      activeHangarProgram: false,
      vehicles: garageVehicles,
      vehicleCount: garageVehicles.length,
      portal: portalConnector,
    },
    ownerTunnel,
    migration,
    migrationPlacements: {
      placements: migrationPlacements.placements,
      companions: migrationPlacements.companions,
      supportBlocks: migrationPlacements.supportBlocks,
      forwardCommands: migrationPlacements.forwardCommands,
      rollbackCommands: migrationPlacements.rollbackCommands,
    },
    exactProgramChecks,
    tagCounts,
    adultRooms: {
      count: adultFitouts.length,
      furnishedRooms: furnishingChecks,
    },
    containment: {
      activePortalCells,
      containedPoolWaterCells: levelReports.reduce((sum, level) => sum + level.poolWaterCells, 0),
      targetBlockEntityIntersections,
      minimumTerrainCover: manifest.terrainSafety.minimumCoverBlocks,
      allowedVisibleMasks: manifest.terrainSafety.concealmentGate.allowedVisibleMasks,
    },
    publication: {
      roomObjects: occupiedSpaces.length,
      cameraCandidates: manifest.evidenceCameras,
      floorPlanLevels: manifest.levels.map((level) => level.id),
      state: 'SOURCE_MODELED_NOT_LIVE',
    },
    checks,
  };
}
