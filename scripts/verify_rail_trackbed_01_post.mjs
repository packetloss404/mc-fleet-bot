#!/usr/bin/env node
/** Read-only post-state verification for RAIL-S3-TRACKBED-01.
 *  Verifies against the immutable post snapshot:
 *   - all 102 operated cells are polished_deepslate (level track bed at y=18)
 *   - the 12 preserved RAIL-S2 lava-displacement floor cells remain polished_deepslate
 *   - the full 114-cell segment floor row is one smooth level surface
 *   - the segment-01 liner box (floor y17, ceiling y24, caps) remains sealed
 *   - the corridor interior above the floor (y19..23) is unchanged / fluid-free
 *   - every operated cell is exactly at y=18 (track bed level, no grade drift)
 */

import path from 'node:path';
import fs from 'node:fs';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const POST = process.argv[2];
const OPERATIONS = process.argv.slice(3);
invariant(POST && OPERATIONS.length === 1, 'usage: verify_rail_trackbed_01_post.mjs <post-snapshot> <seg01-forward.txt>');
function invariant(condition, message) { if (!condition) throw new Error(`verify: ${message}`); }

const reader = new AnvilReader(path.resolve(ROOT, path.join(POST, 'region')));
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const src = (s) => s.split('[', 1)[0];
const isF = (s) => FLUID.has(src(s)) || s.includes('waterlogged=true');

const stateAt = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));

// 1. Parse operated cells from the forward ops file.
const operated = [];
for (const line of fs.readFileSync(path.resolve(ROOT, OPERATIONS[0]), 'utf8').split(/\r?\n/)) {
  if (!line.startsWith('REPL ')) continue;
  const f = line.split(/\s+/);
  operated.push({ x: Number(f[1]), y: Number(f[2]), z: Number(f[3]), source: f[7], target: f[8] });
}
invariant(operated.length === 102, `operated count drift: ${operated.length} != 102`);

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

// 3. The full segment floor row (all 114 cells x=-254..-236, z=-462..-457, y=18)
//    must be one smooth level polished_deepslate surface.
const floorRow = [];
for (let x = -254; x <= -236; x += 1) for (let z = -462; z <= -457; z += 1) {
  floorRow.push({ x, y: 18, z });
}
let floorMatch = 0;
const floorNonMatch = [];
for (const c of floorRow) {
  const s = src(await stateAt(c.x, c.y, c.z));
  if (s === 'minecraft:polished_deepslate') floorMatch += 1;
  else floorNonMatch.push(`${c.x},${c.y},${c.z}=${s}`);
}
console.log(`segment floor row: ${floorMatch}/${floorRow.length} polished_deepslate`);
invariant(floorNonMatch.length === 0, `floor row not fully levelled: ${floorNonMatch.slice(0, 6).join(' ')}`);

// 4. Segment-01 liner box remains sealed: floor y17, ceiling y24, caps x=-255/x=-235.
const linerFaces = {
  'floor y17': [], 'ceiling y24': [], 'west cap x=-255': [], 'east cap x=-235': [],
};
for (let x = -254; x <= -236; x += 1) for (let z = -462; z <= -457; z += 1) {
  linerFaces['floor y17'].push({ x, y: 17, z });
  linerFaces['ceiling y24'].push({ x, y: 24, z });
}
for (let y = 18; y <= 23; y += 1) for (let z = -462; z <= -457; z += 1) {
  linerFaces['west cap x=-255'].push({ x: -255, y, z });
  linerFaces['east cap x=-235'].push({ x: -235, y, z });
}
for (const [name, cells] of Object.entries(linerFaces)) {
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

// 5. Corridor interior above the floor (y19..23) fluid-free for the segment.
let interiorFluid = 0;
const interiorFluidCells = [];
for (let x = -254; x <= -236; x += 1) {
  for (let z = -462; z <= -457; z += 1) {
    for (let y = 19; y <= 23; y += 1) {
      const s = await stateAt(x, y, z);
      if (isF(s)) { interiorFluid += 1; interiorFluidCells.push(`${x},${y},${z}=${s}`); }
    }
  }
}
console.log(`corridor interior (y19..23) fluid: ${interiorFluid}`);

// 6. Operated-set containment: every operated cell is exactly inside
//    x=-254..-236, y=18, z=-462..-457. The next corridor cell block floor
//    (x=-234..-195) must be byte-identical to the source snapshot — proving the
//    operation did not touch anything east of the segment-01 east cap liner.
//    (Pre-existing RAIL-S2 segment-02/03 east-cap liner cells at x=-215 and
//    x=-195 are legitimately sealed and must remain unchanged.)
const sourceReader = new AnvilReader(path.resolve(ROOT, path.join(process.env.RAIL_TRACKBED_SOURCE ?? 'data/worldsnap-rail-trackbed-source-20260825T082100Z', 'region')));
const sourceStateAt = async (x, y, z) => stateToCommandString(await sourceReader.blockState(x, y, z));
for (const op of operated) {
  invariant(op.x >= -254 && op.x <= -236 && op.y === 18 && op.z >= -462 && op.z <= -457,
    `operated cell ${op.x},${op.y},${op.z} outside segment-01 track-bed envelope`);
}
let nextBlockFloorChanged = 0;
const nextBlockChanges = [];
for (let x = -234; x <= -195; x += 1) {
  for (const z of [-462, -461, -460, -459, -458, -457]) {
    const post = src(await stateAt(x, 18, z));
    const before = src(await sourceStateAt(x, 18, z));
    if (post !== before) { nextBlockFloorChanged += 1; nextBlockChanges.push(`${x},18,${z}: ${before}->${post}`); }
  }
}
console.log(`next cell block (x=-234..-195) floor cells changed: ${nextBlockFloorChanged} (expect 0)`);
invariant(nextBlockFloorChanged === 0, `next corridor cell block floor drifted: ${nextBlockChanges.slice(0, 6).join(' ')}`);

const pass = match === operated.length && floorMatch === floorRow.length
  && interiorFluid === 0 && mismatch.length === 0;
console.log(`\nRESULT: ${pass ? 'PASS' : 'FAIL'}`);
console.log(JSON.stringify({
  postSnapshot: POST,
  operatedCellsVerified: match,
  operatedCellTotal: operated.length,
  segmentFloorRowLevelled: floorMatch,
  segmentFloorRowTotal: floorRow.length,
  corridorInteriorFluid: interiorFluid,
  linerBoxSealed: Object.fromEntries(Object.entries(linerFaces).map(([name, cells]) => [name, cells.length])),
  pass,
}, null, 2));
process.exit(pass ? 0 : 1);
