#!/usr/bin/env node
/**
 * MP02-B08-SURFACE-EGRESS-SHAFT-01
 *
 * A source-bound, lined emergency egress from the raw B08 continuation to the
 * immediately above terraced surface.  This does not touch B03, B09, rail, or
 * the protected terminus; its only purpose is to add an independent protected
 * discharge alongside the existing B08 return.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { AnvilReader, boundsOf, cellKey, hashCells, replLine, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const SNAPSHOT = value('--snapshot', 'data/worldsnap-mp10-rrch-library-parapet-post-20260826T195000Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const REVIEW_DIR = value('--review-dir', 'data/world-review/mp02-b08-surface-egress-shaft-01-static-20260826T195000Z');
const BASENAME = value('--basename', 'mp02-b08-surface-egress-shaft-01-static-20260826T195000Z');
const RELEASE_ID = 'MP02-B08-SURFACE-EGRESS-SHAFT-01';
const abs = (p) => path.resolve(ROOT, p);
const rel = (p) => path.relative(ROOT, abs(p)).split(path.sep).join('/');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const fail = (c, m) => { if (!c) throw new Error(`${RELEASE_ID} rejected: ${m}`); };
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:dragon_egg', 'minecraft:pointed_dripstone', 'minecraft:scaffolding']);
const BLOCK_ENTITY = new Set(['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:lectern', 'minecraft:chiseled_bookshelf', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:beacon', 'minecraft:spawner', 'minecraft:command_block', 'minecraft:structure_block', 'minecraft:jigsaw']);
const name = (s) => s.split('[', 1)[0];
const isAir = (s) => AIR.has(name(s));
const isFluid = (s) => FLUID.has(name(s)) || s.includes('waterlogged=true');
const isGravity = (s) => GRAVITY.has(name(s)) || name(s).endsWith('_concrete_powder');
const isBlockEntity = (s) => BLOCK_ENTITY.has(name(s)) || name(s).endsWith('_shulker_box') || name(s).endsWith('_sign');
const describe = (cells) => { const exact = uniqueCells(cells); return { cellCount: exact.length, bounds: boundsOf(exact), coordinateSetSha256: hashCells(exact) }; };
const run = (cmd, argv) => spawnSync(cmd, argv, { cwd: ROOT, encoding: 'utf8', maxBuffer: 96 * 1024 * 1024 });
const snapshotRoot = abs(SNAPSHOT);
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(snapshotRoot, member)), `missing complete source member ${member}`);
const capture = JSON.parse(fs.readFileSync(path.join(snapshotRoot, 'combined-zones-complete-save-capture.json'), 'utf8'));
fail(capture.immutableCopy === true, 'source is not immutable');
const reader = new AnvilReader(path.join(snapshotRoot, 'region'));
const entityReader = new AnvilReader(path.join(snapshotRoot, 'entities'));
const sourceAt = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));

/* The shaft uses a retained west rock wall at x=2007 for its ladder backing.
 * Its bore x=2008..2009,z=-749..-747 is 39 blocks west of B09's first x=2048
 * protected envelope.  The west three-wide stepped surface exit never crosses
 * B03/B09, guideway, or terminus cells. */
const records = [];
const add = (cell, target, role) => records.push({ cell, target, role });
for (let y = 135; y <= 209; y += 1) for (let x = 2008; x <= 2009; x += 1) for (let z = -749; z <= -747; z += 1) {
  if (x === 2008 && z === -748) continue;
  add({ x, y, z }, 'minecraft:air', 'shaft-clear');
}
for (let y = 129; y <= 210; y += 1) add({ x: 2008, y, z: -748 }, 'minecraft:ladder[facing=west,waterlogged=false]', 'ladder');
for (let y = 129; y <= 134; y += 1) add({ x: 2007, y, z: -748 }, 'minecraft:polished_diorite', 'lower-ladder-backing');
for (const [x, minY, maxY] of [[2007, 208, 209], [2006, 206, 208], [2005, 204, 207]]) for (let y = minY; y <= maxY; y += 1) for (let z = -749; z <= -747; z += 1) add({ x, y, z }, 'minecraft:polished_andesite', 'surface-step-support');
/* The final ladder block needs a deliberate top backing too; that same block
 * is the floor under the west exit stand cell at (2007,211,-748). */
