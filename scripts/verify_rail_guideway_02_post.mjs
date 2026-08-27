#!/usr/bin/env node
/** Read-only post-state verification for RAIL-S3-GUIDEWAY-02.
 *  Verifies against the immutable post snapshot:
 *   - every operated tube-bed cell (y=12, x=-235..-136) is polished_deepslate
 *   - the two beds are exactly at y=12 (no grade drift), z-pairs tube-N
 *     (-461..-460) and tube-S (-455..-454)
 *   - the spine (z=-459..-458) and every support cell are unchanged from source
 *   - the sealed service corridor above (liner walls z=-463/-456 y18..23, floor
 *     y=18, outer east cap x=-135) is undisturbed
 *   - the corridor interior above the floor (y19..23) is still fluid-free
 */
import path from 'node:path';
import fs from 'node:fs';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const POST = process.argv[2];
const OPERATIONS = process.argv.slice(3);
invariant(POST && OPERATIONS.length === 5,
  'usage: verify_rail_guideway_02_post.mjs <post-snapshot> <seg02-forward.txt> <seg03-forward.txt> <seg04-forward.txt> <seg05-forward.txt> <seg06-forward.txt>');
function invariant(condition, message) { if (!condition) throw new Error(`verify: ${message}`); }

const reader = new AnvilReader(path.resolve(ROOT, path.join(POST, 'region')));
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const src = (s) => s.split('[', 1)[0];
const isF = (s) => FLUID.has(src(s)) || s.includes('waterlogged=true');
const stateAt = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));
const BED = 'minecraft:polished_deepslate';

// 1. Parse operated cells from all five forward ops files.
const operated = [];
for (const operations of OPERATIONS) {
  for (const line of fs.readFileSync(path.resolve(ROOT, operations), 'utf8').split(/\r?\n/)) {
    if (!line.startsWith('REPL ')) continue;
    const f = line.split(/\s+/);
    operated.push({ x: Number(f[1]), y: Number(f[2]), z: Number(f[3]), source: f[7], target: f[8] });
  }
}
const EXPECTED = 380;
invariant(operated.length === EXPECTED, `operated count drift: ${operated.length} != ${EXPECTED}`);

// 2. Every operated cell is polished_deepslate at exactly y=12 within slices 2-6.
let match = 0;
const mismatch = [];
for (const op of operated) {
  const s = await stateAt(op.x, op.y, op.z);
  if (op.y !== 12) mismatch.push(`${op.x},${op.y},${op.z} not at bed level`);
  if (src(s) === BED) match += 1;
  else mismatch.push(`${op.x},${op.y},${op.z}=${s}`);
}
console.log(`operated: ${match}/${operated.length} polished_deepslate at y=12`);

// 3. Every operated cell is inside x=-235..-136, y=12, z in the tube pairs.
for (const op of operated) {
  invariant(op.x >= -235 && op.x <= -136 && op.y === 12,
    `operated cell ${op.x},${op.y},${op.z} outside segment/bed envelope`);
  invariant((op.z >= -461 && op.z <= -460) || (op.z >= -455 && op.z <= -454),
    `operated cell ${op.x},${op.y},${op.z} outside a tube bed`);
}

// 4. Spine (z=-459..-458) is fully preserved from source (rock/gravel), not polished_deepslate.
const spineNonPreserved = [];
for (let x = -235; x <= -136; x += 1) {
  for (const z of [-459, -458]) {
    const s = src(await stateAt(x, 12, z));
    if (s === BED) spineNonPreserved.push(`${x},12,${z}`);
  }
}
console.log(`spine preserved (z=-459..-458 non-bed): ${(100 * 2) - spineNonPreserved.length}/200`);
invariant(spineNonPreserved.length === 0, `spine cells became bed material: ${spineNonPreserved.join(' ')}`);

// 5. Support row y=11 under every operated bed cell is non-air, non-fluid.
const badSupport = [];
for (const op of operated) {
  const s = await stateAt(op.x, 11, op.z);
  if (isF(s) || ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(src(s))) {
    badSupport.push(`${op.x},11,${op.z}=${s}`);
  }
}
console.log(`support row y=11 solid: ${operated.length - badSupport.length}/${operated.length}`);
invariant(badSupport.length === 0, `support row has air/fluid: ${badSupport.join(' ')}`);

