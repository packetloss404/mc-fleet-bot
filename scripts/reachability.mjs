/**
 * reachability.mjs — can a player actually WALK from A to B?
 *
 * WHY THIS EXISTS. `verify_ops.py` samples an ops file against the world and reports
 * whether each block landed. It scored the Moot Hall penthouse descent BUILT 5/5 --
 * every block it sampled genuinely existed -- and the shaft was still unusable: the
 * corridor's own ceiling sealed it at y46, the Sanctum's dome cap sealed it again at
 * y51, and the bottom five blocks had no ladder. Three ops each landed correctly and
 * the result was a staircase to nowhere.
 *
 * Placement verification cannot catch that. This does: it flood-fills the space a
 * player can occupy and reports whether the targets are in the same connected region
 * as the start. Same failure class as the bots that entombed themselves underground.
 *
 * Usage:
 *   node scripts/reachability.mjs --from x,y,z --to x,y,z[;x,y,z...] \
 *        [--regions data/worldsnap/region] [--budget 400000] [--pad 8] [--trace]
 *
 * Exit 0 if every target is reachable, 1 if any is not (and it says which, plus how
 * close the flood got, so you know where the blockage is).
 *
 * Movement model, deliberately conservative -- it under-claims rather than over-claims:
 *   - a standing cell needs 2 blocks of clear head space and support underneath
 *   - you may step UP 1 block, and fall any distance
 *   - ladders, vines and scaffolding permit vertical movement in both directions
 *   - water is swimmable; lava, fire and cactus are refused
 *   - slabs, stairs, carpets, trapdoors and open doors count as passable footing
 * If it says unreachable, it is probably right. If it says reachable, a player can
 * make the trip without breaking a block.
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import nbt from 'prismarine-nbt';

const args = process.argv.slice(2);
const arg = (k, d = null) => {
  const i = args.indexOf(k);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const REGIONS = arg('--regions', 'data/worldsnap/region');
const BUDGET = Number(arg('--budget', 600000));
const PAD = Number(arg('--pad', 10));
const TRACE = args.includes('--trace');

const triple = (s) => s.split(',').map(Number);
const FROM = triple(arg('--from'));
const TARGETS = (arg('--to') || '').split(';').filter(Boolean).map(triple);
if (!FROM || FROM.length !== 3 || !TARGETS.length) {
  console.error('need --from x,y,z and --to x,y,z[;x,y,z...]');
  process.exit(2);
}

/* ------------------------------------------------------------ block semantics */
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const CLIMB = new Set(['minecraft:ladder', 'minecraft:vine', 'minecraft:scaffolding',
                       'minecraft:twisting_vines', 'minecraft:weeping_vines',
                       'minecraft:cave_vines', 'minecraft:cave_vines_plant']);
const SWIM = new Set(['minecraft:water', 'minecraft:bubble_column']);
const DEADLY = new Set(['minecraft:lava', 'minecraft:fire', 'minecraft:soul_fire',
                        'minecraft:cactus', 'minecraft:magma_block',
                        'minecraft:sweet_berry_bush', 'minecraft:powder_snow']);
/** Non-solid decoration you can stand inside. */
const PASSABLE_SUFFIX = ['_carpet', '_banner', '_sign', '_button', '_torch', '_rail',
                         '_pressure_plate', '_sapling', '_fence_gate'];
const PASSABLE_EXACT = new Set(['minecraft:snow', 'minecraft:short_grass',
                                'minecraft:tall_grass', 'minecraft:fern',
                                'minecraft:large_fern', 'minecraft:dead_bush',
                                'minecraft:lantern', 'minecraft:soul_lantern',
                                'minecraft:chain', 'minecraft:end_rod', 'minecraft:light',
                                'minecraft:flower_pot', 'minecraft:lever',
                                'minecraft:tripwire', 'minecraft:cobweb']);

