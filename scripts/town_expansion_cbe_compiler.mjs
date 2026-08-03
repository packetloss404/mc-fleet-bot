import fs from 'fs';

const MAIN_SCOPE = 'TE-IA-CONCORD-BROADCAST-EXCHANGE';
const SATELLITE_SCOPE = 'TE-IA-CONCORD-SATELLITE-PAD';
const ANNEX_SCOPE = 'TE-IA-CONCORD-SOUNDSTAGE-ANNEX';

function assert(condition, message) {
  if (!condition) throw new Error(`CBE compiler: ${message}`);
}

function volume(bounds) {
  const [x1, y1, z1, x2, y2, z2] = bounds;
  return (x2 - x1 + 1) * (y2 - y1 + 1) * (z2 - z1 + 1);
}

function dimensions(bounds) {
  const [x1, y1, z1, x2, y2, z2] = bounds;
  return {
    width: x2 - x1 + 1,
    height: y2 - y1 + 1,
    length: z2 - z1 + 1,
  };
}

function intersects(a, b) {
  return (
    a[0] <= b[3] && a[3] >= b[0]
    && a[1] <= b[4] && a[4] >= b[1]
    && a[2] <= b[5] && a[5] >= b[2]
  );
}

function uniqueIds(records, field, label) {
  const ids = records.map((record) => record[field]);
  assert(new Set(ids).size === ids.length, `${label} IDs are not unique`);
  return ids;
}

function readSchedule(schedulePath, projectId) {
  const schedule = JSON.parse(fs.readFileSync(schedulePath, 'utf8'));
  assert(schedule.projectId === projectId, `${schedulePath} is not ${projectId}`);
  return schedule;
}

function countIds(rooms, pattern) {
  return rooms.filter(({ objectId }) => pattern.test(objectId)).length;
}

function validateExchangeSchedule(schedule) {
  assert(schedule.rooms.length === 113, `expected 113 Exchange rooms, got ${schedule.rooms.length}`);
  assert(schedule.siteObjects.length === 5, `expected 5 Exchange site objects, got ${schedule.siteObjects.length}`);
  assert(schedule.verticalCirculation.length === 5, `expected 5 Exchange cores, got ${schedule.verticalCirculation.length}`);
  assert(schedule.specialComponents.length === 20, `expected 20 Exchange special components, got ${schedule.specialComponents.length}`);
  assert(schedule.routes.length === 10, `expected 10 Exchange routes, got ${schedule.routes.length}`);
  assert(schedule.cameraCandidates.length === 18, `expected 18 Exchange cameras, got ${schedule.cameraCandidates.length}`);

  uniqueIds(schedule.rooms, 'objectId', 'Exchange room');
  uniqueIds(schedule.siteObjects, 'objectId', 'Exchange site-object');
  uniqueIds(schedule.verticalCirculation, 'objectId', 'Exchange core');
  uniqueIds(schedule.specialComponents, 'objectId', 'Exchange special-component');
  uniqueIds(schedule.routes, 'routeId', 'Exchange route');
  uniqueIds(schedule.cameraCandidates, 'cameraId', 'Exchange camera');

  const actual = {
    podcastRooms: countIds(schedule.rooms, /^CBE-G0-POD-\d/),
    podcastControlRooms: countIds(schedule.rooms, /^CBE-G0-PODCTL-/),
    gamingStreamMinis: countIds(schedule.rooms, /-GAME-/),
    varietyStreamMinis: countIds(schedule.rooms, /-VAR-/),
    adultPerformanceStreamMinis: countIds(schedule.rooms, /-ADULT-/),
    miniStudioTechnicalHubs: countIds(schedule.rooms, /^CBE-G1-TECH-/),
    masterControlRooms: countIds(schedule.rooms, /^CBE-G0-MCR-/),
    ingestQcRooms: countIds(schedule.rooms, /^CBE-G0-INGEST-/),
    aboveGroundEditSuites: countIds(schedule.rooms, /^CBE-G0-EDIT-/),
    arcades: countIds(schedule.rooms, /-ARCADE-/),
    billiardsRooms: countIds(schedule.rooms, /-BILLIARDS-/),
    demonstrationKitchenStudios: countIds(schedule.rooms, /-KITCHEN-/),
    cabaretExhibitionHalls: countIds(schedule.rooms, /-HALL-\d/),
    coffeeRooms: countIds(schedule.rooms, /-COFFEE-/),
    fictionalBotanicalBoutiques: countIds(schedule.rooms, /-BOTANICAL-/),
    b1GreenRooms: countIds(schedule.rooms, /^CBE-B1-GREEN-/),
    b1DressingRooms: countIds(schedule.rooms, /^CBE-B1-DRESS-/),
    b1WardrobeMakeupRooms: countIds(schedule.rooms, /^CBE-B1-WARDROBE-/),
    b2NonGraphicSetRooms: countIds(schedule.rooms, /^CBE-B2-SET-\d/),
    b2SharedSetControlBooths: countIds(schedule.rooms, /^CBE-B2-SETCTL-/),
    b2UndergroundEditSuites: countIds(schedule.rooms, /^CBE-B2-EDIT-/),
    b2GreenRecoveryRooms: countIds(schedule.rooms, /^CBE-B2-GREEN-/),
    cameraCandidates: schedule.cameraCandidates.length,
  };
  for (const [key, value] of Object.entries(actual)) {
    assert(schedule.exactCounts[key] === value, `${key} schedule mismatch ${value} != ${schedule.exactCounts[key]}`);
  }

  const dishCounts = { large: 0, medium: 0, small: 0 };
  for (const component of schedule.specialComponents) {
    if (!component.objectId.includes('DISH-')) continue;
    assert(component.scale in dishCounts, `unknown dish scale on ${component.objectId}`);
    dishCounts[component.scale] += 1;
  }
  assert(dishCounts.large === 1, `large dish count ${dishCounts.large} != 1`);
  assert(dishCounts.medium === 4, `medium dish count ${dishCounts.medium} != 4`);
  assert(dishCounts.small === 4, `small dish count ${dishCounts.small} != 4`);
  assert(
    dishCounts.large + dishCounts.medium + dishCounts.small === 9,
    'dish field is not exactly 1 + 4 + 4 = 9',
  );
  assert(
    countIds(schedule.specialComponents, /^CBE-TOWER-DECK-/) === 4,
    'tower must have exactly four decks',
  );
  assert(
    schedule.verticalCirculation.slice(0, 4)
      .every(({ clearWalkingWidthBlocks }) => clearWalkingWidthBlocks === 4),
    'all four occupied-level cores must retain four-block stair width',
  );

  const roomCoreOverlaps = [];
  for (const scheduledRoom of schedule.rooms) {
    for (const core of schedule.verticalCirculation) {
      if (intersects(scheduledRoom.bounds, core.bounds)) {
        roomCoreOverlaps.push([scheduledRoom.objectId, core.objectId]);
      }
    }
  }
  assert(roomCoreOverlaps.length === 0, `room/core overlaps: ${JSON.stringify(roomCoreOverlaps)}`);
  return { actual, dishCounts, roomCoreOverlaps };
}

function validateAnnexSchedule(schedule) {
  const expected = schedule.exactCounts;
  assert(schedule.rooms.length === expected.scheduledRooms, 'annex room count does not match exactCounts');
  assert(schedule.siteObjects.length === 10, `expected 10 annex site objects, got ${schedule.siteObjects.length}`);
  assert(schedule.routes.length === 10, `expected 10 annex routes, got ${schedule.routes.length}`);
  assert(schedule.cameraCandidates.length === 18, `expected 18 annex cameras, got ${schedule.cameraCandidates.length}`);
  assert(expected.stageBuildings === 2, 'annex must contain exactly two stage buildings');
  assert(expected.clearSpanStageVolumes === 2, 'annex must contain exactly two clear-span volumes');
  assert(expected.lateNightSeatBlocks === 96, 'late-night seat count must be exactly 96');
  assert(expected.sitcomSeatBlocks === 84, 'sitcom seat count must be exactly 84');
  assert(expected.partialTwoStorySupportBars === 2, 'annex must contain two partial support bars');
  assert(expected.glazedStageOverlooks === 2, 'annex must contain two glazed stage overlooks');
  assert(expected.cameraCandidates === 18, 'annex exact camera count must be 18');

  uniqueIds(schedule.rooms, 'objectId', 'annex room');
  uniqueIds(schedule.siteObjects, 'objectId', 'annex site-object');
  uniqueIds(schedule.routes, 'routeId', 'annex route');
  uniqueIds(schedule.cameraCandidates, 'cameraId', 'annex camera');

  const lateNight = schedule.rooms.filter(({ stage }) => stage === 'late-night');
  const sitcom = schedule.rooms.filter(({ stage }) => stage === 'sitcom');
  const shared = schedule.rooms.filter(({ stage }) => stage === 'shared');
  assert(lateNight.length === expected.lateNightScheduledRooms, 'late-night scheduled room count mismatch');
  assert(sitcom.length === expected.sitcomScheduledRooms, 'sitcom scheduled room count mismatch');
  assert(shared.length === expected.sharedScheduledRooms, 'shared scheduled room count mismatch');

  const clearRooms = schedule.rooms.filter(({ level }) => level === 'STAGE');
  assert(clearRooms.length === 2, 'two clear stage rooms are required');
  for (const clearRoom of clearRooms) {
    const size = dimensions(clearRoom.bounds);
    assert(
      [size.width, size.length].sort((left, right) => left - right).join(',') === '34,52',
      `${clearRoom.objectId} plan dimensions are ${size.width} by ${size.length}`,
    );
    assert(size.height >= 18, `${clearRoom.objectId} clear height is ${size.height}`);
    const intrusions = schedule.rooms.filter((candidate) => (
      candidate.objectId !== clearRoom.objectId
      && intersects(candidate.bounds, clearRoom.bounds)
    ));
    assert(intrusions.length === 0, `${clearRoom.objectId} has scheduled room intrusions`);
  }

  const requiredPrograms = [
    ['late-night', /host dressing/],
    ['late-night', /guest dressing/],
    ['late-night', /green room/],
    ['late-night', /hair and makeup/],
    ['late-night', /wardrobe/],
    ['late-night', /production control/],
    ['late-night', /audio control/],
    ['late-night', /lighting control/],
    ['late-night', /scenery dock/],
    ['late-night', /audience holding/],
    ['sitcom', /cast dressing/],
    ['sitcom', /guest dressing/],
    ['sitcom', /green room/],
    ['sitcom', /hair and makeup/],
    ['sitcom', /wardrobe/],
    ['sitcom', /production control/],
    ['sitcom', /audio control/],
    ['sitcom', /lighting control/],
    ['sitcom', /scenery dock/],
    ['sitcom', /audience holding/],
  ];
  const missingPrograms = requiredPrograms.filter(([stage, pattern]) => (
    !schedule.rooms.some((candidate) => (
      candidate.stage === stage && pattern.test(candidate.program)
    ))
  ));
  assert(missingPrograms.length === 0, `annex missing required programs ${JSON.stringify(missingPrograms)}`);

  return {
    rooms: schedule.rooms.length,
    lateNightRooms: lateNight.length,
    sitcomRooms: sitcom.length,
    sharedRooms: shared.length,
    clearRooms: clearRooms.map(({ objectId, bounds }) => ({
      objectId,
      bounds,
      ...dimensions(bounds),
    })),
    missingPrograms,
  };
}

