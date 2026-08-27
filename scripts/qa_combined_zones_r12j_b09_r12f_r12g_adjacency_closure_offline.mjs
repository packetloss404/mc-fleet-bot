#!/usr/bin/env node
/** Deterministic offline QA for CZ-R12J R12F/R12G seven-cell rail adjacency closure. */

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
  'data/world-review/combined-zones-r12j-b09-r12f-r12g-adjacency-closure-offline-20260822T025200Z',
);
const OUT = value('--out', path.join(EVIDENCE_DIR, 'r12j-offline-readiness.json'));
const MARKDOWN = value('--markdown', path.join(EVIDENCE_DIR, 'r12j-offline-readiness.md'));
const GENERATED_AT = value('--generated-at', '2026-08-22T02:52:00Z');
const MANIFEST =
  'data/buildops/combined-zones-r12j-b09-r12f-r12g-seven-cell-rail-adjacency-closure.release-manifest.json';
const PACKAGE_KEY = 'b09-r12f-r12g-seven-cell-rail-adjacency-closure';
const EXPECTED = Object.freeze({
  manifest: '4f7841a70e52a892fdb8e57480bba3feea7bd24fdf4833c8896a27790dd85eb8',
  manifestIdentity: '08ce2bd314fdf324248a1ddfb9dbab5329747809d878e412787a969b3798cdad',
  forward: 'ad892bb02b815ab188e86d9763ef6a8a303bfd2fe86c07601f6baab1e2b3ab18',
  rollback: 'a1659c0db098442e510d3f901a8e4ee45b0b913bc49cceb03bf04d1f8414c2d9',
  manifestGate: 'a81ff2992801c9b42951451a50494c5606795c38a894e1f6822ed0c96a2808e4',
  forwardPreflight: 'a6b519c1705587e234f7ba92791af9542d927b1edc04ba340ad1c7573be4c187',
  rollbackPreflight: 'bc38d96ec0b611e78598bb1bf48f4d37ca2e6f9e3c7a8fb97c9ca1c79aafbfc6',
  forwardParser: '8795fa73e99a056e2edb8921923651f2998c454116e932051a76313e0bdc1316',
  rollbackParser: '7185267adf354fe7675f9d0176743ad308a1aa97a6ce3b27d256e011dfb2cc23',
  blockEntity: '171a349af231003902e3aa086c21e53d207546d3660884897dc525da82a54f5c',
  wrapperPlan: '0b9858012a5094daebd32b4e809a1f4d2d4544cc0cd5bee1a6a897a88665aca2',
  sourceRegion: '45e004fea13e4e40c864fc0f79578744d37e920410ef843ff034d9555b5097d2',
  sourceComplete: '4f297319294b22d42a15087c41b5077c0ade249450ade1147e858adc7191a6c4',
  sourceCompleted: '396fc2ff6c3c3411854c7d2bb72dffe07625a7b32813e089e3acf1c1065465a2',
  sourceQaPayload: 'bdbe884727ad4e1690f25009e4d4b3119f8a888ac4922d5f8c1882c5211e867d',
  runtimeProofPayload: '151ad3cf31b24aa15ecc07f7ca7d61f812316b034d34c479ea166de510229c4d',
  target: 'c5d0c02ec59bcabe84377138635250c16b175b135a04c80a2624a6db28fcb366',
});

