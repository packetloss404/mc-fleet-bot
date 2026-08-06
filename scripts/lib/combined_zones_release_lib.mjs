/**
 * Shared derivation and packaging helpers for Combined Zones physical
 * releases (T01 support library).
 *
 * The geometry functions are faithful copies of the proven implementations in
 * compile_combined_zones_g03_canonical_setout.mjs and the Anvil reader from
 * compile_combined_zones_r01_ga_j1_discovery_cue_pilot.mjs. They are copied,
 * not imported, so the byte-compare-tested originals stay untouched; every
 * derived set must be verified against the committed G03 identity hashes
 * before use, which makes silent copy drift impossible.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import nbt from 'prismarine-nbt';

export const STANDARD_CELL_PREAMBLE = 'combined-zones-coordinate-cell-set-v1';

export const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
export const cellKey = ({ x, y, z }) => `${x},${y},${z}`;
export const compareCells = (left, right) => left.x - right.x || left.y - right.y || left.z - right.z;

export function uniqueCells(cells) {
  const byKey = new Map();
  for (const cell of cells) byKey.set(cellKey(cell), { x: cell.x, y: cell.y, z: cell.z });
  return [...byKey.values()].sort(compareCells);
}

export function hashCells(cells, preamble = STANDARD_CELL_PREAMBLE) {
  const digest = crypto.createHash('sha256');
  digest.update(`${preamble}\n`);
  for (const cell of uniqueCells(cells)) digest.update(`${cell.x},${cell.y},${cell.z}\n`);
  return digest.digest('hex');
}

export function boundsOf(cells) {
  const bounds = {
    minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity, minZ: Infinity, maxZ: -Infinity,
  };
  for (const cell of cells) {
    bounds.minX = Math.min(bounds.minX, cell.x);
    bounds.maxX = Math.max(bounds.maxX, cell.x);
    bounds.minY = Math.min(bounds.minY, cell.y);
    bounds.maxY = Math.max(bounds.maxY, cell.y);
    bounds.minZ = Math.min(bounds.minZ, cell.z);
    bounds.maxZ = Math.max(bounds.maxZ, cell.z);
  }
  return bounds;
}

export function rasterLine(from, to) {
  let x = from.x;
  let z = from.z;
  const dx = Math.abs(to.x - from.x);
  const dz = Math.abs(to.z - from.z);
  const sx = from.x < to.x ? 1 : -1;
  const sz = from.z < to.z ? 1 : -1;
  let error = dx - dz;
  const points = [];
  for (;;) {
    points.push({ x, z });
    if (x === to.x && z === to.z) break;
    const doubled = 2 * error;
    if (doubled > -dz) {
      error -= dz;
      x += sx;
    }
    if (doubled < dx) {
      error += dx;
      z += sz;
    }
  }
  return points;
}

/**
 * Re-derive the accepted 299-station Grand Avenue centerline profile and
 * verify it against the accepted centerline identity before returning it.
 */
export function deriveB11Profile(acceptedGrandAvenue) {
  const plan = rasterLine(acceptedGrandAvenue.start, acceptedGrandAvenue.end);
  const profile = plan.map((point, station) => ({
    station,
    x: point.x,
    y: 68 + Math.round((4 * station) / (plan.length - 1)),
    z: point.z,
  }));
  const orderedManifest = `${profile.map(({ x, y, z }) => `${x},${y},${z}`).join('\n')}\n`;
  if (profile.length !== acceptedGrandAvenue.centerlinePointCount) {
    throw new Error('B11 profile point-count drift against accepted centerline');
  }
  if (sha256(orderedManifest) !== acceptedGrandAvenue.centerlineSha256) {
    throw new Error('B11 profile coordinate identity drift against accepted centerline');
  }
  return profile;
}

/** Expand the profile into the exact eight-wide construction cells with the
 * originating station and Z-offset retained for material mapping. */
