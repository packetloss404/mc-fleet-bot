import { Buffer } from 'node:buffer';
import zlib from 'node:zlib';

import { NbtTag, writeNamedRootCompound, type NbtValue } from './nbt-writer.js';

export interface PaletteEntry {
  Name: string;
  Properties?: Record<string, string>;
}

export interface SectionSpec {
  /** Y in section units (each section is 16 blocks tall). */
  y: number;
  palette: PaletteEntry[];
  /**
   * 4096 block indices into the palette. Defaults to all 0.
   * Must be exactly 4096 entries when provided.
   */
  blocks?: number[];
}

export interface RegionSpec {
  /** Local chunk slot in the region, 0..1023. Defaults to 0. */
  slot?: number;
  sections: SectionSpec[];
}

/**
 * Build an Anvil `.mca` file as a `Buffer` containing exactly one chunk.
 * The chunk contains a `Level.Sections[].block_states` block with the
 * given palette. The block indices are packed with the Anvil 4-bit
 * minimum bits-per-block for palettes of size > 1, or omitted entirely
 * for a single-palette section.
 */
export function buildRegion(spec: RegionSpec): Buffer {
  if (spec.sections.length === 0) {
    throw new Error('buildRegion requires at least one section');
  }
  const slot = spec.slot ?? 0;
  if (slot < 0 || slot > 1023) {
    throw new Error(`slot must be in 0..1023 (got ${slot})`);
  }
  const chunkRoot = NbtTag.compound([
    [
      'Level',
      NbtTag.compound([['Sections', NbtTag.list(0x0a, spec.sections.map(buildSectionCompound))]]),
    ],
  ]);
  const nbtBuffer = writeNamedRootCompound('', chunkRoot);
  const compressed = zlib.deflateSync(nbtBuffer);
  const payloadLength = 1 + compressed.length;
  const sectorCount = Math.max(1, Math.ceil(payloadLength / 4096));
  const sectorOffset = 2; // header occupies the first two sectors (8 KiB).
  const region = Buffer.alloc(8192 + sectorCount * 4096);
  // Location entry: 3-byte big-endian sector offset + 1-byte count.
  region.writeUInt8((sectorOffset >> 16) & 0xff, slot * 4 + 0);
  region.writeUInt8((sectorOffset >> 8) & 0xff, slot * 4 + 1);
  region.writeUInt8(sectorOffset & 0xff, slot * 4 + 2);
  region.writeUInt8(sectorCount & 0xff, slot * 4 + 3);
  // Chunk header at sectorOffset * 4096.
  const chunkOffset = sectorOffset * 4096;
  region.writeUInt32BE(payloadLength, chunkOffset);
  region.writeUInt8(2, chunkOffset + 4); // 2 = zlib
  compressed.copy(region, chunkOffset + 5);
  return region;
}

function buildSectionCompound(section: SectionSpec): NbtValue {
  if (section.palette.length === 0) {
    throw new Error('section palette must not be empty');
  }
  if (section.palette.length === 1) {
    return NbtTag.compound([
      ['Y', NbtTag.byte(section.y)],
      [
        'block_states',
        NbtTag.compound([['palette', NbtTag.list(0x0a, [paletteToCompound(section.palette[0]!)])]]),
      ],
    ]);
  }
  const blocks = section.blocks ?? new Array<number>(4096).fill(0);
  if (blocks.length !== 4096) {
    throw new Error(`section blocks must contain exactly 4096 entries (got ${blocks.length})`);
  }
  const bits = Math.max(4, Math.ceil(Math.log2(section.palette.length)));
  const valuesPerLong = Math.floor(64 / bits);
  const longCount = Math.ceil(4096 / valuesPerLong);
  const longs = new Array<bigint>(longCount).fill(0n);
  const mask = (1n << BigInt(bits)) - 1n;
  for (let blockIndex = 0; blockIndex < 4096; blockIndex += 1) {
    const longIndex = Math.floor(blockIndex / valuesPerLong);
    const shift = BigInt((blockIndex % valuesPerLong) * bits);
    const next =
      (longs[longIndex]! & ~(mask << shift)) | ((BigInt(blocks[blockIndex]!) & mask) << shift);
    longs[longIndex] = next;
  }
  return NbtTag.compound([
    ['Y', NbtTag.byte(section.y)],
    [
      'block_states',
      NbtTag.compound([
        ['palette', NbtTag.list(0x0a, section.palette.map(paletteToCompound))],
        ['data', NbtTag.longArray(longs)],
      ]),
    ],
  ]);
}

function paletteToCompound(entry: PaletteEntry): NbtValue {
  const fields: Array<[string, NbtValue]> = [['Name', NbtTag.string(entry.Name)]];
  if (entry.Properties && Object.keys(entry.Properties).length > 0) {
    const props: Array<[string, NbtValue]> = [];
    for (const [key, value] of Object.entries(entry.Properties)) {
      props.push([key, NbtTag.string(value)]);
    }
    fields.push(['Properties', NbtTag.compound(props)]);
  }
  return NbtTag.compound(fields);
}
