#!/usr/bin/env node
/** Offline compiler for a dry westward extension of R10 North High Corridor-01. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { AnvilReader, cellKey, hashCells, replLine, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const value = (flag, fallback = '') => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const snapshot = value('--snapshot');
const basename = value('--basename', 'rail-s3-r10-west-high-extension-01');
const outDir = value('--out-dir', 'data/buildops');
const highManifestPath = value('--high-manifest', 'data/buildops/rail-s3-r10-north-high-corridor-01.manifest.json');
const retentionManifestPath = value('--retention-manifest', 'data/buildops/rail-s3-r10-upper-continuation-05-retention-01.manifest.json');
const predecessorOpsPath = value('--predecessor-ops', 'data/buildops/rail-s3-r10-upper-continuation-06.forward.txt');
if (!snapshot) throw new Error('--snapshot required');
const fail = (condition, message) => { if (condition) throw new Error(`R10 west high extension: ${message}`); };
const root = process.cwd();
const reader = new AnvilReader(path.resolve(root, snapshot, 'region'));
const cache = new Map();
const state = async (point) => { const key = cellKey(point); if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(point.x, point.y, point.z))); return cache.get(key); };
const fluid = (block) => block.startsWith('minecraft:water') || block.startsWith('minecraft:lava') || block.startsWith('minecraft:bubble_column') || block.includes('waterlogged=true');
const forbidden = new Set(['minecraft:chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:spawner', 'minecraft:command_block', 'minecraft:lectern', 'minecraft:beacon']);
const name = (block) => block.split('[', 1)[0];
const p = (x, y, z) => ({ x, y, z });
const box = (min, max) => { const cells = []; for (let x = min.x; x <= max.x; x += 1) for (let y = min.y; y <= max.y; y += 1) for (let z = min.z; z <= max.z; z += 1) cells.push(p(x, y, z)); return cells; };
const parseOps = (filename) => fs.readFileSync(path.resolve(root, filename), 'utf8').trim().split(/\r?\n/).filter(Boolean).map((line) => { const f = line.trim().split(/\s+/); return p(Number(f[1]), Number(f[2]), Number(f[3])); });

const core = box(p(6, 42, -472), p(25, 47, -467));
const shellEnvelope = box(p(5, 41, -473), p(26, 48, -466));
const coreKeys = new Set(core.map(cellKey));
const shell = shellEnvelope.filter(({ x, y, z }) => !coreKeys.has(cellKey({ x, y, z })) && (x === 5 || x === 26 || y === 41 || y === 48 || z === -473 || z === -466));
const highManifest = JSON.parse(fs.readFileSync(path.resolve(root, highManifestPath), 'utf8'));
const highTargets = new Set(highManifest.stages.flatMap(({ forward }) => parseOps(forward)).map(cellKey));
const retentionManifest = JSON.parse(fs.readFileSync(path.resolve(root, retentionManifestPath), 'utf8'));
const retentionTargets = new Set(retentionManifest.stages.flatMap(({ forward }) => parseOps(forward)).map(cellKey));
const predecessorTargets = new Set(parseOps(predecessorOpsPath).map(cellKey));

const coreRecords = [];
for (const point of core) {
  const from = await state(point);
  fail(fluid(from), `fluid core ${cellKey(point)}=${from}`);
  fail(from === 'minecraft:gravel', `gravity core ${cellKey(point)}`);
  fail(forbidden.has(name(from)), `block entity core ${cellKey(point)}=${from}`);
  if (from !== 'minecraft:air') coreRecords.push({ point, from, to: 'minecraft:air' });
}
const highMigration = coreRecords.filter(({ point, from }) => from === 'minecraft:polished_deepslate' && highTargets.has(cellKey(point)));
const pdsClear = coreRecords.filter(({ from }) => from === 'minecraft:polished_deepslate');
fail(highMigration.length !== 36, `expected 36 North High west-cap migrations, got ${highMigration.length}`);
fail(pdsClear.length !== 36, `unreviewed PDS-to-air migration count ${pdsClear.length}`);
fail(core.some((point) => retentionTargets.has(cellKey(point)) || predecessorTargets.has(cellKey(point))), 'core overlaps retention or continuation-05 target');

const shellRecords = [];
for (const point of shell) {
  const key = cellKey(point);
  if (highTargets.has(key) || retentionTargets.has(key) || predecessorTargets.has(key)) continue;
  const from = await state(point);
  fail(fluid(from), `fluid shell ${key}=${from}`);
  fail(from === 'minecraft:gravel', `gravity shell ${key}`);
  fail(forbidden.has(name(from)), `block entity shell ${key}=${from}`);
  if (from !== 'minecraft:polished_deepslate') shellRecords.push({ point, from, to: 'minecraft:polished_deepslate' });
}
const halo = [];
for (const point of box(p(4, 40, -474), p(27, 49, -465))) {
  const key = cellKey(point);
  if (!coreKeys.has(key) && !shell.some((candidate) => cellKey(candidate) === key)) halo.push({ point, state: await state(point) });
}
const haloGravel = halo.filter(({ state }) => state === 'minecraft:gravel');
fail(haloGravel.length !== 16, `expected 16 preserved exterior gravel cells, got ${haloGravel.length}`);

fs.mkdirSync(path.resolve(root, outDir), { recursive: true });
const emit = (id, records) => {
  const forward = `${records.map(({ point, from, to }) => replLine(point, from, to)).join('\n')}\n`;
  const rollback = `${records.slice().reverse().map(({ point, from, to }) => replLine(point, to, from)).join('\n')}\n`;
  const forwardPath = `${outDir}/${basename}.${id}.forward.txt`;
  const rollbackPath = `${outDir}/${basename}.${id}.rollback.txt`;
  fs.writeFileSync(path.resolve(root, forwardPath), forward);
  fs.writeFileSync(path.resolve(root, rollbackPath), rollback);
  return { id, forward: forwardPath, rollback: rollbackPath, count: records.length, sha256: crypto.createHash('sha256').update(forward).digest('hex'), rollbackSha256: crypto.createHash('sha256').update(rollback).digest('hex'), exactInverse: true };
};
const stages = [emit('external-shell', shellRecords.sort((a, b) => a.point.x - b.point.x || a.point.y - b.point.y || a.point.z - b.point.z)), emit('core-clear', coreRecords.sort((a, b) => b.point.x - a.point.x || a.point.y - b.point.y || a.point.z - b.point.z))];
const manifest = {
  schemaVersion: 1,
  transactionId: basename,
  status: 'COMPILED_OFFLINE_R10_WEST_HIGH_EXTENSION_AWAITING_STATIC_GATES',
  source: { snapshot },
  geometry: { core: { bounds: { x: [6, 25], y: [42, 47], z: [-472, -467] }, count: core.length, expected: 'minecraft:air', coordinateSetSha256: hashCells(core) }, shell: { envelopeBounds: { x: [5, 26], y: [41, 48], z: [-473, -466] }, mutableCount: shellRecords.length, expected: 'minecraft:polished_deepslate' } },
  ownership: { northHigh: { manifest: highManifestPath, westCapMigration: { count: highMigration.length, coordinateSetSha256: hashCells(highMigration.map(({ point }) => point)) }, allOtherTargetsPreserved: true }, retention: { manifest: retentionManifestPath, targetOverlap: 0 }, continuation05: { ops: predecessorOpsPath, targetOverlap: 0 } },
  gravity: { preservedHalo: { count: halo.length, coordinateSetSha256: hashCells(halo.map(({ point }) => point)), gravelCount: haloGravel.length, exactStates: halo }, targetGravel: 0 },
  stages,
  exactInverse: true,
  hardStops: { dryCoreAndShell: true, noContainers: true, exactNorthHighMigrationOnly: true, freshRebindAndAllKernelGatesRequired: true, postInterfaceAndHaloQaRequired: true, sequentialRollbackRequired: true },
  civilOnly: true,
  routeCommissioned: false,
  passengerServiceCommissioned: false,
};
manifest.manifestIdentity = crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
fs.writeFileSync(path.resolve(root, `${outDir}/${basename}.manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: manifest.status, stages: Object.fromEntries(stages.map(({ id, count }) => [id, count])), core: core.length, northHighWestCapMigration: highMigration.length, retentionOverlap: 0, continuation05Overlap: 0, preservedHalo: halo.length, preservedHaloGravel: haloGravel.length, manifestIdentity: manifest.manifestIdentity }, null, 2)}\n`);
