#!/usr/bin/env node
/** Deterministic offline QA for the R12D isolated hairpin cardinal passive rail. */

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
  'data/world-review/combined-zones-r12d-b09-isolated-hairpin-cardinal-passive-rail-offline-20260822T005000Z',
);
const OUT = value('--out', path.join(EVIDENCE_DIR, 'r12d-offline-readiness.json'));
const MARKDOWN = value('--markdown', path.join(EVIDENCE_DIR, 'r12d-offline-readiness.md'));
const GENERATED_AT = value('--generated-at', '2026-08-22T00:50:00Z');
const MANIFEST =
  'data/buildops/combined-zones-r12d-b09-isolated-hairpin-cardinal-passive-rail.release-manifest.json';
const PACKAGE_KEY = 'b09-isolated-hairpin-cardinal-passive-rail';
const EXPECTED = Object.freeze({
  manifest: 'bba29822282eb5de5276f86f5a11f01a4a8018b288d73a3955f36f089eff0af1',
  manifestIdentity: '4d360dc80d659dc26bd3359f15dcd234d05fdb2a759dab9e1b10021bc41f3cb0',
  forward: '619b38a4ab5e1c0a52ab117b3039f3850f0606b5c3faa3767a1437e35cea884f',
  rollback: 'e03cacaa8593b67b59d7b51579560dfc9b69ac33efc961d184222adb909828f9',
  manifestGate: '122df6c2aa8013dda2422e129e8e379f7af8e7433778f16c0e72495ff8b8d4ef',
  forwardPreflight: 'ce157c0d0df3efc7e96fb864c5f16e0a8d0e7e2f930abc1913c5afbe95d23227',
  rollbackPreflight: '7ee9f2614cf5c2df3f81834eea5a3213217eb1de29f6bacb2f6d1bd98d820aa6',
  forwardParser: '415c511f7bcbc8af48dfbfc158a5bafe80e8d0378d689290a868120264c7635e',
  rollbackParser: '3f2e371aa77550759c535b08bcf9a652085597a91a10c8de19def69cfb7d3b67',
  blockEntity: '9ac54252e6777d39ff986eb2e2f8b03c3e9e950367d74b11e4fec74f876c14f9',
  wrapperPlan: '2a8ef33fa4e3fef7403a437dbec8f466c6838b7f7988de4a2fb9ebefd85868a8',
  sourceRegion: 'd899d084dd13f27c10ff8cdd40ad509967a3ade5c927cd22bbfdcab44a9ab80d',
  sourceComplete: '1c51b53415dc35060a4aefacaac8e7e8b3ca588a457c3c4ce28329e06f6fb02d',
  sourceCompleted: '516755fa28b16d5d7d5b1baec7dd63e33be73276ed42d69b8f58bb75cba74480',
  sourceQaPayload: '145dc2e1a30081aa4be1e6fd7204fe6f09b5bbe6828e9dea77f3791fe6d47deb',
  target: 'd34c55e58763b4e6666edd4a973769e5e468ee185f7ef044334670ffcff41754',
});

