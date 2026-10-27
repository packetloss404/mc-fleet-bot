#!/usr/bin/env node
/**
 * Compile CZ-R09E: bounded dry upper B07 stair construction.
 *
 * Geometry is a strict parameterization of the accepted 7x7 B07 upperVertical
 * primitive and the already accepted R09B/R09C/R09D stair, outer-containment,
 * cap, and crown rules. The work remains isolated above the R06 wet class and
 * below the R07J surface architecture. It does not open or commission either
 * end of the upper shaft.
 */

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
const GENERATED_AT = value('--generated-at', '2026-08-22T01:18:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r08ab-post-20260822T005922Z',
);
const INTAKE_AUDIT = value(
  '--intake-audit',
  'data/world-review/combined-zones-r08ab-live-20260822T005922Z/post-complete-save-intake.json',
);
const SOURCE_LEDGER = value(
  '--source-ledger',
  'data/world-review/combined-zones-r08ab-live-20260822T005922Z/evidence-ledger.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'combined-zones-r09e-b07-dry-upper-stair');
const ENTITY_REPORT = value(
  '--entity-report',
  'data/world-review/combined-zones-r09e-b07-dry-upper-stair-offline-20260822T011800Z/immutable-entity-clearance.json',
);

const RELEASE_NODE_ID = 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT';
const DECK_PACKAGE = 'b07-upper-dry-lower-containment-deck';
const STAIR_PACKAGE = 'b07-upper-dry-stair-framework';
const AIR = 'minecraft:air';
const CORE = 'minecraft:polished_andesite';
const CONTAINMENT = 'minecraft:polished_diorite';
const AIR_NAMES = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const GRAVITY_NAMES = new Set(['minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand']);
const FULL_SOLID_NAMES = new Set([
  'minecraft:stone', 'minecraft:dirt', 'minecraft:grass_block',
  'minecraft:granite', 'minecraft:diorite', 'minecraft:andesite',
  'minecraft:deepslate', 'minecraft:tuff', 'minecraft:copper_ore',
  'minecraft:iron_ore', 'minecraft:coal_ore', 'minecraft:gravel',
  'minecraft:sand', 'minecraft:red_sand', CORE, CONTAINMENT,
]);

const INPUTS = Object.freeze({
  mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  protectedRelics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  standingAuthorization: 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  releaseContract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
  r02Manifest: 'data/buildops/combined-zones-r02-d06-shell.release-manifest.json',
  r03Manifest: 'data/buildops/combined-zones-r03-tunnels-v2.release-manifest.json',
  r06Manifest: 'data/buildops/combined-zones-r06-support-liner.release-manifest.json',
  r07jManifest: 'data/buildops/combined-zones-r07j-b07-supported-surface-headhouse.release-manifest.json',
  r09aManifest: 'data/buildops/combined-zones-r09-b07-lower-lobby-floor.release-manifest.json',
  r09bManifest: 'data/buildops/combined-zones-r09b-b07-lower-spiral-stair.release-manifest.json',
  r09cManifest: 'data/buildops/combined-zones-r09c-b07-stair-safety-completion.release-manifest.json',
  r09dManifest: 'data/buildops/combined-zones-r09d-b07-terminal-crown.release-manifest.json',
});

const EXPECTED = Object.freeze({
  sourceCompleteSaveSha256: 'f9612be6c862f1693ce9c7be60e3fcc5eeb5e7a305d5ca62632d10b22bb606cb',
  sourceRegionSha256: '4d0fc4568f8cded612e3d552520cc640056ad8c9a962379746e3069f8fe6bf7a',
  sourceLedgerSha256: 'e3922e7bc56e03d113a4c383b9561a2376b97e8c3fdb61f6cd012e41e43d173e',
  sourceCompletedReleaseIdentity: '478d681e6df3255cf3f28742a8a00220b668754f9747777c4eab617a9d13c6e3',
  b07ConstructionCount: 8134,
  b07ConstructionSha256: 'd58f20c6ad6581487e2a6ba72754d40ce22d49981da7450b44ad5e37325e5e59',
  b07InteractionCount: 13608,
  b07InteractionSha256: 'dd2cc387b0e5f6517ec48176c820e05f5fef5ff9793c74d32d4a5262582e5a8d',
  deckCount: 49,
  coreCount: 1075,
  stairCount: 88,
  capCount: 2,
  crownCount: 16,
  outerGapCount: 2,
  frameworkCount: 1183,
  totalCount: 1232,
});

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R09E B07 dry upper-stair compiler rejected: ${message}`);
};
const stateName = (state) => state.split('[', 1)[0];
const insideBounds = (cell, bounds) => (
  cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY
  && cell.z >= bounds.minZ && cell.z <= bounds.maxZ
);
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const intersection = (left, right) => {
  const included = new Set(right.map(cellKey));
  return uniqueCells(left.filter((cell) => included.has(cellKey(cell))));
};
const stateCensus = (records, field = 'state') => {
  const counts = new Map();
  for (const record of records) counts.set(record[field], (counts.get(record[field]) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
};
const savedEntityInside = (entity, bounds) => {
  if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) return false;
  const [x, y, z] = entity.Pos.map(Number);
  return x >= bounds.minX && x < bounds.maxX + 1
    && y >= bounds.minY && y < bounds.maxY + 1
    && z >= bounds.minZ && z < bounds.maxZ + 1;
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

function expandOperations(filename) {
  const records = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains a malformed operation`);
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
const manifestRecords = (manifest) => manifest.packages.flatMap(({ forward }) => expandOperations(forward));

