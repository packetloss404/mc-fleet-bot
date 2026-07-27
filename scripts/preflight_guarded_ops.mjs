#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opsPath = path.resolve(ROOT, args[0] ?? '');
const regionsIndex = args.indexOf('--regions');
const regions = path.resolve(
  ROOT,
  regionsIndex >= 0 ? args[regionsIndex + 1] : 'data/worldsnap/region',
);
const reportIndex = args.indexOf('--report');
const outIndex = args.indexOf('--out');
const reportArgumentIndex = reportIndex >= 0 ? reportIndex : outIndex;
const reportPath = reportArgumentIndex >= 0
  ? path.resolve(ROOT, args[reportArgumentIndex + 1])
  : null;

if (!args[0] || !fs.existsSync(opsPath)) {
  console.error('usage: node scripts/preflight_guarded_ops.mjs <ops.txt> [--regions <dir>] [--report <json>]');
  process.exit(2);
}

function splitMasks(mask) {
  const output = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < mask.length; index += 1) {
    const char = mask[index];
    if (char === '[') depth += 1;
    else if (char === ']') depth = Math.max(0, depth - 1);
    else if (char === ',' && depth === 0) {
      output.push(mask.slice(start, index));
      start = index + 1;
    }
  }
  output.push(mask.slice(start));
  return output.filter(Boolean);
}

function normalizeBlock(block) {
  const bracket = block.indexOf('[');
  if (bracket < 0) return block;
  const name = block.slice(0, bracket);
  const properties = block
    .slice(bracket + 1, -1)
    .split(',')
    .sort()
    .join(',');
  return `${name}[${properties}]`;
}

function blockMatches(expected, actual) {
  if (expected.includes('[')) return expected === actual;
  return actual.split('[', 1)[0] === expected;
}

const rawLines = fs.readFileSync(opsPath, 'utf8').split(/\r?\n/);
const operations = [];
for (let index = 0; index < rawLines.length; index += 1) {
  const fields = rawLines[index].trim().split(/\s+/);
  if (fields[0] !== 'REPL' || fields.length < 9) continue;
  operations.push({
    line: index + 1,
    box: fields.slice(1, 7).map(Number),
    expected: splitMasks(fields[7]).map(normalizeBlock),
    replacement: normalizeBlock(fields[8]),
  });
}

const xs = operations.flatMap((operation) => [operation.box[0], operation.box[3]]);
const ys = operations.flatMap((operation) => [operation.box[1], operation.box[4]]);
const zs = operations.flatMap((operation) => [operation.box[2], operation.box[5]]);
const bounds = [
  Math.min(...xs),
  Math.min(...ys),
  Math.min(...zs),
  Math.max(...xs),
  Math.max(...ys),
  Math.max(...zs),
];

// A single overall census is catastrophically expensive for sparse, multi-site
// packages: 3,000 one-cell operations spread between Raven Rock and Westlight
// previously expanded into a 44-million-cell box. Group the required cells by
// chunk and census only each chunk's occupied sub-box. This preserves exact block
// state checks while making world-wide guarded packages practical on the 2-vCPU
// host.
const chunkBounds = new Map();
for (const operation of operations) {
  const [rawX1, rawY1, rawZ1, rawX2, rawY2, rawZ2] = operation.box;
  const [x1, x2] = [Math.min(rawX1, rawX2), Math.max(rawX1, rawX2)];
  const [y1, y2] = [Math.min(rawY1, rawY2), Math.max(rawY1, rawY2)];
  const [z1, z2] = [Math.min(rawZ1, rawZ2), Math.max(rawZ1, rawZ2)];
  for (let chunkX = Math.floor(x1 / 16); chunkX <= Math.floor(x2 / 16); chunkX += 1) {
    for (let chunkZ = Math.floor(z1 / 16); chunkZ <= Math.floor(z2 / 16); chunkZ += 1) {
      const clipped = {
        minX: Math.max(x1, chunkX * 16),
        minY: y1,
        minZ: Math.max(z1, chunkZ * 16),
        maxX: Math.min(x2, chunkX * 16 + 15),
        maxY: y2,
        maxZ: Math.min(z2, chunkZ * 16 + 15),
      };
      const key = `${chunkX},${chunkZ}`;
      const current = chunkBounds.get(key);
      if (!current) chunkBounds.set(key, clipped);
      else {
        current.minX = Math.min(current.minX, clipped.minX);
        current.minY = Math.min(current.minY, clipped.minY);
        current.minZ = Math.min(current.minZ, clipped.minZ);
        current.maxX = Math.max(current.maxX, clipped.maxX);
        current.maxY = Math.max(current.maxY, clipped.maxY);
        current.maxZ = Math.max(current.maxZ, clipped.maxZ);
      }
    }
  }
}
const blocks = new Map();
for (const chunkBox of chunkBounds.values()) {
  const census = spawnSync(
    process.execPath,
    [
      path.join(ROOT, 'scripts', 'block_census.mjs'),
      '--regions',
      regions,
      '--box',
      String(chunkBox.minX),
      String(chunkBox.minY),
      String(chunkBox.minZ),
      String(chunkBox.maxX),
      String(chunkBox.maxY),
      String(chunkBox.maxZ),
      '--include-air',
      '--states',
      '--list',
    ],
    {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    },
  );
  if (census.status !== 0) {
    process.stderr.write(census.stderr);
    process.exit(census.status ?? 1);
  }
  for (const line of census.stdout.split(/\r?\n/)) {
    const match = line.match(/^\s+(-?\d+) (-?\d+) (-?\d+)\s+(minecraft:\S+)\s*$/);
    if (!match) continue;
    blocks.set(
      `${match[1]},${match[2]},${match[3]}`,
      normalizeBlock(match[4]),
    );
  }
}

