#!/usr/bin/env node
/** Compile distinct CZ-R11H retry-v2 from the accepted compensated recovery. */

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
const GENERATED_AT = value('--generated-at', '2026-08-22T03:25:00Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME =
  'combined-zones-r11h-retry-v2-c1-hydraulic-isolation-bridge-1189-1206';
const RELEASE_ID =
  'CZ-R11H-RETRY-V2-C1-HYDRAULIC-ISOLATION-BRIDGE-1189-1206';
const V1_MANIFEST_PATH =
  'data/buildops/combined-zones-r11h-c1-hydraulic-isolation-bridge-1189-1206.release-manifest.json';
const FAILED_LEDGER_PATH =
  'data/world-review/combined-zones-r11h-live-20260822T031103Z/evidence-ledger.json';
const RECOVERY_ACCEPTANCE_PATH =
  'data/world-review/combined-zones-r11h-live-20260822T031103Z/r11h-recovery-acceptance.json';
const RECOVERY_INTAKE_PATH =
  'data/world-review/combined-zones-r11h-live-20260822T031103Z/rollback-recovery-complete-save-intake.json';
const SOURCE_ROOT = 'data/worldsnap-r11h-post-20260822T031103Z';
const REBOUND_PACKAGE = 'c1-bridge-1189-1206-structure';
const REBOUND_POINTS = new Set(['1529,68,-251', '1540,68,-238']);
const EXPECTED = Object.freeze({
  v1ManifestSha256:
    'b8259982d8e272c953f904248b276bf415449038b805604173962d49cb699f31',
  v1ManifestIdentity:
    'f588ddca7596ce8f5305ebf51a3df149cfff5b67dcc629730f49b94cecaabc2a',
  failedLedgerSha256:
    'b7a94c77600e772dee3a9d8873ef9dd25de2a9940a82aac905fa5c1524d5bfbc',
  recoveryAcceptanceSha256:
    'ccc012f2cf5c8d54d3c4fc5aba8b9e5ac58b75f56911f0744f9911902c545e58',
  recoveryAcceptanceIdentity:
    '9941594dc2f744af576efbddfc6eac3bf9fe954517347bbd52f49c4ba0f24adb',
  recoveryIntakeSha256:
    '0086f0acf2c4a7d33aa9c5345f3429c68e080dc7da4017ae3e0d8308b27f211c',
  sourceCompleteSaveSha256:
    '8cd29097ffa225153be988eb0761639e45eb5ea3964e12e862f6d99bf7e333fe',
  sourceRegionSha256:
    '6a57df64e02304baef7d4841c06de3a5aaa54ae31a1459e4abcb53772c93e223',
  targetCount: 1666,
  targetHash: 'ef89661a02a5544a093255ada780e8037200f2b9aa0cd421d30c7bd1fedcf129',
  packageCount: 2,
});

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11H retry-v2 compiler rejected: ${message}`);
};
const readBoundJson = (filename, expected) => {
  const bytes = fs.readFileSync(absolute(filename));
  invariant(sha256(bytes) === expected, `${filename} identity drifted`);
  return { bytes, value: JSON.parse(bytes) };
};
const bodySha256 = (records) => sha256(`${records.map(
  ({ cell, sourceState, targetState }) => (
    `REPL ${cell.x} ${cell.y} ${cell.z} ${cell.x} ${cell.y} ${cell.z} ${sourceState} ${targetState}`
  ),
).join('\n')}\n`);

function parseOperations(filename) {
  const records = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains malformed operation`);
    records.push({
      cell: { x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]) },
      sourceState: fields[7], targetState: fields[8],
    });
  }
  return records;
}