const isAir = (n) => AIR.has(n);
const isClimb = (n) => CLIMB.has(n);
const isSwim = (n) => SWIM.has(n);
const isDeadly = (n) => DEADLY.has(n);
function isOpenDoor(n, st) {
  return n.endsWith('_door') && st && st.open === 'true';
}
/** Can a player's body occupy this cell? */
function passable(n, st) {
  if (isAir(n) || isSwim(n) || isClimb(n)) return true;
  if (isDeadly(n)) return false;
  if (PASSABLE_EXACT.has(n)) return true;
  if (PASSABLE_SUFFIX.some((s) => n.endsWith(s))) return true;
  if (isOpenDoor(n, st)) return true;
  if (n.endsWith('_trapdoor')) return st && st.open === 'true';
  return false;
}
/** Will a player stand on this rather than fall through it? */
function footing(n, st) {
  if (isAir(n)) return false;
  if (isClimb(n) || isSwim(n)) return true;
  if (isDeadly(n)) return false;
  if (n.endsWith('_carpet') || n.endsWith('_slab') || n.endsWith('_stairs')) return true;
  if (n.endsWith('_trapdoor')) return !(st && st.open === 'true');
  if (n.endsWith('_fence') || n.endsWith('_wall') || n.endsWith('_pane')) return true;
  return !passable(n, st);
}

/* ------------------------------------------------------------ world access */
const regionCache = new Map();
function regionBuf(rx, rz) {
  const k = `${rx},${rz}`;
  if (!regionCache.has(k)) {
    const p = path.join(REGIONS, `r.${rx}.${rz}.mca`);
    regionCache.set(k, fs.existsSync(p) ? fs.readFileSync(p) : null);
  }
  return regionCache.get(k);
}
function decompress(t, d) {
  if (t === 1) return zlib.gunzipSync(d);
  if (t === 2) return zlib.inflateSync(d);
  if (t === 3) return d;
  if (t === 4) return zlib.brotliDecompressSync(d);
  throw new Error('bad compression ' + t);
}
const longToBig = (v) =>
  Array.isArray(v) ? (BigInt(v[0] | 0) << 32n) | BigInt(v[1] >>> 0) : BigInt(v);

/** cx,cz -> Map("x,y,z" -> [name, stateObj]) for that chunk, decoded once. */
const chunkCache = new Map();
let chunksRead = 0, chunksMissing = 0;
async function chunkAt(cx, cz) {
  const key = `${cx},${cz}`;
  if (chunkCache.has(key)) return chunkCache.get(key);
  let out = null;
  try {
    const buf = regionBuf(cx >> 5, cz >> 5);
    if (buf) {
      const i = ((cx & 31) + (cz & 31) * 32) * 4;
      const off = buf.readUIntBE(i, 3) * 4096;
      if (off) {
        const size = buf.readUInt32BE(off);
        const raw = decompress(buf.readUInt8(off + 4),
                               buf.subarray(off + 5, off + 4 + size));
        const { parsed } = await nbt.parse(raw);
        const ch = nbt.simplify(parsed);
        out = new Map();
        for (const sec of ch.sections || []) {
          const bs = sec.block_states;
          if (!bs || !bs.palette) continue;
          const sy = sec.Y * 16;
          const pal = bs.palette.map((p) => [p.Name, p.Properties || null]);
          if (pal.length === 1) {
            if (isAir(pal[0][0])) continue;      // air is the default, save the memory
            for (let y = 0; y < 16; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++)
              out.set(`${cx * 16 + x},${sy + y},${cz * 16 + z}`, pal[0]);
            continue;
          }
          const bits = Math.max(4, 32 - Math.clz32(pal.length - 1));
          const per = Math.floor(64 / bits);
          const mask = (1n << BigInt(bits)) - 1n;
          const longs = bs.data || [];
          for (let i2 = 0; i2 < 4096; i2++) {
            const li = Math.floor(i2 / per);
            if (li >= longs.length) break;
            const pi = Number((longToBig(longs[li]) >> BigInt((i2 % per) * bits)) & mask);
            if (isAir(pal[pi][0])) continue;
            out.set(`${cx * 16 + (i2 & 15)},${sy + (i2 >> 8)},${cz * 16 + ((i2 >> 4) & 15)}`,
                    pal[pi]);
          }
        }
      }
    }
  } catch { out = null; }
  if (out) chunksRead++; else chunksMissing++;
  chunkCache.set(key, out);
  return out;
}

const UNKNOWN = ['~unknown~', null];
async function blockAt(x, y, z) {
  const ch = await chunkAt(x >> 4, z >> 4);
  if (!ch) return UNKNOWN;                       // chunk absent: NOT the same as air
  return ch.get(`${x},${y},${z}`) || ['minecraft:air', null];
}

