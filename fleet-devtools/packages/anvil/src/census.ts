import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

import { DevtoolsError } from '@mc-fleet/world-core';
import nbt from 'prismarine-nbt';

import { summarizeSnapshot } from './snapshot.js';
import type { BlockBounds, BlockCensus, BlockCensusProgressCallback } from './types.js';

interface PaletteEntry {
  Name?: string;
  Properties?: Record<string, string>;
}

interface BlockStates {
  palette?: PaletteEntry[];
  data?: unknown[];
}

interface ChunkSection {
  Y?: number;
  block_states?: BlockStates;
}

interface SimplifiedChunk {
  /**
   * Modern Anvil uses `Sections`; pre-1.17 used `sections` (or wrapped in
   * `Level`). The decoder normalises both spellings.
   */
  Sections?: ChunkSection[];
  sections?: ChunkSection[];
}

function asBigInt(value: unknown): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(value);
  if (Array.isArray(value) && value.length >= 2) {
    const high = Number(value[0]) | 0;
    const low = Number(value[1]) >>> 0;
    return (BigInt(high) << 32n) | BigInt(low);
  }
  if (value && typeof value === 'object' && 'high' in value && 'low' in value) {
    const pair = value as { high: number; low: number };
    return (BigInt(pair.high | 0) << 32n) | BigInt(pair.low >>> 0);
  }
  throw new Error('Unsupported packed long value');
}

function decompress(type: number, payload: Buffer): Buffer {
  switch (type) {
    case 1:
      return zlib.gunzipSync(payload);
    case 2:
      return zlib.inflateSync(payload);
    case 3:
      return payload;
    case 4:
      return zlib.brotliDecompressSync(payload);
    default:
      throw new Error(`Unsupported Anvil compression type ${type}`);
  }
}

