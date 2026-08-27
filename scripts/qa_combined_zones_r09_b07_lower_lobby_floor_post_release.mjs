#!/usr/bin/env node
/**
 * Read-only post-release QA for CZ-R09A P1-B07 lower-lobby floor.
 *
 * The verifier binds the terminal scoped-release ledger, manifest, complete
 * source/post saves, exact operation pair, strict execution report, journal,
 * and rollback post-state preflight. It then reads the immutable Anvil saves
 * to prove the 63 floor states, stable unchanged support, two-block headroom,
 * connected lobby surface, and clear continuation into the lower shaft.
 *
 * No live service is contacted and no world state is mutated.
 */

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

const GENERATED_AT = value('--generated-at', '2026-08-21T16:50:00Z');
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r09a-live-20260821T163535Z',
);
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r09-b07-lower-lobby-floor.release-manifest.json',
);
const POST_ROOT = value(
  '--post-root',
  'data/worldsnap-combined-zones-r09a-post-20260821T163535Z',
);
const POST_INTAKE_PATH = value(
  '--post-intake',
  path.join(EVIDENCE_DIR, 'post-complete-save-intake.json'),
);
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r09a-post-release-qa.json'));
const MARKDOWN_PATH = value(
  '--markdown',
  path.join(EVIDENCE_DIR, 'r09a-post-release-qa.md'),
);
const PACKAGE_KEY = 'b07-lower-lobby-floor';
const AIR_STATE = 'minecraft:air';
const PRIMARY_STATE = 'minecraft:polished_andesite';
const SECONDARY_STATE = 'minecraft:polished_diorite';

const EXPECTED = Object.freeze({
  manifestIdentity:
    'fc0fc7c512a7c8aab7276322958a3a2d6860acdf9a2c8447f112dde4bc959df6',
  manifestFileSha256:
    'feb13cf67655b59fb810316d0b7f47d32bca5f93512ee24eb03d80251c70c47a',
  transactionId: 'combined-zones-r09-b07-lower-lobby-floor',
  releaseNodeId: 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT',
  floorCellCount: 63,
  floorSha256:
    '1d6d17740ee4df2253b3d2825456097cdadae5d108142d84174b03a38c9a82cd',
  primaryCellCount: 36,
  secondaryCellCount: 27,
  supportCellCount: 63,
  supportSha256:
    '80078ac75c01dbeaa857ed8300d32d8a7a2a2595c76a86b66083020719233ea9',
  headroomCellCount: 126,
  headroomSha256:
    'cc35af962154402a13794dd6aca9902708d9845e7ac1287b78b90c12180e2fb8',
  shaftApproachCellCount: 343,
  shaftApproachSha256:
    '3dbc65e9abda9d8f3c6b3ca3e3830b136eb41ba1cd3da422dc289c098b823f55',
  shaftSeamCellCount: 49,
  shaftSeamSha256:
    'fd1e4f3be466313d58cba4eb7e6e484ebdccc8f7bdc54fa86eea781758f991b5',
  operationCount: 3,
});

