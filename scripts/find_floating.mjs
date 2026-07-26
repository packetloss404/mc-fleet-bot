// Find blocks that are NOT connected to the ground — i.e. genuine floating debris —
// by reading a region snapshot offline, and emit commands to remove them.
//
// Why connectivity instead of a material mask
// -------------------------------------------
// Clearing debris by material fails in both directions, and did:
//   * Sparing `#logs` to protect trees also spares floating wooden beams.
//   * Sparing the stone family to protect terrain also spares floating stone slabs.
//   * Including them instead would carve the natural hill and shear tree canopies.
// A material can never distinguish "part of the landscape" from "junk left in the
// sky", because they are made of the same blocks. Connectivity can: a tree is
// reachable from the ground through its trunk, a hill is reachable through itself,
// and a floating slab is reachable from nothing.
//
// Method: load the volume, flood-fill "grounded" upward/outward from every solid
// block in the bottom seed layer through 6-connected solid neighbours, then report
// every solid block above `--min-y` that the flood never reached.
//
// Runs entirely against the snapshot — no RCON, no world writes. It prints the
// removals it would make and, with --emit, writes them for review before anything
// is applied. Deliberately reviewable: the last automated sweep of this world that
// ran without a review step drained a lake.
//
// Usage:
//   node scripts/find_floating.mjs --regions <dir> --box x1 y1 z1 x2 y2 z2 \
//        [--min-y 83] [--emit out.txt] [--max-cluster 400]

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import nbt from 'prismarine-nbt';

const args = process.argv.slice(2);
const arg = (k, n = 1) => {
  const i = args.indexOf(k);
  if (i < 0) return null;
  return n === 1 ? args[i + 1] : args.slice(i + 1, i + 1 + n);
};

const REGIONS = arg('--regions');
const BOX = (arg('--box', 6) || []).map(Number);
const MIN_Y = Number(arg('--min-y') ?? 83);
const EMIT = arg('--emit');
const MAX_CLUSTER = Number(arg('--max-cluster') ?? 400);
if (!REGIONS || BOX.length !== 6 || BOX.some(Number.isNaN)) {
  console.error('usage: --regions <dir> --box x1 y1 z1 x2 y2 z2 [--min-y N] [--emit f] [--max-cluster N]');
  process.exit(2);
}
const [x1, y1, z1, x2, y2, z2] = BOX;

const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
// Fluids and plants must not act as structural bridges, or a waterfall or vine would
// "ground" the debris hanging beside it.
const NON_STRUCTURAL = new Set([
  'minecraft:water', 'minecraft:lava', 'minecraft:short_grass', 'minecraft:tall_grass',
  'minecraft:fern', 'minecraft:large_fern', 'minecraft:vine', 'minecraft:glow_lichen',
  'minecraft:snow', 'minecraft:fire', 'minecraft:seagrass', 'minecraft:kelp',
]);

function regionBuf(rx, rz) {
  const p = path.join(REGIONS, `r.${rx}.${rz}.mca`);
  return fs.existsSync(p) ? fs.readFileSync(p) : null;
}
function decompress(t, d) {
  if (t === 1) return zlib.gunzipSync(d);
  if (t === 2) return zlib.inflateSync(d);
  if (t === 3) return d;
  if (t === 4) return zlib.brotliDecompressSync(d);
  throw new Error('bad compression ' + t);
}
async function readChunk(cx, cz) {
  const buf = regionBuf(cx >> 5, cz >> 5);
  if (!buf) return null;
  const i = ((cx & 31) + (cz & 31) * 32) * 4;
  const off = buf.readUIntBE(i, 3) * 4096;
  if (!off) return null;
  const size = buf.readUInt32BE(off);
  const raw = decompress(buf.readUInt8(off + 4), buf.subarray(off + 5, off + 4 + size));
  const { parsed } = await nbt.parse(raw);
  return nbt.simplify(parsed);
}
const longToBig = (v) => (Array.isArray(v) ? (BigInt(v[0] | 0) << 32n) | BigInt(v[1] >>> 0) : BigInt(v));

const SX = x2 - x1 + 1, SY = y2 - y1 + 1, SZ = z2 - z1 + 1;
const names = [];                    // id -> name
const nameId = new Map();
const idOf = (n) => {
  let i = nameId.get(n);
  if (i === undefined) { i = names.length; names.push(n); nameId.set(n, i); }
  return i;
};
idOf('minecraft:air');               // id 0
const grid = new Uint16Array(SX * SY * SZ);
const at = (x, y, z) => ((y - y1) * SZ + (z - z1)) * SX + (x - x1);
const inBox = (x, y, z) => x >= x1 && x <= x2 && y >= y1 && y <= y2 && z >= z1 && z <= z2;

let chunks = 0;
for (let cz = z1 >> 4; cz <= (z2 >> 4); cz++) {
  for (let cx = x1 >> 4; cx <= (x2 >> 4); cx++) {
    let ch; try { ch = await readChunk(cx, cz); } catch { ch = null; }
    if (!ch || !ch.sections) continue;
    chunks++;
    for (const sec of ch.sections) {
      const bs = sec.block_states;
      if (!bs || !bs.palette) continue;
      const sy = sec.Y * 16;
      if (sy + 15 < y1 || sy > y2) continue;
      const pal = bs.palette.map((p) => idOf(p.Name));
      const put = (wx, wy, wz, pi) => { if (inBox(wx, wy, wz)) grid[at(wx, wy, wz)] = pal[pi]; };
      if (pal.length === 1) {
        if (names[pal[0]] === 'minecraft:air') continue;
        for (let y = 0; y < 16; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++)
          put(cx * 16 + x, sy + y, cz * 16 + z, 0);
        continue;
      }
      const bits = Math.max(4, 32 - Math.clz32(pal.length - 1));
      const per = Math.floor(64 / bits);
      const mask = (1n << BigInt(bits)) - 1n;
      const longs = bs.data || [];
      for (let i = 0; i < 4096; i++) {
        const li = Math.floor(i / per);
        if (li >= longs.length) break;
        const pi = Number((longToBig(longs[li]) >> BigInt((i % per) * bits)) & mask);
        put(cx * 16 + (i & 15), sy + (i >> 8), cz * 16 + ((i >> 4) & 15), pi);
      }
    }
  }
}

