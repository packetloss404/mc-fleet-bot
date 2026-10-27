#!/usr/bin/env node
/** Read-only focused probe of the RAIL-S2 first-segment service corridor bore.
 *
 * Service corridor (Leg A) interior: x=-254..-236, y=18..23, z=-462..-457.
 * The sealed liner will occupy the six surrounding face sheets:
 *   floor   y=17,  x=-254..-236, z=-462..-457
 *   ceiling y=24,  x=-254..-236, z=-462..-457
 *   north   z=-463, x=-254..-236, y=18..23
 *   south   z=-456, x=-254..-236, y=18..23
 *   west    x=-255, y=18..23, z=-462..-457
 *   east    x=-235, y=18..23, z=-462..-457
 */

import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const SNAPSHOT = process.argv[2] ?? 'data/worldsnap-r08am-post-20260822T161818Z';
const reader = new AnvilReader(path.resolve(ROOT, path.join(SNAPSHOT, 'region')));

const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const sourceState = (state) => state.split('[', 1)[0];
const isFluid = (state) => FLUID.has(sourceState(state)) || state.includes('waterlogged=true');

const CX = { min: -254, max: -236 };
const CY = { min: 18, max: 23 };
const CZ = { min: -462, max: -457 };

const census = new Map();
const interiorFluid = [];
const interiorAir = [];

for (let x = CX.min; x <= CX.max; x += 1) {
  for (let z = CZ.min; z <= CZ.max; z += 1) {
    for (let y = CY.min; y <= CY.max; y += 1) {
      const s = stateToCommandString(await reader.blockState(x, y, z));
      census.set(s, (census.get(s) ?? 0) + 1);
      if (isFluid(s)) interiorFluid.push({ x, y, z, state: s });
      else interiorAir.push({ x, y, z, state: s });
    }
  }
}

console.log('=== INTERIOR (x=-254..-236, y=18..23, z=-462..-457) ===');
console.log(`total=${CX.max - CX.min + 1}x${CY.max - CY.min + 1}x${CZ.max - CZ.min + 1}=${(CX.max - CX.min + 1) * (CY.max - CY.min + 1) * (CZ.max - CZ.min + 1)}`);
console.log(`fluid=${interiorFluid.length} air=${interiorAir.length}`);
console.log('state census:', Object.fromEntries([...census.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))).slice(0, 20)));

const perY = new Map();
for (const cell of interiorFluid) perY.set(cell.y, (perY.get(cell.y) ?? 0) + 1);
console.log('fluid by Y:', Object.fromEntries([...perY.entries()].sort()));

const perZ = new Map();
for (const cell of interiorFluid) perZ.set(cell.z, (perZ.get(cell.z) ?? 0) + 1);
console.log('fluid by Z:', Object.fromEntries([...perZ.entries()].sort()));

const perX = new Map();
for (const cell of interiorFluid) perX.set(cell.x, (perX.get(cell.x) ?? 0) + 1);
console.log('fluid by X:', Object.fromEntries([...perX.entries()].sort()));

async function faceCensus(label, cells) {
  const counts = new Map();
  let fluid = 0;
  const samples = [];
  for (const { x, y, z } of cells) {
    const s = stateToCommandString(await reader.blockState(x, y, z));
    counts.set(s, (counts.get(s) ?? 0) + 1);
    if (isFluid(s)) fluid += 1;
  }
  console.log(`\n=== ${label}: ${cells.length} cells, fluid=${fluid} ===`);
  console.log('census:', Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))).slice(0, 12)));
}

const cellsIn = (b) => {
  const out = [];
  for (let x = b.minX; x <= b.maxX; x += 1) for (let y = b.minY; y <= b.maxY; y += 1) for (let z = b.minZ; z <= b.maxZ; z += 1) out.push({ x, y, z });
  return out;
};

await faceCensus('FLOOR y=17', cellsIn({ minX: -254, maxX: -236, minY: 17, maxY: 17, minZ: -462, maxZ: -457 }));
await faceCensus('CEILING y=24', cellsIn({ minX: -254, maxX: -236, minY: 24, maxY: 24, minZ: -462, maxZ: -457 }));
await faceCensus('NORTH wall z=-463', cellsIn({ minX: -254, maxX: -236, minY: 18, maxY: 23, minZ: -463, maxZ: -463 }));
await faceCensus('SOUTH wall z=-456', cellsIn({ minX: -254, maxX: -236, minY: 18, maxY: 23, minZ: -456, maxZ: -456 }));
await faceCensus('WEST cap x=-255', cellsIn({ minX: -255, maxX: -255, minY: 18, maxY: 23, minZ: -462, maxZ: -457 }));
await faceCensus('EAST cap x=-235', cellsIn({ minX: -235, maxX: -235, minY: 18, maxY: 23, minZ: -462, maxZ: -457 }));

// Also survey the water body above/around: column profile at a few points to
// understand the lake level and source structure.
console.log('\n=== VERTICAL PROFILES (x,z -> states y=30..14) ===');
for (const [x, z] of [[-245, -460], [-245, -450], [-242, -455], [-245, -430], [-240, -420], [-245, -420], [-250, -440], [-237, -460], [-238, -430]]) {
  const col = [];
  for (let y = 30; y >= 14; y -= 1) {
    const s = sourceState(stateToCommandString(await reader.blockState(x, y, z)));
    col.push(`${y}=${s.replace('minecraft:', '')}`);
  }
  console.log(`(${x},${z}): ${col.join(' ')}`);
}
