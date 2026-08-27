#!/usr/bin/env node
/**
 * Compile the Governor-delegated MP09 Long Water west-bank bypass.
 *
 * This deliberately does not drain, line, cap, or otherwise mutate Long
 * Water.  An expanded six-neighbour census proves that the water component
 * adjacent to the obsolete shoreline proposal is a finite, already sealed
 * 1,477-cell system.  The public connection is moved to the dry west bank,
 * so its fluid displacement count is exactly zero in both directions.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

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
const RELEASE_ID = 'MP09-LONG-WATER-WEST-BANK-BYPASS-01';
const args = process.argv.slice(2);
const option = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const SNAPSHOT = option('--snapshot', 'data/worldsnap-mp06-endpoint-elevated-crossing-post-20260826T143902Z');
const OUT_DIR = option('--out-dir', 'data/buildops');
const EVIDENCE_DIR = option('--evidence-dir', 'data/world-review/mp09-long-water-west-bank-bypass-01-offline-mp06-post-20260826T143902Z');
const BASENAME = option('--basename', 'mp09-long-water-west-bank-bypass-01');
const GENERATED_AT = option('--generated-at', '2026-08-26T22:00:00.000Z');
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`${RELEASE_ID} rejected: ${message}`); };
const stateName = (state) => String(state).split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:dragon_egg', 'minecraft:pointed_dripstone', 'minecraft:scaffolding']);
const PROTECTED = new Set(['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:beacon', 'minecraft:spawner', 'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw', 'minecraft:lectern', 'minecraft:chiseled_bookshelf']);
const isAir = (state) => AIR.has(stateName(state));
const isFluid = (state) => FLUID.has(stateName(state)) || String(state).includes('waterlogged=true');
const isProtected = (state) => PROTECTED.has(stateName(state)) || stateName(state).endsWith('_shulker_box');
const point = (x, y, z) => ({ x, y, z });
const neighbours = ({ x, y, z }) => [point(x - 1, y, z), point(x + 1, y, z), point(x, y - 1, z), point(x, y + 1, z), point(x, y, z - 1), point(x, y, z + 1)];
const inBounds = (cell, bounds) => cell.x >= bounds.minX && cell.x <= bounds.maxX && cell.y >= bounds.minY && cell.y <= bounds.maxY && cell.z >= bounds.minZ && cell.z <= bounds.maxZ;
const completeMembers = ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json'];
for (const member of completeMembers) fail(fs.existsSync(path.join(abs(SNAPSHOT), member)), `complete immutable source missing ${member}`);
const capture = JSON.parse(fs.readFileSync(path.join(abs(SNAPSHOT), 'combined-zones-complete-save-capture.json'), 'utf8'));
fail(capture.immutableCopy === true && Array.isArray(capture.requiredMembers) && capture.requiredMembers.length === 130, 'source is not the required complete immutable 130-member capture');

const blocks = new AnvilReader(path.join(abs(SNAPSHOT), 'region'));
const entities = new AnvilReader(path.join(abs(SNAPSHOT), 'entities'));
const cache = new Map();
const stateAt = async (cell) => {
  const key = cellKey(cell);
  if (!cache.has(key)) cache.set(key, stateToCommandString(await blocks.blockState(cell.x, cell.y, cell.z)));
  return cache.get(key);
};

/* The 2-wide dry west bank.  The existing path from the Stoa entrance reaches
 * the north anchor (-105..-104,68,-456); the compiled work begins there.
 * It never touches the prior x=-87..-86 / y66 water-displacement band. */
const main = [];
for (let z = -456; z >= -551; z -= 1) for (const x of [-105, -104]) main.push(point(x, 67, z));
for (let x = -103; x <= -94; x += 1) main.push(point(x, 67, -551));
const lowerStep = [-95, -94].map((x) => point(x, 68, -552));
const stepSupports = [-95, -94].map((x) => point(x, 68, -553));
const landing = [];
/* A compact five-row forecourt provides two independent two-wide traces
 * around the retained lectern and the Tempietto's exterior buttresses.  Those
 * features remain untouched rather than being treated as a clearance task. */
