#!/usr/bin/env node
/** Read-only R09K commissioning seal for the isolated B07 upper segment only. */

import fs from 'node:fs';
import path from 'node:path';

import { sha256 } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const EVIDENCE = value('--evidence-dir', 'data/world-review/combined-zones-r09j-live-20260822T025021Z');
const LEDGER = value('--ledger', path.join(EVIDENCE, 'evidence-ledger.json'));
const QA = value('--post-qa', path.join(EVIDENCE, 'r09j-post-release-qa.json'));
const MANIFEST = value('--manifest', 'data/buildops/combined-zones-r09j-b07-upper-route-gravity-isolation-cap.release-manifest.json');
const OUT = value('--out', path.join(EVIDENCE, 'r09k-b07-bounded-upper-route-commissioning-seal.json'));
const MARKDOWN = value('--markdown', path.join(EVIDENCE, 'r09k-b07-bounded-upper-route-commissioning-seal.md'));
const GENERATED_AT = value('--generated-at', '2026-08-22T02:57:00Z');
const EXPECTED = Object.freeze({
  ledger: 'ea89c16e664efa2981b70da07d783d800f4cf9e3bd0f26625ffeaf58e4d7aa7d',
  manifest: 'ccc587f4b67cb5b6a17bd7639758ae4c4fa0eb3aecbe797312c89572e690f4a2',
  manifestIdentity: 'c6bcf5546abfd9aaceb24d3e0ee70b4b57cb07e47be800baa08478a1ad2306a1',
  qaFile: '42b687fd14474e332a3ae83fa75b00b0d529f04f4c2c364aec59286b10561f90',
  qaPayload: 'f80caf3936e1d485b130a8a5c49df914b69de6a3072322c6bd487ec559efee6a',
  completed: '0c722e3ac473ab22239bba599bbab8c1b9776f727212442bf9a044c40494a47d',
  postComplete: '81cf43e16f60b875e5e4eb5f50df0f43487ed9b3fd2f52e7883b22e2147c5132',
  postRegion: '072bfa045bbc55b457585bd6725159cc97a4650b73e7769b4f977a2972682067',
  surfaceHash: 'a8fa8d320a5cd523853f37a24a332cef807ae107f44b6e64884d71026637d676',
  clearanceHash: 'f4a8236e54e74669782bfd082e0c98b0afc6a01740fefbffc062d816bf4cb8c2',
  boundaryHash: 'd3d36a75aab0e1c914b5d80f43f915af32ec72ae248224edf5a872551dbd1c69',
  capHash: '6433ef6a7b50624b39806d156a25bb11fdfe9beef03c494136b5d5fd2d1d163b',
});
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const binding = (filename) => ({ path: rel(filename), sha256: sha256(fs.readFileSync(abs(filename))), bytes: fs.statSync(abs(filename)).size });
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R09K bounded commissioning rejected: ${message}`);
};

const ledger = readJson(LEDGER);
const qa = readJson(QA);
const manifest = readJson(MANIFEST);
const ledgerBinding = binding(LEDGER);
const qaBinding = binding(QA);
const manifestBinding = binding(MANIFEST);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
const postIntake = readJson(ledger.postSnapshot.completeSaveIntake.path);

invariant(ledgerBinding.sha256 === EXPECTED.ledger
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.mode === 'EXECUTE' && ledger.transactionId === manifest.transactionId
  && ledger.releaseNodeId === 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT'
  && ledger.completedReleaseIdentitySha256 === EXPECTED.completed,
'accepted R09J ledger drifted');
invariant(manifestBinding.sha256 === EXPECTED.manifest && ledger.manifest.sha256 === EXPECTED.manifest
  && manifest.manifestIdentity === EXPECTED.manifestIdentity && manifest.mvpScope === true,
'R09J manifest binding drifted');
invariant(postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.packageIdentity.completeSaveSha256 === EXPECTED.postComplete
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.postComplete
  && postIdentity.sha256 === EXPECTED.postRegion,
'accepted immutable R09J post binding drifted');
invariant(qaBinding.sha256 === EXPECTED.qaFile
  && qa.status === 'PASS_R09J_B07_GRAVITY_ISOLATION_CAP_POSTSTATE_VERIFIED_REVERSIBLE'
  && qa.qaPayloadSha256 === EXPECTED.qaPayload && qa.release.completedReleaseIdentitySha256 === EXPECTED.completed
  && qa.summary.passed === true && qa.summary.checkCount === 15 && qa.summary.failCount === 0,
'independent R09J post QA is absent or drifted');

invariant(qa.geometry.isolationCap.cellCount === 2
  && qa.geometry.isolationCap.coordinateSetSha256 === EXPECTED.capHash
  && qa.geometry.retainedUpperSurface.cellCount === 91
  && qa.geometry.retainedUpperSurface.coordinateSetSha256 === EXPECTED.surfaceHash
  && qa.geometry.retainedUpperClearance.cellCount === 182
  && qa.geometry.retainedUpperClearance.coordinateSetSha256 === EXPECTED.clearanceHash
  && qa.geometry.retainedUpperClearanceAirCount === 182
  && qa.geometry.retainedUpperBoundary.cellCount === 174
  && qa.geometry.retainedUpperBoundary.coordinateSetSha256 === EXPECTED.boundaryHash
  && qa.geometry.retainedUpperBoundaryCollisionCount === 172
  && qa.geometry.retainedUpperBoundaryBackedApertureCount === 2,
'bounded upper geometry/clearance/containment proof drifted');
invariant(qa.geometry.reachableUpperSurfaceCount === 91
  && qa.geometry.reachableExcludedLowerSurfaceCount === 0
  && qa.geometry.commissionedSegmentStartStairIndex === 21
  && qa.geometry.commissionedSegmentEndStairIndex === 110
  && qa.geometry.blockedStairIndex === 20,
'bounded graph or exact segment indices drifted');
invariant(qa.geometry.retainedUpperBoundaryGravityCount === 8
  && qa.geometry.unsupportedUpperBoundaryGravityCount === 0
  && qa.preservation.inheritedUnsupportedBoundaryCellCount === 2
  && qa.preservation.unsupportedTerminalAirPreserved === true,
'supported upper boundary or excluded unsupported-gravel proof drifted');
invariant(qa.preservation.lowerWetContainmentDeckCellCount === 49
  && qa.preservation.doorlessHeadhouseWallCellCount === 72
  && qa.preservation.headhouseRoofCellCount === 49
  && qa.preservation.passiveFixtureCellCount === 8
  && qa.preservation.postMechanismCellCount === 0
  && qa.preservation.postBlockEntityCount === 0 && qa.preservation.postSavedEntityCount === 0,
'closed wet/exterior/mechanism/entity holds drifted');
invariant(qa.drift.haloUndeclaredChangedCellCount === 0
  && qa.drift.b07InteractionCellCount === 13608
  && qa.drift.b07InteractionChangedCellCount === 2
  && qa.drift.b07InteractionUndeclaredChangedCellCount === 0
  && qa.drift.lifecycleTransitionCellCount === 0 && qa.drift.mechanismChangedCellCount === 0,
'post-state drift classification is not commissioning-safe');
invariant(qa.executionEvidence.stageCount === 17 && qa.executionEvidence.evidenceBindingFailureCount === 0
  && qa.executionEvidence.journalEntryCount === 10 && qa.executionEvidence.journalComplete === true
  && qa.executionEvidence.rollbackPassed === 2 && qa.executionEvidence.rollbackFailed === 0,
'execution or rollback evidence is incomplete');

const criteria = [
  'R09K-01-ACCEPTED-R09J-TERMINAL-POST-AND-INDEPENDENT-QA',
  'R09K-02-EXACT-91-SURFACE-BOUNDED-UPPER-COMPONENT',
  'R09K-03-STARTS-AT-STAIR-INDEX-21-AND-TERMINATES-AT-CLOSED-HEADHOUSE-HOLD',
  'R09K-04-ZERO-REACHABLE-SURFACES-AT-OR-BELOW-CAP-INDEX-20',
  'R09K-05-EXACT-182-OF-182-AIR-CLEARANCE',
  'R09K-06-COMPLETE-172-PLUS-TWO-FLOOR-BACKED-APERTURE-BOUNDARY',
  'R09K-07-EIGHT-OF-EIGHT-GRAVITY-BOUNDARY-CELLS-SUPPORTED',
  'R09K-08-INHERITED-UNSUPPORTED-GRAVEL-EXCLUDED-AND-UNCHANGED',
  'R09K-09-LOWER-WET-INTERFACE-REMAINS-CLOSED',
  'R09K-10-EXTERIOR-DOORLESS-HEADHOUSE-HOLD-REMAINS-CLOSED',
  'R09K-11-ZERO-MECHANISM-ENTITY-BLOCK-ENTITY-OR-UNDECLARED-DRIFT',
  'R09K-12-STRICT-JOURNALED-EXECUTION-AND-EXACT-INVERSE-READY',
];
const payload = {
  schemaVersion: 1,
  id: 'combined-zones-r09k-b07-bounded-upper-route-commissioning-seal',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R09K_B07_BOUNDED_UPPER_SEGMENT_COMMISSIONED_TO_CLOSED_HOLDS',
  releaseNodeId: 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT',
  commissioningScopeId: 'CZ-R09K-B07-BOUNDED-UPPER-INSPECTION-CIRCULATION',
  bindings: { r09jLedger: ledgerBinding, r09jManifest: manifestBinding, r09jPostQa: qaBinding,
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
    postCompleteSaveSha256: ledger.postSnapshot.completeSaveSha256, postRegionSha256: postIdentity.sha256 },
  commissionedScope: {
    useClass: 'PASSIVE_INTERNAL_INSPECTION_CIRCULATION_WITHIN_CLOSED_B07_ENVELOPE',
    surfaceCellCount: 91, stairIndexStart: 21, stairIndexEnd: 110,
    closedUpperEndpoint: 'DOORLESS_R07J_HEADHOUSE_INTERIOR_HOLD',
    closedLowerEndpoint: 'R09J_TWO_CELL_GRAVITY_ISOLATION_CAP_AT_STAIR_INDEX_20',
    surfaceCoordinateSetSha256: EXPECTED.surfaceHash,
    clearanceCellCount: 182, clearanceAirCellCount: 182,
    boundaryCellCount: 174, collisionBoundaryCellCount: 172, floorBackedApertureCount: 2,
    supportedGravityBoundaryCellCount: 8, unsupportedGravityBoundaryCellCount: 0,
    internallyReachableSurfaceCount: 91, reachableExcludedLowerSurfaceCount: 0,
  },
  retainedHolds: {
    fullB07ThroughRouteCommissioned: false,
    lowerStairIndices0Through20Excluded: true,
    inheritedUnsupportedGravelBoundaryCellCount: 2,
    unsupportedGravelStabilizedOrRemoved: false,
    lowerWetInterfaceOpened: false,
    exteriorDoorOrOpeningCreated: false,
    publicRouteCommissioned: false,
    fireServiceRouteCommissioned: false,
    accessibleRouteCommissioned: false,
    liftCommissioned: false,
    smokeControlCommissioned: false,
    powerOrDrainageCommissioned: false,
  },
  laneDisposition: {
    r09PhysicalFitoutLaneClosedForMvp: true,
    usefulBoundedUpperSegmentAccepted: true,
    completeThroughRouteDeferredByExactLocalGravityHold: true,
    nextWorkMustNotBeTinyCosmeticB07Scope: true,
  },
  criteria: criteria.map((id) => ({ id, status: 'PASS' })),
  summary: { passed: true, criterionCount: criteria.length, passCount: criteria.length, failCount: 0,
    commissionedSurfaceCellCount: 91, retainedLocalHoldCount: 3 },
  safetyBoundary: { evidenceOnly: true, liveCallsPerformed: false, worldMutationPerformed: false,
    publicOrFireServiceCommissioningClaimed: false, fullThroughRouteCommissioningClaimed: false },
};
const commissioningIdentitySha256 = sha256(JSON.stringify(payload));
const report = { ...payload, commissioningIdentitySha256 };
fs.writeFileSync(abs(OUT), `${JSON.stringify(report, null, 2)}\n`);
const markdown = `# R09K B07 bounded upper-route commissioning seal\n\n`
  + `**Status:** ${report.status}  \n**Commissioning identity:** \`${commissioningIdentitySha256}\`\n\n`
  + `The isolated 91-surface upper B07 segment from stair index 21 through index 110 and the closed doorless headhouse hold is accepted for passive internal inspection circulation inside the closed envelope. It has 182/182 air-clearance cells and a complete 174-cell boundary comprising 172 collision cells plus two exact floor-backed apertures; all eight gravity boundary cells are supported.\n\n`
  + `This is deliberately not a through-route, public-route, accessible-route, fire-service, lift, smoke-control, power, or drainage commissioning. The lower endpoint remains the R09J cap at index 20, the inherited unsupported gravel remains outside the accepted component, the lower wet interface remains closed, and the upper endpoint remains doorless and exterior-closed. These are exact local holds, not blockers to accepting the bounded upper segment.\n\n`
  + `The R09 MVP physical fit-out lane is closed at this bounded state. Further work should move to a larger required R10 or R13 readiness scope rather than a tiny cosmetic B07 package. This verifier performed no live call or world mutation.\n`;
fs.writeFileSync(abs(MARKDOWN), markdown);
process.stdout.write(`${JSON.stringify({ status: report.status, output: rel(OUT), markdown: rel(MARKDOWN), commissioningIdentitySha256, summary: report.summary }, null, 2)}\n`);
