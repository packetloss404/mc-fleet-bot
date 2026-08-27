#!/usr/bin/env node
/**
 * Read-only post-release QA and capped-shell commissioning seal for CZ-R08O.
 * This script reads immutable Anvil data and existing evidence only.
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
const GENERATED_AT = value('--generated-at', '2026-08-21T18:32:00Z');
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r08o-live-20260821T182348Z',
);
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r08-south-galleria-capped-retail-shells.release-manifest.json',
);
const POST_ROOT = value(
  '--post-root',
  'data/worldsnap-combined-zones-r08o-post-20260821T182348Z',
);
const POST_INTAKE_PATH = value(
  '--post-intake',
  path.join(EVIDENCE_DIR, 'post-complete-save-intake.json'),
);
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r08o-post-release-qa.json'));
const MARKDOWN_PATH = value('--markdown', path.join(EVIDENCE_DIR, 'r08o-post-release-qa.md'));
const SEAL_PATH = value(
  '--seal-out',
  path.join(EVIDENCE_DIR, 'r08n-r08o-capped-retail-shells-commissioning-supplement.json'),
);
const SEAL_MARKDOWN_PATH = value(
  '--seal-markdown',
  path.join(EVIDENCE_DIR, 'r08n-r08o-capped-retail-shells-commissioning-supplement.md'),
);

const BASENAME = 'combined-zones-r08-south-galleria-capped-retail-shells';
const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const OWNER = 'Z02-U1-CONCOURSE-MALL';
const DESIGN_PATH = 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json';
const NORTH_QA_PATH = 'data/world-review/combined-zones-r08n-live-20260821T180151Z/r08n-post-release-qa.json';
const CANONICAL_QA_PATH = path.join(EVIDENCE_DIR, 'r08o-post-release-qa.json');
const SHELL_IDS = [
  'EE-R-S01', 'EE-R-S02', 'EE-R-S03', 'EE-R-S04', 'EE-R-S05', 'EE-R-S06',
  'EE-R-S07', 'EE-R-S08', 'EE-R-S10', 'EE-R-S11', 'EE-R-S12',
];
const EXPECTED = Object.freeze({
  manifestIdentity: '4889c4dab5ae52f6bb7e7f7fe7f4364971e07ded8bdb9caddea7ac8835b0bdc2',
  manifestFile: '991fb2730c381bd6d69c4c2f6d00129272ea3c38119699eec5191f2670cf8205',
  ledgerFile: '8ccb0be13023cce2bff1e528fc48036c7e1d85bdd522fdc43c274e2cfb77276b',
  sourceSave: '66e45c39a7656a75926def9e9a2d8cf3612fadd942b16951b28b92cf31c3bc64',
  postSave: 'fbb5a6ffa459e04beff352e3601268a319358c0affa7f4b6c2686fd61cf06cfe',
  sourceRegion: 'd044e6d7c63076c63a0a1b8fb9c01056142b324473e0f04f6660c8ce02dbf4ad',
  postRegion: '44aba5593c3177956b6484338f7d07f170c9f8128c4c142cf8bf4a7bb0771b67',
  sourceBoundRelease: '47e777d6118ed91e931b2ba369264d06b43c68c2931a02cd85de83eaf7b320fa',
  executionBinding: '8574e5dbedd7d8bdd816a0b0103f7b71d74574a15fc5787829c2e11f0751d8dc',
  completedRelease: '873a6e79675265e4190baa9a8728d68120bbcc095eaa3dddad916b474a2e4922',
  stageCount: 87,
  evidenceBindingCount: 97,
  fullCount: 4_752,
  fullHash: '1efc63abed4e4240e30ce2b225fc964e6621beb5d180c2eb8442b056caa5f2e2',
  boundaryCount: 3_212,
  boundaryHash: 'f95f195e084bacfdf10cfafa1d7c2a5fafb6d7bbaa1df9072681fe00745e131d',
  interiorCount: 1_540,
  interiorHash: '01aeb42105c13aa76b3b8272746e8f1278afee372718a7c4d033bd86f966091f',
  entranceCount: 132,
  entranceHash: '55c7c528cf957b602661b8704f10e09c0f127dbada8d4e517f79570e6651e960',
  haloCount: 5_412,
  haloHash: '0a3f59b4a9b492a63ee6c88eff1fa3c9dd14f2a3eb4c92bcef2cfe7a0f376530',
  floorContactCount: 1_188,
  floorContactHash: '216fc1abff71f7dbf057e078fc0ef8893db70a49890720dfada8bc950ae7f4a5',
  retainedGravelCount: 31,
  retainedGravelFaceAdjacentCount: 26,
});
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
]);
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const samePath = (left, right) => absolute(left) === absolute(right);
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R08O post-release QA rejected: ${message}`);
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
  return { componentCount: sizes.length, largestComponentCellCount: sizes[0] ?? 0 };
}

function stateCensus(records) {
  const census = new Map();
  for (const { state } of records) census.set(state, (census.get(state) ?? 0) + 1);
  return Object.fromEntries([...census.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
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
'execution ledger is not the terminal accepted R08O release');
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
  'standing-authorization', 'exact-release-manifest-qa', 'fresh-source-complete-save',
  'source-complete-save-intake', 'source-snapshot-identity',
  ...forwardOrder.flatMap((key) => [
    `forward-source-preflight:${key}`,
    `strict-forward-parser-check:${key}`,
    `strict-rollback-parser-check:${key}`,
  ]),
  ...rollbackOrder.map((key) => `projected-rollback-preflight:${key}`),
  'block-entity-clearance', 'live-entity-clearance',
  ...forwardOrder.flatMap((key) => [
    `same-moment-package-entity-clearance:${key}`,
    `strict-forward-execution:${key}`,
  ]),
  'fresh-post-complete-save', 'post-complete-save-intake', 'post-snapshot-identity',
  ...rollbackOrder.map((key) => `rollback-poststate-preflight:${key}`),
];
invariant(expectedStages.length === EXPECTED.stageCount
  && JSON.stringify(ledger.stages.map(({ stage }) => stage)) === JSON.stringify(expectedStages)
  && ledger.stages.every(({ status }) => status === 'PASS'),
'ledger stage order/status drifted');
invariant(JSON.stringify(rollbackOrder) === JSON.stringify(forwardOrder.slice().reverse()),
'package rollback order is not the exact reverse of forward order');

const shellRecords = SHELL_IDS.map((id) => {
  const shell = design.d06.concourseAndRetail.retailShells.find((entry) => entry.id === id);
  invariant(shell && shell.cellCount === 432
    && rawCoordinateHash(cellsIn(shell.bounds)) === shell.cellSetSha256,
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
    minX: shell.bounds.minX - 1, maxX: shell.bounds.maxX + 1,
    minY: shell.bounds.minY - 1, maxY: shell.bounds.maxY + 1,
    minZ: shell.bounds.minZ - 1, maxZ: shell.bounds.maxZ + 1,
  };
  invariant(boundary.length === 292 && interior.length === 140 && entrance.length === 12,
    `${id} boundary/interior/entrance partition drifted`);
  return { id, shell, full, boundary, interior, entrance, envelopeBounds };
});
const fullUnion = uniqueCells(shellRecords.flatMap(({ full }) => full));
const boundaryUnion = uniqueCells(shellRecords.flatMap(({ boundary }) => boundary));
const boundaryKeys = new Set(boundaryUnion.map(cellKey));
const interiorUnion = uniqueCells(shellRecords.flatMap(({ interior }) => interior));
const entranceUnion = uniqueCells(shellRecords.flatMap(({ entrance }) => entrance));
const fullKeys = new Set(fullUnion.map(cellKey));
const halo = uniqueCells(shellRecords.flatMap(({ envelopeBounds }) => cellsIn(envelopeBounds)))
  .filter((cell) => !fullKeys.has(cellKey(cell)));
const haloKeys = new Set(halo.map(cellKey));
const floorContacts = shellRecords.flatMap(({ shell }) => cellsIn({
  minX: shell.bounds.minX, maxX: shell.bounds.maxX,
  minY: shell.bounds.minY - 1, maxY: shell.bounds.minY - 1,
  minZ: shell.bounds.minZ, maxZ: shell.bounds.maxZ,
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
      cell: entry.cell, fromState: entry.toState, toState: entry.fromState,
    }))),
  `${pkg.key} operation identity/inverse drifted`);
  operations.push(...forward.map((operation) => ({ ...operation, packageKey: pkg.key })));

  const executionPath = path.join(EVIDENCE_DIR, `${pkg.key}.forward-execution.json`);
  const streamPath = `${executionPath}.stream-journal.jsonl`;
  const rollbackPreflightPath = path.join(EVIDENCE_DIR, `${pkg.key}.rollback-poststate-preflight.json`);
  const execution = readJson(executionPath);
  const forwardDryRun = readJson(path.join(EVIDENCE_DIR, `${pkg.key}.forward-strict-dry-run.json`));
  const rollbackDryRun = readJson(path.join(EVIDENCE_DIR, `${pkg.key}.rollback-strict-dry-run.json`));
  const forwardPreflight = readJson(path.join(EVIDENCE_DIR, `${pkg.key}.forward-source-preflight.json`));
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
  });
}
const operatedCells = uniqueCells(operations.map(({ cell }) => cell));
const operatedKeys = new Set(operatedCells.map(cellKey));
invariant(operations.length === EXPECTED.fullCount
  && operatedCells.length === EXPECTED.fullCount
  && hashCells(operatedCells) === EXPECTED.fullHash,
'operated target union drifted');

const sourceReader = new AnvilReader(absolute(path.join(ledger.sourceSnapshot.root, 'region')));
const postReader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
const postEntityReader = new AnvilReader(absolute(path.join(POST_ROOT, 'entities')));
const sourceState = new Map();
const postState = new Map();
for (const cell of uniqueCells([...fullUnion, ...halo])) {
  sourceState.set(cellKey(cell), stateToCommandString(
    await sourceReader.blockState(cell.x, cell.y, cell.z),
  ));
  postState.set(cellKey(cell), stateToCommandString(
    await postReader.blockState(cell.x, cell.y, cell.z),
  ));
}
const readSource = async (cell) => sourceState.get(cellKey(cell)) ?? stateToCommandString(
  await sourceReader.blockState(cell.x, cell.y, cell.z),
);
const readPost = async (cell) => postState.get(cellKey(cell)) ?? stateToCommandString(
  await postReader.blockState(cell.x, cell.y, cell.z),
);

const operationMismatches = [];
for (const operation of operations) {
  const source = sourceState.get(cellKey(operation.cell));
  const post = postState.get(cellKey(operation.cell));
  if (source !== operation.fromState || post !== operation.toState) {
    operationMismatches.push({ ...operation, source, post });
  }
}
invariant(operationMismatches.length === 0,
'an operated target does not match its exact source/post transition');
const targetMismatches = fullUnion.filter((cell) => (
  postState.get(cellKey(cell)) !== (boundaryKeys.has(cellKey(cell))
    ? 'minecraft:light_gray_concrete' : 'minecraft:air')
));
invariant(targetMismatches.length === 0,
'a full shell target does not match its final lining/air state');

const shellPostState = [];
for (const shell of shellRecords) {
  const boundaryOpeningCount = shell.boundary.filter(
    (cell) => postState.get(cellKey(cell)) !== 'minecraft:light_gray_concrete',
  ).length;
  const interiorNonAirCount = shell.interior.filter(
    (cell) => postState.get(cellKey(cell)) !== 'minecraft:air',
  ).length;
  const entranceOpeningCount = shell.entrance.filter(
    (cell) => postState.get(cellKey(cell)) !== 'minecraft:light_gray_concrete',
  ).length;
  const boundaryConnectivity = connectedComponents(shell.boundary);
  const interiorConnectivity = connectedComponents(shell.interior);
  invariant(boundaryOpeningCount === 0 && interiorNonAirCount === 0
    && entranceOpeningCount === 0
    && boundaryConnectivity.componentCount === 1
    && interiorConnectivity.componentCount === 1,
  `${shell.id} is not a complete closed shell around a connected air void`);
  shellPostState.push({
    id: shell.id,
    completeBoundary: {
      ...exactSet(shell.boundary),
      lightGrayConcreteCount: shell.boundary.length,
      openingCount: boundaryOpeningCount,
      connectivity: boundaryConnectivity,
    },
    connectedInteriorVoid: {
      ...exactSet(shell.interior),
      airCount: shell.interior.length,
      nonAirCount: interiorNonAirCount,
      connectivity: interiorConnectivity,
    },
    closedTenantFace: {
      ...exactSet(shell.entrance),
      lightGrayConcreteCount: shell.entrance.length,
      openingCount: entranceOpeningCount,
    },
  });
}

const haloDrift = halo.filter((cell) => sourceState.get(cellKey(cell)) !== postState.get(cellKey(cell)));
const observedChangedCells = uniqueCells([...fullUnion, ...halo]).filter(
  (cell) => sourceState.get(cellKey(cell)) !== postState.get(cellKey(cell)),
);
const undeclaredChangedCells = observedChangedCells.filter((cell) => !operatedKeys.has(cellKey(cell)));
invariant(haloDrift.length === 0
  && observedChangedCells.length === EXPECTED.fullCount
  && undeclaredChangedCells.length === 0,
'interaction envelope contains undeclared post-release drift');

const floorDrift = floorContacts.filter(
  (cell) => sourceState.get(cellKey(cell)) !== postState.get(cellKey(cell)),
);
const floorPostRecords = floorContacts.map((cell) => ({ cell, state: postState.get(cellKey(cell)) }));
const floorFluidCount = floorPostRecords.filter(({ state }) => isFluid(state)).length;
const floorGravity = floorPostRecords.filter(({ state }) => GRAVITY.has(blockName(state)));

const retainedGravel = manifest.isolation.retainedStableGravityHalo.findings;
const closureCells = [];
const closureViolations = [];
for (const finding of retainedGravel) {
  const sourceGravel = await readSource(finding.cell);
  const postGravel = await readPost(finding.cell);
  const dependency = finding.verticalGravityDependency;
  const expectedChain = [finding.cell, ...dependency.map(({ cell }) => cell)];
  const terminal = finding.terminalSupport;
  for (let index = 1; index < expectedChain.length; index += 1) {
    if (expectedChain[index].x !== expectedChain[index - 1].x
      || expectedChain[index].z !== expectedChain[index - 1].z
      || expectedChain[index].y !== expectedChain[index - 1].y - 1) {
      closureViolations.push({ cell: finding.cell, reason: 'non-contiguous gravity chain' });
    }
  }
  for (const entry of dependency) {
    closureCells.push(entry.cell);
    if (await readSource(entry.cell) !== entry.state || await readPost(entry.cell) !== entry.state
      || !GRAVITY.has(blockName(entry.state))) {
      closureViolations.push({ cell: entry.cell, reason: 'gravity dependency drift' });
    }
  }
  const last = expectedChain[expectedChain.length - 1];
  if (terminal.cell.x !== last.x || terminal.cell.z !== last.z || terminal.cell.y !== last.y - 1) {
    closureViolations.push({ cell: finding.cell, reason: 'terminal support is not below chain' });
  }
  const sourceTerminal = await readSource(terminal.cell);
  const postTerminal = await readPost(terminal.cell);
  const terminalIsStable = !isAir(postTerminal) && !isFluid(postTerminal)
    && !GRAVITY.has(blockName(postTerminal));
  if (sourceGravel !== 'minecraft:gravel' || postGravel !== 'minecraft:gravel'
    || sourceTerminal !== terminal.sourceState || postTerminal !== terminal.finalState
    || !terminalIsStable || finding.stableAndUnaffected !== true) {
    closureViolations.push({ cell: finding.cell, reason: 'retained gravel/support drift' });
  }
}
const floorGravityKeys = new Set(floorGravity.map(({ cell }) => cellKey(cell)));
const retainedGravelKeys = new Set(retainedGravel.map(({ cell }) => cellKey(cell)));
const uncoveredFloorGravity = [...floorGravityKeys].filter((key) => !retainedGravelKeys.has(key));
invariant(floorDrift.length === 0 && floorFluidCount === 0
  && floorGravity.length === 11 && uncoveredFloorGravity.length === 0
  && retainedGravel.length === EXPECTED.retainedGravelCount
  && retainedGravel.reduce((sum, entry) => sum + entry.adjacentTargetCount, 0)
    === EXPECTED.retainedGravelFaceAdjacentCount
  && closureViolations.length === 0,
'floor or retained-gravity dependency closure failed');

const postBlockEntities = [];
const postSavedEntities = [];
for (const chunkPoint of manifest.source.touchedChunks) {
  const chunk = await postReader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (fullKeys.has(cellKey(point)) || haloKeys.has(cellKey(point))) {
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
  && blockEntityClearance.operationCount === EXPECTED.fullCount
  && blockEntityClearance.blockingBlockEntityCount === 0
  && liveEntityClearance.status === 'PASS' && liveEntityClearance.passed === true
  && liveEntityClearance.blockOrEntityMutation === false,
'block/live entity clearance evidence failed');

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R08O_SOUTH_GALLERIA_RETAIL_SHELLS_POST_RELEASE_ACCEPTED',
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
    },
    fullTargets: {
      matchingCellCount: fullUnion.length - targetMismatches.length,
      mismatchCellCount: targetMismatches.length,
      stateCensus: stateCensus(fullUnion.map((cell) => ({
        cell, state: postState.get(cellKey(cell)),
      }))),
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
      fluidCount: floorFluidCount,
      gravityCount: floorGravity.length,
      stableGravityCount: floorGravity.length - uncoveredFloorGravity.length,
      airContactCount: floorPostRecords.filter(({ state }) => isAir(state)).length,
      nonAirContactCount: floorPostRecords.filter(({ state }) => !isAir(state)).length,
      stateCensus: stateCensus(floorPostRecords),
      staticConcreteBoundaryRequiresGravitySupport: false,
    },
    retainedGravityHalo: {
      gravelCount: retainedGravel.length,
      unchangedGravelCount: retainedGravel.length,
      faceAdjacentTargetCount: EXPECTED.retainedGravelFaceAdjacentCount,
      uniqueDependencyCellCount: uniqueCells(closureCells).length,
      maxDependencyDepth: Math.max(...retainedGravel.map((entry) => (
        entry.verticalGravityDependency.length
      ))),
      stableClosureCount: retainedGravel.length - closureViolations.length,
      violationCount: closureViolations.length,
    },
    preservedInteraction: {
      haloUnchangedCount: halo.length - haloDrift.length,
      haloDriftCount: haloDrift.length,
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
    packageOrder: { forward: forwardOrder, rollback: rollbackOrder },
    packages: executionPackages,
    strictForwardExecution: {
      packageCount: executionPackages.length,
      successfulCommandCount: executionPackages.reduce(
        (sum, pkg) => sum + pkg.successfulCommands, 0,
      ),
      failedCommandCount: 0,
      noopCommandCount: 0,
      passed: true,
    },
    reverseRollbackPoststatePreflight: {
      packageCount: executionPackages.length,
      passedGuardCount: executionPackages.reduce(
        (sum, pkg) => sum + pkg.rollbackGuardCount, 0,
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
    stableFloorGravityCount: floorGravity.length - uncoveredFloorGravity.length,
    retainedStableGravelCount: retainedGravel.length - closureViolations.length,
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

const northQa = readJson(NORTH_QA_PATH);
invariant(northQa.status === 'PASS_R08N_NORTH_GALLERIA_RETAIL_SHELLS_POST_RELEASE_ACCEPTED'
  && northQa.summary?.shellCount === 9
  && northQa.summary?.undeclaredDriftCount === 0,
'accepted R08N north-shell QA is absent or drifted');
const sealWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R08N_R08O_CAPPED_RETAIL_SHELLS_COMMISSIONED_CLOSED',
  commissioningScope: {
    canonicalOwner: OWNER,
    northShellCount: northQa.summary.shellCount,
    southShellCount: report.summary.shellCount,
    totalCappedShellCount: northQa.summary.shellCount + report.summary.shellCount,
    completeBoundaryCellCount:
      northQa.summary.boundaryCellCount + report.summary.boundaryCellCount,
    connectedInteriorAirCellCount:
      northQa.summary.interiorAirCellCount + report.summary.interiorAirCellCount,
    tenantFaceOpeningCount:
      northQa.summary.tenantFaceOpeningCount + report.summary.tenantFaceOpeningCount,
    tenantFitOutAuthorized: false,
    publicOccupancyAuthorized: false,
  },
  acceptedEvidence: {
    northQa: fileBinding(NORTH_QA_PATH),
    northQaPayloadSha256: northQa.qaPayloadSha256,
    southQa: {
      ...fileBinding(OUT_PATH),
      path: relative(CANONICAL_QA_PATH),
    },
    southQaPayloadSha256: qaPayloadSha256,
    r08oCompletedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
  },
  acceptance: {
    exactFinalStates: true,
    closedTenantFaces: true,
    connectedInteriorVoids: true,
    stableFloorAndGravityClosure: true,
    interactionHalosPreserved: true,
    zeroUndeclaredDrift: true,
    strictExecutions: true,
    exactReverseRollbackReady: true,
  },
  safetyBoundary: report.safetyBoundary,
};
const commissioningSealSha256 = sha256(JSON.stringify(sealWithoutIdentity));
const seal = { ...sealWithoutIdentity, commissioningSealSha256 };
fs.writeFileSync(absolute(SEAL_PATH), `${JSON.stringify(seal, null, 2)}\n`);

const markdown = `# R08O South-Galleria Retail Shells Post-Release QA\n\n`
  + `Status: **${report.status}**\n\n`
  + `- Ledger: \`${report.bindings.ledger.sha256}\` (${report.bindings.ledger.status})\n`
  + `- Completed release: \`${report.release.completedReleaseIdentitySha256}\`\n`
  + `- Post save: \`${report.bindings.postCompleteSave.completeSaveSha256}\`\n`
  + `- Exact operated targets: ${report.summary.operatedTargetMatchCount}/${report.summary.operatedTargetCount}\n`
  + `- Complete boundaries: ${report.summary.boundaryCellCount}; openings ${report.summary.boundaryOpeningCount}\n`
  + `- Connected interior air: ${report.summary.interiorAirCellCount}\n`
  + `- Closed tenant faces: ${report.summary.closedTenantFaceCellCount}; openings ${report.summary.tenantFaceOpeningCount}\n`
  + `- Unchanged floor contacts: ${report.summary.floorContactUnchangedCount}/${EXPECTED.floorContactCount}\n`
  + `- Stable floor gravel: ${report.summary.stableFloorGravityCount}/11\n`
  + `- Retained stable halo gravel: ${report.summary.retainedStableGravelCount}/${EXPECTED.retainedGravelCount}\n`
  + `- Preserved halo: ${report.summary.haloUnchangedCount}/${EXPECTED.haloCount}\n`
  + `- Undeclared drift: ${report.summary.undeclaredDriftCount}\n`
  + `- Strict execution: ${report.summary.strictExecutionSuccessCount}/${EXPECTED.fullCount}\n`
  + `- Reverse rollback guards: ${report.summary.rollbackPoststateGuardPassCount}/${EXPECTED.fullCount}\n`
  + `- QA payload SHA-256: \`${qaPayloadSha256}\`\n\n`
  + 'This seal used immutable Anvil and existing ledger evidence only. It made no live call or world edit.\n';
fs.writeFileSync(absolute(MARKDOWN_PATH), markdown);

const sealMarkdown = `# R08N + R08O Capped Retail Shells Commissioning Supplement\n\n`
  + `Status: **${seal.status}**\n\n`
  + `- Capped shells: ${seal.commissioningScope.totalCappedShellCount} (9 north + 11 south)\n`
  + `- Complete boundary cells: ${seal.commissioningScope.completeBoundaryCellCount}\n`
  + `- Connected interior air cells: ${seal.commissioningScope.connectedInteriorAirCellCount}\n`
  + `- Tenant-face openings: ${seal.commissioningScope.tenantFaceOpeningCount}\n`
  + `- R08O completed release: \`${ledger.completedReleaseIdentitySha256}\`\n`
  + `- Commissioning seal SHA-256: \`${commissioningSealSha256}\`\n\n`
  + 'Commissioning is limited to complete, stable, reversible, physically capped shell fabric. '
  + 'Tenant fit-out, tenant openings, and public occupancy remain unauthorized.\n';
fs.writeFileSync(absolute(SEAL_MARKDOWN_PATH), sealMarkdown);

console.log(JSON.stringify({
  status: report.status,
  output: relative(OUT_PATH),
  markdown: relative(MARKDOWN_PATH),
  qaPayloadSha256,
  commissioningStatus: seal.status,
  commissioningSeal: relative(SEAL_PATH),
  commissioningSealSha256,
  summary: report.summary,
}, null, 2));
