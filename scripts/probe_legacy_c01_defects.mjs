#!/usr/bin/env node
/**
 * Hunt for genuine defects in legacy C01: holes in finished floor planes,
 * and enclosed rooms with unpaved (dirt/grass) floors. READ-ONLY.
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

const X0 = 158, X1 = 260, Z0 = 139, Z1 = 197, Y0 = 93, Y1 = 117;
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FINISHED_FLOOR = new Set([
  'minecraft:dark_oak_planks', 'minecraft:oak_planks', 'minecraft:spruce_planks',
  'minecraft:smooth_quartz', 'minecraft:quartz_block', 'minecraft:quartz_bricks',
  'minecraft:polished_andesite', 'minecraft:polished_deepslate', 'minecraft:deepslate_tiles',
  'minecraft:deepslate_bricks', 'minecraft:stone_bricks', 'minecraft:polished_blackstone',
  'minecraft:polished_blackstone_bricks', 'minecraft:smooth_stone', 'minecraft:stone',
  'minecraft:gray_concrete', 'minecraft:white_concrete', 'minecraft:light_gray_concrete',
  'minecraft:red_nether_bricks', 'minecraft:quartz_pillar', 'minecraft:dark_oak_log',
]);

async function main() {
  // Preload all states for the box
  const grid = new Map();
  for (let y = Y0; y <= Y1; y++) {
    for (let z = Z0; z <= Z1; z++) {
      for (let x = X0; x <= X1; x++) {
        grid.set(`${x},${y},${z}`, bn(await block(x, y, z)));
      }
    }
  }
  const g = (x, y, z) => grid.get(`${x},${y},${z}`);
  const isAir = (x, y, z) => AIR.has(g(x, y, z));

  // 1. Holes in finished floor planes: air cell whose 4 planar neighbors are
  //    solid AND the cell below is a finished floor AND above is air.
  console.log('=== CANDIDATE FLOOR HOLES (air in finished floor plane) ===');
  let holeCount = 0;
  for (let y = Y0 + 1; y <= Y1; y++) {
    for (let z = Z0 + 1; z < Z1; z++) {
      for (let x = X0 + 1; x < X1; x++) {
        if (!isAir(x, y, z)) continue;
        const nb = [g(x - 1, y, z), g(x + 1, y, z), g(x, y, z - 1), g(x, y, z + 1)];
        const nbrSolid = nb.every((s) => !AIR.has(s));
        if (!nbrSolid) continue;
        const below = g(x, y - 1, z);
        const belowSolidFinished = !AIR.has(below);
        const above = g(x, y + 1, z);
        if (belowSolidFinished && isAir(x, y + 1, z)) {
          console.log(`${x},${y},${z}  below=${below}  nb=[${nb.join('|')}]`);
          holeCount++;
        }
      }
    }
  }
  console.log(`holes: ${holeCount}`);

  // 2. Enclosed rooms with unpaved floors: air cells at feet level whose 4
  //    neighbors are solid and whose support is dirt/grass/gravel (unpaved).
  console.log('\n=== UNPAVED FLOOR CELLS (standable air over dirt/grass) ===');
  const unpaved = [];
  for (let y = Y0 + 1; y <= Y1; y++) {
    for (let z = Z0 + 1; z < Z1; z++) {
      for (let x = X0 + 1; x < X1; x++) {
        if (!isAir(x, y, z)) continue;
        const support = g(x, y - 1, z);
        if (!['minecraft:dirt', 'minecraft:grass_block', 'minecraft:coarse_dirt', 'minecraft:gravel', 'minecraft:sand'].includes(support)) continue;
        const above = isAir(x, y + 1, z);
        if (!above) continue;
        // count 3x3 air region to see room scale
        unpaved.push({ x, y, z, support });
      }
    }
  }
  // cluster by contiguous y,x,z
  console.log(`unpaved air-over-dirt cells: ${unpaved.length}`);
  // print a compressed listing grouped by y
  const byY = {};
  for (const u of unpaved) {
    (byY[u.y] = byY[u.y] ?? []).push(`${u.x},${u.z}`);
  }
  for (const [y, cells] of Object.entries(byY)) {
    console.log(`  y=${y}: ${cells.length} cells, sample=${cells.slice(0, 30).join(' ')}${cells.length > 30 ? ' …' : ''}`);
  }
}

main().catch((e) => { console.error(e.stack ?? e); process.exit(1); });
