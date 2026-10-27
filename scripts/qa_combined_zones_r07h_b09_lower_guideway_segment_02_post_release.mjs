#!/usr/bin/env node
/** Independent read-only post-release QA for CZ-R07H B09 guideway Segment 02. */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  boundsOf,
  buildB09MinimumReservation,
  cellKey,
  cellsIn,
  dilateCells,
  hashCells,
  mountainSurfaceY,
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
const GENERATED_AT = value('--generated-at', '2026-08-21T18:40:00Z');
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r07h-live-20260821T183544Z',
);
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r07h-b09-lower-guideway-segment-02.release-manifest.json',
);
const SOURCE_ROOT = value(
  '--source-root',
  'data/worldsnap-combined-zones-r07h-source-20260821T183544Z',
);
const POST_ROOT = value(
  '--post-root',
  'data/worldsnap-combined-zones-r07h-post-20260821T183544Z',
);
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r07h-post-release-qa.json'));
const MARKDOWN_PATH = value(
  '--markdown',
  path.join(EVIDENCE_DIR, 'r07h-post-release-qa.md'),
);
const CONNECTORS_PATH =
  'docs/masterplans/05-combined-zones/phase1-connector-geometry.json';
const D05_PATH =
  'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json';
const PRIOR_MANIFESTS = Object.freeze({
  r07d: 'data/buildops/combined-zones-r07d-b09-lower-station-shell.release-manifest.json',
  r07e: 'data/buildops/combined-zones-r07e-b09-summit-headhouse-shell.release-manifest.json',
  r07f: 'data/buildops/combined-zones-r07f-b09-lower-guideway-segment-01.release-manifest.json',
});
const AIR = 'minecraft:air';
const DIORITE = 'minecraft:polished_diorite';
const EXPECTED = Object.freeze({
  manifestIdentity: 'a1797eff976b42649ba9dfc3cfa08112e85a6d06f73ca3a14427f6c3dc586416',
  manifestFileSha256: '63c8189593a9c6974fc5562630aee6ceffa30d268ccc69bec97f7e91dc5ac18e',
  ledgerSha256: '7bdc51889ce5a623deed492ef476cd57925649b46c9134c11ece035d7e8165bc',
  sourceBoundReleaseIdentitySha256:
    'be6e839f4334362c4710498964be327962f030c64fc69bfebd860e2f62bd9963',
  completedReleaseIdentitySha256:
    '1990844b4371b48ed6e5e851ec986cc908e9d5ed030d9760e226c04d02dfe88f',
  sourceCompleteSaveSha256:
    '670fb4e2a7034cc77ea30ca0fb3850e4c53e16d87cf061bdbad3d055bf09ffb6',
  sourceRegionSha256:
    '6d444e21d835bffd4a30ae704f746861cbf049db639caf51082648959bf8db30',
  postCompleteSaveSha256:
    '12df71af54a5e02e092190fa18b1f3d8206d929d507537cc0593318d7c23182e',
  postRegionSha256:
    '6fc61a5e77a930c3a4fdbddc5ed4a26205ec5980aca7825245c57d932a909b81',
  centerlinePointCount: 561,
  centerlineSha256:
    'e8905742a77148d13d799362da7d65e9b02bcf96455d580fbee27367b2d24221',
  accommodationCellCount: 7800,
  accommodationSha256: 'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  shellCellCount: 2152,
  shellSha256: 'e5a7cd983244d917f6a10a2fc85673f10d97460a62a5ac697f621d2330ee2097',
  seamCellCount: 2,
  seamSha256: '0ed8967e3b4982f7fe4e1a8d054561552a1c9a21a2c8e2f9ada2f252e8e2cbd7',
  operatedCellCount: 2154,
  operatedSha256: 'f797de91a3544c0e233cbbaadfd1a08bbc2b9b1141cd1cb1a0159f19710c1d9d',
  connectedVoidCellCount: 474,
  connectedVoidSha256: '33c4566c2030f7e9f5d7cac5a65bb5579a551a2e848a3354f543ef566e969eb1',
  boundaryCellCount: 1426,
  boundarySha256: '131169b3d54c7781fccd906c83c68d6c90ce50c8e3c0da3cd21f407dfb07b758',
  priorCollarCellCount: 10,
  priorCollarSha256: '3c823874a68900f5e67d354b87439ec8590b3a2f7309a6cf3262608b5346a714',
  farCapCellCount: 12,
  farCapSha256: 'aca98a89222480d4206b7c408d922ecc4d884d2228920bfbfc04f43d820a92b9',
  operationCount: 2154,
});
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
];

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const samePath = (left, right) => absolute(left) === absolute(right);
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R07H post-release QA rejected: ${message}`);
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

function manifestTargets(filename) {
  const manifest = readJson(filename);
  return uniqueCells(manifest.packages.flatMap((pkg) => (
    expandOperations(parseOperations(pkg.forward)).map(({ cell }) => cell)
  )));
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

function orderedCenterlineSha256(points) {
  const digest = crypto.createHash('sha256');
  digest.update('combined-zones-ordered-centerline-v1\n');
  for (const point of points) {
    digest.update(`${point.index}:${point.x},${point.y},${point.z}:${point.kind}\n`);
  }
  return digest.digest('hex');
}

function buildCenterline(model, endpoints) {
  const portal = endpoints.from;
  const summit = endpoints.to;
  let climbZ = portal.z - 1;
  while (climbZ > summit.z
    && mountainSurfaceY(portal.x, climbZ - 1, model)
      !== mountainSurfaceY(portal.x, climbZ, model)) climbZ -= 1;
  invariant(climbZ > summit.z, 'selected model has no level summit approach');
  let throatX = null;
  for (let distance = 1; distance <= model.extents.east; distance += 1) {
    const x = portal.x + distance;
    if (mountainSurfaceY(x, climbZ, model) === portal.y - 1
      && mountainSurfaceY(x - 1, climbZ, model) === portal.y - 1) {
      throatX = x;
      break;
    }
  }
  invariant(throatX !== null, 'selected model has no east-face throat');
  const faceRun = throatX - portal.x;
  const points = [];
  for (let distance = 0; distance <= faceRun; distance += 1) {
    points.push({
      x: portal.x + distance,
      y: portal.y,
      z: portal.z,
      kind: distance === 0 ? 'portal-interface' : 'level-station-throat',
    });
  }
  for (let offset = 1; offset <= portal.z - climbZ; offset += 1) {
    points.push({ x: throatX, y: portal.y, z: portal.z - offset, kind: 'level-hairpin' });
  }
  for (let distance = 1; distance <= faceRun; distance += 1) {
    const x = throatX - distance;
    points.push({
      x,
      y: mountainSurfaceY(x, climbZ, model) + 1,
      z: climbZ,
      kind: distance === 1 ? 'level-hairpin-exit' : 'face-ascent',
    });
  }
  const northRun = Math.abs(summit.z - climbZ);
  for (let distance = 1; distance <= northRun; distance += 1) {
    const z = climbZ - distance;
    points.push({
      x: summit.x,
      y: mountainSurfaceY(summit.x, z, model) + 1,
      z,
      kind: distance === 1 ? 'level-summit-curve-exit'
        : distance === northRun ? 'summit-interface' : 'summit-ascent',
    });
  }
  points.forEach((point, index) => { point.index = index; });
  return points;
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

async function states(reader, cells) {
  const result = [];
  for (const cell of uniqueCells(cells)) {
    result.push({
      cell,
      state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)),
    });
  }
  return result;
}

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
const ledgerBinding = fileBinding(LEDGER_PATH);
const manifestBinding = fileBinding(MANIFEST_PATH);
invariant(ledgerBinding.sha256 === EXPECTED.ledgerSha256
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.stages?.length === 17
  && ledger.stages.every(({ status }) => status === 'PASS'),
'terminal ledger identity or stage state drifted');
invariant(ledger.transactionId === manifest.transactionId
  && ledger.releaseNodeId === manifest.releaseNodeId
  && samePath(ledger.manifest.path, MANIFEST_PATH)
  && ledger.manifest.sha256 === manifestBinding.sha256
  && manifestBinding.sha256 === EXPECTED.manifestFileSha256,
'ledger/manifest scope or file binding drifted');
const manifestPayload = { ...manifest };
delete manifestPayload.manifestIdentity;
invariant(manifest.manifestIdentity === EXPECTED.manifestIdentity
  && manifest.manifestIdentity === sha256(JSON.stringify(manifestPayload)),
'manifest payload identity drifted');

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

const connectors = readJson(CONNECTORS_PATH);
const d05 = readJson(D05_PATH);
const selectedModel = d05.alternatives.find(
  ({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE',
);
invariant(selectedModel, 'selected FM-01 model is missing');
const endpoints = connectors.funicularFaceComparison.designEndpoints;
const centerline = buildCenterline(selectedModel.formula, endpoints);
invariant(centerline.length === EXPECTED.centerlinePointCount
  && orderedCenterlineSha256(centerline) === EXPECTED.centerlineSha256,
'ordered FM-01 centerline drifted');
const accommodation = buildB09MinimumReservation(selectedModel.formula, endpoints);
const segmentPoints = centerline.slice(24, 240);
invariant(segmentPoints.length === 216
  && segmentPoints.every((point, index) => (
    point.index === index + 24
    && point.x === index + 2072
    && point.y === 130
    && point.z === -748
  ))
  && centerline[240].x === 2288
  && centerline[240].z === -748,
'Segment 02 is not the maximal straight run ending before the first curve');
const priorSegmentEnvelope = cellsIn({
  minX: 2058, maxX: 2073,
  minY: 129, maxY: 132,
  minZ: -749, maxZ: -747,
});
const rawEnvelope = dilateCells(segmentPoints.flatMap(({ x, y, z }) => [
  { x, y, z }, { x, y: y + 1, z },
]), 1);
const newEnvelope = difference(rawEnvelope, priorSegmentEnvelope);
const segmentInterior = difference(segmentPoints.flatMap(({ x, y, z }) => [
  { x, y, z }, { x, y: y + 1, z },
]), priorSegmentEnvelope);
const shell = difference(newEnvelope, segmentInterior);
const seam = cellsIn({
  minX: 2073, maxX: 2073,
  minY: 130, maxY: 131,
  minZ: -748, maxZ: -748,
});
const priorCap = cellsIn({
  minX: 2073, maxX: 2073,
  minY: 129, maxY: 132,
  minZ: -749, maxZ: -747,
});
const priorCollar = difference(priorCap, seam);
const operated = uniqueCells([...shell, ...seam]);
const priorConnectedVoid = cellsIn({
  minX: 2051, maxX: 2072,
  minY: 130, maxY: 131,
  minZ: -748, maxZ: -748,
});
const connectedVoid = uniqueCells([...priorConnectedVoid, ...seam, ...segmentInterior]);
const voidKeys = new Set(connectedVoid.map(cellKey));
const boundary = uniqueCells(connectedVoid.flatMap((cell) => (
  FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({
    x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
  }))
)).filter((cell) => !voidKeys.has(cellKey(cell))));
const farCap = shell.filter(({ x }) => x === 2288);
const futureCurveSeam = farCap.filter(({ y, z }) => y >= 130 && y <= 131 && z === -748);
const b08 = cellsIn({
  minX: 2047, maxX: 2049,
  minY: 129, maxY: 132,
  minZ: -749, maxZ: -747,
});
const z11 = cellsIn({
  minX: 2047, maxX: 2049,
  minY: 303, maxY: 306,
  minZ: -829, maxZ: -829,
});
const connectivity = connectedComponents(connectedVoid);
invariant(accommodation.length === EXPECTED.accommodationCellCount
  && hashCells(accommodation) === EXPECTED.accommodationSha256
  && shell.length === EXPECTED.shellCellCount
  && hashCells(shell) === EXPECTED.shellSha256
  && seam.length === EXPECTED.seamCellCount
  && hashCells(seam) === EXPECTED.seamSha256
  && operated.length === EXPECTED.operatedCellCount
  && hashCells(operated) === EXPECTED.operatedSha256
  && connectedVoid.length === EXPECTED.connectedVoidCellCount
  && hashCells(connectedVoid) === EXPECTED.connectedVoidSha256
  && connectivity.componentCount === 1
  && connectivity.largestComponentCellCount === EXPECTED.connectedVoidCellCount
  && boundary.length === EXPECTED.boundaryCellCount
  && hashCells(boundary) === EXPECTED.boundarySha256
  && priorCollar.length === EXPECTED.priorCollarCellCount
  && hashCells(priorCollar) === EXPECTED.priorCollarSha256
  && farCap.length === EXPECTED.farCapCellCount
  && hashCells(farCap) === EXPECTED.farCapSha256
  && futureCurveSeam.length === 2,
'canonical segment, route, boundary, or cap geometry drifted');

const pkg = manifest.packages.find(({ key }) => key === 'b09-lower-guideway-segment-02');
invariant(pkg, 'Segment 02 package is missing');
const forwardOperations = parseOperations(pkg.forward);
const rollbackOperations = parseOperations(pkg.rollback);
const expandedForward = expandOperations(forwardOperations);
const expandedRollback = expandOperations(rollbackOperations);
invariant(forwardOperations.length === EXPECTED.operationCount
  && rollbackOperations.length === EXPECTED.operationCount
  && hashCells(expandedForward.map(({ cell }) => cell)) === EXPECTED.operatedSha256
  && hashCells(expandedRollback.map(({ cell }) => cell)) === EXPECTED.operatedSha256
  && forwardOperations.slice(0, EXPECTED.shellCellCount).every((operation) => (
    operation.fromState === AIR && operation.toState === DIORITE
  ))
  && forwardOperations.slice(EXPECTED.shellCellCount).every((operation) => (
    operation.fromState === DIORITE && operation.toState === AIR
  )), 'operation count, targets, order, or transitions drifted');
invariant(rollbackOperations.every((operation, index) => {
  const forward = forwardOperations.at(-(index + 1));
  return JSON.stringify(operation.from) === JSON.stringify(forward.from)
    && JSON.stringify(operation.to) === JSON.stringify(forward.to)
    && operation.fromState === forward.toState
    && operation.toState === forward.fromState;
}), 'rollback is not the exact reverse-order inverse');
invariant(sha256(operationBody(pkg.forward))
    === manifest.operations['b09-lower-guideway-segment-02'].forwardSha256
  && sha256(operationBody(pkg.rollback))
    === manifest.operations['b09-lower-guideway-segment-02'].rollbackSha256,
'manifest operation-body identity drifted');

const sourceReader = new AnvilReader(absolute(path.join(SOURCE_ROOT, 'region')));
const postReader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
const sourceAccommodation = await states(sourceReader, accommodation);
const postAccommodation = await states(postReader, accommodation);
const sourceByKey = new Map(sourceAccommodation.map((record) => [cellKey(record.cell), record.state]));
const postByKey = new Map(postAccommodation.map((record) => [cellKey(record.cell), record.state]));
const recordsFor = (cells, byKey) => cells.map((cell) => ({
  cell,
  state: byKey.get(cellKey(cell)),
}));
const changedAccommodation = accommodation.filter((cell) => (
  sourceByKey.get(cellKey(cell)) !== postByKey.get(cellKey(cell))
));
const nonOperatedChanges = difference(changedAccommodation, operated);
const shellMismatches = shell.filter((cell) => (
  sourceByKey.get(cellKey(cell)) !== AIR || postByKey.get(cellKey(cell)) !== DIORITE
));
const seamMismatches = seam.filter((cell) => (
  sourceByKey.get(cellKey(cell)) !== DIORITE || postByKey.get(cellKey(cell)) !== AIR
));
const voidMismatches = connectedVoid.filter((cell) => postByKey.get(cellKey(cell)) !== AIR);
const boundaryMismatches = boundary.filter((cell) => postByKey.get(cellKey(cell)) !== DIORITE);
const farCapMismatches = farCap.filter((cell) => (
  sourceByKey.get(cellKey(cell)) !== AIR || postByKey.get(cellKey(cell)) !== DIORITE
));
const unchangedCount = (cells) => cells.filter((cell) => (
  sourceByKey.get(cellKey(cell)) === postByKey.get(cellKey(cell))
)).length;
const priorPreservation = {};
for (const [release, priorManifestPath] of Object.entries(PRIOR_MANIFESTS)) {
  const targets = manifestTargets(priorManifestPath);
  const expectedOverlap = release === 'r07f' ? seam : [];
  const preserved = difference(targets, expectedOverlap);
  priorPreservation[release] = {
    ...classManifest(preserved),
    excludedOwnedSeamCellCount: expectedOverlap.length,
    unchangedCellCount: unchangedCount(preserved),
    changedCellCount: preserved.length - unchangedCount(preserved),
  };
}

const executionPath = path.join(
  EVIDENCE_DIR,
  'b09-lower-guideway-segment-02.forward-execution.json',
);
const rollbackPath = path.join(
  EVIDENCE_DIR,
  'b09-lower-guideway-segment-02.rollback-poststate-preflight.json',
);
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
  && execution.sourceOperationCount === EXPECTED.operationCount
  && execution.sourceGroupCount === EXPECTED.operationCount
  && execution.successfulGroups === EXPECTED.operationCount
  && execution.failedGroups === 0
  && execution.successfulCommands === EXPECTED.operationCount
  && execution.failedCommands === 0
  && execution.noopCommands === 0
  && execution.unexpectedNoopCommands === 0
  && execution.unknownReplyCommands === 0
  && execution.worldEditLeftoverCount === 0;
const rollbackPassed = rollbackPreflight.status === 'PASS'
  && samePath(rollbackPreflight.opsPath, pkg.rollback)
  && rollbackPreflight.opsSha256 === rollbackFileSha256
  && rollbackPreflight.operationCount === EXPECTED.operationCount
  && rollbackPreflight.passed === EXPECTED.operationCount
  && rollbackPreflight.failed === 0
  && rollbackPreflight.regionsSnapshot?.sha256 === EXPECTED.postRegionSha256
  && rollbackPreflight.sourceOverlays === null;

const checks = [];
const check = (id, passed, detail) => checks.push({ id, status: passed ? 'PASS' : 'FAIL', detail });
check('R07H-QA-01-TERMINAL-LEDGER', ledger.stages.every(({ status }) => status === 'PASS'),
  `${ledger.stages.length}/${ledger.stages.length} ledger stages PASS.`);
check('R07H-QA-02-RELEASE-IDENTITIES',
  ledger.sourceBoundReleaseIdentitySha256 === recomputedSourceBoundReleaseIdentity
    && ledger.completedReleaseIdentitySha256 === recomputedCompletedReleaseIdentity,
  `Completed release identity ${ledger.completedReleaseIdentitySha256}.`);
check('R07H-QA-03-EVIDENCE-BINDINGS', evidenceBindingFailures.length === 0,
  `${ledger.evidenceBindings.length}/${ledger.evidenceBindings.length} evidence bindings intact.`);
check('R07H-QA-04-GEOMETRY-AND-INVERSE',
  operated.length === EXPECTED.operatedCellCount
    && rollbackOperations.length === EXPECTED.operationCount,
  `${shell.length} shell plus ${seam.length} seam cells; exact reverse-order inverse.`);
check('R07H-QA-05-EXACT-SHELL-TRANSITIONS', shellMismatches.length === 0,
  `${shell.length - shellMismatches.length}/${shell.length} air-to-diorite transitions.`);
check('R07H-QA-06-EXACT-R07F-SEAM-TRANSITIONS', seamMismatches.length === 0,
  `${seam.length - seamMismatches.length}/${seam.length} diorite-to-air transitions.`);
check('R07H-QA-07-CONNECTED-VOID',
  voidMismatches.length === 0 && connectivity.componentCount === 1,
  `${connectedVoid.length - voidMismatches.length}/${connectedVoid.length} connected air cells.`);
check('R07H-QA-08-COMPLETE-BOUNDARY', boundaryMismatches.length === 0,
  `${boundary.length - boundaryMismatches.length}/${boundary.length} polished-diorite boundary cells.`);
check('R07H-QA-09-FAIL-CLOSED-FAR-CAP', farCapMismatches.length === 0,
  `${farCap.length - farCapMismatches.length}/${farCap.length} far-cap transitions.`);
check('R07H-QA-10-PRIOR-RELEASE-PRESERVATION',
  Object.values(priorPreservation).every(({ changedCellCount }) => changedCellCount === 0),
  'R07D, R07E, and R07F non-seam targets retain source state.');
check('R07H-QA-11-B08-Z11-PRESERVATION',
  unchangedCount(b08) === b08.length && unchangedCount(z11) === z11.length,
  `${unchangedCount(b08)}/${b08.length} B08 and ${unchangedCount(z11)}/${z11.length} Z11 unchanged.`);
check('R07H-QA-12-NO-UNDECLARED-B09-DRIFT',
  changedAccommodation.length === EXPECTED.operatedCellCount && nonOperatedChanges.length === 0,
  `${changedAccommodation.length} B09 changes, exactly the declared operated set.`);
check('R07H-QA-13-STRICT-EXECUTION', strictExecutionPassed,
  `${execution.successfulGroups}/${EXPECTED.operationCount} strict groups; ${execution.noopCommands} no-op.`);
check('R07H-QA-14-ROLLBACK-POSTSTATE', rollbackPassed,
  `${rollbackPreflight.passed}/${EXPECTED.operationCount} inverse guards PASS.`);

const failedChecks = checks.filter(({ status }) => status !== 'PASS');
const qaPayload = {
  schemaVersion: 1,
  id: 'combined-zones-r07h-b09-lower-guideway-segment-02-post-release-qa',
  generatedAtUtc: GENERATED_AT,
  status: failedChecks.length === 0
    ? 'PASS_R07H_B09_LOWER_GUIDEWAY_SEGMENT_02_POST_RELEASE_ACCEPTED'
    : 'FAIL_R07H_B09_LOWER_GUIDEWAY_SEGMENT_02_POST_RELEASE',
  release: {
    transactionId: manifest.transactionId,
    releaseNodeId: manifest.releaseNodeId,
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
      root: ledger.sourceSnapshot.root,
      completeSaveSha256: ledger.sourceSnapshot.completeSaveSha256,
      regionSnapshotSha256: sourceIdentity.sha256,
      intake: fileBinding(sourceIntakePath),
      regionIdentity: fileBinding(sourceIdentityPath),
    },
    postCompleteSave: {
      root: ledger.postSnapshot.root,
      completeSaveSha256: ledger.postSnapshot.completeSaveSha256,
      regionSnapshotSha256: postIdentity.sha256,
      intake: fileBinding(postIntakePath),
      regionIdentity: fileBinding(postIdentityPath),
    },
  },
  geometry: {
    minimumPlanningAccommodation: classManifest(accommodation),
    staticSegmentShell: classManifest(shell),
    ownedR07fFarCapSeamOpening: classManifest(seam),
    operatedUnion: classManifest(operated),
    connectedLowerStationAndSegmentsVoid: {
      ...classManifest(connectedVoid),
      ...connectivity,
    },
    connectedVoidFaceBoundary: classManifest(boundary),
    retainedPriorFarCapCollar: classManifest(priorCollar),
    farIsolationCap: classManifest(farCap),
    retainedFutureCurveSeam: classManifest(futureCurveSeam),
    b08PortalSeam: classManifest(b08),
    summitInterfaceCap: classManifest(z11),
  },
  postState: {
    shell: {
      sourceStateCensus: stateCensus(recordsFor(shell, sourceByKey)),
      postStateCensus: stateCensus(recordsFor(shell, postByKey)),
      matchingTransitionCount: shell.length - shellMismatches.length,
      mismatchCount: shellMismatches.length,
    },
    r07fSeam: {
      sourceStateCensus: stateCensus(recordsFor(seam, sourceByKey)),
      postStateCensus: stateCensus(recordsFor(seam, postByKey)),
      matchingTransitionCount: seam.length - seamMismatches.length,
      mismatchCount: seamMismatches.length,
    },
    connectedVoid: {
      postStateCensus: stateCensus(recordsFor(connectedVoid, postByKey)),
      airCellCount: connectedVoid.length - voidMismatches.length,
      mismatchCount: voidMismatches.length,
      connectivity,
    },
    completeBoundary: {
      postStateCensus: stateCensus(recordsFor(boundary, postByKey)),
      polishedDioriteCellCount: boundary.length - boundaryMismatches.length,
      mismatchCount: boundaryMismatches.length,
    },
    farIsolationCap: {
      sourceStateCensus: stateCensus(recordsFor(farCap, sourceByKey)),
      postStateCensus: stateCensus(recordsFor(farCap, postByKey)),
      matchingTransitionCount: farCap.length - farCapMismatches.length,
      mismatchCount: farCapMismatches.length,
      physicallyClosed: farCapMismatches.length === 0,
      futureCurveSeamClosed: futureCurveSeam.every(
        (cell) => postByKey.get(cellKey(cell)) === DIORITE,
      ),
    },
    priorReleasePreservation: priorPreservation,
    preservedExternalInterfaces: {
      b08PortalSeam: {
        unchangedCellCount: unchangedCount(b08),
        changedCellCount: b08.length - unchangedCount(b08),
      },
      summitInterfaceCap: {
        unchangedCellCount: unchangedCount(z11),
        changedCellCount: z11.length - unchangedCount(z11),
      },
    },
    fullB09Accommodation: {
      sourceStateCensus: stateCensus(sourceAccommodation),
      postStateCensus: stateCensus(postAccommodation),
      sourceStateSetSha256: stateSetSha256(sourceAccommodation),
      postStateSetSha256: stateSetSha256(postAccommodation),
      changedCellCount: changedAccommodation.length,
      nonOperatedChangedCellCount: nonOperatedChanges.length,
    },
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
      passed: strictExecutionPassed,
    },
    rollbackPoststatePreflight: {
      ...fileBinding(rollbackPath),
      opsSha256: rollbackPreflight.opsSha256,
      passedGuards: rollbackPreflight.passed,
      failedGuards: rollbackPreflight.failed,
      regionSnapshotSha256: rollbackPreflight.regionsSnapshot?.sha256,
      passed: rollbackPassed,
    },
    exactReverseOrderInverse: true,
    rollbackResealsSeamBeforeShellRemoval: true,
  },
  checks,
  summary: {
    passed: failedChecks.length === 0,
    checkCount: checks.length,
    passCount: checks.length - failedChecks.length,
    failCount: failedChecks.length,
    shellTransitionCount: shell.length - shellMismatches.length,
    seamTransitionCount: seam.length - seamMismatches.length,
    connectedVoidAirCellCount: connectedVoid.length - voidMismatches.length,
    boundaryPolishedDioriteCellCount: boundary.length - boundaryMismatches.length,
    farCapClosedCellCount: farCap.length - farCapMismatches.length,
    r07dPreservedCellCount: priorPreservation.r07d.unchangedCellCount,
    r07ePreservedCellCount: priorPreservation.r07e.unchangedCellCount,
    r07fNonSeamPreservedCellCount: priorPreservation.r07f.unchangedCellCount,
    b08UnchangedCellCount: unchangedCount(b08),
    z11UnchangedCellCount: unchangedCount(z11),
    fullB09ChangedCellCount: changedAccommodation.length,
    undeclaredB09ChangeCount: nonOperatedChanges.length,
    strictSuccessfulGroupCount: execution.successfulGroups,
    rollbackGuardPassCount: rollbackPreflight.passed,
  },
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    readOnlyAnvilInputs: true,
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(qaPayload));
const report = { ...qaPayload, qaPayloadSha256 };
fs.mkdirSync(path.dirname(absolute(OUT_PATH)), { recursive: true });
fs.mkdirSync(path.dirname(absolute(MARKDOWN_PATH)), { recursive: true });
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);

const markdown = `# CZ-R07H B09 lower guideway Segment 02 post-release QA

