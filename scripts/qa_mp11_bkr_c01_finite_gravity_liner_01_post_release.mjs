#!/usr/bin/env node
/** Independent immutable-post QA for the C01 EXP-G11 finite gravity liner. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd(); const args = process.argv.slice(2);
const option = (flag, fallback = null) => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const MANIFEST = option('--manifest'); const SNAPSHOT = option('--snapshot'); const OUT = option('--out');
const RELEASE = option('--release-id', 'MP11-BKR-C01-FINITE-GRAVITY-LINER-01');
const RELEASE_SLUG = option('--release-slug', 'mp11-bkr-c01-finite-gravity-liner-01');
const abs = (value) => path.resolve(ROOT, value); const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`MP11/BKR C01 finite gravity liner post QA rejected: ${message}`); };
// `cellKey` deliberately takes one coordinate object. Keeping this adapter
// object-shaped prevents cache-key collapse (and the resulting false halo/BE
// failures) when post QA walks more than one cell.
const key = (cell) => cellKey(cell);
const nameOf = (state) => String(state).split('[', 1)[0];
const fluid = (state) => ['minecraft:water', 'minecraft:flowing_water', 'minecraft:lava', 'minecraft:flowing_lava', 'minecraft:bubble_column'].includes(nameOf(state)) || state.includes('waterlogged=true');
const gravity = (state) => ['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:pointed_dripstone'].includes(nameOf(state)) || nameOf(state).endsWith('_concrete_powder');
const protectedState = (state) => ['minecraft:bedrock', 'minecraft:barrier', 'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw', 'minecraft:end_portal', 'minecraft:end_gateway'].includes(nameOf(state));
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const PASSABLE_EXACT = new Set(['minecraft:snow', 'minecraft:short_grass', 'minecraft:tall_grass', 'minecraft:fern', 'minecraft:large_fern', 'minecraft:dead_bush', 'minecraft:lantern', 'minecraft:soul_lantern', 'minecraft:chain', 'minecraft:iron_chain', 'minecraft:end_rod', 'minecraft:light', 'minecraft:flower_pot', 'minecraft:lever', 'minecraft:tripwire', 'minecraft:cobweb']);
const PASSABLE_SUFFIX = ['_carpet', '_banner', '_sign', '_button', '_torch', '_rail', '_pressure_plate', '_sapling'];
const isPassable = (state) => { const name = nameOf(state); return AIR.has(name) || PASSABLE_EXACT.has(name) || PASSABLE_SUFFIX.some((suffix) => name.endsWith(suffix)) || name.endsWith('_door') || name.endsWith('_fence_gate') || (name.endsWith('_trapdoor') && state.includes('open=true')); };
const hasFooting = (state) => { const name = nameOf(state); return !AIR.has(name) && !fluid(state) && !name.endsWith('_carpet') && !name.endsWith('_fence') && !name.endsWith('_wall') && !name.endsWith('_pane') && (!isPassable(state) || name.endsWith('_slab') || name.endsWith('_stairs') || (name.endsWith('_trapdoor') && !state.includes('open=true'))); };

fail(MANIFEST && SNAPSHOT && OUT, '--manifest, --snapshot, and --out are required');
const manifestPath = abs(MANIFEST); const manifestBytes = fs.readFileSync(manifestPath); const manifest = JSON.parse(manifestBytes);
fail(manifest.id === RELEASE, 'wrong manifest');
const root = abs(SNAPSHOT); for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(root, member)), `missing immutable post member ${member}`);
const capturePath = path.join(root, 'combined-zones-complete-save-capture.json'); const captureBytes = fs.readFileSync(capturePath); const capture = JSON.parse(captureBytes); fail(capture.immutableCopy === true, 'post snapshot is not immutable');
const designPath = abs(manifest.source.staticDesign.path); const design = JSON.parse(fs.readFileSync(designPath, 'utf8'));
const survey = JSON.parse(fs.readFileSync(abs(design.source.survey.path), 'utf8')); const topology = JSON.parse(fs.readFileSync(abs(design.source.topology.path), 'utf8'));
const routeBox = survey.namedSurveyBoxes?.find((box) => box.boxId === 'eastC01Portal'); const currentRoute = routeBox?.routes?.find((route) => route.routeId === 'TE-ROUTE-C01-MOUNTAIN-PORTAL-L1'); const independentRoute = topology.independentReturnSurvey;
fail(currentRoute?.connectivity === 'PASS' && independentRoute?.status === 'SECOND_INDEPENDENT_PORTAL_RETURN_FOUND', 'source-bound return evidence absent');
const reader = new AnvilReader(path.join(root, 'region')); const cache = new Map();
async function block(cell) { const cellKeyValue = key(cell); if (!cache.has(cellKeyValue)) cache.set(cellKeyValue, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z))); return cache.get(cellKeyValue); }
const targetMismatches = [];
for (const target of manifest.target.canonicalPostStates) { const state = await block(target.cell); if (state !== target.targetState) targetMismatches.push({ cell: target.cell, expected: target.targetState, actual: state }); }
const retainedMismatches = [];
for (const retained of manifest.interactionSet.retainedHaloCanonicalStates) { const state = await block(retained.cell); if (state !== retained.sourceState) retainedMismatches.push({ cell: retained.cell, expected: retained.sourceState, actual: state }); }
const hazards = []; for (const cell of manifest.interactionSet.fullHaloCells) { const state = await block(cell); if (fluid(state) || gravity(state) || protectedState(state)) hazards.push({ cell, state }); }
const blockEntities = []; const cells = manifest.interactionSet.fullHaloCells; const haloKeys = new Set(cells.map(key)); const minX = Math.min(...cells.map((cell) => cell.x)); const maxX = Math.max(...cells.map((cell) => cell.x)); const minZ = Math.min(...cells.map((cell) => cell.z)); const maxZ = Math.max(...cells.map((cell) => cell.z));
for (let chunkX = Math.floor(minX / 16); chunkX <= Math.floor(maxX / 16); chunkX += 1) for (let chunkZ = Math.floor(minZ / 16); chunkZ <= Math.floor(maxZ / 16); chunkZ += 1) { const chunk = await reader.chunk(chunkX, chunkZ); for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) { const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) }; if (haloKeys.has(key(cell))) blockEntities.push({ cell, id: String(entity.id ?? 'unknown') }); } }
async function routeFailures(stations) { const failures = []; for (const entry of stations) { const point = entry.point ?? entry; const cell = { x: point[0], y: point[1], z: point[2] }; const [feet, head, support] = await Promise.all([block(cell), block({ x: cell.x, y: cell.y + 1, z: cell.z }), block({ x: cell.x, y: cell.y - 1, z: cell.z })]); if (!isPassable(feet) || fluid(feet) || !isPassable(head) || fluid(head) || !hasFooting(support)) failures.push({ point, feet, head, support }); } return failures; }
const currentReturnFailures = await routeFailures(currentRoute.stations); const independentReturnFailures = await routeFailures(independentRoute.stations);
const base = { schemaVersion: 1, id: `${RELEASE}-POST-QA`, status: targetMismatches.length === 0 && retainedMismatches.length === 0 && hazards.length === 0 && blockEntities.length === 0 && currentReturnFailures.length === 0 && independentReturnFailures.length === 0 ? 'POST_RELEASE_QA_PASS' : 'POST_RELEASE_QA_FAIL', mutationAuthority: false, source: { manifest: rel(MANIFEST), manifestSha256: sha(manifestBytes), postSnapshot: rel(SNAPSHOT), postCaptureManifest: rel(capturePath), postCaptureManifestSha256: sha(captureBytes), postCaptureId: capture.captureId }, checks: { canonicalTargets: { expected: manifest.target.canonicalPostStateCellCount, mismatches: targetMismatches }, retainedHalo: { expected: manifest.interactionSet.retainedHaloCellCount, mismatches: retainedMismatches }, dryGravityProtectedFreeHalo: { expectedCells: manifest.interactionSet.fullHaloCellCount, hazards }, blockEntityExclusion: { failures: blockEntities }, currentReturn: { stationCount: currentRoute.stations.length, failures: currentReturnFailures }, independentReturn: { stationCount: independentRoute.stations.length, failures: independentReturnFailures } }, nonClaims: ['QA does not open, widen, reclassify, or commission an endpoint or return.', 'QA is valid only after a separately guarded execution and fresh immutable post capture.'] };
const report = { ...base, reportIdentitySha256: sha(`${JSON.stringify(base, null, 2)}\n`) }; const output = abs(OUT); fail(!fs.existsSync(output), '--out must be fresh'); fs.mkdirSync(output, { recursive: true }); fs.writeFileSync(path.join(output, `${RELEASE_SLUG}-post-qa.json`), `${JSON.stringify(report, null, 2)}\n`); if (report.status !== 'POST_RELEASE_QA_PASS') throw new Error(`post QA failed: targets=${targetMismatches.length} retained=${retainedMismatches.length} hazards=${hazards.length} blockEntities=${blockEntities.length} currentReturn=${currentReturnFailures.length} independentReturn=${independentReturnFailures.length}`); console.log(JSON.stringify({ status: report.status, out: rel(output), targetCells: manifest.target.canonicalPostStateCellCount, haloCells: manifest.interactionSet.fullHaloCellCount, currentReturnStations: currentRoute.stations.length, independentReturnStations: independentRoute.stations.length, mutationAuthority: false }, null, 2));
