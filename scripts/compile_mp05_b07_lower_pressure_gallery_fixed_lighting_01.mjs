#!/usr/bin/env node
/** Compile fixed lighting only inside B07's retained dry lower pressure-gallery segment. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, replLine, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback) => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const SNAPSHOT = option('--snapshot', 'data/worldsnap-mp05-b07-ice-edge-finite-water-plug-01-post-20260827T234500Z');
const OUT = option('--out', 'data/buildops/mp05-b07-lower-pressure-gallery-fixed-lighting-01-current-20260827T234500Z');
const RELEASE = 'MP05-B07-LOWER-PRESSURE-GALLERY-FIXED-LIGHTING-01';
const NODE = 'CZ-MP05-B07-LOWER-PRESSURE-GALLERY-FIXED-LIGHTING';
const TX = 'mp05-b07-lower-pressure-gallery-fixed-lighting-01';
const AUTH = 'docs/masterplans/05-combined-zones/mp05-b07-lower-pressure-gallery-fixed-lighting-governor-standing-execution-authorization.json';
const FIXTURES = [-424, -416, -408].map((z) => ({ x: 2109, y: 10, z }));
const CORE = [];
for (let z = -427; z <= -404; z += 1) for (let x = 2108; x <= 2110; x += 1) for (let y = 8; y <= 9; y += 1) CORE.push({ x, y, z });
const CLOSURE = [];
for (const z of [-403, -402]) for (let x = 2108; x <= 2110; x += 1) for (let y = 8; y <= 9; y += 1) CLOSURE.push({ x, y, z });
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const key = cellKey;
const fail = (condition, message) => { if (!condition) throw new Error(`${RELEASE} compiler rejected: ${message}`); };
const name = (state) => state.split('[', 1)[0];
const fluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(name(state)) || state.includes('waterlogged=true');
const protectedState = (state) => ['minecraft:bedrock', 'minecraft:barrier', 'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw', 'minecraft:end_portal', 'minecraft:end_gateway'].includes(name(state));
const pointHash = (points) => sha(points.map((point) => `${point.x},${point.y},${point.z}`).sort().join('\n'));

const root = abs(SNAPSHOT);
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(root, member)), `missing complete immutable source ${member}`);
const capturePath = path.join(root, 'combined-zones-complete-save-capture.json');
const captureBytes = fs.readFileSync(capturePath); const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && capture.captureId, 'source is not immutable complete-save evidence');
for (const member of capture.requiredMembers ?? []) { const filename = path.join(root, member.path); fail(fs.existsSync(filename) && fs.statSync(filename).size === member.bytes && sha(fs.readFileSync(filename)) === member.sha256, `source member drifted: ${member.path}`); }
const reader = new AnvilReader(path.join(root, 'region')); const entities = new AnvilReader(path.join(root, 'entities')); const cache = new Map();
const get = async (cell) => { const id = key(cell); if (!cache.has(id)) cache.set(id, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z))); return cache.get(id); };
const source = await Promise.all(FIXTURES.map(async (cell) => ({ cell, state: await get(cell) })));
const core = await Promise.all(CORE.map(async (cell) => ({ cell, state: await get(cell) })));
const closure = await Promise.all(CLOSURE.map(get));
fail(source.every(({ state }) => state === 'minecraft:polished_deepslate'), 'fixtures must replace exact polished-deepslate ceiling cells');
fail(core.every(({ state }) => state === 'minecraft:air'), 'retained lower pressure-gallery dry core drifted');
fail(closure.every((state) => state === 'minecraft:polished_deepslate'), 'retained intermediate pressure closure drifted');
const halo = new Map();
for (const fixture of FIXTURES) for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) { const cell = { x: fixture.x + dx, y: fixture.y + dy, z: fixture.z + dz }; halo.set(key(cell), cell); }
const haloRecords = await Promise.all([...halo.values()].map(async (cell) => ({ cell, state: await get(cell) })));
fail(haloRecords.every(({ state }) => !fluid(state) && !protectedState(state)), 'fixture halo has fluid or protected core');
const blockEntities = []; const savedEntities = [];
for (const [chunkX, chunkZ] of [[131, -27]]) {
  const chunk = await reader.chunk(chunkX, chunkZ);
  for (const entry of chunk?.block_entities ?? chunk?.blockEntities ?? []) { const cell = { x: Number(entry.x), y: Number(entry.y), z: Number(entry.z) }; if (halo.has(key(cell))) blockEntities.push({ cell, id: entry.id ?? entry.Id ?? null }); }
  const entityChunk = await entities.chunk(chunkX, chunkZ);
  for (const entry of entityChunk?.Entities ?? entityChunk?.entities ?? []) { if (!Array.isArray(entry.Pos)) continue; const [x, y, z] = entry.Pos.map(Number); if ([...halo.values()].some((cell) => x >= cell.x && x < cell.x + 1 && y >= cell.y && y < cell.y + 1 && z >= cell.z && z < cell.z + 1)) savedEntities.push({ id: entry.id ?? entry.Id ?? null, position: [x, y, z] }); }
}
fail(blockEntities.length === 0 && savedEntities.length === 0, 'entity intersects exact lighting interaction halo');
const entries = source.map(({ cell, state }) => ({ cell, sourceState: state, targetState: 'minecraft:glowstone' })).sort((left, right) => left.cell.z - right.cell.z);
const forward = `${entries.map((entry) => replLine(entry.cell, entry.sourceState, entry.targetState)).join('\n')}\n`;
const rollback = `${[...entries].reverse().map((entry) => replLine(entry.cell, entry.targetState, entry.sourceState)).join('\n')}\n`;
const out = abs(OUT); fail(!fs.existsSync(out), '--out must be fresh'); fs.mkdirSync(out, { recursive: true });
const forwardPath = path.join(out, `${TX}.forward.txt`); const rollbackPath = path.join(out, `${TX}.rollback.txt`); fs.writeFileSync(forwardPath, forward); fs.writeFileSync(rollbackPath, rollback);
const lights = FIXTURES.map(({ z }) => `<rect x="${170 + ((-z - 404) * 17)}" y="118" width="14" height="26" fill="#ffd84a" stroke="#7b5a00"/>`).join('');
fs.writeFileSync(path.join(out, 'lower-pressure-gallery-fixed-lighting-plan-y10.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="270" viewBox="0 0 760 270"><style>.t{font:700 18px Arial}.s{font:12px Arial;fill:#34495e}.m{font:11px monospace;fill:#243746}</style><rect width="100%" height="100%" fill="#fff"/><text x="24" y="28" class="t">B07 lower pressure gallery — sealed lower-segment fixed-light plan</text><text x="24" y="48" class="s">L = full solid glowstone ceiling fixture, inside the existing dry sealed liner</text><rect x="155" y="96" width="410" height="68" fill="#34495e"/><rect x="170" y="110" width="370" height="40" fill="#eaf5fb"/>${lights}<rect x="541" y="110" width="24" height="40" fill="#34495e"/><text x="170" y="184" class="m">Z=-427 lower helix → Z=-404 dry segment → Z=-403/-402 retained pressure closure</text><text x="24" y="240" class="s">Three fixtures at eight-block cadence; no route-core, wall, liner, hatch, ladder, fluid boundary, or closure cell changes.</text></svg>`);
const base = { schemaVersion: 1, id: RELEASE, transactionId: TX, releaseNodeId: NODE, mvpScope: true, status: 'OFFLINE_COMPILED_AWAITING_FRESH_GUARDED_KERNEL', mutationAuthority: false, scopeIds: ['MP03-A', 'MP05-A', 'SYS-02', 'B07-LOWER-WET-TRANSFER-CONTAINMENT'], packages: [{ key: 'sealed-ceiling-fixed-lighting', forward: rel(forwardPath), rollback: rel(rollbackPath) }], executionOrder: { forward: ['sealed-ceiling-fixed-lighting'], rollback: ['sealed-ceiling-fixed-lighting'] }, scopedRunner: { wrapper: 'scripts/run_mp05_b07_lower_pressure_gallery_fixed_lighting_release.mjs', defaultMode: 'PREPARE_ONLY', liveExecutionOptIn: '--execute' }, source: { snapshot: rel(SNAPSHOT), captureManifest: rel(capturePath), captureManifestSha256: sha(captureBytes), captureId: capture.captureId, authorization: AUTH }, scope: { canonicalOwner: 'MP05-B07-CONTAINMENT-IMPLEMENTATION-TEAM', purpose: 'Install three supported full-block fixed lights in the sealed ceiling of the retained dry lower pressure-gallery segment.', fixtures: FIXTURES, fixtureCellCount: 3, maximumHorizontalSpacing: 8, retainedIntermediatePressureClosure: CLOSURE, noFluidOrWaterloggedFixtures: true }, interactionSet: { haloCellCount: halo.size, haloCellSetSha256: pointHash([...halo.values()]), sourceFluidCount: 0, sourceProtectedCoreCount: 0, sourceBlockEntityCount: blockEntities.length, sourceSavedEntityCount: savedEntities.length }, target: { changedCellCount: 3, changedCellSetSha256: pointHash(FIXTURES), sourceState: 'minecraft:polished_deepslate', canonicalTargetState: 'minecraft:glowstone' }, operations: { forward: { path: rel(forwardPath), sha256: sha(forward), commandCount: 3 }, rollback: { path: rel(rollbackPath), sha256: sha(rollback), commandCount: 3, exactInverseOfForward: true } }, functionalAcceptance: { classification: 'RESTRICTED_B07_LOWER_PRESSURE_GALLERY_FIXED_SAFETY_LIGHTING_ONLY', fixedLightCount: 3, dryCoreUnchanged: true, sealedLinerRemainsSolid: true, publicAccessCommissioned: false, emergencyEgressCommissioned: false, upperB07ConnectionCommissioned: false, fluidDischargeCommissioned: false }, hardSafetyKernel: { requiresFreshCompleteImmutableSourceImmediatelyBeforeExecution: true, requiresCompilerRebind: true, requiresExactSourceAndProjectedRollbackPreflight: true, requiresStrictNoopForwardAndRollbackParserChecks: true, requiresBlockAndFreshLiveEntityClearance: true, requiresJournaledStrictExecution: true, requiresFreshPostCaptureAndRollbackPoststatePreflight: true, requiresIndependentPostQa: true }, nonClaims: ['No water or lava cell is touched or exposed.', 'No route-core, hatch, ladder, wall, liner, closure, exterior receiver, public route, emergency egress, transport, or fluid discharge is changed or commissioned.'] };
const manifest = { ...base, manifestIdentitySha256: sha(`${JSON.stringify(base, null, 2)}\n`) };
fs.writeFileSync(path.join(out, `${TX}.manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: manifest.status, out: rel(out), manifest: rel(path.join(out, `${TX}.manifest.json`)), forwardCommands: 3, rollbackCommands: 3, haloCells: halo.size, mutationAuthority: false }, null, 2));
