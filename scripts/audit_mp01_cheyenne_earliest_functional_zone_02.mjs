#!/usr/bin/env node
/**
 * MP01 Cheyenne earliest incomplete functional-zone audit.
 *
 * Read-only reconciliation of the latest accepted support-post snapshot.
 * It deliberately distinguishes as-built fabric from a finite future physical
 * candidate.  No Minecraft operation, RCON call, route/marker change, or
 * release authorization is possible here.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback) => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const SNAPSHOT = option('--snapshot', 'data/worldsnap-mp11-c01-arrival-gravity-support-post-20260827T043000Z');
const CANDIDATE = option('--candidate', 'data/world-review/mp01-direct-lamp-mp11-c01-support-post-20260827T043000Z/candidate.json');
const TOPOLOGY = option('--topology', 'data/world-review/mp01-direct-lamp-mp11-c01-support-post-20260827T043000Z/topology.json');
const OUT = option('--out', 'data/world-review/mp01-cheyenne-earliest-functional-zone-02-mp11-c01-support-post-20260827T043000Z');
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`MP01 earliest functional-zone audit rejected: ${message}`); };
const escape = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const sourceRoot = abs(SNAPSHOT);
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(sourceRoot, member)), `missing immutable source member ${member}`);
const capturePath = path.join(sourceRoot, 'combined-zones-complete-save-capture.json');
const captureBytes = fs.readFileSync(capturePath); const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && capture.captureId && capture.requiredMembers?.length === 130, 'not a complete 130-member immutable post capture');
for (const member of capture.requiredMembers) { const file = path.join(sourceRoot, member.path); fail(fs.existsSync(file) && fs.statSync(file).size === member.bytes && sha(fs.readFileSync(file)) === member.sha256, `snapshot member drift ${member.path}`); }
for (const input of [CANDIDATE, TOPOLOGY]) fail(fs.existsSync(abs(input)), `missing source-bound MP01 input ${input}`);
const candidateBytes = fs.readFileSync(abs(CANDIDATE)); const candidate = JSON.parse(candidateBytes);
const topologyBytes = fs.readFileSync(abs(TOPOLOGY)); const topology = JSON.parse(topologyBytes);
fail(candidate.source?.snapshot === SNAPSHOT && candidate.source?.captureId === capture.captureId, 'direct-lamp candidate is not bound to this post snapshot');
fail(topology.source?.snapshot === SNAPSHOT && topology.source?.captureId === capture.captureId, 'direct-lamp topology is not bound to this post snapshot');
fail(candidate.status === 'STATIC_CANDIDATE_PASS_PENDING_RUNTIME_INTERACTION_AND_ACCESS_CONTRACT', 'candidate is not the current static-only direct-lamp candidate');
fail(topology.status === 'REJECTED_NO_CURRENT_SOURCE_BOUND_BIDIRECTIONAL_ACCESS_RETURN_CONTRACT', 'topology does not preserve the access/return rejection');
fail(!fs.existsSync(abs(OUT)), '--out must be fresh');

const reader = new AnvilReader(path.join(sourceRoot, 'region'));
const at = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));
const b04Cells = [[2021, 168, -845], [2021, 169, -845], [2022, 168, -845], [2022, 169, -845]];
const b04Observed = [];
for (const [x, y, z] of b04Cells) b04Observed.push({ x, y, z, state: await at(x, y, z) });
fail(b04Observed.every((cell) => cell.state === 'minecraft:white_concrete'), 'B04 cells no longer match the accepted Row-D structural partition');
const pair = [[1998, 165, -902], [1999, 165, -902]];
const supports = [[1998, 164, -902], [1999, 164, -902]];
const heads = [[1998, 166, -902], [1999, 166, -902], [1998, 167, -902], [1999, 167, -902]];
const directLampObserved = { targets: await Promise.all(pair.map(async ([x, y, z]) => ({ x, y, z, state: await at(x, y, z) }))), supports: await Promise.all(supports.map(async ([x, y, z]) => ({ x, y, z, state: await at(x, y, z) }))), headroom: await Promise.all(heads.map(async ([x, y, z]) => ({ x, y, z, state: await at(x, y, z) }))) };
fail(directLampObserved.targets.every((cell) => cell.state === 'minecraft:air') && directLampObserved.supports.every((cell) => cell.state === 'minecraft:polished_andesite') && directLampObserved.headroom.every((cell) => cell.state === 'minecraft:air'), 'direct-lamp candidate geometry drifted');

const zones = [
  { order: 1, zone: 'B04 / Row-D north partition', physicalFact: 'The four historically requested cells remain white concrete within the accepted 20-cell Row-D partition.', result: 'REJECTED_AS_STRUCTURAL_FABRIC', finitePackage: null, prerequisite: 'No carve: it would create an unowned second D02 opening.' },
  { order: 2, zone: '15-bay structural array + first interiors', physicalFact: 'Structural shells are 15/15 and first passive interiors are 15/15 under accepted prior post QA.', result: 'NO_DELTA__DUPLICATE_FIT_OUT_REJECTED', finitePackage: null, prerequisite: 'A new scope must demonstrate a distinct non-container functional deficiency; none is selected here.' },
  { order: 3, zone: 'Manual service rows / dry restricted support rooms', physicalFact: 'The manual row is 5/5; support, staging, vestibule, corridor, annex, gallery, logistics, and south room are accepted restricted components.', result: 'NO_DELTA__ALREADY_BUILT', finitePackage: null, prerequisite: 'No cosmetic or duplicate release.' },
  { order: 4, zone: 'Reservoir, utility, and service boundary', physicalFact: 'The contained 585-cell reservoir, retained causeway/wall, and closed manual boundaries remain protected functional interfaces.', result: 'NO_FINITE_OWNER_BOUND_DELTA', finitePackage: null, prerequisite: 'Any change needs a separate hydrology/receiver/owner/inverse design; do not use it to solve access or controls.' },
  { order: 5, zone: 'Isolated direct-lamp diagnostic calibration', physicalFact: 'Exactly two dry air cells have two polished-andesite supports, four clear head cells, a 36-cell clean envelope, and an air buffer from the historic failed wire topology.', result: 'EARLIEST_GENUINE_FINITE_FUTURE_PHYSICAL_CANDIDATE__NOT_RELEASE_READY', finitePackage: 'MP01-ISOLATED-DIRECT-LAMP-CALIBRATION-01: two cells only—lever (1998,165,-902), direct lamp (1999,165,-902).', prerequisite: 'Genuine-click proof plus an accepted owner-bound outbound/recovery route. Current 143-station staging component has three closed manual exits and zero valid routes.' },
];
const prerequisiteChain = [
  'Same-version disposable OFF → ON → OFF proof for the exact direct adjacent lever/lamp topology and actual click semantics.',
  'Independent capture of two settled OFF observations, genuine click, two settled ON observations, genuine reset, and two settled OFF observations.',
  'A separately designed controlled-boundary package with exact owner, direction, open/closed failure state, and inverse for a selected exit; neither rail nor any protected reservoir/service boundary may substitute.',
  'A fresh per-station normal-walk outbound and distinct recovery route contract from an approved origin to one staging foot, with owner/interface coverage and post-boundary bidirectional proof.',
  'Only then: new immutable source, live entity clearance, canonical target/inverse, strict parser/source preflights, journaled guarded execution, fresh post capture, rollback preflight, and independent QA.'
];
const map = () => `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><style>.title{font:700 22px system-ui;fill:#f8fafc}.sub{font:13px system-ui;fill:#cbd5e1}.h{font:700 14px system-ui;fill:#f8fafc}.t{font:12px system-ui;fill:#cbd5e1}.n{font:600 12px system-ui;fill:#fde68a}.l{font:600 11px system-ui;fill:#f8fafc}</style><rect width="100%" height="100%" fill="#08131f"/><text x="32" y="38" class="title">MP01 Cheyenne — earliest incomplete functional-zone audit 02</text><text x="32" y="61" class="sub">Bound to capture ${escape(capture.captureId)}. Read-only: no release, route, interaction, or world change.</text><rect x="36" y="92" width="385" height="550" rx="10" fill="#12263a" stroke="#496a82"/><text x="60" y="124" class="h">Reconciled as-built / excluded fronts</text><text x="60" y="160" class="l">B04: 4 observed white-concrete cells</text><text x="60" y="181" class="t">accepted Row-D partition; no carve</text><text x="60" y="226" class="l">Array/interiors: 15/15 + 15/15</text><text x="60" y="247" class="t">no duplicate fit-out delta</text><text x="60" y="292" class="l">Support/manual row: already built</text><text x="60" y="313" class="t">restricted capacity is not a new scope</text><text x="60" y="358" class="l">Reservoir / boundary: protected</text><text x="60" y="379" class="t">requires separate hydrology contract</text><rect x="458" y="92" width="786" height="550" rx="10" fill="#183048" stroke="#6ea4c7"/><text x="484" y="124" class="h">Earliest genuine finite future candidate — direct-lamp calibration</text><rect x="520" y="226" width="72" height="72" fill="#64748b" stroke="#e2e8f0"/><rect x="596" y="226" width="72" height="72" fill="#facc15" stroke="#fef3c7"/><text x="526" y="322" class="l">lever</text><text x="588" y="322" class="l">lamp</text><text x="506" y="350" class="t">(1998,165,-902)        (1999,165,-902)</text><text x="484" y="396" class="n">Geometry passes only: 2 air cells · 2 exact supports · 4 head cells · 36-cell clean envelope</text><text x="484" y="435" class="l">Access/recovery gate: 143-station staging component; 3 closed manual exits; accepted normal-walk routes = 0.</text><text x="484" y="472" class="l">Required before any compiler: genuine-click proof + selected controlled boundary + owner-bound outbound/recovery route.</text><text x="484" y="522" class="t">No redstone wire, repeater, door actuation, reservoir/liner, route, utility, life-safety, public access, or service commissioning is in scope.</text><text x="484" y="585" class="t">The 2-cell pair is a future diagnostic only; it is not a current physical release.</text></svg>`;
const report = {
  schemaVersion: 1,
  id: 'MP01-CHEYENNE-EARLIEST-FUNCTIONAL-ZONE-AUDIT-02',
  status: 'SOURCE_BOUND_NO_CURRENT_PHYSICAL_RELEASE__ONE_FINITE_FUTURE_DIAGNOSTIC_CANDIDATE',
  disposition: { readOnly: true, mutationAuthority: false, operationsCompiled: false, releaseAuthorization: false, rconCalled: false, worldMutated: false },
  source: { snapshot: rel(SNAPSHOT), captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc, captureManifestSha256: sha(captureBytes), verifiedRequiredMemberCount: capture.requiredMembers.length, directLampCandidate: { path: rel(CANDIDATE), sha256: sha(candidateBytes), status: candidate.status }, directLampTopology: { path: rel(TOPOLOGY), sha256: sha(topologyBytes), status: topology.status } },
  freshObservedCells: { b04RequestedFour: b04Observed, directLamp: directLampObserved },
  orderedZones: zones,
  firstFiniteFuturePackage: { id: 'MP01-ISOLATED-DIRECT-LAMP-CALIBRATION-01', owner: 'MP01_DIRECT_LAMP_CALIBRATION_OWNER', targetCellCount: 2, targetCells: directLampObserved.targets, functionalIntent: 'isolated manual direct-lamp diagnostic only', currentReleaseReadiness: 'HOLD__NO_GENUINE_CLICK_PROOF_AND_NO_OWNER_BOUND_ACCESS_RETURN', exactPrerequisites: prerequisiteChain },
  decisiveBlocker: { currentOwnerBoundOutboundOrRecoveryRouteCount: 0, stagingComponentCellCount: topology.normalWalkTopology.connectedStagingComponent.cellCount, exactClosedDirectionalInterfaceCount: topology.normalWalkTopology.exactClosedManualBoundaries.closedDirectionalInterfaceCount, reason: 'No source-valid outbound or recovery route reaches the staging component; an owner label cannot make a closed manual boundary traversable.' },
  nonClaims: ['No B04 carve, chamber bay, service-room fit-out, reservoir change, utility system, boundary change, direct-lamp installation, interaction, route, egress, public/service opening, or Cheyenne completion.', 'No operation files, release manifest, RCON call, bot movement, live interaction, or world mutation.']
};
report.auditIdentitySha256 = sha(`${JSON.stringify(report, null, 2)}\n`);
fs.mkdirSync(abs(OUT), { recursive: true });
fs.writeFileSync(path.join(abs(OUT), 'mp01-cheyenne-earliest-functional-zone-audit-02.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(abs(OUT), 'mp01-cheyenne-earliest-functional-zone-map.svg'), `${map()}\n`);
fs.writeFileSync(path.join(abs(OUT), 'MP01-CHEYENNE-EARLIEST-FUNCTIONAL-ZONE-AUDIT-02.md'), `# MP01 Cheyenne earliest incomplete functional-zone audit 02\n\n**Status:** ${report.status}\n\n![MP01 functional-zone map](mp01-cheyenne-earliest-functional-zone-map.svg)\n\nThe latest support-post source confirms that B04 is accepted Row-D structural fabric, all 15 bays and first interiors are built, the manual/support interiors are already present, and the reservoir/service boundary has no finite owner-bound delta.\n\nThe first real but still **future** physical candidate is the isolated two-cell direct-lamp calibration pair at (1998,165,-902) and (1999,165,-902). It is dry, supported, and isolated, but it is not release-ready: the connected staging component has three closed manual exits and **zero** source-bound outbound or recovery routes. The exact prerequisite chain is recorded in the JSON evidence.\n\nNo physical package is emitted. In particular, the candidate does not authorize controls, door actuation, utilities, a route, public/service access, egress, or Cheyenne completion.\n`);
console.log(JSON.stringify({ status: report.status, output: rel(OUT), b04CellsConfirmedStructural: b04Observed.length, futureCandidate: report.firstFiniteFuturePackage.id, targetCellCount: 2, currentOwnerBoundOutboundOrRecoveryRouteCount: 0, mutationAuthority: false }, null, 2));
