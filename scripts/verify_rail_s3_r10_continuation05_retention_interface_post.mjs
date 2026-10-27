#!/usr/bin/env node
/** Post-release enforcement of continuation-05's exact retention interface contract. */
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const value = (flag, fallback = '') => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const sourceRoot = value('--source');
const postRoot = value('--post');
const contractPath = value('--contract');
const retentionManifestPath = value('--retention-manifest', 'data/buildops/rail-s3-r10-upper-continuation-05-retention-01.manifest.json');
const out = value('--out');
if (!sourceRoot || !postRoot || !contractPath || !out) throw new Error('usage: --source <root> --post <root> --contract <json> --out <json> [--retention-manifest <json>]');
const root = process.cwd();
const contract = JSON.parse(fs.readFileSync(path.resolve(root, contractPath), 'utf8'));
const retention = JSON.parse(fs.readFileSync(path.resolve(root, retentionManifestPath), 'utf8'));
const source = new AnvilReader(path.resolve(root, sourceRoot, 'region'));
const post = new AnvilReader(path.resolve(root, postRoot, 'region'));
const state = async (reader, point) => stateToCommandString(await reader.blockState(point.x, point.y, point.z));
const parseOps = (filename) => fs.readFileSync(path.resolve(root, filename), 'utf8').trim().split(/\r?\n/).filter(Boolean).map((line, index) => {
  const fields = line.split(/\s+/);
  if (fields.length !== 9 || fields[0] !== 'REPL') throw new Error(`${filename}:${index + 1}: malformed guarded operation`);
  return { point: { x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]) }, from: fields[7], to: fields[8] };
});
const stage = (id) => parseOps(retention.stages.find((entry) => entry.id === id).forward);
const fixed = [...stage('transfer'), ...stage('shell'), ...stage('original-pocket-liner')];
const continuation = new Map(parseOps(contract.continuation.forwardPath).map((operation) => [cellKey(operation.point), operation]));
const fixedResults = await Promise.all(fixed.map(async (operation) => ({ point: operation.point, expected: operation.to, source: await state(source, operation.point), post: await state(post, operation.point), continuationTargeted: continuation.has(cellKey(operation.point)) })));
const fixedFailures = fixedResults.filter(({ expected, source: sourceState, post: postState, continuationTargeted }) => sourceState !== expected || postState !== expected || continuationTargeted);
const haloByKey = new Map(retention.gravityTopology.preservedHalo.records.map((entry) => [cellKey(entry.point), entry]));
const migrationResults = await Promise.all(contract.reviewedMigration.map(async ({ point, from, to }) => ({ point, expectedSource: from, expectedPost: to, source: await state(source, point), post: await state(post, point) })));
const migrationFailures = migrationResults.filter(({ expectedSource, expectedPost, source: sourceState, post: postState }) => sourceState !== expectedSource || postState !== expectedPost);
const migrationKeys = new Set(contract.reviewedMigration.map(({ point }) => cellKey(point)));
const unchangedHalo = retention.gravityTopology.preservedHalo.records.filter(({ point }) => !migrationKeys.has(cellKey(point)));
const haloResults = await Promise.all(unchangedHalo.map(async ({ point, source: expected }) => ({ point, expected, source: await state(source, point), post: await state(post, point) })));
const haloFailures = haloResults.filter(({ expected, source: sourceState, post: postState }) => sourceState !== expected || postState !== expected);
const contractMissingHalo = contract.reviewedMigration.filter(({ point }) => !haloByKey.has(cellKey(point)));
const report = {
  schemaVersion: 1,
  id: 'rail-s3-r10-continuation05-retention-interface-post-qa',
  sourceRoot,
  postRoot,
  contractPath,
  retentionManifestPath,
  status: fixedFailures.length === 0 && migrationFailures.length === 0 && haloFailures.length === 0 && contractMissingHalo.length === 0 ? 'PASS' : 'FAIL',
  fixedRetention: { expected: 184, actual: fixedResults.length, failures: fixedFailures },
  reviewedHaloMigration: { expected: 15, actual: migrationResults.length, failures: migrationFailures },
  preservedHalo: { expected: 259, actual: haloResults.length, failures: haloFailures },
  contractMissingHalo,
  routeCommissioned: false,
  passengerServiceCommissioned: false,
  readOnly: true,
};
fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true });
fs.writeFileSync(path.resolve(root, out), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: report.status, fixedRetention: `${fixedResults.length - fixedFailures.length}/${fixedResults.length}`, retainedWaterAndLiner: 'included in fixedRetention', migratedHalo: `${migrationResults.length - migrationFailures.length}/${migrationResults.length}`, preservedHalo: `${haloResults.length - haloFailures.length}/${haloResults.length}` }, null, 2)}\n`);
if (report.status !== 'PASS') process.exitCode = 2;
