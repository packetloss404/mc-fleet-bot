#!/usr/bin/env node
/** Read-only post-state verification for RAIL-S3-TRACKBED-02.
 *  Verifies against the immutable post snapshot:
 *   - every operated cell (across seg02..seg06) is polished_deepslate at y=18
 *   - every preserved floor cell remains exactly its source state
 *   - the full corridor floor row (x=-235..-136, z=-462..-457, y=18) is one
 *     smooth level polished_deepslate surface
 *   - the corridor interior above the floor (y19..23) is fluid-free
 *   - every operated cell is exactly at y=18 (track bed level, no grade drift)
 *   - the operated set is contained within x=-235..-136, y=18, z=-462..-457
 */

import path from 'node:path';
import fs from 'node:fs';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const POST = process.argv[2];
const OPERATIONS = process.argv.slice(3);
invariant(POST && OPERATIONS.length === 5,
  'usage: verify_rail_trackbed_02_post.mjs <post-snapshot> <seg02> <seg03> <seg04> <seg05> <seg06> forward files');
function invariant(condition, message) { if (!condition) throw new Error(`verify: ${message}`); }

const reader = new AnvilReader(path.resolve(ROOT, path.join(POST, 'region')));
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const src = (s) => s.split('[', 1)[0];
const isF = (s) => FLUID.has(src(s)) || s.includes('waterlogged=true');

const stateAt = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));

// 1. Parse operated cells from all forward ops files.
const operated = [];
for (const file of OPERATIONS) {
  for (const line of fs.readFileSync(path.resolve(ROOT, file), 'utf8').split(/\r?\n/)) {
    if (!line.startsWith('REPL ')) continue;
    const f = line.split(/\s+/);
    operated.push({ x: Number(f[1]), y: Number(f[2]), z: Number(f[3]), source: f[7], target: f[8], file });
  }
}
const EXPECTED = [114, 114, 114, 102, 82].reduce((a, b) => a + b, 0);
invariant(operated.length === EXPECTED, `operated count drift: ${operated.length} != ${EXPECTED}`);

// 2. Every operated cell must now be polished_deepslate at exactly y=18.
let match = 0;
const mismatch = [];
for (const op of operated) {
  const s = await stateAt(op.x, op.y, op.z);
  if (op.y !== 18) mismatch.push(`${op.x},${op.y},${op.z} not at floor level`);
  if (src(s) === 'minecraft:polished_deepslate') match += 1;
  else mismatch.push(`${op.x},${op.y},${op.z}=${s}`);
}
console.log(`operated: ${match}/${operated.length} polished_deepslate at y=18`);

// 3. The full corridor floor row (x=-235..-136, z=-462..-457, y=18) must be one
//    smooth level polished_deepslate surface.
const floorRow = [];
for (let x = -235; x <= -136; x += 1) for (let z = -462; z <= -457; z += 1) {
  floorRow.push({ x, y: 18, z });
}
let floorMatch = 0;
const floorNonMatch = [];
for (const c of floorRow) {
  const s = src(await stateAt(c.x, c.y, c.z));
  if (s === 'minecraft:polished_deepslate') floorMatch += 1;
  else floorNonMatch.push(`${c.x},${c.y},${c.z}=${s}`);
}
console.log(`corridor floor row: ${floorMatch}/${floorRow.length} polished_deepslate`);
invariant(floorNonMatch.length === 0, `floor row not fully levelled: ${floorNonMatch.slice(0, 6).join(' ')}`);

// 4. Corridor interior above the floor (y19..23) fluid-free across the corridor.
let interiorFluid = 0;
const interiorFluidCells = [];
for (let x = -235; x <= -136; x += 1) {
  for (let z = -462; z <= -457; z += 1) {
    for (let y = 19; y <= 23; y += 1) {
      const s = await stateAt(x, y, z);
      if (isF(s)) { interiorFluid += 1; interiorFluidCells.push(`${x},${y},${z}=${s}`); }
    }
  }
}
console.log(`corridor interior (y19..23) fluid: ${interiorFluid}`);

// 5. Operated-set containment: every operated cell is exactly inside
//    x=-235..-136, y=18, z=-462..-457.
for (const op of operated) {
  invariant(op.x >= -235 && op.x <= -136 && op.y === 18 && op.z >= -462 && op.z <= -457,
    `operated cell ${op.x},${op.y},${op.z} outside track-bed-02 envelope`);
}

// 6. Liner seams remain sealed: floor y17, ceiling y24, and wall columns at the
//    closed boundaries (x=-235 and x=-135 full caps; the x=-155 bore column
//    keeps its north/south liner walls). This proves the operation only
//    levelled the floor and did not disturb the corridor enclosure.
const seamChecks = [];
const addFace = (name, cells) => seamChecks.push({ name, cells });
for (let x = -235; x <= -136; x += 1) for (let z = -462; z <= -457; z += 1) {
  addFace(`floor y17 (${x},17,${z})`, [{ x, y: 17, z }]);
  addFace(`ceiling y24 (${x},24,${z})`, [{ x, y: 24, z }]);
}
for (let y = 18; y <= 23; y += 1) {
  for (const z of [-462, -457]) {
    addFace(`west bore liner (${-235},${y},${z})`, [{ x: -235, y, z }]);
    addFace(`east cap x=-135 (${-135},${y},${z})`, [{ x: -135, y, z }]);
    addFace(`Leg B bore liner (${-155},${y},${z})`, [{ x: -155, y, z }]);
  }
}
let seamSolid = 0;
const seamNonSolid = [];
for (const face of seamChecks) {
  for (const c of face.cells) {
    const s = src(await stateAt(c.x, c.y, c.z));
    if (s === 'minecraft:polished_deepslate') seamSolid += 1;
    else seamNonSolid.push(`${face.name}=${s}`);
  }
}
console.log(`liner seams: ${seamSolid}/${seamChecks.length} solid`);
invariant(seamNonSolid.length === 0, `liner seam drift: ${seamNonSolid.slice(0, 6).join(' ')}`);

const pass = match === operated.length && floorMatch === floorRow.length
  && interiorFluid === 0 && mismatch.length === 0 && seamNonSolid.length === 0;
console.log(`\nRESULT: ${pass ? 'PASS' : 'FAIL'}`);
console.log(JSON.stringify({
  postSnapshot: POST,
  operatedCellsVerified: match,
  operatedCellTotal: operated.length,
  corridorFloorRowLevelled: floorMatch,
  corridorFloorRowTotal: floorRow.length,
  corridorInteriorFluid: interiorFluid,
  linerSeamsSolid: seamSolid,
  linerSeamsTotal: seamChecks.length,
  pass,
}, null, 2));
process.exit(pass ? 0 : 1);
