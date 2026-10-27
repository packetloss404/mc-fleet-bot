#!/usr/bin/env node
/** Read-only source, inverse, and 56/28/100/0/0 contract QA for Successor-10. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const option = (flag, fallback = '') => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const sourceRoot = option('--source');
const manifestPath = option('--manifest', 'data/buildops/rail-s3-r10-west-high-successor-10.manifest.json');
const out = option('--out');
if (!sourceRoot || !out) throw new Error('usage: --source <snapshot> --out <json>');
const ROOT = process.cwd();
const absolute = (filename) => path.resolve(ROOT, filename);
const manifest = JSON.parse(fs.readFileSync(absolute(manifestPath), 'utf8'));
const reader = new AnvilReader(path.join(absolute(sourceRoot), 'region'));
const parse = (filename) => fs.readFileSync(absolute(filename), 'utf8')
  .split(/\r?\n/).filter(Boolean).map((line) => {
    const terms = line.trim().split(/\s+/);
    if (terms.length !== 9 || terms[0] !== 'REPL') throw new Error(`invalid operation: ${line}`);
    return { point: { x: Number(terms[1]), y: Number(terms[2]), z: Number(terms[3]) }, from: terms[7], to: terms[8] };
  });

const sourceChecks = [];
const exactInverse = [];
const allForward = [];
for (const stage of manifest.stages) {
  const forward = parse(stage.forward);
  const rollback = parse(stage.rollback);
  const sourceFailures = [];
  for (const record of forward) {
    const actual = stateToCommandString(await reader.blockState(record.point.x, record.point.y, record.point.z));
    if (actual !== record.from) sourceFailures.push({ point: record.point, expected: record.from, actual });
  }
  sourceChecks.push({ id: stage.id, expected: stage.count, actual: forward.length - sourceFailures.length, failures: sourceFailures });
  const inverseFailures = [];
  const expectedInverse = forward.slice().reverse();
  if (rollback.length !== expectedInverse.length) inverseFailures.push({ kind: 'count', expected: expectedInverse.length, actual: rollback.length });
  for (let index = 0; index < Math.min(rollback.length, expectedInverse.length); index += 1) {
    const forwardRecord = expectedInverse[index];
    const rollbackRecord = rollback[index];
    if (cellKey(forwardRecord.point) !== cellKey(rollbackRecord.point)
      || forwardRecord.from !== rollbackRecord.to || forwardRecord.to !== rollbackRecord.from) {
      inverseFailures.push({ kind: 'inverse', index, forward: forwardRecord, rollback: rollbackRecord });
    }
  }
  exactInverse.push({ id: stage.id, expected: expectedInverse.length, actual: rollback.length, failures: inverseFailures });
  allForward.push(...forward);
}
const targetKeys = allForward.map(({ point }) => cellKey(point));
const duplicateTargets = targetKeys.filter((key, index) => targetKeys.indexOf(key) !== index);
const predecessor = manifest.ownership.predecessor;
const contract = {
  shellOperations: manifest.stages.find(({ id }) => id === 'external-shell')?.count === 560,
  coreOperations: manifest.stages.find(({ id }) => id === 'core-clear')?.count === 720,
  coreGeometry: manifest.geometry.core.count === 720,
  shellGeometry: manifest.geometry.shell.surfaceCount === 616 && manifest.geometry.shell.mutableCount === 560,
  preservationContract: predecessor.preservationContract === '56/28/100/0/0',
  shellPds: predecessor.shellPds.count === 56,
  haloPds: predecessor.haloPds.count === 28,
  haloInterface: predecessor.haloInterface.count === 100,
  localPds: predecessor.localPds.count === 0,
  pdsMigration: predecessor.pdsMigration.count === 0,
  halo: manifest.gravity.preservedHalo.count === 1064,
  haloGravel: manifest.gravity.preservedHalo.gravelCount === 0,
  civilOnly: manifest.civilOnly === true && manifest.routeCommissioned === false && manifest.passengerServiceCommissioned === false,
};
const contractFailures = Object.entries(contract).filter(([, valid]) => !valid).map(([name]) => name);
const result = {
  schemaVersion: 1,
  id: 'rail-s3-r10-west-high-successor10-static-qa',
  status: sourceChecks.every(({ failures }) => failures.length === 0)
    && exactInverse.every(({ failures }) => failures.length === 0)
    && duplicateTargets.length === 0 && contractFailures.length === 0 ? 'PASS' : 'FAIL',
  sourceRoot,
  manifestPath,
  sourceChecks,
  exactInverse,
  forwardTargetSet: { count: allForward.length, uniqueCount: new Set(targetKeys).size, coordinateSetSha256: hashCells(allForward.map(({ point }) => point)), duplicateTargets },
  contract,
  contractFailures,
  manifestSha256: crypto.createHash('sha256').update(fs.readFileSync(absolute(manifestPath))).digest('hex'),
  readOnly: true,
};
fs.mkdirSync(path.dirname(absolute(out)), { recursive: true });
fs.writeFileSync(absolute(out), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({
  status: result.status,
  source: sourceChecks.map(({ id, actual, expected }) => `${id}:${actual}/${expected}`),
  inverse: exactInverse.map(({ id, actual, expected, failures }) => `${id}:${actual}/${expected}, failures=${failures.length}`),
  forwardTargets: `${result.forwardTargetSet.uniqueCount}/${result.forwardTargetSet.count}`,
  contractFailures,
}, null, 2));
