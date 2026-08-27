#!/usr/bin/env node
/** Read-only post-release QA for CZ-R09B B07 lower spiral stair. */

import fs from 'fs';
import path from 'path';
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

const GENERATED_AT = value('--generated-at', '2026-08-21T17:45:00Z');
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r09b-live-20260821T173228Z',
);
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r09b-b07-lower-spiral-stair.release-manifest.json',
);
const SOURCE_ROOT = value(
  '--source-root',
  'data/worldsnap-combined-zones-r09b-source-20260821T173228Z',
);
const POST_ROOT = value(
  '--post-root',
  'data/worldsnap-combined-zones-r09b-post-20260821T173228Z',
);
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r09b-post-release-qa.json'));
const MARKDOWN_PATH = value(
  '--markdown',
  path.join(EVIDENCE_DIR, 'r09b-post-release-qa.md'),
);
const R06_MANIFEST_PATH =
  'data/buildops/combined-zones-r06-support-liner.release-manifest.json';
const AIR = 'minecraft:air';
const CORE = 'minecraft:polished_andesite';
const CAP = 'minecraft:polished_diorite';
const BOTTOM_SLAB = 'minecraft:smooth_stone_slab[type=bottom,waterlogged=false]';
const TOP_SLAB = 'minecraft:smooth_stone_slab[type=top,waterlogged=false]';

const EXPECTED = Object.freeze({
  ledgerSha256: '31ff63f830fee58cd14c629cd54f0be477c58c2b0c8f422316a5a6c60c3c8dc3',
  manifestSha256: 'bc54ba091e1535ca49a2d844cb5ae0c6e2511a2c7dcb6fe18d0a5d2bccd0be86',
  manifestIdentity: '3ce00f8f00830ea82894c64c8d6a7c72bf29e24c2d9a6b1414ff675cacf8f472',
  sourceBoundReleaseIdentitySha256:
    '9d4452e9fe9799e4e621083d5ba4489e0e7e67003c1b6a30a79308ef60380687',
  completedReleaseIdentitySha256:
    'cdd7df171ea63e5a04801f04929204c1b8d6c565a1b7e338717f80bbc6aed65a',
  sourceCompleteSaveSha256:
    'ba530de5a6d2148da8766d94dc817c92c845a7542a2625db3c5a4ba881f9feee',
  sourceRegionSha256:
    '1cfd7970184bb9f944df472a1702a3328e03eb61020b77540ba42384b09fa6bc',
  postCompleteSaveSha256:
    '9be9ed738ea806ddeb729d5681a890f77830f03ed49987e4129d18a2138040a4',
  postRegionSha256:
    '12af0520adee3bff309cb2f21a160419776e178ae833f0d7b5a20c3d184ed1cf',
  coreCount: 1575,
  stairCount: 128,
  capCount: 2,
  operatedCount: 1705,
  operatedSha256: '7397619da80fe765bffa55e4698f327597d9f6c2adf8e65ac20b171cd352799c',
  stairSha256: 'cd994ef33913e8565b11c59e0e89155bdac015266a9d3ac006af3b68b28d2640',
  orderedStairSha256:
    '0fee56a61014f8f5efdf3f6307056af29b35720cd58791c452cbd948241b4ed8',
  dryEnvelopeCount: 3087,
  haloCount: 5265,
  r09aFloorCount: 63,
  r06OperatedCount: 1530,
  operationCount: 1705,
});

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const samePath = (left, right) => absolute(left) === absolute(right);
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R09B post-release QA rejected: ${message}`);
};
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
const difference = (left, right) => {
  const excluded = new Set(right.map(cellKey));
  return uniqueCells(left.filter((cell) => !excluded.has(cellKey(cell))));
};
const intersection = (left, right) => {
  const included = new Set(right.map(cellKey));
  return uniqueCells(left.filter((cell) => included.has(cellKey(cell))));
};
const isAir = (state) => [AIR, 'minecraft:cave_air', 'minecraft:void_air'].includes(state);

function operationBody(filename) {
  return `${fs.readFileSync(absolute(filename), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .join('\n')}\n`;
}

function parseOperations(filename) {
  const operations = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains a malformed operation`);
    operations.push({
      from: fields.slice(1, 4).map(Number),
      to: fields.slice(4, 7).map(Number),
      fromState: fields[7],
      toState: fields[8],
    });
  }
  return operations;
}

