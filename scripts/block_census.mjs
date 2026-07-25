// Report exactly which blocks occupy a box, by reading a region snapshot offline.
//
// Why this exists
// ---------------
// Every audit on this world so far has identified materials by *guessing*: firing
// `execute if block <pos> minecraft:<candidate>` over RCON against a hand-written
// candidate list until one matches. That method has three failure modes, all of
// which have already cost this project real time:
//
//   * It cannot identify a block you did not think to guess. The MSA audit spent a
//     batch of probes on H02's ridge and gave up with "unidentified (not terracotta,
//     not stairs, not copper)". Ravensreach's "20 negative predicates" ended at
//     tall_grass.
//   * A miss is indistinguishable from a wrong guess, so absence of evidence reads
//     as evidence of absence — the same collapse that trap #7 describes.
//   * It is O(candidates) RCON round-trips per position, so it does not scale past
//     spot checks, which is why surveys sampled instead of scanning.
//
// Reading the region files answers "what is actually here" in one pass, with no
// guessing and no round-trips. The palette IS the answer.
//
// This is read-only by construction: it opens .mca files from the local snapshot
// and never touches RCON or the world.
//
// Usage:
//   node scripts/block_census.mjs --regions data/worldsnap/region \
//        --box x1 y1 z1 x2 y2 z2 [--list] [--exclude-air] [--material <id>]
//
//   --list          print every non-air position, not just the per-material tally
//   --material <id> restrict output to one block id (substring match, e.g. "water")
//   --states        keep block states distinct (waterlogged=true is its own entry)
//
// The --states flag matters more than it looks: a waterlogged stair is a hidden
// water source that `execute if block ... minecraft:water` does NOT match and
// `fill ... air replace water` cannot remove. Finding the 15 of them that were
// re-flooding the Ravensreach plaza required reading states offline — exactly this.

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
const has = (k) => args.includes(k);

const REGIONS = arg('--regions') || 'data/worldsnap/region';
const BOX = (arg('--box', 6) || []).map(Number);
const LIST = has('--list');
const STATES = has('--states');
const ONLY = arg('--material');
if (BOX.length !== 6 || BOX.some(Number.isNaN)) {
  console.error('usage: --regions <dir> --box x1 y1 z1 x2 y2 z2 [--list] [--states] [--material <id>]');
  process.exit(2);
}
const x1 = Math.min(BOX[0], BOX[3]), x2 = Math.max(BOX[0], BOX[3]);
const y1 = Math.min(BOX[1], BOX[4]), y2 = Math.max(BOX[1], BOX[4]);
const z1 = Math.min(BOX[2], BOX[5]), z2 = Math.max(BOX[2], BOX[5]);

const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);

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

// A palette entry renders as its name, plus its state suffix when --states is on.
const label = (p) => {
  if (!STATES || !p.Properties) return p.Name;
  const kv = Object.entries(p.Properties).map(([k, v]) => `${k}=${v}`).sort().join(',');
  return kv ? `${p.Name}[${kv}]` : p.Name;
};

const tally = new Map();
const positions = [];
// Chunks the snapshot has no data for. Reported separately: "never generated" is
// not the same result as "empty", and conflating them is how false negatives happen.
let missing = 0, present = 0;

for (let cz = z1 >> 4; cz <= (z2 >> 4); cz++) {
  for (let cx = x1 >> 4; cx <= (x2 >> 4); cx++) {
    let ch;
    try { ch = await readChunk(cx, cz); } catch { ch = null; }
    if (!ch || !ch.sections) { missing++; continue; }
    present++;
    for (const sec of ch.sections) {
      const bs = sec.block_states;
      if (!bs || !bs.palette) continue;
      const sy = sec.Y * 16;
      if (sy + 15 < y1 || sy > y2) continue;
      const pal = bs.palette.map(label);
      const inBox = (x, y, z) => x >= x1 && x <= x2 && y >= y1 && y <= y2 && z >= z1 && z <= z2;
      const record = (x, y, z, name) => {
        if (!inBox(x, y, z)) return;
        if (AIR.has(name.split('[')[0])) return;
        if (ONLY && !name.includes(ONLY)) return;
        tally.set(name, (tally.get(name) || 0) + 1);
        if (LIST) positions.push([x, y, z, name]);
      };
      if (pal.length === 1) {
        if (AIR.has(pal[0].split('[')[0])) continue;
        for (let y = 0; y < 16; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++)
          record(cx * 16 + x, sy + y, cz * 16 + z, pal[0]);
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
        record(cx * 16 + (i & 15), sy + (i >> 8), cz * 16 + ((i >> 4) & 15), pal[pi]);
      }
    }
  }
}

const cells = (x2 - x1 + 1) * (y2 - y1 + 1) * (z2 - z1 + 1);
const total = [...tally.values()].reduce((a, b) => a + b, 0);
console.log(`box x[${x1},${x2}] y[${y1},${y2}] z[${z1},${z2}]  cells=${cells}`);
console.log(`chunks: ${present} read, ${missing} absent from snapshot${missing ? '  <-- NOT "empty", just unread' : ''}`);
console.log(`non-air: ${total}${ONLY ? ` (filtered to "${ONLY}")` : ''}\n`);

for (const [name, n] of [...tally.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(6)}  ${name}`);
}

if (LIST && positions.length) {
  console.log('\npositions:');
  for (const [x, y, z, n] of positions.sort((a, b) => a[1] - b[1] || a[0] - b[0] || a[2] - b[2])) {
    console.log(`  ${x} ${y} ${z}  ${n}`);
  }
}
if (total) {
  const xs = positions.length ? positions.map((p) => p[0]) : null;
  if (xs) {
    const ys = positions.map((p) => p[1]), zs = positions.map((p) => p[2]);
    console.log(`\ncontent bounds: x[${Math.min(...xs)},${Math.max(...xs)}] y[${Math.min(...ys)},${Math.max(...ys)}] z[${Math.min(...zs)},${Math.max(...zs)}]`);
  }
}
