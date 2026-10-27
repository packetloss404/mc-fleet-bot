#!/usr/bin/env node
/** Deterministic offline QA for CZ-R12G isolated four-cell graded passive rail. */

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
  'data/world-review/combined-zones-r12g-b09-maximal-isolated-graded-passive-rail-offline-20260822T021000Z',
);
const OUT = value('--out', path.join(EVIDENCE_DIR, 'r12g-offline-readiness.json'));
const MARKDOWN = value('--markdown', path.join(EVIDENCE_DIR, 'r12g-offline-readiness.md'));
const GENERATED_AT = value('--generated-at', '2026-08-22T02:10:00Z');
const MANIFEST =
  'data/buildops/combined-zones-r12g-b09-isolated-four-cell-graded-passive-rail.release-manifest.json';
const PACKAGE_KEY = 'b09-isolated-four-cell-graded-passive-rail';
const EXPECTED = Object.freeze({
  manifest: 'e75d6ee3f31bfb483f88bc84ec10637cb09cfe115a443993cec204c517b27b59',
  manifestIdentity: 'd2485b2e6d3185358ee17c2cf40aa7a667f3f7965cf8b3d63df20b08ac6523b3',
  forward: '49d142afeb737a682f5a97350ef76c9508138a1338026e0f867373c9421aa85e',
  rollback: 'd1a686113fc06cdbfdebcba0c804d1279179050c255cc8a9b89fe4443a41eac3',
  manifestGate: '4ba3c6828b364d22c3351a6898cd00420576818736d598b12d83cc079a8e3bc9',
  forwardPreflight: '4b905fcc576c53773fd699868a28365b4720bab744292c4d009bf83a216f5b1b',
  rollbackPreflight: 'ef10eaa0ae84627676e85f0f8d063e1867f6cb7f234dd78a6cfdd3a8d8c86271',
  forwardParser: '266013a5f09666e3d9d22f3b170274af070b4a704eb666dc361d28ab9daaba7f',
  rollbackParser: '63bf5040740420d7bb54c300f90e3c7d74f5d0a96227a901d8adedd85a0d8663',
  blockEntity: 'd4cf11ce77d29252d7e981cb8160ce8b9b8cbcd540816ed5d261253806128634',
  wrapperPlan: 'c5bab27f1bbf9b7c3b8324194ccc3df47c6a44ac0bc9f3183d827269b65eaf06',
  sourceRegion: '500d8151ec8dff15bd18434cbf4c68fa88756247ff87f264b5acd60f5f334e11',
  sourceComplete: '8a1350c3a12898d983c6825c6912de383407e97f7b8735172cb1775a409f9b49',
  sourceCompleted: '2c9a54aaad0bfd742705ed1015b781db3b0aa7d56a86e6c57ee348c6e9f29f28',
  sourceQaPayload: '67427f0f7e0f0cc08829575a128793ea39cf1adb09a9eb0316c7664953449fb8',
  target: 'bb5739a71b664cbe90e166dfcb7d531e18f54138c6965bf0208ec0e79319350d',
});

