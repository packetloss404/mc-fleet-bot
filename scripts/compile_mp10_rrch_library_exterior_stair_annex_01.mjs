#!/usr/bin/env node
/**
 * MP10-RRCH-LIBRARY-EXTERIOR-STAIR-ANNEX-01
 *
 * Compiles a real, three-wide exterior switchback for the six-level
 * Ravensreach library.  The existing west balcony slabs at y=46/53/60/67/75/83
 * are deliberately retained as the five turn landings.  This is not the old
 * five-cell internal-tread regression: every new target is west of the library
 * shell (x <= -149), well clear of the Library/Loggia seam at x=-111.
 *
 * It is an offline source-bound package.  It emits exact RCON operations,
 * inverse, parser/preflight evidence and projected functional QA, but makes no
 * live call or world mutation.
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
const SNAPSHOT = value('--snapshot', 'data/worldsnap-mp09-long-water-west-bank-post-20260826T183700Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const REVIEW_DIR = value('--review-dir', 'data/world-review/mp10-rrch-library-exterior-stair-annex-01-static-20260826');
const BASENAME = value('--basename', 'mp10-rrch-library-exterior-stair-annex-01-static');
const GENERATED_AT = value('--generated-at', '2026-08-26T19:10:00Z');
const RELEASE_ID = 'MP10-RRCH-LIBRARY-EXTERIOR-STAIR-ANNEX-01';
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

/*
 * The landing slabs already exist.  Alternating three-wide flights prevent a
 * lower flight's headroom from overlapping the next upward flight.  Each step
 * is a full polished-andesite block, so every move is a normal one-block rise.
 */
const FLIGHTS = [
  { id: 'B1-to-B2', floorY: 46, rise: 7, lane: [-156, -154], startZ: -447, direction: 1 },
  { id: 'B2-to-B3', floorY: 53, rise: 7, lane: [-151, -149], startZ: -440, direction: -1 },
  { id: 'B3-to-B4', floorY: 60, rise: 7, lane: [-156, -154], startZ: -447, direction: 1 },
  { id: 'B4-to-B5', floorY: 67, rise: 8, lane: [-151, -149], startZ: -439, direction: -1 },
  { id: 'B5-to-B6', floorY: 75, rise: 8, lane: [-156, -154], startZ: -447, direction: 1 },
];
const retainedLandings = [];
const targets = [];
const routeAnchors = [];
for (const flight of FLIGHTS) {
  const endZ = flight.startZ + flight.direction * flight.rise;
  for (let x = flight.lane[0]; x <= flight.lane[1]; x += 1) {
    retainedLandings.push({ cell: { x, y: flight.floorY, z: flight.startZ }, flight: flight.id, role: 'lower retained landing' });
    retainedLandings.push({ cell: { x, y: flight.floorY + flight.rise, z: endZ }, flight: flight.id, role: 'upper retained landing' });
    for (let step = 1; step < flight.rise; step += 1) {
      targets.push({
        cell: { x, y: flight.floorY + step, z: flight.startZ + flight.direction * step },
        sourceState: 'minecraft:air',
        requiredAir: true,
        targetState: 'minecraft:polished_andesite',
        flight: flight.id,
        step,
      });
    }
  }
  routeAnchors.push({ id: `${flight.id}-lower`, point: [flight.lane[0], flight.floorY + 1, flight.startZ] });
  routeAnchors.push({ id: `${flight.id}-upper`, point: [flight.lane[0], flight.floorY + flight.rise + 1, endZ] });
}
/* The upper slab of each retained storey is a ceiling over the final two
 * rising tread rows.  These six-cell apertures are part of the stair, not an
 * incidental clearance: without them a player reaches the last tread with a
 * solid block at head level.  The final top row remains the intact landing. */
for (const flight of FLIGHTS) {
  for (let x = flight.lane[0]; x <= flight.lane[1]; x += 1) {
    for (const step of [flight.rise - 2, flight.rise - 1]) {
      targets.push({
        cell: { x, y: flight.floorY + flight.rise, z: flight.startZ + flight.direction * step },
        sourceState: null,
        requiredAir: false,
        targetState: 'minecraft:air',
        flight: flight.id,
        step,
        role: 'upper-slab stair headroom aperture',
      });
    }
  }
}
const targetKeys = new Set(targets.map(({ cell }) => cellKey(cell)));
fail(targetKeys.size === targets.length, 'duplicate stair targets');
fail(targets.length === 126, `expected 126 exact stair and headroom targets, found ${targets.length}`);

