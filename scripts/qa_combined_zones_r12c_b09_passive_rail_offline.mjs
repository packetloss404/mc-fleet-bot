#!/usr/bin/env node
/** Deterministic offline QA for the R12C isolated passive-rail design freeze. */

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
  'data/world-review/combined-zones-r12c-b09-passive-rail-design-freeze-20260822T004000Z',
);
const OUT = value('--out', path.join(EVIDENCE_DIR, 'r12c-offline-readiness.json'));
const MARKDOWN = value('--markdown', path.join(EVIDENCE_DIR, 'r12c-offline-readiness.md'));
const GENERATED_AT = value('--generated-at', '2026-08-22T00:40:00Z');
const MANIFEST =
  'data/buildops/combined-zones-r12c-b09-isolated-lower-straight-passive-rail-design-freeze.release-manifest.json';
const PACKAGE_KEY = 'b09-isolated-lower-straight-passive-rail';
const EXPECTED = Object.freeze({
  manifest: 'de097788b3f93bfb3ac0364e17fc07424801a8eb59cdd769758da9c9831e4a91',
  manifestIdentity: 'b786c59a4d68361482b764bff34244aa73637ec859a5647f863636c49e256036',
  forward: 'b8ea1333e261b094e750397077326bd2e9f35fd7824fc38414566f987f7759db',
  rollback: 'da22854d69400e11a0c9a2c9b6066b170e46f13b06fcd2a3a48fe395b09b963c',
  forwardPreflight: '8df74244681d7314ddf9aa085977d680f6ffcc1ab6b11343f9561f90526e326b',
  rollbackPreflight: 'f78d68b27ad87effc9ca5a92b1c5388cdc1d30f66c04f2982631d69dae82a15d',
  forwardParser: '96ffd8e6390c392416328a7d97a116602cac58d0352ebc2ef905818bd777a161',
  rollbackParser: '05ab535bfd5ec4082f08640502ae50f15a2ea83d1a55ad0b3cc5886f05701c79',
  wrapperPlan: '5be25b918aa831a828aa12265eae8bc33093a28b65caec984f9b4cc4b3e13f1e',
  sourceRegion: '8c41238e78e061a7ac3aafd58712f81fb7c66e9a6b41b2afdaa2ac3d26848443',
  target: 'd0ce28ec1df09ee872d9885bd65d858e8a39c1d4c377ca532bfafa481bd91b0f',
});

