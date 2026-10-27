#!/usr/bin/env node
/**
 * Compile CZ-R09F: the exact enclosed B07 upper-stair/headhouse interface.
 *
 * The path continues the accepted R09E half-step sequence through the exact
 * B07 5x5 inner ring, finishes at the frozen B07 top anchor, and opens only a
 * five-cell landing seam into the already doorless R07J interior. The lower
 * wet deck, exterior shell, mechanisms, and public-route hold stay closed.
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  D06_CELL_PREAMBLE,
  boundsOf,
  cellKey,
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
const GENERATED_AT = value('--generated-at', '2026-08-22T01:25:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r09e-post-20260822T011348Z',
);
const INTAKE_AUDIT = value(
  '--intake-audit',
  'data/world-review/combined-zones-r09e-live-20260822T011348Z/post-complete-save-intake.json',
);
const SOURCE_LEDGER = value(
  '--source-ledger',
  'data/world-review/combined-zones-r09e-live-20260822T011348Z/evidence-ledger.json',
);
const SOURCE_QA = value(
  '--source-qa',
  'data/world-review/combined-zones-r09e-live-20260822T011348Z/r09e-post-release-qa.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'combined-zones-r09f-b07-enclosed-upper-interface');
const ENTITY_REPORT = value(
  '--entity-report',
  'data/world-review/combined-zones-r09f-b07-enclosed-upper-interface-offline-20260822T012500Z/immutable-entity-clearance.json',
);

const RELEASE_NODE_ID = 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT';
const CONTAINMENT_PACKAGE = 'b07-upper-interface-containment';
const SEAM_PACKAGE = 'b07-upper-stair-headhouse-seam';
const AIR = 'minecraft:air';
const CORE = 'minecraft:polished_andesite';
const CONTAINMENT = 'minecraft:polished_diorite';
const AIR_NAMES = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FULL_SOLID_NAMES = new Set([
  'minecraft:stone', 'minecraft:dirt', 'minecraft:grass_block',
  'minecraft:granite', 'minecraft:diorite', 'minecraft:andesite',
  'minecraft:deepslate', 'minecraft:tuff', 'minecraft:copper_ore',
  'minecraft:iron_ore', 'minecraft:coal_ore', 'minecraft:gravel',
  'minecraft:sand', 'minecraft:red_sand', CORE, CONTAINMENT,
]);
const GRAVITY_NAMES = new Set(['minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand']);
const WOODY_SUFFIXES = ['_log', '_wood', '_leaves', '_stem', '_hyphae'];

const INPUTS = Object.freeze({
  mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  protectedRelics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  standingAuthorization: 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  releaseContract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
  r06Manifest: 'data/buildops/combined-zones-r06-support-liner.release-manifest.json',
  r07jManifest:
    'data/buildops/combined-zones-r07j-b07-supported-surface-headhouse.release-manifest.json',
  r09aManifest: 'data/buildops/combined-zones-r09-b07-lower-lobby-floor.release-manifest.json',
  r09bManifest:
    'data/buildops/combined-zones-r09b-b07-lower-spiral-stair.release-manifest.json',
  r09cManifest:
    'data/buildops/combined-zones-r09c-b07-stair-safety-completion.release-manifest.json',
  r09dManifest: 'data/buildops/combined-zones-r09d-b07-terminal-crown.release-manifest.json',
  r09eManifest: 'data/buildops/combined-zones-r09e-b07-dry-upper-stair.release-manifest.json',
});

const EXPECTED = Object.freeze({
  sourceCompleteSaveSha256:
    '68b36cde83b73b4bd3fd696385fa43140fd60cd1ee5351189418103a1cf73694',
  sourceRegionSha256: 'c448fa5d6f623255f78d30de4f25d940f0881f6588fb8c02e5509635105ce784',
  sourceLedgerSha256: 'da6787f28d21b2e3395b5dc86f9570a0eff152360d19ffdb19484e73c168b327',
  sourceCompletedReleaseIdentity:
    '2ea1f26641a95b82078f10061a4c760b5b47cb2fd4586efb3fc1747069d6495e',
  sourceQaSha256: 'abfea161d773ed653e5d32535542779042de94140ca2508de86bac48318ed45c',
  sourceQaPayloadSha256:
    '456810635961f7e8725c2da2e5a01fbc6f653cd52a99ef14be31135bfdcf269f',
  b07ConstructionCount: 8134,
  b07ConstructionSha256: 'd58f20c6ad6581487e2a6ba72754d40ce22d49981da7450b44ad5e37325e5e59',
  b07InteractionCount: 13608,
  b07InteractionSha256: 'dd2cc387b0e5f6517ec48176c820e05f5fef5ff9793c74d32d4a5262582e5a8d',
  sourceTopSurfaceY2: 122,
  newStairCount: 23,
  landingSeamCount: 5,
});

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R09F B07 enclosed-interface compiler rejected: ${message}`);
};
const stateName = (state) => state.split('[', 1)[0];
const isWoody = (name) => WOODY_SUFFIXES.some((suffix) => name.endsWith(suffix));
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
  const rightKeys = new Set(right.map(cellKey));
  return uniqueCells(left.filter((cell) => rightKeys.has(cellKey(cell))));
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

const mechanisms = readJson(INPUTS.mechanisms);
const protectedRelics = readJson(INPUTS.protectedRelics);
const authorization = readJson(INPUTS.standingAuthorization);
const releaseContract = readJson(INPUTS.releaseContract);
const manifests = Object.fromEntries(Object.entries(INPUTS)
  .filter(([key]) => key.endsWith('Manifest'))
  .map(([key, filename]) => [key, readJson(filename)]));
const intake = readJson(INTAKE_AUDIT);
const sourceLedger = readJson(SOURCE_LEDGER);
const sourceQa = readJson(SOURCE_QA);
const sourceLedgerSha256 = sha256(fs.readFileSync(absolute(SOURCE_LEDGER)));
const sourceQaSha256 = sha256(fs.readFileSync(absolute(SOURCE_QA)));

invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.packageIdentity.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && absolute(intake.input?.suppliedWorldRoot) === absolute(SNAPSHOT),
'source intake is not the accepted complete immutable R09E post');
invariant(sourceLedgerSha256 === EXPECTED.sourceLedgerSha256
  && sourceLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && sourceLedger.completedReleaseIdentitySha256 === EXPECTED.sourceCompletedReleaseIdentity
  && absolute(sourceLedger.postSnapshot?.root) === absolute(SNAPSHOT),
'source ledger is not the accepted R09E terminal post');
invariant(sourceQaSha256 === EXPECTED.sourceQaSha256
  && sourceQa.status
    === 'PASS_R09E_B07_DRY_UPPER_STAIR_POSTSTATE_VERIFIED_REVERSIBLE_FAIL_CLOSED'
  && sourceQa.qaPayloadSha256 === EXPECTED.sourceQaPayloadSha256,
'R09E independent post-release acceptance is absent or drifted');
for (const member of ['region', 'entities', 'poi']) {
  invariant(fs.existsSync(absolute(path.join(SNAPSHOT, member))), `source snapshot is missing ${member}`);
}
const sourceIdentity = readJson(sourceLedger.postSnapshot.identity.path);
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
'canonical B07 geometry identity drifted');
invariant(JSON.stringify(b07System.anchors.top) === JSON.stringify({
  x: 2108, y: 72, z: -398, surveyedTerrainY: 63,
}), 'accepted B07 top anchor drifted');
const interactionKeys = new Set(b07.interaction.map(cellKey));
const constructionKeys = new Set(b07.construction.map(cellKey));
const upperPrimitive = b07System.primitives?.upperVertical ?? {
  bounds: { minX: 2105, maxX: 2111, minY: 8, maxY: 72, minZ: -401, maxZ: -395 },
};

// The accepted 5x5 stair ring, clockwise from its south-west point.
const innerRing = [];
for (let x = 2106; x <= 2110; x += 1) {
  innerRing.push({ x, z: -396, ox: x, oz: -395 });
}
for (let z = -397; z >= -400; z -= 1) {
  innerRing.push({ x: 2110, z, ox: 2111, oz: z });
}
for (let x = 2109; x >= 2106; x -= 1) {
  innerRing.push({ x, z: -400, ox: x, oz: -401 });
}
for (let z = -399; z <= -397; z += 1) {
  innerRing.push({ x: 2106, z, ox: 2105, oz: z });
}
invariant(innerRing.length === 16
  && new Set(innerRing.map(({ x, z }) => `${x},${z}`)).size === 16,
'derived 5x5 interface ring drifted');

const stairs = [];
for (let step = 1; step <= 20; step += 1) {
  const point = innerRing[(2 + step - 1) % innerRing.length];
  const surfaceY2 = EXPECTED.sourceTopSurfaceY2 + step;
  stairs.push({
    step,
    cell: { x: point.x, y: Math.floor((surfaceY2 - 1) / 2), z: point.z },
    outer: { x: point.ox, y: Math.floor((surfaceY2 - 1) / 2), z: point.oz },
    surfaceY2,
    targetState: surfaceY2 % 2 === 1
      ? 'minecraft:smooth_stone_slab[type=bottom,waterlogged=false]'
      : 'minecraft:smooth_stone_slab[type=top,waterlogged=false]',
    role: 'inner-ring-ascent',
  });
}
const finalApproach = [
  { x: 2109, y: 71, z: -397 },
  { x: 2108, y: 71, z: -397 },
  { x: b07System.anchors.top.x, y: b07System.anchors.top.y, z: b07System.anchors.top.z },
];
for (let index = 0; index < finalApproach.length; index += 1) {
  const step = 21 + index;
  const surfaceY2 = EXPECTED.sourceTopSurfaceY2 + step;
  stairs.push({
    step,
    cell: finalApproach[index],
    outer: null,
    surfaceY2,
    targetState: surfaceY2 % 2 === 1
      ? 'minecraft:smooth_stone_slab[type=bottom,waterlogged=false]'
      : 'minecraft:smooth_stone_slab[type=top,waterlogged=false]',
    role: index === finalApproach.length - 1 ? 'top-anchor-ingress' : 'enclosed-landing',
  });
}
invariant(stairs.length === EXPECTED.newStairCount
  && cellKey(stairs[0].cell) === '2108,61,-396'
  && cellKey(stairs.at(-1).cell) === '2108,72,-398'
  && stairs[0].surfaceY2 === 123 && stairs.at(-1).surfaceY2 === 145,
'stair endpoint derivation drifted');
const acceptedR09eLastStep = {
  cell: { x: 2108, y: 60, z: -395 },
  surfaceY2: EXPECTED.sourceTopSurfaceY2,
  targetState: 'minecraft:smooth_stone_slab[type=top,waterlogged=false]',
};
for (let index = 0; index < stairs.length; index += 1) {
  const prior = index === 0 ? acceptedR09eLastStep : stairs[index - 1];
  const current = stairs[index];
  invariant(Math.abs(prior.cell.x - current.cell.x)
      + Math.abs(prior.cell.z - current.cell.z) === 1
    && current.surfaceY2 - prior.surfaceY2 === 1,
  `stair is not cardinally half-step contiguous at step ${current.step}`);
}
const interiorDeckContinuation = { x: 2108, y: 72, z: -399 };
invariant(Math.abs(interiorDeckContinuation.x - stairs.at(-1).cell.x)
    + Math.abs(interiorDeckContinuation.z - stairs.at(-1).cell.z) === 1,
'top anchor does not face the retained interior deck');

const stairCells = stairs.map(({ cell }) => cell);
const stairKeys = new Set(stairCells.map(cellKey));
const clearance = uniqueCells(stairs.flatMap(({ cell }) => [
  { x: cell.x, y: cell.y + 1, z: cell.z },
  { x: cell.x, y: cell.y + 2, z: cell.z },
])).filter((cell) => !stairKeys.has(cellKey(cell)));
const requiredOuterBarrier = uniqueCells(stairs.flatMap(({ outer }) => outer ? [
  { x: outer.x, y: outer.y + 1, z: outer.z },
  { x: outer.x, y: outer.y + 2, z: outer.z },
] : []));
const core = [];
for (let x = 2107; x <= 2109; x += 1) {
  for (let y = 62; y <= 71; y += 1) {
    for (let z = -399; z <= -397; z += 1) {
      const cell = { x, y, z };
      if (!stairKeys.has(cellKey(cell))) core.push(cell);
    }
  }
}
const landingSeam = uniqueCells([
  ...stairs.slice(18, 22).map(({ cell }) => ({ ...cell, y: 72 })),
  stairs.at(-1).cell,
]);
invariant(landingSeam.length === EXPECTED.landingSeamCount
  && landingSeam.every(({ y }) => y === 72)
  && landingSeam.some((cell) => cellKey(cell) === cellKey(b07System.anchors.top)),
'five-cell top-anchor landing seam drifted');

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const readState = async (cell) => stateToCommandString(
  await reader.blockState(cell.x, cell.y, cell.z),
);
invariant(await readState(acceptedR09eLastStep.cell) === acceptedR09eLastStep.targetState,
'accepted R09E terminal step is absent');
invariant(await readState(interiorDeckContinuation) === CONTAINMENT,
'R07J retained interior deck continuation is absent');

const outerBarrierRecords = [];
for (const cell of requiredOuterBarrier) outerBarrierRecords.push({ cell, state: await readState(cell) });
const retainedOuterBarrier = outerBarrierRecords.filter(({ state }) => (
  FULL_SOLID_NAMES.has(stateName(state))
));
const outerBarrierGaps = outerBarrierRecords.filter(({ state }) => (
  !FULL_SOLID_NAMES.has(stateName(state))
));
invariant(outerBarrierGaps.every(({ state }) => (
  AIR_NAMES.has(stateName(state)) || stateName(state) === 'minecraft:snow'
)), 'outer barrier contains a non-solid state outside the narrow air/snow family');

const coreDesired = core.map((cell) => ({ cell, targetState: CORE, role: 'upper-core-extension' }));
const outerDesired = outerBarrierGaps.map(({ cell }) => ({
  cell, targetState: CONTAINMENT, role: 'outer-fall-containment-closure',
}));
const containmentDesired = [...coreDesired, ...outerDesired];
const clearanceDesired = [];
for (const cell of clearance) {
  const state = await readState(cell);
  if (!AIR_NAMES.has(stateName(state))) {
    invariant([
      'minecraft:polished_andesite', 'minecraft:polished_diorite',
      'minecraft:snow',
    ].includes(stateName(state)),
    `clearance blocker is outside the narrow exact family at ${cellKey(cell)}: ${state}`);
    clearanceDesired.push({ cell, targetState: AIR, role: 'exact-stair-head-clearance' });
  }
}
const stairDesired = stairs.map(({ cell, targetState, role }) => ({ cell, targetState, role }));
const seamDesired = [...clearanceDesired, ...stairDesired];
const allDesired = [...containmentDesired, ...seamDesired];
const targetCells = allDesired.map(({ cell }) => cell);
const targetKeys = new Set(targetCells.map(cellKey));
invariant(targetKeys.size === targetCells.length
  && intersection(containmentDesired.map(({ cell }) => cell), seamDesired.map(({ cell }) => cell)).length === 0,
'containment and seam packages are not disjoint');
invariant(targetCells.every((cell) => interactionKeys.has(cellKey(cell))),
'a target leaves the exact canonical B07 interaction union');

const transitions = [];
for (const desired of allDesired) {
  const sourceState = await readState(desired.cell);
  invariant(sourceState !== desired.targetState,
    `target is a no-op at ${cellKey(desired.cell)}: ${sourceState}`);
  transitions.push({ ...desired, sourceState });
}
const containmentTransitions = transitions.slice(0, containmentDesired.length);
const seamTransitions = transitions.slice(containmentDesired.length);
const targetHazards = transitions.filter(({ sourceState }) => {
  const name = stateName(sourceState);
  return name === 'minecraft:water' || name === 'minecraft:lava'
    || sourceState.includes('waterlogged=true') || GRAVITY_NAMES.has(name) || isWoody(name);
});
invariant(targetHazards.length === 0, 'a target touches fluid, gravity, or woody state');

const projectedOuterState = new Map(outerBarrierRecords.map(({ cell, state }) => [cellKey(cell), state]));
for (const { cell } of outerDesired) projectedOuterState.set(cellKey(cell), CONTAINMENT);
const outerContainmentFailures = requiredOuterBarrier.filter((cell) => (
  !FULL_SOLID_NAMES.has(stateName(projectedOuterState.get(cellKey(cell)) ?? AIR))
));
invariant(outerContainmentFailures.length === 0,
'projected upper interface leaves an outer fall opening');

const projectedClearance = new Map();
for (const cell of clearance) projectedClearance.set(cellKey(cell), await readState(cell));
for (const { cell } of clearanceDesired) projectedClearance.set(cellKey(cell), AIR);
const clearanceFailures = clearance.filter((cell) => (
  !AIR_NAMES.has(stateName(projectedClearance.get(cellKey(cell)) ?? AIR))
));
invariant(clearanceFailures.length === 0, 'projected upper interface leaves blocked headroom');

const halo = cubeHalo(targetCells);
const haloFluids = [];
const haloGravity = [];
const haloWoody = [];
for (const cell of halo) {
  const state = await readState(cell);
  const name = stateName(state);
  if (name === 'minecraft:water' || name === 'minecraft:lava' || state.includes('waterlogged=true')) {
    haloFluids.push({ cell, state });
  }
  if (GRAVITY_NAMES.has(name) || name.endsWith('_concrete_powder')) haloGravity.push({ cell, state });
  if (isWoody(name)) haloWoody.push({ cell, state });
}
const unsupportedGravity = [];
for (const record of haloGravity) {
  const support = { x: record.cell.x, y: record.cell.y - 1, z: record.cell.z };
  const supportState = await readState(support);
  if (AIR_NAMES.has(stateName(supportState))) {
    unsupportedGravity.push({ ...record, support, supportState });
  }
}
const gravityFaceAdjacency = targetCells.filter((target) => haloGravity.some(({ cell }) => (
  Math.abs(cell.x - target.x) + Math.abs(cell.y - target.y) + Math.abs(cell.z - target.z) === 1
)));
const unsupportedGravityFaceAdjacency = targetCells.filter((target) => (
  unsupportedGravity.some(({ cell }) => (
    Math.abs(cell.x - target.x) + Math.abs(cell.y - target.y) + Math.abs(cell.z - target.z) === 1
  ))
));
const gravitySupportKeys = new Set(haloGravity.map(({ cell }) => (
  cellKey({ x: cell.x, y: cell.y - 1, z: cell.z })
)));
const gravitySupportRemoval = transitions.filter(({ cell, targetState }) => (
  gravitySupportKeys.has(cellKey(cell)) && AIR_NAMES.has(stateName(targetState))
));
invariant(haloFluids.length === 0
  && unsupportedGravityFaceAdjacency.length === 0
  && gravitySupportRemoval.length === 0,
`target halo has fluid or unstable gravity risk: fluids=${JSON.stringify(haloFluids)}, unsupportedGravityTargets=${JSON.stringify(unsupportedGravityFaceAdjacency)}, supportRemoval=${JSON.stringify(gravitySupportRemoval)}`);

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
'target halo intersects a block entity or saved entity');
const protectedIntersections = protectedRelics.relics.filter((relic) => (
  targetCells.some((cell) => insideBounds(cell, relic.declaredInclusiveBounds))
));
invariant(protectedIntersections.length === 0, 'target intersects a protected relic');

const priorRecords = Object.fromEntries(Object.entries(manifests).map(([key, manifest]) => [
  key,
  manifest.packages.flatMap(({ forward }) => expandOperations(forward)),
]));
const overlap = (key) => intersection(targetCells, priorRecords[key].map(({ cell }) => cell));
const priorOverlaps = Object.fromEntries(Object.keys(priorRecords).map((key) => [key, overlap(key)]));
invariant(priorOverlaps.r06Manifest.length === 0
  && priorOverlaps.r09aManifest.length === 0
  && priorOverlaps.r09bManifest.length === 0
  && priorOverlaps.r09cManifest.length === 0
  && priorOverlaps.r09dManifest.length === 0
  && priorOverlaps.r07jManifest.length === EXPECTED.landingSeamCount
  && priorOverlaps.r09eManifest.length === 6,
'prior-release interface partition drifted');
const r07jOverlapKeys = new Set(priorOverlaps.r07jManifest.map(cellKey));
invariant(landingSeam.every((cell) => r07jOverlapKeys.has(cellKey(cell))),
'R07J overlap is not exactly the five-cell top-anchor seam');

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
    `# GENERATED FILE - CZ-R09F B07 enclosed upper interface ${packageKey} (${role})`,
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
const containmentArtifact = operationArtifacts(CONTAINMENT_PACKAGE, containmentTransitions);
const seamArtifact = operationArtifacts(SEAM_PACKAGE, seamTransitions);
const packages = [containmentArtifact.package, seamArtifact.package];
const operations = {
  [CONTAINMENT_PACKAGE]: containmentArtifact.operation,
  [SEAM_PACKAGE]: seamArtifact.operation,
};

const entityReport = {
  schemaVersion: 1,
  id: 'combined-zones-r09f-b07-enclosed-upper-interface-immutable-entity-clearance',
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

const constructionTargets = targetCells.filter((cell) => constructionKeys.has(cellKey(cell)));
const interactionOnlyTargets = targetCells.filter((cell) => (
  interactionKeys.has(cellKey(cell)) && !constructionKeys.has(cellKey(cell))
));
const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_R09E_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['Z06-PUBLIC-SHAFT-FITOUT'],
  packages,
  executionOrder: {
    forward: [CONTAINMENT_PACKAGE, SEAM_PACKAGE],
    rollback: [SEAM_PACKAGE, CONTAINMENT_PACKAGE],
    rationale: 'Install the bounded core and outer fall containment before replacing exact R09E/R07J interface cells with clearance, half-step stairs, and the top-anchor landing. Rollback recloses the exact headhouse deck/crown first, then removes only the new containment.',
  },
  scope: {
    releaseId: 'CZ-R09F-P1-B07-ENCLOSED-UPPER-INTERFACE',
    releaseNodeId: RELEASE_NODE_ID,
    canonicalOwner: 'Z06-PUBLIC-SHAFT-FITOUT',
    purpose: 'Complete the source-proven dry half-step seam from the contained R09E upper stair to the exact B07 top anchor inside the closed R07J headhouse.',
    geometry: {
      acceptedUpperVerticalPrimitive: upperPrimitive,
      acceptedTopAnchor: b07System.anchors.top,
      acceptedR09eTerminalStep: {
        ...acceptedR09eLastStep,
        source: 'R09E ordered stair index 87',
      },
      innerFiveByFiveRingHorizontalProjection: classManifest(
        innerRing.map(({ x, z }) => ({ x, y: 0, z })),
      ),
      upperCoreExtension: classManifest(core),
      orderedInterfaceStair: {
        ...classManifest(stairCells),
        orderedStepCount: stairs.length,
        lowestSurfaceY2: stairs[0].surfaceY2,
        highestSurfaceY2: stairs.at(-1).surfaceY2,
        maximumRiseHalfBlocks: 1,
        cardinallyContiguous: true,
      },
      exactHeadClearance: {
        ...classManifest(clearance),
        operatedBlockerCellCount: clearanceDesired.length,
        projectedMismatchCount: clearanceFailures.length,
      },
      requiredOuterBarrier: {
        ...classManifest(requiredOuterBarrier),
        retainedFullSolidCellCount: retainedOuterBarrier.length,
        operatedGapCellCount: outerBarrierGaps.length,
        projectedFailureCount: outerContainmentFailures.length,
      },
      fiveCellR07jLandingSeam: classManifest(landingSeam),
      retainedInteriorDeckContinuation: interiorDeckContinuation,
      operatedUnion: classManifest(targetCells),
      interactionHalo: classManifest(halo),
    },
    ownership: {
      canonicalB07ConstructionCellCount: b07.construction.length,
      canonicalB07ConstructionSha256: EXPECTED.b07ConstructionSha256,
      canonicalB07InteractionCellCount: b07.interaction.length,
      canonicalB07InteractionSha256: EXPECTED.b07InteractionSha256,
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
      coreExtension: CORE,
      fallContainment: CONTAINMENT,
      stairAndLanding: 'minecraft:smooth_stone_slab',
      exactClearance: AIR,
      rationale: 'Continue the accepted R09E/R07J non-reactive public-core palette without introducing controls, fluids, gravity, or a new exterior material.',
    },
    operationalBoundary: {
      lowerWetInterfaceClosedByR09eDeck: true,
      r07jExteriorDoorInstalled: false,
      r07jExteriorWallOrRoofTouched: false,
      r07jInternalDeckSeamOpenedCellCount: landingSeam.length,
      enclosedHeadhouseInteriorReached: true,
      exteriorOpeningCreated: false,
      upperStairConstructionConnectedToEnclosedInterior: true,
      publicRouteCommissioned: false,
      fireServiceRouteCommissioned: false,
      liftMechanismSmokePowerDrainageTouched: false,
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
    sourcePostQaPath: SOURCE_QA,
    sourcePostQaSha256: sourceQaSha256,
    sourcePostQaPayloadSha256: sourceQa.qaPayloadSha256,
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
    r06WetTreatment: classManifest(priorOverlaps.r06Manifest),
    r07jExactFiveCellInteriorDeckSeam: {
      ...classManifest(priorOverlaps.r07jManifest),
      disposition: 'EXACT_REVIEWED_INTERNAL_INTERFACE_TRANSFORMATION_RESTORED_BY_INVERSE',
    },
    r09aLowerLobby: classManifest(priorOverlaps.r09aManifest),
    r09bLowerStair: classManifest(priorOverlaps.r09bManifest),
    r09cSafetyCompletion: classManifest(priorOverlaps.r09cManifest),
    r09dTerminalCrown: classManifest(priorOverlaps.r09dManifest),
    r09eExactSixCellUpperHoldTransition: {
      ...classManifest(priorOverlaps.r09eManifest),
      disposition: 'EXACT_REVIEWED_CONTINUATION_TRANSFORMATION_RESTORED_BY_INVERSE',
    },
  },
  safetyBoundary: {
    targetFluidCount: 0,
    haloFluidCount: haloFluids.length,
    targetGravityCount: 0,
    haloGravityCount: haloGravity.length,
    targetFaceAdjacencyToStableGravityCount: gravityFaceAdjacency.length,
    unsupportedGravityCount: unsupportedGravity.length,
    targetFaceAdjacencyToUnsupportedGravityCount: unsupportedGravityFaceAdjacency.length,
    gravitySupportRemovalCount: gravitySupportRemoval.length,
    targetWoodyCount: 0,
    haloWoodyCount: haloWoody.length,
    woodyMutationCount: 0,
    blockEntityIntersectionCount: blockEntities.length,
    savedEntityIntersectionCount: savedEntities.length,
    protectedRelicIntersectionCount: protectedIntersections.length,
    mechanismTargetCount: 0,
    exteriorWallRoofOrDoorTargetCount: 0,
  },
  standingAuthorization: {
    path: INPUTS.standingAuthorization,
    authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    status: authorization.status,
  },
  upstreamIdentities: {
    b07ConstructionSha256: EXPECTED.b07ConstructionSha256,
    b07InteractionSha256: EXPECTED.b07InteractionSha256,
    r07jManifestIdentity: manifests.r07jManifest.manifestIdentity,
    r09eManifestIdentity: manifests.r09eManifest.manifestIdentity,
    r09eCompletedReleaseIdentitySha256: sourceLedger.completedReleaseIdentitySha256,
    r09ePostQaPayloadSha256: sourceQa.qaPayloadSha256,
  },
  hardSafetyKernelNext: [
    'fresh same-invocation complete source save',
    'exact ordered source preflights and strict forward/rollback parser checks',
    'fresh live block-entity and entity clearance',
    'strict-noop journaled execution with compensating reverse-order rollback',
    'immutable post save and exact reverse-order rollback-poststate preflights',
    'independent stair, containment, headhouse-enclosure, interface, and no-drift QA',
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
  sourceCompleteSaveSha256: manifest.source.completeSaveSha256,
  targetCellCount: targetCells.length,
  containmentCellCount: containmentTransitions.length,
  seamCellCount: seamTransitions.length,
  orderedStairCellCount: stairs.length,
  landingSeamCellCount: landingSeam.length,
  interactionHaloCellCount: halo.length,
  haloFluidCount: haloFluids.length,
  targetFaceAdjacencyToStableGravityCount: gravityFaceAdjacency.length,
  targetFaceAdjacencyToUnsupportedGravityCount: unsupportedGravityFaceAdjacency.length,
  savedEntityIntersectionCount: savedEntities.length,
  blockEntityIntersectionCount: blockEntities.length,
  packages,
  entityReport: relative(ENTITY_REPORT),
  liveCallsPerformed: false,
  worldMutationPerformed: false,
}, null, 2)}\n`);
