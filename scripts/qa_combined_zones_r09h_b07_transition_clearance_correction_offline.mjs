#!/usr/bin/env node
/** Bind and seal the complete offline R09H transition-correction evidence. */

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
  'data/buildops/combined-zones-r09h-b07-transition-clearance-correction.release-manifest.json',
);
const EVIDENCE = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r09h-b07-transition-clearance-correction-offline-20260822T021500Z',
);
const OUTPUT = value('--out', `${EVIDENCE}/offline-qa.json`);
const GENERATED_AT = value('--generated-at', '2026-08-22T02:15:00Z');
const abs = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const binding = (filename) => {
  const bytes = fs.readFileSync(abs(filename));
  return { path: filename, sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R09H offline QA rejected: ${message}`);
};

const manifest = readJson(MANIFEST);
invariant(manifest.transactionId === 'combined-zones-r09h-b07-transition-clearance-correction'
  && manifest.releaseNodeId === 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT'
  && manifest.mvpScope === true && manifest.packages.length === 1,
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
for (const filename of Object.values(files)) invariant(fs.existsSync(abs(filename)), `missing ${filename}`);
const manifestQa = readJson(files.manifestQa);
const manifestBinding = binding(MANIFEST);
invariant(manifestQa.status === 'PASS' && manifestQa.passed === true
  && manifestQa.totals?.packages === 1 && manifestQa.totals?.passedPackages === 1
  && manifestQa.totals?.uniqueTargetCells === 2
  && manifestQa.manifest?.path === MANIFEST
  && manifestQa.manifest?.sha256 === manifestBinding.sha256,
'manifest QA is not one-package/two-target PASS');
for (const filename of [files.forwardPreflight, files.rollbackPreflight]) {
  const report = readJson(filename);
  invariant(report.status === 'PASS' && report.passed === 2 && report.failed === 0,
    `${filename} is not exact 2/2 PASS`);
}
for (const [filename, role] of [[files.forwardParser, 'forward'], [files.rollbackParser, 'rollback']]) {
  const report = readJson(filename);
  invariant(report.status === 'dry_run' && report.strictNoop === true
    && report.operationRole === role && report.sourceOperationCount === 2
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
invariant(wrapperPlan.mode === 'PREPARE_ONLY' && wrapperPlan.globalGateDependency === 'NONE'
  && JSON.stringify(wrapperPlan.packageOrder) === JSON.stringify([
    'b07-r09e-r09f-transition-clearance-correction',
  ]) && wrapperPlan.stages.includes('live-entity-clearance')
  && wrapperPlan.stages.includes('projected-rollback-preflight'),
'wrapper print-plan contract drifted');

const geometry = manifest.scope.geometry;
const transition = manifest.scope.transitionSafety;
const boundary = manifest.scope.operationalBoundary;
const safety = manifest.safetyAudit;
invariant(manifest.target.operatedUnion.cellCount === 2
  && manifest.target.operatedUnion.coordinateSetSha256
    === '9562e3cdffe2ee63305486391b4b5758feb3bc7652e32b1e1f86f2d7a7c74e10'
  && geometry.acceptedOrderedStairConstruction.cellCount === 111
  && geometry.projectedCompleteHeadClearance.cellCount === 222
  && geometry.projectedCompleteHeadClearance.projectedAirCellCount === 222
  && geometry.projectedFallBoundary.cellCount === 216
  && geometry.projectedFallBoundary.retainedCollisionBarrierCellCount === 214
  && geometry.projectedFallBoundary.exactFloorBackedInternalApertureCellCount === 2
  && geometry.transitionBackingFloors.cellCount === 2
  && geometry.transitionLowerVoid.cellCount === 2
  && geometry.retainedTransitionCeiling.cellCount === 2
  && geometry.adjacentR09fSteps.cellCount === 2
  && geometry.retainedLowerWetContainmentDeck.cellCount === 49
  && geometry.retainedR09gFixtures.cellCount === 8,
'projected route/clearance/fall-boundary geometry drifted');
invariant(transition.orderedPrimarySeamRiseHalfBlocks === 1
  && transition.maximumFloorBackedLateralSurfaceDropBlocks === 1
  && transition.everyClearedCellHasExactTopSlabFloorTwoBlocksBelow === true
  && transition.everyClearedCellHasExactAirLowerVoid === true
  && transition.everyClearedCellHasRetainedFullCubeCeiling === true
  && transition.fallToUnflooredVoidCreated === false
  && transition.exteriorOpeningCreated === false,
'transition fall-safety proof drifted');
invariant(manifest.scope.ownership.reviewedR02ExcavationRestorationCellCount === 2
  && manifest.scope.ownership.reviewedR09fContainmentCorrectionCellCount === 2
  && manifest.scope.ownership.unreviewedPriorTargetIntersectionCount === 0
  && manifest.preservation.undeclaredPriorReleaseIntersectionCount === 0,
'reviewed ownership chain drifted');
invariant(safety.halo.cellCount === 36
  && safety.halo.coordinateSetSha256
    === '843679588329dfac67017d5e95cb3b1f401ad1605f041a5ebd72bcca497eb7a5'
  && safety.haloFluidCount === 0 && safety.haloGravityCount === 6
  && safety.supportedHaloGravityCount === 6 && safety.unsupportedHaloGravityCount === 0
  && safety.gravitySupportRemovalCount === 0 && safety.haloActiveMechanismCount === 0
  && safety.haloWoodyCount === 0 && safety.haloBlockEntityCount === 0
  && safety.haloSavedEntityCount === 0 && safety.haloProtectedRelicCount === 0
  && safety.projectedClearanceComplete === true
  && safety.projectedFallBoundarySafeByCollisionOrBackedTransition === true,
'halo/gravity/static-safety proof drifted');
invariant(boundary.exactTwoCellClearanceConflictResolved === true
  && boundary.lowerWetInterfaceOpened === false
  && boundary.r07jExteriorWallRoofOrDoorChanged === false
  && boundary.exteriorOpeningCreated === false
  && boundary.mechanismOrFixtureChanged === false
  && boundary.publicRouteCommissioned === false
  && boundary.fireServiceRouteCommissioned === false
  && boundary.routeCommissioningRequiresSeparateFunctionalPostAcceptance === true,
'operational boundary drifted');

const checks = [
  'R09G_ACCEPTED_POST_AND_QA_BOUND',
  'ONE_PACKAGE_TWO_EXACT_TARGETS',
  'EXACT_FORWARD_AND_PROJECTED_ROLLBACK_PREFLIGHTS_PASS',
  'STRICT_FORWARD_AND_ROLLBACK_PARSERS_PASS',
  'BLOCK_ENTITY_AND_IMMUTABLE_ENTITY_CLEARANCE_PASS',
  'PROJECTED_222_OF_222_HEAD_CLEARANCE_AIR',
  'PROJECTED_214_SOLID_PLUS_TWO_FLOOR_BACKED_INTERNAL_APERTURES',
  'EXACT_TOP_SLAB_FLOORS_LOWER_VOID_AND_RETAINED_CEILING',
  'SIX_OF_SIX_HALO_GRAVITY_CELLS_DURABLY_SUPPORTED',
  'R02_TO_R09F_REVIEWED_PROVENANCE_ZERO_UNREVIEWED_OVERLAP',
  'LOWER_WET_EXTERIOR_FIXTURE_AND_MECHANISM_BOUNDARIES_PRESERVED',
  'REAL_WRAPPER_PRINT_PLAN_AND_NO_ROUTE_COMMISSIONING_CLAIM_PASS',
];
const payload = {
  schemaVersion: 1,
  id: 'combined-zones-r09h-b07-transition-clearance-correction-offline-qa',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R09H_B07_TRANSITION_CLEARANCE_CORRECTION_OFFLINE_RELEASE_READY',
  releaseNodeId: manifest.releaseNodeId,
  transactionId: manifest.transactionId,
  manifestIdentity: manifest.manifestIdentity,
  manifest: manifestBinding,
  sourceCompleteSaveSha256: manifest.source.completeSaveSha256,
  sourceCompletedReleaseIdentitySha256: manifest.source.predecessor.completedReleaseIdentitySha256,
  sourcePostQaPayloadSha256: manifest.source.predecessor.postQaPayloadSha256,
  targetCellCount: manifest.target.operatedUnion.cellCount,
  projectedClearanceAirCellCount: geometry.projectedCompleteHeadClearance.projectedAirCellCount,
  projectedCollisionBarrierCellCount: geometry.projectedFallBoundary.retainedCollisionBarrierCellCount,
  backedInternalApertureCellCount: geometry.projectedFallBoundary.exactFloorBackedInternalApertureCellCount,
  supportedHaloGravityCellCount: safety.supportedHaloGravityCount,
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
fs.writeFileSync(abs(OUTPUT), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  status: report.status, output: OUTPUT, reportIdentitySha256, checks: report.summary,
}, null, 2)}\n`);
