#!/usr/bin/env node
/** Independent, read-only R09F B07 enclosed upper-interface post-release QA. */

import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
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
const GENERATED_AT = value('--generated-at', '2026-08-22T01:43:00Z');
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r09f-live-20260822T013916Z',
);
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r09f-b07-enclosed-upper-interface.release-manifest.json',
);
const SOURCE_ROOT = value(
  '--source-root',
  'data/worldsnap-combined-zones-r09f-source-20260822T013916Z',
);
const POST_ROOT = value(
  '--post-root',
  'data/worldsnap-combined-zones-r09f-post-20260822T013916Z',
);
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r09f-post-release-qa.json'));
const MARKDOWN_PATH = value(
  '--markdown',
  path.join(EVIDENCE_DIR, 'r09f-post-release-qa.md'),
);

const PRIOR_MANIFESTS = Object.freeze({
  r06WetTreatment: 'data/buildops/combined-zones-r06-support-liner.release-manifest.json',
  r07jSurfaceHeadhouse:
    'data/buildops/combined-zones-r07j-b07-supported-surface-headhouse.release-manifest.json',
  r09aLowerLobby: 'data/buildops/combined-zones-r09-b07-lower-lobby-floor.release-manifest.json',
  r09bLowerStair:
    'data/buildops/combined-zones-r09b-b07-lower-spiral-stair.release-manifest.json',
  r09cSafetyCompletion:
    'data/buildops/combined-zones-r09c-b07-stair-safety-completion.release-manifest.json',
  r09dTerminalCrown:
    'data/buildops/combined-zones-r09d-b07-terminal-crown.release-manifest.json',
  r09eDryUpperStair:
    'data/buildops/combined-zones-r09e-b07-dry-upper-stair.release-manifest.json',
});

