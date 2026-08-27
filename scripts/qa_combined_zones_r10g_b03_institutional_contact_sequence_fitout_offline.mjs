#!/usr/bin/env node
/** Bind and seal the complete offline R10G institutional contact-sequence evidence. */

import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
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
  'data/buildops/combined-zones-r10g-b03-institutional-contact-sequence-fitout.release-manifest.json',
);
const EVIDENCE = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r10g-b03-institutional-contact-sequence-fitout-offline-20260822T030500Z',
);
const OUTPUT = value('--out', `${EVIDENCE}/offline-qa.json`);
const GENERATED_AT = value('--generated-at', '2026-08-22T03:05:00Z');
const RELEASE_NODE = 'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT';
const CONTACT_KEY = 'z08-institutional-contact-sequence-liner';
const CHEYENNE_KEY = 'z10-cheyenne-approach-extension-liner';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const binding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R10G offline QA rejected: ${message}`);
};

const manifest = readJson(MANIFEST);
invariant(manifest.transactionId === 'combined-zones-r10g-b03-institutional-contact-sequence-fitout'
  && manifest.releaseNodeId === RELEASE_NODE && manifest.mvpScope === true
  && JSON.stringify(manifest.packages.map(({ key }) => key)) === JSON.stringify([CONTACT_KEY, CHEYENNE_KEY])
  && JSON.stringify(manifest.executionOrder.forward) === JSON.stringify([CONTACT_KEY, CHEYENNE_KEY])
  && JSON.stringify(manifest.executionOrder.rollback) === JSON.stringify([CHEYENNE_KEY, CONTACT_KEY]),
'manifest identity/scope/order contract drifted');

const wrapperPlanPath = `${EVIDENCE}/wrapper-plan.json`;
const wrapperPlan = JSON.parse(execFileSync(process.execPath, [
  absolute('scripts/run_combined_zones_scoped_release.mjs'),
  '--manifest', relative(MANIFEST),
  '--release-node', RELEASE_NODE,
  '--print-plan',
], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
fs.writeFileSync(absolute(wrapperPlanPath), `${JSON.stringify(wrapperPlan, null, 2)}\n`);

const files = {
  manifestQa: `${EVIDENCE}/manifest-qa.json`,
  contactForward: `${EVIDENCE}/z08-forward-source-preflight.json`,
  cheyenneForward: `${EVIDENCE}/z10-forward-source-preflight.json`,
  cheyenneRollback: `${EVIDENCE}/z10-projected-rollback-preflight.json`,
  contactRollback: `${EVIDENCE}/z08-projected-rollback-preflight.json`,
  contactForwardParser: `${EVIDENCE}/z08-forward-strict-dry-run.json`,
  contactRollbackParser: `${EVIDENCE}/z08-rollback-strict-dry-run.json`,
  cheyenneForwardParser: `${EVIDENCE}/z10-forward-strict-dry-run.json`,
  cheyenneRollbackParser: `${EVIDENCE}/z10-rollback-strict-dry-run.json`,
  blockEntities: `${EVIDENCE}/block-entity-clearance.json`,
  immutableEntities: `${EVIDENCE}/immutable-entity-clearance.json`,
  wrapperPlan: wrapperPlanPath,
};
for (const filename of Object.values(files)) invariant(fs.existsSync(absolute(filename)), `missing ${filename}`);

const manifestQa = readJson(files.manifestQa);
invariant(manifestQa.status === 'PASS' && manifestQa.passed === true
  && manifestQa.totals?.packages === 2 && manifestQa.totals?.passedPackages === 2
  && manifestQa.totals?.uniqueTargetCells === 5346
  && manifestQa.totals?.crossPackageIntersectionCells === 0,
'manifest QA is not exact 2/2, 5,346-cell PASS');
for (const [filename, count] of [
  [files.contactForward, 5202],
  [files.cheyenneForward, 144],
  [files.cheyenneRollback, 144],
  [files.contactRollback, 5202],
]) {
  const report = readJson(filename);
  invariant(report.status === 'PASS' && report.passed === count && report.failed === 0,
    `${filename} is not exact PASS`);
}
for (const [filename, role, count] of [
  [files.contactForwardParser, 'forward', 5202],
  [files.contactRollbackParser, 'rollback', 5202],
  [files.cheyenneForwardParser, 'forward', 144],
  [files.cheyenneRollbackParser, 'rollback', 144],
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
  && immutableEntities.targetCellCount === 5346
  && immutableEntities.interactionHaloCellCount === 21528
  && immutableEntities.blockEntityIntersectionCount === 0
  && immutableEntities.savedEntityIntersectionCount === 0
  && immutableEntities.liveEntityClearanceStillRequiredByWrapper === true,
'immutable entity clearance failed or weakened the live gate');
invariant(wrapperPlan.mode === 'PREPARE_ONLY' && wrapperPlan.globalGateDependency === 'NONE'
  && JSON.stringify(wrapperPlan.packageOrder) === JSON.stringify([CONTACT_KEY, CHEYENNE_KEY])
  && wrapperPlan.stages.includes('live-entity-clearance')
  && wrapperPlan.stages.includes('projected-rollback-preflight'),
'real wrapper plan does not preserve order/kernel');

invariant(manifest.source.completeSaveSha256 === 'b814512643bc92ef3b0932b35f8fe12c984355dd0edb22c6e61d15130f9d38c9'
  && manifest.source.regionSnapshotSha256 === 'f8aad22ebf1a95182a3e8989f51f814cbd4217d85c7e73ee85be8b2c6ca4bcfb'
  && manifest.source.predecessor.completedReleaseIdentitySha256 === '9aae3a36cd327825e85604cf7adfecb92d24ec9ef35db96ef36e048e75fd4c36'
  && manifest.source.predecessor.postQaPayloadSha256 === 'c4ae5ead1b20ac18fcb4720f3706f522ca98baaa434c7bcf202088fe898981b1'
  && JSON.stringify(manifest.source.sourceStateCensus) === JSON.stringify({
    'minecraft:polished_diorite': 2592,
    'minecraft:stone': 2754,
  }),
'accepted R12J source binding/state census drifted');
invariant(manifest.target.operatedUnion.cellCount === 5346
  && manifest.target.routeVoid.cellCount === 5940
  && manifest.target.packageTargetsDisjoint === true
  && JSON.stringify(manifest.target.desiredStateCensus) === JSON.stringify({
    'minecraft:polished_blackstone_bricks': 18,
    'minecraft:polished_granite': 3799,
    'minecraft:sea_lantern': 49,
    'minecraft:smooth_stone': 1480,
  }),
'target geometry/material census drifted');
invariant(manifest.scope.acceptedCenterlineRange.firstIndex === 471
  && manifest.scope.acceptedCenterlineRange.lastIndex === 767
  && manifest.scope.acceptedCenterlineRange.pointCount === 297
  && manifest.scope.ownership.contact.canonicalOwner === 'Z08-CONTACT-SEQUENCE-FITOUT'
  && manifest.scope.ownership.contact.liner.cellCount === 5202
  && manifest.scope.ownership.cheyenneApproachExtension.canonicalOwner === 'Z10-CHEYENNE-FITOUT'
  && manifest.scope.ownership.cheyenneApproachExtension.liner.cellCount === 144
  && manifest.scope.ownership.ownershipOverlapCellCount === 0,
'centerline or canonical ownership split drifted');
invariant(manifest.scope.geometry.preservedRouteVoid.cellCount === 5940
  && manifest.scope.geometry.upstreamOpenInteriorSeam.routeVoid.cellCount === 20
  && manifest.scope.geometry.downstreamAcceptedR10aInteriorSeam.routeVoid.cellCount === 20
  && manifest.scope.geometry.securityFrame.cellCount === 18
  && manifest.scope.geometry.passiveFixtures.cellCount === 49,
'route/seam/frame/fixture geometry drifted');
invariant(manifest.preservation.completeCurrentSourceStateGuardCount === 5346
  && manifest.preservation.acceptedR10aTargetIntersectionCount === 0
  && manifest.preservation.routeOperationIntersectionCount === 0
  && manifest.preservation.haloHazardCount === 0
  && manifest.safetyAudit.halo.cellCount === 21528
  && manifest.safetyAudit.fluidCellCount === 0
  && manifest.safetyAudit.gravityCellCount === 0
  && manifest.safetyAudit.forbiddenContainerOrControlCellCount === 0
  && manifest.safetyAudit.activeMechanismCellCount === 0
  && manifest.safetyAudit.blockEntityCount === 0
  && manifest.safetyAudit.savedEntityCount === 0,
'preservation or hard-safety audit drifted');
invariant(manifest.scope.operationalBoundary.routeVoidPreserved === true
  && manifest.scope.operationalBoundary.secureOrPublicRouteCommissioned === false
  && manifest.scope.operationalBoundary.accessControlMechanismCommissioned === false
  && manifest.scope.operationalBoundary.activeSystemInstalled === false
  && manifest.scope.operationalBoundary.exteriorOpeningCreated === false,
'operational boundary drifted');

const checks = [
  ['R12J_ACCEPTED_POST_AND_QA_BOUND', true],
  ['FROZEN_B03_INDICES_471_767_BOUND', true],
  ['EXACT_Z08_Z10_OWNERSHIP_SPLIT_5202_144', true],
  ['TWO_PACKAGE_MANIFEST_5346_DISJOINT_TARGETS', true],
  ['ORDERED_FORWARD_PREFLIGHTS_5202_THEN_144_PASS', true],
  ['REVERSE_ORDER_ROLLBACK_PREFLIGHTS_144_THEN_5202_PASS', true],
  ['STRICT_FORWARD_AND_ROLLBACK_PARSERS_PASS', true],
  ['BLOCK_ENTITY_AND_IMMUTABLE_ENTITY_CLEARANCE_PASS', true],
  ['EXACT_5940_AIR_ROUTE_AND_TWO_20_CELL_SEAMS_PRESERVED', true],
  ['EXACT_18_CELL_FRAME_AND_49_FIXTURES', true],
  ['ZERO_FLUID_GRAVITY_MECHANISM_CONTAINER_ENTITY_OR_RELIC_HAZARD', true],
  ['ZERO_R10A_TARGET_OVERLAP', true],
  ['ROUTE_AND_ACTIVE_SYSTEM_COMMISSIONING_REMAIN_CLOSED', true],
  ['REAL_WRAPPER_PRINT_PLAN_PASS', true],
];
const payload = {
  schemaVersion: 1,
  id: 'combined-zones-r10g-b03-institutional-contact-sequence-fitout-offline-qa',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R10G_B03_INSTITUTIONAL_CONTACT_SEQUENCE_FITOUT_OFFLINE_READY',
  releaseNodeId: manifest.releaseNodeId,
  transactionId: manifest.transactionId,
  manifestIdentity: manifest.manifestIdentity,
  manifest: binding(MANIFEST),
  sourceCompleteSaveSha256: manifest.source.completeSaveSha256,
  sourceCompletedReleaseIdentitySha256: manifest.source.predecessor.completedReleaseIdentitySha256,
  sourcePostQaPayloadSha256: manifest.source.predecessor.postQaPayloadSha256,
  targetCellCount: manifest.target.operatedUnion.cellCount,
  routeVoidCellCount: manifest.target.routeVoid.cellCount,
  packageCount: manifest.packages.length,
  packageTargetCounts: [5202, 144],
  centerlinePointCount: manifest.scope.acceptedCenterlineRange.pointCount,
  interactionHaloCellCount: manifest.safetyAudit.halo.cellCount,
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
  output: relative(OUTPUT),
  reportIdentitySha256,
  checks: report.summary,
}, null, 2)}\n`);
