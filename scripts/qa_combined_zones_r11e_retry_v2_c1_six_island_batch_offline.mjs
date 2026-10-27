#!/usr/bin/env node
/** Independent read-only QA for CZ-R11E retry-v2. */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import {
  AnvilReader,
  cellKey,
  hashCells,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';
import {
  blockName,
  classManifest,
  connectedComponents,
} from './lib/combined_zones_c1_at_grade_island_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r11e-retry-v2-c1-six-island-natural-transition-rebound-batch.release-manifest.json',
);
const OUT_PATH = value(
  '--out',
  'data/world-review/combined-zones-r11e-retry-v2-offline-20260821T233000Z/r11e-retry-v2-offline-qa.json',
);
const GENERATED_AT = value('--generated-at', '2026-08-21T23:30:00Z');
const EXPECTED = Object.freeze({
  transactionId:
    'combined-zones-r11e-retry-v2-c1-six-island-natural-transition-rebound-batch',
  sourceCompleteSaveSha256: '9b98157a895d29614a05d50fbdc4170ff184d7c22f2e5018aa8dec5604c35930',
  sourceRegionSha256: '56e84a0442f1fca276c6b2b7882bd7e3f9900efb3fe7fd1c2f1a5f69a57b0f61',
  v1ManifestSha256: '5b51b90ba542c9584d4e4a77fbc32d891a5d82970df2a9444187af72aa781aa9',
  failedRetryLedgerSha256: 'f520aa966e064901062d034f8a89d08ec1c9c5bf30765580c354eb7aa19acadb',
  recoveryAcceptanceSha256: '64d7e6b4b4894d50820336453c428f068c3527714a0da16b95d07e0a3a01f5dd',
  recoveryAcceptanceIdentity: '4c43f50ae5c85723c0e2f0d8ad490df1549d29c157185b9bcc3907aab7cd958e',
  targetCellCount: 1_593,
  targetCoordinateSetSha256: 'bfa786a846c26649358b373aa01043a037b68f423f2627e3b5739b210db79042',
  packageCount: 10,
  islandCount: 6,
});
const REBOUND_KEY = '968,102,27';
const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11E retry-v2 offline QA rejected: ${message}`);
};
const bodySha256 = (filename) => sha256(`${fs.readFileSync(absolute(filename), 'utf8')
  .split(/\r?\n/).filter((line) => line && !line.startsWith('#')).join('\n')}\n`);

function parseOperations(filename) {
  const records = [];
  const seen = new Set();
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} has an unsupported operation`);
    const from = fields.slice(1, 4).map(Number);
    const to = fields.slice(4, 7).map(Number);
    invariant(from.every((coordinate, index) => coordinate === to[index]),
      `${filename} has a non-point operation`);
    const cell = { x: from[0], y: from[1], z: from[2] };
    invariant(!seen.has(cellKey(cell)), `${filename} duplicates ${cellKey(cell)}`);
    seen.add(cellKey(cell));
    records.push({ cell, sourceState: fields[7], targetState: fields[8] });
  }
  return records;
}

const manifestBytes = fs.readFileSync(absolute(MANIFEST_PATH));
const manifest = JSON.parse(manifestBytes);
const { manifestIdentity, ...payload } = manifest;
invariant(manifestIdentity === sha256(JSON.stringify(payload))
  && manifest.transactionId === EXPECTED.transactionId
  && manifest.status.includes('NATURAL_TRANSITION_REBOUND_AWAITING_FRESH_EXECUTION_KERNEL'),
'manifest identity, transaction, or state drifted');
invariant(manifest.source.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && manifest.source.sourceRegionSha256 === EXPECTED.sourceRegionSha256
  && manifest.source.v1ManifestSha256 === EXPECTED.v1ManifestSha256
  && manifest.source.failedRetryLedgerSha256 === EXPECTED.failedRetryLedgerSha256
  && manifest.source.acceptedRecoveryEvidenceSha256 === EXPECTED.recoveryAcceptanceSha256,
'source/recovery provenance drifted');
const acceptanceBytes = fs.readFileSync(absolute(manifest.source.acceptedRecoveryEvidencePath));
const acceptance = JSON.parse(acceptanceBytes);
invariant(sha256(acceptanceBytes) === EXPECTED.recoveryAcceptanceSha256
  && acceptance.recoveryAcceptanceIdentitySha256 === EXPECTED.recoveryAcceptanceIdentity
  && acceptance.acceptance.physicalRecoveryAccepted === true
  && acceptance.acceptance.operationResidualCount === 0,
'recovery acceptance evidence drifted');
const v1 = JSON.parse(fs.readFileSync(absolute(manifest.source.v1ManifestPath), 'utf8'));
invariant(manifest.packages.length === EXPECTED.packageCount
  && manifest.executionOrder.forward.length === EXPECTED.packageCount
  && JSON.stringify(manifest.executionOrder.rollback)
    === JSON.stringify(manifest.executionOrder.forward.slice().reverse()),
'package ordering drifted');

