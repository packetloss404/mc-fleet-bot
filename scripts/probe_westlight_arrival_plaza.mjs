#!/usr/bin/env node
/** Probe the Westlight arrival / Gatehead plaza / venue-entry transition. */

import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const SNAPSHOT = process.argv[2] ?? 'data/worldsnap-r08am-post-20260822T161818Z';
const reader = new AnvilReader(path.resolve(ROOT, path.join(SNAPSHOT, 'region')));

const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);

async function state(x, y, z) {
  return stateToCommandString(await reader.blockState(x, y, z));
}

async function surface(x, z, fromY = 110, toY = 40) {
  for (let y = fromY; y >= toY; y -= 1) {
    const s = await state(x, y, z);
    if (!AIR.has(s)) return { y, state: s };
  }
  return { y: null, state: null };
}

// The Westlight plaza region + Gatehead + venue entry approach.
// Plaza at x=-323..-333, y75-76; Gatehead House at x=-334..-320 z=-492..-476;
// venue entry (-359,-498).
console.log('=== Westlight plaza / arrival deck surface map (x=-350..-315, z=-514..-474) ===');
for (let z = -514; z <= -474; z += 4) {
  const cols = [];
  for (let x = -350; x <= -315; x += 1) {
    const s = await surface(x, z);
    cols.push(s.y === null ? 'V' : (s.state.includes('concrete') ? '#' : (AIR.has(s.state) ? '·' : 'o')));
  }
  console.log(`z=${z}: ${cols.join('')}`);
}

console.log('\n=== Gatehead House boundary + arrival deck detail ===');
// Gatehead House x=-334..-320 z=-492..-476. Entrance -334,68,-484.
for (let x = -350; x <= -315; x += 1) {
  const s = await surface(x, -484);
  const up = s.y === null ? '' : ` y+1=${await state(x, s.y + 1, -484)}`;
  console.log(`x=${x} z=-484: ${s.state ?? 'VOID'}@y=${s.y}${up}`);
}

console.log('\n=== Venue entry approach (-364..-344, z=-512..-490) ===');
for (let z = -512; z <= -490; z += 2) {
  const cols = [];
  for (let x = -364; x <= -344; x += 1) {
    const s = await surface(x, z);
    cols.push(s.y === null ? 'V' : s.state.split('[',1)[0].replace('minecraft:','').slice(0,1));
  }
  console.log(`z=${z}: ${cols.join('')}`);
}

console.log('\n=== Arrival deck east side: x=-322..-317, z=-513..-489 columns ===');
for (let x = -322; x <= -317; x += 1) {
  for (let z = -513; z <= -489; z += 2) {
    const s = await surface(x, z);
    console.log(`(${x},${z}): ${s.state ?? 'VOID'}@y=${s.y}`);
  }
}
