#!/usr/bin/env node
/**
 * MP12 / MP13 Gatehead-to-Venue acceptance-signature gate.
 *
 * This is a deliberately narrow I01 design-input validator.  It captures the
 * existing Gatehead -> East Arrival -> bowl threshold and the protected
 * Gatehead facade as finite source-bound cells/faces.  It does not import the
 * unrelated MP13 lower-lobby/staff-tower ledger: those are separate I05/I06
 * decisions and must not become a false prerequisite for this surface seam.
 *
 * The program is read-only.  It emits neither operations nor a release
 * manifest and never connects to Minecraft or RCON.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const abs = (file) => path.resolve(ROOT, file);
const rel = (file) => path.relative(ROOT, abs(file)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const isHash = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const named = (value) => typeof value === 'string' && value.trim().length >= 3
  && !/^(ASSIGN|COPY|TBD|TODO|UNKNOWN|UNASSIGNED|OWNER_|PLACEHOLDER|NONE$)/i.test(value.trim());
const pointKey = (point) => point.join(',');
const pointEqual = (left, right) => Array.isArray(left) && Array.isArray(right) && left.length === 3
  && left.every((value, index) => Number.isInteger(value) && value === right[index]);
const comparePoint = (left, right) => left[0] - right[0] || left[1] - right[1] || left[2] - right[2];
const coordinateHash = (prefix, points) => sha256(`${prefix}\n${[...points].sort(comparePoint).map((point) => `${point.join(',')}\n`).join('')}`);
const capped = (errors, message) => { if (errors.length < 60) errors.push(message); };

const MP12_CONTRACT = option('--mp12-contract', 'data/world-review/mp12-gatehead-district-venue-interface-contract-01-sys03-post-20260826T153256Z/mp12-gatehead-district-venue-interface-acceptance-contract-01.json');
const MP13_CONTRACT = option('--mp13-contract', 'data/world-review/mp13-egress-access-contract-03-sys03-post-20260826T153100Z/mp13-egress-access-contract-03.json');
const SIGNATURE = option('--signature', 'docs/masterplans/12-westlight-district/MP12-MP13-GATEHEAD-VENUE-ACCEPTANCE-SIGNATURE-01.template.json');
const OUT = option('--out', 'data/world-review/mp12-mp13-gatehead-venue-acceptance-signature-01-sys03-post-20260826T153100Z/mp12-mp13-gatehead-venue-acceptance-decision-01.json');
const TEMPLATE_OUT = option('--template-out', null);
const MAP_OUT = option('--map-out', null);
const GENERATED_AT = option('--generated-at', new Date().toISOString());
const ROLES = ['mp12District', 'mp13Venue', 'approachRoad', 'townExpansionWestlightRoad'];
const PUBLIC_CLASSES = new Set(['P0', 'P1', 'X0']);

const readBytes = (file) => fs.readFileSync(abs(file));
const readJson = (file) => JSON.parse(readBytes(file));
const mp12Bytes = readBytes(MP12_CONTRACT);
const mp13Bytes = readBytes(MP13_CONTRACT);
const mp12 = JSON.parse(mp12Bytes);
const mp13 = JSON.parse(mp13Bytes);
const errors = [];

if (!object(mp12) || mp12.id !== 'MP12-GATEHEAD-DISTRICT-VENUE-INTERFACE-ACCEPTANCE-CONTRACT-01'
  || mp12.nonAuthorities?.mutationAuthority !== false || mp12.nonAuthorities?.worldEditsPerformed !== false) {
  capped(errors, 'MP12 governing contract is malformed or unexpectedly authorizing');
}
if (!object(mp13) || mp13.id !== 'MP13-WESTLIGHT-EGRESS-ACCESS-CONTRACT-03'
  || mp13.status !== 'PROPOSED_SOURCE_BOUND_CONTRACT_NOT_ACCEPTED_NOT_RELEASE_AUTHORITY'
  || mp13.worldMutationPerformed !== false) {
  capped(errors, 'MP13 governing contract is malformed or unexpectedly authorizing');
}
const sourceRoot = mp12.source?.snapshotRoot;
const regionRoot = sourceRoot ? path.join(abs(sourceRoot), 'region') : null;
if (!sourceRoot || !regionRoot || !fs.existsSync(regionRoot)) capped(errors, 'MP12 source snapshot region directory is absent');
if (mp12.source?.regionIdentity?.sha256 !== mp13.sourceSnapshot?.sha256
  || mp12.source?.regionIdentity?.regionFileCount !== mp13.sourceSnapshot?.regionFileCount) {
  capped(errors, 'MP12 and MP13 contracts do not bind the same immutable region source');
}

const surveyRef = mp12.source?.revalidationEvidence?.wholeInterfaceSurvey;
const surveyPath = surveyRef ? path.join(path.dirname(abs(MP12_CONTRACT)), surveyRef.path) : null;
let survey = null;
if (!surveyPath || !fs.existsSync(surveyPath)) capped(errors, 'MP12 whole-interface survey is absent');
else {
  const bytes = fs.readFileSync(surveyPath);
  if (sha256(bytes) !== surveyRef.sha256) capped(errors, 'MP12 whole-interface survey bytes drifted from its contract hash');
  else survey = JSON.parse(bytes);
}
const routeById = new Map((survey?.routes ?? []).map((route) => [route.id, route]));
const routeIds = ['gatehead-to-east-arrival', 'east-arrival-to-bowl'];
const routes = routeIds.map((id) => routeById.get(id));
for (const route of routes) {
  if (!route || route.status !== 'NORMAL_WALK_PATH_SURVEYED_NOT_ACCEPTED' || !Array.isArray(route.path) || route.path.length < 2) {
    capped(errors, 'required Gatehead/Venue route is absent or no longer an unaccepted exact normal-walk trace');
  }
}

const rawFacade = mp12.currentRetainedFacts?.protectedNorthGateheadFacade;
const facadePoints = [];
if (!rawFacade || rawFacade.cellCount !== 75) capped(errors, 'MP12 protected Gatehead facade is missing its exact 75-cell retained record');
else {
  const bounds = rawFacade.bounds;
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) for (let y = bounds.minY; y <= bounds.maxY; y += 1) facadePoints.push([x, y, bounds.z]);
}

const reader = regionRoot && fs.existsSync(regionRoot) ? new AnvilReader(regionRoot) : null;
const cellMap = new Map();
const addCell = async (point, kind, routeId = null, station = null) => {
  const key = pointKey(point);
  const existing = cellMap.get(key);
  if (existing) { existing.kinds.add(kind); if (routeId) existing.references.push({ routeId, station }); return; }
  const sourceState = reader ? stateToCommandString(await reader.blockState(...point)) : null;
  cellMap.set(key, { point, sourceState, kinds: new Set([kind]), references: routeId ? [{ routeId, station }] : [] });
};
for (const route of routes) if (route?.path) {
  for (let station = 0; station < route.path.length; station += 1) {
    const [x, y, z] = route.path[station];
    await addCell([x, y - 1, z], 'ROUTE_SUPPORT', route.id, station);
    await addCell([x, y, z], 'ROUTE_FEET', route.id, station);
    await addCell([x, y + 1, z], 'ROUTE_HEAD', route.id, station);
  }
}
for (const point of facadePoints) await addCell(point, 'PROTECTED_GATEHEAD_FACADE');
const expectedCells = [...cellMap.values()].map((cell) => ({
  point: cell.point, sourceState: cell.sourceState, kinds: [...cell.kinds].sort(), references: cell.references,
})).sort((left, right) => comparePoint(left.point, right.point));
const expectedCellHash = coordinateHash('mp12-mp13-i01-exact-cells-01', expectedCells.map(({ point }) => point));
const faces = [];
for (const route of routes) if (route?.path) for (let index = 1; index < route.path.length; index += 1) {
  const from = route.path[index - 1]; const to = route.path[index];
  faces.push({ id: `${route.id}:${String(index - 1).padStart(3, '0')}:FORWARD`, routeId: route.id, from, to, direction: 'FORWARD' });
  faces.push({ id: `${route.id}:${String(index - 1).padStart(3, '0')}:REVERSE`, routeId: route.id, from: to, to: from, direction: 'REVERSE' });
}
const expectedFaceHash = sha256(`mp12-mp13-i01-directional-faces-01\n${faces.map((face) => `${face.id}|${face.from.join(',')}|${face.to.join(',')}\n`).join('')}`);

const template = {
  schemaVersion: 1,
  id: 'MP12-MP13-GATEHEAD-VENUE-ACCEPTANCE-SIGNATURE-01',
  purpose: 'Fill only after independent cross-scope review. U0/unassigned values intentionally fail closed.',
  mp12ContractSha256: sha256(mp12Bytes), mp13ContractSha256: sha256(mp13Bytes),
  source: { captureManifestSha256: mp12.source?.completeSaveCapture?.sha256, regionSha256: mp12.source?.regionIdentity?.sha256, regionFileCount: mp12.source?.regionIdentity?.regionFileCount, interfaceSurveySha256: surveyRef?.sha256 },
  exactSets: { routeAndFacadeCellCount: expectedCells.length, routeAndFacadeCoordinateSetSha256: expectedCellHash, directionalFaceCount: faces.length, directionalFaceSetSha256: expectedFaceHash, protectedFacadeCellCount: facadePoints.length, protectedFacadeCoordinateSetSha256: coordinateHash('mp12-mp13-protected-facade-01', facadePoints) },
  namedOwners: Object.fromEntries(ROLES.map((role) => [role, `ASSIGN_${role.toUpperCase()}_OWNER`])),
  participantApprovals: Object.fromEntries(ROLES.map((role) => [role, { owner: `ASSIGN_${role.toUpperCase()}_OWNER`, accepted: false, scope: 'INTERFACE_REVIEW_NO_MUTATION' }])),
  cellAssignments: expectedCells.map((cell) => ({ ...cell, ownerRole: 'UNASSIGNED', accessClass: 'U0', accepted: false })),
  directionalFaceAcceptances: faces.map((face) => ({ ...face, fromOwnerRole: 'UNASSIGNED', toOwnerRole: 'UNASSIGNED', acceptingOwnerRole: 'UNASSIGNED', normalState: 'UNASSIGNED', failureState: 'DENY_AND_ABORT_ANY_PHYSICAL_PACKAGE', accepted: false })),
  protectedFacade: { ownerRole: 'mp12District', retainedAccessClass: 'X0', sourceStateCensus: rawFacade?.stateCensus ?? {}, noTargetOrInteractionCell: true, noRouteEnvelopeUse: true },
  publicReturnAndEgress: {
    districtToVenueReturn: { gateheadAnchor: [-338, 68, -484], venueReceiver: [-284, 68, -501], forwardPathSha256: 'ASSIGN_FORWARD_RETURN_PATH_SHA256', reversePathSha256: 'ASSIGN_REVERSE_RETURN_PATH_SHA256', normalWalkBothDirections: false },
    publicStaffSeparation: { i05OrI06UsedAsPublicEgress: false, publicCannotReachStaff: false, proofSha256: 'ASSIGN_PUBLIC_STAFF_SEPARATION_PROOF_SHA256' },
    independentPublicEgresses: [
      { id: 'ASSIGN_EXIT_A', routeSha256: 'ASSIGN_EXIT_A_ROUTE_SHA256', reachesIndependentExteriorReceiver: false, usesWestServiceTower: false },
      { id: 'ASSIGN_EXIT_B', routeSha256: 'ASSIGN_EXIT_B_ROUTE_SHA256', reachesIndependentExteriorReceiver: false, usesWestServiceTower: false },
    ],
  },
};
if (TEMPLATE_OUT) {
  const output = abs(TEMPLATE_OUT);
  if (fs.existsSync(output)) throw new Error(`template output already exists: ${rel(output)}`);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(template, null, 2)}\n`);
}
if (MAP_OUT) {
  const output = abs(MAP_OUT);
  if (fs.existsSync(output)) throw new Error(`map output already exists: ${rel(output)}`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="560" viewBox="0 0 960 560"><style>.b{fill:#101827}.t{fill:#f8fafc;font:600 18px system-ui}.s{fill:#cbd5e1;font:13px system-ui}.g{stroke:#64748b;stroke-width:1}.p{fill:none;stroke:#fbbf24;stroke-width:8;stroke-linejoin:round;stroke-linecap:round}.v{fill:none;stroke:#38bdf8;stroke-width:8;stroke-linejoin:round;stroke-linecap:round}.f{fill:#ef4444;opacity:.8}</style><rect class="b" width="960" height="560"/><text class="t" x="36" y="38">MP12 ↔ MP13 I01 exact acceptance boundary (source-bound, default deny)</text><text class="s" x="36" y="64">Gold: existing Gatehead → East Arrival trace · Blue: East Arrival → bowl receiver trace · Red: retained façade</text><line class="g" x1="70" y1="490" x2="900" y2="490"/><line class="g" x1="70" y1="110" x2="70" y2="490"/><polyline class="p" points="120,180 150,180 150,310 510,310 510,250"/><polyline class="v" points="510,250 380,250 380,380 510,380 510,410"/><rect class="f" x="120" y="292" width="360" height="12"/><text class="s" x="115" y="165">Gatehead (-338,68,-484)</text><text class="s" x="518" y="242">East Arrival (-284,68,-494)</text><text class="s" x="518" y="427">Venue receiver (-284,68,-501)</text><text class="s" x="120" y="330">75-cell protected Gatehead façade — X0 retained; never a target or route-envelope cell</text><text class="s" x="36" y="530">${expectedCells.length} exact support/feet/head/facade cells · ${faces.length} directed trace faces · no operations or release authority</text></svg>`;
  fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, `${svg}\n`);
}

let signatureBytes = null; let signature = null;
const signatureFile = abs(SIGNATURE);
if (!fs.existsSync(signatureFile)) capped(errors, `signature file is absent: ${rel(signatureFile)}`);
else {
  signatureBytes = fs.readFileSync(signatureFile);
  try { signature = JSON.parse(signatureBytes); } catch { capped(errors, 'signature file is not valid JSON'); }
}
if (signature) {
  if (signature.schemaVersion !== 1 || signature.id !== template.id) capped(errors, 'wrong signature schema or identifier');
  if (signature.mp12ContractSha256 !== template.mp12ContractSha256 || signature.mp13ContractSha256 !== template.mp13ContractSha256) capped(errors, 'signature does not bind exact MP12 and MP13 governing-contract bytes');
  for (const field of ['captureManifestSha256', 'regionSha256', 'regionFileCount', 'interfaceSurveySha256']) if (signature.source?.[field] !== template.source[field]) capped(errors, `signature source.${field} differs from the immutable source binding`);
  for (const field of ['routeAndFacadeCellCount', 'routeAndFacadeCoordinateSetSha256', 'directionalFaceCount', 'directionalFaceSetSha256', 'protectedFacadeCellCount', 'protectedFacadeCoordinateSetSha256']) if (signature.exactSets?.[field] !== template.exactSets[field]) capped(errors, `signature exactSets.${field} differs from the derived finite boundary`);
  const owners = signature.namedOwners;
  if (!object(owners) || Object.keys(owners).sort().join('|') !== ROLES.slice().sort().join('|')) capped(errors, 'signature must name all and only district, venue, approach-road, and Town-Westlight-road owner roles');
  else {
    for (const role of ROLES) if (!named(owners[role])) capped(errors, `owner ${role} is missing or a placeholder`);
    if (new Set(ROLES.map((role) => owners[role])).size !== ROLES.length) capped(errors, 'all four owner roles must be distinct named participants');
  }
  const approvals = signature.participantApprovals;
  if (!object(approvals) || Object.keys(approvals).sort().join('|') !== ROLES.slice().sort().join('|')) capped(errors, 'all four owner roles need an explicit participation approval');
  else for (const role of ROLES) if (approvals[role]?.owner !== owners?.[role] || approvals[role]?.accepted !== true || approvals[role]?.scope !== 'INTERFACE_REVIEW_NO_MUTATION') capped(errors, `${role} participation approval is incomplete or attempts to expand authority`);
  const expectedByKey = new Map(expectedCells.map((cell) => [pointKey(cell.point), cell]));
  const assignments = signature.cellAssignments;
  if (!Array.isArray(assignments) || assignments.length !== expectedCells.length) capped(errors, `signature must supply one accepted exact assignment for all ${expectedCells.length} boundary cells`);
  else {
    const actual = new Map();
    for (const item of assignments) {
      const key = pointKey(item?.point ?? []); const expected = expectedByKey.get(key);
      if (!expected || actual.has(key)) { capped(errors, 'cell assignments contain an unknown or duplicate point'); continue; }
      actual.set(key, item);
      if (item.sourceState !== expected.sourceState) capped(errors, `cell assignment ${key} source state differs from source-bound inventory`);
      if (!ROLES.includes(item.ownerRole) || !named(owners?.[item.ownerRole]) || item.accepted !== true) capped(errors, `cell assignment ${key} lacks an accepted named owner role`);
      const isFacade = expected.kinds.includes('PROTECTED_GATEHEAD_FACADE');
      const allowed = isFacade ? new Set(['X0']) : PUBLIC_CLASSES;
      if (!allowed.has(item.accessClass)) capped(errors, `cell assignment ${key} has an invalid access class for its exact boundary role`);
      if (isFacade && (item.ownerRole !== 'mp12District' || item.accessClass !== 'X0')) capped(errors, `protected facade cell ${key} must remain MP12-owned X0 retained fabric`);
    }
    if (actual.size !== expectedCells.length) capped(errors, 'not every exact derived boundary cell is assigned exactly once');
  }
  const expectedFaceById = new Map(faces.map((face) => [face.id, face]));
  const acceptedFaces = signature.directionalFaceAcceptances;
  if (!Array.isArray(acceptedFaces) || acceptedFaces.length !== faces.length) capped(errors, `signature must accept all ${faces.length} exact directional faces`);
  else {
    const seen = new Set(); const assignmentsByKey = new Map((assignments ?? []).map((item) => [pointKey(item.point ?? []), item]));
    for (const face of acceptedFaces) {
      const expected = expectedFaceById.get(face?.id);
      if (!expected || seen.has(face.id)) { capped(errors, 'face acceptance contains an unknown or duplicate directional face'); continue; }
      seen.add(face.id);
      if (!pointEqual(face.from, expected.from) || !pointEqual(face.to, expected.to) || face.direction !== expected.direction) capped(errors, `directional face ${face.id} does not match the source trace`);
      if (face.fromOwnerRole !== assignmentsByKey.get(pointKey(expected.from))?.ownerRole || face.toOwnerRole !== assignmentsByKey.get(pointKey(expected.to))?.ownerRole || !ROLES.includes(face.acceptingOwnerRole) || !named(owners?.[face.acceptingOwnerRole]) || !named(face.normalState) || !named(face.failureState) || face.accepted !== true) capped(errors, `directional face ${face.id} lacks exact owners and normal/failure acceptance`);
    }
    if (seen.size !== faces.length) capped(errors, 'not every directional source face is accepted exactly once');
  }
  const facade = signature.protectedFacade;
  if (!object(facade) || facade.ownerRole !== 'mp12District' || facade.retainedAccessClass !== 'X0' || facade.noTargetOrInteractionCell !== true || facade.noRouteEnvelopeUse !== true || JSON.stringify(facade.sourceStateCensus) !== JSON.stringify(rawFacade?.stateCensus)) capped(errors, 'the protected Gatehead facade must retain its exact X0/no-target/no-route status and source census');
  const assurance = signature.publicReturnAndEgress;
  const returns = assurance?.districtToVenueReturn;
  if (!object(returns) || !pointEqual(returns.gateheadAnchor, [-338, 68, -484]) || !pointEqual(returns.venueReceiver, [-284, 68, -501]) || !isHash(returns.forwardPathSha256) || !isHash(returns.reversePathSha256) || returns.normalWalkBothDirections !== true) capped(errors, 'district-to-venue return needs both exact anchors, both path hashes, and bidirectional normal-walk proof');
  const separation = assurance?.publicStaffSeparation;
  if (!object(separation) || separation.i05OrI06UsedAsPublicEgress !== false || separation.publicCannotReachStaff !== true || !isHash(separation.proofSha256)) capped(errors, 'public/staff separation must reject I05/I06 as public egress and bind an exact proof');
  const exits = assurance?.independentPublicEgresses;
  if (!Array.isArray(exits) || exits.length !== 2 || exits[0]?.id === exits[1]?.id || exits.some((exit) => !named(exit?.id) || !isHash(exit?.routeSha256) || exit?.reachesIndependentExteriorReceiver !== true || exit?.usesWestServiceTower !== false)) capped(errors, 'exactly two distinct independent public egress records are required; neither may use the west service tower');
}

const accepted = errors.length === 0;
const decisionBase = {
  schemaVersion: 1, id: 'MP12-MP13-GATEHEAD-VENUE-ACCEPTANCE-DECISION-01', generatedAtUtc: GENERATED_AT,
  status: accepted ? 'ACCEPTED_DESIGN_INPUT_NOT_RELEASE_AUTHORITY' : 'REJECTED_DESIGN_INPUT_DEFAULT_DENY',
  mode: 'READ_ONLY_VALIDATION_NO_WORLD_OPERATION', mutationAuthority: false,
  safetyBoundary: { liveCallsPerformed: false, rconCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false },
  governingContracts: [{ path: rel(MP12_CONTRACT), sha256: sha256(mp12Bytes), id: mp12.id }, { path: rel(MP13_CONTRACT), sha256: sha256(mp13Bytes), id: mp13.id }],
  sourceBoundary: template.source, exactSets: template.exactSets,
  suppliedSignature: signatureBytes ? { path: rel(SIGNATURE), sha256: sha256(signatureBytes) } : null,
  acceptance: accepted ? { kind: 'MP12_MP13_I01_INTERFACE_DESIGN_INPUT_ONLY', nextStep: 'A separate fresh-source physical compiler may evaluate this accepted design input only after the scoped guarded-release kernel and independent post-route/egress QA. This decision creates no operation, route opening, or public/event authority.' } : null,
  rejectionReasons: accepted ? [] : errors,
  nonClaims: ['No operation, rollback operation, release manifest, RCON call, or world mutation is emitted.', 'This gate neither assigns real-world ownership nor commissions the public route, venue egress, staff route, road, or Town Expansion work.', 'I05/I06 lower-lobby and west-service-tower work remains separate and is not a prerequisite for this finite I01 threshold signature.'],
};
const decision = { ...decisionBase, decisionIdentitySha256: sha256(`${JSON.stringify(decisionBase, null, 2)}\n`) };
fs.mkdirSync(path.dirname(abs(OUT)), { recursive: true }); fs.writeFileSync(abs(OUT), `${JSON.stringify(decision, null, 2)}\n`);
process.stdout.write(`${decision.status}: ${rel(OUT)}\n`);
