#!/usr/bin/env node
/**
 * world_render.mjs — offline renderer for Minecraft 1.18+ Anvil region files.
 *
 * Reads .mca region files directly (no live client, no GPU) and produces a PNG:
 *   --mode persp   first-person perspective view from an arbitrary eye point
 *   --mode map     top-down orthographic surface map
 *
 * Dependencies: prismarine-nbt + canvas (both already in this repo's node_modules),
 * plus node's builtin zlib. Nothing else.
 *
 * Usage examples:
 *   node scripts/world_render.mjs --regions <dir> --mode persp \
 *        --eye -85,80,-340 --look -85,66,-375 --w 1280 --h 720 --out /tmp/a.png
 *   node scripts/world_render.mjs --regions <dir> --mode persp \
 *        --eye -85,72,-340 --yaw 180 --pitch 10 --fov 70 --out /tmp/b.png
 *   node scripts/world_render.mjs --regions <dir> --mode map \
 *        --center -85,-375 --span 256 --out /tmp/map.png
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import nbt from 'prismarine-nbt';
import { createCanvas } from 'canvas';

// ---------------------------------------------------------------- args
const A = {};
{
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (!a[i].startsWith('--')) continue;
    const tok = a[i].slice(2);
    const eq = tok.indexOf('=');
    if (eq !== -1) { A[tok.slice(0, eq)] = tok.slice(eq + 1); continue; }
    // a value may legitimately start with '-' (negative coords); only treat the
    // next token as a new flag if it starts with '--' followed by a letter.
    const nxt = a[i + 1];
    A[tok] = (nxt !== undefined && !/^--[A-Za-z]/.test(nxt)) ? a[++i] : 'true';
  }
}
const num = (s, d) => (s === undefined ? d : Number(s));
const vec = (s, d) => (s === undefined ? d : s.split(',').map(Number));

const REGION_DIR = A.regions || path.join(process.cwd(), 'world', 'region');
const MODE = A.mode || 'persp';
const W = num(A.w, 1280), H = num(A.h, 720);
const OUT = A.out || '/tmp/world_render.png';
const MAXDIST = num(A.dist, 240);
const FOV = num(A.fov, 70);
const SHADOWS = A.shadows === 'true' || A.shadows === '1';

// ---------------------------------------------------------------- anvil
const regionCache = new Map();
function regionBuf(rx, rz) {
  const key = `${rx},${rz}`;
  if (regionCache.has(key)) return regionCache.get(key);
  const p = path.join(REGION_DIR, `r.${rx}.${rz}.mca`);
  let b = null;
  try { b = fs.readFileSync(p); } catch { b = null; }
  regionCache.set(key, b);
  return b;
}

function decompress(type, data) {
  if (type === 1) return zlib.gunzipSync(data);
  if (type === 2) return zlib.inflateSync(data);
  if (type === 3) return data;
  throw new Error('unsupported chunk compression type ' + type);
}

/** raw NBT (simplified) for one chunk, or null if not generated */
async function readChunk(cx, cz) {
  const rx = Math.floor(cx / 32), rz = Math.floor(cz / 32);
  const buf = regionBuf(rx, rz);
  if (!buf) return null;
  const idx = ((cx & 31) + (cz & 31) * 32) * 4;
  if (idx + 4 > buf.length) return null;
  const off = ((buf[idx] << 16) | (buf[idx + 1] << 8) | buf[idx + 2]) * 4096;
  const cnt = buf[idx + 3];
  if (off === 0 || cnt === 0 || off + 5 > buf.length) return null;
  const len = buf.readInt32BE(off);
  const ctype = buf[off + 4];
  const payload = buf.subarray(off + 5, off + 4 + len);
  let raw;
  try { raw = decompress(ctype, payload); } catch { return null; }
  const { parsed } = await nbt.parse(raw);
  return nbt.simplify(parsed);
}

const longToBig = (v) => {
  if (typeof v === 'bigint') return v;
  if (Array.isArray(v)) return (BigInt(v[0]) << 32n) | BigInt(v[1] >>> 0);
  return BigInt(v);
};