const mechanisms = readJson(INPUTS.mechanisms);
const protectedRelics = readJson(INPUTS.protectedRelics);
const authorization = readJson(INPUTS.standingAuthorization);
const releaseContract = readJson(INPUTS.releaseContract);
const manifests = Object.fromEntries(Object.entries(INPUTS)
  .filter(([key]) => key.endsWith('Manifest'))
  .map(([key, filename]) => [key, readJson(filename)]));
const intake = readJson(INTAKE_AUDIT);
const sourceLedger = readJson(SOURCE_LEDGER);
const sourceLedgerSha256 = sha256(fs.readFileSync(absolute(SOURCE_LEDGER)));

invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true
  && intake.packageIdentity.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && absolute(intake.input?.suppliedWorldRoot) === absolute(SNAPSHOT),
'source intake is not the accepted complete immutable R08AB post');
invariant(sourceLedgerSha256 === EXPECTED.sourceLedgerSha256
  && sourceLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && sourceLedger.completedReleaseIdentitySha256 === EXPECTED.sourceCompletedReleaseIdentity
  && absolute(sourceLedger.postSnapshot?.root) === absolute(SNAPSHOT),
'source ledger is not the accepted R08AB terminal post');
for (const member of ['region', 'entities', 'poi']) {
  invariant(fs.existsSync(absolute(path.join(SNAPSHOT, member))), `source snapshot is missing ${member}`);
}
invariant(fs.existsSync(absolute(path.join(SNAPSHOT, 'level.dat'))), 'source snapshot is missing level.dat');
const sourceIdentityPath = path.join(path.dirname(INTAKE_AUDIT), 'post-snapshot-identity.json');
const sourceIdentity = readJson(sourceIdentityPath);
invariant(sourceIdentity.sha256 === EXPECTED.sourceRegionSha256
  && absolute(sourceIdentity.directory) === absolute(path.join(SNAPSHOT, 'region')),
'source region identity drifted');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID),
'standing authorization does not cover R09');
const r09Node = releaseContract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID);
invariant(r09Node?.canonicalOwners?.includes('Z06-PUBLIC-SHAFT-FITOUT'),
'release contract does not bind the public-shaft fit-out owner');

const b07System = mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem;
const b07 = deriveB07WestTwo(b07System);
invariant(b07.construction.length === EXPECTED.b07ConstructionCount
  && hashCells(b07.construction, D06_CELL_PREAMBLE) === EXPECTED.b07ConstructionSha256
  && b07.interaction.length === EXPECTED.b07InteractionCount
  && hashCells(b07.interaction, D06_CELL_PREAMBLE) === EXPECTED.b07InteractionSha256,
'canonical B07 construction/interaction identity drifted');
const constructionKeys = new Set(b07.construction.map(cellKey));
const interactionKeys = new Set(b07.interaction.map(cellKey));
const upperPrimitive = b07System.primitives?.upperVertical ?? {
  bounds: { minX: 2105, maxX: 2111, minY: 8, maxY: 72, minZ: -401, maxZ: -395 },
};
invariant(JSON.stringify(upperPrimitive.bounds) === JSON.stringify({
  minX: 2105, maxX: 2111, minY: 8, maxY: 72, minZ: -401, maxZ: -395,
}), 'accepted upperVertical primitive bounds drifted');