const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R12G passive-rail offline QA rejected: ${message}`);
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
  { x: 2274, y: 140, z: -768, desired: eastWest },
  { x: 2275, y: 139, z: -768, desired: ascendingWest },
  { x: 2276, y: 138, z: -768, desired: ascendingWest },
  { x: 2277, y: 137, z: -768, desired: ascendingWest },
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
  ['R12G-OFFLINE-01-R12F-POST-QA-BINDING',
    manifest.source.completeSaveSha256 === EXPECTED.sourceComplete
      && manifest.source.regionSnapshotSha256 === EXPECTED.sourceRegion
      && manifest.source.predecessor.completedReleaseIdentitySha256 === EXPECTED.sourceCompleted
      && manifest.source.predecessor.postQaPayloadSha256 === EXPECTED.sourceQaPayload],
  ['R12G-OFFLINE-02-EXACT-RAIL-DATUM-SUBSET',
    manifest.target.operatedUnion.cellCount === 4
      && manifest.target.operatedUnion.coordinateSetSha256 === EXPECTED.target],
  ['R12G-OFFLINE-03-EXACT-INVERSE-SEQUENCE',
    JSON.stringify(rollback) === JSON.stringify(forward.slice().reverse().map((operation) => ({
      cell: operation.cell, source: operation.desired, desired: operation.source,
    })))],
  ['R12G-OFFLINE-04-PRODUCTION-RUNTIME-STATE-PROOF',
    manifest.runtimeUpdateProof.forwardStatePassCount === 4
      && manifest.runtimeUpdateProof.rollbackAirPassCount === 4
      && manifest.runtimeUpdateProof.productionMutationPerformed === false],
  ['R12G-OFFLINE-05-EXACT-UPPER-TO-LOWER-ORDER',
    manifest.safetyAudit.railUpdateDeterminism.forwardOrder === 'UPPER_TO_LOWER'
      && manifest.safetyAudit.railUpdateDeterminism.rollbackOrder
        === 'LOWER_TO_UPPER_EXACT_REVERSE'],
  ['R12G-OFFLINE-06-SUPPORT-HEADROOM-AND-GAPS',
    manifest.safetyAudit.exactSolidSupportCount === 4
      && manifest.safetyAudit.exactAirHeadroomCount === 4
      && manifest.scope.geometry.retainedIsolationGaps.cellCount === 2],
  ['R12G-OFFLINE-07-RAIL-UPDATE-DETERMINISM',
    manifest.safetyAudit.railUpdateDeterminism.exactOneToOneWestRise === true
      && manifest.safetyAudit.railUpdateDeterminism.exactProductionVersionRuntimeProofPassed],
  ['R12G-OFFLINE-08-HAZARD-CONTAINER-AND-ENTITY-CLEARANCE',
    ['haloFluidCount', 'haloGravityCount', 'haloUndeclaredMechanismCount',
      'haloContainerOrControlCount', 'haloBlockEntityCount', 'haloSavedEntityCount',
      'haloProtectedRelicCount'].every((key) => manifest.safetyAudit[key] === 0)],
  ['R12G-OFFLINE-09-PRIOR-RELEASE-PRESERVATION',
    manifest.preservation.undeclaredPriorReleaseIntersectionCount === 0
      && manifest.preservation.preservedR12cRail.cellCount === 231
      && manifest.preservation.preservedR12dRail.cellCount === 19
      && manifest.preservation.preservedR12eRail.cellCount === 80
      && manifest.preservation.preservedR12fRail.cellCount === 3],
  ['R12G-OFFLINE-10-FORWARD-PREFLIGHT', forwardPreflight.payload.failed === 0],
  ['R12G-OFFLINE-11-PROJECTED-ROLLBACK', rollbackPreflight.payload.failed === 0],
  ['R12G-OFFLINE-12-STRICT-NOOP-PARSERS',
    forwardParser.payload.strictNoop === true && rollbackParser.payload.strictNoop === true],
  ['R12G-OFFLINE-13-BLOCK-ENTITY-EVIDENCE', blockEntity.payload.blockingBlockEntityCount === 0],
  ['R12G-OFFLINE-14-WRAPPER-PREPARE-CONTRACT', wrapperPlan.payload.mode === 'PREPARE_ONLY'],
  ['R12G-OFFLINE-15-NO-COMMISSIONING-OR-LIVE-MUTATION',
    manifest.scope.operationalBoundary.funicularCommissioned === false
      && Object.values(manifest.safetyBoundary).filter((entry) => entry === true).length === 0],
].map(([id, passed]) => ({ id, status: passed ? 'PASS' : 'FAIL' }));
invariant(checks.every(({ status }) => status === 'PASS'), 'one or more readiness checks failed');

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R12G_ISOLATED_FOUR_CELL_GRADED_PASSIVE_RAIL_OFFLINE_READY',
  releaseNodeId: manifest.releaseNodeId,
  readinessScopeId: 'CZ-R12G-P1-B09-ISOLATED-FOUR-CELL-GRADED-PASSIVE-RAIL',
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
      + manifest.preservation.preservedR12fRail.cellCount,
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
fs.writeFileSync(abs(MARKDOWN), `# CZ-R12G isolated B09 four-cell graded rail readiness\n\n`
  + `**Status:** ${report.status}  \n**Readiness payload:** \`${readinessPayloadSha256}\`\n\n`
  + `- Exact passive rail: indices 271..274, three ascending-west states plus one east-west upper state.\n`
  + `- The exact production Paper 1.21.11 runtime proof passes top-to-bottom placement and exact reverse rollback.\n`
  + `- Indices 270 and 275 remain exact air isolation gaps.\n`
  + `- Support/headroom: 4/4; source saved entities/block entities: 0/0.\n`
  + `- Forward/projected rollback guards: 4/4; wrapper: PREPARE_ONLY.\n`
  + `- All turns, every other grade, station interfaces, active systems, and transport commissioning remain held.\n`);
console.log(JSON.stringify({
  status: report.status, output: rel(OUT), markdown: rel(MARKDOWN),
  readinessPayloadSha256, targetCellCount: forward.length, checkCount: checks.length,
  liveCallsPerformed: false, worldEditsPerformed: false,
}, null, 2));
