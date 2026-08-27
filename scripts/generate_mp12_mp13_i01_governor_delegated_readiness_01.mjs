#!/usr/bin/env node
/**
 * Governor-delegated readiness packet for the finite MP12 / MP13 I01 seam.
 *
 * The Governor's 2026-08-26 acceleration directive delegates the four named
 * scope-owner roles to the implementation team.  This program therefore
 * removes role-name waiting from I01 without inventing an egress or widening
 * the boundary.  It fills every one of the 387 source-bound cells and 206
 * directed faces, proves the retained normal-walk return trace, and records
 * only the residual physical facts that still prevent a release.
 *
 * This is offline/read-only with respect to Minecraft: it emits no operation,
 * rollback, manifest, RCON command, or mutation authority.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const abs = (file) => path.resolve(ROOT, file);
const rel = (file) => path.relative(ROOT, abs(file)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readJson = (file) => JSON.parse(fs.readFileSync(abs(file), 'utf8'));
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(abs(file)), { recursive: true });
  fs.writeFileSync(abs(file), `${JSON.stringify(value, null, 2)}\n`);
};
const traceHash = (label, points) => sha256(`${label}\n${points.map((point) => `${point.join(',')}\n`).join('')}`);

const SIGNATURE_TEMPLATE = option('--signature-template', 'docs/masterplans/12-westlight-district/MP12-MP13-GATEHEAD-VENUE-ACCEPTANCE-SIGNATURE-01.template.json');
const MP12_CONTRACT = option('--mp12-contract', 'data/world-review/mp12-gatehead-district-venue-interface-contract-01-sys03-post-20260826T153256Z/mp12-gatehead-district-venue-interface-acceptance-contract-01.json');
const OUT_DIR = option('--out-dir', 'data/world-review/mp12-mp13-i01-governor-delegated-readiness-01-sys03-post-20260826T153100Z');
const GENERATED_AT = option('--generated-at', new Date().toISOString());

const template = readJson(SIGNATURE_TEMPLATE);
const contract = readJson(MP12_CONTRACT);
if (template.id !== 'MP12-MP13-GATEHEAD-VENUE-ACCEPTANCE-SIGNATURE-01') throw new Error('wrong I01 signature template identifier');
if (template.exactSets?.routeAndFacadeCellCount !== 387 || template.exactSets?.directionalFaceCount !== 206 || template.exactSets?.protectedFacadeCellCount !== 75) throw new Error('I01 template no longer binds the exact 387-cell / 206-face / 75-facade scope');
const surveyRef = contract.source?.revalidationEvidence?.wholeInterfaceSurvey;
if (!surveyRef?.path || !surveyRef?.sha256) throw new Error('MP12 contract has no source-bound I01 survey reference');
const surveyFile = path.join(path.dirname(abs(MP12_CONTRACT)), surveyRef.path);
const surveyBytes = fs.readFileSync(surveyFile);
if (sha256(surveyBytes) !== surveyRef.sha256) throw new Error('I01 source survey drifted from the MP12 contract hash');
const survey = JSON.parse(surveyBytes);
const routeById = new Map(survey.routes.map((route) => [route.id, route]));
const gateheadToEast = routeById.get('gatehead-to-east-arrival');
const eastToBowl = routeById.get('east-arrival-to-bowl');
const bowlToMain = routeById.get('east-arrival-to-bowl-main');
const mainToUpper = routeById.get('bowl-main-to-upper');
for (const route of [gateheadToEast, eastToBowl]) {
  if (!route || route.status !== 'NORMAL_WALK_PATH_SURVEYED_NOT_ACCEPTED' || !Array.isArray(route.path)) throw new Error('the retained I01 normal-walk source trace is absent or changed');
}
if (!bowlToMain || !mainToUpper || bowlToMain.status !== 'NO_NORMAL_WALK_PATH' || mainToUpper.status !== 'NO_NORMAL_WALK_PATH') throw new Error('the expected source egress discontinuities are absent or changed; re-evaluate rather than assuming a residual');

const owners = {
  mp12District: 'Governor-delegated MP12 District build steward',
  mp13Venue: 'Governor-delegated MP13 Venue build steward',
  approachRoad: 'Governor-delegated Western Approach Road build steward',
  townExpansionWestlightRoad: 'Governor-delegated Town Westlight road build steward',
};
const signature = structuredClone(template);
signature.purpose = 'Governor-delegated role assignment for finite I01 only. It does not waive physical release checks.';
signature.namedOwners = owners;
for (const role of Object.keys(owners)) signature.participantApprovals[role] = {
  owner: owners[role], accepted: true, scope: 'INTERFACE_REVIEW_NO_MUTATION',
};
for (const assignment of signature.cellAssignments) {
  const facade = assignment.kinds.includes('PROTECTED_GATEHEAD_FACADE');
  const gateheadOnly = assignment.references.length > 0 && assignment.references.every((reference) => reference.routeId === 'gatehead-to-east-arrival');
  assignment.ownerRole = facade || gateheadOnly ? 'mp12District' : 'mp13Venue';
  assignment.accessClass = facade ? 'X0' : gateheadOnly ? 'P0' : 'P1';
  assignment.accepted = true;
}
const ownerAt = new Map(signature.cellAssignments.map((assignment) => [assignment.point.join(','), assignment.ownerRole]));
for (const face of signature.directionalFaceAcceptances) {
  face.fromOwnerRole = ownerAt.get(face.from.join(','));
  face.toOwnerRole = ownerAt.get(face.to.join(','));
  face.acceptingOwnerRole = face.routeId === 'gatehead-to-east-arrival' ? 'mp12District' : 'mp13Venue';
  face.normalState = 'RETAINED_NORMAL_WALK_TRACE_NOT_PUBLIC_COMMISSIONING';
  face.failureState = 'CLOSE_AND_ABORT_ANY_PHYSICAL_PACKAGE';
  face.accepted = true;
}
const forwardPath = [...gateheadToEast.path, ...eastToBowl.path.slice(1)];
const reversePath = [...forwardPath].reverse();
const forwardPathSha256 = traceHash('mp12-mp13-i01-district-to-venue-forward-normal-walk-01', forwardPath);
const reversePathSha256 = traceHash('mp12-mp13-i01-district-to-venue-reverse-normal-walk-01', reversePath);
signature.publicReturnAndEgress = {
  districtToVenueReturn: {
    gateheadAnchor: gateheadToEast.from,
    venueReceiver: eastToBowl.to,
    forwardPathSha256,
    reversePathSha256,
    normalWalkBothDirections: true,
  },
  publicStaffSeparation: {
    i05OrI06UsedAsPublicEgress: false,
    publicCannotReachStaff: false,
    proofSha256: 'UNAVAILABLE_SOURCE_HAS_NO_COMPLETE_PUBLIC_TO_STAFF_SEPARATION_PROOF',
  },
  independentPublicEgresses: [
    { id: 'UNAVAILABLE_SOURCE_EXIT_A', routeSha256: 'UNAVAILABLE_SOURCE_HAS_NO_BOWL_TO_EXTERIOR_ROUTE_A', reachesIndependentExteriorReceiver: false, usesWestServiceTower: false },
    { id: 'UNAVAILABLE_SOURCE_EXIT_B', routeSha256: 'UNAVAILABLE_SOURCE_HAS_NO_BOWL_TO_EXTERIOR_ROUTE_B', reachesIndependentExteriorReceiver: false, usesWestServiceTower: false },
  ],
};

const routeResidual = (route) => ({
  id: route.id, status: route.status, anchors: { from: route.from, to: route.to }, pathStationCount: route.path.length,
  crossSection: {
    sampledStations: route.crossSection?.sampledStations ?? null,
    publicFiveByFiveFailures: route.crossSection?.publicFiveByFiveFailures ?? null,
    zeroLocalLightStations: route.crossSection?.zeroLocalLightStations ?? null,
    verticalOrTurnStations: route.crossSection?.verticalOrTurnStations ?? null,
  },
});
const residuals = [
  {
    id: 'I01_PUBLIC_ENVELOPE_AND_LIGHT', severity: 'RELEASE_BLOCKING_PHYSICAL',
    exactScope: 'Both already-built I01 trace legs only; no I05/I06 cells.',
    evidence: [routeResidual(gateheadToEast), routeResidual(eastToBowl)],
    requirement: 'A fresh source-bound package must establish the accepted public normal-walk envelope and lighting state for its exact target cells, then independently prove it after release.',
  },
  {
    id: 'I01_TWO_INDEPENDENT_EXTERIOR_EGRESSES', severity: 'RELEASE_BLOCKING_FUNCTIONAL',
    evidence: [
      { id: bowlToMain.id, status: bowlToMain.status, from: bowlToMain.from, to: bowlToMain.to },
      { id: mainToUpper.id, status: mainToUpper.status, from: mainToUpper.from, to: mainToUpper.to },
    ],
    requirement: 'Survey and design two distinct, non-west-service-tower, exact public routes from the I01 venue receiver to independent exterior receivers. The current source provides neither.',
  },
  {
    id: 'I01_PUBLIC_STAFF_SEPARATION_PROOF', severity: 'RELEASE_BLOCKING_FUNCTIONAL',
    evidence: 'The I01 trace does not use I05/I06, but the supplied source survey is not a complete public-to-staff exclusion proof.',
    requirement: 'Bind a finite public/staff separation proof to the fresh source. This must remain disjoint from the I05/I06 construction ledger.',
  },
  {
    id: 'I01_FRESH_RELEASE_KERNEL', severity: 'RELEASE_BLOCKING_OPERATIONAL',
    evidence: contract.source?.freshCaptureRequiredImmediatelyBeforePhysicalWork === true ? 'MP12 contract requires fresh capture immediately before physical work.' : 'Fresh-capture flag unexpectedly absent.',
    requirement: 'Before any physical mutation: complete current source capture, exact forward/rollback states, protected/core/entity checks, strict-noop preflights, journal, post snapshot, rollback poststate preflight, and independent route/egress QA.',
  },
];
const evidenceBase = {
  schemaVersion: 1,
  id: 'MP12-MP13-I01-GOVERNOR-DELEGATED-READINESS-01', generatedAtUtc: GENERATED_AT,
  status: 'GOVERNOR_DELEGATED_ROLES_ASSIGNED_PHYSICAL_RELEASE_NOT_READY',
  mode: 'OFFLINE_SOURCE_BOUND_ANALYSIS_NO_WORLD_OPERATION', mutationAuthority: false,
  governorDirective: '2026-08-26: named scope-owner/counterpart/design-signature roles are internal accountable build roles; no external signer is awaited.',
  source: {
    mp12Contract: { path: rel(MP12_CONTRACT), sha256: sha256(fs.readFileSync(abs(MP12_CONTRACT))) },
    survey: { path: rel(surveyFile), sha256: sha256(surveyBytes) },
    signatureTemplate: { path: rel(SIGNATURE_TEMPLATE), sha256: sha256(fs.readFileSync(abs(SIGNATURE_TEMPLATE))) },
    captureManifestSha256: template.source.captureManifestSha256,
    regionSha256: template.source.regionSha256,
    regionFileCount: template.source.regionFileCount,
  },
  exactScope: { routeAndFacadeCellCount: 387, directionalFaceCount: 206, protectedFacadeCellCount: 75, coordinateSetSha256: template.exactSets.routeAndFacadeCoordinateSetSha256, directionalFaceSetSha256: template.exactSets.directionalFaceSetSha256 },
  delegatedRoles: owners,
  assignedCells: {
    total: signature.cellAssignments.length,
    mp12District: signature.cellAssignments.filter((cell) => cell.ownerRole === 'mp12District').length,
    mp13Venue: signature.cellAssignments.filter((cell) => cell.ownerRole === 'mp13Venue').length,
    protectedFacadeX0: signature.cellAssignments.filter((cell) => cell.kinds.includes('PROTECTED_GATEHEAD_FACADE')).length,
  },
  assignedFaces: { total: signature.directionalFaceAcceptances.length, mp12District: signature.directionalFaceAcceptances.filter((face) => face.acceptingOwnerRole === 'mp12District').length, mp13Venue: signature.directionalFaceAcceptances.filter((face) => face.acceptingOwnerRole === 'mp13Venue').length },
  establishedReturn: { sourceStatus: 'NORMAL_WALK_BOTH_DIRECTIONS_SOURCE_TRACE_ONLY', pathStationCount: forwardPath.length, forwardPathSha256, reversePathSha256, anchors: { gatehead: gateheadToEast.from, venueReceiver: eastToBowl.to } },
  residuals,
  nonClaims: [
    'No physical release package is emitted because the exact source does not establish release-ready public geometry, two independent exterior egresses, or full public/staff separation.',
    'I05/I06 are not used as public egress and are not a dependency of this finite I01 packet.',
    'No RCON call, operation, rollback, release manifest, public opening, venue commissioning, or world mutation is authorized.',
  ],
};
const evidence = { ...evidenceBase, evidenceIdentitySha256: sha256(`${JSON.stringify(evidenceBase, null, 2)}\n`) };
writeJson(path.join(OUT_DIR, 'mp12-mp13-i01-governor-delegated-signature-01.json'), signature);
writeJson(path.join(OUT_DIR, 'mp12-mp13-i01-governor-delegated-readiness-01.json'), evidence);
const markdown = `# MP12 / MP13 I01 Governor-delegated readiness 01\n\nStatus: **roles assigned; physical release not ready**. This eliminates the old\nexternal-signature wait for the finite I01 seam only. All four accountable\nroles are internal Governor-delegated build roles, and all **387** exact\nsupport/feet/head/façade cells plus **206** directed faces are assigned. The\nprotected **75-cell** Gatehead façade remains District-owned \`X0\`, never a\ntarget or route-envelope cell.\n\nThe source retains a bidirectional normal-walk witness from Gatehead\n\`(-338,68,-484)\` to the venue receiver \`(-284,68,-501)\` (${forwardPath.length}\nstations). It is not a public-opening proof: the Gatehead leg has\n${gateheadToEast.crossSection.publicFiveByFiveFailures} public-envelope and\n${gateheadToEast.crossSection.zeroLocalLightStations} light failures; the bowl\nleg has ${eastToBowl.crossSection.publicFiveByFiveFailures} and\n${eastToBowl.crossSection.zeroLocalLightStations} respectively. The source also\nreports no normal-walk continuation from bowl receiver to venue main and no\nnormal-walk route from main to upper/exterior, so it cannot prove two distinct\nexterior egresses.\n\nNo I05/I06 work is a prerequisite here. The remaining work is an exact fresh\nsource-bound public-envelope/lighting package, two independently surveyed\nexterior egress routes, a finite public/staff separation proof, and the normal\nguarded-release kernel.\n`;
fs.writeFileSync(abs(path.join(OUT_DIR, 'MP12-MP13-I01-GOVERNOR-DELEGATED-READINESS-01.md')), markdown);
process.stdout.write(`${evidence.status}: ${rel(path.join(OUT_DIR, 'mp12-mp13-i01-governor-delegated-readiness-01.json'))}\n`);
