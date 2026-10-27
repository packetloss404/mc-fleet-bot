#!/usr/bin/env node
/** Detailed corridor-head + RR-SE-1 box footprint census for the sleeve design. */
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';
const ROOT = process.cwd();
const SNAPSHOT = process.argv[2] ?? 'data/worldsnap-r08am-post-20260822T161818Z';
const reader = new AnvilReader(path.resolve(ROOT, path.join(SNAPSHOT, 'region')));
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const blockName = (state) => state.split('[', 1)[0];
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const stateAt = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));

// Corridor head: x=-156, z=-387..-392, y18..23
console.log('=== RAVENSREACH CORRIDOR HEAD (x=-181..-156, y18..23, z=-392..-387) ===');
for (let x = -181; x <= -156; x += 1) {
  const row = [];
  for (let z = -392; z <= -387; z += 1) {
    let fluid = 0;
    let top = null;
    for (let y = 18; y <= 23; y += 1) {
      const s = await stateAt(x, y, z);
      if (isFluid(s)) fluid += 1;
      if (top === null && !['minecraft:air','minecraft:cave_air','minecraft:void_air'].includes(blockName(s))) top = blockName(s);
    }
    row.push(`z${z}=f${fluid}/${top ?? 'air'}`);
  }
  console.log(`x=${x}: ${row.join(' ')}`);
}

console.log('\n=== CORRIDOR EAST END VERTICAL (x=-156..-154, z=-390, y15..65) ===');
for (let x = -156; x >= -154; x -= 1) {
  const rows = [];
  for (let y = 65; y >= 15; y -= 1) {
    const s = await stateAt(x, y, -390);
    const b = blockName(s);
    rows.push(`${y}:${b}${isFluid(s) ? '*' : ''}`);
  }
  console.log(`x=${x},z=-390: ${rows.join(' ')}`);
}

console.log('\n=== RR-SE-1 BOX FOOTPRINT x=-160..-156, z=-392..-388, y22..63: fluid + forbidden ===');
const FORBIDDEN = new Set([
  'minecraft:chest','minecraft:trapped_chest','minecraft:barrel','minecraft:furnace',
  'minecraft:blast_furnace','minecraft:smoker','minecraft:hopper','minecraft:dispenser',
  'minecraft:dropper','minecraft:spawner','minecraft:lectern','minecraft:brewing_stand',
  'minecraft:beacon','minecraft:jukebox','minecraft:beehive','minecraft:bee_nest',
  'minecraft:decorated_pot','minecraft:chiseled_bookshelf','minecraft:command_block',
  'minecraft:chain_command_block','minecraft:repeating_command_block','minecraft:structure_block',
  'minecraft:jigsaw','minecraft:sign','minecraft:hanging_sign','minecraft:item_frame',
  'minecraft:glow_item_frame','minecraft:smithing_table','minecraft:stonecutter',
  'minecraft:enchanting_table','minecraft:composter','minecraft:campfire','minecraft:soul_campfire',
  'minecraft:sculk_sensor','minecraft:sculk_shrieker','minecraft:bell','minecraft:lantern',
  'minecraft:soul_lantern','minecraft:sea_lantern','minecraft:conduit',
]);
let boxFluid = 0; let boxForbidden = 0; let boxTotal = 0;
const boxFluidCells = [];
const boxForbiddenCells = [];
const byY = new Map();
for (let x = -160; x <= -156; x += 1) {
  for (let z = -392; z <= -388; z += 1) {
    for (let y = 22; y <= 63; y += 1) {
      boxTotal += 1;
      const s = await stateAt(x, y, z);
      if (isFluid(s)) { boxFluid += 1; boxFluidCells.push(`${x},${y},${z}`); byY.set(y, (byY.get(y) ?? 0) + 1); }
      if (FORBIDDEN.has(blockName(s))) { boxForbidden += 1; boxForbiddenCells.push(`${x},${y},${z}=${s}`); }
    }
  }
}
console.log(`box total cells: ${boxTotal}`);
console.log(`box fluid cells: ${boxFluid}`);
console.log(`fluid by Y:`); console.log(Object.fromEntries([...byY.entries()].sort((a,b)=>a[0]-b[0])));
console.log(`box forbidden cells: ${boxForbidden}`);
console.log(boxForbiddenCells.join('\n'));
console.log('\nDONE');
