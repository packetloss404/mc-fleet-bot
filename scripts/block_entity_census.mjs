#!/usr/bin/env node

/**
 * Read block entities from an offline Anvil snapshot inside an exact 3D box.
 *
 * Usage:
 *   node scripts/block_entity_census.mjs \
 *     --regions data/worldsnap/region \
 *     --box x1 y1 z1 x2 y2 z2
 *
 * This script never connects to Minecraft and never writes the snapshot.
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import nbt from 'prismarine-nbt';

const args = process.argv.slice(2);
const value = (key, count = 1) => {
  const index = args.indexOf(key);
  if (index < 0) return null;
  return count === 1
    ? args[index + 1]
    : args.slice(index + 1, index + 1 + count);
};

const regions = value('--regions') || 'data/worldsnap/region';
const coordinates = (value('--box', 6) || []).map(Number);
if (coordinates.length !== 6 || coordinates.some((entry) => !Number.isFinite(entry))) {
  console.error('usage: --regions <dir> --box x1 y1 z1 x2 y2 z2');
  process.exit(2);
}

const [x1, y1, z1, x2, y2, z2] = [
  Math.min(coordinates[0], coordinates[3]),
  Math.min(coordinates[1], coordinates[4]),
  Math.min(coordinates[2], coordinates[5]),
  Math.max(coordinates[0], coordinates[3]),
  Math.max(coordinates[1], coordinates[4]),
  Math.max(coordinates[2], coordinates[5]),
];

function decompress(type, bytes) {
  if (type === 1) return zlib.gunzipSync(bytes);
  if (type === 2) return zlib.inflateSync(bytes);
  if (type === 3) return bytes;
  if (type === 4) return zlib.brotliDecompressSync(bytes);
  throw new Error(`unsupported region compression type ${type}`);
}

function readChunk(cx, cz) {
  const filename = path.join(regions, `r.${cx >> 5}.${cz >> 5}.mca`);
  if (!fs.existsSync(filename)) return null;
  const region = fs.readFileSync(filename);
  const headerOffset = ((cx & 31) + (cz & 31) * 32) * 4;
  const chunkOffset = region.readUIntBE(headerOffset, 3) * 4096;
  if (!chunkOffset) return null;
  const chunkLength = region.readUInt32BE(chunkOffset);
  return decompress(
    region.readUInt8(chunkOffset + 4),
    region.subarray(chunkOffset + 5, chunkOffset + 4 + chunkLength),
  );
}

const entities = [];
let chunksRead = 0;
let chunksMissing = 0;
for (let cz = z1 >> 4; cz <= z2 >> 4; cz += 1) {
  for (let cx = x1 >> 4; cx <= x2 >> 4; cx += 1) {
    const bytes = readChunk(cx, cz);
    if (!bytes) {
      chunksMissing += 1;
      continue;
    }
    chunksRead += 1;
    const { parsed } = await nbt.parse(bytes);
    const chunk = nbt.simplify(parsed);
    for (const entity of chunk.block_entities || chunk.blockEntities || []) {
      const x = Number(entity.x);
      const y = Number(entity.y);
      const z = Number(entity.z);
      if (
        x < x1 || x > x2 ||
        y < y1 || y > y2 ||
        z < z1 || z > z2
      ) continue;
      entities.push(entity);
    }
  }
}

entities.sort((left, right) =>
  left.y - right.y || left.x - right.x || left.z - right.z);
console.log(JSON.stringify({
  regions,
  bounds: [x1, y1, z1, x2, y2, z2],
  chunksRead,
  chunksMissing,
  count: entities.length,
  entities,
}, null, 2));
