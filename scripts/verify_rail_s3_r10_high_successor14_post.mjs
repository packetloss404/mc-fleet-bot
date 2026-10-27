#!/usr/bin/env node
/** Read-only independent closeout for the High Successor-14 civil corridor. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const option = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : '';
};
const postRoot = option('--post');
const manifestPath = option('--manifest');
const rollbackDir = option('--rollback-dir');
const out = option('--out');
if (!postRoot || !manifestPath || !rollbackDir || !out) {
  throw new Error('usage: --post <capture> --manifest <manifest> --rollback-dir <reports> --out <json>');
}
const ROOT = process.cwd();
const absolute = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const point = (x, y, z) => ({ x, y, z });
const box = (min, max) => {
  const cells = [];
  for (let x = min.x; x <= max.x; x += 1) for (let y = min.y; y <= max.y; y += 1) {
    for (let z = min.z; z <= max.z; z += 1) cells.push(point(x, y, z));
  }
  return cells;
};
const parseOps = (filename) => fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/).filter(Boolean).map((line) => {
  const parts = line.trim().split(/\s+/);
  if (parts.length !== 9 || parts[0] !== 'REPL') throw new Error(`invalid operation ${line}`);
  return { point: point(Number(parts[1]), Number(parts[2]), Number(parts[3])), to: parts[8] };
});

const manifest = readJson(manifestPath);
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  if (!fs.existsSync(path.join(absolute(postRoot), member))) throw new Error(`post capture lacks ${member}`);
}
const reader = new AnvilReader(path.join(absolute(postRoot), 'region'));
const stateAt = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
const stages = manifest.stages.map((stage) => ({ ...stage, operations: parseOps(stage.forward) }));
const allTargets = stages.flatMap(({ operations }) => operations);
const duplicateTargets = allTargets.length - new Set(allTargets.map(({ point: cell }) => cellKey(cell))).size;
const targetFailures = [];
for (const { id, operations } of stages) for (const operation of operations) {
  const actual = await stateAt(operation.point);
  if (actual !== operation.to) targetFailures.push({ stage: id, point: operation.point, expected: operation.to, actual });
}

const { x, y, z } = manifest.geometry.core.bounds;
const core = box(point(x[0], y[0], z[0]), point(x[1], y[1], z[1]));
const coreKeys = new Set(core.map(cellKey));
const shell = box(point(x[0] - 1, y[0] - 1, z[0] - 1), point(x[1] + 1, y[1] + 1, z[1] + 1))
  .filter((cell) => !coreKeys.has(cellKey(cell)) && (cell.y === y[0] - 1 || cell.y === y[1] + 1 || cell.z === z[0] - 1 || cell.z === z[1] + 1));
const shellKeys = new Set(shell.map(cellKey));
const halo = box(point(x[0] - 2, y[0] - 2, z[0] - 2), point(x[1] + 2, y[1] + 2, z[1] + 2))
  .filter((cell) => !coreKeys.has(cellKey(cell)) && !shellKeys.has(cellKey(cell)));
const expectedHalo = new Map(manifest.gravity.preservedHalo.exactStates.map(({ point: cell, state }) => [cellKey(cell), state]));
const haloFailures = [];
const actualHalo = [];
for (const cell of halo) {
  const state = await stateAt(cell);
  actualHalo.push({ point: cell, state });
  if (state !== expectedHalo.get(cellKey(cell))) haloFailures.push({ point: cell, expected: expectedHalo.get(cellKey(cell)) ?? null, actual: state });
}
const water = actualHalo.filter(({ state }) => state === 'minecraft:water[level=0]');
const gravel = actualHalo.filter(({ state }) => state === 'minecraft:gravel');
const predecessor = readJson(manifest.ownership.predecessor.manifest);
const predecessorTargets = new Set(predecessor.stages.flatMap(({ forward }) => parseOps(forward)).map(({ point: cell }) => cellKey(cell)));
const haloPds = actualHalo.filter(({ state }) => state === 'minecraft:polished_deepslate');
const haloInterface = actualHalo.filter(({ point: cell }) => predecessorTargets.has(cellKey(cell)));
const localPds = haloPds.filter(({ point: cell }) => !predecessorTargets.has(cellKey(cell)));
const waterKeys = water.map(({ point: cell }) => cell);

const route = box(point(-254, 54, -460), point(-215, 59, -455));
const routeFailures = [];
for (const cell of route) {
  const actual = await stateAt(cell);
  if (actual !== 'minecraft:air') routeFailures.push({ point: cell, actual });
}
const chains = manifest.gravity.targetGravel.supportChains;
const coreChains = manifest.gravity.targetGravel.coreChains;
const shellChains = manifest.gravity.targetGravel.shellChains;
const unsafeChains = chains.filter((chain) => !chain.safeAfterShellLock || !chain.terminal || chain.terminal.state === 'minecraft:air');

const coreRollback = readJson(`${rollbackDir}/core-rb.json`);
const shellRollback = readJson(`${rollbackDir}/shell-rb.json`);
const rollback = {
  core: { status: coreRollback.status, operationCount: coreRollback.operationCount, regions: coreRollback.regions, generatedAt: coreRollback.generatedAt },
  shell: { status: shellRollback.status, operationCount: shellRollback.operationCount, regions: shellRollback.regions, generatedAt: shellRollback.generatedAt },
};
const checks = {
  postCaptureComplete: true,
  targets: allTargets.length === 1280 && duplicateTargets === 0 && targetFailures.length === 0
    && stages[0]?.operations.length === 560 && stages[1]?.operations.length === 720,
  supportChains: chains.length === 84 && coreChains.length === 70 && shellChains.length === 14 && unsafeChains.length === 0,
  halo: halo.length === 1064 && expectedHalo.size === 1064 && haloFailures.length === 0
    && water.length === 3 && hashCells(waterKeys) === manifest.waterPreservation.coordinateSetSha256 && gravel.length === 9
    && haloPds.length === 28 && haloInterface.length === 100 && localPds.length === 0,
  route: route.length === 1440 && routeFailures.length === 0,
  rollback: rollback.core.status === 'PASS' && rollback.core.operationCount === 720
    && rollback.shell.status === 'PASS' && rollback.shell.operationCount === 560
    && rollback.core.regions === `${postRoot}/region` && rollback.shell.regions === `${postRoot}/region`
    && rollback.core.generatedAt <= rollback.shell.generatedAt,
};
const failures = Object.entries(checks).filter(([, pass]) => !pass).map(([check]) => check);
const result = {
  schemaVersion: 1,
  id: 'rail-s3-r10-high-successor14-independent-post-qa',
  status: failures.length === 0 ? 'PASS' : 'FAIL',
  postRoot,
  postCaptureManifestSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(absolute(postRoot), 'combined-zones-complete-save-capture.json'))).digest('hex'),
  manifestPath,
  targets: { expected: 1280, actual: allTargets.length, duplicateTargets, failures: targetFailures.length, stageCounts: Object.fromEntries(stages.map(({ id, operations }) => [id, operations.length])) },
  supportChains: { expected: 84, actual: chains.length, core: coreChains.length, shell: shellChains.length, unsafe: unsafeChains.length },
  halo: { expected: 1064, actual: halo.length, failures: haloFailures.length, water: water.length, waterCoordinateSetSha256: hashCells(waterKeys), gravel: gravel.length, preservationContract: '56/28/100/0/0', haloPds: haloPds.length, predecessorInterface: haloInterface.length, localPds: localPds.length },
  route: { crossSection: '6x6', stationCount: 40, checkedCells: route.length, failures: routeFailures.length, bounds: { x: [-254, -215], y: [54, 59], z: [-460, -455] } },
  rollback,
  checks,
  failures,
  civilOnly: manifest.civilOnly === true && manifest.routeCommissioned === false && manifest.passengerServiceCommissioned === false,
  readOnly: true,
};
fs.mkdirSync(path.dirname(absolute(out)), { recursive: true });
fs.writeFileSync(absolute(out), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ status: result.status, targets: result.targets, supportChains: result.supportChains, halo: result.halo, route: result.route, rollback: result.rollback, failures }, null, 2));