function blockLabel(entry: PaletteEntry | undefined): string {
  const name = entry?.Name ?? 'minecraft:air';
  const properties = Object.entries(entry?.Properties ?? {})
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`);
  return properties.length > 0 ? `${name}[${properties.join(',')}]` : name;
}

function inside(bounds: BlockBounds | null, x: number, y: number, z: number): boolean {
  return (
    !bounds ||
    (x >= bounds.minX &&
      x <= bounds.maxX &&
      y >= bounds.minY &&
      y <= bounds.maxY &&
      z >= bounds.minZ &&
      z <= bounds.maxZ)
  );
}

function validateBounds(bounds: BlockBounds | null): void {
  if (!bounds) return;
  const values = Object.values(bounds);
  if (!values.every(Number.isInteger)) {
    throw new DevtoolsError('Census bounds must be integers', 'INVALID_BOUNDS');
  }
  if (bounds.minX > bounds.maxX || bounds.minY > bounds.maxY || bounds.minZ > bounds.maxZ) {
    throw new DevtoolsError('Census minimum bounds must not exceed maximums', 'INVALID_BOUNDS');
  }
}

function countSection(
  counts: Map<string, number>,
  section: ChunkSection,
  chunkX: number,
  chunkZ: number,
  bounds: BlockBounds | null,
): number {
  const blockStates = section.block_states;
  const palette = blockStates?.palette;
  const sectionY = section.Y;
  if (!palette?.length || !Number.isInteger(sectionY)) return 0;
  const labels = palette.map(blockLabel);
  const baseY = Number(sectionY) * 16;
  let counted = 0;
  const add = (label: string): void => {
    counts.set(label, (counts.get(label) ?? 0) + 1);
    counted += 1;
  };
  if (labels.length === 1) {
    const label = labels[0] ?? 'minecraft:air';
    if (!bounds) {
      counts.set(label, (counts.get(label) ?? 0) + 4096);
      return 4096;
    }
    for (let index = 0; index < 4096; index += 1) {
      const x = chunkX * 16 + (index & 15);
      const z = chunkZ * 16 + ((index >> 4) & 15);
      const y = baseY + (index >> 8);
      if (inside(bounds, x, y, z)) add(label);
    }
    return counted;
  }
  const packed = blockStates?.data;
  if (!packed?.length) throw new Error('Block-state palette has no packed data');
  const bits = Math.max(4, Math.ceil(Math.log2(labels.length)));
  const valuesPerLong = Math.floor(64 / bits);
  const mask = (1n << BigInt(bits)) - 1n;
  const longs = packed.map(asBigInt);
  for (let index = 0; index < 4096; index += 1) {
    const longIndex = Math.floor(index / valuesPerLong);
    if (longIndex >= longs.length) break;
    const value = longs[longIndex];
    if (value === undefined) break;
    const shift = BigInt((index % valuesPerLong) * bits);
    const paletteIndex = Number((value >> shift) & mask);
    const x = chunkX * 16 + (index & 15);
    const z = chunkZ * 16 + ((index >> 4) & 15);
    const y = baseY + (index >> 8);
    if (inside(bounds, x, y, z)) {
      add(labels[paletteIndex] ?? 'minecraft:air');
    }
  }
  return counted;
}

async function parseChunk(region: Buffer, slot: number): Promise<SimplifiedChunk | null> {
  const headerOffset = slot * 4;
  const sectorOffset = region.readUIntBE(headerOffset, 3);
  const sectorCount = region[headerOffset + 3] ?? 0;
  if (sectorOffset === 0 || sectorCount === 0) return null;
  const offset = sectorOffset * 4096;
  if (offset + 5 > region.length) throw new Error('Chunk offset exceeds region length');
  const length = region.readUInt32BE(offset);
  if (length < 1 || offset + 4 + length > region.length) {
    throw new Error('Chunk length exceeds region length');
  }
  const compressionByte = region[offset + 4];
  if (compressionByte === undefined) throw new Error('Chunk compression byte is missing');
  if ((compressionByte & 0x80) !== 0) {
    throw new Error('External Anvil chunk streams are not supported');
  }
  const payload = region.subarray(offset + 5, offset + 4 + length);
  const raw = decompress(compressionByte, payload);
  const parsed = await nbt.parse(raw);
  const root = nbt.simplify(parsed.parsed) as Record<string, unknown>;
  // Pre-1.17 Anvil wraps the chunk in a `Level` compound; 1.17+ stores the
  // chunk fields directly on the root. Accept both shapes.
  const inner =
    root['Level'] && typeof root['Level'] === 'object'
      ? (root['Level'] as Record<string, unknown>)
      : root;
  return inner as SimplifiedChunk;
}

export async function censusSnapshot(
  directory: string,
  bounds: BlockBounds | null = null,
  onProgress?: BlockCensusProgressCallback,
): Promise<BlockCensus> {
  validateBounds(bounds);
  const summary = summarizeSnapshot(directory);
  const counts = new Map<string, number>();
  const errors: BlockCensus['errors'] = [];
  let chunksVisited = 0;
  let chunksDecoded = 0;
  let sectionsDecoded = 0;
  let blocksCounted = 0;
  const totalRegions = summary.members.length;

  for (let regionIndex = 0; regionIndex < summary.members.length; regionIndex += 1) {
    const member = summary.members[regionIndex]!;
    const filename = path.join(summary.directory, member.filename);
    const region = fs.readFileSync(filename);
    if (region.length < 8192) {
      errors.push({
        region: member.filename,
        chunkX: member.regionX * 32,
        chunkZ: member.regionZ * 32,
        message: 'Region file is shorter than the 8 KiB Anvil header',
      });
      onProgress?.({
        regionsScanned: regionIndex + 1,
        chunksVisited,
        totalRegions,
      });
      continue;
    }
    for (let slot = 0; slot < 1024; slot += 1) {
      const headerOffset = slot * 4;
      if (region.readUInt32BE(headerOffset) === 0) continue;
      const localX = slot % 32;
      const localZ = Math.floor(slot / 32);
      const chunkX = member.regionX * 32 + localX;
      const chunkZ = member.regionZ * 32 + localZ;
      if (
        bounds &&
        (chunkX * 16 > bounds.maxX ||
          chunkX * 16 + 15 < bounds.minX ||
          chunkZ * 16 > bounds.maxZ ||
          chunkZ * 16 + 15 < bounds.minZ)
      ) {
        continue;
      }
      chunksVisited += 1;
      try {
        const chunk = await parseChunk(region, slot);
        if (!chunk) continue;
        chunksDecoded += 1;
        for (const section of chunk.Sections ?? chunk.sections ?? []) {
          const y = Number(section.Y) * 16;
          if (bounds && (y > bounds.maxY || y + 15 < bounds.minY)) {
            continue;
          }
          if (!section.block_states?.palette?.length) continue;
          blocksCounted += countSection(counts, section, chunkX, chunkZ, bounds);
          sectionsDecoded += 1;
        }
      } catch (error) {
        errors.push({
          region: member.filename,
          chunkX,
          chunkZ,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    onProgress?.({
      regionsScanned: regionIndex + 1,
      chunksVisited,
      totalRegions,
    });
  }

  return {
    snapshotSha256: summary.sha256,
    bounds,
    chunksVisited,
    chunksDecoded,
    sectionsDecoded,
    blocksCounted,
    uniqueBlockStates: counts.size,
    complete: errors.length === 0,
    errors,
    blocks: [...counts.entries()]
      .map(([block, count]) => ({ block, count }))
      .sort((left, right) => right.count - left.count || left.block.localeCompare(right.block)),
  };
}
