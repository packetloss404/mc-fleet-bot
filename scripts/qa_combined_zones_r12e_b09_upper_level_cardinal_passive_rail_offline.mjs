#!/usr/bin/env node
/** Deterministic offline QA for CZ-R12E upper level-cardinal passive rail. */

import fs from 'node:fs';
import path from 'node:path';

import { hashCells, sha256 } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r12e-b09-upper-level-cardinal-passive-rail-offline-20260822T011000Z',
);
const OUT = value('--out', path.join(EVIDENCE_DIR, 'r12e-offline-readiness.json'));
const MARKDOWN = value('--markdown', path.join(EVIDENCE_DIR, 'r12e-offline-readiness.md'));
const GENERATED_AT = value('--generated-at', '2026-08-22T01:10:00Z');
const MANIFEST =
  'data/buildops/combined-zones-r12e-b09-isolated-upper-level-cardinal-passive-rail.release-manifest.json';
const PACKAGE_KEY = 'b09-isolated-upper-level-cardinal-passive-rail';
const EXPECTED = Object.freeze({
  manifest: '4c52a6eab1f5a6dc23e869c3cac8d573cfa9e3548b211d64e247bbccb8e4749c',
  manifestIdentity: 'e70ac090697d8741c82ed445dd02f26d39255b523d49048bc8d80d2106d5d576',
  forward: '6acaf37b4dd1853e416089df63445d9e3a3f3f136d5551ddf3676a7b05197fb4',
  rollback: 'b225976c8e504e57ee3b860423018197e1212e8d33e9fd8f732c234b409676f9',
  manifestGate: '18921336670c2e2a96b8b8cef2260e7d5a5babdaeeb81868437a99f08e245f2e',
  forwardPreflight: '34352a3c6c6f6e2f62a3c902a88cae7c4f6f061a07e06a809f8dce05c3b6928b',
  rollbackPreflight: '955befd908c0899b5e3e83cf7ea93a444077e12d34cd899f6cc01f5e18b5b516',
  forwardParser: '55c3d538f9c8516422d3bfe39557366b02975d711af2c362bc5cdf00e5829e11',
  rollbackParser: 'f247e6918128f7a072f454c36a2666e254fee5c877c44c2cb8415f94d255a5d1',
  blockEntity: '08d50b19ebe240fa21d1c6666d284b010da0dd96dad2428d50a24f7f13fc9c42',
  wrapperPlan: '21286eac4e9435b336b66150dc837b24202c9ecc32da6dbadd0929e453aef483',
  sourceRegion: '28ccb2dd338522e98e2a734d91670c3eb5f52a1adfc695584ba3286f6d8a90f6',
  sourceComplete: '87966eef0a9e3ca695820f521ca2311c01ad7d6b199ee6ef57c6201cc97ee804',
  sourceCompleted: '97ff44527f857241316f425e563f639bea1c96b52b9b839f1e77089a04b225b2',
  sourceQaPayload: '56aceba3fa84b1a6508398daf2a34269aee2a992e3fc205dbc0306ad73ac1a4a',
  target: '71956640b587c6e2b749b168a8c6fe39638c766f323aac657c2f3e95d367456f',
});