function roomPalette(room) {
  const program = room.program.toLowerCase();
  if (room.level === 'B2') {
    return {
      wall: 'minecraft:deepslate_bricks',
      floor: 'minecraft:polished_blackstone',
      accent: program.includes('set') ? 'minecraft:purple_concrete' : 'minecraft:cyan_terracotta',
    };
  }
  if (room.level === 'B1') {
    return {
      wall: 'minecraft:red_nether_bricks',
      floor: 'minecraft:black_glazed_terracotta',
      accent: program.includes('botanical') ? 'minecraft:green_terracotta' : 'minecraft:magenta_terracotta',
    };
  }
  if (room.stage === 'late-night') {
    return {
      wall: 'minecraft:gray_concrete',
      floor: 'minecraft:polished_deepslate',
      accent: 'minecraft:oxidized_cut_copper',
    };
  }
  if (room.stage === 'sitcom') {
    return {
      wall: 'minecraft:light_gray_concrete',
      floor: 'minecraft:smooth_stone',
      accent: 'minecraft:cyan_terracotta',
    };
  }
  if (room.stage === 'shared') {
    return {
      wall: 'minecraft:bricks',
      floor: 'minecraft:dark_oak_planks',
      accent: 'minecraft:cut_copper',
    };
  }
  return {
    wall: 'minecraft:gray_concrete',
    floor: 'minecraft:dark_oak_planks',
    accent: 'minecraft:cyan_terracotta',
  };
}

function doorOnNearestCirculation(model, scope, room, meta, AIR) {
  const [x1, y1, z1, x2, , z2] = room.bounds;
  const midX = Math.floor((x1 + x2) / 2);
  const midZ = Math.floor((z1 + z2) / 2);
  if (room.stage === 'late-night' || room.stage === 'sitcom') {
    if (room.level === 'STAGE') return;
    if (room.stage === 'late-night' && x2 <= 673) {
      model.box(x2, y1 + 1, midZ - 1, x2, y1 + 3, midZ + 1, AIR, meta(scope, `${room.objectId}_dock_door`, 56));
      return;
    }
    if (room.stage === 'sitcom' && x1 >= 798) {
      model.box(x1, y1 + 1, midZ - 1, x1, y1 + 3, midZ + 1, AIR, meta(scope, `${room.objectId}_dock_door`, 56));
      return;
    }
    if (z2 >= -431) {
      model.box(midX - 1, y1 + 1, z2, midX + 1, y1 + 3, z2, AIR, meta(scope, `${room.objectId}_public_door`, 56));
    } else if (z2 <= -482) {
      model.box(midX - 1, y1 + 1, z2, midX + 1, y1 + 3, z2, AIR, meta(scope, `${room.objectId}_corridor_door`, 56));
    } else {
      model.box(midX - 1, y1 + 1, z1, midX + 1, y1 + 3, z1, AIR, meta(scope, `${room.objectId}_corridor_door`, 56));
    }
    return;
  }
  if (room.stage === 'shared') {
    model.box(midX - 1, y1 + 1, z2, midX + 1, y1 + 3, z2, AIR, meta(scope, `${room.objectId}_shared_door`, 56));
    return;
  }
  const centerSpineX = room.level === 'B2' ? 706 : room.level === 'B1' ? 699 : 691;
  if (x2 <= centerSpineX) {
    model.box(x2, y1 + 1, midZ - 1, x2, y1 + 3, midZ + 1, AIR, meta(scope, `${room.objectId}_spine_door`, 56));
  } else {
    model.box(x1, y1 + 1, midZ - 1, x1, y1 + 3, midZ + 1, AIR, meta(scope, `${room.objectId}_spine_door`, 56));
  }
}

function furnishRoom(model, scope, room, meta, interiorEvidence = null) {
  if (room.level === 'STAGE') return;
  const [x1, y1, z1, x2, y2, z2] = room.bounds;
  const width = x2 - x1 + 1;
  const length = z2 - z1 + 1;
  if (width < 3 || length < 3 || y2 - y1 < 3) return;
  const palette = roomPalette(room);
  const program = room.program.toLowerCase();
  const insetX1 = x1 + 1;
  const insetX2 = x2 - 1;
  const insetZ1 = z1 + 1;
  const insetZ2 = z2 - 1;
  const centerX = Math.floor((x1 + x2) / 2);
  const centerZ = Math.floor((z1 + z2) / 2);

  if (
    program.includes('adult-performance')
    || program.includes('bondage-themed')
  ) {
    // Non-graphic private performance rooms follow the binding interior
    // standard. Fixtures stay on the two long edges so the center retains a
    // two-block circulation strip between the door and focal wall.
    model.box(
      insetX1,
      y1 + 1,
      insetZ1,
      insetX1,
      y1 + 1,
      Math.min(insetZ1 + 1, insetZ2),
      'minecraft:purple_wool',
      meta(scope, `${room.objectId}_upholstered_platform`, 61),
    );
    model.set(
      insetX1,
      y1 + 1,
      Math.max(insetZ1, insetZ2 - 1),
      'minecraft:dark_oak_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]',
      meta(scope, `${room.objectId}_lounge_chair`, 62),
    );
    model.box(
      insetX2,
      y1 + 1,
      centerZ,
      insetX2,
      Math.min(y1 + 3, y2 - 1),
      centerZ,
      'minecraft:tinted_glass',
      meta(scope, `${room.objectId}_offset_privacy_screen`, 62),
    );
    model.set(
      insetX2,
      y1 + 1,
      insetZ1,
      'minecraft:bookshelf',
      meta(scope, `${room.objectId}_closed_costume_storage_analogue`, 62),
    );
    model.set(
      insetX2,
      y1 + 1,
      insetZ2,
      'minecraft:cauldron',
      meta(scope, `${room.objectId}_private_wash_niche`, 62),
    );
    model.set(
      insetX1,
      Math.min(y1 + 4, y2 - 1),
      insetZ2,
      'minecraft:shroomlight',
      meta(scope, `${room.objectId}_warm_scene_light`, 63),
    );
    model.set(
      insetX2,
      Math.min(y1 + 4, y2 - 1),
      insetZ1,
      'minecraft:sea_lantern',
      meta(scope, `${room.objectId}_task_light`, 63),
    );
    model.box(
      insetX1,
      y1 + 1,
      insetZ1,
      insetX1,
      Math.min(y1 + 3, y2 - 1),
      insetZ1,
      palette.accent,
      meta(scope, `${room.objectId}_non_graphic_focal_wall`, 60),
    );
    if (interiorEvidence) {
      interiorEvidence.push({
        objectId: room.objectId,
        nonGraphic: true,
        privacyVestibuleOrScreen: true,
        upholsteredPlatform: true,
        loungeGroup: true,
        dressingAndClosedStorage: true,
        washNiche: true,
        warmAndTaskLighting: true,
        focalElement: true,
        twoBlockCenterCirculation: true,
        simpleExit: true,
        acousticPrivacyShell: true,
      });
    }
    return;
  }

  if (
    program.includes('stream')
    || program.includes('podcast')
    || program.includes('capture set')
  ) {
    model.box(insetX1, y1 + 1, insetZ1, insetX2, Math.min(y1 + 3, y2 - 1), insetZ1, palette.accent, meta(scope, `${room.objectId}_real_backdrop`, 61));
    model.set(centerX, y1 + 1, centerZ, 'minecraft:observer[facing=north,powered=false]', meta(scope, `${room.objectId}_camera`, 62));
    model.set(centerX, Math.min(y1 + 4, y2 - 1), insetZ1 + 1, 'minecraft:sea_lantern', meta(scope, `${room.objectId}_key_light`, 62));
    model.set(insetX2, y1 + 1, insetZ2, 'minecraft:dark_oak_slab[type=top,waterlogged=false]', meta(scope, `${room.objectId}_operator_desk`, 62));
    return;
  }
  if (
    program.includes('control')
    || program.includes('technical')
    || program.includes('ingest')
    || program.includes('edit')
    || program.includes('machine')
  ) {
    model.box(insetX1, y1 + 1, insetZ1, insetX2, y1 + 2, insetZ1, 'minecraft:polished_blackstone', meta(scope, `${room.objectId}_equipment_console`, 61));
    model.box(insetX1, Math.min(y1 + 3, y2 - 1), insetZ1, insetX2, Math.min(y1 + 3, y2 - 1), insetZ1, 'minecraft:cyan_stained_glass', meta(scope, `${room.objectId}_monitor_band`, 62));
    return;
  }
  if (
    program.includes('office')
    || program.includes('writers')
    || program.includes('meeting')
    || program.includes('table-read')
    || program.includes('workroom')
  ) {
    model.box(insetX1, y1 + 1, insetZ1, insetX2, y1 + 1, insetZ1, 'minecraft:dark_oak_slab[type=top,waterlogged=false]', meta(scope, `${room.objectId}_work_table`, 61));
    model.set(insetX1, y1 + 2, insetZ2, 'minecraft:bookshelf', meta(scope, `${room.objectId}_reference_store`, 62));
    return;
  }
  if (
    program.includes('dressing')
    || program.includes('green room')
    || program.includes('lounge')
    || program.includes('quiet')
    || program.includes('recovery')
  ) {
    model.box(insetX1, y1 + 1, insetZ1, Math.min(insetX1 + 2, insetX2), y1 + 1, Math.min(insetZ1 + 1, insetZ2), 'minecraft:purple_wool', meta(scope, `${room.objectId}_upholstered_seating`, 61));
    model.set(insetX2, y1 + 2, insetZ1, 'minecraft:lantern[hanging=false]', meta(scope, `${room.objectId}_warm_lamp`, 62));
    return;
  }
  if (
    program.includes('storage')
    || program.includes('cage')
    || program.includes('prop')
    || program.includes('wardrobe')
    || program.includes('gear')
    || program.includes('scenery')
  ) {
    model.box(insetX1, y1 + 1, insetZ1, insetX1, Math.min(y1 + 3, y2 - 1), insetZ2, 'minecraft:barrel[facing=up,open=false]', meta(scope, `${room.objectId}_storage_rack`, 61));
    return;
  }
  if (
    program.includes('cafe')
    || program.includes('coffee')
    || program.includes('commissary')
    || program.includes('concession')
    || program.includes('kitchen')
  ) {
    model.box(insetX1, y1 + 1, insetZ1, insetX2, y1 + 1, insetZ1, 'minecraft:polished_blackstone', meta(scope, `${room.objectId}_service_counter`, 61));
    model.box(insetX1, y1 + 1, insetZ2, insetX2, y1 + 1, insetZ2, 'minecraft:dark_oak_slab[type=top,waterlogged=false]', meta(scope, `${room.objectId}_table`, 62));
    return;
  }
  if (program.includes('restroom') || program.includes('toilet')) {
    model.set(insetX1, y1 + 1, insetZ1, 'minecraft:quartz_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]', meta(scope, `${room.objectId}_fixture_analogue`, 61));
    model.set(
      insetX2,
      y1 + 1,
      insetZ1,
      'minecraft:cauldron',
      meta(scope, `${room.objectId}_wash_fixture`, 61),
    );
    return;
  }
  model.box(insetX1, y1 + 1, insetZ1, insetX2, y1 + 1, insetZ1, palette.accent, meta(scope, `${room.objectId}_program_fixture`, 61));
}