for (const target of targets) {
  const actual = await sourceAt(target.cell);
  if (target.requiredAir) {
    fail(actual === target.sourceState, `source drift at ${cellKey(target.cell)}: expected ${target.sourceState}, found ${actual}`);
  } else {
    fail(!isAir(actual) && !isFluid(actual) && !isGravity(actual) && !isBlockEntityState(actual),
      `unsafe upper-slab aperture source at ${cellKey(target.cell)}: ${actual}`);
    target.sourceState = actual;
  }
}
for (const landing of retainedLandings) {
  const floor = await sourceAt(landing.cell);
  const [feet, head] = await Promise.all([
    sourceAt({ ...landing.cell, y: landing.cell.y + 1 }),
    sourceAt({ ...landing.cell, y: landing.cell.y + 2 }),
  ]);
  fail(!isAir(floor) && !isFluid(floor), `${landing.role} is not a dry solid footing at ${cellKey(landing.cell)}: ${floor}`);
  fail(isAir(feet) && isAir(head), `${landing.role} lacks two-clear headroom at ${cellKey(landing.cell)}`);
}

const halo = uniqueCells(targets.flatMap(({ cell }) => {
  const cells = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) cells.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
  return cells;
})).filter((cell) => !targetKeys.has(cellKey(cell)));
const haloStates = [];
for (const cell of halo) haloStates.push({ cell, state: await sourceAt(cell) });
const unsafeHalo = haloStates.filter(({ state }) => isFluid(state) || isGravity(state));
fail(unsafeHalo.length === 0, `fluid/gravity enters the exact one-cell interaction halo: ${JSON.stringify(unsafeHalo)}`);

