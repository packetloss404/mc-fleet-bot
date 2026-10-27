#!/usr/bin/env node
/**
 * Read-only post-release QA and seal for CZ-R07C P1-B08.
 *
 * Re-derives the exact cover, west entrance, B03 connection, and route void;
 * verifies every operated and functional cell in the sealed post save; binds
 * strict execution and reverse-order rollback evidence; and records the
 * provenance chain through the stopped-and-compensated first attempt.
 *
 * No live service is contacted and no world state is mutated.
 */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  boundsOf,
  cellKey,
  deriveB08ServiceTunnelConstruction,
  hashCells,
  sha256,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

const GENERATED_AT = value('--generated-at', '2026-08-21T16:25:00Z');
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r07c-retry-live-20260821T162026Z',
);
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r07c-b08-service-tunnel-cover-recovery-20260821T161200Z.release-manifest.json',
);
const POST_ROOT = value(
  '--post-root',
  'data/worldsnap-combined-zones-r07c-retry-post-20260821T162026Z',
);
const POST_INTAKE_PATH = value(
  '--post-intake',
  path.join(EVIDENCE_DIR, 'post-complete-save-intake.json'),
);
const PRIOR_ATTEMPT_LEDGER_PATH = value(
  '--prior-attempt-ledger',
  'data/world-review/combined-zones-r07c-live-20260821T161200Z/evidence-ledger.json',
);
const PRIOR_RECOVERY_INTAKE_PATH = value(
  '--prior-recovery-intake',
  'data/world-review/combined-zones-r07c-live-20260821T161200Z/rollback-recovery-complete-save-intake.json',
);
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r07c-post-release-qa.json'));
const MARKDOWN_PATH = value(
  '--markdown',
  path.join(EVIDENCE_DIR, 'r07c-post-release-qa.md'),
);
const CONNECTORS_PATH =
  'docs/masterplans/05-combined-zones/phase1-connector-geometry.json';
const B03_GEOMETRY_PATH =
  'docs/masterplans/05-combined-zones/phase1-cheyenne-jcurve-geometry.json';
const TARGET_SHELL_STATE = 'minecraft:polished_diorite';
const TARGET_ROUTE_STATE = 'minecraft:air';

const EXPECTED = Object.freeze({
  constructionCellCount: 7878,
  constructionSha256: '967a9ddd39775cfc4cbc851fd51abc4726a1e20ab632b433b45d386393254882',
  externalBoundaryCellCount: 5327,
  externalBoundarySha256: '83c7bae09d31a562de9cf0d1c31d35ad68b04438545270ee592e462e6c657994',
  shellDesignCellCount: 5283,
  shellDesignSha256: 'e61aca484f2ff44d2ace64d1b9948236c7c59586743ef79d159dc0a776e7ce79',
  westEntranceCellCount: 24,
  westEntranceSha256: 'b7a6d1173b904243df812c16c7465c081211e30a2f4599d2f858bf0ddffda49f',
  b03ConnectionCellCount: 20,
  b03ConnectionSha256: '95b1b86fa537ebc6aae1bdefae200a218971ba5643cf2f8e1a19f347b8fa0e85',
  projectedVoidCellCount: 7902,
  projectedVoidSha256: '0f09904a321286b61e1ea88dbf011a469c18b183190109a2c096c770db21d62a',
  shellOperationCount: 5252,
  shellTargetSha256: 'f0a6210af65e1b551011446283932f50ab5524b8d2d76cf33adbfed911242ff4',
  openingOperationCount: 28,
  openingTargetSha256: '19ee221e9392b9c0172305bab4acd97d101d838a6279eb8a0c4f94a2d1a78ce3',
  operatedCellCount: 5280,
  operatedSha256: '4c1cd124726032c338de14bcce68d83a4f8f17c6de6e794318439df61d9a9944',
  preservedEnclosureCellCount: 31,
});
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
];

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const fileBinding = (filename) => ({
  path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))),
  bytes: fs.statSync(absolute(filename)).size,
});
const samePath = (left, right) => absolute(left) === absolute(right);
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R07C post-release QA rejected: ${message}`);
};
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const stateCensus = (records) => {
  const counts = new Map();
  for (const { state } of records) counts.set(state, (counts.get(state) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
};

function operationBody(filename) {
  return `${fs.readFileSync(absolute(filename), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .join('\n')}\n`;
}

function parseOperations(filename) {
  const operations = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains a malformed or non-REPL operation`);
    const coordinates = fields.slice(1, 7).map(Number);
    invariant(coordinates[0] === coordinates[3]
      && coordinates[1] === coordinates[4]
      && coordinates[2] === coordinates[5],
    `${filename} contains a non-one-cell operation`);
    operations.push({
      cell: { x: coordinates[0], y: coordinates[1], z: coordinates[2] },
      fromState: fields[7],
      toState: fields[8],
    });
  }
  return operations;
}