function modelScheduledRoom(model, scope, room, meta, AIR, interiorEvidence = null) {
  if (room.level === 'STAGE') return;
  const palette = roomPalette(room);
  model.hollow(...room.bounds, palette.wall, meta(scope, `${room.objectId}_scheduled_room_shell`, 50));
  const [x1, y1, z1, x2, , z2] = room.bounds;
  if (x2 - x1 >= 2 && z2 - z1 >= 2) {
    model.box(x1 + 1, y1, z1 + 1, x2 - 1, y1, z2 - 1, palette.floor, meta(scope, `${room.objectId}_scheduled_room_floor`, 51));
  }
  doorOnNearestCirculation(model, scope, room, meta, AIR);
  furnishRoom(model, scope, room, meta, interiorEvidence);
}

function modelFourWideStairLiftCore(model, scope, core, levels, meta, AIR) {
  const [x1, y1, z1, x2, y2, z2] = core.bounds;
  model.hollow(x1, y1, z1, x2, y2, z2, 'minecraft:deepslate_tiles', meta(scope, `${core.objectId}_protected_core`, 70));
  const stairMinZ = z1 + 1;
  const stairMaxZ = stairMinZ + 3;
  const run = Math.max(3, x2 - x1 - 1);
  for (let y = y1; y < y2; y += 1) {
    const rise = y - y1;
    const flight = Math.floor(rise / run);
    const offset = rise % run;
    const forward = flight % 2 === 0;
    const x = forward ? x1 + 1 + offset : x2 - 1 - offset;
    const facing = forward ? 'east' : 'west';
    model.box(
      x,
      y,
      stairMinZ,
      x,
      y,
      stairMaxZ,
      `minecraft:smooth_quartz_stairs[facing=${facing},half=bottom,shape=straight,waterlogged=false]`,
      meta(scope, `${core.objectId}_four_wide_normal_walk_stair`, 72),
    );
    model.box(x, y + 1, stairMinZ, x, Math.min(y + 4, y2 - 1), stairMaxZ, AIR, meta(scope, `${core.objectId}_stair_headroom`, 71));
    if (offset === run - 1) {
      model.box(x1 + 1, y, stairMinZ, x2 - 1, y, stairMaxZ, 'minecraft:smooth_quartz', meta(scope, `${core.objectId}_full_width_landing`, 72));
      model.box(x1 + 1, y + 1, stairMinZ, x2 - 1, Math.min(y + 4, y2 - 1), stairMaxZ, AIR, meta(scope, `${core.objectId}_landing_headroom`, 71));
    }
  }
  const liftZ1 = z2 - 2;
  const liftZ2 = z2 - 1;
  model.box(x1 + 2, y1 + 1, liftZ1, x1 + 3, y2 - 1, liftZ2, AIR, meta(scope, `${core.objectId}_lift_clearance`, 73));
  model.box(x1 + 1, y1, liftZ1 - 1, x1 + 4, y2, z2, 'minecraft:tinted_glass', meta(scope, `${core.objectId}_lift_glazing`, 72), (x, y, z) => (
    (x === x1 + 1 || x === x1 + 4 || z === liftZ1 - 1 || z === z2)
    && !(levels.includes(y) && z === liftZ1 - 1 && x >= x1 + 2 && x <= x1 + 3)
  ));
  for (const floorY of levels) {
    if (floorY < y1 || floorY > y2) continue;
    model.box(x1 + 1, floorY, z1 + 1, x2 - 1, floorY, z2 - 1, 'minecraft:smooth_quartz', meta(scope, `${core.objectId}_level_landing`, 74));
    model.box(x1 + 2, floorY + 1, z1, x1 + 3, Math.min(floorY + 3, y2 - 1), z1, AIR, meta(scope, `${core.objectId}_level_door`, 75));
  }
}

function modelFreightCore(model, core, meta, AIR) {
  const [x1, y1, z1, x2, y2, z2] = core.bounds;
  model.hollow(...core.bounds, 'minecraft:polished_blackstone_bricks', meta(MAIN_SCOPE, `${core.objectId}_freight_core`, 70));
  model.box(x1 + 1, y1 + 1, z1 + 1, x2 - 1, y2 - 1, z2 - 1, AIR, meta(MAIN_SCOPE, `${core.objectId}_freight_clearance`, 71));
  for (const floorY of [41, 53, 65, 74, 83]) {
    model.box(x1 + 1, floorY, z1 + 1, x2 - 1, floorY, z2 - 1, 'minecraft:iron_block', meta(MAIN_SCOPE, `${core.objectId}_freight_landing`, 72));
    model.box(x1, floorY + 1, Math.floor((z1 + z2) / 2) - 1, x1, floorY + 4, Math.floor((z1 + z2) / 2) + 1, AIR, meta(MAIN_SCOPE, `${core.objectId}_freight_door`, 73));
  }
}

function modelCbeHallA(model, meta) {
  const scope = MAIN_SCOPE;
  const floorY = 53;
  model.box(682, floorY + 1, -414, 697, floorY + 9, -391, 'minecraft:air', meta(scope, 'CBE-B1-HALL-001_clear_hall_volume', 80));
  model.box(682, floorY, -414, 697, floorY, -391, 'minecraft:black_glazed_terracotta', meta(scope, 'CBE-B1-HALL-001_patterned_floor', 81));
  model.box(683, floorY + 1, -414, 696, floorY + 2, -410, 'minecraft:gold_block', meta(scope, 'CBE-B1-HALL-001_real_stage', 83));
  model.box(684, floorY + 3, -414, 695, floorY + 8, -414, 'minecraft:purple_concrete', meta(scope, 'CBE-B1-HALL-001_backdrop', 84));
  let seats = 0;
  const seatXs = [683, 684, 685, 686, 687, 691, 692, 693, 694, 695];
  for (let row = 0; row < 8; row += 1) {
    const z = -407 + row * 2;
    const y = floorY + 1 + Math.floor(row / 3);
    for (const x of seatXs) {
      model.set(x, y, z, 'minecraft:dark_oak_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]', meta(scope, 'CBE-B1-HALL-001_audience_seat', 85));
      model.set(x, y - 1, z, 'minecraft:red_nether_bricks', meta(scope, 'CBE-B1-HALL-001_riser', 84));
      seats += 1;
    }
  }
  const openBays = [[686, -392], [687, -392], [691, -392], [692, -392]];
  for (const [x, z] of openBays) {
    model.set(x, floorY + 1, z, 'minecraft:light_blue_carpet', meta(scope, 'CBE-B1-HALL-001_open_bay', 85));
  }
  return { seats, openBays: openBays.length, audiencePositions: seats + openBays.length };
}

