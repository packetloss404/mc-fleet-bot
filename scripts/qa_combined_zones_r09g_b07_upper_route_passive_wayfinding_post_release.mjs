#!/usr/bin/env node
/** Independent read-only R09G post-release QA and seal. */

import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  D06_CELL_PREAMBLE,
  boundsOf,
  cellKey,
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
const LEDGER = value(
  '--ledger',
  'data/world-review/combined-zones-r09g-live-20260822T020232Z/evidence-ledger.json',
);
const MANIFEST = value(
  '--manifest',
  'data/buildops/combined-zones-r09g-b07-upper-route-passive-wayfinding.release-manifest.json',
);
const OUT = value(
  '--out',
  'data/world-review/combined-zones-r09g-live-20260822T020232Z/r09g-post-release-qa.json',
);
const MARKDOWN = value(
  '--markdown',
  'data/world-review/combined-zones-r09g-live-20260822T020232Z/r09g-post-release-qa.md',
);
const GENERATED_AT = value('--generated-at', '2026-08-22T02:10:00Z');
const INPUTS = Object.freeze({
  mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  r09eManifest: 'data/buildops/combined-zones-r09e-b07-dry-upper-stair.release-manifest.json',
  r09fManifest: 'data/buildops/combined-zones-r09f-b07-enclosed-upper-interface.release-manifest.json',
});
const EXPECTED = Object.freeze({
  ledgerSha256: 'd48df08b9161cf9e0e5591581d96ebcdcfbedcc3948b1ae40b4729d10852d624',
  manifestFileSha256: 'b848df51c4bc9672044401ca27a9ca116b6b2d66c3f80f501df180f5aede624c',
  manifestIdentity: '4df5a9df25c56e4c0145e0a566354ecbd8d489fdde00cd585000c8328ebc67bb',
  completedReleaseIdentity: '6777fdf8c9629c32de06ef11348da49976fa8a9143560f34b7a0890645d18bf1',
  sourceComplete: '286aa211eb2aae65e1521a78fa9aefbb34e96e27ac95e5bb059d8faa8a2e33a9',
  sourceRegion: '215107701b45e6a9543bae3db0c212de783f381cfd151e3ed24f2485c5f8492a',
  postComplete: '123df9eb90e212c7de7497b189f28b41ee5ca03603d4f4dee2ba6c0895dd1e00',
  postRegion: 'a8ac3a94c0b5ec5167857abdabf212a8b4539b3f9ce675c3527a27fa5eec4379',
  forwardFileSha256: '49d1c82647fdf31d901bd46122cc43db02d0cb3148780a1668042130a67d5d65',
  rollbackFileSha256: '54a78510ac68e9bc72fc4cba11c5329a162e01b2b1d183c3326f9df409ed71c9',
  targetHash: '2daad521ed5e94bea26f765fb19c394d460355315fe01e27b9b586c6e0898e87',
  haloHash: '8cfb658c4eb8a69c13bee8af410772b2eb45c9ac074bf8738413f8d7f0d2361e',
  holdHash: '9562e3cdffe2ee63305486391b4b5758feb3bc7652e32b1e1f86f2d7a7c74e10',
  b07ConstructionHash: 'd58f20c6ad6581487e2a6ba72754d40ce22d49981da7450b44ad5e37325e5e59',
  b07InteractionHash: 'dd2cc387b0e5f6517ec48176c820e05f5fef5ff9793c74d32d4a5262582e5a8d',
});

