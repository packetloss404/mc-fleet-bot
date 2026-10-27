#!/usr/bin/env node
/**
 * Compile the CZ-R11E sheep-preserving retry as a strict subset of the frozen
 * R11E package set. The unfenced 1142..1183 island is omitted in full. The
 * retained operation files are reused byte-for-byte; this compiler emits only
 * a distinct retry manifest and performs no live call or world mutation.
 */

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
import { census, classManifest } from './lib/combined_zones_c1_at_grade_island_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-21T20:20:00Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = 'combined-zones-r11e-retry-c1-six-island-sheep-preserving-batch';
const RELEASE_ID = 'CZ-R11E-RETRY-C1-SIX-ISLAND-SHEEP-PRESERVING-BATCH';
const BASE_MANIFEST =
  'data/buildops/combined-zones-r11e-c1-disjoint-at-grade-islands-batch.release-manifest.json';
const FAILED_LEDGER =
  'data/world-review/combined-zones-r11e-live-20260821T200417Z/evidence-ledger.json';
const ENTITY_REPORT =
  'data/world-review/combined-zones-r11e-live-20260821T200417Z/live-entity-clearance.json';
const SOURCE_ROOT = 'data/worldsnap-combined-zones-r11e-source-20260821T200417Z';
const SOURCE_INTAKE =
  'data/world-review/combined-zones-r11e-live-20260821T200417Z/source-complete-save-intake.json';
const SOURCE_IDENTITY =
  'data/world-review/combined-zones-r11e-live-20260821T200417Z/source-snapshot-identity.json';