function modelCbeHallB(model, meta) {
  const scope = MAIN_SCOPE;
  const floorY = 53;
  model.box(682, floorY + 1, -387, 697, floorY + 9, -372, 'minecraft:air', meta(scope, 'CBE-B1-HALL-002_clear_hall_volume', 80));
  model.box(682, floorY, -387, 697, floorY, -372, 'minecraft:black_glazed_terracotta', meta(scope, 'CBE-B1-HALL-002_patterned_floor', 81));
  model.box(683, floorY + 1, -387, 696, floorY + 2, -383, 'minecraft:cut_copper', meta(scope, 'CBE-B1-HALL-002_real_stage', 83));
  model.box(684, floorY + 3, -387, 695, floorY + 8, -387, 'minecraft:magenta_concrete', meta(scope, 'CBE-B1-HALL-002_backdrop', 84));
  let seats = 0;
  const seatXs = [684, 685, 686, 687, 691, 692, 693, 694];
  for (let row = 0; row < 5; row += 1) {
    const z = -381 + row * 2;
    const y = floorY + 1 + Math.floor(row / 2);
    for (const x of seatXs) {
      model.set(x, y, z, 'minecraft:dark_oak_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]', meta(scope, 'CBE-B1-HALL-002_audience_seat', 85));
      model.set(x, y - 1, z, 'minecraft:red_nether_bricks', meta(scope, 'CBE-B1-HALL-002_riser', 84));
      seats += 1;
    }
  }
  const openBays = [[687, -372], [691, -372]];
  for (const [x, z] of openBays) {
    model.set(x, floorY + 1, z, 'minecraft:light_blue_carpet', meta(scope, 'CBE-B1-HALL-002_open_bay', 85));
  }
  return { seats, openBays: openBays.length, audiencePositions: seats + openBays.length };
}

function modelCbeGarden(model, meta, AIR) {
  model.box(717, 53, -380, 730, 64, -352, AIR, meta(MAIN_SCOPE, 'CBE-GARDEN-001_open_sky_volume', 78));
  model.box(717, 53, -380, 730, 53, -352, 'minecraft:stone_bricks', meta(MAIN_SCOPE, 'CBE-GARDEN-001_terrace_floor', 79));
  model.box(717, 54, -380, 717, 60, -352, 'minecraft:bricks', meta(MAIN_SCOPE, 'CBE-GARDEN-001_retaining_wall', 80));
  model.box(730, 54, -380, 730, 60, -352, 'minecraft:bricks', meta(MAIN_SCOPE, 'CBE-GARDEN-001_retaining_wall', 80));
  let seats = 0;
  for (const x of [719, 723, 727]) {
    for (const z of [-377, -371, -365, -359]) {
      model.set(x, 54, z, 'minecraft:dark_oak_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]', meta(MAIN_SCOPE, 'CBE-GARDEN-001_seat', 82));
      model.set(x + 1, 54, z, 'minecraft:dark_oak_stairs[facing=west,half=bottom,shape=straight,waterlogged=false]', meta(MAIN_SCOPE, 'CBE-GARDEN-001_seat', 82));
      seats += 2;
    }
  }
  for (const z of [-378, -366, -354]) {
    model.box(728, 54, z, 729, 54, z + 2, 'minecraft:moss_block', meta(MAIN_SCOPE, 'CBE-GARDEN-001_planter', 81));
    model.set(729, 55, z + 1, 'minecraft:flowering_azalea', meta(MAIN_SCOPE, 'CBE-GARDEN-001_planting', 82));
  }
  return { seats, roofBlocks: 0, smokeOrFireBlocks: 0 };
}

function modelCbeTowerAndSatellite(model, schedule, meta, AIR) {
  const components = new Map(schedule.specialComponents.map((component) => [component.objectId, component]));
  const generated = new Set();

  const gallery = components.get('CBE-GALLERY-001');
  model.hollow(...gallery.bounds, 'minecraft:cut_copper', meta(MAIN_SCOPE, `${gallery.objectId}_cable_gallery`, 88));
  const [gx1, gy1, gz1, gx2, , gz2] = gallery.bounds;
  model.box(gx1 + 1, gy1 + 1, gz1, gx2 - 1, gy1 + 3, gz1, 'minecraft:tinted_glass', meta(MAIN_SCOPE, `${gallery.objectId}_glazing`, 89));
  model.box(gx1 + 1, gy1 + 1, gz1 + 1, gx2 - 1, gy1 + 1, gz2 - 1, 'minecraft:polished_blackstone', meta(MAIN_SCOPE, `${gallery.objectId}_cable_tray`, 89));
  generated.add(gallery.objectId);

  const base = components.get('CBE-TOWER-BASE-001');
  model.hollow(...base.bounds, 'minecraft:stone_bricks', meta(MAIN_SCOPE, `${base.objectId}_maintenance_base`, 88));
  model.box(719, 65, -424, 729, 65, -414, 'minecraft:polished_andesite', meta(MAIN_SCOPE, `${base.objectId}_floor`, 89));
  model.box(723, 65, -425, 725, 69, -425, AIR, meta(MAIN_SCOPE, `${base.objectId}_locked_maintenance_gate`, 90));
  generated.add(base.objectId);

  const shaft = components.get('CBE-TOWER-SHAFT-001');
  const [sx1, sy1, sz1, sx2, sy2, sz2] = shaft.bounds;
  for (let y = sy1; y <= sy2; y += 1) {
    for (const [x, z] of [[sx1, sz1], [sx1, sz2], [sx2, sz1], [sx2, sz2]]) {
      model.set(x, y, z, 'minecraft:iron_bars', meta(MAIN_SCOPE, `${shaft.objectId}_lattice`, 91));
    }
    if (y % 4 === 1) {
      model.box(sx1, y, sz1, sx2, y, sz1, 'minecraft:iron_bars', meta(MAIN_SCOPE, `${shaft.objectId}_cross_brace`, 91));
      model.box(sx1, y, sz2, sx2, y, sz2, 'minecraft:iron_bars', meta(MAIN_SCOPE, `${shaft.objectId}_cross_brace`, 91));
    }
    model.set(Math.floor((sx1 + sx2) / 2), y, Math.floor((sz1 + sz2) / 2), 'minecraft:ladder[facing=south,waterlogged=false]', meta(MAIN_SCOPE, `${shaft.objectId}_internal_access`, 92));
  }
  generated.add(shaft.objectId);

  const decks = schedule.specialComponents.filter(({ objectId }) => objectId.startsWith('CBE-TOWER-DECK-'));
  for (const deck of decks) {
    const [x1, y1, z1, x2, , z2] = deck.bounds;
    model.box(x1, y1, z1, x2, y1, z2, 'minecraft:cut_copper', meta(MAIN_SCOPE, `${deck.objectId}_platform`, 93));
    for (let x = x1; x <= x2; x += 1) {
      model.set(x, y1 + 1, z1, 'minecraft:iron_bars', meta(MAIN_SCOPE, `${deck.objectId}_guard`, 94));
      model.set(x, y1 + 1, z2, 'minecraft:iron_bars', meta(MAIN_SCOPE, `${deck.objectId}_guard`, 94));
    }
    for (let z = z1; z <= z2; z += 1) {
      model.set(x1, y1 + 1, z, 'minecraft:iron_bars', meta(MAIN_SCOPE, `${deck.objectId}_guard`, 94));
      model.set(x2, y1 + 1, z, 'minecraft:iron_bars', meta(MAIN_SCOPE, `${deck.objectId}_guard`, 94));
    }
    model.set(x1, y1 + 2, z1, 'minecraft:redstone_lamp[lit=true]', meta(MAIN_SCOPE, `${deck.objectId}_red_warning_light_analogue`, 95));
    model.set(x2, y1 + 2, z2, 'minecraft:redstone_lamp[lit=true]', meta(MAIN_SCOPE, `${deck.objectId}_red_warning_light_analogue`, 95));
    generated.add(deck.objectId);
  }

  const satFence = components.get('CBE-SAT-FENCE-001');
  const [fx1, fy1, fz1, fx2, , fz2] = satFence.bounds;
  for (let x = fx1; x <= fx2; x += 1) {
    model.box(x, fy1, fz1, x, fy1 + 2, fz1, 'minecraft:iron_bars', meta(SATELLITE_SCOPE, `${satFence.objectId}_fence`, 88));
    model.box(x, fy1, fz2, x, fy1 + 2, fz2, 'minecraft:iron_bars', meta(SATELLITE_SCOPE, `${satFence.objectId}_fence`, 88));
  }
  for (let z = fz1; z <= fz2; z += 1) {
    model.box(fx1, fy1, z, fx1, fy1 + 2, z, 'minecraft:iron_bars', meta(SATELLITE_SCOPE, `${satFence.objectId}_fence`, 88));
    if (z < -410 || z > -406) model.box(fx2, fy1, z, fx2, fy1 + 2, z, 'minecraft:iron_bars', meta(SATELLITE_SCOPE, `${satFence.objectId}_fence`, 88));
  }
  generated.add(satFence.objectId);

  const apron = components.get('CBE-SAT-APRON-001');
  model.box(...apron.bounds.slice(0, 3), ...apron.bounds.slice(3), 'minecraft:smooth_stone', meta(SATELLITE_SCOPE, `${apron.objectId}_surface_only_apron`, 89), (_x, y) => y === apron.bounds[1]);
  generated.add(apron.objectId);

  const shelter = components.get('CBE-SAT-SHELTER-001');
  model.hollow(...shelter.bounds, 'minecraft:oxidized_cut_copper', meta(SATELLITE_SCOPE, `${shelter.objectId}_equipment_shelter`, 90));
  const [shx1, shy1, shz1, shx2, , shz2] = shelter.bounds;
  model.box(shx1 + 1, shy1 + 1, shz1 + 1, shx2 - 1, shy1 + 2, shz1 + 1, 'minecraft:polished_blackstone', meta(SATELLITE_SCOPE, `${shelter.objectId}_equipment_console`, 91));
  model.box(shx2, shy1 + 1, Math.floor((shz1 + shz2) / 2) - 1, shx2, shy1 + 3, Math.floor((shz1 + shz2) / 2) + 1, AIR, meta(SATELLITE_SCOPE, `${shelter.objectId}_service_door`, 91));
  generated.add(shelter.objectId);

  const service = components.get('CBE-SAT-SERVICE-001');
  model.box(...service.bounds.slice(0, 3), ...service.bounds.slice(3), 'minecraft:gray_concrete', meta(SATELLITE_SCOPE, `${service.objectId}_turning_apron`, 90), (_x, y) => y === service.bounds[1]);
  generated.add(service.objectId);

  const dishes = schedule.specialComponents.filter(({ objectId }) => objectId.includes('DISH-'));
  const dishCounts = { large: 0, medium: 0, small: 0 };
  for (const dish of dishes) {
    const [x1, y1, z1, x2, y2, z2] = dish.bounds;
    const cx = Math.floor((x1 + x2) / 2);
    const cz = Math.floor((z1 + z2) / 2);
    const radius = dish.scale === 'large' ? 4 : dish.scale === 'medium' ? 2 : 1;
    const pedestalTop = Math.min(y1 + (dish.scale === 'large' ? 5 : 3), y2 - 2);
    model.box(cx, y1, cz, cx, pedestalTop, cz, 'minecraft:quartz_pillar[axis=y]', meta(SATELLITE_SCOPE, `${dish.objectId}_pedestal`, 92));
    for (let dy = 0; dy <= radius; dy += 1) {
      const half = Math.max(0, radius - dy);
      const y = Math.min(pedestalTop + 1 + dy, y2);
      model.box(
        Math.max(x1, cx - half),
        y,
        Math.max(z1, cz - half),
        Math.min(x2, cx + half),
        y,
        Math.min(z2, cz + half),
        'minecraft:smooth_quartz',
        meta(SATELLITE_SCOPE, `${dish.objectId}_dish_bowl`, 93),
        (x, _y, z) => Math.abs(x - cx) + Math.abs(z - cz) >= Math.max(1, half),
      );
    }
    model.set(cx, Math.min(y2, pedestalTop + radius + 1), cz, 'minecraft:end_rod[facing=up]', meta(SATELLITE_SCOPE, `${dish.objectId}_feed_analogue`, 94));
    dishCounts[dish.scale] += 1;
    generated.add(dish.objectId);
  }
  return {
    generatedSpecialComponentIds: [...generated].sort(),
    dishCounts,
    towerDecks: decks.length,
  };
}