function connectedComponentManifest(cells) {
  const remaining = new Set(cells.map(cellKey));
  const components = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const stack = [first];
    const component = [];
    while (stack.length) {
      const key = stack.pop();
      const [x, y, z] = key.split(',').map(Number);
      component.push({ x, y, z });
      for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
        const neighbour = `${x + dx},${y + dy},${z + dz}`;
        if (remaining.delete(neighbour)) stack.push(neighbour);
      }
    }
    components.push(uniqueCells(component));
  }
  components.sort((left, right) => right.length - left.length
    || cellKey(left[0]).localeCompare(cellKey(right[0])));
  return {
    componentCount: components.length,
    largestComponentCellCount: components[0]?.length ?? 0,
    componentSetSha256: sha256(components
      .map((component) => `${component.length}:${hashCells(component)}`)
      .sort()
      .join('\n')),
  };
}

function executionEvidence(filename, operationFilename, expectedCount) {
  const report = readJson(filename);
  const operationBinding = fileBinding(operationFilename);
  const passed = report.schemaVersion === 3
    && report.status === 'complete'
    && report.dryRun === false
    && report.strictNoop === true
    && report.operationRole === 'forward'
    && report.operationSha256 === operationBinding.sha256
    && report.sourceOperationCount === expectedCount
    && report.sourceGroupCount === expectedCount
    && report.successfulGroups === expectedCount
    && report.failedGroups === 0
    && report.successfulCommands === expectedCount
    && report.failedCommands === 0
    && report.noopCommands === 0
    && report.unexpectedNoopCommands === 0
    && report.unknownReplyCommands === 0
    && report.worldEditLeftoverCount === 0;
  return {
    ...fileBinding(filename),
    status: report.status,
    operationSha256: report.operationSha256,
    strictNoop: report.strictNoop,
    successfulGroups: report.successfulGroups,
    failedGroups: report.failedGroups,
    noopCommands: report.noopCommands,
    passed,
  };
}

function rollbackEvidence(filename, operationFilename, expectedCount, postRegionSha256) {
  const report = readJson(filename);
  const operationBinding = fileBinding(operationFilename);
  const passed = report.status === 'PASS'
    && samePath(report.opsPath, operationFilename)
    && report.opsSha256 === operationBinding.sha256
    && report.operationCount === expectedCount
    && report.passed === expectedCount
    && report.failed === 0
    && report.regionsSnapshot?.sha256 === postRegionSha256;
  return {
    ...fileBinding(filename),
    status: report.status,
    opsSha256: report.opsSha256,
    passedGuards: report.passed,
    failedGuards: report.failed,
    regionSnapshotSha256: report.regionsSnapshot?.sha256 ?? null,
    sourceOverlays: report.sourceOverlays ?? null,
    passed,
  };
}

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
const postIntake = readJson(POST_INTAKE_PATH);
const priorLedger = readJson(PRIOR_ATTEMPT_LEDGER_PATH);
const priorRecoveryIntake = readJson(PRIOR_RECOVERY_INTAKE_PATH);
const connectors = readJson(CONNECTORS_PATH);
const b03 = readJson(B03_GEOMETRY_PATH);
const ledgerBinding = fileBinding(LEDGER_PATH);
const manifestBinding = fileBinding(MANIFEST_PATH);
const postIntakeBinding = fileBinding(POST_INTAKE_PATH);
const priorLedgerBinding = fileBinding(PRIOR_ATTEMPT_LEDGER_PATH);
const priorRecoveryIntakeBinding = fileBinding(PRIOR_RECOVERY_INTAKE_PATH);

invariant(ledger.schemaVersion === 1
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
'execution ledger is not terminally accepted');
invariant(ledger.transactionId === manifest.transactionId
  && ledger.releaseNodeId === manifest.releaseNodeId,
'execution ledger scope does not match the release manifest');
invariant(samePath(ledger.manifest.path, MANIFEST_PATH)
  && ledger.manifest.sha256 === manifestBinding.sha256
  && ledger.manifest.bytes === manifestBinding.bytes,
'ledger release-manifest binding drifted');
const manifestPayload = { ...manifest };
delete manifestPayload.manifestIdentity;
invariant(manifest.manifestIdentity === sha256(JSON.stringify(manifestPayload)),
'release-manifest payload identity drifted');
invariant(samePath(ledger.postSnapshot.root, POST_ROOT)
  && samePath(ledger.postSnapshot.completeSaveIntake.path, POST_INTAKE_PATH)
  && ledger.postSnapshot.completeSaveIntake.sha256 === postIntakeBinding.sha256
  && ledger.postSnapshot.completeSaveIntake.bytes === postIntakeBinding.bytes,
'ledger post-snapshot/intake binding drifted');
invariant(postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.summary?.passed === true
  && samePath(postIntake.input?.suppliedWorldRoot, POST_ROOT)
  && postIntake.packageIdentity?.completeSaveSha256
    === ledger.postSnapshot.completeSaveSha256,
'post complete-save intake is not the ledger-bound PASS save');

