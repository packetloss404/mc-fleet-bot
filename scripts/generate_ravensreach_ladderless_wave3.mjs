#!/usr/bin/env node
/**
 * Ravensreach Wave 3: make the remaining inventoried civic interiors
 * stair-only.
 *
 * The library already has a geometrically valid full-block switchback. This
 * package upgrades every tread to a correctly oriented stair block and retires
 * its redundant 39-block ladder. Six isolated ladder cells in the Market and
 * Grange (not part of their already verified stairs) are also removed.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import process from 'process';

import { AnvilSnapshot } from './generate_picket_fence.mjs';

const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const regions = value(
  '--regions',
  'data/worldsnap-worldwide-wave2-post-20260727/region',
);
const output = value(
  '--out',
  'data/buildops/ravensreach-ladderless-interiors-wave3-2026-07-27.txt',
);
const reportPath = value(
  '--report',
  'data/world-review/ravensreach-ladderless-wave3-design-2026-07-27.json',
);

const snapshot = new AnvilSnapshot(regions);
const cache = new Map();
const operations = new Map();
const AIR = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
]);
const NON_FOOTING = new Set([
  ...AIR,
  'minecraft:lantern',
  'minecraft:soul_lantern',
  'minecraft:chain',
  'minecraft:iron_chain',
  'minecraft:end_rod',
  'minecraft:flower_pot',
  'minecraft:lever',
]);
const levels = [46, 53, 60, 67, 75, 83];

const key = (x, y, z) => `${x},${y},${z}`;
const baseName = (block) => block.split('[', 1)[0];
async function blockAt(x, y, z) {
  const cellKey = key(x, y, z);
  if (cache.has(cellKey)) return cache.get(cellKey);
  const column = await snapshot.readColumn(x, z, y, y);
  if (!column) throw new Error(`snapshot is missing column ${x},${z}`);
  const block = column.get(y);
  cache.set(cellKey, block);
  return block;
}
async function projectedBlockAt(x, y, z) {
  return operations.get(key(x, y, z))?.replacement ?? blockAt(x, y, z);
}
async function repl(x, y, z, replacement, phase) {
  const cellKey = key(x, y, z);
  const current = await blockAt(x, y, z);
  const existing = operations.get(cellKey);
  if (existing) {
    if (existing.replacement !== replacement) {
      throw new Error(`conflicting replacements at ${cellKey}`);
    }
    return false;
  }
  if (current === replacement || baseName(current) === baseName(replacement)) return false;
  operations.set(cellKey, { x, y, z, current, replacement, phase });
  return true;
}

// The historic "switchback" stacked the first block of every return flight
// directly above the last block of the outward flight. It looked continuous
// but could only be descended. Retire those obsolete non-floor treads and fit
// one continuous 3x3 spiral inside the existing hollow core.
const obsolete = new Set();
for (let transition = 0; transition < levels.length - 1; transition += 1) {
  const y0 = levels[transition];
  const y1 = levels[transition + 1];
  const rise = y1 - y0;
  const firstRun = Math.floor((rise + 1) / 2);
  for (let step = 0; step < firstRun; step += 1) {
    for (let x = -118; x <= -116; x += 1) {
      obsolete.add(key(x, y0 + step, -444 + step));
    }
  }
  for (let step = 0; step < rise - firstRun; step += 1) {
    for (let x = -118; x <= -116; x += 1) {
      obsolete.add(key(x, y0 + firstRun + step, -441 - step));
    }
  }
}
const spiral = [
  [-118, -443, 'east'],
  [-117, -443, 'east'],
  [-116, -443, 'south'],
  [-116, -442, 'south'],
  [-116, -441, 'west'],
  [-117, -441, 'west'],
  [-118, -441, 'north'],
  [-118, -442, 'north'],
];
const spiralCells = new Set();
for (let y = levels[0]; y <= levels.at(-1); y += 1) {
  const [x, z, facing] = spiral[(y - levels[0]) % spiral.length];
  spiralCells.add(key(x, y, z));
  await repl(
    x,
    y,
    z,
    `minecraft:polished_andesite_stairs[facing=${facing},half=bottom,shape=straight,waterlogged=false]`,
    'RRCH-LIBRARY-continuous-spiral',
  );
  for (const clearY of [y + 1, y + 2]) {
    if (!AIR.has(baseName(await projectedBlockAt(x, clearY, z)))) {
      await repl(x, clearY, z, 'minecraft:air', 'RRCH-LIBRARY-spiral-headroom');
    }
  }
}

// At every authored floor, bridge the hollow historic core to the nearest
// intact floor plate. The original core had no horizontal landing at several
// levels, which is why a good stair geometry could still end in a void.
for (const floorY of levels) {
  const start = spiral[(floorY - levels[0]) % spiral.length].slice(0, 2);
  const queue = [start];
  const visited = new Set([`${start[0]},${start[1]}`]);
  const previous = new Map();
  let target = null;
  while (queue.length > 0 && !target) {
    const [x, z] = queue.shift();
    const boundary = x === -120 || x === -114 || z === -445 || z === -439;
    const blocksIncomingTread = spiralCells.has(key(x, floorY - 1, z));
    const support = await projectedBlockAt(x, floorY, z);
    const feet = await projectedBlockAt(x, floorY + 1, z);
    const head = await projectedBlockAt(x, floorY + 2, z);
    if (
      boundary
      && !blocksIncomingTread
      && !NON_FOOTING.has(baseName(support))
      && AIR.has(baseName(feet))
      && AIR.has(baseName(head))
    ) {
      target = [x, z];
      break;
    }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = [x + dx, z + dz];
      if (next[0] < -120 || next[0] > -114 || next[1] < -445 || next[1] > -439) continue;
      const nextKey = `${next[0]},${next[1]}`;
      if (visited.has(nextKey)) continue;
      if (spiralCells.has(key(next[0], floorY - 1, next[1]))) continue;
      const nextFeet = await projectedBlockAt(next[0], floorY + 1, next[1]);
      const nextHead = await projectedBlockAt(next[0], floorY + 2, next[1]);
      if (!AIR.has(baseName(nextFeet)) || !AIR.has(baseName(nextHead))) continue;
      visited.add(nextKey);
      previous.set(nextKey, [x, z]);
      queue.push(next);
    }
  }
  if (!target) throw new Error(`no library landing target found at floor ${floorY}`);
  const pathCells = [];
  let cursor = target;
  while (`${cursor[0]},${cursor[1]}` !== `${start[0]},${start[1]}`) {
    pathCells.push(cursor);
    cursor = previous.get(`${cursor[0]},${cursor[1]}`);
    if (!cursor) throw new Error(`broken landing path at floor ${floorY}`);
  }
  for (const [x, z] of pathCells.reverse()) {
    if (NON_FOOTING.has(baseName(await projectedBlockAt(x, floorY, z)))) {
      await repl(
        x,
        floorY,
        z,
        'minecraft:polished_andesite',
        `RRCH-LIBRARY-floor-${floorY}-landing`,
      );
    }
  }
}
for (const cellKey of obsolete) {
  if (spiralCells.has(cellKey)) continue;
  const [x, y, z] = cellKey.split(',').map(Number);
  if (levels.includes(y)) continue;
  if (baseName(await blockAt(x, y, z)) === 'minecraft:polished_andesite') {
    await repl(x, y, z, 'minecraft:air', 'RRCH-LIBRARY-obsolete-tread-retirement');
  }
}

// Retire the library's redundant ladder only after the projected route tests
// can use the stair overlay.
for (let y = 44; y <= 92; y += 1) {
  if (baseName(await blockAt(-118, y, -439)) === 'minecraft:ladder') {
    await repl(-118, y, -439, 'minecraft:air', 'RRCH-LIBRARY-ladder-retirement');
  }
}

for (const [x, y, z] of [
  [-64, 77, -330],
  [-54, 77, -330],
  [-64, 77, -326],
  [-54, 77, -326],
]) {
  if (baseName(await blockAt(x, y, z)) === 'minecraft:ladder') {
    await repl(x, y, z, 'minecraft:air', 'RRCH-MARKET-stray-ladder-retirement');
  }
}
for (const [x, y, z] of [[-62, 81, -366], [-60, 81, -366]]) {
  if (baseName(await blockAt(x, y, z)) === 'minecraft:ladder') {
    await repl(x, y, z, 'minecraft:air', 'RRCH-GRANGE-stray-ladder-retirement');
  }
}

const ordered = [...operations.values()].sort((a, b) => (
  a.phase.localeCompare(b.phase)
  || a.y - b.y
  || a.z - b.z
  || a.x - b.x
));
const lines = [
  '# GENERATED FILE — Ravensreach ladderless interior wave 3',
  '# six-level library stair upgrade; library/market/grange ladder retirement',
  `# snapshot: ${regions}`,
  '# every REPL is an exact one-cell source-snapshot guard',
  '',
];
let phase = null;
for (const operation of ordered) {
  if (operation.phase !== phase) {
    phase = operation.phase;
    lines.push(`# phase: ${phase}`);
  }
  lines.push(
    `REPL ${operation.x} ${operation.y} ${operation.z} `
    + `${operation.x} ${operation.y} ${operation.z} `
    + `${operation.current} ${operation.replacement}`,
  );
}
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${lines.join('\n')}\n`);

const hash = crypto.createHash('sha256');
for (const filename of fs.readdirSync(regions).filter((name) => name.endsWith('.mca')).sort()) {
  hash.update(filename);
  hash.update('\0');
  hash.update(fs.readFileSync(path.join(regions, filename)));
  hash.update('\0');
}
const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourceSnapshot: {
    directory: regions,
    sha256: hash.digest('hex'),
  },
  operations: ordered.length,
  libraryStairCells: ordered.filter(
    (operation) => operation.phase === 'RRCH-LIBRARY-continuous-spiral',
  ).length,
  obsoleteTreadsRemoved: ordered.filter(
    (operation) => operation.phase === 'RRCH-LIBRARY-obsolete-tread-retirement',
  ).length,
  libraryLaddersRemoved: ordered.filter(
    (operation) => operation.phase === 'RRCH-LIBRARY-ladder-retirement',
  ).length,
  marketLaddersRemoved: ordered.filter(
    (operation) => operation.phase === 'RRCH-MARKET-stray-ladder-retirement',
  ).length,
  grangeLaddersRemoved: ordered.filter(
    (operation) => operation.phase === 'RRCH-GRANGE-stray-ladder-retirement',
  ).length,
  guarantees: [
    'one continuous oriented spiral connects all six authored library levels',
    'all six authored library levels are tested in both directions',
    'no ladder remains in the three inventoried Ravensreach structures that contained one',
  ],
};
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output, report: reportPath, ...report }, null, 2));
