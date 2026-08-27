#!/usr/bin/env node
/** Deterministic offline QA for CZ-R12F isolated three-cell graded passive rail. */

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
  'data/world-review/combined-zones-r12f-b09-isolated-graded-passive-rail-offline-20260822T015000Z',
);
const OUT = value('--out', path.join(EVIDENCE_DIR, 'r12f-offline-readiness.json'));
const MARKDOWN = value('--markdown', path.join(EVIDENCE_DIR, 'r12f-offline-readiness.md'));
const GENERATED_AT = value('--generated-at', '2026-08-22T01:50:00Z');
const MANIFEST =
  'data/buildops/combined-zones-r12f-b09-isolated-three-cell-graded-passive-rail.release-manifest.json';
const PACKAGE_KEY = 'b09-isolated-three-cell-graded-passive-rail';
const EXPECTED = Object.freeze({
  manifest: 'cdfa0bacc4537e59970e15f59774f0bee2ddccc959a87f8fa1299c849b0fc9c5',
  manifestIdentity: 'e0cdd6e8dc74f8cd2944ccec901bd2999f742b76765fefc2a734ef7ea65e52d5',
  forward: 'b2f8c2008cd8d37fb131d73caa8eaa2cf8d878e09aae8554584b7676e25bf09a',
  rollback: '045830df81431bc26b8a26bab48f9afbf3c70de2563f4b7ea8906c05ad8e9015',
  manifestGate: 'dc97d0543240f2b2bc4ab30bd0cbfc37978ad37bb8eda9daa5484661a9ec3cd9',
  forwardPreflight: '3dd8130e93b76e85a013f9c2a59f0526cead5b4c80693db4221cb84115db0d2f',
  rollbackPreflight: '6b4dface5c5baef5bdac1233706197f0f9db8286e4c6b38ebbea83a352e6d993',
  forwardParser: '9efa539f442fcd9642c9d7294ead0b853237cee2c8be5bee2f097637a9ef7ca4',
  rollbackParser: 'c5627234b046eba5b52057d8f34a99632f6b31dd315f1499502785aadbcee38b',
  blockEntity: '093502c40b418248ac05c7836066006856b24ab25b1377d8b13e6b67e5ac25a1',
  wrapperPlan: '2e05e8cb60b0b1fa336f572d89d64b7e4435a31d2c73bd4c41e3819c72af3192',
  sourceRegion: '980a7636e53a86e1c98c24e05b5b1aadeda1bb5ac7860cf02e02b3ccd4634af9',
  sourceComplete: 'fc88874e3037fa37565408fb72bda202416178ae990adf00cb0df462f7dc9484',
  sourceCompleted: '552ac3c9580c80b248625d6f26676fd491a110ccf707b488b507dea6a1434c9b',
  sourceQaPayload: '291ebd7aa3c1e5a80e3067ce1f7a8786c5dc67f67a418de3d840105135f5ee7d',
  target: '4ef1dd45742537a3300286c1bc3742600626540ec2327bb46a0e6149568cb973',
});