add({ x: 2007, y: 210, z: -748 }, 'minecraft:polished_andesite', 'upper-ladder-backing');
for (const z of [-749, -747]) for (const y of [211, 212]) add({ x: 2008, y, z }, 'minecraft:polished_diorite', 'surface-collar');
const keys = new Set(records.map(({ cell }) => cellKey(cell)));
fail(keys.size === records.length && records.length === 495, `expected 495 unique targets, found ${records.length}`);
fail(records.every(({ cell }) => cell.x < 2048), 'target set approaches B09 protected envelope');
const sourceAllowed = new Set(['minecraft:air', 'minecraft:stone', 'minecraft:polished_diorite', 'minecraft:snow[layers=1]']);
for (const record of records) {
  record.source = await sourceAt(record.cell);
  fail(sourceAllowed.has(record.source), `unexpected target source ${cellKey(record.cell)}=${record.source}`);
  fail(!isFluid(record.source) && !isGravity(record.source) && !isBlockEntity(record.source), `unsafe source target at ${cellKey(record.cell)}=${record.source}`);
}
const plannedTarget = new Map(records.map((record) => [cellKey(record.cell), record.target]));
const retainedBacking = [];
for (let y = 135; y <= 210; y += 1) {
  const cell = { x: 2007, y, z: -748 };
  const state = await sourceAt(cell);
  const planned = plannedTarget.get(cellKey(cell)) ?? null;
  const hasRetainedRock = !isAir(state) && !isFluid(state) && !isGravity(state) && !isBlockEntity(state);
  const hasPriorBuiltBacking = planned === 'minecraft:polished_andesite';
  fail(hasRetainedRock || hasPriorBuiltBacking, `ladder backing drift at ${cellKey(cell)}=${state}`);
  retainedBacking.push({ cell, state, planned });
}
const halo = []; const haloKeys = new Set();
for (const { cell } of records) for (let dx = -2; dx <= 2; dx += 1) for (let dy = -2; dy <= 2; dy += 1) for (let dz = -2; dz <= 2; dz += 1) {
  const p = { x: cell.x + dx, y: cell.y + dy, z: cell.z + dz }; const k = cellKey(p);
  if (!keys.has(k) && !haloKeys.has(k)) { haloKeys.add(k); halo.push(p); }
}
const hazards = [];
for (const cell of halo) { const state = await sourceAt(cell); if (isFluid(state) || isGravity(state)) hazards.push({ cell, state }); }
fail(hazards.length === 0, `two-cell shaft halo contains fluid/gravity: ${JSON.stringify(hazards.slice(0, 8))}`);
const interactions = new Set([...keys, ...haloKeys]);
const chunks = [...new Set([...interactions].map((v) => { const [x,,z] = v.split(',').map(Number); return `${Math.floor(x / 16)},${Math.floor(z / 16)}`; }))];
const blockEntities = []; const savedEntities = [];
for (const item of chunks) {
  const [cx, cz] = item.split(',').map(Number);
  const chunk = await reader.chunk(cx, cz);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) { const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) }; if (interactions.has(cellKey(cell))) blockEntities.push({ id: entity.id ?? entity.Id ?? null, cell }); }
  const entityChunk = await entityReader.chunk(cx, cz);
  for (const entity of entityChunk?.Entities ?? []) { if (!Array.isArray(entity.Pos)) continue; const position = entity.Pos.slice(0, 3).map(Number); const cell = { x: Math.floor(position[0]), y: Math.floor(position[1]), z: Math.floor(position[2]) }; if (interactions.has(cellKey(cell))) savedEntities.push({ id: entity.id ?? entity.Id ?? null, position }); }
}
fail(blockEntities.length === 0 && savedEntities.length === 0, `target/halo intersects protected entities: ${JSON.stringify({ blockEntities, savedEntities })}`);
const sorted = records.slice().sort((a, b) => a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z);
/* Clear the bore and form low supports before the climb line, allowing every
 * forward moment to retain either rock or completed backing behind a ladder. */
