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
  if (n === 'air' || n === 'cave_air') return '.';
  if (n === 'white_concrete') return 'C';
  if (n === 'smooth_quartz' || n === 'quartz_pillar' || n.startsWith('quartz')) return 'Q';
  if (n.startsWith('deepslate') || n === 'reinforced_deepslate') return 'D';
  if (n === 'barrel') return 'B';
  if (n === 'dirt' || n === 'grass_block') return 'T';
  if (n === 'bookshelf') return 'R';
  if (n === 'dark_oak_planks' || n === 'dark_oak_log') return 'P';
  return '#';
}

console.log('=== x241..254 z172..190 y=97 ===');
for (let z = 172; z <= 190; z++) {
  let line = '';
  for (let x = 241; x <= 254; x++) line += code(bn(await block(x, 97, z)));
  console.log(String(z).padStart(3) + ' ' + line);
}

console.log('\ncolonnade x check z=184 (y105..116):');
for (const x of [180, 190, 200, 210, 220]) {
  const states = [];
  for (let y = 105; y <= 116; y++) states.push(bn(await block(x, y, 184)));
  console.log(x + ': ' + states.join(','));
}