const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R12F passive-rail offline QA rejected: ${message}`);
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
  { x: 2285, y: 132, z: -768, desired: eastWest },
  { x: 2286, y: 131, z: -768, desired: ascendingWest },
  { x: 2287, y: 130, z: -768, desired: ascendingWest },
];
invariant(forward.length === 3 && rollback.length === 3
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
  && manifestGate.payload.totals.uniqueTargetCells === 3
  && manifestGate.payload.totals.crossPackageIntersectionCells === 0,
'exact release manifest gate failed');
invariant(forwardPreflight.payload.status === 'PASS' && forwardPreflight.payload.operationCount === 3
  && forwardPreflight.payload.passed === 3 && forwardPreflight.payload.failed === 0
  && forwardPreflight.payload.regionsSnapshot.sha256 === EXPECTED.sourceRegion,
'forward source preflight failed');
invariant(rollbackPreflight.payload.status === 'PASS' && rollbackPreflight.payload.operationCount === 3
  && rollbackPreflight.payload.passed === 3 && rollbackPreflight.payload.failed === 0
  && rollbackPreflight.payload.regionsSnapshot.sha256 === EXPECTED.sourceRegion
  && rollbackPreflight.payload.sourceOverlays.operationCount === 3
  && rollbackPreflight.payload.sourceOverlays.failed === 0,
'projected rollback preflight failed');
for (const [role, parser, expectedHash] of [
  ['forward', forwardParser.payload, EXPECTED.forward],
  ['rollback', rollbackParser.payload, EXPECTED.rollback],
]) {
  invariant(parser.status === 'dry_run' && parser.dryRun === true && parser.strictNoop === true
    && parser.operationRole === role && parser.operationSha256 === expectedHash
    && parser.sourceOperationCount === 3 && parser.commandCount === 3
    && parser.worldEditLeftoverCount === 0, `${role} strict-noop parser gate failed`);
}
invariant(blockEntity.payload.status === 'PASS' && blockEntity.payload.operationCount === 3
  && blockEntity.payload.chunksMissing === 0 && blockEntity.payload.blockingBlockEntityCount === 0,
'block-entity source gate failed');
invariant(wrapperPlan.payload.mode === 'PREPARE_ONLY'
  && wrapperPlan.payload.globalGateDependency === 'NONE'
  && wrapperPlan.payload.packageOrder.join(',') === PACKAGE_KEY
  && wrapperPlan.payload.stages.length === 10, 'wrapper print-plan contract failed');

const checks = [
  ['R12F-OFFLINE-01-R12E-POST-QA-BINDING',
    manifest.source.completeSaveSha256 === EXPECTED.sourceComplete
      && manifest.source.regionSnapshotSha256 === EXPECTED.sourceRegion
      && manifest.source.predecessor.completedReleaseIdentitySha256 === EXPECTED.sourceCompleted
      && manifest.source.predecessor.postQaPayloadSha256 === EXPECTED.sourceQaPayload],
  ['R12F-OFFLINE-02-EXACT-RAIL-DATUM-SUBSET',
    manifest.target.operatedUnion.cellCount === 3
      && manifest.target.operatedUnion.coordinateSetSha256 === EXPECTED.target],
  ['R12F-OFFLINE-03-EXACT-INVERSE-SEQUENCE',
    JSON.stringify(rollback) === JSON.stringify(forward.slice().reverse().map((operation) => ({
      cell: operation.cell, source: operation.desired, desired: operation.source,
    })))],
  ['R12F-OFFLINE-04-PRODUCTION-RUNTIME-STATE-PROOF',
    manifest.runtimeUpdateProof.forwardStatePassCount === 3
      && manifest.runtimeUpdateProof.rollbackAirPassCount === 3
      && manifest.runtimeUpdateProof.productionMutationPerformed === false],
  ['R12F-OFFLINE-05-EXACT-UPPER-TO-LOWER-ORDER',
    manifest.safetyAudit.railUpdateDeterminism.forwardOrder === 'UPPER_TO_LOWER'
      && manifest.safetyAudit.railUpdateDeterminism.rollbackOrder
        === 'LOWER_TO_UPPER_EXACT_REVERSE'],
  ['R12F-OFFLINE-06-SUPPORT-HEADROOM-AND-GAPS',
    manifest.safetyAudit.exactSolidSupportCount === 3
      && manifest.safetyAudit.exactAirHeadroomCount === 3
      && manifest.scope.geometry.retainedIsolationGaps.cellCount === 2],
  ['R12F-OFFLINE-07-RAIL-UPDATE-DETERMINISM',
    manifest.safetyAudit.railUpdateDeterminism.exactOneToOneWestRise === true
      && manifest.safetyAudit.railUpdateDeterminism.exactProductionVersionRuntimeProofPassed],
  ['R12F-OFFLINE-08-HAZARD-CONTAINER-AND-ENTITY-CLEARANCE',
    ['haloFluidCount', 'haloGravityCount', 'haloUndeclaredMechanismCount',
      'haloContainerOrControlCount', 'haloBlockEntityCount', 'haloSavedEntityCount',
      'haloProtectedRelicCount'].every((key) => manifest.safetyAudit[key] === 0)],
  ['R12F-OFFLINE-09-PRIOR-RELEASE-PRESERVATION',
    manifest.preservation.undeclaredPriorReleaseIntersectionCount === 0
      && manifest.preservation.preservedR12cRail.cellCount === 231
      && manifest.preservation.preservedR12dRail.cellCount === 19
      && manifest.preservation.preservedR12eRail.cellCount === 80],
  ['R12F-OFFLINE-10-FORWARD-PREFLIGHT', forwardPreflight.payload.failed === 0],
  ['R12F-OFFLINE-11-PROJECTED-ROLLBACK', rollbackPreflight.payload.failed === 0],
  ['R12F-OFFLINE-12-STRICT-NOOP-PARSERS',
    forwardParser.payload.strictNoop === true && rollbackParser.payload.strictNoop === true],
  ['R12F-OFFLINE-13-BLOCK-ENTITY-EVIDENCE', blockEntity.payload.blockingBlockEntityCount === 0],
  ['R12F-OFFLINE-14-WRAPPER-PREPARE-CONTRACT', wrapperPlan.payload.mode === 'PREPARE_ONLY'],
  ['R12F-OFFLINE-15-NO-COMMISSIONING-OR-LIVE-MUTATION',
    manifest.scope.operationalBoundary.funicularCommissioned === false
      && Object.values(manifest.safetyBoundary).filter((entry) => entry === true).length === 0],
].map(([id, passed]) => ({ id, status: passed ? 'PASS' : 'FAIL' }));
invariant(checks.every(({ status }) => status === 'PASS'), 'one or more readiness checks failed');

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R12F_ISOLATED_THREE_CELL_GRADED_PASSIVE_RAIL_OFFLINE_READY',
  releaseNodeId: manifest.releaseNodeId,
  readinessScopeId: 'CZ-R12F-P1-B09-ISOLATED-THREE-CELL-GRADED-PASSIVE-RAIL',
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
    desiredStatesLowToHigh: [ascendingWest, ascendingWest, eastWest],
    supportCellCount: manifest.safetyAudit.exactSolidSupportCount,
    headroomCellCount: manifest.safetyAudit.exactAirHeadroomCount,
    retainedIsolationGapCount: manifest.scope.geometry.retainedIsolationGaps.cellCount,
    preservedPriorRailCount: manifest.preservation.preservedR12cRail.cellCount
      + manifest.preservation.preservedR12dRail.cellCount
      + manifest.preservation.preservedR12eRail.cellCount,
    savedEntityIntersectionCount: manifest.safetyAudit.haloSavedEntityCount,
    blockEntityIntersectionCount: blockEntity.payload.blockingBlockEntityCount,
    forwardPreflightPassed: forwardPreflight.payload.passed,
    projectedRollbackPreflightPassed: rollbackPreflight.payload.passed,
    wrapperMode: wrapperPlan.payload.mode,
  },
  railDatumDisposition: {
    firstCenterlineIndex: manifest.scope.selection.firstCenterlineIndex,
    lastCenterlineIndex: manifest.scope.selection.lastCenterlineIndex,
    lowerTurnGapIndex: manifest.scope.selection.excludedLeftTurnIndex,
    upperLevelGapIndex: manifest.scope.selection.excludedRightLevelGapIndex,
    lowerStationInterfaceRunHeld: true,
    allTurnsAndAllOtherGradesHeld: true,
  },
  functionalBoundary: {
    isolatedGradedPassiveRailReady: true, liveExecutionReadyWithoutFreshKernel: false,
    rebindRequiredIfAcceptedTerminalAdvances: true, turnRailDesignedOrInstalled: false,
    exactThreeCellSlopeRailDesigned: true, funicularCommissioned: false,
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
fs.writeFileSync(abs(MARKDOWN), `# CZ-R12F isolated B09 three-cell graded rail readiness\n\n`
  + `**Status:** ${report.status}  \n**Readiness payload:** \`${readinessPayloadSha256}\`\n\n`
  + `- Exact passive rail: indices 261..263, two ascending-west states plus one east-west upper state.\n`
  + `- The exact production Paper 1.21.11 runtime proof passes top-to-bottom placement and exact reverse rollback.\n`
  + `- Index 260 remains the hairpin-turn gap; index 264 remains the upper level gap.\n`
  + `- Support/headroom: 3/3; source saved entities/block entities: 0/0.\n`
  + `- Forward/projected rollback guards: 3/3; wrapper: PREPARE_ONLY.\n`
  + `- All turns, every other grade, station interfaces, active systems, and transport commissioning remain held.\n`);
console.log(JSON.stringify({
  status: report.status, output: rel(OUT), markdown: rel(MARKDOWN),
  readinessPayloadSha256, targetCellCount: forward.length, checkCount: checks.length,
  liveCallsPerformed: false, worldEditsPerformed: false,
}, null, 2));
