#!/usr/bin/env node
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
function bn(s) { return String(s ?? '').split('[', 1)[0].replace('minecraft:', '').split('[')[0]; }
function code(n) {
  if (n === 'water' || n === 'flowing_water') return '~';
  if (n === 'air' || n === 'cave_air') return '.';
  if (n === 'dirt' || n === 'coarse_dirt') return 'T';
  if (n === 'polished_andesite' || n === 'andesite') return 'A';
  if (n === 'smooth_quartz' || n === 'quartz_pillar' || n.startsWith('quartz')) return 'Q';
  if (n.startsWith('deepslate') || n === 'reinforced_deepslate') return 'D';
  if (n === 'barrel') return 'B';
  if (n === 'grass_block') return 'g';
  if (n === 'dark_oak_planks' || n === 'dark_oak_log') return 'P';
  if (n === 'stone' || n.includes('stone_brick')) return 'S';
  if (n === 'flower_pot' || n === 'azalea' || n === 'flowering_azalea') return 'f';
  return '#';
}

console.log('=== water feature y=106 x=184..204 z=156..172 ===');
for (let z = 156; z <= 172; z++) {
  let line = '';
  for (let x = 184; x <= 204; x++) line += code(bn(await block(x, 106, z)));
  console.log(String(z).padStart(3) + ' ' + line);
}
console.log('\n=== water basin y=105 x=196..204 z=156..168 ===');
for (let z = 156; z <= 168; z++) {
  let line = '';
  for (let x = 196; x <= 204; x++) line += code(bn(await block(x, 105, z)));
  console.log(String(z).padStart(3) + ' ' + line);
}
