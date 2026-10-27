#!/usr/bin/env node
/** Independent read-only post-release QA for CZ-R07I B09 maximal route shell. */

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
const GENERATED_AT = value('--generated-at', '2026-08-21T19:08:00Z');
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r07i-live-20260821T190347Z',
);
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r07i-b09-maximal-curve-summit-return.release-manifest.json',
);
const SOURCE_ROOT = value(
  '--source-root',
  'data/worldsnap-combined-zones-r07i-source-20260821T190347Z',
);
const POST_ROOT = value(
  '--post-root',
  'data/worldsnap-combined-zones-r07i-post-20260821T190347Z',
);
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r07i-post-release-qa.json'));
const MARKDOWN_PATH = value(
  '--markdown',
  path.join(EVIDENCE_DIR, 'r07i-post-release-qa.md'),
);
const CONNECTORS_PATH =
  'docs/masterplans/05-combined-zones/phase1-connector-geometry.json';
const D05_PATH =
  'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json';
const TECHNICAL_PATH =
  'docs/masterplans/05-combined-zones/phase1-b09-funicular-technical-system.json';
const PRIOR_MANIFESTS = Object.freeze({
  r07d: 'data/buildops/combined-zones-r07d-b09-lower-station-shell.release-manifest.json',
  r07e: 'data/buildops/combined-zones-r07e-b09-summit-headhouse-shell.release-manifest.json',
  r07f: 'data/buildops/combined-zones-r07f-b09-lower-guideway-segment-01.release-manifest.json',
  r07h: 'data/buildops/combined-zones-r07h-b09-lower-guideway-segment-02.release-manifest.json',
});
const AIR = 'minecraft:air';
const DIORITE = 'minecraft:polished_diorite';
const EXPECTED = Object.freeze({
  manifestIdentity: 'a4cb61ca44395ab97af49fb5075cb428e357a2b5f2724fd74960030b30c3a3f8',
  manifestFileSha256: 'd89fb62731a8d4d3a238d029a43d0be246e1170b3ff222b5e61cc380d5745098',
  ledgerSha256: '0d5b4d7bf233f9d383d4ea6cd507ee6932bf86dba78eb84fac836478582d4cb6',
  sourceBoundReleaseIdentitySha256:
    '01b0fdbf18f77693e706491ecd25b4ddf99422059fc158584a5ed5816fd962ee',
  completedReleaseIdentitySha256:
    'fc488920b7eed11c0d3a86a4296ca51ed0308abffd6deee1eddfeeee5f8cc252',
  sourceCompleteSaveSha256:
    '816df60a41641b1fd59e2aa8cf3a85c647fe8e99bcd7335949ebfa627aa684fc',
  sourceRegionSha256:
    'b09e044f581fbb53c0949d6786ac1654803049442d1ea89003770651eccbabaa',
  postCompleteSaveSha256:
    '569e8ab80a5ea4ea2ef35ef994de75b4fbc6d18f721c47453c9dc70ebedff0a0',
  postRegionSha256:
    '3bc894ee8455600f1559351ed67dd76c9779efbe8561d262d306b40d39043572',
  centerlinePointCount: 561,
  centerlineSha256:
    'e8905742a77148d13d799362da7d65e9b02bcf96455d580fbee27367b2d24221',
  accommodationCellCount: 7800,
  accommodationSha256: 'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  shellCellCount: 4092,
  shellSha256: '2c3a65ea063b9022450b183637ec9921c746a7f1d605900dfdc17c6787cff7aa',
  apertureCellCount: 4,
  apertureSha256: '9991feda6e953dd4e66585d7e23a61723c3319cb59c22782196fab028f2c08bb',
  operatedCellCount: 4096,
  operatedSha256: 'f33fd0ef5f5139261e5408429b2111271b1e776c18dd67c3932db2e6becc269b',
  connectedVoidCellCount: 1096,
  connectedVoidSha256: '2f808ddc7b077a2b256c56b96ba90631c0a94d26ac2b18b8e2da5e5660016855',
  boundaryCellCount: 3286,
  boundarySha256: '491ab71d982ad1ecce1eb1aea39b7e2bc487d04316c0764e51d6648ea041ab3f',
  summitCapCellCount: 12,
  summitCapSha256: '8ef484d874dca406f5a8abbc6dd8306ff2770ab304c10bddbc01db5c4107ad5c',
  operationCount: 4096,
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
  if (!condition) throw new Error(`R07I post-release QA rejected: ${message}`);
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
  return { componentCount: sizes.length, largestComponentCellCount: sizes[0] ?? 0, componentSizes: sizes };
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
'ledger/manifest binding drifted');
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
const technical = readJson(TECHNICAL_PATH);
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
const segment = centerline.slice(240, 551);
const routeSeeds = uniqueCells(segment.flatMap(({ x, y, z }) => [
  { x, y, z }, { x, y: y + 1, z },
]));
const r07hEnvelope = cellsIn({
  minX: 2074, maxX: 2288,
  minY: 129, maxY: 132,
  minZ: -749, maxZ: -747,
});
const summitEnvelope = cellsIn(
  technical.exactTechnicalReservationProposals.proposalLayers.summitStationEnvelope.bounds,
);
const newEnvelope = difference(dilateCells(routeSeeds, 1), [...r07hEnvelope, ...summitEnvelope]);
const newInterior = difference(routeSeeds, [...r07hEnvelope, ...summitEnvelope]);
const shell = difference(newEnvelope, routeSeeds);
const nominalSeam = cellsIn({
  minX: 2288, maxX: 2288,
  minY: 130, maxY: 131,
  minZ: -748, maxZ: -748,
});
const aperture = cellsIn({
  minX: 2288, maxX: 2288,
  minY: 130, maxY: 131,
  minZ: -749, maxZ: -748,
});
const operated = uniqueCells([...shell, ...aperture]);
const priorVoid = cellsIn({
  minX: 2051, maxX: 2287,
  minY: 130, maxY: 131,
  minZ: -748, maxZ: -748,
});
const connectedVoid = uniqueCells([...priorVoid, ...routeSeeds]);
const negativeVoid = uniqueCells([...priorVoid, ...nominalSeam, ...newInterior]);
const voidKeys = new Set(connectedVoid.map(cellKey));
const boundary = uniqueCells(connectedVoid.flatMap((cell) => (
  FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({
    x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
  }))
)).filter((cell) => !voidKeys.has(cellKey(cell))));
const summitCap = cellsIn({
  minX: 2047, maxX: 2049,
  minY: 295, maxY: 298,
  minZ: -819, maxZ: -819,
});
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
const negativeConnectivity = connectedComponents(negativeVoid);
invariant(accommodation.length === EXPECTED.accommodationCellCount
  && hashCells(accommodation) === EXPECTED.accommodationSha256
  && shell.length === EXPECTED.shellCellCount
  && hashCells(shell) === EXPECTED.shellSha256
  && aperture.length === EXPECTED.apertureCellCount
  && hashCells(aperture) === EXPECTED.apertureSha256
  && operated.length === EXPECTED.operatedCellCount
  && hashCells(operated) === EXPECTED.operatedSha256
  && connectedVoid.length === EXPECTED.connectedVoidCellCount
  && hashCells(connectedVoid) === EXPECTED.connectedVoidSha256
  && connectivity.componentCount === 1
  && negativeConnectivity.componentCount === 2
  && negativeConnectivity.componentSizes.join(',') === '618,476'
  && boundary.length === EXPECTED.boundaryCellCount
  && hashCells(boundary) === EXPECTED.boundarySha256
  && summitCap.length === EXPECTED.summitCapCellCount
  && hashCells(summitCap) === EXPECTED.summitCapSha256,
'canonical route, negative control, boundary, or cap geometry drifted');

