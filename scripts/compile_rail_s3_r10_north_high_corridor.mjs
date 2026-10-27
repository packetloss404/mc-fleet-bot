#!/usr/bin/env node
/** Offline staged, sealed high northern 6x6 corridor beside R10 continuation-05 retention. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { AnvilReader, cellKey, hashCells, replLine, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const value = (flag, fallback = '') => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const snapshot = value('--snapshot');
const basename = value('--basename', 'rail-s3-r10-north-high-corridor-01');
const outDir = value('--out-dir', 'data/buildops');
const retentionManifestPath = value('--retention-manifest', 'data/buildops/rail-s3-r10-upper-continuation-05-retention-01.manifest.json');
const predecessorOpsPath = value('--predecessor-ops', 'data/buildops/rail-s3-r10-upper-continuation-06.forward.txt');
if (!snapshot) throw new Error('--snapshot required');
const fail = (condition, message) => { if (!condition) throw new Error(`R10 north high corridor: ${message}`); };
const reader = new AnvilReader(path.resolve(process.cwd(), snapshot, 'region'));
const cache = new Map();
const state = async (point) => { const key = cellKey(point); if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(point.x, point.y, point.z))); return cache.get(key); };
const isFluid = (block) => block.startsWith('minecraft:water') || block.startsWith('minecraft:lava') || block.startsWith('minecraft:bubble_column') || block.includes('waterlogged=true');
const forbidden = new Set(['minecraft:chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:spawner', 'minecraft:command_block', 'minecraft:lectern', 'minecraft:beacon']);
const blockName = (block) => block.split('[', 1)[0];
const inner = [];
for (let x = 26; x <= 45; x += 1) for (let y = 42; y <= 47; y += 1) for (let z = -472; z <= -467; z += 1) inner.push({ x, y, z });
const shell = [];
for (let x = 25; x <= 46; x += 1) for (let y = 41; y <= 48; y += 1) for (let z = -473; z <= -466; z += 1) {
  if (x === 25 || x === 46 || y === 41 || y === 48 || z === -473 || z === -466) shell.push({ x, y, z });
}
const support = [{ x: 39, y: 45, z: -473 }, { x: 40, y: 45, z: -473 }];
const supportKeys = new Set(support.map(cellKey));
const shellRemaining = shell.filter((point) => !supportKeys.has(cellKey(point)));
const targetKeys = new Set([...inner, ...shell].map(cellKey));
fail(targetKeys.size === inner.length + shell.length, 'core/shell overlap');
for (const point of inner) {
  const observed = await state(point);
  fail(!isFluid(observed), `fluid core target ${cellKey(point)}=${observed}`);
  fail(observed !== 'minecraft:gravel', `gravity core target ${cellKey(point)}=${observed}`);
  fail(!forbidden.has(blockName(observed)), `block entity core target ${cellKey(point)}=${observed}`);
}
for (const point of support) fail(await state(point) === 'minecraft:gravel', `support point source drift ${cellKey(point)}=${await state(point)}`);
for (const point of shellRemaining) {
  const observed = await state(point);
  fail(!isFluid(observed), `fluid shell target ${cellKey(point)}=${observed}`);
  fail(observed !== 'minecraft:gravel' || point.y === 46 && point.z === -473 && (point.x === 39 || point.x === 40), `unreviewed gravity shell target ${cellKey(point)}=${observed}`);
  fail(!forbidden.has(blockName(observed)), `block entity shell target ${cellKey(point)}=${observed}`);
}
const retention = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), retentionManifestPath), 'utf8'));
const parseOps = (filename) => fs.readFileSync(path.resolve(process.cwd(), filename), 'utf8').trim().split(/\r?\n/).filter(Boolean).map((line) => line.trim().split(/\s+/)).map((fields) => ({ point: { x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]) } }));
const retentionTargets = new Set(retention.stages.flatMap(({ forward }) => parseOps(forward)).map(({ point }) => cellKey(point)));
const predecessorTargets = new Set(parseOps(predecessorOpsPath).map(({ point }) => cellKey(point)));
const retentionOverlap = [...targetKeys].filter((key) => retentionTargets.has(key));
const predecessorOverlap = [...targetKeys].filter((key) => predecessorTargets.has(key));
fail(retentionOverlap.length === 0, `retention chamber/liner target overlap (${retentionOverlap.length})`);
fail(predecessorOverlap.length === 0, `unexpected predecessor target overlap (${predecessorOverlap.length})`);
const stages = [
  { id: 'gravity-support', points: support, to: 'minecraft:polished_deepslate' },
  { id: 'shell', points: shellRemaining.slice().sort((a, b) => a.y - b.y || a.x - b.x || a.z - b.z), to: 'minecraft:polished_deepslate' },
  { id: 'core-clear', points: inner, to: 'minecraft:air' },
];
fs.mkdirSync(path.resolve(process.cwd(), outDir), { recursive: true });
const emitted = [];
for (const stage of stages) {
  const records = await Promise.all(stage.points.map(async (point) => ({ point, from: await state(point), to: stage.to })));
  const forward = `${records.map((record) => replLine(record.point, record.from, record.to)).join('\n')}\n`;
  const rollback = `${records.slice().reverse().map((record) => replLine(record.point, record.to, record.from)).join('\n')}\n`;
  const forwardPath = `${outDir}/${basename}.${stage.id}.forward.txt`;
  const rollbackPath = `${outDir}/${basename}.${stage.id}.rollback.txt`;
  fs.writeFileSync(forwardPath, forward);
  fs.writeFileSync(rollbackPath, rollback);
  emitted.push({ id: stage.id, forward: forwardPath, rollback: rollbackPath, count: records.length, sha256: crypto.createHash('sha256').update(forward).digest('hex'), rollbackSha256: crypto.createHash('sha256').update(rollback).digest('hex'), exactInverse: true });
}
const manifest = {
  schemaVersion: 1,
  transactionId: basename,
  status: 'COMPILED_OFFLINE_R10_NORTH_HIGH_CORRIDOR_AWAITING_STATIC_GATES',
  snapshot,
  geometry: { core: { count: inner.length, bounds: { x: [26, 45], y: [42, 47], z: [-472, -467] }, expected: 'minecraft:air' }, shell: { count: shell.length, bounds: { x: [25, 46], y: [41, 48], z: [-473, -466] }, expected: 'minecraft:polished_deepslate' } },
  gravity: { supportBeforeGravity: support, knownUpperGravel: [{ x: 39, y: 46, z: -473 }, { x: 40, y: 46, z: -473 }], order: ['gravity-support', 'shell bottom-up', 'core-clear'] },
  predecessorMigration: { predecessorOpsPath, exactTargetOverlapCount: predecessorOverlap.length, status: 'ZERO_OVERLAP_SEALED_FUTURE_INTERFACE_NOT_YET_CONNECTED' },
  retentionExclusion: { retentionManifestPath, exactTargetOverlapCount: retentionOverlap.length, oneBlockNorthSeparationAtZ: -466 },
  stages: emitted,
  exactInverse: true,
  postQa: { coreAir: inner.length, shellPds: shell.length, retainedWaterAndPriorRetentionMustRemainExact: true, routeCommissioned: false, passengerServiceCommissioned: false },
  readOnlyCompilation: true,
};
fs.writeFileSync(`${outDir}/${basename}.manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
