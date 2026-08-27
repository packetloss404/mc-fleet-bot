#!/usr/bin/env node
/** Independent read-only QA for the CZ-R11E sheep-preserving retry manifest. */

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
  'data/buildops/combined-zones-r11e-retry-c1-six-island-sheep-preserving-batch.release-manifest.json',
);
const OUT_PATH = value(
  '--out',
  'data/world-review/combined-zones-r11e-retry-offline-20260821T202500Z/r11e-retry-offline-qa.json',
);
const GENERATED_AT = value('--generated-at', '2026-08-21T20:25:00Z');
const EXPECTED = Object.freeze({
  transactionId: 'combined-zones-r11e-retry-c1-six-island-sheep-preserving-batch',
  sourceCompleteSaveSha256:
    'd53c3ff0039ce4b36a435dece8ede0002678a4fb34c6e00cbeb3e6ff0299e712',
  sourceRegionSha256:
    'af9e6bd1c5221a7612f0195e3cedbcccceaf1af4befe9715ceebde43574ce648',
  baseManifestSha256:
    'faef78985c8d7dbc55d673b66668194a744621eff508d8ecda15dc11d7c8e7bd',
  failedLedgerSha256:
    '7d0da4ded0d5eb0d33ec1f5fc088d1431718e59ac4def3296a7bf95e05f4068c',
  entityReportSha256:
    'e030bb9480b91e1e43af377520f0eafacddf01a84747f0c5cc2b7c90a787c125',
  targetCellCount: 1_593,
  targetCoordinateSetSha256:
    'bfa786a846c26649358b373aa01043a037b68f423f2627e3b5739b210db79042',
  omittedTargetCellCount: 2_389,
  packageCount: 10,
  islandCount: 6,
  sheepCount: 3,
});
const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11E retry offline QA rejected: ${message}`);
};
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
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
const { manifestIdentity, ...manifestPayload } = manifest;
invariant(manifestIdentity === sha256(JSON.stringify(manifestPayload))
  && manifest.transactionId === EXPECTED.transactionId
  && manifest.status.includes('SHEEP_PRESERVING_RETRY_AWAITING_FRESH_EXECUTION_KERNEL'),
'manifest payload identity, transaction, or status drifted');
invariant(manifest.source.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && manifest.source.sourceRegionSha256 === EXPECTED.sourceRegionSha256
  && manifest.source.baseManifestSha256 === EXPECTED.baseManifestSha256
  && manifest.source.prepareOnlyFailedLedgerSha256 === EXPECTED.failedLedgerSha256,
'retry source provenance drifted');
invariant(manifest.packages.length === EXPECTED.packageCount
  && manifest.executionOrder.forward.length === EXPECTED.packageCount
  && JSON.stringify(manifest.executionOrder.rollback)
    === JSON.stringify(manifest.executionOrder.forward.slice().reverse()),
'retry package ordering drifted');

const failedLedgerBytes = fs.readFileSync(absolute(manifest.source.prepareOnlyFailedLedgerPath));
const failedLedger = JSON.parse(failedLedgerBytes);
const entityEvidence = manifest.scope.omittedEntityInterfaceIslands[0].failedGateBlocker;
const entityReportBytes = fs.readFileSync(absolute(entityEvidence.entityReportPath));
const entityReport = JSON.parse(entityReportBytes);
invariant(sha256(failedLedgerBytes) === EXPECTED.failedLedgerSha256
  && failedLedger.status === 'BLOCKED_BY_SCOPE_LOCAL_SAFETY_KERNEL'
  && !failedLedger.stages.some(({ stage }) => stage.startsWith('forward-execution:')),
'prepare-only ledger no longer proves zero execution');
invariant(sha256(entityReportBytes) === EXPECTED.entityReportSha256
  && entityReport.status === 'FAIL'
  && entityReport.totals.blockingEntityHits === 1,
'failed entity evidence drifted');
const reportByFile = new Map(entityReport.packages.map((pkg) => [pkg.file, pkg]));

const reader = new AnvilReader(absolute(path.join(manifest.source.snapshotRoot, 'region')));
const sourceCache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!sourceCache.has(key)) sourceCache.set(key, stateToCommandString(
    await reader.blockState(cell.x, cell.y, cell.z),
  ));
  return sourceCache.get(key);
};
const union = [];
const unionKeys = new Set();
const packageReports = [];
let sourceMismatchCount = 0;
let inverseCount = 0;
for (const pkg of manifest.packages) {
  const operation = manifest.operations[pkg.key];
  const forward = parseOperations(pkg.forward);
  const rollback = parseOperations(pkg.rollback);
  const gate = reportByFile.get(pkg.forward);
  invariant(operation.island !== 'island-1142-1183'
    && forward.length === operation.targetCellCount
    && rollback.length === forward.length
    && bodySha256(pkg.forward) === operation.forwardSha256
    && bodySha256(pkg.rollback) === operation.rollbackSha256,
  `${pkg.key} identity or sheep-island exclusion failed`);
  invariant(gate?.passed === true && gate.blockers.length === 0
    && gate.operationSha256 === sha256(fs.readFileSync(absolute(pkg.forward))),
  `${pkg.key} is not bound to passing failed-attempt live clearance`);
  for (let index = 0; index < forward.length; index += 1) {
    const record = forward[index];
    const inverse = rollback[rollback.length - index - 1];
    invariant(cellKey(record.cell) === cellKey(inverse.cell)
      && record.sourceState === inverse.targetState
      && record.targetState === inverse.sourceState,
    `${pkg.key} rollback is not reverse exact at ${index}`);
    inverseCount += 1;
    if (await sourceAt(record.cell) !== record.sourceState) sourceMismatchCount += 1;
    invariant(!unionKeys.has(cellKey(record.cell)),
      `cross-package target overlap at ${cellKey(record.cell)}`);
    unionKeys.add(cellKey(record.cell));
    union.push({ ...record, island: operation.island, packageKey: pkg.key });
  }
  packageReports.push({
    key: pkg.key,
    island: operation.island,
    targetCellCount: forward.length,
    sourceStateMatchCount: forward.length,
    reverseExactInverse: true,
    failedAttemptLiveEntityGatePassed: true,
  });
}
invariant(sourceMismatchCount === 0 && inverseCount === EXPECTED.targetCellCount
  && union.length === EXPECTED.targetCellCount
  && hashCells(union.map(({ cell }) => cell))
    === EXPECTED.targetCoordinateSetSha256,
'source guards, inverse count, or operated-union identity failed');

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
    && hashCells(fullHeadroom)
      === island.geometry.fullTwoBlockHeadroom.coordinateSetSha256,
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
  && !islandReports.some(({ key }) => key === 'island-1142-1183'),
'included island partition drifted');

const omitted = manifest.scope.omittedEntityInterfaceIslands;
invariant(omitted.length === 1 && omitted[0].key === 'island-1142-1183'
  && omitted[0].omittedTargetCellCount === EXPECTED.omittedTargetCellCount
  && omitted[0].protectedSheep.length === EXPECTED.sheepCount
  && omitted[0].omittedPackageKeys.length === 2
  && omitted[0].disposition
    === 'PRESERVED_UNTOUCHED_UNFENCED_ROAMING_SHEEP_INTERFACE_NO_OPERATION_PACKAGE',
'full sheep-island omission contract drifted');
const protectedSheepIds = new Set(
  omitted[0].protectedSheep.map(({ uuidIntArray }) => JSON.stringify(uuidIntArray)),
);
invariant(protectedSheepIds.size === EXPECTED.sheepCount
  && manifest.isolation.minimumProtectedSheepToSelectedTargetDistance > 40
  && manifest.isolation.selectedPackageFailedGatePassCount === EXPECTED.packageCount,
'protected sheep identity or spatial reserve drifted');
invariant(manifest.scope.excludedAtGradeRanges.length === 2
  && manifest.scope.excludedAtGradeRanges.every(
    ({ disposition }) => disposition === 'PRESERVED_UNTOUCHED_LOCAL_HOLDOUT_NO_OPERATION_PACKAGE',
  )
  && manifest.scope.heldTreatmentMutationCount === 0
  && manifest.scope.corridorConnectivityClaimed === false,
'wet holdouts, treatment holds, or no-connectivity boundary drifted');

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS',
  mode: 'OFFLINE_READ_ONLY_SHEEP_PRESERVING_RETRY',
  manifest: {
    path: MANIFEST_PATH,
    sha256: sha256(manifestBytes),
    manifestIdentitySha256: manifestIdentity,
  },
  source: {
    snapshotRoot: manifest.source.snapshotRoot,
    completeSaveSha256: manifest.source.completeSaveSha256,
    regionSha256: manifest.source.sourceRegionSha256,
    prepareOnlyFailedLedgerSha256: manifest.source.prepareOnlyFailedLedgerSha256,
    failedEntityReportSha256: EXPECTED.entityReportSha256,
  },
  checks: {
    reusedFrozenPackageCount: packageReports.length,
    includedIslandCount: islandReports.length,
    exactSourceGuardMatchCount: union.length - sourceMismatchCount,
    exactInverseRecordCount: inverseCount,
    uniqueTargetCellCount: union.length,
    omittedSheepIslandCount: omitted.length,
    omittedSheepIslandTargetCellCount: omitted[0].omittedTargetCellCount,
    protectedSheepCount: protectedSheepIds.size,
    selectedPackageFailedGatePassCount:
      manifest.isolation.selectedPackageFailedGatePassCount,
    forwardExecutionStageCountInFailedLedger: 0,
    excludedWetRangeCount: manifest.scope.excludedAtGradeRanges.length,
    heldTreatmentMutationCount: 0,
    corridorConnectivityClaimed: false,
    liveCallsPerformed: false,
    worldEditsPerformed: false,
  },
  packages: packageReports,
  islands: islandReports,
  identities: {
    operatedUnion: classManifest(union.map(({ cell }) => cell)),
  },
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
