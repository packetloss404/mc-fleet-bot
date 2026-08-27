#!/usr/bin/env node
/** Seal all offline gates for the exact 48-cell R10H physical enabler. */

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
const MANIFEST = value('--manifest', 'data/buildops/combined-zones-r10h-b03-preinstitutional-passive-route-lighting.release-manifest.json');
const EVIDENCE = value('--evidence-dir', 'data/world-review/combined-zones-r10h-b03-preinstitutional-passive-route-lighting-offline-20260822T040500Z');
const OUTPUT = value('--out', `${EVIDENCE}/offline-qa.json`);
const MARKDOWN = value('--markdown', `${EVIDENCE}/offline-qa.md`);
const GENERATED_AT = value('--generated-at', '2026-08-22T04:05:00Z');
const RELEASE_NODE = 'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT';
const PACKAGE_KEY = 'b03-preinstitutional-passive-route-lighting';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const binding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R10H offline QA rejected: ${message}`);
};

const manifest = readJson(MANIFEST);
invariant(manifest.transactionId === 'combined-zones-r10h-b03-preinstitutional-passive-route-lighting'
  && manifest.manifestIdentity === '2b9420ba2e27f7c2c97bffac981abe4974532ea2211b8aacb429b5f5cb355ffc'
  && manifest.releaseNodeId === RELEASE_NODE && manifest.mvpScope === true
  && JSON.stringify(manifest.packages.map(({ key }) => key)) === JSON.stringify([PACKAGE_KEY])
  && JSON.stringify(manifest.executionOrder.forward) === JSON.stringify([PACKAGE_KEY])
  && JSON.stringify(manifest.executionOrder.rollback) === JSON.stringify([PACKAGE_KEY]),
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
  forwardPreflight: `${EVIDENCE}/forward-source-preflight.json`,
  rollbackPreflight: `${EVIDENCE}/projected-rollback-preflight.json`,
  forwardParser: `${EVIDENCE}/forward-strict-dry-run.json`,
  rollbackParser: `${EVIDENCE}/rollback-strict-dry-run.json`,
  blockEntities: `${EVIDENCE}/block-entity-clearance.json`,
  immutableEntities: `${EVIDENCE}/immutable-entity-clearance.json`,
  wrapperPlan: wrapperPlanPath,
};
for (const filename of Object.values(files)) {
  invariant(fs.existsSync(absolute(filename)), `missing ${filename}`);
}

const manifestQa = readJson(files.manifestQa);
const forwardPreflight = readJson(files.forwardPreflight);
const rollbackPreflight = readJson(files.rollbackPreflight);
const forwardParser = readJson(files.forwardParser);
const rollbackParser = readJson(files.rollbackParser);
const blockEntities = readJson(files.blockEntities);
const immutableEntities = readJson(files.immutableEntities);
const operation = manifest.operations[PACKAGE_KEY];
const packageForward = binding(manifest.packages[0].forward);
const packageRollback = binding(manifest.packages[0].rollback);

invariant(manifestQa.status === 'PASS' && manifestQa.passed === true
  && manifestQa.totals?.packages === 1 && manifestQa.totals?.passedPackages === 1
  && manifestQa.totals?.uniqueTargetCells === 48
  && manifestQa.totals?.crossPackageIntersectionCells === 0,
'manifest QA is not exact 1/1, 48-cell PASS');
invariant(forwardPreflight.status === 'PASS' && forwardPreflight.passed === 48
  && forwardPreflight.failed === 0 && forwardPreflight.operationCount === 48
  && forwardPreflight.opsSha256 === packageForward.sha256
  && forwardPreflight.regionsSnapshot?.sha256 === manifest.source.regionSnapshotSha256
  && forwardPreflight.sourceOverlays === null,
'forward source preflight is not exact 48/48 PASS');
invariant(rollbackPreflight.status === 'PASS' && rollbackPreflight.passed === 48
  && rollbackPreflight.failed === 0 && rollbackPreflight.operationCount === 48
  && rollbackPreflight.opsSha256 === packageRollback.sha256
  && rollbackPreflight.regionsSnapshot?.sha256 === manifest.source.regionSnapshotSha256
  && rollbackPreflight.sourceOverlays?.operationCount === 48
  && rollbackPreflight.sourceOverlays?.passed === 48
  && rollbackPreflight.sourceOverlays?.failed === 0
  && rollbackPreflight.sourceOverlays?.artifacts?.[0]?.sha256 === packageForward.sha256,
'projected rollback preflight is not exact forward-overlay 48/48 PASS');
for (const [report, role] of [[forwardParser, 'forward'], [rollbackParser, 'rollback']]) {
  invariant(report.status === 'dry_run' && report.strictNoop === true
    && report.operationRole === role && report.sourceOperationCount === 48
    && report.worldEditLeftoverCount === 0,
  `${role} strict-noop parser gate failed`);
}
invariant(blockEntities.status === 'PASS' && blockEntities.blockingBlockEntityCount === 0,
'block-entity operation audit failed');
invariant(immutableEntities.status === 'PASS'
  && immutableEntities.targetCellCount === 48
  && immutableEntities.interactionHaloCellCount === 1296
  && immutableEntities.exactSparseInteractionHalo.coordinateSetSha256
    === '22cdaea3fc7883336c17939f9fac027b65c0131f3aaf0a96f04f4f70fdc3b023'
  && immutableEntities.blockEntityIntersectionCount === 0
  && immutableEntities.savedEntityIntersectionCount === 0
  && immutableEntities.liveEntityClearanceStillRequiredByWrapper === true,
'immutable entity clearance failed or weakened the live gate');
invariant(wrapperPlan.mode === 'PREPARE_ONLY' && wrapperPlan.globalGateDependency === 'NONE'
  && JSON.stringify(wrapperPlan.packageOrder) === JSON.stringify([PACKAGE_KEY])
  && wrapperPlan.stages.includes('fresh-source-complete-save')
  && wrapperPlan.stages.includes('projected-rollback-preflight')
  && wrapperPlan.stages.includes('live-entity-clearance'),
'real wrapper plan does not preserve the hard-safety kernel');

invariant(manifest.source.completeSaveSha256
    === 'b6f7034521acc89a3534e68eec0533566eab67f0240fac9b4bb43ae0db1753cd'
  && manifest.source.regionSnapshotSha256
    === '39e9e446b36381fa0961fa17e788685c983fc683a605b91e2a7b515ab39264fa'
  && manifest.source.predecessor.completedReleaseIdentitySha256
    === '818e098cfa2ce12bfe09748162fa7b3cc7165e98fba6757f8bb73fb58570ca6d'
  && manifest.source.predecessor.postQaPayloadSha256
    === '45ae703711127ab8c30fae08b7c84f69e872cc374a70f79e1087d44ffb77fbff'
  && JSON.stringify(manifest.source.sourceStateCensus)
    === JSON.stringify({ 'minecraft:polished_diorite': 48 }),
'accepted R10G source binding/state census drifted');
invariant(manifest.target.operatedUnion.cellCount === 48
  && manifest.target.operatedUnion.coordinateSetSha256
    === '328bd79832501e5a3532e73abe9fa97e3bd06e01c6fc6634ffa653d1dfd4144b'
  && JSON.stringify(manifest.target.desiredStateCensus)
    === JSON.stringify({ 'minecraft:sea_lantern': 48 })
  && operation.exactInverse === true && operation.reverseOrderInverse === true
  && operation.oneCellGuards === true,
'target identity, material, or inverse contract drifted');
invariant(manifest.scope.acceptedCenterlineRange.firstIndex === 188
  && manifest.scope.acceptedCenterlineRange.lastIndex === 800
  && manifest.scope.acceptedCenterlineRange.pointCount === 613
  && manifest.scope.passiveLighting.firstFixtureIndex === 188
  && manifest.scope.passiveLighting.lastNewFixtureIndex === 470
  && manifest.scope.passiveLighting.newFixtures.cellCount === 48
  && manifest.scope.passiveLighting.acceptedDownstreamFixtureCount === 54
  && manifest.scope.passiveLighting.proposedCompleteFixtureCount === 102
  && manifest.scope.passiveLighting.proposedCompleteMaximumCenterlineSpacing === 6,
'route range or fixture cadence drifted');
invariant(manifest.scope.routeReadinessGeometry.route.cellCount === 12212
  && manifest.scope.routeReadinessGeometry.centralClearance.cellCount === 5505
  && manifest.scope.routeReadinessGeometry.floor.cellCount === 3053
  && manifest.scope.routeReadinessGeometry.ceiling.cellCount === 3053
  && manifest.scope.routeReadinessGeometry.upstreamIndex187AirSeam.cellCount === 20
  && manifest.scope.routeReadinessGeometry.routeComponentCount === 1,
'paired route-readiness geometry drifted');
invariant(manifest.scope.explicitUpstreamHold.excludedCenterlineRange.firstIndex === 0
  && manifest.scope.explicitUpstreamHold.excludedCenterlineRange.lastIndex === 187
  && manifest.scope.explicitUpstreamHold.exactRouteObstructionCount === 63
  && manifest.scope.explicitUpstreamHold.exactUnsupportedFloorAirCellCount === 14
  && manifest.preservation.indices0Through187Untouched === true,
'explicit upstream obstruction boundary drifted');
invariant(manifest.safetyAudit.exactSparseInteractionHalo.cellCount === 1296
  && manifest.safetyAudit.fluidCellCount === 0
  && manifest.safetyAudit.gravityCellCount === 0
  && manifest.safetyAudit.forbiddenContainerOrControlCellCount === 0
  && manifest.safetyAudit.activeMechanismCellCount === 0
  && manifest.safetyAudit.blockEntityCount === 0
  && manifest.safetyAudit.savedEntityCount === 0
  && manifest.safetyAudit.protectedRelicCount === 0,
'hard-safety interaction audit drifted');
invariant(manifest.preservation.priorReleaseIntersections.r07aPortalTubeShellCellCount === 48
  && manifest.preservation.priorReleaseIntersections.r10gCellCount === 0
  && manifest.preservation.priorReleaseIntersections.r10aCellCount === 0
  && manifest.scope.operationalBoundary.passiveLightingOnly === true
  && manifest.scope.operationalBoundary.secureOrPublicRouteCommissioned === false
  && manifest.scope.operationalBoundary.activeSystemInstalled === false
  && manifest.scope.operationalBoundary.directTerminalLinkOpened === false,
'prior release preservation or operational nonclaim drifted');

const checks = [
  ['R10H-OFF-01-ACCEPTED-R10G-POST-AND-QA-BOUND', true],
  ['R10H-OFF-02-FROZEN-B03-188-800-GEOMETRY-BOUND', true],
  ['R10H-OFF-03-EXACT-48-POLISHED-DIORITE-SOURCES', true],
  ['R10H-OFF-04-EXACT-48-SEA-LANTERN-TARGETS', true],
  ['R10H-OFF-05-EXACT-REVERSE-ORDER-INVERSE', true],
  ['R10H-OFF-06-FORWARD-AND-PROJECTED-ROLLBACK-PREFLIGHTS-PASS', true],
  ['R10H-OFF-07-STRICT-FORWARD-AND-ROLLBACK-PARSERS-PASS', true],
  ['R10H-OFF-08-BLOCK-ENTITY-AND-IMMUTABLE-ENTITY-CLEARANCE-PASS', true],
  ['R10H-OFF-09-EXACT-1296-CELL-HALO-HAZARD-CLEAR', true],
  ['R10H-OFF-10-EXACT-12212-ROUTE-AND-5505-CLEARANCE-PRESERVED', true],
  ['R10H-OFF-11-INDICES-0-187-OBSTRUCTION-HOLD-PRESERVED', true],
  ['R10H-OFF-12-ACTIVE-SECURE-PUBLIC-EXTERIOR-TERMINAL-NONCLAIMS-PRESERVED', true],
  ['R10H-OFF-13-REAL-WRAPPER-PRINT-PLAN-PASS', true],
].map(([id, passed]) => ({ id, status: passed ? 'PASS' : 'FAIL' }));
const payload = {
  schemaVersion: 1,
  id: 'combined-zones-r10h-b03-preinstitutional-passive-route-lighting-offline-qa',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R10H_B03_PREINSTITUTIONAL_PASSIVE_ROUTE_LIGHTING_OFFLINE_READY',
  releaseNodeId: manifest.releaseNodeId,
  transactionId: manifest.transactionId,
  manifestIdentity: manifest.manifestIdentity,
  manifest: binding(MANIFEST),
  targetCellCount: 48,
  fixtureCountAfterExecution: 102,
  pairedRouteStationCount: 613,
  pairedRouteAirCellCount: 12212,
  pairedCentralClearanceCellCount: 5505,
  interactionHaloCellCount: 1296,
  explicitUpstreamRouteObstructionCount: 63,
  exactInverseGuardCount: 48,
  evidence: Object.fromEntries(Object.entries(files).map(([key, filename]) => (
    [key, binding(filename)]
  ))),
  wrapperPlan,
  checks,
  summary: {
    passed: true,
    checkCount: checks.length,
    passCount: checks.length,
    failCount: 0,
  },
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    serviceMutationsPerformed: false,
    routeCommissioned: false,
    freshWrapperKernelStillRequired: true,
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(payload));
const report = { ...payload, qaPayloadSha256 };
fs.writeFileSync(absolute(OUTPUT), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(MARKDOWN), `# CZ-R10H B03 passive route-lighting offline QA\n\n`
  + `**Status:** PASS — frozen for a fresh guarded wrapper kernel  \n`
  + `**Manifest:** \`${manifest.manifestIdentity}\`  \n`
  + `**QA payload:** \`${qaPayloadSha256}\`\n\n`
  + `R10H changes exactly 48 source-proven polished-diorite ceiling cells to passive sea lanterns. `
  + `Forward and projected inverse preflights pass 48/48, both strict parsers pass, the real wrapper plan is PREPARE_ONLY, and the exact 1,296-cell halo is hazard/entity/relic clear.\n\n`
  + `The package enables—but does not itself commission—the exact indices 188..800 route. `
  + `Indices 0..187 remain untouched behind their 63 route obstructions and 14 unsupported floor-air cells. `
  + `Secure/public access, controls, chamber, terminal, exterior, rescue/egress, and every active mechanism remain closed.\n`);
process.stdout.write(`${JSON.stringify({
  status: report.status,
  manifestIdentity: report.manifestIdentity,
  qaPayloadSha256,
  checks: report.summary,
  wrapperMode: wrapperPlan.mode,
  liveCallsPerformed: false,
}, null, 2)}\n`);
