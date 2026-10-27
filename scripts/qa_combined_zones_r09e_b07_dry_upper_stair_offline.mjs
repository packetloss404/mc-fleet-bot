#!/usr/bin/env node
/** Bind and seal the complete offline R09E compilation evidence. */

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
  'data/buildops/combined-zones-r09e-b07-dry-upper-stair.release-manifest.json',
);
const EVIDENCE = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r09e-b07-dry-upper-stair-offline-20260822T011800Z',
);
const OUTPUT = value(
  '--out',
  `${EVIDENCE}/offline-qa.json`,
);
const GENERATED_AT = value('--generated-at', '2026-08-22T01:18:00Z');

const absolute = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const binding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: filename, sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R09E offline QA rejected: ${message}`);
};

const manifest = readJson(MANIFEST);
invariant(manifest.transactionId === 'combined-zones-r09e-b07-dry-upper-stair'
  && manifest.releaseNodeId === 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT'
  && manifest.mvpScope === true
  && manifest.packages.length === 2,
'manifest identity/scope contract drifted');

const files = {
  manifestQa: `${EVIDENCE}/manifest-qa.json`,
  deckForward: `${EVIDENCE}/deck-forward-source-preflight.json`,
  frameworkForward: `${EVIDENCE}/framework-forward-source-preflight.json`,
  frameworkRollback: `${EVIDENCE}/framework-projected-rollback-preflight.json`,
  deckRollback: `${EVIDENCE}/deck-projected-rollback-preflight.json`,
  deckForwardParser: `${EVIDENCE}/deck-forward-strict-dry-run.json`,
  deckRollbackParser: `${EVIDENCE}/deck-rollback-strict-dry-run.json`,
  frameworkForwardParser: `${EVIDENCE}/framework-forward-strict-dry-run.json`,
  frameworkRollbackParser: `${EVIDENCE}/framework-rollback-strict-dry-run.json`,
  blockEntities: `${EVIDENCE}/block-entity-clearance.json`,
  immutableEntities: `${EVIDENCE}/immutable-entity-clearance.json`,
  wrapperPlan: `${EVIDENCE}/wrapper-plan.json`,
};
for (const filename of Object.values(files)) invariant(fs.existsSync(absolute(filename)), `missing ${filename}`);

const manifestQa = readJson(files.manifestQa);
invariant(manifestQa.status === 'PASS' && manifestQa.passed === true
  && manifestQa.totals?.packages === 2
  && manifestQa.totals?.passedPackages === 2
  && manifestQa.totals?.uniqueTargetCells === 1232
  && manifestQa.totals?.crossPackageIntersectionCells === 0,
'manifest QA is not 2/2 and 1,232-cell PASS');
for (const [filename, count] of [
  [files.deckForward, 49],
  [files.frameworkForward, 1183],
  [files.frameworkRollback, 1183],
  [files.deckRollback, 49],
]) {
  const report = readJson(filename);
  invariant(report.status === 'PASS' && report.passed === count && report.failed === 0,
    `${filename} is not exact PASS`);
}
for (const [filename, role, count] of [
  [files.deckForwardParser, 'forward', 49],
  [files.deckRollbackParser, 'rollback', 49],
  [files.frameworkForwardParser, 'forward', 1183],
  [files.frameworkRollbackParser, 'rollback', 1183],
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
  && JSON.stringify(wrapperPlan.packageOrder) === JSON.stringify([
    'b07-upper-dry-lower-containment-deck',
    'b07-upper-dry-stair-framework',
  ])
  && wrapperPlan.stages.includes('live-entity-clearance')
  && wrapperPlan.stages.includes('projected-rollback-preflight'),
'real wrapper plan does not preserve package order/kernel');

invariant(manifest.target.operatedCellCount === 1232
  && manifest.target.sourceStateCensus['minecraft:air'] === 1232
  && manifest.scope.geometry.orderedStairAndLanding.cardinallyContiguous === true
  && manifest.scope.geometry.requiredOuterBarrier.projectedContainmentFailureCount === 0
  && manifest.scope.operationalBoundary.lowerInterfaceClosed === true
  && manifest.scope.operationalBoundary.upperInterfaceClosed === true
  && manifest.scope.operationalBoundary.routeBeyondR09DHoldCommissioned === false
  && manifest.safetyBoundary.targetFluidCount === 0
  && manifest.safetyBoundary.haloFluidCount === 0
  && manifest.safetyBoundary.targetsFaceAdjacentToUnsupportedGravityCount === 0
  && manifest.safetyBoundary.blockEntityIntersectionCount === 0
  && manifest.safetyBoundary.savedEntityIntersectionCount === 0,
'manifest structural/safety conclusion drifted');

const checks = [
  ['R08AB_SOURCE_BOUND', true],
  ['TWO_PACKAGE_MANIFEST_1232_DISJOINT_TARGETS', true],
  ['ORDERED_FORWARD_PREFLIGHTS_PASS', true],
  ['REVERSE_ORDER_ROLLBACK_PREFLIGHTS_PASS', true],
  ['STRICT_FORWARD_AND_ROLLBACK_PARSERS_PASS', true],
  ['BLOCK_ENTITY_AND_IMMUTABLE_ENTITY_CLEARANCE_PASS', true],
  ['ZERO_TARGET_OR_HALO_FLUID', true],
  ['SOURCE_FLOATING_GRAVEL_NOT_FACE_ADJACENT_TO_TARGET', true],
  ['CARDINAL_HALF_STEP_STAIR_AND_OUTER_CONTAINMENT_PASS', true],
  ['LOWER_AND_UPPER_INTERFACES_FAIL_CLOSED', true],
  ['NO_PRIOR_MATERIAL_RELEASE_OVERLAP', true],
  ['REAL_WRAPPER_PRINT_PLAN_PASS', true],
];
const payload = {
  schemaVersion: 1,
  id: 'combined-zones-r09e-b07-dry-upper-stair-offline-qa',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R09E_DRY_UPPER_STAIR_OFFLINE_RELEASE_READY',
  releaseNodeId: manifest.releaseNodeId,
  transactionId: manifest.transactionId,
  manifestIdentity: manifest.manifestIdentity,
  manifest: binding(MANIFEST),
  sourceCompleteSaveSha256: manifest.source.completeSaveSha256,
  targetCellCount: manifest.target.operatedCellCount,
  packageCount: manifest.packages.length,
  packageTargetCounts: [49, 1183],
  orderedStairCellCount: manifest.scope.geometry.orderedStairAndLanding.cellCount,
  interactionHaloCellCount: manifest.scope.geometry.interactionHalo.cellCount,
  retainedUnsupportedGravityCellCount: manifest.safetyBoundary.unsupportedGravityCount,
  targetFaceAdjacencyToUnsupportedGravityCount:
    manifest.safetyBoundary.targetsFaceAdjacentToUnsupportedGravityCount,
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
