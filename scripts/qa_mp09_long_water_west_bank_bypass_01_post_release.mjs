#!/usr/bin/env node
/**
 * Independent, read-only post-release QA for MP09's dry west-bank bypass.
 *
 * This script opens only the immutable source/post captures.  It neither
 * talks to RCON nor changes Minecraft state.  Its purpose is to independently
 * confirm the executed cells, the retained Long Water component, and the
 * walkable two-wide connection claimed by the rebound compiler manifest.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  hashCells,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const RELEASE_ID = 'MP09-LONG-WATER-WEST-BANK-BYPASS-01';
const argv = process.argv.slice(2);
const option = (flag, fallback = null) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const required = (flag) => {
  const result = option(flag);
  if (!result) throw new Error(`${flag} is required`);
  return result;
};
const LEDGER_PATH = required('--ledger');
const OUT_PATH = required('--out');
const MANIFEST_PATH = option('--manifest');
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => {
  if (!condition) throw new Error(`${RELEASE_ID} post-QA rejected: ${message}`);
};
const point = (x, y, z) => ({ x, y, z });
const base = (state) => String(state).split('[', 1)[0];
const isAir = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(base(state));
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(base(state)) || String(state).includes('waterlogged=true');
const isProtected = (state) => new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper',
  'minecraft:dispenser', 'minecraft:dropper', 'minecraft:beacon', 'minecraft:spawner',
  'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block',
  'minecraft:structure_block', 'minecraft:jigsaw', 'minecraft:lectern', 'minecraft:chiseled_bookshelf',
]).has(base(state)) || base(state).endsWith('_shulker_box');
const exact = (cells) => {
  const set = uniqueCells(cells);
  return { cellCount: set.length, bounds: set.length ? boundsOf(set) : null, coordinateSetSha256: hashCells(set) };
};
const within = (cell, bounds) => cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY && cell.z >= bounds.minZ && cell.z <= bounds.maxZ;
const neighbours = ({ x, y, z }) => [
  point(x - 1, y, z), point(x + 1, y, z), point(x, y - 1, z),
  point(x, y + 1, z), point(x, y, z - 1), point(x, y, z + 1),
];
const stateCensus = (records) => Object.fromEntries([...records.reduce((all, { state }) => {
  all.set(state, (all.get(state) ?? 0) + 1);
  return all;
}, new Map()).entries()].sort(([left], [right]) => left.localeCompare(right)));
const argAfter = (command, flag) => {
  const index = command.indexOf(flag);
  return index >= 0 ? command[index + 1] : null;
};
const stage = (ledger, name) => ledger.stages?.find((entry) => entry.stage === name);
const completeCapture = (snapshot, label) => {
  const capturePath = path.join(abs(snapshot), 'combined-zones-complete-save-capture.json');
  fail(fs.existsSync(path.join(abs(snapshot), 'region')) && fs.existsSync(path.join(abs(snapshot), 'entities')),
    `${label} snapshot lacks region or entities`);
  fail(fs.existsSync(capturePath), `${label} snapshot lacks complete-save capture`);
  const capture = JSON.parse(fs.readFileSync(capturePath, 'utf8'));
  fail(capture.immutableCopy === true && capture.requiredMembers?.length === 130,
    `${label} snapshot is not the required immutable complete capture`);
  return { path: snapshot, captureId: capture.captureId, captureManifestSha256: sha256(fs.readFileSync(capturePath)) };
};
const parseOperation = (filename) => {
  const body = fs.readFileSync(abs(filename), 'utf8');
  const operations = body.split(/\r?\n/).filter((line) => line.startsWith('REPL ')).map((line) => {
    const fields = line.trim().split(/\s+/);
    fail(fields.length === 9, `malformed guarded operation: ${line}`);
    const [x1, y1, z1, x2, y2, z2] = fields.slice(1, 7).map(Number);
    fail(x1 === x2 && y1 === y2 && z1 === z2, `operation is not a one-cell guarded replacement: ${line}`);
    return { cell: point(x1, y1, z1), source: fields[7], target: fields[8] };
  });
  fail(operations.length > 0, `no guarded operations found in ${filename}`);
  return { body, operations };
};
const componentCensus = async (reader, seedCells, bounds) => {
  const queue = [];
  const seen = new Set();
  for (const cell of seedCells) {
    const state = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
    if (isFluid(state)) { queue.push(cell); seen.add(cellKey(cell)); }
  }
  const cells = [];
  const boundaryFaces = new Set();
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const cell = queue[cursor];
    cells.push(cell);
    if (cell.x === bounds.minX) boundaryFaces.add('minX');
    if (cell.x === bounds.maxX) boundaryFaces.add('maxX');
    if (cell.y === bounds.minY) boundaryFaces.add('minY');
    if (cell.y === bounds.maxY) boundaryFaces.add('maxY');
    if (cell.z === bounds.minZ) boundaryFaces.add('minZ');
    if (cell.z === bounds.maxZ) boundaryFaces.add('maxZ');
    for (const next of neighbours(cell)) {
      if (!within(next, bounds) || seen.has(cellKey(next))) continue;
      const state = stateToCommandString(await reader.blockState(next.x, next.y, next.z));
      if (!isFluid(state)) continue;
      seen.add(cellKey(next)); queue.push(next);
    }
  }
  return { cells: uniqueCells(cells), boundaryFaces: [...boundaryFaces].sort() };
};

const ledger = JSON.parse(fs.readFileSync(abs(LEDGER_PATH), 'utf8'));
fail(ledger.releaseId === RELEASE_ID && ledger.status === 'EXECUTED_PENDING_INDEPENDENT_RETAINED_FLUID_AND_ROUTE_QA',
  'kernel ledger is not this executed release awaiting independent QA');
for (const name of [
  'fresh-source-complete-save', 'fresh-source-compiler-rebind', 'forward-source-preflight',
  'projected-rollback-preflight', 'block-entity-clearance', 'strict-forward-parser',
  'strict-rollback-parser', 'same-moment-live-entity-clearance', 'strict-forward-execution',
  'fresh-post-complete-save', 'rollback-poststate-preflight',
]) fail(stage(ledger, name)?.status === 'PASS', `required kernel stage is not PASS: ${name}`);

const sourceSnapshot = argAfter(stage(ledger, 'fresh-source-complete-save').command, '--dest');
const postSnapshot = argAfter(stage(ledger, 'fresh-post-complete-save').command, '--dest');
const reboundBuildops = argAfter(stage(ledger, 'fresh-source-compiler-rebind').command, '--out-dir');
const reboundManifest = MANIFEST_PATH ?? (reboundBuildops
  ? path.join(reboundBuildops, 'mp09-long-water-west-bank-bypass-01.release-manifest.json')
  : null);
fail(sourceSnapshot && postSnapshot && reboundManifest, 'kernel ledger lacks source, post, or rebound manifest binding');
const sourceCapture = completeCapture(sourceSnapshot, 'source');
const postCapture = completeCapture(postSnapshot, 'post');
const manifest = JSON.parse(fs.readFileSync(abs(reboundManifest), 'utf8'));
fail(manifest.releaseId === RELEASE_ID && manifest.source?.snapshot === sourceSnapshot,
  'rebound manifest identity or source snapshot drifted');
fail(manifest.transaction?.exactForwardRollbackInverse === true && manifest.target?.completeCanonicalBlockStates === true,
  'manifest does not prove canonical exact inverse');
const forwardPath = manifest.transaction.forward;
const rollbackPath = manifest.transaction.rollback;
const forward = parseOperation(forwardPath);
const rollback = parseOperation(rollbackPath);
const canonicalForward = `${forward.operations.map(({ cell, source, target }) => `REPL ${cell.x} ${cell.y} ${cell.z} ${cell.x} ${cell.y} ${cell.z} ${source} ${target}`).join('\n')}\n`;
const canonicalRollback = `${rollback.operations.map(({ cell, source, target }) => `REPL ${cell.x} ${cell.y} ${cell.z} ${cell.x} ${cell.y} ${cell.z} ${source} ${target}`).join('\n')}\n`;
fail(sha256(canonicalForward) === manifest.transaction.forwardSha256 && sha256(canonicalRollback) === manifest.transaction.rollbackSha256,
  'rebound guarded-operation bodies do not match manifest hashes');
const expectedRollback = forward.operations.slice().reverse().map(({ cell, source, target }) => ({ cell, source: target, target: source }));
fail(JSON.stringify(rollback.operations) === JSON.stringify(expectedRollback), 'rollback is not the exact reverse inverse of forward');
const targets = forward.operations.map(({ cell }) => cell);
fail(exact(targets).cellCount === manifest.target.cellCount && exact(targets).coordinateSetSha256 === manifest.target.coordinateSetSha256,
  'forward target set drifted from rebound manifest');
fail(targets.every((cell, index) => forward.operations[index].target === 'minecraft:polished_andesite'),
  'forward has a non-polished-andesite target state');

const sourceReader = new AnvilReader(path.join(abs(sourceSnapshot), 'region'));
const postReader = new AnvilReader(path.join(abs(postSnapshot), 'region'));
const postStates = await Promise.all(targets.map(async (cell) => ({ cell, state: stateToCommandString(await postReader.blockState(cell.x, cell.y, cell.z)) })));
fail(postStates.every(({ state }) => state === 'minecraft:polished_andesite'), 'not all 274 intended route cells are exact polished andesite');

const seed = [];
for (const x of [-87, -86]) for (let z = -458; z >= -550; z -= 1) seed.push(point(x, 66, z));
const waterBounds = manifest.retainedHydrology.expandedSixNeighbourCensusBounds;
const [sourceWater, postWater] = await Promise.all([
  componentCensus(sourceReader, seed, waterBounds), componentCensus(postReader, seed, waterBounds),
]);
const waterExpected = manifest.retainedHydrology;
for (const [label, census] of [['source', sourceWater], ['post', postWater]]) {
  fail(census.cells.length === waterExpected.componentCellCount, `${label} Long Water component count drifted`);
  fail(JSON.stringify(boundsOf(census.cells)) === JSON.stringify(waterExpected.componentBounds), `${label} Long Water component bounds drifted`);
  fail(hashCells(census.cells) === waterExpected.componentCoordinateSetSha256, `${label} Long Water component cell identity drifted`);
  fail(census.boundaryFaces.length === 0, `${label} Long Water reaches census boundary: ${census.boundaryFaces.join(',')}`);
}
fail(JSON.stringify(sourceWater.cells) === JSON.stringify(postWater.cells), 'retained Long Water component changed across release');

const mainFloors = [];
for (let z = -456; z >= -551; z -= 1) for (const x of [-105, -104]) mainFloors.push(point(x, 67, z));
for (let x = -103; x <= -94; x += 1) mainFloors.push(point(x, 67, -551));
/* The y=68 "lowerStep" cells are structural risers below the y=69 landing,
 * not walking floors once the final stacked landing is in place. */
