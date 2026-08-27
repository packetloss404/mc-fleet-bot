#!/usr/bin/env node
/**
 * Probe the lower legacy C01 sub-basement rooms (y=93..103) to determine
 * finish state. READ-ONLY.
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
function code(name) {
  const n = name.replace('minecraft:', '');
  if (['air', 'cave_air', 'void_air'].includes(n)) return '.';
  if (n === 'dirt' || n === 'coarse_dirt' || n === 'grass_block') return 'T';
  if (n === 'stone' || n === 'stone_bricks' || n.includes('stone_brick')) return 'S';
  if (n === 'quartz_pillar') return 'P';
  if (n === 'quartz_block' || n === 'smooth_quartz' || n === 'quartz_bricks') return 'Q';
  if (n.startsWith('deepslate') || n === 'reinforced_deepslate') return 'D';
  if (n.endsWith('_planks') || n.endsWith('_log')) return 'W';
  if (n === 'glass' || n.includes('glass')) return 'G';
  if (n === 'water' || n.startsWith('flowing')) return '~';
  if (n === 'gravel' || n === 'sand' || n === 'red_sand' || n === 'concrete_powder') return 'g';
  if (n.endsWith('_carpet')) return 'c';
  if (n === 'iron_bars' || n === 'iron_block') return 'I';
  if (n === 'bookshelf') return 'R';
  if (n === 'sea_lantern' || n === 'glowstone' || n === 'lantern' || n === 'torch' || n === 'light') return 'L';
  if (n === 'smooth_stone' || n === 'cobblestone' || n === 'mossy_cobblestone') return 'O';
  return '#';
}

async function main() {
  for (let y = 92; y <= 98; y++) {
    console.log(`\n=== Y=${y} (x=176..260, z=140..200) ===`);
    for (let z = 140; z <= 200; z++) {
      let line = '';
      for (let x = 176; x <= 260; x++) line += code(bn(await block(x, y, z)));
      console.log(`${String(z).padStart(3)} ${line}`);
    }
  }
}

main().catch((e) => { console.error(e.stack ?? e); process.exit(1); });