const pkg = manifest.packages.find(({ key }) => key === 'b09-maximal-curve-summit-return');
invariant(pkg, 'maximal route package is missing');
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
  )), 'operation targets, order, or transitions drifted');
invariant(rollbackOperations.every((operation, index) => {
  const forward = forwardOperations.at(-(index + 1));
  return JSON.stringify(operation.from) === JSON.stringify(forward.from)
    && JSON.stringify(operation.to) === JSON.stringify(forward.to)
    && operation.fromState === forward.toState
    && operation.toState === forward.fromState;
}), 'rollback is not the exact reverse-order inverse');
invariant(sha256(operationBody(pkg.forward))
    === manifest.operations['b09-maximal-curve-summit-return'].forwardSha256
  && sha256(operationBody(pkg.rollback))
    === manifest.operations['b09-maximal-curve-summit-return'].rollbackSha256,
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
const apertureMismatches = aperture.filter((cell) => (
  sourceByKey.get(cellKey(cell)) !== DIORITE || postByKey.get(cellKey(cell)) !== AIR
));
const voidMismatches = connectedVoid.filter((cell) => postByKey.get(cellKey(cell)) !== AIR);
const boundaryMismatches = boundary.filter((cell) => postByKey.get(cellKey(cell)) !== DIORITE);
const unchangedCount = (cells) => cells.filter((cell) => (
  sourceByKey.get(cellKey(cell)) === postByKey.get(cellKey(cell))
)).length;
const priorPreservation = {};
for (const [release, priorManifestPath] of Object.entries(PRIOR_MANIFESTS)) {
  const targets = manifestTargets(priorManifestPath);
  const excluded = release === 'r07h' ? aperture : [];
  const preserved = difference(targets, excluded);
  priorPreservation[release] = {
    ...classManifest(preserved),
    excludedOwnedApertureCellCount: excluded.length,
    unchangedCellCount: unchangedCount(preserved),
    changedCellCount: preserved.length - unchangedCount(preserved),
  };
}

const executionPath = path.join(EVIDENCE_DIR, 'b09-maximal-curve-summit-return.forward-execution.json');
const rollbackPath = path.join(EVIDENCE_DIR, 'b09-maximal-curve-summit-return.rollback-poststate-preflight.json');
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
check('R07I-QA-01-TERMINAL-LEDGER', ledger.stages.every(({ status }) => status === 'PASS'),
  `${ledger.stages.length}/${ledger.stages.length} ledger stages PASS.`);
check('R07I-QA-02-RELEASE-IDENTITIES',
  ledger.sourceBoundReleaseIdentitySha256 === recomputedSourceBoundReleaseIdentity
    && ledger.completedReleaseIdentitySha256 === recomputedCompletedReleaseIdentity,
  `Completed identity ${ledger.completedReleaseIdentitySha256}.`);
check('R07I-QA-03-EVIDENCE-BINDINGS', evidenceBindingFailures.length === 0,
  `${ledger.evidenceBindings.length}/${ledger.evidenceBindings.length} bindings intact.`);
check('R07I-QA-04-GEOMETRY-AND-INVERSE',
  operated.length === EXPECTED.operatedCellCount && rollbackOperations.length === EXPECTED.operationCount,
  `${shell.length} shell plus ${aperture.length} aperture; exact reverse inverse.`);
check('R07I-QA-05-EXACT-SHELL', shellMismatches.length === 0,
  `${shell.length - shellMismatches.length}/${shell.length} transitions.`);
check('R07I-QA-06-EXACT-FOUR-CELL-APERTURE', apertureMismatches.length === 0,
  `${aperture.length - apertureMismatches.length}/${aperture.length} transitions.`);
check('R07I-QA-07-CONNECTED-ROUTE',
  voidMismatches.length === 0 && connectivity.componentCount === 1,
  `${connectedVoid.length - voidMismatches.length}/${connectedVoid.length} connected air.`);
check('R07I-QA-08-COMPLETE-BOUNDARY', boundaryMismatches.length === 0,
  `${boundary.length - boundaryMismatches.length}/${boundary.length} polished diorite.`);
check('R07I-QA-09-R07E-CAP-CLOSED',
  unchangedCount(summitCap) === summitCap.length
    && summitCap.every((cell) => postByKey.get(cellKey(cell)) === DIORITE),
  `${unchangedCount(summitCap)}/${summitCap.length} retained cap cells.`);
check('R07I-QA-10-PRIOR-PRESERVATION',
  Object.values(priorPreservation).every(({ changedCellCount }) => changedCellCount === 0),
  'R07D/R07E/R07F and R07H non-aperture targets unchanged.');
check('R07I-QA-11-B08-Z11-PRESERVATION',
  unchangedCount(b08) === b08.length && unchangedCount(z11) === z11.length,
  `${unchangedCount(b08)}/${b08.length} B08; ${unchangedCount(z11)}/${z11.length} Z11.`);
check('R07I-QA-12-NO-UNDECLARED-B09-DRIFT',
  changedAccommodation.length === EXPECTED.operatedCellCount && nonOperatedChanges.length === 0,
  `${changedAccommodation.length} exact declared B09 changes.`);
check('R07I-QA-13-STRICT-EXECUTION', strictExecutionPassed,
  `${execution.successfulGroups}/${EXPECTED.operationCount}; ${execution.noopCommands} no-op.`);
check('R07I-QA-14-ROLLBACK-POSTSTATE', rollbackPassed,
  `${rollbackPreflight.passed}/${EXPECTED.operationCount} inverse guards.`);
check('R07I-QA-15-TWO-CELL-NEGATIVE-CONTROL',
  negativeConnectivity.componentCount === 2,
  `Nominal two-cell aperture remains rejected: ${negativeConnectivity.componentSizes.join('+')}.`);

const failedChecks = checks.filter(({ status }) => status !== 'PASS');
const qaPayload = {
  schemaVersion: 1,
  id: 'combined-zones-r07i-b09-maximal-curve-summit-return-post-release-qa',
  generatedAtUtc: GENERATED_AT,
  status: failedChecks.length === 0
    ? 'PASS_R07I_B09_MAXIMAL_CURVE_SUMMIT_RETURN_POST_RELEASE_ACCEPTED'
    : 'FAIL_R07I_B09_MAXIMAL_CURVE_SUMMIT_RETURN_POST_RELEASE',
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
    },
    postCompleteSave: {
      root: ledger.postSnapshot.root,
      completeSaveSha256: ledger.postSnapshot.completeSaveSha256,
      regionSnapshotSha256: postIdentity.sha256,
    },
  },
  geometry: {
    minimumPlanningAccommodation: classManifest(accommodation),
    staticSegmentShell: classManifest(shell),
    ownedR07hFourCellTurnAperture: classManifest(aperture),
    operatedUnion: classManifest(operated),
    connectedLowerStationAndGuidewayVoid: { ...classManifest(connectedVoid), ...connectivity },
    nominalTwoCellNegativeControl: { ...classManifest(negativeVoid), ...negativeConnectivity },
    connectedVoidFaceBoundary: classManifest(boundary),
    retainedR07eApproachCap: classManifest(summitCap),
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
    turnAperture: {
      sourceStateCensus: stateCensus(recordsFor(aperture, sourceByKey)),
      postStateCensus: stateCensus(recordsFor(aperture, postByKey)),
      matchingTransitionCount: aperture.length - apertureMismatches.length,
      mismatchCount: apertureMismatches.length,
    },
    connectedRoute: {
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
    retainedR07eApproachCap: {
      sourceStateCensus: stateCensus(recordsFor(summitCap, sourceByKey)),
      postStateCensus: stateCensus(recordsFor(summitCap, postByKey)),
      unchangedCellCount: unchangedCount(summitCap),
      changedCellCount: summitCap.length - unchangedCount(summitCap),
      physicallyClosed: summitCap.every((cell) => postByKey.get(cellKey(cell)) === DIORITE),
    },
    priorReleasePreservation: priorPreservation,
    preservedExternalInterfaces: {
      b08PortalSeam: { unchangedCellCount: unchangedCount(b08), changedCellCount: b08.length - unchangedCount(b08) },
      summitInterfaceCap: { unchangedCellCount: unchangedCount(z11), changedCellCount: z11.length - unchangedCount(z11) },
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
    rollbackResealsFourCellApertureBeforeShellRemoval: true,
  },
  checks,
  summary: {
    passed: failedChecks.length === 0,
    checkCount: checks.length,
    passCount: checks.length - failedChecks.length,
    failCount: failedChecks.length,
    shellTransitionCount: shell.length - shellMismatches.length,
    apertureTransitionCount: aperture.length - apertureMismatches.length,
    connectedRouteAirCellCount: connectedVoid.length - voidMismatches.length,
    boundaryPolishedDioriteCellCount: boundary.length - boundaryMismatches.length,
    r07eCapUnchangedCellCount: unchangedCount(summitCap),
    r07dPreservedCellCount: priorPreservation.r07d.unchangedCellCount,
    r07ePreservedCellCount: priorPreservation.r07e.unchangedCellCount,
    r07fPreservedCellCount: priorPreservation.r07f.unchangedCellCount,
    r07hNonAperturePreservedCellCount: priorPreservation.r07h.unchangedCellCount,
    fullB09ChangedCellCount: changedAccommodation.length,
    undeclaredB09ChangeCount: nonOperatedChanges.length,
    strictSuccessfulGroupCount: execution.successfulGroups,
    rollbackGuardPassCount: rollbackPreflight.passed,
  },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, readOnlyAnvilInputs: true },
};
const qaPayloadSha256 = sha256(JSON.stringify(qaPayload));
const report = { ...qaPayload, qaPayloadSha256 };
fs.mkdirSync(path.dirname(absolute(OUT_PATH)), { recursive: true });
fs.mkdirSync(path.dirname(absolute(MARKDOWN_PATH)), { recursive: true });
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);