const deck = cellsIn({
  minX: upperPrimitive.bounds.minX, maxX: upperPrimitive.bounds.maxX,
  minY: 18, maxY: 18,
  minZ: upperPrimitive.bounds.minZ, maxZ: upperPrimitive.bounds.maxZ,
});
const core = cellsIn({ minX: 2106, maxX: 2110, minY: 19, maxY: 61, minZ: -400, maxZ: -396 });
const ring = [];
for (let x = 2105; x <= 2111; x += 1) ring.push({ x, z: -401, ox: x, oz: -402 });
for (let z = -400; z <= -395; z += 1) ring.push({ x: 2111, z, ox: 2112, oz: z });
for (let x = 2110; x >= 2105; x -= 1) ring.push({ x, z: -395, ox: x, oz: -394 });
for (let z = -396; z >= -400; z -= 1) ring.push({ x: 2105, z, ox: 2104, oz: z });
invariant(ring.length === 24 && new Set(ring.map(({ x, z }) => `${x},${z}`)).size === 24,
'upperVertical perimeter ring is not the exact 24-cell boundary');
const stairs = [];
for (let index = 0; index < 84; index += 1) {
  const point = ring[index % ring.length];
  const y = 19 + Math.floor(index / 2);
  stairs.push({
    index,
    cell: { x: point.x, y, z: point.z },
    outer: { x: point.ox, y, z: point.oz },
    surfaceY2: (2 * y) + (index % 2 === 0 ? 1 : 2),
    targetState: index % 2 === 0
      ? 'minecraft:smooth_stone_slab[type=bottom,waterlogged=false]'
      : 'minecraft:smooth_stone_slab[type=top,waterlogged=false]',
    role: 'ascending-helix',
  });
}
for (let offset = 0; offset < 4; offset += 1) {
  const index = 84 + offset;
  const point = ring[index % ring.length];
  stairs.push({
    index,
    cell: { x: point.x, y: 60, z: point.z },
    outer: { x: point.ox, y: 60, z: point.oz },
    surfaceY2: 122,
    targetState: 'minecraft:smooth_stone_slab[type=top,waterlogged=false]',
    role: 'upper-retained-landing',
  });
}
for (let index = 1; index < stairs.length; index += 1) {
  const prior = stairs[index - 1];
  const current = stairs[index];
  invariant(Math.abs(prior.cell.x - current.cell.x) + Math.abs(prior.cell.z - current.cell.z) === 1,
    `upper stair is not cardinally contiguous at index ${index}`);
  invariant(current.surfaceY2 >= prior.surfaceY2 && current.surfaceY2 - prior.surfaceY2 <= 1,
    `upper stair rise exceeds one half block at index ${index}`);
}
const capPoint = ring[16];
const cap = [
  { x: capPoint.x, y: 60, z: capPoint.z },
  { x: capPoint.x, y: 61, z: capPoint.z },
];
const crown = [];
for (let x = 2106; x <= 2110; x += 1) {
  for (let z = -400; z <= -396; z += 1) {
    if (x === 2106 || x === 2110 || z === -400 || z === -396) crown.push({ x, y: 62, z });
  }
}
const requiredOuterBarrier = uniqueCells(stairs.flatMap(({ outer }) => [
  { x: outer.x, y: outer.y + 1, z: outer.z },
  { x: outer.x, y: outer.y + 2, z: outer.z },
]));