const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R12C passive-rail offline QA rejected: ${message}`);
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
const desiredRail = 'minecraft:rail[shape=east_west,waterlogged=false]';
invariant(forward.length === 231 && rollback.length === 231
  && forward.every(({ cell, source, desired }, index) => (
    cell.x === 2057 + index && cell.y === 130 && cell.z === -748
      && source === 'minecraft:air' && desired === desiredRail
  ))
  && rollback.every(({ cell, source, desired }, index) => (
    cell.x === 2287 - index && cell.y === 130 && cell.z === -748
      && source === desiredRail && desired === 'minecraft:air'
  )), 'forward/rollback rail sequence is not an exact inverse');
invariant(hashCells(forward.map(({ cell }) => cell)) === EXPECTED.target
  && hashCells(rollback.map(({ cell }) => cell)) === EXPECTED.target,
'operation target identity drifted');

const forwardPreflightPath = path.join(EVIDENCE_DIR, 'forward-preflight.json');
const rollbackPreflightPath = path.join(EVIDENCE_DIR, 'projected-rollback-preflight.json');
const forwardParserPath = path.join(EVIDENCE_DIR, 'forward-parser-dry-run.json');
const rollbackParserPath = path.join(EVIDENCE_DIR, 'rollback-parser-dry-run.json');
const wrapperPlanPath = path.join(EVIDENCE_DIR, 'wrapper-print-plan.json');
const forwardPreflight = boundJson(forwardPreflightPath, EXPECTED.forwardPreflight);
const rollbackPreflight = boundJson(rollbackPreflightPath, EXPECTED.rollbackPreflight);
const forwardParser = boundJson(forwardParserPath, EXPECTED.forwardParser);
const rollbackParser = boundJson(rollbackParserPath, EXPECTED.rollbackParser);
const wrapperPlan = boundJson(wrapperPlanPath, EXPECTED.wrapperPlan);
invariant(forwardPreflight.payload.status === 'PASS'
  && forwardPreflight.payload.operationCount === 231
  && forwardPreflight.payload.passed === 231
  && forwardPreflight.payload.failed === 0
  && forwardPreflight.payload.regionsSnapshot.sha256 === EXPECTED.sourceRegion,
'forward source preflight failed');
invariant(rollbackPreflight.payload.status === 'PASS'
  && rollbackPreflight.payload.operationCount === 231
  && rollbackPreflight.payload.passed === 231
  && rollbackPreflight.payload.failed === 0
  && rollbackPreflight.payload.regionsSnapshot.sha256 === EXPECTED.sourceRegion
  && rollbackPreflight.payload.sourceOverlays.artifacts.length === 1
  && rollbackPreflight.payload.sourceOverlays.operationCount === 231
  && rollbackPreflight.payload.sourceOverlays.failed === 0,
'projected rollback preflight failed');
for (const [role, parser, expectedHash] of [
  ['forward', forwardParser.payload, EXPECTED.forward],
  ['rollback', rollbackParser.payload, EXPECTED.rollback],
]) {
  invariant(parser.status === 'dry_run' && parser.dryRun === true
    && parser.strictNoop === true && parser.operationRole === role
    && parser.operationSha256 === expectedHash
    && parser.sourceOperationCount === 231 && parser.commandCount === 231
    && parser.worldEditLeftoverCount === 0,
  `${role} strict-noop parser gate failed`);
}
invariant(wrapperPlan.payload.mode === 'PREPARE_ONLY'
  && wrapperPlan.payload.globalGateDependency === 'NONE'
  && wrapperPlan.payload.packageOrder.join(',') === PACKAGE_KEY
  && wrapperPlan.payload.stages.length === 10,
'wrapper print-plan contract failed');

const checks = [
  ['R12C-OFFLINE-01-R10E-R12B-BINDINGS',
    manifest.source.predecessor.r12bReadinessPayloadSha256
      === 'bf2a1a6a93ca51c2a2ba3e6bbdbb95ec7ff3a8f97434205abaa899edd9269044'],
  ['R12C-OFFLINE-02-EXACT-RAIL-DATUM-SUBSET',
    manifest.target.operatedUnion.cellCount === 231
      && manifest.target.operatedUnion.coordinateSetSha256 === EXPECTED.target],
  ['R12C-OFFLINE-03-EXACT-INVERSE-SEQUENCE', forward.length === rollback.length],
  ['R12C-OFFLINE-04-SUPPORT-HEADROOM-AND-GAPS',
    manifest.safetyAudit.exactSolidSupportCount === 231
      && manifest.safetyAudit.exactAirHeadroomCount === 231
      && manifest.scope.geometry.retainedIsolationGaps.cellCount === 2],
  ['R12C-OFFLINE-05-RAIL-UPDATE-DETERMINISM',
    manifest.safetyAudit.railUpdateDeterminism.straightSingleAxis === true
      && manifest.safetyAudit.railUpdateDeterminism.branchCount === 0],
  ['R12C-OFFLINE-06-HAZARD-AND-ENTITY-CLEARANCE',
    ['haloFluidCount', 'haloGravityCount', 'haloExistingMechanismCount',
      'haloContainerOrControlCount', 'haloBlockEntityCount', 'haloSavedEntityCount',
      'haloProtectedRelicCount'].every((key) => manifest.safetyAudit[key] === 0)],
  ['R12C-OFFLINE-07-FORWARD-PREFLIGHT', forwardPreflight.payload.failed === 0],
  ['R12C-OFFLINE-08-PROJECTED-ROLLBACK', rollbackPreflight.payload.failed === 0],
  ['R12C-OFFLINE-09-STRICT-NOOP-PARSERS',
    forwardParser.payload.strictNoop === true && rollbackParser.payload.strictNoop === true],
  ['R12C-OFFLINE-10-WRAPPER-PREPARE-CONTRACT', wrapperPlan.payload.mode === 'PREPARE_ONLY'],
  ['R12C-OFFLINE-11-NO-OPERATIONAL-OVERCLAIM',
    manifest.scope.operationalBoundary.funicularCommissioned === false
      && manifest.scope.failSafeState.vehicleInstalled === false],
  ['R12C-OFFLINE-12-NO-LIVE-MUTATION',
    Object.values(manifest.safetyBoundary).filter((value) => value === true).length === 0],
].map(([id, passed]) => ({ id, status: passed ? 'PASS' : 'FAIL' }));
invariant(checks.every(({ status }) => status === 'PASS'), 'one or more readiness checks failed');

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R12C_ISOLATED_PASSIVE_RAIL_DESIGN_FREEZE_OFFLINE_READY',
  releaseNodeId: manifest.releaseNodeId,
  readinessScopeId: 'CZ-R12C-P1-B09-ISOLATED-LOWER-STRAIGHT-PASSIVE-RAIL',
  mvpScope: true,
  bindings: {
    manifest: manifestBinding,
    manifestIdentity: manifest.manifestIdentity,
    forward: forwardBinding,
    rollback: rollbackBinding,
    forwardPreflight: forwardPreflight.binding,
    projectedRollbackPreflight: rollbackPreflight.binding,
    forwardParser: forwardParser.binding,
    rollbackParser: rollbackParser.binding,
    wrapperPrintPlan: wrapperPlan.binding,
  },
  result: {
    targetCellCount: forward.length,
    targetCoordinateSetSha256: hashCells(forward.map(({ cell }) => cell)),
    desiredState: desiredRail,
    supportCellCount: manifest.safetyAudit.exactSolidSupportCount,
    headroomCellCount: manifest.safetyAudit.exactAirHeadroomCount,
    retainedIsolationGapCount: manifest.scope.geometry.retainedIsolationGaps.cellCount,
    forwardPreflightPassed: forwardPreflight.payload.passed,
    projectedRollbackPreflightPassed: rollbackPreflight.payload.passed,
    wrapperMode: wrapperPlan.payload.mode,
  },
  functionalBoundary: {
    passiveRailDesignFrozen: true,
    liveExecutionReadyWithoutRebind: false,
    rebindRequiredIfAcceptedTerminalAdvances: true,
    platformBarrierDesigned: false,
    funicularCommissioned: false,
    passengerOrRescueRouteCommissioned: false,
    driveBrakeVehicleControlPowerDrainageInstalled: false,
  },
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
const markdown = `# CZ-R12C passive B09 rail design freeze\n\n`
  + `**Status:** ${report.status}  \n`
  + `**Readiness payload:** \`${readinessPayloadSha256}\`\n\n`
  + `- Exact passive rail: ${forward.length} east-west cells on frozen datum indices 9..239.\n`
  + `- Support/headroom: ${report.result.supportCellCount}/${report.result.headroomCellCount}; retained isolation gaps: ${report.result.retainedIsolationGapCount}.\n`
  + `- Forward/projected rollback guards: ${report.result.forwardPreflightPassed}/${report.result.projectedRollbackPreflightPassed}.\n`
  + `- Wrapper contract: ${report.result.wrapperMode}; live execution still requires a current-terminal rebind and fresh hard-safety kernel.\n`
  + `- No rail vehicle, powered rail, barrier, drive, brake, controls, power, drainage, passenger route, rescue route, or funicular is commissioned.\n`;
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