/* The compiler admits the broad landing only where its source headroom was
 * clear.  Re-derive that exact conditional footprint from the rebound
 * operation set instead of treating the enclosing rectangle as built. */
const landingFloors = targets.filter(({ y }) => y === 69);
const routeFootprint = [...mainFloors, ...landingFloors];
const normalWalk = async (floor) => {
  const feet = point(floor.x, floor.y + 1, floor.z);
  const [floorState, feetState, headState] = await Promise.all([
    postReader.blockState(floor.x, floor.y, floor.z), postReader.blockState(feet.x, feet.y, feet.z), postReader.blockState(feet.x, feet.y + 1, feet.z),
  ]);
  return !isAir(stateToCommandString(floorState)) && !isFluid(stateToCommandString(floorState))
    && isAir(stateToCommandString(feetState)) && isAir(stateToCommandString(headState));
};
fail((await Promise.all(routeFootprint.map(normalWalk))).every(Boolean), 'a compiled two-wide route floor lacks dry support or two clear headroom cells');
const routeBounds = { minX: -110, maxX: -75, minY: 67, maxY: 71, minZ: -560, maxZ: -450 };
const walkable = async (feet) => {
  const below = point(feet.x, feet.y - 1, feet.z);
  const [floor, body, head] = await Promise.all([postReader.blockState(below.x, below.y, below.z), postReader.blockState(feet.x, feet.y, feet.z), postReader.blockState(feet.x, feet.y + 1, feet.z)]);
  return !isAir(stateToCommandString(floor)) && !isFluid(stateToCommandString(floor))
    && isAir(stateToCommandString(body)) && isAir(stateToCommandString(head));
};
const northAnchors = manifest.route.northAnchors;
const southAnchors = manifest.route.tempiettoAnchors;
for (const feet of [...northAnchors, ...southAnchors]) fail(await walkable(feet), `route anchor is not normal-walkable: ${cellKey(feet)}`);
const visited = new Set(northAnchors.map(cellKey));
const queue = [...northAnchors];
for (let cursor = 0; cursor < queue.length; cursor += 1) {
  const here = queue[cursor];
  for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) for (const dy of [-1, 0, 1]) {
    const next = point(here.x + dx, here.y + dy, here.z + dz);
    if (!within(next, routeBounds) || visited.has(cellKey(next)) || !(await walkable(next))) continue;
    visited.add(cellKey(next)); queue.push(next);
  }
}
for (const feet of southAnchors) fail(visited.has(cellKey(feet)), `north anchor cannot reach Tempietto anchor: ${cellKey(feet)}`);