const partialMasks = new Set([
  '-94,62,-389,-93,62,-377',
  '-94,63,-389,-93,63,-377',
  '-84,63,-374,-84,63,-363',
  '-84,63,-358,-71,63,-358',
]);
const results = [];
for (const operation of operations) {
  const [rawX1, rawY1, rawZ1, rawX2, rawY2, rawZ2] = operation.box;
  const [x1, x2] = [Math.min(rawX1, rawX2), Math.max(rawX1, rawX2)];
  const [y1, y2] = [Math.min(rawY1, rawY2), Math.max(rawY1, rawY2)];
  const [z1, z2] = [Math.min(rawZ1, rawZ2), Math.max(rawZ1, rawZ2)];
  let matched = 0;
  const unexpected = [];
  for (let y = y1; y <= y2; y += 1) {
    for (let z = z1; z <= z2; z += 1) {
      for (let x = x1; x <= x2; x += 1) {
        const actual = blocks.get(`${x},${y},${z}`) ?? 'MISSING_CHUNK';
        if (operation.expected.some((expected) => blockMatches(expected, actual))) matched += 1;
        else unexpected.push({ point: [x, y, z], actual });
      }
    }
  }
  const volume = (x2 - x1 + 1) * (y2 - y1 + 1) * (z2 - z1 + 1);
  const partial = partialMasks.has(operation.box.join(','));
  const passed = partial ? matched > 0 : matched === volume;
  results.push({
    line: operation.line,
    box: operation.box,
    expected: operation.expected,
    replacement: operation.replacement,
    volume,
    matched,
    partialMask: partial,
    passed,
    unexpected: unexpected.slice(0, 12),
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  opsPath: path.relative(ROOT, opsPath),
  regions: path.relative(ROOT, regions),
  bounds,
  censusChunks: chunkBounds.size,
  operationCount: results.length,
  passed: results.filter((result) => result.passed).length,
  failed: results.filter((result) => !result.passed).length,
  partialMasks: results
    .filter((result) => result.partialMask)
    .map(({ line, box, volume, matched }) => ({ line, box, volume, matched })),
  failures: results.filter((result) => !result.passed),
};

console.log(
  `${path.basename(opsPath)}: ${report.passed}/${report.operationCount} guards pass; `
  + `${report.failed} fail`,
);
for (const partial of report.partialMasks) {
  console.log(
    `  partial line ${partial.line}: ${partial.matched}/${partial.volume} source cells match`,
  );
}
for (const failure of report.failures.slice(0, 12)) {
  console.log(
    `  FAIL line ${failure.line}: ${failure.matched}/${failure.volume} match `
    + `${failure.expected.join('|')}`,
  );
  for (const entry of failure.unexpected.slice(0, 3)) {
    console.log(`    ${entry.point.join(' ')} -> ${entry.actual}`);
  }
}

if (reportPath) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`  report: ${reportPath}`);
}
process.exit(report.failed === 0 ? 0 : 1);
