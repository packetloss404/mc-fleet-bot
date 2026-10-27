#!/usr/bin/env node
/** Read-only: complete lava-pocket mapping around the first-segment box and
 * outer-halo fluid census. Determines whether the sealed liner box is
 * watertight (no fluid in the 1-cell halo that can flow through). */

import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const SNAPSHOT = process.argv[2] ?? 'data/worldsnap-r08am-post-20260822T161818Z';
const reader = new AnvilReader(path.resolve(ROOT, path.join(SNAPSHOT, 'region')));

const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const src = (s) => s.split('[', 1)[0];
const isF = (s) => FLUID.has(src(s)) || s.includes('waterlogged=true');

console.log('=== LAVA POCKET FULL EXTENT (x=-242..-233, y=15..22, z=-467..-453) ===');
for (let x = -242; x <= -233; x += 1) {
  for (let y = 15; y <= 22; y += 1) {
    const row = [];
    for (let z = -467; z <= -453; z += 1) {
      const s = stateToCommandString(await reader.blockState(x, y, z));
      if (isF(s)) row.push(`${z}:${s.replace('minecraft:lava[', 'L').replace(']', '').replace('minecraft:water[', 'W').replace(']', '')}`);
    }
    if (row.length) console.log(`  x=${x} y=${y}: ${row.join(' ')}`);
  }
}

console.log('\n=== OUTER 1-CELL HALO FLUID (x=-256..-234, y=16..25, z=-465..-454) ===');
// The liner occupies the six faces; the outer halo is one cell beyond each face.
const outer = [];
for (let x = -256; x <= -234; x += 1) {
  for (let y = 16; y <= 25; y += 1) {
    for (let z = -465; z <= -454; z += 1) {
      const s = stateToCommandString(await reader.blockState(x, y, z));
      if (isF(s)) outer.push({ x, y, z, s });
    }
  }
}
console.log(`outer-halo fluid cells: ${outer.length}`);
for (const c of outer) console.log(`  (${c.x},${c.y},${c.z}) ${c.s}`);

console.log('\n=== GRAVITY (sand/gravel) in interior + liner faces ===');
const GRAVITY = new Set(['minecraft:sand', 'minecraft:gravel', 'minecraft:red_sand', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel']);
const interior = [];
for (let x = -254; x <= -236; x += 1) for (let z = -462; z <= -457; z += 1) for (let y = 18; y <= 23; y += 1) interior.push({ x, y, z });
for (const c of interior) {
  const s = src(stateToCommandString(await reader.blockState(c.x, c.y, c.z)));
  if (GRAVITY.has(s)) console.log(`  interior gravity (${c.x},${c.y},${c.z}) ${s}`);
}
const faces = [];
for (let x = -254; x <= -236; x += 1) for (let z = -462; z <= -457; z += 1) { faces.push({ x, y: 17, z }); faces.push({ x, y: 24, z }); }
for (let x = -254; x <= -236; x += 1) for (let y = 18; y <= 23; y += 1) { faces.push({ x, y, z: -463 }); faces.push({ x, y, z: -456 }); }
for (let y = 18; y <= 23; y += 1) for (let z = -462; z <= -457; z += 1) { faces.push({ x: -255, y, z }); faces.push({ x: -235, y, z }); }
let gravFaces = 0;
for (const c of faces) {
  const s = src(stateToCommandString(await reader.blockState(c.x, c.y, c.z)));
  if (GRAVITY.has(s)) { gravFaces += 1; console.log(`  face gravity (${c.x},${c.y},${c.z}) ${s}`); }
}
console.log(`face gravity count: ${gravFaces}`);

console.log('\n=== east cap x=-235 interior-facing and x=-234 outer ===');
for (let y = 18; y <= 23; y += 1) for (let z = -462; z <= -457; z += 1) {
  const s235 = src(stateToCommandString(await reader.blockState(-235, y, z)));
  const s234 = src(stateToCommandString(await reader.blockState(-234, y, z)));
  if (isF(s235) || isF(s234)) console.log(`  y=${y} z=${z}: x=-235=${s235} x=-234=${s234}`);
}