const clearance = routeFootprint.flatMap((floor) => [point(floor.x, floor.y + 1, floor.z), point(floor.x, floor.y + 2, floor.z)]);
const interactionSet = uniqueCells([...targets, ...clearance]);
const interactionStates = await Promise.all(interactionSet.map(async (cell) => ({ cell, state: stateToCommandString(await postReader.blockState(cell.x, cell.y, cell.z)) })));
fail(interactionStates.every(({ state }) => !isFluid(state)), 'new fluid or waterlogged state is present in route interaction set');
fail(interactionStates.every(({ state }) => !isProtected(state)), 'protected/container/control block is present in route interaction set');
const interactionKeys = new Set(interactionSet.map(cellKey));
const blockEntities = [];
const savedEntities = [];
const chunks = [...new Set(interactionSet.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))];
for (const chunkKey of chunks) {
  const [x, z] = chunkKey.split(',').map(Number);
  const blockChunk = await postReader.chunk(x, z);
  for (const entity of blockChunk?.block_entities ?? blockChunk?.blockEntities ?? []) {
    const cell = point(Number(entity.x), Number(entity.y), Number(entity.z));
    if (interactionKeys.has(cellKey(cell))) blockEntities.push({ id: entity.id ?? entity.Id ?? null, cell });
  }
  const entityReader = new AnvilReader(path.join(abs(postSnapshot), 'entities'));
  const entityChunk = await entityReader.chunk(x, z);
  for (const entity of entityChunk?.Entities ?? entityChunk?.entities ?? []) {
    const position = entity.Pos ?? entity.pos ?? [];
    if (!Array.isArray(position) || position.length < 3) continue;
    const cell = point(Math.floor(Number(position[0])), Math.floor(Number(position[1])), Math.floor(Number(position[2])));
    if (interactionKeys.has(cellKey(cell))) savedEntities.push({ id: entity.id ?? entity.Id ?? null, cell });
  }
}
fail(blockEntities.length === 0 && savedEntities.length === 0, 'block entity or saved entity intersects post-release interaction set');