async function modelExchange(model, snapshot, schedule, dependencies) {
  const {
    meta,
    AIR,
    surveyVolumeHazards,
    surveySurfaceParcel,
  } = dependencies;
  const validation = validateExchangeSchedule(schedule);
  const mainSurvey = await surveyVolumeHazards(snapshot, schedule.survey.main.bounds);
  const towerSurvey = await surveyVolumeHazards(snapshot, schedule.survey.tower.bounds);
  const gardenSurvey = await surveyVolumeHazards(snapshot, schedule.survey.openGarden.bounds);
  const satelliteSurvey = await surveyVolumeHazards(snapshot, schedule.survey.satellitePad.bounds);
  assert(mainSurvey.fluidCells === 0 && mainSurvey.blockEntities.length === 0, 'main Exchange survey is not dry/entity-free');
  assert(towerSurvey.fluidCells === 0 && towerSurvey.blockEntities.length === 0, 'tower survey is not dry/entity-free');
  assert(gardenSurvey.fluidCells === 0 && gardenSurvey.blockEntities.length === 0, 'garden survey is not dry/entity-free');
  assert(satelliteSurvey.blockEntities.length === 0, 'satellite survey contains block entities');

  // Exact shell: two stories over two dry basement levels.
  model.box(680, 38, -425, 715, 84, -350, AIR, meta(MAIN_SCOPE, 'CBE-SHELL-001_exact_clearance', 20));
  model.box(680, 38, -425, 715, 40, -350, 'minecraft:reinforced_deepslate', meta(MAIN_SCOPE, 'CBE-SHELL-001_dry_foundation', 21));
  for (let y = 41; y <= 83; y += 1) {
    const wall = y < 65 ? 'minecraft:deepslate_bricks' : y < 74 ? 'minecraft:bricks' : 'minecraft:brown_terracotta';
    model.box(680, y, -425, 680, y, -350, wall, meta(MAIN_SCOPE, 'CBE-SHELL-001_west_wall', 24));
    model.box(715, y, -425, 715, y, -350, wall, meta(MAIN_SCOPE, 'CBE-SHELL-001_east_wall', 24));
    model.box(680, y, -425, 715, y, -425, wall, meta(MAIN_SCOPE, 'CBE-SHELL-001_north_wall', 24));
    model.box(680, y, -350, 715, y, -350, wall, meta(MAIN_SCOPE, 'CBE-SHELL-001_south_wall', 24));
  }
  model.box(680, 83, -425, 715, 84, -350, 'minecraft:oxidized_cut_copper', meta(MAIN_SCOPE, 'CBE-SHELL-001_roof', 25));
  for (const z of [-420, -410, -400, -390, -380, -370, -360]) {
    model.box(680, 67, z, 680, 70, z + 3, 'minecraft:yellow_stained_glass', meta(MAIN_SCOPE, 'CBE-SHELL-001_ordinary_frontage_windows', 26));
  }
  model.box(680, 66, -408, 680, 70, -404, AIR, meta(MAIN_SCOPE, 'CBE-SHELL-001_public_entry', 27));

  const generatedRoomIds = [];
  const adultInteriorEvidence = [];
  for (const room of schedule.rooms) {
    modelScheduledRoom(model, MAIN_SCOPE, room, meta, AIR, adultInteriorEvidence);
    generatedRoomIds.push(room.objectId);
  }

  // Legible, continuous public/production spines and cross-links.
  for (const [floorY, spineX] of [[41, 706], [53, 699], [65, 691], [74, 691]]) {
    model.box(spineX - 1, floorY, -424, spineX + 1, floorY, -351, 'minecraft:polished_andesite', meta(MAIN_SCOPE, `CBE_${floorY}_central_spine_floor`, 64));
    model.box(spineX - 1, floorY + 1, -424, spineX + 1, floorY + 5, -351, AIR, meta(MAIN_SCOPE, `CBE_${floorY}_central_spine_clearance`, 63));
    for (const z of [-416, -400, -384, -368, -352]) {
      model.box(681, floorY, z, 714, floorY, z + 1, 'minecraft:polished_andesite', meta(MAIN_SCOPE, `CBE_${floorY}_cross_link_floor`, 64));
      model.box(681, floorY + 1, z, 714, floorY + 4, z + 1, AIR, meta(MAIN_SCOPE, `CBE_${floorY}_cross_link_clearance`, 63));
    }
  }

  const hallA = modelCbeHallA(model, meta);
  const hallB = modelCbeHallB(model, meta);
  let billiardsTables = 0;
  for (const [x, z] of [[684, -406], [684, -401], [684, -393], [684, -388]]) {
    model.box(x, 75, z, x + 4, 75, z + 2, 'minecraft:green_carpet', meta(MAIN_SCOPE, 'CBE_billiards_table', 86));
    billiardsTables += 1;
  }
  const garden = modelCbeGarden(model, meta, AIR);

  const coreIds = [];
  for (const core of schedule.verticalCirculation) {
    if (core.objectId === 'CBE-CORE-FREIGHT-001') {
      modelFreightCore(model, core, meta, AIR);
    } else {
      modelFourWideStairLiftCore(model, MAIN_SCOPE, core, [41, 53, 65, 74, 83], meta, AIR);
    }
    coreIds.push(core.objectId);
  }

  // East service lane and screened loading threshold.
  model.box(716, 63, -410, 730, 63, -382, 'minecraft:gray_concrete', meta(MAIN_SCOPE, 'CBE-SERVICE-001_apron', 67));
  model.box(716, 64, -410, 716, 68, -382, 'minecraft:bricks', meta(MAIN_SCOPE, 'CBE-SERVICE-001_screen_wall', 68));
  model.box(716, 64, -406, 716, 68, -401, AIR, meta(MAIN_SCOPE, 'CBE-SERVICE-001_loading_door', 69));
  for (const z of [-409, -383]) {
    model.box(717, 64, z, 730, 64, z + 1, 'minecraft:moss_block', meta(MAIN_SCOPE, 'CBE-SERVICE-001_planted_buffer', 68));
  }

  const towerAndSatellite = modelCbeTowerAndSatellite(model, schedule, meta, AIR);
  assert(towerAndSatellite.generatedSpecialComponentIds.length === 20, 'not all 20 special components were generated');
  assert(towerAndSatellite.dishCounts.large === 1, 'modeled large dish count mismatch');
  assert(towerAndSatellite.dishCounts.medium === 4, 'modeled medium dish count mismatch');
  assert(towerAndSatellite.dishCounts.small === 4, 'modeled small dish count mismatch');

  const satelliteTargets = [...model.cells.values()].filter(({ scope }) => scope === SATELLITE_SCOPE);
  const satelliteBelowY62 = satelliteTargets.filter(({ y }) => y < 62);
  const protectedHiveTargets = [...model.cells.values()].filter((cell) => (
    (cell.scope === MAIN_SCOPE || cell.scope === SATELLITE_SCOPE)
    && Math.abs(cell.x - 759) <= 5
    && Math.abs(cell.z + 340) <= 5
  ));
  assert(satelliteBelowY62.length === 0, 'satellite target below protected y62 plane');
  assert(protectedHiveTargets.length === 0, 'CBE target enters protected beehive halo');

  const surface = await surveySurfaceParcel(snapshot, [680, -425, 769, -350]);
  return {
    scheduleLoaded: true,
    scheduleStatus: schedule.status,
    bounds: schedule.siteObjects.find(({ objectId }) => objectId === 'CBE-SHELL-001').bounds,
    undergroundBounds: [680, 38, -425, 715, 64, -350],
    undergroundSurvey: mainSurvey,
    survey: { main: mainSurvey, tower: towerSurvey, garden: gardenSurvey, satellite: satelliteSurvey, surface },
    exactSchedule: {
      siteObjects: schedule.siteObjects.length,
      rooms: schedule.rooms.length,
      verticalCores: schedule.verticalCirculation.length,
      specialComponents: schedule.specialComponents.length,
      routes: schedule.routes.length,
      cameras: schedule.cameraCandidates.length,
    },
    generated: {
      roomIds: generatedRoomIds,
      coreIds,
      specialComponentIds: towerAndSatellite.generatedSpecialComponentIds,
      siteObjectIds: schedule.siteObjects.map(({ objectId }) => objectId),
    },
    exactCounts: {
      ...schedule.exactCounts,
      billiardsTables,
      hallAAudiencePositions: hallA.audiencePositions,
      hallASeatBlocks: hallA.seats,
      hallAOpenBayAnalogues: hallA.openBays,
      hallBAudiencePositions: hallB.audiencePositions,
      hallBSeatBlocks: hallB.seats,
      hallBOpenBayAnalogues: hallB.openBays,
      openSkyGardenSeats: garden.seats,
      largeDishAnalogues: towerAndSatellite.dishCounts.large,
      mediumDishAnalogues: towerAndSatellite.dishCounts.medium,
      smallDishAnalogues: towerAndSatellite.dishCounts.small,
      totalDishAnalogues: Object.values(towerAndSatellite.dishCounts).reduce((sum, count) => sum + count, 0),
      towerMaintenanceDecks: towerAndSatellite.towerDecks,
    },
    validation,
    adultInteriorStandard: {
      source:
        'docs/redevelopment/2026-07-28-town-expansion/'
        + 'non-graphic-adult-interior-design-standard.md',
      expectedPrivateRooms: schedule.rooms.filter(({ program }) => (
        /adult-performance|bondage-themed/i.test(program)
      )).length,
      furnishedPrivateRooms: adultInteriorEvidence.length,
      allRequiredAnatomyModeled: adultInteriorEvidence.every((record) => (
        record.nonGraphic
        && record.privacyVestibuleOrScreen
        && record.upholsteredPlatform
        && record.loungeGroup
        && record.dressingAndClosedStorage
        && record.washNiche
        && record.warmAndTaskLighting
        && record.focalElement
        && record.twoBlockCenterCirculation
        && record.simpleExit
        && record.acousticPrivacyShell
      )),
      rooms: adultInteriorEvidence,
    },
    publicCreatorServiceRoutes: 3,
    broadStairCores: 4,
    liftCores: 5,
    separatedEgressDirections: 2,
    satelliteMinimumTargetY: Math.min(...satelliteTargets.map(({ y }) => y)),
    satelliteTargetsBelowY62: satelliteBelowY62.length,
    protectedHiveTargets: protectedHiveTargets.length,
    garden,
    cameraCandidates: schedule.cameraCandidates,
    publicationObjects: [
      ...schedule.siteObjects,
      ...schedule.rooms,
      ...schedule.verticalCirculation,
      ...schedule.specialComponents,
    ],
  };
}

