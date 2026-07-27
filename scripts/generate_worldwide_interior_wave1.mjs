#!/usr/bin/env node
/**
 * Wave 1: repair the objectively missing vertical circulation in Raven Rock,
 * Westlight District, and the Ravensgate campanile, then give those structures
 * real room programs and purpose-specific fixtures.
 *
 * Generation is offline-only. Every output mutation is a one-cell REPL guarded
 * by the exact block name in the source snapshot.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import process from 'process';

import { AnvilSnapshot } from './generate_picket_fence.mjs';

const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const regions = value(
  '--regions',
  'data/worldsnap-worldwide-interior-review-20260727/region',
);
const output = value(
  '--out',
  'data/buildops/worldwide-interior-wave1-2026-07-27.txt',
);
const reportPath = value(
  '--report',
  'data/world-review/worldwide-interior-wave1-design-2026-07-27.json',
);

const snapshot = new AnvilSnapshot(regions);
const cache = new Map();
const operations = new Map();
const commands = [];
const skippedOccupied = [];

const AIR = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
]);
const CLEARABLE = new Set([
  ...AIR,
  'minecraft:polished_andesite',
  'minecraft:spruce_planks',
  'minecraft:iron_bars',
  'minecraft:light_gray_concrete',
  'minecraft:gray_concrete',
  'minecraft:smooth_stone',
  'minecraft:stone_bricks',
  'minecraft:deepslate_tiles',
  'minecraft:polished_deepslate',
  'minecraft:white_concrete',
  'minecraft:calcite',
]);

function snapshotHash(directory) {
  const hash = crypto.createHash('sha256');
  for (const filename of fs.readdirSync(directory).filter((name) => name.endsWith('.mca')).sort()) {
    hash.update(filename);
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(directory, filename)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function key(x, y, z) {
  return `${x},${y},${z}`;
}

async function blockAt(x, y, z) {
  const cellKey = key(x, y, z);
  if (cache.has(cellKey)) return cache.get(cellKey);
  const column = await snapshot.readColumn(x, z, y, y);
  if (!column) throw new Error(`snapshot is missing column ${x},${z}`);
  const block = column.get(y);
  cache.set(cellKey, block);
  return block;
}

async function repl(x, y, z, replacement, phase, allowed = null) {
  const cellKey = key(x, y, z);
  const existing = operations.get(cellKey);
  if (existing) {
    if (existing.replacement !== replacement) {
      throw new Error(
        `conflicting replacements at ${cellKey}: ${existing.replacement} vs ${replacement}`,
      );
    }
    return false;
  }
  const current = await blockAt(x, y, z);
  if (current === replacement || current.split('[', 1)[0] === replacement.split('[', 1)[0]) {
    return false;
  }
  if (allowed && !allowed.has(current)) {
    throw new Error(
      `${phase} refuses ${current} at ${cellKey}; allowed ${[...allowed].join(', ')}`,
    );
  }
  operations.set(cellKey, {
    x,
    y,
    z,
    current,
    replacement,
    phase,
  });
  return true;
}

async function placeIfAir(x, y, z, block, phase) {
  const current = await blockAt(x, y, z);
  if (!AIR.has(current)) {
    skippedOccupied.push({ x, y, z, current, desired: block, phase });
    return false;
  }
  return repl(x, y, z, block, phase, AIR);
}

async function clearForRoute(x, y, z, phase) {
  const current = await blockAt(x, y, z);
  if (AIR.has(current)) return false;
  return repl(x, y, z, 'minecraft:air', phase, CLEARABLE);
}

async function flight({
  xs,
  bottomSupport,
  topSupport,
  bottomZ,
  direction,
  block,
  phase,
}) {
  if (topSupport - bottomSupport !== 5) {
    throw new Error(`${phase} only supports five-block floor intervals`);
  }
  const dz = direction === 'north' ? -1 : 1;
  const facing = direction;
  for (let step = 1; step <= 5; step += 1) {
    const y = bottomSupport + step;
    const z = bottomZ + dz * (step - 1);
    for (const x of xs) {
      await repl(
        x,
        y,
        z,
        `${block}[facing=${facing},half=bottom,shape=straight,waterlogged=false]`,
        phase,
        CLEARABLE,
      );
      await clearForRoute(x, y + 1, z, `${phase}-headroom`);
      await clearForRoute(x, y + 2, z, `${phase}-headroom`);
    }
  }
}

async function partitionZ({
  x1,
  x2,
  z,
  floorSupport,
  height = 3,
  arches = [],
  block = 'minecraft:light_gray_concrete',
  phase,
}) {
  const open = new Set(arches.flatMap((x) => [x, x + 1]));
  for (let x = x1; x <= x2; x += 1) {
    for (let y = floorSupport + 1; y <= floorSupport + height; y += 1) {
      if (open.has(x)) continue;
      await placeIfAir(x, y, z, block, phase);
    }
  }
}

async function shelfRun(x1, x2, y, z, block, phase) {
  for (let x = x1; x <= x2; x += 1) {
    await placeIfAir(x, y, z, block, phase);
  }
}

async function table(x, y, z, wood, phase) {
  await placeIfAir(x, y, z, `minecraft:${wood}_fence`, phase);
  await placeIfAir(x, y + 1, z, `minecraft:${wood}_pressure_plate`, phase);
  await placeIfAir(
    x - 1,
    y,
    z,
    `minecraft:${wood}_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]`,
    phase,
  );
  await placeIfAir(
    x + 1,
    y,
    z,
    `minecraft:${wood}_stairs[facing=west,half=bottom,shape=straight,waterlogged=false]`,
    phase,
  );
}

async function bedPair(x, y, z, color, facing, phase) {
  const vectors = {
    north: [0, -1],
    south: [0, 1],
    east: [1, 0],
    west: [-1, 0],
  };
  const [dx, dz] = vectors[facing];
  await placeIfAir(
    x,
    y,
    z,
    `minecraft:${color}_bed[facing=${facing},part=foot,occupied=false]`,
    phase,
  );
  await placeIfAir(
    x + dx,
    y,
    z + dz,
    `minecraft:${color}_bed[facing=${facing},part=head,occupied=false]`,
    phase,
  );
}

async function light(x, y, z, phase) {
  await placeIfAir(x, y, z, 'minecraft:sea_lantern', phase);
}

async function addRavenRockBuilding({
  id,
  bounds,
  finishFloors,
  flights,
  crossWalls,
  furnish,
}) {
  for (const spec of flights) {
    await flight({
      ...spec,
      block: 'minecraft:polished_deepslate_stairs',
      phase: `${id}-stair-${spec.bottomSupport}-${spec.topSupport}`,
    });
  }
  for (const floorSupport of finishFloors) {
    for (const wall of crossWalls) {
      await partitionZ({
        x1: bounds.x1 + 2,
        x2: bounds.x2 - 2,
        z: wall.z,
        floorSupport,
        arches: wall.arches,
        block: wall.block ?? 'minecraft:light_gray_concrete',
        phase: `${id}-floor-${floorSupport}-partitions`,
      });
    }
    await furnish(floorSupport);
  }
}

// ---------------------------------------------------------------- Raven Rock
await addRavenRockBuilding({
  id: 'RR-B1',
  bounds: { x1: -50, x2: -10, z1: -32, z2: 2 },
  finishFloors: [-7, -2, 3],
  flights: [
    { xs: [-47, -46], bottomSupport: -7, topSupport: -2, bottomZ: -10, direction: 'north' },
    { xs: [-43, -42], bottomSupport: -2, topSupport: 3, bottomZ: -14, direction: 'south' },
  ],
  crossWalls: [
    { z: -22, arches: [-41, -21] },
    { z: -8, arches: [-41, -21] },
  ],
  furnish: async (floor) => {
    const y = floor + 1;
    await shelfRun(-48, -44, y, -30, 'minecraft:bookshelf', 'RR-B1-map-archive');
    await shelfRun(-18, -14, y, -30, 'minecraft:chiseled_bookshelf', 'RR-B1-briefing-archive');
    await table(-38, y, -26, 'dark_oak', 'RR-B1-command-table');
    await table(-22, y, -26, 'dark_oak', 'RR-B1-briefing-table');
    await table(-38, y, -4, 'spruce', 'RR-B1-office-table');
    await placeIfAir(-14, y, -5, 'minecraft:cartography_table', 'RR-B1-map-station');
    await placeIfAir(-15, y, -5, 'minecraft:lectern', 'RR-B1-briefing-lectern');
    await light(-40, floor + 4, -15, 'RR-B1-circulation-light');
    await light(-20, floor + 4, -15, 'RR-B1-circulation-light');
  },
});

await addRavenRockBuilding({
  id: 'RR-B2',
  bounds: { x1: 22, x2: 54, z1: -30, z2: 0 },
  finishFloors: [-7, -2, 3],
  flights: [
    { xs: [25, 26], bottomSupport: -7, topSupport: -2, bottomZ: -8, direction: 'north' },
    { xs: [29, 30], bottomSupport: -2, topSupport: 3, bottomZ: -12, direction: 'south' },
  ],
  crossWalls: [
    { z: -20, arches: [30, 45] },
    { z: -8, arches: [25, 30, 45] },
  ],
  furnish: async (floor) => {
    const y = floor + 1;
    await shelfRun(24, 28, y, -28, 'minecraft:copper_block', 'RR-B2-equipment-frames');
    await shelfRun(47, 51, y, -28, 'minecraft:chiseled_bookshelf', 'RR-B2-message-archive');
    for (const x of [34, 37, 40, 43]) {
      await placeIfAir(x, y, -24, 'minecraft:lightning_rod', 'RR-B2-radio-bay');
      await placeIfAir(x, y, -23, 'minecraft:note_block', 'RR-B2-radio-bay');
    }
    await table(32, y, -4, 'dark_oak', 'RR-B2-technical-control');
    await table(46, y, -4, 'dark_oak', 'RR-B2-message-center');
    await light(30, floor + 4, -15, 'RR-B2-circulation-light');
    await light(46, floor + 4, -15, 'RR-B2-circulation-light');
  },
});

await addRavenRockBuilding({
  id: 'RR-B3',
  bounds: { x1: -18, x2: 18, z1: 85, z2: 115 },
  finishFloors: [-5, 0, 5],
  flights: [
    { xs: [-15, -14], bottomSupport: -5, topSupport: 0, bottomZ: 108, direction: 'north' },
    { xs: [-11, -10], bottomSupport: 0, topSupport: 5, bottomZ: 104, direction: 'south' },
  ],
  crossWalls: [
    { z: 94, arches: [-10, 8], block: 'minecraft:white_terracotta' },
    { z: 106, arches: [-15, -11, 8], block: 'minecraft:white_terracotta' },
  ],
  furnish: async (floor) => {
    const y = floor + 1;
    if (floor === -5) {
      for (const x of [-12, -6, 6, 12]) await table(x, y, 90, 'oak', 'RR-B3-dining-hall');
      await shelfRun(8, 14, y, 112, 'minecraft:barrel', 'RR-B3-kitchen-stores');
      await placeIfAir(6, y, 112, 'minecraft:smoker', 'RR-B3-galley');
      await placeIfAir(7, y, 112, 'minecraft:furnace', 'RR-B3-galley');
    } else if (floor === 0) {
      for (const x of [-12, -6, 6, 12]) {
        await bedPair(x, y, 90, 'light_gray', 'south', 'RR-B3-dormitories');
      }
      await shelfRun(7, 13, y, 112, 'minecraft:bookshelf', 'RR-B3-dayroom');
      await table(10, y, 109, 'oak', 'RR-B3-dayroom');
    } else {
      await bedPair(-12, y, 90, 'white', 'south', 'RR-B3-infirmary');
      await bedPair(-6, y, 90, 'white', 'south', 'RR-B3-infirmary');
      await placeIfAir(8, y, 90, 'minecraft:brewing_stand', 'RR-B3-pharmacy');
      await placeIfAir(9, y, 90, 'minecraft:chest', 'RR-B3-pharmacy');
      await shelfRun(8, 14, y, 112, 'minecraft:white_wool', 'RR-B3-laundry');
    }
    await light(-8, floor + 4, 100, 'RR-B3-circulation-light');
    await light(8, floor + 4, 100, 'RR-B3-circulation-light');
  },
});

await addRavenRockBuilding({
  id: 'RR-B4',
  bounds: { x1: -170, x2: -130, z1: -24, z2: 4 },
  finishFloors: [-13, -8],
  flights: [
    { xs: [-167, -166], bottomSupport: -13, topSupport: -8, bottomZ: -4, direction: 'north' },
  ],
  crossWalls: [
    { z: -15, arches: [-160, -140], block: 'minecraft:gray_concrete' },
    { z: -5, arches: [-167, -160, -140], block: 'minecraft:gray_concrete' },
  ],
  furnish: async (floor) => {
    const y = floor + 1;
    for (const x of [-162, -156, -144, -138]) {
      await placeIfAir(x, y, -20, 'minecraft:copper_block', 'RR-B4-generator-hall');
      await placeIfAir(x, y + 1, -20, 'minecraft:lightning_rod', 'RR-B4-generator-hall');
    }
    await shelfRun(-162, -156, y, 1, 'minecraft:barrel', 'RR-B4-fuel-switchgear');
    await shelfRun(-144, -138, y, 1, 'minecraft:iron_block', 'RR-B4-ventilation');
    await placeIfAir(-152, y, -10, 'minecraft:stonecutter', 'RR-B4-workshop');
    await placeIfAir(-148, y, -10, 'minecraft:smithing_table', 'RR-B4-workshop');
    await light(-160, floor + 4, -10, 'RR-B4-circulation-light');
    await light(-140, floor + 4, -10, 'RR-B4-circulation-light');
  },
});

// A two-wide switchback tower inside the existing RR-Z5 9x9 bore.
const shaftLandings = [];
for (let y = -11; y <= 64; y += 5) shaftLandings.push(y);
for (let index = 0; index < shaftLandings.length - 1; index += 1) {
  const floor = shaftLandings[index];
  const next = shaftLandings[index + 1];
  const westFlight = index % 2 === 0;
  const northbound = index % 2 === 0;
  const xs = westFlight ? [197, 198] : [202, 203];
  const bottomZ = northbound ? -13 : -17;
  await flight({
    xs,
    bottomSupport: floor,
    topSupport: next,
    bottomZ,
    direction: northbound ? 'north' : 'south',
    block: 'minecraft:polished_deepslate_stairs',
    phase: `RR-Z5-flight-${floor}-${next}`,
  });
  const landingZ = northbound ? -17 : -13;
  for (let x = 197; x <= 203; x += 1) {
    if (!operations.has(key(x, next, landingZ))) {
      await repl(
        x,
        next,
        landingZ,
        'minecraft:polished_deepslate',
        `RR-Z5-landing-${next}`,
        CLEARABLE,
      );
    }
    await clearForRoute(x, next + 1, landingZ, `RR-Z5-landing-${next}-headroom`);
    await clearForRoute(x, next + 2, landingZ, `RR-Z5-landing-${next}-headroom`);
  }
}
for (let y = -11; y <= 64; y += 1) {
  const current = await blockAt(204, y, -15);
  if (current === 'minecraft:ladder') {
    await repl(204, y, -15, 'minecraft:air', 'RR-Z5-ladder-retirement', new Set([current]));
  }
}
// Tie the upper west landing into the existing surface headhouse. The original
// ladder used the east wall; the new switchback terminates at the west landing,
// where an iron-bar panel and one unsupported threshold cell otherwise leave a
// three-block gap between the stairs and the exterior door.
await repl(
  195,
  65,
  -17,
  'minecraft:air',
  'RR-Z5-surface-threshold',
  new Set(['minecraft:iron_bars']),
);
await repl(
  196,
  64,
  -17,
  'minecraft:polished_deepslate',
  'RR-Z5-surface-threshold',
  AIR,
);
await clearForRoute(196, 65, -17, 'RR-Z5-surface-threshold-headroom');
await clearForRoute(196, 66, -17, 'RR-Z5-surface-threshold-headroom');
await placeIfAir(
  201,
  65,
  -12,
  'minecraft:spruce_wall_sign[facing=south,waterlogged=false]',
  'RR-Z5-wayfinding',
);
commands.push(
  'execute if block 201 65 -12 minecraft:spruce_wall_sign[facing=south,waterlogged=false] '
  + 'run data merge block 201 65 -12 {front_text:{color:"black",has_glowing_text:1b,'
  + 'messages:[\'{"text":"RAVEN ROCK"}\',\'{"text":"STAIRS"}\',\'{"text":"CAVERNS"}\',\'{"text":"DOWN"}\']}}',
);

// --------------------------------------------------------- Ravensgate bell stair
const spiral = [
  [-109, -429, 'east'],
  [-108, -429, 'east'],
  [-107, -429, 'south'],
  [-107, -430, 'south'],
  [-107, -431, 'west'],
  [-108, -431, 'west'],
  [-109, -431, 'north'],
  [-109, -430, 'north'],
];
for (let y = 68; y <= 98; y += 1) {
  const [x, z, facing] = spiral[(y - 68) % spiral.length];
  await repl(
    x,
    y,
    z,
    `minecraft:polished_deepslate_stairs[facing=${facing},half=bottom,shape=straight,waterlogged=false]`,
    'RG-BELL-spiral-stair',
    CLEARABLE,
  );
  await clearForRoute(x, y + 1, z, 'RG-BELL-spiral-headroom');
  await clearForRoute(x, y + 2, z, 'RG-BELL-spiral-headroom');
}

// ----------------------------------------------------- Westlight District stairs
const westlightFlights = [
  { id: 'WD-GATEHEAD', xs: [-332, -331], z: -482, bottom: 67, top: 72, direction: 'north' },
  { id: 'WD-SHOP-A', xs: [-402, -401], z: -456, bottom: 67, top: 72, direction: 'north' },
  { id: 'WD-SHOP-B', xs: [-394, -393], z: -456, bottom: 67, top: 72, direction: 'north' },
  { id: 'WD-SHOP-C', xs: [-387, -386], z: -456, bottom: 67, top: 72, direction: 'north' },
  { id: 'WD-SHOP-D', xs: [-380, -379], z: -456, bottom: 67, top: 72, direction: 'north' },
  { id: 'WD-SHOP-E', xs: [-371, -370], z: -456, bottom: 67, top: 72, direction: 'north' },
  { id: 'WD-SHOP-F', xs: [-363, -362], z: -456, bottom: 67, top: 72, direction: 'north' },
  { id: 'WD-SHOP-G', xs: [-356, -355], z: -456, bottom: 67, top: 72, direction: 'north' },
  { id: 'WD-BREW', xs: [-350, -349], z: -454, bottom: 67, top: 72, direction: 'north' },
  { id: 'WD-INN-1', xs: [-425, -424], z: -474, bottom: 67, top: 72, direction: 'north' },
  { id: 'WD-INN-2', xs: [-421, -420], z: -478, bottom: 72, top: 77, direction: 'south' },
];
for (const spec of westlightFlights) {
  await flight({
    xs: spec.xs,
    bottomSupport: spec.bottom,
    topSupport: spec.top,
    bottomZ: spec.z,
    direction: spec.direction,
    block: spec.id.startsWith('WD-INN')
      ? 'minecraft:quartz_stairs'
      : 'minecraft:spruce_stairs',
    phase: `${spec.id}-stair`,
  });
}

// High Street: ground-floor shop plus furnished upper apartment in every plot.
const shops = [
  { id: 'A', x1: -404, x2: -397, trade: 'cartography_table', theme: 'blue' },
  { id: 'B', x1: -396, x2: -390, trade: 'stonecutter', theme: 'gray' },
  { id: 'C', x1: -389, x2: -383, trade: 'loom', theme: 'magenta' },
  { id: 'D', x1: -382, x2: -377, trade: 'smithing_table', theme: 'red' },
  { id: 'E', x1: -373, x2: -366, trade: 'barrel', theme: 'green' },
  { id: 'F', x1: -365, x2: -359, trade: 'fletching_table', theme: 'lime' },
  { id: 'G', x1: -358, x2: -353, trade: 'crafting_table', theme: 'yellow' },
];
for (const shop of shops) {
  const mid = Math.floor((shop.x1 + shop.x2) / 2);
  const y = 68;
  await placeIfAir(shop.x2 - 1, y, -463, `minecraft:${shop.trade}`, `WD-SHOP-${shop.id}-trade`);
  await shelfRun(shop.x1 + 1, shop.x2 - 1, y, -449, 'minecraft:barrel', `WD-SHOP-${shop.id}-stock`);
  await placeIfAir(mid, y, -466, `minecraft:${shop.theme}_carpet`, `WD-SHOP-${shop.id}-rug`);
  await bedPair(shop.x2 - 2, 73, -451, shop.theme, 'south', `WD-SHOP-${shop.id}-apartment`);
  await placeIfAir(shop.x1 + 1, 73, -451, 'minecraft:chest', `WD-SHOP-${shop.id}-apartment`);
  await placeIfAir(shop.x1 + 1, 73, -454, 'minecraft:bookshelf', `WD-SHOP-${shop.id}-apartment`);
  await placeIfAir(mid, 73, -463, `minecraft:${shop.theme}_carpet`, `WD-SHOP-${shop.id}-apartment`);
  await light(mid, 76, -460, `WD-SHOP-${shop.id}-upper-light`);
}

// Gatehead: visitor reception below, district office and map room above.
await partitionZ({
  x1: -333,
  x2: -321,
  z: -484,
  floorSupport: 67,
  arches: [-332, -328],
  block: 'minecraft:calcite',
  phase: 'WD-GATEHEAD-ground-plan',
});
await table(-325, 68, -488, 'dark_oak', 'WD-GATEHEAD-reception');
await shelfRun(-329, -324, 68, -477, 'minecraft:bookshelf', 'WD-GATEHEAD-map-library');
await table(-325, 73, -488, 'dark_oak', 'WD-GATEHEAD-upper-office');
await shelfRun(-329, -324, 73, -477, 'minecraft:chiseled_bookshelf', 'WD-GATEHEAD-upper-office');

// Brew-barn: working cellar/show bar below, music and private tasting above.
for (const x of [-346, -340, -334]) {
  await placeIfAir(x, 68, -464, 'minecraft:barrel', 'WD-BREW-taproom');
  await placeIfAir(x, 68, -460, 'minecraft:brewing_stand', 'WD-BREW-taproom');
  await placeIfAir(x, 73, -462, 'minecraft:note_block', 'WD-BREW-music-loft');
}
await table(-338, 73, -450, 'dark_oak', 'WD-BREW-tasting-loft');
await shelfRun(-345, -339, 73, -447, 'minecraft:barrel', 'WD-BREW-upper-stock');

// Beacon Inn: lobby/taproom, guest floor, and owner/library floor.
await partitionZ({
  x1: -427,
  x2: -409,
  z: -482,
  floorSupport: 67,
  arches: [-420, -412],
  block: 'minecraft:white_concrete',
  phase: 'WD-INN-ground-plan',
});
await partitionZ({
  x1: -427,
  x2: -409,
  z: -482,
  floorSupport: 72,
  arches: [-420, -412],
  block: 'minecraft:white_concrete',
  phase: 'WD-INN-guest-plan',
});
await partitionZ({
  x1: -427,
  x2: -409,
  z: -482,
  floorSupport: 77,
  arches: [-420, -412],
  block: 'minecraft:white_concrete',
  phase: 'WD-INN-owner-plan',
});
for (const x of [-424, -418, -412]) {
  await table(x, 68, -488, 'dark_oak', 'WD-INN-taproom');
}
await shelfRun(-426, -421, 68, -466, 'minecraft:barrel', 'WD-INN-kitchen');
await placeIfAir(-420, 68, -466, 'minecraft:smoker', 'WD-INN-kitchen');
for (const x of [-424, -417, -411]) {
  await bedPair(x, 73, -488, 'white', 'south', 'WD-INN-guest-rooms');
  await placeIfAir(x, 73, -470, 'minecraft:chest', 'WD-INN-guest-rooms');
}
await bedPair(-424, 78, -488, 'blue', 'south', 'WD-INN-owner-suite');
await shelfRun(-418, -411, 78, -466, 'minecraft:bookshelf', 'WD-INN-library');
await table(-414, 78, -470, 'dark_oak', 'WD-INN-library');
for (const floor of [67, 72, 77]) {
  await light(-418, floor + 4, -480, 'WD-INN-hall-light');
}

const digest = snapshotHash(regions);
const sorted = [...operations.values()].sort((a, b) => (
  a.phase.localeCompare(b.phase)
  || a.y - b.y
  || a.z - b.z
  || a.x - b.x
));
const lines = [
  '# GENERATED FILE — worldwide interior enhancement wave 1',
  '# Raven Rock floor plans/stairs; RR-Z5 stair tower; Ravensgate campanile;',
  '# Westlight District stairs, shops, inn, and brew-barn',
  `# snapshot: ${digest}`,
  '# every REPL is a one-cell source-snapshot guard',
  '',
];
let previousPhase = null;
for (const operation of sorted) {
  if (operation.phase !== previousPhase) {
    lines.push(`# phase: ${operation.phase}`);
    previousPhase = operation.phase;
  }
  lines.push(
    `REPL ${operation.x} ${operation.y} ${operation.z} `
    + `${operation.x} ${operation.y} ${operation.z} `
    + `${operation.current} ${operation.replacement}`,
  );
}
if (commands.length) {
  lines.push('', '# guarded sign text');
  for (const command of commands) lines.push(`CMD ${command}`);
}
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${lines.join('\n')}\n`);

const byPhase = {};
for (const operation of sorted) byPhase[operation.phase] = (byPhase[operation.phase] ?? 0) + 1;
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourceSnapshot: { directory: regions, sha256: digest },
  output,
  operations: sorted.length,
  commands: commands.length,
  skippedOccupied,
  byPhase,
  acceptance: [
    'all four Raven Rock buildings connect every occupied floor in both directions',
    'RR-Z5 surface-to-cavern route passes without ladders',
    'Ravensgate bell chamber is reachable by stairs',
    'Gatehead, seven High Street shops, Beacon Inn, and brew-barn upper floors are reachable',
    'room programs remain enclosed, lit, and purpose-furnished',
  ],
};
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  output,
  report: reportPath,
  sourceSnapshot: report.sourceSnapshot,
  operations: report.operations,
  commands: report.commands,
  skippedOccupied: report.skippedOccupied.length,
  phases: Object.keys(report.byPhase).length,
}, null, 2));