function operationText(key, direction, records, operationSha256, targetHash) {
  return `${[
    `# GENERATED FILE - ${RELEASE_ID} (${key} ${direction})`,
    `# source root: ${SOURCE_ROOT}`,
    `# complete-save SHA-256: ${EXPECTED.sourceCompleteSaveSha256}`,
    `# accepted recovery SHA-256: ${EXPECTED.recoveryAcceptanceSha256}`,
    `# target coordinate-set SHA-256: ${targetHash}`,
    `# operation SHA-256: ${operationSha256}`,
    ...records.map(({ cell, sourceState, targetState }) => (
      `REPL ${cell.x} ${cell.y} ${cell.z} ${cell.x} ${cell.y} ${cell.z} ${sourceState} ${targetState}`
    )),
  ].join('\n')}\n`;
}

const v1Bound = readBoundJson(V1_MANIFEST_PATH, EXPECTED.v1ManifestSha256);
const ledgerBound = readBoundJson(FAILED_LEDGER_PATH, EXPECTED.failedLedgerSha256);
const acceptanceBound = readBoundJson(
  RECOVERY_ACCEPTANCE_PATH, EXPECTED.recoveryAcceptanceSha256,
);
const intakeBound = readBoundJson(RECOVERY_INTAKE_PATH, EXPECTED.recoveryIntakeSha256);
const v1 = v1Bound.value;
const { manifestIdentity: _v1ManifestIdentity, ...v1WithoutIdentity } = v1;
const ledger = ledgerBound.value;
const acceptance = acceptanceBound.value;
const intake = intakeBound.value;
invariant(v1.manifestIdentity === EXPECTED.v1ManifestIdentity
  && v1.packages.length === EXPECTED.packageCount
  && v1.target.operatedUnion.cellCount === EXPECTED.targetCount,
'v1 manifest identity/geometry drifted');
invariant(ledger.status === 'ROLLED_BACK_RECOVERY_VERIFICATION_FAILED_MANUAL_REVIEW'
  && ledger.transactionId === v1.transactionId,
'failed-attempt terminal ledger drifted');
invariant(acceptance.status
    === 'PASS_RECOVERY_ACCEPTED_TWO_DIRT_GRASS_LIFECYCLE_TRANSITIONS_AND_BOUNDED_FLUID_SETTLEMENT_OUTSIDE_OPERATED_HALO'
  && acceptance.recoveryAcceptanceIdentitySha256
    === EXPECTED.recoveryAcceptanceIdentity
  && acceptance.acceptance.physicalRecoveryAccepted === true
  && acceptance.acceptance.exactLifecycleReboundCount === 2
  && acceptance.acceptance.recoveryRetainedFluidBaselineSafeForRetry === true
  && acceptance.exactOperatedHalo.diffCount === 2
  && acceptance.exactOperatedHalo.recoveryFluidCount === 0
  && acceptance.retainedHydraulicReview.recovery.fluidCellCount === 45
  && acceptance.retainedHydraulicReview.recovery.minimumTargetChebyshevDistance === 2,
'compensated-recovery acceptance drifted');
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.packageIdentity.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && absolute(intake.input.suppliedWorldRoot) === absolute(SOURCE_ROOT),
'recovery complete-save intake drifted');

const reader = new AnvilReader(absolute(path.join(SOURCE_ROOT, 'region')));
const sourceAt = async (cell) => stateToCommandString(
  await reader.blockState(cell.x, cell.y, cell.z),
);
const packages = [];
const operations = {};
const allRecords = [];
const targetKeys = new Set();
const reboundEvidence = [];
let changedForwardRecordCount = 0;
let changedRollbackRecordCount = 0;
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
for (const v1Package of v1.packages) {
  const v1Forward = parseOperations(v1Package.forward);
  const v1Rollback = parseOperations(v1Package.rollback);
  invariant(v1Forward.length === v1Rollback.length,
    `${v1Package.key} v1 inverse length drifted`);
  const forward = [];
  for (const record of v1Forward) {
    const actual = await sourceAt(record.cell);
    if (actual === record.sourceState) {
      forward.push(record);
      continue;
    }
    invariant(v1Package.key === REBOUND_PACKAGE
      && REBOUND_POINTS.has(cellKey(record.cell))
      && record.sourceState === 'minecraft:dirt'
      && record.targetState === 'minecraft:air'
      && actual === 'minecraft:grass_block[snowy=false]',
    `undeclared recovery-source change at ${cellKey(record.cell)}`);
    forward.push({ ...record, sourceState: actual });
    reboundEvidence.push({
      cell: record.cell,
      v1SourceState: record.sourceState,
      recoveryAndV2SourceState: actual,
      targetState: record.targetState,
      v2RollbackTargetState: actual,
    });
    changedForwardRecordCount += 1;
  }
  const rollback = forward.slice().reverse().map(({ cell, sourceState, targetState }) => ({
    cell, sourceState: targetState, targetState: sourceState,
  }));
  for (let index = 0; index < rollback.length; index += 1) {
    const previous = v1Rollback[index];
    if (JSON.stringify(previous) === JSON.stringify(rollback[index])) continue;
    invariant(v1Package.key === REBOUND_PACKAGE
      && REBOUND_POINTS.has(cellKey(rollback[index].cell))
      && previous.sourceState === 'minecraft:air'
      && previous.targetState === 'minecraft:dirt'
      && rollback[index].targetState === 'minecraft:grass_block[snowy=false]',
    `${v1Package.key} has undeclared rollback change at ${index}`);
    changedRollbackRecordCount += 1;
  }
  for (const record of forward) {
    invariant(await sourceAt(record.cell) === record.sourceState,
      `${v1Package.key} exact source guard drifted at ${cellKey(record.cell)}`);
    invariant(!targetKeys.has(cellKey(record.cell)),
      `cross-package target overlap at ${cellKey(record.cell)}`);
    targetKeys.add(cellKey(record.cell));
    allRecords.push({ ...record, packageKey: v1Package.key });
  }
  const targetCoordinateSetSha256 = hashCells(forward.map(({ cell }) => cell));
  const forwardSha256 = bodySha256(forward);
  const rollbackSha256 = bodySha256(rollback);
  const canonicalForward = `data/buildops/${BASENAME}.${v1Package.key}.forward.txt`;
  const canonicalRollback = `data/buildops/${BASENAME}.${v1Package.key}.rollback.txt`;
  fs.writeFileSync(
    absolute(path.join(OUT_DIR, path.basename(canonicalForward))),
    operationText(v1Package.key, 'forward', forward, forwardSha256, targetCoordinateSetSha256),
  );
  fs.writeFileSync(
    absolute(path.join(OUT_DIR, path.basename(canonicalRollback))),
    operationText(v1Package.key, 'rollback', rollback, rollbackSha256, targetCoordinateSetSha256),
  );
  packages.push({
    key: v1Package.key,
    forward: canonicalForward,
    rollback: canonicalRollback,
  });
  operations[v1Package.key] = {
    ...v1.operations[v1Package.key],
    forwardSha256,
    rollbackSha256,
    targetCoordinateSetSha256,
    exactInverse: true,
    sourceReboundFromAcceptedRecovery: v1Package.key === REBOUND_PACKAGE,
  };
}
invariant(changedForwardRecordCount === 2 && changedRollbackRecordCount === 2
  && reboundEvidence.length === 2
  && allRecords.length === EXPECTED.targetCount
  && hashCells(allRecords.map(({ cell }) => cell)) === EXPECTED.targetHash,
'retry must preserve geometry and change exactly two source/inverse states');

const manifestWithoutIdentity = {
  ...v1WithoutIdentity,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status:
    'COMPILED_FROM_ACCEPTED_COMPENSATED_RECOVERY_OFFLINE_TWO_LIFECYCLE_GUARDS_AND_FLUID_BASELINE_REBOUND_AWAITING_FRESH_EXECUTION_KERNEL',
  packages,
  executionOrder: {
    ...v1.executionOrder,
    rationale: 'Execute the same dependency then structure packages. Retry-v2 changes only two exact headroom source guards from dirt to naturally spread grass and restores those grass states on rollback. The exact recovery fluid baseline remains outside the operated halo.',
  },
  scope: {
    ...v1.scope,
    releaseId: RELEASE_ID,
    purpose: 'Retry the identical 1,666-cell fluid-isolated bridge geometry from the independently accepted compensated recovery, with two exact lifecycle guards rebound and the settled retained-fluid baseline explicitly bound.',
    lifecycleRebound: {
      packageKey: REBOUND_PACKAGE,
      changedForwardRecordCount,
      changedRollbackRecordCount,
      records: reboundEvidence,
    },
    retainedHydraulicGraph: {
      ...acceptance.retainedHydraulicReview.recovery,
      reviewCellCount: acceptance.retainedHydraulicReview.cellCount,
      reviewCoordinateSetSha256:
        acceptance.retainedHydraulicReview.coordinateSetSha256,
      targetHaloFluidCount: acceptance.exactOperatedHalo.recoveryFluidCount,
      preservation:
        'EXACT_RECOVERY_BASELINE_OUTSIDE_OPERATED_HALO_NO_FLUID_OPERATION_AUTHORIZED',
    },
  },
  source: {
    snapshotRoot: SOURCE_ROOT,
    completeSaveSha256: EXPECTED.sourceCompleteSaveSha256,
    sourceRegionSha256: EXPECTED.sourceRegionSha256,
    intakeAuditPath: RECOVERY_INTAKE_PATH,
    intakeAuditSha256: EXPECTED.recoveryIntakeSha256,
    failedAttemptLedgerPath: FAILED_LEDGER_PATH,
    failedAttemptLedgerSha256: EXPECTED.failedLedgerSha256,
    recoveryAcceptancePath: RECOVERY_ACCEPTANCE_PATH,
    recoveryAcceptanceSha256: EXPECTED.recoveryAcceptanceSha256,
    recoveryAcceptanceIdentitySha256: EXPECTED.recoveryAcceptanceIdentity,
    v1ManifestPath: V1_MANIFEST_PATH,
    v1ManifestSha256: EXPECTED.v1ManifestSha256,
  },
  target: {
    ...v1.target,
    sourceStateCensus: census(allRecords, 'sourceState'),
  },
  operations,
  isolation: {
    ...v1.isolation,
    targetHaloFluidCount: acceptance.exactOperatedHalo.recoveryFluidCount,
    retainedFluidCount: acceptance.retainedHydraulicReview.recovery.fluidCellCount,
    recoveryLifecycleReboundCount: reboundEvidence.length,
    broadRecoverySolidDamageCount: acceptance.preservation.broadSolidDamageCount,
  },
  compileGuards: {
    ...v1.compileGuards,
    exactAcceptedR11FPostSource: false,
    exactAcceptedCompensatedRecoverySource: true,
    exactSourceGuardMatchCount: allRecords.length,
    changedForwardSourceGuardCount: changedForwardRecordCount,
    changedRollbackTargetCount: changedRollbackRecordCount,
    unchangedTargetCoordinateSet: true,
    targetHaloFluidCount: acceptance.exactOperatedHalo.recoveryFluidCount,
    retainedFluidBaselineBoundToRecovery: true,
  },
  upstreamIdentities: {
    v1ManifestPath: V1_MANIFEST_PATH,
    v1ManifestSha256: EXPECTED.v1ManifestSha256,
    failedAttemptLedgerPath: FAILED_LEDGER_PATH,
    failedAttemptLedgerSha256: EXPECTED.failedLedgerSha256,
    recoveryAcceptancePath: RECOVERY_ACCEPTANCE_PATH,
    recoveryAcceptanceSha256: EXPECTED.recoveryAcceptanceSha256,
    recoveryAcceptanceIdentitySha256: EXPECTED.recoveryAcceptanceIdentity,
  },
  hardSafetyKernelNext: v1.hardSafetyKernelNext,
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    strictNoopWeakened: false,
    routeCommissioned: false,
    hydraulicCapacityClaimed: false,
    executionAuthorizedByThisManifest: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify({
  ...manifestWithoutIdentity, manifestIdentity,
}, null, 2)}\n`);
console.log(JSON.stringify({
  status: manifestWithoutIdentity.status,
  manifest: manifestPath,
  manifestIdentity,
  packageCount: packages.length,
  targetCellCount: allRecords.length,
  changedForwardSourceGuardCount: changedForwardRecordCount,
  changedRollbackTargetCount: changedRollbackRecordCount,
  retainedFluidBaselineCount:
    manifestWithoutIdentity.scope.retainedHydraulicGraph.fluidCellCount,
  targetHaloFluidCount:
    manifestWithoutIdentity.scope.retainedHydraulicGraph.targetHaloFluidCount,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
