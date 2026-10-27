#!/usr/bin/env node
/** Independent post-state coordinate QA for the civil-only Successor-10 release. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const option = (flag, fallback = '') => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const postRoot = option('--post');
const manifestPath = option('--manifest');
const out = option('--out');
if (!postRoot || !manifestPath || !out) throw new Error('usage: --post <capture> --manifest <manifest> --out <json>');
const ROOT = process.cwd();
const absolute = (filename) => path.resolve(ROOT, filename);
const manifest = JSON.parse(fs.readFileSync(absolute(manifestPath), 'utf8'));
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  if (!fs.existsSync(path.join(absolute(postRoot), member))) throw new Error(`post capture lacks ${member}`);
}
const point = (x, y, z) => ({ x, y, z });
const box = (min, max) => {
  const cells = [];
  for (let x = min.x; x <= max.x; x += 1) for (let y = min.y; y <= max.y; y += 1) {
    for (let z = min.z; z <= max.z; z += 1) cells.push(point(x, y, z));
  }
  return cells;
};
const parse = (filename) => fs.readFileSync(absolute(filename), 'utf8')
  .split(/\r?\n/).filter(Boolean).map((line) => {
    const terms = line.trim().split(/\s+/);
    if (terms.length !== 9 || terms[0] !== 'REPL') throw new Error(`invalid operation: ${line}`);
    return { point: point(Number(terms[1]), Number(terms[2]), Number(terms[3])), from: terms[7], to: terms[8] };
  });
const reader = new AnvilReader(path.join(absolute(postRoot), 'region'));
const stateAt = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));

const stages = manifest.stages.map((stage) => ({ ...stage, operations: parse(stage.forward) }));
const targetFailures = [];
for (const stage of stages) for (const operation of stage.operations) {
  const actual = await stateAt(operation.point);
  if (actual !== operation.to) targetFailures.push({ stage: stage.id, point: operation.point, expected: operation.to, actual });
}

const { x, y, z } = manifest.geometry.core.bounds;
const core = box(point(x[0], y[0], z[0]), point(x[1], y[1], z[1]));
const coreKeys = new Set(core.map(cellKey));
const shell = box(point(x[0] - 1, y[0] - 1, z[0] - 1), point(x[1] + 1, y[1] + 1, z[1] + 1))
  .filter((cell) => !coreKeys.has(cellKey(cell)) && (
    cell.y === y[0] - 1 || cell.y === y[1] + 1 || cell.z === z[0] - 1 || cell.z === z[1] + 1
  ));
const shellKeys = new Set(shell.map(cellKey));
const predecessor = JSON.parse(fs.readFileSync(absolute(manifest.ownership.predecessor.manifest), 'utf8'));
const predecessorTargets = new Set(predecessor.stages.flatMap(({ forward }) => parse(forward)).map(({ point: cell }) => cellKey(cell)));
const predecessorShell = shell.filter((cell) => predecessorTargets.has(cellKey(cell)));
const predecessorShellFailures = [];
for (const cell of predecessorShell) {
  const actual = await stateAt(cell);
  if (actual !== 'minecraft:polished_deepslate') predecessorShellFailures.push({ cell, actual });
}

const halo = box(point(x[0] - 2, y[0] - 2, z[0] - 2), point(x[1] + 2, y[1] + 2, z[1] + 2))
  .filter((cell) => !coreKeys.has(cellKey(cell)) && !shellKeys.has(cellKey(cell)));
const expectedHalo = new Map(manifest.gravity.preservedHalo.exactStates.map(({ point: cell, state }) => [cellKey(cell), state]));
const haloFailures = [];
const actualHalo = [];
for (const cell of halo) {
  const actual = await stateAt(cell);
  actualHalo.push({ point: cell, state: actual });
  if (expectedHalo.get(cellKey(cell)) !== actual) haloFailures.push({ cell, expected: expectedHalo.get(cellKey(cell)) ?? null, actual });
}
const haloPds = actualHalo.filter(({ state }) => state === 'minecraft:polished_deepslate');
const haloInterface = actualHalo.filter(({ point: cell }) => predecessorTargets.has(cellKey(cell)));
const localPds = haloPds.filter(({ point: cell }) => !predecessorTargets.has(cellKey(cell)));
const contract = {
  shellPds: predecessorShell.length === 56 && predecessorShellFailures.length === 0,
  haloPds: haloPds.length === 28,
  haloInterface: haloInterface.length === 100,
  localPds: localPds.length === 0,
  pdsMigration: manifest.ownership.predecessor.pdsMigration.count === 0,
  haloExact: halo.length === 1064 && expectedHalo.size === 1064 && haloFailures.length === 0,
  civilOnly: manifest.civilOnly === true && manifest.routeCommissioned === false && manifest.passengerServiceCommissioned === false,
};
const contractFailures = Object.entries(contract).filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  schemaVersion: 1,
  id: 'rail-s3-r10-west-high-successor10-post-qa',
  status: targetFailures.length === 0 && contractFailures.length === 0 ? 'PASS' : 'FAIL',
  postRoot,
  manifestPath,
  targets: Object.fromEntries(stages.map(({ id, operations }) => [id, { expected: operations.length, actual: operations.length - targetFailures.filter(({ stage }) => stage === id).length }])),
  forwardTargetSet: { count: stages.flatMap(({ operations }) => operations).length, coordinateSetSha256: hashCells(stages.flatMap(({ operations }) => operations.map(({ point: cell }) => cell))) },
  preservationContract: { label: '56/28/100/0/0', contract, contractFailures, predecessorShellFailures, haloFailures },
  postCaptureManifestSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(absolute(postRoot), 'combined-zones-complete-save-capture.json'))).digest('hex'),
  readOnly: true,
};
fs.mkdirSync(path.dirname(absolute(out)), { recursive: true });
fs.writeFileSync(absolute(out), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ status: result.status, targets: result.targets, contractFailures, haloFailures: haloFailures.length }, null, 2));
