#!/usr/bin/env node
/**
 * Probe legacy MainStreet C01: re-derive full mismatch list from historical
 * op files against the accepted R08AM post snapshot, dump the 126 unknown
 * cells, and print a coarse room/floor map for planning.
 *
 * READ-ONLY.
 */
import fs from 'fs';
import path from 'path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const REGIONS = path.join(ROOT, 'data/worldsnap-r08am-post-20260822T161818Z/region');

const pointKey = (p) => p.join(',');

function parseReplOps(filename) {
  const text = fs.readFileSync(filename, 'utf8');
  const cells = [];
  let currentPhase = null;
  const currentPackage = filename.includes('recessed-portal') ? 'phase2-recessed-portal' : 'phase1-surface';
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('# phase:')) { currentPhase = line.replace('# phase:', '').trim(); continue; }
    if (line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    if (parts[0] !== 'REPL' || parts.length !== 9) continue;
    const [x1, y1, z1, x2, y2, z2] = parts.slice(1, 7).map(Number);
    const expected = parts[7];
    const replacement = parts[8];
    for (let y = y1; y <= y2; y += 1) {
      for (let z = z1; z <= z2; z += 1) {
        for (let x = x1; x <= x2; x += 1) {
          cells.push({ x, y, z, expected, replacement, phase: currentPhase, package: currentPackage });
        }
      }
    }
  }
  return cells;
}

function baseName(state) {
  return String(state ?? '').split('[', 1)[0];
}

const STRUCTURE_BLOCKS = new Set([
  'minecraft:oak_planks', 'minecraft:dark_oak_planks', 'minecraft:spruce_planks',
  'minecraft:acacia_planks', 'minecraft:birch_planks', 'minecraft:jungle_planks',
  'minecraft:mangrove_planks', 'minecraft:crimson_planks', 'minecraft:warped_planks',
  'minecraft:oak_log', 'minecraft:dark_oak_log', 'minecraft:spruce_log',
  'minecraft:oak_stairs', 'minecraft:dark_oak_stairs', 'minecraft:spruce_stairs',
  'minecraft:deepslate_bricks', 'minecraft:cracked_deepslate_bricks',
  'minecraft:deepslate_tiles', 'minecraft:polished_deepslate', 'minecraft:stone_bricks',
  'minecraft:cracked_stone_bricks', 'minecraft:mossy_stone_bricks',
  'minecraft:polished_andesite', 'minecraft:polished_diorite', 'minecraft:polished_granite',
  'minecraft:polished_blackstone', 'minecraft:polished_blackstone_bricks',
  'minecraft:blackstone', 'minecraft:andesite', 'minecraft:diorite', 'minecraft:granite',
  'minecraft:cobblestone', 'minecraft:mossy_cobblestone', 'minecraft:bricks',
  'minecraft:prismarine', 'minecraft:prismarine_bricks', 'minecraft:dark_prismarine',
  'minecraft:purpur_block', 'minecraft:purpur_pillar', 'minecraft:end_stone_bricks',
  'minecraft:nether_bricks', 'minecraft:quartz_block', 'minecraft:smooth_quartz',
  'minecraft:concrete', 'minecraft:white_concrete', 'minecraft:black_concrete',
  'minecraft:gray_concrete', 'minecraft:light_gray_concrete',
  'minecraft:terracotta', 'minecraft:white_terracotta', 'minecraft:cyan_terracotta',
  'minecraft:glass', 'minecraft:white_stained_glass', 'minecraft:gray_stained_glass',
  'minecraft:tinted_glass', 'minecraft:iron_bars', 'minecraft:iron_block',
  'minecraft:chain', 'minecraft:lantern', 'minecraft:sea_lantern', 'minecraft:torch',
  'minecraft:smooth_stone', 'minecraft:smooth_sandstone', 'minecraft:sandstone',
  'minecraft:cut_sandstone', 'minecraft:cut_copper', 'minecraft:oxidized_cut_copper',
  'minecraft:waxed_cut_copper', 'minecraft:waxed_oxidized_cut_copper', 'minecraft:deepslate',
  'minecraft:polished_basalt', 'minecraft:packed_ice', 'minecraft:blue_ice', 'minecraft:snow_block',
  'minecraft:reinforced_deepslate', 'minecraft:bookshelf', 'minecraft:glass_pane',
  'minecraft:light_blue_stained_glass', 'minecraft:blue_stained_glass',
  'minecraft:white_stained_glass', 'minecraft:gray_stained_glass', 'minecraft:black_stained_glass',
  'minecraft:light_gray_stained_glass', 'minecraft:purple_stained_glass',
  'minecraft:red_stained_glass', 'minecraft:green_stained_glass',
  'minecraft:white_carpet', 'minecraft:red_carpet', 'minecraft:blue_carpet',
  'minecraft:green_carpet', 'minecraft:purple_carpet', 'minecraft:gray_carpet',
  'minecraft:black_carpet', 'minecraft:light_blue_carpet', 'minecraft:cyan_carpet',
  'minecraft:red_nether_bricks', 'minecraft:red_nether_brick_wall',
]);
const STRUCTURE_SUFFIX = ['_planks', '_stairs', '_slab', '_wall', '_pane', '_fence',
  '_button', '_pressure_plate', '_door', '_trapdoor', '_concrete', '_terracotta',
  '_glass', '_bricks', '_tiles', '_sign', '_carpet', '_stained_glass'];