const interaction = uniqueCells([...targets.map(({ cell }) => cell), ...halo]);
const interactionKeys = new Set(interaction.map(cellKey));
const chunks = [...new Set(interaction.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))];
const storedBlockEntities = [];
const savedEntities = [];
for (const key of chunks) {
  const [cx, cz] = key.split(',').map(Number);
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

/* Project the exact annex path, then prove each flight and the complete lower
 * B1 to upper B6 chain in both directions.  These anchors live on the new
 * exterior stair itself, so an unrelated interior shortcut cannot fake a pass. */
const pairs = [
  ...FLIGHTS.map((flight, index) => ({
    id: flight.id,
    from: routeAnchors[index * 2].point,
    to: routeAnchors[index * 2 + 1].point,
    pad: 8,
  })),
  { id: 'full-B1-to-B6-annex-chain', from: routeAnchors[0].point, to: routeAnchors.at(-1).point, pad: 12 },
];
const routes = [];
for (const pair of pairs) for (const direction of ['forward', 'reverse']) {
  const from = direction === 'forward' ? pair.from : pair.to;
  const to = direction === 'forward' ? pair.to : pair.from;
  const result = run(process.execPath, ['scripts/reachability.mjs', '--regions', regionRoot, '--ops', abs(forwardPath), '--from', from.join(','), '--to', to.join(','), '--pad', String(pair.pad), '--budget', '800000']);
  routes.push({ id: pair.id, direction, from, to, passed: result.status === 0 && result.stdout.includes('REACHABLE'), output: result.stdout.trim().split(/\r?\n/).slice(-3), stderr: result.stderr.trim() || undefined });
}
const failedRoutes = routes.filter(({ passed }) => !passed);
const routeQa = {
  schemaVersion: 1,
  id: 'mp10-rrch-library-exterior-stair-annex-01-projected-route-qa',
  status: failedRoutes.length === 0 ? 'PASS' : 'FAIL',
  mode: 'PROJECTED_FROM_IMMUTABLE_SOURCE',
  sourceSnapshot: rel(SNAPSHOT),
  forwardOps: rel(forwardPath),
  standard: 'three-wide full-block flights; two-clear headroom on each retained landing; normal walking only; bidirectional; no jump, sprint, dig, swim, or climb',
  routeSummary: { pairs: pairs.length, directions: routes.length, passed: routes.length - failedRoutes.length, failed: failedRoutes.length },
  retainedLandings: describe(retainedLandings.map(({ cell }) => cell)),
  routes,
  failures: failedRoutes,
};
fs.writeFileSync(abs(routeQaPath), `${JSON.stringify(routeQa, null, 2)}\n`);
fail(failedRoutes.length === 0, `projected annex route QA failed: ${JSON.stringify(failedRoutes)}`);

const manifestBase = {
  schemaVersion: 1,
  transactionId: 'mp10-rrch-library-exterior-stair-annex-01',
  releaseId: RELEASE_ID,
  generatedAtUtc: GENERATED_AT,
  status: 'STATIC_READY_FROM_COMPLETE_SOURCE_AWAITING_FRESH_LIVE_KERNEL',
  source: {
    snapshotRoot: rel(SNAPSHOT),
    captureManifest: rel(capturePath),
    captureManifestSha256: sha256(fs.readFileSync(capturePath)),
    completePlanes: ['region', 'entities', 'poi', 'level.dat'],
  },
  ownership: {
    owner: 'RAVENSREACH / RRCH-LIBRARY exterior west vertical circulation annex',
    governorDelegatedRoles: ['RRCH-LIBRARY steward', 'Ravensreach circulation architect', 'Ravensreach protected-fabric reviewer'],
    exactEnvelope: { minX: -156, maxX: -149, minY: 47, maxY: 82, minZ: -447, maxZ: -441 },
    excluded: ['RRCH-LIBRARY/RG-LOGGIA seam x=-111', 'all library interior furniture and block entities', 'all existing landing slabs', 'all source fluid cells and their exact one-cell interaction halos'],
  },
  design: {
    purpose: 'Add a second, three-wide normal-walk vertical route between the retained exterior balcony landings of the six-level library.',
    flights: FLIGHTS,
    retainedLandingFloors: [46, 53, 60, 67, 75, 83],
    nonClaims: ['public egress commissioning', 'accessibility certification', 'Loggia connection', 'library programme completion', 'Master Plan completion'],
  },
  target: {
    cells: describe(targets.map(({ cell }) => cell)),
    sourceStateCensus: Object.fromEntries([...targets.reduce((counts, { sourceState }) => counts.set(sourceState, (counts.get(sourceState) ?? 0) + 1), new Map()).entries()].sort((a, b) => a[0].localeCompare(b[0]))),
    targetStateCensus: Object.fromEntries([...targets.reduce((counts, { targetState }) => counts.set(targetState, (counts.get(targetState) ?? 0) + 1), new Map()).entries()].sort((a, b) => a[0].localeCompare(b[0]))),
    interactionHalo: describe(halo),
    haloFluidGravityCount: unsafeHalo.length,
    storedBlockEntityInteractionCount: storedBlockEntities.length,
    savedEntityInteractionCount: savedEntities.length,
    exactInverse: true,
  },
  preflight: {
    sourceExact: { report: rel(preflightPath), passed: preflight.passed, failed: preflight.failed },
    strictParserDryRuns: ['forward', 'rollback'],
    projectedRouteQa: { path: rel(routeQaPath), directionalChecks: routes.length, passed: routes.length - failedRoutes.length, failed: failedRoutes.length },
  },
  operations: {
    forward: { path: rel(forwardPath), sha256: forwardSha256, commandCount: targets.length },
    rollback: { path: rel(rollbackPath), sha256: rollbackSha256, commandCount: targets.length },
  },
  liveMutationPerformed: false,
  executionAuthority: {
    authorizedByThisArtifact: false,
    requiredBeforeExecution: ['fresh complete immutable source immediately before mutation', 'repeat exact target/halo containment and protected-core scan', 'fresh live-entity clearance', 'strict-noop forward and rollback parser checks', 'exact source preflight', 'journalled execution', 'fresh immutable post capture', 'rollback post-state preflight', 'independent post-state annex route QA'],
  },
};
const manifest = { ...manifestBase, manifestIdentity: sha256(`${JSON.stringify(manifestBase, null, 2)}\n`) };
fs.writeFileSync(abs(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  status: manifest.status,
  releaseId: RELEASE_ID,
  forward: rel(forwardPath),
  rollback: rel(rollbackPath),
  manifest: rel(manifestPath),
  sourcePreflight: rel(preflightPath),
  projectedRouteQa: rel(routeQaPath),
  targetCount: targets.length,
  routeChecks: `${routeQa.routeSummary.passed}/${routeQa.routeSummary.directions}`,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
