#!/usr/bin/env node
/** Read-only post-release QA and 22-shell commissioning supplement for CZ-R08R. */

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
const GENERATED_AT = value('--generated-at', '2026-08-21T18:58:00Z');
const EVIDENCE_DIR = value('--evidence-dir', 'data/world-review/combined-zones-r08r-live-20260821T185546Z');
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value('--manifest', 'data/buildops/combined-zones-r08r-n09-gravity-ordered-capped-retail-shell.release-manifest.json');
const POST_ROOT = value('--post-root', 'data/worldsnap-combined-zones-r08r-post-20260821T185546Z');
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r08r-post-release-qa.json'));
const MARKDOWN_PATH = value('--markdown', path.join(EVIDENCE_DIR, 'r08r-post-release-qa.md'));
const SEAL_PATH = value('--seal-out', path.join(EVIDENCE_DIR, 'r08n-r08r-capped-retail-shells-commissioning-supplement.json'));
const SEAL_MARKDOWN_PATH = value('--seal-markdown', path.join(EVIDENCE_DIR, 'r08n-r08r-capped-retail-shells-commissioning-supplement.md'));

const BASENAME = 'combined-zones-r08r-n09-gravity-ordered-capped-retail-shell';
const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const OWNER = 'Z02-U1-CONCOURSE-MALL';
const DESIGN_PATH = 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json';
const R08P_QA = 'data/world-review/combined-zones-r08p-live-20260821T184147Z/r08p-post-release-qa.json';
const R08P_SEAL = 'data/world-review/combined-zones-r08p-live-20260821T184147Z/r08n-r08p-capped-retail-shells-commissioning-supplement.json';
const PRIOR_SHELL_IDS = [
  'EE-R-N01', 'EE-R-N02', 'EE-R-N03', 'EE-R-N04', 'EE-R-N05',
  'EE-R-N08', 'EE-R-N10', 'EE-R-N11', 'EE-R-N12',
  'EE-R-S01', 'EE-R-S02', 'EE-R-S03', 'EE-R-S04', 'EE-R-S05', 'EE-R-S06',
  'EE-R-S07', 'EE-R-S08', 'EE-R-S09', 'EE-R-S10', 'EE-R-S11', 'EE-R-S12',
];
const EXPECTED = Object.freeze({
  ledgerFile: '6056832a574c384e2cadd787a161e3620201b90e70de21893a2240ca00e05c62',
  manifestFile: '9f6447749d5fe8b4382112fb457ff5af02a71244230be54a1ff2138ff2aba1b1',
  manifestIdentity: 'e669d6c9517ff10f2f3b9b49cfc57967421c8a5e7f4794c35de8fef577cb953a',
  sourceSave: '4394b3edb29ee9c3a3a7f817827cf9948743a6b1f20d05870e2f5a33fc5bf538',
  postSave: 'd4140700680f5ea6e7e6aea4f421f74788a780a8ca268feed1d4cfee46e06ee7',
  sourceRegion: 'e5ff070699beaa988e5b30e8e6db29f0aa805298378197a939f85aa62a6398cb',
  postRegion: '464303a11a3b091afa7b0504b13b43b49da20f62bf3ef3cc8709321dde837f52',
  sourceBoundRelease: 'e7b994310facc4ee364bfaf25a40ece6bc393b0593dcb01b26299307cc74965d',
  executionBinding: '655f52e14d86887d048270786ca04b588e272c48c7204a0778d71ae46aa9ac32',
  completedRelease: '0506c0f0c9e89a0ecd00ee1a575623b86f8d98488f2394662a32718a53135936',
  stageCount: 31,
  evidenceCount: 33,
  fullHash: '3ba8349decbeaaee95a5105342cb1e663eeae6dcae7f751b37d8a2c2e64b627a',
  haloHash: 'b101775007add0ea79af1cd3a88dbaba60a95a44567c50cc067e15191ac58d1b',
});
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const GRAVITY = new Set(['minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand']);
const FACE_NEIGHBOURS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R08R post-release QA rejected: ${message}`);
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
  && ledger.manifest.sha256 === manifestBinding.sha256 && absolute(ledger.manifest.path) === absolute(MANIFEST_PATH),
  'ledger/manifest binding drifted');
const manifestPayload = { ...manifest };
delete manifestPayload.manifestIdentity;
invariant(manifest.manifestIdentity === EXPECTED.manifestIdentity
  && manifest.manifestIdentity === sha256(JSON.stringify(manifestPayload))
  && manifest.scope?.canonicalOwner === OWNER && manifest.scope?.shellIds?.join(',') === 'EE-R-N09',
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
  && absolute(ledger.postSnapshot.root) === absolute(POST_ROOT), 'immutable snapshot identity drifted');
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

const shell = design.d06.concourseAndRetail.retailShells.find(({ id }) => id === 'EE-R-N09');
const full = cellsIn(shell.bounds);
invariant(rawCoordinateHash(full) === shell.cellSetSha256 && full.length === 432 && hashCells(full) === EXPECTED.fullHash,
  'N09 frozen geometry drifted');
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
  'N09 derived geometry drifted');

const operations = [];
const operationByPackage = new Map();
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
  operationByPackage.set(pkg.key, forward);
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

const stabilizationOps = operationByPackage.get('ee-r-n09-gravity-stabilization');
const extractionOps = operationByPackage.get('ee-r-n09-gravity-extraction');
const stabilizationIndex = new Map(stabilizationOps.map((entry, index) => [cellKey(entry.cell), index]));
const extractionIndex = new Map(extractionOps.map((entry, index) => [cellKey(entry.cell), index]));
const bottomUpViolations = manifest.isolation.targetGravityStabilization.findings.filter((finding) =>
  finding.targetDependency.some((dependency) => stabilizationIndex.has(cellKey(dependency.cell))
    && stabilizationIndex.get(cellKey(dependency.cell)) >= stabilizationIndex.get(cellKey(finding.cell))));
const topDownViolations = manifest.isolation.targetGravityExtraction.findings.filter((finding) => {
  const above = { x: finding.cell.x, y: finding.cell.y + 1, z: finding.cell.z };
  return extractionIndex.has(cellKey(above)) && extractionIndex.get(cellKey(above)) >= extractionIndex.get(cellKey(finding.cell));
});
invariant(stabilizationOps.length === 45 && extractionOps.length === 12
  && bottomUpViolations.length === 0 && topDownViolations.length === 0,
  'ordered gravity package failed');

const sourceReader = new AnvilReader(absolute(path.join(ledger.sourceSnapshot.root, 'region')));
const postReader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
const postEntityReader = new AnvilReader(absolute(path.join(POST_ROOT, 'entities')));
const source = new Map();
const post = new Map();
for (const cell of uniqueCells([...full, ...halo])) {
  source.set(cellKey(cell), stateToCommandString(await sourceReader.blockState(cell.x, cell.y, cell.z)));
  post.set(cellKey(cell), stateToCommandString(await postReader.blockState(cell.x, cell.y, cell.z)));
}
const transitionMismatch = operations.filter(({ cell, fromState, toState }) =>
  source.get(cellKey(cell)) !== fromState || post.get(cellKey(cell)) !== toState);
const targetMismatch = full.filter((cell) => post.get(cellKey(cell)) !==
  (boundaryKeys.has(cellKey(cell)) ? 'minecraft:light_gray_concrete' : 'minecraft:air'));
const haloDrift = halo.filter((cell) => source.get(cellKey(cell)) !== post.get(cellKey(cell)));
invariant(transitionMismatch.length === 0 && targetMismatch.length === 0 && haloDrift.length === 0,
  'exact target or halo state failed');
invariant(connectedComponents(boundary).componentCount === 1
  && connectedComponents(interior).componentCount === 1
  && entrance.every((cell) => post.get(cellKey(cell)) === 'minecraft:light_gray_concrete'),
  'N09 boundary/interior/tenant cap failed');

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
invariant(manifest.isolation.retainedStableGravityHalo.findings.length === 26
  && supportViolations.length === 0, 'retained halo gravel/support graph failed');

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
const priorViolations = priorShellRecords.filter(({ stateSource, statePost, expected }) =>
  stateSource !== expected || statePost !== expected);
invariant(priorShellRecords.length === 9_072 && priorViolations.length === 0,
  'R08N/O/P accepted shell fabric was not preserved');

const postBlockEntities = [];
const postSavedEntities = [];
const haloKeys = new Set(halo.map(cellKey));
for (const chunkPoint of manifest.source.touchedChunks) {
  const chunk = await postReader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (fullKeys.has(cellKey(point)) || haloKeys.has(cellKey(point))) postBlockEntities.push(point);
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
  status: 'PASS_R08R_N09_GRAVITY_ORDERED_RETAIL_SHELL_POST_RELEASE_ACCEPTED',
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
    orderedTargetGravity: { sourceGravityCount: 57, stabilizationCount: stabilizationOps.length,
      extractionCount: extractionOps.length, stabilizationBottomUpViolationCount: bottomUpViolations.length,
      extractionTopDownViolationCount: topDownViolations.length, gravityAboveViolationCount: 0,
      exactRollbackRestoresShellThenExtractionThenStabilization: true },
    retainedGravityHalo: { gravelCount: 26, unchangedGravelCount: 26,
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
    strictForwardExecution: { packageCount: 3, successfulCommandCount: 432, failedCommandCount: 0, noopCommandCount: 0, passed: true },
    reverseRollbackPoststatePreflight: { packageCount: 3, passedGuardCount: 432, failedGuardCount: 0,
      regionSnapshotSha256: EXPECTED.postRegion, passed: true },
  },
  summary: { shellCount: 1, exactTargetCount: 432, boundaryCellCount: 292, interiorAirCellCount: 140,
    tenantFaceCellCount: 12, targetGravityCount: 57, retainedStableGravelCount: 26,
    preservedHaloCount: 492, preservedPriorShellCellCount: 9_072, undeclaredDriftCount: 0,
    strictExecutionCount: 432, rollbackGuardCount: 432 },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, serviceMutationsPerformed: false, readOnlyAnvilInputs: true },
};
const qaPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, qaPayloadSha256 };
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);

const priorQa = readJson(R08P_QA);
const priorSeal = readJson(R08P_SEAL);
invariant(priorQa.summary.undeclaredDriftCount === 0
  && priorSeal.commissioningScope.totalCappedShellCount === 21
  && priorSeal.commissioningScope.tenantFaceOpeningCount === 0,
  'prior 21-shell seal drifted');
const sealWithoutIdentity = {
  schemaVersion: 1, generatedAtUtc: GENERATED_AT,
  status: 'PASS_R08N_R08R_22_CAPPED_RETAIL_SHELLS_COMMISSIONED_CLOSED',
  commissioningScope: { canonicalOwner: OWNER, priorClosedShellCount: 21,
    gravityOrderedN09ShellCount: 1, totalCappedShellCount: 22,
    completeBoundaryCellCount: priorSeal.commissioningScope.completeBoundaryCellCount + 292,
    connectedInteriorAirCellCount: priorSeal.commissioningScope.connectedInteriorAirCellCount + 140,
    closedTenantFaceCellCount: priorSeal.commissioningScope.closedTenantFaceCellCount + 12,
    tenantFaceOpeningCount: 0, tenantFitOutAuthorized: false, publicOccupancyAuthorized: false },
  acceptedEvidence: { prior21ShellSeal: fileBinding(R08P_SEAL), prior21ShellSealSha256: priorSeal.commissioningSealSha256,
    r08rQa: { ...fileBinding(OUT_PATH), path: relative(path.join(EVIDENCE_DIR, 'r08r-post-release-qa.json')) },
    r08rQaPayloadSha256: qaPayloadSha256, r08rCompletedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256 },
  acceptance: { exactFinalStates: true, closedTenantFaces: true, connectedInteriorVoids: true,
    targetGravityOrderedAndStable: true, retainedGravitySupportGraphStable: true,
    r08nR08oR08pFabricPreserved: true, zeroUndeclaredDrift: true,
    strictExecutions: true, exactReverseRollbackReady: true },
  safetyBoundary: report.safetyBoundary,
};
const commissioningSealSha256 = sha256(JSON.stringify(sealWithoutIdentity));
const seal = { ...sealWithoutIdentity, commissioningSealSha256 };
fs.writeFileSync(absolute(SEAL_PATH), `${JSON.stringify(seal, null, 2)}\n`);

const markdown = `# R08R N09 Post-Release QA\n\nStatus: **${report.status}**\n\n`
  + `- Exact targets: 432/432; boundary 292; connected air 140; tenant openings 0\n`
  + `- Ordered gravity: 45 stabilized bottom-up, 12 extracted top-down, ordering violations 0\n`
  + `- Retained halo gravel: 26/26 stable; halo 492/492 unchanged\n`
  + `- R08N/O/P preservation: 9,072/9,072 cells\n`
  + `- Strict execution and rollback guards: 432/432 each\n`
  + `- QA payload SHA-256: \`${qaPayloadSha256}\`\n\nRead-only immutable evidence only; no live call or world edit.\n`;
fs.writeFileSync(absolute(MARKDOWN_PATH), markdown);
const sealMarkdown = `# R08N–R08R 22-Shell Commissioning Supplement\n\nStatus: **${seal.status}**\n\n`
  + `- Closed shells: 22\n- Boundary cells: ${seal.commissioningScope.completeBoundaryCellCount}\n`
  + `- Connected interior air: ${seal.commissioningScope.connectedInteriorAirCellCount}\n`
  + `- Closed tenant-face cells: ${seal.commissioningScope.closedTenantFaceCellCount}; openings 0\n`
  + `- Seal SHA-256: \`${commissioningSealSha256}\`\n\n`
  + 'Commissioning is limited to closed reversible shell fabric. Fit-out, opening, and occupancy remain unauthorized.\n';
fs.writeFileSync(absolute(SEAL_MARKDOWN_PATH), sealMarkdown);
console.log(JSON.stringify({ status: report.status, qaPayloadSha256, commissioningStatus: seal.status,
  commissioningSealSha256, summary: report.summary }, null, 2));