const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R12E passive-rail offline QA rejected: ${message}`);
};
const fileBinding = (filename) => ({
  path: rel(filename), sha256: sha256(fs.readFileSync(abs(filename))), bytes: fs.statSync(abs(filename)).size,
});
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const boundJson = (filename, expected) => {
  const binding = fileBinding(filename);
  invariant(binding.sha256 === expected, `${filename} identity drifted`);
  return { binding, payload: readJson(filename) };
};
const parseOperations = (filename) => fs.readFileSync(abs(filename), 'utf8')
  .split(/\r?\n/).filter((line) => line.startsWith('REPL ')).map((line) => {
    const fields = line.split(/\s+/);
    invariant(fields.length === 9, `${filename} contains malformed operation`);
    const coordinates = fields.slice(1, 7).map(Number);
    invariant(coordinates.slice(0, 3).every((entry, index) => entry === coordinates[index + 3]),
      `${filename} contains non-one-cell operation`);
    return { cell: { x: coordinates[0], y: coordinates[1], z: coordinates[2] },
      source: fields[7], desired: fields[8] };
  });

const manifestBinding = fileBinding(MANIFEST);
invariant(manifestBinding.sha256 === EXPECTED.manifest, 'manifest identity drifted');
const manifest = readJson(MANIFEST);
invariant(manifest.manifestIdentity === EXPECTED.manifestIdentity
  && manifest.releaseNodeId === 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING'
  && manifest.mvpScope === true && manifest.packages.length === 1
  && manifest.packages[0].key === PACKAGE_KEY, 'manifest wrapper contract drifted');
const forwardPath = manifest.packages[0].forward;
const rollbackPath = manifest.packages[0].rollback;
const forwardBinding = fileBinding(forwardPath);
const rollbackBinding = fileBinding(rollbackPath);
invariant(forwardBinding.sha256 === EXPECTED.forward && rollbackBinding.sha256 === EXPECTED.rollback,
'operation file identity drifted');
const forward = parseOperations(forwardPath);
const rollback = parseOperations(rollbackPath);
const desiredRail = 'minecraft:rail[shape=east_west,waterlogged=false]';
invariant(forward.length === 80 && rollback.length === 80
  && forward.every(({ cell, source, desired }, index) => cell.x === 2049 + index
    && cell.y === 246 && cell.z === -768 && source === 'minecraft:air' && desired === desiredRail)
  && rollback.every(({ cell, source, desired }, index) => cell.x === 2128 - index
    && cell.y === 246 && cell.z === -768 && source === desiredRail && desired === 'minecraft:air'),
'forward/rollback rail sequence is not the exact reverse-order inverse');
invariant(hashCells(forward.map(({ cell }) => cell)) === EXPECTED.target
  && hashCells(rollback.map(({ cell }) => cell)) === EXPECTED.target,
'operation target identity drifted');

const manifestGate = boundJson(path.join(EVIDENCE_DIR, 'exact-release-manifest-qa.json'), EXPECTED.manifestGate);
const forwardPreflight = boundJson(path.join(EVIDENCE_DIR, 'forward-preflight.json'), EXPECTED.forwardPreflight);
const rollbackPreflight = boundJson(path.join(EVIDENCE_DIR, 'projected-rollback-preflight.json'), EXPECTED.rollbackPreflight);
const forwardParser = boundJson(path.join(EVIDENCE_DIR, 'forward-parser-dry-run.json'), EXPECTED.forwardParser);
const rollbackParser = boundJson(path.join(EVIDENCE_DIR, 'rollback-parser-dry-run.json'), EXPECTED.rollbackParser);
const blockEntity = boundJson(path.join(EVIDENCE_DIR, 'block-entity-clearance.json'), EXPECTED.blockEntity);
const wrapperPlan = boundJson(path.join(EVIDENCE_DIR, 'wrapper-print-plan.json'), EXPECTED.wrapperPlan);
invariant(manifestGate.payload.status === 'PASS'
  && manifestGate.payload.totals.uniqueTargetCells === 80
  && manifestGate.payload.totals.crossPackageIntersectionCells === 0,
'exact release manifest gate failed');
invariant(forwardPreflight.payload.status === 'PASS' && forwardPreflight.payload.operationCount === 80
  && forwardPreflight.payload.passed === 80 && forwardPreflight.payload.failed === 0
  && forwardPreflight.payload.regionsSnapshot.sha256 === EXPECTED.sourceRegion,
'forward source preflight failed');
invariant(rollbackPreflight.payload.status === 'PASS' && rollbackPreflight.payload.operationCount === 80
  && rollbackPreflight.payload.passed === 80 && rollbackPreflight.payload.failed === 0
  && rollbackPreflight.payload.regionsSnapshot.sha256 === EXPECTED.sourceRegion
  && rollbackPreflight.payload.sourceOverlays.operationCount === 80
  && rollbackPreflight.payload.sourceOverlays.failed === 0,
'projected rollback preflight failed');
for (const [role, parser, expectedHash] of [
  ['forward', forwardParser.payload, EXPECTED.forward],
  ['rollback', rollbackParser.payload, EXPECTED.rollback],
]) {
  invariant(parser.status === 'dry_run' && parser.dryRun === true && parser.strictNoop === true
    && parser.operationRole === role && parser.operationSha256 === expectedHash
    && parser.sourceOperationCount === 80 && parser.commandCount === 80
    && parser.worldEditLeftoverCount === 0, `${role} strict-noop parser gate failed`);
}
invariant(blockEntity.payload.status === 'PASS' && blockEntity.payload.operationCount === 80
  && blockEntity.payload.chunksMissing === 0 && blockEntity.payload.blockingBlockEntityCount === 0,
'block-entity source gate failed');
invariant(wrapperPlan.payload.mode === 'PREPARE_ONLY'
  && wrapperPlan.payload.globalGateDependency === 'NONE'
  && wrapperPlan.payload.packageOrder.join(',') === PACKAGE_KEY
  && wrapperPlan.payload.stages.length === 10, 'wrapper print-plan contract failed');

const checks = [
  ['R12E-OFFLINE-01-R12D-POST-QA-BINDING',
    manifest.source.completeSaveSha256 === EXPECTED.sourceComplete
      && manifest.source.regionSnapshotSha256 === EXPECTED.sourceRegion
      && manifest.source.predecessor.completedReleaseIdentitySha256 === EXPECTED.sourceCompleted
      && manifest.source.predecessor.postQaPayloadSha256 === EXPECTED.sourceQaPayload],
  ['R12E-OFFLINE-02-EXACT-RAIL-DATUM-SUBSET',
    manifest.target.operatedUnion.cellCount === 80
      && manifest.target.operatedUnion.coordinateSetSha256 === EXPECTED.target],
  ['R12E-OFFLINE-03-EXACT-INVERSE-SEQUENCE',
    JSON.stringify(rollback) === JSON.stringify(forward.slice().reverse().map((operation) => ({
      cell: operation.cell, source: operation.desired, desired: operation.source,
    })))],
  ['R12E-OFFLINE-04-UNIQUE-LARGEST-ISOLATED-LEVEL-RUN',
    manifest.remainingRailDatumInventory.independentlyIsolatedRunCount === 1
      && manifest.remainingRailDatumInventory.selectedUniqueLargestRun.cellCount === 80],
  ['R12E-OFFLINE-05-TURNS-AND-VERTICAL-TRANSITIONS-EXCLUDED',
    manifest.remainingRailDatumInventory.turnCells.cellCount === 3
      && manifest.remainingRailDatumInventory.verticalTransitionLowerCells.cellCount === 174],
  ['R12E-OFFLINE-06-SUPPORT-HEADROOM-AND-GAPS',
    manifest.safetyAudit.exactSolidSupportCount === 80
      && manifest.safetyAudit.exactAirHeadroomCount === 80
      && manifest.scope.geometry.retainedIsolationGaps.cellCount === 2],
  ['R12E-OFFLINE-07-RAIL-UPDATE-DETERMINISM',
    manifest.safetyAudit.railUpdateDeterminism.straightSingleAxis === true
      && manifest.safetyAudit.railUpdateDeterminism.branchCount === 0
      && manifest.safetyAudit.railUpdateDeterminism.cardinalAdjacencyToPriorRailCount === 0],
  ['R12E-OFFLINE-08-HAZARD-CONTAINER-AND-ENTITY-CLEARANCE',
    ['haloFluidCount', 'haloGravityCount', 'haloExistingMechanismCount',
      'haloContainerOrControlCount', 'haloBlockEntityCount', 'haloSavedEntityCount',
      'haloProtectedRelicCount'].every((key) => manifest.safetyAudit[key] === 0)],
  ['R12E-OFFLINE-09-PRIOR-RELEASE-PRESERVATION',
    manifest.preservation.undeclaredPriorReleaseIntersectionCount === 0
      && manifest.preservation.preservedR12cRail.cellCount === 231
      && manifest.preservation.preservedR12dRail.cellCount === 19],
  ['R12E-OFFLINE-10-FORWARD-PREFLIGHT', forwardPreflight.payload.failed === 0],
  ['R12E-OFFLINE-11-PROJECTED-ROLLBACK', rollbackPreflight.payload.failed === 0],
  ['R12E-OFFLINE-12-STRICT-NOOP-PARSERS',
    forwardParser.payload.strictNoop === true && rollbackParser.payload.strictNoop === true],
  ['R12E-OFFLINE-13-BLOCK-ENTITY-EVIDENCE', blockEntity.payload.blockingBlockEntityCount === 0],
  ['R12E-OFFLINE-14-WRAPPER-PREPARE-CONTRACT', wrapperPlan.payload.mode === 'PREPARE_ONLY'],
  ['R12E-OFFLINE-15-NO-COMMISSIONING-OR-LIVE-MUTATION',
    manifest.scope.operationalBoundary.funicularCommissioned === false
      && Object.values(manifest.safetyBoundary).filter((entry) => entry === true).length === 0],
].map(([id, passed]) => ({ id, status: passed ? 'PASS' : 'FAIL' }));
invariant(checks.every(({ status }) => status === 'PASS'), 'one or more readiness checks failed');

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R12E_ISOLATED_UPPER_LEVEL_CARDINAL_PASSIVE_RAIL_OFFLINE_READY',
  releaseNodeId: manifest.releaseNodeId,
  readinessScopeId: 'CZ-R12E-P1-B09-ISOLATED-UPPER-LEVEL-CARDINAL-PASSIVE-RAIL',
  mvpScope: true,
  bindings: {
    manifest: manifestBinding, manifestIdentity: manifest.manifestIdentity,
    forward: forwardBinding, rollback: rollbackBinding,
    exactReleaseManifestQa: manifestGate.binding, forwardPreflight: forwardPreflight.binding,
    projectedRollbackPreflight: rollbackPreflight.binding, forwardParser: forwardParser.binding,
    rollbackParser: rollbackParser.binding, blockEntityClearance: blockEntity.binding,
    wrapperPrintPlan: wrapperPlan.binding,
  },
  result: {
    targetCellCount: forward.length, targetCoordinateSetSha256: hashCells(forward.map(({ cell }) => cell)),
    desiredState: desiredRail, supportCellCount: manifest.safetyAudit.exactSolidSupportCount,
    headroomCellCount: manifest.safetyAudit.exactAirHeadroomCount,
    retainedIsolationGapCount: manifest.scope.geometry.retainedIsolationGaps.cellCount,
    preservedPriorRailCount: manifest.preservation.preservedR12cRail.cellCount
      + manifest.preservation.preservedR12dRail.cellCount,
    savedEntityIntersectionCount: manifest.safetyAudit.haloSavedEntityCount,
    blockEntityIntersectionCount: blockEntity.payload.blockingBlockEntityCount,
    forwardPreflightPassed: forwardPreflight.payload.passed,
    projectedRollbackPreflightPassed: rollbackPreflight.payload.passed,
    wrapperMode: wrapperPlan.payload.mode,
  },
  railDatumDisposition: {
    remainingMultiCellLevelRunCountBeforePackage:
      manifest.remainingRailDatumInventory.remainingMultiCellLevelRuns.length,
    independentlyIsolatedRunCountBeforePackage:
      manifest.remainingRailDatumInventory.independentlyIsolatedRunCount,
    nontrivialIsolatedLevelCardinalRunRemainingAfterPackage: false,
    lowerStationInterfaceRunHeld: true,
    allTurnAndVerticalTransitionClassesHeld: true,
  },
  functionalBoundary: {
    isolatedCardinalPassiveRailReady: true, liveExecutionReadyWithoutFreshKernel: false,
    rebindRequiredIfAcceptedTerminalAdvances: true, turnRailDesignedOrInstalled: false,
    slopeRailDesignedOrInstalled: false, funicularCommissioned: false,
    passengerOrRescueRouteCommissioned: false,
    driveBrakeVehicleControlPowerDrainageInstalled: false,
  },
  blockedRailClasses: manifest.blockedRailClasses,
  checks,
  summary: { passed: true, checkCount: checks.length, passCount: checks.length, failCount: 0 },
  safetyBoundary: {
    liveCallsPerformed: false, apiCallsPerformed: false, rconCallsPerformed: false,
    serviceMutationsPerformed: false, worldEditsPerformed: false,
  },
};
const readinessPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, readinessPayloadSha256 };
fs.mkdirSync(path.dirname(abs(OUT)), { recursive: true });
fs.writeFileSync(abs(OUT), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(abs(MARKDOWN), `# CZ-R12E isolated B09 upper level-cardinal rail readiness\n\n`
  + `**Status:** ${report.status}  \n**Readiness payload:** \`${readinessPayloadSha256}\`\n\n`
  + `- Exact passive rail: 80 east-west cells on frozen datum indices 420..499.\n`
  + `- This is the unique largest two-sided isolated level-cardinal run remaining after R12C/R12D.\n`
  + `- Index 419 remains the vertical-transition gap; index 500 remains the turn gap.\n`
  + `- Support/headroom: 80/80; source saved entities/block entities: 0/0.\n`
  + `- Forward/projected rollback guards: 80/80; wrapper: PREPARE_ONLY.\n`
  + `- No nontrivial two-sided isolated level run remains after this package; turns, grades, station interfaces, active systems, and transport commissioning remain held.\n`);
console.log(JSON.stringify({
  status: report.status, output: rel(OUT), markdown: rel(MARKDOWN),
  readinessPayloadSha256, targetCellCount: forward.length, checkCount: checks.length,
  liveCallsPerformed: false, worldEditsPerformed: false,
}, null, 2));
