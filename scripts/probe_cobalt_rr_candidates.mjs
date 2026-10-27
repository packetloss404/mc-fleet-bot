#!/usr/bin/env node
/** Probe candidate shifted shaft locations to find a fully-dry 3x3 clear column
 *  from corridor (y23) to surface (y62), plus the water body extent summary. */

import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const SNAPSHOT = process.argv[2] ?? 'data/worldsnap-r08am-post-20260822T161818Z';
const reader = new AnvilReader(path.resolve(ROOT, path.join(SNAPSHOT, 'region')));
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const blockName = (state) => state.split('[', 1)[0];
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const stateAt = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));

// Candidate 3x3 footprints (clear volume x-1..x+1, z-1..z+1)
const CANDIDATES = [];
for (let cx = -162; cx <= -150; cx += 1) {
  for (let cz = -395; cz <= -385; cz += 1) {
    CANDIDATES.push({ cx, cz });
  }
}

console.log('=== CANDIDATE 3x3 CLEAR FOOTPRINTS (y23..62) with any water ===');
const dryPads = [];
for (const { cx, cz } of CANDIDATES) {
  let waterCells = 0;
  const waterList = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      for (let y = 23; y <= 62; y += 1) {
        const s = await stateAt(cx + dx, y, cz + dz);
        if (isFluid(s)) { waterCells += 1; waterList.push(`${cx + dx},${y},${cz + dz}`); }
      }
    }
  }
  if (waterCells === 0) dryPads.push({ cx, cz });
  else if (waterCells <= 25) console.log(`(${cx},${cz}) water=${waterCells} ${waterList.join(' ')}`);
}
console.log(`\nFULLY DRY 3x3 pads (y23..62, 3x3 clear): ${dryPads.length}`);
for (const p of dryPads) console.log(`  (${p.cx},${p.cz})`);

// Summary of the whole water body around the plateau
console.log('\n=== WATER BODY EXTENT (x=-168..-149, z=-417..-386, y=25..55) ===');
const byBand = new Map();
let totalFluid = 0;
for (let x = -168; x <= -149; x += 1) {
  for (let z = -417; z <= -386; z += 1) {
    for (let y = 25; y <= 55; y += 1) {
      const s = await stateAt(x, y, z);
      if (!isFluid(s)) continue;
      totalFluid += 1;
      const band = Math.floor(y / 5) * 5;
      byBand.set(band, (byBand.get(band) ?? 0) + 1);
    }
  }
}
console.log(`total fluid cells (y25..55): ${totalFluid}`);
console.log(Object.fromEntries([...byBand.entries()].sort((a, b) => a[0] - b[0])));

// Containment: is any water column open to surface in this box?
let openToSurface = 0;
for (let x = -168; x <= -149; x += 1) {
  for (let z = -417; z <= -386; z += 1) {
    let foundWater = false;
    for (let y = 55; y >= 25; y -= 1) {
      const s = await stateAt(x, y, z);
      if (isFluid(s)) foundWater = true;
      if (foundWater && !isFluid(s)) {
        // A non-fluid above water within the top scan → check if above is air all the way to surface
        let above = s;
        for (let yy = y; yy <= 70; yy += 1) {
          const ss = await stateAt(x, yy, z);
          if (!['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(blockName(ss))) { above = ss; break; }
        }
        break;
      }
    }
    if (foundWater) {
      // check whether any water column reaches near-surface (y>=60)
      for (let y = 60; y <= 63; y += 1) if (isFluid(await stateAt(x, y, z))) openToSurface += 1;
    }
  }
}
console.log(`water cells at y60..63 (surface-open): ${openToSurface}`);
console.log('DONE');