const markdown = `# CZ-R07I B09 maximal curve/summit-return post-release QA

**Status:** ${report.status}  
**QA payload identity:** \`${qaPayloadSha256}\`  
**Completed release identity:** \`${ledger.completedReleaseIdentitySha256}\`  
**Execution ledger:** \`${ledgerBinding.sha256}\`  
**Post complete save:** \`${ledger.postSnapshot.completeSaveSha256}\`

## Result

| Test | Result |
|---|---:|
| Exact shell transitions | ${report.summary.shellTransitionCount} / ${EXPECTED.shellCellCount} |
| Exact turn-aperture transitions | ${report.summary.apertureTransitionCount} / ${EXPECTED.apertureCellCount} |
| Connected route air | ${report.summary.connectedRouteAirCellCount} / ${EXPECTED.connectedVoidCellCount} |
| Complete polished-diorite boundary | ${report.summary.boundaryPolishedDioriteCellCount} / ${EXPECTED.boundaryCellCount} |
| R07E cap unchanged and closed | ${report.summary.r07eCapUnchangedCellCount} / ${EXPECTED.summitCapCellCount} |
| R07H non-aperture preserved | ${report.summary.r07hNonAperturePreservedCellCount} |
| Strict execution | ${report.summary.strictSuccessfulGroupCount} / ${EXPECTED.operationCount} |
| Rollback guards | ${report.summary.rollbackGuardPassCount} / ${EXPECTED.operationCount} |
| Undeclared B09 drift | ${report.summary.undeclaredB09ChangeCount} cells |

## Checks

| Check | Status | Detail |
|---|---|---|
${checks.map(({ id, status, detail }) => `| ${id} | **${status}** | ${detail} |`).join('\n')}

All 4,092 shell and four turn-aperture transitions match exactly. The full
1,096-cell route is one connected air component behind a complete 3,286-cell
polished-diorite boundary. The R07E cap remains closed. No B09 cell outside
the exact 4,096-cell operated set changed.

This verifier read only immutable source/post Anvil saves and hash-bound
release evidence. It made no live call and performed no world edit.
`;
fs.writeFileSync(absolute(MARKDOWN_PATH), markdown);

console.log(JSON.stringify({
  status: report.status,
  qaPayloadSha256,
  completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
  shell: `${report.summary.shellTransitionCount}/${EXPECTED.shellCellCount}`,
  aperture: `${report.summary.apertureTransitionCount}/${EXPECTED.apertureCellCount}`,
  route: `${report.summary.connectedRouteAirCellCount}/${EXPECTED.connectedVoidCellCount}`,
  boundary: `${report.summary.boundaryPolishedDioriteCellCount}/${EXPECTED.boundaryCellCount}`,
  r07eCap: `${report.summary.r07eCapUnchangedCellCount}/${EXPECTED.summitCapCellCount}`,
  strictExecution: `${report.summary.strictSuccessfulGroupCount}/${EXPECTED.operationCount}`,
  rollback: `${report.summary.rollbackGuardPassCount}/${EXPECTED.operationCount}`,
  undeclaredB09Changes: report.summary.undeclaredB09ChangeCount,
  output: relative(OUT_PATH),
  markdown: relative(MARKDOWN_PATH),
}, null, 2));
if (failedChecks.length) process.exitCode = 1;
