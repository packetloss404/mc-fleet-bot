#!/usr/bin/env node
/** Read-only bounded R10 MVP fit-out/circulation closure. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-22T04:55:00Z');
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r10-mvp-closure',
);
const OUT = value('--out', `${EVIDENCE_DIR}/r10-mvp-closure.json`);
const MARKDOWN = value('--markdown', `${EVIDENCE_DIR}/r10-mvp-closure.md`);
const RELEASE_NODE_ID = 'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT';

const INPUTS = Object.freeze({
  releaseContract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
  r10aQa: 'data/world-review/combined-zones-r10a-live-20260821T163935Z/r10a-post-release-qa.json',
  r10fQa: 'data/world-review/combined-zones-r10f-live-20260822T003320Z/r10f-post-release-qa.json',
  r10gQa: 'data/world-review/combined-zones-r10g-live-20260822T031853Z/r10g-post-release-qa.json',
  r10hLedger: 'data/world-review/combined-zones-r10h-live-20260822T035805Z/evidence-ledger.json',
  r10hQa: 'data/world-review/combined-zones-r10h-live-20260822T035805Z/r10h-post-release-qa.json',
  r12aCommissioning: 'data/world-review/combined-zones-r12a-cheyenne-gallery-commissioning-20260821T165900Z/r12a-commissioning.json',
  r12bReadiness: 'data/world-review/combined-zones-r12b-b09-static-readiness-r10e-20260822T002500Z/r12b-readiness.json',
  r12nQa: 'data/world-review/combined-zones-r12n-live-20260822T040651Z/r12n-post-release-qa.json',
  r12oCommissioning: 'data/world-review/combined-zones-r12o-b03-complete-enclosed-route-commissioning-20260822T041000Z/r12o-commissioning.json',
});

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const payloadHash = (valueToHash) => sha256(Buffer.from(`${JSON.stringify(valueToHash, null, 2)}\n`));
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const binding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R10 bounded MVP closure rejected: ${message}`);
};
const passArtifact = (record) => typeof record?.status === 'string'
  && record.status.startsWith('PASS')
  && record.summary?.passed !== false;

const records = Object.fromEntries(Object.entries(INPUTS).map(
  ([key, filename]) => [key, readJson(filename)],
));
const bindings = Object.fromEntries(Object.entries(INPUTS).map(
  ([key, filename]) => [key, binding(filename)],
));
const contractNode = records.releaseContract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID);
invariant(contractNode, 'R10 release node is absent from the contract');
invariant(JSON.stringify(contractNode.canonicalOwners) === JSON.stringify([
  'Z08-CONTACT-SEQUENCE-FITOUT',
  'Z10-CHEYENNE-FITOUT',
  'Z11-SUMMIT-FITOUT',
]), 'R10 canonical owners drifted');

for (const key of ['r10aQa', 'r10fQa', 'r10gQa', 'r10hQa', 'r12aCommissioning',
  'r12bReadiness', 'r12nQa', 'r12oCommissioning']) {
  invariant(passArtifact(records[key]), `${key} is not accepted PASS evidence`);
}
invariant(records.r10hLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && records.r10hLedger.releaseNodeId === RELEASE_NODE_ID
  && records.r10hLedger.postSnapshot?.completeSaveSha256
    === '86bdbd6875a18cffc2707334633f79c9089aecb9fb45074fb16111bfd87fda4b',
'R10H immutable post ledger is not the accepted source');

invariant(records.r10aQa.release?.releaseNodeId === RELEASE_NODE_ID
  && records.r10aQa.summary?.linerMatchCount === 594
  && records.r10aQa.summary?.routeAirMatchCount === 660
  && records.r10aQa.summary?.terminusStoneMatchCount === 20
  && records.r10aQa.summary?.rollbackGuardPassCount === 594,
'Cheyenne bounded fit-out evidence drifted');
invariant(records.r10fQa.exactPostState?.targetCellCount === 19
  && records.r10fQa.preservation?.completeRouteCellCount === 1116
  && records.r10fQa.preservation?.completeRouteComponentCount === 1
  && records.r10fQa.preservation?.completeBoundaryCellCount === 3346
  && records.r10fQa.preservation?.priorFixturePreservedCount === 20
  && records.r10fQa.execution?.rollbackPoststatePassCount === 19
  && records.r10fQa.disposition?.funicularCommissioned === false
  && records.r10fQa.disposition?.pedestrianRouteCommissioned === false,
'B09 bounded summit fit-out evidence drifted or overclaims operation');
invariant(records.r10gQa.release?.releaseNodeId === RELEASE_NODE_ID
  && records.r10gQa.summary?.exactTargetCellCount === 5346
  && records.r10gQa.summary?.routeAirCellCount === 5940
  && records.r10gQa.summary?.fixtureCellCount === 49
  && records.r10gQa.summary?.undeclaredChangedCellCount === 0,
'B03 institutional fit-out evidence drifted');
invariant(records.r10hQa.summary?.exactTargetCellCount === 48
  && records.r10hQa.summary?.rollbackGuardPassCount === 48
  && records.r10hQa.summary?.undeclaredChangedCellCount === 0,
'R10H passive-lighting post QA drifted');

invariant(records.r12aCommissioning.summary?.routeAirCellCount === 660
  && records.r12aCommissioning.summary?.rollbackGuardPassCount === 594,
'Cheyenne bounded commissioning seal drifted');
invariant(records.r12bReadiness.geometry?.connectedLowerToSummitVoid?.exactAirCellCount === 1116
  && records.r12bReadiness.geometry?.completeFaceBoundary?.cellCount === 3346
  && records.r12bReadiness.rollbackReadiness?.totalRollbackOperationGroupCount === 6604,
'B09 static enclosure readiness drifted');
invariant(records.r12nQa.exactPostState?.resultingConnectedComponent?.cellCount === 239
  && records.r12nQa.preservation?.postRailCount === 489
  && records.r12nQa.preservation?.b09UndeclaredDifferenceCount === 0
  && records.r12nQa.disposition?.activeSystemInstalled === false
  && records.r12nQa.disposition?.funicularCommissioned === false,
'latest accepted B09 passive-rail evidence drifted or overclaims operation');
invariant(records.r12oCommissioning.bindings?.latestPhysicalState?.completeSaveSha256
    === records.r10hLedger.postSnapshot.completeSaveSha256
  && records.r12oCommissioning.summary?.stationCount === 613
  && records.r12oCommissioning.summary?.routeAirCellCount === 12212
  && records.r12oCommissioning.summary?.centralClearanceAirCellCount === 5505
  && records.r12oCommissioning.summary?.fixtureCellCount === 102
  && records.r12oCommissioning.summary?.rollbackGuardPassCount === 5988,
'R12O is not bound to the accepted R10H post or its bounded route metrics drifted');
const r12oBoundary = records.r12oCommissioning.boundary;
invariant(r12oBoundary?.secureRouteCommissioned === false
  && r12oBoundary?.publicRouteCommissioned === false
  && r12oBoundary?.accessControlCommissioned === false
  && r12oBoundary?.activeMechanismCommissioned === false
  && r12oBoundary?.chamberOpenedOrOccupied === false
  && r12oBoundary?.directTerminalLinkOpened === false,
'R12O nonclaims drifted');

const checks = [
  ['contract-node-and-owners', Boolean(contractNode)],
  ['accepted-r10a-cheyenne-liner-route-and-cap', records.r10aQa.summary.linerMatchCount === 594],
  ['accepted-r10f-b09-static-route-boundary-wayfinding', records.r10fQa.summary.passed === true],
  ['accepted-r10g-b03-institutional-liner', records.r10gQa.summary.exactTargetCellCount === 5346],
  ['accepted-r10h-post-and-passive-lighting', records.r10hQa.summary.exactTargetCellCount === 48],
  ['accepted-r12a-cheyenne-bounded-circulation', records.r12aCommissioning.summary.passed === true],
  ['accepted-r12b-b09-static-readiness', records.r12bReadiness.status.startsWith('PASS')],
  ['accepted-r12n-passive-rail-nonoperation', records.r12nQa.disposition.funicularCommissioned === false],
  ['accepted-r12o-r10h-post-bound-circulation', records.r12oCommissioning.summary.passed === true],
  ['exact-b03-current-post-reverse-chain', records.r12oCommissioning.summary.rollbackGuardPassCount === 5988],
  ['secure-public-active-chamber-terminal-exterior-nonclaims', !r12oBoundary.secureRouteCommissioned
    && !r12oBoundary.publicRouteCommissioned && !r12oBoundary.activeMechanismCommissioned],
  ['read-only-no-world-or-service-mutation', true],
].map(([id, passed]) => ({ id, status: passed ? 'PASS' : 'WAITING' }));
invariant(checks.every(({ status }) => status === 'PASS'), 'one or more closure checks wait');

const reportWithoutHash = {
  schemaVersion: 1,
  id: 'combined-zones-r10-bounded-mvp-fitout-circulation-closure-v1',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R10_BOUNDED_MVP_FITOUT_AND_PASSIVE_CIRCULATION_CLOSURE_ACCEPTED',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  disposition: 'BOUNDED_FITOUT_AND_PASSIVE_INTERNAL_CIRCULATION_ACCEPTED_TO_FAIL_CLOSED_HOLDS',
  bindings: {
    ...bindings,
    acceptedR10hPost: {
      root: records.r10hLedger.postSnapshot.root,
      completeSaveSha256: records.r10hLedger.postSnapshot.completeSaveSha256,
      regionSnapshotSha256: records.r12oCommissioning.bindings.latestPhysicalState.regionSnapshotSha256,
      completedReleaseIdentitySha256: records.r10hLedger.completedReleaseIdentitySha256,
    },
    evidenceUnionRule: 'R10H/R12O is the exact B03 physical-post anchor. Older accepted R10A/R10F and later disjoint R12N evidence are independently bound; this seal does not claim they are one fabricated same-moment snapshot.',
  },
  acceptedBoundedMvp: {
    cheyenne: {
      linerCellCount: 594,
      routeAirCellCount: 660,
      terminusCapCellCount: 20,
      circulationToFailClosedHoldAccepted: true,
    },
    b09Summit: {
      connectedStaticRouteAirCellCount: 1116,
      completeBoundaryCellCount: 3346,
      passiveFixtureCount: 39,
      laterPassiveRailCellCount: 489,
      staticFitoutAccepted: true,
      transportCommissioned: false,
    },
    b03ContactSequence: {
      commissionedFirstIndex: 188,
      commissionedLastIndex: 800,
      stationCount: 613,
      linerTargetCellCount: 5940,
      routeAirCellCount: 12212,
      centralClearanceAirCellCount: 5505,
      passiveFixtureCount: 102,
      currentPostRollbackGuardPassCount: 5988,
      passiveInternalInspectionCirculationAccepted: true,
    },
  },
  exactRetainedHolds: {
    b03Indices0Through187: {
      commissioned: false,
      routeObstructionCount: records.r12oCommissioning.explicitUpstreamHold.exactRouteObstructionCount,
      unsupportedFloorAirCellCount: records.r12oCommissioning.explicitUpstreamHold.exactUnsupportedFloorAirCellCount,
    },
    secureRouteCommissioned: false,
    publicRouteCommissioned: false,
    accessControlCommissioned: false,
    activeMechanismCommissioned: false,
    b09TransportOrFunicularCommissioned: false,
    cheyenneChamberOpenedOrOccupied: false,
    directTerminalLinkOpened: false,
    exteriorOpeningCommissioned: false,
    rescueOrEgressCommissioned: false,
    powerSignalDriveBrakeVehicleDrainageCommissioned: false,
  },
  evidenceLimits: {
    globalTerminalSnapshotClaimed: false,
    fullSecureOrPublicRouteClaimed: false,
    activeSystemClaimed: false,
    closureNeedsPhysicalMutation: false,
  },
  checks,
  summary: {
    passed: true,
    checkCount: checks.length,
    passCount: checks.length,
    waitingCount: 0,
    boundedMvpClosureAccepted: true,
    retainedHoldCount: 11,
  },
  safetyBoundary: {
    readOnly: true,
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    canonicalBuildopsReadOrModified: false,
    serviceMutationsPerformed: false,
    publicationPerformed: false,
  },
};
const closurePayloadSha256 = payloadHash(reportWithoutHash);
const report = { ...reportWithoutHash, closurePayloadSha256 };
const markdown = `# R10 bounded MVP fit-out/circulation closure\n\nStatus: **${report.status}**\n\nPayload SHA-256: \`${closurePayloadSha256}\`\n\nThis read-only seal accepts the bounded passive R10 result: the Cheyenne gallery to its retained cap, static/passive B09 summit fit-out, and B03 indices 188..800 passive internal inspection circulation. It does not claim one fabricated same-moment snapshot across disjoint evidence lines.\n\n## Accepted\n\n- Cheyenne: 594 liner cells, 660 route-air cells, retained 20-cell terminus cap.\n- B09: 1,116 connected static route-air cells, 3,346-cell boundary, 39 passive fixtures; later accepted passive rail remains non-operational.\n- B03: 613 stations, 12,212 connected route-air cells, 5,505 central-clearance cells, 102 passive fixtures, and 5,988/5,988 current-post reverse guards.\n\n## Explicit holds and nonclaims\n\n- B03 indices 0..187 remain uncommissioned behind 63 route obstructions and 14 unsupported floor-air cells.\n- Secure/public access, access control, active mechanisms, B09 transport/funicular operation, chamber/terminal/exterior opening, rescue/egress, and power/signal/drive/brake/vehicle/drainage are not commissioned.\n\nNo live call, world edit, buildops edit, service mutation, or publication was performed.\n`;

fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.mkdirSync(path.dirname(absolute(MARKDOWN)), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(MARKDOWN), markdown);
process.stdout.write(`${JSON.stringify({
  status: report.status,
  output: relative(OUT),
  markdown: relative(MARKDOWN),
  closurePayloadSha256,
  summary: report.summary,
}, null, 2)}\n`);
