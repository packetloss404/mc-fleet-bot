#!/usr/bin/env node
/** Refined probe for the Ravensreach RR-SE-1 access-shaft sleeve design.
 *  Checks the exact shaft box column profiles, surface condition, water
 *  connectivity, forbidden blocks, and halo composition.
 */

import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const SNAPSHOT = process.argv[2] ?? 'data/worldsnap-r08am-post-20260822T161818Z';
const reader = new AnvilReader(path.resolve(ROOT, path.join(SNAPSHOT, 'region')));

const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const blockName = (state) => state.split('[', 1)[0];
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const FORBIDDEN = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:spawner', 'minecraft:lectern', 'minecraft:brewing_stand',
  'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive',
  'minecraft:bee_nest', 'minecraft:decorated_pot', 'minecraft:chiseled_bookshelf',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw',
  'minecraft:sign', 'minecraft:hanging_sign', 'minecraft:item_frame',
  'minecraft:glow_item_frame', 'minecraft:smithing_table', 'minecraft:stonecutter',
  'minecraft:enchanting_table', 'minecraft:composter', 'minecraft:campfire',
  'minecraft:soul_campfire', 'minecraft:sculk_sensor', 'minecraft:sculk_shrieker',
  'minecraft:bell', 'minecraft:lantern', 'minecraft:soul_lantern',
  'minecraft:sea_lantern', 'minecraft:conduit',
]);
const stateAt = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));

// --- Shaft box: 3x3 clear (x=-159..-157, z=-391..-389), full height y=23..62 ---
// Liner box: walls at x=-160 / x=-156 / z=-392 / z=-388 (y23..62),
//            floor cap y=22, ceiling cap y=63 over x=-160..-156, z=-392..-388.
const SHAFT = {
  clear: { minX: -159, maxX: -157, minZ: -391, maxZ: -389, minY: 23, maxY: 62 },
  box: { minX: -160, maxX: -156, minZ: -392, maxZ: -388, minY: 22, maxY: 63 },
};

console.log('=== SHAFT CLEAR COLUMN PROFILES (x,z) at the 3x3 clear ===');
const profile = new Map();
for (let x = SHAFT.clear.minX; x <= SHAFT.clear.maxX; x += 1) {
  for (let z = SHAFT.clear.minZ; z <= SHAFT.clear.maxZ; z += 1) {
    const rows = [];
    let waterCount = 0;
    let forbiddenCount = 0;
    for (let y = 20; y <= 64; y += 1) {
      const s = await stateAt(x, y, z);
      const b = blockName(s);
      if (isFluid(s)) { rows.push(`${y}:${b}`); waterCount += 1; }
      if (FORBIDDEN.has(b)) forbiddenCount += 1;
    }
    const key = `${x},${z}`;
    profile.set(key, { water: rows, waterCount, forbiddenCount });
    console.log(`${key}: waterCells=${waterCount} forbidden=${forbiddenCount} ${rows.join(' ')}`);
  }
}

console.log('\n=== SHAFT WALL / CAP FACE CELL FLUID + FORBIDDEN CENSUS ===');
let faceWater = 0;
let faceForbidden = 0;
const faceWaterCells = [];
const faceForbiddenCells = [];
const faceCellKeys = new Set();
for (let x = SHAFT.box.minX; x <= SHAFT.box.maxX; x += 1) {
  for (let z = SHAFT.box.minZ; z <= SHAFT.box.maxZ; z += 1) {
    for (const y of [22, 63]) {
      faceCellKeys.add(`${x},${y},${z}`);
      const s = await stateAt(x, y, z);
      const b = blockName(s);
      if (isFluid(s)) { faceWater += 1; faceWaterCells.push(`${x},${y},${z}=${b}`); }
      if (FORBIDDEN.has(b)) { faceForbidden += 1; faceForbiddenCells.push(`${x},${y},${z}=${b}`); }
    }
  }
}
for (let y = 23; y <= 62; y += 1) {
  for (const [x, z] of [[-160, -392], [-160, -391], [-160, -390], [-160, -389], [-160, -388],
    [-156, -392], [-156, -391], [-156, -390], [-156, -389], [-156, -388]]) {
    faceCellKeys.add(`${x},${y},${z}`);
    const s = await stateAt(x, y, z);
    const b = blockName(s);
    if (isFluid(s)) { faceWater += 1; faceWaterCells.push(`${x},${y},${z}=${b}`); }
    if (FORBIDDEN.has(b)) { faceForbidden += 1; faceForbiddenCells.push(`${x},${y},${z}=${b}`); }
  }
  for (const [x, z] of [[-159, -392], [-158, -392], [-157, -392], [-159, -388], [-158, -388], [-157, -388]]) {
    faceCellKeys.add(`${x},${y},${z}`);
    const s = await stateAt(x, y, z);
    const b = blockName(s);
    if (isFluid(s)) { faceWater += 1; faceWaterCells.push(`${x},${y},${z}=${b}`); }
    if (FORBIDDEN.has(b)) { faceForbidden += 1; faceForbiddenCells.push(`${x},${y},${z}=${b}`); }
  }
}
console.log(`face water cells: ${faceWater}`);
console.log(faceWaterCells.join('\n'));
console.log(`face forbidden cells: ${faceForbidden}`);
console.log(faceForbiddenCells.join('\n'));

console.log(`\n=== SURFACE / TOP CAP CONDITION (y62-64) ===`);
for (let x = SHAFT.box.minX; x <= SHAFT.box.maxX; x += 1) {
  for (let z = SHAFT.box.minZ; z <= SHAFT.box.maxZ; z += 1) {
    const y62 = await stateAt(x, 62, z);
    const y63 = await stateAt(x, 63, z);
    const y64 = await stateAt(x, 64, z);
    console.log(`(${x},${z}) y62=${blockName(y62)} y63=${blockName(y63)} y64=${blockName(y64)}`);
  }
}

console.log(`\n=== HORIZONTAL WATER CONNECTIVITY: is the shaft-adjacent pocket sealed ===`);
// For each wall column band, check the outward neighbor to confirm water is contained
// behind the wall (the outward neighbor of the sleeve wall).
const haloChecks = [];
for (const [wx, wz] of [
  [-161, -390], [-155, -390], [-158, -393], [-158, -387], // 1 beyond each wall
]) {
  for (let y = 30; y <= 45; y += 1) {
    const s = await stateAt(wx, y, wz);
    const b = blockName(s);
    if (isFluid(s)) haloChecks.push(`${wx},${y},${wz}=${b}`);
  }
}
console.log(`outward-halo fluid at wall+1 band y30..45:\n${haloChecks.join('\n') || 'none'}`);

// Bottom cap: what is directly under the shaft box (y20..21)?
console.log(`\n=== SUB-FLOOR (y20..21) under box ===`);
for (let x = SHAFT.box.minX; x <= SHAFT.box.maxX; x += 1) {
  for (let z = SHAFT.box.minZ; z <= SHAFT.box.maxZ; z += 1) {
    const y20 = await stateAt(x, 20, z);
    const y21 = await stateAt(x, 21, z);
    if (isFluid(y20) || isFluid(y21)) console.log(`(${x},${z}) y20=${blockName(y20)} y21=${blockName(y21)}`);
  }
}
console.log('(above: only fluid cells listed; none means sub-floor is solid)');

console.log(`\nfaceCellKeys total: ${faceCellKeys.size}`);
console.log('DONE');