// ---------------------------------------------------------------- volume
// Sparse-by-section dense volume over a bounding box, values = index into names[]
const names = ['minecraft:air'];
const nameId = new Map([['minecraft:air', 0]]);
function idOf(n) {
  let i = nameId.get(n);
  if (i === undefined) { i = names.length; names.push(n); nameId.set(n, i); }
  return i;
}

class Volume {
  constructor(ox, oy, oz, sx, sy, sz) {
    Object.assign(this, { ox, oy, oz, sx, sy, sz });
    this.data = new Uint16Array(sx * sy * sz);
  }
  set(x, y, z, v) {
    const i = x - this.ox, j = y - this.oy, k = z - this.oz;
    if (i < 0 || j < 0 || k < 0 || i >= this.sx || j >= this.sy || k >= this.sz) return;
    this.data[(j * this.sz + k) * this.sx + i] = v;
  }
  get(x, y, z) {
    const i = x - this.ox, j = y - this.oy, k = z - this.oz;
    if (i < 0 || j < 0 || k < 0 || i >= this.sx || j >= this.sy || k >= this.sz) return 0;
    return this.data[(j * this.sz + k) * this.sx + i];
  }
}

async function loadVolume(minX, minY, minZ, maxX, maxY, maxZ) {
  const vol = new Volume(minX, minY, minZ, maxX - minX + 1, maxY - minY + 1, maxZ - minZ + 1);
  const c0x = minX >> 4, c1x = maxX >> 4, c0z = minZ >> 4, c1z = maxZ >> 4;
  let loaded = 0, missing = 0;
  for (let cz = c0z; cz <= c1z; cz++) {
    for (let cx = c0x; cx <= c1x; cx++) {
      let ch;
      try { ch = await readChunk(cx, cz); } catch { ch = null; }
      if (!ch || !ch.sections) { missing++; continue; }
      loaded++;
      for (const sec of ch.sections) {
        const bs = sec.block_states;
        if (!bs || !bs.palette) continue;
        const sy = sec.Y * 16;
        if (sy + 15 < minY || sy > maxY) continue;
        const pal = bs.palette.map((p) => idOf(p.Name));
        if (pal.length === 1) {
          if (pal[0] === 0) continue;
          for (let y = 0; y < 16; y++) {
            const wy = sy + y; if (wy < minY || wy > maxY) continue;
            for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++)
              vol.set(cx * 16 + x, wy, cz * 16 + z, pal[0]);
          }
          continue;
        }
        const bits = Math.max(4, 32 - Math.clz32(pal.length - 1));
        const per = Math.floor(64 / bits);
        const mask = (1n << BigInt(bits)) - 1n;
        const longs = bs.data.map(longToBig);
        for (let i = 0; i < 4096; i++) {
          const li = Math.floor(i / per);
          if (li >= longs.length) break;
          const shift = BigInt((i % per) * bits);
          const pi = Number((longs[li] >> shift) & mask);
          const v = pal[pi] ?? 0;
          if (v === 0) continue;
          const y = i >> 8, z = (i >> 4) & 15, x = i & 15;
          const wy = sy + y; if (wy < minY || wy > maxY) continue;
          vol.set(cx * 16 + x, wy, cz * 16 + z, v);
        }
      }
    }
  }
  return { vol, loaded, missing };
}

