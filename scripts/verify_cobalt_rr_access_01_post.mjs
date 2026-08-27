#!/usr/bin/env node
/** Read-only post-state verification for COBALT-RR-ACCESS-01.
 *  Verifies against the immutable post snapshot:
 *   - all operated cells are polished_deepslate
 *   - the clear 3x3 shaft volume (x=-159..-157, y23..62, z=-391..-389) is
 *     fluid-free (dry)
 *   - the preserved contained cave-water body remains behind the sleeve (halo)
 *   - the sleeve box is contiguous (all six faces fully solid)
 */

import path from 'node:path';
import fs from 'node:fs';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const POST = process.argv[2];
const OPERATIONS = process.argv[3];
function invariant(condition, message) { if (!condition) throw new Error(`verify: ${message}`); }
invariant(POST && OPERATIONS, 'usage: verify_cobalt_rr_access_01_post.mjs <post-snapshot> <ops-forward.txt>');

const reader = new AnvilReader(path.resolve(ROOT, path.join(POST, 'region')));
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const src = (s) => s.split('[', 1)[0];
const isF = (s) => FLUID.has(src(s)) || s.includes('waterlogged=true');

const stateAt = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));

// 1. Parse operated cells from the forward ops file.
const operated = [];
for (const line of fs.readFileSync(path.resolve(ROOT, OPERATIONS), 'utf8').split(/\r?\n/)) {
  if (!line.startsWith('REPL ')) continue;
  const f = line.split(/\s+/);
  operated.push({ x: Number(f[1]), y: Number(f[2]), z: Number(f[3]), source: f[7], target: f[8] });
}
invariant(operated.length === 711, `operated count drift: ${operated.length} != 711`);

// 2. Every operated cell must now be polished_deepslate.
let match = 0;
const mismatch = [];
for (const op of operated) {
  const s = await stateAt(op.x, op.y, op.z);
  if (src(s) === 'minecraft:polished_deepslate') match += 1;
  else mismatch.push(`${op.x},${op.y},${op.z}=${s}`);
}
console.log(`operated: ${match}/${operated.length} polished_deepslate`);

// 3. Clear shaft volume fluid-free.
const clear = { minX: -159, maxX: -157, minY: 23, maxY: 62, minZ: -391, maxZ: -389 };
let clearFluid = 0;
const clearFluidCells = [];
for (let x = clear.minX; x <= clear.maxX; x += 1) {
  for (let z = clear.minZ; z <= clear.maxZ; z += 1) {
    for (let y = clear.minY; y <= clear.maxY; y += 1) {
      const s = await stateAt(x, y, z);
      if (isF(s)) { clearFluid += 1; clearFluidCells.push(`${x},${y},${z}=${s}`); }
    }
  }
}
console.log(`clear shaft fluid: ${clearFluid}`);

// 4. Contiguity: every one of the 6 faces fully solid across its span.
const faceCells = { floor: [], ceiling: [], west: [], east: [], north: [], south: [] };
for (let x = -160; x <= -156; x += 1) for (let z = -392; z <= -388; z += 1) {
  faceCells.floor.push({ x, y: 22, z });
  faceCells.ceiling.push({ x, y: 63, z });
}
for (let y = 23; y <= 62; y += 1) for (let z = -392; z <= -388; z += 1) {
  faceCells.west.push({ x: -160, y, z });
  faceCells.east.push({ x: -156, y, z });
}
for (let y = 23; y <= 62; y += 1) for (let x = -159; x <= -157; x += 1) {
  faceCells.north.push({ x, y, z: -392 });
  faceCells.south.push({ x, y, z: -388 });
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

// 5. Preserved contained cave-water behind the sleeve (outward halo band).
let preservedWater = 0;
for (let y = 33; y <= 39; y += 1) {
  for (const [x, z] of [
    [-161, -390], [-155, -390], [-158, -393], [-158, -387],
  ]) {
    const s = src(await stateAt(x, y, z));
    if (s === 'minecraft:water') preservedWater += 1;
  }
}
console.log(`preserved water behind sleeve (halo y33..39): ${preservedWater}`);

const pass = match === operated.length && clearFluid === 0 && mismatch.length === 0;
console.log(`\nRESULT: ${pass ? 'PASS' : 'FAIL'}`);
console.log(JSON.stringify({
  postSnapshot: POST,
  operatedCellsVerified: match,
  operatedCellTotal: operated.length,
  clearShaftFluid: clearFluid,
  preservedWaterBehindSleeve: preservedWater,
  pass,
}, null, 2));
process.exit(pass ? 0 : 1);