const OMITTED_ISLAND = 'island-1142-1183';
const EXPECTED = Object.freeze({
  baseManifestSha256:
    'faef78985c8d7dbc55d673b66668194a744621eff508d8ecda15dc11d7c8e7bd',
  baseManifestIdentity:
    '229702a92476603c0c6fbaeee5e40a54d17dbaa1d4923285c5600ec83c346dc4',
  failedLedgerSha256:
    '7d0da4ded0d5eb0d33ec1f5fc088d1431718e59ac4def3296a7bf95e05f4068c',
  entityReportSha256:
    'e030bb9480b91e1e43af377520f0eafacddf01a84747f0c5cc2b7c90a787c125',
  sourceIntakeSha256:
    '6293e9435d13f8708ce5945d61fa90e8e3846a21c01b47aa2c3d5e702b6a7df9',
  sourceIdentityReportSha256:
    '7c91b51f5d988f69d0fda5d96b0d08308bcce1e2dbae2f78ba6153c23be31a01',
  sourceCompleteSaveSha256:
    'd53c3ff0039ce4b36a435dece8ede0002678a4fb34c6e00cbeb3e6ff0299e712',
  sourceRegionSha256:
    'af9e6bd1c5221a7612f0195e3cedbcccceaf1af4befe9715ceebde43574ce648',
  failedSourceBoundReleaseIdentity:
    'f57b3d5f08c1501107586152f9dc5130914fd0a8f4e7b920955e7a7bfb9ac3fe',
  selectedPackageCount: 10,
  selectedIslandCount: 6,
  selectedTargetCellCount: 1_593,
  selectedTargetCoordinateSetSha256:
    'bfa786a846c26649358b373aa01043a037b68f423f2627e3b5739b210db79042',
  omittedTargetCellCount: 2_389,
  sheepCount: 3,
});
const EXPECTED_SHEEP = [
  {
    uuid: [1496235148, -1770305554, -1201538028, 1794848976],
    position: [1518, 67, -205],
  },
  {
    uuid: [-587917749, -1578941616, -1231346047, -1174324334],
    position: [1515.4295221503648, 67, -205.19507214943735],
  },
  {
    uuid: [-800716013, 1708605796, -1711767836, -294245824],
    position: [1516.5143123259859, 67, -207.91929461076433],
  },
];

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const samePath = (left, right) => absolute(left) === absolute(right);
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11E sheep-preserving retry rejected: ${message}`);
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
      `${filename} contains an unsupported operation`);
    const from = fields.slice(1, 4).map(Number);
    const to = fields.slice(4, 7).map(Number);
    invariant(from.every((coordinate, index) => coordinate === to[index]),
      `${filename} contains a non-point target`);
    const cell = { x: from[0], y: from[1], z: from[2] };
    invariant(!seen.has(cellKey(cell)), `${filename} duplicates ${cellKey(cell)}`);
    seen.add(cellKey(cell));
    records.push({ cell, sourceState: fields[7], targetState: fields[8] });
  }
  return records;
}

const baseManifestBytes = fs.readFileSync(absolute(BASE_MANIFEST));
const failedLedgerBytes = fs.readFileSync(absolute(FAILED_LEDGER));
const entityReportBytes = fs.readFileSync(absolute(ENTITY_REPORT));
const sourceIntakeBytes = fs.readFileSync(absolute(SOURCE_INTAKE));
const sourceIdentityBytes = fs.readFileSync(absolute(SOURCE_IDENTITY));
const base = JSON.parse(baseManifestBytes);
const failedLedger = JSON.parse(failedLedgerBytes);
const entityReport = JSON.parse(entityReportBytes);
const sourceIntake = JSON.parse(sourceIntakeBytes);
const sourceIdentity = JSON.parse(sourceIdentityBytes);

invariant(sha256(baseManifestBytes) === EXPECTED.baseManifestSha256
  && base.manifestIdentity === EXPECTED.baseManifestIdentity,
'frozen base manifest identity drifted');
invariant(sha256(failedLedgerBytes) === EXPECTED.failedLedgerSha256
  && failedLedger.status === 'BLOCKED_BY_SCOPE_LOCAL_SAFETY_KERNEL'
  && failedLedger.transactionId === base.transactionId
  && failedLedger.sourceBoundReleaseIdentitySha256
    === EXPECTED.failedSourceBoundReleaseIdentity
  && failedLedger.stages.length === 55
  && !failedLedger.stages.some(({ stage }) => stage.startsWith('forward-execution:')),
'failed wrapper ledger is not the prepare-only entity-gate stop');
invariant(sha256(entityReportBytes) === EXPECTED.entityReportSha256
  && entityReport.status === 'FAIL'
  && entityReport.totals.packages === 12
  && entityReport.totals.passed === 11
  && entityReport.totals.failed === 1
  && entityReport.totals.blockingEntityHits === 1,
'failed live-entity report identity or totals drifted');
invariant(sha256(sourceIntakeBytes) === EXPECTED.sourceIntakeSha256
  && sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && samePath(sourceIntake.input.suppliedWorldRoot, SOURCE_ROOT)
  && sourceIntake.packageIdentity.completeSaveSha256
    === EXPECTED.sourceCompleteSaveSha256,
'prepare-only source intake identity drifted');
invariant(sha256(sourceIdentityBytes) === EXPECTED.sourceIdentityReportSha256
  && sourceIdentity.sha256 === EXPECTED.sourceRegionSha256
  && samePath(sourceIdentity.directory, path.join(SOURCE_ROOT, 'region')),
'prepare-only source region identity drifted');
invariant(samePath(failedLedger.sourceSnapshot.root, SOURCE_ROOT)
  && failedLedger.sourceSnapshot.completeSaveSha256
    === EXPECTED.sourceCompleteSaveSha256,
'failed ledger does not bind the prepare-only source snapshot');

const failedPackage = entityReport.packages.find(({ passed }) => passed === false);
const blocker = failedPackage?.blockers?.[0];
invariant(failedPackage?.file.includes('c1-island-1142-1183-pavement.forward.txt')
  && blocker?.label === 'Sheep'
  && JSON.stringify(blocker.nbtCapture?.uuidIntArray) === JSON.stringify(EXPECTED_SHEEP[2].uuid)
  && blocker.operationLine === 831
  && JSON.stringify(blocker.targetBox) === JSON.stringify([1517, 66, -210, 1517, 66, -210])
  && blocker.nbtCapture?.identityChecksPassed === true,
'exact sheep blocker evidence drifted');

const selectedPackages = base.packages.filter(
  ({ key }) => base.operations[key].island !== OMITTED_ISLAND,
);
const omittedPackages = base.packages.filter(
  ({ key }) => base.operations[key].island === OMITTED_ISLAND,
);
invariant(selectedPackages.length === EXPECTED.selectedPackageCount
  && omittedPackages.length === 2,
'retry package partition drifted');
const entityReportByFile = new Map(entityReport.packages.map((pkg) => [pkg.file, pkg]));
for (const pkg of selectedPackages) {
  const evidence = entityReportByFile.get(pkg.forward);
  invariant(evidence?.passed === true && evidence.blockers.length === 0
    && evidence.operationSha256 === sha256(fs.readFileSync(absolute(pkg.forward))),
  `${pkg.key} lacks exact passing live-entity evidence`);
}

const sourceReader = new AnvilReader(absolute(path.join(SOURCE_ROOT, 'region')));
const sourceCache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!sourceCache.has(key)) sourceCache.set(key, stateToCommandString(
    await sourceReader.blockState(cell.x, cell.y, cell.z),
  ));
  return sourceCache.get(key);
};
const selectedRecords = [];
const selectedKeys = new Set();
const selectedOperationReports = {};
for (const pkg of selectedPackages) {
  const operation = base.operations[pkg.key];
  const forward = parseOperations(pkg.forward);
  const rollback = parseOperations(pkg.rollback);
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
    `${pkg.key} rollback is not the reverse exact inverse at ${index}`);
    invariant(!selectedKeys.has(cellKey(record.cell)),
      `selected packages overlap at ${cellKey(record.cell)}`);
    selectedKeys.add(cellKey(record.cell));
    invariant(await sourceAt(record.cell) === record.sourceState,
      `${pkg.key} source guard drifted at ${cellKey(record.cell)}`);
    selectedRecords.push(record);
  }
  selectedOperationReports[pkg.key] = operation;
}
invariant(selectedRecords.length === EXPECTED.selectedTargetCellCount
  && hashCells(selectedRecords.map(({ cell }) => cell))
    === EXPECTED.selectedTargetCoordinateSetSha256,
'selected operated-union identity drifted');

const entityReader = new AnvilReader(absolute(path.join(SOURCE_ROOT, 'entities')));
const protectedSheep = [];
for (const expected of EXPECTED_SHEEP) {
  const [x, , z] = expected.position;
  const chunk = await entityReader.chunk(Math.floor(x / 16), Math.floor(z / 16));
  const entity = (chunk?.Entities ?? []).find(
    ({ UUID }) => JSON.stringify(UUID?.map(Number)) === JSON.stringify(expected.uuid),
  );
  invariant(entity?.id === 'minecraft:sheep'
    && JSON.stringify(entity.Pos?.map(Number)) === JSON.stringify(expected.position),
  `protected sheep ${expected.uuid.join(',')} drifted in prepare-only source`);
  protectedSheep.push({
    id: entity.id,
    uuidIntArray: expected.uuid,
    sourcePosition: expected.position,
  });
}
const minSheepTargetDistance = Math.min(...protectedSheep.flatMap(({ sourcePosition }) => (
  selectedRecords.map(({ cell }) => Math.hypot(
    cell.x - sourcePosition[0],
    cell.y - sourcePosition[1],
    cell.z - sourcePosition[2],
  ))
)));
invariant(minSheepTargetDistance > 40,
'selected batch does not preserve a broad spatial separation from all sheep');

const selectedIslandKeys = new Set(
  selectedPackages.map(({ key }) => base.operations[key].island),
);
const includedIslands = base.scope.includedIslands.filter(
  ({ key }) => selectedIslandKeys.has(key),
);
const omittedIsland = base.scope.includedIslands.find(({ key }) => key === OMITTED_ISLAND);
invariant(includedIslands.length === EXPECTED.selectedIslandCount
  && omittedIsland?.geometry.operatedUnion.cellCount === EXPECTED.omittedTargetCellCount,
'included/omitted island geometry drifted');
const selectedForwardOrder = base.executionOrder.forward.filter(
  (key) => selectedPackages.some((pkg) => pkg.key === key),
);
const selectedRollbackOrder = selectedForwardOrder.slice().reverse();
const halo = uniqueCells(selectedRecords.flatMap(({ cell }) => {
  const points = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        points.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
      }
    }
  }
  return points;
}));
const touchedChunks = new Set(halo.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
const selectedTargetCensus = census(selectedRecords, 'targetState');
const originalOmittedTargetCount = omittedPackages.reduce(
  (sum, { key }) => sum + base.operations[key].targetCellCount,
  0,
);
invariant(originalOmittedTargetCount === EXPECTED.omittedTargetCellCount,
'omitted package target total drifted');

const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status:
    'COMPILED_FROM_R11E_FAILED_PREPARE_SOURCE_OFFLINE_SHEEP_PRESERVING_RETRY_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: base.releaseNodeId,
  mvpScope: true,
  scopeIds: base.scopeIds,
  packages: selectedPackages,
  executionOrder: {
    forward: selectedForwardOrder,
    rollback: selectedRollbackOrder,
    rationale: 'Reuse only the ten byte-frozen packages outside island 1142..1183. Rollback is the exact global reverse. The complete sheep-occupied island and both of its packages are omitted.',
  },
  scope: {
    ...base.scope,
    releaseId: RELEASE_ID,
    purpose: 'Execute the six source-proven C1 at-grade islands that are disjoint from the unfenced three-sheep interface. Island 1142..1183 is omitted in full; no relocation and no corridor connectivity are claimed.',
    includedIslands,
    omittedEntityInterfaceIslands: [{
      key: OMITTED_ISLAND,
      stations: omittedIsland.stations,
      originalOperatedUnion: omittedIsland.geometry.operatedUnion,
      omittedPackageKeys: omittedPackages.map(({ key }) => key),
      omittedTargetCellCount: originalOmittedTargetCount,
      protectedSheep,
      failedGateBlocker: {
        entityReportPath: ENTITY_REPORT,
        entityReportSha256: EXPECTED.entityReportSha256,
        uuidIntArray: blocker.nbtCapture.uuidIntArray,
        sourcePosition: EXPECTED_SHEEP[2].position,
        observedLivePosition: blocker.position,
        targetCell: blocker.targetBox.slice(0, 3),
        operationLine: blocker.operationLine,
        nbtStateProjectionSha256: blocker.nbtCapture.stateProjectionSha256,
      },
      disposition: 'PRESERVED_UNTOUCHED_UNFENCED_ROAMING_SHEEP_INTERFACE_NO_OPERATION_PACKAGE',
    }],
    sourceInventory: {
      ...base.scope.sourceInventory,
      selectedRunCount: includedIslands.length,
      omittedEntityInterfaceRunCount: 1,
    },
    corridorConnectivityClaimed: false,
  },
  source: {
    snapshotRoot: SOURCE_ROOT,
    completeSaveSha256: EXPECTED.sourceCompleteSaveSha256,
    captureManifestSha256: sourceIntake.packageIdentity.captureManifestSha256,
    intakeAuditPath: SOURCE_INTAKE,
    sourceRegionSha256: EXPECTED.sourceRegionSha256,
    intakeStatus: sourceIntake.status,
    prepareOnlyFailedLedgerPath: FAILED_LEDGER,
    prepareOnlyFailedLedgerSha256: EXPECTED.failedLedgerSha256,
    prepareOnlySourceBoundReleaseIdentitySha256:
      EXPECTED.failedSourceBoundReleaseIdentity,
    prepareOnlyFailureStage: 'live-entity-clearance',
    baseManifestPath: BASE_MANIFEST,
    baseManifestSha256: EXPECTED.baseManifestSha256,
    baseManifestIdentitySha256: EXPECTED.baseManifestIdentity,
    operationGuardOriginSnapshotRoot: base.source.snapshotRoot,
    operationGuardFreshSourceProof:
      'Every selected guard passed the failed wrapper fresh-source preflight and is rechecked by this compiler against the prepare-only snapshot.',
    touchedChunkCount: touchedChunks.size,
  },
  target: {
    operatedUnion: classManifest(selectedRecords.map(({ cell }) => cell)),
    desiredStateCensus: selectedTargetCensus,
    islandTargetSetsDisjoint: true,
    islandInteractionHalosDisjoint: true,
    packageTargetsDisjoint: true,
  },
  operations: {
    ...selectedOperationReports,
    ordering: 'Dependency packages precede their own island pavement package; rollback uses exact global reverse order. Frozen operation files are reused byte-for-byte.',
  },
  isolation: {
    includedIslandCount: includedIslands.length,
    omittedEntityInterfaceIslandCount: 1,
    excludedWetRangeCount: base.scope.excludedAtGradeRanges.length,
    sourceHazardCount: 0,
    haloFluidOrForbiddenCount: 0,
    priorReleaseIntersectionCount: 0,
    operatedPlanInterfaceIntersectionCount: 0,
    blockEntityHaloIntersectionCount: 0,
    savedEntityHaloIntersectionCount: 0,
    protectedRelicHaloIntersectionCount: 0,
    c01DefaultDenyHaloIntersectionCount: 0,
    dataDistrictCrossroadHaloIntersectionCount: 0,
    selectedPackageFailedGatePassCount: selectedPackages.length,
    protectedSheepCount: protectedSheep.length,
    minimumProtectedSheepToSelectedTargetDistance: minSheepTargetDistance,
    heldTreatmentMutationCount: 0,
    routeCommissioned: false,
  },
  compileGuards: {
    exactPrepareOnlySourceSnapshot: true,
    exactBaseManifestSubset: true,
    uniqueOperatedCellCount: selectedRecords.length,
    exactSourceGuardMatchCount: selectedRecords.length,
    exactInversePackageCount: selectedPackages.length,
    emptyPackageCount: 0,
    omittedSheepIslandTargetCellCount: originalOmittedTargetCount,
    selectedPackageFailedGatePassCount: selectedPackages.length,
    forwardExecutionStageCountInFailedLedger: 0,
    heldTreatmentMutationCount: 0,
    corridorConnectivityClaimed: false,
  },
  standingAuthorization: base.standingAuthorization,
  upstreamIdentities: {
    ...base.upstreamIdentities,
    baseManifestPath: BASE_MANIFEST,
    baseManifestSha256: EXPECTED.baseManifestSha256,
    failedPrepareLedgerPath: FAILED_LEDGER,
    failedPrepareLedgerSha256: EXPECTED.failedLedgerSha256,
    failedEntityReportPath: ENTITY_REPORT,
    failedEntityReportSha256: EXPECTED.entityReportSha256,
  },
  hardSafetyKernelNext: base.hardSafetyKernelNext,
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
    priorFailedWrapperPerformedWorldEdits: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify({
  ...manifestWithoutIdentity,
  manifestIdentity,
}, null, 2)}\n`);
console.log(JSON.stringify({
  status: manifestWithoutIdentity.status,
  manifest: manifestPath,
  manifestIdentity,
  reusedFrozenPackageCount: selectedPackages.length,
  includedIslands: includedIslands.map(({ key, stations }) => ({ key, stations })),
  protectedSheepCount: protectedSheep.length,
  omittedIsland: OMITTED_ISLAND,
  omittedTargetCellCount: originalOmittedTargetCount,
  targetCellCount: selectedRecords.length,
  targetCoordinateSetSha256: hashCells(selectedRecords.map(({ cell }) => cell)),
  minimumProtectedSheepToSelectedTargetDistance: minSheepTargetDistance,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