// ---------------------------------------------------------------- colours
const EXACT = {
  'minecraft:grass_block': [102, 142, 62], 'minecraft:dirt': [134, 96, 67],
  'minecraft:coarse_dirt': [122, 88, 62], 'minecraft:rooted_dirt': [144, 105, 78],
  'minecraft:dirt_path': [154, 132, 78], 'minecraft:podzol': [88, 62, 30],
  'minecraft:stone': [125, 125, 125], 'minecraft:cobblestone': [122, 122, 122],
  'minecraft:mossy_cobblestone': [104, 118, 96], 'minecraft:gravel': [131, 127, 126],
  'minecraft:andesite': [136, 136, 138], 'minecraft:diorite': [188, 188, 190],
  'minecraft:granite': [154, 106, 88], 'minecraft:deepslate': [78, 78, 82],
  'minecraft:cobbled_deepslate': [77, 77, 80], 'minecraft:tuff': [108, 109, 102],
  'minecraft:bedrock': [51, 51, 51], 'minecraft:sand': [219, 207, 163],
  'minecraft:sandstone': [216, 203, 155], 'minecraft:smooth_sandstone': [222, 211, 166],
  'minecraft:cut_sandstone': [214, 201, 154], 'minecraft:red_sand': [190, 102, 33],
  'minecraft:clay': [160, 166, 179], 'minecraft:water': [50, 90, 190],
  'minecraft:lava': [214, 96, 20], 'minecraft:ice': [160, 190, 240],
  'minecraft:snow': [248, 252, 252], 'minecraft:snow_block': [248, 252, 252],
  'minecraft:oak_planks': [162, 130, 78], 'minecraft:spruce_planks': [114, 84, 48],
  'minecraft:birch_planks': [196, 179, 123], 'minecraft:jungle_planks': [160, 115, 80],
  'minecraft:acacia_planks': [168, 90, 50], 'minecraft:dark_oak_planks': [66, 43, 20],
  'minecraft:mangrove_planks': [117, 54, 48], 'minecraft:cherry_planks': [226, 177, 172],
  'minecraft:bamboo_planks': [197, 168, 76],
  'minecraft:oak_log': [104, 83, 50], 'minecraft:spruce_log': [58, 39, 23],
  'minecraft:birch_log': [216, 215, 210], 'minecraft:dark_oak_log': [60, 45, 26],
  'minecraft:stripped_oak_log': [177, 144, 86],
  'minecraft:oak_leaves': [60, 106, 40], 'minecraft:spruce_leaves': [40, 74, 40],
  'minecraft:birch_leaves': [102, 130, 62], 'minecraft:dark_oak_leaves': [50, 96, 30],
  'minecraft:jungle_leaves': [56, 116, 32], 'minecraft:azalea_leaves': [90, 130, 50],
  'minecraft:bricks': [150, 97, 83], 'minecraft:stone_bricks': [122, 122, 122],
  'minecraft:mossy_stone_bricks': [110, 118, 102], 'minecraft:cracked_stone_bricks': [118, 117, 117],
  'minecraft:chiseled_stone_bricks': [118, 118, 118], 'minecraft:smooth_stone': [158, 158, 158],
  'minecraft:polished_andesite': [132, 134, 133], 'minecraft:polished_granite': [156, 110, 92],
  'minecraft:polished_diorite': [192, 192, 194], 'minecraft:polished_deepslate': [72, 72, 75],
  'minecraft:deepslate_bricks': [70, 70, 73], 'minecraft:deepslate_tiles': [55, 55, 57],
  'minecraft:blackstone': [42, 36, 41], 'minecraft:polished_blackstone': [48, 43, 51],
  'minecraft:polished_blackstone_bricks': [48, 42, 50],
  'minecraft:glass': [190, 220, 235], 'minecraft:glass_pane': [190, 220, 235],
  'minecraft:tinted_glass': [50, 46, 50],
  'minecraft:iron_block': [220, 220, 220], 'minecraft:gold_block': [246, 208, 62],
  'minecraft:diamond_block': [98, 219, 213], 'minecraft:emerald_block': [42, 203, 88],
  'minecraft:netherite_block': [66, 60, 62], 'minecraft:copper_block': [193, 107, 76],
  'minecraft:oxidized_copper': [82, 162, 132], 'minecraft:redstone_block': [175, 24, 5],
  'minecraft:lapis_block': [30, 67, 140], 'minecraft:coal_block': [16, 15, 15],
  'minecraft:quartz_block': [236, 231, 224], 'minecraft:smooth_quartz': [236, 231, 224],
  'minecraft:chiseled_quartz_block': [232, 227, 219],
  'minecraft:bookshelf': [110, 86, 52], 'minecraft:crafting_table': [124, 88, 55],
  'minecraft:furnace': [110, 110, 110], 'minecraft:chest': [140, 105, 48],
  'minecraft:barrel': [125, 96, 54], 'minecraft:lectern': [130, 100, 58],
  'minecraft:hay_block': [166, 139, 24], 'minecraft:glowstone': [222, 194, 132],
  'minecraft:sea_lantern': [190, 210, 200], 'minecraft:torch': [230, 190, 90],
  'minecraft:lantern': [190, 150, 90], 'minecraft:campfire': [150, 100, 50],
  'minecraft:netherrack': [98, 38, 38], 'minecraft:obsidian': [20, 16, 30],
  'minecraft:terracotta': [152, 94, 68], 'minecraft:white_terracotta': [210, 178, 161],
  'minecraft:white_concrete': [207, 213, 214], 'minecraft:gray_concrete': [54, 57, 61],
  'minecraft:light_gray_concrete': [125, 125, 115], 'minecraft:black_concrete': [8, 10, 15],
  'minecraft:red_concrete': [142, 33, 33], 'minecraft:blue_concrete': [44, 46, 143],
  'minecraft:green_concrete': [73, 91, 36], 'minecraft:yellow_concrete': [241, 175, 21],
  'minecraft:white_wool': [234, 236, 237], 'minecraft:rail': [140, 130, 110],
  'minecraft:short_grass': [96, 140, 60], 'minecraft:tall_grass': [96, 140, 60],
  'minecraft:fern': [90, 132, 56], 'minecraft:large_fern': [90, 132, 56],
  'minecraft:farmland': [110, 76, 45], 'minecraft:wheat': [176, 176, 80],
  'minecraft:moss_block': [90, 120, 50], 'minecraft:mud': [60, 55, 55],
  'minecraft:calcite': [224, 224, 218], 'minecraft:amethyst_block': [134, 98, 200],
  'minecraft:prismarine': [99, 156, 151], 'minecraft:dark_prismarine': [51, 91, 75],
  'minecraft:purpur_block': [169, 125, 169], 'minecraft:end_stone': [219, 222, 158],
  'minecraft:mud_bricks': [137, 105, 78], 'minecraft:packed_mud': [142, 106, 79],
};
const KEYWORDS = [
  [/deepslate/, [76, 76, 80]], [/blackstone/, [45, 39, 47]], [/quartz/, [235, 230, 222]],
  [/sandstone/, [216, 203, 155]], [/_sand$/, [219, 207, 163]], [/prismarine/, [90, 148, 143]],
  [/copper/, [193, 107, 76]], [/terracotta/, [152, 94, 68]], [/glazed/, [180, 160, 150]],
  [/concrete_powder/, [170, 170, 160]], [/concrete/, [130, 130, 130]],
  [/_wool$|carpet/, [200, 200, 200]], [/leaves|vine|azalea|lily_pad/, [58, 104, 40]],
  [/_log$|_wood$|stem|hyphae/, [100, 78, 48]], [/planks|_door$|trapdoor|fence|_sign$|barrel|bookshelf/, [155, 124, 74]],
  [/_stairs$|_slab$|_wall$/, [128, 128, 128]], [/brick/, [150, 97, 83]],
  [/stone/, [126, 126, 126]], [/glass/, [190, 220, 235]],
  [/water|kelp|seagrass|bubble/, [50, 90, 190]], [/lava|magma|fire/, [214, 96, 20]],
  [/ice|snow/, [230, 240, 248]], [/grass|moss|bamboo|sugar_cane|fern/, [96, 140, 60]],
  [/dirt|mud|podzol|farmland/, [134, 96, 67]], [/gold|yellow/, [230, 190, 60]],
  [/iron|anvil|chain|rail|lantern|light/, [190, 190, 190]], [/red|crimson|nether/, [150, 50, 45]],
  [/flower|tulip|poppy|dandelion|petal/, [200, 150, 160]],
  [/ore$/, [130, 130, 130]], [/torch|candle|lamp/, [225, 190, 110]],
];
const colorCache = new Map();
function colorOf(id) {
  let c = colorCache.get(id);
  if (c) return c;
  const n = names[id];
  c = EXACT[n];
  if (!c) { for (const [re, col] of KEYWORDS) if (re.test(n)) { c = col; break; } }
  if (!c) {
    let h = 0; for (let i = 0; i < n.length; i++) h = (h * 131 + n.charCodeAt(i)) | 0;
    c = [120 + (h & 63), 110 + ((h >> 6) & 63), 110 + ((h >> 12) & 63)];
  }
  colorCache.set(id, c);
  return c;
}
const TRANSPARENTISH = new Set();
function isSeeThrough(id) {
  const n = names[id];
  return /glass|water|ice$|leaves|vine|fence|pane|torch|rail|grass$|fern|flower|snow$|carpet|sign|button|pressure|lily|bars|chain|sapling|wheat|kelp|seagrass|petal|amethyst_cluster|air$/.test(n);
}
function isSkippable(id) {
  const n = names[id];
  return /^minecraft:(air|cave_air|void_air|light|barrier|structure_void|moving_piston)$/.test(n);
}

