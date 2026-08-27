#!/usr/bin/env node
/** Read-only post-release QA and seal for CZ-R07E / P1-B09 summit headhouse. */

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

const GENERATED_AT = value('--generated-at', '2026-08-21T17:08:00Z');
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r07e-live-20260821T170500Z',
);
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r07e-b09-summit-headhouse-shell.release-manifest.json',
);
const SOURCE_ROOT = value(
  '--source-root',
  'data/worldsnap-combined-zones-r07e-source-20260821T170500Z',
);
const POST_ROOT = value(
  '--post-root',
  'data/worldsnap-combined-zones-r07e-post-20260821T170500Z',
);
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r07e-post-release-qa.json'));
const MARKDOWN_PATH = value(
  '--markdown',
  path.join(EVIDENCE_DIR, 'r07e-post-release-qa.md'),
);
const CONNECTORS_PATH =
  'docs/masterplans/05-combined-zones/phase1-connector-geometry.json';
const D05_PATH =
  'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json';
const AIR_STATE = 'minecraft:air';
const TARGET_STATE = 'minecraft:polished_diorite';

const EXPECTED = Object.freeze({
  manifestIdentity: 'e3e0055b807d28c7d52748c93f16b30d1903a719af3b31176b8805b6fcc0472d',
  manifestFileSha256: '454fb9a8cf32550ccf7547921ffe23e5b04dc0fa5aa514ae4ba778b428edf28b',
  ledgerSha256: 'f6c5957396048caa4f4771d1d78f00abc80e2b7754c98e6a7f2accdc764345d3',
  completedReleaseIdentitySha256:
    '8ad00954eff48a4d6d5f7b2acb0505bed9169d07ad8c6214818106faec67e953',
  sourceCompleteSaveSha256:
    '0e0b0f2d72d2d5f565d5f7fb83d0f78aee85a0018f573a959e393fbabfcc614e',
  sourceRegionSha256:
    '4a2936fc0c7ca463736ad5320dba16f9d50fb63f694ac3d35d2f7426fdff432b',
  postCompleteSaveSha256:
    '605535ea361acf3c061586c666e59f6218d7965e4a72308d35a56637ae60ddd3',
  postRegionSha256:
    '773729c102c13f127421a910fb65f6a81e15ae7fadfd311e7062c294d1a795cb',
  accommodationCellCount: 7800,
  accommodationSha256: 'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  summitEnvelopeCellCount: 180,
  summitEnvelopeSha256: '99d28f072ae6055d394a9690c125b4e0de58b09192cc3fd166302060f3bb9599',
  interiorCellCount: 18,
  interiorSha256: '771f8df9ee84b79c8ed5e5b2d2e1c6c828915d8d77102ea3b6d60230e681e72d',
  shellCellCount: 162,
  shellSha256: '8f1cd67b0d08e1f986c21067af7ba50e1c4f3e8daa52c703309c5734d0979592',
  faceBoundaryCellCount: 58,
  faceBoundarySha256: 'bdd0ba179cc533a5c707137a606254fa06c916bfe28fd0c59da77f168f4eab06',
  summitCapCellCount: 12,
  summitCapSha256: 'd1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093',
  approachCapCellCount: 12,
  approachCapSha256: '8ef484d874dca406f5a8abbc6dd8306ff2770ab304c10bddbc01db5c4107ad5c',
  b08SeamCellCount: 36,
  b08SeamSha256: 'b28a975b44296fc43739a8af0743066ca58a2c33a99e13da6c2edf89142b33e3',
  lowerShellCellCount: 84,
  lowerShellSha256: 'e7b44ebf100becffaca355a6b863219738a4c27e0dad83ea21170da35e411e1d',
  operationCount: 162,
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
  if (!condition) throw new Error(`R07E post-release QA rejected: ${message}`);
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
invariant(ledgerBinding.sha256 === EXPECTED.ledgerSha256,
  'terminal execution ledger file identity drifted');
invariant(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.stages?.length === 17
  && ledger.stages.every(({ status }) => status === 'PASS'),
'execution ledger is not terminally accepted with all 17 stages PASS');
invariant(ledger.transactionId === manifest.transactionId
  && ledger.releaseNodeId === manifest.releaseNodeId,
'execution ledger does not match the manifest scope');
invariant(samePath(ledger.manifest.path, MANIFEST_PATH)
  && ledger.manifest.sha256 === manifestBinding.sha256
  && manifestBinding.sha256 === EXPECTED.manifestFileSha256,
'ledger manifest binding drifted');
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
'ledger complete-save identities drifted');
invariant(sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && sourceIntake.packageIdentity.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && postIntake.packageIdentity.completeSaveSha256 === EXPECTED.postCompleteSaveSha256,
'source or post complete-save intake is not identity-bound PASS evidence');
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
invariant(evidenceBindingFailures.length === 0,
  'one or more terminal evidence bindings drifted');
const recomputedSourceBoundReleaseIdentity = sha256(JSON.stringify({
  executionBindingSha256: ledger.executionBindingSha256,
  sourceCompleteSaveSha256: sourceIntake.packageIdentity.completeSaveSha256,
  sourceRegionSha256: sourceIdentity.sha256,
}));
invariant(ledger.sourceBoundReleaseIdentitySha256 === recomputedSourceBoundReleaseIdentity,
  'source-bound release identity drifted');
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
invariant(ledger.completedReleaseIdentitySha256 === EXPECTED.completedReleaseIdentitySha256
  && ledger.completedReleaseIdentitySha256 === recomputedCompletedReleaseIdentity,
'completed release identity drifted');

const connectors = readJson(CONNECTORS_PATH);
const d05 = readJson(D05_PATH);
const selectedModel = d05.alternatives.find(
  ({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE',
);
invariant(selectedModel, 'selected FM-01 model is missing');
const endpoints = connectors.funicularFaceComparison.designEndpoints;
const accommodation = buildB09MinimumReservation(selectedModel.formula, endpoints);
const interior = [];
for (let offset = 8; offset >= 0; offset -= 1) {
  for (let dy = 0; dy <= 1; dy += 1) {
    interior.push({
      x: endpoints.to.x,
      y: endpoints.to.y - offset + dy,
      z: endpoints.to.z + offset,
    });
  }
}
const summitEnvelope = dilateCells(interior, 1);
const shell = difference(summitEnvelope, interior);
const summitCap = cellsIn({
  minX: 2047, maxX: 2049,
  minY: 303, maxY: 306,
  minZ: -829, maxZ: -829,
});
const approachCap = summitEnvelope.filter(({ z }) => z === -819);
const interiorKeys = new Set(interior.map(cellKey));
const faceBoundary = uniqueCells(interior.flatMap((cell) => (
  FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({
    x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
  }))
)).filter((cell) => !interiorKeys.has(cellKey(cell))));
const b08Seam = cellsIn({
  minX: 2047, maxX: 2049,
  minY: 129, maxY: 132,
  minZ: -749, maxZ: -747,
});
const lowerInterior = cellsIn({
  minX: 2051, maxX: 2056,
  minY: 130, maxY: 131,
  minZ: -748, maxZ: -748,
});
const lowerShell = difference(cellsIn({
  minX: 2050, maxX: 2057,
  minY: 129, maxY: 132,
  minZ: -749, maxZ: -747,
}), lowerInterior);
const shellKeys = new Set(shell.map(cellKey));
invariant(accommodation.length === EXPECTED.accommodationCellCount
  && hashCells(accommodation) === EXPECTED.accommodationSha256
  && summitEnvelope.length === EXPECTED.summitEnvelopeCellCount
  && hashCells(summitEnvelope) === EXPECTED.summitEnvelopeSha256
  && interior.length === EXPECTED.interiorCellCount
  && hashCells(interior) === EXPECTED.interiorSha256
  && shell.length === EXPECTED.shellCellCount
  && hashCells(shell) === EXPECTED.shellSha256
  && faceBoundary.length === EXPECTED.faceBoundaryCellCount
  && hashCells(faceBoundary) === EXPECTED.faceBoundarySha256
  && faceBoundary.every((cell) => shellKeys.has(cellKey(cell)))
  && summitCap.length === EXPECTED.summitCapCellCount
  && hashCells(summitCap) === EXPECTED.summitCapSha256
  && intersection(shell, summitCap).length === summitCap.length
  && approachCap.length === EXPECTED.approachCapCellCount
  && hashCells(approachCap) === EXPECTED.approachCapSha256
  && intersection(shell, approachCap).length === approachCap.length
  && b08Seam.length === EXPECTED.b08SeamCellCount
  && hashCells(b08Seam) === EXPECTED.b08SeamSha256
  && lowerShell.length === EXPECTED.lowerShellCellCount
  && hashCells(lowerShell) === EXPECTED.lowerShellSha256
  && intersection(shell, b08Seam).length === 0
  && intersection(shell, lowerShell).length === 0,
'canonical summit/B09 geometry or preserved-interface isolation drifted');
const interiorConnectivity = connectedComponents(interior);

const pkg = manifest.packages.find(({ key }) => key === 'b09-summit-headhouse-shell');
invariant(pkg, 'summit-headhouse package is missing');
const forwardOperations = parseOperations(pkg.forward);
const rollbackOperations = parseOperations(pkg.rollback);
const expandedForward = expandOperations(forwardOperations);
const expandedRollback = expandOperations(rollbackOperations);
invariant(forwardOperations.length === EXPECTED.operationCount
  && rollbackOperations.length === EXPECTED.operationCount
  && expandedForward.length === EXPECTED.shellCellCount
  && expandedRollback.length === EXPECTED.shellCellCount
  && hashCells(expandedForward.map(({ cell }) => cell)) === EXPECTED.shellSha256
  && hashCells(expandedRollback.map(({ cell }) => cell)) === EXPECTED.shellSha256,
'operation target geometry drifted');
invariant(forwardOperations.every(({ from, to }) => JSON.stringify(from) === JSON.stringify(to)),
  'forward package no longer uses exact one-cell guards');
invariant(rollbackOperations.every((operation, index) => {
  const forward = forwardOperations.at(-(index + 1));
  return JSON.stringify(operation.from) === JSON.stringify(forward.from)
    && JSON.stringify(operation.to) === JSON.stringify(forward.to)
    && operation.fromState === forward.toState
    && operation.toState === forward.fromState;
}), 'rollback is not the exact reverse-order inverse');
invariant(sha256(operationBody(pkg.forward))
    === manifest.operations['b09-summit-headhouse-shell'].forwardSha256
  && sha256(operationBody(pkg.rollback))
    === manifest.operations['b09-summit-headhouse-shell'].rollbackSha256,
'manifest operation-body identity drifted');

const sourceReader = new AnvilReader(absolute(path.join(SOURCE_ROOT, 'region')));
const postReader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
const sourceAccommodation = await states(sourceReader, accommodation);
const postAccommodation = await states(postReader, accommodation);
const sourceByKey = new Map(sourceAccommodation.map((record) => [cellKey(record.cell), record.state]));
const postByKey = new Map(postAccommodation.map((record) => [cellKey(record.cell), record.state]));
const changedAccommodation = accommodation.filter((cell) => (
  sourceByKey.get(cellKey(cell)) !== postByKey.get(cellKey(cell))
));
const recordsFor = (cells, stateMap) => cells.map((cell) => ({
  cell,
  state: stateMap.get(cellKey(cell)),
}));
const shellSource = recordsFor(shell, sourceByKey);
const shellPost = recordsFor(shell, postByKey);
const interiorSource = recordsFor(interior, sourceByKey);
const interiorPost = recordsFor(interior, postByKey);
const summitCapSource = recordsFor(summitCap, sourceByKey);
const summitCapPost = recordsFor(summitCap, postByKey);
const approachCapSource = recordsFor(approachCap, sourceByKey);
const approachCapPost = recordsFor(approachCap, postByKey);
const b08Source = recordsFor(b08Seam, sourceByKey);
const b08Post = recordsFor(b08Seam, postByKey);
const lowerSource = recordsFor(lowerShell, sourceByKey);
const lowerPost = recordsFor(lowerShell, postByKey);
const shellTransitionMismatches = shell.filter((cell) => (
  sourceByKey.get(cellKey(cell)) !== AIR_STATE
  || postByKey.get(cellKey(cell)) !== TARGET_STATE
));
const interiorMismatches = interior.filter((cell) => (
  sourceByKey.get(cellKey(cell)) !== AIR_STATE
  || postByKey.get(cellKey(cell)) !== AIR_STATE
));
const summitCapMismatches = summitCap.filter((cell) => (
  sourceByKey.get(cellKey(cell)) !== AIR_STATE
  || postByKey.get(cellKey(cell)) !== TARGET_STATE
));
const approachCapMismatches = approachCap.filter((cell) => (
  sourceByKey.get(cellKey(cell)) !== AIR_STATE
  || postByKey.get(cellKey(cell)) !== TARGET_STATE
));
const b08Changes = b08Seam.filter((cell) => (
  sourceByKey.get(cellKey(cell)) !== postByKey.get(cellKey(cell))
));
const lowerShellChanges = lowerShell.filter((cell) => (
  sourceByKey.get(cellKey(cell)) !== postByKey.get(cellKey(cell))
));
const nonShellChanges = difference(changedAccommodation, shell);

const executionPath = path.join(
  EVIDENCE_DIR,
  'b09-summit-headhouse-shell.forward-execution.json',
);
const rollbackPreflightPath = path.join(
  EVIDENCE_DIR,
  'b09-summit-headhouse-shell.rollback-poststate-preflight.json',
);
const execution = readJson(executionPath);
const rollbackPreflight = readJson(rollbackPreflightPath);
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
check('R07E-QA-01-TERMINAL-LEDGER',
  ledger.stages.every(({ status }) => status === 'PASS'),
  `${ledger.stages.length}/${ledger.stages.length} terminal-ledger stages PASS.`);
check('R07E-QA-02-COMPLETED-IDENTITY',
  ledger.completedReleaseIdentitySha256 === recomputedCompletedReleaseIdentity,
  `Completed release identity ${ledger.completedReleaseIdentitySha256}.`);
check('R07E-QA-03-EVIDENCE-BINDINGS', evidenceBindingFailures.length === 0,
  `${ledger.evidenceBindings.length}/${ledger.evidenceBindings.length} evidence bindings intact.`);
check('R07E-QA-04-MANIFEST-AND-SAVES-BOUND',
  manifestBinding.sha256 === EXPECTED.manifestFileSha256
    && sourceIdentity.sha256 === EXPECTED.sourceRegionSha256
    && postIdentity.sha256 === EXPECTED.postRegionSha256,
  `Manifest ${manifest.manifestIdentity}; post save ${EXPECTED.postCompleteSaveSha256}.`);
check('R07E-QA-05-CANONICAL-GEOMETRY',
  shell.length === EXPECTED.shellCellCount
    && interior.length === EXPECTED.interiorCellCount
    && faceBoundary.every((cell) => shellKeys.has(cellKey(cell))),
  `${shell.length} shell cells enclose ${interior.length} connected interior cells.`);
check('R07E-QA-06-EXACT-SHELL-TRANSITIONS', shellTransitionMismatches.length === 0,
  `${shell.length - shellTransitionMismatches.length}/${shell.length} exact air-to-diorite transitions.`);
check('R07E-QA-07-INTERIOR-AIR-AND-CONNECTED',
  interiorMismatches.length === 0
    && interiorConnectivity.componentCount === 1
    && interiorConnectivity.largestComponentCellCount === EXPECTED.interiorCellCount,
  `${interior.length - interiorMismatches.length}/${interior.length} source/post air; one component.`);
check('R07E-QA-08-SUMMIT-INTERFACE-CAP-CLOSED', summitCapMismatches.length === 0,
  `${summitCap.length - summitCapMismatches.length}/${summitCap.length} exact closed cap transitions.`);
check('R07E-QA-09-APPROACH-CAP-CLOSED', approachCapMismatches.length === 0,
  `${approachCap.length - approachCapMismatches.length}/${approachCap.length} exact closed cap transitions.`);
check('R07E-QA-10-PRIOR-R07-INTERFACES-UNCHANGED',
  b08Changes.length === 0 && lowerShellChanges.length === 0,
  `${b08Seam.length}/${b08Seam.length} B08 seam and ${lowerShell.length}/${lowerShell.length} R07D shell unchanged.`);
check('R07E-QA-11-NO-OTHER-B09-DRIFT',
  changedAccommodation.length === EXPECTED.shellCellCount
    && nonShellChanges.length === 0,
  `${changedAccommodation.length} B09 changes, exactly the declared shell.`);
check('R07E-QA-12-STRICT-EXECUTION', strictExecutionPassed,
  `${execution.successfulGroups}/${EXPECTED.operationCount} strict groups; ${execution.noopCommands} no-op.`);
check('R07E-QA-13-EXACT-INVERSE-AND-ROLLBACK', rollbackPassed,
  `${rollbackPreflight.passed}/${EXPECTED.operationCount} reverse-order inverse guards PASS.`);

const failedChecks = checks.filter(({ status }) => status !== 'PASS');
const qaPayload = {
  schemaVersion: 1,
  id: 'combined-zones-r07e-b09-summit-headhouse-shell-post-release-qa',
  generatedAtUtc: GENERATED_AT,
  status: failedChecks.length === 0
    ? 'PASS_R07E_B09_SUMMIT_HEADHOUSE_POST_RELEASE_ACCEPTED'
    : 'FAIL_R07E_B09_SUMMIT_HEADHOUSE_POST_RELEASE',
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
    summitStationEnvelope: classManifest(summitEnvelope),
    connectedRailAndHeadroomVoid: {
      ...classManifest(interior),
      ...interiorConnectivity,
    },
    summitHeadhouseShell: classManifest(shell),
    interiorFaceBoundary: classManifest(faceBoundary),
    guidewayApproachCap: classManifest(approachCap),
    summitInterfaceCap: classManifest(summitCap),
    b08PortalSeam: classManifest(b08Seam),
    acceptedR07DLowerShell: classManifest(lowerShell),
  },
  postState: {
    shell: {
      expectedSourceState: AIR_STATE,
      expectedPostState: TARGET_STATE,
      sourceStateCensus: stateCensus(shellSource),
      postStateCensus: stateCensus(shellPost),
      matchingTransitionCount: shell.length - shellTransitionMismatches.length,
      mismatchCount: shellTransitionMismatches.length,
      listedMismatches: shellTransitionMismatches,
    },
    preservedInterior: {
      sourceStateCensus: stateCensus(interiorSource),
      postStateCensus: stateCensus(interiorPost),
      unchangedAirCellCount: interior.length - interiorMismatches.length,
      mismatchCount: interiorMismatches.length,
      connectivity: interiorConnectivity,
    },
    summitInterfaceCap: {
      sourceStateCensus: stateCensus(summitCapSource),
      postStateCensus: stateCensus(summitCapPost),
      matchingTransitionCount: summitCap.length - summitCapMismatches.length,
      mismatchCount: summitCapMismatches.length,
      physicallyClosed: summitCapMismatches.length === 0,
    },
    guidewayApproachCap: {
      sourceStateCensus: stateCensus(approachCapSource),
      postStateCensus: stateCensus(approachCapPost),
      matchingTransitionCount: approachCap.length - approachCapMismatches.length,
      mismatchCount: approachCapMismatches.length,
      physicallyClosed: approachCapMismatches.length === 0,
    },
    preservedPriorInterfaces: {
      b08PortalSeam: {
        sourceStateCensus: stateCensus(b08Source),
        postStateCensus: stateCensus(b08Post),
        unchangedCellCount: b08Seam.length - b08Changes.length,
        changedCellCount: b08Changes.length,
      },
      acceptedR07DLowerShell: {
        sourceStateCensus: stateCensus(lowerSource),
        postStateCensus: stateCensus(lowerPost),
        unchangedCellCount: lowerShell.length - lowerShellChanges.length,
        changedCellCount: lowerShellChanges.length,
      },
    },
    fullB09Accommodation: {
      sourceStateCensus: stateCensus(sourceAccommodation),
      postStateCensus: stateCensus(postAccommodation),
      sourceStateSetSha256: stateSetSha256(sourceAccommodation),
      postStateSetSha256: stateSetSha256(postAccommodation),
      changedCellCount: changedAccommodation.length,
      nonShellChangedCellCount: nonShellChanges.length,
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
      ...fileBinding(rollbackPreflightPath),
      opsSha256: rollbackPreflight.opsSha256,
      passedGuards: rollbackPreflight.passed,
      failedGuards: rollbackPreflight.failed,
      regionSnapshotSha256: rollbackPreflight.regionsSnapshot?.sha256,
      passed: rollbackPassed,
    },
    exactOneCellForwardGuards: true,
    exactReverseOrderInverse: true,
  },
  checks,
  summary: {
    passed: failedChecks.length === 0,
    checkCount: checks.length,
    passCount: checks.length - failedChecks.length,
    failCount: failedChecks.length,
    shellTransitionCount: shell.length - shellTransitionMismatches.length,
    interiorUnchangedAirCellCount: interior.length - interiorMismatches.length,
    summitInterfaceCapClosedCellCount: summitCap.length - summitCapMismatches.length,
    guidewayApproachCapClosedCellCount: approachCap.length - approachCapMismatches.length,
    b08SeamUnchangedCellCount: b08Seam.length - b08Changes.length,
    r07dLowerShellUnchangedCellCount: lowerShell.length - lowerShellChanges.length,
    fullB09ChangedCellCount: changedAccommodation.length,
    nonShellB09ChangeCount: nonShellChanges.length,
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

const markdown = `# CZ-R07E B09 summit-headhouse shell post-release QA

**Status:** ${report.status}  
**QA payload identity:** \`${qaPayloadSha256}\`  
**Completed release identity:** \`${ledger.completedReleaseIdentitySha256}\`  
**Execution ledger:** \`${ledgerBinding.sha256}\`  
**Post complete save:** \`${ledger.postSnapshot.completeSaveSha256}\`

## Result

| Test | Result |
|---|---:|
| Exact air-to-polished-diorite shell | ${report.summary.shellTransitionCount} / ${EXPECTED.shellCellCount} |
| Preserved connected interior air | ${report.summary.interiorUnchangedAirCellCount} / ${EXPECTED.interiorCellCount} |
| Z11 summit interface cap closed | ${report.summary.summitInterfaceCapClosedCellCount} / ${EXPECTED.summitCapCellCount} |
| Guideway approach cap closed | ${report.summary.guidewayApproachCapClosedCellCount} / ${EXPECTED.approachCapCellCount} |
| B08 seam unchanged | ${report.summary.b08SeamUnchangedCellCount} / ${EXPECTED.b08SeamCellCount} |
| Accepted R07D lower shell unchanged | ${report.summary.r07dLowerShellUnchangedCellCount} / ${EXPECTED.lowerShellCellCount} |
| Strict execution | ${report.summary.strictSuccessfulGroupCount} / ${EXPECTED.operationCount} groups |
| Rollback post-state guards | ${report.summary.rollbackGuardPassCount} / ${EXPECTED.operationCount} |
| Undeclared B09 accommodation drift | ${report.summary.nonShellB09ChangeCount} cells |

## Checks

| Check | Status | Detail |
|---|---|---|
${checks.map(({ id, status, detail }) => `| ${id} | **${status}** | ${detail} |`).join('\n')}

All 162 declared shell targets changed from exact air to polished diorite.
The 18-cell rail/headroom void remains connected air. Both 12-cell future
interfaces are physically closed, while the B08 seam and accepted R07D lower
shell retain their exact source states. Across the full frozen 7,800-cell B09
accommodation, there are no source-to-post changes outside the R07E shell.

This verifier read only immutable source/post Anvil saves and hash-bound
release evidence. It made no live call and performed no world edit.
`;
fs.writeFileSync(absolute(MARKDOWN_PATH), markdown);

console.log(JSON.stringify({
  status: report.status,
  qaPayloadSha256,
  completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
  shell: `${report.summary.shellTransitionCount}/${EXPECTED.shellCellCount}`,
  interiorAir: `${report.summary.interiorUnchangedAirCellCount}/${EXPECTED.interiorCellCount}`,
  summitCap: `${report.summary.summitInterfaceCapClosedCellCount}/${EXPECTED.summitCapCellCount}`,
  approachCap: `${report.summary.guidewayApproachCapClosedCellCount}/${EXPECTED.approachCapCellCount}`,
  strictExecution: `${report.summary.strictSuccessfulGroupCount}/${EXPECTED.operationCount}`,
  rollback: `${report.summary.rollbackGuardPassCount}/${EXPECTED.operationCount}`,
  nonShellB09Changes: report.summary.nonShellB09ChangeCount,
  output: relative(OUT_PATH),
  markdown: relative(MARKDOWN_PATH),
}, null, 2));
if (failedChecks.length) process.exitCode = 1;
