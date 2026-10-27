#!/usr/bin/env node
/** Independent read-only post QA for the finite West High containment package. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, cellKey, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const option = (flag, fallback = '') => { const index = argv.indexOf(flag); return index < 0 ? fallback : (argv[index + 1] ?? fallback); };
const MANIFEST = option('--manifest', 'data/buildops/sys03-west-high-finite-containment-01.release-manifest.json');
const LEDGER = option('--ledger');
const SNAPSHOT = option('--snapshot');
const OUT = option('--out');
const PROJECT_SOURCE = argv.includes('--project-source');
const ID = 'SYS03-WEST-HIGH-FINITE-CONTAINMENT-01';
const NODE = 'SYS03-WEST-HIGH-FINITE-CONTAINMENT';
const TARGET = 'minecraft:polished_deepslate';
const abs = (file) => path.resolve(ROOT, file);
const rel = (file) => path.relative(ROOT, abs(file)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (condition) throw new Error(`${ID} post QA rejected: ${message}`); };
const name = (state) => state.split('[', 1)[0];
const fluid = (state) => ['minecraft:water', 'minecraft:bubble_column', 'minecraft:lava'].includes(name(state)) || state.includes('waterlogged=true');
const neighbours = (cell) => [
  { x: cell.x - 1, y: cell.y, z: cell.z }, { x: cell.x + 1, y: cell.y, z: cell.z },
  { x: cell.x, y: cell.y - 1, z: cell.z }, { x: cell.x, y: cell.y + 1, z: cell.z },
  { x: cell.x, y: cell.y, z: cell.z - 1 }, { x: cell.x, y: cell.y, z: cell.z + 1 },
];
const parse = (filename) => fs.readFileSync(abs(filename), 'utf8').split(/\r?\n/).filter((line) => line.trim() && !line.startsWith('#')).map((line) => {
  const parts = line.trim().split(/\s+/);
  fail(parts[0] !== 'REPL' || parts.length !== 9 || !parts.slice(1, 7).every((value) => Number.isSafeInteger(Number(value))), `invalid operation: ${line}`);
  return { cell: { x: Number(parts[1]), y: Number(parts[2]), z: Number(parts[3]) }, from: parts[7], target: parts[8] };
});
fail(!OUT, '--out is required'); fail(fs.existsSync(abs(OUT)), '--out must be fresh');
const manifestBytes = fs.readFileSync(abs(MANIFEST)); const manifest = JSON.parse(manifestBytes);
fail(manifest.scope?.releaseId !== ID || manifest.releaseNodeId !== NODE, 'manifest identity drifted');
fail(!Array.isArray(manifest.packages) || manifest.packages.length !== 2, 'expected gravity and water packages');
const gravityPackage = manifest.packages.find(({ key }) => key === 'gravity-foundation-lock-bottom-up');
const waterPackage = manifest.packages.find(({ key }) => key === 'finite-water-component-plug-low-to-high');
fail(!gravityPackage || !waterPackage, 'required package keys missing');
fail(JSON.stringify(manifest.executionOrder?.forward) !== JSON.stringify([gravityPackage.key, waterPackage.key]), 'forward stage order drifted');
fail(JSON.stringify(manifest.executionOrder?.rollback) !== JSON.stringify([waterPackage.key, gravityPackage.key]), 'rollback must restore water while gravity remains locked');
const gravity = parse(gravityPackage.forward); const water = parse(waterPackage.forward);
fail(gravity.length !== 92 || water.length !== 2525, `operation count ${gravity.length}/${water.length}`);
fail(gravity.some((entry) => entry.target !== TARGET) || water.some((entry) => entry.target !== TARGET), 'target-state drifted');
const operated = uniqueCells([...gravity, ...water].map(({ cell }) => cell)); const operatedKeys = new Set(operated.map(cellKey));
fail(operated.length !== 2617, `operated target count ${operated.length}`);
const halo = uniqueCells(water.map(({ cell }) => cell).flatMap(neighbours).filter((cell) => !operatedKeys.has(cellKey(cell))));
const inspectionKeys = new Set([...operated, ...halo].map(cellKey));
let ledger = null; let snapshot = SNAPSHOT;
if (!PROJECT_SOURCE) {
  fail(!LEDGER, '--ledger is required for immutable post QA');
  const ledgerBytes = fs.readFileSync(abs(LEDGER)); ledger = JSON.parse(ledgerBytes);
  fail(ledger.status !== 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE' || ledger.releaseNodeId !== NODE || ledger.transactionId !== manifest.transactionId, 'executed ledger identity/status drifted');
  fail(ledger.manifest?.sha256 !== sha(manifestBytes), 'ledger manifest binding drifted');
  const requiredStages = ['block-entity-clearance', 'live-entity-clearance', `rollback-poststate-preflight:${waterPackage.key}`, `rollback-poststate-preflight:${gravityPackage.key}`];
  fail(requiredStages.some((stage) => !ledger.stages?.some((entry) => entry.stage === stage && entry.status === 'PASS')), 'required guarded-kernel stage is absent');
  snapshot ||= ledger.postSnapshot?.worldRoot ?? (ledger.postSnapshot?.regions ? path.dirname(abs(ledger.postSnapshot.regions)) : '');
}
fail(!snapshot, '--snapshot is required for projected QA or missing from executed ledger');
const snapshotRoot = abs(snapshot);
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(!fs.existsSync(path.join(snapshotRoot, member)), `snapshot lacks ${member}`);
const captureBytes = fs.readFileSync(path.join(snapshotRoot, 'combined-zones-complete-save-capture.json')); const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy !== true, 'snapshot is not immutable');
const reader = new AnvilReader(path.join(snapshotRoot, 'region')); const entityReader = new AnvilReader(path.join(snapshotRoot, 'entities'));
const expectedTargets = new Map(operated.map((cell) => [cellKey(cell), TARGET]));
const stateAt = async (cell) => (PROJECT_SOURCE && expectedTargets.has(cellKey(cell)) ? expectedTargets.get(cellKey(cell)) : stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
const targetFailures = []; for (const cell of operated) { const actual = await stateAt(cell); if (actual !== TARGET) targetFailures.push({ cell, actual }); }
const residualFluid = []; for (const cell of operated) { const actual = await stateAt(cell); if (fluid(actual)) residualFluid.push({ cell, actual }); }
const haloFluid = []; for (const cell of halo) { const actual = await stateAt(cell); if (fluid(actual)) haloFluid.push({ cell, actual }); }
const entityFailures = []; const allCells = [...operated, ...halo]; const bounds = {
  minX: Math.min(...allCells.map(({ x }) => x)), maxX: Math.max(...allCells.map(({ x }) => x)), minY: Math.min(...allCells.map(({ y }) => y)), maxY: Math.max(...allCells.map(({ y }) => y)), minZ: Math.min(...allCells.map(({ z }) => z)), maxZ: Math.max(...allCells.map(({ z }) => z)),
};
for (let cx = Math.floor(bounds.minX / 16); cx <= Math.floor(bounds.maxX / 16); cx += 1) for (let cz = Math.floor(bounds.minZ / 16); cz <= Math.floor(bounds.maxZ / 16); cz += 1) {
  const chunk = await reader.chunk(cx, cz);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) { const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) }; if (inspectionKeys.has(cellKey(cell))) entityFailures.push({ kind: 'block_entity', cell }); }
  const entities = await entityReader.chunk(cx, cz);
  for (const entity of entities?.Entities ?? entities?.entities ?? []) { const pos = entity.Pos?.slice(0, 3).map(Number); if (pos?.length === 3) { const cell = { x: Math.floor(pos[0]), y: Math.floor(pos[1]), z: Math.floor(pos[2]) }; if (inspectionKeys.has(cellKey(cell))) entityFailures.push({ kind: 'saved_entity', cell, id: entity.id ?? entity.Id ?? null }); } }
}
const checks = { all2617TargetsExact: targetFailures.length === 0, zeroFluidInOperatedUnion: residualFluid.length === 0, zeroFluidInExteriorHalo: haloFluid.length === 0, blockEntityAndSavedEntityExclusion: entityFailures.length === 0, gravityLocks: { expected: 92, actualPds: gravity.filter(({ cell }) => expectedTargets.get(cellKey(cell)) === TARGET).length }, waterTreatment: { expected: 2525, actualPds: water.filter(({ cell }) => expectedTargets.get(cellKey(cell)) === TARGET).length }, rollbackOrderRetainsGravityUntilWaterRestored: true };
const failures = Object.entries(checks).filter(([, value]) => value === false).map(([key]) => key);
const report = { schemaVersion: 1, id: `${ID}-INDEPENDENT-POST-QA`, status: failures.length ? 'POST_RELEASE_QA_FAIL' : (PROJECT_SOURCE ? 'PROJECTED_QA_PASS_NOT_POST_RELEASE' : 'PASS_EXECUTED_SYS03_WEST_HIGH_FINITE_CONTAINMENT_QA'), readOnly: true, worldMutated: false, qaMode: PROJECT_SOURCE ? 'PROJECTED_SOURCE_OVERLAY_ONLY' : 'IMMUTABLE_POST_SNAPSHOT', source: { manifest: rel(MANIFEST), manifestSha256: sha(manifestBytes), ledger: LEDGER ? rel(LEDGER) : null, snapshot: rel(snapshot), snapshotCaptureId: capture.captureId }, geometry: { operatedCells: operated.length, waterComponentCells: water.length, gravityCells: gravity.length, exteriorHaloCells: halo.length }, checks, failures, targetFailures: targetFailures.slice(0, 20), residualFluid: residualFluid.slice(0, 20), haloFluid: haloFluid.slice(0, 20), entityFailures: entityFailures.slice(0, 20), nonClaims: ['Projected QA is never post-release evidence.', 'No RCON call or world mutation is performed.', 'No corridor, rail, access, or passenger service is commissioned.'] };
report.qaPayloadSha256 = sha(JSON.stringify(report)); fs.mkdirSync(path.dirname(abs(OUT)), { recursive: true }); fs.writeFileSync(abs(OUT), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, out: rel(OUT), failures, operatedCells: operated.length, haloCells: halo.length }, null, 2));
if (failures.length) process.exitCode = 2;
