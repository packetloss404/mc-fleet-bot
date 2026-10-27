import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { Vec3 } from 'vec3';
import { logger } from '../util/logger';

const PALETTE_SCAN_VOLUME_LIMIT = 200_000;
const LOAD_VOLUME_LIMIT = 2_000_000;
const MAX_NBT_BYTES = 64 * 1024 * 1024;

type Dimensions = { x: number; y: number; z: number };

/**
 * Read only Width/Height/Length from a Sponge schematic's NBT envelope.
 *
 * prismarine-nbt expands a TAG_Byte_Array into a JavaScript number array. A
 * highly-compressible 38 KB schematic in the production library therefore
 * became a 12.3-million-element array just to answer the list endpoint. This
 * tiny cursor skips BlockData in-place and never materialises its elements.
 */
function readSpongeDimensions(filePath: string): Dimensions {
  const compressed = fs.readFileSync(filePath);
  const data = compressed[0] === 0x1f && compressed[1] === 0x8b
    ? zlib.gunzipSync(compressed, { maxOutputLength: MAX_NBT_BYTES })
    : compressed[0] === 0x78
      ? zlib.inflateSync(compressed, { maxOutputLength: MAX_NBT_BYTES })
      : compressed;
  let offset = 0;
  const dimensions: Partial<Dimensions> = {};

  const ensure = (bytes: number) => {
    if (offset + bytes > data.length) throw new Error('truncated NBT payload');
  };
  const u8 = () => { ensure(1); return data.readUInt8(offset++); };
  const u16 = () => { ensure(2); const value = data.readUInt16BE(offset); offset += 2; return value; };
  const i32 = () => { ensure(4); const value = data.readInt32BE(offset); offset += 4; return value; };
  const string = () => {
    const length = u16();
    ensure(length);
    const value = data.toString('utf8', offset, offset + length);
    offset += length;
    return value;
  };

  const skip = (bytes: number) => {
    if (!Number.isSafeInteger(bytes) || bytes < 0) throw new Error('invalid NBT length');
    ensure(bytes);
    offset += bytes;
  };

  let skipPayload: (type: number) => void;
  const scanCompound = (captureDimensions: boolean) => {
    for (;;) {
      const type = u8();
      if (type === 0) return;
      const name = string();
      if (captureDimensions && (name === 'Width' || name === 'Height' || name === 'Length')) {
        const value = type === 2
          ? (() => { ensure(2); const n = data.readInt16BE(offset); offset += 2; return n; })()
          : type === 3 ? i32() : NaN;
        if (!Number.isInteger(value) || value <= 0) throw new Error(`invalid ${name} in schematic NBT`);
        if (name === 'Width') dimensions.x = value;
        else if (name === 'Height') dimensions.y = value;
        else dimensions.z = value;
      } else if (name === 'Schematic' && type === 10) {
        // Sponge v3 nests the useful fields under a Schematic compound.
        scanCompound(true);
      } else {
        skipPayload(type);
      }
    }
  };

  skipPayload = (type: number): void => {
    switch (type) {
      case 1: skip(1); return;
      case 2: skip(2); return;
      case 3: skip(4); return;
      case 4: skip(8); return;
      case 5: skip(4); return;
      case 6: skip(8); return;
      case 7: skip(i32()); return;
      case 8: skip(u16()); return;
      case 9: {
        const elementType = u8();
        const length = i32();
        if (length < 0) throw new Error('invalid NBT list length');
        for (let i = 0; i < length; i++) skipPayload(elementType);
        return;
      }
      case 10: scanCompound(false); return;
      case 11: skip(i32() * 4); return;
      case 12: skip(i32() * 8); return;
      default: throw new Error(`unsupported NBT tag ${type}`);
    }
  };

  if (u8() !== 10) throw new Error('schematic NBT root is not a compound');
  string(); // root name
  scanCompound(true);
  if (!dimensions.x || !dimensions.y || !dimensions.z) {
    throw new Error('schematic NBT has no dimensions');
  }
  return dimensions as Dimensions;
}

