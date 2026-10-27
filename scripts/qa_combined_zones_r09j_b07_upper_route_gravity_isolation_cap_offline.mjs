#!/usr/bin/env node
/** Bind and seal complete offline R09J gravity-isolation evidence. */

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
  'data/buildops/combined-zones-r09j-b07-upper-route-gravity-isolation-cap.release-manifest.json',
);
const EVIDENCE = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r09j-b07-upper-route-gravity-isolation-cap-offline-20260822T023500Z',
);
const OUTPUT = value('--out', `${EVIDENCE}/offline-qa.json`);
const GENERATED_AT = value('--generated-at', '2026-08-22T02:35:00Z');
const abs = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const binding = (filename) => {
  const bytes = fs.readFileSync(abs(filename));
  return { path: filename, sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R09J offline QA rejected: ${message}`);
};

const manifest = readJson(MANIFEST);
invariant(manifest.transactionId === 'combined-zones-r09j-b07-upper-route-gravity-isolation-cap'
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
const manifestBinding = binding(MANIFEST);
const manifestQa = readJson(files.manifestQa);
invariant(manifestQa.status === 'PASS' && manifestQa.passed === true
  && manifestQa.totals?.packages === 1 && manifestQa.totals?.passedPackages === 1
  && manifestQa.totals?.uniqueTargetCells === 2
  && manifestQa.manifest?.sha256 === manifestBinding.sha256,
'manifest QA is not final-bound one-package/two-target PASS');
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
'immutable entity clearance failed or weakened live gate');
const wrapperPlan = readJson(files.wrapperPlan);
invariant(wrapperPlan.mode === 'PREPARE_ONLY' && wrapperPlan.globalGateDependency === 'NONE'
  && JSON.stringify(wrapperPlan.packageOrder) === JSON.stringify(['b07-upper-route-gravity-isolation-cap'])
  && wrapperPlan.stages.includes('live-entity-clearance')
  && wrapperPlan.stages.includes('projected-rollback-preflight'),
'wrapper print-plan contract drifted');

const geometry = manifest.scope.geometry;
const isolation = manifest.scope.isolationProof;
const boundary = manifest.scope.operationalBoundary;
const safety = manifest.safetyAudit;
invariant(manifest.target.operatedUnion.cellCount === 2
  && manifest.target.operatedUnion.coordinateSetSha256
    === '6433ef6a7b50624b39806d156a25bb11fdfe9beef03c494136b5d5fd2d1d163b'
  && manifest.target.desiredStateCensus['minecraft:polished_diorite'] === 2
  && geometry.blockedStairIndex === 20
  && geometry.excludedUnsupportedBoundaryStairIndex === 19
  && geometry.retainedUpperStairIndexRange.min === 21
  && geometry.retainedUpperStairIndexRange.max === 110
  && geometry.retainedUpperRouteWithHeadhouseHold.cellCount === 91
  && geometry.retainedUpperHeadClearance.cellCount === 182
  && geometry.retainedUpperFallBoundary.cellCount === 174,
'target or retained upper-route geometry drifted');
invariant(isolation.reachableUpperSurfaceCount === 91
  && isolation.reachableExcludedLowerSurfaceCount === 0
  && isolation.capTargetIntersectionWithUpperClearanceCount === 0
  && isolation.upperBoundaryGravityCellCount === 8
  && isolation.unsupportedUpperBoundaryGravityCellCount === 0,
'conservative isolation/support proof drifted');
invariant(manifest.preservation.reviewedR02AirReservationRestoration.cellCount === 2
  && manifest.preservation.undeclaredPriorReleaseIntersectionCount === 0
  && manifest.preservation.inheritedUnsupportedBoundaryCells.length === 2
  && manifest.preservation.unsupportedGravityTargetIntersectionCount === 0
  && manifest.preservation.unsupportedGravitySupportCellTargetIntersectionCount === 0
  && manifest.preservation.faceAdjacentGravityCellCount === 0,
'reviewed ownership or inherited-gravity preservation drifted');
invariant(safety.halo.cellCount === 36 && safety.haloFluidCount === 0
  && safety.haloGravityCount === 3 && safety.faceAdjacentGravityCount === 0
  && safety.gravitySupportRemovalCount === 0 && safety.haloActiveMechanismCount === 0
  && safety.haloBlockEntityCount === 0 && safety.haloSavedEntityCount === 0
  && safety.targetProtectedRelicCount === 0
  && safety.exactAirToFullCubeContainmentOnly === true
  && safety.rollbackRestoresAirWithoutRemovingGravitySupport === true,
'cap halo/static-safety proof drifted');
invariant(boundary.fullUpperRouteCommissioned === false
  && boundary.retainedUpperSegmentCommissioned === false
  && boundary.postReleaseFunctionalCommissioningRequired === true
  && boundary.lowerWetInterfaceOpened === false && boundary.exteriorOpeningCreated === false
  && boundary.publicRouteCommissioned === false && boundary.fireServiceRouteCommissioned === false
  && boundary.mechanismOrFixtureChanged === false
  && boundary.unsupportedGravityTouchedOrSupported === false,
'operational boundary drifted');

const checks = [
  'R09J-01-ACCEPTED-R09H-POST-QA-AND-R09I-BLOCKER-BOUND',
  'R09J-02-ONE-PACKAGE-TWO-EXACT-AIR-TO-DIORITE-TARGETS',
  'R09J-03-EXACT-FORWARD-AND-PROJECTED-ROLLBACK-PREFLIGHTS',
  'R09J-04-STRICT-FORWARD-AND-ROLLBACK-PARSERS',
  'R09J-05-BLOCK-ENTITY-AND-IMMUTABLE-ENTITY-CLEARANCE',
  'R09J-06-CONSERVATIVE-GRAPH-ISOLATES-91-UPPER-SURFACES',
  'R09J-07-182-UPPER-CLEARANCE-CELLS-UNTOUCHED',
  'R09J-08-174-UPPER-BOUNDARY-CELLS-EIGHT-GRAVITY-ALL-SUPPORTED',
  'R09J-09-UNSUPPORTED-GRAVEL-AND-SUPPORT-CELLS-UNTOUCHED',
  'R09J-10-ZERO-FACE-ADJACENT-GRAVITY-OR-FLUID-MECHANISM-ENTITY-HAZARD',
  'R09J-11-EXACT-R02-RESTORATION-ZERO-UNREVIEWED-OVERLAP',
  'R09J-12-REAL-WRAPPER-PLAN-AND-NO-COMMISSIONING-CLAIM',
];
const payload = {
  schemaVersion: 1,
  id: 'combined-zones-r09j-b07-upper-route-gravity-isolation-cap-offline-qa',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R09J_B07_UPPER_ROUTE_GRAVITY_ISOLATION_CAP_OFFLINE_RELEASE_READY',
  releaseNodeId: manifest.releaseNodeId,
  transactionId: manifest.transactionId,
  manifestIdentity: manifest.manifestIdentity,
  manifest: manifestBinding,
  sourceCompleteSaveSha256: manifest.source.completeSaveSha256,
  sourceCompletedReleaseIdentitySha256: manifest.source.predecessor.completedReleaseIdentitySha256,
  sourcePostQaPayloadSha256: manifest.source.predecessor.postQaPayloadSha256,
  commissioningBlockerIdentitySha256:
    manifest.source.predecessor.commissioningBlockerIdentitySha256,
  targetCellCount: manifest.target.operatedUnion.cellCount,
  retainedUpperSurfaceCount: geometry.retainedUpperRouteWithHeadhouseHold.cellCount,
  retainedUpperClearanceCellCount: geometry.retainedUpperHeadClearance.cellCount,
  retainedUpperBoundaryCellCount: geometry.retainedUpperFallBoundary.cellCount,
  supportedUpperBoundaryGravityCellCount: isolation.upperBoundaryGravityCellCount,
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