**Status:** ${report.status}  
**QA payload identity:** \`${qaPayloadSha256}\`  
**Completed release identity:** \`${ledger.completedReleaseIdentitySha256}\`  
**Execution ledger:** \`${ledgerBinding.sha256}\`  
**Post complete save:** \`${ledger.postSnapshot.completeSaveSha256}\`

## Result

| Test | Result |
|---|---:|
| Exact shell transitions | ${report.summary.shellTransitionCount} / ${EXPECTED.shellCellCount} |
| Exact R07F seam transitions | ${report.summary.seamTransitionCount} / ${EXPECTED.seamCellCount} |
| Connected void air | ${report.summary.connectedVoidAirCellCount} / ${EXPECTED.connectedVoidCellCount} |
| Complete polished-diorite boundary | ${report.summary.boundaryPolishedDioriteCellCount} / ${EXPECTED.boundaryCellCount} |
| Closed far cap | ${report.summary.farCapClosedCellCount} / ${EXPECTED.farCapCellCount} |
| R07D preserved targets | ${report.summary.r07dPreservedCellCount} |
| R07E preserved targets | ${report.summary.r07ePreservedCellCount} |
| R07F non-seam preserved targets | ${report.summary.r07fNonSeamPreservedCellCount} |
| B08 interface unchanged | ${report.summary.b08UnchangedCellCount} / ${b08.length} |
| Z11 interface unchanged | ${report.summary.z11UnchangedCellCount} / ${z11.length} |
| Strict execution | ${report.summary.strictSuccessfulGroupCount} / ${EXPECTED.operationCount} groups |
| Rollback post-state guards | ${report.summary.rollbackGuardPassCount} / ${EXPECTED.operationCount} |
| Undeclared B09 drift | ${report.summary.undeclaredB09ChangeCount} cells |

## Checks

| Check | Status | Detail |
|---|---|---|
${checks.map(({ id, status, detail }) => `| ${id} | **${status}** | ${detail} |`).join('\n')}

All 2,152 new shell cells made the exact air-to-polished-diorite transition
and the two owned R07F seam cells made the exact polished-diorite-to-air
transition. The 474-cell lower-station/Segment 01/Segment 02 void is one
connected air component behind a complete 1,426-cell polished-diorite boundary
and 12-cell far cap. No B09 cell outside the 2,154-cell operated set changed.

This verifier read only immutable source/post Anvil saves and hash-bound
release evidence. It made no live call and performed no world edit.
`;
fs.writeFileSync(absolute(MARKDOWN_PATH), markdown);

console.log(JSON.stringify({
  status: report.status,
  qaPayloadSha256,
  completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
  shell: `${report.summary.shellTransitionCount}/${EXPECTED.shellCellCount}`,
  seam: `${report.summary.seamTransitionCount}/${EXPECTED.seamCellCount}`,
  connectedVoid: `${report.summary.connectedVoidAirCellCount}/${EXPECTED.connectedVoidCellCount}`,
  boundary: `${report.summary.boundaryPolishedDioriteCellCount}/${EXPECTED.boundaryCellCount}`,
  farCap: `${report.summary.farCapClosedCellCount}/${EXPECTED.farCapCellCount}`,
  strictExecution: `${report.summary.strictSuccessfulGroupCount}/${EXPECTED.operationCount}`,
  rollback: `${report.summary.rollbackGuardPassCount}/${EXPECTED.operationCount}`,
  undeclaredB09Changes: report.summary.undeclaredB09ChangeCount,
  output: relative(OUT_PATH),
  markdown: relative(MARKDOWN_PATH),
}, null, 2));
if (failedChecks.length) process.exitCode = 1;