const reader = new AnvilReader(absolute(path.join(manifest.source.snapshotRoot, 'region')));
const sourceCache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!sourceCache.has(key)) sourceCache.set(key, stateToCommandString(
    await reader.blockState(cell.x, cell.y, cell.z),
  ));
  return sourceCache.get(key);
};
const v1Packages = new Map(v1.packages.map((pkg) => [pkg.key, pkg]));
const union = [];
const unionKeys = new Set();
const packageReports = [];
let exactInverseRecordCount = 0;
let v1ForwardRecordDifferenceCount = 0;
let v1RollbackRecordDifferenceCount = 0;
for (const pkg of manifest.packages) {
  invariant(pkg.forward.includes('r11e-retry-v2-')
    && pkg.rollback.includes('r11e-retry-v2-'),
  `${pkg.key} does not use distinct retry-v2 paths`);
  const operation = manifest.operations[pkg.key];
  const forward = parseOperations(pkg.forward);
  const rollback = parseOperations(pkg.rollback);
  const v1Package = v1Packages.get(pkg.key);
  const v1Forward = parseOperations(v1Package.forward);
  const v1Rollback = parseOperations(v1Package.rollback);
  invariant(forward.length === operation.targetCellCount
    && rollback.length === forward.length
    && bodySha256(pkg.forward) === operation.forwardSha256
    && bodySha256(pkg.rollback) === operation.rollbackSha256,
  `${pkg.key} operation identity drifted`);
  for (let index = 0; index < forward.length; index += 1) {
    const record = forward[index];
    const inverse = rollback[rollback.length - index - 1];
    invariant(cellKey(record.cell) === cellKey(inverse.cell)
      && record.sourceState === inverse.targetState
      && record.targetState === inverse.sourceState,
    `${pkg.key} rollback is not reverse exact at ${index}`);
    exactInverseRecordCount += 1;
    invariant(await sourceAt(record.cell) === record.sourceState,
      `${pkg.key} source guard drifted at ${cellKey(record.cell)}`);
    invariant(!unionKeys.has(cellKey(record.cell)),
      `cross-package target overlap at ${cellKey(record.cell)}`);
    unionKeys.add(cellKey(record.cell));
    union.push({ ...record, island: operation.island, packageKey: pkg.key });
    if (JSON.stringify(record) !== JSON.stringify(v1Forward[index])) {
      invariant(pkg.key === 'c1-island-564-569-pavement'
        && cellKey(record.cell) === REBOUND_KEY
        && v1Forward[index].sourceState === 'minecraft:dirt'
        && record.sourceState === 'minecraft:grass_block[snowy=false]'
        && record.targetState === v1Forward[index].targetState,
      `${pkg.key} has an undeclared v1 forward difference at ${index}`);
      v1ForwardRecordDifferenceCount += 1;
    }
  }
  for (let index = 0; index < rollback.length; index += 1) {
    if (JSON.stringify(rollback[index]) !== JSON.stringify(v1Rollback[index])) {
      invariant(pkg.key === 'c1-island-564-569-pavement'
        && cellKey(rollback[index].cell) === REBOUND_KEY
        && v1Rollback[index].targetState === 'minecraft:dirt'
        && rollback[index].targetState === 'minecraft:grass_block[snowy=false]'
        && rollback[index].sourceState === v1Rollback[index].sourceState,
      `${pkg.key} has an undeclared v1 rollback difference at ${index}`);
      v1RollbackRecordDifferenceCount += 1;
    }
  }
  packageReports.push({
    key: pkg.key,
    island: operation.island,
    targetCellCount: forward.length,
    exactSourceGuardMatchCount: forward.length,
    reverseExactInverse: true,
    sourceReboundFromAcceptedRecovery: operation.sourceReboundFromAcceptedRecovery,
  });
}
invariant(union.length === EXPECTED.targetCellCount
  && exactInverseRecordCount === EXPECTED.targetCellCount
  && hashCells(union.map(({ cell }) => cell)) === EXPECTED.targetCoordinateSetSha256
  && v1ForwardRecordDifferenceCount === 1
  && v1RollbackRecordDifferenceCount === 1,
'union/inverse identity or narrow v1 delta failed');

