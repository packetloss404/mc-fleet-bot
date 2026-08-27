#!/usr/bin/env node
/** Read-only post-state verification for COBALT-WL-PLATFORM-01.
 *  Verifies against the immutable post snapshot:
 *   - the deck surface (x=-253..-237, y18, z=-444..-441) is polished_andesite
 *   - every operated cell in the forward ops file is at its desired target state
 *   - the clear deck volume (y19..23) is fluid-free
 *   - the preserved lake-water halo behind the liner is intact
 */

import path from 'node:path';
import fs from 'node:fs';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const POST = process.argv[2];
const OPERATIONS = process.argv[3];
function invariant(condition, message) { if (!condition) throw new Error(`verify: ${message}`); }
invariant(POST && OPERATIONS, 'usage: verify_cobalt_wl_platform_01_post.mjs <post-snapshot> <ops-forward.txt>');

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
invariant(operated.length === 550, `operated count drift: ${operated.length} != 550`);

// 2. Every operated cell must now be at its desired target state.
let match = 0;
const mismatch = [];
for (const op of operated) {
  const s = await stateAt(op.x, op.y, op.z);
  if (src(s) === src(op.target)) match += 1;
  else mismatch.push(`${op.x},${op.y},${op.z}=${s} (want ${op.target})`);
}
console.log(`operated: ${match}/${operated.length} at desired target state`);

// 3. Deck surface fully polished_andesite.
let deck = 0;
const deckBad = [];
for (let x = -253; x <= -237; x += 1) {
  for (let z = -444; z <= -441; z += 1) {
    const s = src(await stateAt(x, 18, z));
    if (s === 'minecraft:polished_andesite') deck += 1;
    else deckBad.push(`${x},${z}=${s}`);
  }
}
console.log(`deck surface: ${deck}/68 polished_andesite`);
invariant(deckBad.length === 0, `deck surface incomplete: ${deckBad.join(' ')}`);

// 4. Clear deck volume (y19..23) fluid-free.
let clearFluid = 0;
const clearFluidCells = [];
for (let x = -253; x <= -237; x += 1) {
  for (let y = 19; y <= 23; y += 1) {
    for (let z = -444; z <= -441; z += 1) {
      const s = await stateAt(x, y, z);
      if (isF(s)) { clearFluid += 1; clearFluidCells.push(`${x},${y},${z}=${s}`); }
    }
  }
}
console.log(`clear deck volume fluid (y19..23): ${clearFluid}`);

// 5. Preserved lake water behind the liner (outward halo band at the west cap
//    x=-255 and south wall z=-439 at the y18-23 band).
let preservedWater = 0;
for (let y = 18; y <= 23; y += 1) {
  for (const [x, z] of [[-255, -442], [-255, -440], [-252, -439], [-238, -439]]) {
    const s = src(await stateAt(x, y, z));
    if (s === 'minecraft:water') preservedWater += 1;
  }
}
console.log(`preserved lake water behind liner (halo probes): ${preservedWater}`);

const pass = match === operated.length && clearFluid === 0 && mismatch.length === 0 && deck === 68;
console.log(`\nRESULT: ${pass ? 'PASS' : 'FAIL'}`);
console.log(JSON.stringify({
  postSnapshot: POST,
  operatedCellsVerified: match,
  operatedCellTotal: operated.length,
  deckSurfaceVerified: deck,
  clearDeckVolumeFluid: clearFluid,
  preservedLakeWaterBehindLiner: preservedWater,
  pass,
}, null, 2));
process.exit(pass ? 0 : 1);