export interface SchematicInfo {
  filename: string;
  size: { x: number; y: number; z: number };
  blockCount: number;
  /** True when blockCount is a bounded metadata estimate, not a voxel scan. */
  estimated?: boolean;
  /**
   * True when the schematic could NOT be parsed and `size`/`blockCount` are
   * placeholder zeros rather than measurements.
   *
   * This flag exists because the zeros are indistinguishable from real data:
   * `{x:0,y:0,z:0}` is a truthy object, so every `if (!info.size)` guard passes
   * and callers happily treat a failed parse as a zero-sized building. That
   * propagates — a dimensionless row in the town registry makes SiteSelector's
   * avoidRects zero-area, siting goes blind, and buildings get stacked on each
   * other (the documented case: a well placed fully inside the town hall).
   * Anything that sites or records a build MUST check this before trusting size.
   */
  parseFailed?: boolean;
  /**
   * Optional per-block-type count map (block name → number of blocks of that
   * type in the schematic). Only populated for schematics small enough to
   * parse without estimation — large schematics (size-estimated or
   * volume > 200k) omit this since we don't iterate the full block list.
   */
  palette?: Record<string, number>;
}

export interface CachedSchematic {
  size: { x: number; y: number; z: number };
  /** Blocks in schematic-local coordinates (relative to start). */
  blocks: Array<{ rx: number; ry: number; rz: number; name: string; stateStr: string }>;
}

/**
 * Owns schematic file I/O: NBT parse, the local-coords block extraction, the
 * mtime-keyed parse cache, and directory listing/metadata. Extracted from
 * BuildCoordinator (review: god-object decomposition) — it touches no build-job
 * state, so it's a self-contained collaborator. The Minecraft version needed
 * for parsing is supplied via `versionProvider` so the store stays decoupled
 * from BotManager.
 */
export class SchematicStore {
  private cache = new Map<string, { mtimeMs: number; data: CachedSchematic }>();
  private infoCache = new Map<string, { mtimeMs: number; data: SchematicInfo }>();
  private summaryCache = new Map<string, { mtimeMs: number; data: SchematicInfo }>();

  constructor(
    private readonly schematicsDir: string,
    private readonly versionProvider: () => Promise<string>,
  ) {}

  /**
   * Load a schematic, returning blocks in schematic-local coords. Result is
   * cached by filename+mtime so repeated loads of the same file skip the NBT
   * parse + triple-nested iteration.
   */
  async load(filename: string): Promise<CachedSchematic> {
    const fullPath = path.join(this.schematicsDir, filename);
    const mtimeMs = fs.statSync(fullPath).mtimeMs;
    const cached = this.cache.get(filename);
    if (cached && cached.mtimeMs === mtimeMs) return cached.data;

    if (filename.toLowerCase().endsWith('.schem')) {
      const size = readSpongeDimensions(fullPath);
      const volume = size.x * size.y * size.z;
      if (volume > LOAD_VOLUME_LIMIT) {
        throw new Error(
          `Schematic volume ${volume.toLocaleString()} exceeds the safe load limit ` +
          `of ${LOAD_VOLUME_LIMIT.toLocaleString()} blocks`,
        );
      }
    }

    const { Schematic } = require('prismarine-schematic');
    const buffer = fs.readFileSync(fullPath);
    const schematic = await Schematic.read(buffer, await this.versionProvider());
    const start = schematic.start();
    const end = schematic.end();
    const sx = start.x, sy = start.y, sz = start.z;
    const size = schematic.size;

    const blocks: CachedSchematic['blocks'] = [];
    const tempPos = new Vec3(0, 0, 0);
    for (let y = start.y; y <= end.y; y++) {
      for (let z = start.z; z <= end.z; z++) {
        for (let x = start.x; x <= end.x; x++) {
          tempPos.x = x; tempPos.y = y; tempPos.z = z;
          const block = schematic.getBlock(tempPos);
          if (block && block.name !== 'air' && block.name !== 'cave_air' && block.name !== 'void_air') {
            const props = block.getProperties ? block.getProperties() : {};
            const stateStr = Object.entries(props).map(([k, v]) => `${k}=${v}`).join(',');
            blocks.push({ rx: x - sx, ry: y - sy, rz: z - sz, name: block.name, stateStr });
          }
        }
      }
    }

    const data: CachedSchematic = { size: { x: size.x, y: size.y, z: size.z }, blocks };
    this.cache.set(filename, { mtimeMs, data });
    return data;
  }

  async listSchematics(): Promise<SchematicInfo[]> {
    if (!fs.existsSync(this.schematicsDir)) return [];

    const files = fs.readdirSync(this.schematicsDir).filter(
      (f) => f.endsWith('.schem') || f.endsWith('.schematic'),
    );

    const results: SchematicInfo[] = [];
    for (const filename of files) {
      try {
        // Skip files larger than 10MB to avoid OOM on huge schematics.
        const filePath = path.join(this.schematicsDir, filename);
        const stat = fs.statSync(filePath);
        if (stat.size > 10_000_000) {
          results.push({ filename, size: { x: 0, y: 0, z: 0 }, blockCount: 0 });
          logger.info({ filename, sizeBytes: stat.size }, 'Skipping large schematic metadata load');
          continue;
        }
        const info = await this.getSchematicSummary(filename, stat);
        if (info) results.push(info);
      } catch (err: any) {
        logger.warn({ filename, err: err.message }, 'Failed to read schematic metadata');
        results.push({ filename, size: { x: 0, y: 0, z: 0 }, blockCount: 0 });
      }
    }
    return results;
  }