invariant(deck.length === EXPECTED.deckCount && core.length === EXPECTED.coreCount
  && stairs.length === EXPECTED.stairCount && cap.length === EXPECTED.capCount
  && crown.length === EXPECTED.crownCount && requiredOuterBarrier.length === 176,
'derived upper-stair geometry count drifted');
const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const outerBarrierRecords = [];
for (const cell of requiredOuterBarrier) {
  const state = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  outerBarrierRecords.push({ cell, state });
}
const outerGapRecords = outerBarrierRecords.filter(({ state }) => AIR_NAMES.has(stateName(state)));
const retainedOuterBarrier = outerBarrierRecords.filter(({ state }) => !AIR_NAMES.has(stateName(state)));
invariant(outerGapRecords.length === EXPECTED.outerGapCount
  && retainedOuterBarrier.every(({ state }) => FULL_SOLID_NAMES.has(stateName(state))),
'outer barrier has an unexpected gap or non-collision state');

const deckDesired = deck.map((cell) => ({ cell, targetState: CONTAINMENT, role: 'dry-lower-containment-deck' }));
const frameworkDesired = [
  ...core.map((cell) => ({ cell, targetState: CORE, role: 'static-core' })),
  ...stairs.map(({ cell, targetState, role }) => ({ cell, targetState, role })),
  ...cap.map((cell) => ({ cell, targetState: CONTAINMENT, role: 'upper-retained-cap' })),
  ...crown.map((cell) => ({ cell, targetState: CORE, role: 'upper-core-crown' })),
  ...outerGapRecords.map(({ cell }) => ({ cell, targetState: CONTAINMENT, role: 'outer-containment-gap' })),
];
const allDesired = [...deckDesired, ...frameworkDesired];
const targetCells = allDesired.map(({ cell }) => cell);
const targetKeys = new Set(targetCells.map(cellKey));
invariant(frameworkDesired.length === EXPECTED.frameworkCount
  && targetCells.length === EXPECTED.totalCount
  && targetKeys.size === EXPECTED.totalCount,
'upper-stair packages are not an exact disjoint 1,232-cell union');
invariant(targetCells.every((cell) => interactionKeys.has(cellKey(cell))),
'a target leaves the canonical B07 interaction domain');
const constructionTargets = targetCells.filter((cell) => constructionKeys.has(cellKey(cell)));
const interactionOnlyTargets = targetCells.filter((cell) => (
  interactionKeys.has(cellKey(cell)) && !constructionKeys.has(cellKey(cell))
));
invariant(constructionTargets.length === 1230 && interactionOnlyTargets.length === 2,
'B07 ownership partition drifted');

const transitions = [];
for (const desired of allDesired) {
  const sourceState = stateToCommandString(
    await reader.blockState(desired.cell.x, desired.cell.y, desired.cell.z),
  );
  invariant(sourceState === AIR, `target source drift at ${cellKey(desired.cell)}: ${sourceState}`);
  transitions.push({ ...desired, sourceState });
}
const deckTransitions = transitions.slice(0, deckDesired.length);
const frameworkTransitions = transitions.slice(deckDesired.length);
const stairClearance = uniqueCells(stairs.flatMap(({ cell }) => [
  { x: cell.x, y: cell.y + 1, z: cell.z },
  { x: cell.x, y: cell.y + 2, z: cell.z },
]));
invariant(intersection(targetCells, stairClearance).length === 0,
'targets intersect upper stair head clearance');
for (const cell of stairClearance) {
  const state = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  invariant(AIR_NAMES.has(stateName(state)), `upper stair headroom drift at ${cellKey(cell)}: ${state}`);
}

const projectedOuterState = new Map(outerBarrierRecords.map(({ cell, state }) => [cellKey(cell), state]));
for (const { cell } of outerGapRecords) projectedOuterState.set(cellKey(cell), CONTAINMENT);
const containmentFailures = [];
for (const stair of stairs) {
  const lower = { x: stair.outer.x, y: stair.outer.y + 1, z: stair.outer.z };
  const upper = { x: stair.outer.x, y: stair.outer.y + 2, z: stair.outer.z };
  const lowerSolid = FULL_SOLID_NAMES.has(stateName(projectedOuterState.get(cellKey(lower)) ?? AIR));
  const upperSolid = FULL_SOLID_NAMES.has(stateName(projectedOuterState.get(cellKey(upper)) ?? AIR));
  const availableHeight = upper.y - (stair.surfaceY2 / 2);
  if (!((lowerSolid && upperSolid) || (!lowerSolid && upperSolid && availableHeight < 1.8))) {
    containmentFailures.push({ stairIndex: stair.index, lower, upper, availableHeight });
  }
}
invariant(containmentFailures.length === 0, 'projected upper stair leaves an outer fall opening');

