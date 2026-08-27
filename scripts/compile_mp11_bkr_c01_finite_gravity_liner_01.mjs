#!/usr/bin/env node
/** Offline compiler for the source-bound C01 EXP-G11 gravity liner package. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, replLine, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd(); const args = process.argv.slice(2);
const option = (flag, fallback) => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const SNAPSHOT = option('--snapshot', 'data/worldsnap-mp11-bkr-c01-independent-return-01-post-20260827T014500Z');
const DESIGN = option('--design', 'data/world-review/mp11-bkr-c01-finite-gravity-liner-design-02-independent-return-post-20260827T014500Z/mp11-bkr-c01-finite-gravity-liner-design-01.json');
const AUTH = option('--auth', 'docs/masterplans/11-town-expansion-r1/mp11-bkr-c01-finite-gravity-liner-governor-standing-execution-authorization.json');
const OUT = option('--out', 'data/buildops/mp11-bkr-c01-finite-gravity-liner-01-independent-return-post-20260827T014500Z');
// The original G11 package remains the default.  A later finite component can
// reuse this exact compiler only by pinning its own release identity and every
// observed count below; there is no wildcard "next component" mode.
const RELEASE = option('--release-id', 'MP11-BKR-C01-FINITE-GRAVITY-LINER-01');
const RELEASE_NODE = option('--release-node', 'MP11-BKR-C01-FINITE-GRAVITY-LINER');
const RELEASE_SLUG = option('--release-slug', 'mp11-bkr-c01-finite-gravity-liner-01');
const EXPECTED_COMPONENT = option('--expected-component', 'EXP-G11');
const EXPECTED_COUNT = Number(option('--expected-count', '34'));
const EXPECTED_HALO = Number(option('--expected-halo', '204'));
const WRAPPER = option('--wrapper', 'scripts/run_mp11_bkr_c01_finite_gravity_liner_release.mjs');
const abs = (value) => path.resolve(ROOT, value); const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`MP11/BKR C01 finite gravity liner compiler rejected: ${message}`); };
const key = (point) => `${point.x},${point.y},${point.z}`;
const pointKey = (point) => Array.isArray(point) ? point.join(',') : key(point);
const pointHash = (points) => sha(points.map(pointKey).sort().join('\n'));
const stateHash = (records) => sha(records.map((record) => `${key(record.cell)}=${record.targetState}`).sort().join('\n'));
const nameOf = (state) => String(state).split('[', 1)[0];
const gravity = (state) => ['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:pointed_dripstone'].includes(nameOf(state)) || nameOf(state).endsWith('_concrete_powder');
const fluid = (state) => ['minecraft:water', 'minecraft:flowing_water', 'minecraft:lava', 'minecraft:flowing_lava', 'minecraft:bubble_column'].includes(nameOf(state)) || state.includes('waterlogged=true');
const protectedState = (state) => ['minecraft:bedrock', 'minecraft:barrier', 'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw', 'minecraft:end_portal', 'minecraft:end_gateway'].includes(nameOf(state));

const root = abs(SNAPSHOT);
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(root, member)), `missing immutable source ${member}`);
const capturePath = path.join(root, 'combined-zones-complete-save-capture.json'); const captureBytes = fs.readFileSync(capturePath); const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && capture.captureId, 'source is not an immutable complete-save capture');
const designPath = abs(DESIGN); const designBytes = fs.readFileSync(designPath); const design = JSON.parse(designBytes);
const authPath = abs(AUTH); const authBytes = fs.readFileSync(authPath); const auth = JSON.parse(authBytes);
fail(design.id === 'MP11-BKR-C01-FINITE-GRAVITY-LINER-DESIGN-01' && design.status === 'STATIC_DESIGN_COMPLETE_PHYSICAL_OPERATIONS_REMAIN_DENIED' && design.mutationAuthority === false, 'static liner design is not the required non-authorizing design input');
fail(design.source?.snapshot === rel(SNAPSHOT) && design.source?.captureId === capture.captureId, 'static design source binding drift');
fail(auth.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION' && auth.revoked === false && auth.authorizedReleaseId === RELEASE, 'standing authorization is absent, revoked, or does not bind this package');
const selected = design.selectedFiniteLiner;
fail(selected?.componentId === EXPECTED_COMPONENT && selected.sourceComponentCellCount === EXPECTED_COUNT && selected.fullInteractionHalo?.cellCount === EXPECTED_HALO, 'selected finite component or exact source-bound cell counts drifted from this release configuration');
fail(selected.fullInteractionHalo.fluidCellCount === 0 && selected.fullInteractionHalo.protectedIndicatorCount === 0 && selected.fullInteractionHalo.blockEntityCount === 0 && selected.fullInteractionHalo.verifiedReturnHaloIntersectionCount === 0 && selected.fullInteractionHalo.endpointVolumeIntersectionCount === 0, 'static design has unsafe interaction claims');
fail(selected.forwardDesign?.operationCount === EXPECTED_COUNT && selected.rollbackDesign?.operationCount === EXPECTED_COUNT && selected.rollbackDesign?.exactReverseOfForward === true && selected.rollbackDesign?.supportCheckPassCount === EXPECTED_COUNT, 'static no-falling inverse design is incomplete');
fail(design.safetyBoundary?.forwardOperationFilesEmitted === 0 && design.safetyBoundary?.rollbackOperationFilesEmitted === 0 && design.safetyBoundary?.releaseManifestEmitted === false, 'static design unexpectedly contains mutation artifacts');

const reader = new AnvilReader(path.join(root, 'region')); const sourceCache = new Map();
async function source(cell) { const sourceKey = key(cell); if (!sourceCache.has(sourceKey)) sourceCache.set(sourceKey, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z))); return sourceCache.get(sourceKey); }
const forward = selected.forwardDesign.order.map((record) => ({ cell: { x: record.point[0], y: record.point[1], z: record.point[2] }, sourceState: record.sourceState, targetState: record.targetState, role: record.role }));
const rollback = selected.rollbackDesign.order.map((record) => ({ cell: { x: record.point[0], y: record.point[1], z: record.point[2] }, sourceState: record.sourceState, targetState: record.targetState, role: record.role }));
fail(forward.length === EXPECTED_COUNT && new Set(forward.map((record) => key(record.cell))).size === EXPECTED_COUNT, 'forward canonical cells are not exactly unique');
fail(forward.every((record) => record.targetState === 'minecraft:smooth_stone' && gravity(record.sourceState)), 'forward source/target mapping is not a gravity-to-smooth-stone liner');
for (let index = 0; index < forward.length; index += 1) {
  const inverse = rollback[rollback.length - 1 - index]; const record = forward[index];
  fail(key(inverse.cell) === key(record.cell) && inverse.sourceState === record.targetState && inverse.targetState === record.sourceState, `rollback is not exact forward reverse at ${index}`);
  fail(await source(record.cell) === record.sourceState, `source state drift at ${key(record.cell)}`);
}
const halo = new Map();
for (const record of forward) for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) {
  const cell = { x: record.cell.x + dx, y: record.cell.y + dy, z: record.cell.z + dz }; halo.set(key(cell), cell);
}
fail(halo.size === EXPECTED_HALO && pointHash([...halo.values()]) === selected.fullInteractionHalo.cellSetSha256, 'full interaction halo drifted from static design');
const targetKeys = new Set(forward.map((record) => key(record.cell))); const sourceGravity = []; const sourceFluids = []; const sourceProtected = [];
for (const cell of halo.values()) { const state = await source(cell); if (gravity(state)) sourceGravity.push({ cell, state }); if (fluid(state)) sourceFluids.push({ cell, state }); if (protectedState(state)) sourceProtected.push({ cell, state }); }
fail(sourceFluids.length === 0 && sourceProtected.length === 0, `unsafe source halo: fluids=${sourceFluids.length} protected=${sourceProtected.length}`);
fail(sourceGravity.length === forward.length && sourceGravity.every((record) => targetKeys.has(key(record.cell))), 'gravity exists outside selected liner or selected component drifted');
const haloCells = [...halo.values()]; const minX = Math.min(...haloCells.map((cell) => cell.x)); const maxX = Math.max(...haloCells.map((cell) => cell.x)); const minZ = Math.min(...haloCells.map((cell) => cell.z)); const maxZ = Math.max(...haloCells.map((cell) => cell.z)); const blockEntities = [];
for (let chunkX = Math.floor(minX / 16); chunkX <= Math.floor(maxX / 16); chunkX += 1) for (let chunkZ = Math.floor(minZ / 16); chunkZ <= Math.floor(maxZ / 16); chunkZ += 1) {
  const chunk = await reader.chunk(chunkX, chunkZ);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) { const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) }; if (halo.has(key(cell))) blockEntities.push({ cell, id: String(entity.id ?? 'unknown') }); }
}
fail(blockEntities.length === 0, `block entity intersects source halo: ${JSON.stringify(blockEntities.slice(0, 3))}`);
const projectedStates = new Map(forward.map((record) => [key(record.cell), record.targetState]));
for (const cell of halo.values()) { const state = projectedStates.get(key(cell)) ?? await source(cell); fail(!fluid(state) && !gravity(state) && !protectedState(state), `unsafe projected halo at ${key(cell)}=${state}`); }
const retainedHaloStates = [];
for (const cell of halo.values()) if (!targetKeys.has(key(cell))) retainedHaloStates.push({ cell, sourceState: await source(cell) });

const out = abs(OUT); fail(!fs.existsSync(out), '--out must be fresh'); fs.mkdirSync(out, { recursive: true });
const forwardBody = `${forward.map((record) => replLine(record.cell, record.sourceState, record.targetState)).join('\n')}\n`; const rollbackBody = `${rollback.map((record) => replLine(record.cell, record.sourceState, record.targetState)).join('\n')}\n`;
const forwardPath = path.join(out, `${RELEASE_SLUG}.forward.txt`); const rollbackPath = path.join(out, `${RELEASE_SLUG}.rollback.txt`);
fs.writeFileSync(forwardPath, forwardBody); fs.writeFileSync(rollbackPath, rollbackBody);
const manifestBase = {
  schemaVersion: 1, id: RELEASE, transactionId: RELEASE_SLUG, releaseNodeId: RELEASE_NODE,
  status: 'OFFLINE_COMPILED_AWAITING_FRESH_GUARDED_KERNEL', mode: 'SOURCE_BOUND_ATOMIC_GUARDED_OPERATION_PACKAGE', mutationAuthority: false,
  scopedRunner: { wrapper: WRAPPER, defaultMode: 'PREPARE_ONLY', liveExecutionOptIn: '--execute' },
  source: { snapshot: rel(SNAPSHOT), captureManifest: rel(capturePath), captureManifestSha256: sha(captureBytes), captureId: capture.captureId, staticDesign: { path: rel(DESIGN), sha256: sha(designBytes), identity: design.designIdentitySha256 }, authorization: { path: rel(AUTH), sha256: sha(authBytes), standingExecutionAuthorization: true, executionAuthorizedByThisManifest: false } },
  target: { componentId: selected.componentId, canonicalPostStates: forward.map((record) => ({ cell: record.cell, targetState: record.targetState, role: record.role })), canonicalPostStateCellCount: forward.length, canonicalPostStateSha256: stateHash(forward), changedCellCount: forward.length, changedCellSetSha256: pointHash(forward.map((record) => record.cell)), targetState: 'minecraft:smooth_stone' },
  interactionSet: { fullHaloCells: haloCells.sort((left, right) => left.y - right.y || left.x - right.x || left.z - right.z), fullHaloCellCount: halo.size, fullHaloCellSetSha256: pointHash(haloCells), retainedHaloCanonicalStates: retainedHaloStates, retainedHaloCellCount: retainedHaloStates.length, retainedHaloStateSha256: sha(retainedHaloStates.map((record) => `${key(record.cell)}=${record.sourceState}`).sort().join('\n')), sourceFluidCount: sourceFluids.length, sourceGravityCount: sourceGravity.length, sourceProtectedCoreCount: sourceProtected.length, sourceBlockEntityCount: blockEntities.length, projectedFluidCount: 0, projectedGravityCount: 0, projectedProtectedCoreCount: 0 },
  endpointsAndReturns: { endpointVolumesChanged: false, returnHaloChanged: false, sourceDesignEndpointIntersectionCount: selected.fullInteractionHalo.endpointVolumeIntersectionCount, sourceDesignReturnHaloIntersectionCount: selected.fullInteractionHalo.verifiedReturnHaloIntersectionCount, nonClaim: 'The liner is return- and endpoint-disjoint containment only; it does not open, widen, reclassify, or commission a route or endpoint.' },
  operations: { forward: { path: rel(forwardPath), sha256: sha(forwardBody), commandCount: forward.length, strictNoopRequired: true, order: 'bottom-up permanent-liner-first' }, rollback: { path: rel(rollbackPath), sha256: sha(rollbackBody), commandCount: rollback.length, strictNoopRequired: true, exactInverseOfForward: true, order: 'top-down exact source restoration with lower liner retained until higher gravity restoration completes' } },
  atomicity: { forwardPackages: [RELEASE_SLUG], rollbackPackages: [RELEASE_SLUG], forwardOrderFixed: true, rollbackOrderFixed: true, partialFailureRule: 'Stop immediately; use the exact committed suffix inverse in reverse order only after fresh source/post guard review.' },
  hardSafetyKernel: { requiresFreshCompleteImmutableSourceImmediatelyBeforeExecution: true, requiresStaticDesignRebind: true, requiresSourceAndProjectedRollbackPreflight: true, requiresBlockEntityAndProtectedCoreClearance: true, requiresStrictNoopForwardAndRollbackParserChecks: true, requiresFreshLiveEntityClearance: true, requiresJournaledStrictExecution: true, requiresFreshPostCaptureAndRollbackPreflight: true, requiresIndependentPostQa: true },
  nonClaims: ['No RCON call or Minecraft mutation occurred during compilation.', 'No endpoint opening, route widening, public access, commissioning, or egress claim.', 'This manifest does not itself execute the package; the scoped wrapper defaults to prepare-only and must pass its fresh kernel before any future --execute.'],
};
const manifest = { ...manifestBase, manifestIdentitySha256: sha(`${JSON.stringify(manifestBase, null, 2)}\n`) };
fs.writeFileSync(path.join(out, `${RELEASE_SLUG}.manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: manifest.status, out: rel(out), manifestIdentity: manifest.manifestIdentitySha256, forwardCommands: forward.length, rollbackCommands: rollback.length, haloCells: halo.size, mutationAuthority: false }, null, 2));