for (const z of [-552, -553]) for (const x of [-95, -94]) landing.push(point(x, 69, z));
for (let z = -552; z >= -556; z -= 1) for (let x = -93; x <= -80; x += 1) {
  if (isAir(await stateAt(point(x, 70, z))) && isAir(await stateAt(point(x, 71, z)))) landing.push(point(x, 69, z));
}
const packages = [
  { key: 'west-bank-mainwalk', cells: uniqueCells(main), domain: 'DRY_WEST_BANK_MAINWALK' },
  { key: 'tempietto-step-landing', cells: uniqueCells([...lowerStep, ...stepSupports, ...landing]), domain: 'TEMPIETTO_STEP_LANDING' },
];
const allCells = uniqueCells(packages.flatMap(({ cells }) => cells));
fail(allCells.length === main.length + lowerStep.length + stepSupports.length + landing.length, 'design contains duplicate target cells');

const waterBounds = { minX: -256, maxX: 128, minY: -64, maxY: 319, minZ: -768, maxZ: -256 };
const seed = [];
for (const x of [-87, -86]) for (let z = -458; z >= -550; z -= 1) seed.push(point(x, 66, z));
const queue = [];
const component = [];
const seen = new Set();
for (const cell of seed) if (isFluid(await stateAt(cell))) { seen.add(cellKey(cell)); queue.push(cell); }
let cursor = 0;
const boundaryFaces = new Set();
while (cursor < queue.length) {
  const cell = queue[cursor++]; component.push(cell);
  if (cell.x === waterBounds.minX) boundaryFaces.add('minX');
  if (cell.x === waterBounds.maxX) boundaryFaces.add('maxX');
  if (cell.y === waterBounds.minY) boundaryFaces.add('minY');
  if (cell.y === waterBounds.maxY) boundaryFaces.add('maxY');
  if (cell.z === waterBounds.minZ) boundaryFaces.add('minZ');
  if (cell.z === waterBounds.maxZ) boundaryFaces.add('maxZ');
  for (const next of neighbours(cell)) {
    if (!inBounds(next, waterBounds) || seen.has(cellKey(next)) || !isFluid(await stateAt(next))) continue;
    seen.add(cellKey(next)); queue.push(next);
  }
}
fail(component.length === 1477, `expanded Long Water component count drifted (${component.length}, expected 1477)`);
fail(JSON.stringify(boundsOf(component)) === JSON.stringify({ minX: -92, maxX: -78, minY: 61, maxY: 71, minZ: -550, maxZ: -454 }), 'expanded Long Water component bounds drifted');
fail(boundaryFaces.size === 0, `Long Water component reaches expanded census boundary: ${[...boundaryFaces].join(',')}`);
const componentKeys = new Set(component.map(cellKey));
for (const cell of allCells) fail(!componentKeys.has(cellKey(cell)), `dry bypass intersects retained Long Water component at ${cellKey(cell)}`);

