#!/usr/bin/env node
/**
 * B09 operating-system acceptance gate.
 *
 * This is intentionally a read-only contract compiler.  It binds the current
 * complete source and names the exact evidence required before a future
 * physical compiler can exist.  It never writes an operation, manifest, or
 * RCON command.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const SNAPSHOT = value('--snapshot', 'data/worldsnap-mp01-service-staging-anvil-repair-live-post-20260826T163300Z');
const OUT_DIR = value('--out-dir', 'data/world-review/mp05-b09-operating-system-acceptance-contract-01-current-mp01-anvil-post-20260826T163300Z');
const DOC = value('--doc', 'docs/masterplans/05-combined-zones/MP05-B09-OPERATING-SYSTEM-ACCEPTANCE-CONTRACT-01-2026-08-26.md');
const GENERATED_AT = value('--generated-at', '2026-08-26T17:20:00.000Z');

const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const fail = (condition, message) => { if (!condition) throw new Error(`MP05 B09 operating-system gate rejected: ${message}`); };
const cellsIn = (bounds) => {
  const cells = [];
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) for (let y = bounds.minY; y <= bounds.maxY; y += 1) for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) cells.push({ x, y, z });
  return cells;
};
const boundsOf = (cells) => cells.length === 0 ? null : ({
  minX: Math.min(...cells.map((cell) => cell.x)), maxX: Math.max(...cells.map((cell) => cell.x)),
  minY: Math.min(...cells.map((cell) => cell.y)), maxY: Math.max(...cells.map((cell) => cell.y)),
  minZ: Math.min(...cells.map((cell) => cell.z)), maxZ: Math.max(...cells.map((cell) => cell.z)),
});
const exactSet = (cells) => ({ cellCount: cells.length, bounds: boundsOf(cells), coordinateSetSha256: hashCells(cells) });
const binding = (filename) => ({ path: rel(filename), sha256: sha256(fs.readFileSync(abs(filename))), bytes: fs.statSync(abs(filename)).size });
const stateSetHash = (records) => sha256(`mp05-b09-operating-system-source-state-v1\n${records.slice().sort((a, b) => cellKey(a.cell).localeCompare(cellKey(b.cell))).map(({ cell, state }) => `${cellKey(cell)}=${state}`).join('\n')}\n`);

function hashRegion(directory) {
  const digest = crypto.createHash('sha256');
  const names = fs.readdirSync(directory).filter((name) => name.endsWith('.mca')).sort();
  for (const name of names) { digest.update(name); digest.update('\0'); digest.update(fs.readFileSync(path.join(directory, name))); digest.update('\0'); }
  return { sha256: digest.digest('hex'), count: names.length };
}

function mapSvg({ source, protectedCells, lowerVoid }) {
  const cells = 21;
  const xMin = 2046; const xMax = 2075; const zMin = -756; const zMax = -741;
  const px = (x) => 105 + (x - xMin) * cells;
  const pz = (z) => 82 + (zMax - z) * cells;
  const rect = (cell, fill, opacity = 0.65) => `<rect x="${px(cell.x)}" y="${pz(cell.z)}" width="${cells}" height="${cells}" fill="${fill}" fill-opacity="${opacity}" stroke="#172033" stroke-width="0.6"/>`;
  const seam = cellsIn({ minX: 2047, maxX: 2049, minY: 130, maxY: 130, minZ: -749, maxZ: -747 });
  const cap = cellsIn({ minX: 2050, maxX: 2050, minY: 130, maxY: 130, minZ: -749, maxZ: -747 });
  const grid = [];
  for (let x = xMin; x <= xMax + 1; x += 1) grid.push(`<line x1="${px(x)}" y1="82" x2="${px(x)}" y2="${pz(zMin) + cells}" class="grid"/>`);
  for (let z = zMin; z <= zMax + 1; z += 1) grid.push(`<line x1="105" y1="${pz(z)}" x2="${px(xMax) + cells}" y2="${pz(z)}" class="grid"/>`);
  const labels = [
    ['#f59e0b', 'B08/B09 sealed seam (36 cells)'], ['#64748b', 'B09 west cap (12 diorite cells)'],
    ['#38bdf8', 'lower void (6×2×1; not a platform)'], ['#7f1d1d', 'R12R blocks + parked-cart envelope'],
    ['#9ca3af', 'all operating-system cells: 0 accepted'],
  ].map(([colour, label], index) => `<rect x="${105 + (index % 2) * 345}" y="${455 + Math.floor(index / 2) * 24}" width="13" height="13" fill="${colour}"/><text x="${124 + (index % 2) * 345}" y="${466 + Math.floor(index / 2) * 24}" class="legend">${label}</text>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="780" height="535" viewBox="0 0 780 535">\n<style>.title{font:700 20px sans-serif;fill:#e8eef7}.sub{font:13px sans-serif;fill:#c5d0df}.axis{font:10px monospace;fill:#c5d0df}.legend{font:12px sans-serif;fill:#dbe5f2}.grid{stroke:#3b4a61;stroke-width:.7}</style><rect width="780" height="535" fill="#0d1624"/><text x="28" y="31" class="title">B09 lower operating-system gate — source-bound state</text><text x="28" y="53" class="sub">y=130 · source ${source.regionSha256.slice(0, 16)}… · red is protected maintenance-only, not station authority</text>${grid.join('')}\n${seam.map((cell) => rect(cell, '#f59e0b')).join('')}${cap.map((cell) => rect(cell, '#64748b')).join('')}${lowerVoid.filter((cell) => cell.y === 130).map((cell) => rect(cell, '#38bdf8')).join('')}${protectedCells.filter((cell) => cell.y === 130).map((cell) => rect(cell, '#7f1d1d')).join('')}<text x="${px(2047)}" y="${pz(-750) - 8}" class="axis">sealed B08</text><text x="${px(2050)}" y="${pz(-750) - 8}" class="axis">cap</text><text x="${px(2052)}" y="${pz(-750) - 8}" class="axis">6×2 void</text><text x="${px(2060)}" y="${pz(-750) - 8}" class="axis">R12R</text><text x="105" y="421" class="sub">Required before a future compiler: owned platform/barrier + normal-walk; two endpoint contracts; independent power/drive/brake; drainage/outfall; 6×6 rescue corridor; two protected discharges; cart preserve or exact migration/inverse.</text>${labels}</svg>\n`;
}

const capturePath = path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json');
const currentStudy = 'data/world-review/mp05-b09-c02-c03-route-rescue-current-anvil-post-20260826T163300Z/c02-c03-route-rescue-dependency-study.json';
const interfaceStudy = 'data/world-review/mp05-b09-b08-interface-egress-feasibility-current-anvil-post-20260826T163300Z/b08-b09-interface-egress-feasibility.json';
const commissioning = 'data/world-review/combined-zones-r12-b09-bounded-transport-commissioning/r12-b09-commissioning.json';
const capture = readJson(capturePath);
const c03 = readJson(currentStudy);
const feasibility = readJson(interfaceStudy);
const r12r = readJson(commissioning);
const region = hashRegion(abs(path.join(SNAPSHOT, 'region')));

fail(capture.immutableCopy === true && capture.requiredMembers?.length === 130, 'source is not a complete immutable 130-member capture');
for (const member of capture.requiredMembers) {
  const bytes = fs.readFileSync(path.join(abs(SNAPSHOT), member.path));
  fail(bytes.length === member.bytes && sha256(bytes) === member.sha256, `captured source member drifted: ${member.path}`);
}
fail(region.count === 52 && region.sha256 === c03.source.regionSha256 && c03.source.snapshotRoot === rel(SNAPSHOT), 'C03 study no longer binds this complete source');
fail(feasibility.source.regionSha256 === region.sha256 && feasibility.source.snapshotRoot === rel(SNAPSHOT), 'lower-interface study no longer binds this complete source');
fail(r12r.commissionedSystem?.activeShuttleCommissioned === true && r12r.commissionedSystem?.persistentTaggedMinecartCount === 1, 'R12R maintenance system binding drifted');

const lowerVoid = cellsIn({ minX: 2051, maxX: 2056, minY: 130, maxY: 131, minZ: -748, maxZ: -748 });
const westCap = cellsIn({ minX: 2050, maxX: 2050, minY: 129, maxY: 132, minZ: -749, maxZ: -747 });
const poweredRails = cellsIn({ minX: 2058, maxX: 2072, minY: 130, maxY: 130, minZ: -748, maxZ: -748 });
const stops = [{ x: 2057, y: 130, z: -748 }, { x: 2073, y: 130, z: -748 }];
const controls = [{ x: 2061, y: 130, z: -747 }, { x: 2070, y: 130, z: -747 }];
const protectedCells = [...stops, ...poweredRails, ...controls];
const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region')));
const records = [];
for (const cell of [...lowerVoid, ...westCap, ...protectedCells]) records.push({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
const states = new Map(records.map(({ cell, state }) => [cellKey(cell), state]));
fail(lowerVoid.every((cell) => states.get(cellKey(cell)) === 'minecraft:air'), 'lower void source state drifted');
fail(westCap.every((cell) => states.get(cellKey(cell)) === 'minecraft:polished_diorite'), 'B09 west-cap source state drifted');
fail(poweredRails.every((cell) => states.get(cellKey(cell)) === 'minecraft:powered_rail[powered=false,shape=east_west,waterlogged=false]'), 'R12R parked powered-rail state drifted');
fail(stops.every((cell) => states.get(cellKey(cell)) === 'minecraft:polished_diorite'), 'R12R terminal-stop state drifted');
fail(controls.every((cell) => states.get(cellKey(cell)) === 'minecraft:lever[face=wall,facing=north,powered=false]'), 'R12R parked control state drifted');

const requiredGates = [
  { id: 'OS-01-PLATFORM-NORMAL-WALK', requirement: 'An exact owned platform plus independent normal-walk approach, with source/post state sets, forward/inverse, and route QA.', currentAcceptedCells: 0, currentStatus: 'NOT_ACCEPTED__LOWER_VOID_IS_6X2X1_ONLY' },
  { id: 'OS-02-EDGE-BARRIER-AND-FAILURE-CLOSURE', requirement: 'Exact physical track-edge barrier/gates with normal, unpowered/failure, and rollback states.', currentAcceptedCells: 0, currentStatus: 'NOT_ACCEPTED__NO_BARRIER_OR_GATE_CELLS' },
  { id: 'OS-03-ENDPOINT-OWNERS-AND-RECEIVERS', requirement: 'Both B08 and Z11 directional contracts: named owner, receiver, protected continuation, source/post/inverse, and failure state.', currentAcceptedCells: 0, currentStatus: 'NOT_ACCEPTED__B08_36_AND_Z11_12_CELL_INTERFACES_SEALED' },
  { id: 'OS-04-POWER-DRIVE-BRAKE-OVERSPEED', requirement: 'Independent normal/emergency power and exact drive, brake, overspeed, stop, recovery, and failure-state evidence; R12R levers may not be repurposed.', currentAcceptedCells: 0, currentStatus: 'NOT_ACCEPTED__15_R12R_RAILS_PARKED_AND_TWO_CONTROLS_OFF' },
  { id: 'OS-05-DRAINAGE-OUTFALL-AND-RECEIVER', requirement: 'Exact inflow, liner, sump, flow path, outfall, receiver, failure behavior, and inverse; the under-rail carrier is not a drainage system.', currentAcceptedCells: 0, currentStatus: 'NOT_ACCEPTED__NO_DRAINAGE_SYSTEM_ACCEPTED' },
  { id: 'OS-06-SEPARATED-RESCUE-AND-REFUGE', requirement: 'Owned 6×6 clear service route, 3×3 lockable cross-passages at <=128 blocks, refuge/passing design, and two protected independent discharges.', currentAcceptedCells: 0, currentStatus: 'NOT_ACCEPTED__0_OF_2_DISCHARGES_AND_C03_GEOMETRY_ONLY' },
  { id: 'OS-07-RETURN-AND-FAILURE-ROUTE', requirement: 'End-to-end normal-walk return and separately tested failure/evacuation route through accepted receivers.', currentAcceptedCells: 0, currentStatus: 'NOT_ACCEPTED__NO_RETURN_OR_FAILURE_ROUTE' },
  { id: 'OS-08-R12R-CART-PRESERVE-OR-MIGRATION', requirement: 'Exact non-overlap plus fresh live entity clearance, or one entity-first minecart migration and exact inverse migration transaction.', currentAcceptedCells: 0, currentStatus: 'NOT_ACCEPTED__SAVED_CART_FACT_IS_NOT_LIVE_CLEARANCE_OR_MIGRATION' },
  { id: 'OS-09-FRESH-RELEASE-KERNEL', requirement: 'Only after OS-01..08: a new complete immutable source, source preflight, strict-noop forward/reverse, journaled execution, post snapshot, and rollback post-preflight.', currentAcceptedCells: 0, currentStatus: 'NOT_ACCEPTED__THIS_DESIGN_SOURCE_CANNOT_BE_REUSED_AS_RELEASE_AUTHORITY' },
];
const contract = {
  schemaVersion: 1,
  id: 'MP05-B09-OPERATING-SYSTEM-ACCEPTANCE-CONTRACT-01',
  generatedAtUtc: GENERATED_AT,
  status: 'SOURCE_BOUND_DEFAULT_DENY__B09_REMAINS_R12R_MAINTENANCE_ONLY',
  disposition: { readOnly: true, mutationAuthority: false, operationsCompiled: false, releaseAuthorization: false, liveCallsPerformed: false, worldMutationsPerformed: false },
  source: { snapshotRoot: rel(SNAPSHOT), completeSaveSha256: c03.source.completeSaveSha256, regionSha256: region.sha256, regionFileCount: region.count, captureId: capture.captureId, capture: binding(capturePath), inputs: [binding(currentStudy), binding(interfaceStudy), binding(commissioning)] },
  exactCurrentState: {
    lowerVoid: { ...exactSet(lowerVoid), requiredPlatformMinimum: { width: 6, height: 3 }, currentGeometry: { width: 6, height: 2, depth: 1 }, stateSetSha256: stateSetHash(lowerVoid.map((cell) => ({ cell, state: states.get(cellKey(cell)) }))) },
    sealedWestCap: { ...exactSet(westCap), stateSetSha256: stateSetHash(westCap.map((cell) => ({ cell, state: states.get(cellKey(cell)) }))) },
    r12rMaintenanceProtection: { ...exactSet(protectedCells), stateSetSha256: stateSetHash(protectedCells.map((cell) => ({ cell, state: states.get(cellKey(cell)) }))), poweredRailCells: poweredRails.length, terminalStopCells: stops.length, offControlCells: controls.length, authenticatedMinecart: { tag: 'cz_r12_7464210e11d51e28eb4e133e2d40fd0b', savedPosition: { x: 2058.4900000095367, y: 130.0625, z: -747.5 }, transactionOccupancyEnvelope: { minX: 2058, maxX: 2073, minY: 130, maxY: 131, minZ: -748, maxZ: -747 } }, },
    endpoints: { b08DefaultDenyCells: 36, z11DefaultDenyCells: 12, independentProtectedDischargesAccepted: 0, requiredIndependentProtectedDischarges: 2 },
  },
  requiredGates,
  transitionRule: { allGatesMustBeAccepted: true, partialOrOneWayOpeningAllowed: false, passiveRailIsPassengerAuthority: false, r12rControlsReusable: false, savedEntityObservationIsLiveClearance: false, laterContractCanCompileOperations: false, physicalCompilerRequiresFreshContract: true },
  nonclaims: { publicStation: false, passengerService: false, rescueService: false, fullFunicular: false, platformBuilt: false, barrierBuilt: false, drainageBuilt: false, cartMigrationAuthorized: false },
};

const rows = requiredGates.map((gate) => `| ${gate.id} | ${gate.currentAcceptedCells} | ${gate.currentStatus.replaceAll('_', ' ')} |`).join('\n');
const markdown = `# MP05 B09 operating-system acceptance contract 01\n\nStatus: **${contract.status}**\n\nThis is a strict, source-bound default-deny gate. It creates no operations or release authorization. The only commissioned operation retained by this source is the protected R12R maintenance shuttle.\n\n## Bound source\n\n- Snapshot: \`${contract.source.snapshotRoot}\`\n- Complete-save SHA-256: \`${contract.source.completeSaveSha256}\`\n- Region SHA-256: \`${contract.source.regionSha256}\` (${contract.source.regionFileCount} files)\n- 130-member capture: \`${contract.source.captureId}\`\n\n![B09 lower operating-system source map](../../../${rel(path.join(OUT_DIR, 'b09-operating-system-source-map.svg'))})\n\n## Current exact state\n\n- Lower void: ${contract.exactCurrentState.lowerVoid.cellCount} air cells, \`6×2×1\`; it is not a platform or normal-walk approach.\n- West cap: ${contract.exactCurrentState.sealedWestCap.cellCount} polished-diorite cells, still sealed.\n- R12R protection: ${contract.exactCurrentState.r12rMaintenanceProtection.cellCount} cells (${poweredRails.length} parked powered rails, ${stops.length} stops, ${controls.length} off controls) and one tagged minecart.\n- Endpoint discharge acceptance: ${contract.exactCurrentState.endpoints.independentProtectedDischargesAccepted}/${contract.exactCurrentState.endpoints.requiredIndependentProtectedDischarges}.\n\n## Required gates\n\n| Gate | Accepted cells now | Current result |\n| --- | ---: | --- |\n${rows}\n\nA later design must satisfy every gate with exact source/post states, ownership, inverse and functional evidence. It must then acquire a new source and pass the complete guarded release kernel; this contract never becomes an executable package.\n\n## Verification\n\n\`node scripts/validate_mp05_b09_operating_system_acceptance_contract_01.mjs\`\n\`npx vitest run test/build/mp05B09OperatingSystemAcceptanceContract.test.ts\`\n`;

fs.mkdirSync(abs(OUT_DIR), { recursive: true });
fs.mkdirSync(path.dirname(abs(DOC)), { recursive: true });
fs.writeFileSync(abs(path.join(OUT_DIR, 'mp05-b09-operating-system-acceptance-contract-01.json')), `${JSON.stringify(contract, null, 2)}\n`);
fs.writeFileSync(abs(path.join(OUT_DIR, 'b09-operating-system-source-map.svg')), mapSvg({ source: contract.source, protectedCells, lowerVoid }));
fs.writeFileSync(abs(path.join(OUT_DIR, 'MP05-B09-OPERATING-SYSTEM-ACCEPTANCE-CONTRACT-01.md')), markdown);
fs.writeFileSync(abs(DOC), markdown);
console.log(JSON.stringify({ status: contract.status, contractId: contract.id, mutationAuthority: false, requiredGateCount: requiredGates.length, acceptedGateCount: 0, r12rProtectedCells: protectedCells.length, acceptedRescueDischarges: 0 }));
