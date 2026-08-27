#!/usr/bin/env node
/**
 * SYS03 passenger-rail commissioning acceptance gate.
 *
 * A deliberately non-authorizing source-bound decision artifact. It proves
 * what this snapshot actually retains (civil High-16 and a separated B09
 * maintenance asset) and enumerates the independent evidence a passenger
 * opening must provide. It never emits operations, a release manifest, or an
 * RCON command.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const SNAPSHOT = option('--snapshot', 'data/worldsnap-sys03-high16-descending-post-20260826T153100Z');
const OUT_DIR = option('--out-dir', 'data/world-review/sys03-passenger-rail-commissioning-acceptance-gate-01-sys03-post-20260826T153100Z');
const DOC = option('--doc', 'docs/masterplans/SYS03-PASSENGER-RAIL-COMMISSIONING-ACCEPTANCE-GATE-01-2026-08-26.md');
const GENERATED_AT = option('--generated-at', '2026-08-26T18:00:00.000Z');
const HIGH16 = option('--high16-ledger', 'data/world-review/sys03-high16-descending-live-20260826T153100Z/evidence-ledger.json');
const B09 = option('--b09-commissioning', 'data/world-review/combined-zones-r12-b09-bounded-transport-commissioning/r12-b09-commissioning.json');

const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const fail = (condition, message) => { if (!condition) throw new Error(`SYS03 passenger commissioning gate rejected: ${message}`); };
const binding = (filename) => ({ path: rel(filename), sha256: sha256(fs.readFileSync(abs(filename))), bytes: fs.statSync(abs(filename)).size });
const cellsIn = (bounds) => {
  const cells = [];
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) for (let y = bounds.minY; y <= bounds.maxY; y += 1) for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) cells.push({ x, y, z });
  return cells;
};
const stateSetHash = (records) => sha256(`sys03-passenger-commissioning-source-states-v1\n${records.slice().sort((a, b) => cellKey(a.cell).localeCompare(cellKey(b.cell))).map(({ cell, state }) => `${cellKey(cell)}=${state}`).join('\n')}\n`);

function regionIdentity(directory) {
  const digest = crypto.createHash('sha256');
  const names = fs.readdirSync(directory).filter((name) => name.endsWith('.mca')).sort();
  for (const name of names) { digest.update(name); digest.update('\0'); digest.update(fs.readFileSync(path.join(directory, name))); digest.update('\0'); }
  return { sha256: digest.digest('hex'), fileCount: names.length };
}

function svg(contract) {
  const gates = contract.acceptanceGates;
  const rows = gates.map((gate, index) => {
    const y = 210 + index * 35;
    return `<rect x="48" y="${y - 20}" width="36" height="20" fill="#7f1d1d"/><text x="65" y="${y - 6}" text-anchor="middle" class="badge">0</text><text x="102" y="${y - 6}" class="gate">${gate.id}</text><text x="355" y="${y - 6}" class="detail">${gate.shortRequirement}</text>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="660" viewBox="0 0 1100 660">
<style>.title{font:700 25px sans-serif;fill:#f1f5f9}.sub{font:14px sans-serif;fill:#cbd5e1}.section{font:700 16px sans-serif;fill:#e2e8f0}.gate{font:700 13px sans-serif;fill:#f8fafc}.detail{font:12px sans-serif;fill:#cbd5e1}.badge{font:700 12px monospace;fill:#fee2e2}.small{font:11px monospace;fill:#94a3b8}</style>
<rect width="1100" height="660" fill="#091321"/><text x="38" y="42" class="title">SYS03 passenger-rail commissioning gate — current source, not an alignment map</text><text x="38" y="67" class="sub">Bound to ${contract.source.region.sha256.slice(0, 16)}… · every required gate is closed · no passenger service is commissioned</text>
<rect x="44" y="101" width="294" height="67" rx="8" fill="#18334d" stroke="#38bdf8"/><text x="60" y="128" class="section">High-16 descending bypass</text><text x="60" y="150" class="sub">46-station civil 6×6 void only</text><text x="60" y="166" class="small">NO TRACK · NO PLATFORM · NO POWER</text>
<rect x="389" y="101" width="294" height="67" rx="8" fill="#37231a" stroke="#f59e0b"/><text x="405" y="128" class="section">B09 protected maintenance asset</text><text x="405" y="150" class="sub">15 inactive powered rails + 1 tagged cart</text><text x="405" y="166" class="small">SEPARATED · NOT A PASSENGER PLATFORM</text>
<rect x="734" y="101" width="322" height="67" rx="8" fill="#3b1724" stroke="#fb7185"/><text x="750" y="128" class="section">Passenger disposition</text><text x="750" y="150" class="sub">0 accepted passenger station pairs</text><text x="750" y="166" class="small">0 PUBLIC OPENINGS · 0 TRIALS</text>
<text x="48" y="199" class="section">Independent acceptance gates (all must be accepted on one fresh immutable post-state)</text>${rows}
<text x="48" y="632" class="small">A civil corridor, passive rail, maintenance cart, lights, or a one-way traversal never satisfies any gate. This schematic does not claim a route between the two source facts.</text></svg>\n`;
}

const snapshotRoot = abs(SNAPSHOT);
const capturePath = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
fail(fs.existsSync(capturePath), `missing complete capture: ${rel(capturePath)}`);
fail(!fs.existsSync(abs(OUT_DIR)), `out directory must be fresh: ${OUT_DIR}`);
const capture = JSON.parse(fs.readFileSync(capturePath, 'utf8'));
fail(capture.immutableCopy === true && capture.requiredMembers?.length === 130, 'source must be a complete immutable 130-member capture');
for (const member of capture.requiredMembers) {
  const content = fs.readFileSync(path.join(snapshotRoot, member.path));
  fail(content.length === member.bytes && sha256(content) === member.sha256, `capture drifted: ${member.path}`);
}
const region = regionIdentity(path.join(snapshotRoot, 'region'));
const high16 = readJson(HIGH16);
const b09 = readJson(B09);
fail(high16.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE' && high16.civilOnly === true && high16.passengerServiceCommissioned === false, 'High-16 must remain a civil-only release');
fail(high16.postSnapshot?.regionSha256 === region.sha256, 'High-16 ledger is not bound to this source');
fail(b09.status === 'PASS_R12_B09_BOUNDED_ACTIVE_SHUTTLE_COMMISSIONED' && b09.commissionedSystem?.activeShuttleCommissioned === true, 'B09 maintenance commissioning binding missing');
fail(b09.nonclaims?.passengerTransportCommissioned === false && b09.nonclaims?.publicTransportCommissioned === false, 'B09 passenger nonclaim drifted');

const reader = new AnvilReader(path.join(snapshotRoot, 'region'));
const maintenanceCells = [
  { x: 2057, y: 130, z: -748 },
  ...cellsIn({ minX: 2058, maxX: 2072, minY: 130, maxY: 130, minZ: -748, maxZ: -748 }),
  { x: 2073, y: 130, z: -748 },
  { x: 2061, y: 130, z: -747 }, { x: 2070, y: 130, z: -747 },
];
const lowerVoid = cellsIn({ minX: 2051, maxX: 2056, minY: 130, maxY: 131, minZ: -748, maxZ: -748 });
const readStates = async (cells) => Promise.all(cells.map(async (cell) => ({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) })));
const [maintenanceStates, lowerVoidStates] = await Promise.all([readStates(maintenanceCells), readStates(lowerVoid)]);
fail(lowerVoidStates.every(({ state }) => state === 'minecraft:air'), 'B09 lower void no longer retains its non-platform source state');
fail(maintenanceStates.filter(({ cell }) => cell.z === -748 && cell.x >= 2058 && cell.x <= 2072).every(({ state }) => state === 'minecraft:powered_rail[powered=false,shape=east_west,waterlogged=false]'), 'B09 inactive powered rail source state drifted');
fail(maintenanceStates.find(({ cell }) => cell.x === 2057)?.state === 'minecraft:polished_diorite' && maintenanceStates.find(({ cell }) => cell.x === 2073)?.state === 'minecraft:polished_diorite', 'B09 protected stop source state drifted');
fail(maintenanceStates.filter(({ cell }) => cell.z === -747).every(({ state }) => state === 'minecraft:lever[face=wall,facing=north,powered=false]'), 'B09 parked control source state drifted');

const acceptanceGates = [
  ['PC-01-ROUTE-AND-STATION-PAIR', 'Two named public station interfaces; exact public approach, two independent exits, and post-state normal-walk proof in both directions.'],
  ['PC-02-DIRECTIONAL-GUIDEWAY-SEPARATION', 'Two directionally isolated guideways or accepted equivalent, complete rail/support geometry, 6×6 parallel service corridor, sealed interfaces.'],
  ['PC-03-PLATFORM-EDGE-AND-BOARDING', 'Owned 24-block platforms, edge prevention, gates, clear boarding zones, lift analogue, and accessible return path.'],
  ['PC-04-SIGNAL-POWER-FAILSAFE', 'Detector, signal, occupancy, launch, brake, recovery, power-loss and OUT-OF-SERVICE state evidence for every block.'],
  ['PC-05-RESCUE-AND-RECOVERY', 'Signed cross-passages, continuous service evacuation, two independent protected discharges, cart recovery, and no rail-walking dependency.'],
  ['PC-06-CLOSED-TRIALS-AND-RESET', 'One-cart occupied-block, forward/return, stop, evacuation, reset, rollback and entity-census trials recorded against one immutable post.'],
  ['PC-07-OPERATING-AND-RETURN-ACCEPTANCE', 'Both service directions and passenger return accepted; staff procedures, fault handoff, map labels, and restrictive interfaces retained.'],
  ['PC-08-FRESH-GUARDED-RELEASE-KERNEL', 'Fresh complete source, exact forward/inverse, strict-noop parser checks, live clearance, journaled execution, post snapshot and rollback post-preflight.'],
].map(([id, requirement]) => ({ id, requirement, shortRequirement: requirement.split(';')[0], currentEvidenceStatus: 'NOT_ACCEPTED', accepted: false }));

const contract = {
  schemaVersion: 1,
  id: 'SYS03-PASSENGER-RAIL-COMMISSIONING-ACCEPTANCE-GATE-01',
  generatedAtUtc: GENERATED_AT,
  status: 'SOURCE_BOUND_DEFAULT_DENY__NO_SYS03_PASSENGER_SERVICE_COMMISSIONED',
  disposition: { readOnly: true, mutationAuthority: false, operationsCompiled: false, releaseAuthorization: false, rconCalled: false, worldMutated: false },
  source: {
    snapshotRoot: rel(SNAPSHOT), captureId: capture.captureId, immutableCopy: true, verifiedRequiredMemberCount: capture.requiredMembers.length,
    region: { sha256: region.sha256, fileCount: region.fileCount }, capture: binding(rel(capturePath)),
    inputs: [binding(HIGH16), binding(B09)],
  },
  observedCurrentState: {
    high16: { civilOnly: true, passengerServiceCommissioned: false, connectedCivilStations: 46, coreCells: high16.geometry.core.count, sourcePostMatches: true },
    b09MaintenanceOnly: {
      activeShuttleCommissioned: true, passengerTransportCommissioned: false, publicTransportCommissioned: false,
      protectedCellCount: maintenanceCells.length, protectedCellSetSha256: hashCells(maintenanceCells), sourceStateSetSha256: stateSetHash(maintenanceStates),
      inactivePoweredRailCount: 15, terminalStopCount: 2, offControlCount: 2, authenticatedMinecartCount: 1,
      lowerVoid: { cells: lowerVoid.length, geometry: '6x2x1', allAir: true, stateSetSha256: stateSetHash(lowerVoidStates), platformAccepted: false },
    },
    passengerSystem: { stationPairsAccepted: 0, directionalGuidewaysAccepted: 0, passengerPlatformsAccepted: 0, signalPowerBlocksAccepted: 0, independentRescueDischargesAccepted: 0, closedTrialsAccepted: 0, bidirectionalOperatingReturnAccepted: false },
  },
  separationRules: {
    high16CivilWorkIsPassengerAuthority: false, b09MaintenanceShuttleIsPassengerAuthority: false, passiveRailIsPassengerAuthority: false,
    maintenanceControlsReusableForPassengerPower: false, passengerServiceMayShareMaintenanceLane: false,
    oneWayTrialMayOpenService: false, oneExitMayOpenService: false, historicSnapshotMayAuthorizeMutation: false,
  },
  acceptanceGates,
  acceptanceRule: { allGateCount: acceptanceGates.length, acceptedGateCount: 0, sameFreshImmutablePostRequired: true, everyGateRequired: true, passengerOpeningAllowed: false, futureCompilerNeedsNewSource: true },
  nonclaims: { passengerRailwayCommissioned: false, publicStationOpen: false, passengerRouteOpen: false, passengerRescueCommissioned: false, passengerTrialCompleted: false, b09Converted: false },
};

const out = abs(OUT_DIR);
const doc = abs(DOC);
const tableRows = acceptanceGates.map(({ id, requirement }) => `| ${id} | 0 | ${requirement} |`).join('\n');
const markdown = `# SYS03 passenger-rail commissioning acceptance gate 01\n\n**Status:** \`${contract.status}\`\n\nThis source-bound gate makes the distinction explicit: High-16 is a sealed civil\nvoid and B09 is a protected maintenance asset. Neither is passenger rail. This\nartifact is read-only; it makes no operation, RCON call, release manifest, or\nopening decision.\n\n![Current-source commissioning gate map](../../${rel(path.join(OUT_DIR, 'sys03-passenger-commissioning-gate-map.svg'))})\n\n## Bound source and observed state\n\n- Complete immutable capture: \`${contract.source.captureId}\` (${contract.source.verifiedRequiredMemberCount} required members).\n- Region identity: \`${region.sha256}\` (${region.fileCount} files).\n- High-16: ${contract.observedCurrentState.high16.connectedCivilStations} connected civil stations; civil-only is retained.\n- B09: ${maintenanceCells.length} protected maintenance cells (${15} inactive powered rails, two protected stops, two off controls, one authenticated cart). Its lower void is ${lowerVoid.length} air cells at \`6×2×1\`, not an accepted platform.\n- Passenger facts accepted on this source: zero station pairs, platforms, directional guideways, controls, rescue discharges, closed trials, and return-service acceptances.\n\n## Every gate is required\n\n| Gate | Accepted now | Required evidence |\n| --- | ---: | --- |\n${tableRows}\n\n## Hard separation\n\n- Civil corridors, lights, passive rail, a maintenance cart, or a one-way traversal are **not** passenger-service evidence.\n- B09 remains physically and operationally separate; its controls cannot be repurposed.\n- No partial, one-way, one-exit, or maintenance-lane opening is permitted.\n- Any future physical package starts from a fresh snapshot and independently passes the full guarded release kernel.\n\n## Verification\n\n\`node scripts/validate_sys03_passenger_rail_commissioning_acceptance_gate_01.mjs\`\n\`npx vitest run test/build/sys03PassengerRailCommissioningGate.test.ts\`\n`;
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(path.dirname(doc), { recursive: true });
fs.writeFileSync(path.join(out, 'sys03-passenger-rail-commissioning-acceptance-gate-01.json'), `${JSON.stringify(contract, null, 2)}\n`);
fs.writeFileSync(path.join(out, 'sys03-passenger-commissioning-gate-map.svg'), svg(contract));
fs.writeFileSync(path.join(out, 'SYS03-PASSENGER-RAIL-COMMISSIONING-ACCEPTANCE-GATE-01.md'), markdown.replace(`../../${rel(path.join(OUT_DIR, 'sys03-passenger-commissioning-gate-map.svg'))}`, 'sys03-passenger-commissioning-gate-map.svg'));
fs.writeFileSync(doc, markdown);
console.log(JSON.stringify({ status: contract.status, contractId: contract.id, mutationAuthority: false, acceptedGateCount: 0, requiredGateCount: acceptanceGates.length, passengerServiceCommissioned: false, b09ProtectedCells: maintenanceCells.length }));
