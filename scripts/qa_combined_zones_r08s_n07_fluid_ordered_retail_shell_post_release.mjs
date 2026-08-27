#!/usr/bin/env node
/** Read-only R08S N07 post-release QA and 23-shell commissioning seal. */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader, boundsOf, cellKey, cellsIn, hashCells, rawCoordinateHash,
  sha256, stateToCommandString, uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-21T19:16:00Z');
const EVIDENCE_DIR = value('--evidence-dir', 'data/world-review/combined-zones-r08s-live-20260821T191247Z');
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value('--manifest', 'data/buildops/combined-zones-r08s-n07-fluid-ordered-capped-retail-shell.release-manifest.json');
const POST_ROOT = value('--post-root', 'data/worldsnap-combined-zones-r08s-post-20260821T191247Z');
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r08s-post-release-qa.json'));
const MARKDOWN_PATH = value('--markdown', path.join(EVIDENCE_DIR, 'r08s-post-release-qa.md'));
const SEAL_PATH = value('--seal-out', path.join(EVIDENCE_DIR, 'r08n-r08s-capped-retail-shells-commissioning-supplement.json'));
const SEAL_MARKDOWN_PATH = value('--seal-markdown', path.join(EVIDENCE_DIR, 'r08n-r08s-capped-retail-shells-commissioning-supplement.md'));

const BASENAME = 'combined-zones-r08s-n07-fluid-ordered-capped-retail-shell';
const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const OWNER = 'Z02-U1-CONCOURSE-MALL';
const DESIGN_PATH = 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json';
const PRIOR_SEAL = 'data/world-review/combined-zones-r08r-live-20260821T185546Z/r08n-r08r-capped-retail-shells-commissioning-supplement.json';
const PRIOR_SHELL_IDS = [
  'EE-R-N01', 'EE-R-N02', 'EE-R-N03', 'EE-R-N04', 'EE-R-N05',
  'EE-R-N08', 'EE-R-N09', 'EE-R-N10', 'EE-R-N11', 'EE-R-N12',
  'EE-R-S01', 'EE-R-S02', 'EE-R-S03', 'EE-R-S04', 'EE-R-S05', 'EE-R-S06',
  'EE-R-S07', 'EE-R-S08', 'EE-R-S09', 'EE-R-S10', 'EE-R-S11', 'EE-R-S12',
];
const EXPECTED = Object.freeze({
  ledgerFile: 'e5661df1e2f1c5354c2de701e11d4a02da335e55662a95d9c0965335474684f9',
  manifestFile: 'a58c2889fcf23cd90aa7803cfc7b2911526f8a73f20466a29eed6f0d82fb91ac',
  manifestIdentity: 'ef3c89c666eb1e5f55b4e48ec0b9f04b6e89bf4464d0df5a995b3a211f7f2b2f',
  sourceSave: 'f3cda07b19d13c144c3f1c73ca5a22124de16809da853602f1b9fce7fd84812d',
  postSave: '71969f7c558ded938c6e8007b475bd3d8d6430642ee0d2c08e0d43a88741fd64',
  sourceRegion: '45c6805d2a24b83e76db2b068d51a650237b39087ad08661e3cc947a9e9971bc',
  postRegion: 'c47b325944bcfdb6327c775cec2c04cc58327295c5e6b1a00e775e1e4f1ad8e2',
  sourceBoundRelease: '423f02a34f9a555808d64a8cf14d2b7b787ec5ae60bc0c3f133c33aee0f889ce',
  executionBinding: 'f6b0b2dd734647b11f0090da6d28d272e54b1eda9a945b3d61408fd2df5548c6',
  completedRelease: '97cdc01930456d6cad36457ece95abb8f87232b3c19e5d4c76dfb7cf846b6bf3',
  fullHash: 'aa66292dd9988fce99237a141593707a9c8f9a9eb319e4a940e283df41ecfd4d',
  haloHash: '51396bc507e3bb20ff8004f476218c0a6fd146d30957afeb9f1336ad33a7ac36',
  stageCount: 31, evidenceCount: 33,
});
const FACE = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R08S post-release QA rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(blockName(state))
  || state.includes('waterlogged=true');