// ---------------------------------------------------------------- render
function dirFromYawPitch(yaw, pitch) {
  const y = yaw * Math.PI / 180, p = pitch * Math.PI / 180;
  return [-Math.sin(y) * Math.cos(p), -Math.sin(p), Math.cos(y) * Math.cos(p)];
}
function yawPitchTo(eye, tgt) {
  const dx = tgt[0] - eye[0], dy = tgt[1] - eye[1], dz = tgt[2] - eye[2];
  const yaw = -Math.atan2(dx, dz) * 180 / Math.PI;
  const pitch = -Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI;
  return [yaw, pitch];
}

async function renderPersp() {
  const eye = vec(A.eye, [-85, 80, -340]);
  let yaw, pitch;
  if (A.look) [yaw, pitch] = yawPitchTo(eye, vec(A.look));
  else { yaw = num(A.yaw, 180); pitch = num(A.pitch, 15); }

  const pad = MAXDIST + 4;
  const minX = Math.floor(eye[0] - pad), maxX = Math.ceil(eye[0] + pad);
  const minZ = Math.floor(eye[2] - pad), maxZ = Math.ceil(eye[2] + pad);
  const minY = Math.max(-64, num(A.ymin, Math.floor(eye[1] - 96)));
  const maxY = Math.min(319, num(A.ymax, Math.ceil(eye[1] + 96)));
  process.stderr.write(`loading volume x[${minX},${maxX}] y[${minY},${maxY}] z[${minZ},${maxZ}]\n`);
  const t0 = Date.now();
  const { vol, loaded, missing } = await loadVolume(minX, minY, minZ, maxX, maxY, maxZ);
  process.stderr.write(`chunks loaded=${loaded} missing=${missing} in ${Date.now() - t0}ms; palette=${names.length}\n`);
  // --auto: drop/raise the eye to standing height on the highest solid ground at/below eye.y+32
  if (A.auto === 'true' || A.auto === '1' || A.above !== undefined) {
    const bx = Math.floor(eye[0]), bz = Math.floor(eye[2]);
    let ground = null;
    for (let y = Math.min(maxY, Math.ceil(eye[1]) + 32); y > minY; y--) {
      const id = vol.get(bx, y, bz);
      if (id !== 0 && !isSkippable(id) && !isSeeThrough(id)) { ground = y; break; }
    }
    if (ground !== null) {
      eye[1] = ground + 1 + num(A.above, 1.62);
      if (A.look) [yaw, pitch] = yawPitchTo(eye, vec(A.look));
      process.stderr.write(`--auto: ground y=${ground} -> eye y=${eye[1].toFixed(2)}\n`);
    } else process.stderr.write('--auto: no ground found, keeping eye y\n');
  }
  process.stderr.write(`camera eye=${eye.join(',')} yaw=${yaw.toFixed(2)} pitch=${pitch.toFixed(2)} fov=${FOV}\n`);

  const F = dirFromYawPitch(yaw, pitch);
  let R = [-F[2], 0, F[0]];
  let rl = Math.hypot(R[0], R[2]) || 1; R = [R[0] / rl, 0, R[2] / rl];
  const U = [R[1] * F[2] - R[2] * F[1], R[2] * F[0] - R[0] * F[2], R[0] * F[1] - R[1] * F[0]];
  const aspect = W / H;
  const tY = Math.tan(FOV * Math.PI / 360), tX = tY * aspect;
  const SUN = (() => { const d = [-0.45, -0.82, 0.35]; const l = Math.hypot(...d); return d.map((v) => v / l); })();

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(W, H);
  const px = img.data;

  const cast = (ox, oy, oz, dx, dy, dz, maxd) => {
    // DDA voxel traversal; returns {id, nx,ny,nz, dist} or null
    let ix = Math.floor(ox), iy = Math.floor(oy), iz = Math.floor(oz);
    const sx = dx > 0 ? 1 : -1, sy = dy > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
    const idx = dx !== 0 ? Math.abs(1 / dx) : 1e30;
    const idy = dy !== 0 ? Math.abs(1 / dy) : 1e30;
    const idz = dz !== 0 ? Math.abs(1 / dz) : 1e30;
    let tx = dx !== 0 ? ((dx > 0 ? ix + 1 - ox : ox - ix) * idx) : 1e30;
    let ty = dy !== 0 ? ((dy > 0 ? iy + 1 - oy : oy - iy) * idy) : 1e30;
    let tz = dz !== 0 ? ((dz > 0 ? iz + 1 - oz : oz - iz) * idz) : 1e30;
    let t = 0, axis = 1, step = sy;
    while (t < maxd) {
      if (tx < ty && tx < tz) { ix += sx; t = tx; tx += idx; axis = 0; step = sx; }
      else if (ty < tz) { iy += sy; t = ty; ty += idy; axis = 1; step = sy; }
      else { iz += sz; t = tz; tz += idz; axis = 2; step = sz; }
      if (iy < minY || iy > maxY || ix < minX || ix > maxX || iz < minZ || iz > maxZ) return null;
      const id = vol.get(ix, iy, iz);
      if (id !== 0 && !isSkippable(id)) return { id, axis, step, t, ix, iy, iz };
    }
    return null;
  };

  let hits = 0;
  for (let y = 0; y < H; y++) {
    const sv = 1 - (y + 0.5) / H * 2;
    for (let x = 0; x < W; x++) {
      const su = (x + 0.5) / W * 2 - 1;
      let dx = F[0] + R[0] * su * tX + U[0] * sv * tY;
      let dy = F[1] + R[1] * su * tX + U[1] * sv * tY;
      let dz = F[2] + R[2] * su * tX + U[2] * sv * tY;
      const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;

      // sky gradient (used as background and behind transparent blends)
      const up = Math.max(0, dy);
      let r = 135 + 70 * up, g = 176 + 55 * up, b = 226 + 25 * up;

      let ox = eye[0], oy = eye[1], oz = eye[2], remaining = MAXDIST;
      let acc = [0, 0, 0], alpha = 0, travelled = 0;
      for (let bounce = 0; bounce < 12 && alpha < 0.97; bounce++) {
        const h = cast(ox, oy, oz, dx, dy, dz, remaining);
        if (!h) break;
        hits++;
        travelled += h.t;
        const c = colorOf(h.id);
        // face shading
        let nx = 0, ny = 0, nz = 0;
        if (h.axis === 0) nx = -h.step; else if (h.axis === 1) ny = -h.step; else nz = -h.step;
        let lam = 0.55 + 0.45 * Math.max(0, -(nx * SUN[0] + ny * SUN[1] + nz * SUN[2]));
        if (ny === 1) lam = Math.max(lam, 1.0);
        if (ny === -1) lam = Math.min(lam, 0.45);
        if (h.axis === 0) lam *= 0.86; else if (h.axis === 2) lam *= 0.74;
        if (SHADOWS && ny === 1) {
          const s = cast(h.ix + 0.5 - SUN[0] * 0.001, h.iy + 1.001, h.iz + 0.5 - SUN[2] * 0.001,
            -SUN[0], -SUN[1], -SUN[2], 48);
          if (s) lam *= 0.62;
        }
        const fog = Math.min(1, travelled / MAXDIST) ** 1.4;
        let cr = c[0] * lam, cg = c[1] * lam, cb = c[2] * lam;
        cr = cr * (1 - fog) + (185) * fog; cg = cg * (1 - fog) + (205) * fog; cb = cb * (1 - fog) + (230) * fog;
        const see = isSeeThrough(h.id);
        const a = see ? 0.42 : 1;
        const w = (1 - alpha) * a;
        acc[0] += cr * w; acc[1] += cg * w; acc[2] += cb * w; alpha += w;
        if (!see) break;
        remaining -= h.t + 0.001;
        if (remaining <= 0) break;
        ox += dx * (h.t + 0.001); oy += dy * (h.t + 0.001); oz += dz * (h.t + 0.001);
      }
      r = acc[0] + r * (1 - alpha); g = acc[1] + g * (1 - alpha); b = acc[2] + b * (1 - alpha);
      const o = (y * W + x) * 4;
      px[o] = r | 0; px[o + 1] = g | 0; px[o + 2] = b | 0; px[o + 3] = 255;
    }
    if (y % 90 === 0) process.stderr.write(`  row ${y}/${H}\n`);
  }
  ctx.putImageData(img, 0, 0);
  // HUD
  ctx.font = '14px DejaVu Sans, sans-serif';
  const label = `eye ${eye.map((v) => Math.round(v)).join(' ')}  yaw ${yaw.toFixed(0)}  pitch ${pitch.toFixed(0)}  fov ${FOV}` +
    (A.look ? `  -> look ${vec(A.look).join(' ')}` : '');
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, H - 24, ctx.measureText(label).width + 16, 24);
  ctx.fillStyle = '#fff';
  ctx.fillText(label, 8, H - 7);
  fs.writeFileSync(OUT, canvas.toBuffer('image/png'));
  process.stderr.write(`rays hit=${hits}\n`);
}