const NATURAL_LANDSCAPE = new Set([
  'minecraft:dirt', 'minecraft:grass_block', 'minecraft:stone', 'minecraft:deepslate',
  'minecraft:gravel', 'minecraft:sand', 'minecraft:cobblestone', 'minecraft:air',
  'minecraft:cave_air', 'minecraft:snow', 'minecraft:short_grass', 'minecraft:water',
  'minecraft:flowing_water', 'minecraft:granite', 'minecraft:andesite', 'minecraft:diorite',
  'minecraft:packed_ice', 'minecraft:snow_block', 'minecraft:coarse_dirt',
  'minecraft:lava', 'minecraft:flowing_lava',
]);

const classify = (m) => {
  const cur = baseName(m.current);
  if (/chest|barrel|shulker|furnace|hopper|dispenser|dropper|sign/.test(cur)) return 'container/block-entity/sign';
  if (STRUCTURE_BLOCKS.has(cur) || STRUCTURE_SUFFIX.some((s) => cur.endsWith(s))) return 'later-structure-construction';
  if (cur === 'minecraft:air' || cur === 'minecraft:cave_air') return 'removed-or-gap';
  if (NATURAL_LANDSCAPE.has(cur)) return 'natural-landscape-or-lifecycle';
  return 'unknown';
};

const reader = new AnvilReader(REGIONS);
const cache = new Map();
async function block(x, y, z) {
  const k = pointKey([x, y, z]);
  if (!cache.has(k)) cache.set(k, stateToCommandString(await reader.blockState(x, y, z)));
  return cache.get(k);
}

const surface = parseReplOps(path.join(ROOT, 'data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.txt'));
const portal = parseReplOps(path.join(ROOT, 'data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.txt'));
const final = new Map();
for (const c of [...surface, ...portal]) final.set(pointKey([c.x, c.y, c.z]), c);
const list = [...final.values()];
const mismatches = [];
for (const c of list) {
  const current = await block(c.x, c.y, c.z);
  if (current !== c.replacement) mismatches.push({ ...c, current });
}
console.log(`historical distinct: ${list.length}, exact: ${list.length - mismatches.length}, mismatched: ${mismatches.length}`);
const classified = mismatches.map((m) => ({ ...m, classification: classify(m) }));
const byClass = {};
for (const m of classified) byClass[m.classification] = (byClass[m.classification] ?? 0) + 1;
console.log('byClass:', JSON.stringify(byClass));

const unknown = classified.filter((m) => m.classification === 'unknown');
console.log('\n=== UNKNOWN CELLS ===');
for (const u of unknown) {
  console.log(`${u.x},${u.y},${u.z}  expected=${u.expected} replacement=${u.replacement} current=${u.current}`);
}

// Also bucket the 4,933 structure cells by current family for room mapping
const structCur = {};
for (const m of classified) {
  if (m.classification !== 'later-structure-construction') continue;
  const fam = baseName(m.current).replace('minecraft:', '').split('[')[0];
  structCur[fam] = (structCur[fam] ?? 0) + 1;
}
console.log('\n=== STRUCTURE CELL CURRENT FAMILY ===');
console.log(Object.entries(structCur).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(' '));
