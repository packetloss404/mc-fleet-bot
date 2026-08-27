#!/usr/bin/env node
/** Read-only probe of the Westlight headhouse + service-exit site against a
 *  supplied immutable snapshot. Maps the corridor head, platform deck, track
 *  band, surface plateau, and the y40 water body the access shaft crosses.
 */

import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const SNAPSHOT = process.argv[2] ?? 'data/worldsnap-cobalt-wl-headhouse-source-20260825T120000Z';
const reader = new AnvilReader(path.resolve(ROOT, path.join(SNAPSHOT, 'region')));

const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set(['minecraft:sand', 'minecraft:gravel', 'minecraft:red_sand', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel']);
const blockName = (state) => state.split('[', 1)[0];
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const isAir = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(blockName(state));
const stateAt = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));

// Corridor Leg A: x=-254..-236, y18..23, z=-462..-457 (built sealed liner).
// Platform deck: x=-253..-237, y18, z=-444..-441 (built).
// Track band between: z=-456..-446.
console.log('=== CORRIDOR HEAD (x=-254..-236, z=-462..-457, y16..25) ===');
for (let y = 25; y >= 15; y -= 1) {
  const row = [];
  for (let x = -254; x <= -236; x += 1) {
    let fluid = 0, air = 0, other = new Set();
    for (let z = -462; z <= -457; z += 1) {
      const s = await stateAt(x, y, z);
      if (isFluid(s)) fluid += 1;
      else if (isAir(s)) air += 1;
      else other.add(blockName(s).split(':')[1]);
    }
    const o = [...other].slice(0, 2).join(',');
    row.push(`${x}:${fluid}F/${air}A/${o || '-'}`);
  }
  console.log(`y=${y}  ${row.join('  ')}`);
}

console.log('\n=== PLATFORM DECK (x=-254..-236, z=-445..-440, y16..25) ===');
for (let y = 25; y >= 15; y -= 1) {
  const row = [];
  for (let x = -254; x <= -236; x += 1) {
    let fluid = 0, air = 0, other = new Set();
    for (let z = -445; z <= -440; z += 1) {
      const s = await stateAt(x, y, z);
      if (isFluid(s)) fluid += 1;
      else if (isAir(s)) air += 1;
      else other.add(blockName(s).split(':')[1]);
    }
    const o = [...other].slice(0, 2).join(',');
    row.push(`${x}:${fluid}F/${air}A/${o || '-'}`);
  }
  console.log(`y=${y}  ${row.join('  ')}`);
}

console.log('\n=== TRACK BAND (x=-254..-236, z=-456..-446, y16..25) ===');
for (let y = 25; y >= 15; y -= 1) {
  const row = [];
  for (let x = -254; x <= -236; x += 1) {
    let fluid = 0, air = 0;
    for (let z = -456; z <= -446; z += 1) {
      const s = await stateAt(x, y, z);
      if (isFluid(s)) fluid += 1;
      else if (isAir(s)) air += 1;
    }
    row.push(`${x}:${fluid}F/${air}A`);
  }
  console.log(`y=${y}  ${row.join('  ')}`);
}

console.log('\n=== SURFACE (y64..68) AT WL-SC-1 (x=-260..-248, z=-470..-456) ===');
for (let x = -260; x <= -248; x += 2) {
  const row = [];
  for (let z = -470; z <= -456; z += 2) {
    const s = await stateAt(x, 66, z);
    row.push(`(${x},${z})=${blockName(s).split(':')[1]}`);
  }
  console.log(`x=${x}  ${row.join('  ')}`);
}
console.log('\nSurface y at selected columns (highest non-air <= y70):');
for (const [x, z] of [[-256,-460],[-253,-460],[-260,-452],[-256,-452],[-252,-460],[-260,-456],[-248,-456]]) {
  let surfY = null;
  for (let y = 70; y >= 40; y -= 1) {
    const s = await stateAt(x, y, z);
    if (!isAir(s) && !isFluid(s)) { surfY = y; break; }
    if (isFluid(s)) { surfY = `water@${y}`; break; }
  }
  console.log(`  (${x},${z}): highest non-air y=${surfY}`);
}

console.log('\n=== WATER BODY y30..50 COLUMN CENSUS (x=-266..-244, z=-476..-448) ===');
let totalFluid = 0;
const waterAtY = new Map();
const columnsWithWater = new Set();
for (let x = -266; x <= -244; x += 1) {
  for (let z = -476; z <= -448; z += 1) {
    for (let y = 30; y <= 50; y += 1) {
      const s = await stateAt(x, y, z);
      if (!isFluid(s)) continue;
      totalFluid += 1;
      waterAtY.set(y, (waterAtY.get(y) ?? 0) + 1);
      columnsWithWater.add(`${x},${z}`);
    }
  }
}
console.log(`total water cells y30..50: ${totalFluid}; columns: ${columnsWithWater.size}`);
console.log('water count by y:', Object.fromEntries([...waterAtY.entries()].sort((a, b) => a[0] - b[0])));

console.log('\n=== COLUMN PROFILES AT CANDIDATE SHAFT FOOTPRINTS ===');
const footprints = [
  { name: 'HH-shaft', x: [-256,-255,-254], z: [-461,-460,-459] },
  { name: 'SE1-shaft', x: [-254,-253,-252], z: [-461,-460,-459] },
  { name: 'SE2-shaft', x: [-261,-260,-259], z: [-453,-452,-451] },
  { name: 'SE2-alt', x: [-261,-260,-259], z: [-462,-461,-460] },
];
for (const fp of footprints) {
  console.log(`\n--- ${fp.name} (y16..67) ---`);
  for (const x of fp.x) {
    for (const z of fp.z) {
      const waterYs = [];
      let gravityCount = 0;
      let forbidden = [];
      for (let y = 16; y <= 67; y += 1) {
        const s = await stateAt(x, y, z);
        if (isFluid(s)) waterYs.push(y);
        if (GRAVITY.has(blockName(s))) gravityCount += 1;
        const b = blockName(s).split(':')[1];
        if (['chest','barrel','furnace','hopper','dispenser','dropper','spawner','lectern','sign','beehive','bee_nest','shulker_box','decorated_pot','structure_block'].includes(b)) forbidden.push(`${y}:${b}`);
      }
      console.log(`  (${x},${z}): water@[${waterYs.join(',')}] gravity=${gravityCount}${forbidden.length ? ' forbidden=' + forbidden.join(' ') : ''}`);
    }
  }
}

console.log('\nDONE');
