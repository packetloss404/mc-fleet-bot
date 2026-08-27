#!/usr/bin/env node
/** Read-only probe of the Ravensreach (PR-W04) station access-shaft area.
 *
 * Maps every fluid / waterlogged / bubble-column cell and the column surface
 * profile around the RR-SC-1/RR-SC-2 candidate plateaus and the RR-SE-1 /
 * RR-SE-2 service-shaft datums, then localizes the y35-37 water pocket and
 * reports whether it is a contained pool or an open water body.
 */

import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const SNAPSHOT = process.argv[2] ?? 'data/worldsnap-r08am-post-20260822T161818Z';
const reader = new AnvilReader(path.resolve(ROOT, path.join(SNAPSHOT, 'region')));

const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const blockName = (state) => state.split('[', 1)[0];
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');

const stateAt = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));

// --- 1. RR-SC-1 / RR-SC-2 plateau + shaft envelope fluid census -------------
const SHAFT_PADS = [
  { id: 'RR-SE-1', x: -158, z: -390 },
  { id: 'RR-SE-2', x: -156, z: -392 },
];
const PLATEAU_SC1 = { minX: -162, maxX: -150, minZ: -400, maxZ: -388 };
const PLATEAU_SC2 = { minX: -166, maxX: -154, minZ: -410, maxZ: -398 };

const fluidByY = new Map();
const surfaceByColumn = new Map();
const pocketColumns = new Map();

for (let x = PLATEAU_SC2.minX - 6; x <= PLATEAU_SC1.maxX + 6; x += 1) {
  for (let z = PLATEAU_SC2.minZ - 6; z <= PLATEAU_SC1.maxZ + 6; z += 1) {
    let surface = -64;
    for (let y = 80; y >= -64; y -= 1) {
      const s = await stateAt(x, y, z);
      if (!['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(blockName(s))) {
        surface = y;
        break;
      }
    }
    surfaceByColumn.set(`${x},${z}`, surface);
    for (let y = 10; y <= 70; y += 1) {
      const s = await stateAt(x, y, z);
      if (!isFluid(s)) continue;
      fluidByY.set(y, (fluidByY.get(y) ?? 0) + 1);
      const key = `${x},${z}`;
      if (!pocketColumns.has(key)) pocketColumns.set(key, []);
      pocketColumns.get(key).push(y);
    }
  }
}

console.log(`\n=== RAVENSREACH SHAFT-PLATEAU FLUID CENSUS (y10..70) ===`);
console.log('Fluid cells by Y:');
console.log(Object.fromEntries([...fluidByY.entries()].sort((a, b) => a[0] - b[0])));
console.log(`\nTotal columns with fluid: ${pocketColumns.size}`);

const summarize = (key) => {
  const ys = pocketColumns.get(key) ?? [];
  if (!ys.length) return 'none';
  ys.sort((a, b) => a - b);
  const ranges = [];
  let start = ys[0]; let prev = ys[0];
  for (let i = 1; i <= ys.length; i += 1) {
    if (i === ys.length || ys[i] !== prev + 1) {
      ranges.push(`${start}..${prev}`);
      start = ys[i];
    }
    prev = ys[i];
  }
  return ranges.join(',');
};

console.log(`\n=== FLUID COLUMNS IN THE TWO SHAFT PADS (3x3 around each datum) ===`);
for (const pad of SHAFT_PADS) {
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      const x = pad.x + dx; const z = pad.z + dz;
      const key = `${x},${z}`;
      const surf = surfaceByColumn.get(key);
      console.log(`pad=${pad.id} (${x},${z}) surfaceY=${surf} fluid=${summarize(key)}`);
    }
  }
}

console.log(`\n=== FLUID COLUMNS WITH y35-37 WATER (full plateau) ===`);
let pocketCellCount = 0;
const pocketCells = [];
for (const [key, ys] of pocketColumns) {
  const inPocket = ys.filter((y) => y >= 33 && y <= 39);
  if (!inPocket.length) continue;
  const [x, z] = key.split(',').map(Number);
  for (const y of inPocket) {
    pocketCells.push({ x, y, z });
    pocketCellCount += 1;
  }
  console.log(`(${key}) fluid=${summarize(key)} surfaceY=${surfaceByColumn.get(key)}`);
}
console.log(`\ny33-39 fluid cells: ${pocketCellCount}`);
const xs = pocketCells.map((c) => c.x);
const zs = pocketCells.map((c) => c.z);
if (pocketCells.length) {
  console.log(`pocket bounds x=${Math.min(...xs)}..${Math.max(...xs)} z=${Math.min(...zs)}..${Math.max(...zs)}`);
}

// --- 2. Water body connectivity: is the y35-37 pocket contained? -------------
// For each water column touching y35-37, trace up/down to see if it connects to
// an open surface body (a lake) or is a sealed pocket enclosed by solid rock.
console.log(`\n=== POCKET CONTAINMENT ANALYSIS ===`);
const containment = [];
for (const key of new Set(pocketCells.map((c) => `${c.x},${c.z}`))) {
  const [x, z] = key.split(',').map(Number);
  const ys = pocketColumns.get(key).sort((a, b) => a - b);
  const surface = surfaceByColumn.get(key);
  const minY = ys[0]; const maxY = ys[ys.length - 1];
  const topSolid = await stateAt(x, maxY + 1, z);
  const bottomSolid = await stateAt(x, minY - 1, z);
  const isOpenToSurface = maxY + 1 >= surface;
  const sideChecks = [];
  for (const [sx, sz] of [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]) {
    for (const y of ys) {
      const s = await stateAt(sx, y, z);
      if (isFluid(s)) { sideChecks.push(`${sx},${y},${sz}:${blockName(s)}`); break; }
    }
  }
  containment.push({
    column: key, yRange: `${minY}..${maxY}`, surfaceY: surface,
    topBlock: blockName(topSolid), bottomBlock: blockName(bottomSolid),
    isOpenToSurface, connectingSides: sideChecks,
  });
}
for (const c of containment) console.log(JSON.stringify(c));

// --- 3. Surface profile for a clean shaft path --------------------------------
console.log(`\n=== SURFACE PROFILE: potential clean shaft lines ===`);
// Line from corridor head (x=-160, z=-387 area) up to each candidate plateau.
for (const start of [
  { id: 'corridor-head', x: -158, z: -387 },
  { id: 'corridor-head-2', x: -156, z: -389 },
]) {
  for (const end of SHAFT_PADS) {
    const fluidXs = [];
    let x = start.x; let z = start.z;
    const steps = Math.max(Math.abs(end.x - start.x), Math.abs(end.z - start.z));
    for (let i = 0; i <= steps; i += 1) {
      const cx = Math.round(start.x + ((end.x - start.x) * i) / steps);
      const cz = Math.round(start.z + ((end.z - start.z) * i) / steps);
      const fluidYs = (pocketColumns.get(`${cx},${cz}`) ?? []).slice();
      if (fluidYs.length) fluidXs.push(`${cx},${cz}:y${fluidYs.join(',')}`);
    }
    console.log(`${start.id}->${end.id} (${end.x},${end.z}): fluid=${fluidXs.length ? fluidXs.join(' ') : 'none'}`);
  }
}

console.log(`\nDONE`);
