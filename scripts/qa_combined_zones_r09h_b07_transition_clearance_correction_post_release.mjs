#!/usr/bin/env node
/** Independent read-only R09H post-release QA and seal. */

import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  D06_CELL_PREAMBLE,
  boundsOf,
  cellKey,
  cellsIn,
  deriveB07WestTwo,
  hashCells,
  sha256,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const EVIDENCE = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r09h-live-20260822T022248Z',
);
const LEDGER = value('--ledger', path.join(EVIDENCE, 'evidence-ledger.json'));
const MANIFEST = value(
  '--manifest',
  'data/buildops/combined-zones-r09h-b07-transition-clearance-correction.release-manifest.json',
);
const OUT = value('--out', path.join(EVIDENCE, 'r09h-post-release-qa.json'));
const MARKDOWN = value('--markdown', path.join(EVIDENCE, 'r09h-post-release-qa.md'));
const GENERATED_AT = value('--generated-at', '2026-08-22T02:27:00Z');
const INPUTS = Object.freeze({
  mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  r07jManifest: 'data/buildops/combined-zones-r07j-b07-supported-surface-headhouse.release-manifest.json',
  r09eManifest: 'data/buildops/combined-zones-r09e-b07-dry-upper-stair.release-manifest.json',
  r09fManifest: 'data/buildops/combined-zones-r09f-b07-enclosed-upper-interface.release-manifest.json',
  r09gManifest: 'data/buildops/combined-zones-r09g-b07-upper-route-passive-wayfinding.release-manifest.json',
});
const EXPECTED = Object.freeze({
  ledgerSha256: '224c6075450e1e1b3ed259c723ae3c4152687e4ff5d3a71f7493ea25c1856ae8',
  manifestFileSha256: 'ab6e2895972ca91edfe65dd0b37a0c9fe8629856b37b248bf0b9538b95d062b0',
  manifestIdentity: 'bd6956937446fa89b119df85e6daca21415ff2892f72195966d8d0d0259904e4',
  completedReleaseIdentity: 'dd404c710c3f05caa1908afd5f8c38ca95360c8e03a9612f97199329d152dfd5',
  sourceBoundReleaseIdentity: 'e56c70773abd6203c0e515e51f785e06931f3d8ae27feb4b63a2a9cb55d762ba',
  sourceComplete: 'a84b68b846a9bbac480a07a48bdc8de9374b601ce189cd3413d8c53912b88f01',
  sourceRegion: '002ce8ebad1cb5425ecde86271eb26b041f73abaa52ccd7588eeea0f07f2de75',
  postComplete: 'ed08a563a3cbe2d450db735b21e0d8b644938f8044e2773fd71a61b20eaff684',
  postRegion: 'e3690299faa02ae153600028e1b276e1b6bdd844aff0a6037798be3b13484b8b',
  forwardFileSha256: 'd687ee8dfc1df0267951fc413c282d1a64db77a06c3ccb545aaaad6960368626',
  rollbackFileSha256: 'dd11f72e93550f2fc41aa90abf757b63191feaeb789c1f92c1ee44d9c2d780a0',
  targetHash: '9562e3cdffe2ee63305486391b4b5758feb3bc7652e32b1e1f86f2d7a7c74e10',
  lifecycleHash: '70b734308bd7374874a3a3c5e731c8523a1a98f2c3be549e18993d872f0f0ea3',
  haloHash: '843679588329dfac67017d5e95cb3b1f401ad1605f041a5ebd72bcca497eb7a5',
  b07ConstructionHash: 'd58f20c6ad6581487e2a6ba72754d40ce22d49981da7450b44ad5e37325e5e59',
  b07InteractionHash: 'dd2cc387b0e5f6517ec48176c820e05f5fef5ff9793c74d32d4a5262582e5a8d',
});
const AIR_NAMES = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FULL_SOLID_NAMES = new Set([
  'minecraft:stone', 'minecraft:dirt', 'minecraft:grass_block', 'minecraft:granite',
  'minecraft:diorite', 'minecraft:andesite', 'minecraft:deepslate', 'minecraft:tuff',
  'minecraft:copper_ore', 'minecraft:iron_ore', 'minecraft:coal_ore',
  'minecraft:polished_andesite', 'minecraft:polished_diorite', 'minecraft:sea_lantern',
]);
const GRAVITY_NAMES = new Set(['minecraft:sand', 'minecraft:gravel', 'minecraft:red_sand']);
const ACTIVE_MECHANISMS = new Set([
  'minecraft:rail', 'minecraft:powered_rail', 'minecraft:detector_rail',
  'minecraft:activator_rail', 'minecraft:redstone_wire', 'minecraft:redstone_torch',
  'minecraft:redstone_wall_torch', 'minecraft:repeater', 'minecraft:comparator',
  'minecraft:piston', 'minecraft:sticky_piston', 'minecraft:observer',
  'minecraft:dispenser', 'minecraft:dropper', 'minecraft:hopper',
]);