const structural = (id) => id !== 0 && !AIR.has(names[id]) && !NON_STRUCTURAL.has(names[id]);

// Flood "grounded" from the bottom seed layer upward through structural neighbours.
const grounded = new Uint8Array(SX * SY * SZ);
const stack = [];
for (let z = z1; z <= z2; z++) for (let x = x1; x <= x2; x++) {
  const i = at(x, y1, z);
  if (structural(grid[i])) { grounded[i] = 1; stack.push([x, y1, z]); }
}
const N6 = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
while (stack.length) {
  const [x, y, z] = stack.pop();
  for (const [dx, dy, dz] of N6) {
    const nx = x + dx, ny = y + dy, nz = z + dz;
    if (!inBox(nx, ny, nz)) continue;
    const j = at(nx, ny, nz);
    if (grounded[j] || !structural(grid[j])) continue;
    grounded[j] = 1; stack.push([nx, ny, nz]);
  }
}

// Floating = structural, above MIN_Y, not grounded. Cluster them so a huge
// unexpected cluster can be reported rather than blindly deleted.
const seen = new Uint8Array(SX * SY * SZ);
const clusters = [];
for (let y = Math.max(y1, MIN_Y); y <= y2; y++) {
  for (let z = z1; z <= z2; z++) for (let x = x1; x <= x2; x++) {
    const i = at(x, y, z);
    if (seen[i] || grounded[i] || !structural(grid[i])) continue;
    const cells = []; const st = [[x, y, z]]; seen[i] = 1;
    while (st.length) {
      const [cx2, cy2, cz2] = st.pop();
      cells.push([cx2, cy2, cz2]);
      for (const [dx, dy, dz] of N6) {
        const nx = cx2 + dx, ny = cy2 + dy, nz = cz2 + dz;
        if (!inBox(nx, ny, nz)) continue;
        const j = at(nx, ny, nz);
        if (seen[j] || grounded[j] || !structural(grid[j])) continue;
        seen[j] = 1; st.push([nx, ny, nz]);
      }
    }
    clusters.push(cells);
  }
}

clusters.sort((a, b) => b.length - a.length);
const total = clusters.reduce((s, c) => s + c.length, 0);
console.error(`chunks read ${chunks}; distinct block types ${names.length}`);
console.error(`FLOATING: ${total} blocks in ${clusters.length} cluster(s) above y${MIN_Y}`);
for (const c of clusters.slice(0, 12)) {
  const xs = c.map((p) => p[0]), ys = c.map((p) => p[1]), zs = c.map((p) => p[2]);
  const mats = {};
  for (const p of c) { const n = names[grid[at(p[0], p[1], p[2])]].replace('minecraft:', ''); mats[n] = (mats[n] || 0) + 1; }
  const top = Object.entries(mats).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k}×${v}`).join(' ');
  console.error(`  ${String(c.length).padStart(5)} blocks  x[${Math.min(...xs)},${Math.max(...xs)}] y[${Math.min(...ys)},${Math.max(...ys)}] z[${Math.min(...zs)},${Math.max(...zs)}]  ${top}`);
}
const oversized = clusters.filter((c) => c.length > MAX_CLUSTER);
if (oversized.length) {
  console.error(`\nWARNING: ${oversized.length} cluster(s) exceed --max-cluster ${MAX_CLUSTER} and are EXCLUDED from --emit.`);
  console.error('A very large "floating" cluster is more likely a real structure the seed layer never reached');
  console.error('than debris — widen the box downward instead of deleting it.');
}
// A tree's OUTER CANOPY connects to its trunk only diagonally, so 6-connectivity
// reports it as floating. Deleting it would shear real trees. Any cluster that is
// mostly leaves/logs is therefore treated as vegetation and left alone — the largest
// cluster found in Ravensreach was exactly this: 122 oak_leaves + 4 oak_log.
const isVegetation = (c) => {
  let veg = 0;
  for (const [x, y, z] of c) {
    const n = names[grid[at(x, y, z)]];
    if (n.endsWith('_leaves') || n.endsWith('_log') || n.endsWith('_wood') || n === 'minecraft:vine') veg++;
  }
  return veg / c.length > 0.6;
};
const vegSkipped = clusters.filter(isVegetation);
if (vegSkipped.length) {
  console.error(`\nSKIPPING ${vegSkipped.length} vegetation cluster(s) (${vegSkipped.reduce((s2, c) => s2 + c.length, 0)} blocks) — tree canopy, not debris`);
}
if (EMIT) {
  const lines = [];
  for (const c of clusters) {
    if (c.length > MAX_CLUSTER) continue;
    if (isVegetation(c)) continue;
    for (const [x, y, z] of c) lines.push(`setblock ${x} ${y} ${z} air`);
  }
  fs.writeFileSync(EMIT, lines.join('\n') + '\n');
  console.error(`\nwrote ${lines.length} setblock lines to ${EMIT}`);
}
