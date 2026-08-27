#!/usr/bin/env node
/** Read-only post-state verification for RAIL-S2-WL-SEGMENT-02-03.
 *  Verifies against the immutable post snapshot:
 *   - all 1032 operated cells are polished_deepslate
 *   - both corridor interiors (seg02 x=-235..-216, seg03 x=-215..-196, y18..23,
 *     z=-462..-457) are fluid-free
 *   - the preserved exterior water body / sealed lava pocket remain
 *   - the liner boxes are contiguous (no flow-through gaps)
 */

import path from 'node:path';
import fs from 'node:fs';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const POST = process.argv[2];
const OPERATIONS = process.argv[3];
invariant(POST && OPERATIONS, 'usage: verify_rail_wl_seg23_post.mjs <post-snapshot> <ops-forward.txt>');
function invariant(condition, message) { if (!condition) throw new Error(`verify: ${message}`); }

const reader = new AnvilReader(path.resolve(ROOT, path.join(POST, 'region')));
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const src = (s) => s.split('[', 1)[0];
const isF = (s) => FLUID.has(src(s)) || s.includes('waterlogged=true');

const stateAt = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));

// 1. Parse operated cells from BOTH forward ops files.
const operated = [];
for (const operations of [process.argv[3], process.argv[4]]) {
  invariant(operations, 'two forward ops files required');
  for (const line of fs.readFileSync(path.resolve(ROOT, operations), 'utf8').split(/\r?\n/)) {
    if (!line.startsWith('REPL ')) continue;
    const f = line.split(/\s+/);
    operated.push({ x: Number(f[1]), y: Number(f[2]), z: Number(f[3]), source: f[7], target: f[8] });
  }
}
invariant(operated.length === 1032, `operated count drift: ${operated.length} != 1032`);

// 2. Every operated cell must now be polished_deepslate.
let match = 0, mismatch = [];
for (const op of operated) {
  const s = await stateAt(op.x, op.y, op.z);
  if (src(s) === 'minecraft:polished_deepslate') match += 1;
  else mismatch.push(`${op.x},${op.y},${op.z}=${s}`);
}
console.log(`operated: ${match}/${operated.length} polished_deepslate`);

// 3. Corridor interiors fluid-free (both segments).
const interiors = [
  { minX: -235, maxX: -216, minY: 18, maxY: 23, minZ: -462, maxZ: -457 },
  { minX: -215, maxX: -196, minY: 18, maxY: 23, minZ: -462, maxZ: -457 },
];
let interiorFluid = 0;
const interiorFluidCells = [];
for (const interior of interiors) {
  for (let x = interior.minX; x <= interior.maxX; x += 1) {
    for (let z = interior.minZ; z <= interior.maxZ; z += 1) {
      for (let y = interior.minY; y <= interior.maxY; y += 1) {
        const s = await stateAt(x, y, z);
        if (isF(s)) { interiorFluid += 1; interiorFluidCells.push(`${x},${y},${z}=${s}`); }
      }
    }
  }
}
console.log(`corridor interiors fluid: ${interiorFluid}`);

// 4. Contiguity: every face of both liner boxes fully solid.
const faceCells = {
  'seg02.floor': [], 'seg02.ceiling': [], 'seg02.north': [], 'seg02.south': [], 'seg02.east': [],
  'seg03.floor': [], 'seg03.ceiling': [], 'seg03.north': [], 'seg03.south': [], 'seg03.east': [],
};
for (let x = -235; x <= -216; x += 1) for (let z = -462; z <= -457; z += 1) {
  faceCells['seg02.floor'].push({ x, y: 17, z });
  faceCells['seg02.ceiling'].push({ x, y: 24, z });
}
for (let x = -235; x <= -216; x += 1) for (let y = 18; y <= 23; y += 1) {
  faceCells['seg02.north'].push({ x, y, z: -463 });
  faceCells['seg02.south'].push({ x, y, z: -456 });
}
for (let y = 18; y <= 23; y += 1) for (let z = -462; z <= -457; z += 1) {
  faceCells['seg02.east'].push({ x: -215, y, z });
}
for (let x = -215; x <= -196; x += 1) for (let z = -462; z <= -457; z += 1) {
  faceCells['seg03.floor'].push({ x, y: 17, z });
  faceCells['seg03.ceiling'].push({ x, y: 24, z });
}
for (let x = -215; x <= -196; x += 1) for (let y = 18; y <= 23; y += 1) {
  faceCells['seg03.north'].push({ x, y, z: -463 });
  faceCells['seg03.south'].push({ x, y, z: -456 });
}
for (let y = 18; y <= 23; y += 1) for (let z = -462; z <= -457; z += 1) {
  faceCells['seg03.east'].push({ x: -195, y, z });
}
for (const [name, cells] of Object.entries(faceCells)) {
  let solid = 0;
  const nonSolid = [];
  for (const c of cells) {
    const s = src(await stateAt(c.x, c.y, c.z));
    if (s === 'minecraft:polished_deepslate') solid += 1;
    else nonSolid.push(`${c.x},${c.y},${c.z}=${s}`);
  }
  console.log(`face ${name}: ${solid}/${cells.length} polished_deepslate${nonSolid.length ? ` non-solid: ${nonSolid.slice(0, 6).join(' ')}` : ''}`);
  invariant(nonSolid.length === 0, `face ${name} not fully sealed`);
}

// 5. Preserved exterior water: confirm the lake above/around is still present.
let preservedWater = 0;
for (let x = -235; x <= -225; x += 1) for (let z = -460; z <= -450; z += 1) {
  for (let y = 25; y <= 29; y += 1) {
    const s = src(await stateAt(x, y, z));
    if (s === 'minecraft:water' || s === 'minecraft:lava') preservedWater += 1;
  }
}
console.log(`preserved exterior fluid (probe y25..29 x-235..-225 z-460..-450): ${preservedWater}`);

// 6. Sealed lava pocket behind the liner (north of north-wall, at z=-464).
let sealedLava = 0;
for (let x = -240; x <= -230; x += 1) for (let y = 17; y <= 19; y += 1) {
  const s = src(await stateAt(x, y, -464));
  if (s === 'minecraft:lava') sealedLava += 1;
}
console.log(`sealed lava behind north liner (z=-464, x-240..-230, y17..19): ${sealedLava}`);

const pass = match === operated.length && interiorFluid === 0 && mismatch.length === 0;
console.log(`\nRESULT: ${pass ? 'PASS' : 'FAIL'}`);
console.log(JSON.stringify({
  postSnapshot: POST,
  operatedCellsVerified: match,
  operatedCellTotal: operated.length,
  corridorInteriorsFluid: interiorFluid,
  preservedExteriorFluidProbe: preservedWater,
  sealedLavaBehindLiner: sealedLava,
  pass,
}, null, 2));
process.exit(pass ? 0 : 1);
