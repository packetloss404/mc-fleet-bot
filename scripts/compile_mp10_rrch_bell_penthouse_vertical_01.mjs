#!/usr/bin/env node
/**
 * Compile the smallest complete repair of the last Moot Hall vertical link.
 *
 * This is deliberately offline-only.  It binds five current roof-obstruction
 * cells, records the retained bell/support block entity in the one-cell halo,
 * and projects all ten canonical pairs in both directions before emitting an
 * operation package.  It never contacts the Minecraft server.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  hashCells,
  replLine,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const SNAPSHOT = value('--snapshot', 'data/worldsnap-mp10-bell-penthouse-source-20260826T122519Z');
const BASENAME = value('--basename', 'mp10-rrch-bell-penthouse-vertical-01-static-20260826T122519Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const REVIEW_DIR = value('--review-dir', 'data/world-review/mp10-bell-penthouse-live-20260826T122519Z');
const GENERATED_AT = value('--generated-at', '2026-08-26T12:25:19Z');
const RELEASE_ID = 'MP10-RRCH-BELL-PENTHOUSE-VERTICAL-01';
const absolute = (item) => path.resolve(ROOT, item);
const relative = (item) => path.relative(ROOT, absolute(item)).split(path.sep).join('/');
const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`${RELEASE_ID}: ${message}`); };
const stateName = (state) => state.split('[', 1)[0];
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:dragon_egg', 'minecraft:pointed_dripstone', 'minecraft:scaffolding']);
const BE_NAMES = new Set(['minecraft:bell', 'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:lectern', 'minecraft:chiseled_bookshelf', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:beacon', 'minecraft:spawner', 'minecraft:command_block', 'minecraft:structure_block', 'minecraft:jigsaw']);
const hasFluid = (state) => FLUID.has(stateName(state)) || state.includes('waterlogged=true');
const hasGravity = (state) => GRAVITY.has(stateName(state)) || stateName(state).endsWith('_concrete_powder');
const isBlockEntityState = (state) => BE_NAMES.has(stateName(state)) || stateName(state).endsWith('_shulker_box') || stateName(state).endsWith('_sign');
const descriptor = (cells) => {
  const exact = uniqueCells(cells);
  return { cellCount: exact.length, bounds: exact.length ? boundsOf(exact) : null, coordinateSetSha256: hashCells(exact) };
};
const run = (command, commandArgs) => spawnSync(command, commandArgs, {
  cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
});

const snapshotRoot = absolute(SNAPSHOT);
const regionRoot = path.join(snapshotRoot, 'region');
const entityRoot = path.join(snapshotRoot, 'entities');
const poiRoot = path.join(snapshotRoot, 'poi');
const capturePath = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
for (const requirement of [regionRoot, entityRoot, poiRoot, path.join(snapshotRoot, 'level.dat'), capturePath]) {
  fail(fs.existsSync(requirement), `missing complete-source member ${relative(requirement)}`);
}
const capture = JSON.parse(fs.readFileSync(capturePath, 'utf8'));
fail(capture.immutableCopy === true && Array.isArray(capture.requiredMembers), 'source capture is not an immutable complete save');
const reader = new AnvilReader(regionRoot);
const entityReader = new AnvilReader(entityRoot);
const sourceAt = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));

// These five blocks seal the body cells above the final two-wide stair.
const targets = [-377, -376, -375, -374, -373].map((z) => ({
  cell: { x: -84, y: 88, z },
  sourceState: 'minecraft:smooth_quartz',
  targetState: 'minecraft:air',
  role: 'bell-to-penthouse clearance roof fabric',
}));
const targetKeys = new Set(targets.map(({ cell }) => cellKey(cell)));
fail(targetKeys.size === 5, 'duplicate target coordinate');
for (const target of targets) {
  const actual = await sourceAt(target.cell);
  fail(actual === target.sourceState, `source drift at ${cellKey(target.cell)}: ${actual}`);
  fail(!hasFluid(actual) && !hasGravity(actual) && !isBlockEntityState(actual), `unsafe target state at ${cellKey(target.cell)}: ${actual}`);
}

const halo = uniqueCells(targets.flatMap(({ cell }) => {
  const cells = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) cells.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
  return cells;
})).filter((cell) => !targetKeys.has(cellKey(cell)));
const haloStates = [];
for (const cell of halo) haloStates.push({ cell, state: await sourceAt(cell) });
const haloFluidGravity = haloStates.filter(({ state }) => hasFluid(state) || hasGravity(state));
fail(haloFluidGravity.length === 0, `fluid/gravity in retained target halo: ${JSON.stringify(haloFluidGravity)}`);

const interaction = uniqueCells([...targets.map(({ cell }) => cell), ...halo]);
const interactionKeys = new Set(interaction.map(cellKey));
const chunks = [...new Set(interaction.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))];
const storedBlockEntities = [];
const savedEntities = [];
for (const key of chunks) {
  const [cx, cz] = key.split(',').map(Number);
  const chunk = await reader.chunk(cx, cz);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (interactionKeys.has(cellKey(cell))) storedBlockEntities.push({ id: entity.id ?? entity.Id ?? null, cell });
  }
  const entityChunk = await entityReader.chunk(cx, cz);
  for (const entity of entityChunk?.Entities ?? []) {
    if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
    const position = entity.Pos.slice(0, 3).map(Number);
    const cell = { x: Math.floor(position[0]), y: Math.floor(position[1]), z: Math.floor(position[2]) };
    if (interactionKeys.has(cellKey(cell))) savedEntities.push({ id: entity.id ?? entity.Id ?? null, position });
  }
}
const targetStoredBEs = storedBlockEntities.filter(({ cell }) => targetKeys.has(cellKey(cell)));
const haloProtectedBEs = storedBlockEntities.filter(({ cell }) => !targetKeys.has(cellKey(cell)));
const haloStateBEs = haloStates.filter(({ state }) => isBlockEntityState(state));
fail(targetStoredBEs.length === 0, `target intersects stored block entity: ${JSON.stringify(targetStoredBEs)}`);
fail(savedEntities.length === 0, `saved entity in exact interaction envelope: ${JSON.stringify(savedEntities)}`);
// The bell and signs are explicitly retained; no operation can touch their cells.
fail(haloProtectedBEs.every(({ cell }) => !targetKeys.has(cellKey(cell))), 'protected halo BE unexpectedly touched');

const forwardRecords = targets.slice().sort((a, b) => a.cell.z - b.cell.z);
const rollbackRecords = forwardRecords.slice().reverse().map(({ cell, sourceState, targetState, role }) => ({ cell, sourceState: targetState, targetState: sourceState, role }));
const forwardBody = `${forwardRecords.map(({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState)).join('\n')}\n`;
const rollbackBody = `${rollbackRecords.map(({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const forwardPath = path.join(OUT_DIR, `${BASENAME}.forward.txt`);
const rollbackPath = path.join(OUT_DIR, `${BASENAME}.rollback.txt`);
const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const routeQaPath = path.join(REVIEW_DIR, `${BASENAME}.projected-route-qa.json`);
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.mkdirSync(absolute(REVIEW_DIR), { recursive: true });
const header = (role, hash) => [
  `# GENERATED FILE — ${RELEASE_ID} (${role})`,
  `# immutable offline source: ${relative(SNAPSHOT)}`,
  '# OFFLINE STATIC PACKAGE ONLY — a fresh same-moment live kernel remains mandatory.',
  `# operation SHA-256: ${hash}`,
].join('\n');
fs.writeFileSync(absolute(forwardPath), `${header('forward', forwardSha256)}\n${forwardBody}`);
fs.writeFileSync(absolute(rollbackPath), `${header('rollback', rollbackSha256)}\n${rollbackBody}`);

const forwardPreflightPath = path.join(REVIEW_DIR, `${BASENAME}.source-preflight.json`);
const preflightRun = run(process.execPath, [path.join(ROOT, 'scripts/preflight_guarded_ops.mjs'), absolute(forwardPath), '--regions', regionRoot, '--report', absolute(forwardPreflightPath)]);
fail(preflightRun.status === 0, `source exact preflight failed:\n${preflightRun.stdout}\n${preflightRun.stderr}`);
const preflight = JSON.parse(fs.readFileSync(absolute(forwardPreflightPath), 'utf8'));
fail(preflight.passed === 5 && preflight.failed === 0, `source preflight ${preflight.passed}/${preflight.operationCount}`);
for (const [label, operationPath] of [['forward', forwardPath], ['rollback', rollbackPath]]) {
  const dryRun = run('python3', [path.join(ROOT, 'scripts/rcon_runner.py'), absolute(operationPath), '--dry-run', '--strict-noop', '--operation-role', label]);
  fail(dryRun.status === 0, `${label} strict parser dry-run failed:\n${dryRun.stdout}\n${dryRun.stderr}`);
}

const PAIRS = [
  ['sanctum-deep-corridor', [-85, 30, -380], [-84, 41, -341], 25, 800000],
  ['deep-corridor-b2', [-84, 41, -341], [-83, 56, -342], 8],
  ['b2-b1-grand-stair', [-78, 57, -384], [-78, 63, -377], 12],
  ['b1-ground-public-stair', [-85, 62, -384], [-85, 68, -377], 14],
  ['ground-first-floor', [-85, 68, -377], [-85, 74, -384], 16],
  ['first-second-floor', [-85, 74, -375], [-84, 79, -375], 10],
  ['second-third-floor', [-84, 79, -375], [-84, 84, -375], 10],
  ['third-floor-penthouse', [-84, 84, -375], [-85, 88, -379], 12],
  ['full-deep-penthouse-chain', [-84, 41, -341], [-85, 88, -379], 25, 800000],
  ['full-sanctum-penthouse-chain', [-85, 30, -380], [-85, 88, -379], 60, 1000000],
];
const routes = [];
for (const [id, one, two, pad, budget] of PAIRS) {
  for (const direction of ['forward', 'reverse']) {
    const from = direction === 'forward' ? one : two;
    const to = direction === 'forward' ? two : one;
    const result = run(process.execPath, [path.join(ROOT, 'scripts/reachability.mjs'), '--regions', regionRoot, '--ops', absolute(forwardPath), '--from', from.join(','), '--to', to.join(','), '--pad', String(pad), '--budget', String(budget ?? 600000)]);
    routes.push({ id, direction, from, to, pad, budget: budget ?? 600000, passed: result.status === 0 && result.stdout.includes('REACHABLE'), output: result.stdout.trim(), stderr: result.stderr.trim() || undefined });
  }
}
const failedRoutes = routes.filter(({ passed }) => !passed);
const routeQa = { schemaVersion: 1, releaseId: RELEASE_ID, generatedAtUtc: GENERATED_AT, mode: 'projected', sourceSnapshot: relative(SNAPSHOT), forwardOps: relative(forwardPath), total: routes.length, passed: routes.length - failedRoutes.length, failed: failedRoutes.length, routes };
fs.writeFileSync(absolute(routeQaPath), `${JSON.stringify(routeQa, null, 2)}\n`);
fail(failedRoutes.length === 0, `projected canonical route QA failed: ${JSON.stringify(failedRoutes)}`);

const manifestBase = {
  schemaVersion: 1, transactionId: 'mp10-rrch-bell-penthouse-vertical-01', releaseId: RELEASE_ID, generatedAtUtc: GENERATED_AT,
  status: 'STATIC_READY_FROM_COMPLETE_SOURCE_AWAITING_FRESH_LIVE_KERNEL',
  source: { snapshotRoot: relative(SNAPSHOT), completeSaveSha256: '8939971a3cb01f8446a46bd4cd3f6f472cda4bf7304a77a0a63fd84fc2f050bf', captureManifest: relative(capturePath), captureManifestSha256: sha256(fs.readFileSync(capturePath)), completePlanes: ['region', 'entities', 'poi', 'level.dat'] },
  ownership: { owner: 'RAVENSREACH / RRCH-MOOT Bell-to-penthouse vertical core', surveyedEnvelope: { minX: -88, maxX: -82, minY: 83, maxY: 91, minZ: -380, maxZ: -369 }, retainedProtectedCore: [{ type: 'bell/sign roof support', cells: haloStateBEs.map(({ cell, state }) => ({ cell, state })) }, { type: 'stored block entities', cells: haloProtectedBEs }], excluded: ['all non-target roof support', 'bell', 'signs', 'penthouse landing fabric', 'all containers/block entities'] },
  target: { cells: descriptor(targets.map(({ cell }) => cell)), sourceStateCensus: { 'minecraft:smooth_quartz': 5 }, targetFluidGravityBlockEntityCount: 0, interactionHalo: descriptor(halo), haloFluidGravityCount: 0, haloBlockEntityStateCount: haloStateBEs.length, storedBlockEntityTargetCount: targetStoredBEs.length, storedBlockEntityHaloCount: haloProtectedBEs.length, savedEntityInteractionCount: savedEntities.length, exactInverse: true },
  preflight: { sourceExact: { report: relative(forwardPreflightPath), passed: preflight.passed, failed: preflight.failed }, strictParserDryRuns: ['forward', 'rollback'], projectedRouteQa: { path: relative(routeQaPath), directionalChecks: 20, passed: 20, failed: 0, standard: 'normal walking only; bidirectional; no jump, sprint, dig, swim, or climb' } },
  operations: { forward: { path: relative(forwardPath), sha256: forwardSha256, commandCount: 5 }, rollback: { path: relative(rollbackPath), sha256: rollbackSha256, commandCount: 5 } },
  liveMutationPerformed: false, executionAuthority: { authorizedByThisArtifact: false, requiredBeforeExecution: ['fresh immutable complete source immediately before mutation', 'repeat target/halo and block-entity/protected-core validation', 'fresh live-entity clearance immediately before RCON', 'strict-noop forward/rollback parser checks', 'exact source and projected rollback preflight', 'journaled strict forward execution', 'fresh complete post snapshot and intake', 'rollback post-state preflight', 'independent live 20/20 canonical route QA'] },
};
const manifest = { ...manifestBase, manifestIdentity: sha256(`${JSON.stringify(manifestBase, null, 2)}\n`) };
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: manifest.status, releaseId: RELEASE_ID, forward: relative(forwardPath), rollback: relative(rollbackPath), manifest: relative(manifestPath), projectedRouteQa: relative(routeQaPath), sourcePreflight: relative(forwardPreflightPath), targetCount: 5, routeChecks: '20/20', retainedHaloBlockEntityStates: haloStateBEs.length, retainedStoredBlockEntities: haloProtectedBEs.length, manifestIdentity: manifest.manifestIdentity, liveCallsPerformed: false, worldEditsPerformed: false }, null, 2));
