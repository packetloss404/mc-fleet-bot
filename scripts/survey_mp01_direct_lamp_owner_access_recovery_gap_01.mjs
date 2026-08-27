#!/usr/bin/env node
/**
 * Read-only owner-bound access/recovery finding for the MP01 direct-lamp
 * candidate. It binds the immutable local topology and the current marker/
 * route catalog, but does not move a bot or change any world/catalog state.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback = null) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const required = (flag) => { const value = option(flag); if (!value) throw new Error(`Usage: ${path.basename(process.argv[1])} --snapshot <immutable save> --candidate <json> --topology <json> --boundary <json> --readiness <json> --markers <json> --routes <json> --out <json> --markdown <md> --map <svg>`); return value; };
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`MP01 direct-lamp owner access/recovery gap rejected: ${message}`); };
const same = (a, b) => a.x === b.x && a.y === b.y && a.z === b.z;

const snapshot = required('--snapshot');
const candidatePath = required('--candidate');
const topologyPath = required('--topology');
const boundaryPath = required('--boundary');
const readinessPath = required('--readiness');
const markersPath = required('--markers');
const routesPath = required('--routes');
const out = required('--out');
const markdown = required('--markdown');
const map = required('--map');
const generatedAtUtc = option('--generated-at', new Date().toISOString());
const snapshotRoot = absolute(snapshot);
const capturePath = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
fail(fs.existsSync(capturePath), 'snapshot lacks complete-save capture');
const captureBytes = fs.readFileSync(capturePath);
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && capture.requiredMembers?.length === 130, 'source is not immutable complete 130-member capture');
for (const member of capture.requiredMembers) {
  const filename = path.join(snapshotRoot, member.path);
  fail(fs.existsSync(filename), `captured member missing: ${member.path}`);
  const bytes = fs.readFileSync(filename);
  fail(bytes.length === member.bytes && sha256(bytes) === member.sha256, `captured member drift: ${member.path}`);
}
const captureSha = sha256(captureBytes);
const readInput = (name, filename, id) => {
  const bytes = fs.readFileSync(absolute(filename)); const record = JSON.parse(bytes);
  fail(record.id === id, `${name} identity mismatch`);
  fail(record.source?.snapshot === relative(snapshot), `${name} snapshot drift`);
  fail(record.source?.captureManifestSha256 === captureSha, `${name} capture drift`);
  return { bytes, record };
};
const candidateInput = readInput('candidate', candidatePath, 'MP01-ISOLATED-DIRECT-LAMP-CALIBRATION-CANDIDATE-01');
const topologyInput = readInput('topology', topologyPath, 'MP01-DIRECT-LAMP-ACCESS-RETURN-TOPOLOGY-01');
const boundaryInput = readInput('boundary', boundaryPath, 'MP01-DIRECT-LAMP-EAST-SEQUENTIAL-RESTRICTED-BOUNDARY-DESIGN-01');
const readinessInput = readInput('readiness', readinessPath, 'MP01-ISOLATED-DIRECT-LAMP-READINESS-INTERACTION-CONTRACT-01');
const candidate = candidateInput.record; const topology = topologyInput.record; const boundary = boundaryInput.record; const readiness = readinessInput.record;
fail(topology.status === 'REJECTED_NO_CURRENT_SOURCE_BOUND_BIDIRECTIONAL_ACCESS_RETURN_CONTRACT', 'topology does not report access rejection');
fail(topology.ownerBoundContractDisposition?.exactRouteStationsAccepted === 0, 'topology has accepted route stations');
fail(topology.normalWalkTopology?.connectedStagingComponent?.cellCount === 143, 'staging component drift');
fail(boundary.restrictedTwoWayTraversalDesign?.fullOriginOrRecoveryRouteAccepted === false, 'boundary claims accepted full route');
fail(readiness.accessAndReturnRequired?.status === 'MISSING', 'readiness no longer reports missing access/return');

const markerBytes = fs.readFileSync(absolute(markersPath));
const routeBytes = fs.readFileSync(absolute(routesPath));
const markers = JSON.parse(markerBytes); const routes = JSON.parse(routeBytes);
fail(Array.isArray(markers) && Array.isArray(routes), 'catalog files must be arrays');
const stagingFeet = candidate.interactionGeometryOnly?.existingAllowedStagingFeet;
fail(Array.isArray(stagingFeet) && stagingFeet.length === 3, 'candidate staging feet drift');
const componentBounds = topology.normalWalkTopology.connectedStagingComponent.bounds;
const inComponent = (position) => position && position.x >= componentBounds.minX && position.x <= componentBounds.maxX && position.y >= componentBounds.minY && position.y <= componentBounds.maxY && position.z >= componentBounds.minZ && position.z <= componentBounds.maxZ;
const stagingMarkers = markers.filter((marker) => stagingFeet.some((feet) => same(marker.position, feet)));
const componentMarkers = markers.filter((marker) => inComponent(marker.position));
const byMarkerId = new Map(markers.map((marker) => [marker.id, marker]));
const componentRoutes = routes.filter((route) => route.waypointIds.some((id) => inComponent(byMarkerId.get(id)?.position)));
const endpointRoutes = routes.filter((route) => [route.waypointIds[0], route.waypointIds.at(-1)].some((id) => inComponent(byMarkerId.get(id)?.position)));
const distance = (position) => Math.hypot(position.x - 2002, position.y - 165, position.z + 899);
const nearestMarker = markers.map((marker) => ({ id: marker.id, name: marker.name, position: marker.position, distance: Number(distance(marker.position).toFixed(3)) })).sort((a, b) => a.distance - b.distance)[0] ?? null;
const closedExits = [
  { id: 'NORTH_ROOM_CLOSURE', cells: [{ x: 2000, y: 166, z: -906 }, { x: 2000, y: 167, z: -906 }], currentState: 'closed unpowered manual iron door', routeEffect: 'blocks local north room threshold' },
  { id: 'EAST_WEST_LEAF', cells: [{ x: 2006, y: 166, z: -894 }, { x: 2006, y: 167, z: -894 }], currentState: 'closed unpowered manual iron door', routeEffect: 'first east sequential threshold' },
  { id: 'EAST_EAST_LEAF', cells: [{ x: 2008, y: 166, z: -894 }, { x: 2008, y: 167, z: -894 }], currentState: 'closed unpowered manual iron door', routeEffect: 'second east sequential threshold' },
];
const finding = {
  schemaVersion: 1,
  id: 'MP01-DIRECT-LAMP-OWNER-BOUND-ACCESS-RECOVERY-GAP-01',
  status: 'REJECTED_NO_CURRENT_OWNER_BOUND_OUTBOUND_OR_RECOVERY_ROUTE',
  generatedAtUtc,
  mutationAuthority: false,
  source: {
    snapshot: relative(snapshot), captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc, captureManifestSha256: captureSha, requiredMemberCount: capture.requiredMembers.length,
    candidate: { path: relative(candidatePath), sha256: sha256(candidateInput.bytes), identity: candidate.payloadSha256 },
    topology: { path: relative(topologyPath), sha256: sha256(topologyInput.bytes), identity: topology.payloadSha256 },
    boundary: { path: relative(boundaryPath), sha256: sha256(boundaryInput.bytes), identity: boundary.payloadSha256 },
    readiness: { path: relative(readinessPath), sha256: sha256(readinessInput.bytes), identity: readiness.payloadSha256 },
    currentCatalog: { markers: { path: relative(markersPath), sha256: sha256(markerBytes), count: markers.length }, routes: { path: relative(routesPath), sha256: sha256(routeBytes), count: routes.length } },
  },
  exactLocalFinding: {
    stagingFeet, stagingComponent: topology.normalWalkTopology.connectedStagingComponent,
    acceptedOwnerAssignments: topology.ownerBoundContractDisposition.acceptedOwnerAssignments,
    acceptedRouteStations: topology.ownerBoundContractDisposition.exactRouteStationsAccepted,
    closedExits,
    accessConclusion: 'The 143-station staging component has no traversable source-valid outbound or recovery connection. The three observed exits are closed manual interfaces. Owner labels, catalog records, and geometric proximity cannot make them normal-walk stations.',
  },
  catalogFinding: {
    exactStagingMarkerCount: stagingMarkers.length, localComponentMarkerCount: componentMarkers.length, routesWithComponentWaypointCount: componentRoutes.length, routesWithComponentEndpointCount: endpointRoutes.length, nearestMarker,
    conclusion: 'The current catalog supplies no staging marker, component waypoint, component route endpoint, outbound checkpoint chain, or recovery anchor. It is catalog evidence only and does not substitute for an immutable per-station walk survey.',
  },
  protectedConstraints: {
    directLamp: { candidateEnvelopeCellCount: candidate.isolation.envelope.cellCount, fluidOrGravityHazardCount: candidate.isolation.halo.fluidOrGravityHazardCount, blockEntityCount: candidate.isolation.blockEntityCount, savedEntityCount: candidate.isolation.savedEntityCount },
    stagingTopology: { blockEntityCount: topology.normalWalkTopology.blockEntityCount, savedEntityCount: topology.normalWalkTopology.savedEntityCount },
    eastBoundary: { targetCellCount: boundary.scope.target.cellCount, interactionHalo: boundary.scope.interactionHalo, retainedReservoirWall: boundary.scope.retainedContainment.reservoirWall, boundaryIsNotAccessAcceptance: true },
    routeRules: ['Every future feet station needs solid non-hazard footing, two clear air cells, cardinal normal-walk transitions, and exact owner/interface evidence.', 'Closed doors, fluids, gravity, containers/block entities, protected cores, reservoir wall/water, legacy reactive line, and unsurveyed catalog geometry are fail-closed exclusions.', 'The existing east two-leaf concept may only be considered under its own four-cell guarded package and genuine-click validator; it currently grants no origin/recovery route.'],
  },
  candidateContractRequired: {
    id: 'MP01-DIRECT-LAMP-OWNER-BOUND-ACCESS-RECOVERY-02', status: 'NO_ROUTE_CANDIDATE_CAN_BE_SELECTED_FROM_CURRENT_EVIDENCE',
    owners: ['MP01_EXTERNAL_ACCESS_ORIGIN_OWNER', 'MP01_ACCESS_TRANSIT_OWNER', 'MP01_DIRECT_LAMP_CALIBRATION_OWNER', 'MP01_ACCESS_RECOVERY_OWNER', 'MP01_STAGING_CALIBRATION_OWNER', 'MP01_SERVICE_CORRIDOR_COUNTERPART_OWNER if the east boundary is separately accepted'],
    exactEvidenceRequired: ['a fresh complete immutable source for every route station and interface', 'named permitted origin, one exact staging foot, and a distinct recovery anchor', 'complete outbound and return station arrays with owner/interface ID at every station', 'fresh source state and protected/fluid/gravity/container census for all route and boundary interaction cells', 'separate gated-boundary trace if either east leaf is used', 'fresh live entity/checkpoint gates before any supervised movement'],
    noCandidateReason: 'No current catalog route reaches the staging component and no source-valid exit leaves it; selecting exterior/origin coordinates would fabricate unsurveyed route geometry.',
  },
  safetyBoundary: { readOnly: true, liveCallsPerformed: false, botMovementPerformed: false, interactionsPerformed: false, catalogMutationPerformed: false, worldEditsPerformed: false, operationFilesEmitted: false, releaseManifestEmitted: false },
  nonClaims: ['no access or recovery route accepted', 'no boundary traversal accepted', 'no marker, route, owner, or mobility area created', 'no interaction or world operation', 'no direct-lamp proof, control, egress, public/service opening, or MP01 completion'],
  payloadSha256: null,
};
finding.payloadSha256 = sha256(JSON.stringify(finding));
const mapSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="540" viewBox="0 0 1040 540"><style>text{font-family:Inter,Arial,sans-serif;fill:#e2e8f0}.title{font-size:24px;font-weight:800}.label{font-size:15px;font-weight:700}.note{font-size:13px;fill:#cbd5e1}</style><rect width="100%" height="100%" fill="#0b1020"/><text x="36" y="36" class="title">MP01 direct-lamp owner-bound access/recovery — current no-route finding</text><text x="36" y="61" class="note">Immutable staging topology + current marker/route catalog. No movement or operation authority.</text><rect x="125" y="126" width="460" height="245" rx="8" fill="#12263a" stroke="#38bdf8" stroke-width="3"/><text x="146" y="155" class="label">143-station staging component</text><circle cx="345" cy="240" r="22" fill="#f59e0b"/><text x="307" y="279" class="note">staging feet</text><rect x="310" y="285" width="70" height="28" fill="#f59e0b"/><text x="318" y="305" class="note">lever/lamp</text><rect x="330" y="102" width="60" height="24" fill="#ef4444"/><text x="407" y="120" class="note">north closed exit (2000,166..167,-906)</text><rect x="584" y="225" width="27" height="75" fill="#ef4444"/><text x="625" y="251" class="note">east west leaf</text><text x="625" y="271" class="note">(2006,166..167,-894)</text><rect x="670" y="225" width="27" height="75" fill="#ef4444"/><text x="711" y="251" class="note">east east leaf</text><text x="711" y="271" class="note">(2008,166..167,-894)</text><path d="M585 335 H695" stroke="#f8fafc" stroke-width="8"/><text x="720" y="340" class="note">retained reservoir wall / exclusion</text><rect x="70" y="418" width="900" height="86" rx="8" fill="#111827" stroke="#334155"/><text x="92" y="447" class="label">Exact current result: 0 owner assignments · 0 accepted route stations · 0 staging/component markers · 0 catalog routes reaching it</text><text x="92" y="474" class="note">Future evidence must bind a permitted origin, every outbound/return station, named owners/interfaces, distinct recovery anchor, dry/clear footing/headroom, and separately validated boundary traversal if needed.</text></svg>`;
const md = `# MP01 direct-lamp owner-bound access/recovery gap 01\n\n`
  + `**Status:** \`${finding.status}\` — read-only no-route finding; no movement, interaction, catalog change, world operation, or release authority.\n\n`
  + `![Access/recovery gap map](${path.basename(map)})\n\n`
  + `## Exact current finding\n\n`
  + `The three staging feet sit in a finite \`143\`-station component. It has \`0\` accepted owner assignments and \`0\` accepted route stations. Its three observed exits are closed manual iron-door interfaces: north \`(2000,166..167,-906)\`, then the east sequential leaves \`(2006,166..167,-894)\` and \`(2008,166..167,-894)\`. None is a current normal-walk station.\n\n`
  + `The current catalog contains \`${markers.length}\` markers and \`${routes.length}\` routes, but \`${stagingMarkers.length}\` staging markers, \`${componentMarkers.length}\` component markers, and \`${componentRoutes.length}\` component routes. It therefore contains no origin/checkpoint/recovery chain. The east two-leaf package is a separate unbuilt boundary design; it is not access acceptance.\n\n`
  + `## Required successor\n\n`
  + `No route candidate can be selected without inventing exterior geometry. A future \`MP01-DIRECT-LAMP-OWNER-BOUND-ACCESS-RECOVERY-02\` must bind fresh immutable source, all outbound/return feet stations, owners/interfaces, permitted origin, one staging foot, distinct recovery anchor, and the exact dry/clear/protected/container/fluid/gravity state at every affected station. It must separately prove the gated boundary if used.\n`;
for (const filename of [out, markdown, map]) fs.mkdirSync(path.dirname(absolute(filename)), { recursive: true });
fs.writeFileSync(absolute(out), `${JSON.stringify(finding, null, 2)}\n`);
fs.writeFileSync(absolute(markdown), md);
fs.writeFileSync(absolute(map), mapSvg);
process.stdout.write(`${JSON.stringify({ status: finding.status, out: relative(out), markdown: relative(markdown), map: relative(map), payloadSha256: finding.payloadSha256 }, null, 2)}\n`);
