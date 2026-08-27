#!/usr/bin/env node
/**
 * Compile the distinct CZ-R11E retry-v2 package set from the independently
 * accepted compensated-recovery snapshot. Exactly one guard is rebound from
 * dirt to naturally spread grass; its rollback restores that exact grass.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import {
  AnvilReader,
  cellKey,
  hashCells,
  stateToCommandString,
} from './lib/combined_zones_release_lib.mjs';
import { census } from './lib/combined_zones_c1_at_grade_island_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-21T23:25:00Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = 'combined-zones-r11e-retry-v2-c1-six-island-natural-transition-rebound-batch';
const RELEASE_ID = 'CZ-R11E-RETRY-V2-C1-SIX-ISLAND-NATURAL-TRANSITION-REBOUND-BATCH';
const V1_MANIFEST_PATH =
  'data/buildops/combined-zones-r11e-retry-c1-six-island-sheep-preserving-batch.release-manifest.json';
const FAILED_LEDGER_PATH =
  'data/world-review/combined-zones-r11e-retry-live-20260821T230554Z/evidence-ledger.json';
const RECOVERY_ACCEPTANCE_PATH =
  'data/world-review/combined-zones-r11e-retry-live-20260821T230554Z/r11e-retry-recovery-acceptance.json';
const RECOVERY_INTAKE_PATH =
  'data/world-review/combined-zones-r11e-retry-live-20260821T230554Z/rollback-recovery-complete-save-intake.json';
const LIVE_ENTITY_REPORT_PATH =
  'data/world-review/combined-zones-r11e-retry-live-20260821T230554Z/live-entity-clearance.json';
const SOURCE_ROOT = 'data/worldsnap-combined-zones-r11e-retry-post-20260821T230554Z';
const REBOUND_PACKAGE = 'c1-island-564-569-pavement';
const REBOUND_POINT = Object.freeze({ x: 968, y: 102, z: 27 });
const EXPECTED = Object.freeze({
  v1ManifestSha256: '5b51b90ba542c9584d4e4a77fbc32d891a5d82970df2a9444187af72aa781aa9',
  v1ManifestIdentity: 'ee02b1db8daef2c558b879f7a59a790e086016bf42b155a319b2766c1eb7693d',
  failedLedgerSha256: 'f520aa966e064901062d034f8a89d08ec1c9c5bf30765580c354eb7aa19acadb',
  recoveryAcceptanceSha256: '64d7e6b4b4894d50820336453c428f068c3527714a0da16b95d07e0a3a01f5dd',
  recoveryAcceptanceIdentity: '4c43f50ae5c85723c0e2f0d8ad490df1549d29c157185b9bcc3907aab7cd958e',
  recoveryIntakeSha256: 'cc6c269fae5e663d7d9916ba2b5d9796ba59ecee271c539e75bce9846c7e09b9',
  liveEntityReportSha256: 'b5f721f040907f2078547fcea6e0995bed8a2b77c76e620cd4878d6e68bda814',
  sourceCompleteSaveSha256: '9b98157a895d29614a05d50fbdc4170ff184d7c22f2e5018aa8dec5604c35930',
  sourceRegionSha256: '56e84a0442f1fca276c6b2b7882bd7e3f9900efb3fe7fd1c2f1a5f69a57b0f61',
  targetCellCount: 1_593,
  targetCoordinateSetSha256: 'bfa786a846c26649358b373aa01043a037b68f423f2627e3b5739b210db79042',
  packageCount: 10,
});

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11E retry-v2 rejected: ${message}`);
};
const readBoundJson = (filename, expectedSha256) => {
  const bytes = fs.readFileSync(absolute(filename));
  invariant(sha256(bytes) === expectedSha256, `${filename} identity drifted`);
  return { bytes, value: JSON.parse(bytes) };
};
const bodySha256FromRecords = (records) => sha256(
  `${records.map(({ cell, sourceState, targetState }) => (
    `REPL ${cell.x} ${cell.y} ${cell.z} ${cell.x} ${cell.y} ${cell.z} ${sourceState} ${targetState}`
  )).join('\n')}\n`,
);

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

function operationText(key, role, records, operationSha256, targetSetSha256) {
  const lines = [
    `# GENERATED FILE - ${RELEASE_ID} (${key} ${role})`,
    `# source root: ${SOURCE_ROOT}`,
    `# complete-save SHA-256: ${EXPECTED.sourceCompleteSaveSha256}`,
    `# accepted recovery evidence SHA-256: ${EXPECTED.recoveryAcceptanceSha256}`,
    `# target coordinate-set SHA-256: ${targetSetSha256}`,
    `# operation SHA-256: ${operationSha256}`,
    ...records.map(({ cell, sourceState, targetState }) => (
      `REPL ${cell.x} ${cell.y} ${cell.z} ${cell.x} ${cell.y} ${cell.z} ${sourceState} ${targetState}`
    )),
  ];
  return `${lines.join('\n')}\n`;
}

const v1Bound = readBoundJson(V1_MANIFEST_PATH, EXPECTED.v1ManifestSha256);
const ledgerBound = readBoundJson(FAILED_LEDGER_PATH, EXPECTED.failedLedgerSha256);
const acceptanceBound = readBoundJson(
  RECOVERY_ACCEPTANCE_PATH, EXPECTED.recoveryAcceptanceSha256,
);
const intakeBound = readBoundJson(RECOVERY_INTAKE_PATH, EXPECTED.recoveryIntakeSha256);
const liveEntityBound = readBoundJson(
  LIVE_ENTITY_REPORT_PATH, EXPECTED.liveEntityReportSha256,
);
const v1 = v1Bound.value;
const ledger = ledgerBound.value;
const acceptance = acceptanceBound.value;
const intake = intakeBound.value;
const liveEntityReport = liveEntityBound.value;

invariant(v1.manifestIdentity === EXPECTED.v1ManifestIdentity
  && v1.packages.length === EXPECTED.packageCount,
'v1 manifest identity/package count drifted');
invariant(ledger.status === 'ROLLED_BACK_RECOVERY_VERIFICATION_FAILED_MANUAL_REVIEW'
  && ledger.transactionId === v1.transactionId,
'failed retry ledger terminal evidence drifted');
invariant(acceptance.status
    === 'PASS_RECOVERY_ACCEPTED_TWO_BENIGN_NATURAL_DIRT_GRASS_TRANSITIONS_ZERO_RESIDUAL_OPERATION_CHANGES'
  && acceptance.recoveryAcceptanceIdentitySha256 === EXPECTED.recoveryAcceptanceIdentity
  && acceptance.acceptance.physicalRecoveryAccepted === true
  && acceptance.acceptance.operationResidualCount === 0
  && acceptance.checks.targetCellCount === EXPECTED.targetCellCount,
'independent compensated-recovery acceptance drifted');
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.packageIdentity.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && absolute(intake.input.suppliedWorldRoot) === absolute(SOURCE_ROOT),
'recovery complete-save intake drifted');
invariant(liveEntityReport.status === 'PASS'
  && liveEntityReport.totals.packages === EXPECTED.packageCount
  && liveEntityReport.totals.passed === EXPECTED.packageCount
  && liveEntityReport.totals.failed === 0
  && liveEntityReport.totals.entitiesReturnedInEnvelopes === 0,
'failed-attempt same-moment live-entity clearance drifted');

const reader = new AnvilReader(absolute(path.join(SOURCE_ROOT, 'region')));
const sourceCache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!sourceCache.has(key)) sourceCache.set(key, stateToCommandString(
    await reader.blockState(cell.x, cell.y, cell.z),
  ));
  return sourceCache.get(key);
};

const packages = [];
const operations = {};
const allRecords = [];
const allKeys = new Set();
let changedForwardRecordCount = 0;
let changedRollbackRecordCount = 0;
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
for (const v1Package of v1.packages) {
  const v1Forward = parseOperations(v1Package.forward);
  const v1Rollback = parseOperations(v1Package.rollback);
  invariant(v1Forward.length === v1Rollback.length,
    `${v1Package.key} v1 operation lengths drifted`);
  const forward = v1Forward.map((record) => {
    if (v1Package.key !== REBOUND_PACKAGE
      || cellKey(record.cell) !== cellKey(REBOUND_POINT)) return record;
    invariant(record.sourceState === 'minecraft:dirt'
      && record.targetState === 'minecraft:gray_concrete',
    'v1 rebound operation is not the expected dirt-to-gray-concrete transition');
    changedForwardRecordCount += 1;
    return { ...record, sourceState: 'minecraft:grass_block[snowy=false]' };
  });
  const rollback = forward.slice().reverse().map(({ cell, sourceState, targetState }) => ({
    cell,
    sourceState: targetState,
    targetState: sourceState,
  }));
  for (let index = 0; index < v1Rollback.length; index += 1) {
    if (JSON.stringify(v1Rollback[index]) !== JSON.stringify(rollback[index])) {
      invariant(v1Package.key === REBOUND_PACKAGE
        && cellKey(rollback[index].cell) === cellKey(REBOUND_POINT)
        && v1Rollback[index].sourceState === 'minecraft:gray_concrete'
        && v1Rollback[index].targetState === 'minecraft:dirt'
        && rollback[index].targetState === 'minecraft:grass_block[snowy=false]',
      `${v1Package.key} has an undeclared rollback change at ${index}`);
      changedRollbackRecordCount += 1;
    }
  }
  for (const record of forward) {
    invariant(await sourceAt(record.cell) === record.sourceState,
      `${v1Package.key} recovery source guard drifted at ${cellKey(record.cell)}`);
    invariant(!allKeys.has(cellKey(record.cell)),
      `cross-package overlap at ${cellKey(record.cell)}`);
    allKeys.add(cellKey(record.cell));
    allRecords.push({ ...record, packageKey: v1Package.key });
  }
  const targetCoordinateSetSha256 = hashCells(forward.map(({ cell }) => cell));
  const forwardSha256 = bodySha256FromRecords(forward);
  const rollbackSha256 = bodySha256FromRecords(rollback);
  const forwardPath = path.join(OUT_DIR, `${BASENAME}.${v1Package.key}.forward.txt`);
  const rollbackPath = path.join(OUT_DIR, `${BASENAME}.${v1Package.key}.rollback.txt`);
  fs.writeFileSync(absolute(forwardPath), operationText(
    v1Package.key, 'forward', forward, forwardSha256, targetCoordinateSetSha256,
  ));
  fs.writeFileSync(absolute(rollbackPath), operationText(
    v1Package.key, 'rollback', rollback, rollbackSha256, targetCoordinateSetSha256,
  ));
  packages.push({ key: v1Package.key, forward: forwardPath, rollback: rollbackPath });
  operations[v1Package.key] = {
    ...v1.operations[v1Package.key],
    forwardSha256,
    rollbackSha256,
    targetCoordinateSetSha256,
    exactInverse: true,
    sourceReboundFromAcceptedRecovery: v1Package.key === REBOUND_PACKAGE,
  };
}
invariant(changedForwardRecordCount === 1 && changedRollbackRecordCount === 1,
'v2 must differ from v1 at exactly one forward and one rollback record');
invariant(allRecords.length === EXPECTED.targetCellCount
  && hashCells(allRecords.map(({ cell }) => cell)) === EXPECTED.targetCoordinateSetSha256,
'v2 operated target union drifted');

const manifestWithoutIdentity = {
  ...v1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status:
    'COMPILED_FROM_ACCEPTED_COMPENSATED_RECOVERY_OFFLINE_NATURAL_TRANSITION_REBOUND_AWAITING_FRESH_EXECUTION_KERNEL',
  packages,
  executionOrder: {
    ...v1.executionOrder,
    rationale: 'Execute the same six disjoint sheep-preserving islands. Retry-v2 uses distinct operation files source-bound to the accepted compensated recovery; only (968,102,27) changes from dirt to grass as a forward guard and reverse rollback target.',
  },
  scope: {
    ...v1.scope,
    releaseId: RELEASE_ID,
    purpose: 'Execute the six source-proven C1 at-grade islands after exact compensated-recovery acceptance. Preserve the complete roaming-sheep island, all held treatment ranges, and no-connectivity boundary; narrowly rebind one naturally grassed target.',
    naturalTransitionRebound: {
      packageKey: REBOUND_PACKAGE,
      point: REBOUND_POINT,
      v1ForwardSourceState: 'minecraft:dirt',
      recoveryAndV2ForwardSourceState: 'minecraft:grass_block[snowy=false]',
      desiredState: 'minecraft:gray_concrete',
      v2RollbackTargetState: 'minecraft:grass_block[snowy=false]',
      changedForwardRecordCount,
      changedRollbackRecordCount,
    },
  },
  source: {
    snapshotRoot: SOURCE_ROOT,
    completeSaveSha256: EXPECTED.sourceCompleteSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    intakeAuditPath: RECOVERY_INTAKE_PATH,
    intakeAuditSha256: EXPECTED.recoveryIntakeSha256,
    sourceRegionSha256: EXPECTED.sourceRegionSha256,
    intakeStatus: intake.status,
    acceptedRecoveryEvidencePath: RECOVERY_ACCEPTANCE_PATH,
    acceptedRecoveryEvidenceSha256: EXPECTED.recoveryAcceptanceSha256,
    acceptedRecoveryIdentitySha256: EXPECTED.recoveryAcceptanceIdentity,
    failedRetryLedgerPath: FAILED_LEDGER_PATH,
    failedRetryLedgerSha256: EXPECTED.failedLedgerSha256,
    failedRetryLedgerStatus: ledger.status,
    failedRetrySameMomentLiveEntityReportPath: LIVE_ENTITY_REPORT_PATH,
    failedRetrySameMomentLiveEntityReportSha256: EXPECTED.liveEntityReportSha256,
    v1ManifestPath: V1_MANIFEST_PATH,
    v1ManifestSha256: EXPECTED.v1ManifestSha256,
    v1ManifestIdentitySha256: EXPECTED.v1ManifestIdentity,
    operationGuardOriginSnapshotRoot: SOURCE_ROOT,
    operationGuardFreshSourceProof:
      'All 1,593 exact guards are re-read from the accepted compensated-recovery snapshot; one natural dirt-to-grass transition is rebound exactly.',
    touchedChunkCount: v1.source.touchedChunkCount,
  },
  target: {
    ...v1.target,
    desiredStateCensus: census(allRecords, 'targetState'),
  },
  operations: {
    ...operations,
    ordering: 'Dependency packages precede their own pavement package; rollback is the exact global and per-package reverse. Every retry-v2 operation path is distinct from v1.',
  },
  isolation: {
    ...v1.isolation,
    acceptedRecoveryNaturalTransitionCount: 2,
    sourceReboundTargetCount: 1,
    operationResidualCountInAcceptedRecovery: 0,
    failedRetrySameMomentLiveEntityGatePassCount: liveEntityReport.totals.passed,
  },
  compileGuards: {
    ...v1.compileGuards,
    exactPrepareOnlySourceSnapshot: undefined,
    exactBaseManifestSubset: undefined,
    selectedPackageFailedGatePassCount: undefined,
    forwardExecutionStageCountInFailedLedger: undefined,
    exactAcceptedRecoverySourceSnapshot: true,
    exactV1TargetGeometryAndDesiredState: true,
    exactSourceGuardMatchCount: allRecords.length,
    distinctV2OperationFileCount: packages.length * 2,
    v1ForwardRecordDifferenceCount: changedForwardRecordCount,
    v1RollbackRecordDifferenceCount: changedRollbackRecordCount,
    acceptedRecoveryOperationResidualCount: 0,
    failedRetrySameMomentLiveEntityGatePassCount: liveEntityReport.totals.passed,
  },
  upstreamIdentities: {
    ...v1.upstreamIdentities,
    v1ManifestPath: V1_MANIFEST_PATH,
    v1ManifestSha256: EXPECTED.v1ManifestSha256,
    failedRetryLedgerPath: FAILED_LEDGER_PATH,
    failedRetryLedgerSha256: EXPECTED.failedLedgerSha256,
    recoveryAcceptancePath: RECOVERY_ACCEPTANCE_PATH,
    recoveryAcceptanceSha256: EXPECTED.recoveryAcceptanceSha256,
    failedRetrySameMomentLiveEntityReportPath: LIVE_ENTITY_REPORT_PATH,
    failedRetrySameMomentLiveEntityReportSha256: EXPECTED.liveEntityReportSha256,
  },
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
    priorFailedWrapperPerformedWorldEdits: true,
    priorFailedWrapperChangesCompensatedAndIndependentlyAccepted: true,
  },
};
delete manifestWithoutIdentity.manifestIdentity;
delete manifestWithoutIdentity.compileGuards.exactPrepareOnlySourceSnapshot;
delete manifestWithoutIdentity.compileGuards.exactBaseManifestSubset;
delete manifestWithoutIdentity.compileGuards.selectedPackageFailedGatePassCount;
delete manifestWithoutIdentity.compileGuards.forwardExecutionStageCountInFailedLedger;
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify({
  ...manifestWithoutIdentity,
  manifestIdentity,
}, null, 2)}\n`);
console.log(JSON.stringify({
  status: manifestWithoutIdentity.status,
  manifest: manifestPath,
  manifestIdentity,
  packageCount: packages.length,
  operationFileCount: packages.length * 2,
  targetCellCount: allRecords.length,
  targetCoordinateSetSha256: hashCells(allRecords.map(({ cell }) => cell)),
  changedForwardRecordCount,
  changedRollbackRecordCount,
  rebound: manifestWithoutIdentity.scope.naturalTransitionRebound,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