const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R09H post-release QA rejected: ${message}`);
};
const stateName = (state) => state.split('[', 1)[0];
const fileBinding = (filename) => ({
  path: rel(filename), sha256: sha256(fs.readFileSync(abs(filename))), bytes: fs.statSync(abs(filename)).size,
});
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return { cellCount: exact.length, bounds: exact.length ? boundsOf(exact) : null, coordinateSetSha256: hashCells(exact) };
};
const cubeHalo = (cells) => uniqueCells(cells.flatMap(({ x, y, z }) => {
  const output = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) output.push({ x: x + dx, y: y + dy, z: z + dz });
    }
  }
  return output;
}));

function parseOperations(filename) {
  const records = [];
  for (const raw of fs.readFileSync(abs(filename), 'utf8').split(/\r?\n/)) {
    if (!raw.startsWith('REPL ')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields.length === 9, `${filename} contains malformed REPL`);
    const coordinates = fields.slice(1, 7).map(Number);
    for (let x = Math.min(coordinates[0], coordinates[3]); x <= Math.max(coordinates[0], coordinates[3]); x += 1) {
      for (let y = Math.min(coordinates[1], coordinates[4]); y <= Math.max(coordinates[1], coordinates[4]); y += 1) {
        for (let z = Math.min(coordinates[2], coordinates[5]); z <= Math.max(coordinates[2], coordinates[5]); z += 1) {
          records.push({ cell: { x, y, z }, sourceState: fields[7], targetState: fields[8] });
        }
      }
    }
  }
  return records;
}

function buildStairs(topAnchor) {
  const outerRing = [];
  for (let x = 2105; x <= 2111; x += 1) outerRing.push({ x, z: -401, ox: x, oz: -402 });
  for (let z = -400; z <= -395; z += 1) outerRing.push({ x: 2111, z, ox: 2112, oz: z });
  for (let x = 2110; x >= 2105; x -= 1) outerRing.push({ x, z: -395, ox: x, oz: -394 });
  for (let z = -396; z >= -400; z -= 1) outerRing.push({ x: 2105, z, ox: 2104, oz: z });
  const stairs = [];
  for (let index = 0; index < 84; index += 1) {
    const point = outerRing[index % 24];
    const y = 19 + Math.floor(index / 2);
    const surfaceY2 = (2 * y) + (index % 2 === 0 ? 1 : 2);
    stairs.push({
      index, cell: { x: point.x, y, z: point.z }, outer: { x: point.ox, y, z: point.oz }, surfaceY2,
      targetState: surfaceY2 % 2 === 1
        ? 'minecraft:smooth_stone_slab[type=bottom,waterlogged=false]'
        : 'minecraft:smooth_stone_slab[type=top,waterlogged=false]',
    });
  }
  for (let offset = 0; offset < 4; offset += 1) {
    const index = 84 + offset;
    const point = outerRing[index % 24];
    stairs.push({
      index, cell: { x: point.x, y: 60, z: point.z }, outer: { x: point.ox, y: 60, z: point.oz },
      surfaceY2: 122, targetState: 'minecraft:smooth_stone_slab[type=top,waterlogged=false]',
    });
  }
  const innerRing = [];
  for (let x = 2106; x <= 2110; x += 1) innerRing.push({ x, z: -396, ox: x, oz: -395 });
  for (let z = -397; z >= -400; z -= 1) innerRing.push({ x: 2110, z, ox: 2111, oz: z });
  for (let x = 2109; x >= 2106; x -= 1) innerRing.push({ x, z: -400, ox: x, oz: -401 });
  for (let z = -399; z <= -397; z += 1) innerRing.push({ x: 2106, z, ox: 2105, oz: z });
  for (let step = 1; step <= 20; step += 1) {
    const index = 87 + step;
    const point = innerRing[(step + 1) % 16];
    const surfaceY2 = 122 + step;
    const y = Math.floor((surfaceY2 - 1) / 2);
    stairs.push({
      index, cell: { x: point.x, y, z: point.z }, outer: { x: point.ox, y, z: point.oz }, surfaceY2,
      targetState: surfaceY2 % 2 === 1
        ? 'minecraft:smooth_stone_slab[type=bottom,waterlogged=false]'
        : 'minecraft:smooth_stone_slab[type=top,waterlogged=false]',
    });
  }
  const approach = [{ x: 2109, y: 71, z: -397 }, { x: 2108, y: 71, z: -397 }, topAnchor];
  for (let offset = 0; offset < 3; offset += 1) {
    const index = 108 + offset;
    const surfaceY2 = 143 + offset;
    stairs.push({
      index, cell: approach[offset], outer: null, surfaceY2,
      targetState: surfaceY2 % 2 === 1
        ? 'minecraft:smooth_stone_slab[type=bottom,waterlogged=false]'
        : 'minecraft:smooth_stone_slab[type=top,waterlogged=false]',
    });
  }
  return stairs;
}

const ledger = readJson(LEDGER);
const manifest = readJson(MANIFEST);
const mechanisms = readJson(INPUTS.mechanisms);
const prior = Object.fromEntries(Object.entries(INPUTS)
  .filter(([key]) => key.endsWith('Manifest')).map(([key, filename]) => [key, readJson(filename)]));
const ledgerBinding = fileBinding(LEDGER);
const manifestBinding = fileBinding(MANIFEST);
invariant(ledgerBinding.sha256 === EXPECTED.ledgerSha256
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.mode === 'EXECUTE' && ledger.stages.length === 17
  && ledger.stages.every(({ status }) => status === 'PASS')
  && ledger.evidenceBindings.length === 17,
'terminal ledger identity or stages drifted');
invariant(ledger.transactionId === manifest.transactionId
  && ledger.releaseNodeId === manifest.releaseNodeId
  && ledger.manifest.sha256 === manifestBinding.sha256
  && manifestBinding.sha256 === EXPECTED.manifestFileSha256,
'ledger/manifest binding drifted');
const manifestPayload = { ...manifest };
delete manifestPayload.manifestIdentity;
invariant(manifest.manifestIdentity === EXPECTED.manifestIdentity
  && manifest.manifestIdentity === sha256(JSON.stringify(manifestPayload)),
'manifest payload identity drifted');

const sourceIntake = readJson(ledger.sourceSnapshot.completeSaveIntake.path);
const postIntake = readJson(ledger.postSnapshot.completeSaveIntake.path);
const sourceIdentity = readJson(ledger.sourceSnapshot.identity.path);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
invariant(ledger.sourceSnapshot.completeSaveSha256 === EXPECTED.sourceComplete
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.postComplete
  && sourceIntake.packageIdentity.completeSaveSha256 === EXPECTED.sourceComplete
  && postIntake.packageIdentity.completeSaveSha256 === EXPECTED.postComplete
  && sourceIdentity.sha256 === EXPECTED.sourceRegion
  && postIdentity.sha256 === EXPECTED.postRegion,
'source/post immutable identity drifted');
const evidenceBindingFailures = ledger.evidenceBindings.filter((binding) => (
  !fs.existsSync(abs(binding.path)) || fileBinding(binding.path).sha256 !== binding.sha256
  || fileBinding(binding.path).bytes !== binding.bytes
));
const recomputedSourceBoundIdentity = sha256(JSON.stringify({
  executionBindingSha256: ledger.executionBindingSha256,
  sourceCompleteSaveSha256: sourceIntake.packageIdentity.completeSaveSha256,
  sourceRegionSha256: sourceIdentity.sha256,
}));
const recomputedCompletedIdentity = sha256(JSON.stringify({
  sourceBoundReleaseIdentitySha256: ledger.sourceBoundReleaseIdentitySha256,
  postCompleteSaveSha256: postIntake.packageIdentity.completeSaveSha256,
  postRegionSha256: postIdentity.sha256,
  rollbackPoststatePreflights: ledger.rollbackPoststatePreflights.map(
    ({ path: reportPath, sha256: reportSha256 }) => ({ path: reportPath, sha256: reportSha256 }),
  ),
  evidenceBindingsSha256: sha256(JSON.stringify(ledger.evidenceBindings)),
}));
invariant(evidenceBindingFailures.length === 0
  && ledger.sourceBoundReleaseIdentitySha256 === EXPECTED.sourceBoundReleaseIdentity
  && ledger.sourceBoundReleaseIdentitySha256 === recomputedSourceBoundIdentity
  && ledger.completedReleaseIdentitySha256 === EXPECTED.completedReleaseIdentity
  && ledger.completedReleaseIdentitySha256 === recomputedCompletedIdentity,
'evidence binding or completed identity drifted');

const pkg = manifest.packages[0];
const forward = parseOperations(pkg.forward);
const rollback = parseOperations(pkg.rollback);
const targets = forward.map(({ cell }) => cell);
const targetKeys = new Set(targets.map(cellKey));
invariant(forward.length === 2 && rollback.length === 2
  && hashCells(targets) === EXPECTED.targetHash
  && fileBinding(pkg.forward).sha256 === EXPECTED.forwardFileSha256
  && fileBinding(pkg.rollback).sha256 === EXPECTED.rollbackFileSha256
  && JSON.stringify(rollback) === JSON.stringify(forward.slice().reverse().map((entry) => ({
    cell: entry.cell, sourceState: entry.targetState, targetState: entry.sourceState,
  }))), 'operation identity or exact inverse drifted');

const sourceReader = new AnvilReader(abs(path.join(ledger.sourceSnapshot.root, 'region')));
const postReader = new AnvilReader(abs(path.join(ledger.postSnapshot.root, 'region')));
const sourceEntityReader = new AnvilReader(abs(path.join(ledger.sourceSnapshot.root, 'entities')));
const postEntityReader = new AnvilReader(abs(path.join(ledger.postSnapshot.root, 'entities')));
const state = async (reader, cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
const targetResults = [];
for (const operation of forward) targetResults.push({
  ...operation,
  sourceObserved: await state(sourceReader, operation.cell),
  postObserved: await state(postReader, operation.cell),
});
invariant(targetResults.every((entry) => entry.sourceState === 'minecraft:polished_diorite'
  && entry.targetState === 'minecraft:air'
  && entry.sourceObserved === entry.sourceState && entry.postObserved === entry.targetState),
'exact two-cell transition mismatch');

const stairs = buildStairs(mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem.anchors.top);
invariant(stairs.length === 111 && stairs.every((entry, index) => entry.index === index),
'ordered upper stair geometry drifted');
for (let index = 1; index < stairs.length; index += 1) {
  const previous = stairs[index - 1];
  const current = stairs[index];
  invariant(Math.abs(previous.cell.x - current.cell.x) + Math.abs(previous.cell.z - current.cell.z) === 1
    && current.surfaceY2 - previous.surfaceY2 >= 0
    && current.surfaceY2 - previous.surfaceY2 <= 1,
  `stair continuity drift at index ${index}`);
}
const route = stairs.map(({ cell }) => cell);
const routeKeys = new Set(route.map(cellKey));
const routeMismatches = [];
for (const entry of stairs) {
  const observed = await state(postReader, entry.cell);
  if (observed !== entry.targetState) routeMismatches.push({ ...entry, observed });
}
const clearance = uniqueCells(route.flatMap((cell) => [
  { x: cell.x, y: cell.y + 1, z: cell.z }, { x: cell.x, y: cell.y + 2, z: cell.z },
])).filter((cell) => !routeKeys.has(cellKey(cell)));
const barrier = uniqueCells(stairs.flatMap(({ outer }) => outer ? [
  { x: outer.x, y: outer.y + 1, z: outer.z }, { x: outer.x, y: outer.y + 2, z: outer.z },
] : []));
const clearanceResults = [];
for (const cell of clearance) clearanceResults.push({ cell, state: await state(postReader, cell) });
const barrierResults = [];
for (const cell of barrier) barrierResults.push({ cell, state: await state(postReader, cell) });
const clearanceAir = clearanceResults.filter(({ state: observed }) => AIR_NAMES.has(stateName(observed)));
const collisionBarrier = barrierResults.filter(({ state: observed }) => (
  FULL_SOLID_NAMES.has(stateName(observed)) || GRAVITY_NAMES.has(stateName(observed))
));
const backedApertures = barrierResults.filter(({ state: observed }) => AIR_NAMES.has(stateName(observed)));
invariant(routeMismatches.length === 0 && clearance.length === 222 && clearanceAir.length === 222
  && barrier.length === 216 && collisionBarrier.length === 214 && backedApertures.length === 2
  && hashCells(backedApertures.map(({ cell }) => cell)) === EXPECTED.targetHash,
'route, clearance, or 214-plus-2 fall boundary failed');

const transitionFloors = targets.map(({ x, z }) => ({ x, y: 60, z }));
const transitionVoid = targets.map(({ x, z }) => ({ x, y: 61, z }));
const transitionCeiling = targets.map(({ x, z }) => ({ x, y: 63, z }));
for (const cell of transitionFloors) invariant(
  await state(postReader, cell) === 'minecraft:smooth_stone_slab[type=top,waterlogged=false]',
  'transition floor drifted',
);
for (const cell of transitionVoid) invariant(AIR_NAMES.has(stateName(await state(postReader, cell))),
  'transition lower void drifted');
for (const cell of transitionCeiling) invariant(
  await state(postReader, cell) === 'minecraft:polished_diorite', 'transition ceiling drifted',
);

const lowerDeck = cellsIn({ minX: 2105, maxX: 2111, minY: 18, maxY: 18, minZ: -401, maxZ: -395 });
const walls = [];
for (let y = 73; y <= 75; y += 1) {
  for (let x = 2105; x <= 2111; x += 1) {
    for (let z = -401; z <= -395; z += 1) {
      if (x === 2105 || x === 2111 || z === -401 || z === -395) walls.push({ x, y, z });
    }
  }
}
const roof = cellsIn({ minX: 2105, maxX: 2111, minY: 76, maxY: 76, minZ: -401, maxZ: -395 });
const fixtures = prior.r09gManifest.scope.fixtureAssociations.map(({ fixture }) => fixture);
const preservedSets = [
  ['lower wet containment deck', lowerDeck, 'minecraft:polished_diorite'],
  ['doorless exterior walls', walls, 'minecraft:polished_diorite'],
  ['headhouse roof', roof, 'minecraft:polished_diorite'],
  ['R09G fixtures', fixtures, 'minecraft:sea_lantern'],
];
const preservationFailures = [];
for (const [name, cells, expected] of preservedSets) {
  for (const cell of cells) {
    const sourceObserved = await state(sourceReader, cell);
    const postObserved = await state(postReader, cell);
    if (sourceObserved !== expected || postObserved !== expected) {
      preservationFailures.push({ name, cell, expected, sourceObserved, postObserved });
    }
  }
}
invariant(lowerDeck.length === 49 && walls.length === 72 && roof.length === 49
  && fixtures.length === 8 && preservationFailures.length === 0,
'wet deck, exterior shell, roof, or passive fixtures drifted');

const gravityFaces = targets.map(({ x, y }) => ({ x, y, z: -394 }));
const supportedGravity = [];
for (const gravity of gravityFaces.flatMap((cell) => [cell, { ...cell, y: cell.y - 1 }, { ...cell, y: cell.y - 2 }])) {
  invariant(await state(postReader, gravity) === 'minecraft:sand', 'retained sand chain drifted');
  supportedGravity.push(gravity);
}
for (const terminal of gravityFaces.map((cell) => ({ ...cell, y: cell.y - 3 }))) {
  invariant(await state(postReader, terminal) === 'minecraft:dirt', 'sand terminal support drifted');
}

const halo = cubeHalo(targets);
invariant(halo.length === 36 && hashCells(halo) === EXPECTED.haloHash, '36-cell halo drifted');
const haloDiff = [];
for (const cell of halo) {
  const sourceState = await state(sourceReader, cell);
  const postState = await state(postReader, cell);
  if (sourceState !== postState) haloDiff.push({ cell, sourceState, postState });
}
const haloLifecycle = haloDiff.filter(({ cell, sourceState, postState }) => (
  cellKey(cell) === '2107,62,-394'
  && sourceState === 'minecraft:grass_block[snowy=true]' && postState === 'minecraft:dirt'
));
const haloUnclassified = haloDiff.filter(({ cell }) => (
  !targetKeys.has(cellKey(cell)) && !haloLifecycle.some(({ cell: accepted }) => cellKey(accepted) === cellKey(cell))
));
invariant(haloDiff.length === 3 && haloLifecycle.length === 1
  && hashCells(haloLifecycle.map(({ cell }) => cell)) === EXPECTED.lifecycleHash
  && haloUnclassified.length === 0,
'halo diff is not the two targets plus exact pier-shadow lifecycle cell');

const b07 = deriveB07WestTwo(mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem);
invariant(b07.construction.length === 8134
  && hashCells(b07.construction, D06_CELL_PREAMBLE) === EXPECTED.b07ConstructionHash
  && b07.interaction.length === 13608
  && hashCells(b07.interaction, D06_CELL_PREAMBLE) === EXPECTED.b07InteractionHash,
'canonical B07 geometry drifted');
const interactionDiff = [];
const lifecycleDiff = [];
const mechanismDrift = [];
let sourceMechanismCount = 0;
let postMechanismCount = 0;
for (const cell of b07.interaction) {
  const sourceState = await state(sourceReader, cell);
  const postState = await state(postReader, cell);
  if (ACTIVE_MECHANISMS.has(stateName(sourceState))) sourceMechanismCount += 1;
  if (ACTIVE_MECHANISMS.has(stateName(postState))) postMechanismCount += 1;
  if (sourceState !== postState) {
    const change = { cell, sourceState, postState };
    interactionDiff.push(change);
    if (cellKey(cell) === '2107,62,-394'
      && sourceState === 'minecraft:grass_block[snowy=true]' && postState === 'minecraft:dirt') {
      lifecycleDiff.push(change);
    }
    if (ACTIVE_MECHANISMS.has(stateName(sourceState)) || ACTIVE_MECHANISMS.has(stateName(postState))) {
      mechanismDrift.push(change);
    }
  }
}
const classifiedInteractionKeys = new Set([...targets, ...lifecycleDiff.map(({ cell }) => cell)].map(cellKey));
const unclassifiedInteractionDiff = interactionDiff.filter(({ cell }) => !classifiedInteractionKeys.has(cellKey(cell)));
invariant(interactionDiff.length === 3 && lifecycleDiff.length === 1
  && hashCells(lifecycleDiff.map(({ cell }) => cell)) === EXPECTED.lifecycleHash
  && unclassifiedInteractionDiff.length === 0 && mechanismDrift.length === 0
  && sourceMechanismCount === postMechanismCount,
'B07 off-target, lifecycle, or mechanism drift detected');

const priorTargets = uniqueCells([
  ...prior.r07jManifest.packages.flatMap(({ forward: filename }) => parseOperations(filename).map(({ cell }) => cell)),
  ...prior.r09eManifest.packages.flatMap(({ forward: filename }) => parseOperations(filename).map(({ cell }) => cell)),
  ...prior.r09fManifest.packages.flatMap(({ forward: filename }) => parseOperations(filename).map(({ cell }) => cell)),
  ...prior.r09gManifest.packages.flatMap(({ forward: filename }) => parseOperations(filename).map(({ cell }) => cell)),
]);
const retainedPriorTargets = priorTargets.filter((cell) => !targetKeys.has(cellKey(cell)));
const priorDrift = [];
for (const cell of retainedPriorTargets) {
  const sourceState = await state(sourceReader, cell);
  const postState = await state(postReader, cell);
  if (sourceState !== postState) priorDrift.push({ cell, sourceState, postState });
}
invariant(priorDrift.length === 0, 'retained R07J/R09E/R09F/R09G state drifted');

const haloBounds = boundsOf(halo);
const sourceBlockEntities = [];
const postBlockEntities = [];
const sourceEntities = [];
const postEntities = [];
for (let cx = Math.floor(haloBounds.minX / 16); cx <= Math.floor(haloBounds.maxX / 16); cx += 1) {
  for (let cz = Math.floor(haloBounds.minZ / 16); cz <= Math.floor(haloBounds.maxZ / 16); cz += 1) {
    for (const [reader, output] of [[sourceReader, sourceBlockEntities], [postReader, postBlockEntities]]) {
      const chunk = await reader.chunk(cx, cz);
      for (const blockEntity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
        const point = { x: Number(blockEntity.x), y: Number(blockEntity.y), z: Number(blockEntity.z) };
        if (halo.some((cell) => cellKey(cell) === cellKey(point))) output.push({ id: blockEntity.id ?? null, point });
      }
    }
    for (const [reader, output] of [[sourceEntityReader, sourceEntities], [postEntityReader, postEntities]]) {
      const chunk = await reader.chunk(cx, cz);
      for (const entity of chunk?.Entities ?? []) {
        if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
        const [x, y, z] = entity.Pos.map(Number);
        if (x >= haloBounds.minX && x < haloBounds.maxX + 1
          && y >= haloBounds.minY && y < haloBounds.maxY + 1
          && z >= haloBounds.minZ && z < haloBounds.maxZ + 1) {
          output.push({ id: entity.id ?? null, position: [x, y, z] });
        }
      }
    }
  }
}
invariant(sourceBlockEntities.length === 0 && postBlockEntities.length === 0
  && sourceEntities.length === 0 && postEntities.length === 0,
'halo entity or block-entity preservation failed');

const executionPath = path.join(EVIDENCE, `${pkg.key}.forward-execution.json`);
const rollbackPreflightPath = path.join(EVIDENCE, `${pkg.key}.rollback-poststate-preflight.json`);
const journalPath = `${executionPath}.stream-journal.jsonl`;
const execution = readJson(executionPath);
const rollbackPreflight = readJson(rollbackPreflightPath);
const journal = fs.readFileSync(abs(journalPath), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
invariant(execution.status === 'complete' && execution.strictNoop === true
  && execution.operationRole === 'forward' && execution.sourceOperationCount === 2
  && execution.sourceGroupCount === 2 && execution.successfulGroups === 2
  && execution.failedGroups === 0 && execution.noopCommands === 0
  && execution.unknownReplyCommands === 0 && execution.worldEditLeftoverCount === 0
  && execution.forceLoadAudit?.allTemporaryReleased === true
  && execution.forceLoadAudit?.finalSetMatchesPreExistingSet === true
  && sha256(fs.readFileSync(abs(execution.streamJournal))) === execution.streamJournalSha256,
'strict execution evidence failed');
invariant(journal.length === 10
  && journal.every(({ sequence }, index) => sequence === index + 1)
  && journal.at(-1).status === 'complete'
  && journal.at(-1).batch?.status === 'completed-cleaned'
  && journal.filter(({ batch }) => batch?.status === 'group-result'
    && batch?.activeGroupResult === 'passed').length === 2,
'execution journal is not exact and complete');
invariant(rollbackPreflight.status === 'PASS' && rollbackPreflight.passed === 2
  && rollbackPreflight.failed === 0
  && rollbackPreflight.opsSha256 === EXPECTED.rollbackFileSha256
  && rollbackPreflight.regionsSnapshot.sha256 === EXPECTED.postRegion,
'rollback post-state preflight is not exact 2/2');

const checks = [
  'R09H-QA-01-TERMINAL-IDENTITY-AND-17-STAGES',
  'R09H-QA-02-EXACT-TWO-DIORITE-TO-AIR-CORRECTIONS',
  'R09H-QA-03-EXACT-REVERSE-ORDER-INVERSE',
  'R09H-QA-04-ORDERED-111-SURFACE-HALF-STEP-ROUTE',
  'R09H-QA-05-EXACT-222-OF-222-AIR-CLEARANCE',
  'R09H-QA-06-EXACT-214-SOLID-PLUS-TWO-BACKED-APERTURES',
  'R09H-QA-07-EXACT-FLOOR-VOID-CEILING-TRANSITION',
  'R09H-QA-08-SIX-SAND-CELLS-DURABLY-SUPPORTED',
  'R09H-QA-09-WET-DECK-EXTERIOR-SHELL-ROOF-AND-FIXTURES-PRESERVED',
  'R09H-QA-10-RETAINED-R07J-R09EFG-STATE-PRESERVED',
  'R09H-QA-11-EXACT-36-CELL-HALO-DIFF-PLUS-ONE-PIER-SHADOW-LIFECYCLE',
  'R09H-QA-12-ZERO-UNCLASSIFIED-B07-OFF-TARGET-OR-MECHANISM-DRIFT',
  'R09H-QA-13-ENTITY-AND-BLOCK-ENTITY-PRESERVATION',
  'R09H-QA-14-STRICT-JOURNALED-EXECUTION',
  'R09H-QA-15-ROLLBACK-POSTSTATE-2-OF-2',
  'R09H-QA-16-EXTERIOR-LOWER-WET-AND-MECHANISM-HOLDS-REMAIN-CLOSED',
];
const payload = {
  schemaVersion: 1,
  id: 'combined-zones-r09h-b07-transition-clearance-correction-post-release-qa',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R09H_B07_TRANSITION_CLEARANCE_POSTSTATE_VERIFIED_REVERSIBLE',
  release: {
    transactionId: manifest.transactionId,
    releaseNodeId: manifest.releaseNodeId,
    manifestIdentity: manifest.manifestIdentity,
    sourceBoundReleaseIdentitySha256: ledger.sourceBoundReleaseIdentitySha256,
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
  },
  bindings: {
    ledger: ledgerBinding,
    manifest: manifestBinding,
    sourceCompleteSaveSha256: ledger.sourceSnapshot.completeSaveSha256,
    sourceRegionSha256: sourceIdentity.sha256,
    postCompleteSaveSha256: ledger.postSnapshot.completeSaveSha256,
    postRegionSha256: postIdentity.sha256,
  },
  exactState: {
    targetCellCount: targetResults.length,
    sourceMatchingCellCount: targetResults.filter((entry) => entry.sourceObserved === entry.sourceState).length,
    postMatchingCellCount: targetResults.filter((entry) => entry.postObserved === entry.targetState).length,
    sourceState: 'minecraft:polished_diorite',
    targetState: 'minecraft:air',
    exactReverseOrderInverse: true,
  },
  geometry: {
    correctedClearanceCells: classManifest(targets),
    orderedStairRoute: { ...classManifest(route), cardinallyContiguous: true, maximumRiseHalfBlocks: 1 },
    headClearance: { ...classManifest(clearance), airCellCount: clearanceAir.length },
    fallBoundary: {
      ...classManifest(barrier), collisionCellCount: collisionBarrier.length,
      floorBackedInternalApertureCount: backedApertures.length,
    },
    transitionBackingFloors: classManifest(transitionFloors),
    transitionLowerVoid: classManifest(transitionVoid),
    transitionCeiling: classManifest(transitionCeiling),
    halo: classManifest(halo),
  },
  drift: {
    haloChangedCellCount: haloDiff.length,
    haloDeclaredOperationChangedCellCount: haloDiff.filter(({ cell }) => targetKeys.has(cellKey(cell))).length,
    haloAcceptedLifecycleChangedCellCount: haloLifecycle.length,
    haloUnclassifiedChangedCellCount: haloUnclassified.length,
    b07InteractionCellCount: b07.interaction.length,
    b07InteractionChangedCellCount: interactionDiff.length,
    b07InteractionDeclaredOperationChangedCellCount:
      interactionDiff.filter(({ cell }) => targetKeys.has(cellKey(cell))).length,
    b07InteractionUnclassifiedChangedCellCount: unclassifiedInteractionDiff.length,
    lifecycleTransitionCellCount: lifecycleDiff.length,
    lifecycleTransitions: lifecycleDiff,
    lifecycleCausality: {
      classification: 'NORMAL_GRASS_TO_DIRT_UNDER_LONG_STANDING_OPAQUE_R07J_PIER',
      overheadPierCell: { x: 2107, y: 63, z: -394 },
      overheadPierSourceState: 'minecraft:polished_diorite',
      overheadPierPostState: 'minecraft:polished_diorite',
      operationTargetIntersectionCount: 0,
      supportLossCreated: false,
    },
    mechanismChangedCellCount: mechanismDrift.length,
  },
  preservation: {
    lowerWetContainmentDeckCellCount: lowerDeck.length,
    doorlessHeadhouseWallCellCount: walls.length,
    headhouseRoofCellCount: roof.length,
    passiveFixtureCellCount: fixtures.length,
    supportedSandCellCount: supportedGravity.length,
    priorR07jR09efgUnionCellCount: priorTargets.length,
    retainedPriorCellCount: retainedPriorTargets.length,
    retainedPriorChangedCellCount: priorDrift.length,
    sourceMechanismCellCount: sourceMechanismCount,
    postMechanismCellCount: postMechanismCount,
    sourceBlockEntityCount: sourceBlockEntities.length,
    postBlockEntityCount: postBlockEntities.length,
    sourceSavedEntityCount: sourceEntities.length,
    postSavedEntityCount: postEntities.length,
  },
  executionEvidence: {
    stageCount: ledger.stages.length,
    evidenceBindingCount: ledger.evidenceBindings.length,
    evidenceBindingFailureCount: evidenceBindingFailures.length,
    successfulGroupCount: execution.successfulGroups,
    noopCommandCount: execution.noopCommands,
    journalEntryCount: journal.length,
    journalComplete: journal.at(-1).status === 'complete',
    rollbackPassed: rollbackPreflight.passed,
    rollbackFailed: rollbackPreflight.failed,
  },
  checks: checks.map((id) => ({ id, status: 'PASS' })),
  summary: {
    passed: true, checkCount: checks.length, passCount: checks.length, failCount: 0,
    exactTargetCellCount: targets.length, headClearanceAirCellCount: clearanceAir.length,
    collisionBarrierCellCount: collisionBarrier.length,
    floorBackedInternalApertureCount: backedApertures.length,
    unclassifiedB07ChangedCellCount: 0, lifecycleTransitionCellCount: 1,
    rollbackReadyCellCount: rollbackPreflight.passed,
  },
  safetyBoundary: {
    lowerWetInterfaceOpened: false,
    exteriorOpeningCreated: false,
    mechanismOrControlCommissioned: false,
    publicRouteCommissionedByThisQa: false,
    commissioningRequiresSeparateBoundedFunctionalSeal: true,
    liveCallsPerformedByQa: false,
    worldMutationPerformedByQa: false,
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(payload));
const report = { ...payload, qaPayloadSha256 };
fs.writeFileSync(abs(OUT), `${JSON.stringify(report, null, 2)}\n`);
const markdown = `# R09H B07 transition-clearance post-release QA\n\n`
  + `**Status:** ${report.status}  \n`
  + `**QA payload SHA-256:** \`${qaPayloadSha256}\`  \n`
  + `**Completed release identity:** \`${ledger.completedReleaseIdentitySha256}\`\n\n`
  + `Both exact polished-diorite-to-air corrections pass. The complete ordered 111-surface route now has 222/222 air-clearance cells and a 216-cell fall boundary comprising 214 collision cells plus the two exact floor-backed internal apertures.\n\n`
  + `The 36-cell halo and full 13,608-cell B07 interaction domain contain the two declared changes plus one exact accepted lifecycle transition: the grass block at (2107,62,-394), directly under the unchanged long-standing opaque R07J south pier, settled to dirt. There is zero unclassified or mechanism drift. Six retained sand cells remain durably supported; the wet deck, doorless exterior shell, roof, eight passive fixtures, entities, block entities, and retained prior scopes are unchanged.\n\n`
  + `The wrapper completed 17/17 stages with 17 bound artifacts, ten ordered journal entries, two successful strict groups, zero no-op commands, complete force-load cleanup, and a 2/2 rollback post-state preflight. This verifier made no live call or world mutation. Route commissioning is evaluated separately.\n`;
fs.writeFileSync(abs(MARKDOWN), markdown);
process.stdout.write(`${JSON.stringify({
  status: report.status, output: rel(OUT), markdown: rel(MARKDOWN), qaPayloadSha256,
  summary: report.summary,
}, null, 2)}\n`);