const halo = cubeHalo(targetCells);
const haloFluids = [];
const haloGravity = [];
for (const cell of halo) {
  const state = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  const name = stateName(state);
  if (name === 'minecraft:water' || name === 'minecraft:lava' || state.includes('waterlogged=true')) {
    haloFluids.push({ cell, state });
  }
  if (GRAVITY_NAMES.has(name) || name.endsWith('_concrete_powder')) haloGravity.push({ cell, state });
}
invariant(haloFluids.length === 0, 'upper dry stair halo contains fluid');
invariant(haloGravity.every(({ cell }) => !targetKeys.has(cellKey(cell))),
'upper dry stair targets intersect gravity');
const unstableGravity = [];
for (const record of haloGravity) {
  const support = { x: record.cell.x, y: record.cell.y - 1, z: record.cell.z };
  const supportState = stateToCommandString(await reader.blockState(support.x, support.y, support.z));
  if (AIR_NAMES.has(stateName(supportState))) unstableGravity.push({ ...record, support, supportState });
}
const targetsFaceAdjacentToUnstableGravity = targetCells.filter((target) => (
  unstableGravity.some(({ cell }) => (
    Math.abs(cell.x - target.x) + Math.abs(cell.y - target.y) + Math.abs(cell.z - target.z) === 1
  ))
));
invariant(unstableGravity.length === 1
  && cellKey(unstableGravity[0].cell) === '2104,27,-396'
  && unstableGravity[0].state === 'minecraft:gravel'
  && cellKey(unstableGravity[0].support) === '2104,26,-396'
  && AIR_NAMES.has(stateName(unstableGravity[0].supportState))
  && targetsFaceAdjacentToUnstableGravity.length === 0,
'upper stair does not preserve the exact isolated source-floating gravel exception');

const haloBounds = boundsOf(halo);
const blockEntities = [];
const savedEntities = [];
const touchedChunks = [];
for (let cx = Math.floor(haloBounds.minX / 16); cx <= Math.floor(haloBounds.maxX / 16); cx += 1) {
  for (let cz = Math.floor(haloBounds.minZ / 16); cz <= Math.floor(haloBounds.maxZ / 16); cz += 1) {
    touchedChunks.push({ x: cx, z: cz });
    const chunk = await reader.chunk(cx, cz);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (insideBounds(point, haloBounds)) blockEntities.push({ id: entity.id ?? null, point });
    }
    const entityChunk = await entityReader.chunk(cx, cz);
    for (const entity of entityChunk?.Entities ?? []) {
      if (savedEntityInside(entity, haloBounds)) {
        savedEntities.push({ id: entity.id ?? null, position: entity.Pos.slice(0, 3) });
      }
    }
  }
}
invariant(blockEntities.length === 0 && savedEntities.length === 0,
'upper stair halo intersects a block entity or saved entity');
const protectedIntersections = protectedRelics.relics.filter((relic) => (
  targetCells.some((cell) => insideBounds(cell, relic.declaredInclusiveBounds))
));
invariant(protectedIntersections.length === 0, 'upper stair intersects a protected relic');

