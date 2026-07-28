#!/usr/bin/env node
/**
 * Generates the frozen C01 east-relocation classification and migration
 * schedule. This is offline planning only: it never connects to Minecraft and
 * never opens a mutable database.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/c01-bunker-classification-manifest.json',
);
const AREA_INVENTORY = path.join(
  ROOT,
  'data/exports/box/redevelopment-atlas-post-2026-07-27/team-a/area-inventory.json',
);
const SNAPSHOT_SHA = 'e612b1feabcf8bd81e427804e0c5cdccea5aac79ef543cadbf2b05d360de7a5a';

function sha256(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function normalizeBox(raw) {
  const [x1, y1, z1, x2, y2, z2] = raw;
  return [
    Math.min(x1, x2),
    Math.min(y1, y2),
    Math.min(z1, z2),
    Math.max(x1, x2),
    Math.max(y1, y2),
    Math.max(z1, z2),
  ];
}

function key(x, y, z) {
  return `${x},${y},${z}`;
}

function pointFromKey(value) {
  return value.split(',').map(Number);
}

class Level {
  constructor(id, mainLevel, auditVolumeBoxes, accessClass = 'public') {
    this.id = id;
    this.mainLevel = mainLevel;
    this.auditVolumeBoxes = auditVolumeBoxes.map(normalizeBox);
    this.accessClass = accessClass;
    this.owners = new Map();
    this.spaceDefinitions = new Map();
    for (const [x1, y1, z1, x2, y2, z2] of this.auditVolumeBoxes) {
      for (let y = y1; y <= y2; y += 1) {
        for (let z = z1; z <= z2; z += 1) {
          for (let x = x1; x <= x2; x += 1) this.owners.set(key(x, y, z), `${id}-loop`);
        }
      }
    }
    this.spaceDefinitions.set(`${id}-loop`, {
      id: `${id}-loop`,
      category: 'circulation',
      occupied: true,
      requiredReachability: true,
      tags: ['primary_loop', `${id.toLowerCase()}_loop`],
      accessClasses: [accessClass],
    });
  }

  paint(id, category, box, {
    occupied = true,
    tags = [],
    accessClasses = [this.accessClass],
    ...extra
  } = {}) {
    if (this.spaceDefinitions.has(id)) throw new Error(`duplicate space ${id}`);
    let count = 0;
    const [x1, y1, z1, x2, y2, z2] = normalizeBox(box);
    for (let y = y1; y <= y2; y += 1) {
      for (let z = z1; z <= z2; z += 1) {
        for (let x = x1; x <= x2; x += 1) {
          const cell = key(x, y, z);
          if (!this.owners.has(cell)) continue;
          this.owners.set(cell, id);
          count += 1;
        }
      }
    }
    if (count === 0) throw new Error(`space ${id} does not intersect ${this.id}`);
    this.spaceDefinitions.set(id, {
      id,
      category,
      occupied,
      requiredReachability: occupied,
      tags,
      accessClasses,
      ...extra,
    });
    return id;
  }

  finish() {
    const cellsByOwner = new Map([...this.spaceDefinitions.keys()].map((id) => [id, []]));
    for (const [cell, owner] of this.owners) cellsByOwner.get(owner).push(pointFromKey(cell));
    const spaces = [];
    for (const [id, definition] of this.spaceDefinitions) {
      const cells = cellsByOwner.get(id);
      if (!cells?.length) {
        this.spaceDefinitions.delete(id);
        continue;
      }
      const rows = new Map();
      for (const [x, y, z] of cells) {
        const rowKey = `${y},${z}`;
        if (!rows.has(rowKey)) rows.set(rowKey, []);
        rows.get(rowKey).push(x);
      }
      const boxes = [];
      for (const [rowKey, xs] of rows) {
        xs.sort((a, b) => a - b);
        const [y, z] = rowKey.split(',').map(Number);
        let start = xs[0];
        let previous = xs[0];
        for (let index = 1; index <= xs.length; index += 1) {
          const current = xs[index];
          if (current === previous + 1) {
            previous = current;
            continue;
          }
          boxes.push([start, y, z, previous, y, z]);
          start = current;
          previous = current;
        }
      }
      spaces.push({ ...definition, boxes });
    }
    return {
      id: this.id,
      mainLevel: this.mainLevel,
      auditVolumeBoxes: this.auditVolumeBoxes,
      spaces,
    };
  }
}

const COMPOSITE = [
  [797, 0, -140, 888, 0, -85],
  [801, 0, -84, 888, 0, -84],
  [700, 0, -83, 900, 0, -21],
  [800, 0, -20, 900, 0, -18],
  [701, 0, -17, 900, 0, -5],
];

function atY(boxes, minY, maxY) {
  return boxes.map(([x1, , z1, x2, , z2]) => [x1, minY, z1, x2, maxY, z2]);
}

const levels = [];
const evidenceCameras = [];

function addAdultRoom(level, id, roomType, box, themeId, accessClass, tags = []) {
  const cameraId = `CAM-${id}`;
  const palette = {
    red_velvet: 'dark_oak-crimson-blackstone-copper',
    spa: 'calcite-quartz-copper-sea_lantern',
    cabaret: 'burgundy-blackstone-gold',
    gothic_library: 'deepslate-dark_oak-red_carpet',
    art_deco: 'black-white-copper-cyan_glass',
    blackened_steel: 'blackstone-iron-gray_wool-red',
    pool_lounge: 'prismarine-quartz-glass-warm_wood',
    owner_ceremonial: 'deep_red-blackstone-quartz-gold',
  }[themeId];
  const functionsByType = {
    private_themed_room: ['bed', 'lounge_seating', 'dressing', 'wash_cleanup', 'storage'],
    one_to_one_room: ['bed', 'lounge_seating', 'dressing', 'wash_cleanup', 'storage'],
    owner_private_room: ['bed', 'lounge_seating', 'dressing', 'wash_cleanup', 'storage'],
    master_grand_bedroom: ['bed', 'lounge_seating', 'dressing', 'wash_cleanup', 'storage'],
  };
  const functions = functionsByType[roomType];
  level.paint(id, 'programmed_room', box, {
    tags: ['non_graphic_adult_room', ...tags],
    accessClasses: [accessClass],
    adultRoomProgram: {
      programId: `PROGRAM-${id}`,
      roomType,
      themeId,
      materialPaletteId: palette,
      lightingId: `warm-task-zoned-${id}`,
      privacyThresholdId: `offset-vestibule-${id}`,
      furnishings: [
        ...functions,
        'non_graphic_themed_furniture_silhouette',
        'inside_operable_exit',
        'two_block_clear_internal_route',
      ],
      requiredFunctions: functions,
      cameraIds: [cameraId],
    },
  });
  const [x1, y1, z1, x2, , z2] = normalizeBox(box);
  evidenceCameras.push({
    id: cameraId,
    roomType,
    interior: true,
    position: [x1 + 1, y1 + 1, z1 + 1],
    target: [x2 - 1, y1 + 1, z2 - 1],
    requiredViews: ['entrance_privacy', 'bed_lounge_storage_wash_focal'],
  });
}

// L1: security arrival and the former hangar volume, now a secure vehicle garage.
const l1 = new Level('C01-L1-SECURITY-GARAGE', true, atY(COMPOSITE, 42, 50));
l1.paint('l1-secure-vehicle-garage', 'programmed_room', [800, 42, -137, 858, 50, -88], {
  tags: ['main_level_room', 'secure_vehicle_garage', 'clear_span', 'cars_and_trucks'],
  garagePortal: {
    opening: [800, 43, -137, 818, 49, -137],
    approvedSurfaceException: true,
    roadCutOnly: true,
  },
});
[
  ['l1-garage-security-dispatch', -137, -128],
  ['l1-garage-maintenance-control', -127, -118],
  ['l1-garage-parts-storage', -117, -108],
  ['l1-garage-motor-pool-office', -107, -98],
  ['l1-garage-decon-overlook', -97, -88],
].forEach(([id, z1, z2]) => l1.paint(
  id,
  'service_backroom',
  [861, 42, z1, 886, 50, z2],
  { tags: ['glazed_vehicle_overlook_gallery', 'garage_support_one_wall'], accessClasses: ['service'] },
));
l1.paint('l1-grand-security-entry', 'programmed_room', [703, 42, -80, 735, 50, -61], {
  tags: ['main_level_room', 'grand_entry', 'security_entrance', 'directory'],
});
l1.paint('l1-security-checkpoint', 'programmed_room', [703, 42, -60, 735, 50, -50], {
  tags: ['main_level_room', 'checkpoint'],
});
l1.paint('l1-decontamination', 'programmed_room', [703, 42, -49, 735, 50, -30], {
  tags: ['main_level_room', 'decontamination'],
});
l1.paint('l1-eoc-flex-operations-training', 'programmed_room', [740, 42, -80, 783, 50, -55], {
  tags: ['main_level_room', 'eoc_flexible_operations', 'training', 'logistics'],
});
l1.paint('l1-adults-wing-controlled-vestibule', 'circulation', [740, 42, -52, 760, 50, -45], {
  tags: ['main_level_room', 'adults_only_wing', 'age_acoustic_vestibule', 'visible_from_entry'],
});
l1.paint('l1-main-broad-stair', 'stair_lift', [764, 42, -43, 775, 50, -22], {
  tags: ['broad_stair', 'full_landings', 'visible_wayfinding'],
});
l1.paint('l1-main-lift', 'stair_lift', [778, 42, -43, 784, 50, -35], {
  tags: ['paired_lift', 'visible_wayfinding'],
});
l1.paint('l1-service-stair', 'stair_lift', [875, 42, -35, 888, 50, -22], {
  tags: ['service_stair', 'full_landings'],
  accessClasses: ['service'],
});
l1.paint('l1-chasm-safety-earth', 'deliberate_safety_void', [706, 42, -49, 720, 50, -36], {
  occupied: false,
  tags: ['expanded_safety_earth_island'],
  accessClasses: ['service'],
  rationale: 'Preserves the surveyed connected low-cover chasm and its structural earth halo.',
});
levels.push(l1);

// L2: complete living/amenity level and the doubled public adults-only wing.
const l2 = new Level('C01-L2-LIVING-AMENITY', false, atY(COMPOSITE, 33, 40));
[
  ['l2-protected-staff-quarters', [800, 33, -137, 838, 40, -110], ['staff_quarters', 'villager_trading_hall_visual_model']],
  ['l2-main-kitchen-dining', [840, 33, -137, 886, 40, -110], ['main_kitchen', 'dining']],
  ['l2-theater', [800, 33, -107, 842, 40, -88], ['theater', 'stage_before_seating']],
  ['l2-indoor-pool', [844, 33, -107, 886, 40, -88], ['indoor_pool']],
  ['l2-offices', [703, 33, -80, 742, 40, -61], ['offices']],
  ['l2-library', [744, 33, -80, 783, 40, -61], ['library']],
  ['l2-gaming-room', [703, 33, -59, 722, 40, -45], ['gaming_room']],
  ['l2-golf-simulator', [724, 33, -59, 742, 40, -45], ['golf_simulator']],
  ['l2-music-studio', [744, 33, -59, 764, 40, -45], ['music_studio']],
  ['l2-guest-suites', [703, 33, -34, 764, 40, -22], ['guest_suites']],
  ['l2-adult-exhibition-salon', [790, 33, -80, 840, 40, -55], ['adult_public_exhibition_salon', 'no_fixed_seating']],
  ['l2-adult-perimeter-viewing-gallery', [841, 33, -80, 872, 40, -55], ['adult_perimeter_viewing_gallery']],
  ['l2-adult-performer-corridor', [787, 33, -83, 789, 40, -21], ['adult_performer_corridor', 'independent_egress']],
  ['l2-adult-public-concourse', [790, 33, -53, 872, 40, -49], ['adult_public_concourse']],
  ['l2-adult-bar-lounge', [825, 33, -47, 844, 40, -41], ['adult_bar', 'adult_lounge']],
  ['l2-adult-dressing-wash-storage', [845, 33, -47, 872, 40, -41], ['adult_dressing', 'adult_wash', 'adult_storage']],
  ['l2-main-broad-stair', [764, 33, -43, 775, 40, -22], ['broad_stair', 'full_landings']],
  ['l2-main-lift', [778, 33, -43, 784, 40, -35], ['paired_lift']],
].forEach(([id, box, tags]) => l2.paint(
  id,
  tags.includes('broad_stair') || tags.includes('paired_lift') ? 'stair_lift' : 'programmed_room',
  box,
  { tags },
));
const themes = ['red_velvet', 'spa', 'cabaret', 'gothic_library', 'art_deco', 'blackened_steel', 'pool_lounge'];
for (let room = 0; room < 24; room += 1) {
  const column = room % 12;
  const row = Math.floor(room / 12);
  const x1 = 790 + column * 7;
  const z1 = row === 0 ? -39 : -29;
  addAdultRoom(
    l2,
    `l2-adult-private-${String(room + 1).padStart(2, '0')}`,
    'private_themed_room',
    [x1, 33, z1, x1 + 6, 40, z1 + 8],
    themes[room % themes.length],
    'public',
    ['public_adult_private_room'],
  );
}
for (let room = 0; room < 5; room += 1) {
  const x1 = 790 + room * 7;
  addAdultRoom(
    l2,
    `l2-adult-one-to-one-${String(room + 1).padStart(2, '0')}`,
    'one_to_one_room',
    [x1, 33, -47, x1 + 6, 40, -41],
    themes[(room + 2) % themes.length],
    'public',
    ['public_adult_one_to_one_room'],
  );
}
l2.paint('l2-chasm-safety-earth', 'deliberate_safety_void', [706, 33, -49, 720, 40, -36], {
  occupied: false,
  tags: ['expanded_safety_earth_island'],
  rationale: 'Preserves the surveyed connected low-cover chasm and its structural earth halo.',
});
levels.push(l2);

// L3: life-support agriculture, water, animal care, and stores.
const l3 = new Level('C01-L3-AGRICULTURE-WATER', false, atY(COMPOSITE, 24, 31));
[
  ['l3-hydroponic-farms', [800, 24, -137, 842, 31, -88], ['farms', 'hydroponics']],
  ['l3-animal-husbandry', [844, 24, -137, 886, 31, -88], ['animals', 'veterinary_support']],
  ['l3-food-storage', [703, 24, -80, 755, 31, -54], ['food_storage', 'cold_storage']],
  ['l3-water-treatment', [758, 24, -80, 810, 31, -54], ['water_systems', 'treatment']],
  ['l3-cistern-pumps', [813, 24, -80, 872, 31, -54], ['water_systems', 'cisterns', 'pumps']],
  ['l3-seed-bank', [703, 24, -51, 740, 31, -22], ['seed_bank']],
  ['l3-processing-kitchen', [743, 24, -51, 784, 31, -22], ['processing_kitchen']],
  ['l3-maintenance-backrooms', [787, 24, -51, 830, 31, -22], ['maintenance', 'service_backroom']],
  ['l3-main-broad-stair', [833, 24, -51, 846, 31, -22], ['broad_stair', 'full_landings']],
  ['l3-main-lift', [849, 24, -51, 856, 31, -42], ['paired_lift']],
].forEach(([id, box, tags]) => l3.paint(
  id,
  tags.includes('broad_stair') || tags.includes('paired_lift')
    ? 'stair_lift'
    : tags.includes('service_backroom') ? 'service_backroom' : 'programmed_room',
  box,
  { tags, accessClasses: tags.includes('service_backroom') ? ['service'] : ['public'] },
));
l3.paint('l3-chasm-safety-earth', 'deliberate_safety_void', [706, 24, -49, 720, 31, -36], {
  occupied: false,
  tags: ['expanded_safety_earth_island'],
  rationale: 'Preserves the surveyed connected low-cover chasm and its structural earth halo.',
});
levels.push(l3);

// L4: hardened command, security, medical, data, and holding.
const l4 = new Level(
  'C01-L4-COMMAND-MEDICAL',
  false,
  [[704, 15, -68, 854, 22, -20]],
  'owner',
);
[
  ['l4-command-center', [707, 15, -65, 754, 22, -48], ['command_center']],
  ['l4-situation-room', [757, 15, -65, 806, 22, -48], ['situation_room']],
  ['l4-security-operations-center', [809, 15, -65, 851, 22, -48], ['security_operations_center', 'alarm_controls', 'piston_lockdown_controls']],
  ['l4-armory', [707, 15, -45, 741, 22, -31], ['armory', 'armor_stands', 'enchanted_weapons', 'shields', 'secure_storage']],
  ['l4-vault', [744, 15, -45, 776, 22, -31], ['vault']],
  ['l4-medical-bay', [779, 15, -45, 815, 22, -31], ['medical_bay', 'medical_beds']],
  ['l4-brewing-potion', [818, 15, -45, 832, 22, -31], ['brewing_stations', 'potion_storage']],
  ['l4-quarantine', [835, 15, -45, 851, 22, -31], ['quarantine_rooms']],
  ['l4-server-room', [707, 15, -28, 759, 22, -22], ['server_room', 'iron_glass_redstone_observers_copper']],
  ['l4-holding-cells', [762, 15, -28, 806, 22, -22], ['prison', 'intruder_holding_cells']],
  ['l4-indoor-shooting-range', [783, 15, -28, 806, 22, -22], ['indoor_shooting_range', 'controlled_backstop']],
  ['l4-main-broad-stair', [809, 15, -28, 830, 22, -22], ['broad_stair', 'full_landings']],
  ['l4-main-lift', [833, 15, -28, 842, 22, -22], ['paired_lift']],
].forEach(([id, box, tags]) => l4.paint(
  id,
  tags.includes('broad_stair') || tags.includes('paired_lift') ? 'stair_lift' : 'programmed_room',
  box,
  { tags, accessClasses: ['owner'] },
));
levels.push(l4);

// L5: independent power, escape, portal, trophy, and panic refuge.
const l5 = new Level(
  'C01-L5-POWER-ESCAPE',
  false,
  [[704, 6, -68, 854, 13, -20]],
  'owner',
);
[
  ['l5-power-plant', [707, 6, -65, 765, 13, -48], ['power_plant']],
  ['l5-fuel-switchgear', [768, 6, -65, 810, 13, -48], ['switchgear', 'fuel_support']],
  ['l5-secondary-panic-bunker', [813, 6, -65, 851, 13, -48], ['secondary_panic_bunker']],
  ['l5-nether-portal-room', [707, 6, -45, 742, 13, -31], ['nether_portal']],
  ['l5-trophy-gallery', [745, 6, -45, 790, 13, -31], ['trophy_gallery', 'rare_blocks', 'mob_heads', 'artifacts', 'armor']],
  ['l5-escape-tunnel-control', [793, 6, -45, 830, 13, -31], ['escape_tunnels', 'airlocks']],
  ['l5-emergency-stores', [833, 6, -45, 851, 13, -31], ['emergency_stores']],
  ['l5-main-broad-stair', [707, 6, -28, 730, 13, -22], ['broad_stair', 'full_landings']],
  ['l5-main-lift', [733, 6, -28, 742, 13, -22], ['paired_lift']],
  ['l5-independent-egress-west', [745, 6, -28, 790, 13, -22], ['independent_egress']],
  ['l5-independent-egress-east', [793, 6, -28, 838, 13, -22], ['independent_egress']],
].forEach(([id, box, tags]) => l5.paint(
  id,
  tags.includes('broad_stair') || tags.includes('paired_lift') ? 'stair_lift' : 'programmed_room',
  box,
  { tags, accessClasses: ['owner'] },
));
levels.push(l5);

// Owner club/arrival: a real double-height theater and complete support.
const club = new Level(
  'C01-OWNER-CLUB-ARRIVAL',
  false,
  [[723, -14, -62, 850, 4, -29]],
  'owner',
);
club.paint('owner-club-theater', 'programmed_room', [726, -13, -59, 790, 3, -42], {
  tags: ['owner_club_theater', 'double_height', 'stage_before_audience'],
  orientation: {
    stageAndScreen: [726, -12, -59, 790, 1, -55],
    audienceAndSalon: [726, -12, -54, 790, 1, -42],
  },
});
club.paint('owner-club-backrooms', 'service_backroom', [793, -13, -59, 848, -6, -52], {
  tags: ['owner_club_backrooms', 'dressing', 'storage', 'wash', 'bar_service'],
  accessClasses: ['service'],
});
for (let room = 0; room < 6; room += 1) {
  const x1 = 793 + (room % 3) * 18;
  const z1 = room < 3 ? -50 : -42;
  club.paint(
    `owner-meeting-${String(room + 1).padStart(2, '0')}`,
    'programmed_room',
    [x1, -5, z1, x1 + 16, 3, z1 + 6],
    { tags: ['owner_meeting_room'], accessClasses: ['owner'] },
  );
}
for (let room = 0; room < 12; room += 1) {
  const column = room % 6;
  const row = Math.floor(room / 6);
  const x1 = 726 + column * 10;
  const z1 = row === 0 ? -39 : -34;
  addAdultRoom(
    club,
    `owner-private-adult-${String(room + 1).padStart(2, '0')}`,
    'owner_private_room',
    [x1, -13, z1, x1 + 8, -5, z1 + 4],
    themes[(room + 1) % themes.length],
    'owner',
    ['owner_private_adult_room'],
  );
}
[
  ['owner-ceremonial-arrival-hall', [793, -13, -39, 848, -6, -34], ['owner_ceremonial_arrival']],
  ['owner-living-salon', [793, -5, -39, 810, 3, -31], ['owner_living']],
  ['owner-formal-dining', [812, -5, -39, 828, 3, -31], ['owner_formal_dining']],
  ['owner-casual-private-dining', [830, -5, -39, 848, 3, -31], ['owner_casual_private_dining']],
  ['owner-small-cinema', [726, -4, -30, 760, 3, -29], ['owner_small_cinema']],
  ['owner-ordinary-office', [762, -4, -30, 780, 3, -29], ['owner_office']],
  ['owner-12-monitor-office', [782, -4, -30, 820, 3, -29], ['owner_12_monitor_office']],
  ['owner-two-rack-micro-dc', [822, -4, -30, 848, 3, -29], ['owner_two_rack_micro_datacenter']],
  ['owner-club-broad-stair', [842, -13, -51, 848, 3, -43], ['broad_stair', 'full_landings']],
  ['owner-club-lift', [832, -13, -51, 840, 3, -43], ['paired_lift']],
].forEach(([id, box, tags]) => club.paint(
  id,
  tags.includes('broad_stair') || tags.includes('paired_lift') ? 'stair_lift' : 'programmed_room',
  box,
  { tags, accessClasses: ['owner'] },
));
levels.push(club);

// Owner residential level: exactly fifteen dual-entry suites and the master compound.
const residence = new Level(
  'C01-OWNER-RESIDENCE',
  false,
  [[716, -31, -74, 895, -18, -10]],
  'owner',
);
for (let suite = 0; suite < 15; suite += 1) {
  const column = suite % 5;
  const row = Math.floor(suite / 5);
  const x1 = 724 + column * 33;
  const z1 = [-60, -50, -40][row];
  residence.paint(
    `poly-suite-${String(suite + 1).padStart(2, '0')}`,
    'programmed_room',
    [x1, -30, z1, x1 + 31, -19, z1 + 8],
    {
      tags: ['poly_suite'],
      components: [
        'bedroom',
        'ensuite',
        'oversized_rain_shower',
        'walk_in_closet',
        'sitting_area',
        'mini_office',
        'front_door',
        'controlled_rear_owner_corridor_door',
      ],
      accessClasses: ['owner'],
    },
  );
}
[
  ['master-bedroom-principal', [720, -30, -72, 775, -19, -63], ['master_bedroom', 'principal_bedroom']],
  ['master-bedroom-two', [778, -30, -72, 818, -19, -63], ['master_bedroom']],
  ['master-bedroom-three', [821, -30, -72, 861, -19, -63], ['master_bedroom']],
  ['master-kitchen-one', [720, -30, -28, 755, -19, -20], ['master_kitchen']],
  ['master-kitchen-two', [758, -30, -28, 793, -19, -20], ['master_kitchen']],
  ['master-living', [796, -30, -28, 845, -19, -20], ['master_living']],
  ['master-safe-room', [848, -30, -28, 892, -19, -20], ['master_safe_room']],
  ['master-spa', [720, -30, -18, 746, -19, -11], ['master_spa']],
  ['master-cinema', [749, -30, -18, 778, -19, -11], ['master_cinema']],
  ['master-indoor-pool', [781, -30, -18, 814, -19, -11], ['master_indoor_pool']],
  ['master-hot-tub-sauna-gym', [817, -30, -18, 847, -19, -11], ['master_hot_tub', 'master_sauna', 'master_gym']],
  ['master-computer-office-library', [850, -30, -18, 892, -19, -11], ['master_computer_office', 'master_library']],
  ['master-smoke-lounge-coffee', [864, -30, -72, 892, -19, -63], ['ventilated_cigar_smoke_lounge', 'premium_coffee_bar']],
  ['master-grand-main-door', [716, -30, -62, 723, -19, -54], ['master_grand_main_door']],
  ['master-owner-back-airlock', [716, -30, -52, 723, -19, -44], ['owner_back_tunnel_only', 'airlock']],
  ['master-owner-tunnel-interface-chamber', [716, -30, -52, 719, -19, -44], ['owner_tunnel_interface', 'airlock']],
  ['owner-residence-broad-stair', [872, -30, -39, 892, -19, -31], ['broad_stair', 'full_landings']],
  ['owner-residence-lift', [861, -30, -39, 870, -19, -31], ['paired_lift']],
].forEach(([id, box, tags]) => residence.paint(
  id,
  tags.includes('broad_stair') || tags.includes('paired_lift') ? 'stair_lift' : 'programmed_room',
  box,
  {
    tags,
    accessClasses: id === 'master-owner-back-airlock'
      || id === 'master-owner-tunnel-interface-chamber'
      ? ['tunnel']
      : ['owner'],
  },
));
addAdultRoom(
  residence,
  'master-grand-central-bedroom',
  'master_grand_bedroom',
  [720, -30, -72, 775, -19, -63],
  'owner_ceremonial',
  'owner',
  ['master_grand_bedroom', 'master_bedroom', 'principal_bedroom'],
);
levels.push(residence);

const finishedLevels = levels.map((level) => level.finish());

const specialProgramDetails = {
  'l1-secure-vehicle-garage': {
    capacity: { vehicles: 24, people: 48 },
    furnishings: [
      '12 detailed car bays',
      '8 detailed truck bays',
      '4 secure service-vehicle bays',
      'clear vehicle aisle',
      'dispatch island',
      'charging and maintenance points',
      'bollards and checkpoint gates',
    ],
  },
  'l2-protected-staff-quarters': {
    capacity: { protectedStaff: 32 },
    furnishings: [
      '32 individual protected staff stations',
      'individual bed and storage modules',
      'trading-hall-inspired visual rhythm without captive entities',
      'shared washrooms',
      'quiet lounge',
      'staff checkpoint',
    ],
  },
  'l2-theater': {
    capacity: { seats: 120 },
    furnishings: ['focal screen and stage', '120 believable seats', 'two aisles', 'projection booth', 'backstage and storage'],
  },
  'l4-medical-bay': {
    capacity: { medicalBeds: 16 },
    furnishings: ['16 medical beds', 'nurse station', 'treatment bays', 'pharmacy storage', 'clean and soiled support'],
  },
  'l4-indoor-shooting-range': {
    capacity: { firingPositions: 8 },
    furnishings: ['8 firing positions', 'controlled backstop', 'ready bench', 'secure equipment lockers', 'observation control'],
  },
  'owner-club-theater': {
    capacity: { audience: 180 },
    furnishings: ['double-height stage and screen', 'audience salon', 'perimeter aisles', 'control booth', 'backstage support'],
  },
};

for (const level of finishedLevels) {
  for (const space of level.spaces) {
    if (!space.occupied) continue;
    const grossCells = space.boxes.reduce((sum, [x1, y1, z1, x2, y2, z2]) =>
      sum + (x2 - x1 + 1) * (y2 - y1 + 1) * (z2 - z1 + 1), 0);
    const uniqueColumns = new Set();
    for (const [x1, , z1, x2, , z2] of space.boxes) {
      for (let z = z1; z <= z2; z += 1) {
        for (let x = x1; x <= x2; x += 1) uniqueColumns.add(`${x},${z}`);
      }
    }
    const detail = specialProgramDetails[space.id] ?? {
      capacity: { people: Math.max(1, Math.min(200, Math.floor(uniqueColumns.size / 6))) },
      furnishings: [
        'task-appropriate modeled work or hospitality grouping',
        'closed storage',
        'zoned lighting',
        'clear internal walking route',
        'room identification and wayfinding',
      ],
    };
    space.coordinateSchedule = {
      grossCells,
      grossColumns: uniqueColumns.size,
      capacity: detail.capacity,
      furnishings: detail.furnishings,
    };
    if (!space.adultRoomProgram) {
      const [x1, y1, z1, x2, , z2] = space.boxes[0];
      const cameraId = `CAM-${space.id}`;
      space.coordinateSchedule.cameraIds = [cameraId];
      evidenceCameras.push({
        id: cameraId,
        roomType: (space.tags ?? [space.category])[0],
        interior: true,
        position: [x1, y1, z1],
        target: [x2, y1, z2],
        objectId: space.id,
        requiredViews: ['threshold_context', 'interior_program_and_route'],
      });
    } else {
      space.coordinateSchedule.cameraIds = space.adultRoomProgram.cameraIds;
    }
  }
}

// Route nodes are attached to every occupied room. The first declared cell is a
// conservative threshold point inside the classified space.
const routeNodes = [];
const routeEdges = [];
const hubByLevel = {};
for (const level of finishedLevels) {
  const loop = level.spaces.find((space) => space.id === `${level.id}-loop`);
  const [loopX, loopY, loopZ] = loop.boxes[0];
  const hubId = `NODE-${level.id}-HUB`;
  hubByLevel[level.id] = hubId;
  routeNodes.push({
    id: hubId,
    spaceId: loop.id,
    level: level.id,
    point: [loopX, loopY, loopZ],
    tags: level.mainLevel ? ['grand_entry_node', 'main_level_room'] : ['level_hub'],
    accessClasses: [levels.find((candidate) => candidate.id === level.id).accessClass],
  });
  for (const space of level.spaces) {
    if (!space.occupied || space.id === loop.id) continue;
    const [x, y, z] = space.boxes[0];
    const nodeId = `NODE-${space.id}`;
    const accessClasses = space.accessClasses ?? ['public'];
    routeNodes.push({
      id: nodeId,
      spaceId: space.id,
      level: level.id,
      point: [x, y, z],
      tags: space.tags ?? [],
      accessClasses,
    });
    routeEdges.push({
      id: `EDGE-${level.id}-${space.id}`,
      from: hubId,
      to: nodeId,
      kind: (space.tags ?? []).includes('airlock') ? 'airlock' : 'door',
      width: (space.tags ?? []).includes('airlock') ? 5 : 3,
      headroom: 6,
      bidirectional: true,
      accessClasses,
    });
  }
}

const verticalPairs = [
  ['C01-L1-SECURITY-GARAGE', 'C01-L2-LIVING-AMENITY', 'public'],
  ['C01-L2-LIVING-AMENITY', 'C01-L3-AGRICULTURE-WATER', 'public'],
  ['C01-L3-AGRICULTURE-WATER', 'C01-L4-COMMAND-MEDICAL', 'owner'],
  ['C01-L4-COMMAND-MEDICAL', 'C01-L5-POWER-ESCAPE', 'owner'],
  ['C01-L5-POWER-ESCAPE', 'C01-OWNER-CLUB-ARRIVAL', 'owner'],
  ['C01-OWNER-CLUB-ARRIVAL', 'C01-OWNER-RESIDENCE', 'owner'],
];
for (const [fromLevel, toLevel, accessClass] of verticalPairs) {
  routeEdges.push({
    id: `EDGE-STAIR-${fromLevel}-${toLevel}`,
    from: hubByLevel[fromLevel],
    to: hubByLevel[toLevel],
    kind: 'stair',
    width: 7,
    headroom: 6,
    bidirectional: true,
    accessClasses: [accessClass],
  });
  routeEdges.push({
    id: `EDGE-LIFT-${fromLevel}-${toLevel}`,
    from: hubByLevel[fromLevel],
    to: hubByLevel[toLevel],
    kind: 'lift',
    width: 4,
    headroom: 6,
    bidirectional: true,
    accessClasses: [accessClass],
  });
}

// Ensure public, owner, service, and tunnel graphs each have explicit isolated
// authority edges while the complete declared graph remains connected.
const entranceNode = hubByLevel['C01-L1-SECURITY-GARAGE'];
const ownerEntrance = hubByLevel['C01-L4-COMMAND-MEDICAL'];
const serviceEntry = 'NODE-l1-garage-security-dispatch';
const tunnelEntry = 'NODE-master-owner-tunnel-interface-chamber';
const serviceNodes = routeNodes.filter((node) => node.accessClasses.includes('service'));
for (let index = 1; index < serviceNodes.length; index += 1) {
  routeEdges.push({
    id: `EDGE-SERVICE-BACKBONE-${String(index).padStart(2, '0')}`,
    from: serviceNodes[index - 1].id,
    to: serviceNodes[index].id,
    kind: 'corridor',
    width: 3,
    headroom: 6,
    bidirectional: true,
    accessClasses: ['service'],
  });
}
routeEdges.push({
  id: 'EDGE-TUNNEL-INTERFACE-TO-BACK-AIRLOCK',
  from: tunnelEntry,
  to: 'NODE-master-owner-back-airlock',
  kind: 'tunnel',
  width: 5,
  headroom: 6,
  bidirectional: true,
  accessClasses: ['tunnel'],
});
routeEdges.push({
  id: 'EDGE-PUBLIC-OWNER-CHECKPOINT',
  from: hubByLevel['C01-L3-AGRICULTURE-WATER'],
  to: ownerEntrance,
  kind: 'airlock',
  width: 5,
  headroom: 6,
  bidirectional: true,
  accessClasses: ['owner'],
});
routeEdges.push({
  id: 'EDGE-PUBLIC-SERVICE-CONTROL',
  from: entranceNode,
  to: serviceEntry,
  kind: 'airlock',
  width: 3,
  headroom: 6,
  bidirectional: true,
  accessClasses: ['service'],
});
routeEdges.push({
  id: 'EDGE-OWNER-TUNNEL-BACKDOOR',
  from: hubByLevel['C01-OWNER-RESIDENCE'],
  to: tunnelEntry,
  kind: 'airlock',
  width: 5,
  headroom: 6,
  bidirectional: true,
  accessClasses: ['tunnel'],
});

const inventory = JSON.parse(fs.readFileSync(AREA_INVENTORY, 'utf8'));
const c01Objects = [];
function collectC01(value) {
  if (Array.isArray(value)) {
    value.forEach(collectC01);
  } else if (value && typeof value === 'object') {
    const id = value.externalId;
    if (typeof id === 'string'
      && (id === 'C01' || id.startsWith('C01-') || id.startsWith('ROUTE:C01'))) {
      c01Objects.push({
        id,
        databaseId: value.id ?? null,
        parentId: value.parentId ?? null,
        name: value.name ?? null,
        kind: value.kind ?? null,
        geometry: value.geometry ?? null,
        disposition: id.includes('HANGAR') || id.includes('ARENA')
          ? 'retire_and_supersede_by_new_program'
          : 'migrate_semantic_program_then_retire_source',
      });
    }
    Object.values(value).forEach(collectC01);
  }
}
collectC01(inventory);
c01Objects.sort((a, b) => a.id.localeCompare(b.id));

const manifest = {
  schemaVersion: '1.0.0',
  id: 'C01-EAST-FIVE-LEVEL-GARAGE-OWNER-STACK-R1',
  status: 'FROZEN_PLANNING_SCHEDULE_NOT_BUILT',
  liveWorldMutated: false,
  supersedes: [
    'all compact east C01 schedules',
    'all C01 hangar schedules',
    'all C01 arena or stadium schedules',
    'all straight owner-tunnel branch candidates',
  ],
  referencedStandards: [
    'docs/redevelopment/2026-07-28-town-expansion/non-graphic-adult-interior-design-standard.md',
    'docs/redevelopment/2026-07-28-town-expansion/c01-hangar-eoc-adult-wing-redesign-source-of-truth.md',
  ],
  bunkerScopes: [
    'c01_east_l1_security_garage',
    'c01_east_l2_living_adult',
    'c01_east_l3_agriculture_water',
    'c01_east_l4_command_medical',
    'c01_east_l5_power_escape',
    'c01_owner_club_arrival',
    'c01_owner_residence',
    'c01_owner_tunnel_detour',
    'c01_source_exact_retirement',
  ],
  envelope: {
    boxes: finishedLevels.flatMap((level) => level.auditVolumeBoxes),
    oldFootprintColumns: 33366,
    newFootprintColumns: 93268,
    studySquare: [700, -48, -160, 900, 60, 5],
    surfaceCompositeUniqueColumns: 20806,
    lowerDryCoreColumns: 7399,
    publicAdultWing: {
      bounds: [787, 33, -83, 874, 40, -21],
      grossColumns: 5544,
      minimumRequiredColumns: 5364,
    },
  },
  garageProgram: {
    supersedesRetiredHangar: true,
    roomId: 'l1-secure-vehicle-garage',
    bounds: [800, 42, -137, 858, 50, -88],
    grossColumns: 2950,
    clearSpan: true,
    vehicleTypes: ['cars', 'pickup_trucks', 'service_trucks', 'secure_transport'],
    portalOpening: [800, 43, -137, 818, 49, -137],
    supportGalleryRoomIds: [
      'l1-garage-security-dispatch',
      'l1-garage-maintenance-control',
      'l1-garage-parts-storage',
      'l1-garage-motor-pool-office',
      'l1-garage-decon-overlook',
    ],
    activeHangarProgram: false,
  },
  levels: finishedLevels,
  routeGraph: {
    entranceNode,
    classEntrances: {
      public: entranceNode,
      owner: ownerEntrance,
      service: serviceEntry,
      tunnel: tunnelEntry,
    },
    egressNodes: [
      'NODE-l5-independent-egress-west',
      'NODE-l5-independent-egress-east',
      tunnelEntry,
    ],
    nodes: routeNodes,
    edges: routeEdges,
  },
  ownerTunnelConnector: {
    status: 'FROZEN_SURVEYED_PLANNING_ROUTE_NOT_BUILT',
    priorOwnerCorridorInterface: [363, -44, 55],
    floorY: -44,
    centerlineWaypointsXZ: [
      [363, 55],
      [540, -20],
      [620, -42],
      [718, -42],
    ],
    clearSection: { width: 5, height: 5, clearY: [-43, -39] },
    linedSection: { width: 7, constructionY: [-46, -37] },
    endpointAirlocks: true,
    terminalStairLiftPrism: [718, -48, -50, 734, -13, -34],
    survey: {
      snapshotSha256: SNAPSHOT_SHA,
      neighborHalo: 'centerline +/-5 X/Z/Y',
      uniqueCellsChecked: 54956,
      waterCells: 0,
      lavaCells: 0,
      bubbleColumns: 0,
      blockEntities: 0,
      terminalPrismWaterCells: 0,
      terminalPrismLavaCells: 0,
      terminalPrismBubbleColumns: 0,
      terminalPrismBlockEntities: 0,
    },
    rejectedRoutes: [
      {
        description: 'straight branch from prior interface to master compound',
        reason: 'fails expanded neighbor halo near lava and retained chest at 630,-40,-14',
      },
    ],
    acceptance: [
      'repeat exact target and full face/neighbor fluid census on same-moment snapshot',
      'prove exact no-overlap except the prior owner-corridor interface and master back-airlock',
      'prove 5x5 clear bidirectional normal walking after construction',
      'no connection to civilian tunnels, Raven Rock, or Ravensgate',
    ],
  },
  verticalCirculationPolicy: {
    minimumRouteWidth: 2,
    minimumStairWidth: 7,
    minimumLiftWidth: 4,
    minimumHeadroom: 6,
    requireStairAndLiftPerOccupiedLevel: true,
    landingRule: 'full-width landing at every floor and every direction change',
  },
  adultRoomPolicy: {
    adultRoomTag: 'non_graphic_adult_room',
    minimumFurnishingsPerRoom: 7,
    themedSilhouetteFurnishingId: 'non_graphic_themed_furniture_silhouette',
    requiredFunctionsByType: {
      private_themed_room: ['bed', 'lounge_seating', 'dressing', 'wash_cleanup', 'storage'],
      one_to_one_room: ['bed', 'lounge_seating', 'dressing', 'wash_cleanup', 'storage'],
      owner_private_room: ['bed', 'lounge_seating', 'dressing', 'wash_cleanup', 'storage'],
      master_grand_bedroom: ['bed', 'lounge_seating', 'dressing', 'wash_cleanup', 'storage'],
    },
  },
  evidenceCameras,
  programRequirements: {
    exactSpaceTagCounts: {
      public_adult_private_room: 24,
      public_adult_one_to_one_room: 5,
      owner_private_adult_room: 12,
      owner_meeting_room: 6,
      poly_suite: 15,
      master_bedroom: 3,
      master_kitchen: 2,
    },
    minimumSpaceTagCounts: {
      broad_stair: 7,
      paired_lift: 7,
      independent_egress: 2,
    },
    requiredSpaceTags: [
      'secure_vehicle_garage',
      'security_entrance',
      'decontamination',
      'eoc_flexible_operations',
      'theater',
      'indoor_pool',
      'farms',
      'animals',
      'water_systems',
      'command_center',
      'situation_room',
      'armory',
      'vault',
      'medical_bay',
      'server_room',
      'security_operations_center',
      'power_plant',
      'escape_tunnels',
      'nether_portal',
      'secondary_panic_bunker',
      'golf_simulator',
      'gaming_room',
      'library',
      'music_studio',
      'indoor_shooting_range',
      'guest_suites',
      'brewing_stations',
      'potion_storage',
      'quarantine_rooms',
      'prison',
      'intruder_holding_cells',
      'trophy_gallery',
    ],
    prohibitedContentTags: ['explicit_imagery', 'figures_depicting_acts', 'aircraft_hangar', 'training_arena'],
  },
  egressPolicy: { minimumIndependentEgresses: 3 },
  terrainSafety: {
    snapshotSha256: SNAPSHOT_SHA,
    minimumCoverBlocks: 3,
    measuredMinimumCoverBlocks: 3,
    fluidCells: 0,
    unresolvedFluidCells: 0,
    expandedSafetyEarthIsland: [702, 20, -58, 725, 60, -23],
    concealmentGate: {
      allowedVisibleMasks: [
        'approved garage portal opening in retained road cut',
        'OBS-S01 mountain-form observatory',
        'APT-S01 owner penthouse/estate',
      ],
      prohibitedVisibleElements: [
        'garage wall',
        'garage roof',
        'concrete bunker box',
        'utility stack',
        'lower-level mass',
      ],
      requiredChecks: [
        'cellwise terrain-cover thickness over every roof and outer wall',
        'surface-to-structure visibility rays from 360-degree perimeter stations',
        'zero exposed C01 structural cells outside approved masks',
        'matched north/east/south/west and elevated surface screenshots',
        'skyline comparison with observatory/penthouse masks isolated',
      ],
    },
  },
  sourceMigrationLedger: {
    status: 'BLOCKING_COMMISSION_NEW_BEFORE_RETIRE_OLD',
    sourceSnapshot: {
      regionDirectory: 'data/worldsnap-postrelease-f8edf99494c023dd-20260728/region',
      sha256: 'f8edf99494c023dd4b7e412d146a9018bb4ac29636f19c27431083e6b0f6ec10',
    },
    sourceC01Bounds: [100, 44, 70, 300, 136, 235],
    sourceCensus: {
      recursiveDatabaseObjects: 36,
      blockEntities: 1896,
      inventories: 1622,
      itemStacks: 92,
      totalItemCount: 5132,
    },
    sourceCatalog: {
      file: path.relative(ROOT, AREA_INVENTORY),
      sha256: sha256(AREA_INVENTORY),
      extractedC01Objects: c01Objects,
      extractedCount: c01Objects.length,
      reconciliationRule: 'The immutable database query must still reconcile exactly 36 recursive C01 objects; this export is media/catalog evidence, not a replacement for the database ledger.',
    },
    retainedSiblingMasks: [
      {
        id: 'OBS-S01',
        bounds: [175, 119, 137, 235, 136, 182],
        disposition: 'retain_exactly',
      },
      {
        id: 'APT-S01',
        bounds: [178, 105, 139, 225, 114, 180],
        disposition: 'retain_exactly',
      },
      {
        id: 'ROUTE:APT-SHELTER',
        disposition: 'retain_exactly',
        source: 'database exact path geometry',
      },
      {
        id: 'ROUTE:OBS-PENTHOUSE-PRIVATE-STAIR',
        disposition: 'retain_exactly',
        source: 'database exact path geometry',
      },
      {
        id: 'ROUTE:OBS-PUBLIC-STAIR',
        disposition: 'retain_exactly_or_intentionally_reassign_only_after_review',
        source: 'database exact path geometry',
      },
    ],
    nbtObjectLedgerRequiredFields: [
      'sourceCoordinate',
      'sourceBlockState',
      'sourceFullNbt',
      'sourceNbtSha256',
      'destinationCoordinate',
      'destinationBlockState',
      'destinationExpectedNbtSha256',
      'inventorySlotLedger',
      'itemCount',
      'sequenceNumber',
      'rollbackCoordinate',
      'rollbackFullNbt',
      'rollbackNbtSha256',
    ],
    sequence: [
      'freeze same-moment source snapshot, database, entity and inventory hashes',
      'build and commission all new east scopes with old C01 untouched',
      'prove routes, concealment, fluids, vertical circulation and matched cameras',
      'run live data get block for every one of 1896 source block entities and match frozen NBT hashes',
      'copy one bounded NBT batch using guarded block-state plus exact NBT restore commands',
      'read back every destination NBT object and inventory slot and match hashes/counts',
      'reconcile exactly 1896 block entities, 1622 inventories, 92 stacks, 5132 items and 36 database objects',
      'switch access and wayfinding; hold old source as rollback',
      'retire only exact source-ledger C01-owned cells after explicit acceptance',
      'prove all retained sibling masks and inventories unchanged',
      'complete full P01 parking recovery and its drainage/routes after retirement',
    ],
    hardFailures: [
      'blanket clearing any part of [90..300] without an exact source-owner ledger',
      'source block-state match without source NBT hash match',
      'any missing or duplicate destination NBT object',
      'any change inside a retained sibling mask not explicitly reviewed',
      'retiring the old source before complete new-facility commissioning',
    ],
  },
  migrationContract: {
    sourceOfTruth: 'sourceMigrationLedger',
    mode: 'commission_new_before_retire_old',
    exactSourceOwnedRetirementOnly: true,
    blanketClearProhibited: true,
    sourceBlockEntities: 1896,
    sourceItemCount: 5132,
    retainedSiblingMasks: ['OBS-S01', 'APT-S01', 'ROUTE:APT-SHELTER', 'ROUTE:OBS-PENTHOUSE-PRIVATE-STAIR'],
  },
  parkingRecovery: {
    p01Bounds: [-125, 64, 172, 125, 64, 305],
    fullSurfaceColumns: 33634,
    dependency: 'old C01 exact retirement accepted',
    acceptance: [
      'one uninterrupted parking object',
      'no old C01 portal, route, shell, or access-road cell in the lot',
      'complete stalls, aisles, crosswalks, lighting, drainage, and bidirectional vehicle circulation',
      'protected observatory/owner-estate sibling geometry and inventories unchanged',
    ],
  },
  databasePublication: {
    lifecycle: ['planned', 'built_unverified', 'verified'],
    rule: 'No feature becomes verified until post-state geometry, route, inventory/NBT, and matched object-camera evidence all pass.',
    arraysToRefreshAfterAcceptedRelease: [
      'world_features',
      'object_to_media_crosswalk',
      'capture_manifest',
      'surface_atlas',
      'floorplan_atlas',
      'master_plan_dossier',
      'Sites_showcase_payload',
    ],
  },
  acceptance: {
    requiredMainLevelTags: [
      'main_level_room',
      'secure_vehicle_garage',
      'adults_only_wing',
      'eoc_flexible_operations',
    ],
    requiredAccessClasses: ['public', 'owner', 'service', 'tunnel'],
    backTunnelOnlySpaceTag: 'owner_back_tunnel_only',
    grandEntryNodeTag: 'grand_entry_node',
    hardRouteGates: [
      'door-threshold graph reaches every occupied/required space',
      'voxel flood-fill reaches every main-level destination from the grand entry',
      'no sealed secure rooms',
      'no one-block pinches',
      'broad stair and paired lift to every occupied level',
      'matched route cameras for main loop, every vertical core, independent egresses, and owner tunnel',
    ],
    implementationStatus: 'BLOCKED_UNTIL_COMPILER_SCOPES_AND_EXACT_MIGRATION_LEDGER_EXIST',
  },
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${OUT}\n`);
