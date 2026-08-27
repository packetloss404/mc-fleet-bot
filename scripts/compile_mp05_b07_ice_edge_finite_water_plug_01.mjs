#!/usr/bin/env node
/** Compile the finite ice-edge water pocket into a permanent, exterior-only B07 plug. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  AnvilReader, boundsOf, cellKey, hashCells, replLine, stateToCommandString, uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const SNAPSHOT = option('--snapshot', 'data/worldsnap-mp11-bkr-c01-finite-gravity-liner-post-20260827T231000Z');
const AUTH = option('--auth', 'docs/masterplans/05-combined-zones/mp05-b07-ice-edge-finite-water-plug-governor-standing-execution-authorization.json');
const OUT = option('--out', 'data/buildops/mp05-b07-ice-edge-finite-water-plug-01-current-20260827T231000Z');
const STAMP = option('--generated-at', '2026-08-27T23:20:00.000Z');
const RELEASE = 'MP05-B07-ICE-EDGE-FINITE-WATER-PLUG-01';
const NODE = 'CZ-MP05-B07-ICE-EDGE-FINITE-WATER-PLUG';
const TX = 'mp05-b07-ice-edge-finite-water-plug-01';
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (ok, message) => { if (!ok) throw new Error(`${RELEASE} compiler rejected: ${message}`); };
const nameOf = (state) => String(state).split('[', 1)[0];
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(nameOf(state)) || state.includes('waterlogged=true');
const isGravity = (state) => ['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil'].includes(nameOf(state));
const protectedStates = new Set(['minecraft:bedrock', 'minecraft:barrier', 'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw', 'minecraft:end_portal', 'minecraft:end_gateway']);
const box = (x1, x2, y1, y2, z1, z2) => { const cells = []; for (let x = x1; x <= x2; x += 1) for (let y = y1; y <= y2; y += 1) for (let z = z1; z <= z2; z += 1) cells.push({ x, y, z }); return cells; };
const exact = (cells) => { const result = uniqueCells(cells); return { cellCount: result.length, bounds: result.length ? boundsOf(result) : null, coordinateSetSha256: hashCells(result) }; };
const stateHash = (records) => sha(records.map(({ cell, state }) => `${cellKey(cell)}=${state}`).sort().join('\n'));

const sourceRoot = abs(SNAPSHOT);
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(sourceRoot, member)), `complete immutable source missing ${member}`);
const capturePath = path.join(sourceRoot, 'combined-zones-complete-save-capture.json');
const captureBytes = fs.readFileSync(capturePath); const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && capture.captureId && Array.isArray(capture.requiredMembers), 'source capture is not immutable and complete');
for (const member of capture.requiredMembers) {
  const filename = path.join(sourceRoot, member.path);
  fail(fs.existsSync(filename) && fs.statSync(filename).size === member.bytes && sha(fs.readFileSync(filename)) === member.sha256, `source capture member drifted: ${member.path}`);
}
const authPath = abs(AUTH); const authBytes = fs.readFileSync(authPath); const auth = JSON.parse(authBytes);
fail(auth.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION' && auth.revoked === false && auth.authorizedReleaseId === RELEASE, 'standing authorization is inactive or not scoped to this release');

const reader = new AnvilReader(path.join(sourceRoot, 'region'));
const cache = new Map();
const source = async (cell) => {
  const k = cellKey(cell);
  if (!cache.has(k)) cache.set(k, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return cache.get(k);
};
const starts = [
  { x: 2105, y: 62, z: -372 }, { x: 2106, y: 62, z: -371 },
  { x: 2107, y: 62, z: -371 }, { x: 2108, y: 62, z: -371 },
];
const traceComponent = async (start) => {
  const queue = [start]; const component = new Map(); let cursor = 0;
  while (cursor < queue.length) {
    const cell = queue[cursor++]; const k = cellKey(cell);
    if (component.has(k)) continue;
    const state = await source(cell);
    if (!isFluid(state)) continue;
    component.set(k, { cell, state });
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) queue.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
    fail(component.size <= 26, 'receiver-facing source belongs to an unbounded or unexpectedly expanded component');
  }
  return [...component.values()];
};
const westComponent = await traceComponent(starts[0]);
const northComponent = await traceComponent(starts[1]);
const westKeys = new Set(westComponent.map(({ cell }) => cellKey(cell))); const northKeys = new Set(northComponent.map(({ cell }) => cellKey(cell)));
fail([...westKeys].every((key) => !northKeys.has(key)), 'the two exterior water components unexpectedly connect');
const records = [...westComponent, ...northComponent];
fail(westComponent.length === 25 && northComponent.length === 10 && records.length === 35 && records.every(({ cell, state }) => cell.y === 62 && state === 'minecraft:water[level=0]'), 'expected two finite level-zero components (west 25 + north 10) drifted');
fail(starts.slice(0, 1).every((cell) => westKeys.has(cellKey(cell))) && starts.slice(1).every((cell) => northKeys.has(cellKey(cell))), 'receiver-facing water boundary component assignment drifted');
const target = 'minecraft:polished_deepslate';
const targetKeys = new Set(records.map(({ cell }) => cellKey(cell)));
const halo = new Map();
for (const { cell } of records) for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) { const point = { x: cell.x + dx, y: cell.y + dy, z: cell.z + dz }; halo.set(cellKey(point), point); }
fail(halo.size === 249, `full interaction halo changed: ${halo.size}`);
const externalFluid = []; const gravity = []; const protectedCore = [];
for (const cell of halo.values()) {
  const state = await source(cell);
  if (!targetKeys.has(cellKey(cell)) && isFluid(state)) externalFluid.push({ cell, state });
  if (!targetKeys.has(cellKey(cell)) && isGravity(state)) gravity.push({ cell, state });
  if (protectedStates.has(nameOf(state))) protectedCore.push({ cell, state });
}
fail(externalFluid.length === 0, 'finite pocket has an unselected fluid contact in its full halo');
fail(protectedCore.length === 0, 'protected core intersects containment halo');
for (const { cell } of gravity) {
  const below = targetKeys.has(cellKey({ x: cell.x, y: cell.y - 1, z: cell.z })) ? target : await source({ x: cell.x, y: cell.y - 1, z: cell.z });
  fail(!['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(nameOf(below)) && !isFluid(below), `halo gravity loses support at ${cellKey(cell)}`);
}
const boundaryBulkhead = box(2106, 2110, 62, 65, -372, -372);
const receiverCore = box(2107, 2109, 63, 64, -380, -373);
const doors = box(2107, 2108, 63, 64, -381, -381);
for (const cell of boundaryBulkhead) fail(await source(cell) === 'minecraft:polished_deepslate', `sealed receiver bulkhead drifted at ${cellKey(cell)}`);
for (const cell of receiverCore) fail(await source(cell) === 'minecraft:air', `dry receiver core drifted at ${cellKey(cell)}`);
for (const cell of doors) fail((await source(cell)).startsWith('minecraft:oak_door['), `controlled south door drifted at ${cellKey(cell)}`);
const bounds = boundsOf([...halo.values()]); const blockEntities = [];
for (let cx = Math.floor(bounds.minX / 16); cx <= Math.floor(bounds.maxX / 16); cx += 1) for (let cz = Math.floor(bounds.minZ / 16); cz <= Math.floor(bounds.maxZ / 16); cz += 1) {
  const chunk = await reader.chunk(cx, cz);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) { const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) }; if (halo.has(cellKey(cell))) blockEntities.push({ cell, id: String(entity.id ?? 'unknown') }); }
}
fail(blockEntities.length === 0, 'block entity intersects containment halo');
const nearestContactDistance = (cell) => Math.min(...starts.map((start) => Math.abs(cell.x - start.x) + Math.abs(cell.y - start.y) + Math.abs(cell.z - start.z)));
const forward = records.slice().sort((left, right) => nearestContactDistance(right.cell) - nearestContactDistance(left.cell) || left.cell.x - right.cell.x || left.cell.z - right.cell.z);
const rollback = forward.slice().reverse().map(({ cell, state }) => ({ cell, sourceState: target, targetState: state }));
const forwardRecords = forward.map(({ cell, state }) => ({ cell, sourceState: state, targetState: target }));
for (let i = 0; i < forwardRecords.length; i += 1) {
  const inverse = rollback[rollback.length - 1 - i]; const record = forwardRecords[i];
  fail(cellKey(inverse.cell) === cellKey(record.cell) && inverse.sourceState === record.targetState && inverse.targetState === record.sourceState, `inverse mismatch at ${i}`);
}
const out = abs(OUT); fail(!fs.existsSync(out), '--out must be a fresh destination'); fs.mkdirSync(out, { recursive: true });
const forwardBody = `${forwardRecords.map((record) => replLine(record.cell, record.sourceState, record.targetState)).join('\n')}\n`;
const rollbackBody = `${rollback.map((record) => replLine(record.cell, record.sourceState, record.targetState)).join('\n')}\n`;
const forwardPath = path.join(out, `${TX}.forward.txt`); const rollbackPath = path.join(out, `${TX}.rollback.txt`);
fs.writeFileSync(forwardPath, forwardBody); fs.writeFileSync(rollbackPath, rollbackBody);
const fullHaloCanonicalPostStates = [];
for (const cell of halo.values()) fullHaloCanonicalPostStates.push({ cell, state: targetKeys.has(cellKey(cell)) ? target : await source(cell) });
const mapPath = path.join(out, 'ice-edge-finite-water-plug-plan-y62.svg');
const mapX = Array.from({ length: 20 }, (_, i) => 2094 + i); const mapZ = Array.from({ length: 16 }, (_, i) => -384 + i);
const symbol = (cell, state) => targetKeys.has(cellKey(cell)) ? 'P' : state === 'minecraft:polished_deepslate' ? 'B' : state === 'minecraft:polished_andesite' ? 'D' : state === 'minecraft:water[level=0]' ? 'W' : state === 'minecraft:ice' ? 'I' : state === 'minecraft:air' ? '.' : '#';
const mapRows = []; for (const z of mapZ) { const cells = []; for (const x of mapX) { const cell = { x, y: 62, z }; cells.push({ cell, state: await source(cell) }); } mapRows.push({ z, cells }); }
const size = 24; const left = 108; const top = 80; const colors = { P: '#1f3f54', B: '#506170', D: '#9ca8b3', W: '#1e78b4', I: '#c4efff', '.': '#f3f5f7', '#': '#75808b' };
const labels = mapX.map((x, i) => `<text x="${left + i * size + 12}" y="64" text-anchor="middle" class="tiny">${x}</text>`).join('');
const rows = mapRows.map((row, rowIndex) => `<text x="${left - 8}" y="${top + rowIndex * size + 17}" text-anchor="end" class="tiny">${row.z}</text>${row.cells.map(({ cell, state }, i) => { const mark = symbol(cell, state); return `<rect x="${left + i * size}" y="${top + rowIndex * size}" width="${size}" height="${size}" fill="${colors[mark]}"/><text x="${left + i * size + 12}" y="${top + rowIndex * size + 17}" text-anchor="middle" class="cell">${mark}</text>`; }).join('')}`).join('');
fs.writeFileSync(mapPath, `<svg xmlns="http://www.w3.org/2000/svg" width="650" height="570" viewBox="0 0 650 570"><style>.title{font:700 16px Arial}.sub{font:11px Arial;fill:#34495e}.tiny{font:9px monospace;fill:#243746}.cell{font:700 12px monospace;fill:#fff}</style><rect width="100%" height="100%" fill="#fff"/><text x="16" y="25" class="title">B07 ice-edge finite water plug — source plan Y=62</text><text x="16" y="46" class="sub">P = 35-cell permanent polished-deepslate plug · B = retained bulkhead · no access aperture is changed</text>${labels}${rows}</svg>`);
const base = {
  schemaVersion: 1, id: RELEASE, transactionId: TX, releaseNodeId: NODE, generatedAtUtc: STAMP,
  status: 'OFFLINE_COMPILED_AWAITING_FRESH_GUARDED_KERNEL', mode: 'SOURCE_BOUND_ATOMIC_FINITE_FLUID_CONTAINMENT', mutationAuthority: false,
  scopedRunner: { wrapper: 'scripts/run_mp05_b07_ice_edge_finite_water_plug_release.mjs', defaultMode: 'PREPARE_ONLY', liveExecutionOptIn: '--execute' },
  mvpScope: true, scopeIds: ['MP05-A', 'B07-ICE-EDGE-FINITE-WATER-PLUG'],
  packages: [{ key: 'finite-ice-edge-water-plug', forward: rel(forwardPath), rollback: rel(rollbackPath) }],
  executionOrder: { forward: ['finite-ice-edge-water-plug'], rollback: ['finite-ice-edge-water-plug'], rationale: 'The retained bulkhead is outside this operation in both directions; exterior-to-contact placement closes the entire finite pocket without ever changing the receiver boundary.' },
  source: { snapshot: rel(SNAPSHOT), captureManifest: rel(capturePath), captureManifestSha256: sha(captureBytes), captureId: capture.captureId, authorization: { path: rel(AUTH), sha256: sha(authBytes), standingExecutionAuthorization: true, executionAuthorizedByThisManifest: false } },
  scope: { canonicalOwner: 'MP05-B07-FINITE-ICE-EDGE-HYDROLOGY-CONTAINMENT-TEAM', purpose: 'Permanently plug the two disconnected finite exterior still-water components that directly abut the already sealed ice-edge receiver bulkhead. No bulkhead, door, receiver-core, floor, roof, aperture, route, or terrain receiver cell changes.', sourceWaterPocket: exact(records.map(({ cell }) => cell)), sourceWaterComponents: [{ id: 'WEST-25', start: starts[0], ...exact(westComponent.map(({ cell }) => cell)) }, { id: 'NORTH-10', start: starts[1], ...exact(northComponent.map(({ cell }) => cell)) }], sourceWaterStateSha256: stateHash(records), receiverFacingStarts: starts, retainedBulkhead: exact(boundaryBulkhead), retainedDryReceiverCore: exact(receiverCore), retainedControlledDoors: exact(doors) },
  target: { changedCellCount: forwardRecords.length, changedCellSetSha256: hashCells(forwardRecords.map(({ cell }) => cell)), targetState: target, canonicalPostStates: forwardRecords.map(({ cell, targetState }) => ({ cell, targetState })) },
  interactionSet: { fullHalo: exact([...halo.values()]), fullHaloCanonicalPostStates, fullHaloCanonicalPostStateSha256: stateHash(fullHaloCanonicalPostStates), sourceExternalFluidCount: externalFluid.length, sourceGravityCount: gravity.length, sourceProtectedCoreCount: protectedCore.length, sourceBlockEntityCount: blockEntities.length, projectedFluidCount: 0 },
  operations: { forward: { path: rel(forwardPath), sha256: sha(forwardBody), commandCount: forwardRecords.length, strictNoopRequired: true, order: 'farthest exterior cells to the four receiver-facing contact cells; the retained bulkhead is never touched' }, rollback: { path: rel(rollbackPath), sha256: sha(rollbackBody), commandCount: rollback.length, exactInverseOfForward: true, strictNoopRequired: true, order: 'restore receiver-facing water sources first only behind the still-retained sealed bulkhead, then reverse outward' } },
  functionalAcceptance: { classification: 'RESTRICTED_B07_ICE_EDGE_FINITE_FLUID_CONTAINMENT_ONLY', finiteComponentCount: 2, finiteComponentCellCount: 35, receiverFacingWaterEliminated: true, receiverBulkheadRemainsClosed: true, receiverCoreRemainsDry: true, publicAccessCommissioned: false, emergencyEgressCommissioned: false, terrainDischargeCommissioned: false, routeCommissioned: false },
  hardSafetyKernel: { requiresFreshCompleteImmutableSourceImmediatelyBeforeExecution: true, requiresFiniteComponentRebind: true, requiresExactSourceAndProjectedRollbackPreflight: true, requiresStrictNoopForwardAndRollbackChecks: true, requiresBlockEntityAndFreshLiveEntityClearance: true, requiresJournaledStrictExecution: true, requiresFreshPostSnapshotRollbackPreflightAndIndependentQa: true },
  maps: { sourcePlanY62: rel(mapPath) },
  nonClaims: ['Compilation made no live call or Minecraft mutation.', 'The existing closed bulkhead remains; this package opens no aperture.', 'This is not a through-route, egress, terrain discharge, B08/B09 connection, or public commissioning.'],
};
const manifest = { ...base, manifestIdentitySha256: sha(JSON.stringify(base)) };
const manifestPath = path.join(out, `${TX}.manifest.json`); fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: manifest.status, out: rel(out), manifest: rel(manifestPath), forwardCommands: forwardRecords.length, rollbackCommands: rollback.length, fullHaloCells: halo.size, finiteWaterCells: records.length, mutationAuthority: false }, null, 2));
