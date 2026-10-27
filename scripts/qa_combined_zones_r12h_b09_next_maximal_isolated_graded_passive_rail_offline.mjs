#!/usr/bin/env node
/** Deterministic offline QA for CZ-R12H next maximal isolated graded passive rail. */

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
  'data/world-review/combined-zones-r12h-b09-next-maximal-isolated-graded-passive-rail-offline-20260822T022500Z',
);
const OUT = value('--out', path.join(EVIDENCE_DIR, 'r12h-offline-readiness.json'));
const MARKDOWN = value('--markdown', path.join(EVIDENCE_DIR, 'r12h-offline-readiness.md'));
const GENERATED_AT = value('--generated-at', '2026-08-22T02:25:00Z');
const MANIFEST =
  'data/buildops/combined-zones-r12h-b09-next-maximal-isolated-four-cell-graded-passive-rail.release-manifest.json';
const PACKAGE_KEY = 'b09-next-maximal-isolated-four-cell-graded-passive-rail';
const EXPECTED = Object.freeze({
  manifest: '0e5f01f2e13c6d3659ada3af7bd8f86edc7edea07d68bb04b3686d68bba445c4',
  manifestIdentity: 'e8ca1e8443bd479d8f9e3f69199a18e3497c499b7d4c431ff44c6fad545f4521',
  forward: '49c2042aa8793f1f143f54e6d06a65c2205a37884a2c9e34bb39c70a83a1fcbd',
  rollback: '186291f8313b490efc7aac2ff6af2c96fbcc42cccddbeb4df87bc7ba0de8fcb9',
  manifestGate: '006bcdfa6a39f9091d9d8cca1e6ed71c71435dc35bb239fdf069ad40da084ef7',
  forwardPreflight: '1ab41fd0d5e9da9569435fc54de0738e50413c90b06c4919a5b34087abdec68d',
  rollbackPreflight: 'f6bc0c7b3ecd6dbe71b54fc7adc0c5c27cbcc10842c16a55964bc1aee876e399',
  forwardParser: '059016624906f1385b162ddf30636d2b8b747f3d9240635ebc9a614fc755d06b',
  rollbackParser: '0adf3fd5abfd5a9b757f87b320b778335146284a0ac75f0366590e1886e35e4c',
  blockEntity: '81e6e742c1c1632951f4ff1f3ace83e572e42d5fe069f2c34ce2771c5c4f937f',
  wrapperPlan: 'dab69934f6fbc07358a4418c422b249d27779ae055220cee1948e8bb554de7e5',
  sourceRegion: 'e3a09c6500d89bfa700a55b83f0cad312b2647d8a826ea1d6f650dc045191ce9',
  sourceComplete: 'e9674310deb7b7ef41d21b1e8c2cb8597c013c777e3581428de3e0be5aa44141',
  sourceCompleted: 'd553db34ab30a5a03dc290b72c75df7266748de6ceae66bf8596cc652ab1d160',
  sourceQaPayload: '64eeb69bd5b5af6bf0fd89d8e0d1fd6b4d11b808d218628f4cadb958eb10b53e',
  target: '7e0c109ad5a16196ec13f7d7b9fb98b35dee4c4c5085e623da8e64b327b14ead',
});

