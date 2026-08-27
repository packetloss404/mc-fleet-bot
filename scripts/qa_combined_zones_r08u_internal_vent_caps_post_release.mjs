#!/usr/bin/env node
/** Read-only R08U Empty Eight internal vent-cap post-release QA and commissioning seal. */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader, boundsOf, cellKey, cellsIn, hashCells, sha256, stateToCommandString, uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-21T20:15:00Z');
const EVIDENCE_DIR = value('--evidence-dir', 'data/world-review/combined-zones-r08u-live-20260821T201019Z');
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value('--manifest', 'data/buildops/combined-zones-r08u-empty-eight-internal-vent-caps.release-manifest.json');
const POST_ROOT = value('--post-root', 'data/worldsnap-combined-zones-r08u-post-20260821T201019Z');
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r08u-post-release-qa.json'));
const MARKDOWN_PATH = value('--markdown', path.join(EVIDENCE_DIR, 'r08u-post-release-qa.md'));
const SEAL_PATH = value('--seal-out', path.join(EVIDENCE_DIR, 'r08u-ventilation-passive-cap-commissioning-seal.json'));
const SEAL_MARKDOWN_PATH = value('--seal-markdown', path.join(EVIDENCE_DIR, 'r08u-ventilation-passive-cap-commissioning-seal.md'));

