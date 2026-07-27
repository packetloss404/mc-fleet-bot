#!/usr/bin/env node
/**
 * Final Moot Hall basement map generator.
 *
 * Offline by construction: reads local Anvil region files and JSON design
 * artifacts only. It has no RCON, Minecraft, HTTP, database, or service client.
 *
 * Validate the source package without rendering:
 *   node scripts/generate_moot_hall_basement_maps.mjs --validate-only
 *
 * Render after the final no-ladder linked stair and final snapshot exist:
 *   node scripts/generate_moot_hall_basement_maps.mjs \
 *     --snapshot data/<final-snapshot>/region
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';
import nbt from 'prismarine-nbt';
import { createCanvas, loadImage } from 'canvas';

const ROOT = process.cwd();
const DEFAULT_EXPORT = path.join(
  ROOT,
  'data/exports/box/moot-hall-basement-enhancement-2026-07-26',
);
const DEFAULT_CONFIG = path.join(DEFAULT_EXPORT, 'basement-map-config.json');
const argv = process.argv.slice(2);
const has = (key) => argv.includes(key);
const value = (key, fallback = null) => {
  const index = argv.indexOf(key);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

if (has('--help') || has('-h')) {
  console.log(`Usage:
  node scripts/generate_moot_hall_basement_maps.mjs --validate-only
  node scripts/generate_moot_hall_basement_maps.mjs --snapshot <region-dir>
      [--config <json>] [--linked-core <json>] [--out <dir>] [--force]

Final rendering requires a linked-core stair artifact with a passing mapOverlay.
--validate-only writes nothing and does not read a snapshot.`);
  process.exit(0);
}

const VALIDATE_ONLY = has('--validate-only');
const FORCE = has('--force');
const CONFIG_PATH = path.resolve(ROOT, value('--config', DEFAULT_CONFIG));
if (!fs.existsSync(CONFIG_PATH)) throw new Error(`map config not found: ${CONFIG_PATH}`);
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const resolveRoot = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const readJson = (filename) => JSON.parse(fs.readFileSync(filename, 'utf8'));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateConfig() {
  assert(config.schemaVersion === 1, 'basement-map-config schemaVersion must be 1');
  assert(Array.isArray(config.renderBounds?.blockVolume) &&
    config.renderBounds.blockVolume.length === 6, 'blockVolume must contain six coordinates');
  assert(Array.isArray(config.renderBounds?.planXZ) &&
    config.renderBounds.planXZ.length === 4, 'planXZ must contain four coordinates');
  const [minX, maxX, minZ, maxZ] = config.renderBounds.planXZ;
  assert(maxZ === -332,
    'final plan must include the linked deep-to-B2 switchback through z=-332');
  assert(config.renderBounds.authoredShellSouthZ === -341,
    'authored south shell boundary must remain recorded at z=-341');
  assert(config.renderBounds.linkedDeepStairSouthZ === -332,
    'linked deep-stair boundary must remain recorded at z=-332');
  for (const levelId of ['b1', 'b2']) {
    const level = config.levels?.[levelId];
    assert(level, `missing ${levelId} level config`);
    assert(Array.isArray(level.searchY) && level.searchY.length === 2,
      `${levelId}.searchY must contain [min,max]`);
    for (const room of level.rooms || []) {
      assert(Array.isArray(room.box) && room.box.length === 4,
        `${levelId} room ${room.id} must have x1,x2,z1,z2`);
      const [x1, x2, z1, z2] = room.box;
      assert(x1 >= minX && x2 <= maxX && z1 >= minZ && z2 <= maxZ,
        `${levelId} room ${room.id} falls outside final plan bounds`);
    }
  }
  assert((config.levels.b1.rooms || []).some((room) => room.id === 'B1-IMAX'),
    'B1 sheet must include the full-height IMAX');
  assert((config.levels.b1.rooms || []).filter((room) =>
    room.id.startsWith('B1-MEDIUM-')).length === 2,
  'B1 sheet must include both medium cinemas');
  assert((config.levels.b2.rooms || []).some((room) => room.id === 'B2-LOUNGE'),
    'B2 sheet must include the south cinema foyer/concessions lounge');
  const sheetIds = new Set((config.sheets || []).map((sheet) => sheet.id));
  for (const id of ['b1', 'b2', 'vertical', 'combined']) {
    assert(sheetIds.has(id), `missing ${id} sheet output`);
  }
}

validateConfig();

function loadArtifacts() {
  const loaded = {};
  const evidence = [];
  for (const [id, spec] of Object.entries(config.artifacts || {})) {
    let configured = spec.path;
    if (id === 'linkedCoreStair' && value('--linked-core')) {
      configured = value('--linked-core');
    }
    const absolute = resolveRoot(configured);
    if (!fs.existsSync(absolute)) {
      if (spec.required) throw new Error(`required artifact missing: ${configured}`);
      loaded[id] = null;
      evidence.push({ id, path: configured, status: 'MISSING' });
      continue;
    }
    const bytes = fs.readFileSync(absolute);
    loaded[id] = JSON.parse(bytes.toString('utf8'));
    evidence.push({
      id,
      path: path.relative(ROOT, absolute),
      status: 'PRESENT',
      bytes: bytes.length,
      sha256: sha256(bytes),
    });
  }
  return { loaded, evidence };
}

const { loaded: artifacts, evidence: artifactEvidence } = loadArtifacts();

function validateLinkedCore(artifact, finalRender) {
  if (!artifact) {
    if (finalRender) throw new Error(
      'final render blocked: linked-core-stair-design.json does not exist yet',
    );
    return { ready: false, status: 'DEFERRED_MISSING_LINKED_CORE' };
  }
  const status = String(artifact.status || '').toLowerCase();
  const overlay = artifact[config.artifacts.linkedCoreStair.mapOverlayProperty || 'mapOverlay'];
  if (!overlay) {
    if (finalRender) throw new Error('linked-core stair artifact lacks mapOverlay');
    return { ready: false, status: 'DEFERRED_MISSING_MAP_OVERLAY' };
  }
  if (status.includes('template')) {
    if (finalRender) throw new Error('linked-core map artifact is still a template');
    return { ready: false, status: 'DEFERRED_TEMPLATE_OVERLAY' };
  }
  assert(overlay.usesLadders === false,
    'linked-core public stair overlay must explicitly declare usesLadders=false');
  assert(overlay.publicRoute === true,
    'linked-core overlay must explicitly declare publicRoute=true');
  for (const level of ['b1', 'b2']) {
    assert(Array.isArray(overlay.planRoutes?.[level]) && overlay.planRoutes[level].length >= 2,
      `linked-core mapOverlay.planRoutes.${level} requires at least two points`);
  }
  assert(Array.isArray(overlay.verticalRoute) && overlay.verticalRoute.length >= 3,
    'linked-core mapOverlay.verticalRoute requires public level points');
  const verticalLevels = new Set(overlay.verticalRoute.map((entry) => entry.level));
  for (const requiredLevel of config.artifacts.linkedCoreStair.requiredVerticalLevels || []) {
    assert(verticalLevels.has(requiredLevel),
      `linked-core mapOverlay.verticalRoute lacks required ${requiredLevel} level`);
  }
  const qa = overlay.bidirectionalQa || {};
  const qaPass = qa.passed === true || /\bpass(ed)?\b/i.test(String(qa.status || ''));
  if (finalRender) assert(qa.required === true && qaPass,
    'final render requires passing linked-core bidirectional QA');
  return {
    ready: qaPass,
    status: qaPass ? 'READY' : 'DEFERRED_QA_PENDING',
    overlay,
  };
}

const linkedState = validateLinkedCore(artifacts.linkedCoreStair, !VALIDATE_ONLY);

function groundB1Route() {
  const design = artifacts.groundB1Stair?.design;
  assert(design?.groundLanding && design?.b1Landing &&
    Array.isArray(design.treadsTopToBottom), 'ground-B1 stair design is incomplete');
  return {
    id: 'ground-b1-public-stair',
    label: config.vertical.groundB1Label,
    color: '#67d391',
    levels: ['b1', 'vertical'],
    points: [
      design.groundLanding,
      ...design.treadsTopToBottom.map((tread) => tread.support),
      design.b1Landing,
    ],
  };
}

const derivedRoutes = [groundB1Route(), ...(config.staticRoutes || [])];

function validateSouthEvidence() {
  const audit = artifacts.southAudit;
  assert(audit?.areas?.some((area) => area.id === 'imax'),
    'south-extension audit lacks IMAX evidence');
  assert(audit.areas.filter((area) => area.id.startsWith('b1-medium-')).length === 2,
    'south-extension audit lacks both medium cinema houses');
  assert(audit.areas.some((area) => area.id === 'b2-east-lounge'),
    'south-extension audit lacks B2 cinema lounge evidence');
  const qa = artifacts.southQa;
  assert(String(qa?.status || '').includes('pass'),
    'south multiplex final QA is not passing');
  assert(qa.staticChecks?.some((check) =>
    check.id === 'no-ladders-in-design' && check.passed === true),
  'south multiplex no-ladder QA evidence is missing');
}

validateSouthEvidence();

const expectedOutputs = (config.sheets || []).flatMap((sheet) => [sheet.png, sheet.pdf]);
if (VALIDATE_ONLY) {
  console.log(JSON.stringify({
    config: path.relative(ROOT, CONFIG_PATH),
    status: linkedState.status,
    readyToRender: linkedState.ready,
    renderingPerformed: false,
    snapshotRead: false,
    finalPlanBounds: config.renderBounds.planXZ,
    authoredSouthMultiplexIncludedThroughZ: config.renderBounds.authoredShellSouthZ,
    linkedDeepStairIncludedThroughZ: config.renderBounds.linkedDeepStairSouthZ,
    artifacts: artifactEvidence,
    expectedOutputs,
  }, null, 2));
  process.exit(0);
}

function normalizeRegionDir(candidate) {
  assert(candidate, 'final rendering requires --snapshot <region-directory>');
  const absolute = path.resolve(ROOT, candidate);
  if (fs.existsSync(path.join(absolute, 'region'))) return path.join(absolute, 'region');
  return absolute;
}

const REGION_DIR = normalizeRegionDir(value('--snapshot'));
assert(fs.existsSync(REGION_DIR), `snapshot region directory not found: ${REGION_DIR}`);
const regionNames = fs.readdirSync(REGION_DIR).filter((name) => name.endsWith('.mca')).sort();
assert(regionNames.length > 0, `snapshot has no .mca files: ${REGION_DIR}`);

function snapshotDigest() {
  const hash = crypto.createHash('sha256');
  const entries = [];
  for (const name of regionNames) {
    const filename = path.join(REGION_DIR, name);
    const bytes = fs.readFileSync(filename);
    hash.update(Buffer.from(name, 'utf8'));
    hash.update(Buffer.from([0]));
    hash.update(bytes);
    hash.update(Buffer.from([0]));
    entries.push({
      name,
      bytes: bytes.length,
      sha256: sha256(bytes),
    });
  }
  return {
    sha256: hash.digest('hex'),
    algorithm: 'sha256(filename + NUL + bytes + NUL, sorted region filenames)',
    entries,
  };
}

const snapshotAtStart = snapshotDigest();
const regionCache = new Map();
const names = ['minecraft:air'];
const nameIds = new Map([['minecraft:air', 0]]);
const idOf = (name) => {
  if (!nameIds.has(name)) {
    nameIds.set(name, names.length);
    names.push(name);
  }
  return nameIds.get(name);
};
const longToBig = (value) => (
  Array.isArray(value)
    ? (BigInt(value[0] | 0) << 32n) | BigInt(value[1] >>> 0)
    : BigInt(value)
);

function decompress(type, bytes) {
  if (type === 1) return zlib.gunzipSync(bytes);
  if (type === 2) return zlib.inflateSync(bytes);
  if (type === 3) return bytes;
  if (type === 4) return zlib.brotliDecompressSync(bytes);
  throw new Error(`unsupported Anvil compression ${type}`);
}

function regionBuffer(rx, rz) {
  const key = `${rx},${rz}`;
  if (!regionCache.has(key)) {
    const filename = path.join(REGION_DIR, `r.${rx}.${rz}.mca`);
    regionCache.set(key, fs.existsSync(filename) ? fs.readFileSync(filename) : null);
  }
  return regionCache.get(key);
}

async function readChunk(cx, cz) {
  const region = regionBuffer(cx >> 5, cz >> 5);
  if (!region) return null;
  const index = ((cx & 31) + (cz & 31) * 32) * 4;
  const offset = region.readUIntBE(index, 3) * 4096;
  if (!offset) return null;
  const size = region.readUInt32BE(offset);
  const raw = decompress(
    region.readUInt8(offset + 4),
    region.subarray(offset + 5, offset + 4 + size),
  );
  const { parsed } = await nbt.parse(raw);
  return nbt.simplify(parsed);
}

class Volume {
  constructor(bounds) {
    const [minX, minY, minZ, maxX, maxY, maxZ] = bounds;
    Object.assign(this, { minX, minY, minZ, maxX, maxY, maxZ });
    this.sizeX = maxX - minX + 1;
    this.sizeY = maxY - minY + 1;
    this.sizeZ = maxZ - minZ + 1;
    this.data = new Uint16Array(this.sizeX * this.sizeY * this.sizeZ);
    this.chunksRead = 0;
    this.chunksMissing = 0;
  }

  index(x, y, z) {
    return ((y - this.minY) * this.sizeZ + (z - this.minZ)) * this.sizeX +
      (x - this.minX);
  }

  set(x, y, z, id) {
    if (x < this.minX || x > this.maxX || y < this.minY || y > this.maxY ||
      z < this.minZ || z > this.maxZ) return;
    this.data[this.index(x, y, z)] = id;
  }

  name(x, y, z) {
    if (x < this.minX || x > this.maxX || y < this.minY || y > this.maxY ||
      z < this.minZ || z > this.maxZ) return 'minecraft:air';
    return names[this.data[this.index(x, y, z)]] || 'minecraft:air';
  }
}

async function loadVolume(bounds) {
  const volume = new Volume(bounds);
  const [minX, minY, minZ, maxX, maxY, maxZ] = bounds;
  for (let cz = minZ >> 4; cz <= maxZ >> 4; cz += 1) {
    for (let cx = minX >> 4; cx <= maxX >> 4; cx += 1) {
      let chunk = null;
      try {
        chunk = await readChunk(cx, cz);
      } catch {
        chunk = null;
      }
      if (!chunk?.sections) {
        volume.chunksMissing += 1;
        continue;
      }
      volume.chunksRead += 1;
      for (const section of chunk.sections) {
        const states = section.block_states;
        if (!states?.palette) continue;
        const sectionY = section.Y * 16;
        if (sectionY + 15 < minY || sectionY > maxY) continue;
        const palette = states.palette.map((entry) => idOf(entry.Name));
        if (palette.length === 1) {
          if (palette[0] === 0) continue;
          for (let y = 0; y < 16; y += 1) {
            const worldY = sectionY + y;
            if (worldY < minY || worldY > maxY) continue;
            for (let z = 0; z < 16; z += 1) {
              const worldZ = cz * 16 + z;
              if (worldZ < minZ || worldZ > maxZ) continue;
              for (let x = 0; x < 16; x += 1) {
                const worldX = cx * 16 + x;
                volume.set(worldX, worldY, worldZ, palette[0]);
              }
            }
          }
          continue;
        }
        const bits = Math.max(4, 32 - Math.clz32(palette.length - 1));
        const perLong = Math.floor(64 / bits);
        const mask = (1n << BigInt(bits)) - 1n;
        const longs = states.data || [];
        for (let i = 0; i < 4096; i += 1) {
          const li = Math.floor(i / perLong);
          if (li >= longs.length) break;
          const paletteIndex = Number(
            (longToBig(longs[li]) >> BigInt((i % perLong) * bits)) & mask,
          );
          const id = palette[paletteIndex] || 0;
          if (!id) continue;
          volume.set(
            cx * 16 + (i & 15),
            sectionY + (i >> 8),
            cz * 16 + ((i >> 4) & 15),
            id,
          );
        }
      }
    }
  }
  return volume;
}

const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const CLIMB = new Set(['minecraft:ladder', 'minecraft:vine', 'minecraft:scaffolding']);
const PASSABLE = new Set([
  'minecraft:water',
  'minecraft:bubble_column',
  'minecraft:lantern',
  'minecraft:soul_lantern',
  'minecraft:chain',
  'minecraft:iron_chain',
  'minecraft:end_rod',
  'minecraft:light',
  'minecraft:flower_pot',
  'minecraft:lever',
]);
const DEADLY = new Set([
  'minecraft:lava',
  'minecraft:fire',
  'minecraft:soul_fire',
  'minecraft:cactus',
  'minecraft:magma_block',
  'minecraft:powder_snow',
]);
const passable = (name) => AIR.has(name) || CLIMB.has(name) || PASSABLE.has(name) ||
  /(_carpet|_banner|_sign|_button|_torch|_rail|_pressure_plate|_sapling|_door|_trapdoor)$/
    .test(name);
const footing = (name) => {
  if (AIR.has(name) || DEADLY.has(name)) return false;
  if (CLIMB.has(name) || name === 'minecraft:water') return true;
  if (/(_carpet|_slab|_stairs|_fence|_wall|_pane)$/.test(name)) return true;
  return !passable(name);
};
const standable = (volume, x, y, z) => (
  passable(volume.name(x, y, z)) &&
  passable(volume.name(x, y + 1, z)) &&
  footing(volume.name(x, y - 1, z))
);

function floorAt(volume, x, z, targetY, minY, maxY) {
  for (let delta = 0; delta <= Math.max(targetY - minY, maxY - targetY); delta += 1) {
    const ys = delta === 0 ? [targetY] : [targetY - delta, targetY + delta];
    for (const y of ys) {
      if (y >= minY && y <= maxY && standable(volume, x, y, z)) {
        return { y, material: volume.name(x, y - 1, z) };
      }
    }
  }
  return null;
}

const PALETTE = [
  [/quartz|calcite|white_/, '#dbe6e8'],
  [/deepslate|blackstone|black_concrete/, '#505d68'],
  [/stone_brick|smooth_stone|andesite/, '#99a6aa'],
  [/planks|wood|log|bookshelf|barrel/, '#b78950'],
  [/red_|brick|granite/, '#b8675e'],
  [/purple|magenta/, '#9b76ba'],
  [/gold|yellow/, '#d7ae42'],
  [/water/, '#467daf'],
  [/grass|moss|leaves/, '#5b875d'],
  [/stone|diorite|tuff|gravel/, '#6d777d'],
];
function materialColor(name) {
  for (const [pattern, color] of PALETTE) if (pattern.test(name)) return color;
  return '#78858c';
}

const COLORS = {
  background: '#0e151c',
  header: '#090f14',
  panel: '#17232d',
  panelLine: '#314957',
  ink: '#edf3f5',
  muted: '#9fb0ba',
  grid: '#29404d',
  accent: '#4fd1c5',
  route: '#ffcc66',
  alert: '#ff7b72',
};
const FONT = '"DejaVu Sans", Arial, sans-serif';
const MONO = '"DejaVu Sans Mono", monospace';
function text(ctx, value, x, y, size = 18, color = COLORS.ink, weight = 400, align = 'left') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(String(value), x, y);
}
function mono(ctx, value, x, y, size = 13, color = COLORS.muted, align = 'left') {
  ctx.font = `${size}px ${MONO}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(String(value), x, y);
}
function wrap(ctx, value, x, y, maxWidth, lineHeight = 21, maxLines = 5,
  color = COLORS.muted, size = 15) {
  ctx.font = `${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  const words = String(value).split(/\s+/);
  let line = '';
  let row = 0;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      ctx.fillText(line, x, y + row * lineHeight);
      row += 1;
      if (row >= maxLines) return;
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line && row < maxLines) ctx.fillText(line, x, y + row * lineHeight);
}

function header(ctx, width, title, subtitle, sheetId) {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, width, ctx.canvas.height);
  ctx.fillStyle = COLORS.header;
  ctx.fillRect(0, 0, width, 118);
  text(ctx, title, 42, 50, 29, COLORS.ink, 700);
  text(ctx, subtitle, 42, 82, 16, COLORS.muted);
  mono(ctx, `MOOT HALL · ${sheetId}`, width - 42, 46, 14, COLORS.accent, 'right');
  mono(ctx, `snapshot ${snapshotAtStart.sha256.slice(0, 16)}…`,
    width - 42, 77, 12, COLORS.muted, 'right');
  text(ctx, 'N', width - 74, 108, 15, COLORS.ink, 700, 'center');
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width - 74, 111);
  ctx.lineTo(width - 74, 88);
  ctx.lineTo(width - 80, 98);
  ctx.moveTo(width - 74, 88);
  ctx.lineTo(width - 68, 98);
  ctx.stroke();
}

function footer(ctx, width, height, note) {
  ctx.fillStyle = COLORS.header;
  ctx.fillRect(0, height - 38, width, 38);
  mono(ctx, note, 28, height - 14, 11, COLORS.muted);
  mono(ctx, 'north = −Z · east = +X · blocks are snapshot-derived; labels are sourced overlays',
    width - 28, height - 14, 11, COLORS.muted, 'right');
}

function transform(rect, bounds) {
  const [minX, maxX, minZ, maxZ] = bounds;
  const blocksX = maxX - minX + 1;
  const blocksZ = maxZ - minZ + 1;
  const scale = Math.min((rect.w - 28) / blocksX, (rect.h - 58) / blocksZ);
  const originX = rect.x + (rect.w - blocksX * scale) / 2;
  const originZ = rect.y + 38 + (rect.h - 48 - blocksZ * scale) / 2;
  return {
    scale,
    at: (x, z) => [
      originX + (x - minX) * scale,
      originZ + (z - minZ) * scale,
    ],
  };
}

function linkedRooms(levelId) {
  return linkedState.overlay?.footprints?.[levelId] || [];
}

function routesFor(levelId) {
  const routes = derivedRoutes
    .filter((route) => route.levels.includes(levelId))
    .map((route) => ({ ...route }));
  const linkedPoints = linkedState.overlay?.planRoutes?.[levelId];
  if (linkedPoints?.length) {
    routes.push({
      id: 'linked-core-stair',
      label: linkedState.overlay.label || 'LINKED CORE STAIR',
      color: '#f4df75',
      points: linkedPoints,
      width: 5,
    });
  }
  return routes;
}

function drawPlan(ctx, volume, levelId, rect, options = {}) {
  const level = config.levels[levelId];
  const bounds = config.renderBounds.planXZ;
  const [minX, maxX, minZ, maxZ] = bounds;
  ctx.fillStyle = COLORS.panel;
  ctx.strokeStyle = COLORS.panelLine;
  ctx.lineWidth = 1;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  text(ctx, options.title || level.title, rect.x + 14, rect.y + 27,
    options.titleSize || 17, COLORS.ink, 700);
  mono(ctx, `target stand y${level.targetStandingY}; search y${level.searchY[0]}..${level.searchY[1]}`,
    rect.x + rect.w - 14, rect.y + 26, 10, COLORS.muted, 'right');
  const tx = transform(rect, bounds);
  let standableColumns = 0;
  for (let z = minZ; z <= maxZ; z += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const floor = floorAt(
        volume,
        x,
        z,
        level.targetStandingY,
        level.searchY[0],
        level.searchY[1],
      );
      if (!floor) continue;
      standableColumns += 1;
      const [px, pz] = tx.at(x, z);
      ctx.fillStyle = materialColor(floor.material);
      ctx.globalAlpha = 0.88;
      ctx.fillRect(px, pz, Math.max(1, tx.scale + 0.25), Math.max(1, tx.scale + 0.25));
    }
  }
  ctx.globalAlpha = 1;
  const rooms = [...level.rooms, ...linkedRooms(levelId)];
  for (const room of rooms) {
    const [x1, x2, z1, z2] = room.box;
    const [px1, pz1] = tx.at(x1, z1);
    const [px2, pz2] = tx.at(x2 + 1, z2 + 1);
    ctx.strokeStyle = room.color || COLORS.accent;
    ctx.lineWidth = room.id?.startsWith('B1-IMAX') || room.id?.startsWith('B2-IMAX') ? 2.5 : 1.5;
    ctx.strokeRect(px1, pz1, px2 - px1, pz2 - pz1);
    const labelSize = Math.max(8, Math.min(options.labelSize || 11, tx.scale * 0.72));
    text(ctx, room.label, (px1 + px2) / 2, (pz1 + pz2) / 2 + 3,
      labelSize, room.color || COLORS.ink, 700, 'center');
  }
  for (const route of routesFor(levelId)) {
    ctx.strokeStyle = route.color || COLORS.route;
    ctx.lineWidth = route.width || 3.5;
    ctx.setLineDash(route.dashed ? [8, 5] : []);
    ctx.beginPath();
    route.points.forEach(([x, , z], index) => {
      const [px, pz] = tx.at(x, z);
      if (index === 0) ctx.moveTo(px, pz);
      else ctx.lineTo(px, pz);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    const last = route.points.at(-1);
    const [lx, lz] = tx.at(last[0], last[2]);
    text(ctx, route.label, lx + 7, lz - 7, 9, route.color || COLORS.route, 700);
  }
  const southLine = tx.at(minX, -358)[1];
  ctx.strokeStyle = '#ff8d7f';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(tx.at(minX, -358)[0], southLine);
  ctx.lineTo(tx.at(maxX + 1, -358)[0], southLine);
  ctx.stroke();
  ctx.setLineDash([]);
  mono(ctx, 'older maps stopped here · south multiplex continues to z−341',
    tx.at(minX, -358)[0] + 4, southLine - 6, 9, '#ffaaa0');
  mono(ctx, `${standableColumns.toLocaleString()} standable columns`,
    rect.x + rect.w - 12, rect.y + rect.h - 10, 10, COLORS.muted, 'right');
  mono(ctx, 'map x[-100,-70] z[-392,-332] · authored shell ends z−341', rect.x + 12,
    rect.y + rect.h - 10, 10, COLORS.muted);
  return { standableColumns, targetStandingY: level.targetStandingY, searchY: level.searchY };
}

function drawPlanSidebar(ctx, levelId, x, y, width) {
  const level = config.levels[levelId];
  text(ctx, 'PROGRAM', x, y, 15, COLORS.ink, 700);
  let row = y + 25;
  for (const room of level.rooms) {
    ctx.fillStyle = room.color;
    ctx.fillRect(x, row - 10, 14, 11);
    text(ctx, room.label, x + 22, row, 12, COLORS.muted);
    row += 21;
  }
  row += 10;
  text(ctx, 'PUBLIC CIRCULATION', x, row, 15, COLORS.ink, 700);
  row += 25;
  for (const route of routesFor(levelId).filter((route) => route.id !== 'imax-center-aisle')) {
    ctx.strokeStyle = route.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x, row - 4);
    ctx.lineTo(x + 16, row - 4);
    ctx.stroke();
    wrap(ctx, route.label, x + 24, row, width - 24, 18, 2, COLORS.muted, 12);
    row += 38;
  }
  row += 4;
  text(ctx, 'SOUTH EXTENSION', x, row, 15, COLORS.ink, 700);
  wrap(ctx,
    'The map includes the full-height IMAX, both B1 medium houses, and the B2 cinema foyer/concessions lounge through the measured south shell at z−341.',
    x, row + 28, width, 20, 6, COLORS.muted, 13);
}

function planSheet(volume, levelId) {
  const width = 1800;
  const height = 1200;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  header(ctx, width, config.title, config.levels[levelId].title,
    config.levels[levelId].sheetId);
  const evidence = drawPlan(ctx, volume, levelId, { x: 34, y: 142, w: 1290, h: 1000 });
  drawPlanSidebar(ctx, levelId, 1360, 175, 392);
  footer(ctx, width, height,
    `final snapshot ${snapshotAtStart.sha256.slice(0, 16)}… · full south shell included`);
  return { canvas, evidence };
}

function verticalSheet() {
  const width = 1800;
  const height = 1200;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  header(ctx, width, config.title, config.vertical.title, 'VERTICAL');
  const plot = { x: 120, y: 165, w: 1540, h: 820 };
  ctx.fillStyle = COLORS.panel;
  ctx.strokeStyle = COLORS.panelLine;
  ctx.fillRect(plot.x, plot.y, plot.w, plot.h);
  ctx.strokeRect(plot.x, plot.y, plot.w, plot.h);
  const [minY, maxY] = config.vertical.yRange;
  const py = (y) => plot.y + 55 + (maxY - y) / (maxY - minY) * (plot.h - 115);
  for (let y = minY; y <= maxY; y += 1) {
    ctx.strokeStyle = y % 5 === 0 ? '#405360' : '#273944';
    ctx.lineWidth = y % 5 === 0 ? 1.3 : 0.6;
    ctx.beginPath();
    ctx.moveTo(plot.x + 65, py(y));
    ctx.lineTo(plot.x + plot.w - 30, py(y));
    ctx.stroke();
    if (y % 2 === 0) mono(ctx, `y${y}`, plot.x + 54, py(y) + 4, 10, COLORS.muted, 'right');
  }
  for (const band of config.vertical.levelBands) {
    const y = py(band.standingY);
    ctx.strokeStyle = band.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(plot.x + 65, y);
    ctx.lineTo(plot.x + plot.w - 30, y);
    ctx.stroke();
    text(ctx, `${band.label} · stand y${band.standingY}`, plot.x + 75, y - 8,
      14, band.color, 700);
  }
  const verticalRoutes = derivedRoutes.filter((route) => route.levels.includes('vertical'));
  const columns = [320, 690, 1030];
  verticalRoutes.forEach((route, routeIndex) => {
    const centerX = columns[routeIndex] || (300 + routeIndex * 330);
    const zs = route.points.map((point) => point[2]);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const px = (z) => centerX + (z - (minZ + maxZ) / 2) * 23;
    ctx.strokeStyle = route.color;
    ctx.lineWidth = 7;
    ctx.beginPath();
    route.points.forEach((point, index) => {
      const x = px(point[2]);
      const y = py(point[1] + 1);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    text(ctx, route.label, centerX, plot.y + 38, 14, route.color, 700, 'center');
  });
  const linked = linkedState.overlay;
  const linkedX = 1410;
  const linkedPoints = linked.verticalRoute.map((entry) => entry.at);
  ctx.strokeStyle = '#f4df75';
  ctx.lineWidth = 8;
  ctx.beginPath();
  linkedPoints.forEach((point, index) => {
    const x = linkedX + (point[2] - linkedPoints[0][2]) * 9;
    const y = py(point[1]);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  text(ctx, linked.label || 'LINKED CORE STAIR', linkedX, plot.y + 38,
    14, '#f4df75', 700, 'center');
  for (const entry of linked.verticalRoute) {
    const x = linkedX + (entry.at[2] - linkedPoints[0][2]) * 9;
    const y = py(entry.at[1]);
    ctx.fillStyle = '#f4df75';
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, entry.label, x + 10, y - 8, 11, '#f4df75', 700);
  }
  ctx.fillStyle = '#1d2b23';
  ctx.fillRect(120, 1010, 1540, 105);
  text(ctx, 'NO-LADDER PUBLIC NETWORK', 145, 1042, 16, '#73d2a3', 700);
  wrap(ctx, config.vertical.corePolicy, 145, 1072, 1490, 21, 3, COLORS.ink, 14);
  footer(ctx, width, height,
    'public routes: ground→B1 + grand stair + south stair + linked core stair');
  return {
    canvas,
    evidence: {
      groundB1Route: groundB1Route().points,
      b1B2Routes: verticalRoutes.filter((route) => route.id !== 'ground-b1-public-stair')
        .map((route) => ({ id: route.id, points: route.points })),
      linkedCore: linked,
      legacyLadderPublic: false,
    },
  };
}

function combinedSheet(volume) {
  const width = 2200;
  const height = 1500;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  header(ctx, width, `${config.title} — combined plan`,
    'B1 and B2 on identical x/z bounds, including the complete south multiplex and no-ladder stair overlay.',
    'COMBINED');
  const b1 = drawPlan(ctx, volume, 'b1', { x: 30, y: 140, w: 1045, h: 1270 }, {
    title: 'B1',
    titleSize: 20,
    labelSize: 10,
  });
  const b2 = drawPlan(ctx, volume, 'b2', { x: 1125, y: 140, w: 1045, h: 1270 }, {
    title: 'B2',
    titleSize: 20,
    labelSize: 10,
  });
  ctx.fillStyle = COLORS.header;
  ctx.fillRect(0, 1418, width, 44);
  text(ctx, 'PUBLIC: stair-only · old west-core and bell ladders removed/capped',
    width / 2, 1447, 15, '#73d2a3', 700, 'center');
  footer(ctx, width, height,
    'same bounds on both panels: x[-100,-70] z[-392,-332] · authored shell ends z−341');
  return { canvas, evidence: { b1, b2 } };
}

const volume = await loadVolume(config.renderBounds.blockVolume);
assert(volume.chunksMissing === 0,
  `final snapshot is incomplete in render bounds: ${volume.chunksMissing} chunks missing`);

const outputDirectory = path.resolve(
  ROOT,
  value('--out', config.outputDirectory),
);
const outputById = Object.fromEntries(config.sheets.map((sheet) => [sheet.id, sheet]));
for (const filename of expectedOutputs) {
  const target = path.join(outputDirectory, filename);
  if (!FORCE && fs.existsSync(target)) {
    throw new Error(`refusing to overwrite existing final map without --force: ${target}`);
  }
}
fs.mkdirSync(outputDirectory, { recursive: true });

async function saveSheet(id, rendered) {
  const spec = outputById[id];
  const pngPath = path.join(outputDirectory, spec.png);
  const pdfPath = path.join(outputDirectory, spec.pdf);
  const png = rendered.canvas.toBuffer('image/png');
  fs.writeFileSync(pngPath, png);
  const image = await loadImage(png);
  const pdfCanvas = createCanvas(rendered.canvas.width, rendered.canvas.height, 'pdf');
  pdfCanvas.getContext('2d').drawImage(
    image,
    0,
    0,
    rendered.canvas.width,
    rendered.canvas.height,
  );
  fs.writeFileSync(pdfPath, pdfCanvas.toBuffer('application/pdf', {
    title: `${config.title} — ${id}`,
    author: 'mc-fleet-bot',
    subject: `Final snapshot ${snapshotAtStart.sha256}`,
    keywords: 'Minecraft, Moot Hall, B1, B2, basement map, no-ladder circulation',
  }));
  const pixels = rendered.canvas.getContext('2d')
    .getImageData(0, 0, rendered.canvas.width, rendered.canvas.height).data;
  let visibleSamples = 0;
  const bins = new Set();
  for (let index = 0; index < pixels.length; index += 256) {
    const total = pixels[index] + pixels[index + 1] + pixels[index + 2];
    if (total > 90) visibleSamples += 1;
    bins.add(`${pixels[index] >> 4},${pixels[index + 1] >> 4},${pixels[index + 2] >> 4}`);
  }
  assert(png.length > 30000 && visibleSamples > 1000 && bins.size > 14,
    `${id} nonblank render validation failed`);
  return {
    id,
    png: spec.png,
    pdf: spec.pdf,
    pngBytes: png.length,
    pdfBytes: fs.statSync(pdfPath).size,
    pngSha256: sha256(png),
    pdfSha256: sha256(fs.readFileSync(pdfPath)),
    visibleSamples,
    sampledColorBins: bins.size,
    evidence: rendered.evidence,
  };
}

const renders = {
  b1: planSheet(volume, 'b1'),
  b2: planSheet(volume, 'b2'),
  vertical: verticalSheet(),
  combined: combinedSheet(volume),
};
const sheets = [];
for (const id of ['b1', 'b2', 'vertical', 'combined']) {
  sheets.push(await saveSheet(id, renders[id]));
}

const snapshotAtEnd = snapshotDigest();
assert(snapshotAtEnd.sha256 === snapshotAtStart.sha256,
  `snapshot changed during render: ${snapshotAtStart.sha256} -> ${snapshotAtEnd.sha256}`);

const manifest = {
  schemaVersion: 1,
  id: config.id,
  generatedAtUtc: new Date().toISOString(),
  config: {
    path: path.relative(ROOT, CONFIG_PATH),
    sha256: sha256(fs.readFileSync(CONFIG_PATH)),
  },
  source: {
    type: 'offline-anvil-snapshot',
    path: path.relative(ROOT, REGION_DIR),
    ...snapshotAtStart,
    stableDuringRender: true,
    chunksRead: volume.chunksRead,
    chunksMissing: volume.chunksMissing,
    bounds: config.renderBounds.blockVolume,
  },
  coverage: {
    finalPlanXZ: config.renderBounds.planXZ,
    includesSouthMultiplexThroughZ: -341,
    includesDeepB2SwitchbackThroughZ: -332,
    includedPrograms: [
      'B1 primary cinema',
      'B1 upper bar',
      'B1 arcade',
      'B1 bank and vault',
      'B1 IT office',
      'B2 bowling',
      'B2 lower bar',
      'B2 club',
      'B2 private suites',
      'full-height IMAX',
      'B1 north medium cinema',
      'B1 south medium cinema',
      'B2 cinema foyer and concessions lounge',
    ],
  },
  circulation: {
    publicRoutesAreStairOnly: true,
    groundB1: groundB1Route(),
    b1B2: derivedRoutes.filter((route) => route.id.startsWith('b1-b2-')),
    linkedCore: linkedState.overlay,
    legacyLadders: 'old west-core and bell ladders removed/capped; not routes',
  },
  artifacts: artifactEvidence,
  sheets,
  validation: {
    linkedCoreReady: linkedState.ready,
    southMultiplexQaPass: true,
    snapshotStable: true,
    chunksMissing: 0,
    allSheetsNonblank: sheets.length === 4,
  },
};
const manifestPath = path.join(outputDirectory, 'moot-hall-basement-map-manifest.json');
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  status: 'RENDERED',
  output: path.relative(ROOT, outputDirectory),
  snapshotSha256: snapshotAtStart.sha256,
  sheets: sheets.map(({ id, png, pdf }) => ({ id, png, pdf })),
  manifest: path.relative(ROOT, manifestPath),
}, null, 2));
