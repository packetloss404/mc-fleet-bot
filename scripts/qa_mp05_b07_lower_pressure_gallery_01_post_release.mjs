#!/usr/bin/env node
/** Independent immutable-post QA for the B07 lower pressure gallery. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const option = (flag, fallback = null) => { const i = argv.indexOf(flag); return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback; };
const LEDGER = option('--ledger');
const OUT = option('--out');
const MANIFEST = option('--manifest', 'data/buildops/mp05-b07-lower-pressure-gallery-01.release-manifest.json');
const RELEASE_ID = 'MP05-B07-LOWER-PRESSURE-GALLERY-01';
const RELEASE_NODE_ID = 'CZ-MP05-B07-LOWER-PRESSURE-GALLERY';
const PD = 'minecraft:polished_deepslate';
const HATCH = 'minecraft:iron_trapdoor[facing=north,half=bottom,open=false,powered=false,waterlogged=false]';
const LADDER = 'minecraft:ladder[facing=east,waterlogged=false]';
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (ok, message) => { if (!ok) throw new Error(`${RELEASE_ID} post-QA rejected: ${message}`); };
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, n) => a + n);
const box = (x1, x2, y1, y2, z1, z2) => { const out = []; for (const x of range(x1, x2)) for (const y of range(y1, y2)) for (const z of range(z1, z2)) out.push({ x, y, z }); return out; };
const key = cellKey;
const exact = (cells) => { const result = uniqueCells(cells); const xs = result.map(({ x }) => x), ys = result.map(({ y }) => y), zs = result.map(({ z }) => z); return { cellCount: result.length, bounds: result.length ? { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys), minZ: Math.min(...zs), maxZ: Math.max(...zs) } : null }; };
const name = (state) => state.split('[', 1)[0];
const isAir = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(name(state));
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(name(state)) || state.includes('waterlogged=true');
const stateSetSha = (records) => sha256(JSON.stringify(records.map(({ cell, state }) => ({ x: cell.x, y: cell.y, z: cell.z, state })).sort((a, b) => a.x - b.x || a.y - b.y || a.z - b.z || a.state.localeCompare(b.state))));

const corridorOuter = box(2107, 2111, 7, 10, -428, -398);
const corridorCore = box(2108, 2110, 8, 9, -428, -399);
const lowerOuter = box(2108, 2110, 4, 10, -429, -427);
const lowerCore = box(2109, 2109, 5, 9, -428, -428);
const entry = [{ x: 2109, y: 4, z: -429 }];
const entrySupport = [{ x: 2109, y: 3, z: -428 }];
const hatch = [{ x: 2109, y: 5, z: -428 }];
const ladders = [{ x: 2109, y: 6, z: -428 }, { x: 2109, y: 7, z: -428 }];
const special = new Set([...entry, ...entrySupport, ...hatch, ...ladders].map(key));
const core = uniqueCells([...corridorCore, ...lowerCore]);
const coreKeys = new Set(core.map(key));
const shell = uniqueCells([...corridorOuter, ...lowerOuter, { x: 2112, y: 10, z: -416 }, { x: 2112, y: 10, z: -415 }, { x: 2112, y: 10, z: -414 }, { x: 2113, y: 10, z: -414 }, { x: 2113, y: 10, z: -413 }, { x: 2113, y: 10, z: -412 }])
  .filter((cell) => !coreKeys.has(key(cell)) && !special.has(key(cell)));
const corridorRoute = box(2108, 2110, 8, 9, -427, -399);
const wetReview = box(2094, 2114, 5, 17, -438, -388);

for (const [label, value] of [['--ledger', LEDGER], ['--out', OUT]]) fail(value, `${label} is required`);
const ledgerBytes = fs.readFileSync(abs(LEDGER));
const manifestBytes = fs.readFileSync(abs(MANIFEST));
const ledger = JSON.parse(ledgerBytes);
const manifest = JSON.parse(manifestBytes);
fail(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE', 'scoped release kernel is not complete');
fail(ledger.releaseNodeId === RELEASE_NODE_ID && ledger.transactionId === manifest.transactionId, 'ledger identity drifted');
fail(manifest.releaseNodeId === RELEASE_NODE_ID && manifest.scope?.releaseId === RELEASE_ID, 'manifest identity drifted');
fail(ledger.manifest?.sha256 === sha256(manifestBytes), 'ledger is not bound to this exact manifest');
for (const stage of ['block-entity-clearance', 'live-entity-clearance', 'rollback-poststate-preflight:outer-fluid-liner-and-bulkhead', 'rollback-poststate-preflight:sealed-core-excavation-and-entry-aperture', 'rollback-poststate-preflight:controlled-hatch-ladder-and-landing']) fail(ledger.stages?.some((entry) => entry.stage === stage && entry.status === 'PASS'), `required runner stage is not PASS: ${stage}`);
const postRoot = ledger.postSnapshot?.worldRoot ?? (ledger.postSnapshot?.regions ? path.dirname(abs(ledger.postSnapshot.regions)) : null);
fail(postRoot && fs.existsSync(abs(postRoot)), 'fresh immutable post snapshot is unavailable');
const reader = new AnvilReader(path.join(abs(postRoot), 'region'));
const records = async (cells) => {
  const result = [];
  // AnvilReader caches decoded chunks only after the first parse resolves. A
  // large Promise.all over adjacent cells races that cache and repeatedly
  // decodes the same chunks, exhausting memory before QA can emit evidence.
  // Sequential reads preserve the same immutable query set while priming that
  // cache exactly once per chunk.
  for (const cell of cells) {
    result.push({
      cell,
      state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)),
    });
  }
  return result;
};
const [shellPost, corePost, entryPost, supportPost, hatchPost, ladderPost, routePost, wetPost] = await Promise.all([
  records(shell), records(core), records(entry), records(entrySupport), records(hatch), records(ladders), records(corridorRoute), records(wetReview),
]);
const retainedFluid = wetPost.filter(({ state }) => isFluid(state));
const routeFailures = [];
for (const cell of corridorRoute.filter(({ y }) => y === 8)) {
  const feet = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  const head = stateToCommandString(await reader.blockState(cell.x, cell.y + 1, cell.z));
  const support = stateToCommandString(await reader.blockState(cell.x, cell.y - 1, cell.z));
  if (!isAir(feet) || !isAir(head) || isAir(support) || isFluid(support)) routeFailures.push({ cell, feet, head, support });
}
const checks = {
  linerAndBulkheadExact: shellPost.every(({ state }) => state === PD),
  sealedCoreDryExceptFixtures: corePost.filter(({ cell }) => !new Set([...hatch, ...ladders].map(key)).has(key(cell))).every(({ state }) => isAir(state)),
  lowerEntryOpenedAndSupported: entryPost.every(({ state }) => isAir(state)) && supportPost.every(({ state }) => state === PD),
  controlledHatchClosedUnpowered: hatchPost.every(({ state }) => state === HATCH),
  twoExactLadderRungs: ladderPost.every(({ state }) => state === LADDER),
  twentyNineThreeWideTwoClearHorizontalStations: routeFailures.length === 0 && corridorRoute.filter(({ y }) => y === 8).length === 87,
  farPressureBulkheadClosed: shellPost.filter(({ cell }) => cell.z === -398 && cell.y >= 8 && cell.y <= 9).every(({ state }) => state === PD),
  retainedR06FluidBoundaryExact: retainedFluid.length === manifest.scope?.retainedFluidBoundary?.cellCount && stateSetSha(retainedFluid) === manifest.scope?.retainedFluidBoundary?.stateSetSha256,
};
const failures = Object.entries(checks).filter(([, passed]) => !passed).map(([id]) => id);
const report = {
  schemaVersion: 1, id: 'mp05-b07-lower-pressure-gallery-01-independent-post-qa', status: failures.length ? 'FAIL' : 'PASS_EXECUTED_B07_LOWER_PRESSURE_GALLERY', readOnly: true, worldMutated: false,
  release: { releaseId: RELEASE_ID, releaseNodeId: RELEASE_NODE_ID, ledger: { path: rel(LEDGER), sha256: sha256(ledgerBytes) }, manifest: { path: rel(MANIFEST), sha256: sha256(manifestBytes), manifestIdentity: manifest.manifestIdentity } },
  postSnapshot: ledger.postSnapshot,
  geometry: { linerAndBulkhead: exact(shell), retainedCore: exact(core), lowerEntry: exact(entry), controlledHatch: exact(hatch), ladder: exact(ladders), horizontalStations: 29, retainedWetReviewVolume: exact(wetReview) },
  checks, failures, routeFailures: routeFailures.slice(0, 12), retainedFluidBoundary: { count: retainedFluid.length, stateSetSha256: stateSetSha(retainedFluid) },
  functionalBoundary: { classification: 'RESTRICTED_LOWER_SIDE_WATER_PRESSURE_INSPECTION_GALLERY_ONLY', lowerHelixAccess: true, normalHorizontalInspectionGallery: true, upperBulkheadClosed: true, publicAccessCommissioned: false, emergencyEgressCommissioned: false, upperB07ConnectionCommissioned: false, fluidDischargeCommissioned: false },
};
report.qaPayloadSha256 = sha256(JSON.stringify(report));
fs.mkdirSync(path.dirname(abs(OUT)), { recursive: true });
fs.writeFileSync(abs(OUT), `${JSON.stringify(report, null, 2)}\n`);
if (failures.length) throw new Error(`${RELEASE_ID} post-QA failed: ${failures.join(', ')}`);
process.stdout.write(`${JSON.stringify({ status: report.status, out: rel(OUT), qaPayloadSha256: report.qaPayloadSha256 }, null, 2)}\n`);
