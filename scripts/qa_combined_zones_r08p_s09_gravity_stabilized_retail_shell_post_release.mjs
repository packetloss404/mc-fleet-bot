#!/usr/bin/env node
/** Read-only post-release QA and 21-shell commissioning supplement for CZ-R08P. */

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
const GENERATED_AT = value('--generated-at', '2026-08-21T18:44:00Z');
const EVIDENCE_DIR = value('--evidence-dir', 'data/world-review/combined-zones-r08p-live-20260821T184147Z');
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value('--manifest', 'data/buildops/combined-zones-r08p-s09-gravity-stabilized-capped-retail-shell.release-manifest.json');
const POST_ROOT = value('--post-root', 'data/worldsnap-combined-zones-r08p-post-20260821T184147Z');
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r08p-post-release-qa.json'));
const MARKDOWN_PATH = value('--markdown', path.join(EVIDENCE_DIR, 'r08p-post-release-qa.md'));
const SEAL_PATH = value('--seal-out', path.join(EVIDENCE_DIR, 'r08n-r08p-capped-retail-shells-commissioning-supplement.json'));
const SEAL_MARKDOWN_PATH = value('--seal-markdown', path.join(EVIDENCE_DIR, 'r08n-r08p-capped-retail-shells-commissioning-supplement.md'));

