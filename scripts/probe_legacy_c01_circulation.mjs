#!/usr/bin/env node
/**
 * Measure the legacy C01 lower-level circulation: find 1-wide and 2-wide
 * corridor pinches at walk levels y=99..104 in the interior rooms.
 * READ-ONLY.
 */
import path from 'path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const REGIONS = path.join(ROOT, 'data/worldsnap-r08am-post-20260822T161818Z/region');
const reader = new AnvilReader(REGIONS);
const cache = new Map();
async function block(x, y, z) {
  const k = `${x},${y},${z}`;
  if (!cache.has(k)) cache.set(k, stateToCommandString(await reader.blockState(x, y, z)));
  return cache.get(k);
}
function bn(s) { return String(s ?? '').split('[', 1)[0]; }

const X0 = 158, X1 = 260, Z0 = 139, Z1 = 197;
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);

async function main() {
  // For walk level y=100 and y=103 (two distinct floor levels), compute the
  // horizontal run-length at every air cell to find pinches.
  const grid = new Map();
  for (let y = 93; y <= 112; y++) {
    for (let z = Z0; z <= Z1; z++) {
      for (let x = X0; x <= X1; x++) {
        grid.set(`${x},${y},${z}`, bn(await block(x, y, z)));
      }
    }
  }
  const g = (x, y, z) => grid.get(`${x},${y},${z}`) ?? 'minecraft:out_of_bounds';
  const isAir = (x, y, z) => AIR.has(g(x, y, z));

  for (const y of [100, 103]) {
    console.log(`\n=== WALK LEVEL y=${y}: 1-wide / 2-wide pinches ===`);
    let n1 = 0, n2 = 0;
    for (let z = Z0 + 1; z < Z1; z++) {
      for (let x = X0 + 1; x < X1; x++) {
        if (!isAir(x, y, z)) continue;
        // only interior: support below is solid finished floor
        const below = g(x, y - 1, z);
        if (AIR.has(below)) continue;
        // horizontal clear width in x and z
        let xLeft = 0, xRight = 0;
        while (isAir(x - xLeft - 1, y, z)) xLeft++;
        while (isAir(x + xRight + 1, y, z)) xRight++;
        let zUp = 0, zDown = 0;
        while (isAir(x, y, z - zUp - 1)) zUp++;
        while (isAir(x, y, z + zDown + 1)) zDown++;
        const clearX = xLeft + xRight + 1;
        const clearZ = zUp + zDown + 1;
        const minClear = Math.min(clearX, clearZ);
        if (minClear <= 2) {
          if (minClear === 1) { n1++; console.log(`  [1W] ${x},${y},${z} clearX=${clearX} clearZ=${clearZ} below=${below}`); }
          else if (minClear === 2) { n2++; if (n2 < 120) console.log(`  [2W] ${x},${y},${z} clearX=${clearX} clearZ=${clearZ} below=${below}`); }
        }
      }
    }
    console.log(`  total 1-wide=${n1} 2-wide=${n2}`);
  }
}

main().catch((e) => { console.error(e.stack ?? e); process.exit(1); });