const priorRecords = Object.fromEntries(Object.entries(manifests).map(([key, manifest]) => (
  [key, manifestRecords(manifest)]
)));
const overlapFor = (key) => intersection(targetCells, priorRecords[key].map(({ cell }) => cell));
const priorOverlaps = {
  r02ExcavationAir: overlapFor('r02Manifest'),
  r03ExcavationAir: overlapFor('r03Manifest'),
  r06Treatment: overlapFor('r06Manifest'),
  r07jSurfaceArchitecture: overlapFor('r07jManifest'),
  r09aLowerFloor: overlapFor('r09aManifest'),
  r09bLowerStair: overlapFor('r09bManifest'),
  r09cLowerContainment: overlapFor('r09cManifest'),
  r09dLowerCrown: overlapFor('r09dManifest'),
};
invariant(priorOverlaps.r06Treatment.length === 0
  && priorOverlaps.r07jSurfaceArchitecture.length === 0
  && priorOverlaps.r09aLowerFloor.length === 0
  && priorOverlaps.r09bLowerStair.length === 0
  && priorOverlaps.r09cLowerContainment.length === 0
  && priorOverlaps.r09dLowerCrown.length === 0,
'upper stair intersects a prior material release');
const invalidR03Overlap = priorRecords.r03Manifest.filter(({ cell, targetState }) => (
  targetKeys.has(cellKey(cell)) && !AIR_NAMES.has(stateName(targetState))
));
const invalidR02Overlap = priorRecords.r02Manifest.filter(({ cell, targetState }) => (
  targetKeys.has(cellKey(cell)) && !AIR_NAMES.has(stateName(targetState))
));
invariant(invalidR02Overlap.length === 0 && invalidR03Overlap.length === 0,
'upper stair intersects a non-air R02/R03 target rather than accepted excavation void');

function operationArtifacts(packageKey, packageTransitions) {
  const forwardBody = `${packageTransitions.map(({ cell, sourceState, targetState }) => (
    replLine(cell, sourceState, targetState)
  )).join('\n')}\n`;
  const rollbackBody = `${packageTransitions.slice().reverse().map(({ cell, sourceState, targetState }) => (
    replLine(cell, targetState, sourceState)
  )).join('\n')}\n`;
  const forwardSha256 = sha256(forwardBody);
  const rollbackSha256 = sha256(rollbackBody);
  const forward = path.join(OUT_DIR, `${BASENAME}.${packageKey}.forward.txt`);
  const rollback = path.join(OUT_DIR, `${BASENAME}.${packageKey}.rollback.txt`);
  const targetSetSha256 = hashCells(packageTransitions.map(({ cell }) => cell));
  const header = (role, operationSha256) => [
    `# GENERATED FILE - CZ-R09E B07 dry upper stair ${packageKey} (${role})`,
    `# source root: ${SNAPSHOT}`,
    `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
    `# target coordinate-set SHA-256: ${targetSetSha256}`,
    `# operation SHA-256: ${operationSha256}`,
    '',
  ].join('\n');
  fs.writeFileSync(absolute(forward), `${header('forward', forwardSha256)}${forwardBody}`);
  fs.writeFileSync(absolute(rollback), `${header('rollback', rollbackSha256)}${rollbackBody}`);
  return {
    package: { key: packageKey, forward, rollback },
    operation: {
      forwardSha256,
      rollbackSha256,
      forwardCommandCount: packageTransitions.length,
      rollbackCommandCount: packageTransitions.length,
      targetCellCount: packageTransitions.length,
      targetCoordinateSetSha256: targetSetSha256,
      exactInverse: true,
      reverseOrderInverse: true,
      oneCellGuards: true,
    },
  };
}

fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
const deckArtifact = operationArtifacts(DECK_PACKAGE, deckTransitions);
const stairArtifact = operationArtifacts(STAIR_PACKAGE, frameworkTransitions);
const packages = [deckArtifact.package, stairArtifact.package];
const operations = {
  [DECK_PACKAGE]: deckArtifact.operation,
  [STAIR_PACKAGE]: stairArtifact.operation,
};

const entityReport = {
  schemaVersion: 1,
  id: 'combined-zones-r09e-b07-dry-upper-stair-immutable-entity-clearance',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS',
  snapshotRoot: SNAPSHOT,
  reviewBounds: haloBounds,
  targetCellCount: targetCells.length,
  interactionHaloCellCount: halo.length,
  touchedChunks,
  blockEntityIntersectionCount: blockEntities.length,
  savedEntityIntersectionCount: savedEntities.length,
  blockEntities,
  savedEntities,
  liveEntityClearanceStillRequiredByWrapper: true,
  liveCallPerformed: false,
};
fs.mkdirSync(path.dirname(absolute(ENTITY_REPORT)), { recursive: true });
fs.writeFileSync(absolute(ENTITY_REPORT), `${JSON.stringify(entityReport, null, 2)}\n`);