const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R12H passive-rail offline QA rejected: ${message}`);
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
  { x: 2263, y: 148, z: -768, desired: eastWest },
  { x: 2264, y: 147, z: -768, desired: ascendingWest },
  { x: 2265, y: 146, z: -768, desired: ascendingWest },
  { x: 2266, y: 145, z: -768, desired: ascendingWest },
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
  ['R12H-OFFLINE-01-R12G-POST-QA-BINDING',
    manifest.source.completeSaveSha256 === EXPECTED.sourceComplete
      && manifest.source.regionSnapshotSha256 === EXPECTED.sourceRegion
      && manifest.source.predecessor.completedReleaseIdentitySha256 === EXPECTED.sourceCompleted
      && manifest.source.predecessor.postQaPayloadSha256 === EXPECTED.sourceQaPayload],
  ['R12H-OFFLINE-02-EXACT-RAIL-DATUM-SUBSET',
    manifest.target.operatedUnion.cellCount === 4
      && manifest.target.operatedUnion.coordinateSetSha256 === EXPECTED.target],
  ['R12H-OFFLINE-03-EXACT-INVERSE-SEQUENCE',
    JSON.stringify(rollback) === JSON.stringify(forward.slice().reverse().map((operation) => ({
      cell: operation.cell, source: operation.desired, desired: operation.source,
    })))],
  ['R12H-OFFLINE-04-PRODUCTION-RUNTIME-STATE-PROOF',
    manifest.runtimeUpdateProof.forwardStatePassCount === 4
      && manifest.runtimeUpdateProof.rollbackAirPassCount === 4
      && manifest.runtimeUpdateProof.productionMutationPerformed === false],
  ['R12H-OFFLINE-05-EXACT-UPPER-TO-LOWER-ORDER',
    manifest.safetyAudit.railUpdateDeterminism.forwardOrder === 'UPPER_TO_LOWER'
      && manifest.safetyAudit.railUpdateDeterminism.rollbackOrder
        === 'LOWER_TO_UPPER_EXACT_REVERSE'],
  ['R12H-OFFLINE-06-SUPPORT-HEADROOM-AND-GAPS',
    manifest.safetyAudit.exactSolidSupportCount === 4
      && manifest.safetyAudit.exactAirHeadroomCount === 4
      && manifest.scope.geometry.retainedIsolationGaps.cellCount === 2],
  ['R12H-OFFLINE-07-RAIL-UPDATE-DETERMINISM',
    manifest.safetyAudit.railUpdateDeterminism.exactOneToOneWestRise === true
      && manifest.safetyAudit.railUpdateDeterminism.exactProductionVersionRuntimeProofPassed],
  ['R12H-OFFLINE-08-HAZARD-CONTAINER-AND-ENTITY-CLEARANCE',
    ['haloFluidCount', 'haloGravityCount', 'haloUndeclaredMechanismCount',
      'haloContainerOrControlCount', 'haloBlockEntityCount', 'haloSavedEntityCount',
      'haloProtectedRelicCount'].every((key) => manifest.safetyAudit[key] === 0)],
  ['R12H-OFFLINE-09-PRIOR-RELEASE-PRESERVATION',
    manifest.preservation.undeclaredPriorReleaseIntersectionCount === 0
      && manifest.preservation.preservedR12cRail.cellCount === 231
      && manifest.preservation.preservedR12dRail.cellCount === 19
      && manifest.preservation.preservedR12eRail.cellCount === 80
      && manifest.preservation.preservedR12fRail.cellCount === 3
      && manifest.preservation.preservedR12gRail.cellCount === 4],
  ['R12H-OFFLINE-10-FORWARD-PREFLIGHT', forwardPreflight.payload.failed === 0],
  ['R12H-OFFLINE-11-PROJECTED-ROLLBACK', rollbackPreflight.payload.failed === 0],
  ['R12H-OFFLINE-12-STRICT-NOOP-PARSERS',
    forwardParser.payload.strictNoop === true && rollbackParser.payload.strictNoop === true],
  ['R12H-OFFLINE-13-BLOCK-ENTITY-EVIDENCE', blockEntity.payload.blockingBlockEntityCount === 0],
  ['R12H-OFFLINE-14-WRAPPER-PREPARE-CONTRACT', wrapperPlan.payload.mode === 'PREPARE_ONLY'],
  ['R12H-OFFLINE-15-NO-COMMISSIONING-OR-LIVE-MUTATION',
    manifest.scope.operationalBoundary.funicularCommissioned === false
      && Object.values(manifest.safetyBoundary).filter((entry) => entry === true).length === 0],
].map(([id, passed]) => ({ id, status: passed ? 'PASS' : 'FAIL' }));
invariant(checks.every(({ status }) => status === 'PASS'), 'one or more readiness checks failed');

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R12H_NEXT_MAXIMAL_ISOLATED_FOUR_CELL_GRADED_PASSIVE_RAIL_OFFLINE_READY',
  releaseNodeId: manifest.releaseNodeId,
  readinessScopeId: 'CZ-R12H-P1-B09-NEXT-MAXIMAL-ISOLATED-FOUR-CELL-GRADED-PASSIVE-RAIL',
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
      + manifest.preservation.preservedR12gRail.cellCount,
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
fs.writeFileSync(abs(MARKDOWN), `# CZ-R12H next maximal isolated B09 four-cell graded rail readiness\n\n`
  + `**Status:** ${report.status}  \n**Readiness payload:** \`${readinessPayloadSha256}\`\n\n`
  + `- Exact passive rail: indices 282..285, three ascending-west states plus one east-west upper state.\n`
  + `- The exact production Paper 1.21.11 runtime proof passes top-to-bottom placement and exact reverse rollback.\n`
  + `- Indices 281 and 286 remain exact air isolation gaps.\n`
  + `- Support/headroom: 4/4; source saved entities/block entities: 0/0.\n`
  + `- Forward/projected rollback guards: 4/4; wrapper: PREPARE_ONLY.\n`
  + `- All turns, every other grade, station interfaces, active systems, and transport commissioning remain held.\n`);
console.log(JSON.stringify({
  status: report.status, output: rel(OUT), markdown: rel(MARKDOWN),
  readinessPayloadSha256, targetCellCount: forward.length, checkCount: checks.length,
  liveCallsPerformed: false, worldEditsPerformed: false,
}, null, 2));
