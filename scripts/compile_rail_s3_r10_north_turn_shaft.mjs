#!/usr/bin/env node
/**
 * Offline compiler for the guarded north-turn and vertical-shaft connection
 * between R10 continuation-05 and the accepted North High Corridor-01.
 *
 * The connection deliberately migrates only three reviewed PDS interfaces:
 * 72 North-High shell cells, six retention top-shell cells, and 32 terminal
 * continuation-05 PDS cells.  All other prior-release targets are excluded
 * from this package and are post-QA invariants.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { AnvilReader, cellKey, hashCells, replLine, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const value = (flag, fallback = '') => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const snapshot = value('--snapshot');
const basename = value('--basename', 'rail-s3-r10-north-turn-shaft-01');
const outDir = value('--out-dir', 'data/buildops');
const retentionManifestPath = value('--retention-manifest', 'data/buildops/rail-s3-r10-upper-continuation-05-retention-01.manifest.json');
const predecessorOpsPath = value('--predecessor-ops', 'data/buildops/rail-s3-r10-upper-continuation-06.forward.txt');
const highManifestPath = value('--high-manifest', 'data/buildops/rail-s3-r10-north-high-corridor-01.manifest.json');
if (!snapshot) throw new Error('--snapshot required');

const fail = (condition, message) => {
  if (condition) throw new Error(`R10 north turn/shaft: ${message}`);
};
const root = process.cwd();
const reader = new AnvilReader(path.resolve(root, snapshot, 'region'));
const cache = new Map();
const state = async (point) => {
  const key = cellKey(point);
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(point.x, point.y, point.z)));
  return cache.get(key);
};
const isFluid = (block) => block.startsWith('minecraft:water') || block.startsWith('minecraft:lava') || block.startsWith('minecraft:bubble_column') || block.includes('waterlogged=true');
const blockName = (block) => block.split('[', 1)[0];
const forbidden = new Set(['minecraft:chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:spawner', 'minecraft:command_block', 'minecraft:lectern', 'minecraft:beacon']);
const point = (x, y, z) => ({ x, y, z });
const box = (min, max) => {
  const cells = [];
  for (let x = min.x; x <= max.x; x += 1) for (let y = min.y; y <= max.y; y += 1) for (let z = min.z; z <= max.z; z += 1) cells.push(point(x, y, z));
  return cells;
};
const asMap = (cells) => new Map(cells.map((cell) => [cellKey(cell), cell]));
const parseOps = (filename) => fs.readFileSync(path.resolve(root, filename), 'utf8').trim().split(/\r?\n/).filter(Boolean).map((line) => {
  const fields = line.trim().split(/\s+/);
  return { point: point(Number(fields[1]), Number(fields[2]), Number(fields[3])) };
});

// The 6×6 north turn opens the north cap/side of North High.  The 6×6 shaft
// descends from that turn and reuses exactly the existing continuation-05
// terminal cap; its x=30/y=42 upper edge is the reviewed six-cell retention
// top-shell interface.
const turn = box(point(25, 42, -472), point(30, 47, -453));
const shaft = box(point(25, 28, -458), point(30, 41, -453));
const core = asMap([...turn, ...shaft]);
fail(core.size !== 1224, `expected 1,224 unique core cells, got ${core.size}`);

const retention = JSON.parse(fs.readFileSync(path.resolve(root, retentionManifestPath), 'utf8'));
const retentionTargets = new Set(retention.stages.flatMap(({ forward }) => parseOps(forward)).map(({ point: candidate }) => cellKey(candidate)));
const retainedWater = asMap(retention.externalRetention.retained.cells);
const predecessorTargets = new Set(parseOps(predecessorOpsPath).map(({ point: candidate }) => cellKey(candidate)));
const highManifest = JSON.parse(fs.readFileSync(path.resolve(root, highManifestPath), 'utf8'));
const highStages = highManifest.stages.flatMap(({ forward }) => parseOps(forward));
const highTargets = new Set(highStages.map(({ point: candidate }) => cellKey(candidate)));
const highCoreTargets = new Set(parseOps(highManifest.stages.find(({ id }) => id === 'core-clear').forward).map(({ point: candidate }) => cellKey(candidate)));

const sourceCore = [];
for (const candidate of core.values()) {
  const observed = await state(candidate);
  fail(isFluid(observed), `fluid core target ${cellKey(candidate)}=${observed}`);
  fail(forbidden.has(blockName(observed)), `block entity core target ${cellKey(candidate)}=${observed}`);
  sourceCore.push({ point: candidate, from: observed, to: 'minecraft:air' });
}

const gravel = sourceCore.filter(({ from }) => from === 'minecraft:gravel');
const support = [point(25, 29, -453)];
const supportKeys = new Set(support.map(cellKey));
fail(gravel.length !== 2, `expected exactly two shaft gravel cells, got ${gravel.length}`);
fail(gravel.some(({ point: candidate }) => candidate.x !== 25 || candidate.z !== -453 || ![30, 31].includes(candidate.y)), `unreviewed gravel target ${JSON.stringify(gravel.map(({ point: candidate }) => candidate))}`);
for (const candidate of support) fail(await state(candidate) !== 'minecraft:stone', `temporary support source must be stone at ${cellKey(candidate)}=${await state(candidate)}`);

const retentionMigrations = sourceCore.filter(({ point: candidate, from }) => from === 'minecraft:polished_deepslate' && retentionTargets.has(cellKey(candidate)));
const predecessorMigrations = sourceCore.filter(({ point: candidate, from }) => from === 'minecraft:polished_deepslate' && predecessorTargets.has(cellKey(candidate)));
const highMigrations = sourceCore.filter(({ point: candidate, from }) => from === 'minecraft:polished_deepslate' && highTargets.has(cellKey(candidate)));
const allPdsMigrations = sourceCore.filter(({ from }) => from === 'minecraft:polished_deepslate');
fail(retentionMigrations.length !== 6, `expected six retention top-shell migrations, got ${retentionMigrations.length}`);
fail(predecessorMigrations.length !== 32, `expected 32 predecessor PDS migrations, got ${predecessorMigrations.length}`);
fail(highMigrations.length !== 72, `expected 72 North High PDS migrations, got ${highMigrations.length}`);
fail(allPdsMigrations.length !== 110, `unexpected PDS-to-air migration total ${allPdsMigrations.length}`);
const reviewedPds = new Set([...retentionMigrations, ...predecessorMigrations, ...highMigrations].map(({ point: candidate }) => cellKey(candidate)));
fail(reviewedPds.size !== allPdsMigrations.length || allPdsMigrations.some(({ point: candidate }) => !reviewedPds.has(cellKey(candidate))), 'unreviewed PDS-to-air migration');

// Create the external PDS skin around the connected core.  Cells owned by a
// previous scope are either the deliberate interior migrations above or are
// preserved as-is; in particular we never write an unreviewed retention,
// predecessor, or North-High target.
const shellCandidates = new Map();
for (const candidate of core.values()) {
  for (const neighbor of [point(candidate.x - 1, candidate.y, candidate.z), point(candidate.x + 1, candidate.y, candidate.z), point(candidate.x, candidate.y - 1, candidate.z), point(candidate.x, candidate.y + 1, candidate.z), point(candidate.x, candidate.y, candidate.z - 1), point(candidate.x, candidate.y, candidate.z + 1)]) {
    const key = cellKey(neighbor);
    if (!core.has(key) && !highCoreTargets.has(key) && !retentionTargets.has(key) && !predecessorTargets.has(key) && !highTargets.has(key)) shellCandidates.set(key, neighbor);
  }
}
const shell = [];
for (const candidate of shellCandidates.values()) {
  const observed = await state(candidate);
  fail(isFluid(observed), `fluid shell target ${cellKey(candidate)}=${observed}`);
  fail(observed === 'minecraft:gravel', `unreviewed gravity shell target ${cellKey(candidate)}`);
  fail(forbidden.has(blockName(observed)), `block entity shell target ${cellKey(candidate)}=${observed}`);
  if (observed !== 'minecraft:polished_deepslate') shell.push({ point: candidate, from: observed, to: 'minecraft:polished_deepslate' });
}

const coreClear = sourceCore.filter(({ point: candidate, from }) => from !== 'minecraft:air' && !supportKeys.has(cellKey(candidate)));
const topGravel = gravel.find(({ point: candidate }) => candidate.y === 31);
const lowerGravel = gravel.find(({ point: candidate }) => candidate.y === 30);
const coreRest = coreClear.filter((record) => record !== topGravel && record !== lowerGravel).sort((left, right) => left.point.y - right.point.y || left.point.x - right.point.x || left.point.z - right.point.z);
const supportStage = support.map((candidate) => ({ point: candidate, from: 'minecraft:stone', to: 'minecraft:polished_deepslate' }));
const supportClear = support.map((candidate) => ({ point: candidate, from: 'minecraft:polished_deepslate', to: 'minecraft:air' }));
const stages = [
  { id: 'gravity-support', records: supportStage },
  { id: 'external-shell', records: shell.sort((left, right) => left.point.y - right.point.y || left.point.x - right.point.x || left.point.z - right.point.z) },
  { id: 'core-clear', records: [topGravel, lowerGravel, ...coreRest] },
  { id: 'temporary-support-clear', records: supportClear },
];
for (const stage of stages) fail(stage.records.some((record) => !record), `undefined record in ${stage.id}`);

fs.mkdirSync(path.resolve(root, outDir), { recursive: true });
const emitted = stages.map(({ id, records }) => {
  const forward = `${records.map(({ point: candidate, from, to }) => replLine(candidate, from, to)).join('\n')}\n`;
  const rollback = `${records.slice().reverse().map(({ point: candidate, from, to }) => replLine(candidate, to, from)).join('\n')}\n`;
  const forwardPath = `${outDir}/${basename}.${id}.forward.txt`;
  const rollbackPath = `${outDir}/${basename}.${id}.rollback.txt`;
  fs.writeFileSync(path.resolve(root, forwardPath), forward);
  fs.writeFileSync(path.resolve(root, rollbackPath), rollback);
  return { id, forward: forwardPath, rollback: rollbackPath, count: records.length, sha256: crypto.createHash('sha256').update(forward).digest('hex'), rollbackSha256: crypto.createHash('sha256').update(rollback).digest('hex'), exactInverse: true };
});
const staticRetention = [...retentionTargets].filter((key) => !core.has(key));
const staticHigh = [...highTargets].filter((key) => !core.has(key));
const staticPredecessor = [...predecessorTargets].filter((key) => !core.has(key));
const manifest = {
  schemaVersion: 1,
  transactionId: basename,
  status: 'COMPILED_OFFLINE_R10_NORTH_TURN_SHAFT_AWAITING_STATIC_GATES',
  source: { snapshot },
  geometry: {
    northTurn: { bounds: { x: [25, 30], y: [42, 47], z: [-466, -453] }, cellCount: turn.length },
    verticalShaft: { bounds: { x: [25, 30], y: [28, 41], z: [-458, -453] }, cellCount: shaft.length },
    connectedCore: { cellCount: core.size, expected: 'minecraft:air', coordinateSetSha256: hashCells([...core.values()]) },
  },
  gravity: { targetGravel: gravel.map(({ point: candidate }) => candidate), temporarySupport: support, forwardOrder: ['gravity-support', 'external-shell', 'clear top gravel y=31', 'clear lower gravel y=30', 'temporary-support-clear'], rollbackOrder: ['temporary-support-clear', 'core-clear', 'external-shell', 'gravity-support'] },
  interfaces: {
    northHigh: { manifest: highManifestPath, migratedPds: { count: highMigrations.length, coordinateSetSha256: hashCells(highMigrations.map(({ point: candidate }) => candidate)) }, preservedTargets: staticHigh.length },
    retention: { manifest: retentionManifestPath, migratedTopShell: { count: retentionMigrations.length, coordinateSetSha256: hashCells(retentionMigrations.map(({ point: candidate }) => candidate)) }, preservedTargets: staticRetention.length, retainedWater: { count: retainedWater.size, coordinateSetSha256: hashCells([...retainedWater.values()]) } },
    predecessor: { ops: predecessorOpsPath, migratedPds: { count: predecessorMigrations.length, coordinateSetSha256: hashCells(predecessorMigrations.map(({ point: candidate }) => candidate)) }, preservedTargets: staticPredecessor.length },
  },
  shell: { mutableExternalCells: shell.length, expected: 'minecraft:polished_deepslate', coordinateSetSha256: hashCells(shell.map(({ point: candidate }) => candidate)) },
  stages: emitted,
  exactInverse: true,
  hardStops: { noFluidOrBlockEntities: true, reviewedPdsMigrationsOnly: true, freshSourceRebindRequired: true, strictParserAndEntityGatesRequired: true, journaledExecutionRequired: true, postTopologyAndSequentialRollbackRequired: true },
  civilOnly: true,
  routeCommissioned: false,
  passengerServiceCommissioned: false,
};
manifest.manifestIdentity = crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
fs.writeFileSync(path.resolve(root, `${outDir}/${basename}.manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: manifest.status, stages: Object.fromEntries(emitted.map(({ id, count }) => [id, count])), core: core.size, pdsMigrations: { northHigh: highMigrations.length, retention: retentionMigrations.length, predecessor: predecessorMigrations.length }, gravity: { gravel: gravel.length, temporarySupport: support.length }, invariants: { northHigh: staticHigh.length, retention: staticRetention.length, predecessor: staticPredecessor.length }, manifestIdentity: manifest.manifestIdentity }, null, 2)}\n`);
