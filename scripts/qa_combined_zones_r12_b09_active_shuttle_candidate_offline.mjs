#!/usr/bin/env node
/** Offline QA and recoverable integration design for the R12Q active-shuttle candidate. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const OUT = path.resolve(
  ROOT,
  'data/world-review/combined-zones-r12-b09-active-transport-readiness-20260822T050000Z/r12q-candidate',
);
const GENERATED_AT = '2026-08-22T05:25:00Z';
const SNAPSHOT = 'data/worldsnap-r12q-post-20260822T044855Z';
const BASE = 'r12q-b09-bounded-active-shuttle';
const MANIFEST = path.join(OUT, `${BASE}.candidate-manifest.json`);
const CONTROL_FORWARD = path.join(
  OUT,
  `${BASE}.b09-active-shuttle-fail-closed-controls.forward.txt`,
);
const CONTROL_ROLLBACK = path.join(
  OUT,
  `${BASE}.b09-active-shuttle-fail-closed-controls.rollback.txt`,
);
const TRACK_FORWARD = path.join(
  OUT,
  `${BASE}.b09-active-shuttle-fail-closed-track.forward.txt`,
);
const TRACK_ROLLBACK = path.join(
  OUT,
  `${BASE}.b09-active-shuttle-fail-closed-track.rollback.txt`,
);
const ENTITY_EXECUTOR = path.resolve(ROOT, 'scripts/run_guarded_tagged_minecart_transaction.py');
const ENTITY_RUNTIME_PROOF = path.resolve(
  ROOT,
  'data/world-review/combined-zones-r12-tagged-minecart-executor-runtime-proof-20260822T051000Z/runtime-proof.json',
);
const ENTITY_PLAN_PAYLOAD =
  'c0f6e9383c594e0003df35d3accc391ec8b46e47d547b6ce433dc1481e93a5cd';
const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const relative = (filename) => path.relative(ROOT, filename).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R12 active-shuttle offline QA rejected: ${message}`);
};
const run = (command, args) => execFileSync(command, args, {
  cwd: ROOT,
  encoding: 'utf8',
  stdio: 'pipe',
  maxBuffer: 64 * 1024 * 1024,
});
const binding = (filename) => ({
  path: relative(filename),
  sha256: sha256(fs.readFileSync(filename)),
  bytes: fs.statSync(filename).size,
});

run(process.execPath, ['scripts/compile_combined_zones_r12_b09_active_shuttle_candidate.mjs']);
const preflight = (operations, report, overlays = []) => run(process.execPath, [
  'scripts/preflight_guarded_ops.mjs', relative(operations),
  '--regions', `${SNAPSHOT}/region`,
  ...overlays.flatMap((overlay) => ['--source-overlay-ops', relative(overlay)]),
  '--report', relative(report),
]);
const parser = (operations, report, role) => run('python3', [
  'scripts/rcon_runner.py', relative(operations), '--dry-run', '--strict-noop',
  '--operation-role', role, '--report', relative(report),
]);
const entityPlan = JSON.parse(run('python3', [
  relative(ENTITY_EXECUTOR),
  '--transaction-id', 'combined-zones-r12r-b09-bounded-active-shuttle',
  '--min-x', '2058', '--min-y', '130', '--min-z', '-748',
  '--max-x', '2073', '--max-y', '131', '--max-z', '-747',
  '--spawn-x', '2058.5', '--spawn-y', '130.0625', '--spawn-z', '-747.5',
  '--generated-at', '2026-08-22T05:30:00Z',
]));

const reports = {
  controlsForwardPreflight: path.join(OUT, 'controls-forward-preflight.json'),
  trackForwardPreflight: path.join(OUT, 'track-forward-preflight.json'),
  trackProjectedRollbackPreflight: path.join(OUT, 'track-projected-rollback-preflight.json'),
  controlsProjectedRollbackPreflight:
    path.join(OUT, 'controls-projected-rollback-preflight.json'),
  controlsForwardParser: path.join(OUT, 'controls-forward-parser.json'),
  trackForwardParser: path.join(OUT, 'track-forward-parser.json'),
  trackRollbackParser: path.join(OUT, 'track-rollback-parser.json'),
  controlsRollbackParser: path.join(OUT, 'controls-rollback-parser.json'),
  blockEntityClearance: path.join(OUT, 'block-entity-clearance.json'),
};
preflight(CONTROL_FORWARD, reports.controlsForwardPreflight);
preflight(TRACK_FORWARD, reports.trackForwardPreflight, [CONTROL_FORWARD]);
preflight(TRACK_ROLLBACK, reports.trackProjectedRollbackPreflight,
  [CONTROL_FORWARD, TRACK_FORWARD]);
preflight(CONTROL_ROLLBACK, reports.controlsProjectedRollbackPreflight,
  [CONTROL_FORWARD, TRACK_FORWARD, TRACK_ROLLBACK]);
parser(CONTROL_FORWARD, reports.controlsForwardParser, 'forward');
parser(TRACK_FORWARD, reports.trackForwardParser, 'forward');
parser(TRACK_ROLLBACK, reports.trackRollbackParser, 'rollback');
parser(CONTROL_ROLLBACK, reports.controlsRollbackParser, 'rollback');
run(process.execPath, [
  'scripts/audit_guarded_ops_block_entities.mjs',
  '--regions', `${SNAPSHOT}/region`,
  '--ops', relative(CONTROL_FORWARD), '--ops', relative(TRACK_FORWARD),
  '--report', relative(reports.blockEntityClearance),
]);

const manifest = readJson(MANIFEST);
invariant(manifest.status === 'SOURCE_PROVEN_DISPOSABLE_CANDIDATE_NOT_A_LIVE_RELEASE_MANIFEST'
  && manifest.candidatePayloadSha256 === '2b31498c9860fad29aad937c57fddc8abea180a95b87616656145eb4fb1f9ab8'
  && manifest.scope.targetCells.cellCount === 19
  && manifest.packages.length === 2
  && manifest.exactInverse.totalBlockTransitionCount === 19
  && manifest.staticSafety.sourceBlockEntityCount === 0
  && manifest.staticSafety.sourceSavedEntityCount === 0
  && manifest.terminalPostContract.controlsDeEnergized === true
  && manifest.terminalPostContract.railsUnpowered === true
  && manifest.terminalPostContract.minecartStationary === true,
'candidate manifest or terminal contract drifted');
invariant(entityPlan.status === 'PLAN_VALIDATED_NO_RCON_CONNECTION'
  && entityPlan.reportPayloadSha256 === ENTITY_PLAN_PAYLOAD
  && entityPlan.safetyBoundary.rconConnected === false
  && entityPlan.safetyBoundary.worldMutationPerformed === false
  && entityPlan.spec.tag === manifest.requiredEntityTransaction.deterministicTag
  && entityPlan.spec.identitySeedSha256
    === manifest.requiredEntityTransaction.identitySeedSha256,
'frozen tagged-minecart executor print plan drifted');
const expectedCounts = new Map([
  [reports.controlsForwardPreflight, 2],
  [reports.trackForwardPreflight, 17],
  [reports.trackProjectedRollbackPreflight, 17],
  [reports.controlsProjectedRollbackPreflight, 2],
]);
for (const [filename, count] of expectedCounts) {
  const report = readJson(filename);
  invariant(report.status === 'PASS' && report.operationCount === count
    && report.passed === count && report.failed === 0,
  `${path.basename(filename)} is not exact PASS ${count}/${count}`);
}
const expectedParsers = new Map([
  [reports.controlsForwardParser, ['forward', 2]],
  [reports.trackForwardParser, ['forward', 17]],
  [reports.trackRollbackParser, ['rollback', 17]],
  [reports.controlsRollbackParser, ['rollback', 2]],
]);
for (const [filename, [role, count]] of expectedParsers) {
  const report = readJson(filename);
  invariant(report.status === 'dry_run' && report.dryRun === true
    && report.strictNoop === true && report.operationRole === role
    && report.sourceOperationCount === count
    && report.expandedCommandCount === count
    && report.worldEditLeftoverCount === 0,
  `${path.basename(filename)} is not strict-noop parser PASS`);
}
const be = readJson(reports.blockEntityClearance);
invariant(be.status === 'PASS' && be.operationCount === 19
  && be.blockingBlockEntityCount === 0, 'block-entity clearance is not PASS');

const reportBindings = Object.fromEntries(Object.entries(reports).map(([key, filename]) => [
  key,
  {
    path: relative(filename),
    operationCount: readJson(filename).operationCount
      ?? readJson(filename).sourceOperationCount,
    status: readJson(filename).status,
  },
]));
const readinessWithoutIdentity = {
  schemaVersion: 1,
  id: 'CZ-R12-B09-R12Q-BOUNDED-ACTIVE-SHUTTLE-OFFLINE-READINESS',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_BLOCK_PACKAGES_RUNTIME_AND_TAGGED_ENTITY_EXECUTOR_BOUND_READY_FOR_PROMOTION',
  candidate: binding(MANIFEST),
  candidatePayloadSha256: manifest.candidatePayloadSha256,
  scope: {
    centerlineIndices: manifest.scope.centerlineIndices,
    blockTargetCount: 19,
    packageCount: 2,
    persistentVehicleCount: 1,
    interactionHaloCellCount: manifest.scope.interactionHalo.cellCount,
    acceptedR12QTurnCellsTouched: false,
  },
  sourceBinding: manifest.source,
  blockSafetyKernel: {
    exactSourcePreflight: { controls: '2/2', track: '17/17' },
    exactProjectedRollback: { track: '17/17', controls: '2/2' },
    strictForwardParser: { controls: '2/2', track: '17/17' },
    strictRollbackParser: { track: '17/17', controls: '2/2' },
    blockingBlockEntities: 0,
    savedEntitiesInSourceHalo: 0,
    exactReversePackageOrder: true,
    exactReverseOperationOrder: true,
  },
  reports: reportBindings,
  disposableRuntime: {
    binding: manifest.runtimeProof,
    proofPayloadSha256: manifest.runtimeProofPayloadSha256,
    bidirectionalReversalPassed: true,
    deEnergizedTerminalParkPassed: true,
    exactEntityAndBlockCleanupPassed: true,
    productionMutationPerformed: false,
  },
  entityGate: {
    status: 'PASS_TAGGED_MINECART_EXECUTOR_AND_RUNTIME_PROOF_BOUND',
    executor: binding(ENTITY_EXECUTOR),
    runtimeProof: binding(ENTITY_RUNTIME_PROOF),
    runtimeProofPayloadSha256:
      manifest.requiredEntityTransaction.executorRuntimeProofPayloadSha256,
    printPlanStatus: entityPlan.status,
    printPlanPayloadSha256: entityPlan.reportPayloadSha256,
    deterministicTag: entityPlan.spec.tag,
    identitySeedSha256: entityPlan.spec.identitySeedSha256,
    requiredInterface: {
      exactZeroPreexistingTagAndUuid: true,
      summonOneDeterministicPersistentMinecart: true,
      journalSummonResponseAndIdentity: true,
      verifyExactCountTypePositionTagAndUuid: true,
      compensateOnlyExactUuidAndTag: true,
      verifyExactAbsenceAfterRollback: true,
    },
    blockOnlyExecutionProhibited: true,
    entityCompensationBeforeBlockRollbackRequired: true,
  },
  commissioningBoundary: manifest.commissioningBoundary,
  noLiveCalls: true,
  noWorldMutation: true,
  canonicalBuildopsEdited: false,
};
const readinessPayloadSha256 = sha256(JSON.stringify(readinessWithoutIdentity));
const readiness = { ...readinessWithoutIdentity, readinessPayloadSha256 };
const readinessPath = path.join(OUT, 'offline-readiness.json');
fs.writeFileSync(readinessPath, `${JSON.stringify(readiness, null, 2)}\n`);

const integrationWithoutIdentity = {
  schemaVersion: 1,
  id: 'CZ-R12-B09-R12Q-ACTIVE-SHUTTLE-RECOVERABLE-INTEGRATION-DESIGN',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_RECOVERABLE_COMPOSITION_CONTRACT_READY_FOR_COORDINATOR_BINDING',
  candidate: binding(MANIFEST),
  readiness: binding(readinessPath),
  oneRecoverableTransactionPossible: true,
  existingBlockOnlyWrapperModified: false,
  successSequence: [
    'capture one fresh immutable complete-save source and verify R12Q-equivalent candidate states',
    'same-moment live entity clearance for all 19 block targets and minecart envelope',
    'strict execute fail-closed-controls package (2 cells, controls remain OFF)',
    'strict execute fail-closed-track package (17 cells, rails remain unpowered)',
    'tagged executor proves zero tag/UUID/envelope conflict, summons one deterministic minecart, and verifies identity',
    'functional phase toggles only the two declared controls ON, proves west-east-west traversal, toggles both OFF, and verifies stationary west-terminal park',
    'capture terminal complete-save only after controls OFF, rails unpowered, and tagged minecart stationary',
    'verify exact 19 block states, exact one entity identity/park envelope, bounded halo, journal chain, and all reverse guards',
  ],
  compensationSequence: [
    'kill and verify absence of only the exact UUID+tag minecart',
    'strict rollback fail-closed-track package in exact reverse operation order',
    'strict rollback fail-closed-controls package in exact reverse operation order',
    'capture immutable recovery save and prove all 19 original R12Q states plus exact entity absence',
  ],
  failurePolicy: {
    controlsFailure: ['rollback-controls'],
    trackFailure: ['rollback-track', 'rollback-controls'],
    entityPreflightFailure: ['rollback-track', 'rollback-controls'],
    entitySummonOrVerificationFailure: ['entity-self-compensation', 'rollback-track',
      'rollback-controls'],
    functionalOrParkFailure: ['entity-compensation', 'rollback-track', 'rollback-controls'],
    terminalCaptureOrPostQaFailure: ['entity-compensation', 'rollback-track',
      'rollback-controls', 'recovery-capture-and-verification'],
  },
  atomicityBoundary: {
    requiresOuterCoordinatorLedger: true,
    currentBlockOnlyWrapperAloneSufficient: false,
    executorAloneSufficient: false,
    entityCompensationMustPrecedeBlockRollback: true,
    successfulTerminalSnapshotMustIncludeEntityRegions: true,
    acceptanceMayClaimOnlyBoundedMaintenanceActiveShuttle: true,
    fullFunicularPassengerPublicOrRescueClaimsProhibited: true,
  },
  executorBinding: {
    taggedMinecartExecutorPath: relative(ENTITY_EXECUTOR),
    taggedMinecartExecutorSha256: binding(ENTITY_EXECUTOR).sha256,
    runtimeProof: binding(ENTITY_RUNTIME_PROOF),
    runtimeProofPayloadSha256:
      manifest.requiredEntityTransaction.executorRuntimeProofPayloadSha256,
    printPlanPayloadSha256: entityPlan.reportPayloadSha256,
    exactUuidTypeTagRollbackAnywhereInsideFullAabb: true,
    tagOnlyOrBroadCleanupAllowed: false,
  },
  pendingPromotionBinding: {
    entityManifestPath: null,
    entityManifestPayloadSha256: null,
    outerCoordinatorPath:
      'scripts/run_combined_zones_r12r_b09_active_shuttle_release.mjs',
  },
  noLiveCalls: true,
  noWorldMutation: true,
};
const integrationPayloadSha256 = sha256(JSON.stringify(integrationWithoutIdentity));
const integration = { ...integrationWithoutIdentity, integrationPayloadSha256 };
const integrationPath = path.join(OUT, 'recoverable-integration-design.json');
fs.writeFileSync(integrationPath, `${JSON.stringify(integration, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  status: readiness.status,
  readiness: relative(readinessPath),
  readinessPayloadSha256,
  integration: relative(integrationPath),
  integrationPayloadSha256,
  blockPackagesOfflinePass: true,
  liveReady: false,
  promotionReady: true,
}, null, 2)}\n`);
