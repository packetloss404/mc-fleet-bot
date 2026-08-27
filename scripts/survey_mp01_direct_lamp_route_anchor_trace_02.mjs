#!/usr/bin/env node
/**
 * Read-only adaptive normal-walk trace for the proposed MP01 east sequential
 * boundary.  The two leaves are treated as temporarily passable solely to
 * learn whether a route/anchor survey can be bounded; no door state is
 * changed, no interaction is claimed, and an escape from the finite shell is
 * a fail-closed result rather than a route.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback = null) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const required = (flag) => { const value = option(flag); if (!value) throw new Error(`Usage: ${path.basename(process.argv[1])} --snapshot <immutable-save> --candidate <json> --boundary <json> --markers <json> --routes <json> --out <json> --markdown <md> --map <svg>`); return value; };
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`MP01 route-anchor trace rejected: ${message}`); };
const key = ({ x, y, z }) => `${x},${y},${z}`;
const compare = (a, b) => a.x - b.x || a.y - b.y || a.z - b.z;
const sort = (cells) => cells.slice().sort(compare);
const setHash = (cells) => sha256(`${sort(cells).map(key).join('\n')}\n`);
const stateName = (state) => state.split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const GRAVITY = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:scaffolding', 'minecraft:pointed_dripstone']);
const isAir = (state) => AIR.has(stateName(state));
const unsafe = (state) => state.includes('water') || state.includes('lava') || stateName(state) === 'minecraft:bubble_column'
  || GRAVITY.has(stateName(state)) || stateName(state).endsWith('_concrete_powder') || stateName(state).endsWith('_door') || stateName(state).endsWith('_trapdoor');
const directions = [[-1, 0, 'WEST'], [1, 0, 'EAST'], [0, -1, 'NORTH'], [0, 1, 'SOUTH']];
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

const snapshot = required('--snapshot');
const candidatePath = required('--candidate');
const boundaryPath = required('--boundary');
const markersPath = required('--markers');
const routesPath = required('--routes');
const out = required('--out');
const markdown = required('--markdown');
const map = required('--map');
const generatedAtUtc = option('--generated-at', new Date().toISOString());
const bounds = { minX: 1985, maxX: 2176, minY: 155, maxY: 190, minZ: -920, maxZ: -768 };
const inside = ({ x, y, z }) => x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY && z >= bounds.minZ && z <= bounds.maxZ;

const snapshotRoot = absolute(snapshot);
const capturePath = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
const regionDir = path.join(snapshotRoot, 'region');
fail(fs.existsSync(capturePath) && fs.existsSync(regionDir), 'complete immutable snapshot plane missing');
const captureBytes = fs.readFileSync(capturePath); const capture = JSON.parse(captureBytes); const captureSha = sha256(captureBytes);
fail(capture.immutableCopy === true && capture.requiredMembers?.length === 130, 'snapshot must be complete immutable 130-member capture');
for (const member of capture.requiredMembers) {
  const filename = path.join(snapshotRoot, member.path); const bytes = fs.existsSync(filename) ? fs.readFileSync(filename) : null;
  fail(bytes && bytes.length === member.bytes && sha256(bytes) === member.sha256, `capture member drift: ${member.path}`);
}
const readBound = (filename, id, label) => {
  const bytes = fs.readFileSync(absolute(filename)); const record = JSON.parse(bytes);
  fail(record.id === id, `${label} identity mismatch`);
  fail(record.source?.snapshot === relative(snapshot) && record.source?.captureManifestSha256 === captureSha, `${label} source binding drift`);
  return { bytes, record };
};
const candidateInput = readBound(candidatePath, 'MP01-ISOLATED-DIRECT-LAMP-CALIBRATION-CANDIDATE-01', 'candidate');
const boundaryInput = readBound(boundaryPath, 'MP01-DIRECT-LAMP-EAST-SEQUENTIAL-RESTRICTED-BOUNDARY-DESIGN-01', 'boundary');
const candidate = candidateInput.record; const boundary = boundaryInput.record;
const leaves = boundary.scope?.target?.cells?.map(({ cell }) => cell);
fail(Array.isArray(leaves) && leaves.length === 4 && boundary.mutationAuthority === false, 'expected four-cell no-authority east boundary');
const sourceStates = boundary.scope.target.cells.map(({ sourceState }) => sourceState);
fail(sourceStates.every((state) => state.startsWith('minecraft:iron_door[') && state.includes('open=false')), 'boundary source leaves must be closed iron doors');
const staging = candidate.interactionGeometryOnly?.existingAllowedStagingFeet;
fail(Array.isArray(staging) && staging.length === 3, 'candidate staging feet missing');
const markerBytes = fs.readFileSync(absolute(markersPath)); const routeBytes = fs.readFileSync(absolute(routesPath));
const markers = JSON.parse(markerBytes); const routes = JSON.parse(routeBytes);
fail(Array.isArray(markers) && Array.isArray(routes), 'marker/route catalogs must be arrays');

const reader = new AnvilReader(regionDir); const cache = new Map(); const override = new Set(leaves.map(key));
const stateAt = async (cell) => { const id = key(cell); if (override.has(id)) return 'minecraft:air'; if (!cache.has(id)) cache.set(id, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z))); return cache.get(id); };
const walkable = async (feet) => {
  if (!inside(feet)) return false;
  const [support, body, head] = await Promise.all([stateAt({ x: feet.x, y: feet.y - 1, z: feet.z }), stateAt(feet), stateAt({ x: feet.x, y: feet.y + 1, z: feet.z })]);
  return !isAir(support) && !unsafe(support) && isAir(body) && isAir(head);
};
for (const foot of staging) fail(await walkable(foot), `staging foot is not normal-walkable: ${key(foot)}`);
const queue = staging.slice(); const seen = new Map(queue.map((cell) => [key(cell), cell])); const parents = new Map(queue.map((cell) => [key(cell), null]));
let cursor = 0;
while (cursor < queue.length) {
  const current = queue[cursor++];
  for (const [dx, dz] of directions) for (const dy of [-1, 0, 1]) {
    const next = { x: current.x + dx, y: current.y + dy, z: current.z + dz }; const id = key(next);
    if (!seen.has(id) && await walkable(next)) { seen.set(id, next); parents.set(id, current); queue.push(next); }
  }
}
const component = sort([...seen.values()]);
const shellFaces = { WEST: [], EAST: [], NORTH: [], SOUTH: [], FLOOR: [], CEILING: [] };
for (const cell of component) {
  if (cell.x === bounds.minX) shellFaces.WEST.push(cell); if (cell.x === bounds.maxX) shellFaces.EAST.push(cell);
  if (cell.z === bounds.minZ) shellFaces.NORTH.push(cell); if (cell.z === bounds.maxZ) shellFaces.SOUTH.push(cell);
  if (cell.y === bounds.minY) shellFaces.FLOOR.push(cell); if (cell.y === bounds.maxY) shellFaces.CEILING.push(cell);
}
const observedEscapeFaces = Object.fromEntries(Object.entries(shellFaces).filter(([, cells]) => cells.length).map(([face, cells]) => [face, { cellCount: cells.length, coordinateSetSha256: setHash(cells), sampleCells: sort(cells).slice(0, 12) }]));
const componentBounds = { minX: Math.min(...component.map((c) => c.x)), maxX: Math.max(...component.map((c) => c.x)), minY: Math.min(...component.map((c) => c.y)), maxY: Math.max(...component.map((c) => c.y)), minZ: Math.min(...component.map((c) => c.z)), maxZ: Math.max(...component.map((c) => c.z)) };
const componentSet = new Set(component.map(key));
const positionInComponent = (p) => p && componentSet.has(key(p));
const stagingMarkerCount = markers.filter((m) => staging.some((p) => key(p) === key(m.position))).length;
const componentMarkers = markers.filter((m) => positionInComponent(m.position));
const markerById = new Map(markers.map((m) => [m.id, m]));
const componentRoutes = routes.filter((r) => (r.waypointIds ?? []).some((id) => positionInComponent(markerById.get(id)?.position)));
const serviceAnchor = { x: 2009, y: 166, z: -894 };
const toPath = (target) => {
  if (!componentSet.has(key(target))) return null;
  const result = []; let current = target;
  while (current) { result.push(current); current = parents.get(key(current)); }
  return result.reverse();
};
const localPath = toPath(serviceAnchor);
const status = Object.keys(observedEscapeFaces).length
  ? 'FAIL_CLOSED_ROUTE_COMPONENT_ESCAPES_ADAPTIVE_TRACE_SHELL'
  : 'NO_ROUTE_ANCHOR_IN_FINITE_COUNTERFACTUAL_COMPONENT';
const hardReason = Object.keys(observedEscapeFaces).length
  ? 'The counterfactual component reaches a finite trace shell. Its unexplored continuation cannot be converted into a route, origin, or recovery anchor without the next source-bound directional shell trace.'
  : 'The counterfactual component closes inside the trace and contains no catalog origin, recovery anchor, or accepted route stations.';
const report = {
  schemaVersion: 1,
  id: 'MP01-DIRECT-LAMP-ROUTE-ANCHOR-TRACE-02', status, mutationAuthority: false, generatedAtUtc,
  source: { snapshot: relative(snapshot), captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc, captureManifestSha256: captureSha, requiredMemberCount: capture.requiredMembers.length,
    candidate: { path: relative(candidatePath), sha256: sha256(candidateInput.bytes), identity: candidate.payloadSha256 }, boundary: { path: relative(boundaryPath), sha256: sha256(boundaryInput.bytes), identity: boundary.payloadSha256 },
    catalog: { markers: { path: relative(markersPath), sha256: sha256(markerBytes), count: markers.length }, routes: { path: relative(routesPath), sha256: sha256(routeBytes), count: routes.length } } },
  counterfactualBoundaryOnly: { description: 'The four existing closed leaves are treated as air only for offline topology measurement. This does not prove a door click, passability, movement, authority, or world state.', leaves, sourceStates },
  trace: { bounds, startingStagingFeet: staging, serviceAnchor, serviceAnchorReachableInCounterfactual: Boolean(localPath), localPathStationCount: localPath?.length ?? 0, component: { stationCount: component.length, coordinateSetSha256: setHash(component), bounds: componentBounds }, observedEscapeFaces },
  anchorCensus: { stagingMarkerCount, componentMarkerCount: componentMarkers.length, componentMarkers: componentMarkers.map(({ id, name, position }) => ({ id, name, position })), componentRouteCount: componentRoutes.length, acceptedOwnerAssignments: [], acceptedOutboundRouteStations: 0, acceptedRecoveryRouteStations: 0 },
  contractDisposition: { buildableRouteContract: false, reason: hardReason, requiredBeforeCandidate: ['expand only the observed shell faces from this immutable source or obtain a fresh complete source covering those faces', 'bind a permitted origin and distinct recovery anchor to finite exact station arrays', 'assign a named owner/interface to every station and controlled boundary', 'census footing, two-clear-headroom, fluid/gravity, containers/block entities, protected cores, and route interfaces over the final finite route', 'independently validate the two-leaf open/close trace before treating either leaf as passable', 'apply live entity/checkpoint gates only after a bounded route contract exists'] },
  safetyBoundary: { readOnly: true, liveCallsPerformed: false, botMovementPerformed: false, interactionsPerformed: false, worldEditsPerformed: false, operationFilesEmitted: false, releaseManifestEmitted: false },
  nonClaims: ['origin route', 'recovery route', 'door traversal', 'owner acceptance', 'control commissioning', 'public/service opening', 'egress', 'MP01 completion'], payloadSha256: null,
};
report.payloadSha256 = sha256(JSON.stringify(report));

const mapBounds = { minX: 1985, maxX: 2176, minZ: -920, maxZ: -768 }; const scale = 3; const width = 780; const height = 660;
const project = (c) => ({ x: 78 + (c.x - mapBounds.minX) * scale, y: 78 + (c.z - mapBounds.minZ) * scale });
const points = component.filter((c) => c.y === 165).map((c) => { const p = project(c); return `<rect x="${p.x}" y="${p.y}" width="${scale}" height="${scale}" fill="#22c55e"/>`; });
const leavesSvg = leaves.filter((c) => c.y === 166).map((c) => { const p = project(c); return `<rect x="${p.x - 2}" y="${p.y - 2}" width="${scale + 4}" height="${scale + 4}" fill="#f97316"/>`; });
const shellSvg = Object.entries(observedEscapeFaces).map(([face, detail]) => detail.sampleCells.map((c) => { const p = project(c); return `<circle cx="${p.x + 1.5}" cy="${p.y + 1.5}" r="4" fill="#ef4444"><title>${escape(`${face}: ${key(c)}`)}</title></circle>`; }).join('')).join('');
const stageSvg = staging.map((c) => { const p = project(c); return `<circle cx="${p.x + 1.5}" cy="${p.y + 1.5}" r="5" fill="#38bdf8"/>`; }).join(''); const anchorP = project(serviceAnchor);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>text{font-family:Inter,Arial,sans-serif;fill:#e2e8f0}.title{font-size:21px;font-weight:800}.note{font-size:13px;fill:#cbd5e1}</style><rect width="100%" height="100%" fill="#0b1020"/><text x="34" y="31" class="title">MP01 route/anchor trace 02 — counterfactual boundary measurement</text><text x="34" y="53" class="note">green y=165 reachable stations · orange two-leaf boundary · blue staging · red trace-shell escape samples</text><rect x="78" y="78" width="${(mapBounds.maxX-mapBounds.minX+1)*scale}" height="${(mapBounds.maxZ-mapBounds.minZ+1)*scale}" fill="#111827" stroke="#64748b"/>${points.join('')}${leavesSvg.join('')}${shellSvg}${stageSvg}<rect x="${anchorP.x-4}" y="${anchorP.y-4}" width="11" height="11" fill="none" stroke="#f8fafc" stroke-width="2"/><text x="34" y="628" class="note">${escape(status)}. ${escape(hardReason)}</text></svg>`;
for (const filename of [out, markdown, map]) fs.mkdirSync(path.dirname(absolute(filename)), { recursive: true });
fs.writeFileSync(absolute(out), `${JSON.stringify(report, null, 2)}\n`); fs.writeFileSync(absolute(map), svg);
fs.writeFileSync(absolute(markdown), `# MP01 direct-lamp route/anchor trace 02\n\n**Status:** \`${status}\` — read-only counterfactual trace; no movement, interaction, world operation, or release authority.\n\n![Trace map](${path.basename(map)})\n\nThe four east leaves were treated as air only to measure topology. The route component has \`${component.length}\` stations in the finite shell; the service anchor is ${localPath ? `reachable in \`${localPath.length}\` counterfactual stations` : 'not reachable'}. Current catalog anchors in the component: \`${componentMarkers.length}\`; routes reaching it: \`${componentRoutes.length}\`.\n\n${hardReason}\n`);
process.stdout.write(`${JSON.stringify({ status, stationCount: component.length, observedEscapeFaces: Object.fromEntries(Object.entries(observedEscapeFaces).map(([face, d]) => [face, d.cellCount])), out: relative(out), markdown: relative(markdown), map: relative(map), payloadSha256: report.payloadSha256 }, null, 2)}\n`);