const AIR_BLOCKS = new Set([
  'minecraft:air', 'minecraft:cave_air', 'minecraft:void_air',
]);
const STABLE_SUPPORT_STATES = new Set([
  'minecraft:deepslate[axis=y]', 'minecraft:bedrock', 'minecraft:tuff',
]);
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0],
  [0, 0, 1], [0, 0, -1],
];

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const fileBinding = (filename) => ({
  path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))),
  bytes: fs.statSync(absolute(filename)).size,
});
const samePath = (left, right) => absolute(left) === absolute(right);
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R09A post-release QA rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
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
  for (const record of records) {
    const state = record[field];
    counts.set(state, (counts.get(state) ?? 0) + 1);
  }
  return Object.fromEntries([...counts.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
};

function parseOperations(filename) {
  const operations = [];
  const cells = new Map();
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains a malformed operation`);
    const coordinates = fields.slice(1, 7).map(Number);
    invariant(coordinates.every(Number.isSafeInteger),
      `${filename} contains an invalid coordinate`);
    const [x1, y1, z1, x2, y2, z2] = coordinates;
    const operation = {
      from: { x: x1, y: y1, z: z1 },
      to: { x: x2, y: y2, z: z2 },
      fromState: fields[7],
      toState: fields[8],
    };
    operations.push(operation);
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) {
        for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z += 1) {
          const key = `${x},${y},${z}`;
          invariant(!cells.has(key), `${filename} repeats target ${key}`);
          cells.set(key, {
            cell: { x, y, z },
            fromState: fields[7],
            toState: fields[8],
          });
        }
      }
    }
  }
  return { operations, cells };
}

function operationBodySha256(filename) {
  const body = `${fs.readFileSync(absolute(filename), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .join('\n')}\n`;
  return sha256(body);
}

function connectedComponents(cells) {
  const remaining = new Set(cells.map(cellKey));
  const components = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const stack = [first];
    const component = [];
    while (stack.length) {
      const key = stack.pop();
      const [x, y, z] = key.split(',').map(Number);
      component.push({ x, y, z });
      for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
        const neighbour = `${x + dx},${y + dy},${z + dz}`;
        if (remaining.delete(neighbour)) stack.push(neighbour);
      }
    }
    components.push(uniqueCells(component));
  }
  components.sort((left, right) => right.length - left.length);
  return components;
}

function executionEvidence(filename, expectedFileSha256) {
  const report = readJson(filename);
  const journalBinding = fileBinding(report.streamJournal);
  const passed = report.schemaVersion === 3
    && report.status === 'complete'
    && report.dryRun === false
    && report.strictNoop === true
    && report.operationRole === 'forward'
    && report.operationSha256 === expectedFileSha256
    && report.sourceOperationCount === EXPECTED.operationCount
    && report.sourceGroupCount === EXPECTED.operationCount
    && report.successfulGroups === EXPECTED.operationCount
    && report.failedGroups === 0
    && report.successfulCommands === EXPECTED.operationCount
    && report.failedCommands === 0
    && report.noopCommands === 0
    && report.unexpectedNoopCommands === 0
    && report.unknownReplyCommands === 0
    && report.worldEditLeftoverCount === 0
    && report.streamJournalSha256 === journalBinding.sha256
    && report.forceLoadAudit?.allTemporaryReleased === true
    && report.forceLoadAudit?.finalSetMatchesPreExistingSet === true;
  return {
    ...fileBinding(filename),
    status: report.status,
    strictNoop: report.strictNoop,
    successfulGroups: report.successfulGroups,
    failedGroups: report.failedGroups,
    successfulCommands: report.successfulCommands,
    failedCommands: report.failedCommands,
    noopCommands: report.noopCommands,
    worldEditLeftoverCount: report.worldEditLeftoverCount,
    streamJournal: journalBinding,
    allTemporaryChunksReleased: report.forceLoadAudit?.allTemporaryReleased ?? false,
    forceLoadSetRestored: report.forceLoadAudit?.finalSetMatchesPreExistingSet ?? false,
    passed,
  };
}

function rollbackEvidence(filename, expectedFileSha256, postRegionSha256) {
  const report = readJson(filename);
  const passed = report.status === 'PASS'
    && report.opsSha256 === expectedFileSha256
    && report.operationCount === EXPECTED.operationCount
    && report.passed === EXPECTED.operationCount
    && report.failed === 0
    && report.regionsSnapshot?.sha256 === postRegionSha256;
  return {
    ...fileBinding(filename),
    status: report.status,
    operationSha256: report.opsSha256,
    passedGuards: report.passed,
    failedGuards: report.failed,
    regionSnapshotSha256: report.regionsSnapshot?.sha256 ?? null,
    passed,
  };
}

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
const postIntake = readJson(POST_INTAKE_PATH);
const ledgerBinding = fileBinding(LEDGER_PATH);
const manifestBinding = fileBinding(MANIFEST_PATH);
const postIntakeBinding = fileBinding(POST_INTAKE_PATH);

invariant(ledger.schemaVersion === 1
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.mode === 'EXECUTE',
'execution ledger is not terminally accepted');
invariant(ledger.transactionId === EXPECTED.transactionId
  && ledger.transactionId === manifest.transactionId
  && ledger.releaseNodeId === EXPECTED.releaseNodeId
  && ledger.releaseNodeId === manifest.releaseNodeId,
'execution ledger scope does not match R09A');
invariant(samePath(ledger.manifest.path, MANIFEST_PATH)
  && ledger.manifest.sha256 === manifestBinding.sha256
  && ledger.manifest.bytes === manifestBinding.bytes
  && manifestBinding.sha256 === EXPECTED.manifestFileSha256,
'ledger release-manifest binding drifted');
const manifestPayload = { ...manifest };
delete manifestPayload.manifestIdentity;
invariant(manifest.manifestIdentity === sha256(JSON.stringify(manifestPayload))
  && manifest.manifestIdentity === EXPECTED.manifestIdentity,
'release-manifest payload identity drifted');
invariant(samePath(ledger.postSnapshot.root, POST_ROOT)
  && samePath(ledger.postSnapshot.completeSaveIntake.path, POST_INTAKE_PATH)
  && ledger.postSnapshot.completeSaveIntake.sha256 === postIntakeBinding.sha256
  && ledger.postSnapshot.completeSaveIntake.bytes === postIntakeBinding.bytes,
'ledger post-snapshot/intake binding drifted');
invariant(postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.summary?.passed === true
  && samePath(postIntake.input?.suppliedWorldRoot, POST_ROOT)
  && postIntake.packageIdentity?.completeSaveSha256
    === ledger.postSnapshot.completeSaveSha256,
'post complete-save intake is not the ledger-bound PASS save');

const postIdentityPath = ledger.postSnapshot.identity.path;
const postIdentityBinding = fileBinding(postIdentityPath);
const postIdentity = readJson(postIdentityPath);
invariant(ledger.postSnapshot.identity.sha256 === postIdentityBinding.sha256
  && ledger.postSnapshot.identity.bytes === postIdentityBinding.bytes
  && samePath(postIdentity.directory, path.join(POST_ROOT, 'region')),
'post region identity binding drifted');
invariant(fs.existsSync(absolute(path.join(POST_ROOT, 'region'))),
'post snapshot region directory is missing');

const sourceIntakePath = ledger.sourceSnapshot.completeSaveIntake.path;
const sourceIntakeBinding = fileBinding(sourceIntakePath);
const sourceIntake = readJson(sourceIntakePath);
invariant(ledger.sourceSnapshot.completeSaveIntake.sha256 === sourceIntakeBinding.sha256
  && ledger.sourceSnapshot.completeSaveIntake.bytes === sourceIntakeBinding.bytes
  && sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && sourceIntake.packageIdentity?.completeSaveSha256
    === ledger.sourceSnapshot.completeSaveSha256,
'ledger source complete-save intake binding drifted');
invariant(fs.existsSync(absolute(path.join(ledger.sourceSnapshot.root, 'region'))),
'source snapshot region directory is missing');

const evidenceBindingFailures = [];
for (const binding of ledger.evidenceBindings ?? []) {
  const current = fileBinding(binding.path);
  if (current.sha256 !== binding.sha256 || current.bytes !== binding.bytes) {
    evidenceBindingFailures.push({ expected: binding, observed: current });
  }
}
invariant(evidenceBindingFailures.length === 0,
'one or more terminal evidence bindings drifted');

const sourceIdentity = readJson(ledger.sourceSnapshot.identity.path);
const recomputedSourceBoundReleaseIdentity = sha256(JSON.stringify({
  executionBindingSha256: ledger.executionBindingSha256,
  sourceCompleteSaveSha256: sourceIntake.packageIdentity.completeSaveSha256,
  sourceRegionSha256: sourceIdentity.sha256,
}));
invariant(ledger.sourceBoundReleaseIdentitySha256
  === recomputedSourceBoundReleaseIdentity,
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
invariant(ledger.completedReleaseIdentitySha256
  === recomputedCompletedReleaseIdentity,
'completed release identity drifted');

const packageDefinition = manifest.packages.find(({ key }) => key === PACKAGE_KEY);
const ledgerPackage = ledger.packages.find(({ key }) => key === PACKAGE_KEY);
invariant(packageDefinition && ledgerPackage, 'R09A package binding is missing');
const forwardBinding = fileBinding(packageDefinition.forward);
const rollbackBinding = fileBinding(packageDefinition.rollback);
invariant(ledgerPackage.forward.sha256 === forwardBinding.sha256
  && ledgerPackage.forward.bytes === forwardBinding.bytes
  && ledgerPackage.rollback.sha256 === rollbackBinding.sha256
  && ledgerPackage.rollback.bytes === rollbackBinding.bytes,
'operation-file ledger binding drifted');

const forward = parseOperations(packageDefinition.forward);
const rollback = parseOperations(packageDefinition.rollback);
invariant(forward.operations.length === EXPECTED.operationCount
  && rollback.operations.length === EXPECTED.operationCount
  && forward.cells.size === EXPECTED.floorCellCount
  && rollback.cells.size === EXPECTED.floorCellCount,
'operation group or expanded target count drifted');
for (const [key, transition] of forward.cells) {
  const inverse = rollback.cells.get(key);
  invariant(inverse
    && inverse.fromState === transition.toState
    && inverse.toState === transition.fromState,
  `rollback is not the exact inverse at ${key}`);
}
invariant(operationBodySha256(packageDefinition.forward)
  === manifest.operations[PACKAGE_KEY].forwardSha256
  && operationBodySha256(packageDefinition.rollback)
    === manifest.operations[PACKAGE_KEY].rollbackSha256,
'operation body identity drifted');

const floor = cellsIn({
  minX: 2103, maxX: 2111,
  minY: -59, maxY: -59,
  minZ: -431, maxZ: -425,
});
const support = cellsIn({
  minX: 2103, maxX: 2111,
  minY: -60, maxY: -60,
  minZ: -431, maxZ: -425,
});
const headroom = cellsIn({
  minX: 2103, maxX: 2111,
  minY: -58, maxY: -57,
  minZ: -431, maxZ: -425,
});
const shaftApproach = cellsIn({
  minX: 2103, maxX: 2109,
  minY: -58, maxY: -52,
  minZ: -431, maxZ: -425,
});
const shaftSeam = cellsIn({
  minX: 2103, maxX: 2109,
  minY: -52, maxY: -52,
  minZ: -431, maxZ: -425,
});
const floorIdentity = classManifest(floor);
const supportIdentity = classManifest(support);
const headroomIdentity = classManifest(headroom);
const shaftApproachIdentity = classManifest(shaftApproach);
const shaftSeamIdentity = classManifest(shaftSeam);
invariant(floorIdentity.cellCount === EXPECTED.floorCellCount
  && floorIdentity.coordinateSetSha256 === EXPECTED.floorSha256
  && supportIdentity.cellCount === EXPECTED.supportCellCount
  && supportIdentity.coordinateSetSha256 === EXPECTED.supportSha256
  && headroomIdentity.cellCount === EXPECTED.headroomCellCount
  && headroomIdentity.coordinateSetSha256 === EXPECTED.headroomSha256
  && shaftApproachIdentity.cellCount === EXPECTED.shaftApproachCellCount
  && shaftApproachIdentity.coordinateSetSha256 === EXPECTED.shaftApproachSha256
  && shaftSeamIdentity.cellCount === EXPECTED.shaftSeamCellCount
  && shaftSeamIdentity.coordinateSetSha256 === EXPECTED.shaftSeamSha256,
'R09A QA geometry identity drifted');
invariant(hashCells([...forward.cells.values()].map(({ cell }) => cell))
  === floorIdentity.coordinateSetSha256,
'guarded operation targets do not exactly equal the lobby floor');

const sourceReader = new AnvilReader(
  absolute(path.join(ledger.sourceSnapshot.root, 'region')),
);
const postReader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
const sourceTransitionMismatches = [];
const postStateRecords = [];
const postStateMismatches = [];
for (const [key, transition] of forward.cells) {
  const sourceState = stateToCommandString(await sourceReader.blockState(
    transition.cell.x, transition.cell.y, transition.cell.z,
  ));
  if (sourceState !== transition.fromState) {
    sourceTransitionMismatches.push({ cell: transition.cell, expected: transition.fromState, observed: sourceState });
  }
  const postState = stateToCommandString(await postReader.blockState(
    transition.cell.x, transition.cell.y, transition.cell.z,
  ));
  postStateRecords.push({ cell: transition.cell, state: postState });
  if (postState !== transition.toState) {
    postStateMismatches.push({ key, cell: transition.cell, expected: transition.toState, observed: postState });
  }
}

const supportRecords = [];
const supportMismatches = [];
for (const cell of support) {
  const sourceState = stateToCommandString(await sourceReader.blockState(cell.x, cell.y, cell.z));
  const postState = stateToCommandString(await postReader.blockState(cell.x, cell.y, cell.z));
  const stable = STABLE_SUPPORT_STATES.has(postState);
  supportRecords.push({ cell, state: postState, sourceState, stable });
  if (!stable || postState !== sourceState) {
    supportMismatches.push({ cell, sourceState, postState, stable });
  }
}

async function airRecords(cells) {
  const records = [];
  const mismatches = [];
  for (const cell of cells) {
    const state = stateToCommandString(await postReader.blockState(cell.x, cell.y, cell.z));
    records.push({ cell, state });
    if (!AIR_BLOCKS.has(blockName(state))) mismatches.push({ cell, state });
  }
  return { records, mismatches };
}

const headroomResult = await airRecords(headroom);
const shaftApproachResult = await airRecords(shaftApproach);
const shaftSeamResult = await airRecords(shaftSeam);
const floorComponents = connectedComponents(floor);
const floorKeys = new Set(floor.map(cellKey));
const shaftAccessFloorCells = floor.filter(({ x }) => x <= 2109);
const everyFloorCellHasHeadroom = floor.every(({ x, y, z }) => (
  headroomResult.records.some((record) => (
    record.cell.x === x && record.cell.y === y + 1 && record.cell.z === z
      && AIR_BLOCKS.has(blockName(record.state))
  ))
  && headroomResult.records.some((record) => (
    record.cell.x === x && record.cell.y === y + 2 && record.cell.z === z
      && AIR_BLOCKS.has(blockName(record.state))
  ))
));
invariant(floorKeys.size === floor.length, 'floor contains duplicate cells');

const execution = executionEvidence(
  path.join(EVIDENCE_DIR, `${PACKAGE_KEY}.forward-execution.json`),
  ledgerPackage.forward.sha256,
);
const rollbackPoststate = rollbackEvidence(
  path.join(EVIDENCE_DIR, `${PACKAGE_KEY}.rollback-poststate-preflight.json`),
  ledgerPackage.rollback.sha256,
  postIdentity.sha256,
);
const allLedgerStagesPass = ledger.stages.length > 0
  && ledger.stages.every(({ status }) => status === 'PASS');

const checks = [];
const check = (id, passed, detail) => checks.push({
  id,
  status: passed ? 'PASS' : 'FAIL',
  detail,
});
check('R09A-QA-01-LEDGER-TERMINAL',
  ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE' && allLedgerStagesPass,
  `${ledger.stages.filter(({ status }) => status === 'PASS').length}/${ledger.stages.length} ledger stages PASS.`);
check('R09A-QA-02-RELEASE-IDENTITY-BOUND',
  ledger.completedReleaseIdentitySha256 === recomputedCompletedReleaseIdentity
    && ledger.sourceBoundReleaseIdentitySha256 === recomputedSourceBoundReleaseIdentity,
  `Completed release identity ${ledger.completedReleaseIdentitySha256}.`);
check('R09A-QA-03-MANIFEST-AND-EVIDENCE-SEALED',
  manifest.manifestIdentity === EXPECTED.manifestIdentity
    && evidenceBindingFailures.length === 0,
  `Manifest ${manifest.manifestIdentity}; ${ledger.evidenceBindings.length} terminal evidence bindings intact.`);
check('R09A-QA-04-COMPLETE-SAVES-BOUND',
  sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
    && postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
  `Source ${ledger.sourceSnapshot.completeSaveSha256}; post ${ledger.postSnapshot.completeSaveSha256}.`);
check('R09A-QA-05-EXACT-OPERATION-AND-INVERSE',
  forward.cells.size === EXPECTED.floorCellCount
    && rollback.cells.size === EXPECTED.floorCellCount,
  `${forward.cells.size} exact forward targets and ${rollback.cells.size} inverse targets.`);
check('R09A-QA-06-EXACT-SOURCE-GUARDS',
  sourceTransitionMismatches.length === 0,
  `${EXPECTED.floorCellCount - sourceTransitionMismatches.length}/${EXPECTED.floorCellCount} source cells match exact air guards.`);
check('R09A-QA-07-EXACT-FLOOR-POST-STATES',
  postStateMismatches.length === 0
    && postStateRecords.length === EXPECTED.floorCellCount,
  `${postStateRecords.length - postStateMismatches.length}/${postStateRecords.length} exact authored floor states.`);
check('R09A-QA-08-STABLE-UNCHANGED-SUPPORT',
  supportMismatches.length === 0
    && supportRecords.length === EXPECTED.supportCellCount,
  `${supportRecords.length - supportMismatches.length}/${supportRecords.length} stable unchanged foundation contacts.`);
check('R09A-QA-09-TWO-BLOCK-HEADROOM',
  headroomResult.mismatches.length === 0 && everyFloorCellHasHeadroom,
  `${headroomResult.records.length - headroomResult.mismatches.length}/${EXPECTED.headroomCellCount} headroom cells air.`);
check('R09A-QA-10-LOBBY-ROUTE-USABLE',
  floorComponents.length === 1
    && floorComponents[0].length === EXPECTED.floorCellCount
    && shaftApproachResult.mismatches.length === 0
    && shaftSeamResult.mismatches.length === 0
    && shaftAccessFloorCells.length === EXPECTED.shaftSeamCellCount,
  `One connected 63-cell floor; ${EXPECTED.shaftApproachCellCount}/${EXPECTED.shaftApproachCellCount} approach and ${EXPECTED.shaftSeamCellCount}/${EXPECTED.shaftSeamCellCount} shaft-seam cells air.`);
check('R09A-QA-11-STRICT-EXECUTION',
  execution.passed,
  `${execution.successfulGroups}/${EXPECTED.operationCount} strict groups succeeded; ${execution.noopCommands} no-op.`);
check('R09A-QA-12-ROLLBACK-POSTSTATE',
  rollbackPoststate.passed,
  `${rollbackPoststate.passedGuards}/${EXPECTED.operationCount} rollback guards PASS.`);

const failedChecks = checks.filter(({ status }) => status !== 'PASS');
const qaPayload = {
  schemaVersion: 1,
  id: 'combined-zones-r09a-b07-lower-lobby-floor-post-release-qa',
  generatedAtUtc: GENERATED_AT,
  status: failedChecks.length === 0
    ? 'PASS_R09A_B07_LOWER_LOBBY_FLOOR_POST_RELEASE_ACCEPTED'
    : 'FAIL_R09A_B07_LOWER_LOBBY_FLOOR_POST_RELEASE',
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
    sourceCompleteSave: {
      root: ledger.sourceSnapshot.root,
      completeSaveSha256: ledger.sourceSnapshot.completeSaveSha256,
      regionSnapshotSha256: sourceIdentity.sha256,
      intake: sourceIntakeBinding,
      regionIdentity: fileBinding(ledger.sourceSnapshot.identity.path),
    },
    postCompleteSave: {
      root: ledger.postSnapshot.root,
      completeSaveSha256: ledger.postSnapshot.completeSaveSha256,
      regionSnapshotSha256: postIdentity.sha256,
      intake: postIntakeBinding,
      regionIdentity: postIdentityBinding,
    },
    terminalEvidenceBindingCount: ledger.evidenceBindings.length,
    terminalEvidenceBindingFailureCount: evidenceBindingFailures.length,
  },
  executionEvidence: {
    package: execution,
    rollbackPoststatePreflight: rollbackPoststate,
    strictSuccessfulGroupCount: execution.successfulGroups,
    strictFailedGroupCount: execution.failedGroups,
    strictNoopCount: execution.noopCommands,
  },
  geometry: {
    floor: floorIdentity,
    primaryFinish: classManifest(postStateRecords
      .filter(({ state }) => state === PRIMARY_STATE).map(({ cell }) => cell)),
    secondaryAisle: classManifest(postStateRecords
      .filter(({ state }) => state === SECONDARY_STATE).map(({ cell }) => cell)),
    support: supportIdentity,
    headroom: headroomIdentity,
    shaftApproach: shaftApproachIdentity,
    shaftSeam: shaftSeamIdentity,
    floorConnectivity: {
      componentCount: floorComponents.length,
      largestComponentCellCount: floorComponents[0]?.length ?? 0,
      everyCellHasTwoBlockHeadroom: everyFloorCellHasHeadroom,
      shaftAccessFloorCellCount: shaftAccessFloorCells.length,
    },
  },
  stateTransition: {
    sourceStateCensus: stateCensus([...forward.cells.values()], 'fromState'),
    sourceMatchingCellCount: EXPECTED.floorCellCount - sourceTransitionMismatches.length,
    sourceMismatchCellCount: sourceTransitionMismatches.length,
    listedSourceMismatches: sourceTransitionMismatches,
    postStateCensus: stateCensus(postStateRecords),
    postMatchingCellCount: postStateRecords.length - postStateMismatches.length,
    postMismatchCellCount: postStateMismatches.length,
    listedPostMismatches: postStateMismatches,
    rollbackExactInverse: true,
  },
  support: {
    sourceStateCensus: stateCensus(supportRecords, 'sourceState'),
    postStateCensus: stateCensus(supportRecords),
    stableMatchingCellCount: supportRecords.length - supportMismatches.length,
    mismatchCellCount: supportMismatches.length,
    listedMismatches: supportMismatches,
  },
  clearanceAndRoute: {
    headroomStateCensus: stateCensus(headroomResult.records),
    headroomAirCellCount: headroomResult.records.length - headroomResult.mismatches.length,
    headroomMismatchCount: headroomResult.mismatches.length,
    shaftApproachStateCensus: stateCensus(shaftApproachResult.records),
    shaftApproachAirCellCount:
      shaftApproachResult.records.length - shaftApproachResult.mismatches.length,
    shaftApproachMismatchCount: shaftApproachResult.mismatches.length,
    shaftSeamStateCensus: stateCensus(shaftSeamResult.records),
    shaftSeamAirCellCount: shaftSeamResult.records.length - shaftSeamResult.mismatches.length,
    shaftSeamMismatchCount: shaftSeamResult.mismatches.length,
    lobbyUsable: floorComponents.length === 1
      && everyFloorCellHasHeadroom
      && shaftApproachResult.mismatches.length === 0
      && shaftSeamResult.mismatches.length === 0,
  },
  checks,
  summary: {
    passed: failedChecks.length === 0,
    checkCount: checks.length,
    passCount: checks.length - failedChecks.length,
    failCount: failedChecks.length,
    exactFloorStateCellCount: postStateRecords.length - postStateMismatches.length,
    polishedAndesiteCellCount: postStateRecords
      .filter(({ state }) => state === PRIMARY_STATE).length,
    polishedDioriteCellCount: postStateRecords
      .filter(({ state }) => state === SECONDARY_STATE).length,
    stableSupportCellCount: supportRecords.length - supportMismatches.length,
    headroomAirCellCount: headroomResult.records.length - headroomResult.mismatches.length,
    shaftApproachAirCellCount:
      shaftApproachResult.records.length - shaftApproachResult.mismatches.length,
    shaftSeamAirCellCount: shaftSeamResult.records.length - shaftSeamResult.mismatches.length,
    lobbyUsable: floorComponents.length === 1
      && everyFloorCellHasHeadroom
      && shaftApproachResult.mismatches.length === 0
      && shaftSeamResult.mismatches.length === 0,
    rollbackGuardCount: rollbackPoststate.passedGuards,
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

const markdown = `# CZ-R09A B07 lower-lobby floor post-release QA

**Status:** ${report.status}  
**QA payload identity:** \`${qaPayloadSha256}\`  
**Completed release identity:** \`${ledger.completedReleaseIdentitySha256}\`  
**Ledger:** \`${ledgerBinding.sha256}\`  
**Post complete save:** \`${ledger.postSnapshot.completeSaveSha256}\`

## Result

| Test | Result |
|---|---:|
| Exact floor state | ${report.summary.exactFloorStateCellCount} / ${EXPECTED.floorCellCount} |
| Material census | ${report.summary.polishedAndesiteCellCount} polished andesite + ${report.summary.polishedDioriteCellCount} polished diorite |
| Stable unchanged support | ${report.summary.stableSupportCellCount} / ${EXPECTED.supportCellCount} |
| Two-block headroom | ${report.summary.headroomAirCellCount} / ${EXPECTED.headroomCellCount} air |
| Shaft approach | ${report.summary.shaftApproachAirCellCount} / ${EXPECTED.shaftApproachCellCount} air |
| Shaft seam | ${report.summary.shaftSeamAirCellCount} / ${EXPECTED.shaftSeamCellCount} air |
| Lobby route usable | ${report.summary.lobbyUsable ? 'YES' : 'NO'} |
| Strict execution | ${execution.successfulGroups} succeeded / ${execution.failedGroups} failed / ${execution.noopCommands} no-op |
| Rollback post-state | ${rollbackPoststate.passedGuards} / ${EXPECTED.operationCount} guards PASS |

## Checks

| Check | Status | Detail |
|---|---|---|
${checks.map(({ id, status, detail }) => `| ${id} | **${status}** | ${detail} |`).join('\n')}

This verifier read only the sealed source/post Anvil saves and hash-bound
evidence. It made no live call and performed no world edit.
`;
fs.writeFileSync(absolute(MARKDOWN_PATH), markdown);

console.log(JSON.stringify({
  status: report.status,
  qaPayloadSha256,
  completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
  exactFloorStates: `${report.summary.exactFloorStateCellCount}/${EXPECTED.floorCellCount}`,
  stableSupport: `${report.summary.stableSupportCellCount}/${EXPECTED.supportCellCount}`,
  headroomAir: `${report.summary.headroomAirCellCount}/${EXPECTED.headroomCellCount}`,
  shaftApproachAir:
    `${report.summary.shaftApproachAirCellCount}/${EXPECTED.shaftApproachCellCount}`,
  lobbyUsable: report.summary.lobbyUsable,
  rollbackGuards: `${rollbackPoststate.passedGuards}/${EXPECTED.operationCount}`,
  output: relative(OUT_PATH),
  markdown: relative(MARKDOWN_PATH),
}, null, 2));
if (failedChecks.length) process.exitCode = 1;
