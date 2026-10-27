#!/usr/bin/env node
/**
 * B07's first usable wet-band intervention: a closed, lower-side pressure
 * gallery.  It is deliberately not an egress or through-route.  The gallery
 * starts at the existing R09B helix, crosses the wet transfer zone inside a
 * continuous liner, and terminates at a solid inspection bulkhead below the
 * retained upper system.  The ordered transaction closes the liner before
 * excavation, then installs the controlled hatch and ladder.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  AnvilReader, boundsOf, cellKey, hashCells, replLine, stateToCommandString, uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const option = (flag, fallback) => { const i = argv.indexOf(flag); return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback; };
const SNAPSHOT = option('--snapshot', 'data/worldsnap-mp08-c1-contained-corridor-post-20260826T194000Z');
const OUT_DIR = option('--out-dir', 'data/buildops');
const BASENAME = option('--basename', 'mp05-b07-lower-pressure-gallery-01');
const GENERATED_AT = option('--generated-at', '2026-08-26T20:30:00.000Z');
const RELEASE_ID = 'MP05-B07-LOWER-PRESSURE-GALLERY-01';
const RELEASE_NODE_ID = 'CZ-MP05-B07-LOWER-PRESSURE-GALLERY';
const AUTHORIZATION = 'docs/masterplans/05-combined-zones/mp05-b07-lower-pressure-gallery-governor-standing-execution-authorization.json';
const PD = 'minecraft:polished_deepslate';
const AIR = 'minecraft:air';
const HATCH = 'minecraft:iron_trapdoor[facing=north,half=bottom,open=false,powered=false,waterlogged=false]';
const LADDER = 'minecraft:ladder[facing=east,waterlogged=false]';
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (ok, message) => { if (!ok) throw new Error(`${RELEASE_ID} compiler rejected: ${message}`); };
const key = cellKey;
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, n) => a + n);
const box = (x1, x2, y1, y2, z1, z2) => {
  const result = [];
  for (const x of range(x1, x2)) for (const y of range(y1, y2)) for (const z of range(z1, z2)) result.push({ x, y, z });
  return result;
};
const exact = (cells) => { const result = uniqueCells(cells); return { cellCount: result.length, bounds: result.length ? boundsOf(result) : null, coordinateSetSha256: hashCells(result) }; };
const name = (state) => state.split('[', 1)[0];
const isAir = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(name(state));
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(name(state)) || state.includes('waterlogged=true');
const gravity = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:dragon_egg', 'minecraft:pointed_dripstone', 'minecraft:scaffolding']);
const protectedBlocks = new Set(['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern', 'minecraft:beacon', 'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw']);
const stateCensus = (records, field = 'state') => Object.fromEntries([...records.reduce((counts, record) => { counts.set(record[field], (counts.get(record[field]) ?? 0) + 1); return counts; }, new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)));
const stateSetSha = (records) => sha256(JSON.stringify(records.map(({ cell, state }) => ({ x: cell.x, y: cell.y, z: cell.z, state })).sort((a, b) => a.x - b.x || a.y - b.y || a.z - b.z || a.state.localeCompare(b.state))));

// The 5x4 horizontal outer tube carries a three-wide, two-clear gallery from
// the R09B top landing through the wet band.  Its solid z=-398 face is a
// pressure bulkhead; no upper B07 cap or exterior receiver is opened.
const corridorOuter = box(2107, 2111, 7, 10, -428, -398);
const corridorCore = box(2108, 2110, 8, 9, -428, -399);
// The lower five-by-five shaft merges the gallery with R09B's actual helix
// endpoint at (2109,3,-430).  It contains only a controlled hatch and ladder.
const lowerOuter = box(2108, 2110, 4, 10, -429, -427);
const lowerCore = box(2109, 2109, 5, 9, -428, -428);
const entryOpening = [{ x: 2109, y: 4, z: -429 }];
const entrySupport = [{ x: 2109, y: 3, z: -428 }];
const hatch = [{ x: 2109, y: 5, z: -428 }];
const ladders = [{ x: 2109, y: 6, z: -428 }, { x: 2109, y: 7, z: -428 }];
const ladderKeys = new Set(ladders.map(key));
const hatchKeys = new Set(hatch.map(key));
const entryKeys = new Set(entryOpening.map(key));
const supportKeys = new Set(entrySupport.map(key));
const core = uniqueCells([...corridorCore, ...lowerCore]);
const coreKeys = new Set(core.map(key));
// The one-cell outer review finds this exact three-cell inherited gravel lip
// above air.  It is physically coupled to the gallery's east wall, so the
// liner package gives it permanent stone support rather than leaving a live
// falling-block edge beside the new wet-band route.
const gravityRecoverySupports = [
  { x: 2112, y: 10, z: -416 }, { x: 2112, y: 10, z: -415 }, { x: 2112, y: 10, z: -414 },
  { x: 2113, y: 10, z: -414 }, { x: 2113, y: 10, z: -413 }, { x: 2113, y: 10, z: -412 },
];
const gravitySupportKeys = new Set(gravityRecoverySupports.map(key));
const shell = uniqueCells([...corridorOuter, ...lowerOuter, ...gravityRecoverySupports]).filter((cell) => !coreKeys.has(key(cell)) && !entryKeys.has(key(cell)) && !supportKeys.has(key(cell)));
const shellKeys = new Set(shell.map(key));
const coreAir = core.filter((cell) => !ladderKeys.has(key(cell)) && !hatchKeys.has(key(cell)));
const packageCells = uniqueCells([...shell, ...coreAir, ...entryOpening, ...entrySupport, ...hatch, ...ladders]);
const packageKeys = new Set(packageCells.map(key));
fail(packageCells.length === shell.length + coreAir.length + entryOpening.length + entrySupport.length + hatch.length + ladders.length, 'package partitions overlap');

function operationBody(entries, direction) {
  return `${entries.map(({ cell, sourceState, targetState }) => replLine(cell, direction === 'forward' ? sourceState : targetState, direction === 'forward' ? targetState : sourceState)).join('\n')}\n`;
}
function operationFile(packageKey, entries, direction, source) {
  const body = operationBody(entries, direction);
  const bodySha = sha256(body);
  const filename = path.join(OUT_DIR, `${BASENAME}.${packageKey}.${direction}.txt`);
  fs.writeFileSync(abs(filename), [
    `# GENERATED FILE — ${RELEASE_ID} (${packageKey}, ${direction})`,
    `# immutable offline source: ${rel(source)}`,
    `# operation SHA-256: ${bodySha}`,
    body.trimEnd(), '',
  ].join('\n'));
  return { filename: rel(filename), bodySha, commandCount: entries.length };
}

async function main() {
  const source = abs(SNAPSHOT);
  for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(source, member)), `complete immutable source missing ${member}`);
  const captureBytes = fs.readFileSync(path.join(source, 'combined-zones-complete-save-capture.json'));
  const capture = JSON.parse(captureBytes);
  fail(capture.immutableCopy === true && Array.isArray(capture.requiredMembers) && capture.requiredMembers.length > 0, 'source capture is not complete immutable evidence');
  for (const member of capture.requiredMembers) {
    const filename = path.join(source, member.path);
    fail(fs.existsSync(filename) && fs.statSync(filename).size === member.bytes && sha256(fs.readFileSync(filename)) === member.sha256, `source member drifted: ${member.path}`);
  }
  const reader = new AnvilReader(path.join(source, 'region'));
  const entityReader = new AnvilReader(path.join(source, 'entities'));
  const allHalo = uniqueCells(packageCells.flatMap(({ x, y, z }) => box(x - 1, x + 1, y - 1, y + 1, z - 1, z + 1)));
  const stateCache = new Map();
  const get = async (cell) => { const id = key(cell); if (!stateCache.has(id)) stateCache.set(id, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z))); return stateCache.get(id); };
  const [targetRecords, haloRecords] = await Promise.all([
    Promise.all(packageCells.map(async (cell) => ({ cell, state: await get(cell) }))),
    Promise.all(allHalo.map(async (cell) => ({ cell, state: await get(cell) }))),
  ]);
  const targetsByKey = new Map(targetRecords.map((record) => [key(record.cell), record.state]));
  // The lower top is the accepted helix endpoint.  This makes the gallery a
  // real maintained route, not a disconnected wet-band void.
  const helixEndpoint = { x: 2109, y: 3, z: -430 };
  fail((await get(helixEndpoint)).startsWith('minecraft:smooth_stone_slab'), 'R09B helix endpoint drifted');
  fail((await get({ x: 2109, y: 4, z: -430 })) === AIR, 'R09B endpoint standing cell is not air');
  fail((await get({ x: 2109, y: 4, z: -429 })) === 'minecraft:polished_diorite', 'lower cap opening source drifted');
  fail((await get({ x: 2109, y: 3, z: -428 })) === AIR, 'new entry support source drifted');
  for (const cell of gravityRecoverySupports) {
    const above = await get({ x: cell.x, y: cell.y + 1, z: cell.z });
    const below = await get(cell);
    fail(name(above) === 'minecraft:gravel' && isAir(below), `expected inherited unsupported gravel lip drifted at ${key(cell)}`);
  }
  const forbiddenTargets = targetRecords.filter(({ state }) => protectedBlocks.has(name(state)));
  fail(forbiddenTargets.length === 0, `target includes protected block: ${JSON.stringify(forbiddenTargets.slice(0, 6))}`);
  const targetBounds = boundsOf(packageCells);
  const chunkKeys = [...new Set(allHalo.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))];
  const blockEntities = []; const savedEntities = [];
  for (const chunkKey of chunkKeys) {
    const [x, z] = chunkKey.split(',').map(Number);
    const blockChunk = await reader.chunk(x, z);
    for (const entity of blockChunk?.block_entities ?? blockChunk?.blockEntities ?? []) {
      const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (cell.x >= targetBounds.minX - 1 && cell.x <= targetBounds.maxX + 1 && cell.y >= targetBounds.minY - 1 && cell.y <= targetBounds.maxY + 1 && cell.z >= targetBounds.minZ - 1 && cell.z <= targetBounds.maxZ + 1) blockEntities.push({ cell, id: entity.id ?? entity.Id ?? null });
    }
    const entityChunk = await entityReader.chunk(x, z);
    for (const entity of entityChunk?.Entities ?? entityChunk?.entities ?? []) {
      if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
      const [xPos, yPos, zPos] = entity.Pos.map(Number);
      if (xPos >= targetBounds.minX - 1 && xPos < targetBounds.maxX + 2 && yPos >= targetBounds.minY - 1 && yPos < targetBounds.maxY + 2 && zPos >= targetBounds.minZ - 1 && zPos < targetBounds.maxZ + 2) savedEntities.push({ id: entity.id ?? entity.Id ?? null, position: [xPos, yPos, zPos] });
    }
  }
  fail(blockEntities.length === 0 && savedEntities.length === 0, 'block or saved entity exists in gallery target halo');
  const desiredByKey = new Map();
  for (const cell of shell) desiredByKey.set(key(cell), PD);
  for (const cell of coreAir) desiredByKey.set(key(cell), AIR);
  for (const cell of entryOpening) desiredByKey.set(key(cell), AIR);
  for (const cell of entrySupport) desiredByKey.set(key(cell), PD);
  for (const cell of hatch) desiredByKey.set(key(cell), HATCH);
  for (const cell of ladders) desiredByKey.set(key(cell), LADDER);
  const transitions = (cells) => cells.map((cell) => ({ cell, sourceState: targetsByKey.get(key(cell)), targetState: desiredByKey.get(key(cell)) })).filter(({ sourceState, targetState }) => sourceState !== targetState);
  const shellEntries = transitions(shell);
  const coreEntries = transitions([...coreAir, ...entryOpening]);
  const fixtureEntries = transitions([...entrySupport, ...hatch, ...ladders]);
  fail(shellEntries.length > 0 && coreEntries.length > 0 && fixtureEntries.length > 0, 'one release package has no exact source-to-target work');
  // A projected-state support audit catches a gravity edge only after the
  // liner/core/fixture sequence is applied.  Gravity inside the excavation is
  // intentionally removed, never left depending on air or fluid.
  const projected = (cell) => desiredByKey.get(key(cell)) ?? stateCache.get(key(cell));
  const gravityFailures = [];
  for (const { cell, state } of haloRecords) {
    if (!gravity.has(name(state)) || packageKeys.has(key(cell))) continue;
    const below = await get({ x: cell.x, y: cell.y - 1, z: cell.z });
    const projectedBelow = desiredByKey.get(key({ x: cell.x, y: cell.y - 1, z: cell.z })) ?? below;
    if (isAir(projectedBelow) || isFluid(projectedBelow)) gravityFailures.push({ cell, state, below: projectedBelow });
  }
  fail(gravityFailures.length === 0, `external gravity would be unsupported after liner: ${JSON.stringify(gravityFailures.slice(0, 8))}`);
  // R06's retained wet barrier is wider than a one-cell construction halo.
  // Its exact source states are reviewed and carried forward as a no-touch
  // boundary; the immediate construction halo itself must remain dry.
  const wetReview = box(2094, 2114, 5, 17, -438, -388);
  const retainedFluid = (await Promise.all(wetReview.map(async (cell) => ({ cell, state: await get(cell) }))))
    .filter(({ cell, state }) => !packageKeys.has(key(cell)) && isFluid(state));
  fail(retainedFluid.length > 0, 'gallery does not retain a source-bound R06 water/lava field');
  fs.mkdirSync(abs(OUT_DIR), { recursive: true });
  const packages = [
    { key: 'outer-fluid-liner-and-bulkhead', entries: shellEntries },
    { key: 'sealed-core-excavation-and-entry-aperture', entries: coreEntries },
    { key: 'controlled-hatch-ladder-and-landing', entries: fixtureEntries },
  ];
  const emitted = packages.map(({ key: packageKey, entries }) => {
    const ordered = packageKey === 'outer-fluid-liner-and-bulkhead'
      ? [...entries].sort((a, b) => b.cell.y - a.cell.y || a.cell.z - b.cell.z || a.cell.x - b.cell.x)
      : [...entries].sort((a, b) => a.cell.y - b.cell.y || a.cell.z - b.cell.z || a.cell.x - b.cell.x);
    const forward = operationFile(packageKey, ordered, 'forward', source);
    const rollback = operationFile(packageKey, [...ordered].reverse(), 'rollback', source);
    return { key: packageKey, forward, rollback, entries: ordered };
  });
  const manifestBase = {
    schemaVersion: 1, transactionId: BASENAME, generatedAtUtc: GENERATED_AT,
    status: 'COMPILED_FROM_COMPLETE_SOURCE_AWAITING_FRESH_GUARDED_KERNEL', releaseNodeId: RELEASE_NODE_ID,
    mvpScope: true, scopeIds: ['MP03-A', 'MP05-A', 'SYS-02', 'B07-LOWER-WET-TRANSFER-CONTAINMENT'],
    packages: emitted.map(({ key: packageKey, forward, rollback }) => ({ key: packageKey, forward: forward.filename, rollback: rollback.filename })),
    executionOrder: { forward: emitted.map(({ key: packageKey }) => packageKey), rollback: emitted.map(({ key: packageKey }) => packageKey).reverse() },
    scopedRunner: { wrapper: 'scripts/run_combined_zones_scoped_release.mjs', authorization: AUTHORIZATION, releaseNodeId: RELEASE_NODE_ID, defaultMode: 'PREPARE_ONLY', liveExecutionOptIn: '--execute' },
    source: { snapshotRoot: rel(source), completeSaveCapture: { path: rel(path.join(source, 'combined-zones-complete-save-capture.json')), sha256: sha256(captureBytes), captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc, immutableCopy: true } },
    scope: {
      releaseId: RELEASE_ID, canonicalOwner: 'MP05-B07-CONTAINMENT-IMPLEMENTATION-TEAM',
      governorDelegatedRoles: { b07ConstructionOwner: 'B07 lower-transfer implementation lead', hydrologyContainmentOwner: 'B07 hydrology containment lead', lowerRouteOwner: 'Houston lower-stair counterpart', safetyRecoveryOwner: 'PassageWay safety and recovery lead', releaseOperator: 'Guarded-release implementation operator' },
      purpose: 'Build a lower-side, three-wide dry pressure gallery through the retained B07 wet transfer band. The gallery begins at the R09B helix, uses a closed hatch and ladder, and stops at a solid upper bulkhead for restricted inspection only.',
      excluded: ['R09J cap', 'R07J headhouse', 'upper B07 stair connection', 'surface receiver', 'public access', 'emergency egress', 'B08/B09', 'water discharge', 'fluid outfall', 'transport'],
      outerLinerAndBulkhead: exact(shell), sealedCore: exact(coreAir), entryAperture: exact(entryOpening), landingSupport: exact(entrySupport), hatch: exact(hatch), ladder: exact(ladders), gravityRecoverySupports: exact(gravityRecoverySupports), targetHalo: exact(allHalo), retainedFluidBoundary: { ...exact(retainedFluid.map(({ cell }) => cell)), stateSetSha256: stateSetSha(retainedFluid) }, helixEndpoint,
    },
    target: { operatedUnion: exact(packageCells), sourceStateCensus: stateCensus(targetRecords), desiredStateCensus: stateCensus([...desiredByKey.entries()].map(([id, state]) => ({ cell: id, state }))), packageTargetsDisjoint: true },
    operations: Object.fromEntries(emitted.map(({ key: packageKey, forward, rollback, entries }) => [packageKey, { forwardSha256: forward.bodySha, rollbackSha256: rollback.bodySha, forwardCommandCount: forward.commandCount, rollbackCommandCount: rollback.commandCount, target: exact(entries.map(({ cell }) => cell)), exactInverse: true }])),
    functionalAcceptance: { classification: 'RESTRICTED_LOWER_SIDE_WATER_PRESSURE_INSPECTION_GALLERY_ONLY', routeWidth: 3, clearHeight: 2, normalHorizontalStations: 29, lowerHelixConnection: true, controlledHatch: 1, ladderRungs: 2, upperBulkheadClosed: true, publicAccessCommissioned: false, emergencyEgressCommissioned: false, upperB07ConnectionCommissioned: false, retainedFluidBoundaryCells: retainedFluid.length },
    hardStops: { requiresFreshCompleteImmutableSourceImmediatelyBeforeExecution: true, requiresExactSourcePreflightAndProjectedRollback: true, requiresStrictNoopForwardAndRollbackParserChecks: true, requiresBlockAndLiveEntityClearance: true, requiresJournaledStrictExecution: true, requiresFreshPostSnapshotAndRollbackPoststatePreflight: true, requiresIndependentPressureGalleryQa: true },
    safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, executionAuthorizedByThisManifest: false, noExternalSignaturesRequired: true, nonClaims: ['No exterior B07 opening', 'No public/staff route or emergency egress', 'No upper stair connection', 'No water/lava discharge or unsealed wet excavation'] },
  };
  const manifest = { ...manifestBase, manifestIdentity: sha256(JSON.stringify(manifestBase)) };
  const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
  fs.writeFileSync(abs(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ status: 'COMPILED', manifest: rel(manifestPath), releaseId: RELEASE_ID, operatedCells: packageCells.length, changedCells: emitted.reduce((sum, item) => sum + item.entries.length, 0), retainedFluidBoundaryCells: retainedFluid.length }, null, 2)}\n`);
}
await main();