const postIdentityPath = ledger.postSnapshot.identity.path;
const postIdentityBinding = fileBinding(postIdentityPath);
const postIdentity = readJson(postIdentityPath);
invariant(ledger.postSnapshot.identity.sha256 === postIdentityBinding.sha256
  && ledger.postSnapshot.identity.bytes === postIdentityBinding.bytes
  && samePath(postIdentity.directory, path.join(POST_ROOT, 'region')),
'post region identity binding drifted');
const sourceIntakePath = ledger.sourceSnapshot.completeSaveIntake.path;
const sourceIntakeBinding = fileBinding(sourceIntakePath);
const sourceIntake = readJson(sourceIntakePath);
invariant(ledger.sourceSnapshot.completeSaveIntake.sha256 === sourceIntakeBinding.sha256
  && ledger.sourceSnapshot.completeSaveIntake.bytes === sourceIntakeBinding.bytes
  && sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && sourceIntake.packageIdentity?.completeSaveSha256
    === ledger.sourceSnapshot.completeSaveSha256,
'ledger source complete-save intake binding drifted');
invariant(fs.existsSync(absolute(path.join(POST_ROOT, 'region')))
  && fs.existsSync(absolute(path.join(ledger.sourceSnapshot.root, 'region'))),
'source or post region directory is missing');

const shellPackage = manifest.packages.find(({ key }) => key === 'b08-cover-shell');
const openingPackage = manifest.packages.find(({ key }) => key === 'b08-route-openings');
invariant(shellPackage && openingPackage, 'manifest packages are incomplete');
invariant(JSON.stringify(manifest.executionOrder?.forward)
    === JSON.stringify(['b08-cover-shell', 'b08-route-openings'])
  && JSON.stringify(manifest.executionOrder?.rollback)
    === JSON.stringify(['b08-route-openings', 'b08-cover-shell']),
'manifest execution order drifted');

const shellForward = parseOperations(shellPackage.forward);
const shellRollbackOperations = parseOperations(shellPackage.rollback);
const openingForward = parseOperations(openingPackage.forward);
const openingRollbackOperations = parseOperations(openingPackage.rollback);
invariant(shellForward.length === EXPECTED.shellOperationCount
  && openingForward.length === EXPECTED.openingOperationCount,
'operation counts drifted');
invariant(hashCells(shellForward.map(({ cell }) => cell)) === EXPECTED.shellTargetSha256
  && hashCells(openingForward.map(({ cell }) => cell)) === EXPECTED.openingTargetSha256,
'package target identities drifted');
const operatedCells = uniqueCells([
  ...shellForward.map(({ cell }) => cell),
  ...openingForward.map(({ cell }) => cell),
]);
invariant(operatedCells.length === EXPECTED.operatedCellCount
  && hashCells(operatedCells) === EXPECTED.operatedSha256,
'operated target union drifted');
invariant(shellRollbackOperations.every((operation, index) => {
  const forward = shellForward[index];
  return cellKey(operation.cell) === cellKey(forward.cell)
    && operation.fromState === forward.toState
    && operation.toState === forward.fromState;
}) && openingRollbackOperations.every((operation, index) => {
  const forward = openingForward[index];
  return cellKey(operation.cell) === cellKey(forward.cell)
    && operation.fromState === forward.toState
    && operation.toState === forward.fromState;
}), 'rollback files are not exact per-cell inverses');
invariant(sha256(operationBody(shellPackage.forward))
    === manifest.operations['b08-cover-shell'].forwardSha256
  && sha256(operationBody(shellPackage.rollback))
    === manifest.operations['b08-cover-shell'].rollbackSha256
  && sha256(operationBody(openingPackage.forward))
    === manifest.operations['b08-route-openings'].forwardSha256
  && sha256(operationBody(openingPackage.rollback))
    === manifest.operations['b08-route-openings'].rollbackSha256,
'manifest operation-body hashes drifted');