  /**
   * Listing metadata intentionally avoids the full prismarine parse. The
   * single-file endpoint still returns an exact palette/count for manageable
   * schematics, while a library listing remains safe and responsive even when
   * one file has a multi-million-cell declared volume.
   */
  private async getSchematicSummary(filename: string, stat: fs.Stats): Promise<SchematicInfo | null> {
    const cached = this.summaryCache.get(filename);
    if (cached && cached.mtimeMs === stat.mtimeMs) return cached.data;

    if (filename.toLowerCase().endsWith('.schem')) {
      try {
        const size = readSpongeDimensions(path.join(this.schematicsDir, filename));
        const volume = size.x * size.y * size.z;
        const info: SchematicInfo = {
          filename,
          size,
          blockCount: Math.round(volume * 0.15),
          estimated: true,
        };
        this.summaryCache.set(filename, { mtimeMs: stat.mtimeMs, data: info });
        return info;
      } catch (err: any) {
        logger.warn({ filename, err: err.message }, 'Failed to inspect schematic summary');
        const info: SchematicInfo = {
          filename,
          size: { x: 0, y: 0, z: 0 },
          blockCount: 0,
          parseFailed: true,
        };
        this.summaryCache.set(filename, { mtimeMs: stat.mtimeMs, data: info });
        return info;
      }
    }

    // Legacy MCEdit .schematic files do not use Sponge's dimensions envelope.
    return this.getSchematicInfo(filename);
  }

  /** Safe metadata loader — gets dimensions without holding the full schematic in memory. */
  async getSchematicInfo(filename: string): Promise<SchematicInfo | null> {
    const fullPath = path.join(this.schematicsDir, filename);
    if (!fs.existsSync(fullPath)) return null;

    const stat = fs.statSync(fullPath);
    const cachedInfo = this.infoCache.get(filename);
    if (cachedInfo && cachedInfo.mtimeMs === stat.mtimeMs) return cachedInfo.data;

    // Read dimensions without expanding BlockData. Compressed byte size is not
    // a safe proxy: the production 354x138x252 schematic is only 38 KB.
    if (filename.toLowerCase().endsWith('.schem')) {
      try {
        const size = readSpongeDimensions(fullPath);
        const volume = size.x * size.y * size.z;
        if (volume > PALETTE_SCAN_VOLUME_LIMIT) {
          const info = { filename, size, blockCount: Math.round(volume * 0.15), estimated: true };
          this.infoCache.set(filename, { mtimeMs: stat.mtimeMs, data: info });
          return info;
        }
      } catch (err: any) {
        logger.warn({ filename, err: err.message }, 'Failed to inspect schematic NBT safely');
        const info = {
          filename,
          size: { x: 0, y: 0, z: 0 },
          blockCount: 0,
          parseFailed: true,
        };
        this.infoCache.set(filename, { mtimeMs: stat.mtimeMs, data: info });
        return info;
      }
    }

    try {
      const cached = await this.load(filename);
      const size = cached.size;
      const volume = size.x * size.y * size.z;
      if (volume > 200_000) {
        const info = { filename, size, blockCount: Math.round(volume * 0.15), estimated: true };
        this.infoCache.set(filename, { mtimeMs: stat.mtimeMs, data: info });
        return info;
      }
      const palette: Record<string, number> = {};
      for (const b of cached.blocks) {
        palette[b.name] = (palette[b.name] ?? 0) + 1;
      }
      const info = { filename, size, blockCount: cached.blocks.length, palette };
      this.infoCache.set(filename, { mtimeMs: stat.mtimeMs, data: info });
      return info;
    } catch (err: any) {
      logger.warn({ filename, err: err.message }, 'Failed to parse schematic');
      // Zeros are a placeholder, not a measurement — flag it so callers that site
      // or record builds can refuse rather than trusting a fabricated size.
      const info = { filename, size: { x: 0, y: 0, z: 0 }, blockCount: 0, parseFailed: true };
      this.infoCache.set(filename, { mtimeMs: stat.mtimeMs, data: info });
      return info;
    }
  }
}
