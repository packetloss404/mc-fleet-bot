// Compare two region snapshots and report what CHANGED between them.
//
// Why this exists
// ---------------
// On 2026-07-25 a debris sweep deleted a real furnished building, and the only way to
// establish what was lost — and later to prove the restore was complete — was to diff a
// pre-damage snapshot against the live world position by position. That was done with
// ad-hoc `comm` over sorted text dumps, which is slow, memory-hungry at scale, and was
// itself the source of a bug (a substring material filter that silently dropped the
// tower's structure). This does it directly.
//
// Reports three categories, and the distinction matters:
//   REMOVED  — a block stood there in A, and B has air. This is the damage signal.
//   ADDED    — B has a block where A had air. Usually legitimate later building.
//   CHANGED  — both solid, different block. Re-skins, replacements, decay.
//
// Chunks absent from EITHER snapshot are counted and reported separately, never silently
// treated as empty — "never generated" and "nothing there" are different results, and
// conflating them is how false findings get made on this project.
//
// Read-only. Touches no world, no RCON.
//
// Usage:
//   node scripts/diff_snapshots.mjs --a <dirA> --b <dirB> --box x1 y1 z1 x2 y2 z2 \
//        [--ignore minecraft:water,minecraft:oak_leaves] [--removed-only] [--emit f.txt]
//
//   --emit writes `setblock` commands that would restore every REMOVED block, with its
//   exact block state, sorted by ascending y so attachables re-seat after their support.
//   It writes commands for REVIEW; it never applies them.

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

const DIR_A = arg('--a');
const DIR_B = arg('--b') || 'data/worldsnap/region';
const BOX = (arg('--box', 6) || []).map(Number);
const IGNORE = new Set((arg('--ignore') || '').split(',').filter(Boolean));
const REMOVED_ONLY = has('--removed-only');
const EMIT = arg('--emit');
if (!DIR_A || BOX.length !== 6 || BOX.some(Number.isNaN)) {
  console.error('usage: --a <dirA> [--b <dirB>] --box x1 y1 z1 x2 y2 z2 [--ignore a,b] [--removed-only] [--emit f]');
  process.exit(2);
}
const x1 = Math.min(BOX[0], BOX[3]), x2 = Math.max(BOX[0], BOX[3]);
const y1 = Math.min(BOX[1], BOX[4]), y2 = Math.max(BOX[1], BOX[4]);
const z1 = Math.min(BOX[2], BOX[5]), z2 = Math.max(BOX[2], BOX[5]);

const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const isAir = (n) => !n || AIR.has(n.split('[')[0]);

function decompress(t, d) {
  if (t === 1) return zlib.gunzipSync(d);
  if (t === 2) return zlib.inflateSync(d);
  if (t === 3) return d;
  if (t === 4) return zlib.brotliDecompressSync(d);
  throw new Error('bad compression ' + t);
}
async function readChunk(dir, cx, cz) {
  const p = path.join(dir, `r.${cx >> 5}.${cz >> 5}.mca`);
  if (!fs.existsSync(p)) return null;
  const buf = fs.readFileSync(p);
  const i = ((cx & 31) + (cz & 31) * 32) * 4;
  const off = buf.readUIntBE(i, 3) * 4096;
  if (!off) return null;
  const size = buf.readUInt32BE(off);
  const raw = decompress(buf.readUInt8(off + 4), buf.subarray(off + 5, off + 4 + size));
  const { parsed } = await nbt.parse(raw);
  return nbt.simplify(parsed);
}
const longToBig = (v) => (Array.isArray(v) ? (BigInt(v[0] | 0) << 32n) | BigInt(v[1] >>> 0) : BigInt(v));
const label = (p) => {
  if (!p.Properties) return p.Name;
  const kv = Object.entries(p.Properties).map(([k, v]) => `${k}=${v}`).sort().join(',');
  return kv ? `${p.Name}[${kv}]` : p.Name;
};