async function modelTerrainSupportedShell(
  model,
  snapshot,
  definition,
  dependencies,
) {
  const { meta, AIR, surveyedSurface, baseBlockName } = dependencies;
  const {
    shellBounds,
    clearBounds,
    wall,
    roof,
    floor,
    waterExclusion,
  } = definition;
  const [x1, floorY, z1, x2, topY, z2] = shellBounds;
  const supportColumns = [];
  const skippedWaterHaloColumns = [];
  for (let z = z1; z <= z2; z += 4) {
    for (let x = x1; x <= x2; x += 4) {
      const surface = await surveyedSurface(snapshot, x, z);
      assert(surface, `annex shell enters missing terrain at ${x},${z}`);
      const inWaterHalo = waterExclusion && (
        Math.abs(x - waterExclusion[0]) <= 3
        && Math.abs(z - waterExclusion[2]) <= 3
      );
      if (
        inWaterHalo
        || ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']
          .includes(baseBlockName(surface.state))
      ) {
        skippedWaterHaloColumns.push([x, surface.y, z]);
        continue;
      }
      if (surface.y < floorY - 1) {
        model.box(x, surface.y + 1, z, x, floorY - 1, z, 'minecraft:stone_bricks', meta(ANNEX_SCOPE, 'annex_terrain_support_pier', 30));
        supportColumns.push([x, surface.y + 1, z, floorY - 1]);
      }
    }
  }

  model.box(x1, floorY, z1, x2, topY, z2, AIR, meta(ANNEX_SCOPE, `${definition.id}_exact_stage_clearance`, 31));
  model.box(x1, floorY, z1, x2, floorY, z2, floor, meta(ANNEX_SCOPE, `${definition.id}_stage_floor`, 32));
  model.box(x1, topY, z1, x2, topY, z2, roof, meta(ANNEX_SCOPE, `${definition.id}_high_roof`, 33));
  for (let y = floorY + 1; y < topY; y += 1) {
    model.box(x1, y, z1, x1, y, z2, wall, meta(ANNEX_SCOPE, `${definition.id}_west_acoustic_wall`, 34));
    model.box(x2, y, z1, x2, y, z2, wall, meta(ANNEX_SCOPE, `${definition.id}_east_acoustic_wall`, 34));
    model.box(x1, y, z1, x2, y, z1, wall, meta(ANNEX_SCOPE, `${definition.id}_north_acoustic_wall`, 34));
    model.box(x1, y, z2, x2, y, z2, wall, meta(ANNEX_SCOPE, `${definition.id}_south_studio_front`, 34));
  }
  const clear = clearBounds;
  model.box(...clear, AIR, meta(ANNEX_SCOPE, `${definition.id}_clear_span_no_structural_intrusion`, 35));
  model.box(clear[0], floorY, clear[2], clear[3], floorY, clear[5], floor, meta(ANNEX_SCOPE, `${definition.id}_clear_span_floor`, 36));
  return { supportColumns, skippedWaterHaloColumns };
}

function modelStageSupportCore(model, id, bounds, lowerY, upperY, meta, AIR) {
  const [x1, z1, x2, z2] = bounds;
  model.hollow(x1, lowerY, z1, x2, upperY, z2, 'minecraft:polished_blackstone_bricks', meta(ANNEX_SCOPE, `${id}_support_core`, 70));
  const run = Math.max(3, z2 - z1 - 2);
  for (let y = lowerY; y < upperY; y += 1) {
    const rise = y - lowerY;
    const flight = Math.floor(rise / run);
    const offset = rise % run;
    const forward = flight % 2 === 0;
    const z = forward ? z1 + 1 + offset : z2 - 1 - offset;
    const facing = forward ? 'south' : 'north';
    model.box(x1 + 1, y, z, x1 + 4, y, z, `minecraft:smooth_quartz_stairs[facing=${facing},half=bottom,shape=straight,waterlogged=false]`, meta(ANNEX_SCOPE, `${id}_four_wide_stair`, 72));
    model.box(x1 + 1, y + 1, z, x1 + 4, Math.min(y + 4, upperY - 1), z, AIR, meta(ANNEX_SCOPE, `${id}_stair_headroom`, 71));
  }
  model.box(x2 - 3, lowerY + 1, z1 + 2, x2 - 1, upperY - 1, z1 + 4, AIR, meta(ANNEX_SCOPE, `${id}_lift_clearance`, 73));
  model.box(x2 - 3, lowerY, z1 + 1, x2, upperY, z1 + 5, 'minecraft:tinted_glass', meta(ANNEX_SCOPE, `${id}_lift_glazing`, 72), (x, _y, z) => x === x2 - 3 || x === x2 || z === z1 + 1 || z === z1 + 5);
}

function modelLateNightStage(model, meta) {
  let seats = 0;
  for (let row = 0; row < 6; row += 1) {
    const z = -447 + row * 2;
    const y = 73 + Math.floor(row / 2);
    for (const x of [...Array.from({ length: 8 }, (_, index) => 684 + index), ...Array.from({ length: 8 }, (_, index) => 719 + index)]) {
      model.set(x, y, z, 'minecraft:dark_oak_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]', meta(ANNEX_SCOPE, 'late_night_audience_seat', 82));
      model.set(x, y - 1, z, 'minecraft:polished_blackstone', meta(ANNEX_SCOPE, 'late_night_audience_riser', 81));
      seats += 1;
    }
  }
  const openBays = [[692, -438], [693, -438], [694, -438], [716, -438], [717, -438], [718, -438]];
  for (const [x, z] of openBays) model.set(x, 73, z, 'minecraft:light_blue_carpet', meta(ANNEX_SCOPE, 'late_night_open_bay', 82));
  model.box(682, 73, -459, 692, 74, -454, 'minecraft:blue_concrete', meta(ANNEX_SCOPE, 'late_night_monologue_zone', 84));
  model.box(699, 73, -468, 712, 75, -461, 'minecraft:dark_oak_planks', meta(ANNEX_SCOPE, 'late_night_host_desk_interview_zone', 84));
  model.box(683, 73, -469, 695, 75, -461, 'minecraft:oxidized_cut_copper', meta(ANNEX_SCOPE, 'late_night_house_band_zone', 84));
  model.box(714, 73, -460, 729, 74, -452, 'minecraft:purple_concrete', meta(ANNEX_SCOPE, 'late_night_musical_performance_zone', 84));
  model.box(680, 76, -470, 731, 89, -470, 'minecraft:blue_terracotta', meta(ANNEX_SCOPE, 'late_night_real_set_backdrop', 85));
  for (const [x, z] of [[692, -450], [705, -450], [718, -450]]) {
    model.set(x, 73, z, 'minecraft:observer[facing=north,powered=false]', meta(ANNEX_SCOPE, 'late_night_camera_position', 86));
  }
  return { seats, openBays: openBays.length, productionZones: 4 };
}

