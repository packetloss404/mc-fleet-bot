#!/usr/bin/env node
/** Offline-only compiler for the post-C01-08 public independent return. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, replLine, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd(); const args = process.argv.slice(2);
const option = (flag, fallback) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const SNAPSHOT = option('--snapshot', 'data/worldsnap-mp11-bkr-c01-approach-gravity-containment-08-post-20260828T040000Z');
const DESIGN = option('--design', 'data/world-review/mp11-c01-public-vertical-switchback-return-02-c01-08-post-20260828T043000Z/mp11-c01-public-vertical-switchback-return-02.json');
const SURVEY = option('--survey', 'data/world-review/bkr-survey-00-c01-08-post-20260828T040000Z/bkr-survey-00.json');
const AUTH = option('--authorization', 'docs/masterplans/11-town-expansion-r1/mp11-c01-public-independent-return-02-prepare-authorization.json');
const OUT = option('--out', 'data/buildops/mp11-c01-public-independent-return-02-c01-08-post-20260828T043000Z');
const abs = (file) => path.resolve(ROOT, file); const rel = (file) => path.relative(ROOT, abs(file)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (ok, message) => { if (!ok) throw new Error(`MP11 C01 public independent-return compiler rejected: ${message}`); };
const key = (point) => point.join(','); const pointHash = (points) => sha(points.map(key).sort().join('\n'));
const stateHash = (items, field = 'targetState') => sha(items.map((item) => `${key(item.point)}=${item[field]}`).sort().join('\n'));
const name = (state) => String(state).split('[', 1)[0]; const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const fluid = (state) => ['minecraft:water', 'minecraft:flowing_water', 'minecraft:lava', 'minecraft:flowing_lava', 'minecraft:bubble_column'].includes(name(state)) || state.includes('waterlogged=true');
const gravity = (state) => ['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:pointed_dripstone'].includes(name(state)) || name(state).endsWith('_concrete_powder');
const protectedState = (state) => ['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern', 'minecraft:beacon', 'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw', 'minecraft:end_portal', 'minecraft:end_gateway'].includes(name(state)) || name(state).endsWith('_shulker_box');

const root = abs(SNAPSHOT); for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(root, member)), `missing complete immutable source member ${member}`);
const capturePath = path.join(root, 'combined-zones-complete-save-capture.json'); const captureBytes = fs.readFileSync(capturePath); const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && capture.captureId, 'source capture is not immutable and complete');
const designBytes = fs.readFileSync(abs(DESIGN)); const design = JSON.parse(designBytes);
const surveyBytes = fs.readFileSync(abs(SURVEY)); const survey = JSON.parse(surveyBytes);
const authBytes = fs.readFileSync(abs(AUTH)); const authorization = JSON.parse(authBytes);
fail(design.id === 'MP11-C01-PUBLIC-VERTICAL-SWITCHBACK-RETURN-DESIGN-02' && design.mutationAuthority === false, 'design is absent or has mutation authority');
fail(design.source?.captureId === capture.captureId && design.source?.snapshot === rel(SNAPSHOT), 'design/source capture identity drift');
fail(survey.source?.snapshot?.captureId === capture.captureId && survey.source.snapshot.rootDirectory === rel(SNAPSHOT), 'survey/source capture identity drift');
fail(authorization.status === 'AUTHORIZED_PREPARE_ONLY_SOURCE_BOUND_COMPILATION' && authorization.releaseId === 'MP11-C01-PUBLIC-INDEPENDENT-RETURN-02' && authorization.prepareOnlyAuthorized === true && authorization.executionAuthorized === false && authorization.rconAuthorized === false && authorization.worldMutationAuthorized === false && authorization.revoked === false, 'prepare-only authorization is absent, broad, revoked, or mismatched');
const geometry = design.candidateGeometry?.independentReturn;
fail(geometry?.stationCount === 28 && Array.isArray(geometry.stations) && Array.isArray(geometry.candidateTargetGeometry?.cells), '28-station independent return geometry missing');
const rawTargets = geometry.candidateTargetGeometry.cells;
const target = new Map();
for (const cell of rawTargets) {
  fail(Array.isArray(cell.point) && cell.point.length === 3 && typeof cell.state === 'string' && typeof cell.role === 'string', 'invalid canonical target cell');
  const prior = target.get(key(cell.point)); fail(!prior || (prior.targetState === cell.state && prior.role === cell.role), `canonical target collision at ${key(cell.point)}`);
  target.set(key(cell.point), { point: cell.point, targetState: cell.state, role: cell.role });
}
fail(target.size === rawTargets.length && target.size === geometry.candidateTargetGeometry.cellCount, 'target identity/count drift');
const targetRecords = [...target.values()].sort((a, b) => a.point[1] - b.point[1] || a.point[0] - b.point[0] || a.point[2] - b.point[2]);
fail(stateHash(targetRecords) === geometry.candidateTargetGeometry.targetStateSha256, 'canonical target-state hash drift');
const reader = new AnvilReader(path.join(root, 'region')); const cache = new Map();
async function source(point) { const id = key(point); if (!cache.has(id)) cache.set(id, stateToCommandString(await reader.blockState(...point))); return cache.get(id); }
const halo = new Map(); for (const record of targetRecords) for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) { const point = [record.point[0] + dx, record.point[1] + dy, record.point[2] + dz]; halo.set(key(point), point); }
fail(halo.size === geometry.sourceInteractionHalo.cellCount, 'design interaction halo count drift');
const hazardCells = []; for (const point of halo.values()) { const state = await source(point); if (fluid(state) || gravity(state) || protectedState(state)) hazardCells.push({ point, state }); }
fail(hazardCells.length === 0, `fluid/gravity/protected state in interaction halo: ${JSON.stringify(hazardCells.slice(0, 4))}`);
const haloPoints = [...halo.values()]; const minX = Math.min(...haloPoints.map((point) => point[0])); const maxX = Math.max(...haloPoints.map((point) => point[0])); const minZ = Math.min(...haloPoints.map((point) => point[2])); const maxZ = Math.max(...haloPoints.map((point) => point[2]));
const blockEntities = [];
for (let cx = Math.floor(minX / 16); cx <= Math.floor(maxX / 16); cx += 1) for (let cz = Math.floor(minZ / 16); cz <= Math.floor(maxZ / 16); cz += 1) { const chunk = await reader.chunk(cx, cz); for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) { const point = [Number(entity.x), Number(entity.y), Number(entity.z)]; if (halo.has(key(point))) blockEntities.push({ point, id: String(entity.id ?? 'unknown') }); } }
fail(blockEntities.length === 0, `block entity intersects independent-return interaction halo: ${JSON.stringify(blockEntities.slice(0, 4))}`);
for (const contract of Object.values(design.endpointInterfaceContracts ?? {})) for (const cell of [...(contract.supportRow?.cells ?? []), ...(contract.clearFace?.cells ?? [])]) fail(await source(cell.point) === cell.state, `interface source state drift at ${key(cell.point)}`);
const publicRoute = survey.namedSurveyBoxes?.find((box) => box.boxId === 'publicC01')?.routes?.find((route) => route.routeId === 'TE-ROUTE-C01-PUBLIC-VERTICAL');
fail(publicRoute?.stationCount === 89, 'current protected public route absent');
const currentHalo = new Set(); for (const station of publicRoute.stations.slice(1, -1)) for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) currentHalo.add(key([station.point[0] + dx, station.point[1] + dy, station.point[2] + dz]));
const returnCurrentIntersection = [...halo.keys()].filter((id) => currentHalo.has(id)); fail(returnCurrentIntersection.length === 0, 'independent return no longer disjoint from current protected route halo');
const changed = []; for (const record of targetRecords) { const sourceState = await source(record.point); if (sourceState !== record.targetState) changed.push({ ...record, sourceState }); }
fail(changed.length > 0, 'package is a strict no-op on this source');
const rank = (record) => record.role === 'five-wide-tread' || record.role === 'fold-landing' || record.role === 'fold-landing-transition' ? 0 : 1;
const forward = changed.slice().sort((a, b) => rank(a) - rank(b) || (rank(a) === 1 ? b.point[1] - a.point[1] : a.point[1] - b.point[1]) || a.point[0] - b.point[0] || a.point[2] - b.point[2]);
const rollback = forward.slice().reverse().map((record) => ({ point: record.point, sourceState: record.targetState, targetState: record.sourceState, role: record.role }));
const forwardBody = `${forward.map((record) => replLine({ x: record.point[0], y: record.point[1], z: record.point[2] }, record.sourceState, record.targetState)).join('\n')}\n`;
const rollbackBody = `${rollback.map((record) => replLine({ x: record.point[0], y: record.point[1], z: record.point[2] }, record.sourceState, record.targetState)).join('\n')}\n`;
const canonicalSourceStates = await Promise.all(targetRecords.map(async (record) => ({ point: record.point, sourceState: await source(record.point), targetState: record.targetState, role: record.role })));
const out = abs(OUT); fail(!fs.existsSync(out), '--out must be fresh'); fs.mkdirSync(out, { recursive: true });
const forwardPath = path.join(out, 'mp11-c01-public-independent-return-02.forward.txt'); const rollbackPath = path.join(out, 'mp11-c01-public-independent-return-02.rollback.txt');
fs.writeFileSync(forwardPath, forwardBody); fs.writeFileSync(rollbackPath, rollbackBody);
const base = {
  schemaVersion: 1, id: 'MP11-C01-PUBLIC-INDEPENDENT-RETURN-02', transactionId: 'mp11-c01-public-independent-return-02', releaseNodeId: 'MP11-C01-PUBLIC-INDEPENDENT-RETURN',
  status: 'OFFLINE_COMPILED_PREPARE_ONLY_REQUIRES_FRESH_EXECUTION_KERNEL', mode: 'SOURCE_BOUND_GUARDED_PACKAGE_COMPILE_ONLY', mutationAuthority: false,
  source: { snapshot: rel(SNAPSHOT), captureManifest: rel(capturePath), captureManifestSha256: sha(captureBytes), captureId: capture.captureId, design: { path: rel(DESIGN), sha256: sha(designBytes), identity: design.designIdentitySha256 }, survey: { path: rel(SURVEY), sha256: sha(surveyBytes) }, authorization: { path: rel(AUTH), sha256: sha(authBytes), prepareOnlyAuthorized: true, executionAuthorized: false } },
  ownershipAndInterfaces: { roles: { scopeOwner: authorization.scopeOwner, counterpart: authorization.counterpart, designOwner: authorization.designOwner }, contracts: design.endpointInterfaceContracts },
  route: { returnStations: geometry.stations, stationCount: geometry.stationCount, orderedReturnStationSha256: geometry.orderedStationSha256, lowerToUpperStationSha256: sha([...geometry.stations].reverse().map((station) => key(station.point)).join('\n')), publicClearance: geometry.publicClearance, currentProtectedRouteInteriorHaloIntersectionCount: returnCurrentIntersection.length, retainedConnectors: design.retainedPublicLandingConnectors },
  target: { allCanonicalPostStates: targetRecords, canonicalSourceStates, canonicalPostStateCellCount: targetRecords.length, canonicalPostStateSha256: stateHash(targetRecords), canonicalSourceStateSha256: stateHash(canonicalSourceStates, 'sourceState'), changedCellCount: changed.length, changedCellSetSha256: pointHash(changed.map((record) => record.point)) },
  operations: { forward: { path: rel(forwardPath), sha256: sha(forwardBody), commandCount: forward.length, strictNoopRequired: true, ordering: 'all supporting floor/tread/landing targets first; all clearance targets high-to-low second' }, rollback: { path: rel(rollbackPath), sha256: sha(rollbackBody), commandCount: rollback.length, strictNoopRequired: true, exactInverseOfForward: true, ordering: 'exact reverse of forward operation records' } },
  safety: { interactionHaloCellCount: halo.size, interactionHaloCellSetSha256: pointHash([...halo.values()]), sourceFluidGravityProtectedCount: hazardCells.length, sourceBlockEntityCount: blockEntities.length, currentProtectedRouteHaloDisjoint: true },
  projectedFunctionalQa: { runner: 'scripts/qa_mp11_c01_public_independent_return_02_projected.mjs', requiredBeforePreparePass: true, note: 'Projection is not immutable post-state evidence.' },
  executionHardStops: ['Fresh complete immutable source immediately before any execute-mode mutation.', 'Fresh live entity clearance, exact source preflight, strict parser checks, journaled strict execution, fresh post snapshot, rollback post-state preflight, and independent immutable post QA.', 'Separate execution authorization; this package authorization is intentionally prepare-only.'],
  nonClaims: ['No live world mutation or RCON call.', 'No route opening, egress commissioning, or public usability claim.', 'The package cannot authorize its own execution.'],
};
const manifest = { ...base, manifestIdentitySha256: sha(`${JSON.stringify(base, null, 2)}\n`) };
fs.writeFileSync(path.join(out, 'mp11-c01-public-independent-return-02.manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
for (const asset of ['mp11-c01-public-vertical-switchback-return-02-plan.svg', 'mp11-c01-public-vertical-switchback-return-02-elevation.svg']) {
  const sourceAsset = path.join(path.dirname(abs(DESIGN)), asset);
  fail(fs.existsSync(sourceAsset), `design map missing ${asset}`);
  fs.copyFileSync(sourceAsset, path.join(out, asset.replace('switchback-return', 'independent-return-package')));
}
console.log(JSON.stringify({ status: manifest.status, mutationAuthority: false, canonicalTargetCells: targetRecords.length, changedCells: changed.length, forwardCommands: forward.length, rollbackCommands: rollback.length, interactionHaloCells: halo.size, out: rel(out) }, null, 2));