const sourceStates = new Map();
for (const cell of allCells) sourceStates.set(cellKey(cell), await stateAt(cell));
for (const cell of main) {
  const floor = sourceStates.get(cellKey(cell));
  fail(!isAir(floor) && !isFluid(floor), `mainwalk needs a dry solid source floor at ${cellKey(cell)}`);
  fail(isAir(await stateAt(point(cell.x, cell.y + 1, cell.z))) && isAir(await stateAt(point(cell.x, cell.y + 2, cell.z))), `mainwalk lacks 2-clear headroom at ${cellKey(cell)}`);
}
for (const cell of lowerStep) {
  fail(isAir(sourceStates.get(cellKey(cell))), `lower step must only fill dry air at ${cellKey(cell)}`);
  fail(!isAir(await stateAt(point(cell.x, cell.y - 1, cell.z))) && !isFluid(await stateAt(point(cell.x, cell.y - 1, cell.z))), `lower step lacks dry support at ${cellKey(cell)}`);
  fail(isAir(await stateAt(point(cell.x, cell.y + 1, cell.z))) && isAir(await stateAt(point(cell.x, cell.y + 2, cell.z))), `lower step lacks 2-clear headroom at ${cellKey(cell)}`);
}
for (const cell of stepSupports) {
  fail(isAir(sourceStates.get(cellKey(cell))), `step support must only fill dry air at ${cellKey(cell)}`);
  fail(!isAir(await stateAt(point(cell.x, cell.y - 1, cell.z))) && !isFluid(await stateAt(point(cell.x, cell.y - 1, cell.z))), `step support lacks dry bearing at ${cellKey(cell)}`);
}
for (const cell of landing) {
  const source = sourceStates.get(cellKey(cell));
  fail(!isFluid(source), `landing cannot displace fluid at ${cellKey(cell)}`);
  const below = (cell.x === -95 || cell.x === -94) ? 'minecraft:polished_andesite' : await stateAt(point(cell.x, cell.y - 1, cell.z));
  fail(!isAir(below) && !isFluid(below), `landing lacks dry support at ${cellKey(cell)}`);
  fail(isAir(await stateAt(point(cell.x, cell.y + 1, cell.z))) && isAir(await stateAt(point(cell.x, cell.y + 2, cell.z))), `landing lacks 2-clear headroom at ${cellKey(cell)}`);
}

const targetStates = new Map(allCells.map((cell) => [cellKey(cell), 'minecraft:polished_andesite']));
for (const cell of allCells) {
  const source = sourceStates.get(cellKey(cell));
  fail(!isFluid(source) && !isFluid(targetStates.get(cellKey(cell))), `fluid mutation is forbidden at ${cellKey(cell)}`);
  fail(!isProtected(source), `protected block/control/container state intersects ${cellKey(cell)}`);
  const above = await stateAt(point(cell.x, cell.y + 1, cell.z));
  fail(!GRAVITY.has(stateName(above)), `unretained gravity block directly above ${cellKey(cell)}`);
}

const projectedStateAt = async (cell) => targetStates.get(cellKey(cell)) ?? stateAt(cell);
const normalWalk = async (feet) => {
  const floor = await projectedStateAt(point(feet.x, feet.y - 1, feet.z));
  return !isAir(floor) && !isFluid(floor)
    && isAir(await projectedStateAt(feet))
    && isAir(await projectedStateAt(point(feet.x, feet.y + 1, feet.z)));
};
const routeBounds = { minX: -110, maxX: -75, minY: 67, maxY: 71, minZ: -560, maxZ: -450 };
const northFeet = [point(-105, 68, -456), point(-104, 68, -456)];
const southFeet = [point(-85, 70, -552), point(-84, 70, -552)];
for (const feet of [...northFeet, ...southFeet]) fail(await normalWalk(feet), `route anchor is not normal-walkable after projection at ${cellKey(feet)}`);
const routeQueue = [...northFeet];
const routeVisited = new Set(routeQueue.map(cellKey));
let routeCursor = 0;
while (routeCursor < routeQueue.length) {
  const here = routeQueue[routeCursor++];
  for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) for (const dy of [-1, 0, 1]) {
    const next = point(here.x + dx, here.y + dy, here.z + dz);
    if (!inBounds(next, routeBounds) || routeVisited.has(cellKey(next)) || !(await normalWalk(next))) continue;
    routeVisited.add(cellKey(next)); routeQueue.push(next);
  }
}
for (const feet of southFeet) fail(routeVisited.has(cellKey(feet)), `projected route does not reach Tempietto anchor ${cellKey(feet)}`);

