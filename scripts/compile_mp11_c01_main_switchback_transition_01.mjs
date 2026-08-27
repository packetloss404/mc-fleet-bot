#!/usr/bin/env node
/**
 * Offline compiler for the first C01 main-switchback physical release.
 * It is source-bound and emits only strict guarded-operation text plus a
 * manifest/projected functional QA. It cannot perform RCON or world mutation.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, replLine, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const opt = (flag, fallback) => { const i = args.indexOf(flag); return i < 0 ? fallback : (args[i + 1] ?? fallback); };
const SNAPSHOT = opt('--snapshot', 'data/worldsnap-masterplan-frontier-refresh-20260827T053500Z');
const CONTRACT = opt('--contract', 'data/world-review/mp11-c01-main-switchback-transition-return02-preservation-05-frontier-refresh-20260827T053500Z/mp11-c01-main-switchback-transition-return02-preservation-05.json');
const DESIGN = opt('--return-design', 'data/world-review/mp11-c01-public-independent-return-02-live-20260827T023000Z/rebound/public-return-design/mp11-c01-public-vertical-switchback-return-02.json');
const RETURN_MANIFEST = opt('--return-manifest', 'data/world-review/mp11-c01-public-independent-return-02-live-20260827T023000Z/rebound/compile/mp11-c01-public-independent-return-02.manifest.json');
const OUT = opt('--out', 'data/buildops/mp11-c01-main-switchback-transition-01-frontier-refresh-20260827T053500Z');
const GENERATED = opt('--generated-at', '2026-08-27T05:50:00.000Z');
const abs = (p) => path.resolve(ROOT, p);
const rel = (p) => path.relative(ROOT, abs(p)).split(path.sep).join('/');
const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');
const bytes = (p) => fs.readFileSync(abs(p));
const read = (p) => JSON.parse(bytes(p));
const ref = (p) => ({ path: rel(p), sha256: sha(bytes(p)) });
const fail = (ok, message) => { if (!ok) throw new Error(`C01 main-switchback compiler rejected: ${message}`); };
const p = (entry) => ({ x: entry.point[0], y: entry.point[1], z: entry.point[2] });
const key3 = (c) => `${c.x},${c.y},${c.z}`;
const hashState = (records, stateField) => sha(records.map((r) => `${key3(r.cell)}=${r[stateField]}`).sort().join('\n'));
const stateName = (state) => state.split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const fluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(stateName(state)) || state.includes('waterlogged=true');
const gravity = (state) => ['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:pointed_dripstone'].includes(stateName(state)) || stateName(state).endsWith('_concrete_powder');
const protectedOrContainer = (state) => ['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern', 'minecraft:beacon', 'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw', 'minecraft:end_portal', 'minecraft:end_gateway'].includes(stateName(state)) || stateName(state).endsWith('_shulker_box');
const exact = (cells) => ({ cellCount: uniqueCells(cells).length, coordinateSetSha256: hashCells(uniqueCells(cells)) });
const RESOLVED_WALL_STATE = 'minecraft:polished_deepslate_wall[east=none,north=none,south=none,up=true,waterlogged=false,west=none]';

for (const required of [`${SNAPSHOT}/region`, `${SNAPSHOT}/entities`, `${SNAPSHOT}/poi`, `${SNAPSHOT}/level.dat`, `${SNAPSHOT}/combined-zones-complete-save-capture.json`, CONTRACT, DESIGN, RETURN_MANIFEST]) fail(fs.existsSync(abs(required)), `missing required source/design file: ${required}`);
fail(!fs.existsSync(abs(OUT)), '--out must be fresh');
const captureBytes = bytes(`${SNAPSHOT}/combined-zones-complete-save-capture.json`);
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && capture.requiredMembers?.length === 130, 'complete immutable 130-member source required');
for (const member of capture.requiredMembers) {
  const file = abs(path.join(SNAPSHOT, member.path));
  fail(fs.existsSync(file) && fs.statSync(file).size === member.bytes && sha(fs.readFileSync(file)) === member.sha256, `capture member drift: ${member.path}`);
}

const contract = read(CONTRACT), design = read(DESIGN), returnManifest = read(RETURN_MANIFEST);
fail(contract.id === 'MP11-C01-MAIN-SWITCHBACK-TRANSITION-RETURN02-PRESERVATION-05' && contract.status === 'SOURCE_BOUND_TRANSITION_SEMANTICS_SELECTED__NO_COMPILER_OR_RELEASE_AUTHORITY' && contract.mutationAuthority === false, 'transition contract is not source-bound design-only evidence');
fail(contract.source?.snapshot === rel(SNAPSHOT) && contract.source?.captureId === capture.captureId && contract.source?.captureManifestSha256 === sha(captureBytes), 'contract/source identity drift');
fail(contract.source.design?.sha256 === sha(bytes(DESIGN)) && contract.source.returnManifest?.sha256 === sha(bytes(RETURN_MANIFEST)), 'contract input identity drift');
fail(contract.controlledRouteTransition?.currentProtectedRouteTargetCellCount === 0 && contract.controlledRouteTransition?.selectedRouteClosureState === 'NONE', 'contract wrongly selects current-route retirement or closure');
fail(contract.retainedReturn?.verifiedAgainstFreshSource === true && contract.retainedReturn.currentCanonicalStateMismatchCount === 0 && contract.retainedReturn.mainTargetIntersectionCount === 0, 'Return-02 preservation precondition failed');
fail(design.id === 'MP11-C01-PUBLIC-VERTICAL-SWITCHBACK-RETURN-DESIGN-02' && design.mutationAuthority === false, 'main geometry design is invalid');
fail(returnManifest.id === 'MP11-C01-PUBLIC-INDEPENDENT-RETURN-02' && returnManifest.mutationAuthority === false, 'Return-02 manifest is invalid');

const main = design.candidateGeometry?.mainSwitchback;
fail(main?.id === 'C01-PUBLIC-SWITCHBACK-MAIN-02' && main.stations?.length === 30 && main.candidateTargetGeometry?.cells?.length === 828, 'exact main switchback geometry missing');
const mainCells = main.candidateTargetGeometry.cells.map((entry) => ({ cell: p(entry), targetState: entry.state, role: entry.role }));
fail(exact(mainCells.map((r) => r.cell)).cellCount === contract.selectedGeometry.mainLane.targetDesignGeometry.cellCount && exact(mainCells.map((r) => r.cell)).coordinateSetSha256 === contract.selectedGeometry.mainLane.targetDesignGeometry.coordinateSetSha256, 'main design geometry drifted from transition contract');
const guardCells = contract.selectedGeometry?.handrailAndGuard?.cells?.map((entry) => ({ cell: p(entry), targetState: RESOLVED_WALL_STATE, role: entry.role })) ?? [];
fail(guardCells.length === 100 && contract.selectedGeometry?.handrailAndGuard?.cells?.every((entry) => entry.targetState === 'minecraft:polished_deepslate_wall'), 'exact 100-cell PDS guard/handrail design contract required');
const target = new Map();
for (const record of [...mainCells, ...guardCells]) {
  const id = key3(record.cell); const prior = target.get(id);
  fail(!prior || (prior.targetState === record.targetState && prior.role === record.role), `target collision: ${id}`);
  target.set(id, record);
}
const canonical = [...target.values()].sort((a, b) => a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z);
fail(canonical.length === 928, 'canonical main plus guard target count must be 928');

const returnCanonical = returnManifest.target?.allCanonicalPostStates ?? [];
fail(returnCanonical.length === contract.retainedReturn.canonicalPostStateGeometry.cellCount, 'Return-02 canonical count drift');
const returnSet = new Set(returnCanonical.map((entry) => `${entry.point.join(',')}`));
fail(canonical.every((record) => !returnSet.has(key3(record.cell))), 'main/guard canonical target intersects Return-02');
const reader = new AnvilReader(abs(`${SNAPSHOT}/region`));
const entityReader = new AnvilReader(abs(`${SNAPSHOT}/entities`));
const cache = new Map();
const stateAt = async (cell) => { const id = key3(cell); if (!cache.has(id)) cache.set(id, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z))); return cache.get(id); };
const sourceRecords = [];
for (const record of canonical) sourceRecords.push({ ...record, sourceState: await stateAt(record.cell) });
const targetKeys = new Set(canonical.map((record) => key3(record.cell)));
const halo = uniqueCells(canonical.flatMap(({ cell }) => [
  { x: cell.x - 1, y: cell.y, z: cell.z }, { x: cell.x + 1, y: cell.y, z: cell.z },
  { x: cell.x, y: cell.y - 1, z: cell.z }, { x: cell.x, y: cell.y + 1, z: cell.z },
  { x: cell.x, y: cell.y, z: cell.z - 1 }, { x: cell.x, y: cell.y, z: cell.z + 1 },
]).filter((cell) => !targetKeys.has(key3(cell))));
const unsafe = [];
for (const cell of [...canonical.map((record) => record.cell), ...halo]) {
  const state = await stateAt(cell);
  if (fluid(state) || gravity(state) || protectedOrContainer(state)) unsafe.push({ cell, state });
}
fail(unsafe.length === 0, `fluid/gravity/container/protected source intersects canonical target or halo: ${JSON.stringify(unsafe.slice(0, 4))}`);
const allGeometry = [...canonical.map((record) => record.cell), ...halo];
const bounds = { minX: Math.min(...allGeometry.map((c) => c.x)), maxX: Math.max(...allGeometry.map((c) => c.x)), minY: Math.min(...allGeometry.map((c) => c.y)), maxY: Math.max(...allGeometry.map((c) => c.y)), minZ: Math.min(...allGeometry.map((c) => c.z)), maxZ: Math.max(...allGeometry.map((c) => c.z)) };
const within = (c) => c.x >= bounds.minX && c.x <= bounds.maxX && c.y >= bounds.minY && c.y <= bounds.maxY && c.z >= bounds.minZ && c.z <= bounds.maxZ;
const chunks = new Set(allGeometry.map((c) => `${Math.floor(c.x / 16)},${Math.floor(c.z / 16)}`));
const blockEntities = [], savedEntities = [];
for (const id of chunks) {
  const [x, z] = id.split(',').map(Number); const chunk = await reader.chunk(x, z), entities = await entityReader.chunk(x, z);
  for (const be of chunk?.block_entities ?? chunk?.blockEntities ?? []) { const cell = { x: Number(be.x), y: Number(be.y), z: Number(be.z) }; if (within(cell)) blockEntities.push({ cell, id: be.id ?? be.Id ?? null }); }
  for (const entity of entities?.Entities ?? entities?.entities ?? []) { const position = entity.Pos?.slice?.(0, 3).map(Number); if (position?.length === 3) { const cell = { x: Math.floor(position[0]), y: Math.floor(position[1]), z: Math.floor(position[2]) }; if (within(cell)) savedEntities.push({ cell, id: entity.id ?? entity.Id ?? null }); } }
}
fail(blockEntities.length === 0 && savedEntities.length === 0, 'block entity or saved entity in target/halo bounds');

const endpointFailures = [];
for (const endpoint of [design.endpointInterfaceContracts?.mainUpper, design.endpointInterfaceContracts?.mainLower]) for (const entry of [...(endpoint?.clearFace?.cells ?? []), ...(endpoint?.supportRow?.cells ?? [])]) {
  const cell = p(entry); const actual = await stateAt(cell); if (actual !== entry.state) endpointFailures.push({ cell, expected: entry.state, actual });
}
fail(endpointFailures.length === 0, 'main 5x5 endpoint source state drift');
const returnFailures = [];
for (const record of returnCanonical) { const cell = p(record); const actual = await stateAt(cell); if (actual !== record.targetState) returnFailures.push({ cell, expected: record.targetState, actual }); }
fail(returnFailures.length === 0, 'Return-02 canonical state drift');

const projected = new Map(canonical.map((record) => [key3(record.cell), record.targetState]));
const projectedState = async (cell) => projected.get(key3(cell)) ?? stateAt(cell);
const routeFailures = [];
const checkRoute = async (id, stations) => {
  for (const station of stations) {
    const point = station.point ?? station; const axis = station.axis;
    for (let cross = -2; cross <= 2; cross++) {
      const cell = { x: axis === 'z' ? point[0] + cross : point[0], y: point[1], z: axis === 'x' ? point[2] + cross : point[2] };
      const support = await projectedState({ ...cell, y: cell.y - 1 });
      if (AIR.has(stateName(support)) || fluid(support)) routeFailures.push({ id, kind: 'support', cell: { ...cell, y: cell.y - 1 }, state: support });
      for (let dy = 0; dy < 5; dy++) { const clear = await projectedState({ ...cell, y: cell.y + dy }); if (!AIR.has(stateName(clear)) || fluid(clear)) routeFailures.push({ id, kind: 'clearance', cell: { ...cell, y: cell.y + dy }, state: clear }); }
    }
  }
  const ordered = stations.map((station) => station.point ?? station);
  for (const direction of [ordered, [...ordered].reverse()]) for (let i = 1; i < direction.length; i++) {
    const a = direction[i - 1], b = direction[i];
    if (Math.abs(a[0] - b[0]) + Math.abs(a[2] - b[2]) !== 1 || Math.abs(a[1] - b[1]) > 1) routeFailures.push({ id, kind: 'normal-walk-transition', from: a, to: b });
  }
};
await checkRoute('MAIN', main.stations);
await checkRoute('RETURN02', returnManifest.route.returnStations);
fail(routeFailures.length === 0, `projected main/Return-02 route QA failed: ${JSON.stringify(routeFailures.slice(0, 4))}`);

const changed = sourceRecords.filter((record) => record.sourceState !== record.targetState);
fail(changed.length > 0, 'compiler produced strict no-op package');
const group = (record) => record.role === 'two-high-guard-handrail' ? 'handrail-guard' : (record.role === 'five-clear-high-envelope' ? 'main-clearance' : 'main-tread-landing');
const groupOrder = ['main-tread-landing', 'main-clearance', 'handrail-guard'];
const sortForward = (a, b) => groupOrder.indexOf(group(a)) - groupOrder.indexOf(group(b)) || a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z;
const forward = changed.slice().sort(sortForward);
const rollback = forward.slice().reverse().map((record) => ({ cell: record.cell, sourceState: record.targetState, targetState: record.sourceState, role: record.role }));
const body = (records) => `${records.map((record) => replLine(record.cell, record.sourceState, record.targetState)).join('\n')}\n`;
const forwardBody = body(forward), rollbackBody = body(rollback);
const out = abs(OUT); fs.mkdirSync(out, { recursive: true });
const forwardPath = path.join(out, 'mp11-c01-main-switchback-transition-01.forward.txt');
const rollbackPath = path.join(out, 'mp11-c01-main-switchback-transition-01.rollback.txt');
fs.writeFileSync(forwardPath, forwardBody); fs.writeFileSync(rollbackPath, rollbackBody);
const manifestBase = {
  schemaVersion: 1, id: 'MP11-C01-MAIN-SWITCHBACK-TRANSITION-01', generatedAtUtc: GENERATED,
  status: 'OFFLINE_COMPILED_GUARDED_RELEASE_REQUIRES_FRESH_LIVE_KERNEL', mode: 'SOURCE_BOUND_COMPILE_ONLY', mutationAuthority: false,
  source: { snapshot: rel(SNAPSHOT), captureId: capture.captureId, captureManifestSha256: sha(captureBytes), requiredMemberCount: capture.requiredMembers.length, transitionContract: ref(CONTRACT), design: ref(DESIGN), retainedReturnManifest: ref(RETURN_MANIFEST) },
  ownership: contract.ownership,
  scope: { mainStations: main.stations, stationCount: 30, mainCanonicalTargets: exact(mainCells.map((r) => r.cell)), guardHandrailTargets: exact(guardCells.map((r) => r.cell)), canonicalTargetUnion: exact(canonical.map((r) => r.cell)), currentProtectedRouteRetirementTargetCellCount: 0, currentRouteClosureState: 'NONE' },
  canonicalStates: { source: sourceRecords.map((r) => ({ point: [r.cell.x, r.cell.y, r.cell.z], sourceState: r.sourceState, role: r.role })), target: canonical.map((r) => ({ point: [r.cell.x, r.cell.y, r.cell.z], targetState: r.targetState, role: r.role })), sourceStateSha256: hashState(sourceRecords, 'sourceState'), targetStateSha256: hashState(canonical, 'targetState'), dynamicWallConnectionResolution: { applicableRole: 'two-high-guard-handrail', sourceDesignState: 'minecraft:polished_deepslate_wall', canonicalPostState: RESOLVED_WALL_STATE, rationale: 'All selected guards are isolated from other guards and adjacent target fabric under the exact selected geometry; Minecraft normalizes the placed wall to this full connection state.' } },
  retainedReturn02: { canonicalStateGeometry: contract.retainedReturn.canonicalPostStateGeometry, canonicalStates: returnCanonical.map((record) => ({ point: record.point, targetState: record.targetState })), returnStations: returnManifest.route.returnStations, freshCanonicalStateMismatchCount: 0, mainAndGuardIntersectionCount: 0, noRetirement: true },
  safety: { interactionHalo: exact(halo), fluidGravityContainerProtectedHits: unsafe.length, blockEntityCount: blockEntities.length, savedEntityCount: savedEntities.length, endpointMismatchCount: 0 },
  operations: { forward: { path: rel(forwardPath), sha256: sha(forwardBody), commandCount: forward.length, groups: groupOrder, strictNoopRequired: true }, rollback: { path: rel(rollbackPath), sha256: sha(rollbackBody), commandCount: rollback.length, exactInverseOfForward: true, strictNoopRequired: true } },
  projectedFunctionalQa: { status: 'PASS_PROJECTED_MAIN_AND_RETURN02_TWO_WAY_NORMAL_WALK', mainStationCount: 30, retainedReturnStationCount: 28, mainLowerToUpper: true, mainUpperToLower: true, returnLowerToUpper: true, returnUpperToLower: true, failureCount: 0, postReleaseEvidence: false },
  executionHardStops: ['Recompile from a newly captured immutable source immediately before any live release.', 'Require an explicit scoped execution authorization; this compiler grants none.', 'Run target/halo protected/container/block-entity audit, fresh live-entity clearance, strict parser/source/rollback preflights, journaled execution, fresh post capture, rollback post-state preflight, and independent post QA.', 'Preserve Return-02 continuously and do not retire, close, or connect current protected-route fabric under this release.'],
  nonClaims: ['No RCON call or world mutation.', 'No public opening, egress, service, rail, power, or passenger claim.', 'Projected QA is not immutable post-release evidence.'],
};
const manifest = { ...manifestBase, manifestIdentitySha256: sha(`${JSON.stringify(manifestBase, null, 2)}\n`) };
fs.writeFileSync(path.join(out, 'mp11-c01-main-switchback-transition-01.manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: manifest.status, out: rel(OUT), canonicalTargets: canonical.length, changedTargets: changed.length, forwardCommands: forward.length, rollbackCommands: rollback.length, retainedReturnIntersectionCount: 0, projectedFunctionalQa: manifest.projectedFunctionalQa.status, mutationAuthority: false }, null, 2));
