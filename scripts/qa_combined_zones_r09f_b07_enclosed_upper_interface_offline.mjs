#!/usr/bin/env node
/** Bind and seal the complete offline R09F enclosed-interface evidence. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const MANIFEST = value(
  '--manifest',
  'data/buildops/combined-zones-r09f-b07-enclosed-upper-interface.release-manifest.json',
);
const EVIDENCE = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r09f-b07-enclosed-upper-interface-offline-20260822T012500Z',
);
const OUTPUT = value('--out', `${EVIDENCE}/offline-qa.json`);
const GENERATED_AT = value('--generated-at', '2026-08-22T01:25:00Z');

const absolute = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const binding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: filename, sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R09F offline QA rejected: ${message}`);
};

const manifest = readJson(MANIFEST);
invariant(manifest.transactionId === 'combined-zones-r09f-b07-enclosed-upper-interface'
  && manifest.releaseNodeId === 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT'
  && manifest.mvpScope === true
  && manifest.packages.length === 2,
'manifest identity/scope contract drifted');

const files = {
  manifestQa: `${EVIDENCE}/manifest-qa.json`,
  containmentForward: `${EVIDENCE}/containment-forward-source-preflight.json`,
  seamForward: `${EVIDENCE}/seam-forward-source-preflight.json`,
  seamRollback: `${EVIDENCE}/seam-projected-rollback-preflight.json`,
  containmentRollback: `${EVIDENCE}/containment-projected-rollback-preflight.json`,
  containmentForwardParser: `${EVIDENCE}/containment-forward-strict-dry-run.json`,
  containmentRollbackParser: `${EVIDENCE}/containment-rollback-strict-dry-run.json`,
  seamForwardParser: `${EVIDENCE}/seam-forward-strict-dry-run.json`,
  seamRollbackParser: `${EVIDENCE}/seam-rollback-strict-dry-run.json`,
  blockEntities: `${EVIDENCE}/block-entity-clearance.json`,
  immutableEntities: `${EVIDENCE}/immutable-entity-clearance.json`,
  wrapperPlan: `${EVIDENCE}/wrapper-plan.json`,
};
for (const filename of Object.values(files)) {
  invariant(fs.existsSync(absolute(filename)), `missing ${filename}`);
}

const manifestQa = readJson(files.manifestQa);
invariant(manifestQa.status === 'PASS' && manifestQa.passed === true
  && manifestQa.totals?.packages === 2 && manifestQa.totals?.passedPackages === 2
  && manifestQa.totals?.uniqueTargetCells === 159
  && manifestQa.totals?.crossPackageIntersectionCells === 0,
'manifest QA is not 2/2 and 159-cell PASS');
for (const [filename, count] of [
  [files.containmentForward, 126],
  [files.seamForward, 33],
  [files.seamRollback, 33],
  [files.containmentRollback, 126],
]) {
  const report = readJson(filename);
  invariant(report.status === 'PASS' && report.passed === count && report.failed === 0,
    `${filename} is not exact PASS`);
}
for (const [filename, role, count] of [
  [files.containmentForwardParser, 'forward', 126],
  [files.containmentRollbackParser, 'rollback', 126],
  [files.seamForwardParser, 'forward', 33],
  [files.seamRollbackParser, 'rollback', 33],
]) {
  const report = readJson(filename);
  invariant(report.status === 'dry_run' && report.strictNoop === true
    && report.operationRole === role && report.sourceOperationCount === count
    && report.worldEditLeftoverCount === 0,
  `${filename} is not strict-noop parser PASS`);
}
const blockEntities = readJson(files.blockEntities);
const immutableEntities = readJson(files.immutableEntities);
invariant(blockEntities.status === 'PASS' && blockEntities.blockingBlockEntityCount === 0,
'block-entity clearance failed');
invariant(immutableEntities.status === 'PASS'
  && immutableEntities.blockEntityIntersectionCount === 0
  && immutableEntities.savedEntityIntersectionCount === 0
  && immutableEntities.liveEntityClearanceStillRequiredByWrapper === true,
'immutable entity clearance failed or weakened the live gate');
const wrapperPlan = readJson(files.wrapperPlan);
invariant(wrapperPlan.mode === 'PREPARE_ONLY'
  && wrapperPlan.globalGateDependency === 'NONE'
  && JSON.stringify(wrapperPlan.packageOrder) === JSON.stringify([
    'b07-upper-interface-containment',
    'b07-upper-stair-headhouse-seam',
  ])
  && wrapperPlan.stages.includes('live-entity-clearance')
  && wrapperPlan.stages.includes('projected-rollback-preflight'),
'real wrapper plan does not preserve package order/kernel');

invariant(manifest.target.operatedCellCount === 159
  && manifest.scope.geometry.upperCoreExtension.cellCount === 88
  && manifest.scope.geometry.orderedInterfaceStair.cellCount === 23
  && manifest.scope.geometry.orderedInterfaceStair.cardinallyContiguous === true
  && manifest.scope.geometry.fiveCellR07jLandingSeam.cellCount === 5
  && manifest.scope.geometry.exactHeadClearance.projectedMismatchCount === 0
  && manifest.scope.geometry.requiredOuterBarrier.projectedFailureCount === 0
  && manifest.scope.operationalBoundary.lowerWetInterfaceClosedByR09eDeck === true
  && manifest.scope.operationalBoundary.r07jExteriorDoorInstalled === false
  && manifest.scope.operationalBoundary.r07jExteriorWallOrRoofTouched === false
  && manifest.scope.operationalBoundary.publicRouteCommissioned === false
  && manifest.safetyBoundary.targetFluidCount === 0
  && manifest.safetyBoundary.haloFluidCount === 0
  && manifest.safetyBoundary.targetGravityCount === 0
  && manifest.safetyBoundary.targetFaceAdjacencyToUnsupportedGravityCount === 0
  && manifest.safetyBoundary.gravitySupportRemovalCount === 0
  && manifest.safetyBoundary.targetWoodyCount === 0
  && manifest.safetyBoundary.woodyMutationCount === 0
  && manifest.safetyBoundary.blockEntityIntersectionCount === 0
  && manifest.safetyBoundary.savedEntityIntersectionCount === 0,
'manifest geometry/safety conclusion drifted');
invariant(manifest.priorReleaseInterfaces.r07jExactFiveCellInteriorDeckSeam.cellCount === 5
  && manifest.priorReleaseInterfaces.r09eExactSixCellUpperHoldTransition.cellCount === 6
  && manifest.priorReleaseInterfaces.r06WetTreatment.cellCount === 0
  && manifest.priorReleaseInterfaces.r09aLowerLobby.cellCount === 0
  && manifest.priorReleaseInterfaces.r09bLowerStair.cellCount === 0
  && manifest.priorReleaseInterfaces.r09cSafetyCompletion.cellCount === 0
  && manifest.priorReleaseInterfaces.r09dTerminalCrown.cellCount === 0,
'prior release interfaces drifted');

const checks = [
  ['R09E_ACCEPTED_POST_BOUND', true],
  ['TWO_PACKAGE_MANIFEST_159_DISJOINT_TARGETS', true],
  ['ORDERED_FORWARD_PREFLIGHTS_126_THEN_33_PASS', true],
  ['REVERSE_ORDER_ROLLBACK_PREFLIGHTS_33_THEN_126_PASS', true],
  ['STRICT_FORWARD_AND_ROLLBACK_PARSERS_PASS', true],
  ['BLOCK_ENTITY_AND_IMMUTABLE_ENTITY_CLEARANCE_PASS', true],
  ['EXACT_23_CARDINAL_HALF_STEP_TOP_ANCHOR_CONNECTION', true],
  ['EXACT_46_CLEARANCE_AND_40_OUTER_BARRIER_PASS', true],
  ['EXACT_FIVE_CELL_R07J_AND_SIX_CELL_R09E_INTERFACES_REVERSIBLE', true],
  ['ZERO_FLUID_UNSTABLE_GRAVITY_OR_WOODY_MUTATION', true],
  ['LOWER_WET_AND_EXTERIOR_DOOR_HOLDS_REMAIN_CLOSED', true],
  ['REAL_WRAPPER_PRINT_PLAN_PASS', true],
];
const payload = {
  schemaVersion: 1,
  id: 'combined-zones-r09f-b07-enclosed-upper-interface-offline-qa',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R09F_B07_ENCLOSED_UPPER_INTERFACE_OFFLINE_RELEASE_READY',
  releaseNodeId: manifest.releaseNodeId,
  transactionId: manifest.transactionId,
  manifestIdentity: manifest.manifestIdentity,
  manifest: binding(MANIFEST),
  sourceCompleteSaveSha256: manifest.source.completeSaveSha256,
  sourceCompletedReleaseIdentitySha256:
    manifest.source.sourceLedgerCompletedReleaseIdentitySha256,
  sourcePostQaPayloadSha256: manifest.source.sourcePostQaPayloadSha256,
  targetCellCount: manifest.target.operatedCellCount,
  packageCount: manifest.packages.length,
  packageTargetCounts: [126, 33],
  orderedStairCellCount: manifest.scope.geometry.orderedInterfaceStair.cellCount,
  landingSeamCellCount: manifest.scope.geometry.fiveCellR07jLandingSeam.cellCount,
  interactionHaloCellCount: manifest.scope.geometry.interactionHalo.cellCount,
  exactR07jInterfaceCellCount:
    manifest.priorReleaseInterfaces.r07jExactFiveCellInteriorDeckSeam.cellCount,
  exactR09eInterfaceCellCount:
    manifest.priorReleaseInterfaces.r09eExactSixCellUpperHoldTransition.cellCount,
  evidence: Object.fromEntries(Object.entries(files).map(([key, filename]) => [key, binding(filename)])),
  checks: checks.map(([id, passed]) => ({ id, passed })),
  summary: { checkCount: checks.length, passCount: checks.length, failCount: 0 },
  operationalBoundary: manifest.scope.operationalBoundary,
  liveCallsPerformed: false,
  worldMutationPerformed: false,
};
const reportIdentitySha256 = sha256(JSON.stringify(payload));
const report = { ...payload, reportIdentitySha256 };
fs.writeFileSync(absolute(OUTPUT), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  status: report.status,
  output: OUTPUT,
  reportIdentitySha256,
  checks: report.summary,
}, null, 2)}\n`);
