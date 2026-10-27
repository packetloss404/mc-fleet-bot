#!/usr/bin/env node
/** Read-only probe of the Westlight rail corridor water body.
 *
 * Maps every fluid / waterlogged / bubble-column cell in
 * x=-254..-156, z=-462..-387, y=15..30 against the accepted r08am post
 * snapshot, and reports the extent by column and by water body source state.
 */

import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const SNAPSHOT = process.argv[2] ?? 'data/worldsnap-r08am-post-20260822T161818Z';
const reader = new AnvilReader(path.resolve(ROOT, path.join(SNAPSHOT, 'region')));

const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const sourceState = (state) => state.split('[', 1)[0];
const isFluid = (state) => FLUID.has(sourceState(state)) || state.includes('waterlogged=true');

const X = { min: -254, max: -156 };
const Z = { min: -462, max: -387 };
const Y = { min: 15, max: 30 };

const cells = [];
const columns = new Map();
const stateCensus = new Map();
const waterCensus = new Map();
let bubbleCount = 0;
let fluidCells = 0;

for (let x = X.min; x <= X.max; x += 1) {
  for (let z = Z.min; z <= Z.max; z += 1) {
    for (let y = Y.min; y <= Y.max; y += 1) {
      const s = stateToCommandString(await reader.blockState(x, y, z));
      if (!isFluid(s)) continue;
      cells.push({ x, y, z, state: s });
      fluidCells += 1;
      stateCensus.set(s, (stateCensus.get(s) ?? 0) + 1);
      if (s.startsWith('minecraft:water')) {
        const level = s.includes('level=') ? s.match(/level=(\d+)/)?.[1] : '?';
        waterCensus.set(`water@level${level}`, (waterCensus.get(`water@level${level}`) ?? 0) + 1);
      }
      if (s.startsWith('minecraft:bubble_column')) bubbleCount += 1;
      const key = `${x},${z}`;
      if (!columns.has(key)) columns.set(key, []);
      columns.get(key).push(y);
    }
  }
}

const counts = (map) => Object.fromEntries(
  [...map.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))),
);

console.log(`\n=== WATER BODY EXTENT (x=${X.min}..${X.max}, z=${Z.min}..${Z.max}, y=${Y.min}..${Y.max}) ===`);
console.log(`Total fluid cells: ${fluidCells}`);
console.log(`Bubble columns: ${bubbleCount}`);
console.log('\nState census:');
console.log(counts(stateCensus));
console.log('\nWater level census:');
console.log(counts(waterCensus));
console.log(`\nColumns touched: ${columns.size} of ${(X.max - X.min + 1) * (Z.max - Z.min + 1)}`);

// Per-column water extent (y ranges)
const rangeSummary = new Map();
for (const [key, ys] of columns) {
  ys.sort((a, b) => a - b);
  const ranges = [];
  let start = ys[0], prev = ys[0];
  for (let i = 1; i <= ys.length; i += 1) {
    if (i === ys.length || ys[i] !== prev + 1) {
      ranges.push(`${start}..${prev}`);
      start = ys[i];
    }
    prev = ys[i];
  }
  rangeSummary.set(key, ranges.join(','));
}

// Show water distribution by x band (18-block segments)
console.log('\n=== WATER BY X-BAND (columns with water, y ranges) ===');
const bands = [];
for (let bx = X.min; bx <= X.max; bx += 18) {
  const bandEnd = Math.min(X.max, bx + 17);
  let colCount = 0;
  let cellCount = 0;
  for (const [key, ranges] of rangeSummary) {
    const [x] = key.split(',').map(Number);
    if (x >= bx && x <= bandEnd) { colCount += 1; cellCount += ranges.split(',').reduce((s, r) => s + (Number(r.split('..')[1]) - Number(r.split('..')[0]) + 1), 0); }
  }
  bands.push({ band: `${bx}..${bandEnd}`, colCount, cellCount });
  console.log(`x=${bx}..${bandEnd}: ${colCount} columns / ${cellCount} water cells`);
}

// Detailed per-column dump for the first-segment corridor x=-254..-236
console.log('\n=== FIRST SEGMENT (x=-254..-236) WATER COLUMNS ===');
let segCells = 0;
for (let x = -254; x <= -236; x += 1) {
  const rows = [];
  for (let z = Z.min; z <= Z.max; z += 1) {
    const key = `${x},${z}`;
    if (!columns.has(key)) continue;
    rows.push(`z=${z}:${rangeSummary.get(key)}`);
  }
  if (rows.length) {
    segCells += rows.reduce((s, r) => s + r.split(':')[1].split(',').reduce((a, b) => a + (Number(b.split('..')[1]) - Number(b.split('..')[0]) + 1), 0), 0);
    console.log(`x=${x}: ${rows.join('  ')}`);
  }
}
console.log(`\nFirst-segment water cells: ${segCells}`);
