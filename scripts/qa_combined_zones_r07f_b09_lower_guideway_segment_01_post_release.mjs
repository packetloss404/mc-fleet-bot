#!/usr/bin/env node
/** Read-only post-release QA for CZ-R07F B09 lower guideway segment 01. */

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

const GENERATED_AT = value('--generated-at', '2026-08-21T17:30:00Z');
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r07f-live-20260821T172700Z',
);
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r07f-b09-lower-guideway-segment-01.release-manifest.json',
);
const SOURCE_ROOT = value(
  '--source-root',
  'data/worldsnap-combined-zones-r07f-source-20260821T172700Z',
);
const POST_ROOT = value(
  '--post-root',
  'data/worldsnap-combined-zones-r07f-post-20260821T172700Z',
);
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r07f-post-release-qa.json'));
const MARKDOWN_PATH = value(
  '--markdown',
  path.join(EVIDENCE_DIR, 'r07f-post-release-qa.md'),
);
const CONNECTORS_PATH =
  'docs/masterplans/05-combined-zones/phase1-connector-geometry.json';
const D05_PATH =
  'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json';
const AIR_STATE = 'minecraft:air';
const SHELL_STATE = 'minecraft:polished_diorite';

const EXPECTED = Object.freeze({
  manifestIdentity: '0260263944b561a612f786f1fb0fd0345d1afd18da4f5ff13e207cd777687354',
  manifestFileSha256: 'f8ade888c396f8407a40d4450f1dd9a01240a8640f7791185c7d23e253694823',
  ledgerSha256: 'f7c7aa14e7f8a6b6d29c802aa1b6c7525313a1ae60f8d2a65a5d3f3e55afa0d0',
  sourceBoundReleaseIdentitySha256:
    'a1fa1cdcbc598d0d666116f81bab554c6300c13f0cdbdf254c9b4faa0e944b27',
  completedReleaseIdentitySha256:
    '15facdcd036fdfba27ef0e76a0167b00e1acf118804415da159167e46b4a806e',
  sourceCompleteSaveSha256:
    'cc16e117d71b08fb887ab8960c48ea909b90c19ad6a9e281875db14c737f0d7f',
  sourceRegionSha256:
    '34fe4e5f0d9f55fae19bfa97538cf35c4c599ad4f804cc866b794fc8132ce5c4',
  postCompleteSaveSha256:
    'b7f0ec5a7712dd1b7252f0adb755ae8d8374bf2f63740f089ec79f15f03c7410',
  postRegionSha256:
    '59806371004dc7b8244568ead943393206322af449d4b1808da95b5518926096',
  centerlinePointCount: 561,
  centerlineSha256:
    'e8905742a77148d13d799362da7d65e9b02bcf96455d580fbee27367b2d24221',
  accommodationCellCount: 7800,
  accommodationSha256: 'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  shellCellCount: 162,
  shellSha256: '7cb64c9af7d0f37695b9a4c30f888bfe373eb315bec4d9530ab915674a567ea6',
  seamCellCount: 2,
  seamSha256: '5b6a8c096adadbbd5a5ed0399678c87aed1fa5db20b89adeb8289745f693a75e',
  operatedCellCount: 164,
  operatedSha256: '2d0ac7f21afb5835112b47f3fba677939a4d4d2617f497cfe284cc0d11beed96',
  connectedVoidCellCount: 44,
  connectedVoidSha256: '5eedb05ad65d442f00c56caa04d37f5e29838bd4006df577605a1b6dcc4563e5',
  boundaryCellCount: 136,
  boundarySha256: '0eb5742bd6dbb6a11959dbe79b5b714a40a575bc69d53a756d54afbebe849697',
  nearCollarCellCount: 10,
  nearCollarSha256: '7065c9fc48e7c9c69a69428e9c25a3cc2a46ef4b599f4939c017a79a63b7dae9',
  farCapCellCount: 12,
  farCapSha256: 'ffbb546fae81114f50226ac6042fe75d9f057b3543cd3887f10ebbdfcefef333',
  b08CellCount: 36,
  b08Sha256: 'b28a975b44296fc43739a8af0743066ca58a2c33a99e13da6c2edf89142b33e3',
  summitCapCellCount: 12,
  summitCapSha256: 'd1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093',
  r07eShellCellCount: 162,
  r07eShellSha256: '8f1cd67b0d08e1f986c21067af7ba50e1c4f3e8daa52c703309c5734d0979592',
  operationCount: 164,
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
  if (!condition) throw new Error(`R07F post-release QA rejected: ${message}`);
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
    ({ path: reportPath, sha256: reportSha256 }) => ({
      path: reportPath,
      sha256: reportSha256,
    }),
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
const lowerStation = cellsIn({
  minX: 2047, maxX: 2057,
  minY: 129, maxY: 132,
  minZ: -749, maxZ: -747,
});
const segmentPoints = centerline.slice(9, 25);
const segmentSeeds = uniqueCells(segmentPoints.flatMap(({ x, y, z }) => [
  { x, y, z }, { x, y: y + 1, z },
]));
const newEnvelope = difference(dilateCells(segmentSeeds, 1), lowerStation);
const segmentInterior = difference(segmentSeeds, lowerStation);
const shell = difference(newEnvelope, segmentInterior);
const lowerInterior = cellsIn({
  minX: 2051, maxX: 2056,
  minY: 130, maxY: 131,
  minZ: -748, maxZ: -748,
});
const seam = cellsIn({
  minX: 2057, maxX: 2057,
  minY: 130, maxY: 131,
  minZ: -748, maxZ: -748,
});
const operated = uniqueCells([...shell, ...seam]);
const connectedVoid = uniqueCells([...lowerInterior, ...seam, ...segmentInterior]);
const connectedVoidKeys = new Set(connectedVoid.map(cellKey));
const boundary = uniqueCells(connectedVoid.flatMap((cell) => (
  FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({
    x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
  }))
)).filter((cell) => !connectedVoidKeys.has(cellKey(cell))));
const eastCap = cellsIn({
  minX: 2057, maxX: 2057,
  minY: 129, maxY: 132,
  minZ: -749, maxZ: -747,
});
const nearCollar = difference(eastCap, seam);
const farCap = shell.filter(({ x }) => x === 2073);
const b08 = cellsIn({
  minX: 2047, maxX: 2049,
  minY: 129, maxY: 132,
  minZ: -749, maxZ: -747,
});
const summitCap = cellsIn({
  minX: 2047, maxX: 2049,
  minY: 303, maxY: 306,
  minZ: -829, maxZ: -829,
});
const summitInterior = uniqueCells(centerline.slice(-9).flatMap(({ x, y, z }) => [
  { x, y, z }, { x, y: y + 1, z },
]));
const r07eShell = difference(dilateCells(summitInterior, 1), summitInterior);
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
  && nearCollar.length === EXPECTED.nearCollarCellCount
  && hashCells(nearCollar) === EXPECTED.nearCollarSha256
  && farCap.length === EXPECTED.farCapCellCount
  && hashCells(farCap) === EXPECTED.farCapSha256
  && b08.length === EXPECTED.b08CellCount
  && hashCells(b08) === EXPECTED.b08Sha256
  && summitCap.length === EXPECTED.summitCapCellCount
  && hashCells(summitCap) === EXPECTED.summitCapSha256
  && r07eShell.length === EXPECTED.r07eShellCellCount
  && hashCells(r07eShell) === EXPECTED.r07eShellSha256,
'canonical segment, boundary, or preserved-interface geometry drifted');

