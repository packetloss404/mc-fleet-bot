#!/usr/bin/env node
/** Independent, read-only R09E B07 dry upper-stair post-release QA. */

import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  cellsIn,
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
const GENERATED_AT = value('--generated-at', '2026-08-22T01:20:00Z');
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r09e-live-20260822T011348Z',
);
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r09e-b07-dry-upper-stair.release-manifest.json',
);
const SOURCE_ROOT = value(
  '--source-root',
  'data/worldsnap-combined-zones-r09e-source-20260822T011348Z',
);
const POST_ROOT = value(
  '--post-root',
  'data/worldsnap-combined-zones-r09e-post-20260822T011348Z',
);
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r09e-post-release-qa.json'));
const MARKDOWN_PATH = value(
  '--markdown',
  path.join(EVIDENCE_DIR, 'r09e-post-release-qa.md'),
);

const PRIOR_MANIFESTS = Object.freeze({
  r06WetTreatment: 'data/buildops/combined-zones-r06-support-liner.release-manifest.json',
  r07jSurfaceArchitecture:
    'data/buildops/combined-zones-r07j-b07-supported-surface-headhouse.release-manifest.json',
  r09aLowerLobby: 'data/buildops/combined-zones-r09-b07-lower-lobby-floor.release-manifest.json',
  r09bLowerStair:
    'data/buildops/combined-zones-r09b-b07-lower-spiral-stair.release-manifest.json',
  r09cSafetyCompletion:
    'data/buildops/combined-zones-r09c-b07-stair-safety-completion.release-manifest.json',
  r09dTerminalCrown:
    'data/buildops/combined-zones-r09d-b07-terminal-crown.release-manifest.json',
});

const EXPECTED = Object.freeze({
  ledgerSha256: 'da6787f28d21b2e3395b5dc86f9570a0eff152360d19ffdb19484e73c168b327',
  manifestSha256: '084ab0be0a94c63b93245be030b22412760a7af1b72d2ef9187b0d5d26cf5ec4',
  manifestIdentity: '10fb02c514bcd5bb14e7febf987ae9fa7f1c22ab9e5bbb4fcdb9f30698ffcc7f',
  sourceCompleteSaveSha256:
    '44ab7d9018dcfa1ca165fb4b8c8d79ecc98a677e1875ceeff6e9568ea9bf8f44',
  sourceRegionSha256: 'e03aff6c4be1efa772b08776a6d98e8eb50f34eea3e68518bd6b2e9cf68a46c9',
  postCompleteSaveSha256:
    '68b36cde83b73b4bd3fd696385fa43140fd60cd1ee5351189418103a1cf73694',
  postRegionSha256: 'c448fa5d6f623255f78d30de4f25d940f0881f6588fb8c02e5509635105ce784',
  sourceBoundReleaseIdentitySha256:
    '1c50d337c0032bfd814e4b35f4a43c59e4850b28753ecba2e7ee78a0d62365d5',
  completedReleaseIdentitySha256:
    '2ea1f26641a95b82078f10061a4c760b5b47cb2fd4586efb3fc1747069d6495e',
  deckCount: 49,
  frameworkCount: 1183,
  totalCount: 1232,
  coreCount: 1075,
  stairCount: 88,
  capCount: 2,
  crownCount: 16,
  outerBarrierCount: 176,
  clearanceCount: 176,
  haloCount: 2852,
  stageCount: 24,
  evidenceBindingCount: 25,
});

