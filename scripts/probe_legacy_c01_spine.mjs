#!/usr/bin/env node
/**
 * Precise probe of the legacy C01 spine region (around the quartz pillars).
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

// detailed char map
function code(name) {
  const n = name.replace('minecraft:', '');
  if (['air', 'cave_air', 'void_air'].includes(n)) return '.';
  if (n === 'dirt' || n === 'coarse_dirt' || n === 'grass_block') return 'T';
  if (n === 'stone') return 'S';
  if (n === 'quartz_pillar') return 'P';          // THE unknown pillar
  if (n === 'quartz_block' || n === 'smooth_quartz' || n === 'quartz_bricks' || n.startsWith('smooth_quartz_')) return 'Q';
  if (n.startsWith('deepslate') || n === 'reinforced_deepslate') return 'D';
  if (n.includes('stone_bricks') || n.includes('bricks')) return 'B';
  if (n === 'andesite' || n === 'polished_andesite') return 'A';
  if (n === 'blackstone' || n === 'polished_blackstone') return 'K';
  if (n.endsWith('_planks') || n.endsWith('_log')) return 'W';
  if (n === 'glass' || n.includes('glass')) return 'G';
  if (n === 'water' || n.startsWith('flowing')) return '~';
  if (n === 'gravel' || n === 'sand') return 'g';
  if (n.endsWith('_carpet')) return 'c';
  if (n === 'bookshelf') return 'R';
  if (n === 'sea_lantern' || n === 'glowstone' || n === 'lantern' || n === 'torch' || n === 'light') return 'L';
  if (n === 'iron_bars' || n === 'iron_block') return 'I';
  return '#';
}

async function main() {
  const x0 = 170, x1 = 216, z0 = 176, z1 = 198, y0 = 100, y1 = 118;
  for (let y = y0; y <= y1; y++) {
    console.log(`\n=== Y=${y} (x=${x0}..${x1}, z=${z0}..${z1}) ===`);
    for (let z = z0; z <= z1; z++) {
      let line = '';
      for (let x = x0; x <= x1; x++) line += code(bn(await block(x, y, z)));
      console.log(`${String(z).padStart(3)} ${line}`);
    }
  }
  // Also dump the 126 unknown cells' full state and neighbors quickly
  console.log('\n=== pillar column detail (z=184/185) ===');
  for (const x of [180, 181, 190, 191, 200, 201]) {
    for (const z of [184, 185]) {
      const cells = [];
      for (let y = 103; y <= 116; y++) {
        cells.push(`${y}:${bn(await block(x, y, z))}`);
      }
      console.log(`${x},${z} -> ${cells.join(' ')}`);
    }
  }
}

main().catch((e) => { console.error(e.stack ?? e); process.exit(1); });