export function deriveB11ConstructionCells(profile) {
  const cells = [];
  for (const point of profile) {
    for (let dz = -3; dz <= 4; dz += 1) {
      cells.push({
        x: point.x, y: point.y, z: point.z + dz, station: point.station, zOffset: dz,
      });
    }
  }
  return cells;
}

function decompress(type, data) {
  if (type === 1) return zlib.gunzipSync(data);
  if (type === 2) return zlib.inflateSync(data);
  if (type === 3) return data;
  if (type === 4) return zlib.brotliDecompressSync(data);
  throw new Error(`Unsupported Anvil compression type ${type}`);
}

function longToBig(input) {
  if (typeof input === 'bigint') return input;
  if (Array.isArray(input)) return (BigInt(input[0] | 0) << 32n) | BigInt(input[1] >>> 0);
  if (input && typeof input === 'object' && 'high' in input) {
    return (BigInt(input.high | 0) << 32n) | BigInt(input.low >>> 0);
  }
  return BigInt(input);
}

function packedValue(values, bits, index) {
  if (!values?.length) return 0;
  const perLong = Math.floor(64 / bits);
  const longIndex = Math.floor(index / perLong);
  if (longIndex >= values.length) return 0;
  const shift = BigInt((index % perLong) * bits);
  return Number((longToBig(values[longIndex]) >> shift) & ((1n << BigInt(bits)) - 1n));
}

export class AnvilReader {
  constructor(directory) {
    this.directory = directory;
    this.regions = new Map();
    this.chunks = new Map();
  }

  region(rx, rz) {
    const id = `${rx},${rz}`;
    if (!this.regions.has(id)) {
      const file = path.join(this.directory, `r.${rx}.${rz}.mca`);
      this.regions.set(id, fs.existsSync(file) ? fs.readFileSync(file) : null);
    }
    return this.regions.get(id);
  }

  async chunk(cx, cz) {
    const id = `${cx},${cz}`;
    if (this.chunks.has(id)) return this.chunks.get(id);
    const region = this.region(Math.floor(cx / 32), Math.floor(cz / 32));
    if (!region) return null;
    const index = ((cx & 31) + (cz & 31) * 32) * 4;
    const offsetSectors = region.readUIntBE(index, 3);
    const sectorCount = region[index + 3];
    if (!offsetSectors || !sectorCount) return null;
    const offset = offsetSectors * 4096;
    const size = region.readUInt32BE(offset);
    const compression = region.readUInt8(offset + 4);
    const compressed = region.subarray(offset + 5, offset + 4 + size);
    const { parsed } = await nbt.parse(decompress(compression, compressed));
    const result = nbt.simplify(parsed);
    this.chunks.set(id, result);
    return result;
  }

  async blockState(x, y, z) {
    const chunk = await this.chunk(Math.floor(x / 16), Math.floor(z / 16));
    const section = chunk?.sections?.find(({ Y }) => Number(Y) === Math.floor(y / 16));
    const states = section?.block_states;
    if (!states?.palette?.length) return { Name: 'minecraft:air' };
    const index = ((y & 15) << 8) | ((z & 15) << 4) | (x & 15);
    const bits = Math.max(4, Math.ceil(Math.log2(states.palette.length)));
    return states.palette[packedValue(states.data, bits, index)] ?? { Name: 'minecraft:air' };
  }
}

/** Render an Anvil block-state object as a guarded-op command state string. */
export function stateToCommandString(state) {
  if (!state || !state.Name) return 'minecraft:air';
  const properties = state.Properties && Object.keys(state.Properties).length
    ? `[${Object.keys(state.Properties).sort()
      .map((name) => `${name}=${state.Properties[name]}`).join(',')}]`
    : '';
  return `${state.Name}${properties}`;
}

/** One per-cell REPL guarded operation line. */
export function replLine(cell, fromState, toState) {
  return `REPL ${cell.x} ${cell.y} ${cell.z} ${cell.x} ${cell.y} ${cell.z} ${fromState} ${toState}`;
}