const AIR_NAMES = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FULL_SOLID_NAMES = new Set([
  'minecraft:stone', 'minecraft:dirt', 'minecraft:grass_block',
  'minecraft:granite', 'minecraft:diorite', 'minecraft:andesite',
  'minecraft:deepslate', 'minecraft:tuff', 'minecraft:copper_ore',
  'minecraft:iron_ore', 'minecraft:coal_ore', 'minecraft:gravel',
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:polished_andesite',
  'minecraft:polished_diorite',
]);

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R09E post-release QA rejected: ${message}`);
};
const samePath = (left, right) => absolute(left) === absolute(right);
const stateName = (state) => state.split('[', 1)[0];
const fileBinding = (filename) => ({
  path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))),
  bytes: fs.statSync(absolute(filename)).size,
});
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const stateCensus = (records, field = 'state') => {
  const counts = new Map();
  for (const record of records) counts.set(record[field], (counts.get(record[field]) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
};
const stateSetSha256 = (records) => sha256(
  `combined-zones-current-block-state-set-v1\n${records.slice().sort((left, right) => (
    left.cell.x - right.cell.x || left.cell.y - right.cell.y || left.cell.z - right.cell.z
  )).map(({ cell, state }) => `${cellKey(cell)}=${state}`).join('\n')}\n`,
);
const insideBounds = (cell, bounds) => (
  cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY
  && cell.z >= bounds.minZ && cell.z <= bounds.maxZ
);
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

function exactReverseInverse(forward, rollback) {
  return forward.length === rollback.length && rollback.every((operation, index) => {
    const inverse = forward.at(-(index + 1));
    return cellKey(operation.cell) === cellKey(inverse.cell)
      && operation.sourceState === inverse.targetState
      && operation.targetState === inverse.sourceState;
  });
}

async function states(reader, cells) {
  const output = [];
  for (const cell of uniqueCells(cells)) {
    output.push({
      cell,
      state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)),
    });
  }
  return output;
}

function changes(source, post) {
  const postByKey = new Map(post.map(({ cell, state }) => [cellKey(cell), state]));
  return source.filter(({ cell, state }) => state !== postByKey.get(cellKey(cell))).map((record) => ({
    cell: record.cell,
    sourceState: record.state,
    postState: postByKey.get(cellKey(record.cell)),
  }));
}

function desiredFailures(observed, desired) {
  const byKey = new Map(desired.map(({ cell, targetState }) => [cellKey(cell), targetState]));
  return observed.filter(({ cell, state }) => state !== byKey.get(cellKey(cell)));
}

function inspectJournal(filename, operationSha256, commandCount) {
  const lines = fs.readFileSync(absolute(filename), 'utf8').trim().split(/\r?\n/);
  const records = lines.map((line) => JSON.parse(line));
  return {
    ...fileBinding(filename),
    recordCount: records.length,
    expectedRecordCount: (2 * commandCount) + 6,
    firstStatus: records[0]?.status ?? null,
    lastStatus: records.at(-1)?.status ?? null,
    allOperationBindingsMatch: records.every((record) => (
      record.operationSha256 === undefined || record.operationSha256 === operationSha256
    )),
    passed: records.length === (2 * commandCount) + 6
      && records.every((record) => (
        record.operationSha256 === undefined || record.operationSha256 === operationSha256
      )),
  };
}

async function entityCensus(regionReader, entityReader, bounds) {
  const blockEntities = [];
  const savedEntities = [];
  for (let cx = Math.floor(bounds.minX / 16); cx <= Math.floor(bounds.maxX / 16); cx += 1) {
    for (let cz = Math.floor(bounds.minZ / 16); cz <= Math.floor(bounds.maxZ / 16); cz += 1) {
      const chunk = await regionReader.chunk(cx, cz);
      for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
        const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
        if (insideBounds(point, bounds)) blockEntities.push({ id: entity.id ?? null, point });
      }
      const entityChunk = await entityReader.chunk(cx, cz);
      for (const entity of entityChunk?.Entities ?? []) {
        if (savedEntityInside(entity, bounds)) {
          savedEntities.push({ id: entity.id ?? null, position: entity.Pos.slice(0, 3) });
        }
      }
    }
  }
  return { blockEntities, savedEntities };
}

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
const ledgerBinding = fileBinding(LEDGER_PATH);
const manifestBinding = fileBinding(MANIFEST_PATH);
invariant(ledgerBinding.sha256 === EXPECTED.ledgerSha256
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.mode === 'EXECUTE'
  && ledger.stages?.length === EXPECTED.stageCount
  && ledger.stages.every(({ status }) => status === 'PASS'),
'terminal wrapper ledger or stage state drifted');
invariant(ledger.transactionId === manifest.transactionId
  && ledger.releaseNodeId === manifest.releaseNodeId
  && samePath(ledger.manifest.path, MANIFEST_PATH)
  && ledger.manifest.sha256 === manifestBinding.sha256
  && manifestBinding.sha256 === EXPECTED.manifestSha256,
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
invariant(samePath(ledger.sourceSnapshot.root, SOURCE_ROOT)
  && samePath(ledger.postSnapshot.root, POST_ROOT)
  && sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && sourceIntake.packageIdentity.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && postIntake.packageIdentity.completeSaveSha256 === EXPECTED.postCompleteSaveSha256
  && sourceIdentity.sha256 === EXPECTED.sourceRegionSha256
  && postIdentity.sha256 === EXPECTED.postRegionSha256,
'immutable source/post identity drifted');
const evidenceBindingFailures = [];
for (const binding of ledger.evidenceBindings ?? []) {
  const current = fileBinding(binding.path);
  if (current.sha256 !== binding.sha256 || current.bytes !== binding.bytes) {
    evidenceBindingFailures.push({ expected: binding, observed: current });
  }
}
invariant(ledger.evidenceBindings.length === EXPECTED.evidenceBindingCount
  && evidenceBindingFailures.length === 0,
'wrapper evidence binding drifted');
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
invariant(ledger.sourceBoundReleaseIdentitySha256
    === EXPECTED.sourceBoundReleaseIdentitySha256
  && ledger.sourceBoundReleaseIdentitySha256 === recomputedSourceBoundIdentity
  && ledger.completedReleaseIdentitySha256 === EXPECTED.completedReleaseIdentitySha256
  && ledger.completedReleaseIdentitySha256 === recomputedCompletedIdentity,
'completed release identity drifted');

const packageRecords = manifest.packages.map((releasePackage, index) => {
  const ledgerPackage = ledger.packages[index];
  invariant(releasePackage.key === ledgerPackage.key, 'package order drifted');
  const forwardBinding = fileBinding(releasePackage.forward);
  const rollbackBinding = fileBinding(releasePackage.rollback);
  invariant(forwardBinding.sha256 === ledgerPackage.forward.sha256
    && rollbackBinding.sha256 === ledgerPackage.rollback.sha256,
  `${releasePackage.key} operation file binding drifted`);
  const forward = expandOperations(releasePackage.forward);
  const rollback = expandOperations(releasePackage.rollback);
  invariant(exactReverseInverse(forward, rollback), `${releasePackage.key} is not an exact inverse`);
  return { releasePackage, ledgerPackage, forwardBinding, rollbackBinding, forward, rollback };
});
const deckPackage = packageRecords[0];
const frameworkPackage = packageRecords[1];
const targetRecords = packageRecords.flatMap(({ forward }) => forward);
const targetCells = targetRecords.map(({ cell }) => cell);
const targetKeys = new Set(targetCells.map(cellKey));
invariant(deckPackage.forward.length === EXPECTED.deckCount
  && frameworkPackage.forward.length === EXPECTED.frameworkCount
  && targetRecords.length === EXPECTED.totalCount
  && targetKeys.size === EXPECTED.totalCount
  && hashCells(targetCells) === manifest.target.operatedCoordinateSetSha256,
'target operation union drifted');

const deck = cellsIn({ minX: 2105, maxX: 2111, minY: 18, maxY: 18, minZ: -401, maxZ: -395 });
const core = cellsIn({ minX: 2106, maxX: 2110, minY: 19, maxY: 61, minZ: -400, maxZ: -396 });
const ring = [];
for (let x = 2105; x <= 2111; x += 1) ring.push({ x, z: -401, ox: x, oz: -402 });
for (let z = -400; z <= -395; z += 1) ring.push({ x: 2111, z, ox: 2112, oz: z });
for (let x = 2110; x >= 2105; x -= 1) ring.push({ x, z: -395, ox: x, oz: -394 });
for (let z = -396; z >= -400; z -= 1) ring.push({ x: 2105, z, ox: 2104, oz: z });
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
  });
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
const clearance = uniqueCells(stairs.flatMap(({ cell }) => [
  { x: cell.x, y: cell.y + 1, z: cell.z },
  { x: cell.x, y: cell.y + 2, z: cell.z },
]));
const outerBarrier = uniqueCells(stairs.flatMap(({ outer }) => [
  { x: outer.x, y: outer.y + 1, z: outer.z },
  { x: outer.x, y: outer.y + 2, z: outer.z },
]));
const halo = cubeHalo(targetCells);
const lowerWetBuffer = cellsIn({ minX: 2104, maxX: 2112, minY: 17, maxY: 17, minZ: -403, maxZ: -394 });
const upperSurfaceBuffer = cellsIn({ minX: 2104, maxX: 2112, minY: 63, maxY: 63, minZ: -403, maxZ: -394 });
invariant(deck.length === EXPECTED.deckCount && core.length === EXPECTED.coreCount
  && stairs.length === EXPECTED.stairCount && cap.length === EXPECTED.capCount
  && crown.length === EXPECTED.crownCount && clearance.length === EXPECTED.clearanceCount
  && outerBarrier.length === EXPECTED.outerBarrierCount && halo.length === EXPECTED.haloCount,
'derived B07 upper-stair geometry drifted');
const stairTopologyFailures = [];
for (let index = 1; index < stairs.length; index += 1) {
  const prior = stairs[index - 1];
  const current = stairs[index];
  const cardinalDistance = Math.abs(prior.cell.x - current.cell.x)
    + Math.abs(prior.cell.z - current.cell.z);
  const rise = current.surfaceY2 - prior.surfaceY2;
  if (cardinalDistance !== 1 || rise < 0 || rise > 1) {
    stairTopologyFailures.push({ index, cardinalDistance, rise });
  }
}

const priorRecords = Object.fromEntries(Object.entries(PRIOR_MANIFESTS).map(([key, filename]) => {
  const priorManifest = readJson(filename);
  return [key, priorManifest.packages.flatMap(({ forward }) => expandOperations(forward))];
}));
invariant(priorRecords.r06WetTreatment.length === 1530
  && priorRecords.r07jSurfaceArchitecture.length === 237
  && priorRecords.r09aLowerLobby.length === 63
  && priorRecords.r09bLowerStair.length === 1705
  && priorRecords.r09cSafetyCompletion.length === 127
  && priorRecords.r09dTerminalCrown.length === 16,
'prior-release operation inventory drifted');

const sourceReader = new AnvilReader(absolute(path.join(SOURCE_ROOT, 'region')));
const postReader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
const sourceEntityReader = new AnvilReader(absolute(path.join(SOURCE_ROOT, 'entities')));
const postEntityReader = new AnvilReader(absolute(path.join(POST_ROOT, 'entities')));
const [sourceTargets, postTargets, sourceHalo, postHalo, sourceClearance, postClearance,
  sourceOuterBarrier, postOuterBarrier, sourceLowerBuffer, postLowerBuffer,
  sourceUpperBuffer, postUpperBuffer] = await Promise.all([
  states(sourceReader, targetCells), states(postReader, targetCells),
  states(sourceReader, halo), states(postReader, halo),
  states(sourceReader, clearance), states(postReader, clearance),
  states(sourceReader, outerBarrier), states(postReader, outerBarrier),
  states(sourceReader, lowerWetBuffer), states(postReader, lowerWetBuffer),
  states(sourceReader, upperSurfaceBuffer), states(postReader, upperSurfaceBuffer),
]);
const priorObservations = {};
for (const [key, records] of Object.entries(priorRecords)) {
  const [source, post] = await Promise.all([
    states(sourceReader, records.map(({ cell }) => cell)),
    states(postReader, records.map(({ cell }) => cell)),
  ]);
  const stateChanges = changes(source, post);
  priorObservations[key] = {
    cellCount: records.length,
    sourceStateSetSha256: stateSetSha256(source),
    postStateSetSha256: stateSetSha256(post),
    changedCellCount: stateChanges.length,
    sourceDesiredMismatchCount: desiredFailures(source, records).length,
    postDesiredMismatchCount: desiredFailures(post, records).length,
  };
}
const sourceTargetFailures = sourceTargets.filter(({ state }) => state !== 'minecraft:air');
const postTargetFailures = desiredFailures(postTargets, targetRecords);
const targetChanges = changes(sourceTargets, postTargets);
const haloChanges = changes(sourceHalo, postHalo);
const declaredHaloChanges = haloChanges.filter(({ cell }) => targetKeys.has(cellKey(cell)));
const undeclaredHaloChanges = haloChanges.filter(({ cell }) => !targetKeys.has(cellKey(cell)));
const lifecycleTransitions = undeclaredHaloChanges.filter(({ sourceState, postState }) => (
  sourceState !== postState
));
const clearanceFailures = postClearance.filter(({ state }) => !AIR_NAMES.has(stateName(state)));
const clearanceChanges = changes(sourceClearance, postClearance);
const lowerBufferChanges = changes(sourceLowerBuffer, postLowerBuffer);
const upperBufferChanges = changes(sourceUpperBuffer, postUpperBuffer);

const postOuterByKey = new Map(postOuterBarrier.map(({ cell, state }) => [cellKey(cell), state]));
const sourceOuterByKey = new Map(sourceOuterBarrier.map(({ cell, state }) => [cellKey(cell), state]));
const operatedOuterKeys = new Set(frameworkPackage.forward.filter(({ cell }) => (
  outerBarrier.some((outer) => cellKey(outer) === cellKey(cell))
)).map(({ cell }) => cellKey(cell)));
const containmentFailures = [];
for (const stair of stairs) {
  const lower = { x: stair.outer.x, y: stair.outer.y + 1, z: stair.outer.z };
  const upper = { x: stair.outer.x, y: stair.outer.y + 2, z: stair.outer.z };
  const lowerSolid = FULL_SOLID_NAMES.has(stateName(postOuterByKey.get(cellKey(lower)) ?? ''));
  const upperSolid = FULL_SOLID_NAMES.has(stateName(postOuterByKey.get(cellKey(upper)) ?? ''));
  const availableHeight = upper.y - (stair.surfaceY2 / 2);
  if (!((lowerSolid && upperSolid) || (!lowerSolid && upperSolid && availableHeight < 1.8))) {
    containmentFailures.push({ stairIndex: stair.index, lower, upper, availableHeight });
  }
}
const retainedBarrierChanges = outerBarrier.filter((cell) => !operatedOuterKeys.has(cellKey(cell)))
  .filter((cell) => sourceOuterByKey.get(cellKey(cell)) !== postOuterByKey.get(cellKey(cell)));
const retainedBarrierFailures = outerBarrier.filter((cell) => !operatedOuterKeys.has(cellKey(cell)))
  .filter((cell) => !FULL_SOLID_NAMES.has(stateName(postOuterByKey.get(cellKey(cell)) ?? '')));

const haloBounds = boundsOf(halo);
const [sourceEntities, postEntities] = await Promise.all([
  entityCensus(sourceReader, sourceEntityReader, haloBounds),
  entityCensus(postReader, postEntityReader, haloBounds),
]);

const executionEvidence = {};
for (const record of packageRecords) {
  const key = record.releasePackage.key;
  const executionPath = path.join(EVIDENCE_DIR, `${key}.forward-execution.json`);
  const rollbackPath = path.join(EVIDENCE_DIR, `${key}.rollback-poststate-preflight.json`);
  const sameMomentPath = path.join(EVIDENCE_DIR, `${key}.same-moment-entity-clearance.json`);
  const execution = readJson(executionPath);
  const rollback = readJson(rollbackPath);
  const sameMoment = readJson(sameMomentPath);
  const journal = inspectJournal(execution.streamJournal, record.ledgerPackage.forward.sha256,
    record.forward.length);
  const executionPassed = execution.status === 'complete'
    && execution.strictNoop === true
    && execution.operationRole === 'forward'
    && execution.operationSha256 === record.ledgerPackage.forward.sha256
    && execution.successfulGroups === record.forward.length
    && execution.successfulCommands === record.forward.length
    && execution.failedGroups === 0 && execution.failedCommands === 0
    && execution.noopCommands === 0 && execution.unknownReplyCommands === 0
    && execution.worldEditLeftoverCount === 0
    && execution.forceLoadAudit?.allRequiredChunksLoadedBeforeCommands === true
    && execution.forceLoadAudit?.allTemporaryReleased === true
    && execution.forceLoadAudit?.finalSetMatchesPreExistingSet === true
    && execution.streamJournalSha256 === journal.sha256 && journal.passed;
  const rollbackPassed = rollback.status === 'PASS'
    && rollback.passed === record.rollback.length && rollback.failed === 0
    && rollback.opsSha256 === record.ledgerPackage.rollback.sha256
    && rollback.regionsSnapshot?.sha256 === EXPECTED.postRegionSha256;
  const entityPassed = sameMoment.status === 'PASS'
    && sameMoment.totals?.blockingEntityHits === 0;
  executionEvidence[key] = {
    strictForwardExecution: {
      ...fileBinding(executionPath),
      operationSha256: execution.operationSha256,
      successfulGroups: execution.successfulGroups,
      failedGroups: execution.failedGroups,
      noopCommands: execution.noopCommands,
      unknownReplyCommands: execution.unknownReplyCommands,
      journal,
      passed: executionPassed,
    },
    rollbackPoststatePreflight: {
      ...fileBinding(rollbackPath),
      opsSha256: rollback.opsSha256,
      passedGuards: rollback.passed,
      failedGuards: rollback.failed,
      regionSnapshotSha256: rollback.regionsSnapshot?.sha256,
      passed: rollbackPassed,
    },
    sameMomentEntityClearance: {
      ...fileBinding(sameMomentPath),
      blockingEntityHits: sameMoment.totals?.blockingEntityHits,
      passed: entityPassed,
    },
  };
}
const blockEntityPath = path.join(EVIDENCE_DIR, 'block-entity-clearance.json');
const liveEntityPath = path.join(EVIDENCE_DIR, 'live-entity-clearance.json');
const blockEntityGate = readJson(blockEntityPath);
const liveEntityGate = readJson(liveEntityPath);
const entityGatesPassed = blockEntityGate.status === 'PASS'
  && blockEntityGate.blockingBlockEntityCount === 0
  && liveEntityGate.status === 'PASS'
  && liveEntityGate.totals?.blockingEntityHits === 0
  && Object.values(executionEvidence).every(({ sameMomentEntityClearance }) => (
    sameMomentEntityClearance.passed
  ));

const operatedDesiredCensus = stateCensus(targetRecords, 'targetState');
const checks = [
  ['R09E-QA-01-TERMINAL-IDENTITY-AND-24-STAGES', true],
  ['R09E-QA-02-TWO-PACKAGE-REVERSE-ORDER-EXACT-INVERSE',
    packageRecords.every(({ forward, rollback }) => exactReverseInverse(forward, rollback))],
  ['R09E-QA-03-EXACT-49-DECK-TARGETS', deckPackage.forward.length === 49],
  ['R09E-QA-04-EXACT-1183-FRAMEWORK-TARGETS', frameworkPackage.forward.length === 1183],
  ['R09E-QA-05-EXACT-1232-SOURCE-AIR', sourceTargetFailures.length === 0],
  ['R09E-QA-06-EXACT-1232-POST-STATES', postTargetFailures.length === 0],
  ['R09E-QA-07-MATERIAL-CENSUS', JSON.stringify(operatedDesiredCensus)
    === JSON.stringify(manifest.target.desiredStateCensus)],
  ['R09E-QA-08-STAIR-88-CARDINAL-HALF-STEP-CONTINUITY', stairTopologyFailures.length === 0],
  ['R09E-QA-09-HEAD-CLEARANCE-176-PRESERVED',
    clearanceFailures.length === 0 && clearanceChanges.length === 0],
  ['R09E-QA-10-OUTER-BARRIER-176-CONTAINED',
    containmentFailures.length === 0 && retainedBarrierFailures.length === 0
      && retainedBarrierChanges.length === 0 && operatedOuterKeys.size === 2],
  ['R09E-QA-11-CAPS-AND-CROWN-CLOSED',
    postTargetFailures.filter(({ cell }) => (
      [...cap, ...crown, ...deck].some((candidate) => cellKey(candidate) === cellKey(cell))
    )).length === 0],
  ['R09E-QA-12-LOWER-WET-BUFFER-AND-R06-PRESERVED',
    lowerBufferChanges.length === 0 && priorObservations.r06WetTreatment.changedCellCount === 0],
  ['R09E-QA-13-UPPER-R07J-BUFFER-PRESERVED',
    upperBufferChanges.length === 0
      && priorObservations.r07jSurfaceArchitecture.changedCellCount === 0],
  ['R09E-QA-14-R09A-D-PRESERVED',
    ['r09aLowerLobby', 'r09bLowerStair', 'r09cSafetyCompletion', 'r09dTerminalCrown']
      .every((key) => priorObservations[key].changedCellCount === 0
        && priorObservations[key].postDesiredMismatchCount === 0)],
  ['R09E-QA-15-ZERO-UNDECLARED-HALO-DRIFT',
    haloChanges.length === EXPECTED.totalCount
      && declaredHaloChanges.length === EXPECTED.totalCount
      && undeclaredHaloChanges.length === 0],
  ['R09E-QA-16-ZERO-SNAPSHOT-ENTITY-OR-BLOCK-ENTITY-INTERSECTION',
    sourceEntities.blockEntities.length === 0 && sourceEntities.savedEntities.length === 0
      && postEntities.blockEntities.length === 0 && postEntities.savedEntities.length === 0],
  ['R09E-QA-17-LIVE-ENTITY-AND-BLOCK-ENTITY-GATES', entityGatesPassed],
  ['R09E-QA-18-STRICT-JOURNALED-TWO-PACKAGE-EXECUTION',
    Object.values(executionEvidence).every(({ strictForwardExecution }) => (
      strictForwardExecution.passed
    ))],
  ['R09E-QA-19-REVERSE-1183-THEN-49-READY',
    ledger.rollbackPoststatePreflights.length === 2
      && ledger.rollbackPoststatePreflights[0].path.includes('stair-framework')
      && ledger.rollbackPoststatePreflights[1].path.includes('containment-deck')
      && Object.values(executionEvidence).every(({ rollbackPoststatePreflight }) => (
        rollbackPoststatePreflight.passed
      ))],
  ['R09E-QA-20-ROUTE-REMAINS-FAIL-CLOSED-AND-UNCOMMISSIONED',
    manifest.scope.operationalBoundary.lowerInterfaceClosed === true
      && manifest.scope.operationalBoundary.upperInterfaceClosed === true
      && manifest.scope.operationalBoundary.upperStairCommissioned === false
      && manifest.scope.operationalBoundary.routeBeyondR09DHoldCommissioned === false],
].map(([id, passed]) => ({ id, status: passed ? 'PASS' : 'FAIL' }));
const failedChecks = checks.filter(({ status }) => status === 'FAIL');
invariant(failedChecks.length === 0,
  `checks failed: ${failedChecks.map(({ id }) => id).join(', ')}`);

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R09E_B07_DRY_UPPER_STAIR_POSTSTATE_VERIFIED_REVERSIBLE_FAIL_CLOSED',
  release: {
    transactionId: ledger.transactionId,
    releaseNodeId: ledger.releaseNodeId,
    scopeIds: manifest.scopeIds,
    manifestIdentity: manifest.manifestIdentity,
    sourceBoundReleaseIdentitySha256: ledger.sourceBoundReleaseIdentitySha256,
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
  },
  bindings: {
    ledger: { ...ledgerBinding, status: ledger.status },
    manifest: { ...manifestBinding, manifestIdentity: manifest.manifestIdentity },
    evidenceBindingCount: ledger.evidenceBindings.length,
    evidenceBindingFailures,
    sourceCompleteSave: {
      completeSaveSha256: sourceIntake.packageIdentity.completeSaveSha256,
      regionSnapshotSha256: sourceIdentity.sha256,
    },
    postCompleteSave: {
      completeSaveSha256: postIntake.packageIdentity.completeSaveSha256,
      regionSnapshotSha256: postIdentity.sha256,
    },
  },
  geometry: {
    lowerContainmentDeck: classManifest(deck),
    staticCore: classManifest(core),
    orderedStairAndLanding: classManifest(stairs.map(({ cell }) => cell)),
    upperRetainedCap: classManifest(cap),
    upperCoreCrown: classManifest(crown),
    outerBarrier: classManifest(outerBarrier),
    headClearance: classManifest(clearance),
    operatedUnion: classManifest(targetCells),
    interactionHalo: classManifest(halo),
    lowerWetBufferPlane: classManifest(lowerWetBuffer),
    upperR07jBufferPlane: classManifest(upperSurfaceBuffer),
  },
  exactState: {
    sourceCensus: stateCensus(sourceTargets),
    desiredCensus: operatedDesiredCensus,
    postCensus: stateCensus(postTargets),
    sourceMatchingCellCount: targetRecords.length - sourceTargetFailures.length,
    sourceMismatchCount: sourceTargetFailures.length,
    postMatchingCellCount: targetRecords.length - postTargetFailures.length,
    postMismatchCount: postTargetFailures.length,
    deckMatchingCellCount: deckPackage.forward.length,
    frameworkMatchingCellCount: frameworkPackage.forward.length,
    exactReverseOrderInverseByPackage: Object.fromEntries(packageRecords.map((record) => [
      record.releasePackage.key,
      exactReverseInverse(record.forward, record.rollback),
    ])),
  },
  topology: {
    orderedStepCount: stairs.length,
    cardinalAdjacencyCount: stairs.length - 1 - stairTopologyFailures.length,
    maximumRiseHalfBlocks: Math.max(...stairs.slice(1).map((step, index) => (
      step.surfaceY2 - stairs[index].surfaceY2
    ))),
    topologyFailureCount: stairTopologyFailures.length,
    topologyFailures: stairTopologyFailures,
    lowestSurfaceY2: stairs[0].surfaceY2,
    highestSurfaceY2: stairs.at(-1).surfaceY2,
  },
  containment: {
    headClearanceAirCellCount: clearance.length - clearanceFailures.length,
    headClearanceMismatchCount: clearanceFailures.length,
    headClearanceChangedCellCount: clearanceChanges.length,
    requiredOuterBarrierCellCount: outerBarrier.length,
    retainedOuterBarrierCellCount: outerBarrier.length - operatedOuterKeys.size,
    operatedOuterGapCellCount: operatedOuterKeys.size,
    containmentFailureCount: containmentFailures.length,
    retainedBarrierChangedCellCount: retainedBarrierChanges.length,
    retainedBarrierFailureCount: retainedBarrierFailures.length,
    lowerInterfaceDeckClosedCellCount: deck.length,
    upperRetainedCapCellCount: cap.length,
    upperCoreCrownCellCount: crown.length,
    lowerInterfaceClosed: true,
    upperInterfaceClosed: true,
    upperStairCommissioned: false,
  },
  preservation: {
    priorReleaseTargets: priorObservations,
    lowerWetBuffer: {
      cellCount: lowerWetBuffer.length,
      changedCellCount: lowerBufferChanges.length,
      sourceStateSetSha256: stateSetSha256(sourceLowerBuffer),
      postStateSetSha256: stateSetSha256(postLowerBuffer),
    },
    upperR07jBuffer: {
      cellCount: upperSurfaceBuffer.length,
      changedCellCount: upperBufferChanges.length,
      sourceStateSetSha256: stateSetSha256(sourceUpperBuffer),
      postStateSetSha256: stateSetSha256(postUpperBuffer),
    },
  },
  drift: {
    interactionHaloCellCount: halo.length,
    sourceStateSetSha256: stateSetSha256(sourceHalo),
    postStateSetSha256: stateSetSha256(postHalo),
    changedCellCount: haloChanges.length,
    declaredTargetChangedCellCount: declaredHaloChanges.length,
    undeclaredChangedCellCount: undeclaredHaloChanges.length,
    lifecycleTransitionCount: lifecycleTransitions.length,
    lifecycleTransitions,
  },
  entityAndBlockEntityPreservation: {
    sourceSnapshotBlockEntityCount: sourceEntities.blockEntities.length,
    sourceSnapshotSavedEntityCount: sourceEntities.savedEntities.length,
    postSnapshotBlockEntityCount: postEntities.blockEntities.length,
    postSnapshotSavedEntityCount: postEntities.savedEntities.length,
    wrapperBlockEntityGate: { ...fileBinding(blockEntityPath), passed: blockEntityGate.status === 'PASS' },
    wrapperLiveEntityGate: { ...fileBinding(liveEntityPath), passed: liveEntityGate.status === 'PASS' },
  },
  executionEvidence: {
    wrapperStageCount: ledger.stages.length,
    wrapperPassedStageCount: ledger.stages.filter(({ status }) => status === 'PASS').length,
    wrapperFailedStageCount: ledger.stages.filter(({ status }) => status !== 'PASS').length,
    packageEvidence: executionEvidence,
    rollbackOrder: ledger.rollbackPoststatePreflights.map(({ path: reportPath }) => reportPath),
  },
  checks,
  summary: {
    passed: true,
    checkCount: checks.length,
    passCount: checks.length - failedChecks.length,
    failCount: failedChecks.length,
    exactTargetCellCount: targetRecords.length,
    deckCellCount: deckPackage.forward.length,
    frameworkCellCount: frameworkPackage.forward.length,
    priorReleaseChangedCellCount: Object.values(priorObservations)
      .reduce((sum, record) => sum + record.changedCellCount, 0),
    undeclaredHaloChangedCellCount: undeclaredHaloChanges.length,
    rollbackReadyCellCount: packageRecords.reduce((sum, record) => sum + record.rollback.length, 0),
    routeCommissioned: false,
  },
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    readOnlyAnvilInputs: true,
    publicOrFireServiceCommissioningGranted: false,
  },
};
const report = {
  ...reportWithoutIdentity,
  qaPayloadSha256: sha256(JSON.stringify(reportWithoutIdentity)),
};
const markdown = [
  '# CZ-R09E B07 Dry Upper Stair Post-Release QA',
  '',
  `Status: **${report.status}**`,
  '',
  `QA payload SHA-256: \`${report.qaPayloadSha256}\``,
  '',
  `Completed release identity: \`${report.release.completedReleaseIdentitySha256}\``,
  '',
  '## Verified closeout',
  '',
  `- Exact target states: ${report.summary.exactTargetCellCount}/${report.summary.exactTargetCellCount} (${report.summary.deckCellCount} deck + ${report.summary.frameworkCellCount} framework).`,
  `- Stair topology: ${report.topology.orderedStepCount} cardinal half-step surfaces, maximum rise ${report.topology.maximumRiseHalfBlocks} half-block, ${report.containment.headClearanceAirCellCount} clearance cells.`,
  `- Containment: ${report.containment.requiredOuterBarrierCellCount}/${report.containment.requiredOuterBarrierCellCount} barrier cells, ${report.containment.upperRetainedCapCellCount} terminal caps, ${report.containment.upperCoreCrownCellCount} crown cells.`,
  `- Bounded source/post diff: ${report.drift.changedCellCount} declared target changes, ${report.drift.undeclaredChangedCellCount} undeclared halo changes, ${report.drift.lifecycleTransitionCount} lifecycle transitions.`,
  `- Wrapper: ${report.executionEvidence.wrapperPassedStageCount}/${report.executionEvidence.wrapperStageCount} stages PASS; reverse guards ${report.summary.rollbackReadyCellCount}/${report.summary.rollbackReadyCellCount}.`,
  '- R06 wet treatment, the y=17 lower buffer, R07J surface architecture, the y=63 upper buffer, and all R09A-D material targets are unchanged.',
  '- Source/post saved entities and block entities are absent from the complete 2,852-cell interaction halo; wrapper live and same-moment entity gates also passed.',
  '- Both termini remain fail-closed. This is a construction acceptance, not public-route, fire-service, lift, power, smoke, or drainage commissioning.',
  '',
  '## Checks',
  '',
  ...checks.map(({ id, status }) => `- ${id}: ${status}`),
  '',
].join('\n');

fs.mkdirSync(path.dirname(absolute(OUT_PATH)), { recursive: true });
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(MARKDOWN_PATH), markdown);
process.stdout.write(`${JSON.stringify({
  status: report.status,
  qaPayloadSha256: report.qaPayloadSha256,
  report: relative(OUT_PATH),
  markdown: relative(MARKDOWN_PATH),
  exactTargetCellCount: report.summary.exactTargetCellCount,
  deckCellCount: report.summary.deckCellCount,
  frameworkCellCount: report.summary.frameworkCellCount,
  haloCellCount: report.drift.interactionHaloCellCount,
  undeclaredHaloChangedCellCount: report.drift.undeclaredChangedCellCount,
  wrapperPassedStages: report.executionEvidence.wrapperPassedStageCount,
  rollbackReadyCellCount: report.summary.rollbackReadyCellCount,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2)}\n`);