async function renderMap() {
  const c = vec(A.center, [-85, -375]);
  const span = num(A.span, 256);
  const half = Math.floor(span / 2);
  // Authored union bounds commonly have half-block centers (for example
  // 933.5,-442.5). Anvil cells are integer-addressed; carrying the fraction
  // into every volume lookup silently produces an all-background map.
  const centerX = Math.round(c[0]);
  const centerZ = Math.round(c[1]);
  const minX = centerX - half, maxX = centerX + half - 1;
  const minZ = centerZ - half, maxZ = centerZ + half - 1;
  const minY = num(A.ymin, -64), maxY = num(A.ymax, 200);
  const t0 = Date.now();
  const { vol, loaded, missing } = await loadVolume(minX, minY, minZ, maxX, maxY, maxZ);
  process.stderr.write(`chunks loaded=${loaded} missing=${missing} in ${Date.now() - t0}ms\n`);
  const scale = Math.max(1, Math.floor(num(A.scale, Math.max(1, Math.floor(1024 / span)))));
  const w = span * scale, h = span * scale;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h);
  const px = img.data;
  const heights = new Int16Array(span * span);
  const ids = new Uint16Array(span * span);
  for (let k = 0; k < span; k++) for (let i = 0; i < span; i++) {
    const wx = minX + i, wz = minZ + k;
    let top = minY - 1, id = 0;
    for (let y = maxY; y >= minY; y--) {
      const v = vol.get(wx, y, wz);
      if (v !== 0 && !isSkippable(v) && !/^minecraft:(short_grass|tall_grass|fern|large_fern)$/.test(names[v])) { top = y; id = v; break; }
    }
    heights[k * span + i] = top; ids[k * span + i] = id;
  }
  for (let k = 0; k < span; k++) for (let i = 0; i < span; i++) {
    const id = ids[k * span + i];
    const c0 = id ? colorOf(id) : [20, 20, 24];
    const hh = heights[k * span + i];
    const hn = i > 0 ? heights[k * span + i - 1] : hh;
    const hw = k > 0 ? heights[(k - 1) * span + i] : hh;
    let sh = 1 + Math.max(-0.35, Math.min(0.35, ((hh - hn) + (hh - hw)) * 0.12));
    sh *= 0.72 + 0.28 * Math.min(1, Math.max(0, (hh + 64) / 200));
    for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
      const o = ((k * scale + dy) * w + i * scale + dx) * 4;
      px[o] = Math.min(255, c0[0] * sh) | 0;
      px[o + 1] = Math.min(255, c0[1] * sh) | 0;
      px[o + 2] = Math.min(255, c0[2] * sh) | 0;
      px[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  ctx.font = '14px DejaVu Sans, sans-serif';
  const label = `top-down  centre x=${centerX} z=${centerZ}  span ${span}  (north = up, -Z)`;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, h - 24, ctx.measureText(label).width + 16, 24);
  ctx.fillStyle = '#fff'; ctx.fillText(label, 8, h - 7);
  fs.writeFileSync(OUT, canvas.toBuffer('image/png'));
}

if (MODE === 'map') await renderMap(); else await renderPersp();
process.stderr.write(`wrote ${OUT} (${fs.statSync(OUT).size} bytes)\n`);