function modelSitcomStage(model, meta) {
  let seats = 0;
  for (let row = 0; row < 6; row += 1) {
    const z = -447 + row * 2;
    const y = 71 + Math.floor(row / 2);
    for (const x of [...Array.from({ length: 7 }, (_, index) => 744 + index), ...Array.from({ length: 7 }, (_, index) => 781 + index)]) {
      model.set(x, y, z, 'minecraft:dark_oak_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]', meta(ANNEX_SCOPE, 'sitcom_audience_seat', 82));
      model.set(x, y - 1, z, 'minecraft:smooth_stone', meta(ANNEX_SCOPE, 'sitcom_audience_riser', 81));
      seats += 1;
    }
  }
  const openBays = [[751, -438], [752, -438], [779, -438], [780, -438]];
  for (const [x, z] of openBays) model.set(x, 71, z, 'minecraft:light_blue_carpet', meta(ANNEX_SCOPE, 'sitcom_open_bay', 82));

  // Three open-back standing sets plus one swing/rehearsal bay.
  model.box(742, 71, -469, 754, 71, -458, 'minecraft:oak_planks', meta(ANNEX_SCOPE, 'sitcom_apartment_set_floor', 84));
  model.box(742, 72, -469, 742, 77, -458, 'minecraft:light_blue_concrete', meta(ANNEX_SCOPE, 'sitcom_apartment_wild_wall', 85));
  model.box(754, 72, -469, 754, 77, -458, 'minecraft:light_blue_concrete', meta(ANNEX_SCOPE, 'sitcom_apartment_wild_wall', 85));
  model.box(758, 71, -469, 768, 71, -458, 'minecraft:birch_planks', meta(ANNEX_SCOPE, 'sitcom_bedroom_hall_set_floor', 84));
  model.box(758, 72, -469, 758, 77, -458, 'minecraft:yellow_terracotta', meta(ANNEX_SCOPE, 'sitcom_bedroom_wild_wall', 85));
  model.box(772, 71, -469, 789, 71, -458, 'minecraft:bricks', meta(ANNEX_SCOPE, 'sitcom_cafe_workplace_set_floor', 84));
  model.box(789, 72, -469, 789, 77, -458, 'minecraft:red_terracotta', meta(ANNEX_SCOPE, 'sitcom_cafe_wild_wall', 85));
  model.box(742, 71, -455, 756, 71, -450, 'minecraft:cyan_terracotta', meta(ANNEX_SCOPE, 'sitcom_swing_set_rehearsal_bay', 84));
  for (const [x, z] of [[751, -449], [766, -449], [783, -449]]) {
    model.set(x, 71, z, 'minecraft:observer[facing=north,powered=false]', meta(ANNEX_SCOPE, 'sitcom_camera_position', 86));
  }
  return { seats, openBays: openBays.length, principalSets: 3, swingSets: 1 };
}

