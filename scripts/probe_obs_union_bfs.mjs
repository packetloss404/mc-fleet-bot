#!/usr/bin/env node
/** Read-only full union-flood analysis of the CIRC-OBS-GALLERY-01 route. */

import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

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
const isDoor = (name) => name.endsWith('_door') || name.endsWith('_fence_gate');
const passable = (state) => {
  const name = baseName(state);
  if (AIR.has(name)) return true;
  if (DEADLY.has(name)) return false;
  if (PASSABLE_EXACT.has(name)) return true;
  if (PASSABLE_SUFFIX.some((s) => name.endsWith(s))) return true;
  if (isDoor(name)) return true;
  if (name.endsWith('_trapdoor')) return false;
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
  const k = `${x},${y},${z}`;
  if (!cache.has(k)) cache.set(k, stateToCommandString(await reader.blockState(x, y, z)));
  return cache.get(k);
};
const standable = async (x, y, z) => {
  const feet = await stateAt(x, y, z);
  const head = await stateAt(x, y + 1, z);
  const support = await stateAt(x, y - 1, z);
  return passable(feet) && passable(head) && footing(support);
};

const SEARCH = { minX: 208, maxX: 273, minY: 77, maxY: 116, minZ: 121, maxZ: 190 };
const inside = (x, y, z) => x >= SEARCH.minX && x <= SEARCH.maxX && y >= SEARCH.minY && y <= SEARCH.maxY && z >= SEARCH.minZ && z <= SEARCH.maxZ;
const pk = (x, y, z) => `${x},${y},${z}`;

async function floodFrom(seeds) {
  const seen = new Set();
  const queue = [];
  for (const s of seeds) {
    const k = pk(s[0], s[1], s[2]);
    if (!seen.has(k) && await standable(s[0], s[1], s[2])) { seen.add(k); queue.push(s); }
  }
  const floorCells = new Map();
  let cursor = 0;
  while (cursor < queue.length) {
    const [x, y, z] = queue[cursor++];
    floorCells.set(pk(x, y, z), { x, y, z });
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (const dy of [0, 1, -1]) {
        const nx = x + dx; const ny = y + dy; const nz = z + dz;
        const key = pk(nx, ny, nz);
        if (seen.has(key) || !inside(nx, ny, nz)) continue;
        if (await standable(nx, ny, nz)) {
          seen.add(key);
          queue.push([nx, ny, nz]);
        }
      }
    }
  }
  return [...floorCells.values()];
}

async function main() {
  const startSeeds = [];
  const endSeeds = [];
  for (let y = 105; y <= 111; y += 1) for (let z = 151; z <= 156; z += 1) for (let x = 214; x <= 218; x += 1) {
    if (await standable(x, y, z)) startSeeds.push([x, y, z]);
  }
  for (let y = 79; y <= 87; y += 1) for (let z = 153; z <= 164; z += 1) for (let x = 231; x <= 249; x += 1) {
    if (await standable(x, y, z)) endSeeds.push([x, y, z]);
  }
  console.log(`start seeds: ${startSeeds.length}`);
  console.log(`end seeds: ${endSeeds.length}`);

  const startComp = await floodFrom(startSeeds);
  const endComp = await floodFrom(endSeeds);
  const startKeys = new Set(startComp.map(({ x, y, z }) => pk(x, y, z)));
  const endKeys = new Set(endComp.map(({ x, y, z }) => pk(x, y, z)));
  console.log(`Start union component: ${startComp.length} cells`);
  console.log(`End union component: ${endComp.length} cells`);
  console.log(`Overlap: ${startComp.filter(({ x, y, z }) => endKeys.has(pk(x, y, z))).length}`);
  console.log(`End seeds reached from start: ${endSeeds.filter(([x, y, z]) => startKeys.has(pk(x, y, z))).length}`);

  // Start component cells near the seal region (x 219..232, z 145..160, y 98..112)
  const nearSeal = startComp.filter(({ x, y, z }) => x >= 219 && x <= 232 && y >= 98 && y <= 112 && z >= 145 && z <= 160)
    .sort((a, b) => a.x - b.x || a.z - b.z || a.y - b.y);
  console.log(`\nStart component cells in x=219..232, y=98..112, z=145..160: ${nearSeal.length}`);
  for (const c of nearSeal) {
    console.log(`(${c.x},${c.y},${c.z}) feet=${await stateAt(c.x, c.y, c.z)} support=${await stateAt(c.x, c.y - 1, c.z)}`);
  }

  // End component cells near the seal (y>=90, x<=232)
  const endNear = endComp.filter(({ x, y }) => x <= 232 && y >= 90).sort((a, b) => b.y - a.y || a.x - b.x || a.z - b.z);
  console.log(`\nEnd component cells with y>=90, x<=232: ${endNear.length}`);
  for (const c of endNear) {
    console.log(`(${c.x},${c.y},${c.z}) feet=${await stateAt(c.x, c.y, c.z)} support=${await stateAt(c.x, c.y - 1, c.z)}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
