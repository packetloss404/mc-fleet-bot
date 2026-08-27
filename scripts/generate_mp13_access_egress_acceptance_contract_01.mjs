#!/usr/bin/env node
/**
 * MP13-ACCESS-EGRESS-ACCEPTANCE-CONTRACT-01
 *
 * Converts the source-bound MP13 access-class cell ledger into an exact,
 * default-deny acceptance packet.  It intentionally cannot accept ownership,
 * authorize geometry, or create an operation file.  Its job is to make the
 * required review surface finite and coordinate-addressable before a later
 * design can be considered.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback = null) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const required = (flag) => {
  const result = value(flag);
  if (!result) throw new Error(`Missing required ${flag}`);
  return result;
};
const absolute = (file) => path.resolve(ROOT, file);
const relative = (file) => path.relative(ROOT, file).split(path.sep).join('/');
const sha256 = (content) => crypto.createHash('sha256').update(content).digest('hex');
const pointKey = ([x, y, z]) => `${x},${y},${z}`;
const comparePoint = (left, right) => left[0] - right[0] || left[1] - right[1] || left[2] - right[2];

const LEDGER_PATH = absolute(required('--ledger'));
const UPSTREAM_CONTRACT_PATH = absolute(required('--upstream-contract'));
const OUT = absolute(required('--out'));
const GENERATED_AT = value('--generated-at', new Date().toISOString());

function fail(condition, message) {
  if (!condition) throw new Error(`MP13 access/egress acceptance contract rejected: ${message}`);
}

function readJson(file, label) {
  fail(fs.existsSync(file), `${label} does not exist: ${relative(file)}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function finitePoint(point, label) {
  fail(Array.isArray(point) && point.length === 3 && point.every(Number.isFinite), `${label} is not an exact coordinate`);
}

function routePath(transitions, routeId) {
  const edges = transitions.filter((edge) => edge.routeId === routeId);
  fail(edges.length > 0, `missing exact route edges for ${routeId}`);
  const ordered = [...edges].sort((left, right) => left.id.localeCompare(right.id));
  const points = [ordered[0].from];
  for (const edge of ordered) {
    finitePoint(edge.from, `${routeId} edge from`);
    finitePoint(edge.to, `${routeId} edge to`);
    fail(pointKey(points[points.length - 1]) === pointKey(edge.from), `${routeId} is not continuous`);
    const dx = Math.abs(edge.to[0] - edge.from[0]);
    const dy = Math.abs(edge.to[1] - edge.from[1]);
    const dz = Math.abs(edge.to[2] - edge.from[2]);
    fail(dx + dz === 1 && dy <= 1, `${routeId} has a non-normal-walk edge`);
    fail(JSON.stringify(edge.directions) === JSON.stringify(['FORWARD', 'REVERSE']), `${routeId} loses bidirectional source record`);
    points.push(edge.to);
  }
  return points;
}

function svgPoint([x, , z], bounds) {
  const pad = 70;
  const width = 1070;
  const height = 600;
  const sx = pad + ((x - bounds.minX) / (bounds.maxX - bounds.minX || 1)) * width;
  const sy = pad + ((bounds.maxZ - z) / (bounds.maxZ - bounds.minZ || 1)) * height;
  return [sx, sy];
}

function polyline(points, bounds) {
  return points.map((point) => svgPoint(point, bounds).map((n) => n.toFixed(1)).join(',')).join(' ');
}

function esc(text) {
  return String(text).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);
}

fail(!fs.existsSync(OUT), `out must be a fresh directory: ${relative(OUT)}`);
const ledger = readJson(LEDGER_PATH, 'ledger');
const upstream = readJson(UPSTREAM_CONTRACT_PATH, 'upstream contract');
const ledgerBytes = fs.readFileSync(LEDGER_PATH);
const upstreamBytes = fs.readFileSync(UPSTREAM_CONTRACT_PATH);

fail(ledger.id === 'MP13-ACCESS-CLASS-CELL-LEDGER-01', 'wrong ledger identity');
fail(ledger.status === 'PROPOSED_SOURCE_BOUND_DEFAULT_DENY_NOT_ACCEPTED_NOT_RELEASE_AUTHORITY', 'ledger is not the default-deny prerequisite');
fail(ledger.worldMutationPerformed === false && ledger.rconCalled === false && ledger.databaseMutated === false, 'ledger must be read-only');
fail(Array.isArray(ledger.operationFiles) && ledger.operationFiles.length === 0 && ledger.mutationAuthorityGranted === false, 'ledger must not have mutation authority');
fail(upstream.id === 'MP13-WESTLIGHT-EGRESS-ACCESS-CONTRACT-03', 'wrong upstream MP13 contract');
fail(upstream.status === 'PROPOSED_SOURCE_BOUND_CONTRACT_NOT_ACCEPTED_NOT_RELEASE_AUTHORITY', 'upstream contract changed status');
fail(upstream.worldMutationPerformed === false, 'upstream contract must be read-only');
fail(ledger.upstream?.contract?.sha256 === sha256(upstreamBytes), 'ledger upstream-contract byte binding drifted');
fail(ledger.sourceSnapshot?.sha256 === upstream.sourceSnapshot?.sha256, 'source snapshot hash differs between ledger and upstream contract');
fail(ledger.sourceSnapshot?.regionFileCount === upstream.sourceSnapshot?.regionFileCount, 'source region count differs between ledger and upstream contract');
fail(ledger.protectionEnvelope?.cells?.count === ledger.cells?.length && ledger.cells.length > 0, 'ledger exact cell coverage is incomplete');
fail(ledger.cells.every((cell) => cell.owner === 'U0_UNASSIGNED_OWNER_DEFAULT_DENY' && cell.accessClass === 'U0' && cell.reviewerAcceptance === null), 'this contract only accepts an unresolved default-deny ledger');
fail(ledger.acceptanceGates?.unreviewedCellCount === ledger.cells.length, 'unreviewed cell count drifted');
fail(ledger.acceptanceGates?.unreviewedDirectionalFaceCount === ledger.transitions.length * 2, 'unreviewed directional-face count drifted');
fail(ledger.acceptanceGates?.defaultDenyEnforced === true && ledger.acceptanceGates?.zeroUnreviewedCrossOwnerFaces === false, 'ledger acceptance gate no longer fail-closed');

const classes = new Map((upstream.interfaceClasses ?? []).map((entry) => [entry.id, entry]));
const i05 = classes.get('I05-LOWER-LOBBY-PUBLIC-STAFF-SEPARATION');
const i06 = classes.get('I06-WEST-SERVICE-TOWER-CHANGEOVER');
fail(i05 && i06, 'I05/I06 must remain in the upstream contract');
const publicToBackstage = routePath(ledger.transitions, 'theatre-public-to-backstage');
const backstageToBase = routePath(ledger.transitions, 'backstage-to-west-service-base');
const towerToConcourse = routePath(ledger.transitions, 'west-service-base-to-concourse');
fail(publicToBackstage.length === 79 && backstageToBase.length === 134 && towerToConcourse.length === 68, 'source route station counts drifted');

const knownCells = new Set(ledger.cells.map(({ point }) => pointKey(point)));
for (const route of [publicToBackstage, backstageToBase, towerToConcourse]) {
  for (const point of route) fail(knownCells.has(pointKey(point)), 'route station is outside exact protection ledger');
}

const interfaceRequirements = (upstream.interfaceClasses ?? []).map((entry) => ({
  id: entry.id,
  transition: entry.transition,
  coordinates: entry.anchors ?? entry.nearestPoints ?? [],
  reviewVolume: entry.reviewVolume ?? null,
  observed: entry.observed,
  requiredAcceptance: entry.requiredContinuity,
  currentAcceptance: 'UNACCEPTED_DEFAULT_DENY',
  mutationAuthority: false,
}));

const acceptanceContract = {
  schemaVersion: 1,
  id: 'MP13-ACCESS-EGRESS-ACCEPTANCE-CONTRACT-01',
  status: 'SOURCE_BOUND_DEFAULT_DENY_UNACCEPTED_OWNERSHIP_ACCESS_EGRESS_CONTRACT',
  generatedAtUtc: GENERATED_AT,
  mode: 'read-only acceptance-design contract; no world operation authority',
  worldMutationPerformed: false,
  rconCalled: false,
  databaseMutated: false,
  operationFiles: [],
  mutationAuthorityGranted: false,
  sourceBinding: {
    snapshot: ledger.sourceSnapshot,
    ledger: { path: relative(LEDGER_PATH), sha256: sha256(ledgerBytes), identitySha256: ledger.ledgerIdentitySha256 },
    upstreamContract: { path: relative(UPSTREAM_CONTRACT_PATH), sha256: sha256(upstreamBytes) },
  },
  exactReviewSurface: {
    ledgerCellCount: ledger.cells.length,
    ledgerCellSetSha256: ledger.protectionEnvelope.cells.coordinateSetSha256,
    bounds: ledger.protectionEnvelope.cells.bounds,
    sourceTransitions: ledger.transitions.length,
    directionalFaceReviewsRequired: ledger.transitions.length * 2,
    unreviewedCellCount: ledger.acceptanceGates.unreviewedCellCount,
    unreviewedDirectionalFaceCount: ledger.acceptanceGates.unreviewedDirectionalFaceCount,
    currentClasses: { U0: ledger.cells.length },
  },
  exactSourceRoutes: [
    { id: 'I05-P1-TO-S1-UNSAFE-TRACE', interfaceId: i05.id, accessIntent: 'P1_TO_S1_MUST_NOT_REMAIN_REACHABLE', stations: publicToBackstage.length, start: publicToBackstage[0], end: publicToBackstage.at(-1), coordinateSetSha256: sha256(publicToBackstage.map(pointKey).join('\n')), currentAcceptance: 'UNSAFE_UNACCEPTED' },
    { id: 'I05-S1-STAFF-SPINE-CONTINUITY', interfaceId: i05.id, accessIntent: 'S1_ONLY_CONTINUITY_TO_NAMED_SPINE_REQUIRED', stations: backstageToBase.length, start: backstageToBase[0], end: backstageToBase.at(-1), coordinateSetSha256: sha256(backstageToBase.map(pointKey).join('\n')), currentAcceptance: 'UNACCEPTED' },
    { id: 'I06-S1-TOWER-CHANGEOVER', interfaceId: i06.id, accessIntent: 'S1_ONLY_NEVER_PUBLIC_EGRESS', stations: towerToConcourse.length, start: towerToConcourse[0], end: towerToConcourse.at(-1), coordinateSetSha256: sha256(towerToConcourse.map(pointKey).join('\n')), currentAcceptance: 'UNACCEPTED' },
  ],
  interfaceRequirements,
  acceptanceGates: {
    perCellOwnerAndAccessClassRecord: { required: true, accepted: false, exactRowsRequired: ledger.cells.length, allowedClasses: ['P0', 'P1', 'S1', 'C1', 'X0'], defaultDenyClass: 'U0' },
    perDirectionalFaceNormalFailureState: { required: true, accepted: false, exactRowsRequired: ledger.transitions.length * 2 },
    i05PublicStaffSeparation: { required: true, accepted: false, proof: 'P1 cannot reach S1 while S1 retains a continuous 3-by-3 route to the named spine; every aperture declares normal and failure state.' },
    i06StaffOnlyChangeover: { required: true, accepted: false, proof: 'S1-only 3-by-3 clear, lit, bidirectional no-jump route with real landings and independently demonstrated public-bypass exclusion.' },
    publicEgressProgram: { required: true, accepted: false, proof: 'I01-I04 require separately designed public systems, two independent exits, and the stated landing/lift/event-mode proofs. I06 cannot substitute.' },
    liveReleaseKernel: { required: true, accepted: false, proof: 'Only after exact design acceptance: fresh complete source, entity clearance, source/inverse guards, strict-noop parsing, journaled execution, and independent post-state route proof.' },
    allRequiredGatesClosed: true,
  },
  prohibitedInferences: [
    'No catalog envelope transfers ownership.',
    'No U0 cell or unreviewed face may be compiled, opened, blocked, lit, or assigned a door.',
    'The I06 west service tower is staff-only and cannot count as public egress, accessibility infrastructure, or either independent public exit.',
    'This contract creates no physical design, operation, rollback, release manifest, RCON call, or world change.',
  ],
};
acceptanceContract.contractIdentitySha256 = sha256(JSON.stringify({
  sourceBinding: acceptanceContract.sourceBinding,
  exactReviewSurface: acceptanceContract.exactReviewSurface,
  exactSourceRoutes: acceptanceContract.exactSourceRoutes,
  interfaceRequirements: acceptanceContract.interfaceRequirements,
  acceptanceGates: acceptanceContract.acceptanceGates,
}));

const bounds = { minX: -450, maxX: -270, minZ: -570, maxZ: -470 };
const routeRows = [
  { points: publicToBackstage, color: '#ef4444', label: 'I05 unsafe P1→S1 trace (79 stations)' },
  { points: backstageToBase, color: '#f59e0b', label: 'I05 required S1 continuity (134 stations)' },
  { points: towerToConcourse, color: '#38bdf8', label: 'I06 staff-only tower trace (68 stations)' },
];
const markers = interfaceRequirements.flatMap((entry) => entry.coordinates.map((point, index) => ({ point, label: `${entry.id.replace(/^I0/, 'I')}.${index + 1}`, id: entry.id })));
const map = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1210" height="820" viewBox="0 0 1210 820" role="img" aria-labelledby="title desc">
  <title id="title">MP13 access and egress acceptance contract coordinate map</title>
  <desc id="desc">Source-bound X/Z plan map. It plots unaccepted I05 and I06 source routes plus all upstream interface anchors. Elevations are recorded in the JSON contract; this plan view creates no route authority.</desc>
  <style>
    .bg{fill:#0b1220}.frame{fill:#101c31;stroke:#34506f;stroke-width:2}.grid{stroke:#294361;stroke-width:1;opacity:.7}.title{font:700 25px system-ui;fill:#e5f1ff}.sub{font:14px system-ui;fill:#b4c9e4}.legend{font:13px system-ui;fill:#d7e7fa}.tiny{font:11px system-ui;fill:#b4c9e4}.marker{fill:#f8fafc;stroke:#0b1220;stroke-width:2}
  </style>
  <rect class="bg" width="1210" height="820"/><text class="title" x="36" y="38">MP13 access / egress acceptance contract 01 — source plan</text>
  <text class="sub" x="36" y="62">${esc(ledger.sourceSnapshot.sha256)} · ${ledger.cells.length.toLocaleString()} U0 default-deny cells · no route or build authority</text>
  <rect class="frame" x="55" y="80" width="1100" height="650" rx="8"/>
  ${Array.from({ length: 10 }, (_, index) => { const x = 70 + index * 107; return `<line class="grid" x1="${x}" y1="80" x2="${x}" y2="730"/><text class="tiny" x="${x}" y="748">x ${Math.round(bounds.minX + index * 18)}</text>`; }).join('')}
  ${Array.from({ length: 6 }, (_, index) => { const y = 90 + index * 120; return `<line class="grid" x1="55" y1="${y}" x2="1155" y2="${y}"/><text class="tiny" x="10" y="${y + 4}">z ${Math.round(bounds.maxZ - index * 20)}</text>`; }).join('')}
  ${routeRows.map((row) => `<polyline points="${polyline(row.points, bounds)}" fill="none" stroke="${row.color}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`).join('')}
  ${markers.map(({ point, label, id }) => { const [x, y] = svgPoint(point, bounds); return `<circle class="marker" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5"/><text class="tiny" x="${(x + 8).toFixed(1)}" y="${(y - 7).toFixed(1)}">${esc(label)} ${esc(id)}</text>`; }).join('')}
  <rect x="55" y="755" width="1100" height="45" fill="#101c31" stroke="#34506f"/><line x1="75" y1="774" x2="110" y2="774" stroke="#ef4444" stroke-width="4"/><text class="legend" x="118" y="779">I05 unsafe P1→S1</text><line x1="300" y1="774" x2="335" y2="774" stroke="#f59e0b" stroke-width="4"/><text class="legend" x="343" y="779">I05 required S1 continuity</text><line x1="610" y1="774" x2="645" y2="774" stroke="#38bdf8" stroke-width="4"/><text class="legend" x="653" y="779">I06 staff-only / never public egress</text>
</svg>\n`;

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'mp13-access-egress-acceptance-contract-01.json'), `${JSON.stringify(acceptanceContract, null, 2)}\n`);
fs.writeFileSync(path.join(OUT, 'mp13-access-egress-acceptance-coordinate-map.svg'), map);
const markdown = `# MP13 access / egress acceptance contract 01\n\n**Status:** \`${acceptanceContract.status}\`  \n**Mode:** source-bound, read-only, default-deny; it has no physical release authority.\n\n![MP13 coordinate map](mp13-access-egress-acceptance-coordinate-map.svg)\n\n## Exact current review surface\n\nThis contract binds the ${ledger.cells.length.toLocaleString('en-US')}-cell MP13 access-class ledger (cell-set SHA-256 \`${ledger.protectionEnvelope.cells.coordinateSetSha256}\`) and ${ledger.transitions.length} source transitions. All ${ledger.cells.length.toLocaleString('en-US')} cells remain \`U0\` and all ${ledger.transitions.length * 2} directional faces remain unreviewed. That is an active default-deny condition, not a partial approval.\n\n| Interface | Exact current source fact | Acceptance still required |\n| --- | --- | --- |\n${interfaceRequirements.map((entry) => `| \`${entry.id}\` (${entry.transition}) | ${entry.observed} | ${entry.requiredAcceptance} |`).join('\n')}\n\n## Named source traces\n\n- I05 unsafe public-to-backstage trace: ${publicToBackstage.length} stations from \`${publicToBackstage[0].join(',')}\` to \`${publicToBackstage.at(-1).join(',')}\`. It must not remain a P1→S1 path.\n- I05 required staff continuity: ${backstageToBase.length} stations from \`${backstageToBase[0].join(',')}\` to \`${backstageToBase.at(-1).join(',')}\`. It must remain staff-only and gain no less than 3×3 clear continuity only after exact acceptance.\n- I06 west service tower: ${towerToConcourse.length} stations from \`${towerToConcourse[0].join(',')}\` to \`${towerToConcourse.at(-1).join(',')}\`. It is staff-only and can never substitute for public egress.\n\n## Closed gates\n\nEvery cell needs one accepted owner/class row; every directed face needs an accepted normal and failure state; I05 needs a proof that public P1 cannot reach staff S1 while S1 continuity survives; I06 needs an independently proven staff-only 3×3 lit, no-jump, bidirectional changeover; and I01–I04 need separate public egress design with two independent exits. No gate is accepted in this packet.\n\n## Non-claims\n\nThis artifact transfers no ownership, grants no player access, designs no physical geometry, and emits no operation, rollback, manifest, RCON call, or world edit.\n`;
fs.writeFileSync(path.join(OUT, 'MP13-ACCESS-EGRESS-ACCEPTANCE-CONTRACT-01.md'), markdown);
process.stdout.write(`${JSON.stringify({ status: acceptanceContract.status, out: relative(OUT), cells: ledger.cells.length, directionalFaceReviewsRequired: ledger.transitions.length * 2, identity: acceptanceContract.contractIdentitySha256 }, null, 2)}\n`);
