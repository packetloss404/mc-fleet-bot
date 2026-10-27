#!/usr/bin/env node
/** Offline compiler for the corrected 105-station C01 independent return. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, replLine, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const SNAPSHOT = option('--snapshot', 'data/worldsnap-cobalt-wl-controlled-rail-inspection-transfer-post-20260826T233000Z');
const CONTRACT = option('--contract', 'data/world-review/mp11-bkr-c01-independent-return-acceptance-contract-01-cobalt-wl-post-20260826T233000Z/mp11-bkr-c01-independent-return-acceptance-contract-01.json');
const AUTH = option('--auth', 'docs/masterplans/11-town-expansion-r1/mp11-bkr-c01-independent-return-governor-standing-execution-authorization.json');
const OUT = option('--out', 'data/buildops/mp11-bkr-c01-independent-return-01-cobalt-wl-post-20260826T233000Z');
const abs = (file) => path.resolve(ROOT, file); const rel = (file) => path.relative(ROOT, abs(file)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (ok, message) => { if (!ok) throw new Error(`MP11/BKR C01 return compiler rejected: ${message}`); };
const key = (p) => `${p.x},${p.y},${p.z}`; const pHash = (items) => sha(items.map((p) => `${p.x},${p.y},${p.z}`).sort().join('\n'));
const sHash = (items) => sha(items.map((r) => `${key(r.cell)}=${r.targetState}`).sort().join('\n'));
const name = (state) => state.split('[', 1)[0];
const fluid = (state) => ['minecraft:water', 'minecraft:flowing_water', 'minecraft:lava', 'minecraft:flowing_lava', 'minecraft:bubble_column'].includes(name(state)) || state.includes('waterlogged=true');
const gravity = (state) => ['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:pointed_dripstone'].includes(name(state)) || name(state).endsWith('_concrete_powder');
const protectedState = (state) => ['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern', 'minecraft:beacon', 'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw', 'minecraft:end_portal', 'minecraft:end_gateway'].includes(name(state)) || name(state).endsWith('_shulker_box');
const root = abs(SNAPSHOT); for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(root, member)), `missing immutable source ${member}`);
const capturePath = path.join(root, 'combined-zones-complete-save-capture.json'); const captureBytes = fs.readFileSync(capturePath); const capture = JSON.parse(captureBytes); fail(capture.immutableCopy === true, 'source not immutable');
const contractPath = abs(CONTRACT); const contractBytes = fs.readFileSync(contractPath); const contract = JSON.parse(contractBytes);
const authPath = abs(AUTH); const authBytes = fs.readFileSync(authPath); const auth = JSON.parse(authBytes);
fail(contract.status === 'DESIGN_CONTRACT_COMPLETE_PHYSICAL_POSTSTATE_MAPPING_REQUIRED' && contract.mutationAuthority === false, 'acceptance contract invalid');
fail((auth.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION' && auth.revoked === false && auth.authorizedReleaseId === 'MP11-BKR-C01-INDEPENDENT-RETURN-01') || (auth.authority === 'OFFLINE_COMPILE_AND_PROJECTED_QA_ONLY' && auth.executionAuthorized === false && auth.rconAuthorized === false && auth.worldMutationAuthorized === false), 'authorization is absent, revoked, or does not bind this release');
const feasibilityFile = abs(contract.source.feasibility.path); const feasibilityBytes = fs.readFileSync(feasibilityFile); const feasibility = JSON.parse(feasibilityBytes);
fail(sha(feasibilityBytes) === contract.source.feasibility.sha256 && feasibility.feasibilityIdentitySha256 === contract.source.feasibility.identity, 'feasibility binding drift');
fail(feasibility.source?.captureId === capture.captureId && contract.source?.snapshot?.captureId === capture.captureId, `capture-ID equality failure: compiler=${capture.captureId} feasibility=${feasibility.source?.captureId} contract=${contract.source?.snapshot?.captureId}`);
const stations = feasibility.feasibility.stations; fail(stations.length === 105 && contract.finiteRoute.stationSetSha256 === feasibility.feasibility.stationSetSha256, 'station binding drift');
const reader = new AnvilReader(path.join(root, 'region')); const sourceCache = new Map();
async function source(cell) { const k = key(cell); if (!sourceCache.has(k)) sourceCache.set(k, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z))); return sourceCache.get(k); }
const target = new Map();
function put(cell, targetState, role) { const k = key(cell); const old = target.get(k); if (old && old.targetState !== targetState) throw new Error(`target conflict ${k}: ${old.targetState} vs ${targetState}`); target.set(k, { cell, targetState, roles: [...new Set([...(old?.roles ?? []), role])] }); }
function axisAt(index) { const a = stations[Math.max(0, index - 1)], b = stations[Math.min(stations.length - 1, index + 1)]; return Math.abs(b[0] - a[0]) >= Math.abs(b[2] - a[2]) ? 'x' : 'z'; }
function isLanding(index) { if (index === 0 || index === stations.length - 1) return true; const a = stations[index - 1], b = stations[index], c = stations[index + 1]; return (a[0] - b[0]) !== (b[0] - c[0]) || (a[2] - b[2]) !== (b[2] - c[2]); }
function landingOffsets(index, axis) {
  // At a descending start, the full 3×3 landing must extend behind the first
  // tread; extending it into the next lower station would occupy its required
  // three-cell clearance. Other landings are level and may be centred.
  if (index === 0) {
    const a = stations[0]; const b = stations[1];
    if (axis === 'x' && b[1] < a[1]) return [-2, -1, 0].flatMap((dx) => [-1, 0, 1].map((dz) => [dx, dz]));
    if (axis === 'z' && b[1] < a[1]) return [-1, 0, 1].flatMap((dx) => [-2, -1, 0].map((dz) => [dx, dz]));
  }
  return [-1, 0, 1].flatMap((dx) => [-1, 0, 1].map((dz) => [dx, dz]));
}
const wallCandidates = [];
for (let i = 0; i < stations.length; i += 1) {
  const [x, y, z] = stations[i]; const landing = isLanding(i); const axis = axisAt(i);
  const offsets = landing ? landingOffsets(i, axis) : (axis === 'x' ? [-1, 0, 1].map((dz) => [0, dz]) : [-1, 0, 1].map((dx) => [dx, 0]));
  for (const [dx, dz] of offsets) { put({ x: x + dx, y: y - 1, z: z + dz }, 'minecraft:smooth_stone', landing ? 'landing-floor' : 'tread-floor'); for (let dy = 0; dy <= 2; dy += 1) put({ x: x + dx, y: y + dy, z: z + dz }, 'minecraft:air', landing ? 'landing-clearance' : 'route-clearance'); put({ x: x + dx, y: y + 3, z: z + dz }, 'minecraft:smooth_stone', landing ? 'landing-ceiling' : 'route-ceiling'); }
  if (!landing) {
    const walls = axis === 'x' ? [[0, -2], [0, 2]] : [[-2, 0], [2, 0]];
    for (const [dx, dz] of walls) for (let dy = -1; dy <= 3; dy += 1) wallCandidates.push({ x: x + dx, y: y + dy, z: z + dz });
  }
}
for (const cell of wallCandidates) if (!target.has(key(cell))) put(cell, 'minecraft:smooth_stone', 'route-wall');
const records = () => [...target.values()].sort((a, b) => a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z);
const haloFor = (items) => {
  const halo = new Map();
  for (const record of items) for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) {
    const c = { x: record.cell.x + dx, y: record.cell.y + dy, z: record.cell.z + dz };
    halo.set(key(c), c);
  }
  return halo;
};
async function safetyScan(halo, projected = false) {
  let fluidCount = 0; let gravityCount = 0; let protectedStateCount = 0; const gravityCells = []; const protectedStateCells = []; const forbiddenBlockEntities = [];
  for (const c of halo.values()) {
    const st = projected ? (target.get(key(c))?.targetState ?? await source(c)) : await source(c);
    if (fluid(st)) fluidCount += 1;
    if (gravity(st)) { gravityCount += 1; gravityCells.push({ cell: c, sourceState: st }); }
    if (protectedState(st)) { protectedStateCount += 1; protectedStateCells.push({ cell: c, sourceState: st }); }
  }
  const cells = [...halo.values()];
  const minX = Math.min(...cells.map((c) => c.x)); const maxX = Math.max(...cells.map((c) => c.x));
  const minZ = Math.min(...cells.map((c) => c.z)); const maxZ = Math.max(...cells.map((c) => c.z));
  for (let cx = Math.floor(minX / 16); cx <= Math.floor(maxX / 16); cx += 1) for (let cz = Math.floor(minZ / 16); cz <= Math.floor(maxZ / 16); cz += 1) {
    const chunk = await reader.chunk(cx, cz);
    for (const e of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const c = { x: Number(e.x), y: Number(e.y), z: Number(e.z) };
      if (halo.has(key(c))) forbiddenBlockEntities.push({ cell: c, id: String(e.id ?? 'unknown') });
    }
  }
  return { fluidCount, gravityCount, gravityCells, protectedStateCount, protectedStateCells, forbiddenBlockEntities };
}
async function fullGravityComponent(seed) {
  const queue = [seed]; const seen = new Map();
  while (queue.length > 0) {
    const cell = queue.pop(); const k = key(cell);
    if (seen.has(k)) continue;
    const sourceState = await source(cell);
    if (!gravity(sourceState)) continue;
    seen.set(k, { cell, sourceState });
    fail(seen.size <= 100000, `gravity component exceeds finite compiler bound at ${k}`);
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) queue.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
  }
  return [...seen.values()];
}
// The source halo is dry but has one finite gravity component. Seal the whole
// observed component first; this is permanent support, not a temporary prop.
let targetRecords = records();
const initialHalo = haloFor(targetRecords); const initialSafety = await safetyScan(initialHalo);
fail(initialSafety.fluidCount === 0 && initialSafety.protectedStateCount === 0 && initialSafety.forbiddenBlockEntities.length === 0, `unsafe initial halo: fluid=${initialSafety.fluidCount} protected=${initialSafety.protectedStateCount} blockEntities=${initialSafety.forbiddenBlockEntities.length}`);
const gravitySeen = new Set(); const gravityComponents = [];
for (const hit of initialSafety.gravityCells) {
  if (gravitySeen.has(key(hit.cell))) continue;
  const component = await fullGravityComponent(hit.cell);
  for (const item of component) gravitySeen.add(key(item.cell));
  const states = new Set(component.map((item) => item.sourceState));
  fail(![...states].some(fluid), `gravity component contains fluid state`);
  for (const item of component) put(item.cell, 'minecraft:smooth_stone', 'gravity-containment');
  const cells = component.map((item) => item.cell);
  gravityComponents.push({
    cellCount: cells.length,
    sourceStates: [...states].sort(),
    bounds: { min: [Math.min(...cells.map((c) => c.x)), Math.min(...cells.map((c) => c.y)), Math.min(...cells.map((c) => c.z))], max: [Math.max(...cells.map((c) => c.x)), Math.max(...cells.map((c) => c.y)), Math.max(...cells.map((c) => c.z))] },
    sourceCellSetSha256: pHash(cells),
  });
}
targetRecords = records();
const halo = haloFor(targetRecords); const finalSafety = await safetyScan(halo, true);
fail(finalSafety.fluidCount === 0 && finalSafety.gravityCount === 0 && finalSafety.protectedStateCount === 0 && finalSafety.forbiddenBlockEntities.length === 0, `unsafe final halo: fluid=${finalSafety.fluidCount} gravity=${finalSafety.gravityCount} protected=${finalSafety.protectedStateCount} blockEntities=${finalSafety.forbiddenBlockEntities.length} gravitySample=${JSON.stringify(finalSafety.gravityCells.slice(0, 4))}`);
const changed = []; for (const record of targetRecords) { const sourceState = await source(record.cell); if (sourceState !== record.targetState) changed.push({ ...record, sourceState }); }
fail(changed.length > 0, 'all targets are already post-state');
const rank = (r) => r.roles.includes('gravity-containment') ? -1 : r.roles.includes('route-clearance') || r.roles.includes('landing-clearance') ? 0 : r.roles.includes('tread-floor') || r.roles.includes('landing-floor') ? 1 : r.roles.includes('route-wall') ? 2 : 3;
const forward = changed.slice().sort((a, b) => rank(a) - rank(b) || (rank(a) === 0 ? b.cell.y - a.cell.y : a.cell.y - b.cell.y) || a.cell.x - b.cell.x || a.cell.z - b.cell.z);
const rollback = forward.slice().reverse().map((r) => ({ cell: r.cell, sourceState: r.targetState, targetState: r.sourceState, roles: r.roles }));
const forwardBody = `${forward.map((r) => replLine(r.cell, r.sourceState, r.targetState)).join('\n')}\n`; const rollbackBody = `${rollback.map((r) => replLine(r.cell, r.sourceState, r.targetState)).join('\n')}\n`;
const out = abs(OUT); fail(!fs.existsSync(out), '--out must be fresh'); fs.mkdirSync(out, { recursive: true });
const fPath = path.join(out, 'mp11-bkr-c01-independent-return-01.forward.txt'); const rPath = path.join(out, 'mp11-bkr-c01-independent-return-01.rollback.txt');
fs.writeFileSync(fPath, forwardBody); fs.writeFileSync(rPath, rollbackBody);
const manifestBase = { schemaVersion: 1, id: 'MP11-BKR-C01-INDEPENDENT-RETURN-01', transactionId: 'mp11-bkr-c01-independent-return-01', releaseNodeId: 'MP11-BKR-C01-INDEPENDENT-RETURN', status: 'OFFLINE_COMPILED_AWAITING_EXACT_INTERFACE_AND_POSTSTATE_ACCEPTANCE', mode: 'SOURCE_BOUND_GUARDED_OPERATION_PACKAGE_NOT_EXECUTABLE', mutationAuthority: false, scopedRunner: { wrapper: 'scripts/run_mp11_bkr_c01_independent_return_release.mjs', authorization: rel(AUTH), defaultMode: 'PREPARE_ONLY', liveExecutionOptIn: '--execute' }, source: { snapshot: rel(SNAPSHOT), captureManifest: rel(capturePath), captureManifestSha256: sha(captureBytes), captureId: capture.captureId, captureIdEqualityAssertions: { compiler: capture.captureId, feasibility: feasibility.source.captureId, contract: contract.source.snapshot.captureId, allEqual: true }, contract: { path: rel(CONTRACT), sha256: sha(contractBytes) }, authorization: { path: rel(AUTH), sha256: sha(authBytes), standingExecutionAuthorization: auth.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION', executionAuthorizedByThisManifest: false } }, route: { topologyGateReconciliation: { existingGeometrySecondReturn: 'NOT_EVIDENCED_IN_SOURCE_BOUND_STUDY', packagePurpose: 'This package establishes the independently routed portal-to-L1 return; it does not claim a pre-existing second route.', acceptance: 'Independent immutable-post QA must prove both directed traversals of the newly built return while retaining the existing 127-station route.' }, stationCount: stations.length, stationSetSha256: feasibility.feasibility.stationSetSha256, portalEndpoint: contract.interfaces.portal.endpoint.point, l1Endpoint: contract.interfaces.l1.endpoint.point, forwardOrderedStationSha256: contract.finiteRoute.orderedForwardStationSha256, inverseOrderedStationSha256: contract.finiteRoute.orderedInverseStationSha256 }, target: { allCanonicalPostStates: targetRecords.map((r) => ({ cell: r.cell, targetState: r.targetState, roles: r.roles })), canonicalPostStateCellCount: targetRecords.length, canonicalPostStateSha256: sHash(targetRecords), changedCellCount: changed.length, changedCellSetSha256: pHash(changed.map((r) => r.cell)), desiredStateCensus: Object.fromEntries([...targetRecords.reduce((m, r) => m.set(r.targetState, (m.get(r.targetState) ?? 0) + 1), new Map()).entries()]) }, packages: [{ key: 'mp11-bkr-c01-independent-return-01', forward: rel(fPath), rollback: rel(rPath) }], executionOrder: { forward: ['mp11-bkr-c01-independent-return-01'], rollback: ['mp11-bkr-c01-independent-return-01'] }, operations: { forward: { path: rel(fPath), sha256: sha(forwardBody), commandCount: forward.length, strictNoopRequired: true, containmentFirst: true }, rollback: { path: rel(rPath), sha256: sha(rollbackBody), commandCount: rollback.length, strictNoopRequired: true, exactInverseOfForward: true, containmentLast: true } }, safety: { interactionHaloCells: [...halo.values()].sort((a, b) => a.y - b.y || a.x - b.x || a.z - b.z), interactionHaloCellCount: halo.size, interactionHaloCellSetSha256: pHash([...halo.values()]), initialSourceFluidCount: initialSafety.fluidCount, initialSourceGravityCount: initialSafety.gravityCount, initialSourceProtectedCoreCount: initialSafety.protectedStateCount, sourceFluidCountAfterContainment: finalSafety.fluidCount, sourceGravityCountAfterContainment: finalSafety.gravityCount, sourceProtectedCoreCountAfterContainment: finalSafety.protectedStateCount, sourceBlockEntityCount: finalSafety.forbiddenBlockEntities.length, gravityContainment: { permanent: true, temporarySupportUsed: false, componentCount: gravityComponents.length, cellCount: gravityComponents.reduce((sum, component) => sum + component.cellCount, 0), components: gravityComponents }, freshEntityClearanceRequired: true, protectedCoreReviewRequired: true }, postStateAcceptance: { requiresIndependentQa: true, requiredChecks: ['all canonical post states exact', '105-station forward normal-walk proof', '105-station reverse normal-walk proof', 'existing route preserved', 'dry/no-gravity and no block entity intersection', 'rollback preflight from immutable post source'] }, hardStops: { requiresFreshCompleteImmutableSourceImmediatelyBeforeExecution: true, requiresCaptureIdEqualityAcrossSurveyTopologyFeasibilityContractAndCompiler: true, requiresTargetAndHaloToRemainFluidGravityContainerAndProtectedCoreFree: true, requiresBlockEntityAndLiveEntityClearance: true, requiresStrictNoopForwardAndRollbackChecks: true, requiresExactSourcePreflight: true, requiresJournaledStrictExecution: true, requiresFreshPostSnapshotAndRollbackPoststatePreflight: true, requiresIndependentQa: true }, nonClaims: ['No RCON call or Minecraft mutation.', 'No endpoint opening, public access, or commissioning.', 'This offline manifest does not itself authorize execution; only the wrapper may use standing authorization after its fresh kernel passes.'] };
const manifest = { ...manifestBase, manifestIdentitySha256: sha(`${JSON.stringify(manifestBase, null, 2)}\n`) }; fs.writeFileSync(path.join(out, 'mp11-bkr-c01-independent-return-01.manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: manifest.status, out: rel(out), manifestIdentity: manifest.manifestIdentitySha256, canonicalPostStates: targetRecords.length, changedCells: changed.length, forwardCommands: forward.length, rollbackCommands: rollback.length, halo: halo.size, mutationAuthority: false }, null, 2));