const surfaceNames = new Set([
  'minecraft:gray_concrete', 'minecraft:smooth_stone', 'minecraft:yellow_concrete',
]);
const islandReports = [];
for (const island of manifest.scope.includedIslands) {
  const records = union.filter((record) => record.island === island.key);
  const surface = records.filter(({ targetState }) => surfaceNames.has(blockName(targetState)));
  const fullHeadroom = uniqueCells(surface.flatMap(({ cell }) => [
    { x: cell.x, y: cell.y + 1, z: cell.z },
    { x: cell.x, y: cell.y + 2, z: cell.z },
  ]));
  invariant(surface.length === island.geometry.pavementSurface.cellCount
    && hashCells(surface.map(({ cell }) => cell))
      === island.geometry.pavementSurface.coordinateSetSha256
    && connectedComponents(surface.map(({ cell }) => cell)).length === 1
    && fullHeadroom.length === island.geometry.fullTwoBlockHeadroom.cellCount
    && hashCells(fullHeadroom) === island.geometry.fullTwoBlockHeadroom.coordinateSetSha256,
  `${island.key} geometry/headroom identity failed`);
  islandReports.push({
    key: island.key,
    stations: island.stations,
    targetCellCount: records.length,
    surfaceCellCount: surface.length,
    surfaceComponentCount: 1,
    fullHeadroomCellCount: fullHeadroom.length,
    routeCommissioned: false,
  });
}
invariant(islandReports.length === EXPECTED.islandCount
  && !islandReports.some(({ key }) => key === 'island-1142-1183')
  && manifest.scope.omittedEntityInterfaceIslands.length === 1
  && manifest.scope.omittedEntityInterfaceIslands[0].protectedSheep.length === 3
  && manifest.scope.excludedAtGradeRanges.length === 2
  && manifest.scope.heldTreatmentMutationCount === 0
  && manifest.scope.corridorConnectivityClaimed === false,
'island/sheep/hold boundary drifted');

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS',
  mode: 'OFFLINE_READ_ONLY_ACCEPTED_RECOVERY_REBOUND_RETRY_V2',
  manifest: {
    path: MANIFEST_PATH,
    sha256: sha256(manifestBytes),
    manifestIdentitySha256: manifestIdentity,
  },
  source: {
    snapshotRoot: manifest.source.snapshotRoot,
    completeSaveSha256: manifest.source.completeSaveSha256,
    regionSha256: manifest.source.sourceRegionSha256,
    recoveryAcceptanceSha256: manifest.source.acceptedRecoveryEvidenceSha256,
    failedRetryLedgerSha256: manifest.source.failedRetryLedgerSha256,
  },
  checks: {
    packageCount: packageReports.length,
    distinctOperationFileCount: packageReports.length * 2,
    includedIslandCount: islandReports.length,
    exactSourceGuardMatchCount: union.length,
    exactInverseRecordCount,
    uniqueTargetCellCount: union.length,
    v1ForwardRecordDifferenceCount,
    v1RollbackRecordDifferenceCount,
    sourceReboundTargetCount: 1,
    acceptedRecoveryOperationResidualCount: acceptance.acceptance.operationResidualCount,
    omittedSheepIslandCount: manifest.scope.omittedEntityInterfaceIslands.length,
    protectedSheepCount: 3,
    excludedWetRangeCount: manifest.scope.excludedAtGradeRanges.length,
    heldTreatmentMutationCount: 0,
    corridorConnectivityClaimed: false,
    liveCallsPerformed: false,
    worldEditsPerformed: false,
  },
  packages: packageReports,
  islands: islandReports,
  identities: { operatedUnion: classManifest(union.map(({ cell }) => cell)) },
};
const qaPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, qaPayloadSha256 };
fs.mkdirSync(path.dirname(absolute(OUT_PATH)), { recursive: true });
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  status: report.status,
  report: OUT_PATH,
  qaPayloadSha256,
  checks: report.checks,
}, null, 2));
