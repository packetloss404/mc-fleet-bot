#!/usr/bin/env node
/** Exact ownership/migration gate from retention-01 to continuation-05. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const value = (flag, fallback = '') => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const snapshot = value('--snapshot');
const forwardPath = value('--forward', 'data/buildops/rail-s3-r10-upper-continuation-06.forward.txt');
const rollbackPath = value('--rollback', 'data/buildops/rail-s3-r10-upper-continuation-06.rollback.txt');
const retentionManifestPath = value('--retention-manifest', 'data/buildops/rail-s3-r10-upper-continuation-05-retention-01.manifest.json');
const out = value('--out');
if (!snapshot || !out) throw new Error('usage: --snapshot <post-root> --out <json> [--forward <ops>] [--rollback <ops>] [--retention-manifest <json>]');
const root = process.cwd();
const parse = (filename) => fs.readFileSync(path.resolve(root, filename), 'utf8').trim().split(/\r?\n/).filter(Boolean).map((line, index) => {
  const fields = line.split(/\s+/);
  if (fields.length !== 9 || fields[0] !== 'REPL') throw new Error(`${filename}:${index + 1}: malformed operation`);
  const [x1, y1, z1, x2, y2, z2] = fields.slice(1, 7).map(Number);
  if (x1 !== x2 || y1 !== y2 || z1 !== z2) throw new Error(`${filename}:${index + 1}: non-singleton target`);
  return { line: index + 1, point: { x: x1, y: y1, z: z1 }, from: fields[7], to: fields[8] };
});
const forward = parse(forwardPath);
const rollback = parse(rollbackPath);
const retention = JSON.parse(fs.readFileSync(path.resolve(root, retentionManifestPath), 'utf8'));
const forwardByKey = new Map(forward.map((operation) => [cellKey(operation.point), operation]));
if (forwardByKey.size !== forward.length) throw new Error('continuation forward contains duplicate targets');
const reader = new AnvilReader(path.resolve(root, snapshot, 'region'));
const state = async (point) => stateToCommandString(await reader.blockState(point.x, point.y, point.z));
const parseStageTargets = (id) => parse(retention.stages.find((stage) => stage.id === id).forward);
const retained = parseStageTargets('transfer').map(({ point, to }) => ({ point, expected: to }));
const shell = parseStageTargets('shell').map(({ point, to }) => ({ point, expected: to }));
const liner = parseStageTargets('original-pocket-liner').map(({ point, to }) => ({ point, expected: to }));
const fixedRetention = [...retained, ...shell, ...liner];
const fixedRetentionHits = fixedRetention.filter(({ point }) => forwardByKey.has(cellKey(point)));
if (fixedRetentionHits.length !== 0) throw new Error(`continuation targets protected retained-water/shell/liner cells (${fixedRetentionHits.length})`);
const sourceFailures = [];
for (const { point, expected } of fixedRetention) {
  const observed = await state(point);
  if (observed !== expected) sourceFailures.push({ point, expected, observed });
}
if (sourceFailures.length !== 0) throw new Error(`retention post-state drifted at ${sourceFailures.length} protected cells`);
const halo = retention.gravityTopology.preservedHalo.records;
const haloChanges = halo.map(({ point, source }) => ({ point, source, operation: forwardByKey.get(cellKey(point)) })).filter(({ operation }) => operation);
const unchangedHalo = halo.filter(({ point }) => !forwardByKey.has(cellKey(point)));
const allowedRoles = new Set(['minecraft:polished_deepslate', 'minecraft:air']);
for (const { point, source, operation } of haloChanges) {
  if (operation.from !== source) throw new Error(`halo source guard does not bind retention state at ${cellKey(point)}`);
  if (!allowedRoles.has(operation.to)) throw new Error(`unreviewed halo destination at ${cellKey(point)}=${operation.to}`);
}
const expectedHaloMigrationHash = '527836ebf541f798bcbb63659dca95915ee7a71e35534cbd13c90cae6fad88ad';
if (haloChanges.length !== 15) throw new Error(`expected 15 retention-halo migrations, found ${haloChanges.length}`);
if (hashCells(haloChanges.map(({ point }) => point)) !== expectedHaloMigrationHash) throw new Error('retention-halo migration coordinate set drifted');
const pdsLast = Math.max(...forward.filter(({ to }) => to === 'minecraft:polished_deepslate').map(({ line }) => line));
const airFirst = Math.min(...forward.filter(({ to }) => to === 'minecraft:air').map(({ line }) => line));
if (!(pdsLast < airFirst)) throw new Error('continuation forward does not place all liner/shell PDS before clearing interior air');
const rollbackByKey = new Map(rollback.map((operation) => [cellKey(operation.point), operation]));
if (rollbackByKey.size !== rollback.length || rollback.length !== forward.length) throw new Error('continuation rollback cardinality/targets do not exactly invert forward');
for (const operation of forward) {
  const inverse = rollbackByKey.get(cellKey(operation.point));
  if (!inverse || inverse.from !== operation.to || inverse.to !== operation.from) throw new Error(`missing exact inverse for ${cellKey(operation.point)}`);
}
const contract = {
  schemaVersion: 1,
  id: 'rail-s3-r10-continuation05-retention01-interface-contract',
  status: 'PASS_EXACT_REVIEWED_RETENTION_INTERFACE_MIGRATION',
  snapshot,
  continuation: { forwardPath, rollbackPath, targetCount: forward.length, forwardOrder: { allPdsBeforeAir: true, pdsLastLine: pdsLast, airFirstLine: airFirst }, exactInverse: true },
  retentionOwnership: {
    retainedWater: { owner: 'RAIL-S3-R10-CONTINUATION-05-RETENTION-01', count: retained.length, coordinateSetSha256: hashCells(retained.map(({ point }) => point)), continuationTargetCount: 0 },
    shell: { owner: 'RAIL-S3-R10-CONTINUATION-05-RETENTION-01', count: shell.length, coordinateSetSha256: hashCells(shell.map(({ point }) => point)), continuationTargetCount: 0 },
    originalLiner: { owner: 'RAIL-S3-R10-CONTINUATION-05-RETENTION-01', count: liner.length, coordinateSetSha256: hashCells(liner.map(({ point }) => point)), continuationTargetCount: 0 },
    halo: { previousOwner: 'RAIL-S3-R10-CONTINUATION-05-RETENTION-01', count: halo.length, sourceCoordinateSetSha256: hashCells(halo.map(({ point }) => point)), unchangedCount: unchangedHalo.length, migratedCount: haloChanges.length, migratedCoordinateSetSha256: expectedHaloMigrationHash },
  },
  reviewedMigration: haloChanges.map(({ point, source, operation }) => ({ point, from: source, to: operation.to, forwardLine: operation.line, rollbackLine: rollbackByKey.get(cellKey(point)).line, newOwner: 'RAIL-S3-R10-UPPER-CONTINUATION-05' })),
  postQaContract: { fixedRetentionCellsMustRemainExact: fixedRetention.length, unchangedHaloCellsMustRemainSourceExact: unchangedHalo.length, reviewedHaloMigrationsMustMatchContinuationTargets: haloChanges.length },
  routeCommissioned: false,
  passengerServiceCommissioned: false,
  readOnly: true,
};
contract.sha256 = crypto.createHash('sha256').update(JSON.stringify(contract)).digest('hex');
fs.mkdirSync(path.dirname(path.resolve(root, out)), { recursive: true });
fs.writeFileSync(path.resolve(root, out), `${JSON.stringify(contract, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: contract.status, fixedRetention: fixedRetention.length, unchangedHalo: unchangedHalo.length, migrations: contract.reviewedMigration.length, migrationHash: expectedHaloMigrationHash, allPdsBeforeAir: true }, null, 2)}\n`);