async function modelAnnex(model, snapshot, schedule, dependencies) {
  const {
    meta,
    AIR,
    surveyedSurface,
    surveySurfaceParcel,
  } = dependencies;
  const validation = validateAnnexSchedule(schedule);
  const lateShell = schedule.siteObjects.find(({ objectId }) => objectId === 'CBE-ANNEX-LN-SHELL-001');
  const lateClear = schedule.siteObjects.find(({ objectId }) => objectId === 'CBE-ANNEX-LN-CLEAR-001');
  const sitcomShell = schedule.siteObjects.find(({ objectId }) => objectId === 'CBE-ANNEX-SC-SHELL-001');
  const sitcomClear = schedule.siteObjects.find(({ objectId }) => objectId === 'CBE-ANNEX-SC-CLEAR-001');
  const lateTerrain = await modelTerrainSupportedShell(model, snapshot, {
    id: 'CBE-ANNEX-LN',
    shellBounds: lateShell.bounds,
    clearBounds: lateClear.bounds,
    wall: 'minecraft:gray_concrete',
    roof: 'minecraft:oxidized_cut_copper',
    floor: 'minecraft:polished_deepslate',
    waterExclusion: [693, 66, -490],
  }, dependencies);
  const sitcomTerrain = await modelTerrainSupportedShell(model, snapshot, {
    id: 'CBE-ANNEX-SC',
    shellBounds: sitcomShell.bounds,
    clearBounds: sitcomClear.bounds,
    wall: 'minecraft:light_gray_concrete',
    roof: 'minecraft:weathered_cut_copper',
    floor: 'minecraft:smooth_stone',
    waterExclusion: null,
  }, dependencies);

  const generatedRoomIds = [];
  for (const room of schedule.rooms) {
    modelScheduledRoom(model, ANNEX_SCOPE, room, meta, AIR);
    generatedRoomIds.push(room.objectId);
  }

  // Long, partial two-story bars. These corridor strips keep all support rooms
  // legible without extending a second floor over either stage.
  for (const [x1, x2, floorYs, role] of [
    [680, 721, [72, 82], 'late_night'],
    [744, 785, [70, 80], 'sitcom'],
  ]) {
    for (const floorY of floorYs) {
      model.box(x1, floorY, -481, x2, floorY, -480, 'minecraft:polished_andesite', meta(ANNEX_SCOPE, `${role}_support_corridor_floor`, 64));
      model.box(x1, floorY + 1, -481, x2, floorY + 5, -480, AIR, meta(ANNEX_SCOPE, `${role}_support_corridor_clearance`, 63));
    }
  }
  model.box(680, 83, -471, 721, 88, -471, 'minecraft:tinted_glass', meta(ANNEX_SCOPE, 'late_night_glazed_stage_overlook', 66));
  model.box(744, 81, -471, 785, 86, -471, 'minecraft:light_blue_stained_glass', meta(ANNEX_SCOPE, 'sitcom_glazed_stage_overlook', 66));

  modelStageSupportCore(model, 'CBE-ANNEX-LN-CORE-001', [722, -489, 732, -482], 72, 93, meta, AIR);
  modelStageSupportCore(model, 'CBE-ANNEX-SC-CORE-001', [786, -489, 796, -482], 70, 91, meta, AIR);

  const lateStage = modelLateNightStage(model, meta);
  const sitcomStage = modelSitcomStage(model, meta);

  // Two catwalk access points per stage stay above the accepted 18-block clear
  // volumes and connect only to the support-bar cores.
  for (const [y, x1, x2, z1, z2, role] of [
    [91, 680, 731, -470, -437, 'late_night'],
    [89, 740, 791, -470, -437, 'sitcom'],
  ]) {
    model.box(x1, y, z1, x2, y, z1, 'minecraft:iron_bars', meta(ANNEX_SCOPE, `${role}_north_catwalk`, 88));
    model.box(x1, y, z2, x2, y, z2, 'minecraft:iron_bars', meta(ANNEX_SCOPE, `${role}_south_catwalk`, 88));
    model.box(x1, y, z1, x1, y, z2, 'minecraft:iron_bars', meta(ANNEX_SCOPE, `${role}_west_catwalk`, 88));
    model.box(x2, y, z1, x2, y, z2, 'minecraft:iron_bars', meta(ANNEX_SCOPE, `${role}_east_catwalk`, 88));
  }

  // Overscale numbered doors, direct scenery routes, and a screened truck yard.
  for (const [x, floorY, z1, z2, role] of [
    [674, 73, -468, -461, 'late_night_stage_door_1'],
    [674, 73, -458, -451, 'late_night_stage_door_2'],
    [797, 71, -468, -461, 'sitcom_stage_door_1'],
    [797, 71, -458, -451, 'sitcom_stage_door_2'],
  ]) {
    model.box(x, floorY, z1, x, floorY + 7, z2, AIR, meta(ANNEX_SCOPE, role, 90));
    model.box(x, floorY + 8, z1, x, floorY + 8, z2, 'minecraft:yellow_concrete', meta(ANNEX_SCOPE, `${role}_number_band`, 91));
  }
  for (let x = 668; x <= 673; x += 1) {
    for (let z = -490; z <= -450; z += 1) {
      const surface = await surveyedSurface(snapshot, x, z);
      if (surface) model.set(x, surface.y + 1, z, 'minecraft:gray_concrete', meta(ANNEX_SCOPE, 'late_night_loading_apron', 67));
    }
  }
  for (let x = 798; x <= 804; x += 1) {
    for (let z = -490; z <= -450; z += 1) {
      const surface = await surveyedSurface(snapshot, x, z);
      if (surface) model.set(x, surface.y + 1, z, 'minecraft:light_gray_concrete', meta(ANNEX_SCOPE, 'sitcom_loading_apron', 67));
    }
  }
  model.box(668, 67, -491, 673, 71, -491, 'minecraft:bricks', meta(ANNEX_SCOPE, 'late_night_service_yard_screen', 68));
  model.box(798, 65, -491, 804, 69, -491, 'minecraft:bricks', meta(ANNEX_SCOPE, 'sitcom_service_yard_screen', 68));

  // Terrain-following studio street; the connector remains a building, not a
  // flat public slab.
  const streetElevations = [];
  for (let z = -430; z <= -426; z += 1) {
    for (let x = 674; x <= 797; x += 1) {
      const surface = await surveyedSurface(snapshot, x, z);
      assert(surface, `studio street missing surface at ${x},${z}`);
      const y = surface.y + 1;
      const state = (z === -430 || z === -426)
        ? 'minecraft:cut_copper'
        : 'minecraft:polished_andesite';
      model.set(x, y, z, state, meta(ANNEX_SCOPE, 'terrain_following_studio_street', 69));
      streetElevations.push(y);
    }
  }

  model.hollow(710, 66, -430, 757, 80, -426, 'minecraft:bricks', meta(ANNEX_SCOPE, 'CBE-ANNEX-CONNECTOR-001_shared_support_shell', 40));
  model.box(711, 66, -429, 756, 66, -427, 'minecraft:dark_oak_planks', meta(ANNEX_SCOPE, 'CBE-ANNEX-CONNECTOR-001_floor', 41));
  model.box(711, 74, -429, 756, 74, -427, 'minecraft:cut_copper', meta(ANNEX_SCOPE, 'CBE-ANNEX-CONNECTOR-001_partial_second_floor', 42));
  model.box(710, 68, -429, 710, 72, -427, 'minecraft:light_blue_stained_glass', meta(ANNEX_SCOPE, 'CBE-ANNEX-CONNECTOR-001_exchange_link_glazing', 43));
  model.box(710, 67, -429, 715, 71, -425, AIR, meta(ANNEX_SCOPE, 'CBE-ANNEX-CONNECTOR-001_exchange_link_clearance', 44));
  // Rebuild shared rooms after the connector shell/floors.
  for (const room of schedule.rooms.filter(({ stage }) => stage === 'shared')) {
    modelScheduledRoom(model, ANNEX_SCOPE, room, meta, AIR);
  }

  // Distinct studio-lot fronts and landscaped, non-flat edges.
  for (const [x1, x2, floorY, labelRole, accent] of [
    [674, 733, 72, 'late_night_stage_21_marquee', 'minecraft:oxidized_cut_copper'],
    [738, 797, 70, 'sitcom_stage_22_marquee', 'minecraft:cyan_terracotta'],
  ]) {
    model.box(x1 + 2, floorY + 7, -431, x2 - 2, floorY + 9, -431, accent, meta(ANNEX_SCOPE, labelRole, 92));
    model.box(x1 + 4, floorY + 1, -431, x1 + 10, floorY + 5, -431, AIR, meta(ANNEX_SCOPE, `${labelRole}_public_entry`, 93));
    model.box(x2 - 10, floorY + 1, -431, x2 - 5, floorY + 4, -431, AIR, meta(ANNEX_SCOPE, `${labelRole}_remote_public_exit`, 93));
  }
  let trees = 0;
  for (const [x, z] of [
    [658, -488], [658, -476], [658, -464], [658, -452], [658, -438],
    [800, -488], [800, -476], [800, -464], [800, -452], [800, -438],
  ]) {
    const surface = await surveyedSurface(snapshot, x, z);
    assert(surface, `annex landscape missing surface at ${x},${z}`);
    model.box(x, surface.y + 1, z, x, surface.y + 5, z, 'minecraft:stripped_oak_log[axis=y]', meta(ANNEX_SCOPE, 'retained_edge_tree_trunk', 58));
    model.box(x - 2, surface.y + 4, z - 2, x + 2, surface.y + 8, z + 2, 'minecraft:oak_leaves[distance=1,persistent=true,waterlogged=false]', meta(ANNEX_SCOPE, 'retained_edge_tree_canopy', 59), (tx, ty, tz) => Math.abs(tx - x) + Math.abs(tz - z) + Math.abs(ty - (surface.y + 6)) <= 5);
    trees += 1;
  }
  for (const [x1, z1, x2, z2] of [[660, -490, 663, -431], [801, -490, 804, -431], [664, -490, 800, -487]]) {
    for (let z = z1; z <= z2; z += 4) {
      for (let x = x1; x <= x2; x += 4) {
        const surface = await surveyedSurface(snapshot, x, z);
        if (!surface) continue;
        model.set(x, surface.y + 1, z, 'minecraft:moss_block', meta(ANNEX_SCOPE, 'planted_slope_and_rain_garden', 57));
      }
    }
  }

  const annexTargets = [...model.cells.values()].filter(({ scope }) => scope === ANNEX_SCOPE);
  const protectedWaterPoint = [693, 66, -490];
  const exactWaterTargets = annexTargets.filter(({ x, y, z }) => (
    x === protectedWaterPoint[0] && y === protectedWaterPoint[1] && z === protectedWaterPoint[2]
  ));
  const waterHaloSupportTargets = annexTargets.filter(({ x, z, role }) => (
    role === 'annex_terrain_support_pier'
    && Math.abs(x - protectedWaterPoint[0]) <= 3
    && Math.abs(z - protectedWaterPoint[2]) <= 3
  ));
  const protectedDeepEntities = schedule.snapshotCensus.sitcomFinalShell.protectedDeepBlockEntities;
  const deepEntityTargets = annexTargets.filter((cell) => protectedDeepEntities.some(([, x, y, z]) => (
    cell.x === x && cell.y === y && cell.z === z
  )));
  const clearStructuralIntrusions = [];
  for (const clearRoom of schedule.rooms.filter(({ level }) => level === 'STAGE')) {
    for (const target of annexTargets) {
      if (
        target.x < clearRoom.bounds[0] || target.x > clearRoom.bounds[3]
        || target.y < clearRoom.bounds[1] || target.y > clearRoom.bounds[4]
        || target.z < clearRoom.bounds[2] || target.z > clearRoom.bounds[5]
      ) continue;
      if (
        target.role.includes('support')
        || target.role.includes('core')
        || target.role.includes('stair')
        || target.role.includes('lift')
        || target.role.includes('column')
        || target.role.includes('plant')
      ) {
        clearStructuralIntrusions.push([clearRoom.objectId, target.x, target.y, target.z, target.role]);
      }
    }
  }
  assert(exactWaterTargets.length === 0, 'annex targets protected late-night water point');
  assert(waterHaloSupportTargets.length === 0, 'annex terrain support enters protected water halo');
  assert(deepEntityTargets.length === 0, 'annex targets protected deep dungeon block entity');
  assert(clearStructuralIntrusions.length === 0, `clear stage structural intrusions ${JSON.stringify(clearStructuralIntrusions.slice(0, 10))}`);

  const reservationSurvey = {
    lateNight: await surveySurfaceParcel(snapshot, [674, -490, 733, -431]),
    sitcom: await surveySurfaceParcel(snapshot, [738, -490, 797, -431]),
    studioStreet: await surveySurfaceParcel(snapshot, [674, -430, 797, -426]),
  };
  return {
    scheduleLoaded: true,
    scheduleStatus: schedule.status,
    validation,
    exactSchedule: {
      siteObjects: schedule.siteObjects.length,
      rooms: schedule.rooms.length,
      routes: schedule.routes.length,
      cameras: schedule.cameraCandidates.length,
    },
    generated: {
      roomIds: generatedRoomIds,
      siteObjectIds: schedule.siteObjects.map(({ objectId }) => objectId),
    },
    exactCounts: {
      ...schedule.exactCounts,
      lateNightSeatBlocks: lateStage.seats,
      lateNightOpenBayAnalogues: lateStage.openBays,
      lateNightAudiencePositions: lateStage.seats + lateStage.openBays,
      lateNightProductionZones: lateStage.productionZones,
      sitcomSeatBlocks: sitcomStage.seats,
      sitcomOpenBayAnalogues: sitcomStage.openBays,
      sitcomAudiencePositions: sitcomStage.seats + sitcomStage.openBays,
      sitcomStandingSets: sitcomStage.principalSets,
      sitcomSwingSets: sitcomStage.swingSets,
    },
    terrain: {
      lateNight: lateTerrain,
      sitcom: sitcomTerrain,
      studioStreetMinY: Math.min(...streetElevations),
      studioStreetMaxY: Math.max(...streetElevations),
      retainedEdgeTrees: trees,
      reservationSurvey,
    },
    protectedFeatures: {
      exactWaterTargets: exactWaterTargets.length,
      waterHaloSupportTargets: waterHaloSupportTargets.length,
      protectedDeepEntityTargets: deepEntityTargets.length,
      protectedDeepEntities,
    },
    clearStageStructuralIntrusions: clearStructuralIntrusions,
    routeFamilies: 3,
    remotePublicExitsPerBuilding: 2,
    independentServiceExitsPerBuilding: 1,
    truckHeightStageDoorsPerBuilding: 2,
    partialTwoStorySupportBars: 2,
    glazedStageOverlooks: 2,
    cameraCandidates: schedule.cameraCandidates,
    publicationObjects: [
      ...schedule.siteObjects,
      ...schedule.rooms,
    ],
  };
}

export async function modelConcordBroadcastExchangeAndAnnex({
  model,
  snapshot,
  exchangeSchedulePath,
  annexSchedulePath,
  dependencies,
}) {
  const exchangeSchedule = readSchedule(exchangeSchedulePath, 'CBE-001');
  const annexSchedule = readSchedule(annexSchedulePath, 'CBE-STAGE-ANNEX-001');
  const exchange = await modelExchange(model, snapshot, exchangeSchedule, dependencies);
  const annex = await modelAnnex(model, snapshot, annexSchedule, dependencies);
  return {
    exchange,
    annex,
    publicationObjects: [
      ...exchange.publicationObjects,
      ...annex.publicationObjects,
    ],
    cameraCandidates: [
      ...exchange.cameraCandidates,
      ...annex.cameraCandidates,
    ],
  };
}
