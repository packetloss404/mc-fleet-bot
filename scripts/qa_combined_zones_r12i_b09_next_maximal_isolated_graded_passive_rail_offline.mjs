#!/usr/bin/env node
/** Deterministic offline QA for CZ-R12I next maximal isolated graded passive rail. */

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
  'data/world-review/combined-zones-r12i-b09-next-maximal-isolated-graded-passive-rail-offline-20260822T024000Z',
);
const OUT = value('--out', path.join(EVIDENCE_DIR, 'r12i-offline-readiness.json'));
const MARKDOWN = value('--markdown', path.join(EVIDENCE_DIR, 'r12i-offline-readiness.md'));
const GENERATED_AT = value('--generated-at', '2026-08-22T02:40:00Z');
const MANIFEST =
  'data/buildops/combined-zones-r12i-b09-next-maximal-isolated-four-cell-graded-passive-rail.release-manifest.json';
const PACKAGE_KEY = 'b09-next-maximal-02-isolated-four-cell-graded-passive-rail';
const EXPECTED = Object.freeze({
  manifest: '9cd2cd62801aae251c29ebc9526ef5102e6737fc9c3062e7a670a8dd9616d513',
  manifestIdentity: '8b6343f26b2d2513cf7e94288fa76981bd5d634b92021df61406be60f4d9aac1',
  forward: 'd4b95127950bb367cfc0c072cfea45ce0a2195d386efa824fe565ca852beebe1',
  rollback: '46d6db482933f1507d75c748db6806218f1a757bb957220d0fca40d8beb4e9a6',
  manifestGate: '4c290347432fa2c1a08a30cf8200fbddb1aa880744e099141ac57ab16ced80ab',
  forwardPreflight: '3caad34a460901892491a799b1af41234cabb42347835147119d8d77be0615cd',
  rollbackPreflight: '2f433ff969f5216de88b3772c93e7107c55415b4117f51f0c76a51e7d82f0f9d',
  forwardParser: '518bf9b0d696cf88cd2f5d0e9e637f49fa4d01e1872667ad4dd30d131f4c3a3f',
  rollbackParser: '73b3d5b0b9f42238aa5461a8050bdd93ad18046ae76a1f3eb6d8aafb0b19fe77',
  blockEntity: '9347a42795de1d721c85fe6ea64c24e210d9a4d7a2b488dc6a056c189a5ee197',
  wrapperPlan: 'd84734b9e4435ffa80c3c8bd970affbff6c87d50bfc0850cf966c5a03e853c8a',
  sourceRegion: '51ca4a63132fdeca060485f36991add4a8012a748154c4136c69db2ac919651d',
  sourceComplete: '8dbd2e6c75c20e5c580b3e338ca970aad0307b417e0691c0f186f46c97be7b41',
  sourceCompleted: 'a7be316c903bdfb71934d0e543b4cb875f3eef4fbe15fbe1a090b4c456ac8d92',
  sourceQaPayload: '30e194abdafae329da025ddf6d66d336fe7ab68318a14b7de176dc73154ff963',
  target: '0def8552020fb272fe57c09a7441dd5a3dc4dfcdc672ea72274544a007d95ad0',
});

