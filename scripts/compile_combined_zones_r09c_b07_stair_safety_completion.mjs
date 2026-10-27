#!/usr/bin/env node
/**
 * Compile CZ-R09C: continuous outer containment and a non-climbable upper
 * terminal barrier for the accepted R09B B07 lower spiral stair.
 *
 * This compiler is read-only with respect to Minecraft. It emits one-cell
 * guarded operations only for current air gaps. Existing full solid boundary
 * cells remain untouched and participate in the exact projected containment
 * proof.
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
const GENERATED_AT = value('--generated-at', '2026-08-21T17:55:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r08m-post-20260821T174621Z',
);
const INTAKE_AUDIT = value(
  '--intake-audit',
  'data/world-review/combined-zones-r08m-live-20260821T174621Z/post-complete-save-intake.json',
);
const SOURCE_LEDGER = value(
  '--source-ledger',
  'data/world-review/combined-zones-r08m-live-20260821T174621Z/evidence-ledger.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'combined-zones-r09c-b07-stair-safety-completion');
const RELEASE_NODE_ID = 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT';
const PACKAGE_KEY = 'b07-stair-safety-completion';
const TARGET_STATE = 'minecraft:polished_diorite';
const AIR_STATES = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const RETAINED_FULL_SOLID_NAMES = new Set([
  'minecraft:deepslate',
  'minecraft:stone',
  'minecraft:gravel',
]);
const GRAVITY_NAMES = new Set(['minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand']);

const INPUTS = Object.freeze({
  mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  protectedRelics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  standingAuthorization: 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  releaseContract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
  r02Manifest: 'data/buildops/combined-zones-r02-d06-shell.release-manifest.json',
  r06Manifest: 'data/buildops/combined-zones-r06-support-liner.release-manifest.json',
  r09aManifest: 'data/buildops/combined-zones-r09-b07-lower-lobby-floor.release-manifest.json',
  r09bManifest: 'data/buildops/combined-zones-r09b-b07-lower-spiral-stair.release-manifest.json',
  r09bPostQa:
    'data/world-review/combined-zones-r09b-live-20260821T173228Z/r09b-post-release-qa.json',
});

const EXPECTED = Object.freeze({
  sourceCompleteSaveSha256:
    '729e0ce1cbbfc46fcba8c8e4e906b15b9c9f78036a3ddb888791de55abcc87a2',
  sourceRegionSha256:
    '17e6965f93dc3c06c2df6d39ad90572f39c4ff54b3ac3e8eb3e70a44c56d409a',
  sourceLedgerSha256:
    '80e1e8caa6695562ce0cdaaba20f54969892895e6c3c0cceced99c9139aa1b65',
  sourceLedgerCompletedReleaseIdentitySha256:
    'e97d45132458b3fe82a1d3fdb16a840ad92cc1f0d3fe1a13de60d510d6b4b4e7',
  b07ConstructionCellCount: 8134,
  b07ConstructionSha256:
    'd58f20c6ad6581487e2a6ba72754d40ce22d49981da7450b44ad5e37325e5e59',
  b07InteractionCellCount: 13608,
  b07InteractionSha256:
    'dd2cc387b0e5f6517ec48176c820e05f5fef5ff9793c74d32d4a5262582e5a8d',
  r09bManifestIdentity:
    '3ce00f8f00830ea82894c64c8d6a7c72bf29e24c2d9a6b1414ff675cacf8f472',
  r09bQaPayloadSha256:
    'cbc3a98e84234b2762b6e8ede97e297eec0b09ed6add7bbcc41460ce8a93e565',
  stairCount: 128,
  stairOrderedSha256:
    '0fee56a61014f8f5efdf3f6307056af29b35720cd58791c452cbd948241b4ed8',
  requiredOuterBarrierCellCount: 256,
  candidateContainmentCellCount: 257,
  operatedGapCellCount: 127,
  retainedSolidCellCount: 129,
  controlledAirGapCount: 1,
  candidateConstructionCount: 5,
  candidateInteractionOnlyCount: 252,
  operatedConstructionCount: 4,
  operatedInteractionOnlyCount: 123,
  r02OverlapCount: 3,
});

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R09C B07 stair safety compiler rejected: ${message}`);
};
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
const difference = (left, right) => {
  const excluded = new Set(right.map(cellKey));
  return uniqueCells(left.filter((cell) => !excluded.has(cellKey(cell))));
};
const stateName = (state) => state.split('[', 1)[0];
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

function parseOperations(filename) {
  const records = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains a malformed operation`);
    const coordinates = fields.slice(1, 7).map(Number);
    for (let x = Math.min(coordinates[0], coordinates[3]);
      x <= Math.max(coordinates[0], coordinates[3]); x += 1) {
      for (let y = Math.min(coordinates[1], coordinates[4]);
        y <= Math.max(coordinates[1], coordinates[4]); y += 1) {
        for (let z = Math.min(coordinates[2], coordinates[5]);
          z <= Math.max(coordinates[2], coordinates[5]); z += 1) {
          records.push({
            cell: { x, y, z },
            sourceState: fields[7],
            targetState: fields[8],
          });
        }
      }
    }
  }
  return records;
}

function manifestTargets(manifest) {
  return uniqueCells(manifest.packages.flatMap(({ forward }) => (
    parseOperations(forward).map(({ cell }) => cell)
  )));
}

function cubeHalo(cells) {
  return uniqueCells(cells.flatMap(({ x, y, z }) => {
    const result = [];
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dz = -1; dz <= 1; dz += 1) {
          result.push({ x: x + dx, y: y + dy, z: z + dz });
        }
      }
    }
    return result;
  }));
}

const mechanisms = readJson(INPUTS.mechanisms);
const protectedRelics = readJson(INPUTS.protectedRelics);
const authorization = readJson(INPUTS.standingAuthorization);
const releaseContract = readJson(INPUTS.releaseContract);
const r02Manifest = readJson(INPUTS.r02Manifest);
const r06Manifest = readJson(INPUTS.r06Manifest);
const r09aManifest = readJson(INPUTS.r09aManifest);
const r09bManifest = readJson(INPUTS.r09bManifest);
const r09bPostQa = readJson(INPUTS.r09bPostQa);
const intake = readJson(INTAKE_AUDIT);
const sourceLedger = readJson(SOURCE_LEDGER);
const sourceLedgerBinding = {
  path: SOURCE_LEDGER,
  sha256: sha256(fs.readFileSync(absolute(SOURCE_LEDGER))),
};

invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true
  && intake.packageIdentity.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256,
'source intake is not the expected complete immutable same-moment PASS');
invariant(absolute(intake.input?.suppliedWorldRoot) === absolute(SNAPSHOT),
  'source intake is not bound to the selected snapshot');
invariant(sourceLedgerBinding.sha256 === EXPECTED.sourceLedgerSha256
  && sourceLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && sourceLedger.completedReleaseIdentitySha256
    === EXPECTED.sourceLedgerCompletedReleaseIdentitySha256
  && absolute(sourceLedger.postSnapshot?.root) === absolute(SNAPSHOT)
  && sourceLedger.postSnapshot?.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256,
'source ledger is not the latest accepted R08M terminal post state');
for (const member of ['region', 'entities', 'poi']) {
  invariant(fs.existsSync(absolute(path.join(SNAPSHOT, member))),
    `source snapshot is missing ${member}`);
}
invariant(fs.existsSync(absolute(path.join(SNAPSHOT, 'level.dat'))),
  'source snapshot is missing level.dat');
const sourceIdentityPath = path.join(path.dirname(INTAKE_AUDIT), 'post-snapshot-identity.json');
const sourceIdentity = readJson(sourceIdentityPath);
invariant(sourceIdentity.sha256 === EXPECTED.sourceRegionSha256
  && absolute(sourceIdentity.directory) === absolute(path.join(SNAPSHOT, 'region')),
'source region identity drifted');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes?.includes(RELEASE_NODE_ID),
'standing authorization does not cover R09');
const r09Node = releaseContract.releaseSequence?.find(({ id }) => id === RELEASE_NODE_ID);
invariant(r09Node?.canonicalOwners?.includes('Z06-PUBLIC-SHAFT-FITOUT')
  && r09Node.requiredGateLifecycle === 'SCOPE_LOCAL_HARD_SAFETY_KERNEL',
'release contract does not bind Z06 to the R09 safety kernel');
invariant(r09bManifest.manifestIdentity === EXPECTED.r09bManifestIdentity
  && r09bPostQa.qaPayloadSha256 === EXPECTED.r09bQaPayloadSha256
  && r09bPostQa.summary?.exactConstructionPassed === true
  && r09bPostQa.functionalHold?.active === true
  && r09bPostQa.functionalHold?.routeCommissioned === false,
'R09B exact-build acceptance or functional hold binding drifted');

const b07 = deriveB07WestTwo(mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem);
invariant(b07.construction.length === EXPECTED.b07ConstructionCellCount
  && hashCells(b07.construction, D06_CELL_PREAMBLE) === EXPECTED.b07ConstructionSha256
  && b07.interaction.length === EXPECTED.b07InteractionCellCount
  && hashCells(b07.interaction, D06_CELL_PREAMBLE) === EXPECTED.b07InteractionSha256,
'canonical B07 construction or interaction identity drifted');
const constructionKeys = new Set(b07.construction.map(cellKey));
const interactionKeys = new Set(b07.interaction.map(cellKey));

const ring = [];
for (let x = 2103; x <= 2109; x += 1) ring.push({ x, z: -431, ox: x, oz: -432 });
for (let z = -430; z <= -425; z += 1) ring.push({ x: 2109, z, ox: 2110, oz: z });
for (let x = 2108; x >= 2103; x -= 1) ring.push({ x, z: -425, ox: x, oz: -424 });
for (let z = -426; z >= -430; z -= 1) ring.push({ x: 2103, z, ox: 2102, oz: z });
invariant(ring.length === 24, 'R09B perimeter ring drifted');
const stairRecords = [];
for (let index = 0; index < 124; index += 1) {
  const point = ring[index % ring.length];
  const y = -58 + Math.floor(index / 2);
  stairRecords.push({
    index,
    cell: { x: point.x, y, z: point.z },
    outer: { x: point.ox, y, z: point.oz },
    surfaceY2: (2 * y) + (index % 2 === 0 ? 1 : 2),
    targetState: index % 2 === 0
      ? 'minecraft:smooth_stone_slab[type=bottom,waterlogged=false]'
      : 'minecraft:smooth_stone_slab[type=top,waterlogged=false]',
  });
}
for (let offset = 0; offset < 4; offset += 1) {
  const index = 124 + offset;
  const point = ring[index % ring.length];
  stairRecords.push({
    index,
    cell: { x: point.x, y: 3, z: point.z },
    outer: { x: point.ox, y: 3, z: point.oz },
    surfaceY2: 8,
    targetState: 'minecraft:smooth_stone_slab[type=top,waterlogged=false]',
  });
}
const orderedStairSha256 = sha256(JSON.stringify(stairRecords.map(({
  cell, targetState, surfaceY2,
}) => ({ cell, targetState, surfaceY2 }))));
invariant(stairRecords.length === EXPECTED.stairCount
  && orderedStairSha256 === EXPECTED.stairOrderedSha256,
'accepted R09B ordered stair geometry drifted');

const requiredOuterBarrier = uniqueCells(stairRecords.flatMap(({ outer }) => [
  { x: outer.x, y: outer.y + 1, z: outer.z },
  { x: outer.x, y: outer.y + 2, z: outer.z },
]));
const capExtension = [{ x: 2109, y: 5, z: -429 }];
const candidateContainment = uniqueCells([...requiredOuterBarrier, ...capExtension]);
const constructionCandidate = candidateContainment.filter((cell) => (
  constructionKeys.has(cellKey(cell))
));
const interactionOnlyCandidate = candidateContainment.filter((cell) => (
  interactionKeys.has(cellKey(cell)) && !constructionKeys.has(cellKey(cell))
));
const outsideB07 = candidateContainment.filter((cell) => !interactionKeys.has(cellKey(cell)));
invariant(requiredOuterBarrier.length === EXPECTED.requiredOuterBarrierCellCount
  && candidateContainment.length === EXPECTED.candidateContainmentCellCount
  && constructionCandidate.length === EXPECTED.candidateConstructionCount
  && interactionOnlyCandidate.length === EXPECTED.candidateInteractionOnlyCount
  && outsideB07.length === 0,
'containment geometry is not wholly inside the canonical B07 interaction domain');

const regionReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const candidateRecords = [];
for (const cell of candidateContainment) {
  const state = stateToCommandString(await regionReader.blockState(cell.x, cell.y, cell.z));
  candidateRecords.push({ cell, state });
}
const allAirGapRecords = candidateRecords.filter(({ state }) => AIR_STATES.has(state));
const retainedRecords = candidateRecords.filter(({ state }) => !AIR_STATES.has(state));
const unsupportedRetained = retainedRecords.filter(({ state }) => (
  !RETAINED_FULL_SOLID_NAMES.has(stateName(state))
));
const candidateByKey = new Map(candidateRecords.map((record) => [cellKey(record.cell), record]));
const controlledAirGapRecords = [];
for (const { cell, state } of retainedRecords.filter(({ state: current }) => (
  GRAVITY_NAMES.has(stateName(current))
))) {
  const support = { x: cell.x, y: cell.y - 1, z: cell.z };
  const supportRecord = candidateByKey.get(cellKey(support));
  if (supportRecord && AIR_STATES.has(supportRecord.state)) {
    controlledAirGapRecords.push(supportRecord);
  }
}
const controlledAirKeys = new Set(controlledAirGapRecords.map(({ cell }) => cellKey(cell)));
const gapRecords = allAirGapRecords.filter(({ cell }) => !controlledAirKeys.has(cellKey(cell)));
invariant(gapRecords.length === EXPECTED.operatedGapCellCount
  && retainedRecords.length === EXPECTED.retainedSolidCellCount
  && controlledAirGapRecords.length === EXPECTED.controlledAirGapCount
  && unsupportedRetained.length === 0,
'source containment census contains an unsupported or drifted state');
const targetCells = gapRecords.map(({ cell }) => cell);
const targetKeys = new Set(targetCells.map(cellKey));
const retainedCells = retainedRecords.map(({ cell }) => cell);
const controlledAirGapCells = controlledAirGapRecords.map(({ cell }) => cell);
const operatedConstruction = targetCells.filter((cell) => constructionKeys.has(cellKey(cell)));
const operatedInteractionOnly = targetCells.filter((cell) => (
  interactionKeys.has(cellKey(cell)) && !constructionKeys.has(cellKey(cell))
));
invariant(operatedConstruction.length === EXPECTED.operatedConstructionCount
  && operatedInteractionOnly.length === EXPECTED.operatedInteractionOnlyCount,
'operated ownership partition drifted');

const r09bOperations = parseOperations(r09bManifest.packages[0].forward);
for (const record of r09bOperations) {
  const state = stateToCommandString(
    await regionReader.blockState(record.cell.x, record.cell.y, record.cell.z),
  );
  invariant(state === record.targetState,
    `accepted R09B state drift at ${cellKey(record.cell)}: ${state}`);
}
const stairClearance = uniqueCells(stairRecords.flatMap(({ cell }) => [
  { x: cell.x, y: cell.y + 1, z: cell.z },
  { x: cell.x, y: cell.y + 2, z: cell.z },
]));
invariant(intersection(targetCells, stairClearance).length === 0,
  'containment targets intersect stair head clearance');
for (const cell of stairClearance) {
  const state = stateToCommandString(await regionReader.blockState(cell.x, cell.y, cell.z));
  invariant(AIR_STATES.has(state), `stair clearance drift at ${cellKey(cell)}: ${state}`);
}
const existingCap = cellsIn({
  minX: 2109, maxX: 2109,
  minY: 3, maxY: 4,
  minZ: -429, maxZ: -429,
});
for (const cell of existingCap) {
  const state = stateToCommandString(await regionReader.blockState(cell.x, cell.y, cell.z));
  invariant(state === TARGET_STATE, `existing R09B cap drift at ${cellKey(cell)}: ${state}`);
}

const halo = cubeHalo(candidateContainment);
const haloFluids = [];
const haloGravity = [];
for (const cell of halo) {
  const state = stateToCommandString(await regionReader.blockState(cell.x, cell.y, cell.z));
  const name = stateName(state);
  if (name === 'minecraft:water' || name === 'minecraft:lava'
    || state.includes('waterlogged=true')) haloFluids.push({ cell, state });
  if (GRAVITY_NAMES.has(name) || name.endsWith('_concrete_powder')) {
    haloGravity.push({ cell, state });
  }
}
invariant(haloFluids.every(({ cell }) => !targetKeys.has(cellKey(cell))),
  'containment targets intersect a fluid state');
invariant(haloGravity.every(({ cell }) => !targetKeys.has(cellKey(cell))),
  'containment targets intersect a gravity state');
const retainedGravity = retainedRecords.filter(({ state }) => GRAVITY_NAMES.has(stateName(state)));
const unsupportedGravity = [];
for (const { cell, state } of retainedGravity) {
  const support = { x: cell.x, y: cell.y - 1, z: cell.z };
  const supportState = stateToCommandString(
    await regionReader.blockState(support.x, support.y, support.z),
  );
  if (AIR_STATES.has(supportState) && !controlledAirKeys.has(cellKey(support))) {
    unsupportedGravity.push({ cell, state, support, supportState });
  }
}
invariant(unsupportedGravity.length === 0,
  'retained gravity containment lacks stable untouched support');
const floatingGravity = retainedGravity.filter(({ cell }) => (
  controlledAirKeys.has(`${cell.x},${cell.y - 1},${cell.z}`)
));
const faceAdjacentTargetsToFloatingGravity = targetCells.filter((target) => (
  floatingGravity.some(({ cell }) => (
    Math.abs(cell.x - target.x) + Math.abs(cell.y - target.y) + Math.abs(cell.z - target.z)
      === 1
  ))
));
invariant(floatingGravity.length === EXPECTED.controlledAirGapCount
  && faceAdjacentTargetsToFloatingGravity.length === 0,
  'a target could update the preserved source-floating gravity overhang');

const projectedState = (cell) => {
  if (targetKeys.has(cellKey(cell))) return TARGET_STATE;
  return candidateByKey.get(cellKey(cell))?.state ?? null;
};
const fullSolidProjected = (cell) => {
  const state = projectedState(cell);
  return state === TARGET_STATE || RETAINED_FULL_SOLID_NAMES.has(stateName(state ?? ''));
};
const containmentFailures = [];
for (const stair of stairRecords) {
  const lower = { x: stair.outer.x, y: stair.outer.y + 1, z: stair.outer.z };
  const upper = { x: stair.outer.x, y: stair.outer.y + 2, z: stair.outer.z };
  const lowerSolid = fullSolidProjected(lower);
  const upperSolid = fullSolidProjected(upper);
  const availableHeight = upper.y - (stair.surfaceY2 / 2);
  const collisionContained = (lowerSolid && upperSolid)
    || (!lowerSolid && upperSolid && availableHeight < 1.8);
  if (!collisionContained) {
    containmentFailures.push({
      stairIndex: stair.index,
      stairCell: stair.cell,
      lowerState: projectedState(lower),
      upperState: projectedState(upper),
      availableHeight,
    });
  }
}
invariant(containmentFailures.length === 0,
  'projected outer boundary leaves a player-passable fall opening');

const haloBounds = boundsOf(halo);
const blockEntityIntersections = [];
const savedEntityIntersections = [];
const touchedChunks = [];
for (let cx = Math.floor(haloBounds.minX / 16); cx <= Math.floor(haloBounds.maxX / 16); cx += 1) {
  for (let cz = Math.floor(haloBounds.minZ / 16); cz <= Math.floor(haloBounds.maxZ / 16); cz += 1) {
    touchedChunks.push({ x: cx, z: cz });
    const chunk = await regionReader.chunk(cx, cz);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (insideBounds(point, haloBounds)) blockEntityIntersections.push({ id: entity.id, point });
    }
    const entityChunk = await entityReader.chunk(cx, cz);
    for (const entity of entityChunk?.Entities ?? []) {
      if (savedEntityInside(entity, haloBounds)) {
        savedEntityIntersections.push({ id: entity.id ?? null, position: entity.Pos.slice(0, 3) });
      }
    }
  }
}
invariant(blockEntityIntersections.length === 0,
  'containment halo intersects a block entity');
invariant(savedEntityIntersections.length === 0,
  'containment halo intersects a saved movable entity');
const protectedIntersections = [];
for (const relic of protectedRelics.relics) {
  const cells = targetCells.filter((cell) => insideBounds(cell, relic.declaredInclusiveBounds));
  if (cells.length) protectedIntersections.push({ relic: relic.key, ...classManifest(cells) });
}
invariant(protectedIntersections.length === 0,
  'containment targets intersect a protected relic core');

const r02Targets = manifestTargets(r02Manifest);
const r06Targets = manifestTargets(r06Manifest);
const r09aTargets = manifestTargets(r09aManifest);
const r09bTargets = manifestTargets(r09bManifest);
const r02Overlap = intersection(targetCells, r02Targets);
const r06Overlap = intersection(targetCells, r06Targets);
const r09aOverlap = intersection(targetCells, r09aTargets);
const r09bOverlap = intersection(targetCells, r09bTargets);
invariant(r02Overlap.length === EXPECTED.r02OverlapCount
  && r06Overlap.length === 0
  && r09aOverlap.length === 0
  && r09bOverlap.length === 0,
'prior-release target overlap partition drifted');

const transitions = gapRecords.map(({ cell, state: sourceState }) => ({
  cell,
  sourceState,
  targetState: TARGET_STATE,
}));
const forwardBody = `${transitions.map(({ cell, sourceState, targetState }) => (
  replLine(cell, sourceState, targetState)
)).join('\n')}\n`;
const rollbackBody = `${transitions.slice().reverse().map(({
  cell, sourceState, targetState,
}) => replLine(cell, targetState, sourceState)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const forward = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.forward.txt`);
const rollback = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.rollback.txt`);
const header = (role, operationSha256) => [
  `# GENERATED FILE - CZ-R09C B07 stair safety completion (${role})`,
  `# source root: ${SNAPSHOT}`,
  `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
  `# target coordinate-set SHA-256: ${hashCells(targetCells)}`,
  `# operation SHA-256: ${operationSha256}`,
  '',
].join('\n');
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(forward), `${header('forward', forwardSha256)}${forwardBody}`);
fs.writeFileSync(absolute(rollback), `${header('rollback', rollbackSha256)}${rollbackBody}`);

const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_LATEST_ACCEPTED_POST_STATE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['Z06-PUBLIC-SHAFT-FITOUT'],
  packages: [{ key: PACKAGE_KEY, forward, rollback }],
  executionOrder: {
    forward: [PACKAGE_KEY],
    rollback: [PACKAGE_KEY],
    rationale: 'Close only current air gaps in the exact two-high outer containment and add the Y=5 terminal barrier extension; inverse removes those additions in reverse order.',
  },
  scope: {
    releaseId: 'CZ-R09C-P1-B07-STAIR-SAFETY-COMPLETION',
    releaseNodeId: RELEASE_NODE_ID,
    canonicalOwner: 'Z06-PUBLIC-SHAFT-FITOUT',
    purpose: 'Complete continuous fall containment around the accepted R09B helix and make its retained upper hold physically non-climbable from the landing.',
    geometry: {
      requiredOuterBarrier: classManifest(requiredOuterBarrier),
      upperCapExtension: classManifest(capExtension),
      candidateContainment: classManifest(candidateContainment),
      operatedAirGaps: classManifest(targetCells),
      retainedFullSolidBoundary: classManifest(retainedCells),
      controlledSourceGravityOverhangGap: classManifest(controlledAirGapCells),
      projectedCompleteContainment: classManifest(candidateContainment),
      preservedStairClearance: classManifest(stairClearance),
      interactionHalo: classManifest(halo),
    },
    ownership: {
      canonicalB07Construction: {
        cellCount: b07.construction.length,
        coordinateSetSha256: hashCells(b07.construction, D06_CELL_PREAMBLE),
      },
      canonicalB07Interaction: {
        cellCount: b07.interaction.length,
        coordinateSetSha256: hashCells(b07.interaction, D06_CELL_PREAMBLE),
      },
      candidateConstructionIntersection: classManifest(constructionCandidate),
      candidateInteractionOnly: classManifest(interactionOnlyCandidate),
      candidateOutsideB07InteractionCount: outsideB07.length,
      operatedConstructionIntersection: classManifest(operatedConstruction),
      operatedInteractionOnly: classManifest(operatedInteractionOnly),
      authorizationBasis: 'The R09 release contract assigns Z06-PUBLIC-SHAFT-FITOUT and the standing authorization includes exact physical domains; every target lies in the exact B07 construction or one-cell interaction domain.',
    },
    sourcePartition: {
      candidateStateCensus: stateCensus(candidateRecords),
      operatedSourceStateCensus: stateCensus(transitions, 'sourceState'),
      retainedFullSolidStateCensus: stateCensus(retainedRecords),
      desiredStateCensus: stateCensus(transitions, 'targetState'),
      controlledAirGapStateCensus: stateCensus(controlledAirGapRecords),
      exactPartition: targetCells.length + retainedCells.length + controlledAirGapCells.length
        === candidateContainment.length,
    },
    functionalProof: {
      orderedStairCellCount: stairRecords.length,
      orderedStairSha256,
      requiredBarrierLayersAboveEachStairCell: 2,
      projectedFullSolidBarrierCellCount: requiredOuterBarrier.length
        - controlledAirGapCells.length,
      controlledLowClearanceGravityOverhangCount: controlledAirGapCells.length,
      projectedUncontainedStairPositionCount: containmentFailures.length,
      stairClearanceTargetIntersectionCount: 0,
      stairClearancePreservedAirCellCount: stairClearance.length,
      upperLandingSurfaceY2: 8,
      existingCapY: [3, 4],
      extendedCapY: [3, 4, 5],
      capRiseAboveLandingBlocks: 2,
      capPhysicallyClimbableAfterProjection: false,
      routeCommissionableAfterPostQa: true,
    },
    materialDoctrine: {
      gapClosure: TARGET_STATE,
      retainedFullSolids: [...RETAINED_FULL_SOLID_NAMES].sort(),
      rule: 'Use a non-reactive full block for every air gap; retain exact supported full solids already completing the boundary.',
    },
    operationalBoundary: {
      r09bStairOrCoreTouched: false,
      r09aFloorTouched: false,
      r06TreatmentTouched: false,
      fluidsTouched: false,
      blockEntitiesTouched: false,
      entitiesTouched: false,
      liftPowerSmokeDrainageCommissioned: false,
      exactRollbackRestoresEveryGapToItsCurrentAirState: true,
    },
  },
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    regionSnapshotSha256: sourceIdentity.sha256,
    intakeAuditPath: INTAKE_AUDIT,
    sourceLedgerPath: SOURCE_LEDGER,
    sourceLedgerSha256: sourceLedgerBinding.sha256,
    sourceLedgerCompletedReleaseIdentitySha256: sourceLedger.completedReleaseIdentitySha256,
    touchedChunkCount: touchedChunks.length,
  },
  target: {
    operatedCellCount: targetCells.length,
    operatedCoordinateSetSha256: hashCells(targetCells),
    sourceStateCensus: stateCensus(transitions, 'sourceState'),
    desiredStateCensus: stateCensus(transitions, 'targetState'),
  },
  operations: {
    [PACKAGE_KEY]: {
      forwardSha256,
      rollbackSha256,
      forwardCommandCount: transitions.length,
      rollbackCommandCount: transitions.length,
      targetCellCount: transitions.length,
      targetCoordinateSetSha256: hashCells(targetCells),
      exactInverse: true,
      reverseOrderInverse: true,
      oneCellGuards: true,
    },
  },
  priorReleaseInterfaces: {
    r02ExcavationOverlap: {
      ...classManifest(r02Overlap),
      disposition: 'Declared current-air overlap; rollback restores the R02 achieved air state.',
    },
    r06TreatmentOverlap: classManifest(r06Overlap),
    r09aFloorOverlap: classManifest(r09aOverlap),
    r09bOperatedOverlap: classManifest(r09bOverlap),
    acceptedR09BPostQaPayloadSha256: r09bPostQa.qaPayloadSha256,
  },
  safetyBoundary: {
    targetFluidCount: haloFluids.filter(({ cell }) => targetKeys.has(cellKey(cell))).length,
    haloFluidCount: haloFluids.length,
    targetGravityCount: haloGravity.filter(({ cell }) => targetKeys.has(cellKey(cell))).length,
    retainedGravityCount: retainedGravity.length,
    controlledSourceFloatingGravityCount: floatingGravity.length,
    targetFaceAdjacentToControlledFloatingGravityCount:
      faceAdjacentTargetsToFloatingGravity.length,
    unsupportedRetainedGravityCount: unsupportedGravity.length,
    gravitySupportRemovedCount: 0,
    blockEntityIntersectionCount: blockEntityIntersections.length,
    savedEntityIntersectionCount: savedEntityIntersections.length,
    protectedRelicIntersectionCount: protectedIntersections.length,
    unsupportedRetainedBoundaryStateCount: unsupportedRetained.length,
  },
  standingAuthorization: {
    path: INPUTS.standingAuthorization,
    authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    status: authorization.status,
  },
  upstreamIdentities: {
    b07ConstructionSha256: EXPECTED.b07ConstructionSha256,
    b07InteractionSha256: EXPECTED.b07InteractionSha256,
    r02ManifestIdentity: r02Manifest.manifestIdentity,
    r06ManifestIdentity: r06Manifest.manifestIdentity,
    r09aManifestIdentity: r09aManifest.manifestIdentity,
    r09bManifestIdentity: r09bManifest.manifestIdentity,
  },
  hardSafetyKernelNext: [
    'fresh same-invocation complete source save',
    'exact source preflight and strict forward/rollback parser checks',
    'fresh live block-entity and entity clearance',
    'strict-noop execution with compensating rollback',
    'immutable post save and exact rollback-poststate preflight',
    'independent continuous-containment, cap-climbability, clearance, and undeclared-drift post QA before route commissioning',
  ],
};
const manifest = {
  ...manifestWithoutIdentity,
  manifestIdentity: sha256(JSON.stringify(manifestWithoutIdentity)),
};
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(JSON.stringify({
  status: manifest.status,
  manifest: relative(manifestPath),
  manifestIdentity: manifest.manifestIdentity,
  releaseNodeId: RELEASE_NODE_ID,
  sourceCompleteSaveSha256: intake.packageIdentity.completeSaveSha256,
  candidateContainmentCellCount: candidateContainment.length,
  operatedGapCellCount: targetCells.length,
  retainedSolidCellCount: retainedCells.length,
  operatedConstructionCount: operatedConstruction.length,
  operatedInteractionOnlyCount: operatedInteractionOnly.length,
  projectedUncontainedStairPositionCount: containmentFailures.length,
  capPhysicallyClimbableAfterProjection: false,
  forward,
  rollback,
}, null, 2));