const fileBinding = (filename) => ({ path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))), bytes: fs.statSync(absolute(filename)).size });
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
    invariant(coords.slice(0, 3).every((entry, index) => entry === coords[index + 3]), `${filename} not point-exact`);
    output.push({ cell: { x: coords[0], y: coords[1], z: coords[2] }, fromState: fields[7], toState: fields[8] });
  }
  return output;
}
function components(cells) {
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
      for (const [dx, dy, dz] of FACE) {
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
  'terminal identity drifted');
const manifestPayload = { ...manifest };
delete manifestPayload.manifestIdentity;
invariant(ledgerBinding.sha256 === EXPECTED.ledgerFile && manifestBinding.sha256 === EXPECTED.manifestFile
  && ledger.manifest.sha256 === EXPECTED.manifestFile
  && manifest.manifestIdentity === EXPECTED.manifestIdentity
  && sha256(JSON.stringify(manifestPayload)) === manifest.manifestIdentity,
  'ledger/manifest binding drifted');
invariant(ledger.sourceBoundReleaseIdentitySha256 === EXPECTED.sourceBoundRelease
  && ledger.executionBindingSha256 === EXPECTED.executionBinding
  && ledger.completedReleaseIdentitySha256 === EXPECTED.completedRelease,
  'release identities drifted');
const sourceIdentity = readJson(ledger.sourceSnapshot.identity.path);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
const sourceIntake = readJson(ledger.sourceSnapshot.completeSaveIntake.path);
const postIntake = readJson(ledger.postSnapshot.completeSaveIntake.path);
invariant(ledger.sourceSnapshot.completeSaveSha256 === EXPECTED.sourceSave
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.postSave
  && sourceIdentity.sha256 === EXPECTED.sourceRegion && postIdentity.sha256 === EXPECTED.postRegion
  && sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && absolute(ledger.postSnapshot.root) === absolute(POST_ROOT), 'snapshot binding drifted');
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
  'stage/package order drifted');

const shell = design.d06.concourseAndRetail.retailShells.find(({ id }) => id === 'EE-R-N07');
const full = cellsIn(shell.bounds);
invariant(rawCoordinateHash(full) === shell.cellSetSha256 && hashCells(full) === EXPECTED.fullHash,
  'frozen N07 geometry drifted');
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
invariant(full.length === 432 && boundary.length === 292 && interior.length === 140
  && entrance.length === 12 && halo.length === 492 && hashCells(halo) === EXPECTED.haloHash,
  'derived N07 geometry drifted');

const operations = [];
const operationByPackage = new Map();
const executionPackages = [];
for (const [index, pkg] of manifest.packages.entries()) {
  const forward = parseOperations(pkg.forward);
  const rollback = parseOperations(pkg.rollback);
  const declared = manifest.operations[pkg.key];
  invariant(sha256(operationBody(pkg.forward)) === declared.forwardSha256
    && sha256(operationBody(pkg.rollback)) === declared.rollbackSha256
    && ledger.packages[index].forward.sha256 === fileBinding(pkg.forward).sha256
    && ledger.packages[index].rollback.sha256 === fileBinding(pkg.rollback).sha256
    && JSON.stringify(rollback) === JSON.stringify(forward.slice().reverse().map((entry) => ({
      cell: entry.cell, fromState: entry.toState, toState: entry.fromState,
    }))), `${pkg.key} inverse drifted`);
  operations.push(...forward.map((entry) => ({ ...entry, packageKey: pkg.key })));
  operationByPackage.set(pkg.key, forward);
  const execution = readJson(path.join(EVIDENCE_DIR, `${pkg.key}.forward-execution.json`));
  const rollbackPreflight = readJson(path.join(EVIDENCE_DIR, `${pkg.key}.rollback-poststate-preflight.json`));
  invariant(execution.status === 'complete' && execution.strictNoop === true
    && execution.operationRole === 'forward' && execution.executedCommandCount === forward.length
    && execution.successfulCommands === forward.length && execution.failedCommands === 0
    && execution.noopCommands === 0 && execution.worldEditLeftoverCount === 0
    && rollbackPreflight.status === 'PASS' && rollbackPreflight.passed === rollback.length
    && rollbackPreflight.failed === 0 && rollbackPreflight.regionsSnapshot.sha256 === EXPECTED.postRegion,
    `${pkg.key} execution/rollback failed`);
  executionPackages.push({ key: pkg.key, commandCount: forward.length,
    successfulCommands: execution.successfulCommands, rollbackGuardCount: rollbackPreflight.passed });
}
invariant(operations.length === 401 && uniqueCells(operations.map(({ cell }) => cell)).length === 401,
  'operation union drifted');