const EXPECTED = Object.freeze({
  ledgerSha256: '60c7106107ee5f03cffc7771a68c4c570bd06a99d508996472737162780f2c30',
  manifestSha256: '2c43d9ad4b16b250fb716ad2a9e9e069bfd204712c363dd12792b696bfa9befb',
  manifestIdentity: 'bdec6c796b92aee6b4d97da9e70945601f547e0b7f41eeb562b5cfec09a4d588',
  sourceCompleteSaveSha256:
    'b0c38b5bcefc9152f84f4e0c7202206da09622c8ac548be3ebb0f58b5a210f6d',
  sourceRegionSha256: '2029d6837876d971e5f5278e578996203b98d5238f67ef4bbc315f4894d1eb60',
  postCompleteSaveSha256:
    'df6b887176e00a708d55e9022058781a0909df02603f91e482ed78234e1627d0',
  postRegionSha256: 'a99bf9398a1fdeb24ee9f32afc337ebac8551f5224e8387728e7e427180789f8',
  sourceBoundReleaseIdentitySha256:
    '0dfbc7c22ea08ae077fee1c40e709127f484392fde6a01a33957d979bccbab7f',
  completedReleaseIdentitySha256:
    '3b9b5c0836b5c42a1e05c7b6a5efd9195015355a33bfad9697473ea5a18059f1',
  containmentCount: 126,
  seamCount: 33,
  targetCount: 159,
  stairCount: 23,
  clearanceCount: 46,
  barrierCount: 40,
  landingSeamCount: 5,
  coreCount: 88,
  haloCount: 638,
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
const GRAVITY_NAMES = new Set(['minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand']);

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R09F post-release QA rejected: ${message}`);
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
    output.push({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) });
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
  const desiredByKey = new Map(desired.map(({ cell, targetState }) => [cellKey(cell), targetState]));
  return observed.filter(({ cell, state }) => state !== desiredByKey.get(cellKey(cell)));
}

function inspectJournal(filename, operationSha256, commandCount) {
  const records = fs.readFileSync(absolute(filename), 'utf8').trim().split(/\r?\n/)
    .map((line) => JSON.parse(line));
  const expectedRecordCount = (2 * commandCount) + 6;
  return {
    ...fileBinding(filename),
    recordCount: records.length,
    expectedRecordCount,
    allOperationBindingsMatch: records.every((record) => (
      record.operationSha256 === undefined || record.operationSha256 === operationSha256
    )),
    passed: records.length === expectedRecordCount && records.every((record) => (
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
  `${releasePackage.key} operation binding drifted`);
  const forward = expandOperations(releasePackage.forward);
  const rollback = expandOperations(releasePackage.rollback);
  invariant(exactReverseInverse(forward, rollback), `${releasePackage.key} inverse drifted`);
  return { releasePackage, ledgerPackage, forward, rollback };
});
const containmentPackage = packageRecords[0];
const seamPackage = packageRecords[1];
const targetRecords = packageRecords.flatMap(({ forward }) => forward);
const targetCells = targetRecords.map(({ cell }) => cell);
const targetKeys = new Set(targetCells.map(cellKey));
invariant(containmentPackage.forward.length === EXPECTED.containmentCount
  && seamPackage.forward.length === EXPECTED.seamCount
  && targetRecords.length === EXPECTED.targetCount && targetKeys.size === EXPECTED.targetCount
  && hashCells(targetCells) === manifest.target.operatedCoordinateSetSha256,
'target operation union drifted');

const innerRing = [];
for (let x = 2106; x <= 2110; x += 1) innerRing.push({ x, z: -396, ox: x, oz: -395 });
for (let z = -397; z >= -400; z -= 1) innerRing.push({ x: 2110, z, ox: 2111, oz: z });
for (let x = 2109; x >= 2106; x -= 1) innerRing.push({ x, z: -400, ox: x, oz: -401 });
for (let z = -399; z <= -397; z += 1) innerRing.push({ x: 2106, z, ox: 2105, oz: z });
const stairs = [];
for (let step = 1; step <= 20; step += 1) {
  const point = innerRing[(2 + step - 1) % innerRing.length];
  const surfaceY2 = 122 + step;
  stairs.push({
    step,
    cell: { x: point.x, y: Math.floor((surfaceY2 - 1) / 2), z: point.z },
    outer: { x: point.ox, y: Math.floor((surfaceY2 - 1) / 2), z: point.oz },
    surfaceY2,
  });
}
for (const [index, cell] of [
  { x: 2109, y: 71, z: -397 },
  { x: 2108, y: 71, z: -397 },
  { x: 2108, y: 72, z: -398 },
].entries()) {
  stairs.push({ step: 21 + index, cell, outer: null, surfaceY2: 143 + index });
}
const stairKeys = new Set(stairs.map(({ cell }) => cellKey(cell)));
const clearance = uniqueCells(stairs.flatMap(({ cell }) => [
  { x: cell.x, y: cell.y + 1, z: cell.z },
  { x: cell.x, y: cell.y + 2, z: cell.z },
])).filter((cell) => !stairKeys.has(cellKey(cell)));
const barrier = uniqueCells(stairs.flatMap(({ outer }) => outer ? [
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
const retainedInteriorDeck = { x: 2108, y: 72, z: -399 };
const r09eCap = [{ x: 2107, y: 60, z: -395 }, { x: 2107, y: 61, z: -395 }];
const r09eCrown = [];
for (let x = 2106; x <= 2110; x += 1) {
  for (let z = -400; z <= -396; z += 1) {
    if (x === 2106 || x === 2110 || z === -400 || z === -396) r09eCrown.push({ x, y: 62, z });
  }
}
const retainedR09eCrown = r09eCrown.filter((cell) => !targetKeys.has(cellKey(cell)));
invariant(stairs.length === EXPECTED.stairCount
  && clearance.length === EXPECTED.clearanceCount
  && barrier.length === EXPECTED.barrierCount
  && core.length === EXPECTED.coreCount
  && landingSeam.length === EXPECTED.landingSeamCount
  && retainedR09eCrown.length === 12,
'derived geometry count drifted');
const topologyFailures = [];
const acceptedTerminal = { cell: { x: 2108, y: 60, z: -395 }, surfaceY2: 122 };
for (let index = 0; index < stairs.length; index += 1) {
  const prior = index === 0 ? acceptedTerminal : stairs[index - 1];
  const current = stairs[index];
  const distance = Math.abs(prior.cell.x - current.cell.x) + Math.abs(prior.cell.z - current.cell.z);
  const rise = current.surfaceY2 - prior.surfaceY2;
  if (distance !== 1 || rise !== 1) topologyFailures.push({ index, distance, rise });
}
const finalDeckDistance = Math.abs(stairs.at(-1).cell.x - retainedInteriorDeck.x)
  + Math.abs(stairs.at(-1).cell.z - retainedInteriorDeck.z);

const priorRecords = Object.fromEntries(Object.entries(PRIOR_MANIFESTS).map(([key, filename]) => {
  const priorManifest = readJson(filename);
  return [key, priorManifest.packages.flatMap(({ forward }) => expandOperations(forward))];
}));
const sourceReader = new AnvilReader(absolute(path.join(SOURCE_ROOT, 'region')));
const postReader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
const sourceEntityReader = new AnvilReader(absolute(path.join(SOURCE_ROOT, 'entities')));
const postEntityReader = new AnvilReader(absolute(path.join(POST_ROOT, 'entities')));
const halo = cubeHalo(targetCells);
const [sourceTargets, postTargets, sourceHalo, postHalo, sourceClearance, postClearance,
  sourceBarrier, postBarrier, sourceCap, postCap, sourceCrown, postCrown,
  sourceDeckContinuation, postDeckContinuation] = await Promise.all([
  states(sourceReader, targetCells), states(postReader, targetCells),
  states(sourceReader, halo), states(postReader, halo),
  states(sourceReader, clearance), states(postReader, clearance),
  states(sourceReader, barrier), states(postReader, barrier),
  states(sourceReader, r09eCap), states(postReader, r09eCap),
  states(sourceReader, retainedR09eCrown), states(postReader, retainedR09eCrown),
  states(sourceReader, [retainedInteriorDeck]), states(postReader, [retainedInteriorDeck]),
]);
const sourceTargetFailures = targetRecords.filter(({ cell, sourceState }) => {
  const observed = sourceTargets.find((record) => cellKey(record.cell) === cellKey(cell));
  return observed?.state !== sourceState;
});
const postTargetFailures = desiredFailures(postTargets, targetRecords);
const haloChanges = changes(sourceHalo, postHalo);
const declaredHaloChanges = haloChanges.filter(({ cell }) => targetKeys.has(cellKey(cell)));
const undeclaredHaloChanges = haloChanges.filter(({ cell }) => !targetKeys.has(cellKey(cell)));
const clearanceFailures = postClearance.filter(({ state }) => !AIR_NAMES.has(stateName(state)));
const barrierFailures = postBarrier.filter(({ state }) => !FULL_SOLID_NAMES.has(stateName(state)));
const capChanges = changes(sourceCap, postCap);
const capFailures = postCap.filter(({ state }) => state !== 'minecraft:polished_diorite');
const crownChanges = changes(sourceCrown, postCrown);
const crownFailures = postCrown.filter(({ state }) => state !== 'minecraft:polished_andesite');
const retainedDeckChanges = changes(sourceDeckContinuation, postDeckContinuation);
const retainedDeckFailures = postDeckContinuation.filter(({ state }) => (
  state !== 'minecraft:polished_diorite'
));

const sourceHaloByKey = new Map(sourceHalo.map(({ cell, state }) => [cellKey(cell), state]));
const postHaloByKey = new Map(postHalo.map(({ cell, state }) => [cellKey(cell), state]));
const gravityRecords = sourceHalo.filter(({ state }) => GRAVITY_NAMES.has(stateName(state)));
const gravityChanges = gravityRecords.filter(({ cell, state }) => (
  postHaloByKey.get(cellKey(cell)) !== state
));
const unsupportedGravity = [];
const gravitySupportChanges = [];
for (const record of gravityRecords) {
  const support = { x: record.cell.x, y: record.cell.y - 1, z: record.cell.z };
  const sourceSupport = stateToCommandString(
    await sourceReader.blockState(support.x, support.y, support.z),
  );
  const postSupport = stateToCommandString(
    await postReader.blockState(support.x, support.y, support.z),
  );
  if (AIR_NAMES.has(stateName(sourceSupport))) unsupportedGravity.push({ ...record, support, sourceSupport });
  if (sourceSupport !== postSupport) gravitySupportChanges.push({ support, sourceSupport, postSupport });
}

const priorObservations = {};
for (const [key, records] of Object.entries(priorRecords)) {
  const retained = records.filter(({ cell }) => !targetKeys.has(cellKey(cell)));
  const transformed = records.filter(({ cell }) => targetKeys.has(cellKey(cell)));
  const [source, post] = await Promise.all([
    states(sourceReader, retained.map(({ cell }) => cell)),
    states(postReader, retained.map(({ cell }) => cell)),
  ]);
  priorObservations[key] = {
    totalPriorCellCount: records.length,
    transformedInterfaceCellCount: transformed.length,
    retainedCellCount: retained.length,
    retainedChangedCellCount: changes(source, post).length,
    retainedSourceDesiredMismatchCount: desiredFailures(source, retained).length,
    retainedPostDesiredMismatchCount: desiredFailures(post, retained).length,
    retainedSourceStateSetSha256: stateSetSha256(source),
    retainedPostStateSetSha256: stateSetSha256(post),
  };
}

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
    && execution.strictNoop === true && execution.operationRole === 'forward'
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
  executionEvidence[key] = {
    strictForwardExecution: {
      ...fileBinding(executionPath),
      successfulGroups: execution.successfulGroups,
      failedGroups: execution.failedGroups,
      noopCommands: execution.noopCommands,
      unknownReplyCommands: execution.unknownReplyCommands,
      journal,
      passed: executionPassed,
    },
    rollbackPoststatePreflight: {
      ...fileBinding(rollbackPath),
      passedGuards: rollback.passed,
      failedGuards: rollback.failed,
      opsSha256: rollback.opsSha256,
      regionSnapshotSha256: rollback.regionsSnapshot?.sha256,
      passed: rollbackPassed,
    },
    sameMomentEntityClearance: {
      ...fileBinding(sameMomentPath),
      blockingEntityHits: sameMoment.totals?.blockingEntityHits,
      passed: sameMoment.status === 'PASS' && sameMoment.totals?.blockingEntityHits === 0,
    },
  };
}
const blockEntityPath = path.join(EVIDENCE_DIR, 'block-entity-clearance.json');
const liveEntityPath = path.join(EVIDENCE_DIR, 'live-entity-clearance.json');
const blockEntityGate = readJson(blockEntityPath);
const liveEntityGate = readJson(liveEntityPath);
const entityGatesPassed = blockEntityGate.status === 'PASS'
  && blockEntityGate.blockingBlockEntityCount === 0
  && liveEntityGate.status === 'PASS' && liveEntityGate.totals?.blockingEntityHits === 0
  && Object.values(executionEvidence).every(({ sameMomentEntityClearance }) => (
    sameMomentEntityClearance.passed
  ));

const checks = [
  ['R09F-QA-01-TERMINAL-IDENTITY-AND-24-STAGES', true],
  ['R09F-QA-02-EXACT-TWO-PACKAGE-INVERSES',
    packageRecords.every(({ forward, rollback }) => exactReverseInverse(forward, rollback))],
  ['R09F-QA-03-EXACT-126-CONTAINMENT-SOURCE-AND-POST',
    sourceTargetFailures.filter(({ cell }) => containmentPackage.forward.some((operation) => (
      cellKey(operation.cell) === cellKey(cell)
    ))).length === 0
      && desiredFailures(postTargets.filter(({ cell }) => (
        containmentPackage.forward.some((operation) => cellKey(operation.cell) === cellKey(cell))
      )), containmentPackage.forward).length === 0],
  ['R09F-QA-04-EXACT-33-SEAM-SOURCE-AND-POST',
    sourceTargetFailures.filter(({ cell }) => seamPackage.forward.some((operation) => (
      cellKey(operation.cell) === cellKey(cell)
    ))).length === 0
      && desiredFailures(postTargets.filter(({ cell }) => (
        seamPackage.forward.some((operation) => cellKey(operation.cell) === cellKey(cell))
      )), seamPackage.forward).length === 0],
  ['R09F-QA-05-23-HALF-STEP-TOPOLOGY-AND-INTERIOR-DECK',
    topologyFailures.length === 0 && finalDeckDistance === 1 && retainedDeckFailures.length === 0],
  ['R09F-QA-06-46-CLEARANCE-AND-40-BARRIER',
    clearanceFailures.length === 0 && barrierFailures.length === 0],
  ['R09F-QA-07-FIVE-CELL-R07J-INTERNAL-SEAM-EXACT',
    priorObservations.r07jSurfaceHeadhouse.transformedInterfaceCellCount === 5],
  ['R09F-QA-08-CAPS-CROWN-EXTERIOR-AND-WET-BUFFERS-PRESERVED',
    capChanges.length === 0 && capFailures.length === 0
      && crownChanges.length === 0 && crownFailures.length === 0
      && priorObservations.r07jSurfaceHeadhouse.retainedChangedCellCount === 0
      && priorObservations.r06WetTreatment.retainedChangedCellCount === 0
      && priorObservations.r09eDryUpperStair.retainedChangedCellCount === 0],
  ['R09F-QA-09-R09A-D-PRESERVED',
    ['r09aLowerLobby', 'r09bLowerStair', 'r09cSafetyCompletion', 'r09dTerminalCrown']
      .every((key) => priorObservations[key].retainedChangedCellCount === 0
        && priorObservations[key].retainedPostDesiredMismatchCount === 0)],
  ['R09F-QA-10-ZERO-UNDECLARED-638-HALO-DRIFT',
    haloChanges.length === EXPECTED.targetCount
      && declaredHaloChanges.length === EXPECTED.targetCount
      && undeclaredHaloChanges.length === 0],
  ['R09F-QA-11-GRAVITY-ENTITY-AND-BLOCK-ENTITY-PRESERVATION',
    gravityRecords.length === 7 && gravityChanges.length === 0
      && unsupportedGravity.length === 0 && gravitySupportChanges.length === 0
      && sourceEntities.blockEntities.length === 0 && sourceEntities.savedEntities.length === 0
      && postEntities.blockEntities.length === 0 && postEntities.savedEntities.length === 0
      && entityGatesPassed],
  ['R09F-QA-12-STRICT-JOURNALED-EXECUTION',
    Object.values(executionEvidence).every(({ strictForwardExecution }) => (
      strictForwardExecution.passed
    ))],
  ['R09F-QA-13-REVERSE-33-THEN-126-READY',
    ledger.rollbackPoststatePreflights.length === 2
      && ledger.rollbackPoststatePreflights[0].path.includes('stair-headhouse-seam')
      && ledger.rollbackPoststatePreflights[1].path.includes('interface-containment')
      && Object.values(executionEvidence).every(({ rollbackPoststatePreflight }) => (
        rollbackPoststatePreflight.passed
      ))],
  ['R09F-QA-14-ROUTE-REMAINS-ENCLOSED-AND-UNCOMMISSIONED',
    manifest.scope.operationalBoundary.r07jExteriorDoorInstalled === false
      && manifest.scope.operationalBoundary.r07jExteriorWallOrRoofTouched === false
      && manifest.scope.operationalBoundary.lowerWetInterfaceClosedByR09eDeck === true
      && manifest.scope.operationalBoundary.publicRouteCommissioned === false],
].map(([id, passed]) => ({ id, status: passed ? 'PASS' : 'FAIL' }));
const failedChecks = checks.filter(({ status }) => status === 'FAIL');
invariant(failedChecks.length === 0,
  `checks failed: ${failedChecks.map(({ id }) => id).join(', ')}`);

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R09F_B07_ENCLOSED_UPPER_INTERFACE_POSTSTATE_VERIFIED_REVERSIBLE',
  release: {
    transactionId: ledger.transactionId,
    releaseNodeId: ledger.releaseNodeId,
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
    upperCoreExtension: classManifest(core),
    orderedInterfaceStair: classManifest(stairs.map(({ cell }) => cell)),
    exactHeadClearance: classManifest(clearance),
    requiredOuterBarrier: classManifest(barrier),
    fiveCellR07jLandingSeam: classManifest(landingSeam),
    retainedR09eCap: classManifest(r09eCap),
    retainedR09eCrown: classManifest(retainedR09eCrown),
    operatedUnion: classManifest(targetCells),
    interactionHalo: classManifest(halo),
  },
  exactState: {
    sourceCensus: stateCensus(sourceTargets),
    desiredCensus: stateCensus(targetRecords, 'targetState'),
    postCensus: stateCensus(postTargets),
    sourceMatchingCellCount: targetRecords.length - sourceTargetFailures.length,
    sourceMismatchCount: sourceTargetFailures.length,
    postMatchingCellCount: targetRecords.length - postTargetFailures.length,
    postMismatchCount: postTargetFailures.length,
    containmentMatchingCellCount: containmentPackage.forward.length,
    seamMatchingCellCount: seamPackage.forward.length,
  },
  topology: {
    orderedStepCount: stairs.length,
    cardinalHalfStepEdgeCount: stairs.length - topologyFailures.length,
    topologyFailureCount: topologyFailures.length,
    lowestSurfaceY2: stairs[0].surfaceY2,
    highestSurfaceY2: stairs.at(-1).surfaceY2,
    topAnchor: stairs.at(-1).cell,
    retainedInteriorDeck: retainedInteriorDeck,
    finalDeckCardinalDistance: finalDeckDistance,
  },
  containment: {
    headClearanceAirCellCount: clearance.length - clearanceFailures.length,
    headClearanceMismatchCount: clearanceFailures.length,
    outerBarrierSolidCellCount: barrier.length - barrierFailures.length,
    outerBarrierMismatchCount: barrierFailures.length,
    retainedCapCellCount: r09eCap.length,
    retainedCapMismatchCount: capFailures.length,
    retainedCrownCellCount: retainedR09eCrown.length,
    retainedCrownMismatchCount: crownFailures.length,
    exteriorDoorInstalled: false,
    publicRouteCommissioned: false,
  },
  preservation: {
    priorReleaseTargets: priorObservations,
    retainedInteriorDeck: {
      changedCellCount: retainedDeckChanges.length,
      mismatchCount: retainedDeckFailures.length,
    },
    gravity: {
      cellCount: gravityRecords.length,
      changedCellCount: gravityChanges.length,
      unsupportedCellCount: unsupportedGravity.length,
      supportChangedCellCount: gravitySupportChanges.length,
    },
  },
  drift: {
    interactionHaloCellCount: halo.length,
    sourceStateSetSha256: stateSetSha256(sourceHalo),
    postStateSetSha256: stateSetSha256(postHalo),
    changedCellCount: haloChanges.length,
    declaredTargetChangedCellCount: declaredHaloChanges.length,
    undeclaredChangedCellCount: undeclaredHaloChanges.length,
    lifecycleTransitionCount: undeclaredHaloChanges.length,
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
    containmentCellCount: containmentPackage.forward.length,
    seamCellCount: seamPackage.forward.length,
    undeclaredHaloChangedCellCount: undeclaredHaloChanges.length,
    rollbackReadyCellCount: packageRecords.reduce((sum, record) => sum + record.rollback.length, 0),
    enclosedInteriorConnected: true,
    routeCommissioned: false,
  },
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    readOnlyAnvilInputs: true,
    publicOrFireServiceCommissioningGranted: false,
  },
};
const report = { ...reportWithoutIdentity, qaPayloadSha256: sha256(JSON.stringify(reportWithoutIdentity)) };
const markdown = [
  '# CZ-R09F B07 Enclosed Upper Interface Post-Release QA',
  '',
  `Status: **${report.status}**`,
  '',
  `QA payload SHA-256: \`${report.qaPayloadSha256}\``,
  '',
  `Completed release identity: \`${report.release.completedReleaseIdentitySha256}\``,
  '',
  '## Verified closeout',
  '',
  `- Exact target states: ${report.summary.exactTargetCellCount}/${report.summary.exactTargetCellCount} (${report.summary.containmentCellCount} containment + ${report.summary.seamCellCount} seam).`,
  `- Topology: ${report.topology.orderedStepCount} cardinal half-steps reach the exact top anchor and the retained R07J interior deck.`,
  `- Enclosure: ${report.containment.headClearanceAirCellCount} clearance cells, ${report.containment.outerBarrierSolidCellCount} outer-barrier cells, ${report.containment.retainedCapCellCount} cap cells, and ${report.containment.retainedCrownCellCount} retained crown cells pass.`,
  `- Bounded diff: ${report.drift.changedCellCount} declared changes across ${report.drift.interactionHaloCellCount} halo cells, zero undeclared or lifecycle drift.`,
  `- Wrapper: ${report.executionEvidence.wrapperPassedStageCount}/${report.executionEvidence.wrapperStageCount} stages PASS; reverse guards 33 then 126, all exact.`,
  '- The five-cell R07J internal deck seam is exact. Remaining R07J exterior shell, R09A-E retained cells, R06 wet treatment, contextual gravity, entities, and block entities are unchanged.',
  '- The headhouse remains doorless and the lower wet deck remains closed; no public or fire-service route is commissioned.',
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
  containmentCellCount: report.summary.containmentCellCount,
  seamCellCount: report.summary.seamCellCount,
  haloCellCount: report.drift.interactionHaloCellCount,
  undeclaredHaloChangedCellCount: report.drift.undeclaredChangedCellCount,
  wrapperPassedStages: report.executionEvidence.wrapperPassedStageCount,
  rollbackReadyCellCount: report.summary.rollbackReadyCellCount,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2)}\n`);
