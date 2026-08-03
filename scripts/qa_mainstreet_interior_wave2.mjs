#!/usr/bin/env node
/**
 * Saved-snapshot/projected route QA for MainStreet interior Wave 2.
 *
 * Each affected building is flooded from one cataloged room to a walkable cell
 * in every other cataloged room. The Midtown also receives explicit four-floor
 * ascent/descent and full-volume coverage tests.
 */
import fs from 'fs';
import path from 'path';
import process from 'process';
import { spawnSync } from 'child_process';

import { AnvilSnapshot } from './generate_picket_fence.mjs';

const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const regions = value(
  '--regions',
  'data/worldsnap-worldwide-wave1-post-20260727/region',
);
const ops = value(
  '--ops',
  'data/buildops/mainstreet-interior-wave2-2026-07-27.txt',
);
const censusPath = value(
  '--census',
  'data/world-review/worldwide-interior-wave1-post-census-2026-07-27.json',
);
const output = value(
  '--out',
  'data/world-review/mainstreet-interior-wave2-route-qa-2026-07-27.json',
);
const live = args.includes('--live');

const AIR = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
]);
const NON_SUPPORT = new Set([
  ...AIR,
  'minecraft:water',
  'minecraft:bubble_column',
  'minecraft:lava',
  'minecraft:ladder',
  'minecraft:scaffolding',
  'minecraft:iron_bars',
  'minecraft:chain',
]);
const baseName = (block) => block.split('[', 1)[0];
const key = (x, y, z) => `${x},${y},${z}`;

const snapshot = new AnvilSnapshot(regions);
const projected = new Map();
if (!live) {
  for (const line of fs.readFileSync(ops, 'utf8').split('\n')) {
    const fields = line.trim().split(/\s+/);
    if (fields[0] !== 'REPL') continue;
    projected.set(key(Number(fields[1]), Number(fields[2]), Number(fields[3])), fields[8]);
  }
}
const cache = new Map();
async function blockAt(x, y, z) {
  const cellKey = key(x, y, z);
  if (projected.has(cellKey)) return projected.get(cellKey);
  if (cache.has(cellKey)) return cache.get(cellKey);
  const column = await snapshot.readColumn(x, z, y, y);
  if (!column) return 'minecraft:void_air';
  const block = column.get(y);
  cache.set(cellKey, block);
  return block;
}

async function standable(x, y, z) {
  return AIR.has(baseName(await blockAt(x, y, z)))
    && AIR.has(baseName(await blockAt(x, y + 1, z)))
    && !NON_SUPPORT.has(baseName(await blockAt(x, y - 1, z)));
}

async function representative(bounds) {
  const points = [];
  const centerX = Math.round((bounds.minX + bounds.maxX) / 2);
  const centerZ = Math.round((bounds.minZ + bounds.maxZ) / 2);
  for (let y = bounds.minY; y <= bounds.maxY - 1; y += 1) {
    for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
        points.push({
          point: [x, y, z],
          distance: Math.abs(x - centerX) + Math.abs(z - centerZ) + (y - bounds.minY) * 4,
        });
      }
    }
  }
  points.sort((a, b) => a.distance - b.distance);
  for (const candidate of points) {
    if (await standable(...candidate.point)) return candidate.point;
  }
  return null;
}

function runReachability({ id, from, to = [], box = null, pad = 8, budget = 500_000 }) {
  const command = [
    path.resolve('scripts/reachability.mjs'),
    '--regions',
    regions,
  ];
  if (!live) command.push('--ops', ops);
  command.push('--from', from.join(','));
  if (box) command.push('--box', box.join(','));
  else command.push('--to', to.map((point) => point.join(',')).join(';'));
  command.push('--pad', String(pad), '--budget', String(budget));
  const run = spawnSync(process.execPath, command, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  return {
    id,
    from,
    to,
    box,
    passed: run.status === 0,
    exitCode: run.status,
    stdout: run.stdout.trim(),
    stderr: run.stderr.trim(),
  };
}

const census = JSON.parse(fs.readFileSync(censusPath, 'utf8'));
const affected = census.structures.filter((structure) => (
  structure.areaId === 'mainstreet-america'
  && (structure.rooms ?? []).some((room) => (
    room.finding.status === 'empty' || room.finding.status === 'under-detailed'
  ))
));

const results = [];
const representatives = {};
for (const structure of affected) {
  const targets = [];
  for (const room of structure.rooms ?? []) {
    const point = await representative(room.bounds);
    representatives[room.id] = point;
    if (point) targets.push({ roomId: room.id, point });
  }
  if (targets.length === 0) {
    results.push({
      id: `${structure.id}-cataloged-rooms`,
      passed: false,
      error: 'no standable representative found in any cataloged room',
    });
    continue;
  }
  const from = structure.id === 'HGR-S01'
    ? [200, 106, 153]
    : targets[0].point;
  results.push({
    ...runReachability({
      id: `${structure.id}-cataloged-rooms`,
      from,
      to: targets.map((target) => target.point),
      pad: structure.id === 'HGR-S01' ? 18 : 8,
      budget: structure.id === 'HGR-S01' ? 800_000 : 500_000,
    }),
    roomTargets: targets,
  });
}

results.push(runReachability({
  id: 'H11-four-floor-up',
  from: [30, 65, -148],
  to: [[30, 70, -148], [30, 75, -148], [30, 80, -148]],
}));
results.push(runReachability({
  id: 'H11-four-floor-down',
  from: [30, 80, -148],
  to: [[30, 75, -148], [30, 70, -148], [30, 65, -148]],
}));
results.push(runReachability({
  id: 'H11-full-interior-coverage',
  from: [30, 65, -148],
  box: [27, 65, -150, 37, 83, -142],
}));

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  mode: live ? 'saved-world' : 'projected',
  regions,
  ops: live ? null : ops,
  census: censusPath,
  affectedStructures: affected.length,
  representatives,
  total: results.length,
  passed: results.filter((result) => result.passed).length,
  failed: results.filter((result) => !result.passed).length,
  results,
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
for (const result of results) {
  console.log(`${result.passed ? 'PASS' : 'FAIL'} ${result.id}`);
  if (!result.passed) {
    if (result.stdout) console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);
    if (result.error) console.error(result.error);
  }
}
console.log(`${report.passed}/${report.total} ${report.mode} route suites pass`);
console.log(`report: ${output}`);
process.exit(report.failed === 0 ? 0 : 1);