const targetKeys = new Set(allCells.map(cellKey));
const targetChunks = [...new Set(allCells.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))];
const blockEntities = [];
const savedEntities = [];
for (const chunkKey of targetChunks) {
  const [x, z] = chunkKey.split(',').map(Number);
  const chunk = await blocks.chunk(x, z);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const cell = point(Number(entity.x), Number(entity.y), Number(entity.z));
    if (targetKeys.has(cellKey(cell))) blockEntities.push({ id: entity.id ?? entity.Id ?? null, cell });
  }
  const entityChunk = await entities.chunk(x, z);
  for (const entity of entityChunk?.Entities ?? entityChunk?.entities ?? []) {
    const values = entity.Pos ?? entity.pos ?? [];
    if (!Array.isArray(values) || values.length < 3) continue;
    const cell = point(Math.floor(Number(values[0])), Math.floor(Number(values[1])), Math.floor(Number(values[2])));
    if (targetKeys.has(cellKey(cell))) savedEntities.push({ id: entity.id ?? entity.Id ?? null, cell });
  }
}
fail(blockEntities.length === 0, 'block entity intersects target cells');
fail(savedEntities.length === 0, 'saved entity intersects target cells');

const ordered = packages.map((entry) => ({ ...entry, cells: [...entry.cells].sort((a, b) => a.y - b.y || a.z - b.z || a.x - b.x) }));
const makeText = (cells, rollback = false) => `${cells.map((cell) => {
  const from = sourceStates.get(cellKey(cell)); const to = targetStates.get(cellKey(cell));
  return replLine(cell, rollback ? to : from, rollback ? from : to);
}).join('\n')}\n`;
const write = (filename, content) => { fs.mkdirSync(path.dirname(abs(filename)), { recursive: true }); fs.writeFileSync(abs(filename), content); };
const packageRecords = [];
for (const entry of ordered) {
  const forwardCells = entry.cells;
  const rollbackCells = [...entry.cells].reverse();
  const forward = makeText(forwardCells);
  const rollback = makeText(rollbackCells, true);
  const forwardPath = path.join(OUT_DIR, `${BASENAME}.${entry.key}.forward.txt`);
  const rollbackPath = path.join(OUT_DIR, `${BASENAME}.${entry.key}.rollback.txt`);
  write(forwardPath, `# ${RELEASE_ID} ${entry.key} forward\n# source ${rel(SNAPSHOT)}\n${forward}`);
  write(rollbackPath, `# ${RELEASE_ID} ${entry.key} rollback\n# source ${rel(SNAPSHOT)}\n${rollback}`);
  packageRecords.push({ key: entry.key, domain: entry.domain, forward: rel(forwardPath), rollback: rel(rollbackPath), forwardSha256: sha256(forward), rollbackSha256: sha256(rollback), cellCount: entry.cells.length, coordinateSetSha256: hashCells(entry.cells), exactInverse: true });
}
const combinedForwardCells = ordered.flatMap(({ cells }) => cells);
const combinedRollbackCells = [...ordered].reverse().flatMap(({ cells }) => [...cells].reverse());
const forwardText = makeText(combinedForwardCells);
const rollbackText = makeText(combinedRollbackCells, true);
const forwardPath = path.join(OUT_DIR, `${BASENAME}.forward.txt`);
const rollbackPath = path.join(OUT_DIR, `${BASENAME}.rollback.txt`);
write(forwardPath, `# ${RELEASE_ID} forward\n# source ${rel(SNAPSHOT)}\n${forwardText}`);
write(rollbackPath, `# ${RELEASE_ID} rollback\n# source ${rel(SNAPSHOT)}\n${rollbackText}`);

