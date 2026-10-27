#!/usr/bin/env node
/** Independent read-only source, inverse, gravity, water, and ownership QA. */
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
const manifestPath = option('--manifest');
const out = option('--out');
if (!sourceRoot || !manifestPath || !out) throw new Error('usage: --source <snapshot> --manifest <manifest> --out <json>');
const ROOT = process.cwd();
const absolute = (filename) => path.resolve(ROOT, filename);
const manifest = JSON.parse(fs.readFileSync(absolute(manifestPath), 'utf8'));
const reader = new AnvilReader(path.join(absolute(sourceRoot), 'region'));
const entityReader = new AnvilReader(path.join(absolute(sourceRoot), 'entities'));
const parse = (filename) => fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/).filter(Boolean).map((line) => {
  const terms = line.trim().split(/\s+/);
  if (terms.length !== 9 || terms[0] !== 'REPL') throw new Error(`invalid operation: ${line}`);
  return { point: { x: Number(terms[1]), y: Number(terms[2]), z: Number(terms[3]) }, from: terms[7], to: terms[8] };
});
const stateAt = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
const sourceChecks = [];
const inverseChecks = [];
const allForward = [];
for (const stage of manifest.stages) {
  const forward = parse(stage.forward);
  const rollback = parse(stage.rollback);
  const sourceFailures = [];
  for (const record of forward) {
    const actual = await stateAt(record.point);
    if (actual !== record.from) sourceFailures.push({ point: record.point, expected: record.from, actual });
  }
  sourceChecks.push({ id: stage.id, expected: stage.count, actual: forward.length - sourceFailures.length, failures: sourceFailures });
  const inverseFailures = [];
  const reverse = forward.slice().reverse();
  if (rollback.length !== reverse.length) inverseFailures.push({ kind: 'count', expected: reverse.length, actual: rollback.length });
  for (let index = 0; index < Math.min(reverse.length, rollback.length); index += 1) {
    const expected = reverse[index];
    const actual = rollback[index];
    if (cellKey(expected.point) !== cellKey(actual.point) || expected.from !== actual.to || expected.to !== actual.from) {
      inverseFailures.push({ kind: 'inverse', index, expected, actual });
    }
  }
  inverseChecks.push({ id: stage.id, expected: reverse.length, actual: rollback.length, failures: inverseFailures });
  allForward.push(...forward);
}
const targetKeys = allForward.map(({ point }) => cellKey(point));
const duplicateTargets = targetKeys.filter((key, index) => targetKeys.indexOf(key) !== index);
const haloRecords = manifest.gravity.preservedHalo.exactStates;
const haloFailures = [];
for (const record of haloRecords) {
  const actual = await stateAt(record.point);
  if (actual !== record.state) haloFailures.push({ point: record.point, expected: record.state, actual });
}
const water = manifest.waterPreservation;
const waterActual = await stateAt(water.point);
const capActual = await stateAt(water.capAbove.point);
const interaction = new Set([...targetKeys, ...haloRecords.map(({ point }) => cellKey(point))]);
const savedEntities = [];
for (const chunkKey of new Set([...interaction].map((key) => {
  const [x, , z] = key.split(',').map(Number);
  return `${Math.floor(x / 16)},${Math.floor(z / 16)}`;
}))) {
  const [x, z] = chunkKey.split(',').map(Number);
  const chunk = await entityReader.chunk(x, z);
  for (const entity of chunk?.Entities ?? []) {
    if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
    const [entityX, entityY, entityZ] = entity.Pos.map(Number);
    if (interaction.has(cellKey({ x: Math.floor(entityX), y: Math.floor(entityY), z: Math.floor(entityZ) }))) {
      savedEntities.push({ id: entity.id ?? entity.Id ?? null, position: [entityX, entityY, entityZ] });
    }
  }
}
const predecessor = manifest.ownership.predecessor;
const gravity = manifest.gravity.targetGravel;
const contract = {
  stages: manifest.stages[0]?.id === 'shell-gravity-lock-bottom-up' && manifest.stages[0]?.count === 560
    && manifest.stages[1]?.id === 'core-clear-top-down' && manifest.stages[1]?.count === 720,
  geometry: manifest.geometry.core.count === 720 && manifest.geometry.shell.surfaceCount === 616 && manifest.geometry.shell.mutableCount === 560,
  ownership: predecessor.preservationContract === '56/28/100/0/0' && predecessor.shellPds.count === 56
    && predecessor.haloPds.count === 28 && predecessor.haloInterface.count === 100 && predecessor.localPds.count === 0 && predecessor.pdsMigration.count === 0,
  targetGravel: gravity.core.length === 7 && gravity.shell.length === 7 && gravity.coreChains.length === 7 && gravity.shellChains.length === 7,
  chains: gravity.coreChains.every(({ safeAfterShellLock }) => safeAfterShellLock)
    && gravity.shellChains.every(({ sourceSafe }) => sourceSafe)
    && gravity.coreChains.filter(({ plannedShellLock }) => plannedShellLock).length === 1,
  halo: manifest.gravity.preservedHalo.count === 1064 && manifest.gravity.preservedHalo.gravelCount === 18 && haloRecords.length === 1064 && haloFailures.length === 0,
  water: waterActual === water.expected && capActual === water.capAbove.from && water.expected === 'minecraft:water[level=0]',
  savedEntities: savedEntities.length === 0 && manifest.interfaces.savedEntityCount === 0,
  civilOnly: manifest.civilOnly === true && manifest.routeCommissioned === false && manifest.passengerServiceCommissioned === false,
};
const contractFailures = Object.entries(contract).filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  schemaVersion: 1,
  id: 'rail-s3-r10-west-high-successor11-static-qa',
  status: sourceChecks.every(({ failures }) => failures.length === 0) && inverseChecks.every(({ failures }) => failures.length === 0)
    && duplicateTargets.length === 0 && contractFailures.length === 0 ? 'PASS' : 'FAIL',
  readOnly: true,
  sourceRoot,
  manifestPath,
  sourceChecks,
  inverseChecks,
  forwardTargetSet: { count: allForward.length, uniqueCount: new Set(targetKeys).size, coordinateSetSha256: hashCells(allForward.map(({ point }) => point)), duplicateTargets },
  haloPreservation: { expected: haloRecords.length, actual: haloRecords.length - haloFailures.length, failures: haloFailures },
  waterPreservation: { point: water.point, expected: water.expected, actual: waterActual, cap: { expected: water.capAbove.from, actual: capActual } },
  savedEntities,
  contract,
  contractFailures,
  manifestSha256: crypto.createHash('sha256').update(fs.readFileSync(absolute(manifestPath))).digest('hex'),
};
fs.mkdirSync(path.dirname(absolute(out)), { recursive: true });
fs.writeFileSync(absolute(out), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ status: result.status, source: sourceChecks.map(({ id, actual, expected }) => `${id}:${actual}/${expected}`),
  inverse: inverseChecks.map(({ id, actual, expected, failures }) => `${id}:${actual}/${expected}, failures=${failures.length}`),
  halo: `${result.haloPreservation.actual}/${result.haloPreservation.expected}`, water: result.waterPreservation,
  forwardTargets: `${result.forwardTargetSet.uniqueCount}/${result.forwardTargetSet.count}`, contractFailures }, null, 2));
