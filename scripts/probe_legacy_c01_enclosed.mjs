#!/usr/bin/env node
/**
 * Refined defect probe: find enclosed interior air rooms (air regions fully
 * bounded by solid walls + solid floor/ceiling) whose floor is unpaved
 * (dirt/grass/gravel) instead of a finished floor material. READ-ONLY.
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

async function main() {
  const grid = new Map();
  for (let y = Y0; y <= Y1; y++) {
    for (let z = Z0; z <= Z1; z++) {
      for (let x = X0; x <= X1; x++) {
        grid.set(`${x},${y},${z}`, bn(await block(x, y, z)));
      }
    }
  }
  const g = (x, y, z) => grid.get(`${x},${y},${z}`);
  const isAir = (x, y, z) => x >= X0 && x <= X1 && y >= Y0 && y <= Y1 && z >= Z0 && z <= Z1 && AIR.has(g(x, y, z));

  // Flood-fill air regions per Y slice, then classify each region.
  const results = [];
  for (let y = Y0; y <= Y1; y++) {
    const visited = new Set();
    for (let z = Z0; z <= Z1; z++) {
      for (let x = X0; x <= X1; x++) {
        if (!isAir(x, y, z)) continue;
        const key = `${x},${z}`;
        if (visited.has(key)) continue;
        // BFS
        const comp = [];
        const queue = [[x, z]];
        visited.add(key);
        let edge = false;
        let fluidOrWater = false;
        while (queue.length) {
          const [cx, cz] = queue.pop();
          comp.push([cx, cz]);
          if (cx === X0 || cx === X1 || cz === Z0 || cz === Z1) edge = true;
          for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + dx, nz = cz + dz;
            if (nx < X0 || nx > X1 || nz < Z0 || nz > Z1) { edge = true; continue; }
            if (!isAir(nx, y, nz)) continue;
            const nk = `${nx},${nz}`;
            if (visited.has(nk)) continue;
            visited.add(nk);
            queue.push([nx, nz]);
          }
        }
        // Only consider enclosed regions (not touching box edge) and >= 8 cells
        if (edge || comp.length < 8) continue;
        // Floor material under each cell
        const floorStates = new Set();
        const supportAbove = new Set();
        for (const [cx, cz] of comp) {
          const below = g(cx, y - 1, cz);
          if (!AIR.has(below)) floorStates.add(below);
          const above = isAir(cx, y + 1, cz) ? 'air' : g(cx, y + 1, cz);
          supportAbove.add(above);
        }
        const unpaved = [...floorStates].filter((s) =>
          ['minecraft:dirt', 'minecraft:grass_block', 'minecraft:coarse_dirt',
            'minecraft:gravel', 'minecraft:sand', 'minecraft:stone'].includes(s));
        // floor is "finished" if it has planks/quartz/deepslate/concrete/stone_bricks/polished_andesite
        const finished = [...floorStates].filter((s) => !AIR.has(s)
          && !['minecraft:dirt', 'minecraft:grass_block', 'minecraft:coarse_dirt',
            'minecraft:gravel', 'minecraft:sand', 'minecraft:stone', 'minecraft:water',
            'minecraft:flowing_water', 'minecraft:lava'].includes(s));
        if (unpaved.length && unpaved.length >= comp.length / 2) {
          results.push({
            y, size: comp.length,
            unpaved: unpaved.length, unpavedStates: [...new Set(unpaved)].slice(0, 4),
            finishedFloor: [...new Set(finished)].slice(0, 6),
            allFloor: [...new Set(floorStates)].slice(0, 8),
            bounds: {
              minX: Math.min(...comp.map((c) => c[0])), maxX: Math.max(...comp.map((c) => c[0])),
              minZ: Math.min(...comp.map((c) => c[1])), maxZ: Math.max(...comp.map((c) => c[1])),
            },
          });
        }
      }
    }
  }
  results.sort((a, b) => b.y - a.y);
  for (const r of results) {
    console.log(`y=${r.y} region ${r.size} cells bounds x${r.bounds.minX}..${r.bounds.maxX} z${r.bounds.minZ}..${r.bounds.maxZ}`);
    console.log(`   unpaved=${r.unpaved} states=[${r.unpavedStates.join('|')}] finishedFloor=[${r.finishedFloor.join('|')}] allFloor=[${r.allFloor.join('|')}]`);
  }
}

main().catch((e) => { console.error(e.stack ?? e); process.exit(1); });
