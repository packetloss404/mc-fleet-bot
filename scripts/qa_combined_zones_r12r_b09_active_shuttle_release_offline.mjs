#!/usr/bin/env node
/** Deterministic offline readiness QA for the composed R12R active shuttle. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const OUT = path.resolve(
  ROOT,
  'data/world-review/combined-zones-r12-b09-active-transport-readiness-20260822T050000Z/r12r-offline',
);
const SNAPSHOT = 'data/worldsnap-r12q-post-20260822T044855Z';
const BASE = 'data/buildops/combined-zones-r12r-b09-bounded-active-shuttle';
const MANIFEST = `${BASE}.release-manifest.json`;
const CONTROLS_FORWARD = `${BASE}.b09-active-shuttle-fail-closed-controls.forward.txt`;
const CONTROLS_ROLLBACK = `${BASE}.b09-active-shuttle-fail-closed-controls.rollback.txt`;
const TRACK_FORWARD = `${BASE}.b09-active-shuttle-fail-closed-track.forward.txt`;
const TRACK_ROLLBACK = `${BASE}.b09-active-shuttle-fail-closed-track.rollback.txt`;
const FINAL_FUNCTIONAL_PROOF =
  'data/world-review/combined-zones-r12-b09-active-transport-readiness-20260822T050000Z/final-functional-helper-paper-proof.json';
const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const relative = (filename) => path.relative(ROOT, path.resolve(ROOT, filename)).split(path.sep).join('/');
const binding = (filename) => ({
  path: relative(filename),
  sha256: sha256(fs.readFileSync(path.resolve(ROOT, filename))),
  bytes: fs.statSync(path.resolve(ROOT, filename)).size,
});
const readJson = (filename) => JSON.parse(fs.readFileSync(path.resolve(ROOT, filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R12R offline QA rejected: ${message}`);
};
const run = (command, args) => execFileSync(command, args, {
  cwd: ROOT, encoding: 'utf8', stdio: 'pipe', maxBuffer: 64 * 1024 * 1024,
});
fs.mkdirSync(OUT, { recursive: true });

const preflight = (name, operations, overlays = []) => {
  const report = path.join(OUT, `${name}.json`);
  run(process.execPath, [
    'scripts/preflight_guarded_ops.mjs', operations, '--regions', `${SNAPSHOT}/region`,
    ...overlays.flatMap((entry) => ['--source-overlay-ops', entry]),
    '--report', relative(report),
  ]);
  return report;
};
const parser = (name, operations, role) => {
  const report = path.join(OUT, `${name}.json`);
  run('python3', [
    'scripts/rcon_runner.py', operations, '--dry-run', '--strict-noop',
    '--operation-role', role, '--report', relative(report),
  ]);
  return report;
};
const reports = {
  controlsForward: preflight('controls-forward-preflight', CONTROLS_FORWARD),
  trackForward: preflight('track-forward-preflight', TRACK_FORWARD, [CONTROLS_FORWARD]),
  trackRollback: preflight('track-projected-rollback-preflight', TRACK_ROLLBACK,
    [CONTROLS_FORWARD, TRACK_FORWARD]),
  controlsRollback: preflight('controls-projected-rollback-preflight', CONTROLS_ROLLBACK,
    [CONTROLS_FORWARD, TRACK_FORWARD, TRACK_ROLLBACK]),
  controlsForwardParser: parser('controls-forward-parser', CONTROLS_FORWARD, 'forward'),
  trackForwardParser: parser('track-forward-parser', TRACK_FORWARD, 'forward'),
  trackRollbackParser: parser('track-rollback-parser', TRACK_ROLLBACK, 'rollback'),
  controlsRollbackParser: parser('controls-rollback-parser', CONTROLS_ROLLBACK, 'rollback'),
};
const manifestQaPath = path.join(OUT, 'release-manifest-qa.json');
run(process.execPath, [
  'scripts/qa_guarded_release_manifest.mjs', '--manifest', MANIFEST,
  '--out', relative(manifestQaPath),
]);
const wrapperPlan = JSON.parse(run(process.execPath, [
  'scripts/run_combined_zones_scoped_release.mjs', '--manifest', MANIFEST,
  '--release-node', 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING', '--print-plan',
]));
const coordinatorPlan = JSON.parse(run(process.execPath, [
  'scripts/run_combined_zones_r12r_b09_active_shuttle_release.mjs', '--print-plan',
]));
const entityPlan = JSON.parse(run('python3', [
  'scripts/run_guarded_tagged_minecart_transaction.py',
  '--transaction-id', 'combined-zones-r12r-b09-bounded-active-shuttle',
  '--min-x', '2058', '--min-y', '130', '--min-z', '-748',
  '--max-x', '2073', '--max-y', '131', '--max-z', '-747',
  '--spawn-x', '2058.5', '--spawn-y', '130.0625', '--spawn-z', '-747.5',
  '--generated-at', '2026-08-22T05:30:00Z',
]));
const functionalPlan = JSON.parse(run('python3', [
  'scripts/run_combined_zones_r12r_b09_active_shuttle_functional.py',
  '--generated-at', '2026-08-22T05:30:00Z',
]));
const leasePlan = JSON.parse(run('python3', [
  'scripts/run_combined_zones_r12r_chunk_lease.py', '--mode', 'acquire',
  '--generated-at', '2026-08-22T05:30:00Z',
]));

const manifest = readJson(MANIFEST);
const finalFunctionalProof = readJson(FINAL_FUNCTIONAL_PROOF);
invariant(manifest.manifestIdentity === 'e3ad3ccbbc8fea853a4be2e7d747be830d04950fc5d3e7e16211b6504e3b2b16'
  && manifest.scope.exactBlockTargetCount === 19 && manifest.packages.length === 2,
'manifest identity or exact scope drifted');
invariant(readJson(manifestQaPath).status === 'PASS'
  && readJson(manifestQaPath).totals.uniqueTargetCells === 19,
'generic manifest QA is not exact PASS');
for (const [key, count] of [['controlsForward', 2], ['trackForward', 17],
  ['trackRollback', 17], ['controlsRollback', 2]]) {
  const report = readJson(reports[key]);
  invariant(report.status === 'PASS' && report.operationCount === count
    && report.passed === count && report.failed === 0, `${key} preflight failed`);
}
for (const [key, count] of [['controlsForwardParser', 2], ['trackForwardParser', 17],
  ['trackRollbackParser', 17], ['controlsRollbackParser', 2]]) {
  const report = readJson(reports[key]);
  invariant(report.status === 'dry_run' && report.strictNoop === true
    && report.sourceOperationCount === count && report.worldEditLeftoverCount === 0,
  `${key} parser failed`);
}
invariant(wrapperPlan.mode === 'PREPARE_ONLY' && wrapperPlan.packageOrder.length === 2,
'real block wrapper print plan failed');
invariant(entityPlan.status === 'PLAN_VALIDATED_NO_RCON_CONNECTION'
  && entityPlan.reportPayloadSha256
    === 'c0f6e9383c594e0003df35d3accc391ec8b46e47d547b6ce433dc1481e93a5cd',
'entity executor print plan drifted');
invariant(functionalPlan.status === 'PLAN_VALIDATED_NO_RCON_CONNECTION'
  && functionalPlan.blockContract.poweredRailCells.length === 15,
'functional print plan failed');
invariant(leasePlan.status === 'PLAN_VALIDATED_NO_RCON_CONNECTION'
  && leasePlan.requiredChunks.length === 2,
'exact chunk lease print plan failed');
invariant(coordinatorPlan.mode === 'PREPARE_ONLY_NO_RCON_CONNECTION'
  && coordinatorPlan.successSequence.includes('release-only-owned-chunk-additions-and-verify-exact-restoration')
  && coordinatorPlan.compensationSequence[1]
    === 'exact-uuid-type-tag-entity-rollback-first-if-forward-committed',
'composed coordinator print plan failed');
invariant(finalFunctionalProof.status
  === 'PASS_FINAL_FUNCTIONAL_HELPER_EXACT_PAPER_RUNTIME_AND_CLEANUP'
  && finalFunctionalProof.functionalAcceptance.status
    === 'PASS_WEST_EAST_WEST_FAIL_CLOSED_PARK_VERIFIED'
  && finalFunctionalProof.functionalAcceptance.terminal.railsUnpoweredCount === 15
  && finalFunctionalProof.functionalAcceptance.terminal.stationary === true
  && finalFunctionalProof.functionalAcceptance.entityAuthentication.count === 1
  && finalFunctionalProof.entityExactRollback.status === 'ROLLBACK_POSTCONDITION_VERIFIED'
  && finalFunctionalProof.safetyBoundary.productionWorldMutationPerformed === false,
'final functional helper disposable Paper proof failed');

const payload = {
  schemaVersion: 1,
  id: 'CZ-R12R-B09-BOUNDED-ACTIVE-SHUTTLE-OFFLINE-READINESS',
  generatedAtUtc: '2026-08-22T05:35:00Z',
  status: 'PASS_READY_FOR_EXPLICIT_COMPOSED_EXECUTION',
  manifest: binding(MANIFEST),
  manifestIdentity: manifest.manifestIdentity,
  sourcePredecessor: manifest.source.predecessor,
  exactBlockTargetCount: 19,
  packageCount: 2,
  persistentTaggedMinecartCount: 1,
  reports: Object.fromEntries(Object.entries(reports).map(([key, filename]) => [key, binding(filename)])),
  manifestQa: binding(manifestQaPath),
  printPlans: {
    wrapper: wrapperPlan,
    coordinator: coordinatorPlan,
    entity: entityPlan,
    functional: functionalPlan,
    chunkLease: leasePlan,
  },
  kernels: {
    coordinator: binding('scripts/run_combined_zones_r12r_b09_active_shuttle_release.mjs'),
    functional: binding('scripts/run_combined_zones_r12r_b09_active_shuttle_functional.py'),
    chunkLease: binding('scripts/run_combined_zones_r12r_chunk_lease.py'),
    taggedEntity: binding('scripts/run_guarded_tagged_minecart_transaction.py'),
  },
  finalFunctionalPaperProof: {
    binding: binding(FINAL_FUNCTIONAL_PROOF),
    proofPayloadSha256: finalFunctionalProof.proofPayloadSha256,
    paperVersion: finalFunctionalProof.runtime.paperVersion,
    productionWorldMutationPerformed: false,
  },
  failureCompensation: {
    entityForwardFailure: ['track-block-rollback', 'controls-block-rollback'],
    functionalOrPostFailure: ['entity-exact-uuid-rollback', 'track-block-rollback',
      'controls-block-rollback'],
    entityFirstRequired: true,
    routeChunksHeldOrReacquiredUntilRecovery: true,
    exactForceLoadSetRestorationRequired: true,
  },
  terminalAcceptance: {
    controlsOff: true,
    railsUnpowered: 15,
    exactTaggedMinecartStationaryInWestPark: true,
    terminalCompleteSaveAfterForceLoadRestoration: true,
  },
  liveCallsPerformed: false,
  worldMutationPerformed: false,
};
const readinessPayloadSha256 = sha256(JSON.stringify(payload));
const report = { ...payload, readinessPayloadSha256 };
const output = path.join(OUT, 'offline-readiness.json');
fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  status: report.status,
  report: relative(output),
  readinessPayloadSha256,
  manifestIdentity: manifest.manifestIdentity,
}, null, 2)}\n`);
