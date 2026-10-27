#!/usr/bin/env node
/**
 * Independent post-release QA for the finite AG-1 exterior pier/girder
 * package. This is deliberately read-only: it validates an immutable post
 * capture and the runner evidence; it never talks to Minecraft or RCON.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd(); const argv = process.argv.slice(2);
const option = (flag, fallback = null) => { const index = argv.indexOf(flag); return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback; };
const snapshot = option('--snapshot'); const manifestPath = option('--manifest'); const ag0Path = option('--ag0'); const ledgerPath = option('--ledger'); const postIntakePath = option('--post-intake'); const output = option('--out');
const abs = (value) => path.resolve(ROOT, value); const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex'); const fileSha = (value) => sha(fs.readFileSync(abs(value)));
const read = (value) => JSON.parse(fs.readFileSync(abs(value), 'utf8'));
const fail = (condition, message) => { if (!condition) throw new Error(`AG-1 independent post QA rejected: ${message}`); };
const name = (state) => state.split('[', 1)[0];
const fluids = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const gravity = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel']);
const wet = (state) => fluids.has(name(state)) || state.includes('waterlogged=true');

fail(snapshot && manifestPath && ag0Path && ledgerPath && postIntakePath && output,
  '--snapshot, --manifest, --ag0, --ledger, --post-intake, and --out are required');
for (const member of [path.join(snapshot, 'region'), path.join(snapshot, 'entities'), path.join(snapshot, 'poi'), path.join(snapshot, 'level.dat'), path.join(snapshot, 'combined-zones-complete-save-capture.json'), manifestPath, ag0Path, ledgerPath, postIntakePath]) fail(fs.existsSync(abs(member)), `missing ${member}`);
fail(!fs.existsSync(abs(output)), '--out must be fresh');

const manifest = read(manifestPath); const ag0 = read(ag0Path); const ledger = read(ledgerPath); const intake = read(postIntakePath);
fail(manifest.id === 'AG1-CITYWIDE-EXTERIOR-LOOP-PIER-DECK-SUPPORT-01', 'wrong AG-1 manifest');
fail(ag0.status === 'AG0_PASS_FINITE_EXTERIOR_LOOP_SEGMENT_SOURCE_BOUND_SURVEY_ONLY' && ag0.selectedCandidate?.id === 'SL-02-N-AG0-0576', 'wrong AG-0 candidate');
fail(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE' && intake.summary?.passed === true && intake.input?.suppliedWorldRoot === rel(snapshot), 'post capture audit is not a complete immutable pass');
fail(ledger.releaseId === manifest.id && ledger.status === 'EXECUTED_PENDING_INDEPENDENT_POST_QA', 'runner ledger is not the matching pending post-QA release');
fail(ledger.sourceSnapshot?.manifestSha256 === fileSha(manifestPath), 'runner/manifest SHA binding drift');
for (const stage of ['fresh-source-complete-save', 'source-complete-save-intake', 'fresh-ag0-survey-rebind', 'fresh-ag1-compiler-rebind', 'exact-forward-source-preflight', 'strict-forward-parser', 'strict-rollback-parser', 'block-entity-and-protected-core-clearance', 'same-moment-live-entity-clearance', 'strict-forward-execution', 'fresh-post-complete-save', 'post-complete-save-intake', 'rollback-poststate-preflight']) {
  fail(ledger.stages?.some((entry) => entry.stage === stage && entry.status === 'PASS'), `runner evidence lacks passed ${stage}`);
}

const forwardPath = manifest.operations?.forward?.path; const rollbackPath = manifest.operations?.rollback?.path;
fail(forwardPath && rollbackPath && fs.existsSync(abs(forwardPath)) && fs.existsSync(abs(rollbackPath)), 'rebound operation files are missing');
const parse = (filename, label) => fs.readFileSync(abs(filename), 'utf8').split(/\r?\n/).filter((line) => line.startsWith('REPL ')).map((line) => {
  const match = /^REPL (-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+) (-?\d+) (\S+) (\S+)$/.exec(line);
  fail(match, `${label} contains an unparseable record`); const values = match.slice(1, 7).map(Number);
  fail(values[0] === values[3] && values[1] === values[4] && values[2] === values[5], `${label} contains a non-single-cell record`);
  return { cell: { x: values[0], y: values[1], z: values[2] }, expected: match[7], target: match[8] };
});
const forward = parse(forwardPath, 'forward'); const rollback = parse(rollbackPath, 'rollback');
const targets = forward.map(({ cell }) => cell);
fail(targets.length === manifest.target?.cellCount && new Set(targets.map(cellKey)).size === targets.length && hashCells(targets) === manifest.target.coordinateSetSha256, 'forward target set does not bind manifest');
fail(rollback.length === forward.length && forward.every((record, index) => { const inverse = rollback[rollback.length - index - 1]; return inverse && cellKey(inverse.cell) === cellKey(record.cell) && inverse.expected === record.target && inverse.target === record.expected; }), 'rollback is not the exact forward inverse');
fail(forward.every((record) => record.target === 'minecraft:polished_deepslate'), 'AG-1 contains a non-support target state');
const targetKeys = new Set(targets.map(cellKey)); const halo = uniqueCells(targets.flatMap(({ x, y, z }) => [{ x: x - 1, y, z }, { x: x + 1, y, z }, { x, y: y - 1, z }, { x, y: y + 1, z }, { x, y, z: z - 1 }, { x, y, z: z + 1 }]).filter((cell) => !targetKeys.has(cellKey(cell))));
fail(halo.length === manifest.target.haloCellCount && hashCells(halo) === manifest.target.haloCoordinateSetSha256, 'post QA halo does not bind manifest');

const reader = new AnvilReader(abs(path.join(snapshot, 'region'))); const entityReader = new AnvilReader(abs(path.join(snapshot, 'entities')));
const stateAt = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
const targetMismatches = []; const fluidOrGravity = [];
for (const record of forward) { const state = await stateAt(record.cell); if (state !== record.target) targetMismatches.push({ cell: record.cell, expected: record.target, actual: state }); if (wet(state) || gravity.has(name(state))) fluidOrGravity.push({ scope: 'target', cell: record.cell, state }); }
for (const cell of halo) { const state = await stateAt(cell); if (wet(state) || gravity.has(name(state))) fluidOrGravity.push({ scope: 'halo', cell, state }); }
const pierMismatches = [];
for (const bearing of manifest.scope?.pierBearingCells ?? []) for (let y = bearing.y; y <= manifest.scope.deckSupportY[1]; y += 1) { const state = await stateAt({ x: bearing.x, y, z: bearing.z }); if (state !== 'minecraft:polished_deepslate') pierMismatches.push({ x: bearing.x, y, z: bearing.z, actual: state }); }
const girderMismatches = [];
for (let x = manifest.scope.footprint.minX; x <= manifest.scope.footprint.maxX; x += 1) for (let z = manifest.scope.footprint.minZ; z <= manifest.scope.footprint.maxZ; z += 1) for (const y of manifest.scope.deckSupportY) { const state = await stateAt({ x, y, z }); if (state !== 'minecraft:polished_deepslate') girderMismatches.push({ x, y, z, actual: state }); }
const scope = [...targets, ...halo]; const bounds = { minX: Math.min(...scope.map((cell) => cell.x)), maxX: Math.max(...scope.map((cell) => cell.x)), minY: Math.min(...scope.map((cell) => cell.y)), maxY: Math.max(...scope.map((cell) => cell.y)), minZ: Math.min(...scope.map((cell) => cell.z)), maxZ: Math.max(...scope.map((cell) => cell.z)) };
const inside = (cell) => cell.x >= bounds.minX && cell.x <= bounds.maxX && cell.y >= bounds.minY && cell.y <= bounds.maxY && cell.z >= bounds.minZ && cell.z <= bounds.maxZ;
const chunkIds = [...new Set(scope.map((cell) => `${Math.floor(cell.x / 16)},${Math.floor(cell.z / 16)}`))]; const blockEntities = []; const savedEntities = [];
for (const id of chunkIds) { const [x, z] = id.split(',').map(Number); const chunk = await reader.chunk(x, z); for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) { const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) }; if (inside(cell)) blockEntities.push({ cell, id: entity.id ?? entity.Id ?? null }); }
  const entities = await entityReader.chunk(x, z); for (const entity of entities?.Entities ?? entities?.entities ?? []) { if (!Array.isArray(entity.Pos)) continue; const position = entity.Pos.map(Number); const cell = { x: Math.floor(position[0]), y: Math.floor(position[1]), z: Math.floor(position[2]) }; if (inside(cell)) savedEntities.push({ cell, id: entity.id ?? entity.Id ?? null, position }); } }
const concept = read(ag0.source.concept.path); const protectedHits = [];
for (const cell of scope) for (const area of concept.protectedInterfaces ?? []) if (cell.x >= area.bounds.minX && cell.x <= area.bounds.maxX && cell.z >= area.bounds.minZ && cell.z <= area.bounds.maxZ) protectedHits.push({ cell, protectedInterface: area.id });
const passed = targetMismatches.length === 0 && fluidOrGravity.length === 0 && pierMismatches.length === 0 && girderMismatches.length === 0 && blockEntities.length === 0 && savedEntities.length === 0 && protectedHits.length === 0;
const report = { schemaVersion: 1, id: 'AG1-CITYWIDE-EXTERIOR-LOOP-PIER-DECK-SUPPORT-01-INDEPENDENT-POST-QA', generatedAtUtc: new Date().toISOString(), status: passed ? 'PASS_AG1_POSTSTATE_SUPPORT_CONTAINMENT_QA' : 'FAIL_AG1_POSTSTATE_SUPPORT_CONTAINMENT_QA', mutationAuthority: false, postSnapshot: { root: rel(snapshot), completeSaveSha256: intake.packageIdentity?.completeSaveSha256, captureId: read(path.join(snapshot, 'combined-zones-complete-save-capture.json')).captureId }, bindings: { manifest: { path: rel(manifestPath), sha256: fileSha(manifestPath) }, ag0: { path: rel(ag0Path), sha256: fileSha(ag0Path), selectedCandidate: ag0.selectedCandidate.id }, runnerLedger: { path: rel(ledgerPath), sha256: fileSha(ledgerPath) } }, scope: { targetCellCount: targets.length, targetCoordinateSetSha256: hashCells(targets), haloCellCount: halo.length, haloCoordinateSetSha256: hashCells(halo), bounds }, checks: { allForwardTargetsAreCanonicalSupport: { passed: targetMismatches.length === 0, mismatches: targetMismatches }, allPierColumnsContinuous: { passed: pierMismatches.length === 0, mismatches: pierMismatches }, twoDeepGirderComplete: { passed: girderMismatches.length === 0, mismatches: girderMismatches }, targetAndHaloDryAndStable: { passed: fluidOrGravity.length === 0, hits: fluidOrGravity }, noBlockEntities: { passed: blockEntities.length === 0, hits: blockEntities }, noSavedEntities: { passed: savedEntities.length === 0, hits: savedEntities }, protectedFabricPreserved: { passed: protectedHits.length === 0, hits: protectedHits }, exactInverse: true }, nonClaims: ['No rail, walking surface, wall, station, turnout, power, public opening, or passenger service is accepted by this QA.', 'This QA does not execute or authorize an additional world mutation.'] };
report.identitySha256 = sha(`${JSON.stringify(report, null, 2)}\n`);
fs.mkdirSync(path.dirname(abs(output)), { recursive: true }); fs.writeFileSync(abs(output), `${JSON.stringify(report, null, 2)}\n`);
if (!passed) throw new Error(`AG-1 independent post QA failed: ${JSON.stringify({ targetMismatches: targetMismatches.length, fluidOrGravity: fluidOrGravity.length, pierMismatches: pierMismatches.length, girderMismatches: girderMismatches.length, blockEntities: blockEntities.length, savedEntities: savedEntities.length, protectedHits: protectedHits.length })}`);
console.log(JSON.stringify({ status: report.status, report: rel(output), targets: targets.length, halo: halo.length, mutationAuthority: false }, null, 2));
