#!/usr/bin/env node
/**
 * Definitive scan: find every fully-enclosed air region in the legacy C01 box
 * at every Y level, regardless of floor type, to catch any genuinely empty or
 * unfinished interior void. READ-ONLY.
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
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);

const X0 = 158, X1 = 260, Z0 = 139, Z1 = 197, Y0 = 93, Y1 = 117;

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

  for (let y = Y0; y <= Y1; y++) {
    const visited = new Set();
    const regions = [];
    for (let z = Z0; z <= Z1; z++) {
      for (let x = X0; x <= X1; x++) {
        if (!isAir(x, y, z)) continue;
        const key = `${x},${z}`;
        if (visited.has(key)) continue;
        const comp = [];
        const queue = [[x, z]];
        visited.add(key);
        let edge = false;
        let fluidBelow = false;
        const floorStates = new Set();
        while (queue.length) {
          const [cx, cz] = queue.pop();
          comp.push([cx, cz]);
          if (cx === X0 || cx === X1 || cz === Z0 || cz === Z1) edge = true;
          const below = g(cx, y - 1, cz);
          if (below === 'minecraft:water' || below === 'minecraft:lava') fluidBelow = true;
          if (!AIR.has(below)) floorStates.add(below);
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
        if (edge) continue;
        regions.push({
          size: comp.length,
          bounds: {
            minX: Math.min(...comp.map((c) => c[0])), maxX: Math.max(...comp.map((c) => c[0])),
            minZ: Math.min(...comp.map((c) => c[1])), maxZ: Math.max(...comp.map((c) => c[1])),
          },
          floorStates: [...new Set(floorStates)].slice(0, 8),
          fluidBelow,
        });
      }
    }
    for (const r of regions) {
      console.log(`y=${y} enclosed ${r.size} cells x${r.bounds.minX}..${r.bounds.maxX} z${r.bounds.minZ}..${r.bounds.maxZ} floor=[${r.floorStates.join('|')}]${r.fluidBelow ? ' FLUID-BELOW' : ''}`);
    }
  }
}

main().catch((e) => { console.error(e.stack ?? e); process.exit(1); });