const pkg = manifest.packages.find(({ key }) => key === 'b09-lower-guideway-segment-01');
invariant(pkg, 'guideway segment package is missing');
const forwardOperations = parseOperations(pkg.forward);
const rollbackOperations = parseOperations(pkg.rollback);
const expandedForward = expandOperations(forwardOperations);
const expandedRollback = expandOperations(rollbackOperations);
invariant(forwardOperations.length === EXPECTED.operationCount
  && rollbackOperations.length === EXPECTED.operationCount
  && expandedForward.length === EXPECTED.operatedCellCount
  && expandedRollback.length === EXPECTED.operatedCellCount
  && hashCells(expandedForward.map(({ cell }) => cell)) === EXPECTED.operatedSha256
  && hashCells(expandedRollback.map(({ cell }) => cell)) === EXPECTED.operatedSha256
  && forwardOperations.slice(0, EXPECTED.shellCellCount).every((operation) => (
    operation.fromState === AIR_STATE && operation.toState === SHELL_STATE
  ))
  && forwardOperations.slice(EXPECTED.shellCellCount).every((operation) => (
    operation.fromState === SHELL_STATE && operation.toState === AIR_STATE
  )), 'operation order, target geometry, or transitions drifted');
invariant(rollbackOperations.every((operation, index) => {
  const forward = forwardOperations.at(-(index + 1));
  return JSON.stringify(operation.from) === JSON.stringify(forward.from)
    && JSON.stringify(operation.to) === JSON.stringify(forward.to)
    && operation.fromState === forward.toState
    && operation.toState === forward.fromState;
}), 'rollback is not the exact reverse-order inverse');
invariant(sha256(operationBody(pkg.forward))
    === manifest.operations['b09-lower-guideway-segment-01'].forwardSha256
  && sha256(operationBody(pkg.rollback))
    === manifest.operations['b09-lower-guideway-segment-01'].rollbackSha256,
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
const shellSource = recordsFor(shell, sourceByKey);
const shellPost = recordsFor(shell, postByKey);
const seamSource = recordsFor(seam, sourceByKey);
const seamPost = recordsFor(seam, postByKey);
const voidSource = recordsFor(connectedVoid, sourceByKey);
const voidPost = recordsFor(connectedVoid, postByKey);
const boundaryPost = recordsFor(boundary, postByKey);
const farCapSource = recordsFor(farCap, sourceByKey);
const farCapPost = recordsFor(farCap, postByKey);
const nearSource = recordsFor(nearCollar, sourceByKey);
const nearPost = recordsFor(nearCollar, postByKey);
const b08Source = recordsFor(b08, sourceByKey);
const b08Post = recordsFor(b08, postByKey);
const summitCapSource = recordsFor(summitCap, sourceByKey);
const summitCapPost = recordsFor(summitCap, postByKey);
const r07eSource = recordsFor(r07eShell, sourceByKey);
const r07ePost = recordsFor(r07eShell, postByKey);
const shellMismatches = shell.filter((cell) => (
  sourceByKey.get(cellKey(cell)) !== AIR_STATE
  || postByKey.get(cellKey(cell)) !== SHELL_STATE
));
const seamMismatches = seam.filter((cell) => (
  sourceByKey.get(cellKey(cell)) !== SHELL_STATE
  || postByKey.get(cellKey(cell)) !== AIR_STATE
));
const voidPostMismatches = voidPost.filter(({ state }) => state !== AIR_STATE);
const boundaryPostMismatches = boundaryPost.filter(({ state }) => state !== SHELL_STATE);
const farCapMismatches = farCap.filter((cell) => (
  sourceByKey.get(cellKey(cell)) !== AIR_STATE
  || postByKey.get(cellKey(cell)) !== SHELL_STATE
));
const nearChanges = nearCollar.filter((cell) => (
  sourceByKey.get(cellKey(cell)) !== SHELL_STATE
  || postByKey.get(cellKey(cell)) !== SHELL_STATE
));
const unchangedCount = (cells) => cells.filter((cell) => (
  sourceByKey.get(cellKey(cell)) === postByKey.get(cellKey(cell))
)).length;
const nonOperatedChanges = difference(changedAccommodation, operated);

const executionPath = path.join(
  EVIDENCE_DIR,
  'b09-lower-guideway-segment-01.forward-execution.json',
);
const rollbackPath = path.join(
  EVIDENCE_DIR,
  'b09-lower-guideway-segment-01.rollback-poststate-preflight.json',
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
check('R07F-QA-01-TERMINAL-LEDGER', ledger.stages.every(({ status }) => status === 'PASS'),
  `${ledger.stages.length}/${ledger.stages.length} ledger stages PASS.`);
check('R07F-QA-02-RELEASE-IDENTITIES',
  ledger.sourceBoundReleaseIdentitySha256 === recomputedSourceBoundReleaseIdentity
    && ledger.completedReleaseIdentitySha256 === recomputedCompletedReleaseIdentity,
  `Completed release identity ${ledger.completedReleaseIdentitySha256}.`);
check('R07F-QA-03-EVIDENCE-BINDINGS', evidenceBindingFailures.length === 0,
  `${ledger.evidenceBindings.length}/${ledger.evidenceBindings.length} evidence bindings intact.`);
check('R07F-QA-04-GEOMETRY-AND-INVERSE',
  operated.length === EXPECTED.operatedCellCount
    && rollbackOperations.length === EXPECTED.operationCount,
  `${shell.length} shell plus ${seam.length} seam cells; exact reverse-order inverse.`);
check('R07F-QA-05-EXACT-SHELL-TRANSITIONS', shellMismatches.length === 0,
  `${shell.length - shellMismatches.length}/${shell.length} air-to-diorite transitions.`);
check('R07F-QA-06-EXACT-SEAM-TRANSITIONS', seamMismatches.length === 0,
  `${seam.length - seamMismatches.length}/${seam.length} diorite-to-air transitions.`);
check('R07F-QA-07-CONNECTED-VOID',
  voidPostMismatches.length === 0 && connectivity.componentCount === 1,
  `${connectedVoid.length - voidPostMismatches.length}/${connectedVoid.length} connected air cells.`);
check('R07F-QA-08-COMPLETE-BOUNDARY', boundaryPostMismatches.length === 0,
  `${boundary.length - boundaryPostMismatches.length}/${boundary.length} polished-diorite boundary cells.`);
check('R07F-QA-09-FAR-CAP-AND-NEAR-COLLAR',
  farCapMismatches.length === 0 && nearChanges.length === 0,
  `${farCap.length}/${farCap.length} far cap; ${nearCollar.length}/${nearCollar.length} retained collar.`);
check('R07F-QA-10-B08-UNCHANGED', unchangedCount(b08) === b08.length,
  `${unchangedCount(b08)}/${b08.length} B08 interface states unchanged.`);
check('R07F-QA-11-Z11-UNCHANGED', unchangedCount(summitCap) === summitCap.length,
  `${unchangedCount(summitCap)}/${summitCap.length} Z11 cap states unchanged.`);
check('R07F-QA-12-R07E-UNCHANGED', unchangedCount(r07eShell) === r07eShell.length,
  `${unchangedCount(r07eShell)}/${r07eShell.length} R07E summit-shell states unchanged.`);
check('R07F-QA-13-NO-UNDECLARED-B09-DRIFT',
  changedAccommodation.length === EXPECTED.operatedCellCount
    && nonOperatedChanges.length === 0,
  `${changedAccommodation.length} B09 changes, exactly the declared operated set.`);
check('R07F-QA-14-STRICT-EXECUTION', strictExecutionPassed,
  `${execution.successfulGroups}/${EXPECTED.operationCount} strict groups; ${execution.noopCommands} no-op.`);
check('R07F-QA-15-ROLLBACK-POSTSTATE', rollbackPassed,
  `${rollbackPreflight.passed}/${EXPECTED.operationCount} inverse guards PASS.`);

const failedChecks = checks.filter(({ status }) => status !== 'PASS');
const qaPayload = {
  schemaVersion: 1,
  id: 'combined-zones-r07f-b09-lower-guideway-segment-01-post-release-qa',
  generatedAtUtc: GENERATED_AT,
  status: failedChecks.length === 0
    ? 'PASS_R07F_B09_LOWER_GUIDEWAY_SEGMENT_01_POST_RELEASE_ACCEPTED'
    : 'FAIL_R07F_B09_LOWER_GUIDEWAY_SEGMENT_01_POST_RELEASE',
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
    ownedInternalSeamOpening: classManifest(seam),
    operatedUnion: classManifest(operated),
    connectedLowerStationAndSegmentVoid: {
      ...classManifest(connectedVoid),
      ...connectivity,
    },
    connectedVoidFaceBoundary: classManifest(boundary),
    retainedNearCapCollar: classManifest(nearCollar),
    farIsolationCap: classManifest(farCap),
    b08PortalSeam: classManifest(b08),
    summitInterfaceCap: classManifest(summitCap),
    acceptedR07ESummitShell: classManifest(r07eShell),
  },
  postState: {
    shell: {
      sourceStateCensus: stateCensus(shellSource),
      postStateCensus: stateCensus(shellPost),
      matchingTransitionCount: shell.length - shellMismatches.length,
      mismatchCount: shellMismatches.length,
    },
    internalSeam: {
      sourceStateCensus: stateCensus(seamSource),
      postStateCensus: stateCensus(seamPost),
      matchingTransitionCount: seam.length - seamMismatches.length,
      mismatchCount: seamMismatches.length,
    },
    connectedVoid: {
      sourceStateCensus: stateCensus(voidSource),
      postStateCensus: stateCensus(voidPost),
      airCellCount: connectedVoid.length - voidPostMismatches.length,
      mismatchCount: voidPostMismatches.length,
      connectivity,
    },
    completeBoundary: {
      postStateCensus: stateCensus(boundaryPost),
      polishedDioriteCellCount: boundary.length - boundaryPostMismatches.length,
      mismatchCount: boundaryPostMismatches.length,
    },
    farIsolationCap: {
      sourceStateCensus: stateCensus(farCapSource),
      postStateCensus: stateCensus(farCapPost),
      matchingTransitionCount: farCap.length - farCapMismatches.length,
      mismatchCount: farCapMismatches.length,
      physicallyClosed: farCapMismatches.length === 0,
    },
    retainedNearCapCollar: {
      sourceStateCensus: stateCensus(nearSource),
      postStateCensus: stateCensus(nearPost),
      unchangedCellCount: nearCollar.length - nearChanges.length,
      changedCellCount: nearChanges.length,
    },
    preservedInterfaces: {
      b08PortalSeam: {
        sourceStateCensus: stateCensus(b08Source),
        postStateCensus: stateCensus(b08Post),
        unchangedCellCount: unchangedCount(b08),
        changedCellCount: b08.length - unchangedCount(b08),
      },
      summitInterfaceCap: {
        sourceStateCensus: stateCensus(summitCapSource),
        postStateCensus: stateCensus(summitCapPost),
        unchangedCellCount: unchangedCount(summitCap),
        changedCellCount: summitCap.length - unchangedCount(summitCap),
      },
      acceptedR07ESummitShell: {
        sourceStateCensus: stateCensus(r07eSource),
        postStateCensus: stateCensus(r07ePost),
        unchangedCellCount: unchangedCount(r07eShell),
        changedCellCount: r07eShell.length - unchangedCount(r07eShell),
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
    connectedVoidAirCellCount: connectedVoid.length - voidPostMismatches.length,
    boundaryPolishedDioriteCellCount: boundary.length - boundaryPostMismatches.length,
    farCapClosedCellCount: farCap.length - farCapMismatches.length,
    nearCollarUnchangedCellCount: nearCollar.length - nearChanges.length,
    b08UnchangedCellCount: unchangedCount(b08),
    z11UnchangedCellCount: unchangedCount(summitCap),
    r07eShellUnchangedCellCount: unchangedCount(r07eShell),
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

const markdown = `# CZ-R07F B09 lower guideway segment 01 post-release QA

**Status:** ${report.status}  
**QA payload identity:** \`${qaPayloadSha256}\`  
**Completed release identity:** \`${ledger.completedReleaseIdentitySha256}\`  
**Execution ledger:** \`${ledgerBinding.sha256}\`  
**Post complete save:** \`${ledger.postSnapshot.completeSaveSha256}\`

## Result

| Test | Result |
|---|---:|
| Exact shell transitions | ${report.summary.shellTransitionCount} / ${EXPECTED.shellCellCount} |
| Exact internal seam transitions | ${report.summary.seamTransitionCount} / ${EXPECTED.seamCellCount} |
| Connected void air | ${report.summary.connectedVoidAirCellCount} / ${EXPECTED.connectedVoidCellCount} |
| Complete polished-diorite boundary | ${report.summary.boundaryPolishedDioriteCellCount} / ${EXPECTED.boundaryCellCount} |
| Closed far cap | ${report.summary.farCapClosedCellCount} / ${EXPECTED.farCapCellCount} |
| Retained near collar | ${report.summary.nearCollarUnchangedCellCount} / ${EXPECTED.nearCollarCellCount} |
| B08 interface unchanged | ${report.summary.b08UnchangedCellCount} / ${EXPECTED.b08CellCount} |
| Z11 interface unchanged | ${report.summary.z11UnchangedCellCount} / ${EXPECTED.summitCapCellCount} |
| R07E summit shell unchanged | ${report.summary.r07eShellUnchangedCellCount} / ${EXPECTED.r07eShellCellCount} |
| Strict execution | ${report.summary.strictSuccessfulGroupCount} / ${EXPECTED.operationCount} groups |
| Rollback post-state guards | ${report.summary.rollbackGuardPassCount} / ${EXPECTED.operationCount} |
| Undeclared B09 drift | ${report.summary.undeclaredB09ChangeCount} cells |

## Checks

| Check | Status | Detail |
|---|---|---|
${checks.map(({ id, status, detail }) => `| ${id} | **${status}** | ${detail} |`).join('\n')}

All 162 new shell cells made the exact air-to-polished-diorite transition and
the two owned internal-seam cells made the exact polished-diorite-to-air
transition. The 44-cell lower-station/segment void is connected air behind a
complete 136-cell polished-diorite boundary and 12-cell far cap. The B08 and
Z11 interfaces and all 162 R07E summit-shell cells retain their source states.
No B09 cell outside the 164-cell operated set changed.

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