const construction = deriveB08ServiceTunnelConstruction(connectors);
const constructionKeys = new Set(construction.map(cellKey));
const externalBoundary = uniqueCells(construction.flatMap((cell) => (
  FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({
    x: cell.x + dx,
    y: cell.y + dy,
    z: cell.z + dz,
  }))
)).filter((cell) => !constructionKeys.has(cellKey(cell))));
const westEntrance = [];
for (let y = 72; y <= 75; y += 1) {
  for (let z = -630; z <= -625; z += 1) westEntrance.push({ x: 1947, y, z });
}
const westEntranceKeys = new Set(westEntrance.map(cellKey));
const b03ConstructionKeys = new Set(
  uniqueCells(b03.design.excavationReservation.cells).map(cellKey),
);
const b03Connection = externalBoundary.filter((cell) => (
  b03ConstructionKeys.has(cellKey(cell))
));
const b03ConnectionKeys = new Set(b03Connection.map(cellKey));
const shellDesign = externalBoundary.filter((cell) => (
  !westEntranceKeys.has(cellKey(cell)) && !b03ConnectionKeys.has(cellKey(cell))
));
const projectedVoid = uniqueCells([...construction, ...westEntrance]);
const geometry = {
  construction: classManifest(construction),
  externalBoundary: classManifest(externalBoundary),
  shellDesign: classManifest(shellDesign),
  westEntrance: classManifest(westEntrance),
  b03Connection: classManifest(b03Connection),
  projectedRouteAndEntranceVoid: classManifest(projectedVoid),
};
invariant(geometry.construction.cellCount === EXPECTED.constructionCellCount
  && geometry.construction.coordinateSetSha256 === EXPECTED.constructionSha256
  && geometry.externalBoundary.cellCount === EXPECTED.externalBoundaryCellCount
  && geometry.externalBoundary.coordinateSetSha256 === EXPECTED.externalBoundarySha256
  && geometry.shellDesign.cellCount === EXPECTED.shellDesignCellCount
  && geometry.shellDesign.coordinateSetSha256 === EXPECTED.shellDesignSha256
  && geometry.westEntrance.cellCount === EXPECTED.westEntranceCellCount
  && geometry.westEntrance.coordinateSetSha256 === EXPECTED.westEntranceSha256
  && geometry.b03Connection.cellCount === EXPECTED.b03ConnectionCellCount
  && geometry.b03Connection.coordinateSetSha256 === EXPECTED.b03ConnectionSha256
  && geometry.projectedRouteAndEntranceVoid.cellCount === EXPECTED.projectedVoidCellCount
  && geometry.projectedRouteAndEntranceVoid.coordinateSetSha256
    === EXPECTED.projectedVoidSha256,
're-derived geometry drifted');
invariant(shellDesign.length + westEntrance.length + b03Connection.length
  === externalBoundary.length,
'cover and apertures do not partition the external boundary');

const sourceReader = new AnvilReader(
  absolute(path.join(ledger.sourceSnapshot.root, 'region')),
);
const postReader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
const shellTargetKeys = new Set(shellForward.map(({ cell }) => cellKey(cell)));
const preservedEnclosure = shellDesign.filter((cell) => !shellTargetKeys.has(cellKey(cell)));
const preservedRecords = [];
for (const cell of preservedEnclosure) {
  preservedRecords.push({
    cell,
    sourceState: stateToCommandString(await sourceReader.blockState(cell.x, cell.y, cell.z)),
    state: stateToCommandString(await postReader.blockState(cell.x, cell.y, cell.z)),
  });
}
const preservedMismatches = preservedRecords.filter(({ sourceState, state }) => (
  state !== sourceState
));
const shellRecords = [];
for (const cell of shellDesign) {
  shellRecords.push({
    cell,
    expectedState: shellTargetKeys.has(cellKey(cell))
      ? TARGET_SHELL_STATE
      : preservedRecords.find((record) => cellKey(record.cell) === cellKey(cell))?.sourceState,
    state: stateToCommandString(await postReader.blockState(cell.x, cell.y, cell.z)),
  });
}
const shellMismatches = shellRecords.filter(({ expectedState, state }) => (
  state !== expectedState
));
const routeRecords = [];
for (const cell of projectedVoid) {
  routeRecords.push({
    cell,
    state: stateToCommandString(await postReader.blockState(cell.x, cell.y, cell.z)),
  });
}
const routeMismatches = routeRecords.filter(({ state }) => state !== TARGET_ROUTE_STATE);
const westEntranceMismatches = routeRecords.filter(({ cell, state }) => (
  westEntranceKeys.has(cellKey(cell)) && state !== TARGET_ROUTE_STATE
));
const b03ConnectionRecords = [];
for (const cell of b03Connection) {
  b03ConnectionRecords.push({
    cell,
    state: stateToCommandString(await postReader.blockState(cell.x, cell.y, cell.z)),
  });
}
const b03ConnectionMismatches = b03ConnectionRecords
  .filter(({ state }) => state !== TARGET_ROUTE_STATE);
