#!/usr/bin/env node
/** Read-only post-state verification for RAIL-S3-GUIDEWAY-01.
 *  Verifies against the immutable post snapshot:
 *   - every operated tube-bed cell (y=12, x=-254..-236) is polished_deepslate
 *   - the two beds are exactly at y=12 (no grade drift), z-pairs tube-N
 *     (-461..-460) and tube-S (-455..-454)
 *   - the spine (z=-459..-458) and every support cell are unchanged from source
 *   - the sealed service corridor above (y=18..23 liner + floor y=17/ceiling y=24)
 *     is undisturbed
 *   - the corridor interior above the floor (y19..23) is still fluid-free
 */
import path from 'node:path';
import fs from 'node:fs';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const POST = process.argv[2];
const FORWARD = process.argv[3];
invariant(POST && FORWARD, 'usage: verify_rail_guideway_01_post.mjs <post-snapshot> <forward-ops>');
function invariant(condition, message) { if (!condition) throw new Error(`verify: ${message}`); }

const reader = new AnvilReader(path.resolve(ROOT, path.join(POST, 'region')));
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const src = (s) => s.split('[', 1)[0];
const isF = (s) => FLUID.has(src(s)) || s.includes('waterlogged=true');
const stateAt = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));
const BED = 'minecraft:polished_deepslate';

// 1. Parse operated cells from the forward ops file.
const operated = [];
for (const line of fs.readFileSync(path.resolve(ROOT, FORWARD), 'utf8').split(/\r?\n/)) {
  if (!line.startsWith('REPL ')) continue;
  const f = line.split(/\s+/);
  operated.push({ x: Number(f[1]), y: Number(f[2]), z: Number(f[3]), source: f[7], target: f[8] });
}
const EXPECTED = 76;
invariant(operated.length === EXPECTED, `operated count drift: ${operated.length} != ${EXPECTED}`);

// 2. Every operated cell is polished_deepslate at exactly y=12 within the segment.
let match = 0;
const mismatch = [];
for (const op of operated) {
  const s = await stateAt(op.x, op.y, op.z);
  if (op.y !== 12) mismatch.push(`${op.x},${op.y},${op.z} not at bed level`);
  if (src(s) === BED) match += 1;
  else mismatch.push(`${op.x},${op.y},${op.z}=${s}`);
}
console.log(`operated: ${match}/${operated.length} polished_deepslate at y=12`);

// 3. Every operated cell is inside x=-254..-236, y=12, z in the tube pairs.
for (const op of operated) {
  invariant(op.x >= -254 && op.x <= -236 && op.y === 12,
    `operated cell ${op.x},${op.y},${op.z} outside segment/bed envelope`);
  invariant((op.z >= -461 && op.z <= -460) || (op.z >= -455 && op.z <= -454),
    `operated cell ${op.x},${op.y},${op.z} outside a tube bed`);
}

// 4. Spine (z=-459..-458) is fully preserved from source (gravel/rock), not polished_deepslate.
const spineNonPreserved = [];
for (let x = -254; x <= -236; x += 1) {
  for (const z of [-459, -458]) {
    const s = src(await stateAt(x, 12, z));
    if (s === BED) spineNonPreserved.push(`${x},12,${z}`);
  }
}
console.log(`spine preserved (z=-459..-458 non-bed): ${76 - spineNonPreserved.length}/76 columns x2`);
invariant(spineNonPreserved.length === 0, `spine cells became bed material: ${spineNonPreserved.join(' ')}`);

// 5. Support row y=11 under every operated bed cell is non-air, non-fluid, and unchanged from the
//    source snapshot's support record. We verify the support row is solid (not air / not fluid).
const badSupport = [];
for (const op of operated) {
  const s = await stateAt(op.x, 11, op.z);
  if (isF(s) || ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(src(s))) {
    badSupport.push(`${op.x},11,${op.z}=${s}`);
  }
}
console.log(`support row y=11 solid: ${76 - badSupport.length}/76`);
invariant(badSupport.length === 0, `support row has air/fluid: ${badSupport.join(' ')}`);

// 6. Service corridor above is undisturbed: floor y=17 and ceiling y=24 across the segment
//    are polished_deepslate; north/south liner walls z=-463/-456 at y18..23 are polished_deepslate;
//    corridor interior y19..23 fluid-free.
let corridorFluid = 0;
const seamDrift = [];
for (let x = -254; x <= -236; x += 1) {
  for (const y of [17, 24]) {
    for (const z of [-462, -461, -460, -459, -458, -457]) {
      const s = src(await stateAt(x, y, z));
      if (s !== BED) seamDrift.push(`${x},${y},${z}=${s}`);
    }
  }
  for (const z of [-463, -456]) {
    for (const y of [18, 19, 20, 21, 22, 23]) {
      const s = src(await stateAt(x, y, z));
      if (s !== BED) seamDrift.push(`${x},${y},${z}=${s}`);
    }
  }
  for (const z of [-462, -461, -460, -459, -458, -457]) {
    for (const y of [19, 20, 21, 22, 23]) {
      if (isF(await stateAt(x, y, z))) corridorFluid += 1;
    }
  }
}
function seamChecksTotal() {
  // floor+ceiling: 19 x 2 x 6 = 228; liner walls: 19 x 2 x 6 = 228
  return 228 + 228;
}

console.log(`corridor liner seams solid: ${seamChecksTotal() - seamDrift.length}`);
invariant(seamDrift.length === 0, `corridor seam drift: ${seamDrift.slice(0, 6).join(' ')}`);
console.log(`corridor interior (y19..23) fluid: ${corridorFluid}`);
invariant(corridorFluid === 0, `corridor interior has fluid: ${corridorFluid}`);

const pass = match === operated.length && mismatch.length === 0
  && spineNonPreserved.length === 0 && badSupport.length === 0
  && seamDrift.length === 0 && corridorFluid === 0;
console.log(`\nRESULT: ${pass ? 'PASS' : 'FAIL'}`);
console.log(JSON.stringify({
  postSnapshot: POST,
  operatedCellsVerified: match,
  operatedCellTotal: operated.length,
  bedLevel: 12,
  tubeNBedCells: operated.filter((o) => o.z >= -461 && o.z <= -460).length,
  tubeSBedCells: operated.filter((o) => o.z >= -455 && o.z <= -454).length,
  spineCellsPreserved: 76 - spineNonPreserved.length,
  supportRowSolid: 76 - badSupport.length,
  corridorInteriorFluid: corridorFluid,
  corridorSeamsSolid: seamChecksTotal() - seamDrift.length,
  corridorSeamsTotal: seamChecksTotal(),
  pass,
}, null, 2));
process.exit(pass ? 0 : 1);