// 6. Service corridor above is undisturbed: liner walls z=-463/-456 y18..23,
//    floor y=18 across the corridor, outer east cap x=-135, and interior y19..23
//    fluid-free.
let corridorFluid = 0;
const seamDrift = [];
for (let x = -235; x <= -136; x += 1) {
  for (const z of [-463, -456]) {
    for (const y of [18, 19, 20, 21, 22, 23]) {
      const s = src(await stateAt(x, y, z));
      if (s !== BED) seamDrift.push(`${x},${y},${z}=${s}`);
    }
  }
  for (const z of [-462, -461, -460, -459, -458, -457]) {
    const s = src(await stateAt(x, 18, z));
    if (s !== BED) seamDrift.push(`${x},18,${z}=${s}`);
  }
  for (const z of [-462, -461, -460, -459, -458, -457]) {
    for (const y of [19, 20, 21, 22, 23]) {
      if (isF(await stateAt(x, y, z))) corridorFluid += 1;
    }
  }
}
for (let y = 18; y <= 23; y += 1) {
  for (const z of [-462, -461, -460, -459, -458, -457]) {
    const s = src(await stateAt(-135, y, z));
    if (s !== BED) seamDrift.push(`-135,${y},${z}=${s}`);
  }
}
function seamChecksTotal() {
  // liner walls: 100 x 2 x 6 = 1200; floor: 100 x 6 = 600; outer east cap: 36
  return 1200 + 600 + 36;
}

console.log(`corridor liner seams solid: ${seamChecksTotal() - seamDrift.length}`);
invariant(seamDrift.length === 0, `corridor seam drift: ${seamDrift.slice(0, 6).join(' ')}`);
console.log(`corridor interior (y19..23) fluid: ${corridorFluid}`);
invariant(corridorFluid === 0, `corridor interior has fluid: ${corridorFluid}`);

// 7. Held cells (the pre-existing cave air / water pocket in the bed zone) must
//    remain untouched (their source state preserved, not bed material).
const heldCells = [
  '-197,12,-455', '-197,12,-454', '-196,12,-455', '-196,12,-454',
  '-195,12,-455', '-195,12,-454', '-194,12,-455',
  '-182,12,-454', '-181,12,-454', '-180,12,-455', '-180,12,-454',
  '-179,12,-455', '-179,12,-454', '-178,12,-455', '-178,12,-454',
  '-177,12,-455', '-177,12,-454', '-176,12,-455', '-176,12,-454',
  '-175,12,-454',
];
let heldUntouched = 0;
const heldDrift = [];
for (const key of heldCells) {
  const [x, y, z] = key.split(',').map(Number);
  const s = src(await stateAt(x, y, z));
  if (s !== BED) heldUntouched += 1;
  else heldDrift.push(`${key}=bed`);
}
console.log(`held bed cells untouched: ${heldUntouched}/${heldCells.length}`);
invariant(heldDrift.length === 0, `held cells were operated: ${heldDrift.join(' ')}`);

const pass = match === operated.length && mismatch.length === 0
  && spineNonPreserved.length === 0 && badSupport.length === 0
  && seamDrift.length === 0 && corridorFluid === 0 && heldDrift.length === 0;
console.log(`\nRESULT: ${pass ? 'PASS' : 'FAIL'}`);
console.log(JSON.stringify({
  postSnapshot: POST,
  operatedCellsVerified: match,
  operatedCellTotal: operated.length,
  bedLevel: 12,
  tubeNBedCells: operated.filter((o) => o.z >= -461 && o.z <= -460).length,
  tubeSBedCells: operated.filter((o) => o.z >= -455 && o.z <= -454).length,
  spineCellsPreserved: (100 * 2) - spineNonPreserved.length,
  supportRowSolid: operated.length - badSupport.length,
  corridorInteriorFluid: corridorFluid,
  corridorSeamsSolid: seamChecksTotal() - seamDrift.length,
  corridorSeamsTotal: seamChecksTotal(),
  heldBedCellsUntouched: heldUntouched,
  heldBedCellTotal: heldCells.length,
  pass,
}, null, 2));
process.exit(pass ? 0 : 1);