const routeConnectivity = connectedComponentManifest(projectedVoid);

const operatedPostRecords = [];
for (const operation of [...shellForward, ...openingForward]) {
  operatedPostRecords.push({
    cell: operation.cell,
    expectedState: operation.toState,
    state: stateToCommandString(
      await postReader.blockState(operation.cell.x, operation.cell.y, operation.cell.z),
    ),
  });
}
const operatedPostMismatches = operatedPostRecords
  .filter(({ expectedState, state }) => expectedState !== state);

const shellExecution = executionEvidence(
  path.join(EVIDENCE_DIR, 'b08-cover-shell.forward-execution.json'),
  shellPackage.forward,
  EXPECTED.shellOperationCount,
);
const openingExecution = executionEvidence(
  path.join(EVIDENCE_DIR, 'b08-route-openings.forward-execution.json'),
  openingPackage.forward,
  EXPECTED.openingOperationCount,
);
const openingRollback = rollbackEvidence(
  path.join(EVIDENCE_DIR, 'b08-route-openings.rollback-poststate-preflight.json'),
  openingPackage.rollback,
  EXPECTED.openingOperationCount,
  postIdentity.sha256,
);
const shellRollback = rollbackEvidence(
  path.join(EVIDENCE_DIR, 'b08-cover-shell.rollback-poststate-preflight.json'),
  shellPackage.rollback,
  EXPECTED.shellOperationCount,
  postIdentity.sha256,
);
const rollbackStageNames = ledger.stages
  .filter(({ stage }) => stage.startsWith('rollback-poststate-preflight:'))
  .map(({ stage }) => stage);
const reverseRollbackOrderBound = JSON.stringify(rollbackStageNames) === JSON.stringify([
  'rollback-poststate-preflight:b08-route-openings',
  'rollback-poststate-preflight:b08-cover-shell',
])
  && openingRollback.sourceOverlays === null
  && shellRollback.sourceOverlays?.artifacts?.length === 1
  && samePath(shellRollback.sourceOverlays.artifacts[0].path, openingPackage.rollback)
  && shellRollback.sourceOverlays.passed === EXPECTED.openingOperationCount
  && shellRollback.sourceOverlays.failed === 0;

const priorForwardReportPath = path.join(
  path.dirname(PRIOR_ATTEMPT_LEDGER_PATH),
  'b08-cover-shell.forward-execution.json',
);
const priorCompensationPath = path.join(
  path.dirname(PRIOR_ATTEMPT_LEDGER_PATH),
  'b08-cover-shell.compensating-rollback-execution.json',
);
const priorRecoveryPreflightPath = path.join(
  path.dirname(PRIOR_ATTEMPT_LEDGER_PATH),
  'b08-cover-shell.rollback-recovery-source-preflight.json',
);
const priorForwardReport = readJson(priorForwardReportPath);
const priorCompensation = readJson(priorCompensationPath);
const priorRecoveryPreflight = readJson(priorRecoveryPreflightPath);
const expectedPriorFailurePoints = new Set([
  '2009,128,-653',
  '2011,128,-653',
]);
const observedPriorFailurePoints = new Set(priorRecoveryPreflight.failures.flatMap(
  ({ unexpected = [] }) => unexpected.map(({ point }) => point.join(',')),
));
const priorAttemptReconciled = priorLedger.transactionId
    === 'combined-zones-r07c-b08-service-tunnel-cover'
  && priorLedger.status === 'ROLLED_BACK_RECOVERY_VERIFICATION_FAILED_MANUAL_REVIEW'
  && priorForwardReport.status === 'failed'
  && priorForwardReport.strictNoop === true
  && priorForwardReport.successfulGroups === 2963
  && priorForwardReport.failedGroups === 1
  && priorForwardReport.unexpectedNoopCommands === 1
  && priorForwardReport.stoppedAtFirstFailedGroup === true
  && priorCompensation.status === 'complete'
  && priorCompensation.operationRole === 'rollback'
  && priorCompensation.successfulGroups === EXPECTED.shellOperationCount
  && priorCompensation.failedGroups === 0
  && priorCompensation.successfulCommands === 2963
  && priorCompensation.noopCommands === 2289
  && priorCompensation.unexpectedNoopCommands === 0
  && priorRecoveryIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && priorRecoveryIntake.packageIdentity.completeSaveSha256
    === manifest.source.completeSaveSha256
  && priorRecoveryPreflight.status === 'FAIL'
  && priorRecoveryPreflight.passed === 5250
  && priorRecoveryPreflight.failed === 2
  && observedPriorFailurePoints.size === expectedPriorFailurePoints.size
  && [...observedPriorFailurePoints].every((point) => expectedPriorFailurePoints.has(point));