const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_R08AB_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['Z06-PUBLIC-SHAFT-FITOUT'],
  packages,
  executionOrder: {
    forward: [DECK_PACKAGE, STAIR_PACKAGE],
    rollback: [STAIR_PACKAGE, DECK_PACKAGE],
    rationale: 'Close the dry lower interface first, then install the contained upper framework. Rollback removes the framework before reopening only the exact source-air deck plane.',
  },
  scope: {
    releaseId: 'CZ-R09E-P1-B07-DRY-UPPER-STAIR-CONSTRUCTION',
    releaseNodeId: RELEASE_NODE_ID,
    canonicalOwner: 'Z06-PUBLIC-SHAFT-FITOUT',
    purpose: 'Install a dry, internally contained upper-shaft stair construction between preserved closed termini without opening or commissioning either interface.',
    geometry: {
      acceptedUpperVerticalPrimitive: {
        ...upperPrimitive,
        source: 'phase1-d06-life-safety-alternatives B07-C-WEST-2',
      },
      lowerContainmentDeck: classManifest(deck),
      staticCore: classManifest(core),
      orderedStairAndLanding: {
        ...classManifest(stairs.map(({ cell }) => cell)),
        orderedStepCount: stairs.length,
        lowestSurfaceY2: stairs[0].surfaceY2,
        highestSurfaceY2: stairs.at(-1).surfaceY2,
        maximumRiseHalfBlocks: 1,
        cardinallyContiguous: true,
      },
      upperRetainedCap: classManifest(cap),
      upperCoreCrown: classManifest(crown),
      requiredOuterBarrier: {
        ...classManifest(requiredOuterBarrier),
        retainedFullSolidCellCount: retainedOuterBarrier.length,
        operatedAirGapCellCount: outerGapRecords.length,
        projectedContainmentFailureCount: containmentFailures.length,
      },
      preservedStairClearance: classManifest(stairClearance),
      operatedUnion: classManifest(targetCells),
      interactionHalo: classManifest(halo),
    },
    ownership: {
      canonicalB07ConstructionCellCount: b07.construction.length,
      canonicalB07ConstructionSha256: hashCells(b07.construction, D06_CELL_PREAMBLE),
      canonicalB07InteractionCellCount: b07.interaction.length,
      canonicalB07InteractionSha256: hashCells(b07.interaction, D06_CELL_PREAMBLE),
      targetConstructionCellCount: constructionTargets.length,
      targetInteractionOnlyCellCount: interactionOnlyTargets.length,
      targetOutsideInteractionCellCount: 0,
    },
    sourcePartition: {
      sourceStateCensus: stateCensus(transitions, 'sourceState'),
      desiredStateCensus: stateCensus(transitions, 'targetState'),
      exactPartition: true,
    },
    materialDoctrine: {
      lowerContainmentDeck: CONTAINMENT,
      staticCoreAndCrown: CORE,
      stair: 'minecraft:smooth_stone_slab',
      capAndOuterGapClosure: CONTAINMENT,
      rationale: 'Reuse the accepted R09A-R09D non-reactive public-core material set and exact stair/cap/crown logic.',
    },
    operationalBoundary: {
      lowerWetClassMaximumY: 17,
      lowestTargetY: 18,
      lowerDrySeparationBlocks: 1,
      r07jLowestTargetY: 63,
      highestTargetY: 62,
      upperDrySeparationBlocks: 1,
      lowerInterfaceClosed: true,
      upperInterfaceClosed: true,
      exteriorOpeningCreated: false,
      routeBeyondR09DHoldCommissioned: false,
      upperStairCommissioned: false,
      liftMechanismSmokePowerDrainageTouched: false,
      r06WetTreatmentTouched: false,
      r07jSurfaceArchitectureTouched: false,
      r09aThroughR09dTouched: false,
      futureOpeningDeferred: true,
    },
  },
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    regionSnapshotSha256: sourceIdentity.sha256,
    intakeAuditPath: INTAKE_AUDIT,
    sourceLedgerPath: SOURCE_LEDGER,
    sourceLedgerSha256,
    sourceLedgerCompletedReleaseIdentitySha256: sourceLedger.completedReleaseIdentitySha256,
    immutableEntityClearancePath: ENTITY_REPORT,
    touchedChunkCount: touchedChunks.length,
  },
  target: {
    operatedCellCount: targetCells.length,
    operatedCoordinateSetSha256: hashCells(targetCells),
    sourceStateCensus: stateCensus(transitions, 'sourceState'),
    desiredStateCensus: stateCensus(transitions, 'targetState'),
    packageTargetsDisjoint: true,
  },
  operations,
  priorReleaseInterfaces: {
    r02AcceptedExcavationAirOverlap: {
      ...classManifest(priorOverlaps.r02ExcavationAir),
      disposition: 'DECLARED_ACCEPTED_VOID_PROVEN_AIR_AND_RESTORED_TO_AIR_BY_INVERSE',
    },
    r03AcceptedExcavationAirOverlap: {
      ...classManifest(priorOverlaps.r03ExcavationAir),
      disposition: 'DECLARED_ACCEPTED_VOID_PROVEN_AIR_AND_RESTORED_TO_AIR_BY_INVERSE',
    },
    r06TreatmentOverlap: classManifest(priorOverlaps.r06Treatment),
    r07jSurfaceArchitectureOverlap: classManifest(priorOverlaps.r07jSurfaceArchitecture),
    r09aLowerFloorOverlap: classManifest(priorOverlaps.r09aLowerFloor),
    r09bLowerStairOverlap: classManifest(priorOverlaps.r09bLowerStair),
    r09cLowerContainmentOverlap: classManifest(priorOverlaps.r09cLowerContainment),
    r09dLowerCrownOverlap: classManifest(priorOverlaps.r09dLowerCrown),
  },
  safetyBoundary: {
    targetFluidCount: 0,
    haloFluidCount: haloFluids.length,
      targetGravityCount: 0,
      haloGravityCount: haloGravity.length,
      unsupportedGravityCount: unstableGravity.length,
      unsupportedGravity: unstableGravity,
      targetsFaceAdjacentToUnsupportedGravityCount:
        targetsFaceAdjacentToUnstableGravity.length,
      gravitySupportRemovedCount: 0,
    blockEntityIntersectionCount: blockEntities.length,
    savedEntityIntersectionCount: savedEntities.length,
    protectedRelicIntersectionCount: protectedIntersections.length,
    mechanismTargetCount: 0,
    exteriorOpeningTargetCount: 0,
  },
  standingAuthorization: {
    path: INPUTS.standingAuthorization,
    authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    status: authorization.status,
  },
  upstreamIdentities: {
    b07ConstructionSha256: EXPECTED.b07ConstructionSha256,
    b07InteractionSha256: EXPECTED.b07InteractionSha256,
    ...Object.fromEntries(Object.entries(manifests).map(([key, manifest]) => (
      [`${key}Identity`, manifest.manifestIdentity]
    ))),
  },
  hardSafetyKernelNext: [
    'fresh same-invocation complete source save',
    'exact ordered source preflights and strict forward/rollback parser checks',
    'fresh live block-entity and entity clearance',
    'strict-noop journaled execution with compensating reverse-order rollback',
    'immutable post save and exact reverse-order rollback-poststate preflights',
    'independent structural/containment QA; no public-route commissioning',
  ],
};
const manifest = {
  ...manifestWithoutIdentity,
  manifestIdentity: sha256(JSON.stringify(manifestWithoutIdentity)),
};
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);

process.stdout.write(`${JSON.stringify({
  status: manifest.status,
  manifest: relative(manifestPath),
  manifestIdentity: manifest.manifestIdentity,
  sourceCompleteSaveSha256: intake.packageIdentity.completeSaveSha256,
  targetCellCount: targetCells.length,
  deckCellCount: deckTransitions.length,
  frameworkCellCount: frameworkTransitions.length,
  outerGapCellCount: outerGapRecords.length,
  interactionHaloCellCount: halo.length,
  haloFluidCount: haloFluids.length,
  savedEntityIntersectionCount: savedEntities.length,
  blockEntityIntersectionCount: blockEntities.length,
  packages,
  entityReport: relative(ENTITY_REPORT),
  liveCallsPerformed: false,
  worldMutationPerformed: false,
}, null, 2)}\n`);