// Read one chunk into a Map of "x,y,z" -> block label, clipped to the box.
async function chunkBlocks(dir, cx, cz, into) {
  const ch = await readChunk(dir, cx, cz).catch(() => null);
  if (!ch || !ch.sections) return false;
  for (const sec of ch.sections) {
    const bs = sec.block_states;
    if (!bs || !bs.palette) continue;
    const sy = sec.Y * 16;
    if (sy + 15 < y1 || sy > y2) continue;
    const pal = bs.palette.map(label);
    const put = (x, y, z, name) => {
      if (x < x1 || x > x2 || y < y1 || y > y2 || z < z1 || z > z2) return;
      if (isAir(name)) return;
      into.set(`${x},${y},${z}`, name);
    };
    if (pal.length === 1) {
      if (isAir(pal[0])) continue;
      for (let y = 0; y < 16; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++)
        put(cx * 16 + x, sy + y, cz * 16 + z, pal[0]);
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
      put(cx * 16 + (i & 15), sy + (i >> 8), cz * 16 + ((i >> 4) & 15), pal[pi]);
    }
  }
  return true;
}

const removed = [], added = [], changed = [];
let missA = 0, missB = 0, chunks = 0;

// Chunk-at-a-time keeps peak memory to one chunk per snapshot regardless of box size.
for (let cz = z1 >> 4; cz <= (z2 >> 4); cz++) {
  for (let cx = x1 >> 4; cx <= (x2 >> 4); cx++) {
    const A = new Map(), B = new Map();
    const okA = await chunkBlocks(DIR_A, cx, cz, A);
    const okB = await chunkBlocks(DIR_B, cx, cz, B);
    if (!okA) missA++;
    if (!okB) missB++;
    if (!okA || !okB) continue;
    chunks++;
    for (const [k, na] of A) {
      if (IGNORE.has(na.split('[')[0])) continue;
      const nb = B.get(k);
      if (nb === undefined) removed.push([k, na]);
      else if (nb !== na && !REMOVED_ONLY) changed.push([k, na, nb]);
    }
    if (!REMOVED_ONLY) {
      for (const [k, nb] of B) {
        if (IGNORE.has(nb.split('[')[0])) continue;
        if (!A.has(k)) added.push([k, nb]);
      }
    }
  }
}

const tally = (rows, idx) => {
  const m = new Map();
  for (const r of rows) {
    const n = r[idx].split('[')[0];
    m.set(n, (m.get(n) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};

console.log(`box x[${x1},${x2}] y[${y1},${y2}] z[${z1},${z2}]`);
console.log(`chunks compared: ${chunks}${missA ? `, ${missA} absent from A` : ''}${missB ? `, ${missB} absent from B` : ''}`);
console.log(`\nREMOVED (in A, air in B): ${removed.length}`);
for (const [n, c] of tally(removed, 1).slice(0, 25)) console.log(`  ${String(c).padStart(6)}  ${n}`);
if (!REMOVED_ONLY) {
  console.log(`\nADDED (air in A, block in B): ${added.length}`);
  for (const [n, c] of tally(added, 1).slice(0, 12)) console.log(`  ${String(c).padStart(6)}  ${n}`);
  console.log(`\nCHANGED (different block): ${changed.length}`);
  for (const [n, c] of tally(changed, 1).slice(0, 12)) console.log(`  ${String(c).padStart(6)}  ${n}`);
}

if (EMIT) {
  const lines = removed
    .map(([k, n]) => { const [x, y, z] = k.split(',').map(Number); return { x, y, z, n }; })
    .sort((a, b) => a.y - b.y)
    .map(({ x, y, z, n }) => `setblock ${x} ${y} ${z} ${n} replace`);
  fs.writeFileSync(EMIT, lines.join('\n') + '\n');
  console.log(`\nemitted ${lines.length} restore commands -> ${EMIT} (REVIEW BEFORE APPLYING)`);
}
