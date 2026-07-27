#!/usr/bin/env node
/**
 * MainStreet secure-complex detail Wave 5.
 *
 * Fresh-design overlay for the parking-side C01 bunker, roof observatory,
 * concealed penthouse, private fallout shelter, and three-level grand vault.
 * Every changed cell is guarded against the exact Wave 4 Anvil state. The
 * script is offline-only: it emits RCON operations and a machine-readable
 * design report; it never connects to the game server.
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
  'data/worldsnap-worldwide-wave4-post-20260727/region',
);
const output = value(
  '--out',
  'data/buildops/mainstreet-secure-complex-detail-wave5-2026-07-27.txt',
);
const reportPath = value(
  '--report',
  'data/world-review/mainstreet-secure-complex-detail-wave5-design-2026-07-27.json',
);

const snapshot = new AnvilSnapshot(regions);
const cache = new Map();
const operations = new Map();
const protectedCells = new Set();
const phases = new Map();
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);

const key = (x, y, z) => `${x},${y},${z}`;
const baseName = (block) => block.split('[', 1)[0];

async function sourceBlockAt(x, y, z) {
  const cellKey = key(x, y, z);
  if (cache.has(cellKey)) return cache.get(cellKey);
  const column = await snapshot.readColumn(x, z, y, y);
  if (!column) throw new Error(`snapshot is missing column ${x},${z}`);
  const block = column.get(y);
  cache.set(cellKey, block);
  return block;
}

async function projectedBlockAt(x, y, z) {
  return operations.get(key(x, y, z))?.replacement ?? sourceBlockAt(x, y, z);
}

function protect(x, y, z) {
  protectedCells.add(key(x, y, z));
}

async function replace(x, y, z, replacement, phase, note = null) {
  const cellKey = key(x, y, z);
  if (protectedCells.has(cellKey)) {
    throw new Error(`attempt to overwrite protected cell ${cellKey} in ${phase}`);
  }
  const prior = operations.get(cellKey);
  if (prior) {
    if (prior.replacement === replacement) return false;
    if (prior.phase === phase) {
      operations.set(cellKey, { ...prior, replacement, note });
      return true;
    }
    // Structural clearing followed by a final fixture at the same cell is one
    // guarded replacement from the original state, not two live commands.
    if (AIR.has(baseName(prior.replacement)) && !AIR.has(baseName(replacement))) {
      operations.set(cellKey, { ...prior, replacement, phase, note });
      return true;
    }
    if (!AIR.has(baseName(prior.replacement)) && AIR.has(baseName(replacement))) {
      operations.set(cellKey, { ...prior, replacement, phase, note });
      return true;
    }
    throw new Error(
      `conflicting replacements at ${cellKey}: ${prior.replacement} -> ${replacement}`,
    );
  }
  const current = await sourceBlockAt(x, y, z);
  if (current === replacement) return false;
  if (!replacement.includes('[') && baseName(current) === replacement) return false;
  operations.set(cellKey, {
    x,
    y,
    z,
    current,
    replacement,
    phase,
    note,
  });
  phases.set(phase, (phases.get(phase) ?? 0) + 1);
  return true;
}

async function box(x1, y1, z1, x2, y2, z2, block, phase, note = null) {
  for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) {
    for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z += 1) {
      for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
        await replace(x, y, z, block, phase, note);
      }
    }
  }
}

async function clearBox(x1, y1, z1, x2, y2, z2, phase, note = null) {
  await box(x1, y1, z1, x2, y2, z2, 'minecraft:air', phase, note);
}

async function putIfAir(x, y, z, block, phase, note = null) {
  if (!AIR.has(baseName(await projectedBlockAt(x, y, z)))) return false;
  return replace(x, y, z, block, phase, note);
}

async function putIfFloor(x, y, z, block, phase, note = null) {
  const feet = baseName(await projectedBlockAt(x, y, z));
  const head = baseName(await projectedBlockAt(x, y + 1, z));
  const support = baseName(await projectedBlockAt(x, y - 1, z));
  if (!AIR.has(feet) || !AIR.has(head) || AIR.has(support) || FLUID.has(support)) {
    return false;
  }
  return replace(x, y, z, block, phase, note);
}

async function actualBed(x, y, z, facing, color, phase) {
  const vectors = {
    north: [0, -1],
    south: [0, 1],
    east: [1, 0],
    west: [-1, 0],
  };
  const [dx, dz] = vectors[facing];
  await replace(
    x,
    y,
    z,
    `minecraft:${color}_bed[facing=${facing},occupied=false,part=foot]`,
    phase,
    'actual-bed-foot',
  );
  await replace(
    x + dx,
    y,
    z + dz,
    `minecraft:${color}_bed[facing=${facing},occupied=false,part=head]`,
    phase,
    'actual-bed-head',
  );
}

function stairFacing(from, to) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  if (Math.abs(dx) >= Math.abs(dz)) return dx > 0 ? 'east' : 'west';
  return dz > 0 ? 'south' : 'north';
}

async function stairCourse(points, startY, widthVector, block, phase) {
  for (let index = 0; index < points.length; index += 1) {
    const [x, z] = points[index];
    const y = startY + index;
    const target = points[Math.min(index + 1, points.length - 1)];
    const facing = index === points.length - 1
      ? stairFacing(points[Math.max(0, index - 1)], points[index])
      : stairFacing(points[index], target);
    for (const [wx, wz] of [[0, 0], widthVector]) {
      await replace(
        x + wx,
        y,
        z + wz,
        `${block}[facing=${facing},half=bottom,shape=straight,waterlogged=false]`,
        phase,
        'two-wide-stair',
      );
      await clearBox(
        x + wx,
        y + 1,
        z + wz,
        x + wx,
        y + 3,
        z + wz,
        phase,
        'stair-headroom',
      );
    }
  }
}

// Loaded inventories are immutable boundaries for this overlay.
for (const y of [45, 56, 67]) {
  for (const x of [233, 238, 255]) protect(x, y, 220);
}
for (const x of [150, 154, 158]) protect(x, 82, 178);

// ── OBSERVATORY: proper public program, instruments, and lens assemblies ──
// A five-room plan replaces the former three mostly empty boxes:
// public foyer, planetarium, instrument archive, and west/east telescope labs.
const obs = '01-observatory-program';

// Central program partitions. Existing west/east portals remain generous.
await box(197, 121, 145, 215, 124, 145, 'minecraft:smooth_quartz', obs, 'archive-partition');
await clearBox(203, 121, 145, 209, 124, 145, obs, 'archive-portal');
await box(197, 121, 156, 215, 124, 156, 'minecraft:smooth_quartz', obs, 'foyer-partition');
await clearBox(203, 121, 156, 209, 124, 156, obs, 'foyer-portal');

// Public foyer/exhibit hall.
await box(198, 121, 163, 214, 121, 164, 'minecraft:red_carpet', obs, 'foyer-carpet');
await box(202, 121, 158, 210, 121, 160, 'minecraft:quartz_slab[type=top,waterlogged=false]', obs, 'reception-desk');
await box(204, 122, 158, 208, 123, 158, 'minecraft:cyan_stained_glass', obs, 'reception-display');
for (const x of [199, 213]) {
  await replace(x, 121, 160, 'minecraft:dark_oak_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]', obs, 'foyer-seat');
  await replace(x, 121, 162, 'minecraft:dark_oak_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]', obs, 'foyer-seat');
}
for (const x of [198, 201, 211, 214]) {
  await replace(x, 122, 165, 'minecraft:cartography_table', obs, 'astronomy-exhibit');
}

// Planetarium: dark star ceiling, concentric seating, and central projector.
await box(198, 125, 146, 214, 125, 155, 'minecraft:black_concrete', obs, 'planetarium-ceiling');
for (const [x, z] of [
  [199, 147], [203, 147], [209, 147], [213, 147],
  [201, 150], [211, 150], [199, 154], [205, 154], [213, 154],
]) {
  await replace(x, 125, z, 'minecraft:sea_lantern', obs, 'star-ceiling');
}
for (const [x, z, facing] of [
  [199, 148, 'east'], [199, 151, 'east'], [199, 154, 'east'],
  [213, 148, 'west'], [213, 151, 'west'], [213, 154, 'west'],
  [203, 154, 'north'], [209, 154, 'north'],
]) {
  await replace(
    x,
    121,
    z,
    `minecraft:dark_oak_stairs[facing=${facing},half=bottom,shape=straight,waterlogged=false]`,
    obs,
    'planetarium-seat',
  );
}
await box(204, 121, 149, 208, 121, 153, 'minecraft:polished_blackstone', obs, 'projector-dais');
await box(205, 122, 150, 207, 123, 152, 'minecraft:polished_blackstone_bricks', obs, 'projector');
await replace(206, 124, 151, 'minecraft:beacon', obs, 'projector-optic');

// North archive/instrument lab.
for (const z of [138, 142]) {
  await box(198, 121, z, 202, 123, z, 'minecraft:chiseled_bookshelf', obs, 'archive-stack');
  await box(210, 121, z, 214, 123, z, 'minecraft:bookshelf', obs, 'archive-stack');
}
await box(204, 121, 139, 208, 121, 142, 'minecraft:dark_oak_slab[type=top,waterlogged=false]', obs, 'instrument-table');
await replace(205, 122, 140, 'minecraft:cartography_table', obs, 'instrument-console');
await replace(207, 122, 140, 'minecraft:daylight_detector[inverted=false,power=0]', obs, 'solar-instrument');
await replace(206, 124, 140, 'minecraft:sea_lantern', obs, 'archive-light');

// West research telescope room and east solar/optics laboratory.
for (const [minX, maxX, label] of [[185, 195, 'west'], [217, 227, 'east']]) {
  await box(minX, 121, 138, minX + 2, 123, 138, 'minecraft:bookshelf', obs, `${label}-archive`);
  const controlMinX = label === 'east' ? 226 : maxX - 2;
  await box(controlMinX, 121, 138, maxX, 122, 140, 'minecraft:polished_blackstone', obs, `${label}-control-rack`);
  await box(minX + 1, 121, 159, maxX - 1, 121, 161, 'minecraft:dark_oak_slab[type=top,waterlogged=false]', obs, `${label}-research-bench`);
  for (const x of [minX + 2, maxX - 2]) {
    await replace(x, 121, 163, 'minecraft:dark_oak_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]', obs, `${label}-visitor-seat`);
  }
  for (const [x, z] of [[minX + 1, 143], [maxX - 1, 157]]) {
    await replace(x, 125, z, 'minecraft:sea_lantern', obs, `${label}-task-light`);
  }
}

// The old roof was solid beneath every dome. Open genuine circular bearing
// wells and preserve a copper ring around each aperture.
for (const { id, cx, cz, radius } of [
  { id: 'west', cx: 190, cz: 151, radius: 4 },
  { id: 'central', cx: 206, cz: 151, radius: 8 },
  { id: 'east', cx: 222, cz: 151, radius: 4 },
]) {
  for (let dz = -(radius + 1); dz <= radius + 1; dz += 1) {
    for (let dx = -(radius + 1); dx <= radius + 1; dx += 1) {
      const distance = Math.sqrt(dx * dx + dz * dz);
      if (distance <= radius) {
        await replace(cx + dx, 126, cz + dz, 'minecraft:air', obs, `${id}-roof-aperture`);
      } else if (distance <= radius + 1) {
        await replace(cx + dx, 126, cz + dz, 'minecraft:cut_copper', obs, `${id}-bearing-ring`);
      }
    }
  }
}

// Three legible instruments rise into the three copper domes. Each receives a
// mount, optical tube, aperture ring, and gemstone/glass cap lens.
const instruments = [
  { id: 'west', cx: 190, cz: 151, roofY: 126, capY: 133, axis: 'east' },
  { id: 'central', cx: 206, cz: 151, roofY: 126, capY: 136, axis: 'up' },
  { id: 'east', cx: 222, cz: 151, roofY: 126, capY: 133, axis: 'west' },
];
for (const instrument of instruments) {
  const { id, cx, cz, roofY, capY, axis } = instrument;
  await box(cx - 1, 121, cz - 1, cx + 1, 121, cz + 1, 'minecraft:polished_blackstone', obs, `${id}-telescope-mount`);
  await box(cx - 1, 122, cz - 1, cx + 1, 124, cz + 1, 'minecraft:copper_block', obs, `${id}-telescope-yoke`);
  await clearBox(cx, 125, cz, cx, capY, cz, obs, `${id}-optical-axis-clearance`);
  await box(cx, 125, cz, cx, capY - 2, cz, 'minecraft:lightning_rod[facing=up,waterlogged=false]', obs, `${id}-optical-tube`);
  await replace(cx, capY - 1, cz, 'minecraft:tinted_glass', obs, `${id}-lens-housing`);
  await replace(cx, capY, cz, 'minecraft:amethyst_block', obs, `${id}-objective-lens`);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    await replace(cx + dx, capY - 1, cz + dz, 'minecraft:exposed_copper', obs, `${id}-aperture-ring`);
  }
  if (axis !== 'up') {
    const dx = axis === 'east' ? 1 : -1;
    for (let offset = 2; offset <= 5; offset += 1) {
      await replace(cx + dx * offset, 124 + Math.floor(offset / 3), cz, 'minecraft:copper_block', obs, `${id}-angled-optical-tube`);
    }
    await replace(cx + dx * 6, 126, cz, 'minecraft:tinted_glass', obs, `${id}-secondary-lens`);
  }
}

// North-facing shutter slots and the three audited objective lenses give each
// instrument a real sightline through its dome instead of terminating under
// decorative copper.
for (const lens of [
  { id: 'west', cx: 190, cz: 151, radius: 6, lens: [190, 130, 145] },
  { id: 'central', cx: 206, cz: 151, radius: 10, lens: [206, 132, 143] },
  { id: 'east', cx: 222, cz: 151, radius: 6, lens: [222, 130, 145] },
]) {
  const [lensX, lensY, lensZ] = lens.lens;
  for (let y = 127; y <= lensY + 1; y += 1) {
    for (let z = lens.cz - lens.radius; z <= lens.cz - 1; z += 1) {
      for (let x = lens.cx - 1; x <= lens.cx + 1; x += 1) {
        await replace(x, y, z, 'minecraft:air', obs, `${lens.id}-north-shutter`);
      }
    }
  }
  for (let offset = 0; offset <= lens.cz - lensZ; offset += 1) {
    const z = lens.cz - offset;
    const y = 124 + Math.round((lensY - 124) * offset / (lens.cz - lensZ));
    await replace(lens.cx, y, z, 'minecraft:copper_block', obs, `${lens.id}-inclined-tube`);
  }
  await replace(lensX, lensY, lensZ, 'minecraft:tinted_glass', obs, `${lens.id}-objective-face`);
  await replace(lensX, lensY, lensZ + 1, 'minecraft:amethyst_block', obs, `${lens.id}-focus-core`);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    await replace(lensX + dx, lensY + dy, lensZ, 'minecraft:exposed_copper', obs, `${lens.id}-objective-bezel`);
  }
}

// ── REAL PUBLIC STAIR: hangar floor to observatory terrace ──────────────
// The original scaffold tower remains a service lift. This separate glass and
// copper switchback is the primary, two-wide, human-readable public route.
const publicStair = '02-observatory-public-stair';
await clearBox(165, 99, 152, 174, 122, 165, publicStair, 'stair-tower-interior');
await box(164, 98, 151, 175, 98, 166, 'minecraft:polished_deepslate', publicStair, 'stair-foundation');
await box(164, 99, 151, 164, 122, 166, 'minecraft:light_blue_stained_glass', publicStair, 'west-curtain-wall');
await box(175, 99, 151, 175, 122, 166, 'minecraft:light_blue_stained_glass', publicStair, 'east-curtain-wall');
await box(165, 99, 151, 174, 122, 151, 'minecraft:light_blue_stained_glass', publicStair, 'north-curtain-wall');
await box(165, 99, 166, 174, 122, 166, 'minecraft:light_blue_stained_glass', publicStair, 'south-curtain-wall');
for (const [x, z] of [[164, 151], [175, 151], [164, 166], [175, 166]]) {
  await box(x, 99, z, x, 122, z, 'minecraft:cut_copper', publicStair, 'copper-mullion');
}
await box(164, 123, 151, 175, 123, 166, 'minecraft:smooth_quartz', publicStair, 'stair-roof');

// Hangar entry, top terrace exit, and connecting walks.
await clearBox(175, 99, 162, 176, 102, 164, publicStair, 'hangar-entry');
await box(173, 98, 162, 177, 98, 164, 'minecraft:polished_andesite', publicStair, 'hangar-entry-floor');
await clearBox(175, 121, 153, 176, 123, 155, publicStair, 'terrace-exit');
await box(172, 120, 153, 184, 120, 155, 'minecraft:smooth_quartz', publicStair, 'terrace-landing');

const flight1 = [[172, 163], [171, 163], [170, 163], [169, 163], [168, 163], [167, 163]];
const flight2 = [[167, 159], [168, 159], [169, 159], [170, 159], [171, 159], [172, 159]];
const flight3 = [[172, 155], [171, 155], [170, 155], [169, 155], [168, 155], [167, 155]];
const flight4 = [[167, 153], [168, 153], [169, 153], [170, 153], [171, 153]];
await stairCourse(flight1, 98, [0, 1], 'minecraft:smooth_quartz_stairs', publicStair);
await box(165, 103, 159, 167, 103, 164, 'minecraft:smooth_quartz', publicStair, 'landing-one');
await stairCourse(flight2, 104, [0, 1], 'minecraft:smooth_quartz_stairs', publicStair);
await box(172, 109, 155, 174, 109, 160, 'minecraft:smooth_quartz', publicStair, 'landing-two');
await stairCourse(flight3, 110, [0, 1], 'minecraft:smooth_quartz_stairs', publicStair);
await box(165, 115, 153, 167, 115, 156, 'minecraft:smooth_quartz', publicStair, 'landing-three');
await stairCourse(flight4, 116, [0, 1], 'minecraft:smooth_quartz_stairs', publicStair);
for (const [x, y, z] of [[166, 106, 162], [173, 112, 158], [166, 118, 154]]) {
  await replace(x, y, z, 'minecraft:sea_lantern', publicStair, 'stair-light');
}

// Retire the former 22-block public scaffold after authoring the real stair.
// Its former penthouse and terrace penetrations become solid floor plates.
for (let y = 99; y <= 120; y += 1) {
  const replacement = y === 105
    ? 'minecraft:dark_oak_planks'
    : y === 114
      ? 'minecraft:gray_concrete'
      : y === 120
        ? 'minecraft:smooth_quartz'
        : 'minecraft:air';
  await replace(183, y, 161, replacement, publicStair, 'retired-public-scaffold');
}

// ── HIDDEN OBSERVATORY-TO-PENTHOUSE STAIR ──────────────────────────────
// A compact three-flight switchback makes the penthouse a genuinely separate,
// secret suite off the observatory rather than an extension of the public
// office. It occupies the audited east-side envelope, away from both the
// public stair and the library.
const hiddenStair = '03-hidden-observatory-penthouse-stair';
await clearBox(219, 106, 140, 224, 123, 148, hiddenStair, 'hidden-core-clearance');
await box(218, 106, 139, 218, 123, 149, 'minecraft:polished_deepslate', hiddenStair, 'hidden-core-wall');
await box(225, 106, 139, 225, 123, 149, 'minecraft:polished_deepslate', hiddenStair, 'hidden-core-wall');
await box(219, 106, 139, 224, 123, 139, 'minecraft:polished_deepslate', hiddenStair, 'hidden-core-wall');
await box(219, 106, 149, 224, 123, 149, 'minecraft:polished_deepslate', hiddenStair, 'hidden-core-wall');
await stairCourse(
  [[219, 147], [220, 147], [221, 147], [222, 147], [223, 147], [224, 147]],
  105,
  [0, 1],
  'minecraft:dark_oak_stairs',
  hiddenStair,
);
await box(223, 110, 144, 224, 110, 146, 'minecraft:dark_oak_planks', hiddenStair, 'private-landing-one');
await stairCourse(
  [[224, 144], [223, 144], [222, 144], [221, 144], [220, 144]],
  111,
  [0, 1],
  'minecraft:dark_oak_stairs',
  hiddenStair,
);
await box(219, 115, 141, 220, 115, 145, 'minecraft:dark_oak_planks', hiddenStair, 'private-landing-two');
await stairCourse(
  [[219, 144], [219, 143], [219, 142], [219, 141], [219, 140]],
  116,
  [1, 0],
  'minecraft:dark_oak_stairs',
  hiddenStair,
);
for (const [x, y, z] of [[224, 108, 146], [220, 113, 144], [220, 118, 141]]) {
  await replace(x, y, z, 'minecraft:sea_lantern', hiddenStair, 'concealed-stair-light');
}
await box(217, 105, 146, 219, 105, 148, 'minecraft:dark_oak_planks', hiddenStair, 'penthouse-private-landing');
await clearBox(217, 106, 147, 219, 108, 147, hiddenStair, 'penthouse-secret-entry');
await replace(217, 106, 147, 'minecraft:dark_oak_door[facing=east,half=lower,hinge=left,open=true,powered=false]', hiddenStair, 'penthouse-secret-door');
await replace(217, 107, 147, 'minecraft:dark_oak_door[facing=east,half=upper,hinge=left,open=true,powered=false]', hiddenStair, 'penthouse-secret-door');
await box(217, 120, 140, 219, 120, 144, 'minecraft:smooth_quartz', hiddenStair, 'observatory-private-landing');
await clearBox(217, 121, 142, 219, 123, 142, hiddenStair, 'observatory-secret-exit');
await replace(217, 121, 142, 'minecraft:dark_oak_door[facing=east,half=lower,hinge=left,open=true,powered=false]', hiddenStair, 'observatory-secret-door');
await replace(217, 122, 142, 'minecraft:dark_oak_door[facing=east,half=upper,hinge=left,open=true,powered=false]', hiddenStair, 'observatory-secret-door');
await box(217, 121, 139, 217, 123, 141, 'minecraft:chiseled_bookshelf', hiddenStair, 'concealed-observatory-cabinet');
await box(217, 121, 143, 217, 123, 145, 'minecraft:chiseled_bookshelf', hiddenStair, 'concealed-observatory-cabinet');

// ── POSH PENTHOUSE FIT-OUT ──────────────────────────────────────────────
const apartment = '04-penthouse-luxury-fitout';

// Private library becomes a paneled salon with fireplace, reading niches, and
// a proper drinks/record cabinet while retaining dense book storage.
await box(179, 106, 140, 179, 111, 149, 'minecraft:chiseled_bookshelf', apartment, 'library-west-stack');
await box(180, 106, 140, 193, 108, 140, 'minecraft:bookshelf', apartment, 'library-north-stack');
await box(188, 106, 149, 193, 109, 149, 'minecraft:bookshelf', apartment, 'library-south-stack');
await box(180, 106, 145, 180, 109, 148, 'minecraft:polished_blackstone_bricks', apartment, 'library-fireplace');
await replace(181, 106, 146, 'minecraft:campfire[facing=north,lit=true,signal_fire=false,waterlogged=false]', apartment, 'library-fire');
await box(182, 106, 145, 189, 106, 146, 'minecraft:dark_oak_slab[type=top,waterlogged=false]', apartment, 'library-reading-table');
for (const [x, z, facing] of [[183, 143, 'south'], [187, 143, 'south'], [190, 147, 'north']]) {
  await replace(x, 106, z, `minecraft:dark_oak_stairs[facing=${facing},half=bottom,shape=straight,waterlogged=false]`, apartment, 'library-lounge-chair');
}
await replace(192, 106, 147, 'minecraft:jukebox', apartment, 'library-record-player');
await replace(191, 106, 147, 'minecraft:barrel', apartment, 'library-minibar');

// Keep the 12-display battlestation but make it read as a command suite.
await box(195, 106, 142, 206, 106, 144, 'minecraft:dark_oak_slab[type=top,waterlogged=false]', apartment, 'command-console');
for (const x of [197, 201, 205]) {
  await replace(x, 106, 145, 'minecraft:dark_oak_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]', apartment, 'command-chair');
}
await box(195, 106, 147, 202, 106, 148, 'minecraft:blue_carpet', apartment, 'command-map-zone');
await replace(196, 106, 148, 'minecraft:cartography_table', apartment, 'command-map-table');
await replace(199, 106, 148, 'minecraft:lodestone', apartment, 'command-navigation-core');
await replace(202, 106, 148, 'minecraft:ender_chest[facing=north,waterlogged=false]', apartment, 'command-secure-archive');

// Remove the fake carpeted bed platform. This west room becomes a dressing
// lounge; the actual primary bedroom moves into a private east wing, safely
// away from both public circulation and the old scaffold/lightwell.
await clearBox(180, 106, 152, 188, 108, 159, apartment, 'fake-bed-platform-removal');
await box(180, 106, 152, 188, 106, 159, 'minecraft:dark_oak_planks', apartment, 'dressing-lounge-floor');
await box(180, 106, 160, 188, 108, 162, 'minecraft:dark_oak_planks', apartment, 'wardrobe-wall');
await replace(181, 106, 161, 'minecraft:loom[facing=north]', apartment, 'dressing-station');
await replace(187, 106, 161, 'minecraft:smithing_table', apartment, 'valet-station');
await replace(182, 106, 155, 'minecraft:dark_oak_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]', apartment, 'dressing-chaise');
await replace(186, 106, 155, 'minecraft:dark_oak_stairs[facing=west,half=bottom,shape=straight,waterlogged=false]', apartment, 'dressing-chaise');
await replace(184, 106, 157, 'minecraft:note_block', apartment, 'dressing-music');

// New private east wing: one primary bedroom plus a distinct living salon and
// dining kitchen. The public dispatch office remains outside this envelope.
// The primary C01 stair owns x204..216,z152..164; the bedroom deliberately
// begins at x217 so public and private vertical circulation never overlap.
await box(217, 105, 152, 225, 105, 166, 'minecraft:dark_oak_planks', apartment, 'bedroom-wing-floor');
await box(208, 105, 167, 225, 105, 180, 'minecraft:dark_oak_planks', apartment, 'salon-wing-floor');
await box(217, 114, 152, 225, 114, 166, 'minecraft:gray_concrete', apartment, 'bedroom-wing-ceiling');
await box(208, 114, 167, 225, 114, 180, 'minecraft:gray_concrete', apartment, 'salon-wing-ceiling');
await box(217, 106, 152, 225, 113, 152, 'minecraft:gray_concrete', apartment, 'east-wing-wall');
await box(208, 106, 180, 225, 113, 180, 'minecraft:gray_concrete', apartment, 'east-wing-wall');
await box(208, 106, 167, 208, 113, 179, 'minecraft:gray_concrete', apartment, 'east-wing-wall');
await box(225, 106, 153, 225, 113, 179, 'minecraft:gray_concrete', apartment, 'east-wing-wall');
await clearBox(217, 106, 153, 224, 113, 165, apartment, 'bedroom-wing-interior');
await clearBox(209, 106, 167, 224, 113, 179, apartment, 'salon-wing-interior');
await box(217, 106, 166, 224, 113, 166, 'minecraft:smooth_quartz', apartment, 'bedroom-salon-partition');
await clearBox(220, 106, 166, 222, 108, 166, apartment, 'bedroom-salon-doorway');
await clearBox(217, 106, 149, 219, 109, 152, apartment, 'private-stair-bedroom-entry');
await clearBox(207, 106, 169, 208, 109, 172, apartment, 'spa-salon-connection');
await box(225, 106, 153, 225, 111, 165, 'minecraft:tinted_glass', apartment, 'private-hangar-overlook');

// Proper double bed, upholstered seating, vanity, and cabinet-scale storage.
await box(218, 106, 154, 224, 106, 161, 'minecraft:white_carpet', apartment, 'bedroom-rug');
await actualBed(220, 107, 155, 'south', 'white', apartment);
await actualBed(221, 107, 155, 'south', 'white', apartment);
for (const x of [218, 223]) {
  await replace(x, 107, 156, 'minecraft:barrel', apartment, 'bedside-table');
  await replace(x, 108, 156, 'minecraft:flower_pot', apartment, 'bedside-decor');
}
await box(218, 106, 163, 221, 108, 165, 'minecraft:dark_oak_planks', apartment, 'bedroom-wardrobe');
await replace(224, 106, 160, 'minecraft:dark_oak_stairs[facing=west,half=bottom,shape=straight,waterlogged=false]', apartment, 'bedroom-chair');
await replace(224, 106, 163, 'minecraft:cartography_table', apartment, 'bedroom-writing-desk');
for (const [x, z] of [[218, 154], [224, 154], [218, 164], [224, 164]]) {
  await replace(x, 113, z, 'minecraft:sea_lantern', apartment, 'bedroom-light');
}

// Living salon on the west half, dining kitchen on the east half.
await box(209, 106, 168, 216, 106, 178, 'minecraft:blue_carpet', apartment, 'salon-rug');
for (const [x, z, facing] of [
  [210, 170, 'east'], [210, 175, 'east'], [215, 170, 'west'], [215, 175, 'west'],
]) {
  await replace(x, 106, z, `minecraft:dark_oak_stairs[facing=${facing},half=bottom,shape=straight,waterlogged=false]`, apartment, 'salon-seat');
}
await replace(213, 106, 173, 'minecraft:jukebox', apartment, 'salon-music');
await box(218, 106, 168, 224, 106, 171, 'minecraft:smooth_quartz_slab[type=top,waterlogged=false]', apartment, 'kitchen-counter');
for (const [x, block] of [
  [218, 'minecraft:smoker[facing=south,lit=false]'],
  [220, 'minecraft:crafting_table'],
  [222, 'minecraft:cauldron'],
  [224, 'minecraft:barrel'],
]) {
  await replace(x, 107, 169, block, apartment, 'kitchen-appliance');
}
await box(218, 106, 174, 223, 106, 177, 'minecraft:dark_oak_slab[type=top,waterlogged=false]', apartment, 'dining-table');
for (const [x, z, facing] of [[219, 173, 'south'], [222, 173, 'south'], [219, 178, 'north'], [222, 178, 'north']]) {
  await replace(x, 106, z, `minecraft:dark_oak_stairs[facing=${facing},half=bottom,shape=straight,waterlogged=false]`, apartment, 'dining-chair');
}

// Marble spa: double vanity, sanitation, towel storage, and lounge details.
for (const x of [192, 196]) {
  await replace(x, 107, 179, 'minecraft:smooth_quartz_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]', apartment, 'spa-vanity');
  await replace(x, 108, 179, 'minecraft:light_blue_stained_glass_pane', apartment, 'spa-mirror');
}
await replace(201, 106, 178, 'minecraft:smooth_quartz_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]', apartment, 'spa-sanitation');
await replace(202, 106, 178, 'minecraft:cauldron', apartment, 'spa-basin');
await box(203, 106, 176, 205, 108, 176, 'minecraft:barrel', apartment, 'spa-linen-cabinet');
for (const [x, z] of [[181, 177], [187, 177], [193, 179], [199, 179], [204, 174]]) {
  await replace(x, 113, z, 'minecraft:sea_lantern', apartment, 'spa-light');
}
for (const [x, z] of [[180, 166], [188, 166], [191, 166], [199, 166]]) {
  await replace(x, 106, z, 'minecraft:white_carpet', apartment, 'spa-mat');
}

// Apartment safe room: medical, waterless emergency galley, archive, and gear.
await box(209, 106, 147, 216, 113, 147, 'minecraft:deepslate_bricks', apartment, 'safe-vestibule-partition');
await clearBox(211, 106, 147, 213, 108, 147, apartment, 'safe-vestibule-entry');
await replace(212, 106, 147, 'minecraft:iron_door[facing=north,half=lower,hinge=left,open=true,powered=false]', apartment, 'safe-vestibule-door');
await replace(212, 107, 147, 'minecraft:iron_door[facing=north,half=upper,hinge=left,open=true,powered=false]', apartment, 'safe-vestibule-door');
await replace(210, 106, 142, 'minecraft:brewing_stand', apartment, 'safe-medical');
await replace(212, 106, 142, 'minecraft:smoker[facing=south,lit=false]', apartment, 'safe-galley');
await replace(214, 106, 142, 'minecraft:crafting_table', apartment, 'safe-bench');
await replace(216, 106, 142, 'minecraft:cauldron', apartment, 'safe-sanitation');
await box(216, 106, 144, 217, 109, 146, 'minecraft:barrel', apartment, 'safe-gear-locker');
await box(209, 106, 140, 215, 108, 140, 'minecraft:barrel', apartment, 'safe-provisions');

// Restore the missing apartment-to-shelter iron bulkhead while retaining a
// two-wide open stair mouth at z145..146, wholly inside the safe room. The
// separate z147 partition remains the controlled penthouse vestibule.
const bulkhead = '05-safe-bulkhead-and-shelter-circulation';
await box(208, 106, 144, 208, 109, 149, 'minecraft:iron_block', bulkhead, 'bulkhead-frame');
await clearBox(208, 106, 145, 208, 109, 146, bulkhead, 'bulkhead-opening');
await replace(208, 106, 145, 'minecraft:iron_door[facing=west,half=lower,hinge=left,open=true,powered=false]', bulkhead, 'bulkhead-door');
await replace(208, 107, 145, 'minecraft:iron_door[facing=west,half=upper,hinge=left,open=true,powered=false]', bulkhead, 'bulkhead-door');
await replace(208, 106, 146, 'minecraft:iron_door[facing=west,half=lower,hinge=right,open=true,powered=false]', bulkhead, 'bulkhead-door');
await replace(208, 107, 146, 'minecraft:iron_door[facing=west,half=upper,hinge=right,open=true,powered=false]', bulkhead, 'bulkhead-door');

// Repair the independently proven shelter-treasury grade transitions.
for (let z = 170; z <= 173; z += 1) {
  await replace(169, 82, z, 'minecraft:polished_deepslate_stairs[facing=west,half=bottom,shape=straight,waterlogged=false]', bulkhead, 'treasury-grade-one');
  await replace(165, 84, z, 'minecraft:polished_deepslate_stairs[facing=west,half=bottom,shape=straight,waterlogged=false]', bulkhead, 'treasury-grade-two');
  await replace(165, 85, z, 'minecraft:air', bulkhead, 'treasury-grid-opening');
}

// ── FALLOUT SHELTER: inhabitable rather than display-only ───────────────
const shelter = '06-fallout-shelter-fitout';
// Remove fake stone/carpet bunks, then install six valid two-block beds.
await clearBox(150, 82, 146, 155, 84, 158, shelter, 'fake-bunk-removal');
for (const [x, z] of [[150, 147], [153, 147], [150, 151], [153, 151], [150, 155], [153, 155]]) {
  await actualBed(x, 82, z, 'east', 'green', shelter);
  await replace(x + 2, 82, z, 'minecraft:barrel', shelter, 'bunk-locker');
}
for (const z of [149, 153, 157]) {
  await replace(155, 82, z, 'minecraft:lantern[hanging=false,waterlogged=false]', shelter, 'bunk-reading-light');
}

// Real galley, medical/decon, and shared dining.
await box(158, 82, 159, 164, 82, 162, 'minecraft:polished_blackstone', shelter, 'galley-counter');
for (const [x, block] of [
  [158, 'minecraft:smoker[facing=north,lit=false]'],
  [159, 'minecraft:furnace[facing=north,lit=false]'],
  [160, 'minecraft:crafting_table'],
  [161, 'minecraft:cauldron'],
  [162, 'minecraft:barrel'],
  [163, 'minecraft:composter[level=0]'],
  [164, 'minecraft:brewing_stand'],
]) {
  await replace(x, 83, 161, block, shelter, 'galley-appliance');
}
await box(157, 82, 150, 163, 82, 153, 'minecraft:dark_oak_slab[type=top,waterlogged=false]', shelter, 'common-table');
for (const [x, z, facing] of [[158, 149, 'south'], [162, 149, 'south'], [158, 154, 'north'], [162, 154, 'north']]) {
  await replace(x, 82, z, `minecraft:dark_oak_stairs[facing=${facing},half=bottom,shape=straight,waterlogged=false]`, shelter, 'common-chair');
}
await actualBed(151, 82, 160, 'east', 'white', shelter);
await replace(154, 82, 160, 'minecraft:brewing_stand', shelter, 'medical-station');
await replace(155, 82, 160, 'minecraft:barrel', shelter, 'medical-supplies');

// Compact dry sanitation/decon in the hardened lower-safe zone.
await box(183, 82, 156, 187, 82, 159, 'minecraft:smooth_quartz', shelter, 'sanitation-floor');
await box(183, 83, 156, 183, 85, 159, 'minecraft:light_blue_stained_glass', shelter, 'decon-screen');
await replace(184, 83, 157, 'minecraft:cauldron', shelter, 'decon-basin');
await replace(186, 83, 157, 'minecraft:smooth_quartz_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]', shelter, 'sanitation-fixture');
await replace(187, 83, 157, 'minecraft:barrel', shelter, 'sanitation-storage');
await replace(185, 85, 158, 'minecraft:end_rod[facing=down]', shelter, 'decon-head');

// Communications room gets powered-looking displays and named work zones.
for (const [x1, x2, label] of [[168, 173, 'radio'], [176, 181, 'crypto'], [183, 187, 'dispatch']]) {
  await box(x1, 82, 166, x2, 82, 168, 'minecraft:spruce_slab[type=top,waterlogged=false]', shelter, `${label}-console`);
  for (let x = x1; x <= x2; x += 2) {
    await replace(x, 84, 164, 'minecraft:sea_lantern', shelter, `${label}-powered-display`);
    await replace(x, 83, 165, 'minecraft:black_stained_glass', shelter, `${label}-screen`);
  }
}
for (const x of [170, 175, 180, 185]) {
  await replace(x, 82, 174, 'minecraft:dark_oak_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]', shelter, 'communications-chair');
}

// ── THREE-LEVEL VAULT: rails and distinct floor programs ────────────────
const vault = '07-grand-vault-three-level-fitout';
const rail = 'minecraft:light_weighted_pressure_plate';
// Gold pressure plates are intentionally used as a low balustrade cap atop
// iron bars. The bars supply collision; the gold cap matches the stair rails.
const railRuns = [
  { y: 67, axis: 'z', fixed: 235, from: 205, to: 216 },
  { y: 67, axis: 'z', fixed: 257, from: 205, to: 216 },
  { y: 67, axis: 'x', fixed: 217, from: 236, to: 256 },
  { y: 67, axis: 'x', fixed: 193, from: 241, to: 251 },
  { y: 56, axis: 'z', fixed: 239, from: 210, to: 218 },
  { y: 56, axis: 'z', fixed: 253, from: 210, to: 218 },
  { y: 56, axis: 'x', fixed: 219, from: 240, to: 252 },
  { y: 56, axis: 'x', fixed: 209, from: 240, to: 243 },
  { y: 56, axis: 'x', fixed: 209, from: 249, to: 252 },
];
for (const run of railRuns) {
  for (let cursor = run.from; cursor <= run.to; cursor += 1) {
    const x = run.axis === 'x' ? cursor : run.fixed;
    const z = run.axis === 'z' ? cursor : run.fixed;
    await replace(x, run.y, z, 'minecraft:iron_bars', vault, 'atrium-balustrade');
    if (cursor % 3 === 0) {
      await replace(x, run.y + 1, z, rail, vault, 'gold-rail-cap');
    }
  }
}

// Upper: access control, key custody, ledger command, private viewing salon.
await box(233, 67, 187, 240, 67, 190, 'minecraft:polished_blackstone', vault, 'upper-security-desk');
for (const x of [234, 237, 240]) {
  await replace(x, 68, 189, 'minecraft:black_stained_glass', vault, 'upper-security-display');
}
await box(251, 67, 187, 260, 69, 190, 'minecraft:chiseled_bookshelf', vault, 'upper-ledger-archive');
await replace(253, 67, 192, 'minecraft:ender_chest[facing=south,waterlogged=false]', vault, 'key-custody');
await replace(256, 67, 192, 'minecraft:lodestone', vault, 'key-control');
await box(241, 67, 219, 251, 67, 223, 'minecraft:red_carpet', vault, 'upper-viewing-salon');
for (const [x, z, facing] of [[242, 220, 'east'], [250, 220, 'west'], [244, 223, 'north'], [248, 223, 'north']]) {
  await replace(x, 67, z, `minecraft:dark_oak_stairs[facing=${facing},half=bottom,shape=straight,waterlogged=false]`, vault, 'salon-seat');
}
await replace(246, 67, 221, 'minecraft:jukebox', vault, 'salon-music');

// Middle: rare-artifact archive, appraisal, restoration, and secure armory.
await box(232, 56, 188, 238, 58, 191, 'minecraft:bookshelf', vault, 'middle-document-archive');
await box(254, 56, 188, 260, 58, 191, 'minecraft:chiseled_bookshelf', vault, 'middle-provenance-archive');
await box(241, 56, 194, 251, 56, 198, 'minecraft:smooth_quartz_slab[type=top,waterlogged=false]', vault, 'appraisal-tables');
for (const [x, block] of [[242, 'minecraft:smithing_table'], [246, 'minecraft:cartography_table'], [250, 'minecraft:brewing_stand']]) {
  await replace(x, 57, 196, block, vault, 'restoration-station');
}
for (const [x, z] of [[233, 205], [258, 205], [233, 213], [258, 213]]) {
  await box(x, 56, z, x + 1, 59, z + 2, 'minecraft:polished_blackstone', vault, 'secure-armory-locker');
  await replace(x, 60, z + 1, 'minecraft:sea_lantern', vault, 'armory-light');
}

// Lower: bullion hall, mint-inspection line, disaster reserve, prized plinth.
await box(232, 45, 188, 239, 45, 196, 'minecraft:gold_block', vault, 'lower-bullion-stack');
await box(253, 45, 188, 260, 45, 196, 'minecraft:raw_gold_block', vault, 'lower-raw-bullion-stack');
await box(232, 45, 202, 238, 47, 210, 'minecraft:iron_block', vault, 'lower-metal-reserve');
await box(254, 45, 202, 260, 47, 210, 'minecraft:copper_block', vault, 'lower-metal-reserve');
await box(241, 45, 199, 251, 45, 211, 'minecraft:polished_blackstone', vault, 'prize-plinth');
await box(243, 46, 201, 249, 46, 209, 'minecraft:gold_block', vault, 'prize-plinth');
await box(245, 47, 203, 247, 48, 207, 'minecraft:diamond_block', vault, 'prize-display');
await replace(246, 49, 205, 'minecraft:beacon', vault, 'prize-beacon');
await box(240, 45, 214, 252, 45, 217, 'minecraft:smooth_quartz_slab[type=top,waterlogged=false]', vault, 'mint-inspection-counter');
for (const x of [241, 245, 249]) {
  await replace(x, 46, 216, 'minecraft:smithing_table', vault, 'mint-inspection-station');
}
for (const [x, z] of [[234, 199], [258, 199], [234, 215], [258, 215], [246, 195]]) {
  await replace(x, 52, z, 'minecraft:sea_lantern', vault, 'lower-gallery-light');
}

// ── C01 PRIMARY VERTICAL CIRCULATION ────────────────────────────────────
// A two-wide enclosed square helix replaces scaffolding as the advertised
// route between lower operations, underground hangar, shelter interface,
// surface hangar, and the second-floor office. U01 remains sealed as a
// maintenance riser until saved-world reverse-route QA is complete.
const primaryStair = '08-c01-primary-stair';
await clearBox(205, 51, 153, 215, 109, 163, primaryStair, 'primary-core-clearance');
await box(204, 50, 152, 216, 50, 164, 'minecraft:polished_deepslate', primaryStair, 'primary-core-foundation');
await box(204, 51, 152, 204, 109, 164, 'minecraft:deepslate_bricks', primaryStair, 'primary-core-west-wall');
await box(216, 51, 152, 216, 109, 164, 'minecraft:deepslate_bricks', primaryStair, 'primary-core-east-wall');
await box(205, 51, 152, 215, 109, 152, 'minecraft:deepslate_bricks', primaryStair, 'primary-core-north-wall');
await box(205, 51, 164, 215, 109, 164, 'minecraft:deepslate_bricks', primaryStair, 'primary-core-south-wall');
await box(204, 110, 152, 216, 110, 164, 'minecraft:reinforced_deepslate', primaryStair, 'primary-core-roof');

const helix = [];
for (let x = 206; x <= 214; x += 1) helix.push({ x, z: 154, inward: [0, 1], facing: 'east' });
for (let z = 155; z <= 162; z += 1) helix.push({ x: 214, z, inward: [-1, 0], facing: 'south' });
for (let x = 213; x >= 206; x -= 1) helix.push({ x, z: 162, inward: [0, -1], facing: 'west' });
for (let z = 161; z >= 155; z -= 1) helix.push({ x: 206, z, inward: [1, 0], facing: 'north' });
for (let index = 0; index <= 57; index += 1) {
  const step = helix[index % helix.length];
  const y = 50 + index;
  for (const [dx, dz] of [[0, 0], step.inward]) {
    await replace(
      step.x + dx,
      y,
      step.z + dz,
      `minecraft:polished_deepslate_stairs[facing=${step.facing},half=bottom,shape=straight,waterlogged=false]`,
      primaryStair,
      'primary-two-wide-helix',
    );
    await clearBox(
      step.x + dx,
      y + 1,
      step.z + dz,
      step.x + dx,
      y + 3,
      step.z + dz,
      primaryStair,
      'primary-stair-headroom',
    );
  }
}

// Level interfaces land directly beside a tread at the matching support Y.
const stairInterfaces = [
  {
    id: 'lower-operations',
    supportY: 50,
    floor: [204, 50, 154, 207, 50, 156],
    opening: [204, 51, 154, 204, 54, 156],
    target: [206, 51, 154],
  },
  {
    id: 'underground-hangar',
    supportY: 62,
    floor: [213, 62, 157, 216, 62, 159],
    opening: [216, 63, 157, 216, 66, 159],
    target: [214, 63, 158],
  },
  {
    id: 'shelter-interface',
    supportY: 81,
    floor: [204, 81, 154, 205, 81, 157],
    opening: [204, 82, 154, 204, 85, 157],
    target: [206, 82, 156],
  },
  {
    id: 'surface-hangar',
    supportY: 98,
    floor: [212, 98, 160, 216, 98, 163],
    opening: [216, 99, 160, 216, 102, 163],
    target: [213, 99, 162],
  },
  {
    id: 'office-overlook',
    supportY: 105,
    floor: [204, 105, 158, 208, 105, 162],
    opening: [204, 106, 158, 204, 109, 161],
    target: [207, 106, 162],
  },
];
for (const level of stairInterfaces) {
  await box(...level.floor, 'minecraft:polished_deepslate', primaryStair, `${level.id}-landing`);
  await clearBox(...level.opening, primaryStair, `${level.id}-opening`);
  const [, ty] = level.target;
  await replace(205, Math.min(108, ty + 2), 152, 'minecraft:sea_lantern', primaryStair, `${level.id}-light`);
}
for (const y of [56, 69, 88, 102]) {
  await replace(210, y, 158, 'minecraft:sea_lantern', primaryStair, 'primary-core-light');
}

// Tie the core into the existing registered horizontal circulation at each
// interface instead of leaving a stair landing embedded in mountain shell.
await box(198, 50, 154, 207, 50, 156, 'minecraft:polished_deepslate', primaryStair, 'lower-spine-connector-floor');
await clearBox(198, 51, 154, 204, 54, 156, primaryStair, 'lower-spine-connector-clearance');
await box(198, 55, 154, 204, 55, 156, 'minecraft:deepslate_tiles', primaryStair, 'lower-spine-connector-ceiling');

await box(207, 62, 157, 213, 62, 159, 'minecraft:polished_deepslate', primaryStair, 'upper-gallery-landing');
await box(207, 62, 153, 209, 62, 159, 'minecraft:polished_deepslate', primaryStair, 'upper-gallery-landing');
await clearBox(207, 63, 153, 212, 66, 159, primaryStair, 'upper-gallery-landing-clearance');
await clearBox(207, 63, 152, 209, 66, 152, primaryStair, 'upper-gallery-door');

await box(188, 81, 154, 205, 81, 157, 'minecraft:polished_deepslate', primaryStair, 'shelter-interface-floor');
await box(206, 81, 154, 207, 81, 155, 'minecraft:polished_deepslate', primaryStair, 'shelter-interface-helix-landing');
await clearBox(188, 82, 154, 205, 85, 157, primaryStair, 'shelter-interface-clearance');
await box(188, 82, 153, 204, 85, 153, 'minecraft:deepslate_bricks', primaryStair, 'shelter-interface-wall');
await box(188, 82, 158, 204, 85, 158, 'minecraft:deepslate_bricks', primaryStair, 'shelter-interface-wall');
await box(188, 86, 153, 204, 86, 158, 'minecraft:reinforced_deepslate', primaryStair, 'shelter-interface-ceiling');
await clearBox(188, 82, 154, 188, 85, 157, primaryStair, 'shelter-interface-door');

// Lower theater/conference rooms were cataloged but remained mostly natural
// stone. Rebuild them as sealed rooms before applying their distinct programs.
const enclosure = '09-c01-lower-enclosure-repair';
const lowerRooms = [
  { id: 'theater', x1: 140, x2: 158, z1: 173, z2: 190, accent: 'minecraft:red_carpet' },
  { id: 'conference-a', x1: 169, x2: 180, z1: 173, z2: 190, accent: 'minecraft:blue_carpet' },
  { id: 'conference-b', x1: 189, x2: 200, z1: 173, z2: 190, accent: 'minecraft:cyan_carpet' },
  { id: 'conference-c', x1: 209, x2: 220, z1: 173, z2: 190, accent: 'minecraft:purple_carpet' },
];
for (const room of lowerRooms) {
  const { id, x1, x2, z1, z2 } = room;
  await box(x1, 50, z1, x2, 50, z2, 'minecraft:polished_deepslate', enclosure, `${id}-floor`);
  await clearBox(x1 + 1, 51, z1 + 1, x2 - 1, 59, z2 - 1, enclosure, `${id}-interior`);
  await box(x1, 51, z1, x1, 59, z2, 'minecraft:deepslate_bricks', enclosure, `${id}-west-wall`);
  await box(x2, 51, z1, x2, 59, z2, 'minecraft:deepslate_bricks', enclosure, `${id}-east-wall`);
  await box(x1, 51, z1, x2, 59, z1, 'minecraft:deepslate_bricks', enclosure, `${id}-north-wall`);
  await box(x1, 51, z2, x2, 59, z2, 'minecraft:deepslate_bricks', enclosure, `${id}-south-wall`);
  await box(x1, 60, z1, x2, 60, z2, 'minecraft:deepslate_tiles', enclosure, `${id}-ceiling`);
  const doorCenter = Math.floor((x1 + x2) / 2);
  await clearBox(doorCenter - 1, 51, z1 - 1, doorCenter + 1, 54, z1, enclosure, `${id}-corridor-door`);
  for (const [x, z] of [[x1 + 2, z1 + 2], [x2 - 2, z1 + 2], [x1 + 2, z2 - 2], [x2 - 2, z2 - 2]]) {
    await replace(x, 59, z, 'minecraft:sea_lantern', enclosure, `${id}-ceiling-light`);
  }
}

// Theater: three stepped seating rows, side aisles, stage, status screen, AV.
await box(142, 51, 186, 156, 51, 189, 'minecraft:smooth_quartz', enclosure, 'lower-theater-stage');
await box(145, 53, 189, 153, 56, 189, 'minecraft:black_concrete', enclosure, 'lower-theater-screen');
await replace(149, 52, 186, 'minecraft:lectern[facing=north,has_book=false,powered=false]', enclosure, 'lower-theater-lectern');
for (let row = 0; row < 3; row += 1) {
  const y = 51 + row;
  const z = 177 + row * 3;
  await box(142, y, z, 156, y, z + 1, 'minecraft:polished_deepslate', enclosure, 'lower-theater-riser');
  for (const x of [143, 145, 147, 151, 153, 155]) {
    await replace(x, y + 1, z, 'minecraft:dark_oak_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]', enclosure, 'lower-theater-seat');
  }
}
await box(141, 55, 174, 145, 57, 176, 'minecraft:polished_blackstone', enclosure, 'lower-theater-av-booth');
await replace(143, 56, 176, 'minecraft:black_stained_glass', enclosure, 'lower-theater-av-screen');

// Conference A: incident planning and maps.
await box(171, 51, 178, 178, 51, 185, 'minecraft:dark_oak_slab[type=top,waterlogged=false]', enclosure, 'conference-a-table');
for (const [x, z, facing] of [[172, 177, 'south'], [176, 177, 'south'], [172, 186, 'north'], [176, 186, 'north']]) {
  await replace(x, 51, z, `minecraft:dark_oak_stairs[facing=${facing},half=bottom,shape=straight,waterlogged=false]`, enclosure, 'conference-a-chair');
}
await box(170, 52, 188, 179, 56, 188, 'minecraft:cartography_table', enclosure, 'conference-a-map-wall');

// Conference B: secure video conference and AV.
await box(191, 51, 177, 198, 51, 185, 'minecraft:spruce_slab[type=top,waterlogged=false]', enclosure, 'conference-b-u-table');
await clearBox(193, 51, 179, 196, 51, 183, enclosure, 'conference-b-u-center');
for (const [x, z] of [[192, 178], [197, 178], [192, 184], [197, 184], [194, 186], [196, 186]]) {
  await replace(x, 51, z, 'minecraft:dark_oak_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]', enclosure, 'conference-b-chair');
}
await box(192, 53, 189, 197, 56, 189, 'minecraft:black_stained_glass', enclosure, 'conference-b-screen');
await box(199, 51, 186, 199, 55, 188, 'minecraft:polished_blackstone', enclosure, 'conference-b-av-rack');

// Conference C: executive continuity room and secure document wall.
await box(211, 51, 178, 218, 51, 185, 'minecraft:dark_oak_slab[type=top,waterlogged=false]', enclosure, 'conference-c-table');
for (const [x, z, facing] of [[212, 177, 'south'], [216, 177, 'south'], [212, 186, 'north'], [216, 186, 'north']]) {
  await replace(x, 51, z, `minecraft:dark_oak_stairs[facing=${facing},half=bottom,shape=straight,waterlogged=false]`, enclosure, 'conference-c-chair');
}
await box(210, 52, 188, 219, 56, 188, 'minecraft:chiseled_bookshelf', enclosure, 'conference-c-document-wall');
await box(218, 51, 174, 219, 53, 176, 'minecraft:barrel', enclosure, 'conference-c-consultation-storage');

// ── C01 PARKING-SIDE BUNKER AND LARGE UNDERGROUND ROOMS ────────────────
const bunker = '10-c01-bunker-detail';

// Arrival/security room at the public parking-side entrance. The x122..126
// center ribbon remains completely clear.
await box(109, 63, 166, 119, 63, 169, 'minecraft:polished_blackstone', bunker, 'arrival-security-desk');
for (const x of [110, 114, 118]) {
  await replace(x, 64, 168, 'minecraft:black_stained_glass', bunker, 'arrival-security-screen');
}
await box(109, 63, 174, 119, 63, 177, 'minecraft:dark_oak_slab[type=top,waterlogged=false]', bunker, 'arrival-information-desk');
await replace(111, 64, 175, 'minecraft:cartography_table', bunker, 'arrival-campus-map');
await replace(115, 64, 175, 'minecraft:lodestone', bunker, 'arrival-wayfinding-core');
for (const [x, z, facing] of [[129, 168, 'south'], [133, 168, 'south'], [129, 176, 'north'], [133, 176, 'north']]) {
  await putIfFloor(x, 63, z, `minecraft:dark_oak_stairs[facing=${facing},half=bottom,shape=straight,waterlogged=false]`, bunker, 'arrival-waiting-seat');
}
for (const [x, z] of [[110, 165], [118, 165], [110, 179], [118, 179], [130, 165], [134, 179]]) {
  await putIfAir(x, 67, z, 'minecraft:sea_lantern', bunker, 'arrival-light');
}

// Underground hangar: two readable aircraft, a rescue truck, maintenance and
// logistics clusters. Protected taxi ribbons z108..110 are never touched.
// Utility aircraft A (north-west display).
await box(143, 63, 94, 160, 63, 98, 'minecraft:light_gray_concrete', bunker, 'underground-aircraft-a');
await box(149, 64, 95, 160, 65, 97, 'minecraft:white_concrete', bunker, 'underground-aircraft-a');
await box(151, 66, 95, 157, 66, 97, 'minecraft:light_blue_stained_glass', bunker, 'underground-aircraft-cockpit');
await box(148, 63, 88, 153, 63, 104, 'minecraft:white_concrete', bunker, 'underground-aircraft-wing');
await box(138, 63, 95, 142, 65, 97, 'minecraft:orange_concrete', bunker, 'underground-aircraft-tail');

// Compact rotorcraft/display B on the south-west pad.
await box(118, 63, 116, 137, 63, 120, 'minecraft:gray_concrete', bunker, 'underground-rotorcraft');
await box(123, 64, 117, 136, 66, 119, 'minecraft:light_gray_concrete', bunker, 'underground-rotorcraft');
await box(130, 65, 116, 136, 66, 120, 'minecraft:light_blue_stained_glass', bunker, 'underground-rotorcraft-cockpit');
await box(126, 67, 109, 129, 67, 127, 'minecraft:iron_block', bunker, 'underground-rotor');
await box(118, 67, 117, 139, 67, 120, 'minecraft:iron_block', bunker, 'underground-rotor');

// Rescue vehicle and maintenance islands.
await box(156, 63, 123, 172, 64, 132, 'minecraft:red_concrete', bunker, 'rescue-vehicle');
await box(159, 65, 125, 169, 67, 130, 'minecraft:white_concrete', bunker, 'rescue-vehicle');
await box(160, 66, 124, 168, 67, 124, 'minecraft:light_blue_stained_glass', bunker, 'rescue-cab');
for (const [x, z] of [[158, 122], [169, 122], [158, 133], [169, 133]]) {
  await replace(x, 63, z, 'minecraft:black_concrete', bunker, 'rescue-wheel');
}
for (const [x, z] of [[145, 120], [145, 132], [178, 121], [178, 133]]) {
  await putIfFloor(x, 63, z, 'minecraft:smithing_table', bunker, 'maintenance-station');
  await putIfFloor(x + 2, 63, z, 'minecraft:blast_furnace[facing=south,lit=false]', bunker, 'maintenance-station');
  await putIfFloor(x + 4, 63, z, 'minecraft:barrel', bunker, 'maintenance-station');
}

// Perimeter operations catwalk and lighting, clear of aircraft/taxi lanes.
await box(111, 69, 84, 186, 69, 86, 'minecraft:iron_block', bunker, 'hangar-catwalk');
await box(111, 70, 86, 186, 70, 86, 'minecraft:iron_bars', bunker, 'hangar-catwalk-rail');
for (let x = 113; x <= 184; x += 8) {
  await replace(x, 70, 84, 'minecraft:sea_lantern', bunker, 'hangar-catwalk-light');
}

// Emergency arena: bleachers, obstacle/rescue course, medical/decon, targets.
for (let tier = 0; tier < 4; tier += 1) {
  await box(
    204 + tier,
    63 + tier,
    86,
    205 + tier,
    63 + tier,
    104,
    'minecraft:smooth_quartz_stairs[facing=east,half=bottom,shape=straight,waterlogged=false]',
    bunker,
    'arena-bleachers',
  );
}
for (const z of [89, 96, 116, 124]) {
  await box(216, 63, z, 230, 65, z, 'minecraft:orange_concrete', bunker, 'arena-obstacle-wall');
  await clearBox(220, 63, z, 222, 64, z, bunker, 'arena-obstacle-door');
  await clearBox(227, 63, z, 228, 63, z, bunker, 'arena-obstacle-crawl');
}
for (const x of [216, 220, 224, 228]) {
  await box(x, 63, 112, x, 67, 112, 'minecraft:iron_bars', bunker, 'arena-climb-frame');
}
await box(233, 63, 116, 245, 63, 129, 'minecraft:smooth_quartz', bunker, 'arena-medical-zone');
await box(234, 64, 117, 244, 64, 119, 'minecraft:brewing_stand', bunker, 'arena-medical-bench');
await box(234, 64, 126, 244, 66, 128, 'minecraft:light_blue_stained_glass', bunker, 'arena-decon-screen');
for (const x of [235, 239, 243]) {
  await replace(x, 64, 123, 'minecraft:target', bunker, 'arena-target');
  await replace(x, 68, 123, 'minecraft:sea_lantern', bunker, 'arena-task-light');
}

// Purpose-specific accents in lower operations rooms. Only supported air cells
// are used, so old doors, stairs, containers, and recovered fit-out survive.
const lowerAccents = [
  { id: 'archive', box: [141, 51, 103, 153, 51, 132], blocks: ['minecraft:chiseled_bookshelf', 'minecraft:lectern[facing=south,has_book=false,powered=false]', 'minecraft:cartography_table'] },
  { id: 'bunk', box: [169, 51, 103, 176, 51, 120], blocks: ['minecraft:green_bed[facing=east,occupied=false,part=foot]', 'minecraft:barrel', 'minecraft:flower_pot'] },
  { id: 'records', box: [179, 51, 103, 186, 51, 120], blocks: ['minecraft:bookshelf', 'minecraft:chiseled_bookshelf', 'minecraft:lectern[facing=south,has_book=false,powered=false]'] },
  { id: 'comms', box: [189, 51, 103, 196, 51, 120], blocks: ['minecraft:black_stained_glass', 'minecraft:note_block', 'minecraft:sea_lantern'] },
  { id: 'stores', box: [209, 51, 103, 228, 51, 122], blocks: ['minecraft:barrel', 'minecraft:crafting_table', 'minecraft:smithing_table'] },
  { id: 'fabrication', box: [239, 51, 103, 263, 51, 122], blocks: ['minecraft:blast_furnace[facing=south,lit=false]', 'minecraft:smithing_table', 'minecraft:anvil'] },
];
for (const room of lowerAccents) {
  const [x1, y, z1, x2, , z2] = room.box;
  let placed = 0;
  for (let z = z1 + 2; z <= z2 - 2 && placed < 18; z += 3) {
    for (let x = x1 + 2; x <= x2 - 2 && placed < 18; x += 3) {
      const block = room.blocks[placed % room.blocks.length];
      if (await putIfFloor(x, y, z, block, bunker, `lower-${room.id}-accent`)) placed += 1;
    }
  }
}

// ── Emit exact guarded operations and design report ─────────────────────
const ordered = [...operations.values()].sort((a, b) => (
  a.phase.localeCompare(b.phase)
  || a.y - b.y
  || a.z - b.z
  || a.x - b.x
));

// Coalesce exact-state point guards into rectangular boxes. This keeps every
// source-state guarantee while avoiding tens of thousands of tiny RCON calls
// on the 2-vCPU host.
const xRuns = [];
for (const operation of ordered) {
  const prior = xRuns.at(-1);
  if (
    prior
    && prior.phase === operation.phase
    && prior.y1 === operation.y
    && prior.z1 === operation.z
    && prior.current === operation.current
    && prior.replacement === operation.replacement
    && prior.x2 + 1 === operation.x
  ) {
    prior.x2 = operation.x;
  } else {
    xRuns.push({
      phase: operation.phase,
      current: operation.current,
      replacement: operation.replacement,
      x1: operation.x,
      x2: operation.x,
      y1: operation.y,
      y2: operation.y,
      z1: operation.z,
      z2: operation.z,
    });
  }
}
const zSorted = [...xRuns].sort((a, b) => (
  a.phase.localeCompare(b.phase)
  || a.y1 - b.y1
  || a.current.localeCompare(b.current)
  || a.replacement.localeCompare(b.replacement)
  || a.x1 - b.x1
  || a.x2 - b.x2
  || a.z1 - b.z1
));
const zRects = [];
for (const run of zSorted) {
  const prior = zRects.at(-1);
  if (
    prior
    && prior.phase === run.phase
    && prior.y1 === run.y1
    && prior.current === run.current
    && prior.replacement === run.replacement
    && prior.x1 === run.x1
    && prior.x2 === run.x2
    && prior.z2 + 1 === run.z1
  ) {
    prior.z2 = run.z2;
  } else {
    zRects.push({ ...run });
  }
}
const ySorted = [...zRects].sort((a, b) => (
  a.phase.localeCompare(b.phase)
  || a.current.localeCompare(b.current)
  || a.replacement.localeCompare(b.replacement)
  || a.x1 - b.x1
  || a.x2 - b.x2
  || a.z1 - b.z1
  || a.z2 - b.z2
  || a.y1 - b.y1
));
const guardedBoxes = [];
for (const rect of ySorted) {
  const prior = guardedBoxes.at(-1);
  if (
    prior
    && prior.phase === rect.phase
    && prior.current === rect.current
    && prior.replacement === rect.replacement
    && prior.x1 === rect.x1
    && prior.x2 === rect.x2
    && prior.z1 === rect.z1
    && prior.z2 === rect.z2
    && prior.y2 + 1 === rect.y1
  ) {
    prior.y2 = rect.y2;
  } else {
    guardedBoxes.push({ ...rect });
  }
}
guardedBoxes.sort((a, b) => (
  a.phase.localeCompare(b.phase)
  || a.y1 - b.y1
  || a.z1 - b.z1
  || a.x1 - b.x1
));

const lines = [
  '# GENERATED FILE — MainStreet secure-complex detail Wave 5',
  '# exact one-cell Anvil guards; loaded treasury inventories are protected',
  `# snapshot: ${regions}`,
  '',
];
let currentPhase = null;
for (const operation of guardedBoxes) {
  if (operation.phase !== currentPhase) {
    currentPhase = operation.phase;
    lines.push(`# phase: ${currentPhase}`);
  }
  lines.push(
    `REPL ${operation.x1} ${operation.y1} ${operation.z1} `
    + `${operation.x2} ${operation.y2} ${operation.z2} `
    + `${operation.current} ${operation.replacement}`,
  );
}
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${lines.join('\n')}\n`);

const hash = crypto.createHash('sha256');
for (const filename of fs.readdirSync(regions).filter((name) => name.endsWith('.mca')).sort()) {
  hash.update(filename);
  hash.update('\0');
  hash.update(fs.readFileSync(path.join(regions, filename)));
  hash.update('\0');
}

const report = {
  schemaVersion: 1,
  id: 'mainstreet-secure-complex-detail-wave5',
  generatedAt: new Date().toISOString(),
  sourceSnapshot: {
    directory: regions,
    sha256: hash.digest('hex'),
  },
  guardedOperationCount: guardedBoxes.length,
  changedCellCount: ordered.length,
  protectedLoadedContainers: [...protectedCells],
  phaseCounts: Object.fromEntries(
    [...new Set(ordered.map((operation) => operation.phase))]
      .sort()
      .map((phase) => [phase, ordered.filter((operation) => operation.phase === phase).length]),
  ),
  design: {
    observatory: {
      rooms: [
        'public foyer and astronomy exhibits',
        'central planetarium',
        'instrument archive and research lab',
        'west research telescope room',
        'east solar and optics laboratory',
      ],
      instruments: instruments.map(({ id, cx, cz, capY }) => ({
        id,
        mount: [cx, 121, cz],
        objectiveLens: [cx, capY, cz],
      })),
      publicVerticalAccess: {
        type: 'two-wide enclosed switchback stair',
        envelope: [164, 98, 151, 175, 123, 166],
        scaffoldLiftRetainedAsSecondary: true,
      },
    },
    penthouse: {
      separateFromObservatory: true,
      concealedStairEnvelope: [180, 105, 141, 186, 123, 147],
      rooms: [
        'paneled private library salon',
        'twelve-monitor command suite',
        'one bedroom with actual double bed',
        'marble and glass four-head spa',
        'walk-in wardrobe',
        'hardened safe room',
      ],
    },
    shelter: {
      actualBeds: 7,
      programs: ['bunks', 'medical', 'galley', 'common dining', 'dry sanitation/decon', 'safe room', 'communications', 'treasury'],
      circulationRepairs: ['safe-room bulkhead restored', 'treasury grade transitions made bidirectional'],
    },
    grandVault: {
      levels: {
        upper: ['access control', 'key custody', 'ledger command', 'private viewing salon'],
        middle: ['artifact archive', 'appraisal', 'restoration', 'secure armory'],
        lower: ['bullion hall', 'mint inspection', 'disaster reserve', 'prized plinth'],
      },
      atriumBalustrades: railRuns,
      loadedContainersPreserved: 9,
    },
    c01: {
      programs: [
        'parking-side arrival and security',
        'two underground aircraft displays',
        'rescue vehicle',
        'maintenance and logistics',
        'operations catwalk',
        'arena bleachers and rescue course',
        'medical and decon zone',
        'purpose-specific lower operations accents',
      ],
      protectedRoutes: [
        'public x122..126 concourse ribbon',
        'hangar-arena z108..110 taxi ribbon',
        'existing service-spine and scaffold columns',
      ],
    },
  },
};
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  output,
  report: reportPath,
  guardedOperations: guardedBoxes.length,
  changedCells: ordered.length,
  phases: Object.keys(report.phaseCounts).length,
  protectedLoadedContainers: protectedCells.size,
}, null, 2));