const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R09G post-release QA rejected: ${message}`);
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
    stairs.push({
      index, cell: { x: point.x, y, z: point.z }, outer: { x: point.ox, y, z: point.oz },
      surfaceY2: (2 * y) + (index % 2 === 0 ? 1 : 2),
      targetState: index % 2 === 0
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
    const point = innerRing[(step + 1) % 16];
    const surfaceY2 = 122 + step;
    const y = Math.floor((surfaceY2 - 1) / 2);
    stairs.push({
      index: 87 + step, cell: { x: point.x, y, z: point.z }, outer: { x: point.ox, y, z: point.oz },
      surfaceY2,
      targetState: surfaceY2 % 2 === 1
        ? 'minecraft:smooth_stone_slab[type=bottom,waterlogged=false]'
        : 'minecraft:smooth_stone_slab[type=top,waterlogged=false]',
    });
  }
  const approach = [{ x: 2109, y: 71, z: -397 }, { x: 2108, y: 71, z: -397 }, topAnchor];
  for (let offset = 0; offset < 3; offset += 1) {
    const surfaceY2 = 143 + offset;
    stairs.push({
      index: 108 + offset, cell: approach[offset], outer: null, surfaceY2,
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
const r09e = readJson(INPUTS.r09eManifest);
const r09f = readJson(INPUTS.r09fManifest);
invariant(sha256(fs.readFileSync(abs(LEDGER))) === EXPECTED.ledgerSha256
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.transactionId === manifest.transactionId
  && ledger.releaseNodeId === manifest.releaseNodeId
  && ledger.completedReleaseIdentitySha256 === EXPECTED.completedReleaseIdentity,
'terminal ledger identity/status drifted');
invariant(sha256(fs.readFileSync(abs(MANIFEST))) === EXPECTED.manifestFileSha256
  && ledger.manifest.sha256 === EXPECTED.manifestFileSha256
  && manifest.manifestIdentity === EXPECTED.manifestIdentity,
'executed manifest binding drifted');
invariant(ledger.sourceSnapshot.completeSaveSha256 === EXPECTED.sourceComplete
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.postComplete,
'source/post complete-save identity drifted');
const sourceIdentity = readJson(ledger.sourceSnapshot.identity.path);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
invariant(sourceIdentity.sha256 === EXPECTED.sourceRegion
  && postIdentity.sha256 === EXPECTED.postRegion,
'source/post region identity drifted');
const sourceRoot = ledger.sourceSnapshot.root;
const postRoot = ledger.postSnapshot.root;
const sourceReader = new AnvilReader(abs(path.join(sourceRoot, 'region')));
const postReader = new AnvilReader(abs(path.join(postRoot, 'region')));
const sourceEntityReader = new AnvilReader(abs(path.join(sourceRoot, 'entities')));
const postEntityReader = new AnvilReader(abs(path.join(postRoot, 'entities')));
const state = async (reader, cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));

const pkg = manifest.packages[0];
const forward = parseOperations(pkg.forward);
const rollback = parseOperations(pkg.rollback);
const targets = forward.map(({ cell }) => cell);
const targetKeys = new Set(targets.map(cellKey));
invariant(forward.length === 8 && rollback.length === 8
  && hashCells(targets) === EXPECTED.targetHash
  && fileBinding(pkg.forward).sha256 === EXPECTED.forwardFileSha256
  && fileBinding(pkg.rollback).sha256 === EXPECTED.rollbackFileSha256,
'operation identity/count/target set drifted');
invariant(JSON.stringify(rollback) === JSON.stringify(forward.slice().reverse().map((entry) => ({
  cell: entry.cell, sourceState: entry.targetState, targetState: entry.sourceState,
}))), 'rollback is not the exact reverse-order inverse');

const targetResults = [];
for (const operation of forward) {
  targetResults.push({
    ...operation,
    sourceObserved: await state(sourceReader, operation.cell),
    postObserved: await state(postReader, operation.cell),
  });
}
invariant(targetResults.every((entry) => entry.sourceObserved === entry.sourceState
  && entry.postObserved === entry.targetState
  && entry.sourceState === 'minecraft:polished_andesite'
  && entry.targetState === 'minecraft:sea_lantern'),
'one or more exact target transitions mismatch');

const fixtureIndices = manifest.scope.fixtureCadence.routeIndices;
invariant(JSON.stringify(fixtureIndices) === JSON.stringify([1, 17, 33, 49, 65, 81, 97, 104])
  && manifest.scope.fixtureCadence.maximumRouteIndexDistanceToFixture === 8,
'fixture cadence drifted');
const stairs = buildStairs(mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem.anchors.top);
invariant(stairs.length === 111 && stairs.every((entry, index) => entry.index === index),
'accepted combined stair index drifted');
for (let index = 1; index < stairs.length; index += 1) {
  const previous = stairs[index - 1];
  const current = stairs[index];
  invariant(Math.abs(previous.cell.x - current.cell.x) + Math.abs(previous.cell.z - current.cell.z) === 1
    && current.surfaceY2 >= previous.surfaceY2 && current.surfaceY2 - previous.surfaceY2 <= 1,
  `stair topology drift at index ${index}`);
}
const route = stairs.map(({ cell }) => cell);
const routeKeys = new Set(route.map(cellKey));
const clearance = uniqueCells(stairs.flatMap(({ cell }) => [
  { x: cell.x, y: cell.y + 1, z: cell.z }, { x: cell.x, y: cell.y + 2, z: cell.z },
])).filter((cell) => !routeKeys.has(cellKey(cell)));
const holdCells = [{ x: 2108, y: 62, z: -395 }, { x: 2109, y: 62, z: -395 }];
invariant(clearance.length === 222 && hashCells(holdCells) === EXPECTED.holdHash,
'clearance/hold geometry drifted');
const clearanceResults = [];
for (const cell of clearance) clearanceResults.push({
  cell, sourceState: await state(sourceReader, cell), postState: await state(postReader, cell),
});
const clearanceAir = clearanceResults.filter(({ postState }) => stateName(postState) === 'minecraft:air');
const clearanceHold = clearanceResults.filter(({ postState }) => postState === 'minecraft:polished_diorite');
invariant(clearanceAir.length === 220 && clearanceHold.length === 2
  && hashCells(clearanceHold.map(({ cell }) => cell)) === EXPECTED.holdHash
  && clearanceResults.every(({ sourceState, postState }) => sourceState === postState),
'220-air plus exact two-cell R09F hold was not preserved');

const halo = cubeHalo(targets);
invariant(halo.length === 216 && hashCells(halo) === EXPECTED.haloHash, '216-cell halo drifted');
const haloDiff = [];
for (const cell of halo) {
  const sourceState = await state(sourceReader, cell);
  const postState = await state(postReader, cell);
  if (sourceState !== postState) haloDiff.push({ cell, sourceState, postState });
}
invariant(haloDiff.length === 8
  && hashCells(haloDiff.map(({ cell }) => cell)) === EXPECTED.targetHash,
'halo diff is not exactly the eight declared targets');

const b07 = deriveB07WestTwo(mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem);
invariant(b07.construction.length === 8134
  && hashCells(b07.construction, D06_CELL_PREAMBLE) === EXPECTED.b07ConstructionHash
  && b07.interaction.length === 13608
  && hashCells(b07.interaction, D06_CELL_PREAMBLE) === EXPECTED.b07InteractionHash,
'canonical B07 geometry drifted');
const interactionDiff = [];
const sourceSeaLanterns = [];
const postSeaLanterns = [];
for (const cell of b07.interaction) {
  const sourceState = await state(sourceReader, cell);
  const postState = await state(postReader, cell);
  if (sourceState !== postState) interactionDiff.push({ cell, sourceState, postState });
  if (sourceState === 'minecraft:sea_lantern') sourceSeaLanterns.push(cell);
  if (postState === 'minecraft:sea_lantern') postSeaLanterns.push(cell);
}
const introducedLights = postSeaLanterns.filter((cell) => !sourceSeaLanterns.some((source) => cellKey(source) === cellKey(cell)));
invariant(interactionDiff.length === 8
  && hashCells(interactionDiff.map(({ cell }) => cell)) === EXPECTED.targetHash
  && introducedLights.length === 8 && hashCells(introducedLights) === EXPECTED.targetHash,
'B07 off-target diff or introduced fixture set is not exact');

const priorTargets = uniqueCells([
  ...r09e.packages.flatMap(({ forward: filename }) => parseOperations(filename).map(({ cell }) => cell)),
  ...r09f.packages.flatMap(({ forward: filename }) => parseOperations(filename).map(({ cell }) => cell)),
]);
const retainedPriorTargets = priorTargets.filter((cell) => !targetKeys.has(cellKey(cell)));
const priorDrift = [];
for (const cell of retainedPriorTargets) {
  const sourceState = await state(sourceReader, cell);
  const postState = await state(postReader, cell);
  if (sourceState !== postState) priorDrift.push({ cell, sourceState, postState });
}
invariant(priorTargets.length === 1385 && retainedPriorTargets.length === 1377 && priorDrift.length === 0,
'retained R09E/R09F prior state drifted');

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

const evidenceBindingFailures = ledger.evidenceBindings.filter((binding) => (
  !fs.existsSync(abs(binding.path)) || fileBinding(binding.path).sha256 !== binding.sha256
  || fileBinding(binding.path).bytes !== binding.bytes
));
invariant(ledger.stages.length === 17 && ledger.stages.every(({ status }) => status === 'PASS')
  && ledger.evidenceBindings.length === 17 && evidenceBindingFailures.length === 0,
'wrapper stages or evidence bindings are incomplete/drifted');
const executionPath = path.join(path.dirname(LEDGER), `${manifest.packages[0].key}.forward-execution.json`);
const rollbackPreflightPath = path.join(path.dirname(LEDGER), `${manifest.packages[0].key}.rollback-poststate-preflight.json`);
const journalPath = `${executionPath}.stream-journal.jsonl`;
const execution = readJson(executionPath);
const rollbackPreflight = readJson(rollbackPreflightPath);
const journal = fs.readFileSync(abs(journalPath), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
invariant(execution.status === 'complete' && execution.strictNoop === true
  && execution.operationRole === 'forward' && execution.sourceOperationCount === 8
  && execution.sourceGroupCount === 8 && execution.successfulGroups === 8
  && execution.failedGroups === 0 && execution.noopCommands === 0
  && execution.worldEditLeftoverCount === 0
  && execution.forceLoadAudit?.allTemporaryReleased === true
  && execution.forceLoadAudit?.finalSetMatchesPreExistingSet === true,
'strict execution evidence failed');
invariant(journal.length === 22
  && journal.every(({ sequence }, index) => sequence === index + 1)
  && journal.at(-1).status === 'complete'
  && journal.at(-1).batch?.status === 'completed-cleaned'
  && journal.filter(({ batch }) => batch?.status === 'group-result'
    && batch?.activeGroupResult === 'passed').length === 8,
'execution journal is not exact and complete');
invariant(rollbackPreflight.status === 'PASS' && rollbackPreflight.passed === 8
  && rollbackPreflight.failed === 0 && rollbackPreflight.opsSha256 === EXPECTED.rollbackFileSha256
  && rollbackPreflight.regionsSnapshot.sha256 === EXPECTED.postRegion,
'rollback post-state preflight is not exact 8/8');

const checks = [
  ['R09G-QA-01-TERMINAL-IDENTITY-AND-17-STAGES', true],
  ['R09G-QA-02-EXACT-EIGHT-FIXTURE-TRANSITIONS', true],
  ['R09G-QA-03-EXACT-REVERSE-ORDER-INVERSE', true],
  ['R09G-QA-04-EIGHT-FIXTURE-CADENCE-MAX-DISTANCE-EIGHT', true],
  ['R09G-QA-05-EXACT-216-CELL-HALO-DIFF', true],
  ['R09G-QA-06-220-AIR-PLUS-TWO-CELL-R09F-HOLD-PRESERVED', true],
  ['R09G-QA-07-R09E-R09F-RETAINED-STATE-PRESERVED', true],
  ['R09G-QA-08-ZERO-B07-OFF-TARGET-OR-FIXTURE-SHAPE-DRIFT', true],
  ['R09G-QA-09-ENTITY-AND-BLOCK-ENTITY-PRESERVATION', true],
  ['R09G-QA-10-STRICT-JOURNALED-EXECUTION', true],
  ['R09G-QA-11-ROLLBACK-POSTSTATE-8-OF-8', true],
  ['R09G-QA-12-NO-ROUTE-OR-LIFE-SAFETY-COMMISSIONING-CLAIM', true],
];
const payload = {
  schemaVersion: 1,
  id: 'combined-zones-r09g-b07-upper-route-passive-wayfinding-post-release-qa',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R09G_B07_PASSIVE_WAYFINDING_POSTSTATE_VERIFIED_REVERSIBLE',
  release: {
    transactionId: manifest.transactionId,
    releaseNodeId: manifest.releaseNodeId,
    manifestIdentity: manifest.manifestIdentity,
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
  },
  bindings: {
    ledger: fileBinding(LEDGER), manifest: fileBinding(MANIFEST),
    sourceCompleteSaveSha256: ledger.sourceSnapshot.completeSaveSha256,
    sourceRegionSha256: sourceIdentity.sha256,
    postCompleteSaveSha256: ledger.postSnapshot.completeSaveSha256,
    postRegionSha256: postIdentity.sha256,
  },
  exactState: {
    targetCellCount: targetResults.length,
    sourceMatchingCellCount: targetResults.filter((entry) => entry.sourceObserved === entry.sourceState).length,
    postMatchingCellCount: targetResults.filter((entry) => entry.postObserved === entry.targetState).length,
    sourceState: 'minecraft:polished_andesite', targetState: 'minecraft:sea_lantern',
  },
  geometry: {
    fixtures: classManifest(targets), fixtureIndices,
    maximumRouteIndexDistanceToFixture: manifest.scope.fixtureCadence.maximumRouteIndexDistanceToFixture,
    orderedStairConstruction: classManifest(route),
    headClearance: { ...classManifest(clearance), airCellCount: clearanceAir.length, holdCellCount: clearanceHold.length },
    retainedR09fBarrierHold: classManifest(holdCells),
    halo: classManifest(halo),
  },
  drift: {
    haloChangedCellCount: haloDiff.length,
    haloUndeclaredChangedCellCount: haloDiff.filter(({ cell }) => !targetKeys.has(cellKey(cell))).length,
    b07InteractionCellCount: b07.interaction.length,
    b07InteractionChangedCellCount: interactionDiff.length,
    b07InteractionUndeclaredChangedCellCount: interactionDiff.filter(({ cell }) => !targetKeys.has(cellKey(cell))).length,
    introducedSeaLanternCellCount: introducedLights.length,
    offTargetIntroducedSeaLanternCellCount: introducedLights.filter((cell) => !targetKeys.has(cellKey(cell))).length,
  },
  preservation: {
    priorR09eR09fUnionCellCount: priorTargets.length,
    retainedPriorR09eR09fCellCount: retainedPriorTargets.length,
    retainedPriorR09eR09fChangedCellCount: priorDrift.length,
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
  checks: checks.map(([id, passed]) => ({ id, status: passed ? 'PASS' : 'FAIL' })),
  summary: {
    passed: checks.every(([, passed]) => passed),
    checkCount: checks.length,
    passCount: checks.filter(([, passed]) => passed).length,
    failCount: checks.filter(([, passed]) => !passed).length,
    exactTargetCellCount: targets.length,
    haloCellCount: halo.length,
    undeclaredB07ChangedCellCount: 0,
    rollbackReadyCellCount: rollbackPreflight.passed,
    inheritedTransitionHoldCellCount: clearanceHold.length,
    routeCommissioned: false,
  },
  safetyBoundary: {
    publicRouteCommissioned: false,
    fireServiceRouteCommissioned: false,
    emergencyOrLifeSafetyLightingCommissioned: false,
    inheritedR09fTransitionHoldResolved: false,
    liveCallsPerformedByQa: false,
    worldMutationPerformedByQa: false,
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(payload));
const report = { ...payload, qaPayloadSha256 };
fs.writeFileSync(abs(OUT), `${JSON.stringify(report, null, 2)}\n`);
const markdown = `# R09G B07 passive-wayfinding post-release QA\n\n`
  + `**Status:** ${report.status}  \n`
  + `**QA payload SHA-256:** \`${qaPayloadSha256}\`  \n`
  + `**Completed release identity:** \`${ledger.completedReleaseIdentitySha256}\`\n\n`
  + `All eight exact polished-andesite-to-sea-lantern transitions pass. The 216-cell halo and complete 13,608-cell B07 interaction domain contain exactly those eight changes, with no off-target fixture or property drift.\n\n`
  + `All 220 accepted air-clearance cells and the exact two-cell R09F polished-diorite barrier hold remain unchanged. All 1,377 non-fixture R09E/R09F target cells remain unchanged. The hold is preserved and route commissioning remains false.\n\n`
  + `The wrapper completed 17/17 stages with 17 bound artifacts, 22 ordered journal entries, eight successful strict groups, zero no-op commands, complete force-load cleanup, and an 8/8 rollback post-state preflight. This verifier made no live call or world mutation.\n`;
fs.writeFileSync(abs(MARKDOWN), markdown);
process.stdout.write(`${JSON.stringify({
  status: report.status, output: rel(OUT), markdown: rel(MARKDOWN), qaPayloadSha256,
  summary: report.summary,
}, null, 2)}\n`);