/* ------------------------------------------------------------ the flood */
/** A player standing with feet at (x,y,z): needs feet+head clear, and support. */
async function standable(x, y, z) {
  const [fn, fs_] = await blockAt(x, y, z);
  if (fn === '~unknown~') return false;
  const [hn, hs] = await blockAt(x, y + 1, z);
  if (!passable(fn, fs_) || !passable(hn, hs)) return false;
  if (isClimb(fn) || isSwim(fn)) return true;
  const [bn, bs] = await blockAt(x, y - 1, z);
  return footing(bn, bs);
}

const bbox = (() => {
  const xs = [FROM[0], ...TARGETS.map((t) => t[0])];
  const ys = [FROM[1], ...TARGETS.map((t) => t[1])];
  const zs = [FROM[2], ...TARGETS.map((t) => t[2])];
  return {
    x1: Math.min(...xs) - PAD, x2: Math.max(...xs) + PAD,
    y1: Math.min(...ys) - PAD, y2: Math.max(...ys) + PAD,
    z1: Math.min(...zs) - PAD, z2: Math.max(...zs) + PAD,
  };
})();
const inBox = (x, y, z) =>
  x >= bbox.x1 && x <= bbox.x2 && y >= bbox.y1 && y <= bbox.y2 &&
  z >= bbox.z1 && z <= bbox.z2;

async function run() {
  const key = (x, y, z) => `${x},${y},${z}`;
  const want = new Map(TARGETS.map((t) => [key(...t), t]));
  const seen = new Set();
  let queue = [FROM];
  seen.add(key(...FROM));
  const found = new Set();
  // Closest approach is tracked PER TARGET. A single global best was reported next to
  // whichever target happened to fail, which made a genuine blockage 20 blocks out
  // look like it was 0 blocks away because a different target had been reached.
  const near = new Map(TARGETS.map((t) => [key(...t), { d: Infinity, at: null }]));
  let visited = 0;

  const dist = (a, t) => Math.abs(a[0] - t[0]) + Math.abs(a[1] - t[1]) + Math.abs(a[2] - t[2]);

  if (!(await standable(...FROM))) {
    console.log(`  NOTE: the start cell ${FROM.join(',')} is not standable; ` +
                `flooding from it anyway`);
  }

  while (queue.length && visited < BUDGET) {
    const next = [];
    for (const cur of queue) {
      visited++;
      if (visited > BUDGET) break;
      const k = key(...cur);
      if (want.has(k)) found.add(k);
      for (const t of TARGETS) {
        const tk = key(...t);
        const d = dist(cur, t);
        const n = near.get(tk);
        if (d < n.d) { n.d = d; n.at = cur; }
      }
      const [x, y, z] = cur;
      const [cn] = await blockAt(x, y, z);
      const cands = [];
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        cands.push([x + dx, y, z + dz]);           // walk
        cands.push([x + dx, y + 1, z + dz]);       // step up
        for (let drop = 1; drop <= 4; drop++) cands.push([x + dx, y - drop, z + dz]);
      }
      if (isClimb(cn) || isSwim(cn)) {             // climb or swim in place
        cands.push([x, y + 1, z]);
        cands.push([x, y - 1, z]);
      } else {
        const [an] = await blockAt(x, y + 1, z);
        if (isClimb(an) || isSwim(an)) cands.push([x, y + 1, z]);
        const [bn] = await blockAt(x, y - 1, z);
        if (isClimb(bn) || isSwim(bn)) cands.push([x, y - 1, z]);
      }
      for (const c of cands) {
        if (!inBox(...c)) continue;
        const ck = key(...c);
        if (seen.has(ck)) continue;
        if (!(await standable(...c))) continue;
        seen.add(ck);
        next.push(c);
      }
    }
    queue = next;
  }

  console.log(`  flood: ${seen.size} standable cells reached, ${visited} expanded` +
              ` (chunks ${chunksRead} read, ${chunksMissing} absent)`);
  let bad = 0;
  for (const t of TARGETS) {
    const k = key(...t);
    if (found.has(k)) {
      console.log(`  REACHABLE   ${t.join(',')}`);
    } else {
      bad++;
      const n = near.get(k);
      console.log(`  UNREACHABLE ${t.join(',')}` +
                  (n.at ? `  (closest approach ${n.d} blocks, at ${n.at.join(',')})` : ''));
    }
  }
  if (visited >= BUDGET) {
    console.log('  WARNING: search budget exhausted -- "unreachable" here may mean ' +
                '"not searched". Raise --budget or narrow --pad before believing it.');
  }
  process.exit(bad ? 1 : 0);
}
run();
