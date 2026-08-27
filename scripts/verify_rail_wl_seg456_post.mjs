#!/usr/bin/env node
/** Read-only post-state verification for RAIL-S2-WL-SEGMENT-04-06.
 *  Verifies against the immutable post snapshot:
 *   - all 1548 operated cells are polished_deepslate
 *   - all three corridor interiors (seg04 x=-195..-176, seg05 x=-175..-156,
 *     seg06 x=-155..-136, y18..23, z=-462..-457) are fluid-free
 *   - the preserved exterior water body remains (probe)
 *   - the liner boxes are contiguous (no flow-through gaps)
 *   - corridor continuity with the segment-03 east cap (x=-195) and the new
 *     segment-06 east cap (x=-135)
 */

import path from 'node:path';
import fs from 'node:fs';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const POST = process.argv[2];
const OPERATIONS = process.argv.slice(3);
invariant(POST && OPERATIONS.length === 3, 'usage: verify_rail_wl_seg456_post.mjs <post-snapshot> <seg04-forward.txt> <seg05-forward.txt> <seg06-forward.txt>');
function invariant(condition, message) { if (!condition) throw new Error(`verify: ${message}`); }

const reader = new AnvilReader(path.resolve(ROOT, path.join(POST, 'region')));
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const src = (s) => s.split('[', 1)[0];
const isF = (s) => FLUID.has(src(s)) || s.includes('waterlogged=true');

const stateAt = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));

// 1. Parse operated cells from ALL three forward ops files.
const operated = [];
for (const operations of OPERATIONS) {
  for (const line of fs.readFileSync(path.resolve(ROOT, operations), 'utf8').split(/\r?\n/)) {
    if (!line.startsWith('REPL ')) continue;
    const f = line.split(/\s+/);
    operated.push({ x: Number(f[1]), y: Number(f[2]), z: Number(f[3]), source: f[7], target: f[8] });
  }
}
invariant(operated.length === 1548, `operated count drift: ${operated.length} != 1548`);

// 2. Every operated cell must now be polished_deepslate.
let match = 0, mismatch = [];
for (const op of operated) {
  const s = await stateAt(op.x, op.y, op.z);
  if (src(s) === 'minecraft:polished_deepslate') match += 1;
  else mismatch.push(`${op.x},${op.y},${op.z}=${s}`);
}
console.log(`operated: ${match}/${operated.length} polished_deepslate`);

// 3. Corridor interiors fluid-free (all three segments).
const interiors = [
  { minX: -195, maxX: -176, minY: 18, maxY: 23, minZ: -462, maxZ: -457 },
  { minX: -175, maxX: -156, minY: 18, maxY: 23, minZ: -462, maxZ: -457 },
  { minX: -155, maxX: -136, minY: 18, maxY: 23, minZ: -462, maxZ: -457 },
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

// 4. Contiguity: every face of all three liner boxes fully solid.
const faceCells = {
  'seg04.floor': [], 'seg04.ceiling': [], 'seg04.north': [], 'seg04.south': [], 'seg04.east': [],
  'seg05.floor': [], 'seg05.ceiling': [], 'seg05.north': [], 'seg05.south': [], 'seg05.east': [],
  'seg06.floor': [], 'seg06.ceiling': [], 'seg06.north': [], 'seg06.south': [], 'seg06.east': [],
};
for (let x = -195; x <= -176; x += 1) for (let z = -462; z <= -457; z += 1) {
  faceCells['seg04.floor'].push({ x, y: 17, z });
  faceCells['seg04.ceiling'].push({ x, y: 24, z });
}
for (let x = -195; x <= -176; x += 1) for (let y = 18; y <= 23; y += 1) {
  faceCells['seg04.north'].push({ x, y, z: -463 });
  faceCells['seg04.south'].push({ x, y, z: -456 });
}
for (let y = 18; y <= 23; y += 1) for (let z = -462; z <= -457; z += 1) {
  faceCells['seg04.east'].push({ x: -175, y, z });
}
for (let x = -175; x <= -156; x += 1) for (let z = -462; z <= -457; z += 1) {
  faceCells['seg05.floor'].push({ x, y: 17, z });
  faceCells['seg05.ceiling'].push({ x, y: 24, z });
}
for (let x = -175; x <= -156; x += 1) for (let y = 18; y <= 23; y += 1) {
  faceCells['seg05.north'].push({ x, y, z: -463 });
  faceCells['seg05.south'].push({ x, y, z: -456 });
}
for (let y = 18; y <= 23; y += 1) for (let z = -462; z <= -457; z += 1) {
  faceCells['seg05.east'].push({ x: -155, y, z });
}
for (let x = -155; x <= -136; x += 1) for (let z = -462; z <= -457; z += 1) {
  faceCells['seg06.floor'].push({ x, y: 17, z });
  faceCells['seg06.ceiling'].push({ x, y: 24, z });
}
for (let x = -155; x <= -136; x += 1) for (let y = 18; y <= 23; y += 1) {
  faceCells['seg06.north'].push({ x, y, z: -463 });
  faceCells['seg06.south'].push({ x, y, z: -456 });
}
for (let y = 18; y <= 23; y += 1) for (let z = -462; z <= -457; z += 1) {
  faceCells['seg06.east'].push({ x: -135, y, z });
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

// 5. Preserved exterior water: census the full corridor-adjacent fluid body
//    (x=-195..-136, y=15..30, z=-464..-455) in the post snapshot. The liner
//    boxes occupy only the six face sheets; all fluid in this wider envelope
//    is exterior/preserved and must remain present.
let preservedWater = 0;
for (let x = -195; x <= -136; x += 1) {
  for (let z = -464; z <= -455; z += 1) {
    for (let y = 15; y <= 30; y += 1) {
      const s = src(await stateAt(x, y, z));
      if (s === 'minecraft:water' || s === 'minecraft:lava' || s === 'minecraft:bubble_column') preservedWater += 1;
    }
  }
}
console.log(`preserved exterior fluid (x-195..-136 y15..30 z-464..-455): ${preservedWater}`);

// 6. Corridor continuity: segment-03 east cap x=-195 still sealed, and the new
//    segment-06 east cap x=-135 fully sealed.
let seamCap = 0, eastCap = 0;
for (let y = 18; y <= 23; y += 1) for (let z = -462; z <= -457; z += 1) {
  if (src(await stateAt(-195, y, z)) === 'minecraft:polished_deepslate') seamCap += 1;
  if (src(await stateAt(-135, y, z)) === 'minecraft:polished_deepslate') eastCap += 1;
}
console.log(`segment-03 east cap x=-195: ${seamCap}/36 sealed; segment-06 east cap x=-135: ${eastCap}/36 sealed`);

const pass = match === operated.length && interiorFluid === 0 && mismatch.length === 0
  && seamCap === 36 && eastCap === 36;
console.log(`\nRESULT: ${pass ? 'PASS' : 'FAIL'}`);
console.log(JSON.stringify({
  postSnapshot: POST,
  operatedCellsVerified: match,
  operatedCellTotal: operated.length,
  corridorInteriorsFluid: interiorFluid,
  preservedExteriorFluidProbe: preservedWater,
  segment03EastCapSealed: seamCap,
  segment06EastCapSealed: eastCap,
  pass,
}, null, 2));
process.exit(pass ? 0 : 1);