const allLedgerStagesPass = ledger.stages.length > 0
  && ledger.stages.every(({ status }) => status === 'PASS');
const checks = [];
const check = (id, passed, detail) => checks.push({ id, status: passed ? 'PASS' : 'FAIL', detail });
check('R07C-QA-01-LEDGER-TERMINAL',
  ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE' && allLedgerStagesPass,
  `${ledger.stages.filter(({ status }) => status === 'PASS').length}/${ledger.stages.length} retry-ledger stages PASS.`);
check('R07C-QA-02-MANIFEST-AND-OPERATIONS-BOUND',
  ledger.manifest.sha256 === manifestBinding.sha256
    && manifest.target?.operatedUnion?.cellCount === EXPECTED.operatedCellCount
    && manifest.target?.operatedUnion?.coordinateSetSha256 === EXPECTED.operatedSha256,
  `Manifest ${manifest.manifestIdentity}; ${operatedCells.length} exact operated cells.`);
check('R07C-QA-03-POST-COMPLETE-SAVE-BOUND',
  postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
    && postIntake.packageIdentity.completeSaveSha256 === ledger.postSnapshot.completeSaveSha256,
  `Post complete-save ${ledger.postSnapshot.completeSaveSha256}.`);
check('R07C-QA-04-GEOMETRY-REPRODUCED',
  geometry.shellDesign.cellCount === EXPECTED.shellDesignCellCount
    && geometry.projectedRouteAndEntranceVoid.cellCount === EXPECTED.projectedVoidCellCount,
  `${geometry.shellDesign.cellCount} cover cells; ${geometry.projectedRouteAndEntranceVoid.cellCount} route/entrance cells.`);
check('R07C-QA-05-ALL-OPERATED-TARGET-STATES',
  operatedPostRecords.length === EXPECTED.operatedCellCount
    && operatedPostMismatches.length === 0,
  `${operatedPostRecords.length - operatedPostMismatches.length}/${operatedPostRecords.length} exact target states.`);
check('R07C-QA-06-COVER-ENCLOSURE',
  shellMismatches.length === 0
    && shellRecords.filter(({ state }) => state === TARGET_SHELL_STATE).length
      === EXPECTED.shellOperationCount
    && preservedEnclosure.length === EXPECTED.preservedEnclosureCellCount
    && preservedMismatches.length === 0,
  `${shellRecords.length - shellMismatches.length}/${shellRecords.length} exact cover states; ${preservedEnclosure.length} source-preserved tie-ins.`);
check('R07C-QA-07-ROUTE-AND-APERTURES-CLEAR',
  routeMismatches.length === 0
    && westEntranceMismatches.length === 0
    && b03ConnectionMismatches.length === 0,
  `${routeRecords.length - routeMismatches.length}/${routeRecords.length} route/entrance air; west 24/24; B03 20/20.`);
check('R07C-QA-08-ROUTE-CONTINUITY',
  routeConnectivity.componentCount === 1
    && routeConnectivity.largestComponentCellCount === EXPECTED.projectedVoidCellCount,
  `${routeConnectivity.componentCount} component; largest ${routeConnectivity.largestComponentCellCount}.`);
check('R07C-QA-09-STRICT-EXECUTION',
  shellExecution.passed && openingExecution.passed,
  `${shellExecution.successfulGroups + openingExecution.successfulGroups}/${EXPECTED.operatedCellCount} strict groups succeeded.`);
check('R07C-QA-10-REVERSE-ORDER-ROLLBACK',
  openingRollback.passed && shellRollback.passed && reverseRollbackOrderBound,
  `${openingRollback.passedGuards + shellRollback.passedGuards}/${EXPECTED.operatedCellCount} rollback guards PASS in openings-then-cover order.`);
check('R07C-QA-11-PRIOR-ATTEMPT-RECONCILED',
  priorAttemptReconciled,
  'Original strict stop, complete compensating rollback, recovery save, and exact two-snow rebind are bound as superseded provenance.');