function expandOperations(operations) {
  const records = [];
  const seen = new Set();
  for (const operation of operations) {
    const [x1, y1, z1] = operation.from;
    const [x2, y2, z2] = operation.to;
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) {
        for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z += 1) {
          const cell = { x, y, z };
          invariant(!seen.has(cellKey(cell)), `${cellKey(cell)} is targeted more than once`);
          seen.add(cellKey(cell));
          records.push({ cell, fromState: operation.fromState, toState: operation.toState });
        }
      }
    }
  }
  return records;
}

function stateCensus(records) {
  const census = new Map();
  for (const { state } of records) census.set(state, (census.get(state) ?? 0) + 1);
  return Object.fromEntries([...census.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
}

function stateSetSha256(records) {
  return sha256(`combined-zones-current-block-state-set-v1\n${records.slice()
    .sort((left, right) => (
      left.cell.x - right.cell.x || left.cell.y - right.cell.y || left.cell.z - right.cell.z
    ))
    .map(({ cell, state }) => `${cellKey(cell)}=${state}`)
    .join('\n')}\n`);
}

async function states(reader, cells) {
  const records = [];
  for (const cell of uniqueCells(cells)) {
    records.push({
      cell,
      state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)),
    });
  }
  return records;
}

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
const ledgerBinding = fileBinding(LEDGER_PATH);
const manifestBinding = fileBinding(MANIFEST_PATH);
invariant(ledgerBinding.sha256 === EXPECTED.ledgerSha256
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.mode === 'EXECUTE'
  && ledger.stages?.length === 17
  && ledger.stages.every(({ status }) => status === 'PASS'),
'terminal ledger identity or stage state drifted');
invariant(ledger.transactionId === manifest.transactionId
  && ledger.releaseNodeId === manifest.releaseNodeId
  && samePath(ledger.manifest.path, MANIFEST_PATH)
  && ledger.manifest.sha256 === manifestBinding.sha256
  && manifestBinding.sha256 === EXPECTED.manifestSha256,
'ledger/manifest scope or file binding drifted');
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
  && ledger.sourceSnapshot.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.postCompleteSaveSha256,
