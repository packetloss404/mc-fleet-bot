// Extract water blocks from a PRE-DRAIN region snapshot so a drained lake can be
// restored to its exact original shape.
//
// Why this exists: chasing what looked like well spill on the Ravensreach plaza, a
// sequence of wide `fill ... air replace water` passes progressively emptied the
// ADJACENT NATURAL LAKE. The water that "kept coming back" was the lake bleeding
// west through a gap in a too-short dam; each drain took more of it. Guessing the
// shape of a natural feature after damaging it is worse than reading it back, and
// scripts/mc_look.py leaves dated region snapshots behind, so an early enough
// snapshot holds the original terrain exactly.
//
// Reads region .mca files with the same decoder world_render.mjs uses (prismarine-nbt
// + zlib), reports every water block in a box, and emits /setblock lines for a chosen
// subset. It never writes to the world itself — the caller applies the commands, so
// the restore stays reviewable before anything is placed.
//
// Usage:
//   node scripts/lake_restore.mjs --regions /path/to/snapshot/region \
//        --box x1 y1 z1 x2 y2 z2 [--emit out.txt] [--only-source]

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import nbt from 'prismarine-nbt';

const args = process.argv.slice(2);
const getArg = (k, n = 1) => {
  const i = args.indexOf(k);
  if (i < 0) return null;
  return n === 1 ? args[i + 1] : args.slice(i + 1, i + 1 + n);
};

const REGIONS = getArg('--regions');
const BOX = (getArg('--box', 6) || []).map(Number);
const EMIT = getArg('--emit');
const ONLY_SOURCE = args.includes('--only-source');
if (!REGIONS || BOX.length !== 6 || BOX.some(Number.isNaN)) {
  console.error('usage: --regions <dir> --box x1 y1 z1 x2 y2 z2 [--emit file] [--only-source]');
  process.exit(2);
}
const [x1, y1, z1, x2, y2, z2] = BOX;

function regionBuf(rx, rz) {
  const p = path.join(REGIONS, `r.${rx}.${rz}.mca`);
  return fs.existsSync(p) ? fs.readFileSync(p) : null;
}

function decompress(type, data) {
  if (type === 1) return zlib.gunzipSync(data);
  if (type === 2) return zlib.inflateSync(data);
  if (type === 3) return data;
  if (type === 4) return zlib.brotliDecompressSync(data);
  throw new Error('unknown compression ' + type);
}

async function readChunk(cx, cz) {
  const buf = regionBuf(cx >> 5, cz >> 5);
  if (!buf) return null;
  const idx = ((cx & 31) + (cz & 31) * 32) * 4;
  const off = buf.readUIntBE(idx, 3) * 4096;
  const len = buf.readUInt8(idx + 3) * 4096;
  if (!off || !len) return null;
  const size = buf.readUInt32BE(off);
  const ctype = buf.readUInt8(off + 4);
  const raw = decompress(ctype, buf.subarray(off + 5, off + 4 + size));
  const { parsed } = await nbt.parse(raw);
  return nbt.simplify(parsed);
}

const longToBig = (v) =>
  Array.isArray(v) ? (BigInt(v[0] | 0) << 32n) | BigInt(v[1] >>> 0) : BigInt(v);

const found = [];
const c0x = x1 >> 4, c1x = x2 >> 4, c0z = z1 >> 4, c1z = z2 >> 4;
let chunks = 0, missing = 0;

for (let cz = c0z; cz <= c1z; cz++) {
  for (let cx = c0x; cx <= c1x; cx++) {
    let ch;
    try { ch = await readChunk(cx, cz); } catch { ch = null; }
    if (!ch || !ch.sections) { missing++; continue; }
    chunks++;
    for (const sec of ch.sections) {
      const bs = sec.block_states;
      if (!bs || !bs.palette) continue;
      const sy = sec.Y * 16;
      if (sy + 15 < y1 || sy > y2) continue;

      // Which palette entries are water, and is each a source (level 0)?
      const isWater = bs.palette.map((p) => p.Name === 'minecraft:water');
      const isSource = bs.palette.map(
        (p) => p.Name === 'minecraft:water' &&
               (!p.Properties || p.Properties.level === undefined || String(p.Properties.level) === '0'),
      );
      if (!isWater.some(Boolean)) continue;

      const record = (wx, wy, wz, pi) => {
        if (wx < x1 || wx > x2 || wy < y1 || wy > y2 || wz < z1 || wz > z2) return;
        if (!isWater[pi]) return;
        if (ONLY_SOURCE && !isSource[pi]) return;
        found.push([wx, wy, wz, isSource[pi]]);
      };

      if (bs.palette.length === 1) {
        for (let y = 0; y < 16; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++)
          record(cx * 16 + x, sy + y, cz * 16 + z, 0);
        continue;
      }
      const bits = Math.max(4, 32 - Math.clz32(bs.palette.length - 1));
      const per = Math.floor(64 / bits);
      const mask = (1n << BigInt(bits)) - 1n;
      const longs = bs.data || [];
      for (let i = 0; i < 4096; i++) {
        const li = Math.floor(i / per);
        if (li >= longs.length) break;
        const shift = BigInt((i % per) * bits);
        const pi = Number((longToBig(longs[li]) >> shift) & mask);
        const x = i & 15, z = (i >> 4) & 15, y = i >> 8;
        record(cx * 16 + x, sy + y, cz * 16 + z, pi);
      }
    }
  }
}

const sources = found.filter((f) => f[3]).length;
console.error(`chunks read ${chunks}, missing ${missing}`);
console.error(`water blocks in box: ${found.length} (sources ${sources}, flowing ${found.length - sources})`);
if (found.length) {
  const xs = found.map((f) => f[0]), ys = found.map((f) => f[1]), zs = found.map((f) => f[2]);
  console.error(`extent x[${Math.min(...xs)},${Math.max(...xs)}] y[${Math.min(...ys)},${Math.max(...ys)}] z[${Math.min(...zs)},${Math.max(...zs)}]`);
  const byY = {};
  for (const f of found) byY[f[1]] = (byY[f[1]] || 0) + 1;
  console.error('per y: ' + Object.entries(byY).map(([k, v]) => `y${k}=${v}`).join(' '));
}
if (EMIT) {
  // Only sources are worth restoring: flowing water regenerates from them, and
  // placing flow directly would just drain away.
  // Emit EVERY original water position, not only the ones detected as sources.
  // Placed water settles to its natural level, whereas restoring "sources only"
  // would under-fill wherever the snapshot recorded flow. Faithful shape beats
  // faithful block-state here.
  const lines = found.map((f) => `setblock ${f[0]} ${f[1]} ${f[2]} water`);
  fs.writeFileSync(EMIT, lines.join('\n') + '\n');
  console.error(`wrote ${lines.length} setblock lines to ${EMIT}`);
}