const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R12I passive-rail offline QA rejected: ${message}`);
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
const ascendingWest = 'minecraft:rail[shape=ascending_west,waterlogged=false]';
const eastWest = 'minecraft:rail[shape=east_west,waterlogged=false]';
const exactForward = [
  { x: 2252, y: 156, z: -768, desired: eastWest },
  { x: 2253, y: 155, z: -768, desired: ascendingWest },
  { x: 2254, y: 154, z: -768, desired: ascendingWest },
  { x: 2255, y: 153, z: -768, desired: ascendingWest },
];
invariant(forward.length === 4 && rollback.length === 4
  && forward.every(({ cell, source, desired }, index) => cell.x === exactForward[index].x
    && cell.y === exactForward[index].y && cell.z === exactForward[index].z
    && source === 'minecraft:air' && desired === exactForward[index].desired)
  && rollback.every(({ cell, source, desired }, index) => {
    const operation = exactForward[exactForward.length - 1 - index];
    return cell.x === operation.x && cell.y === operation.y && cell.z === operation.z
      && source === operation.desired && desired === 'minecraft:air';
  }),
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
  && manifestGate.payload.totals.uniqueTargetCells === 4
  && manifestGate.payload.totals.crossPackageIntersectionCells === 0,
'exact release manifest gate failed');
invariant(forwardPreflight.payload.status === 'PASS' && forwardPreflight.payload.operationCount === 4
  && forwardPreflight.payload.passed === 4 && forwardPreflight.payload.failed === 0
  && forwardPreflight.payload.regionsSnapshot.sha256 === EXPECTED.sourceRegion,
'forward source preflight failed');
invariant(rollbackPreflight.payload.status === 'PASS' && rollbackPreflight.payload.operationCount === 4
  && rollbackPreflight.payload.passed === 4 && rollbackPreflight.payload.failed === 0
  && rollbackPreflight.payload.regionsSnapshot.sha256 === EXPECTED.sourceRegion
  && rollbackPreflight.payload.sourceOverlays.operationCount === 4
  && rollbackPreflight.payload.sourceOverlays.failed === 0,
'projected rollback preflight failed');
for (const [role, parser, expectedHash] of [
  ['forward', forwardParser.payload, EXPECTED.forward],
  ['rollback', rollbackParser.payload, EXPECTED.rollback],
]) {
  invariant(parser.status === 'dry_run' && parser.dryRun === true && parser.strictNoop === true
    && parser.operationRole === role && parser.operationSha256 === expectedHash
    && parser.sourceOperationCount === 4 && parser.commandCount === 4
    && parser.worldEditLeftoverCount === 0, `${role} strict-noop parser gate failed`);
}
invariant(blockEntity.payload.status === 'PASS' && blockEntity.payload.operationCount === 4
  && blockEntity.payload.chunksMissing === 0 && blockEntity.payload.blockingBlockEntityCount === 0,
'block-entity source gate failed');
invariant(wrapperPlan.payload.mode === 'PREPARE_ONLY'
  && wrapperPlan.payload.globalGateDependency === 'NONE'
  && wrapperPlan.payload.packageOrder.join(',') === PACKAGE_KEY
  && wrapperPlan.payload.stages.length === 10, 'wrapper print-plan contract failed');

const checks = [
  ['R12I-OFFLINE-01-R12H-POST-QA-BINDING',
    manifest.source.completeSaveSha256 === EXPECTED.sourceComplete
      && manifest.source.regionSnapshotSha256 === EXPECTED.sourceRegion
      && manifest.source.predecessor.completedReleaseIdentitySha256 === EXPECTED.sourceCompleted
      && manifest.source.predecessor.postQaPayloadSha256 === EXPECTED.sourceQaPayload],
  ['R12I-OFFLINE-02-EXACT-RAIL-DATUM-SUBSET',
    manifest.target.operatedUnion.cellCount === 4
      && manifest.target.operatedUnion.coordinateSetSha256 === EXPECTED.target],
  ['R12I-OFFLINE-03-EXACT-INVERSE-SEQUENCE',
    JSON.stringify(rollback) === JSON.stringify(forward.slice().reverse().map((operation) => ({
      cell: operation.cell, source: operation.desired, desired: operation.source,
    })))],
  ['R12I-OFFLINE-04-PRODUCTION-RUNTIME-STATE-PROOF',
    manifest.runtimeUpdateProof.forwardStatePassCount === 4
      && manifest.runtimeUpdateProof.rollbackAirPassCount === 4
      && manifest.runtimeUpdateProof.productionMutationPerformed === false],
  ['R12I-OFFLINE-05-EXACT-UPPER-TO-LOWER-ORDER',
    manifest.safetyAudit.railUpdateDeterminism.forwardOrder === 'UPPER_TO_LOWER'
      && manifest.safetyAudit.railUpdateDeterminism.rollbackOrder
        === 'LOWER_TO_UPPER_EXACT_REVERSE'],
  ['R12I-OFFLINE-06-SUPPORT-HEADROOM-AND-GAPS',
    manifest.safetyAudit.exactSolidSupportCount === 4
      && manifest.safetyAudit.exactAirHeadroomCount === 4
      && manifest.scope.geometry.retainedIsolationGaps.cellCount === 2],
  ['R12I-OFFLINE-07-RAIL-UPDATE-DETERMINISM',
    manifest.safetyAudit.railUpdateDeterminism.exactOneToOneWestRise === true
      && manifest.safetyAudit.railUpdateDeterminism.exactProductionVersionRuntimeProofPassed],
  ['R12I-OFFLINE-08-HAZARD-CONTAINER-AND-ENTITY-CLEARANCE',
    ['haloFluidCount', 'haloGravityCount', 'haloUndeclaredMechanismCount',
      'haloContainerOrControlCount', 'haloBlockEntityCount', 'haloSavedEntityCount',
      'haloProtectedRelicCount'].every((key) => manifest.safetyAudit[key] === 0)],
  ['R12I-OFFLINE-09-PRIOR-RELEASE-PRESERVATION',
    manifest.preservation.undeclaredPriorReleaseIntersectionCount === 0
      && manifest.preservation.preservedR12cRail.cellCount === 231
      && manifest.preservation.preservedR12dRail.cellCount === 19
      && manifest.preservation.preservedR12eRail.cellCount === 80
      && manifest.preservation.preservedR12fRail.cellCount === 3
      && manifest.preservation.preservedR12gRail.cellCount === 4
      && manifest.preservation.preservedR12hRail.cellCount === 4],
  ['R12I-OFFLINE-10-FORWARD-PREFLIGHT', forwardPreflight.payload.failed === 0],
  ['R12I-OFFLINE-11-PROJECTED-ROLLBACK', rollbackPreflight.payload.failed === 0],
  ['R12I-OFFLINE-12-STRICT-NOOP-PARSERS',
    forwardParser.payload.strictNoop === true && rollbackParser.payload.strictNoop === true],
  ['R12I-OFFLINE-13-BLOCK-ENTITY-EVIDENCE', blockEntity.payload.blockingBlockEntityCount === 0],
  ['R12I-OFFLINE-14-WRAPPER-PREPARE-CONTRACT', wrapperPlan.payload.mode === 'PREPARE_ONLY'],
  ['R12I-OFFLINE-15-NO-COMMISSIONING-OR-LIVE-MUTATION',
    manifest.scope.operationalBoundary.funicularCommissioned === false
      && Object.values(manifest.safetyBoundary).filter((entry) => entry === true).length === 0],
].map(([id, passed]) => ({ id, status: passed ? 'PASS' : 'FAIL' }));
invariant(checks.every(({ status }) => status === 'PASS'), 'one or more readiness checks failed');

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R12I_NEXT_MAXIMAL_02_ISOLATED_FOUR_CELL_GRADED_PASSIVE_RAIL_OFFLINE_READY',
  releaseNodeId: manifest.releaseNodeId,
  readinessScopeId: 'CZ-R12I-P1-B09-NEXT-MAXIMAL-02-ISOLATED-FOUR-CELL-GRADED-PASSIVE-RAIL',
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
    desiredStatesLowToHigh: [ascendingWest, ascendingWest, ascendingWest, eastWest],
    supportCellCount: manifest.safetyAudit.exactSolidSupportCount,
    headroomCellCount: manifest.safetyAudit.exactAirHeadroomCount,
    retainedIsolationGapCount: manifest.scope.geometry.retainedIsolationGaps.cellCount,
    preservedPriorRailCount: manifest.preservation.preservedR12cRail.cellCount
      + manifest.preservation.preservedR12dRail.cellCount
      + manifest.preservation.preservedR12eRail.cellCount
      + manifest.preservation.preservedR12fRail.cellCount
      + manifest.preservation.preservedR12gRail.cellCount
      + manifest.preservation.preservedR12hRail.cellCount,
    savedEntityIntersectionCount: manifest.safetyAudit.haloSavedEntityCount,
    blockEntityIntersectionCount: blockEntity.payload.blockingBlockEntityCount,
    forwardPreflightPassed: forwardPreflight.payload.passed,
    projectedRollbackPreflightPassed: rollbackPreflight.payload.passed,
    wrapperMode: wrapperPlan.payload.mode,
  },
  railDatumDisposition: {
    firstCenterlineIndex: manifest.scope.selection.firstCenterlineIndex,
    lastCenterlineIndex: manifest.scope.selection.lastCenterlineIndex,
    leftLevelGapIndex: manifest.scope.selection.retainedLeftLevelGapIndex,
    rightLevelGapIndex: manifest.scope.selection.retainedRightLevelGapIndex,
    maximumAscendingWestRunCellCount: manifest.scope.selection.maximumAscendingWestRunCellCount,
    lowerStationInterfaceRunHeld: true,
    allTurnsAndAllOtherGradesHeld: true,
  },
  functionalBoundary: {
    isolatedGradedPassiveRailReady: true, liveExecutionReadyWithoutFreshKernel: false,
    rebindRequiredIfAcceptedTerminalAdvances: true, turnRailDesignedOrInstalled: false,
    exactFourCellSlopeRailDesigned: true, funicularCommissioned: false,
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
fs.writeFileSync(abs(MARKDOWN), `# CZ-R12I next maximal isolated B09 four-cell graded rail readiness\n\n`
  + `**Status:** ${report.status}  \n**Readiness payload:** \`${readinessPayloadSha256}\`\n\n`
  + `- Exact passive rail: indices 293..296, three ascending-west states plus one east-west upper state.\n`
  + `- The exact production Paper 1.21.11 runtime proof passes top-to-bottom placement and exact reverse rollback.\n`
  + `- Indices 292 and 297 remain exact air isolation gaps.\n`
  + `- Support/headroom: 4/4; source saved entities/block entities: 0/0.\n`
  + `- Forward/projected rollback guards: 4/4; wrapper: PREPARE_ONLY.\n`
  + `- All turns, every other grade, station interfaces, active systems, and transport commissioning remain held.\n`);
console.log(JSON.stringify({
  status: report.status, output: rel(OUT), markdown: rel(MARKDOWN),
  readinessPayloadSha256, targetCellCount: forward.length, checkCount: checks.length,
  liveCallsPerformed: false, worldEditsPerformed: false,
}, null, 2));