'ledger complete-save identity drifted');
invariant(sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && sourceIntake.packageIdentity.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && postIntake.packageIdentity.completeSaveSha256 === EXPECTED.postCompleteSaveSha256,
'source or post intake is not identity-bound PASS evidence');
invariant(sourceIdentity.sha256 === EXPECTED.sourceRegionSha256
  && postIdentity.sha256 === EXPECTED.postRegionSha256
  && samePath(sourceIdentity.directory, path.join(SOURCE_ROOT, 'region'))
  && samePath(postIdentity.directory, path.join(POST_ROOT, 'region')),
'source or post region identity drifted');
const evidenceBindingFailures = [];
for (const binding of ledger.evidenceBindings ?? []) {
  const current = fileBinding(binding.path);
  if (current.sha256 !== binding.sha256 || current.bytes !== binding.bytes) {
    evidenceBindingFailures.push({ expected: binding, observed: current });
  }
}
invariant(evidenceBindingFailures.length === 0, 'terminal evidence binding drifted');
const recomputedSourceBoundReleaseIdentity = sha256(JSON.stringify({
  executionBindingSha256: ledger.executionBindingSha256,
  sourceCompleteSaveSha256: sourceIntake.packageIdentity.completeSaveSha256,
  sourceRegionSha256: sourceIdentity.sha256,
}));
const recomputedCompletedReleaseIdentity = sha256(JSON.stringify({
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
  && ledger.sourceBoundReleaseIdentitySha256 === recomputedSourceBoundReleaseIdentity
  && ledger.completedReleaseIdentitySha256 === EXPECTED.completedReleaseIdentitySha256
  && ledger.completedReleaseIdentitySha256 === recomputedCompletedReleaseIdentity,
'source-bound or completed release identity drifted');

const core = cellsIn({
  minX: 2104, maxX: 2108,
  minY: -58, maxY: 4,
  minZ: -430, maxZ: -426,
});
const ring = [];
for (let x = 2103; x <= 2109; x += 1) ring.push({ x, z: -431, ox: x, oz: -432 });
for (let z = -430; z <= -425; z += 1) ring.push({ x: 2109, z, ox: 2110, oz: z });
for (let x = 2108; x >= 2103; x -= 1) ring.push({ x, z: -425, ox: x, oz: -424 });
for (let z = -426; z >= -430; z -= 1) ring.push({ x: 2103, z, ox: 2102, oz: z });
const stairs = [];
for (let index = 0; index < 124; index += 1) {
  const point = ring[index % ring.length];
  const y = -58 + Math.floor(index / 2);
  stairs.push({
    index,
    cell: { x: point.x, y, z: point.z },
    outer: { x: point.ox, y, z: point.oz },
    surfaceY2: (2 * y) + (index % 2 === 0 ? 1 : 2),
    targetState: index % 2 === 0 ? BOTTOM_SLAB : TOP_SLAB,
  });
}
for (let offset = 0; offset < 4; offset += 1) {
  const index = 124 + offset;
  const point = ring[index % ring.length];
  stairs.push({
    index,
    cell: { x: point.x, y: 3, z: point.z },
    outer: { x: point.ox, y: 3, z: point.oz },
    surfaceY2: 8,
    targetState: TOP_SLAB,
  });
}
const cap = [{ ...ring[8], y: 3 }, { ...ring[8], y: 4 }]
  .map(({ x, y, z }) => ({ x, y, z }));
const desired = [
  ...core.map((cell) => ({ cell, targetState: CORE })),
  ...stairs.map(({ cell, targetState }) => ({ cell, targetState })),
  ...cap.map((cell) => ({ cell, targetState: CAP })),
];
const operated = desired.map(({ cell }) => cell);
const dryEnvelope = cellsIn({
  minX: 2103, maxX: 2109,
  minY: -58, maxY: 4,
  minZ: -431, maxZ: -425,
});
const halo = cellsIn({
  minX: 2102, maxX: 2110,
  minY: -59, maxY: 5,
  minZ: -432, maxZ: -424,
});
const r09aFloor = cellsIn({
  minX: 2103, maxX: 2111,
  minY: -59, maxY: -59,
  minZ: -431, maxZ: -425,
});
const r09aFormerOpenPlanes = cellsIn({
  minX: 2103, maxX: 2111,
  minY: -58, maxY: -57,
  minZ: -431, maxZ: -425,
});
const r09aDeclaredInterface = intersection(r09aFormerOpenPlanes, operated);
const r09aRetainedOpen = difference(r09aFormerOpenPlanes, operated);
const clearance = uniqueCells(stairs.flatMap(({ cell }) => [
  { x: cell.x, y: cell.y + 1, z: cell.z },
  { x: cell.x, y: cell.y + 2, z: cell.z },
]));
const orderedStairSha256 = sha256(JSON.stringify(stairs.map(({
  cell, targetState, surfaceY2,
}) => ({ cell, targetState, surfaceY2 }))));
let maximumRiseHalfBlocks = 0;
let cardinallyContiguous = true;
for (let index = 1; index < stairs.length; index += 1) {
  const prior = stairs[index - 1];
  const current = stairs[index];
  cardinallyContiguous &&= Math.abs(prior.cell.x - current.cell.x)
    + Math.abs(prior.cell.z - current.cell.z) === 1;
  maximumRiseHalfBlocks = Math.max(
    maximumRiseHalfBlocks,
    current.surfaceY2 - prior.surfaceY2,
  );
}
invariant(core.length === EXPECTED.coreCount
  && stairs.length === EXPECTED.stairCount
  && cap.length === EXPECTED.capCount
  && operated.length === EXPECTED.operatedCount
  && hashCells(operated) === EXPECTED.operatedSha256
  && hashCells(stairs.map(({ cell }) => cell)) === EXPECTED.stairSha256
  && orderedStairSha256 === EXPECTED.orderedStairSha256
  && dryEnvelope.length === EXPECTED.dryEnvelopeCount
  && halo.length === EXPECTED.haloCount
  && r09aFloor.length === EXPECTED.r09aFloorCount
  && cardinallyContiguous
  && maximumRiseHalfBlocks === 1,
'canonical core, stair, cap, or interface geometry drifted');

const pkg = manifest.packages.find(({ key }) => key === 'b07-lower-spiral-stair');
invariant(pkg, 'lower spiral stair package is missing');
const forwardOperations = parseOperations(pkg.forward);
const rollbackOperations = parseOperations(pkg.rollback);
const expandedForward = expandOperations(forwardOperations);
const expandedRollback = expandOperations(rollbackOperations);
invariant(forwardOperations.length === EXPECTED.operationCount
  && rollbackOperations.length === EXPECTED.operationCount
  && expandedForward.length === EXPECTED.operatedCount
  && expandedRollback.length === EXPECTED.operatedCount
  && hashCells(expandedForward.map(({ cell }) => cell)) === EXPECTED.operatedSha256
  && hashCells(expandedRollback.map(({ cell }) => cell)) === EXPECTED.operatedSha256,
'operation counts or target identities drifted');
invariant(expandedForward.every((operation, index) => (
  operation.fromState === AIR
  && operation.toState === desired[index].targetState
  && cellKey(operation.cell) === cellKey(desired[index].cell)
)), 'forward operation order or transition state drifted');
invariant(rollbackOperations.every((operation, index) => {
  const forward = forwardOperations.at(-(index + 1));
  return JSON.stringify(operation.from) === JSON.stringify(forward.from)
    && JSON.stringify(operation.to) === JSON.stringify(forward.to)
    && operation.fromState === forward.toState
    && operation.toState === forward.fromState;
}), 'rollback is not the exact reverse-order inverse');
invariant(sha256(operationBody(pkg.forward))
    === manifest.operations['b07-lower-spiral-stair'].forwardSha256
  && sha256(operationBody(pkg.rollback))
    === manifest.operations['b07-lower-spiral-stair'].rollbackSha256,
'operation body identity drifted');

const r06Manifest = readJson(R06_MANIFEST_PATH);
const r06Records = r06Manifest.packages.flatMap(({ forward }) => (
  expandOperations(parseOperations(forward))
));
const r06Cells = r06Records.map(({ cell }) => cell);
invariant(r06Records.length === EXPECTED.r06OperatedCount
  && intersection(r06Cells, operated).length === 0,
'R06 operation geometry or disjointness drifted');

const sourceReader = new AnvilReader(absolute(path.join(SOURCE_ROOT, 'region')));
const postReader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
const [sourceOperated, postOperated, sourceEnvelope, postEnvelope,
  sourceHalo, postHalo, sourceFloor, postFloor, sourceRetainedOpen, postRetainedOpen,
  postClearance, sourceR06, postR06] = await Promise.all([
  states(sourceReader, operated), states(postReader, operated),
  states(sourceReader, dryEnvelope), states(postReader, dryEnvelope),
  states(sourceReader, halo), states(postReader, halo),
  states(sourceReader, r09aFloor), states(postReader, r09aFloor),
  states(sourceReader, r09aRetainedOpen), states(postReader, r09aRetainedOpen),
  states(postReader, clearance), states(sourceReader, r06Cells), states(postReader, r06Cells),
]);
const sourceByKey = new Map(sourceHalo.map(({ cell, state }) => [cellKey(cell), state]));
const postByKey = new Map(postHalo.map(({ cell, state }) => [cellKey(cell), state]));
const operatedKeys = new Set(operated.map(cellKey));
const operatedSourceMismatches = sourceOperated.filter(({ state }) => state !== AIR);
const operatedPostMismatches = postOperated.filter(({ cell, state }) => (
  state !== desired.find(({ cell: target }) => cellKey(target) === cellKey(cell)).targetState
));
const envelopeChanges = sourceEnvelope.filter(({ cell, state }) => (
  state !== postByKey.get(cellKey(cell))
));
const undeclaredEnvelopeChanges = envelopeChanges.filter(({ cell }) => (
  !operatedKeys.has(cellKey(cell))
));
const haloChanges = sourceHalo.filter(({ cell, state }) => state !== postByKey.get(cellKey(cell)));
const undeclaredHaloChanges = haloChanges.filter(({ cell }) => !operatedKeys.has(cellKey(cell)));
const floorChanges = sourceFloor.filter(({ cell, state }) => state !== (
  postFloor.find(({ cell: target }) => cellKey(target) === cellKey(cell))?.state
));
const retainedOpenChanges = sourceRetainedOpen.filter(({ cell, state }) => state !== (
  postRetainedOpen.find(({ cell: target }) => cellKey(target) === cellKey(cell))?.state
));
const retainedOpenAirFailures = postRetainedOpen.filter(({ state }) => !isAir(state));
const clearanceFailures = postClearance.filter(({ state }) => !isAir(state));
const r06PostByKey = new Map(postR06.map(({ cell, state }) => [cellKey(cell), state]));
const r06Changes = sourceR06.filter(({ cell, state }) => state !== r06PostByKey.get(cellKey(cell)));
const r06InheritedNonOriginalStates = postR06.filter(({ cell, state }) => (
  state !== r06Records.find(({ cell: target }) => cellKey(target) === cellKey(cell)).toState
));

const outwardDrops = [];
for (const stair of stairs) {
  const outerState = stateToCommandString(
    await postReader.blockState(stair.outer.x, stair.outer.y, stair.outer.z),
  );
  if (!isAir(outerState)) continue;
  let airBelowBeforeSolid = 0;
  let supportingState = null;
  for (let y = stair.outer.y - 1; y >= stair.outer.y - 12; y -= 1) {
    const state = stateToCommandString(await postReader.blockState(stair.outer.x, y, stair.outer.z));
    if (!isAir(state)) {
      supportingState = state;
      break;
    }
    airBelowBeforeSolid += 1;
  }
  outwardDrops.push({
    stairIndex: stair.index,
    stairCell: stair.cell,
    outwardCell: stair.outer,
    airBelowBeforeSolid,
    supportingState,
  });
}
const materialOutwardDrops = outwardDrops.filter(({ airBelowBeforeSolid }) => (
  airBelowBeforeSolid >= 2
));
const capClimbCells = [
  { x: cap[1].x, y: cap[1].y + 1, z: cap[1].z },
  { x: cap[1].x, y: cap[1].y + 2, z: cap[1].z },
];
const capClimbStates = await states(postReader, capClimbCells);
const capPhysicallyUnclimbable = capClimbStates.some(({ state }) => !isAir(state));

const executionPath = path.join(EVIDENCE_DIR, 'b07-lower-spiral-stair.forward-execution.json');
const rollbackPath = path.join(
  EVIDENCE_DIR,
  'b07-lower-spiral-stair.rollback-poststate-preflight.json',
);
const blockEntityPath = path.join(EVIDENCE_DIR, 'block-entity-clearance.json');
const liveEntityPath = path.join(EVIDENCE_DIR, 'live-entity-clearance.json');
const execution = readJson(executionPath);
const rollbackPreflight = readJson(rollbackPath);
const blockEntity = readJson(blockEntityPath);
const liveEntity = readJson(liveEntityPath);
const strictExecutionPassed = execution.status === 'complete'
  && execution.strictNoop === true
  && execution.operationRole === 'forward'
  && execution.successfulGroups === EXPECTED.operationCount
  && execution.failedGroups === 0
  && execution.noopCommands === 0
  && execution.unknownReplyCommands === 0
  && execution.worldEditLeftoverCount === 0
  && execution.forceLoadAudit?.allTemporaryReleased === true
  && execution.forceLoadAudit?.finalSetMatchesPreExistingSet === true;
const rollbackPassed = rollbackPreflight.status === 'PASS'
  && rollbackPreflight.passed === EXPECTED.operationCount
  && rollbackPreflight.failed === 0
  && rollbackPreflight.opsSha256 === ledger.packages[0].rollback.sha256
  && rollbackPreflight.regionsSnapshot?.sha256 === EXPECTED.postRegionSha256;
const containmentPassed = blockEntity.status === 'PASS'
  && blockEntity.blockingBlockEntityCount === 0
  && liveEntity.status === 'PASS'
  && liveEntity.totals?.blockingEntityHits === 0;

const checks = [
  ['R09B-QA-01-TERMINAL-IDENTITY', true],
  ['R09B-QA-02-EXACT-REVERSE-INVERSE', true],
  ['R09B-QA-03-OPERATED-SOURCE-STATE', operatedSourceMismatches.length === 0],
  ['R09B-QA-04-OPERATED-POST-STATE', operatedPostMismatches.length === 0],
  ['R09B-QA-05-DRY-ENVELOPE-NO-UNDECLARED-DRIFT', undeclaredEnvelopeChanges.length === 0],
  ['R09B-QA-06-HALO-NO-UNDECLARED-DRIFT', undeclaredHaloChanges.length === 0],
  ['R09B-QA-07-HELIX-CARDINAL-CONTINUITY', cardinallyContiguous],
  ['R09B-QA-08-HELIX-HALF-STEP-PROGRESSION', maximumRiseHalfBlocks === 1],
  ['R09B-QA-09-HELIX-TWO-BLOCK-CLEARANCE', clearanceFailures.length === 0],
  ['R09B-QA-10-R09A-FLOOR-PRESERVED', floorChanges.length === 0],
  ['R09B-QA-11-R09A-RETAINED-OPEN-PLANES',
    retainedOpenChanges.length === 0 && retainedOpenAirFailures.length === 0],
  ['R09B-QA-12-R06-TREATMENT-PRESERVED', r06Changes.length === 0],
  ['R09B-QA-13-STRICT-EXECUTION', strictExecutionPassed],
  ['R09B-QA-14-ROLLBACK-POSTSTATE', rollbackPassed],
  ['R09B-QA-15-BLOCK-AND-ENTITY-CONTAINMENT', containmentPassed],
  ['R09B-QA-16-TWO-CELL-CAP-EXACT',
    postOperated.filter(({ cell }) => new Set(cap.map(cellKey)).has(cellKey(cell)))
      .every(({ state }) => state === CAP)],
].map(([id, passed]) => ({ id, status: passed ? 'PASS' : 'FAIL' }));
const failedChecks = checks.filter(({ status }) => status === 'FAIL');
invariant(failedChecks.length === 0,
  `exact construction QA failed: ${failedChecks.map(({ id }) => id).join(', ')}`);

const reportWithoutPayloadIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R09B_EXACT_BUILD_POSTSTATE_VERIFIED_ROUTE_COMMISSIONING_HOLD',
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
    staticCore: classManifest(core),
    slabHelixAndLanding: classManifest(stairs.map(({ cell }) => cell)),
    upperHoldMarker: classManifest(cap),
    operatedUnion: classManifest(operated),
    dryLowerShaftEnvelope: classManifest(dryEnvelope),
    interactionHalo: classManifest(halo),
    helixClearance: classManifest(clearance),
    r09aLowerLobbyFloor: classManifest(r09aFloor),
    r09aDeclaredStairInterface: classManifest(r09aDeclaredInterface),
    r09aRetainedOpenPlanes: classManifest(r09aRetainedOpen),
    r06OperatedUnion: classManifest(r06Cells),
  },
  exactState: {
    sourceOperatedCensus: stateCensus(sourceOperated),
    postOperatedCensus: stateCensus(postOperated),
    sourceMatchingCellCount: operated.length - operatedSourceMismatches.length,
    sourceMismatchCount: operatedSourceMismatches.length,
    postMatchingCellCount: operated.length - operatedPostMismatches.length,
    postMismatchCount: operatedPostMismatches.length,
    sourceStateSetSha256: stateSetSha256(sourceOperated),
    postStateSetSha256: stateSetSha256(postOperated),
    exactReverseOrderInverse: true,
  },
  walkability: {
    orderedCellCount: stairs.length,
    orderedCellSha256: orderedStairSha256,
    cardinallyContiguous,
    minimumSurfaceY2: stairs[0].surfaceY2,
    maximumSurfaceY2: stairs.at(-1).surfaceY2,
    maximumRiseHalfBlocks,
    clearanceCellCount: clearance.length,
    clearanceAirCellCount: clearance.length - clearanceFailures.length,
    clearanceMismatchCount: clearanceFailures.length,
    outwardAirCellCount: outwardDrops.length,
    materialOutwardDropCount: materialOutwardDrops.length,
    fallProtectionComplete: materialOutwardDrops.length === 0,
  },
  cap: {
    exactPolishedDioriteCellCount: cap.length,
    climbSpaceStateCensus: stateCensus(capClimbStates),
    physicallyUnclimbable: capPhysicallyUnclimbable,
    classification: capPhysicallyUnclimbable
      ? 'FAIL_CLOSED_BARRIER'
      : 'EXACT_TWO_CELL_MARKER_NOT_A_FAIL_CLOSED_PLAYER_BARRIER',
  },
  interfaces: {
    r09a: {
      floorSourceCensus: stateCensus(sourceFloor),
      floorPostCensus: stateCensus(postFloor),
      floorUnchangedCellCount: r09aFloor.length - floorChanges.length,
      floorChangedCellCount: floorChanges.length,
      declaredPriorAirInterfaceCellCount: r09aDeclaredInterface.length,
      retainedOpenCellCount: r09aRetainedOpen.length - retainedOpenAirFailures.length,
      retainedOpenMismatchCount: retainedOpenAirFailures.length,
    },
    r06: {
      operatedCellCount: r06Cells.length,
      targetIntersectionCellCount: intersection(r06Cells, operated).length,
      sourceStateSetSha256: stateSetSha256(sourceR06),
      postStateSetSha256: stateSetSha256(postR06),
      unchangedCellCount: r06Cells.length - r06Changes.length,
      changedCellCount: r06Changes.length,
      inheritedNonOriginalStateCount: r06InheritedNonOriginalStates.length,
    },
  },
  drift: {
    dryEnvelopeChangedCellCount: envelopeChanges.length,
    dryEnvelopeUndeclaredChangedCellCount: undeclaredEnvelopeChanges.length,
    interactionHaloChangedCellCount: haloChanges.length,
    interactionHaloUndeclaredChangedCellCount: undeclaredHaloChanges.length,
  },
  executionEvidence: {
    strictForwardExecution: {
      ...fileBinding(executionPath),
      operationSha256: execution.operationSha256,
      successfulGroups: execution.successfulGroups,
      failedGroups: execution.failedGroups,
      noopCommands: execution.noopCommands,
      unknownReplyCommands: execution.unknownReplyCommands,
      worldEditLeftoverCount: execution.worldEditLeftoverCount,
      allTemporaryChunksReleased: execution.forceLoadAudit.allTemporaryReleased,
      forceLoadSetRestored: execution.forceLoadAudit.finalSetMatchesPreExistingSet,
      streamJournalSha256: execution.streamJournalSha256,
      passed: strictExecutionPassed,
    },
    rollbackPoststatePreflight: {
      ...fileBinding(rollbackPath),
      opsSha256: rollbackPreflight.opsSha256,
      passedGuards: rollbackPreflight.passed,
      failedGuards: rollbackPreflight.failed,
      regionSnapshotSha256: rollbackPreflight.regionsSnapshot.sha256,
      passed: rollbackPassed,
    },
    containment: {
      blockEntityEvidence: fileBinding(blockEntityPath),
      liveEntityEvidence: fileBinding(liveEntityPath),
      blockingBlockEntityCount: blockEntity.blockingBlockEntityCount,
      blockingEntityHitCount: liveEntity.totals.blockingEntityHits,
      passed: containmentPassed,
    },
  },
  checks,
  functionalHold: {
    active: materialOutwardDrops.length > 0 || !capPhysicallyUnclimbable,
    id: 'R09B-HOLD-FALL-PROTECTION-AND-TERMINAL-BARRIER',
    reason: `${materialOutwardDrops.length} helix positions have an outward drop deeper than one block; the two-cell upper marker is climbable because both cells above it are air.`,
    worldCorrectionPerformed: false,
    routeCommissioned: false,
  },
  summary: {
    exactConstructionPassed: failedChecks.length === 0,
    routeCommissionable: materialOutwardDrops.length === 0 && capPhysicallyUnclimbable,
    checkCount: checks.length,
    passCount: checks.length - failedChecks.length,
    failCount: failedChecks.length,
    operatedMatchingCellCount: operated.length - operatedPostMismatches.length,
    undeclaredHaloChangeCount: undeclaredHaloChanges.length,
    clearanceAirCellCount: clearance.length - clearanceFailures.length,
    outwardDropHazardCount: materialOutwardDrops.length,
    rollbackGuardPassCount: rollbackPreflight.passed,
  },
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    readOnlyAnvilInputs: true,
  },
};
const report = {
  ...reportWithoutPayloadIdentity,
  qaPayloadSha256: sha256(JSON.stringify(reportWithoutPayloadIdentity)),
};
const markdown = `# CZ-R09B B07 lower spiral stair post-release QA\n\n`
  + `**Status:** ${report.status}  \n`
  + `**Completed release identity:** \`${report.release.completedReleaseIdentitySha256}\`  \n`
  + `**QA payload identity:** \`${report.qaPayloadSha256}\`\n\n`
  + `## Exact post state\n\n`
  + `- ${report.summary.operatedMatchingCellCount}/${EXPECTED.operatedCount} operated cells match the manifest: ${EXPECTED.coreCount} polished-andesite core, ${EXPECTED.stairCount} slab helix/landing, and ${EXPECTED.capCount} polished-diorite marker cells.\n`
  + `- The complete ${EXPECTED.dryEnvelopeCount}-cell dry shaft and ${EXPECTED.haloCount}-cell interaction halo contain zero undeclared source-to-post changes.\n`
  + `- Strict execution changed ${execution.successfulGroups}/${EXPECTED.operationCount} groups with zero failures/no-ops; ${rollbackPreflight.passed}/${EXPECTED.operationCount} exact inverse guards pass.\n\n`
  + `## Geometry and interfaces\n\n`
  + `- The ${stairs.length}-cell ordered helix is cardinally contiguous, rises by at most one half block per step, and has ${clearance.length}/${clearance.length} conservative clearance cells air.\n`
  + `- R09A's ${r09aFloor.length}-cell floor is unchanged. The stair intentionally consumes ${r09aDeclaredInterface.length} cells of R09A's prior open standing/head planes; the other ${r09aRetainedOpen.length} cells remain air.\n`
  + `- All ${r06Cells.length} R06 liner/support targets are unchanged and disjoint from R09B. Block-entity and live-entity gates remain clean.\n\n`
  + `## Functional hold\n\n`
  + `The exact construction release is sealed, but the route is **not commissioned**. ${materialOutwardDrops.length} of ${stairs.length} helix positions have an outward drop deeper than one block, and the two-cell upper marker can be climbed from the Y=4 landing because Y=5 and Y=6 at that point are air. A separate guarded fall-protection and non-climbable terminal-barrier package is required before public use.\n\n`
  + `This QA was read-only: no RCON, service, entity, or world mutation occurred.\n`;
fs.mkdirSync(path.dirname(absolute(OUT_PATH)), { recursive: true });
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(MARKDOWN_PATH), markdown);
console.log(JSON.stringify({
  status: report.status,
  report: relative(OUT_PATH),
  markdown: relative(MARKDOWN_PATH),
  qaPayloadSha256: report.qaPayloadSha256,
  exactConstructionPassed: report.summary.exactConstructionPassed,
  routeCommissionable: report.summary.routeCommissionable,
  operatedMatchingCellCount: report.summary.operatedMatchingCellCount,
  undeclaredHaloChangeCount: report.summary.undeclaredHaloChangeCount,
  outwardDropHazardCount: report.summary.outwardDropHazardCount,
  rollbackGuardPassCount: report.summary.rollbackGuardPassCount,
}, null, 2));
