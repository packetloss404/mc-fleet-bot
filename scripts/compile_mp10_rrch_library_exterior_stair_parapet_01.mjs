#!/usr/bin/env node
/**
 * MP10-RRCH-LIBRARY-EXTERIOR-STAIR-PARAPET-01
 *
 * Compiles the structural west retaining parapet for the full five-flight
 * exterior library switchback.  It is deliberately confined to the exposed
 * west edge at x=-157.  The east edge is protected library fabric: a proposed
 * rail there intersects bookshelves, so it is expressly not part of this
 * release.  The stepped solid parapet has a physical support below every
 * lowest cell; it is not a floating fence or decorative cue.
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
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const SNAPSHOT = value('--snapshot', 'data/worldsnap-mp10-rrch-library-stair-annex-post-20260826T193000Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const REVIEW_DIR = value('--review-dir', 'data/world-review/mp10-rrch-library-exterior-stair-parapet-01-static-20260826T193000Z');
const BASENAME = value('--basename', 'mp10-rrch-library-exterior-stair-parapet-01-static-20260826T193000Z');
const GENERATED_AT = value('--generated-at', '2026-08-26T19:30:00Z');
const RELEASE_ID = 'MP10-RRCH-LIBRARY-EXTERIOR-STAIR-PARAPET-01';
const abs = (item) => path.resolve(ROOT, item);
const rel = (item) => path.relative(ROOT, abs(item)).split(path.sep).join('/');
const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const fail = (condition, message) => {
  if (!condition) throw new Error(`${RELEASE_ID} rejected: ${message}`);
};
const stateName = (state) => state.split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:dragon_egg', 'minecraft:pointed_dripstone', 'minecraft:scaffolding']);
const BLOCK_ENTITY = new Set(['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:lectern', 'minecraft:chiseled_bookshelf', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:beacon', 'minecraft:spawner', 'minecraft:command_block', 'minecraft:structure_block', 'minecraft:jigsaw']);
const isAir = (state) => AIR.has(stateName(state));
const isFluid = (state) => FLUID.has(stateName(state)) || state.includes('waterlogged=true');
const isGravity = (state) => GRAVITY.has(stateName(state)) || stateName(state).endsWith('_concrete_powder');
const isBlockEntityState = (state) => BLOCK_ENTITY.has(stateName(state)) || stateName(state).endsWith('_shulker_box') || stateName(state).endsWith('_sign');
const describe = (cells) => {
  const exact = uniqueCells(cells);
  return { cellCount: exact.length, bounds: boundsOf(exact), coordinateSetSha256: hashCells(exact) };
};
const run = (command, commandArgs) => spawnSync(command, commandArgs, {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});

const snapshotRoot = abs(SNAPSHOT);
const regionRoot = path.join(snapshotRoot, 'region');
const entitiesRoot = path.join(snapshotRoot, 'entities');
const poiRoot = path.join(snapshotRoot, 'poi');
const capturePath = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
for (const required of [regionRoot, entitiesRoot, poiRoot, path.join(snapshotRoot, 'level.dat'), capturePath]) {
  fail(fs.existsSync(required), `missing complete immutable source member ${rel(required)}`);
}
const capture = JSON.parse(fs.readFileSync(capturePath, 'utf8'));
fail(capture.immutableCopy === true && Array.isArray(capture.requiredMembers), 'source is not a complete immutable save');
const reader = new AnvilReader(regionRoot);
const entityReader = new AnvilReader(entitiesRoot);
const sourceAt = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));

const FLIGHTS = [
  { id: 'B1-to-B2', floorY: 46, rise: 7, startZ: -447, direction: 1 },
  { id: 'B2-to-B3', floorY: 53, rise: 7, startZ: -440, direction: -1 },
  { id: 'B3-to-B4', floorY: 60, rise: 7, startZ: -447, direction: 1 },
  { id: 'B4-to-B5', floorY: 67, rise: 8, startZ: -439, direction: -1 },
  { id: 'B5-to-B6', floorY: 75, rise: 8, startZ: -447, direction: 1 },
];
const EXPOSED_WEST_X = -157;
const targets = [];
for (const flight of FLIGHTS) {
  for (let step = 1; step < flight.rise; step += 1) {
    const z = flight.startZ + flight.direction * step;
    for (let y = flight.floorY + 1; y <= flight.floorY + step; y += 1) {
      targets.push({ cell: { x: EXPOSED_WEST_X, y, z }, sourceState: 'minecraft:air', targetState: 'minecraft:polished_andesite', flight: flight.id, step });
    }
  }
}
const targetKeys = new Set(targets.map(({ cell }) => cellKey(cell)));
fail(targetKeys.size === targets.length, 'duplicate stepped-parapet targets');
fail(targets.length === 119, `expected 119 exact retaining-parapet cells, found ${targets.length}`);

const directSupports = [];
for (const target of targets) {
  const actual = await sourceAt(target.cell);
  fail(actual === target.sourceState, `source drift at ${cellKey(target.cell)}: expected air, found ${actual}`);
  const below = { ...target.cell, y: target.cell.y - 1 };
  if (!targetKeys.has(cellKey(below))) {
    const supportState = await sourceAt(below);
    fail(!isAir(supportState) && !isFluid(supportState) && !isGravity(supportState) && !isBlockEntityState(supportState),
      `lowest parapet cell lacks safe solid direct support at ${cellKey(below)}: ${supportState}`);
    directSupports.push({ cell: below, state: supportState, flight: target.flight });
  }
}
const supportKeys = new Set(directSupports.map(({ cell }) => cellKey(cell)));
fail(supportKeys.size === directSupports.length, 'duplicate direct supports');

const halo = uniqueCells(targets.flatMap(({ cell }) => {
  const cells = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) cells.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
  return cells;
})).filter((cell) => !targetKeys.has(cellKey(cell)));
const haloStates = [];
for (const cell of halo) haloStates.push({ cell, state: await sourceAt(cell) });
const unsafeHalo = haloStates.filter(({ state }) => isFluid(state) || isGravity(state));
fail(unsafeHalo.length === 0, `fluid/gravity enters one-cell parapet halo: ${JSON.stringify(unsafeHalo)}`);
const interaction = uniqueCells([...targets.map(({ cell }) => cell), ...halo]);
const interactionKeys = new Set(interaction.map(cellKey));
const chunks = [...new Set(interaction.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))];
const storedBlockEntities = [];
const savedEntities = [];
for (const chunkKey of chunks) {
  const [cx, cz] = chunkKey.split(',').map(Number);
  const blockChunk = await reader.chunk(cx, cz);
  for (const entity of blockChunk?.block_entities ?? blockChunk?.blockEntities ?? []) {
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
fail(storedBlockEntities.length === 0, `stored block entity in interaction set: ${JSON.stringify(storedBlockEntities)}`);
fail(savedEntities.length === 0, `saved entity in interaction set: ${JSON.stringify(savedEntities)}`);

const forwardRecords = targets.slice().sort((a, b) => a.cell.y - b.cell.y || a.cell.z - b.cell.z || a.cell.x - b.cell.x);
const rollbackRecords = forwardRecords.slice().reverse().map((entry) => ({ ...entry, sourceState: entry.targetState, targetState: entry.sourceState }));
const forwardBody = `${forwardRecords.map(({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState)).join('\n')}\n`;
const rollbackBody = `${rollbackRecords.map(({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const forwardPath = path.join(OUT_DIR, `${BASENAME}.forward.txt`);
const rollbackPath = path.join(OUT_DIR, `${BASENAME}.rollback.txt`);
const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const preflightPath = path.join(REVIEW_DIR, `${BASENAME}.source-preflight.json`);
const routeQaPath = path.join(REVIEW_DIR, `${BASENAME}.projected-route-qa.json`);
fs.mkdirSync(abs(OUT_DIR), { recursive: true });
fs.mkdirSync(abs(REVIEW_DIR), { recursive: true });
const header = (role, hash) => [
  `# GENERATED FILE — ${RELEASE_ID} (${role})`,
  `# immutable offline source: ${rel(SNAPSHOT)}`,
  '# STATIC PACKAGE ONLY — fresh same-moment kernel is mandatory before mutation.',
  `# operation SHA-256: ${hash}`,
].join('\n');
fs.writeFileSync(abs(forwardPath), `${header('forward', forwardSha256)}\n${forwardBody}`);
fs.writeFileSync(abs(rollbackPath), `${header('rollback', rollbackSha256)}\n${rollbackBody}`);
const preflightRun = run(process.execPath, ['scripts/preflight_guarded_ops.mjs', abs(forwardPath), '--regions', regionRoot, '--report', abs(preflightPath)]);
fail(preflightRun.status === 0, `source preflight failed:\n${preflightRun.stdout}\n${preflightRun.stderr}`);
const preflight = JSON.parse(fs.readFileSync(abs(preflightPath), 'utf8'));
fail(preflight.passed === targets.length && preflight.failed === 0, `source preflight ${preflight.passed}/${preflight.operationCount}`);
for (const [role, operationPath] of [['forward', forwardPath], ['rollback', rollbackPath]]) {
  const dryRun = run('python3', ['scripts/rcon_runner.py', abs(operationPath), '--dry-run', '--strict-noop', '--operation-role', role]);
  fail(dryRun.status === 0, `${role} strict-noop parser dry-run failed:\n${dryRun.stdout}\n${dryRun.stderr}`);
}

const routes = [];
for (const flight of FLIGHTS) {
  const lane = flight.direction > 0 ? -156 : -151;
  const from = [lane, flight.floorY + 1, flight.startZ];
  const to = [lane, flight.floorY + flight.rise + 1, flight.startZ + flight.direction * flight.rise];
  for (const direction of ['forward', 'reverse']) {
    const result = run(process.execPath, ['scripts/reachability.mjs', '--regions', regionRoot, '--ops', abs(forwardPath), '--from', (direction === 'forward' ? from : to).join(','), '--to', (direction === 'forward' ? to : from).join(','), '--pad', '8', '--budget', '800000']);
    routes.push({ id: flight.id, direction, passed: result.status === 0 && result.stdout.includes('REACHABLE'), output: result.stdout.trim().split(/\r?\n/).slice(-3) });
  }
}
const failedRoutes = routes.filter(({ passed }) => !passed);
fail(failedRoutes.length === 0, `projected route QA regressed: ${JSON.stringify(failedRoutes)}`);
const routeQa = {
  schemaVersion: 1,
  id: 'mp10-rrch-library-exterior-stair-parapet-01-projected-route-qa',
  status: 'PASS',
  mode: 'PROJECTED_FROM_IMMUTABLE_SOURCE',
  sourceSnapshot: rel(SNAPSHOT),
  forwardOps: rel(forwardPath),
  standard: 'existing three-wide normal-walk flights retained; parapet stays outside the west walking lanes; bidirectional; no jump, sprint, dig, swim, or climb',
  routeSummary: { pairs: FLIGHTS.length, directions: routes.length, passed: routes.length, failed: 0 },
  routes,
};
fs.writeFileSync(abs(routeQaPath), `${JSON.stringify(routeQa, null, 2)}\n`);

const manifestBase = {
  schemaVersion: 1,
  transactionId: 'mp10-rrch-library-exterior-stair-parapet-01',
  releaseId: RELEASE_ID,
  generatedAtUtc: GENERATED_AT,
  status: 'STATIC_READY_FROM_FRESH_POST_SOURCE_AWAITING_FRESH_LIVE_KERNEL',
  source: { snapshotRoot: rel(SNAPSHOT), captureManifest: rel(capturePath), captureManifestSha256: sha256(fs.readFileSync(capturePath)), completePlanes: ['region', 'entities', 'poi', 'level.dat'] },
  ownership: {
    owner: 'RAVENSREACH / RRCH-LIBRARY exterior west edge containment',
    governorDelegatedRoles: ['RRCH-LIBRARY steward', 'Ravensreach circulation architect', 'Ravensreach protected-fabric reviewer'],
    exactEnvelope: { minX: -157, maxX: -157, minY: 47, maxY: 82, minZ: -446, maxZ: -440 },
    excluded: ['all east-side bookshelf and library fabric at x=-153', 'all library container/block entity cells', 'RRCH-LIBRARY/RG-LOGGIA seam x=-111', 'walking lanes x=-156..-149', 'all source fluid cells and their exact one-cell halos'],
  },
  design: {
    purpose: 'Provide a continuous, physically supported stepped retaining/parapet edge along the exposed west side of the complete exterior library switchback.',
    flights: FLIGHTS,
    exposedWestX: EXPOSED_WEST_X,
    material: 'minecraft:polished_andesite',
    directSupports: describe(directSupports.map(({ cell }) => cell)),
    nonClaims: ['public egress commissioning', 'accessibility certification', 'Loggia connection', 'library programme completion', 'Master Plan completion'],
  },
  target: {
    cells: describe(targets.map(({ cell }) => cell)),
    sourceStateCensus: { 'minecraft:air': targets.length },
    targetStateCensus: { 'minecraft:polished_andesite': targets.length },
    interactionHalo: describe(halo),
    haloFluidGravityCount: unsafeHalo.length,
    storedBlockEntityInteractionCount: storedBlockEntities.length,
    savedEntityInteractionCount: savedEntities.length,
    exactInverse: true,
  },
  preflight: {
    sourceExact: { report: rel(preflightPath), passed: preflight.passed, failed: preflight.failed },
    strictParserDryRuns: ['forward', 'rollback'],
    projectedRouteQa: { path: rel(routeQaPath), directionalChecks: routes.length, passed: routes.length, failed: 0 },
  },
  operations: { forward: { path: rel(forwardPath), sha256: forwardSha256, commandCount: targets.length }, rollback: { path: rel(rollbackPath), sha256: rollbackSha256, commandCount: targets.length } },
  liveMutationPerformed: false,
  executionAuthority: { authorizedByThisArtifact: false, requiredBeforeExecution: ['fresh complete immutable source immediately before mutation and compiler rebind', 'repeat exact west-edge target/halo containment and protected-core scan', 'fresh live-entity clearance', 'strict-noop forward and rollback parser checks', 'exact source and projected inverse preflight', 'journaled execution', 'fresh immutable post capture', 'rollback post-state preflight', 'independent target/support and bidirectional route QA'] },
};
const manifest = { ...manifestBase, manifestIdentity: sha256(`${JSON.stringify(manifestBase, null, 2)}\n`) };
fs.writeFileSync(abs(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: manifest.status, releaseId: RELEASE_ID, forward: rel(forwardPath), rollback: rel(rollbackPath), manifest: rel(manifestPath), sourcePreflight: rel(preflightPath), projectedRouteQa: rel(routeQaPath), targetCount: targets.length, routeChecks: `${routes.length}/${routes.length}`, liveCallsPerformed: false, worldEditsPerformed: false }, null, 2));