const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R12D passive-rail offline QA rejected: ${message}`);
};
const fileBinding = (filename) => ({
  path: rel(filename),
  sha256: sha256(fs.readFileSync(abs(filename))),
  bytes: fs.statSync(abs(filename)).size,
});
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const boundJson = (filename, expected) => {
  const binding = fileBinding(filename);
  invariant(binding.sha256 === expected, `${filename} identity drifted`);
  return { binding, payload: readJson(filename) };
};
const parseOperations = (filename) => fs.readFileSync(abs(filename), 'utf8')
  .split(/\r?\n/)
  .filter((line) => line.startsWith('REPL '))
  .map((line) => {
    const fields = line.split(/\s+/);
    invariant(fields.length === 9, `${filename} contains malformed operation`);
    const coordinates = fields.slice(1, 7).map(Number);
    invariant(coordinates.slice(0, 3).every((entry, index) => (
      entry === coordinates[index + 3]
    )), `${filename} contains non-one-cell operation`);
    return {
      cell: { x: coordinates[0], y: coordinates[1], z: coordinates[2] },
      source: fields[7],
      desired: fields[8],
    };
  });

const manifestBinding = fileBinding(MANIFEST);
invariant(manifestBinding.sha256 === EXPECTED.manifest, 'manifest identity drifted');
const manifest = readJson(MANIFEST);
invariant(manifest.manifestIdentity === EXPECTED.manifestIdentity
  && manifest.releaseNodeId === 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING'
  && manifest.mvpScope === true
  && manifest.packages.length === 1
  && manifest.packages[0].key === PACKAGE_KEY,
'manifest wrapper contract drifted');
const forwardPath = manifest.packages[0].forward;
const rollbackPath = manifest.packages[0].rollback;
const forwardBinding = fileBinding(forwardPath);
const rollbackBinding = fileBinding(rollbackPath);
invariant(forwardBinding.sha256 === EXPECTED.forward
  && rollbackBinding.sha256 === EXPECTED.rollback,
'operation file identity drifted');
const forward = parseOperations(forwardPath);
const rollback = parseOperations(rollbackPath);
const desiredRail = 'minecraft:rail[shape=north_south,waterlogged=false]';
invariant(forward.length === 19 && rollback.length === 19
  && forward.every(({ cell, source, desired }, index) => (
    cell.x === 2288 && cell.y === 130 && cell.z === -767 + index
      && source === 'minecraft:air' && desired === desiredRail
  ))
  && rollback.every(({ cell, source, desired }, index) => (
    cell.x === 2288 && cell.y === 130 && cell.z === -749 - index
      && source === desiredRail && desired === 'minecraft:air'
  )), 'forward/rollback rail sequence is not the exact reverse-order inverse');
invariant(hashCells(forward.map(({ cell }) => cell)) === EXPECTED.target
  && hashCells(rollback.map(({ cell }) => cell)) === EXPECTED.target,
'operation target identity drifted');

const manifestGatePath = path.join(EVIDENCE_DIR, 'exact-release-manifest-qa.json');
const forwardPreflightPath = path.join(EVIDENCE_DIR, 'forward-preflight.json');
const rollbackPreflightPath = path.join(EVIDENCE_DIR, 'projected-rollback-preflight.json');
const forwardParserPath = path.join(EVIDENCE_DIR, 'forward-parser-dry-run.json');
const rollbackParserPath = path.join(EVIDENCE_DIR, 'rollback-parser-dry-run.json');
const blockEntityPath = path.join(EVIDENCE_DIR, 'block-entity-clearance.json');
const wrapperPlanPath = path.join(EVIDENCE_DIR, 'wrapper-print-plan.json');
const manifestGate = boundJson(manifestGatePath, EXPECTED.manifestGate);
const forwardPreflight = boundJson(forwardPreflightPath, EXPECTED.forwardPreflight);
const rollbackPreflight = boundJson(rollbackPreflightPath, EXPECTED.rollbackPreflight);
const forwardParser = boundJson(forwardParserPath, EXPECTED.forwardParser);
const rollbackParser = boundJson(rollbackParserPath, EXPECTED.rollbackParser);
const blockEntity = boundJson(blockEntityPath, EXPECTED.blockEntity);
const wrapperPlan = boundJson(wrapperPlanPath, EXPECTED.wrapperPlan);
invariant(manifestGate.payload.status === 'PASS'
  && manifestGate.payload.totals.uniqueTargetCells === 19
  && manifestGate.payload.totals.crossPackageIntersectionCells === 0,
'exact release manifest gate failed');
invariant(forwardPreflight.payload.status === 'PASS'
  && forwardPreflight.payload.operationCount === 19
  && forwardPreflight.payload.passed === 19
  && forwardPreflight.payload.failed === 0
  && forwardPreflight.payload.regionsSnapshot.sha256 === EXPECTED.sourceRegion,
'forward source preflight failed');
invariant(rollbackPreflight.payload.status === 'PASS'
  && rollbackPreflight.payload.operationCount === 19
  && rollbackPreflight.payload.passed === 19
  && rollbackPreflight.payload.failed === 0
  && rollbackPreflight.payload.regionsSnapshot.sha256 === EXPECTED.sourceRegion
  && rollbackPreflight.payload.sourceOverlays.artifacts.length === 1
  && rollbackPreflight.payload.sourceOverlays.operationCount === 19
  && rollbackPreflight.payload.sourceOverlays.failed === 0,
'projected rollback preflight failed');
for (const [role, parser, expectedHash] of [
  ['forward', forwardParser.payload, EXPECTED.forward],
  ['rollback', rollbackParser.payload, EXPECTED.rollback],
]) {
  invariant(parser.status === 'dry_run' && parser.dryRun === true
    && parser.strictNoop === true && parser.operationRole === role
    && parser.operationSha256 === expectedHash
    && parser.sourceOperationCount === 19 && parser.commandCount === 19
    && parser.worldEditLeftoverCount === 0,
  `${role} strict-noop parser gate failed`);
}
invariant(blockEntity.payload.status === 'PASS'
  && blockEntity.payload.operationCount === 19
  && blockEntity.payload.chunksMissing === 0
  && blockEntity.payload.blockingBlockEntityCount === 0,
'block-entity source gate failed');
invariant(wrapperPlan.payload.mode === 'PREPARE_ONLY'
  && wrapperPlan.payload.globalGateDependency === 'NONE'
  && wrapperPlan.payload.packageOrder.join(',') === PACKAGE_KEY
  && wrapperPlan.payload.stages.length === 10,
'wrapper print-plan contract failed');

const checks = [
  ['R12D-OFFLINE-01-R12C-POST-QA-BINDING',
    manifest.source.completeSaveSha256 === EXPECTED.sourceComplete
      && manifest.source.regionSnapshotSha256 === EXPECTED.sourceRegion
      && manifest.source.predecessor.completedReleaseIdentitySha256 === EXPECTED.sourceCompleted
      && manifest.source.predecessor.postQaPayloadSha256 === EXPECTED.sourceQaPayload],
  ['R12D-OFFLINE-02-EXACT-RAIL-DATUM-SUBSET',
    manifest.target.operatedUnion.cellCount === 19
      && manifest.target.operatedUnion.coordinateSetSha256 === EXPECTED.target],
  ['R12D-OFFLINE-03-EXACT-INVERSE-SEQUENCE',
    JSON.stringify(rollback) === JSON.stringify(forward.slice().reverse().map((operation) => ({
      cell: operation.cell,
      source: operation.desired,
      desired: operation.source,
    })))],
  ['R12D-OFFLINE-04-SUPPORT-HEADROOM-AND-TURN-GAPS',
    manifest.safetyAudit.exactSolidSupportCount === 19
      && manifest.safetyAudit.exactAirHeadroomCount === 19
      && manifest.scope.geometry.retainedIsolationTurnGaps.cellCount === 2],
  ['R12D-OFFLINE-05-RAIL-UPDATE-DETERMINISM',
    manifest.safetyAudit.railUpdateDeterminism.straightSingleAxis === true
      && manifest.safetyAudit.railUpdateDeterminism.branchCount === 0
      && manifest.safetyAudit.railUpdateDeterminism.cardinalAdjacencyToPriorRailCount === 0],
  ['R12D-OFFLINE-06-HAZARD-CONTAINER-AND-ENTITY-CLEARANCE',
    ['haloFluidCount', 'haloGravityCount', 'haloUndeclaredMechanismCount',
      'haloContainerOrControlCount', 'haloBlockEntityCount', 'haloSavedEntityCount',
      'haloProtectedRelicCount'].every((key) => manifest.safetyAudit[key] === 0)],
  ['R12D-OFFLINE-07-REVIEWED-R12C-DIAGONAL-RAIL',
    manifest.safetyAudit.haloExistingMechanismCount === 1
      && manifest.safetyAudit.reviewedAdjacentMechanismCount === 1],
  ['R12D-OFFLINE-08-PRIOR-RELEASE-PRESERVATION',
    manifest.preservation.undeclaredPriorReleaseIntersectionCount === 0
      && manifest.preservation.preservedR12cStraightRail.cellCount === 231],
  ['R12D-OFFLINE-09-FORWARD-PREFLIGHT', forwardPreflight.payload.failed === 0],
  ['R12D-OFFLINE-10-PROJECTED-ROLLBACK', rollbackPreflight.payload.failed === 0],
  ['R12D-OFFLINE-11-STRICT-NOOP-PARSERS',
    forwardParser.payload.strictNoop === true && rollbackParser.payload.strictNoop === true],
  ['R12D-OFFLINE-12-BLOCK-ENTITY-EVIDENCE', blockEntity.payload.blockingBlockEntityCount === 0],
  ['R12D-OFFLINE-13-WRAPPER-PREPARE-CONTRACT', wrapperPlan.payload.mode === 'PREPARE_ONLY'],
  ['R12D-OFFLINE-14-NO-OPERATIONAL-OVERCLAIM',
    manifest.scope.operationalBoundary.funicularCommissioned === false
      && manifest.scope.failSafeState.vehicleInstalled === false
      && manifest.scope.failSafeState.curveRailInstalled === false
      && manifest.scope.failSafeState.slopeRailInstalled === false],
  ['R12D-OFFLINE-15-NO-LIVE-MUTATION',
    Object.values(manifest.safetyBoundary).filter((entry) => entry === true).length === 0],
].map(([id, passed]) => ({ id, status: passed ? 'PASS' : 'FAIL' }));
invariant(checks.every(({ status }) => status === 'PASS'), 'one or more readiness checks failed');

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R12D_ISOLATED_HAIRPIN_CARDINAL_PASSIVE_RAIL_OFFLINE_READY',
  releaseNodeId: manifest.releaseNodeId,
  readinessScopeId: 'CZ-R12D-P1-B09-ISOLATED-HAIRPIN-CARDINAL-PASSIVE-RAIL',
  mvpScope: true,
  bindings: {
    manifest: manifestBinding,
    manifestIdentity: manifest.manifestIdentity,
    forward: forwardBinding,
    rollback: rollbackBinding,
    exactReleaseManifestQa: manifestGate.binding,
    forwardPreflight: forwardPreflight.binding,
    projectedRollbackPreflight: rollbackPreflight.binding,
    forwardParser: forwardParser.binding,
    rollbackParser: rollbackParser.binding,
    blockEntityClearance: blockEntity.binding,
    wrapperPrintPlan: wrapperPlan.binding,
  },
  result: {
    targetCellCount: forward.length,
    targetCoordinateSetSha256: hashCells(forward.map(({ cell }) => cell)),
    desiredState: desiredRail,
    supportCellCount: manifest.safetyAudit.exactSolidSupportCount,
    headroomCellCount: manifest.safetyAudit.exactAirHeadroomCount,
    retainedTurnGapCount: manifest.scope.geometry.retainedIsolationTurnGaps.cellCount,
    preservedR12cRailCount: manifest.preservation.preservedR12cStraightRail.cellCount,
    savedEntityIntersectionCount: manifest.safetyAudit.haloSavedEntityCount,
    blockEntityIntersectionCount: blockEntity.payload.blockingBlockEntityCount,
    forwardPreflightPassed: forwardPreflight.payload.passed,
    projectedRollbackPreflightPassed: rollbackPreflight.payload.passed,
    wrapperMode: wrapperPlan.payload.mode,
  },
  functionalBoundary: {
    isolatedCardinalPassiveRailReady: true,
    liveExecutionReadyWithoutFreshKernel: false,
    rebindRequiredIfAcceptedTerminalAdvances: true,
    actualTurnRailDesignedOrInstalled: false,
    slopeRailDesignedOrInstalled: false,
    funicularCommissioned: false,
    passengerOrRescueRouteCommissioned: false,
    driveBrakeVehicleControlPowerDrainageInstalled: false,
  },
  blockedRailClasses: manifest.blockedRailClasses,
  residualBlocker: manifest.residualActiveSystemBlockers,
  checks,
  summary: {
    passed: true,
    checkCount: checks.length,
    passCount: checks.length,
    failCount: 0,
  },
  safetyBoundary: {
    liveCallsPerformed: false,
    apiCallsPerformed: false,
    rconCallsPerformed: false,
    serviceMutationsPerformed: false,
    worldEditsPerformed: false,
  },
};
const readinessPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, readinessPayloadSha256 };
fs.mkdirSync(path.dirname(abs(OUT)), { recursive: true });
fs.writeFileSync(abs(OUT), `${JSON.stringify(report, null, 2)}\n`);
const markdown = `# CZ-R12D isolated B09 hairpin cardinal rail readiness\n\n`
  + `**Status:** ${report.status}  \n`
  + `**Readiness payload:** \`${readinessPayloadSha256}\`\n\n`
  + `- Exact passive rail: ${forward.length} north-south cells on frozen datum indices 241..259.\n`
  + `- Support/headroom: ${report.result.supportCellCount}/${report.result.headroomCellCount}; retained turn gaps: ${report.result.retainedTurnGapCount}.\n`
  + `- Source entities/block entities: ${report.result.savedEntityIntersectionCount}/${report.result.blockEntityIntersectionCount}; undeclared hazards: zero.\n`
  + `- Forward/projected rollback guards: ${report.result.forwardPreflightPassed}/${report.result.projectedRollbackPreflightPassed}.\n`
  + `- Both 90-degree turns and every slope remain absent. The package does not connect to R12C and does not commission transport.\n`
  + `- Wrapper contract: ${report.result.wrapperMode}; live execution still requires the fresh scoped hard-safety kernel.\n`;
fs.writeFileSync(abs(MARKDOWN), markdown);
console.log(JSON.stringify({
  status: report.status,
  output: rel(OUT),
  markdown: rel(MARKDOWN),
  readinessPayloadSha256,
  targetCellCount: forward.length,
  checkCount: checks.length,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