const BASENAME = 'combined-zones-r08u-empty-eight-internal-vent-caps';
const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const DESIGN_PATH = 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json';
const LIFE_SAFETY_PATH = 'docs/masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.json';
const N06_PATH = 'data/world-review/combined-zones-r08q-n06-gravity-blocker-20260821T184800Z.json';
const EXPECTED = Object.freeze({
  ledgerFile: '72293cd10dce462b5565b837fd10f36c883b00ede570e36da9f33dfb1b5b0456',
  manifestFile: '4dbd4f859d8715b91c30aea4b91acf001185a898c16126317279c094b9e00bd1',
  manifestIdentity: '066880c728aa2211667833086a58647f27fdc86cb991e5cffce760e62a178863',
  sourceSave: 'c63d2af4c4dc51fc34dfcf8be22d39c63ffc0adf1d7f2c4e7c2617650a1e2682',
  postSave: '6a1c3c12b900f3e646b4930c282ff9da81f213b8b5f49dbfd73233536c0b2f59',
  sourceRegion: '8c5367e1f3076ff206751ac5f71598f3a4a813ba1dceb783901153c79717b72a',
  postRegion: 'dd4e62a6f74c5ce8427313a8fd1a470994926fb1270b3e34170ead06f4026217',
  sourceBoundRelease: 'bfa0c6063ca33fae960b6cb966611d4d34038ded44e597e46b6c78839cc981d0',
  executionBinding: '67d89065580399fed6102568eca3ea8695203cf36a685af5bc9411bc482e80c2',
  completedRelease: 'a1e608b0a3a52da11a65f6d87f20f39d292f2ef801bdab3a25fb39f26885ab91',
  targetHash: '14993e347856c00cd95a2de0fb5490141fa93a994ff3466fcc0b59e310a6aaee',
  exteriorHash: 'b350c06a366abd4279a6d33406faed3345e5c08956325e394571cdc7dbede067',
  capUnionHash: '8770d048f0356e1ea6f1957a21f5ba8e8aa83c543138f7970913b0b3c9ede1f0',
  riserHash: '871d5a52bcdfd5da0279e6e5e8a4513267abb21d1ae9125f5197807681259d4d',
  haloHash: '2e3b8849f49054b1cd803cb2a81b0a874052a448c84d7e5892ac183fd3bbb1a1',
  stageCount: 24,
  evidenceCount: 25,
});
const FACE = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R08U post-release QA rejected: ${message}`);
};
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
    const coordinates = fields.slice(1, 7).map(Number);
    invariant(coordinates.slice(0, 3).every((entry, index) => entry === coordinates[index + 3]),
      `${filename} is not point-exact`);
    output.push({ cell: { x: coordinates[0], y: coordinates[1], z: coordinates[2] },
      fromState: fields[7], toState: fields[8] });
  }
  return output;
}

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
const design = readJson(DESIGN_PATH);
const lifeSafety = readJson(LIFE_SAFETY_PATH);
const n06 = readJson(N06_PATH);
const ledgerBinding = fileBinding(LEDGER_PATH);
const manifestBinding = fileBinding(MANIFEST_PATH);
invariant(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE' && ledger.mode === 'EXECUTE'
  && ledger.transactionId === BASENAME && ledger.releaseNodeId === RELEASE_NODE_ID,
'terminal release identity drifted');
const manifestPayload = { ...manifest };
delete manifestPayload.manifestIdentity;
invariant(ledgerBinding.sha256 === EXPECTED.ledgerFile
  && manifestBinding.sha256 === EXPECTED.manifestFile
  && ledger.manifest.sha256 === EXPECTED.manifestFile
  && manifest.manifestIdentity === EXPECTED.manifestIdentity
  && sha256(JSON.stringify(manifestPayload)) === manifest.manifestIdentity,
'ledger/manifest binding drifted');
invariant(ledger.sourceBoundReleaseIdentitySha256 === EXPECTED.sourceBoundRelease
  && ledger.executionBindingSha256 === EXPECTED.executionBinding
  && ledger.completedReleaseIdentitySha256 === EXPECTED.completedRelease,
'completed release identities drifted');
const sourceIdentity = readJson(ledger.sourceSnapshot.identity.path);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
const sourceIntake = readJson(ledger.sourceSnapshot.completeSaveIntake.path);
const postIntake = readJson(ledger.postSnapshot.completeSaveIntake.path);
invariant(ledger.sourceSnapshot.completeSaveSha256 === EXPECTED.sourceSave
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.postSave
  && sourceIdentity.sha256 === EXPECTED.sourceRegion && postIdentity.sha256 === EXPECTED.postRegion
  && sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && absolute(ledger.postSnapshot.root) === absolute(POST_ROOT),
'source/post immutable snapshot binding drifted');
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
'execution stage or package order drifted');

const vent = lifeSafety.d06EmptyEightLifeSafety.ventilationOutletAlternatives.alternatives
  .find(({ id }) => id === manifest.scope.selectedAlternativeId);
invariant(vent && vent.risers.length === 4, 'selected VENT-A design geometry drifted');
const internalCaps = uniqueCells(vent.risers.flatMap(({ internalCompartmentCap }) => cellsIn(internalCompartmentCap.bounds)));
const exteriorCaps = uniqueCells(vent.risers.flatMap(({ exteriorOutletCap }) => cellsIn(exteriorOutletCap.bounds)));
const riserReservations = uniqueCells(vent.risers.flatMap(({ riserReservation }) => cellsIn(riserReservation.bounds)));
const targetKeys = new Set(internalCaps.map(cellKey));
const halo = uniqueCells(internalCaps.flatMap((cell) => FACE.map(([dx, dy, dz]) => ({
  x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
}))).filter((cell) => !targetKeys.has(cellKey(cell))));
invariant(internalCaps.length === 36 && exteriorCaps.length === 36 && riserReservations.length === 900
  && halo.length === 120 && hashCells(internalCaps) === EXPECTED.targetHash
  && hashCells(exteriorCaps) === EXPECTED.exteriorHash
  && hashCells([...internalCaps, ...exteriorCaps]) === EXPECTED.capUnionHash
  && hashCells(riserReservations) === EXPECTED.riserHash && hashCells(halo) === EXPECTED.haloHash,
'frozen vent-cap or interaction geometry drifted');

const operations = [];
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
    }))), `${pkg.key} inverse or ledger binding drifted`);
  operations.push(...forward.map((entry) => ({ ...entry, packageKey: pkg.key })));
  const execution = readJson(path.join(EVIDENCE_DIR, `${pkg.key}.forward-execution.json`));
  const rollbackPreflight = readJson(path.join(EVIDENCE_DIR, `${pkg.key}.rollback-poststate-preflight.json`));
  invariant(execution.status === 'complete' && execution.strictNoop === true
    && execution.operationRole === 'forward' && execution.executedCommandCount === forward.length
    && execution.successfulCommands === forward.length && execution.failedCommands === 0
    && execution.noopCommands === 0 && execution.worldEditLeftoverCount === 0
    && execution.forceLoadAudit.allRequiredChunksLoadedBeforeCommands === true
    && execution.forceLoadAudit.allTemporaryReleased === true
    && rollbackPreflight.status === 'PASS' && rollbackPreflight.passed === rollback.length
    && rollbackPreflight.failed === 0 && rollbackPreflight.regionsSnapshot.sha256 === EXPECTED.postRegion,
  `${pkg.key} strict execution or rollback evidence failed`);
  executionPackages.push({ key: pkg.key, commandCount: forward.length,
    successfulCommands: execution.successfulCommands, rollbackGuardCount: rollbackPreflight.passed });
}
invariant(operations.length === 36 && uniqueCells(operations.map(({ cell }) => cell)).length === 36
  && operations.every(({ cell }) => targetKeys.has(cellKey(cell))),
'operation union is not an exact target bijection');

const sourceReader = new AnvilReader(absolute(path.join(ledger.sourceSnapshot.root, 'region')));
const postReader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(POST_ROOT, 'entities')));
const sourceStates = new Map();
const postStates = new Map();
async function readBoth(cell) {
  const key = cellKey(cell);
  if (!sourceStates.has(key)) sourceStates.set(key,
    stateToCommandString(await sourceReader.blockState(cell.x, cell.y, cell.z)));
  if (!postStates.has(key)) postStates.set(key,
    stateToCommandString(await postReader.blockState(cell.x, cell.y, cell.z)));
}
for (const cell of uniqueCells([...internalCaps, ...exteriorCaps, ...riserReservations, ...halo])) await readBoth(cell);
const transitionMismatch = operations.filter(({ cell, fromState, toState }) => (
  sourceStates.get(cellKey(cell)) !== fromState || postStates.get(cellKey(cell)) !== toState
));
const internalMismatch = internalCaps.filter((cell) => postStates.get(cellKey(cell)) !== 'minecraft:polished_deepslate');
const exteriorMismatch = exteriorCaps.filter((cell) => sourceStates.get(cellKey(cell)) !== 'minecraft:polished_deepslate'
  || postStates.get(cellKey(cell)) !== 'minecraft:polished_deepslate');
const haloDrift = halo.filter((cell) => sourceStates.get(cellKey(cell)) !== postStates.get(cellKey(cell)));
const riserDrift = riserReservations.filter((cell) => sourceStates.get(cellKey(cell)) !== postStates.get(cellKey(cell)));
invariant(transitionMismatch.length === 0 && internalMismatch.length === 0 && exteriorMismatch.length === 0
  && haloDrift.length === 0 && riserDrift.length === 0,
'exact target, exterior cap, halo, or riser-reservation outcome failed');

const targetGravity = manifest.isolation.targetGravityClosure;
const targetGravityViolations = [];
for (const cell of targetGravity.chain) {
  await readBoth(cell);
  const expectedSource = 'minecraft:gravel';
  const expectedPost = cellKey(cell) === cellKey(targetGravity.cell)
    ? 'minecraft:polished_deepslate' : expectedSource;
  if (sourceStates.get(cellKey(cell)) !== expectedSource || postStates.get(cellKey(cell)) !== expectedPost) {
    targetGravityViolations.push(cell);
  }
}
await readBoth(targetGravity.terminalSupport);
if (sourceStates.get(cellKey(targetGravity.terminalSupport)) !== targetGravity.terminalSupportState
  || postStates.get(cellKey(targetGravity.terminalSupport)) !== targetGravity.terminalSupportState) {
  targetGravityViolations.push(targetGravity.terminalSupport);
}
const retainedGravityViolations = [];
for (const finding of manifest.isolation.retainedGravityHalo.findings) {
  for (const cell of finding.chain) {
    await readBoth(cell);
    if (sourceStates.get(cellKey(cell)) !== 'minecraft:gravel'
      || postStates.get(cellKey(cell)) !== 'minecraft:gravel') retainedGravityViolations.push(cell);
  }
  await readBoth(finding.terminalSupport);
  if (sourceStates.get(cellKey(finding.terminalSupport)) !== finding.terminalSupportState
    || postStates.get(cellKey(finding.terminalSupport)) !== finding.terminalSupportState
    || finding.durablySupported !== true) retainedGravityViolations.push(finding.terminalSupport);
}
invariant(targetGravity.dependencyDepth === 3 && targetGravity.durablySupported === true
  && targetGravityViolations.length === 0 && manifest.isolation.retainedGravityHalo.count === 4
  && retainedGravityViolations.length === 0,
'target or retained halo gravity closure drifted');

const r08tCaps = [1670, 1720, 1770, 1820].flatMap((minX) => cellsIn({
  minX, maxX: minX + 2, minY: 49, maxY: 51, minZ: 150, maxZ: 150,
}));
const r08tCapKeys = new Set(r08tCaps.map(cellKey));
const r08tFull = cellsIn({ minX: 1652, maxX: 1847, minY: 48, maxY: 54, minZ: 150, maxZ: 150 });
const r08tDrift = [];
for (const cell of r08tFull) {
  const expected = r08tCapKeys.has(cellKey(cell)) ? 'minecraft:polished_deepslate' : 'minecraft:stone_bricks';
  await readBoth(cell);
  if (sourceStates.get(cellKey(cell)) !== expected || postStates.get(cellKey(cell)) !== expected) r08tDrift.push(cell);
}
const retailRecords = [];
for (const shell of design.d06.concourseAndRetail.retailShells.filter(({ id }) => id !== 'EE-R-N06')) {
  for (const cell of cellsIn(shell.bounds)) {
    const boundary = cell.x === shell.bounds.minX || cell.x === shell.bounds.maxX
      || cell.y === shell.bounds.minY || cell.y === shell.bounds.maxY
      || cell.z === shell.bounds.minZ || cell.z === shell.bounds.maxZ;
    const expected = boundary ? 'minecraft:light_gray_concrete' : 'minecraft:air';
    await readBoth(cell);
    retailRecords.push({ source: sourceStates.get(cellKey(cell)), post: postStates.get(cellKey(cell)), expected });
  }
}
const retailDrift = retailRecords.filter(({ source, post, expected }) => source !== expected || post !== expected);
const n06Drift = [];
for (const finding of n06.targetGravity.findings) {
  await readBoth(finding.cell);
  if (sourceStates.get(cellKey(finding.cell)) !== finding.state
    || postStates.get(cellKey(finding.cell)) !== finding.state) n06Drift.push(finding.cell);
}
invariant(r08tFull.length === 1372 && r08tDrift.length === 0
  && retailRecords.length === 9936 && retailDrift.length === 0
  && n06.targetGravity.findings.length === 4 && n06Drift.length === 0,
'R08T, retail-shell, or N06 preservation failed');

const envelopeKeys = new Set([...internalCaps, ...halo].map(cellKey));
const envelopeBounds = boundsOf([...internalCaps, ...halo]);
const blockEntities = [];
const savedEntities = [];
for (const chunkPoint of manifest.source.touchedChunks) {
  const chunk = await postReader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (envelopeKeys.has(cellKey(point))) blockEntities.push({ id: entity.id ?? null, point });
  }
  const entities = await entityReader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of entities?.Entities ?? []) {
    if (!Array.isArray(entity.Pos)) continue;
    const [x, y, z] = entity.Pos.map(Number);
    if (x >= envelopeBounds.minX && x < envelopeBounds.maxX + 1
      && y >= envelopeBounds.minY && y < envelopeBounds.maxY + 1
      && z >= envelopeBounds.minZ && z < envelopeBounds.maxZ + 1) {
      savedEntities.push({ id: entity.id ?? null, position: [x, y, z] });
    }
  }
}
invariant(blockEntities.length === 0 && savedEntities.length === 0,
'post interaction envelope contains an entity');

const undeclaredDriftCount = haloDrift.length + riserDrift.length + r08tDrift.length
  + retailDrift.length + n06Drift.length;
const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R08U_INTERNAL_VENT_CAPS_POST_RELEASE_ACCEPTED',
  release: { transactionId: BASENAME, releaseNodeId: RELEASE_NODE_ID,
    canonicalOwner: manifest.scope.canonicalOwner,
    selectedAlternativeId: manifest.scope.selectedAlternativeId,
    manifestIdentity: manifest.manifestIdentity,
    sourceBoundReleaseIdentitySha256: ledger.sourceBoundReleaseIdentitySha256,
    executionBindingSha256: ledger.executionBindingSha256,
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256 },
  bindings: { ledger: { ...ledgerBinding, status: ledger.status }, manifest: manifestBinding,
    sourceCompleteSave: { root: ledger.sourceSnapshot.root, completeSaveSha256: EXPECTED.sourceSave,
      regionSnapshotSha256: EXPECTED.sourceRegion },
    postCompleteSave: { root: POST_ROOT, completeSaveSha256: EXPECTED.postSave,
      regionSnapshotSha256: EXPECTED.postRegion },
    ledgerEvidence: { declaredBindingCount: ledger.evidenceBindings.length,
      matchingBindingCount: ledger.evidenceBindings.length - evidenceMismatches.length,
      mismatchCount: evidenceMismatches.length } },
  geometry: { internalCompartmentCaps: exactSet(internalCaps),
    retainedExteriorOutletCaps: exactSet(exteriorCaps),
    completePassiveCapUnion: exactSet([...internalCaps, ...exteriorCaps]),
    retainedUnexcavatedRiserReservations: exactSet(riserReservations),
    faceInteractionHalo: exactSet(halo),
    topology: { internalCapPlaneCount: vent.risers.length, exteriorCapPlaneCount: vent.risers.length,
      internalCellsPerPlane: vent.risers.map(({ internalCompartmentCap }) => internalCompartmentCap.cellCount),
      exteriorCellsPerPlane: vent.risers.map(({ exteriorOutletCap }) => exteriorOutletCap.cellCount) } },
  postState: {
    exactTransitions: { matchingCellCount: operations.length - transitionMismatch.length,
      mismatchCellCount: transitionMismatch.length },
    passiveCaps: { newInternalPolishedDeepslateCount: internalCaps.length - internalMismatch.length,
      retainedExteriorPolishedDeepslateCount: exteriorCaps.length - exteriorMismatch.length,
      completeClosedCapCellCount: internalCaps.length + exteriorCaps.length
        - internalMismatch.length - exteriorMismatch.length,
      closedCapPlaneCount: 8, openedOutletCount: 0 },
    gravity: { targetGravelCellCount: 1, targetDependencyDepth: targetGravity.dependencyDepth,
      targetTerminalSupportState: targetGravity.terminalSupportState,
      targetGravityViolationCount: targetGravityViolations.length,
      retainedHaloGravelCount: manifest.isolation.retainedGravityHalo.count,
      retainedHaloGravityViolationCount: retainedGravityViolations.length,
      exactDurableRollbackReady: true },
    preservation: { haloUnchangedCount: halo.length - haloDrift.length,
      haloDriftCount: haloDrift.length,
      unexcavatedRiserReservationCount: riserReservations.length,
      unchangedRiserReservationCount: riserReservations.length - riserDrift.length,
      riserReservationDriftCount: riserDrift.length,
      r08tBoundaryPreservedCount: r08tFull.length - r08tDrift.length,
      r08tBoundaryDriftCount: r08tDrift.length,
      commissionedRetailShellCount: 23,
      commissionedRetailShellCellCount: retailRecords.length,
      commissionedRetailShellPreservedCount: retailRecords.length - retailDrift.length,
      commissionedRetailShellDriftCount: retailDrift.length,
      n06BlockedCellCount: n06.targetGravity.findings.length,
      n06DriftCount: n06Drift.length,
      undeclaredDriftCount },
    postBlockEntityIntersectionCount: blockEntities.length,
    postSavedEntityIntersectionCount: savedEntities.length,
  },
  commissioningBoundary: { passiveStaticCapDoctrine: true,
    internalCompartmentInterfacesClosed: true, exteriorOutletCapsClosed: true,
    riserExcavationAuthorized: false, riserExcavationPerformed: false,
    exteriorOutletOpeningAuthorized: false, ventilationMechanismAuthorized: false,
    operationalVentilationCommissioned: false,
    northSmokeBoundaryLocalBlockPreserved: true, n06LocalExceptionPreserved: true },
  executionEvidence: { stageOrder: { expectedStageCount: expectedStages.length,
    actualStageCount: ledger.stages.length, exact: true, allPass: true },
    packageOrder: { forward: forwardOrder, rollback: rollbackOrder }, packages: executionPackages,
    strictForwardExecution: { packageCount: 2, successfulCommandCount: 36,
      failedCommandCount: 0, noopCommandCount: 0, passed: true },
    reverseRollbackPoststatePreflight: { packageCount: 2, passedGuardCount: 36,
      failedGuardCount: 0, regionSnapshotSha256: EXPECTED.postRegion, passed: true } },
  summary: { exactTargetCount: 36, exactFinalTargetCount: 36,
    internalPassiveCapCount: 36, retainedExteriorPassiveCapCount: 36,
    commissionedClosedCapPlaneCount: 8, retainedUnexcavatedRiserCellCount: 900,
    preservedHaloCellCount: 120, retainedHaloGravelCount: 4,
    preservedR08TBoundaryCellCount: 1372, preservedRetailShellCount: 23,
    preservedRetailShellCellCount: 9936, preservedN06BlockedCellCount: 4,
    undeclaredDriftCount, strictExecutionCount: 36, rollbackGuardCount: 36 },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false,
    serviceMutationsPerformed: false, readOnlyAnvilInputs: true },
};
const qaPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, qaPayloadSha256 };
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);
const sealWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R08U_EIGHT_PASSIVE_VENT_CAP_PLANES_COMMISSIONED_CLOSED',
  commissioningScope: { canonicalOwner: manifest.scope.canonicalOwner,
    selectedAlternativeId: manifest.scope.selectedAlternativeId,
    internalCompartmentCapPlaneCount: 4, internalCompartmentCapCellCount: 36,
    exteriorOutletCapPlaneCount: 4, exteriorOutletCapCellCount: 36,
    completeClosedCapPlaneCount: 8, completeClosedCapCellCount: 72,
    retainedUnexcavatedRiserCellCount: 900, openedOutletCount: 0,
    passiveCapClosureCommissioned: true, riserExcavationCommissioned: false,
    operationalVentilationCommissioned: false },
  acceptedEvidence: { r08uQa: {
    path: relative(path.join(EVIDENCE_DIR, 'r08u-post-release-qa.json')),
    sha256: sha256(fs.readFileSync(absolute(OUT_PATH))),
    bytes: fs.statSync(absolute(OUT_PATH)).size,
  }, r08uQaPayloadSha256: qaPayloadSha256,
    r08uCompletedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256 },
  acceptance: { exactFinalStates: true, orderedGravityInverse: true,
    eightClosedPassiveCapPlanes: true, exteriorCapsPreserved: true,
    riserReservationsPreserved: true, haloAndGravitySupportPreserved: true,
    r08tBoundaryPreserved: true, commissionedRetailShellsPreserved: true,
    n06ExceptionPreserved: true, zeroUndeclaredDrift: true,
    strictExecutions: true, exactReverseRollbackReady: true },
  safetyBoundary: report.safetyBoundary,
};
const commissioningSealSha256 = sha256(JSON.stringify(sealWithoutIdentity));
const seal = { ...sealWithoutIdentity, commissioningSealSha256 };
fs.writeFileSync(absolute(SEAL_PATH), `${JSON.stringify(seal, null, 2)}\n`);
fs.writeFileSync(absolute(MARKDOWN_PATH), `# R08U Internal Vent Caps Post-Release QA\n\n`
  + `Status: **${report.status}**\n\n- Exact targets: 36/36 polished deepslate\n`
  + `- Passive caps: four internal and four exterior planes, 72/72 closed cells\n`
  + `- Riser reservations: 900/900 unchanged and unexcavated\n`
  + `- Face halo: 120/120 unchanged; retained gravel closure 4/4\n`
  + `- Prior preservation: R08T 1,372/1,372; 23 retail shells 9,936/9,936; N06 4/4\n`
  + `- Strict execution and rollback guards: 36/36 each\n`
  + `- QA payload SHA-256: \`${qaPayloadSha256}\`\n\nRead-only evidence; no live mutation.\n`);
fs.writeFileSync(absolute(SEAL_MARKDOWN_PATH), `# R08U Ventilation Passive-Cap Commissioning Seal\n\n`
  + `Status: **${seal.status}**\n\n- Complete passive cap closure: eight planes, 72 cells\n`
  + `- Internal compartment caps: 36 cells; retained exterior outlet caps: 36 cells\n`
  + `- Riser reservation: 900 unchanged cells; outlets opened: 0\n`
  + `- Riser excavation and operational ventilation remain uncommissioned\n`
  + `- Seal SHA-256: \`${commissioningSealSha256}\`\n`);
console.log(JSON.stringify({ status: report.status, qaPayloadSha256,
  commissioningStatus: seal.status, commissioningSealSha256, summary: report.summary }, null, 2));
