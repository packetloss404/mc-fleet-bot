#!/usr/bin/env node
/** Independent read-only post-release QA for CZ-R07J B07 surface architecture. */

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
const value = (flag, fallback = null) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const required = (flag) => {
  const result = value(flag);
  if (!result) throw new Error(`R07J post-release QA rejected: ${flag} is required`);
  return result;
};

const GENERATED_AT = value('--generated-at', '2026-08-21T19:30:00Z');
const LEDGER_PATH = required('--ledger');
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r07j-b07-supported-surface-headhouse.release-manifest.json',
);
const EVIDENCE_DIR = value('--evidence-dir', path.dirname(LEDGER_PATH));
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r07j-post-release-qa.json'));
const MARKDOWN_PATH = value('--markdown', path.join(EVIDENCE_DIR, 'r07j-post-release-qa.md'));
const TARGET_STATE = 'minecraft:polished_diorite';
const AIR_STATES = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0],
  [0, -1, 0], [0, 0, 1], [0, 0, -1],
];
const EXPECTED = Object.freeze({
  transactionId: 'combined-zones-r07j-b07-supported-surface-headhouse',
  releaseNodeId: 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
  manifestIdentity:
    '7714a583c3e659b0f9d2efac228ad8a1c1fb050a3b78b9010ee40c2ed519f223',
  manifestFileSha256:
    '22e1adc90ea8e8cccb28b46aaef017f60a35f233f353670ca1150ea1a49ebd9b',
  targetCount: 237,
  foundationCount: 116,
  headhouseCount: 121,
  topFaceCount: 49,
  deckCount: 81,
  pierCount: 35,
  headroomCount: 75,
  boundaryCount: 110,
  reviewCount: 6975,
  r09Count: 1848,
});
const R09_MANIFESTS = [
  'data/buildops/combined-zones-r09b-b07-lower-spiral-stair.release-manifest.json',
  'data/buildops/combined-zones-r09c-b07-stair-safety-completion.release-manifest.json',
  'data/buildops/combined-zones-r09d-b07-terminal-crown.release-manifest.json',
];

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const samePath = (left, right) => absolute(left) === absolute(right);
const sameObject = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R07J post-release QA rejected: ${message}`);
};
const fileBinding = (filename) => ({
  path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))),
  bytes: fs.statSync(absolute(filename)).size,
});
const exactSet = (cells) => {
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
const isWoody = (state) => /(?:_leaves|_log|_wood|_stem|_hyphae|bamboo|mangrove_roots)$/.test(
  state.split('[', 1)[0].slice('minecraft:'.length),
);

function operationBody(filename) {
  return `${fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
}

