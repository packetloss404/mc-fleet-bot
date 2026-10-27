#!/usr/bin/env node
/** Read-only reconciliation probe: corridor bore fluid census (whole extent +
 * first segment + liner faces), and lava-source attribution within the liner. */

import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const SNAPSHOT = process.argv[2] ?? 'data/worldsnap-r08am-post-20260822T161818Z';
const reader = new AnvilReader(path.resolve(ROOT, path.join(SNAPSHOT, 'region')));

const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const src = (s) => s.split('[', 1)[0];
const isF = (s) => FLUID.has(src(s)) || s.includes('waterlogged=true');

// 1. Full corridor rectangle y18..23 (the "930 water cells" claim region)
let water = 0, lava = 0, bub = 0;
const waterCells = [];
const lavaCells = [];
for (let x = -254; x <= -156; x += 1) {
  for (let z = -462; z <= -387; z += 1) {
    for (let y = 18; y <= 23; y += 1) {
      const s = stateToCommandString(await reader.blockState(x, y, z));
      if (!isF(s)) continue;
      if (src(s) === 'minecraft:water') { water += 1; waterCells.push({ x, y, z }); }
      else if (src(s) === 'minecraft:lava') { lava += 1; lavaCells.push({ x, y, z }); }
      else bub += 1;
    }
  }
}
console.log('FULL corridor rect x=-254..-156 z=-462..-387 y18..23:');
console.log(`  water=${water}  lava=${lava}  bubble=${bub}  total=${water + lava + bub}`);
console.log(`  water cells: ${waterCells.map((c) => `${c.x},${c.y},${c.z}`).join(' ')}`);

// 2. First-segment liner faces fluid census (floor/ceil/north/south/west/east)
const faces = { floor: [], ceil: [], north: [], south: [], west: [], east: [] };
for (let x = -254; x <= -236; x += 1) for (let z = -462; z <= -457; z += 1) {
  faces.floor.push({ x, y: 17, z });
  faces.ceil.push({ x, y: 24, z });
}
for (let x = -254; x <= -236; x += 1) for (let y = 18; y <= 23; y += 1) {
  faces.north.push({ x, y, z: -463 });
  faces.south.push({ x, y, z: -456 });
}
for (let y = 18; y <= 23; y += 1) for (let z = -462; z <= -457; z += 1) {
  faces.west.push({ x: -255, y, z });
  faces.east.push({ x: -235, y, z });
}
console.log('\nFirst-segment liner faces:');
for (const [k, cells] of Object.entries(faces)) {
  let f = 0, w = 0, l = 0, other = [];
  for (const c of cells) {
    const s = stateToCommandString(await reader.blockState(c.x, c.y, c.z));
    if (!isF(s)) continue;
    f += 1;
    if (src(s) === 'minecraft:water') w += 1;
    else if (src(s) === 'minecraft:lava') l += 1;
    else other.push(`${c.x},${c.y},${c.z}:${s}`);
  }
  console.log(`  ${k}: fluid=${f} water=${w} lava=${l} other=${other.length}${other.length ? ' ' + other.slice(0, 4).join(' ') : ''}`);
}

// 3. Where does the interior/lava water come from? Map fluid cells immediately
// around the first segment interior (y17..24 box, z=-463..-456) that are within
// the 6-face liner or its 1-cell halo.
console.log('\nLava source attribution inside first-segment interior + liner:');
for (const cell of [...lavaCells]) {
  if (cell.x >= -255 && cell.x <= -235 && cell.z >= -463 && cell.z <= -456 && cell.y >= 17 && cell.y <= 24) {
    const up = src(stateToCommandString(await reader.blockState(cell.x, cell.y + 1, cell.z)));
    const below = src(stateToCommandString(await reader.blockState(cell.x, cell.y - 1, cell.z)));
    console.log(`  lava@(${cell.x},${cell.y},${cell.z}) up=${up} below=${below}`);
  }
}
console.log('\nInterior lava (x=-254..-236,y18..23,z=-462..-457):');
for (const cell of [...lavaCells]) {
  if (cell.x >= -254 && cell.x <= -236 && cell.z >= -462 && cell.z <= -457 && cell.y >= 18 && cell.y <= 23) {
    console.log(`  interior lava@(${cell.x},${cell.y},${cell.z})`);
  }
}
