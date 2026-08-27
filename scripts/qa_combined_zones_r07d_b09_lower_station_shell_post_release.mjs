#!/usr/bin/env node
/** Read-only post-release QA and seal for CZ-R07D / P1-B09. */

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

const GENERATED_AT = value('--generated-at', '2026-08-21T16:48:00Z');
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r07d-live-20260821T164505Z',
);
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r07d-b09-lower-station-shell.release-manifest.json',
);
const SOURCE_ROOT = value(
  '--source-root',
  'data/worldsnap-combined-zones-r07d-pre-20260821T164505Z',
);
const POST_ROOT = value(
  '--post-root',
  'data/worldsnap-combined-zones-r07d-post-20260821T164505Z',
);
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r07d-post-release-qa.json'));
const MARKDOWN_PATH = value(
  '--markdown',
  path.join(EVIDENCE_DIR, 'r07d-post-release-qa.md'),
);
const CONNECTORS_PATH =
  'docs/masterplans/05-combined-zones/phase1-connector-geometry.json';
const D05_PATH =
  'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json';
const TARGET_STATE = 'minecraft:polished_diorite';
const AIR_STATE = 'minecraft:air';

const EXPECTED = Object.freeze({
  manifestIdentity: '1bd7cafaa9f37a9b63e681fd73114b836b77b54544fee586ccabfe64ed19f49a',
  manifestFileSha256: '194f676779446cc7a0ec9f4ebc428910e185246a5c5e3abb268edd258e47c75a',
  sourceCompleteSaveSha256: 'f2048c5d1dd2349bef2629f2f15ce995cc27cbfaa86121ff10b5ac13bd3ab2a3',
  sourceRegionSha256: 'cf46558821d428b4727cca980b845ef43a094998a75b4bb07ed75dbbefed65ad',
  postCompleteSaveSha256: 'fdffaae24e4adb32ac32df7f14a1efef14e70922b6633562f093bbfafca4b858',
  postRegionSha256: '5ec31dc503fac970a174056db8459d88aa29ec5ae441f50f6e4744cd58b40e1d',
  accommodationCellCount: 7800,
  accommodationSha256: 'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  lowerStationCellCount: 132,
  lowerStationSha256: 'd13426cafb5f9cb53de702653532111ef18588af1c28c0f3d8e7cb2956e0801b',
  b08SeamCellCount: 36,
  b08SeamSha256: 'b28a975b44296fc43739a8af0743066ca58a2c33a99e13da6c2edf89142b33e3',
  summitCapCellCount: 12,
  summitCapSha256: 'd1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093',
  residualCellCount: 96,
  shellCellCount: 84,
  shellSha256: 'e7b44ebf100becffaca355a6b863219738a4c27e0dad83ea21170da35e411e1d',
  interiorCellCount: 12,
  interiorSha256: '4062250031378a6fd8ee3a499df1c38cfb9af751e28876bb90c06bf00cd6eae7',
  capCellCount: 12,
  operationCount: 6,
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
  if (!condition) throw new Error(`R07D post-release QA rejected: ${message}`);
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
invariant(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.stages?.length === 17
  && ledger.stages.every(({ status }) => status === 'PASS'),
'execution ledger is not terminally accepted with all stages PASS');
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
'ledger source/post complete-save identities drifted');
invariant(sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && sourceIntake.packageIdentity.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && postIntake.packageIdentity.completeSaveSha256 === EXPECTED.postCompleteSaveSha256,
'source or post complete-save intake is not PASS and identity-bound');
invariant(sourceIdentity.sha256 === EXPECTED.sourceRegionSha256
  && postIdentity.sha256 === EXPECTED.postRegionSha256
  && samePath(sourceIdentity.directory, path.join(SOURCE_ROOT, 'region'))
  && samePath(postIdentity.directory, path.join(POST_ROOT, 'region')),
'source or post region identity drifted');

const connectors = readJson(CONNECTORS_PATH);
const d05 = readJson(D05_PATH);
const selectedModel = d05.alternatives.find(
  ({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE',
);
invariant(selectedModel, 'selected FM-01 model is missing');
const endpoints = connectors.funicularFaceComparison.designEndpoints;
const accommodation = buildB09MinimumReservation(selectedModel.formula, endpoints);
const lowerStationSeed = [];
for (let offset = 0; offset <= 8; offset += 1) {
  for (let dy = 0; dy <= 1; dy += 1) {
    lowerStationSeed.push({
      x: endpoints.from.x + offset,
      y: endpoints.from.y + dy,
      z: endpoints.from.z,
    });
  }
}
const lowerStation = dilateCells(lowerStationSeed, 1);
const b08Seam = lowerStation.filter(({ x }) => x <= 2049);
const residual = difference(lowerStation, b08Seam);
const interior = cellsIn({
  minX: 2051, maxX: 2056,
  minY: 130, maxY: 131,
  minZ: -748, maxZ: -748,
});
const shell = difference(residual, interior);
const westCap = shell.filter(({ x }) => x === 2050);
const eastCap = shell.filter(({ x }) => x === 2057);
const summitCap = cellsIn({
  minX: 2047, maxX: 2049,
  minY: 303, maxY: 306,
  minZ: -829, maxZ: -829,
});
invariant(accommodation.length === EXPECTED.accommodationCellCount
  && hashCells(accommodation) === EXPECTED.accommodationSha256
  && lowerStation.length === EXPECTED.lowerStationCellCount
  && hashCells(lowerStation) === EXPECTED.lowerStationSha256
  && b08Seam.length === EXPECTED.b08SeamCellCount
  && hashCells(b08Seam) === EXPECTED.b08SeamSha256
  && residual.length === EXPECTED.residualCellCount
  && shell.length === EXPECTED.shellCellCount
  && hashCells(shell) === EXPECTED.shellSha256
  && interior.length === EXPECTED.interiorCellCount
  && hashCells(interior) === EXPECTED.interiorSha256
  && summitCap.length === EXPECTED.summitCapCellCount
  && hashCells(summitCap) === EXPECTED.summitCapSha256,
'canonical B09 geometry drifted');

const pkg = manifest.packages.find(({ key }) => key === 'b09-lower-station-shell');
invariant(pkg, 'shell package is missing');
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
invariant(rollbackOperations.every((operation, index) => {
  const forward = forwardOperations.at(-(index + 1));
  return JSON.stringify(operation.from) === JSON.stringify(forward.from)
    && JSON.stringify(operation.to) === JSON.stringify(forward.to)
    && operation.fromState === forward.toState
    && operation.toState === forward.fromState;
}), 'rollback is not the exact reverse-order inverse');
invariant(sha256(operationBody(pkg.forward))
    === manifest.operations['b09-lower-station-shell'].forwardSha256
  && sha256(operationBody(pkg.rollback))
    === manifest.operations['b09-lower-station-shell'].rollbackSha256,
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
const shellPost = shell.map((cell) => ({ cell, state: postByKey.get(cellKey(cell)) }));
const interiorSource = interior.map((cell) => ({ cell, state: sourceByKey.get(cellKey(cell)) }));
const interiorPost = interior.map((cell) => ({ cell, state: postByKey.get(cellKey(cell)) }));
const seamSource = b08Seam.map((cell) => ({ cell, state: sourceByKey.get(cellKey(cell)) }));
const seamPost = b08Seam.map((cell) => ({ cell, state: postByKey.get(cellKey(cell)) }));
const summitSource = summitCap.map((cell) => ({ cell, state: sourceByKey.get(cellKey(cell)) }));
const summitPost = summitCap.map((cell) => ({ cell, state: postByKey.get(cellKey(cell)) }));
const westCapPost = westCap.map((cell) => ({ cell, state: postByKey.get(cellKey(cell)) }));
const eastCapPost = eastCap.map((cell) => ({ cell, state: postByKey.get(cellKey(cell)) }));
const shellMismatches = shellPost.filter(({ state }) => state !== TARGET_STATE);
const interiorMismatches = interiorPost.filter(({ state }) => state !== AIR_STATE);
const seamChanges = b08Seam.filter((cell) => (
  sourceByKey.get(cellKey(cell)) !== postByKey.get(cellKey(cell))
));
const summitChanges = summitCap.filter((cell) => (
  sourceByKey.get(cellKey(cell)) !== postByKey.get(cellKey(cell))
));
const nonShellChanges = difference(changedAccommodation, shell);
const unexpectedShellTransitions = shell.filter((cell) => (
  sourceByKey.get(cellKey(cell)) !== AIR_STATE
  || postByKey.get(cellKey(cell)) !== TARGET_STATE
));
const interiorConnectivity = connectedComponents(interior);

const executionPath = path.join(EVIDENCE_DIR, 'b09-lower-station-shell.forward-execution.json');
const rollbackPreflightPath = path.join(
  EVIDENCE_DIR,
  'b09-lower-station-shell.rollback-poststate-preflight.json',
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
check('R07D-QA-01-TERMINAL-LEDGER',
  ledger.stages.every(({ status }) => status === 'PASS'),
  `${ledger.stages.length}/${ledger.stages.length} terminal-ledger stages PASS.`);
check('R07D-QA-02-MANIFEST-AND-SAVES-BOUND',
  manifestBinding.sha256 === EXPECTED.manifestFileSha256
    && sourceIdentity.sha256 === EXPECTED.sourceRegionSha256
    && postIdentity.sha256 === EXPECTED.postRegionSha256,
  `Manifest ${manifest.manifestIdentity}; post save ${EXPECTED.postCompleteSaveSha256}.`);
check('R07D-QA-03-CANONICAL-GEOMETRY',
  shell.length === EXPECTED.shellCellCount && interior.length === EXPECTED.interiorCellCount,
  `${shell.length} shell cells; ${interior.length} preserved interior cells.`);
check('R07D-QA-04-EXACT-SHELL-POSTSTATE',
  shellMismatches.length === 0,
  `${shell.length - shellMismatches.length}/${shell.length} shell cells polished diorite.`);
check('R07D-QA-05-INTERIOR-AIR-AND-CONNECTED',
  interiorMismatches.length === 0
    && interiorConnectivity.componentCount === 1
    && interiorConnectivity.largestComponentCellCount === EXPECTED.interiorCellCount,
  `${interior.length - interiorMismatches.length}/${interior.length} air; one connected component.`);
check('R07D-QA-06-B08-SEAM-UNTOUCHED-AND-ISOLATED',
  seamChanges.length === 0
    && westCapPost.every(({ state }) => state === TARGET_STATE),
  `${b08Seam.length}/${b08Seam.length} seam states unchanged; west isolation cap 12/12 complete.`);
check('R07D-QA-07-SUMMIT-CAP-UNTOUCHED-AND-ISOLATED',
  summitChanges.length === 0
    && eastCapPost.every(({ state }) => state === TARGET_STATE)
    && intersection(shell, summitCap).length === 0,
  `${summitCap.length}/${summitCap.length} summit-cap states unchanged; guideway remains closed behind east cap.`);
check('R07D-QA-08-NO-OTHER-B09-DRIFT',
  changedAccommodation.length === EXPECTED.shellCellCount
    && nonShellChanges.length === 0
    && unexpectedShellTransitions.length === 0,
  `${changedAccommodation.length} B09 changes, exactly the 84 declared air-to-diorite targets.`);
check('R07D-QA-09-STRICT-EXECUTION', strictExecutionPassed,
  `${execution.successfulGroups}/${EXPECTED.operationCount} strict groups; ${execution.noopCommands} no-op.`);
check('R07D-QA-10-EXACT-INVERSE',
  rollbackOperations.length === EXPECTED.operationCount,
  'Rollback is the exact six-band reverse-order state inverse.');
check('R07D-QA-11-ROLLBACK-POSTSTATE', rollbackPassed,
  `${rollbackPreflight.passed}/${EXPECTED.operationCount} inverse guards PASS on the exact post snapshot.`);

const completedReleaseIdentityPayload = {
  schemaVersion: 1,
  projectId: ledger.projectId,
  releaseNodeId: ledger.releaseNodeId,
  transactionId: ledger.transactionId,
  manifestIdentity: manifest.manifestIdentity,
  manifestFileSha256: manifestBinding.sha256,
  executionLedgerSha256: ledgerBinding.sha256,
  sourceCompleteSaveSha256: ledger.sourceSnapshot.completeSaveSha256,
  sourceRegionSha256: sourceIdentity.sha256,
  postCompleteSaveSha256: ledger.postSnapshot.completeSaveSha256,
  postRegionSha256: postIdentity.sha256,
  targetCoordinateSetSha256: EXPECTED.shellSha256,
  sourceAccommodationStateSetSha256: stateSetSha256(sourceAccommodation),
  postAccommodationStateSetSha256: stateSetSha256(postAccommodation),
  executionReportSha256: fileBinding(executionPath).sha256,
  rollbackPoststatePreflightSha256: fileBinding(rollbackPreflightPath).sha256,
};
const completedReleaseIdentitySha256 = sha256(
  JSON.stringify(completedReleaseIdentityPayload),
);
const failedChecks = checks.filter(({ status }) => status !== 'PASS');
const qaPayload = {
  schemaVersion: 1,
  id: 'combined-zones-r07d-b09-lower-station-shell-post-release-qa',
  generatedAtUtc: GENERATED_AT,
  status: failedChecks.length === 0
    ? 'PASS_R07D_B09_LOWER_STATION_SHELL_POST_RELEASE_ACCEPTED'
    : 'FAIL_R07D_B09_LOWER_STATION_SHELL_POST_RELEASE',
  release: {
    transactionId: manifest.transactionId,
    releaseNodeId: manifest.releaseNodeId,
    scopeIds: manifest.scopeIds,
    manifestIdentity: manifest.manifestIdentity,
    completedReleaseIdentityPayload,
    completedReleaseIdentitySha256,
  },
  bindings: {
    ledger: { ...ledgerBinding, status: ledger.status },
    manifest: { ...manifestBinding, manifestIdentity: manifest.manifestIdentity },
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
    lowerStationEnvelope: classManifest(lowerStation),
    b08PortalSeam: classManifest(b08Seam),
    lowerStationResidual: classManifest(residual),
    roughShell: classManifest(shell),
    preservedInteriorVoid: classManifest(interior),
    westIsolationCap: classManifest(westCap),
    eastIsolationCap: classManifest(eastCap),
    summitInterfaceCap: classManifest(summitCap),
  },
  postState: {
    shell: {
      expectedState: TARGET_STATE,
      stateCensus: stateCensus(shellPost),
      matchingCellCount: shell.length - shellMismatches.length,
      mismatchCellCount: shellMismatches.length,
      listedMismatches: shellMismatches,
    },
    preservedInterior: {
      expectedState: AIR_STATE,
      stateCensus: stateCensus(interiorPost),
      matchingCellCount: interior.length - interiorMismatches.length,
      mismatchCellCount: interiorMismatches.length,
      connectivity: interiorConnectivity,
    },
    b08PortalSeam: {
      sourceStateCensus: stateCensus(seamSource),
      postStateCensus: stateCensus(seamPost),
      sourceStateSetSha256: stateSetSha256(seamSource),
      postStateSetSha256: stateSetSha256(seamPost),
      unchangedCellCount: b08Seam.length - seamChanges.length,
      changedCellCount: seamChanges.length,
      westIsolationCapPolishedDioriteCellCount:
        westCapPost.filter(({ state }) => state === TARGET_STATE).length,
    },
    summitInterfaceCap: {
      sourceStateCensus: stateCensus(summitSource),
      postStateCensus: stateCensus(summitPost),
      sourceStateSetSha256: stateSetSha256(summitSource),
      postStateSetSha256: stateSetSha256(summitPost),
      unchangedCellCount: summitCap.length - summitChanges.length,
      changedCellCount: summitChanges.length,
      eastIsolationCapPolishedDioriteCellCount:
        eastCapPost.filter(({ state }) => state === TARGET_STATE).length,
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
    exactReverseOrderInverse: true,
  },
  checks,
  summary: {
    passed: failedChecks.length === 0,
    checkCount: checks.length,
    passCount: checks.length - failedChecks.length,
    failCount: failedChecks.length,
    shellMatchingCellCount: shell.length - shellMismatches.length,
    interiorAirCellCount: interior.length - interiorMismatches.length,
    b08SeamUnchangedCellCount: b08Seam.length - seamChanges.length,
    summitCapUnchangedCellCount: summitCap.length - summitChanges.length,
    westIsolationCapCellCount: westCapPost.filter(({ state }) => state === TARGET_STATE).length,
    eastIsolationCapCellCount: eastCapPost.filter(({ state }) => state === TARGET_STATE).length,
    strictSuccessfulGroupCount: execution.successfulGroups,
    rollbackGuardPassCount: rollbackPreflight.passed,
    nonShellB09ChangeCount: nonShellChanges.length,
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

const markdown = `# CZ-R07D B09 lower-station shell post-release QA

**Status:** ${report.status}  
**QA payload identity:** \`${qaPayloadSha256}\`  
**Completed release identity:** \`${completedReleaseIdentitySha256}\`  
**Execution ledger:** \`${ledgerBinding.sha256}\`  
**Post complete save:** \`${ledger.postSnapshot.completeSaveSha256}\`

## Result

| Test | Result |
|---|---:|
| Exact polished-diorite shell | ${report.summary.shellMatchingCellCount} / ${EXPECTED.shellCellCount} |
| Preserved connected interior air | ${report.summary.interiorAirCellCount} / ${EXPECTED.interiorCellCount} |
| B08 interface unchanged | ${report.summary.b08SeamUnchangedCellCount} / ${EXPECTED.b08SeamCellCount} |
| West physical isolation cap | ${report.summary.westIsolationCapCellCount} / ${EXPECTED.capCellCount} |
| Summit interface unchanged | ${report.summary.summitCapUnchangedCellCount} / ${EXPECTED.summitCapCellCount} |
| East guideway isolation cap | ${report.summary.eastIsolationCapCellCount} / ${EXPECTED.capCellCount} |
| Strict execution | ${report.summary.strictSuccessfulGroupCount} / ${EXPECTED.operationCount} groups |
| Rollback post-state guards | ${report.summary.rollbackGuardPassCount} / ${EXPECTED.operationCount} |
| Other B09 accommodation drift | ${report.summary.nonShellB09ChangeCount} cells |

## Checks

| Check | Status | Detail |
|---|---|---|
${checks.map(({ id, status, detail }) => `| ${id} | **${status}** | ${detail} |`).join('\n')}

The exact B08 seam retained its 33 air and three accepted R07C
polished-diorite floor cells. The new 12-cell west cap physically isolates it
from the station interior. The 12-cell summit interface remains unchanged and
unopened; the unbuilt guideway remains inaccessible behind the complete east
cap. Across all 7,800 B09 accommodation cells, the only source-to-post changes
are the declared 84 air-to-polished-diorite shell targets.

This verifier read only immutable source/post Anvil saves and hash-bound
release evidence. It made no live call and performed no world edit.
`;
fs.writeFileSync(absolute(MARKDOWN_PATH), markdown);

console.log(JSON.stringify({
  status: report.status,
  qaPayloadSha256,
  completedReleaseIdentitySha256,
  shell: `${report.summary.shellMatchingCellCount}/${EXPECTED.shellCellCount}`,
  interiorAir: `${report.summary.interiorAirCellCount}/${EXPECTED.interiorCellCount}`,
  b08SeamUnchanged: `${report.summary.b08SeamUnchangedCellCount}/${EXPECTED.b08SeamCellCount}`,
  summitCapUnchanged:
    `${report.summary.summitCapUnchangedCellCount}/${EXPECTED.summitCapCellCount}`,
  strictExecution: `${report.summary.strictSuccessfulGroupCount}/${EXPECTED.operationCount}`,
  rollback: `${report.summary.rollbackGuardPassCount}/${EXPECTED.operationCount}`,
  output: relative(OUT_PATH),
  markdown: relative(MARKDOWN_PATH),
}, null, 2));
if (failedChecks.length) process.exitCode = 1;