const executionBindings = {
  shell: shellExecution,
  openings: openingExecution,
  openingRollback,
  shellRollback,
};
const completedReleaseIdentityPayload = {
  schemaVersion: 1,
  projectId: ledger.projectId,
  releaseNodeId: ledger.releaseNodeId,
  transactionId: ledger.transactionId,
  manifestIdentity: manifest.manifestIdentity,
  manifestFileSha256: manifestBinding.sha256,
  executionLedgerSha256: ledgerBinding.sha256,
  priorAttemptLedgerSha256: priorLedgerBinding.sha256,
  sourceCompleteSaveSha256: ledger.sourceSnapshot.completeSaveSha256,
  sourceRegionSha256: readJson(ledger.sourceSnapshot.identity.path).sha256,
  postCompleteSaveSha256: ledger.postSnapshot.completeSaveSha256,
  postRegionSha256: postIdentity.sha256,
  operatedCoordinateSetSha256: EXPECTED.operatedSha256,
  executionReportSha256: [shellExecution.sha256, openingExecution.sha256],
  reverseRollbackReportSha256: [openingRollback.sha256, shellRollback.sha256],
};
const completedReleaseIdentitySha256 = sha256(
  JSON.stringify(completedReleaseIdentityPayload),
);
const failedChecks = checks.filter(({ status }) => status !== 'PASS');
const qaPayload = {
  schemaVersion: 1,
  id: 'combined-zones-r07c-b08-service-tunnel-cover-post-release-qa',
  generatedAtUtc: GENERATED_AT,
  status: failedChecks.length === 0
    ? 'PASS_R07C_B08_SERVICE_TUNNEL_COVER_POST_RELEASE_ACCEPTED'
    : 'FAIL_R07C_B08_SERVICE_TUNNEL_COVER_POST_RELEASE',
  release: {
    transactionId: manifest.transactionId,
    releaseNodeId: manifest.releaseNodeId,
    scopeIds: manifest.scopeIds,
    manifestIdentity: manifest.manifestIdentity,
    completedReleaseIdentityPayload,
    completedReleaseIdentitySha256,
  },
  bindings: {
    ledger: { ...ledgerBinding, status: ledger.status },
    manifest: { ...manifestBinding, manifestIdentity: manifest.manifestIdentity },
    sourceCompleteSave: {
      root: ledger.sourceSnapshot.root,
      completeSaveSha256: ledger.sourceSnapshot.completeSaveSha256,
      intake: sourceIntakeBinding,
    },
    postCompleteSave: {
      root: ledger.postSnapshot.root,
      completeSaveSha256: ledger.postSnapshot.completeSaveSha256,
      regionSnapshotSha256: postIdentity.sha256,
      intake: postIntakeBinding,
      regionIdentity: postIdentityBinding,
    },
    priorAttempt: {
      ledger: { ...priorLedgerBinding, status: priorLedger.status },
      recoveryIntake: priorRecoveryIntakeBinding,
      forwardExecution: fileBinding(priorForwardReportPath),
      compensatingRollback: fileBinding(priorCompensationPath),
      recoveryPreflight: fileBinding(priorRecoveryPreflightPath),
      reconciled: priorAttemptReconciled,
    },
  },
  executionEvidence: {
    packages: [shellExecution, openingExecution],
    rollbackPoststatePreflights: [openingRollback, shellRollback],
    reverseRollbackOrderBound,
    strictSuccessfulGroupCount:
      shellExecution.successfulGroups + openingExecution.successfulGroups,
    strictFailedGroupCount: shellExecution.failedGroups + openingExecution.failedGroups,
    strictNoopCount: shellExecution.noopCommands + openingExecution.noopCommands,
  },
  geometry: {
    ...geometry,
    coverAndAperturesPartitionBoundary: true,
    operatedUnion: classManifest(operatedCells),
  },
  postState: {
    operatedTargets: {
      matchingCellCount: operatedPostRecords.length - operatedPostMismatches.length,
      mismatchCellCount: operatedPostMismatches.length,
      listedMismatches: operatedPostMismatches.slice(0, 100),
    },
    cover: {
      expectedPolishedDioriteCellCount: EXPECTED.shellOperationCount,
      expectedSourcePreservedCellCount: EXPECTED.preservedEnclosureCellCount,
      stateCensus: stateCensus(shellRecords),
      preservedSourceStateCensus: stateCensus(preservedRecords),
      matchingCellCount: shellRecords.length - shellMismatches.length,
      mismatchCellCount: shellMismatches.length,
      listedMismatches: shellMismatches.slice(0, 100),
    },
    routeAndEntrances: {
      expectedState: TARGET_ROUTE_STATE,
      stateCensus: stateCensus(routeRecords),
      matchingCellCount: routeRecords.length - routeMismatches.length,
      mismatchCellCount: routeMismatches.length,
      westEntranceAirCellCount:
        westEntrance.length - westEntranceMismatches.length,
      b03ConnectionAirCellCount:
        b03Connection.length - b03ConnectionMismatches.length,
      connectivity: routeConnectivity,
      listedMismatches: routeMismatches.slice(0, 100),
    },
  },
  checks,
  summary: {
    passed: failedChecks.length === 0,
    checkCount: checks.length,
    passCount: checks.length - failedChecks.length,
    failCount: failedChecks.length,
    operatedMatchingCellCount:
      operatedPostRecords.length - operatedPostMismatches.length,
    coverPolishedDioriteCellCount:
      shellRecords.filter(({ state }) => state === TARGET_SHELL_STATE).length,
    coverSourcePreservedCellCount: preservedEnclosure.length - preservedMismatches.length,
    routeAirCellCount: routeRecords.filter(({ state }) => state === TARGET_ROUTE_STATE).length,
    westEntranceAirCellCount: westEntrance.length - westEntranceMismatches.length,
    b03ConnectionAirCellCount: b03Connection.length - b03ConnectionMismatches.length,
    routeComponentCount: routeConnectivity.componentCount,
    rollbackGuardPassCount: openingRollback.passedGuards + shellRollback.passedGuards,
  },
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    readOnlyAnvilInputs: true,
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(qaPayload));
const report = { ...qaPayload, qaPayloadSha256 };
fs.mkdirSync(path.dirname(absolute(OUT_PATH)), { recursive: true });
fs.mkdirSync(path.dirname(absolute(MARKDOWN_PATH)), { recursive: true });
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);