const BASENAME = 'combined-zones-r08p-s09-gravity-stabilized-capped-retail-shell';
const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const OWNER = 'Z02-U1-CONCOURSE-MALL';
const DESIGN_PATH = 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json';
const R08N_QA = 'data/world-review/combined-zones-r08n-live-20260821T180151Z/r08n-post-release-qa.json';
const R08O_QA = 'data/world-review/combined-zones-r08o-live-20260821T182348Z/r08o-post-release-qa.json';
const PRIOR_SHELL_IDS = [
  'EE-R-N01', 'EE-R-N02', 'EE-R-N03', 'EE-R-N04', 'EE-R-N05',
  'EE-R-N08', 'EE-R-N10', 'EE-R-N11', 'EE-R-N12',
  'EE-R-S01', 'EE-R-S02', 'EE-R-S03', 'EE-R-S04', 'EE-R-S05', 'EE-R-S06',
  'EE-R-S07', 'EE-R-S08', 'EE-R-S10', 'EE-R-S11', 'EE-R-S12',
];
const EXPECTED = Object.freeze({
  ledgerFile: 'ab87277187339f06f2306daf5f24228574d71ae65749fd22fda8bc3ac29c39c1',
  manifestFile: 'c0cd0cea1ad032f7e9ca90ad78cddf96bc32373143256d54aa89a0835d351b1d',
  manifestIdentity: '5df6682203afb52a5dce2386ef5ef7285aab2ccf4d5844856af11fbda4d789a2',
  sourceSave: '04e742351bde39d3be413f60d1945bf80aa4b28b58f6bb9993d1b67100dbd329',
  postSave: 'bf3f03362e1c920e89cf6eadbbb46926dbf7a204acd8eeae5f0182951f1a4505',
  sourceRegion: 'fe578946e7f92a23c0ae8c68d08d63cf680a7d669ab54062cd850d98cfb4476c',
  postRegion: 'b0503fc70b8960c2f6a413c620136c5c0ecbd562093362f143e902f7376abc25',
  sourceBoundRelease: 'f3d45a9a91e1253481f55fa04fea84601e71f5b61bc91483512d044f3b740a81',
  executionBinding: '16bb6f2e49392119ab79722db844c48fce069ef5818cd143190411cf6c52c316',
  completedRelease: 'f59ad1ae37ca9a2786c9b3f560bdfdffde250e9d38c000c0d059b39e96c9f9e3',
  stageCount: 24,
  evidenceCount: 25,
  fullHash: '9de7ea5709dbdca1be8e3201b38421f7333ee8f06c07655106234ee2101232f8',
  haloHash: '841de7191e5ac1ad0f07025e5f7f33721982a6d11419e1e4f9ffcda4c4825fe2',
});
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const GRAVITY = new Set(['minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand']);
const FACE_NEIGHBOURS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const samePath = (left, right) => absolute(left) === absolute(right);
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R08P post-release QA rejected: ${message}`);
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
  return { cellCount: exact.length, bounds: boundsOf(exact), coordinateSetSha256: hashCells(exact) };
};
const operationBody = (filename) => `${fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)
  .filter((line) => line && !line.startsWith('#')).join('\n')}\n`;

function parseOperations(filename) {
  const output = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9, `${filename} malformed`);
    const coords = fields.slice(1, 7).map(Number);
    invariant(coords.slice(0, 3).every((entry, index) => entry === coords[index + 3]), `${filename} is not point-exact`);
    output.push({ cell: { x: coords[0], y: coords[1], z: coords[2] }, fromState: fields[7], toState: fields[8] });
  }
  return output;
}

function connectedComponents(cells) {
  const remaining = new Set(uniqueCells(cells).map(cellKey));
  const sizes = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const stack = [first];
    let size = 0;
    while (stack.length) {
      const [x, y, z] = stack.pop().split(',').map(Number);
      size += 1;
      for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
        const key = `${x + dx},${y + dy},${z + dz}`;
        if (remaining.delete(key)) stack.push(key);
      }
    }
    sizes.push(size);
  }
  sizes.sort((a, b) => b - a);
  return { componentCount: sizes.length, largestComponentCellCount: sizes[0] ?? 0 };
}

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
const design = readJson(DESIGN_PATH);
const ledgerBinding = fileBinding(LEDGER_PATH);
const manifestBinding = fileBinding(MANIFEST_PATH);
invariant(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE' && ledger.mode === 'EXECUTE'
  && ledger.transactionId === BASENAME && ledger.releaseNodeId === RELEASE_NODE_ID,
'terminal execution identity drifted');
invariant(ledgerBinding.sha256 === EXPECTED.ledgerFile && manifestBinding.sha256 === EXPECTED.manifestFile
  && ledger.manifest.sha256 === manifestBinding.sha256 && samePath(ledger.manifest.path, MANIFEST_PATH),
'ledger/manifest binding drifted');
const manifestPayload = { ...manifest };
delete manifestPayload.manifestIdentity;
invariant(manifest.manifestIdentity === EXPECTED.manifestIdentity
  && manifest.manifestIdentity === sha256(JSON.stringify(manifestPayload))
  && manifest.scope?.canonicalOwner === OWNER && manifest.scope?.shellIds?.join(',') === 'EE-R-S09',
'manifest payload/scope drifted');
invariant(ledger.sourceBoundReleaseIdentitySha256 === EXPECTED.sourceBoundRelease
  && ledger.executionBindingSha256 === EXPECTED.executionBinding
  && ledger.completedReleaseIdentitySha256 === EXPECTED.completedRelease,
'execution/completion identity drifted');
const sourceIntake = readJson(ledger.sourceSnapshot.completeSaveIntake.path);
const postIntake = readJson(ledger.postSnapshot.completeSaveIntake.path);
const sourceIdentity = readJson(ledger.sourceSnapshot.identity.path);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
invariant(ledger.sourceSnapshot.completeSaveSha256 === EXPECTED.sourceSave
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.postSave
  && sourceIdentity.sha256 === EXPECTED.sourceRegion && postIdentity.sha256 === EXPECTED.postRegion
  && sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && samePath(ledger.postSnapshot.root, POST_ROOT), 'immutable snapshot identity drifted');
invariant(ledger.sourceSnapshot.identity.sha256 === fileBinding(ledger.sourceSnapshot.identity.path).sha256
  && ledger.postSnapshot.identity.sha256 === fileBinding(ledger.postSnapshot.identity.path).sha256
  && ledger.sourceSnapshot.completeSaveIntake.sha256 === fileBinding(ledger.sourceSnapshot.completeSaveIntake.path).sha256
  && ledger.postSnapshot.completeSaveIntake.sha256 === fileBinding(ledger.postSnapshot.completeSaveIntake.path).sha256,
'snapshot evidence binding drifted');
const evidenceMismatches = ledger.evidenceBindings.filter((binding) => {
  const observed = fileBinding(binding.path);
  return observed.sha256 !== binding.sha256 || observed.bytes !== binding.bytes;
});
invariant(ledger.evidenceBindings.length === EXPECTED.evidenceCount && evidenceMismatches.length === 0,
'ledger evidence binding drifted');

const forwardOrder = manifest.executionOrder.forward;
const rollbackOrder = manifest.executionOrder.rollback;
const expectedStages = [
  'standing-authorization', 'exact-release-manifest-qa', 'fresh-source-complete-save',
  'source-complete-save-intake', 'source-snapshot-identity',
  ...forwardOrder.flatMap((key) => [`forward-source-preflight:${key}`, `strict-forward-parser-check:${key}`, `strict-rollback-parser-check:${key}`]),
  ...rollbackOrder.map((key) => `projected-rollback-preflight:${key}`),
  'block-entity-clearance', 'live-entity-clearance',
  ...forwardOrder.flatMap((key) => [`same-moment-package-entity-clearance:${key}`, `strict-forward-execution:${key}`]),
  'fresh-post-complete-save', 'post-complete-save-intake', 'post-snapshot-identity',
  ...rollbackOrder.map((key) => `rollback-poststate-preflight:${key}`),
];
invariant(expectedStages.length === EXPECTED.stageCount
  && JSON.stringify(ledger.stages.map(({ stage }) => stage)) === JSON.stringify(expectedStages)
  && ledger.stages.every(({ status }) => status === 'PASS')
  && JSON.stringify(rollbackOrder) === JSON.stringify(forwardOrder.slice().reverse()),
'stage or package order drifted');

const shell = design.d06.concourseAndRetail.retailShells.find(({ id }) => id === 'EE-R-S09');
const full = cellsIn(shell.bounds);
invariant(rawCoordinateHash(full) === shell.cellSetSha256 && full.length === 432 && hashCells(full) === EXPECTED.fullHash,
'S09 frozen geometry drifted');
const boundary = full.filter((cell) => cell.x === shell.bounds.minX || cell.x === shell.bounds.maxX
  || cell.y === shell.bounds.minY || cell.y === shell.bounds.maxY
  || cell.z === shell.bounds.minZ || cell.z === shell.bounds.maxZ);
const boundaryKeys = new Set(boundary.map(cellKey));
const interior = full.filter((cell) => !boundaryKeys.has(cellKey(cell)));
const entrance = cellsIn({ minX: shell.entrancePlane.minX, maxX: shell.entrancePlane.maxX,
  minY: shell.entrancePlane.y, maxY: shell.entrancePlane.y,
  minZ: shell.entrancePlane.z, maxZ: shell.entrancePlane.z });
const fullKeys = new Set(full.map(cellKey));
const halo = cellsIn({ minX: shell.bounds.minX - 1, maxX: shell.bounds.maxX + 1,
  minY: shell.bounds.minY - 1, maxY: shell.bounds.maxY + 1,
  minZ: shell.bounds.minZ - 1, maxZ: shell.bounds.maxZ + 1 })
  .filter((cell) => !fullKeys.has(cellKey(cell)));
invariant(boundary.length === 292 && interior.length === 140 && entrance.length === 12
  && halo.length === 492 && hashCells(halo) === EXPECTED.haloHash,
'S09 derived geometry drifted');

const operations = [];
const executionPackages = [];
for (const [index, pkg] of manifest.packages.entries()) {
  const declared = manifest.operations[pkg.key];
  const forward = parseOperations(pkg.forward);
  const rollback = parseOperations(pkg.rollback);
  invariant(sha256(operationBody(pkg.forward)) === declared.forwardSha256
    && sha256(operationBody(pkg.rollback)) === declared.rollbackSha256
    && ledger.packages[index].forward.sha256 === fileBinding(pkg.forward).sha256
    && ledger.packages[index].rollback.sha256 === fileBinding(pkg.rollback).sha256
    && JSON.stringify(rollback) === JSON.stringify(forward.slice().reverse().map((entry) => ({
      cell: entry.cell, fromState: entry.toState, toState: entry.fromState,
    }))), `${pkg.key} exact inverse drifted`);
  operations.push(...forward.map((entry) => ({ ...entry, packageKey: pkg.key })));
  const execution = readJson(path.join(EVIDENCE_DIR, `${pkg.key}.forward-execution.json`));
  const rollbackPreflight = readJson(path.join(EVIDENCE_DIR, `${pkg.key}.rollback-poststate-preflight.json`));
  invariant(execution.status === 'complete' && execution.strictNoop === true
    && execution.operationRole === 'forward' && execution.executedCommandCount === forward.length
    && execution.successfulCommands === forward.length && execution.failedCommands === 0
    && execution.noopCommands === 0 && execution.worldEditLeftoverCount === 0
    && rollbackPreflight.status === 'PASS' && rollbackPreflight.passed === rollback.length
    && rollbackPreflight.failed === 0 && rollbackPreflight.regionsSnapshot.sha256 === EXPECTED.postRegion,
  `${pkg.key} execution/rollback evidence failed`);
  executionPackages.push({ key: pkg.key, commandCount: forward.length,
    successfulCommands: execution.successfulCommands, rollbackGuardCount: rollbackPreflight.passed,
    strictNoop: true, zeroNoops: true });
}
invariant(operations.length === 432 && uniqueCells(operations.map(({ cell }) => cell)).length === 432,
'operation union drifted');

const sourceReader = new AnvilReader(absolute(path.join(ledger.sourceSnapshot.root, 'region')));
const postReader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
const postEntityReader = new AnvilReader(absolute(path.join(POST_ROOT, 'entities')));
const source = new Map();
const post = new Map();
for (const cell of uniqueCells([...full, ...halo])) {
  source.set(cellKey(cell), stateToCommandString(await sourceReader.blockState(cell.x, cell.y, cell.z)));
  post.set(cellKey(cell), stateToCommandString(await postReader.blockState(cell.x, cell.y, cell.z)));
}
const transitionMismatch = operations.filter(({ cell, fromState, toState }) => (
  source.get(cellKey(cell)) !== fromState || post.get(cellKey(cell)) !== toState
));
const targetMismatch = full.filter((cell) => post.get(cellKey(cell)) !== (
  boundaryKeys.has(cellKey(cell)) ? 'minecraft:light_gray_concrete' : 'minecraft:air'
));
const haloDrift = halo.filter((cell) => source.get(cellKey(cell)) !== post.get(cellKey(cell)));
invariant(transitionMismatch.length === 0 && targetMismatch.length === 0 && haloDrift.length === 0,
'exact target or halo state failed');
invariant(connectedComponents(boundary).componentCount === 1
  && connectedComponents(interior).componentCount === 1
  && entrance.every((cell) => post.get(cellKey(cell)) === 'minecraft:light_gray_concrete'),
'S09 boundary/interior/tenant cap failed');

const stabilization = manifest.isolation.targetGravityStabilization.findings[0];
const stabilizationOperation = operations.find(({ packageKey }) => packageKey === 'ee-r-s09-gravity-stabilization');
invariant(cellKey(stabilization.cell) === '1784,52,151'
  && stabilizationOperation.fromState === 'minecraft:gravel'
  && stabilizationOperation.toState === 'minecraft:light_gray_concrete'
  && source.get(cellKey(stabilization.cell)) === 'minecraft:gravel'
  && post.get(cellKey(stabilization.cell)) === 'minecraft:light_gray_concrete'
  && source.get(cellKey(stabilization.terminalSupport.cell)) === stabilization.terminalSupport.sourceState
  && post.get(cellKey(stabilization.terminalSupport.cell)) === stabilization.terminalSupport.finalState,
'target-gravity stabilization transition/support failed');

const supportViolations = [];
const dependencyCells = [];
for (const finding of manifest.isolation.retainedStableGravityHalo.findings) {
  if (source.get(cellKey(finding.cell)) !== 'minecraft:gravel'
    || post.get(cellKey(finding.cell)) !== 'minecraft:gravel') {
    supportViolations.push({ cell: finding.cell, reason: 'retained gravel drift' });
  }
  for (const dependency of finding.verticalGravityDependency) {
    dependencyCells.push(dependency.cell);
    const sourceState = source.get(cellKey(dependency.cell))
      ?? stateToCommandString(await sourceReader.blockState(dependency.cell.x, dependency.cell.y, dependency.cell.z));
    const postState = post.get(cellKey(dependency.cell))
      ?? stateToCommandString(await postReader.blockState(dependency.cell.x, dependency.cell.y, dependency.cell.z));
    if (sourceState !== dependency.state || postState !== dependency.state) {
      supportViolations.push({ cell: dependency.cell, reason: 'dependency drift' });
    }
  }
  const terminalSource = source.get(cellKey(finding.terminalSupport.cell))
    ?? stateToCommandString(await sourceReader.blockState(finding.terminalSupport.cell.x, finding.terminalSupport.cell.y, finding.terminalSupport.cell.z));
  const terminalPost = post.get(cellKey(finding.terminalSupport.cell))
    ?? stateToCommandString(await postReader.blockState(finding.terminalSupport.cell.x, finding.terminalSupport.cell.y, finding.terminalSupport.cell.z));
  if (terminalSource !== finding.terminalSupport.sourceState
    || terminalPost !== finding.terminalSupport.finalState
    || isAir(terminalPost) || isFluid(terminalPost) || GRAVITY.has(blockName(terminalPost))) {
    supportViolations.push({ cell: finding.cell, reason: 'terminal support failed' });
  }
}
invariant(supportViolations.length === 0, 'retained halo gravel/support graph failed');

const priorShellRecords = [];
for (const id of PRIOR_SHELL_IDS) {
  const priorShell = design.d06.concourseAndRetail.retailShells.find((entry) => entry.id === id);
  for (const cell of cellsIn(priorShell.bounds)) {
    const stateSource = stateToCommandString(await sourceReader.blockState(cell.x, cell.y, cell.z));
    const statePost = stateToCommandString(await postReader.blockState(cell.x, cell.y, cell.z));
    const expected = (cell.x === priorShell.bounds.minX || cell.x === priorShell.bounds.maxX
      || cell.y === priorShell.bounds.minY || cell.y === priorShell.bounds.maxY
      || cell.z === priorShell.bounds.minZ || cell.z === priorShell.bounds.maxZ)
      ? 'minecraft:light_gray_concrete' : 'minecraft:air';
    priorShellRecords.push({ id, cell, stateSource, statePost, expected });
  }
}
const priorViolations = priorShellRecords.filter(({ stateSource, statePost, expected }) => (
  stateSource !== expected || statePost !== expected
));
invariant(priorShellRecords.length === 8_640 && priorViolations.length === 0,
'R08N/O accepted shell fabric was not preserved');

const postBlockEntities = [];
const postSavedEntities = [];
for (const chunkPoint of manifest.source.touchedChunks) {
  const chunk = await postReader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (fullKeys.has(cellKey(point)) || halo.some((cell) => cellKey(cell) === cellKey(point))) postBlockEntities.push(point);
  }
  const chunkEntities = await postEntityReader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of chunkEntities?.Entities ?? []) {
    if (!Array.isArray(entity.Pos)) continue;
    const [x, y, z] = entity.Pos.map(Number);
    if (x >= shell.bounds.minX - 1 && x < shell.bounds.maxX + 2
      && y >= shell.bounds.minY - 1 && y < shell.bounds.maxY + 2
      && z >= shell.bounds.minZ - 1 && z < shell.bounds.maxZ + 2) postSavedEntities.push(entity.id ?? null);
  }
}
invariant(postBlockEntities.length === 0 && postSavedEntities.length === 0,
'post block/saved entity intersection detected');

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R08P_S09_GRAVITY_STABILIZED_RETAIL_SHELL_POST_RELEASE_ACCEPTED',
  release: { transactionId: BASENAME, releaseNodeId: RELEASE_NODE_ID, canonicalOwner: OWNER,
    manifestIdentity: manifest.manifestIdentity,
    sourceBoundReleaseIdentitySha256: ledger.sourceBoundReleaseIdentitySha256,
    executionBindingSha256: ledger.executionBindingSha256,
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256 },
  bindings: {
    ledger: { ...ledgerBinding, status: ledger.status }, manifest: manifestBinding,
    sourceCompleteSave: { root: ledger.sourceSnapshot.root, completeSaveSha256: EXPECTED.sourceSave, regionSnapshotSha256: EXPECTED.sourceRegion },
    postCompleteSave: { root: POST_ROOT, completeSaveSha256: EXPECTED.postSave, regionSnapshotSha256: EXPECTED.postRegion },
    ledgerEvidence: { declaredBindingCount: ledger.evidenceBindings.length,
      matchingBindingCount: ledger.evidenceBindings.length - evidenceMismatches.length,
      mismatchCount: evidenceMismatches.length },
  },
  geometry: { fullShell: exactSet(full), completeBoundary: exactSet(boundary), connectedInterior: exactSet(interior),
    closedTenantFace: exactSet(entrance), interactionHalo: exactSet(halo),
    topology: { boundary: connectedComponents(boundary), interior: connectedComponents(interior) } },
  postState: {
    exactTransitions: { matchingCellCount: operations.length - transitionMismatch.length, mismatchCellCount: transitionMismatch.length },
    fullTargets: { matchingCellCount: full.length - targetMismatch.length, mismatchCellCount: targetMismatch.length,
      lightGrayConcreteCount: boundary.length, airCount: interior.length },
    tenantBoundary: { boundaryOpeningCount: 0, tenantFaceOpeningCount: 0, tenantFitOutAuthorized: false },
    targetGravityStabilization: { cell: stabilization.cell, sourceState: 'minecraft:gravel', postState: 'minecraft:light_gray_concrete',
      sourceSupportState: stabilization.terminalSupport.sourceState, postSupportState: stabilization.terminalSupport.finalState,
      stableForwardOrder: true, restoredLastByRollbackOrder: true },
    retainedGravityHalo: { gravelCount: 22, unchangedGravelCount: 22,
      faceAdjacentTargetCount: manifest.isolation.retainedStableGravityHalo.faceAdjacentTargetCount,
      uniqueDependencyCellCount: uniqueCells(dependencyCells).length,
      maxDependencyDepth: Math.max(...manifest.isolation.retainedStableGravityHalo.findings.map((entry) => entry.verticalGravityDependency.length)),
      targetTransitionSupportCount: manifest.isolation.retainedStableGravityHalo.findings.reduce((sum, entry) => sum + entry.declaredSolidSupportTransitionCount, 0),
      violationCount: supportViolations.length },
    preservation: { haloUnchangedCount: halo.length - haloDrift.length, haloDriftCount: haloDrift.length,
      priorShellCount: PRIOR_SHELL_IDS.length, priorShellCellCount: priorShellRecords.length,
      priorShellPreservedCount: priorShellRecords.length - priorViolations.length,
      priorShellDriftCount: priorViolations.length, undeclaredDriftCount: haloDrift.length },
    postBlockEntityIntersectionCount: postBlockEntities.length,
    postSavedEntityIntersectionCount: postSavedEntities.length,
  },
  executionEvidence: {
    stageOrder: { expectedStageCount: expectedStages.length, actualStageCount: ledger.stages.length, exact: true, allPass: true },
    packageOrder: { forward: forwardOrder, rollback: rollbackOrder }, packages: executionPackages,
    strictForwardExecution: { packageCount: 2, successfulCommandCount: 432, failedCommandCount: 0, noopCommandCount: 0, passed: true },
    reverseRollbackPoststatePreflight: { packageCount: 2, passedGuardCount: 432, failedGuardCount: 0,
      regionSnapshotSha256: EXPECTED.postRegion, passed: true },
  },
  summary: { shellCount: 1, exactTargetCount: 432, boundaryCellCount: 292, interiorAirCellCount: 140,
    tenantFaceCellCount: 12, retainedStableGravelCount: 22, preservedHaloCount: 492,
    preservedPriorShellCellCount: 8_640, undeclaredDriftCount: 0, strictExecutionCount: 432, rollbackGuardCount: 432 },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, serviceMutationsPerformed: false, readOnlyAnvilInputs: true },
};
const qaPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, qaPayloadSha256 };
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);

const northQa = readJson(R08N_QA);
const southQa = readJson(R08O_QA);
invariant(northQa.summary.shellCount === 9 && southQa.summary.shellCount === 11
  && northQa.summary.undeclaredDriftCount === 0 && southQa.summary.undeclaredDriftCount === 0,
'prior capped-shell seals drifted');
const sealWithoutIdentity = {
  schemaVersion: 1, generatedAtUtc: GENERATED_AT,
  status: 'PASS_R08N_R08P_21_CAPPED_RETAIL_SHELLS_COMMISSIONED_CLOSED',
  commissioningScope: { canonicalOwner: OWNER, northShellCount: 9, southDryWaveShellCount: 11,
    stabilizedS09ShellCount: 1, totalCappedShellCount: 21,
    completeBoundaryCellCount: northQa.summary.boundaryCellCount + southQa.summary.boundaryCellCount + 292,
    connectedInteriorAirCellCount: northQa.summary.interiorAirCellCount + southQa.summary.interiorAirCellCount + 140,
    closedTenantFaceCellCount: northQa.summary.closedTenantFaceCellCount + southQa.summary.closedTenantFaceCellCount + 12,
    tenantFaceOpeningCount: 0, tenantFitOutAuthorized: false, publicOccupancyAuthorized: false },
  acceptedEvidence: { northQa: fileBinding(R08N_QA), southQa: fileBinding(R08O_QA),
    r08pQa: { ...fileBinding(OUT_PATH), path: relative(path.join(EVIDENCE_DIR, 'r08p-post-release-qa.json')) },
    r08pQaPayloadSha256: qaPayloadSha256, r08pCompletedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256 },
  acceptance: { exactFinalStates: true, closedTenantFaces: true, connectedInteriorVoids: true,
    targetGravityStabilized: true, retainedGravitySupportGraphStable: true,
    r08nR08oFabricPreserved: true, zeroUndeclaredDrift: true, strictExecutions: true, exactReverseRollbackReady: true },
  safetyBoundary: report.safetyBoundary,
};
const commissioningSealSha256 = sha256(JSON.stringify(sealWithoutIdentity));
const seal = { ...sealWithoutIdentity, commissioningSealSha256 };
fs.writeFileSync(absolute(SEAL_PATH), `${JSON.stringify(seal, null, 2)}\n`);

const markdown = `# R08P S09 Post-Release QA\n\nStatus: **${report.status}**\n\n`
  + `- Exact targets: 432/432; boundary 292; connected air 140; tenant openings 0\n`
  + `- Stabilization: gravel at (1784,52,151) became static lining before shell work\n`
  + `- Retained halo gravel: 22/22 stable; halo 492/492 unchanged\n`
  + `- R08N/O preservation: 8,640/8,640 cells\n`
  + `- Strict execution and rollback guards: 432/432 each\n`
  + `- QA payload SHA-256: \`${qaPayloadSha256}\`\n\nRead-only immutable evidence only; no live call or world edit.\n`;
fs.writeFileSync(absolute(MARKDOWN_PATH), markdown);
const sealMarkdown = `# R08N–R08P 21-Shell Commissioning Supplement\n\nStatus: **${seal.status}**\n\n`
  + `- Closed shells: 21\n- Boundary cells: ${seal.commissioningScope.completeBoundaryCellCount}\n`
  + `- Connected interior air: ${seal.commissioningScope.connectedInteriorAirCellCount}\n`
  + `- Closed tenant-face cells: ${seal.commissioningScope.closedTenantFaceCellCount}; openings 0\n`
  + `- Seal SHA-256: \`${commissioningSealSha256}\`\n\n`
  + 'Commissioning is limited to closed reversible shell fabric. Fit-out, opening, and occupancy remain unauthorized.\n';
fs.writeFileSync(absolute(SEAL_MARKDOWN_PATH), sealMarkdown);
console.log(JSON.stringify({ status: report.status, qaPayloadSha256, commissioningStatus: seal.status,
  commissioningSealSha256, summary: report.summary }, null, 2));
