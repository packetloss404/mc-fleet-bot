#!/usr/bin/env node
/** Read-only probe of the CIRC-OBS-GALLERY-01 route geometry. */

import path from 'node:path';
import {
  AnvilReader,
  stateToCommandString,
  cellKey,
} from './lib/combined_zones_release_lib.mjs';

const SNAPSHOT = process.argv[2] ?? 'data/worldsnap-obs-gallery-source-20260824T150744Z';
const reader = new AnvilReader(path.resolve(SNAPSHOT, 'region'));

const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const DEADLY = new Set(['minecraft:lava', 'minecraft:fire', 'minecraft:cactus', 'minecraft:magma_block']);
const PASSABLE_EXACT = new Set([
  'minecraft:snow', 'minecraft:short_grass', 'minecraft:tall_grass', 'minecraft:fern',
  'minecraft:large_fern', 'minecraft:dead_bush', 'minecraft:lantern', 'minecraft:soul_lantern',
  'minecraft:chain', 'minecraft:iron_chain', 'minecraft:end_rod', 'minecraft:light',
  'minecraft:flower_pot', 'minecraft:lever', 'minecraft:tripwire', 'minecraft:cobweb',
]);
const PASSABLE_SUFFIX = ['_carpet', '_banner', '_sign', '_button', '_torch', '_rail', '_pressure_plate', '_sapling'];
const baseName = (state) => String(state ?? '').split('[', 1)[0];
const passable = (state) => {
  const name = baseName(state);
  if (AIR.has(name)) return true;
  if (DEADLY.has(name)) return false;
  if (PASSABLE_EXACT.has(name)) return true;
  if (PASSABLE_SUFFIX.some((s) => name.endsWith(s))) return true;
  if (name.endsWith('_door') || name.endsWith('_fence_gate')) return true;
  return false;
};
const footing = (state) => {
  const name = baseName(state);
  if (AIR.has(name) || DEADLY.has(name)) return false;
  if (name.endsWith('_carpet')) return false;
  if (name.endsWith('_fence') || name.endsWith('_wall') || name.endsWith('_pane')) return false;
  return !passable(state) || name.endsWith('_slab') || name.endsWith('_stairs');
};

const cache = new Map();
const stateAt = async (x, y, z) => {
  const key = cellKey({ x, y, z });
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(x, y, z)));
  return cache.get(key);
};
const standable = async (x, y, z) => {
  const feet = await stateAt(x, y, z);
  const head = await stateAt(x, y + 1, z);
  const support = await stateAt(x, y - 1, z);
  return passable(feet) && passable(head) && footing(support);
};

async function main() {
  console.log('=== Start anchor box standable cells (x=214..218, y=105..111, z=151..156) ===');
  for (let y = 105; y <= 111; y += 1) {
    for (let z = 151; z <= 156; z += 1) {
      for (let x = 214; x <= 218; x += 1) {
        if (await standable(x, y, z)) {
          console.log(`STANDABLE (${x},${y},${z})  feet=${await stateAt(x, y, z)} support=${await stateAt(x, y - 1, z)} head=${await stateAt(x, y + 1, z)}`);
        }
      }
    }
  }

  console.log('\n=== Column solid census x=220..232, z=145..160, y=98..112 ===');
  for (let x = 220; x <= 232; x += 1) {
    for (let z = 145; z <= 160; z += 1) {
      const solids = [];
      for (let y = 98; y <= 112; y += 1) {
        const s = await stateAt(x, y, z);
        if (!AIR.has(baseName(s))) solids.push(`${y}=${baseName(s)}`);
      }
      if (solids.length) console.log(`(${x},_,${z}): ${solids.join(', ')}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