const markdown = `# CZ-R07C B08 service-tunnel cover post-release QA

**Status:** ${report.status}  
**QA payload identity:** \`${qaPayloadSha256}\`  
**Completed release identity:** \`${completedReleaseIdentitySha256}\`  
**Execution ledger:** \`${ledgerBinding.sha256}\`  
**Post complete save:** \`${ledger.postSnapshot.completeSaveSha256}\`

## Result

| Test | Result |
|---|---:|
| Exact operated targets | ${report.summary.operatedMatchingCellCount.toLocaleString()} / ${EXPECTED.operatedCellCount.toLocaleString()} |
| Polished-diorite cover cells | ${report.summary.coverPolishedDioriteCellCount.toLocaleString()} / ${EXPECTED.shellOperationCount.toLocaleString()} |
| Source-preserved enclosure | ${report.summary.coverSourcePreservedCellCount} / ${EXPECTED.preservedEnclosureCellCount} |
| Route and west entrance | ${report.summary.routeAirCellCount.toLocaleString()} / ${EXPECTED.projectedVoidCellCount.toLocaleString()} exact air |
| West entrance | ${report.summary.westEntranceAirCellCount} / ${EXPECTED.westEntranceCellCount} exact air |
| B03 connection | ${report.summary.b03ConnectionAirCellCount} / ${EXPECTED.b03ConnectionCellCount} exact air |
| Route connectivity | ${report.summary.routeComponentCount} face-connected component |
| Strict execution | ${report.executionEvidence.strictSuccessfulGroupCount.toLocaleString()} succeeded / ${report.executionEvidence.strictFailedGroupCount} failed / ${report.executionEvidence.strictNoopCount} no-op |
| Reverse rollback | ${report.summary.rollbackGuardPassCount.toLocaleString()} / ${EXPECTED.operatedCellCount.toLocaleString()} guards PASS |

## Checks

| Check | Status | Detail |
|---|---|---|
${checks.map(({ id, status, detail }) => `| ${id} | **${status}** | ${detail} |`).join('\n')}

## Attempt reconciliation

The first transaction stopped on strict no-op after 2,963 successful groups,
then completed its compensating rollback. The recovery save showed only the
two exact one-layer-snow shell mismatches that required the additive current-
source rebind. That first ledger remains failed/compensated provenance; this
accepted identity is the later recovery-bound retry and its sealed post save.

This verifier read only sealed source/post Anvil saves and hash-bound evidence.
It made no live call and performed no world edit.
`;
fs.writeFileSync(absolute(MARKDOWN_PATH), markdown);

console.log(JSON.stringify({
  status: report.status,
  qaPayloadSha256,
  completedReleaseIdentitySha256,
  operatedTargets: `${report.summary.operatedMatchingCellCount}/${EXPECTED.operatedCellCount}`,
  cover: `${report.summary.coverPolishedDioriteCellCount}/${EXPECTED.shellOperationCount}`,
  routeAir: `${report.summary.routeAirCellCount}/${EXPECTED.projectedVoidCellCount}`,
  reverseRollback: `${report.summary.rollbackGuardPassCount}/${EXPECTED.operatedCellCount}`,
  priorAttemptReconciled,
  output: relative(OUT_PATH),
  markdown: relative(MARKDOWN_PATH),
}, null, 2));
if (failedChecks.length) process.exitCode = 1;
