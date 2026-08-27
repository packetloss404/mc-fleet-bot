#!/usr/bin/env node
/**
 * Read-only post-release QA/seal for the CZ-R08 north-galleria retail shells.
 * No live call, RCON command, service mutation, or world edit is performed.
 */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  boundsOf,
  cellKey,
  cellsIn,
  hashCells,
  rawCoordinateHash,
  sha256,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-21T18:08:00Z');
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r08n-live-20260821T180151Z',
);
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r08-north-galleria-capped-retail-shells.release-manifest.json',
);
const POST_ROOT = value(
  '--post-root',
  'data/worldsnap-combined-zones-r08n-post-20260821T180151Z',
);
const POST_INTAKE_PATH = value(
  '--post-intake',
  path.join(EVIDENCE_DIR, 'post-complete-save-intake.json'),
);
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r08n-post-release-qa.json'));
const MARKDOWN_PATH = value(
  '--markdown',
  path.join(EVIDENCE_DIR, 'r08n-post-release-qa.md'),
);

const BASENAME = 'combined-zones-r08-north-galleria-capped-retail-shells';
const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const OWNER = 'Z02-U1-CONCOURSE-MALL';
const DESIGN_PATH = 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json';
const SHELL_IDS = [
  'EE-R-N01', 'EE-R-N02', 'EE-R-N03', 'EE-R-N04', 'EE-R-N05',
  'EE-R-N08', 'EE-R-N10', 'EE-R-N11', 'EE-R-N12',
];
const EXPECTED = Object.freeze({
  manifestIdentity: '67c8cc3edbb6b534932e9169b5f2126e74ba2405ae7ead635f88e2ef90d19778',
  manifestFile: 'a3aa07124982d48dab0463f68f9c02df4ef7a1b30c14b81c6474ec25f52d11b0',
  ledgerFile: 'f65dcb8181519a505bf608bb2b08fcda41741f484a2774eb60540cc8e2dd7dfb',
  sourceSave: '379c8c52b9629f3ae7c3aeb22796051ae7ba8ff01983790692475926d36a912b',
  postSave: '083a2ba58d70dfdae65b16c20b8b19c785bc7bb897fe39e054f1f8e06b37ac8c',
  sourceRegion: '9286b06baf3cb2135c2daf13bf119a1928f08c12f67cee3c1ff300cbcc5f5356',
  postRegion: '6634800dff0fbcd11a7aadd0e4c90804c9d098e6ef9f8b2660e7d29d9b76cd7e',
  sourceBoundRelease: '8228770db729a6ad9697e4f5ea377a3e4c5b6721462834be9ab75bbdcdb83bd6',
  executionBinding: '65705b7cd348f8dadce1a3abf4a776b169f220951b85c4fe91d2816a4e569edd',
  completedRelease: '3b223d0482b9acabea43b864b41a9a72ddc285766dcbffe12e69d52ac142c70a',
  stageCount: 73,
  evidenceBindingCount: 81,
  fullCount: 3_888,
  fullHash: '0d303b5f35a5d52c51139395b1463d77f4953cdd091393b69a49438869d49a46',
  operatedCount: 3_878,
  operatedHash: '167ba260735dd809e64fc2f8eef7760dc91e29145e55ccbb88cbd150297a3ab9',
  boundaryCount: 2_628,
  boundaryHash: '0ffd71f9dd6fa39c4e0440c27758bb6d561a0b542249ed7465665c6f762a9dd4',
  interiorCount: 1_260,
  interiorHash: 'b412268b3bb00a9e6302f9efb2e069768935f47a7bbe0b4ce05985652ed32b07',
  entranceCount: 108,
  entranceHash: 'b02e6adf80095fd998871a17c4b8da08ff3a5c968157eabedeecc8aaddd7fb3e',
  haloCount: 4_428,
  haloHash: 'cb139fe2a9e017bf5666c78b733234e9fc1626e3366bd8f39066fe11bfc4d4fa',
  floorContactCount: 972,
  floorContactHash: '9354f16cea4ce9017b83a091cc5882c4d6e02b18764da64e8e1c3e09d44cbe0c',
});
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
]);
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
  if (!condition) throw new Error(`R08N post-release QA rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const isAir = (state) => AIR.has(blockName(state));
const isFluid = (state) => ['minecraft:water', 'minecraft:lava'].includes(blockName(state))
  || state.includes('waterlogged=true');
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

function operationBody(filename) {
  return `${fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
}

function parsePointOperations(filename) {
  const operations = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains a malformed operation`);
    const coordinates = fields.slice(1, 7).map(Number);
    invariant(coordinates.every(Number.isSafeInteger)
      && coordinates[0] === coordinates[3]
      && coordinates[1] === coordinates[4]
      && coordinates[2] === coordinates[5],
    `${filename} contains a non-point operation`);
    operations.push({
      cell: { x: coordinates[0], y: coordinates[1], z: coordinates[2] },
      fromState: fields[7],
      toState: fields[8],
    });
  }
  return operations;
}

function connectedComponents(cells) {
  const remaining = new Set(uniqueCells(cells).map(cellKey));
  const sizes = [];
  while (remaining.size > 0) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const stack = [first];
    let size = 0;
    while (stack.length > 0) {
      const [x, y, z] = stack.pop().split(',').map(Number);
      size += 1;
      for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
        const key = `${x + dx},${y + dy},${z + dz}`;
        if (!remaining.delete(key)) continue;
        stack.push(key);
      }
    }
    sizes.push(size);
  }
  sizes.sort((left, right) => right - left);
  return {
    componentCount: sizes.length,
    largestComponentCellCount: sizes[0] ?? 0,
    componentSizes: sizes,
  };
}

function stateCensus(records) {
  const census = new Map();
  for (const { state } of records) census.set(state, (census.get(state) ?? 0) + 1);
  return Object.fromEntries([...census.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
}

async function stateRecords(reader, cells) {
  const records = [];
  for (const cell of cells) records.push({
    cell,
    state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)),
  });
  return records;
}

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
const design = readJson(DESIGN_PATH);
const postIntake = readJson(POST_INTAKE_PATH);
const ledgerBinding = fileBinding(LEDGER_PATH);
const manifestBinding = fileBinding(MANIFEST_PATH);

invariant(ledger.schemaVersion === 1
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.mode === 'EXECUTE'
  && ledger.transactionId === BASENAME
  && ledger.releaseNodeId === RELEASE_NODE_ID,
'execution ledger is not the terminal accepted R08N release');
invariant(manifest.transactionId === BASENAME
  && manifest.releaseNodeId === RELEASE_NODE_ID
  && manifest.scope?.canonicalOwner === OWNER
  && JSON.stringify(manifest.scope?.shellIds) === JSON.stringify(SHELL_IDS),
'manifest scope or owner drifted');
invariant(ledgerBinding.sha256 === EXPECTED.ledgerFile
  && manifestBinding.sha256 === EXPECTED.manifestFile
  && samePath(ledger.manifest.path, MANIFEST_PATH)
  && ledger.manifest.sha256 === manifestBinding.sha256
  && ledger.manifest.bytes === manifestBinding.bytes,
'ledger or manifest full-file binding drifted');
const manifestPayload = { ...manifest };
delete manifestPayload.manifestIdentity;
invariant(manifest.manifestIdentity === sha256(JSON.stringify(manifestPayload))
  && manifest.manifestIdentity === EXPECTED.manifestIdentity,
'manifest payload identity drifted');
invariant(ledger.sourceBoundReleaseIdentitySha256 === EXPECTED.sourceBoundRelease
  && ledger.executionBindingSha256 === EXPECTED.executionBinding
  && ledger.completedReleaseIdentitySha256 === EXPECTED.completedRelease,
'release execution/completion identity drifted');

invariant(ledger.sourceSnapshot.completeSaveSha256 === EXPECTED.sourceSave
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.postSave
  && ledger.sourceSnapshot.completeSaveSha256 !== ledger.postSnapshot.completeSaveSha256,
'source/post complete-save identity drifted');
invariant(samePath(ledger.postSnapshot.root, POST_ROOT)
  && samePath(ledger.postSnapshot.completeSaveIntake.path, POST_INTAKE_PATH)
  && ledger.postSnapshot.completeSaveIntake.sha256 === fileBinding(POST_INTAKE_PATH).sha256,
'ledger post snapshot binding drifted');
invariant(postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.summary?.passed === true
  && samePath(postIntake.input?.suppliedWorldRoot, POST_ROOT)
  && postIntake.packageIdentity?.completeSaveSha256 === EXPECTED.postSave,
'post intake is not the ledger-bound complete save');
const sourceIntake = readJson(ledger.sourceSnapshot.completeSaveIntake.path);
invariant(sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && sourceIntake.summary?.passed === true
  && sourceIntake.packageIdentity?.completeSaveSha256 === EXPECTED.sourceSave
  && ledger.sourceSnapshot.completeSaveIntake.sha256
    === fileBinding(ledger.sourceSnapshot.completeSaveIntake.path).sha256,
'source intake binding drifted');
const sourceIdentity = readJson(ledger.sourceSnapshot.identity.path);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
invariant(sourceIdentity.sha256 === EXPECTED.sourceRegion
  && postIdentity.sha256 === EXPECTED.postRegion
  && ledger.sourceSnapshot.identity.sha256 === fileBinding(ledger.sourceSnapshot.identity.path).sha256
  && ledger.postSnapshot.identity.sha256 === fileBinding(ledger.postSnapshot.identity.path).sha256,
'source/post region identity drifted');

const evidenceMismatches = [];
for (const binding of ledger.evidenceBindings) {
  const observed = fileBinding(binding.path);
  if (observed.sha256 !== binding.sha256 || observed.bytes !== binding.bytes) {
    evidenceMismatches.push({ declared: binding, observed });
  }
}
invariant(ledger.evidenceBindings.length === EXPECTED.evidenceBindingCount
  && evidenceMismatches.length === 0,
'ledger evidence binding drifted');

const forwardOrder = manifest.executionOrder.forward;
const rollbackOrder = manifest.executionOrder.rollback;
const expectedStages = [
  'standing-authorization',
  'exact-release-manifest-qa',
  'fresh-source-complete-save',
  'source-complete-save-intake',
  'source-snapshot-identity',
  ...forwardOrder.flatMap((key) => [
    `forward-source-preflight:${key}`,
    `strict-forward-parser-check:${key}`,
    `strict-rollback-parser-check:${key}`,
  ]),
  ...rollbackOrder.map((key) => `projected-rollback-preflight:${key}`),
  'block-entity-clearance',
  'live-entity-clearance',
  ...forwardOrder.flatMap((key) => [
    `same-moment-package-entity-clearance:${key}`,
    `strict-forward-execution:${key}`,
  ]),
  'fresh-post-complete-save',
  'post-complete-save-intake',
  'post-snapshot-identity',
  ...rollbackOrder.map((key) => `rollback-poststate-preflight:${key}`),
];
invariant(expectedStages.length === EXPECTED.stageCount
  && JSON.stringify(ledger.stages.map(({ stage }) => stage)) === JSON.stringify(expectedStages)
  && ledger.stages.every(({ status }) => status === 'PASS'),
'ledger stage order/status drifted');

const shellRecords = SHELL_IDS.map((id) => {
  const shell = design.d06.concourseAndRetail.retailShells.find((entry) => entry.id === id);
  invariant(shell && shell.cellCount === 432 && rawCoordinateHash(cellsIn(shell.bounds)) === shell.cellSetSha256,
    `${id} frozen geometry drifted`);
  const full = cellsIn(shell.bounds);
  const boundary = full.filter((cell) => (
    cell.x === shell.bounds.minX || cell.x === shell.bounds.maxX
    || cell.y === shell.bounds.minY || cell.y === shell.bounds.maxY
    || cell.z === shell.bounds.minZ || cell.z === shell.bounds.maxZ
  ));
  const boundaryKeys = new Set(boundary.map(cellKey));
  const interior = full.filter((cell) => !boundaryKeys.has(cellKey(cell)));
  const entrance = cellsIn({
    minX: shell.entrancePlane.minX,
    maxX: shell.entrancePlane.maxX,
    minY: shell.entrancePlane.y,
    maxY: shell.entrancePlane.y,
    minZ: shell.entrancePlane.z,
    maxZ: shell.entrancePlane.z,
  });
  const envelopeBounds = {
    minX: shell.bounds.minX - 1,
    maxX: shell.bounds.maxX + 1,
    minY: shell.bounds.minY - 1,
    maxY: shell.bounds.maxY + 1,
    minZ: shell.bounds.minZ - 1,
    maxZ: shell.bounds.maxZ + 1,
  };
  invariant(boundary.length === 292 && interior.length === 140 && entrance.length === 12,
    `${id} boundary/interior/entrance partition drifted`);
  return { id, shell, full, boundary, interior, entrance, envelopeBounds };
});
const fullUnion = uniqueCells(shellRecords.flatMap(({ full }) => full));
const boundaryUnion = uniqueCells(shellRecords.flatMap(({ boundary }) => boundary));
const interiorUnion = uniqueCells(shellRecords.flatMap(({ interior }) => interior));
const entranceUnion = uniqueCells(shellRecords.flatMap(({ entrance }) => entrance));
const fullKeys = new Set(fullUnion.map(cellKey));
const halo = uniqueCells(shellRecords.flatMap(({ envelopeBounds }) => cellsIn(envelopeBounds)))
  .filter((cell) => !fullKeys.has(cellKey(cell)));
const floorContacts = shellRecords.flatMap(({ shell }) => cellsIn({
  minX: shell.bounds.minX,
  maxX: shell.bounds.maxX,
  minY: shell.bounds.minY - 1,
  maxY: shell.bounds.minY - 1,
  minZ: shell.bounds.minZ,
  maxZ: shell.bounds.maxZ,
}));
invariant(fullUnion.length === EXPECTED.fullCount && hashCells(fullUnion) === EXPECTED.fullHash
  && boundaryUnion.length === EXPECTED.boundaryCount && hashCells(boundaryUnion) === EXPECTED.boundaryHash
  && interiorUnion.length === EXPECTED.interiorCount && hashCells(interiorUnion) === EXPECTED.interiorHash
  && entranceUnion.length === EXPECTED.entranceCount && hashCells(entranceUnion) === EXPECTED.entranceHash
  && halo.length === EXPECTED.haloCount && hashCells(halo) === EXPECTED.haloHash
  && floorContacts.length === EXPECTED.floorContactCount
  && hashCells(floorContacts) === EXPECTED.floorContactHash,
'derived release geometry identity drifted');

const operations = [];
const executionPackages = [];
const evidenceByPath = new Map(ledger.evidenceBindings.map((binding) => [relative(binding.path), binding]));
for (const [index, pkg] of manifest.packages.entries()) {
  invariant(pkg.key === forwardOrder[index] && ledger.packages[index]?.key === pkg.key,
    `package ${pkg.key} order drifted`);
  const declared = manifest.operations[pkg.key];
  const forward = parsePointOperations(pkg.forward);
  const rollback = parsePointOperations(pkg.rollback);
  const forwardBinding = fileBinding(pkg.forward);
  const rollbackBinding = fileBinding(pkg.rollback);
  invariant(sha256(operationBody(pkg.forward)) === declared.forwardSha256
    && sha256(operationBody(pkg.rollback)) === declared.rollbackSha256
    && forwardBinding.sha256 === ledger.packages[index].forward.sha256
    && rollbackBinding.sha256 === ledger.packages[index].rollback.sha256
    && forward.length === declared.forwardCommandCount
    && rollback.length === declared.rollbackCommandCount
    && JSON.stringify(rollback) === JSON.stringify(forward.slice().reverse().map((entry) => ({
      cell: entry.cell,
      fromState: entry.toState,
      toState: entry.fromState,
    }))),
  `${pkg.key} operation identity/inverse drifted`);
  operations.push(...forward.map((operation) => ({ ...operation, packageKey: pkg.key })));

  const executionPath = path.join(EVIDENCE_DIR, `${pkg.key}.forward-execution.json`);
  const execution = readJson(executionPath);
  const streamPath = `${executionPath}.stream-journal.jsonl`;
  const forwardDryRun = readJson(path.join(EVIDENCE_DIR, `${pkg.key}.forward-strict-dry-run.json`));
  const rollbackDryRun = readJson(path.join(EVIDENCE_DIR, `${pkg.key}.rollback-strict-dry-run.json`));
  const forwardPreflight = readJson(path.join(EVIDENCE_DIR, `${pkg.key}.forward-source-preflight.json`));
  const rollbackPreflightPath = path.join(EVIDENCE_DIR, `${pkg.key}.rollback-poststate-preflight.json`);
  const rollbackPreflight = readJson(rollbackPreflightPath);
  const sameMoment = readJson(path.join(EVIDENCE_DIR, `${pkg.key}.same-moment-entity-clearance.json`));
  invariant(execution.status === 'complete' && execution.dryRun === false
    && execution.strictNoop === true && execution.operationRole === 'forward'
    && execution.operationSha256 === forwardBinding.sha256
    && execution.sourceOperationCount === forward.length
    && execution.executedCommandCount === forward.length
    && execution.successfulCommands === forward.length
    && execution.successfulGroups === forward.length
    && execution.failedCommands === 0 && execution.failedGroups === 0
    && execution.noopCommands === 0 && execution.unexpectedNoopCommands === 0
    && execution.unknownReplyCommands === 0 && execution.worldEditLeftoverCount === 0
    && execution.streamJournalSha256 === fileBinding(streamPath).sha256,
  `${pkg.key} strict execution evidence failed`);
  invariant(forwardDryRun.status === 'dry_run' && forwardDryRun.strictNoop === true
    && forwardDryRun.operationRole === 'forward' && forwardDryRun.commandCount === forward.length
    && rollbackDryRun.status === 'dry_run' && rollbackDryRun.strictNoop === true
    && rollbackDryRun.operationRole === 'rollback' && rollbackDryRun.commandCount === rollback.length
    && forwardPreflight.status === 'PASS' && forwardPreflight.failed === 0
    && forwardPreflight.operationCount === forward.length
    && rollbackPreflight.status === 'PASS' && rollbackPreflight.failed === 0
    && rollbackPreflight.operationCount === rollback.length
    && rollbackPreflight.opsSha256 === rollbackBinding.sha256
    && rollbackPreflight.regionsSnapshot?.sha256 === EXPECTED.postRegion
    && sameMoment.status === 'PASS' && sameMoment.passed === true,
  `${pkg.key} parser, preflight, entity, or rollback evidence failed`);
  invariant(evidenceByPath.has(relative(executionPath))
    && evidenceByPath.has(relative(streamPath))
    && evidenceByPath.has(relative(rollbackPreflightPath)),
  `${pkg.key} execution/rollback evidence is absent from ledger bindings`);
  executionPackages.push({
    key: pkg.key,
    commandCount: forward.length,
    successfulCommands: execution.successfulCommands,
    rollbackGuardCount: rollbackPreflight.passed,
    strictNoop: execution.strictNoop,
    zeroNoops: execution.noopCommands === 0,
    execution: fileBinding(executionPath),
    streamJournal: fileBinding(streamPath),
    rollbackPoststatePreflight: fileBinding(rollbackPreflightPath),
  });
}
const operatedCells = uniqueCells(operations.map(({ cell }) => cell));
const operatedKeys = new Set(operatedCells.map(cellKey));
invariant(operations.length === EXPECTED.operatedCount
  && operatedCells.length === EXPECTED.operatedCount
  && hashCells(operatedCells) === EXPECTED.operatedHash,
'operated target union drifted');

const sourceReader = new AnvilReader(absolute(path.join(ledger.sourceSnapshot.root, 'region')));
const postReader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
const postEntityReader = new AnvilReader(absolute(path.join(POST_ROOT, 'entities')));
const sourceEnvelope = new Map();
const postEnvelope = new Map();
for (const cell of uniqueCells([...fullUnion, ...halo])) {
  sourceEnvelope.set(cellKey(cell), stateToCommandString(
    await sourceReader.blockState(cell.x, cell.y, cell.z),
  ));
  postEnvelope.set(cellKey(cell), stateToCommandString(
    await postReader.blockState(cell.x, cell.y, cell.z),
  ));
}

const operationMismatches = [];
for (const operation of operations) {
  const sourceState = sourceEnvelope.get(cellKey(operation.cell));
  const postState = postEnvelope.get(cellKey(operation.cell));
  if (sourceState !== operation.fromState || postState !== operation.toState) {
    operationMismatches.push({ ...operation, sourceState, postState });
  }
}
invariant(operationMismatches.length === 0,
'an operated target does not match its exact source/post transition');
const postTargetRecords = fullUnion.map((cell) => ({
  cell,
  state: postEnvelope.get(cellKey(cell)),
  expectedState: boundaryUnion.some((entry) => cellKey(entry) === cellKey(cell))
    ? 'minecraft:light_gray_concrete' : 'minecraft:air',
}));
const targetMismatches = postTargetRecords.filter(({ state, expectedState }) => state !== expectedState);
invariant(targetMismatches.length === 0,
'a full shell target does not match its final lining/air state');

const shellPostState = [];
for (const shell of shellRecords) {
  const boundaryRecords = shell.boundary.map((cell) => ({
    cell, state: postEnvelope.get(cellKey(cell)),
  }));
  const interiorRecords = shell.interior.map((cell) => ({
    cell, state: postEnvelope.get(cellKey(cell)),
  }));
  const entranceRecords = shell.entrance.map((cell) => ({
    cell, state: postEnvelope.get(cellKey(cell)),
  }));
  const boundaryOpeningCount = boundaryRecords.filter(
    ({ state }) => state !== 'minecraft:light_gray_concrete',
  ).length;
  invariant(boundaryOpeningCount === 0
    && interiorRecords.every(({ state }) => state === 'minecraft:air')
    && entranceRecords.every(({ state }) => state === 'minecraft:light_gray_concrete')
    && connectedComponents(shell.boundary).componentCount === 1
    && connectedComponents(shell.interior).componentCount === 1,
  `${shell.id} is not a complete closed shell around a connected air void`);
  shellPostState.push({
    id: shell.id,
    completeBoundary: {
      ...exactSet(shell.boundary),
      lightGrayConcreteCount: boundaryRecords.length,
      openingCount: boundaryOpeningCount,
      connectivity: connectedComponents(shell.boundary),
    },
    connectedInteriorVoid: {
      ...exactSet(shell.interior),
      airCount: interiorRecords.length,
      nonAirCount: 0,
      connectivity: connectedComponents(shell.interior),
    },
    closedTenantFace: {
      ...exactSet(shell.entrance),
      lightGrayConcreteCount: entranceRecords.length,
      openingCount: entranceRecords.filter(
        ({ state }) => state !== 'minecraft:light_gray_concrete',
      ).length,
    },
  });
}

const haloDrift = halo.filter((cell) => (
  sourceEnvelope.get(cellKey(cell)) !== postEnvelope.get(cellKey(cell))
));
const unchangedNonOperatedTargets = fullUnion.filter((cell) => !operatedKeys.has(cellKey(cell)));
const nonOperatedTargetDrift = unchangedNonOperatedTargets.filter((cell) => (
  sourceEnvelope.get(cellKey(cell)) !== postEnvelope.get(cellKey(cell))
));
const observedChangedCells = uniqueCells([...fullUnion, ...halo]).filter((cell) => (
  sourceEnvelope.get(cellKey(cell)) !== postEnvelope.get(cellKey(cell))
));
const undeclaredChangedCells = observedChangedCells.filter(
  (cell) => !operatedKeys.has(cellKey(cell)),
);
invariant(haloDrift.length === 0 && nonOperatedTargetDrift.length === 0
  && observedChangedCells.length === EXPECTED.operatedCount
  && undeclaredChangedCells.length === 0,
'interaction envelope contains undeclared post-release drift');

const floorSourceRecords = floorContacts.map((cell) => ({
  cell, state: sourceEnvelope.get(cellKey(cell)),
}));
const floorPostRecords = floorContacts.map((cell) => ({
  cell, state: postEnvelope.get(cellKey(cell)),
}));
const floorDrift = floorContacts.filter((cell) => (
  sourceEnvelope.get(cellKey(cell)) !== postEnvelope.get(cellKey(cell))
));
const hazardousFloor = floorPostRecords.filter(({ state }) => (
  isFluid(state) || GRAVITY.has(blockName(state))
));
invariant(floorDrift.length === 0 && hazardousFloor.length === 0,
'floor-contact stability changed or contains a gravity/fluid hazard');
const retainedGravel = manifest.isolation.retainedStableGravityHalo.findings;
const retainedGravelViolations = retainedGravel.filter(({ cell, support }) => (
  sourceEnvelope.get(cellKey(cell)) !== 'minecraft:gravel'
  || postEnvelope.get(cellKey(cell)) !== 'minecraft:gravel'
  || sourceEnvelope.get(cellKey(support)) !== 'minecraft:stone'
  || postEnvelope.get(cellKey(support)) !== 'minecraft:stone'
));
invariant(retainedGravel.length === 2 && retainedGravelViolations.length === 0,
'the two retained halo gravel cells or their stone supports drifted');

const touchedChunks = manifest.source.touchedChunks;
const postBlockEntities = [];
const postSavedEntities = [];
for (const chunkPoint of touchedChunks) {
  const chunk = await postReader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (fullKeys.has(cellKey(point)) || halo.some((cell) => cellKey(cell) === cellKey(point))) {
      postBlockEntities.push({ id: entity.id ?? null, point });
    }
  }
  const entityChunk = await postEntityReader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of entityChunk?.Entities ?? []) {
    if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
    const [x, y, z] = entity.Pos.map(Number);
    if (shellRecords.some(({ envelopeBounds }) => (
      x >= envelopeBounds.minX && x < envelopeBounds.maxX + 1
      && y >= envelopeBounds.minY && y < envelopeBounds.maxY + 1
      && z >= envelopeBounds.minZ && z < envelopeBounds.maxZ + 1
    ))) postSavedEntities.push({ id: entity.id ?? null, position: [x, y, z] });
  }
}
invariant(postBlockEntities.length === 0 && postSavedEntities.length === 0,
'post interaction envelope contains a block entity or saved movable entity');

const blockEntityClearance = readJson(path.join(EVIDENCE_DIR, 'block-entity-clearance.json'));
const liveEntityClearance = readJson(path.join(EVIDENCE_DIR, 'live-entity-clearance.json'));
invariant(blockEntityClearance.status === 'PASS'
  && blockEntityClearance.operationCount === EXPECTED.operatedCount
  && blockEntityClearance.blockingBlockEntityCount === 0
  && liveEntityClearance.status === 'PASS' && liveEntityClearance.passed === true
  && liveEntityClearance.blockOrEntityMutation === false,
'block/live entity clearance evidence failed');

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R08N_NORTH_GALLERIA_RETAIL_SHELLS_POST_RELEASE_ACCEPTED',
  release: {
    transactionId: BASENAME,
    releaseNodeId: RELEASE_NODE_ID,
    canonicalOwner: OWNER,
    manifestIdentity: manifest.manifestIdentity,
    sourceBoundReleaseIdentitySha256: ledger.sourceBoundReleaseIdentitySha256,
    executionBindingSha256: ledger.executionBindingSha256,
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
  },
  bindings: {
    ledger: { ...ledgerBinding, status: ledger.status },
    manifest: manifestBinding,
    sourceCompleteSave: {
      root: ledger.sourceSnapshot.root,
      completeSaveSha256: ledger.sourceSnapshot.completeSaveSha256,
      regionSnapshotSha256: sourceIdentity.sha256,
    },
    postCompleteSave: {
      root: POST_ROOT,
      completeSaveSha256: ledger.postSnapshot.completeSaveSha256,
      regionSnapshotSha256: postIdentity.sha256,
    },
    ledgerEvidence: {
      declaredBindingCount: ledger.evidenceBindings.length,
      matchingBindingCount: ledger.evidenceBindings.length - evidenceMismatches.length,
      mismatchCount: evidenceMismatches.length,
    },
  },
  geometry: {
    fullShellUnion: exactSet(fullUnion),
    operatedUnion: exactSet(operatedCells),
    completeBoundaryUnion: exactSet(boundaryUnion),
    connectedInteriorUnion: exactSet(interiorUnion),
    closedTenantFaceUnion: exactSet(entranceUnion),
    interactionHalo: exactSet(halo),
    floorContacts: exactSet(floorContacts),
    shellTopology: {
      shells: connectedComponents(fullUnion),
      boundaries: connectedComponents(boundaryUnion),
      interiors: connectedComponents(interiorUnion),
    },
  },
  postState: {
    operatedTargets: {
      matchingCellCount: operations.length - operationMismatches.length,
      mismatchCellCount: operationMismatches.length,
      stateCensus: stateCensus(operations.map(({ cell }) => ({
        cell, state: postEnvelope.get(cellKey(cell)),
      }))),
    },
    fullTargets: {
      matchingCellCount: postTargetRecords.length - targetMismatches.length,
      mismatchCellCount: targetMismatches.length,
      stateCensus: stateCensus(postTargetRecords),
    },
    shells: shellPostState,
    tenantBoundary: {
      completeBoundaryLightGrayConcreteCount: boundaryUnion.length,
      completeBoundaryOpeningCount: 0,
      closedTenantFaceLightGrayConcreteCount: entranceUnion.length,
      tenantFaceOpeningCount: 0,
      tenantFitOutAuthorized: false,
    },
    floorStability: {
      unchangedContactCount: floorContacts.length - floorDrift.length,
      driftCount: floorDrift.length,
      hazardousContactCount: hazardousFloor.length,
      airContactCount: floorPostRecords.filter(({ state }) => isAir(state)).length,
      nonAirContactCount: floorPostRecords.filter(({ state }) => !isAir(state)).length,
      sourceStateCensus: stateCensus(floorSourceRecords),
      postStateCensus: stateCensus(floorPostRecords),
      staticConcreteBoundaryRequiresGravitySupport: false,
    },
    retainedGravityHalo: {
      gravelCount: retainedGravel.length,
      unchangedGravelCount: retainedGravel.length - retainedGravelViolations.length,
      stoneSupportCount: retainedGravel.length,
      faceAdjacentTargetCount: retainedGravel.reduce(
        (sum, finding) => sum + finding.adjacentTargetCount,
        0,
      ),
      violationCount: retainedGravelViolations.length,
    },
    preservedInteraction: {
      haloUnchangedCount: halo.length - haloDrift.length,
      haloDriftCount: haloDrift.length,
      nonOperatedTargetUnchangedCount:
        unchangedNonOperatedTargets.length - nonOperatedTargetDrift.length,
      observedChangedCellCount: observedChangedCells.length,
      declaredChangedCellCount: operatedCells.length,
      undeclaredDriftCount: undeclaredChangedCells.length,
    },
    postBlockEntityIntersectionCount: postBlockEntities.length,
    postSavedEntityIntersectionCount: postSavedEntities.length,
  },
  executionEvidence: {
    stageOrder: {
      expectedStageCount: expectedStages.length,
      actualStageCount: ledger.stages.length,
      exact: true,
      allPass: true,
    },
    packageOrder: {
      forward: forwardOrder,
      rollback: rollbackOrder,
    },
    packages: executionPackages,
    strictForwardExecution: {
      packageCount: executionPackages.length,
      successfulCommandCount: executionPackages.reduce(
        (sum, pkg) => sum + pkg.successfulCommands,
        0,
      ),
      failedCommandCount: 0,
      noopCommandCount: 0,
      passed: true,
    },
    reverseRollbackPoststatePreflight: {
      packageCount: executionPackages.length,
      passedGuardCount: executionPackages.reduce(
        (sum, pkg) => sum + pkg.rollbackGuardCount,
        0,
      ),
      failedGuardCount: 0,
      regionSnapshotSha256: EXPECTED.postRegion,
      passed: true,
    },
    blockEntityClearancePassed: true,
    liveEntityClearancePassed: true,
  },
  summary: {
    shellCount: shellRecords.length,
    operatedTargetCount: operatedCells.length,
    operatedTargetMatchCount: operations.length - operationMismatches.length,
    boundaryCellCount: boundaryUnion.length,
    boundaryOpeningCount: 0,
    interiorAirCellCount: interiorUnion.length,
    closedTenantFaceCellCount: entranceUnion.length,
    tenantFaceOpeningCount: 0,
    floorContactUnchangedCount: floorContacts.length - floorDrift.length,
    retainedStableGravelCount: retainedGravel.length - retainedGravelViolations.length,
    haloUnchangedCount: halo.length - haloDrift.length,
    undeclaredDriftCount: undeclaredChangedCells.length,
    strictExecutionSuccessCount: operations.length,
    rollbackPoststateGuardPassCount: operations.length,
  },
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    serviceMutationsPerformed: false,
    readOnlyAnvilInputs: true,
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, qaPayloadSha256 };
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);

const markdown = `# R08N North-Galleria Retail Shells Post-Release QA\n\n`
  + `Status: **${report.status}**\n\n`
  + `- Ledger: \`${report.bindings.ledger.sha256}\` (${report.bindings.ledger.status})\n`
  + `- Manifest payload: \`${report.release.manifestIdentity}\`\n`
  + `- Completed release: \`${report.release.completedReleaseIdentitySha256}\`\n`
  + `- Post save: \`${report.bindings.postCompleteSave.completeSaveSha256}\`\n`
  + `- Post region: \`${report.bindings.postCompleteSave.regionSnapshotSha256}\`\n`
  + `- Exact operated targets: ${report.summary.operatedTargetMatchCount}/${report.summary.operatedTargetCount}\n`
  + `- Complete boundaries: ${report.summary.boundaryCellCount}/${report.summary.boundaryCellCount}; openings ${report.summary.boundaryOpeningCount}\n`
  + `- Connected interior air: ${report.summary.interiorAirCellCount}/${report.summary.interiorAirCellCount}\n`
  + `- Closed tenant faces: ${report.summary.closedTenantFaceCellCount}/${report.summary.closedTenantFaceCellCount}; openings ${report.summary.tenantFaceOpeningCount}\n`
  + `- Unchanged floor contacts: ${report.summary.floorContactUnchangedCount}/${EXPECTED.floorContactCount}\n`
  + `- Retained stable gravel: ${report.summary.retainedStableGravelCount}/2\n`
  + `- Preserved halo: ${report.summary.haloUnchangedCount}/${EXPECTED.haloCount}\n`
  + `- Undeclared drift: ${report.summary.undeclaredDriftCount}\n`
  + `- Strict execution: ${report.summary.strictExecutionSuccessCount}/${EXPECTED.operatedCount}\n`
  + `- Reverse rollback guards: ${report.summary.rollbackPoststateGuardPassCount}/${EXPECTED.operatedCount}\n`
  + `- QA payload SHA-256: \`${qaPayloadSha256}\`\n\n`
  + 'This seal used immutable Anvil and existing ledger evidence only. It made no live call or world edit.\n';
fs.writeFileSync(absolute(MARKDOWN_PATH), markdown);

console.log(JSON.stringify({
  status: report.status,
  output: relative(OUT_PATH),
  markdown: relative(MARKDOWN_PATH),
  qaPayloadSha256,
  summary: report.summary,
}, null, 2));