const boundaryOps = operationByPackage.get('ee-r-n07-complete-wet-boundary-liner');
const fluidOps = operationByPackage.get('ee-r-n07-contained-interior-fluid-extraction');
const priority = ({ fromState }) => fromState === 'minecraft:air' ? 0 : isFluid(fromState) ? 1 : 2;
invariant(boundaryOps.length === 292 && fluidOps.length === 3
  && boundaryOps.every((entry, index) => index === 0 || priority(boundaryOps[index - 1]) <= priority(entry))
  && boundaryOps.filter(({ fromState }) => isFluid(fromState)).length === 23
  && fluidOps.every(({ fromState, toState }) => fromState === 'minecraft:water[level=0]' && toState === 'minecraft:air'),
  'fluid sequence ordering drifted');

const sourceReader = new AnvilReader(absolute(path.join(ledger.sourceSnapshot.root, 'region')));
const postReader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(POST_ROOT, 'entities')));
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
const sourceTargetFluid = full.filter((cell) => isFluid(source.get(cellKey(cell))));
const sourceBoundaryFluid = sourceTargetFluid.filter((cell) => boundaryKeys.has(cellKey(cell)));
const sourceInteriorFluid = sourceTargetFluid.filter((cell) => !boundaryKeys.has(cellKey(cell)));
const retainedFluidHalo = halo.filter((cell) => isFluid(source.get(cellKey(cell))));
const retainedFluidDrift = retainedFluidHalo.filter((cell) => source.get(cellKey(cell)) !== post.get(cellKey(cell)));
const retainedAdjacent = retainedFluidHalo.flatMap((cell) => FACE.map(([dx, dy, dz]) => ({
  halo: cell, target: { x: cell.x + dx, y: cell.y + dy, z: cell.z + dz },
})).filter(({ target }) => fullKeys.has(cellKey(target))));
invariant(transitionMismatch.length === 0 && targetMismatch.length === 0 && haloDrift.length === 0
  && sourceTargetFluid.length === 26 && sourceBoundaryFluid.length === 23 && sourceInteriorFluid.length === 3
  && retainedFluidHalo.length === 50 && retainedFluidDrift.length === 0 && retainedAdjacent.length === 37
  && retainedAdjacent.every(({ target }) => post.get(cellKey(target)) === 'minecraft:light_gray_concrete'),
  'target or retained fluid outcome failed');
const bubbleTargets = sourceTargetFluid.filter((cell) => blockName(source.get(cellKey(cell))) === 'minecraft:bubble_column');
const bubbleSupportViolations = bubbleTargets.filter((cell) => {
  const below = { x: cell.x, y: cell.y - 1, z: cell.z };
  return source.get(cellKey(below)) !== 'minecraft:bubble_column[drag=true]'
    || post.get(cellKey(below)) !== 'minecraft:bubble_column[drag=true]';
});
invariant(bubbleTargets.length === 2 && bubbleSupportViolations.length === 0,
  'bubble-column retained support drifted');
invariant(components(boundary).componentCount === 1 && components(interior).componentCount === 1
  && entrance.every((cell) => post.get(cellKey(cell)) === 'minecraft:light_gray_concrete'),
  'boundary/interior/tenant cap failed');

const priorRecords = [];
for (const id of PRIOR_SHELL_IDS) {
  const priorShell = design.d06.concourseAndRetail.retailShells.find((entry) => entry.id === id);
  for (const cell of cellsIn(priorShell.bounds)) {
    const expected = (cell.x === priorShell.bounds.minX || cell.x === priorShell.bounds.maxX
      || cell.y === priorShell.bounds.minY || cell.y === priorShell.bounds.maxY
      || cell.z === priorShell.bounds.minZ || cell.z === priorShell.bounds.maxZ)
      ? 'minecraft:light_gray_concrete' : 'minecraft:air';
    priorRecords.push({ source: stateToCommandString(await sourceReader.blockState(cell.x, cell.y, cell.z)),
      post: stateToCommandString(await postReader.blockState(cell.x, cell.y, cell.z)), expected });
  }
}
const priorDrift = priorRecords.filter((entry) => entry.source !== entry.expected || entry.post !== entry.expected);
invariant(priorRecords.length === 9_504 && priorDrift.length === 0, 'prior 22-shell fabric drifted');
const postBlockEntities = [];
const postEntities = [];
const envelopeKeys = new Set([...full, ...halo].map(cellKey));
for (const chunkPoint of manifest.source.touchedChunks) {
  const chunk = await postReader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (envelopeKeys.has(cellKey(point))) postBlockEntities.push(point);
  }
  const entities = await entityReader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of entities?.Entities ?? []) {
    if (!Array.isArray(entity.Pos)) continue;
    const [x, y, z] = entity.Pos.map(Number);
    if (x >= shell.bounds.minX - 1 && x < shell.bounds.maxX + 2
      && y >= shell.bounds.minY - 1 && y < shell.bounds.maxY + 2
      && z >= shell.bounds.minZ - 1 && z < shell.bounds.maxZ + 2) postEntities.push(entity.id ?? null);
  }
}
invariant(postBlockEntities.length === 0 && postEntities.length === 0, 'post entity intersection detected');