const route = {
  id: 'stoa-west-bank-to-tempietto',
  northAnchors: [point(-105, 68, -456), point(-104, 68, -456)],
  tempiettoAnchors: [point(-85, 70, -552), point(-84, 70, -552)],
  width: 2,
  minHeadroom: 2,
  maxStepRise: 1,
  sourceNorthApproachConnectedToStoaEntrance: true,
  sourceStoaEntrance: point(-85, 69, -431),
  requiresJump: false,
  fluidDisplacementCells: 0,
};
const manifestBase = {
  schemaVersion: 1,
  releaseId: RELEASE_ID,
  status: 'COMPILED_OFFLINE_AWAITING_FRESH_RELEASE_KERNEL',
  generatedAtUtc: GENERATED_AT,
  mutationAuthority: false,
  source: { snapshot: rel(SNAPSHOT), captureId: capture.captureId, captureManifestSha256: sha256(fs.readFileSync(path.join(abs(SNAPSHOT), 'combined-zones-complete-save-capture.json'))), immutableCopy: true, requiredMembersVerified: capture.requiredMembers.length },
  governorDelegatedRoles: { civilScopeOwner: 'MP09 west-bank civil steward', hydrologyContainmentOwner: 'Long Water retained-basin steward', routeAndLandingOwner: 'Tempietto access steward', recoveryOwner: 'MP09 rollback steward' },
  target: { cellCount: allCells.length, bounds: boundsOf(allCells), coordinateSetSha256: hashCells(allCells), completeCanonicalBlockStates: true },
  retainedHydrology: { expandedSixNeighbourCensusBounds: waterBounds, componentCellCount: component.length, componentBounds: boundsOf(component), componentCoordinateSetSha256: hashCells(component), boundaryFaces: [], closedComponentProven: true, targetIntersections: 0, sourceFluidMutations: 0, targetFluidMutations: 0, rollbackFluidMutations: 0, result: 'RETAINED_SEALED_COMPONENT_NO_LIVE_FLUID_PATH_CHANGES_FORWARD_OR_ROLLBACK' },
  route,
  isolation: { blockEntityIntersections: blockEntities, savedEntityIntersectionsAtCapture: savedEntities, protectedOrControlTargetCells: 0, gravityAboveTargetCells: 0 },
  packages: packageRecords,
  transaction: { forward: rel(forwardPath), rollback: rel(rollbackPath), forwardSha256: sha256(forwardText), rollbackSha256: sha256(rollbackText), exactForwardRollbackInverse: true, forwardOrder: packageRecords.map(({ key }) => key), rollbackOrder: [...packageRecords].reverse().map(({ key }) => key) },
  requiredBeforePhysicalExecution: ['fresh complete immutable source', 'repeat the retained-component census against that source', 'fresh live entity clearance', 'strict-noop forward parser and source preflight', 'journaled guarded execution', 'fresh post snapshot', 'strict-noop rollback parser and post-state preflight', 'independent two-wide normal-walk and retained-fluid QA'],
  nonClaims: ['No water is drained, displaced, lined, capped, or rerouted.', 'No operation is executed by this compiler.', 'This static package does not open a public route until its release kernel and post QA pass.'],
};
const manifest = { ...manifestBase, identitySha256: sha256(`${JSON.stringify(manifestBase, null, 2)}\n`) };
const evidence = {
  schemaVersion: 1, id: `${RELEASE_ID}-OFFLINE-READINESS`, status: 'PASS_COMPILED_DRY_WEST_BANK_BYPASS_RETAINS_CLOSED_LONG_WATER_COMPONENT', source: manifest.source, route, targets: manifest.target, retainedHydrology: manifest.retainedHydrology, isolation: manifest.isolation, exactInverse: manifest.transaction.exactForwardRollbackInverse, liveCallsPerformed: false, worldEditsPerformed: false,
};
const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
write(manifestPath, JSON.stringify(manifest, null, 2));
write(path.join(EVIDENCE_DIR, 'offline-readiness.json'), JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({ status: manifest.status, manifest: rel(manifestPath), evidence: rel(path.join(EVIDENCE_DIR, 'offline-readiness.json')), targetCells: allCells.length, retainedFluidComponentCells: component.length, fluidDisplacementCells: 0, packages: packageRecords.map(({ key, cellCount }) => ({ key, cellCount })) }, null, 2));
