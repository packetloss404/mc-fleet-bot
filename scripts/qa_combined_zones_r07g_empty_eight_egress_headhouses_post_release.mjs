#!/usr/bin/env node
/** Read-only post-release QA and seal for CZ-R07G Empty Eight egress headhouses. */

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

const GENERATED_AT = value('--generated-at', '2026-08-21T18:20:00Z');
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r07g-live-20260821T181527Z',
);
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r07g-empty-eight-egress-headhouses.release-manifest.json',
);
const SOURCE_ROOT = value(
  '--source-root',
  'data/worldsnap-combined-zones-r07g-source-20260821T181527Z',
);
const POST_ROOT = value(
  '--post-root',
  'data/worldsnap-combined-zones-r07g-post-20260821T181527Z',
);
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r07g-post-release-qa.json'));
const MARKDOWN_PATH = value(
  '--markdown',
  path.join(EVIDENCE_DIR, 'r07g-post-release-qa.md'),
);
const AIR = 'minecraft:air';
const POLISHED = 'minecraft:polished_deepslate';
const SMOOTH = 'minecraft:smooth_stone';
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
];

const EXPECTED = Object.freeze({
  transactionId: 'combined-zones-r07g-empty-eight-egress-headhouses',
  releaseNodeId: 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
  manifestIdentity: 'f0733a6a4b925043eb495299dd682290ad943cd4a8184ec516c4e3c7353d9d0e',
  manifestFileSha256: '9113c0b7d95f1991239d2e92a57c39709f481fafb0242562903914bd27e6a62e',
  ledgerFileSha256: 'de283824ad70c1b0b1e46d7070c4c3622210f67b703a20a1b0fa791779341689',
  sourceCompleteSaveSha256: '516e0574e8928eb038e8d6dfd67334e64bcb63d79baa2c31970715750867d96f',
  sourceRegionSha256: 'e24b137b290835163110a0c259b7bca5df9a03ab3cc1fd621f8f23912ec25311',
  postCompleteSaveSha256: '98086a3bc4584ba82ee287f1425f32435a2f41e1ce5f3a72482a50e225f8b8e4',
  postRegionSha256: 'd3c7f46034a4cab20819c51a4ee505a46be81065fda887c19ebe3638f2d83ad8',
  sourceBoundReleaseIdentitySha256: 'ed684c352dc3317aa70396f62f0043bbf1c67b0932b5410cba75cbfb7b2c7dc5',
  completedReleaseIdentitySha256: '79b6e5972cfc24770cb402f740407bc7c01113d728d5cca0b765894c0066335e',
  evidenceBindingCount: 25,
  stageCount: 24,
  reviewDomainCellCount: 2597,
  reviewDomainSha256: '90ad64bdcaaf99fd994c89c5707457b966a942a96d8fc0dba1377159432c69eb',
  operatedCellCount: 228,
  beeSource: { x: 1849, y: 66, z: 145 },
  beeDestination: { x: 1811, y: 67, z: 378 },
  cores: {
    'EG-A': {
      owner: 'OWN-D06-EG-A', center: { x: 1652, y: 80, z: 148 },
      operatedCount: 121,
      operatedSha256: '1bf66c17a230336f87214b818fed48df68600ec43bf7aef4352a1c22dc678959',
      shellSha256: '6c4048fc4430f42e0cd2fc39b11248576c331e78e0736793a5ddf0bd554e4e3e',
      landingSha256: '7804f958a0893494d86395f0a07a949ccd201cf11713084ea3ddeb0832f71fc9',
      interiorSha256: '4b66e2391225a4811607ef4a80b7e5eb0ed733140fa7f33c728e1046c62896e3',
      boundarySha256: 'f15eae81204f08bbbebb559f12901e3bff54c511b1a0ea83a3c54703450742a7',
      roofTransitionCapSha256: '9835faf551236132e890b9965174e8f2688181987911c4b200b911a964d16aad',
      landingCensus: { [POLISHED]: 30, [SMOOTH]: 19 },
      shellCensus: { [POLISHED]: 151, [SMOOTH]: 19 },
      approachWallCount: 0,
    },
    'EG-B': {
      owner: 'OWN-D06-EG-B', center: { x: 1852, y: 71, z: 148 },
      operatedCount: 107,
      operatedSha256: 'f6179e01ab4c51bd72abf6749bcae4d10676e55fb1dfcde005573be5a3be03fe',
      shellSha256: '0a1566dc60205db8f5d3dd625a58e998b52ea1c1b2b4736857de43db5cf0ef9b',
      landingSha256: '03af6c45f06056d159574f75a5f8ecb54aeec6aab9fc8a9f9e4cb419cca948c9',
      interiorSha256: 'f1fa90c6189fab1a1b9c1410d7055d46bf68d2a123ca2e32956ce8287473fc62',
      boundarySha256: '2db1304a25589c027acc125a24e9b41a3299015ae776df99968bb874b7985873',
      roofTransitionCapSha256: 'effffe3dff1d28d75ed234f2ab61e5f3e7abe7ee867ffff459c3562e34f1244c',
      landingCensus: { [POLISHED]: 34, [SMOOTH]: 15 },
      shellCensus: { [POLISHED]: 155, [SMOOTH]: 15 },
      approachWallCount: 14,
    },
  },
});

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const samePath = (left, right) => absolute(left) === absolute(right);
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R07G post-release QA rejected: ${message}`);
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
const sameObject = (left, right) => JSON.stringify(left) === JSON.stringify(right);

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

function connectedComponents(cells) {
  const remaining = new Set(cells.map(cellKey));
  const sizes = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const stack = [first];
    let size = 0;
    while (stack.length) {
      const key = stack.pop();
      const [x, y, z] = key.split(',').map(Number);
      size += 1;
      for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
        const neighbour = `${x + dx},${y + dy},${z + dz}`;
        if (remaining.delete(neighbour)) stack.push(neighbour);
      }
    }
    sizes.push(size);
  }
  sizes.sort((left, right) => right - left);
  return { componentCount: sizes.length, largestComponentCellCount: sizes[0] ?? 0 };
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

async function blockEntityAt(reader, cell) {
  const chunk = await reader.chunk(Math.floor(cell.x / 16), Math.floor(cell.z / 16));
  return (chunk?.block_entities ?? chunk?.blockEntities ?? []).find((entity) => (
    Number(entity.x) === cell.x && Number(entity.y) === cell.y && Number(entity.z) === cell.z
  )) ?? null;
}

function buildCore(name, spec) {
  const { x, y, z } = spec.center;
  const landing = cellsIn({
    minX: x - 3, maxX: x + 3, minY: y, maxY: y, minZ: z - 3, maxZ: z + 3,
  });
  const interior = cellsIn({
    minX: x - 2, maxX: x + 2, minY: y + 1, maxY: y + 3,
    minZ: z - 2, maxZ: z + 2,
  });
  const envelope = cellsIn({
    minX: x - 3, maxX: x + 3, minY: y, maxY: y + 4,
    minZ: z - 3, maxZ: z + 3,
  });
  const shell = difference(envelope, interior);
  const interiorKeys = new Set(interior.map(cellKey));
  const boundary = uniqueCells(interior.flatMap((cell) => FACE_NEIGHBOURS.map(
    ([dx, dy, dz]) => ({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz }),
  )).filter((cell) => !interiorKeys.has(cellKey(cell))));
  const roofTransitionCap = cellsIn({
    minX: x - 3, maxX: x + 3, minY: 54, maxY: 54, minZ: z - 3, maxZ: z + 3,
  });
  const approachWall = name === 'EG-B' ? cellsIn({
    minX: x - 3, maxX: x + 3, minY: y + 1, maxY: y + 2,
    minZ: z + 3, maxZ: z + 3,
  }) : [];
  const operated = difference(shell, [...landing, ...approachWall]);
  const reviewDomain = cellsIn({
    minX: x - 3, maxX: x + 3, minY: 54, maxY: y + 4,
    minZ: z - 3, maxZ: z + 3,
  });
  invariant(landing.length === 49 && interior.length === 75 && envelope.length === 245
    && shell.length === 170 && boundary.length === 110 && roofTransitionCap.length === 49
    && approachWall.length === spec.approachWallCount && operated.length === spec.operatedCount,
  `${name} independently derived geometry cardinality drifted`);
  invariant(hashCells(landing) === spec.landingSha256
    && hashCells(interior) === spec.interiorSha256
    && hashCells(shell) === spec.shellSha256
    && hashCells(boundary) === spec.boundarySha256
    && hashCells(roofTransitionCap) === spec.roofTransitionCapSha256
    && hashCells(operated) === spec.operatedSha256,
  `${name} independently derived geometry identity drifted`);
  const shellKeys = new Set(shell.map(cellKey));
  invariant(boundary.every((cell) => shellKeys.has(cellKey(cell))),
    `${name} headroom boundary is not fully owned by the shell`);
  return {
    name, spec, landing, interior, envelope, shell, boundary,
    roofTransitionCap, approachWall, operated, reviewDomain,
  };
}

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
const ledgerBinding = fileBinding(LEDGER_PATH);
const manifestBinding = fileBinding(MANIFEST_PATH);
invariant(ledgerBinding.sha256 === EXPECTED.ledgerFileSha256,
  'terminal execution ledger file identity drifted');
invariant(manifestBinding.sha256 === EXPECTED.manifestFileSha256,
  'canonical manifest file identity drifted');
const manifestPayload = { ...manifest };
delete manifestPayload.manifestIdentity;
invariant(manifest.manifestIdentity === EXPECTED.manifestIdentity
  && manifest.manifestIdentity === sha256(JSON.stringify(manifestPayload)),
'manifest payload identity drifted');
invariant(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.mode === 'EXECUTE'
  && ledger.transactionId === EXPECTED.transactionId
  && ledger.releaseNodeId === EXPECTED.releaseNodeId
  && ledger.stages?.length === EXPECTED.stageCount
  && ledger.stages.every(({ status }) => status === 'PASS'),
'execution ledger is not a complete terminal R07G release');
invariant(manifest.transactionId === EXPECTED.transactionId
  && manifest.releaseNodeId === EXPECTED.releaseNodeId
  && samePath(ledger.manifest.path, MANIFEST_PATH)
  && ledger.manifest.sha256 === manifestBinding.sha256,
'ledger and manifest release identities do not match');

const sourceIntakePath = ledger.sourceSnapshot.completeSaveIntake.path;
const postIntakePath = ledger.postSnapshot.completeSaveIntake.path;
const sourceIdentityPath = ledger.sourceSnapshot.identity.path;
const postIdentityPath = ledger.postSnapshot.identity.path;
const sourceIntake = readJson(sourceIntakePath);
const postIntake = readJson(postIntakePath);
const sourceIdentity = readJson(sourceIdentityPath);
const postIdentity = readJson(postIdentityPath);
invariant(samePath(ledger.sourceSnapshot.root, SOURCE_ROOT)
  && samePath(ledger.postSnapshot.root, POST_ROOT)
  && ledger.sourceSnapshot.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.postCompleteSaveSha256,
'source or post complete-save ledger binding drifted');
invariant(sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && sourceIntake.packageIdentity.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && postIntake.packageIdentity.completeSaveSha256 === EXPECTED.postCompleteSaveSha256,
'source or post intake is not a complete immutable same-moment save');
invariant(sourceIdentity.sha256 === EXPECTED.sourceRegionSha256
  && postIdentity.sha256 === EXPECTED.postRegionSha256
  && samePath(sourceIdentity.directory, path.join(SOURCE_ROOT, 'region'))
  && samePath(postIdentity.directory, path.join(POST_ROOT, 'region')),
'source or post region snapshot identity drifted');

const evidenceBindingFailures = [];
for (const binding of ledger.evidenceBindings ?? []) {
  const current = fileBinding(binding.path);
  if (current.sha256 !== binding.sha256 || current.bytes !== binding.bytes) {
    evidenceBindingFailures.push({ expected: binding, observed: current });
  }
}
invariant(ledger.evidenceBindings?.length === EXPECTED.evidenceBindingCount
  && evidenceBindingFailures.length === 0,
'terminal evidence bindings are missing or drifted');
const recomputedSourceBoundReleaseIdentity = sha256(JSON.stringify({
  executionBindingSha256: ledger.executionBindingSha256,
  sourceCompleteSaveSha256: sourceIntake.packageIdentity.completeSaveSha256,
  sourceRegionSha256: sourceIdentity.sha256,
}));
invariant(ledger.sourceBoundReleaseIdentitySha256
    === EXPECTED.sourceBoundReleaseIdentitySha256
  && ledger.sourceBoundReleaseIdentitySha256 === recomputedSourceBoundReleaseIdentity,
'source-bound release identity drifted');
const recomputedCompletedReleaseIdentity = sha256(JSON.stringify({
  sourceBoundReleaseIdentitySha256: ledger.sourceBoundReleaseIdentitySha256,
  postCompleteSaveSha256: postIntake.packageIdentity.completeSaveSha256,
  postRegionSha256: postIdentity.sha256,
  rollbackPoststatePreflights: ledger.rollbackPoststatePreflights.map(
    ({ path: reportPath, sha256: reportSha256 }) => ({ path: reportPath, sha256: reportSha256 }),
  ),
  evidenceBindingsSha256: sha256(JSON.stringify(ledger.evidenceBindings)),
}));
invariant(ledger.completedReleaseIdentitySha256 === EXPECTED.completedReleaseIdentitySha256
  && ledger.completedReleaseIdentitySha256 === recomputedCompletedReleaseIdentity,
'completed release identity drifted');

invariant(sameObject(manifest.scope.canonicalOwners, ['OWN-D06-EG-A', 'OWN-D06-EG-B'])
  && manifest.scope.cores['EG-A'].canonicalOwner === 'OWN-D06-EG-A'
  && manifest.scope.cores['EG-B'].canonicalOwner === 'OWN-D06-EG-B',
'canonical egress ownership registry bindings drifted');
const cores = Object.entries(EXPECTED.cores).map(([name, spec]) => buildCore(name, spec));
const reviewDomain = uniqueCells(cores.flatMap(({ reviewDomain: cells }) => cells));
invariant(reviewDomain.length === EXPECTED.reviewDomainCellCount
  && hashCells(reviewDomain) === EXPECTED.reviewDomainSha256,
'complete two-core post-release review domain drifted');

const packageEvidence = [];
const allForwardRecords = [];
for (const core of cores) {
  const packageKey = core.name === 'EG-A'
    ? 'eg-a-sealed-surface-headhouse' : 'eg-b-sealed-surface-headhouse';
  const pkg = manifest.packages.find(({ key }) => key === packageKey);
  invariant(pkg, `${packageKey} is absent from the manifest`);
  const forward = parseOperations(pkg.forward);
  const rollback = parseOperations(pkg.rollback);
  const expandedForward = expandOperations(forward);
  const operationManifest = manifest.operations[packageKey];
  invariant(forward.length === core.spec.operatedCount
    && rollback.length === core.spec.operatedCount
    && expandedForward.length === core.spec.operatedCount
    && hashCells(expandedForward.map(({ cell }) => cell)) === core.spec.operatedSha256
    && forward.every(({ from, to, fromState, toState }) => (
      sameObject(from, to) && fromState === AIR && toState === POLISHED
    )),
  `${packageKey} is not the exact one-cell air-to-polished-deepslate package`);
  invariant(rollback.every((operation, index) => {
    const inverse = forward.at(-(index + 1));
    return sameObject(operation.from, inverse.from)
      && sameObject(operation.to, inverse.to)
      && operation.fromState === inverse.toState
      && operation.toState === inverse.fromState;
  }), `${packageKey} rollback is not the exact reverse-order inverse`);
  invariant(sha256(operationBody(pkg.forward)) === operationManifest.forwardSha256
    && sha256(operationBody(pkg.rollback)) === operationManifest.rollbackSha256,
  `${packageKey} operation-body identity drifted`);

  const executionPath = path.join(EVIDENCE_DIR, `${packageKey}.forward-execution.json`);
  const rollbackPath = path.join(EVIDENCE_DIR, `${packageKey}.rollback-poststate-preflight.json`);
  const execution = readJson(executionPath);
  const rollbackPreflight = readJson(rollbackPath);
  const forwardFileSha256 = sha256(fs.readFileSync(absolute(pkg.forward)));
  const rollbackFileSha256 = sha256(fs.readFileSync(absolute(pkg.rollback)));
  const strictExecutionPassed = execution.schemaVersion === 3
    && execution.status === 'complete'
    && execution.dryRun === false
    && execution.strictNoop === true
    && execution.operationRole === 'forward'
    && execution.operationSha256 === forwardFileSha256
    && execution.sourceOperationCount === core.spec.operatedCount
    && execution.sourceGroupCount === core.spec.operatedCount
    && execution.successfulGroups === core.spec.operatedCount
    && execution.failedGroups === 0
    && execution.successfulCommands === core.spec.operatedCount
    && execution.failedCommands === 0
    && execution.noopCommands === 0
    && execution.unexpectedNoopCommands === 0
    && execution.unknownReplyCommands === 0
    && execution.worldEditLeftoverCount === 0;
  const overlayArtifacts = rollbackPreflight.sourceOverlays?.artifacts ?? [];
  const expectedOverlay = core.name === 'EG-A'
    ? manifest.packages.find(({ key }) => key === 'eg-b-sealed-surface-headhouse')
    : null;
  const rollbackPassed = rollbackPreflight.status === 'PASS'
    && samePath(rollbackPreflight.opsPath, pkg.rollback)
    && rollbackPreflight.opsSha256 === rollbackFileSha256
    && rollbackPreflight.operationCount === core.spec.operatedCount
    && rollbackPreflight.passed === core.spec.operatedCount
    && rollbackPreflight.failed === 0
    && rollbackPreflight.regionsSnapshot?.sha256 === EXPECTED.postRegionSha256
    && (core.name === 'EG-B'
      ? rollbackPreflight.sourceOverlays === null
      : overlayArtifacts.length === 1
        && samePath(overlayArtifacts[0].path, expectedOverlay.rollback)
        && overlayArtifacts[0].sha256
          === sha256(fs.readFileSync(absolute(expectedOverlay.rollback)))
        && overlayArtifacts[0].operationCount === EXPECTED.cores['EG-B'].operatedCount
        && rollbackPreflight.sourceOverlays.passed === EXPECTED.cores['EG-B'].operatedCount
        && rollbackPreflight.sourceOverlays.failed === 0);
  invariant(strictExecutionPassed, `${packageKey} strict live execution evidence failed`);
  invariant(rollbackPassed, `${packageKey} reverse rollback post-state evidence failed`);
  allForwardRecords.push(...expandedForward);
  packageEvidence.push({
    key: packageKey,
    operationCount: core.spec.operatedCount,
    targetCoordinateSetSha256: core.spec.operatedSha256,
    forwardFile: fileBinding(pkg.forward),
    rollbackFile: fileBinding(pkg.rollback),
    forwardBodySha256: operationManifest.forwardSha256,
    rollbackBodySha256: operationManifest.rollbackSha256,
    exactOneCellForwardGuards: true,
    exactReverseOrderInverse: true,
    strictForwardExecution: {
      ...fileBinding(executionPath),
      successfulGroups: execution.successfulGroups,
      failedGroups: execution.failedGroups,
      noopCommands: execution.noopCommands,
      unexpectedNoopCommands: execution.unexpectedNoopCommands,
      unknownReplyCommands: execution.unknownReplyCommands,
      passed: strictExecutionPassed,
    },
    rollbackPoststatePreflight: {
      ...fileBinding(rollbackPath),
      passedGuards: rollbackPreflight.passed,
      failedGuards: rollbackPreflight.failed,
      regionSnapshotSha256: rollbackPreflight.regionsSnapshot.sha256,
      overlayOperationCount: rollbackPreflight.sourceOverlays?.operationCount ?? 0,
      passed: rollbackPassed,
    },
  });
}

const operatedCells = allForwardRecords.map(({ cell }) => cell);
invariant(operatedCells.length === EXPECTED.operatedCellCount
  && new Set(operatedCells.map(cellKey)).size === EXPECTED.operatedCellCount,
'the two operation packages overlap or have the wrong total target count');
const sourceReader = new AnvilReader(absolute(path.join(SOURCE_ROOT, 'region')));
const postReader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
const sourceStates = await stateMap(sourceReader, reviewDomain);
const postStates = await stateMap(postReader, reviewDomain);
const recordsFor = (cells, map) => cells.map((cell) => ({ cell, state: map.get(cellKey(cell)) }));
const changedCells = reviewDomain.filter((cell) => (
  sourceStates.get(cellKey(cell)) !== postStates.get(cellKey(cell))
));
const operatedKeys = new Set(operatedCells.map(cellKey));
const undeclaredChangedCells = changedCells.filter((cell) => !operatedKeys.has(cellKey(cell)));
const missingDeclaredChanges = operatedCells.filter(
  (cell) => !changedCells.some((changed) => cellKey(changed) === cellKey(cell)),
);
invariant(changedCells.length === EXPECTED.operatedCellCount
  && undeclaredChangedCells.length === 0 && missingDeclaredChanges.length === 0,
'the complete 2,597-cell review domain contains undeclared or missing changes');

const coreResults = [];
for (const core of cores) {
  const sourceOperated = recordsFor(core.operated, sourceStates);
  const postOperated = recordsFor(core.operated, postStates);
  const sourceLanding = recordsFor(core.landing, sourceStates);
  const postLanding = recordsFor(core.landing, postStates);
  const sourceApproach = recordsFor(core.approachWall, sourceStates);
  const postApproach = recordsFor(core.approachWall, postStates);
  const sourceInterior = recordsFor(core.interior, sourceStates);
  const postInterior = recordsFor(core.interior, postStates);
  const sourceShell = recordsFor(core.shell, sourceStates);
  const postShell = recordsFor(core.shell, postStates);
  const sourceBoundary = recordsFor(core.boundary, sourceStates);
  const postBoundary = recordsFor(core.boundary, postStates);
  const sourceRoofCap = recordsFor(core.roofTransitionCap, sourceStates);
  const postRoofCap = recordsFor(core.roofTransitionCap, postStates);
  const transitionMismatches = core.operated.filter((cell) => (
    sourceStates.get(cellKey(cell)) !== AIR || postStates.get(cellKey(cell)) !== POLISHED
  ));
  const landingDrift = core.landing.filter((cell) => (
    sourceStates.get(cellKey(cell)) !== postStates.get(cellKey(cell))
  ));
  const approachDrift = core.approachWall.filter((cell) => (
    sourceStates.get(cellKey(cell)) !== postStates.get(cellKey(cell))
  ));
  const interiorMismatches = core.interior.filter((cell) => (
    sourceStates.get(cellKey(cell)) !== AIR || postStates.get(cellKey(cell)) !== AIR
  ));
  const roofCapMismatches = core.roofTransitionCap.filter((cell) => (
    sourceStates.get(cellKey(cell)) !== SMOOTH || postStates.get(cellKey(cell)) !== SMOOTH
  ));
  const forbiddenShellBlocks = postShell.filter(({ state }) => (
    state === AIR || /(?:door|trapdoor|ladder|scaffolding|water|lava)/.test(state)
  ));
  const interiorConnectivity = connectedComponents(
    postInterior.filter(({ state }) => state === AIR).map(({ cell }) => cell),
  );
  invariant(transitionMismatches.length === 0,
    `${core.name} does not contain all ${core.spec.operatedCount} exact target states`);
  invariant(landingDrift.length === 0
    && sameObject(stateCensus(sourceLanding), core.spec.landingCensus)
    && sameObject(stateCensus(postLanding), core.spec.landingCensus),
  `${core.name} accepted 49-cell landing changed`);
  invariant(approachDrift.length === 0
    && sourceApproach.every(({ state }) => state === POLISHED)
    && postApproach.every(({ state }) => state === POLISHED),
  `${core.name} accepted R02 approach-cap wall changed`);
  invariant(interiorMismatches.length === 0
    && interiorConnectivity.componentCount === 1
    && interiorConnectivity.largestComponentCellCount === 75,
  `${core.name} 75-cell headroom is not preserved connected air`);
  invariant(sameObject(stateCensus(postShell), core.spec.shellCensus)
    && forbiddenShellBlocks.length === 0
    && postBoundary.every(({ state }) => state !== AIR),
  `${core.name} complete 170-cell shell is not closed and static`);
  invariant(roofCapMismatches.length === 0,
    `${core.name} 49-cell Y54 roof-transition cap changed or opened`);

  coreResults.push({
    core: core.name,
    canonicalOwner: core.spec.owner,
    geometry: {
      completeSurfaceEnvelope: exactSet(core.envelope),
      completeStaticShell: exactSet(core.shell),
      acceptedLandingCap: exactSet(core.landing),
      acceptedApproachCapWall: exactSet(core.approachWall),
      newWallAndRoof: exactSet(core.operated),
      connectedHeadroom: {
        ...exactSet(core.interior),
        ...interiorConnectivity,
      },
      enclosedHeadroomFaceBoundary: exactSet(core.boundary),
      roofTransitionCapY54: exactSet(core.roofTransitionCap),
      reviewDomain: exactSet(core.reviewDomain),
    },
    postState: {
      exactTargetTransitions: {
        expectedSourceState: AIR,
        expectedPostState: POLISHED,
        matchingCount: core.operated.length - transitionMismatches.length,
        mismatchCount: transitionMismatches.length,
      },
      acceptedLandingCap: {
        sourceStateCensus: stateCensus(sourceLanding),
        postStateCensus: stateCensus(postLanding),
        unchangedCellCount: core.landing.length - landingDrift.length,
        changedCellCount: landingDrift.length,
      },
      acceptedApproachCapWall: {
        sourceStateCensus: stateCensus(sourceApproach),
        postStateCensus: stateCensus(postApproach),
        unchangedCellCount: core.approachWall.length - approachDrift.length,
        changedCellCount: approachDrift.length,
      },
      completeStaticShell: {
        sourceStateCensus: stateCensus(sourceShell),
        postStateCensus: stateCensus(postShell),
        closedCellCount: postShell.filter(({ state }) => state !== AIR).length,
        forbiddenOpeningOrDynamicCellCount: forbiddenShellBlocks.length,
        noDoorOrShaftOpening: forbiddenShellBlocks.length === 0,
      },
      connectedHeadroom: {
        sourceStateCensus: stateCensus(sourceInterior),
        postStateCensus: stateCensus(postInterior),
        unchangedAirCellCount: core.interior.length - interiorMismatches.length,
        mismatchCount: interiorMismatches.length,
        connectivity: interiorConnectivity,
      },
      enclosedFaceBoundary: {
        sourceStateCensus: stateCensus(sourceBoundary),
        postStateCensus: stateCensus(postBoundary),
        closedCellCount: postBoundary.filter(({ state }) => state !== AIR).length,
        openingCount: postBoundary.filter(({ state }) => state === AIR).length,
      },
      roofTransitionCapY54: {
        sourceStateCensus: stateCensus(sourceRoofCap),
        postStateCensus: stateCensus(postRoofCap),
        unchangedClosedCellCount: core.roofTransitionCap.length - roofCapMismatches.length,
        mismatchCount: roofCapMismatches.length,
      },
    },
  });
}

const shellAndInteriorKeys = new Set(cores.flatMap(
  ({ shell, interior }) => [...shell, ...interior],
).map(cellKey));
const postBlockEntities = [];
for (const chunkPoint of manifest.source.touchedChunks) {
  const chunk = await postReader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (shellAndInteriorKeys.has(cellKey(point))) {
      postBlockEntities.push({ id: entity.id ?? null, point });
    }
  }
}
invariant(postBlockEntities.length === 0,
  'a post-release shell or interior contains a block entity');

const beeSourceSourceState = stateToCommandString(await sourceReader.blockState(
  EXPECTED.beeSource.x, EXPECTED.beeSource.y, EXPECTED.beeSource.z,
));
const beeSourcePostState = stateToCommandString(await postReader.blockState(
  EXPECTED.beeSource.x, EXPECTED.beeSource.y, EXPECTED.beeSource.z,
));
const beeSourceSourceEntity = await blockEntityAt(sourceReader, EXPECTED.beeSource);
const beeSourcePostEntity = await blockEntityAt(postReader, EXPECTED.beeSource);
const beeDestinationSourceState = stateToCommandString(await sourceReader.blockState(
  EXPECTED.beeDestination.x, EXPECTED.beeDestination.y, EXPECTED.beeDestination.z,
));
const beeDestinationPostState = stateToCommandString(await postReader.blockState(
  EXPECTED.beeDestination.x, EXPECTED.beeDestination.y, EXPECTED.beeDestination.z,
));
const beeDestinationSourceEntity = await blockEntityAt(sourceReader, EXPECTED.beeDestination);
const beeDestinationPostEntity = await blockEntityAt(postReader, EXPECTED.beeDestination);
const beeProjection = (entity) => ({
  id: entity?.id ?? null,
  beeCount: entity?.bees?.length ?? 0,
  beeIds: (entity?.bees ?? []).map(({ entity_data: data }) => data?.id ?? null).sort(),
  maxEntities: Number(entity?.['Bukkit.MaxEntities'] ?? 0),
});
const destinationSourceProjection = beeProjection(beeDestinationSourceEntity);
const destinationPostProjection = beeProjection(beeDestinationPostEntity);
const BEE_NEST = 'minecraft:bee_nest[facing=south,honey_level=0]';
invariant(beeSourceSourceState === AIR && beeSourcePostState === AIR
  && beeSourceSourceEntity === null && beeSourcePostEntity === null,
'accepted bee source is no longer empty in source and post states');
invariant(beeDestinationSourceState === BEE_NEST && beeDestinationPostState === BEE_NEST
  && sameObject(destinationSourceProjection, {
    id: 'minecraft:beehive', beeCount: 3,
    beeIds: ['minecraft:bee', 'minecraft:bee', 'minecraft:bee'], maxEntities: 3,
  })
  && sameObject(destinationPostProjection, destinationSourceProjection),
'accepted destination bee nest or its three-bee projection changed');

const blockEntityClearancePath = path.join(EVIDENCE_DIR, 'block-entity-clearance.json');
const liveEntityClearancePath = path.join(EVIDENCE_DIR, 'live-entity-clearance.json');
const blockEntityClearance = readJson(blockEntityClearancePath);
const liveEntityClearance = readJson(liveEntityClearancePath);
invariant(blockEntityClearance.status === 'PASS'
  && blockEntityClearance.operationCount === EXPECTED.operatedCellCount
  && blockEntityClearance.blockingBlockEntityCount === 0
  && liveEntityClearance.status === 'PASS'
  && liveEntityClearance.passed === true
  && liveEntityClearance.blockOrEntityMutation === false
  && liveEntityClearance.packages?.length === 2
  && liveEntityClearance.packages.every(({ passed }) => passed === true),
'release-time block/live entity clearance evidence failed');

const checks = [];
const check = (id, detail) => checks.push({ id, status: 'PASS', detail });
check('R07G-QA-01-TERMINAL-LEDGER',
  `${ledger.stages.length}/${EXPECTED.stageCount} terminal execution stages PASS.`);
check('R07G-QA-02-RELEASE-IDENTITY',
  `Completed release identity ${ledger.completedReleaseIdentitySha256}.`);
check('R07G-QA-03-EVIDENCE-BINDINGS',
  `${ledger.evidenceBindings.length}/${EXPECTED.evidenceBindingCount} bindings intact.`);
check('R07G-QA-04-EXACT-TARGETS',
  'EG-A 121/121 and EG-B 107/107 exact air-to-polished-deepslate states verified.');
check('R07G-QA-05-COMPLETE-SHELLS',
  'Both 170-cell static shells are complete, closed, and contain no door or shaft opening.');
check('R07G-QA-06-PRESERVED-LANDINGS',
  'Both accepted 49-cell landing caps and the 14-cell EG-B approach wall are unchanged.');
check('R07G-QA-07-CONNECTED-HEADROOM',
  'Each shell preserves one connected 75-cell air interior with a closed 110-cell face boundary.');
check('R07G-QA-08-ROOF-TRANSITION-CAPS',
  'Both 49-cell smooth-stone Y54 transition caps are unchanged and closed.');
check('R07G-QA-09-BEE-RELOCATION',
  'Former nest source remains empty; destination nest retains its three-bee projection.');
check('R07G-QA-10-NO-UNDECLARED-DRIFT',
  'All 228 and only 228 cells changed across the complete 2,597-cell two-core review domain.');
check('R07G-QA-11-ENTITY-CONTAINMENT',
  'Release-time clearances PASS and post shells/interiors contain zero block entities.');
check('R07G-QA-12-STRICT-EXECUTION',
  'Both strict executions completed 228/228 groups with zero failures, no-ops, unknowns, or leftovers.');
check('R07G-QA-13-EXACT-ROLLBACK',
  'Both operation files have exact reverse-order inverses and reverse rollback guards PASS 228/228.');

const reviewSourceRecords = recordsFor(reviewDomain, sourceStates);
const reviewPostRecords = recordsFor(reviewDomain, postStates);
const reportWithoutIdentity = {
  schemaVersion: 1,
  id: 'combined-zones-r07g-empty-eight-egress-headhouses-post-release-qa',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R07G_EMPTY_EIGHT_EGRESS_HEADHOUSES_POST_RELEASE_ACCEPTED',
  release: {
    transactionId: ledger.transactionId,
    releaseNodeId: ledger.releaseNodeId,
    scopeIds: manifest.scopeIds,
    canonicalOwners: manifest.scope.canonicalOwners,
    manifestIdentity: manifest.manifestIdentity,
    executionBindingSha256: ledger.executionBindingSha256,
    sourceBoundReleaseIdentitySha256: ledger.sourceBoundReleaseIdentitySha256,
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
  },
  bindings: {
    ledger: { ...ledgerBinding, status: ledger.status },
    manifest: { ...manifestBinding, manifestIdentity: manifest.manifestIdentity },
    evidenceBindingCount: ledger.evidenceBindings.length,
    evidenceBindingFailures,
    sourceCompleteSave: {
      root: SOURCE_ROOT,
      completeSaveSha256: sourceIntake.packageIdentity.completeSaveSha256,
      regionSnapshotSha256: sourceIdentity.sha256,
      intake: fileBinding(sourceIntakePath),
      regionIdentity: fileBinding(sourceIdentityPath),
    },
    postCompleteSave: {
      root: POST_ROOT,
      completeSaveSha256: postIntake.packageIdentity.completeSaveSha256,
      regionSnapshotSha256: postIdentity.sha256,
      intake: fileBinding(postIntakePath),
      regionIdentity: fileBinding(postIdentityPath),
    },
  },
  geometryAndPostState: coreResults,
  fullReviewDomain: {
    ...exactSet(reviewDomain),
    sourceStateCensus: stateCensus(reviewSourceRecords),
    postStateCensus: stateCensus(reviewPostRecords),
    sourceStateSetSha256: stateSetSha256(reviewSourceRecords),
    postStateSetSha256: stateSetSha256(reviewPostRecords),
    declaredChangedCellCount: operatedCells.length,
    observedChangedCellCount: changedCells.length,
    undeclaredChangedCellCount: undeclaredChangedCells.length,
    missingDeclaredChangeCount: missingDeclaredChanges.length,
  },
  beeRelocation: {
    source: {
      point: EXPECTED.beeSource,
      sourceState: beeSourceSourceState,
      postState: beeSourcePostState,
      sourceBlockEntity: beeSourceSourceEntity,
      postBlockEntity: beeSourcePostEntity,
      preservedEmpty: true,
    },
    destination: {
      point: EXPECTED.beeDestination,
      sourceState: beeDestinationSourceState,
      postState: beeDestinationPostState,
      sourceProjection: destinationSourceProjection,
      postProjection: destinationPostProjection,
      preserved: true,
    },
  },
  entityContainment: {
    blockEntityClearance: fileBinding(blockEntityClearancePath),
    liveEntityClearance: fileBinding(liveEntityClearancePath),
    releaseTimeBlockingBlockEntityCount: blockEntityClearance.blockingBlockEntityCount,
    postShellAndInteriorBlockEntityCount: postBlockEntities.length,
  },
  executionAndRollback: packageEvidence,
  checks,
  summary: {
    passed: true,
    checkCount: checks.length,
    passCount: checks.length,
    failCount: 0,
    exactTargetCount: operatedCells.length,
    completeShellCellCount: cores.reduce((sum, { shell }) => sum + shell.length, 0),
    preservedLandingCellCount: cores.reduce((sum, { landing }) => sum + landing.length, 0),
    preservedApproachWallCellCount: cores.reduce(
      (sum, { approachWall }) => sum + approachWall.length, 0,
    ),
    connectedInteriorCellCount: cores.reduce((sum, { interior }) => sum + interior.length, 0),
    closedFaceBoundaryCellCount: cores.reduce((sum, { boundary }) => sum + boundary.length, 0),
    preservedRoofTransitionCapCellCount: cores.reduce(
      (sum, { roofTransitionCap }) => sum + roofTransitionCap.length, 0,
    ),
    reviewDomainCellCount: reviewDomain.length,
    observedChangedCellCount: changedCells.length,
    undeclaredChangedCellCount: undeclaredChangedCells.length,
    strictSuccessfulGroupCount: packageEvidence.reduce(
      (sum, pkg) => sum + pkg.strictForwardExecution.successfulGroups, 0,
    ),
    rollbackGuardPassCount: packageEvidence.reduce(
      (sum, pkg) => sum + pkg.rollbackPoststatePreflight.passedGuards, 0,
    ),
  },
  commissioningBoundary: {
    surfaceHeadhouseShellsPhysicallyAccepted: true,
    doorsInstalled: false,
    shaftsOrLiftsOpened: false,
    egressRouteCommissioned: false,
    futureInterfacesRemainSealed: true,
  },
  safetyBoundary: {
    liveCallsPerformed: false,
    serviceMutationPerformed: false,
    worldEditsPerformed: false,
    readOnlyImmutableAnvilInputs: true,
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, qaPayloadSha256 };
const markdown = `# CZ-R07G Empty Eight egress headhouses post-release QA\n\n`
  + `Status: **${report.status}**\n\n`
  + `- QA payload SHA-256: \`${qaPayloadSha256}\`\n`
  + `- Completed release identity: \`${ledger.completedReleaseIdentitySha256}\`\n`
  + `- Immutable post region: \`${postIdentity.sha256}\`\n`
  + `- Exact targets: **121/121 EG-A + 107/107 EG-B**\n`
  + `- Complete shells: **170/170 each**, including both preserved 49-cell landings\n`
  + `- Connected interiors: **75/75 air cells each**, one component per core\n`
  + `- Closed boundaries: **110/110 cells each**; no door or shaft opening\n`
  + `- Roof-transition caps: **49/49 smooth-stone cells each preserved at Y=54**\n`
  + `- Bee relocation: source empty; destination nest retains all three bees\n`
  + `- Review-domain drift: **228 declared changes / 0 undeclared** across 2,597 cells\n`
  + `- Strict execution: **228/228**, zero no-op/failure/unknown/leftover\n`
  + `- Reverse rollback guards: **228/228 PASS**\n\n`
  + `The two surface shells are accepted physical fabric only. Doors, shafts, lifts, `
  + `and egress-route commissioning remain deliberately absent and fail-closed.\n`;

fs.mkdirSync(path.dirname(absolute(OUT_PATH)), { recursive: true });
fs.mkdirSync(path.dirname(absolute(MARKDOWN_PATH)), { recursive: true });
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(MARKDOWN_PATH), markdown);
process.stdout.write(`${JSON.stringify({
  status: report.status,
  output: relative(OUT_PATH),
  markdown: relative(MARKDOWN_PATH),
  qaPayloadSha256,
  exactTargetCount: report.summary.exactTargetCount,
  completeShellCellCount: report.summary.completeShellCellCount,
  connectedInteriorCellCount: report.summary.connectedInteriorCellCount,
  undeclaredChangedCellCount: report.summary.undeclaredChangedCellCount,
  rollbackGuardPassCount: report.summary.rollbackGuardPassCount,
}, null, 2)}\n`);