const order = { 'shaft-clear': 0, 'lower-ladder-backing': 1, 'surface-step-support': 2, 'upper-ladder-backing': 3, 'surface-collar': 4, ladder: 5 };
sorted.sort((a, b) => order[a.role] - order[b.role] || a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z);
const forwardBody = `${sorted.map(({ cell, source, target }) => replLine(cell, source, target)).join('\n')}\n`;
const rollbackBody = `${sorted.slice().reverse().map(({ cell, source, target }) => replLine(cell, target, source)).join('\n')}\n`;
const forwardHash = sha(forwardBody); const rollbackHash = sha(rollbackBody);
fs.mkdirSync(abs(OUT_DIR), { recursive: true }); fs.mkdirSync(abs(REVIEW_DIR), { recursive: true });
const forward = path.join(OUT_DIR, `${BASENAME}.forward.txt`); const rollback = path.join(OUT_DIR, `${BASENAME}.rollback.txt`); const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const header = (role, hash) => `# GENERATED ${RELEASE_ID} ${role}\n# source ${rel(SNAPSHOT)}\n# STATIC ONLY; fresh guarded kernel required before mutation.\n# operation SHA-256 ${hash}`;
fs.writeFileSync(abs(forward), `${header('forward', forwardHash)}\n${forwardBody}`); fs.writeFileSync(abs(rollback), `${header('rollback', rollbackHash)}\n${rollbackBody}`);
const preflight = path.join(REVIEW_DIR, `${BASENAME}.source-preflight.json`);
const pf = run(process.execPath, ['scripts/preflight_guarded_ops.mjs', abs(forward), '--regions', path.join(snapshotRoot, 'region'), '--report', abs(preflight)]);
fail(pf.status === 0, `source preflight failed: ${pf.stderr || pf.stdout}`);
const pfJson = JSON.parse(fs.readFileSync(abs(preflight), 'utf8')); fail(pfJson.passed === records.length && pfJson.failed === 0, 'source preflight count drift');
for (const [role, file] of [['forward', forward], ['rollback', rollback]]) { const result = run('python3', ['scripts/rcon_runner.py', abs(file), '--dry-run', '--strict-noop', '--operation-role', role]); fail(result.status === 0, `${role} parser failed: ${result.stderr || result.stdout}`); }
const routeQaPath = path.join(REVIEW_DIR, `${BASENAME}.projected-route-qa.json`);
const pairs = [
  { id: 'B08-return-anchor-to-surface-discharge', from: [2008, 129, -690], to: [2005, 208, -748], pad: 14 },
  { id: 'shaft-bottom-to-surface-discharge', from: [2008, 129, -748], to: [2005, 208, -748], pad: 10 },
];
const routes = [];
for (const pair of pairs) for (const direction of ['forward', 'reverse']) { const from = direction === 'forward' ? pair.from : pair.to; const to = direction === 'forward' ? pair.to : pair.from; const result = run(process.execPath, ['scripts/reachability.mjs', '--regions', path.join(snapshotRoot, 'region'), '--ops', abs(forward), '--from', from.join(','), '--to', to.join(','), '--pad', String(pair.pad), '--budget', '1000000']); routes.push({ id: pair.id, direction, from, to, passed: result.status === 0 && result.stdout.includes('REACHABLE'), output: result.stdout.trim().split(/\r?\n/).slice(-3) }); }
const routeFailures = routes.filter(({ passed }) => !passed); fail(routeFailures.length === 0, `projected egress route failed: ${JSON.stringify(routeFailures)}`);
const routeQa = { schemaVersion: 1, id: 'mp02-b08-surface-egress-shaft-01-projected-route-qa', status: 'PASS', mode: 'PROJECTED_FROM_IMMUTABLE_SOURCE', sourceSnapshot: rel(SNAPSHOT), standard: 'two-wide lined ladder climb with a three-wide one-step surface discharge; bidirectional; no digging, swimming, or jumping', routeSummary: { pairs: pairs.length, directions: routes.length, passed: routes.length, failed: 0 }, routes };
fs.writeFileSync(abs(routeQaPath), `${JSON.stringify(routeQa, null, 2)}\n`);
const base = { schemaVersion: 1, transactionId: 'mp02-b08-surface-egress-shaft-01', releaseId: RELEASE_ID, status: 'STATIC_READY_FROM_FRESH_POST_SOURCE_AWAITING_FRESH_LIVE_KERNEL', source: { snapshotRoot: rel(SNAPSHOT), captureManifest: rel(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json')), captureManifestSha256: sha(fs.readFileSync(path.join(snapshotRoot, 'combined-zones-complete-save-capture.json'))), completePlanes: ['region', 'entities', 'poi', 'level.dat'] }, ownership: { owner: 'MP02 B08 controlled emergency egress', governorDelegatedRoles: ['SubTropolis chamber steward', 'B08 circulation architect', 'surface egress reviewer'], exactEnvelope: { minX: 2005, maxX: 2009, minY: 129, maxY: 212, minZ: -749, maxZ: -747 }, excluded: ['B03 aperture x=2049', 'B09 envelope x=2048..2062', 'all guideway/rail/control cells', 'accepted 719-cell B08 handoff'] }, design: { purpose: 'Add a second protected surface discharge to the raw B08 continuation without opening B03/B09.', lowerAnchor: [2008, 129, -748], surfaceDischarge: [2005, 208, -748], retainedB08ReturnAnchor: [2008, 129, -690], ladderBackedBy: describe(retainedBacking.map(({ cell }) => cell)), surfaceExit: 'three-wide, one-rise-per-column supported west terrace descent', nonClaims: ['B03 or B09 opening', 'rail action', 'public operation', 'chamber completion', 'Master Plan completion'] }, target: { cells: describe(records.map(({ cell }) => cell)), sourceStateCensus: Object.fromEntries([...records.reduce((m, r) => m.set(r.source, (m.get(r.source) ?? 0) + 1), new Map()).entries()].sort()), targetStateCensus: Object.fromEntries([...records.reduce((m, r) => m.set(r.target, (m.get(r.target) ?? 0) + 1), new Map()).entries()].sort()), twoCellHalo: describe(halo), haloFluidGravityCount: hazards.length, storedBlockEntityInteractionCount: blockEntities.length, savedEntityInteractionCount: savedEntities.length, exactInverse: true }, preflight: { sourceExact: { report: rel(preflight), passed: pfJson.passed, failed: pfJson.failed }, strictParserDryRuns: ['forward', 'rollback'], projectedRouteQa: { path: rel(routeQaPath), directionalChecks: routes.length, passed: routes.length, failed: 0 } }, operations: { forward: { path: rel(forward), sha256: forwardHash, commandCount: records.length }, rollback: { path: rel(rollback), sha256: rollbackHash, commandCount: records.length } }, liveMutationPerformed: false, executionAuthority: { authorizedByThisArtifact: false, requiredBeforeExecution: ['fresh complete source and compiler rebind', 'same-moment live-entity clearance', 'strict journaled execution', 'fresh post snapshot', 'rollback poststate preflight', 'independent full B08-return-to-surface and shaft-only route QA'] } };
const manifest = { ...base, manifestIdentity: sha(`${JSON.stringify(base, null, 2)}\n`) }; fs.writeFileSync(abs(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: manifest.status, releaseId: RELEASE_ID, targetCount: records.length, forward: rel(forward), rollback: rel(rollback), manifest: rel(manifestPath), projectedRouteQa: rel(routeQaPath), liveCallsPerformed: false, worldEditsPerformed: false }, null, 2));