const reportWithoutIdentity = {
  schemaVersion: 1, generatedAtUtc: GENERATED_AT,
  status: 'PASS_R08S_N07_FLUID_ORDERED_RETAIL_SHELL_POST_RELEASE_ACCEPTED',
  release: { transactionId: BASENAME, releaseNodeId: RELEASE_NODE_ID, canonicalOwner: OWNER,
    manifestIdentity: manifest.manifestIdentity,
    sourceBoundReleaseIdentitySha256: ledger.sourceBoundReleaseIdentitySha256,
    executionBindingSha256: ledger.executionBindingSha256,
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256 },
  bindings: { ledger: { ...ledgerBinding, status: ledger.status }, manifest: manifestBinding,
    sourceCompleteSave: { root: ledger.sourceSnapshot.root, completeSaveSha256: EXPECTED.sourceSave, regionSnapshotSha256: EXPECTED.sourceRegion },
    postCompleteSave: { root: POST_ROOT, completeSaveSha256: EXPECTED.postSave, regionSnapshotSha256: EXPECTED.postRegion },
    ledgerEvidence: { declaredBindingCount: ledger.evidenceBindings.length,
      matchingBindingCount: ledger.evidenceBindings.length - evidenceMismatches.length, mismatchCount: evidenceMismatches.length } },
  geometry: { fullShell: exactSet(full), completeBoundary: exactSet(boundary), connectedInterior: exactSet(interior),
    closedTenantFace: exactSet(entrance), interactionHalo: exactSet(halo),
    topology: { boundary: components(boundary), interior: components(interior) } },
  postState: {
    exactTransitions: { matchingCellCount: operations.length - transitionMismatch.length, mismatchCellCount: transitionMismatch.length },
    fullTargets: { matchingCellCount: full.length - targetMismatch.length, mismatchCellCount: targetMismatch.length,
      lightGrayConcreteCount: 292, airCount: 140, operatedCount: 401, alreadyTargetAirCount: 31 },
    targetFluidSequence: { sourceFluidCount: 26, sourceWaterCount: 24, sourceBubbleColumnCount: 2,
      boundaryFluidCount: 23, interiorFluidCount: 3, completeBoundaryBeforeInteriorExtraction: true,
      rollbackRestoresInteriorThenBoundaryFluidThenAir: true, bubbleSupportViolationCount: bubbleSupportViolations.length },
    retainedFluidHalo: { fluidCount: 50, unchangedFluidCount: 50 - retainedFluidDrift.length,
      faceAdjacentFluidCellCount: new Set(retainedAdjacent.map(({ halo }) => cellKey(halo))).size,
      faceAdjacencyCount: retainedAdjacent.length, allAdjacentFinalInterfacesStatic: true,
      violationCount: retainedFluidDrift.length },
    preservation: { haloUnchangedCount: halo.length - haloDrift.length, haloDriftCount: haloDrift.length,
      priorShellCount: PRIOR_SHELL_IDS.length, priorShellCellCount: priorRecords.length,
      priorShellPreservedCount: priorRecords.length - priorDrift.length, priorShellDriftCount: priorDrift.length,
      undeclaredDriftCount: haloDrift.length },
    tenantBoundary: { boundaryOpeningCount: 0, tenantFaceOpeningCount: 0, tenantFitOutAuthorized: false },
    postBlockEntityIntersectionCount: postBlockEntities.length, postSavedEntityIntersectionCount: postEntities.length,
  },
  executionEvidence: { stageOrder: { expectedStageCount: expectedStages.length, actualStageCount: ledger.stages.length, exact: true, allPass: true },
    packageOrder: { forward: forwardOrder, rollback: rollbackOrder }, packages: executionPackages,
    strictForwardExecution: { packageCount: 3, successfulCommandCount: 401, failedCommandCount: 0, noopCommandCount: 0, passed: true },
    reverseRollbackPoststatePreflight: { packageCount: 3, passedGuardCount: 401, failedGuardCount: 0,
      regionSnapshotSha256: EXPECTED.postRegion, passed: true } },
  summary: { shellCount: 1, exactTargetCount: 432, operatedTargetCount: 401, boundaryCellCount: 292,
    interiorAirCellCount: 140, tenantFaceCellCount: 12, sourceFluidCount: 26,
    retainedFluidHaloCount: 50, preservedHaloCount: 492, preservedPriorShellCellCount: 9_504,
    undeclaredDriftCount: 0, strictExecutionCount: 401, rollbackGuardCount: 401 },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, serviceMutationsPerformed: false, readOnlyAnvilInputs: true },
};
const qaPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, qaPayloadSha256 };
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);