const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R12J adjacency-closure offline QA rejected: ${message}`);
};
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const fileBinding = (filename) => ({
  path: rel(filename), sha256: sha256(fs.readFileSync(abs(filename))), bytes: fs.statSync(abs(filename)).size,
});
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
const forwardBinding = fileBinding(manifest.packages[0].forward);
const rollbackBinding = fileBinding(manifest.packages[0].rollback);
invariant(forwardBinding.sha256 === EXPECTED.forward && rollbackBinding.sha256 === EXPECTED.rollback,
  'operation file identity drifted');
const forward = parseOperations(manifest.packages[0].forward);
const rollback = parseOperations(manifest.packages[0].rollback);
const ascendingWest = 'minecraft:rail[shape=ascending_west,waterlogged=false]';
const eastWest = 'minecraft:rail[shape=east_west,waterlogged=false]';
const exactForward = [
  { x: 2278, y: 137, desired: eastWest },
  { x: 2279, y: 136, desired: ascendingWest },
  { x: 2280, y: 135, desired: ascendingWest },
  { x: 2281, y: 135, desired: eastWest },
  { x: 2282, y: 134, desired: ascendingWest },
  { x: 2283, y: 133, desired: ascendingWest },
  { x: 2284, y: 132, desired: ascendingWest },
];
invariant(forward.length === 7 && rollback.length === 7
  && forward.every(({ cell, source, desired }, index) => cell.x === exactForward[index].x
    && cell.y === exactForward[index].y && cell.z === -768
    && source === 'minecraft:air' && desired === exactForward[index].desired)
  && rollback.every(({ cell, source, desired }, index) => {
    const operation = exactForward[exactForward.length - 1 - index];
    return cell.x === operation.x && cell.y === operation.y && cell.z === -768
      && source === operation.desired && desired === 'minecraft:air';
  }), 'forward/rollback sequence is not the exact reverse-order inverse');
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
invariant(manifestGate.payload.status === 'PASS' && manifestGate.payload.totals.uniqueTargetCells === 7
  && manifestGate.payload.totals.crossPackageIntersectionCells === 0, 'exact manifest gate failed');
invariant(forwardPreflight.payload.status === 'PASS' && forwardPreflight.payload.operationCount === 7
  && forwardPreflight.payload.passed === 7 && forwardPreflight.payload.failed === 0
  && forwardPreflight.payload.regionsSnapshot.sha256 === EXPECTED.sourceRegion, 'forward preflight failed');
invariant(rollbackPreflight.payload.status === 'PASS' && rollbackPreflight.payload.operationCount === 7
  && rollbackPreflight.payload.passed === 7 && rollbackPreflight.payload.failed === 0
  && rollbackPreflight.payload.regionsSnapshot.sha256 === EXPECTED.sourceRegion
  && rollbackPreflight.payload.sourceOverlays.operationCount === 7
  && rollbackPreflight.payload.sourceOverlays.failed === 0, 'projected rollback preflight failed');
for (const [role, parser, expectedHash] of [
  ['forward', forwardParser.payload, EXPECTED.forward],
  ['rollback', rollbackParser.payload, EXPECTED.rollback],
]) {
  invariant(parser.status === 'dry_run' && parser.dryRun === true && parser.strictNoop === true
    && parser.operationRole === role && parser.operationSha256 === expectedHash
    && parser.sourceOperationCount === 7 && parser.commandCount === 7
    && parser.worldEditLeftoverCount === 0, `${role} parser gate failed`);
}
invariant(blockEntity.payload.status === 'PASS' && blockEntity.payload.operationCount === 7
  && blockEntity.payload.chunksMissing === 0 && blockEntity.payload.blockingBlockEntityCount === 0,
  'block-entity gate failed');
invariant(wrapperPlan.payload.mode === 'PREPARE_ONLY'
  && wrapperPlan.payload.globalGateDependency === 'NONE'
  && wrapperPlan.payload.packageOrder.join(',') === PACKAGE_KEY
  && wrapperPlan.payload.stages.length === 10, 'real wrapper print-plan failed');

const preservedPriorRailCount = ['preservedR12cRail', 'preservedR12dRail', 'preservedR12eRail',
  'preservedR12fRail', 'preservedR12gRail', 'preservedR12hRail', 'preservedR12iRail']
  .reduce((count, key) => count + manifest.preservation[key].cellCount, 0);
const checks = [
  ['R12J-OFFLINE-01-R12I-POST-QA-BINDING',
    manifest.source.completeSaveSha256 === EXPECTED.sourceComplete
      && manifest.source.regionSnapshotSha256 === EXPECTED.sourceRegion
      && manifest.source.predecessor.completedReleaseIdentitySha256 === EXPECTED.sourceCompleted
      && manifest.source.predecessor.postQaPayloadSha256 === EXPECTED.sourceQaPayload],
  ['R12J-OFFLINE-02-EXACT-SEVEN-CELL-CLOSURE',
    manifest.target.operatedUnion.cellCount === 7
      && manifest.target.operatedUnion.coordinateSetSha256 === EXPECTED.target],
  ['R12J-OFFLINE-03-EXACT-REVERSE-INVERSE',
    JSON.stringify(rollback) === JSON.stringify(forward.slice().reverse().map((operation) => ({
      cell: operation.cell, source: operation.desired, desired: operation.source,
    })))],
  ['R12J-OFFLINE-04-EXACT-PAPER-ADJACENCY-PROOF',
    manifest.runtimeUpdateProof.proofPayloadSha256 === EXPECTED.runtimeProofPayload
      && manifest.runtimeUpdateProof.forwardStatePassCount === 14
      && manifest.runtimeUpdateProof.rollbackAirPassCount === 7
      && manifest.runtimeUpdateProof.rollbackPriorStatePassCount === 7],
  ['R12J-OFFLINE-05-EXACT-PLACEMENT-ORDER',
    manifest.safetyAudit.railUpdateDeterminism.forwardOrder === 'UPPER_TO_LOWER'
      && manifest.safetyAudit.railUpdateDeterminism.rollbackOrder === 'LOWER_TO_UPPER_EXACT_REVERSE'],
  ['R12J-OFFLINE-06-SUPPORT-HEADROOM-INTERFACES',
    manifest.safetyAudit.exactSolidSupportCount === 7
      && manifest.safetyAudit.exactAirHeadroomCount === 7
      && manifest.preservation.acceptedAdjacencyInterfaces.cellCount === 2],
  ['R12J-OFFLINE-07-FOURTEEN-CELL-CONNECTED-RESULT',
    manifest.scope.geometry.resultingConnectedR12fThroughR12gRail.cellCount === 14
      && manifest.safetyAudit.railUpdateDeterminism.resultingConnectedComponentCellCount === 14],
  ['R12J-OFFLINE-08-HAZARD-AND-ENTITY-CLEARANCE',
    ['haloFluidCount', 'haloGravityCount', 'haloUndeclaredMechanismCount',
      'haloContainerOrControlCount', 'haloBlockEntityCount', 'haloSavedEntityCount',
      'haloProtectedRelicCount'].every((key) => manifest.safetyAudit[key] === 0)],
  ['R12J-OFFLINE-09-ALL-PRIOR-RAILS-AND-CAPS', preservedPriorRailCount === 345
    && manifest.preservation.retainedLowerB08Cap.cellCount === 12
    && manifest.preservation.retainedSummitZ11Cap.cellCount === 12
    && manifest.preservation.undeclaredPriorReleaseIntersectionCount === 0],
  ['R12J-OFFLINE-10-FORWARD-PREFLIGHT', forwardPreflight.payload.failed === 0],
  ['R12J-OFFLINE-11-PROJECTED-ROLLBACK', rollbackPreflight.payload.failed === 0],
  ['R12J-OFFLINE-12-STRICT-NOOP-PARSERS', forwardParser.payload.strictNoop && rollbackParser.payload.strictNoop],
  ['R12J-OFFLINE-13-BLOCK-ENTITY-EVIDENCE', blockEntity.payload.blockingBlockEntityCount === 0],
  ['R12J-OFFLINE-14-REAL-WRAPPER-PREPARE-CONTRACT', wrapperPlan.payload.mode === 'PREPARE_ONLY'],
  ['R12J-OFFLINE-15-NO-COMMISSIONING-OR-LIVE-MUTATION',
    manifest.scope.operationalBoundary.funicularCommissioned === false
      && Object.values(manifest.safetyBoundary).every((entry) => entry === false)],
].map(([id, passed]) => ({ id, status: passed ? 'PASS' : 'FAIL' }));
invariant(checks.every(({ status }) => status === 'PASS'), 'one or more readiness checks failed');

const reportWithoutIdentity = {
  schemaVersion: 1, generatedAtUtc: GENERATED_AT,
  status: 'PASS_R12J_R12F_R12G_SEVEN_CELL_RAIL_ADJACENCY_CLOSURE_OFFLINE_READY',
  releaseNodeId: manifest.releaseNodeId,
  readinessScopeId: 'CZ-R12J-P1-B09-R12F-R12G-SEVEN-CELL-RAIL-ADJACENCY-CLOSURE',
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
    targetCellCount: 7, targetCoordinateSetSha256: EXPECTED.target,
    desiredStateCensus: { [ascendingWest]: 5, [eastWest]: 2 },
    acceptedInterfaceCellCount: 2, resultingConnectedRailCellCount: 14,
    supportCellCount: 7, headroomCellCount: 7, preservedPriorRailCount,
    forwardPreflightPassed: 7, projectedRollbackPreflightPassed: 7,
    savedEntityIntersectionCount: 0, blockEntityIntersectionCount: 0,
    wrapperMode: wrapperPlan.payload.mode,
  },
  functionalBoundary: {
    exactR12fR12gAdjacencyClosureReady: true, connectedPassiveRailComponentAfterRelease: 14,
    liveExecutionReadyWithoutFreshKernel: false, rebindRequiredIfAcceptedTerminalAdvances: true,
    turnRailDesignedOrInstalled: false, funicularCommissioned: false,
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
fs.writeFileSync(abs(MARKDOWN), `# CZ-R12J R12F/R12G seven-cell rail adjacency closure readiness\n\n`
  + `**Status:** ${report.status}  \n**Readiness payload:** \`${readinessPayloadSha256}\`\n\n`
  + `- Exact closure: indices 264..270, five ascending-west and two east-west passive rails.\n`
  + `- Exact Paper 1.21.11 proof verifies upper-to-lower placement, all 14 resulting states, and reverse rollback.\n`
  + `- Accepted interfaces 263/271 remain exact and produce one connected 14-cell R12F-through-R12G component.\n`
  + `- Support/headroom: 7/7; all 345 predecessor rails plus both 12-cell caps are preserved.\n`
  + `- Forward/projected rollback guards: 7/7; strict parsers and real wrapper PREPARE_ONLY plan pass.\n`
  + `- Turns, active systems, vehicles, passenger use, and transport commissioning remain held.\n`);
console.log(JSON.stringify({
  status: report.status, output: rel(OUT), markdown: rel(MARKDOWN),
  readinessPayloadSha256, targetCellCount: 7, checkCount: checks.length,
  liveCallsPerformed: false, worldEditsPerformed: false,
}, null, 2));
