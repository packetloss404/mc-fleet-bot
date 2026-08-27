#!/usr/bin/env node
/**
 * B07's second wet-band intervention: a source-bound, dual-bulkhead riser
 * from the executed lower pressure gallery to the retained R09E lower
 * landing.  It is a restricted maintenance connection, never a public route.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, boundsOf, cellKey, hashCells, replLine, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(name); return i < 0 ? fallback : (args[i + 1] ?? fallback); };
const SNAPSHOT = opt('--snapshot', 'data/worldsnap-mp05-b07-pressure-gallery-post-20260826T202000Z');
const OUT_DIR = opt('--out-dir', 'data/buildops');
const BASENAME = opt('--basename', 'mp05-b07-wet-riser-receiver-01');
const GENERATED_AT = opt('--generated-at', '2026-08-26T21:15:00.000Z');
const RELEASE_ID = 'MP05-B07-WET-RISER-RECEIVER-01';
const NODE = 'CZ-MP05-B07-WET-RISER-RECEIVER';
const AUTH = 'docs/masterplans/05-combined-zones/mp05-b07-wet-riser-receiver-governor-standing-execution-authorization.json';
const PD = 'minecraft:polished_deepslate';
const AIR = 'minecraft:air';
const HATCH = 'minecraft:oak_trapdoor[facing=north,half=bottom,open=false,powered=false,waterlogged=false]';
const LADDER = 'minecraft:ladder[facing=south,waterlogged=false]';
const abs = (f) => path.resolve(ROOT, f);
const rel = (f) => path.relative(ROOT, abs(f)).split(path.sep).join('/');
const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');
const fail = (ok, message) => { if (!ok) throw new Error(`${RELEASE_ID} compiler rejected: ${message}`); };
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const box = (x1, x2, y1, y2, z1, z2) => { const out = []; for (const x of range(x1, x2)) for (const y of range(y1, y2)) for (const z of range(z1, z2)) out.push({ x, y, z }); return out; };
const exact = (cells) => { const c = uniqueCells(cells); return { cellCount: c.length, bounds: c.length ? boundsOf(c) : null, coordinateSetSha256: hashCells(c) }; };
const name = (s) => s.split('[', 1)[0];
const air = (s) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(name(s));
const fluid = (s) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(name(s)) || s.includes('waterlogged=true');
const gravity = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:dragon_egg', 'minecraft:pointed_dripstone', 'minecraft:scaffolding']);
const protectedBlocks = new Set(['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern', 'minecraft:beacon', 'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw']);
const census = (records) => Object.fromEntries([...records.reduce((m, r) => m.set(r.state, (m.get(r.state) ?? 0) + 1), new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)));
const stateSet = (records) => sha(JSON.stringify(records.map(({ cell, state }) => ({ ...cell, state })).sort((a, b) => a.x - b.x || a.y - b.y || a.z - b.z || a.state.localeCompare(b.state))));

// The existing gallery terminates against z=-398. This scope replaces only
// its 3x2 central face, turns two blocks north under containment, and rises
// inside a five-wide sealed tube to a three-cell manual hatch at R09E's
// already-built lower landing. The R09J y30 cap remains entirely untouched.
const turnOuter = box(2107, 2111, 7, 10, -402, -398);
const turnCore = box(2108, 2110, 8, 9, -401, -398);
const riserOuter = box(2107, 2111, 8, 18, -403, -399);
const riserCore = box(2108, 2110, 9, 17, -401, -401);
const upperOpening = box(2108, 2110, 18, 18, -401, -401);
const ladders = range(10, 17).map((y) => ({ x: 2109, y, z: -401 }));
const ladderKeys = new Set(ladders.map(cellKey));
const openingKeys = new Set(upperOpening.map(cellKey));
const core = uniqueCells([...turnCore, ...riserCore]);
const coreKeys = new Set(core.map(cellKey));
const outer = uniqueCells([...turnOuter, ...riserOuter]);
const shell = outer.filter((c) => !coreKeys.has(cellKey(c)) && !openingKeys.has(cellKey(c)));
const shellKeys = new Set(shell.map(cellKey));
const dryCore = core.filter((c) => !ladderKeys.has(cellKey(c)));
const targets = uniqueCells([...shell, ...dryCore, ...upperOpening, ...ladders]);
const targetKeys = new Set(targets.map(cellKey));
fail(targets.length === shell.length + dryCore.length + upperOpening.length + ladders.length, 'target partitions overlap');

function body(entries, forward) { return `${entries.map(({ cell, source, target }) => replLine(cell, forward ? source : target, forward ? target : source)).join('\n')}\n`; }
function writeOp(key, entries, forward, source) {
  const text = body(entries, forward); const filename = path.join(OUT_DIR, `${BASENAME}.${key}.${forward ? 'forward' : 'rollback'}.txt`);
  fs.writeFileSync(abs(filename), `# GENERATED FILE — ${RELEASE_ID} (${key}, ${forward ? 'forward' : 'rollback'})\n# immutable offline source: ${rel(source)}\n# operation SHA-256: ${sha(text)}\n${text}`);
  return { filename: rel(filename), bodySha: sha(text), commandCount: entries.length };
}

const main = async () => {
  const source = abs(SNAPSHOT);
  for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(source, member)), `complete immutable source missing ${member}`);
  const captureBytes = fs.readFileSync(path.join(source, 'combined-zones-complete-save-capture.json')); const capture = JSON.parse(captureBytes);
  fail(capture.immutableCopy === true && Array.isArray(capture.requiredMembers) && capture.requiredMembers.length > 0, 'source is not a complete immutable capture');
  for (const member of capture.requiredMembers) { const f = path.join(source, member.path); fail(fs.existsSync(f) && fs.statSync(f).size === member.bytes && sha(fs.readFileSync(f)) === member.sha256, `source member drifted: ${member.path}`); }
  const reader = new AnvilReader(path.join(source, 'region')); const entities = new AnvilReader(path.join(source, 'entities')); const cache = new Map();
  const get = async (c) => { const k = cellKey(c); if (!cache.has(k)) cache.set(k, stateToCommandString(await reader.blockState(c.x, c.y, c.z))); return cache.get(k); };
  const halo = uniqueCells(targets.flatMap(({ x, y, z }) => box(x - 1, x + 1, y - 1, y + 1, z - 1, z + 1)));
  const targetRecords = []; for (const cell of targets) targetRecords.push({ cell, state: await get(cell) });
  const targetBounds = boundsOf(targets);
  fail((await get({ x: 2109, y: 8, z: -398 })) === PD && (await get({ x: 2109, y: 9, z: -398 })) === PD, 'executed lower-gallery pressure bulkhead drifted');
  for (const cell of upperOpening) fail((await get(cell)) === 'minecraft:polished_diorite', `R09E lower landing source drifted at ${cellKey(cell)}`);
  for (const cell of upperOpening) fail(air(await get({ x: cell.x, y: 19, z: cell.z })), `upper receiver standing cell is occupied at ${cellKey(cell)}`);
  for (const cell of upperOpening.filter(({ x }) => x >= 2109)) fail(air(await get({ x: cell.x, y: 20, z: cell.z })), `upper receiver head cell is occupied at ${cellKey(cell)}`);
  fail((await get({ x: 2105, y: 30, z: -397 })) === 'minecraft:polished_diorite' && (await get({ x: 2105, y: 31, z: -397 })) === 'minecraft:polished_diorite', 'R09J upper gravity cap drifted');
  fail(targetRecords.every(({ state }) => !protectedBlocks.has(name(state))), 'target includes protected core/container block');
  const chunks = [...new Set(halo.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))]; const blockEntities = []; const savedEntities = [];
  for (const pair of chunks) { const [cx, cz] = pair.split(',').map(Number); const bc = await reader.chunk(cx, cz); for (const e of bc?.block_entities ?? bc?.blockEntities ?? []) { const c = { x: Number(e.x), y: Number(e.y), z: Number(e.z) }; if (c.x >= targetBounds.minX - 1 && c.x <= targetBounds.maxX + 1 && c.y >= targetBounds.minY - 1 && c.y <= targetBounds.maxY + 1 && c.z >= targetBounds.minZ - 1 && c.z <= targetBounds.maxZ + 1) blockEntities.push(c); } const ec = await entities.chunk(cx, cz); for (const e of ec?.Entities ?? ec?.entities ?? []) { if (!Array.isArray(e.Pos)) continue; const [x, y, z] = e.Pos.map(Number); if (x >= targetBounds.minX - 1 && x < targetBounds.maxX + 2 && y >= targetBounds.minY - 1 && y < targetBounds.maxY + 2 && z >= targetBounds.minZ - 1 && z < targetBounds.maxZ + 2) savedEntities.push([x, y, z]); } }
  fail(blockEntities.length === 0 && savedEntities.length === 0, 'block or saved entity in target halo');
  const desired = new Map(); for (const c of shell) desired.set(cellKey(c), PD); for (const c of dryCore) desired.set(cellKey(c), AIR); for (const c of upperOpening) desired.set(cellKey(c), HATCH); for (const c of ladders) desired.set(cellKey(c), LADDER);
  for (const cell of ladders) fail(desired.get(cellKey({ x: cell.x, y: cell.y, z: cell.z + 1 })) === PD, `ladder lacks its final south support at ${cellKey(cell)}`);
  const entries = (cells) => cells.map((cell) => ({ cell, source: targetRecords.find((r) => cellKey(r.cell) === cellKey(cell))?.state, target: desired.get(cellKey(cell)) })).filter(({ source, target }) => source !== target);
  const liner = entries(shell); const clearance = entries(dryCore); const receiver = entries([...upperOpening, ...ladders]);
  fail(liner.length && clearance.length && receiver.length, 'one ordered package has no source-to-target work');
  for (const c of halo) { const state = await get(c); if (!targetKeys.has(cellKey(c)) && gravity.has(name(state))) { const below = desired.get(cellKey({ x: c.x, y: c.y - 1, z: c.z })) ?? await get({ x: c.x, y: c.y - 1, z: c.z }); fail(!air(below) && !fluid(below), `external gravity lacks support at ${cellKey(c)}`); } }
  const wetReview = box(2094, 2114, 5, 17, -438, -388); const retainedFluid = []; for (const c of wetReview) { const state = await get(c); if (!targetKeys.has(cellKey(c)) && fluid(state)) retainedFluid.push({ cell: c, state }); }
  fail(retainedFluid.length > 0, 'no finite retained wet boundary was found');
  fs.mkdirSync(abs(OUT_DIR), { recursive: true });
  const groups = [['sealed-outer-liner-and-dual-bulkheads', liner], ['dry-core-turn-and-riser-excavation', clearance], ['upper-receiver-hatches-and-ladder', receiver]].map(([key, e]) => ({ key, entries: [...e].sort((a, b) => key.startsWith('sealed') ? b.cell.y - a.cell.y || a.cell.z - b.cell.z || a.cell.x - b.cell.x : a.cell.y - b.cell.y || a.cell.z - b.cell.z || a.cell.x - b.cell.x) }));
  const emitted = groups.map((g) => ({ ...g, forward: writeOp(g.key, g.entries, true, source), rollback: writeOp(g.key, [...g.entries].reverse(), false, source) }));
  const base = { schemaVersion: 1, transactionId: BASENAME, generatedAtUtc: GENERATED_AT, status: 'COMPILED_FROM_EXECUTED_POSTSOURCE_AWAITING_FRESH_GUARDED_KERNEL', releaseNodeId: NODE, mvpScope: true, scopeIds: ['MP03-A', 'MP04-A', 'MP05-A', 'SYS-02', 'B07-WET-RISER-RECEIVER'], packages: emitted.map((g) => ({ key: g.key, forward: g.forward.filename, rollback: g.rollback.filename })), executionOrder: { forward: groups.map((g) => g.key), rollback: groups.map((g) => g.key).reverse() }, scopedRunner: { wrapper: 'scripts/run_combined_zones_scoped_release.mjs', authorization: AUTH, releaseNodeId: NODE, defaultMode: 'PREPARE_ONLY', liveExecutionOptIn: '--execute' }, source: { snapshotRoot: rel(source), completeSaveCapture: { path: rel(path.join(source, 'combined-zones-complete-save-capture.json')), sha256: sha(captureBytes), captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc, immutableCopy: true } }, scope: { releaseId: RELEASE_ID, canonicalOwner: 'MP05-B07-CONTAINMENT-IMPLEMENTATION-TEAM', governorDelegatedRoles: { constructionOwner: 'B07 wet-riser implementation lead', hydrologyContainmentOwner: 'B07 fluid containment lead', upperReceiverOwner: 'R09E lower-landing counterpart', routeSafetyOwner: 'PassageWay safety and recovery lead', releaseOperator: 'Guarded-release implementation operator' }, purpose: 'Replace the executed lower-gallery inspection bulkhead with a sealed turn and vertical dry riser, terminating at a three-cell manually closable R09E lower-landing receiver.', excluded: ['R09J cap', 'R07J surface headhouse', 'surface receiver', 'public opening', 'emergency egress', 'B08/B09', 'fluid discharge', 'transport'], outerLinerAndDualBulkheads: exact(shell), dryTurnAndRiserCore: exact(dryCore), upperReceiverHatches: exact(upperOpening), ladder: exact(ladders), targetHalo: exact(halo), retainedFluidBoundary: { ...exact(retainedFluid.map((r) => r.cell)), stateSetSha256: stateSet(retainedFluid) }, lowerBulkheadInterface: exact(box(2108, 2110, 8, 9, -398, -398)), upperReceiverStandingCells: exact(upperOpening.filter(({ x }) => x >= 2109).map((c) => ({ x: c.x, y: 19, z: c.z }))), protectedCapsRetained: [{ x: 2105, y: 30, z: -397, state: 'minecraft:polished_diorite' }, { x: 2105, y: 31, z: -397, state: 'minecraft:polished_diorite' }] }, target: { operatedUnion: exact(targets), sourceStateCensus: census(targetRecords), desiredStateCensus: census(targetRecords.map((r) => ({ state: desired.get(cellKey(r.cell)) }))), packageTargetsDisjoint: true }, operations: Object.fromEntries(emitted.map((g) => [g.key, { forwardSha256: g.forward.bodySha, rollbackSha256: g.rollback.bodySha, forwardCommandCount: g.forward.commandCount, rollbackCommandCount: g.rollback.commandCount, target: exact(g.entries.map((e) => e.cell)), exactInverse: true }])), functionalAcceptance: { classification: 'RESTRICTED_DUAL_BULKHEAD_B07_MAINTENANCE_RISER_ONLY', routeWidth: 3, clearHeight: 2, sealedWetBandRiser: true, lowerGalleryInterface: true, upperR09ELowerLandingReceiver: true, manualClosedReceiverHatches: 3, ladderRungs: ladders.length, publicAccessCommissioned: false, emergencyEgressCommissioned: false, surfaceConnectionCommissioned: false, retainedFluidBoundaryCells: retainedFluid.length }, hardStops: { requiresFreshCompleteImmutableSourceImmediatelyBeforeExecution: true, requiresExactSourcePreflightAndProjectedRollback: true, requiresStrictNoopForwardAndRollbackParserChecks: true, requiresBlockAndLiveEntityClearance: true, requiresJournaledStrictExecution: true, requiresFreshPostSnapshotAndRollbackPoststatePreflight: true, requiresIndependentRiserReceiverQa: true }, safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, executionAuthorizedByThisManifest: false, noExternalSignaturesRequired: true, nonClaims: ['No public route', 'No emergency egress', 'No exterior or surface opening', 'No unsealed water/lava path', 'No R09J cap change'] } };
  const manifest = { ...base, manifestIdentity: sha(JSON.stringify(base)) }; const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`); fs.writeFileSync(abs(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ status: 'COMPILED', manifest: rel(manifestPath), releaseId: RELEASE_ID, operatedCells: targets.length, changedCells: emitted.reduce((n, g) => n + g.entries.length, 0), retainedFluidBoundaryCells: retainedFluid.length }, null, 2));
};
await main();