const priorSeal = readJson(PRIOR_SEAL);
invariant(priorSeal.commissioningScope.totalCappedShellCount === 22
  && priorSeal.commissioningScope.tenantFaceOpeningCount === 0,
  'prior 22-shell seal drifted');
const sealWithoutIdentity = {
  schemaVersion: 1, generatedAtUtc: GENERATED_AT,
  status: 'PASS_R08N_R08S_23_CAPPED_RETAIL_SHELLS_COMMISSIONED_CLOSED',
  commissioningScope: { canonicalOwner: OWNER, priorClosedShellCount: 22,
    fluidOrderedN07ShellCount: 1, totalCappedShellCount: 23,
    completeBoundaryCellCount: priorSeal.commissioningScope.completeBoundaryCellCount + 292,
    connectedInteriorAirCellCount: priorSeal.commissioningScope.connectedInteriorAirCellCount + 140,
    closedTenantFaceCellCount: priorSeal.commissioningScope.closedTenantFaceCellCount + 12,
    tenantFaceOpeningCount: 0, tenantFitOutAuthorized: false, publicOccupancyAuthorized: false },
  acceptedEvidence: { prior22ShellSeal: fileBinding(PRIOR_SEAL), prior22ShellSealSha256: priorSeal.commissioningSealSha256,
    r08sQa: { ...fileBinding(OUT_PATH), path: relative(path.join(EVIDENCE_DIR, 'r08s-post-release-qa.json')) },
    r08sQaPayloadSha256: qaPayloadSha256, r08sCompletedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256 },
  acceptance: { exactFinalStates: true, closedTenantFaces: true, connectedInteriorVoids: true,
    targetFluidOrderedAndContained: true, retainedFluidHaloExact: true,
    prior22ShellFabricPreserved: true, zeroUndeclaredDrift: true,
    strictExecutions: true, exactReverseRollbackReady: true },
  safetyBoundary: report.safetyBoundary,
};
const commissioningSealSha256 = sha256(JSON.stringify(sealWithoutIdentity));
const seal = { ...sealWithoutIdentity, commissioningSealSha256 };
fs.writeFileSync(absolute(SEAL_PATH), `${JSON.stringify(seal, null, 2)}\n`);
fs.writeFileSync(absolute(MARKDOWN_PATH), `# R08S N07 Post-Release QA\n\nStatus: **${report.status}**\n\n`
  + `- Exact final shell: 432/432; operated transitions 401/401\n- Ordered source fluid: 24 water + 2 supported bubble columns\n`
  + `- Retained wet halo: 50/50 exact; full halo 492/492 unchanged\n- Prior 22 shells: 9,504/9,504 cells preserved\n`
  + `- Strict execution and rollback guards: 401/401 each\n- QA payload SHA-256: \`${qaPayloadSha256}\`\n\nRead-only evidence; no live mutation.\n`);
fs.writeFileSync(absolute(SEAL_MARKDOWN_PATH), `# R08N–R08S 23-Shell Commissioning Supplement\n\nStatus: **${seal.status}**\n\n`
  + `- Closed shells: 23\n- Boundary cells: ${seal.commissioningScope.completeBoundaryCellCount}\n`
  + `- Connected interior air: ${seal.commissioningScope.connectedInteriorAirCellCount}\n`
  + `- Closed tenant-face cells: ${seal.commissioningScope.closedTenantFaceCellCount}; openings 0\n`
  + `- Seal SHA-256: \`${commissioningSealSha256}\`\n\nFit-out, opening, and occupancy remain unauthorized.\n`);
console.log(JSON.stringify({ status: report.status, qaPayloadSha256,
  commissioningStatus: seal.status, commissioningSealSha256, summary: report.summary }, null, 2));