const qa = {
  schemaVersion: 1,
  id: 'mp09-long-water-west-bank-bypass-01-post-release-qa',
  status: 'PASS_EXECUTED_DRY_WEST_BANK_BYPASS_RETAINS_SEALED_LONG_WATER_COMPONENT',
  release: {
    releaseId: RELEASE_ID,
    kernelLedger: { path: rel(LEDGER_PATH), sha256: sha256(fs.readFileSync(abs(LEDGER_PATH))) },
    reboundManifest: { path: rel(reboundManifest), sha256: sha256(fs.readFileSync(abs(reboundManifest))), identitySha256: manifest.identitySha256 },
    forward: { path: rel(forwardPath), sha256: manifest.transaction.forwardSha256 },
    rollback: { path: rel(rollbackPath), sha256: manifest.transaction.rollbackSha256 },
  },
  snapshots: { source: sourceCapture, post: postCapture },
  exactExecutedRouteCells: { expected: manifest.target, observed: exact(targets), postState: stateCensus(postStates) },
  retainedLongWater: {
    expected: waterExpected,
    source: { ...exact(sourceWater.cells), boundaryFaces: sourceWater.boundaryFaces },
    post: { ...exact(postWater.cells), boundaryFaces: postWater.boundaryFaces },
    unchangedAcrossRelease: true,
  },
  route: {
    id: manifest.route.id,
    width: manifest.route.width,
    minHeadroom: manifest.route.minHeadroom,
    maxStepRise: manifest.route.maxStepRise,
    routeFootprint: exact(routeFootprint),
    normalWalkConnectedAnchors: { north: northAnchors, tempietto: southAnchors, reachableWalkCells: visited.size },
  },
  interaction: {
    set: exact(interactionSet),
    postState: stateCensus(interactionStates),
    fluidOrWaterloggedCells: 0,
    protectedOrControlCells: 0,
    blockEntityIntersections: blockEntities,
    savedEntityIntersections: savedEntities,
  },
  nonClaims: ['No water was drained, displaced, lined, capped, or rerouted.', 'This QA does not commission a public route or any unrelated Ravensgate scope.'],
};
qa.qaPayloadSha256 = sha256(JSON.stringify(qa));
fs.mkdirSync(path.dirname(abs(OUT_PATH)), { recursive: true });
fs.writeFileSync(abs(OUT_PATH), `${JSON.stringify(qa, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: qa.status, out: rel(OUT_PATH), qaPayloadSha256: qa.qaPayloadSha256 }, null, 2)}\n`);
