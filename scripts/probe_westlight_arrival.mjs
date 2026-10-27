#!/usr/bin/env node
/** Read-only probe of the Westlight arrival / Approach Road area. */

import path from 'node:path';
import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const SNAPSHOT = process.argv[2] ?? 'data/worldsnap-r08am-post-20260822T161818Z';
const reader = new AnvilReader(path.resolve(ROOT, path.join(SNAPSHOT, 'region')));

const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);

async function state(x, y, z) {
  return stateToCommandString(await reader.blockState(x, y, z));
}

// Find the local ground surface Y (first non-air from the top) per column.
async function surface(x, z, fromY = 110, toY = 40) {
  for (let y = fromY; y >= toY; y -= 1) {
    const s = await state(x, y, z);
    if (!AIR.has(s)) return { y, state: s };
  }
  return { y: null, state: null };
}

async function probeRow(z, xs, label) {
  console.log(`\n=== ${label} (z=${z}) ===`);
  for (const x of xs) {
    const surf = await surface(x, z);
    const up = surf.y === null ? '' : `| y+1=${await state(x, surf.y + 1, z)} | y+2=${await state(x, surf.y + 2, z)}`;
    const down = surf.y === null ? '' : `| y-1=${await state(x, surf.y - 1, z)}`;
    console.log(`x=${x} ${surf.state ?? 'VOID'} @y=${surf.y} ${down} ${up}`);
  }
}

// Road centerline from survey: z around -486..-500 going east (x increases) into Westlight.
// Probe columns north (-z) and south (+z) of the road too.
for (const z of [-486, -490, -493, -496, -498, -500, -503, -506, -509, -513]) {
  const xs = [];
  for (let x = -344; x <= -148; x += 4) xs.push(x);
  await probeRow(z, xs, `centerline-near`);
}

// Pedestrian-edge candidate: immediately north of the road (-z side), z-1 offset.
// Also probe the specific plaza area near Gatehead (-334,-484) and the venue entry (-359,-498).
console.log('\n=== Detailed plaza columns (x/z) ===');
for (const [x, z] of [[-344, -484], [-344, -486], [-340, -486], [-334, -484], [-334, -486], [-334, -490],
  [-320, -490], [-326, -500], [-316, -474], [-316, -482], [-326, -484], [-359, -498], [-354, -498]]) {
  const surf = await surface(x, z);
  const below = surf.y === null ? '' : await state(x, surf.y - 1, z);
  const up1 = surf.y === null ? '' : await state(x, surf.y + 1, z);
  const up2 = surf.y === null ? '' : await state(x, surf.y + 2, z);
  console.log(`(${x},${z}) surface=${surf.state}@y=${surf.y} below=${below} up1=${up1} up2=${up2}`);
}

// Road-edge look: for a few centerline columns, dump the blocks one step north/south of road.
console.log('\n=== Road edge columns (z shifts around centerline z) ===');
for (const x of [-344, -340, -334, -330, -320, -300, -280, -260, -240, -220, -200, -180, -160, -148]) {
  const surf = await surface(x, -486);
  const y = surf.y ?? 68;
  const row = [];
  for (let z = -510; z <= -478; z += 1) {
    row.push(`z=${z}:${await state(x, y, z)}`);
  }
  console.log(`x=${x} y=${y} :: ${row.join(' ')}`);
}

// Vertical profile across the road for a few stations: dump surface along z for fixed x.
console.log('\n=== Cross-section surface profile (y of first solid, z from -520..-475) ===');
for (const x of [-344, -330, -320, -300, -260, -220, -200, -160]) {
  const cols = [];
  for (let z = -520; z <= -475; z += 2) {
    const s = await surface(x, z);
    cols.push(`${z}=${s.y ?? 'V'}`);
  }
  console.log(`x=${x}: ${cols.join(' ')}`);
}
