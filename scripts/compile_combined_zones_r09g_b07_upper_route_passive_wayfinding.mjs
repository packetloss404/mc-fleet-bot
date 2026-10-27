#!/usr/bin/env node
/** Compile CZ-R09G: passive visual fixtures for the accepted enclosed B07 upper route. */

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
  replLine,
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
const GENERATED_AT = value('--generated-at', '2026-08-22T01:55:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r09f-post-20260822T013916Z',
);
const INTAKE = value(
  '--intake-audit',
  'data/world-review/combined-zones-r09f-live-20260822T013916Z/post-complete-save-intake.json',
);
const SOURCE_LEDGER = value(
  '--source-ledger',
  'data/world-review/combined-zones-r09f-live-20260822T013916Z/evidence-ledger.json',
);
const SOURCE_QA = value(
  '--source-qa',
  'data/world-review/combined-zones-r09f-live-20260822T013916Z/r09f-post-release-qa.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value(
  '--basename',
  'combined-zones-r09g-b07-upper-route-passive-wayfinding',
);
const ENTITY_REPORT = value(
  '--entity-report',
  'data/world-review/combined-zones-r09g-b07-upper-route-passive-wayfinding-offline-20260822T015500Z/immutable-entity-clearance.json',
);

const RELEASE_ID = 'CZ-R09G-P1-B07-UPPER-ROUTE-PASSIVE-WAYFINDING';
const RELEASE_NODE_ID = 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT';
const PACKAGE_KEY = 'b07-upper-route-passive-wall-wayfinding';
const AIR = 'minecraft:air';
const CORE = 'minecraft:polished_andesite';
const CONTAINMENT = 'minecraft:polished_diorite';
const LIGHT = 'minecraft:sea_lantern';
const AIR_NAMES = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const GRAVITY_NAMES = new Set([
  'minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand',
  'minecraft:suspicious_gravel', 'minecraft:suspicious_sand', 'minecraft:dragon_egg',
]);
const ACTIVE_MECHANISMS = new Set([
  'minecraft:rail', 'minecraft:powered_rail', 'minecraft:detector_rail',
  'minecraft:activator_rail', 'minecraft:redstone_wire',
  'minecraft:redstone_torch', 'minecraft:redstone_wall_torch',
  'minecraft:repeater', 'minecraft:comparator', 'minecraft:piston',
  'minecraft:sticky_piston', 'minecraft:observer', 'minecraft:dispenser',
  'minecraft:dropper', 'minecraft:hopper',
]);
const FULL_SOLID_NAMES = new Set([
  'minecraft:stone', 'minecraft:dirt', 'minecraft:grass_block',
  'minecraft:granite', 'minecraft:diorite', 'minecraft:andesite',
  'minecraft:deepslate', 'minecraft:tuff', 'minecraft:copper_ore',
  'minecraft:iron_ore', 'minecraft:coal_ore', CORE, CONTAINMENT, LIGHT,
]);
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0],
  [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

const INPUTS = Object.freeze({
  mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  protectedRelics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  authorization: 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  releaseContract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
  currentState: 'docs/masterplans/05-combined-zones/CURRENT-STATE.md',
  r02Manifest: 'data/buildops/combined-zones-r02-d06-shell.release-manifest.json',
  r06Manifest: 'data/buildops/combined-zones-r06-support-liner.release-manifest.json',
  r07jManifest: 'data/buildops/combined-zones-r07j-b07-supported-surface-headhouse.release-manifest.json',
  r09eManifest: 'data/buildops/combined-zones-r09e-b07-dry-upper-stair.release-manifest.json',
  r09fManifest: 'data/buildops/combined-zones-r09f-b07-enclosed-upper-interface.release-manifest.json',
});

const EXPECTED = Object.freeze({
  sourceComplete: 'df6b887176e00a708d55e9022058781a0909df02603f91e482ed78234e1627d0',
  sourceRegion: 'a99bf9398a1fdeb24ee9f32afc337ebac8551f5224e8387728e7e427180789f8',
  sourceLedger: '60c7106107ee5f03cffc7771a68c4c570bd06a99d508996472737162780f2c30',
  sourceCompleted: '3b9b5c0836b5c42a1e05c7b6a5efd9195015355a33bfad9697473ea5a18059f1',
  sourceQa: 'e74633591df6aad485309f61b3cf8890013f9337b8595d0b570946fb67611b98',
  sourceQaPayload: '01c22b585864d130d3e1840d234923a6f66fbdf0fd0263ee9e13de21b47d5ed0',
  r02Manifest: 'd880ccfe4a2a70c7be91f4a0d2e9462df131ff8b160650097cf85db68d7db88b',
  r06Manifest: 'b671d1f88137951ca0b1e25cf3e2c93e7db4d87b30db614223925af28e12bf07',
  r07jManifest: '7714a583c3e659b0f9d2efac228ad8a1c1fb050a3b78b9010ee40c2ed519f223',
  r09eManifest: '10fb02c514bcd5bb14e7febf987ae9fa7f1c22ab9e5bbb4fcdb9f30698ffcc7f',
  r09fManifest: 'bdec6c796b92aee6b4d97da9e70945601f547e0b7f41eeb562b5cfec09a4d588',
  b07ConstructionCount: 8134,
  b07ConstructionSha256: 'd58f20c6ad6581487e2a6ba72754d40ce22d49981da7450b44ad5e37325e5e59',
  b07InteractionCount: 13608,
  b07InteractionSha256: 'dd2cc387b0e5f6517ec48176c820e05f5fef5ff9793c74d32d4a5262582e5a8d',
});

const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R09G B07 passive-wayfinding compiler rejected: ${message}`);
};
const stateName = (state) => state.split('[', 1)[0];
const fileBinding = (filename) => ({
  path: rel(filename),
  sha256: sha256(fs.readFileSync(abs(filename))),
  bytes: fs.statSync(abs(filename)).size,
});
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const stateCensus = (records, field = 'state') => Object.fromEntries([...records
  .reduce((counts, record) => {
    const state = record[field];
    counts.set(state, (counts.get(state) ?? 0) + 1);
    return counts;
  }, new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)));
const intersection = (left, right) => {
  const rightKeys = new Set(right.map(cellKey));
  return uniqueCells(left.filter((cell) => rightKeys.has(cellKey(cell))));
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
const savedEntityInside = (entity, bounds) => {
  if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) return false;
  const [x, y, z] = entity.Pos.map(Number);
  return x >= bounds.minX && x < bounds.maxX + 1
    && y >= bounds.minY && y < bounds.maxY + 1
    && z >= bounds.minZ && z < bounds.maxZ + 1;
};

function expandOperations(filename) {
  const records = [];
  for (const raw of fs.readFileSync(abs(filename), 'utf8').split(/\r?\n/)) {
    if (!raw.startsWith('REPL ')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields.length === 9, `${filename} contains a malformed REPL`);
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

function operationIntersection(filename, targetCells) {
  const hits = [];
  for (const raw of fs.readFileSync(abs(filename), 'utf8').split(/\r?\n/)) {
    if (!raw.startsWith('REPL ')) continue;
    const fields = raw.split(/\s+/);
    const box = fields.slice(1, 7).map(Number);
    for (const cell of targetCells) {
      if (cell.x >= Math.min(box[0], box[3]) && cell.x <= Math.max(box[0], box[3])
        && cell.y >= Math.min(box[1], box[4]) && cell.y <= Math.max(box[1], box[4])
        && cell.z >= Math.min(box[2], box[5]) && cell.z <= Math.max(box[2], box[5])) {
        hits.push(cell);
      }
    }
  }
  return uniqueCells(hits);
}

const intake = readJson(INTAKE);
const ledger = readJson(SOURCE_LEDGER);
const sourceQa = readJson(SOURCE_QA);
const sourceIdentity = readJson(ledger.postSnapshot.identity.path);
const mechanisms = readJson(INPUTS.mechanisms);
const relics = readJson(INPUTS.protectedRelics);
const authorization = readJson(INPUTS.authorization);
const contract = readJson(INPUTS.releaseContract);
const manifests = Object.fromEntries(Object.entries(INPUTS)
  .filter(([key]) => key.endsWith('Manifest'))
  .map(([key, filename]) => [key, readJson(filename)]));

invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true
  && intake.packageIdentity.completeSaveSha256 === EXPECTED.sourceComplete
  && abs(intake.input.suppliedWorldRoot) === abs(SNAPSHOT),
'source intake is not the accepted immutable R09F post');
invariant(sha256(fs.readFileSync(abs(SOURCE_LEDGER))) === EXPECTED.sourceLedger
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.completedReleaseIdentitySha256 === EXPECTED.sourceCompleted
  && abs(ledger.postSnapshot.root) === abs(SNAPSHOT),
'source ledger is not the accepted R09F terminal');
invariant(sourceIdentity.sha256 === EXPECTED.sourceRegion
  && abs(sourceIdentity.directory) === abs(path.join(SNAPSHOT, 'region')),
'source region identity drifted');
invariant(sha256(fs.readFileSync(abs(SOURCE_QA))) === EXPECTED.sourceQa
  && sourceQa.status === 'PASS_R09F_B07_ENCLOSED_UPPER_INTERFACE_POSTSTATE_VERIFIED_REVERSIBLE'
  && sourceQa.qaPayloadSha256 === EXPECTED.sourceQaPayload,
'R09F independent post-release acceptance is absent or drifted');
invariant(manifests.r02Manifest.manifestIdentity === EXPECTED.r02Manifest
  && manifests.r06Manifest.manifestIdentity === EXPECTED.r06Manifest
  && manifests.r07jManifest.manifestIdentity === EXPECTED.r07jManifest
  && manifests.r09eManifest.manifestIdentity === EXPECTED.r09eManifest
  && manifests.r09fManifest.manifestIdentity === EXPECTED.r09fManifest,
'required prior manifest identity drifted');
for (const member of ['region', 'entities', 'poi']) {
  invariant(fs.existsSync(abs(path.join(SNAPSHOT, member))), `source snapshot is missing ${member}`);
}
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID),
'standing authorization does not cover R09');
const r09Node = contract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID);
invariant(r09Node?.canonicalOwners?.includes('Z06-PUBLIC-SHAFT-FITOUT'),
'release contract does not bind the public-shaft fit-out owner');
invariant(fs.readFileSync(abs(INPUTS.currentState), 'utf8')
  .includes('R09B/R09C/R09D · B07 lower spiral stair and containment'),
'CURRENT-STATE does not retain accepted B07 public-core construction');

const b07System = mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem;
const b07 = deriveB07WestTwo(b07System);
invariant(b07.construction.length === EXPECTED.b07ConstructionCount
  && hashCells(b07.construction, D06_CELL_PREAMBLE) === EXPECTED.b07ConstructionSha256
  && b07.interaction.length === EXPECTED.b07InteractionCount
  && hashCells(b07.interaction, D06_CELL_PREAMBLE) === EXPECTED.b07InteractionSha256,
'canonical B07 geometry identity drifted');
const constructionKeys = new Set(b07.construction.map(cellKey));
const interactionKeys = new Set(b07.interaction.map(cellKey));

// R09E exact outer 7x7 helix, with the adjacent accepted static-core face retained.
const outerRing = [];
for (let x = 2105; x <= 2111; x += 1) outerRing.push({ x, z: -401, ix: x, iz: -400, ox: x, oz: -402 });
for (let z = -400; z <= -395; z += 1) outerRing.push({ x: 2111, z, ix: 2110, iz: z, ox: 2112, oz: z });
for (let x = 2110; x >= 2105; x -= 1) outerRing.push({ x, z: -395, ix: x, iz: -396, ox: x, oz: -394 });
for (let z = -396; z >= -400; z -= 1) outerRing.push({ x: 2105, z, ix: 2106, iz: z, ox: 2104, oz: z });
invariant(outerRing.length === 24, 'R09E 7x7 ring drifted');

const stairs = [];
for (let index = 0; index < 84; index += 1) {
  const point = outerRing[index % outerRing.length];
  const y = 19 + Math.floor(index / 2);
  stairs.push({
    index,
    cell: { x: point.x, y, z: point.z },
    inner: { x: point.ix, y: y + 1, z: point.iz },
    outer: { x: point.ox, y, z: point.oz },
    surfaceY2: (2 * y) + (index % 2 === 0 ? 1 : 2),
    targetState: index % 2 === 0
      ? 'minecraft:smooth_stone_slab[type=bottom,waterlogged=false]'
      : 'minecraft:smooth_stone_slab[type=top,waterlogged=false]',
    sourceRelease: 'R09E',
  });
}
for (let offset = 0; offset < 4; offset += 1) {
  const index = 84 + offset;
  const point = outerRing[index % outerRing.length];
  stairs.push({
    index,
    cell: { x: point.x, y: 60, z: point.z },
    inner: { x: point.ix, y: 61, z: point.iz },
    outer: { x: point.ox, y: 60, z: point.oz },
    surfaceY2: 122,
    targetState: 'minecraft:smooth_stone_slab[type=top,waterlogged=false]',
    sourceRelease: 'R09E',
  });
}

// R09F exact inner 5x5 helix and enclosed top-anchor approach.
const innerRing = [];
for (let x = 2106; x <= 2110; x += 1) innerRing.push({ x, z: -396, ix: x, iz: -397, ox: x, oz: -395 });
for (let z = -397; z >= -400; z -= 1) innerRing.push({ x: 2110, z, ix: 2109, iz: z, ox: 2111, oz: z });
for (let x = 2109; x >= 2106; x -= 1) innerRing.push({ x, z: -400, ix: x, iz: -399, ox: x, oz: -401 });
for (let z = -399; z <= -397; z += 1) innerRing.push({ x: 2106, z, ix: 2107, iz: z, ox: 2105, oz: z });
invariant(innerRing.length === 16, 'R09F 5x5 ring drifted');
for (let step = 1; step <= 20; step += 1) {
  const point = innerRing[(step + 1) % innerRing.length];
  const surfaceY2 = 122 + step;
  const y = Math.floor((surfaceY2 - 1) / 2);
  stairs.push({
    index: 87 + step,
    cell: { x: point.x, y, z: point.z },
    inner: { x: point.ix, y: y + 1, z: point.iz },
    outer: { x: point.ox, y, z: point.oz },
    surfaceY2,
    targetState: surfaceY2 % 2 === 1
      ? 'minecraft:smooth_stone_slab[type=bottom,waterlogged=false]'
      : 'minecraft:smooth_stone_slab[type=top,waterlogged=false]',
    sourceRelease: 'R09F',
  });
}
const finalApproach = [
  { x: 2109, y: 71, z: -397 },
  { x: 2108, y: 71, z: -397 },
  { x: b07System.anchors.top.x, y: b07System.anchors.top.y, z: b07System.anchors.top.z },
];
for (let offset = 0; offset < finalApproach.length; offset += 1) {
  const index = 108 + offset;
  const surfaceY2 = 143 + offset;
  stairs.push({
    index,
    cell: finalApproach[offset],
    inner: null,
    outer: null,
    surfaceY2,
    targetState: surfaceY2 % 2 === 1
      ? 'minecraft:smooth_stone_slab[type=bottom,waterlogged=false]'
      : 'minecraft:smooth_stone_slab[type=top,waterlogged=false]',
    sourceRelease: 'R09F',
  });
}
invariant(stairs.length === 111
  && stairs.every((stair, index) => stair.index === index)
  && stairs[0].surfaceY2 === 39 && stairs.at(-1).surfaceY2 === 145,
'combined accepted upper-route index drifted');
for (let index = 1; index < stairs.length; index += 1) {
  const prior = stairs[index - 1];
  const current = stairs[index];
  invariant(Math.abs(prior.cell.x - current.cell.x) + Math.abs(prior.cell.z - current.cell.z) === 1
    && current.surfaceY2 >= prior.surfaceY2
    && current.surfaceY2 - prior.surfaceY2 <= 1,
  `accepted route loses half-step continuity at index ${index}`);
}

// The regular cadence excludes ring corners so each fixture has one unambiguous core face.
const periodicFixtureIndices = [1, 17, 33, 49, 65, 81, 97];
const terminalSupplementIndex = 104;
const fixtureIndices = [...periodicFixtureIndices, terminalSupplementIndex];
const fixtureAssociations = fixtureIndices.map((index) => {
  const stair = stairs[index];
  invariant(stair.inner, `fixture ${index} has no exact core-face cell`);
  return {
    index,
    stair: stair.cell,
    clearanceFace: { x: stair.cell.x, y: stair.cell.y + 1, z: stair.cell.z },
    fixture: stair.inner,
    sourceRelease: stair.sourceRelease,
  };
});
const fixtures = fixtureAssociations.map(({ fixture }) => fixture);
const maximumRouteIndexDistanceToFixture = Math.max(...stairs.map(({ index }) => (
  Math.min(...fixtureIndices.map((fixtureIndex) => Math.abs(index - fixtureIndex)))
)));
invariant(fixtures.length === 8 && new Set(fixtures.map(cellKey)).size === 8
  && periodicFixtureIndices.every((index, offset) => offset === 0
    || index - periodicFixtureIndices[offset - 1] === 16)
  && maximumRouteIndexDistanceToFixture === 8,
'passive fixture cadence drifted');
invariant(fixtureAssociations.every(({ clearanceFace, fixture }) => (
  Math.abs(clearanceFace.x - fixture.x)
    + Math.abs(clearanceFace.y - fixture.y)
    + Math.abs(clearanceFace.z - fixture.z) === 1
)), 'fixture is not face-adjacent to its exact route clearance cell');
invariant(fixtures.every((cell) => constructionKeys.has(cellKey(cell))
  && interactionKeys.has(cellKey(cell))), 'fixture leaves canonical B07 ownership');

const route = stairs.map(({ cell }) => cell);
const routeKeys = new Set(route.map(cellKey));
const clearance = uniqueCells(stairs.flatMap(({ cell }) => [
  { x: cell.x, y: cell.y + 1, z: cell.z },
  { x: cell.x, y: cell.y + 2, z: cell.z },
])).filter((cell) => !routeKeys.has(cellKey(cell)));
const barriers = uniqueCells(stairs.flatMap(({ outer }) => outer ? [
  { x: outer.x, y: outer.y + 1, z: outer.z },
  { x: outer.x, y: outer.y + 2, z: outer.z },
] : []));
const lowerDeck = cellsIn({ minX: 2105, maxX: 2111, minY: 18, maxY: 18, minZ: -401, maxZ: -395 });
const headhouseWalls = cellsIn({ minX: 2105, maxX: 2111, minY: 73, maxY: 75, minZ: -401, maxZ: -395 })
  .filter(({ x, z }) => x === 2105 || x === 2111 || z === -401 || z === -395);
const headhouseRoof = cellsIn({ minX: 2105, maxX: 2111, minY: 76, maxY: 76, minZ: -401, maxZ: -395 });
const landingSeam = [
  { x: 2110, y: 72, z: -396 }, { x: 2110, y: 72, z: -397 },
  { x: 2109, y: 72, z: -397 }, { x: 2108, y: 72, z: -397 },
  { x: 2108, y: 72, z: -398 },
];
const interiorDeckContinuation = { x: 2108, y: 72, z: -399 };
invariant(route.length === 111 && clearance.length === 222 && barriers.length === 216
  && lowerDeck.length === 49 && headhouseWalls.length === 72 && headhouseRoof.length === 49
  && landingSeam.length === 5,
'retained route/enclosure geometry count drifted');
invariant(intersection(fixtures, route).length === 0
  && intersection(fixtures, clearance).length === 0
  && intersection(fixtures, barriers).length === 0,
'fixture intersects route, headroom, or outer fall barrier');

const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(abs(path.join(SNAPSHOT, 'entities')));
const readState = async (cell) => stateToCommandString(
  await reader.blockState(cell.x, cell.y, cell.z),
);
const records = async (cells) => {
  const output = [];
  for (const cell of cells) output.push({ cell, state: await readState(cell) });
  return output;
};
const fixtureRecords = await records(fixtures);
const routeRecords = await records(route);
const clearanceRecords = await records(clearance);
const barrierRecords = await records(barriers);
const lowerDeckRecords = await records(lowerDeck);
const headhouseWallRecords = await records(headhouseWalls);
const headhouseRoofRecords = await records(headhouseRoof);
const landingSeamRecords = await records(landingSeam);
invariant(fixtureRecords.every(({ state }) => state === CORE), 'fixture source is not exact R09E/R09F core');
invariant(routeRecords.every(({ state }, index) => state === stairs[index].targetState),
'accepted ordered upper stair state drifted');
const clearanceMismatches = clearanceRecords.filter(({ state }) => !AIR_NAMES.has(stateName(state)));
const acceptedTransitionHoldKeys = new Set(['2108,62,-395', '2109,62,-395']);
invariant(clearanceMismatches.length === 2
  && clearanceMismatches.every(({ cell, state }) => (
    acceptedTransitionHoldKeys.has(cellKey(cell)) && state === CONTAINMENT
  )),
`accepted R09F transition hold drifted: ${JSON.stringify(clearanceMismatches)}`);
const barrierMismatches = barrierRecords.filter(({ state }) => (
  !FULL_SOLID_NAMES.has(stateName(state)) && !GRAVITY_NAMES.has(stateName(state))
));
invariant(barrierMismatches.length === 0,
`accepted fall barrier is not full-solid: ${JSON.stringify(barrierMismatches)}`);
invariant(lowerDeckRecords.every(({ state }) => state === CONTAINMENT),
'lower wet interface deck is not closed');
invariant(headhouseWallRecords.every(({ state }) => state === CONTAINMENT)
  && headhouseRoofRecords.every(({ state }) => state === CONTAINMENT),
'doorless exterior headhouse shell is not exact');
invariant(landingSeamRecords.filter(({ state }) => AIR_NAMES.has(stateName(state))).length === 4
  && landingSeamRecords.filter(({ state }) => (
    state === 'minecraft:smooth_stone_slab[type=bottom,waterlogged=false]'
  )).length === 1,
`five-cell R07J internal seam drifted: ${JSON.stringify(landingSeamRecords)}`);
invariant(await readState(interiorDeckContinuation) === CONTAINMENT,
'retained headhouse interior deck continuation drifted');

const halo = cubeHalo(fixtures);
const haloRecords = await records(halo);
const haloKeys = new Set(halo.map(cellKey));
const haloFluid = haloRecords.filter(({ state }) => stateName(state) === 'minecraft:water'
  || stateName(state) === 'minecraft:lava' || state.includes('waterlogged=true'));
const haloGravity = haloRecords.filter(({ state }) => GRAVITY_NAMES.has(stateName(state))
  || stateName(state).endsWith('_concrete_powder') || stateName(state).endsWith('_anvil'));
const haloMechanisms = haloRecords.filter(({ state }) => ACTIVE_MECHANISMS.has(stateName(state)));
const haloWoody = haloRecords.filter(({ state }) => [
  '_log', '_wood', '_leaves', '_stem', '_hyphae',
].some((suffix) => stateName(state).endsWith(suffix)));
const haloBounds = boundsOf(halo);
const blockEntities = [];
const savedEntities = [];
const touchedChunks = [];
for (let cx = Math.floor(haloBounds.minX / 16); cx <= Math.floor(haloBounds.maxX / 16); cx += 1) {
  for (let cz = Math.floor(haloBounds.minZ / 16); cz <= Math.floor(haloBounds.maxZ / 16); cz += 1) {
    touchedChunks.push({ x: cx, z: cz });
    const chunk = await reader.chunk(cx, cz);
    for (const blockEntity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      if (haloKeys.has(`${blockEntity.x},${blockEntity.y},${blockEntity.z}`)) blockEntities.push(blockEntity);
    }
    const entityChunk = await entityReader.chunk(cx, cz);
    for (const entity of entityChunk?.Entities ?? []) {
      if (savedEntityInside(entity, haloBounds)) savedEntities.push(entity);
    }
  }
}
const relicHits = relics.relics.filter((relic) => fixtures.some((cell) => (
  cell.x >= relic.declaredInclusiveBounds.minX && cell.x <= relic.declaredInclusiveBounds.maxX
  && cell.y >= relic.declaredInclusiveBounds.minY && cell.y <= relic.declaredInclusiveBounds.maxY
  && cell.z >= relic.declaredInclusiveBounds.minZ && cell.z <= relic.declaredInclusiveBounds.maxZ
)));
invariant(haloFluid.length === 0 && haloGravity.length === 0 && haloMechanisms.length === 0
  && haloWoody.length === 0 && blockEntities.length === 0 && savedEntities.length === 0
  && relicHits.length === 0,
'fixture halo intersects fluid, gravity, mechanism, woody, entity, block-entity, or relic hazard');

const priorPaths = fs.readdirSync(abs('data/buildops'))
  .filter((name) => name.startsWith('combined-zones-')
    && name.endsWith('.release-manifest.json') && !name.startsWith(BASENAME))
  .sort().map((name) => `data/buildops/${name}`);
const priorProof = [];
const reviewedTransactions = new Set([
  manifests.r02Manifest.transactionId,
  manifests.r09eManifest.transactionId,
  manifests.r09fManifest.transactionId,
]);
const allPriorHits = [];
const unreviewedPriorHits = [];
for (const filename of priorPaths) {
  const manifest = readJson(filename);
  const hits = uniqueCells((manifest.packages ?? []).flatMap(({ forward }) => (
    forward && fs.existsSync(abs(forward)) ? operationIntersection(forward, fixtures) : []
  )));
  allPriorHits.push(...hits);
  if (!reviewedTransactions.has(manifest.transactionId)) unreviewedPriorHits.push(...hits);
  priorProof.push({
    transactionId: manifest.transactionId,
    manifest: fileBinding(filename),
    targetIntersectionCount: hits.length,
  });
}
const manifestIntersection = (manifest) => uniqueCells(manifest.packages.flatMap(({ forward }) => (
  operationIntersection(forward, fixtures)
)));
const r02Hits = manifestIntersection(manifests.r02Manifest);
const r09eHits = manifestIntersection(manifests.r09eManifest);
const r09fHits = manifestIntersection(manifests.r09fManifest);
invariant(uniqueCells(allPriorHits).length === 8
  && r02Hits.length === 6 && r09eHits.length === 6 && r09fHits.length === 2
  && uniqueCells(unreviewedPriorHits).length === 0,
'prior-release ownership chain is not exact R02/R09E/R09F');
invariant(new Set(r02Hits.map(cellKey)).size === 6
  && r02Hits.every((cell) => r09eHits.some((candidate) => cellKey(candidate) === cellKey(cell)))
  && r09eHits.every((cell) => fixtureIndices.slice(0, 6).some((index) => (
    cellKey(stairs[index].inner) === cellKey(cell)
  ))) && r09fHits.every((cell) => fixtureIndices.slice(6).some((index) => (
    cellKey(stairs[index].inner) === cellKey(cell)
  ))), 'reviewed fixture predecessor partition drifted');

const forwardBody = `${fixtureRecords.map(({ cell, state }) => replLine(cell, state, LIGHT)).join('\n')}\n`;
const rollbackBody = `${fixtureRecords.slice().reverse()
  .map(({ cell, state }) => replLine(cell, LIGHT, state)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const forwardPath = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.forward.txt`);
const rollbackPath = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.rollback.txt`);
const header = (role, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID}/${PACKAGE_KEY} (${role})`,
  `# source root: ${SNAPSHOT}`,
  `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
  `# target coordinate-set SHA-256: ${hashCells(fixtures)}`,
  `# operation SHA-256: ${operationSha256}`,
  '',
].join('\n');
fs.mkdirSync(abs(OUT_DIR), { recursive: true });
fs.writeFileSync(abs(forwardPath), `${header('forward', forwardSha256)}${forwardBody}`);
fs.writeFileSync(abs(rollbackPath), `${header('rollback', rollbackSha256)}${rollbackBody}`);

const entityReport = {
  schemaVersion: 1,
  id: 'combined-zones-r09g-b07-upper-route-passive-wayfinding-immutable-entity-clearance',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS',
  snapshotRoot: rel(SNAPSHOT),
  reviewBounds: haloBounds,
  targetCellCount: fixtures.length,
  interactionHaloCellCount: halo.length,
  touchedChunks,
  blockEntityIntersectionCount: blockEntities.length,
  savedEntityIntersectionCount: savedEntities.length,
  liveEntityClearanceStillRequiredByWrapper: true,
  liveCallPerformed: false,
};
fs.mkdirSync(path.dirname(abs(ENTITY_REPORT)), { recursive: true });
fs.writeFileSync(abs(ENTITY_REPORT), `${JSON.stringify(entityReport, null, 2)}\n`);

const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const payload = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_R09F_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['Z06-PUBLIC-SHAFT-FITOUT', 'P1-B07-UPPER-ROUTE-PASSIVE-WAYFINDING'],
  packages: [{ key: PACKAGE_KEY, forward: rel(forwardPath), rollback: rel(rollbackPath) }],
  executionOrder: {
    forward: [PACKAGE_KEY],
    rollback: [PACKAGE_KEY],
    rationale: 'One static full-cube wall-fixture package; exact reverse rollback restores the R09E/R09F core fabric without opening any route boundary.',
  },
  scope: {
    releaseId: RELEASE_ID,
    releaseNodeId: RELEASE_NODE_ID,
    canonicalOwner: 'Z06-PUBLIC-SHAFT-FITOUT',
    material: LIGHT,
    purpose: 'Add source-proven passive visual wayfinding to the accepted dry enclosed B07 upper-stair construction without changing its exact clearance state, collision, exterior enclosure, or the lower wet hold.',
    geometry: {
      acceptedOrderedUpperStairConstruction: {
        ...classManifest(route),
        orderedStepCount: stairs.length,
        lowestSurfaceY2: stairs[0].surfaceY2,
        highestSurfaceY2: stairs.at(-1).surfaceY2,
        cardinallyHalfStepContiguous: true,
      },
      preservedRouteHeadClearance: {
        ...classManifest(clearance),
        exactAirCellCount: clearance.length - clearanceMismatches.length,
        retainedR09fTransitionHoldCellCount: clearanceMismatches.length,
        retainedR09fTransitionHold: classManifest(clearanceMismatches.map(({ cell }) => cell)),
      },
      retainedOuterFallBarrier: classManifest(barriers),
      passiveCoreFaceFixtures: classManifest(fixtures),
      retainedLowerWetContainmentDeck: classManifest(lowerDeck),
      retainedDoorlessHeadhouseWalls: classManifest(headhouseWalls),
      retainedHeadhouseRoof: classManifest(headhouseRoof),
      retainedFiveCellR07jInternalSeam: classManifest(landingSeam),
    },
    fixtureCadence: {
      routeIndices: fixtureIndices,
      regularSixteenIndexCadence: periodicFixtureIndices,
      terminalSupplementIndex,
      firstRouteIndex: 0,
      lastRouteIndex: 110,
      maximumRouteIndexDistanceToFixture,
      maximumFixtureSpacingInIndices: 16,
      eachFixtureFacesExactClearanceCell: true,
      photometricEmergencyOrLifeSafetyLightingClaimed: false,
    },
    fixtureAssociations,
    ownership: {
      canonicalB07ConstructionCellCount: b07.construction.length,
      canonicalB07ConstructionSha256: EXPECTED.b07ConstructionSha256,
      canonicalB07InteractionCellCount: b07.interaction.length,
      canonicalB07InteractionSha256: EXPECTED.b07InteractionSha256,
      targetConstructionCellCount: fixtures.length,
      targetOutsideInteractionCellCount: 0,
      reviewedMigration: {
        r02ExcavationToR09eCoreCellCount: r02Hits.length,
        r09eCoreToPassiveFixtureCellCount: r09eHits.length,
        r09fCoreToPassiveFixtureCellCount: r09fHits.length,
        unreviewedPriorTargetIntersectionCount: uniqueCells(unreviewedPriorHits).length,
      },
    },
    operationalBoundary: {
      routeOrHeadroomChanged: false,
      outerBarrierChanged: false,
      lowerWetContainmentDeckChanged: false,
      lowerWetInterfaceOpened: false,
      r07jExteriorWallRoofOrDoorChanged: false,
      exteriorOpeningCreated: false,
      activeMechanismInstalled: false,
      powerControlsSmokeDrainageLiftTouched: false,
      photometricEmergencyOrLifeSafetyLightingCommissioned: false,
      publicRouteCommissioned: false,
      fireServiceRouteCommissioned: false,
      r09fTwoCellTransitionClearanceConflictResolved: false,
    },
  },
  source: {
    snapshotRoot: rel(SNAPSHOT),
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    regionSnapshotSha256: sourceIdentity.sha256,
    intakeAudit: fileBinding(INTAKE),
    predecessor: {
      transactionId: ledger.transactionId,
      executionLedger: fileBinding(SOURCE_LEDGER),
      completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
      postQa: fileBinding(SOURCE_QA),
      postQaPayloadSha256: sourceQa.qaPayloadSha256,
    },
    sourceStateCensus: stateCensus(fixtureRecords),
    immutableEntityClearance: fileBinding(ENTITY_REPORT),
  },
  target: {
    operatedUnion: classManifest(fixtures),
    desiredStateCensus: { [LIGHT]: fixtures.length },
  },
  operations: {
    [PACKAGE_KEY]: {
      forwardSha256,
      rollbackSha256,
      forwardCommandCount: fixtures.length,
      rollbackCommandCount: fixtures.length,
      targetCellCount: fixtures.length,
      targetCoordinateSetSha256: hashCells(fixtures),
      sourceStateCensus: stateCensus(fixtureRecords),
      desiredStateCensus: { [LIGHT]: fixtures.length },
      exactInverse: true,
      reverseOrderInverse: true,
      oneCellGuards: true,
    },
  },
  preservation: {
    acceptedPriorReleaseTargetProof: priorProof,
    exactR02ExcavationPredecessors: classManifest(r02Hits),
    exactR09eCorePredecessors: classManifest(r09eHits),
    exactR09fCorePredecessors: classManifest(r09fHits),
    undeclaredPriorReleaseIntersectionCount: uniqueCells(unreviewedPriorHits).length,
    retainedOrderedRoute: {
      ...classManifest(route),
      sourceStateCensus: stateCensus(routeRecords),
    },
    retainedHeadClearance: {
      ...classManifest(clearance),
      sourceStateCensus: stateCensus(clearanceRecords),
      retainedR09fTransitionHold: classManifest(clearanceMismatches.map(({ cell }) => cell)),
    },
    retainedOuterBarrier: {
      ...classManifest(barriers),
      sourceStateCensus: stateCensus(barrierRecords),
    },
    retainedLowerWetContainmentDeck: classManifest(lowerDeck),
    retainedDoorlessHeadhouseShell: classManifest([...headhouseWalls, ...headhouseRoof]),
    retainedFiveCellR07jInternalSeam: classManifest(landingSeam),
    retainedInteriorDeckContinuation: {
      cell: interiorDeckContinuation,
      state: CONTAINMENT,
    },
  },
  safetyAudit: {
    halo: { ...classManifest(halo), sourceStateCensus: stateCensus(haloRecords) },
    targetFluidCount: 0,
    haloFluidCount: haloFluid.length,
    haloGravityCount: haloGravity.length,
    haloActiveMechanismCount: haloMechanisms.length,
    haloWoodyCount: haloWoody.length,
    haloBlockEntityCount: blockEntities.length,
    haloSavedEntityCount: savedEntities.length,
    haloProtectedRelicCount: relicHits.length,
    targetMaterialFullCubeNonGravityNonBlockEntity: true,
    routeClearancePreserved: true,
    coreCollisionAndEnclosureContinuityPreserved: true,
    existingTwoCellR09fTransitionClearanceConflictPreservedNotResolved: true,
  },
  standingAuthorization: {
    ...fileBinding(INPUTS.authorization),
    authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    releaseNodeAuthorized: true,
  },
  upstreamIdentities: Object.fromEntries(Object.entries(INPUTS)
    .filter(([key]) => key !== 'currentState')
    .map(([key, filename]) => [key, fileBinding(filename)])),
  hardSafetyKernelNext: [
    'fresh complete source and exact preflight',
    'fresh live entity clearance',
    'strict parser checks',
    'journaled strict execution',
    'fresh post and rollback preflight',
    'independent fixture, route, enclosure, boundary, and no-drift QA',
  ],
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
    lowerWetInterfaceOpened: false,
    exteriorOpeningCreated: false,
    activeLightingOrPublicRouteCommissioned: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(payload));
fs.writeFileSync(abs(manifestPath), `${JSON.stringify({ ...payload, manifestIdentity }, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  status: payload.status,
  manifest: rel(manifestPath),
  manifestIdentity,
  targets: fixtures.length,
  fixtureIndices,
  routeCells: route.length,
  clearanceCells: clearance.length,
  barrierCells: barriers.length,
  maximumRouteIndexDistanceToFixture,
  liveCallsPerformed: false,
}, null, 2)}\n`);
