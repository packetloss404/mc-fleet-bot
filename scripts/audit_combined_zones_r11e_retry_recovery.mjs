#!/usr/bin/env node
/**
 * Read-only recovery acceptance audit for the failed CZ-R11E retry attempt.
 *
 * This compares every operated cell and its complete one-block 3-D interaction
 * halo in the immutable source and compensated-recovery snapshots. It does not
 * connect to Minecraft or modify either snapshot.
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

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-21T23:20:00Z');
const OUT_PATH = value(
  '--out',
  'data/world-review/combined-zones-r11e-retry-live-20260821T230554Z/r11e-retry-recovery-acceptance.json',
);
const MD_PATH = value(
  '--md-out',
  'data/world-review/combined-zones-r11e-retry-live-20260821T230554Z/r11e-retry-recovery-acceptance.md',
);
const MANIFEST_PATH =
  'data/buildops/combined-zones-r11e-retry-c1-six-island-sheep-preserving-batch.release-manifest.json';
const LEDGER_PATH =
  'data/world-review/combined-zones-r11e-retry-live-20260821T230554Z/evidence-ledger.json';
const SOURCE_ROOT = 'data/worldsnap-combined-zones-r11e-retry-source-20260821T230554Z';
const RECOVERY_ROOT = 'data/worldsnap-combined-zones-r11e-retry-post-20260821T230554Z';
const SOURCE_INTAKE_PATH =
  'data/world-review/combined-zones-r11e-retry-live-20260821T230554Z/source-complete-save-intake.json';
const RECOVERY_INTAKE_PATH =
  'data/world-review/combined-zones-r11e-retry-live-20260821T230554Z/rollback-recovery-complete-save-intake.json';
const LIVE_ENTITY_REPORT_PATH =
  'data/world-review/combined-zones-r11e-retry-live-20260821T230554Z/live-entity-clearance.json';
const BLOCK_ENTITY_REPORT_PATH =
  'data/world-review/combined-zones-r11e-retry-live-20260821T230554Z/block-entity-clearance.json';
const FAILURE_PACKAGE = 'c1-island-564-569-pavement';
const FAILURE_POINT = Object.freeze({ x: 968, y: 102, z: 27 });
const SHADED_HALO_POINT = Object.freeze({ x: 937, y: 99, z: 39 });
const SHADED_OVERBURDEN_POINT = Object.freeze({ x: 937, y: 100, z: 39 });
const EXPECTED = Object.freeze({
  manifestSha256: '5b51b90ba542c9584d4e4a77fbc32d891a5d82970df2a9444187af72aa781aa9',
  manifestIdentity: 'ee02b1db8daef2c558b879f7a59a790e086016bf42b155a319b2766c1eb7693d',
  ledgerSha256: 'f520aa966e064901062d034f8a89d08ec1c9c5bf30765580c354eb7aa19acadb',
  sourceIntakeSha256: '1425a088aceeb6190c5bdb84a3434aaa858005fdd43e1dd34fd441efa129f77a',
  recoveryIntakeSha256: 'cc6c269fae5e663d7d9916ba2b5d9796ba59ecee271c539e75bce9846c7e09b9',
  liveEntityReportSha256: 'b5f721f040907f2078547fcea6e0995bed8a2b77c76e620cd4878d6e68bda814',
  blockEntityReportSha256: 'b61106616563fe1c81d0ef0467913689f0bd5d5f26caef47977e5f71e5b7c3ba',
  sourceCompleteSaveSha256: '1228a75ee59ee4abb878eb98ebb49d24cdc02f28674690d3ec9b2cf39f12b537',
  recoveryCompleteSaveSha256: '9b98157a895d29614a05d50fbdc4170ff184d7c22f2e5018aa8dec5604c35930',
  sourceRegionSha256: '29f676138b4ad91ae73b055d86f381e6f5df78b16c06fa07019d4b91e949e8da',
  recoveryRegionSha256: '56e84a0442f1fca276c6b2b7882bd7e3f9900efb3fe7fd1c2f1a5f69a57b0f61',
  targetCellCount: 1_593,
  targetCoordinateSetSha256: 'bfa786a846c26649358b373aa01043a037b68f423f2627e3b5739b210db79042',
  interactionHaloCellCount: 8_348,
  interactionHaloCoordinateSetSha256: 'ee8da75b55587f99b33697c169e3eb4ba61f13dfa86c0c3a2c8cd809fab98abf',
});

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11E retry recovery audit rejected: ${message}`);
};
const samePath = (left, right) => absolute(left) === absolute(right);
const readBoundJson = (filename, expectedSha256) => {
  const bytes = fs.readFileSync(absolute(filename));
  invariant(sha256(bytes) === expectedSha256, `${filename} identity drifted`);
  return { bytes, value: JSON.parse(bytes) };
};

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

const manifestBound = readBoundJson(MANIFEST_PATH, EXPECTED.manifestSha256);
const ledgerBound = readBoundJson(LEDGER_PATH, EXPECTED.ledgerSha256);
const sourceIntakeBound = readBoundJson(SOURCE_INTAKE_PATH, EXPECTED.sourceIntakeSha256);
const recoveryIntakeBound = readBoundJson(RECOVERY_INTAKE_PATH, EXPECTED.recoveryIntakeSha256);
const liveEntityBound = readBoundJson(LIVE_ENTITY_REPORT_PATH, EXPECTED.liveEntityReportSha256);
const blockEntityBound = readBoundJson(BLOCK_ENTITY_REPORT_PATH, EXPECTED.blockEntityReportSha256);
const manifest = manifestBound.value;
const ledger = ledgerBound.value;
const sourceIntake = sourceIntakeBound.value;
const recoveryIntake = recoveryIntakeBound.value;
const liveEntityReport = liveEntityBound.value;
const blockEntityReport = blockEntityBound.value;

invariant(manifest.manifestIdentity === EXPECTED.manifestIdentity
  && manifest.transactionId === ledger.transactionId
  && ledger.status === 'ROLLED_BACK_RECOVERY_VERIFICATION_FAILED_MANUAL_REVIEW'
  && samePath(ledger.sourceSnapshot.root, SOURCE_ROOT),
'manifest/ledger transaction or terminal status drifted');
invariant(sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && sourceIntake.packageIdentity.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && samePath(sourceIntake.input.suppliedWorldRoot, SOURCE_ROOT),
'source complete-save intake drifted');
invariant(recoveryIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && recoveryIntake.packageIdentity.completeSaveSha256 === EXPECTED.recoveryCompleteSaveSha256
  && samePath(recoveryIntake.input.suppliedWorldRoot, RECOVERY_ROOT),
'recovery complete-save intake drifted');
invariant(liveEntityReport.status === 'PASS'
  && liveEntityReport.totals.packages === 10
  && liveEntityReport.totals.passed === 10
  && liveEntityReport.totals.failed === 0
  && liveEntityReport.totals.entitiesReturnedInEnvelopes === 0
  && liveEntityReport.totals.blockingEntityHits === 0,
'failed-attempt same-moment live-entity clearance drifted');
invariant(blockEntityReport.status === 'PASS'
  && blockEntityReport.operationCount === EXPECTED.targetCellCount
  && blockEntityReport.blockingBlockEntityCount === 0
  && blockEntityReport.chunksMissing === 0
  && blockEntityReport.readErrors.length === 0,
'failed-attempt block-entity clearance drifted');

const records = [];
const targetKeys = new Set();
const packageRecords = new Map();
for (const pkg of manifest.packages) {
  const forward = parseOperations(pkg.forward);
  const rollback = parseOperations(pkg.rollback);
  invariant(forward.length === rollback.length,
    `${pkg.key} forward/rollback length differs`);
  for (let index = 0; index < forward.length; index += 1) {
    const record = forward[index];
    const inverse = rollback[rollback.length - index - 1];
    invariant(cellKey(record.cell) === cellKey(inverse.cell)
      && record.sourceState === inverse.targetState
      && record.targetState === inverse.sourceState,
    `${pkg.key} rollback is not reverse exact at ${index}`);
    invariant(!targetKeys.has(cellKey(record.cell)),
      `cross-package overlap at ${cellKey(record.cell)}`);
    targetKeys.add(cellKey(record.cell));
    records.push({ ...record, packageKey: pkg.key });
  }
  packageRecords.set(pkg.key, forward);
}
invariant(records.length === EXPECTED.targetCellCount
  && hashCells(records.map(({ cell }) => cell)) === EXPECTED.targetCoordinateSetSha256,
'operated target union drifted');

const interactionHalo = uniqueCells(records.flatMap(({ cell }) => {
  const result = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        result.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
      }
    }
  }
  return result;
}));
const haloKeys = new Set(interactionHalo.map(cellKey));
invariant(interactionHalo.length === EXPECTED.interactionHaloCellCount
  && hashCells(interactionHalo) === EXPECTED.interactionHaloCoordinateSetSha256,
'complete interaction halo drifted');

const sourceReader = new AnvilReader(absolute(path.join(SOURCE_ROOT, 'region')));
const recoveryReader = new AnvilReader(absolute(path.join(RECOVERY_ROOT, 'region')));
const stateAt = async (reader, cell) => stateToCommandString(
  await reader.blockState(cell.x, cell.y, cell.z),
);
const diffs = [];
const recoveryStateByKey = new Map();
for (const cell of interactionHalo) {
  const [sourceState, recoveryState] = await Promise.all([
    stateAt(sourceReader, cell),
    stateAt(recoveryReader, cell),
  ]);
  recoveryStateByKey.set(cellKey(cell), recoveryState);
  if (sourceState !== recoveryState) {
    diffs.push({
      cell,
      sourceState,
      recoveryState,
      operatedTarget: targetKeys.has(cellKey(cell)),
    });
  }
}
const expectedDiffs = [
  {
    cell: FAILURE_POINT,
    sourceState: 'minecraft:dirt',
    recoveryState: 'minecraft:grass_block[snowy=false]',
    operatedTarget: true,
  },
  {
    cell: SHADED_HALO_POINT,
    sourceState: 'minecraft:grass_block[snowy=false]',
    recoveryState: 'minecraft:dirt',
    operatedTarget: false,
  },
];
const sortDiffs = (items) => items.slice().sort(
  (left, right) => cellKey(left.cell).localeCompare(cellKey(right.cell)),
);
invariant(JSON.stringify(sortDiffs(diffs)) === JSON.stringify(sortDiffs(expectedDiffs)),
'source/recovery interaction-halo diff set is not the exact two accepted lifecycle cells');

let exactSourceRestoredTargetCount = 0;
let residualForwardDesiredStateCount = 0;
for (const record of records) {
  const recoveryState = recoveryStateByKey.get(cellKey(record.cell));
  if (recoveryState === record.sourceState) exactSourceRestoredTargetCount += 1;
  if (record.sourceState !== record.targetState && recoveryState === record.targetState) {
    residualForwardDesiredStateCount += 1;
  }
}
invariant(exactSourceRestoredTargetCount === EXPECTED.targetCellCount - 1
  && residualForwardDesiredStateCount === 0,
'recovery retains an undeclared forward target or unexpected target drift');

const [sourceOverburden, recoveryOverburden] = await Promise.all([
  stateAt(sourceReader, SHADED_OVERBURDEN_POINT),
  stateAt(recoveryReader, SHADED_OVERBURDEN_POINT),
]);
invariant(sourceOverburden === 'minecraft:stone_bricks'
  && recoveryOverburden === sourceOverburden
  && haloKeys.has(cellKey(SHADED_HALO_POINT))
  && !targetKeys.has(cellKey(SHADED_HALO_POINT)),
'halo grass-decay overburden proof drifted');

const evidenceDir = path.dirname(LEDGER_PATH);
const executedPackages = [
  ['c1-island-548-551-dependencies', 7, 7],
  ['c1-island-548-551-pavement', 304, 304],
  ['c1-island-564-569-dependencies', 8, 8],
  ['c1-island-564-569-pavement', 348, 242],
];
const executionEvidence = [];
for (const [key, operationCount, forwardSuccessCount] of executedPackages) {
  const forwardPath = `${evidenceDir}/${key}.forward-execution.json`;
  const compensationPath = `${evidenceDir}/${key}.compensating-rollback-execution.json`;
  const recoveryPreflightPath = `${evidenceDir}/${key}.rollback-recovery-source-preflight.json`;
  const forwardBytes = fs.readFileSync(absolute(forwardPath));
  const compensationBytes = fs.readFileSync(absolute(compensationPath));
  const recoveryPreflightBytes = fs.readFileSync(absolute(recoveryPreflightPath));
  const forward = JSON.parse(forwardBytes);
  const compensation = JSON.parse(compensationBytes);
  const recoveryPreflight = JSON.parse(recoveryPreflightBytes);
  invariant(forward.sourceOperationCount === operationCount
    && forward.successfulGroups === forwardSuccessCount
    && compensation.sourceOperationCount === operationCount
    && compensation.successfulGroups === operationCount
    && compensation.failedGroups === 0
    && compensation.unexpectedNoopCommands === 0
    && compensation.worldEditLeftoverCount === 0,
  `${key} execution/compensation evidence drifted`);
  if (key === FAILURE_PACKAGE) {
    invariant(forward.status === 'failed'
      && forward.failedGroups === 1
      && forward.unexpectedNoopCommands === 1
      && forward.groupFailures?.length === 1
      && forward.groupFailures[0].line === 248
      && recoveryPreflight.status === 'FAIL'
      && recoveryPreflight.failures?.length === 1
      && JSON.stringify(recoveryPreflight.failures[0].box)
        === JSON.stringify([968, 102, 27, 968, 102, 27]),
    'failed guard/recovery preflight evidence drifted');
  } else {
    invariant(forward.status === 'complete' && recoveryPreflight.status === 'PASS',
      `${key} should have completed and recovered exactly`);
  }
  executionEvidence.push({
    key,
    operationCount,
    forwardSuccessfulGroups: forward.successfulGroups,
    compensationSuccessfulGroups: compensation.successfulGroups,
    compensationFailedGroups: compensation.failedGroups,
    recoveryPreflightStatus: recoveryPreflight.status,
    forwardReport: { path: forwardPath, sha256: sha256(forwardBytes) },
    compensationReport: { path: compensationPath, sha256: sha256(compensationBytes) },
    recoveryPreflight: { path: recoveryPreflightPath, sha256: sha256(recoveryPreflightBytes) },
  });
}

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status:
    'PASS_RECOVERY_ACCEPTED_TWO_BENIGN_NATURAL_DIRT_GRASS_TRANSITIONS_ZERO_RESIDUAL_OPERATION_CHANGES',
  mode: 'READ_ONLY_IMMUTABLE_SOURCE_TO_COMPENSATED_RECOVERY_AUDIT',
  historicalLedgerDisposition:
    'The wrapper ledger remains immutable manual-review evidence; this audit independently accepts the compensated physical recovery and does not rewrite that ledger.',
  release: {
    manifestPath: MANIFEST_PATH,
    manifestSha256: EXPECTED.manifestSha256,
    manifestIdentitySha256: EXPECTED.manifestIdentity,
    ledgerPath: LEDGER_PATH,
    ledgerSha256: EXPECTED.ledgerSha256,
    ledgerStatus: ledger.status,
  },
  source: {
    snapshotRoot: SOURCE_ROOT,
    completeSaveSha256: EXPECTED.sourceCompleteSaveSha256,
    regionSha256: EXPECTED.sourceRegionSha256,
    intakePath: SOURCE_INTAKE_PATH,
    intakeSha256: EXPECTED.sourceIntakeSha256,
  },
  recovery: {
    snapshotRoot: RECOVERY_ROOT,
    completeSaveSha256: EXPECTED.recoveryCompleteSaveSha256,
    regionSha256: EXPECTED.recoveryRegionSha256,
    intakePath: RECOVERY_INTAKE_PATH,
    intakeSha256: EXPECTED.recoveryIntakeSha256,
  },
  checks: {
    packageCount: manifest.packages.length,
    exactInversePackageCount: manifest.packages.length,
    targetCellCount: records.length,
    exactSourceRestoredTargetCount,
    naturallyTransitionedTargetCount: 1,
    residualForwardDesiredStateCount,
    interactionHaloCellCount: interactionHalo.length,
    interactionHaloDiffCount: diffs.length,
    targetDiffCount: diffs.filter(({ operatedTarget }) => operatedTarget).length,
    haloOnlyDiffCount: diffs.filter(({ operatedTarget }) => !operatedTarget).length,
    compensationPackageCount: executionEvidence.length,
    compensationFailedGroupCount: executionEvidence.reduce(
      (sum, item) => sum + item.compensationFailedGroups, 0,
    ),
    blockEntityOrContainerTransitionCount: 0,
    fluidTransitionCount: 0,
    entityTargetOrHaloCountAtFailedAttemptGate: 0,
    worldEditsPerformedByAudit: false,
  },
  identities: {
    targetCoordinateSetSha256: hashCells(records.map(({ cell }) => cell)),
    interactionHaloCoordinateSetSha256: hashCells(interactionHalo),
  },
  exactDiffs: [
    {
      ...diffs.find(({ cell }) => cellKey(cell) === cellKey(FAILURE_POINT)),
      classification: 'BENIGN_NATURAL_GRASS_SPREAD_AFTER_SOURCE_CAPTURE_BEFORE_EXECUTION',
      causality: {
        failedPackage: FAILURE_PACKAGE,
        failedOperationLine: 248,
        forwardGuardExpected: 'minecraft:dirt',
        liveAndRecoveryState: 'minecraft:grass_block[snowy=false]',
        compensationResidual: false,
      },
    },
    {
      ...diffs.find(({ cell }) => cellKey(cell) === cellKey(SHADED_HALO_POINT)),
      classification: 'BENIGN_NATURAL_GRASS_DECAY_UNDER_UNCHANGED_OPAQUE_OVERBURDEN',
      causality: {
        operatedTarget: false,
        overburdenCell: SHADED_OVERBURDEN_POINT,
        sourceOverburdenState: sourceOverburden,
        recoveryOverburdenState: recoveryOverburden,
        compensationResidual: false,
      },
    },
  ],
  executionAndCompensationEvidence: executionEvidence,
  interactionSafetyEvidence: {
    liveEntityClearance: {
      path: LIVE_ENTITY_REPORT_PATH,
      sha256: EXPECTED.liveEntityReportSha256,
      packageCount: liveEntityReport.totals.packages,
      entitiesReturnedInEnvelopes: liveEntityReport.totals.entitiesReturnedInEnvelopes,
      blockingEntityHits: liveEntityReport.totals.blockingEntityHits,
    },
    blockEntityClearance: {
      path: BLOCK_ENTITY_REPORT_PATH,
      sha256: EXPECTED.blockEntityReportSha256,
      operationCount: blockEntityReport.operationCount,
      blockEntitiesExamined: blockEntityReport.blockEntitiesExamined,
      blockingBlockEntityCount: blockEntityReport.blockingBlockEntityCount,
    },
  },
  acceptance: {
    physicalRecoveryAccepted: true,
    sourceAndRecoverySnapshotsAreNotClaimedByteIdentical: true,
    exactPermittedNaturalTransitionCount: 2,
    operationResidualCount: 0,
    retryMustRebindFailurePointSourceAndRollbackInverseToGrass: true,
    retryRequiresFreshHardSafetyKernel: true,
  },
};
const recoveryAcceptanceIdentitySha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, recoveryAcceptanceIdentitySha256 };
fs.mkdirSync(path.dirname(absolute(OUT_PATH)), { recursive: true });
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);
const markdown = `# R11E retry recovery acceptance\n\n`
  + `Status: **${report.status}**\n\n`
  + `The immutable compensated recovery restores 1,592 of 1,593 targets byte-exactly to the captured source. The sole target difference is \`(968,102,27)\`, dirt to grass, which is the exact strict-noop guard that stopped execution. No target retains a forward desired state.\n\n`
  + `The complete ${interactionHalo.length.toLocaleString('en-US')}-cell one-block 3-D interaction halo has one additional non-target lifecycle change at \`(937,99,39)\`: grass to dirt beneath unchanged \`minecraft:stone_bricks\` at \`(937,100,39)\`. This is natural shaded-grass decay, not an operation residual.\n\n`
  + `All ${executionEvidence.length} changed/partially changed packages have successful compensation with zero failed groups. The historical wrapper ledger remains unchanged in manual-review status; this independently sealed evidence accepts the physical recovery and requires retry-v2 to guard and restore grass at the failed target.\n\n`
  + `Recovery acceptance identity: \`${recoveryAcceptanceIdentitySha256}\`\n`;
fs.mkdirSync(path.dirname(absolute(MD_PATH)), { recursive: true });
fs.writeFileSync(absolute(MD_PATH), markdown);
console.log(JSON.stringify({
  status: report.status,
  report: OUT_PATH,
  markdown: MD_PATH,
  recoveryAcceptanceIdentitySha256,
  checks: report.checks,
}, null, 2));
