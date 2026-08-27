#!/usr/bin/env node
/**
 * Fail-closed block-entity clearance for exact guarded operations.
 *
 * The live entity gate covers players and movable entities. This companion
 * audit reads the immutable source snapshot and rejects any REPL target that
 * contains a block entity (containers, signs, hives, command blocks, etc.).
 * Guarded CMD lines are intentionally excluded: their exact-state-guarded NBT
 * merge is the authored operation, while REPL would replace the whole block.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

import nbt from 'prismarine-nbt';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function normalizedBox(values) {
  return [
    Math.min(values[0], values[3]),
    Math.min(values[1], values[4]),
    Math.min(values[2], values[5]),
    Math.max(values[0], values[3]),
    Math.max(values[1], values[4]),
    Math.max(values[2], values[5]),
  ];
}

function chunkKey(chunkX, chunkZ) {
  return `${chunkX},${chunkZ}`;
}

export function parseOperationsText(text, filename = '<memory>') {
  const boxes = [];
  for (const [index, raw] of text.split(/\r?\n/).entries()) {
    const fields = raw.trim().split(/\s+/);
    if (!fields[0] || fields[0].startsWith('#') || fields[0] === 'CMD') continue;
    if (fields[0] !== 'REPL' || fields.length !== 9) {
      throw new Error(`${filename}:${index + 1}: unsupported or malformed operation`);
    }
    const coordinates = fields.slice(1, 7).map(Number);
    if (coordinates.some((coordinate) => !Number.isSafeInteger(coordinate))) {
      throw new Error(`${filename}:${index + 1}: invalid REPL coordinate`);
    }
    boxes.push({
      file: filename,
      line: index + 1,
      box: normalizedBox(coordinates),
    });
  }
  if (boxes.length === 0) throw new Error(`${filename}: no REPL operations`);
  return boxes;
}

export function buildTargetChunkIndex(operationInputs) {
  const index = new Map();
  const regionFiles = new Set();
  let operationCount = 0;
  for (const input of operationInputs) {
    const boxes = parseOperationsText(input.text, input.file);
    operationCount += boxes.length;
    for (const operation of boxes) {
      const [x1, , z1, x2, , z2] = operation.box;
      for (let chunkX = Math.floor(x1 / 16); chunkX <= Math.floor(x2 / 16); chunkX += 1) {
        for (let chunkZ = Math.floor(z1 / 16); chunkZ <= Math.floor(z2 / 16); chunkZ += 1) {
          const key = chunkKey(chunkX, chunkZ);
          if (!index.has(key)) index.set(key, []);
          index.get(key).push(operation);
          regionFiles.add(`r.${Math.floor(chunkX / 32)}.${Math.floor(chunkZ / 32)}.mca`);
        }
      }
    }
  }
  return { index, operationCount, regionFiles: [...regionFiles].sort() };
}

export function matchingTargets(point, operations) {
  const [x, y, z] = point;
  return operations.filter(({ box }) => (
    box[0] <= x && x <= box[3]
    && box[1] <= y && y <= box[4]
    && box[2] <= z && z <= box[5]
  ));
}

function decompress(type, bytes) {
  if (type === 1) return zlib.gunzipSync(bytes);
  if (type === 2) return zlib.inflateSync(bytes);
  if (type === 3) return bytes;
  if (type === 4) return zlib.brotliDecompressSync(bytes);
  throw new Error(`unsupported Anvil compression type ${type}`);
}

function readChunk(regions, chunkX, chunkZ) {
  const filename = path.join(
    regions,
    `r.${Math.floor(chunkX / 32)}.${Math.floor(chunkZ / 32)}.mca`,
  );
  if (!fs.existsSync(filename)) return { status: 'missing-region', filename };
  const region = fs.readFileSync(filename);
  const headerOffset = ((chunkX & 31) + (chunkZ & 31) * 32) * 4;
  const sector = region.readUIntBE(headerOffset, 3);
  if (!sector) return { status: 'missing-chunk', filename };
  const offset = sector * 4096;
  const length = region.readUInt32BE(offset);
  const compression = region.readUInt8(offset + 4);
  return {
    status: 'present',
    filename,
    bytes: decompress(
      compression,
      region.subarray(offset + 5, offset + 4 + length),
    ),
  };
}

export async function auditBlockEntities({ regions, operationInputs }) {
  const target = buildTargetChunkIndex(operationInputs);
  const overlaps = [];
  const readErrors = [];
  const missingRegions = new Set();
  let chunksPresent = 0;
  let chunksMissing = 0;
  let blockEntitiesExamined = 0;

  for (const [key, operations] of target.index.entries()) {
    const [chunkX, chunkZ] = key.split(',').map(Number);
    let chunk;
    try {
      chunk = readChunk(regions, chunkX, chunkZ);
      if (chunk.status === 'missing-region') missingRegions.add(path.basename(chunk.filename));
      if (chunk.status !== 'present') {
        chunksMissing += 1;
        continue;
      }
      chunksPresent += 1;
      const { parsed } = await nbt.parse(chunk.bytes);
      const simplified = nbt.simplify(parsed);
      for (const entity of simplified.block_entities ?? simplified.blockEntities ?? []) {
        blockEntitiesExamined += 1;
        const point = [Number(entity.x), Number(entity.y), Number(entity.z)];
        if (point.some((coordinate) => !Number.isFinite(coordinate))) continue;
        const matches = matchingTargets(point, operations);
        if (matches.length === 0) continue;
        overlaps.push({
          point,
          id: entity.id ?? entity.Id ?? entity.identifier ?? 'unknown',
          operations: matches.map(({ file, line, box }) => ({ file, line, box })),
        });
      }
    } catch (error) {
      readErrors.push({ chunk: [chunkX, chunkZ], error: error.message });
    }
  }

  return {
    schemaVersion: 1,
    id: 'guarded-ops-block-entity-clearance',
    generatedAtUtc: new Date().toISOString(),
    status: overlaps.length === 0 && readErrors.length === 0 && missingRegions.size === 0
      ? 'PASS'
      : 'FAIL',
    regions,
    operationFiles: operationInputs.map(({ file }) => file),
    operationCount: target.operationCount,
    targetChunkCount: target.index.size,
    requiredRegionFiles: target.regionFiles,
    chunksPresent,
    chunksMissing,
    blockEntitiesExamined,
    blockingBlockEntityCount: overlaps.length,
    overlaps,
    missingRegionFiles: [...missingRegions].sort(),
    readErrors,
  };
}

function value(args, flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : null;
}

async function main() {
  const args = process.argv.slice(2);
  const regionsValue = value(args, '--regions');
  const reportValue = value(args, '--report');
  const ops = args.flatMap((entry, index) => (
    entry === '--ops' && args[index + 1] ? [args[index + 1]] : []
  ));
  if (!regionsValue || !reportValue || ops.length === 0) {
    throw new Error('usage: --regions <dir> --ops <forward.txt> [--ops ...] --report <json>');
  }
  const regions = path.resolve(ROOT, regionsValue);
  const operationInputs = ops.map((filename) => {
    const absolute = path.resolve(ROOT, filename);
    return {
      file: path.relative(ROOT, absolute).split(path.sep).join('/'),
      text: fs.readFileSync(absolute, 'utf8'),
    };
  });
  const report = await auditBlockEntities({ regions, operationInputs });
  const output = path.resolve(ROOT, reportValue);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({
    status: report.status,
    blockingBlockEntityCount: report.blockingBlockEntityCount,
    report: path.relative(ROOT, output),
  }, null, 2)}\n`);
  if (report.status !== 'PASS') process.exitCode = 1;
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
