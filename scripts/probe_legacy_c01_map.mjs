#!/usr/bin/env node
/**
 * Map legacy MainStreet C01 interior at each Y level. READ-ONLY.
 */
import path from 'path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const REGIONS = path.join(ROOT, 'data/worldsnap-r08am-post-20260822T161818Z/region');
const reader = new AnvilReader(REGIONS);

const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const GRAV = new Set(['minecraft:sand', 'minecraft:gravel', 'minecraft:dirt', 'minecraft:grass_block',
  'minecraft:concrete_powder', 'minecraft:red_sand', 'minecraft:water']);

function baseName(s) { return String(s ?? '').split('[', 1)[0]; }

// char map for interesting materials
function matChar(name) {
  const n = name.replace('minecraft:', '');
  if (['air', 'cave_air', 'void_air'].includes(n)) return '.';
  if (['dark_oak_planks', 'dark_oak_log', 'dark_oak_stairs', 'dark_oak_slab', 'dark_oak_door'].includes(n)) return 'P';
  if (['smooth_quartz', 'quartz_block', 'quartz_pillar', 'quartz_bricks', 'smooth_quartz_stairs', 'smooth_quartz_slab'].includes(n)) return 'Q';
  if (['reinforced_deepslate', 'deepslate_bricks', 'deepslate_tiles', 'deepslate', 'cobbled_deepslate'].includes(n)) return 'D';
  if (['stone_bricks', 'cracked_stone_bricks', 'mossy_stone_bricks', 'stone'].includes(n)) return 'S';
  if (['polished_blackstone', 'polished_blackstone_bricks', 'blackstone'].includes(n)) return 'B';
  if (['polished_andesite', 'andesite'].includes(n)) return 'A';
  if (['glass', 'light_blue_stained_glass', 'white_stained_glass', 'gray_stained_glass'].includes(n)) return 'G';
  if (['bookshelf'].includes(n)) return 'R';
  if (n.endsWith('_carpet')) return 'c';
  if (['sea_lantern', 'glowstone', 'lantern', 'torch', 'light'].includes(n)) return 'L';
  if (['dirt', 'grass_block', 'gravel', 'sand', 'stone'].includes(n)) return 'T';
  if (['water'].includes(n)) return '~';
  if (['oak_planks', 'spruce_planks', 'planks'].includes(n)) return 'o';
  if (['red_nether_bricks'].includes(n)) return 'N';
  if (['iron_bars', 'iron_block'].includes(n)) return 'I';
  if (['chain'].includes(n)) return '|';
  return '#';
}

async function main() {
  const xs = [158, 260]; const zs = [139, 197]; const ys = [93, 118];
  const cache = new Map();
  const block = async (x, y, z) => {
    const k = `${x},${y},${z}`;
    if (!cache.has(k)) cache.set(k, stateToCommandString(await reader.blockState(x, y, z)));
    return cache.get(k);
  };

  for (let y = ys[0]; y <= ys[1]; y++) {
    const rows = [];
    for (let z = zs[0]; z <= zs[1]; z++) {
      let line = '';
      for (let x = xs[0]; x <= xs[1]; x++) {
        line += matChar(baseName(await block(x, y, z)));
      }
      rows.push(`${String(z).padStart(3)} ${line}`);
    }
    console.log(`\n=== Y=${y} ===`);
    console.log(rows.join('\n'));
  }
}

main().catch((e) => { console.error(e.stack ?? e); process.exit(1); });
