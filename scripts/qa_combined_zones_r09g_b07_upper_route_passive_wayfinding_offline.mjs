#!/usr/bin/env node
/** Bind and seal the complete offline R09G B07 passive-wayfinding evidence. */

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
  'data/buildops/combined-zones-r09g-b07-upper-route-passive-wayfinding.release-manifest.json',
);
const EVIDENCE = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r09g-b07-upper-route-passive-wayfinding-offline-20260822T015500Z',
);
const OUTPUT = value('--out', `${EVIDENCE}/offline-qa.json`);
const GENERATED_AT = value('--generated-at', '2026-08-22T01:55:00Z');

const absolute = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const binding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: filename, sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R09G offline QA rejected: ${message}`);
};

const manifest = readJson(MANIFEST);
invariant(manifest.transactionId === 'combined-zones-r09g-b07-upper-route-passive-wayfinding'
  && manifest.releaseNodeId === 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT'
  && manifest.mvpScope === true
  && manifest.packages.length === 1,
'manifest identity/scope contract drifted');

const files = {
  manifestQa: `${EVIDENCE}/manifest-qa.json`,
  forwardPreflight: `${EVIDENCE}/forward-source-preflight.json`,
  rollbackPreflight: `${EVIDENCE}/projected-rollback-preflight.json`,
  forwardParser: `${EVIDENCE}/forward-strict-dry-run.json`,
  rollbackParser: `${EVIDENCE}/rollback-strict-dry-run.json`,
  blockEntities: `${EVIDENCE}/block-entity-clearance.json`,
  immutableEntities: `${EVIDENCE}/immutable-entity-clearance.json`,
  wrapperPlan: `${EVIDENCE}/wrapper-plan.json`,
};
for (const filename of Object.values(files)) {
  invariant(fs.existsSync(absolute(filename)), `missing ${filename}`);
}

const manifestQa = readJson(files.manifestQa);
invariant(manifestQa.status === 'PASS' && manifestQa.passed === true
  && manifestQa.totals?.packages === 1 && manifestQa.totals?.passedPackages === 1
  && manifestQa.totals?.uniqueTargetCells === 8
  && manifestQa.totals?.crossPackageIntersectionCells === 0,
'manifest QA is not one-package/eight-target PASS');
for (const filename of [files.forwardPreflight, files.rollbackPreflight]) {
  const report = readJson(filename);
  invariant(report.status === 'PASS' && report.passed === 8 && report.failed === 0,
    `${filename} is not exact 8/8 PASS`);
}
for (const [filename, role] of [
  [files.forwardParser, 'forward'], [files.rollbackParser, 'rollback'],
]) {
  const report = readJson(filename);
  invariant(report.status === 'dry_run' && report.strictNoop === true
    && report.operationRole === role && report.sourceOperationCount === 8
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
    'b07-upper-route-passive-wall-wayfinding',
  ])
  && wrapperPlan.stages.includes('live-entity-clearance')
  && wrapperPlan.stages.includes('projected-rollback-preflight'),
'real wrapper plan does not preserve the one-package kernel');

const geometry = manifest.scope.geometry;
const boundary = manifest.scope.operationalBoundary;
const safety = manifest.safetyAudit;
invariant(manifest.target.operatedUnion.cellCount === 8
  && manifest.target.operatedUnion.coordinateSetSha256
    === '2daad521ed5e94bea26f765fb19c394d460355315fe01e27b9b586c6e0898e87'
  && geometry.acceptedOrderedUpperStairConstruction.cellCount === 111
  && geometry.acceptedOrderedUpperStairConstruction.cardinallyHalfStepContiguous === true
  && geometry.preservedRouteHeadClearance.cellCount === 222
  && geometry.preservedRouteHeadClearance.exactAirCellCount === 220
  && geometry.preservedRouteHeadClearance.retainedR09fTransitionHoldCellCount === 2
  && geometry.retainedOuterFallBarrier.cellCount === 216
  && geometry.retainedLowerWetContainmentDeck.cellCount === 49
  && geometry.retainedDoorlessHeadhouseWalls.cellCount === 72
  && geometry.retainedHeadhouseRoof.cellCount === 49
  && geometry.retainedFiveCellR07jInternalSeam.cellCount === 5,
'exact B07 construction/enclosure geometry drifted');
invariant(JSON.stringify(manifest.scope.fixtureCadence.routeIndices)
    === JSON.stringify([1, 17, 33, 49, 65, 81, 97, 104])
  && manifest.scope.fixtureCadence.maximumRouteIndexDistanceToFixture === 8
  && manifest.scope.fixtureCadence.maximumFixtureSpacingInIndices === 16
  && manifest.scope.fixtureCadence.eachFixtureFacesExactClearanceCell === true
  && manifest.scope.fixtureCadence.photometricEmergencyOrLifeSafetyLightingClaimed === false,
'fixture cadence or claim boundary drifted');
invariant(manifest.scope.ownership.reviewedMigration.r02ExcavationToR09eCoreCellCount === 6
  && manifest.scope.ownership.reviewedMigration.r09eCoreToPassiveFixtureCellCount === 6
  && manifest.scope.ownership.reviewedMigration.r09fCoreToPassiveFixtureCellCount === 2
  && manifest.scope.ownership.reviewedMigration.unreviewedPriorTargetIntersectionCount === 0
  && manifest.preservation.undeclaredPriorReleaseIntersectionCount === 0,
'reviewed R02/R09E/R09F ownership chain drifted');
invariant(boundary.routeOrHeadroomChanged === false
  && boundary.outerBarrierChanged === false
  && boundary.lowerWetContainmentDeckChanged === false
  && boundary.lowerWetInterfaceOpened === false
  && boundary.r07jExteriorWallRoofOrDoorChanged === false
  && boundary.exteriorOpeningCreated === false
  && boundary.activeMechanismInstalled === false
  && boundary.publicRouteCommissioned === false
  && boundary.fireServiceRouteCommissioned === false
  && boundary.r09fTwoCellTransitionClearanceConflictResolved === false,
'fail-closed operational boundary drifted');
invariant(safety.halo.cellCount === 216
  && safety.halo.coordinateSetSha256
    === '8cfb658c4eb8a69c13bee8af410772b2eb45c9ac074bf8738413f8d7f0d2361e'
  && safety.haloFluidCount === 0 && safety.haloGravityCount === 0
  && safety.haloActiveMechanismCount === 0 && safety.haloWoodyCount === 0
  && safety.haloBlockEntityCount === 0 && safety.haloSavedEntityCount === 0
  && safety.haloProtectedRelicCount === 0
  && safety.targetMaterialFullCubeNonGravityNonBlockEntity === true
  && safety.existingTwoCellR09fTransitionClearanceConflictPreservedNotResolved === true,
'static hazard or inherited-hold accounting drifted');

const checks = [
  'R09F_ACCEPTED_POST_AND_QA_BOUND',
  'ONE_PACKAGE_EIGHT_EXACT_TARGETS',
  'EXACT_FORWARD_AND_PROJECTED_ROLLBACK_PREFLIGHTS_PASS',
  'STRICT_FORWARD_AND_ROLLBACK_PARSERS_PASS',
  'BLOCK_ENTITY_AND_IMMUTABLE_ENTITY_CLEARANCE_PASS',
  'EXACT_111_STEP_CONSTRUCTION_AND_EIGHT_INDEX_CADENCE',
  'EXACT_222_CLEARANCE_WITH_220_AIR_AND_TWO_CELL_R09F_HOLD',
  'EXACT_216_BARRIER_AND_49_CELL_WET_DECK_PRESERVED',
  'DOORLESS_121_CELL_HEADHOUSE_SHELL_AND_FIVE_CELL_INTERNAL_SEAM_PRESERVED',
  'EXACT_R02_R09E_R09F_OWNERSHIP_CHAIN_ZERO_UNREVIEWED_OVERLAP',
  'ZERO_FIXTURE_HALO_HAZARD_OR_ENTITY_CONFLICT',
  'REAL_WRAPPER_PRINT_PLAN_AND_NO_COMMISSIONING_CLAIM_PASS',
];
const payload = {
  schemaVersion: 1,
  id: 'combined-zones-r09g-b07-upper-route-passive-wayfinding-offline-qa',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R09G_B07_UPPER_STAIR_PASSIVE_WAYFINDING_OFFLINE_RELEASE_READY',
  releaseNodeId: manifest.releaseNodeId,
  transactionId: manifest.transactionId,
  manifestIdentity: manifest.manifestIdentity,
  manifest: binding(MANIFEST),
  sourceCompleteSaveSha256: manifest.source.completeSaveSha256,
  sourceCompletedReleaseIdentitySha256:
    manifest.source.predecessor.completedReleaseIdentitySha256,
  sourcePostQaPayloadSha256: manifest.source.predecessor.postQaPayloadSha256,
  targetCellCount: manifest.target.operatedUnion.cellCount,
  routeIndexCount: geometry.acceptedOrderedUpperStairConstruction.cellCount,
  clearanceCellCount: geometry.preservedRouteHeadClearance.cellCount,
  clearanceAirCellCount: geometry.preservedRouteHeadClearance.exactAirCellCount,
  inheritedTransitionHoldCellCount:
    geometry.preservedRouteHeadClearance.retainedR09fTransitionHoldCellCount,
  barrierCellCount: geometry.retainedOuterFallBarrier.cellCount,
  haloCellCount: safety.halo.cellCount,
  evidence: Object.fromEntries(Object.entries(files).map(([key, filename]) => [key, binding(filename)])),
  checks: checks.map((id) => ({ id, passed: true })),
  summary: { checkCount: checks.length, passCount: checks.length, failCount: 0 },
  operationalBoundary: boundary,
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