function parseOperations(filename) {
  const records = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains malformed operation syntax`);
    const coordinates = fields.slice(1, 7).map(Number);
    const [x1, y1, z1, x2, y2, z2] = coordinates;
    invariant(x1 === x2 && y1 === y2 && z1 === z2,
      `${filename} contains a non-one-cell operation`);
    records.push({
      cell: { x: x1, y: y1, z: z1 },
      fromState: fields[7],
      toState: fields[8],
    });
  }
  return records;
}

function stateCensus(records) {
  const counts = new Map();
  for (const { state } of records) counts.set(state, (counts.get(state) ?? 0) + 1);
  return Object.fromEntries([...counts].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
}

function stateSetSha256(records) {
  return sha256(`${records.slice().sort((left, right) => (
    left.cell.x - right.cell.x || left.cell.y - right.cell.y || left.cell.z - right.cell.z
  )).map(({ cell, state }) => `${cellKey(cell)}=${state}`).join('\n')}\n`);
}

function connectedComponents(cells) {
  const remaining = new Set(cells.map(cellKey));
  const sizes = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const pending = [first];
    let size = 0;
    while (pending.length) {
      const [x, y, z] = pending.pop().split(',').map(Number);
      size += 1;
      for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
        const key = `${x + dx},${y + dy},${z + dz}`;
        if (remaining.delete(key)) pending.push(key);
      }
    }
    sizes.push(size);
  }
  sizes.sort((left, right) => right - left);
  return { componentCount: sizes.length, componentSizes: sizes };
}

async function stateMap(reader, cells) {
  const result = new Map();
  for (const cell of uniqueCells(cells)) {
    result.set(cellKey(cell), stateToCommandString(
      await reader.blockState(cell.x, cell.y, cell.z),
    ));
  }
  return result;
}

function recordsFor(cells, states) {
  return cells.map((cell) => ({ cell, state: states.get(cellKey(cell)) }));
}

function manifestRecords(manifestPath) {
  const manifest = readJson(manifestPath);
  return uniqueCells(manifest.packages.flatMap((pkg) => (
    parseOperations(pkg.forward).map(({ cell }) => cell)
  ))).map((cell) => {
    let desired = null;
    for (const pkg of manifest.packages) {
      const match = parseOperations(pkg.forward).find(
        (record) => cellKey(record.cell) === cellKey(cell),
      );
      if (match) desired = match.toState;
    }
    invariant(desired, `${manifestPath} target is missing its desired state`);
    return { cell, desired };
  });
}

const manifest = readJson(MANIFEST_PATH);
const ledger = readJson(LEDGER_PATH);
const manifestBinding = fileBinding(MANIFEST_PATH);
const ledgerBinding = fileBinding(LEDGER_PATH);
invariant(manifestBinding.sha256 === EXPECTED.manifestFileSha256,
  'frozen canonical manifest full-file identity drifted');
const manifestPayload = { ...manifest };
delete manifestPayload.manifestIdentity;
invariant(manifest.manifestIdentity === EXPECTED.manifestIdentity
  && manifest.manifestIdentity === sha256(JSON.stringify(manifestPayload)),
'manifest payload identity drifted');
invariant(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.mode === 'EXECUTE'
  && ledger.transactionId === EXPECTED.transactionId
  && ledger.releaseNodeId === EXPECTED.releaseNodeId
  && ledger.stages?.every(({ status }) => status === 'PASS'),
'ledger is not a complete successful R07J execution');
invariant(samePath(ledger.manifest.path, MANIFEST_PATH)
  && ledger.manifest.sha256 === manifestBinding.sha256,
'ledger is not bound to the frozen R07J manifest');

const sourceRoot = ledger.sourceSnapshot.root;
const postRoot = ledger.postSnapshot.root;
const sourceIntake = readJson(ledger.sourceSnapshot.completeSaveIntake.path);
const postIntake = readJson(ledger.postSnapshot.completeSaveIntake.path);
const sourceIdentity = readJson(ledger.sourceSnapshot.identity.path);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
invariant(sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && sourceIntake.packageIdentity.completeSaveSha256
    === ledger.sourceSnapshot.completeSaveSha256
  && postIntake.packageIdentity.completeSaveSha256
    === ledger.postSnapshot.completeSaveSha256,
'source/post complete-save intake binding failed');
invariant(samePath(sourceIdentity.directory, path.join(sourceRoot, 'region'))
  && samePath(postIdentity.directory, path.join(postRoot, 'region')),
'source/post region identity paths do not match the ledger');

const evidenceBindingFailures = [];
for (const binding of ledger.evidenceBindings ?? []) {
  const observed = fileBinding(binding.path);
  if (observed.sha256 !== binding.sha256 || observed.bytes !== binding.bytes) {
    evidenceBindingFailures.push({ expected: binding, observed });
  }
}
invariant(evidenceBindingFailures.length === 0,
'one or more completed ledger evidence bindings drifted');
const recomputedSourceBoundIdentity = sha256(JSON.stringify({
  executionBindingSha256: ledger.executionBindingSha256,
  sourceCompleteSaveSha256: sourceIntake.packageIdentity.completeSaveSha256,
  sourceRegionSha256: sourceIdentity.sha256,
}));
invariant(ledger.sourceBoundReleaseIdentitySha256 === recomputedSourceBoundIdentity,
'source-bound release identity does not recompute');
const recomputedCompletedIdentity = sha256(JSON.stringify({
  sourceBoundReleaseIdentitySha256: ledger.sourceBoundReleaseIdentitySha256,
  postCompleteSaveSha256: postIntake.packageIdentity.completeSaveSha256,
  postRegionSha256: postIdentity.sha256,
  rollbackPoststatePreflights: ledger.rollbackPoststatePreflights.map(
    ({ path: reportPath, sha256: reportSha256 }) => ({ path: reportPath, sha256: reportSha256 }),
  ),
  evidenceBindingsSha256: sha256(JSON.stringify(ledger.evidenceBindings)),
}));
invariant(ledger.completedReleaseIdentitySha256 === recomputedCompletedIdentity,
'completed release identity does not recompute');

const exactTopFace = cellsIn({
  minX: 2105, maxX: 2111, minY: 72, maxY: 72, minZ: -401, maxZ: -395,
});
const deck = cellsIn({
  minX: 2104, maxX: 2112, minY: 72, maxY: 72, minZ: -402, maxZ: -394,
});
const supports = uniqueCells([
  ...cellsIn({ minX: 2104, maxX: 2104, minY: 63, maxY: 71, minZ: -398, maxZ: -398 }),
  ...cellsIn({ minX: 2107, maxX: 2107, minY: 63, maxY: 71, minZ: -402, maxZ: -402 }),
  ...cellsIn({ minX: 2107, maxX: 2107, minY: 63, maxY: 71, minZ: -394, maxZ: -394 }),
  ...cellsIn({ minX: 2112, maxX: 2112, minY: 64, maxY: 71, minZ: -401, maxZ: -401 }),
]);
const ground = [
  { x: 2104, y: 62, z: -398 }, { x: 2107, y: 62, z: -402 },
  { x: 2107, y: 62, z: -394 }, { x: 2112, y: 63, z: -401 },
];
const walls = cellsIn({
  minX: 2105, maxX: 2111, minY: 73, maxY: 75, minZ: -401, maxZ: -395,
}).filter((cell) => (
  cell.x === 2105 || cell.x === 2111 || cell.z === -401 || cell.z === -395
));
const roof = cellsIn({
  minX: 2105, maxX: 2111, minY: 76, maxY: 76, minZ: -401, maxZ: -395,
});
const headroom = cellsIn({
  minX: 2106, maxX: 2110, minY: 73, maxY: 75, minZ: -400, maxZ: -396,
});
const foundation = uniqueCells([...supports, ...deck]);
const headhouse = uniqueCells([...walls, ...roof]);
const operated = uniqueCells([...foundation, ...headhouse]);
const headroomKeys = new Set(headroom.map(cellKey));
const boundary = uniqueCells(headroom.flatMap((cell) => (
  FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({
    x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
  }))
)).filter((cell) => !headroomKeys.has(cellKey(cell))));
const reviewDomain = cellsIn({
  minX: 2101, maxX: 2115, minY: 50, maxY: 80, minZ: -405, maxZ: -391,
});
invariant(exactTopFace.length === EXPECTED.topFaceCount
  && deck.length === EXPECTED.deckCount && supports.length === EXPECTED.pierCount
  && foundation.length === EXPECTED.foundationCount
  && headhouse.length === EXPECTED.headhouseCount
  && headroom.length === EXPECTED.headroomCount
  && boundary.length === EXPECTED.boundaryCount
  && operated.length === EXPECTED.targetCount
  && reviewDomain.length === EXPECTED.reviewCount,
'independently derived geometry counts drifted');
invariant(hashCells(foundation) === manifest.operations['b07-grounded-pier-and-deck']
  .targetCoordinateSetSha256
  && hashCells(headhouse) === manifest.operations['b07-fail-closed-surface-headhouse']
    .targetCoordinateSetSha256,
'independent geometry does not match the frozen operation target hashes');

const operationEvidence = [];
const forwardRecords = [];
for (const [index, packageKey] of manifest.executionOrder.forward.entries()) {
  const pkg = manifest.packages.find(({ key }) => key === packageKey);
  const operationManifest = manifest.operations[packageKey];
  invariant(pkg && operationManifest, `${packageKey} is absent from the manifest`);
  const forward = parseOperations(pkg.forward);
  const rollback = parseOperations(pkg.rollback);
  invariant(forward.length === operationManifest.targetCellCount
    && rollback.length === forward.length
    && sha256(operationBody(pkg.forward)) === operationManifest.forwardSha256
    && sha256(operationBody(pkg.rollback)) === operationManifest.rollbackSha256
    && rollback.every((record, rollbackIndex) => {
      const inverse = forward.at(-(rollbackIndex + 1));
      return cellKey(record.cell) === cellKey(inverse.cell)
        && record.fromState === inverse.toState && record.toState === inverse.fromState;
    }), `${packageKey} operation/inverse identity failed`);
  forwardRecords.push(...forward);

  const executionPath = path.join(EVIDENCE_DIR, `${packageKey}.forward-execution.json`);
  const rollbackPath = path.join(EVIDENCE_DIR, `${packageKey}.rollback-poststate-preflight.json`);
  const execution = readJson(executionPath);
  const rollbackPreflight = readJson(rollbackPath);
  const expectedLaterPackages = manifest.executionOrder.forward.slice(index + 1);
  const overlayArtifacts = rollbackPreflight.sourceOverlays?.artifacts ?? [];
  const overlayPaths = overlayArtifacts.map(({ path: artifactPath }) => relative(artifactPath));
  const expectedOverlayPaths = expectedLaterPackages.slice().reverse().map((key) => (
    relative(manifest.packages.find((pkgEntry) => pkgEntry.key === key).rollback)
  ));
  const executionPassed = execution.status === 'complete'
    && execution.dryRun === false && execution.strictNoop === true
    && execution.operationRole === 'forward'
    && execution.operationSha256 === fileBinding(pkg.forward).sha256
    && execution.sourceOperationCount === forward.length
    && execution.sourceGroupCount === forward.length
    && execution.successfulGroups === forward.length
    && execution.successfulCommands === forward.length
    && execution.failedGroups === 0 && execution.failedCommands === 0
    && execution.noopCommands === 0 && execution.unexpectedNoopCommands === 0
    && execution.unknownReplyCommands === 0 && execution.worldEditLeftoverCount === 0;
  const rollbackPassed = rollbackPreflight.status === 'PASS'
    && samePath(rollbackPreflight.opsPath, pkg.rollback)
    && rollbackPreflight.opsSha256 === fileBinding(pkg.rollback).sha256
    && rollbackPreflight.operationCount === rollback.length
    && rollbackPreflight.passed === rollback.length && rollbackPreflight.failed === 0
    && rollbackPreflight.regionsSnapshot?.sha256 === postIdentity.sha256
    && sameObject(overlayPaths, expectedOverlayPaths)
    && (expectedOverlayPaths.length === 0
      ? rollbackPreflight.sourceOverlays === null
      : rollbackPreflight.sourceOverlays.failed === 0);
  invariant(executionPassed, `${packageKey} strict execution evidence failed`);
  invariant(rollbackPassed, `${packageKey} rollback post-state preflight failed`);
  operationEvidence.push({
    key: packageKey,
    operationCount: forward.length,
    forward: fileBinding(pkg.forward),
    rollback: fileBinding(pkg.rollback),
    exactReverseOrderInverse: true,
    strictExecution: { ...fileBinding(executionPath), passed: executionPassed },
    rollbackPoststate: {
      ...fileBinding(rollbackPath),
      passed: rollbackPassed,
      overlayPaths,
    },
  });
}
invariant(forwardRecords.length === EXPECTED.targetCount
  && new Set(forwardRecords.map(({ cell }) => cellKey(cell))).size === EXPECTED.targetCount,
'forward packages overlap or do not contain 237 exact targets');

const sourceReader = new AnvilReader(absolute(path.join(sourceRoot, 'region')));
const postReader = new AnvilReader(absolute(path.join(postRoot, 'region')));
const r09Records = R09_MANIFESTS.flatMap(manifestRecords);
const r09Cells = r09Records.map(({ cell }) => cell);
invariant(r09Records.length === EXPECTED.r09Count
  && new Set(r09Cells.map(cellKey)).size === EXPECTED.r09Count,
'R09B/C/D preservation target set drifted');
const allReview = uniqueCells([...reviewDomain, ...r09Cells]);
const sourceStates = await stateMap(sourceReader, allReview);
const postStates = await stateMap(postReader, allReview);

const transitionMismatches = forwardRecords.filter(({ cell, fromState, toState }) => (
  sourceStates.get(cellKey(cell)) !== fromState || postStates.get(cellKey(cell)) !== toState
));
const changedReview = reviewDomain.filter((cell) => (
  sourceStates.get(cellKey(cell)) !== postStates.get(cellKey(cell))
));
const operatedKeys = new Set(operated.map(cellKey));
const undeclaredChanges = changedReview.filter((cell) => !operatedKeys.has(cellKey(cell)));
const missingChanges = operated.filter((cell) => (
  sourceStates.get(cellKey(cell)) === postStates.get(cellKey(cell))
));
invariant(transitionMismatches.length === 0
  && changedReview.length === EXPECTED.targetCount
  && undeclaredChanges.length === 0 && missingChanges.length === 0,
'target transitions or full surface review-domain drift failed');

const postDeck = recordsFor(deck, postStates);
const postSupports = recordsFor(supports, postStates);
const sourceGround = recordsFor(ground, sourceStates);
const postGround = recordsFor(ground, postStates);
const sourceHeadroom = recordsFor(headroom, sourceStates);
const postHeadroom = recordsFor(headroom, postStates);
const postBoundary = recordsFor(boundary, postStates);
const deckConnectivity = connectedComponents(
  postDeck.filter(({ state }) => state === TARGET_STATE).map(({ cell }) => cell),
);
const headroomConnectivity = connectedComponents(
  postHeadroom.filter(({ state }) => AIR_STATES.has(state)).map(({ cell }) => cell),
);
invariant(postDeck.every(({ state }) => state === TARGET_STATE)
  && postSupports.every(({ state }) => state === TARGET_STATE)
  && exactTopFace.every((cell) => postStates.get(cellKey(cell)) === TARGET_STATE)
  && deckConnectivity.componentCount === 1 && deckConnectivity.componentSizes[0] === 81,
'deck, pier, top-cap, or connectivity post state failed');
invariant(sourceGround.every(({ state }, index) => state === postGround[index].state)
  && sourceGround.every(({ state }) => state.startsWith('minecraft:grass_block[')),
'one or more stable pier ground contacts changed');
invariant(sourceHeadroom.every(({ state }) => AIR_STATES.has(state))
  && postHeadroom.every(({ state }) => AIR_STATES.has(state))
  && headroomConnectivity.componentCount === 1
  && headroomConnectivity.componentSizes[0] === EXPECTED.headroomCount
  && postBoundary.every(({ state }) => state === TARGET_STATE),
'headhouse headroom or closed boundary failed');

const sourceWoody = recordsFor(reviewDomain, sourceStates).filter(({ state }) => isWoody(state));
const postWoody = recordsFor(reviewDomain, postStates).filter(({ state }) => isWoody(state));
const woodyDrift = uniqueCells([
  ...sourceWoody.filter(({ cell, state }) => postStates.get(cellKey(cell)) !== state)
    .map(({ cell }) => cell),
  ...postWoody.filter(({ cell, state }) => sourceStates.get(cellKey(cell)) !== state)
    .map(({ cell }) => cell),
]);
invariant(sourceWoody.length === manifest.preservation.retainedWoodyCells.cellCount
  && hashCells(sourceWoody.map(({ cell }) => cell))
    === manifest.preservation.retainedWoodyCells.coordinateSetSha256
  && stateSetSha256(sourceWoody)
    === manifest.preservation.retainedWoodyCells.blockStateSetSha256
  && woodyDrift.length === 0 && postWoody.length === sourceWoody.length
  && intersection(operated, sourceWoody.map(({ cell }) => cell)).length === 0,
'tree/log/leaf preservation failed');

const r09Mismatches = r09Records.filter(({ cell, desired }) => (
  sourceStates.get(cellKey(cell)) !== desired
  || postStates.get(cellKey(cell)) !== desired
));
const r09Drift = r09Cells.filter((cell) => (
  sourceStates.get(cellKey(cell)) !== postStates.get(cellKey(cell))
));
invariant(r09Mismatches.length === 0 && r09Drift.length === 0,
'R09B/C/D route or retained upper hold changed');

const blockEntityStage = ledger.stages.find(({ stage }) => stage === 'block-entity-clearance');
const liveEntityStage = ledger.stages.find(({ stage }) => stage === 'live-entity-clearance');
const sameMomentStages = ledger.stages.filter(({ stage }) => (
  stage.startsWith('same-moment-package-entity-clearance:')
));
invariant(blockEntityStage?.status === 'PASS' && liveEntityStage?.status === 'PASS'
  && sameMomentStages.length === 2 && sameMomentStages.every(({ status }) => status === 'PASS'),
'block/live/same-moment entity evidence is incomplete');

const checks = [
  ['R07J-QA-01', 'frozen-manifest-and-ledger-identity'],
  ['R07J-QA-02', 'complete-source-and-post-save-identity'],
  ['R07J-QA-03', 'exact-237-target-transitions'],
  ['R07J-QA-04', 'four-grounded-continuous-piers-and-connected-deck'],
  ['R07J-QA-05', 'exact-49-cell-fail-closed-shaft-cap'],
  ['R07J-QA-06', 'connected-75-cell-headroom-and-110-cell-boundary'],
  ['R07J-QA-07', 'tree-log-leaf-preservation'],
  ['R07J-QA-08', 'r09b-r09c-r09d-retained-hold-preservation'],
  ['R07J-QA-09', 'zero-undeclared-surface-review-drift'],
  ['R07J-QA-10', 'strict-execution-and-exact-reverse-rollback'],
  ['R07J-QA-11', 'entity-block-entity-and-evidence-binding'],
].map(([id, description]) => ({ id, description, status: 'PASS' }));

const reportWithoutIdentity = {
  schemaVersion: 1,
  id: 'combined-zones-r07j-b07-supported-surface-headhouse-post-release-qa',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R07J_B07_SUPPORTED_SURFACE_HEADHOUSE_POST_RELEASE_ACCEPTED',
  release: {
    transactionId: ledger.transactionId,
    releaseNodeId: ledger.releaseNodeId,
    canonicalOwner: 'P1-B07',
    manifestIdentity: manifest.manifestIdentity,
    sourceBoundReleaseIdentitySha256: ledger.sourceBoundReleaseIdentitySha256,
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
  },
  bindings: {
    manifest: { ...manifestBinding, manifestIdentity: manifest.manifestIdentity },
    ledger: { ...ledgerBinding, status: ledger.status },
    source: {
      root: relative(sourceRoot),
      completeSaveSha256: sourceIntake.packageIdentity.completeSaveSha256,
      regionSnapshotSha256: sourceIdentity.sha256,
    },
    post: {
      root: relative(postRoot),
      completeSaveSha256: postIntake.packageIdentity.completeSaveSha256,
      regionSnapshotSha256: postIdentity.sha256,
    },
    evidenceBindingCount: ledger.evidenceBindings.length,
    evidenceBindingFailures,
  },
  geometryAndPostState: {
    exactSevenBySevenTopFace: {
      ...exactSet(exactTopFace),
      closedPolishedDioriteCount: exactTopFace.length,
      openingCount: 0,
    },
    nineByNineDeck: {
      ...exactSet(deck),
      ...deckConnectivity,
      polishedDioriteCount: postDeck.length,
    },
    groundedPiers: {
      ...exactSet(supports),
      polishedDioriteCount: postSupports.length,
      continuousColumnCount: 4,
      unchangedStableGroundContactCount: ground.length,
    },
    failClosedHeadhouse: {
      ...exactSet(headhouse),
      polishedDioriteCount: headhouse.length,
      exteriorDoorOrOpeningCount: 0,
    },
    preservedHeadroom: {
      ...exactSet(headroom),
      ...headroomConnectivity,
      sourceStateCensus: stateCensus(sourceHeadroom),
      postStateCensus: stateCensus(postHeadroom),
    },
    enclosedHeadroomFaceBoundary: {
      ...exactSet(boundary),
      polishedDioriteCount: postBoundary.length,
      openingCount: 0,
    },
  },
  exactTransitionsAndDrift: {
    declaredTargetCount: EXPECTED.targetCount,
    matchingTargetTransitionCount: EXPECTED.targetCount - transitionMismatches.length,
    targetTransitionMismatchCount: transitionMismatches.length,
    reviewDomain: exactSet(reviewDomain),
    observedChangedCellCount: changedReview.length,
    undeclaredChangedCellCount: undeclaredChanges.length,
    missingDeclaredChangeCount: missingChanges.length,
  },
  preservation: {
    woodyCells: {
      ...exactSet(sourceWoody.map(({ cell }) => cell)),
      sourceBlockStateSetSha256: stateSetSha256(sourceWoody),
      postBlockStateSetSha256: stateSetSha256(postWoody),
      driftCount: woodyDrift.length,
      targetIntersectionCount: 0,
    },
    r09bR09cR09d: {
      ...exactSet(r09Cells),
      desiredAndUnchangedCount: r09Cells.length - r09Mismatches.length,
      mismatchCount: r09Mismatches.length,
      driftCount: r09Drift.length,
      retainedUpperHoldPreserved: true,
    },
  },
  executionAndRollback: operationEvidence,
  checks,
  summary: {
    passed: true,
    checkCount: checks.length,
    passCount: checks.length,
    failCount: 0,
    exactTargetCount: EXPECTED.targetCount,
    foundationTargetCount: EXPECTED.foundationCount,
    headhouseTargetCount: EXPECTED.headhouseCount,
    stablePierCount: 4,
    connectedDeckCellCount: EXPECTED.deckCount,
    closedTopFaceCellCount: EXPECTED.topFaceCount,
    connectedHeadroomCellCount: EXPECTED.headroomCount,
    closedBoundaryCellCount: EXPECTED.boundaryCount,
    retainedWoodyCellCount: sourceWoody.length,
    preservedR09CellCount: r09Cells.length,
    undeclaredChangedCellCount: 0,
    rollbackGuardCount: EXPECTED.targetCount,
  },
  commissioningBoundary: {
    supportedSurfaceArchitectureAccepted: true,
    shaftOrEgressOpened: false,
    exteriorDoorInstalled: false,
    routeBeyondR09RetainedHoldCommissioned: false,
    liftSmokePowerDrainageOrControlsCommissioned: false,
  },
  safetyBoundary: {
    readOnly: true,
    liveCallsPerformed: false,
    worldMutated: false,
    rconInvoked: false,
    serviceMutated: false,
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, qaPayloadSha256 };

const markdown = [
  '# CZ-R07J B07 supported surface headhouse post-release QA',
  '',
  `**Status:** ${report.status}`,
  `**QA payload SHA-256:** \`${qaPayloadSha256}\``,
  `**Completed release identity:** \`${ledger.completedReleaseIdentitySha256}\``,
  '',
  `All ${EXPECTED.targetCount} exact transitions pass: ${EXPECTED.foundationCount} foundation and ${EXPECTED.headhouseCount} headhouse cells.`,
  `The four piers remain continuous to the connected ${EXPECTED.deckCount}-cell deck and retain four unchanged stable ground contacts.`,
  `The ${EXPECTED.topFaceCount}-cell shaft cap is fully closed; the ${EXPECTED.headroomCount}-cell headroom is one connected air component inside a closed ${EXPECTED.boundaryCount}-cell boundary.`,
  `${sourceWoody.length} tree/log/leaf cells and all ${r09Cells.length} R09B/C/D cells are unchanged. The ${EXPECTED.reviewCount}-cell surface review domain has exactly ${EXPECTED.targetCount} declared changes and zero undeclared drift.`,
  '',
  'This seal accepts only the supported, fail-closed surface architecture. It does not open or commission the shaft, an exterior door, lift, smoke control, power, drainage, or a route beyond the retained R09 hold.',
  '',
  'No live call, RCON command, service mutation, or world edit was performed by this QA.',
  '',
].join('\n');
fs.mkdirSync(path.dirname(absolute(OUT_PATH)), { recursive: true });
fs.mkdirSync(path.dirname(absolute(MARKDOWN_PATH)), { recursive: true });
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(MARKDOWN_PATH), markdown);
console.log(JSON.stringify({
  status: report.status,
  qaPayloadSha256,
  output: relative(OUT_PATH),
  markdown: relative(MARKDOWN_PATH),
  exactTargetCount: EXPECTED.targetCount,
  undeclaredChangedCellCount: 0,
  liveCallsPerformed: false,
}, null, 2));
